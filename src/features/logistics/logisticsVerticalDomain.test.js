import { describe, expect, it } from "vitest";
import {
  LOGISTICS_PRODUCTS,
  TODO_GREEN_FEATURE_COUNT,
  TODO_GREEN_MODULE_CATALOG,
  centralPricingEngine,
  createPricingScenarioSnapshot,
  esgTranslator,
  calculateEnvironmentalImpact,
  calculateGreenScore,
  getProductPricingBlueprint,
  hasTodoGreenPermission,
  summarizeTodoGreenDashboard,
} from "./logisticsVerticalDomain.js";

describe("logistics vertical domain", () => {
  it("catalogs To Do Green modules and product-specific calculators", () => {
    expect(TODO_GREEN_FEATURE_COUNT).toBeGreaterThanOrEqual(53);
    expect(TODO_GREEN_MODULE_CATALOG.some((item) => item.id === "green-score")).toBe(true);
    expect(LOGISTICS_PRODUCTS.map((item) => item.id)).toEqual([
      "middle-mile",
      "last-mile",
      "dedicated",
      "transfer",
      "store-replenishment",
      "supplier-pickup",
      "fractional-distribution",
      "bulk",
      "custom-project",
    ]);
    expect(LOGISTICS_PRODUCTS.find((item) => item.id === "bulk").requiredFields).toContain("materialType");
  });

  it("does not let read access imply sensitive To Do Green permissions", () => {
    expect(hasTodoGreenPermission("vendedor", "read")).toBe(true);
    expect(hasTodoGreenPermission("vendedor", "pricing:simulate")).toBe(true);
    expect(hasTodoGreenPermission("vendedor", "pricing:manage")).toBe(false);
    expect(hasTodoGreenPermission("vendedor", "cost:manage")).toBe(false);
    expect(hasTodoGreenPermission("auditor", "audit:read")).toBe(true);
    expect(hasTodoGreenPermission("auditor", "deal:approve")).toBe(false);
    expect(hasTodoGreenPermission("admin", "deal:approve")).toBe(true);
  });

  it("describes professional pricing blueprints by logistics product", () => {
    const middleMile = getProductPricingBlueprint("middle-mile");
    const lastMile = getProductPricingBlueprint("last-mile");
    const bulk = getProductPricingBlueprint("bulk");
    expect(middleMile.requiredEvidence).toContain("rota validada");
    expect(lastMile.executiveOutputs).toContain("custo por pacote");
    expect(bulk.inputGroups.flatMap(([, fields]) => fields)).toContain("materialType");
  });

  it("calculates middle mile with margin, emissions and traceability", () => {
    const result = centralPricingEngine("middle-mile", {
      distanceKm: 100,
      tripsPerMonth: 40,
      vehicleType: "VUC elétrico",
      customerTargetPrice: 80000,
      pallets: 12,
      weightKg: 3000,
      dataQuality: 85,
      occupancyPercent: 80,
    });
    expect(result.productName).toBe("Middle Mile");
    expect(result.minimumPrice).toBeGreaterThan(result.loadedCost);
    expect(result.recommendedPrice).toBeGreaterThan(result.minimumPrice);
    expect(result.impact.co2AvoidedKg).toBeGreaterThan(0);
    expect(result.greenScore.score).toBeGreaterThan(0);
    expect(result.traceability.ruleVersion).toBe("1.0.0");
    expect(result.traceability.requiredEvidence).toContain("rota validada");
  });

  it("keeps last mile economics separate from middle mile inputs", () => {
    const result = centralPricingEngine("last-mile", {
      packages: 9000,
      routesPerDay: 18,
      daysPerMonth: 22,
      kmPerRoute: 62,
      vehicleType: "Furgão elétrico",
      customerTargetPrice: 120000,
      successRate: 92,
      dataQuality: 75,
    });
    expect(result.productName).toBe("Last Mile");
    expect(result.inputs.packages).toBe(9000);
    expect(result.impact.distanceKm).toBeGreaterThan(20_000);
    expect(result.recommendation.reasons.join(" ")).toMatch(/ESG|parâmetros|Deal Desk/i);
  });

  it("triggers Deal Desk when target is below minimum or data quality is low", () => {
    const result = centralPricingEngine("middle-mile", {
      distanceKm: 220,
      tripsPerMonth: 30,
      customerTargetPrice: 1000,
      dataQuality: 30,
      occupancyPercent: 45,
    });
    expect(result.approval.required).toBe(true);
    expect(result.approval.triggers).toContain("Target incompatível com preço mínimo");
    expect(result.approval.triggers).toContain("Dados insuficientes ou pouco confiáveis");
    expect(result.recommendation.decision).toBe("Encaminhar ao Deal Desk");
  });

  it("stores scenario snapshots without mutating historical inputs", () => {
    const inputs = { distanceKm: 80, tripsPerMonth: 20, customerTargetPrice: 50000 };
    const snapshot = createPricingScenarioSnapshot("middle-mile", inputs, {
      id: "scenario-a",
      userId: "user-a",
    });
    inputs.distanceKm = 999;
    expect(snapshot.id).toBe("scenario-a");
    expect(snapshot.inputs.distanceKm).toBe(80);
    expect(snapshot.result.inputs.distanceKm).toBe(80);
  });

  it("calculates environmental impact, Green Score and ESG translations with formulas", () => {
    const impact = calculateEnvironmentalImpact({
      distanceKm: 100,
      tripsPerMonth: 10,
      dataQuality: 90,
    });
    const score = calculateGreenScore(impact, {
      lowEmissionKmTarget: 1000,
      cleanEnergyPercent: 80,
      occupancyPercent: 75,
      productivityPercent: 80,
    });
    const translated = esgTranslator(impact.co2AvoidedKg);
    expect(impact.formula).toContain("distância");
    expect(score.score).toBeGreaterThan(40);
    expect(translated.proposalText).toContain("tCO2e");
    expect(translated.disclaimer).toContain("Equivalências ilustrativas");
  });

  it("summarizes executive dashboard with traceable scenario data", () => {
    const first = createPricingScenarioSnapshot("middle-mile", {
      distanceKm: 100,
      tripsPerMonth: 12,
      customerTargetPrice: 30000,
      clientId: "c1",
    });
    const second = createPricingScenarioSnapshot("last-mile", {
      packages: 3000,
      routesPerDay: 8,
      daysPerMonth: 20,
      kmPerRoute: 40,
      clientId: "c2",
    });
    const summary = summarizeTodoGreenDashboard({
      pricingScenarios: [first, second],
      operations: [{ deliveries: 3000, packages: 3000, trips: 160, distanceKm: 6400, occupancyPercent: 78 }],
      tasks: [{ due: "2020-01-01", status: "A fazer" }],
      today: "2026-01-01",
    });
    expect(summary.receitaPrevista).toBeGreaterThan(0);
    expect(summary.clientes).toBe(2);
    expect(summary.tarefasAtrasadas).toBe(1);
    expect(summary.co2Evitado).toBeGreaterThan(0);
    expect(summary.dataPolicy).toBe("real-data-first");
  });
});
