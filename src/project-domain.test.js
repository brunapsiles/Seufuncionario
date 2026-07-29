import { describe, expect, it } from "vitest";
import {
  createProjectRecord,
  milestoneState,
  projectMetrics,
} from "./features/projects/projectDomain.js";

describe("motor enterprise de projetos", () => {
  it("normaliza o projeto preservando governança e dados financeiros", () => {
    const project = createProjectRecord(
      {
        name: " Implantação ",
        status: "Em andamento",
        priority: "Crítica",
        budgetPlanned: "10000",
        milestones: [{ title: "Go-live", plannedDate: "2026-08-01" }],
      },
      { businessId: "b1", ownerId: "u1" },
    );
    expect(project).toMatchObject({
      name: "Implantação",
      status: "Em andamento",
      priority: "Crítica",
      budgetPlanned: 10000,
      businessId: "b1",
      ownerId: "u1",
    });
    expect(project.milestones[0].title).toBe("Go-live");
  });

  it("deriva conclusão de marco pelas tarefas relacionadas", () => {
    const milestone = { linkedTaskIds: ["t1", "t2"], status: "Pendente" };
    expect(
      milestoneState(milestone, [
        { id: "t1", status: "Concluído" },
        { id: "t2", status: "Concluído" },
      ]),
    ).toMatchObject({ status: "Concluído", completed: true });
  });

  it("calcula progresso, variações e saúde do projeto", () => {
    const project = {
      id: "p1",
      name: "Projeto",
      status: "Em andamento",
      budgetPlanned: 1000,
      costActual: 1200,
      hoursPlanned: 100,
      hoursActual: 80,
      milestones: [
        { title: "Entrega", plannedDate: "2026-06-01", status: "Pendente" },
        { title: "Aceite", actualDate: "2026-05-20", status: "Concluído" },
      ],
      risks: [{ title: "Fornecedor", severity: "Crítica", status: "Aberto" }],
    };
    const result = projectMetrics(
      project,
      [
        { id: "t1", projectId: "p1", status: "Concluído" },
        { id: "t2", projectId: "p1", status: "Em andamento", due: "2026-06-10" },
      ],
      "2026-07-01",
    );
    expect(result).toMatchObject({
      progress: 50,
      health: "Em risco",
      overdueTasks: 1,
      overdueMilestones: 1,
      budgetVariance: -200,
      hoursVariance: 20,
      openRisks: 1,
      criticalGovernance: 1,
    });
  });
});
