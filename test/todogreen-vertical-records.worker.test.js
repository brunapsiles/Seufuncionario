import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

// A metade da vertical que ainda morava no JSON do espaço de trabalho.
//
// O que estes testes existem para impedir de voltar:
//   • duas pessoas no mesmo espaço sobrescrevendo o trabalho uma da outra;
//   • um registro de um espaço aparecendo no outro;
//   • proposta salva sem a simulação que gerou o preço;
//   • quem só consulta conseguindo alterar premissa comercial.

let n = 0;
const nextIp = () => `198.19.0.${(++n % 240) + 1}`;

async function sha256(valor) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function criarUsuario(id, email) {
  const token = `tok-${id}`;
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'h', 's', ?)`,
  ).bind(id, `Pessoa ${id}`, email, agora).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  ).bind(`ses-${id}`, id, await sha256(token), agora).run();
  return { id, email, token };
}

async function autorizar(usuario, papel = "admin", permissoes = ["*"]) {
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO todogreen_access_emails
       (id, tenant_id, email, role, status, permissions_json, note, created_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, ?, 'active', ?, '', ?, ?, ?)
     ON CONFLICT(tenant_id, email) DO UPDATE SET role = excluded.role,
       permissions_json = excluded.permissions_json, status = 'active'`,
  )
    .bind(crypto.randomUUID(), usuario.email, papel, JSON.stringify(permissoes), usuario.id, agora, agora)
    .run();
}

const pedir = (caminho, { metodo = "GET", token, corpo } = {}) => {
  const headers = { "cf-connecting-ip": nextIp() };
  if (token) headers.authorization = `Bearer ${token}`;
  if (corpo !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(
    new Request(`https://app.test${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
    env,
    { waitUntil() {}, passThroughOnException() {} },
  );
};

let gestora;
let colega;
let auditor;

beforeAll(async () => {
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO tenants (id, slug, name, segment, status, theme_json, created_at, updated_at)
     VALUES ('todogreen', 'todogreen', 'To Do Green', 'logistica', 'active', '{}', ?, ?)`,
  ).bind(agora, agora).run();

  gestora = await criarUsuario("rec-gestora", "gestora@parceiro.com.br");
  colega = await criarUsuario("rec-colega", "colega@parceiro.com.br");
  auditor = await criarUsuario("rec-auditor", "auditor@parceiro.com.br");

  await autorizar(gestora);
  await autorizar(colega);
  // Papel que enxerga tudo e não altera nada.
  await autorizar(auditor, "auditor", ["read"]);
});

describe("oportunidades saem do JSON do espaço", () => {
  it("cria, lista e devolve o que foi gravado", async () => {
    const criada = await pedir("/api/todogreen/records/opportunities", {
      metodo: "POST",
      token: gestora.token,
      corpo: { cliente: "Distribuidora Alfa", valorMensal: 42000, distanciaKm: 120, viagensMes: 40 },
    });
    expect(criada.status).toBe(201);
    const { registro } = await criada.json();
    expect(registro.cliente).toBe("Distribuidora Alfa");
    expect(registro.valorMensal).toBe(42000);
    expect(registro.revision).toBe(1);

    const lista = await pedir("/api/todogreen/records/opportunities", { token: gestora.token });
    const nomes = (await lista.json()).registros.map((r) => r.cliente);
    expect(nomes).toContain("Distribuidora Alfa");
  });

  it("oportunidade sem cliente não é aceita", async () => {
    const r = await pedir("/api/todogreen/records/opportunities", {
      metodo: "POST",
      token: gestora.token,
      corpo: { valorMensal: 1000 },
    });
    expect(r.status).toBe(400);
  });

  it("o espaço de outra pessoa não aparece na lista", async () => {
    await pedir("/api/todogreen/records/opportunities", {
      metodo: "POST",
      token: colega.token,
      corpo: { cliente: "Cliente do colega" },
    });
    const lista = await pedir("/api/todogreen/records/opportunities", { token: gestora.token });
    const nomes = (await lista.json()).registros.map((r) => r.cliente);
    expect(nomes).not.toContain("Cliente do colega");
  });
});

describe("escrita concorrente não apaga o trabalho alheio", () => {
  it("a segunda gravação em cima da mesma versão é recusada", async () => {
    const { registro } = await (
      await pedir("/api/todogreen/records/opportunities", {
        metodo: "POST",
        token: gestora.token,
        corpo: { cliente: "Concorrência" },
      })
    ).json();

    const primeira = await pedir(`/api/todogreen/records/opportunities/${registro.id}`, {
      metodo: "PATCH",
      token: gestora.token,
      corpo: { estagio: "Proposta enviada", revision: registro.revision },
    });
    expect(primeira.status).toBe(200);
    expect((await primeira.json()).registro.revision).toBe(2);

    // Alguém que leu antes tenta salvar por cima. Era isto que o JSON único
    // aceitava em silêncio.
    const segunda = await pedir(`/api/todogreen/records/opportunities/${registro.id}`, {
      metodo: "PATCH",
      token: gestora.token,
      corpo: { estagio: "Fechada perdida", revision: registro.revision },
    });
    expect(segunda.status).toBe(409);
    expect((await segunda.json()).error).toMatch(/mudou enquanto você editava/i);
  });

  it("registro de outro espaço responde 404, não 403", async () => {
    const { registro } = await (
      await pedir("/api/todogreen/records/opportunities", {
        metodo: "POST",
        token: colega.token,
        corpo: { cliente: "Só do colega" },
      })
    ).json();
    // Dizer "existe, mas não é seu" já entrega que existe.
    const r = await pedir(`/api/todogreen/records/opportunities/${registro.id}`, {
      metodo: "PATCH",
      token: gestora.token,
      corpo: { estagio: "Mapeamento", revision: registro.revision },
    });
    expect(r.status).toBe(404);
  });
});

describe("proposta precisa da simulação que gerou o preço", () => {
  it("sem cenário, não salva", async () => {
    const r = await pedir("/api/todogreen/records/proposals", {
      metodo: "POST",
      token: gestora.token,
      corpo: { cliente: "Alfa", titulo: "Proposta sem conta" },
    });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/simulação/i);
  });

  it("com cenário, salva", async () => {
    const r = await pedir("/api/todogreen/records/proposals", {
      metodo: "POST",
      token: gestora.token,
      corpo: { cliente: "Alfa", titulo: "Proposta com conta", cenarioId: "cen-1" },
    });
    expect(r.status).toBe(201);
    expect((await r.json()).registro.cenarioId).toBe("cen-1");
  });
});

describe("lançamentos financeiros", () => {
  it("receita, custo e comissão convivem na mesma coleção", async () => {
    for (const tipo of ["revenue", "cost", "commission"]) {
      const r = await pedir("/api/todogreen/records/financial", {
        metodo: "POST",
        token: gestora.token,
        corpo: { tipo, valor: 1000, descricao: `lançamento ${tipo}`, mesReferencia: "2026-08" },
      });
      expect(r.status).toBe(201);
      expect((await r.json()).registro.tipo).toBe(tipo);
    }
    const lista = await pedir("/api/todogreen/records/financial", { token: gestora.token });
    const tipos = (await lista.json()).registros.map((r) => r.tipo);
    expect(new Set(tipos)).toEqual(new Set(["revenue", "cost", "commission"]));
  });

  it("lançamento sem valor não entra", async () => {
    const r = await pedir("/api/todogreen/records/financial", {
      metodo: "POST",
      token: gestora.token,
      corpo: { tipo: "cost", valor: 0 },
    });
    expect(r.status).toBe(400);
  });
});

describe("papel que só consulta não altera", () => {
  it("o auditor lê a lista", async () => {
    expect((await pedir("/api/todogreen/records/opportunities", { token: auditor.token })).status).toBe(200);
  });

  it("o auditor não cria", async () => {
    const r = await pedir("/api/todogreen/records/opportunities", {
      metodo: "POST",
      token: auditor.token,
      corpo: { cliente: "Não deveria entrar" },
    });
    expect(r.status).toBe(403);
  });
});

describe("arquivar em vez de apagar", () => {
  it("o registro some da lista mas continua no banco", async () => {
    const { registro } = await (
      await pedir("/api/todogreen/records/operations", {
        metodo: "POST",
        token: gestora.token,
        corpo: { clientId: "c-1", viagens: 10, distanciaKm: 500 },
      })
    ).json();

    expect((await pedir(`/api/todogreen/records/operations/${registro.id}`, { metodo: "DELETE", token: gestora.token })).status).toBe(200);

    const lista = await pedir("/api/todogreen/records/operations", { token: gestora.token });
    expect((await lista.json()).registros.map((r) => r.id)).not.toContain(registro.id);

    const linha = await env.DB.prepare("SELECT archived_at FROM todogreen_operations WHERE id = ?")
      .bind(registro.id)
      .first();
    expect(linha.archived_at).toBeTruthy();
  });
});

describe("a vertical inteira numa chamada só", () => {
  it("devolve todas as coleções do próprio espaço", async () => {
    const r = await pedir("/api/todogreen/records", { token: gestora.token });
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(Object.keys(corpo).sort()).toEqual(["financial", "operations", "opportunities", "proposals"]);
    expect(Array.isArray(corpo.opportunities)).toBe(true);
  });

  it("sem sessão, nada", async () => {
    expect((await pedir("/api/todogreen/records")).status).toBe(401);
  });
});
