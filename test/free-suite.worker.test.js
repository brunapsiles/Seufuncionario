import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";
import { appFromPrompt } from "../src/features/free-suite/freeSuiteDomain.js";

let requestNumber = 0;
const nextIp = () => `203.0.113.${(++requestNumber % 240) + 1}`;

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
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  )
    .bind(id, `Pessoa ${id}`, `${id}@example.com`, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO sessions
      (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  )
    .bind(`session-${id}`, id, await sha256(token), now)
    .run();
  return { id, token };
}

async function seedWorkspace(ownerId, data) {
  await env.DB.prepare(
    `INSERT INTO workspaces (user_id, data, updated_at, revision)
     VALUES (?, ?, ?, 0)`,
  )
    .bind(ownerId, JSON.stringify(data), new Date().toISOString())
    .run();
}

function request(
  path,
  { method = "GET", user, apiKey, body, idempotencyKey } = {},
) {
  const headers = { "cf-connecting-ip": nextIp() };
  if (user) headers.authorization = `Bearer ${user.token}`;
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
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

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

describe("suíte gratuita no servidor", () => {
  it("salva aplicativos declarativos por espaço e remove blocos executáveis", async () => {
    const owner = await createUser("suite-app-owner");
    await seedWorkspace(owner.id, {});
    const schema = appFromPrompt("site com formulário", "Oficina");
    schema.blocks.push({ id: "bad", type: "script", text: "alert(1)" });

    const created = await readJson(
      await request("/api/free-suite/apps", {
        method: "POST",
        user: owner,
        body: { ownerId: owner.id, name: "App Oficina", schema },
      }),
    );
    expect(created.status).toBe(201);
    expect(created.body.app.schema.blocks.some((block) => block.type === "script")).toBe(false);

    const listed = await readJson(
      await request(`/api/free-suite/apps?owner=${owner.id}`, { user: owner }),
    );
    expect(listed.status).toBe(200);
    expect(listed.body.apps).toHaveLength(1);
  });

  it("modera templates e publica somente payload declarativo com licença permitida", async () => {
    const owner = await createUser("suite-market-owner");
    await seedWorkspace(owner.id, {});
    const rejected = await readJson(
      await request("/api/free-suite/marketplace", {
        method: "POST",
        user: owner,
        body: {
          ownerId: owner.id,
          name: "Template perigoso",
          description: "<script>roubar()</script>",
          license: "proprietária",
          schema: appFromPrompt("site", "Perigo"),
        },
      }),
    );
    expect(rejected.status).toBe(422);
    expect(rejected.body.moderation.approved).toBe(false);

    const approved = await readJson(
      await request("/api/free-suite/marketplace", {
        method: "POST",
        user: owner,
        body: {
          ownerId: owner.id,
          name: "Captação simples",
          description: "Página para receber contatos.",
          license: "CC0-1.0",
          schema: appFromPrompt("site com formulário", "Captação"),
        },
      }),
    );
    expect(approved.status).toBe(201);
    expect(approved.body.template.status).toBe("approved");
  });

  it("mostra a chave somente na criação, aceita leitura e respeita revogação", async () => {
    const owner = await createUser("suite-key-owner");
    await seedWorkspace(owner.id, {
      tasks: [{ id: "task-1", title: "Visível", ownerId: owner.id }],
    });
    const created = await readJson(
      await request("/api/free-suite/api-keys", {
        method: "POST",
        user: owner,
        body: { ownerId: owner.id, name: "Teste", scope: "read" },
      }),
    );
    expect(created.status).toBe(201);
    expect(created.body.key).toMatch(/^sf_live_/);

    const listed = await readJson(
      await request(`/api/free-suite/api-keys?owner=${owner.id}`, { user: owner }),
    );
    expect(listed.status).toBe(200);
    expect(listed.body.keys[0].key).toBeUndefined();
    expect(listed.body.keys[0].keyPrefix).toBe(created.body.keyPrefix);

    const tasks = await readJson(
      await request("/api/public/v1/tasks", { apiKey: created.body.key }),
    );
    expect(tasks.status).toBe(200);
    expect(tasks.body.data[0]).toEqual(
      expect.objectContaining({ id: "task-1", title: "Visível" }),
    );
    expect(tasks.body.data[0].ownerId).toBeUndefined();

    const revoked = await readJson(
      await request(`/api/free-suite/api-keys/${created.body.id}`, {
        method: "DELETE",
        user: owner,
        body: { ownerId: owner.id },
      }),
    );
    expect(revoked.status).toBe(200);
    expect(
      (
        await readJson(
          await request("/api/public/v1/tasks", { apiKey: created.body.key }),
        )
      ).status,
    ).toBe(401);
  });

  it("cria tarefas sem duplicar a mesma chave de idempotência", async () => {
    const owner = await createUser("suite-write-owner");
    await seedWorkspace(owner.id, { tasks: [] });
    const keyResponse = await readJson(
      await request("/api/free-suite/api-keys", {
        method: "POST",
        user: owner,
        body: { ownerId: owner.id, name: "Escrita", scope: "read-write" },
      }),
    );
    const createTask = () =>
      request("/api/public/v1/tasks", {
        method: "POST",
        apiKey: keyResponse.body.key,
        idempotencyKey: "pedido-123",
        body: { title: "Tarefa integrada", priority: "alta" },
      });
    const first = await readJson(await createTask());
    const second = await readJson(await createTask());
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);

    const workspace = await env.DB.prepare(
      "SELECT data FROM workspaces WHERE user_id = ?",
    )
      .bind(owner.id)
      .first();
    expect(JSON.parse(workspace.data).tasks).toHaveLength(1);
  });

  it("expõe documentação sem chave e bloqueia escrita com chave de leitura", async () => {
    const owner = await createUser("suite-doc-owner");
    await seedWorkspace(owner.id, { contacts: [] });
    const docs = await readJson(await request("/api/public/v1/openapi.json"));
    expect(docs.status).toBe(200);
    expect(docs.body.openapi).toBe("3.1.0");
    expect(docs.body.paths["/api/public/v1/tasks"]).toBeTruthy();

    const keyResponse = await readJson(
      await request("/api/free-suite/api-keys", {
        method: "POST",
        user: owner,
        body: { ownerId: owner.id, name: "Leitura", scope: "read" },
      }),
    );
    const forbidden = await readJson(
      await request("/api/public/v1/contacts", {
        method: "POST",
        apiKey: keyResponse.body.key,
        idempotencyKey: "contact-1",
        body: { name: "Cliente" },
      }),
    );
    expect(forbidden.status).toBe(403);
  });
});
