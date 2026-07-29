// ===== Memória da IA: controlável, com escopo, origem e validade =====
// Camada pura. O ponto do módulo não é "a IA lembra": é a titular poder VER,
// editar, apagar e limitar o que a IA lembra, com origem e prazo de revisão.

export const MEMORY_SCOPES = [
  { id: "pessoal", label: "Só minha", hint: "Preferências suas, não da empresa." },
  { id: "empresa", label: "Da empresa", hint: "Vale para todo o negócio." },
  { id: "projeto", label: "De um projeto", hint: "Vale só dentro do projeto." },
  { id: "cliente", label: "De um cliente", hint: "Vale ao falar deste cliente." },
  { id: "especialista", label: "De um especialista", hint: "Muda como ele responde." },
];

// Padrões que indicam dado sensível: exigem aprovação antes de memorizar.
const SENSITIVE_PATTERNS = [
  { id: "cpf", re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, label: "CPF" },
  { id: "cnpj", re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, label: "CNPJ" },
  { id: "cartao", re: /\b\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4}\b/, label: "cartão" },
  { id: "senha", re: /\b(senha|password|token|chave\s+de\s+api)\b/i, label: "senha ou chave" },
  { id: "conta", re: /\b(ag[êe]ncia|conta\s+corrente)\b/i, label: "conta bancária" },
  { id: "saude", re: /\b(diagn[óo]stico|medicamento|doen[çc]a|laudo)\b/i, label: "saúde" },
];

export const detectSensitive = (text) => {
  const alvo = String(text || "");
  return SENSITIVE_PATTERNS.filter((p) => p.re.test(alvo)).map((p) => ({
    id: p.id,
    label: p.label,
  }));
};

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

export const addDays = (date, days) => {
  if (!isDate(date)) return date;
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
};

export const makeMemory = (
  id,
  {
    text = "",
    scope = "empresa",
    scopeRef = "",
    source = "manual",
    sourceRef = "",
    createdAt,
    reviewEveryDays = 180,
    required = false,
    businessId = null,
    ownerId = null,
  } = {},
) => {
  const criada = createdAt || new Date().toISOString();
  return {
    id,
    text: String(text).trim(),
    scope,
    scopeRef,
    source,
    sourceRef,
    required,
    createdAt: criada,
    reviewEveryDays,
    reviewAt: reviewEveryDays
      ? addDays(criada.slice(0, 10), reviewEveryDays)
      : "",
    approved: detectSensitive(text).length === 0,
    businessId,
    ownerId,
  };
};

// Memória vencida: passou da data de revisão. Não é apagada sozinha — a
// titular decide. Apagar por conta própria seria pior que avisar.
export const isStale = (memory, today) =>
  isDate(memory?.reviewAt) && isDate(today) && memory.reviewAt < today;

export const staleMemories = (memories, today) =>
  (memories || []).filter((m) => isStale(m, today));

const normalizar = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

// Duas memórias falam do mesmo assunto? Usa sobreposição de palavras
// (Jaccard) — barato, previsível e sem depender de modelo.
export const similarity = (a, b) => {
  const A = new Set(normalizar(a));
  const B = new Set(normalizar(b));
  if (A.size === 0 || B.size === 0) return 0;
  let comuns = 0;
  for (const w of A) if (B.has(w)) comuns += 1;
  return Math.round((comuns / (A.size + B.size - comuns)) * 100) / 100;
};

// Palavras que invertem o sentido — usadas para separar "repetida" de
// "contraditória". "Atende sábado" x "não atende sábado" é conflito, não cópia.
const NEGACOES = ["nao", "nunca", "jamais", "sem", "exceto", "nenhum", "nenhuma"];

const temNegacao = (texto) => {
  const palavras = normalizar(texto);
  return NEGACOES.some((n) => palavras.includes(n));
};

// Conflitos entre memórias do mesmo escopo: assunto parecido com sentido
// oposto (contradição) ou praticamente iguais (duplicada).
export const findConflicts = (memories, { threshold = 0.5 } = {}) => {
  const lista = (memories || []).filter((m) => m?.text);
  const conflitos = [];
  for (let i = 0; i < lista.length; i += 1)
    for (let j = i + 1; j < lista.length; j += 1) {
      const a = lista[i];
      const b = lista[j];
      if (a.scope !== b.scope || String(a.scopeRef || "") !== String(b.scopeRef || ""))
        continue;
      const s = similarity(a.text, b.text);
      if (s < threshold) continue;
      const negacaoDiferente = temNegacao(a.text) !== temNegacao(b.text);
      conflitos.push({
        a: a.id,
        b: b.id,
        similarity: s,
        kind: negacaoDiferente ? "contradicao" : s >= 0.8 ? "duplicada" : "parecida",
      });
    }
  return conflitos.sort((x, y) => y.similarity - x.similarity);
};

// Recupera só o que interessa para a pergunta, respeitando escopo.
// Memórias marcadas como obrigatórias entram sempre.
export const relevantMemories = (
  memories,
  query,
  { scopeRefs = {}, limit = 8, businessId = null } = {},
) => {
  const permitida = (m) => {
    if (businessId && m.businessId && m.businessId !== businessId) return false;
    if (!m.approved) return false;
    if (m.scope === "projeto") return !!scopeRefs.projeto && m.scopeRef === scopeRefs.projeto;
    if (m.scope === "cliente") return !!scopeRefs.cliente && m.scopeRef === scopeRefs.cliente;
    if (m.scope === "especialista")
      return !!scopeRefs.especialista && m.scopeRef === scopeRefs.especialista;
    return true;
  };
  const candidatas = (memories || []).filter((m) => m?.text && permitida(m));
  const obrigatorias = candidatas.filter((m) => m.required);
  const resto = candidatas
    .filter((m) => !m.required)
    .map((m) => ({ memory: m, score: similarity(m.text, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.memory);
  return [...obrigatorias, ...resto].slice(0, limit);
};

// Bloco de contexto que vai no prompt. Vazio quando não há nada relevante —
// não injeta ruído.
export const memoriesToContext = (memories) => {
  const lista = (memories || []).filter((m) => m?.text);
  if (lista.length === 0) return "";
  const linhas = lista.map((m) => {
    const escopo =
      MEMORY_SCOPES.find((s) => s.id === m.scope)?.label || m.scope;
    return `- (${escopo}${m.scopeRef ? `: ${m.scopeRef}` : ""}) ${m.text}`;
  });
  return `O que já sabemos sobre este negócio e esta pessoa:\n${linhas.join("\n")}\n\nUse isso apenas quando fizer sentido para a pergunta. Não repita esta lista na resposta.`;
};

// Exportação completa, para a titular levar embora ou guardar.
export const exportMemories = (memories) =>
  JSON.stringify(
    {
      exportadoEm: new Date().toISOString(),
      total: (memories || []).length,
      memorias: (memories || []).map((m) => ({
        texto: m.text,
        escopo: m.scope,
        referencia: m.scopeRef || "",
        origem: m.source,
        criadaEm: m.createdAt,
        revisarEm: m.reviewAt || "",
        obrigatoria: !!m.required,
        aprovada: !!m.approved,
      })),
    },
    null,
    2,
  );

// Sugere memórias a partir de uma conversa. Só frases declarativas sobre
// preferência ou fato do negócio, e nunca inventa: o texto sai da conversa.
const GATILHOS = [
  /\b(sempre|nunca|prefiro|preferimos|costumo|costumamos)\b/i,
  /\b(nosso|nossa|nossos|nossas)\s+\w+\s+(é|e|são|sao)\b/i,
  /\b(atendemos|trabalhamos|cobramos|vendemos|entregamos)\b/i,
  /\b(n[ãa]o\s+(aceitamos|atendemos|trabalhamos|fazemos))\b/i,
];

export const suggestMemories = (conversationText, { limit = 5 } = {}) => {
  const frases = String(conversationText || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter((f) => f.length >= 15 && f.length <= 220);
  const escolhidas = [];
  for (const frase of frases) {
    if (!GATILHOS.some((g) => g.test(frase))) continue;
    // Evita sugerir duas frases que dizem a mesma coisa.
    if (escolhidas.some((e) => similarity(e, frase) >= 0.6)) continue;
    escolhidas.push(frase);
    if (escolhidas.length >= limit) break;
  }
  return escolhidas.map((texto) => ({
    text: texto,
    sensitive: detectSensitive(texto),
  }));
};
