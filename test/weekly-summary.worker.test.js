import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../worker.js";

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
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, "hash", "salt", now)
    .run();
}

async function seedWorkspace(userId, data) {
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision) VALUES (?, ?, ?, 0)`,
  )
    .bind(userId, JSON.stringify(data), new Date().toISOString())
    .run();
}

const SUB = {
  p256dh:
    "BBcbXQS6JPMajokpCFSRDHm01L7XO7PDC0Z1bwAfyKFypdJHs7RutE_HYLqomJOc0FO0H1XOJN5kkSi_zlDXEhc",
  auth: "wXFF86sqhUHxDpvV2v6gBg",
};

async function addSubscription(userId, endpoint) {
  await env.DB.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `push-${userId}`,
      userId,
      endpoint,
      SUB.p256dh,
      SUB.auth,
      new Date().toISOString(),
    )
    .run();
}

// Segunda-feira 2026-07-20 → semana anterior = 13 a 19/07/2026.
const MONDAY = Date.parse("2026-07-20T12:00:00Z");

async function runScheduled() {
  const promises = [];
  const ctx = { waitUntil: (p) => promises.push(p), passThroughOnException: () => {} };
  await worker.scheduled({ scheduledTime: MONDAY, cron: "0 12 * * 1" }, env, ctx);
  await Promise.all(promises);
}

describe("resumo semanal por push (handler scheduled)", () => {
  const originalFetch = globalThis.fetch;
  let pushCalls;

  beforeEach(() => {
    pushCalls = [];
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.startsWith("https://push.example.com/")) {
        pushCalls.push({ url, body: init?.body });
        return new Response(null, { status: 201 });
      }
      return originalFetch(input, init);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("envia um push com o resumo da semana anterior para quem teve atividade", async () => {
    await createUser("ws-owner-1");
    await seedWorkspace("ws-owner-1", {
      orders: [
        { id: "o1", status: "Entregue", total: 120, createdAt: "2026-07-15T10:00:00Z" },
        { id: "o2", status: "Cancelado", total: 999, createdAt: "2026-07-15T10:00:00Z" },
      ],
      transactions: [
        { id: "t1", type: "Receita", value: 200, date: "2026-07-16" },
        { id: "t2", type: "Despesa", value: 50, date: "2026-07-16" },
      ],
      tasks: [
        { id: "k1", status: "Concluído", updatedAt: "2026-07-17T09:00:00Z" },
        { id: "k2", status: "A fazer", updatedAt: "2026-07-17T09:00:00Z" },
      ],
      leads: [{ id: "l1", createdAt: "2026-07-14T09:00:00Z" }],
    });
    await addSubscription("ws-owner-1", "https://push.example.com/ep-week-1");

    await runScheduled();

    expect(pushCalls).toHaveLength(1);
  });

  it("não envia push para quem não teve atividade na semana anterior", async () => {
    await createUser("ws-owner-2");
    await seedWorkspace("ws-owner-2", {
      orders: [
        { id: "o1", status: "Entregue", total: 50, createdAt: "2026-07-01T10:00:00Z" },
      ],
      transactions: [],
      tasks: [],
      leads: [],
    });
    await addSubscription("ws-owner-2", "https://push.example.com/ep-week-2");

    await runScheduled();

    const forUser2 = pushCalls.filter((c) => c.url.includes("ep-week-2"));
    expect(forUser2).toHaveLength(0);
  });

  it("não envia push para quem teve atividade mas não tem assinatura", async () => {
    await createUser("ws-owner-3");
    await seedWorkspace("ws-owner-3", {
      orders: [],
      transactions: [{ id: "t1", type: "Receita", value: 300, date: "2026-07-15" }],
      tasks: [],
      leads: [],
    });
    // sem addSubscription

    await runScheduled();

    // Nenhum push relacionado (o único endpoint possível nem existe).
    expect(pushCalls.every((c) => !c.url.includes("owner-3"))).toBe(true);
  });

  it("não envia o mesmo resumo duas vezes quando o Cron dispara em dobro", async () => {
    await createUser("ws-owner-5");
    await seedWorkspace("ws-owner-5", {
      orders: [],
      transactions: [{ id: "t1", type: "Receita", value: 150, date: "2026-07-15" }],
      tasks: [],
      leads: [],
    });
    await addSubscription("ws-owner-5", "https://push.example.com/ep-week-5");

    await runScheduled();
    const firstRun = pushCalls.filter((c) => c.url.includes("ep-week-5"));
    expect(firstRun).toHaveLength(1);

    const logged = await env.DB.prepare(
      "SELECT week_start FROM weekly_summary_log WHERE user_id = ?",
    )
      .bind("ws-owner-5")
      .first();
    expect(logged.week_start).toBe("2026-07-13");

    pushCalls.length = 0;
    await runScheduled();
    const secondRun = pushCalls.filter((c) => c.url.includes("ep-week-5"));
    expect(secondRun).toHaveLength(0);
  });

  it("remove a assinatura quando o endpoint responde 410", async () => {
    await createUser("ws-owner-4");
    await seedWorkspace("ws-owner-4", {
      orders: [],
      transactions: [{ id: "t1", type: "Receita", value: 80, date: "2026-07-18" }],
      tasks: [],
      leads: [],
    });
    await addSubscription("ws-owner-4", "https://push.example.com/ep-week-4-gone");

    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.startsWith("https://push.example.com/"))
        return new Response(null, { status: 410 });
      return originalFetch(input);
    });

    await runScheduled();

    const still = await env.DB.prepare(
      "SELECT id FROM push_subscriptions WHERE endpoint = ?",
    )
      .bind("https://push.example.com/ep-week-4-gone")
      .first();
    expect(still).toBeNull();
  });
});
