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
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, "hash", "salt", now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
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

async function addMember(ownerId, memberId) {
  await env.DB.prepare(
    `INSERT INTO memberships (id, owner_id, member_id, role, created_at, status)
     VALUES (?, ?, ?, 'colaborador', ?, 'ativo')`,
  )
    .bind(
      `membership-${ownerId}-${memberId}`,
      ownerId,
      memberId,
      new Date().toISOString(),
    )
    .run();
}

async function saveWorkspace(ownerId, data) {
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision)
     VALUES (?, ?, ?, 1)`,
  )
    .bind(ownerId, JSON.stringify(data), new Date().toISOString())
    .run();
}

function request(user, { owner, method = "GET", body } = {}) {
  requestNumber += 1;
  return worker.fetch(
    new Request(
      `https://app.test/api/inbox/personal${
        owner ? `?owner=${encodeURIComponent(owner)}` : ""
      }`,
      {
        method,
        headers: {
          authorization: `Bearer ${user.token}`,
          "content-type": "application/json",
          "cf-connecting-ip": `198.51.100.${(requestNumber % 250) + 1}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    ),
    env,
  );
}

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

describe("caixa de entrada pessoal (/api/inbox/personal)", () => {
  it("entrega somente atividades visíveis e destinadas ao membro", async () => {
    const owner = await createUser("pi-owner-visible");
    const member = await createUser("pi-member-visible");
    const outsider = await createUser("pi-outsider-visible");
    await addMember(owner.id, member.id);
    await saveWorkspace(owner.id, {
      tasks: [
        {
          id: "assigned",
          title: "Tarefa do membro",
          ownerId: owner.id,
          assigneeId: member.id,
          status: "A fazer",
          createdAt: "2026-07-29T10:00:00.000Z",
        },
        {
          id: "private",
          title: "Segredo do dono",
          ownerId: owner.id,
          status: "A fazer",
          visibility: "privado",
          createdAt: "2026-07-29T09:00:00.000Z",
        },
      ],
      notifications: [
        {
          id: "for-member",
          assigneeId: member.id,
          ownerId: owner.id,
          message: "Mensagem do membro",
          createdAt: "2026-07-29T11:00:00.000Z",
        },
        {
          id: "for-owner",
          assigneeId: owner.id,
          ownerId: owner.id,
          message: "Mensagem do dono",
          createdAt: "2026-07-29T12:00:00.000Z",
        },
      ],
    });

    const asMember = await readJson(
      await request(member, { owner: owner.id }),
    );
    expect(asMember.status).toBe(200);
    expect(asMember.body.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "task-assigned:assigned",
        "notification:for-member",
      ]),
    );
    expect(
      asMember.body.items.some((item) => item.message.includes("Segredo")),
    ).toBe(false);
    expect(
      asMember.body.items.some((item) => item.sourceId === "for-owner"),
    ).toBe(false);

    const asOutsider = await readJson(
      await request(outsider, { owner: owner.id }),
    );
    expect(asOutsider.status).toBe(403);
  });

  it("mantém leitura e adiamento separados por pessoa", async () => {
    const owner = await createUser("pi-owner-state");
    const member = await createUser("pi-member-state");
    await addMember(owner.id, member.id);
    await saveWorkspace(owner.id, {
      notifications: [
        {
          id: "shared-state",
          assigneeId: member.id,
          ownerId: owner.id,
          message: "Decisão pendente",
          kind: "approval",
          createdAt: "2026-07-29T12:00:00.000Z",
        },
      ],
    });
    const itemId = "notification:shared-state";

    const marked = await readJson(
      await request(member, {
        owner: owner.id,
        method: "PATCH",
        body: { action: "read", ids: [itemId] },
      }),
    );
    expect(marked).toEqual({
      status: 200,
      body: { ok: true, updated: 1 },
    });
    let list = await readJson(await request(member, { owner: owner.id }));
    expect(list.body.items[0].readAt).toEqual(expect.any(String));

    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const snoozed = await readJson(
      await request(member, {
        owner: owner.id,
        method: "PATCH",
        body: { action: "snooze", ids: [itemId], until },
      }),
    );
    expect(snoozed.status).toBe(200);
    list = await readJson(await request(member, { owner: owner.id }));
    expect(list.body.items[0]).toMatchObject({
      readAt: expect.any(String),
      snoozed: true,
      snoozedUntil: until,
    });

    const ownerList = await readJson(await request(owner));
    expect(
      ownerList.body.items.find((item) => item.id === itemId),
    ).toBeUndefined();
  });

  it("valida ações e prazo de adiamento", async () => {
    const owner = await createUser("pi-owner-invalid");
    const invalidAction = await readJson(
      await request(owner, {
        method: "PATCH",
        body: { action: "delete", ids: ["one"] },
      }),
    );
    expect(invalidAction.status).toBe(400);

    const invalidUntil = await readJson(
      await request(owner, {
        method: "PATCH",
        body: {
          action: "snooze",
          ids: ["one"],
          until: "2020-01-01T00:00:00.000Z",
        },
      }),
    );
    expect(invalidUntil.status).toBe(400);
  });
});
