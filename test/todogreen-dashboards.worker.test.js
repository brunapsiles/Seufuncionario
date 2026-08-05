import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

const sha256 = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

async function createUser(id, email, role, permissions) {
  const token = `dashboard-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO users (id,name,email,password_hash,password_salt,created_at) VALUES (?,?,?,'h','s',?)")
    .bind(id, id, email, now).run();
  await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,'2099-01-01T00:00:00.000Z',?)")
    .bind(`session-${id}`, id, await sha256(token), now).run();
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
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {}, passThroughOnException() {} },
);

let admin;
let seller;
let dashboard;

beforeAll(async () => {
  admin = await createUser("dash-admin", "dash-admin@example.com", "admin", ["*"]);
  seller = await createUser("dash-seller", "dash-seller@example.com", "vendedor", ["read"]);
});

describe("dashboards configuráveis To Do Green", () => {
  it("exige sessão e acesso à vertical", async () => {
    expect((await call("/api/todogreen/dashboards")).status).toBe(401);
  });

  it("vendedor cria painel pessoal com indicadores validados", async () => {
    const result = await call("/api/todogreen/dashboards", {
      method: "POST",
      token: seller.token,
      body: {
        name: "Minha carteira",
        widgets: [
          { title: "Clientes", type: "metric", metric: "clientes" },
          { title: "Pipeline", type: "bar", metric: "pipeline" },
        ],
      },
    });
    expect(result.status).toBe(201);
    dashboard = (await result.json()).dashboard;
    expect(dashboard.visibility).toBe("personal");
    expect(dashboard.widgets).toHaveLength(2);
  });

  it("impede métrica inventada", async () => {
    const result = await call("/api/todogreen/dashboards", {
      method: "POST",
      token: seller.token,
      body: { name: "Inválido", widgets: [{ type: "metric", metric: "numero-inventado" }] },
    });
    expect(result.status).toBe(400);
  });

  it("protege atualização concorrente por revisão", async () => {
    const result = await call(`/api/todogreen/dashboards/${dashboard.id}`, {
      method: "PUT",
      token: seller.token,
      body: { ...dashboard, revision: 999, widgets: dashboard.widgets },
    });
    expect(result.status).toBe(409);
  });

  it("somente administrador cria painel visível para a equipe", async () => {
    const personal = await call("/api/todogreen/dashboards", {
      method: "POST",
      token: seller.token,
      body: { name: "Tentativa equipe", visibility: "team", widgets: [{ type: "metric", metric: "clientes" }] },
    });
    expect((await personal.json()).dashboard.visibility).toBe("personal");

    const team = await call("/api/todogreen/dashboards", {
      method: "POST",
      token: admin.token,
      body: { name: "Visão comercial", visibility: "team", widgets: [{ type: "line", metric: "receita" }] },
    });
    expect((await team.json()).dashboard.visibility).toBe("team");
  });
});
