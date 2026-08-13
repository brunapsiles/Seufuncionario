import { describe, expect, it } from "vitest";
import {
  PROBABILIDADE_DE_COMMIT,
  forecastPor,
  montarForecast,
  pendenciasDoForecast,
  riscoDeConcentracao,
} from "./forecastDomain.js";

const oportunidade = (extra = {}) => ({
  cliente: "Conta", estagio: "Proposta", probabilidade: 80,
  valorContrato: 100000, dataPrevistaFechamento: "2026-08-20", ...extra,
});

describe("as três linhas do forecast", () => {
  const carteira = [
    oportunidade({ cliente: "Alfa", estagio: "Negociação", probabilidade: 85, valorContrato: 800000 }),
    oportunidade({ cliente: "Beta", estagio: "Proposta", probabilidade: 75, valorContrato: 600000 }),
    oportunidade({ cliente: "Gama", estagio: "Diagnóstico", probabilidade: 30, valorContrato: 2000000 }),
    oportunidade({ cliente: "Eps", estagio: "Fechada ganha", valorContrato: 500000, dataPrevistaFechamento: "2026-08-05" }),
  ];

  it("commit é só estágio avançado com probabilidade alta", () => {
    // Antes disso o número é intenção, não previsão: a Gama vale 2 milhões e
    // não entra, porque ninguém pôs proposta na mesa dela.
    const f = montarForecast({ oportunidades: carteira, periodo: "2026-08" });
    expect(f.commit).toBe(1_400_000);
    expect(f.noCommit).toBe(2);
  });

  it("ganho não se mistura com previsão", () => {
    // Somar os dois num número só esconde quanto do mês ainda depende de
    // fechar alguma coisa.
    const f = montarForecast({ oportunidades: carteira, periodo: "2026-08" });
    expect(f.ganho).toBe(500_000);
    expect(f.commit).not.toContain?.(f.ganho);
    expect(f.bestCase).toBe(3_900_000);
  });

  it("ponderado continua sendo a média, e fica ao lado das outras duas", () => {
    expect(montarForecast({ oportunidades: carteira, periodo: "2026-08" }).ponderado).toBe(1_730_000);
  });

  it("a distância entre commit e best case é a informação", () => {
    // Commit perto do best case é mês previsível; commit baixo com best case
    // enorme é mês de torcida.
    const f = montarForecast({ oportunidades: carteira, periodo: "2026-08" });
    expect(f.bestCase).toBeGreaterThan(f.commit * 2);
  });

  it("respeita o limite de probabilidade declarado", () => {
    const limite = oportunidade({ probabilidade: PROBABILIDADE_DE_COMMIT });
    const abaixo = oportunidade({ probabilidade: PROBABILIDADE_DE_COMMIT - 1 });
    expect(montarForecast({ oportunidades: [limite], periodo: "2026-08" }).noCommit).toBe(1);
    expect(montarForecast({ oportunidades: [abaixo], periodo: "2026-08" }).noCommit).toBe(0);
  });
});

describe("meta, gap e cobertura", () => {
  const carteira = [oportunidade({ valorContrato: 1_000_000 })];

  it("sem meta não inventa gap nem cobertura", () => {
    // O erro clássico: assumir meta zero e declarar a meta batida.
    const f = montarForecast({ oportunidades: carteira, periodo: "2026-08" });
    expect(f.gap).toBeNull();
    expect(f.cobertura).toBeNull();
    expect(f.leitura).toContain("Meta do período não informada");
  });

  it("gap é o que falta depois do ganho e do commit", () => {
    const f = montarForecast({ oportunidades: carteira, meta: 3_000_000, periodo: "2026-08" });
    expect(f.gap).toBe(2_000_000);
  });

  it("gap não fica negativo quando a meta já foi superada", () => {
    const f = montarForecast({ oportunidades: carteira, meta: 500_000, periodo: "2026-08" });
    expect(f.gap).toBe(0);
    expect(f.leitura).toContain("já cobrem a meta");
  });

  it("cobertura é número, não rótulo", () => {
    // "Baixa cobertura" é opinião; 1.36× é fato, e cada time tem o seu piso.
    expect(montarForecast({ oportunidades: carteira, meta: 2_000_000, periodo: "2026-08" }).cobertura).toBe(0.5);
  });
});

describe("o que não tem dado não entra e é dito", () => {
  it("oportunidade sem data prevista não vira previsão de nenhum mês", () => {
    // Assumir que fecha no mês corrente é como o forecast infla sozinho.
    const semData = [oportunidade({ dataPrevistaFechamento: "" })];
    const f = montarForecast({ oportunidades: semData, periodo: "2026-08" });
    expect(f.quantidade).toBe(0);
    expect(f.lacunas.semDataPrevista).toBe(1);
  });

  it("conta quantas estão sem probabilidade", () => {
    const f = montarForecast({ oportunidades: [oportunidade({ probabilidade: "" })], periodo: "2026-08" });
    expect(f.lacunas.semProbabilidade).toBe(1);
  });

  it("carteira vazia e período vazio são leituras diferentes", () => {
    expect(montarForecast({ oportunidades: [] }).leitura).toBe("Nenhuma oportunidade registrada.");
    expect(montarForecast({ oportunidades: [oportunidade()], periodo: "2026-12" }).leitura)
      .toBe("Nenhuma oportunidade aberta com fechamento previsto para 2026-12.");
  });

  it("aguenta entrada ausente", () => {
    expect(montarForecast().quantidade).toBe(0);
    expect(montarForecast({ oportunidades: [null, undefined] }).pipeline).toBe(0);
  });

  it("valor mensal vira valor de contrato quando não há total", () => {
    const f = montarForecast({ oportunidades: [oportunidade({ valorContrato: 0, valorMensal: 10000, mesesContrato: 24 })], periodo: "2026-08" });
    expect(f.pipeline).toBe(240_000);
  });
});

describe("risco de concentração", () => {
  it("avisa quando poucos negócios são a maior parte do valor", () => {
    // Um forecast em que três negócios são metade do commit não é forecast,
    // é aposta.
    const risco = riscoDeConcentracao({
      oportunidades: [
        oportunidade({ cliente: "A", valorContrato: 900000 }),
        oportunidade({ cliente: "B", valorContrato: 800000 }),
        oportunidade({ cliente: "C", valorContrato: 700000 }),
        oportunidade({ cliente: "D", valorContrato: 100000 }),
        oportunidade({ cliente: "E", valorContrato: 50000 }),
      ],
    });
    expect(risco.concentrado).toBe(true);
    expect(risco.maiores.map((item) => item.nome)).toEqual(["A", "B", "C"]);
    expect(risco.leitura).toContain("perder um muda o mês");
  });

  it("carteira distribuída não vira alarme", () => {
    const iguais = Array.from({ length: 12 }, (_, i) => oportunidade({ cliente: `C${i}`, valorContrato: 100000 }));
    expect(riscoDeConcentracao({ oportunidades: iguais }).concentrado).toBe(false);
  });

  it("três ou menos oportunidades é dito como tal, não como concentração", () => {
    const risco = riscoDeConcentracao({ oportunidades: [oportunidade({ cliente: "A" })] });
    expect(risco.leitura).toContain("o forecast inteiro depende delas");
  });
});

describe("forecast recortado", () => {
  it("separa por qualquer dimensão e ordena pelo commit", () => {
    const recorte = forecastPor("vendedor", {
      oportunidades: [
        oportunidade({ vendedor: "Ana", estagio: "Negociação", probabilidade: 90, valorContrato: 500000 }),
        oportunidade({ vendedor: "Bruno", estagio: "Diagnóstico", probabilidade: 20, valorContrato: 900000 }),
      ],
      periodo: "2026-08",
    });
    expect(recorte[0].chave).toBe("Ana");
    expect(recorte[0].commit).toBe(500_000);
    expect(recorte[1].commit).toBe(0);
  });

  it("quem não tem a dimensão preenchida aparece como não informado", () => {
    expect(forecastPor("vendedor", { oportunidades: [oportunidade()] })[0].chave).toBe("Não informado");
  });
});

describe("o que trava o forecast", () => {
  it("lista as pendências com os nomes junto", () => {
    // "12 oportunidades incompletas" não faz ninguém arrumar nenhuma.
    const pendencias = pendenciasDoForecast({
      oportunidades: [oportunidade({ cliente: "Alfa", dataPrevistaFechamento: "", probabilidade: 0 })],
    });
    expect(pendencias.find((item) => item.id === "sem-data").contas).toEqual(["Alfa"]);
    expect(pendencias.find((item) => item.id === "sem-probabilidade").contas).toEqual(["Alfa"]);
  });

  it("acha o que está parado há tempo demais", () => {
    const pendencias = pendenciasDoForecast({
      oportunidades: [oportunidade({ cliente: "Parada", atualizadoEm: "2026-07-01T00:00:00Z", proximoPasso: "x" })],
      hoje: "2026-08-13T00:00:00Z",
    });
    expect(pendencias.find((item) => item.id === "parada").contas).toEqual(["Parada"]);
  });

  it("carteira em ordem não devolve pendência inventada", () => {
    expect(pendenciasDoForecast({
      oportunidades: [oportunidade({ proximoPasso: "Reunião", atualizadoEm: "2026-08-12T00:00:00Z" })],
      hoje: "2026-08-13T00:00:00Z",
    })).toEqual([]);
  });

  it("oportunidade fechada não entra em pendência nem em pipeline", () => {
    const fechada = [oportunidade({ estagio: "Fechada perdida", dataPrevistaFechamento: "" })];
    expect(pendenciasDoForecast({ oportunidades: fechada })).toEqual([]);
    expect(montarForecast({ oportunidades: fechada, periodo: "2026-08" }).pipeline).toBe(0);
  });
});
