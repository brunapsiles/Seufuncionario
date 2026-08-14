import { describe, expect, it } from "vitest";
import {
  buildTodoGreenWorkspaceIntelligence,
  buildTodoGreenWorkspaceSummary,
  findLinkedDocument,
  findLinkedNote,
  linkedEntityFor,
} from "./features/logistics/todoGreenWorkspaceDomain.js";

describe("espaço de trabalho To Do Green", () => {
  it("reúne notícias, RFQs e contatos reais sem aceitar contato web não comprovado", () => {
    const intelligence = buildTodoGreenWorkspaceIntelligence({
      clients: [{
        id: "cli-1",
        name: "Empresa Alfa",
        crm: {
          contacts: [
            { id: "c1", name: "Ana", email: "ana@alfa.com", source: "Cadastro manual" },
            { id: "c2", name: "Ex-contato", employmentStatus: "former" },
            { id: "c3", name: "Sem prova", source: "Pesquisa web", country: "Brasil" },
            { id: "c4", name: "Bruno", source: "Pesquisa web", country: "Brasil", verifiedBrazil: true, currentEmploymentVerified: true, researchVersion: 9 },
          ],
          intelligence: {
            version: 9,
            checkedAt: "2026-08-14T10:00:00Z",
            companyNews: [{ title: "Alfa amplia operação", url: "https://fonte.example/noticia" }],
            segmentNews: [{ title: "Logística elétrica cresce", url: "https://setor.example/tendencia" }],
            openRfqs: [{ title: "RFQ de transporte", url: "https://compras.example/rfq" }],
            supplierLinks: [{ title: "Portal de fornecedores", url: "https://alfa.example/fornecedores" }],
          },
        },
      }],
    });

    expect(intelligence.contacts.map((item) => item.name)).toEqual(["Ana", "Bruno"]);
    expect(intelligence.news).toHaveLength(2);
    expect(intelligence.news[0]).toMatchObject({ clientId: "cli-1", clientName: "Empresa Alfa" });
    expect(intelligence.rfqs[0].title).toBe("RFQ de transporte");
    expect(intelligence.supplierLinks[0].title).toBe("Portal de fornecedores");
  });

  it("resume apenas o trabalho da vertical sem inventar registros", () => {
    const summary = buildTodoGreenWorkspaceSummary({
      today: "2026-08-13",
      db: {
        tasks: [
          { id: "t1", source: "todogreen-crm", status: "A fazer", due: "2026-08-10" },
          { id: "t2", businessId: "outro", status: "A fazer", due: "2026-08-01" },
        ],
        notes: [{ id: "n1", businessId: "todogreen" }, { id: "n2", businessId: "outro" }],
        documents: [{ id: "d1", businessId: "todogreen" }, { id: "d2", businessId: "outro" }],
        databases: [],
        processes: [{ id: "p1", businessId: "todogreen" }],
        processCases: [{ id: "c1", processId: "p1", status: "review" }],
        workNodes: [],
        resourceProfiles: [],
        boards: [],
      },
      verticalData: {
        clients: [{ id: "cli-1" }],
        opportunities: [
          { id: "op-1", status: "open" },
          { id: "op-2", status: "won" },
        ],
      },
    });

    expect(summary).toMatchObject({
      clients: 1,
      contacts: 0,
      news: 0,
      rfqs: 0,
      openOpportunities: 1,
      openTasks: 1,
      overdueTasks: 1,
      notes: 1,
      pages: 1,
      processes: 1,
      openCases: 1,
      bases: 0,
      boards: 0,
    });
  });

  it("liga uma nota ao registro canônico do CRM", () => {
    const entity = linkedEntityFor("client", { id: "cli 1", name: "Mercado Real" });
    expect(entity).toEqual({
      type: "client",
      id: "cli 1",
      name: "Mercado Real",
      route: "/todogreen/clientes?client=cli%201",
    });
    expect(findLinkedNote([
      { id: "n1", linkedEntities: [{ type: "client", id: "cli 1" }] },
    ], entity)?.id).toBe("n1");
    expect(findLinkedDocument([
      { id: "d1", linkedEntities: [{ type: "client", id: "cli 1" }] },
    ], entity)?.id).toBe("d1");
  });
});
