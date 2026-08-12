import { describe, expect, it } from "vitest";
import { mergeImportedCrm } from "../../../worker/services/todogreen-customer-portal.js";

describe("regras de origem da carteira importada", () => {
  it("mantém contato legado e muda para morno quando a empresa está na Carteira To Do Green", () => {
    const merged = mergeImportedCrm(
      { temperature: "Frio", source: "CRM legado Total Express", contacts: [{ id: "f", name: "Fernanda Vasco", email: "fevasco@amazon.com", phone: "+5511988395335" }], qualification: { financialDataOwner: "Total Express" } },
      { temperature: "Morno", source: "Carteira To Do Green", contacts: [], qualification: { opportunity: "Projeto Brasil" } },
      "Amazon",
    );
    expect(merged.temperature).toBe("Morno");
    expect(merged.contacts).toHaveLength(1);
    expect(merged.qualification).toEqual(expect.objectContaining({ financialDataOwner: "Total Express", opportunity: "Projeto Brasil" }));
  });

  it("não rebaixa uma conta morna se o CRM legado for reimportado depois", () => {
    const merged = mergeImportedCrm(
      { temperature: "Morno", source: "Carteira To Do Green", contacts: [] },
      { temperature: "Frio", source: "CRM legado Total Express", contacts: [] },
      "Adidas",
    );
    expect(merged.temperature).toBe("Morno");
  });
});
