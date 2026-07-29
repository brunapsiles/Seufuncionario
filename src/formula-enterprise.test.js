import { describe, expect, it } from "vitest";
import {
  evalFormula,
  evaluateFormula,
  validateFormula,
} from "./features/databases/formulas.js";

describe("fórmulas enterprise", () => {
  it("suporta funções, comparações e condição", () => {
    const values = { Receita: 150, Meta: 100, Custos: 40 };
    expect(evalFormula("SOMA(Receita; -Custos)", values)).toBe(110);
    expect(evalFormula("SE(Receita >= Meta; Receita - Custos; 0)", values)).toBe(110);
    expect(evalFormula("MEDIA(Receita; Meta; Custos)", values)).toBe(96.67);
    expect(evalFormula("ARRED(10 / 3; 1)", values)).toBe(3.3);
  });

  it("retorna diagnóstico e referências sem executar código", () => {
    const result = evaluateFormula("MAX(Preço; Custo) * Quantidade", {
      Preço: 12,
      Custo: 8,
      Quantidade: 3,
    });
    expect(result).toMatchObject({ value: 36, error: null });
    expect(result.references).toEqual(["Preço", "Custo", "Quantidade"]);
  });

  it("informa campo e função inválidos", () => {
    expect(validateFormula("Campo inexistente + 1", ["Total"]).error).toMatch(
      /não encontrado/,
    );
    expect(validateFormula("EXEC(1)", []).error).toMatch(/não reconhecida/);
  });

  it("mantém divisão por zero compatível, mas gera aviso", () => {
    const result = evaluateFormula("Total / 0", { Total: 50 });
    expect(result.value).toBe(0);
    expect(result.warnings).toHaveLength(1);
  });
});
