import { milestoneState, projectMetrics } from "./projectDomain.js";

const ymd = (value) => String(value || "").slice(0, 10);
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const PLANNER_HORIZONS = ["Mês", "Trimestre", "Semestre", "Ano"];

export const portfolioSummary = (projects = [], tasks = [], today = ymd(new Date().toISOString())) => {
  const rows = projects.map((project) => ({
    project,
    metrics: projectMetrics(project, tasks, today),
  }));

  const plannedBudget = rows.reduce(
    (sum, row) => sum + number(row.project.budgetPlanned),
    0,
  );
  const actualCost = rows.reduce(
    (sum, row) => sum + number(row.project.costActual),
    0,
  );
  const plannedHours = rows.reduce(
    (sum, row) => sum + number(row.project.hoursPlanned),
    0,
  );
  const actualHours = rows.reduce(
    (sum, row) => sum + number(row.project.hoursActual),
    0,
  );

  return {
    projects: rows.length,
    healthy: rows.filter((row) => row.metrics.health === "Saudável").length,
    atRisk: rows.filter((row) => row.metrics.health === "Em risco").length,
    blocked: rows.filter((row) => row.metrics.health === "Bloqueado").length,
    completed: rows.filter((row) => row.metrics.health === "Concluído").length,
    averageProgress: rows.length
      ? Math.round(
          rows.reduce((sum, row) => sum + number(row.metrics.progress), 0) /
            rows.length,
        )
      : 0,
    plannedBudget,
    actualCost,
    budgetVariance: plannedBudget - actualCost,
    plannedHours,
    actualHours,
    hoursVariance: plannedHours - actualHours,
    rows,
  };
};

export const milestoneTimeline = (
  projects = [],
  tasks = [],
  today = ymd(new Date().toISOString()),
) =>
  projects
    .flatMap((project) =>
      (project.milestones || []).map((milestone) => {
        const projectTasks = tasks.filter(
          (task) => task.projectId === project.id || task.project === project.name,
        );
        return {
          id: milestone.id,
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          title: milestone.title,
          type: milestone.type,
          plannedDate: ymd(milestone.plannedDate),
          actualDate: ymd(milestone.actualDate),
          ownerName: milestone.ownerName,
          evidence: milestone.evidence,
          approvedAt: milestone.approvedAt,
          ...milestoneState(milestone, projectTasks, today),
        };
      }),
    )
    .sort((left, right) =>
      String(left.plannedDate || "9999-12-31").localeCompare(
        String(right.plannedDate || "9999-12-31"),
      ),
    );

export const plannerAlerts = (
  projects = [],
  tasks = [],
  today = ymd(new Date().toISOString()),
) => {
  const summary = portfolioSummary(projects, tasks, today);
  const milestones = milestoneTimeline(projects, tasks, today);
  const alerts = [];

  summary.rows.forEach(({ project, metrics }) => {
    if (metrics.health === "Bloqueado") {
      alerts.push({
        severity: "Crítica",
        type: "Projeto bloqueado",
        projectId: project.id,
        title: project.name,
        message: "O projeto possui bloqueios ativos e exige decisão executiva.",
      });
    } else if (metrics.health === "Em risco") {
      alerts.push({
        severity: "Alta",
        type: "Projeto em risco",
        projectId: project.id,
        title: project.name,
        message: "Prazo, custo, horas ou governança estão fora do esperado.",
      });
    }

    if (metrics.budgetVariance < 0) {
      alerts.push({
        severity: "Alta",
        type: "Orçamento excedido",
        projectId: project.id,
        title: project.name,
        message: `Custo excedido em ${Math.abs(metrics.budgetVariance)}.`,
      });
    }
  });

  milestones
    .filter((milestone) => ["Atrasado", "Bloqueado", "Em risco"].includes(milestone.status))
    .forEach((milestone) => {
      alerts.push({
        severity: milestone.status === "Bloqueado" ? "Crítica" : "Alta",
        type: `Marco ${milestone.status.toLowerCase()}`,
        projectId: milestone.projectId,
        milestoneId: milestone.id,
        title: milestone.title,
        message: `${milestone.projectName} · previsto para ${milestone.plannedDate || "data não definida"}.`,
      });
    });

  return alerts.sort((left, right) => {
    const weight = { Crítica: 3, Alta: 2, Média: 1, Baixa: 0 };
    return (weight[right.severity] || 0) - (weight[left.severity] || 0);
  });
};

export const roadmapGroups = (projects = [], groupBy = "status") => {
  const groups = new Map();
  projects.forEach((project) => {
    const key =
      groupBy === "priority"
        ? project.priority || "Sem prioridade"
        : groupBy === "manager"
          ? project.manager || "Sem gerente"
          : project.status || "Sem status";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(project);
  });
  return [...groups.entries()].map(([label, items]) => ({
    label,
    items: items.sort((left, right) =>
      String(left.dueDate || "9999-12-31").localeCompare(
        String(right.dueDate || "9999-12-31"),
      ),
    ),
  }));
};
