import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `198.51.100.${(requestNumber % 250) + 1}`;
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
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, "hash", "salt", now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), "2099-01-01T00:00:00.000Z", now)
    .run();
  return { id, token };
}

async function addMember(ownerId, memberId, role = "colaborador") {
  await env.DB.prepare(
    `INSERT INTO memberships (id, owner_id, member_id, role, created_at, status)
     VALUES (?, ?, ?, ?, ?, 'ativo')`,
  )
    .bind(`m-${ownerId}-${memberId}`, ownerId, memberId, role, new Date().toISOString())
    .run();
}

function inboxRequest(user, { method = "GET", owner, body } = {}) {
  const suffix = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return worker.fetch(
    new Request(`https://app.test/api/inbox${suffix}`, {
      method,
      headers: {
        authorization: `Bearer ${user.token}`,
        "content-type": "application/json",
        "cf-connecting-ip": nextIp(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

const readJson = async (r) => ({ status: r.status, body: await r.json() });

describe("caixa de entrada unificada (/api/inbox)", () => {
  it("registra e lista interações do espaço", async () => {
    const owner = await createUser("ib-owner-1");
    const created = await readJson(
      await inboxRequest(owner, {
        method: "POST",
        body: {
          channel: "whatsapp",
          direction: "out",
          contactName: "Cliente João",
          contactHandle: "5511999999999",
          body: "Seu pedido está pronto!",
        },
      }),
    );
    expect(created.status).toBe(200);
    expect(created.body.ok).toBe(true);

    const list = await readJson(await inboxRequest(owner));
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].channel).toBe("whatsapp");
    expect(list.body.items[0].contactName).toBe("Cliente João");
    // registro que sai já nasce lido
    expect(list.body.items[0].readAt).toBeTruthy();
  });

  it("colaborador do espaço enxerga a caixa compartilhada; estranho não", async () => {
    const owner = await createUser("ib-owner-2");
    const member = await createUser("ib-member-2");
    const outsider = await createUser("ib-outsider-2");
    await addMember(owner.id, member.id, "colaborador");

    await inboxRequest(owner, {
      method: "POST",
      body: { channel: "email", direction: "in", body: "Olá, tenho interesse" },
    });

    const asMember = await readJson(
      await inboxRequest(member, { owner: owner.id }),
    );
    expect(asMember.status).toBe(200);
    expect(asMember.body.items).toHaveLength(1);

    const asOutsider = await readJson(
      await inboxRequest(outsider, { owner: owner.id }),
    );
    expect(asOutsider.status).toBe(403);
  });

  it("marca interações recebidas como lidas", async () => {
    const owner = await createUser("ib-owner-3");
    await inboxRequest(owner, {
      method: "POST",
      body: { channel: "form", direction: "in", body: "Mensagem do site" },
    });
    const before = await readJson(await inboxRequest(owner));
    const item = before.body.items[0];
    expect(item.readAt).toBeNull();

    const patched = await readJson(
      await inboxRequest(owner, { method: "PATCH", body: { ids: [item.id] } }),
    );
    expect(patched.status).toBe(200);
    expect(patched.body.updated).toBe(1);

    const after = await readJson(await inboxRequest(owner));
    expect(after.body.items[0].readAt).toBeTruthy();
  });

  it("recusa canal inválido e registro vazio", async () => {
    const owner = await createUser("ib-owner-4");
    const badChannel = await readJson(
      await inboxRequest(owner, {
        method: "POST",
        body: { channel: "telepatia", body: "oi" },
      }),
    );
    expect(badChannel.status).toBe(400);

    const empty = await readJson(
      await inboxRequest(owner, {
        method: "POST",
        body: { channel: "note", body: "   " },
      }),
    );
    expect(empty.status).toBe(400);
  });
});
