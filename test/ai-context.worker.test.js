import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
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
  const token = `token-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), now)
    .run();
  return { id, token };
}

async function ask(user, body) {
  return worker.fetch(
    new Request("https://app.test/api/ai", {
      method: "POST",
      headers: {
        authorization: `Bearer ${user.token}`,
        "content-type": "application/json",
        "cf-connecting-ip": `10.10.10.${Math.floor(Math.random() * 200) + 1}`,
      },
      body: JSON.stringify(body),
    }),
    env,
  );
}

describe("contexto da IA resolvido no backend", () => {
  it("ignora perfil de negócio forjado pelo navegador e usa o registro salvo", async () => {
    const user = await createUser("ai-context-owner-1");
    await env.DB.prepare(
      `INSERT INTO workspaces (user_id, data, updated_at, revision)
       VALUES (?, ?, ?, 1)`,
    )
      .bind(
        user.id,
        JSON.stringify({
          selectedBusinessId: "business-trusted",
          businesses: [
            { id: "business-trusted", name: "Empresa Confiável", segment: "Serviços" },
          ],
        }),
        new Date().toISOString(),
      )
      .run();
    const response = await ask(user, {
      prompt: "Crie um plano curto para hoje",
      specialist: "Consultor",
      businessId: "business-trusted",
      business: { name: "Empresa Forjada" },
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.content).toContain("Empresa Confiável");
    expect(payload.content).not.toContain("Empresa Forjada");
  });

  it("recusa contexto de um espaço ao qual o usuário não pertence", async () => {
    const owner = await createUser("ai-context-owner-2");
    const outsider = await createUser("ai-context-outsider-2");
    const response = await ask(outsider, {
      prompt: "Resuma os dados desta empresa",
      workspaceOwnerId: owner.id,
    });
    expect(response.status).toBe(403);
  });
});
