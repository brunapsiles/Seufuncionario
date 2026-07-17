import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Home,
  Rocket,
  Target,
  Megaphone,
  Handshake,
  WalletCards,
  Workflow,
  PanelsTopLeft,
  FileText,
  History,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Plus,
  Send,
  Building2,
  CheckCircle2,
  Circle,
  Clock3,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit3,
  Copy,
  Download,
  Upload,
  ExternalLink,
  Users,
  ListTodo,
  TrendingUp,
  Globe2,
  ArrowUpRight,
  BriefcaseBusiness,
  MessageSquareText,
  Calculator,
  DollarSign,
  Save,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Archive,
  GripVertical,
  UserRound,
  ShieldCheck,
  CircleAlert,
  LogOut,
  Check,
  Lightbulb,
  Palette,
  ShoppingBag,
  Headphones,
  Boxes,
  UserCog,
  WandSparkles,
  Award,
  BadgeCheck,
  GraduationCap,
  LockKeyhole,
  Printer,
  Mail,
  Image as ImageIcon,
  Video,
  Link2,
  Wrench,
  ReceiptText,
  CalendarDays,
  Play,
  Bot,
  RefreshCw,
  Settings,
  Star,
  Plug,
  KeyRound,
  Sparkle,
  Layers,
  Languages,
  Route,
  MapPin,
  Navigation,
} from "lucide-react";

const LEGACY_STORAGE_KEY = "seu-funcionario-v1";
const ACTIVE_USER_KEY = "seu-funcionario-active-user";
const STORAGE_PREFIX = "seu-funcionario-v2:";
const AUTH_TOKEN_KEY = "seu-funcionario-auth-token";

const emptyDb = {
  user: null,
  spaceKey: null,
  updatedAt: null,
  onboarding: false,
  selectedBusinessId: null,
  businesses: [],
  tasks: [],
  leads: [],
  transactions: [],
  financeSettings: {},
  documents: [],
  sites: [],
  history: [],
  certificates: [],
  conversations: [],
  media: [],
  emailDrafts: [],
  customSpecialists: [],
  pluggedTools: [],
  selectedConversationId: null,
  journeys: {},
  preferences: { theme: "light", specialist: "Diretor" },
};

const nav = [
  ["inicio", "Início", Home],
  ["comecar", "Começar do zero", Rocket],
  ["estrategia", "Estratégia", Target],
  ["marketing", "Marca e Marketing", Megaphone],
  ["vendas", "Vendas e Clientes", Handshake],
  ["financeiro", "Financeiro", WalletCards],
  ["operacao", "Operação", Workflow],
  ["sites", "Sites e Materiais", PanelsTopLeft],
  ["documentos", "Documentos", FileText],
  ["ferramentas", "Ferramentas", Wrench],
  ["estudio", "Estúdio de IA", WandSparkles],
  ["historico", "Projetos", History],
  ["certificacoes", "Certificações", Award],
];

const navSecondary = [
  ["time", "Meu Time", Users],
  ["config", "Configurações", Settings],
];

const toolCatalog = [
  {
    id: "nfse",
    name: "NFS-e Nacional",
    category: "Nota fiscal",
    description:
      "Emissor oficial e gratuito de nota fiscal de serviço, inclusive para MEI.",
    url: "https://www.gov.br/pt-br/servicos/emitir-nota-fiscal-de-servico-eletronica",
    badge: "Oficial · Gratuito",
    keywords: "nota fiscal nfse serviço mei imposto",
    icon: ReceiptText,
  },
  {
    id: "nfe-sebrae",
    name: "Emissor NF-e Sebrae",
    category: "Nota fiscal",
    description:
      "Emissão gratuita de NF-e para venda de produtos, disponível em todo o Brasil.",
    url: "https://emissornfe.sebrae.com.br/",
    badge: "Gratuito",
    keywords: "nota fiscal nfe produto venda sebrae",
    icon: ReceiptText,
  },
  {
    id: "nfse-api",
    name: "Documentação API NFS-e",
    category: "Nota fiscal",
    description:
      "Manuais e documentação técnica oficial para integração com sistemas de emissão.",
    url: "https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica",
    badge: "API oficial",
    keywords: "api nota fiscal nfse integração erp",
    icon: Link2,
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Comunicação",
    description: "Componha e envie e-mails usando sua conta Google.",
    url: "https://mail.google.com/mail/?view=cm&fs=1",
    badge: "Gratuito",
    keywords: "email e-mail gmail mensagem proposta orçamento",
    icon: Mail,
  },
  {
    id: "outlook",
    name: "Outlook",
    category: "Comunicação",
    description: "Abra uma nova mensagem no Outlook Web.",
    url: "https://outlook.office.com/mail/deeplink/compose",
    badge: "Gratuito",
    keywords: "email e-mail outlook mensagem",
    icon: Mail,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Web",
    category: "Comunicação",
    description: "Atendimento e acompanhamento de clientes pelo navegador.",
    url: "https://web.whatsapp.com/",
    badge: "Gratuito",
    keywords: "whatsapp cliente mensagem atendimento",
    icon: MessageSquareText,
  },
  {
    id: "calendar",
    name: "Google Agenda",
    category: "Organização",
    description: "Crie compromissos, prazos e lembretes.",
    url: "https://calendar.google.com/",
    badge: "Gratuito",
    keywords: "agenda calendário compromisso reunião prazo",
    icon: CalendarDays,
  },
  {
    id: "drive",
    name: "Google Drive",
    category: "Arquivos",
    description: "Armazene e compartilhe documentos e materiais.",
    url: "https://drive.google.com/",
    badge: "Redirecionamento",
    keywords: "arquivo documento drive compartilhar",
    icon: Archive,
  },
  {
    id: "sheets",
    name: "Google Planilhas",
    category: "Financeiro",
    description: "Organize dados, preços, despesas e controles.",
    url: "https://sheets.google.com/",
    badge: "Gratuito",
    keywords: "planilha financeiro preço despesa excel",
    icon: WalletCards,
  },
  {
    id: "canva",
    name: "Canva",
    category: "Design",
    description: "Crie apresentações, posts e materiais visuais.",
    url: "https://www.canva.com/",
    badge: "Redirecionamento",
    keywords: "design logo post apresentação imagem canva",
    icon: Palette,
  },
  {
    id: "trello",
    name: "Trello",
    category: "Organização",
    description: "Organize tarefas e projetos em quadros visuais.",
    url: "https://trello.com/",
    badge: "Redirecionamento",
    keywords: "tarefa projeto quadro kanban trello",
    icon: ListTodo,
  },
  {
    id: "notion",
    name: "Notion",
    category: "Organização",
    description: "Centralize documentos, processos e conhecimento.",
    url: "https://www.notion.so/",
    badge: "Redirecionamento",
    keywords: "documento processo wiki organização notion",
    icon: FileText,
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "Vendas",
    description:
      "CRM gratuito para contatos, negócios e acompanhamento comercial.",
    url: "https://www.hubspot.com/products/crm",
    badge: "CRM gratuito",
    keywords: "crm vendas lead cliente hubspot",
    icon: Users,
  },
];

function recommendedTools(text = "") {
  const terms = text.toLowerCase();
  return toolCatalog
    .filter((tool) =>
      tool.keywords
        .split(" ")
        .some((word) => word.length > 3 && terms.includes(word)),
    )
    .slice(0, 3);
}

const specialistData = [
  [
    "Diretor",
    Bot,
    "Entende o pedido, envolve as áreas certas e consolida tudo.",
  ],
  ["Fundador", Rocket, "Transforma uma ideia em um negócio estruturado."],
  ["Estrategista", Target, "Analisa cenários, riscos e prioridades."],
  ["Consultor", BriefcaseBusiness, "Diagnostica e recomenda ações práticas."],
  ["Redator", FileText, "Cria e aprimora textos profissionais."],
  ["Negociador", Handshake, "Prepara argumentos, objeções e acordos."],
  ["Precificador", Calculator, "Estrutura preços, custos e margens."],
  ["Marketing", Megaphone, "Cria posicionamento, campanhas e conteúdo."],
  ["Vendas", TrendingUp, "Organiza prospecção e acompanhamento."],
  ["Atendimento", Headphones, "Ajuda a responder e cuidar de clientes."],
  ["Financeiro", WalletCards, "Interpreta os números que você informar."],
  ["Operações", Boxes, "Cria processos, rotinas e checklists."],
  ["Pessoas", UserCog, "Apoia cargos, entrevistas e onboarding."],
  ["Criador de Sites", Globe2, "Transforma um briefing em página utilizável."],
  [
    "Jurídico",
    BriefcaseBusiness,
    "Contratos, minutas, políticas e riscos legais.",
  ],
  ["TI", Monitor, "Sistemas, integrações, automações e segurança técnica."],
  ["Produto", Lightbulb, "Discovery, roadmap, backlog e lançamento."],
  ["Projetos", ListTodo, "Escopo, cronograma, riscos e acompanhamento."],
  [
    "Customer Success",
    UserRound,
    "Onboarding, retenção, churn e planos de sucesso.",
  ],
  ["Dados", Filter, "Indicadores, análises e decisões com evidências."],
  ["Logística", Boxes, "Estoque, fretes, prazos e supply chain."],
  ["Compras", ShoppingBag, "Cotações, fornecedores e suprimentos."],
  ["Administrativo", Archive, "Rotinas, controles e organização interna."],
  [
    "Comunicação",
    MessageSquareText,
    "Comunicação institucional e gestão de crise.",
  ],
  ["Design", Palette, "Identidade visual, briefings e direção de arte."],
  ["Conteúdo", FileText, "Planejamento editorial, pautas e materiais ricos."],
  ["Pesquisa", Search, "Pesquisas de mercado e de usuário bem estruturadas."],
  ["Inovação", Lightbulb, "Ideias, experimentos e validação com critérios."],
  ["Expansão", Globe2, "Novos mercados, filiais, franquias e canais."],
  ["Growth", TrendingUp, "Experimentos de aquisição, retenção e receita."],
  ["E-commerce", ShoppingBag, "Loja virtual, checkout, conversão e campanhas."],
  ["Marketplace", PanelsTopLeft, "Cadastro, reputação, buy box e anúncios."],
  ["Qualidade", BadgeCheck, "Padrões, auditorias e melhoria contínua."],
  ["Compliance", ShieldCheck, "Políticas, condutas e riscos regulatórios."],
  [
    "Segurança da Informação",
    LockKeyhole,
    "Acessos, backups, LGPD e incidentes.",
  ],
  ["Processos", Workflow, "Mapeamento, padronização e automação."],
  [
    "Contabilidade",
    Calculator,
    "Organização contábil e material para o contador.",
  ],
  ["Riscos", CircleAlert, "Matriz de riscos, mitigação e monitoramento."],
  ["ESG", Sun, "Práticas ambientais, sociais e de governança."],
  [
    "Treinamento",
    GraduationCap,
    "Trilhas de capacitação e educação corporativa.",
  ],
  ["Auditoria", Eye, "Verificações independentes e planos de correção."],
  [
    "Inteligência Competitiva",
    Search,
    "Concorrentes, preços e movimentos de mercado.",
  ],
  ["Fornecedores", Handshake, "Homologação, contratos, SLAs e desempenho."],
  ["Parcerias", Handshake, "Alianças, acordos e governança da relação."],
  [
    "Captação",
    DollarSign,
    "Pitch deck, unit economics e preparação para investidores.",
  ],
];

const journeyData = {
  start: {
    title: "Quero começar um negócio",
    icon: Rocket,
    steps: [
      "Explicar a ideia",
      "Definir o problema",
      "Definir o público",
      "Avaliar a demanda",
      "Mapear concorrentes",
      "Criar proposta de valor",
      "Definir a oferta",
      "Estruturar preços",
      "Criar nome e posicionamento",
      "Plano de lançamento",
      "Materiais iniciais",
      "Página de apresentação",
      "Primeiros clientes",
    ],
  },
  organize: {
    title: "Quero organizar meu negócio",
    icon: Workflow,
    steps: [
      "Diagnóstico atual",
      "Produtos e serviços",
      "Preços",
      "Clientes",
      "Atendimento",
      "Financeiro",
      "Processos",
      "Tarefas",
      "Prioridades",
      "Plano de melhoria",
    ],
  },
  sell: {
    title: "Quero vender mais",
    icon: TrendingUp,
    steps: [
      "Diagnóstico comercial",
      "Cliente ideal",
      "Revisão da oferta",
      "Revisão dos preços",
      "Argumentos",
      "Mensagens de prospecção",
      "Proposta comercial",
      "Leads",
      "Acompanhamento",
      "Análise dos resultados",
    ],
  },
  brand: {
    title: "Quero profissionalizar minha marca",
    icon: Palette,
    steps: [
      "Diagnóstico da marca",
      "Posicionamento",
      "Tom de voz",
      "Identidade visual",
      "Biografia",
      "Materiais comerciais",
      "Redes sociais",
      "Site",
      "Portfólio",
      "Plano de comunicação",
    ],
  },
};

const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const slugify = (s) =>
  (s || "meu-site")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const contactLinks = (contact) => {
  const value = String(contact || "").trim();
  if (!value) return { phone: "", email: "" };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { phone: "", email: value };
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return { phone: "", email: "" };
  return { phone: digits.length <= 11 ? `55${digits}` : digits, email: "" };
};

const whatsappLink = (phone, message) =>
  `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

const toolBadgeLabel = (tool) =>
  tool.badge === "Redirecionamento" ? tool.badge : `Redirecionamento · ${tool.badge}`;

const shiftYmd = (ymd, days) => {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
};

export const addDaysYmd = (ymd, days) => {
  const s = shiftYmd(ymd, days);
  return s ? `${s.y}${String(s.m).padStart(2, "0")}${String(s.d).padStart(2, "0")}` : "";
};

const addDaysYmdDashed = (ymd, days) => {
  const s = shiftYmd(ymd, days);
  return s ? `${s.y}-${String(s.m).padStart(2, "0")}-${String(s.d).padStart(2, "0")}` : "";
};

export const googleCalendarUrl = (task) => {
  if (!task?.due) return "";
  const start = addDaysYmd(task.due, 0);
  const end = addDaysYmd(task.due, 1);
  if (!start || !end) return "";
  const details = [
    task.description,
    task.project ? `Projeto: ${task.project}` : "",
    task.assignee ? `Respons\u00e1vel: ${task.assignee}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title || "Tarefa")}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
};

let gsiLoadPromise = null;
const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise((resolve, reject) => {
    const ready = () =>
      window.google?.accounts?.oauth2
        ? resolve()
        : reject(new Error("Login do Google indisponível."));
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", ready, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = ready;
    s.onerror = () => reject(new Error("Não foi possível carregar o login do Google."));
    document.body.appendChild(s);
  });
  return gsiLoadPromise;
};

export const requestGoogleAccessToken = async (clientId, scope) => {
  if (!clientId)
    throw new Error("Conexão com o Google ainda não está configurada.");
  await loadGoogleIdentityScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp) => {
        if (resp?.error) reject(new Error("Permissão do Google negada."));
        else resolve(resp.access_token);
      },
      error_callback: () => reject(new Error("Não foi possível conectar com o Google.")),
    });
    client.requestAccessToken();
  });
};

const base64UrlFromText = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

const buildRawEmail = ({ to, subject, body }) => {
  const encodedSubject = `=?UTF-8?B?${base64UrlFromText(subject || "")}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    body || "",
  ].join("\r\n");
  return base64UrlFromText(message)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const sendGmailReal = async (clientId, { to, subject, body }) => {
  const token = await requestGoogleAccessToken(
    clientId,
    "https://www.googleapis.com/auth/gmail.send",
  );
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ raw: buildRawEmail({ to, subject, body }) }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Não foi possível enviar o e-mail agora.");
  }
  return res.json();
};

export const createGoogleCalendarEventReal = async (clientId, task) => {
  const token = await requestGoogleAccessToken(
    clientId,
    "https://www.googleapis.com/auth/calendar.events",
  );
  const start = addDaysYmdDashed(task.due, 0);
  const end = addDaysYmdDashed(task.due, 1);
  const details = [
    task.description,
    task.project ? `Projeto: ${task.project}` : "",
    task.assignee ? `Responsável: ${task.assignee}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: task.title || "Tarefa",
        description: details,
        start: { date: start },
        end: { date: end },
      }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Não foi possível criar o evento agora.");
  }
  return res.json();
};

const userStorageKey = (id) => `${STORAGE_PREFIX}${id}`;
const cleanDb = (user) => ({
  ...emptyDb,
  user: user || null,
  preferences: { ...emptyDb.preferences },
});

export function readUserDb(user) {
  if (!user?.id) return cleanDb(null);
  try {
    const saved = JSON.parse(
      localStorage.getItem(userStorageKey(user.id)) || "{}",
    );
    return {
      ...cleanDb(user),
      ...saved,
      user,
      preferences: { ...emptyDb.preferences, ...(saved.preferences || {}) },
    };
  } catch {
    return cleanDb(user);
  }
}

function loadInitialDb() {
  try {
    const activeId = localStorage.getItem(ACTIVE_USER_KEY);
    if (activeId) {
      const saved = JSON.parse(
        localStorage.getItem(userStorageKey(activeId)) || "{}",
      );
      if (saved.user?.id === activeId)
        return {
          ...cleanDb(saved.user),
          ...saved,
          preferences: { ...emptyDb.preferences, ...(saved.preferences || {}) },
        };
    }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "{}");
    if (legacy.user?.id) {
      localStorage.setItem(ACTIVE_USER_KEY, legacy.user.id);
      localStorage.setItem(
        userStorageKey(legacy.user.id),
        JSON.stringify(legacy),
      );
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return {
        ...cleanDb(legacy.user),
        ...legacy,
        preferences: { ...emptyDb.preferences, ...(legacy.preferences || {}) },
      };
    }
  } catch {}
  return cleanDb(null);
}

export function startUserSession(user) {
  localStorage.setItem(ACTIVE_USER_KEY, user.id);
  localStorage.removeItem("sf-space");
  localStorage.removeItem("sf-space-name");
  return readUserDb(user);
}

function authHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { authorization: `Bearer ${token}` } : {};
}

function endSession() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ACTIVE_USER_KEY);
  localStorage.removeItem("sf-space");
  localStorage.removeItem("sf-space-name");
  if (token)
    fetch("/api/auth/session", {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => {});
}

function mergeMedia(localItems = [], remoteItems = []) {
  return (remoteItems || []).map((item) => {
    if (item.localOnly && !item.url) {
      const local = (localItems || []).find((x) => x.id === item.id);
      if (local?.url) return { ...local };
    }
    return item;
  });
}

const activeSpaceId = () => {
  try {
    return localStorage.getItem("sf-space") || "";
  } catch {
    return "";
  }
};

function useDatabase() {
  const [db, setDb] = useState(loadInitialDb);
  const syncTimer = useRef(null);
  const pulled = useRef(false);
  const userId = db.user?.id;
  const space = activeSpaceId();
  const spaceKey = space || userId;
  const wsUrl = space
    ? `/api/workspace?owner=${encodeURIComponent(space)}`
    : "/api/workspace";

  useEffect(() => {
    if (!userId || !localStorage.getItem(AUTH_TOKEN_KEY)) return;
    let cancelled = false;
    fetch("/api/auth/session", { headers: authHeaders() })
      .then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(ACTIVE_USER_KEY);
          setDb(cleanDb(null));
          return;
        }
        if (data.user) setDb((current) => ({ ...current, user: data.user }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    pulled.current = false;
    if (!userId || !localStorage.getItem(AUTH_TOKEN_KEY)) return;
    let cancelled = false;
    fetch(wsUrl, { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || payload === null) return;
        setDb((current) => {
          const foreign = current.spaceKey && current.spaceKey !== spaceKey;
          if (payload.data) {
            const localNewer =
              !foreign &&
              current.updatedAt &&
              payload.updatedAt &&
              current.updatedAt > payload.updatedAt;
            if (localNewer) return { ...current, spaceKey };
            return {
              ...emptyDb,
              ...payload.data,
              media: mergeMedia(
                foreign ? [] : current.media,
                payload.data.media,
              ),
              user: current.user,
              spaceKey,
              updatedAt: payload.updatedAt,
            };
          }
          if (foreign) return { ...emptyDb, user: current.user, spaceKey };
          return { ...current, spaceKey };
        });
        pulled.current = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, space]);

  useEffect(() => {
    if (db.user?.id) {
      localStorage.setItem(ACTIVE_USER_KEY, db.user.id);
      localStorage.setItem(userStorageKey(db.user.id), JSON.stringify(db));
    }
    if (
      !userId ||
      !pulled.current ||
      db.spaceKey !== spaceKey ||
      !localStorage.getItem(AUTH_TOKEN_KEY)
    )
      return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const { user, spaceKey: _s, ...rest } = db;
      const data = {
        ...rest,
        media: (rest.media || []).map((item) =>
          item.url && item.url.startsWith("data:")
            ? { ...item, url: null, localOnly: true }
            : item,
        ),
      };
      fetch(wsUrl, {
        method: "PUT",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ data }),
      }).catch(() => {});
    }, 2500);
    return () => clearTimeout(syncTimer.current);
  }, [db, userId, space]);

  const update = (fn) =>
    setDb((current) => {
      const next =
        typeof fn === "function" ? fn(current) : { ...current, ...fn };
      return { ...next, updatedAt: new Date().toISOString() };
    });
  return [db, update];
}

function Logo({ compact = false }) {
  return (
    <div className="logo">
      <img
        className="logo-mark-img"
        src="/favicon.svg?v=6"
        alt="Seu Funcionário"
        width="36"
        height="36"
      />
      {!compact && (
        <span>
          Seu <strong>Funcionário</strong>
        </span>
      )}
    </div>
  );
}

function Button({
  children,
  icon: Icon,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button type={type} className={`button ${variant} ${className}`} {...props}>
      {Icon && <Icon size={17} />}
      <span>{children}</span>
    </button>
  );
}

function DynamicIcon({ icon: Icon, ...props }) {
  return Icon ? <Icon {...props} /> : null;
}

function Empty({ icon: Icon = Sparkles, title, text, action, onAction }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={23} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Button icon={Plus} onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Toast({ toast }) {
  return toast ? (
    <div className="toast">
      <CheckCircle2 size={18} />
      {toast}
    </div>
  ) : null;
}

const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
function renderInline(text) {
  const nodes = [];
  let last = 0,
    match,
    key = 0;
  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1]) nodes.push(<code key={key++}>{match[1].slice(1, -1)}</code>);
    else if (match[2])
      nodes.push(<strong key={key++}>{match[2].slice(2, -2)}</strong>);
    else if (match[3]) nodes.push(<em key={key++}>{match[3].slice(1, -1)}</em>);
    else
      nodes.push(
        <a key={key++} href={match[5]} target="_blank" rel="noreferrer">
          {match[4]}
        </a>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdown({ text }) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n");
  const blocks = [];
  const paragraph = [];
  let i = 0,
    key = 0;
  const flush = () => {
    if (paragraph.length) {
      blocks.push(<p key={key++}>{renderInline(paragraph.join(" "))}</p>);
      paragraph.length = 0;
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      flush();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={key++}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)/);
    if (heading) {
      flush();
      const Tag = `h${Math.min(heading[1].length, 4)}`;
      blocks.push(<Tag key={key++}>{renderInline(heading[2])}</Tag>);
      i += 1;
      continue;
    }
    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim())) {
      flush();
      blocks.push(<hr key={key++} />);
      i += 1;
      continue;
    }
    const listStart = line.match(/^\s*([-*•]|\d+[.)])\s+/);
    if (listStart) {
      flush();
      const ordered = /^\d/.test(listStart[1]);
      const items = [];
      while (i < lines.length) {
        const item = lines[i].match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
        if (!item) break;
        items.push(
          item[1].replace(/^\[ \]\s*/, "☐ ").replace(/^\[x\]\s*/i, "☑ "),
        );
        i += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={key++}>
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(
          lines[i]
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim()),
        );
        i += 1;
      }
      const body = rows.filter(
        (row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)),
      );
      const [head, ...rest] = body;
      blocks.push(
        <div className="md-table" key={key++}>
          <table>
            <thead>
              <tr>
                {(head || []).map((cell, j) => (
                  <th key={j}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, j) => (
                    <td key={j}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const quote = line.match(/^\s*>\s?(.*)/);
    if (quote) {
      flush();
      const parts = [];
      while (i < lines.length) {
        const part = lines[i].match(/^\s*>\s?(.*)/);
        if (!part) break;
        parts.push(part[1]);
        i += 1;
      }
      blocks.push(
        <blockquote key={key++}>{renderInline(parts.join(" "))}</blockquote>,
      );
      continue;
    }
    if (!line.trim()) {
      flush();
      i += 1;
      continue;
    }
    paragraph.push(line.trim());
    i += 1;
  }
  flush();
  return <div className="md">{blocks}</div>;
}

function Login({ update }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleId, setGoogleId] = useState("");
  const googleRef = useRef(null);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setGoogleId(d.googleClientId || ""))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!googleId) return;
    const handle = (resp) => {
      fetch("/api/auth/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credential: resp.credential }),
      })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) throw new Error(d.error || "Falha no login com Google.");
          localStorage.setItem(AUTH_TOKEN_KEY, d.token);
          update(() => startUserSession(d.user));
        })
        .catch((e) => setError(e.message));
    };
    const init = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleId,
        callback: handle,
      });
      googleRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        locale: "pt-BR",
      });
    };
    if (window.google?.accounts?.id) {
      init();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = init;
    document.body.appendChild(s);
  }, [googleId]);
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState("");
  const changeMode = (next) => {
    setMode(next);
    setError("");
    setForm((current) => ({ ...current, password: "" }));
  };
  const enter = (data) => {
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    update(() => startUserSession(data.user));
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError("Informe um e-mail válido.");
    if (form.password.length < 8)
      return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (mode === "register" && form.name.trim().length < 2)
      return setError("Informe seu nome.");
    setBusy(true);
    try {
      const response = await fetch(
        `/api/auth/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email,
            password: form.password,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Não foi possível acessar sua conta.");
      if (data.pending) {
        setPending(data.email);
        setCode("");
        return;
      }
      enter(data);
    } catch (reason) {
      setError(
        reason.message === "Failed to fetch"
          ? "Não foi possível conectar ao servidor. Tente novamente."
          : reason.message,
      );
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    if (code.length < 6) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: pending, code }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(data.error || "Não foi possível confirmar o código.");
      enter(data);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setError("");
    try {
      const r = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: pending }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Não foi possível reenviar.");
      setError("Novo código enviado. Confira seu e-mail.");
    } catch (reason) {
      setError(reason.message);
    }
  };
  const [recover, setRecover] = useState(null);
  const forgot = async () => {
    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError("Digite seu e-mail no campo acima e clique de novo.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(data.error || "Não foi possível enviar o código.");
      setRecover({ email });
      setCode("");
      setForm((c) => ({ ...c, password: "" }));
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  const doReset = async () => {
    if (code.length < 6) return setError("Digite o código de 6 dígitos.");
    if (form.password.length < 8)
      return setError("A nova senha precisa ter pelo menos 8 caracteres.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: recover.email,
          code,
          password: form.password,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(data.error || "Não foi possível redefinir a senha.");
      enter(data);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  if (recover)
    return (
      <main className="auth-shell verify-shell">
        <div className="auth-card verify-card">
          <span className="mobile-logo">
            <Logo />
          </span>
          <span className="eyebrow">RECUPERAR ACESSO</span>
          <h2>Redefinir senha</h2>
          <p>
            Enviamos um código de 6 dígitos para{" "}
            <strong>{recover.email}</strong>. Digite o código e escolha a nova
            senha.
          </p>
          <Field label="Código de 6 dígitos">
            <input
              className="code-input"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
            />
          </Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres">
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
          {error && (
            <div className="auth-error" role="alert">
              <CircleAlert />
              {error}
            </div>
          )}
          <Button
            className="full"
            icon={busy ? RefreshCw : KeyRound}
            disabled={busy}
            onClick={doReset}
          >
            {busy ? "Redefinindo..." : "Redefinir e entrar"}
          </Button>
          <p className="auth-switch">
            <button
              type="button"
              onClick={() => {
                setRecover(null);
                setCode("");
                setError("");
              }}
            >
              Voltar para o login
            </button>
          </p>
        </div>
      </main>
    );
  if (pending)
    return (
      <main className="auth-shell verify-shell">
        <div className="auth-card verify-card">
          <span className="mobile-logo">
            <Logo />
          </span>
          <span className="eyebrow">VERIFICAÇÃO DE E-MAIL</span>
          <h2>Confirme seu e-mail</h2>
          <p>
            Enviamos um código de 6 dígitos para <strong>{pending}</strong>.
            Digite abaixo para ativar sua conta.
          </p>
          <Field label="Código de 6 dígitos">
            <input
              className="code-input"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
            />
          </Field>
          {error && (
            <div className="auth-error" role="alert">
              <CircleAlert />
              {error}
            </div>
          )}
          <Button
            className="full"
            icon={busy ? RefreshCw : CheckCircle2}
            disabled={busy || code.length < 6}
            onClick={verify}
          >
            {busy ? "Verificando..." : "Confirmar e entrar"}
          </Button>
          <p className="auth-switch">
            Não recebeu?{" "}
            <button type="button" onClick={resend}>
              Reenviar código
            </button>{" "}
            ·{" "}
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setCode("");
                setError("");
              }}
            >
              Voltar
            </button>
          </p>
        </div>
      </main>
    );
  return (
    <main className="auth-shell">
      <div className="auth-art">
        <Logo />
        <div>
          <span className="eyebrow light">SEU NEGÓCIO EM MOVIMENTO</span>
          <h1>
            Tenha o funcionário que sua empresa precisa,{" "}
            <em>quando precisar.</em>
          </h1>
          <p>
            Mais de 40 funcionários especialistas — estratégia, jurídico,
            marketing, vendas, financeiro, TI e muito mais — coordenados por um
            Diretor de Inteligência.
          </p>
        </div>
        <div className="auth-chips">
          <span>
            <Target />
            Planeje
          </span>
          <span>
            <WandSparkles />
            Crie
          </span>
          <span>
            <CheckCircle2 />
            Execute
          </span>
        </div>
      </div>
      <div className="auth-form">
        <div className="auth-card">
          <span className="mobile-logo">
            <Logo />
          </span>
          <div className="auth-tabs" role="tablist" aria-label="Acesso">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              Criar conta
            </button>
          </div>
          <span className="eyebrow">
            {mode === "login" ? "BEM-VINDO DE VOLTA" : "COMECE AGORA"}
          </span>
          <h2>
            {mode === "login"
              ? "Entre no seu espaço"
              : "Crie seu espaço de trabalho"}
          </h2>
          <p>
            {mode === "login"
              ? "Use o e-mail e a senha cadastrados para continuar."
              : "Crie sua conta gratuita. Nenhum cartão é necessário."}
          </p>
          {googleId && (
            <>
              <div ref={googleRef} className="google-btn" />
              <div className="or-divider">
                <span>ou use e-mail</span>
              </div>
            </>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <Field label="Seu nome">
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Como podemos chamar você?"
                />
              </Field>
            )}
            <Field label="E-mail">
              <input
                required
                autoFocus={mode === "login"}
                autoComplete="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="voce@empresa.com"
              />
            </Field>
            <Field
              label="Senha"
              hint={mode === "register" ? "Mínimo de 8 caracteres" : undefined}
            >
              <input
                required
                minLength="8"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <div className="auth-error" role="alert">
                <CircleAlert />
                {error}
              </div>
            )}
            <Button
              className="full"
              type="submit"
              icon={ArrowUpRight}
              disabled={busy}
            >
              {busy
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar minha conta"}
            </Button>
          </form>
          <p className="auth-switch">
            {mode === "login"
              ? "Ainda não tem uma conta?"
              : "Já possui uma conta?"}{" "}
            <button
              type="button"
              onClick={() =>
                changeMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login" ? "Criar conta gratuitamente" : "Entrar agora"}
            </button>
            {mode === "login" && (
              <>
                {" "}
                ·{" "}
                <button type="button" onClick={forgot} disabled={busy}>
                  Esqueci minha senha
                </button>
              </>
            )}
          </p>
          <p className="privacy">
            <ShieldCheck />
            Sua senha é protegida com criptografia e seus projetos ficam
            sincronizados com a sua conta — entre de qualquer dispositivo e
            continue de onde parou.
          </p>
        </div>
      </div>
    </main>
  );
}

function Onboarding({ db, update }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    stage: "Tenho apenas uma ideia",
    hasBusiness: "Sim",
    name: "",
    segment: "",
    need: "Organizar os próximos passos",
    areas: ["Estratégia"],
  });
  const finish = (skip) => {
    let business = null;
    if (!skip && form.name.trim())
      business = {
        id: uid(),
        name: form.name.trim(),
        owner: db.user.name,
        segment: form.segment.trim(),
        stage: form.stage,
        goal: form.need,
        hasBusiness: form.hasBusiness,
        focusAreas: form.areas.join(", "),
        city: "",
        audience: "",
        offer: "",
        tone: "Profissional e acolhedor",
        createdAt: today(),
        main: true,
      };
    update((d) => ({
      ...d,
      onboarding: true,
      businesses: business ? [business, ...d.businesses] : d.businesses,
      selectedBusinessId: business?.id || d.selectedBusinessId,
    }));
  };
  const stages = [
    "Tenho apenas uma ideia",
    "Estou estruturando o negócio",
    "Estou começando a vender",
    "Já tenho clientes",
    "Quero organizar a operação",
    "Quero aumentar as vendas",
    "Quero profissionalizar a empresa",
    "Quero expandir",
  ];
  const needs = [
    "Organizar os próximos passos",
    "Conseguir clientes",
    "Criar minha marca",
    "Definir preços",
    "Organizar a operação",
    "Criar um site",
  ];
  return (
    <main className="onboarding">
      <header>
        <Logo />
        <button className="text-button" onClick={() => finish(true)}>
          Pular por enquanto
        </button>
      </header>
      <section className="onboard-card">
        <div className="steps">
          <span className={step >= 0 ? "active" : ""} />
          <span className={step >= 1 ? "active" : ""} />
          <span className={step >= 2 ? "active" : ""} />
        </div>
        {step === 0 && (
          <>
            <span className="eyebrow">PASSO 1 DE 3</span>
            <h1>Onde seu negócio está hoje?</h1>
            <p>Isso ajuda a mostrar as ferramentas mais úteis para você.</p>
            <div className="option-grid">
              {stages.map((s) => (
                <button
                  key={s}
                  className={form.stage === s ? "selected" : ""}
                  onClick={() => setForm({ ...form, stage: s })}
                >
                  {form.stage === s ? <CheckCircle2 /> : <Circle />}
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <span className="eyebrow">PASSO 2 DE 3</span>
            <h1>Conte um pouco sobre o negócio</h1>
            <p>Você pode completar e editar tudo depois.</p>
            <div className="form-grid">
              <Field label="Você já possui um negócio em atividade?">
                <select
                  value={form.hasBusiness}
                  onChange={(e) =>
                    setForm({ ...form, hasBusiness: e.target.value })
                  }
                >
                  <option>Sim</option>
                  <option>Não, estou começando</option>
                </select>
              </Field>
              <Field label="Nome do negócio">
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Ateliê Aurora"
                />
              </Field>
              <Field label="Segmento">
                <input
                  value={form.segment}
                  onChange={(e) =>
                    setForm({ ...form, segment: e.target.value })
                  }
                  placeholder="Ex.: confeitaria, consultoria..."
                />
              </Field>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <span className="eyebrow">PASSO 3 DE 3</span>
            <h1>O que mais precisa resolver agora?</h1>
            <p>Seu painel será organizado a partir desta prioridade.</p>
            <div className="option-grid compact">
              {needs.map((s) => (
                <button
                  key={s}
                  className={form.need === s ? "selected" : ""}
                  onClick={() => setForm({ ...form, need: s })}
                >
                  {form.need === s ? <CheckCircle2 /> : <Circle />}
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        <footer>
          <Button
            variant="ghost"
            icon={ChevronLeft}
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Voltar
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>
              Continuar <ChevronRight size={17} />
            </Button>
          ) : (
            <Button icon={Sparkles} onClick={() => finish(false)}>
              Preparar meu painel
            </Button>
          )}
        </footer>
      </section>
    </main>
  );
}

function BusinessForm({ value, onSave, onClose }) {
  const [f, setF] = useState(
    value || {
      name: "",
      owner: "",
      segment: "",
      stage: "Estou estruturando o negócio",
      city: "",
      audience: "",
      offer: "",
      goal: "",
      tone: "Profissional e acolhedor",
      differentiators: "",
      competitors: "",
      channels: "",
      website: "",
      social: "",
      priceRange: "",
      challenges: "",
      visualIdentity: "",
      focusAreas: "",
    },
  );
  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    onSave({
      ...f,
      id: f.id || uid(),
      name: f.name.trim(),
      createdAt: f.createdAt || today(),
    });
  };
  return (
    <form className="modal-body" onSubmit={save}>
      <div className="form-grid">
        <Field label="Nome do negócio">
          <input
            required
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Responsável">
          <input
            value={f.owner}
            onChange={(e) => setF({ ...f, owner: e.target.value })}
          />
        </Field>
        <Field label="Segmento">
          <input
            value={f.segment}
            onChange={(e) => setF({ ...f, segment: e.target.value })}
          />
        </Field>
        <Field label="Estágio">
          <select
            value={f.stage}
            onChange={(e) => setF({ ...f, stage: e.target.value })}
          >
            <option>Tenho apenas uma ideia</option>
            <option>Estou estruturando o negócio</option>
            <option>Estou começando a vender</option>
            <option>Já tenho clientes</option>
            <option>Quero organizar a operação</option>
            <option>Quero aumentar as vendas</option>
            <option>Quero profissionalizar a empresa</option>
            <option>Quero expandir</option>
          </select>
        </Field>
        <Field label="Cidade ou região">
          <input
            value={f.city}
            onChange={(e) => setF({ ...f, city: e.target.value })}
          />
        </Field>
        <Field label="Público-alvo">
          <input
            value={f.audience}
            onChange={(e) => setF({ ...f, audience: e.target.value })}
          />
        </Field>
        <Field label="Produtos ou serviços">
          <textarea
            value={f.offer}
            onChange={(e) => setF({ ...f, offer: e.target.value })}
          />
        </Field>
        <Field label="Objetivo principal">
          <textarea
            value={f.goal}
            onChange={(e) => setF({ ...f, goal: e.target.value })}
          />
        </Field>
        <Field label="Tom de comunicação">
          <input
            value={f.tone}
            onChange={(e) => setF({ ...f, tone: e.target.value })}
          />
        </Field>
        <Field label="Diferenciais">
          <textarea
            value={f.differentiators || ""}
            onChange={(e) => setF({ ...f, differentiators: e.target.value })}
            placeholder="O que faz clientes escolherem este negócio?"
          />
        </Field>
        <Field label="Concorrentes e referências">
          <textarea
            value={f.competitors || ""}
            onChange={(e) => setF({ ...f, competitors: e.target.value })}
            placeholder="Nomes, links ou alternativas consideradas pelo cliente"
          />
        </Field>
        <Field label="Canais de venda e atendimento">
          <input
            value={f.channels || ""}
            onChange={(e) => setF({ ...f, channels: e.target.value })}
            placeholder="Ex.: loja, WhatsApp, Instagram, indicação"
          />
        </Field>
        <Field label="Site">
          <input
            type="url"
            value={f.website || ""}
            onChange={(e) => setF({ ...f, website: e.target.value })}
            placeholder="https://"
          />
        </Field>
        <Field label="Redes sociais">
          <input
            value={f.social || ""}
            onChange={(e) => setF({ ...f, social: e.target.value })}
            placeholder="@perfil ou links"
          />
        </Field>
        <Field label="Faixa de preço">
          <input
            value={f.priceRange || ""}
            onChange={(e) => setF({ ...f, priceRange: e.target.value })}
            placeholder="Ex.: R$ 80 a R$ 350"
          />
        </Field>
        <Field label="Principais dificuldades">
          <textarea
            value={f.challenges || ""}
            onChange={(e) => setF({ ...f, challenges: e.target.value })}
          />
        </Field>
        <Field label="Áreas prioritárias">
          <input
            value={f.focusAreas || ""}
            onChange={(e) => setF({ ...f, focusAreas: e.target.value })}
            placeholder="Ex.: vendas, financeiro, marketing"
          />
        </Field>
        <Field label="Identidade visual atual">
          <textarea
            value={f.visualIdentity || ""}
            onChange={(e) => setF({ ...f, visualIdentity: e.target.value })}
            placeholder="Cores, tipografia, símbolos e materiais existentes"
          />
        </Field>
      </div>
      <div className="modal-actions">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" icon={Save}>
          Salvar negócio
        </Button>
      </div>
    </form>
  );
}

function NewEmployeeModal({ onClose, onSave }) {
  const [f, setF] = useState({ name: "", instructions: "" });
  const submit = (e) => {
    e.preventDefault();
    const name = f.name.trim().slice(0, 48);
    const instructions = f.instructions.trim().slice(0, 800);
    if (name.length < 3 || instructions.length < 20) return;
    onSave({ name, instructions });
  };
  return (
    <Modal title="Contratar novo funcionário" onClose={onClose}>
      <form className="modal-body" onSubmit={submit}>
        <div className="notice">
          <Sparkles />
          <span>
            Descreva a especialidade e o Seu Funcionário cria um especialista
            sob medida — por setor, profissão, projeto ou problema específico.
            Ele fica salvo na sua equipe.
          </span>
        </div>
        <Field
          label="Área ou especialidade"
          hint="Ex.: Tráfego pago, Licitações, Clínicas, Exportação..."
        >
          <input
            required
            autoFocus
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value.slice(0, 48) })}
            placeholder="Ex.: Licitações públicas"
          />
        </Field>
        <Field
          label="O que esse funcionário deve saber e fazer"
          hint="Mínimo de 20 caracteres"
        >
          <textarea
            required
            value={f.instructions}
            onChange={(e) =>
              setF({ ...f, instructions: e.target.value.slice(0, 800) })
            }
            placeholder="Ex.: Especialista em vender para o governo: encontra editais adequados, monta checklist de documentos, analisa requisitos e prepara propostas."
          />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" icon={Plus}>
            Contratar funcionário
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UniversalRequest({ db, update, business, setToast }) {
  const [text, setText] = useState(
    () => localStorage.getItem("sf-draft") || "",
  );
  const [busy, setBusy] = useState(false);
  const [newEmployee, setNewEmployee] = useState(false);
  const [error, setError] = useState("");
  const [revealing, setRevealing] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const endRef = useRef(null);
  const chatUploadRef = useRef(null);
  const specialist = db.preferences.specialist;
  const conversations = db.conversations || [];
  const active =
    conversations.find((x) => x.id === db.selectedConversationId) || null;
  const messages = active?.messages || [];
  useEffect(() => {
    localStorage.setItem("sf-draft", text);
  }, [text]);
  useEffect(() => {
    const el = endRef.current?.parentElement;
    if (typeof el?.scrollTo === "function")
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, revealing?.count]);
  useEffect(() => {
    if (!revealing?.id) return;
    const message = messages.find((item) => item.id === revealing.id);
    if (!message || revealing.count >= message.content.length) {
      setRevealing(null);
      return;
    }
    const step = Math.max(2, Math.ceil(message.content.length / 180));
    const timer = setTimeout(
      () =>
        setRevealing((current) =>
          current?.id === message.id
            ? {
                ...current,
                count: Math.min(message.content.length, current.count + step),
              }
            : current,
        ),
      18,
    );
    return () => clearTimeout(timer);
  }, [revealing, messages]);
  const newChat = () => {
    update((d) => ({ ...d, selectedConversationId: null }));
    setText("");
    setError("");
  };
  const attachDocuments = async (fileList) => {
    const files = [...(fileList || [])].slice(0, 3 - attachments.length);
    if (!files.length || attachmentBusy) return;
    setAttachmentBusy(true);
    setError("");
    const next = [];
    const failed = [];
    for (const file of files) {
      try {
        const extracted = await extractDocumentText(file);
        next.push({
          id: uid(),
          name: file.name,
          size: file.size,
          kind: extracted.kind.label,
          content: extracted.content.slice(0, 12_000),
        });
      } catch (uploadError) {
        failed.push(`${file.name}: ${uploadError.message}`);
      }
    }
    if (next.length) {
      setAttachments((current) => [...current, ...next].slice(0, 3));
      setToast(
        next.length === 1
          ? "Documento anexado à conversa"
          : `${next.length} documentos anexados`,
      );
    }
    if (failed.length) setError(failed.join(" "));
    setAttachmentBusy(false);
    if (chatUploadRef.current) chatUploadRef.current.value = "";
  };
  const saveMessage = (message) => {
    const item = {
      id: uid(),
      title: active?.title || "Conversa com IA",
      request: messages.find((x) => x.role === "user")?.content || "",
      result: message.content,
      specialist,
      businessId: business?.id || null,
      type: "Conversa salva",
      status: "Concluído",
      createdAt: new Date().toISOString(),
    };
    update((d) => ({ ...d, history: [item, ...d.history] }));
    setToast("Resposta salva em Projetos e Histórico");
  };
  const submit = async () => {
    if ((!text.trim() && !attachments.length) || busy) return;
    const prompt =
        text.trim() ||
        "Analise os documentos anexados e apresente um resumo, pontos importantes e próximas ações.",
      attachmentContext = attachments.length
        ? `\n\nDOCUMENTOS ANEXADOS PELO USUÁRIO:\n${attachments
            .map(
              (item, index) =>
                `\n--- Documento ${index + 1}: ${item.name} ---\n${item.content}`,
            )
            .join("\n")}`
        : "",
      aiPrompt = `${prompt}${attachmentContext}`.slice(0, 48_000),
      conversationId = active?.id || uid(),
      userMessage = {
        id: uid(),
        role: "user",
        content: prompt,
        attachments: attachments.map(({ name, size, kind }) => ({
          name,
          size,
          kind,
        })),
        createdAt: new Date().toISOString(),
      };
    const previousMessages = messages;
    update((d) => {
      const list = d.conversations || [],
        exists = list.some((x) => x.id === conversationId),
        conversation = exists
          ? null
          : {
              id: conversationId,
              title: prompt.slice(0, 55),
              businessId: business?.id || null,
              specialist,
              createdAt: new Date().toISOString(),
              messages: [],
            };
      return {
        ...d,
        selectedConversationId: conversationId,
        conversations: exists
          ? list.map((x) =>
              x.id === conversationId
                ? {
                    ...x,
                    messages: [...x.messages, userMessage],
                    updatedAt: new Date().toISOString(),
                  }
                : x,
            )
          : [{ ...conversation, messages: [userMessage] }, ...list],
      };
    });
    setText("");
    setAttachments([]);
    localStorage.setItem("sf-draft", "");
    setBusy(true);
    setError("");
    const aiBody = {
      prompt: aiPrompt,
      specialist,
      customSpecialist:
        (db.customSpecialists || []).find((x) => x.name === specialist) || null,
      messages: [...previousMessages, userMessage]
        .slice(-10)
        .map((x) => ({ role: x.role, content: x.content })),
      business: business
        ? {
            name: business.name,
            segment: business.segment,
            stage: business.stage,
            audience: business.audience,
            offer: business.offer,
            goal: business.goal,
            tone: business.tone,
            differentiators: business.differentiators,
            competitors: business.competitors,
            channels: business.channels,
            website: business.website,
            social: business.social,
            priceRange: business.priceRange,
            challenges: business.challenges,
            visualIdentity: business.visualIdentity,
            focusAreas: business.focusAreas,
          }
        : null,
    };
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 70000);
    let streamed = false;
    try {
      try {
        if (specialist === "Diretor") throw { skipStream: true };
        const sres = await fetch("/api/ai/stream", {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeaders() },
          signal: controller.signal,
          body: JSON.stringify(aiBody),
        });
        if (
          sres.ok &&
          (sres.headers.get("content-type") || "").includes(
            "text/event-stream",
          ) &&
          sres.body
        ) {
          const amId = uid();
          const amMsg = {
            id: amId,
            role: "assistant",
            content: "",
            toolIds: recommendedTools(prompt).map((x) => x.id),
            createdAt: new Date().toISOString(),
          };
          update((d) => ({
            ...d,
            conversations: (d.conversations || []).map((x) =>
              x.id === conversationId
                ? {
                    ...x,
                    messages: [...x.messages, amMsg],
                    updatedAt: new Date().toISOString(),
                  }
                : x,
            ),
          }));
          const reader = sres.body.getReader();
          const dec = new TextDecoder();
          let buf = "",
            acc = "",
            prov = null,
            mdl = null;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const chunks = buf.split("\n\n");
            buf = chunks.pop() || "";
            for (const chunk of chunks) {
              const line = chunk
                .split("\n")
                .find((l) => l.startsWith("data:"));
              if (!line) continue;
              try {
                const j = JSON.parse(line.slice(5).trim());
                if (j.t) {
                  acc += j.t;
                  const cur = acc;
                  update((d) => ({
                    ...d,
                    conversations: (d.conversations || []).map((x) =>
                      x.id === conversationId
                        ? {
                            ...x,
                            messages: x.messages.map((m) =>
                              m.id === amId ? { ...m, content: cur } : m,
                            ),
                          }
                        : x,
                    ),
                  }));
                } else if (j.done) {
                  prov = j.provider;
                  mdl = j.model;
                }
              } catch {}
            }
          }
          if (acc.trim()) {
            update((d) => ({
              ...d,
              conversations: (d.conversations || []).map((x) =>
                x.id === conversationId
                  ? {
                      ...x,
                      messages: x.messages.map((m) =>
                        m.id === amId ? { ...m, provider: prov, model: mdl } : m,
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : x,
              ),
            }));
            setToast("Resposta pronta");
            streamed = true;
          } else {
            update((d) => ({
              ...d,
              conversations: (d.conversations || []).map((x) =>
                x.id === conversationId
                  ? {
                      ...x,
                      messages: x.messages.filter((m) => m.id !== amId),
                    }
                  : x,
              ),
            }));
          }
        }
      } catch (streamErr) {
        if (streamErr.name === "AbortError") throw streamErr;
      }
      if (!streamed) {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        signal: controller.signal,
        body: JSON.stringify(aiBody),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data.error || "Não foi possível obter uma resposta agora.",
        );
      const assistantMessage = {
        id: uid(),
        role: "assistant",
        content: data.content,
        degraded: !!data.degraded,
        toolIds: recommendedTools(prompt).map((x) => x.id),
        createdAt: new Date().toISOString(),
      };
      update((d) => ({
        ...d,
        conversations: (d.conversations || []).map((x) =>
          x.id === conversationId
            ? {
                ...x,
                messages: [...x.messages, assistantMessage],
                updatedAt: new Date().toISOString(),
              }
            : x,
        ),
      }));
      setRevealing({ id: assistantMessage.id, count: 0 });
      setToast(data.degraded ? "Plano inicial preparado" : "Resposta pronta");
      }
    } catch (err) {
      setText(prompt);
      setError(
        err.name === "AbortError"
          ? "A resposta demorou demais. Seu texto foi restaurado para tentar novamente."
          : err.message,
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };
  const renderToolLink = (id) => {
    const tool = toolCatalog.find((x) => x.id === id);
    if (!tool) return null;
    const ToolIcon = tool.icon;
    return (
      <a href={tool.url} target="_blank" rel="noreferrer" key={id}>
        <ToolIcon />
        <span>
          <strong>{tool.name}</strong>
          <small>{toolBadgeLabel(tool)}</small>
        </span>
        <ExternalLink />
      </a>
    );
  };
  return (
    <section className="ask-card chat-card">
      <div className="ask-top">
        <div>
          <span className="spark-dot">
            <Sparkles />
          </span>
          <div>
            <h2>{active?.title || "O que você precisa resolver hoje?"}</h2>
            <p>Converse, complemente e refine sem perder o contexto.</p>
          </div>
        </div>
        <div className="chat-head-actions">
          <span className="business-context">
            <Building2 />
            {business?.name || "Nenhum negócio selecionado"}
          </span>
          {active && (
            <button
              className="icon-button danger"
              title="Excluir esta conversa"
              onClick={() => {
                if (
                  confirm(
                    "Excluir esta conversa? Respostas salvas em Projetos são mantidas.",
                  )
                )
                  update((d) => ({
                    ...d,
                    conversations: (d.conversations || []).filter(
                      (x) => x.id !== active.id,
                    ),
                    selectedConversationId: null,
                  }));
              }}
            >
              <Trash2 />
            </button>
          )}
          <Button variant="ghost" icon={Plus} onClick={newChat}>
            Nova conversa
          </Button>
        </div>
      </div>
      {conversations.length > 0 && (
        <div className="conversation-tabs">
          {conversations.slice(0, 5).map((c) => (
            <button
              className={c.id === active?.id ? "active" : ""}
              key={c.id}
              onClick={() =>
                update((d) => ({ ...d, selectedConversationId: c.id }))
              }
            >
              <MessageSquareText />
              <span className="tab-title">{c.title}</span>
            </button>
          ))}
        </div>
      )}
      <div className={`chat-messages ${messages.length ? "has-messages" : ""}`}>
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <Bot />
            <h3>Seu agente está pronto</h3>
            <p>
              Peça uma análise, material, plano ou orientação. Quando uma
              ferramenta externa for melhor, eu mostro o caminho certo.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div className={`chat-message ${message.role}`} key={message.id}>
              <span className="message-avatar">
                {message.role === "assistant" ? <Sparkles /> : db.user.name[0]}
              </span>
              <div className="message-content">
                <small>
                  {message.role === "assistant"
                    ? "Seu Funcionário"
                    : db.user.name}
                </small>
                {message.role === "assistant" ? (
                  <div
                    className={
                      revealing?.id === message.id ? "revealing-answer" : ""
                    }
                  >
                    <Markdown
                      text={
                        revealing?.id === message.id
                          ? message.content.slice(0, revealing.count)
                          : message.content
                      }
                    />
                  </div>
                ) : (
                  <>
                    <pre>{message.content}</pre>
                    {message.attachments?.length > 0 && (
                      <div className="message-attachments">
                        {message.attachments.map((item) => (
                          <span key={item.name}>
                            <FileText /> {item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {message.toolIds?.length > 0 && (
                  <div className="message-tools">
                    {message.toolIds.map(renderToolLink)}
                  </div>
                )}
                {message.role === "assistant" &&
                  revealing?.id !== message.id && (
                    <div className="message-actions">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(message.content);
                          setToast("Resposta copiada");
                        }}
                      >
                        <Copy />
                        Copiar
                      </button>
                      <button onClick={() => saveMessage(message)}>
                        <Save />
                        Salvar em projetos
                      </button>
                    </div>
                  )}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="chat-message assistant">
            <span className="message-avatar">
              <Sparkles />
            </span>
            <div className="typing">
              <i />
              <i />
              <i />
              <span>Organizando sua resposta...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-composer">
        <input
          ref={chatUploadRef}
          className="visually-hidden"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
          aria-label="Anexar documentos ao chat"
          onChange={(event) => attachDocuments(event.target.files)}
        />
        {attachments.length > 0 && (
          <div className="chat-attachments">
            {attachments.map((item) => (
              <span key={item.id}>
                <FileText />
                <b>{item.name}</b>
                <button
                  aria-label={`Remover ${item.name}`}
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((attachment) => attachment.id !== item.id),
                    )
                  }
                >
                  <X />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          aria-label="Mensagem para a IA"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 8000))}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Escreva sua mensagem..."
        />
        <div className="ask-actions">
          <div className="specialist-select">
            <span>Com</span>
            <select
              aria-label="Funcionário"
              value={specialist}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new") {
                  setNewEmployee(true);
                  return;
                }
                update((d) => ({
                  ...d,
                  preferences: { ...d.preferences, specialist: v },
                }));
              }}
            >
              <optgroup label="Equipe padrão">
                {specialistData.map((s) => (
                  <option key={s[0]} value={s[0]}>
                    {s[0]}
                  </option>
                ))}
              </optgroup>
              {(db.customSpecialists || []).length > 0 && (
                <optgroup label="Meus funcionários">
                  {db.customSpecialists.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__new">+ Contratar novo funcionário...</option>
            </select>
          </div>
          <span className="keyboard-hint">
            Enter envia · Shift + Enter quebra linha
          </span>
          <span className="ai-live" title="Assistência inteligente disponível">
            <span />
            Assistente online
          </span>
          <span className="counter">{text.length}/8000</span>
          <Button
            variant="ghost"
            icon={attachmentBusy ? RefreshCw : Upload}
            disabled={attachmentBusy || attachments.length >= 3}
            onClick={() => chatUploadRef.current?.click()}
          >
            {attachmentBusy ? "Lendo..." : "Anexar documento"}
          </Button>
          <Button
            icon={Send}
            disabled={(!text.trim() && !attachments.length) || busy}
            onClick={submit}
          >
            {busy ? "Pensando..." : "Enviar"}
          </Button>
        </div>
        {error && (
          <div className="ask-error">
            <CircleAlert />
            {error}
          </div>
        )}
      </div>
      {busy && (
        <div className="progress-line">
          <span />
        </div>
      )}
      {newEmployee && (
        <NewEmployeeModal
          onClose={() => setNewEmployee(false)}
          onSave={(emp) => {
            update((d) => ({
              ...d,
              customSpecialists: [
                ...(d.customSpecialists || []).filter(
                  (x) => x.name !== emp.name,
                ),
                emp,
              ],
              preferences: { ...d.preferences, specialist: emp.name },
            }));
            setNewEmployee(false);
            setToast(`Funcionário de ${emp.name} contratado`);
          }}
        />
      )}
    </section>
  );
}

function Dashboard({ db, update, business, go, setToast }) {
  const activeTasks = db.tasks.filter(
    (x) => x.status !== "Concluído" && x.businessId === business?.id,
  );
  const followups = db.leads.filter(
    (x) =>
      x.businessId === business?.id &&
      x.status !== "Ganho" &&
      x.status !== "Perdido",
  );
  const recent = db.history
    .filter((x) => !business || x.businessId === business.id)
    .slice(0, 3);
  const quickBase = [
    ["Validar uma ideia", Lightbulb, "comecar"],
    ["Montar meus preços", Calculator, "financeiro"],
    ["Encontrar clientes", Users, "vendas"],
    ["Criar um site", Globe2, "sites"],
    ["Organizar tarefas", ListTodo, "operacao"],
    ["Criar uma proposta", FileText, "documentos"],
    ["Traduzir um texto", Languages, "ferramentas"],
    ["Analisar meus números", Filter, "ferramentas"],
  ];
  const priorityText =
    `${business?.goal || ""} ${business?.focusAreas || ""}`.toLowerCase();
  const recommendedPage = /preç|finance/.test(priorityText)
    ? "financeiro"
    : /cliente|vend/.test(priorityText)
      ? "vendas"
      : /site/.test(priorityText)
        ? "sites"
        : /marca|marketing/.test(priorityText)
          ? "estrategia"
          : /opera|process|tarefa/.test(priorityText)
            ? "operacao"
            : "comecar";
  const quick = [...quickBase].sort(
    (a, b) =>
      Number(b[2] === recommendedPage) - Number(a[2] === recommendedPage),
  );
  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">CENTRAL DE TRABALHO</span>
          <h1>
            Olá, {db.user.name.split(" ")[0]}.{" "}
            <span>Vamos fazer acontecer?</span>
          </h1>
          <p>
            {business ? (
              <>
                <strong>{business.name}</strong> está na fase “{business.stage}
                ”.
              </>
            ) : (
              "Crie seu primeiro negócio para receber um painel personalizado."
            )}
          </p>
        </div>
        <div className="day-badge">
          <span>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long" })}
          </span>
          <strong>{new Date().getDate()}</strong>
          <small>
            {new Date().toLocaleDateString("pt-BR", { month: "short" })}
          </small>
        </div>
      </div>
      <UniversalRequest
        db={db}
        update={update}
        business={business}
        setToast={setToast}
      />
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">ATALHOS</span>
            <h2>Comece por aqui</h2>
          </div>
        </div>
        <div className="quick-grid">
          {quick.map(([t, I, p], i) => (
            <button key={t} onClick={() => go(p)}>
              <span className={`quick-icon q${i}`}>
                <I />
              </span>
              <span>
                <strong>{t}</strong>
                <small>Abrir ferramenta</small>
              </span>
              <ArrowUpRight />
            </button>
          ))}
        </div>
      </section>
      {(db.pluggedTools || []).length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">MINHAS FERRAMENTAS</span>
              <h2>Acesso rápido</h2>
            </div>
            <button className="text-button" onClick={() => go("ferramentas")}>
              Gerenciar
            </button>
          </div>
          <div className="plugged-row">
            {(db.pluggedTools || []).map((id) => {
              const t = toolCatalog.find((x) => x.id === id);
              if (!t) return null;
              const TI = t.icon;
              return (
                <a key={id} href={t.url} target="_blank" rel="noreferrer">
                  <span className="tool-icon">
                    <TI />
                  </span>
                  <strong>{t.name}</strong>
                  <ExternalLink />
                </a>
              );
            })}
          </div>
        </section>
      )}
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">EM ANDAMENTO</span>
              <h2>Próximas ações</h2>
            </div>
            <button className="text-button" onClick={() => go("operacao")}>
              Ver todas
            </button>
          </div>
          {activeTasks.length ? (
            <div className="mini-list">
              {activeTasks.slice(0, 4).map((t) => (
                <div key={t.id}>
                  <button
                    aria-label="Concluir"
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        tasks: d.tasks.map((x) =>
                          x.id === t.id ? { ...x, status: "Concluído" } : x,
                        ),
                      }))
                    }
                  >
                    <Circle />
                  </button>
                  <span>
                    <strong>{t.title}</strong>
                    <small>
                      {t.due || "Sem prazo"} · {t.priority}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={ListTodo}
              title="Nenhuma tarefa pendente"
              text="Transforme um plano em ações ou crie sua primeira tarefa."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">RELACIONAMENTOS</span>
              <h2>Leads para acompanhar</h2>
            </div>
            <button className="text-button" onClick={() => go("vendas")}>
              Abrir CRM
            </button>
          </div>
          {followups.length ? (
            <div className="mini-list">
              {followups.slice(0, 4).map((l) => (
                <div key={l.id}>
                  <span className="avatar">{l.name[0]}</span>
                  <span>
                    <strong>{l.name}</strong>
                    <small>
                      {l.status} · {l.next || "Sem follow-up"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Users}
              title="Seu CRM está livre"
              text="Adicione oportunidades e acompanhe cada conversa."
            />
          )}
        </section>
      </div>
      {recent.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">RECENTES</span>
              <h2>Continue de onde parou</h2>
            </div>
            <button className="text-button" onClick={() => go("historico")}>
              Ver histórico
            </button>
          </div>
          <div className="recent-grid">
            {recent.map((x) => (
              <article key={x.id}>
                <span className="doc-icon">
                  <Sparkles />
                </span>
                <div>
                  <span className="tag">{x.specialist}</span>
                  <h3>{x.title}</h3>
                  <small>{new Date(x.createdAt).toLocaleString("pt-BR")}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function journeyRecord(value) {
  return Array.isArray(value)
    ? { completed: value, evidence: {} }
    : {
        completed: value?.completed || [],
        evidence: value?.evidence || {},
      };
}

function journeyTool(step) {
  const text = step.toLowerCase();
  if (/preç|finance/.test(text)) return "financeiro";
  if (/cliente|lead|vend|prospec|comercial/.test(text)) return "vendas";
  if (/site|página/.test(text)) return "sites";
  if (/marca|identidade|biografia|rede social|material/.test(text))
    return "estudio";
  if (/processo|tarefa|prioridade|atendimento/.test(text)) return "operacao";
  if (/plano|proposta|diagnóstico|portfólio/.test(text)) return "documentos";
  return "estrategia";
}

function Journeys({ db, update, go }) {
  const [open, setOpen] = useState(null);
  const [drafts, setDrafts] = useState({});
  const saveMilestone = (id, i) => {
    const key = `${id}:${i}`;
    const evidence = String(drafts[key] || "").trim();
    if (evidence.length < 3) return;
    update((d) => {
      const record = journeyRecord(d.journeys[id]);
      return {
        ...d,
        journeys: {
          ...d.journeys,
          [id]: {
            completed: record.completed.includes(i)
              ? record.completed
              : [...record.completed, i],
            evidence: { ...record.evidence, [i]: evidence },
          },
        },
      };
    });
  };
  const reopenMilestone = (id, i) =>
    update((d) => {
      const record = journeyRecord(d.journeys[id]);
      return {
        ...d,
        journeys: {
          ...d.journeys,
          [id]: {
            ...record,
            completed: record.completed.filter((index) => index !== i),
          },
        },
      };
    });
  return (
    <PageTitle
      eyebrow="JORNADAS GUIADAS"
      title="Um caminho claro para cada objetivo"
      text="Avance no seu ritmo. O progresso é salvo automaticamente."
    >
      <div className="journey-grid">
        {Object.entries(journeyData).map(([id, j]) => {
          const done = journeyRecord(db.journeys[id]).completed;
          const pct = Math.round((done.length / j.steps.length) * 100);
          return (
            <article className="journey-card" key={id}>
              <span className="journey-icon">
                <DynamicIcon icon={j.icon} />
              </span>
              <h2>{j.title}</h2>
              <p>{j.steps.length} etapas práticas</p>
              <div className="meter">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="journey-meta">
                <span>
                  {done.length} de {j.steps.length} concluídas
                </span>
                <strong>{pct}%</strong>
              </div>
              <Button variant="secondary" onClick={() => setOpen(id)}>
                {done.length ? "Continuar jornada" : "Começar jornada"}
              </Button>
            </article>
          );
        })}
      </div>
      {open && (
        <Modal title={journeyData[open].title} onClose={() => setOpen(null)}>
          <div className="journey-steps">
            {journeyData[open].steps.map((s, i) => {
              const record = journeyRecord(db.journeys[open]);
              const checked = record.completed.includes(i);
              const key = `${open}:${i}`;
              const evidence = record.evidence[i] || "";
              return (
                <article className={checked ? "done" : ""} key={s}>
                  <span className="journey-check">
                    {checked ? <CheckCircle2 /> : <Circle />}
                  </span>
                  <div>
                    <small>Etapa {i + 1}</small>
                    <strong>{s}</strong>
                    {checked ? (
                      <>
                        <p>{evidence}</p>
                        <button
                          className="text-button"
                          onClick={() => reopenMilestone(open, i)}
                        >
                          Reabrir marco
                        </button>
                      </>
                    ) : (
                      <>
                        <textarea
                          value={drafts[key] || evidence}
                          onChange={(event) =>
                            setDrafts({ ...drafts, [key]: event.target.value })
                          }
                          placeholder="Descreva o entregável, decisão ou evidência produzida nesta etapa."
                        />
                        <div className="milestone-actions">
                          <Button
                            variant="secondary"
                            icon={Wrench}
                            onClick={() => {
                              setOpen(null);
                              go(journeyTool(s));
                            }}
                          >
                            Abrir ferramenta
                          </Button>
                          <Button
                            icon={CheckCircle2}
                            disabled={
                              String(drafts[key] || evidence).trim().length < 3
                            }
                            onClick={() => saveMilestone(open, i)}
                          >
                            Validar marco
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </Modal>
      )}
    </PageTitle>
  );
}

function PageTitle({ eyebrow, title, text, action, children }) {
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{text}</p>
        </div>
        {action}
      </div>
      {children}
    </>
  );
}

const areaToolkits = {
  estrategia: {
    label: "Estratégia",
    items: [
      {
        kind: "page",
        page: "comecar",
        title: "Jornadas guiadas",
        description: "Valide uma ideia ou estruture o negócio por etapas.",
        icon: Rocket,
      },
      {
        kind: "ai",
        tool: "dados",
        title: "Análise de cenários e números",
        description: "Transforme dados informados em padrões e decisões.",
        icon: Filter,
      },
      {
        kind: "page",
        page: "documentos",
        title: "Planos e diagnósticos",
        description: "Crie e organize planos, pesquisas e relatórios.",
        icon: FileText,
      },
      {
        kind: "page",
        page: "historico",
        title: "Projetos e decisões",
        description: "Continue, refine ou duplique trabalhos anteriores.",
        icon: History,
      },
      { kind: "external", tool: "notion" },
      { kind: "external", tool: "sheets" },
    ],
  },
  marketing: {
    label: "Marca e Marketing",
    items: [
      { kind: "ai", tool: "post" },
      { kind: "ai", tool: "ecommerce" },
      {
        kind: "page",
        page: "estudio",
        title: "Estúdio de logos e imagens",
        description: "Crie identidade, peças visuais, imagens e vídeos.",
        icon: Palette,
      },
      {
        kind: "page",
        page: "sites",
        title: "Sites e landing pages",
        description: "Crie, edite por conversa e publique seu site.",
        icon: Globe2,
      },
      { kind: "special", tool: "translate" },
      { kind: "external", tool: "canva" },
      { kind: "external", tool: "drive" },
    ],
  },
  vendas: {
    label: "Vendas e Clientes",
    items: [
      {
        kind: "scroll",
        target: "crm-board",
        title: "CRM e funil de vendas",
        description: "Cadastre leads, etapas e histórico de interações.",
        icon: Users,
      },
      { kind: "ai", tool: "sales" },
      { kind: "ai", tool: "support" },
      { kind: "special", tool: "email" },
      { kind: "external", tool: "whatsapp" },
      { kind: "external", tool: "hubspot" },
      { kind: "external", tool: "gmail" },
      { kind: "external", tool: "outlook" },
    ],
  },
  financeiro: {
    label: "Financeiro",
    items: [
      {
        kind: "scroll",
        target: "finance-transactions",
        title: "Fluxo de caixa",
        description: "Registre receitas e despesas e acompanhe o saldo.",
        icon: WalletCards,
      },
      {
        kind: "scroll",
        target: "finance-planning",
        title: "Metas e ponto de equilíbrio",
        description: "Planeje a receita necessária para cobrir os custos.",
        icon: Target,
      },
      { kind: "ai", tool: "price" },
      { kind: "ai", tool: "dados" },
      { kind: "ai", tool: "compras" },
      { kind: "external", tool: "sheets" },
      { kind: "external", tool: "nfse" },
      { kind: "external", tool: "nfe-sebrae" },
      { kind: "external", tool: "nfse-api" },
    ],
  },
  operacao: {
    label: "Operação",
    items: [
      {
        kind: "scroll",
        target: "task-board",
        title: "Tarefas e projetos",
        description: "Planeje, delegue e acompanhe a execução.",
        icon: ListTodo,
      },
      { kind: "ai", tool: "ops" },
      { kind: "ai", tool: "rh" },
      { kind: "ai", tool: "compras" },
      { kind: "special", tool: "route" },
      { kind: "external", tool: "calendar" },
      { kind: "external", tool: "trello" },
      { kind: "external", tool: "notion" },
    ],
  },
  sites: {
    label: "Sites e Materiais",
    items: [
      {
        kind: "scroll",
        target: "site-projects",
        title: "Construtor de sites",
        description: "Crie sites multipágina e edite tudo por conversa.",
        icon: Globe2,
      },
      {
        kind: "page",
        page: "estudio",
        title: "Logos, imagens e vídeos",
        description: "Produza materiais visuais no Estúdio de IA.",
        icon: ImageIcon,
      },
      {
        kind: "page",
        page: "documentos",
        title: "Propostas e materiais",
        description: "Crie documentos e exporte em PDF ou DOCX.",
        icon: FileText,
      },
      { kind: "ai", tool: "post" },
      { kind: "external", tool: "canva" },
      { kind: "external", tool: "drive" },
    ],
  },
  documentos: {
    label: "Documentos",
    items: [
      {
        kind: "scroll",
        target: "document-library",
        title: "Biblioteca e upload",
        description: "Envie, pesquise, edite, versione e exporte arquivos.",
        icon: Upload,
      },
      { kind: "ai", tool: "contract" },
      { kind: "special", tool: "translate" },
      {
        kind: "page",
        page: "estrategia",
        title: "Analisar com um especialista",
        description: "Use o documento como contexto em uma conversa.",
        icon: Bot,
      },
      { kind: "external", tool: "drive" },
      { kind: "external", tool: "notion" },
    ],
  },
};

function AreaToolkit({ area, db, update, business, setToast, go }) {
  const [activeTool, setActiveTool] = useState("");
  const config = areaToolkits[area];
  if (!config) return null;
  const resolve = (item) => {
    if (item.kind === "external") {
      const external = toolCatalog.find((tool) => tool.id === item.tool);
      return external
        ? {
            ...item,
            title: item.title || external.name,
            description: item.description || external.description,
            icon: item.icon || external.icon,
            url: external.url,
            badge: external.badge,
          }
        : null;
    }
    if (item.kind === "ai") {
      const tool = aiTools[item.tool];
      return tool
        ? {
            ...item,
            title: item.title || tool.title.replace(/^.*? — /, ""),
            description: item.description || tool.hint,
            icon: item.icon || tool.icon,
            badge: "Ferramenta inteligente",
          }
        : null;
    }
    const special = {
      translate: {
        title: "Tradutor profissional",
        description: "Traduza textos, propostas e comunicações.",
        icon: Languages,
      },
      route: {
        title: "Roteirizador de entregas",
        description: "Organize paradas e abra a rota no Google Maps.",
        icon: Route,
      },
      email: {
        title: "Escrever e-mail",
        description: "Prepare a mensagem e envie pela sua própria conta.",
        icon: Mail,
      },
    }[item.tool];
    return special ? { ...item, ...special, badge: "Dentro do app" } : item;
  };
  const items = config.items.map(resolve).filter(Boolean);
  const run = (item) => {
    if (item.kind === "page") return go(item.page);
    if (item.kind === "scroll") {
      document.getElementById(item.target)?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    setActiveTool(item.tool);
  };
  return (
    <section className="area-toolkit">
      <div className="section-head">
        <div>
          <span className="eyebrow">RECURSOS DESTA ÁREA</span>
          <h2>Tudo de {config.label} em um só lugar</h2>
          <p>{items.length} ferramentas e caminhos disponíveis agora.</p>
        </div>
      </div>
      <div className="area-tools-grid">
        {items.map((item, index) => {
          const Icon = item.icon || Wrench;
          const content = (
            <>
              <span className={`quick-icon q${index % 6}`}>
                <Icon />
              </span>
              <span>
                <small>
                  {item.kind === "external"
                    ? item.badge
                    : item.badge || "Módulo do app"}
                </small>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </span>
              {item.kind === "external" ? <ExternalLink /> : <ArrowUpRight />}
            </>
          );
          return item.kind === "external" ? (
            <a
              key={`${item.kind}-${item.tool}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              {content}
            </a>
          ) : (
            <button
              key={`${item.kind}-${item.tool || item.page || item.target}`}
              onClick={() => run(item)}
            >
              {content}
            </button>
          );
        })}
      </div>
      {activeTool === "translate" && (
        <TranslatorModal
          onClose={() => setActiveTool("")}
          setToast={setToast}
        />
      )}
      {activeTool === "route" && (
        <RouterModal onClose={() => setActiveTool("")} setToast={setToast} />
      )}
      {activeTool === "email" && (
        <EmailComposer onClose={() => setActiveTool("")} setToast={setToast} />
      )}
      {aiTools[activeTool] && (
        <AIToolModal
          config={aiTools[activeTool]}
          onClose={() => setActiveTool("")}
          setToast={setToast}
          update={update}
          business={business}
        />
      )}
    </section>
  );
}

function Specialists({
  db,
  update,
  business,
  setToast,
  go,
  area = "estrategia",
}) {
  const marketing = area === "marketing";
  return (
    <PageTitle
      eyebrow={marketing ? "MARCA E MARKETING" : "ESTRATÉGIA"}
      title={
        marketing
          ? "Marca, conteúdo e crescimento conectados"
          : "A habilidade certa para cada desafio"
      }
      text={
        marketing
          ? "Crie estratégia, conteúdo, materiais e presença digital sem procurar ferramentas em outras telas."
          : "Analise, planeje e transforme decisões em projetos usando todos os recursos disponíveis."
      }
    >
      <AreaToolkit
        area={area}
        db={db}
        update={update}
        business={business}
        setToast={setToast}
        go={go}
      />
      <UniversalRequest
        db={db}
        update={update}
        business={business}
        setToast={setToast}
      />
      <div className="specialist-grid">
        {specialistData.map(([n, I, d], i) => (
          <button
            className={db.preferences.specialist === n ? "active" : ""}
            key={n}
            onClick={() => {
              update((x) => ({
                ...x,
                preferences: { ...x.preferences, specialist: n },
              }));
              setToast(`${n} selecionado`);
            }}
          >
            <span className={`quick-icon q${i % 6}`}>
              <I />
            </span>
            <span>
              <strong>{n}</strong>
              <small>{d}</small>
            </span>
            {db.preferences.specialist === n && <CheckCircle2 />}
          </button>
        ))}
      </div>
    </PageTitle>
  );
}

function Tasks({ db, update, business, setToast, go }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("board");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [priorityFilter, setPriorityFilter] = useState("Todas");
  const [assigneeFilter, setAssigneeFilter] = useState("Todos");
  const [projectFilter, setProjectFilter] = useState("Todos");
  const [archiveFilter, setArchiveFilter] = useState("Ativas");
  const [realMembers, setRealMembers] = useState([]);
  const [googleId, setGoogleId] = useState("");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setGoogleId(d.googleClientId || ""))
      .catch(() => {});
  }, []);
  const addTaskToCalendar = async (task) => {
    try {
      await createGoogleCalendarEventReal(googleId, task);
      setToast("Evento adicionado à sua Google Agenda");
    } catch {
      window.open(googleCalendarUrl(task), "_blank", "noopener");
    }
  };
  const blankTask = {
    title: "",
    description: "",
    priority: "Média",
    status: "A fazer",
    due: "",
    area: "Operação",
    assigneeType: "real",
    assignee: "",
    project: "",
  };
  const [form, setForm] = useState(blankTask);
  const digitalCollaborators = [
    ...specialistData.map(([name]) => name),
    ...(db.customSpecialists || []).map((item) => item.name),
  ];
  useEffect(() => {
    let cancelled = false;
    fetch("/api/collab", { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setRealMembers(data?.members || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const statuses = ["A fazer", "Em andamento", "Aguardando", "Concluído"];
  const scoped = db.tasks.filter(
    (task) => !business || task.businessId === business.id,
  );
  const assignees = [
    ...new Set(scoped.map((task) => task.assignee).filter(Boolean)),
  ];
  const projects = [
    ...new Set(scoped.map((task) => task.project).filter(Boolean)),
  ];
  const items = db.tasks.filter(
    (t) =>
      (!business || t.businessId === business.id) &&
      `${t.title} ${t.description || ""} ${t.assignee || ""} ${t.project || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (statusFilter === "Todos" || t.status === statusFilter) &&
      (priorityFilter === "Todas" || t.priority === priorityFilter) &&
      (assigneeFilter === "Todos" || t.assignee === assigneeFilter) &&
      (projectFilter === "Todos" || t.project === projectFilter) &&
      (archiveFilter === "Todas" ||
        (archiveFilter === "Arquivadas" ? !!t.archived : !t.archived)),
  );
  const openTask = (task = null) => {
    setEditing(task?.id || null);
    setForm(task ? { ...blankTask, ...task } : blankTask);
    setModal(true);
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const now = new Date().toISOString();
    update((d) => {
      const item = {
        ...form,
        title: form.title.trim(),
        id: editing || uid(),
        businessId: business?.id || form.businessId || null,
        archived: !!form.archived,
        createdAt: form.createdAt || now,
        updatedAt: now,
      };
      return {
        ...d,
        tasks: editing
          ? d.tasks.map((task) => (task.id === editing ? item : task))
          : [item, ...d.tasks],
      };
    });
    const wantsNotify =
      form.assigneeType !== "digital" && form.notify && (form.notifyTo || "").trim();
    setModal(false);
    setEditing(null);
    setForm(blankTask);
    if (wantsNotify) {
      fetch("/api/tasks/notify", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          email: form.notifyTo.trim(),
          title: form.title.trim(),
          description: form.description || "",
          due: form.due || "",
          project: form.project || "",
        }),
      })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) =>
          setToast(
            ok
              ? "Tarefa salva e aviso enviado por e-mail"
              : d.error || "Tarefa salva, mas o aviso por e-mail falhou",
          ),
        )
        .catch(() => setToast("Tarefa salva, mas o aviso por e-mail falhou"));
    } else {
      setToast(editing ? "Tarefa atualizada" : "Tarefa criada");
    }
  };
  const changeTask = (id, changes) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((task) =>
        task.id === id
          ? { ...task, ...changes, updatedAt: new Date().toISOString() }
          : task,
      ),
    }));
  const removeTask = (id) => {
    if (!confirm("Excluir esta tarefa definitivamente?")) return;
    update((d) => ({
      ...d,
      tasks: d.tasks.filter((task) => task.id !== id),
    }));
    setToast("Tarefa excluída");
  };
  const startDigitalTask = (task) => {
    const specialist = task.assignee || "Diretor";
    const prompt = [
      `Execute esta tarefa como ${specialist}: ${task.title}.`,
      task.description ? `Contexto: ${task.description}` : "",
      task.project ? `Projeto: ${task.project}.` : "",
      task.due ? `Prazo: ${task.due}.` : "",
      "Comece apresentando a entrega e os próximos passos concretos.",
    ]
      .filter(Boolean)
      .join("\n");
    localStorage.setItem("sf-draft", prompt);
    update((d) => ({
      ...d,
      preferences: { ...d.preferences, specialist },
      tasks: d.tasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: item.status === "A fazer" ? "Em andamento" : item.status,
              startedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }));
    setToast(`Tarefa encaminhada para ${specialist}`);
    go("estrategia");
  };
  return (
    <PageTitle
      eyebrow="OPERAÇÃO"
      title="Tarefas e projetos"
      text="Organize as próximas ações sem perder o contexto."
      action={
        <Button icon={Plus} onClick={() => openTask()}>
          Nova tarefa
        </Button>
      }
    >
      <AreaToolkit
        area="operacao"
        db={db}
        update={update}
        business={business}
        setToast={setToast}
        go={go}
      />
      <div className="toolbar" id="task-board">
        <div className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar tarefas"
          />
        </div>
        <div className="view-toggle">
          <button
            className={view === "board" ? "active" : ""}
            onClick={() => setView("board")}
          >
            <GripVertical />
            Quadro
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <ListTodo />
            Lista
          </button>
        </div>
      </div>
      <div className="filter-row">
        <select
          aria-label="Filtrar por status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>Todos</option>
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar por prioridade"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option>Todas</option>
          <option>Baixa</option>
          <option>Média</option>
          <option>Alta</option>
        </select>
        <select
          aria-label="Filtrar por responsável"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option>Todos</option>
          {assignees.map((assignee) => (
            <option key={assignee}>{assignee}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar por projeto"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option>Todos</option>
          {projects.map((project) => (
            <option key={project}>{project}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar arquivamento"
          value={archiveFilter}
          onChange={(e) => setArchiveFilter(e.target.value)}
        >
          <option>Ativas</option>
          <option>Arquivadas</option>
          <option>Todas</option>
        </select>
      </div>
      {items.length === 0 ? (
        <Empty
          icon={ListTodo}
          title="Nenhuma tarefa encontrada"
          text="Crie uma ação com prioridade e prazo para começar."
          action="Criar tarefa"
          onAction={() => openTask()}
        />
      ) : view === "board" ? (
        <div className="kanban">
          {statuses.map((s) => (
            <section key={s}>
              <header>
                <span>{s}</span>
                <b>{items.filter((x) => x.status === s).length}</b>
              </header>
              {items
                .filter((x) => x.status === s)
                .map((t) => (
                  <article key={t.id}>
                    <div>
                      <span className={`priority ${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                      <span className="task-actions">
                        {t.due && (
                          <button
                            className="icon-button"
                            aria-label={`Adicionar "${t.title}" ao Google Agenda`}
                            title="Adicionar ao Google Agenda"
                            onClick={() => addTaskToCalendar(t)}
                          >
                            <CalendarDays />
                          </button>
                        )}
                        <button
                          className="icon-button"
                          aria-label="Editar tarefa"
                          onClick={() => openTask(t)}
                        >
                          <Edit3 />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t.archived ? "Desarquivar" : "Arquivar"}
                          onClick={() =>
                            changeTask(t.id, { archived: !t.archived })
                          }
                        >
                          <Archive />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label="Excluir tarefa"
                          onClick={() => removeTask(t.id)}
                        >
                          <Trash2 />
                        </button>
                      </span>
                    </div>
                    <h3>{t.title}</h3>
                    <p>{t.description || "Sem descrição"}</p>
                    <footer>
                      <span>
                        <Clock3 />
                        {t.due || "Sem prazo"}
                      </span>
                      <select
                        value={t.status}
                        onChange={(e) =>
                          update((d) => ({
                            ...d,
                            tasks: d.tasks.map((x) =>
                              x.id === t.id
                                ? { ...x, status: e.target.value }
                                : x,
                            ),
                          }))
                        }
                      >
                        {statuses.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </footer>
                    {(t.project || t.assignee) && (
                      <small className="task-context">
                        {t.project || "Sem projeto"} ·{" "}
                        {t.assignee || "Sem responsável"}
                        {t.assignee &&
                          ` · ${t.assigneeType === "digital" ? "Colaborador digital" : "Pessoa"}`}
                      </small>
                    )}
                    {t.assigneeType === "digital" &&
                      t.assignee &&
                      !t.archived && (
                        <button
                          className="task-trigger"
                          onClick={() => startDigitalTask(t)}
                          aria-label={`Iniciar tarefa com ${t.assignee}`}
                        >
                          <Play /> Iniciar com {t.assignee}
                        </button>
                      )}
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="data-list">
          {items.map((t) => (
            <article key={t.id}>
              <button
                onClick={() =>
                  update((d) => ({
                    ...d,
                    tasks: d.tasks.map((x) =>
                      x.id === t.id
                        ? {
                            ...x,
                            status:
                              x.status === "Concluído"
                                ? "A fazer"
                                : "Concluído",
                          }
                        : x,
                    ),
                  }))
                }
              >
                {t.status === "Concluído" ? <CheckCircle2 /> : <Circle />}
              </button>
              <span>
                <strong>{t.title}</strong>
                <small>
                  {t.area} · {t.priority} · {t.due || "Sem prazo"} ·{" "}
                  {t.project || "Sem projeto"} ·{" "}
                  {t.assignee || "Sem responsável"}
                  {t.assignee &&
                    ` · ${t.assigneeType === "digital" ? "Digital" : "Pessoa"}`}
                </small>
              </span>
              <select
                value={t.status}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    tasks: d.tasks.map((x) =>
                      x.id === t.id ? { ...x, status: e.target.value } : x,
                    ),
                  }))
                }
              >
                {statuses.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <span className="task-actions">
                {t.assigneeType === "digital" && t.assignee && !t.archived && (
                  <button
                    className="icon-button"
                    aria-label={`Iniciar tarefa com ${t.assignee}`}
                    title={`Iniciar com ${t.assignee}`}
                    onClick={() => startDigitalTask(t)}
                  >
                    <Play />
                  </button>
                )}
                {t.due && (
                  <button
                    className="icon-button"
                    aria-label={`Adicionar "${t.title}" ao Google Agenda`}
                    title="Adicionar ao Google Agenda"
                    onClick={() => addTaskToCalendar(t)}
                  >
                    <CalendarDays />
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label="Editar tarefa"
                  onClick={() => openTask(t)}
                >
                  <Edit3 />
                </button>
                <button
                  className="icon-button"
                  aria-label={t.archived ? "Desarquivar" : "Arquivar"}
                  onClick={() => changeTask(t.id, { archived: !t.archived })}
                >
                  <Archive />
                </button>
              </span>
            </article>
          ))}
        </div>
      )}
      {modal && (
        <Modal
          title={editing ? "Editar tarefa" : "Criar tarefa"}
          onClose={() => setModal(false)}
        >
          <form className="modal-body" onSubmit={save}>
            <Field label="Título">
              <input
                autoFocus
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Descrição">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="Prioridade">
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {statuses.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prazo">
                <input
                  type="date"
                  value={form.due}
                  onChange={(e) => setForm({ ...form, due: e.target.value })}
                />
              </Field>
              <Field label="Área">
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                >
                  <option>Operação</option>
                  <option>Estratégia</option>
                  <option>Vendas</option>
                  <option>Marketing</option>
                  <option>Atendimento</option>
                  <option>Financeiro</option>
                  <option>Jurídico</option>
                  <option>RH / Pessoas</option>
                  <option>TI / Tecnologia</option>
                  <option>Logística</option>
                  <option>Compras</option>
                  <option>Administrativo</option>
                  <option>Outra</option>
                </select>
              </Field>
              <Field label="Responsável">
                <select
                  value={form.assigneeType || "real"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      assigneeType: e.target.value,
                      assignee: "",
                    })
                  }
                >
                  <option value="real">Funcionário real</option>
                  <option value="digital">Colaborador digital</option>
                </select>
              </Field>
              {form.assigneeType === "digital" ? (
                <Field label="Colaborador digital">
                  <select
                    value={form.assignee || ""}
                    onChange={(e) =>
                      setForm({ ...form, assignee: e.target.value })
                    }
                  >
                    <option value="">Escolha quem executará</option>
                    {digitalCollaborators.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Nome do responsável">
                  <input
                    list="real-team-members"
                    value={form.assignee || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const member = realMembers.find((m) => m.name === value);
                      setForm({
                        ...form,
                        assignee: value,
                        notifyTo: member ? member.email : form.notifyTo || "",
                      });
                    }}
                    placeholder="Nome da pessoa (ou escolha da equipe)"
                  />
                  <datalist id="real-team-members">
                    {realMembers.map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.email}
                      </option>
                    ))}
                  </datalist>
                </Field>
              )}
              {form.assigneeType !== "digital" && (
                <Field
                  label="Avisar por e-mail"
                  hint="A pessoa recebe os detalhes da tarefa mesmo sem usar o app"
                >
                  <div className="notify-row">
                    <label className="cost-check">
                      <input
                        type="checkbox"
                        checked={!!form.notify}
                        onChange={(e) =>
                          setForm({ ...form, notify: e.target.checked })
                        }
                      />
                      <span>Enviar aviso</span>
                    </label>
                    {form.notify && (
                      <input
                        type="email"
                        value={form.notifyTo || ""}
                        onChange={(e) =>
                          setForm({ ...form, notifyTo: e.target.value })
                        }
                        placeholder="email@dapessoa.com"
                      />
                    )}
                  </div>
                </Field>
              )}
              <Field label="Projeto">
                <input
                  value={form.project || ""}
                  onChange={(e) =>
                    setForm({ ...form, project: e.target.value })
                  }
                  placeholder="Ex.: Lançamento de julho"
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editing ? "Salvar alterações" : "Criar tarefa"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}

function CRM({ db, update, business, setToast, go }) {
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Todos"),
    [emailLead, setEmailLead] = useState(null),
    [interaction, setInteraction] = useState({
      type: "Conversa",
      note: "",
      at: today(),
    });
  const blankLead = {
    name: "",
    company: "",
    contact: "",
    value: "",
    status: "Novo",
    next: "",
    notes: "",
    interactions: [],
  };
  const [form, setForm] = useState(blankLead);
  const stages = [
    "Novo",
    "Em conversa",
    "Proposta enviada",
    "Negociação",
    "Ganho",
    "Perdido",
  ];
  const leads = db.leads.filter(
    (l) =>
      (!business || l.businessId === business.id) &&
      (!search ||
        `${l.name} ${l.company}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (filter === "Todos" || l.status === filter),
  );
  const openLead = (lead = null) => {
    setEditing(lead?.id || null);
    setForm(lead ? { ...blankLead, ...lead } : blankLead);
    setInteraction({ type: "Conversa", note: "", at: today() });
    setModal(true);
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    update((d) => {
      const previous = d.leads.find((lead) => lead.id === editing);
      const stageChanged = previous && previous.status !== form.status;
      const item = {
        ...form,
        name: form.name.trim(),
        id: editing || uid(),
        businessId: business?.id || form.businessId || null,
        createdAt: form.createdAt || now,
        updatedAt: now,
        interactions: stageChanged
          ? [
              {
                id: uid(),
                type: "Mudança de etapa",
                note: `${previous.status} → ${form.status}`,
                at: today(),
                createdAt: now,
              },
              ...(form.interactions || []),
            ]
          : form.interactions || [],
      };
      return {
        ...d,
        leads: editing
          ? d.leads.map((lead) => (lead.id === editing ? item : lead))
          : [item, ...d.leads],
      };
    });
    setModal(false);
    setEditing(null);
    setForm(blankLead);
    setToast(editing ? "Lead atualizado" : "Lead adicionado ao CRM");
  };
  const addInteraction = () => {
    if (!interaction.note.trim()) return;
    const entry = {
      ...interaction,
      id: uid(),
      note: interaction.note.trim(),
      createdAt: new Date().toISOString(),
    };
    setForm((current) => ({
      ...current,
      interactions: [entry, ...(current.interactions || [])],
    }));
    setInteraction({ type: "Conversa", note: "", at: today() });
  };
  const changeStage = (lead, status) => {
    if (lead.status === status) return;
    const now = new Date().toISOString();
    update((d) => ({
      ...d,
      leads: d.leads.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              status,
              updatedAt: now,
              interactions: [
                {
                  id: uid(),
                  type: "Mudança de etapa",
                  note: `${lead.status} → ${status}`,
                  at: today(),
                  createdAt: now,
                },
                ...(item.interactions || []),
              ],
            }
          : item,
      ),
    }));
  };
  return (
    <PageTitle
      eyebrow="VENDAS E CLIENTES"
      title="CRM simples, acompanhamento real"
      text="Centralize contatos, conversas, propostas e próximos passos."
      action={
        <Button icon={Plus} onClick={() => openLead()}>
          Novo lead
        </Button>
      }
    >
      <AreaToolkit
        area="vendas"
        db={db}
        update={update}
        business={business}
        setToast={setToast}
        go={go}
      />
      <div id="crm-board" />
      <div className="metric-row">
        <Metric icon={Users} label="Leads" value={leads.length} />
        <Metric
          icon={TrendingUp}
          label="Em negociação"
          value={
            leads.filter((x) =>
              ["Proposta enviada", "Negociação"].includes(x.status),
            ).length
          }
        />
        <Metric
          icon={DollarSign}
          label="Valor informado"
          value={money(
            leads
              .filter((x) => x.status !== "Perdido")
              .reduce((a, x) => a + Number(x.value || 0), 0),
          )}
        />
      </div>
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nome ou empresa"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>Todos</option>
          {stages.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {leads.length === 0 ? (
        <Empty
          icon={Users}
          title="Nenhuma oportunidade aqui"
          text="Adicione uma pessoa ou empresa e registre o próximo contato."
          action="Adicionar lead"
          onAction={() => openLead()}
        />
      ) : (
        <div className="crm-table">
          <div className="table-head">
            <span>Contato</span>
            <span>Etapa</span>
            <span>Valor informado</span>
            <span>Próximo contato</span>
            <span />
          </div>
          {leads.map((l) => (
            <div key={l.id}>
              <button
                className="contact-cell contact-button"
                onClick={() => openLead(l)}
              >
                <i>{l.name[0]}</i>
                <span>
                  <strong>{l.name}</strong>
                  <small>{l.company || l.contact || "Sem empresa"}</small>
                </span>
              </button>
              <select
                value={l.status}
                onChange={(e) => changeStage(l, e.target.value)}
              >
                {stages.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <span>{l.value ? money(l.value) : "Não informado"}</span>
              <span>{l.next || "Não agendado"}</span>
              <span className="crm-actions">
                {contactLinks(l.contact).phone && (
                  <a
                    className="icon-button"
                    aria-label={`Enviar WhatsApp para ${l.name}`}
                    title="Enviar WhatsApp"
                    href={whatsappLink(
                      contactLinks(l.contact).phone,
                      `Olá ${l.name}, tudo bem? Aqui é da equipe${business?.name ? ` da ${business.name}` : ""}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageSquareText />
                  </a>
                )}
                {contactLinks(l.contact).email && (
                  <button
                    className="icon-button"
                    aria-label={`Enviar e-mail para ${l.name}`}
                    title="Enviar e-mail"
                    onClick={() => setEmailLead(l)}
                  >
                    <Mail />
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label="Editar lead e ver interacoes"
                  onClick={() => openLead(l)}
                >
                  <Edit3 />
                </button>
                <button
                  className="icon-button danger"
                  aria-label="Excluir lead"
                  onClick={() => {
                    if (!confirm("Excluir este lead e seu histórico?")) return;
                    update((d) => ({
                      ...d,
                      leads: d.leads.filter((x) => x.id !== l.id),
                    }));
                  }}
                >
                  <Trash2 />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal
          title={editing ? "Editar lead" : "Adicionar lead"}
          onClose={() => setModal(false)}
          wide={!!editing}
        >
          <form className="modal-body" onSubmit={save}>
            <div className="form-grid">
              <Field label="Nome">
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Empresa">
                <input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
              </Field>
              <Field label="E-mail ou telefone">
                <input
                  value={form.contact}
                  onChange={(e) =>
                    setForm({ ...form, contact: e.target.value })
                  }
                />
              </Field>
              <Field label="Valor da oportunidade">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </Field>
              <Field label="Etapa">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {stages.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Próximo contato">
                <input
                  type="date"
                  value={form.next}
                  onChange={(e) => setForm({ ...form, next: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observações">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            {editing && (
              <section className="interaction-panel">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">HISTÓRICO</span>
                    <h3>Interações com o lead</h3>
                  </div>
                </div>
                <div className="interaction-entry">
                  <select
                    value={interaction.type}
                    onChange={(e) =>
                      setInteraction({ ...interaction, type: e.target.value })
                    }
                  >
                    <option>Conversa</option>
                    <option>Ligação</option>
                    <option>E-mail</option>
                    <option>Reunião</option>
                    <option>Proposta</option>
                    <option>Observação</option>
                  </select>
                  <input
                    type="date"
                    value={interaction.at}
                    onChange={(e) =>
                      setInteraction({ ...interaction, at: e.target.value })
                    }
                  />
                  <input
                    value={interaction.note}
                    onChange={(e) =>
                      setInteraction({ ...interaction, note: e.target.value })
                    }
                    placeholder="O que aconteceu e qual foi o combinado?"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    icon={Plus}
                    disabled={!interaction.note.trim()}
                    onClick={addInteraction}
                  >
                    Registrar
                  </Button>
                </div>
                <div className="interaction-history">
                  {(form.interactions || []).length ? (
                    (form.interactions || []).map((entry) => (
                      <article key={entry.id}>
                        <span>{entry.type}</span>
                        <strong>{entry.note}</strong>
                        <small>
                          {entry.at
                            ? new Date(`${entry.at}T12:00`).toLocaleDateString(
                                "pt-BR",
                              )
                            : "Sem data"}
                        </small>
                      </article>
                    ))
                  ) : (
                    <p>Nenhuma interação registrada ainda.</p>
                  )}
                </div>
              </section>
            )}
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editing ? "Salvar alterações" : "Salvar lead"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {emailLead && (
        <EmailComposer
          onClose={() => setEmailLead(null)}
          setToast={setToast}
          initial={{
            to: emailLead.contact,
            subject: `Contato${business?.name ? ` - ${business.name}` : ""}`,
          }}
        />
      )}
    </PageTitle>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <span>
        <Icon />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Finance({ db, update, business, setToast, go }) {
  const [modal, setModal] = useState(false),
    [calc, setCalc] = useState({
      materials: "",
      hours: "",
      hourValue: "",
      fixed: "",
      tax: "",
      margin: "",
    }),
    [planning, setPlanning] = useState({
      monthlyGoal: "",
      fixedCosts: "",
      contributionMargin: "",
    });
  const financeKey = business?.id || "global";
  useEffect(() => {
    setPlanning({
      monthlyGoal: "",
      fixedCosts: "",
      contributionMargin: "",
      ...(db.financeSettings?.[financeKey] || {}),
    });
  }, [financeKey]);
  const [form, setForm] = useState({
    type: "Receita",
    description: "",
    value: "",
    date: today(),
    category: "Geral",
  });
  const tx = db.transactions.filter(
      (x) => !business || x.businessId === business.id,
    ),
    revenue = tx
      .filter((x) => x.type === "Receita")
      .reduce((a, x) => a + Number(x.value), 0),
    expense = tx
      .filter((x) => x.type === "Despesa")
      .reduce((a, x) => a + Number(x.value), 0);
  const currentMonth = today().slice(0, 7),
    monthlyRevenue = tx
      .filter(
        (item) =>
          item.type === "Receita" &&
          String(item.date || "").startsWith(currentMonth),
      )
      .reduce((total, item) => total + Number(item.value || 0), 0),
    monthlyGoal = Number(planning.monthlyGoal || 0),
    contributionMargin = Number(planning.contributionMargin || 0),
    breakEven = contributionMargin
      ? Number(planning.fixedCosts || 0) / (contributionMargin / 100)
      : 0,
    goalProgress = monthlyGoal
      ? Math.min(100, Math.round((monthlyRevenue / monthlyGoal) * 100))
      : 0;
  const base =
      Number(calc.materials || 0) +
      Number(calc.hours || 0) * Number(calc.hourValue || 0) +
      Number(calc.fixed || 0),
    tax = Number(calc.tax || 0) / 100,
    margin = Number(calc.margin || 0) / 100,
    suggested = tax + margin < 1 ? base / (1 - tax - margin) : 0;
  const add = (e) => {
    e.preventDefault();
    if (!form.description || !Number(form.value)) return;
    update((d) => ({
      ...d,
      transactions: [
        { ...form, id: uid(), businessId: business?.id || null },
        ...d.transactions,
      ],
    }));
    setModal(false);
    setToast("Movimentação registrada");
  };
  const savePlanning = () => {
    update((d) => ({
      ...d,
      financeSettings: {
        ...(d.financeSettings || {}),
        [financeKey]: planning,
      },
    }));
    setToast("Metas e ponto de equilíbrio salvos");
  };
  const exportReport = () => {
    const safe = (value) => {
      const text = String(value ?? "");
      const protectedText = /^[=+@-]/.test(text) ? `'${text}` : text;
      return `"${protectedText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ["Data", "Tipo", "Descricao", "Categoria", "Valor"],
      ...tx.map((item) => [
        item.date,
        item.type,
        item.description,
        item.category,
        Number(item.value || 0).toFixed(2),
      ]),
      [],
      ["Resumo", "Valor"],
      ["Receitas", revenue.toFixed(2)],
      ["Despesas", expense.toFixed(2)],
      ["Saldo", (revenue - expense).toFixed(2)],
      ["Meta mensal", monthlyGoal.toFixed(2)],
      ["Ponto de equilibrio", breakEven.toFixed(2)],
    ];
    const blob = new Blob(
      [`\ufeff${rows.map((row) => row.map(safe).join(";")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financeiro-${currentMonth}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast("Relatório financeiro exportado");
  };
  return (
    <PageTitle
      eyebrow="FINANCEIRO"
      title="Números claros para decisões melhores"
      text="Registre apenas valores reais. Projeções aparecem sempre identificadas como estimativas."
      action={
        <Button icon={Plus} onClick={() => setModal(true)}>
          Registrar movimentação
        </Button>
      }
    >
      <AreaToolkit
        area="financeiro"
        db={db}
        update={update}
        business={business}
        setToast={setToast}
        go={go}
      />
      <div className="metric-row">
        <Metric
          icon={ArrowUpRight}
          label="Receitas registradas"
          value={money(revenue)}
        />
        <Metric
          icon={ArrowUpRight}
          label="Despesas registradas"
          value={money(expense)}
        />
        <Metric
          icon={WalletCards}
          label="Saldo registrado"
          value={money(revenue - expense)}
        />
      </div>
      <section className="panel finance-planning" id="finance-planning">
        <div className="panel-head">
          <div>
            <span className="eyebrow">PLANEJAMENTO</span>
            <h2>Meta mensal e ponto de equilíbrio</h2>
          </div>
          <Button variant="secondary" icon={Download} onClick={exportReport}>
            Exportar relatório
          </Button>
        </div>
        <div className="planning-grid">
          <Field label="Meta de receita mensal (R$)">
            <input
              type="number"
              min="0"
              value={planning.monthlyGoal}
              onChange={(e) =>
                setPlanning({ ...planning, monthlyGoal: e.target.value })
              }
            />
          </Field>
          <Field label="Custos fixos mensais (R$)">
            <input
              type="number"
              min="0"
              value={planning.fixedCosts}
              onChange={(e) =>
                setPlanning({ ...planning, fixedCosts: e.target.value })
              }
            />
          </Field>
          <Field
            label="Margem de contribuição (%)"
            hint="Receita que sobra após custos e despesas variáveis."
          >
            <input
              type="number"
              min="0"
              max="100"
              value={planning.contributionMargin}
              onChange={(e) =>
                setPlanning({
                  ...planning,
                  contributionMargin: e.target.value,
                })
              }
            />
          </Field>
          <Button icon={Save} onClick={savePlanning}>
            Salvar planejamento
          </Button>
        </div>
        <div className="planning-results">
          <div>
            <small>Receita neste mês</small>
            <strong>{money(monthlyRevenue)}</strong>
            <div className="meter">
              <span style={{ width: `${goalProgress}%` }} />
            </div>
            <span>
              {monthlyGoal ? `${goalProgress}% da meta` : "Defina uma meta"}
            </span>
          </div>
          <div>
            <small>Ponto de equilíbrio estimado</small>
            <strong>
              {breakEven ? money(breakEven) : "Preencha os dados"}
            </strong>
            <span>
              {breakEven
                ? "Receita mensal necessária para cobrir os custos fixos."
                : "Informe custos fixos e margem de contribuição."}
            </span>
          </div>
        </div>
      </section>
      <div className="finance-grid">
        <section className="panel calculator" id="finance-price">
          <div className="panel-head">
            <div>
              <span className="eyebrow">CALCULADORA</span>
              <h2>Preço de venda</h2>
            </div>
            <Calculator />
          </div>
          <p>Informe seus dados. Nenhum valor é preenchido ou presumido.</p>
          <div className="form-grid">
            <Field label="Materiais (R$)">
              <input
                type="number"
                min="0"
                value={calc.materials}
                onChange={(e) =>
                  setCalc({ ...calc, materials: e.target.value })
                }
              />
            </Field>
            <Field label="Horas de trabalho">
              <input
                type="number"
                min="0"
                value={calc.hours}
                onChange={(e) => setCalc({ ...calc, hours: e.target.value })}
              />
            </Field>
            <Field label="Valor por hora (R$)">
              <input
                type="number"
                min="0"
                value={calc.hourValue}
                onChange={(e) =>
                  setCalc({ ...calc, hourValue: e.target.value })
                }
              />
            </Field>
            <Field label="Custos fixos rateados (R$)">
              <input
                type="number"
                min="0"
                value={calc.fixed}
                onChange={(e) => setCalc({ ...calc, fixed: e.target.value })}
              />
            </Field>
            <Field label="Impostos (%)">
              <input
                type="number"
                min="0"
                max="99"
                value={calc.tax}
                onChange={(e) => setCalc({ ...calc, tax: e.target.value })}
              />
            </Field>
            <Field label="Margem desejada (%)">
              <input
                type="number"
                min="0"
                max="99"
                value={calc.margin}
                onChange={(e) => setCalc({ ...calc, margin: e.target.value })}
              />
            </Field>
          </div>
          <div className="calc-result">
            <span>Preço calculado</span>
            <strong>{base ? money(suggested) : "Preencha os custos"}</strong>
            <small>
              {base
                ? suggested
                  ? "Estimativa calculada a partir dos valores informados."
                  : "Impostos + margem devem ser menores que 100%."
                : "O resultado aparecerá aqui."}
            </small>
          </div>
        </section>
        <section className="panel" id="finance-transactions">
          <div className="panel-head">
            <div>
              <span className="eyebrow">MOVIMENTAÇÕES</span>
              <h2>Registros recentes</h2>
            </div>
          </div>
          {tx.length ? (
            <div className="transactions">
              {tx.slice(0, 8).map((x) => (
                <div key={x.id}>
                  <span className={x.type === "Receita" ? "income" : "expense"}>
                    {x.type === "Receita" ? "+" : "−"}
                  </span>
                  <span>
                    <strong>{x.description}</strong>
                    <small>
                      {x.category} ·{" "}
                      {new Date(x.date + "T12:00").toLocaleDateString("pt-BR")}
                    </small>
                  </span>
                  <b>{money(x.value)}</b>
                  <button
                    className="icon-button danger"
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        transactions: d.transactions.filter(
                          (t) => t.id !== x.id,
                        ),
                      }))
                    }
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={WalletCards}
              title="Nenhum valor registrado"
              text="Comece adicionando uma receita ou despesa real."
            />
          )}
        </section>
      </div>
      {modal && (
        <Modal title="Registrar movimentação" onClose={() => setModal(false)}>
          <form className="modal-body" onSubmit={add}>
            <div className="form-grid">
              <Field label="Tipo">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option>Receita</option>
                  <option>Despesa</option>
                </select>
              </Field>
              <Field label="Valor (R$)">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </Field>
              <Field label="Descrição">
                <input
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
              <Field label="Categoria">
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
              <Field label="Data">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                Registrar
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}

const DOCUMENT_UPLOAD_LIMIT = 10 * 1024 * 1024;
const DOCUMENT_TEXT_LIMIT = 300_000;

export function documentFileKind(file) {
  const extension = String(file?.name || "")
    .toLowerCase()
    .split(".")
    .pop();
  if (extension === "pdf") return { id: "pdf", label: "PDF importado" };
  if (extension === "docx") return { id: "docx", label: "Documento Word" };
  if (["txt", "md", "markdown", "csv"].includes(extension))
    return {
      id: "text",
      label: extension === "csv" ? "Planilha CSV" : "Documento importado",
    };
  return null;
}

export const documentTitleFromFilename = (name) =>
  String(name || "Documento importado")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Documento importado";

export async function extractDocumentText(file) {
  const kind = documentFileKind(file);
  if (!kind)
    throw new Error("Formato não aceito. Use PDF, DOCX, TXT, Markdown ou CSV.");
  if (!file?.size) throw new Error("O arquivo está vazio.");
  if (file.size > DOCUMENT_UPLOAD_LIMIT)
    throw new Error("O arquivo ultrapassa o limite de 10 MB.");
  const arrayBuffer = await file.arrayBuffer();
  let text = "";
  if (kind.id === "text") {
    text = new TextDecoder("utf-8").decode(arrayBuffer);
  } else if (kind.id === "docx") {
    const module = await import("mammoth");
    const mammoth = module.default || module;
    const result = await mammoth.extractRawText(
      typeof globalThis.Buffer !== "undefined"
        ? { buffer: globalThis.Buffer.from(arrayBuffer) }
        : { arrayBuffer },
    );
    text = result.value || "";
  } else {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof globalThis.Worker === "undefined") {
      globalThis.pdfjsWorker =
        await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    } else {
      const worker =
        await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    }
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim(),
      );
      page.cleanup();
    }
    if (typeof pdf.cleanup === "function") await pdf.cleanup();
    if (typeof loadingTask.destroy === "function") await loadingTask.destroy();
    text = pages.filter(Boolean).join("\n\n");
  }
  text = String(text)
    .replace(/\u0000/g, "")
    .trim();
  if (!text)
    throw new Error(
      kind.id === "pdf"
        ? "Este PDF não contém texto selecionável. PDFs digitalizados precisam de OCR."
        : "Não foi possível encontrar texto nesse arquivo.",
    );
  return {
    content: text.slice(0, DOCUMENT_TEXT_LIMIT),
    truncated: text.length > DOCUMENT_TEXT_LIMIT,
    kind,
  };
}

function Documents({ db, update, business, setToast, go }) {
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState(""),
    [aiBusy, setAiBusy] = useState(false),
    [exportBusy, setExportBusy] = useState(""),
    [uploading, setUploading] = useState(false),
    [uploadErrors, setUploadErrors] = useState([]),
    [dragging, setDragging] = useState(false);
  const uploadRef = useRef(null);
  const docs = db.documents.filter(
    (x) =>
      (!business || x.businessId === business.id) &&
      `${x.title} ${x.type || ""} ${x.originalFileName || ""} ${x.content || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const [form, setForm] = useState({
    title: "",
    type: "Proposta comercial",
    content: "",
  });
  const open = (d) => {
    setForm(d || { title: "", type: "Proposta comercial", content: "" });
    setEditing(d?.id || null);
    setModal(true);
  };
  const importFiles = async (fileList) => {
    const files = [...(fileList || [])].slice(0, 10);
    if (!files.length || uploading) return;
    setUploading(true);
    setUploadErrors([]);
    const imported = [];
    const errors = [];
    for (const file of files) {
      try {
        const extracted = await extractDocumentText(file);
        imported.push({
          id: uid(),
          title: documentTitleFromFilename(file.name),
          type: extracted.kind.label,
          content: extracted.content,
          originalFileName: file.name,
          originalMimeType: file.type || "application/octet-stream",
          originalSize: file.size,
          importedAt: new Date().toISOString(),
          importedContentTruncated: extracted.truncated,
          businessId: business?.id || null,
          updatedAt: new Date().toISOString(),
          versions: [],
        });
      } catch (error) {
        errors.push({ name: file.name, message: error.message });
      }
    }
    if (imported.length)
      update((d) => ({
        ...d,
        documents: [...imported, ...d.documents],
      }));
    setUploadErrors(errors);
    if (imported.length && !errors.length)
      setToast(
        imported.length === 1
          ? "Documento importado e pronto para editar"
          : `${imported.length} documentos importados`,
      );
    else if (imported.length)
      setToast(
        `${imported.length} importados; ${errors.length} não puderam ser lidos`,
      );
    else setToast("Nenhum documento pôde ser importado");
    setUploading(false);
    if (uploadRef.current) uploadRef.current.value = "";
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const previous = editing
      ? db.documents.find((x) => x.id === editing)
      : null;
    const changed =
      previous &&
      (previous.title !== form.title ||
        previous.type !== form.type ||
        previous.content !== form.content);
    const item = {
      ...form,
      id: editing || uid(),
      businessId: business?.id || null,
      updatedAt: new Date().toISOString(),
      versions: changed
        ? [
            ...(previous.versions || []),
            {
              title: previous.title,
              type: previous.type,
              content: previous.content,
              at: new Date().toISOString(),
            },
          ]
        : previous?.versions || [],
    };
    update((d) => ({
      ...d,
      documents: editing
        ? d.documents.map((x) => (x.id === editing ? item : x))
        : [item, ...d.documents],
    }));
    setModal(false);
    setToast("Documento salvo");
  };
  const saveBlob = (blob, filename) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const download = async (d, format) => {
    if (!format) return;
    setExportBusy(`${d.id}:${format}`);
    try {
      if (format === "txt") {
        saveBlob(
          new Blob([`${d.title}\n\n${d.content}`], {
            type: "text/plain;charset=utf-8",
          }),
          `${slugify(d.title)}.txt`,
        );
      } else if (format === "docx") {
        const { Document, Packer, Paragraph, HeadingLevel } =
          await import("docx");
        const file = new Document({
          sections: [
            {
              children: [
                new Paragraph({ text: d.title, heading: HeadingLevel.TITLE }),
                new Paragraph({
                  text: d.type,
                  heading: HeadingLevel.HEADING_2,
                }),
                ...String(d.content || "")
                  .split("\n")
                  .map((line) => new Paragraph({ text: line || " " })),
              ],
            },
          ],
        });
        saveBlob(await Packer.toBlob(file), `${slugify(d.title)}.docx`);
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ unit: "mm", format: "a4" });
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text(pdf.splitTextToSize(d.title, 175), 18, 20);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(95);
        pdf.text(d.type, 18, 31);
        pdf.setTextColor(25);
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(String(d.content || ""), 175);
        let y = 42;
        lines.forEach((line) => {
          if (y > 282) {
            pdf.addPage();
            y = 18;
          }
          pdf.text(line, 18, y);
          y += 5.5;
        });
        pdf.save(`${slugify(d.title)}.pdf`);
      }
      setToast(`Documento exportado em ${format.toUpperCase()}`);
    } catch {
      setToast("Não foi possível exportar este documento");
    } finally {
      setExportBusy("");
    }
  };
  const refine = async () => {
    if (aiBusy || !form.content.trim()) return;
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          specialist: "Conteúdo",
          prompt: `Aprimore o documento abaixo. Preserve todos os fatos, números e compromissos informados; corrija clareza, estrutura e linguagem. Não invente dados. Entregue somente a versão final do documento em Markdown.\n\nTítulo: ${form.title}\nTipo: ${form.type}\n\n${form.content}`,
          business,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Falha ao aprimorar");
      setForm((current) => ({
        ...current,
        content: data.content || current.content,
      }));
      setToast("Versão aprimorada no editor; salve para registrar a alteração");
    } catch (error) {
      setToast(error.message || "Não foi possível aprimorar agora");
    } finally {
      setAiBusy(false);
    }
  };
  return (
    <PageTitle
      eyebrow="DOCUMENTOS"
      title="Crie, edite e leve seu trabalho com você"
      text="Propostas, planos, relatórios e materiais ficam organizados por negócio."
      action={
        <div className="page-actions">
          <Button
            variant="secondary"
            icon={uploading ? RefreshCw : Upload}
            disabled={uploading}
            onClick={() => uploadRef.current?.click()}
          >
            {uploading ? "Importando..." : "Enviar arquivos"}
          </Button>
          <Button icon={Plus} onClick={() => open(null)}>
            Novo documento
          </Button>
        </div>
      }
    >
      <AreaToolkit
        area="documentos"
        db={db}
        update={update}
        business={business}
        setToast={setToast}
        go={go}
      />
      <div id="document-library" />
      <input
        ref={uploadRef}
        className="visually-hidden"
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
        aria-label="Selecionar documentos para enviar"
        onChange={(event) => importFiles(event.target.files)}
      />
      <button
        type="button"
        className={`document-dropzone ${dragging ? "dragging" : ""}`}
        onClick={() => uploadRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          importFiles(event.dataTransfer.files);
        }}
        disabled={uploading}
      >
        <span className="document-upload-icon">
          {uploading ? <RefreshCw /> : <Upload />}
        </span>
        <span>
          <strong>
            {uploading
              ? "Lendo e organizando seus arquivos..."
              : "Arraste documentos para cá ou clique para escolher"}
          </strong>
          <small>PDF, DOCX, TXT, Markdown ou CSV · até 10 MB por arquivo</small>
        </span>
      </button>
      {uploadErrors.length > 0 && (
        <div className="document-upload-errors" role="alert">
          <strong>Alguns arquivos não foram importados:</strong>
          {uploadErrors.map((error) => (
            <span key={`${error.name}-${error.message}`}>
              <b>{error.name}</b>: {error.message}
            </span>
          ))}
        </div>
      )}
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar documentos"
          />
        </div>
      </div>
      {docs.length === 0 ? (
        <Empty
          icon={FileText}
          title="Nenhum documento criado"
          text="Envie um arquivo ou crie um documento editável, refine com assistência inteligente e exporte em PDF, DOCX ou TXT."
          action="Criar documento"
          onAction={() => open(null)}
        />
      ) : (
        <div className="document-grid">
          {docs.map((d) => (
            <article key={d.id}>
              <span className="doc-icon">
                <FileText />
              </span>
              <span className="tag">{d.type}</span>
              <h3>{d.title}</h3>
              <p>{d.content.slice(0, 100) || "Documento vazio"}</p>
              {d.originalFileName && (
                <small className="document-source">
                  <Upload /> {d.originalFileName} ·{" "}
                  {d.originalSize < 1024 * 1024
                    ? `${Math.max(1, Math.round(d.originalSize / 1024))} KB`
                    : `${(d.originalSize / (1024 * 1024)).toFixed(1)} MB`}
                </small>
              )}
              <small>
                Atualizado {new Date(d.updatedAt).toLocaleString("pt-BR")}
              </small>
              <footer>
                <button onClick={() => open(d)}>
                  <Edit3 />
                  Editar
                </button>
                <label className="compact-export">
                  <Download />
                  <select
                    aria-label={`Exportar ${d.title}`}
                    value=""
                    disabled={exportBusy.startsWith(`${d.id}:`)}
                    onChange={(event) => download(d, event.target.value)}
                  >
                    <option value="">
                      {exportBusy.startsWith(`${d.id}:`)
                        ? "Exportando..."
                        : "Exportar"}
                    </option>
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                    <option value="txt">TXT</option>
                  </select>
                </label>
                <button
                  className="danger"
                  onClick={() =>
                    update((x) => ({
                      ...x,
                      documents: x.documents.filter((y) => y.id !== d.id),
                    }))
                  }
                >
                  <Trash2 />
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
      {modal && (
        <Modal
          title={editing ? "Editar documento" : "Novo documento"}
          onClose={() => setModal(false)}
          wide
        >
          <form className="modal-body" onSubmit={save}>
            <div className="form-grid">
              <Field label="Título">
                <input
                  required
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Tipo">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {[
                    "Proposta comercial",
                    "Plano de negócio",
                    "Plano de marketing",
                    "Orçamento",
                    "Relatório",
                    "Checklist",
                    "Procedimento",
                    "Apresentação",
                    "Briefing",
                    "Plano de ação",
                    "Documento Word",
                    "PDF importado",
                    "Documento importado",
                    "Planilha CSV",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            {form.originalFileName && (
              <div className="notice document-origin-notice">
                <Upload />
                <span>
                  Conteúdo importado de <strong>{form.originalFileName}</strong>
                  {form.importedContentTruncated
                    ? ". O texto era muito extenso e foi limitado para manter a sincronização segura."
                    : ". Você pode editar, aprimorar e exportar normalmente."}
                </span>
              </div>
            )}
            <Field label="Conteúdo">
              <textarea
                className="editor"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Escreva ou cole o conteúdo aqui..."
              />
            </Field>
            <div className="editor-tools">
              <Button
                type="button"
                variant="secondary"
                icon={aiBusy ? RefreshCw : WandSparkles}
                disabled={aiBusy || !form.content.trim()}
                onClick={refine}
              >
                {aiBusy ? "Aprimorando..." : "Aprimorar texto"}
              </Button>
              <small>
                O texto atual permanece no histórico quando você salva a nova
                versão.
              </small>
            </div>
            {editing && (form.versions || []).length > 0 && (
              <section className="version-history">
                <strong>Versões anteriores</strong>
                <p>Restaure uma versão para o editor antes de salvar.</p>
                <div>
                  {[...(form.versions || [])]
                    .reverse()
                    .map((version, index) => (
                      <button
                        type="button"
                        key={`${version.at}-${index}`}
                        onClick={() =>
                          setForm({
                            ...form,
                            title: version.title || form.title,
                            type: version.type || form.type,
                            content: version.content || "",
                          })
                        }
                      >
                        <RotateCcw />
                        {new Date(version.at).toLocaleString("pt-BR")}
                      </button>
                    ))}
                </div>
              </section>
            )}
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                Salvar documento
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}

export function looksLikeSiteInstruction(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  return (
    /^(crie|criar|gere|gerar|faça|fazer|desenvolva|monte|construa)\b/.test(
      text,
    ) ||
    /\b(o site|a página|landing page) (deve|precisa|tem que)\b/.test(text) ||
    /\b(apresente|explique|mostre|inclua)\b.{0,80}\b(site|página|plataforma)\b/.test(
      text,
    )
  );
}

const siteFallbackDescription = (form) => {
  const name = form.name || "Nosso negócio";
  const segment = form.segment
    ? ` em ${String(form.segment).toLowerCase()}`
    : "";
  return `${name} oferece soluções${segment} com atendimento próximo, clareza e foco no que cada cliente precisa.`;
};

const siteServices = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(
        value ||
          "Atendimento personalizado\nSolução sob medida\nAcompanhamento próximo",
      )
        .split("\n")
        .filter(Boolean);
  return source.slice(0, 8).map((item) =>
    typeof item === "string"
      ? {
          title: item.trim(),
          description:
            "Uma solução conduzida com clareza, cuidado e acompanhamento em cada etapa.",
        }
      : {
          title: String(item?.title || "Solução").trim(),
          description: String(
            item?.description ||
              "Converse conosco para entender como esta solução pode ajudar.",
          ).trim(),
        },
  );
};

export function mergeSiteBrief(base, patch) {
  const allowed = [
    "name",
    "segment",
    "headline",
    "description",
    "aboutTitle",
    "about",
    "services",
    "cta",
    "contact",
    "color",
    "faq",
    "heroStyle",
    "features",
    "homeBlocks",
  ];
  const next = { ...base };
  allowed.forEach((key) => {
    if (patch?.[key] !== undefined && patch[key] !== null)
      next[key] = patch[key];
  });
  if (
    !String(next.description || "").trim() ||
    looksLikeSiteInstruction(next.description)
  )
    next.description = siteFallbackDescription(next);
  if (!/^#[0-9a-f]{6}$/i.test(next.color || "")) next.color = "#6d38e0";
  return next;
}

const sitePagePath = (slug, page = "") =>
  `/s/${slugify(slug || "meu-site")}${page ? `/${page}` : ""}`;

export const SITE_THEMES = [
  {
    id: "moderno",
    label: "Moderno",
    swatch: "linear-gradient(135deg,#f4f0ff,#fff0f7)",
  },
  {
    id: "escuro",
    label: "Minimalista escuro",
    swatch: "linear-gradient(135deg,#181430,#0f0d1a)",
  },
  {
    id: "vibrante",
    label: "Vibrante",
    swatch: "linear-gradient(135deg,#ff6b57,#ffb648)",
  },
];

const themeTokens = (theme, color) =>
  ({
    moderno: {
      bg: "#fafaff",
      text: "#17152b",
      muted: "#5d576d",
      heroBg: "linear-gradient(135deg,#f4f0ff,#fff0f7)",
      heroText: "#17152b",
      headerBg: "#fff",
      headerBorder: "#ece9f4",
      navText: "#57516b",
      cardBg: "#fff",
      cardBorder: "#e8e5f2",
      contactBg: "#17152b",
      contactText: "#fff",
      font: "Inter,Arial,sans-serif",
      radius: "20px",
    },
    escuro: {
      bg: "#100e1c",
      text: "#f4f2fb",
      muted: "#b6b0c7",
      heroBg: "linear-gradient(135deg,#1a1630,#100e1c)",
      heroText: "#fff",
      headerBg: "#151225",
      headerBorder: "#26213c",
      navText: "#c9c4da",
      cardBg: "#1a1630",
      cardBorder: "#2a2542",
      contactBg: "#000",
      contactText: "#fff",
      font: "'Poppins',Inter,Arial,sans-serif",
      radius: "16px",
    },
    vibrante: {
      bg: "#fffaf2",
      text: "#20160a",
      muted: "#6f5c40",
      heroBg: `linear-gradient(135deg, ${color}, #ff7a44)`,
      heroText: "#fff",
      headerBg: "#fff",
      headerBorder: "#ffe3cc",
      navText: "#6f5c40",
      cardBg: "#fff",
      cardBorder: "#ffe3cc",
      contactBg: color,
      contactText: "#fff",
      font: "'Poppins',Inter,Arial,sans-serif",
      radius: "26px",
    },
  })[theme] || themeTokens("moderno", color);

const isSafeImageUrl = (value) => /^https:\/\/\S+$/i.test(String(value || "").trim());

const siteGallery = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && isSafeImageUrl(item.url))
    .slice(0, 8)
    .map((item) => ({
      url: String(item.url).trim(),
      caption: String(item.caption || "").trim().slice(0, 120),
    }));

const siteTestimonials = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && String(item.quote || "").trim())
    .slice(0, 6)
    .map((item) => ({
      name: String(item.name || "Cliente").trim().slice(0, 60) || "Cliente",
      role: String(item.role || "").trim().slice(0, 60),
      quote: String(item.quote || "").trim().slice(0, 400),
    }));

const siteFaq = (value) =>
  (Array.isArray(value) ? value : [])
    .filter(
      (item) =>
        item && String(item.question || "").trim() && String(item.answer || "").trim(),
    )
    .slice(0, 6)
    .map((item) => ({
      question: String(item.question).trim().slice(0, 160),
      answer: String(item.answer).trim().slice(0, 400),
    }));

const siteFeatures = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && String(item.title || "").trim())
    .slice(0, 4)
    .map((item) => ({
      title: String(item.title).trim().slice(0, 60),
      description: String(item.description || "").trim().slice(0, 200),
    }));

export const HOME_BLOCK_IDS = ["features", "gallery", "testimonials", "cta"];

const sanitizeHomeBlocks = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((id) => HOME_BLOCK_IDS.includes(id))
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .slice(0, HOME_BLOCK_IDS.length);

export const HERO_STYLES = [
  { id: "centrado", label: "Centrado" },
  { id: "dividido", label: "Dividido" },
  { id: "impacto", label: "Impacto" },
];

export function makeSite(form, page = "", siteSlug = "") {
  const title = form.name || "Meu negócio";
  const desc =
    form.description && !looksLikeSiteInstruction(form.description)
      ? form.description
      : siteFallbackDescription(form);
  const color = /^#[0-9a-f]{6}$/i.test(form.color || "")
    ? form.color
    : "#6d38e0";
  const contact = /^(https?:|mailto:|tel:|#)/i.test(form.contact || "")
    ? form.contact
    : "#contato";
  const slug = siteSlug || slugify(title);
  const services = siteServices(form.services);
  const t = themeTokens(form.theme, color);
  const heroImg = isSafeImageUrl(form.heroImage) ? String(form.heroImage).trim() : "";
  const gallery = siteGallery(form.gallery);
  const testimonials = siteTestimonials(form.testimonials);
  const faq = siteFaq(form.faq);
  const features = siteFeatures(form.features);
  const homeBlocks = sanitizeHomeBlocks(form.homeBlocks);
  const heroStyle = HERO_STYLES.some((s) => s.id === form.heroStyle)
    ? form.heroStyle
    : "centrado";
  const cards = services
    .map(
      (service) =>
        `<article class="card"><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.description)}</p></article>`,
    )
    .join("");
  const nav = [
    ["", "Início"],
    ["sobre", "Sobre"],
    ["servicos", "Serviços"],
    ["contato", "Contato"],
  ]
    .map(
      ([path, label]) =>
        `<a${page === path ? ' aria-current="page"' : ""} href="${sitePagePath(slug, path)}">${label}</a>`,
    )
    .join("");
  const about =
    form.about ||
    `${title} nasceu para oferecer uma experiência confiável, simples e próxima. Cada atendimento parte do contexto real do cliente para chegar a uma solução adequada.`;
  const heroCopy = `<span>${escapeHtml(form.segment || "Bem-vindo")}</span><h1>${escapeHtml(form.headline || title)}</h1><p>${escapeHtml(desc)}</p><a class="cta" href="${sitePagePath(slug, "contato")}">${escapeHtml(form.cta || "Quero saber mais")}</a>`;
  const heroVisual = heroImg
    ? `<img src="${escapeHtml(heroImg)}" alt="${escapeHtml(title)}" loading="lazy">`
    : `<div class="hero-decor" aria-hidden="true"><span>${escapeHtml((title.trim()[0] || "S").toUpperCase())}</span></div>`;
  const heroSection =
    heroStyle === "impacto"
      ? `<section class="hero style-impacto"><div>${heroCopy}</div></section>`
      : heroStyle === "dividido"
        ? `<section class="hero heroImg style-dividido"><div>${heroCopy}</div>${heroVisual}</section>`
        : heroImg
          ? `<section class="hero heroImg"><div>${heroCopy}</div>${heroVisual}</section>`
          : `<section class="hero"><div>${heroCopy}</div></section>`;
  const gallerySection = gallery.length
    ? `<section class="section gallery"><span class="kicker">GALERIA</span><h2>Um pouco do nosso trabalho</h2><div class="gallery-grid">${gallery
        .map(
          (g) =>
            `<figure><img src="${escapeHtml(g.url)}" alt="${escapeHtml(g.caption || title)}" loading="lazy">${g.caption ? `<figcaption>${escapeHtml(g.caption)}</figcaption>` : ""}</figure>`,
        )
        .join("")}</div></section>`
    : "";
  const testimonialsSection = testimonials.length
    ? `<section class="section testimonials"><span class="kicker">QUEM JÁ CONFIOU</span><h2>O que dizem sobre a gente</h2><div class="cards testi-cards">${testimonials
        .map(
          (item) =>
            `<article class="card testi"><p>&ldquo;${escapeHtml(item.quote)}&rdquo;</p><footer><strong>${escapeHtml(item.name)}</strong>${item.role ? `<span>${escapeHtml(item.role)}</span>` : ""}</footer></article>`,
        )
        .join("")}</div></section>`
    : "";
  const faqSection = faq.length
    ? `<section class="section faq"><span class="kicker">PERGUNTAS FREQUENTES</span><h2>Dúvidas comuns</h2><div class="faq-list">${faq
        .map(
          (item) =>
            `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`,
        )
        .join("")}</div></section>`
    : "";
  const featuresSection = features.length
    ? `<section class="section features"><span class="kicker">POR QUE ESCOLHER A GENTE</span><h2>O que nos diferencia</h2><div class="cards feature-cards">${features
        .map(
          (f, i) =>
            `<article class="card feature"><span class="feature-num">${String(i + 1).padStart(2, "0")}</span><h3>${escapeHtml(f.title)}</h3>${f.description ? `<p>${escapeHtml(f.description)}</p>` : ""}</article>`,
        )
        .join("")}</div></section>`
    : "";
  const ctaBannerSection = `<section class="section cta-banner"><div><h2>Vamos conversar sobre o que ${escapeHtml(title)} pode fazer por você?</h2><a class="cta light" href="${sitePagePath(slug, "contato")}">${escapeHtml(form.cta || "Falar agora")}</a></div></section>`;
  const homeBlockContent = {
    features: featuresSection,
    gallery: gallerySection,
    testimonials: testimonialsSection,
    cta: ctaBannerSection,
  };
  const homeOrder = homeBlocks.length ? homeBlocks : HOME_BLOCK_IDS;
  const renderedHomeIds = new Set();
  const homeExtras = homeOrder
    .filter((id) => homeBlockContent[id])
    .map((id) => {
      renderedHomeIds.add(id);
      return homeBlockContent[id];
    });
  ["gallery", "testimonials"].forEach((id) => {
    if (homeBlockContent[id] && !renderedHomeIds.has(id)) homeExtras.push(homeBlockContent[id]);
  });
  const pageContent =
    {
      "": `${heroSection}<section class="section intro"><span class="kicker">O QUE FAZEMOS</span><h2>Soluções pensadas para necessidades reais</h2><div class="cards">${cards}</div></section>${homeExtras.join("")}`,
      sobre: `<section class="page-hero"><span>QUEM SOMOS</span><h1>${escapeHtml(form.aboutTitle || `Sobre ${title}`)}</h1><p>${escapeHtml(desc)}</p></section><section class="section prose"><h2>Um trabalho construído com você</h2><p>${escapeHtml(about)}</p><a class="cta" href="${sitePagePath(slug, "contato")}">Conversar com a equipe</a></section>${testimonialsSection}`,
      servicos: `<section class="page-hero"><span>NOSSAS SOLUÇÕES</span><h1>Como podemos ajudar</h1><p>Conheça as frentes de trabalho e encontre o melhor ponto de partida.</p></section><section class="section"><div class="cards">${cards}</div></section>${faqSection}`,
      contato: `<section class="section contact" id="contato"><div class="contact-grid"><div><span class="kicker">CONTATO</span><h1>Vamos conversar?</h1><p>Conte o que você precisa. A mensagem chega diretamente à equipe responsável.</p>${contact !== "#contato" ? `<p><a class="cta light" href="${escapeHtml(contact)}">${escapeHtml(form.cta || "Falar agora")}</a></p>` : ""}</div><form class="lead-form" data-sf-lead-form><label>Nome<input name="name" required maxlength="100" autocomplete="name"></label><label>E-mail<input name="email" type="email" maxlength="160" autocomplete="email"></label><label>Telefone<input name="phone" maxlength="40" autocomplete="tel"></label><label>Mensagem<textarea name="message" maxlength="2000"></textarea></label><button type="submit">Enviar mensagem</button><p class="lead-status" data-sf-lead-status aria-live="polite"></p></form></div></section>`,
    }[page] || "";
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page ? `${page[0].toUpperCase()}${page.slice(1)} · ${title}` : title)}</title><meta name="description" content="${escapeHtml(desc.slice(0, 150))}"><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:${t.font};color:${t.text};background:${t.bg}}header{display:flex;justify-content:space-between;align-items:center;gap:28px;padding:22px 7%;background:${t.headerBg};border-bottom:1px solid ${t.headerBorder};position:sticky;top:0;z-index:3}header b{font-size:1.2rem}nav{display:flex;align-items:center;gap:24px}nav a{color:${t.navText};text-decoration:none;font-weight:700;font-size:.93rem;transition:color .2s}nav a:hover{color:${color}}nav a[aria-current=page]{color:${color}}a{color:inherit}.cta,button{display:inline-block;background:${color};color:white;padding:14px 22px;border:0;border-radius:12px;text-decoration:none;font-weight:800;cursor:pointer;transition:transform .2s,box-shadow .2s}.cta:hover,button:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(0,0,0,.18)}.cta.light{background:#fff;color:#17152b}.hero,.page-hero{padding:100px 7%;background:${t.heroBg};color:${t.heroText};display:grid;align-content:center}.hero{min-height:68vh}.hero>div{max-width:820px}.hero.heroImg{grid-template-columns:1.1fr .9fr;align-items:center;gap:44px;max-width:1280px;margin:0 auto}.hero.heroImg>div{max-width:none}.hero.heroImg img{width:100%;height:380px;object-fit:cover;border-radius:${t.radius}}.hero-decor{width:100%;height:380px;border-radius:${t.radius};background:linear-gradient(135deg, ${color}, ${t.cardBg});display:grid;place-items:center;overflow:hidden}.hero-decor span{font-size:8rem;font-weight:900;color:rgba(255,255,255,.85)}.hero.style-impacto{text-align:center}.hero.style-impacto>div{max-width:900px;margin:0 auto}.hero.style-impacto p{margin-left:auto;margin-right:auto}.hero span,.page-hero span,.kicker{color:${color};font-weight:900;text-transform:uppercase;letter-spacing:.12em}.hero h1,.page-hero h1,.contact h1{font-size:clamp(2.6rem,7vw,5.4rem);line-height:1.02;margin:.25em 0}.hero.style-impacto h1{font-size:clamp(3rem,8vw,6.2rem)}.hero p,.page-hero p{font-size:1.2rem;line-height:1.7;max-width:720px}.page-hero{min-height:48vh}.section{padding:80px 7%}.section>h2{font-size:clamp(2rem,4vw,3.4rem);max-width:780px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:34px}.card{background:${t.cardBg};padding:28px;border:1px solid ${t.cardBorder};border-radius:${t.radius};box-shadow:0 12px 35px rgba(35,25,72,.06);transition:transform .25s,box-shadow .25s}.card:hover{transform:translateY(-5px);box-shadow:0 18px 45px rgba(35,25,72,.12)}.card h3{font-size:1.25rem}.card p,.prose p{color:${t.muted};line-height:1.7}.prose{max-width:920px}.prose p{font-size:1.18rem}.testi p{font-size:1.05rem;font-style:italic;color:${t.text}}.testi footer{margin-top:14px;display:flex;flex-direction:column;gap:2px}.testi footer span{color:${t.muted};font-size:.88rem}.feature-num{font-size:2rem;font-weight:900;color:${color};opacity:.4;display:block;margin-bottom:6px}.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-top:34px}.gallery-grid figure{margin:0;border-radius:${t.radius};overflow:hidden;background:${t.cardBg}}.gallery-grid img{width:100%;height:220px;object-fit:cover;display:block}.gallery-grid figcaption{padding:10px 14px;font-size:.85rem;color:${t.muted}}.faq-list{margin-top:34px;display:grid;gap:12px;max-width:820px}.faq-list details{background:${t.cardBg};border:1px solid ${t.cardBorder};border-radius:14px;padding:16px 20px}.faq-list summary{cursor:pointer;font-weight:800}.faq-list p{margin:12px 0 0;color:${t.muted};line-height:1.6}.cta-banner{background:${t.contactBg};color:${t.contactText}}.cta-banner div{max-width:640px;margin:0 auto;display:grid;gap:20px;justify-items:center;text-align:center}.cta-banner h2{font-size:clamp(1.8rem,4vw,2.8rem);margin:0}.contact{background:${t.contactBg};color:${t.contactText};min-height:72vh;display:grid;align-content:center}.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:start;max-width:1150px;margin:auto}.lead-form{display:grid;gap:12px;background:#fff;color:#17152b;padding:28px;border-radius:20px}.lead-form label{display:grid;gap:6px;text-align:left;font-weight:700}.lead-form input,.lead-form textarea{width:100%;padding:13px;border:1px solid #d8d4e5;border-radius:10px;font:inherit}.lead-form textarea{min-height:110px;resize:vertical}.lead-status{min-height:22px;margin:0;color:#443d55;font-size:.92rem}footer{padding:28px 7%;text-align:center;color:${t.muted};background:${t.headerBg}}@keyframes sfFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}.hero>div,.hero-decor,.page-hero>*{animation:sfFadeUp .7s ease both}.cards .card{animation:sfFadeUp .6s ease both}.cards .card:nth-child(2){animation-delay:.08s}.cards .card:nth-child(3){animation-delay:.16s}.cards .card:nth-child(4){animation-delay:.24s}@media(max-width:760px){header{padding:18px 5%;align-items:flex-start;flex-direction:column}nav{width:100%;gap:16px;overflow:auto;padding-bottom:3px}.hero,.page-hero,.section{padding:62px 6%}.cards,.contact-grid,.gallery-grid{grid-template-columns:1fr}.hero.heroImg{grid-template-columns:1fr}.hero.heroImg img,.hero-decor{height:240px}}
</style></head><body><header><b>${escapeHtml(title)}</b><nav aria-label="Páginas do site">${nav}</nav></header><main>${pageContent}</main><footer>© ${new Date().getFullYear()} ${escapeHtml(title)}</footer></body></html>`;
}

export function makeSitePages(form, slug) {
  return [
    { slug: "", name: "Início" },
    { slug: "sobre", name: "Sobre" },
    { slug: "servicos", name: "Serviços" },
    { slug: "contato", name: "Contato" },
  ].map((item) => ({
    ...item,
    html: makeSite(form, item.slug, slug),
  }));
}
const escapeHtml = (s) =>
  String(s || "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );

export function websiteMilestones(site) {
  const brief = site?.brief || {};
  const serviceCount = Array.isArray(brief.services)
    ? brief.services.length
    : (brief.services || "").split("\n").filter((x) => x.trim()).length;
  const reviewed = site?.reviewedDevices || [];
  return [
    {
      id: "created",
      title: "Projeto criado",
      text: "Gerar e salvar uma página funcional.",
      done: !!site,
    },
    {
      id: "brief",
      title: "Briefing consistente",
      text: "Informar nome, segmento e objetivo da página.",
      done: !!(
        site &&
        brief.name &&
        brief.segment &&
        brief.description &&
        !looksLikeSiteInstruction(brief.description)
      ),
    },
    {
      id: "content",
      title: "Conteúdo estruturado",
      text: "Definir título principal e pelo menos dois serviços.",
      done: !!(site && brief.headline && serviceCount >= 2),
    },
    {
      id: "identity",
      title: "Identidade personalizada",
      text: "Personalizar cor, chamada ou conteúdo do código.",
      done: !!(
        site &&
        (site.codeEdited ||
          (brief.color && brief.color !== "#6d38e0") ||
          (brief.cta && brief.cta !== "Falar com a gente"))
      ),
    },
    {
      id: "responsive",
      title: "Revisão responsiva",
      text: "Conferir o resultado em desktop, tablet e celular.",
      done: ["desktop", "tablet", "mobile"].every((x) => reviewed.includes(x)),
    },
    {
      id: "published",
      title: "Publicação concluída",
      text: "Publicar no servidor e confirmar uma URL pública acessível.",
      done: !!(
        site?.published &&
        site?.serverPublished &&
        site?.publicUrl &&
        site?.publishedAt
      ),
    },
  ];
}

export function parseSiteJson(content) {
  const text = String(content || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("A resposta não trouxe alterações estruturadas.");
  return JSON.parse(match[0]);
}

function SiteVisualEditor({ brief, onChange }) {
  const gallery = brief.gallery || [];
  const testimonials = brief.testimonials || [];
  const patchList = (key, list) => onChange({ [key]: list });
  return (
    <div className="site-visual-editor">
      <Field label="Estilo visual">
        <div className="theme-picker">
          {SITE_THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={(brief.theme || "moderno") === item.id ? "active" : ""}
              style={{ background: item.swatch }}
              onClick={() => onChange({ theme: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Field>
      <Field
        label="Formato do topo da página"
        hint="Dividido usa imagem de capa (ou um destaque decorativo se não houver). Impacto centraliza um título grande."
      >
        <div className="theme-picker hero-style-picker">
          {HERO_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                (brief.heroStyle || "centrado") === item.id ? "active" : ""
              }
              onClick={() => onChange({ heroStyle: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Field>
      <Field
        label="Imagem de capa (URL, opcional)"
        hint="Use um link https:// de uma imagem sua. Fica ao lado do título na página inicial."
      >
        <input
          value={brief.heroImage || ""}
          onChange={(e) => onChange({ heroImage: e.target.value })}
          placeholder="https://..."
        />
      </Field>
      <Field label="Galeria de fotos (opcional)">
        <div className="list-editor">
          {gallery.map((item, i) => (
            <div className="list-editor-row" key={i}>
              <input
                value={item.url}
                onChange={(e) =>
                  patchList(
                    "gallery",
                    gallery.map((g, x) => (x === i ? { ...g, url: e.target.value } : g)),
                  )
                }
                placeholder="URL da imagem (https://...)"
              />
              <input
                value={item.caption}
                onChange={(e) =>
                  patchList(
                    "gallery",
                    gallery.map((g, x) =>
                      x === i ? { ...g, caption: e.target.value } : g,
                    ),
                  )
                }
                placeholder="Legenda (opcional)"
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => patchList("gallery", gallery.filter((_, x) => x !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            icon={Plus}
            onClick={() => patchList("gallery", [...gallery, { url: "", caption: "" }])}
          >
            Adicionar foto
          </Button>
        </div>
      </Field>
      <Field label="Depoimentos de clientes (opcional)">
        <div className="list-editor">
          {testimonials.map((item, i) => (
            <div className="list-editor-row testimonial-row" key={i}>
              <input
                value={item.name}
                onChange={(e) =>
                  patchList(
                    "testimonials",
                    testimonials.map((t, x) =>
                      x === i ? { ...t, name: e.target.value } : t,
                    ),
                  )
                }
                placeholder="Nome do cliente"
              />
              <input
                value={item.role}
                onChange={(e) =>
                  patchList(
                    "testimonials",
                    testimonials.map((t, x) =>
                      x === i ? { ...t, role: e.target.value } : t,
                    ),
                  )
                }
                placeholder="Cargo ou empresa (opcional)"
              />
              <textarea
                value={item.quote}
                onChange={(e) =>
                  patchList(
                    "testimonials",
                    testimonials.map((t, x) =>
                      x === i ? { ...t, quote: e.target.value } : t,
                    ),
                  )
                }
                placeholder="O que o cliente disse"
              />
              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  patchList("testimonials", testimonials.filter((_, x) => x !== i))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            icon={Plus}
            onClick={() =>
              patchList("testimonials", [
                ...testimonials,
                { name: "", role: "", quote: "" },
              ])
            }
          >
            Adicionar depoimento
          </Button>
        </div>
      </Field>
    </div>
  );
}

function Sites({ db, update, business, setToast, go }) {
  const [modal, setModal] = useState(false),
    [preview, setPreview] = useState(null),
    [device, setDevice] = useState("desktop"),
    [editCode, setEditCode] = useState(false),
    [publishing, setPublishing] = useState(false),
    [siteError, setSiteError] = useState(""),
    [leads, setLeads] = useState([]),
    [loadingLeads, setLoadingLeads] = useState(false),
    [generating, setGenerating] = useState(false),
    [siteChatText, setSiteChatText] = useState(""),
    [siteChatBusy, setSiteChatBusy] = useState(false),
    [customizing, setCustomizing] = useState(false),
    [previewPage, setPreviewPage] = useState("");
  const [form, setForm] = useState({
    name: business?.name || "",
    segment: business?.segment || "",
    instructions: "",
    description: "",
    headline: "",
    services: business?.offer || "",
    cta: "Falar com a gente",
    contact: "#contato",
    color: "#6d38e0",
    theme: "moderno",
    heroStyle: "centrado",
    heroImage: "",
    gallery: [],
    testimonials: [],
    faq: [],
    features: [],
    homeBlocks: [],
  });
  const sites = db.sites.filter(
    (x) => !business || x.businessId === business.id,
  );
  const generate = async (e) => {
    e.preventDefault();
    if (!form.instructions.trim() || generating) return;
    setGenerating(true);
    setSiteError("");
    let generatedBrief = { ...form };
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          specialist: "Criador de Sites",
          business,
          prompt: `Transforme o briefing abaixo em conteúdo público de um site profissional e único, evitando um layout genérico igual para qualquer negócio. O briefing é uma instrução interna e NUNCA pode aparecer literalmente nos textos do site. Não invente clientes, números, depoimentos ou fatos. Responda SOMENTE com JSON válido, sem Markdown, usando os campos: headline, description (até 240 caracteres, texto para visitantes), aboutTitle, about, services (lista de objetos com title e description), cta, faq (lista de 3 a 5 objetos com question e answer, dúvidas genéricas sobre como funciona o atendimento, sem inventar preços, prazos ou números específicos), features (lista de 3 a 4 objetos com title e description, diferenciais genuínos com base no briefing, sem números inventados), heroStyle (escolha "centrado", "dividido" ou "impacto" conforme o tom do negócio: "impacto" para algo mais ousado/moderno, "dividido" para algo visual, "centrado" para algo clássico/confiável), homeBlocks (lista ordenada com a combinação que fizer mais sentido, usando somente os ids: "features", "gallery", "testimonials", "cta").\n\nNome: ${form.name}\nSegmento: ${form.segment}\nBriefing interno: ${form.instructions.slice(0, 4000)}\nServiços informados: ${String(form.services || "").slice(0, 1600)}\nTexto público informado: ${form.description.slice(0, 800)}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.content)
        generatedBrief = mergeSiteBrief(form, parseSiteJson(data.content));
    } catch {
      generatedBrief = mergeSiteBrief(form, {});
    }
    let slug = slugify(form.name || business?.name || "meu-site");
    let n = 2;
    while (db.sites.some((x) => x.slug === slug))
      slug = `${slugify(form.name)}-${n++}`;
    const pages = makeSitePages(generatedBrief, slug);
    const site = {
      id: uid(),
      name: form.name || "Novo site",
      slug,
      html: pages[0].html,
      pages,
      brief: generatedBrief,
      chat: [
        {
          id: uid(),
          role: "assistant",
          content:
            "Seu site foi criado com páginas de Início, Sobre, Serviços e Contato. Peça qualquer alteração por aqui.",
          createdAt: new Date().toISOString(),
        },
      ],
      published: false,
      businessId: business?.id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leads: [],
      reviewedDevices: [],
      codeEdited: false,
      serverPublished: false,
      publicUrl: null,
      publishedAt: null,
    };
    update((d) => ({ ...d, sites: [site, ...d.sites] }));
    setModal(false);
    setPreview(site.id);
    setToast("Site completo criado e salvo");
    setGenerating(false);
  };
  const current = db.sites.find((x) => x.id === preview);
  const selectedSitePage = current?.pages?.find(
    (item) => item.slug === previewPage,
  );
  const previewHtml = selectedSitePage?.html || current?.html || "";
  useEffect(() => {
    setPreviewPage("");
  }, [preview]);
  const ownerId = activeSpaceId() || db.user.id;
  const updateSite = (id, patch) =>
    update((d) => ({
      ...d,
      sites: d.sites.map((x) =>
        x.id === id
          ? { ...x, ...patch, updatedAt: new Date().toISOString() }
          : x,
      ),
    }));
  const updateBrief = (patch) => {
    if (!current) return;
    const brief = { ...(current.brief || {}), ...patch };
    const pages = makeSitePages(brief, current.slug);
    updateSite(current.id, {
      brief,
      pages,
      html: pages[0].html,
      serverPublished: false,
    });
  };
  const repairLegacySite = async () => {
    if (!current) return;
    const oldBrief = current.brief || {};
    const brief = mergeSiteBrief(
      {
        ...oldBrief,
        instructions: oldBrief.instructions || oldBrief.description || "",
        description: siteFallbackDescription(oldBrief),
      },
      {},
    );
    const pages = makeSitePages(brief, current.slug);
    updateSite(current.id, {
      brief,
      pages,
      html: pages[0].html,
      serverPublished: false,
      chat: [
        ...(current.chat || []),
        {
          id: uid(),
          role: "assistant",
          content:
            "Separei o briefing interno do texto público e reconstruí as páginas sem exibir as instruções.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    if (current.published && current.serverPublished) {
      setPublishing(true);
      try {
        const data = await siteRequest("publish", {
          id: current.id,
          slug: current.slug,
          name: current.name,
          description: brief.description,
          html: pages[0].html,
          pages,
        });
        updateSite(current.id, {
          published: true,
          serverPublished: true,
          publicUrl: data.url,
          publishedAt: data.publishedAt,
        });
        setToast("Conteúdo corrigido e publicação atualizada");
      } catch (error) {
        setSiteError(
          error.message || "Corrigimos o site, mas falta republicar.",
        );
        setToast("Conteúdo corrigido; revise e atualize a publicação");
      } finally {
        setPublishing(false);
      }
    } else {
      setToast("Briefing removido do conteúdo público");
    }
  };
  const requestSiteChange = async () => {
    const request = siteChatText.trim();
    if (!current || !request || siteChatBusy) return;
    const userMessage = {
      id: uid(),
      role: "user",
      content: request,
      createdAt: new Date().toISOString(),
    };
    setSiteChatText("");
    setSiteChatBusy(true);
    setSiteError("");
    updateSite(current.id, {
      chat: [...(current.chat || []), userMessage],
    });
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          specialist: "Criador de Sites",
          business,
          prompt: `Você está editando um site existente por conversa. Altere APENAS o que o usuário pediu e preserve todo o resto. O pedido é uma instrução interna e nunca deve aparecer como texto do site. Não invente fatos. Você também pode reorganizar a estrutura da página inicial quando pedido (adicionar, remover ou reordenar seções). Responda SOMENTE com um objeto JSON contendo apenas os campos alterados entre: name, segment, headline, description, aboutTitle, about, services (lista de objetos com title e description), cta, contact, color, faq (lista de objetos com question e answer, sem inventar preços, prazos ou números específicos), features (lista de objetos com title e description, diferenciais sem números inventados), heroStyle ("centrado", "dividido" ou "impacto"), homeBlocks (lista ordenada usando somente os ids "features", "gallery", "testimonials", "cta" — inclua só o que deve aparecer na página inicial, na ordem pedida).\n\nSite atual:\n${JSON.stringify(current.brief || {}).slice(0, 10000)}\n\nAlteração pedida: ${request.slice(0, 3000)}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Não foi possível aplicar a alteração.");
      const patch = parseSiteJson(data.content);
      const brief = mergeSiteBrief(current.brief || {}, patch);
      const pages = makeSitePages(brief, current.slug);
      updateSite(current.id, {
        name: brief.name || current.name,
        brief,
        pages,
        html: pages[0].html,
        serverPublished: false,
        chat: [
          ...(current.chat || []),
          userMessage,
          {
            id: uid(),
            role: "assistant",
            content:
              "Alteração aplicada. Revise o resultado ao lado; você pode continuar pedindo ajustes.",
            createdAt: new Date().toISOString(),
          },
        ],
      });
      setToast("Alteração aplicada ao site");
    } catch (error) {
      setSiteError(error.message || "Não foi possível alterar o site agora.");
      updateSite(current.id, {
        chat: [
          ...(current.chat || []),
          userMessage,
          {
            id: uid(),
            role: "assistant",
            content:
              "Não consegui aplicar essa alteração agora. Tente descrever o texto, a seção ou a cor que deseja mudar.",
            createdAt: new Date().toISOString(),
          },
        ],
      });
    } finally {
      setSiteChatBusy(false);
    }
  };
  useEffect(() => {
    if (current && looksLikeSiteInstruction(current.brief?.description))
      repairLegacySite();
  }, [current?.id]);
  const download = (s) => {
    const blob = new Blob([s.html], { type: "text/html" }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${s.slug}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const siteRequest = async (action, body) => {
    const response = await fetch(`/api/sites/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ ...body, ownerId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(data.error || "Não foi possível concluir a publicação.");
    return data;
  };
  const publishSite = async () => {
    if (!current || publishing) return;
    setPublishing(true);
    setSiteError("");
    try {
      if (current.published && current.serverPublished) {
        await siteRequest("unpublish", { id: current.id });
        updateSite(current.id, {
          published: false,
          serverPublished: false,
          publicUrl: null,
          publishedAt: null,
        });
        setToast("Site despublicado");
      } else {
        const data = await siteRequest("publish", {
          id: current.id,
          slug: current.slug,
          name: current.name,
          description: current.brief?.description || "",
          html: current.html,
          pages: current.pages || [],
        });
        updateSite(current.id, {
          slug: data.slug,
          published: true,
          serverPublished: true,
          publicUrl: data.url,
          publishedAt: data.publishedAt,
        });
        setToast(
          current.published
            ? "Publicação atualizada"
            : "Site publicado de verdade",
        );
      }
    } catch (error) {
      setSiteError(error.message);
    } finally {
      setPublishing(false);
    }
  };
  const deleteSite = async (site) => {
    if (
      !confirm(
        `Excluir ${site.name}? Esta ação remove também a página pública e os leads recebidos.`,
      )
    )
      return;
    try {
      await siteRequest("delete", { id: site.id });
      update((d) => ({ ...d, sites: d.sites.filter((x) => x.id !== site.id) }));
      if (preview === site.id) setPreview(null);
      setToast("Site excluído");
    } catch (error) {
      setToast(error.message);
    }
  };

  useEffect(() => {
    if (!current?.published) {
      setLeads([]);
      return;
    }
    let cancelled = false;
    setLoadingLeads(true);
    fetch(`/api/sites/leads?site_id=${encodeURIComponent(current.id)}`, {
      headers: authHeaders(),
    })
      .then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok)
          throw new Error(
            data.error || "Não foi possível carregar os contatos.",
          );
        setLeads(data.leads || []);
      })
      .catch((error) => {
        if (!cancelled) setSiteError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingLeads(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.published, current?.publishedAt]);
  if (current) {
    const progress = websiteMilestones(current);
    const completed = progress.filter((x) => x.done).length;
    return (
      <PageTitle
        eyebrow="EDITOR DE SITE"
        title={current.name}
        text={
          current.published && current.serverPublished
            ? `Publicado em ${current.publicUrl || `/s/${current.slug}`}`
            : current.published
              ? "Alterações pendentes de publicação"
              : "Rascunho privado"
        }
        action={
          <Button
            variant="ghost"
            icon={ChevronLeft}
            onClick={() => setPreview(null)}
          >
            Meus sites
          </Button>
        }
      >
        <div className="cert-progress-mini">
          <span className="cert-mini-icon">
            <Award />
          </span>
          <div>
            <strong>Trilha: Criação de Websites No-Code</strong>
            <small>
              {completed} de {progress.length} marcos concluídos para liberar o
              certificado
            </small>
          </div>
          <div className="meter">
            <span
              style={{ width: `${(completed / progress.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="site-toolbar">
          <div className="view-toggle">
            <button
              className={device === "desktop" ? "active" : ""}
              onClick={() => {
                setDevice("desktop");
                updateSite(current.id, {
                  reviewedDevices: [
                    ...new Set([...(current.reviewedDevices || []), "desktop"]),
                  ],
                });
              }}
            >
              <Monitor />
              Desktop
            </button>
            <button
              className={device === "tablet" ? "active" : ""}
              onClick={() => {
                setDevice("tablet");
                updateSite(current.id, {
                  reviewedDevices: [
                    ...new Set([...(current.reviewedDevices || []), "tablet"]),
                  ],
                });
              }}
            >
              <Tablet />
              Tablet
            </button>
            <button
              className={device === "mobile" ? "active" : ""}
              onClick={() => {
                setDevice("mobile");
                updateSite(current.id, {
                  reviewedDevices: [
                    ...new Set([...(current.reviewedDevices || []), "mobile"]),
                  ],
                });
              }}
            >
              <Smartphone />
              Celular
            </button>
          </div>
          <div>
            <Button
              variant="ghost"
              icon={Palette}
              onClick={() => setCustomizing(!customizing)}
            >
              {customizing ? "Fechar personalização" : "Personalizar visual"}
            </Button>
            <Button
              variant="ghost"
              icon={Edit3}
              onClick={() => setEditCode(!editCode)}
            >
              {editCode ? "Ver preview" : "Editar HTML"}
            </Button>
            <Button
              icon={current.published && current.serverPublished ? Eye : Globe2}
              disabled={publishing}
              onClick={publishSite}
            >
              {publishing
                ? "Publicando..."
                : current.published && current.serverPublished
                  ? "Despublicar"
                  : current.published
                    ? "Atualizar publicação"
                    : "Publicar"}
            </Button>
          </div>
        </div>
        {customizing && (
          <div className="site-customize-panel">
            <SiteVisualEditor brief={current.brief || {}} onChange={updateBrief} />
          </div>
        )}
        <div className="site-public-panel">
          <Field label="Endereço público">
            <div className="slug-editor">
              <span>{location.origin}/s/</span>
              <input
                value={current.slug}
                onChange={(event) => {
                  const nextSlug = slugify(event.target.value);
                  const oldPath = `/s/${current.slug}`;
                  const nextPath = `/s/${nextSlug}`;
                  updateSite(current.id, {
                    slug: nextSlug,
                    html: current.html.split(oldPath).join(nextPath),
                    pages: (current.pages || []).map((item) => ({
                      ...item,
                      html: item.html.split(oldPath).join(nextPath),
                    })),
                    serverPublished: false,
                  });
                }}
                aria-label="Endereço público do site"
              />
            </div>
          </Field>
          {current.published && current.serverPublished && (
            <div className="site-public-actions">
              <span className="publish-state live">
                <BadgeCheck /> Página pública confirmada
              </span>
              <a
                className="button secondary"
                href={current.publicUrl || `/s/${current.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} /> Abrir site
              </a>
              <Button
                variant="ghost"
                icon={Copy}
                onClick={() => {
                  navigator.clipboard?.writeText(
                    current.publicUrl || `${location.origin}/s/${current.slug}`,
                  );
                  setToast("Link público copiado");
                }}
              >
                Copiar link
              </Button>
            </div>
          )}
          {current.published && !current.serverPublished && (
            <span className="publish-state pending">
              <Clock3 /> Há mudanças locais. Clique em atualizar publicação.
            </span>
          )}
          {siteError && (
            <div className="ask-error">
              <CircleAlert /> {siteError}
            </div>
          )}
        </div>
        {looksLikeSiteInstruction(current.brief?.description) && (
          <div className="site-repair-notice">
            <CircleAlert />
            <span>
              Este projeto antigo parece exibir o briefing como texto público.
            </span>
            <Button
              variant="ghost"
              icon={WandSparkles}
              onClick={repairLegacySite}
            >
              Corrigir conteúdo
            </Button>
          </div>
        )}
        <div className="site-page-list" aria-label="Páginas do site">
          {(current.pages?.length
            ? current.pages
            : [
                { slug: "", name: "Início" },
                { slug: "sobre", name: "Sobre" },
                { slug: "servicos", name: "Serviços" },
                { slug: "contato", name: "Contato" },
              ]
          ).map((item) => (
            <button
              className={previewPage === item.slug ? "active" : ""}
              key={item.slug || "home"}
              onClick={() => setPreviewPage(item.slug)}
            >
              <FileText /> {item.name}
            </button>
          ))}
        </div>
        <div className="site-workspace">
          <aside className="site-chat">
            <header>
              <span className="site-chat-icon">
                <Sparkles />
              </span>
              <div>
                <strong>Editar por conversa</strong>
                <small>Peça alterações como faria com uma pessoa.</small>
              </div>
            </header>
            <div className="site-chat-messages">
              {(
                current.chat || [
                  {
                    id: "welcome",
                    role: "assistant",
                    content:
                      "Diga o que deseja mudar. Ex.: “deixe o título mais direto” ou “troque a cor para verde”.",
                  },
                ]
              ).map((message) => (
                <div className={message.role} key={message.id}>
                  {message.content}
                </div>
              ))}
              {siteChatBusy && (
                <div className="assistant">Aplicando alteração...</div>
              )}
            </div>
            <div className="site-chat-compose">
              <textarea
                value={siteChatText}
                onChange={(event) => setSiteChatText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    requestSiteChange();
                  }
                }}
                placeholder="Ex.: mude o título e deixe o texto mais acolhedor"
              />
              <button
                onClick={requestSiteChange}
                disabled={!siteChatText.trim() || siteChatBusy}
                aria-label="Enviar alteração do site"
              >
                <Send />
              </button>
            </div>
          </aside>
          {editCode ? (
            <div className="code-editor">
              <div>
                <span>HTML da página inicial</span>
                <small>Scripts inseridos são bloqueados no preview.</small>
              </div>
              <textarea
                value={previewHtml}
                onChange={(e) =>
                  updateSite(current.id, {
                    html: previewPage ? current.html : e.target.value,
                    pages: (current.pages || []).map((item) =>
                      item.slug === previewPage
                        ? { ...item, html: e.target.value }
                        : item,
                    ),
                    codeEdited: true,
                    serverPublished: false,
                  })
                }
              />
            </div>
          ) : (
            <div className={`site-preview ${device}`}>
              <iframe
                title={`Preview de ${current.name}`}
                sandbox="allow-forms allow-popups"
                srcDoc={previewHtml}
              />
            </div>
          )}
        </div>
        {current.published && current.serverPublished && (
          <section className="site-leads section">
            <div className="section-head">
              <div>
                <span className="eyebrow">CONTATOS RECEBIDOS</span>
                <h2>Leads deste site</h2>
                <p>Mensagens enviadas pelo formulário da página pública.</p>
              </div>
              <span className="lead-count">{leads.length}</span>
            </div>
            {loadingLeads ? (
              <p className="muted">Carregando contatos...</p>
            ) : leads.length === 0 ? (
              <div className="lead-empty">
                <Mail />
                <span>Nenhum contato recebido ainda.</span>
              </div>
            ) : (
              <div className="lead-list">
                {leads.map((lead) => (
                  <article key={lead.id}>
                    <div>
                      <strong>{lead.name}</strong>
                      <small>
                        {new Date(lead.createdAt).toLocaleString("pt-BR")}
                      </small>
                    </div>
                    <p>{lead.message || "Sem mensagem."}</p>
                    <footer>
                      <a href={`mailto:${lead.email}`}>
                        <Mail /> {lead.email}
                      </a>
                      {lead.phone && <span>{lead.phone}</span>}
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </PageTitle>
    );
  }
  return (
    <PageTitle
      eyebrow="SITES E MATERIAIS"
      title="Crie uma presença digital de verdade"
      text="Gere um site com várias páginas, edite por conversa, visualize em diferentes telas e publique."
      action={
        <Button icon={Plus} onClick={() => setModal(true)}>
          Criar site
        </Button>
      }
    >
      <AreaToolkit
        area="sites"
        db={db}
        update={update}
        business={business}
        setToast={setToast}
        go={go}
      />
      <div id="site-projects" />
      {sites.length === 0 ? (
        <Empty
          icon={Globe2}
          title="Nenhum site criado"
          text="Descreva seu negócio e gere um site responsivo com páginas de Início, Sobre, Serviços e Contato."
          action="Criar meu primeiro site"
          onAction={() => setModal(true)}
        />
      ) : (
        <div className="sites-grid">
          {sites.map((s) => (
            <article key={s.id}>
              <div className="site-thumb">
                <iframe title="Miniatura" sandbox="" srcDoc={s.html} />
                <span
                  className={
                    s.published && s.serverPublished
                      ? "live"
                      : s.published
                        ? "pending"
                        : ""
                  }
                >
                  {s.published && s.serverPublished
                    ? "Publicado"
                    : s.published
                      ? "Atualização pendente"
                      : "Rascunho"}
                </span>
              </div>
              <div>
                <h3>{s.name}</h3>
                <p>{s.publicUrl || `/s/${s.slug}`}</p>
                <small>
                  Atualizado {new Date(s.updatedAt).toLocaleString("pt-BR")}
                </small>
                <footer>
                  <button onClick={() => setPreview(s.id)}>
                    <Edit3 />
                    Editar
                  </button>
                  <button onClick={() => download(s)}>
                    <Download />
                    Baixar
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(s.html);
                      setToast("Código copiado");
                    }}
                  >
                    <Copy />
                    Código
                  </button>
                  <button className="danger" onClick={() => deleteSite(s)}>
                    <Trash2 />
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Criar um site" wide onClose={() => setModal(false)}>
          <form className="modal-body" onSubmit={generate}>
            <Field
              label="Instruções para criar o site"
              hint="Este briefing orienta a criação e nunca será exibido aos visitantes."
            >
              <textarea
                required
                autoFocus
                value={form.instructions}
                onChange={(e) =>
                  setForm({ ...form, instructions: e.target.value })
                }
                placeholder="Ex.: Uma landing page para apresentar meus serviços de organização residencial..."
              />
            </Field>
            <Field
              label="Texto de apresentação ao visitante (opcional)"
              hint="Se ficar vazio, o assistente criará um texto público a partir do briefing."
            >
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Ex.: Organização prática para uma casa mais leve e funcional."
              />
            </Field>
            <div className="form-grid">
              <Field label="Nome do negócio">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Segmento">
                <input
                  value={form.segment}
                  onChange={(e) =>
                    setForm({ ...form, segment: e.target.value })
                  }
                />
              </Field>
              <Field label="Título principal">
                <input
                  value={form.headline}
                  onChange={(e) =>
                    setForm({ ...form, headline: e.target.value })
                  }
                  placeholder="Se vazio, usa o nome do negócio"
                />
              </Field>
              <Field label="Chamada do botão">
                <input
                  value={form.cta}
                  onChange={(e) => setForm({ ...form, cta: e.target.value })}
                />
              </Field>
              <Field label="Contato ou link">
                <input
                  value={form.contact}
                  onChange={(e) =>
                    setForm({ ...form, contact: e.target.value })
                  }
                  placeholder="https://wa.me/..."
                />
              </Field>
              <Field label="Cor principal">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Serviços (um por linha)">
              <textarea
                value={form.services}
                onChange={(e) => setForm({ ...form, services: e.target.value })}
              />
            </Field>
            <SiteVisualEditor
              brief={form}
              onChange={(patch) => setForm({ ...form, ...patch })}
            />
            <div className="notice">
              <ShieldCheck />
              <span>
                O texto é gerado pelo assistente a partir do briefing; fotos e
                depoimentos são sempre os que você enviar aqui, nunca inventados.
              </span>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={WandSparkles} disabled={generating}>
                {generating ? "Criando páginas..." : "Gerar site completo"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}

function EmailComposer({ onClose, setToast, initial }) {
  const [form, setForm] = useState({
    to: initial?.to || "",
    subject: initial?.subject || "",
    body: initial?.body || "",
  });
  const [googleId, setGoogleId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setGoogleId(d.googleClientId || ""))
      .catch(() => {});
  }, []);
  const sendReal = async () => {
    if (!form.to.trim() || sending) return;
    setSending(true);
    setSendError("");
    try {
      await sendGmailReal(googleId, form);
      setToast("E-mail enviado pela sua conta Google");
      onClose();
    } catch (error) {
      setSendError(error.message || "Não foi possível enviar agora.");
    } finally {
      setSending(false);
    }
  };
  const params = () =>
    `to=${encodeURIComponent(form.to)}&su=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.body)}`;
  const openGmail = () => {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&${params()}`,
      "_blank",
      "noopener",
    );
    setToast("Rascunho aberto no Gmail para sua confirmação");
  };
  const openOutlook = () => {
    window.open(
      `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(form.to)}&subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.body)}`,
      "_blank",
      "noopener",
    );
    setToast("Rascunho aberto no Outlook para sua confirmação");
  };
  const openClient = () => {
    location.href = `mailto:${encodeURIComponent(form.to)}?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.body)}`;
  };
  return (
    <Modal title="Escrever e-mail" wide onClose={onClose}>
      <div className="modal-body">
        <div className="notice">
          <ShieldCheck />
          <span>
            "Enviar pelo Gmail" pede sua permissão do Google e envia direto
            pela sua conta. As demais opções só preparam um rascunho para você
            revisar e enviar manualmente.
          </span>
        </div>
        <div className="form-grid">
          <Field label="Para">
            <input
              type="email"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              placeholder="cliente@empresa.com"
            />
          </Field>
          <Field label="Assunto">
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Assunto do e-mail"
            />
          </Field>
        </div>
        <Field label="Mensagem">
          <textarea
            className="email-body"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Escreva ou cole sua mensagem..."
          />
        </Field>
        {sendError && (
          <div className="ask-error">
            <CircleAlert /> {sendError}
          </div>
        )}
        <div className="email-actions">
          <Button
            icon={Send}
            onClick={sendReal}
            disabled={sending || !form.to.trim()}
          >
            {sending ? "Enviando..." : "Enviar pelo Gmail"}
          </Button>
          <Button variant="secondary" icon={Mail} onClick={openGmail}>
            Abrir rascunho no Gmail
          </Button>
          <Button variant="secondary" icon={Mail} onClick={openOutlook}>
            Abrir no Outlook
          </Button>
          <Button variant="ghost" icon={ExternalLink} onClick={openClient}>
            Usar aplicativo padrão
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TranslatorModal({ onClose, setToast }) {
  const [text, setText] = useState(""),
    [lang, setLang] = useState("Inglês"),
    [mode, setMode] = useState("traduzir"),
    [out, setOut] = useState(""),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const langs = [
    "Inglês",
    "Espanhol",
    "Francês",
    "Italiano",
    "Alemão",
    "Português",
    "Chinês (Mandarim)",
    "Japonês",
    "Coreano",
    "Árabe",
    "Russo",
    "Holandês",
  ];
  const translate = async () => {
    if (text.trim().length < 1 || busy) return;
    setBusy(true);
    setErr("");
    setOut("");
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          prompt:
            mode === "traduzir"
              ? `Detecte automaticamente o idioma do texto abaixo e traduza-o para ${lang}. Responda SOMENTE com a tradução, mantendo o tom e a formatação, sem aspas e sem comentários.\n\n${text.trim()}`
              : `A mensagem abaixo foi recebida de um cliente ou parceiro (detecte o idioma automaticamente). 1) Traduza a mensagem para português. 2) Sugira uma resposta profissional e cordial em ${lang}, pronta para enviar. 3) Mostre a tradução da resposta em português para conferência. Use títulos curtos para as três partes. Não invente informações que não estejam na mensagem.\n\n${text.trim()}`,
          specialist: "Redator",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não foi possível traduzir agora.");
      setOut((d.content || "").trim());
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Funcionário Bilíngue — Tradutor" wide onClose={onClose}>
      <div className="modal-body">
        <div className="notice">
          <Languages />
          <span>
            Tradução por IA, gratuita. Ideal para e-mails, propostas, descrições
            e atendimento a clientes de outros países.
          </span>
        </div>
        <div className="form-grid">
          <Field label="O que você precisa">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="traduzir">Traduzir um texto (detecta o idioma sozinho)</option>
              <option value="responder">Recebi uma mensagem — traduzir e sugerir resposta</option>
            </select>
          </Field>
          <Field label={mode === "traduzir" ? "Texto para traduzir" : "Mensagem recebida"}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 5000))}
              placeholder="Cole ou escreva o texto..."
            />
          </Field>
          <Field label="Traduzir para">
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {langs.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        {err && (
          <div className="ask-error">
            <CircleAlert />
            {err}
          </div>
        )}
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button
            icon={busy ? RefreshCw : Languages}
            disabled={busy || !text.trim()}
            onClick={translate}
          >
            {busy ? "Traduzindo..." : "Traduzir"}
          </Button>
        </div>
        {out && (
          <div className="translate-out">
            <div className="translate-head">
              <span>Tradução ({lang})</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(out);
                  setToast("Tradução copiada");
                }}
              >
                <Copy />
                Copiar
              </button>
            </div>
            <pre>{out}</pre>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RouterModal({ onClose, setToast }) {
  const [stops, setStops] = useState(["", ""]),
    [mode, setMode] = useState("driving"),
    [busy, setBusy] = useState(false);
  const [sugg, setSugg] = useState({});
  const [eta, setEta] = useState("");
  const suggTimer = useRef(null);
  const suggest = (i, q) => {
    clearTimeout(suggTimer.current);
    if (q.trim().length < 4) return;
    suggTimer.current = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=4&countrycodes=br&q=${encodeURIComponent(q)}`,
        { headers: { accept: "application/json" } },
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((list) =>
          setSugg((cur) => ({ ...cur, [i]: (list || []).map((x) => x.display_name) })),
        )
        .catch(() => {});
    }, 550);
  };
  const calcEta = async () => {
    const pts = clean();
    if (pts.length < 2) {
      setToast("Informe ao menos origem e destino");
      return;
    }
    setEta("calculando");
    try {
      const coords = [];
      for (const p of pts) {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(p)}`,
          { headers: { accept: "application/json" } },
        );
        const j = await r.json();
        if (!j[0]) throw new Error(`Endereço não encontrado: ${p.slice(0, 40)}`);
        coords.push(`${j[0].lon},${j[0].lat}`);
      }
      const or = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords.join(";")}?overview=false`,
      );
      const oj = await or.json();
      const route = oj.routes && oj.routes[0];
      if (!route) throw new Error("Não foi possível traçar a rota.");
      const min = Math.round(route.duration / 60);
      const h = Math.floor(min / 60);
      const km = (route.distance / 1000).toFixed(1);
      setEta(
        `≈ ${h > 0 ? `${h}h${String(min % 60).padStart(2, "0")}` : `${min} min`} de carro · ${km} km (sem trânsito · dados © OpenStreetMap)`,
      );
    } catch (e) {
      setEta("");
      setToast(e.message || "Não foi possível calcular agora");
    }
  };
  const setStop = (i, v) => setStops((s) => s.map((x, j) => (j === i ? v : x)));
  const addStop = () =>
    setStops((s) =>
      s.length < 12 ? [...s.slice(0, -1), "", s[s.length - 1]] : s,
    );
  const removeStop = (i) =>
    setStops((s) => (s.length > 2 ? s.filter((_, j) => j !== i) : s));
  const clean = () => stops.map((s) => s.trim()).filter(Boolean);
  const buildUrl = (pts) =>
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pts[0])}&destination=${encodeURIComponent(pts[pts.length - 1])}${pts.length > 2 ? "&waypoints=" + pts.slice(1, -1).map(encodeURIComponent).join("%7C") : ""}&travelmode=${mode}`;
  const open = () => {
    const pts = clean();
    if (pts.length < 2) {
      setToast("Informe ao menos origem e destino");
      return;
    }
    window.open(buildUrl(pts), "_blank", "noopener");
    setToast("Rota aberta no Google Maps");
  };
  const optimize = async () => {
    const pts = clean();
    if (pts.length < 3) {
      setToast("Adicione paradas para otimizar");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          prompt: `Sou entregador. Ordene os endereços abaixo na sequência mais eficiente de rota, mantendo o primeiro como ponto de partida. Responda SOMENTE com a lista numerada dos endereços na nova ordem, sem comentários.\n\n${pts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
          specialist: "Logística",
        }),
      });
      const d = await r.json();
      if (r.ok && d.content) {
        const reordered = d.content
          .split("\n")
          .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
          .filter(Boolean);
        if (reordered.length >= pts.length) {
          setStops([...reordered.slice(0, pts.length), ""]);
          setToast("Ordem sugerida pela IA aplicada");
        }
      }
    } catch {
      setToast("Não foi possível otimizar agora");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Logística — Roteirizador" wide onClose={onClose}>
      <div className="modal-body">
        <div className="notice">
          <Route />
          <span>
            Monte a rota com várias paradas e abra direto no Google Maps para
            navegar. Gratuito, sem cadastro. Tempo de trajeto, trânsito e pedágios aparecem no Maps ao abrir a rota.
          </span>
        </div>
        <div className="route-list">
          {stops.map((s, i) => (
            <div className="route-row" key={i}>
              <span className="route-dot">
                {i === 0 ? (
                  <MapPin />
                ) : i === stops.length - 1 ? (
                  <Navigation />
                ) : (
                  i
                )}
              </span>
              <input
                list={`route-sugg-${i}`}
                value={s}
                onChange={(e) => {
                  setStop(i, e.target.value);
                  suggest(i, e.target.value);
                }}
                placeholder={
                  i === 0
                    ? "Origem (endereço de partida)"
                    : i === stops.length - 1
                      ? "Destino final"
                      : `Parada ${i}`
                }
              />
              <datalist id={`route-sugg-${i}`}>
                {(sugg[i] || []).map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              {stops.length > 2 && (
                <button
                  className="icon-button danger"
                  onClick={() => removeStop(i)}
                >
                  <X />
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="text-button" onClick={addStop}>
          <Plus size={16} />
          Adicionar parada
        </button>
        {eta && (
          <div className="route-eta">
            {eta === "calculando" ? "Calculando rota..." : eta}
          </div>
        )}
        <div className="route-mode">
          <span>Como vai se deslocar:</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="driving">Carro/moto</option>
            <option value="walking">A pé</option>
            <option value="bicycling">Bicicleta</option>
            <option value="transit">Transporte público</option>
          </select>
        </div>
        <div className="modal-actions">
          <Button
            variant="secondary"
            icon={busy ? RefreshCw : Sparkles}
            disabled={busy}
            onClick={optimize}
          >
            {busy ? "Otimizando..." : "Sugerir melhor ordem (IA)"}
          </Button>
          <Button variant="secondary" icon={Clock3} onClick={calcEta}>
            Tempo e distância
          </Button>
          <Button icon={Navigation} onClick={open}>
            Abrir rota no Maps
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const aiTools = {
  price: {
    title: "Financeiro — Calculadora de preço",
    icon: DollarSign,
    specialist: "Precificador",
    cta: "Calcular preço",
    outTitle: "Preço sugerido",
    hint: "Calcula o preço de venda com base apenas nos números que você informar. Mostra a fórmula e separa custo, margem e estimativas.",
    fields: [
      {
        key: "produto",
        label: "Produto ou serviço",
        type: "input",
        required: true,
        placeholder: "Ex.: Bolo de pote 250ml",
      },
      {
        key: "custo",
        label: "Custo direto por unidade (R$)",
        type: "input",
        required: true,
        placeholder: "Ex.: 4,50",
      },
      {
        key: "tempo",
        label: "Tempo/mão de obra por unidade",
        type: "input",
        placeholder: "Ex.: 20 min a R$ 25/h",
      },
      {
        key: "fixas",
        label: "Despesas fixas a ratear (R$)",
        type: "input",
        placeholder: "Ex.: aluguel/luz por unidade, se souber",
      },
      {
        key: "margem",
        label: "Margem de lucro desejada (%)",
        type: "input",
        placeholder: "Ex.: 40",
      },
    ],
    build: (v) =>
      `Calcule um preço de venda sugerido usando SOMENTE estes números. Mostre a fórmula, some custo direto + mão de obra + rateio de despesas, aplique a margem, e separe claramente o que é fato informado do que é estimativa. Não invente valores ausentes — se faltar algo, aponte.\n\nProduto: ${v.produto}\nCusto direto/unidade: R$ ${v.custo}\nMão de obra/tempo: ${v.tempo || "não informado"}\nDespesas fixas a ratear: ${v.fixas || "não informado"}\nMargem desejada: ${v.margem || "não informada"}%`,
  },
  post: {
    title: "Marketing — Gerador de posts",
    icon: Megaphone,
    specialist: "Marketing",
    cta: "Gerar posts",
    outTitle: "Legendas prontas",
    hint: "Cria opções de legenda com hashtags para suas redes, a partir do que você vende e do tom da marca.",
    fields: [
      {
        key: "oferta",
        label: "O que você quer divulgar",
        type: "textarea",
        required: true,
        placeholder: "Ex.: Nova linha de bolos no pote, sabores de inverno",
      },
      {
        key: "rede",
        label: "Rede social",
        type: "select",
        options: [
          "Instagram",
          "Facebook",
          "LinkedIn",
          "TikTok",
          "WhatsApp Status",
        ],
      },
      {
        key: "objetivo",
        label: "Objetivo",
        type: "select",
        options: [
          "Vender",
          "Engajar/interagir",
          "Divulgar novidade",
          "Educar o público",
        ],
      },
      {
        key: "tom",
        label: "Tom da marca",
        type: "input",
        placeholder: "Ex.: acolhedor e divertido",
      },
    ],
    build: (v) =>
      `Crie 3 opções de legenda para ${v.rede} com o objetivo de ${v.objetivo}. Tom: ${v.tom || "profissional e próximo"}. Use emojis adequados e, ao final de cada opção, 5 a 8 hashtags relevantes. Não invente preços, promoções, prazos ou resultados que não foram informados.\n\nAssunto: ${v.oferta}`,
  },
  contract: {
    title: "Jurídico — Gerador de contrato",
    icon: BriefcaseBusiness,
    specialist: "Jurídico",
    cta: "Gerar minuta",
    outTitle: "Minuta de contrato",
    hint: "Monta uma minuta de contrato de prestação de serviços com seus dados, em cláusulas, pronta para revisão de um advogado.",
    fields: [
      {
        key: "contratante",
        label: "Contratante (quem contrata)",
        type: "input",
        required: true,
        placeholder: "Nome/empresa e, se tiver, CNPJ/CPF",
      },
      {
        key: "contratado",
        label: "Contratado (quem presta o serviço)",
        type: "input",
        required: true,
        placeholder: "Nome/empresa e, se tiver, CNPJ/CPF",
      },
      {
        key: "servico",
        label: "Serviço a ser prestado",
        type: "textarea",
        required: true,
        placeholder: "Descreva o objeto do contrato",
      },
      {
        key: "valor",
        label: "Valor e forma de pagamento",
        type: "input",
        placeholder: "Ex.: R$ 1.500 em 3x, via Pix",
      },
      {
        key: "prazo",
        label: "Prazo / vigência",
        type: "input",
        placeholder: "Ex.: 30 dias a partir da assinatura",
      },
    ],
    build: (v) =>
      `Monte uma minuta de CONTRATO DE PRESTAÇÃO DE SERVIÇOS em cláusulas numeradas (objeto, obrigações das partes, valor e pagamento, prazo, confidencialidade, rescisão, foro), usando SOMENTE os dados abaixo e deixando lacunas [entre colchetes] onde faltar informação. Ao final, inclua uma observação de que a minuta deve ser revisada por um advogado antes da assinatura. Não cite números de leis específicas nem invente cláusulas com valores não informados.\n\nContratante: ${v.contratante}\nContratado: ${v.contratado}\nServiço: ${v.servico}\nValor/pagamento: ${v.valor || "[a definir]"}\nPrazo: ${v.prazo || "[a definir]"}`,
  },
  sales: {
    title: "Vendas — Roteiro e follow-up",
    icon: TrendingUp,
    specialist: "Vendas",
    cta: "Gerar roteiro",
    outTitle: "Roteiro de vendas",
    hint: "Cria script de abordagem, respostas a objeções e mensagens de acompanhamento para fechar mais vendas.",
    fields: [
      {
        key: "oferta",
        label: "Produto ou serviço",
        type: "textarea",
        required: true,
        placeholder: "O que você vende e o principal benefício",
      },
      {
        key: "cliente",
        label: "Cliente ideal",
        type: "input",
        placeholder: "Ex.: mães que compram por encomenda",
      },
      {
        key: "canal",
        label: "Canal de contato",
        type: "select",
        options: [
          "WhatsApp",
          "E-mail",
          "Telefone",
          "Presencial",
          "Instagram Direct",
        ],
      },
    ],
    build: (v) =>
      `Crie um roteiro de vendas prático para ${v.canal}, com: 1) abordagem inicial, 2) 3 perguntas de qualificação, 3) apresentação de valor, 4) 3 objeções comuns com respostas prontas, 5) 2 mensagens de follow-up (com intervalo sugerido). Seja específico e ético. Não invente depoimentos, resultados ou preços não informados.\n\nProduto/serviço: ${v.oferta}\nCliente ideal: ${v.cliente || "não informado"}`,
  },
  rh: {
    title: "RH — Vaga e entrevista",
    icon: UserCog,
    specialist: "Pessoas",
    cta: "Gerar",
    outTitle: "Descrição de vaga + entrevista",
    hint: "Cria a descrição de uma vaga e um roteiro de entrevista, sem usar critérios discriminatórios.",
    fields: [
      {
        key: "cargo",
        label: "Cargo",
        type: "input",
        required: true,
        placeholder: "Ex.: Auxiliar de confeitaria",
      },
      {
        key: "responsa",
        label: "Principais responsabilidades",
        type: "textarea",
        placeholder: "O que a pessoa vai fazer no dia a dia",
      },
      {
        key: "requisitos",
        label: "Requisitos desejados",
        type: "input",
        placeholder: "Ex.: experiência com massas, disponibilidade manhã",
      },
      {
        key: "tipo",
        label: "Tipo de contratação",
        type: "select",
        options: ["CLT", "PJ", "Estágio", "Freelancer", "Temporário"],
      },
    ],
    build: (v) =>
      `Crie: 1) uma descrição de vaga profissional e atrativa e 2) um roteiro com 8 perguntas de entrevista (comportamentais e técnicas). Não use critérios discriminatórios (idade, gênero, estado civil, aparência). Não invente benefícios ou salários não informados.\n\nCargo: ${v.cargo}\nResponsabilidades: ${v.responsa || "não informadas"}\nRequisitos: ${v.requisitos || "não informados"}\nContratação: ${v.tipo}`,
  },
  ops: {
    title: "Operações — Passo a passo (POP)",
    icon: Workflow,
    specialist: "Operações",
    cta: "Gerar POP",
    outTitle: "Procedimento operacional",
    hint: "Transforma uma tarefa recorrente em um procedimento padrão com checklist, para qualquer pessoa executar igual.",
    fields: [
      {
        key: "processo",
        label: "Processo a padronizar",
        type: "input",
        required: true,
        placeholder: "Ex.: Preparo e entrega de encomendas",
      },
      {
        key: "objetivo",
        label: "Objetivo / resultado esperado",
        type: "input",
        placeholder: "Ex.: entregar no prazo e sem erros",
      },
      {
        key: "quem",
        label: "Quem executa",
        type: "input",
        placeholder: "Ex.: auxiliar e entregador",
      },
    ],
    build: (v) =>
      `Crie um Procedimento Operacional Padrão (POP) para o processo abaixo: passos numerados na ordem correta, responsáveis por etapa, pontos de atenção e um checklist final de conferência. Seja prático e específico.\n\nProcesso: ${v.processo}\nObjetivo: ${v.objetivo || "não informado"}\nExecutores: ${v.quem || "não informado"}`,
  },
  support: {
    title: "Atendimento — Respostas prontas",
    icon: Headphones,
    specialist: "Atendimento",
    cta: "Gerar respostas",
    outTitle: "Modelos de resposta",
    hint: "Gera modelos de resposta com empatia e foco em resolução, para você adaptar e enviar.",
    fields: [
      {
        key: "situacao",
        label: "Situação do cliente",
        type: "textarea",
        required: true,
        placeholder: "Ex.: cliente reclamando de atraso na entrega",
      },
      {
        key: "canal",
        label: "Canal",
        type: "select",
        options: [
          "WhatsApp",
          "E-mail",
          "Instagram Direct",
          "Telefone (roteiro)",
        ],
      },
      {
        key: "tom",
        label: "Tom desejado",
        type: "input",
        placeholder: "Ex.: educado, acolhedor e objetivo",
      },
    ],
    build: (v) =>
      `Crie 3 modelos de resposta para ${v.canal} para a situação abaixo, com empatia e foco em resolução. Ofereça uma solução concreta ou próximo passo. Não prometa reembolsos, prazos ou condições não informados.\n\nSituação: ${v.situacao}\nTom: ${v.tom || "educado e objetivo"}`,
  },
  dados: {
    title: "Dados — Análise de números",
    icon: Filter,
    specialist: "Dados",
    cta: "Analisar",
    outTitle: "Análise dos dados",
    hint: "Cole seus números (vendas, despesas, visitas...) e receba padrões, comparações e recomendações baseadas apenas no que você informar.",
    fields: [
      {
        key: "dados",
        label: "Cole seus dados",
        type: "textarea",
        required: true,
        placeholder:
          "Ex.:\nJan: 42 vendas, R$ 3.100\nFev: 38 vendas, R$ 2.900\nMar: 55 vendas, R$ 4.400",
      },
      {
        key: "pergunta",
        label: "O que você quer descobrir?",
        type: "input",
        placeholder: "Ex.: por que março cresceu? o que devo repetir?",
      },
    ],
    build: (v) =>
      `Analise APENAS os dados abaixo, sem inventar nenhum número: identifique padrões, variações relevantes (com percentuais calculados), possíveis causas a investigar e 3 recomendações práticas baseadas em evidências. Se os dados forem insuficientes para alguma conclusão, diga claramente.\n\nDados:\n${v.dados}\n\nPergunta principal: ${v.pergunta || "visão geral"}`,
  },
  ecommerce: {
    title: "E-commerce — Descrição de produto",
    icon: ShoppingBag,
    specialist: "E-commerce",
    cta: "Gerar descrição",
    outTitle: "Anúncio pronto",
    hint: "Cria título otimizado, descrição vendedora e palavras-chave para sua loja ou marketplace.",
    fields: [
      {
        key: "produto",
        label: "Produto",
        type: "input",
        required: true,
        placeholder: "Ex.: Kit 4 bolos de pote sabores sortidos",
      },
      {
        key: "caracteristicas",
        label: "Características e diferenciais",
        type: "textarea",
        placeholder:
          "Tamanho, sabor, material, prazo de validade, o que o torna especial...",
      },
      {
        key: "plataforma",
        label: "Onde vai vender",
        type: "select",
        options: [
          "Mercado Livre",
          "Shopee",
          "Amazon",
          "Loja própria / site",
          "Instagram / WhatsApp",
        ],
      },
      {
        key: "publico",
        label: "Público-alvo",
        type: "input",
        placeholder: "Ex.: presentes corporativos, festas infantis",
      },
    ],
    build: (v) =>
      `Crie um anúncio otimizado para ${v.plataforma}: 1) título com palavras-chave (respeitando o estilo da plataforma), 2) descrição vendedora e escaneável com bullets, 3) lista de 8 palavras-chave de busca, 4) sugestão de pergunta frequente com resposta. Não invente medidas, prazos, garantias ou certificações não informadas.\n\nProduto: ${v.produto}\nCaracterísticas: ${v.caracteristicas || "não detalhadas"}\nPúblico: ${v.publico || "geral"}`,
  },
  compras: {
    title: "Compras — Comparador de cotações",
    icon: Boxes,
    specialist: "Compras",
    cta: "Comparar",
    outTitle: "Comparativo e recomendação",
    hint: "Cole as cotações recebidas e receba uma comparação estruturada com recomendação e pontos de negociação.",
    fields: [
      {
        key: "item",
        label: "O que você está comprando",
        type: "input",
        required: true,
        placeholder: "Ex.: 500 embalagens para bolo de pote",
      },
      {
        key: "cotacoes",
        label: "Cotações recebidas",
        type: "textarea",
        required: true,
        placeholder:
          "Ex.:\nFornecedor A: R$ 0,90/un, prazo 10 dias, frete grátis\nFornecedor B: R$ 0,75/un, prazo 20 dias, frete R$ 80",
      },
      {
        key: "prioridade",
        label: "Sua prioridade",
        type: "select",
        options: [
          "Menor custo total",
          "Prazo mais rápido",
          "Equilíbrio custo x prazo",
          "Qualidade/confiabilidade",
        ],
      },
    ],
    build: (v) =>
      `Compare as cotações abaixo em uma tabela (custo total calculado, prazo, condições), aponte a melhor opção considerando a prioridade "${v.prioridade}", os riscos de cada fornecedor e 3 pontos para negociar antes de fechar. Use somente os valores informados; calcule totais quando possível e mostre o cálculo.\n\nItem: ${v.item}\nCotações:\n${v.cotacoes}`,
  },
};

function AIToolModal({ config, db, update, onClose, setToast, business }) {
  const [vals, setVals] = useState(
    Object.fromEntries(
      config.fields.map((f) => [f.key, f.type === "select" ? f.options[0] : ""]),
    ),
  );
  const [out, setOut] = useState(""),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const [chat, setChat] = useState([]);
  const [ask, setAsk] = useState("");
  const set = (k, v) => setVals((s) => ({ ...s, [k]: v }));
  const saveOutput = (destination) => {
    const now = new Date().toISOString();
    update((current) => {
      if (destination === "document")
        return {
          ...current,
          documents: [
            {
              id: uid(),
              title: config.title,
              type: config.docType || "Material de trabalho",
              content: out,
              businessId: business?.id || null,
              updatedAt: now,
              versions: [],
            },
            ...current.documents,
          ],
        };
      if (destination === "task")
        return {
          ...current,
          tasks: [
            {
              id: uid(),
              title: `Revisar: ${config.title}`,
              description: out.slice(0, 800),
              priority: "Média",
              status: "A fazer",
              due: "",
              area: config.specialist || "Operação",
              assignee: "",
              project: config.title,
              archived: false,
              businessId: business?.id || null,
              createdAt: now,
              updatedAt: now,
            },
            ...current.tasks,
          ],
        };
      return {
        ...current,
        history: [
          {
            id: uid(),
            title: config.title,
            request: config.build(vals),
            result: out,
            specialist: config.specialist,
            businessId: business?.id || null,
            type: "Ferramenta inteligente",
            status: "Concluído",
            createdAt: now,
            updatedAt: now,
            archived: false,
          },
          ...current.history,
        ],
      };
    });
    setToast(
      destination === "document"
        ? "Resultado salvo em Documentos"
        : destination === "task"
          ? "Resultado transformado em tarefa"
          : "Resultado salvo em Projetos",
    );
  };
  const Icon = config.icon;
  const call = async (prompt, messages) => {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ prompt, specialist: config.specialist, messages }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Não foi possível gerar agora.");
    return (d.content || "").trim();
  };
  const run = async () => {
    const missing = config.fields.filter(
      (f) => f.required && !String(vals[f.key]).trim(),
    );
    if (missing.length) {
      setErr("Preencha: " + missing.map((f) => f.label).join(", "));
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const prompt = config.build(vals);
      const content = await call(prompt, []);
      setOut(content);
      setChat([{ role: "user", content: prompt }, { role: "assistant", content }]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const refine = async () => {
    const q = ask.trim();
    if (!q || busy) return;
    setBusy(true);
    setErr("");
    try {
      const messages = [...chat, { role: "user", content: q }].slice(-10);
      const content = await call(q, messages);
      setOut(content);
      setChat((c) => [...c, { role: "user", content: q }, { role: "assistant", content }]);
      setAsk("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const saveDoc = () => {
    update((d) => ({
      ...d,
      documents: [
        { id: uid(), title: `${config.outTitle} — ${new Date().toLocaleDateString("pt-BR")}`, type: config.outTitle, content: out, businessId: d.selectedBusinessId || null, updatedAt: new Date().toISOString(), versions: [] },
        ...d.documents,
      ],
    }));
    setToast("Salvo em Documentos");
  };
  const saveTask = () => {
    update((d) => ({
      ...d,
      tasks: [
        { id: uid(), title: `${config.outTitle} — aplicar`, description: out.slice(0, 400), priority: "Média", status: "A fazer", due: "", area: config.specialist, businessId: d.selectedBusinessId || null },
        ...d.tasks,
      ],
    }));
    setToast("Tarefa criada a partir do resultado");
  };
  return (
    <Modal title={config.title} wide onClose={onClose}>
      <div className="modal-body">
        <div className="notice">
          <Icon />
          <span>{config.hint}</span>
        </div>
        <div className="form-grid">
          {config.fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.type === "textarea" ? (
                <textarea value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : f.type === "select" ? (
                <select value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              )}
            </Field>
          ))}
        </div>
        {err && (
          <div className="ask-error">
            <CircleAlert />
            {err}
          </div>
        )}
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button icon={busy && !out ? RefreshCw : Sparkles} disabled={busy} onClick={run}>
            {busy && !out ? "Gerando..." : out ? "Gerar de novo" : config.cta}
          </Button>
        </div>
        {out && (
          <div className="translate-out">
            <div className="translate-head">
              <span>{config.outTitle}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(out);
                  setToast("Copiado");
                }}
              >
                <Copy />
                Copiar
              </button>
            </div>
            <div className="translate-body">
              <Markdown text={out} />
            </div>
            <div className="tool-followup">
              <input
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); refine(); } }}
                placeholder="Tire uma dúvida ou peça um ajuste (ex.: deixe mais curto, mude o tom...)"
              />
              <Button icon={busy ? RefreshCw : Send} disabled={busy || !ask.trim()} onClick={refine}>
                {busy ? "..." : "Enviar"}
              </Button>
            </div>
            <div className="result-destinations">
              <Button
                variant="secondary"
                icon={FileText}
                onClick={() => saveOutput("document")}
              >
                Salvar documento
              </Button>
              <Button
                variant="secondary"
                icon={ListTodo}
                onClick={() => saveOutput("task")}
              >
                Criar tarefa
              </Button>
              <Button icon={Save} onClick={() => saveOutput("project")}>
                Salvar projeto
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ToolsHub({ db, update, business, setToast }) {
  const [smart, setSmart] = useState("");
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("Todas"),
    [emailOpen, setEmailOpen] = useState(false);
  const plugged = db.pluggedTools || [];
  const togglePlug = (id) => {
    const on = plugged.includes(id);
    update((d) => ({
      ...d,
      pluggedTools: on
        ? (d.pluggedTools || []).filter((x) => x !== id)
        : [...(d.pluggedTools || []), id],
    }));
    setToast(
      on ? "Ferramenta desconectada" : "Ferramenta plugada no seu painel",
    );
  };
  const categories = ["Todas", ...new Set(toolCatalog.map((x) => x.category))];
  const filtered = toolCatalog.filter(
    (x) =>
      (category === "Todas" || x.category === category) &&
      `${x.name} ${x.description} ${x.keywords}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <PageTitle
      eyebrow="CENTRAL DE FERRAMENTAS"
      title="Tudo conectado ao trabalho que precisa acontecer"
      text="Encontre a ferramenta certa, abra o serviço oficial e continue a execução sem ficar preso em uma tela sem saída."
      action={
        <Button icon={Mail} onClick={() => setEmailOpen(true)}>
          Escrever e-mail
        </Button>
      }
    >
      <section className="smart-tools">
        <div className="section-head">
          <div>
            <span className="eyebrow">FERRAMENTAS INTELIGENTES · GRÁTIS</span>
            <h2>Funções que trabalham por dentro do app</h2>
          </div>
        </div>
        <div className="smart-grid">
          <button className="smart-card" onClick={() => setSmart("translate")}>
            <span className="smart-icon g0">
              <Languages />
            </span>
            <div>
              <strong>Funcionário Bilíngue</strong>
              <small>
                Traduza textos, e-mails e propostas para 12 idiomas com IA.
              </small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("route")}>
            <span className="smart-icon g1">
              <Route />
            </span>
            <div>
              <strong>Roteirizador de entregas</strong>
              <small>
                Monte rotas com várias paradas e abra no Google Maps.
              </small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("price")}>
            <span className="smart-icon g2">
              <DollarSign />
            </span>
            <div>
              <strong>Calculadora de preço</strong>
              <small>
                Descubra o preço de venda ideal a partir dos seus custos.
              </small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("post")}>
            <span className="smart-icon g3">
              <Megaphone />
            </span>
            <div>
              <strong>Gerador de posts</strong>
              <small>Legendas com hashtags para as suas redes sociais.</small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("contract")}>
            <span className="smart-icon g4">
              <BriefcaseBusiness />
            </span>
            <div>
              <strong>Gerador de contrato</strong>
              <small>
                Minuta de prestação de serviços pronta para revisão.
              </small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("sales")}>
            <span className="smart-icon g5">
              <TrendingUp />
            </span>
            <div>
              <strong>Roteiro de vendas</strong>
              <small>Abordagem, objeções e follow-up para fechar mais.</small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("rh")}>
            <span className="smart-icon g6">
              <UserCog />
            </span>
            <div>
              <strong>Vaga e entrevista (RH)</strong>
              <small>Descrição de vaga e perguntas de entrevista.</small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("ops")}>
            <span className="smart-icon g7">
              <Workflow />
            </span>
            <div>
              <strong>Passo a passo (Operações)</strong>
              <small>Procedimento padrão com checklist para a equipe.</small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("support")}>
            <span className="smart-icon g8">
              <Headphones />
            </span>
            <div>
              <strong>Respostas de atendimento</strong>
              <small>Modelos com empatia para responder clientes.</small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("dados")}>
            <span className="smart-icon g9">
              <Filter />
            </span>
            <div>
              <strong>Análise de números (Dados)</strong>
              <small>Cole vendas e despesas e descubra padrões.</small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("ecommerce")}>
            <span className="smart-icon g10">
              <ShoppingBag />
            </span>
            <div>
              <strong>Descrição de produto</strong>
              <small>Anúncio otimizado para marketplace ou loja.</small>
            </div>
            <ArrowUpRight />
          </button>
          <button className="smart-card" onClick={() => setSmart("compras")}>
            <span className="smart-icon g11">
              <Boxes />
            </span>
            <div>
              <strong>Comparador de cotações</strong>
              <small>Compare fornecedores e saiba o que negociar.</small>
            </div>
            <ArrowUpRight />
          </button>
        </div>
      </section>
      <div className="tool-hero">
        <div>
          <span className="eyebrow light">REDIRECIONADOR INTELIGENTE</span>
          <h2>
            O Seu Funcionário faz o que pode aqui.
            <br />
            Quando não pode, leva você ao lugar certo.
          </h2>
        </div>
        <div className="search tool-search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex.: emitir nota fiscal, enviar e-mail, criar design..."
          />
        </div>
      </div>
      <div className="category-tabs">
        {categories.map((x) => (
          <button
            className={category === x ? "active" : ""}
            onClick={() => setCategory(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="tools-grid">
        {filtered.map((tool) => {
          const on = plugged.includes(tool.id);
          return (
            <article key={tool.id}>
              <button
                className={on ? "plug-toggle on" : "plug-toggle"}
                title={on ? "Desconectar" : "Plugar no meu painel"}
                onClick={() => togglePlug(tool.id)}
              >
                <Plug />
              </button>
              <span className="tool-icon">
                <DynamicIcon icon={tool.icon} />
              </span>
              <div>
                <span className="tag">{tool.category}</span>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <small>{toolBadgeLabel(tool)}</small>
              </div>
              <a href={tool.url} target="_blank" rel="noreferrer">
                Abrir ferramenta <ExternalLink />
              </a>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <Empty
          icon={Search}
          title="Nenhuma ferramenta encontrada"
          text="Tente buscar pelo objetivo, como nota fiscal, CRM, design ou agenda."
        />
      )}
      <section className="nf-guide">
        <span className="tool-icon">
          <ReceiptText />
        </span>
        <div>
          <span className="eyebrow">ATALHO FISCAL</span>
          <h2>Qual nota fiscal você precisa?</h2>
          <p>
            <strong>Prestação de serviços:</strong> use a NFS-e Nacional.{" "}
            <strong>Venda de produtos:</strong> use NF-e, como o emissor
            gratuito do Sebrae. Obrigações variam conforme atividade, município
            e regime; valide dúvidas tributárias com um contador.
          </p>
        </div>
        <div>
          <a
            href="https://www.gov.br/pt-br/servicos/emitir-nota-fiscal-de-servico-eletronica"
            target="_blank"
            rel="noreferrer"
          >
            Emitir NFS-e
          </a>
          <a
            href="https://emissornfe.sebrae.com.br/"
            target="_blank"
            rel="noreferrer"
          >
            Emitir NF-e
          </a>
        </div>
      </section>
      {emailOpen && (
        <EmailComposer
          onClose={() => setEmailOpen(false)}
          setToast={setToast}
        />
      )}
      {smart === "translate" && (
        <TranslatorModal onClose={() => setSmart("")} setToast={setToast} />
      )}
      {smart === "route" && (
        <RouterModal onClose={() => setSmart("")} setToast={setToast} />
      )}
      {aiTools[smart] && (
        <AIToolModal
          config={aiTools[smart]}
          db={db}
          onClose={() => setSmart("")}
          setToast={setToast}
          update={update}
          business={business}
        />
      )}
    </PageTitle>
  );
}

function CreativeStudio({ db, update, business, setToast }) {
  const [type, setType] = useState("logo"),
    [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0),
    [videoEnabled, setVideoEnabled] = useState(false);
  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((config) => setVideoEnabled(!!config.videoEnabled))
      .catch(() => setVideoEnabled(false));
  }, []);
  const items = (db.media || []).filter(
    (x) => !business || x.businessId === business.id,
  );
  useEffect(() => {
    let active = true;
    const savedVideos = items.filter(
      (item) => item.type === "video" && item.requestId,
    );
    if (!savedVideos.length) return () => {};
    Promise.all(
      savedVideos.map(async (item) => {
        const response = await fetch(
          `/api/media?request_id=${encodeURIComponent(item.requestId)}`,
          { headers: authHeaders() },
        );
        const status = await response.json().catch(() => ({}));
        return response.ok ? { id: item.id, ...status } : null;
      }),
    )
      .then((statuses) => {
        if (!active) return;
        const available = statuses.filter(Boolean);
        if (!available.length) return;
        update((current) => ({
          ...current,
          media: (current.media || []).map((item) => {
            const status = available.find((entry) => entry.id === item.id);
            if (!status) return item;
            return {
              ...item,
              status: status.status || item.status,
              url: status.url || item.url,
              duration: status.duration || item.duration,
            };
          }),
        }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // Consulta novamente sempre que o usuário volta ao estúdio ou troca de negócio.
  }, [business?.id]);
  const generate = async () => {
    if (prompt.trim().length < 5 || busy || (type === "video" && !videoEnabled))
      return;
    setBusy(true);
    setError("");
    setProgress(5);
    try {
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          type,
          prompt: prompt.trim(),
          quality: type === "video" ? "advanced" : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível gerar o material.");
      const item = {
        id: uid(),
        type,
        prompt: prompt.trim(),
        status: data.status,
        url: data.url || null,
        requestId: data.requestId || null,
        freeTier: !!data.freeTier,
        businessId: business?.id || null,
        createdAt: new Date().toISOString(),
      };
      update((d) => ({ ...d, media: [item, ...(d.media || [])] }));
      if (type === "video" && data.requestId) {
        let finished = false;
        for (let i = 0; i < 180; i++) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const check = await fetch(
              `/api/media?request_id=${encodeURIComponent(data.requestId)}`,
              { headers: authHeaders() },
            ),
            status = await check.json();
          if (!check.ok)
            throw new Error(
              status.error || "Não foi possível consultar a geração.",
            );
          setProgress(status.progress || Math.min(96, 8 + Math.round(i * 0.5)));
          if (status.status === "done" && status.url) {
            update((d) => ({
              ...d,
              media: (d.media || []).map((x) =>
                x.id === item.id
                  ? {
                      ...x,
                      status: "done",
                      url: status.url,
                      duration: status.duration,
                    }
                  : x,
              ),
            }));
            setToast("Vídeo generativo concluído");
            finished = true;
            break;
          }
          if (status.status === "failed" || status.status === "expired")
            throw new Error(
              status.error || "A geração do vídeo não foi concluída.",
            );
        }
        if (!finished)
          throw new Error(
            "A geração continua no servidor. Ela permanecerá na fila; tente consultar novamente em alguns minutos.",
          );
      } else
        setToast(
          data.freeTier
            ? type === "logo"
              ? "Logo criado na infraestrutura gratuita"
              : "Imagem criada na infraestrutura gratuita"
            : type === "logo"
              ? "Conceito de logo criado"
              : "Imagem criada",
        );
      setPrompt("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };
  const labels = {
    logo: {
      title: "Criador de logos",
      text: "Descreva nome, segmento, personalidade, cores e símbolos que devem ser evitados.",
      placeholder:
        "Ex.: Logo para uma confeitaria artesanal chamada Doce Norte, elegante, acolhedora, terracota e creme...",
    },
    image: {
      title: "Gerador de imagens",
      text: "Crie imagens para campanhas, sites, produtos e redes sociais.",
      placeholder:
        "Ex.: Fotografia editorial de uma mesa com bolos artesanais, luz natural suave...",
    },
    video: {
      title: "Gerador de vídeos",
      text: "Gere um vídeo curto de seis segundos a partir de uma descrição.",
      placeholder:
        "Ex.: Câmera se aproxima lentamente de uma vitrine de confeitaria ao amanhecer...",
    },
  }[type];
  const changeType = (next) => {
    setType(next);
    setError("");
  };
  return (
    <PageTitle
      eyebrow="ESTÚDIO CRIATIVO"
      title="Crie materiais visuais com IA"
      text="Logos e imagens usam a infraestrutura de IA disponível. Vídeo próprio só é liberado quando um servidor GPU é conectado."
    >
      <div className="studio-tabs">
        <button
          className={type === "logo" ? "active" : ""}
          onClick={() => changeType("logo")}
        >
          <Palette />
          Logos
        </button>
        <button
          className={type === "image" ? "active" : ""}
          onClick={() => changeType("image")}
        >
          <ImageIcon />
          Imagens
        </button>
        <button
          className={type === "video" ? "active" : ""}
          onClick={() => changeType("video")}
        >
          <Video />
          Vídeos
        </button>
      </div>
      <section className="studio-creator">
        <div className="studio-copy">
          <span className="spark-dot">
            <WandSparkles />
          </span>
          <h2>{labels.title}</h2>
          <p>{labels.text}</p>
          <div className="studio-points">
            <span>
              <CheckCircle2 />
              Prompt aprimorado automaticamente
            </span>
            <span>
              <CheckCircle2 />
              {type === "video"
                ? videoEnabled
                  ? "Geração de vídeo disponível"
                  : "Alternativa gratuita externa disponível"
                : "Geração visual gratuita quando disponível"}
            </span>
            <span>
              <ShieldCheck />
              Sem marcas ou depoimentos inventados
            </span>
          </div>
        </div>
        <div className="studio-form">
          <Field label="Descreva o que deseja criar">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 3000))}
              placeholder={labels.placeholder}
            />
          </Field>
          {type === "video" && (
            <>
              <div className="notice">
                <Video />
                <span>
                  {videoEnabled
                    ? "A geração acontece na nuvem, sem usar o seu computador."
                    : "A geração integrada ainda não está disponível. Use a alternativa gratuita abaixo; ela pode ter fila."}
                </span>
              </div>
              <a
                className="button secondary"
                href="https://huggingface.co/spaces/Lightricks/LTX-2-3"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} />
                <span>Abrir gerador de vídeo gratuito</span>
              </a>
              <small>
                Serviço externo gratuito, sujeito à disponibilidade e fila.
              </small>
            </>
          )}
          {error && (
            <div className="ask-error">
              <CircleAlert />
              {error}
            </div>
          )}
          <Button
            icon={busy ? RefreshCw : WandSparkles}
            disabled={
              busy ||
              prompt.trim().length < 5 ||
              (type === "video" && !videoEnabled)
            }
            onClick={generate}
          >
            {busy
              ? type === "video"
                ? `Gerando vídeo${progress ? ` · ${progress}%` : ""}`
                : "Criando..."
              : type === "video" && !videoEnabled
                ? "Servidor de vídeo indisponível"
                : "Gerar agora"}
          </Button>
        </div>
      </section>
      {items.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">CRIAÇÕES</span>
              <h2>Galeria do negócio</h2>
            </div>
          </div>
          <div className="media-grid">
            {items.map((item) => (
              <article key={item.id}>
                {item.status === "done" && item.url ? (
                  item.type === "video" ? (
                    <video controls src={item.url} />
                  ) : (
                    <img src={item.url} alt={item.prompt} />
                  )
                ) : (
                  <div className="media-pending">
                    <RefreshCw />
                    <span>Processando</span>
                  </div>
                )}
                <div>
                  <span className="tag">
                    {item.type === "logo"
                      ? "Logo"
                      : item.type === "image"
                        ? "Imagem"
                        : "Vídeo"}
                  </span>
                  <p>{item.prompt}</p>
                  <small>
                    {item.status === "done"
                      ? "Material concluído"
                      : "Em produção"}
                  </small>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                    >
                      Abrir e baixar <Download />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </PageTitle>
  );
}

function HistoryPage({ db, update, business, setToast, go }) {
  const [open, setOpen] = useState(null),
    [search, setSearch] = useState(""),
    [visibility, setVisibility] = useState("Ativos"),
    [typeFilter, setTypeFilter] = useState("Todos"),
    [rename, setRename] = useState(""),
    [busy, setBusy] = useState(false);
  const types = [
    ...new Set(db.history.map((item) => item.type).filter(Boolean)),
  ];
  const items = db.history.filter(
    (x) =>
      (!business || x.businessId === business.id) &&
      `${x.title} ${x.result || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (visibility === "Todos" ||
        (visibility === "Arquivados" ? !!x.archived : !x.archived)) &&
      (typeFilter === "Todos" || x.type === typeFilter),
  );
  const changeProject = (id, changes) =>
    update((d) => ({
      ...d,
      history: d.history.map((item) =>
        item.id === id
          ? { ...item, ...changes, updatedAt: new Date().toISOString() }
          : item,
      ),
    }));
  const openProject = (item) => {
    setOpen(item.id);
    setRename(item.title);
  };
  const duplicate = (item) => {
    const now = new Date().toISOString();
    update((d) => ({
      ...d,
      history: [
        {
          ...item,
          id: uid(),
          title: `${item.title} (cópia)`,
          createdAt: now,
          updatedAt: now,
          archived: false,
        },
        ...d.history,
      ],
    }));
    setToast("Projeto duplicado");
  };
  const continueProject = (item) => {
    const conversationId = uid();
    const now = new Date().toISOString();
    update((d) => ({
      ...d,
      selectedConversationId: conversationId,
      conversations: [
        {
          id: conversationId,
          title: item.title,
          businessId: item.businessId,
          specialist: item.specialist || "Diretor",
          createdAt: now,
          updatedAt: now,
          messages: [
            {
              id: uid(),
              role: "user",
              content: item.request || `Continue o projeto ${item.title}`,
              createdAt: item.createdAt || now,
            },
            {
              id: uid(),
              role: "assistant",
              content: item.result,
              createdAt: item.updatedAt || item.createdAt || now,
            },
          ],
        },
        ...(d.conversations || []),
      ],
    }));
    setOpen(null);
    go("inicio");
  };
  const refineProject = async (item) => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          specialist: item.specialist || "Diretor",
          prompt: `Revise e aprofunde o projeto abaixo. Preserve fatos e números fornecidos, elimine generalidades e acrescente próximas ações verificáveis. Entregue a versão final completa em Markdown.\n\n${item.result}`,
          business,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Falha ao refinar");
      changeProject(item.id, {
        result: data.content,
        versions: [
          {
            result: item.result,
            at: new Date().toISOString(),
          },
          ...(item.versions || []),
        ],
      });
      setToast("Projeto refinado; a versão anterior foi preservada");
    } catch (error) {
      setToast(error.message || "Não foi possível refinar agora");
    } finally {
      setBusy(false);
    }
  };
  const transform = (x, type) => {
    if (type === "task")
      update((d) => ({
        ...d,
        tasks: [
          {
            id: uid(),
            title: x.title,
            description: x.result.slice(0, 240),
            priority: "Média",
            status: "A fazer",
            due: "",
            area: "Estratégia",
            businessId: x.businessId,
          },
          ...d.tasks,
        ],
      }));
    else
      update((d) => ({
        ...d,
        documents: [
          {
            id: uid(),
            title: x.title,
            type: "Plano de ação",
            content: x.result,
            businessId: x.businessId,
            updatedAt: new Date().toISOString(),
            versions: [],
          },
          ...d.documents,
        ],
      }));
    setToast(type === "task" ? "Tarefa criada" : "Documento criado");
  };
  return (
    <PageTitle
      eyebrow="PROJETOS E HISTÓRICO"
      title="Tudo o que você escolheu guardar, pronto para continuar"
      text="As conversas ficam no chat; somente respostas que você salvar entram aqui."
    >
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar no histórico"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option>Todos</option>
          {types.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option>Ativos</option>
          <option>Arquivados</option>
          <option>Todos</option>
        </select>
      </div>
      {items.length === 0 ? (
        <Empty
          icon={History}
          title="Seu histórico está vazio"
          text="No chat, use “Salvar em projetos” apenas nas respostas que quiser manter aqui."
        />
      ) : (
        <div className="history-list">
          {items.map((x) => (
            <article key={x.id} onClick={() => openProject(x)}>
              <span className="doc-icon">
                <Sparkles />
              </span>
              <span>
                <span className="tag">{x.specialist}</span>
                <h3>{x.title}</h3>
                <small>
                  {new Date(x.createdAt).toLocaleString("pt-BR")} · {x.type}
                </small>
              </span>
              <span className="project-card-actions">
                <button
                  aria-label="Duplicar projeto"
                  onClick={(event) => {
                    event.stopPropagation();
                    duplicate(x);
                  }}
                >
                  <Copy />
                </button>
                <button
                  aria-label={
                    x.archived ? "Desarquivar projeto" : "Arquivar projeto"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    changeProject(x.id, { archived: !x.archived });
                  }}
                >
                  <Archive />
                </button>
              </span>
              <ChevronRight />
            </article>
          ))}
        </div>
      )}
      {open &&
        (() => {
          const x = db.history.find((i) => i.id === open);
          const rename = () => {
            const t = prompt("Novo nome para este item:", x.title);
            if (!t || !t.trim()) return;
            update((d) => ({ ...d, history: d.history.map((i) => (i.id === x.id ? { ...i, title: t.trim() } : i)) }));
            setToast("Renomeado");
          };
          const duplicate = () => {
            update((d) => ({ ...d, history: [{ ...x, id: uid(), title: `${x.title} (cópia)`, createdAt: new Date().toISOString() }, ...d.history] }));
            setToast("Duplicado");
          };
          const removeItem = () => {
            if (!confirm("Excluir este item do histórico?")) return;
            setOpen(null);
            update((d) => ({ ...d, history: d.history.filter((i) => i.id !== x.id) }));
            setToast("Excluído");
          };
          const continueChat = () => {
            const cid = uid();
            update((d) => ({
              ...d,
              selectedConversationId: cid,
              conversations: [
                { id: cid, title: x.title.slice(0, 55), businessId: x.businessId, specialist: x.specialist, createdAt: new Date().toISOString(), messages: [
                  { id: uid(), role: "user", content: x.request || x.title, createdAt: x.createdAt },
                  { id: uid(), role: "assistant", content: x.result, provider: x.provider, model: x.model, createdAt: new Date().toISOString() },
                ] },
                ...(d.conversations || []),
              ],
            }));
            setOpen(null);
            setToast("Conversa retomada — abra o Início para continuar de onde parou");
          };
          return (
            <Modal wide title={x.title} onClose={() => setOpen(null)}>
              <div className="result">
                <div className="project-title-editor">
                  <input
                    value={rename}
                    onChange={(e) => setRename(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    icon={Save}
                    disabled={!rename.trim() || rename.trim() === x.title}
                    onClick={() => {
                      changeProject(x.id, { title: rename.trim() });
                      setToast("Projeto renomeado");
                    }}
                  >
                    Renomear
                  </Button>
                </div>
                <div className="result-meta">
                  <span>
                    <Building2 />
                    {db.businesses.find((b) => b.id === x.businessId)?.name ||
                      "Sem negócio"}
                  </span>
                  <span>
                    <Sparkles />
                    {x.specialist}
                  </span>
                </div>
                <Markdown text={x.result} />
                {(x.versions || []).length > 0 && (
                  <small className="version-note">
                    {x.versions.length} versão(ões) anterior(es) preservada(s).
                  </small>
                )}
                <div className="modal-actions spread">
                  <Button
                    variant="ghost"
                    icon={Copy}
                    onClick={() => {
                      navigator.clipboard?.writeText(x.result);
                      setToast("Resultado copiado");
                    }}
                  >
                    Copiar
                  </Button>
                  <div>
                    <Button
                      variant="secondary"
                      icon={MessageSquareText}
                      onClick={() => continueProject(x)}
                    >
                      Continuar no chat
                    </Button>
                    <Button
                      variant="secondary"
                      icon={busy ? RefreshCw : WandSparkles}
                      disabled={busy}
                      onClick={() => refineProject(x)}
                    >
                      {busy ? "Refinando..." : "Refinar"}
                    </Button>
                    <Button
                      variant="secondary"
                      icon={ListTodo}
                      onClick={() => transform(x, "task")}
                    >
                      Virar tarefa
                    </Button>
                    <Button icon={FileText} onClick={() => transform(x, "doc")}>
                      Virar documento
                    </Button>
                    <Button
                      variant="ghost"
                      icon={Copy}
                      onClick={() => duplicate(x)}
                    >
                      Duplicar
                    </Button>
                    <Button
                      variant="ghost"
                      icon={Archive}
                      onClick={() => {
                        changeProject(x.id, { archived: !x.archived });
                        setOpen(null);
                      }}
                    >
                      {x.archived ? "Desarquivar" : "Arquivar"}
                    </Button>
                    <Button
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => {
                        if (!confirm("Excluir este projeto definitivamente?"))
                          return;
                        update((d) => ({
                          ...d,
                          history: d.history.filter((item) => item.id !== x.id),
                        }));
                        setOpen(null);
                        setToast("Projeto excluído");
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
                <div className="modal-actions history-extra">
                  <Button variant="secondary" icon={MessageSquareText} onClick={continueChat}>
                    Continuar no chat
                  </Button>
                  <Button variant="ghost" icon={Edit3} onClick={rename}>
                    Renomear
                  </Button>
                  <Button variant="ghost" icon={Copy} onClick={duplicate}>
                    Duplicar
                  </Button>
                  <Button variant="ghost" icon={Trash2} onClick={removeItem}>
                    Excluir
                  </Button>
                </div>
              </div>
            </Modal>
          );
        })()}
    </PageTitle>
  );
}

function certificateDocument(cert) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(cert.title)}</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#eee;font-family:Arial,sans-serif;color:#18142b}.sheet{width:297mm;height:210mm;margin:auto;background:#fff;padding:13mm;position:relative;overflow:hidden}.frame{height:100%;border:2px solid #2b2051;padding:8mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative}.frame:before,.frame:after{content:'';position:absolute;width:100mm;height:100mm;border-radius:50%;filter:blur(2px);opacity:.12}.frame:before{background:#6d38e0;left:-50mm;top:-55mm}.frame:after{background:#ed3e91;right:-48mm;bottom:-58mm}.mark{width:18mm;height:18mm;border-radius:5mm;background:linear-gradient(135deg,#6d38e0,#ed3e91);color:white;display:grid;place-items:center;font-size:9mm;font-weight:bold;margin-bottom:5mm}.issuer{font-size:4mm;letter-spacing:.16em;text-transform:uppercase;font-weight:bold;color:#6d38e0}.sub{font-size:3.1mm;color:#665f75;margin-top:2mm}.rule{width:35mm;height:.6mm;background:linear-gradient(90deg,#6d38e0,#ed3e91);margin:6mm}.label{font-size:3.5mm;color:#665f75}.name{font-family:Georgia,serif;font-size:12mm;margin:4mm 0;color:#211846}.text{font-size:4mm;line-height:1.6;max-width:205mm;color:#413a50}.title{font-size:7mm;font-weight:bold;color:#6d38e0;margin:3mm 0}.footer{display:flex;gap:24mm;margin-top:10mm}.footer div{min-width:55mm;border-top:.4mm solid #aaa;padding-top:2mm;font-size:3.2mm}.code{position:absolute;bottom:6mm;font-size:2.8mm;color:#777}.note{position:absolute;left:10mm;bottom:5mm;font-size:2.5mm;color:#888;max-width:65mm;text-align:left}@media print{body{background:#fff}.sheet{margin:0}}</style></head><body><main class="sheet"><section class="frame"><div class="mark">P</div><div class="issuer">Academia Praxis</div><div class="sub">Competências Aplicadas para Negócios</div><div class="rule"></div><div class="label">CERTIFICADO DE COMPETÊNCIA PRÁTICA</div><h1 class="name">${escapeHtml(cert.name)}</h1><div class="text">concluiu os marcos verificáveis da trilha e demonstrou competência aplicada em</div><h2 class="title">${escapeHtml(cert.title)}</h2><div class="text">por estruturar briefing e conteúdo, personalizar a experiência, validar a responsividade e concluir a publicação de um projeto funcional.</div><div class="footer"><div><strong>${new Date(cert.issuedAt).toLocaleDateString("pt-BR")}</strong><br>Data de emissão</div><div><strong>Academia Praxis</strong><br>Unidade formativa</div></div><div class="note">Programa formativo integrado ao aplicativo Seu Funcionário. Certificado de realização prática; não equivale a diploma acadêmico ou habilitação profissional regulamentada.</div><div class="code">Credencial ${escapeHtml(cert.code)} · Projeto: ${escapeHtml(cert.projectName)}</div></section></main></body></html>`;
}

function CertificateView({ cert, onClose }) {
  const download = () => {
    const blob = new Blob([certificateDocument(cert)], {
        type: "text/html;charset=utf-8",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `certificado-${slugify(cert.name)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(certificateDocument(cert));
    w.document.close();
    setTimeout(() => w.print(), 350);
  };
  return (
    <Modal wide title="Sua credencial" onClose={onClose}>
      <div className="certificate">
        <div className="certificate-inner">
          <div className="praxis-mark">P</div>
          <span className="praxis-name">ACADEMIA PRAXIS</span>
          <small>Competências Aplicadas para Negócios</small>
          <i />
          <span className="certificate-label">
            CERTIFICADO DE COMPETÊNCIA PRÁTICA
          </span>
          <h2>{cert.name}</h2>
          <p>
            concluiu os marcos verificáveis da trilha e demonstrou competência
            aplicada em
          </p>
          <h3>{cert.title}</h3>
          <p>
            por estruturar briefing e conteúdo, personalizar a experiência,
            validar a responsividade e concluir a publicação de um projeto
            funcional.
          </p>
          <div className="certificate-signatures">
            <span>
              <strong>
                {new Date(cert.issuedAt).toLocaleDateString("pt-BR")}
              </strong>
              <small>Data de emissão</small>
            </span>
            <span>
              <strong>Academia Praxis</strong>
              <small>Unidade formativa</small>
            </span>
          </div>
          <code>
            Credencial {cert.code} · Projeto: {cert.projectName}
          </code>
        </div>
      </div>
      <div className="certificate-disclaimer">
        <ShieldCheck />
        <span>
          Programa formativo integrado ao Seu Funcionário. Esta credencial
          comprova a conclusão de atividades práticas dentro da plataforma; não
          é diploma acadêmico nem habilitação regulamentada.
        </span>
      </div>
      <div className="modal-actions">
        <Button variant="ghost" icon={Printer} onClick={print}>
          Imprimir ou salvar em PDF
        </Button>
        <Button icon={Download} onClick={download}>
          Baixar certificado
        </Button>
      </div>
    </Modal>
  );
}

function Certifications({ db, update, business, setToast, go }) {
  const relevant = db.sites.filter(
    (x) => !business || x.businessId === business.id,
  );
  const ranked = [...relevant].sort(
    (a, b) =>
      websiteMilestones(b).filter((x) => x.done).length -
      websiteMilestones(a).filter((x) => x.done).length,
  );
  const [siteId, setSiteId] = useState(ranked[0]?.id || "");
  const [view, setView] = useState(null);
  const site = relevant.find((x) => x.id === siteId) || ranked[0];
  const milestones = websiteMilestones(site),
    done = milestones.filter((x) => x.done).length,
    complete = done === milestones.length;
  const issued = db.certificates.find(
    (x) => x.track === "website-no-code" && x.projectId === site?.id,
  );
  const issue = () => {
    if (!complete || issued) return;
    const cert = {
      id: uid(),
      track: "website-no-code",
      projectId: site.id,
      projectName: site.name,
      name: db.user.name,
      title: "Competência Aplicada em Criação de Websites No-Code",
      issuedAt: new Date().toISOString(),
      code: `PRX-WEB-${new Date().getFullYear()}-${site.id.slice(0, 8).toUpperCase()}`,
    };
    update((d) => ({ ...d, certificates: [cert, ...(d.certificates || [])] }));
    setView(cert);
    setToast("Certificado emitido pela Academia Praxis");
  };
  const certs = db.certificates || [];
  return (
    <PageTitle
      eyebrow="ACADEMIA PRAXIS"
      title="Competências que você consegue demonstrar"
      text="As credenciais são liberadas por evidências do trabalho realizado — não por tempo de uso ou cliques aleatórios."
    >
      <div className="issuer-banner">
        <div className="praxis-mark">P</div>
        <div>
          <span className="eyebrow">UNIDADE FORMATIVA DO SEU FUNCIONÁRIO</span>
          <h2>Academia Praxis</h2>
          <p>Competências Aplicadas para Negócios</p>
        </div>
        <BadgeCheck />
      </div>
      <section className="cert-track">
        <div className="track-head">
          <span className="track-icon">
            <Globe2 />
          </span>
          <div>
            <span className="tag">TRILHA PRÁTICA</span>
            <h2>Criação de Websites No-Code</h2>
            <p>
              Da definição do objetivo à publicação de uma página funcional.
            </p>
          </div>
          <div className="track-score">
            <strong>
              {done}/{milestones.length}
            </strong>
            <small>marcos</small>
          </div>
        </div>
        {relevant.length > 1 && (
          <Field label="Projeto avaliado">
            <select
              value={site?.id || ""}
              onChange={(e) => setSiteId(e.target.value)}
            >
              {relevant.map((x) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="milestone-list">
          {milestones.map((m, i) => (
            <div className={m.done ? "done" : ""} key={m.id}>
              <span>{m.done ? <CheckCircle2 /> : <LockKeyhole />}</span>
              <div>
                <small>Marco {i + 1}</small>
                <strong>{m.title}</strong>
                <p>{m.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="track-footer">
          <div>
            <div className="meter">
              <span style={{ width: `${(done / milestones.length) * 100}%` }} />
            </div>
            <small>
              {complete
                ? "Todos os critérios foram comprovados."
                : `Faltam ${milestones.length - done} marcos para liberar a credencial.`}
            </small>
          </div>
          {!site ? (
            <Button icon={Globe2} onClick={() => go("sites")}>
              Criar primeiro site
            </Button>
          ) : issued ? (
            <Button icon={Award} onClick={() => setView(issued)}>
              Ver certificado
            </Button>
          ) : (
            <Button icon={GraduationCap} disabled={!complete} onClick={issue}>
              Emitir certificado
            </Button>
          )}
        </div>
      </section>
      {certs.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">CREDENCIAIS EMITIDAS</span>
              <h2>Meus certificados</h2>
            </div>
          </div>
          <div className="credential-grid">
            {certs.map((c) => (
              <button key={c.id} onClick={() => setView(c)}>
                <span>
                  <Award />
                </span>
                <div>
                  <strong>{c.title}</strong>
                  <small>
                    {new Date(c.issuedAt).toLocaleDateString("pt-BR")} ·{" "}
                    {c.code}
                  </small>
                </div>
                <ChevronRight />
              </button>
            ))}
          </div>
        </section>
      )}
      {view && <CertificateView cert={view} onClose={() => setView(null)} />}
    </PageTitle>
  );
}

function Businesses({ db, update, setToast }) {
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null);
  const save = (b) => {
    update((d) => {
      const exists = d.businesses.some((x) => x.id === b.id);
      return {
        ...d,
        businesses: exists
          ? d.businesses.map((x) => (x.id === b.id ? b : x))
          : [b, ...d.businesses],
        selectedBusinessId: b.id,
      };
    });
    setModal(false);
    setToast("Perfil do negócio salvo");
  };
  return (
    <PageTitle
      eyebrow="PERFIS DE NEGÓCIO"
      title="Seus negócios"
      text="Mantenha cada contexto separado e alterne quando precisar."
      action={
        <Button
          icon={Plus}
          onClick={() => {
            setEditing(null);
            setModal(true);
          }}
        >
          Novo negócio
        </Button>
      }
    >
      <div className="business-grid">
        {db.businesses.map((b) => (
          <article
            className={db.selectedBusinessId === b.id ? "selected" : ""}
            key={b.id}
          >
            <div>
              <span className="business-avatar">{b.name[0]}</span>
              {db.selectedBusinessId === b.id && (
                <span className="selected-badge">
                  <Check />
                  Selecionado
                </span>
              )}
            </div>
            <h3>{b.name}</h3>
            <p>{b.segment || "Segmento não informado"}</p>
            <small>{b.stage}</small>
            <footer>
              <Button
                variant="ghost"
                onClick={() => update({ ...db, selectedBusinessId: b.id })}
              >
                Usar este
              </Button>
              <button
                className="icon-button"
                onClick={() => {
                  setEditing(b);
                  setModal(true);
                }}
              >
                <Edit3 />
              </button>
              <button
                className="icon-button danger"
                onClick={() => {
                  if (
                    confirm(
                      `Excluir ${b.name}? Os itens vinculados não serão apagados.`,
                    )
                  )
                    update((d) => ({
                      ...d,
                      businesses: d.businesses.filter((x) => x.id !== b.id),
                      selectedBusinessId:
                        d.selectedBusinessId === b.id
                          ? d.businesses.find((x) => x.id !== b.id)?.id || null
                          : d.selectedBusinessId,
                    }));
                }}
              >
                <Trash2 />
              </button>
            </footer>
          </article>
        ))}
      </div>
      {db.businesses.length === 0 && (
        <Empty
          icon={Building2}
          title="Nenhum negócio cadastrado"
          text="Crie um perfil para personalizar ferramentas e organizar os dados."
          action="Criar negócio"
          onAction={() => setModal(true)}
        />
      )}{" "}
      {modal && (
        <Modal
          wide
          title={editing ? "Editar negócio" : "Criar negócio"}
          onClose={() => setModal(false)}
        >
          <BusinessForm
            value={editing}
            onSave={save}
            onClose={() => setModal(false)}
          />
        </Modal>
      )}
    </PageTitle>
  );
}

function PublicSite({ site, page = "" }) {
  const selectedPage = site?.pages?.find((item) => item.slug === page);
  if (!site || !site.published || (page && !selectedPage))
    return (
      <main className="public-missing">
        <Logo />
        <CircleAlert />
        <h1>Esta página não está disponível</h1>
        <p>O endereço pode estar incorreto ou o site foi despublicado.</p>
      </main>
    );
  return (
    <iframe
      className="public-frame"
      sandbox="allow-forms allow-popups allow-top-navigation-by-user-activation"
      title={site.name}
      srcDoc={selectedPage?.html || site.html}
    />
  );
}

function switchSpace(id, name) {
  try {
    if (id) {
      localStorage.setItem("sf-space", id);
      localStorage.setItem("sf-space-name", name || "Espaço compartilhado");
    } else {
      localStorage.removeItem("sf-space");
      localStorage.removeItem("sf-space-name");
    }
  } catch {}
  location.reload();
}

function Collaborators({ setToast }) {
  const [data, setData] = useState({ members: [], spaces: [] });
  const [code, setCode] = useState(""),
    [invite, setInvite] = useState(""),
    [joining, setJoining] = useState(false);
  const active = activeSpaceId();
  const load = () =>
    fetch("/api/collab", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const createInvite = async () => {
    try {
      const r = await fetch("/api/collab/invite", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Falha ao criar convite");
      setInvite(d.code);
      setToast("Convite criado — compartilhe o link");
    } catch (e) {
      setToast(e.message);
    }
  };
  const join = async () => {
    const c = code.trim();
    if (c.length < 4) return;
    setJoining(true);
    try {
      const r = await fetch("/api/collab/join", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ code: c }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não foi possível entrar");
      setCode("");
      load();
      setToast(`Você entrou no espaço de ${d.ownerName}`);
    } catch (e) {
      setToast(e.message);
    } finally {
      setJoining(false);
    }
  };
  const remove = async (id) => {
    if (!confirm("Remover esta pessoa do seu espaço?")) return;
    await fetch("/api/collab/remove", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ memberId: id }),
    }).catch(() => {});
    load();
    setToast("Colaborador removido");
  };
  const inviteLink = invite ? `${location.origin}/?convite=${invite}` : "";
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">PESSOAS</span>
          <h2>Convide colaboradores reais</h2>
        </div>
      </div>
      <div className="collab-grid">
        <div className="collab-card">
          <h3>
            <UserRound />
            Convidar para o meu espaço
          </h3>
          <p>
            Quem entrar com o convite vê e edita os mesmos projetos, tarefas e
            clientes.
          </p>
          <Button icon={Plus} onClick={createInvite}>
            Gerar convite
          </Button>
          {invite && (
            <div className="invite-box">
              <span>
                Código <strong>{invite}</strong> · válido por 7 dias
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink);
                  setToast("Link copiado");
                }}
              >
                <Copy />
                Copiar link do convite
              </button>
            </div>
          )}
          {data.members.length > 0 && (
            <div className="member-list">
              <small className="member-title">No seu espaço</small>
              {data.members.map((m) => (
                <div key={m.id}>
                  <span className="avatar">{m.name[0]}</span>
                  <span>
                    <strong>{m.name}</strong>
                    <small>{m.email}</small>
                  </span>
                  <button
                    className="icon-button danger"
                    title="Remover"
                    onClick={() => remove(m.id)}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="collab-card">
          <h3>
            <Layers />
            Espaços de trabalho
          </h3>
          <p>
            Entre com um código recebido e alterne entre o seu espaço e os
            compartilhados.
          </p>
          <div className="join-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Código do convite"
              maxLength={16}
            />
            <Button
              icon={ArrowUpRight}
              disabled={joining || code.trim().length < 4}
              onClick={join}
            >
              {joining ? "..." : "Entrar"}
            </Button>
          </div>
          <div className="space-list">
            <button
              className={!active ? "active" : ""}
              onClick={() => switchSpace("")}
            >
              <span className="business-avatar small">
                <Building2 />
              </span>
              <span>
                <strong>Meu espaço</strong>
                <small>Seus próprios projetos</small>
              </span>
              {!active && <Check />}
            </button>
            {data.spaces.map((s) => (
              <button
                key={s.ownerId}
                className={active === s.ownerId ? "active" : ""}
                onClick={() => switchSpace(s.ownerId, s.ownerName)}
              >
                <span className="business-avatar small">{s.ownerName[0]}</span>
                <span>
                  <strong>{s.ownerName}</strong>
                  <small>{s.ownerEmail}</small>
                </span>
                {active === s.ownerId && <Check />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Team({ db, update, setToast }) {
  const [newEmployee, setNewEmployee] = useState(false);
  const active = db.preferences.specialist;
  const select = (name) => {
    update((d) => ({
      ...d,
      preferences: { ...d.preferences, specialist: name },
    }));
    setToast(`${name} agora está no comando`);
  };
  const dismiss = (name) => {
    if (
      !confirm(
        `Dispensar o funcionário de ${name}? O histórico de conversas é mantido.`,
      )
    )
      return;
    update((d) => ({
      ...d,
      customSpecialists: (d.customSpecialists || []).filter(
        (x) => x.name !== name,
      ),
      preferences: {
        ...d.preferences,
        specialist:
          d.preferences.specialist === name
            ? "Diretor"
            : d.preferences.specialist,
      },
    }));
    setToast("Funcionário dispensado");
  };
  return (
    <PageTitle
      eyebrow="MEU TIME"
      title="Monte a sua equipe digital"
      text="Escolha quem assume cada conversa. Contrate especialistas sob medida para o seu negócio a qualquer momento."
      action={
        <Button icon={Plus} onClick={() => setNewEmployee(true)}>
          Contratar funcionário
        </Button>
      }
    >
      <div className="team-hero">
        <span className="team-hero-icon">
          <Bot />
        </span>
        <div>
          <span className="eyebrow light">FUNCIONÁRIO ATIVO</span>
          <h2>{active}</h2>
          <p>
            {specialistData.find((s) => s[0] === active)?.[2] ||
              (db.customSpecialists || []).find((x) => x.name === active)
                ?.instructions ||
              "Especialista sob medida do seu time."}
          </p>
        </div>
      </div>
      <Collaborators setToast={setToast} />
      {(db.customSpecialists || []).length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">CONTRATADOS POR VOCÊ</span>
              <h2>Funcionários sob medida</h2>
            </div>
          </div>
          <div className="team-grid">
            {db.customSpecialists.map((c) => (
              <article
                className={active === c.name ? "active" : ""}
                key={c.name}
              >
                <span className="team-avatar custom">
                  <Sparkle />
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <small>{c.instructions}</small>
                </div>
                <div className="team-actions">
                  <button
                    className={active === c.name ? "chip on" : "chip"}
                    onClick={() => select(c.name)}
                  >
                    {active === c.name ? (
                      <>
                        <Check />
                        No comando
                      </>
                    ) : (
                      "Colocar no comando"
                    )}
                  </button>
                  <button
                    className="icon-button danger"
                    title="Dispensar"
                    onClick={() => dismiss(c.name)}
                  >
                    <Trash2 />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">EQUIPE PADRÃO</span>
            <h2>{specialistData.length} especialistas sempre disponíveis</h2>
          </div>
        </div>
        <div className="team-grid">
          {specialistData.map(([n, I, d], i) => (
            <article className={active === n ? "active" : ""} key={n}>
              <span className={`team-avatar t${i % 6}`}>
                <I />
              </span>
              <div>
                <strong>{n}</strong>
                <small>{d}</small>
              </div>
              <button
                className={active === n ? "chip on" : "chip"}
                onClick={() => select(n)}
              >
                {active === n ? (
                  <>
                    <Check />
                    No comando
                  </>
                ) : (
                  "Colocar no comando"
                )}
              </button>
            </article>
          ))}
        </div>
      </section>
      {newEmployee && (
        <NewEmployeeModal
          onClose={() => setNewEmployee(false)}
          onSave={(emp) => {
            update((d) => ({
              ...d,
              customSpecialists: [
                ...(d.customSpecialists || []).filter(
                  (x) => x.name !== emp.name,
                ),
                emp,
              ],
              preferences: { ...d.preferences, specialist: emp.name },
            }));
            setNewEmployee(false);
            setToast(`Funcionário de ${emp.name} contratado`);
          }}
        />
      )}
    </PageTitle>
  );
}

function AccountSettings({ db, update, setToast }) {
  const [name, setName] = useState(db.user.name);
  const [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const theme = db.preferences.theme;
  const setTheme = (t) =>
    update((d) => ({ ...d, preferences: { ...d.preferences, theme: t } }));
  const saveName = async () => {
    const clean = name.trim();
    if (clean.length < 2) {
      setErr("Informe um nome válido.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: clean }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Não foi possível salvar.");
      update((d) => ({ ...d, user: { ...d.user, name: data.user.name } }));
      setToast("Nome atualizado");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const exportData = () => {
    const { user, spaceKey, ...rest } = db;
    const blob = new Blob([JSON.stringify(rest, null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "seu-funcionario-dados.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setToast("Dados exportados");
  };
  const plugged = (db.pluggedTools || []).length;
  return (
    <PageTitle
      eyebrow="CONFIGURAÇÕES"
      title="Sua conta"
      text="Gerencie seu perfil, a aparência do aplicativo e seus dados."
    >
      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <UserRound />
            </span>
            <div>
              <h2>Perfil</h2>
              <p>Como você aparece no aplicativo.</p>
            </div>
          </div>
          <Field label="Seu nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label="E-mail">
            <input value={db.user.email} readOnly className="readonly" />
          </Field>
          {err && (
            <div className="ask-error">
              <CircleAlert />
              {err}
            </div>
          )}
          <div className="settings-actions">
            <Button
              icon={Save}
              disabled={busy || name.trim() === db.user.name}
              onClick={saveName}
            >
              {busy ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <Palette />
            </span>
            <div>
              <h2>Aparência</h2>
              <p>Escolha o tema do aplicativo.</p>
            </div>
          </div>
          <div className="theme-choice">
            <button
              className={theme === "light" ? "active" : ""}
              onClick={() => setTheme("light")}
            >
              <span className="theme-preview light">
                <Sun />
              </span>
              <strong>Claro</strong>
              {theme === "light" && <CheckCircle2 className="theme-check" />}
            </button>
            <button
              className={theme === "dark" ? "active" : ""}
              onClick={() => setTheme("dark")}
            >
              <span className="theme-preview dark">
                <Moon />
              </span>
              <strong>Escuro</strong>
              {theme === "dark" && <CheckCircle2 className="theme-check" />}
            </button>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <Layers />
            </span>
            <div>
              <h2>Time e ferramentas</h2>
              <p>Atalhos para configurar seu espaço.</p>
            </div>
          </div>
          <div className="settings-links">
            <div className="settings-stat">
              <Bot />
              <span>
                <strong>{(db.customSpecialists || []).length}</strong>{" "}
                funcionários contratados
              </span>
            </div>
            <div className="settings-stat">
              <Plug />
              <span>
                <strong>{plugged}</strong> ferramentas plugadas
              </span>
            </div>
            <div className="settings-stat">
              <Building2 />
              <span>
                <strong>{db.businesses.length}</strong> negócios cadastrados
              </span>
            </div>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <ShieldCheck />
            </span>
            <div>
              <h2>Dados e segurança</h2>
              <p>Seus projetos são sincronizados com a sua conta.</p>
            </div>
          </div>
          <div className="settings-actions col">
            <Button variant="secondary" icon={Download} onClick={exportData}>
              Exportar meus dados
            </Button>
            <Button
              variant="ghost"
              icon={LogOut}
              onClick={() => {
                if (confirm("Encerrar esta sessão?")) {
                  endSession();
                  update(() => cleanDb(null));
                }
              }}
            >
              Sair da conta
            </Button>
          </div>
          <p className="settings-note">
            <ShieldCheck />A recuperação de senha por código de e-mail está
            disponível na tela de login.
          </p>
        </section>
      </div>
    </PageTitle>
  );
}

export default function App() {
  const savedUi = (() => {
    try {
      return JSON.parse(localStorage.getItem("sf-ui") || "{}");
    } catch {
      return {};
    }
  })();
  const [db, update] = useDatabase(),
    [page, setPage] = useState("inicio"),
    [collapsed, setCollapsed] = useState(!!savedUi.collapsed),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState(""),
    [businessMenu, setBusinessMenu] = useState(false);
  const [menuHidden, setMenuHidden] = useState(!!savedUi.menuHidden);
  const [sbw, setSbw] = useState(
    Math.min(380, Math.max(210, savedUi.sbw || 266)),
  );
  useEffect(() => {
    try {
      localStorage.setItem(
        "sf-ui",
        JSON.stringify({ collapsed, menuHidden, sbw }),
      );
    } catch {}
  }, [collapsed, menuHidden, sbw]);
  const startResize = (e) => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    const move = (ev) => setSbw(Math.min(380, Math.max(210, ev.clientX)));
    const up = () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  };
  useEffect(() => {
    document.documentElement.dataset.theme = db.preferences.theme;
  }, [db.preferences.theme]);
  useEffect(() => {
    if (!db.user) return;
    const m = location.search.match(/[?&]convite=([^&]+)/);
    if (!m) return;
    const code = decodeURIComponent(m[1]);
    history.replaceState({}, "", location.pathname);
    fetch("/api/collab/join", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.ownerId) setToast(`Você entrou no espaço de ${d.ownerName}`);
        else if (d && d.error) setToast(d.error);
      })
      .catch(() => {});
  }, [db.user]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2400);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const publicMatch = location.pathname.match(/^\/s\/([^/]+)(?:\/([^/]+))?/);
  const publicSlug = publicMatch?.[1];
  if (publicSlug)
    return (
      <PublicSite
        site={db.sites.find((x) => x.slug === publicSlug)}
        page={publicMatch?.[2] || ""}
      />
    );
  if (!db.user) return <Login update={update} />;
  const business =
    db.businesses.find((x) => x.id === db.selectedBusinessId) ||
    db.businesses[0] ||
    null;
  const go = (p) => {
    setPage(p);
    setMobile(false);
  };
  const content = () => {
    switch (page) {
      case "inicio":
        return (
          <Dashboard
            db={db}
            update={update}
            business={business}
            go={go}
            setToast={setToast}
          />
        );
      case "comecar":
        return <Journeys db={db} update={update} go={go} />;
      case "estrategia":
      case "marketing":
        return (
          <Specialists
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
            area={page}
          />
        );
      case "vendas":
        return (
          <CRM
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
          />
        );
      case "financeiro":
        return (
          <Finance
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
          />
        );
      case "operacao":
        return (
          <Tasks
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
          />
        );
      case "sites":
        return (
          <Sites
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
          />
        );
      case "documentos":
        return (
          <Documents
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
          />
        );
      case "ferramentas":
        return (
          <ToolsHub
            db={db}
            update={update}
            business={business}
            setToast={setToast}
          />
        );
      case "time":
        return <Team db={db} update={update} setToast={setToast} />;
      case "config":
        return <AccountSettings db={db} update={update} setToast={setToast} />;
      case "estudio":
        return (
          <CreativeStudio
            db={db}
            update={update}
            business={business}
            setToast={setToast}
          />
        );
      case "historico":
        return (
          <HistoryPage
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
          />
        );
      case "certificacoes":
        return (
          <Certifications
            db={db}
            update={update}
            business={business}
            setToast={setToast}
            go={go}
          />
        );
      case "businesses":
        return <Businesses db={db} update={update} setToast={setToast} />;
      default:
        return null;
    }
  };
  return (
    <div
      className={`app ${collapsed ? "collapsed" : ""} ${menuHidden ? "menu-hidden" : ""}`}
      style={{ "--sbw": `${sbw}px` }}
    >
      <aside className={mobile ? "open" : ""}>
        <div className="side-top">
          <Logo compact={collapsed} />
          <button
            className="icon-button mobile-close"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([id, label, I]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
              title={collapsed ? label : undefined}
            >
              <I />
              <span>{label}</span>
            </button>
          ))}
          <div className="nav-divider" />
          {navSecondary.map(([id, label, I]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
              title={collapsed ? label : undefined}
            >
              <I />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button
            onClick={() =>
              update((d) => ({
                ...d,
                preferences: {
                  ...d.preferences,
                  theme: d.preferences.theme === "light" ? "dark" : "light",
                },
              }))
            }
          >
            {db.preferences.theme === "light" ? <Moon /> : <Sun />}
            <span>
              {db.preferences.theme === "light" ? "Modo escuro" : "Modo claro"}
            </span>
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Encerrar esta sessão? Seus projetos continuarão protegidos na sua conta.",
                )
              ) {
                endSession();
                update(() => cleanDb(null));
              }
            }}
          >
            <LogOut />
            <span>Sair</span>
          </button>
          <div className="side-controls">
            <button
              className="icon-button desktop-collapse"
              title={collapsed ? "Expandir menu" : "Modo compacto"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
            <button
              className="icon-button desktop-close"
              title="Fechar menu"
              onClick={() => setMenuHidden(true)}
            >
              <X />
            </button>
          </div>
        </div>
        <div className="sb-resize" onPointerDown={startResize} />
      </aside>
      {mobile && (
        <div className="mobile-overlay" onClick={() => setMobile(false)} />
      )}
      <main className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          {menuHidden && (
            <button
              className="icon-button desktop-open"
              title="Abrir menu"
              onClick={() => setMenuHidden(false)}
            >
              <Menu />
            </button>
          )}
          <div className="top-business">
            <span>Negócio ativo</span>
            <button onClick={() => setBusinessMenu(!businessMenu)}>
              <span className="business-avatar small">
                {business?.name?.[0] || "+"}
              </span>
              <strong>{business?.name || "Criar negócio"}</strong>
              <ChevronRight className={businessMenu ? "rotated" : ""} />
            </button>
            {businessMenu && (
              <div className="business-popover">
                {db.businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      update((d) => ({ ...d, selectedBusinessId: b.id }));
                      setBusinessMenu(false);
                    }}
                  >
                    <span className="business-avatar small">{b.name[0]}</span>
                    <span>
                      <strong>{b.name}</strong>
                      <small>{b.segment || "Sem segmento"}</small>
                    </span>
                    {business?.id === b.id && <Check />}
                  </button>
                ))}
                <button
                  className="manage"
                  onClick={() => {
                    go("businesses");
                    setBusinessMenu(false);
                  }}
                >
                  <Building2 />
                  Gerenciar negócios
                </button>
              </div>
            )}
          </div>
          <div className="top-actions">
            {activeSpaceId() && (
              <button
                className="space-badge"
                onClick={() => switchSpace("")}
                title="Voltar ao meu espaço"
              >
                <Users />
                <span>
                  {localStorage.getItem("sf-space-name") ||
                    "Espaço compartilhado"}
                </span>
                <X />
              </button>
            )}
            <button
              className="icon-button"
              onClick={() =>
                update((d) => ({
                  ...d,
                  preferences: {
                    ...d.preferences,
                    theme: d.preferences.theme === "light" ? "dark" : "light",
                  },
                }))
              }
            >
              {db.preferences.theme === "light" ? <Moon /> : <Sun />}
            </button>
            <button className="user-chip" onClick={() => go("config")}>
              <span>{db.user.name[0]}</span>
              <div>
                <strong>{db.user.name}</strong>
                <small>{db.user.email}</small>
              </div>
            </button>
          </div>
        </header>
        <div className="page">{content()}</div>
      </main>
      <Toast toast={toast} />
    </div>
  );
}
