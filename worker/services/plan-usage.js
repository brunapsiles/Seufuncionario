// ===== Cota por conta, valendo no servidor =====
// Limite que só existe na tela não protege nada: qualquer pessoa contorna
// mexendo no navegador. A checagem que vale é esta, antes de gastar recurso.

import {
  METRICS,
  checkQuota,
  periodOf,
  planById,
  usageSummary,
  upgradeSuggestion,
} from "../../src/features/plans/planDomain.js";

export { periodOf };

export async function readPlanId(env, ownerId) {
  if (!ownerId) return "gratuito";
  try {
    const row = await env.DB.prepare(
      "SELECT plan_id FROM workspace_plans WHERE owner_id = ?",
    )
      .bind(ownerId)
      .first();
    // planById já derruba id desconhecido para o gratuito.
    return planById(row?.plan_id).id;
  } catch {
    // Banco indisponível não pode virar acesso ilimitado.
    return "gratuito";
  }
}

export async function readUsage(env, ownerId, period) {
  const p = period || periodOf();
  const vazio = { period: p, counts: {} };
  if (!ownerId) return vazio;
  try {
    const { results } = await env.DB.prepare(
      "SELECT metric, used FROM workspace_usage WHERE owner_id = ? AND period_key = ?",
    )
      .bind(ownerId, p)
      .all();
    const counts = {};
    for (const row of results || []) {
      if (METRICS[row.metric]) counts[row.metric] = Number(row.used) || 0;
    }
    return { period: p, counts };
  } catch {
    return vazio;
  }
}

// Soma no banco, não na memória: duas abas abertas ao mesmo tempo precisam
// contar as duas. O UPSERT resolve a corrida sem transação.
export async function recordUsage(env, ownerId, metric, quantity = 1, period) {
  if (!ownerId || !METRICS[metric]) return;
  const q = Math.floor(Number(quantity) || 0);
  if (q <= 0) return;
  const p = period || periodOf();
  const agora = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO workspace_usage (owner_id, period_key, metric, used, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(owner_id, period_key, metric)
       DO UPDATE SET used = used + excluded.used, updated_at = excluded.updated_at`,
    )
      .bind(ownerId, p, metric, q, agora)
      .run();
  } catch {
    // Falhar ao contabilizar não pode derrubar o pedido da titular. O risco
    // aceito aqui é contar a menos, nunca cobrar a mais nem travar o app.
  }
}

// Devolve { allowed, status, message } pronto para virar resposta HTTP.
export async function ensureQuota(env, ownerId, metric, quantity = 1) {
  const period = periodOf();
  const [planId, usage] = await Promise.all([
    readPlanId(env, ownerId),
    readUsage(env, ownerId, period),
  ]);
  const plan = planById(planId);
  const check = checkQuota(plan, usage, metric, quantity, period);
  const sugestao = check.allowed ? null : upgradeSuggestion(plan, usage, period);
  return {
    ...check,
    planId: plan.id,
    planName: plan.name,
    period,
    suggestion: sugestao
      ? { planId: sugestao.plan.id, planName: sugestao.plan.name }
      : null,
  };
}

export async function planSnapshot(env, ownerId) {
  const period = periodOf();
  const [planId, usage] = await Promise.all([
    readPlanId(env, ownerId),
    readUsage(env, ownerId, period),
  ]);
  const plan = planById(planId);
  const sugestao = upgradeSuggestion(plan, usage, period);
  return {
    plan: { id: plan.id, name: plan.name, price: plan.price, pitch: plan.pitch },
    period,
    usage: usageSummary(plan, usage, period),
    suggestion: sugestao
      ? {
          planId: sugestao.plan.id,
          planName: sugestao.plan.name,
          price: sugestao.plan.price,
          solves: sugestao.solves,
        }
      : null,
  };
}

export function quotaResponse(check) {
  return {
    error: check.message || "Você atingiu o limite do seu plano.",
    code: "QUOTA_EXCEEDED",
    metric: check.metric,
    used: check.used,
    limit: check.limit,
    planName: check.planName,
    suggestion: check.suggestion,
  };
}
