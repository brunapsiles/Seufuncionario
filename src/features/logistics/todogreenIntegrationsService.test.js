import { describe, expect, it, vi } from "vitest";
import { handleTodoGreenIntegrations, todoGreenIntegrationStatus } from "../../../worker/services/todogreen-integrations.js";

describe("integrações da vertical", () => {
  it("mostra somente disponibilidade e não expõe credenciais", () => {
    const status = todoGreenIntegrationStatus({
      AI: { run: vi.fn() },
      DB: { prepare: vi.fn() },
      GROQ_API_KEY: "segredo-groq",
      SEARXNG_BASE_URL: "https://busca.example.com",
      EVOLUTION_API_BASE_URL: "https://whatsapp.example.com/",
      EVOLUTION_API_KEY: "segredo-evolution",
      EVOLUTION_INSTANCE: "todo-green",
    });
    expect(status.ai.find((item) => item.id === "cloudflare")?.configured).toBe(true);
    expect(status.ai.find((item) => item.id === "groq")?.configured).toBe(true);
    expect(status.search.providers.find((item) => item.id === "searxng")?.configured).toBe(true);
    expect(status.automationEngine).toEqual(expect.objectContaining({
      id: "cloudflare-native",
      configured: true,
      requiresExternalServer: false,
    }));
    expect(status.automation.every((item) => item.configured)).toBe(true);
    expect(status.messaging).toEqual([
      expect.objectContaining({ id: "evolution-api", configured: true }),
    ]);
    expect(status.automation.map((item) => item.id)).toEqual([
      "cloudflare-cron", "tasks-reminders", "weekly-summary",
    ]);
    expect(JSON.stringify(status)).not.toMatch(/n8n|node-red|activepieces|windmill|temporal|airflow|kestra|huginn/i);
    expect(JSON.stringify(status)).not.toContain("segredo-groq");
    expect(JSON.stringify(status)).not.toContain("segredo-evolution");
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
