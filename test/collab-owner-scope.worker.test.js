import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `198.18.0.${(requestNumber % 250) + 1}`;
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

describe("/api/collab respeita o espaço ativo", () => {
  it("mostra o roster do espaço visitado quando ?owner= é informado", async () => {
    const owner = await createUser("scope-owner-1");
    const memberA = await createUser("scope-member-a-1");
    const memberB = await createUser("scope-member-b-1");
    await addMember(owner.id, memberA.id, "colaborador");
    await addMember(owner.id, memberB.id, "gestor");

    const response = await req(`/api/collab?owner=${owner.id}`, {
      user: memberA,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.members.map((m) => m.id).sort()).toEqual(
      [memberA.id, memberB.id].sort(),
    );
    expect(body.invites).toEqual([]);
  });

  it("recusa mostrar o roster de um espaço ao qual a pessoa não pertence", async () => {
    const owner = await createUser("scope-owner-2");
    const stranger = await createUser("scope-stranger-2");
    const response = await req(`/api/collab?owner=${owner.id}`, {
      user: stranger,
    });
    expect(response.status).toBe(403);
  });

  it("sem ?owner=, continua retornando os próprios convites e integrantes", async () => {
    const owner = await createUser("scope-owner-3");
    const member = await createUser("scope-member-3");
    await addMember(owner.id, member.id, "colaborador");

    const response = await req("/api/collab", { user: owner });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.members.map((m) => m.id)).toEqual([member.id]);
  });

  it("um admin convidado vê os convites reais e pode administrar o espaço ativo", async () => {
    const owner = await createUser("scope-owner-4");
    const admin = await createUser("scope-admin-4");
    const colaborador = await createUser("scope-colaborador-4");
    await addMember(owner.id, admin.id, "admin");
    await addMember(owner.id, colaborador.id, "colaborador");

    const view = await req(`/api/collab?owner=${owner.id}`, { user: admin });
    expect(view.status).toBe(200);
    const viewBody = await view.json();
    expect(viewBody.canManage).toBe(true);
    expect(Array.isArray(viewBody.invites)).toBe(true);

    const changeRole = await req(
      `/api/collab/member-role?owner=${owner.id}`,
      {
        method: "POST",
        user: admin,
        body: { memberId: colaborador.id, role: "gestor" },
      },
    );
    expect(changeRole.status).toBe(200);
    const membership = await env.DB.prepare(
      "SELECT role FROM memberships WHERE owner_id = ? AND member_id = ?",
    )
      .bind(owner.id, colaborador.id)
      .first();
    expect(membership.role).toBe("gestor");

    const suspend = await req(
      `/api/collab/member-status?owner=${owner.id}`,
      {
        method: "POST",
        user: admin,
        body: { memberId: colaborador.id, status: "suspenso" },
      },
    );
    expect(suspend.status).toBe(200);
    const suspended = await env.DB.prepare(
      "SELECT status FROM memberships WHERE owner_id = ? AND member_id = ?",
    )
      .bind(owner.id, colaborador.id)
      .first();
    expect(suspended.status).toBe("suspenso");

    const audit = await req(`/api/collab/audit?owner=${owner.id}`, {
      method: "POST",
      user: admin,
    });
    expect(audit.status).toBe(200);
    const auditBody = await audit.json();
    const actions = auditBody.logs.map((l) => l.action);
    expect(actions).toContain("papel_alterado");
    expect(actions).toContain("colaborador_suspenso");
  });

  it("um colaborador ou gestor convidado não pode administrar o espaço ativo, só o próprio", async () => {
    const owner = await createUser("scope-owner-5");
    const gestor = await createUser("scope-gestor-5");
    const colaborador = await createUser("scope-colaborador-5");
    await addMember(owner.id, gestor.id, "gestor");
    await addMember(owner.id, colaborador.id, "colaborador");

    const changeRole = await req(
      `/api/collab/member-role?owner=${owner.id}`,
      {
        method: "POST",
        user: gestor,
        body: { memberId: colaborador.id, role: "admin" },
      },
    );
    expect(changeRole.status).toBe(403);

    const membership = await env.DB.prepare(
      "SELECT role FROM memberships WHERE owner_id = ? AND member_id = ?",
    )
      .bind(owner.id, colaborador.id)
      .first();
    expect(membership.role).toBe("colaborador");
  });

  it("um admin convidado não pode administrar um espaço ao qual não pertence", async () => {
    const owner = await createUser("scope-owner-6");
    const otherOwner = await createUser("scope-other-owner-6");
    const admin = await createUser("scope-admin-6");
    const colaborador = await createUser("scope-colaborador-6");
    await addMember(owner.id, admin.id, "admin");
    await addMember(otherOwner.id, colaborador.id, "colaborador");

    const changeRole = await req(
      `/api/collab/member-role?owner=${otherOwner.id}`,
      {
        method: "POST",
        user: admin,
        body: { memberId: colaborador.id, role: "gestor" },
      },
    );
    expect(changeRole.status).toBe(403);
  });
});
