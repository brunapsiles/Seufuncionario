import { describe, expect, it } from "vitest";
import {
  appendProgressPoint,
  cycleElapsed,
  cycleRange,
  goalStatus,
  goalsSummary,
  keyResultLabel,
  keyResultProgress,
  makeObjective,
  objectiveProgress,
  resolveAutoProgress,
} from "./features/goals/goalsDomain.js";

describe("cycleRange", () => {
  it("delimita o mês", () => {
    expect(cycleRange("mensal", "2026-02-14")).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
      label: "fevereiro de 2026",
    });
  });

  it("delimita o trimestre civil correto", () => {
    expect(cycleRange("trimestral", "2026-08-03")).toEqual({
      start: "2026-07-01",
      end: "2026-09-30",
      label: "3º trimestre de 2026",
    });
  });

  it("delimita o ano", () => {
    expect(cycleRange("anual", "2026-05-20")).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
      label: "2026",
    });
  });

  it("respeita ano bissexto em fevereiro", () => {
    expect(cycleRange("mensal", "2028-02-10").end).toBe("2028-02-29");
  });
});

describe("keyResultProgress", () => {
  it("calcula progresso numérico entre início e alvo", () => {
    expect(
      keyResultProgress({ type: "numero", start: 0, target: 50, current: 20 }),
    ).toBeCloseTo(0.4);
  });

  it("aceita meta decrescente (reduzir de 100 para 60)", () => {
    expect(
      keyResultProgress({ type: "numero", start: 100, target: 60, current: 80 }),
    ).toBeCloseTo(0.5);
  });

  it("nunca passa de 100% nem fica negativo", () => {
    expect(
      keyResultProgress({ type: "numero", start: 0, target: 10, current: 30 }),
    ).toBe(1);
    expect(
      keyResultProgress({ type: "numero", start: 0, target: 10, current: -5 }),
    ).toBe(0);
  });

  it("trata percentual, marco e tarefas", () => {
    expect(keyResultProgress({ type: "percentual", current: 35 })).toBeCloseTo(0.35);
    expect(keyResultProgress({ type: "marco", done: true })).toBe(1);
    expect(keyResultProgress({ type: "marco", done: false })).toBe(0);
    expect(
      keyResultProgress({ type: "tarefas", doneCount: 3, totalCount: 4 }),
    ).toBeCloseTo(0.75);
    expect(keyResultProgress({ type: "tarefas", doneCount: 0, totalCount: 0 })).toBe(0);
  });

  it("aceita número escrito com vírgula", () => {
    expect(
      keyResultProgress({ type: "numero", start: 0, target: "10", current: "2,5" }),
    ).toBeCloseTo(0.25);
  });
});

describe("objectiveProgress", () => {
  it("é zero sem resultados-chave", () => {
    expect(objectiveProgress({ keyResults: [] })).toBe(0);
  });

  it("faz a média simples dos resultados-chave", () => {
    const obj = {
      keyResults: [
        { type: "percentual", current: 100 },
        { type: "percentual", current: 0 },
      ],
    };
    expect(objectiveProgress(obj)).toBeCloseTo(0.5);
  });

  it("respeita o peso de cada resultado-chave", () => {
    const obj = {
      keyResults: [
        { type: "percentual", current: 100, weight: 3 },
        { type: "percentual", current: 0, weight: 1 },
      ],
    };
    expect(objectiveProgress(obj)).toBeCloseTo(0.75);
  });
});

describe("cycleElapsed e goalStatus", () => {
  const range = { start: "2026-01-01", end: "2026-12-31" };

  it("mede quanto do ciclo já passou", () => {
    expect(cycleElapsed(range, "2026-01-01")).toBeCloseTo(0, 1);
    expect(cycleElapsed(range, "2026-07-02")).toBeCloseTo(0.5, 1);
    expect(cycleElapsed(range, "2026-12-31")).toBeCloseTo(1, 1);
  });

  it("marca como concluída quando o progresso chega a 100%", () => {
    const obj = {
      cycle: "anual",
      reference: "2026-03-01",
      keyResults: [{ type: "percentual", current: 100 }],
    };
    expect(goalStatus(obj, "2026-03-01").state).toBe("concluida");
  });

  it("fica no ritmo quando o progresso acompanha o tempo", () => {
    const obj = {
      cycle: "anual",
      reference: "2026-01-01",
      keyResults: [{ type: "percentual", current: 50 }],
    };
    expect(goalStatus(obj, "2026-07-02").state).toBe("no-prazo");
  });

  it("acende atenção e depois risco conforme atrasa", () => {
    const atencao = {
      cycle: "anual",
      reference: "2026-01-01",
      keyResults: [{ type: "percentual", current: 35 }],
    };
    expect(goalStatus(atencao, "2026-07-02").state).toBe("atencao");
    const risco = {
      cycle: "anual",
      reference: "2026-01-01",
      keyResults: [{ type: "percentual", current: 5 }],
    };
    expect(goalStatus(risco, "2026-07-02").state).toBe("risco");
  });

  it("marca ciclo encerrado depois do fim do período", () => {
    const obj = {
      cycle: "mensal",
      reference: "2026-01-10",
      keyResults: [{ type: "percentual", current: 40 }],
    };
    expect(goalStatus(obj, "2026-03-01").state).toBe("encerrada");
  });
});

describe("resolveAutoProgress", () => {
  const tasks = [
    { project: "Lançamento", status: "concluida" },
    { project: "Lançamento", status: "fazendo" },
    { project: "Lançamento", done: true },
    { project: "Outro", status: "concluida" },
  ];

  it("conta apenas as tarefas do projeto ligado", () => {
    const obj = {
      keyResults: [
        { id: "k1", type: "tarefas", linkedProject: "Lançamento" },
        { id: "k2", type: "percentual", current: 50 },
      ],
    };
    const resolvido = resolveAutoProgress(obj, { tasks });
    expect(resolvido.keyResults[0].totalCount).toBe(3);
    expect(resolvido.keyResults[0].doneCount).toBe(2);
    expect(resolvido.keyResults[1]).toEqual(obj.keyResults[1]);
  });

  it("zera quando não há projeto ligado", () => {
    const obj = { keyResults: [{ type: "tarefas", linkedProject: "" }] };
    expect(resolveAutoProgress(obj, { tasks }).keyResults[0].totalCount).toBe(0);
  });
});

describe("appendProgressPoint", () => {
  const obj = { keyResults: [{ type: "percentual", current: 40 }], history: [] };

  it("registra o primeiro ponto do histórico", () => {
    const next = appendProgressPoint(obj, "2026-07-29T10:00:00.000Z");
    expect(next.history).toEqual([
      { at: "2026-07-29T10:00:00.000Z", progress: 0.4 },
    ]);
  });

  it("não duplica quando o progresso não mudou no mesmo dia", () => {
    const um = appendProgressPoint(obj, "2026-07-29T10:00:00.000Z");
    const dois = appendProgressPoint(um, "2026-07-29T18:00:00.000Z");
    expect(dois.history).toHaveLength(1);
  });

  it("substitui o ponto do dia quando o progresso muda", () => {
    const um = appendProgressPoint(obj, "2026-07-29T10:00:00.000Z");
    const mudou = {
      ...um,
      keyResults: [{ type: "percentual", current: 70 }],
    };
    const dois = appendProgressPoint(mudou, "2026-07-29T18:00:00.000Z");
    expect(dois.history).toHaveLength(1);
    expect(dois.history[0].progress).toBeCloseTo(0.7);
  });

  it("guarda dias diferentes e respeita o limite", () => {
    let atual = { ...obj };
    for (let dia = 1; dia <= 5; dia += 1) {
      atual = {
        ...atual,
        keyResults: [{ type: "percentual", current: dia * 10 }],
      };
      atual = appendProgressPoint(atual, `2026-07-0${dia}T10:00:00.000Z`, 3);
    }
    expect(atual.history).toHaveLength(3);
    expect(atual.history[2].progress).toBeCloseTo(0.5);
  });
});

describe("goalsSummary", () => {
  it("conta metas por situação e calcula o progresso médio", () => {
    const objetivos = [
      {
        cycle: "anual",
        reference: "2026-01-01",
        keyResults: [{ type: "percentual", current: 100 }],
      },
      {
        cycle: "anual",
        reference: "2026-01-01",
        keyResults: [{ type: "percentual", current: 50 }],
      },
      {
        cycle: "anual",
        reference: "2026-01-01",
        keyResults: [{ type: "percentual", current: 0 }],
      },
    ];
    const resumo = goalsSummary(objetivos, "2026-07-02");
    expect(resumo.total).toBe(3);
    expect(resumo.concluidas).toBe(1);
    expect(resumo.noPrazo).toBe(1);
    expect(resumo.risco).toBe(1);
    expect(resumo.progressoMedio).toBeCloseTo(0.5);
  });

  it("lida com lista vazia", () => {
    expect(goalsSummary([], "2026-07-02")).toMatchObject({
      total: 0,
      progressoMedio: 0,
    });
  });
});

describe("keyResultLabel e makeObjective", () => {
  it("descreve cada tipo de resultado-chave", () => {
    expect(keyResultLabel({ type: "marco", done: true })).toBe("Feito");
    expect(keyResultLabel({ type: "tarefas", doneCount: 3, totalCount: 8 })).toBe(
      "3 de 8 tarefas",
    );
    expect(keyResultLabel({ type: "percentual", current: 62 })).toBe("62%");
    expect(
      keyResultLabel({ type: "numero", current: 12, target: 30, unit: "clientes" }),
    ).toBe("12 clientes de 30 clientes");
  });

  it("cria objetivo com ciclo trimestral por padrão", () => {
    const obj = makeObjective("obj-1", { businessId: "b1", ownerId: "u1" });
    expect(obj.cycle).toBe("trimestral");
    expect(obj.keyResults).toEqual([]);
    expect(obj.businessId).toBe("b1");
  });
});
