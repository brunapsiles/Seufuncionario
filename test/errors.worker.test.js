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

  it("recusa métodos diferentes de POST", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/api/errors", {
        method: "GET",
        headers: { "cf-connecting-ip": "203.0.113.12" },
      }),
      env,
    );
    expect(response.status).toBe(405);
  });
});
