// Camada de lógica pura (sem React/JSX): helpers fundamentais e regras de
// negócio testáveis, extraídos de App.jsx para começar a quebrar o monólito.
// App.jsx importa daqui e reexporta o que os testes consomem via "./App".

export const uid = () => crypto.randomUUID();
export const today = () => new Date().toISOString().slice(0, 10);

export const contactLinks = (contact) => {
  const value = String(contact || "").trim();
  if (!value) return { phone: "", email: "" };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { phone: "", email: value };
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return { phone: "", email: "" };
  return { phone: digits.length <= 11 ? `55${digits}` : digits, email: "" };
};

// ── Gamificação (pontos, níveis, conquistas) ────────────────────────────
export const DEFAULT_LEVELS = [
  { name: "Iniciante", minPoints: 0 },
  { name: "Assistente", minPoints: 50 },
  { name: "Colaborador", minPoints: 150 },
  { name: "Colaborador confiável", minPoints: 300 },
  { name: "Especialista", minPoints: 600 },
];

const isApprovedMission = (task, userId) =>
  task.isMission &&
  Number(task.points) > 0 &&
  task.missionStatus === "aprovada" &&
  (task.assigneeId === userId ||
    (task.assignees || []).some((a) => a.userId === userId));

export const computeUserPoints = (tasks, userId) =>
  (tasks || [])
    .filter((t) => isApprovedMission(t, userId))
    .reduce((sum, t) => sum + Number(t.points || 0), 0);

export const levelForPoints = (points, levels = DEFAULT_LEVELS) =>
  [...levels]
    .sort((a, b) => a.minPoints - b.minPoints)
    .reduce((current, level) => (points >= level.minPoints ? level : current), levels[0]);

export const levelProgress = (points, levels = DEFAULT_LEVELS) => {
  const sorted = [...levels].sort((a, b) => a.minPoints - b.minPoints);
  const current = levelForPoints(points, sorted);
  const currentIndex = sorted.findIndex((l) => l.name === current.name);
  const next = sorted[currentIndex + 1] || null;
  if (!next) return { next: null, pct: 100, pointsToNext: 0 };
  const span = next.minPoints - current.minPoints;
  const pct = span > 0
    ? Math.min(100, Math.max(0, Math.round(((points - current.minPoints) / span) * 100)))
    : 100;
  return { next, pct, pointsToNext: Math.max(0, next.minPoints - points) };
};

export const computeAchievements = (tasks, userId) => {
  const approved = (tasks || []).filter((t) => isApprovedMission(t, userId));
  const onTime = approved.filter(
    (t) => t.due && t.deliveries?.length && t.deliveries[0].createdAt?.slice(0, 10) <= t.due,
  );
  const noCorrections = approved.filter(
    (t) => (t.deliveries || []).every((d) => d.status !== "correcao_solicitada"),
  );
  const achievements = [];
  if (approved.length >= 1)
    achievements.push({ id: "primeira-entrega", label: "Primeira entrega" });
  if (approved.length >= 5)
    achievements.push({ id: "cinco-tarefas", label: "5 missões concluídas" });
  if (onTime.length >= 1)
    achievements.push({ id: "entrega-no-prazo", label: "Entrega no prazo" });
  if (noCorrections.length >= 1 && approved.length >= 1)
    achievements.push({
      id: "sem-correcoes",
      label: "Entrega aprovada sem correções",
    });
  return achievements;
};

// Consolida o "meu trabalho" da pessoa logada dentro do espaço ativo: tarefas
// atribuídas a ela, o que precisa de atenção e seu desempenho. Puro e testável.
export const computeMyWork = (db, userId, business, ymdValue = today()) => {
  const inBiz = (t) => !business || !t.businessId || t.businessId === business.id;
  const mine = (db?.tasks || []).filter(
    (t) =>
      inBiz(t) &&
      (t.assigneeId === userId ||
        (t.assignees || []).some((a) => a?.userId === userId)),
  );
  const active = mine
    .filter((t) => t.status !== "Concluído")
    .sort((a, b) =>
      String(a.due || "9999").localeCompare(String(b.due || "9999")),
    );
  return {
    all: mine,
    active,
    inProgress: active.length,
    inReview: mine.filter((t) => t.missionStatus === "enviada_para_revisao")
      .length,
    corrections: mine.filter((t) => t.missionStatus === "correcao_solicitada")
      .length,
    overdue: active.filter((t) => t.due && t.due < ymdValue).length,
    done: mine.filter((t) => t.status === "Concluído").length,
  };
};

// Painel de resultados do dono: transforma os dados já conectados (caixa,
// pedidos, orçamentos) em indicadores. Puro e testável. Janela de 30 dias
// com comparação contra os 30 anteriores para a tendência.
export const computeBusinessInsights = (db, business, nowMs = Date.now()) => {
  const inBiz = (x) =>
    !business || !x?.businessId || x.businessId === business.id;
  const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
  const cut30 = ymd(nowMs - 30 * 86400000);
  const cut60 = ymd(nowMs - 60 * 86400000);
  const dateOf = (x) => String(x?.date || x?.createdAt || "").slice(0, 10);

  const receitas = (db?.transactions || []).filter(
    (t) => inBiz(t) && t.type === "Receita",
  );
  const sumIn = (from, to) =>
    receitas
      .filter((t) => {
        const d = dateOf(t);
        return d && d >= from && (!to || d < to);
      })
      .reduce((s, t) => s + Number(t.value || 0), 0);
  const revenue30 = sumIn(cut30, null);
  const revenuePrev = sumIn(cut60, cut30);
  const revenueTrend =
    revenuePrev > 0
      ? Math.round(((revenue30 - revenuePrev) / revenuePrev) * 100)
      : revenue30 > 0
        ? 100
        : 0;

  const orders = (db?.orders || []).filter(inBiz);
  const orders30 = orders.filter((o) => dateOf(o) >= cut30);
  const ordersCount = orders30.length;
  const avgTicket = ordersCount
    ? Math.round(
        orders30.reduce((s, o) => s + Number(o.total || 0), 0) / ordersCount,
      )
    : 0;

  const quotes = (db?.quotes || []).filter(inBiz);
  const decided = quotes.filter(
    (q) => q.status === "aprovado" || q.status === "recusado",
  ).length;
  const approved = quotes.filter((q) => q.status === "aprovado").length;
  const conversion = decided ? Math.round((approved / decided) * 100) : 0;

  const byClient = new Map();
  for (const o of orders) {
    const key = (o.clientName || "").trim() || "Sem nome";
    const cur = byClient.get(key) || { name: key, total: 0, orders: 0 };
    cur.total += Number(o.total || 0);
    cur.orders += 1;
    byClient.set(key, cur);
  }
  const topClients = [...byClient.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    revenue30,
    revenueTrend,
    ordersCount,
    avgTicket,
    conversion,
    approved,
    decided,
    topClients,
    hasData: receitas.length > 0 || orders.length > 0 || quotes.length > 0,
  };
};
