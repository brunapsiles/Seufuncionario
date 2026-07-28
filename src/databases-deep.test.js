import { describe, expect, it } from "vitest";
import { recordLabel, groupRowsByDate, monthMatrix } from "./domain.js";

describe("recordLabel", () => {
  const base = {
    fields: [{ id: "nome", type: "text" }, { id: "tel", type: "text" }],
    rows: [{ id: "r1", cells: { nome: "Ana", tel: "999" } }],
  };
  it("usa o valor do primeiro campo como rótulo do registro", () => {
    expect(recordLabel(base, "r1")).toBe("Ana");
  });
  it("retorna vazio para id inexistente ou base ausente", () => {
    expect(recordLabel(base, "zzz")).toBe("");
    expect(recordLabel(null, "r1")).toBe("");
  });
});

describe("groupRowsByDate", () => {
  const rows = [
    { id: "a", cells: { d: "2026-07-10" } },
    { id: "b", cells: { d: "2026-07-10T12:00:00" } },
    { id: "c", cells: { d: "" } },
    { id: "e", cells: { d: "sem data" } },
  ];
  it("agrupa por dia (AAAA-MM-DD) e ignora não-datas", () => {
    const g = groupRowsByDate(rows, "d");
    expect(g["2026-07-10"].map((r) => r.id)).toEqual(["a", "b"]);
    expect(Object.keys(g)).toHaveLength(1);
  });
});

describe("monthMatrix", () => {
  it("gera 6 semanas de 7 dias começando no domingo", () => {
    const weeks = monthMatrix("2026-07");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toHaveLength(7);
    // primeira célula é um domingo (getUTCDay 0)
    expect(new Date(`${weeks[0][0].date}T12:00:00Z`).getUTCDay()).toBe(0);
    // 2026-07-01 (quarta) deve aparecer e estar marcado como do mês
    const flat = weeks.flat();
    const first = flat.find((c) => c.date === "2026-07-01");
    expect(first.inMonth).toBe(true);
    // um dia de agosto aparece como fora do mês
    expect(flat.some((c) => c.date.startsWith("2026-08") && !c.inMonth)).toBe(true);
  });
});
