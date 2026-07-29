// ===== Quadro visual: canvas infinito, elementos, templates e facilitação =====
// Camada pura: matemática de pan/zoom, elementos, agrupamento, votação,
// cronômetro, templates e conversão do quadro em trabalho. Nada de React.

export const CANVAS_ELEMENT_TYPES = [
  { id: "postit", label: "Post-it", w: 160, h: 120 },
  { id: "text", label: "Texto", w: 220, h: 40 },
  { id: "rect", label: "Retângulo", w: 200, h: 120 },
  { id: "ellipse", label: "Elipse", w: 180, h: 120 },
  { id: "arrow", label: "Seta", w: 160, h: 0 },
  { id: "frame", label: "Área", w: 420, h: 320 },
  { id: "card", label: "Cartão", w: 240, h: 96 },
];

export const POSTIT_COLORS = [
  "#fde68a",
  "#bbf7d0",
  "#bfdbfe",
  "#fecaca",
  "#e9d5ff",
  "#fed7aa",
];

const typeSpec = (type) =>
  CANVAS_ELEMENT_TYPES.find((t) => t.id === type) || CANVAS_ELEMENT_TYPES[0];

export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 4;

export const clampZoom = (zoom) => {
  const z = Number(zoom);
  if (!Number.isFinite(z)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 1000) / 1000));
};

// A visão do quadro: deslocamento em pixels de tela e nível de zoom.
export const makeView = () => ({ x: 0, y: 0, zoom: 1 });

// Ponto da tela -> ponto do quadro. É o inverso exato de canvasToScreen.
export const screenToCanvas = (point, view) => {
  const zoom = clampZoom(view?.zoom ?? 1);
  return {
    x: ((Number(point?.x) || 0) - (Number(view?.x) || 0)) / zoom,
    y: ((Number(point?.y) || 0) - (Number(view?.y) || 0)) / zoom,
  };
};

export const canvasToScreen = (point, view) => {
  const zoom = clampZoom(view?.zoom ?? 1);
  return {
    x: (Number(point?.x) || 0) * zoom + (Number(view?.x) || 0),
    y: (Number(point?.y) || 0) * zoom + (Number(view?.y) || 0),
  };
};

export const panBy = (view, dx, dy) => ({
  ...view,
  x: (Number(view?.x) || 0) + (Number(dx) || 0),
  y: (Number(view?.y) || 0) + (Number(dy) || 0),
});

// Zoom mantendo fixo o ponto sob o cursor — sem isso o quadro "escorrega".
export const zoomAt = (view, screenPoint, factor) => {
  const antes = screenToCanvas(screenPoint, view);
  const zoom = clampZoom((view?.zoom ?? 1) * (Number(factor) || 1));
  const depois = { ...view, zoom };
  const projetado = canvasToScreen(antes, depois);
  return {
    zoom,
    x: (Number(view?.x) || 0) + ((Number(screenPoint?.x) || 0) - projetado.x),
    y: (Number(view?.y) || 0) + ((Number(screenPoint?.y) || 0) - projetado.y),
  };
};

// Retângulo que envolve todos os elementos. Null quando o quadro está vazio.
export const contentBounds = (elements) => {
  const lista = (elements || []).filter(Boolean);
  if (lista.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of lista) {
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + (Number(el.w) || 0));
    maxY = Math.max(maxY, y + (Number(el.h) || 0));
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

// Visão que enquadra todo o conteúdo, com uma margem de respiro.
export const fitView = (elements, viewport, padding = 48) => {
  const bounds = contentBounds(elements);
  const vw = Number(viewport?.width) || 0;
  const vh = Number(viewport?.height) || 0;
  if (!bounds || vw <= 0 || vh <= 0) return makeView();
  const zoom = clampZoom(
    Math.min(
      (vw - padding * 2) / Math.max(1, bounds.w),
      (vh - padding * 2) / Math.max(1, bounds.h),
    ),
  );
  return {
    zoom,
    x: vw / 2 - (bounds.x + bounds.w / 2) * zoom,
    y: vh / 2 - (bounds.y + bounds.h / 2) * zoom,
  };
};

export const makeCanvasElement = (type, { id, x = 0, y = 0, ...resto } = {}) => {
  const spec = typeSpec(type);
  return {
    id,
    type: spec.id,
    x,
    y,
    w: spec.w,
    h: spec.h,
    text: "",
    color: type === "postit" ? POSTIT_COLORS[0] : "",
    votes: [],
    locked: false,
    ...resto,
  };
};

export const moveElement = (element, dx, dy) => ({
  ...element,
  x: (Number(element?.x) || 0) + (Number(dx) || 0),
  y: (Number(element?.y) || 0) + (Number(dy) || 0),
});

// Redimensiona respeitando um mínimo, para o elemento não desaparecer.
export const resizeElement = (element, w, h, min = 32) => ({
  ...element,
  w: Math.max(min, Math.round(Number(w) || 0)),
  h: element?.type === "arrow" ? 0 : Math.max(min, Math.round(Number(h) || 0)),
});

// Elementos contidos numa área (frame). Usado para mover a área com o conteúdo
// e para transformar uma área em apresentação ou em tarefas.
export const elementsInFrame = (elements, frame) => {
  if (!frame) return [];
  const fx = Number(frame.x) || 0;
  const fy = Number(frame.y) || 0;
  const fw = Number(frame.w) || 0;
  const fh = Number(frame.h) || 0;
  return (elements || []).filter((el) => {
    if (!el || el.id === frame.id || el.type === "frame") return false;
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    return (
      x >= fx &&
      y >= fy &&
      x + (Number(el.w) || 0) <= fx + fw &&
      y + (Number(el.h) || 0) <= fy + fh
    );
  });
};

// Agrupa post-its por proximidade — o "agrupar ideias" da facilitação.
// Dois post-its ficam no mesmo grupo quando seus centros estão dentro do raio.
export const clusterByProximity = (elements, radius = 200) => {
  const postits = (elements || []).filter((el) => el?.type === "postit");
  const centro = (el) => ({
    x: (Number(el.x) || 0) + (Number(el.w) || 0) / 2,
    y: (Number(el.y) || 0) + (Number(el.h) || 0) / 2,
  });
  const visitados = new Set();
  const grupos = [];
  for (const el of postits) {
    if (visitados.has(el.id)) continue;
    const fila = [el];
    const grupo = [];
    visitados.add(el.id);
    while (fila.length > 0) {
      const atual = fila.pop();
      grupo.push(atual);
      const c1 = centro(atual);
      for (const outro of postits) {
        if (visitados.has(outro.id)) continue;
        const c2 = centro(outro);
        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        if (dist <= radius) {
          visitados.add(outro.id);
          fila.push(outro);
        }
      }
    }
    grupos.push(grupo);
  }
  return grupos.sort((a, b) => b.length - a.length);
};

// Votação: cada pessoa vota uma vez por elemento; votar de novo desfaz.
export const toggleVote = (element, userId) => {
  const votos = element?.votes || [];
  const id = String(userId || "");
  if (!id) return element;
  return {
    ...element,
    votes: votos.includes(id) ? votos.filter((v) => v !== id) : [...votos, id],
  };
};

export const topVoted = (elements, limit = 5) =>
  (elements || [])
    .filter((el) => (el?.votes || []).length > 0)
    .map((el) => ({ element: el, votes: (el.votes || []).length }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit);

// Cronômetro do facilitador. Puro: recebe o instante atual em vez de olhar o
// relógio, para poder ser testado.
export const timerState = (startedAt, seconds, now) => {
  const inicio = Date.parse(String(startedAt || ""));
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const agora = Date.parse(String(now || ""));
  if (!Number.isFinite(inicio) || !Number.isFinite(agora) || total === 0)
    return { running: false, remaining: total, expired: false };
  const decorrido = Math.floor((agora - inicio) / 1000);
  const restante = total - decorrido;
  return {
    running: restante > 0,
    remaining: Math.max(0, restante),
    expired: restante <= 0,
  };
};

export const formatSeconds = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// Templates visuais: cada um monta áreas e post-its de partida.
const frame = (id, x, y, w, h, text) => ({
  ...makeCanvasElement("frame", { id, x, y }),
  w,
  h,
  text,
});
const note = (id, x, y, text, color) => ({
  ...makeCanvasElement("postit", { id, x, y }),
  text,
  color,
});

export const BOARD_TEMPLATES = [
  {
    id: "swot",
    name: "SWOT",
    description: "Forças, fraquezas, oportunidades e ameaças.",
    build: (uid) => [
      frame(uid(), 0, 0, 420, 320, "Forças"),
      frame(uid(), 440, 0, 420, 320, "Fraquezas"),
      frame(uid(), 0, 340, 420, 320, "Oportunidades"),
      frame(uid(), 440, 340, 420, 320, "Ameaças"),
    ],
  },
  {
    id: "modelo-negocio",
    name: "Canvas de modelo de negócio",
    description: "Os nove blocos do modelo de negócio.",
    build: (uid) =>
      [
        "Parcerias",
        "Atividades-chave",
        "Proposta de valor",
        "Relacionamento",
        "Clientes",
        "Recursos-chave",
        "Canais",
        "Custos",
        "Receitas",
      ].map((titulo, i) =>
        frame(uid(), (i % 5) * 300, Math.floor(i / 5) * 280, 280, 260, titulo),
      ),
  },
  {
    id: "jornada",
    name: "Jornada do cliente",
    description: "Da descoberta ao pós-venda.",
    build: (uid) =>
      ["Descoberta", "Consideração", "Compra", "Uso", "Pós-venda"].map(
        (etapa, i) => frame(uid(), i * 300, 0, 280, 380, etapa),
      ),
  },
  {
    id: "kanban",
    name: "Kanban",
    description: "A fazer, fazendo, feito.",
    build: (uid) =>
      ["A fazer", "Fazendo", "Feito"].map((coluna, i) =>
        frame(uid(), i * 320, 0, 300, 460, coluna),
      ),
  },
  {
    id: "retro",
    name: "Retrospectiva",
    description: "O que foi bem, o que atrapalhou, o que mudar.",
    build: (uid) => [
      frame(uid(), 0, 0, 320, 420, "Foi bem"),
      frame(uid(), 340, 0, 320, 420, "Atrapalhou"),
      frame(uid(), 680, 0, 320, 420, "Vamos mudar"),
      note(uid(), 20, 60, "", POSTIT_COLORS[1]),
      note(uid(), 360, 60, "", POSTIT_COLORS[3]),
      note(uid(), 700, 60, "", POSTIT_COLORS[2]),
    ],
  },
  {
    id: "persona",
    name: "Persona",
    description: "Quem é o cliente, o que ele quer e o que o incomoda.",
    build: (uid) => [
      frame(uid(), 0, 0, 400, 260, "Quem é"),
      frame(uid(), 420, 0, 400, 260, "O que quer"),
      frame(uid(), 0, 280, 400, 260, "O que incomoda"),
      frame(uid(), 420, 280, 400, 260, "Como decide"),
    ],
  },
];

export const applyTemplate = (template, uid) =>
  typeof template?.build === "function" ? template.build(uid) : [];

// Transformação em trabalho: post-its com texto viram tarefas.
export const boardToTasks = (elements, { frameName } = {}) =>
  (elements || [])
    .filter((el) => el?.type === "postit" && String(el.text || "").trim())
    .map((el) => ({
      sourceId: el.id,
      title: String(el.text).trim().split("\n")[0].slice(0, 140),
      notes: frameName ? `Do quadro, área "${frameName}"` : "Do quadro visual",
      votes: (el.votes || []).length,
    }));

export const BOARD_AI_MODES = [
  { id: "agrupar", label: "Agrupar ideias por tema" },
  { id: "resumir", label: "Resumir o quadro" },
  { id: "plano", label: "Transformar em plano de ação" },
];

export const buildBoardAiPrompt = (mode, elements, board) => {
  const ideias = (elements || [])
    .filter((el) => String(el?.text || "").trim())
    .map((el) => `- ${String(el.text).trim().replace(/\n+/g, " ")}`)
    .join("\n");
  const cabecalho = `Você ajuda um negócio brasileiro a organizar um quadro de ideias.
Quadro: ${board?.name || "sem nome"}

Ideias no quadro:
${ideias || "(nenhuma ideia escrita)"}
`;
  if (mode === "resumir")
    return `${cabecalho}
Escreva um resumo curto em português do Brasil, em um parágrafo, do que este quadro está dizendo. Não invente ideias que não estão escritas.`;
  if (mode === "plano")
    return `${cabecalho}
Transforme as ideias em um plano de ação. Responda só com uma lista, uma ação por linha, no formato:
- o que fazer — responsável sugerido — prazo sugerido em dias
Não invente ideias que não estão escritas.`;
  return `${cabecalho}
Agrupe as ideias por tema. Responda só com esta estrutura, sem introdução:

Tema: nome do tema
- ideia
- ideia

Tema: outro tema
- ideia

Use apenas as ideias escritas acima, sem inventar.`;
};

// Lê o agrupamento por tema devolvido pela IA.
export const parseBoardGroups = (raw) => {
  const grupos = [];
  let atual = null;
  for (const linhaBruta of String(raw || "").split("\n")) {
    const linha = linhaBruta.trim();
    if (!linha) continue;
    const tema = /^(?:#+\s*)?tema\s*:\s*(.+)$/i.exec(linha.replace(/\*\*/g, ""));
    if (tema) {
      atual = { theme: tema[1].trim(), items: [] };
      grupos.push(atual);
      continue;
    }
    if (!atual) continue;
    const item = linha.replace(/^[-*•]\s*/, "").replace(/\*\*/g, "").trim();
    if (item) atual.items.push(item);
  }
  return grupos.filter((g) => g.items.length > 0);
};

export const makeBoard = (id, { businessId = null, ownerId = null, name = "" } = {}) => ({
  id,
  name: name || "Quadro sem nome",
  elements: [],
  view: makeView(),
  timerStartedAt: "",
  timerSeconds: 0,
  votingOpen: false,
  businessId,
  ownerId,
  createdAt: new Date().toISOString(),
});
