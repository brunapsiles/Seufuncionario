import { describe, expect, it } from "vitest";
import {
  coerceCellValue,
  formatCellValue,
  groupRowsByField,
  kanbanColumns,
} from "./domain.js";

describe("coerceCellValue", () => {
  it("converte número (aceita vírgula) e mantém vazio", () => {
    expect(coerceCellValue("number", "12,50")).toBe(12.5);
    expect(coerceCellValue("number", "1.000")).toBe(1000);
    expect(coerceCellValue("number", "")).toBe("");
  });
  it("converte checkbox para booleano", () => {
    expect(coerceCellValue("checkbox", true)).toBe(true);
    expect(coerceCellValue("checkbox", "on")).toBe(true);
    expect(coerceCellValue("checkbox", false)).toBe(false);
  });
  it("mantém texto como string", () => {
    expect(coerceCellValue("text", "Ana")).toBe("Ana");
    expect(coerceCellValue("text", null)).toBe("");
  });
});

describe("formatCellValue", () => {
  it("mostra Sim/Não e número com vírgula", () => {
    expect(formatCellValue("checkbox", true)).toBe("Sim");
    expect(formatCellValue("checkbox", false)).toBe("Não");
    expect(formatCellValue("number", 12.5)).toBe("12,5");
    expect(formatCellValue("text", "")).toBe("");
  });
});

describe("groupRowsByField / kanbanColumns", () => {
  const base = {
    fields: [
      { id: "nome", name: "Nome", type: "text" },
      { id: "st", name: "Status", type: "select", options: ["Novo", "Ativo"] },
    ],
    rows: [
      { id: "r1", cells: { nome: "A", st: "Novo" } },
      { id: "r2", cells: { nome: "B", st: "Ativo" } },
      { id: "r3", cells: { nome: "C", st: "" } },
    ],
  };

  it("agrupa linhas por campo, vazios em —", () => {
    const g = groupRowsByField(base.rows, "st");
    expect(g["Novo"]).toHaveLength(1);
    expect(g["Ativo"]).toHaveLength(1);
    expect(g["—"]).toHaveLength(1);
  });

  it("gera colunas do kanban na ordem das opções + coluna sem valor", () => {
    const cols = kanbanColumns(base, "st");
    expect(cols.map((c) => c.key)).toEqual(["Novo", "Ativo", "—"]);
    expect(cols[0].rows[0].id).toBe("r1");
  });

  it("colunas vazias aparecem mesmo sem linhas", () => {
    const cols = kanbanColumns(
      { fields: base.fields, rows: [] },
      "st",
    );
    expect(cols.map((c) => c.key)).toEqual(["Novo", "Ativo"]);
    expect(cols.every((c) => c.rows.length === 0)).toBe(true);
  });
});
