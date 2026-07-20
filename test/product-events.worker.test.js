import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let ip = 1;
async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createUser(id) {
  const token = `token-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), now)
    .run();
  return { id, token };
}

async function addMember(ownerId, memberId) {
  await env.DB.prepare(
    `INSERT INTO memberships (id, owner_id, member_id, role, created_at, status)
     VALUES (?, ?, ?, 'colaborador', ?, 'ativo')`,
  )
    .bind(`membership-${ownerId}-${memberId}`, ownerId, memberId, new Date().toISOString())
    .run();
}

function req(path, user, { method = "GET", body } = {}) {
  return worker.fetch(
    new Request(`https://app.test${path}`, {
      method,
      headers: {
        ...(user ? { authorization: `Bearer ${user.token}` } : {}),
        "content-type": "application/json",
        "cf-connecting-ip": `198.51.100.${ip++}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

describe("métricas próprias e minimizadas", () => {
  it("registra somente metadados permitidos e entrega agregados ao dono", async () => {
    const owner = await createUser("events-owner-1");
    const member = await createUser("events-member-1");
    await addMember(owner.id, member.id);
    const created = await req(`/api/events?owner=${owner.id}`, member, {
      method: "POST",
      body: {
        event: "ai_completed",
        metadata: {
          module: "chat",
          success: true,
          prompt: "conteúdo que não pode ser armazenado",
          contactEmail: "segredo@example.com",
        },
      },
    });
    expect(created.status).toBe(200);

    const stored = await env.DB.prepare(
      "SELECT metadata_json FROM product_events WHERE workspace_owner_id = ?",
    )
      .bind(owner.id)
      .first();
    expect(JSON.parse(stored.metadata_json)).toEqual({
      module: "chat",
      success: true,
    });

    const metrics = await req("/api/events", owner);
    expect(metrics.status).toBe(200);
    const payload = await metrics.json();
    expect(payload.activeUsers).toBe(1);
    expect(payload.events).toEqual([
      { event: "ai_completed", total: 1, users: 1 },
    ]);
  });

  it("impede colaborador de consultar os agregados administrativos", async () => {
    const owner = await createUser("events-owner-2");
    const member = await createUser("events-member-2");
    await addMember(owner.id, member.id);
    const response = await req(`/api/events?owner=${owner.id}`, member);
    expect(response.status).toBe(403);
  });

  it("expõe apenas saúde técnica básica sem exigir login", async () => {
    const response = await req("/api/status", null);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      status: "operacional",
      database: "operacional",
      version: "v82",
    });
    expect(JSON.stringify(payload)).not.toMatch(/key|token|provider/i);
  });
});
