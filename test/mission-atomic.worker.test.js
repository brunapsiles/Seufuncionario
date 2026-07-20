import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => `203.0.113.${++requestNumber}`;

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
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions
      (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), now)
    .run();
  return { id, token };
}

async function addMember(ownerId, memberId) {
  await env.DB.prepare(
    `INSERT INTO memberships
      (id, owner_id, member_id, role, created_at, status)
     VALUES (?, ?, ?, 'colaborador', ?, 'ativo')`,
  )
    .bind(`membership-${ownerId}-${memberId}`, ownerId, memberId, new Date().toISOString())
    .run();
}

function request(user, path, { method = "GET", body } = {}) {
  return worker.fetch(
    new Request(`https://app.test${path}`, {
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

async function seedMission(owner, mission) {
  const response = await request(owner, "/api/workspace", {
    method: "PUT",
    body: { data: { tasks: [mission], notifications: [] }, revision: 0 },
  });
  expect(response.status).toBe(200);
}

describe("reserva atômica de vagas em missões", () => {
  it("permite que apenas uma pessoa assuma a última vaga", async () => {
    const owner = await createUser("atomic-owner-1");
    const memberA = await createUser("atomic-member-a");
    const memberB = await createUser("atomic-member-b");
    await addMember(owner.id, memberA.id);
    await addMember(owner.id, memberB.id);
    await seedMission(owner, {
      id: "atomic-mission-1",
      title: "Missão com uma vaga",
      ownerId: owner.id,
      visibility: "espaco_todo",
      distribution: "disponivel",
      approvalMode: "imediata",
      isMission: true,
      slots: 1,
      assignees: [],
      interested: [],
      status: "A fazer",
      missionStatus: "disponivel",
    });

    const [responseA, responseB] = await Promise.all([
      request(memberA, `/api/tasks/action?owner=${owner.id}`, {
        method: "POST",
        body: { action: "assume", taskId: "atomic-mission-1" },
      }),
      request(memberB, `/api/tasks/action?owner=${owner.id}`, {
        method: "POST",
        body: { action: "assume", taskId: "atomic-mission-1" },
      }),
    ]);

    expect([responseA.status, responseB.status].sort()).toEqual([200, 409]);
    const workspace = await (await request(owner, "/api/workspace")).json();
    const task = workspace.data.tasks.find((item) => item.id === "atomic-mission-1");
    expect(task.assignees).toHaveLength(1);
    expect([memberA.id, memberB.id]).toContain(task.assignees[0].userId);
    expect(task.status).toBe("Em andamento");
  });

  it("registra interesse sem ocupar vaga quando a missão exige aprovação", async () => {
    const owner = await createUser("atomic-owner-2");
    const member = await createUser("atomic-member-2");
    await addMember(owner.id, member.id);
    await seedMission(owner, {
      id: "atomic-mission-2",
      title: "Missão sujeita à aprovação",
      ownerId: owner.id,
      visibility: "espaco_todo",
      distribution: "disponivel",
      approvalMode: "aprovacao",
      isMission: true,
      slots: 1,
      assignees: [],
      interested: [],
      status: "A fazer",
      missionStatus: "disponivel",
    });

    const interest = await request(
      member,
      `/api/tasks/action?owner=${owner.id}`,
      {
        method: "POST",
        body: { action: "interest", taskId: "atomic-mission-2" },
      },
    );
    expect(interest.status).toBe(200);
    const payload = await interest.json();
    expect(payload.task.interested.map((item) => item.userId)).toEqual([
      member.id,
    ]);
    expect(payload.task.assignees).toEqual([]);

    const assume = await request(member, `/api/tasks/action?owner=${owner.id}`, {
      method: "POST",
      body: { action: "assume", taskId: "atomic-mission-2" },
    });
    expect(assume.status).toBe(409);
  });

  it("não confirma a existência da missão para quem não pode vê-la", async () => {
    const owner = await createUser("atomic-owner-3");
    const member = await createUser("atomic-member-3");
    await addMember(owner.id, member.id);
    await seedMission(owner, {
      id: "atomic-mission-3",
      title: "Missão privada",
      ownerId: owner.id,
      visibility: "privado",
      distribution: "disponivel",
      approvalMode: "imediata",
      isMission: true,
      slots: 1,
      assignees: [],
    });

    const response = await request(
      member,
      `/api/tasks/action?owner=${owner.id}`,
      {
        method: "POST",
        body: { action: "assume", taskId: "atomic-mission-3" },
      },
    );
    expect(response.status).toBe(404);
  });
});
