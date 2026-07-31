import { describe, expect, it } from "vitest";
import {
  appFromPrompt,
  appSchemaToHtml,
  evaluateAiResponse,
  localTemplateAnswer,
  moderateTemplate,
  normalizeAppSchema,
} from "./freeSuiteDomain.js";

describe("suíte gratuita", () => {
  it("avalia respostas sem declarar correção como fato", () => {
    const result = evaluateAiResponse({
      prompt: "Crie um plano de marketing para uma padaria",
      response:
        "Plano de marketing para a padaria:\n- Defina o público.\n- Teste uma oferta. Próximo passo: medir conversão e revisar os riscos.",
      sources: "https://example.com/referencia",
    });
    expect(result.score).toBeGreaterThan(60);
    expect(result.dimensions.evidence).toBeGreaterThan(50);
    expect(result.disclaimer).toContain("não comprova");
  });

  it("gera somente blocos declarativos permitidos", () => {
    const app = appFromPrompt(
      "Crie um dashboard com indicadores, formulário de contato e FAQ",
      "Loja Brasil",
    );
    expect(app.blocks.map((block) => block.type)).toEqual([
      "hero",
      "benefits",
      "form",
      "faq",
      "metrics",
    ]);
    const safe = normalizeAppSchema({
      ...app,
      blocks: [...app.blocks, { type: "script", text: "alert(1)" }],
    });
    expect(safe.blocks.some((block) => block.type === "script")).toBe(false);
  });

  it("exporta HTML escapando conteúdo do usuário", () => {
    const html = appSchemaToHtml({
      name: "<script>alert(1)</script>",
      blocks: [{ type: "hero", title: "<img onerror=alert(1)>", text: "ok" }],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("img onerror=alert(1)");
  });

  it("barra publicação com código executável ou licença desconhecida", () => {
    const result = moderateTemplate({
      name: "Armadilha",
      description: "<script>roubar()</script>",
      license: "proprietária",
      schema: appFromPrompt("site"),
    });
    expect(result.approved).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("mantém um plano C local identificável", () => {
    expect(localTemplateAnswer("aumentar vendas", "Padaria")).toContain(
      "sem enviar dados para uma API",
    );
  });
});
