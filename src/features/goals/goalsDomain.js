// ===== Metas e OKRs =====
// Camada pura: objetivos, resultados-chave, ciclos, progresso automático e
// histórico de evolução. Sem React e sem acesso a rede — tudo testável.

export const GOAL_CYCLES = [
  { id: "mensal", label: "Mensal", months: 1 },
  { id: "trimestral", label: "Trimestral", months: 3 },
  { id: "anual", label: "Anual", months: 12 },
];

export const KEY_RESULT_TYPES = [
  { id: "numero", label: "Número (de → até)" },
  { id: "percentual", label: "Percentual (0 a 100%)" },
  { id: "marco", label: "Marco (feito ou não feito)" },
  { id: "tarefas", label: "Tarefas concluídas (automático)" },
];

const pad = (n) => String(n).padStart(2, "0");
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const num = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

// Período de um ciclo a partir de uma data de referência (AAAA-MM-DD).
// Mensal: o mês. Trimestral: o trimestre civil. Anual: o ano.
export const cycleRange = (cycle, reference) => {
  const ref = /^\d{4}-\d{2}/.test(String(reference || ""))
    ? String(reference)
    : new Date().toISOString().slice(0, 10);
  const year = Number(ref.slice(0, 4));
  const month = Number(ref.slice(5, 7));
  if (cycle === "anual")
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      label: `${year}`,
    };
  if (cycle === "trimestral") {
    const quarter = Math.floor((month - 1) / 3);
    const startMonth = quarter * 3 + 1;
    const endMonth = startMonth + 2;
    const endDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
    return {
      start: `${year}-${pad(startMonth)}-01`,
      end: `${year}-${pad(endMonth)}-${pad(endDay)}`,
      label: `${quarter + 1}º trimestre de ${year}`,
    };
  }
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nomes = [
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
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(endDay)}`,
    label: `${nomes[month - 1]} de ${year}`,
  };
};

// Progresso de um resultado-chave, de 0 a 1.
// "tarefas" usa a contagem já resolvida em kr.doneCount / kr.totalCount.
export const keyResultProgress = (kr) => {
  if (!kr) return 0;
  if (kr.type === "marco") return kr.done ? 1 : 0;
  if (kr.type === "percentual") return clamp01(num(kr.current) / 100);
  if (kr.type === "tarefas") {
    const total = num(kr.totalCount);
    if (total <= 0) return 0;
    return clamp01(num(kr.doneCount) / total);
  }
  const start = num(kr.start);
  const target = num(kr.target);
  const current = num(kr.current, start);
  if (target === start) return current >= target ? 1 : 0;
  return clamp01((current - start) / (target - start));
};

// Progresso do objetivo: média dos resultados-chave, com peso opcional.
export const objectiveProgress = (objective) => {
  const krs = objective?.keyResults || [];
  if (krs.length === 0) return 0;
  let soma = 0;
  let pesos = 0;
  for (const kr of krs) {
    const peso = Math.max(0, num(kr.weight, 1));
    soma += keyResultProgress(kr) * peso;
    pesos += peso;
  }
  if (pesos === 0) return 0;
  return Math.round((soma / pesos) * 1000) / 1000;
};

// Quanto do ciclo já passou (0 a 1) numa data.
export const cycleElapsed = (range, today) => {
  const start = Date.parse(`${range?.start}T00:00:00Z`);
  const end = Date.parse(`${range?.end}T23:59:59Z`);
  const now = Date.parse(`${today}T12:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  if (!Number.isFinite(now)) return 0;
  return clamp01((now - start) / (end - start));
};

// Situação da meta comparando o progresso real com o tempo já decorrido.
// Uma tolerância de 10 pontos evita alarmar por diferença pequena.
export const goalStatus = (objective, today) => {
  const progress = objectiveProgress(objective);
  const range = cycleRange(objective?.cycle, objective?.reference);
  const elapsed = cycleElapsed(range, today);
  if (progress >= 1)
    return { state: "concluida", label: "Concluída", progress, elapsed };
  if (today > range.end)
    return { state: "encerrada", label: "Ciclo encerrado", progress, elapsed };
  const diferenca = progress - elapsed;
  if (diferenca >= -0.1)
    return { state: "no-prazo", label: "No ritmo", progress, elapsed };
  if (diferenca >= -0.25)
    return { state: "atencao", label: "Atenção", progress, elapsed };
  return { state: "risco", label: "Em risco", progress, elapsed };
};

// Resolve o progresso automático de resultados-chave ligados a tarefas ou
// projetos, devolvendo uma cópia do objetivo com doneCount/totalCount prontos.
export const resolveAutoProgress = (objective, { tasks = [] } = {}) => {
  const krs = (objective?.keyResults || []).map((kr) => {
    if (kr.type !== "tarefas") return kr;
    const alvo = String(kr.linkedProject || "").trim();
    const relacionadas = alvo
      ? tasks.filter((t) => String(t.project || "").trim() === alvo)
      : [];
    return {
      ...kr,
      totalCount: relacionadas.length,
      doneCount: relacionadas.filter(
        (t) => t.status === "concluida" || t.done === true,
      ).length,
    };
  });
  return { ...objective, keyResults: krs };
};

// Acrescenta um ponto ao histórico quando o progresso mudou de fato.
// Guarda no máximo `limit` pontos, do mais antigo para o mais recente.
export const appendProgressPoint = (objective, at, limit = 60) => {
  const progress = objectiveProgress(objective);
  const history = [...(objective?.history || [])];
  const ultimo = history[history.length - 1];
  if (ultimo && ultimo.progress === progress && ultimo.at.slice(0, 10) === at.slice(0, 10))
    return objective;
  if (ultimo && ultimo.at.slice(0, 10) === at.slice(0, 10)) history.pop();
  history.push({ at, progress });
  return { ...objective, history: history.slice(-limit) };
};

// Resumo do painel: quantas metas em cada situação e o progresso médio.
export const goalsSummary = (objectives = [], today) => {
  const lista = objectives || [];
  const contagem = {
    total: lista.length,
    concluidas: 0,
    noPrazo: 0,
    atencao: 0,
    risco: 0,
    encerradas: 0,
  };
  let soma = 0;
  for (const obj of lista) {
    const status = goalStatus(obj, today);
    soma += status.progress;
    if (status.state === "concluida") contagem.concluidas += 1;
    else if (status.state === "no-prazo") contagem.noPrazo += 1;
    else if (status.state === "atencao") contagem.atencao += 1;
    else if (status.state === "risco") contagem.risco += 1;
    else contagem.encerradas += 1;
  }
  return {
    ...contagem,
    progressoMedio: lista.length ? Math.round((soma / lista.length) * 1000) / 1000 : 0,
  };
};

// Texto curto de progresso para leitura ("62%" ou "3 de 8 tarefas").
export const keyResultLabel = (kr) => {
  if (!kr) return "";
  if (kr.type === "marco") return kr.done ? "Feito" : "Pendente";
  if (kr.type === "tarefas")
    return `${num(kr.doneCount)} de ${num(kr.totalCount)} tarefas`;
  if (kr.type === "percentual") return `${num(kr.current)}%`;
  const unidade = kr.unit ? ` ${kr.unit}` : "";
  return `${num(kr.current)}${unidade} de ${num(kr.target)}${unidade}`;
};

export const makeKeyResult = (id) => ({
  id,
  title: "",
  type: "numero",
  start: 0,
  target: 100,
  current: 0,
  unit: "",
  weight: 1,
  done: false,
  linkedProject: "",
  ownerId: "",
});

export const makeObjective = (id, { businessId = null, ownerId = null } = {}) => ({
  id,
  title: "",
  description: "",
  cycle: "trimestral",
  reference: new Date().toISOString().slice(0, 10),
  businessId,
  ownerId,
  keyResults: [],
  history: [],
  createdAt: new Date().toISOString(),
});
