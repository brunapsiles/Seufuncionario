import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";
import { runTodoGreenScheduledWorkAutomations } from "../worker/services/todogreen-work-center.js";

const userId = "tdg-work-automation-owner";
const email = "automacoes@todogreen.test";
const token = "tok-tdg-work-automation-owner";

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const pedir = (path, { method = "GET", body } = {}) => worker.fetch(
  new Request(`https://app.test${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "cf-connecting-ip": "198.51.100.204",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  env,
  { waitUntil() {}, passThroughOnException() {} },
);

beforeAll(async () => {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, 'Gestora de automações', ?, 'h', 's', ?)`,
  ).bind(userId, email, now).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  ).bind(`ses-${userId}`, userId, await sha256(token), now).run();
  await env.DB.prepare(
    `INSERT INTO todogreen_access_emails
     (id, tenant_id, email, role, status, permissions_json, note, created_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, 'admin', 'active', '["work:manage"]', '', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), email, userId, now, now).run();
});

describe("automações configuráveis da Central de Trabalho", () => {
  let boardId;
  let item;
  let rule;

  it("cria uma regra vinculada ao quadro", async () => {
    const initial = await (await pedir("/api/todogreen/work-center")).json();
    boardId = initial.boards[0].id;
    const response = await pedir("/api/todogreen/work-center/automations", {
      method: "POST",
      body: {
        name: "Atribuir espera ao Comercial",
        boardId,
        trigger: "status-changed",
        conditionField: "status",
        conditionOperator: "equals",
        conditionValue: "aguardando",
        actionType: "assign-person",
        actionValue: "Equipe Comercial",
      },
    });
    expect(response.status).toBe(201);
    rule = (await response.json()).automationRule;
    expect(rule).toEqual(expect.objectContaining({ name: "Atribuir espera ao Comercial", enabled: true }));
  });

  it("executa a regra no servidor quando o status muda", async () => {
    const created = await pedir("/api/todogreen/work-center", {
      method: "POST",
      body: { boardId, title: "Preparar proposta", type: "tarefa", priority: "media" },
    });
    item = (await created.json()).item;
    const response = await pedir(`/api/todogreen/work-center/${item.id}`, {
      method: "PATCH",
      body: { status: "aguardando", revision: item.revision },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    item = data.item;
    expect(item.responsible).toBe("Equipe Comercial");
    expect(data.automationsExecuted).toContain("Regra “Atribuir espera ao Comercial” executada.");
  });

  it("permite pausar e deixa de executar", async () => {
    const paused = await pedir(`/api/todogreen/work-center/automations/${rule.id}`, {
      method: "PATCH",
      body: { enabled: false, revision: rule.revision },
    });
    rule = (await paused.json()).automationRule;
    expect(rule.enabled).toBe(false);

    const reset = await pedir(`/api/todogreen/work-center/${item.id}`, {
      method: "PATCH",
      body: { status: "novo", responsible: "", revision: item.revision },
    });
    item = (await reset.json()).item;
    const awaiting = await pedir(`/api/todogreen/work-center/${item.id}`, {
      method: "PATCH",
      body: { status: "aguardando", revision: item.revision },
    });
    const data = await awaiting.json();
    expect(data.item.responsible).toBe("");
    expect(data.automationsExecuted).not.toContain("Regra “Atribuir espera ao Comercial” executada.");
  });

  it("lista e exclui a regra sem expor outro espaço", async () => {
    const listed = await (await pedir("/api/todogreen/work-center/automations")).json();
    expect(listed.automationRules.some((candidate) => candidate.id === rule.id)).toBe(true);
    expect((await pedir(`/api/todogreen/work-center/automations/${rule.id}`, { method: "DELETE" })).status).toBe(200);
    const after = await (await pedir("/api/todogreen/work-center/automations")).json();
    expect(after.automationRules.some((candidate) => candidate.id === rule.id)).toBe(false);
  });

  it("processa prazo vencido pelo cron sem abrir o cartão", async () => {
    const automation = await pedir("/api/todogreen/work-center/automations", {
      method: "POST",
      body: {
        name: "Vencido vira crítico",
        boardId,
        trigger: "date-overdue",
        conditionField: "",
        conditionOperator: "equals",
        conditionValue: "",
        actionType: "change-priority",
        actionValue: "critica",
      },
    });
    expect(automation.status).toBe(201);
    const created = await pedir("/api/todogreen/work-center", {
      method: "POST",
      body: { boardId, title: "Pendência vencida", dueDate: "2026-08-01", priority: "baixa" },
    });
    const overdueItem = (await created.json()).item;
    expect(overdueItem.priority).toBe("alta");

    const run = await runTodoGreenScheduledWorkAutomations(env, new Date("2026-08-12T15:00:00.000Z"));
    expect(run.updated).toBeGreaterThanOrEqual(1);
    const row = await env.DB.prepare("SELECT priority, updated_by FROM todogreen_work_items WHERE id = ?")
      .bind(overdueItem.id).first();
    expect(row.priority).toBe("critica");
    expect(row.updated_by).toBe("system:automation");
  });
});
