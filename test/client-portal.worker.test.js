import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";
import { normalizeClientPortal } from "../src/features/portal/clientPortalDomain.js";

let requestNumber = 0;
const nextIp = () => `203.0.113.${(++requestNumber % 240) + 1}`;

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

async function seedWorkspace(ownerId, data) {
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision)
     VALUES (?, ?, ?, 0)`,
  )
    .bind(ownerId, JSON.stringify(data), new Date().toISOString())
    .run();
}

async function addMember(ownerId, memberId, role = "colaborador") {
  await env.DB.prepare(
    `INSERT INTO memberships
      (id, owner_id, member_id, role, created_at, status)
     VALUES (?, ?, ?, ?, ?, 'ativo')`,
  )
    .bind(
      `membership-${ownerId}-${memberId}`,
      ownerId,
      memberId,
      role,
      new Date().toISOString(),
    )
    .run();
}

function request(path, { method = "GET", user, body } = {}) {
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

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

async function publish(user, portal, ownerId = user.id) {
  const result = await readJson(
    await request(
      `/api/client-portals/publish?owner=${encodeURIComponent(ownerId)}`,
      {
        method: "POST",
        user,
        body: { portal },
      },
    ),
  );
  expect(result.status).toBe(200);
  const token = result.body.url.split("/").pop();
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  return { ...result.body, token };
}

function portalFor(user, raw = {}) {
  return normalizeClientPortal(
    {
      id: raw.id || `portal-${user.id}`,
      clientName: raw.clientName || "Cliente Alfa",
      title: raw.title || "Acompanhamento Alfa",
      ...raw,
    },
    {
      ownerId: user.id,
      workspaceOwnerId: user.id,
      businessId: "business-portal",
      now: "2026-07-29T20:00:00.000Z",
    },
  );
}

describe("portal do cliente", () => {
  it("publica um snapshot mínimo, guarda apenas o hash e bloqueia indexação", async () => {
    const owner = await createUser("portal-owner-snapshot");
    const portal = portalFor(owner, {
      id: "portal-snapshot",
      resources: {
        projectIds: ["project-visible"],
        documentIds: ["document-visible"],
        reportIds: ["document-visible"],
        quoteIds: ["quote-visible"],
        orderIds: ["order-visible"],
        tripIds: ["trip-visible"],
      },
    });
    await seedWorkspace(owner.id, {
      businesses: [{ id: "business-portal", name: "Empresa Alfa" }],
      clientPortals: [portal],
      projects: [
        { id: "project-visible", name: "Projeto compartilhado" },
        { id: "project-hidden", name: "Projeto secreto" },
      ],
      tasks: [
        {
          id: "task-visible",
          title: "Tarefa do cliente",
          projectId: "project-visible",
          status: "Em andamento",
        },
        {
          id: "task-hidden",
          title: "Tarefa secreta",
          projectId: "project-hidden",
        },
      ],
      documents: [
        {
          id: "document-visible",
          title: "Relatório compartilhado",
          content: "Indicadores liberados",
        },
        {
          id: "document-hidden",
          title: "Contrato secreto",
          content: "Não compartilhar",
        },
      ],
      quotes: [
        {
          id: "quote-visible",
          clientName: "Cliente Alfa",
          items: [{ name: "Serviço", quantity: 1, price: 500 }],
        },
      ],
      orders: [
        {
          id: "order-visible",
          clientName: "Cliente Alfa",
          status: "Em produção",
          total: 500,
        },
      ],
      trips: [
        {
          id: "trip-visible",
          code: "TRP-100",
          origin: "São Paulo",
          destination: "Campinas",
        },
      ],
      notifications: [],
    });

    const published = await publish(owner, portal);
    const stored = await env.DB.prepare(
      "SELECT token_hash, config_json FROM client_portals WHERE id = ?",
    )
      .bind(portal.id)
      .first();
    expect(stored.token_hash).toBe(await sha256(published.token));
    expect(stored.token_hash).not.toBe(published.token);
    expect(stored.config_json).not.toContain(published.token);

    const page = await request(`/portal/${published.token}`);
    expect(page.status).toBe(200);
    expect(page.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(page.headers.get("x-frame-options")).toBe("DENY");
    const policy = page.headers.get("content-security-policy");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toMatch(/script-src 'nonce-[a-f0-9]+'/);
    expect(policy).not.toContain("script-src 'unsafe-inline'");
    const html = await page.text();
    expect(html).toContain("Projeto compartilhado");
    expect(html).toContain("Indicadores liberados");
    expect(html).not.toContain("Projeto secreto");
    expect(html).not.toContain("Contrato secreto");

    const data = await readJson(
      await request(`/api/portal/${published.token}`),
    );
    expect(data.status).toBe(200);
    expect(data.body.projects.map((item) => item.id)).toEqual([
      "project-visible",
    ]);
    expect(data.body.tasks.map((item) => item.id)).toEqual(["task-visible"]);
    expect(data.body.documents[0]).toMatchObject({
      id: "document-visible",
      downloadable: true,
    });
    expect(JSON.stringify(data.body)).not.toContain("hidden");

    const report = await request(
      `/api/portal/${published.token}/download/document-visible`,
    );
    expect(report.status).toBe(200);
    expect(await report.text()).toBe("Indicadores liberados");
  });

  it("abre chamado uma única vez e cria tarefa rastreável no workspace", async () => {
    const owner = await createUser("portal-owner-ticket");
    const portal = portalFor(owner, { id: "portal-ticket" });
    await seedWorkspace(owner.id, {
      clientPortals: [portal],
      tasks: [],
      notifications: [],
    });
    const { token } = await publish(owner, portal);
    const body = {
      type: "ticket",
      title: "Entrega atrasada",
      description: "Precisamos de uma nova previsão.",
      priority: "Urgente",
      requestId: "request-ticket-1",
    };
    const first = await readJson(
      await request(`/api/portal/${token}/actions`, {
        method: "POST",
        body,
      }),
    );
    expect(first.status).toBe(201);
    expect(first.body.protocol).toMatch(
      /^PORTAL-\d{8}-[A-F0-9]{6}$/,
    );

    const duplicate = await readJson(
      await request(`/api/portal/${token}/actions`, {
        method: "POST",
        body,
      }),
    );
    expect(duplicate.status).toBe(200);
    expect(duplicate.body).toMatchObject({
      duplicate: true,
      protocol: first.body.protocol,
    });

    const workspace = await env.DB.prepare(
      "SELECT data FROM workspaces WHERE user_id = ?",
    )
      .bind(owner.id)
      .first();
    const data = JSON.parse(workspace.data);
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0]).toMatchObject({
      title: "[Portal] Entrega atrasada",
      priority: "Alta",
      sourceClientPortalId: portal.id,
      publicProtocol: first.body.protocol,
    });
    expect(data.notifications[0].link).toBe("portal-cliente");
    const events = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM client_portal_events WHERE portal_id = ?",
    )
      .bind(portal.id)
      .first();
    expect(events.total).toBe(1);
  });

  it("recebe arquivo permitido, oculta o conteúdo na trilha e exige sessão para baixar", async () => {
    const owner = await createUser("portal-owner-upload");
    const portal = portalFor(owner, { id: "portal-upload" });
    await seedWorkspace(owner.id, {
      clientPortals: [portal],
      documents: [],
      notifications: [],
    });
    const { token } = await publish(owner, portal);
    const sent = await readJson(
      await request(`/api/portal/${token}/actions`, {
        method: "POST",
        body: {
          type: "upload",
          requestId: "request-upload-1",
          note: "Comprovante solicitado",
          file: {
            id: "file-portal",
            name: "comprovante.txt",
            type: "text/plain",
            size: 2,
            dataUrl: "data:text/plain;base64,SGk=",
          },
        },
      }),
    );
    expect(sent.status).toBe(201);

    const listed = await readJson(
      await request(
        `/api/client-portals/events?owner=${owner.id}&portal_id=${portal.id}`,
        { user: owner },
      ),
    );
    expect(listed.status).toBe(200);
    expect(listed.body.items[0].payload.file).toMatchObject({
      name: "comprovante.txt",
      type: "text/plain",
      size: 2,
    });
    expect(listed.body.items[0].payload.file).not.toHaveProperty("dataUrl");

    const anonymous = await request(
      `/api/client-portals/file?owner=${owner.id}&event_id=${listed.body.items[0].id}`,
    );
    expect(anonymous.status).toBe(401);
    const file = await request(
      `/api/client-portals/file?owner=${owner.id}&event_id=${listed.body.items[0].id}`,
      { user: owner },
    );
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("text/plain");
    expect(await file.text()).toBe("Hi");

    const unsafe = await readJson(
      await request(`/api/portal/${token}/actions`, {
        method: "POST",
        body: {
          type: "upload",
          requestId: "request-upload-unsafe",
          file: {
            name: "ataque.svg",
            type: "image/svg+xml",
            size: 10,
            dataUrl: "data:image/svg+xml;base64,PHN2Zz4=",
          },
        },
      }),
    );
    expect(unsafe.status).toBe(400);
    expect(unsafe.body.error).toMatch(/não é permitido/i);
  });

  it("registra aprovação somente na entrega explicitamente compartilhada", async () => {
    const owner = await createUser("portal-owner-delivery");
    const portal = portalFor(owner, {
      id: "portal-delivery",
      resources: {
        taskIds: ["task-delivery"],
      },
    });
    await seedWorkspace(owner.id, {
      clientPortals: [portal],
      tasks: [
        {
          id: "task-delivery",
          title: "Entrega liberada",
          status: "Em andamento",
          deliveries: [
            {
              id: "delivery-visible",
              comment: "Versão para homologação",
            },
          ],
        },
        {
          id: "task-hidden-delivery",
          title: "Entrega interna",
          deliveries: [{ id: "delivery-hidden" }],
        },
      ],
      notifications: [],
    });
    const { token } = await publish(owner, portal);

    const hidden = await readJson(
      await request(`/api/portal/${token}/actions`, {
        method: "POST",
        body: {
          type: "delivery",
          taskId: "task-hidden-delivery",
          deliveryId: "delivery-hidden",
          decision: "approved",
          requestId: "request-hidden-delivery",
        },
      }),
    );
    expect(hidden.status).toBe(400);

    const approved = await readJson(
      await request(`/api/portal/${token}/actions`, {
        method: "POST",
        body: {
          type: "delivery",
          taskId: "task-delivery",
          deliveryId: "delivery-visible",
          decision: "approved",
          feedback: "Aprovado para produção.",
          requestId: "request-visible-delivery",
        },
      }),
    );
    expect(approved.status).toBe(201);

    const workspace = await env.DB.prepare(
      "SELECT data FROM workspaces WHERE user_id = ?",
    )
      .bind(owner.id)
      .first();
    const data = JSON.parse(workspace.data);
    expect(data.tasks[0]).toMatchObject({
      clientApprovalStatus: "approved",
      clientApprovalFeedback: "Aprovado para produção.",
    });
    expect(data.tasks[0].deliveries[0]).toMatchObject({
      id: "delivery-visible",
      clientDecision: "approved",
      clientFeedback: "Aprovado para produção.",
      clientProtocol: approved.body.protocol,
    });
    expect(data.tasks[1]).not.toHaveProperty("clientApprovalStatus");
  });

  it("revoga o token e impede colaborador com acesso somente de leitura", async () => {
    const owner = await createUser("portal-owner-security");
    const member = await createUser("portal-member-security");
    await addMember(owner.id, member.id);
    const portal = portalFor(owner, {
      id: "portal-security",
      visibility: "espaco_todo",
      sharingPermission: "visualizar",
    });
    await seedWorkspace(owner.id, {
      clientPortals: [portal],
      notifications: [],
    });
    const { token } = await publish(owner, portal);

    const collaboratorPublish = await request(
      `/api/client-portals/publish?owner=${owner.id}`,
      {
        method: "POST",
        user: member,
        body: {
          portal: { ...portal, ownerId: member.id },
        },
      },
    );
    expect(collaboratorPublish.status).toBe(403);
    const collaboratorEvents = await request(
      `/api/client-portals/events?owner=${owner.id}&portal_id=${portal.id}`,
      { user: member },
    );
    expect(collaboratorEvents.status).toBe(403);

    const revoked = await readJson(
      await request(`/api/client-portals/revoke?owner=${owner.id}`, {
        method: "POST",
        user: owner,
        body: { id: portal.id },
      }),
    );
    expect(revoked).toMatchObject({ status: 200, body: { ok: true } });
    expect((await request(`/portal/${token}`)).status).toBe(404);
    expect((await request(`/api/portal/${token}`)).status).toBe(404);
  });
});
