// ===== Resultado do mês (DRE simples) =====
// Camada pura sobre o livro-caixa: quanto entrou, quanto saiu, para onde foi o
// dinheiro por categoria, e comparação com o mês anterior. Some as contas em
// aberto para separar regime de caixa (o que moveu) de competência (o que venceu).

import { parseBrNumber } from "../../domain.js";

const money = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  return parseBrNumber(value);
};
const round2 = (n) => Math.round(n * 100) / 100;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const monthLabel = (chave) => {
  const [ano, mes] = String(chave || "").split("-").map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return String(chave || "");
  return `${MESES[mes - 1]} de ${ano}`;
};

// Deslocamento de meses sobre a chave AAAA-MM, virando o ano corretamente.
export const shiftMonth = (chave, delta) => {
  const [ano, mes] = String(chave || "").split("-").map(Number);
  if (!ano || !mes) return chave;
  const total = (ano * 12 + (mes - 1)) + delta;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
};

const isReceita = (t) => String(t?.type || "") === "Receita";

const doMes = (transactions, chave) =>
  (transactions || []).filter(
    (t) => String(t?.date || "").slice(0, 7) === chave,
  );

// Resultado de um mês: receita, despesa, o que sobrou e a margem.
export const monthResult = (transactions, chave) => {
  const lista = doMes(transactions, chave);
  const receita = round2(
    lista.filter(isReceita).reduce((s, t) => s + money(t.value), 0),
  );
  const despesa = round2(
    lista.filter((t) => !isReceita(t)).reduce((s, t) => s + money(t.value), 0),
  );
  const resultado = round2(receita - despesa);
  return {
    month: chave,
    receita,
    despesa,
    resultado,
    // Margem sobre a receita. Sem receita, a margem não existe (não é 0%).
    margem: receita > 0 ? Math.round((resultado / receita) * 1000) / 10 : null,
    lancamentos: lista.length,
  };
};

// Série dos últimos N meses terminando no mês de referência, do mais antigo
// para o mais recente — a ordem em que se lê um gráfico.
export const monthSeries = (transactions, chave, months = 6) => {
  const serie = [];
  for (let i = months - 1; i >= 0; i -= 1)
    serie.push(monthResult(transactions, shiftMonth(chave, -i)));
  return serie;
};

// Para onde foi o dinheiro: total por categoria e a fatia de cada uma.
export const categoryBreakdown = (transactions, chave, type = "Despesa") => {
  const lista = doMes(transactions, chave).filter((t) =>
    type === "Receita" ? isReceita(t) : !isReceita(t),
  );
  const mapa = new Map();
  for (const t of lista) {
    const categoria = String(t.category || "").trim() || "Sem categoria";
    const atual = mapa.get(categoria) || { category: categoria, total: 0, count: 0 };
    atual.total = round2(atual.total + money(t.value));
    atual.count += 1;
    mapa.set(categoria, atual);
  }
  const total = round2([...mapa.values()].reduce((s, c) => s + c.total, 0));
  return [...mapa.values()]
    .map((c) => ({
      ...c,
      share: total > 0 ? Math.round((c.total / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
};

// Comparação com o mês anterior. `pct` é null quando não havia base de
// comparação — crescer a partir de zero não é "infinito por cento".
export const compareMonths = (transactions, chave) => {
  const atual = monthResult(transactions, chave);
  const anterior = monthResult(transactions, shiftMonth(chave, -1));
  const variacao = (agora, antes) => ({
    delta: round2(agora - antes),
    pct: antes > 0 ? Math.round(((agora - antes) / antes) * 1000) / 10 : null,
  });
  return {
    atual,
    anterior,
    receita: variacao(atual.receita, anterior.receita),
    despesa: variacao(atual.despesa, anterior.despesa),
    resultado: variacao(atual.resultado, anterior.resultado),
  };
};

// As maiores saídas do mês, para atacar o que realmente pesa.
export const topExpenses = (transactions, chave, limit = 5) =>
  doMes(transactions, chave)
    .filter((t) => !isReceita(t))
    .map((t) => ({
      id: t.id,
      description: t.description || "Sem descrição",
      category: String(t.category || "").trim() || "Sem categoria",
      value: money(t.value),
      date: String(t.date || "").slice(0, 10),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

// Caixa x competência: o que efetivamente moveu no mês contra o que venceu no
// mês. A diferença é exatamente o que atrasou ou foi pago fora do prazo.
export const cashVersusAccrual = (transactions, bills, chave) => {
  const caixa = monthResult(transactions, chave);
  const vencendoNoMes = (bills || []).filter(
    (b) => String(b?.dueDate || "").slice(0, 7) === chave,
  );
  const competenciaReceita = round2(
    vencendoNoMes
      .filter((b) => b.direction !== "pagar")
      .reduce((s, b) => s + money(b.value), 0),
  );
  const competenciaDespesa = round2(
    vencendoNoMes
      .filter((b) => b.direction === "pagar")
      .reduce((s, b) => s + money(b.value), 0),
  );
  return {
    caixa: {
      receita: caixa.receita,
      despesa: caixa.despesa,
      resultado: caixa.resultado,
    },
    competencia: {
      receita: competenciaReceita,
      despesa: competenciaDespesa,
      resultado: round2(competenciaReceita - competenciaDespesa),
    },
    diferencaReceita: round2(competenciaReceita - caixa.receita),
    diferencaDespesa: round2(competenciaDespesa - caixa.despesa),
  };
};

// Média mensal dos meses com movimento — base honesta para projetar.
export const averageMonthlyResult = (transactions, chave, months = 6) => {
  const serie = monthSeries(transactions, chave, months).filter(
    (m) => m.lancamentos > 0,
  );
  if (serie.length === 0)
    return { receita: 0, despesa: 0, resultado: 0, meses: 0 };
  const soma = serie.reduce(
    (acc, m) => ({
      receita: acc.receita + m.receita,
      despesa: acc.despesa + m.despesa,
      resultado: acc.resultado + m.resultado,
    }),
    { receita: 0, despesa: 0, resultado: 0 },
  );
  return {
    receita: round2(soma.receita / serie.length),
    despesa: round2(soma.despesa / serie.length),
    resultado: round2(soma.resultado / serie.length),
    meses: serie.length,
  };
};
