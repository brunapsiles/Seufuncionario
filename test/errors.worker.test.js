import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

describe("/api/errors com D1 local", () => {
  it("registra um erro relatado pelo cliente sem exigir login", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.10",
        },
        body: JSON.stringify({
          message: "Erro de teste",
          stack: "Error: Erro de teste\n  at Component",
          url: "https://app.test/pagina",
        }),
      }),
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const row = await env.DB.prepare(
      "SELECT message, url, user_id FROM error_logs ORDER BY created_at DESC LIMIT 1",
    ).first();
    expect(row.message).toBe("Erro de teste");
    expect(row.url).toBe("https://app.test/pagina");
    expect(row.user_id).toBeNull();
  });

  it("recusa mensagens vazias", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.11",
        },
        body: JSON.stringify({ message: "" }),
      }),
      env,
    );
    expect(response.status).toBe(400);
  });

  it("recusa métodos que não sejam GET ou POST", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "PUT",
        headers: { "cf-connecting-ip": "203.0.113.12" },
      }),
      env,
    );
    expect(response.status).toBe(405);
  });

  it("exige login para consultar os erros e devolve só os do próprio usuário", async () => {
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

    const anonymous = await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "GET",
        headers: { "cf-connecting-ip": "203.0.113.13" },
      }),
      env,
    );
    expect(anonymous.status).toBe(401);

    const userA = await createUser("err-user-a");
    const userB = await createUser("err-user-b");

    await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.14",
          authorization: `Bearer ${userA.token}`,
        },
        body: JSON.stringify({ message: "Erro exclusivo de A" }),
      }),
      env,
    );
    await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.15",
          authorization: `Bearer ${userB.token}`,
        },
        body: JSON.stringify({ message: "Erro exclusivo de B" }),
      }),
      env,
    );

    const viewA = await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "GET",
        headers: {
          "cf-connecting-ip": "203.0.113.16",
          authorization: `Bearer ${userA.token}`,
        },
      }),
      env,
    );
    expect(viewA.status).toBe(200);
    const bodyA = await viewA.json();
    const messagesA = bodyA.logs.map((l) => l.message);
    expect(messagesA).toContain("Erro exclusivo de A");
    expect(messagesA).not.toContain("Erro exclusivo de B");
  });
});
