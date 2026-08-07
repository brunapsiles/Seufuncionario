import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

// A restrição era `UNIQUE(tenant_id, email)`: um e-mail cabia em um cliente só,
// no tenant inteiro. Ficavam de fora grupo empresarial, consultoria, auditor e
// gestor de subsidiárias — que são justamente quem tem várias empresas e um
// e-mail só.

let n = 0;
const nextIp = () => `198.22.0.${(++n % 240) + 1}`;

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

async function criarCliente(nome, dono) {
  const id = crypto.randomUUID();
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO todogreen_clients
       (id, tenant_id, workspace_owner_id, name, legal_name, document, segment, status,
        portal_enabled, created_by, updated_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, ?, ?, '', 'varejo', 'ativo', 1, ?, ?, ?, ?)`,
  ).bind(id, dono, nome, `${nome} LTDA`, dono, dono, agora, agora).run();
  return id;
}

async function vincularAoPortal(email, clienteId, convidadoPor, papel = "cliente_admin") {
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO todogreen_client_users
       (id, tenant_id, client_id, email, role, status, permissions_json, invited_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, ?, ?, 'active', '["*"]', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), clienteId, email, papel, convidadoPor, agora, agora).run();
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

let dona;
let consultor;
let soUmaEmpresa;
let alfa;
let beta;
let alheia;

beforeAll(async () => {
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO tenants (id, slug, name, segment, status, theme_json, created_at, updated_at)
     VALUES ('todogreen', 'todogreen', 'To Do Green', 'logistica', 'active', '{}', ?, ?)`,
  ).bind(agora, agora).run();

  dona = await criarUsuario("mp-dona", "dona@todogreen.exemplo");
  alfa = await criarCliente("Alfa Distribuidora", dona.id);
  beta = await criarCliente("Beta Logistica", dona.id);
  alheia = await criarCliente("Gama Alheia", dona.id);

  // Uma consultoria que atende duas empresas, com o mesmo e-mail.
  consultor = await criarUsuario("mp-consultor", "consultor@consultoria.com.br");
  await vincularAoPortal(consultor.email, alfa, dona.id);
  await vincularAoPortal(consultor.email, beta, dona.id);

  soUmaEmpresa = await criarUsuario("mp-simples", "contato@alfa.com.br");
  await vincularAoPortal(soUmaEmpresa.email, alfa, dona.id);
});

describe("um e-mail em várias empresas", () => {
  it("o mesmo e-mail entra em duas empresas — antes o banco recusava", async () => {
    const linhas = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM todogreen_client_users WHERE email = ?",
    ).bind(consultor.email).first();
    expect(linhas.total).toBe(2);
  });

  it("a sessão lista as empresas alcançadas", async () => {
    const r = await pedir("/api/todogreen/portal/sessao", consultor.token);
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.empresas.map((e) => e.nome).sort()).toEqual(["Alfa Distribuidora", "Beta Logistica"]);
  });

  it("sem escolher, abre numa empresa determinística — a primeira em ordem", async () => {
    const a = await (await pedir("/api/todogreen/portal/sessao", consultor.token)).json();
    const b = await (await pedir("/api/todogreen/portal/sessao", consultor.token)).json();
    expect(a.cliente.id).toBe(b.cliente.id);
    expect(a.cliente.nome).toBe("Alfa Distribuidora");
  });

  it("escolher a empresa troca o escopo da sessão", async () => {
    const r = await pedir(`/api/todogreen/portal/sessao?empresa=${beta}`, consultor.token);
    expect(r.status).toBe(200);
    expect((await r.json()).cliente.id).toBe(beta);
  });

  it("empresa fora do vínculo é recusada, mesmo existindo", async () => {
    const r = await pedir(`/api/todogreen/portal/sessao?empresa=${alheia}`, consultor.token);
    // Trocar o parâmetro não dá acesso: é o mesmo furo do `?owner=` que já foi
    // fechado do lado interno.
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/não tem acesso a esta empresa/i);
  });

  it("empresa inventada responde igual a empresa alheia", async () => {
    const r = await pedir("/api/todogreen/portal/sessao?empresa=nao-existe", consultor.token);
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/não tem acesso a esta empresa/i);
  });

  it("quem tem uma empresa só continua entrando sem escolher nada", async () => {
    const r = await pedir("/api/todogreen/portal/sessao", soUmaEmpresa.token);
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.cliente.id).toBe(alfa);
    expect(corpo.empresas).toHaveLength(1);
  });

  it("quem não tem vínculo nenhum recebe a mensagem própria", async () => {
    const forasteiro = await criarUsuario("mp-fora", "fora@ninguem.com.br");
    const r = await pedir("/api/todogreen/portal/sessao", forasteiro.token);
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/não está vinculada a nenhum cliente/i);
  });
});

describe("o escopo escolhido vale para os dados, não só para o cabeçalho", () => {
  it("as operações vêm da empresa escolhida", async () => {
    const agora = new Date().toISOString();
    for (const [cliente, referencia] of [
      [alfa, "OP-ALFA"],
      [beta, "OP-BETA"],
    ]) {
      await env.DB.prepare(
        `INSERT INTO todogreen_client_operations
           (id, tenant_id, client_id, workspace_owner_id, reference, status, service_date,
            origin, destination, created_at, updated_at)
         VALUES (?, 'todogreen', ?, ?, ?, 'entregue', ?, 'A', 'B', ?, ?)`,
      )
        .bind(crypto.randomUUID(), cliente, dona.id, referencia, agora.slice(0, 10), agora, agora)
        .run()
        .catch(() => {});
    }

    const naAlfa = await (await pedir("/api/todogreen/portal/operacoes", consultor.token)).json();
    const naBeta = await (
      await pedir(`/api/todogreen/portal/operacoes?empresa=${beta}`, consultor.token)
    ).json();

    const refsAlfa = (naAlfa.operacoes || []).map((o) => o.referencia ?? o.reference);
    const refsBeta = (naBeta.operacoes || []).map((o) => o.referencia ?? o.reference);
    expect(refsAlfa).not.toContain("OP-BETA");
    expect(refsBeta).not.toContain("OP-ALFA");
  });
});
