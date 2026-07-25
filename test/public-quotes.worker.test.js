import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let n = 0;
const nextIp = () => `203.0.113.${(++n % 250) + 1}`;

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createUser(id) {
  const token = `token-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, "h", "s", now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(`s-${id}`, id, await sha256(token), "2099-01-01T00:00:00.000Z", now)
    .run();
  return { id, token };
}

const readJson = async (r) => ({ status: r.status, body: await r.json() });

describe("link público de orçamento", () => {
  const quote = {
    id: "q-pub-1",
    clientName: "Cliente Teste",
    items: [{ name: "Lavagem", quantity: 2, price: 45 }],
    total: 90,
    validUntil: "2026-08-10",
    notes: "Retirada no balcão",
  };

  async function share(owner) {
    return worker.fetch(
      new Request("https://app.test/api/quotes/share", {
        method: "POST",
        headers: {
          authorization: `Bearer ${owner.token}`,
          "content-type": "application/json",
          "cf-connecting-ip": nextIp(),
        },
        body: JSON.stringify({ quote, businessName: "Lavanderia Santa Fé" }),
      }),
      env,
    );
  }

  it("compartilha, renetiza a página pública e o cliente aprova (idempotente)", async () => {
    const owner = await createUser("pq-owner-1");
    const shared = await readJson(await share(owner));
    expect(shared.status).toBe(200);
    expect(shared.body.token).toMatch(/^[a-f0-9]{16,}$/);
    const token = shared.body.token;

    // página pública renderiza
    const page = await worker.fetch(
      new Request(`https://app.test/orcamento/${token}`, {
        headers: { "cf-connecting-ip": nextIp() },
      }),
      env,
    );
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("Cliente Teste");
    expect(html).toContain("Lavagem");

    // cliente aprova (JSON)
    const decide = await readJson(
      await worker.fetch(
        new Request(`https://app.test/api/public-quotes/${token}/decision`, {
          method: "POST",
          headers: { "content-type": "application/json", "cf-connecting-ip": nextIp() },
          body: JSON.stringify({ decision: "aprovado" }),
        }),
        env,
      ),
    );
    expect(decide.status).toBe(200);
    expect(decide.body.status).toBe("aprovado");

    // segunda decisão não sobrescreve (já respondido)
    const second = await readJson(
      await worker.fetch(
        new Request(`https://app.test/api/public-quotes/${token}/decision`, {
          method: "POST",
          headers: { "content-type": "application/json", "cf-connecting-ip": nextIp() },
          body: JSON.stringify({ decision: "recusado" }),
        }),
        env,
      ),
    );
    expect(second.body.status).toBe("aprovado");

    // o dono vê o status pelo endpoint autenticado
    const status = await readJson(
      await worker.fetch(
        new Request("https://app.test/api/quotes/status", {
          headers: { authorization: `Bearer ${owner.token}`, "cf-connecting-ip": nextIp() },
        }),
        env,
      ),
    );
    const row = status.body.items.find((i) => i.quoteId === "q-pub-1");
    expect(row.status).toBe("aprovado");
  });

  it("token desconhecido devolve 404", async () => {
    const page = await worker.fetch(
      new Request("https://app.test/orcamento/deadbeefdeadbeef00", {
        headers: { "cf-connecting-ip": nextIp() },
      }),
      env,
    );
    expect(page.status).toBe(404);
  });

  it("recompartilhar o mesmo orçamento reaproveita o token", async () => {
    const owner = await createUser("pq-owner-2");
    const a = await readJson(await share(owner));
    const b = await readJson(await share(owner));
    expect(a.body.token).toBe(b.body.token);
  });
});
