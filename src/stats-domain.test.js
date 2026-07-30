import { describe, expect, it } from "vitest";
import {
  anomalies,
  cleanSeries,
  clusterValues,
  correlation,
  dataQuality,
  describe as descrever,
  explainDescribe,
  forecast,
  linearRegression,
  mean,
  median,
  movingAverage,
  outliers,
  quantile,
  stdDev,
  suggestChart,
  toNumber,
} from "./features/analytics/statsDomain.js";

describe("toNumber e cleanSeries", () => {
  it("aceita número e formato brasileiro", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber("1.250,50")).toBe(1250.5);
    expect(toNumber("R$ 300,00")).toBe(300);
  });

  it("devolve null para o que não é número", () => {
    expect(toNumber("abacaxi")).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber(null)).toBeNull();
  });

  it("separa números válidos, vazios e inválidos", () => {
    const r = cleanSeries([10, "20", "", null, "texto", 30]);
    expect(r.numbers).toEqual([10, 20, 30]);
    expect(r.empty).toBe(2);
    expect(r.skipped).toBe(1);
    expect(r.total).toBe(6);
  });
});

describe("medidas básicas", () => {
  it("média e mediana", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 2, 3])).toBe(2);
  });

  it("lista vazia devolve null, não zero", () => {
    expect(mean([])).toBeNull();
    expect(median([])).toBeNull();
  });

  it("desvio padrão da amostra", () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.14, 1);
  });

  it("com um único valor não existe desvio", () => {
    expect(stdDev([5])).toBeNull();
  });

  it("quartis por interpolação", () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(quantile([7], 0.9)).toBe(7);
    expect(quantile([], 0.5)).toBeNull();
  });
});

describe("describe", () => {
  it("resume a coluna com todas as medidas", () => {
    const s = descrever([10, 20, 30, 40, 50]);
    expect(s.count).toBe(5);
    expect(s.min).toBe(10);
    expect(s.max).toBe(50);
    expect(s.sum).toBe(150);
    expect(s.mean).toBe(30);
    expect(s.median).toBe(30);
    expect(s.iqr).toBe(20);
  });

  it("avisa quando não há número", () => {
    const s = descrever(["a", "b", ""]);
    expect(s.count).toBe(0);
    expect(s.message).toMatch(/Nenhum número válido/);
  });
});

describe("outliers", () => {
  it("acha o valor muito acima do padrão", () => {
    const r = outliers([10, 11, 12, 11, 10, 12, 900]);
    expect(r.high).toContain(900);
    expect(r.low).toEqual([]);
  });

  it("acha o valor muito abaixo", () => {
    const r = outliers([100, 102, 101, 99, 100, 1]);
    expect(r.low).toContain(1);
  });

  it("série pequena não gera conclusão", () => {
    expect(outliers([1, 500]).high).toEqual([]);
  });

  it("série uniforme não tem valor fora", () => {
    const r = outliers([5, 5, 5, 5, 5, 5]);
    expect(r.high).toEqual([]);
    expect(r.low).toEqual([]);
  });
});

describe("correlation", () => {
  it("relação positiva perfeita dá r = 1", () => {
    expect(correlation([1, 2, 3, 4], [2, 4, 6, 8]).r).toBe(1);
  });

  it("relação negativa perfeita dá r = -1", () => {
    const r = correlation([1, 2, 3, 4], [8, 6, 4, 2]);
    expect(r.r).toBe(-1);
    expect(r.direction).toBe("negativa");
  });

  it("classifica a força da relação", () => {
    expect(correlation([1, 2, 3, 4], [2, 4, 6, 8]).strength).toBe("forte");
  });

  it("sempre lembra que correlação não é causa", () => {
    expect(correlation([1, 2, 3, 4], [2, 4, 6, 8]).message).toMatch(
      /não significa que uma causa a outra/,
    );
  });

  it("menos de 3 pares é insuficiente, não zero", () => {
    const r = correlation([1, 2], [2, 4]);
    expect(r.r).toBeNull();
    expect(r.strength).toBe("insuficiente");
  });

  it("coluna sem variação não pode ser comparada", () => {
    const r = correlation([5, 5, 5, 5], [1, 2, 3, 4]);
    expect(r.r).toBeNull();
    expect(r.strength).toBe("sem-variacao");
  });

  it("ignora pares em que falta um dos lados", () => {
    expect(correlation([1, 2, "", 4], [2, 4, 6, 8]).pairs).toBe(3);
  });
});

describe("linearRegression", () => {
  it("acha a reta exata de dados lineares", () => {
    const m = linearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(m.slope).toBe(2);
    expect(m.intercept).toBe(1);
    expect(m.r2).toBe(1);
    expect(m.predict(5)).toBe(11);
  });

  it("r² menor que 1 quando os dados não são perfeitos", () => {
    const m = linearRegression([1, 2, 3, 4, 5], [2, 4, 5, 4, 6]);
    expect(m.r2).toBeLessThan(1);
    expect(m.r2).toBeGreaterThan(0);
  });

  it("é nulo com poucos pontos ou sem variação em x", () => {
    expect(linearRegression([1, 2], [1, 2])).toBeNull();
    expect(linearRegression([3, 3, 3], [1, 2, 3])).toBeNull();
  });
});

describe("movingAverage", () => {
  it("suaviza a série", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([2, 3, 4]);
  });

  it("série menor que a janela devolve vazio", () => {
    expect(movingAverage([1, 2], 3)).toEqual([]);
  });
});

describe("forecast", () => {
  it("projeta seguindo a tendência de subida", () => {
    const f = forecast([100, 110, 120, 130, 140, 150], 2);
    expect(f.trend).toBe("subindo");
    expect(f.values[0]).toBeCloseTo(160, 0);
    expect(f.values[1]).toBeCloseTo(170, 0);
  });

  it("identifica tendência de queda", () => {
    expect(forecast([200, 180, 160, 140], 1).trend).toBe("caindo");
  });

  it("com série curta e irregular, avisa que a projeção é fraca", () => {
    const f = forecast([10, 90, 20], 3);
    expect(f.confidence).toBe("baixa");
    expect(f.message).toMatch(/palpite/);
  });

  it("com série longa e regular, a confiança é alta", () => {
    const serie = Array.from({ length: 14 }, (_, i) => 100 + i * 10);
    expect(forecast(serie, 3).confidence).toBe("alta");
  });

  it("menos de 3 períodos não projeta nada", () => {
    const f = forecast([10, 20], 3);
    expect(f.values).toEqual([]);
    expect(f.confidence).toBe("insuficiente");
  });
});

describe("anomalies", () => {
  it("acha o mês fora do padrão", () => {
    const r = anomalies([100, 102, 98, 101, 99, 100, 400]);
    expect(r.points).toHaveLength(1);
    expect(r.points[0].value).toBe(400);
    expect(r.points[0].kind).toBe("acima");
  });

  it("acha queda anormal", () => {
    const r = anomalies([100, 102, 98, 101, 99, 100, 1]);
    expect(r.points[0].kind).toBe("abaixo");
  });

  it("série estável não gera anomalia", () => {
    const r = anomalies([100, 101, 99, 100, 101, 99]);
    expect(r.points).toEqual([]);
    expect(r.message).toMatch(/Nenhum período fora/);
  });

  it("série curta não conclui", () => {
    expect(anomalies([1, 2, 900]).points).toEqual([]);
  });

  it("série constante não tem desvio para comparar", () => {
    const r = anomalies([5, 5, 5, 5, 5, 5]);
    expect(r.points).toEqual([]);
    expect(r.message).toMatch(/não varia/);
  });
});

describe("clusterValues", () => {
  it("separa grupos bem distintos", () => {
    const grupos = clusterValues([1, 2, 3, 100, 101, 102, 500, 501], 3);
    expect(grupos).toHaveLength(3);
    const centros = grupos.map((g) => g.center).sort((a, b) => a - b);
    expect(centros[0]).toBeLessThan(10);
    expect(centros[2]).toBeGreaterThan(400);
  });

  it("é determinístico: duas execuções dão o mesmo resultado", () => {
    const dados = [4, 8, 15, 16, 23, 42, 50, 51];
    expect(JSON.stringify(clusterValues(dados, 3))).toBe(
      JSON.stringify(clusterValues(dados, 3)),
    );
  });

  it("k=1 devolve um grupo com tudo", () => {
    const g = clusterValues([1, 2, 3], 1);
    expect(g).toHaveLength(1);
    expect(g[0].values).toEqual([1, 2, 3]);
  });

  it("lista vazia devolve vazio", () => {
    expect(clusterValues([], 3)).toEqual([]);
  });

  it("k maior que a quantidade de dados é limitado", () => {
    expect(clusterValues([1, 2], 10).length).toBeLessThanOrEqual(2);
  });
});

describe("dataQuality", () => {
  const linhas = [
    { produto: "Bolo", valor: "100", data: "2026-07-01" },
    { produto: "Torta", valor: "200", data: "2026-07-02" },
    { produto: "Bolo", valor: "", data: "2026-07-03" },
    { produto: "Bolo", valor: "100", data: "2026-07-01" },
  ];

  it("detecta o tipo de cada coluna", () => {
    const q = dataQuality(linhas, ["produto", "valor", "data"]);
    const tipos = Object.fromEntries(q.columns.map((c) => [c.field, c.type]));
    expect(tipos.valor).toBe("numero");
    expect(tipos.data).toBe("data");
    expect(tipos.produto).toBe("texto");
  });

  it("mede o preenchimento e conta os distintos", () => {
    const q = dataQuality(linhas, ["produto", "valor"]);
    const valor = q.columns.find((c) => c.field === "valor");
    expect(valor.empty).toBe(1);
    expect(valor.completeness).toBe(75);
    const produto = q.columns.find((c) => c.field === "produto");
    expect(produto.distinct).toBe(2);
  });

  it("acha linhas idênticas", () => {
    const q = dataQuality(linhas, ["produto", "valor", "data"]);
    expect(q.duplicateRows).toHaveLength(1);
    expect(q.duplicateRows[0]).toEqual({ index: 3, sameAs: 0 });
  });

  it("coluna toda vazia é marcada como vazia", () => {
    const q = dataQuality([{ x: "" }, { x: null }], ["x"]);
    expect(q.columns[0].type).toBe("vazia");
  });
});

describe("suggestChart", () => {
  it("tempo pede linha", () => {
    expect(suggestChart({ xType: "data", yType: "numero" }).chart).toBe("linha");
  });

  it("poucas categorias pedem pizza; muitas pedem barras", () => {
    expect(
      suggestChart({ xType: "texto", yType: "numero", distinctX: 4 }).chart,
    ).toBe("pizza");
    expect(
      suggestChart({ xType: "texto", yType: "numero", distinctX: 30 }).chart,
    ).toBe("barras");
  });

  it("dois números pedem dispersão", () => {
    expect(
      suggestChart({ xType: "numero", yType: "numero", points: 20 }).chart,
    ).toBe("dispersao");
  });

  it("sem coluna numérica não há gráfico", () => {
    expect(suggestChart({ xType: "texto", yType: "texto" }).chart).toBe("nenhum");
  });

  it("sempre explica o motivo da escolha", () => {
    expect(suggestChart({ xType: "data", yType: "numero" }).reason).toBeTruthy();
  });
});

describe("explainDescribe", () => {
  it("avisa quando a média está distorcida por valores altos", () => {
    const texto = explainDescribe(descrever([10, 10, 10, 10, 1000]));
    expect(texto).toMatch(/média está bem acima da mediana/);
  });

  it("avisa quando os valores variam muito", () => {
    const texto = explainDescribe(descrever([1, 500, 3, 900, 2]));
    expect(texto).toMatch(/variam muito/);
  });

  it("diz quando os valores são parecidos", () => {
    const texto = explainDescribe(descrever([100, 102, 98, 101]));
    expect(texto).toMatch(/relativamente parecidos/);
  });

  it("conta os valores ignorados", () => {
    const texto = explainDescribe(descrever([10, 20, "abacaxi", 30]));
    expect(texto).toMatch(/1 valor\(es\) foram ignorados/);
  });

  it("sem dados, diz que não há o que analisar", () => {
    expect(explainDescribe(descrever([]))).toMatch(/não há números suficientes/i);
  });
});
