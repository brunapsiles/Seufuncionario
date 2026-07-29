const text = (value, max = 20_000) =>
  typeof value === "string" ? value.slice(0, max) : "";

const shortText = (value, max = 240) => text(value, max).trim();

const uniqueList = (value, max = 200) =>
  [...new Set((Array.isArray(value) ? value : []).map(String))]
    .filter(Boolean)
    .slice(0, max);

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const httpsUrl = (value) => {
  const raw = shortText(value, 1200);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const safeColor = (value, fallback = "#6d38e0") =>
  /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeItems = (value, max = 200) =>
  (Array.isArray(value) ? value : String(value || "").split("\n"))
    .map((item) => shortText(typeof item === "object" ? item?.text : item, 1200))
    .filter(Boolean)
    .slice(0, max);

const normalizeChecklist = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: shortText(item?.id, 100) || uid(),
      text: shortText(item?.text, 1200),
      done: !!item?.done,
    }))
    .filter((item) => item.text)
    .slice(0, 200);

const normalizeTable = (raw = {}) => {
  const columns = normalizeItems(raw.columns, 20).map((item) =>
    shortText(item, 120),
  );
  const safeColumns = columns.length ? columns : ["Coluna 1", "Coluna 2"];
  const rows = (Array.isArray(raw.rows) ? raw.rows : [])
    .slice(0, 200)
    .map((row) =>
      safeColumns.map((_, index) =>
        shortText(Array.isArray(row) ? row[index] : "", 2000),
      ),
    );
  return { columns: safeColumns, rows };
};

export const DOCUMENT_BLOCK_TYPES = [
  { type: "paragraph", label: "Texto", group: "Texto" },
  { type: "heading", label: "Título", group: "Texto" },
  { type: "bulletedList", label: "Lista com marcadores", group: "Texto" },
  { type: "numberedList", label: "Lista numerada", group: "Texto" },
  { type: "checklist", label: "Checklist", group: "Texto" },
  { type: "callout", label: "Destaque", group: "Texto" },
  { type: "toggle", label: "Conteúdo recolhível", group: "Texto" },
  { type: "code", label: "Código", group: "Texto" },
  { type: "table", label: "Tabela", group: "Dados" },
  { type: "chart", label: "Gráfico", group: "Dados" },
  { type: "columns", label: "Colunas", group: "Layout" },
  { type: "image", label: "Imagem", group: "Mídia" },
  { type: "video", label: "Vídeo", group: "Mídia" },
  { type: "file", label: "Arquivo", group: "Mídia" },
  { type: "database", label: "Base incorporada", group: "Conexões" },
  { type: "tasks", label: "Tarefas incorporadas", group: "Conexões" },
  { type: "form", label: "Formulário incorporado", group: "Conexões" },
  { type: "synced", label: "Conteúdo sincronizado", group: "Conexões" },
];

export const DOCUMENT_BLOCK_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_BLOCK_TYPES.map((item) => [item.type, item.label]),
);

export function createDocumentBlock(type = "paragraph", seed = {}) {
  const base = { id: uid(), type, createdAt: new Date().toISOString() };
  const presets = {
    paragraph: { text: "" },
    heading: { text: "", level: 2 },
    bulletedList: { items: ["Novo item"] },
    numberedList: { items: ["Novo item"] },
    checklist: { items: [{ id: uid(), text: "Novo item", done: false }] },
    callout: { text: "", tone: "info", icon: "💡" },
    toggle: { title: "Ver detalhes", content: "" },
    code: { code: "", language: "texto" },
    table: {
      columns: ["Coluna 1", "Coluna 2"],
      rows: [["", ""]],
    },
    chart: {
      title: "Novo gráfico",
      chartType: "bar",
      labels: ["Item 1", "Item 2"],
      values: [0, 0],
      color: "#6d38e0",
    },
    columns: {
      columns: [
        { id: uid(), title: "", content: "" },
        { id: uid(), title: "", content: "" },
      ],
    },
    image: { url: "", alt: "", caption: "" },
    video: { url: "", caption: "" },
    file: { documentId: "", url: "", name: "", description: "" },
    database: { databaseId: "", view: "table", limit: 10 },
    tasks: { projectId: "", taskIds: [], filter: "open", limit: 20 },
    form: { formId: "", showDescription: true },
    synced: { syncedBlockId: "" },
  };
  return normalizeDocumentBlock({ ...base, ...(presets[type] || presets.paragraph), ...seed });
}

export function normalizeDocumentBlock(raw = {}) {
  const knownTypes = new Set(DOCUMENT_BLOCK_TYPES.map((item) => item.type));
  const type = knownTypes.has(raw.type) ? raw.type : "paragraph";
  const base = {
    id: shortText(raw.id, 100) || uid(),
    type,
  };
  if (type === "paragraph")
    return { ...base, text: text(raw.text ?? raw.content, 30_000) };
  if (type === "heading")
    return {
      ...base,
      text: shortText(raw.text, 1000),
      level: Math.min(3, Math.max(1, Math.round(number(raw.level, 2)))),
    };
  if (type === "bulletedList" || type === "numberedList")
    return { ...base, items: normalizeItems(raw.items) };
  if (type === "checklist")
    return { ...base, items: normalizeChecklist(raw.items) };
  if (type === "callout")
    return {
      ...base,
      text: text(raw.text ?? raw.content, 10_000),
      tone: ["info", "success", "warning", "danger", "neutral"].includes(raw.tone)
        ? raw.tone
        : "info",
      icon: shortText(raw.icon, 8) || "💡",
    };
  if (type === "toggle")
    return {
      ...base,
      title: shortText(raw.title, 500) || "Ver detalhes",
      content: text(raw.content, 20_000),
    };
  if (type === "code")
    return {
      ...base,
      code: text(raw.code ?? raw.content, 30_000),
      language: shortText(raw.language, 60) || "texto",
    };
  if (type === "table") return { ...base, ...normalizeTable(raw) };
  if (type === "chart") {
    const labels = normalizeItems(raw.labels, 50);
    const values = (Array.isArray(raw.values) ? raw.values : [])
      .slice(0, 50)
      .map((value) => number(value));
    const length = Math.max(labels.length, values.length, 1);
    return {
      ...base,
      title: shortText(raw.title, 300) || "Gráfico",
      chartType: ["bar", "line", "pie"].includes(raw.chartType)
        ? raw.chartType
        : "bar",
      labels: Array.from({ length }, (_, index) => labels[index] || `Item ${index + 1}`),
      values: Array.from({ length }, (_, index) => values[index] || 0),
      color: safeColor(raw.color),
    };
  }
  if (type === "columns") {
    const columns = (Array.isArray(raw.columns) ? raw.columns : [])
      .slice(0, 4)
      .map((column) => ({
        id: shortText(column?.id, 100) || uid(),
        title: shortText(column?.title, 300),
        content: text(column?.content, 15_000),
      }));
    while (columns.length < 2)
      columns.push({ id: uid(), title: "", content: "" });
    return { ...base, columns };
  }
  if (type === "image")
    return {
      ...base,
      url: httpsUrl(raw.url),
      alt: shortText(raw.alt, 500),
      caption: shortText(raw.caption, 1000),
    };
  if (type === "video")
    return {
      ...base,
      url: httpsUrl(raw.url),
      caption: shortText(raw.caption, 1000),
    };
  if (type === "file")
    return {
      ...base,
      documentId: shortText(raw.documentId, 100),
      url: httpsUrl(raw.url),
      name: shortText(raw.name, 500),
      description: shortText(raw.description, 1500),
    };
  if (type === "database")
    return {
      ...base,
      databaseId: shortText(raw.databaseId, 100),
      view: ["table", "gallery", "board"].includes(raw.view)
        ? raw.view
        : "table",
      limit: Math.min(50, Math.max(1, Math.round(number(raw.limit, 10)))),
    };
  if (type === "tasks")
    return {
      ...base,
      projectId: shortText(raw.projectId, 100),
      taskIds: uniqueList(raw.taskIds),
      filter: ["all", "open", "done"].includes(raw.filter)
        ? raw.filter
        : "open",
      limit: Math.min(100, Math.max(1, Math.round(number(raw.limit, 20)))),
    };
  if (type === "form")
    return {
      ...base,
      formId: shortText(raw.formId, 100),
      showDescription: raw.showDescription !== false,
    };
  return {
    ...base,
    syncedBlockId: shortText(raw.syncedBlockId, 100),
  };
}

export function normalizeDocumentBlocks(value, fallbackText = "") {
  const blocks = (Array.isArray(value) ? value : [])
    .slice(0, 500)
    .map(normalizeDocumentBlock);
  if (blocks.length) return blocks;
  return textToDocumentBlocks(fallbackText);
}

const parseMarkdownTable = (lines, index) => {
  if (
    !lines[index]?.includes("|") ||
    !/^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || "")
  )
    return null;
  const split = (line) =>
    line
      .replace(/^\s*\||\|\s*$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  const columns = split(lines[index]);
  const rows = [];
  let cursor = index + 2;
  while (cursor < lines.length && lines[cursor].includes("|")) {
    rows.push(split(lines[cursor]));
    cursor += 1;
  }
  return {
    block: createDocumentBlock("table", { columns, rows }),
    next: cursor,
  };
};

export function textToDocumentBlocks(value) {
  const source = text(value, 80_000).replace(/\r\n?/g, "\n");
  if (!source.trim()) return [createDocumentBlock("paragraph")];
  const lines = source.split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length && blocks.length < 500) {
    const line = lines[index];
    if (/^```/.test(line)) {
      const language = line.replace(/^```/, "").trim() || "texto";
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push(createDocumentBlock("code", { language, code: code.join("\n") }));
      index += 1;
      continue;
    }
    const table = parseMarkdownTable(lines, index);
    if (table) {
      blocks.push(table.block);
      index = table.next;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(
        createDocumentBlock("heading", {
          level: heading[1].length,
          text: heading[2],
        }),
      );
      index += 1;
      continue;
    }
    if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items = [];
      while (
        index < lines.length &&
        /^\s*[-*]\s+\[[ xX]\]\s+/.test(lines[index])
      ) {
        const match = lines[index].match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
        items.push({ id: uid(), text: match[2], done: match[1].toLowerCase() === "x" });
        index += 1;
      }
      blocks.push(createDocumentBlock("checklist", { items }));
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(createDocumentBlock("bulletedList", { items }));
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(createDocumentBlock("numberedList", { items }));
      continue;
    }
    if (/^>\s?/.test(line)) {
      const parts = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        parts.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(createDocumentBlock("callout", { text: parts.join("\n") }));
      continue;
    }
    const paragraph = [];
    while (
      index < lines.length &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+[.)]\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !parseMarkdownTable(lines, index)
    ) {
      paragraph.push(lines[index]);
      index += 1;
      if (!lines[index - 1] && paragraph.some(Boolean)) break;
    }
    const content = paragraph.join("\n").replace(/\n+$/, "");
    if (content || !blocks.length)
      blocks.push(createDocumentBlock("paragraph", { text: content }));
  }
  return blocks.length ? blocks : [createDocumentBlock("paragraph")];
}

const markdownTable = (block) => {
  const columns = block.columns || [];
  if (!columns.length) return "";
  const row = (values) => `| ${columns.map((_, index) => values[index] || "").join(" | ")} |`;
  return [
    row(columns),
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...(block.rows || []).map(row),
  ].join("\n");
};

const embeddedLabel = (collection, id, fallback) =>
  (Array.isArray(collection) ? collection : []).find((item) => item?.id === id)
    ?.name ||
  (Array.isArray(collection) ? collection : []).find((item) => item?.id === id)
    ?.title ||
  fallback;

export function documentBlocksToText(value, context = {}) {
  const blocks = normalizeDocumentBlocks(value);
  return blocks
    .map((block) => {
      if (block.type === "paragraph") return block.text;
      if (block.type === "heading")
        return `${"#".repeat(block.level)} ${block.text}`.trim();
      if (block.type === "bulletedList")
        return block.items.map((item) => `- ${item}`).join("\n");
      if (block.type === "numberedList")
        return block.items.map((item, index) => `${index + 1}. ${item}`).join("\n");
      if (block.type === "checklist")
        return block.items
          .map((item) => `- [${item.done ? "x" : " "}] ${item.text}`)
          .join("\n");
      if (block.type === "callout")
        return block.text
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      if (block.type === "toggle")
        return `### ${block.title}\n${block.content}`;
      if (block.type === "code")
        return `\`\`\`${block.language}\n${block.code}\n\`\`\``;
      if (block.type === "table") return markdownTable(block);
      if (block.type === "chart")
        return `${block.title}\n${block.labels
          .map((label, index) => `${label}: ${block.values[index] || 0}`)
          .join("\n")}`;
      if (block.type === "columns")
        return block.columns
          .map((column) =>
            [column.title ? `### ${column.title}` : "", column.content]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n\n");
      if (block.type === "image")
        return block.url
          ? `![${block.alt || block.caption || "Imagem"}](${block.url})${
              block.caption ? `\n${block.caption}` : ""
            }`
          : block.caption;
      if (block.type === "video")
        return [block.caption || "Vídeo", block.url].filter(Boolean).join("\n");
      if (block.type === "file") {
        const name =
          block.name ||
          embeddedLabel(context.documents, block.documentId, "Arquivo");
        return [name, block.description, block.url].filter(Boolean).join("\n");
      }
      if (block.type === "database")
        return `[Base incorporada: ${embeddedLabel(
          context.databases,
          block.databaseId,
          "não selecionada",
        )}]`;
      if (block.type === "tasks")
        return `[Tarefas incorporadas: ${embeddedLabel(
          context.projects,
          block.projectId,
          "seleção",
        )}]`;
      if (block.type === "form")
        return `[Formulário incorporado: ${embeddedLabel(
          context.forms,
          block.formId,
          "não selecionado",
        )}]`;
      const synced = (context.syncedBlocks || []).find(
        (item) => item.id === block.syncedBlockId,
      );
      return synced?.content || "[Conteúdo sincronizado indisponível]";
    })
    .filter((item) => item !== "")
    .join("\n\n")
    .trim();
}

export function documentBlockStats(value, context = {}) {
  const blocks = normalizeDocumentBlocks(value);
  const content = documentBlocksToText(blocks, context);
  return {
    blocks: blocks.length,
    characters: content.length,
    words: content.trim() ? content.trim().split(/\s+/).length : 0,
    connections: blocks.filter((block) =>
      ["database", "tasks", "form", "synced", "file"].includes(block.type),
    ).length,
  };
}

export function normalizeSyncedBlock(raw = {}, context = {}) {
  const now = context.now || new Date().toISOString();
  const requestedVisibility = raw.visibility || context.visibility;
  return {
    id: shortText(raw.id, 100) || uid(),
    name: shortText(raw.name, 240) || "Conteúdo reutilizável",
    content: text(raw.content, 40_000),
    businessId: shortText(raw.businessId, 100) || context.businessId || null,
    ownerId: shortText(raw.ownerId, 100) || context.ownerId || "",
    visibility: [
      "privado",
      "pessoas",
      "equipe",
      "projeto",
      "espaco_todo",
    ].includes(requestedVisibility)
      ? requestedVisibility
      : "privado",
    sharingPermission:
      raw.sharingPermission === "editar" ||
      context.sharingPermission === "editar"
        ? "editar"
        : "visualizar",
    sharedWith: uniqueList(raw.sharedWith || context.sharedWith, 100),
    sharedTeams: uniqueList(raw.sharedTeams || context.sharedTeams, 100),
    project: shortText(raw.project || context.project, 240),
    createdAt: raw.createdAt || now,
    updatedAt: now,
  };
}
