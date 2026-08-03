import { describe, expect, it } from "vitest";
import {
  MAX_RECORD_SECONDS,
  buildAudioItem,
  chunkForSpeech,
  cleanTranscript,
  estimateSpeechSeconds,
  formatDuration,
  mergeTranscript,
  pickRecorderMime,
  pickVoice,
  recordingWarning,
  shouldStopRecording,
  speechRate,
  wordCount,
} from "./features/media/audioDomain";

describe("formatDuration", () => {
  it("mostra minutos e segundos", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("valor inválido não vira NaN na tela", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration("abc")).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("limite de gravação", () => {
  it("avisa quando está chegando no fim", () => {
    expect(recordingWarning(10)).toBe("");
    expect(recordingWarning(MAX_RECORD_SECONDS - 10)).toContain("Faltam");
  });

  it("para no limite, para não estourar o espaço de trabalho", () => {
    expect(shouldStopRecording(MAX_RECORD_SECONDS)).toBe(true);
    expect(shouldStopRecording(MAX_RECORD_SECONDS - 1)).toBe(false);
    expect(recordingWarning(MAX_RECORD_SECONDS)).toContain("Limite");
  });
});

describe("chunkForSpeech", () => {
  it("texto curto vira um pedaço só", () => {
    expect(chunkForSpeech("Bom dia.")).toEqual(["Bom dia."]);
  });

  it("texto vazio não gera pedaço nenhum", () => {
    expect(chunkForSpeech("")).toEqual([]);
    expect(chunkForSpeech("   ")).toEqual([]);
    expect(chunkForSpeech(null)).toEqual([]);
  });

  it("quebra por frase, não no meio da palavra", () => {
    const texto =
      "Primeira frase bem completa aqui. Segunda frase também completa. Terceira para fechar.";
    const pedacos = chunkForSpeech(texto, 40);
    expect(pedacos.length).toBeGreaterThan(1);
    // Nenhum pedaço pode terminar cortando uma palavra ao meio.
    for (const p of pedacos) expect(p).toMatch(/[.!?…]$|^\S/);
    expect(pedacos.join(" ").replace(/\s+/g, " ")).toBe(texto);
  });

  it("frase gigante sem pontuação também é quebrada", () => {
    const gigante = "palavra ".repeat(80).trim();
    const pedacos = chunkForSpeech(gigante, 60);
    expect(pedacos.length).toBeGreaterThan(1);
    for (const p of pedacos) expect(p.length).toBeLessThanOrEqual(60);
  });

  it("junta frases curtas em vez de gerar dezenas de pedacinhos", () => {
    const pedacos = chunkForSpeech("Oi. Tudo bem? Sim. Ótimo.", 180);
    expect(pedacos).toHaveLength(1);
  });

  it("nada se perde na quebra", () => {
    const texto =
      "Olá! Este é um teste de leitura em voz alta. Ele precisa sair inteiro, sem perder palavra nenhuma no caminho.";
    expect(chunkForSpeech(texto, 45).join(" ")).toBe(texto);
  });
});

describe("voz e velocidade", () => {
  it("prefere voz em português do Brasil", () => {
    const vozes = [
      { name: "Alex", lang: "en-US" },
      { name: "Luciana", lang: "pt-BR" },
      { name: "Joana", lang: "pt-PT" },
    ];
    expect(pickVoice(vozes)?.name).toBe("Luciana");
  });

  it("sem pt-BR, aceita outro português antes de cair no inglês", () => {
    const vozes = [
      { name: "Alex", lang: "en-US" },
      { name: "Joana", lang: "pt-PT" },
    ];
    expect(pickVoice(vozes)?.name).toBe("Joana");
  });

  it("respeita a voz escolhida à mão", () => {
    const vozes = [
      { name: "Alex", lang: "en-US" },
      { name: "Luciana", lang: "pt-BR" },
    ];
    expect(pickVoice(vozes, "Alex")?.name).toBe("Alex");
  });

  it("aparelho sem voz nenhuma não quebra", () => {
    expect(pickVoice([])).toBeNull();
    expect(pickVoice(null)).toBeNull();
  });

  it("velocidade desconhecida vira normal", () => {
    expect(speechRate("rapida")).toBe(1.25);
    expect(speechRate("inventada")).toBe(1);
  });
});

describe("mergeTranscript", () => {
  it("o texto confirmado se acumula", () => {
    const r = mergeTranscript("Bom dia", { final: "e boa tarde" });
    expect(r.final).toBe("Bom dia e boa tarde");
  });

  it("o provisório não entra no texto final — senão sairia repetido", () => {
    const r = mergeTranscript("Bom dia", { interim: "e boa" });
    expect(r.final).toBe("Bom dia");
    expect(r.preview).toBe("e boa");
  });

  it("começar do zero funciona", () => {
    expect(mergeTranscript("", { final: "Alô" }).final).toBe("Alô");
  });

  it("resultado vazio não apaga o que já tinha", () => {
    expect(mergeTranscript("Já escrito", {}).final).toBe("Já escrito");
  });
});

describe("cleanTranscript", () => {
  it("arruma espaço antes da pontuação", () => {
    expect(cleanTranscript("bom dia , tudo bem ?")).toBe("Bom dia, tudo bem?");
  });

  it("põe maiúscula depois do ponto", () => {
    expect(cleanTranscript("primeira frase. segunda frase.")).toBe(
      "Primeira frase. Segunda frase.",
    );
  });

  it("não mexe em texto já correto", () => {
    expect(cleanTranscript("Tudo certo aqui.")).toBe("Tudo certo aqui.");
  });

  it("texto vazio continua vazio", () => {
    expect(cleanTranscript("")).toBe("");
    expect(cleanTranscript(null)).toBe("");
  });
});

describe("estimativa de locução", () => {
  it("conta palavras", () => {
    expect(wordCount("uma duas três")).toBe(3);
    expect(wordCount("   ")).toBe(0);
  });

  it("estima o tempo de leitura em voz alta", () => {
    const texto = Array.from({ length: 150 }, () => "palavra").join(" ");
    expect(estimateSpeechSeconds(texto)).toBe(60);
  });

  it("velocidade maior encurta a locução", () => {
    const texto = Array.from({ length: 150 }, () => "palavra").join(" ");
    expect(estimateSpeechSeconds(texto, 1.25)).toBeLessThan(60);
  });
});

describe("buildAudioItem", () => {
  it("monta o item pronto para a biblioteca", () => {
    const item = buildAudioItem({
      url: "blob:x",
      seconds: 75,
      transcript: " oi ",
      businessId: "b1",
      ownerId: "u1",
    });
    expect(item).toMatchObject({
      type: "audio",
      duration: 75,
      transcript: "oi",
      businessId: "b1",
      ownerId: "u1",
      visibility: "privado",
    });
    expect(item.id).toBeTruthy();
    expect(item.tags).toEqual([]);
  });

  it("sem nome, o próprio tempo vira o nome", () => {
    expect(buildAudioItem({ seconds: 75 }).name).toBe("Gravação 1:15");
  });
});

describe("pickRecorderMime", () => {
  it("escolhe o melhor formato que o aparelho aceita", () => {
    expect(pickRecorderMime((t) => t.includes("webm"))).toBe(
      "audio/webm;codecs=opus",
    );
  });

  it("no Safari, cai no mp4 em vez de falhar calado", () => {
    expect(pickRecorderMime((t) => t === "audio/mp4")).toBe("audio/mp4");
  });

  it("aparelho que não aceita nada devolve vazio, e quem chama decide", () => {
    expect(pickRecorderMime(() => false)).toBe("");
  });
});
