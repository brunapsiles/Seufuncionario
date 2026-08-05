const asText = (value) => String(value || "").trim();
const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export const TODO_GREEN_ACCOUNT_TIERS = [
  "Estratégica",
  "Enterprise",
  "Grande conta",
  "Média conta",
  "Parceiro",
];

export const TODO_GREEN_RELATIONSHIP_ROLES = [
  "Decisor econômico",
  "Decisor técnico",
  "Patrocinador",
  "Influenciador",
  "Usuário",
  "Compras",
  "Jurídico",
  "Financeiro",
  "Operações",
  "Sustentabilidade",
  "Bloqueador",
];

export const TODO_GREEN_ACCOUNT_STAGES = [
  "Mapeamento",
  "Prospecção",
  "Diagnóstico",
  "Construção de solução",
  "Proposta",
  "Negociação",
  "Implantação",
  "Cliente ativo",
  "Expansão",
  "Risco",
  "Inativo",
];

export const TODO_GREEN_QUALIFICATION_FIELDS = Object.freeze([
  { key: "currentModel", label: "Modelo logístico atual", type: "textarea" },
  { key: "currentSuppliers", label: "Fornecedores atuais", type: "textarea" },
  { key: "monthlyVolume", label: "Volume mensal", type: "number" },
  { key: "monthlyTrips", label: "Viagens mensais", type: "number" },
  { key: "mainRoutes", label: "Rotas prioritárias", type: "textarea" },
  { key: "vehicleProfile", label: "Perfil de veículos", type: "textarea" },
  { key: "slaRequirements", label: "SLA e janelas", type: "textarea" },
  { key: "painPoints", label: "Dores logísticas", type: "textarea" },
  { key: "procurementModel", label: "Modelo de contratação", type: "textarea" },
  { key: "contractRenewalDate", label: "Renovação contratual", type: "date" },
  { key: "budgetCycle", label: "Ciclo orçamentário", type: "textarea" },
  { key: "customerTarget", label: "Target do cliente", type: "number" },
  { key: "esgMaturity", label: "Maturidade ESG", type: "select" },
  { key: "scope3Pressure", label: "Pressão sobre Escopo 3", type: "select" },
  { key: "electrificationTarget", label: "Meta de eletrificação", type: "textarea" },
  { key: "decisionCriteria", label: "Critérios de decisão", type: "textarea" },
  { key: "knownRisks", label: "Riscos conhecidos", type: "textarea" },
]);

export const createTodoGreenAccount = (input = {}) => ({
  id: input.id || crypto.randomUUID(),
  legalName: asText(input.legalName),
  tradeName: asText(input.tradeName),
  document: asText(input.document),
  segment: asText(input.segment),
  tier: TODO_GREEN_ACCOUNT_TIERS.includes(input.tier) ? input.tier : "Enterprise",
  stage: TODO_GREEN_ACCOUNT_STAGES.includes(input.stage) ? input.stage : "Mapeamento",
  ownerId: asText(input.ownerId),
  teamIds: Array.isArray(input.teamIds) ? [...new Set(input.teamIds.filter(Boolean))] : [],
  headquarters: asText(input.headquarters),
  sites: Array.isArray(input.sites) ? input.sites : [],
  contacts: Array.isArray(input.contacts) ? input.contacts : [],
  qualification: input.qualification && typeof input.qualification === "object" ? input.qualification : {},
  strategicPotential: clamp(asNumber(input.strategicPotential)),
  relationshipStrength: clamp(asNumber(input.relationshipStrength)),
  operationalFit: clamp(asNumber(input.operationalFit)),
  esgFit: clamp(asNumber(input.esgFit)),
  dataQuality: clamp(asNumber(input.dataQuality)),
  churnRisk: clamp(asNumber(input.churnRisk)),
  nextAction: asText(input.nextAction),
  nextActionAt: asText(input.nextActionAt),
  lastInteractionAt: asText(input.lastInteractionAt),
  source: asText(input.source),
  tags: Array.isArray(input.tags) ? [...new Set(input.tags.map(asText).filter(Boolean))] : [],
  createdAt: input.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createTodoGreenContact = (input = {}) => ({
  id: input.id || crypto.randomUUID(),
  accountId: asText(input.accountId),
  name: asText(input.name),
  title: asText(input.title),
  department: asText(input.department),
  email: asText(input.email).toLowerCase(),
  phone: asText(input.phone),
  linkedin: asText(input.linkedin),
  relationshipRole: TODO_GREEN_RELATIONSHIP_ROLES.includes(input.relationshipRole)
    ? input.relationshipRole
    : "Influenciador",
  influence: clamp(asNumber(input.influence)),
  supportLevel: clamp(asNumber(input.supportLevel), -100, 100),
  accessLevel: clamp(asNumber(input.accessLevel)),
  preferredChannel: asText(input.preferredChannel),
  personalNotes: asText(input.personalNotes),
  objections: asText(input.objections),
  priorities: asText(input.priorities),
  lastInteractionAt: asText(input.lastInteractionAt),
  nextAction: asText(input.nextAction),
  nextActionAt: asText(input.nextActionAt),
  active: input.active !== false,
  createdAt: input.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const calculateAccountScore = (account = {}) => {
  const strategic = clamp(asNumber(account.strategicPotential));
  const relationship = clamp(asNumber(account.relationshipStrength));
  const operational = clamp(asNumber(account.operationalFit));
  const esg = clamp(asNumber(account.esgFit));
  const quality = clamp(asNumber(account.dataQuality));
  const risk = clamp(asNumber(account.churnRisk));
  const score = clamp(
    strategic * 0.25 +
      relationship * 0.2 +
      operational * 0.2 +
      esg * 0.15 +
      quality * 0.1 +
      (100 - risk) * 0.1,
  );
  return Math.round(score);
};

export const calculateRelationshipCoverage = (contacts = []) => {
  const active = contacts.filter((contact) => contact.active !== false);
  const roles = new Set(active.map((contact) => contact.relationshipRole));
  const criticalRoles = [
    "Decisor econômico",
    "Decisor técnico",
    "Patrocinador",
    "Compras",
    "Operações",
    "Sustentabilidade",
  ];
  const covered = criticalRoles.filter((role) => roles.has(role));
  const blockers = active.filter((contact) => contact.relationshipRole === "Bloqueador").length;
  return {
    score: Math.round((covered.length / criticalRoles.length) * 100),
    covered,
    missing: criticalRoles.filter((role) => !roles.has(role)),
    blockers,
    totalContacts: active.length,
  };
};

export const accountHealth = (account = {}, contacts = [], opportunities = []) => {
  const accountScore = calculateAccountScore(account);
  const coverage = calculateRelationshipCoverage(contacts);
  const openOpportunities = opportunities.filter(
    (opportunity) => opportunity.accountId === account.id && !["Ganho", "Perdido"].includes(opportunity.stage),
  );
  const pipeline = openOpportunities.reduce((sum, item) => sum + asNumber(item.value), 0);
  const weightedPipeline = openOpportunities.reduce(
    (sum, item) => sum + asNumber(item.value) * clamp(asNumber(item.probability)) / 100,
    0,
  );
  const overdue = account.nextActionAt
    ? new Date(account.nextActionAt).getTime() < Date.now()
    : false;
  const alerts = [];
  if (coverage.score < 50) alerts.push("Mapa de decisores incompleto");
  if (!account.nextAction) alerts.push("Sem próxima ação definida");
  if (overdue) alerts.push("Próxima ação atrasada");
  if (asNumber(account.dataQuality) < 60) alerts.push("Dados insuficientes para decisão");
  if (asNumber(account.churnRisk) >= 60) alerts.push("Risco comercial elevado");
  if (!openOpportunities.length && ["Cliente ativo", "Expansão"].includes(account.stage))
    alerts.push("Sem oportunidade de expansão registrada");
  return {
    score: Math.round(accountScore * 0.7 + coverage.score * 0.3),
    accountScore,
    relationshipCoverage: coverage,
    pipeline,
    weightedPipeline,
    openOpportunities: openOpportunities.length,
    overdue,
    alerts,
  };
};

export const recommendNextCommercialAction = ({ account = {}, contacts = [], opportunities = [] } = {}) => {
  const health = accountHealth(account, contacts, opportunities);
  if (!account.nextAction) return "Definir próxima ação, responsável e data.";
  if (health.overdue) return `Executar ação atrasada: ${account.nextAction}`;
  if (health.relationshipCoverage.missing.includes("Decisor econômico"))
    return "Mapear e acessar o decisor econômico.";
  if (health.relationshipCoverage.missing.includes("Patrocinador"))
    return "Construir patrocinador interno para sustentar a oportunidade.";
  if (asNumber(account.dataQuality) < 60)
    return "Concluir diagnóstico logístico antes de precificar.";
  if (asNumber(account.esgFit) >= 70 && !account.qualification?.electrificationTarget)
    return "Validar metas de eletrificação e Escopo 3 do cliente.";
  if (!health.openOpportunities && ["Cliente ativo", "Expansão"].includes(account.stage))
    return "Abrir oportunidade de expansão por rota, região ou produto.";
  return account.nextAction;
};

export const crmAccountSummary = (account = {}, contacts = [], opportunities = []) => {
  const health = accountHealth(account, contacts, opportunities);
  return {
    id: account.id,
    name: account.tradeName || account.legalName || "Conta sem nome",
    tier: account.tier,
    stage: account.stage,
    ownerId: account.ownerId,
    score: health.score,
    pipeline: health.pipeline,
    weightedPipeline: health.weightedPipeline,
    contacts: health.relationshipCoverage.totalContacts,
    coverage: health.relationshipCoverage.score,
    alerts: health.alerts,
    nextAction: recommendNextCommercialAction({ account, contacts, opportunities }),
  };
};
