import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `198.18.0.${(requestNumber % 250) + 1}`;
};

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
    `INSERT INTO users
      (id, name, email, password_hash, password_salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, "hash", "salt", now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions
      (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      `session-${id}`,
      id,
      await sha256(token),
      "2099-01-01T00:00:00.000Z",
      now,
    )
    .run();
  return { id, token };
}

async function addMember(ownerId, memberId, role = "colaborador") {
  await env.DB.prepare(
    `INSERT INTO memberships (id, owner_id, member_id, role, created_at, status)
    VALUES (?, ?, ?, ?, ?, 'ativo')`,
  )
    .bind(`membership-${ownerId}-${memberId}`, ownerId, memberId, role, new Date().toISOString())
    .run();
}

function req(path, { method = "GET", user, body } = {}) {
  const headers = { "cf-connecting-ip": nextIp() };
  if (user) headers.authorization = `Bearer ${user.token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(
    new Request(`https://app.test${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

describe("/api/collab respeita o espaço ativo", () => {
  it("mostra o roster do espaço visitado quando ?owner= é informado", async () => {
    const owner = await createUser("scope-owner-1");
    const memberA = await createUser("scope-member-a-1");
    const memberB = await createUser("scope-member-b-1");
    await addMember(owner.id, memberA.id, "colaborador");
    await addMember(owner.id, memberB.id, "gestor");

    const response = await req(`/api/collab?owner=${owner.id}`, {
      user: memberA,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.members.map((m) => m.id).sort()).toEqual(
      [memberA.id, memberB.id].sort(),
    );
    expect(body.invites).toEqual([]);
  });

  it("recusa mostrar o roster de um espaço ao qual a pessoa não pertence", async () => {
    const owner = await createUser("scope-owner-2");
    const stranger = await createUser("scope-stranger-2");
    const response = await req(`/api/collab?owner=${owner.id}`, {
      user: stranger,
    });
    expect(response.status).toBe(403);
  });

  it("sem ?owner=, continua retornando os próprios convites e integrantes", async () => {
    const owner = await createUser("scope-owner-3");
    const member = await createUser("scope-member-3");
    await addMember(owner.id, member.id, "colaborador");

    const response = await req("/api/collab", { user: owner });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.members.map((m) => m.id)).toEqual([member.id]);
  });
});
