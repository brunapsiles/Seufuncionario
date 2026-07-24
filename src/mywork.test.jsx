import { describe, expect, it } from "vitest";
import { computeMyWork } from "./App";

const business = { id: "b1" };
const mk = (over) => ({
  id: Math.random().toString(36).slice(2),
  businessId: "b1",
  status: "A fazer",
  ...over,
});

describe("computeMyWork", () => {
  const db = {
    tasks: [
      mk({ assigneeId: "u1", status: "Em andamento" }),
      mk({ assigneeId: "u1", status: "A fazer", due: "2000-01-01" }),
      mk({ assignees: [{ userId: "u1" }], missionStatus: "enviada_para_revisao" }),
      mk({ assigneeId: "u1", missionStatus: "correcao_solicitada" }),
      mk({ assigneeId: "u1", status: "Concluído" }),
      mk({ assigneeId: "u2" }), // outra pessoa
    ],
    developmentPlans: [],
  };

  it("conta só as tarefas atribuídas à pessoa", () => {
    const w = computeMyWork(db, "u1", business, "2026-07-24");
    expect(w.all).toHaveLength(5);
    expect(w.done).toBe(1);
    // ativas = não concluídas
    expect(w.active).toHaveLength(4);
  });

  it("computa revisão, correções e atrasadas", () => {
    const w = computeMyWork(db, "u1", business, "2026-07-24");
    expect(w.inReview).toBe(1);
    expect(w.corrections).toBe(1);
    expect(w.overdue).toBe(1); // due 2000-01-01 e não concluída
  });

  it("respeita o filtro de negócio", () => {
    const other = { tasks: [mk({ assigneeId: "u1", businessId: "outro" })] };
    expect(computeMyWork(other, "u1", business).all).toHaveLength(0);
  });

  it("ordena as ativas por prazo mais próximo", () => {
    const w = computeMyWork(db, "u1", business, "2026-07-24");
    expect(w.active[0].due).toBe("2000-01-01");
  });
});
