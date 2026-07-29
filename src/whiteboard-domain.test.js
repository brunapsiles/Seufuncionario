import { describe, expect, it } from "vitest";
import {
  PEN_TOOLS,
  REACTIONS,
  applyRuler,
  countCorners,
  eraseAt,
  isClosed,
  makeNote,
  makeStroke,
  makeWhiteboard,
  notesToTasks,
  pointToSegment,
  reactionCount,
  recognizeShape,
  shapeToPoints,
  simplifyStroke,
  strokeBounds,
  strokeToPath,
  toggleReaction,
  toolSpec,
  whiteboardToSvg,
} from "./features/whiteboard/whiteboardDomain.js";

// Gera os pontos de um retângulo desenhado à mão, com um tremor pequeno.
const retangulo = (x, y, w, h, tremor = 0) => {
  const pontos = [];
  const ruido = (i) => (tremor === 0 ? 0 : ((i % 3) - 1) * tremor);
  for (let i = 0; i <= 10; i += 1) pontos.push({ x: x + (w * i) / 10, y: y + ruido(i) });
  for (let i = 1; i <= 10; i += 1) pontos.push({ x: x + w + ruido(i), y: y + (h * i) / 10 });
  for (let i = 1; i <= 10; i += 1)
    pontos.push({ x: x + w - (w * i) / 10, y: y + h + ruido(i) });
  for (let i = 1; i <= 10; i += 1) pontos.push({ x: x + ruido(i), y: y + h - (h * i) / 10 });
  return pontos;
};

const elipse = (cx, cy, rx, ry, passos = 40) => {
  const pontos = [];
  for (let i = 0; i <= passos; i += 1) {
    const t = (i / passos) * Math.PI * 2;
    pontos.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return pontos;
};

const linha = (x1, y1, x2, y2, passos = 20, tremor = 0) => {
  const pontos = [];
  for (let i = 0; i <= passos; i += 1) {
    const t = i / passos;
    pontos.push({
      x: x1 + (x2 - x1) * t + (tremor ? ((i % 3) - 1) * tremor : 0),
      y: y1 + (y2 - y1) * t + (tremor ? ((i % 2) - 0.5) * tremor : 0),
    });
  }
  return pontos;
};

describe("ferramentas", () => {
  it("marca-texto é largo e translúcido; caneta é fina e opaca", () => {
    expect(toolSpec("marca-texto").opacity).toBeLessThan(1);
    expect(toolSpec("marca-texto").width).toBeGreaterThan(toolSpec("caneta").width);
    expect(toolSpec("caneta").opacity).toBe(1);
  });

  it("ferramenta desconhecida cai na caneta", () => {
    expect(toolSpec("inexistente").id).toBe(PEN_TOOLS[0].id);
  });

  it("o traço nasce com a largura da ferramenta", () => {
    expect(makeStroke({ id: "s1", tool: "marca-texto" }).width).toBe(
      toolSpec("marca-texto").width,
    );
  });
});

describe("strokeBounds e pointToSegment", () => {
  it("envolve os pontos do traço", () => {
    expect(strokeBounds([{ x: 10, y: 20 }, { x: 50, y: 5 }])).toEqual({
      x: 10,
      y: 5,
      w: 40,
      h: 15,
    });
  });

  it("é nulo sem pontos", () => {
    expect(strokeBounds([])).toBeNull();
  });

  it("mede a distância do ponto ao segmento, não à reta infinita", () => {
    // O ponto está além do fim do segmento: a distância é até a ponta.
    expect(pointToSegment({ x: 20, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(10);
    expect(pointToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
  });

  it("segmento degenerado devolve a distância ao ponto", () => {
    expect(pointToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });
});

describe("simplifyStroke", () => {
  it("reduz muito os pontos de uma reta sem mudar as pontas", () => {
    const pontos = linha(0, 0, 100, 0, 50);
    const simples = simplifyStroke(pontos, 2);
    expect(simples.length).toBeLessThan(5);
    expect(simples[0]).toEqual({ x: 0, y: 0 });
    expect(simples[simples.length - 1]).toEqual({ x: 100, y: 0 });
  });

  it("preserva o canto de um L", () => {
    const pontos = [...linha(0, 0, 100, 0, 20), ...linha(100, 0, 100, 100, 20)];
    const simples = simplifyStroke(pontos, 2);
    expect(simples.some((q) => q.x === 100 && q.y === 0)).toBe(true);
  });

  it("não mexe em traço de dois pontos", () => {
    const dois = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(simplifyStroke(dois)).toEqual(dois);
  });
});

describe("isClosed e countCorners", () => {
  it("reconhece traço que volta ao início", () => {
    expect(isClosed(retangulo(0, 0, 100, 80))).toBe(true);
  });

  it("traço aberto não é fechado", () => {
    expect(isClosed(linha(0, 0, 100, 0))).toBe(false);
  });

  it("conta os cantos de um retângulo", () => {
    const cantos = countCorners(retangulo(0, 0, 120, 90));
    expect(cantos).toBeGreaterThanOrEqual(3);
    expect(cantos).toBeLessThanOrEqual(5);
  });

  it("uma reta não tem canto", () => {
    expect(countCorners(linha(0, 0, 100, 0))).toBe(0);
  });
});

describe("recognizeShape", () => {
  it("reconhece uma linha desenhada à mão", () => {
    const forma = recognizeShape(linha(0, 0, 200, 40, 30, 1));
    expect(forma?.kind).toBe("linha");
    // O gerador do teste aplica um tremor de +-1 px nas pontas.
    expect(Math.abs(forma.from.x)).toBeLessThanOrEqual(2);
  });

  it("reconhece um retângulo desenhado à mão", () => {
    expect(recognizeShape(retangulo(10, 10, 140, 90, 2))?.kind).toBe("retangulo");
  });

  it("reconhece uma elipse", () => {
    expect(recognizeShape(elipse(100, 100, 70, 45))?.kind).toBe("elipse");
  });

  it("reconhece um círculo como elipse", () => {
    expect(recognizeShape(elipse(50, 50, 40, 40))?.kind).toBe("elipse");
  });

  it("reconhece um triângulo", () => {
    const tri = [
      ...linha(100, 0, 200, 150, 12),
      ...linha(200, 150, 0, 150, 12),
      ...linha(0, 150, 100, 0, 12),
    ];
    expect(recognizeShape(tri)?.kind).toBe("triangulo");
  });

  it("não adivinha quando o traço não parece nada", () => {
    const rabisco = [
      { x: 0, y: 0 },
      { x: 40, y: 90 },
      { x: 5, y: 30 },
      { x: 80, y: 12 },
      { x: 20, y: 75 },
      { x: 70, y: 60 },
      { x: 3, y: 3 },
    ];
    expect(recognizeShape(rabisco)).toBeNull();
  });

  it("ignora traço minúsculo e traço com poucos pontos", () => {
    expect(recognizeShape([{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 2 }])).toBeNull();
    expect(recognizeShape([{ x: 0, y: 0 }])).toBeNull();
  });
});

describe("shapeToPoints", () => {
  it("retângulo vira cinco pontos fechando no início", () => {
    const pontos = shapeToPoints({ kind: "retangulo", bounds: { x: 0, y: 0, w: 100, h: 50 } });
    expect(pontos).toHaveLength(5);
    expect(pontos[0]).toEqual(pontos[4]);
  });

  it("linha vira dois pontos", () => {
    expect(
      shapeToPoints({ kind: "linha", from: { x: 0, y: 0 }, to: { x: 10, y: 10 } }),
    ).toHaveLength(2);
  });

  it("triângulo vira quatro pontos", () => {
    expect(
      shapeToPoints({ kind: "triangulo", bounds: { x: 0, y: 0, w: 100, h: 100 } }),
    ).toHaveLength(4);
  });

  it("elipse gera pontos que cabem no retângulo original", () => {
    const bounds = { x: 0, y: 0, w: 100, h: 60 };
    const pontos = shapeToPoints({ kind: "elipse", bounds });
    const b2 = strokeBounds(pontos);
    expect(b2.w).toBeCloseTo(100, 0);
    expect(b2.h).toBeCloseTo(60, 0);
  });

  it("forma nula não gera pontos", () => {
    expect(shapeToPoints(null)).toEqual([]);
  });
});

describe("applyRuler", () => {
  it("encaixa um traço quase horizontal na horizontal exata", () => {
    const reta = applyRuler([{ x: 0, y: 0 }, { x: 100, y: 7 }]);
    expect(reta).toHaveLength(2);
    expect(reta[1].y).toBeCloseTo(0, 5);
  });

  it("encaixa um traço quase vertical na vertical exata", () => {
    const reta = applyRuler([{ x: 0, y: 0 }, { x: 6, y: 100 }]);
    expect(reta[1].x).toBeCloseTo(0, 5);
  });

  it("encaixa na diagonal de 45 graus", () => {
    const reta = applyRuler([{ x: 0, y: 0 }, { x: 100, y: 92 }]);
    expect(Math.abs(reta[1].x - reta[1].y)).toBeLessThan(1);
  });

  it("preserva o comprimento do traço", () => {
    const reta = applyRuler([{ x: 0, y: 0 }, { x: 100, y: 7 }]);
    const comprimento = Math.hypot(reta[1].x, reta[1].y);
    expect(comprimento).toBeCloseTo(Math.hypot(100, 7), 5);
  });

  it("traço de um ponto não muda", () => {
    expect(applyRuler([{ x: 3, y: 4 }])).toEqual([{ x: 3, y: 4 }]);
  });
});

describe("eraseAt", () => {
  const tracos = [
    makeStroke({ id: "a", points: linha(0, 0, 100, 0, 10) }),
    makeStroke({ id: "b", points: linha(0, 200, 100, 200, 10) }),
  ];

  it("apaga o traço que passa perto do ponto", () => {
    const restantes = eraseAt(tracos, { x: 50, y: 3 }, 12);
    expect(restantes.map((t) => t.id)).toEqual(["b"]);
  });

  it("não apaga traço distante", () => {
    expect(eraseAt(tracos, { x: 50, y: 100 }, 12)).toHaveLength(2);
  });

  it("apaga traço de um único ponto quando encostado", () => {
    const ponto = [makeStroke({ id: "p", points: [{ x: 10, y: 10 }] })];
    expect(eraseAt(ponto, { x: 12, y: 12 }, 12)).toHaveLength(0);
    expect(eraseAt(ponto, { x: 90, y: 90 }, 12)).toHaveLength(1);
  });

  it("traço sem ponto é mantido", () => {
    expect(eraseAt([makeStroke({ id: "v", points: [] })], { x: 0, y: 0 })).toHaveLength(1);
  });
});

describe("notas e reações", () => {
  it("alterna a reação da mesma pessoa", () => {
    const nota = makeNote({ id: "n1", text: "ideia" });
    const com = toggleReaction(nota, "👍", "u1");
    expect(reactionCount(com, "👍")).toBe(1);
    const sem = toggleReaction(com, "👍", "u1");
    expect(reactionCount(sem, "👍")).toBe(0);
    expect(sem.reactions["👍"]).toBeUndefined();
  });

  it("pessoas diferentes somam", () => {
    let nota = makeNote({ id: "n1" });
    nota = toggleReaction(nota, "❤️", "u1");
    nota = toggleReaction(nota, "❤️", "u2");
    expect(reactionCount(nota, "❤️")).toBe(2);
  });

  it("ignora emoji fora da lista e usuário sem id", () => {
    const nota = makeNote({ id: "n1" });
    expect(toggleReaction(nota, "🎉", "u1")).toBe(nota);
    expect(toggleReaction(nota, "👍", "")).toBe(nota);
    expect(REACTIONS).toContain("⚠️");
  });
});

describe("notesToTasks", () => {
  it("as notas escritas viram tarefas", () => {
    const notas = [
      makeNote({ id: "n1", text: "Ligar para o cliente" }),
      makeNote({ id: "n2", text: "   " }),
    ];
    const tarefas = notesToTasks(notas, { boardName: "Reunião de terça" });
    expect(tarefas).toHaveLength(1);
    expect(tarefas[0].title).toBe("Ligar para o cliente");
    expect(tarefas[0].notes).toContain("Reunião de terça");
  });

  it("usa só a primeira linha como título", () => {
    const tarefas = notesToTasks([makeNote({ id: "n", text: "Primeira\nsegunda" })]);
    expect(tarefas[0].title).toBe("Primeira");
  });
});

describe("strokeToPath e whiteboardToSvg", () => {
  it("o caminho começa em M e só tem M e L", () => {
    const path = strokeToPath(linha(0, 0, 50, 50, 4));
    expect(path.startsWith("M ")).toBe(true);
    expect(path).not.toMatch(/[CQZA]/);
  });

  it("gera SVG com os traços e as notas", () => {
    const svg = whiteboardToSvg(
      [makeStroke({ id: "a", points: linha(0, 0, 100, 0, 5) })],
      [makeNote({ id: "n", x: 10, y: 40, text: "anotação" })],
    );
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<path");
    expect(svg).toContain("anotação");
  });

  it("o marca-texto sai translúcido no SVG", () => {
    const svg = whiteboardToSvg(
      [makeStroke({ id: "a", tool: "marca-texto", points: linha(0, 0, 50, 0, 3) })],
      [],
    );
    expect(svg).toContain('stroke-opacity="0.35"');
  });

  it("não deixa caractere que quebraria o XML", () => {
    const svg = whiteboardToSvg([], [makeNote({ id: "n", text: "a < b & c" })]);
    expect(svg).not.toContain("a < b");
  });

  it("funciona com quadro vazio", () => {
    const svg = whiteboardToSvg([], []);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
});

describe("makeWhiteboard", () => {
  it("nasce vazio e nomeado", () => {
    const q = makeWhiteboard("w1", { businessId: "b" });
    expect(q.strokes).toEqual([]);
    expect(q.notes).toEqual([]);
    expect(q.name).toBe("Quadro rápido");
  });
});
