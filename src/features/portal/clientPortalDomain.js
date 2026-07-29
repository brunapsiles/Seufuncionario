const text = (value, max = 240) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const list = (value, max = 300) =>
  [...new Set((Array.isArray(value) ? value : []).map(String))]
    .filter(Boolean)
    .slice(0, max);

const dateValue = (value) => {
  const normalized = text(value, 30);
  if (!normalized) return "";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "" : normalized;
};

const httpsUrl = (value, max = 1000) => {
  const normalized = text(value, max);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

export const CLIENT_PORTAL_PERMISSION_LABELS = {
  viewProjects: "Acompanhar projetos",
  viewTasks: "Ver tarefas",
  approveDeliveries: "Aprovar entregas",
  viewDocuments: "Ver documentos",
  uploadDocuments: "Enviar documentos",
  openTickets: "Abrir chamados",
  viewQuotes: "Consultar orçamentos",
  viewOrders: "Consultar pedidos",
  viewTracking: "Acompanhar entregas",
  downloadReports: "Baixar relatórios",
};

export const CLIENT_PORTAL_DEFAULT_PERMISSIONS = {
  viewProjects: true,
  viewTasks: true,
  approveDeliveries: true,
  viewDocuments: true,
  uploadDocuments: true,
  openTickets: true,
  viewQuotes: true,
  viewOrders: true,
  viewTracking: true,
  downloadReports: true,
};

export const CLIENT_PORTAL_RESOURCE_GROUPS = [
  { key: "projectIds", label: "Projetos" },
  { key: "taskIds", label: "Tarefas avulsas" },
  { key: "documentIds", label: "Documentos" },
  { key: "reportIds", label: "Relatórios para download" },
  { key: "quoteIds", label: "Orçamentos" },
  { key: "orderIds", label: "Pedidos" },
  { key: "tripIds", label: "Entregas e viagens" },
];

export function normalizeClientPortal(raw = {}, context = {}) {
  const now = context.now || new Date().toISOString();
  const permissions = {};
  for (const key of Object.keys(CLIENT_PORTAL_DEFAULT_PERMISSIONS))
    permissions[key] =
      typeof raw.permissions?.[key] === "boolean"
        ? raw.permissions[key]
        : CLIENT_PORTAL_DEFAULT_PERMISSIONS[key];
  const resources = {
    projectIds: list(raw.resources?.projectIds),
    taskIds: list(raw.resources?.taskIds),
    documentIds: list(raw.resources?.documentIds),
    reportIds: list(raw.resources?.reportIds),
    quoteIds: list(raw.resources?.quoteIds),
    orderIds: list(raw.resources?.orderIds),
    tripIds: list(raw.resources?.tripIds),
    includeProjectTasks: raw.resources?.includeProjectTasks !== false,
  };
  resources.reportIds = resources.reportIds.filter((id) =>
    resources.documentIds.includes(id),
  );
  const expiresAt = dateValue(raw.expiresAt);
  return {
    id:
      text(raw.id, 100) ||
      globalThis.crypto?.randomUUID?.() ||
      `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: text(raw.name, 120) || "Portal do cliente",
    clientName: text(raw.clientName, 160),
    clientEmail: text(raw.clientEmail, 240).toLowerCase(),
    title: text(raw.title, 160) || "Acompanhamento do cliente",
    welcome:
      text(raw.welcome, 1200) ||
      "Acompanhe aqui os itens compartilhados com você.",
    supportText: text(raw.supportText, 500),
    permissions,
    resources,
    appearance: {
      primaryColor: /^#[0-9a-f]{6}$/i.test(raw.appearance?.primaryColor || "")
        ? raw.appearance.primaryColor
        : "#6d38e0",
      accentColor: /^#[0-9a-f]{6}$/i.test(raw.appearance?.accentColor || "")
        ? raw.appearance.accentColor
        : "#ed3e91",
      logoUrl: httpsUrl(raw.appearance?.logoUrl),
    },
    expiresAt,
    ownerId: text(raw.ownerId, 100) || context.ownerId || "",
    workspaceOwnerId:
      text(raw.workspaceOwnerId, 100) || context.workspaceOwnerId || "",
    businessId: text(raw.businessId, 100) || context.businessId || null,
    visibility: raw.visibility || "privado",
    sharingPermission:
      raw.sharingPermission === "editar" ? "editar" : "visualizar",
    sharedWith: list(raw.sharedWith, 100),
    sharedTeams: list(raw.sharedTeams, 100),
    createdAt: dateValue(raw.createdAt) || now,
    updatedAt: now,
  };
}

const selected = (records, ids) => {
  const wanted = new Set(ids || []);
  return (Array.isArray(records) ? records : []).filter((record) =>
    wanted.has(record?.id),
  );
};

const attachmentMetadata = (attachments) =>
  (Array.isArray(attachments) ? attachments : []).slice(0, 20).map((item) => ({
    id: text(item?.id, 100),
    name: text(item?.name, 240),
    type: text(item?.type, 120),
    size: Math.max(0, Number(item?.size) || 0),
  }));

const safeDelivery = (delivery) => ({
  id: text(delivery?.id, 100),
  comment: text(delivery?.comment, 3000),
  authorName: text(delivery?.authorName, 160),
  createdAt: dateValue(delivery?.createdAt),
  status: text(delivery?.status, 80),
  feedback: text(delivery?.feedback, 1600),
  clientDecision: text(delivery?.clientDecision, 80),
  clientFeedback: text(delivery?.clientFeedback, 1600),
  clientDecidedAt: dateValue(delivery?.clientDecidedAt),
  attachments: attachmentMetadata(delivery?.attachments),
});

const safeTask = (task) => ({
  id: text(task?.id, 100),
  title: text(task?.title, 240),
  description: text(task?.description, 3000),
  status: text(task?.status, 80),
  priority: text(task?.priority, 80),
  startDate: text(task?.startDate, 30),
  due: text(task?.due, 30),
  project: text(task?.project, 200),
  projectId: text(task?.projectId, 100),
  clientApprovalStatus: text(task?.clientApprovalStatus, 80),
  deliveries: (Array.isArray(task?.deliveries) ? task.deliveries : [])
    .slice(-10)
    .map(safeDelivery),
});

const safeProject = (project, tasks) => {
  const related = tasks.filter(
    (task) =>
      task.projectId === project.id ||
      (!task.projectId && task.project && task.project === project.name),
  );
  const completed = related.filter((task) => task.status === "Concluído").length;
  return {
    id: text(project?.id, 100),
    name: text(project?.name, 240),
    objective: text(project?.objective, 3000),
    scope: text(project?.scope, 3000),
    status: text(project?.status, 80),
    startDate: text(project?.startDate, 30),
    endDate: text(project?.endDate, 30),
    progress: related.length ? Math.round((completed / related.length) * 100) : 0,
    taskCount: related.length,
    completedTasks: completed,
    milestones: (Array.isArray(project?.milestones) ? project.milestones : [])
      .slice(0, 100)
      .map((milestone) => ({
        id: text(milestone?.id, 100),
        title: text(milestone?.title, 240),
        type: text(milestone?.type, 80),
        plannedDate: text(milestone?.plannedDate, 30),
        status: text(milestone?.status, 80),
      })),
  };
};

const safeDocument = (document, downloadable) => ({
  id: text(document?.id, 100),
  title: text(document?.title || document?.name, 240),
  type: text(document?.type || document?.category, 120),
  updatedAt: dateValue(document?.updatedAt || document?.createdAt),
  content: text(document?.content, 60_000),
  downloadable: !!downloadable,
});

const safeQuote = (quote) => ({
  id: text(quote?.id, 100),
  clientName: text(quote?.clientName, 160),
  status: text(quote?.status, 80),
  validUntil: text(quote?.validUntil, 30),
  notes: text(quote?.notes, 1600),
  total:
    Number(quote?.total) ||
    (Array.isArray(quote?.items) ? quote.items : []).reduce(
      (sum, item) =>
        sum + (Number(item?.quantity) || 0) * (Number(item?.price) || 0),
      0,
    ) -
      (Number(quote?.discount) || 0),
  items: (Array.isArray(quote?.items) ? quote.items : [])
    .slice(0, 100)
    .map((item) => ({
      id: text(item?.id, 100),
      name: text(item?.name, 240),
      quantity: Number(item?.quantity) || 0,
      price: Number(item?.price) || 0,
    })),
});

const safeOrder = (order) => ({
  id: text(order?.id, 100),
  clientName: text(order?.clientName, 160),
  status: text(order?.status, 80),
  channel: text(order?.channel, 80),
  notes: text(order?.notes, 1000),
  total: Number(order?.total) || 0,
  deliveryFee: Number(order?.deliveryFee) || 0,
  createdAt: dateValue(order?.createdAt),
  updatedAt: dateValue(order?.updatedAt),
  items: (Array.isArray(order?.items) ? order.items : [])
    .slice(0, 100)
    .map((item) => ({
      id: text(item?.id || item?.productId, 100),
      name: text(item?.name, 240),
      quantity: Number(item?.quantity) || 0,
      price: Number(item?.price) || 0,
    })),
});

const safeTrip = (trip) => ({
  id: text(trip?.id, 100),
  code: text(trip?.code || trip?.reference || trip?.name, 160),
  status: text(trip?.status, 80),
  origin: text(trip?.origin, 300),
  destination: text(trip?.destination, 300),
  eta: dateValue(trip?.eta || trip?.estimatedArrival),
  startedAt: dateValue(trip?.startedAt || trip?.departureAt),
  completedAt: dateValue(trip?.completedAt || trip?.deliveredAt),
  driverName: text(trip?.driverName || trip?.driver, 160),
  vehicle: text(trip?.vehicleName || trip?.vehicle, 160),
  occurrence: text(trip?.occurrence || trip?.notes, 1200),
});

export function buildClientPortalSnapshot(data = {}, rawPortal = {}) {
  const portal = normalizeClientPortal(rawPortal, {
    ownerId: rawPortal.ownerId,
    workspaceOwnerId: rawPortal.workspaceOwnerId,
    businessId: rawPortal.businessId,
    now: rawPortal.updatedAt || rawPortal.createdAt,
  });
  const projectRecords = selected(data.projects, portal.resources.projectIds);
  const projectIds = new Set(projectRecords.map((project) => project.id));
  const projectNames = new Set(projectRecords.map((project) => project.name));
  const explicitTaskIds = new Set(portal.resources.taskIds);
  const taskRecords = (Array.isArray(data.tasks) ? data.tasks : []).filter(
    (task) =>
      explicitTaskIds.has(task.id) ||
      (portal.resources.includeProjectTasks &&
        (projectIds.has(task.projectId) || projectNames.has(task.project))),
  );
  const tasks = portal.permissions.viewTasks
    ? taskRecords.map(safeTask)
    : portal.permissions.approveDeliveries
      ? taskRecords
          .filter((task) => (task.deliveries || []).length > 0)
          .map(safeTask)
      : [];
  const reportIds = new Set(portal.resources.reportIds);
  const documents = portal.permissions.viewDocuments
    ? selected(data.documents, portal.resources.documentIds).map((document) =>
        safeDocument(
          document,
          portal.permissions.downloadReports && reportIds.has(document.id),
        ),
      )
    : [];
  return {
    portal: {
      id: portal.id,
      name: portal.name,
      clientName: portal.clientName,
      clientEmail: portal.clientEmail,
      title: portal.title,
      welcome: portal.welcome,
      supportText: portal.supportText,
      permissions: portal.permissions,
      appearance: portal.appearance,
      expiresAt: portal.expiresAt,
    },
    business: {
      name: text(
        (Array.isArray(data.businesses) ? data.businesses : []).find(
          (business) => business.id === portal.businessId,
        )?.name,
        160,
      ),
    },
    projects: portal.permissions.viewProjects
      ? projectRecords.map((project) => safeProject(project, tasks))
      : [],
    tasks,
    documents,
    quotes: portal.permissions.viewQuotes
      ? selected(data.quotes, portal.resources.quoteIds).map(safeQuote)
      : [],
    orders: portal.permissions.viewOrders
      ? selected(data.orders, portal.resources.orderIds).map(safeOrder)
      : [],
    trips: portal.permissions.viewTracking
      ? selected(data.trips, portal.resources.tripIds).map(safeTrip)
      : [],
  };
}

export function clientPortalSummary(snapshot = {}) {
  const pendingDeliveries = (snapshot.tasks || []).filter((task) => {
    const latest = task.deliveries?.[task.deliveries.length - 1];
    return latest && !latest.clientDecision;
  }).length;
  return {
    projects: snapshot.projects?.length || 0,
    openTasks:
      snapshot.tasks?.filter((task) => task.status !== "Concluído").length || 0,
    pendingDeliveries,
    documents: snapshot.documents?.length || 0,
    quotes: snapshot.quotes?.length || 0,
    orders: snapshot.orders?.length || 0,
    tracking: snapshot.trips?.length || 0,
  };
}

export function clientPortalResourceCount(portal = {}) {
  const resources = normalizeClientPortal(portal).resources;
  return CLIENT_PORTAL_RESOURCE_GROUPS.reduce(
    (total, group) => total + resources[group.key].length,
    0,
  );
}

export function validateClientPortalAction(action = {}, snapshot = {}) {
  const type = text(action.type, 80);
  const permissions = snapshot.portal?.permissions || {};
  if (type === "ticket") {
    if (!permissions.openTickets)
      return { valid: false, error: "A abertura de chamados não está liberada." };
    if (!text(action.title, 200) || !text(action.description, 4000))
      return { valid: false, error: "Informe o assunto e a descrição." };
    return { valid: true, type };
  }
  if (type === "upload") {
    if (!permissions.uploadDocuments)
      return { valid: false, error: "O envio de documentos não está liberado." };
    if (!action.file?.name || !action.file?.dataUrl)
      return { valid: false, error: "Selecione um arquivo." };
    return { valid: true, type };
  }
  if (type === "delivery") {
    if (!permissions.approveDeliveries)
      return { valid: false, error: "A aprovação de entregas não está liberada." };
    const task = (snapshot.tasks || []).find((item) => item.id === action.taskId);
    const delivery = task?.deliveries?.find(
      (item) => item.id === action.deliveryId,
    );
    if (!task || !delivery)
      return { valid: false, error: "Entrega não encontrada neste portal." };
    if (!["approved", "changes_requested"].includes(action.decision))
      return { valid: false, error: "Decisão inválida." };
    return { valid: true, type, task, delivery };
  }
  return { valid: false, error: "Ação não reconhecida." };
}
