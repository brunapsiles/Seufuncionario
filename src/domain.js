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

// ── Contratos / receita recorrente ──────────────────────────────────────
// Um contrato recorrente (ex.: mensalidade de lavanderia) gera receita todo
// mês. `history["AAAA-MM"]` guarda o mês já lançado (idempotência).
export const recurringStatus = (contract, ymd = today()) => {
  const ym = ymd.slice(0, 7);
  const day = Number(ymd.slice(8, 10));
  const dueDay = Math.min(28, Math.max(1, Number(contract?.dueDay) || 1));
  const posted = !!contract?.history?.[ym];
  if (!contract?.active) return { status: "off", ym, dueDay, posted };
  if (posted) return { status: "lancado", ym, dueDay, posted: true };
  if (day >= dueDay) return { status: "a_lancar", ym, dueDay, posted: false };
  return { status: "agendado", ym, dueDay, posted: false };
};

// Uma receita no caixa a partir de um contrato, para o mês corrente. Pura.
export const buildRecurringTransaction = (
  contract,
  { userId, businessId } = {},
  ymd = today(),
) => {
  const value = Number(contract?.amount) || 0;
  if (!(value > 0)) return null;
  return {
    id: uid(),
    type: "Receita",
    description: `Contrato — ${contract?.clientName || contract?.description || "recorrente"}`,
    value,
    date: ymd,
    category: "Contratos",
    businessId: businessId || contract?.businessId || null,
    ownerId: userId || contract?.ownerId || null,
    sourceRecurringId: contract?.id || null,
  };
};

// Lançamentos automáticos: só dos contratos marcados como autoPost que estão
// vencidos e ainda não lançados no mês. Idempotente via history[ym]. Pura.
export const buildRecurringPostings = (
  recurring,
  ctx = {},
  ymd = today(),
) => {
  const ym = ymd.slice(0, 7);
  const postings = [];
  for (const c of recurring || []) {
    if (!c?.autoPost) continue;
    if (recurringStatus(c, ymd).status !== "a_lancar") continue;
    const transaction = buildRecurringTransaction(c, ctx, ymd);
    if (transaction) postings.push({ contractId: c.id, ym, transaction });
  }
  return postings;
};

// Lembrete (uma notificação/mês) dos contratos MANUAIS vencidos e não lançados.
// Os autoPost entram sozinhos, então não geram lembrete. Idempotente. Pura.
export const buildRecurringReminder = (
  recurring,
  notifications,
  userId,
  ymd = today(),
) => {
  if (!userId) return null;
  const ym = ymd.slice(0, 7);
  const manual = (recurring || []).filter(
    (c) => !c?.autoPost && recurringStatus(c, ymd).status === "a_lancar",
  );
  if (manual.length === 0) return null;
  const notifId = `recurring-${ym}`;
  if ((notifications || []).some((n) => n && n.id === notifId)) return null;
  const message =
    manual.length === 1
      ? `O contrato recorrente de ${manual[0].clientName || "cliente"} vence este mês. Lance no caixa quando receber.`
      : `${manual.length} contratos recorrentes vencem este mês. Lance no caixa quando receber.`;
  return [
    {
      id: notifId,
      assigneeId: userId,
      ownerId: userId,
      message,
      link: "financeiro",
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...(notifications || []),
  ];
};

// Converte a resposta da IA (JSON ou texto) numa lista de slides normalizada.
// Cada slide: { title, bullets: string[], notes }. Tolerante a cercas ```json,
// texto antes/depois do array e a formatos de fallback em Markdown.
export const parseDeckSlides = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return [];
  const clean = (s) =>
    String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      .replace(/^[-*•#\d.)\s]+/, "")
      .trim();
  const normalizeSlide = (s) => {
    if (!s || typeof s !== "object") return null;
    const title = clean(s.title || s.titulo || s.heading || "");
    const rawBullets = s.bullets || s.pontos || s.items || s.topicos || [];
    const bullets = (Array.isArray(rawBullets) ? rawBullets : [rawBullets])
      .map(clean)
      .filter(Boolean)
      .slice(0, 8);
    const notes = clean(s.notes || s.notas || s.observacoes || "");
    if (!title && bullets.length === 0) return null;
    return { title: title || "Slide", bullets, notes };
  };
  // 1) Tenta JSON (com ou sem cercas de código)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : text;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const arr = JSON.parse(body.slice(start, end + 1));
      if (Array.isArray(arr)) {
        const slides = arr.map(normalizeSlide).filter(Boolean);
        if (slides.length) return slides;
      }
    } catch {
      // segue para o fallback em texto
    }
  }
  // 2) Fallback: divide por títulos de Markdown ("## " ou "Slide N:")
  const blocks = body
    .split(/\n(?=#{1,3}\s|slide\s*\d+\s*[:-]|título\s*[:-])/i)
    .map((b) => b.trim())
    .filter(Boolean);
  const slides = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const title = clean(lines[0].replace(/^slide\s*\d+\s*[:-]/i, ""));
    const bullets = lines
      .slice(1)
      .filter((l) => /^[-*•]/.test(l) || /^\d+[.)]/.test(l))
      .map(clean)
      .filter(Boolean)
      .slice(0, 8);
    if (title || bullets.length) slides.push({ title: title || "Slide", bullets, notes: "" });
  }
  return slides;
};

// Extrai um array JSON tolerante a cercas ```json e a texto ao redor.
// Retorna [] quando não encontra um array válido.
const extractJsonArray = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : text;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(body.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

// Normaliza a resposta da IA num calendário editorial: lista de posts
// { channel, format, hook, caption, cta, hashtags[] }. Aceita chaves em
// português (canal/formato/gancho/legenda/chamada/hashtags).
export const parseContentPlan = (raw) => {
  const oneLine = (s) =>
    String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const asText = (v) => (Array.isArray(v) ? v.join(" ") : oneLine(v));
  const normalizeTag = (t) =>
    oneLine(t)
      .replace(/^#+/, "")
      .replace(/\s+/g, "")
      .replace(/[^\p{L}\p{N}_]/gu, "");
  return extractJsonArray(raw)
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const channel = oneLine(p.channel || p.canal || p.rede || "Instagram");
      const format = oneLine(p.format || p.formato || p.tipo || "Post");
      const hook = oneLine(p.hook || p.gancho || p.titulo || p.title || p.tema || "");
      const caption = asText(p.caption || p.legenda || p.texto || p.body || "");
      const cta = oneLine(p.cta || p.chamada || p.callToAction || "");
      const rawTags = p.hashtags || p.tags || p.hashtag || [];
      const hashtags = (Array.isArray(rawTags) ? rawTags : asText(rawTags).split(/[\s,]+/))
        .map(normalizeTag)
        .filter(Boolean)
        .slice(0, 12);
      if (!hook && !caption) return null;
      return { channel, format, hook: hook || caption.slice(0, 60), caption, cta, hashtags };
    })
    .filter(Boolean);
};

// Distribui N posts a partir de uma data inicial (AAAA-MM-DD), a cada
// `everyDays` dias, pulando domingos. Retorna as datas no formato AAAA-MM-DD.
export const scheduleContentDates = (count, startYmd = today(), everyDays = 2) => {
  const dates = [];
  const step = Math.max(1, Number(everyDays) || 1);
  const [y, m, d] = String(startYmd).split("-").map(Number);
  const cursor = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  while (dates.length < count) {
    if (cursor.getUTCDay() !== 0) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + step);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return dates;
};

// Normaliza a resposta da IA num objeto de planilha { title, columns[], rows[][] }.
// Tolera cercas ```json e texto ao redor; cada linha é ajustada ao número de
// colunas (preenche vazios / descarta excedente). Sem colunas → planilha vazia.
export const parseSheet = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return { title: "", columns: [], rows: [] };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return { title: "", columns: [], rows: [] };
  let obj;
  try {
    obj = JSON.parse(body.slice(start, end + 1));
  } catch {
    return { title: "", columns: [], rows: [] };
  }
  const cell = (v) =>
    v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v).trim();
  const columns = (Array.isArray(obj.columns || obj.colunas) ? obj.columns || obj.colunas : [])
    .map(cell)
    .filter(Boolean)
    .slice(0, 30);
  if (!columns.length) return { title: cell(obj.title || obj.titulo), columns: [], rows: [] };
  const rawRows = Array.isArray(obj.rows || obj.linhas) ? obj.rows || obj.linhas : [];
  const rows = rawRows
    .map((r) => {
      const arr = Array.isArray(r)
        ? r
        : r && typeof r === "object"
          ? columns.map((c) => r[c])
          : [r];
      return columns.map((_, i) => cell(arr[i]));
    })
    .slice(0, 200);
  return { title: cell(obj.title || obj.titulo), columns, rows };
};

// Serializa colunas + linhas em CSV. Separador ";" por padrão (Excel pt-BR),
// campos entre aspas com escape de aspas internas. Sem BOM (adicionado no
// download). Uma linha por registro, terminada em \r\n.
export const buildCsv = (columns = [], rows = [], sep = ";") => {
  const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const lines = [columns.map(esc).join(sep)];
  for (const row of rows) {
    lines.push(columns.map((_, i) => esc(row[i])).join(sep));
  }
  return lines.join("\r\n");
};

// Normaliza a resposta da IA de análise num objeto
// { summary, keyPoints[], risks[], actions[], answer }. Tolera cercas ```json,
// texto ao redor e chaves em português. Retorna null quando não há conteúdo útil.
export const parseAnalysis = (raw) => {
  const text = String(raw || "").trim();
  if (!text) return null;
  const oneLine = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const toList = (v) => {
    const arr = Array.isArray(v) ? v : v == null ? [] : [v];
    return arr
      .map((x) =>
        oneLine(typeof x === "object" ? x.text || x.item || JSON.stringify(x) : x).replace(
          /^[-*•\d.)\s]+/,
          "",
        ),
      )
      .filter(Boolean)
      .slice(0, 12);
  };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let obj;
  try {
    obj = JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
  const summary = oneLine(obj.summary || obj.resumo || "");
  const keyPoints = toList(obj.keyPoints || obj.pontos || obj.pontosChave || obj.destaques);
  const risks = toList(obj.risks || obj.riscos || obj.atencao || obj.alertas);
  const actions = toList(obj.actions || obj.acoes || obj.proximosPassos || obj.proximas);
  const answer = oneLine(obj.answer || obj.resposta || "");
  if (!summary && !keyPoints.length && !risks.length && !actions.length && !answer)
    return null;
  return { summary, keyPoints, risks, actions, answer };
};

// Normaliza a resposta da IA num mapa de ideias
// { title, branches: [{ title, ideas: string[] }] }. Tolera cercas ```json,
// texto ao redor e chaves em português. Retorna { title, branches: [] } vazio
// quando não há ramos utilizáveis.
export const parseMindMap = (raw) => {
  const text = String(raw || "").trim();
  const empty = { title: "", branches: [] };
  if (!text) return empty;
  const oneLine = (s) =>
    String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      .replace(/^[-*•\d.)\s]+/, "")
      .trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return empty;
  let obj;
  try {
    obj = JSON.parse(body.slice(start, end + 1));
  } catch {
    return empty;
  }
  const rawBranches = obj.branches || obj.ramos || obj.temas || obj.categorias || [];
  const branches = (Array.isArray(rawBranches) ? rawBranches : [])
    .map((b) => {
      if (!b || typeof b !== "object") return null;
      const title = oneLine(b.title || b.titulo || b.tema || b.nome || "");
      const rawIdeas = b.ideas || b.ideias || b.itens || b.pontos || [];
      const ideas = (Array.isArray(rawIdeas) ? rawIdeas : [rawIdeas])
        .map((x) => oneLine(typeof x === "object" ? x.text || x.ideia || "" : x))
        .filter(Boolean)
        .slice(0, 10);
      if (!title && ideas.length === 0) return null;
      return { title: title || "Ramo", ideas };
    })
    .filter(Boolean)
    .slice(0, 12);
  return { title: oneLine(obj.title || obj.titulo || obj.tema || ""), branches };
};
