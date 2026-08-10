import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

// O relatório interno passa a existir. A pergunta que importa: um vendedor
// consegue gerar o relatório de um cliente que não é da carteira dele? Um
// relatório vazado é a operação inteira de um cliente na mão de quem não
// deveria ver.

let n = 0;
const nextIp = () => `203.0.113.${(++n % 240) + 1}`;

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
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

const pedir = (caminho, token) =>
  worker.fetch(
    new Request(`https://app.test${caminho}`, {
      headers: token
        ? { authorization: `Bearer ${token}`, "cf-connecting-ip": nextIp() }
        : { "cf-connecting-ip": nextIp() },
    }),
    env,
    { waitUntil() {}, passThroughOnException() {} },
  );

const CLI_MEU = "rel-cli-meu";
const CLI_OUTRO = "rel-cli-outro";

let gestor;
let vendedor;

// Acesso à vertical vem de vínculo explícito. Antes estes testes passavam por
// causa da regra de domínio "@todogreen.com.br", que foi removida por ser um
// caminho aberto para qualquer conta criada com um e-mail daquele domínio.
async function autorizar(env, email, criadoPor, role = "auditor", permissoes = "[]") {
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO todogreen_access_emails
       (id, tenant_id, email, role, status, permissions_json, note, created_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, ?, 'active', ?, '', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), email, role, permissoes, criadoPor, agora, agora).run();
}

beforeAll(async () => {
  await pedir("/api/todogreen/portal/sessao");

  gestor = await criarUsuario("rel-u-gestor", "relgestor@todogreen.com.br");
  vendedor = await criarUsuario("rel-u-vend", "relvendedor@todogreen.com.br");

  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO todogreen_access_emails
       (id, tenant_id, email, role, status, permissions_json, note, created_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, 'admin', 'active', '["*"]', '', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), gestor.email, gestor.id, agora, agora).run();

  for (const [id, nome] of [[CLI_MEU, "Cliente da carteira"], [CLI_OUTRO, "Cliente de outro"]]) {
    await env.DB.prepare(
      `INSERT INTO todogreen_clients
         (id, tenant_id, workspace_owner_id, name, document, status, portal_enabled,
          created_by, updated_by, created_at, updated_at)
       VALUES (?, 'todogreen', ?, ?, '00.000.000/0001-00', 'ativo', 1, 'seed', 'seed', ?, ?)`,
    ).bind(id, gestor.id, nome, agora, agora).run();
  }

  await env.DB.prepare(
    `INSERT INTO todogreen_client_assignments
       (id, tenant_id, client_id, seller_email, status, note, assigned_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, ?, 'active', '', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), CLI_MEU, vendedor.email, gestor.id, agora, agora).run();

  await autorizar(env, vendedor.email, gestor.id);

  await env.DB.prepare(
    `INSERT INTO todogreen_client_operations
       (id, tenant_id, client_id, workspace_owner_id, reference, status,
        service_date, origin, destination, fields_json,
        created_by, updated_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, ?, 'OP-REL-1', 'concluida', '2026-03-10',
             'CD', 'Hub', ?, 'seed', 'seed', ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      CLI_MEU,
      gestor.id,
      JSON.stringify({ deliveries: 120 }),
      agora,
      agora,
    )
    .run();
});

const janela = "inicio=2026-03-01&fim=2026-03-31";

describe("lista de clientes para relatório", () => {
  it("sem sessão, não lista nada", async () => {
    expect((await pedir("/api/todogreen/esg/clientes-relatorio")).status).toBe(401);
  });

  it("quem gere a operação enxerga todos os clientes", async () => {
    const d = await (await pedir("/api/todogreen/esg/clientes-relatorio", gestor.token)).json();
    const nomes = d.clientes.map((c) => c.nome);
    expect(nomes).toContain("Cliente da carteira");
    expect(nomes).toContain("Cliente de outro");
    expect(d.carteiraCompleta).toBe(true);
  });

  it("o vendedor enxerga apenas a própria carteira", async () => {
    const d = await (await pedir("/api/todogreen/esg/clientes-relatorio", vendedor.token)).json();
    const nomes = d.clientes.map((c) => c.nome);
    expect(nomes).toContain("Cliente da carteira");
    expect(nomes).not.toContain("Cliente de outro");
    expect(d.carteiraCompleta).toBe(false);
  });
});

describe("material do relatório", () => {
  it("devolve operações do cliente e do período pedido", async () => {
    const r = await pedir(
      `/api/todogreen/esg/relatorio?cliente=${CLI_MEU}&${janela}`,
      gestor.token,
    );
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.cliente.nome).toBe("Cliente da carteira");
    expect(d.operacoes.map((o) => o.referencia)).toContain("OP-REL-1");
    expect(d.periodo).toEqual({ inicio: "2026-03-01", fim: "2026-03-31" });
  });

  it("operação fora do período não entra no relatório", async () => {
    const d = await (
      await pedir(
        `/api/todogreen/esg/relatorio?cliente=${CLI_MEU}&inicio=2026-01-01&fim=2026-01-31`,
        gestor.token,
      )
    ).json();
    expect(d.operacoes).toHaveLength(0);
  });

  it("o vendedor não gera relatório fora da carteira", async () => {
    const r = await pedir(
      `/api/todogreen/esg/relatorio?cliente=${CLI_OUTRO}&${janela}`,
      vendedor.token,
    );
    // 404 e não 403: dizer "existe mas não é sua" já entrega que o cliente existe.
    expect(r.status).toBe(404);
  });

  it("o vendedor gera relatório da própria carteira", async () => {
    const r = await pedir(
      `/api/todogreen/esg/relatorio?cliente=${CLI_MEU}&${janela}`,
      vendedor.token,
    );
    expect(r.status).toBe(200);
  });

  it("cliente inexistente não vira relatório vazio silencioso", async () => {
    const r = await pedir(
      `/api/todogreen/esg/relatorio?cliente=nao-existe&${janela}`,
      gestor.token,
    );
    expect(r.status).toBe(404);
  });

  it("sem cliente informado, recusa em vez de relatar a base inteira", async () => {
    const r = await pedir(`/api/todogreen/esg/relatorio?${janela}`, gestor.token);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/cliente/i);
  });

  it("data fora do formato é recusada", async () => {
    const r = await pedir(
      `/api/todogreen/esg/relatorio?cliente=${CLI_MEU}&inicio=ontem&fim=hoje`,
      gestor.token,
    );
    expect(r.status).toBe(400);
  });

  it("período invertido é recusado com explicação", async () => {
    const r = await pedir(
      `/api/todogreen/esg/relatorio?cliente=${CLI_MEU}&inicio=2026-05-01&fim=2026-04-01`,
      gestor.token,
    );
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/depois do fim/i);
  });

  it("registra quem gerou, para o documento ter responsável", async () => {
    const d = await (
      await pedir(`/api/todogreen/esg/relatorio?cliente=${CLI_MEU}&${janela}`, gestor.token)
    ).json();
    expect(d.geradoPor).toBe(gestor.email);
  });
});
