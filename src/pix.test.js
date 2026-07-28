import { describe, expect, it } from "vitest";
import { buildPixCode, pixCrc16 } from "./domain.js";

describe("pixCrc16", () => {
  it("bate com o vetor de teste conhecido CCITT-FALSE", () => {
    expect(pixCrc16("123456789")).toBe("29B1");
  });
});

describe("buildPixCode", () => {
  it("gera um BR Code válido e autoconsistente (CRC no fim)", () => {
    const code = buildPixCode({
      key: "ana@doces.com",
      name: "Ana Souza",
      city: "Recife",
      amount: 10,
      description: "Bolo",
    });
    expect(code.startsWith("000201")).toBe(true);
    expect(code).toContain("br.gov.bcb.pix");
    expect(code).toContain("ana@doces.com");
    // valor formatado com 2 casas (ID 54, tamanho 05, valor "10.00")
    expect(code).toContain("540510.00");
    // CRC final confere
    expect(pixCrc16(code.slice(0, -4))).toBe(code.slice(-4));
  });

  it("omite o valor quando não informado (ou zero)", () => {
    const code = buildPixCode({ key: "11999998888", name: "X", city: "SP" });
    expect(code).not.toContain("5303986540"); // não há campo 54 logo após o 53
    expect(pixCrc16(code.slice(0, -4))).toBe(code.slice(-4));
  });

  it("remove acentos e limita nome/cidade", () => {
    const code = buildPixCode({
      key: "k",
      name: "José da Conceição Muito Longo Nome Extra",
      city: "São Paulo do Interior Grande",
    });
    expect(code).not.toMatch(/[áàâãéêíóôõúç]/i);
    expect(pixCrc16(code.slice(0, -4))).toBe(code.slice(-4));
  });

  it("retorna vazio sem chave", () => {
    expect(buildPixCode({ name: "X" })).toBe("");
    expect(buildPixCode({})).toBe("");
  });
});
