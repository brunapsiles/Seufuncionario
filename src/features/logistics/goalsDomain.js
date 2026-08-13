const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const isoDay = (value) => String(value || "").slice(0, 10);
const daysBetween = (from, to) => {
  const start = new Date(`${isoDay(from)}T00:00:00.000Z`).getTime();
  const end = new Date(`${isoDay(to)}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
};

export const GOAL_CATEGORIES = Object.freeze([
  { id: "commercial", label: "Comercial" },
  { id: "financial", label: "Financeiro" },
  { id: "operational", label: "Operacional" },
  { id: "esg", label: "ESG" },
  { id: "management", label: "Gestão" },
]);

export const GOAL_SCOPES = Object.freeze([
  { id: "company", label: "Empresa" },
  { id: "area", label: "Área" },
  { id: "team", label: "Equipe" },
  { id: "person", label: "Pessoa" },
  { id: "seller", label: "Vendedor" },
  { id: "client", label: "Cliente" },
  { id: "contract", label: "Contrato" },
  { id: "product", label: "Produto logístico" },
  { id: "operation", label: "Operação" },
  { id: "route", label: "Rota" },
  { id: "fleet", label: "Frota" },
  { id: "project", label: "Projeto" },
]);

export const GOAL_DIRECTIONS = Object.freeze([
  { id: "increase", label: "Quanto maior, melhor" },
  { id: "decrease", label: "Quanto menor, melhor" },
  { id: "range", label: "Manter dentro de uma faixa" },
]);

export const GOAL_CADENCES = Object.freeze([
  { id: "weekly", label: "Semanal" },
  { id: "biweekly", label: "Quinzenal" },
  { id: "monthly", label: "Mensal" },
  { id: "quarterly", label: "Trimestral" },
  { id: "annual", label: "Anual" },
  { id: "custom", label: "Personalizada" },
]);

export const GOAL_UNITS = Object.freeze([
  { id: "number", label: "Número" },
  { id: "currency", label: "Real (R$)" },
  { id: "percent", label: "Percentual" },
  { id: "distance", label: "Quilômetros" },
  { id: "mass", label: "CO₂e" },
  { id: "score", label: "Pontuação" },
  { id: "days", label: "Dias" },
  { id: "hours", label: "Horas" },
]);

export const GOAL_SOURCES = Object.freeze([
  { id: "manual", label: "Check-in manual", mode: "manual" },
  { id: "financial.revenue", label: "Receitas confirmadas", mode: "automatic" },
  { id: "financial.cost", label: "Custos confirmados", mode: "automatic" },
  { id: "financial.margin", label: "Margem financeira", mode: "automatic" },
  { id: "opportunities.pipeline", label: "Valor do pipeline", mode: "automatic" },
  { id: "opportunities.count", label: "Quantidade de oportunidades", mode: "automatic" },
  { id: "proposals.count", label: "Quantidade de propostas", mode: "automatic" },
  { id: "clients.count", label: "Novos clientes", mode: "automatic" },
  { id: "operations.trips", label: "Viagens realizadas", mode: "automatic" },
  { id: "operations.deliveries", label: "Entregas realizadas", mode: "automatic" },
  { id: "operations.packages", label: "Pacotes transportados", mode: "automatic" },
  { id: "operations.distance", label: "Distância percorrida", mode: "automatic" },
  { id: "operations.occupancy", label: "Ocupação média", mode: "automatic" },
  { id: "esg.co2_avoided", label: "CO₂ evitado", mode: "automatic" },
  { id: "esg.green_score", label: "Green Score", mode: "automatic" },
]);

export const GOAL_METRICS = Object.freeze([
  { id: "manual", label: "Indicador manual", category: "management", unit: "number", source: "manual" },
  { id: "revenue", label: "Receita realizada", category: "financial", unit: "currency", source: "financial.revenue" },
  { id: "cost", label: "Custos realizados", category: "financial", unit: "currency", source: "financial.cost", direction: "decrease" },
  { id: "margin", label: "Margem de contribuição", category: "financial", unit: "percent", source: "financial.margin" },
  { id: "pipeline", label: "Pipeline comercial", category: "commercial", unit: "currency", source: "opportunities.pipeline" },
  { id: "opportunities", label: "Oportunidades criadas", category: "commercial", unit: "number", source: "opportunities.count" },
  { id: "proposals", label: "Propostas criadas", category: "commercial", unit: "number", source: "proposals.count" },
  { id: "clients", label: "Novos clientes", category: "commercial", unit: "number", source: "clients.count" },
  { id: "trips", label: "Viagens realizadas", category: "operational", unit: "number", source: "operations.trips" },
  { id: "deliveries", label: "Entregas realizadas", category: "operational", unit: "number", source: "operations.deliveries" },
  { id: "packages", label: "Pacotes transportados", category: "operational", unit: "number", source: "operations.packages" },
  { id: "distance", label: "Quilômetros rodados", category: "operational", unit: "distance", source: "operations.distance" },
  { id: "occupancy", label: "Ocupação média", category: "operational", unit: "percent", source: "operations.occupancy" },
  { id: "co2_avoided", label: "CO₂ evitado", category: "esg", unit: "mass", source: "esg.co2_avoided" },
  { id: "green_score", label: "Green Score", category: "esg", unit: "score", source: "esg.green_score" },
]);

export const goalMetric = (metricKey, metrics = GOAL_METRICS) => metrics.find((item) => item.id === metricKey) || GOAL_METRICS[0];

export const normalizeGoalCriteria = (criteria = []) => (Array.isArray(criteria) ? criteria : [])
  .slice(0, 12)
  .map((item, index) => ({
    id: String(item?.id || `criterion-${index + 1}`).slice(0, 80),
    label: String(item?.label || "").trim().slice(0, 120),
    description: String(item?.description || "").trim().slice(0, 300),
    operator: ["gte", "lte", "between"].includes(item?.operator) ? item.operator : "gte",
    value: finite(item?.value),
    max: item?.operator === "between" ? finite(item?.max) : null,
    status: ["achieved", "on_track", "attention", "critical"].includes(item?.status) ? item.status : "on_track",
  }))
  .filter((item) => item.label);

export const formatGoalValue = (value, unit = "number") => {
  const number = finite(value);
  if (unit === "currency") return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (unit === "percent") return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (unit === "mass") return `${(number / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} tCO₂e`;
  if (unit === "distance") return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`;
  if (unit === "score") return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} / 100`;
  return number.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
};

export const goalAttainment = ({ direction = "increase", baselineValue = 0, targetValue = 0, currentValue = 0, rangeMin, rangeMax }) => {
  const baseline = finite(baselineValue);
  const target = finite(targetValue);
  const current = finite(currentValue);
  if (direction === "range") {
    const min = finite(rangeMin, Number.NEGATIVE_INFINITY);
    const max = finite(rangeMax, Number.POSITIVE_INFINITY);
    if (current >= min && current <= max) return 1;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return 0;
    const distance = current < min ? min - current : current - max;
    return clamp(1 - distance / Math.abs(max - min), 0, 1);
  }
  const denominator = direction === "decrease" ? baseline - target : target - baseline;
  if (denominator === 0) return current === target ? 1 : 0;
  const progress = direction === "decrease" ? baseline - current : current - baseline;
  return Math.max(0, progress / denominator);
};

export const goalRemaining = ({ direction = "increase", targetValue = 0, currentValue = 0, rangeMin, rangeMax }) => {
  const target = finite(targetValue);
  const current = finite(currentValue);
  if (direction === "decrease") return Math.max(0, current - target);
  if (direction === "range") {
    const min = finite(rangeMin);
    const max = finite(rangeMax);
    if (current < min) return min - current;
    if (current > max) return current - max;
    return 0;
  }
  return Math.max(0, target - current);
};

export const goalProgress = (goal, now = new Date()) => {
  const start = isoDay(goal.periodStart || goal.period_start);
  const end = isoDay(goal.periodEnd || goal.period_end);
  const today = isoDay(now instanceof Date ? now.toISOString() : now);
  const totalDays = Math.max(1, daysBetween(start, end));
  const elapsedDays = today <= start ? 0 : today >= end ? totalDays : daysBetween(start, today);
  const elapsedRatio = clamp(elapsedDays / totalDays);
  const attainmentRatio = goalAttainment({
    direction: goal.direction,
    baselineValue: goal.baselineValue ?? goal.baseline_value,
    targetValue: goal.targetValue ?? goal.target_value,
    currentValue: goal.currentValue ?? goal.current_value,
    rangeMin: goal.rangeMin ?? goal.range_min,
    rangeMax: goal.rangeMax ?? goal.range_max,
  });
  const status = goal.status || "draft";
  let healthStatus = "not_started";
  if (status === "blocked") healthStatus = "blocked";
  else if (["closed", "cancelled"].includes(status)) healthStatus = "closed";
  else if (attainmentRatio > 1.0001) healthStatus = "exceeded";
  else if (attainmentRatio >= 1) healthStatus = "achieved";
  else if (elapsedRatio === 0) healthStatus = "not_started";
  else {
    const paceRatio = attainmentRatio / elapsedRatio;
    healthStatus = paceRatio >= 0.9 ? "on_track" : paceRatio >= 0.7 ? "attention" : "critical";
  }
  const projectedAttainment = elapsedRatio > 0 ? attainmentRatio / elapsedRatio : attainmentRatio;
  const criteria = normalizeGoalCriteria(goal.thresholds?.criteria || []);
  const current = finite(goal.currentValue ?? goal.current_value);
  const matchedCriterion = criteria.find((criterion) => {
    if (criterion.operator === "lte") return current <= criterion.value;
    if (criterion.operator === "between") return current >= criterion.value && current <= finite(criterion.max);
    return current >= criterion.value;
  }) || null;
  if (matchedCriterion && !["blocked", "closed"].includes(healthStatus)) healthStatus = matchedCriterion.status;
  return {
    attainmentRatio,
    attainmentPercent: Math.max(0, attainmentRatio * 100),
    elapsedRatio,
    elapsedPercent: elapsedRatio * 100,
    paceRatio: elapsedRatio > 0 ? attainmentRatio / elapsedRatio : 0,
    projectedAttainment,
    projectedPercent: projectedAttainment * 100,
    remaining: goalRemaining({
      direction: goal.direction,
      targetValue: goal.targetValue ?? goal.target_value,
      currentValue: goal.currentValue ?? goal.current_value,
      rangeMin: goal.rangeMin ?? goal.range_min,
      rangeMax: goal.rangeMax ?? goal.range_max,
    }),
    healthStatus,
    matchedCriterion,
    totalDays,
    elapsedDays,
  };
};

export const GOAL_HEALTH_LABELS = Object.freeze({
  not_started: "Não iniciada",
  on_track: "No ritmo",
  attention: "Atenção",
  critical: "Crítica",
  achieved: "Atingida",
  exceeded: "Superada",
  blocked: "Bloqueada",
  closed: "Encerrada",
});

export const validateGoalInput = (input = {}, metrics = GOAL_METRICS) => {
  const errors = [];
  const title = String(input.title || "").trim();
  const category = String(input.category || "");
  const scopeType = String(input.scopeType || input.scope_type || "");
  const metricKey = String(input.metricKey || input.metric_key || "manual");
  const direction = String(input.direction || goalMetric(metricKey, metrics).direction || "increase");
  const periodStart = isoDay(input.periodStart || input.period_start);
  const periodEnd = isoDay(input.periodEnd || input.period_end);
  const rawTarget = input.targetValue ?? input.target_value;
  const targetValue = rawTarget === "" || rawTarget == null ? Number.NaN : Number(rawTarget);
  if (title.length < 3) errors.push("Informe um título com pelo menos 3 caracteres.");
  if (!GOAL_CATEGORIES.some((item) => item.id === category)) errors.push("Selecione uma categoria válida.");
  if (!GOAL_SCOPES.some((item) => item.id === scopeType)) errors.push("Selecione um escopo válido.");
  if (!metrics.some((item) => item.id === metricKey)) errors.push("Selecione um indicador válido.");
  if (!GOAL_DIRECTIONS.some((item) => item.id === direction)) errors.push("Selecione uma direção válida.");
  if (!periodStart || !periodEnd || periodEnd < periodStart) errors.push("Informe um período válido.");
  if (!Number.isFinite(targetValue)) errors.push("Informe o valor alvo.");
  if (direction === "range") {
    const min = Number(input.rangeMin ?? input.range_min);
    const max = Number(input.rangeMax ?? input.range_max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) errors.push("Informe uma faixa válida.");
  }
  return { valid: errors.length === 0, errors };
};

export const goalSummary = (goals = [], now = new Date()) => {
  const enriched = goals.map((goal) => ({ ...goal, progress: goal.progress || goalProgress(goal, now) }));
  const active = enriched.filter((goal) => !["closed", "cancelled"].includes(goal.status));
  const weightedDenominator = active.reduce((sum, goal) => sum + Math.max(0, finite(goal.weight, 100)), 0);
  const weighted = weightedDenominator
    ? active.reduce((sum, goal) => sum + Math.min(1, goal.progress.attainmentRatio) * Math.max(0, finite(goal.weight, 100)), 0) / weightedDenominator
    : 0;
  return {
    total: enriched.length,
    active: active.length,
    weightedAttainmentPercent: weighted * 100,
    onTrack: active.filter((goal) => goal.progress.healthStatus === "on_track").length,
    attention: active.filter((goal) => goal.progress.healthStatus === "attention").length,
    critical: active.filter((goal) => goal.progress.healthStatus === "critical").length,
    achieved: enriched.filter((goal) => ["achieved", "exceeded"].includes(goal.progress.healthStatus)).length,
    blocked: active.filter((goal) => goal.progress.healthStatus === "blocked").length,
  };
};
