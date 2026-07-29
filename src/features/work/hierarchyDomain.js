export const WORK_NODE_TYPES = [
  ["workspace", "Workspace"],
  ["space", "Espaço"],
  ["folder", "Pasta"],
  ["list", "Lista"],
];

export const WORK_CHILDREN = {
  organization: ["workspace"],
  workspace: ["space"],
  space: ["folder", "list"],
  folder: ["folder", "list"],
  list: [],
};

export const organizationRoot = (business = {}) => ({
  id: `organization:${business.id || "default"}`,
  type: "organization",
  name: business.name || "Organização",
  businessId: business.id || null,
  synthetic: true,
});

export const allowedChildTypes = (parent) =>
  WORK_CHILDREN[parent?.type] || [];

export const createWorkNode = (
  input = {},
  context = {},
  existingNodes = [],
  root,
) => {
  const parent =
    input.parentId === root?.id
      ? root
      : existingNodes.find((node) => node.id === input.parentId);
  if (!parent) return { error: "Selecione uma estrutura pai válida." };
  if (!allowedChildTypes(parent).includes(input.type))
    return {
      error: `${input.type || "Este item"} não pode ficar dentro de ${parent.name}.`,
    };
  const name = String(input.name || "").trim();
  if (!name) return { error: "Informe o nome da estrutura." };
  const duplicate = existingNodes.some(
    (node) =>
      node.parentId === parent.id &&
      node.type === input.type &&
      node.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR") &&
      !node.archivedAt,
  );
  if (duplicate)
    return { error: "Já existe uma estrutura com este nome neste local." };
  const now = new Date().toISOString();
  return {
    node: {
      id: input.id || crypto.randomUUID(),
      type: input.type,
      name,
      description: String(input.description || "").trim(),
      parentId: parent.id,
      order: Number.isFinite(Number(input.order))
        ? Number(input.order)
        : existingNodes.filter((node) => node.parentId === parent.id).length,
      color: input.color || "",
      favorite: !!input.favorite,
      visibility: input.visibility || "espaco_todo",
      sharingPermission: input.sharingPermission || "visualizar",
      businessId: context.businessId || parent.businessId || null,
      ownerId: context.ownerId || null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    },
  };
};

const descendantsOf = (nodes, parentId) => {
  const direct = nodes.filter((node) => node.parentId === parentId);
  return direct.flatMap((node) => [node, ...descendantsOf(nodes, node.id)]);
};

export const moveWorkNode = (nodes = [], nodeId, parentId, root) => {
  const node = nodes.find((item) => item.id === nodeId);
  const parent =
    parentId === root?.id ? root : nodes.find((item) => item.id === parentId);
  if (!node || !parent) return { nodes, error: "Estrutura não encontrada." };
  if (!allowedChildTypes(parent).includes(node.type))
    return { nodes, error: "Este tipo de item não é permitido no destino." };
  if (
    node.id === parentId ||
    descendantsOf(nodes, node.id).some((item) => item.id === parentId)
  )
    return { nodes, error: "Uma estrutura não pode ser movida para dentro dela mesma." };
  return {
    nodes: nodes.map((item) =>
      item.id === nodeId
        ? { ...item, parentId, updatedAt: new Date().toISOString() }
        : item,
    ),
  };
};

export const buildWorkTree = (nodes = [], root) => {
  const active = nodes.filter(
    (node) => !node.archivedAt && (!root?.businessId || node.businessId === root.businessId),
  );
  const branch = (parent) => ({
    ...parent,
    children: active
      .filter((node) => node.parentId === parent.id)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "pt-BR"))
      .map(branch),
  });
  return branch(root);
};

export const workBreadcrumbs = (nodes = [], nodeId, root) => {
  const path = [];
  let current =
    nodeId === root?.id ? root : nodes.find((node) => node.id === nodeId);
  const visited = new Set();
  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current =
      current.parentId === root?.id
        ? root
        : nodes.find((node) => node.id === current.parentId);
  }
  return path;
};

export const duplicateWorkBranch = (
  nodes = [],
  nodeId,
  context = {},
  nameSuffix = " cópia",
) => {
  const source = nodes.find((node) => node.id === nodeId);
  if (!source) return { nodes, created: [], error: "Estrutura não encontrada." };
  const sourceBranch = [
    source,
    ...descendantsOf(
      nodes.filter((node) => !node.archivedAt),
      source.id,
    ),
  ];
  const ids = new Map(sourceBranch.map((node) => [node.id, crypto.randomUUID()]));
  const now = new Date().toISOString();
  const copies = sourceBranch.map((node) => ({
    ...node,
    id: ids.get(node.id),
    name: node.id === source.id ? `${node.name}${nameSuffix}` : node.name,
    parentId: ids.get(node.parentId) || node.parentId,
    ownerId: context.ownerId || node.ownerId,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  }));
  return { nodes: [...nodes, ...copies], created: copies };
};

export const hierarchyMetrics = (
  node,
  nodes = [],
  projects = [],
  tasks = [],
) => {
  const descendantIds = new Set([
    node.id,
    ...descendantsOf(
      nodes.filter((item) => !item.archivedAt),
      node.id,
    ).map((item) => item.id),
  ]);
  const linkedProjects =
    node.type === "organization"
      ? projects
      : projects.filter((project) => descendantIds.has(project.containerId));
  const projectIds = new Set(linkedProjects.map((project) => project.id));
  const linkedTasks = tasks.filter(
    (task) =>
      descendantIds.has(task.listId) ||
      projectIds.has(task.projectId) ||
      (node.type === "organization" && task.businessId === node.businessId),
  );
  return {
    structures: Math.max(0, descendantIds.size - 1),
    projects: linkedProjects.length,
    tasks: linkedTasks.length,
    completedTasks: linkedTasks.filter((task) => task.status === "Concluído").length,
    overdueTasks: linkedTasks.filter(
      (task) =>
        task.status !== "Concluído" &&
        task.due &&
        task.due < new Date().toISOString().slice(0, 10),
    ).length,
  };
};
