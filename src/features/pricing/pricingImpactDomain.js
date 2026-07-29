const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value, decimals = 2) => {
  const scale = 10 ** decimals;
  return Math.round((numeric(value) + Number.EPSILON) * scale) / scale;
};

export const PRICING_TEMPLATES = [
  {
    id: "services",
    name: "Serviços",
    description: "Horas, materiais, despesas, impostos e margem.",
    inputs: { quantity: 1, hours: 1, distanceKm: 0, weightKg: 0 },
    costItems: [
      { name: "Mão de obra", driver: "hour", rate: 0 },
      { name: "Materiais", driver: "fixed", rate: 0 },
      { name: "Despesas operacionais", driver: "fixed", rate: 0 },
    ],
  },
  {
    id: "products",
    name: "Produtos",
    description: "Aquisição, embalagem, movimentação e venda por unidade.",
    inputs: { quantity: 1, hours: 0, distanceKm: 0, weightKg: 0 },
    costItems: [
      { name: "Custo do produto", driver: "unit", rate: 0 },
      { name: "Embalagem", driver: "unit", rate: 0 },
      { name: "Logística", driver: "fixed", rate: 0 },
    ],
  },
  {
    id: "logistics",
    name: "Transporte e logística",
    description: "Distância, carga, operação, pedágio, risco e capacidade.",
    inputs: { quantity: 1, hours: 1, distanceKm: 1, weightKg: 1 },
    costItems: [
      { name: "Veículo e energia", driver: "distance", rate: 0 },
      { name: "Equipe operacional", driver: "hour", rate: 0 },
      { name: "Pedágios e taxas", driver: "fixed", rate: 0 },
      { name: "Gerenciamento de risco", driver: "fixed", rate: 0 },
      { name: "Coleta e entrega", driver: "unit", rate: 0 },
    ],
  },
  {
    id: "projects",
    name: "Projetos",
    description: "Equipe, licenças, terceiros, contingência e margem.",
    inputs: { quantity: 1, hours: 1, distanceKm: 0, weightKg: 0 },
    costItems: [
      { name: "Equipe", driver: "hour", rate: 0 },
      { name: "Licenças e ferramentas", driver: "fixed", rate: 0 },
      { name: "Terceiros", driver: "fixed", rate: 0 },
      { name: "Contingência", driver: "fixed", rate: 0 },
    ],
  },
];

export const COST_DRIVERS = [
  ["fixed", "Valor fixo"],
  ["unit", "Por unidade"],
  ["hour", "Por hora"],
  ["distance", "Por quilômetro"],
  ["weight", "Por quilograma"],
  ["ton_km", "Por tonelada-quilômetro"],
];

const createId = () => crypto.randomUUID();

export const createPricingModel = (input = {}, context = {}, existing = {}) => {
  const template =
    PRICING_TEMPLATES.find((item) => item.id === input.templateId) ||
    PRICING_TEMPLATES[0];
  const now = new Date().toISOString();
  const sourceItems = input.costItems || existing.costItems || template.costItems;
  return {
    ...existing,
    id: existing.id || input.id || createId(),
    name: String(input.name || existing.name || template.name).trim(),
    description: String(
      input.description || existing.description || template.description,
    ).trim(),
    templateId: input.templateId || existing.templateId || template.id,
    defaultInputs: {
      ...template.inputs,
      ...(existing.defaultInputs || {}),
      ...(input.defaultInputs || {}),
    },
    costItems: sourceItems.map((item) => ({
      id: item.id || createId(),
      name: String(item.name || "Custo").trim(),
      driver: COST_DRIVERS.some(([id]) => id === item.driver)
        ? item.driver
        : "fixed",
      rate: Math.max(0, numeric(item.rate)),
    })),
    taxPercent: Math.max(0, numeric(input.taxPercent ?? existing.taxPercent)),
    commissionPercent: Math.max(
      0,
      numeric(input.commissionPercent ?? existing.commissionPercent),
    ),
    targetMarginPercent: Math.max(
      0,
      numeric(input.targetMarginPercent ?? existing.targetMarginPercent ?? 20),
    ),
    minimumPrice: Math.max(0, numeric(input.minimumPrice ?? existing.minimumPrice)),
    active: input.active ?? existing.active ?? true,
    businessId: context.businessId || existing.businessId || null,
    ownerId: context.ownerId || existing.ownerId || null,
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
};

export const driverQuantity = (driver, inputs = {}) => {
  if (driver === "unit") return Math.max(0, numeric(inputs.quantity));
  if (driver === "hour") return Math.max(0, numeric(inputs.hours));
  if (driver === "distance") return Math.max(0, numeric(inputs.distanceKm));
  if (driver === "weight") return Math.max(0, numeric(inputs.weightKg));
  if (driver === "ton_km")
    return (
      Math.max(0, numeric(inputs.distanceKm)) *
      (Math.max(0, numeric(inputs.weightKg)) / 1000)
    );
  return 1;
};

export const calculatePricing = (model, scenario = {}) => {
  const inputs = { ...(model?.defaultInputs || {}), ...(scenario.inputs || {}) };
  const costBreakdown = (model?.costItems || []).map((item) => {
    const quantity = driverQuantity(item.driver, inputs);
    return {
      ...item,
      quantity: round(quantity, 4),
      total: round(quantity * numeric(item.rate)),
    };
  });
  const directCost = round(
    costBreakdown.reduce((sum, item) => sum + item.total, 0),
  );
  const taxRate = numeric(model?.taxPercent) / 100;
  const commissionRate = numeric(model?.commissionPercent) / 100;
  const marginRate = numeric(model?.targetMarginPercent) / 100;
  const denominator = 1 - taxRate - commissionRate - marginRate;
  const calculatedPrice = denominator > 0 ? directCost / denominator : 0;
  const priceBeforeDiscount = Math.max(
    numeric(model?.minimumPrice),
    calculatedPrice,
  );
  const discount = Math.max(0, numeric(scenario.discount));
  const finalPrice = round(Math.max(0, priceBeforeDiscount - discount));
  const taxes = round(finalPrice * taxRate);
  const commission = round(finalPrice * commissionRate);
  const marginValue = round(finalPrice - directCost - taxes - commission);
  return {
    inputs,
    costBreakdown,
    directCost,
    priceBeforeDiscount: round(priceBeforeDiscount),
    discount,
    finalPrice,
    taxes,
    commission,
    marginValue,
    marginPercent: finalPrice ? round((marginValue / finalPrice) * 100, 1) : 0,
    unitPrice: numeric(inputs.quantity)
      ? round(finalPrice / numeric(inputs.quantity))
      : finalPrice,
    valid: denominator > 0,
    warning:
      denominator <= 0
        ? "A soma de impostos, comissão e margem precisa ser menor que 100%."
        : finalPrice < directCost + taxes + commission
          ? "O desconto consumiu a margem planejada."
          : "",
  };
};

export const createImpactFactor = (input = {}, context = {}, existing = {}) => ({
  ...existing,
  id: existing.id || input.id || createId(),
  name: String(input.name || existing.name || "").trim(),
  activityUnit: String(input.activityUnit || existing.activityUnit || "unidade"),
  kgCo2ePerUnit: Math.max(
    0,
    numeric(input.kgCo2ePerUnit ?? existing.kgCo2ePerUnit),
  ),
  scope: ["Escopo 1", "Escopo 2", "Escopo 3"].includes(input.scope)
    ? input.scope
    : existing.scope || "Escopo 3",
  category: String(input.category || existing.category || "").trim(),
  source: String(input.source || existing.source || "").trim(),
  version: String(input.version || existing.version || "").trim(),
  validFrom: String(input.validFrom || existing.validFrom || "").slice(0, 10),
  validUntil: String(input.validUntil || existing.validUntil || "").slice(0, 10),
  businessId: context.businessId || existing.businessId || null,
  ownerId: context.ownerId || existing.ownerId || null,
  createdAt: existing.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const impactConfidence = (entry = {}, factor = {}) => {
  let score = entry.dataQuality === "medido" ? 50 : entry.dataQuality === "fornecedor" ? 35 : 20;
  if (entry.evidence) score += 20;
  if (factor.source) score += 15;
  if (factor.version || factor.validFrom) score += 10;
  if (entry.approvedAt) score += 5;
  return Math.min(100, score);
};

export const calculateImpact = (entries = [], factors = []) => {
  const factorMap = new Map(factors.map((factor) => [factor.id, factor]));
  const breakdown = entries.map((entry) => {
    const factor = factorMap.get(entry.factorId) || {};
    const kgCo2e = round(
      Math.max(0, numeric(entry.quantity)) * numeric(factor.kgCo2ePerUnit),
      4,
    );
    return {
      ...entry,
      factorName: factor.name || "Fator não encontrado",
      scope: factor.scope || "Não definido",
      kgCo2e,
      confidence: impactConfidence(entry, factor),
    };
  });
  const totalKgCo2e = round(
    breakdown.reduce((sum, entry) => sum + entry.kgCo2e, 0),
    4,
  );
  const confidence = breakdown.length
    ? round(
        breakdown.reduce(
          (sum, entry) => sum + entry.confidence * Math.max(entry.kgCo2e, 0.0001),
          0,
        ) /
          breakdown.reduce(
            (sum, entry) => sum + Math.max(entry.kgCo2e, 0.0001),
            0,
          ),
        1,
      )
    : 0;
  const byScope = breakdown.reduce((result, entry) => {
    result[entry.scope] = round((result[entry.scope] || 0) + entry.kgCo2e, 4);
    return result;
  }, {});
  return { breakdown, totalKgCo2e, confidence, byScope };
};

export const createPricingScenario = (
  model,
  input = {},
  impactFactors = [],
  context = {},
  existing = {},
) => {
  const now = new Date().toISOString();
  const impactEntries = (input.impactEntries || existing.impactEntries || []).map(
    (entry) => ({
      id: entry.id || createId(),
      factorId: entry.factorId || "",
      quantity: Math.max(0, numeric(entry.quantity)),
      dataQuality: ["medido", "fornecedor", "estimado"].includes(entry.dataQuality)
        ? entry.dataQuality
        : "estimado",
      evidence: String(entry.evidence || "").trim(),
      approvedAt: entry.approvedAt || null,
    }),
  );
  const pricing = calculatePricing(model, input);
  const impact = calculateImpact(impactEntries, impactFactors);
  return {
    ...existing,
    id: existing.id || input.id || createId(),
    modelId: model.id,
    name: String(input.name || existing.name || "Novo cenário").trim(),
    clientId: input.clientId || existing.clientId || "",
    clientName: String(input.clientName || existing.clientName || "").trim(),
    inputs: pricing.inputs,
    discount: pricing.discount,
    impactEntries,
    result: {
      directCost: pricing.directCost,
      finalPrice: pricing.finalPrice,
      marginValue: pricing.marginValue,
      marginPercent: pricing.marginPercent,
      unitPrice: pricing.unitPrice,
      totalKgCo2e: impact.totalKgCo2e,
      impactConfidence: impact.confidence,
    },
    status: input.status || existing.status || "Rascunho",
    businessId: context.businessId || existing.businessId || null,
    ownerId: context.ownerId || existing.ownerId || null,
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
};

export const comparePricingScenarios = (
  scenarios = [],
  models = [],
  factors = [],
) =>
  scenarios
    .map((scenario) => {
      const model = models.find((item) => item.id === scenario.modelId);
      if (!model) return null;
      const pricing = calculatePricing(model, scenario);
      const impact = calculateImpact(scenario.impactEntries, factors);
      return {
        id: scenario.id,
        name: scenario.name,
        modelName: model.name,
        price: pricing.finalPrice,
        cost: pricing.directCost,
        margin: pricing.marginValue,
        marginPercent: pricing.marginPercent,
        kgCo2e: impact.totalKgCo2e,
        confidence: impact.confidence,
      };
    })
    .filter(Boolean);

export const quoteFromPricingScenario = (
  scenario,
  model,
  context = {},
  id = createId(),
) => {
  const pricing = calculatePricing(model, scenario);
  return {
    id,
    clientId: scenario.clientId || "",
    clientName: scenario.clientName || "Cliente",
    clientContact: "",
    items: [
      {
        id: createId(),
        name: scenario.name || model.name,
        quantity: 1,
        price: pricing.finalPrice,
      },
    ],
    discount: 0,
    total: pricing.finalPrice,
    validUntil: "",
    notes: `Memória de cálculo: ${model.name}. Custo ${pricing.directCost.toFixed(
      2,
    )}; margem ${pricing.marginPercent}%.`,
    status: "rascunho",
    sourcePricingScenarioId: scenario.id,
    businessId: context.businessId || null,
    ownerId: context.ownerId || null,
    visibility: "privado",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
