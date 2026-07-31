import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker.js";
import {
  ensureQuota,
  planSnapshot,
  readPlanId,
  readUsage,
  recordUsage,
} from "../worker/services/plan-usage.js";
import {
  DEFAULT_PLAN_ID,
  LAUNCH_MODE,
  LAUNCH_PLAN,
  limitFor,
  periodOf,
} from "../src/features/plans/planDomain.js";

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

describe("plano e cota no servidor", () => {
  it("conta nova já entra com tudo liberado, sem cadastro de plano", async () => {
    const user = await createUser(`pl-${n}-novo`);
    expect(await readPlanId(env, user.id)).toBe(DEFAULT_PLAN_ID);
    expect(LAUNCH_MODE).toBe(true);
  });

  it("id de plano inválido gravado no banco não vira acesso ilimitado", async () => {
    const user = await createUser(`pl-${n}-forjado`);
    await env.DB.prepare(
      "INSERT INTO workspace_plans (owner_id, plan_id, updated_at) VALUES (?, ?, ?)",
    )
      .bind(user.id, "ilimitado_total", new Date().toISOString())
      .run();
    expect(await readPlanId(env, user.id)).toBe(DEFAULT_PLAN_ID);
    // Mesmo em lançamento o teto continua sendo um teto.
    expect(limitFor(DEFAULT_PLAN_ID, "aiPerMonth")).not.toBeNull();
  });

  it("respeita o plano contratado quando ele é válido", async () => {
    const user = await createUser(`pl-${n}-pro`);
    await env.DB.prepare(
      "INSERT INTO workspace_plans (owner_id, plan_id, updated_at) VALUES (?, ?, ?)",
    )
      .bind(user.id, "profissional", new Date().toISOString())
      .run();
    expect(await readPlanId(env, user.id)).toBe("profissional");
  });

  it("soma o consumo no banco, não na memória", async () => {
    const user = await createUser(`pl-${n}-soma`);
    await recordUsage(env, user.id, "aiPerMonth", 1);
    await recordUsage(env, user.id, "aiPerMonth", 4);
    const usage = await readUsage(env, user.id);
    expect(usage.counts.aiPerMonth).toBe(5);
  });

  it("o consumo de um usuário não conta para o outro", async () => {
    const a = await createUser(`pl-${n}-a`);
    const b = await createUser(`pl-${n}-b`);
    await recordUsage(env, a.id, "aiPerMonth", 7);
    expect((await readUsage(env, b.id)).counts.aiPerMonth).toBeUndefined();
  });

  it("consumo do mês passado não pesa no mês atual", async () => {
    const user = await createUser(`pl-${n}-mes`);
    await recordUsage(env, user.id, "aiPerMonth", 100, "2020-01");
    const cota = await ensureQuota(env, user.id, "aiPerMonth", 1);
    expect(cota.allowed).toBe(true);
    expect(cota.used).toBe(0);
  });

  it("o teto anti-abuso barra o laço infinito antes de derrubar a IA de todos", async () => {
    const user = await createUser(`pl-${n}-cheio`);
    await recordUsage(env, user.id, "aiPerMonth", LAUNCH_PLAN.limits.aiPerMonth, periodOf());
    const cota = await ensureQuota(env, user.id, "aiPerMonth", 1);
    expect(cota.allowed).toBe(false);
    expect(cota.limit).toBe(LAUNCH_PLAN.limits.aiPerMonth);
    // Em lançamento não se empurra plano pago.
    expect(cota.suggestion).toBeNull();
  });

  it("medida desconhecida não é gravada", async () => {
    const user = await createUser(`pl-${n}-xpto`);
    await recordUsage(env, user.id, "recurso_inventado", 5);
    const usage = await readUsage(env, user.id);
    expect(usage.counts.recurso_inventado).toBeUndefined();
  });

  it("quantidade inválida não conta", async () => {
    const user = await createUser(`pl-${n}-inv`);
    await recordUsage(env, user.id, "aiPerMonth", -10);
    await recordUsage(env, user.id, "aiPerMonth", "abacaxi");
    expect((await readUsage(env, user.id)).counts.aiPerMonth).toBeUndefined();
  });

  it("o retrato do plano traz uso, limite e sugestão", async () => {
    const user = await createUser(`pl-${n}-snap`);
    await recordUsage(env, user.id, "aiPerMonth", 95, periodOf());
    const snap = await planSnapshot(env, user.id);
    expect(snap.plan.id).toBe(DEFAULT_PLAN_ID);
    const ia = snap.usage.find((x) => x.metric === "aiPerMonth");
    expect(ia.used).toBe(95);
    expect(ia.limit).toBe(LAUNCH_PLAN.limits.aiPerMonth);
    expect(ia.status).toBe("ok"); // 95 de 5000 é folga enorme
    expect(snap.suggestion).toBeNull();
  });

  it("/api/plan devolve o retrato para quem está logado", async () => {
    const user = await createUser(`pl-${n}-api`);
    const res = await request("/api/plan", { user });
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.plan.name).toBe(LAUNCH_PLAN.name);
    expect(dados.plan.price).toBe(0);
    expect(Array.isArray(dados.usage)).toBe(true);
  });

  it("/api/plan exige estar logado", async () => {
    const res = await request("/api/plan");
    expect(res.status).toBe(401);
  });

  it("a IA é recusada com explicação quando a cota acabou", async () => {
    const user = await createUser(`pl-${n}-ia`);
    await recordUsage(env, user.id, "aiPerMonth", LAUNCH_PLAN.limits.aiPerMonth, periodOf());
    const res = await request("/api/ai", {
      method: "POST",
      user,
      body: { prompt: "Me ajude a organizar a semana toda com calma" },
    });
    expect(res.status).toBe(402);
    const dados = await res.json();
    expect(dados.code).toBe("QUOTA_EXCEEDED");
    expect(dados.error).toContain(String(LAUNCH_PLAN.limits.aiPerMonth));
  });

  it("o streaming não é um caminho paralelo para furar a cota", async () => {
    const user = await createUser(`pl-${n}-stream`);
    await recordUsage(env, user.id, "aiPerMonth", LAUNCH_PLAN.limits.aiPerMonth, periodOf());
    const res = await request("/api/ai/stream", {
      method: "POST",
      user,
      body: { prompt: "Me ajude a organizar a semana toda com calma" },
    });
    // 402 quando a cota barra; 503 quando o provedor de streaming nem existe
    // no ambiente de teste. O que não pode é passar direto com 200.
    expect([402, 503]).toContain(res.status);
  });

  it("dentro da cota, a IA não é barrada pelo plano", async () => {
    const user = await createUser(`pl-${n}-ok`);
    const res = await request("/api/ai", {
      method: "POST",
      user,
      body: { prompt: "Me ajude a organizar a semana toda com calma" },
    });
    expect(res.status).not.toBe(402);
  });
});
