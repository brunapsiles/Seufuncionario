import { describe, expect, it } from "vitest";
import { buildTodoGreenDecisionCenter } from "./decisionCenterDomain.js";

describe("centro de decisão To Do Green", () => {
  it("calcula pipeline e forecast somente com oportunidades abertas", () => {
    const result = buildTodoGreenDecisionCenter({
      data: { opportunities: [
        { value: 100_000, probability: 50, stage: "Proposta", nextStep: "Reunião" },
        { value: 40_000, probability: 100, stage: "Ganho" },
      ] },
    });
    expect(result.pipeline).toBe(100_000);
    expect(result.forecast).toBe(50_000);
  });

  it("gera apenas alertas que levam a uma ação", () => {
    const result = buildTodoGreenDecisionCenter({
      now: new Date("2026-08-13T12:00:00Z"),
      dashboard: { aprovacoesPendentes: 2 },
      data: {
        clients: [{ id: "1", crm: { nextActionAt: "2026-08-01" } }],
        opportunities: [{ id: "o1", value: 200_000, stage: "Diagnóstico" }],
        contracts: [{ id: "c1", endAt: "2026-09-01" }],
        operations: [{ id: "op1", incidents: 1 }],
      },
    });
    expect(result.alerts).toHaveLength(5);
    expect(result.alerts.every((item) => item.route && item.action)).toBe(true);
  });

  it("não inventa alerta quando não há evidência", () => {
    const result = buildTodoGreenDecisionCenter({ data: {}, dashboard: {} });
    expect(result.alerts).toEqual([]);
    expect(result.hasRevenueData).toBe(false);
    expect(result.hasMarginData).toBe(false);
    expect(result.hasImpactData).toBe(false);
  });
});
