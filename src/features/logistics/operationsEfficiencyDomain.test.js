import { describe, expect, it } from "vitest";
import {
  OCUPACAO_CRITICA,
  operacoesCriticas,
  produtividadePorProduto,
  resumoDeOcupacao,
  tendenciaDeOcupacao,
} from "./operationsEfficiencyDomain.js";

const operacao = (extra = {}) => ({
  id: "o1", produtoId: "middle-mile", referencia: "MM-001", mesReferencia: "2026-08",
  entregas: 40, pacotes: 0, viagens: 10, distanciaKm: 500, ocupacaoPercent: 80, ...extra,
});

describe("resumo de ocupação", () => {
  it("soma o que foi entregue e calcula a ocupação média", () => {
    const resumo = resumoDeOcupacao({
      operacoes: [operacao(), operacao({ id: "o2", entregas: 20, viagens: 5, ocupacaoPercent: 60 })],
    });
    expect(resumo.entregas).toBe(60);
    expect(resumo.ocupacaoMedia).toBe(70);
  });

  it("rota com custo fixo alto e ocupação baixa aparece como crítica", () => {
    // É onde a margem se decide na frota elétrica: motorista, energia e
    // veículo custam o mesmo para uma van cheia ou pela metade.
    const resumo = resumoDeOcupacao({
      operacoes: [operacao({ ocupacaoPercent: 40 }), operacao({ id: "o2", ocupacaoPercent: 90 })],
    });
    expect(resumo.criticas).toBe(1);
    expect(resumo.leitura).toContain("1 de 2");
  });

  it("operação sem ocupação registrada não vira 0%", () => {
    // Zero por cento é um dado; ausência de dado é outra coisa, e confundir
    // as duas faria uma rota nunca medida parecer uma rota vazia.
    const resumo = resumoDeOcupacao({ operacoes: [operacao({ ocupacaoPercent: 0 })] });
    expect(resumo.semOcupacaoRegistrada).toBe(1);
    expect(resumo.ocupacaoMedia).toBeNull();
  });

  it("sem operação nenhuma diz isso, não zero disfarçado", () => {
    const resumo = resumoDeOcupacao({ operacoes: [] });
    expect(resumo.ocupacaoMedia).toBeNull();
    expect(resumo.leitura).toContain("Nenhuma operação");
  });

  it("registro vazio (sem nenhum campo preenchido) não conta como operação", () => {
    expect(resumoDeOcupacao({ operacoes: [{ id: "x" }] }).total).toBe(0);
  });
});

describe("produtividade por produto", () => {
  it("separa entregou muito de rodou muito — a mesma quantidade de viagens conta diferente", () => {
    const porProduto = produtividadePorProduto({
      cenarios: [],
      operacoes: [
        operacao({ produtoId: "middle-mile", entregas: 40, viagens: 10, ocupacaoPercent: 90 }),
        operacao({ id: "o2", produtoId: "last-mile", entregas: 40, viagens: 10, ocupacaoPercent: 35 }),
      ],
      catalogo: [{ id: "middle-mile", name: "Middle Mile" }, { id: "last-mile", name: "Last Mile" }],
    });
    expect(porProduto[0].produto).toBe("Last Mile");
    expect(porProduto[0].entregasPorViagem).toBe(4);
    expect(porProduto[1].produto).toBe("Middle Mile");
  });
});

describe("tendência mensal de ocupação", () => {
  it("diz se a densidade da rota está melhorando ou piorando", () => {
    const tendencia = tendenciaDeOcupacao({
      operacoes: [
        operacao({ mesReferencia: "2026-06", ocupacaoPercent: 60 }),
        operacao({ id: "o2", mesReferencia: "2026-07", ocupacaoPercent: 50 }),
      ],
    });
    expect(tendencia.variacao).toBe(-10);
    expect(tendencia.leitura).toContain("caiu 10");
  });

  it("menos de dois meses não vira tendência inventada", () => {
    const tendencia = tendenciaDeOcupacao({ operacoes: [operacao()] });
    expect(tendencia.variacao).toBeNull();
  });
});

describe("operações críticas", () => {
  it("traz a rota específica, não a média que a esconde", () => {
    const lista = operacoesCriticas({
      operacoes: [
        operacao({ id: "o1", referencia: "MM-001", ocupacaoPercent: 40 }),
        operacao({ id: "o2", referencia: "MM-002", ocupacaoPercent: 90 }),
        operacao({ id: "o3", referencia: "MM-003", ocupacaoPercent: 20 }),
      ],
    });
    expect(lista.map((item) => item.referencia)).toEqual(["MM-003", "MM-001"]);
  });

  it("respeita o limite declarado da faixa crítica", () => {
    const lista = operacoesCriticas({ operacoes: [operacao({ ocupacaoPercent: OCUPACAO_CRITICA })] });
    expect(lista).toEqual([]);
  });

  it("aguenta lista vazia", () => {
    expect(operacoesCriticas({ operacoes: [] })).toEqual([]);
  });
});
