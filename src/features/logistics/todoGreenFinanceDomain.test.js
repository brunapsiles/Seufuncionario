import { describe, expect, it } from "vitest";
import { agruparPorCentroDeCusto, resumoFinanceiro, saldoAberto, statusFinanceiroEfetivo } from "./todoGreenFinanceDomain.js";

describe("todoGreenFinanceDomain", () => {
  it("calcula saldo sem permitir valor negativo", () => {
    expect(saldoAberto({ valor: 1000, valorPago: 350 })).toBe(650);
    expect(saldoAberto({ valor: 1000, valorPago: 1200 })).toBe(0);
  });

  it("deriva vencido, parcial e pago dos valores reais", () => {
    const now = new Date("2026-08-14T12:00:00Z");
    expect(statusFinanceiroEfetivo({ valor: 100, valorPago: 0, vencimentoEm: "2026-08-13" }, now)).toBe("overdue");
    expect(statusFinanceiroEfetivo({ valor: 100, valorPago: 25, vencimentoEm: "2026-08-13" }, now)).toBe("overdue");
    expect(statusFinanceiroEfetivo({ valor: 100, valorPago: 100, vencimentoEm: "2026-08-13" }, now)).toBe("paid");
  });

  it("resume o livro sem somar cancelados", () => {
    expect(resumoFinanceiro([
      { valor: 100, valorPago: 100, vencimentoEm: "2026-08-10" },
      { valor: 200, valorPago: 50, vencimentoEm: "2026-08-10" },
      { valor: 300, valorPago: 0, statusFinanceiro: "cancelled" },
    ], new Date("2026-08-14T12:00:00Z"))).toEqual({
      total: 300, pago: 150, aberto: 150, vencido: 150, cancelado: 300, parciais: 1,
    });
  });

  it("agrupa orçamento por centro de custo", () => {
    expect(agruparPorCentroDeCusto([
      { centroCusto: "Operação", valor: 80 },
      { centroCusto: "Comercial", valor: 20 },
      { centroCusto: "Operação", valor: 30 },
    ])).toEqual([["Operação", 110], ["Comercial", 20]]);
  });
});
