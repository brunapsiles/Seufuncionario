import { describe, expect, it } from "vitest";
import {
  analyticsSummary,
  bookingWindow,
  consentedAudience,
  inventoryHealth,
  sprintMetrics,
  ticketSla,
} from "./platformSuiteDomain.js";

describe("platformSuiteDomain", () => {
  it("identifica ruptura e sugestão de compra no estoque", () => {
    const result = inventoryHealth([
      { id: "1", name: "Café", stock: 0, lowStockAlert: 4 },
      { id: "2", name: "Leite", variants: [{ stock: 2 }, { stock: 1 }], lowStockAlert: 3 },
    ]);
    expect(result.outOfStock).toBe(1);
    expect(result.lowStock).toBe(1);
    expect(result.rows[0].suggestedPurchase).toBe(8);
  });

  it("nunca inclui contato sem consentimento em campanha", () => {
    const audience = consentedAudience([
      { id: "1", name: "Ana", email: "ana@example.com", marketingOptIn: true },
      { id: "2", name: "Bia", email: "bia@example.com", marketingOptIn: false },
      { id: "3", name: "Caio", marketingOptIn: true },
    ]);
    expect(audience.map((contact) => contact.id)).toEqual(["1"]);
  });

  it("calcula velocidade e bloqueios do sprint", () => {
    const result = sprintMetrics(
      [
        { sprint: "S1", status: "Concluído", storyPoints: 5 },
        { sprint: "S1", status: "Bloqueado", storyPoints: 3 },
        { sprint: "S2", status: "Concluído", storyPoints: 8 },
      ],
      "S1",
    );
    expect(result).toMatchObject({
      count: 2,
      blocked: 1,
      totalPoints: 8,
      completedPoints: 5,
      progress: 63,
    });
  });

  it("classifica SLA e resume eventos sem conteúdo pessoal", () => {
    expect(
      ticketSla({ slaDueAt: "2026-07-31T12:30:00.000Z" }, Date.parse("2026-07-31T12:00:00.000Z")),
    ).toEqual({ state: "em_risco", minutesLeft: 30 });
    expect(
      analyticsSummary([
        { eventName: "page_view", path: "/", sessionId: "s1", visitorId: "v1" },
        { eventName: "lead", path: "/contato", sessionId: "s1", visitorId: "v1" },
      ]),
    ).toMatchObject({ events: 2, pageViews: 1, sessions: 1, visitors: 1 });
  });

  it("recusa conflito de agendamento", () => {
    const result = bookingWindow(
      { weekdays: [5], startTime: "09:00", endTime: "18:00", durationMinutes: 30 },
      "2026-07-31T10:15",
      [{ startAt: "2026-07-31T10:00:00.000Z", endAt: "2026-07-31T10:30:00.000Z" }],
    );
    expect(result).toEqual({ ok: false, error: "Este horário acabou de ser ocupado." });
  });
});
