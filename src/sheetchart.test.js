import { describe, expect, it } from "vitest";
import { parseBrNumber, sheetChartSeries } from "./domain.js";

describe("parseBrNumber", () => {
  it("lê números no formato brasileiro", () => {
    expect(parseBrNumber("R$ 1.200,50")).toBe(1200.5);
    expect(parseBrNumber("80")).toBe(80);
    expect(parseBrNumber("12,5")).toBe(12.5);
    expect(parseBrNumber("2.000")).toBe(2000);
  });
  it("texto sem número vira 0", () => {
    expect(parseBrNumber("abc")).toBe(0);
    expect(parseBrNumber("")).toBe(0);
    expect(parseBrNumber(null)).toBe(0);
  });
});

describe("sheetChartSeries", () => {
  const columns = ["Produto", "Venda"];
  const rows = [
    ["Bolo", "R$ 120,00"],
    ["Torta", "80"],
    ["", ""],
    ["Doce", "abc"],
  ];
  it("monta a série {label, value} e ignora linhas vazias", () => {
    const s = sheetChartSeries(columns, rows, 0, 1);
    expect(s).toEqual([
      { label: "Bolo", value: 120 },
      { label: "Torta", value: 80 },
      { label: "Doce", value: 0 },
    ]);
  });
  it("rótulo vazio recebe um nome padrão", () => {
    const s = sheetChartSeries(columns, [["", "10"]], 0, 1);
    expect(s[0].label).toBe("Linha 1");
    expect(s[0].value).toBe(10);
  });
});
