import {
  goalsSummary,
  resolveAutoProgress,
} from "../goals/goalsDomain.js";
import { calculateImpact } from "../pricing/pricingImpactDomain.js";
import { processSla } from "../processes/processDomain.js";
import { projectMetrics } from "../projects/projectDomain.js";
import { teamCapacity } from "../resources/capacityDomain.js";

const list = (value) => (Array.isArray(value) ? value : []);
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const dateKey = (value) => String(value || "").slice(0, 10);
const round = (value, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round(number(value) * factor) / factor;
};

export const DASHBOARD_PERIODS = [
  { id: "7", label: "Últimos 7 dias", days: 7 },
  { id: "30", label: "Últimos 30 dias", days: 30 },
  { id: "90", label: "Últimos 90 dias", days: 90 },
  { id: "365", label: "Últimos 12 meses", days: 365 },
  { id: "all", label: "Todo o histórico", days: null },
];

export const DASHBOARD_WIDGETS = [
  {
    id: "revenue",
    title: "Receita",
    description: "Entradas financeiras no período",
    defaultSize: "compact",
  },
  {
    id: "margin",
    title: "Margem",
    description: "Receita menos despesas registradas",
    defaultSize: "compact",
  },
  {
    id: "goals",
    title: "Metas e OKRs",
    description: "Progresso e objetivos que pedem atenção",
    defaultSize: "compact",
  },
  {
    id: "overdueTasks",
    title: "Tarefas atrasadas",
    description: "Pendências vencidas e bloqueadas",
    defaultSize: "compact",
  },
  {
    id: "riskyProjects",
    title: "Projetos em risco",
    description: "Saúde, atraso e governança",
    defaultSize: "compact",
  },
  {
    id: "capacity",
    title: "Capacidade",
    description: "Utilização, disponibilidade e sobrecarga",
    defaultSize: "compact",
  },
  {
    id: "sla",
    title: "SLA",
    description: "Casos no prazo, em risco e atrasados",
    defaultSize: "compact",
  },
  {
    id: "emissions",
    title: "Emissões",
    description: "kgCO₂e por Escopo 1, 2 e 3",
    defaultSize: "compact",
  },
  {
    id: "logistics",
    title: "Operação logística",
    description: "Fretes, entregas e frota",
    defaultSize: "compact",
  },
  {
    id: "revenueTrend",
    title: "Evolução financeira",
    description: "Receitas e despesas ao longo do período",
    defaultSize: "wide",
  },
  {
    id: "attentionTable",
    title: "Fila de atenção",
    description: "Trabalho crítico em uma única tabela",
    defaultSize: "wide",
  },
];

const widgetMap = new Map(DASHBOARD_WIDGETS.map((widget) => [widget.id, widget]));

export const DEFAULT_DASHBOARD_LAYOUT = DASHBOARD_WIDGETS.map((widget) => ({
  id: widget.id,
  size: widget.defaultSize,
}));

export const createDashboardConfig = (
  { ownerId = null, businessId = null, name = "Painel principal" } = {},
  id = crypto.randomUUID(),
  now = new Date().toISOString(),
) => ({
  id,
  name,
  ownerId,
  businessId,
  visibility: "privado",
  layout: DEFAULT_DASHBOARD_LAYOUT.map((item) => ({ ...item })),
  filters: { period: "30", projectId: "all" },
  createdAt: now,
  updatedAt: now,
});

export const normalizeDashboardLayout = (layout) => {
  if (!Array.isArray(layout))
    return DEFAULT_DASHBOARD_LAYOUT.map((item) => ({ ...item }));
  const seen = new Set();
  const normalized = [];
  for (const item of layout) {
    const id = typeof item === "string" ? item : item?.id;
    if (!widgetMap.has(id) || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      size:
        item?.size === "wide" || item?.size === "compact"
          ? item.size
          : widgetMap.get(id).defaultSize,
    });
  }
  return normalized.length
    ? normalized
    : [{ id: DASHBOARD_WIDGETS[0].id, size: "compact" }];
};

export const normalizeDashboardConfig = (config = {}, context = {}) => {
  const now = context.now || new Date().toISOString();
  const period = DASHBOARD_PERIODS.some(
    (item) => item.id === String(config.filters?.period),
  )
    ? String(config.filters.period)
    : "30";
  return {
    ...createDashboardConfig(context, config.id || context.id, now),
    ...config,
    id: config.id || context.id || crypto.randomUUID(),
    name: String(config.name || "Painel principal").trim() || "Painel principal",
    ownerId: config.ownerId || context.ownerId || null,
    businessId: config.businessId || context.businessId || null,
    visibility: "privado",
    layout: normalizeDashboardLayout(config.layout),
    filters: {
      period,
      projectId: config.filters?.projectId || "all",
    },
    updatedAt: config.updatedAt || now,
  };
};

export const toggleDashboardWidget = (layout, widgetId, visible) => {
  const normalized = normalizeDashboardLayout(layout);
  const present = normalized.some((item) => item.id === widgetId);
  if (!widgetMap.has(widgetId)) return normalized;
  if (visible && !present)
    return [
      ...normalized,
      { id: widgetId, size: widgetMap.get(widgetId).defaultSize },
    ];
  if (!visible && present && normalized.length > 1)
    return normalized.filter((item) => item.id !== widgetId);
  return normalized;
};

export const resizeDashboardWidget = (layout, widgetId, size) =>
  normalizeDashboardLayout(layout).map((item) =>
    item.id === widgetId && ["compact", "wide"].includes(size)
      ? { ...item, size }
      : item,
  );

export const moveDashboardWidget = (layout, widgetId, direction) => {
  const normalized = normalizeDashboardLayout(layout);
  const index = normalized.findIndex((item) => item.id === widgetId);
  const target =
    direction === "up"
      ? index - 1
      : direction === "down"
        ? index + 1
        : Number(direction);
  if (
    index < 0 ||
    !Number.isInteger(target) ||
    target < 0 ||
    target >= normalized.length ||
    target === index
  )
    return normalized;
  const next = [...normalized];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
};

export const placeDashboardWidget = (layout, widgetId, beforeWidgetId) => {
  const normalized = normalizeDashboardLayout(layout);
  const from = normalized.findIndex((item) => item.id === widgetId);
  const before = normalized.findIndex((item) => item.id === beforeWidgetId);
  if (from < 0 || before < 0 || from === before) return normalized;
  const next = [...normalized];
  const [moved] = next.splice(from, 1);
  const target = next.findIndex((item) => item.id === beforeWidgetId);
  next.splice(target < 0 ? next.length : target, 0, moved);
  return next;
};

const sameBusiness = (item, businessId) =>
  !businessId || !item?.businessId || item.businessId === businessId;

const sameProject = (item, projectId, projectName = "") =>
  !projectId ||
  projectId === "all" ||
  item?.projectId === projectId ||
  (!item?.projectId && projectName && item?.project === projectName);

const addDays = (ymd, amount) => {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const itemDate = (item) =>
  dateKey(
    item?.date ||
      item?.scheduledDate ||
      item?.occurredAt ||
      item?.createdAt ||
      item?.updatedAt,
  );

const inPeriod = (item, startDate, endDate) => {
  if (!startDate) return true;
  const date = itemDate(item);
  return !!date && date >= startDate && date <= endDate;
};

const bucketLabel = (date, days) => {
  if (days <= 31) return date.slice(5);
  return date.slice(0, 7);
};

const buildFinanceSeries = (transactions, startDate, endDate, days) => {
  const bucket = new Map();
  for (const item of transactions) {
    const date = itemDate(item);
    if (!date) continue;
    const key = days <= 31 ? date : date.slice(0, 7);
    const row = bucket.get(key) || { key, revenue: 0, expense: 0 };
    if (item.type === "Receita") row.revenue += number(item.value);
    else if (item.type === "Despesa") row.expense += number(item.value);
    bucket.set(key, row);
  }
  if (startDate && days <= 31) {
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      if (!bucket.has(date)) bucket.set(date, { key: date, revenue: 0, expense: 0 });
    }
  }
  return [...bucket.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => ({
      ...row,
      label: bucketLabel(row.key, days),
      revenue: round(row.revenue, 2),
      expense: round(row.expense, 2),
    }))
    .slice(-31);
};

export const buildDashboardMetrics = (
  data = {},
  {
    businessId = null,
    period = "30",
    projectId = "all",
    today = new Date().toISOString().slice(0, 10),
    nowMs = Date.now(),
  } = {},
) => {
  const periodOption =
    DASHBOARD_PERIODS.find((item) => item.id === String(period)) ||
    DASHBOARD_PERIODS[1];
  const days = periodOption.days || 3650;
  const startDate = periodOption.days ? addDays(today, -(periodOption.days - 1)) : "";
  const endDate = today;
  const projects = list(data.projects).filter((item) =>
    sameBusiness(item, businessId),
  );
  const selectedProject = projects.find((item) => item.id === projectId);
  const projectName = selectedProject?.name || "";
  const tasks = list(data.tasks).filter(
    (item) =>
      sameBusiness(item, businessId) &&
      sameProject(item, projectId, projectName),
  );
  const transactions = list(data.transactions).filter(
    (item) =>
      sameBusiness(item, businessId) &&
      sameProject(item, projectId, projectName) &&
      inPeriod(item, startDate, endDate),
  );

  const revenue = transactions
    .filter((item) => item.type === "Receita")
    .reduce((sum, item) => sum + number(item.value), 0);
  const expense = transactions
    .filter((item) => item.type === "Despesa")
    .reduce((sum, item) => sum + number(item.value), 0);
  const margin = revenue - expense;
  const marginPercent = revenue ? (margin / revenue) * 100 : 0;

  const overdueTasks = tasks
    .filter(
      (item) =>
        item.status !== "Concluído" &&
        item.status !== "Cancelado" &&
        item.due &&
        dateKey(item.due) < today,
    )
    .sort((a, b) => dateKey(a.due).localeCompare(dateKey(b.due)));
  const blockedTasks = tasks.filter(
    (item) =>
      item.status !== "Concluído" &&
      (item.blocked || item.blockReason || item.status === "Bloqueado"),
  );
  const taskStatus = [
    {
      label: "Concluídas",
      value: tasks.filter((item) => item.status === "Concluído").length,
    },
    {
      label: "Em andamento",
      value: tasks.filter((item) => item.status === "Em andamento").length,
    },
    {
      label: "A fazer",
      value: tasks.filter(
        (item) =>
          !["Concluído", "Em andamento", "Cancelado"].includes(item.status),
      ).length,
    },
  ];

  const projectRows = projects
    .filter((item) => projectId === "all" || item.id === projectId)
    .map((project) => ({
      project,
      metrics: projectMetrics(project, tasks, today),
    }));
  const riskyProjects = projectRows
    .filter(({ metrics }) => ["Em risco", "Bloqueado"].includes(metrics.health))
    .sort(
      (a, b) =>
        b.metrics.overdueTasks +
        b.metrics.criticalGovernance -
        (a.metrics.overdueTasks + a.metrics.criticalGovernance),
    );

  const objectives = list(data.objectives)
    .filter((item) => {
      if (!sameBusiness(item, businessId)) return false;
      if (projectId === "all") return true;
      return (
        sameProject(item, projectId, projectName) ||
        list(item.keyResults).some(
          (result) =>
            result.linkedProject === projectId ||
            (projectName && result.linkedProject === projectName),
        )
      );
    })
    .map((item) => resolveAutoProgress(item, { tasks }));
  const goals = goalsSummary(objectives, today);

  const profiles = list(data.resourceProfiles).filter((item) =>
    sameBusiness(item, businessId),
  );
  const allocations = list(data.resourceAllocations).filter(
    (item) =>
      sameBusiness(item, businessId) &&
      sameProject(item, projectId, projectName),
  );
  const capacity = teamCapacity(profiles, {
    startDate: startDate || addDays(today, -29),
    endDate,
    absences: list(data.resourceAbsences).filter((item) =>
      sameBusiness(item, businessId),
    ),
    allocations,
    timeEntries: list(data.timeEntries).filter(
      (item) =>
        sameBusiness(item, businessId) &&
        sameProject(item, projectId, projectName),
    ),
  });

  const processes = list(data.processes).filter((item) =>
    sameBusiness(item, businessId),
  );
  const processById = new Map(processes.map((item) => [item.id, item]));
  const cases = list(data.processCases).filter(
    (item) =>
      sameBusiness(item, businessId) &&
      sameProject(item, projectId, projectName) &&
      item.status !== "concluido",
  );
  const slaRows = cases
    .map((item) => ({
      item,
      sla: processSla(processById.get(item.processId), item, nowMs),
    }))
    .filter(({ sla }) => sla.status !== "sem_sla");
  const slaDelayed = slaRows.filter(({ sla }) => sla.status === "atrasado").length;
  const slaAtRisk = slaRows.filter(({ sla }) => sla.status === "em_risco").length;
  const slaOnTime = slaRows.filter(({ sla }) => sla.status === "no_prazo").length;
  const slaRate = slaRows.length ? (slaOnTime / slaRows.length) * 100 : 0;

  const factors = list(data.impactFactors).filter((item) =>
    sameBusiness(item, businessId),
  );
  const directImpact = calculateImpact(
    list(data.impactEntries).filter(
      (item) =>
        sameBusiness(item, businessId) &&
        sameProject(item, projectId, projectName) &&
        inPeriod(item, startDate, endDate),
    ),
    factors,
  );
  const scenarios = list(data.pricingScenarios).filter(
    (item) =>
      sameBusiness(item, businessId) &&
      sameProject(item, projectId, projectName) &&
      inPeriod(item, startDate, endDate),
  );
  const emissionsByScope = { ...directImpact.byScope };
  let emissionsTotal = directImpact.totalKgCo2e;
  let weightedConfidence =
    directImpact.totalKgCo2e * number(directImpact.confidence);
  for (const scenario of scenarios) {
    const scenarioTotal = number(
      scenario.impact?.totalKgCo2e ?? scenario.totalKgCo2e,
    );
    emissionsTotal += scenarioTotal;
    weightedConfidence +=
      scenarioTotal * number(scenario.impact?.confidence ?? scenario.confidence);
    const scopes = scenario.impact?.byScope || scenario.byScope || {};
    for (const [scope, value] of Object.entries(scopes))
      emissionsByScope[scope] = number(emissionsByScope[scope]) + number(value);
  }
  const emissionsConfidence = emissionsTotal
    ? weightedConfidence / emissionsTotal
    : 0;

  const trips = list(data.trips).filter(
    (item) =>
      sameBusiness(item, businessId) &&
      sameProject(item, projectId, projectName) &&
      inPeriod(item, startDate, endDate),
  );
  const vehicles = list(data.vehicles).filter((item) =>
    sameBusiness(item, businessId),
  );
  const deliveredTrips = trips.filter((item) => item.status === "Entregue").length;
  const activeTrips = trips.filter((item) =>
    ["Agendado", "Em rota"].includes(item.status),
  ).length;
  const delayedTrips = trips.filter(
    (item) =>
      !["Entregue", "Cancelado"].includes(item.status) &&
      item.scheduledDate &&
      dateKey(item.scheduledDate) < today,
  ).length;
  const freightValue = trips
    .filter((item) => item.status !== "Cancelado")
    .reduce((sum, item) => sum + number(item.freightValue), 0);

  const attention = [
    ...overdueTasks.slice(0, 8).map((item) => ({
      id: `task:${item.id}`,
      type: "Tarefa",
      title: item.title || "Tarefa sem título",
      detail: `Venceu em ${dateKey(item.due)}`,
      severity: "Atrasada",
      link: "operacao",
    })),
    ...riskyProjects.slice(0, 8).map(({ project, metrics }) => ({
      id: `project:${project.id}`,
      type: "Projeto",
      title: project.name || "Projeto sem nome",
      detail: `${metrics.overdueTasks} tarefa(s) atrasada(s)`,
      severity: metrics.health,
      link: "operacao",
    })),
    ...slaRows
      .filter(({ sla }) => sla.status === "atrasado")
      .slice(0, 8)
      .map(({ item }) => ({
        id: `case:${item.id}`,
        type: "SLA",
        title: item.title || item.protocol || "Solicitação",
        detail: "Prazo da etapa ultrapassado",
        severity: "Atrasado",
        link: "processos",
      })),
  ].slice(0, 12);

  return {
    range: { startDate, endDate, label: periodOption.label },
    finance: {
      revenue: round(revenue, 2),
      expense: round(expense, 2),
      margin: round(margin, 2),
      marginPercent: round(marginPercent, 1),
      series: buildFinanceSeries(transactions, startDate, endDate, days),
    },
    tasks: {
      total: tasks.length,
      overdue: overdueTasks.length,
      blocked: blockedTasks.length,
      rows: overdueTasks,
      status: taskStatus,
    },
    projects: {
      total: projectRows.length,
      risky: riskyProjects.length,
      rows: riskyProjects,
    },
    goals,
    capacity: {
      ...capacity,
      conflicts: capacity.rows.filter((item) => item.overloadHours > 0).length,
    },
    sla: {
      total: slaRows.length,
      onTime: slaOnTime,
      atRisk: slaAtRisk,
      delayed: slaDelayed,
      rate: round(slaRate, 1),
    },
    emissions: {
      totalKgCo2e: round(emissionsTotal, 4),
      confidence: round(emissionsConfidence, 1),
      byScope: Object.fromEntries(
        Object.entries(emissionsByScope).map(([scope, value]) => [
          scope,
          round(value, 4),
        ]),
      ),
    },
    logistics: {
      total: trips.length,
      active: activeTrips,
      delivered: deliveredTrips,
      delayed: delayedTrips,
      freightValue: round(freightValue, 2),
      vehicles: vehicles.length,
      availableVehicles: vehicles.filter((item) => item.status === "Ativo").length,
    },
    attention,
  };
};
