const makeId = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const cleanText = (value, max = 500) => String(value || "").trim().slice(0, max);

export const PROCESS_FIELD_TYPES = [
  { id: "text", label: "Texto curto" },
  { id: "longtext", label: "Texto longo" },
  { id: "number", label: "Número" },
  { id: "currency", label: "Moeda" },
  { id: "date", label: "Data" },
  { id: "datetime", label: "Data e hora" },
  { id: "email", label: "E-mail" },
  { id: "phone", label: "Telefone" },
  { id: "select", label: "Seleção" },
  { id: "multiselect", label: "Múltipla seleção" },
  { id: "checkbox", label: "Sim ou não" },
];

export const PROCESS_TEMPLATES = [
  {
    id: "approval",
    name: "Solicitação e aprovação",
    description: "Recebe solicitações, analisa, aprova e conclui.",
    stages: [
      { name: "Recebido", slaHours: 8 },
      { name: "Em análise", slaHours: 24 },
      { name: "Aprovação", slaHours: 16, approvalRequired: true },
      { name: "Concluído", slaHours: 0, terminal: true },
    ],
    fields: [
      { name: "Solicitação", type: "text", required: true },
      { name: "Descrição", type: "longtext", required: true },
      { name: "Valor", type: "currency" },
    ],
  },
  {
    id: "service",
    name: "Atendimento de serviço",
    description: "Organiza entrada, execução, validação e encerramento.",
    stages: [
      { name: "Novo", slaHours: 4 },
      { name: "Em atendimento", slaHours: 24 },
      { name: "Aguardando solicitante", slaHours: 48 },
      { name: "Resolvido", slaHours: 0, terminal: true },
    ],
    fields: [
      { name: "Assunto", type: "text", required: true },
      { name: "Detalhes", type: "longtext", required: true },
      {
        name: "Prioridade",
        type: "select",
        required: true,
        options: ["Baixa", "Média", "Alta", "Crítica"],
      },
    ],
  },
  {
    id: "client-onboarding",
    name: "Implantação de cliente",
    description:
      "Organiza aceite comercial, desenho operacional, sistemas, faturamento, contrato, portal e governança de go-live.",
    serviceCode: "IMPL",
    stages: [
      {
        name: "Kickoff comercial",
        slaHours: 24,
        requiredFieldIds: ["cliente", "ticket-medio", "margem"],
      },
      {
        name: "Desenho operacional",
        slaHours: 48,
        requiredFieldIds: [
          "abrangencia",
          "modelo-operacional",
          "horarios",
          "hcs-etapas",
          "frota-dedicada",
        ],
      },
      {
        name: "Sistemas e tracking",
        slaHours: 72,
        requiredFieldIds: [
          "integracao",
          "bipagem",
          "status-operacionais",
          "smartlabel",
          "tracking",
          "insucesso-entrega",
        ],
      },
      {
        name: "Contrato e faturamento",
        slaHours: 48,
        approvalRequired: true,
        requiredFieldIds: [
          "sla-bsc",
          "documento-fiscal",
          "modelo-pagamento",
          "preco",
          "prazo-pagamento",
          "conemb",
          "contrato-formalizado",
        ],
      },
      {
        name: "Go-live e governança",
        slaHours: 48,
        requiredFieldIds: [
          "portal-cliente",
          "atendimento-ocorrencias",
          "hc-coleta",
          "hc-cx",
          "rasci",
        ],
      },
      { name: "Cliente ativo", slaHours: 0, terminal: true },
    ],
    fields: [
      { id: "cliente", name: "Cliente", type: "text", required: true },
      { id: "abrangencia", name: "Abrangência: cidades, bases, volume diário e motoristas", type: "longtext", required: true },
      {
        id: "modelo-operacional",
        name: "Modelo operacional",
        type: "multiselect",
        required: true,
        options: ["Coleta", "Processamento", "Entrega"],
      },
      { id: "horarios", name: "Horários e janelas operacionais", type: "longtext", required: true },
      { id: "hcs-etapas", name: "HCs necessários por etapa", type: "longtext", required: true },
      {
        id: "frota-dedicada",
        name: "Frota dedicada?",
        type: "select",
        required: true,
        options: ["Dedicada", "Compartilhada", "Mista"],
      },
      { id: "veiculos", name: "Veículos necessários e regra de alocação", type: "longtext" },
      { id: "sla-bsc", name: "Regras operacionais de SLA ou BSC", type: "longtext", required: true },
      { id: "integracao", name: "Integração de sistema", type: "longtext", required: true },
      {
        id: "bipagem",
        name: "Bipagem via integração",
        type: "select",
        required: true,
        options: ["Sim", "Não", "Parcial"],
      },
      { id: "status-operacionais", name: "Status operacionais e de/para", type: "longtext", required: true },
      {
        id: "smartlabel",
        name: "Etiqueta / Smartlabel",
        type: "select",
        required: true,
        options: ["Smartlabel", "Etiqueta cliente", "Sem etiqueta", "A definir"],
      },
      { id: "roteirizacao", name: "Roteirização", type: "longtext" },
      { id: "tracking", name: "Envio de tracking", type: "longtext", required: true },
      { id: "insucesso-entrega", name: "Tratativa de insucesso na entrega", type: "longtext", required: true },
      {
        id: "documento-fiscal",
        name: "Faturamento: CT-e ou NF-e",
        type: "select",
        required: true,
        options: ["CT-e", "NF-e", "CT-e e NF-e", "A definir"],
      },
      { id: "modelo-pagamento", name: "Modelo de pagamento", type: "text", required: true },
      { id: "preco", name: "Preço contratado", type: "currency", required: true },
      { id: "prazo-pagamento", name: "Prazo de pagamento", type: "text", required: true },
      {
        id: "conemb",
        name: "Precisa de CONEMB?",
        type: "select",
        required: true,
        options: ["Sim", "Não", "A validar"],
      },
      { id: "atendimento-ocorrencias", name: "Atendimento de ocorrências", type: "longtext", required: true },
      {
        id: "portal-cliente",
        name: "Portal do cliente",
        type: "select",
        required: true,
        options: ["Liberado", "Não liberado", "A configurar"],
      },
      { id: "contrato-formalizado", name: "Formalização de contrato", type: "text", required: true },
      { id: "ticket-medio", name: "Ticket médio", type: "currency", required: true },
      { id: "margem", name: "Margem %", type: "number", required: true },
      { id: "hc-coleta", name: "HC para acompanhamento de coleta", type: "number", required: true },
      { id: "hc-cx", name: "HC para atendimento CX", type: "number", required: true },
      { id: "rasci", name: "RASCI", type: "longtext", required: true },
    ],
  },
];

const normalizeStage = (stage, index) => ({
  id: stage.id || makeId("stage"),
  name: cleanText(stage.name || `Etapa ${index + 1}`, 100),
  description: cleanText(stage.description, 500),
  slaHours: Math.max(0, Number(stage.slaHours) || 0),
  approvalRequired: !!stage.approvalRequired,
  requiredFieldIds: Array.isArray(stage.requiredFieldIds)
    ? [...new Set(stage.requiredFieldIds.filter(Boolean))]
    : [],
  terminal: !!stage.terminal,
  order: index,
});

const normalizeField = (field, index) => ({
  id: field.id || makeId("field"),
  name: cleanText(field.name || `Campo ${index + 1}`, 100),
  type: PROCESS_FIELD_TYPES.some((item) => item.id === field.type)
    ? field.type
    : "text",
  required: !!field.required,
  options: Array.isArray(field.options)
    ? field.options.map((option) => cleanText(option, 100)).filter(Boolean)
    : [],
  condition: field.condition
    ? {
        fieldId: field.condition.fieldId || "",
        operator: field.condition.operator || "equals",
        value: field.condition.value ?? "",
      }
    : null,
});

export const createProcessDefinition = (
  input = {},
  context = {},
  now = new Date().toISOString(),
) => {
  const template = PROCESS_TEMPLATES.find((item) => item.id === input.templateId);
  const source = template ? { ...template, ...input } : input;
  const fields = (source.fields || []).map(normalizeField);
  const stages = (source.stages?.length
    ? source.stages
    : [{ name: "Novo", slaHours: 24 }, { name: "Concluído", terminal: true }]
  ).map(normalizeStage);
  stages[stages.length - 1] = {
    ...stages[stages.length - 1],
    terminal: true,
  };
  return {
    id: source.id || makeId("process"),
    name: cleanText(source.name || template?.name || "Novo processo", 120),
    description: cleanText(source.description || template?.description, 1000),
    serviceCode: cleanText(source.serviceCode, 40),
    active: source.active !== false,
    fields,
    stages,
    connections: {
      baseId: source.connections?.baseId || "",
      createTask: !!source.connections?.createTask,
      taskProjectId: source.connections?.taskProjectId || "",
    },
    businessId: context.businessId || source.businessId || null,
    ownerId: context.ownerId || source.ownerId || null,
    visibility: source.visibility || "espaco_todo",
    createdAt: source.createdAt || now,
    updatedAt: now,
  };
};

export const fieldIsVisible = (field, values = {}) => {
  if (!field?.condition?.fieldId) return true;
  const actual = values[field.condition.fieldId];
  const expected = field.condition.value;
  if (field.condition.operator === "not_equals")
    return String(actual ?? "") !== String(expected ?? "");
  if (field.condition.operator === "contains")
    return Array.isArray(actual)
      ? actual.map(String).includes(String(expected))
      : String(actual ?? "").includes(String(expected ?? ""));
  return String(actual ?? "") === String(expected ?? "");
};

export const validateProcessValues = (process, values = {}, stageId = null) => {
  const stage = process?.stages?.find((item) => item.id === stageId);
  const stageRequired = new Set(stage?.requiredFieldIds || []);
  const errors = {};
  for (const field of process?.fields || []) {
    if (!fieldIsVisible(field, values)) continue;
    const required = field.required || stageRequired.has(field.id);
    const value = values[field.id];
    const empty =
      value == null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (field.type === "checkbox" && value !== true);
    if (required && empty) errors[field.id] = `${field.name} é obrigatório.`;
    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      errors[field.id] = "Informe um e-mail válido.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

export const createProcessCase = (
  process,
  values,
  context = {},
  now = new Date().toISOString(),
) => {
  const validation = validateProcessValues(process, values);
  if (!validation.valid) return { caseRecord: null, errors: validation.errors };
  const firstStage = process.stages[0];
  const protocol =
    context.protocol ||
    `${String(process.serviceCode || "PROC").toUpperCase()}-${now.slice(0, 10).replaceAll("-", "")}-${String(context.sequence || 1).padStart(4, "0")}`;
  return {
    errors: {},
    caseRecord: {
      id: context.id || makeId("case"),
      processId: process.id,
      protocol,
      title:
        cleanText(context.title, 160) ||
        cleanText(values[process.fields[0]?.id], 160) ||
        `Solicitação ${protocol}`,
      values: { ...values },
      stageId: firstStage.id,
      status: "ativo",
      priority: context.priority || "Média",
      requesterId: context.requesterId || null,
      requesterName: cleanText(context.requesterName, 120),
      requesterEmail: cleanText(context.requesterEmail, 160),
      assigneeId: context.assigneeId || null,
      ownerId: context.ownerId || process.ownerId || null,
      businessId: context.businessId || process.businessId || null,
      history: [
        {
          id: makeId("event"),
          type: "created",
          stageId: firstStage.id,
          actorId: context.requesterId || null,
          actorName: cleanText(context.requesterName, 120),
          at: now,
        },
      ],
      approvals: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
      stageEnteredAt: now,
      completedAt: null,
      linkedRecord: null,
      linkedTaskId: null,
      visibility: process.visibility || "espaco_todo",
    },
  };
};

export const processSla = (process, caseRecord, nowMs = Date.now()) => {
  const stage = process?.stages?.find((item) => item.id === caseRecord?.stageId);
  const hours = Number(stage?.slaHours) || 0;
  if (!hours || caseRecord?.status === "concluido")
    return { status: "sem_sla", elapsedHours: 0, remainingHours: null, dueAt: null };
  const entered = Date.parse(caseRecord.stageEnteredAt || caseRecord.createdAt);
  const elapsedHours = Math.max(0, (nowMs - entered) / 3_600_000);
  const remainingHours = hours - elapsedHours;
  return {
    status:
      remainingHours < 0
        ? "atrasado"
        : remainingHours <= Math.max(1, hours * 0.2)
          ? "em_risco"
          : "no_prazo",
    elapsedHours,
    remainingHours,
    dueAt: new Date(entered + hours * 3_600_000).toISOString(),
  };
};

export const transitionProcessCase = (
  process,
  caseRecord,
  targetStageId,
  context = {},
  now = new Date().toISOString(),
) => {
  const currentIndex = process?.stages?.findIndex(
    (stage) => stage.id === caseRecord?.stageId,
  );
  const targetIndex = process?.stages?.findIndex((stage) => stage.id === targetStageId);
  if (currentIndex < 0 || targetIndex < 0)
    return { caseRecord, error: "Etapa inválida." };
  if (!context.allowJump && Math.abs(targetIndex - currentIndex) > 1)
    return { caseRecord, error: "A movimentação deve respeitar a sequência." };
  const validation = validateProcessValues(process, caseRecord.values, targetStageId);
  if (!validation.valid)
    return { caseRecord, error: "Preencha os campos obrigatórios da etapa.", errors: validation.errors };
  const target = process.stages[targetIndex];
  if (target.approvalRequired && !context.approved)
    return { caseRecord, error: "Esta etapa exige aprovação antes da entrada." };
  const completed = !!target.terminal;
  return {
    error: "",
    errors: {},
    caseRecord: {
      ...caseRecord,
      stageId: target.id,
      status: completed ? "concluido" : "ativo",
      completedAt: completed ? now : null,
      stageEnteredAt: now,
      updatedAt: now,
      approvals: context.approved
        ? [
            ...(caseRecord.approvals || []),
            {
              id: makeId("approval"),
              stageId: target.id,
              decision: "aprovado",
              actorId: context.actorId || null,
              actorName: cleanText(context.actorName, 120),
              at: now,
            },
          ]
        : caseRecord.approvals || [],
      history: [
        ...(caseRecord.history || []),
        {
          id: makeId("event"),
          type: completed ? "completed" : "transition",
          fromStageId: caseRecord.stageId,
          stageId: target.id,
          actorId: context.actorId || null,
          actorName: cleanText(context.actorName, 120),
          at: now,
        },
      ],
    },
  };
};

export const processMetrics = (process, cases = [], nowMs = Date.now()) => {
  const scoped = (cases || []).filter((item) => item.processId === process?.id);
  const active = scoped.filter((item) => item.status !== "concluido");
  const completed = scoped.filter((item) => item.status === "concluido");
  const delayed = active.filter(
    (item) => processSla(process, item, nowMs).status === "atrasado",
  );
  const averageHours = completed.length
    ? completed.reduce(
        (sum, item) =>
          sum +
          Math.max(0, Date.parse(item.completedAt) - Date.parse(item.createdAt)) /
            3_600_000,
        0,
      ) / completed.length
    : 0;
  return {
    total: scoped.length,
    active: active.length,
    completed: completed.length,
    delayed: delayed.length,
    completionRate: scoped.length ? (completed.length / scoped.length) * 100 : 0,
    averageHours,
    byStage: (process?.stages || []).map((stage) => ({
      stageId: stage.id,
      name: stage.name,
      count: scoped.filter((item) => item.stageId === stage.id).length,
    })),
  };
};

export const buildProcessConnections = (
  process,
  caseRecord,
  databases,
  context = {},
) => {
  const result = { databases: databases || [], task: null, linkedRecord: null };
  const base = (databases || []).find(
    (item) => item.id === process?.connections?.baseId,
  );
  if (base) {
    const cells = {};
    for (const field of process.fields || []) {
      const target = (base.fields || []).find(
        (baseField) =>
          String(baseField.name).toLowerCase() === String(field.name).toLowerCase(),
      );
      if (target) cells[target.id] = caseRecord.values?.[field.id] ?? "";
    }
    const rowId = context.recordId || makeId("record");
    result.databases = (databases || []).map((item) =>
      item.id === base.id
        ? {
            ...item,
            rows: [
              ...(item.rows || []),
              {
                id: rowId,
                cells,
                content: `Protocolo: ${caseRecord.protocol}`,
                attachments: [],
                comments: [],
                createdAt: caseRecord.createdAt,
                updatedAt: caseRecord.updatedAt,
                sourceProcessId: process.id,
                sourceCaseId: caseRecord.id,
              },
            ],
          }
        : item,
    );
    result.linkedRecord = { baseId: base.id, rowId };
  }
  if (process?.connections?.createTask) {
    result.task = {
      id: context.taskId || makeId("task"),
      title: caseRecord.title,
      description: `Executar solicitação ${caseRecord.protocol} do processo ${process.name}.`,
      status: "A fazer",
      priority: caseRecord.priority || "Média",
      area: "Operação",
      projectId: process.connections.taskProjectId || null,
      ownerId: context.ownerId || process.ownerId || null,
      businessId: context.businessId || process.businessId || null,
      visibility: "espaco_todo",
      sourceProcessId: process.id,
      sourceCaseId: caseRecord.id,
      createdAt: caseRecord.createdAt,
    };
  }
  return result;
};
