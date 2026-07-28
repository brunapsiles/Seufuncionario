import { describe, expect, it } from "vitest";
import { evalFormula } from "./domain.js";

describe("evalFormula", () => {
  it("faz aritmética básica com precedência e parênteses", () => {
    expect(evalFormula("2 + 3 * 4", {})).toBe(14);
    expect(evalFormula("(2 + 3) * 4", {})).toBe(20);
    expect(evalFormula("10 / 4", {})).toBe(2.5);
  });
  it("resolve nomes de campos pelos valores", () => {
    expect(evalFormula("Preço * Quantidade", { Preço: 10, Quantidade: 3 })).toBe(30);
    expect(evalFormula("Total - Desconto", { Total: 100, Desconto: 15 })).toBe(85);
  });
  it("nomes com espaço são resolvidos", () => {
    expect(evalFormula("preco unitario * 2", { "preco unitario": 7 })).toBe(14);
  });
  it("campo desconhecido vira 0 e divisão por zero é 0", () => {
    expect(evalFormula("a + b", { a: 5 })).toBe(5);
    expect(evalFormula("x / 0", { x: 5 })).toBe(0);
  });
  it("arredonda a 2 casas e trata negativos", () => {
    expect(evalFormula("1 / 3", {})).toBe(0.33);
    expect(evalFormula("-preco + 10", { preco: 4 })).toBe(6);
  });
  it("expressão vazia retorna string vazia", () => {
    expect(evalFormula("", {})).toBe("");
    expect(evalFormula("   ", {})).toBe("");
  });
});
