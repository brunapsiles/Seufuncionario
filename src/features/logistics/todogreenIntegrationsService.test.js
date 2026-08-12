import { describe, expect, it, vi } from "vitest";
import { handleTodoGreenIntegrations, todoGreenIntegrationStatus } from "../../../worker/services/todogreen-integrations.js";

describe("integrações da vertical", () => {
  it("mostra somente disponibilidade e não expõe credenciais", () => {
    const status = todoGreenIntegrationStatus({
      AI: { run: vi.fn() },
      GROQ_API_KEY: "segredo-groq",
      SEARXNG_BASE_URL: "https://busca.example.com",
      N8N_BASE_URL: "https://n8n.example.com",
    });
    expect(status.ai.find((item) => item.id === "cloudflare")?.configured).toBe(true);
    expect(status.ai.find((item) => item.id === "groq")?.configured).toBe(true);
    expect(status.search.providers.find((item) => item.id === "searxng")?.configured).toBe(true);
    expect(status.automation.find((item) => item.id === "n8n")?.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("segredo-groq");
  });

  it("recusa teste de provedor sem permissão de integração", async () => {
    const response = await handleTodoGreenIntegrations(
      new Request("https://example.com/api/todogreen/integrations", { method: "POST", body: "{}" }),
      {},
      { role: "auditor", permissions: ["read"] },
    );
    expect(response.status).toBe(403);
  });
});
