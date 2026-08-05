const n = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value) => String(value || "").trim();

export const roundMoney = (value, decimals = 2) => {
  const scale = 10 ** decimals;
  return Math.round((n(value) + Number.EPSILON) * scale) / scale;
};

export const TODO_GREEN_TENANT = {
  id: "todogreen",
  slug: "todogreen",
  name: "To Do Green",
  segment: "logistica-sustentavel",
  route: "/todogreen",
  status: "active",
  theme: {
    primary: "#17624f",
    primary2: "#34b78f",
    surface: "#f5f8f4",
    ink: "#10241f",
    graphite: "#23342f",
  },
};

export const TODO_GREEN_ROLES = [
  "owner",
  "admin",
  "lideranca_comercial",
  "vendedor",
  "pricing",
  "financeiro",
  "operacoes",
  "sustentabilidade",
  "auditor",
];

export const TODO_GREEN_PERMISSIONS = {
  owner: ["*"],
  admin: ["*"],
  lideranca_comercial: ["read", "deal:approve", "pricing:simulate"],
  vendedor: ["read", "pricing:simulate", "proposal:create"],
  pricing: ["read", "pricing:manage", "deal:review"],
  financeiro: ["read", "cost:manage", "revenue:manage", "commission:manage"],
  operacoes: ["read", "operation:manage", "deal:review"],
  sustentabilidade: ["read", "esg:manage", "deal:review"],
  auditor: ["read", "audit:read", "export:read"],
};

export const hasTodoGreenPermission = (role, permission) => {
  const grants = TODO_GREEN_PERMISSIONS[role] || [];
  return grants.includes("*") || grants.includes(permission) || grants.includes("read");
};

export const TODO_GREEN_MODULE_AREAS = [
  {
    id: "esg",
    name: "Inteligência ESG",
    description: "Impacto ambiental, Green Score, Escopo 3, relatórios e evidências.",
  },
  {
    id: "comercial",
    name: "Comercial",
    description: "Clientes, oportunidades, propostas, pricing, deal desk e benchmark.",
  },
  {
    id: "financeiro",
    name: "Financeiro",
    description: "Receita, custos, margem, forecast, faturamento e remuneração variável.",
  },
  {
    id: "operacional",
    name: "Operacional",
    description: "Produtos logísticos, rotas, viagens, veículos, entregas e produtividade.",
  },
  {
    id: "gestao",
    name: "Gestão",
    description: "Tarefas, documentos, aprovações, inbox, auditoria, usuários e permissões.",
  },
];

const module = (id, name, area, route, config = {}) => ({
  id,
  name,
  area,
  route,
  status: "active",
  version: "1.0.0",
  order: config.order || 100,
  category: config.category || area,
  icon: config.icon || "Boxes",
  description: config.description || "",
  beta: !!config.beta,
  dependencies: config.dependencies || [],
  permissions: config.permissions || ["read"],
  availability: config.availability || "tenant",
  exclusiveTenant: config.exclusiveTenant || "todogreen",
  settings: config.settings || {},
});

export const TODO_GREEN_MODULE_CATALOG = [
  module("dashboard-esg", "Dashboard ESG", "esg", "/todogreen/esg", {
    icon: "Leaf",
    order: 1,
    description: "Indicadores mensais e anuais de impacto por cliente, contrato e operação.",
    permissions: ["read", "esg:manage"],
  }),
  module("green-score", "Green Score", "esg", "/todogreen/green-score", {
    icon: "Gauge",
    order: 2,
    description: "Nota proprietária de 0 a 100 com pesos versionados.",
  }),
  module("calculadora-ambiental", "Calculadora Ambiental", "esg", "/todogreen/calculadora-ambiental", {
    icon: "Calculator",
    order: 3,
    description: "Simule CO2 evitado, diesel não consumido e equivalências ambientais.",
  }),
  module("tradutor-esg", "Tradutor ESG", "esg", "/todogreen/tradutor-esg", {
    icon: "Languages",
    order: 4,
    description: "Converte números ambientais em textos auditáveis para propostas e relatórios.",
  }),
  module("escopo-3", "Escopo 3", "esg", "/todogreen/escopo-3", {
    icon: "Network",
    order: 5,
    description: "Memória de cálculo para apoiar inventários e governança da cadeia logística.",
  }),
  module("relatorios-esg", "Relatórios ESG", "esg", "/todogreen/relatorios", {
    icon: "FileText",
    order: 6,
    description: "Relatórios executivos, auditoria, memória de cálculo e exportações.",
  }),
  module("metodologia", "Metodologia", "esg", "/todogreen/metodologia", {
    icon: "BookOpen",
    order: 7,
    description: "Fatores, fontes, premissas e versões de metodologia ambiental.",
  }),
  module("cofre-evidencias", "Cofre de Evidências", "esg", "/todogreen/auditoria", {
    icon: "Archive",
    order: 8,
    description: "Documentos, fatores, comprovantes, aprovações e histórico de evidências.",
  }),
  module("certificados", "Certificados e declarações", "esg", "/todogreen/relatorios", {
    icon: "Award",
    order: 9,
    description: "Declarações comerciais e materiais de apoio, sem tratar estimativa como certificação oficial.",
  }),
  module("clientes", "Clientes", "comercial", "/todogreen/clientes", { icon: "Users", order: 10 }),
  module("contatos", "Contatos", "comercial", "/todogreen/clientes", { icon: "Handshake", order: 11 }),
  module("oportunidades", "Oportunidades", "comercial", "/todogreen/oportunidades", { icon: "TrendingUp", order: 12 }),
  module("pipeline", "Pipeline", "comercial", "/todogreen/oportunidades", { icon: "GitBranch", order: 13 }),
  module("propostas", "Propostas", "comercial", "/todogreen/propostas", { icon: "FileText", order: 14 }),
  module("contratos", "Contratos", "comercial", "/todogreen/propostas", { icon: "FileCheck", order: 15 }),
  module("simulacoes", "Simulações", "comercial", "/todogreen/precificacao", { icon: "SlidersHorizontal", order: 16 }),
  module("precificacao", "Precificação", "comercial", "/todogreen/precificacao", {
    icon: "Calculator",
    order: 17,
    permissions: ["read", "pricing:simulate", "pricing:manage"],
  }),
  module("deal-desk", "Deal Desk", "comercial", "/todogreen/precificacao", {
    icon: "ShieldCheck",
    order: 18,
    permissions: ["read", "deal:approve", "deal:review"],
  }),
  module("metas", "Metas", "comercial", "/todogreen/dashboard", { icon: "Target", order: 19 }),
  module("remuneracao", "Remuneração Variável", "comercial", "/todogreen/comissoes", {
    icon: "WalletCards",
    order: 20,
    permissions: ["read", "commission:manage"],
  }),
  module("benchmark", "Benchmark", "comercial", "/todogreen/precificacao", { icon: "BarChart3", order: 21 }),
  module("receita", "Receita", "financeiro", "/todogreen/receita", { icon: "DollarSign", order: 30 }),
  module("forecast", "Forecast", "financeiro", "/todogreen/receita", { icon: "TrendingUp", order: 31 }),
  module("faturamento", "Faturamento", "financeiro", "/todogreen/receita", { icon: "ReceiptText", order: 32 }),
  module("recebimento", "Recebimento", "financeiro", "/todogreen/receita", { icon: "CheckCircle2", order: 33 }),
  module("custos", "Custos", "financeiro", "/todogreen/custos", {
    icon: "Sigma",
    order: 34,
    permissions: ["read", "cost:manage"],
  }),
  module("opex", "OPEX", "financeiro", "/todogreen/custos", { icon: "WalletCards", order: 35 }),
  module("margem", "Margem", "financeiro", "/todogreen/dashboard", { icon: "Gauge", order: 36 }),
  module("rentabilidade", "Rentabilidade", "financeiro", "/todogreen/dashboard", { icon: "Activity", order: 37 }),
  module("orcamento", "Orçamento", "financeiro", "/todogreen/custos", { icon: "ListChecks", order: 38 }),
  module("centros-custo", "Centros de custo", "financeiro", "/todogreen/custos", { icon: "Network", order: 39 }),
  module("operacoes", "Operações", "operacional", "/todogreen/operacoes", { icon: "Workflow", order: 40 }),
  module("produtos-logisticos", "Produtos logísticos", "operacional", "/todogreen/precificacao", { icon: "Boxes", order: 41 }),
  module("rotas", "Rotas", "operacional", "/todogreen/operacoes", { icon: "Route", order: 42 }),
  module("viagens", "Viagens", "operacional", "/todogreen/operacoes", { icon: "Navigation", order: 43 }),
  module("veiculos", "Veículos", "operacional", "/todogreen/operacoes", { icon: "Truck", order: 44 }),
  module("motoristas", "Motoristas", "operacional", "/todogreen/operacoes", { icon: "UserRound", order: 45 }),
  module("entregas", "Entregas", "operacional", "/todogreen/operacoes", { icon: "PackageCheck", order: 46 }),
  module("pacotes", "Pacotes", "operacional", "/todogreen/operacoes", { icon: "Boxes", order: 47 }),
  module("ocupacao", "Ocupação", "operacional", "/todogreen/dashboard", { icon: "Gauge", order: 48 }),
  module("produtividade", "Produtividade", "operacional", "/todogreen/dashboard", { icon: "Activity", order: 49 }),
  module("energia", "Energia", "operacional", "/todogreen/esg", { icon: "Zap", order: 50 }),
  module("ocorrencias", "Ocorrências", "operacional", "/todogreen/operacoes", { icon: "AlertTriangle", order: 51 }),
  module("tarefas", "Tarefas", "gestao", "/todogreen/dashboard", { icon: "ListTodo", order: 60 }),
  module("documentos", "Documentos", "gestao", "/todogreen/relatorios", { icon: "FileText", order: 61 }),
  module("aprovacoes", "Aprovações", "gestao", "/todogreen/precificacao", { icon: "ShieldCheck", order: 62 }),
  module("notificacoes", "Notificações", "gestao", "/todogreen/dashboard", { icon: "Bell", order: 63 }),
  module("inbox", "Inbox", "gestao", "/todogreen/dashboard", { icon: "Inbox", order: 64 }),
  module("relatorios", "Relatórios", "gestao", "/todogreen/relatorios", { icon: "FileText", order: 65 }),
  module("auditoria", "Auditoria", "gestao", "/todogreen/auditoria", {
    icon: "History",
    order: 66,
    permissions: ["read", "audit:read"],
  }),
  module("usuarios", "Usuários", "gestao", "/todogreen/acessos", { icon: "Users", order: 67 }),
  module("permissoes", "Permissões", "gestao", "/todogreen/acessos", { icon: "LockKeyhole", order: 68 }),
  module("configuracoes", "Configurações", "gestao", "/todogreen/acessos", { icon: "Settings", order: 69 }),
];

export const TODO_GREEN_FEATURE_COUNT = TODO_GREEN_MODULE_CATALOG.length;

const product = (id, name, code, modality, billingUnit, fields, config = {}) => ({
  id,
  name,
  code,
  description: config.description || "",
  modality,
  billingUnit,
  costStructure: config.costStructure || ["vehicle", "team", "energy", "tax", "opex"],
  requiredFields: fields.required || [],
  optionalFields: fields.optional || [],
  pricingRules: config.pricingRules || {},
  distanceBands: config.distanceBands || [],
  weightBands: config.weightBands || [],
  marginRules: config.marginRules || { minimumMarginPercent: 18, targetMarginPercent: 26 },
  approvalRules: config.approvalRules || {
    minimumMarginPercent: 18,
    maximumDiscountPercent: 8,
    dataQualityMinimum: 60,
  },
  operationalIndicators: config.operationalIndicators || [],
  environmentalIndicators: ["co2AvoidedKg", "dieselAvoidedL", "reductionPercent", "greenScore"],
  proposalTemplate: config.proposalTemplate || "logistics-standard-v1",
  contractTemplate: config.contractTemplate || "logistics-contract-v1",
  status: "active",
  version: config.version || "1.0.0",
});

export const LOGISTICS_PRODUCTS = [
  product("middle-mile", "Middle Mile", "MM", "line-haul", "viagem", {
    required: ["client", "origin", "destination", "distanceKm", "tripsPerMonth", "vehicleType"],
    optional: ["returnLoaded", "weeklyFrequency", "pallets", "weightKg", "waitingHours", "tollCost", "sla", "customerTargetPrice"],
  }),
  product("last-mile", "Last Mile", "LM", "last-mile", "pacote", {
    required: ["client", "city", "packages", "routesPerDay", "daysPerMonth", "kmPerRoute", "vehicleType"],
    optional: ["stops", "successRate", "returnsRate", "weightKg", "density", "sla", "customerTargetPrice"],
  }),
  product("dedicated", "Operação dedicada", "DED", "dedicated", "mensalidade", {
    required: ["client", "vehicles", "vehicleType", "drivers", "hoursPerDay", "daysPerMonth"],
    optional: ["helpers", "reserveVehicle", "supervisionCost", "technologyCost", "trainingCost", "implementationCost", "customerTargetPrice"],
  }),
  product("transfer", "Transferência entre CDs, hubs ou lojas", "TRF", "transfer", "transferência", {
    required: ["origin", "destination", "distanceKm", "frequencyPerMonth", "vehicleType"],
    optional: ["points", "pallets", "weightKg", "waitingHours", "returnLoaded", "customerTargetPrice"],
  }),
  product("store-replenishment", "Abastecimento de lojas", "ABL", "store-replenishment", "loja/visita", {
    required: ["stores", "visitsPerMonth", "kmPerRoute", "vehicleType"],
    optional: ["deliveryWindows", "unloadingHours", "reverseLogistics", "helpers", "customerTargetPrice"],
  }),
  product("supplier-pickup", "Coleta em fornecedores", "CLF", "supplier-pickup", "coleta", {
    required: ["suppliers", "frequencyPerMonth", "distanceKm", "vehicleType"],
    optional: ["waitingHours", "consolidationPercent", "weightKg", "pallets", "customerTargetPrice"],
  }),
  product("fractional-distribution", "Distribuição fracionada", "DFR", "fractional", "entrega", {
    required: ["sharedRouteCost", "allocationPercent", "deliveries", "distanceKm"],
    optional: ["clientsOnRoute", "occupancyPercent", "weightKg", "volumeM3", "customerTargetPrice"],
  }),
  product("bulk", "Operação a granel", "GRN", "bulk", "tonelada", {
    required: ["materialType", "tons", "distanceKm", "tripsPerMonth", "vehicleType"],
    optional: ["cleaningCost", "waitingHours", "lossPercent", "licenseCost", "customerTargetPrice"],
  }),
  product("custom-project", "Projeto logístico personalizado", "PLP", "custom-project", "projeto", {
    required: ["client", "components", "contractMonths"],
    optional: ["initialInvestment", "cashFlowMonths", "services", "sla", "customerTargetPrice"],
  }),
];

export const DEFAULT_ENVIRONMENTAL_FACTORS = {
  methodologyVersion: "tdg-env-v1",
  dieselKgCo2ePerLiter: 2.68,
  dieselKmPerLiter: 4.2,
  electricKgCo2ePerKwh: 0.06,
  electricKwhPerKm: 0.22,
  treeKgCo2eYear: 21,
  carKgCo2eYear: 4600,
  flightKgCo2e: 90,
  homeKwhMonth: 152,
};

export const DEFAULT_PRICING_ASSUMPTIONS = {
  taxPercent: 8.65,
  opexPercent: 7,
  commissionPercent: 2.5,
  targetMarginPercent: 26,
  minimumMarginPercent: 18,
  riskPercent: 3,
  adminPercent: 4,
  energyCostPerKwh: 0.92,
  driverDailyCost: 280,
  helperDailyCost: 180,
  vehicleDailyCost: 430,
  maintenancePerKm: 0.42,
  reserveVehiclePercent: 6,
};

export const buildCostBreakdown = (inputs = {}, assumptions = {}) => {
  const a = { ...DEFAULT_PRICING_ASSUMPTIONS, ...assumptions };
  const distanceKm = Math.max(0, n(inputs.distanceKm || inputs.kmPerRoute));
  const trips = Math.max(1, n(inputs.tripsPerMonth || inputs.frequencyPerMonth || inputs.routesPerDay * inputs.daysPerMonth || 1));
  const days = Math.max(1, n(inputs.daysPerMonth || inputs.operationDays || Math.ceil(trips / 2)));
  const vehicles = Math.max(1, n(inputs.vehicles || 1));
  const drivers = Math.max(1, n(inputs.drivers || vehicles));
  const helpers = Math.max(0, n(inputs.helpers || inputs.ajudantes || 0));
  const distanceTotal = distanceKm * trips;
  const energy = distanceTotal * n(inputs.electricKwhPerKm || a.energyCostPerKwh ? DEFAULT_ENVIRONMENTAL_FACTORS.electricKwhPerKm : 0.22) * a.energyCostPerKwh;
  const vehicle = vehicles * days * a.vehicleDailyCost;
  const driver = drivers * days * a.driverDailyCost;
  const helper = helpers * days * a.helperDailyCost;
  const maintenance = distanceTotal * a.maintenancePerKm;
  const tolls = n(inputs.tollCost || inputs.pedagios) * trips;
  const waiting = n(inputs.waitingHours) * 90;
  const insurance = n(inputs.insuranceCost || inputs.seguro);
  const risk = n(inputs.riskManagementCost || inputs.riskCost);
  const technology = n(inputs.technologyCost || inputs.trackingCost);
  const implementation = n(inputs.implementationCost || 0) / Math.max(1, n(inputs.contractMonths || 12));
  const cleaning = n(inputs.cleaningCost || 0);
  const licenses = n(inputs.licenseCost || 0);
  const shared = n(inputs.sharedRouteCost || 0) * (n(inputs.allocationPercent || 100) / 100);
  const lines = [
    ["vehicle", "Veículo, locação ou depreciação", vehicle],
    ["team", "Motoristas e equipe", driver + helper],
    ["energy", "Energia e recarga", energy],
    ["maintenance", "Manutenção e pneus", maintenance],
    ["tolls", "Pedágios e taxas", tolls],
    ["waiting", "Tempo de espera", waiting],
    ["insurance", "Seguro", insurance],
    ["risk", "Gerenciamento de risco", risk],
    ["technology", "Tecnologia e rastreamento", technology],
    ["implementation", "Implantação rateada", implementation],
    ["cleaning", "Limpeza/preparação", cleaning],
    ["licenses", "Licenças/requisitos", licenses],
    ["shared", "Custo compartilhado alocado", shared],
  ]
    .filter(([, , amount]) => amount > 0)
    .map(([id, label, amount]) => ({ id, label, amount: roundMoney(amount) }));
  return {
    lines,
    directCost: roundMoney(lines.reduce((sum, item) => sum + item.amount, 0)),
    drivers: { distanceKm, trips, days, vehicles, drivers, helpers },
  };
};

export const calculateEnvironmentalImpact = (inputs = {}, factors = {}) => {
  const f = { ...DEFAULT_ENVIRONMENTAL_FACTORS, ...factors };
  const distanceKm = Math.max(0, n(inputs.distanceKm || inputs.kmPerRoute) * Math.max(1, n(inputs.tripsPerMonth || inputs.frequencyPerMonth || inputs.routesPerDay * inputs.daysPerMonth || 1)));
  const referenceLiters = distanceKm / Math.max(0.1, n(inputs.referenceKmPerLiter || f.dieselKmPerLiter));
  const referenceKg = referenceLiters * f.dieselKgCo2ePerLiter;
  const electricKwh = n(inputs.energyKwh) || distanceKm * f.electricKwhPerKm;
  const actualKg = electricKwh * f.electricKgCo2ePerKwh;
  const avoidedKg = Math.max(0, referenceKg - actualKg);
  const packages = Math.max(0, n(inputs.packages || inputs.deliveries));
  const tons = Math.max(0, n(inputs.tons || inputs.weightKg / 1000));
  return {
    methodologyVersion: f.methodologyVersion,
    distanceKm: roundMoney(distanceKm, 1),
    referenceEmissionsKg: roundMoney(referenceKg, 2),
    actualEmissionsKg: roundMoney(actualKg, 2),
    co2AvoidedKg: roundMoney(avoidedKg, 2),
    reductionPercent: referenceKg ? roundMoney((avoidedKg / referenceKg) * 100, 1) : 0,
    dieselAvoidedLiters: roundMoney(referenceLiters, 2),
    lowEmissionKm: roundMoney(distanceKm, 1),
    intensityPerPackageKg: packages ? roundMoney(actualKg / packages, 4) : 0,
    intensityPerDeliveryKg: packages ? roundMoney(actualKg / packages, 4) : 0,
    intensityPerTonKg: tons ? roundMoney(actualKg / tons, 4) : 0,
    intensityPerKmKg: distanceKm ? roundMoney(actualKg / distanceKm, 4) : 0,
    equivalences: {
      treesYear: roundMoney(avoidedKg / f.treeKgCo2eYear, 1),
      carsYear: roundMoney(avoidedKg / f.carKgCo2eYear, 2),
      flights: roundMoney(avoidedKg / f.flightKgCo2e, 1),
      homesMonth: roundMoney((electricKwh || 0) / f.homeKwhMonth, 1),
    },
    formula:
      "(distância / consumo diesel referência * fator diesel) - (kWh elétrico * fator elétrico)",
    units: "kgCO2e, litros, km, kWh",
    factors: f,
    dataQuality: n(inputs.dataQuality || 75),
  };
};

export const calculateGreenScore = (impact = {}, metrics = {}, weights = {}) => {
  const w = {
    reduction: 35,
    lowEmissionKm: 20,
    cleanEnergy: 15,
    efficiency: 10,
    targetEvolution: 10,
    dataQuality: 10,
    ...weights,
  };
  const parts = {
    reduction: Math.min(100, n(impact.reductionPercent)),
    lowEmissionKm: Math.min(100, n(impact.lowEmissionKm) / Math.max(1, n(metrics.lowEmissionKmTarget || 1000)) * 100),
    cleanEnergy: Math.min(100, n(metrics.cleanEnergyPercent ?? 80)),
    efficiency: Math.min(100, (n(metrics.occupancyPercent || 75) + n(metrics.productivityPercent || 75)) / 2),
    targetEvolution: Math.min(100, n(metrics.targetEvolutionPercent || impact.reductionPercent || 0)),
    dataQuality: Math.min(100, n(impact.dataQuality || metrics.dataQuality || 70)),
  };
  const totalWeight = Object.values(w).reduce((sum, item) => sum + n(item), 0) || 1;
  const score = Object.entries(parts).reduce(
    (sum, [key, value]) => sum + value * n(w[key]),
    0,
  ) / totalWeight;
  return {
    score: Math.max(0, Math.min(100, roundMoney(score, 1))),
    weights: w,
    parts,
    version: "green-score-v1",
    disclaimer:
      "Indicador proprietário da To Do Green. Não é certificação oficial e deve ser validado conforme a metodologia aplicada.",
  };
};

export const centralPricingEngine = (productId, inputs = {}, config = {}) => {
  const productConfig = LOGISTICS_PRODUCTS.find((item) => item.id === productId);
  if (!productConfig) throw new Error("Produto logístico não encontrado.");
  const assumptions = { ...DEFAULT_PRICING_ASSUMPTIONS, ...(config.assumptions || {}) };
  const cost = buildCostBreakdown(inputs, assumptions);
  const directCost = cost.directCost;
  const tax = directCost * (assumptions.taxPercent / 100);
  const opex = directCost * (assumptions.opexPercent / 100);
  const admin = directCost * (assumptions.adminPercent / 100);
  const risk = directCost * (assumptions.riskPercent / 100);
  const loadedCost = directCost + tax + opex + admin + risk;
  const minimumMargin = n(productConfig.approvalRules.minimumMarginPercent ?? assumptions.minimumMarginPercent) / 100;
  const targetMargin = n(productConfig.marginRules.targetMarginPercent ?? assumptions.targetMarginPercent) / 100;
  const minimumPrice = loadedCost / Math.max(0.01, 1 - minimumMargin - n(assumptions.commissionPercent) / 100);
  const recommendedPrice = loadedCost / Math.max(0.01, 1 - targetMargin - n(assumptions.commissionPercent) / 100);
  const targetPrice = n(inputs.customerTargetPrice || inputs.targetPrice);
  const selectedPrice = n(inputs.price) || recommendedPrice;
  const commission = selectedPrice * (assumptions.commissionPercent / 100);
  const marginValue = selectedPrice - loadedCost - commission;
  const marginPercent = selectedPrice ? (marginValue / selectedPrice) * 100 : 0;
  const impact = calculateEnvironmentalImpact(inputs, config.environmentalFactors);
  const greenScore = calculateGreenScore(impact, inputs, config.greenScoreWeights);
  const approval = dealDeskTriggers(
    { marginPercent, selectedPrice, minimumPrice, targetPrice, inputs },
    productConfig,
  );
  return {
    productId,
    productName: productConfig.name,
    version: productConfig.version,
    inputs: { ...inputs },
    assumptions,
    cost,
    loadedCost: roundMoney(loadedCost),
    minimumPrice: roundMoney(minimumPrice),
    recommendedPrice: roundMoney(recommendedPrice),
    selectedPrice: roundMoney(selectedPrice),
    targetPrice: roundMoney(targetPrice),
    commission: roundMoney(commission),
    marginValue: roundMoney(marginValue),
    marginPercent: roundMoney(marginPercent, 1),
    resultMonthly: roundMoney(marginValue),
    resultAnnual: roundMoney(marginValue * 12),
    breakEvenVolume: unitVolume(productConfig, inputs)
      ? roundMoney(loadedCost / Math.max(0.01, selectedPrice / unitVolume(productConfig, inputs)), 1)
      : 0,
    impact,
    greenScore,
    recommendation: commercialRecommendation({
      marginPercent,
      marginValue,
      targetPrice,
      selectedPrice,
      impact,
      greenScore,
      approval,
      inputs,
    }),
    approval,
    traceability: {
      formula: "loadedCost / (1 - margin - commission)",
      calculatedAt: new Date().toISOString(),
      ruleVersion: productConfig.version,
      methodologyVersion: impact.methodologyVersion,
    },
  };
};

const unitVolume = (productConfig, inputs) => {
  if (productConfig.billingUnit === "pacote") return n(inputs.packages);
  if (productConfig.billingUnit === "viagem") return n(inputs.tripsPerMonth);
  if (productConfig.billingUnit === "tonelada") return n(inputs.tons);
  if (productConfig.billingUnit === "entrega") return n(inputs.deliveries);
  return n(inputs.quantity || inputs.frequencyPerMonth || 1);
};

export const productSpecificOutputs = (productId, result = {}) => {
  const i = result.inputs || {};
  const cost = result.cost?.directCost || 0;
  const km = result.impact?.distanceKm || n(i.distanceKm);
  const trips = n(i.tripsPerMonth || i.frequencyPerMonth || 1);
  const packages = n(i.packages || i.deliveries);
  const tons = n(i.tons || i.weightKg / 1000);
  const pallets = n(i.pallets);
  const base = {
    custoTotal: result.loadedCost,
    precoMinimo: result.minimumPrice,
    precoRecomendado: result.recommendedPrice,
    margem: result.marginPercent,
    resultadoMensal: result.resultMonthly,
    resultadoAnual: result.resultAnnual,
    impactoAmbiental: result.impact?.co2AvoidedKg,
  };
  if (productId === "middle-mile")
    return {
      ...base,
      custoPorViagem: trips ? roundMoney(cost / trips) : 0,
      custoPorKm: km ? roundMoney(cost / km) : 0,
      custoPorTonelada: tons ? roundMoney(cost / tons) : 0,
      custoPorPallet: pallets ? roundMoney(cost / pallets) : 0,
      impactoRetornoVazio: i.returnLoaded ? 0 : roundMoney((result.loadedCost || 0) * 0.18),
      ocupacaoMinima: 68,
    };
  if (productId === "last-mile")
    return {
      ...base,
      custoPorPacote: packages ? roundMoney(cost / packages) : 0,
      custoPorParada: n(i.stops) ? roundMoney(cost / n(i.stops)) : 0,
      custoDeInsucesso: roundMoney((packages * (100 - n(i.successRate || 92)) / 100) * 4.8),
      volumeEquilibrio: result.breakEvenVolume,
      produtividadeMinima: 82,
    };
  if (productId === "dedicated")
    return {
      ...base,
      custoPorVeiculo: n(i.vehicles) ? roundMoney(cost / n(i.vehicles)) : cost,
      custoPorDia: n(i.daysPerMonth) ? roundMoney(cost / n(i.daysPerMonth)) : cost,
      impactoVeiculoReserva: i.reserveVehicle ? roundMoney(cost * 0.06) : 0,
    };
  if (productId === "bulk")
    return {
      ...base,
      custoPorTonelada: tons ? roundMoney(cost / tons) : 0,
      custoDeLimpeza: roundMoney(n(i.cleaningCost)),
      custoDeEspera: roundMoney(n(i.waitingHours) * 90),
      ocupacao: n(i.occupancyPercent || 76),
    };
  return {
    ...base,
    custoPorKm: km ? roundMoney(cost / km) : 0,
    custoPorUnidade: unitVolume({ billingUnit: "" }, i) ? roundMoney(cost / unitVolume({ billingUnit: "" }, i)) : cost,
  };
};

export const dealDeskTriggers = (summary = {}, productConfig = {}) => {
  const triggers = [];
  const approval = productConfig.approvalRules || {};
  if (n(summary.marginPercent) < n(approval.minimumMarginPercent || 18))
    triggers.push("Margem abaixo do mínimo");
  if (n(summary.targetPrice) && n(summary.targetPrice) < n(summary.minimumPrice))
    triggers.push("Target incompatível com preço mínimo");
  if (n(summary.inputs?.discountPercent) > n(approval.maximumDiscountPercent || 8))
    triggers.push("Desconto acima do limite");
  if (n(summary.inputs?.dataQuality) < n(approval.dataQualityMinimum || 60))
    triggers.push("Dados insuficientes ou pouco confiáveis");
  if (summary.inputs?.newRegion) triggers.push("Nova região");
  if (summary.inputs?.strategicContract) triggers.push("Contrato estratégico");
  if (n(summary.inputs?.occupancyPercent) && n(summary.inputs.occupancyPercent) < 60)
    triggers.push("Baixa ocupação");
  return {
    required: triggers.length > 0,
    triggers,
    flow: triggers.length
      ? ["Comercial", "Liderança comercial", "Pricing/Financeiro", "Operações", "Sustentabilidade", "Aprovador final"]
      : [],
  };
};

export const commercialRecommendation = ({
  marginPercent,
  marginValue,
  targetPrice,
  selectedPrice,
  impact,
  greenScore,
  approval,
  inputs,
}) => {
  const reasons = [];
  if (approval?.required) reasons.push(`Requer Deal Desk: ${approval.triggers.join(", ")}.`);
  if (n(marginPercent) >= 26) reasons.push("Margem acima do alvo comercial.");
  if (n(marginPercent) < 18) reasons.push("Margem abaixo do piso interno.");
  if (n(targetPrice) && n(selectedPrice) > n(targetPrice)) reasons.push("Preço recomendado acima do target informado.");
  if (n(impact?.co2AvoidedKg) > 0) reasons.push("Gera impacto ESG mensurável para proposta e relatórios.");
  if (n(greenScore?.score) >= 70) reasons.push("Green Score estimado saudável.");
  if (n(inputs?.dataQuality) < 60) reasons.push("Qualidade dos dados precisa ser melhorada.");
  let decision = "Aceitar";
  if (approval?.required) decision = "Encaminhar ao Deal Desk";
  else if (n(marginPercent) < 18) decision = "Renegociar preço";
  else if (n(targetPrice) && n(selectedPrice) > n(targetPrice) * 1.15) decision = "Renegociar escopo";
  else if (n(marginValue) < 0) decision = "Rejeitar";
  else if (n(inputs?.dataQuality) < 60) decision = "Solicitar mais informações";
  return {
    decision,
    reasons: reasons.length ? reasons : ["Premissas dentro dos parâmetros configurados."],
  };
};

export const createPricingScenarioSnapshot = (productId, inputs, context = {}, config = {}) => {
  const result = centralPricingEngine(productId, inputs, config);
  return Object.freeze({
    id: context.id || `scenario-${Date.now()}`,
    tenantId: context.tenantId || TODO_GREEN_TENANT.id,
    productId,
    clientId: context.clientId || inputs.clientId || "",
    opportunityId: context.opportunityId || inputs.opportunityId || "",
    createdBy: context.userId || "",
    createdAt: context.createdAt || new Date().toISOString(),
    ruleVersion: result.version,
    inputs: { ...inputs },
    formulas: result.traceability,
    parameters: result.assumptions,
    result,
    approvals: result.approval,
    justification: text(context.justification),
  });
};

export const summarizeTodoGreenDashboard = (data = {}) => {
  const scenarios = Array.isArray(data.pricingScenarios) ? data.pricingScenarios : [];
  const revenue = Array.isArray(data.revenueEntries) ? data.revenueEntries : [];
  const operations = Array.isArray(data.operations) ? data.operations : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const now = (data.today || new Date().toISOString()).slice(0, 10);
  const contracted = scenarios.reduce((sum, item) => sum + n(item.result?.selectedPrice), 0);
  const cost = scenarios.reduce((sum, item) => sum + n(item.result?.loadedCost), 0);
  const co2 = scenarios.reduce((sum, item) => sum + n(item.result?.impact?.co2AvoidedKg), 0);
  const diesel = scenarios.reduce((sum, item) => sum + n(item.result?.impact?.dieselAvoidedLiters), 0);
  const green = scenarios.length
    ? scenarios.reduce((sum, item) => sum + n(item.result?.greenScore?.score), 0) / scenarios.length
    : 0;
  return {
    receitaPrevista: roundMoney(contracted),
    receitaRealizada: roundMoney(revenue.reduce((sum, item) => sum + n(item.amount), 0)),
    custoTotal: roundMoney(cost),
    margemContribuicao: roundMoney(contracted - cost),
    margemOperacionalPercent: contracted ? roundMoney(((contracted - cost) / contracted) * 100, 1) : 0,
    clientes: new Set(scenarios.map((item) => item.clientId).filter(Boolean)).size,
    oportunidadesAbertas: scenarios.filter((item) => item.status !== "won" && item.status !== "lost").length,
    propostasEnviadas: scenarios.length,
    propostasAprovadas: scenarios.filter((item) => !item.result?.approval?.required).length,
    propostasAbaixoMargem: scenarios.filter((item) => n(item.result?.marginPercent) < 18).length,
    entregas: operations.reduce((sum, item) => sum + n(item.deliveries), 0),
    pacotes: operations.reduce((sum, item) => sum + n(item.packages), 0),
    viagens: operations.reduce((sum, item) => sum + n(item.trips), 0),
    quilometragem: operations.reduce((sum, item) => sum + n(item.distanceKm), 0),
    ocupacao: operations.length
      ? roundMoney(operations.reduce((sum, item) => sum + n(item.occupancyPercent), 0) / operations.length, 1)
      : 0,
    co2Evitado: roundMoney(co2),
    dieselNaoConsumido: roundMoney(diesel),
    reducaoEmissoesPercent: scenarios.length
      ? roundMoney(scenarios.reduce((sum, item) => sum + n(item.result?.impact?.reductionPercent), 0) / scenarios.length, 1)
      : 0,
    greenScore: roundMoney(green, 1),
    comissoesPrevistas: roundMoney(contracted * 0.025),
    aprovacoesPendentes: scenarios.filter((item) => item.result?.approval?.required).length,
    tarefasAtrasadas: tasks.filter((task) => task.due && task.due < now && task.status !== "Concluído").length,
    inboxNaoLido: n(data.inboxUnread),
  };
};

export const esgTranslator = (co2Kg, factors = {}) => {
  const f = { ...DEFAULT_ENVIRONMENTAL_FACTORS, ...factors };
  const value = Math.max(0, n(co2Kg));
  return {
    input: { co2Kg: value, unit: "kgCO2e" },
    equivalents: {
      treesYear: roundMoney(value / f.treeKgCo2eYear, 1),
      carsYear: roundMoney(value / f.carKgCo2eYear, 2),
      dieselLiters: roundMoney(value / f.dieselKgCo2ePerLiter, 1),
      flights: roundMoney(value / f.flightKgCo2e, 1),
    },
    proposalText: `Estimativa de ${roundMoney(value / 1000, 2)} tCO2e evitadas na cadeia logística, sujeita à validação conforme metodologia e fatores informados.`,
    reportText: `Memória de cálculo: CO2 evitado dividido pelos fatores de equivalência da metodologia ${f.methodologyVersion}.`,
    disclaimer: "Equivalências ilustrativas. Use como apoio de comunicação, não como certificação oficial.",
    factors: f,
    formula: "equivalente = kgCO2e evitado / fator",
  };
};
