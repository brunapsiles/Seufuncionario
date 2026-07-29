import { describe, expect, it } from "vitest";
import {
  buildDashboardMetrics,
  createDashboardConfig,
  DASHBOARD_WIDGETS,
  moveDashboardWidget,
  normalizeDashboardConfig,
  normalizeDashboardLayout,
  placeDashboardWidget,
  resizeDashboardWidget,
  toggleDashboardWidget,
} from "./dashboardDomain.js";

describe("configuração de dashboards", () => {
  it("cria um painel privado com todos os indicadores disponíveis", () => {
    const panel = createDashboardConfig(
      { ownerId: "u1", businessId: "b1" },
      "panel-1",
      "2026-07-29T12:00:00.000Z",
    );
    expect(panel.id).toBe("panel-1");
    expect(panel.visibility).toBe("privado");
    expect(panel.layout).toHaveLength(DASHBOARD_WIDGETS.length);
    expect(panel.filters).toEqual({ period: "30", projectId: "all" });
  });

  it("normaliza widgets desconhecidos, repetidos e tamanhos inválidos", () => {
    expect(
      normalizeDashboardLayout([
        { id: "revenue", size: "gigante" },
        { id: "revenue", size: "wide" },
        { id: "nao-existe" },
        { id: "margin", size: "wide" },
      ]),
    ).toEqual([
      { id: "revenue", size: "compact" },
      { id: "margin", size: "wide" },
    ]);
  });

  it("adiciona, remove, redimensiona e preserva ao menos um card", () => {
    let layout = [{ id: "revenue", size: "compact" }];
    layout = toggleDashboardWidget(layout, "margin", true);
    expect(layout.map((item) => item.id)).toEqual(["revenue", "margin"]);
    layout = resizeDashboardWidget(layout, "margin", "wide");
    expect(layout[1].size).toBe("wide");
    layout = toggleDashboardWidget(layout, "revenue", false);
    expect(layout.map((item) => item.id)).toEqual(["margin"]);
    expect(toggleDashboardWidget(layout, "margin", false)).toEqual(layout);
  });

  it("reposiciona cards por setas e por arrastar", () => {
    const layout = [
      { id: "revenue", size: "compact" },
      { id: "margin", size: "compact" },
      { id: "goals", size: "compact" },
    ];
    expect(moveDashboardWidget(layout, "margin", "up").map((item) => item.id)).toEqual([
      "margin",
      "revenue",
      "goals",
    ]);
    expect(
      placeDashboardWidget(layout, "goals", "revenue").map((item) => item.id),
    ).toEqual(["goals", "revenue", "margin"]);
  });

  it("corrige filtros inválidos e mantém o contexto do usuário", () => {
    const panel = normalizeDashboardConfig(
      {
        id: "panel-1",
        name: " ",
        filters: { period: "999", projectId: "p1" },
        layout: [{ id: "goals", size: "compact" }],
      },
      { ownerId: "u1", businessId: "b1", now: "2026-07-29T12:00:00.000Z" },
    );
    expect(panel.name).toBe("Painel principal");
    expect(panel.ownerId).toBe("u1");
    expect(panel.businessId).toBe("b1");
    expect(panel.filters).toEqual({ period: "30", projectId: "p1" });
  });
});

describe("indicadores consolidados do dashboard", () => {
  const nowMs = Date.parse("2026-07-29T12:00:00.000Z");
  const base = {
    transactions: [
      {
        id: "tx1",
        type: "Receita",
        value: 1000,
        date: "2026-07-20",
        businessId: "b1",
        projectId: "p1",
      },
      {
        id: "tx2",
        type: "Despesa",
        value: 250,
        date: "2026-07-21",
        businessId: "b1",
        projectId: "p1",
      },
      {
        id: "tx-old",
        type: "Receita",
        value: 5000,
        date: "2026-05-01",
        businessId: "b1",
        projectId: "p1",
      },
      {
        id: "tx-other",
        type: "Receita",
        value: 9000,
        date: "2026-07-20",
        businessId: "b2",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Implantação",
        businessId: "b1",
        status: "Em andamento",
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Entrega crítica",
        status: "A fazer",
        due: "2026-07-10",
        projectId: "p1",
        businessId: "b1",
      },
      {
        id: "t2",
        title: "Concluída",
        status: "Concluído",
        due: "2026-07-11",
        projectId: "p1",
        businessId: "b1",
      },
    ],
    objectives: [
      {
        id: "o1",
        businessId: "b1",
        projectId: "p1",
        cycle: "mensal",
        reference: "2026-07-01",
        keyResults: [
          { id: "kr1", type: "percentual", current: 50, weight: 1 },
        ],
      },
    ],
    resourceProfiles: [
      {
        id: "r1",
        name: "Ana",
        businessId: "b1",
        active: true,
        weeklyHours: 40,
        workdays: [1, 2, 3, 4, 5],
        hourlyCost: 50,
        hourlyRevenue: 100,
      },
    ],
    resourceAllocations: [
      {
        id: "a1",
        resourceId: "r1",
        projectId: "p1",
        businessId: "b1",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        weeklyHours: 20,
        billable: true,
      },
    ],
    resourceAbsences: [],
    timeEntries: [],
    processes: [
      {
        id: "proc1",
        businessId: "b1",
        stages: [{ id: "s1", name: "Atendimento", slaHours: 24 }],
      },
    ],
    processCases: [
      {
        id: "case1",
        processId: "proc1",
        stageId: "s1",
        title: "Chamado sem resposta",
        status: "ativo",
        businessId: "b1",
        projectId: "p1",
        stageEnteredAt: "2026-07-27T12:00:00.000Z",
      },
    ],
    impactFactors: [
      {
        id: "f1",
        businessId: "b1",
        kgCo2ePerUnit: 2,
        scope: "Escopo 1",
        source: "Fonte interna",
      },
    ],
    impactEntries: [
      {
        id: "i1",
        factorId: "f1",
        quantity: 10,
        dataQuality: "medido",
        businessId: "b1",
        projectId: "p1",
        createdAt: "2026-07-22T12:00:00.000Z",
      },
    ],
    pricingScenarios: [],
    vehicles: [
      { id: "v1", status: "Ativo", businessId: "b1" },
      { id: "v2", status: "Manutenção", businessId: "b1" },
    ],
    trips: [
      {
        id: "trip1",
        status: "Em rota",
        scheduledDate: "2026-07-28",
        freightValue: 500,
        businessId: "b1",
        projectId: "p1",
      },
      {
        id: "trip2",
        status: "Entregue",
        scheduledDate: "2026-07-20",
        freightValue: 300,
        businessId: "b1",
        projectId: "p1",
      },
    ],
  };

  it("calcula receita, despesa, margem e série respeitando o período", () => {
    const result = buildDashboardMetrics(base, {
      businessId: "b1",
      projectId: "p1",
      period: "30",
      today: "2026-07-29",
      nowMs,
    });
    expect(result.finance).toMatchObject({
      revenue: 1000,
      expense: 250,
      margin: 750,
      marginPercent: 75,
    });
    expect(result.finance.series).toHaveLength(30);
  });

  it("consolida tarefas, projetos e metas com o mesmo filtro", () => {
    const result = buildDashboardMetrics(base, {
      businessId: "b1",
      projectId: "p1",
      today: "2026-07-29",
      nowMs,
    });
    expect(result.tasks.overdue).toBe(1);
    expect(result.projects.risky).toBe(1);
    expect(result.goals.total).toBe(1);
    expect(result.goals.progressoMedio).toBe(0.5);
    expect(result.attention.map((item) => item.type)).toEqual(
      expect.arrayContaining(["Tarefa", "Projeto", "SLA"]),
    );
  });

  it("reúne capacidade, SLA, emissões e logística", () => {
    const result = buildDashboardMetrics(base, {
      businessId: "b1",
      projectId: "p1",
      today: "2026-07-29",
      nowMs,
    });
    expect(result.capacity.totals.availableHours).toBeGreaterThan(0);
    expect(result.capacity.totals.plannedHours).toBeGreaterThan(0);
    expect(result.sla).toMatchObject({ total: 1, delayed: 1, rate: 0 });
    expect(result.emissions.totalKgCo2e).toBe(20);
    expect(result.emissions.byScope["Escopo 1"]).toBe(20);
    expect(result.logistics).toMatchObject({
      total: 2,
      active: 1,
      delivered: 1,
      delayed: 1,
      freightValue: 800,
      vehicles: 2,
      availableVehicles: 1,
    });
  });

  it("isola empresa, projeto e intervalo selecionados", () => {
    const result = buildDashboardMetrics(base, {
      businessId: "b1",
      projectId: "nao-existe",
      period: "7",
      today: "2026-07-29",
      nowMs,
    });
    expect(result.finance.revenue).toBe(0);
    expect(result.tasks.total).toBe(0);
    expect(result.logistics.total).toBe(0);
  });
});
