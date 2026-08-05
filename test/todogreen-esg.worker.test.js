import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

// A cadeia inteira: calcular, gravar com memória, apurar o Green Score, guardar
// a explicação da variação e devolver histórico com benchmark. Um motor que
// ninguém chama é código morto; estes testes provam que ele está ligado.

let n = 0;
const nextIp = () => `192.0.2.${(++n % 240) + 1}`;

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function criarUsuario(id, email) {
  const token = `tok-${id}`;
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'h', 's', ?)`,
  )
    .bind(id, `Pessoa ${id}`, email, agora)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`ses-${id}`, id, await sha256(token), agora)
    .run();
  return { id, email, token };
}

const pedir = (caminho, { method = "GET", token, body } = {}) => {
  const headers = { "cf-connecting-ip": nextIp() };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(
    new Request(`https://app.test${caminho}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
    { waitUntil() {}, passThroughOnException() {} },
  );
};

const operacaoEletrica = (referencia, distanciaKm = 100) => ({
  referencia,
  distanciaKm,
  viagens: 10,
  tipoVeiculo: "Furgão elétrico",
  origens: { distancia: "medido", ocupacao: "documentado" },
});

let admin;
let deFora;
let auditor;

beforeAll(async () => {
  admin = await criarUsuario("esg-adm", "gestor@todogreen.com.br");
  deFora = await criarUsuario("esg-fora", "alguem@outraempresa.com");
  auditor = await criarUsuario("esg-aud", "auditor@todogreen.com.br");

  // A linha do tenant precisa existir antes: a liberação por e-mail tem chave
  // estrangeira para ela.
  await env.DB.prepare(
    `INSERT OR IGNORE INTO tenants (id, slug, name, segment, status, theme_json, created_at, updated_at)
     VALUES ('todogreen', 'todogreen', 'To Do Green', 'logistica', 'active', '{}', ?, ?)`,
  )
    .bind(new Date().toISOString(), new Date().toISOString())
    .run();

  // Entrar pelo domínio corporativo dá acesso de leitura, mas não de gestão.
  // Para calcular e mudar régua, a pessoa precisa estar liberada como admin.
  await env.DB.prepare(
    `INSERT INTO todogreen_access_emails
       (id, tenant_id, email, role, status, permissions_json, note, created_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, 'admin', 'active', '["*"]', '', ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), admin.email, admin.id, new Date().toISOString(), new Date().toISOString())
    .run();

  const agora = new Date().toISOString();
  for (const [id, nome] of [
    ["esg-cli-a", "Cliente ESG A"],
    ["esg-cli-b", "Cliente ESG B"],
  ])
    await env.DB.prepare(
      `INSERT INTO todogreen_clients
         (id, tenant_id, workspace_owner_id, name, status, portal_enabled,
          created_by, updated_by, created_at, updated_at)
       VALUES (?, 'todogreen', 'dono', ?, 'ativo', 1, 'seed', 'seed', ?, ?)`,
    )
      .bind(id, nome, agora, agora)
      .run()
      .catch(() => {});
});

describe("quem pode calcular", () => {
  it("sem sessão, não", async () => {
    expect((await pedir("/api/todogreen/esg/fatores")).status).toBe(401);
  });

  it("sem acesso à vertical, não", async () => {
    const r = await pedir("/api/todogreen/esg/fatores", { token: deFora.token });
    expect(r.status).toBe(403);
  });

  it("quem administra a vertical, sim", async () => {
    const r = await pedir("/api/todogreen/esg/fatores", { token: admin.token });
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.fatores.versao).toBeTruthy();
    expect(d.pesos.versao).toBeTruthy();
  });
});

describe("ler é de todos na vertical, calcular não", () => {
  it("auditor lê os fatores", async () => {
    const r = await pedir("/api/todogreen/esg/fatores", { token: auditor.token });
    expect(r.status).toBe(200);
  });

  it("auditor NÃO calcula — calcular grava registro auditável", async () => {
    const r = await pedir("/api/todogreen/esg/calcular", {
      method: "POST",
      token: auditor.token,
      body: { clienteId: "esg-cli-a", operacoes: [operacaoEletrica("X")] },
    });
    expect(r.status).toBe(403);
  });

  it("auditor NÃO muda a régua", async () => {
    const r = await pedir("/api/todogreen/esg/pesos", {
      method: "POST",
      token: auditor.token,
      body: { versao: "v-auditor", pesos: { reducaoEmissoes: 100 } },
    });
    expect(r.status).toBe(403);
  });
});

describe("calcular grava a memória, não só o número", () => {
  it("cada cálculo vai para o banco com entradas, passos e versão do fator", async () => {
    const r = await pedir("/api/todogreen/esg/calcular", {
      method: "POST",
      token: admin.token,
      body: {
        clienteId: "esg-cli-a",
        operacoes: [operacaoEletrica("R1"), operacaoEletrica("R2", 200)],
        ocupacaoPercent: 80,
        frotaLimpaPercent: 70,
        ocorrencias: 1,
      },
    });
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.calculos).toHaveLength(2);
    expect(d.calculos[0].impacto.co2AvoidedKg).toBeGreaterThan(0);

    const gravado = await env.DB.prepare(
      "SELECT inputs_json, result_json, methodology_version, data_quality FROM environmental_calculations WHERE id = ?",
    )
      .bind(d.calculos[0].id)
      .first();
    const resultado = JSON.parse(gravado.result_json);
    expect(resultado.memoria.passos.length).toBeGreaterThanOrEqual(4);
    expect(resultado.memoria.fatoresUsados.length).toBeGreaterThan(0);
    expect(resultado.memoria.ressalva).toMatch(/não constitui certificação/i);
    expect(gravado.methodology_version).toBeTruthy();
    expect(gravado.data_quality).toBeGreaterThan(0);
  });

  it("operação inválida é reportada sem derrubar o lote", async () => {
    const d = await (
      await pedir("/api/todogreen/esg/calcular", {
        method: "POST",
        token: admin.token,
        body: {
          clienteId: "esg-cli-a",
          operacoes: [operacaoEletrica("BOA"), { referencia: "RUIM", distanciaKm: 0 }],
          ocupacaoPercent: 80,
          frotaLimpaPercent: 70,
        },
      })
    ).json();
    const ruim = d.calculos.find((c) => c.referencia === "RUIM");
    const boa = d.calculos.find((c) => c.referencia === "BOA");
    expect(ruim.erro).toMatch(/distância/i);
    expect(boa.impacto.co2AvoidedKg).toBeGreaterThan(0);
  });

  it("lote inteiro inválido é recusado em vez de gravar score sem base", async () => {
    const r = await pedir("/api/todogreen/esg/calcular", {
      method: "POST",
      token: admin.token,
      body: { clienteId: "esg-cli-a", operacoes: [{ distanciaKm: 0 }] },
    });
    expect(r.status).toBe(400);
  });

  it("sem operação nenhuma, recusa", async () => {
    const r = await pedir("/api/todogreen/esg/calcular", {
      method: "POST",
      token: admin.token,
      body: { clienteId: "esg-cli-a", operacoes: [] },
    });
    expect(r.status).toBe(400);
  });

  it("cliente inexistente é recusado", async () => {
    const r = await pedir("/api/todogreen/esg/calcular", {
      method: "POST",
      token: admin.token,
      body: { clienteId: "nao-existe", operacoes: [operacaoEletrica("X")] },
    });
    expect(r.status).toBe(404);
  });
});

describe("o Green Score fica gravado com a variação explicada", () => {
  it("o primeiro cálculo diz que não há com o que comparar", async () => {
    const d = await (
      await pedir("/api/todogreen/esg/calcular", {
        method: "POST",
        token: admin.token,
        body: {
          clienteId: "esg-cli-b",
          operacoes: [operacaoEletrica("B1")],
          ocupacaoPercent: 90,
          frotaLimpaPercent: 90,
        },
      })
    ).json();
    expect(d.variacao.texto).toMatch(/não há período anterior/i);
    expect(d.greenScore.ressalva).toMatch(/não é certificação/i);
  });

  it("o segundo cálculo explica o que mudou", async () => {
    const d = await (
      await pedir("/api/todogreen/esg/calcular", {
        method: "POST",
        token: admin.token,
        body: {
          clienteId: "esg-cli-b",
          operacoes: [operacaoEletrica("B2")],
          // Ocupação e frota caem: o score tem que cair e dizer por quê.
          ocupacaoPercent: 40,
          frotaLimpaPercent: 30,
          ocorrencias: 0,
        },
      })
    ).json();
    expect(d.variacao.texto).toMatch(/caiu/i);
    expect(d.variacao.fatores.length).toBeGreaterThan(0);

    const linha = await env.DB.prepare(
      `SELECT variation_explanation, previous_score, weights_version
         FROM todogreen_green_scores
        WHERE client_id = 'esg-cli-b' ORDER BY calculated_at DESC LIMIT 1`,
    ).first();
    expect(linha.variation_explanation).toMatch(/caiu/i);
    expect(linha.previous_score).toBeGreaterThan(0);
    expect(linha.weights_version).toBeTruthy();
  });
});

describe("pesos versionados", () => {
  it("régua que não soma 100 é recusada antes de gravar", async () => {
    const r = await pedir("/api/todogreen/esg/pesos", {
      method: "POST",
      token: admin.token,
      body: {
        versao: "v-invalida",
        pesos: { reducaoEmissoes: 10, ocupacao: 10, eficienciaEnergetica: 10, qualidadeDados: 10, ocorrencias: 10 },
      },
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/somar 100/i);
  });

  it("versão nova entra e a anterior é encerrada, não apagada", async () => {
    const r = await pedir("/api/todogreen/esg/pesos", {
      method: "POST",
      token: admin.token,
      body: {
        versao: "v2.teste",
        pesos: { reducaoEmissoes: 50, ocupacao: 20, eficienciaEnergetica: 10, qualidadeDados: 10, ocorrencias: 10 },
        metodologia: "Peso maior para redução.",
        responsavel: "Sustentabilidade",
        vigenciaInicio: "2026-09-01",
      },
    });
    expect(r.status).toBe(201);

    const ativa = await env.DB.prepare(
      "SELECT version FROM todogreen_score_weights WHERE tenant_id = 'todogreen' AND status = 'active'",
    ).all();
    expect(ativa.results.map((l) => l.version)).toContain("v2.teste");
  });

  it("score novo nasce com a régua nova, e o antigo mantém a dele", async () => {
    const antes = await env.DB.prepare(
      `SELECT weights_version FROM todogreen_green_scores
        WHERE client_id = 'esg-cli-b' ORDER BY calculated_at LIMIT 1`,
    ).first();
    const d = await (
      await pedir("/api/todogreen/esg/calcular", {
        method: "POST",
        token: admin.token,
        body: {
          clienteId: "esg-cli-b",
          operacoes: [operacaoEletrica("B3")],
          ocupacaoPercent: 70,
          frotaLimpaPercent: 60,
        },
      })
    ).json();
    expect(d.greenScore.versaoPesos).toBe("v2.teste");
    expect(antes.weights_version).not.toBe("v2.teste");
    // A troca de régua é avisada: parte da variação não veio da operação.
    expect(d.variacao.trocaDeVersao).toBe(true);
    expect(d.variacao.texto).toMatch(/pesos mudaram/i);
  });
});

describe("histórico e benchmark", () => {
  it("devolve a série do cliente com a explicação de cada ponto", async () => {
    const d = await (
      await pedir("/api/todogreen/esg/historico?cliente=esg-cli-b", { token: admin.token })
    ).json();
    expect(d.historico.length).toBeGreaterThanOrEqual(3);
    expect(d.historico[0].explicacaoVariacao).toBeTruthy();
    expect(d.historico[0].componentes.reducaoEmissoes).toBeTruthy();
  });

  it("o benchmark posiciona sem revelar quem está na base", async () => {
    const d = await (
      await pedir("/api/todogreen/esg/historico?cliente=esg-cli-b", { token: admin.token })
    ).json();
    expect(d.benchmark.total).toBeGreaterThan(0);
    expect(JSON.stringify(d.benchmark)).not.toMatch(/esg-cli-a|Cliente ESG A/);
  });

  it("sem cliente, recusa", async () => {
    const r = await pedir("/api/todogreen/esg/historico", { token: admin.token });
    expect(r.status).toBe(400);
  });
});
