import { describe, expect, it } from "vitest";
import {
  BOARD_TEMPLATES,
  CANVAS_ELEMENT_TYPES,
  ZOOM_MAX,
  ZOOM_MIN,
  applyTemplate,
  boardToTasks,
  buildBoardAiPrompt,
  canvasToScreen,
  clampZoom,
  clusterByProximity,
  contentBounds,
  elementsInFrame,
  fitView,
  formatSeconds,
  makeBoard,
  makeCanvasElement,
  makeView,
  moveElement,
  panBy,
  parseBoardGroups,
  resizeElement,
  screenToCanvas,
  timerState,
  toggleVote,
  topVoted,
  zoomAt,
} from "./features/canvas/canvasDomain.js";

let contador = 0;
const uid = () => `e${(contador += 1)}`;

const postit = (id, x, y, text = "", votes = []) => ({
  ...makeCanvasElement("postit", { id, x, y }),
  text,
  votes,
});

describe("clampZoom", () => {
  it("mantém o zoom entre o mínimo e o máximo", () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it("cai para 1 com entrada inválida", () => {
    expect(clampZoom("abc")).toBe(1);
    expect(clampZoom(undefined)).toBe(1);
  });
});

describe("screenToCanvas e canvasToScreen", () => {
  it("são exatamente inversas", () => {
    const view = { x: 120, y: -40, zoom: 1.75 };
    const ponto = { x: 333, y: 210 };
    const volta = canvasToScreen(screenToCanvas(ponto, view), view);
    expect(volta.x).toBeCloseTo(ponto.x, 6);
    expect(volta.y).toBeCloseTo(ponto.y, 6);
  });

  it("na visão inicial tela e quadro coincidem", () => {
    expect(screenToCanvas({ x: 50, y: 70 }, makeView())).toEqual({ x: 50, y: 70 });
  });
});

describe("panBy", () => {
  it("desloca a visão sem mexer no zoom", () => {
    expect(panBy({ x: 10, y: 10, zoom: 2 }, 5, -3)).toEqual({
      x: 15,
      y: 7,
      zoom: 2,
    });
  });
});

describe("zoomAt", () => {
  it("mantém fixo o ponto sob o cursor", () => {
    const view = makeView();
    const cursor = { x: 400, y: 300 };
    const antes = screenToCanvas(cursor, view);
    const depois = zoomAt(view, cursor, 2);
    const pontoAgora = screenToCanvas(cursor, depois);
    expect(pontoAgora.x).toBeCloseTo(antes.x, 6);
    expect(pontoAgora.y).toBeCloseTo(antes.y, 6);
    expect(depois.zoom).toBe(2);
  });

  it("respeita o limite máximo de zoom", () => {
    const depois = zoomAt({ x: 0, y: 0, zoom: ZOOM_MAX }, { x: 10, y: 10 }, 4);
    expect(depois.zoom).toBe(ZOOM_MAX);
  });
});

describe("contentBounds e fitView", () => {
  it("envolve todos os elementos", () => {
    const bounds = contentBounds([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 200, y: 100, w: 100, h: 50 },
    ]);
    expect(bounds).toEqual({ x: 0, y: 0, w: 300, h: 150 });
  });

  it("é nulo com quadro vazio", () => {
    expect(contentBounds([])).toBeNull();
    expect(contentBounds(null)).toBeNull();
  });

  it("enquadra o conteúdo centralizado", () => {
    const elementos = [{ x: 0, y: 0, w: 200, h: 100 }];
    const view = fitView(elementos, { width: 800, height: 600 }, 0);
    // O centro do conteúdo (100,50) deve cair no centro da tela (400,300).
    const centro = canvasToScreen({ x: 100, y: 50 }, view);
    expect(centro.x).toBeCloseTo(400, 6);
    expect(centro.y).toBeCloseTo(300, 6);
  });

  it("devolve visão inicial sem conteúdo ou sem viewport", () => {
    expect(fitView([], { width: 800, height: 600 })).toEqual(makeView());
    expect(fitView([{ x: 0, y: 0, w: 10, h: 10 }], { width: 0, height: 0 })).toEqual(
      makeView(),
    );
  });
});

describe("makeCanvasElement, moveElement e resizeElement", () => {
  it("cria cada tipo com o tamanho padrão", () => {
    for (const spec of CANVAS_ELEMENT_TYPES) {
      const el = makeCanvasElement(spec.id, { id: "x" });
      expect(el.type).toBe(spec.id);
      expect(el.w).toBe(spec.w);
    }
  });

  it("post-it nasce com cor e os outros sem", () => {
    expect(makeCanvasElement("postit", { id: "a" }).color).toBeTruthy();
    expect(makeCanvasElement("rect", { id: "b" }).color).toBe("");
  });

  it("tipo desconhecido cai no primeiro tipo", () => {
    expect(makeCanvasElement("inexistente", { id: "z" }).type).toBe("postit");
  });

  it("move somando o deslocamento", () => {
    expect(moveElement({ x: 10, y: 20 }, 5, -5)).toMatchObject({ x: 15, y: 15 });
  });

  it("redimensiona respeitando o mínimo", () => {
    expect(resizeElement({ type: "rect" }, 5, 5, 32)).toMatchObject({
      w: 32,
      h: 32,
    });
  });

  it("seta não ganha altura ao redimensionar", () => {
    expect(resizeElement({ type: "arrow" }, 300, 200).h).toBe(0);
  });
});

describe("elementsInFrame", () => {
  const area = { id: "f1", type: "frame", x: 0, y: 0, w: 400, h: 300 };

  it("pega só o que está inteiramente dentro", () => {
    const dentro = postit("a", 20, 20);
    const fora = postit("b", 500, 20);
    const meio = { ...postit("c", 380, 20) }; // começa dentro, termina fora
    const achados = elementsInFrame([dentro, fora, meio, area], area);
    expect(achados.map((e) => e.id)).toEqual(["a"]);
  });

  it("não inclui outras áreas nem a si mesma", () => {
    const outra = { id: "f2", type: "frame", x: 10, y: 10, w: 50, h: 50 };
    expect(elementsInFrame([area, outra], area)).toEqual([]);
  });

  it("sem área devolve lista vazia", () => {
    expect(elementsInFrame([postit("a", 0, 0)], null)).toEqual([]);
  });
});

describe("clusterByProximity", () => {
  it("agrupa post-its próximos e separa os distantes", () => {
    const elementos = [
      postit("a", 0, 0),
      postit("b", 60, 40),
      postit("c", 1000, 1000),
    ];
    const grupos = clusterByProximity(elementos, 200);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(grupos[1].map((e) => e.id)).toEqual(["c"]);
  });

  it("agrupa em cadeia: a perto de b, b perto de c", () => {
    const elementos = [postit("a", 0, 0), postit("b", 150, 0), postit("c", 300, 0)];
    expect(clusterByProximity(elementos, 200)).toHaveLength(1);
  });

  it("ignora elementos que não são post-it", () => {
    const elementos = [postit("a", 0, 0), { id: "r", type: "rect", x: 10, y: 10 }];
    const grupos = clusterByProximity(elementos, 200);
    expect(grupos.flat().map((e) => e.id)).toEqual(["a"]);
  });

  it("quadro sem post-it não gera grupo", () => {
    expect(clusterByProximity([], 200)).toEqual([]);
  });
});

describe("toggleVote e topVoted", () => {
  it("vota e desfaz o voto da mesma pessoa", () => {
    const um = toggleVote(postit("a", 0, 0), "u1");
    expect(um.votes).toEqual(["u1"]);
    expect(toggleVote(um, "u1").votes).toEqual([]);
  });

  it("pessoas diferentes somam votos", () => {
    const um = toggleVote(postit("a", 0, 0), "u1");
    expect(toggleVote(um, "u2").votes).toEqual(["u1", "u2"]);
  });

  it("ignora votante sem identificação", () => {
    const el = postit("a", 0, 0);
    expect(toggleVote(el, "")).toBe(el);
  });

  it("ordena os mais votados e ignora os sem voto", () => {
    const elementos = [
      postit("a", 0, 0, "um", ["u1"]),
      postit("b", 0, 0, "dois", ["u1", "u2", "u3"]),
      postit("c", 0, 0, "tres", []),
    ];
    const top = topVoted(elementos);
    expect(top.map((t) => t.element.id)).toEqual(["b", "a"]);
    expect(top[0].votes).toBe(3);
  });
});

describe("timerState e formatSeconds", () => {
  it("conta o tempo restante", () => {
    const estado = timerState(
      "2026-07-29T10:00:00.000Z",
      300,
      "2026-07-29T10:01:00.000Z",
    );
    expect(estado).toEqual({ running: true, remaining: 240, expired: false });
  });

  it("marca como encerrado quando o tempo acaba", () => {
    const estado = timerState(
      "2026-07-29T10:00:00.000Z",
      60,
      "2026-07-29T10:05:00.000Z",
    );
    expect(estado.expired).toBe(true);
    expect(estado.remaining).toBe(0);
    expect(estado.running).toBe(false);
  });

  it("não está rodando sem início ou sem duração", () => {
    expect(timerState("", 300, "2026-07-29T10:00:00.000Z").running).toBe(false);
    expect(timerState("2026-07-29T10:00:00.000Z", 0, "2026-07-29T10:00:00.000Z").running).toBe(
      false,
    );
  });

  it("formata em minutos e segundos", () => {
    expect(formatSeconds(0)).toBe("00:00");
    expect(formatSeconds(95)).toBe("01:35");
    expect(formatSeconds(-10)).toBe("00:00");
  });
});

describe("templates", () => {
  it("todos os templates geram elementos com id único", () => {
    for (const template of BOARD_TEMPLATES) {
      contador = 0;
      const elementos = applyTemplate(template, uid);
      expect(elementos.length).toBeGreaterThan(0);
      const ids = elementos.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("o SWOT tem as quatro áreas nomeadas", () => {
    contador = 0;
    const swot = applyTemplate(
      BOARD_TEMPLATES.find((t) => t.id === "swot"),
      uid,
    );
    expect(swot.map((e) => e.text)).toEqual([
      "Forças",
      "Fraquezas",
      "Oportunidades",
      "Ameaças",
    ]);
    expect(swot.every((e) => e.type === "frame")).toBe(true);
  });

  it("o canvas de modelo de negócio tem nove blocos", () => {
    contador = 0;
    const canvas = applyTemplate(
      BOARD_TEMPLATES.find((t) => t.id === "modelo-negocio"),
      uid,
    );
    expect(canvas).toHaveLength(9);
  });

  it("template inválido devolve lista vazia", () => {
    expect(applyTemplate(null, uid)).toEqual([]);
    expect(applyTemplate({}, uid)).toEqual([]);
  });
});

describe("boardToTasks", () => {
  it("transforma post-its escritos em tarefas", () => {
    const elementos = [
      postit("a", 0, 0, "Ligar para o fornecedor"),
      postit("b", 0, 0, "   "),
      { id: "r", type: "rect", text: "não é post-it" },
    ];
    const tarefas = boardToTasks(elementos, { frameName: "A fazer" });
    expect(tarefas).toHaveLength(1);
    expect(tarefas[0]).toMatchObject({
      title: "Ligar para o fornecedor",
      sourceId: "a",
    });
    expect(tarefas[0].notes).toContain("A fazer");
  });

  it("usa só a primeira linha do post-it como título", () => {
    const tarefas = boardToTasks([postit("a", 0, 0, "Primeira linha\nresto")]);
    expect(tarefas[0].title).toBe("Primeira linha");
  });

  it("leva a contagem de votos junto", () => {
    const tarefas = boardToTasks([postit("a", 0, 0, "Ideia", ["u1", "u2"])]);
    expect(tarefas[0].votes).toBe(2);
  });
});

describe("buildBoardAiPrompt", () => {
  const elementos = [postit("a", 0, 0, "atender mais rápido"), postit("b", 0, 0, "")];

  it("inclui as ideias escritas e proíbe inventar", () => {
    const prompt = buildBoardAiPrompt("agrupar", elementos, { name: "Ideias" });
    expect(prompt).toContain("atender mais rápido");
    expect(prompt).toContain("Ideias");
    expect(prompt).toMatch(/sem inventar|Não invente/i);
  });

  it("muda a instrução conforme o modo", () => {
    expect(buildBoardAiPrompt("resumir", elementos, {})).toContain("resumo curto");
    expect(buildBoardAiPrompt("plano", elementos, {})).toContain("plano de ação");
    expect(buildBoardAiPrompt("agrupar", elementos, {})).toContain("Tema:");
  });

  it("avisa quando não há ideia escrita", () => {
    expect(buildBoardAiPrompt("resumir", [], {})).toContain("nenhuma ideia escrita");
  });
});

describe("parseBoardGroups", () => {
  it("lê os temas e as ideias de cada um", () => {
    const grupos = parseBoardGroups(
      "Tema: Atendimento\n- responder rápido\n- ser gentil\n\nTema: Preço\n- revisar tabela",
    );
    expect(grupos).toHaveLength(2);
    expect(grupos[0]).toEqual({
      theme: "Atendimento",
      items: ["responder rápido", "ser gentil"],
    });
    expect(grupos[1].items).toEqual(["revisar tabela"]);
  });

  it("tolera markdown e maiúsculas", () => {
    const grupos = parseBoardGroups("## **TEMA: Vendas**\n- **fechar mais**");
    expect(grupos[0]).toEqual({ theme: "Vendas", items: ["fechar mais"] });
  });

  it("descarta tema sem nenhuma ideia", () => {
    expect(parseBoardGroups("Tema: Vazio\n\nTema: Cheio\n- algo")).toHaveLength(1);
  });

  it("ignora texto antes do primeiro tema", () => {
    expect(parseBoardGroups("blá blá\n- solto\nTema: X\n- item")).toEqual([
      { theme: "X", items: ["item"] },
    ]);
  });
});

describe("makeBoard", () => {
  it("nasce vazio, com visão inicial e sem votação aberta", () => {
    const board = makeBoard("b1", { businessId: "biz" });
    expect(board.elements).toEqual([]);
    expect(board.view).toEqual(makeView());
    expect(board.votingOpen).toBe(false);
    expect(board.name).toBe("Quadro sem nome");
  });
});
