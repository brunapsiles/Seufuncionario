import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

const sha256 = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const token = "work-center-token";
const userId = "work-center-user";

const request = (path, options = {}) => worker.fetch(
  new Request(`https://app.test${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  }),
  env,
  { waitUntil() {}, passThroughOnException() {} },
);

beforeAll(async () => {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO users (id,name,email,password_hash,password_salt,created_at) VALUES (?,?,?,'h','s',?)",
  ).bind(userId, "Pessoa Central", "central@teste.com", now).run();
  await env.DB.prepare(
    "INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,'2099-01-01T00:00:00.000Z',?)",
  ).bind("session-work-center", userId, await sha256(token), now).run();
  await env.DB.prepare(
    `INSERT INTO todogreen_access_emails
      (id,tenant_id,email,role,status,permissions_json,note,created_by,created_at,updated_at)
     VALUES (?,'todogreen',?,'vendedor','active',?,'',?,?,?)`,
  ).bind(crypto.randomUUID(), "central@teste.com", JSON.stringify(["read", "work:item:write"]), userId, now, now).run();
});

describe("Central de Trabalho no worker", () => {
  it("cria tarefa do CRM no quadro comercial sem exigir boardId", async () => {
    const response = await request("/api/todogreen/work-center", {
      method: "POST",
      body: JSON.stringify({
        boardKey: "comercial-deal-desk",
        type: "tarefa",
        title: "Enviar proposta para Adidas",
        client: "Adidas",
        fields: { clientId: "adidas", source: "crm" },
      }),
    });
    expect(response.status).toBe(201);
    const { item } = await response.json();
    expect(item.boardId).toBe(`${userId}:comercial-deal-desk`);
    expect(item.client).toBe("Adidas");
    expect(item.fields).toMatchObject({ clientId: "adidas", source: "crm" });
  });

  it("registra uma única trilha de auditoria por edição", async () => {
    const created = await request("/api/todogreen/work-center", {
      method: "POST",
      body: JSON.stringify({ title: "Qualificar contato", client: "Amazon" }),
    });
    const { item } = await created.json();
    const updated = await request(`/api/todogreen/work-center/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "em-andamento", revision: item.revision }),
    });
    expect(updated.status).toBe(200);

    const count = await env.DB.prepare(
      "SELECT count(*) AS total FROM todogreen_work_item_events WHERE item_id = ?",
    ).bind(item.id).first();
    expect(Number(count.total)).toBe(2);
  });
});
