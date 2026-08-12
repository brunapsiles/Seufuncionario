import { describe, expect, it } from "vitest";
import {
  accountHealth,
  calculateAccountScore,
  calculateRelationshipCoverage,
  buildCrmCommandCenter,
  buildAccountIntelligence,
  createTodoGreenAccount,
  createTodoGreenContact,
  crmAccountSummary,
  recommendNextCommercialAction,
  TODO_GREEN_RELATIONSHIP_ROLES,
} from "./todoGreenCrmDomain.js";

describe("To Do Green enterprise CRM", () => {
  it("normalizes an enterprise account without inventing commercial data", () => {
    const account = createTodoGreenAccount({
      legalName: "  Cliente Logística S.A. ",
      tier: "Enterprise",
      temperature: "Morno",
      strategicPotential: 82,
      relationshipStrength: 65,
      operationalFit: 90,
      esgFit: 88,
      dataQuality: 75,
      churnRisk: 20,
    });
    expect(account.legalName).toBe("Cliente Logística S.A.");
    expect(account.tier).toBe("Enterprise");
    expect(account.temperature).toBe("Morno");
    expect(account.contacts).toEqual([]);
    expect(calculateAccountScore(account)).toBeGreaterThanOrEqual(75);
  });

  it("maps multiple stakeholders and identifies missing decision roles", () => {
    const contacts = [
      createTodoGreenContact({ name: "Ana", relationshipRole: "Patrocinador" }),
      createTodoGreenContact({ name: "João", relationshipRole: "Operações" }),
      createTodoGreenContact({ name: "Paula", relationshipRole: "Sustentabilidade" }),
    ];
    const coverage = calculateRelationshipCoverage(contacts);
    expect(coverage.totalContacts).toBe(3);
    expect(coverage.covered).toContain("Patrocinador");
    expect(coverage.missing).toContain("Decisor econômico");
    expect(coverage.score).toBe(50);
  });

  it("calculates account health with pipeline and operational alerts", () => {
    const account = createTodoGreenAccount({
      id: "account-1",
      tradeName: "Conta Estratégica",
      stage: "Diagnóstico",
      strategicPotential: 90,
      relationshipStrength: 60,
      operationalFit: 85,
      esgFit: 80,
      dataQuality: 45,
      churnRisk: 15,
      nextAction: "Validar rotas",
      nextActionAt: "2020-01-01",
    });
    const contacts = [
      createTodoGreenContact({ accountId: account.id, relationshipRole: "Patrocinador" }),
    ];
    const opportunities = [
      { accountId: account.id, stage: "Diagnóstico", value: 1_000_000, probability: 40 },
    ];
    const health = accountHealth(account, contacts, opportunities);
    expect(health.pipeline).toBe(1_000_000);
    expect(health.weightedPipeline).toBe(400_000);
    expect(health.alerts).toContain("Dados insuficientes para decisão");
    expect(health.alerts).toContain("Próxima ação atrasada");
  });

  it("recommends the next best commercial action from account gaps", () => {
    const account = createTodoGreenAccount({
      id: "account-2",
      nextAction: "Preparar proposta",
      nextActionAt: "2999-01-01",
      dataQuality: 90,
      esgFit: 90,
    });
    const recommendation = recommendNextCommercialAction({
      account,
      contacts: [createTodoGreenContact({ relationshipRole: "Patrocinador" })],
      opportunities: [],
    });
    expect(recommendation).toBe("Mapear e acessar o decisor econômico.");
  });

  it("produces an executive account summary", () => {
    const account = createTodoGreenAccount({
      id: "account-3",
      tradeName: "Cliente A",
      tier: "Estratégica",
      stage: "Proposta",
      strategicPotential: 95,
      relationshipStrength: 80,
      operationalFit: 90,
      esgFit: 85,
      dataQuality: 85,
      churnRisk: 10,
      nextAction: "Reunião de negociação",
      nextActionAt: "2999-01-01",
    });
    const contacts = [
      createTodoGreenContact({ relationshipRole: "Decisor econômico" }),
      createTodoGreenContact({ relationshipRole: "Decisor técnico" }),
      createTodoGreenContact({ relationshipRole: "Patrocinador" }),
      createTodoGreenContact({ relationshipRole: "Compras" }),
      createTodoGreenContact({ relationshipRole: "Operações" }),
      createTodoGreenContact({ relationshipRole: "Sustentabilidade" }),
    ];
    const summary = crmAccountSummary(account, contacts, [
      { accountId: account.id, stage: "Proposta", value: 2_000_000, probability: 60 },
    ]);
    expect(summary.name).toBe("Cliente A");
    expect(summary.coverage).toBe(100);
    expect(summary.weightedPipeline).toBe(1_200_000);
    expect(summary.score).toBeGreaterThanOrEqual(80);
  });

  it("builds a command center ordered by commercial attention", () => {
    const healthy = createTodoGreenAccount({
      id: "healthy",
      tradeName: "Conta saudável",
      nextAction: "Reunião",
      nextActionAt: "2999-01-01",
      strategicPotential: 90,
      relationshipStrength: 90,
      operationalFit: 90,
      esgFit: 90,
      dataQuality: 90,
      contacts: TODO_GREEN_RELATIONSHIP_ROLES.slice(0, 6).map((relationshipRole) =>
        createTodoGreenContact({ relationshipRole }),
      ),
    });
    const critical = createTodoGreenAccount({
      id: "critical",
      tradeName: "Conta atrasada",
      nextAction: "Retomar contato",
      nextActionAt: "2020-01-01",
    });
    const result = buildCrmCommandCenter([healthy, critical], [
      { clientId: "healthy", estagio: "Proposta", value: 1000, probability: 50 },
      { clientId: "critical", estagio: "Fechada ganha", value: 9000, probability: 100 },
    ], new Date("2026-08-10"));
    expect(result.totalAccounts).toBe(2);
    expect(result.openOpportunities).toBe(1);
    expect(result.overdueActions).toBe(1);
    expect(result.accounts[0].name).toBe("Conta atrasada");
  });

  it("builds an account plan, relationship map, white space and objective health alerts", () => {
    const account = createTodoGreenAccount({
      id: "account-strategy",
      potentialAnnual: 3_000_000,
      productPotential: { middleMile: 1_200_000, lastMile: 900_000 },
      geographicExpansion: "Sul e Sudeste",
      lastInteractionAt: "2026-06-01T00:00:00.000Z",
      contractRenewalDate: "2026-09-15",
      accountPlan: { objective: "Abrir operação dedicada", plan30: "Validar malha" },
    });
    const result = buildAccountIntelligence({
      account,
      contacts: [
        createTodoGreenContact({ name: "Ana Compras", relationshipRole: "Compras" }),
        createTodoGreenContact({ name: "Bruno Operação", relationshipRole: "Operações" }),
      ],
      opportunities: [{ accountId: account.id, productId: "middle-mile", stage: "Proposta", updatedAt: "2026-07-01" }],
      now: new Date("2026-08-12T00:00:00.000Z"),
    });
    expect(result.potential.annual).toBe(3_000_000);
    expect(result.relationshipMap.buyers).toEqual(["Ana Compras"]);
    expect(result.relationshipMap.users).toEqual(["Bruno Operação"]);
    expect(result.whiteSpace).toEqual(["Last mile", "Operação dedicada"]);
    expect(result.commercialHealth).toContain("Sem contato há 72 dias");
    expect(result.commercialHealth).toContain("Proposta parada há pelo menos 21 dias");
    expect(result.accountPlan.objective).toBe("Abrir operação dedicada");
  });
});
