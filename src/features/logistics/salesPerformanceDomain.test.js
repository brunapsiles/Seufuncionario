import { describe, expect, it } from "vitest";
import { buildSalesPerformance, summarizeSalesPerformance } from "./salesPerformanceDomain.js";

describe("performance comercial separada de oportunidades", () => {
  const now = Date.parse("2026-08-10T12:00:00Z");
  const clients = [
    { id: "1", updatedAt: "2026-08-05T12:00:00Z", vendedores: [{ email: "ana@todogreen.com" }], crm: { temperature: "Morno", nextAction: "Ligar", nextActionAt: "2026-08-09", contacts: [{ email: "compras@cliente.com" }] } },
    { id: "2", updatedAt: "2026-06-01T12:00:00Z", vendedores: [{ email: "ana@todogreen.com" }], crm: { temperature: "Frio", contacts: [] } },
  ];

  it("mede execução da carteira e metas comerciais", () => {
    const rows = buildSalesPerformance(clients, [{ category: "commercial", ownerEmail: "ANA@TODOGREEN.COM", progress: { attainmentPercent: 80 } }], now);
    expect(rows[0]).toMatchObject({ sellerEmail: "ana@todogreen.com", portfolioSize: 2, contactCoveragePercent: 50, freshAccountsPercent: 50, overdueActions: 1, missingActions: 1, goalAttainmentPercent: 80 });
    expect(summarizeSalesPerformance(rows)).toMatchObject({ sellers: 1, portfolioSize: 2, overdueActions: 1, missingActions: 1 });
  });

  it("não muda quando dados de oportunidades são acrescentados aos clientes", () => {
    const baseline = buildSalesPerformance(clients, [], now);
    const withOpportunityNoise = buildSalesPerformance(clients.map((client) => ({ ...client, opportunities: [{ value: 999999, stage: "won" }], pipeline: 999999 })), [], now);
    expect(withOpportunityNoise).toEqual(baseline);
  });
});
