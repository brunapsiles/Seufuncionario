import { describe, expect, it } from "vitest";
import {
  createCarouselSlides,
  fitImageRect,
  normalizeCarouselPoints,
  removeSolidBackgroundPixels,
  safeDownloadName,
} from "./creativeToolkitDomain.js";

describe("creative toolkit domain", () => {
  it("cria capa, conteúdo e chamada final sem ultrapassar dez slides", () => {
    const slides = createCarouselSlides({
      title: "Como vender melhor",
      points: Array.from({ length: 12 }, (_, index) => `Ponto ${index + 1}`).join(
        "\n",
      ),
      callToAction: "Salve este conteúdo",
      brandName: "Loja da Ana",
    });
    expect(slides).toHaveLength(10);
    expect(slides[0]).toMatchObject({
      kind: "cover",
      title: "Como vender melhor",
      eyebrow: "Loja da Ana",
    });
    expect(slides.at(-1)).toMatchObject({
      kind: "cta",
      title: "Salve este conteúdo",
    });
  });

  it("limpa marcadores e linhas vazias dos pontos", () => {
    expect(normalizeCarouselPoints("- Primeiro\n\n2. Segundo\n• Terceiro")).toEqual([
      "Primeiro",
      "Segundo",
      "Terceiro",
    ]);
  });

  it("calcula enquadramento cover e contain", () => {
    expect(fitImageRect(2000, 1000, 1000, 1000, "cover")).toMatchObject({
      sx: 500,
      sy: 0,
      sw: 1000,
      sh: 1000,
      dx: 0,
      dy: 0,
      dw: 1000,
      dh: 1000,
    });
    expect(fitImageRect(2000, 1000, 1000, 1000, "contain")).toMatchObject({
      dx: 0,
      dy: 250,
      dw: 1000,
      dh: 500,
    });
  });

  it("torna transparente o fundo semelhante aos cantos", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255,
      250, 250, 250, 255,
      255, 255, 255, 255,
      250, 250, 250, 255,
      10, 20, 30, 255,
      250, 250, 250, 255,
      255, 255, 255, 255,
      250, 250, 250, 255,
      255, 255, 255, 255,
    ]);
    const output = removeSolidBackgroundPixels(pixels, 3, 3, 30);
    expect(output[3]).toBeLessThan(255);
    expect(output[19]).toBe(255);
    expect(pixels[3]).toBe(255);
  });

  it("gera nomes seguros para download", () => {
    expect(safeDownloadName("Carrossel: Promoção de Verão!")).toBe(
      "carrossel-promocao-de-verao",
    );
  });
});
