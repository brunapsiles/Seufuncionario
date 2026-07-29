const clean = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const array = (value) => (Array.isArray(value) ? value : []);

const asDate = (value, fallback = "1970-01-01T00:00:00.000Z") => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
};

const firstTextCell = (row) => {
  const value = Object.values(row?.cells || {}).find(
    (cell) =>
      typeof cell === "string" ||
      typeof cell === "number" ||
      typeof cell === "boolean",
  );
  return value == null || value === "" ? "Registro sem título" : String(value);
};

const viewerTokens = (viewer) =>
  [
    viewer?.id,
    viewer?.email,
    String(viewer?.email || "").split("@")[0],
    viewer?.name,
  ]
    .map(clean)
    .filter((token) => token.length >= 2);

export const commentMentionsViewer = (comment, viewer) => {
  const mentions = array(comment?.mentions).map(clean);
  if (mentions.some((mention) => viewerTokens(viewer).includes(mention)))
    return true;
  const text = clean(comment?.text || comment?.body);
  return viewerTokens(viewer).some((token) => text.includes(`@${token}`));
};

const notificationKind = (notification) => {
  const explicit = clean(notification?.kind || notification?.type);
  if (
    ["mention", "task", "comment", "approval", "change", "notification"].includes(
      explicit,
    )
  )
    return explicit;
  const message = clean(notification?.message);
  if (message.includes("mencion")) return "mention";
  if (message.includes("coment") || message.includes("entrega"))
    return "comment";
  if (
    message.includes("aprova") ||
    message.includes("revis") ||
    message.includes("interesse")
  )
    return "approval";
  if (
    message.includes("alter") ||
    message.includes("mudan") ||
    message.includes("risco")
  )
    return "change";
  return "notification";
};

const makeItem = ({
  id,
  kind,
  title,
  message,
  link,
  createdAt,
  groupKey,
  sourceType,
  sourceId,
  nativeReadAt = null,
  actorName = "",
  dueAt = null,
  priority = "",
}) => ({
  id: String(id),
  kind,
  title,
  message,
  link: link || "",
  createdAt: asDate(createdAt),
  groupKey: groupKey || kind,
  sourceType: sourceType || kind,
  sourceId: String(sourceId || ""),
  nativeReadAt,
  actorName,
  dueAt,
  priority,
});

const taskAssignedTo = (task, userId) =>
  task?.assigneeId === userId ||
  array(task?.assignees).some((person) => person?.userId === userId);

const taskRecipients = (task) =>
  new Set(
    [
      task?.ownerId,
      task?.assigneeId,
      ...array(task?.assignees).map((person) => person?.userId),
    ].filter(Boolean),
  );

export function buildPersonalInboxItems(
  data,
  viewer,
  now = new Date().toISOString(),
) {
  const viewerId = viewer?.id;
  if (!viewerId) return [];
  const items = [];

  for (const notification of array(data?.notifications)) {
    if (notification?.assigneeId !== viewerId) continue;
    const kind = notificationKind(notification);
    items.push(
      makeItem({
        id: `notification:${notification.id}`,
        kind,
        title:
          notification.title ||
          {
            mention: "Você foi mencionado(a)",
            comment: "Novo comentário",
            approval: "Aprovação pendente",
            change: "Alteração importante",
          }[kind] ||
          "Nova notificação",
        message: notification.message || "Você tem uma novidade.",
        link: notification.link,
        createdAt: notification.createdAt || now,
        groupKey: notification.groupKey || `${kind}:${notification.link || "geral"}`,
        sourceType: "notification",
        sourceId: notification.id,
        nativeReadAt: notification.read
          ? notification.readAt || notification.createdAt || now
          : null,
        actorName: notification.actorName || "",
      }),
    );
  }

  for (const task of array(data?.tasks)) {
    if (!task || task.archived) continue;
    const assigned = taskAssignedTo(task, viewerId);
    if (assigned && task.status !== "Concluído") {
      items.push(
        makeItem({
          id: `task-assigned:${task.id}`,
          kind: "task",
          title: "Tarefa atribuída",
          message: task.title || "Tarefa sem título",
          link: "operacao",
          createdAt: task.assignedAt || task.updatedAt || task.createdAt || now,
          groupKey: "tasks:assigned",
          sourceType: "task",
          sourceId: task.id,
          dueAt: task.due || null,
          priority: task.priority || "",
        }),
      );
    }

    if (
      task.ownerId === viewerId &&
      task.approvalMode === "aprovacao" &&
      array(task.interested).length
    ) {
      items.push(
        makeItem({
          id: `task-interest-approval:${task.id}`,
          kind: "approval",
          title: "Aprovar participação",
          message: `${array(task.interested).length} pessoa(s) aguardam aprovação em “${task.title || "tarefa"}”.`,
          link: "operacao",
          createdAt:
            array(task.interested)
              .map((person) => person?.at)
              .filter(Boolean)
              .sort()
              .at(-1) ||
            task.updatedAt ||
            task.createdAt ||
            now,
          groupKey: "approvals:pending",
          sourceType: "task",
          sourceId: task.id,
        }),
      );
    }

    if (
      task.ownerId === viewerId &&
      task.missionStatus === "enviada_para_revisao"
    ) {
      const delivery = array(task.deliveries).at(-1);
      items.push(
        makeItem({
          id: `task-delivery-approval:${task.id}:${delivery?.id || "latest"}`,
          kind: "approval",
          title: "Entrega para revisar",
          message: task.title || "Entrega sem título",
          link: "operacao",
          createdAt:
            delivery?.createdAt || task.updatedAt || task.createdAt || now,
          groupKey: "approvals:pending",
          sourceType: "task",
          sourceId: task.id,
          actorName: delivery?.authorName || "",
        }),
      );
    }

    for (const comment of array(task.comments)) {
      if (!comment || comment.authorId === viewerId) continue;
      const mentioned = commentMentionsViewer(comment, viewer);
      if (!mentioned && !taskRecipients(task).has(viewerId)) continue;
      items.push(
        makeItem({
          id: `task-comment:${task.id}:${comment.id}`,
          kind: mentioned ? "mention" : "comment",
          title: mentioned ? "Menção em tarefa" : "Comentário em tarefa",
          message: `${task.title || "Tarefa"}: ${comment.text || ""}`.trim(),
          link: "operacao",
          createdAt: comment.createdAt || task.updatedAt || now,
          groupKey: mentioned ? "mentions" : `comments:task:${task.id}`,
          sourceType: "task",
          sourceId: task.id,
          actorName: comment.authorName || "",
        }),
      );
    }
  }

  for (const base of array(data?.databases)) {
    for (const row of array(base?.rows)) {
      for (const comment of array(row?.comments)) {
        if (!comment || comment.authorId === viewerId) continue;
        const mentioned = commentMentionsViewer(comment, viewer);
        if (!mentioned && base?.ownerId !== viewerId && row?.ownerId !== viewerId)
          continue;
        items.push(
          makeItem({
            id: `database-comment:${base.id}:${row.id}:${comment.id}`,
            kind: mentioned ? "mention" : "comment",
            title: mentioned ? "Menção em registro" : "Comentário em registro",
            message: `${base.name || "Base"} · ${firstTextCell(row)}: ${comment.text || ""}`,
            link: "bases",
            createdAt: comment.createdAt || row.updatedAt || now,
            groupKey: mentioned
              ? "mentions"
              : `comments:database:${base.id}:${row.id}`,
            sourceType: "database",
            sourceId: row.id,
            actorName: comment.authorName || "",
          }),
        );
      }
    }
  }

  const processes = new Map(
    array(data?.processes).map((process) => [process.id, process]),
  );
  for (const caseRecord of array(data?.processCases)) {
    const isRecipient =
      caseRecord?.ownerId === viewerId || caseRecord?.assigneeId === viewerId;
    for (const comment of array(caseRecord?.comments)) {
      if (!comment || comment.authorId === viewerId) continue;
      const mentioned = commentMentionsViewer(comment, viewer);
      if (!mentioned && !isRecipient) continue;
      items.push(
        makeItem({
          id: `process-comment:${caseRecord.id}:${comment.id}`,
          kind: mentioned ? "mention" : "comment",
          title: mentioned ? "Menção em processo" : "Comentário em processo",
          message: `${caseRecord.title || caseRecord.protocol || "Solicitação"}: ${comment.text || comment.body || ""}`,
          link: "processos",
          createdAt: comment.createdAt || caseRecord.updatedAt || now,
          groupKey: mentioned
            ? "mentions"
            : `comments:process:${caseRecord.id}`,
          sourceType: "process",
          sourceId: caseRecord.id,
          actorName: comment.authorName || "",
        }),
      );
    }

    if (!isRecipient || caseRecord?.status === "concluido") continue;
    const process = processes.get(caseRecord.processId);
    const currentIndex = array(process?.stages).findIndex(
      (stage) => stage.id === caseRecord.stageId,
    );
    const nextStage = array(process?.stages)[currentIndex + 1];
    if (nextStage?.approvalRequired) {
      items.push(
        makeItem({
          id: `process-approval:${caseRecord.id}:${nextStage.id}`,
          kind: "approval",
          title: "Aprovação de processo",
          message: `${caseRecord.title || caseRecord.protocol || "Solicitação"} aguarda decisão para entrar em “${nextStage.name}”.`,
          link: "processos",
          createdAt: caseRecord.updatedAt || caseRecord.createdAt || now,
          groupKey: "approvals:pending",
          sourceType: "process",
          sourceId: caseRecord.id,
        }),
      );
    }

    for (const event of array(caseRecord.history)) {
      if (!event || event.type === "created" || event.actorId === viewerId)
        continue;
      items.push(
        makeItem({
          id: `process-change:${caseRecord.id}:${event.id}`,
          kind: "change",
          title: "Alteração em processo",
          message:
            event.type === "completed"
              ? `${caseRecord.title || caseRecord.protocol || "Solicitação"} foi concluída.`
              : `${caseRecord.title || caseRecord.protocol || "Solicitação"} mudou de etapa.`,
          link: "processos",
          createdAt: event.at || caseRecord.updatedAt || now,
          groupKey: `changes:process:${caseRecord.id}`,
          sourceType: "process",
          sourceId: caseRecord.id,
          actorName: event.actorName || "",
        }),
      );
    }
  }

  for (const project of array(data?.projects)) {
    if (
      project?.ownerId !== viewerId &&
      !(viewer?.isWorkspaceOwner && !project?.ownerId)
    )
      continue;
    for (const change of array(project?.changeRequests)) {
      if (!change || ["Aprovada", "Rejeitada", "Concluída"].includes(change.status))
        continue;
      items.push(
        makeItem({
          id: `project-change:${project.id}:${change.id}`,
          kind:
            clean(change.approvalStatus) === "pendente" ? "approval" : "change",
          title:
            clean(change.approvalStatus) === "pendente"
              ? "Mudança para aprovar"
              : "Alteração importante",
          message: `${project.name || "Projeto"}: ${change.title || change.description || "Mudança solicitada"}`,
          link: "operacao",
          createdAt: change.updatedAt || change.createdAt || project.updatedAt || now,
          groupKey:
            clean(change.approvalStatus) === "pendente"
              ? "approvals:pending"
              : "changes:projects",
          sourceType: "project",
          sourceId: project.id,
          priority: change.severity || "",
        }),
      );
    }
  }

  const unique = new Map();
  for (const item of items) {
    const previous = unique.get(item.id);
    if (!previous || item.createdAt > previous.createdAt) unique.set(item.id, item);
  }
  return [...unique.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 500);
}

export function applyPersonalInboxState(
  items,
  states,
  now = new Date().toISOString(),
) {
  const stateMap = new Map(
    array(states).map((state) => [
      state.itemKey || state.item_key,
      {
        readAt: state.readAt ?? state.read_at ?? null,
        snoozedUntil: state.snoozedUntil ?? state.snoozed_until ?? null,
      },
    ]),
  );
  return array(items).map((item) => {
    const saved = stateMap.get(item.id);
    const readAt = saved ? saved.readAt : item.nativeReadAt || null;
    const snoozedUntil = saved?.snoozedUntil || null;
    return {
      ...item,
      readAt,
      snoozedUntil,
      snoozed: !!snoozedUntil && snoozedUntil > now,
    };
  });
}

export function groupPersonalInboxItems(items) {
  const groups = new Map();
  for (const item of array(items)) {
    const key = item.groupKey || item.kind || "notification";
    if (!groups.has(key))
      groups.set(key, {
        id: key,
        kind: item.kind || "notification",
        title: item.title,
        items: [],
        unread: 0,
        latestAt: item.createdAt,
      });
    const group = groups.get(key);
    group.items.push(item);
    if (!item.readAt) group.unread += 1;
    if (item.createdAt > group.latestAt) {
      group.latestAt = item.createdAt;
      group.title = item.title;
    }
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    }))
    .sort((left, right) => right.latestAt.localeCompare(left.latestAt));
}

export function personalInboxSummary(items, now = new Date().toISOString()) {
  const visible = array(items).filter(
    (item) => !item.snoozedUntil || item.snoozedUntil <= now,
  );
  const counts = {
    total: visible.length,
    unread: visible.filter((item) => !item.readAt).length,
    mentions: 0,
    tasks: 0,
    comments: 0,
    approvals: 0,
    changes: 0,
    snoozed: array(items).filter(
      (item) => item.snoozedUntil && item.snoozedUntil > now,
    ).length,
  };
  const target = {
    mention: "mentions",
    task: "tasks",
    comment: "comments",
    approval: "approvals",
    change: "changes",
  };
  for (const item of visible) {
    if (target[item.kind]) counts[target[item.kind]] += 1;
  }
  return counts;
}
