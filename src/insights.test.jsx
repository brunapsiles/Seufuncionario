import { describe, expect, it } from "vitest";
import { computeBusinessInsights } from "./App";

const NOW = Date.parse("2026-07-25T12:00:00Z");
const business = { id: "b1" };

const db = {
  transactions: [
    { type: "Receita", value: 100, date: "2026-07-20", businessId: "b1" },
    { type: "Receita", value: 50, date: "2026-06-01", businessId: "b1" },
    { type: "Despesa", value: 999, date: "2026-07-20", businessId: "b1" },
  ],
  orders: [
    { total: 200, date: "2026-07-10", clientName: "Ana", businessId: "b1" },
    { total: 100, date: "2026-07-11", clientName: "Ana", businessId: "b1" },
    { total: 300, date: "2026-07-12", clientName: "Bruno", businessId: "b1" },
  ],
  quotes: [
    { status: "aprovado", businessId: "b1" },
    { status: "aprovado", businessId: "b1" },
    { status: "recusado", businessId: "b1" },
    { status: "rascunho", businessId: "b1" },
  ],
};

describe("computeBusinessInsights", () => {
  it("calcula receita de 30 dias e tendência vs. 30 anteriores", () => {
    const ins = computeBusinessInsights(db, business, NOW);
    expect(ins.revenue30).toBe(100);
    expect(ins.revenueTrend).toBe(100); // 100 vs 50 = +100%
  });

  it("conta pedidos e ticket médio do período", () => {
    const ins = computeBusinessInsights(db, business, NOW);
    expect(ins.ordersCount).toBe(3);
    expect(ins.avgTicket).toBe(200); // (200+100+300)/3
  });

  it("calcula conversão de orçamentos (aprovados/decididos)", () => {
    const ins = computeBusinessInsights(db, business, NOW);
    expect(ins.decided).toBe(3);
    expect(ins.approved).toBe(2);
    expect(ins.conversion).toBe(67);
  });

  it("rankeia os top clientes por receita", () => {
    const ins = computeBusinessInsights(db, business, NOW);
    const ana = ins.topClients.find((c) => c.name === "Ana");
    expect(ana.total).toBe(300);
    expect(ana.orders).toBe(2);
  });

  it("sinaliza ausência de dados", () => {
    expect(computeBusinessInsights({}, business, NOW).hasData).toBe(false);
  });
});
