import { describe, expect, it } from "vitest";
import { parseDeckSlides } from "./domain.js";

describe("parseDeckSlides", () => {
  it("lê um array JSON limpo", () => {
    const raw = JSON.stringify([
      { title: "Capa", bullets: ["Subtítulo"], notes: "Abra com energia" },
      { title: "Problema", bullets: ["Dor 1", "Dor 2"] },
    ]);
    const slides = parseDeckSlides(raw);
    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({ title: "Capa", notes: "Abra com energia" });
    expect(slides[1].bullets).toEqual(["Dor 1", "Dor 2"]);
  });

  it("tolera cercas de código e texto ao redor", () => {
    const raw =
      'Claro! Aqui está:\n```json\n[{"title":"Oferta","bullets":["Rápido","Barato"]}]\n```\nEspero que ajude.';
    const slides = parseDeckSlides(raw);
    expect(slides).toHaveLength(1);
    expect(slides[0].title).toBe("Oferta");
    expect(slides[0].bullets).toEqual(["Rápido", "Barato"]);
  });

  it("aceita chaves em português (titulo/pontos)", () => {
    const raw = '[{"titulo":"Início","pontos":["A","B"],"notas":"fale devagar"}]';
    const slides = parseDeckSlides(raw);
    expect(slides[0]).toMatchObject({
      title: "Início",
      bullets: ["A", "B"],
      notes: "fale devagar",
    });
  });

  it("faz fallback para Markdown quando não há JSON", () => {
    const raw =
      "## Bem-vindo\n- Ponto um\n- Ponto dois\n\n## Próximos passos\n- Feche o negócio";
    const slides = parseDeckSlides(raw);
    expect(slides).toHaveLength(2);
    expect(slides[0].title).toBe("Bem-vindo");
    expect(slides[0].bullets).toEqual(["Ponto um", "Ponto dois"]);
    expect(slides[1].title).toBe("Próximos passos");
  });

  it("descarta slides vazios e limita a 8 tópicos", () => {
    const many = Array.from({ length: 12 }, (_, i) => `t${i}`);
    const raw = JSON.stringify([
      { title: "", bullets: [] },
      { title: "Cheio", bullets: many },
    ]);
    const slides = parseDeckSlides(raw);
    expect(slides).toHaveLength(1);
    expect(slides[0].bullets).toHaveLength(8);
  });

  it("retorna vazio para entrada vazia ou inválida", () => {
    expect(parseDeckSlides("")).toEqual([]);
    expect(parseDeckSlides(null)).toEqual([]);
  });
});
