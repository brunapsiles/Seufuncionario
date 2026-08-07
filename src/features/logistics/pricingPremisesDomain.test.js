import { describe, expect, it } from "vitest";
import {
  CAMPOS_DE_CONFIANCA,
  NIVEIS,
  cenarioConfirmado,
  naoInformado,
  premissasDaSimulacao,
  registroDaConfirmacao,
  situacaoDoResultado,
} from "./pricingPremisesDomain.js";
import { LOGISTICS_PRODUCTS } from "./logisticsVerticalDomain.js";

const middleMile = LOGISTICS_PRODUCTS.find((item) => item.id === "middle-mile");

const completo = {
  client: "Distribuidora Alfa",
  origin: "CD Guarulhos",
  destination: "Hub Campinas",
  distanceKm: 120,
  tripsPerMonth: 40,
  vehicleType: "VUC elétrico",
  dataQuality: 80,
  occupancyPercent: 78,
};

describe("o que conta como não informado", () => {
  it("vazio, nulo e indefinido não são resposta", () => {
    expect(naoInformado("")).toBe(true);
    expect(naoInformado("   ")).toBe(true);
    expect(naoInformado(null)).toBe(true);
    expect(naoInformado(undefined)).toBe(true);
  });

  it("zero em campo obrigatório não é resposta", () => {
    // Ninguém contrata zero viagem por mês nem rota de zero quilômetro.
    expect(naoInformado(0)).toBe(true);
    expect(naoInformado("0")).toBe(true);
  });

  it("false é resposta", () => {
    // Quem desmarcou "veículo reserva" respondeu que não tem.
    expect(naoInformado(false)).toBe(false);
  });

  it("texto e número preenchidos são resposta", () => {
    expect(naoInformado("VUC elétrico")).toBe(false);
    expect(naoInformado(120)).toBe(false);
  });
});

describe("premissas da simulação", () => {
  it("uma calculadora recém-aberta não tem nenhuma premissa", () => {
    const p = premissasDaSimulacao(middleMile, {});
    expect(p.faltando).toEqual(middleMile.requiredFields);
    expect(p.semConfianca).toEqual([...CAMPOS_DE_CONFIANCA]);
    expect(p.podeConfirmar).toBe(false);
  });

  it("com tudo preenchido, permite confirmar", () => {
    const p = premissasDaSimulacao(middleMile, completo);
    expect(p.faltando).toEqual([]);
    expect(p.semConfianca).toEqual([]);
    expect(p.podeConfirmar).toBe(true);
  });

  it("preencher a operação e esquecer a confiança no dado ainda bloqueia", () => {
    const p = premissasDaSimulacao(middleMile, { ...completo, dataQuality: "" });
    expect(p.faltando).toEqual([]);
    expect(p.semConfianca).toEqual(["dataQuality"]);
    expect(p.podeConfirmar).toBe(false);
  });

  it("produto sem lista de obrigatórias não inventa exigência", () => {
    expect(premissasDaSimulacao(undefined, completo).faltando).toEqual([]);
  });
});

describe("situação do resultado", () => {
  const nome = (campo) => ({ distanceKm: "Distância km", dataQuality: "Confiança no dado" })[campo] || campo;

  it("sem premissa obrigatória, o resultado não sai da tela", () => {
    const s = situacaoDoResultado(premissasDaSimulacao(middleMile, {}), false, nome);
    expect(s.nivel).toBe(NIVEIS.incompleta);
    expect(s.podeSalvar).toBe(false);
    expect(s.podeVirarProposta).toBe(false);
    expect(s.resumo).toMatch(/Falta informar/);
  });

  it("a mensagem diz quais campos faltam, com o nome que a tela usa", () => {
    const s = situacaoDoResultado(
      premissasDaSimulacao(middleMile, { ...completo, distanceKm: "" }),
      false,
      nome,
    );
    expect(s.resumo).toContain("Distância km");
  });

  it("tudo preenchido mas não confirmado é hipótese, e hipótese não vira proposta", () => {
    const s = situacaoDoResultado(premissasDaSimulacao(middleMile, completo), false, nome);
    expect(s.nivel).toBe(NIVEIS.hipotese);
    expect(s.podeSalvar).toBe(false);
    expect(s.podeVirarProposta).toBe(false);
  });

  it("confirmada libera salvar e propor", () => {
    const s = situacaoDoResultado(premissasDaSimulacao(middleMile, completo), true, nome);
    expect(s.nivel).toBe(NIVEIS.confirmada);
    expect(s.podeSalvar).toBe(true);
    expect(s.podeVirarProposta).toBe(true);
  });

  it("confirmar não vale se ainda falta premissa", () => {
    // Marcar a confirmação com o formulário pela metade não pode liberar nada.
    const s = situacaoDoResultado(premissasDaSimulacao(middleMile, {}), true, nome);
    expect(s.nivel).toBe(NIVEIS.incompleta);
    expect(s.podeSalvar).toBe(false);
  });
});

describe("registro da confirmação", () => {
  it("grava quem confirmou e quando", () => {
    const s = situacaoDoResultado(premissasDaSimulacao(middleMile, completo), true);
    const r = registroDaConfirmacao(s, { userId: "u1", agora: "2026-08-07T10:00:00.000Z" });
    expect(r).toEqual({
      confirmadas: true,
      confirmadasPor: "u1",
      confirmadasEm: "2026-08-07T10:00:00.000Z",
    });
  });

  it("hipótese não gera registro de confirmação", () => {
    const s = situacaoDoResultado(premissasDaSimulacao(middleMile, completo), false);
    expect(registroDaConfirmacao(s, { userId: "u1" }).confirmadas).toBe(false);
  });
});

describe("cenário salvo", () => {
  it("só é confirmado quem carrega o registro", () => {
    expect(cenarioConfirmado({ premissas: { confirmadas: true } })).toBe(true);
    expect(cenarioConfirmado({ premissas: { confirmadas: false } })).toBe(false);
  });

  it("cenário antigo, sem o registro, não é presumido confirmado", () => {
    // Presumir procedência é inventar procedência.
    expect(cenarioConfirmado({ id: "antigo", result: {} })).toBe(false);
    expect(cenarioConfirmado(undefined)).toBe(false);
  });
});
