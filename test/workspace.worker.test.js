import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
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

async function workspaceRequest(user, { method = "GET", owner, body } = {}) {
  requestNumber += 1;
  const suffix = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return worker.fetch(
    new Request(`https://app.test/api/workspace${suffix}`, {
      method,
      headers: {
        authorization: `Bearer ${user.token}`,
        "content-type": "application/json",
        "cf-connecting-ip": `198.51.100.${(requestNumber % 250) + 1}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

describe("/api/workspace com D1 local", () => {
  beforeEach(() => {
    requestNumber += 1;
  });

  it("cria o workspace inicial a partir da revisão zero", async () => {
    const user = await createUser("initial");
    const empty = await readJson(await workspaceRequest(user));
    expect(empty).toEqual({
      status: 200,
      body: { data: null, updatedAt: null, revision: 0 },
    });

    const created = await readJson(
      await workspaceRequest(user, {
        method: "PUT",
        body: { data: { projects: ["primeiro"] }, revision: 0 },
      }),
    );
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ ok: true, revision: 1 });
    expect(created.body.updatedAt).toEqual(expect.any(String));
  });

  it("lê o conteúdo junto com a revisão atual", async () => {
    const user = await createUser("reader");
    await workspaceRequest(user, {
      method: "PUT",
      body: { data: { tasks: ["ler"] }, revision: 0 },
    });

    const loaded = await readJson(await workspaceRequest(user));
    expect(loaded.status).toBe(200);
    expect(loaded.body).toMatchObject({
      data: { tasks: ["ler"] },
      revision: 1,
      updatedAt: expect.any(String),
    });
  });

  it("atualiza com a revisão correta e incrementa a revisão", async () => {
    const user = await createUser("updater");
    const first = await readJson(
      await workspaceRequest(user, {
        method: "PUT",
        body: { data: { value: 1 }, revision: 0 },
      }),
    );
    const second = await readJson(
      await workspaceRequest(user, {
        method: "PUT",
        body: { data: { value: 2 }, revision: first.body.revision },
      }),
    );

    expect(first.body.revision).toBe(1);
    expect(second.status).toBe(200);
    expect(second.body.revision).toBe(2);
    const loaded = await readJson(await workspaceRequest(user));
    expect(loaded.body.data).toEqual({ value: 2 });
  });

  it("rejeita revisão antiga com 409 sem sobrescrever o servidor", async () => {
    const user = await createUser("conflict");
    await workspaceRequest(user, {
      method: "PUT",
      body: { data: { source: "primeira aba" }, revision: 0 },
    });
    const accepted = await readJson(
      await workspaceRequest(user, {
        method: "PUT",
        body: { data: { source: "segunda aba" }, revision: 1 },
      }),
    );
    const conflict = await readJson(
      await workspaceRequest(user, {
        method: "PUT",
        body: { data: { source: "dado obsoleto" }, revision: 1 },
      }),
    );

    expect(accepted.body.revision).toBe(2);
    expect(conflict.status).toBe(409);
    expect(conflict.body).toMatchObject({
      error: expect.any(String),
      serverRevision: 2,
      serverUpdatedAt: expect.any(String),
    });
    const loaded = await readJson(await workspaceRequest(user));
    expect(loaded.body.data).toEqual({ source: "segunda aba" });
  });

  it("mantém os workspaces isolados entre usuários", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await workspaceRequest(alice, {
      method: "PUT",
      body: { data: { private: "alice" }, revision: 0 },
    });
    await workspaceRequest(bob, {
      method: "PUT",
      body: { data: { private: "bob" }, revision: 0 },
    });

    const aliceData = await readJson(await workspaceRequest(alice));
    const bobData = await readJson(await workspaceRequest(bob));
    expect(aliceData.body.data).toEqual({ private: "alice" });
    expect(bobData.body.data).toEqual({ private: "bob" });
  });

  it("permite leitura e atualização por colaborador autorizado", async () => {
    const owner = await createUser("owner");
    const member = await createUser("member");
    await env.DB.prepare(
      `INSERT INTO memberships (id, owner_id, member_id, role, created_at)
      VALUES (?, ?, ?, 'editor', ?)`,
    )
      .bind("membership-1", owner.id, member.id, new Date().toISOString())
      .run();
    await workspaceRequest(owner, {
      method: "PUT",
      body: { data: { shared: 1 }, revision: 0 },
    });

    const read = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(read.body).toMatchObject({ data: { shared: 1 }, revision: 1 });
    const update = await readJson(
      await workspaceRequest(member, {
        method: "PUT",
        owner: owner.id,
        body: { data: { shared: 2 }, revision: read.body.revision },
      }),
    );
    expect(update).toMatchObject({ status: 200, body: { revision: 2 } });
  });

  it("bloqueia colaborador não autorizado", async () => {
    const owner = await createUser("blocked-owner");
    const stranger = await createUser("stranger");
    const read = await readJson(
      await workspaceRequest(stranger, { owner: owner.id }),
    );
    const write = await readJson(
      await workspaceRequest(stranger, {
        method: "PUT",
        owner: owner.id,
        body: { data: { forbidden: true }, revision: 0 },
      }),
    );

    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
    expect(
      await env.DB.prepare(
        "SELECT data FROM workspaces WHERE user_id = ?",
      )
        .bind(owner.id)
        .first(),
    ).toBeNull();
  });

  it("mantém compatibilidade com workspace anterior à migração", async () => {
    const user = await createUser("legacy");
    await env.DB.prepare(
      `INSERT INTO workspaces (user_id, data, updated_at)
      VALUES (?, ?, ?)`,
    )
      .bind(
        user.id,
        JSON.stringify({ legacy: true }),
        "2026-01-01T00:00:00.000Z",
      )
      .run();

    const loaded = await readJson(await workspaceRequest(user));
    expect(loaded.body).toMatchObject({
      data: { legacy: true },
      revision: 0,
    });
    const updatedByOldClient = await readJson(
      await workspaceRequest(user, {
        method: "PUT",
        body: { data: { legacy: false } },
      }),
    );
    expect(updatedByOldClient).toMatchObject({
      status: 200,
      body: { revision: 1 },
    });
  });

  it("aceita um workspace próximo ao limite permitido", async () => {
    const user = await createUser("large");
    const data = { content: "x".repeat(899_900) };
    expect(JSON.stringify(data).length).toBeLessThan(900_000);

    const saved = await readJson(
      await workspaceRequest(user, {
        method: "PUT",
        body: { data, revision: 0 },
      }),
    );
    expect(saved).toMatchObject({ status: 200, body: { revision: 1 } });
    const row = await env.DB.prepare(
      "SELECT length(data) AS size FROM workspaces WHERE user_id = ?",
    )
      .bind(user.id)
      .first();
    expect(row.size).toBe(JSON.stringify(data).length);
  });
});
