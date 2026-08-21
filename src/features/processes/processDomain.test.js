import { describe, expect, it } from "vitest";
import { createProcessDefinition, PROCESS_TEMPLATES } from "./processDomain.js";

describe("PROCESS_TEMPLATES", () => {
  it("inclui implantação de cliente com operação, sistemas, faturamento e RASCI", () => {
    const template = PROCESS_TEMPLATES.find((item) => item.id === "client-onboarding");

    expect(template).toBeTruthy();
    expect(template.stages.map((stage) => stage.name)).toEqual([
      "Kickoff comercial",
      "Desenho operacional",
      "Sistemas e tracking",
      "Contrato e faturamento",
      "Go-live e governança",
      "Cliente ativo",
    ]);
    expect(template.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        "Abrangência: cidades, bases, volume diário e motoristas",
        "Modelo operacional",
        "Frota dedicada?",
        "Integração de sistema",
        "Faturamento: CT-e ou NF-e",
        "Precisa de CONEMB?",
        "Ticket médio",
        "Margem %",
        "RASCI",
      ]),
    );
  });
});

describe("createProcessDefinition", () => {
  it("cria o processo de implantação com código e campos obrigatórios", () => {
    const process = createProcessDefinition({
      templateId: "client-onboarding",
      name: "Implantação C&A",
    });

    expect(process.name).toBe("Implantação C&A");
    expect(process.serviceCode).toBe("IMPL");
    expect(process.stages.at(-1).terminal).toBe(true);
    expect(process.fields.filter((field) => field.required).length).toBeGreaterThan(10);
    expect(process.stages[3].approvalRequired).toBe(true);
  });
});
