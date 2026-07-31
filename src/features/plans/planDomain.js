// ===== Planos e limites de uso =====
// Camada pura. Existe por dois motivos que puxam para o mesmo lado: permitir
// cobrar por uso maior, e impedir que uma conta sozinha consuma a cota de IA de
// todo mundo. Sem isso o app não tem como ser vendido nem como se defender.

// ---------------------------------------------------------------------------
// Lançamento: tudo liberado para todo mundo
// ---------------------------------------------------------------------------

// Decisão da titular em 31/07/2026: no primeiro momento o app é 100% gratuito
// para todos. Nada é cobrado e nenhum recurso fica atrás de plano pago.
//
// O teto abaixo NÃO é comercial, é de sobrevivência: a IA do app roda na cota
// grátis dos provedores (Gemini, Groq), que é compartilhada por TODAS as
// contas. Uma conta em laço infinito, ou alguém agindo de má-fé, derrubaria a
// IA para todo mundo. Os números são altos de propósito — quem usa o app de
// verdade, o dia inteiro, não chega perto.
//
// Para começar a cobrar depois, basta trocar LAUNCH_MODE para false: o catálogo
// de planos pagos abaixo já está pronto e testado.
export const LAUNCH_MODE = true;

export const LAUNCH_PLAN = {
  id: "lancamento",
  name: "Lançamento",
  price: 0,
  pitch: "Tudo liberado, de graça, enquanto o app está em lançamento.",
  limits: {
    aiPerMonth: 5000,
    webSearchPerMonth: 1000,
    agentRunsPerMonth: 1000,
    members: 15,
    businesses: null,
    storageMb: 1000,
  },
};

// `null` quer dizer "sem limite". Nunca usar 0 para isso: zero é um limite
// legítimo (recurso desligado no plano) e confundir os dois libera o que
// deveria estar bloqueado.
export const PLANS = [
  {
    id: "gratuito",
    name: "Gratuito",
    price: 0,
    pitch: "Para começar a organizar o negócio.",
    limits: {
      aiPerMonth: 100,
      webSearchPerMonth: 30,
      agentRunsPerMonth: 20,
      members: 1,
      businesses: 1,
      storageMb: 20,
    },
  },
  {
    id: "profissional",
    name: "Profissional",
    price: 4900, // centavos
    pitch: "Para quem já usa todo dia e precisa de folga.",
    limits: {
      aiPerMonth: 2000,
      webSearchPerMonth: 500,
      agentRunsPerMonth: 300,
      members: 3,
      businesses: 3,
      storageMb: 500,
    },
  },
  {
    id: "equipe",
    name: "Equipe",
    price: 14900,
    pitch: "Para o time inteiro trabalhando junto.",
    limits: {
      aiPerMonth: 10000,
      webSearchPerMonth: 3000,
      agentRunsPerMonth: 2000,
      members: 15,
      businesses: null,
      storageMb: 5000,
    },
  },
];

export const METRICS = {
  aiPerMonth: {
    id: "aiPerMonth",
    label: "Conversas com a IA",
    unit: "por mês",
    periodic: true,
  },
  webSearchPerMonth: {
    id: "webSearchPerMonth",
    label: "Buscas na internet",
    unit: "por mês",
    periodic: true,
  },
  agentRunsPerMonth: {
    id: "agentRunsPerMonth",
    label: "Execuções de agente",
    unit: "por mês",
    periodic: true,
  },
  members: { id: "members", label: "Pessoas no time", unit: "", periodic: false },
  businesses: { id: "businesses", label: "Negócios", unit: "", periodic: false },
  storageMb: { id: "storageMb", label: "Espaço usado", unit: "MB", periodic: false },
};

export const FREE_PLAN_ID = "gratuito";

// Durante o lançamento todo mundo cai aqui. Depois, quando LAUNCH_MODE virar
// false, o padrão volta a ser o gratuito e os planos pagos passam a valer.
export const DEFAULT_PLAN_ID = LAUNCH_MODE ? LAUNCH_PLAN.id : FREE_PLAN_ID;

const ALL_PLANS = [LAUNCH_PLAN, ...PLANS];

// Plano desconhecido cai no PADRÃO, nunca no mais liberal por acidente. Um id
// digitado errado, vindo de banco corrompido ou forjado numa requisição não
// pode virar acesso ilimitado — esse é o erro clássico deste tipo de código.
// Hoje o padrão é generoso porque é o que todo mundo tem de qualquer forma;
// quando a cobrança começar, o mesmo caminho passa a cair no gratuito sozinho.
export const planById = (id) =>
  ALL_PLANS.find((p) => p.id === id) ||
  ALL_PLANS.find((p) => p.id === DEFAULT_PLAN_ID);

// Só o catálogo vale. Um objeto de plano com limites escritos à mão é ignorado
// de propósito: se o plano chegasse de uma requisição, bastaria enviar
// `{limits:{aiPerMonth:999999}}` para liberar tudo. Resolver sempre pelo id
// contra PLANS fecha essa porta. Não trocar por leitura direta de `plan.limits`.
export const limitFor = (plan, metric) => {
  const limites = planById(plan?.id ?? plan)?.limits || {};
  if (!Object.prototype.hasOwnProperty.call(limites, metric)) return 0;
  const valor = limites[metric];
  if (valor === null) return null; // sem limite
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

// ---------------------------------------------------------------------------
// Período e consumo
// ---------------------------------------------------------------------------

// Cota mensal precisa de um período explícito, senão o consumo do mês passado
// continua contando contra o mês atual.
export const periodOf = (date) => {
  const s = String(date || "");
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = date instanceof Date ? date : new Date();
  return Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 7)
    : d.toISOString().slice(0, 7);
};

export const makeUsage = (period) => ({ period, counts: {} });

// Consumo de período diferente do atual vale ZERO: o mês virou, a cota renovou.
export const usedIn = (usage, metric, period) => {
  if (!usage || !metric) return 0;
  const m = METRICS[metric];
  if (m?.periodic && period && usage.period !== period) return 0;
  const n = Number(usage.counts?.[metric]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

export const addUsage = (usage, metric, quantity, period) => {
  const p = period || usage?.period || periodOf();
  const base =
    !usage || (METRICS[metric]?.periodic && usage.period !== p)
      ? makeUsage(p)
      : { period: usage.period, counts: { ...usage.counts } };
  const q = Number(quantity);
  if (!METRICS[metric] || !Number.isFinite(q) || q <= 0) return base;
  base.counts[metric] = (Number(base.counts[metric]) || 0) + Math.floor(q);
  return base;
};

// Medida que não é de período (pessoas, negócios, espaço) é contada agora, não
// acumulada: o valor certo é quantos existem hoje.
export const setUsage = (usage, metric, value, period) => {
  const p = period || usage?.period || periodOf();
  const base = usage
    ? { period: usage.period || p, counts: { ...usage.counts } }
    : makeUsage(p);
  const n = Number(value);
  if (!METRICS[metric]) return base;
  base.counts[metric] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return base;
};

// ---------------------------------------------------------------------------
// Checagem
// ---------------------------------------------------------------------------

// A pergunta que isto responde é "posso fazer mais N disso agora?".
// Bater exatamente no limite BLOQUEIA: limite de 100 significa que a 101ª não
// entra, e o consumo nunca pode passar do contratado.
export const checkQuota = (plan, usage, metric, quantity = 1, period) => {
  const p = period || periodOf();
  const limite = limitFor(plan, metric);
  const usado = usedIn(usage, metric, p);
  const pedido = Math.max(1, Math.floor(Number(quantity) || 1));

  if (!METRICS[metric])
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      unlimited: false,
      message: "Esse tipo de uso não é reconhecido pelo app.",
    };

  if (limite === null)
    return {
      allowed: true,
      used: usado,
      limit: null,
      remaining: null,
      unlimited: true,
      message: "",
    };

  const restante = Math.max(0, limite - usado);
  const permitido = usado + pedido <= limite;
  // O rótulo não vira minúscula: "IA" viraria "ia" e a frase ficaria feia.
  const rotulo = METRICS[metric].label;

  return {
    allowed: permitido,
    used: usado,
    limit: limite,
    remaining: restante,
    unlimited: false,
    message: permitido
      ? ""
      : limite === 0
        ? `${rotulo} não faz parte do seu plano.`
        : `Você usou ${usado} de ${limite} — é o limite de "${rotulo}" do seu plano neste mês. A cota volta no dia 1º.`,
  };
};

export const percentUsed = (plan, usage, metric, period) => {
  const limite = limitFor(plan, metric);
  if (limite === null) return 0;
  if (limite === 0) return 100;
  const usado = usedIn(usage, metric, period || periodOf());
  return Math.min(100, Math.round((usado / limite) * 100));
};

export const STATUS = {
  ok: "ok",
  atencao: "atencao", // 80% ou mais
  esgotado: "esgotado",
};

export const metricStatus = (plan, usage, metric, period) => {
  const limite = limitFor(plan, metric);
  if (limite === null) return STATUS.ok;
  const pct = percentUsed(plan, usage, metric, period);
  if (pct >= 100) return STATUS.esgotado;
  if (pct >= 80) return STATUS.atencao;
  return STATUS.ok;
};

export const usageSummary = (plan, usage, period) => {
  const p = period || periodOf();
  const atual = planById(plan?.id ?? plan);
  return Object.values(METRICS).map((m) => {
    const limite = limitFor(atual, m.id);
    return {
      metric: m.id,
      label: m.label,
      unit: m.unit,
      used: usedIn(usage, m.id, p),
      limit: limite,
      unlimited: limite === null,
      percent: percentUsed(atual, usage, m.id, p),
      status: metricStatus(atual, usage, m.id, p),
    };
  });
};

// Avisar ANTES de bater o teto é o que evita a pessoa ser interrompida no meio
// do trabalho — e é o momento honesto de oferecer o plano maior.
export const warnings = (plan, usage, period) =>
  usageSummary(plan, usage, period).filter((x) => x.status !== STATUS.ok);

// Só sugere plano que RESOLVE o problema. Empurrar upgrade que não resolve é
// vender mal e queima a confiança.
export const upgradeSuggestion = (plan, usage, period) => {
  // Em lançamento não existe plano para vender. Oferecer upgrade agora seria
  // empurrar algo que a titular decidiu não cobrar.
  if (LAUNCH_MODE) return null;

  const atual = planById(plan?.id ?? plan);
  const apertados = warnings(atual, usage, period).map((x) => x.metric);
  if (!apertados.length) return null;

  const indice = PLANS.findIndex((x) => x.id === atual.id);
  const p = period || periodOf();

  for (const candidato of PLANS.slice(indice + 1)) {
    const resolve = apertados.every((metric) => {
      const limite = limitFor(candidato, metric);
      if (limite === null) return true;
      return usedIn(usage, metric, p) < limite;
    });
    if (resolve)
      return {
        plan: candidato,
        solves: apertados.map((m) => METRICS[m]?.label || m),
      };
  }
  return null;
};

export const formatPrice = (cents) =>
  cents === 0
    ? "Grátis"
    : `R$ ${(cents / 100).toFixed(2).replace(".", ",")}/mês`;
