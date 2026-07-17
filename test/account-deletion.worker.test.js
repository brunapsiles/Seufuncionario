import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;

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

async function deleteAccount(user) {
  requestNumber += 1;
  return worker.fetch(
    new Request("https://app.test/api/auth/account", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${user.token}`,
        "cf-connecting-ip": `198.51.100.${(requestNumber % 250) + 1}`,
      },
    }),
    env,
  );
}

describe("/api/auth/account com D1 local", () => {
  it("recusa exclusão sem sessão válida", async () => {
    requestNumber += 1;
    const response = await worker.fetch(
      new Request("https://app.test/api/auth/account", {
        method: "DELETE",
        headers: { "cf-connecting-ip": `198.51.100.${requestNumber}` },
      }),
      env,
    );
    expect(response.status).toBe(401);
  });

  it("recusa métodos diferentes de DELETE", async () => {
    const user = await createUser("wrong-method");
    requestNumber += 1;
    const response = await worker.fetch(
      new Request("https://app.test/api/auth/account", {
        method: "GET",
        headers: {
          authorization: `Bearer ${user.token}`,
          "cf-connecting-ip": `198.51.100.${requestNumber}`,
        },
      }),
      env,
    );
    expect(response.status).toBe(405);
  });

  it("apaga a conta e todos os dados relacionados", async () => {
    const owner = await createUser("owner-del");
    const member = await createUser("member-del");
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO workspaces (user_id, data, updated_at, revision)
      VALUES (?, ?, ?, 0)`,
    )
      .bind(owner.id, JSON.stringify({ tasks: [] }), now)
      .run();
    await env.DB.prepare(
      `INSERT INTO memberships (id, owner_id, member_id, role, created_at)
      VALUES (?, ?, ?, 'editor', ?)`,
    )
      .bind("membership-del", owner.id, member.id, now)
      .run();
    await env.DB.prepare(
      `INSERT INTO invites (code, owner_id, role, created_at, expires_at)
      VALUES (?, ?, 'editor', ?, ?)`,
    )
      .bind("invite-del", owner.id, now, "2099-01-01T00:00:00.000Z")
      .run();
    await env.DB.prepare(
      `INSERT INTO public_sites
        (id, owner_id, slug, name, description, html, published, created_at, updated_at, pages_json)
      VALUES (?, ?, ?, 'Site', '', '<html></html>', 1, ?, ?, '[]')`,
    )
      .bind("site-del", owner.id, "site-del-slug", now, now)
      .run();
    await env.DB.prepare(
      `INSERT INTO public_site_leads
        (id, site_id, owner_id, name, email, phone, message, dedupe_key, created_at)
      VALUES (?, 'site-del', ?, 'Lead', '', '', '', 'dedupe-1', ?)`,
    )
      .bind("lead-del", owner.id, now)
      .run();
    await env.DB.prepare(
      `INSERT INTO error_logs (id, message, user_id, created_at)
      VALUES ('error-del', 'falha de teste', ?, ?)`,
    )
      .bind(owner.id, now)
      .run();

    const response = await deleteAccount(owner);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(
      await env.DB.prepare("SELECT id FROM users WHERE id = ?")
        .bind(owner.id)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare("SELECT id FROM sessions WHERE user_id = ?")
        .bind(owner.id)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare("SELECT user_id FROM workspaces WHERE user_id = ?")
        .bind(owner.id)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare(
        "SELECT id FROM memberships WHERE owner_id = ? OR member_id = ?",
      )
        .bind(owner.id, owner.id)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare("SELECT code FROM invites WHERE owner_id = ?")
        .bind(owner.id)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare("SELECT id FROM public_sites WHERE owner_id = ?")
        .bind(owner.id)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare(
        "SELECT id FROM public_site_leads WHERE owner_id = ?",
      )
        .bind(owner.id)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare("SELECT id FROM error_logs WHERE user_id = ?")
        .bind(owner.id)
        .first(),
    ).toBeNull();

    // O colaborador (member) continua existindo normalmente.
    expect(
      await env.DB.prepare("SELECT id FROM users WHERE id = ?")
        .bind(member.id)
        .first(),
    ).toMatchObject({ id: member.id });

    // A sessão apagada não pode mais ser usada.
    const second = await deleteAccount(owner);
    expect(second.status).toBe(401);
  });
});
