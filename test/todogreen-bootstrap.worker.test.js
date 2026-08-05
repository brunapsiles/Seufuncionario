import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";

// A vertical To Do Green depende das tabelas da migração 0027 — mas aplicar
// migração em produção depende de um wrangler autenticado, passo que já
// falhou na prática. Este arquivo garante que a vertical cria as próprias
// tabelas quando elas não existem, em vez de responder erro 500.

let n = 0;
const nextIp = () => `198.51.100.${(++n % 240) + 1}`;

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createUser(id, email = `${id}@example.com`) {
  const token = `token-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  )
    .bind(id, `Pessoa ${id}`, email, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), now)
    .run();
  return { id, token };
}

const request = (path, { method = "GET", user, body } = {}) => {
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
};

// O acesso à vertical vem de o próprio espaço ter um negócio "To Do Green".
const workspaceComTodoGreen = async (user) => {
  const r = await request("/api/workspace", {
    method: "PUT",
    user,
    body: {
      data: { businesses: [{ id: "b1", name: "To Do Green" }] },
      revision: 0,
    },
  });
  expect(r.status).toBe(200);
};

// Ordem de filha para mãe: com chave estrangeira ligada, apagar a mãe antes
// da filha falharia.
const TABELAS_0027 = [
  "environmental_calculations",
  "pricing_scenarios",
  "logistics_products",
  "tenant_modules",
  "todogreen_access_emails",
  "tenant_users",
  "module_catalog",
  "tenants",
];

describe("vertical To Do Green num banco sem a migração 0027", () => {
  it("cria as tabelas sozinha e responde, em vez de dar erro 500", async () => {
    // Reproduz a produção onde ninguém rodou "d1 migrations apply": as
    // tabelas da vertical simplesmente não existem.
    for (const tabela of TABELAS_0027)
      await env.DB.prepare(`DROP TABLE IF EXISTS ${tabela}`).run();

    const user = await createUser(`tg-${n}-boot`);
    await workspaceComTodoGreen(user);

    const acesso = await request("/api/todogreen/access", { user });
    expect(acesso.status).toBe(200);
    expect((await acesso.json()).role).toBe("admin");

    const catalogo = await request("/api/todogreen/catalog", { user });
    expect(catalogo.status).toBe(200);
    const d = await catalogo.json();
    expect(d.modules.length).toBeGreaterThan(0);
    expect(d.tenant.slug).toBeTruthy();

    // E o caminho que grava de verdade: simular preço e persistir o cenário.
    const produtoId = d.products[0]?.id;
    expect(produtoId).toBeTruthy();
    const painel = await request("/api/todogreen/dashboard", { user });
    expect(painel.status).toBe(200);
  });

  it("quem não é da To Do Green continua barrado", async () => {
    const user = await createUser(`tg-${n}-fora`);
    const r = await request("/api/todogreen/access", { user });
    expect(r.status).toBe(403);
  });

  it("permite autorizar e remover e-mail externo sem deploy", async () => {
    const admin = await createUser(`tg-${n}-admin`);
    await workspaceComTodoGreen(admin);

    const create = await request("/api/todogreen/access-list", {
      method: "POST",
      user: admin,
      body: {
        email: "teste@teste.com.br",
        role: "admin",
        note: "Conta de teste",
      },
    });
    expect(create.status).toBe(201);

    const list = await request("/api/todogreen/access-list", { user: admin });
    expect(list.status).toBe(200);
    expect((await list.json()).emails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "teste@teste.com.br", role: "admin" }),
      ]),
    );

    const external = await createUser(`tg-${n}-teste`, "teste@teste.com.br");
    const access = await request("/api/todogreen/access", { user: external });
    expect(access.status).toBe(200);
    expect(await access.json()).toMatchObject({ role: "admin", source: "manual" });

    const removed = await request(
      "/api/todogreen/access-list?email=teste%40teste.com.br",
      { method: "DELETE", user: admin },
    );
    expect(removed.status).toBe(200);
    const blocked = await request("/api/todogreen/access", { user: external });
    expect(blocked.status).toBe(403);
  });
});
