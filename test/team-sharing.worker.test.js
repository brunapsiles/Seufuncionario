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

describe("compartilhamento por equipe e projeto com D1 local", () => {
  it("mostra um registro compartilhado com a equipe apenas para quem está nela", async () => {
    const owner = await createUser("team-owner-1");
    const memberInTeam = await createUser("team-member-in-1");
    const memberOutTeam = await createUser("team-member-out-1");
    await addMember(owner.id, memberInTeam.id, "colaborador");
    await addMember(owner.id, memberOutTeam.id, "colaborador");

    const data = {
      teams: [{ id: "team-vendas", name: "Vendas", memberIds: [memberInTeam.id] }],
      documents: [
        {
          id: "doc-team",
          title: "Contrato da equipe",
          ownerId: owner.id,
          sharedTeams: ["team-vendas"],
        },
      ],
    };
    await workspaceRequest(owner, { method: "PUT", body: { data, revision: 0 } });

    const asInTeam = await readJson(
      await workspaceRequest(memberInTeam, { owner: owner.id }),
    );
    expect(asInTeam.body.data.documents.map((d) => d.id)).toEqual(["doc-team"]);

    const asOutTeam = await readJson(
      await workspaceRequest(memberOutTeam, { owner: owner.id }),
    );
    expect(asOutTeam.body.data.documents).toHaveLength(0);
  });

  it("mostra um registro de projeto apenas para quem participa de tarefas daquele projeto", async () => {
    const owner = await createUser("team-owner-2");
    const participant = await createUser("team-participant-2");
    const outsider = await createUser("team-outsider-2");
    await addMember(owner.id, participant.id, "colaborador");
    await addMember(owner.id, outsider.id, "colaborador");

    const data = {
      tasks: [
        {
          id: "task-launch",
          title: "Preparar lançamento",
          ownerId: owner.id,
          assigneeId: participant.id,
          project: "Lançamento de julho",
        },
      ],
      documents: [
        {
          id: "doc-launch-brief",
          title: "Briefing do lançamento",
          ownerId: owner.id,
          visibility: "projeto",
          project: "Lançamento de julho",
        },
      ],
    };
    await workspaceRequest(owner, { method: "PUT", body: { data, revision: 0 } });

    const asParticipant = await readJson(
      await workspaceRequest(participant, { owner: owner.id }),
    );
    expect(asParticipant.body.data.documents.map((d) => d.id)).toEqual([
      "doc-launch-brief",
    ]);

    const asOutsider = await readJson(
      await workspaceRequest(outsider, { owner: owner.id }),
    );
    expect(asOutsider.body.data.documents).toHaveLength(0);
  });

  it("impede que colaborador altere o roster de equipes ao sincronizar", async () => {
    const owner = await createUser("team-owner-3");
    const member = await createUser("team-member-3");
    await addMember(owner.id, member.id, "colaborador");

    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          teams: [{ id: "team-real", name: "Suporte", memberIds: [member.id] }],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.teams).toEqual([
      { id: "team-real", name: "Suporte", memberIds: [member.id] },
    ]);

    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: {
          teams: [{ id: "team-fake", name: "Forjada", memberIds: [member.id] }],
        },
        revision: asMember.body.revision,
      },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.teams).toEqual([
      { id: "team-real", name: "Suporte", memberIds: [member.id] },
    ]);
  });
});
