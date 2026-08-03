import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADJUST,
  MAX_SAVE_BYTES,
  canSaveToWorkspace,
  clampCrop,
  compressionStep,
  cropToRatio,
  dataUrlBytes,
  describeEdit,
  describeSaving,
  extensionFor,
  filterCss,
  fitInside,
  formatBytes,
  isAcceptedImage,
  isDefaultAdjust,
  normalizeAngle,
  outputName,
  resizeTo,
  rotateSize,
  savingPercent,
  startCompression,
  supportsQuality,
} from "./features/media/imageDomain";

describe("fitInside", () => {
  it("encolhe mantendo a proporção", () => {
    expect(fitInside(2000, 1000, 800, 800)).toMatchObject({
      width: 800,
      height: 400,
    });
  });

  it("não estica imagem menor que o limite — aumentar só borra", () => {
    expect(fitInside(300, 200, 1080, 1080)).toMatchObject({
      width: 300,
      height: 200,
    });
  });

  it("limite ausente não trava a conta", () => {
    expect(fitInside(400, 300, 0, 0)).toMatchObject({ width: 400, height: 300 });
  });

  it("nunca devolve zero", () => {
    const r = fitInside(1000, 10, 5, 5);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });
});

describe("resizeTo", () => {
  it("só a largura mantém a proporção", () => {
    expect(resizeTo(1600, 900, { width: 800 })).toEqual({
      width: 800,
      height: 450,
    });
  });

  it("só a altura mantém a proporção", () => {
    expect(resizeTo(1600, 900, { height: 450 })).toEqual({
      width: 800,
      height: 450,
    });
  });

  it("porcentagem vale sobre os dois lados", () => {
    expect(resizeTo(1000, 500, { percent: 50 })).toEqual({
      width: 500,
      height: 250,
    });
  });

  it("os dois lados juntos cabem dentro, sem achatar", () => {
    expect(resizeTo(1000, 500, { width: 400, height: 400 })).toMatchObject({
      width: 400,
      height: 200,
    });
  });

  it("quem pede explicitamente para deformar, deforma", () => {
    expect(
      resizeTo(1000, 500, { width: 400, height: 400, keepRatio: false }),
    ).toEqual({ width: 400, height: 400 });
  });

  it("sem pedido nenhum, devolve o tamanho original", () => {
    expect(resizeTo(640, 480, {})).toEqual({ width: 640, height: 480 });
  });
});

describe("rotateSize", () => {
  it("90 graus troca largura por altura", () => {
    expect(rotateSize(800, 600, 90)).toEqual({ width: 600, height: 800 });
    expect(rotateSize(800, 600, 270)).toEqual({ width: 600, height: 800 });
  });

  it("180 graus mantém o tamanho", () => {
    expect(rotateSize(800, 600, 180)).toEqual({ width: 800, height: 600 });
  });

  it("ângulo negativo é normalizado", () => {
    expect(normalizeAngle(-90)).toBe(270);
    expect(rotateSize(800, 600, -90)).toEqual({ width: 600, height: 800 });
  });
});

describe("clampCrop", () => {
  it("recorte que vaza é trazido para dentro", () => {
    expect(clampCrop({ x: 900, y: 900, width: 300, height: 300 }, 1000, 1000)).toEqual(
      { x: 700, y: 700, width: 300, height: 300 },
    );
  });

  it("recorte maior que a imagem vira a imagem inteira", () => {
    expect(clampCrop({ x: 0, y: 0, width: 5000, height: 5000 }, 800, 600)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it("valores negativos não passam", () => {
    const r = clampCrop({ x: -50, y: -50, width: 100, height: 100 }, 400, 400);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it("recorte vazio nunca chega a zero", () => {
    const r = clampCrop({ width: 0, height: 0 }, 400, 400);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });
});

describe("cropToRatio", () => {
  it("paisagem para quadrado corta as laterais, mantendo o meio", () => {
    expect(cropToRatio(1600, 900, 1)).toEqual({
      x: 350,
      y: 0,
      width: 900,
      height: 900,
    });
  });

  it("retrato para paisagem corta em cima e embaixo", () => {
    const r = cropToRatio(900, 1600, 16 / 9);
    expect(r.width).toBe(900);
    expect(r.height).toBe(506);
    expect(r.y).toBeGreaterThan(0);
  });

  it("já está na proporção: não corta nada", () => {
    expect(cropToRatio(500, 500, 1)).toEqual({
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    });
  });

  it("proporção livre devolve a imagem inteira", () => {
    expect(cropToRatio(800, 600, 0)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });
});

describe("filterCss", () => {
  it("sem ajuste, o filtro é neutro", () => {
    expect(filterCss({})).toBe(
      "brightness(100%) contrast(100%) saturate(100%) grayscale(0%) blur(0px)",
    );
    expect(isDefaultAdjust(DEFAULT_ADJUST)).toBe(true);
  });

  it("valor fora da faixa é preso no limite, e não invalida o filtro inteiro", () => {
    expect(filterCss({ brightness: 9999 })).toContain("brightness(300%)");
    expect(filterCss({ contrast: -50 })).toContain("contrast(0%)");
  });

  it("texto no lugar de número não gera filtro quebrado", () => {
    expect(filterCss({ saturate: "muito" })).toContain("saturate(0%)");
  });

  it("reconhece que houve ajuste", () => {
    expect(isDefaultAdjust({ ...DEFAULT_ADJUST, contrast: 120 })).toBe(false);
  });
});

describe("compressão", () => {
  it("PNG não tem qualidade variável", () => {
    expect(supportsQuality("image/png")).toBe(false);
    expect(supportsQuality("image/jpeg")).toBe(true);
    expect(supportsQuality("image/webp")).toBe(true);
  });

  it("se coube, tenta uma qualidade maior na próxima", () => {
    const passo = compressionStep(
      { quality: 0.5, low: 0.1, high: 1, tries: 1 },
      50_000,
      100_000,
    );
    expect(passo.quality).toBeGreaterThan(0.5);
  });

  it("se não coube, tenta uma qualidade menor", () => {
    const passo = compressionStep(
      { quality: 0.5, low: 0.1, high: 1, tries: 1 },
      500_000,
      100_000,
    );
    expect(passo.quality).toBeLessThan(0.5);
  });

  it("guarda o melhor resultado que já coube", () => {
    const passo = compressionStep(
      { quality: 0.6, low: 0.1, high: 1, tries: 1 },
      80_000,
      100_000,
    );
    expect(passo.best).toEqual({ quality: 0.6, size: 80_000 });
  });

  it("converge em poucas tentativas em vez de rodar para sempre", () => {
    let estado = startCompression();
    let voltas = 0;
    while (!estado.done && voltas < 50) {
      // Simula um arquivo que sempre fica grande demais.
      estado = compressionStep(estado, 900_000, 100_000);
      voltas++;
    }
    expect(estado.done).toBe(true);
    expect(voltas).toBeLessThan(20);
  });

  it("sem alvo de tamanho, não fica tentando", () => {
    expect(compressionStep(startCompression(), 10, 0).done).toBe(true);
  });
});

describe("arquivo de saída", () => {
  it("mantém o nome e troca a extensão", () => {
    expect(outputName("foto-bolo.JPG", "image/webp")).toBe(
      "foto-bolo-editado.webp",
    );
  });

  it("tira caractere que quebra nome de arquivo", () => {
    expect(outputName('rel/at:ório*"', "image/png")).toBe(
      "rel-at-ório--editado.png",
    );
  });

  it("nome vazio ainda gera arquivo utilizável", () => {
    expect(outputName("", "image/jpeg")).toBe("imagem-editado.jpg");
  });

  it("extensão desconhecida cai em png", () => {
    expect(extensionFor("image/tiff")).toBe("png");
  });
});

describe("tamanho", () => {
  it("mostra em KB e MB conforme o caso", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });

  it("conta os bytes reais de um data URL em base64", () => {
    // "AAAA" em base64 são 3 bytes.
    expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3);
    expect(dataUrlBytes("data:image/png;base64,AAA=")).toBe(2);
  });

  it("link comum não conta como espaço ocupado", () => {
    expect(dataUrlBytes("https://exemplo.com/foto.png")).toBe(0);
    expect(dataUrlBytes(null)).toBe(0);
  });

  it("diz quanto encolheu", () => {
    expect(savingPercent(1000, 250)).toBe(75);
    expect(describeSaving(1000, 250)).toBe("75% menor que o original");
  });

  it("avisa quando o arquivo ficou MAIOR, em vez de esconder", () => {
    expect(savingPercent(100, 150)).toBe(-50);
    expect(describeSaving(100, 150)).toBe("50% maior que o original");
  });

  it("arquivo grande demais não vai para o espaço de trabalho", () => {
    expect(canSaveToWorkspace(MAX_SAVE_BYTES)).toBe(true);
    expect(canSaveToWorkspace(MAX_SAVE_BYTES + 1)).toBe(false);
  });
});

describe("tipos aceitos", () => {
  it("aceita as imagens comuns", () => {
    expect(isAcceptedImage("image/png")).toBe(true);
    expect(isAcceptedImage("IMAGE/JPEG")).toBe(true);
  });

  it("recusa SVG: SVG é código e pode carregar script", () => {
    expect(isAcceptedImage("image/svg+xml")).toBe(false);
  });

  it("recusa o que não é imagem", () => {
    expect(isAcceptedImage("application/pdf")).toBe(false);
    expect(isAcceptedImage("")).toBe(false);
  });
});

describe("describeEdit", () => {
  it("resume o que foi feito, para dar para diferenciar as versões", () => {
    expect(
      describeEdit({
        width: 800,
        height: 800,
        cropped: true,
        format: "image/webp",
      }),
    ).toBe("800×800 · recortada · WebP");
  });

  it("sem alteração nenhuma, diz isso", () => {
    expect(describeEdit({})).toBe("sem alteração");
  });
});
