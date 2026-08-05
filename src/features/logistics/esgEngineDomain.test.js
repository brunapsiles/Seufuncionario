import { describe, expect, it } from "vitest";
import {
  FATORES_PADRAO,
  QUALIDADE,
  calcularImpactoAmbiental,
  fatorEmUso,
  qualidadeDoCalculo,
  traduzirParaProposta,
} from "./esgEngineDomain.js";

// O que se testa aqui não é a aritmética — é a auditabilidade. Um número
// ambiental que não se refaz não vale para relatório de conselho nem para
// inventário de Escopo 3.

const entradaEletrica = {
  distanciaKm: 100,
  viagens: 10,
  tipoVeiculo: "Furgão elétrico",
  origens: { distancia: "medido", ocupacao: "documentado" },
};

describe("o cálculo se refaz", () => {
  it("a mesma entrada dá o mesmo resultado", () => {
    const a = calcularImpactoAmbiental({ ...entradaEletrica, calculadoEm: "2026-01-01" });
    const b = calcularImpactoAmbiental({ ...entradaEletrica, calculadoEm: "2026-01-01" });
    expect(a).toEqual(b);
  });

  it("a memória traz os passos na ordem, com fórmula e entradas", () => {
    const r = calcularImpactoAmbiental(entradaEletrica);
    expect(r.memoria.passos.length).toBeGreaterThanOrEqual(4);
    r.memoria.passos.forEach((passo, i) => {
      expect(passo.ordem).toBe(i + 1);
      expect(passo.formula).toBeTruthy();
      expect(passo.descricao).toBeTruthy();
      expect(typeof passo.resultado).toBe("number");
    });
  });

  it("cada fator usado vem com fonte, unidade, versão e responsável", () => {
    const r = calcularImpactoAmbiental(entradaEletrica);
    expect(r.memoria.fatoresUsados.length).toBeGreaterThan(0);
    for (const fator of r.memoria.fatoresUsados) {
      expect(fator.fonte).toBeTruthy();
      expect(fator.unidade).toBeTruthy();
      expect(fator.versao).toBe(FATORES_PADRAO.versao);
      expect(fator.responsavel).toBeTruthy();
    }
  });

  it("dá para recalcular o CO2 evitado só com a memória", () => {
    // A prova de que a memória basta: refazer a conta com os números dela.
    const r = calcularImpactoAmbiental(entradaEletrica);
    const passos = Object.fromEntries(r.memoria.passos.map((p) => [p.descricao, p]));
    const referencia = passos["Emissão do cenário de referência"].resultado;
    const executada = passos["Emissão da operação executada"].resultado;
    expect(Math.round(referencia - executada)).toBe(Math.round(r.impacto.co2AvoidedKg));
  });

  it("o resultado carrega a versão dos fatores", () => {
    expect(calcularImpactoAmbiental(entradaEletrica).versaoFatores).toBe(FATORES_PADRAO.versao);
  });
});

describe("mudar fator não reescreve o passado", () => {
  it("uma versão nova produz outro número, e o número diz de qual versão veio", () => {
    const versaoNova = {
      ...FATORES_PADRAO,
      versao: "2027.1",
      fatores: {
        ...FATORES_PADRAO.fatores,
        rede_eletrica_kgco2e_por_kwh: {
          ...FATORES_PADRAO.fatores.rede_eletrica_kgco2e_por_kwh,
          valor: 0.08,
        },
      },
    };
    const antigo = calcularImpactoAmbiental(entradaEletrica);
    const novo = calcularImpactoAmbiental(entradaEletrica, versaoNova);
    expect(novo.impacto.co2AvoidedKg).not.toBe(antigo.impacto.co2AvoidedKg);
    expect(antigo.versaoFatores).toBe("2026.1");
    expect(novo.versaoFatores).toBe("2027.1");
  });

  it("fator ausente é erro, não silêncio", () => {
    // Cair para zero seria pior: viraria número sem base, com cara de válido.
    expect(() => fatorEmUso({ fatores: {} }, "diesel_b10_kgco2e_por_litro")).toThrow(/ausente/i);
  });
});

describe("o número diz o que ele não é", () => {
  it("a ressalva acompanha todo cálculo", () => {
    const r = calcularImpactoAmbiental(entradaEletrica);
    expect(r.memoria.ressalva).toMatch(/não constitui certificação/i);
  });

  it("as premissas ficam explícitas", () => {
    const r = calcularImpactoAmbiental(entradaEletrica);
    expect(r.memoria.premissas.some((p) => /referência/i.test(p))).toBe(true);
    expect(r.memoria.premissas.some((p) => /rede/i.test(p))).toBe(true);
  });

  it("a equivalência em árvores é ilustrativa, não compensação", () => {
    const t = traduzirParaProposta(calcularImpactoAmbiental(entradaEletrica));
    expect(t.equivalencias[0].ressalva).toMatch(/não compensação/i);
  });
});

describe("qualidade do dado", () => {
  it("medido vale mais que presumido", () => {
    expect(qualidadeDoCalculo({ a: "medido" })).toBe(QUALIDADE.medido);
    expect(qualidadeDoCalculo({ a: "presumido" })).toBe(QUALIDADE.presumido);
  });

  it("sem informar origem, assume o pior — não o melhor", () => {
    // Assumir "medido" por omissão inflaria a confiança do relatório.
    expect(qualidadeDoCalculo({})).toBe(QUALIDADE.presumido);
    expect(qualidadeDoCalculo()).toBe(QUALIDADE.presumido);
  });

  it("a qualidade entra no resultado", () => {
    const r = calcularImpactoAmbiental(entradaEletrica);
    expect(r.qualidadeDados).toBe(Math.round((QUALIDADE.medido + QUALIDADE.documentado) / 2));
  });
});

describe("operação diesel", () => {
  it("não inventa redução sobre a própria referência", () => {
    const r = calcularImpactoAmbiental({ ...entradaEletrica, tipoVeiculo: "Caminhão diesel" });
    expect(r.impacto.co2AvoidedKg).toBe(0);
    expect(r.impacto.reductionPercent).toBe(0);
    expect(r.impacto.dieselAvoidedLiters).toBe(0);
  });

  it("o texto da proposta também não promete o que não houve", () => {
    const t = traduzirParaProposta(
      calcularImpactoAmbiental({ ...entradaEletrica, tipoVeiculo: "diesel" }),
    );
    expect(t.texto).toMatch(/não apresentou redução/i);
    expect(t.equivalencias).toEqual([]);
  });
});

describe("entrada inválida", () => {
  it("sem distância, o cálculo recusa em vez de devolver zero", () => {
    expect(() => calcularImpactoAmbiental({ distanciaKm: 0 })).toThrow(/distância/i);
    expect(() => calcularImpactoAmbiental({})).toThrow(/distância/i);
  });

  it("viagem ausente conta como uma", () => {
    const r = calcularImpactoAmbiental({ distanciaKm: 100, tipoVeiculo: "eletrico" });
    expect(r.memoria.entradas.viagens).toBe(1);
    expect(r.memoria.entradas.distanciaTotal).toBe(100);
  });
});
