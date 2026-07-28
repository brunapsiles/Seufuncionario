import { describe, expect, it } from "vitest";
import { DOCUMENT_TEMPLATES, fillDocTemplate } from "./domain.js";

describe("DOCUMENT_TEMPLATES", () => {
  it("tem modelos com id, nome, tipo e corpo únicos", () => {
    expect(DOCUMENT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const ids = DOCUMENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of DOCUMENT_TEMPLATES) {
      expect(t.name).toBeTruthy();
      expect(t.type).toBeTruthy();
      expect(t.body.length).toBeGreaterThan(20);
    }
  });
});

describe("fillDocTemplate", () => {
  it("substitui {{empresa}} e {{data}} pelos valores do contexto", () => {
    const t = { body: "Empresa: {{empresa}}\nData: {{data}}" };
    const out = fillDocTemplate(t, { business: "Doces da Ana", date: "01/01/2026" });
    expect(out).toBe("Empresa: Doces da Ana\nData: 01/01/2026");
  });

  it("usa placeholders padrão quando falta o negócio e preenche a data de hoje", () => {
    const out = fillDocTemplate({ body: "{{empresa}} — {{data}}" }, {});
    expect(out).toContain("[SUA EMPRESA]");
    expect(out).not.toContain("{{data}}");
    expect(out).toMatch(/\d{4}/); // ano presente na data formatada
  });

  it("mantém os campos entre colchetes para a pessoa preencher", () => {
    const contrato = DOCUMENT_TEMPLATES.find((t) => t.id === "contrato-servico");
    const out = fillDocTemplate(contrato, { business: "X" });
    expect(out).toContain("[NOME DO CLIENTE]");
    expect(out).not.toContain("{{empresa}}");
  });

  it("é tolerante a template vazio", () => {
    expect(fillDocTemplate(null)).toBe("");
    expect(fillDocTemplate({})).toBe("");
  });
});
