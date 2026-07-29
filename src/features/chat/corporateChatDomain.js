const unique = (values = []) => [
  ...new Set(values.filter((value) => typeof value === "string" && value)),
];

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const CHAT_CHANNEL_TYPES = [
  { id: "channel", label: "Canal", description: "Visível para toda a empresa" },
  { id: "group", label: "Grupo", description: "Somente pessoas escolhidas" },
  { id: "direct", label: "Mensagem direta", description: "Conversa entre duas pessoas" },
];

export const mentionHandle = (member = {}) =>
  normalize(member.name || member.email || "pessoa")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "pessoa";

export function resolveMentionUserIds(text, members = []) {
  const source = normalize(text);
  if (!source.includes("@")) return [];
  return unique(
    members
      .filter((member) => {
        const full = mentionHandle(member);
        const first = full.split(".")[0];
        return (
          source.includes(`@${full}`) ||
          (first.length > 1 && source.includes(`@${first}`))
        );
      })
      .map((member) => member.id),
  );
}

export function createChatChannel(
  input = {},
  { id = randomId(), now = new Date().toISOString() } = {},
) {
  const type = ["channel", "group", "direct"].includes(input.type)
    ? input.type
    : "channel";
  const ownerId = input.ownerId || null;
  const memberIds = unique([ownerId, ...(input.memberIds || [])]);
  const visibility = type === "channel" ? "espaco_todo" : "compartilhado";
  const fallbackName =
    type === "direct"
      ? "Conversa direta"
      : type === "group"
        ? "Novo grupo"
        : "geral";
  return {
    id,
    type,
    name: String(input.name || fallbackName).trim() || fallbackName,
    topic: String(input.topic || "").trim(),
    ownerId,
    businessId: input.businessId || null,
    memberIds,
    visibility,
    sharedWith: visibility === "compartilhado" ? memberIds : [],
    sharedTeams: [],
    sharingPermission: "visualizar",
    directKey:
      type === "direct" ? [...memberIds].sort().join(":") : undefined,
    createdAt: now,
    updatedAt: now,
    aiSummary: null,
  };
}

export function findDirectChannel(channels = [], firstUserId, secondUserId) {
  const key = unique([firstUserId, secondUserId]).sort().join(":");
  return (
    channels.find(
      (channel) =>
        channel.type === "direct" &&
        (channel.directKey === key ||
          unique(channel.memberIds).sort().join(":") === key),
    ) || null
  );
}

export function channelDisplayName(channel, members = [], currentUserId) {
  if (!channel) return "";
  if (channel.type !== "direct") return channel.name;
  const otherId = (channel.memberIds || []).find((id) => id !== currentUserId);
  const other = members.find((member) => member.id === otherId);
  return other?.name || channel.name || "Conversa direta";
}

export function channelAudience(channel = {}) {
  const visibility =
    channel.visibility ||
    (channel.type === "channel" ? "espaco_todo" : "compartilhado");
  return {
    visibility,
    sharedWith:
      visibility === "espaco_todo"
        ? []
        : unique(channel.sharedWith?.length ? channel.sharedWith : channel.memberIds),
    sharedTeams: unique(channel.sharedTeams),
    sharingPermission: "visualizar",
  };
}

export function createChatMessage(
  input = {},
  { id = randomId(), now = new Date().toISOString() } = {},
) {
  const body = String(input.body || "").trim();
  const attachments = Array.isArray(input.attachments)
    ? input.attachments.filter((item) => item?.id && item?.name).slice(0, 3)
    : [];
  if (!input.channel?.id || (!body && !attachments.length)) return null;
  return {
    id,
    channelId: input.channel.id,
    parentMessageId: input.parentMessageId || null,
    body,
    authorId: input.authorId || null,
    authorName: input.authorName || "Pessoa",
    ownerId: input.authorId || null,
    businessId: input.businessId || input.channel.businessId || null,
    attachments,
    mentionUserIds: resolveMentionUserIds(body, input.members),
    reactions: {},
    pinnedAt: null,
    pinnedBy: null,
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    ...channelAudience(input.channel),
  };
}

export function toggleMessageReaction(message, emoji, userId) {
  if (!message || !emoji || !userId) return message;
  const reactions = { ...(message.reactions || {}) };
  const people = new Set(Array.isArray(reactions[emoji]) ? reactions[emoji] : []);
  if (people.has(userId)) people.delete(userId);
  else people.add(userId);
  if (people.size) reactions[emoji] = [...people];
  else delete reactions[emoji];
  return {
    ...message,
    reactions,
    updatedAt: new Date().toISOString(),
  };
}

export function toggleMessagePin(message, userId, now = new Date().toISOString()) {
  if (!message || !userId) return message;
  const pinned = !!message.pinnedAt;
  return {
    ...message,
    pinnedAt: pinned ? null : now,
    pinnedBy: pinned ? null : userId,
    updatedAt: now,
  };
}

export function threadMessages(messages = [], rootMessageId) {
  return messages
    .filter(
      (message) =>
        message.id === rootMessageId ||
        message.parentMessageId === rootMessageId,
    )
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function searchChatMessages(messages = [], query = "", channelId = "") {
  const term = normalize(query);
  return messages
    .filter((message) => !channelId || message.channelId === channelId)
    .filter((message) => {
      if (!term) return true;
      return normalize(
        `${message.body || ""} ${message.authorName || ""} ${(message.attachments || [])
          .map((item) => item.name)
          .join(" ")}`,
      ).includes(term);
    })
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function channelUnreadCount(
  messages = [],
  readState = null,
  currentUserId = "",
) {
  const lastReadAt = readState?.lastReadAt || "";
  return messages.filter(
    (message) =>
      !message.parentMessageId &&
      message.authorId !== currentUserId &&
      String(message.createdAt || "") > lastReadAt,
  ).length;
}

export function channelLastActivity(messages = [], channel = {}) {
  return messages.reduce(
    (latest, message) =>
      message.channelId === channel.id &&
      String(message.createdAt || "") > String(latest || "")
        ? message.createdAt
        : latest,
    channel.updatedAt || channel.createdAt || "",
  );
}

export function createTaskFromChatMessage(
  message,
  { id = randomId(), ownerId = null, businessId = null, project = "" } = {},
) {
  const body = String(message?.body || "").trim();
  const firstLine = body.split(/\r?\n/).find(Boolean) || "Ação da conversa";
  const title =
    firstLine.length > 96 ? `${firstLine.slice(0, 93).trim()}...` : firstLine;
  return {
    id,
    title,
    description: [
      body,
      "",
      `Origem: mensagem de ${message?.authorName || "pessoa"} no chat corporativo.`,
    ]
      .join("\n")
      .trim(),
    priority: "Média",
    status: "A fazer",
    startDate: "",
    due: "",
    estimatedDays: "1",
    baselineStart: "",
    baselineDue: "",
    area: "Operação",
    assigneeType: "real",
    assignee: "",
    assigneeId: "",
    project,
    isMission: false,
    distribution: "atribuida",
    difficulty: "Simples",
    slots: "1",
    points: "",
    reward: "",
    approvalMode: "imediata",
    allowWithdrawal: true,
    assignees: [],
    interested: [],
    missionStatus: "",
    deliveries: [],
    deliveryDraft: "",
    visibility: message?.visibility || "privado",
    sharedWith: unique(message?.sharedWith),
    sharedTeams: unique(message?.sharedTeams),
    sharingPermission: "editar",
    subtasks: [],
    checklist: [],
    subtaskDraft: "",
    dependsOn: [],
    attachments: Array.isArray(message?.attachments)
      ? message.attachments.map((item) => ({ ...item }))
      : [],
    recurrence: { frequency: "none" },
    businessId,
    ownerId,
    sourceChatMessageId: message?.id || null,
    sourceChatChannelId: message?.channelId || null,
    createdAt: new Date().toISOString(),
  };
}

export function fallbackChatSummary(messages = []) {
  const ordered = messages
    .filter((message) => String(message.body || "").trim())
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  if (!ordered.length) return "Ainda não há mensagens suficientes para resumir.";
  const participants = unique(ordered.map((message) => message.authorName));
  const decisions = ordered
    .filter((message) =>
      /\b(decid|aprov|combin|defin|fechad|vamos)\w*/i.test(message.body),
    )
    .slice(-4);
  const actions = ordered
    .filter((message) =>
      /\b(precis|respons|prazo|entreg|fazer|ação|tarefa)\w*/i.test(message.body),
    )
    .slice(-4);
  const latest = ordered.slice(-5);
  return [
    `Participantes: ${participants.join(", ") || "não identificados"}.`,
    "Principais pontos:",
    ...latest.map((message) => `• ${message.authorName}: ${message.body.slice(0, 180)}`),
    decisions.length
      ? `Decisões detectadas: ${decisions.map((message) => message.body.slice(0, 120)).join(" | ")}`
      : "Decisões detectadas: nenhuma explícita.",
    actions.length
      ? `Ações detectadas: ${actions.map((message) => message.body.slice(0, 120)).join(" | ")}`
      : "Ações detectadas: nenhuma explícita.",
  ].join("\n");
}

export function buildChatSummaryPrompt(channel, messages = []) {
  const transcript = messages
    .filter((message) => String(message.body || "").trim())
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .slice(-80)
    .map(
      (message) =>
        `[${String(message.createdAt || "").slice(0, 16)}] ${message.authorName}: ${message.body}`,
    )
    .join("\n");
  return `Resuma esta conversa corporativa em português do Brasil.

Canal: ${channel?.name || "conversa"}

Entregue, de forma concisa:
1. resumo executivo;
2. decisões tomadas;
3. ações, responsáveis e prazos mencionados;
4. riscos, dúvidas e pendências.

Não invente fatos, responsáveis nem datas. Quando algo não estiver explícito, escreva "não definido".

TRANSCRIÇÃO:
${transcript}`.slice(0, 46_000);
}
