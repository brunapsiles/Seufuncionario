const makeId = (prefix = "form") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const cleanText = (value, max = 500) =>
  String(value == null ? "" : value)
    .trim()
    .slice(0, max);

const unique = (values = []) => [...new Set(values.filter(Boolean))];

const validColor = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;

const validUrl = (value) => {
  const text = cleanText(value, 1000);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

export const PUBLIC_FORM_FIELD_TYPES = [
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
  { id: "file", label: "Upload de arquivo" },
];

export const PUBLIC_FORM_DESTINATIONS = [
  { id: "response", label: "Somente resposta" },
  { id: "task", label: "Criar tarefa" },
  { id: "lead", label: "Criar lead no CRM" },
  { id: "ticket", label: "Abrir chamado" },
  { id: "process", label: "Iniciar processo" },
];

export const PUBLIC_FORM_TEMPLATES = [
  {
    id: "lead",
    name: "Captação de lead",
    description: "Recebe contatos e cria oportunidades no CRM.",
    destination: { type: "lead" },
    fields: [
      { label: "Empresa", type: "text" },
      { label: "Como podemos ajudar?", type: "longtext", required: true },
    ],
  },
  {
    id: "ticket",
    name: "Abertura de chamado",
    description: "Registra solicitações de atendimento e gera protocolo.",
    destination: { type: "ticket" },
    fields: [
      { label: "Assunto", type: "text", required: true },
      { label: "Detalhes", type: "longtext", required: true },
      {
        label: "Prioridade",
        type: "select",
        required: true,
        options: ["Baixa", "Média", "Alta", "Crítica"],
      },
      { label: "Evidências", type: "file" },
    ],
  },
  {
    id: "registration",
    name: "Cadastro público",
    description: "Coleta dados, documentos e consentimento em um único link.",
    destination: { type: "response" },
    signature: { enabled: true, required: true },
    fields: [
      { label: "Documento", type: "text", required: true },
      { label: "Observações", type: "longtext" },
      { label: "Anexos", type: "file", required: true },
    ],
  },
  {
    id: "payment",
    name: "Solicitação com pagamento",
    description: "Apresenta Pix ou link de pagamento e guarda a confirmação.",
    destination: { type: "response" },
    payment: { enabled: true, required: true, method: "pix" },
    fields: [
      { label: "Referência do pedido", type: "text", required: true },
      { label: "Comprovante", type: "file" },
    ],
  },
];

export const slugifyPublicForm = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const normalizeCondition = (condition) => {
  if (!condition?.fieldId) return null;
  return {
    fieldId: cleanText(condition.fieldId, 100),
    operator: ["equals", "not_equals", "contains"].includes(condition.operator)
      ? condition.operator
      : "equals",
    value: cleanText(condition.value, 200),
  };
};

export const normalizePublicFormField = (field = {}, index = 0) => {
  const type = PUBLIC_FORM_FIELD_TYPES.some((item) => item.id === field.type)
    ? field.type
    : "text";
  return {
    id: cleanText(field.id, 100) || makeId("field"),
    label: cleanText(field.label || field.name || `Campo ${index + 1}`, 100),
    type,
    required: !!field.required,
    placeholder: cleanText(field.placeholder, 160),
    help: cleanText(field.help, 300),
    options: unique(
      (Array.isArray(field.options) ? field.options : [])
        .map((option) => cleanText(option, 100))
        .filter(Boolean),
    ).slice(0, 50),
    condition: normalizeCondition(field.condition),
    processFieldId: cleanText(field.processFieldId, 100),
    multiple: type === "file" ? field.multiple !== false : false,
  };
};

export const normalizePublicForm = (
  input = {},
  context = {},
  now = new Date().toISOString(),
) => {
  const template = PUBLIC_FORM_TEMPLATES.find(
    (item) => item.id === input.templateId,
  );
  const source = template ? { ...template, ...input } : input;
  const name = cleanText(source.name || template?.name || "Novo formulário", 120);
  const id = cleanText(source.id, 100) || makeId("public-form");
  const destinationType = PUBLIC_FORM_DESTINATIONS.some(
    (item) => item.id === source.destination?.type,
  )
    ? source.destination.type
    : "response";
  return {
    id,
    name,
    slug:
      slugifyPublicForm(source.slug || name) ||
      `formulario-${String(id).replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase()}`,
    title: cleanText(source.title || name, 140),
    description: cleanText(
      source.description || template?.description,
      1000,
    ),
    serviceCode:
      cleanText(source.serviceCode || "FORM", 12)
        .replace(/[^a-z0-9]/gi, "")
        .toUpperCase() || "FORM",
    active: source.active !== false,
    fields: (Array.isArray(source.fields) ? source.fields : []).map(
      normalizePublicFormField,
    ),
    contact: {
      collectName: source.contact?.collectName !== false,
      requireName: source.contact?.requireName !== false,
      collectEmail: source.contact?.collectEmail !== false,
      requireEmail: !!source.contact?.requireEmail,
      collectPhone: source.contact?.collectPhone !== false,
      requirePhone: !!source.contact?.requirePhone,
    },
    destination: {
      type: destinationType,
      processId: cleanText(source.destination?.processId, 100),
      projectId: cleanText(source.destination?.projectId, 100),
      taskArea: cleanText(source.destination?.taskArea || "Operação", 80),
    },
    signature: {
      enabled: !!source.signature?.enabled,
      required: !!source.signature?.enabled && !!source.signature?.required,
      consentText: cleanText(
        source.signature?.consentText ||
          "Declaro que as informações enviadas são verdadeiras e assino eletronicamente este formulário.",
        500,
      ),
    },
    payment: {
      enabled: !!source.payment?.enabled,
      required: !!source.payment?.enabled && !!source.payment?.required,
      method: source.payment?.method === "link" ? "link" : "pix",
      amount: Math.max(0, Number(source.payment?.amount) || 0),
      pixCode: cleanText(source.payment?.pixCode, 1000),
      link: validUrl(source.payment?.link),
      instructions: cleanText(source.payment?.instructions, 1000),
    },
    privacy: {
      consentRequired: source.privacy?.consentRequired !== false,
      consentText: cleanText(
        source.privacy?.consentText ||
          "Autorizo o uso destes dados para atendimento desta solicitação.",
        700,
      ),
    },
    appearance: {
      primaryColor: validColor(source.appearance?.primaryColor, "#6d38e0"),
      backgroundColor: validColor(
        source.appearance?.backgroundColor,
        "#f6f4fb",
      ),
      cardColor: validColor(source.appearance?.cardColor, "#ffffff"),
      textColor: validColor(source.appearance?.textColor, "#211846"),
      logoUrl: validUrl(source.appearance?.logoUrl),
      buttonLabel: cleanText(source.appearance?.buttonLabel || "Enviar", 40),
      successMessage: cleanText(
        source.appearance?.successMessage ||
          "Recebemos sua resposta. Guarde o protocolo para acompanhamento.",
        500,
      ),
      showBranding: source.appearance?.showBranding !== false,
    },
    businessId: context.businessId || source.businessId || null,
    workspaceOwnerId:
      context.workspaceOwnerId || source.workspaceOwnerId || null,
    ownerId: context.ownerId || source.ownerId || null,
    visibility: source.visibility || "espaco_todo",
    sharedWith: Array.isArray(source.sharedWith) ? source.sharedWith : [],
    sharedTeams: Array.isArray(source.sharedTeams) ? source.sharedTeams : [],
    sharingPermission: source.sharingPermission || "editar",
    published: !!source.published,
    publishedUrl: cleanText(source.publishedUrl, 1000),
    publishedAt: source.publishedAt || null,
    createdAt: source.createdAt || now,
    updatedAt: now,
  };
};

export const createPublicFormFromProcess = (
  process,
  input = {},
  context = {},
) =>
  normalizePublicForm(
    {
      ...input,
      name: input.name || process?.name || "Formulário do processo",
      title: input.title || process?.name || "Nova solicitação",
      description: input.description || process?.description || "",
      serviceCode: input.serviceCode || process?.serviceCode || "PROC",
      destination: { type: "process", processId: process?.id || "" },
      fields: (process?.fields || []).map((field) => ({
        id: field.id,
        label: field.name,
        type: field.type,
        required: field.required,
        options: field.options || [],
        condition: field.condition || null,
        processFieldId: field.id,
      })),
    },
    context,
  );

export const publicFormFieldIsVisible = (field, values = {}) => {
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

const valueIsEmpty = (field, value, attachments = []) => {
  if (field.type === "file")
    return !attachments.some((attachment) => attachment.fieldId === field.id);
  if (field.type === "checkbox") return value !== true;
  return (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
};

export const validatePublicFormSubmission = (
  form,
  submission = {},
) => {
  const errors = {};
  const contact = submission.contact || {};
  if (form.contact?.collectName && form.contact?.requireName && !cleanText(contact.name))
    errors.name = "Informe seu nome.";
  if (
    form.contact?.collectEmail &&
    form.contact?.requireEmail &&
    !cleanText(contact.email)
  )
    errors.email = "Informe seu e-mail.";
  if (
    cleanText(contact.email) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(contact.email))
  )
    errors.email = "Informe um e-mail válido.";
  if (
    form.contact?.collectPhone &&
    form.contact?.requirePhone &&
    !cleanText(contact.phone)
  )
    errors.phone = "Informe seu telefone.";

  const values = submission.values || {};
  const attachments = Array.isArray(submission.attachments)
    ? submission.attachments
    : [];
  for (const field of form.fields || []) {
    if (!publicFormFieldIsVisible(field, values)) continue;
    const value = values[field.id];
    if (field.required && valueIsEmpty(field, value, attachments))
      errors[field.id] = `${field.label} é obrigatório.`;
    if (
      value &&
      field.type === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
    )
      errors[field.id] = "Informe um e-mail válido.";
    if (
      value &&
      ["select", "multiselect"].includes(field.type) &&
      field.options?.length
    ) {
      const selected = Array.isArray(value) ? value : [value];
      if (selected.some((item) => !field.options.includes(String(item))))
        errors[field.id] = "Selecione somente opções disponíveis.";
    }
  }
  if (
    form.signature?.enabled &&
    form.signature?.required &&
    (!cleanText(submission.signature?.name) ||
      submission.signature?.consent !== true)
  )
    errors.signature = "Preencha e confirme a assinatura.";
  if (
    form.payment?.enabled &&
    form.payment?.required &&
    submission.payment?.acknowledged !== true
  )
    errors.payment = "Confirme o pagamento para continuar.";
  if (form.privacy?.consentRequired && submission.privacyConsent !== true)
    errors.privacy = "Autorize o uso dos dados para enviar.";
  return { valid: Object.keys(errors).length === 0, errors };
};

export const publicFormEmbedCode = (url, title = "Formulário") =>
  `<iframe src="${String(url || "").replaceAll('"', "&quot;")}" title="${String(
    title || "Formulário",
  ).replaceAll('"', "&quot;")}" width="100%" height="760" style="border:0;border-radius:16px" loading="lazy"></iframe>`;

export const publicFormAnswerSummary = (form, values = {}) =>
  (form.fields || [])
    .filter((field) => publicFormFieldIsVisible(field, values))
    .filter((field) => field.type !== "file")
    .map((field) => {
      const raw = values[field.id];
      const value = Array.isArray(raw) ? raw.join(", ") : raw;
      return value == null || value === ""
        ? null
        : `${field.label}: ${field.type === "checkbox" ? (value ? "Sim" : "Não") : value}`;
    })
    .filter(Boolean)
    .join("\n");
