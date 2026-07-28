import { describe, expect, it } from "vitest";
import { parseAnalysis } from "./domain.js";

describe("parseAnalysis", () => {
  it("estrutura resumo, pontos, riscos, ações e resposta", () => {
    const raw = JSON.stringify({
      summary: "Contrato de prestação de serviço por 12 meses.",
      keyPoints: ["Valor mensal de R$ 500", "Reajuste anual"],
      risks: ["Multa de 3 mensalidades por rescisão"],
      actions: ["Confirmar a data de início"],
      answer: "O prazo é de 12 meses.",
    });
    const r = parseAnalysis(raw);
    expect(r.summary).toContain("12 meses");
    expect(r.keyPoints).toEqual(["Valor mensal de R$ 500", "Reajuste anual"]);
    expect(r.risks).toHaveLength(1);
    expect(r.actions).toEqual(["Confirmar a data de início"]);
    expect(r.answer).toBe("O prazo é de 12 meses.");
  });

  it("aceita chaves em português e limpa marcadores de lista", () => {
    const raw =
      '```json\n{"resumo":"ok","pontos":["- um","2) dois"],"riscos":[],"acoes":["• agir"],"resposta":""}\n```';
    const r = parseAnalysis(raw);
    expect(r.summary).toBe("ok");
    expect(r.keyPoints).toEqual(["um", "dois"]);
    expect(r.actions).toEqual(["agir"]);
    expect(r.answer).toBe("");
  });

  it("tolera texto ao redor do JSON", () => {
    const r = parseAnalysis('Claro:\n{"summary":"resumo","keyPoints":["a"]}\nFim.');
    expect(r.summary).toBe("resumo");
    expect(r.keyPoints).toEqual(["a"]);
  });

  it("retorna null quando não há conteúdo útil ou JSON", () => {
    expect(parseAnalysis("")).toBeNull();
    expect(parseAnalysis("sem json aqui")).toBeNull();
    expect(
      parseAnalysis('{"summary":"","keyPoints":[],"risks":[],"actions":[],"answer":""}'),
    ).toBeNull();
  });
});
