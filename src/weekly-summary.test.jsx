import { describe, expect, it } from "vitest";
import {
  weekRange,
  previousWeekRange,
  computeWeeklySummary,
  dayRangeLabel,
} from "./App";

describe("weekRange / previousWeekRange", () => {
  it("segunda a domingo da semana que contém a data", () => {
    // 2026-07-15 é uma quarta-feira.
    expect(weekRange("2026-07-15")).toEqual({
      start: "2026-07-13",
      end: "2026-07-19",
    });
  });

  it("funciona quando a data já é segunda ou domingo", () => {
    expect(weekRange("2026-07-13")).toEqual({
      start: "2026-07-13",
      end: "2026-07-19",
    });
    expect(weekRange("2026-07-19")).toEqual({
      start: "2026-07-13",
      end: "2026-07-19",
    });
  });

  it("previousWeekRange retorna a semana imediatamente anterior", () => {
    expect(previousWeekRange("2026-07-20")).toEqual({
      start: "2026-07-13",
      end: "2026-07-19",
    });
  });
});

describe("computeWeeklySummary", () => {
  const data = {
    orders: [
      { id: "o1", status: "Entregue", total: 120, createdAt: "2026-07-15T10:00:00Z" },
      { id: "o2", status: "Cancelado", total: 999, createdAt: "2026-07-15T10:00:00Z" },
      { id: "o3", status: "Novo", total: 80, createdAt: "2026-07-01T10:00:00Z" },
    ],
    transactions: [
      { id: "t1", type: "Receita", value: 200, date: "2026-07-16" },
      { id: "t2", type: "Despesa", value: 50, date: "2026-07-16" },
      { id: "t3", type: "Receita", value: 500, date: "2026-06-30" },
    ],
    tasks: [
      { id: "k1", status: "Concluído", updatedAt: "2026-07-17T09:00:00Z", reward: 30 },
      { id: "k2", status: "A fazer", updatedAt: "2026-07-17T09:00:00Z", reward: 500 },
      { id: "k3", status: "Concluído", updatedAt: "2026-07-01T09:00:00Z", reward: 900 },
    ],
    leads: [
      { id: "l1", createdAt: "2026-07-14T09:00:00Z" },
      { id: "l2", createdAt: "2026-05-01T09:00:00Z" },
    ],
  };

  it("conta só o que está dentro da semana e ignora pedidos cancelados", () => {
    const s = computeWeeklySummary(data, "2026-07-13", "2026-07-19");
    expect(s.sales).toBe(1);
    expect(s.salesRevenue).toBe(120);
    expect(s.cashIn).toBe(200);
    expect(s.cashNet).toBe(150);
    expect(s.tasksDone).toBe(1);
    // Só a recompensa da tarefa concluída DENTRO da semana conta (nem a
    // pendente, nem a concluída fora do intervalo).
    expect(s.tasksReward).toBe(30);
    expect(s.newLeads).toBe(1);
    expect(s.hasActivity).toBe(true);
  });

  it("hasActivity é falso numa semana sem nada", () => {
    const s = computeWeeklySummary(data, "2026-08-10", "2026-08-16");
    expect(s.hasActivity).toBe(false);
    expect(s.sales).toBe(0);
    expect(s.cashIn).toBe(0);
    expect(s.tasksReward).toBe(0);
  });
});

describe("dayRangeLabel", () => {
  it("formata o intervalo em dd/mm", () => {
    expect(dayRangeLabel("2026-07-13", "2026-07-19")).toBe("13/07 a 19/07");
  });
});
