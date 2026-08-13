import { describe, expect, it } from "vitest";
import {
  cenariosAbaixoDoPiso,
  margemPorCliente,
  margemPorProduto,
  resumoDeMargem,
  tendenciaDeMargem,
} from "./marginDomain.js";

const cenario = (extra = {}) => ({
  id: "c1", productId: "middle-mile", clientId: "cli-1", clienteNome: "Rede Alfa",
  createdAt: "2026-08-10T00:00:00Z",
  result: { selectedPrice: 100000, loadedCost: 78000, marginPercent: 22, minimumMarginPercent: 18 },
  ...extra,
});

describe("resumo de margem", () => {
  it("soma receita e custo dos cenários válidos", () => {
    const resumo = resumoDeMargem({ cenarios: [cenario(), cenario({ id: "c2", result: { selectedPrice: 50000, loadedCost: 40000, marginPercent: 20 } })] });
    expect(resumo.receita).toBe(150000);
    expect(resumo.custo).toBe(118000);
    expect(resumo.margemPercent).toBeCloseTo(21.3, 1);
  });

  it("conta quantos estão abaixo do piso DO PRÓPRIO PRODUTO, não de um piso genérico", () => {
    const abaixo = cenario({ id: "c2", result: { selectedPrice: 100000, loadedCost: 90000, marginPercent: 10, minimumMarginPercent: 18 } });
    const resumo = resumoDeMargem({ cenarios: [cenario(), abaixo] });
    expect(resumo.abaixoDoPiso).toBe(1);
    expect(resumo.leitura).toContain("1 de 2");
  });

  it("cenário sem preço não entra na conta", () => {
    const resumo = resumoDeMargem({ cenarios: [cenario(), { id: "vazio", result: {} }] });
    expect(resumo.total).toBe(1);
  });

  it("sem nenhuma simulação diz isso, não zero disfarçado", () => {
    const resumo = resumoDeMargem({ cenarios: [] });
    expect(resumo.margemPercent).toBeNull();
    expect(resumo.leitura).toContain("Nenhuma simulação");
  });
});

describe("margem por produto", () => {
  it("mostra onde a margem sangra — 'middle mile dá dinheiro e last mile não'", () => {
    const porProduto = margemPorProduto({
      cenarios: [
        cenario({ productId: "middle-mile", result: { selectedPrice: 100000, loadedCost: 70000, marginPercent: 30 } }),
        cenario({ id: "c2", productId: "last-mile", result: { selectedPrice: 100000, loadedCost: 95000, marginPercent: 5, minimumMarginPercent: 18 } }),
      ],
      catalogo: [{ id: "middle-mile", name: "Middle Mile" }, { id: "last-mile", name: "Last Mile" }],
    });
    // O pior vem primeiro: é o que precisa de atenção agora.
    expect(porProduto[0].produto).toBe("Last Mile");
    expect(porProduto[0].abaixoDoPiso).toBe(1);
    expect(porProduto[1].produto).toBe("Middle Mile");
  });
});

describe("margem por cliente", () => {
  it("a conta que puxa a margem para baixo aparece na frente", () => {
    const porCliente = margemPorCliente({
      cenarios: [
        cenario({ clienteNome: "Boa Conta", result: { selectedPrice: 100000, loadedCost: 70000, marginPercent: 30 } }),
        cenario({ id: "c2", clienteNome: "Conta Cara", result: { selectedPrice: 100000, loadedCost: 95000, marginPercent: 5 } }),
      ],
    });
    expect(porCliente[0].cliente).toBe("Conta Cara");
  });
});

describe("tendência mensal", () => {
  it("diz se a margem está subindo ou descendo, não só o ponto atual", () => {
    const tendencia = tendenciaDeMargem({
      cenarios: [
        cenario({ createdAt: "2026-06-15T00:00:00Z", result: { selectedPrice: 100000, loadedCost: 80000, marginPercent: 20 } }),
        cenario({ id: "c2", createdAt: "2026-07-15T00:00:00Z", result: { selectedPrice: 100000, loadedCost: 75000, marginPercent: 25 } }),
      ],
    });
    expect(tendencia.variacao).toBe(5);
    expect(tendencia.leitura).toContain("subiu 5");
  });

  it("menos de dois meses não vira tendência inventada", () => {
    const tendencia = tendenciaDeMargem({ cenarios: [cenario()] });
    expect(tendencia.variacao).toBeNull();
    expect(tendencia.leitura).toContain("insuficiente");
  });
});

describe("cenários abaixo do piso", () => {
  it("traz o cliente e a distância até o piso, ordenado do pior", () => {
    const lista = cenariosAbaixoDoPiso({
      cenarios: [
        cenario({ id: "c1", clienteNome: "Alfa", result: { selectedPrice: 100000, loadedCost: 90000, marginPercent: 10, minimumMarginPercent: 18 } }),
        cenario({ id: "c2", clienteNome: "Beta", result: { selectedPrice: 100000, loadedCost: 96000, marginPercent: 4, minimumMarginPercent: 18 } }),
        cenario({ id: "c3", clienteNome: "Gama", result: { selectedPrice: 100000, loadedCost: 70000, marginPercent: 30, minimumMarginPercent: 18 } }),
      ],
    });
    expect(lista.map((item) => item.cliente)).toEqual(["Beta", "Alfa"]);
    expect(lista[0].distanciaDoPiso).toBe(14);
  });

  it("aguenta lista vazia", () => {
    expect(cenariosAbaixoDoPiso({ cenarios: [] })).toEqual([]);
  });
});
