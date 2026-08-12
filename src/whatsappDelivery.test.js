import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sendWhatsAppText,
  whatsappEnabled,
} from "../worker/mensageria/envio.js";

describe("envio de WhatsApp pela Evolution API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("somente habilita o canal com a configuração completa", () => {
    expect(whatsappEnabled({ EVOLUTION_API_BASE_URL: "https://wa.example.com" })).toBe(false);
    expect(
      whatsappEnabled({
        EVOLUTION_API_BASE_URL: "https://wa.example.com/",
        EVOLUTION_API_KEY: "secret",
        EVOLUTION_INSTANCE: "todo-green",
      }),
    ).toBe(true);
  });

  it("envia somente para o telefone informado usando a instância configurada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: { id: "message-123" } }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWhatsAppText(
      {
        EVOLUTION_API_BASE_URL: "https://wa.example.com/",
        EVOLUTION_API_KEY: "secret",
        EVOLUTION_INSTANCE: "todo green",
      },
      "+55 (11) 98839-5335",
      "Olá, Fernanda",
    );

    expect(result).toEqual({
      provider: "evolution_api",
      providerMessageId: "message-123",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://wa.example.com/message/sendText/todo%20green");
    expect(options.headers.apikey).toBe("secret");
    expect(JSON.parse(options.body)).toEqual({
      number: "5511988395335",
      textMessage: { text: "Olá, Fernanda" },
      linkPreview: false,
    });
  });
});
