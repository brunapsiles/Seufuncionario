// ===== Diagramas técnicos: formas, conectores, validação e conversões =====
// Camada pura: biblioteca de formas, ancoragem e roteamento de conectores,
// alinhamento, validação de grafo (órfãos, desconectados, ciclos, regras BPMN),
// geração de organograma a partir de dados, e Mermaid/CSV nos dois sentidos.

export const SHAPE_CATEGORIES = [
  { id: "fluxo", label: "Fluxograma" },
  { id: "bpmn", label: "BPMN" },
  { id: "uml", label: "UML" },
  { id: "org", label: "Organograma" },
  { id: "rede", label: "Redes e segurança" },
  { id: "nuvem", label: "Nuvem" },
  { id: "industria", label: "Processo industrial" },
];

// Cada forma tem um "kind" que diz como é desenhada, e um papel opcional no
// BPMN (start, end, task, gateway) usado pela validação.
export const SHAPE_LIBRARY = [
  { id: "processo", label: "Processo", category: "fluxo", kind: "rect", w: 160, h: 70 },
  { id: "decisao", label: "Decisão", category: "fluxo", kind: "diamond", w: 130, h: 100 },
  { id: "inicio-fim", label: "Início / Fim", category: "fluxo", kind: "stadium", w: 130, h: 56 },
  { id: "documento", label: "Documento", category: "fluxo", kind: "doc", w: 150, h: 80 },
  { id: "dados", label: "Dados", category: "fluxo", kind: "parallelogram", w: 160, h: 70 },

  { id: "bpmn-inicio", label: "Evento inicial", category: "bpmn", kind: "circle", w: 60, h: 60, bpmn: "start" },
  { id: "bpmn-fim", label: "Evento final", category: "bpmn", kind: "circle-thick", w: 60, h: 60, bpmn: "end" },
  { id: "bpmn-tarefa", label: "Tarefa", category: "bpmn", kind: "rect-round", w: 160, h: 80, bpmn: "task" },
  { id: "bpmn-gateway", label: "Gateway", category: "bpmn", kind: "diamond", w: 80, h: 80, bpmn: "gateway" },
  { id: "bpmn-subprocesso", label: "Subprocesso", category: "bpmn", kind: "rect-round", w: 170, h: 90, bpmn: "task" },

  { id: "uml-classe", label: "Classe", category: "uml", kind: "class", w: 180, h: 110 },
  { id: "uml-ator", label: "Ator", category: "uml", kind: "actor", w: 70, h: 110 },
  { id: "uml-caso", label: "Caso de uso", category: "uml", kind: "ellipse", w: 170, h: 80 },

  { id: "org-pessoa", label: "Pessoa", category: "org", kind: "card", w: 170, h: 76 },
  { id: "org-area", label: "Área", category: "org", kind: "rect", w: 170, h: 60 },

  { id: "rede-servidor", label: "Servidor", category: "rede", kind: "server", w: 110, h: 90 },
  { id: "rede-firewall", label: "Firewall", category: "rede", kind: "brick", w: 130, h: 70 },
  { id: "rede-roteador", label: "Roteador", category: "rede", kind: "circle", w: 90, h: 90 },
  { id: "rede-nuvem", label: "Internet", category: "rede", kind: "cloud", w: 150, h: 90 },

  { id: "nuvem-computacao", label: "Computação", category: "nuvem", kind: "rect-round", w: 150, h: 80 },
  { id: "nuvem-banco", label: "Banco de dados", category: "nuvem", kind: "cylinder", w: 130, h: 100 },
  { id: "nuvem-fila", label: "Fila", category: "nuvem", kind: "rect", w: 150, h: 60 },
  { id: "nuvem-armazenamento", label: "Armazenamento", category: "nuvem", kind: "cylinder", w: 130, h: 100 },

  { id: "ind-tanque", label: "Tanque", category: "industria", kind: "cylinder", w: 120, h: 120 },
  { id: "ind-valvula", label: "Válvula", category: "industria", kind: "diamond", w: 70, h: 70 },
  { id: "ind-esteira", label: "Esteira", category: "industria", kind: "parallelogram", w: 180, h: 60 },
];

export const shapeSpec = (shapeId) =>
  SHAPE_LIBRARY.find((s) => s.id === shapeId) || SHAPE_LIBRARY[0];

export const shapesByCategory = (categoryId) =>
  SHAPE_LIBRARY.filter((s) => s.category === categoryId);

export const GRID = 10;

// Encaixe na grade — mantém o desenho alinhado sem trabalho manual.
export const snapToGrid = (value, grid = GRID) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const g = Math.max(1, Math.floor(Number(grid) || GRID));
  return Math.round(n / g) * g;
};

export const makeNode = (shapeId, { id, x = 0, y = 0, text = "" } = {}) => {
  const spec = shapeSpec(shapeId);
  return {
    id,
    shape: spec.id,
    x: snapToGrid(x),
    y: snapToGrid(y),
    w: spec.w,
    h: spec.h,
    text,
    layer: 0,
    // Vínculo opcional com dados: base, registro e campo que dá a cor.
    dataBaseId: "",
    dataRowId: "",
    dataField: "",
  };
};

export const makeEdge = ({ id, from, to, label = "", kind = "seta" } = {}) => ({
  id,
  from,
  to,
  label,
  kind,
});

// Os quatro pontos de ancoragem de uma forma (topo, direita, base, esquerda).
export const anchorPoints = (node) => {
  const x = Number(node?.x) || 0;
  const y = Number(node?.y) || 0;
  const w = Number(node?.w) || 0;
  const h = Number(node?.h) || 0;
  return {
    top: { x: x + w / 2, y },
    right: { x: x + w, y: y + h / 2 },
    bottom: { x: x + w / 2, y: y + h },
    left: { x, y: y + h / 2 },
  };
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Escolhe o par de âncoras mais curto entre duas formas. É isso que faz o
// conector "grudar" e se reposicionar sozinho quando a forma se move.
export const nearestAnchors = (from, to) => {
  const a = anchorPoints(from);
  const b = anchorPoints(to);
  let melhor = null;
  for (const [ladoA, pontoA] of Object.entries(a)) {
    for (const [ladoB, pontoB] of Object.entries(b)) {
      const d = dist(pontoA, pontoB);
      if (!melhor || d < melhor.distance)
        melhor = { from: pontoA, to: pontoB, fromSide: ladoA, toSide: ladoB, distance: d };
    }
  }
  return melhor;
};

// Roteamento em cotovelo (ortogonal): sai da forma, faz um degrau, chega na
// outra. Nunca devolve diagonal, que é o que deixa diagrama técnico feio.
export const orthogonalRoute = (from, to) => {
  const par = nearestAnchors(from, to);
  if (!par) return [];
  const { from: a, to: b, fromSide } = par;
  if (a.x === b.x || a.y === b.y) return [a, b];
  const horizontal = fromSide === "left" || fromSide === "right";
  const meio = horizontal
    ? [
        { x: (a.x + b.x) / 2, y: a.y },
        { x: (a.x + b.x) / 2, y: b.y },
      ]
    : [
        { x: a.x, y: (a.y + b.y) / 2 },
        { x: b.x, y: (a.y + b.y) / 2 },
      ];
  return [a, ...meio, b];
};

export const routeToPath = (pontos) =>
  (pontos || [])
    .map((p, i) => `${i === 0 ? "M" : "L"} ${Math.round(p.x)} ${Math.round(p.y)}`)
    .join(" ");

// Alinhamento de várias formas selecionadas.
export const alignNodes = (nodes, ids, mode) => {
  const alvo = (nodes || []).filter((n) => (ids || []).includes(n.id));
  if (alvo.length < 2) return nodes || [];
  const esquerda = Math.min(...alvo.map((n) => n.x));
  const direita = Math.max(...alvo.map((n) => n.x + n.w));
  const topo = Math.min(...alvo.map((n) => n.y));
  const base = Math.max(...alvo.map((n) => n.y + n.h));
  const mover = (n) => {
    if (mode === "esquerda") return { ...n, x: esquerda };
    if (mode === "direita") return { ...n, x: direita - n.w };
    if (mode === "topo") return { ...n, y: topo };
    if (mode === "base") return { ...n, y: base - n.h };
    if (mode === "centro-h")
      return { ...n, x: snapToGrid((esquerda + direita) / 2 - n.w / 2) };
    if (mode === "centro-v")
      return { ...n, y: snapToGrid((topo + base) / 2 - n.h / 2) };
    return n;
  };
  return (nodes || []).map((n) => ((ids || []).includes(n.id) ? mover(n) : n));
};

// Distribui com espaçamento igual entre as formas selecionadas.
export const distributeNodes = (nodes, ids, axis = "h") => {
  const alvo = (nodes || [])
    .filter((n) => (ids || []).includes(n.id))
    .sort((a, b) => (axis === "h" ? a.x - b.x : a.y - b.y));
  if (alvo.length < 3) return nodes || [];
  const primeiro = alvo[0];
  const ultimo = alvo[alvo.length - 1];
  const inicio = axis === "h" ? primeiro.x : primeiro.y;
  const fim = axis === "h" ? ultimo.x : ultimo.y;
  const passo = (fim - inicio) / (alvo.length - 1);
  const posicoes = new Map(
    alvo.map((n, i) => [n.id, snapToGrid(inicio + passo * i)]),
  );
  return (nodes || []).map((n) => {
    if (!posicoes.has(n.id)) return n;
    return axis === "h"
      ? { ...n, x: posicoes.get(n.id) }
      : { ...n, y: posicoes.get(n.id) };
  });
};

// ===== Validação do diagrama =====

// Formas que não têm nenhum conector — quase sempre esquecimento.
export const findOrphans = (nodes, edges) => {
  const ligados = new Set();
  for (const e of edges || []) {
    ligados.add(e.from);
    ligados.add(e.to);
  }
  return (nodes || []).filter((n) => !ligados.has(n.id));
};

// Conectores apontando para forma que não existe mais.
export const findBrokenEdges = (nodes, edges) => {
  const ids = new Set((nodes || []).map((n) => n.id));
  return (edges || []).filter(
    (e) => !ids.has(e.from) || !ids.has(e.to) || e.from === e.to,
  );
};

// Ciclos no grafo, por busca em profundidade com pilha de recursão.
// Devolve os caminhos encontrados, começando e terminando no mesmo nó.
export const findCycles = (nodes, edges) => {
  const saidas = new Map();
  for (const e of edges || []) {
    if (e.from === e.to) continue;
    if (!saidas.has(e.from)) saidas.set(e.from, []);
    saidas.get(e.from).push(e.to);
  }
  const ciclos = [];
  const visitado = new Set();
  const naPilha = new Set();
  const caminho = [];
  const vistos = new Set();
  const visitar = (id) => {
    visitado.add(id);
    naPilha.add(id);
    caminho.push(id);
    for (const proximo of saidas.get(id) || []) {
      if (naPilha.has(proximo)) {
        const inicio = caminho.indexOf(proximo);
        const ciclo = [...caminho.slice(inicio), proximo];
        // Normaliza para não relatar o mesmo ciclo várias vezes.
        const chave = [...ciclo].slice(0, -1).sort().join(">");
        if (!vistos.has(chave)) {
          vistos.add(chave);
          ciclos.push(ciclo);
        }
        continue;
      }
      if (!visitado.has(proximo)) visitar(proximo);
    }
    naPilha.delete(id);
    caminho.pop();
  };
  for (const n of nodes || []) if (!visitado.has(n.id)) visitar(n.id);
  return ciclos;
};

// Ilhas: grupos de formas que não se alcançam entre si (ignorando o sentido).
export const findDisconnectedGroups = (nodes, edges) => {
  const vizinhos = new Map((nodes || []).map((n) => [n.id, []]));
  for (const e of edges || []) {
    if (vizinhos.has(e.from) && vizinhos.has(e.to)) {
      vizinhos.get(e.from).push(e.to);
      vizinhos.get(e.to).push(e.from);
    }
  }
  const visitado = new Set();
  const grupos = [];
  for (const n of nodes || []) {
    if (visitado.has(n.id)) continue;
    const fila = [n.id];
    const grupo = [];
    visitado.add(n.id);
    while (fila.length > 0) {
      const atual = fila.pop();
      grupo.push(atual);
      for (const v of vizinhos.get(atual) || [])
        if (!visitado.has(v)) {
          visitado.add(v);
          fila.push(v);
        }
    }
    grupos.push(grupo);
  }
  return grupos;
};

// Regras de BPMN que valem a pena checar num diagrama de processo.
export const validateBpmn = (nodes, edges) => {
  const problemas = [];
  const bpmn = (nodes || []).filter((n) => shapeSpec(n.shape).bpmn);
  if (bpmn.length === 0) return problemas;
  const papel = (n) => shapeSpec(n.shape).bpmn;
  const inicios = bpmn.filter((n) => papel(n) === "start");
  const fins = bpmn.filter((n) => papel(n) === "end");
  if (inicios.length === 0)
    problemas.push({ rule: "sem-inicio", message: "O processo não tem evento inicial." });
  if (fins.length === 0)
    problemas.push({ rule: "sem-fim", message: "O processo não tem evento final." });
  const entradas = new Map();
  const saidas = new Map();
  for (const e of edges || []) {
    saidas.set(e.from, (saidas.get(e.from) || 0) + 1);
    entradas.set(e.to, (entradas.get(e.to) || 0) + 1);
  }
  for (const n of bpmn) {
    const p = papel(n);
    const nome = n.text || shapeSpec(n.shape).label;
    if (p === "start" && (entradas.get(n.id) || 0) > 0)
      problemas.push({
        rule: "inicio-com-entrada",
        nodeId: n.id,
        message: `"${nome}" é evento inicial e não pode receber conector.`,
      });
    if (p === "start" && (saidas.get(n.id) || 0) === 0)
      problemas.push({
        rule: "inicio-sem-saida",
        nodeId: n.id,
        message: `"${nome}" é evento inicial e precisa de uma saída.`,
      });
    if (p === "end" && (saidas.get(n.id) || 0) > 0)
      problemas.push({
        rule: "fim-com-saida",
        nodeId: n.id,
        message: `"${nome}" é evento final e não pode ter saída.`,
      });
    if (p === "end" && (entradas.get(n.id) || 0) === 0)
      problemas.push({
        rule: "fim-sem-entrada",
        nodeId: n.id,
        message: `"${nome}" é evento final e precisa receber um conector.`,
      });
    if (p === "gateway" && (saidas.get(n.id) || 0) < 2)
      problemas.push({
        rule: "gateway-sem-ramo",
        nodeId: n.id,
        message: `"${nome}" é um gateway e precisa de pelo menos dois caminhos de saída.`,
      });
    if (p === "task" && (entradas.get(n.id) || 0) === 0)
      problemas.push({
        rule: "tarefa-sem-entrada",
        nodeId: n.id,
        message: `"${nome}" não é alcançada por nenhum caminho.`,
      });
  }
  return problemas;
};

// Relatório completo, na ordem de gravidade.
export const validateDiagram = (nodes, edges) => {
  const quebrados = findBrokenEdges(nodes, edges);
  const orfaos = findOrphans(nodes, edges);
  const ciclos = findCycles(nodes, edges);
  const grupos = findDisconnectedGroups(nodes, edges);
  const bpmn = validateBpmn(nodes, edges);
  const itens = [
    ...quebrados.map((e) => ({
      severity: "erro",
      rule: "conector-invalido",
      message: `Conector inválido: aponta para uma forma que não existe ou para si mesma.`,
      edgeId: e.id,
    })),
    ...bpmn.map((p) => ({ severity: "erro", ...p })),
    ...ciclos.map((c) => ({
      severity: "aviso",
      rule: "ciclo",
      message: `Existe um ciclo: ${c.join(" → ")}.`,
    })),
    ...orfaos.map((n) => ({
      severity: "aviso",
      rule: "orfao",
      nodeId: n.id,
      message: `"${n.text || shapeSpec(n.shape).label}" não está ligada a nada.`,
    })),
  ];
  if (grupos.length > 1)
    itens.push({
      severity: "aviso",
      rule: "ilhas",
      message: `O diagrama tem ${grupos.length} partes que não se conectam entre si.`,
    });
  return {
    ok: itens.length === 0,
    errors: itens.filter((i) => i.severity === "erro").length,
    warnings: itens.filter((i) => i.severity === "aviso").length,
    items: itens,
  };
};

// ===== Organograma a partir de dados =====
// Gera formas e conectores de uma base, e posiciona por nível de hierarquia.
export const orgChartFromRows = (
  rows,
  { idField = "id", nameField = "nome", parentField = "responde a" } = {},
  makeId = (i) => `n${i}`,
) => {
  const lista = (rows || []).filter(Boolean);
  const chave = (row) => String(row?.[idField] ?? "").trim();
  const porChave = new Map();
  lista.forEach((row, i) => {
    const k = chave(row) || `linha-${i}`;
    if (!porChave.has(k)) porChave.set(k, { row, id: makeId(i), key: k });
  });
  const nivel = (k, visitados = new Set()) => {
    const item = porChave.get(k);
    if (!item || visitados.has(k)) return 0;
    visitados.add(k);
    const pai = String(item.row?.[parentField] ?? "").trim();
    if (!pai || !porChave.has(pai)) return 0;
    return 1 + nivel(pai, visitados);
  };
  const porNivel = new Map();
  const nodes = [];
  for (const item of porChave.values()) {
    const n = nivel(item.key);
    const coluna = porNivel.get(n) || 0;
    porNivel.set(n, coluna + 1);
    nodes.push({
      ...makeNode("org-pessoa", {
        id: item.id,
        x: coluna * 210,
        y: n * 130,
        text: String(item.row?.[nameField] ?? "").trim() || item.key,
      }),
      dataRowId: item.key,
    });
  }
  const edges = [];
  for (const item of porChave.values()) {
    const pai = String(item.row?.[parentField] ?? "").trim();
    if (pai && porChave.has(pai) && pai !== item.key)
      edges.push(
        makeEdge({
          id: `e-${porChave.get(pai).id}-${item.id}`,
          from: porChave.get(pai).id,
          to: item.id,
        }),
      );
  }
  return { nodes, edges };
};

// Cor da forma a partir de um valor de dado — o "status por cor" do Visio.
export const STATUS_RULES = [
  { match: ["ok", "concluido", "concluída", "concluido", "ativo", "no prazo", "sim"], color: "#16a34a" },
  { match: ["atencao", "atenção", "parcial", "em andamento", "fazendo"], color: "#d97706" },
  { match: ["risco", "atrasado", "erro", "bloqueado", "critico", "crítico", "nao", "não"], color: "#dc2626" },
];

export const statusColor = (value) => {
  const alvo = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!alvo) return "";
  for (const regra of STATUS_RULES)
    if (
      regra.match.some((m) =>
        alvo.includes(
          m.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
        ),
      )
    )
      return regra.color;
  return "";
};

// ===== Mermaid nos dois sentidos =====

const mermaidId = (id) => String(id).replace(/[^A-Za-z0-9_]/g, "_");
const mermaidLabel = (text) =>
  String(text || "")
    .replace(/\n+/g, " ")
    .replace(/["[\]{}()|]/g, "")
    .trim();

export const toMermaid = (nodes, edges) => {
  const linhas = ["flowchart TD"];
  for (const n of nodes || []) {
    const spec = shapeSpec(n.shape);
    const rotulo = mermaidLabel(n.text) || spec.label;
    const id = mermaidId(n.id);
    if (spec.kind === "diamond") linhas.push(`  ${id}{${rotulo}}`);
    else if (spec.kind === "stadium" || spec.kind === "circle" || spec.kind === "circle-thick")
      linhas.push(`  ${id}([${rotulo}])`);
    else if (spec.kind === "cylinder") linhas.push(`  ${id}[(${rotulo})]`);
    else if (spec.kind === "ellipse") linhas.push(`  ${id}((${rotulo}))`);
    else linhas.push(`  ${id}[${rotulo}]`);
  }
  for (const e of edges || []) {
    const rotulo = mermaidLabel(e.label);
    linhas.push(
      `  ${mermaidId(e.from)} -->${rotulo ? `|${rotulo}|` : ""} ${mermaidId(e.to)}`,
    );
  }
  return linhas.join("\n");
};

// Lê um flowchart Mermaid simples de volta para formas e conectores.
export const parseMermaid = (texto) => {
  const nodes = new Map();
  const edges = [];
  const garantir = (id, rotulo, kind) => {
    if (!nodes.has(id))
      nodes.set(id, { id, text: rotulo || id, kind: kind || "rect" });
    else if (rotulo) {
      const atual = nodes.get(id);
      if (atual.text === id) atual.text = rotulo;
      if (kind) atual.kind = kind;
    }
  };
  const forma = (bruto) => {
    const m =
      /^([A-Za-z0-9_]+)\s*(?:\{([^}]*)\}|\(\(([^)]*)\)\)|\(\[([^\]]*)\]\)|\[\(([^)]*)\)\]|\[([^\]]*)\])?/.exec(
        bruto.trim(),
      );
    if (!m) return null;
    const rotulo = m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? "";
    let kind = "rect";
    if (m[2] != null) kind = "diamond";
    else if (m[3] != null) kind = "ellipse";
    else if (m[4] != null) kind = "stadium";
    else if (m[5] != null) kind = "cylinder";
    return { id: m[1], label: rotulo.trim(), kind };
  };
  for (const linhaBruta of String(texto || "").split("\n")) {
    const linha = linhaBruta.trim();
    if (!linha || /^(flowchart|graph)\b/i.test(linha)) continue;
    const conexao = /^(.+?)\s*--+>\s*(?:\|([^|]*)\|\s*)?(.+)$/.exec(linha);
    if (conexao) {
      const de = forma(conexao[1]);
      const para = forma(conexao[3]);
      if (!de || !para) continue;
      garantir(de.id, de.label, de.kind);
      garantir(para.id, para.label, para.kind);
      edges.push({
        id: `e-${de.id}-${para.id}-${edges.length}`,
        from: de.id,
        to: para.id,
        label: (conexao[2] || "").trim(),
      });
      continue;
    }
    const soForma = forma(linha);
    if (soForma && soForma.label) garantir(soForma.id, soForma.label, soForma.kind);
  }
  // Posiciona em coluna para o desenho não nascer todo sobreposto.
  const kindParaForma = {
    diamond: "decisao",
    ellipse: "uml-caso",
    stadium: "inicio-fim",
    cylinder: "nuvem-banco",
    rect: "processo",
  };
  const lista = [...nodes.values()].map((n, i) => ({
    ...makeNode(kindParaForma[n.kind] || "processo", {
      id: n.id,
      x: 60,
      y: i * 120,
      text: n.text,
    }),
  }));
  return { nodes: lista, edges };
};

// ===== CSV nos dois sentidos (formas e conectores) =====

export const toCsv = (nodes, edges) => {
  const escapar = (v) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = ["tipo;id;forma;texto;x;y;de;para;rotulo"];
  for (const n of nodes || [])
    linhas.push(
      ["forma", n.id, n.shape, n.text, n.x, n.y, "", "", ""].map(escapar).join(";"),
    );
  for (const e of edges || [])
    linhas.push(
      ["conector", e.id, "", "", "", "", e.from, e.to, e.label].map(escapar).join(";"),
    );
  return linhas.join("\n");
};

// Divide uma linha de CSV respeitando aspas: um ponto e vírgula dentro de
// aspas é conteúdo, não separador. Dividir por split(";") corrompe o dado.
const csvFields = (linha) => {
  const campos = [];
  let atual = "";
  let dentroDeAspas = false;
  const texto = String(linha || "");
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (c === '"') {
      if (dentroDeAspas && texto[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else dentroDeAspas = !dentroDeAspas;
      continue;
    }
    if (c === ";" && !dentroDeAspas) {
      campos.push(atual);
      atual = "";
      continue;
    }
    atual += c;
  }
  campos.push(atual);
  return campos;
};

export const fromCsv = (texto) => {
  const linhas = String(texto || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const nodes = [];
  const edges = [];
  for (const linha of linhas.slice(1)) {
    const campos = csvFields(linha);
    const [tipo, id, forma, texto2, x, y, de, para, rotulo] = campos;
    if (tipo === "forma" && id)
      nodes.push(
        makeNode(forma || "processo", {
          id,
          x: Number(x) || 0,
          y: Number(y) || 0,
          text: texto2 || "",
        }),
      );
    else if (tipo === "conector" && de && para)
      edges.push(makeEdge({ id: id || `e-${de}-${para}`, from: de, to: para, label: rotulo || "" }));
  }
  return { nodes, edges };
};

// SVG do diagrama, para exportar e para imprimir em PDF pelo navegador.
export const toSvg = (nodes, edges, { padding = 40 } = {}) => {
  const lista = nodes || [];
  const minX = lista.length ? Math.min(...lista.map((n) => n.x)) : 0;
  const minY = lista.length ? Math.min(...lista.map((n) => n.y)) : 0;
  const maxX = lista.length ? Math.max(...lista.map((n) => n.x + n.w)) : 100;
  const maxY = lista.length ? Math.max(...lista.map((n) => n.y + n.h)) : 100;
  const w = maxX - minX + padding * 2;
  const h = maxY - minY + padding * 2;
  const dx = padding - minX;
  const dy = padding - minY;
  const porId = new Map(lista.map((n) => [n.id, n]));
  const partes = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `<rect width="${w}" height="${h}" fill="#ffffff"/>`,
  ];
  for (const e of edges || []) {
    const de = porId.get(e.from);
    const para = porId.get(e.to);
    if (!de || !para) continue;
    const rota = orthogonalRoute(de, para).map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));
    partes.push(
      `<path d="${routeToPath(rota)}" fill="none" stroke="#475569" stroke-width="2"/>`,
    );
  }
  for (const n of lista) {
    const spec = shapeSpec(n.shape);
    const x = n.x + dx;
    const y = n.y + dy;
    const cor = statusColor(n.statusValue) || "#ffffff";
    if (spec.kind === "diamond")
      partes.push(
        `<polygon points="${x + n.w / 2},${y} ${x + n.w},${y + n.h / 2} ${
          x + n.w / 2
        },${y + n.h} ${x},${y + n.h / 2}" fill="${cor}" stroke="#334155" stroke-width="2"/>`,
      );
    else if (spec.kind === "ellipse" || spec.kind === "circle" || spec.kind === "circle-thick")
      partes.push(
        `<ellipse cx="${x + n.w / 2}" cy="${y + n.h / 2}" rx="${n.w / 2}" ry="${
          n.h / 2
        }" fill="${cor}" stroke="#334155" stroke-width="2"/>`,
      );
    else
      partes.push(
        `<rect x="${x}" y="${y}" width="${n.w}" height="${n.h}" rx="8" fill="${cor}" stroke="#334155" stroke-width="2"/>`,
      );
    const rotulo = String(n.text || spec.label).replace(/[<>&]/g, "");
    partes.push(
      `<text x="${x + n.w / 2}" y="${
        y + n.h / 2 + 5
      }" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#0f172a">${rotulo}</text>`,
    );
  }
  partes.push("</svg>");
  return partes.join("\n");
};

export const makeDiagram = (id, { businessId = null, ownerId = null, name = "" } = {}) => ({
  id,
  name: name || "Diagrama sem nome",
  nodes: [],
  edges: [],
  businessId,
  ownerId,
  createdAt: new Date().toISOString(),
});
