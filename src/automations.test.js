import { describe, expect, it } from "vitest";
import { automationDue, runAutomations } from "./domain.js";

// 2026-07-27 é uma segunda-feira; 2026-07-28 terça.
const MON = "2026-07-27";
const TUE = "2026-07-28";

const rule = (over) => ({
  id: "r1",
  name: "Regra",
  enabled: true,
  frequency: "weekly",
  day: 1, // segunda
  actionType: "task",
  actionText: "Planejar",
  history: {},
  ...over,
});

describe("automationDue", () => {
  it("semanal dispara só no dia da semana escolhido", () => {
    expect(automationDue(rule(), MON)).toBe(MON);
    expect(automationDue(rule(), TUE)).toBeNull();
  });
  it("mensal dispara a partir do dia escolhido, dedup por mês", () => {
    expect(automationDue(rule({ frequency: "monthly", day: 5 }), "2026-07-04")).toBeNull();
    expect(automationDue(rule({ frequency: "monthly", day: 5 }), "2026-07-05")).toBe("2026-07");
    expect(automationDue(rule({ frequency: "monthly", day: 5 }), "2026-07-20")).toBe("2026-07");
  });
  it("não dispara se já rodou no período (idempotente)", () => {
    expect(automationDue(rule({ history: { [MON]: "x" } }), MON)).toBeNull();
  });
  it("regra pausada não dispara", () => {
    expect(automationDue(rule({ enabled: false }), MON)).toBeNull();
  });
});

describe("runAutomations", () => {
  it("gera intents das regras vencidas e marca o período", () => {
    const { rules, intents } = runAutomations(
      [rule({ id: "a" }), rule({ id: "b", day: 2 })],
      MON,
    );
    // só a regra de segunda dispara
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({ ruleId: "a", actionType: "task", text: "Planejar" });
    // a regra 'a' fica com o período marcado; 'b' inalterada
    expect(rules.find((r) => r.id === "a").history[MON]).toBeTruthy();
    expect(rules.find((r) => r.id === "b").history[MON]).toBeUndefined();
  });
  it("é idempotente: rodar de novo no mesmo dia não gera intents", () => {
    const first = runAutomations([rule()], MON);
    const second = runAutomations(first.rules, MON);
    expect(second.intents).toHaveLength(0);
  });
});
