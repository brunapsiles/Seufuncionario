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

const baseTasks = (memberId, strangerId) => [
  { id: "t-own", title: "Tarefa própria", ownerId: memberId, visibility: "privado" },
  { id: "t-assigned", title: "Tarefa atribuída", ownerId: strangerId, assigneeId: memberId, visibility: "atribuido" },
  { id: "t-shared", title: "Tarefa compartilhada", ownerId: strangerId, sharedWith: [memberId], visibility: "compartilhado" },
  { id: "t-open", title: "Tarefa do espaço todo", ownerId: strangerId, visibility: "espaco_todo" },
  { id: "t-hidden", title: "Tarefa privada de outra pessoa", ownerId: strangerId, visibility: "privado" },
];

describe("visibilidade de tarefas por colaborador com D1 local", () => {
  it("colaborador recebe apenas as tarefas próprias, atribuídas, compartilhadas ou do espaço todo", async () => {
    const owner = await createUser("vis-owner-1");
    const member = await createUser("vis-member-1");
    const stranger = await createUser("vis-stranger-1");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: { data: { tasks: baseTasks(member.id, stranger.id) }, revision: 0 },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    const visibleIds = asMember.body.data.tasks.map((t) => t.id).sort();
    expect(visibleIds).toEqual(["t-assigned", "t-open", "t-own", "t-shared"]);
  });

  it("dono e administrador continuam vendo todas as tarefas", async () => {
    const owner = await createUser("vis-owner-2");
    const member = await createUser("vis-member-2");
    const admin = await createUser("vis-admin-2");
    const stranger = await createUser("vis-stranger-2");
    await addMember(owner.id, member.id, "colaborador");
    await addMember(owner.id, admin.id, "admin");
    await workspaceRequest(owner, {
      method: "PUT",
      body: { data: { tasks: baseTasks(member.id, stranger.id) }, revision: 0 },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.tasks).toHaveLength(5);

    const asAdmin = await readJson(
      await workspaceRequest(admin, { owner: owner.id }),
    );
    expect(asAdmin.body.data.tasks).toHaveLength(5);
  });

  it("colaborador cria tarefa própria sem apagar tarefas ocultas de outras pessoas", async () => {
    const owner = await createUser("vis-owner-3");
    const member = await createUser("vis-member-3");
    const stranger = await createUser("vis-stranger-3");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: { data: { tasks: baseTasks(member.id, stranger.id) }, revision: 0 },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    const newTask = {
      id: "t-new-by-member",
      title: "Nova tarefa do colaborador",
      ownerId: member.id,
      visibility: "privado",
    };
    const put = await readJson(
      await workspaceRequest(member, {
        method: "PUT",
        owner: owner.id,
        body: {
          data: { tasks: [...asMember.body.data.tasks, newTask] },
          revision: asMember.body.revision,
        },
      }),
    );
    expect(put.status).toBe(200);

    const asOwner = await readJson(await workspaceRequest(owner));
    const ids = asOwner.body.data.tasks.map((t) => t.id).sort();
    expect(ids).toEqual([
      "t-assigned",
      "t-hidden",
      "t-new-by-member",
      "t-open",
      "t-own",
      "t-shared",
    ]);
  });

  it("recusa que o colaborador altere uma tarefa oculta ou injete uma tarefa em nome de outra pessoa", async () => {
    const owner = await createUser("vis-owner-4");
    const member = await createUser("vis-member-4");
    const stranger = await createUser("vis-stranger-4");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: { data: { tasks: baseTasks(member.id, stranger.id) }, revision: 0 },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    const forgedHidden = {
      id: "t-hidden",
      title: "Título adulterado",
      ownerId: stranger.id,
      visibility: "privado",
    };
    const impersonated = {
      id: "t-impersonated",
      title: "Tarefa fingindo ser de outra pessoa",
      ownerId: stranger.id,
      visibility: "privado",
    };
    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: {
          tasks: [...asMember.body.data.tasks, forgedHidden, impersonated],
        },
        revision: asMember.body.revision,
      },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    const hidden = asOwner.body.data.tasks.find((t) => t.id === "t-hidden");
    expect(hidden.title).toBe("Tarefa privada de outra pessoa");
    expect(
      asOwner.body.data.tasks.find((t) => t.id === "t-impersonated"),
    ).toBeUndefined();
  });

  it("gestor também recebe o filtro de visibilidade nesta fase", async () => {
    const owner = await createUser("vis-owner-5");
    const manager = await createUser("vis-manager-5");
    const stranger = await createUser("vis-stranger-5");
    await addMember(owner.id, manager.id, "gestor");
    await workspaceRequest(owner, {
      method: "PUT",
      body: { data: { tasks: baseTasks(manager.id, stranger.id) }, revision: 0 },
    });

    const asManager = await readJson(
      await workspaceRequest(manager, { owner: owner.id }),
    );
    const visibleIds = asManager.body.data.tasks.map((t) => t.id).sort();
    expect(visibleIds).toEqual(["t-assigned", "t-open", "t-own", "t-shared"]);
  });
});
