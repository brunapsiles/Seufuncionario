import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

let requestNumber = 0;
const nextIp = () => {
  requestNumber += 1;
  return `203.0.113.${(requestNumber % 250) + 1}`;
};

async function createOwnerWithProducts(id, products) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users
      (id, name, email, password_hash, password_salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, `Loja ${id}`, `${id}@example.com`, "hash", "salt", now)
    .run();
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision)
    VALUES (?, ?, ?, 0)`,
  )
    .bind(id, JSON.stringify({ products }), now)
    .run();
  return id;
}

async function publishSite(slug, ownerId) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO public_sites
      (id, owner_id, slug, name, description, html, pages_json, published, created_at, updated_at)
    VALUES (?, ?, ?, 'Loja de teste', '', '<html><body></body></html>', '[]', 1, ?, ?)`,
  )
    .bind(`site-${slug}`, ownerId, slug, now, now)
    .run();
}

describe("loja virtual (carrinho/checkout) com D1 local", () => {
  it("retorna 404 para uma loja com slug inexistente", async () => {
    const response = await worker.fetch(
      new Request("https://app.test/loja/nao-existe", {
        headers: { "cf-connecting-ip": nextIp() },
      }),
      env,
    );
    expect(response.status).toBe(404);
  });

  it("lista produtos em estoque e variações, sem itens zerados", async () => {
    const owner = await createOwnerWithProducts("store-owner-1", [
      { id: "p1", name: "Caneca", price: 30, stock: 5 },
      { id: "p2", name: "Esgotado", price: 10, stock: 0 },
      {
        id: "p3",
        name: "Camiseta",
        price: 0,
        stock: 0,
        variants: [
          { id: "v1", name: "P", price: 50, stock: 2 },
          { id: "v2", name: "M", price: 55, stock: 0 },
        ],
      },
    ]);
    await publishSite("loja-1", owner);

    const response = await worker.fetch(
      new Request("https://app.test/loja/loja-1", {
        headers: { "cf-connecting-ip": nextIp() },
      }),
      env,
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Caneca");
    expect(html).toContain("Camiseta");
    expect(html).toContain('"name":"P"');
    expect(html).not.toContain("Esgotado");
    expect(html).not.toContain('"name":"M"');
  });

  it("finaliza um pedido válido e registra como lead do site", async () => {
    const owner = await createOwnerWithProducts("store-owner-2", [
      { id: "p1", name: "Caneca", price: 30, stock: 5 },
    ]);
    await publishSite("loja-2", owner);

    const response = await worker.fetch(
      new Request("https://app.test/api/public-sites/loja-2/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": nextIp(),
        },
        body: JSON.stringify({
          name: "Cliente Teste",
          phone: "(11) 90000-0000",
          items: [{ productId: "p1", quantity: 2 }],
        }),
      }),
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const lead = await env.DB.prepare(
      "SELECT name, phone, message, owner_id FROM public_site_leads WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1",
    )
      .bind(owner)
      .first();
    expect(lead.name).toBe("Cliente Teste");
    expect(lead.message).toContain("2x Caneca");
    expect(lead.message).toContain("60,00");
  });

  it("recusa pedido com estoque insuficiente sem criar lead", async () => {
    const owner = await createOwnerWithProducts("store-owner-3", [
      { id: "p1", name: "Caneca", price: 30, stock: 1 },
    ]);
    await publishSite("loja-3", owner);

    const response = await worker.fetch(
      new Request("https://app.test/api/public-sites/loja-3/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": nextIp(),
        },
        body: JSON.stringify({
          name: "Cliente Teste",
          phone: "(11) 90000-0000",
          items: [{ productId: "p1", quantity: 5 }],
        }),
      }),
      env,
    );
    expect(response.status).toBe(409);
    const lead = await env.DB.prepare(
      "SELECT id FROM public_site_leads WHERE owner_id = ?",
    )
      .bind(owner)
      .first();
    expect(lead).toBeNull();
  });

  it("recusa pedido com produto inexistente", async () => {
    const owner = await createOwnerWithProducts("store-owner-4", [
      { id: "p1", name: "Caneca", price: 30, stock: 5 },
    ]);
    await publishSite("loja-4", owner);

    const response = await worker.fetch(
      new Request("https://app.test/api/public-sites/loja-4/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": nextIp(),
        },
        body: JSON.stringify({
          name: "Cliente Teste",
          phone: "(11) 90000-0000",
          items: [{ productId: "produto-fantasma", quantity: 1 }],
        }),
      }),
      env,
    );
    expect(response.status).toBe(400);
  });

  it("recusa carrinho vazio e falta de contato", async () => {
    const owner = await createOwnerWithProducts("store-owner-5", [
      { id: "p1", name: "Caneca", price: 30, stock: 5 },
    ]);
    await publishSite("loja-5", owner);

    const emptyCart = await worker.fetch(
      new Request("https://app.test/api/public-sites/loja-5/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": nextIp(),
        },
        body: JSON.stringify({
          name: "Cliente Teste",
          phone: "(11) 90000-0000",
          items: [],
        }),
      }),
      env,
    );
    expect(emptyCart.status).toBe(400);

    const noContact = await worker.fetch(
      new Request("https://app.test/api/public-sites/loja-5/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": nextIp(),
        },
        body: JSON.stringify({
          name: "Cliente Teste",
          items: [{ productId: "p1", quantity: 1 }],
        }),
      }),
      env,
    );
    expect(noContact.status).toBe(400);
  });
});
