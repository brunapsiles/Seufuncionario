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

describe("integridade de missões e recompensas ao sincronizar como colaborador", () => {
  it("impede que o colaborador aprove a própria missão ou altere pontos, recompensa, vagas e visibilidade", async () => {
    const owner = await createUser("mi-owner-1");
    const member = await createUser("mi-member-1");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          tasks: [
            {
              id: "mission-1",
              title: "Fechar 5 vendas",
              ownerId: owner.id,
              assigneeId: member.id,
              visibility: "atribuido",
              isMission: true,
              missionStatus: "em_andamento",
              points: 50,
              reward: 200,
              slots: 1,
              rewardStatus: "prevista",
            },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    const forged = {
      ...asMember.body.data.tasks[0],
      missionStatus: "aprovada",
      rewardStatus: "paga",
      points: 999999,
      reward: 999999,
      slots: 999,
      ownerId: member.id,
      visibility: "privado",
      sharedWith: [],
    };
    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: { data: { tasks: [forged] }, revision: asMember.body.revision },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    const task = asOwner.body.data.tasks.find((t) => t.id === "mission-1");
    expect(task.missionStatus).toBe("em_andamento");
    expect(task.rewardStatus).toBe("prevista");
    expect(task.points).toBe(50);
    expect(task.reward).toBe(200);
    expect(task.slots).toBe(1);
    expect(task.ownerId).toBe(owner.id);
    expect(task.visibility).toBe("atribuido");
  });

  it("ainda permite que o colaborador envie uma entrega para revisão (transição legítima de status)", async () => {
    const owner = await createUser("mi-owner-2");
    const member = await createUser("mi-member-2");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          tasks: [
            {
              id: "mission-2",
              title: "Escrever relatório",
              ownerId: owner.id,
              assigneeId: member.id,
              visibility: "atribuido",
              isMission: true,
              missionStatus: "em_andamento",
              deliveries: [],
            },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    const legitimate = {
      ...asMember.body.data.tasks[0],
      missionStatus: "enviada_para_revisao",
      deliveries: [
        { id: "d1", comment: "Pronto", authorId: member.id, status: "enviada" },
      ],
    };
    const put = await readJson(
      await workspaceRequest(member, {
        method: "PUT",
        owner: owner.id,
        body: { data: { tasks: [legitimate] }, revision: asMember.body.revision },
      }),
    );
    expect(put.status).toBe(200);

    const asOwner = await readJson(await workspaceRequest(owner));
    const task = asOwner.body.data.tasks.find((t) => t.id === "mission-2");
    expect(task.missionStatus).toBe("enviada_para_revisao");
    expect(task.deliveries).toHaveLength(1);
  });

  it("dono continua podendo aprovar a missão e ajustar recompensa normalmente", async () => {
    const owner = await createUser("mi-owner-3");
    const member = await createUser("mi-member-3");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          tasks: [
            {
              id: "mission-3",
              title: "Revisar contrato",
              ownerId: owner.id,
              assigneeId: member.id,
              visibility: "atribuido",
              isMission: true,
              missionStatus: "enviada_para_revisao",
              rewardStatus: "prevista",
              reward: 100,
            },
          ],
        },
        revision: 0,
      },
    });

    const asOwner1 = await readJson(await workspaceRequest(owner));
    const approved = {
      ...asOwner1.body.data.tasks[0],
      missionStatus: "aprovada",
      rewardStatus: "aprovada",
      reward: 150,
    };
    const put = await readJson(
      await workspaceRequest(owner, {
        method: "PUT",
        body: { data: { tasks: [approved] }, revision: asOwner1.body.revision },
      }),
    );
    expect(put.status).toBe(200);

    const asOwner2 = await readJson(await workspaceRequest(owner));
    const task = asOwner2.body.data.tasks.find((t) => t.id === "mission-3");
    expect(task.missionStatus).toBe("aprovada");
    expect(task.rewardStatus).toBe("aprovada");
    expect(task.reward).toBe(150);
  });

  it("colaborador não consegue apagar uma tarefa compartilhada que não é dele por omissão", async () => {
    const owner = await createUser("mi-owner-4");
    const member = await createUser("mi-member-4");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          tasks: [
            {
              id: "shared-1",
              title: "Tarefa do espaço todo",
              ownerId: owner.id,
              visibility: "espaco_todo",
            },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.tasks).toHaveLength(1);

    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: { data: { tasks: [] }, revision: asMember.body.revision },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.tasks.map((t) => t.id)).toEqual(["shared-1"]);
  });

  it("dono continua podendo apagar suas próprias tarefas por omissão", async () => {
    const owner = await createUser("mi-owner-5");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          tasks: [
            { id: "own-1", title: "Tarefa a remover", ownerId: owner.id },
          ],
        },
        revision: 0,
      },
    });
    const asOwner1 = await readJson(await workspaceRequest(owner));
    await workspaceRequest(owner, {
      method: "PUT",
      body: { data: { tasks: [] }, revision: asOwner1.body.revision },
    });
    const asOwner2 = await readJson(await workspaceRequest(owner));
    expect(asOwner2.body.data.tasks).toHaveLength(0);
  });
});
