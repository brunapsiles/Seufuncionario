import { describe, expect, it } from "vitest";
import {
  avaliarJornadaEletrificacao,
  avaliarMapeamento,
  inputsDePrecificacaoDaOportunidade,
} from "./electrificationJourneyDomain.js";

const mapeada = (extra = {}) => ({
  id: "opp-1",
  cliente: "Cliente teste",
  origin: "Cajamar",
  destination: "Osasco",
  distanciaKm: 42,
  viagensMes: 22,
  weightKg: 900,
  sla: "98,5% no prazo",
  deliveryWindows: "08h às 18h",
  trackingSystem: "TMS do cliente",
  primaryObjective: "esg",
  ...extra,
});

describe("mapeamento da eletrificação", () => {
  it("mede grupos de negócio, não a quantidade bruta de campos", () => {
    const resultado = avaliarMapeamento(mapeada());
    expect(resultado.completo).toBe(true);
    expect(resultado.percentual).toBe(100);
    expect(resultado.total).toBe(5);
  });

  it("diz exatamente quais conversas ainda faltam", () => {
    const resultado = avaliarMapeamento(mapeada({ trackingSystem: "", primaryObjective: "" }));
    expect(resultado.completo).toBe(false);
    expect(resultado.faltando).toEqual(["Sistemas e rastreamento", "Objetivo do cliente"]);
  });
});

describe("jornada de eletrificação", () => {
  it("a simulação existente avança a oportunidade sem duplicar cadastro", () => {
    const resultado = avaliarJornadaEletrificacao(mapeada(), [
      { id: "sc-1", opportunityId: "opp-1" },
    ]);
    expect(resultado.etapas.find((e) => e.id === "mapear").estado).toBe("concluida");
    expect(resultado.etapas.find((e) => e.id === "simular").estado).toBe("concluida");
    expect(resultado.etapaAtual.id).toBe("rodar");
  });

  it("não libera as etapas seguintes fora de ordem", () => {
    const resultado = avaliarJornadaEletrificacao(mapeada({ origin: "" }), []);
    expect(resultado.etapaAtual.id).toBe("mapear");
    expect(resultado.etapas.find((e) => e.id === "simular").estado).toBe("bloqueada");
  });

  it("fecha a jornada apenas com piloto, relatório e escala comprovados", () => {
    const oportunidade = mapeada({
      pilotStatus: "concluido",
      pilotStart: "2026-08-01",
      pilotSuccessCriteria: "SLA acima de 98% e zero falha crítica",
      reportStatus: "publicado",
      reportUrl: "https://exemplo.com/relatorio",
      expansionStatus: "aprovada",
      expansionPlan: "Expandir para três rotas no próximo trimestre",
    });
    const resultado = avaliarJornadaEletrificacao(oportunidade, [
      { opportunityId: "opp-1" },
    ]);
    expect(resultado.concluida).toBe(true);
    expect(resultado.percentual).toBe(100);
  });

  it("status sem prova não conclui piloto, relatório ou escala", () => {
    const oportunidade = mapeada({
      pilotStatus: "concluido",
      reportStatus: "publicado",
      expansionStatus: "aprovada",
    });
    const resultado = avaliarJornadaEletrificacao(oportunidade, [
      { opportunityId: "opp-1" },
    ]);
    expect(resultado.etapaAtual.id).toBe("rodar");
    expect(resultado.concluida).toBe(false);
  });
});

describe("ponte para a precificação", () => {
  it("leva dados operacionais e preserva os padrões do produto", () => {
    const inputs = inputsDePrecificacaoDaOportunidade(mapeada(), { tollCost: 0 });
    expect(inputs.client).toBe("Cliente teste");
    expect(inputs.origin).toBe("Cajamar");
    expect(inputs.tripsPerMonth).toBe(22);
    expect(inputs.tollCost).toBe(0);
  });
});
