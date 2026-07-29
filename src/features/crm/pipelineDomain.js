// ===== Funil de vendas: oportunidades, etapas e previsão =====
// Camada pura. O CRM atual guarda leads com uma etapa de texto fixa. Aqui a
// etapa passa a ter probabilidade, a oportunidade tem data prevista de
// fechamento, e disso saem previsão ponderada, taxa de conversão e ciclo médio.

import { parseBrNumber } from "../../domain.js";

const money = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  return parseBrNumber(value);
};
const round2 = (n) => Math.round(n * 100) / 100;
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

// Etapas padrão de um funil simples, com a probabilidade típica de cada uma.
export const DEFAULT_STAGES = [
  { id: "novo", name: "Novo contato", probability: 10 },
  { id: "conversa", name: "Em conversa", probability: 25 },
  { id: "proposta", name: "Proposta enviada", probability: 50 },
  { id: "negociacao", name: "Negociação", probability: 75 },
  { id: "ganho", name: "Ganho", probability: 100, won: true },
  { id: "perdido", name: "Perdido", probability: 0, lost: true },
];

export const LOSS_REASONS = [
  "Preço",
  "Prazo",
  "Escolheu concorrente",
  "Sem orçamento",
  "Sem resposta",
  "Fora do perfil",
  "Outro",
];

export const stageById = (pipeline, stageId) =>
  (pipeline?.stages || DEFAULT_STAGES).find((s) => s.id === stageId) || null;

// Etapas que ainda estão em disputa (nem ganhas nem perdidas).
export const openStages = (pipeline) =>
  (pipeline?.stages || DEFAULT_STAGES).filter((s) => !s.won && !s.lost);

export const isOpen = (opp, pipeline) => {
  const stage = stageById(pipeline, opp?.stageId);
  return !!stage && !stage.won && !stage.lost;
};

// Probabilidade efetiva: a da oportunidade quando informada, senão a da etapa.
export const opportunityProbability = (opp, pipeline) => {
  const stage = stageById(pipeline, opp?.stageId);
  if (opp?.probability === "" || opp?.probability === null || opp?.probability === undefined)
    return stage ? Number(stage.probability) || 0 : 0;
  const n = Number(opp.probability);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};

// Valor ponderado: o que se espera de fato faturar desta oportunidade.
export const weightedValue = (opp, pipeline) =>
  round2((money(opp?.value) * opportunityProbability(opp, pipeline)) / 100);

// Dias desde a criação da oportunidade.
export const opportunityAge = (opp, today) => {
  const created = String(opp?.createdAt || "").slice(0, 10);
  if (!isDate(created) || !isDate(today)) return 0;
  return Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${created}T00:00:00Z`)) /
      86400000,
  );
};

// Dias parada na etapa atual — o melhor sinal de negócio esquecido.
export const daysInStage = (opp, today) => {
  const historico = opp?.stageHistory || [];
  const ultima = historico[historico.length - 1];
  const desde = String(ultima?.at || opp?.createdAt || "").slice(0, 10);
  if (!isDate(desde) || !isDate(today)) return 0;
  return Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) /
      86400000,
  );
};

// Move a oportunidade de etapa, guardando o histórico (base do ciclo médio).
export const moveStage = (opp, stageId, at) => {
  if (!opp || opp.stageId === stageId) return opp;
  return {
    ...opp,
    stageId,
    stageHistory: [...(opp.stageHistory || []), { stageId, at }],
  };
};

// Números por etapa: quantidade, valor total e valor ponderado.
export const stageMetrics = (opportunities, pipeline) => {
  const stages = pipeline?.stages || DEFAULT_STAGES;
  return stages.map((stage) => {
    const doStage = (opportunities || []).filter((o) => o.stageId === stage.id);
    const total = doStage.reduce((soma, o) => soma + money(o.value), 0);
    const ponderado = doStage.reduce(
      (soma, o) => soma + weightedValue(o, pipeline),
      0,
    );
    return {
      ...stage,
      count: doStage.length,
      total: round2(total),
      weighted: round2(ponderado),
    };
  });
};

// Taxa de passagem de uma etapa aberta para a seguinte, considerando que quem
// avançou já passou pelas anteriores. Lê-se "de cada 10 que chegaram aqui,
// quantas seguiram adiante".
export const conversionRates = (opportunities, pipeline) => {
  const abertas = openStages(pipeline);
  const stages = pipeline?.stages || DEFAULT_STAGES;
  const ganhas = stages.filter((s) => s.won).map((s) => s.id);
  const ordem = [...abertas.map((s) => s.id), ...ganhas];
  const alcancou = (stageId) => {
    const indice = ordem.indexOf(stageId);
    if (indice < 0) return 0;
    // Quem está numa etapa igual ou posterior já passou por esta.
    return (opportunities || []).filter((o) => {
      const pos = ordem.indexOf(o.stageId);
      return pos >= indice;
    }).length;
  };
  return ordem.slice(0, -1).map((stageId, i) => {
    const daqui = alcancou(stageId);
    const proxima = alcancou(ordem[i + 1]);
    return {
      from: stageId,
      to: ordem[i + 1],
      reached: daqui,
      advanced: proxima,
      rate: daqui > 0 ? Math.round((proxima / daqui) * 1000) / 10 : 0,
    };
  });
};

// Ciclo médio de venda: dias entre criação e fechamento das oportunidades
// ganhas. Só conta as que têm data de fechamento registrada.
export const averageSalesCycle = (opportunities, pipeline) => {
  const stages = pipeline?.stages || DEFAULT_STAGES;
  const ganhas = (opportunities || []).filter((o) => {
    const stage = stageById({ stages }, o.stageId);
    return stage?.won && isDate(String(o.closedAt || "").slice(0, 10));
  });
  if (ganhas.length === 0) return 0;
  const soma = ganhas.reduce((total, o) => {
    const criada = String(o.createdAt || "").slice(0, 10);
    const fechada = String(o.closedAt || "").slice(0, 10);
    if (!isDate(criada)) return total;
    return (
      total +
      Math.max(
        0,
        Math.round(
          (Date.parse(`${fechada}T00:00:00Z`) - Date.parse(`${criada}T00:00:00Z`)) /
            86400000,
        ),
      )
    );
  }, 0);
  return Math.round(soma / ganhas.length);
};

// Painel do funil.
export const pipelineSummary = (opportunities, pipeline) => {
  const lista = opportunities || [];
  const stages = pipeline?.stages || DEFAULT_STAGES;
  const ganhas = lista.filter((o) => stageById({ stages }, o.stageId)?.won);
  const perdidas = lista.filter((o) => stageById({ stages }, o.stageId)?.lost);
  const abertas = lista.filter((o) => isOpen(o, { stages }));
  const valorAberto = abertas.reduce((s, o) => s + money(o.value), 0);
  const ponderado = abertas.reduce((s, o) => s + weightedValue(o, { stages }), 0);
  const valorGanho = ganhas.reduce((s, o) => s + money(o.value), 0);
  const decididas = ganhas.length + perdidas.length;
  return {
    abertas: abertas.length,
    ganhas: ganhas.length,
    perdidas: perdidas.length,
    valorAberto: round2(valorAberto),
    valorPonderado: round2(ponderado),
    valorGanho: round2(valorGanho),
    taxaGanho: decididas > 0 ? Math.round((ganhas.length / decididas) * 1000) / 10 : 0,
    ticketMedio: ganhas.length > 0 ? round2(valorGanho / ganhas.length) : 0,
    cicloMedio: averageSalesCycle(lista, { stages }),
  };
};

// Previsão por mês a partir da data prevista de fechamento das oportunidades
// abertas. Devolve sempre `months` meses a partir do mês de referência.
export const forecastByMonth = (opportunities, pipeline, { from, months = 3 } = {}) => {
  const inicio = isDate(from) ? from : new Date().toISOString().slice(0, 10);
  const [ano, mes] = inicio.split("-").map(Number);
  const periodos = [];
  for (let i = 0; i < months; i += 1) {
    const total = mes - 1 + i;
    const y = ano + Math.floor(total / 12);
    const m = (total % 12) + 1;
    const chave = `${y}-${String(m).padStart(2, "0")}`;
    const doMes = (opportunities || []).filter(
      (o) =>
        isOpen(o, pipeline) &&
        String(o.expectedCloseDate || "").slice(0, 7) === chave,
    );
    periodos.push({
      month: chave,
      count: doMes.length,
      total: round2(doMes.reduce((s, o) => s + money(o.value), 0)),
      weighted: round2(
        doMes.reduce((s, o) => s + weightedValue(o, pipeline), 0),
      ),
    });
  }
  return periodos;
};

// Oportunidades paradas há muito tempo na mesma etapa, da mais esquecida para
// a menos. Só considera as que ainda estão em disputa.
export const stalledOpportunities = (opportunities, pipeline, today, days = 14) =>
  (opportunities || [])
    .filter((o) => isOpen(o, pipeline))
    .map((opp) => ({ opp, days: daysInStage(opp, today) }))
    .filter(({ days: d }) => d >= days)
    .sort((a, b) => b.days - a.days);

// Motivos de perda agrupados — para saber por que se perde, não só quanto.
export const lossBreakdown = (opportunities, pipeline) => {
  const stages = pipeline?.stages || DEFAULT_STAGES;
  const perdidas = (opportunities || []).filter(
    (o) => stageById({ stages }, o.stageId)?.lost,
  );
  const mapa = new Map();
  for (const opp of perdidas) {
    const motivo = String(opp.lossReason || "").trim() || "Não informado";
    const atual = mapa.get(motivo) || { reason: motivo, count: 0, total: 0 };
    atual.count += 1;
    atual.total = round2(atual.total + money(opp.value));
    mapa.set(motivo, atual);
  }
  return [...mapa.values()].sort((a, b) => b.count - a.count);
};

export const makePipeline = (id, name = "Funil principal") => ({
  id,
  name,
  stages: DEFAULT_STAGES.map((s) => ({ ...s })),
});

export const makeOpportunity = (
  id,
  { businessId = null, ownerId = null, stageId = "novo", createdAt } = {},
) => ({
  id,
  title: "",
  contactName: "",
  company: "",
  value: "",
  stageId,
  probability: "",
  expectedCloseDate: "",
  origin: "",
  notes: "",
  lossReason: "",
  closedAt: "",
  stageHistory: [],
  businessId,
  ownerId,
  createdAt: createdAt || new Date().toISOString(),
});
