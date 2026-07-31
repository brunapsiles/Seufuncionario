import { describe, expect, it } from "vitest";
import { createPresentationPptx } from "./presentationPptx.js";

describe("createPresentationPptx", () => {
  it("monta slides editáveis com metadados e notas", () => {
    const pptx = createPresentationPptx(
      {
        title: "Plano comercial",
        objetivo: "Explicar a estratégia",
        slides: [
          {
            title: "Como crescer",
            bullets: ["Melhorar o atendimento", "Acompanhar propostas"],
            notes: "Apresente um exemplo real.",
          },
          { title: "Próximos passos", bullets: ["Começar hoje"] },
        ],
      },
      { author: "Ana", company: "Loja da Ana" },
    );

    expect(pptx.title).toBe("Plano comercial");
    expect(pptx.author).toBe("Ana");
    expect(pptx.company).toBe("Loja da Ana");
    expect(pptx._slides).toHaveLength(2);
  });

  it("aceita apresentação vazia sem inventar slides", () => {
    const pptx = createPresentationPptx({ title: "Rascunho" });
    expect(pptx._slides).toHaveLength(0);
  });
});
