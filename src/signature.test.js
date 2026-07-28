import { describe, expect, it } from "vitest";
import { buildEmailSignature, normalizeWhatsappNumber } from "./domain.js";

describe("normalizeWhatsappNumber", () => {
  it("acrescenta o DDI 55 a números nacionais", () => {
    expect(normalizeWhatsappNumber("(81) 99999-8888")).toBe("5581999998888");
    expect(normalizeWhatsappNumber("8133334444")).toBe("558133334444");
  });
  it("não duplica o DDI quando já presente", () => {
    expect(normalizeWhatsappNumber("5581999998888")).toBe("5581999998888");
  });
  it("retorna vazio para entrada vazia", () => {
    expect(normalizeWhatsappNumber("")).toBe("");
  });
});

describe("buildEmailSignature", () => {
  it("monta texto e HTML com os dados", () => {
    const { html, text } = buildEmailSignature({
      name: "Ana Souza",
      role: "Fundadora",
      business: "Doces da Ana",
      phone: "(81) 99999-8888",
      email: "ana@doces.com",
      site: "www.docesdaana.com.br",
      instagram: "@docesdaana",
      city: "Recife, PE",
    });
    expect(text).toContain("Ana Souza");
    expect(text).toContain("Fundadora — Doces da Ana");
    expect(text).toContain("Recife, PE");
    expect(text).toContain("https://wa.me/5581999998888");
    expect(html).toContain("Ana Souza");
    expect(html).toContain('href="mailto:ana@doces.com"');
    expect(html).toContain("https://wa.me/5581999998888");
    expect(html).toContain("https://instagram.com/docesdaana");
  });

  it("escapa HTML perigoso nos campos", () => {
    const { html } = buildEmailSignature({ name: '<script>alert(1)</script>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("usa a cor de destaque válida e cai no padrão quando inválida", () => {
    expect(buildEmailSignature({ email: "a@b.com", accent: "#ff0000" }).html).toContain(
      "#ff0000",
    );
    expect(buildEmailSignature({ email: "a@b.com", accent: "vermelho" }).html).toContain(
      "#0369a1",
    );
  });

  it("omite seções vazias", () => {
    const { text, html } = buildEmailSignature({ name: "Só Nome" });
    expect(text).toBe("Só Nome");
    expect(html).not.toContain("mailto:");
  });
});
