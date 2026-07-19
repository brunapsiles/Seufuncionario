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

async function seedWorkspace(ownerId, data) {
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision)
    VALUES (?, ?, ?, 0)`,
  )
    .bind(ownerId, JSON.stringify(data), new Date().toISOString())
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

const validHtml = `<html><body>${"<p>Conteúdo do site de teste com bastante texto para passar na validação de tamanho mínimo.</p>".repeat(2)}</body></html>`;

describe("autorização por registro em sites e leads públicos", () => {
  it("um colaborador não consegue publicar, despublicar nem apagar um site que não criou", async () => {
    const owner = await createUser("site-owner-1");
    const outsider = await createUser("site-outsider-1");
    await addMember(owner.id, outsider.id, "colaborador");
    await seedWorkspace(owner.id, {
      sites: [{ id: "site-1", name: "Site do Dono", ownerId: owner.id }],
    });
    await env.DB.prepare(
      `INSERT INTO public_sites
        (id, owner_id, slug, name, description, html, pages_json, published, created_at, updated_at)
      VALUES ('site-1', ?, 'site-do-dono', 'Site do Dono', '', ?, '[]', 1, ?, ?)`,
    )
      .bind(owner.id, validHtml, new Date().toISOString(), new Date().toISOString())
      .run();

    const publish = await req("/api/sites/publish", {
      method: "POST",
      user: outsider,
      body: {
        ownerId: owner.id,
        id: "site-1",
        slug: "site-do-dono",
        name: "Site do Dono",
        html: validHtml,
      },
    });
    expect(publish.status).toBe(403);

    const unpublish = await req("/api/sites/unpublish", {
      method: "POST",
      user: outsider,
      body: { ownerId: owner.id, id: "site-1" },
    });
    expect(unpublish.status).toBe(403);

    const del = await req("/api/sites/delete", {
      method: "POST",
      user: outsider,
      body: { ownerId: owner.id, id: "site-1" },
    });
    expect(del.status).toBe(403);

    const leads = await req(
      `/api/sites/leads?site_id=site-1`,
      { user: outsider },
    );
    expect(leads.status).toBe(403);

    const stillPublished = await env.DB.prepare(
      "SELECT published FROM public_sites WHERE id = 'site-1'",
    ).first();
    expect(stillPublished.published).toBe(1);
  });

  it("o próprio dono do espaço continua podendo gerenciar qualquer site", async () => {
    const owner = await createUser("site-owner-2");
    await seedWorkspace(owner.id, {
      sites: [{ id: "site-2", name: "Site do Dono", ownerId: owner.id }],
    });

    const publish = await req("/api/sites/publish", {
      method: "POST",
      user: owner,
      body: {
        id: "site-2",
        slug: "site-dois",
        name: "Site Dois",
        html: validHtml,
      },
    });
    expect(publish.status).toBe(200);

    const unpublish = await req("/api/sites/unpublish", {
      method: "POST",
      user: owner,
      body: { id: "site-2" },
    });
    expect(unpublish.status).toBe(200);
  });

  it("o colaborador que criou o site continua podendo gerenciá-lo", async () => {
    const owner = await createUser("site-owner-3");
    const creator = await createUser("site-creator-3");
    await addMember(owner.id, creator.id, "colaborador");
    await seedWorkspace(owner.id, {
      sites: [{ id: "site-3", name: "Site da Colaboradora", ownerId: creator.id }],
    });

    const publish = await req("/api/sites/publish", {
      method: "POST",
      user: creator,
      body: {
        ownerId: owner.id,
        id: "site-3",
        slug: "site-tres",
        name: "Site Três",
        html: validHtml,
      },
    });
    expect(publish.status).toBe(200);

    const leads = await req(`/api/sites/leads?site_id=site-3`, {
      user: creator,
    });
    expect(leads.status).toBe(200);
  });

  it("um admin convidado consegue gerenciar sites de outros membros do espaço", async () => {
    const owner = await createUser("site-owner-4");
    const admin = await createUser("site-admin-4");
    const creator = await createUser("site-creator-4");
    await addMember(owner.id, admin.id, "admin");
    await addMember(owner.id, creator.id, "colaborador");
    await seedWorkspace(owner.id, {
      sites: [{ id: "site-4", name: "Site da Colaboradora", ownerId: creator.id }],
    });

    const publish = await req("/api/sites/publish", {
      method: "POST",
      user: admin,
      body: {
        ownerId: owner.id,
        id: "site-4",
        slug: "site-quatro",
        name: "Site Quatro",
        html: validHtml,
      },
    });
    expect(publish.status).toBe(200);
  });

  it("um estranho sem vínculo com o espaço é recusado", async () => {
    const owner = await createUser("site-owner-5");
    const stranger = await createUser("site-stranger-5");
    await seedWorkspace(owner.id, {
      sites: [{ id: "site-5", name: "Site", ownerId: owner.id }],
    });

    const publish = await req("/api/sites/publish", {
      method: "POST",
      user: stranger,
      body: {
        ownerId: owner.id,
        id: "site-5",
        slug: "site-cinco",
        name: "Site Cinco",
        html: validHtml,
      },
    });
    expect(publish.status).toBe(403);
  });
});
