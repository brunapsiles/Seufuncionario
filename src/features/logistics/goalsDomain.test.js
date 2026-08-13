import { describe, expect, it } from "vitest";
import {
  goalAttainment,
  goalProgress,
  goalRemaining,
  goalSummary,
  validateGoalInput,
} from "./goalsDomain.js";

describe("metas da To Do Green", () => {
  it("calcula meta crescente a partir de uma linha de base", () => {
    expect(goalAttainment({ direction: "increase", baselineValue: 100, targetValue: 200, currentValue: 150 })).toBe(0.5);
    expect(goalRemaining({ direction: "increase", targetValue: 200, currentValue: 150 })).toBe(50);
  });

  it("calcula meta de redução sem inverter o resultado", () => {
    expect(goalAttainment({ direction: "decrease", baselineValue: 10, targetValue: 4, currentValue: 7 })).toBe(0.5);
    expect(goalRemaining({ direction: "decrease", targetValue: 4, currentValue: 7 })).toBe(3);
  });

  it("considera a meta de faixa atingida somente dentro do intervalo", () => {
    expect(goalAttainment({ direction: "range", currentValue: 82, rangeMin: 80, rangeMax: 90 })).toBe(1);
    expect(goalRemaining({ direction: "range", currentValue: 94, rangeMin: 80, rangeMax: 90 })).toBe(4);
  });

  it("separa atingimento de ritmo", () => {
    const progress = goalProgress({
      direction: "increase",
      baselineValue: 0,
      targetValue: 100,
      currentValue: 40,
      periodStart: "2026-01-01",
      periodEnd: "2026-04-11",
      status: "active",
    }, "2026-02-20");
    expect(progress.attainmentPercent).toBe(40);
    expect(progress.elapsedPercent).toBe(50);
    expect(progress.healthStatus).toBe("attention");
    expect(progress.projectedPercent).toBe(80);
  });

  it("marca resultado superado sem limitar a leitura a cem por cento", () => {
    const progress = goalProgress({
      direction: "increase",
      baselineValue: 0,
      targetValue: 100,
      currentValue: 125,
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      status: "active",
    }, "2026-06-01");
    expect(progress.attainmentPercent).toBe(125);
    expect(progress.healthStatus).toBe("exceeded");
  });

  it("pondera metas sem deixar uma supermeta compensar outra", () => {
    const summary = goalSummary([
      { weight: 70, status: "active", progress: { attainmentRatio: 1.4, healthStatus: "exceeded" } },
      { weight: 30, status: "active", progress: { attainmentRatio: 0.5, healthStatus: "critical" } },
    ]);
    expect(summary.weightedAttainmentPercent).toBe(85);
    expect(summary.critical).toBe(1);
    expect(summary.achieved).toBe(1);
  });

  it("recusa período invertido e alvo ausente", () => {
    const result = validateGoalInput({
      title: "Receita",
      category: "commercial",
      scopeType: "company",
      metricKey: "revenue",
      direction: "increase",
      periodStart: "2026-12-31",
      periodEnd: "2026-01-01",
      targetValue: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Informe um período válido.");
    expect(result.errors).toContain("Informe o valor alvo.");
  });

  it("aceita métrica criada pelo administrador", () => {
    const metrics = [{ id: "renovacoes", label: "Renovações", category: "commercial", unit: "number", source: "manual" }];
    expect(validateGoalInput({
      title: "Renovar contratos estratégicos",
      category: "commercial",
      scopeType: "company",
      metricKey: "renovacoes",
      direction: "increase",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      targetValue: 12,
    }, metrics).valid).toBe(true);
  });

  it("usa os critérios do administrador para classificar o resultado", () => {
    const progress = goalProgress({
      direction: "increase", baselineValue: 0, targetValue: 100, currentValue: 82,
      periodStart: "2026-01-01", periodEnd: "2026-12-31", status: "active",
      thresholds: { criteria: [
        { id: "ok", label: "No ritmo", operator: "gte", value: 80, status: "on_track" },
        { id: "critical", label: "Crítica", operator: "gte", value: 0, status: "critical" },
      ] },
    }, "2026-08-01");
    expect(progress.healthStatus).toBe("on_track");
    expect(progress.matchedCriterion.label).toBe("No ritmo");
  });
});
