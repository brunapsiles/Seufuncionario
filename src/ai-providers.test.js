import { afterEach, describe, expect, it, vi } from "vitest";
import {
  askOpenAICompatible,
  configuredAiProviders,
  publicAiResult,
} from "../worker.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rede gratuita de IA", () => {
  it("nunca expõe ao aplicativo qual infraestrutura respondeu", () => {
    const result = publicAiResult({
      content: "Resposta útil",
      degraded: false,
      provider: "Provedor interno",
      model: "modelo-interno",
      providerFailures: ["detalhe privado"],
      routingMode: "deep",
    });

    expect(result).toEqual({ content: "Resposta útil", degraded: false });
    expect(JSON.stringify(result)).not.toMatch(
      /provider|model|failure|routing|Provedor interno|modelo-interno/i,
    );
  });

  it("informa somente o estado de configuração e nunca expõe chaves", () => {
    const providers = configuredAiProviders({
      AI: { run: vi.fn() },
      GROQ_API_KEY: "segredo-groq",
    });

    expect(providers).toHaveLength(8);
    expect(providers.find((item) => item.id === "cloudflare")?.configured).toBe(
      true,
    );
    expect(providers.find((item) => item.id === "groq")?.configured).toBe(true);
    expect(JSON.stringify(providers)).not.toContain("segredo-groq");
    expect(providers.every((item) => !("key" in item))).toBe(true);
  });

  it("conversa com APIs compatíveis sem enviar a chave no corpo", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "modelo-respondente",
          choices: [{ message: { content: "Resposta útil" } }],
          usage: { total_tokens: 12 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await askOpenAICompatible({
      endpoint: "https://ia.exemplo.test/v1/chat/completions",
      token: "segredo",
      model: "modelo-grátis",
      provider: "Provedor teste",
      prompt: "Ajude a empresa",
      system: "Seja objetivo",
    });

    expect(result).toMatchObject({
      content: "Resposta útil",
      provider: "Provedor teste",
      model: "modelo-respondente",
    });
    const request = fetchMock.mock.calls[0][1];
    expect(request.headers.authorization).toBe("Bearer segredo");
    expect(request.body).not.toContain("segredo");
  });

  it("transforma falha remota em erro seguro e identificável", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("limite", { status: 429 }),
    );

    await expect(
      askOpenAICompatible({
        endpoint: "https://ia.exemplo.test/v1/chat/completions",
        token: "segredo",
        model: "modelo",
        provider: "Provedor teste",
        prompt: "Olá",
        system: "Ajude",
      }),
    ).rejects.toThrow("Provedor teste indisponível (429)");
  });
});
