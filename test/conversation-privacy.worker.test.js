import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `192.0.2.${(requestNumber % 250) + 1}`;
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

function workspaceRequest(user, { method = "GET", owner, body } = {}) {
  const suffix = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return worker.fetch(
    new Request(`https://app.test/api/workspace${suffix}`, {
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

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

describe("privacidade das conversas de IA entre membros de um espaço", () => {
  it("um colaborador não vê as conversas de IA de outro colaborador no mesmo espaço", async () => {
    const owner = await createUser("cp-owner-1");
    const memberA = await createUser("cp-member-a");
    const memberB = await createUser("cp-member-b");
    await addMember(owner.id, memberA.id, "colaborador");
    await addMember(owner.id, memberB.id, "colaborador");

    await workspaceRequest(memberA, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: {
          conversations: [
            {
              id: "conv-a",
              title: "Conversa privada de A",
              ownerId: memberA.id,
              messages: [{ id: "m1", role: "user", content: "segredo de A" }],
            },
          ],
        },
        revision: 0,
      },
    });

    const asMemberB = await readJson(
      await workspaceRequest(memberB, { owner: owner.id }),
    );
    expect(asMemberB.body.data.conversations || []).toHaveLength(0);

    const asMemberA = await readJson(
      await workspaceRequest(memberA, { owner: owner.id }),
    );
    expect(asMemberA.body.data.conversations.map((c) => c.id)).toEqual([
      "conv-a",
    ]);

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.conversations.map((c) => c.id)).toEqual([
      "conv-a",
    ]);
  });

  it("conversas antigas sem ownerId ficam protegidas para evitar vazamento entre membros", async () => {
    const owner = await createUser("cp-owner-2");
    const member = await createUser("cp-member-2");
    await addMember(owner.id, member.id, "colaborador");

    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          conversations: [
            { id: "conv-legacy", title: "Conversa antiga", messages: [] },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.conversations).toEqual([]);
  });
});
