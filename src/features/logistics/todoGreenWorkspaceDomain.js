const list = (value) => (Array.isArray(value) ? value : []);

export const TODO_GREEN_WORKSPACE_TOOLS = Object.freeze([
  {
    id: "visao-geral",
    label: "Visão geral",
    description: "Contexto, pendências e acessos rápidos em um só lugar.",
  },
  {
    id: "notas",
    label: "Notas conectadas",
    description: "Cadernos, diário, backlinks, grafo e notas ligadas ao CRM.",
  },
  {
    id: "paginas",
    label: "Páginas e documentos",
    description: "Editor em blocos, arquivos, versões e páginas ligadas ao CRM.",
  },
  {
    id: "automacoes",
    label: "Automações",
    description: "Gatilhos, condições e ações executadas no servidor com histórico.",
  },
  {
    id: "estrutura",
    label: "Estrutura",
    description: "Workspaces, espaços, pastas e listas sem duplicar projetos.",
  },
  {
    id: "bases",
    label: "Bases",
    description: "Tabelas relacionais, campos próprios e visões por contexto.",
  },
  {
    id: "processos",
    label: "Processos",
    description: "Solicitações, formulários, etapas, aprovações e SLAs.",
  },
  {
    id: "capacidade",
    label: "Capacidade",
    description: "Pessoas, disponibilidade, alocação, carga e conflitos.",
  },
  {
    id: "quadro-livre",
    label: "Quadro livre",
    description: "Post-its, votação, agrupamento e conversão em tarefas.",
  },
]);

export const isTodoGreenWorkspaceRecord = (record = {}, businessId = "todogreen") =>
  record.businessId === businessId ||
  record.tenantId === businessId ||
  String(record.source || "").startsWith("todogreen");

const scoped = (items, businessId) =>
  list(items).filter((item) => isTodoGreenWorkspaceRecord(item, businessId));

export const buildTodoGreenWorkspaceSummary = ({
  db = {},
  verticalData = {},
  businessId = "todogreen",
  today = new Date().toISOString().slice(0, 10),
} = {}) => {
  const tasks = scoped(db.tasks, businessId);
  const processes = scoped(db.processes, businessId);
  const processIds = new Set(processes.map((item) => item.id));
  const cases = list(db.processCases).filter(
    (item) => isTodoGreenWorkspaceRecord(item, businessId) || processIds.has(item.processId),
  );
  const openCases = cases.filter((item) => !["done", "completed", "cancelled"].includes(item.status));
  const opportunities = list(verticalData.opportunities);
  const openOpportunities = opportunities.filter(
    (item) => !["won", "lost", "closed", "ganha", "perdida"].includes(String(item.status || "").toLowerCase()),
  );

  return {
    clients: list(verticalData.clients).length,
    openOpportunities: openOpportunities.length,
    overdueTasks: tasks.filter(
      (item) => item.due && item.due < today && !["Concluído", "done", "completed"].includes(item.status),
    ).length,
    openTasks: tasks.filter(
      (item) => !["Concluído", "done", "completed"].includes(item.status),
    ).length,
    notes: scoped(db.notes, businessId).length,
    pages: scoped(db.documents, businessId).length,
    bases: scoped(db.databases, businessId).length,
    processes: processes.length,
    openCases: openCases.length,
    workNodes: scoped(db.workNodes, businessId).length,
    resources: scoped(db.resourceProfiles, businessId).length,
    boards: scoped(db.boards, businessId).length,
  };
};

export const linkedEntityFor = (type, record = {}) => {
  if (!record.id) return null;
  const isClient = type === "client";
  const name = String(record.name || record.title || record.company || "").trim();
  return {
    type: isClient ? "client" : "opportunity",
    id: record.id,
    name: name || (isClient ? "Cliente" : "Oportunidade"),
    route: isClient
      ? `/todogreen/clientes?client=${encodeURIComponent(record.id)}`
      : `/todogreen/oportunidades?opportunity=${encodeURIComponent(record.id)}`,
  };
};

export const findLinkedNote = (notes, entity) =>
  list(notes).find((note) =>
    list(note.linkedEntities).some(
      (linked) => linked.type === entity?.type && linked.id === entity?.id,
    ),
  ) || null;

export const findLinkedDocument = (documents, entity) =>
  list(documents).find((document) =>
    list(document.linkedEntities).some(
      (linked) => linked.type === entity?.type && linked.id === entity?.id,
    ),
  ) || null;
