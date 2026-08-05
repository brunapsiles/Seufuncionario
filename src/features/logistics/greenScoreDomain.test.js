import { describe, expect, it } from "vitest";
import {
  PESOS_PADRAO,
  calcularGreenScore,
  compararComBase,
  explicarVariacao,
  validarPesos,
} from "./greenScoreDomain.js";

const entradas = {
  reducaoPercent: 60,
  ocupacaoPercent: 80,
  frotaLimpaPercent: 50,
  qualidadeDados: 90,
  operacoes: 100,
  ocorrencias: 5,
  calculadoEm: "2026-08-01T00:00:00.000Z",
};

describe("o score se explica", () => {
  it("os componentes vêm abertos, com peso e contribuição", () => {
    const r = calcularGreenScore(entradas);
    for (const comp of Object.values(r.componentes)) {
      expect(comp.rotulo).toBeTruthy();
      expect(comp.descricao).toBeTruthy();
      expect(comp.peso).toBeGreaterThan(0);
      expect(comp.contribuicao).toBeLessThanOrEqual(comp.maximo);
    }
  });

  it("a soma das contribuições é o score", () => {
    const r = calcularGreenScore(entradas);
    const soma = Object.values(r.componentes).reduce((a, c) => a + c.contribuicao, 0);
    expect(Math.round(soma)).toBe(Math.round(r.score));
  });

  it("carrega a versão dos pesos, a metodologia e o responsável", () => {
    const r = calcularGreenScore(entradas);
    expect(r.versaoPesos).toBe(PESOS_PADRAO.versao);
    expect(r.metodologia).toBeTruthy();
    expect(r.responsavel).toBeTruthy();
  });

  it("diz que não é certificação", () => {
    expect(calcularGreenScore(entradas).ressalva).toMatch(/não é certificação/i);
  });

  it("o mesmo insumo dá o mesmo score", () => {
    expect(calcularGreenScore(entradas)).toEqual(calcularGreenScore(entradas));
  });
});

describe("pesos", () => {
  it("precisam somar 100", () => {
    // Régua curta faz operação boa parecer ruim.
    expect(() =>
      calcularGreenScore(entradas, {
        ...PESOS_PADRAO,
        pesos: { ...PESOS_PADRAO.pesos, reducaoEmissoes: 30 },
      }),
    ).toThrow(/somar 100/i);
  });

  it("os pesos padrão são válidos", () => {
    expect(validarPesos(PESOS_PADRAO)).toBe(true);
  });

  it("componente desconhecido é erro, não peso ignorado em silêncio", () => {
    expect(() =>
      calcularGreenScore(entradas, {
        ...PESOS_PADRAO,
        pesos: { reducaoEmissoes: 50, inventado: 50 },
      }),
    ).toThrow(/desconhecido/i);
  });

  it("versão nova de pesos não reescreve o número antigo", () => {
    const v1 = calcularGreenScore(entradas);
    const v2 = calcularGreenScore(entradas, {
      ...PESOS_PADRAO,
      versao: "v2.2027",
      pesos: { reducaoEmissoes: 60, ocupacao: 10, eficienciaEnergetica: 10, qualidadeDados: 10, ocorrencias: 10 },
    });
    expect(v1.versaoPesos).toBe("v1.2026");
    expect(v2.versaoPesos).toBe("v2.2027");
    expect(v1.score).not.toBe(v2.score);
  });
});

describe("por que caiu", () => {
  it("no primeiro cálculo, diz que não há com o que comparar", () => {
    const e = explicarVariacao(calcularGreenScore(entradas), null);
    expect(e.variacao).toBe(0);
    expect(e.texto).toMatch(/não há período anterior/i);
  });

  it("aponta o componente que mais mexeu no total, não o que mais mudou em si", () => {
    // Ocupação cai 30 pontos (peso 20) e redução cai 20 (peso 40).
    // A redução mexe 8 no score; a ocupação, 6. A explicação tem que começar
    // pela redução.
    const antes = calcularGreenScore(entradas);
    const depois = calcularGreenScore({
      ...entradas,
      reducaoPercent: 40,
      ocupacaoPercent: 50,
    });
    const e = explicarVariacao(depois, antes);
    expect(e.fatores[0].chave).toBe("reducaoEmissoes");
    expect(e.texto).toMatch(/caiu/i);
    expect(e.texto).toMatch(/Redução de emissões/);
  });

  it("avisa quando parte da variação veio da régua, não da operação", () => {
    // Sem este aviso, o cliente acha que a operação piorou quando na verdade
    // foi o peso que mudou.
    const antes = calcularGreenScore(entradas);
    const depois = calcularGreenScore(entradas, {
      ...PESOS_PADRAO,
      versao: "v2.2027",
      pesos: { reducaoEmissoes: 20, ocupacao: 20, eficienciaEnergetica: 20, qualidadeDados: 20, ocorrencias: 20 },
    });
    const e = explicarVariacao(depois, antes);
    expect(e.trocaDeVersao).toBe(true);
    expect(e.texto).toMatch(/pesos mudaram/i);
  });

  it("sem mudança, diz que não mudou", () => {
    const r = calcularGreenScore(entradas);
    expect(explicarVariacao(r, r).texto).toMatch(/não mudou/i);
  });
});

describe("componentes", () => {
  it("operação sem ocorrência pontua cheio; com ocorrência, menos", () => {
    const limpa = calcularGreenScore({ ...entradas, ocorrencias: 0 });
    const suja = calcularGreenScore({ ...entradas, ocorrencias: 50 });
    expect(limpa.componentes.ocorrencias.valor).toBe(100);
    expect(suja.componentes.ocorrencias.valor).toBe(50);
  });

  it("sem operação registrada, ocorrências não pontuam por omissão", () => {
    // Dividir por zero e devolver 100 daria nota cheia a quem não operou.
    const r = calcularGreenScore({ ...entradas, operacoes: 0 });
    expect(r.componentes.ocorrencias.valor).toBe(0);
  });

  it("qualidade dos dados entra no score", () => {
    const bom = calcularGreenScore({ ...entradas, qualidadeDados: 100 });
    const ruim = calcularGreenScore({ ...entradas, qualidadeDados: 20 });
    expect(bom.score).toBeGreaterThan(ruim.score);
  });

  it("valor fora da faixa é contido, não estoura o score", () => {
    const r = calcularGreenScore({ ...entradas, reducaoPercent: 500, ocupacaoPercent: -20 });
    expect(r.componentes.reducaoEmissoes.valor).toBe(100);
    expect(r.componentes.ocupacao.valor).toBe(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("benchmark", () => {
  it("posiciona sem revelar quem é a base", () => {
    const c = compararComBase(80, [50, 60, 70, 90]);
    expect(c.posicao).toBe(75);
    expect(c.total).toBe(4);
    expect(c.texto).not.toMatch(/cliente|empresa|contrato/i);
  });

  it("sem base, não inventa comparação", () => {
    expect(compararComBase(80, []).posicao).toBeNull();
    expect(compararComBase(80).texto).toMatch(/ainda não há base/i);
  });

  it("calcula a mediana com número par de itens", () => {
    expect(compararComBase(80, [10, 20, 30, 40]).mediana).toBe(25);
  });
});
