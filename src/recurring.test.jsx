import { describe, expect, it } from "vitest";
import {
  recurringStatus,
  buildRecurringTransaction,
  buildRecurringPostings,
  buildRecurringReminder,
} from "./App";

const YMD = "2026-07-20";
const c = (over) => ({
  id: Math.random().toString(36).slice(2),
  clientName: "Cliente",
  amount: 600,
  dueDay: 5,
  active: true,
  autoPost: false,
  history: {},
  ...over,
});

describe("recurringStatus", () => {
  it("classifica vencido/agendado/lançado/inativo", () => {
    expect(recurringStatus(c({ dueDay: 5 }), YMD).status).toBe("a_lancar"); // dia 20 >= 5
    expect(recurringStatus(c({ dueDay: 25 }), YMD).status).toBe("agendado"); // dia 20 < 25
    expect(
      recurringStatus(c({ history: { "2026-07": { postedAt: "x" } } }), YMD).status,
    ).toBe("lancado");
    expect(recurringStatus(c({ active: false }), YMD).status).toBe("off");
  });
});

describe("buildRecurringTransaction", () => {
  it("gera uma receita do contrato", () => {
    const t = buildRecurringTransaction(
      c({ id: "r1", clientName: "Ana", amount: 600 }),
      { userId: "u1", businessId: "b1" },
      YMD,
    );
    expect(t).toMatchObject({
      type: "Receita",
      value: 600,
      category: "Contratos",
      businessId: "b1",
      ownerId: "u1",
      sourceRecurringId: "r1",
      date: YMD,
    });
    expect(t.description).toContain("Ana");
  });
  it("não gera com valor zero", () => {
    expect(buildRecurringTransaction(c({ amount: 0 }), {}, YMD)).toBeNull();
  });
});

describe("buildRecurringPostings (autoPost)", () => {
  it("lança só os autoPost vencidos e não lançados", () => {
    const list = [
      c({ id: "auto-due", autoPost: true, dueDay: 5 }),
      c({ id: "auto-posted", autoPost: true, dueDay: 5, history: { "2026-07": { postedAt: "x" } } }),
      c({ id: "manual-due", autoPost: false, dueDay: 5 }),
      c({ id: "auto-future", autoPost: true, dueDay: 25 }),
    ];
    const postings = buildRecurringPostings(list, { userId: "u1" }, YMD);
    expect(postings.map((p) => p.contractId)).toEqual(["auto-due"]);
  });
});

describe("buildRecurringReminder (manuais)", () => {
  it("lembra dos contratos manuais vencidos, uma vez por mês", () => {
    const list = [
      c({ id: "m1", autoPost: false, dueDay: 5, clientName: "João" }),
      c({ id: "a1", autoPost: true, dueDay: 5 }), // autoPost não gera lembrete
      c({ id: "f1", autoPost: false, dueDay: 25 }), // ainda não venceu
    ];
    const notifs = buildRecurringReminder(list, [], "u1", YMD);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].id).toBe("recurring-2026-07");
    // idempotente: se já existe a notificação do mês, não duplica
    expect(buildRecurringReminder(list, notifs, "u1", YMD)).toBeNull();
  });
  it("não lembra quando nada manual venceu", () => {
    expect(buildRecurringReminder([c({ autoPost: true })], [], "u1", YMD)).toBeNull();
  });
});
