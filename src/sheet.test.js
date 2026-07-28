import { describe, expect, it } from "vitest";
import { parseSheet, buildCsv } from "./domain.js";

describe("parseSheet", () => {
  it("lê um objeto JSON com colunas e linhas", () => {
    const raw = JSON.stringify({
      title: "Estoque",
      columns: ["Produto", "Qtd", "Preço"],
      rows: [
        ["Camiseta", "10", "R$ 39,90"],
        ["Calça", "5", "R$ 89,90"],
      ],
    });
    const sheet = parseSheet(raw);
    expect(sheet.title).toBe("Estoque");
    expect(sheet.columns).toEqual(["Produto", "Qtd", "Preço"]);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0]).toEqual(["Camiseta", "10", "R$ 39,90"]);
  });

  it("ajusta linhas ao número de colunas (preenche e corta)", () => {
    const raw = JSON.stringify({
      columns: ["A", "B", "C"],
      rows: [["1"], ["1", "2", "3", "4"]],
    });
    const sheet = parseSheet(raw);
    expect(sheet.rows[0]).toEqual(["1", "", ""]);
    expect(sheet.rows[1]).toEqual(["1", "2", "3"]);
  });

  it("aceita linhas como objetos mapeados pelas colunas", () => {
    const raw = JSON.stringify({
      colunas: ["Nome", "Cidade"],
      linhas: [{ Nome: "Ana", Cidade: "Recife" }],
    });
    const sheet = parseSheet(raw);
    expect(sheet.columns).toEqual(["Nome", "Cidade"]);
    expect(sheet.rows[0]).toEqual(["Ana", "Recife"]);
  });

  it("tolera cercas de código e texto ao redor", () => {
    const raw = 'Segue:\n```json\n{"columns":["X"],"rows":[["1"]]}\n```';
    expect(parseSheet(raw).columns).toEqual(["X"]);
  });

  it("retorna vazio sem colunas ou sem JSON", () => {
    expect(parseSheet('{"rows":[]}').columns).toEqual([]);
    expect(parseSheet("sem json").columns).toEqual([]);
    expect(parseSheet("")).toEqual({ title: "", columns: [], rows: [] });
  });
});

describe("buildCsv", () => {
  it("gera CSV com separador ; e aspas escapadas", () => {
    const csv = buildCsv(
      ["Nome", "Obs"],
      [["Ana", 'diz "oi"'], ["João; Silva", "ok"]],
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"Nome";"Obs"');
    expect(lines[1]).toBe('"Ana";"diz ""oi"""');
    expect(lines[2]).toBe('"João; Silva";"ok"');
  });

  it("preenche células ausentes com vazio", () => {
    const csv = buildCsv(["A", "B"], [["1"]]);
    expect(csv.split("\r\n")[1]).toBe('"1";""');
  });
});
