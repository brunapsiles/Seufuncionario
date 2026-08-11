import { describe, expect, it } from "vitest";
import { todoGreenIntegrationStatus } from "../../../worker/services/todogreen-core.js";

describe("estado das integrações da To Do Green", () => {
  it("expõe capacidade sem expor segredos e marca o contexto isolado", () => {
    const status = todoGreenIntegrationStatus({
      AI: { run() {} },
      GROQ_API_KEY: "segredo-groq",
      SEARXNG_URL: "https://busca.exemplo.com",
      N8N_WEBHOOK_URL: "https://automacao.exemplo.com/webhook",
    });
    expect(status.ai.cascade).toBe(true);
    expect(status.ai.isolation).toBe("todogreen");
    expect(status.ai.providers).toHaveLength(9);
    expect(status.ai.providers.find((item) => item.id === "cloudflare")?.configured).toBe(true);
    expect(status.ai.providers.find((item) => item.id === "groq")?.configured).toBe(true);
    expect(status.web.openSource.searxng).toBe(true);
    expect(status.media).toEqual({ whisper: true, imageGeneration: true, paidFallback: false });
    expect(status.automations).toHaveLength(8);
    expect(status.automations.find((item) => item.id === "n8n")?.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("segredo-groq");
    expect(JSON.stringify(status)).not.toContain("automacao.exemplo.com");
  });
});
