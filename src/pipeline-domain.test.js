import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAGES,
  averageSalesCycle,
  conversionRates,
  daysInStage,
  forecastByMonth,
  isOpen,
  lossBreakdown,
  makeOpportunity,
  makePipeline,
  moveStage,
  openStages,
  opportunityAge,
  opportunityProbability,
  pipelineSummary,
  stageMetrics,
  stalledOpportunities,
  weightedValue,
} from "./features/crm/pipelineDomain.js";

const HOJE = "2026-07-29";
const funil = makePipeline("p1");

const opp = (extra = {}) => ({
  id: "o1",
  title: "Bolo de casamento",
  contactName: "Cliente A",
  value: 1000,
  stageId: "proposta",
  probability: "",
  expectedCloseDate: "2026-08-15",
  stageHistory: [],
  createdAt: "2026-07-01T10:00:00.000Z",
  ...extra,
});

describe("etapas e probabilidade", () => {
  it("separa etapas abertas de ganhas e perdidas", () => {
    expect(openStages(funil).map((s) => s.id)).toEqual([
      "novo",
      "conversa",
      "proposta",
      "negociacao",
    ]);
  });

  it("usa a probabilidade da etapa quando a oportunidade não tem uma", () => {
    expect(opportunityProbability(opp(), funil)).toBe(50);
  });

  it("a probabilidade da oportunidade tem prioridade sobre a da etapa", () => {
    expect(opportunityProbability(opp({ probability: 90 }), funil)).toBe(90);
  });

  it("limita a probabilidade entre 0 e 100", () => {
    expect(opportunityProbability(opp({ probability: 150 }), funil)).toBe(100);
    expect(opportunityProbability(opp({ probability: -20 }), funil)).toBe(0);
  });

  it("sabe quando a oportunidade ainda está em disputa", () => {
    expect(isOpen(opp(), funil)).toBe(true);
    expect(isOpen(opp({ stageId: "ganho" }), funil)).toBe(false);
    expect(isOpen(opp({ stageId: "perdido" }), funil)).toBe(false);
  });
});

describe("weightedValue", () => {
  it("pondera o valor pela probabilidade da etapa", () => {
    expect(weightedValue(opp(), funil)).toBe(500);
  });

  it("aceita valor em formato brasileiro", () => {
    expect(weightedValue(opp({ value: "2.500,00" }), funil)).toBe(1250);
  });

  it("é zero na etapa de perdido", () => {
    expect(weightedValue(opp({ stageId: "perdido" }), funil)).toBe(0);
  });
});

describe("idade e tempo parado", () => {
  it("conta os dias desde a criação", () => {
    expect(opportunityAge(opp(), HOJE)).toBe(28);
  });

  it("sem histórico, o tempo parado conta da criação", () => {
    expect(daysInStage(opp(), HOJE)).toBe(28);
  });

  it("com histórico, conta da última mudança de etapa", () => {
    const o = opp({
      stageHistory: [{ stageId: "proposta", at: "2026-07-25T10:00:00.000Z" }],
    });
    expect(daysInStage(o, HOJE)).toBe(4);
  });
});

describe("moveStage", () => {
  it("registra a mudança no histórico", () => {
    const movida = moveStage(opp(), "negociacao", "2026-07-29T10:00:00.000Z");
    expect(movida.stageId).toBe("negociacao");
    expect(movida.stageHistory).toEqual([
      { stageId: "negociacao", at: "2026-07-29T10:00:00.000Z" },
    ]);
  });

  it("não faz nada quando a etapa é a mesma", () => {
    const original = opp();
    expect(moveStage(original, "proposta", "x")).toBe(original);
  });
});

describe("stageMetrics", () => {
  it("conta quantidade, valor e valor ponderado por etapa", () => {
    const opps = [
      opp({ id: "a", stageId: "proposta", value: 1000 }),
      opp({ id: "b", stageId: "proposta", value: 500 }),
      opp({ id: "c", stageId: "negociacao", value: 2000 }),
    ];
    const metricas = stageMetrics(opps, funil);
    const proposta = metricas.find((m) => m.id === "proposta");
    expect(proposta).toMatchObject({ count: 2, total: 1500, weighted: 750 });
    const negociacao = metricas.find((m) => m.id === "negociacao");
    expect(negociacao).toMatchObject({ count: 1, total: 2000, weighted: 1500 });
  });
});

describe("conversionRates", () => {
  it("calcula quantos avançaram de cada etapa para a seguinte", () => {
    const opps = [
      opp({ id: "a", stageId: "novo" }),
      opp({ id: "b", stageId: "conversa" }),
      opp({ id: "c", stageId: "proposta" }),
      opp({ id: "d", stageId: "ganho" }),
    ];
    const taxas = conversionRates(opps, funil);
    // 4 chegaram ao "novo", 3 seguiram para "conversa" => 75%
    expect(taxas[0]).toMatchObject({ from: "novo", to: "conversa", rate: 75 });
    // 3 chegaram a "conversa", 2 seguiram => 66.7%
    expect(taxas[1].rate).toBeCloseTo(66.7, 1);
  });

  it("devolve zero quando nada chegou à etapa", () => {
    expect(conversionRates([], funil)[0].rate).toBe(0);
  });
});

describe("averageSalesCycle", () => {
  it("mede os dias entre criação e fechamento das ganhas", () => {
    const opps = [
      opp({
        id: "a",
        stageId: "ganho",
        createdAt: "2026-07-01T00:00:00.000Z",
        closedAt: "2026-07-11T00:00:00.000Z",
      }),
      opp({
        id: "b",
        stageId: "ganho",
        createdAt: "2026-07-01T00:00:00.000Z",
        closedAt: "2026-07-21T00:00:00.000Z",
      }),
    ];
    expect(averageSalesCycle(opps, funil)).toBe(15);
  });

  it("ignora ganhas sem data de fechamento e perdidas", () => {
    const opps = [
      opp({ id: "a", stageId: "ganho", closedAt: "" }),
      opp({ id: "b", stageId: "perdido", closedAt: "2026-07-20T00:00:00.000Z" }),
    ];
    expect(averageSalesCycle(opps, funil)).toBe(0);
  });
});

describe("pipelineSummary", () => {
  it("resume aberto, ganho, perdido, taxa de ganho e ticket médio", () => {
    const opps = [
      opp({ id: "a", stageId: "proposta", value: 1000 }),
      opp({ id: "b", stageId: "negociacao", value: 2000 }),
      opp({
        id: "c",
        stageId: "ganho",
        value: 3000,
        createdAt: "2026-07-01T00:00:00.000Z",
        closedAt: "2026-07-11T00:00:00.000Z",
      }),
      opp({ id: "d", stageId: "perdido", value: 500 }),
    ];
    const resumo = pipelineSummary(opps, funil);
    expect(resumo.abertas).toBe(2);
    expect(resumo.ganhas).toBe(1);
    expect(resumo.perdidas).toBe(1);
    expect(resumo.valorAberto).toBe(3000);
    // 1000 × 50% + 2000 × 75% = 2000
    expect(resumo.valorPonderado).toBe(2000);
    expect(resumo.valorGanho).toBe(3000);
    expect(resumo.taxaGanho).toBe(50);
    expect(resumo.ticketMedio).toBe(3000);
    expect(resumo.cicloMedio).toBe(10);
  });

  it("não divide por zero sem oportunidades", () => {
    expect(pipelineSummary([], funil)).toMatchObject({
      abertas: 0,
      taxaGanho: 0,
      ticketMedio: 0,
    });
  });
});

describe("forecastByMonth", () => {
  it("projeta por mês de fechamento previsto", () => {
    const opps = [
      opp({ id: "a", value: 1000, expectedCloseDate: "2026-08-15" }),
      opp({ id: "b", value: 2000, expectedCloseDate: "2026-08-20", stageId: "negociacao" }),
      opp({ id: "c", value: 500, expectedCloseDate: "2026-09-10" }),
    ];
    const previsao = forecastByMonth(opps, funil, { from: HOJE, months: 3 });
    expect(previsao.map((p) => p.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(previsao[1]).toMatchObject({ count: 2, total: 3000, weighted: 2000 });
    expect(previsao[2]).toMatchObject({ count: 1, total: 500, weighted: 250 });
  });

  it("vira o ano corretamente", () => {
    const previsao = forecastByMonth([], funil, { from: "2026-11-10", months: 3 });
    expect(previsao.map((p) => p.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("não conta oportunidades já ganhas ou perdidas", () => {
    const opps = [
      opp({ id: "a", stageId: "ganho", value: 1000, expectedCloseDate: "2026-08-15" }),
    ];
    expect(forecastByMonth(opps, funil, { from: HOJE, months: 2 })[1].total).toBe(0);
  });
});

describe("stalledOpportunities", () => {
  it("lista as paradas há mais dias primeiro", () => {
    const opps = [
      opp({
        id: "recente",
        stageHistory: [{ stageId: "proposta", at: "2026-07-28T00:00:00.000Z" }],
      }),
      opp({
        id: "esquecida",
        stageHistory: [{ stageId: "proposta", at: "2026-06-01T00:00:00.000Z" }],
      }),
      opp({
        id: "media",
        stageHistory: [{ stageId: "proposta", at: "2026-07-10T00:00:00.000Z" }],
      }),
    ];
    const paradas = stalledOpportunities(opps, funil, HOJE, 14).map(
      (x) => x.opp.id,
    );
    expect(paradas).toEqual(["esquecida", "media"]);
  });

  it("ignora as já ganhas ou perdidas", () => {
    const opps = [
      opp({
        id: "ganha",
        stageId: "ganho",
        stageHistory: [{ stageId: "ganho", at: "2026-05-01T00:00:00.000Z" }],
      }),
    ];
    expect(stalledOpportunities(opps, funil, HOJE, 14)).toHaveLength(0);
  });
});

describe("lossBreakdown", () => {
  it("agrupa os motivos de perda por frequência", () => {
    const opps = [
      opp({ id: "a", stageId: "perdido", lossReason: "Preço", value: 100 }),
      opp({ id: "b", stageId: "perdido", lossReason: "Preço", value: 200 }),
      opp({ id: "c", stageId: "perdido", lossReason: "Prazo", value: 300 }),
      opp({ id: "d", stageId: "perdido", lossReason: "", value: 50 }),
    ];
    const motivos = lossBreakdown(opps, funil);
    expect(motivos[0]).toMatchObject({ reason: "Preço", count: 2, total: 300 });
    expect(motivos.map((m) => m.reason)).toContain("Não informado");
  });

  it("é vazio sem perdas", () => {
    expect(lossBreakdown([opp()], funil)).toEqual([]);
  });
});

describe("makePipeline e makeOpportunity", () => {
  it("cria o funil padrão com as etapas conhecidas", () => {
    expect(makePipeline("x").stages).toHaveLength(DEFAULT_STAGES.length);
  });

  it("cria a oportunidade na primeira etapa, sem histórico", () => {
    const o = makeOpportunity("x", { businessId: "b1" });
    expect(o.stageId).toBe("novo");
    expect(o.stageHistory).toEqual([]);
    expect(o.businessId).toBe("b1");
  });
});
