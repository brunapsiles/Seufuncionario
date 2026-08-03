// ===== Biblioteca de mídia =====
// Camada pura sobre a coleção `media` que já existe no espaço de trabalho.
// Não cria coleção nova de propósito: o que a IA gerou, o que foi editado e o
// que foi gravado são a mesma coisa para quem usa — arquivo do negócio.

import { dataUrlBytes, formatBytes } from "./imageDomain.js";

const texto = (v) => String(v ?? "").toLowerCase();

export const MEDIA_TYPES = [
  { id: "todos", label: "Tudo" },
  { id: "image", label: "Imagens" },
  { id: "logo", label: "Logos" },
  { id: "video", label: "Vídeos" },
  { id: "audio", label: "Áudios" },
];

export const typeLabel = (id) =>
  MEDIA_TYPES.find((t) => t.id === id)?.label || "Arquivo";

// Só mostra o que é do negócio aberto. Sem isto, quem tem dois negócios vê a
// foto de um no catálogo do outro.
export const forBusiness = (itens = [], businessId) =>
  (Array.isArray(itens) ? itens : []).filter(
    (item) => !businessId || !item?.businessId || item.businessId === businessId,
  );

export const filterMedia = (itens = [], { q = "", type = "todos", tag = "" } = {}) => {
  const busca = texto(q).trim();
  const termos = busca ? busca.split(/\s+/) : [];
  return (Array.isArray(itens) ? itens : []).filter((item) => {
    if (!item) return false;
    if (type && type !== "todos" && item.type !== type) return false;
    if (tag && !(item.tags || []).includes(tag)) return false;
    if (!termos.length) return true;
    const alvo = [
      item.name,
      item.prompt,
      item.transcript,
      item.note,
      typeLabel(item.type),
      ...(item.tags || []),
    ]
      .map(texto)
      .join(" ");
    // Todos os termos precisam aparecer: buscar "logo azul" tem de achar o que
    // é logo E azul, não tudo que é logo.
    return termos.every((t) => alvo.includes(t));
  });
};

export const SORTS = [
  { id: "recentes", label: "Mais recentes" },
  { id: "antigos", label: "Mais antigos" },
  { id: "nome", label: "Nome" },
  { id: "tamanho", label: "Maiores primeiro" },
];

export const itemBytes = (item) =>
  Number(item?.bytes) > 0 ? Number(item.bytes) : dataUrlBytes(item?.url);

export const sortMedia = (itens = [], ordem = "recentes") => {
  const lista = [...(Array.isArray(itens) ? itens : [])];
  const quando = (x) => new Date(x?.createdAt || 0).getTime() || 0;
  if (ordem === "antigos") return lista.sort((a, b) => quando(a) - quando(b));
  if (ordem === "nome")
    return lista.sort((a, b) =>
      String(a?.name || a?.prompt || "").localeCompare(
        String(b?.name || b?.prompt || ""),
        "pt-BR",
      ),
    );
  if (ordem === "tamanho")
    return lista.sort((a, b) => itemBytes(b) - itemBytes(a));
  return lista.sort((a, b) => quando(b) - quando(a));
};

// Etiquetas em uso, com contagem, ordenadas pela mais usada. Serve para a tela
// oferecer as etiquetas que existem em vez de pedir para digitar de novo.
export const allTags = (itens = []) => {
  const conta = new Map();
  for (const item of Array.isArray(itens) ? itens : []) {
    for (const tag of item?.tags || []) {
      const t = String(tag || "").trim();
      if (t) conta.set(t, (conta.get(t) || 0) + 1);
    }
  }
  return [...conta.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([tag, total]) => ({ tag, total }));
};

export const normalizeTag = (tag) =>
  String(tag || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);

export const toggleTag = (item, tag) => {
  const t = normalizeTag(tag);
  if (!t) return item;
  const atuais = item?.tags || [];
  return {
    ...item,
    tags: atuais.includes(t) ? atuais.filter((x) => x !== t) : [...atuais, t],
  };
};

export const renameMedia = (item, nome) => ({
  ...item,
  name: String(nome || "").trim().slice(0, 80) || item?.name || "Sem nome",
});

// ---------------------------------------------------------------------------
// Espaço ocupado
// ---------------------------------------------------------------------------

// O espaço de trabalho inteiro trafega em cada gravação. Mídia é de longe o
// que mais pesa, então a biblioteca mostra o tamanho sem a pessoa precisar
// descobrir sozinha quando o app começar a ficar lento.
export const libraryStats = (itens = []) => {
  const lista = Array.isArray(itens) ? itens : [];
  const porTipo = {};
  let bytes = 0;
  for (const item of lista) {
    const tipo = item?.type || "outro";
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
    bytes += itemBytes(item);
  }
  return {
    total: lista.length,
    bytes,
    legivel: formatBytes(bytes),
    porTipo,
    // O que ocupa espaço de verdade é o que está gravado como dado, não o que
    // é só um link para o servidor.
    pesados: lista
      .filter((i) => itemBytes(i) > 300 * 1024)
      .sort((a, b) => itemBytes(b) - itemBytes(a))
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        name: i.name || i.prompt || typeLabel(i.type),
        legivel: formatBytes(itemBytes(i)),
      })),
  };
};

export const HEAVY_LIBRARY_BYTES = 8 * 1024 * 1024;

export const libraryWarning = (stats) => {
  if (!stats || stats.bytes < HEAVY_LIBRARY_BYTES) return "";
  return `A biblioteca já ocupa ${stats.legivel}. Baixe e apague o que não usa mais para o app continuar rápido.`;
};

export const removeMedia = (itens = [], id) =>
  (Array.isArray(itens) ? itens : []).filter((item) => item?.id !== id);

export const upsertMedia = (itens = [], item) => {
  const lista = Array.isArray(itens) ? itens : [];
  if (!item?.id) return lista;
  const existe = lista.some((x) => x?.id === item.id);
  return existe ? lista.map((x) => (x?.id === item.id ? item : x)) : [item, ...lista];
};
