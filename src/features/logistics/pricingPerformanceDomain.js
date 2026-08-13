const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(n(value) * factor) / factor;
};

export function comparePricingToActual({ scenario = {}, actual = {} } = {}) {
  const plannedRevenue = n(scenario.result?.selectedPrice || scenario.result?.recommendedPrice);
  const plannedCost = n(scenario.result?.loadedCost);
  const actualRevenue = n(actual.actualRevenue);
  const actualCost = n(actual.actualCost);
  const plannedMargin = plannedRevenue > 0 ? ((plannedRevenue - plannedCost) / plannedRevenue) * 100 : null;
  const actualMargin = actualRevenue > 0 ? ((actualRevenue - actualCost) / actualRevenue) * 100 : null;
  return {
    scenarioId: scenario.id || actual.scenarioId || "",
    productId: scenario.productId || "",
    referenceMonth: actual.referenceMonth || "",
    plannedRevenue,
    plannedCost,
    actualRevenue,
    actualCost,
    plannedMargin: plannedMargin === null ? null : round(plannedMargin, 1),
    actualMargin: actualMargin === null ? null : round(actualMargin, 1),
    revenueVariance: round(actualRevenue - plannedRevenue),
    costVariance: round(actualCost - plannedCost),
    marginVariance: plannedMargin === null || actualMargin === null ? null : round(actualMargin - plannedMargin, 1),
    status: !actual.referenceMonth ? "missing-actual" : actualMargin !== null && plannedMargin !== null && actualMargin < plannedMargin - 3 ? "attention" : "on-track",
  };
}

export function pricingLearning(comparisons = []) {
  const usable = comparisons.filter((item) => item.actualRevenue > 0 && item.plannedRevenue > 0 && item.actualCost > 0 && item.plannedCost > 0);
  const byProduct = new Map();
  for (const item of usable) byProduct.set(item.productId, [...(byProduct.get(item.productId) || []), item]);
  return [...byProduct.entries()].map(([productId, rows]) => {
    const averageCostFactor = rows.reduce((sum, item) => sum + item.actualCost / item.plannedCost, 0) / rows.length;
    const averageRevenueFactor = rows.reduce((sum, item) => sum + item.actualRevenue / item.plannedRevenue, 0) / rows.length;
    return {
      productId,
      samples: rows.length,
      averageCostFactor: round(averageCostFactor, 3),
      averageRevenueFactor: round(averageRevenueFactor, 3),
      actionable: rows.length >= 3,
      recommendation: rows.length < 3
        ? `São necessários ${3 - rows.length} período(s) realizado(s) para sugerir ajuste de régua.`
        : averageCostFactor > 1.05
          ? `Custos realizados estão ${round((averageCostFactor - 1) * 100, 1)}% acima do planejado. Revisar premissas antes de alterar a régua.`
          : "Desvio médio de custo dentro de 5%; manter a régua e continuar monitorando.",
    };
  });
}
