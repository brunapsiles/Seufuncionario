import { describe, expect, it } from "vitest";
import {
  buildClientPortalSnapshot,
  clientPortalResourceCount,
  clientPortalSummary,
  normalizeClientPortal,
  validateClientPortalAction,
} from "./clientPortalDomain.js";

const portal = normalizeClientPortal(
  {
    id: "portal-1",
    clientName: "Cliente Alfa",
    appearance: {
      primaryColor: "#112233",
      logoUrl: "http://inseguro.example/logo.png",
    },
    resources: {
      projectIds: ["project-1"],
      taskIds: ["task-avulsa"],
      documentIds: ["doc-1", "doc-2"],
      reportIds: ["doc-2", "fora"],
      quoteIds: ["quote-1"],
      orderIds: ["order-1"],
      tripIds: ["trip-1"],
    },
  },
  {
    ownerId: "owner-1",
    workspaceOwnerId: "owner-1",
    businessId: "business-1",
    now: "2026-07-29T20:00:00.000Z",
  },
);

const workspace = {
  businesses: [{ id: "business-1", name: "Empresa Alfa" }],
  projects: [
    { id: "project-1", name: "Implantação", objective: "Entrar em operação" },
    { id: "project-hidden", name: "Interno", objective: "Segredo" },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Configurar",
      projectId: "project-1",
      project: "Implantação",
      status: "Concluído",
      ownerId: "internal",
      deliveries: [
        {
          id: "delivery-1",
          comment: "Versão entregue",
          dataUrl: "segredo",
          attachments: [
            {
              id: "attachment-1",
              name: "evidencia.pdf",
              type: "application/pdf",
              size: 12,
              dataUrl: "data:application/pdf;base64,AAA=",
            },
          ],
        },
      ],
    },
    {
      id: "task-avulsa",
      title: "Treinamento",
      status: "A fazer",
      description: "Agenda do treinamento",
    },
    { id: "task-hidden", title: "Financeiro interno", status: "A fazer" },
  ],
  documents: [
    { id: "doc-1", title: "Manual", content: "Conteúdo do manual" },
    { id: "doc-2", title: "Relatório", content: "Indicadores do período" },
    { id: "doc-hidden", title: "Contrato interno", content: "Sigiloso" },
  ],
  quotes: [
    {
      id: "quote-1",
      clientName: "Cliente Alfa",
      items: [{ name: "Serviço", quantity: 2, price: 100 }],
    },
  ],
  orders: [
    {
      id: "order-1",
      clientName: "Cliente Alfa",
      status: "Em produção",
      total: 200,
    },
  ],
  trips: [
    {
      id: "trip-1",
      code: "TRP-1",
      origin: "São Paulo",
      destination: "Campinas",
    },
  ],
};

describe("domínio do portal do cliente", () => {
  it("normaliza permissões, recursos e URLs sem aceitar conteúdo inseguro", () => {
    expect(portal).toMatchObject({
      clientName: "Cliente Alfa",
      ownerId: "owner-1",
      workspaceOwnerId: "owner-1",
      businessId: "business-1",
      appearance: { primaryColor: "#112233", logoUrl: "" },
    });
    expect(portal.resources.reportIds).toEqual(["doc-2"]);
    expect(clientPortalResourceCount(portal)).toBe(8);
  });

  it("expõe somente registros explicitamente escolhidos e tarefas do projeto", () => {
    const snapshot = buildClientPortalSnapshot(workspace, portal);
    expect(snapshot.business.name).toBe("Empresa Alfa");
    expect(snapshot.projects.map((item) => item.id)).toEqual(["project-1"]);
    expect(snapshot.projects[0]).toMatchObject({
      progress: 100,
      taskCount: 1,
      completedTasks: 1,
    });
    expect(snapshot.tasks.map((item) => item.id).sort()).toEqual([
      "task-1",
      "task-avulsa",
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("task-hidden");
    expect(JSON.stringify(snapshot)).not.toContain("doc-hidden");
    expect(JSON.stringify(snapshot)).not.toContain("ownerId");
    expect(snapshot.tasks[0].deliveries[0].attachments[0]).not.toHaveProperty(
      "dataUrl",
    );
  });

  it("marca para download apenas relatórios selecionados", () => {
    const snapshot = buildClientPortalSnapshot(workspace, portal);
    expect(snapshot.documents).toEqual([
      expect.objectContaining({ id: "doc-1", downloadable: false }),
      expect.objectContaining({ id: "doc-2", downloadable: true }),
    ]);
  });

  it("resume pendências sem contar dados ocultos", () => {
    const snapshot = buildClientPortalSnapshot(workspace, portal);
    expect(clientPortalSummary(snapshot)).toEqual({
      projects: 1,
      openTasks: 1,
      pendingDeliveries: 1,
      documents: 2,
      quotes: 1,
      orders: 1,
      tracking: 1,
    });
  });

  it("valida chamados, uploads e decisões somente dentro das permissões", () => {
    const snapshot = buildClientPortalSnapshot(workspace, portal);
    expect(
      validateClientPortalAction(
        {
          type: "delivery",
          taskId: "task-1",
          deliveryId: "delivery-1",
          decision: "approved",
        },
        snapshot,
      ).valid,
    ).toBe(true);
    expect(
      validateClientPortalAction(
        {
          type: "delivery",
          taskId: "task-hidden",
          deliveryId: "delivery-hidden",
          decision: "approved",
        },
        snapshot,
      ).valid,
    ).toBe(false);
    expect(
      validateClientPortalAction(
        { type: "ticket", title: "", description: "" },
        snapshot,
      ).valid,
    ).toBe(false);
  });
});
