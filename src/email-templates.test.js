import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES } from "./domain.js";

describe("EMAIL_TEMPLATES", () => {
  it("tem modelos com id único, assunto, corpo e categoria", () => {
    expect(EMAIL_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const ids = EMAIL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of EMAIL_TEMPLATES) {
      expect(t.name).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.subject).toBeTruthy();
      expect(t.body.length).toBeGreaterThan(20);
    }
  });

  it("os corpos usam campos entre [COLCHETES] para preencher", () => {
    const cobranca = EMAIL_TEMPLATES.find((t) => t.id === "cobranca");
    expect(cobranca.body).toMatch(/\[NOME\]/);
    expect(cobranca.body).toMatch(/\[VALOR\]/);
  });
});
