import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

const sha256 = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

async function createUser(id, email, role, permissions = ["read"]) {
  const token = `portfolio-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO users (id,name,email,password_hash,password_salt,created_at) VALUES (?,?,?,'h','s',?)",
  ).bind(id, id, email, now).run();
  await env.DB.prepare(
    "INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,'2099-01-01T00:00:00.000Z',?)",
  ).bind(`session-${id}`, id, await sha256(token), now).run();
  await env.DB.prepare(
    `INSERT INTO todogreen_access_emails
      (id,tenant_id,email,role,status,permissions_json,note,created_by,created_at,updated_at)
     VALUES (?,'todogreen',?,?,'active',?,'',?,?,?)`,
  ).bind(crypto.randomUUID(), email, role, JSON.stringify(permissions), id, now, now).run();
  return { id, email, token };
}

const call = (path, { method = "GET", token, body } = {}) => worker.fetch(
  new Request(`https://app.test${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }),
  env,
  { waitUntil() {}, passThroughOnException() {} },
);

let admin;
let sellerA;
let sellerB;
let clientA;
let clientB;

beforeAll(async () => {
  admin = await createUser("portfolio-admin", "portfolio-admin@example.com", "admin", ["*"]);
  sellerA = await createUser("portfolio-a", "vendedor-a@example.com", "vendedor");
  sellerB = await createUser("portfolio-b", "vendedor-b@example.com", "vendedor");
  for (const name of ["Cliente A", "Cliente B"]) {
    const result = await call("/api/todogreen/clients", {
      method: "POST",
      token: admin.token,
      body: { nome: name },
    });
    expect(result.status).toBe(201);
    const data = await result.json();
    if (name.endsWith("A")) clientA = data.id;
    else clientB = data.id;
  }
});

describe("carteira comercial To Do Green", () => {
  it("não entrega clientes sem atribuição ao vendedor", async () => {
    const result = await call("/api/todogreen/clients", { token: sellerA.token });
    expect(result.status).toBe(200);
    expect((await result.json()).clientes).toEqual([]);
  });

  it("somente pessoa habilitada define a carteira", async () => {
    const denied = await call("/api/todogreen/client-assignments", {
      method: "PUT",
      token: sellerA.token,
      body: { clientId: clientA, sellerEmail: sellerA.email },
    });
    expect(denied.status).toBe(403);

    const allowed = await call("/api/todogreen/client-assignments", {
      method: "PUT",
      token: admin.token,
      body: { clientId: clientA, sellerEmail: sellerA.email },
    });
    expect(allowed.status).toBe(200);
  });

  it("cada vendedor enxerga somente os próprios clientes", async () => {
    await call("/api/todogreen/client-assignments", {
      method: "PUT",
      token: admin.token,
      body: { clientId: clientB, sellerEmail: sellerB.email },
    });
    const a = await (await call("/api/todogreen/clients", { token: sellerA.token })).json();
    const b = await (await call("/api/todogreen/clients", { token: sellerB.token })).json();
    expect(a.clientes.map((item) => item.id)).toEqual([clientA]);
    expect(b.clientes.map((item) => item.id)).toEqual([clientB]);
    expect(a.acesso.somenteCarteira).toBe(true);
  });

  it("vendedor atualiza a visão 360º somente da própria carteira e com revisão", async () => {
    const before = await (await call("/api/todogreen/clients", { token: sellerA.token })).json();
    const revision = before.clientes[0].revision;
    const updated = await call(`/api/todogreen/clients/${clientA}`, {
      method: "PATCH",
      token: sellerA.token,
      body: {
        revision,
        crm: {
          tier: "Estratégica",
          stage: "Diagnóstico",
          nextAction: "Validar rota prioritária",
          nextActionAt: "2026-09-01",
          strategicPotential: 95,
          contacts: [{ name: "Ana Decisora", relationshipRole: "Decisor econômico", email: "ANA@CLIENTE.COM" }],
        },
      },
    });
    expect(updated.status).toBe(200);

    const after = await (await call("/api/todogreen/clients", { token: sellerA.token })).json();
    expect(after.clientes[0].crm).toMatchObject({
      tier: "Estratégica",
      stage: "Diagnóstico",
      nextAction: "Validar rota prioritária",
      strategicPotential: 95,
    });
    expect(after.clientes[0].crm.contacts[0]).toMatchObject({
      name: "Ana Decisora",
      email: "ana@cliente.com",
    });

    const stale = await call(`/api/todogreen/clients/${clientA}`, {
      method: "PATCH", token: sellerA.token, body: { revision, crm: { stage: "Proposta" } },
    });
    expect(stale.status).toBe(409);
    const outsidePortfolio = await call(`/api/todogreen/clients/${clientB}`, {
      method: "PATCH", token: sellerA.token, body: { revision: 1, crm: { stage: "Proposta" } },
    });
    expect(outsidePortfolio.status).toBe(404);
  });

  it("importa um lote de forma idempotente, classifica a temperatura e atribui à sessão", async () => {
    const payload = {
      clientes: [{
        id: "importacao-carteira-teste",
        nome: "Conta Padronizada",
        crm: {
          temperature: "Morno",
          source: "Carteira To Do Green",
          tags: ["Origem: Carteira To Do Green"],
        },
      }],
    };
    const first = await call("/api/todogreen/clients/import", {
      method: "POST", token: admin.token, body: payload,
    });
    expect(first.status).toBe(201);
    const second = await call("/api/todogreen/clients/import", {
      method: "POST", token: admin.token, body: payload,
    });
    expect(second.status).toBe(201);

    const all = await (await call("/api/todogreen/clients", { token: admin.token })).json();
    const imported = all.clientes.filter((item) => item.id === "importacao-carteira-teste");
    expect(imported).toHaveLength(1);
    expect(imported[0].crm.temperature).toBe("Morno");
    expect(imported[0].vendedores).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: admin.email }),
    ]));
  });

  it("administrador mantém visão completa e pode retirar atribuição", async () => {
    const all = await (await call("/api/todogreen/clients", { token: admin.token })).json();
    expect(all.clientes.map((item) => item.id)).toEqual(expect.arrayContaining([clientA, clientB]));
    const removed = await call(
      `/api/todogreen/client-assignments?clientId=${clientA}&sellerEmail=${encodeURIComponent(sellerA.email)}`,
      { method: "DELETE", token: admin.token },
    );
    expect(removed.status).toBe(200);
    const after = await (await call("/api/todogreen/clients", { token: sellerA.token })).json();
    expect(after.clientes).toEqual([]);
  });
});
