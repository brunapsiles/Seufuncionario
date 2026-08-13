import { TENANT_ID, podeNaVertical, recorteDeCarteira } from "./todogreen-access.js";
import { comparePricingToActual, pricingLearning } from "../../src/features/logistics/pricingPerformanceDomain.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const num = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const parse = (value, fallback) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const scenarioFromRow = (row) => ({ id: row.id, productId: row.product_id, clientId: row.client_id, result: parse(row.result_json, {}) });
const actualFromRow = (row) => ({ id: row.id, scenarioId: row.scenario_id, clientId: row.client_id, referenceMonth: row.reference_month, actualRevenue: row.actual_revenue, actualCost: row.actual_cost, actualTrips: row.actual_trips, actualDistanceKm: row.actual_distance_km, actualCo2Kg: row.actual_co2_kg, source: row.source, notes: row.notes, revision: row.revision, updatedAt: row.updated_at });

export async function handleTodoGreenPricingPerformance(request, env, access, user) {
  if (!env.DB) return json({ error: "Banco indisponível." }, 503);
  const scope = recorteDeCarteira(access, user.email, "s", "client_id");
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT s.*,a.id AS actual_id,a.scenario_id,a.reference_month,a.actual_revenue,a.actual_cost,a.actual_trips,a.actual_distance_km,a.actual_co2_kg,a.source,a.notes,a.revision,a.updated_at
         FROM pricing_scenarios s
         LEFT JOIN todogreen_pricing_actuals a ON a.scenario_id=s.id AND a.workspace_owner_id=s.workspace_owner_id
        WHERE s.tenant_id=? AND s.workspace_owner_id=? ${scope.sql}
        ORDER BY COALESCE(a.reference_month,s.created_at) DESC LIMIT 300`,
    ).bind(TENANT_ID, access.ownerId, ...scope.params).all();
    const scenarios = [];
    const actuals = [];
    for (const row of results || []) {
      if (!scenarios.some((item) => item.id === row.id)) scenarios.push(scenarioFromRow(row));
      if (row.actual_id) actuals.push(actualFromRow({ ...row, id: row.actual_id }));
    }
    const comparisons = actuals.map((actual) => comparePricingToActual({ scenario: scenarios.find((item) => item.id === actual.scenarioId), actual }));
    return json({ scenarios, actuals, comparisons, learning: pricingLearning(comparisons) });
  }
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!podeNaVertical(access, "pricing:manage")) return json({ error: "Seu papel não pode registrar o realizado." }, 403);
  const body = await request.json().catch(() => ({}));
  const scenarioId = text(body.scenarioId, 120);
  const referenceMonth = text(body.referenceMonth, 7);
  if (!scenarioId || !validMonth(referenceMonth)) return json({ error: "Informe a simulação e o mês de referência." }, 400);
  const scenario = await env.DB.prepare(
    `SELECT s.id,s.client_id FROM pricing_scenarios s WHERE s.id=? AND s.tenant_id=? AND s.workspace_owner_id=? ${scope.sql}`,
  ).bind(scenarioId, TENANT_ID, access.ownerId, ...scope.params).first();
  if (!scenario) return json({ error: "Simulação não encontrada na sua carteira." }, 404);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO todogreen_pricing_actuals (id,tenant_id,workspace_owner_id,scenario_id,client_id,reference_month,actual_revenue,actual_cost,actual_trips,actual_distance_km,actual_co2_kg,source,notes,revision,created_by,updated_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)
     ON CONFLICT(workspace_owner_id,scenario_id,reference_month) DO UPDATE SET actual_revenue=excluded.actual_revenue,actual_cost=excluded.actual_cost,actual_trips=excluded.actual_trips,actual_distance_km=excluded.actual_distance_km,actual_co2_kg=excluded.actual_co2_kg,source=excluded.source,notes=excluded.notes,revision=todogreen_pricing_actuals.revision+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
  ).bind(id,TENANT_ID,access.ownerId,scenarioId,scenario.client_id,referenceMonth,num(body.actualRevenue),num(body.actualCost),num(body.actualTrips),num(body.actualDistanceKm),num(body.actualCo2Kg),text(body.source,80)||"manual",text(body.notes,1000),user.id,user.id,now,now).run();
  return json({ ok: true }, 201);
}
