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

describe("visibilidade de leads, documentos e sites com D1 local", () => {
  it("filtra leads, documentos e sites por dono/compartilhamento para colaborador", async () => {
    const owner = await createUser("rec-owner-1");
    const member = await createUser("rec-member-1");
    const stranger = await createUser("rec-stranger-1");
    await addMember(owner.id, member.id, "colaborador");

    const data = {
      leads: [
        { id: "lead-own", name: "Lead próprio", ownerId: member.id },
        { id: "lead-hidden", name: "Lead alheio", ownerId: stranger.id },
        { id: "lead-shared", name: "Lead compartilhado", ownerId: stranger.id, sharedWith: [member.id] },
      ],
      documents: [
        { id: "doc-own", title: "Doc próprio", ownerId: member.id },
        { id: "doc-hidden", title: "Doc alheio", ownerId: stranger.id },
      ],
      sites: [
        { id: "site-own", name: "Site próprio", ownerId: member.id },
        { id: "site-open", name: "Site do espaço todo", ownerId: stranger.id, visibility: "espaco_todo" },
        { id: "site-hidden", name: "Site alheio", ownerId: stranger.id },
      ],
    };
    await workspaceRequest(owner, { method: "PUT", body: { data, revision: 0 } });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.leads.map((l) => l.id).sort()).toEqual([
      "lead-own",
      "lead-shared",
    ]);
    expect(asMember.body.data.documents.map((d) => d.id)).toEqual(["doc-own"]);
    expect(asMember.body.data.sites.map((s) => s.id).sort()).toEqual([
      "site-open",
      "site-own",
    ]);

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.leads).toHaveLength(3);
    expect(asOwner.body.data.documents).toHaveLength(2);
    expect(asOwner.body.data.sites).toHaveLength(3);
  });

  it("colaborador cria um documento próprio sem apagar documentos ocultos", async () => {
    const owner = await createUser("rec-owner-2");
    const member = await createUser("rec-member-2");
    const stranger = await createUser("rec-stranger-2");
    await addMember(owner.id, member.id, "colaborador");
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          documents: [
            { id: "doc-hidden-2", title: "Confidencial", ownerId: stranger.id },
          ],
        },
        revision: 0,
      },
    });

    const asMember = await readJson(
      await workspaceRequest(member, { owner: owner.id }),
    );
    expect(asMember.body.data.documents).toHaveLength(0);

    const newDoc = {
      id: "doc-new-by-member",
      title: "Meu documento",
      ownerId: member.id,
    };
    await workspaceRequest(member, {
      method: "PUT",
      owner: owner.id,
      body: {
        data: { documents: [newDoc] },
        revision: asMember.body.revision,
      },
    });

    const asOwner = await readJson(await workspaceRequest(owner));
    expect(asOwner.body.data.documents.map((d) => d.id).sort()).toEqual([
      "doc-hidden-2",
      "doc-new-by-member",
    ]);
  });
});
