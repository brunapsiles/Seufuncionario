import { describe, expect, it } from "vitest";
import { comparePricingToActual, pricingLearning } from "./pricingPerformanceDomain.js";

const scenario = { id: "s1", productId: "middle-mile", result: { recommendedPrice: 10_000, loadedCost: 8_000 } };

describe("pricing planejado versus realizado", () => {
  it("abre margem e desvios sem esconder o cálculo", () => {
    const result = comparePricingToActual({ scenario, actual: { scenarioId: "s1", referenceMonth: "2026-08", actualRevenue: 9_500, actualCost: 8_500 } });
    expect(result.plannedMargin).toBe(20);
    expect(result.actualMargin).toBe(10.5);
    expect(result.costVariance).toBe(500);
    expect(result.status).toBe("attention");
  });

  it("não recomenda mudança da régua com amostra insuficiente", () => {
    const comparison = comparePricingToActual({ scenario, actual: { scenarioId: "s1", referenceMonth: "2026-08", actualRevenue: 10_000, actualCost: 8_500 } });
    const learning = pricingLearning([comparison]);
    expect(learning[0].actionable).toBe(false);
    expect(learning[0].recommendation).toContain("2 período");
  });

  it("sinaliza custo recorrente acima do plano após três períodos", () => {
    const rows = ["06", "07", "08"].map((month) => comparePricingToActual({ scenario, actual: { scenarioId: "s1", referenceMonth: `2026-${month}`, actualRevenue: 10_000, actualCost: 8_800 } }));
    const learning = pricingLearning(rows)[0];
    expect(learning.actionable).toBe(true);
    expect(learning.recommendation).toContain("acima do planejado");
  });
});
