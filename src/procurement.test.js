import { describe, expect, it } from "vitest";
import {
  bestOffersByItem,
  buildProcurementCsv,
  compareSupplierBids,
  parseSupplierProposal,
  procurementNumber,
  supplierBidTotals,
} from "./domain.js";

const rfq = {
  priority: "equilibrio",
  items: [
    { id: "i1", name: "Capa de terno", quantity: 1000, unit: "un" },
    { id: "i2", name: "Cabide azul", quantity: 500, unit: "un" },
  ],
  bids: [
    {
      id: "b1",
      supplierName: "Fornecedor A",
      offers: { i1: { unitPrice: "0,51" }, i2: { unitPrice: "0,66" } },
      freight: "R$ 40,00",
      deliveryDays: 8,
    },
    {
      id: "b2",
      supplierName: "Fornecedor B",
      offers: { i1: { unitPrice: "0,55" }, i2: { unitPrice: "0,60" } },
      freight: 0,
      deliveryDays: 4,
    },
  ],
};

describe("compras e RFQ", () => {
  it("normaliza moeda brasileira e internacional", () => {
    expect(procurementNumber("R$ 1.234,56")).toBe(1234.56);
    expect(procurementNumber("1,25")).toBe(1.25);
    expect(procurementNumber(9.9)).toBe(9.9);
  });

  it("calcula total incluindo frete, impostos e desconto", () => {
    expect(supplierBidTotals(rfq, rfq.bids[0]).total).toBe(880);
  });

  it("rankeia pelo custo total e mantém cobertura como primeiro critério", () => {
    expect(compareSupplierBids(rfq)[0].supplierName).toBe("Fornecedor B");
    const incomplete = {
      ...rfq,
      bids: [
        ...rfq.bids,
        { id: "b3", supplierName: "Incompleto", offers: { i1: { unitPrice: 0.01 } } },
      ],
    };
    expect(compareSupplierBids(incomplete)[0].supplierName).not.toBe("Incompleto");
  });

  it("identifica o menor preço por item", () => {
    const best = bestOffersByItem(rfq);
    expect(best[0].best.supplierName).toBe("Fornecedor A");
    expect(best[1].best.supplierName).toBe("Fornecedor B");
  });

  it("exporta comparação em CSV", () => {
    const csv = buildProcurementCsv(rfq);
    expect(csv).toContain('"Fornecedor A"');
    expect(csv).toContain('"Ranking"');
  });

  it("normaliza uma proposta extraída por IA", () => {
    const parsed = parseSupplierProposal(
      JSON.stringify({
        fornecedor: "Fábrica X",
        frete: "R$ 30,00",
        prazoDias: 7,
        itens: [
          { nome: "Capa de terno", precoUnitario: "0,49" },
          { nome: "Cabide azul", precoUnitario: "0,70" },
        ],
      }),
      rfq,
    );
    expect(parsed.supplierName).toBe("Fábrica X");
    expect(parsed.offers.i1.unitPrice).toBe(0.49);
    expect(parsed.freight).toBe(30);
  });
});
