// ===== Quadro rápido de reunião: traço livre, régua, borracha e formas =====
// Camada pura. O desenho é uma lista de traços (pontos). Aqui ficam a
// simplificação do traço, o reconhecimento de forma, a régua, a borracha e a
// exportação em SVG. Nada de React, nada de canvas.

export const PEN_TOOLS = [
  { id: "caneta", label: "Caneta", width: 3, opacity: 1 },
  { id: "marca-texto", label: "Marca-texto", width: 18, opacity: 0.35 },
  { id: "regua", label: "Régua (linha reta)", width: 3, opacity: 1 },
  { id: "borracha", label: "Borracha", width: 20, opacity: 1 },
];

export const PEN_COLORS = ["#0f172a", "#dc2626", "#2563eb", "#16a34a", "#d97706"];

export const toolSpec = (id) => PEN_TOOLS.find((t) => t.id === id) || PEN_TOOLS[0];

const p = (ponto) => ({ x: Number(ponto?.x) || 0, y: Number(ponto?.y) || 0 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const makeStroke = ({ id, tool = "caneta", color = PEN_COLORS[0], points = [] } = {}) => ({
  id,
  tool,
  color,
  width: toolSpec(tool).width,
  points: points.map(p),
});

// Retângulo que envolve os pontos. Null quando não há ponto.
export const strokeBounds = (points) => {
  const lista = (points || []).map(p);
  if (lista.length === 0) return null;
  const xs = lista.map((q) => q.x);
  const ys = lista.map((q) => q.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(...xs) - minX,
    h: Math.max(...ys) - minY,
  };
};

// Distância de um ponto ao segmento a-b. Base da simplificação e da borracha.
export const pointToSegment = (ponto, a, b) => {
  const q = p(ponto);
  const s = p(a);
  const e = p(b);
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const comprimento = dx * dx + dy * dy;
  if (comprimento === 0) return dist(q, s);
  let t = ((q.x - s.x) * dx + (q.y - s.y) * dy) / comprimento;
  t = Math.max(0, Math.min(1, t));
  return dist(q, { x: s.x + t * dx, y: s.y + t * dy });
};

// Simplificação de traço (Ramer–Douglas–Peucker): tira os pontos que não mudam
// a forma. Sem isso um traço de mouse vira centenas de pontos inúteis.
export const simplifyStroke = (points, tolerance = 2) => {
  const lista = (points || []).map(p);
  if (lista.length <= 2) return lista;
  const recursivo = (inicio, fim) => {
    let maior = 0;
    let indice = -1;
    for (let i = inicio + 1; i < fim; i += 1) {
      const d = pointToSegment(lista[i], lista[inicio], lista[fim]);
      if (d > maior) {
        maior = d;
        indice = i;
      }
    }
    if (maior <= tolerance || indice < 0) return [lista[inicio], lista[fim]];
    const esquerda = recursivo(inicio, indice);
    const direita = recursivo(indice, fim);
    return [...esquerda.slice(0, -1), ...direita];
  };
  return recursivo(0, lista.length - 1);
};

// O traço volta ao ponto de partida? Base para distinguir linha de forma fechada.
export const isClosed = (points, fator = 0.25) => {
  const lista = (points || []).map(p);
  if (lista.length < 4) return false;
  const bounds = strokeBounds(lista);
  const escala = Math.max(bounds.w, bounds.h) || 1;
  return dist(lista[0], lista[lista.length - 1]) <= escala * fator;
};

// Cantos do traço: pontos onde a direção muda mais que o limite.
// Num traço FECHADO a contagem é cíclica: sem isso o canto que fica no ponto
// de partida nunca é medido, e um retângulo aparece com apenas 3 cantos.
export const countCorners = (points, limiteGraus = 50, { closed = false } = {}) => {
  let lista = simplifyStroke(points, 6);
  if (lista.length < 3) return 0;
  const anguloEntre = (a, b, c) => {
    const ang1 = Math.atan2(b.y - a.y, b.x - a.x);
    const ang2 = Math.atan2(c.y - b.y, c.x - b.x);
    let diff = Math.abs((ang2 - ang1) * (180 / Math.PI));
    if (diff > 180) diff = 360 - diff;
    return diff;
  };
  if (!closed) {
    let cantos = 0;
    for (let i = 1; i < lista.length - 1; i += 1)
      if (anguloEntre(lista[i - 1], lista[i], lista[i + 1]) >= limiteGraus)
        cantos += 1;
    return cantos;
  }
  // Remove o ponto final duplicado antes de percorrer em círculo.
  const primeiro = lista[0];
  const ultimo = lista[lista.length - 1];
  if (Math.hypot(primeiro.x - ultimo.x, primeiro.y - ultimo.y) < 1)
    lista = lista.slice(0, -1);
  const n = lista.length;
  if (n < 3) return 0;
  let cantos = 0;
  for (let i = 0; i < n; i += 1)
    if (
      anguloEntre(lista[(i - 1 + n) % n], lista[i], lista[(i + 1) % n]) >=
      limiteGraus
    )
      cantos += 1;
  return cantos;
};

// Giro total do traço, em graus. Uma forma simples (retângulo, elipse,
// triângulo) fecha em cerca de 360 graus. Um rabisco cruza a si mesmo e passa
// muito disso — é o jeito honesto de dizer "não sei o que isso é".
export const totalTurning = (points, { closed = false } = {}) => {
  let lista = simplifyStroke(points, 6);
  if (lista.length < 3) return 0;
  if (closed) {
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    if (Math.hypot(primeiro.x - ultimo.x, primeiro.y - ultimo.y) < 1)
      lista = lista.slice(0, -1);
  }
  const n = lista.length;
  if (n < 3) return 0;
  const limite = closed ? n : n - 2;
  let total = 0;
  for (let i = 0; i < limite; i += 1) {
    const a = lista[closed ? (i - 1 + n) % n : i];
    const b = lista[closed ? i : i + 1];
    const c = lista[closed ? (i + 1) % n : i + 2];
    const ang1 = Math.atan2(b.y - a.y, b.x - a.x);
    const ang2 = Math.atan2(c.y - b.y, c.x - b.x);
    let diff = Math.abs((ang2 - ang1) * (180 / Math.PI));
    if (diff > 180) diff = 360 - diff;
    total += diff;
  }
  return total;
};

// Quanto o traço fechado se parece com uma elipse: compara cada ponto com o
// raio esperado da elipse que cabe no retângulo do traço.
const ellipseError = (points, bounds) => {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const rx = Math.max(1, bounds.w / 2);
  const ry = Math.max(1, bounds.h / 2);
  const erros = points.map((q) => {
    const nx = (q.x - cx) / rx;
    const ny = (q.y - cy) / ry;
    return Math.abs(Math.hypot(nx, ny) - 1);
  });
  return erros.reduce((s, e) => s + e, 0) / (erros.length || 1);
};

// Reconhecimento de forma: linha, retângulo, elipse ou triângulo.
// Devolve null quando o traço não se parece com nada — é melhor não adivinhar.
export const recognizeShape = (points) => {
  const lista = (points || []).map(p);
  if (lista.length < 3) return null;
  const bounds = strokeBounds(lista);
  if (bounds.w < 8 && bounds.h < 8) return null;
  const fechado = isClosed(lista);
  const cantos = countCorners(lista, 50, { closed: fechado });

  if (!fechado) {
    // Traço aberto e quase reto vira uma linha.
    const erroReta =
      lista.reduce(
        (s, q) => s + pointToSegment(q, lista[0], lista[lista.length - 1]),
        0,
      ) / lista.length;
    const escala = Math.max(bounds.w, bounds.h) || 1;
    if (erroReta / escala <= 0.08)
      return {
        kind: "linha",
        from: lista[0],
        to: lista[lista.length - 1],
        bounds,
      };
    return null;
  }

  // Rabisco: giro muito acima de uma volta. Preferimos devolver null a chutar
  // uma forma errada e apagar o desenho da pessoa.
  if (totalTurning(lista, { closed: true }) > 540) return null;

  // A contagem de cantos discrimina melhor que o erro de elipse: o retângulo
  // tem erro de elipse baixo o bastante para ser confundido, mas tem 4 cantos
  // nítidos, enquanto a elipse não tem canto nenhum.
  if (cantos === 4) return { kind: "retangulo", bounds };
  if (cantos === 3) return { kind: "triangulo", bounds };
  if (ellipseError(lista, bounds) <= 0.15) return { kind: "elipse", bounds };
  return null;
};

// Substitui o traço pela forma reconhecida, em pontos limpos.
export const shapeToPoints = (forma) => {
  if (!forma) return [];
  const b = forma.bounds;
  if (forma.kind === "linha") return [forma.from, forma.to];
  if (forma.kind === "retangulo")
    return [
      { x: b.x, y: b.y },
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
      { x: b.x, y: b.y },
    ];
  if (forma.kind === "triangulo")
    return [
      { x: b.x + b.w / 2, y: b.y },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
      { x: b.x + b.w / 2, y: b.y },
    ];
  // Elipse aproximada por 32 pontos — suficiente para desenho de reunião.
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const pontos = [];
  for (let i = 0; i <= 32; i += 1) {
    const t = (i / 32) * Math.PI * 2;
    pontos.push({ x: cx + (b.w / 2) * Math.cos(t), y: cy + (b.h / 2) * Math.sin(t) });
  }
  return pontos;
};

// Régua: prende o traço numa reta, encaixando em ângulos de 15 graus para sair
// horizontal, vertical ou diagonal exata.
export const applyRuler = (points, snapGraus = 15) => {
  const lista = (points || []).map(p);
  if (lista.length < 2) return lista;
  const a = lista[0];
  const b = lista[lista.length - 1];
  const comprimento = dist(a, b);
  if (comprimento === 0) return [a, b];
  const passo = (Number(snapGraus) || 15) * (Math.PI / 180);
  const angulo = Math.atan2(b.y - a.y, b.x - a.x);
  const encaixado = Math.round(angulo / passo) * passo;
  return [
    a,
    {
      x: a.x + Math.cos(encaixado) * comprimento,
      y: a.y + Math.sin(encaixado) * comprimento,
    },
  ];
};

// Borracha: remove os traços que passam perto do ponto apagado.
export const eraseAt = (strokes, ponto, raio = 12) => {
  const alvo = p(ponto);
  return (strokes || []).filter((traco) => {
    const pontos = traco?.points || [];
    if (pontos.length === 0) return true;
    if (pontos.length === 1) return dist(alvo, p(pontos[0])) > raio;
    for (let i = 1; i < pontos.length; i += 1)
      if (pointToSegment(alvo, pontos[i - 1], pontos[i]) <= raio) return false;
    return true;
  });
};

export const strokeToPath = (points) =>
  (points || [])
    .map((q, i) => `${i === 0 ? "M" : "L"} ${Math.round(q.x)} ${Math.round(q.y)}`)
    .join(" ");

// Notas e reações rápidas — o mínimo de "quadro de reunião" além do desenho.
export const makeNote = ({ id, x = 0, y = 0, text = "" } = {}) => ({
  id,
  x,
  y,
  text,
  reactions: {},
});

export const REACTIONS = ["👍", "❤️", "❓", "⚠️"];

export const toggleReaction = (note, emoji, userId) => {
  const atual = { ...(note?.reactions || {}) };
  const lista = atual[emoji] || [];
  const id = String(userId || "");
  if (!id || !REACTIONS.includes(emoji)) return note;
  atual[emoji] = lista.includes(id)
    ? lista.filter((u) => u !== id)
    : [...lista, id];
  if (atual[emoji].length === 0) delete atual[emoji];
  return { ...note, reactions: atual };
};

export const reactionCount = (note, emoji) => (note?.reactions?.[emoji] || []).length;

// As notas escritas viram tarefas — o "converter em tarefas" do item 33.
export const notesToTasks = (notes, { boardName } = {}) =>
  (notes || [])
    .filter((n) => String(n?.text || "").trim())
    .map((n) => ({
      sourceId: n.id,
      title: String(n.text).trim().split("\n")[0].slice(0, 140),
      notes: boardName ? `Do quadro rápido "${boardName}"` : "Do quadro rápido",
    }));

export const whiteboardToSvg = (strokes, notes, { padding = 24 } = {}) => {
  const todos = [
    ...(strokes || []).flatMap((s) => s.points || []),
    ...(notes || []).map((n) => ({ x: n.x, y: n.y })),
  ].map(p);
  const bounds = strokeBounds(todos) || { x: 0, y: 0, w: 200, h: 120 };
  const w = bounds.w + padding * 2;
  const h = bounds.h + padding * 2;
  const dx = padding - bounds.x;
  const dy = padding - bounds.y;
  const partes = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(w)} ${Math.round(
      h,
    )}" width="${Math.round(w)}" height="${Math.round(h)}">`,
    `<rect width="${Math.round(w)}" height="${Math.round(h)}" fill="#ffffff"/>`,
  ];
  for (const traco of strokes || []) {
    const spec = toolSpec(traco.tool);
    const pontos = (traco.points || []).map((q) => ({
      x: p(q).x + dx,
      y: p(q).y + dy,
    }));
    if (pontos.length === 0) continue;
    partes.push(
      `<path d="${strokeToPath(pontos)}" fill="none" stroke="${
        traco.color || "#0f172a"
      }" stroke-width="${traco.width || spec.width}" stroke-opacity="${
        spec.opacity
      }" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
  for (const nota of notes || []) {
    const texto = String(nota.text || "").replace(/[<>&]/g, "");
    partes.push(
      `<text x="${Math.round(nota.x + dx)}" y="${Math.round(
        nota.y + dy,
      )}" font-family="sans-serif" font-size="14" fill="#0f172a">${texto}</text>`,
    );
  }
  partes.push("</svg>");
  return partes.join("\n");
};

export const makeWhiteboard = (id, { businessId = null, ownerId = null, name = "" } = {}) => ({
  id,
  name: name || "Quadro rápido",
  strokes: [],
  notes: [],
  meetingId: "",
  businessId,
  ownerId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
