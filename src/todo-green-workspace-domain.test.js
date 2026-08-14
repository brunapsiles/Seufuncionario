import { describe, expect, it } from "vitest";
import {
  buildTodoGreenWorkspaceSummary,
  findLinkedNote,
  linkedEntityFor,
} from "./features/logistics/todoGreenWorkspaceDomain.js";

describe("espaço de trabalho To Do Green", () => {
  it("resume apenas o trabalho da vertical sem inventar registros", () => {
    const summary = buildTodoGreenWorkspaceSummary({
      today: "2026-08-13",
      db: {
        tasks: [
          { id: "t1", source: "todogreen-crm", status: "A fazer", due: "2026-08-10" },
          { id: "t2", businessId: "outro", status: "A fazer", due: "2026-08-01" },
        ],
        notes: [{ id: "n1", businessId: "todogreen" }, { id: "n2", businessId: "outro" }],
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
      openOpportunities: 1,
      openTasks: 1,
      overdueTasks: 1,
      notes: 1,
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
  });
});
