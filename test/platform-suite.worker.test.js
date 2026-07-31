import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => `192.0.2.${(++requestNumber % 240) + 1}`;

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
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision)
     VALUES (?, '{}', ?, 0)`,
  )
    .bind(id, now)
    .run();
  return { id, token };
}

function request(path, { method = "GET", user, body, origin } = {}) {
  const headers = { "cf-connecting-ip": nextIp() };
  if (user) headers.authorization = `Bearer ${user.token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (origin) headers.origin = origin;
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

function nextBusinessStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  while (![1, 2, 3, 4, 5].includes(date.getUTCDay()))
    date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(10, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

describe("central gratuita de crescimento", () => {
  it("publica agenda, impede dupla reserva e libera o horário ao cancelar", async () => {
    const owner = await createUser("platform-booking-owner");
    const created = await readJson(
      await request("/api/platform/booking-pages", {
        method: "POST",
        user: owner,
        body: {
          ownerId: owner.id,
          name: "Diagnóstico",
          durationMinutes: 30,
          weekdays: [1, 2, 3, 4, 5],
          startTime: "09:00",
          endTime: "18:00",
        },
      }),
    );
    expect(created.status).toBe(201);
    const { slug } = created.body.page;
    const publicPage = await request(`/agenda/${slug}`);
    expect(publicPage.status).toBe(200);
    expect(await publicPage.text()).toContain("Diagnóstico");

    const startAt = nextBusinessStart();
    const first = await readJson(
      await request(`/api/public-scheduling/${slug}/book`, {
        method: "POST",
        body: {
          name: "Ana",
          email: "ana@example.com",
          startAt,
        },
      }),
    );
    expect(first.status).toBe(201);
    expect(first.body.protocol).toMatch(/^AG-/);

    const collision = await readJson(
      await request(`/api/public-scheduling/${slug}/book`, {
        method: "POST",
        body: {
          name: "Bia",
          email: "bia@example.com",
          startAt,
        },
      }),
    );
    expect(collision.status).toBe(409);

    const cancelled = await readJson(
      await request(`/api/public-scheduling/${slug}/cancel`, {
        method: "POST",
        body: { token: first.body.cancelToken },
      }),
    );
    expect(cancelled).toEqual({ status: 200, body: { ok: true } });

    const reused = await readJson(
      await request(`/api/public-scheduling/${slug}/book`, {
        method: "POST",
        body: {
          name: "Bia",
          email: "bia@example.com",
          startAt,
        },
      }),
    );
    expect(reused.status).toBe(201);
  });

  it("recebe chamados públicos e calcula SLA sem expor outro espaço", async () => {
    const owner = await createUser("platform-support-owner");
    const stranger = await createUser("platform-support-stranger");
    const created = await readJson(
      await request("/api/platform/support-portals", {
        method: "POST",
        user: owner,
        body: { ownerId: owner.id, name: "Ajuda", slaHours: 8 },
      }),
    );
    const opened = await readJson(
      await request(`/api/public-support/${created.body.portal.slug}/tickets`, {
        method: "POST",
        body: {
          name: "Cliente",
          email: "cliente@example.com",
          subject: "Pedido não chegou",
          description: "Preciso de ajuda com a entrega.",
          priority: "Urgente",
        },
      }),
    );
    expect(opened.status).toBe(201);
    expect(opened.body.protocol).toMatch(/^CH-/);

    const ownTickets = await readJson(
      await request(`/api/platform/tickets?owner=${owner.id}`, { user: owner }),
    );
    expect(ownTickets.body.tickets).toHaveLength(1);
    expect(ownTickets.body.tickets[0]).toMatchObject({
      subject: "Pedido não chegou",
      priority: "Urgente",
      status: "Novo",
    });

    const denied = await readJson(
      await request(`/api/platform/tickets?owner=${owner.id}`, { user: stranger }),
    );
    expect(denied.status).toBe(403);
  });

  it("coleta analytics mínimos com CORS e entrega resumo ao proprietário", async () => {
    const owner = await createUser("platform-analytics-owner");
    const created = await readJson(
      await request("/api/platform/analytics-sites", {
        method: "POST",
        user: owner,
        body: {
          ownerId: owner.id,
          name: "Loja",
          allowedOrigin: "https://loja.example",
        },
      }),
    );
    const { id, siteKey } = created.body.site;
    const collected = await request(`/api/public-analytics/${siteKey}/event`, {
      method: "POST",
      origin: "https://loja.example",
      body: {
        eventName: "page_view",
        path: "/produto/cafe",
        referrer: "https://busca.example/resultado?q=cafe",
        sessionId: "session-1",
        visitorId: "visitor-1",
      },
    });
    expect(collected.status).toBe(204);
    expect(collected.headers.get("access-control-allow-origin")).toBe(
      "https://loja.example",
    );

    const rejected = await request(`/api/public-analytics/${siteKey}/event`, {
      method: "POST",
      origin: "https://outro.example",
      body: { eventName: "page_view", path: "/" },
    });
    expect(rejected.status).toBe(403);

    const summary = await readJson(
      await request(
        `/api/platform/analytics-summary?siteId=${id}&owner=${owner.id}`,
        { user: owner },
      ),
    );
    expect(summary.body.summary).toMatchObject({
      events: 1,
      pageViews: 1,
      sessions: 1,
      visitors: 1,
    });
    const stored = await env.DB.prepare(
      "SELECT referrer_host FROM analytics_events WHERE analytics_site_id = ?",
    )
      .bind(id)
      .first();
    expect(stored.referrer_host).toBe("busca.example");
  });

  it("persiste campanha apenas como rascunho com exigência de consentimento", async () => {
    const owner = await createUser("platform-campaign-owner");
    const created = await readJson(
      await request("/api/platform/campaigns", {
        method: "POST",
        user: owner,
        body: {
          ownerId: owner.id,
          name: "Reativação",
          subject: "Sentimos sua falta",
          content: "Veja as novidades da semana.",
          audience: { query: "cliente", estimatedCount: 12 },
        },
      }),
    );
    expect(created.status).toBe(201);
    expect(created.body.campaign).toMatchObject({
      status: "rascunho",
      audience: { consentRequired: true, estimatedCount: 12 },
    });

    const listed = await readJson(
      await request(`/api/platform/campaigns?owner=${owner.id}`, { user: owner }),
    );
    expect(listed.body.campaigns).toHaveLength(1);
  });
});
