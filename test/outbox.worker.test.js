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
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, "hash", "salt", now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), "2099-01-01T00:00:00.000Z", now)
    .run();
  return { id, token };
}

function apiRequest(user, path, { method = "GET", body } = {}) {
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

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

describe("envio automático (/api/outbox/send)", () => {
  it("envia e-mail automaticamente e registra na caixa unificada", async () => {
    const user = await createUser("outbox-email-owner");
    const sent = await readJson(
      await apiRequest(user, "/api/outbox/send", {
        method: "POST",
        body: {
          channel: "email",
          to: "cliente@example.com",
          subject: "Proposta",
          body: "Segue a proposta combinada.",
          contactName: "Cliente",
          source: "agent",
        },
      }),
    );

    expect(sent.status).toBe(200);
    expect(sent.body.ok).toBe(true);
    expect(sent.body.delivery.provider).toBe("brevo");

    const inbox = await readJson(await apiRequest(user, "/api/inbox"));
    expect(inbox.body.items[0]).toMatchObject({
      channel: "email",
      direction: "out",
      contactName: "Cliente",
      contactHandle: "cliente@example.com",
      subject: "Proposta",
      body: "Segue a proposta combinada.",
    });
    expect(inbox.body.items[0].meta).toMatchObject({
      automatic: true,
      source: "agent",
      provider: "brevo",
    });
    expect(inbox.body.items[0].conversationId).toBeTruthy();

    const delivery = await env.DB.prepare(
      `SELECT provider, status FROM message_deliveries
        WHERE workspace_owner_id = ?
        LIMIT 1`,
    )
      .bind(user.id)
      .first();
    expect(delivery).toMatchObject({
      provider: "brevo",
      status: "sent",
    });
  });

  it("envia WhatsApp pela Cloud API e registra o id do provedor", async () => {
    const user = await createUser("outbox-wa-owner");
    const sent = await readJson(
      await apiRequest(user, "/api/outbox/send", {
        method: "POST",
        body: {
          channel: "whatsapp",
          to: "+55 (11) 99999-9999",
          body: "Seu pedido ficou pronto.",
          contactName: "Cliente WhatsApp",
          source: "agent",
        },
      }),
    );

    expect(sent.status).toBe(200);
    expect(sent.body.delivery).toMatchObject({
      provider: "whatsapp_cloud_api",
      providerMessageId: "wamid.test",
    });

    const inbox = await readJson(await apiRequest(user, "/api/inbox"));
    expect(inbox.body.items[0]).toMatchObject({
      channel: "whatsapp",
      direction: "out",
      contactName: "Cliente WhatsApp",
      contactHandle: "+55 (11) 99999-9999",
      body: "Seu pedido ficou pronto.",
    });
    expect(inbox.body.items[0].meta.providerMessageId).toBe("wamid.test");

    const message = await env.DB.prepare(
      `SELECT m.conversation_id, d.provider, d.provider_message_id, d.status
         FROM conversation_messages m
         JOIN message_deliveries d ON d.message_id = m.id
        WHERE m.workspace_owner_id = ?
        LIMIT 1`,
    )
      .bind(user.id)
      .first();
    expect(message).toMatchObject({
      provider: "whatsapp_cloud_api",
      provider_message_id: "wamid.test",
      status: "sent",
    });
    expect(message.conversation_id).toBeTruthy();
  });
});
