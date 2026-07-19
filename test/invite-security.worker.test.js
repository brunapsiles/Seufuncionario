import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `203.0.113.${(requestNumber % 250) + 1}`;
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

async function seedInvite({ code, ownerId, email, rawToken, status = "enviado" }) {
  await env.DB.prepare(
    `INSERT INTO invites (code, owner_id, role, created_at, expires_at, token, email, name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      code,
      ownerId,
      "colaborador",
      new Date().toISOString(),
      "2099-01-01T00:00:00.000Z",
      await sha256(rawToken),
      email,
      "Pessoa Convidada",
      status,
    )
    .run();
}

describe("segurança dos convites: token com hash e cancelamento auditável", () => {
  it("o token bruto do link de convite funciona para consulta e aceite mesmo estando hasheado no banco", async () => {
    const owner = await createUser("sec-owner-1");
    const rawToken = "raw-token-para-teste-de-aceite";
    await seedInvite({
      code: "code-sec-accept",
      ownerId: owner.id,
      email: "aceita-sec@example.com",
      rawToken,
    });

    const row = await env.DB.prepare("SELECT token FROM invites WHERE code = ?")
      .bind("code-sec-accept")
      .first();
    expect(row.token).not.toBe(rawToken);
    expect(row.token).toHaveLength(64); // hex sha-256 digest
    expect(row.token).toBe(await sha256(rawToken));

    const info = await req(`/api/collab/invite-info?token=${rawToken}`);
    expect(info.status).toBe(200);

    const accept = await req("/api/collab/invite/accept", {
      method: "POST",
      body: { token: rawToken, password: "senha-segura-123" },
    });
    expect(accept.status).toBe(200);
    const acceptBody = await accept.json();
    expect(acceptBody.ok).toBe(true);
  });

  it("o valor hasheado guardado no banco não funciona como token (protege contra vazamento de dump)", async () => {
    const owner = await createUser("sec-owner-3");
    const rawToken = "raw-token-nao-deve-vazar";
    await seedInvite({
      code: "code-sec-leak",
      ownerId: owner.id,
      email: "vazamento-sec@example.com",
      rawToken,
    });
    const row = await env.DB.prepare("SELECT token FROM invites WHERE code = ?")
      .bind("code-sec-leak")
      .first();

    // Um invasor com acesso de leitura ao banco (ex.: dump/backup vazado) só
    // tem o hash armazenado — usá-lo diretamente como token não deve funcionar.
    const infoWithHash = await req(`/api/collab/invite-info?token=${row.token}`);
    expect(infoWithHash.status).toBe(404);
  });

  it("cancelar um convite preserva o registro para auditoria e invalida o token para uso", async () => {
    const owner = await createUser("sec-owner-4");
    const rawToken = "raw-token-cancel-sec";
    await seedInvite({
      code: "code-sec-cancel",
      ownerId: owner.id,
      email: "cancelar-sec@example.com",
      rawToken,
    });

    const cancel = await req("/api/collab/cancel", {
      method: "POST",
      user: owner,
      body: { id: "code-sec-cancel" },
    });
    expect(cancel.status).toBe(200);

    const row = await env.DB.prepare(
      "SELECT status FROM invites WHERE code = ?",
    )
      .bind("code-sec-cancel")
      .first();
    expect(row).not.toBeNull();
    expect(row.status).toBe("cancelado");

    const info = await req(`/api/collab/invite-info?token=${rawToken}`);
    expect(info.status).toBe(410);

    const accept = await req("/api/collab/invite/accept", {
      method: "POST",
      body: { token: rawToken, password: "senha-segura-123" },
    });
    expect(accept.status).toBe(410);
  });
});
