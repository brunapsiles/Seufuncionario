// ===== Análise de dados: estatística, tendência, anomalia e agrupamento =====
// Camada pura, sem biblioteca e sem Python. Tudo o que um negócio pequeno
// precisa perguntar aos próprios números, com o cuidado de dizer quando a
// amostra é pequena demais para concluir algo.

import { parseBrNumber } from "../../domain.js";

// CUIDADO: parseBrNumber remove tudo o que não é dígito e devolve 0 para texto
// puro. Confiar nele direto faria "abacaxi" valer 0 e envenenaria toda média.
// Por isso o valor precisa PARECER número antes de ser convertido.
export const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === "" || value === null || value === undefined) return null;
  const bruto = String(value).trim();
  // Data (2026-07-01) tem dígitos mas não é uma quantidade.
  if (/^\d{4}-\d{2}-\d{2}/.test(bruto)) return null;
  if (!/\d/.test(bruto)) return null;
  // Aceita "1.250,50", "R$ 300,00", "-42", "12%", e recusa o resto.
  if (!/^(r\$)?\s*-?[\d.,\s]+%?$/i.test(bruto)) return null;
  const n = parseBrNumber(bruto);
  return Number.isFinite(n) ? n : null;
};

// Só os números válidos da coluna. O que não é número é ignorado, mas contado.
export const cleanSeries = (values) => {
  const lista = values || [];
  const numeros = [];
  let ignorados = 0;
  let vazios = 0;
  for (const v of lista) {
    if (v === "" || v === null || v === undefined) {
      vazios += 1;
      continue;
    }
    const n = toNumber(v);
    if (n === null) ignorados += 1;
    else numeros.push(n);
  }
  return { numbers: numeros, skipped: ignorados, empty: vazios, total: lista.length };
};

const round = (n, casas = 2) => {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

export const mean = (numbers) => {
  const lista = numbers || [];
  if (lista.length === 0) return null;
  return round(lista.reduce((s, n) => s + n, 0) / lista.length);
};

export const median = (numbers) => {
  const lista = [...(numbers || [])].sort((a, b) => a - b);
  if (lista.length === 0) return null;
  const meio = Math.floor(lista.length / 2);
  return round(
    lista.length % 2 === 1 ? lista[meio] : (lista[meio - 1] + lista[meio]) / 2,
  );
};

// Desvio padrão da amostra (divide por n-1). Com um único valor não existe
// desvio — devolve null em vez de zero, que enganaria.
export const stdDev = (numbers) => {
  const lista = numbers || [];
  if (lista.length < 2) return null;
  const m = lista.reduce((s, n) => s + n, 0) / lista.length;
  const soma = lista.reduce((s, n) => s + (n - m) ** 2, 0);
  return round(Math.sqrt(soma / (lista.length - 1)));
};

// Quartis pelo método da interpolação linear.
export const quantile = (numbers, q) => {
  const lista = [...(numbers || [])].sort((a, b) => a - b);
  if (lista.length === 0) return null;
  if (lista.length === 1) return round(lista[0]);
  const pos = (lista.length - 1) * Math.min(1, Math.max(0, q));
  const base = Math.floor(pos);
  const resto = pos - base;
  const proximo = lista[base + 1] ?? lista[base];
  return round(lista[base] + resto * (proximo - lista[base]));
};

export const describe = (values) => {
  const { numbers, skipped, empty, total } = cleanSeries(values);
  if (numbers.length === 0)
    return { count: 0, skipped, empty, total, message: "Nenhum número válido nesta coluna." };
  const q1 = quantile(numbers, 0.25);
  const q3 = quantile(numbers, 0.75);
  return {
    count: numbers.length,
    skipped,
    empty,
    total,
    min: round(Math.min(...numbers)),
    max: round(Math.max(...numbers)),
    sum: round(numbers.reduce((s, n) => s + n, 0)),
    mean: mean(numbers),
    median: median(numbers),
    stdDev: stdDev(numbers),
    q1,
    q3,
    iqr: q1 != null && q3 != null ? round(q3 - q1) : null,
  };
};

// Valores fora do padrão pela regra do intervalo interquartil. É a regra que
// não assume distribuição normal — mais honesta para dados de negócio.
export const outliers = (values, { factor = 1.5 } = {}) => {
  const { numbers } = cleanSeries(values);
  if (numbers.length < 4) return { low: [], high: [], lowerBound: null, upperBound: null };
  const q1 = quantile(numbers, 0.25);
  const q3 = quantile(numbers, 0.75);
  const iqr = q3 - q1;
  const min = round(q1 - factor * iqr);
  const max = round(q3 + factor * iqr);
  return {
    lowerBound: min,
    upperBound: max,
    low: numbers.filter((n) => n < min),
    high: numbers.filter((n) => n > max),
  };
};

// Correlação de Pearson entre duas colunas, só nos pares em que ambos existem.
export const correlation = (xs, ys) => {
  const pares = [];
  const n = Math.min((xs || []).length, (ys || []).length);
  for (let i = 0; i < n; i += 1) {
    const x = toNumber(xs[i]);
    const y = toNumber(ys[i]);
    if (x !== null && y !== null) pares.push([x, y]);
  }
  if (pares.length < 3)
    return {
      r: null,
      pairs: pares.length,
      strength: "insuficiente",
      message: "São necessários pelo menos 3 pares de valores para comparar.",
    };
  const mx = pares.reduce((s, [x]) => s + x, 0) / pares.length;
  const my = pares.reduce((s, [, y]) => s + y, 0) / pares.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (const [x, y] of pares) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  if (dx === 0 || dy === 0)
    return {
      r: null,
      pairs: pares.length,
      strength: "sem-variacao",
      message: "Uma das colunas não varia, então não há o que comparar.",
    };
  const r = round(num / Math.sqrt(dx * dy), 3);
  const abs = Math.abs(r);
  const strength =
    abs >= 0.8 ? "forte" : abs >= 0.5 ? "moderada" : abs >= 0.3 ? "fraca" : "quase-nula";
  return {
    r,
    pairs: pares.length,
    strength,
    direction: r > 0 ? "positiva" : r < 0 ? "negativa" : "nenhuma",
    // Correlação não é causa. A mensagem existe para não deixar dúvida.
    message:
      abs < 0.3
        ? "Praticamente não há relação entre as duas colunas."
        : `Relação ${strength} e ${r > 0 ? "positiva" : "negativa"}. Isso não significa que uma causa a outra.`,
  };
};

// Regressão linear simples: y = a + b·x, com r² para dizer o quanto explica.
export const linearRegression = (xs, ys) => {
  const pares = [];
  const n = Math.min((xs || []).length, (ys || []).length);
  for (let i = 0; i < n; i += 1) {
    const x = toNumber(xs[i]);
    const y = toNumber(ys[i]);
    if (x !== null && y !== null) pares.push([x, y]);
  }
  if (pares.length < 3) return null;
  const mx = pares.reduce((s, [x]) => s + x, 0) / pares.length;
  const my = pares.reduce((s, [, y]) => s + y, 0) / pares.length;
  let num = 0;
  let den = 0;
  for (const [x, y] of pares) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  let ssTot = 0;
  let ssRes = 0;
  for (const [x, y] of pares) {
    ssTot += (y - my) ** 2;
    ssRes += (y - (intercept + slope * x)) ** 2;
  }
  return {
    slope: round(slope, 4),
    intercept: round(intercept, 4),
    r2: ssTot === 0 ? null : round(1 - ssRes / ssTot, 3),
    pairs: pares.length,
    predict: (x) => round(intercept + slope * Number(x)),
  };
};

export const movingAverage = (numbers, window = 3) => {
  const lista = numbers || [];
  const janela = Math.max(1, Math.floor(window));
  if (lista.length < janela) return [];
  const saida = [];
  for (let i = janela - 1; i < lista.length; i += 1) {
    const pedaco = lista.slice(i - janela + 1, i + 1);
    saida.push(round(pedaco.reduce((s, n) => s + n, 0) / janela));
  }
  return saida;
};

// Previsão por tendência linear sobre a série. Devolve também um aviso quando
// a série é curta — prever 6 meses com 3 pontos é chute, não previsão.
export const forecast = (numbers, periods = 3) => {
  const lista = (numbers || []).map(toNumber).filter((n) => n !== null);
  if (lista.length < 3)
    return {
      values: [],
      confidence: "insuficiente",
      message: "Com menos de 3 períodos não dá para projetar tendência.",
    };
  const xs = lista.map((_, i) => i + 1);
  const modelo = linearRegression(xs, lista);
  if (!modelo)
    return { values: [], confidence: "insuficiente", message: "Série sem variação." };
  const valores = [];
  for (let i = 1; i <= Math.max(1, periods); i += 1)
    valores.push(modelo.predict(lista.length + i));
  const r2 = modelo.r2 ?? 0;
  const confianca =
    lista.length >= 12 && r2 >= 0.7
      ? "alta"
      : lista.length >= 6 && r2 >= 0.4
        ? "media"
        : "baixa";
  return {
    values: valores,
    slope: modelo.slope,
    r2: modelo.r2,
    confidence: confianca,
    trend: modelo.slope > 0 ? "subindo" : modelo.slope < 0 ? "caindo" : "estável",
    message:
      confianca === "baixa"
        ? `Projeção fraca: ${lista.length} períodos e tendência pouco definida. Trate como palpite, não como plano.`
        : confianca === "media"
          ? "Projeção razoável, mas confira antes de assumir compromisso."
          : "Projeção consistente com o histórico.",
  };
};

// Anomalias numa série temporal: pontos muito longe da média em desvios padrão.
export const anomalies = (numbers, { threshold = 2 } = {}) => {
  const lista = (numbers || []).map(toNumber).filter((n) => n !== null);
  if (lista.length < 5)
    return { points: [], message: "São necessários pelo menos 5 períodos." };
  const m = lista.reduce((s, n) => s + n, 0) / lista.length;
  const dp = stdDev(lista);
  if (!dp) return { points: [], message: "A série não varia." };
  const pontos = [];
  lista.forEach((valor, i) => {
    const z = round((valor - m) / dp, 2);
    if (Math.abs(z) >= threshold)
      pontos.push({
        index: i,
        value: round(valor),
        z,
        kind: z > 0 ? "acima" : "abaixo",
      });
  });
  return {
    points: pontos,
    mean: round(m),
    stdDev: dp,
    message:
      pontos.length === 0
        ? "Nenhum período fora do padrão."
        : `${pontos.length} ${pontos.length === 1 ? "período fora" : "períodos fora"} do padrão.`,
  };
};

// Agrupamento em uma dimensão (k-means 1D com início determinístico, para o
// resultado não mudar a cada execução).
export const clusterValues = (values, k = 3, { maxIterations = 50 } = {}) => {
  const { numbers } = cleanSeries(values);
  const grupos = Math.max(1, Math.min(Math.floor(k), numbers.length));
  if (numbers.length === 0) return [];
  if (grupos === 1)
    return [{ center: mean(numbers), values: [...numbers].sort((a, b) => a - b) }];
  const ordenados = [...numbers].sort((a, b) => a - b);
  // Início por quantis: determinístico e já bem distribuído.
  let centros = Array.from({ length: grupos }, (_, i) =>
    quantile(ordenados, (i + 0.5) / grupos),
  );
  for (let iter = 0; iter < maxIterations; iter += 1) {
    const buckets = Array.from({ length: grupos }, () => []);
    for (const n of ordenados) {
      let melhor = 0;
      let dist = Infinity;
      centros.forEach((c, i) => {
        const d = Math.abs(n - c);
        if (d < dist) {
          dist = d;
          melhor = i;
        }
      });
      buckets[melhor].push(n);
    }
    const novos = buckets.map((b, i) => (b.length > 0 ? mean(b) : centros[i]));
    const mudou = novos.some((c, i) => c !== centros[i]);
    centros = novos;
    if (!mudou)
      return buckets
        .map((b, i) => ({ center: centros[i], values: b }))
        .filter((g) => g.values.length > 0);
  }
  return centros
    .map((c) => ({ center: c, values: [] }))
    .filter((g) => g.center != null);
};

// Qualidade dos dados: o que está faltando, o que está repetido, e o tipo.
export const dataQuality = (rows, fields) => {
  const lista = rows || [];
  const colunas = (fields || []).map((campo) => {
    const valores = lista.map((r) => r?.[campo]);
    const { numbers, skipped, empty } = cleanSeries(valores);
    const naoVazios = valores.filter((v) => v !== "" && v != null);
    const distintos = new Set(naoVazios.map((v) => String(v))).size;
    const tipo =
      naoVazios.length === 0
        ? "vazia"
        : numbers.length >= naoVazios.length * 0.8
          ? "numero"
          : naoVazios.every((v) => /^\d{4}-\d{2}-\d{2}/.test(String(v)))
            ? "data"
            : "texto";
    return {
      field: campo,
      type: tipo,
      filled: naoVazios.length,
      empty,
      invalidNumbers: tipo === "numero" ? skipped : 0,
      distinct: distintos,
      completeness: lista.length
        ? Math.round((naoVazios.length / lista.length) * 100)
        : 0,
    };
  });
  // Linhas idênticas em todos os campos escolhidos.
  const vistos = new Map();
  const duplicadas = [];
  lista.forEach((r, i) => {
    const chave = (fields || []).map((f) => String(r?.[f] ?? "")).join("");
    if (vistos.has(chave)) duplicadas.push({ index: i, sameAs: vistos.get(chave) });
    else vistos.set(chave, i);
  });
  return { rows: lista.length, columns: colunas, duplicateRows: duplicadas };
};

// Sugere o gráfico adequado a partir da forma dos dados — a escolha errada de
// gráfico é o jeito mais comum de mentir sem querer.
export const suggestChart = ({ xType, yType, distinctX = 0, points = 0 } = {}) => {
  if (yType !== "numero")
    return { chart: "nenhum", reason: "Sem uma coluna numérica não há o que plotar." };
  if (xType === "data")
    return { chart: "linha", reason: "Valor ao longo do tempo pede linha." };
  if (xType === "texto" && distinctX > 0 && distinctX <= 8)
    return {
      chart: "pizza",
      reason: "Poucas categorias somando um todo: pizza funciona.",
    };
  if (xType === "texto")
    return { chart: "barras", reason: "Muitas categorias: barras compara melhor." };
  if (xType === "numero" && points >= 5)
    return {
      chart: "dispersao",
      reason: "Dois números por ponto: dispersão mostra a relação.",
    };
  return { chart: "barras", reason: "Barras é a escolha segura para este formato." };
};

// Explica o resultado em português claro, sem jargão, para a titular decidir.
export const explainDescribe = (stats, { label = "os valores" } = {}) => {
  if (!stats || stats.count === 0) return "Não há números suficientes para analisar.";
  const partes = [
    `${stats.count} ${stats.count === 1 ? "valor" : "valores"} de ${label}.`,
    `A média é ${stats.mean} e a mediana é ${stats.median}.`,
  ];
  if (stats.mean != null && stats.median != null) {
    const diferenca = Math.abs(stats.mean - stats.median);
    const escala = Math.abs(stats.median) || 1;
    if (diferenca / escala > 0.2)
      partes.push(
        stats.mean > stats.median
          ? "A média está bem acima da mediana: alguns valores altos estão puxando o resultado para cima."
          : "A média está bem abaixo da mediana: alguns valores baixos estão puxando o resultado para baixo.",
      );
  }
  if (stats.stdDev != null && stats.mean) {
    const variacao = Math.abs(stats.stdDev / stats.mean);
    partes.push(
      variacao > 0.5
        ? "Os valores variam muito entre si, então a média explica pouco."
        : "Os valores são relativamente parecidos entre si.",
    );
  }
  if (stats.skipped > 0)
    partes.push(`${stats.skipped} valor(es) foram ignorados por não serem número.`);
  return partes.join(" ");
};
