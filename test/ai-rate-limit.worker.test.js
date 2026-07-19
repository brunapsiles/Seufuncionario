import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `172.16.${Math.floor(requestNumber / 250) % 256}.${(requestNumber % 250) + 1}`;
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

function askAi(user) {
  return worker.fetch(
    new Request("https://app.test/api/ai", {
      method: "POST",
      headers: {
        authorization: `Bearer ${user.token}`,
        "content-type": "application/json",
        "cf-connecting-ip": nextIp(),
      },
      body: JSON.stringify({ prompt: "Preciso de ajuda com meu negócio" }),
    }),
    env,
  );
}

describe("limite de requisições da IA é por usuário, não só por IP", () => {
  it("bloqueia um mesmo usuário autenticado após várias chamadas, mesmo vindas de IPs diferentes", async () => {
    const user = await createUser("ai-rate-1");
    const statuses = [];
    for (let i = 0; i < 13; i++) {
      const response = await askAi(user);
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 12).every((s) => s !== 429)).toBe(true);
    expect(statuses[12]).toBe(429);
  });

  it("não bloqueia um usuário diferente que ainda não atingiu o próprio limite", async () => {
    const userA = await createUser("ai-rate-2");
    const userB = await createUser("ai-rate-3");
    for (let i = 0; i < 12; i++) await askAi(userA);
    const blocked = await askAi(userA);
    expect(blocked.status).toBe(429);

    const stillAllowed = await askAi(userB);
    expect(stillAllowed.status).not.toBe(429);
  });
});
