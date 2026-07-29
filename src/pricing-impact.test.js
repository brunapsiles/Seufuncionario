import { describe, expect, it } from "vitest";
import {
  calculateImpact,
  calculatePricing,
  comparePricingScenarios,
  createImpactFactor,
  createPricingModel,
  createPricingScenario,
  driverQuantity,
  quoteFromPricingScenario,
} from "./features/pricing/pricingImpactDomain.js";

describe("motor universal de precificação e impacto", () => {
  const model = createPricingModel({
    id: "m1",
    templateId: "logistics",
    name: "Entrega urbana",
    taxPercent: 10,
    commissionPercent: 5,
    targetMarginPercent: 20,
    costItems: [
      { name: "Veículo", driver: "distance", rate: 2 },
      { name: "Entregas", driver: "unit", rate: 5 },
    ],
  });

  it("calcula diferentes direcionadores de custo", () => {
    expect(driverQuantity("ton_km", { distanceKm: 100, weightKg: 2500 })).toBe(250);
    const result = calculatePricing(model, {
      inputs: { distanceKm: 100, quantity: 10 },
    });
    expect(result.directCost).toBe(250);
    expect(result.finalPrice).toBe(384.62);
    expect(result.marginPercent).toBe(20);
  });

  it("impede percentuais economicamente impossíveis", () => {
    const invalid = createPricingModel({
      costItems: [{ name: "Custo", driver: "fixed", rate: 100 }],
      taxPercent: 60,
      targetMarginPercent: 40,
    });
    expect(calculatePricing(invalid).valid).toBe(false);
  });

  it("calcula impacto, escopo e confiança rastreável", () => {
    const factor = createImpactFactor({
      id: "f1",
      name: "Energia",
      activityUnit: "kWh",
      kgCo2ePerUnit: 0.1,
      scope: "Escopo 2",
      source: "Fonte publicada",
      version: "2026",
    });
    const result = calculateImpact(
      [
        {
          factorId: "f1",
          quantity: 500,
          dataQuality: "medido",
          evidence: "conta.pdf",
        },
      ],
      [factor],
    );
    expect(result.totalKgCo2e).toBe(50);
    expect(result.byScope["Escopo 2"]).toBe(50);
    expect(result.confidence).toBe(95);
  });

  it("salva memória calculada e compara cenários", () => {
    const scenario = createPricingScenario(model, {
      id: "s1",
      name: "Diesel",
      inputs: { distanceKm: 100, quantity: 10 },
    });
    const rows = comparePricingScenarios([scenario], [model], []);
    expect(scenario.result.finalPrice).toBe(384.62);
    expect(rows[0]).toMatchObject({ name: "Diesel", cost: 250, marginPercent: 20 });
  });

  it("converte cenário em orçamento sem acoplar os módulos", () => {
    const scenario = createPricingScenario(model, {
      id: "s1",
      name: "Operação mensal",
      clientName: "Empresa A",
      inputs: { distanceKm: 100, quantity: 10 },
    });
    expect(
      quoteFromPricingScenario(scenario, model, { businessId: "b1" }, "q1"),
    ).toMatchObject({
      id: "q1",
      clientName: "Empresa A",
      total: 384.62,
      sourcePricingScenarioId: "s1",
    });
  });
});
