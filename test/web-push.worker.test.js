import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// Chaves de assinante geradas localmente (ECDH P-256 + segredo aleatório),
// no mesmo formato que o navegador produz via PushManager.subscribe() — são
// necessárias de verdade porque o envio de push executa a criptografia real
// (crypto.subtle) sobre esses valores, não apenas grava strings no banco.
const SUBSCRIBER_KEYS = [
  { p256dh: "BBcbXQS6JPMajokpCFSRDHm01L7XO7PDC0Z1bwAfyKFypdJHs7RutE_HYLqomJOc0FO0H1XOJN5kkSi_zlDXEhc", auth: "wXFF86sqhUHxDpvV2v6gBg" },
  { p256dh: "BFtdMCOzbeAxlvt7k-6S4msHYQxUmOplKT7fAjykVJ-pYkxazZNrqmhTUcfANsYLDNyS1mY2q9qYfBkbEqY2WYY", auth: "ck-9wpH03dIpL2SsLON9Qw" },
  { p256dh: "BBZwKJqHBE_TNSJU0cl4TwQ3SH5jgEtaZaAnBx2FLgbDF9rJAeDrRA2fRmAMmYdKGtEhufG00vxtMeP9QZuzvOs", auth: "2bPam7lQMKK5kWpqeCuCmw" },
  { p256dh: "BEKbtQSdS5qJSbyIYoS97KWGeDJbBvdXWqiwkBeX-XNb2FrGoHmN-mtoxhK2gFpJRryHN_upWTgBBbSUZ_Dq91Y", auth: "dat1WGZVxp0mMT-RiIqqYA" },
  { p256dh: "BCfdpVuoIpqUjC44nmRlJkjjvlsw7WQtZotcPr0rxB_1HfBfE9DR9DhDRg4dyCMrXEeLtvvIK8qSFdonwySNHfA", auth: "VKFgKiX7q9QXAZEf3D1hEw" },
  { p256dh: "BJzBpIsoTvlmEqNt06e-5ukbf7uzv8L07qxlQu5Tsu_H1zvhbQuCDkA58LhQkbdLHAJeFaPuwuJ4Q7-_CLqP56s", auth: "roNEIgkqZ4qhBjOTRUIJjg" },
];

const fakeSubscription = (n) => ({
  endpoint: `https://push.example.com/ep-${n}`,
  keys: SUBSCRIBER_KEYS[n - 1],
});

describe("assinatura de notificações Web Push", () => {
  it("expõe a chave pública VAPID em /api/config quando configurada", async () => {
    const response = await req("/api/config");
    const body = await response.json();
    expect(body.vapidPublicKey).toEqual(expect.any(String));
  });

  it("salva e substitui (upsert) uma assinatura pelo mesmo endpoint", async () => {
    const user = await createUser("push-user-1");
    const sub = fakeSubscription(1);
    const first = await req("/api/push/subscribe", {
      method: "POST",
      user,
      body: sub,
    });
    expect(first.status).toBe(200);

    const row1 = await env.DB.prepare(
      "SELECT user_id FROM push_subscriptions WHERE endpoint = ?",
    )
      .bind(sub.endpoint)
      .first();
    expect(row1.user_id).toBe(user.id);

    const otherUser = await createUser("push-user-1b");
    const second = await req("/api/push/subscribe", {
      method: "POST",
      user: otherUser,
      body: sub,
    });
    expect(second.status).toBe(200);
    const row2 = await env.DB.prepare(
      "SELECT user_id FROM push_subscriptions WHERE endpoint = ?",
    )
      .bind(sub.endpoint)
      .first();
    expect(row2.user_id).toBe(otherUser.id);

    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM push_subscriptions WHERE endpoint = ?",
    )
      .bind(sub.endpoint)
      .first();
    expect(count.n).toBe(1);
  });

  it("recusa assinatura sem endpoint ou chaves", async () => {
    const user = await createUser("push-user-2");
    const response = await req("/api/push/subscribe", {
      method: "POST",
      user,
      body: { endpoint: "", keys: {} },
    });
    expect(response.status).toBe(400);
  });

  it("exige login para assinar ou cancelar", async () => {
    const response = await req("/api/push/subscribe", {
      method: "POST",
      body: fakeSubscription(2),
    });
    expect(response.status).toBe(401);
  });

  it("cancela apenas a própria assinatura, nunca a de outra pessoa", async () => {
    const owner = await createUser("push-user-3");
    const stranger = await createUser("push-user-3b");
    const sub = fakeSubscription(3);
    await req("/api/push/subscribe", { method: "POST", user: owner, body: sub });

    await req("/api/push/unsubscribe", {
      method: "POST",
      user: stranger,
      body: { endpoint: sub.endpoint },
    });
    const stillThere = await env.DB.prepare(
      "SELECT id FROM push_subscriptions WHERE endpoint = ?",
    )
      .bind(sub.endpoint)
      .first();
    expect(stillThere).not.toBeNull();

    await req("/api/push/unsubscribe", {
      method: "POST",
      user: owner,
      body: { endpoint: sub.endpoint },
    });
    const gone = await env.DB.prepare(
      "SELECT id FROM push_subscriptions WHERE endpoint = ?",
    )
      .bind(sub.endpoint)
      .first();
    expect(gone).toBeNull();
  });
});

describe("envio de Web Push ao surgir uma notificação nova", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.startsWith("https://push.example.com/")) {
        return new Response(null, { status: 201 });
      }
      return originalFetch(input);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("envia um push para o destinatário quando uma notificação nova é sincronizada", async () => {
    const owner = await createUser("push-owner-4");
    const member = await createUser("push-member-4");
    await addMember(owner.id, member.id, "colaborador");
    await req("/api/push/subscribe", {
      method: "POST",
      user: member,
      body: fakeSubscription(4),
    });

    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          notifications: [
            {
              id: "notif-1",
              assigneeId: member.id,
              ownerId: owner.id,
              message: "Você recebeu uma nova missão",
              link: "/tarefas",
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        revision: 0,
      },
    });

    const pushCalls = globalThis.fetch.mock.calls.filter(([input]) =>
      String(typeof input === "string" ? input : input.url).startsWith(
        "https://push.example.com/",
      ),
    );
    expect(pushCalls).toHaveLength(1);
  });

  it("não reenvia push para notificações que já existiam antes da sincronização", async () => {
    const owner = await createUser("push-owner-5");
    const member = await createUser("push-member-5");
    await addMember(owner.id, member.id, "colaborador");
    await req("/api/push/subscribe", {
      method: "POST",
      user: member,
      body: fakeSubscription(5),
    });

    const notif = {
      id: "notif-existing",
      assigneeId: member.id,
      ownerId: owner.id,
      message: "Notificação antiga",
      link: "",
      read: false,
      createdAt: new Date().toISOString(),
    };
    const first = await readJson(
      await workspaceRequest(owner, {
        method: "PUT",
        body: { data: { notifications: [notif] }, revision: 0 },
      }),
    );
    globalThis.fetch.mockClear();

    // Ressincroniza o mesmo estado (sem notificação nova) — não deve haver push.
    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: { notifications: [{ ...notif, read: true }] },
        revision: first.body.revision,
      },
    });

    const pushCalls = globalThis.fetch.mock.calls.filter(([input]) =>
      String(typeof input === "string" ? input : input.url).startsWith(
        "https://push.example.com/",
      ),
    );
    expect(pushCalls).toHaveLength(0);
  });

  it("remove a assinatura quando o push retorna 410 (assinatura expirada)", async () => {
    const owner = await createUser("push-owner-6");
    const member = await createUser("push-member-6");
    await addMember(owner.id, member.id, "colaborador");
    const sub = fakeSubscription(6);
    await req("/api/push/subscribe", { method: "POST", user: member, body: sub });

    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.startsWith("https://push.example.com/"))
        return new Response(null, { status: 410 });
      return originalFetch(input);
    });

    await workspaceRequest(owner, {
      method: "PUT",
      body: {
        data: {
          notifications: [
            {
              id: "notif-gone",
              assigneeId: member.id,
              ownerId: owner.id,
              message: "Vai expirar",
              link: "",
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        revision: 0,
      },
    });

    const stillThere = await env.DB.prepare(
      "SELECT id FROM push_subscriptions WHERE endpoint = ?",
    )
      .bind(sub.endpoint)
      .first();
    expect(stillThere).toBeNull();
  });
});
