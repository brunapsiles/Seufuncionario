import { describe, expect, it } from "vitest";
import { assessAccount, gmailComposeUrl, outlookComposeUrl, whatsappUrl } from "./accountIntelligenceDomain.js";

describe("inteligência e canais da conta", () => {
  it("prioriza procurement e sugere tarefa sem inventar contatos", () => {
    const result = assessAccount({ name: "Empresa logística", segment: "Transporte", crm: { contacts: [{ id: "1", name: "Fernanda", department: "Procurement de Logística e Transportes", email: "fernanda@example.com" }] } });
    expect(result.esgRelevance).toBe("Alta");
    expect(result.procurementContacts[0].name).toBe("Fernanda");
    expect(result.logisticsProcurementContacts[0].name).toBe("Fernanda");
    expect(result.nextTask).toMatch(/decisor econômico/i);
  });

  it("não trata um contato genérico de compras como procurement logístico confirmado", () => {
    const result = assessAccount({ name: "Empresa", crm: { contacts: [{ id: "1", name: "Carlos", department: "Compras" }] } });
    expect(result.procurementContacts).toHaveLength(1);
    expect(result.logisticsProcurementContacts).toHaveLength(0);
    expect(result.nextTask).toMatch(/Brasil.*Procurement de Logística/i);
  });

  it("gera links apenas com os dados fornecidos", () => {
    expect(whatsappUrl("11 98839-5335")).toBe("https://wa.me/5511988395335");
    expect(gmailComposeUrl("fevasco@amazon.com", "Amazon")).toContain("fevasco%40amazon.com");
    expect(outlookComposeUrl("fevasco@amazon.com", "Amazon")).toContain("fevasco%40amazon.com");
  });
});
