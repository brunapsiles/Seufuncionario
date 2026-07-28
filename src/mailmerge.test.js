import { describe, expect, it } from "vitest";
import { extractMergeFields, applyMergeFields } from "./domain.js";

describe("extractMergeFields", () => {
  it("extrai campos {{...}} únicos na ordem de aparição", () => {
    expect(
      extractMergeFields("Olá {{nome}}, seu pedido {{pedido}} para {{nome}}."),
    ).toEqual(["nome", "pedido"]);
  });
  it("tolera espaços dentro das chaves e texto sem campos", () => {
    expect(extractMergeFields("{{ nome }} e {{  cidade  }}")).toEqual([
      "nome",
      "cidade",
    ]);
    expect(extractMergeFields("sem campos")).toEqual([]);
    expect(extractMergeFields("")).toEqual([]);
  });
});

describe("applyMergeFields", () => {
  it("substitui os campos pelos valores", () => {
    expect(
      applyMergeFields("Olá {{nome}}, de {{cidade}}", {
        nome: "Ana",
        cidade: "Recife",
      }),
    ).toBe("Olá Ana, de Recife");
  });
  it("campo sem valor vira vazio", () => {
    expect(applyMergeFields("Oi {{nome}}{{sobrenome}}", { nome: "Ana" })).toBe(
      "Oi Ana",
    );
  });
  it("mantém o texto quando não há campos", () => {
    expect(applyMergeFields("texto fixo", { x: 1 })).toBe("texto fixo");
  });
});
