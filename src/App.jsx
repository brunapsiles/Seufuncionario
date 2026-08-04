import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  uid,
  today,
  contactLinks,
  DEFAULT_LEVELS,
  computeUserPoints,
  levelForPoints,
  levelProgress,
  computeAchievements,
  computeMyWork,
  recurringStatus,
  buildRecurringTransaction,
  buildRecurringPostings,
  buildRecurringReminder,
  parseDeckSlides,
  parseContentPlan,
  scheduleContentDates,
  parseSheet,
  buildCsv,
  parseAnalysis,
  parseMindMap,
  DOCUMENT_TEMPLATES,
  fillDocTemplate,
  makeSignature,
  verifySignature,
  signatureStatus,
  signatureBlockText,
  buildEmailSignature,
  buildPixCode,
  DB_FIELD_TYPES,
  coerceCellValue,
  formatCellValue,
  kanbanColumns,
  recordLabel,
  groupRowsByDate,
  monthMatrix,
  buildPageTree,
  pageDescendantIds,
  searchPages,
  AUTOMATION_WEEKDAYS,
  AUTOMATION_ACTIONS,
  runAutomations,
  applyMergeFields,
  evalFormula,
  sheetChartSeries,
  EMAIL_TEMPLATES,
} from "./domain.js";
import {
  DEFAULT_CHART_CONFIG,
  normalizeChartConfig,
} from "./features/spreadsheets/chartConfig.js";
import {
  documentBlocksToText,
  normalizeDocumentBlocks,
  normalizeSyncedBlock,
  textToDocumentBlocks,
} from "./features/documents/blockDocumentDomain.js";
import {
  createProjectRecord,
  MILESTONE_TYPES,
  normalizeGovernanceItem,
  PROJECT_STATUSES,
  projectMetrics,
} from "./features/projects/projectDomain.js";
import {
  buildProjectSchedule,
  ganttPosition,
  ganttWidth,
  scheduleRiskSummary,
} from "./features/projects/scheduleDomain.js";
import {
  buildNavigation,
  writeVisit,
} from "./features/navigation/menuDomain.js";
import {
  appendRecordComment,
  computedDatabaseValue,
  createDatabaseRecord,
  relationIds,
  relationLabels,
  removeRecordAndReferences,
  updateRelation,
} from "./features/databases/relational.js";
import Modal from "./components/Modal.jsx";
import {
  Button,
  DynamicIcon,
  Empty,
  Field,
  FilterSelect,
  LIST_PAGE_SIZE,
  LoadMoreButton,
  Logo,
  PageTitle,
} from "./components/ui.jsx";
import HomeHub from "./features/home/HomeHub.jsx";
import LegalPage, { LegalContent } from "./features/legal/LegalPage.jsx";
import InboxHub from "./features/omnichannel/InboxHub.jsx";
import Contacts from "./features/omnichannel/Contacts.jsx";
import CRM from "./features/omnichannel/CRM.jsx";
import Appointments from "./features/omnichannel/Appointments.jsx";
import Quotes from "./features/omnichannel/Quotes.jsx";
import TimeTracking from "./features/omnichannel/TimeTracking.jsx";
import {
  BUSINESS_INDUSTRY_CATALOG,
  businessPackLabels,
  businessTypeLabel,
  filterNavigationForBusiness,
  industryCategoryById,
  profileTypeForIndustry,
  recommendedPackIds,
} from "./features/business-profile/businessProfileDomain.js";
import {
  buildDigitalTaskPrompt,
  buildTaskStructurePrompt,
  localTaskStructure,
  parseTaskStructure,
  prioritizeTaskBacklog,
  taskCompletionGaps,
} from "./features/tasks/taskAiDomain.js";
// Reexporta a camada de l√≥gica pura para os testes que importam de "./App".
export {
  contactLinks,
  DEFAULT_LEVELS,
  computeUserPoints,
  levelForPoints,
  levelProgress,
  computeAchievements,
  computeMyWork,
  computeBusinessInsights,
  recurringStatus,
  buildRecurringTransaction,
  buildRecurringPostings,
  buildRecurringReminder,
  parseDeckSlides,
  parseContentPlan,
  scheduleContentDates,
  parseSheet,
  buildCsv,
  parseAnalysis,
  parseMindMap,
  DOCUMENT_TEMPLATES,
  fillDocTemplate,
  normalizeForSigning,
  documentFingerprint,
  signatureCode,
  makeSignature,
  verifySignature,
  signatureStatus,
  signatureBlockText,
  buildEmailSignature,
  buildPixCode,
  pixCrc16,
  DB_FIELD_TYPES,
  coerceCellValue,
  formatCellValue,
  groupRowsByField,
  kanbanColumns,
  recordLabel,
  groupRowsByDate,
  monthMatrix,
  buildPageTree,
  pageDescendantIds,
  searchPages,
  AUTOMATION_WEEKDAYS,
  AUTOMATION_ACTIONS,
  automationDue,
  runAutomations,
  extractMergeFields,
  applyMergeFields,
  evalFormula,
  sheetChartSeries,
  parseBrNumber,
  EMAIL_TEMPLATES,
  procurementNumber,
  supplierBidTotals,
  compareSupplierBids,
  bestOffersByItem,
  buildProcurementCsv,
  parseSupplierProposal,
} from "./domain.js";
export { groupInteractions } from "./features/omnichannel/inboxDomain.js";
import {
  Sparkles,
  Home,
  Rocket,
  Target,
  Megaphone,
  Network,
  Gauge,
  ListChecks,
  GitBranch,
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
  ChevronDown,
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
  Mic,
  BrainCog,
  Sigma,
  PenLine,
  AlertTriangle,
  GraduationCap,
  LockKeyhole,
  Printer,
  Mail,
  Inbox,
  Pencil,
  BarChart3,
  Image as ImageIcon,
  Video,
  Link2,
  Wrench,
  ReceiptText,
  CalendarDays,
  Play,
  Bot,
  Square,
  Table,
  FileSearch,
  QrCode,
  Database,
  BookOpen,
  Zap,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Plug,
  Code2,
  Table2,
  KeyRound,
  Sparkle,
  Layers,
  Languages,
  Route,
  MapPin,
  Navigation,
  Truck,
  Bell,
  Paperclip,
  Repeat,
  Bug,
  Activity,
  LifeBuoy,
  FolderTree,
} from "lucide-react";

const Procurement = lazy(
  () => import("./features/procurement/Procurement.jsx"),
);
const ProcessStudio = lazy(
  () => import("./features/processes/ProcessStudio.jsx"),
);
const CapacityPlanner = lazy(
  () => import("./features/resources/CapacityPlanner.jsx"),
);
const PricingImpactStudio = lazy(
  () => import("./features/pricing/PricingImpactStudio.jsx"),
);
const WorkStructure = lazy(
  () => import("./features/work/WorkStructure.jsx"),
);
const Goals = lazy(() => import("./features/goals/Goals.jsx"));
const Bills = lazy(() => import("./features/finance/Bills.jsx"));
const SalesPipeline = lazy(
  () => import("./features/crm/SalesPipeline.jsx"),
);
const MonthlyStatement = lazy(
  () => import("./features/finance/MonthlyStatement.jsx"),
);
const Meetings = lazy(() => import("./features/meetings/Meetings.jsx"));
const CanvasBoard = lazy(
  () => import("./features/canvas/CanvasBoard.jsx"),
);
const DiagramStudio = lazy(
  () => import("./features/diagrams/DiagramStudio.jsx"),
);
const QuickWhiteboard = lazy(
  () => import("./features/whiteboard/QuickWhiteboard.jsx"),
);
const DayPlanner = lazy(() => import("./features/planner/DayPlanner.jsx"));
const KnowledgeCenter = lazy(
  () => import("./features/knowledge/KnowledgeCenter.jsx"),
);
const DataLab = lazy(() => import("./features/analytics/DataLab.jsx"));
const ConnectedNotes = lazy(
  () => import("./features/notes/ConnectedNotes.jsx"),
);
const PortfolioBoard = lazy(
  () => import("./features/portfolio/PortfolioBoard.jsx"),
);
const AgentStudio = lazy(() => import("./features/agents/AgentStudio.jsx"));
const PlanPanel = lazy(() => import("./features/plans/PlanPanel.jsx"));
const MenuSettings = lazy(
  () => import("./features/navigation/MenuSettings.jsx"),
);
const MediaStudio = lazy(() => import("./features/media/MediaStudio.jsx"));
const CodeStudio = lazy(() => import("./features/code/CodeStudio.jsx"));
const DataNotebook = lazy(() => import("./features/notebook/DataNotebook.jsx"));
const IntegrationsHub = lazy(
  () => import("./features/integrations/IntegrationsHub.jsx"),
);
const ConfigurableDashboard = lazy(
  () => import("./features/dashboard/ConfigurableDashboard.jsx"),
);
const CorporateChat = lazy(
  () => import("./features/chat/CorporateChat.jsx"),
);
const PublicFormsStudio = lazy(
  () => import("./features/forms/PublicFormsStudio.jsx"),
);
const ClientPortalStudio = lazy(
  () => import("./features/portal/ClientPortalStudio.jsx"),
);
const BlockDocumentEditor = lazy(
  () => import("./features/documents/BlockDocumentEditor.jsx"),
);
const CreativeToolkit = lazy(
  () => import("./features/creative/CreativeToolkit.jsx"),
);
const FreeSuite = lazy(
  () => import("./features/free-suite/FreeSuite.jsx"),
);
const PlatformSuite = lazy(
  () => import("./features/platform-suite/PlatformSuite.jsx"),
);
const BusinessProfileStudio = lazy(
  () => import("./features/business-profile/BusinessProfileStudio.jsx"),
);

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
  appointments: [],
  products: [],
  orders: [],
  quotes: [],
  supplierRfqs: [],
  recurring: [],
  timeEntries: [],
  contacts: [],
  deliveryZones: [],
  vehicles: [],
  trips: [],
  developmentPlans: [],
  notifications: [],
  teams: [],
  projects: [],
  workNodes: [],
  objectives: [],
  dashboardConfigs: [],
  chatChannels: [],
  chatMessages: [],
  chatReadStates: [],
  bills: [],
  opportunities: [],
  meetings: [],
  boards: [],
  diagrams: [],
  whiteboards: [],
  workHours: null,
  memories: [],
  glossary: [],
  notes: [],
  flashcards: [],
  projectLinks: [],
  portfolioRisks: [],
  raci: [],
  agents: [],
  agentRuns: [],
  salesPipeline: null,
  transactions: [],
  financeSettings: {},
  taxProfile: { isMEI: false, dueDay: 20, cnpj: "", dasHistory: {} },
  documents: [],
  syncedBlocks: [],
  presentations: [],
  contentPlan: [],
  sheets: [],
  analyses: [],
  brainstorms: [],
  signatures: [],
  pixCharges: [],
  databases: [],
  processes: [],
  processCases: [],
  formResponses: [],
  publicForms: [],
  clientPortals: [],
  resourceProfiles: [],
  resourceAbsences: [],
  resourceAllocations: [],
  pricingModels: [],
  pricingScenarios: [],
  impactFactors: [],
  impactEntries: [],
  wikiPages: [],
  automations: [],
  sites: [],
  history: [],
  certificates: [],
  conversations: [],
  media: [],
  codeProjects: [],
  notebook: null,
  emailDrafts: [],
  customSpecialists: [],
  pluggedTools: [],
  selectedConversationId: null,
  journeys: {},
  preferences: {
    theme: "light",
    specialist: "Diretor",
    mode: "business",
    modeChosen: false,
  },
};

export const hasAnyWorkspaceData = (db) =>
  (db?.businesses || []).length > 0 ||
  (db?.tasks || []).length > 0 ||
  (db?.leads || []).length > 0 ||
  (db?.appointments || []).length > 0 ||
  (db?.contacts || []).length > 0 ||
  (db?.products || []).length > 0 ||
  (db?.orders || []).length > 0 ||
  (db?.timeEntries || []).length > 0 ||
  (db?.vehicles || []).length > 0 ||
  (db?.trips || []).length > 0 ||
  (db?.developmentPlans || []).length > 0 ||
  (db?.documents || []).length > 0 ||
  (db?.syncedBlocks || []).length > 0 ||
  (db?.processes || []).length > 0 ||
  (db?.processCases || []).length > 0 ||
  (db?.publicForms || []).length > 0 ||
  (db?.clientPortals || []).length > 0 ||
  (db?.resourceProfiles || []).length > 0 ||
  (db?.resourceAllocations || []).length > 0 ||
  (db?.pricingModels || []).length > 0 ||
  (db?.pricingScenarios || []).length > 0 ||
  (db?.workNodes || []).length > 0 ||
  (db?.chatChannels || []).length > 0 ||
  (db?.chatMessages || []).length > 0 ||
  (db?.sites || []).length > 0 ||
  (db?.conversations || []).length > 0 ||
  (db?.history || []).length > 0;

const nav = [
  ["inicio", "In√≠cio", Home],
  ["meu-trabalho", "Meu trabalho", BriefcaseBusiness],
  ["comecar", "Come√ßar do zero", Rocket],
  ["perfil-negocio", "Central do neg√≥cio", SlidersHorizontal],
  ["estrategia", "Estrat√©gia", Target],
  ["marketing", "Marca e Marketing", Megaphone],
  ["vendas", "Vendas e Clientes", Handshake],
  ["orcamentos", "Or√ßamentos", ReceiptText],
  ["precificacao", "Precifica√ß√£o e Impacto", Calculator],
  ["compras", "Compras e Cota√ß√µes", Boxes],
  ["caixa", "Caixa de entrada", Inbox],
  ["chat-corporativo", "Chat corporativo", MessageSquareText],
  ["contatos", "Contatos", Users],
  ["agendamentos", "Agendamentos", CalendarDays],
  ["produtos", "Produtos e Pedidos", ShoppingBag],
  ["frota", "Frota e Fretes", Truck],
  ["horas", "Horas e Faturamento", Clock3],
  ["bases", "Meus dados", Database],
  ["automacoes", "Automa√ß√µes", Zap],
  ["financeiro", "Financeiro", WalletCards],
  ["contas", "Contas a receber e pagar", ReceiptText],
  ["funil", "Funil de vendas", TrendingUp],
  ["resultado-mes", "Resultado do m√™s", BarChart3],
  ["reunioes", "Reuni√µes", Mic],
  ["quadro", "Quadro visual", Layers],
  ["diagramas", "Diagramas", Workflow],
  ["quadro-rapido", "Quadro r√°pido", Lightbulb],
  ["cobranca", "Cobran√ßa Pix", QrCode],
  ["resultados", "Dashboards", BarChart3],
  ["operacao", "Opera√ß√£o", Workflow],
  ["estrutura", "Estrutura de trabalho", FolderTree],
  ["planejar", "Planejar o dia", CalendarDays],
  ["memoria-busca", "Mem√≥ria e busca", BrainCog],
  ["analise-dados", "An√°lise de dados", Sigma],
  ["notas-conectadas", "Conhecimento conectado", Network],
  ["portfolio", "Portf√≥lio de projetos", GitBranch],
  ["agentes", "Agentes", Bot],
  ["central-crescimento", "Central de crescimento", PanelsTopLeft],
  ["metas", "Metas e OKRs", Target],
  ["processos", "Processos e Solicita√ß√µes", PanelsTopLeft],
  ["formularios-publicos", "Formul√°rios p√∫blicos", PanelsTopLeft],
  ["portal-cliente", "Portal do cliente", Users],
  ["capacidade", "Capacidade e Recursos", Users],
  ["desenvolvimento", "Desenvolvimento", TrendingUp],
  ["sites", "Sites e Materiais", PanelsTopLeft],
  ["documentos", "Documentos", FileText],
  ["wiki", "Base de conhecimento", BookOpen],
  ["analise", "An√°lise de textos", FileSearch],
  ["ideias", "Mapa de ideias", Lightbulb],
  ["apresentacoes", "Apresenta√ß√µes", Layers],
  ["conteudo", "Calend√°rio de conte√∫do", CalendarDays],
  ["planilhas", "Planilhas", Table],
  ["assinatura", "Assinatura de e-mail", Mail],
  ["ferramentas", "Ferramentas", Wrench],
  ["criacao-local", "Cria√ß√£o sem custo", WandSparkles],
  ["laboratorio-gratuito", "Laborat√≥rio gratuito", Bot],
  ["estudio", "Est√∫dio de IA", WandSparkles],
  ["midia", "M√≠dia", ImageIcon],
  ["editor-codigo", "Editor de c√≥digo", Code2],
  ["notebook", "Notebook de dados", Table2],
  ["integracoes", "Integra√ß√µes", Plug],
  ["historico", "Hist√≥rico", History],
  ["certificacoes", "Certifica√ß√µes", Award],
];

const navSecondary = [
  ["personalizar-menu", "Personalizar menu", ListChecks],
  ["meu-plano", "Meu plano", Gauge],
  ["time", "Meu Time", Users],
  ["config", "Configura√ß√µes", Settings],
];

const navGroups = [
  {
    label: null,
    items: ["inicio", "meu-trabalho", "comecar", "perfil-negocio"],
  },
  {
    label: "VENDAS E CLIENTES",
    items: [
      "estrategia",
      "marketing",
      "vendas",
      "funil",
      "orcamentos",
      "precificacao",
      "caixa",
      "contatos",
      "agendamentos",
      "reunioes",
    ],
  },
  {
    label: "OPERA√á√ÉO",
    items: [
      "chat-corporativo",
      "produtos",
      "compras",
      "frota",
      "horas",
      "operacao",
      "estrutura",
      "planejar",
      "memoria-busca",
      "analise-dados",
      "notas-conectadas",
      "portfolio",
      "agentes",
      "central-crescimento",
      "metas",
      "resultados",
      "processos",
      "formularios-publicos",
      "portal-cliente",
      "capacidade",
      "desenvolvimento",
      "bases",
      "automacoes",
      "notebook",
      "integracoes",
    ],
  },
  {
    label: "FINANCEIRO",
    items: ["financeiro", "contas", "resultado-mes", "cobranca"],
  },
  {
    label: "CONTE√öDO",
    items: [
      "sites",
      "documentos",
      "wiki",
      "analise",
      "ideias",
      "quadro",
      "diagramas",
      "quadro-rapido",
      "apresentacoes",
      "conteudo",
      "planilhas",
      "assinatura",
      "ferramentas",
      "criacao-local",
      "laboratorio-gratuito",
      "estudio",
      "midia",
      "editor-codigo",
    ],
  },
  { label: "REGISTROS", items: ["historico", "certificacoes"] },
];

// O modo employee personaliza sugest√µes e r√≥tulos, mas nunca restringe
// acesso: os dois modos navegam pelo mesmo conjunto completo de p√°ginas.
export const navForMode = () => nav;
export const navForBusiness = (mode, business) =>
  filterNavigationForBusiness(navForMode(mode), business);

const toolCatalog = [
  {
    id: "nfse",
    name: "NFS-e Nacional",
    category: "Nota fiscal",
    description:
      "Emissor oficial e gratuito de nota fiscal de servi√ßo, inclusive para MEI.",
    url: "https://www.gov.br/pt-br/servicos/emitir-nota-fiscal-de-servico-eletronica",
    badge: "Oficial ¬∑ Gratuito",
    keywords: "nota fiscal nfse servi√ßo mei imposto",
    icon: ReceiptText,
  },
  {
    id: "nfe-sebrae",
    name: "Emissor NF-e Sebrae",
    category: "Nota fiscal",
    description:
      "Emiss√£o gratuita de NF-e para venda de produtos, dispon√≠vel em todo o Brasil.",
    url: "https://emissornfe.sebrae.com.br/",
    badge: "Gratuito",
    keywords: "nota fiscal nfe produto venda sebrae",
    icon: ReceiptText,
  },
  {
    id: "nfse-api",
    name: "Documenta√ß√£o API NFS-e",
    category: "Nota fiscal",
    description:
      "Manuais e documenta√ß√£o t√©cnica oficial para integra√ß√£o com sistemas de emiss√£o.",
    url: "https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica",
    badge: "API oficial",
    keywords: "api nota fiscal nfse integra√ß√£o erp",
    icon: Link2,
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Comunica√ß√£o",
    description: "Componha e envie e-mails usando sua conta Google.",
    url: "https://mail.google.com/mail/?view=cm&fs=1",
    badge: "Gratuito",
    keywords: "email e-mail gmail mensagem proposta or√ßamento",
    icon: Mail,
  },
  {
    id: "outlook",
    name: "Outlook",
    category: "Comunica√ß√£o",
    description: "Abra uma nova mensagem no Outlook Web.",
    url: "https://outlook.office.com/mail/deeplink/compose",
    badge: "Gratuito",
    keywords: "email e-mail outlook mensagem",
    icon: Mail,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Web",
    category: "Comunica√ß√£o",
    description: "Atendimento e acompanhamento de clientes pelo navegador.",
    url: "https://web.whatsapp.com/",
    badge: "Gratuito",
    keywords: "whatsapp cliente mensagem atendimento",
    icon: MessageSquareText,
  },
  {
    id: "calendar",
    name: "Google Agenda",
    category: "Organiza√ß√£o",
    description: "Crie compromissos, prazos e lembretes.",
    url: "https://calendar.google.com/",
    badge: "Gratuito",
    keywords: "agenda calend√°rio compromisso reuni√£o prazo",
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
    description: "Organize dados, pre√ßos, despesas e controles.",
    url: "https://sheets.google.com/",
    badge: "Gratuito",
    keywords: "planilha financeiro pre√ßo despesa excel",
    icon: WalletCards,
  },
  {
    id: "canva",
    name: "Canva",
    category: "Design",
    description: "Crie apresenta√ß√µes, posts e materiais visuais.",
    url: "https://www.canva.com/",
    badge: "Redirecionamento",
    keywords: "design logo post apresenta√ß√£o imagem canva",
    icon: Palette,
  },
  {
    id: "trello",
    name: "Trello",
    category: "Organiza√ß√£o",
    description: "Organize tarefas e projetos em quadros visuais.",
    url: "https://trello.com/",
    badge: "Redirecionamento",
    keywords: "tarefa projeto quadro kanban trello",
    icon: ListTodo,
  },
  {
    id: "notion",
    name: "Notion",
    category: "Organiza√ß√£o",
    description: "Centralize documentos, processos e conhecimento.",
    url: "https://www.notion.so/",
    badge: "Redirecionamento",
    keywords: "documento processo wiki organiza√ß√£o notion",
    icon: FileText,
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "Vendas",
    description:
      "CRM gratuito para contatos, neg√≥cios e acompanhamento comercial.",
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
    "Entende o pedido, envolve as √°reas certas e consolida tudo.",
  ],
  ["Fundador", Rocket, "Transforma uma ideia em um neg√≥cio estruturado."],
  ["Estrategista", Target, "Analisa cen√°rios, riscos e prioridades."],
  ["Consultor", BriefcaseBusiness, "Diagnostica e recomenda a√ß√µes pr√°ticas."],
  ["Redator", FileText, "Cria e aprimora textos profissionais."],
  ["Negociador", Handshake, "Prepara argumentos, obje√ß√µes e acordos."],
  ["Precificador", Calculator, "Estrutura pre√ßos, custos e margens."],
  ["Marketing", Megaphone, "Cria posicionamento, campanhas e conte√∫do."],
  ["Vendas", TrendingUp, "Organiza prospec√ß√£o e acompanhamento."],
  ["Atendimento", Headphones, "Ajuda a responder e cuidar de clientes."],
  ["Financeiro", WalletCards, "Interpreta os n√∫meros que voc√™ informar."],
  ["Opera√ß√µes", Boxes, "Cria processos, rotinas e checklists."],
  ["Pessoas", UserCog, "Apoia cargos, entrevistas e onboarding."],
  ["Criador de Sites", Globe2, "Transforma um briefing em p√°gina utiliz√°vel."],
  [
    "Jur√≠dico",
    BriefcaseBusiness,
    "Contratos, minutas, pol√≠ticas e riscos legais.",
  ],
  ["TI", Monitor, "Sistemas, integra√ß√µes, automa√ß√µes e seguran√ßa t√©cnica."],
  ["Produto", Lightbulb, "Discovery, roadmap, backlog e lan√ßamento."],
  ["Projetos", ListTodo, "Escopo, cronograma, riscos e acompanhamento."],
  [
    "Customer Success",
    UserRound,
    "Onboarding, reten√ß√£o, churn e planos de sucesso.",
  ],
  ["Dados", Filter, "Indicadores, an√°lises e decis√µes com evid√™ncias."],
  ["Log√≠stica", Boxes, "Estoque, fretes, prazos e supply chain."],
  ["Compras", ShoppingBag, "Cota√ß√µes, fornecedores e suprimentos."],
  ["Administrativo", Archive, "Rotinas, controles e organiza√ß√£o interna."],
  [
    "Comunica√ß√£o",
    MessageSquareText,
    "Comunica√ß√£o institucional e gest√£o de crise.",
  ],
  ["Design", Palette, "Identidade visual, briefings e dire√ß√£o de arte."],
  ["Conte√∫do", FileText, "Planejamento editorial, pautas e materiais ricos."],
  ["Pesquisa", Search, "Pesquisas de mercado e de usu√°rio bem estruturadas."],
  ["Inova√ß√£o", Lightbulb, "Ideias, experimentos e valida√ß√£o com crit√©rios."],
  ["Expans√£o", Globe2, "Novos mercados, filiais, franquias e canais."],
  ["Growth", TrendingUp, "Experimentos de aquisi√ß√£o, reten√ß√£o e receita."],
  ["E-commerce", ShoppingBag, "Loja virtual, checkout, convers√£o e campanhas."],
  ["Marketplace", PanelsTopLeft, "Cadastro, reputa√ß√£o, buy box e an√∫ncios."],
  ["Qualidade", BadgeCheck, "Padr√µes, auditorias e melhoria cont√≠nua."],
  ["Compliance", ShieldCheck, "Pol√≠ticas, condutas e riscos regulat√≥rios."],
  [
    "Seguran√ßa da Informa√ß√£o",
    LockKeyhole,
    "Acessos, backups, LGPD e incidentes.",
  ],
  ["Processos", Workflow, "Mapeamento, padroniza√ß√£o e automa√ß√£o."],
  [
    "Contabilidade",
    Calculator,
    "Organiza√ß√£o cont√°bil e material para o contador.",
  ],
  ["Riscos", CircleAlert, "Matriz de riscos, mitiga√ß√£o e monitoramento."],
  ["ESG", Sun, "Pr√°ticas ambientais, sociais e de governan√ßa."],
  [
    "Treinamento",
    GraduationCap,
    "Trilhas de capacita√ß√£o e educa√ß√£o corporativa.",
  ],
  ["Auditoria", Eye, "Verifica√ß√µes independentes e planos de corre√ß√£o."],
  [
    "Intelig√™ncia Competitiva",
    Search,
    "Concorrentes, pre√ßos e movimentos de mercado.",
  ],
  ["Fornecedores", Handshake, "Homologa√ß√£o, contratos, SLAs e desempenho."],
  ["Parcerias", Handshake, "Alian√ßas, acordos e governan√ßa da rela√ß√£o."],
  [
    "Capta√ß√£o",
    DollarSign,
    "Pitch deck, unit economics e prepara√ß√£o para investidores.",
  ],
  ["Carreira", Rocket, "Plano de carreira, avalia√ß√µes e negocia√ß√£o salarial."],
  ["Produtividade", Clock3, "Rotina, prioridades e foco no trabalho."],
  ["Reuni√µes", Users, "Pautas, condu√ß√£o e ata com encaminhamentos."],
  ["Apresenta√ß√µes", Layers, "Narrativa e conte√∫do de slides."],
  [
    "Gest√£o de Stakeholders",
    Handshake,
    "Mapeamento de interessados e alinhamento de expectativas.",
  ],
  ["Lideran√ßa", Award, "Feedback, delega√ß√£o e conversas dif√≠ceis."],
];

const journeyData = {
  start: {
    title: "Quero come√ßar um neg√≥cio",
    icon: Rocket,
    steps: [
      "Explicar a ideia",
      "Definir o problema",
      "Definir o p√∫blico",
      "Avaliar a demanda",
      "Mapear concorrentes",
      "Criar proposta de valor",
      "Definir a oferta",
      "Estruturar pre√ßos",
      "Criar nome e posicionamento",
      "Plano de lan√ßamento",
      "Materiais iniciais",
      "P√°gina de apresenta√ß√£o",
      "Primeiros clientes",
    ],
  },
  organize: {
    title: "Quero organizar meu neg√≥cio",
    icon: Workflow,
    steps: [
      "Diagn√≥stico atual",
      "Produtos e servi√ßos",
      "Pre√ßos",
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
      "Diagn√≥stico comercial",
      "Cliente ideal",
      "Revis√£o da oferta",
      "Revis√£o dos pre√ßos",
      "Argumentos",
      "Mensagens de prospec√ß√£o",
      "Proposta comercial",
      "Leads",
      "Acompanhamento",
      "An√°lise dos resultados",
    ],
  },
  brand: {
    title: "Quero profissionalizar minha marca",
    icon: Palette,
    steps: [
      "Diagn√≥stico da marca",
      "Posicionamento",
      "Tom de voz",
      "Identidade visual",
      "Biografia",
      "Materiais comerciais",
      "Redes sociais",
      "Site",
      "Portf√≥lio",
      "Plano de comunica√ß√£o",
    ],
  },
};

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

// PushManager.subscribe() exige a chave VAPID como Uint8Array, mas o
// servidor entrega base64url ‚Äî essa √© a convers√£o padr√£o da MDN.
const urlBase64ToUint8Array = (base64) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const whatsappLink = (phone, message) =>
  `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

// ‚îÄ‚îÄ Modelos de mensagem do WhatsApp ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ
// O p√∫blico faz vendas inteiras pelo WhatsApp; digitar a mesma mensagem toda
// vez √© atrito. Modelos reutiliz√°veis com vari√°veis ({{nome}}, {{valor}}...)
// preenchidas a partir do pr√≥prio registro (lead, pedido, agendamento) fecham
// esse ciclo ‚Äî 100% gr√°tis, sem API paga do Meta e sem credenciais externas.
export const DEFAULT_WA_TEMPLATES = [
  {
    id: "wa-boasvindas",
    name: "Boas-vindas",
    category: "Contato",
    body: "Ol√° {{nome}}, tudo bem? Aqui √© da {{negocio}}. Obrigado pelo contato! Como posso te ajudar?",
  },
  {
    id: "wa-pedido",
    name: "Confirma√ß√£o de pedido",
    category: "Pedido",
    body: "Ol√° {{nome}}! Seu pedido na {{negocio}} ({{itens}}) est√° no status: {{status}}. Total: {{valor}}. Qualquer d√∫vida, √© s√≥ chamar.",
  },
  {
    id: "wa-agendamento",
    name: "Confirma√ß√£o de agendamento",
    category: "Agendamento",
    body: "Ol√° {{nome}}, confirmando seu hor√°rio na {{negocio}}: {{servico}}, no dia {{data}} √†s {{hora}}. At√© l√°!",
  },
  {
    id: "wa-cobranca",
    name: "Cobran√ßa amig√°vel",
    category: "Cobran√ßa",
    body: "Oi {{nome}}, tudo bem? Passando para lembrar do pagamento de {{valor}} referente a {{descricao}}. Qualquer coisa, estou √† disposi√ß√£o!",
  },
  {
    id: "wa-agradecimento",
    name: "Agradecimento p√≥s-venda",
    category: "Pedido",
    body: "{{nome}}, muito obrigado pela prefer√™ncia! Espero que tenha gostado. Se puder, me conta o que achou. üôè",
  },
];

export const WA_TEMPLATE_CATEGORIES = [
  "Contato",
  "Pedido",
  "Agendamento",
  "Cobran√ßa",
  "Outros",
];

// Substitui {{chave}} pelo valor correspondente; vari√°veis sem valor viram
// [chave] para o usu√°rio perceber e completar antes de enviar.
export const fillWhatsappTemplate = (body, vars = {}) =>
  String(body || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value == null || value === "" ? `[${key}]` : String(value);
  });

// Constr√≥i a agenda de contatos automaticamente a partir do uso do CRM,
// Agendamentos e Pedidos, sem exigir nenhum passo extra do usu√°rio.
export const pushNotification = (
  notifications,
  { recipientId, message, link, createdBy },
) => {
  if (!recipientId) return notifications || [];
  return [
    {
      id: uid(),
      assigneeId: recipientId,
      ownerId: createdBy || null,
      message,
      link: link || "",
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...(notifications || []),
  ].slice(0, 50);
};

// ‚îÄ‚îÄ Sa√∫de do espa√ßo de sincroniza√ß√£o ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ
// O workspace √© sincronizado como um √∫nico JSON; quando ele cresce demais,
// a sincroniza√ß√£o fica lenta e pode falhar. Estas fun√ß√µes puras mostram o
// que ocupa espa√ßo (por cole√ß√£o) e permitem liberar o maior ofensor seguro
// (conversas de IA antigas) sem tocar no cora√ß√£o da sincroniza√ß√£o.
const WORKSPACE_COLLECTION_LABELS = {
  conversations: "Conversas de IA",
  media: "M√≠dia gerada",
  documents: "Documentos",
  syncedBlocks: "Conte√∫do sincronizado",
  history: "Hist√≥rico de projetos",
  sites: "Sites",
  tasks: "Tarefas",
  leads: "CRM (leads)",
  transactions: "Financeiro",
  orders: "Pedidos",
  quotes: "Or√ßamentos",
  products: "Produtos",
  timeEntries: "Apontamentos de horas",
  appointments: "Agendamentos",
  contacts: "Contatos",
  certificates: "Certificados",
  notifications: "Notifica√ß√µes",
};

const approxBytes = (value) => {
  const str = JSON.stringify(value) || "";
  try {
    return new Blob([str]).size;
  } catch {
    return str.length;
  }
};

export const workspaceBreakdown = (db) => {
  const rows = Object.keys(WORKSPACE_COLLECTION_LABELS)
    .map((key) => {
      const value = db?.[key];
      if (!Array.isArray(value) || value.length === 0) return null;
      return {
        key,
        label: WORKSPACE_COLLECTION_LABELS[key],
        count: value.length,
        bytes: approxBytes(value),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.bytes - a.bytes);
  const total = rows.reduce((sum, row) => sum + row.bytes, 0);
  return { rows, total };
};

// Mant√©m apenas as `keep` conversas mais recentes (por createdAt), para
// liberar espa√ßo sem perder o hist√≥rico ativo. Pura e test√°vel.
export const trimOldConversations = (conversations, keep = 5) => {
  const list = Array.isArray(conversations) ? conversations : [];
  if (list.length <= keep) return list;
  return [...list]
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    )
    .slice(0, keep);
};

// ‚îÄ‚îÄ DAS do MEI ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ
// O imposto mensal do MEI (guia DAS) vence todo dia 20. Atraso gera juros e,
// acumulado, pode at√© desenquadrar o MEI ‚Äî por isso um lembrete autom√°tico √©
// a dor mais universal de quem usa o app. Tudo aqui √© fun√ß√£o pura para ser
// f√°cil de testar; a notifica√ß√£o real reaproveita db.notifications, que j√°
// dispara o Web Push quando aparece um item novo na sincroniza√ß√£o.
export const DAS_DEFAULT_DUE_DAY = 20;

export const monthLabelPt = (ym) => {
  const label = new Date(`${ym}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const dasStatus = (taxProfile, ymd = today()) => {
  const dueDay = Number(taxProfile?.dueDay) || DAS_DEFAULT_DUE_DAY;
  const ym = ymd.slice(0, 7);
  const day = Number(ymd.slice(8, 10));
  if (!taxProfile?.isMEI) return { status: "off", ym, dueDay, paid: false };
  const paid = !!taxProfile?.dasHistory?.[ym]?.paid;
  if (paid) return { status: "pago", ym, dueDay, paid: true };
  if (day > dueDay) return { status: "atrasado", ym, dueDay, paid: false };
  return { status: "a_pagar", ym, dueDay, paid: false };
};

// Retorna um novo array de notifica√ß√µes (com o lembrete adicionado) ou null
// quando n√£o h√° nada a notificar. Idempotente: o id determin√≠stico por m√™s+tipo
// impede lembretes duplicados a cada sincroniza√ß√£o.
export const buildDasReminder = (
  taxProfile,
  notifications,
  userId,
  ymd = today(),
) => {
  if (!userId) return null;
  const { status, ym, dueDay } = dasStatus(taxProfile, ymd);
  const day = Number(ymd.slice(8, 10));
  let type = null;
  if (status === "atrasado") type = "atrasado";
  else if (status === "a_pagar" && day >= dueDay - 5) type = "lembrete";
  if (!type) return null;
  const notifId = `das-${ym}-${type}`;
  if ((notifications || []).some((n) => n && n.id === notifId)) return null;
  const label = monthLabelPt(ym);
  const message =
    type === "atrasado"
      ? `O DAS do MEI de ${label} venceu no dia ${dueDay} e ainda n√£o est√° marcado como pago. Regularize para n√£o acumular juros.`
      : `O DAS do MEI de ${label} vence no dia ${dueDay}. N√£o esque√ßa de emitir e pagar a guia.`;
  return [
    {
      id: notifId,
      assigneeId: userId,
      ownerId: userId,
      message,
      link: "financeiro",
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...(notifications || []),
  ].slice(0, 50);
};

// ‚îÄ‚îÄ Resumo semanal ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ‚îÄ
// Prova de valor recorrente: n√∫meros tang√≠veis da semana (vendas, caixa,
// tarefas) entregues por push ‚Äî n√£o uma tela que a pessoa precisa lembrar de
// abrir. computeWeeklySummary √© puro e existe tamb√©m em worker.js (que envia
// o push via Cron mesmo com o app fechado); manter as duas c√≥pias em sincronia.
export const weekRange = (ymd = today()) => {
  const d = new Date(`${ymd}T12:00:00`);
  const dow = (d.getDay() + 6) % 7; // segunda = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (x) => x.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
};

export const previousWeekRange = (ymd = today()) => {
  const { start } = weekRange(ymd);
  const prev = new Date(`${start}T12:00:00`);
  prev.setDate(prev.getDate() - 1);
  return weekRange(prev.toISOString().slice(0, 10));
};

const withinRange = (ymd, start, end) => !!ymd && ymd >= start && ymd <= end;

export const computeWeeklySummary = (data, start, end) => {
  const ymd = (v) => String(v || "").slice(0, 10);
  const orders = (Array.isArray(data?.orders) ? data.orders : []).filter(
    (o) => o.status !== "Cancelado" && withinRange(ymd(o.createdAt), start, end),
  );
  const weekTx = (Array.isArray(data?.transactions) ? data.transactions : []).filter(
    (t) => withinRange(ymd(t.date), start, end),
  );
  const cashIn = weekTx
    .filter((t) => t.type === "Receita")
    .reduce((a, t) => a + Number(t.value || 0), 0);
  const cashOut = weekTx
    .filter((t) => t.type === "Despesa")
    .reduce((a, t) => a + Number(t.value || 0), 0);
  const doneTasks = (Array.isArray(data?.tasks) ? data.tasks : []).filter(
    (t) => t.status === "Conclu√≠do" && withinRange(ymd(t.updatedAt), start, end),
  );
  const tasksDone = doneTasks.length;
  const tasksReward = doneTasks.reduce((a, t) => a + Number(t.reward || 0), 0);
  const newLeads = (Array.isArray(data?.leads) ? data.leads : []).filter((l) =>
    withinRange(ymd(l.createdAt), start, end),
  ).length;
  const salesRevenue = orders.reduce((a, o) => a + Number(o.total || 0), 0);
  return {
    start,
    end,
    sales: orders.length,
    salesRevenue,
    cashIn,
    cashOut,
    cashNet: cashIn - cashOut,
    tasksDone,
    tasksReward,
    newLeads,
    hasActivity:
      orders.length > 0 || weekTx.length > 0 || tasksDone > 0 || newLeads > 0,
  };
};

export const dayRangeLabel = (start, end) => {
  const fmt = (ymd) =>
    new Date(`${ymd}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  return `${fmt(start)} a ${fmt(end)}`;
};

export const upsertContact = (
  contacts,
  { name, contact, company, businessId, ownerId },
) => {
  const trimmedName = String(name || "").trim();
  const trimmedContact = String(contact || "").trim();
  if (!trimmedName && !trimmedContact) return contacts;
  const { phone, email } = contactLinks(trimmedContact);
  const now = new Date().toISOString();
  const idx = contacts.findIndex((c) => {
    if (phone && c.phone === phone) return true;
    if (email && c.email === email) return true;
    if (!phone && !email && trimmedName)
      return c.name.toLowerCase() === trimmedName.toLowerCase();
    return false;
  });
  if (idx === -1) {
    if (!trimmedName) return contacts;
    return [
      {
        id: uid(),
        name: trimmedName,
        phone,
        email,
        rawContact: trimmedContact,
        company: company || "",
        notes: "",
        businessId: businessId || null,
        ownerId: ownerId || null,
        visibility: "privado",
        sharingPermission: "visualizar",
        sharedWith: [],
        sharedTeams: [],
        createdAt: now,
        updatedAt: now,
      },
      ...contacts,
    ];
  }
  return contacts.map((c, i) =>
    i === idx
      ? {
          ...c,
          name: trimmedName || c.name,
          phone: phone || c.phone,
          email: email || c.email,
          rawContact: trimmedContact || c.rawContact,
          company: company || c.company,
          updatedAt: now,
        }
      : c,
  );
};

const toolBadgeLabel = (tool) =>
  tool.badge === "Redirecionamento" ? tool.badge : `Redirecionamento ¬∑ ${tool.badge}`;

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

export const addBusinessDays = (ymd, days) => {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  if (!y || !m || !d || !Number.isFinite(days)) return "";
  const date = new Date(y, m - 1, d);
  let remaining = Math.abs(days);
  const step = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    date.setDate(date.getDate() + step);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "N√£o repetir" },
  { value: "daily", label: "Todo dia" },
  { value: "weekly", label: "Toda semana" },
  { value: "monthly", label: "Todo m√™s" },
];

export const nextRecurrenceDue = (ymd, frequency) => {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  if (frequency === "daily") date.setDate(date.getDate() + 1);
  else if (frequency === "weekly") date.setDate(date.getDate() + 7);
  else if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  else return ymd;
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const todayYearMonth = () => new Date().toISOString().slice(0, 7);

export const shiftYearMonth = (yearMonth, delta) => {
  const [y, m] = String(yearMonth || "").split("-").map(Number);
  if (!y || !m) return todayYearMonth();
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const buildTaskCalendar = (yearMonth, tasks) => {
  const [year, month] = String(yearMonth || "").split("-").map(Number);
  if (!year || !month) return [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const pad = (n) => String(n).padStart(2, "0");
  const byDate = {};
  (tasks || []).forEach((task) => {
    if (!task.due) return;
    if (!byDate[task.due]) byDate[task.due] = [];
    byDate[task.due].push(task);
  });
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const ymd = `${year}-${pad(month)}-${pad(day)}`;
    cells.push({ day, ymd, tasks: byDate[ymd] || [] });
  }
  return cells;
};

export const CHANGELOG_ENTRIES = [
  {
    id: "2026-07-31-tarefas-inteligentes",
    date: "2026-07-31",
    title: "A IA agora transforma pedidos em tarefas execut√°veis",
    description:
      "Estruture rascunhos em etapas e crit√©rios verific√°veis, veja a fila de foco calculada sem gastar IA, envie todo o contexto ao colaborador digital e anexe a entrega da conversa de volta √† tarefa. Se os provedores estiverem indispon√≠veis, uma conting√™ncia local mant√©m a organiza√ß√£o funcionando.",
  },
  {
    id: "2026-07-31-central-negocio-universal",
    date: "2026-07-31",
    title: "O app agora se adapta a qualquer tipo de neg√≥cio",
    description:
      "Escolha entre mais de 300 atividades ‚Äî incluindo influenciadores, com√©rcios, servi√ßos, ind√∫strias e opera√ß√µes de nicho ‚Äî e organize o menu com os pacotes de fun√ß√µes mais √∫teis. Neg√≥cios h√≠bridos podem usar descri√ß√£o livre, ativar qualquer pacote ou mostrar tudo, sem perder acesso a nenhuma ferramenta.",
  },
  {
    id: "2026-07-29-editor-universal-blocos",
    date: "2026-07-29",
    title: "Documentos agora s√£o montados com blocos universais",
    description:
      "Combine texto, t√≠tulos, listas, checklists, tabelas, colunas, m√≠dia, c√≥digo, destaques, gr√°ficos, bases, tarefas e formul√°rios no mesmo documento. Componentes sincronizados podem ser reutilizados e atualizados em todas as p√°ginas, sem perder vers√µes, assinaturas, importa√ß√£o ou exporta√ß√£o.",
  },
  {
    id: "2026-07-29-portal-cliente",
    date: "2026-07-29",
    title: "Portal individual e restrito para cada cliente",
    description:
      "Escolha exatamente quais projetos, tarefas, documentos, relat√≥rios, or√ßamentos, pedidos e entregas cada cliente poder√° acessar. O portal recebe aprova√ß√µes de entregas, chamados e documentos com protocolo, link revog√°vel, validade opcional e trilha autenticada para a equipe.",
  },
  {
    id: "2026-07-29-formularios-publicos",
    date: "2026-07-29",
    title: "Formul√°rios p√∫blicos que j√° entram na opera√ß√£o",
    description:
      "Publique por link ou incorpore no site, use campos condicionais, anexos, assinatura e Pix ou link de pagamento. Cada envio recebe protocolo e pode virar tarefa, lead, chamado ou caso de um processo, sem copiar respostas para o espa√ßo de sincroniza√ß√£o.",
  },
  {
    id: "2026-07-29-chat-corporativo",
    date: "2026-07-29",
    title: "Chat corporativo conectado ao trabalho",
    description:
      "Crie canais para toda a empresa, grupos privados e mensagens diretas. Responda em threads, mencione pessoas, reaja, anexe arquivos, fixe decis√µes, encontre mensagens, transforme qualquer mensagem em tarefa e gere um resumo da conversa com IA.",
  },
  {
    id: "2026-07-29-dashboards-configuraveis",
    date: "2026-07-29",
    title: "Dashboards que cada pessoa pode montar",
    description:
      "Crie e duplique pain√©is, escolha os indicadores, altere o tamanho e a ordem dos cards e filtre por per√≠odo ou projeto. Receita, margem, metas, atrasos, risco, capacidade, SLA, emiss√µes e log√≠stica usam os dados reais j√° registrados na empresa.",
  },
  {
    id: "2026-07-29-caixa-pessoal",
    date: "2026-07-29",
    title: "Uma caixa pessoal para tudo que pede sua aten√ß√£o",
    description:
      "Men√ß√µes, tarefas atribu√≠das, coment√°rios, aprova√ß√µes e altera√ß√µes importantes agora aparecem agrupadas na Caixa de entrada. Voc√™ pode marcar itens ou grupos como lidos e adiar o que ficar√° para amanh√£ ou para a pr√≥xima semana.",
  },
  {
    id: "2026-07-29-processos-formularios",
    date: "2026-07-29",
    title: "Processos, formul√°rios, aprova√ß√µes e SLAs",
    description:
      "Crie processos com etapas configur√°veis, receba solicita√ß√µes por formul√°rio, acompanhe protocolos em quadro e controle aprova√ß√µes e prazos. Cada processo funciona sozinho e pode, opcionalmente, gravar a resposta em uma base e criar uma tarefa.",
  },
  {
    id: "2026-07-28-automacoes-servidor",
    date: "2026-07-28",
    title: "Automa√ß√µes continuam trabalhando com o app fechado",
    description:
      "As regras semanais e mensais agora s√£o verificadas de hora em hora no servidor. Cada execu√ß√£o cria a tarefa ou o lembrete uma √∫nica vez, mant√©m hist√≥rico e preserva uma vers√£o anterior dos dados.",
  },
  {
    id: "2026-07-28-compras-backups",
    date: "2026-07-28",
    title: "Compras, cota√ß√µes e recupera√ß√£o de vers√µes",
    description:
      "Compare propostas de fornecedores por item, registre a melhor oferta e exporte o mapa de cota√ß√£o. Em Configura√ß√µes, tamb√©m √© poss√≠vel consultar e restaurar vers√µes anteriores do espa√ßo.",
  },
  {
    id: "2026-07-20-resumo-semanal",
    date: "2026-07-20",
    title: "Resumo da semana no in√≠cio e por notifica√ß√£o",
    description:
      "O painel In√≠cio agora mostra o resumo da sua semana ‚Äî vendas, entradas em caixa, tarefas conclu√≠das e novos contatos. Com as notifica√ß√µes do navegador ativadas, voc√™ recebe esse resumo toda segunda-feira, mesmo com o app fechado.",
  },
  {
    id: "2026-07-20-whatsapp",
    date: "2026-07-20",
    title: "Modelos de mensagem do WhatsApp",
    description:
      "Crie mensagens prontas com vari√°veis (nome, valor, pedido...) em Ferramentas. Ao enviar um WhatsApp por um lead, contato, pedido ou agendamento, o app preenche tudo automaticamente ‚Äî voc√™ s√≥ revisa e manda.",
  },
  {
    id: "2026-07-20-das",
    date: "2026-07-20",
    title: "Controle do DAS do MEI com lembrete autom√°tico",
    description:
      "Ative 'Sou MEI' no Financeiro para acompanhar o pagamento da guia m√™s a m√™s e receber um aviso autom√°tico antes do vencimento (todo dia 20) ‚Äî inclusive no navegador, com as notifica√ß√µes ativadas.",
  },
  {
    id: "2026-07-19-busca",
    date: "2026-07-19",
    title: "Busca agora encontra tarefas, leads, documentos e contatos",
    description:
      "O Buscar em tudo (Ctrl+K) deixou de procurar s√≥ nomes de se√ß√£o do menu ‚Äî agora encontra o que est√° dentro delas tamb√©m, e leva direto para o registro.",
  },
  {
    id: "2026-07-19-toque-kanban",
    date: "2026-07-19",
    title: "Arrastar tarefas no Kanban funciona no celular",
    description:
      "Pressione e segure um cart√£o para arrast√°-lo entre colunas tamb√©m em telas de toque, n√£o s√≥ no computador.",
  },
  {
    id: "2026-07-19-anexo-ampliado",
    date: "2026-07-19",
    title: "Anexos com visualiza√ß√£o ampliada",
    description:
      "Clique na miniatura de uma imagem anexada a uma tarefa ou entrega para v√™-la em tamanho grande.",
  },
  {
    id: "2026-07-19-recorrencia",
    date: "2026-07-19",
    title: "Tarefas recorrentes",
    description:
      "Configure uma tarefa para repetir todo dia, toda semana ou todo m√™s ‚Äî a pr√≥xima ocorr√™ncia √© criada sozinha quando voc√™ conclui a atual.",
  },
  {
    id: "2026-07-19-calendario",
    date: "2026-07-19",
    title: "Vis√£o de calend√°rio para tarefas",
    description:
      "Al√©m de quadro e lista, veja suas tarefas com prazo num calend√°rio mensal naveg√°vel.",
  },
  {
    id: "2026-07-19-lote",
    date: "2026-07-19",
    title: "A√ß√µes em lote em tarefas",
    description:
      "Selecione v√°rias tarefas de uma vez na vis√£o em Lista para arquivar ou reatribuir juntas.",
  },
  {
    id: "2026-07-18-compartilhamento",
    date: "2026-07-18",
    title: "Compartilhamento opcional em Agendamentos, Produtos e Frota",
    description:
      "Essas √°reas continuam vis√≠veis para todo o espa√ßo por padr√£o, mas agora d√° para restringir uma tarefa, produto ou ve√≠culo espec√≠fico se precisar.",
  },
  {
    id: "2026-07-17-equipes",
    date: "2026-07-17",
    title: "Equipes, projetos e conquistas",
    description:
      "Organize colaboradores em equipes, agrupe tarefas por projeto e acompanhe pontos, n√≠veis e conquistas de cada pessoa.",
  },
];

// Gamifica√ß√£o, "meu trabalho" e painel de resultados foram movidos para
// src/domain.js (camada de l√≥gica pura). Importados e reexportados no topo.

export const businessDaysBetween = (fromYmd, toYmd) => {
  const [fy, fm, fd] = String(fromYmd || "").split("-").map(Number);
  const [ty, tm, td] = String(toYmd || "").split("-").map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return null;
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  if (from.getTime() === to.getTime()) return 0;
  const step = to > from ? 1 : -1;
  let count = 0;
  const cursor = new Date(from);
  while (cursor.getTime() !== to.getTime()) {
    cursor.setDate(cursor.getDate() + step);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += step;
  }
  return count;
};

const localDateTimeParts = (ymd, hm, addMinutes = 0) => {
  const [y, mo, d] = String(ymd || "").split("-").map(Number);
  const [h, mi] = String(hm || "0:0").split(":").map(Number);
  if (!y || !mo || !d) return null;
  const dt = new Date(y, mo - 1, d, h || 0, (mi || 0) + addMinutes);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    y: dt.getFullYear(),
    mo: pad(dt.getMonth() + 1),
    d: pad(dt.getDate()),
    h: pad(dt.getHours()),
    mi: pad(dt.getMinutes()),
  };
};

const taskCalendarDetails = (task) =>
  [
    task.description,
    task.project ? `Projeto: ${task.project}` : "",
    task.assignee ? `Respons\u00e1vel: ${task.assignee}` : "",
  ]
    .filter(Boolean)
    .join("\n");

export const googleCalendarUrl = (task) => {
  if (!task?.due) return "";
  const text = encodeURIComponent(task.title || "Tarefa");
  const details = encodeURIComponent(taskCalendarDetails(task));
  if (task.time) {
    const s = localDateTimeParts(task.due, task.time, 0);
    const e = localDateTimeParts(task.due, task.time, task.durationMinutes || 60);
    if (!s || !e) return "";
    const start = `${s.y}${s.mo}${s.d}T${s.h}${s.mi}00`;
    const end = `${e.y}${e.mo}${e.d}T${e.h}${e.mi}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
  }
  const start = addDaysYmd(task.due, 0);
  const end = addDaysYmd(task.due, 1);
  if (!start || !end) return "";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
};

let gsiLoadPromise = null;
const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise((resolve, reject) => {
    const ready = () =>
      window.google?.accounts?.oauth2
        ? resolve()
        : reject(new Error("Login do Google indispon√≠vel."));
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
    s.onerror = () => reject(new Error("N√£o foi poss√≠vel carregar o login do Google."));
    document.body.appendChild(s);
  });
  return gsiLoadPromise;
};

export const requestGoogleAccessToken = async (clientId, scope) => {
  if (!clientId)
    throw new Error("Conex√£o com o Google ainda n√£o est√° configurada.");
  await loadGoogleIdentityScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp) => {
        if (resp?.error) reject(new Error("Permiss√£o do Google negada."));
        else resolve(resp.access_token);
      },
      error_callback: () => reject(new Error("N√£o foi poss√≠vel conectar com o Google.")),
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
    throw new Error(data.error?.message || "N√£o foi poss√≠vel enviar o e-mail agora.");
  }
  return res.json();
};

export const createGoogleCalendarEventReal = async (clientId, task) => {
  const token = await requestGoogleAccessToken(
    clientId,
    "https://www.googleapis.com/auth/calendar.events",
  );
  const details = taskCalendarDetails(task);
  let body;
  if (task.time) {
    const s = localDateTimeParts(task.due, task.time, 0);
    const e = localDateTimeParts(task.due, task.time, task.durationMinutes || 60);
    if (!s || !e) throw new Error("Data ou hora do compromisso inv√°lida.");
    body = {
      summary: task.title || "Tarefa",
      description: details,
      start: {
        dateTime: `${s.y}-${s.mo}-${s.d}T${s.h}:${s.mi}:00`,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: `${e.y}-${e.mo}-${e.d}T${e.h}:${e.mi}:00`,
        timeZone: "America/Sao_Paulo",
      },
    };
  } else {
    body = {
      summary: task.title || "Tarefa",
      description: details,
      start: { date: addDaysYmdDashed(task.due, 0) },
      end: { date: addDaysYmdDashed(task.due, 1) },
    };
  }
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "N√£o foi poss√≠vel criar o evento agora.");
  }
  return res.json();
};

const userStorageKey = (id) => `${STORAGE_PREFIX}${id}`;
const WORKSPACE_REVISION_PREFIX = "sf-workspace-revision:";
const WORKSPACE_CONFLICT_PREFIX = "sf-workspace-conflict:";

export function readWorkspaceRevision(spaceKey) {
  try {
    const value = Number(
      localStorage.getItem(`${WORKSPACE_REVISION_PREFIX}${spaceKey}`),
    );
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function storeWorkspaceRevision(spaceKey, revision) {
  try {
    localStorage.setItem(
      `${WORKSPACE_REVISION_PREFIX}${spaceKey}`,
      String(revision),
    );
  } catch {}
}

function preserveWorkspaceConflict(spaceKey, data, baseRevision, conflict) {
  try {
    localStorage.setItem(
      `${WORKSPACE_CONFLICT_PREFIX}${spaceKey}`,
      JSON.stringify({
        data,
        baseRevision,
        serverRevision: conflict.serverRevision,
        serverUpdatedAt: conflict.serverUpdatedAt,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {}
}
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

export const parseDelimitedText = (text) => {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter =
    (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length
      ? ";"
      : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  const headers = rows[0].map(normalize);
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])),
  );
};

export const parseOfxTransactions = (text) => {
  const source = String(text || "");
  const blocks = source.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || [];
  const field = (block, name) => {
    const match = block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"));
    return match ? match[1].trim() : "";
  };
  return blocks
    .map((block) => {
      const amount = Number(field(block, "TRNAMT").replace(",", "."));
      const rawDate = field(block, "DTPOSTED").slice(0, 8);
      return {
        fitId: field(block, "FITID"),
        type: amount >= 0 ? "Receita" : "Despesa",
        value: Math.abs(amount),
        date: /^\d{8}$/.test(rawDate)
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : "",
        description:
          field(block, "MEMO") || field(block, "NAME") || "Movimenta√ß√£o banc√°ria",
        category: "Importado do banco",
      };
    })
    .filter((item) => item.value > 0 && item.date);
};

export const nextBestAction = (data, business, userId, ymdValue = today()) => {
  const businessMatches = (item) =>
    !business || !item?.businessId || item.businessId === business.id;
  const tasks = (data?.tasks || [])
    .filter((item) => item?.status !== "Conclu√≠do" && businessMatches(item))
    .filter(
      (item) =>
        !item.assigneeId ||
        item.assigneeId === userId ||
        item.ownerId === userId ||
        (item.assignees || []).some((person) => person?.userId === userId),
    )
    .sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")));
  const overdue = tasks.find((item) => item.due && item.due < ymdValue);
  if (overdue)
    return {
      tone: "danger",
      eyebrow: "PRECISA DE ATEN√á√ÉO",
      title: overdue.title,
      text: `O prazo era ${overdue.due}. Abra a tarefa para concluir, ajustar o prazo ou pedir orienta√ß√£o.`,
      action: "Abrir tarefa",
      page: "operacao",
    };
  const dueToday = tasks.find((item) => item.due === ymdValue);
  if (dueToday)
    return {
      tone: "warning",
      eyebrow: "PRIORIDADE DE HOJE",
      title: dueToday.title,
      text: dueToday.instructions || dueToday.description || "Conclua esta a√ß√£o para manter o plano em movimento.",
      action: "Continuar agora",
      page: "operacao",
    };
  const followup = (data?.leads || []).find(
    (item) =>
      businessMatches(item) &&
      item.status !== "Ganho" &&
      item.status !== "Perdido" &&
      typeof item.next === "string" &&
      item.next.slice(0, 10) <= ymdValue,
  );
  if (followup)
    return {
      tone: "warning",
      eyebrow: "CLIENTE PARA ACOMPANHAR",
      title: `Retomar contato com ${followup.name || "este cliente"}`,
      text: followup.next || "Existe um acompanhamento pendente no CRM.",
      action: "Abrir CRM",
      page: "vendas",
    };
  const appointment = (data?.appointments || [])
    .filter((item) => businessMatches(item) && item.date === ymdValue)
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))[0];
  if (appointment)
    return {
      tone: "default",
      eyebrow: "PR√ìXIMO COMPROMISSO",
      title: appointment.title || appointment.client || "Compromisso de hoje",
      text: appointment.time ? `Marcado para ${appointment.time}.` : "Confira os detalhes na agenda.",
      action: "Abrir agenda",
      page: "agendamentos",
    };
  if (tasks[0])
    return {
      tone: "default",
      eyebrow: "PR√ìXIMA A√á√ÉO",
      title: tasks[0].title,
      text: tasks[0].instructions || tasks[0].description || "Uma pequena entrega agora mant√©m seu plano avan√ßando.",
      action: "Continuar",
      page: "operacao",
    };
  return {
    tone: "default",
    eyebrow: "COMECE AGORA",
    title: business?.weeklyGoal || business?.goal || "Escolha um resultado para esta semana",
    text: "Transforme o resultado em uma tarefa pequena, com prazo e crit√©rio de conclus√£o.",
    action: "Criar uma a√ß√£o",
    page: "operacao",
  };
};

const aiWorkspaceContext = (business) => ({
  workspaceOwnerId: activeSpaceId() || undefined,
  businessId: business?.id || undefined,
});

export const trackProductEvent = (event, metadata = {}) => {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return;
  const space = activeSpaceId();
  fetch(`/api/events${space ? `?owner=${encodeURIComponent(space)}` : ""}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ event, metadata }),
    keepalive: true,
  }).catch(() => {});
};

const inboxUrl = () => {
  const space = activeSpaceId();
  return `/api/inbox${space ? `?owner=${encodeURIComponent(space)}` : ""}`;
};

// Registra uma intera√ß√£o (mensagem enviada/recebida, liga√ß√£o, nota) na caixa
// de entrada unificada. Chamado nos pontos de envio (WhatsApp, e-mail) para
// que todo canal caia num s√≥ lugar, ligado ao contato.
export const logInteraction = (interaction) => {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return Promise.resolve(null);
  return fetch(inboxUrl(), {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(interaction),
    keepalive: true,
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
};

// Jornada transversal: um pedido registrado vira, opcionalmente, uma receita
// no caixa ‚Äî para o neg√≥cio n√£o precisar digitar a mesma venda duas vezes.
// Pura e test√°vel; devolve null quando n√£o h√° valor a lan√ßar.
export const buildOrderReceita = (order, { businessId, ownerId, dateYmd } = {}) => {
  const value = Number(order?.total || 0);
  if (!(value > 0)) return null;
  return {
    id: uid(),
    type: "Receita",
    description: `Pedido ‚Äî ${order.clientName || "cliente"}`,
    value,
    date: dateYmd || today(),
    category: "Vendas",
    businessId: businessId || null,
    ownerId: ownerId || null,
    sourceOrderId: order.id || null,
  };
};

// Jornada transversal: quando um lead √© marcado como "Ganho", o neg√≥cio
// ganha uma tarefa de primeiro atendimento (Vendas ‚Üí Opera√ß√£o) e um registro
// na linha do tempo do cliente. Puro e test√°vel.
export const buildLeadWonSideEffects = (lead, { businessId, ownerId, dateYmd } = {}) => {
  const now = new Date().toISOString();
  const handle =
    contactLinks(lead?.contact).phone ||
    contactLinks(lead?.contact).email ||
    lead?.contact ||
    "";
  const task = {
    id: uid(),
    title: `Iniciar atendimento ‚Äî ${lead?.name || "novo cliente"}`,
    description:
      "Neg√≥cio fechado no CRM. Fa√ßa o primeiro atendimento e combine os pr√≥ximos passos.",
    status: "A fazer",
    priority: "Alta",
    due: dateYmd || today(),
    project: lead?.project || "",
    businessId: businessId || null,
    ownerId: ownerId || null,
    sourceLeadId: lead?.id || null,
    createdAt: now,
    updatedAt: now,
  };
  const interaction = {
    channel: "note",
    direction: "out",
    contactName: lead?.name || "",
    contactHandle: handle,
    subject: "Neg√≥cio ganho",
    body: "Lead convertido em cliente. Uma tarefa de primeiro atendimento foi criada automaticamente.",
  };
  return { task, interaction };
};

// Total de um or√ßamento: soma das linhas menos desconto (nunca negativo).
export const quoteTotal = (quote) => {
  const items = (quote?.items || []).reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0,
  );
  const discount = Number(quote?.discount) || 0;
  return Math.max(0, items - discount);
};

// Jornada transversal: um or√ßamento aprovado vira um pedido (que, por sua vez,
// j√° lan√ßa receita e linha do tempo via buildOrderReceita). Puro e test√°vel.
export const orderFromQuote = (quote, { businessId, ownerId } = {}) => {
  const now = new Date().toISOString();
  return {
    id: uid(),
    clientName: quote?.clientName || "",
    clientContact: quote?.clientContact || "",
    channel: "Or√ßamento",
    status: "Novo",
    items: (quote?.items || []).map((i) => ({
      productId: i.productId || "",
      name: i.name || "",
      price: Number(i.price) || 0,
      quantity: Number(i.quantity) || 1,
    })),
    notes: quote?.notes || "",
    total: quoteTotal(quote),
    businessId: businessId || null,
    ownerId: ownerId || null,
    sourceQuoteId: quote?.id || null,
    visibility: quote?.visibility || "espaco_todo",
    sharedWith: Array.isArray(quote?.sharedWith) ? quote.sharedWith : [],
    sharedTeams: Array.isArray(quote?.sharedTeams) ? quote.sharedTeams : [],
    createdAt: now,
    updatedAt: now,
  };
};

function useDatabase() {
  const [db, setDb] = useState(loadInitialDb);
  const [workspaceConflict, setWorkspaceConflict] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const syncTimer = useRef(null);
  const syncChain = useRef(Promise.resolve());
  const pulled = useRef(false);
  const skipSyncDb = useRef(null);
  const revisionRef = useRef(0);
  const conflictRef = useRef(false);
  const authInvalidRef = useRef(false);
  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);
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
    conflictRef.current = false;
    authInvalidRef.current = false;
    const resetTimer = setTimeout(() => {
      setWorkspaceConflict(null);
      setSyncError(null);
    }, 0);
    if (!userId || !localStorage.getItem(AUTH_TOKEN_KEY))
      return () => clearTimeout(resetTimer);
    const localRevision = readWorkspaceRevision(spaceKey);
    revisionRef.current = localRevision;
    let cancelled = false;
    fetch(wsUrl, { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || payload === null) return;
        const serverRevision =
          Number.isInteger(payload.revision) && payload.revision >= 0
            ? payload.revision
            : 0;
        const current = dbRef.current;
        const foreign = current.spaceKey && current.spaceKey !== spaceKey;
        const localNewer =
          !foreign &&
          current.updatedAt &&
          payload.updatedAt &&
          current.updatedAt > payload.updatedAt;
        if (payload.data && localNewer && localRevision !== serverRevision) {
          const conflict = {
            error:
              "Existem altera√ß√µes mais recentes neste espa√ßo feitas em outra aba ou dispositivo.",
            serverRevision,
            serverUpdatedAt: payload.updatedAt,
          };
          const { user: _user, spaceKey: _space, ...localData } = current;
          preserveWorkspaceConflict(
            spaceKey,
            localData,
            localRevision,
            conflict,
          );
          conflictRef.current = true;
          setWorkspaceConflict(conflict);
          setDb({ ...current, spaceKey });
          pulled.current = true;
          return;
        }
        revisionRef.current = serverRevision;
        storeWorkspaceRevision(spaceKey, serverRevision);
        setDb((current) => {
          const foreign = current.spaceKey && current.spaceKey !== spaceKey;
          if (payload.data) {
            const localNewer =
              !foreign &&
              current.updatedAt &&
              payload.updatedAt &&
              current.updatedAt > payload.updatedAt;
            if (localNewer) return { ...current, spaceKey };
            const next = {
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
            skipSyncDb.current = next;
            return next;
          }
          if (foreign) {
            const next = { ...emptyDb, user: current.user, spaceKey };
            skipSyncDb.current = next;
            return next;
          }
          return { ...current, spaceKey };
        });
        pulled.current = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(resetTimer);
    };
  }, [userId, space, spaceKey, wsUrl]);

  const performSync = useCallback(async () => {
    if (conflictRef.current || authInvalidRef.current) return false;
    const { user: _user, spaceKey: _s, ...rest } = dbRef.current;
    const data = {
      ...rest,
      media: (rest.media || []).map((item) =>
        item.url && item.url.startsWith("data:")
          ? { ...item, url: null, localOnly: true }
          : item,
      ),
    };
    setSyncing(true);
    try {
      const baseRevision = revisionRef.current;
      const response = await fetch(wsUrl, {
        method: "PUT",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ data, revision: baseRevision }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409) {
        preserveWorkspaceConflict(spaceKey, data, baseRevision, payload);
        conflictRef.current = true;
        setWorkspaceConflict(payload);
        return false;
      }
      if (response.status === 401) {
        authInvalidRef.current = true;
        setSyncError({
          code: "auth",
          message:
            "Sua sess√£o expirou. Suas √∫ltimas altera√ß√µes continuam salvas neste navegador ‚Äî entre novamente para voltar a sincronizar.",
        });
        return false;
      }
      if (!response.ok) {
        setSyncError({
          code: "server",
          message:
            "N√£o foi poss√≠vel salvar suas √∫ltimas altera√ß√µes agora. Vamos tentar de novo.",
        });
        return false;
      }
      const revision = Number(payload.revision);
      if (Number.isInteger(revision) && revision >= 0) {
        revisionRef.current = revision;
        storeWorkspaceRevision(spaceKey, revision);
      }
      setSyncError(null);
      return true;
    } catch {
      setSyncError({
        code: "network",
        message:
          "Voc√™ est√° sem conex√£o. Suas altera√ß√µes ser√£o sincronizadas assim que a internet voltar.",
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [spaceKey, wsUrl]);

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
    if (skipSyncDb.current === db) {
      skipSyncDb.current = null;
      return;
    }
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (conflictRef.current || authInvalidRef.current) return;
      syncChain.current = syncChain.current
        .catch(() => {})
        .then(performSync)
        .catch(() => {});
    }, 2500);
    return () => clearTimeout(syncTimer.current);
  }, [db, userId, space, spaceKey, performSync]);

  const retrySync = () => {
    syncChain.current = syncChain.current
      .catch(() => {})
      .then(performSync)
      .catch(() => {});
  };
  const logoutFromExpiredSession = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    setDb(cleanDb(null));
  };

  const workspaceAction = async (action, taskId) => {
    clearTimeout(syncTimer.current);
    await syncChain.current.catch(() => {});
    const synced = await performSync();
    if (!synced)
      throw new Error(
        "N√£o foi poss√≠vel salvar suas altera√ß√µes antes desta a√ß√£o.",
      );
    const response = await fetch(
      `/api/tasks/action${space ? `?owner=${encodeURIComponent(space)}` : ""}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action, taskId }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(payload.error || "N√£o foi poss√≠vel atualizar esta tarefa.");
    const revision = Number(payload.revision);
    if (Number.isInteger(revision) && revision >= 0) {
      revisionRef.current = revision;
      storeWorkspaceRevision(spaceKey, revision);
    }
    if (payload.task) {
      setDb((current) => {
        const next = {
          ...current,
          tasks: (current.tasks || []).map((task) =>
            task.id === payload.task.id ? payload.task : task,
          ),
          updatedAt: payload.updatedAt || new Date().toISOString(),
        };
        skipSyncDb.current = next;
        return next;
      });
    }
    return payload;
  };

  const update = (fn) =>
    setDb((current) => {
      const next =
        typeof fn === "function" ? fn(current) : { ...current, ...fn };
      return { ...next, updatedAt: new Date().toISOString() };
    });
  return [
    db,
    update,
    workspaceConflict,
    syncing,
    syncError,
    retrySync,
    logoutFromExpiredSession,
    workspaceAction,
  ];
}

function WhatsappSendModal({ templates, payload, onClose, onSent }) {
  const list = templates && templates.length ? templates : DEFAULT_WA_TEMPLATES;
  const preferred =
    list.find((t) => t.category === payload.category) || list[0];
  const [templateId, setTemplateId] = useState(preferred?.id || "");
  const selected = list.find((t) => t.id === templateId) || preferred;
  const [text, setText] = useState(
    fillWhatsappTemplate(selected?.body || "", payload.vars),
  );
  const pickTemplate = (id) => {
    setTemplateId(id);
    const tpl = list.find((t) => t.id === id);
    setText(fillWhatsappTemplate(tpl?.body || "", payload.vars));
  };
  const send = () => {
    window.open(
      whatsappLink(payload.phone, text.trim()),
      "_blank",
      "noopener",
    );
    onSent?.(text.trim());
    onClose();
  };
  return (
    <Modal title="Enviar pelo WhatsApp" onClose={onClose}>
      <div className="wa-send">
        <Field label="Modelo">
          <select value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
            {list.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mensagem" hint="Voc√™ pode editar antes de enviar.">
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <div className="wa-send-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={Send} disabled={!text.trim()} onClick={send}>
            Abrir no WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Hook reutiliz√°vel: cada p√°gina que envia WhatsApp instancia isto, chama
// open({ phone, category, vars }) no clique e renderiza `modal` no JSX.
function useWhatsappSender({ db, setToast }) {
  const [payload, setPayload] = useState(null);
  const templates =
    db.waTemplates && db.waTemplates.length
      ? db.waTemplates
      : DEFAULT_WA_TEMPLATES;
  const open = (p) => {
    if (!p || !p.phone) {
      setToast?.("Este contato n√£o tem um n√∫mero de WhatsApp v√°lido.");
      return;
    }
    setPayload(p);
  };
  const modal = payload ? (
    <WhatsappSendModal
      templates={templates}
      payload={payload}
      onClose={() => setPayload(null)}
      onSent={(text) =>
        logInteraction({
          channel: "whatsapp",
          direction: "out",
          contactId: payload.contactId || "",
          contactName:
            payload.contactName ||
            payload.vars?.nome ||
            payload.vars?.cliente ||
            payload.vars?.name ||
            "",
          contactHandle: payload.phone || "",
          body: text,
        })
      }
    />
  ) : null;
  return { open, modal };
}

function SharingFields({
  value,
  onChange,
  teams,
  disabled,
  disabledHint,
  projectOptions,
  hideProjectField,
}) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const space = activeSpaceId();
    fetch(`/api/collab${space ? `?owner=${encodeURIComponent(space)}` : ""}`, {
      headers: authHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setMembers(d?.members || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const visibility = value.visibility || "privado";
  const togglePerson = (id) => {
    const current = value.sharedWith || [];
    onChange({
      ...value,
      sharedWith: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    });
  };
  const toggleTeam = (id) => {
    const current = value.sharedTeams || [];
    onChange({
      ...value,
      sharedTeams: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    });
  };
  if (disabled) {
    return (
      <div className="field">
        <span>Visibilidade</span>
        <small>{disabledHint || "Definida automaticamente."}</small>
      </div>
    );
  }
  return (
    <>
      <Field label="Visibilidade">
        <select
          value={visibility}
          onChange={(e) => onChange({ ...value, visibility: e.target.value })}
        >
          <option value="privado">Privado (s√≥ eu)</option>
          <option value="pessoas">Compartilhado com pessoas selecionadas</option>
          <option value="equipe">Compartilhado com uma equipe</option>
          <option value="projeto">Compartilhado com participantes do projeto</option>
          <option value="espaco_todo">Vis√≠vel para todo o espa√ßo</option>
        </select>
      </Field>
      {visibility !== "privado" && (
        <Field
          label="Permiss√£o de quem recebe acesso"
          hint="Visualizar n√£o permite alterar, excluir, publicar ou compartilhar novamente."
        >
          <select
            value={value.sharingPermission || "visualizar"}
            onChange={(e) =>
              onChange({ ...value, sharingPermission: e.target.value })
            }
          >
            <option value="visualizar">Somente visualizar</option>
            <option value="editar">Pode visualizar e editar</option>
          </select>
        </Field>
      )}
      {visibility === "pessoas" && (
        <div className="field">
          <span>Compartilhar com</span>
          {members.length === 0 ? (
            <small>Convide colaboradores em Meu Time para compartilhar.</small>
          ) : (
            <div className="checkbox-list">
              {members.map((m) => (
                <label key={m.id} className="cost-check">
                  <input
                    type="checkbox"
                    checked={(value.sharedWith || []).includes(m.id)}
                    onChange={() => togglePerson(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      {visibility === "equipe" && (
        <div className="field">
          <span>Equipe</span>
          {(teams || []).length === 0 ? (
            <small>Nenhuma equipe criada ainda. Crie uma em Meu Time.</small>
          ) : (
            <div className="checkbox-list">
              {teams.map((t) => (
                <label key={t.id} className="cost-check">
                  <input
                    type="checkbox"
                    checked={(value.sharedTeams || []).includes(t.id)}
                    onChange={() => toggleTeam(t.id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      {visibility === "projeto" && !hideProjectField && (
        <Field
          label="Projeto"
          hint="Quem participa de tarefas com o mesmo nome de projeto tamb√©m ver√° este item."
        >
          <input
            list={projectOptions?.length ? "sharing-project-options" : undefined}
            value={value.project || ""}
            onChange={(e) => onChange({ ...value, project: e.target.value })}
            placeholder="Nome do projeto"
          />
        </Field>
      )}
      {visibility === "projeto" && hideProjectField && (
        <div className="field">
          <small>
            Use o campo Projeto acima ‚Äî quem participa de outras tarefas com o
            mesmo nome tamb√©m ver√° este item.
          </small>
        </div>
      )}
      {!hideProjectField && projectOptions?.length > 0 && (
        <datalist id="sharing-project-options">
          {projectOptions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      )}
    </>
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

function AppUpdate({ visible, latestVersion }) {
  return visible ? (
    <div className="app-update" role="status" aria-live="polite">
      <span>
        <RefreshCw size={18} />
        <strong>Uma nova vers√£o est√° pronta.</strong>
        {latestVersion
          ? `Vers√£o ${latestVersion} dispon√≠vel.`
          : "Atualize para receber as melhorias sem perder seus dados."}
      </span>
      <button type="button" onClick={() => location.reload()}>
        Atualizar agora
      </button>
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
    const listStart = line.match(/^\s*([-*‚Ä¢]|\d+[.)])\s+/);
    if (listStart) {
      flush();
      const ordered = /^\d/.test(listStart[1]);
      const items = [];
      while (i < lines.length) {
        const item = lines[i].match(/^\s*(?:[-*‚Ä¢]|\d+[.)])\s+(.*)/);
        if (!item) break;
        items.push(
          item[1].replace(/^\[ \]\s*/, "‚òê ").replace(/^\[x\]\s*/i, "‚òë "),
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

function ModeOnboarding({ update }) {
  const choose = (mode) => {
    update((d) => ({
      ...d,
      onboarding: mode === "employee" ? true : d.onboarding,
      preferences: {
        ...d.preferences,
        mode,
        modeChosen: true,
        needsBusinessOnboarding:
          mode === "business" &&
          d.preferences.needsBusinessOnboardingCandidate === true,
        needsBusinessOnboardingCandidate: false,
      },
    }));
    trackProductEvent("action_completed", {
      module: "onboarding",
      kind: "mode_selected",
      mode,
    });
  };
  return (
    <main className="onboarding">
      <header>
        <Logo />
      </header>
      <div className="onboard-card mode-onboard-card">
        <h1>Como voc√™ pretende usar o Seu Funcion√°rio?</h1>
        <p>Voc√™ pode mudar isso quando quiser em Configura√ß√µes.</p>
        <div className="option-grid mode-option-grid">
          <button
            type="button"
            aria-label="Para administrar meu neg√≥cio"
            onClick={() => choose("business")}
          >
            <BriefcaseBusiness />
            <span>
              <strong>Para administrar meu neg√≥cio</strong>
              <small>
                CRM, produtos, pedidos, financeiro, sites e faturamento para
                quem toca uma empresa ou trabalha por conta pr√≥pria.
              </small>
            </span>
          </button>
          <button
            type="button"
            aria-label="Para me ajudar no meu trabalho"
            onClick={() => choose("employee")}
          >
            <UserRound />
            <span>
              <strong>Para me ajudar no meu trabalho</strong>
              <small>
                Tarefas, agenda, documentos e especialistas de IA para quem
                trabalha dentro de outra empresa.
              </small>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}

function Login({ update }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleId, setGoogleId] = useState("");
  const [showLegal, setShowLegal] = useState(false);
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
          update(() => {
            const session = startUserSession(d.user);
            return {
              ...session,
              preferences: {
                ...session.preferences,
                needsBusinessOnboardingCandidate:
                  d.created === true || d.isNew === true,
              },
            };
          });
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
  }, [googleId, update]);
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState("");
  const changeMode = (next) => {
    setMode(next);
    setError("");
    setForm((current) => ({ ...current, password: "" }));
  };
  const enter = (data, newAccount = false) => {
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    update(() => {
      const session = startUserSession(data.user);
      return {
        ...session,
        preferences: {
          ...session.preferences,
          needsBusinessOnboardingCandidate: newAccount,
        },
      };
    });
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError("Informe um e-mail v√°lido.");
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
        throw new Error(data.error || "N√£o foi poss√≠vel acessar sua conta.");
      if (data.pending) {
        setPending(data.email);
        setCode("");
        return;
      }
      enter(data, mode === "register");
    } catch (reason) {
      setError(
        reason.message === "Failed to fetch"
          ? "N√£o foi poss√≠vel conectar ao servidor. Tente novamente."
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
        throw new Error(data.error || "N√£o foi poss√≠vel confirmar o c√≥digo.");
      enter(data, mode === "register");
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
      if (!r.ok) throw new Error(data.error || "N√£o foi poss√≠vel reenviar.");
      setError("Novo c√≥digo enviado. Confira seu e-mail.");
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
        throw new Error(data.error || "N√£o foi poss√≠vel enviar o c√≥digo.");
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
    if (code.length < 6) return setError("Digite o c√≥digo de 6 d√≠gitos.");
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
        throw new Error(data.error || "N√£o foi poss√≠vel redefinir a senha.");
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
            Enviamos um c√≥digo de 6 d√≠gitos para{" "}
            <strong>{recover.email}</strong>. Digite o c√≥digo e escolha a nova
            senha.
          </p>
          <Field label="C√≥digo de 6 d√≠gitos">
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
          <Field label="Nova senha" hint="M√≠nimo de 8 caracteres">
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢"
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
          <span className="eyebrow">VERIFICA√á√ÉO DE E-MAIL</span>
          <h2>Confirme seu e-mail</h2>
          <p>
            Enviamos um c√≥digo de 6 d√≠gitos para <strong>{pending}</strong>.
            Digite abaixo para ativar sua conta.
          </p>
          <Field label="C√≥digo de 6 d√≠gitos">
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
            N√£o recebeu?{" "}
            <button type="button" onClick={resend}>
              Reenviar c√≥digo
            </button>{" "}
            ¬∑{" "}
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
          <span className="eyebrow light">SEU NEG√ìCIO EM MOVIMENTO</span>
          <h1>
            Tenha o funcion√°rio que sua empresa precisa,{" "}
            <em>quando precisar.</em>
          </h1>
          <p>
            Mais de 40 funcion√°rios especialistas ‚Äî estrat√©gia, jur√≠dico,
            marketing, vendas, financeiro, TI e muito mais ‚Äî coordenados por um
            Diretor de Intelig√™ncia.
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
              ? "Entre no seu espa√ßo"
              : "Crie seu espa√ßo de trabalho"}
          </h2>
          <p>
            {mode === "login"
              ? "Use o e-mail e a senha cadastrados para continuar."
              : "Crie sua conta gratuita. Nenhum cart√£o √© necess√°rio."}
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
                  placeholder="Como podemos chamar voc√™?"
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
              hint={mode === "register" ? "M√≠nimo de 8 caracteres" : undefined}
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
                placeholder="‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢"
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
              ? "Ainda n√£o tem uma conta?"
              : "J√° possui uma conta?"}{" "}
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
                ¬∑{" "}
                <button type="button" onClick={forgot} disabled={busy}>
                  Esqueci minha senha
                </button>
              </>
            )}
          </p>
          <p className="privacy">
            <ShieldCheck />
            Sua senha √© protegida com criptografia e seus projetos ficam
            sincronizados com a sua conta ‚Äî entre de qualquer dispositivo e
            continue de onde parou.
          </p>
          <p className="privacy">
            <button
              type="button"
              className="link-button"
              onClick={() => setShowLegal(true)}
            >
              Termos de Uso e Pol√≠tica de Privacidade
            </button>
          </p>
        </div>
      </div>
      {showLegal && (
        <Modal
          title="Termos de Uso e Pol√≠tica de Privacidade"
          onClose={() => setShowLegal(false)}
        >
          <LegalContent />
        </Modal>
      )}
    </main>
  );
}

function enterSharedSpace(ownerId, ownerName) {
  try {
    localStorage.setItem("sf-space", ownerId);
    localStorage.setItem("sf-space-name", ownerName || "Espa√ßo compartilhado");
  } catch {}
  history.replaceState({}, "", "/");
  location.reload();
}

function AcceptInvite({ db, update, token }) {
  const [state, setState] = useState({ status: "loading" });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(null);

  useEffect(() => {
    fetch(`/api/collab/invite-info?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return setState({ status: "error", message: d.error });
        setState({ status: "ready", invite: d });
      })
      .catch(() => setState({ status: "error", message: "N√£o foi poss√≠vel carregar o convite." }));
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/collab/invite/accept", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify(
          state.invite.hasAccount ? { token } : { token, password },
        ),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "N√£o foi poss√≠vel aceitar o convite.");
      if (d.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, d.token);
        update(() => startUserSession(d.user));
      }
      setAccepted({ ownerId: d.ownerId, ownerName: d.ownerName });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (accepted)
    return (
      <main className="auth-shell verify-shell">
        <div className="auth-card verify-card">
          <span className="mobile-logo">
            <Logo />
          </span>
          <span className="eyebrow">CONVITE ACEITO</span>
          <h2>Bem-vindo(a) ao espa√ßo de {accepted.ownerName}</h2>
          <p>Voc√™ j√° pode acessar as ferramentas e os dados liberados para voc√™.</p>
          <Button
            className="full"
            icon={ArrowUpRight}
            onClick={() => enterSharedSpace(accepted.ownerId, accepted.ownerName)}
          >
            Entrar no espa√ßo
          </Button>
        </div>
      </main>
    );

  if (state.status === "loading")
    return (
      <main className="auth-shell verify-shell">
        <div className="auth-card verify-card">
          <span className="mobile-logo">
            <Logo />
          </span>
          <p>Carregando convite...</p>
        </div>
      </main>
    );

  if (state.status === "error")
    return (
      <main className="auth-shell verify-shell">
        <div className="auth-card verify-card">
          <span className="mobile-logo">
            <Logo />
          </span>
          <span className="eyebrow">CONVITE</span>
          <h2>N√£o foi poss√≠vel abrir este convite</h2>
          <div className="auth-error" role="alert">
            <CircleAlert />
            {state.message}
          </div>
          <p className="auth-switch">
            <a href="/">Voltar para o in√≠cio</a>
          </p>
        </div>
      </main>
    );

  const invite = state.invite;
  const wrongAccount =
    db.user && invite.hasAccount && db.user.email !== invite.email;
  const rightAccount =
    db.user && invite.hasAccount && db.user.email === invite.email;

  return (
    <main className="auth-shell verify-shell">
      <div className="auth-card verify-card">
        <span className="mobile-logo">
          <Logo />
        </span>
        <span className="eyebrow">CONVITE DE {invite.ownerName.toUpperCase()}</span>
        <h2>Voc√™ foi convidado(a) como {ROLE_LABELS_PT[invite.role] || "Colaborador"}</h2>
        <p>
          Convite enviado para <strong>{invite.email}</strong>.
        </p>
        {invite.hasAccount ? (
          wrongAccount ? (
            <>
              <div className="auth-error" role="alert">
                <CircleAlert />
                Voc√™ est√° logado(a) como {db.user.email}. Entre com a conta{" "}
                {invite.email} para aceitar este convite.
              </div>
              <Button
                className="full"
                variant="secondary"
                icon={LogOut}
                onClick={() => {
                  endSession();
                  update(() => cleanDb(null));
                }}
              >
                Sair e entrar com outra conta
              </Button>
            </>
          ) : rightAccount ? (
            <>
              {error && (
                <div className="auth-error" role="alert">
                  <CircleAlert />
                  {error}
                </div>
              )}
              <Button
                className="full"
                icon={busy ? RefreshCw : ArrowUpRight}
                disabled={busy}
                onClick={accept}
              >
                {busy ? "Aceitando..." : "Aceitar convite"}
              </Button>
            </>
          ) : (
            <p className="auth-switch">
              Voc√™ j√° possui conta. Entre com {invite.email} e volte a este
              link para aceitar.{" "}
              <a href="/">Ir para o login</a>
            </p>
          )
        ) : (
          <>
            <Field label="Crie uma senha" hint="M√≠nimo de 8 caracteres">
              <input
                type="password"
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢"
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
              icon={busy ? RefreshCw : ArrowUpRight}
              disabled={busy || password.length < 8}
              onClick={accept}
            >
              {busy ? "Criando conta..." : "Criar conta e aceitar convite"}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

const ROLE_LABELS_PT = {
  admin: "Administrador",
  gestor: "Gestor",
  colaborador: "Colaborador",
};

function Onboarding({ db, update }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    stage: "Tenho apenas uma ideia",
    hasBusiness: "Sim",
    name: "",
    industryCategoryId: "outros",
    industryActivity: "",
    segment: "",
    need: "Organizar os pr√≥ximos passos",
    weeklyGoal: "",
    areas: ["Estrat√©gia"],
  });
  const finish = (skip) => {
    let business = null;
    let starterTask = null;
    if (!skip) {
      const businessId = uid();
      const category = industryCategoryById(form.industryCategoryId);
      const businessTypeId = profileTypeForIndustry(
        form.industryCategoryId,
        form.industryActivity,
      );
      const enabledPacks = recommendedPackIds(businessTypeId);
      const firstActions = {
        "Organizar os pr√≥ximos passos": "Definir as 3 prioridades desta semana",
        "Conseguir clientes": "Listar 10 poss√≠veis clientes e preparar o primeiro contato",
        "Criar minha marca": "Registrar a proposta e o tom da marca",
        "Definir pre√ßos": "Calcular o pre√ßo do principal produto ou servi√ßo",
        "Organizar a opera√ß√£o": "Descrever o processo que mais precisa de organiza√ß√£o",
        "Criar um site": "Reunir os textos e informa√ß√µes para o primeiro site",
      };
      business = {
        id: businessId,
        name: form.name.trim() || "Meu neg√≥cio",
        owner: db.user.name,
        industryCategoryId: form.industryCategoryId,
        industryCategoryLabel: category?.label || "Outros",
        industryActivity: form.industryActivity,
        businessTypeId,
        businessTypeLabel: businessTypeLabel({ businessTypeId }),
        segment:
          form.segment.trim() ||
          form.industryActivity ||
          category?.label ||
          "",
        menuMode: "custom",
        enabledPacks,
        stage: form.stage,
        goal: form.need,
        hasBusiness: form.hasBusiness,
        focusAreas: businessPackLabels(enabledPacks).join(", "),
        weeklyGoal: form.weeklyGoal.trim() || form.need,
        city: "",
        audience: "",
        offer: "",
        tone: "Profissional e acolhedor",
        createdAt: today(),
        main: true,
      };
      starterTask = {
        id: uid(),
        title: firstActions[form.need] || "Dar o primeiro passo do meu plano",
        description: `Primeira a√ß√£o sugerida para avan√ßar em: ${form.weeklyGoal.trim() || form.need}.`,
        instructions:
          "Comece com o que voc√™ j√° sabe, registre o resultado e use o chat da tarefa se precisar de orienta√ß√£o.",
        priority: "Alta",
        status: "A fazer",
        due: today(),
        area: "Opera√ß√£o",
        ownerId: db.user.id,
        businessId,
        visibility: "privado",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    update((d) => ({
      ...d,
      onboarding: true,
      businesses: business ? [business, ...d.businesses] : d.businesses,
      tasks: starterTask ? [starterTask, ...(d.tasks || [])] : d.tasks,
      selectedBusinessId: business?.id || d.selectedBusinessId,
      preferences: {
        ...d.preferences,
        needsBusinessOnboarding: false,
      },
    }));
    trackProductEvent("onboarding_completed", {
      mode: db.preferences.mode || "business",
      success: true,
      kind: skip ? "skipped" : "guided",
    });
  };
  const stages = [
    "Tenho apenas uma ideia",
    "Estou estruturando o neg√≥cio",
    "Estou come√ßando a vender",
    "J√° tenho clientes",
    "Quero organizar a opera√ß√£o",
    "Quero aumentar as vendas",
    "Quero profissionalizar a empresa",
    "Quero expandir",
  ];
  const needs = [
    "Organizar os pr√≥ximos passos",
    "Conseguir clientes",
    "Criar minha marca",
    "Definir pre√ßos",
    "Organizar a opera√ß√£o",
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
            <h1>Onde seu neg√≥cio est√° hoje?</h1>
            <p>Isso ajuda a mostrar as ferramentas mais √∫teis para voc√™.</p>
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
            <h1>Conte um pouco sobre o neg√≥cio</h1>
            <p>Voc√™ pode completar e editar tudo depois.</p>
            <div className="form-grid">
              <Field label="Voc√™ j√° possui um neg√≥cio em atividade?">
                <select
                  value={form.hasBusiness}
                  onChange={(e) =>
                    setForm({ ...form, hasBusiness: e.target.value })
                  }
                >
                  <option>Sim</option>
                  <option>N√£o, estou come√ßando</option>
                </select>
              </Field>
              <Field label="Nome do neg√≥cio">
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Ateli√™ Aurora"
                />
              </Field>
              <Field label="Categoria do neg√≥cio">
                <select
                  value={form.industryCategoryId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      industryCategoryId: e.target.value,
                      industryActivity: "",
                    })
                  }
                >
                  {BUSINESS_INDUSTRY_CATALOG.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Atividade espec√≠fica">
                <select
                  value={form.industryActivity}
                  onChange={(e) =>
                    setForm({ ...form, industryActivity: e.target.value })
                  }
                >
                  <option value="">Selecione a atividade</option>
                  {(industryCategoryById(form.industryCategoryId)?.activities || []).map(
                    (activity) => (
                      <option key={activity} value={activity}>
                        {activity}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field
                label="Como voc√™ descreve o segmento"
                hint="Opcional. Use se o neg√≥cio for h√≠brido ou muito espec√≠fico."
              >
                <input
                  value={form.segment}
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                  placeholder="Ex.: criadora de conte√∫do sobre beleza e carreira"
                />
              </Field>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <span className="eyebrow">PASSO 3 DE 3</span>
            <h1>O que mais precisa resolver agora?</h1>
            <p>Seu painel ser√° organizado a partir desta prioridade.</p>
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
            <Field
              label="Que resultado voc√™ quer alcan√ßar nesta semana?"
              hint="Opcional. Voc√™ poder√° ajustar essa meta na p√°gina inicial."
            >
              <input
                value={form.weeklyGoal}
                onChange={(e) =>
                  setForm({ ...form, weeklyGoal: e.target.value })
                }
                placeholder="Ex.: enviar 5 propostas ou organizar as despesas"
              />
            </Field>
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
    {
      name: "",
      owner: "",
      industryCategoryId: "outros",
      industryActivity: "",
      businessTypeId: "outro",
      menuMode: "custom",
      enabledPacks: recommendedPackIds("outro"),
      segment: "",
      stage: "Estou estruturando o neg√≥cio",
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
      ...(value || {}),
    },
  );
  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const category = industryCategoryById(f.industryCategoryId);
    const businessTypeId = profileTypeForIndustry(
      f.industryCategoryId,
      f.industryActivity,
    );
    const enabledPacks =
      Array.isArray(f.enabledPacks) && f.enabledPacks.length
        ? f.enabledPacks
        : recommendedPackIds(businessTypeId);
    onSave({
      ...f,
      id: f.id || uid(),
      name: f.name.trim(),
      industryCategoryLabel: category?.label || "Outros",
      businessTypeId,
      businessTypeLabel: businessTypeLabel({ businessTypeId }),
      segment:
        f.segment.trim() || f.industryActivity || category?.label || "",
      enabledPacks,
      focusAreas:
        f.focusAreas?.trim() || businessPackLabels(enabledPacks).join(", "),
      createdAt: f.createdAt || today(),
    });
  };
  return (
    <form className="modal-body" onSubmit={save}>
      <div className="form-grid">
        <Field label="Nome do neg√≥cio">
          <input
            required
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Respons√°vel">
          <input
            value={f.owner}
            onChange={(e) => setF({ ...f, owner: e.target.value })}
          />
        </Field>
        <Field label="Categoria do neg√≥cio">
          <select
            value={f.industryCategoryId || "outros"}
            onChange={(e) => {
              const categoryId = e.target.value;
              const businessTypeId = profileTypeForIndustry(categoryId);
              setF({
                ...f,
                industryCategoryId: categoryId,
                industryActivity: "",
                businessTypeId,
                enabledPacks: recommendedPackIds(businessTypeId),
                menuMode: "custom",
              });
            }}
          >
            {BUSINESS_INDUSTRY_CATALOG.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Atividade espec√≠fica">
          <select
            value={f.industryActivity || ""}
            onChange={(e) => {
              const activity = e.target.value;
              const businessTypeId = profileTypeForIndustry(
                f.industryCategoryId,
                activity,
              );
              setF({
                ...f,
                industryActivity: activity,
                businessTypeId,
                enabledPacks: recommendedPackIds(businessTypeId),
                menuMode: "custom",
              });
            }}
          >
            <option value="">Selecione a atividade</option>
            {(industryCategoryById(f.industryCategoryId)?.activities || []).map(
              (activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="Descri√ß√£o livre do segmento">
          <input
            value={f.segment}
            onChange={(e) => setF({ ...f, segment: e.target.value })}
            placeholder="Use para neg√≥cios h√≠bridos ou muito espec√≠ficos"
          />
        </Field>
        <Field label="Est√°gio">
          <select
            value={f.stage}
            onChange={(e) => setF({ ...f, stage: e.target.value })}
          >
            <option>Tenho apenas uma ideia</option>
            <option>Estou estruturando o neg√≥cio</option>
            <option>Estou come√ßando a vender</option>
            <option>J√° tenho clientes</option>
            <option>Quero organizar a opera√ß√£o</option>
            <option>Quero aumentar as vendas</option>
            <option>Quero profissionalizar a empresa</option>
            <option>Quero expandir</option>
          </select>
        </Field>
        <Field label="Cidade ou regi√£o">
          <input
            value={f.city}
            onChange={(e) => setF({ ...f, city: e.target.value })}
          />
        </Field>
        <Field label="P√∫blico-alvo">
          <input
            value={f.audience}
            onChange={(e) => setF({ ...f, audience: e.target.value })}
          />
        </Field>
        <Field label="Produtos ou servi√ßos">
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
        <Field label="Tom de comunica√ß√£o">
          <input
            value={f.tone}
            onChange={(e) => setF({ ...f, tone: e.target.value })}
          />
        </Field>
        <Field label="Diferenciais">
          <textarea
            value={f.differentiators || ""}
            onChange={(e) => setF({ ...f, differentiators: e.target.value })}
            placeholder="O que faz clientes escolherem este neg√≥cio?"
          />
        </Field>
        <Field label="Concorrentes e refer√™ncias">
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
            placeholder="Ex.: loja, WhatsApp, Instagram, indica√ß√£o"
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
        <Field label="Faixa de pre√ßo">
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
        <Field label="√Åreas priorit√°rias">
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
            placeholder="Cores, tipografia, s√≠mbolos e materiais existentes"
          />
        </Field>
      </div>
      <div className="modal-actions">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" icon={Save}>
          Salvar neg√≥cio
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
    <Modal title="Contratar novo funcion√°rio" onClose={onClose}>
      <form className="modal-body" onSubmit={submit}>
        <div className="notice">
          <Sparkles />
          <span>
            Descreva a especialidade e o Seu Funcion√°rio cria um especialista
            sob medida ‚Äî por setor, profiss√£o, projeto ou problema espec√≠fico.
            Ele fica salvo na sua equipe.
          </span>
        </div>
        <Field
          label="√Årea ou especialidade"
          hint="Ex.: Tr√°fego pago, Licita√ß√µes, Cl√≠nicas, Exporta√ß√£o..."
        >
          <input
            required
            autoFocus
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value.slice(0, 48) })}
            placeholder="Ex.: Licita√ß√µes p√∫blicas"
          />
        </Field>
        <Field
          label="O que esse funcion√°rio deve saber e fazer"
          hint="M√≠nimo de 20 caracteres"
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
            Contratar funcion√°rio
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
  const composerRef = useRef(null);
  const abortRef = useRef(null);
  const stoppedRef = useRef(false);
  const stopGenerating = () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
  };
  const applyStarter = (starter) => {
    setText(starter);
    composerRef.current?.focus();
  };
  const specialist = db.preferences.specialist;
  const conversations = db.conversations || [];
  const active =
    conversations.find((x) => x.id === db.selectedConversationId) || null;
  const messages = useMemo(() => active?.messages || [], [active?.messages]);
  // Comprimento da √∫ltima mensagem: muda a cada token durante o streaming,
  // fazendo o auto-scroll acompanhar a resposta enquanto ela √© gerada.
  const streamingLen = messages.length
    ? messages[messages.length - 1].content?.length || 0
    : 0;
  useEffect(() => {
    localStorage.setItem("sf-draft", text);
  }, [text]);
  useEffect(() => {
    const el = endRef.current?.parentElement;
    if (typeof el?.scrollTo === "function")
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, revealing?.count, streamingLen]);
  useEffect(() => {
    if (!revealing?.id) return;
    const message = messages.find((item) => item.id === revealing.id);
    if (!message || revealing.count >= message.content.length) {
      const timer = setTimeout(() => setRevealing(null), 0);
      return () => clearTimeout(timer);
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
          ? "Documento anexado √† conversa"
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
      ownerId: db.user.id,
      visibility: "privado",
      type: "Conversa salva",
      status: "Conclu√≠do",
      createdAt: new Date().toISOString(),
    };
    update((d) => ({ ...d, history: [item, ...d.history] }));
    setToast("Resposta salva em Projetos e Hist√≥rico");
  };
  const saveMessageAsDocument = (message) => {
    const title = active?.title || "Documento criado com IA";
    if (
      !confirm(
        `Ser√° criado um documento privado chamado "${title}". O texto da resposta ser√° salvo e poder√° ser editado antes de qualquer envio. Continuar?`,
      )
    )
      return;
    const now = new Date().toISOString();
    update((current) => ({
      ...current,
      documents: [
        {
          id: uid(),
          title,
          type: "Documento criado com IA",
          content: message.content,
          businessId: business?.id || null,
          ownerId: db.user.id,
          visibility: "privado",
          sharingPermission: "visualizar",
          versions: [],
          createdAt: now,
          updatedAt: now,
        },
        ...(current.documents || []),
      ],
    }));
    trackProductEvent("record_created", {
      module: "documentos",
      source: "chat",
      kind: "ai_response",
    });
    setToast("Documento criado; revise antes de compartilhar");
  };
  const createTaskFromMessage = (message) => {
    const title = active?.title || "Aplicar orienta√ß√£o da IA";
    if (
      !confirm(
        `Ser√° criada uma tarefa privada chamada "${title}", com a resposta como orienta√ß√£o. Nenhuma outra a√ß√£o ser√° executada. Continuar?`,
      )
    )
      return;
    const now = new Date().toISOString();
    update((current) => ({
      ...current,
      tasks: [
        {
          id: uid(),
          title,
          description: "A√ß√£o criada a partir de uma conversa com a IA.",
          instructions: message.content.slice(0, 4000),
          priority: "M√©dia",
          status: "A fazer",
          due: today(),
          area: specialist || "Opera√ß√£o",
          businessId: business?.id || null,
          ownerId: db.user.id,
          visibility: "privado",
          createdAt: now,
          updatedAt: now,
        },
        ...(current.tasks || []),
      ],
    }));
    trackProductEvent("record_created", {
      module: "operacao",
      source: "chat",
      kind: "task",
    });
    setToast("Tarefa criada com a orienta√ß√£o da conversa");
  };
  const saveMessageAsTaskOutput = (message) => {
    const sourceTask = (db.tasks || []).find(
      (task) => task.id === active?.sourceTaskId,
    );
    if (!sourceTask) {
      setToast("A tarefa de origem n√£o foi encontrada");
      return;
    }
    if (
      !confirm(
        `Anexar esta entrega √† tarefa "${sourceTask.title}"? A tarefa n√£o ser√° conclu√≠da automaticamente.`,
      )
    )
      return;
    const now = new Date().toISOString();
    update((current) => ({
      ...current,
      tasks: (current.tasks || []).map((task) =>
        task.id === sourceTask.id
          ? {
              ...task,
              aiOutputs: [
                {
                  id: uid(),
                  content: String(message.content || "").slice(0, 8_000),
                  specialist: active?.specialist || specialist,
                  conversationId: active?.id || "",
                  provider: message.provider || "",
                  model: message.model || "",
                  createdAt: now,
                },
                ...(task.aiOutputs || []),
              ].slice(0, 3),
              updatedAt: now,
            }
          : task,
      ),
    }));
    setToast("Entrega anexada √† tarefa para confer√™ncia");
  };
  const submit = async () => {
    if ((!text.trim() && !attachments.length) || busy) return;
    const prompt =
        text.trim() ||
        "Analise os documentos anexados e apresente um resumo, pontos importantes e pr√≥ximas a√ß√µes.",
      attachmentContext = attachments.length
        ? `\n\nDOCUMENTOS ANEXADOS PELO USU√ÅRIO:\n${attachments
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
              ownerId: db.user.id,
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
      messages: [...previousMessages, userMessage]
        .slice(-10)
        .map((x) => ({ role: x.role, content: x.content })),
      ...aiWorkspaceContext(business),
    };
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 70000);
    abortRef.current = controller;
    stoppedRef.current = false;
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
            trackProductEvent("ai_completed", {
              module: "chat",
              kind: specialist,
              success: true,
            });
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
        if (streamErr.name === "AbortError") {
          // Parada pelo usu√°rio: mant√©m o texto parcial j√° recebido e n√£o trata
          // como erro. Timeout real (n√£o-stoppedRef) segue para o catch externo.
          if (stoppedRef.current) {
            streamed = true;
            setToast("Gera√ß√£o interrompida");
          } else throw streamErr;
        }
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
          data.error || "N√£o foi poss√≠vel obter uma resposta agora.",
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
      trackProductEvent("ai_completed", {
        module: "chat",
        kind: specialist,
        success: true,
      });
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
      abortRef.current = null;
      stoppedRef.current = false;
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
            <h2>{active?.title || "O que voc√™ precisa resolver hoje?"}</h2>
            <p>Converse, complemente e refine sem perder o contexto.</p>
          </div>
        </div>
        <div className="chat-head-actions">
          <span className="business-context">
            <Building2 />
            {business?.name || "Nenhum neg√≥cio selecionado"}
          </span>
          {active && (
            <button
              className="icon-button danger"
              title="Excluir esta conversa"
              onClick={() => {
                if (
                  confirm(
                    "Excluir esta conversa? Respostas salvas em Projetos s√£o mantidas.",
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
            <h3>Seu agente est√° pronto</h3>
            <p>
              Pe√ßa uma an√°lise, material, plano ou orienta√ß√£o. Quando uma
              ferramenta externa for melhor, eu mostro o caminho certo.
            </p>
            <div className="prompt-starters">
              {[
                "Monte um plano de a√ß√µes para esta semana no meu neg√≥cio",
                "Escreva uma mensagem educada de cobran√ßa para um cliente",
                "Analise meus n√∫meros e diga onde posso melhorar",
                "Crie uma descri√ß√£o de vaga para um ajudante",
              ].map((starter) => (
                <button
                  type="button"
                  key={starter}
                  onClick={() => applyStarter(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
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
                    ? "Seu Funcion√°rio"
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
                      <button onClick={() => saveMessageAsDocument(message)}>
                        <FileText />
                        Criar documento
                      </button>
                      <button onClick={() => createTaskFromMessage(message)}>
                        <ListTodo />
                        Criar tarefa
                      </button>
                      {active?.sourceTaskId && (
                        <button onClick={() => saveMessageAsTaskOutput(message)}>
                          <Paperclip />
                          Anexar √† tarefa
                        </button>
                      )}
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
              <button
                type="button"
                className="stop-generating"
                onClick={stopGenerating}
              >
                <Square />
                Parar
              </button>
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
          ref={composerRef}
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
              aria-label="Funcion√°rio"
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
              <optgroup label="Equipe padr√£o">
                {specialistData.map((s) => (
                  <option key={s[0]} value={s[0]}>
                    {s[0]}
                  </option>
                ))}
              </optgroup>
              {(db.customSpecialists || []).length > 0 && (
                <optgroup label="Meus funcion√°rios">
                  {db.customSpecialists.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__new">+ Contratar novo funcion√°rio...</option>
            </select>
          </div>
          <span className="keyboard-hint">
            Enter envia ¬∑ Shift + Enter quebra linha
          </span>
          <span className="ai-live" title="Assist√™ncia inteligente dispon√≠vel">
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
            setToast(`Funcion√°rio de ${emp.name} contratado`);
          }}
        />
      )}
    </section>
  );
}

function Dashboard({ db, update, business, go, setToast, visibleNav }) {
  const isEmployeeMode = (db.preferences.mode || "business") === "employee";
  const [team, setTeam] = useState({ members: [], invites: [] });
  const [goalDraft, setGoalDraft] = useState(business?.weeklyGoal || "");
  useEffect(() => {
    const id = setTimeout(() => setGoalDraft(business?.weeklyGoal || ""), 0);
    return () => clearTimeout(id);
  }, [business?.id, business?.weeklyGoal]);
  useEffect(() => {
    if (isEmployeeMode) return;
    const space = activeSpaceId();
    fetch(`/api/collab${space ? `?owner=${encodeURIComponent(space)}` : ""}`, {
      headers: authHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTeam({ members: d.members || [], invites: d.invites || [] }))
      .catch(() => {});
  }, [isEmployeeMode]);
  const managerStats = {
    activeMembers: team.members.filter((m) => m.status !== "suspenso").length,
    pendingInvites: team.invites.filter((i) => i.status === "enviado").length,
    awaitingReview: db.tasks.filter(
      (t) => t.isMission && t.missionStatus === "enviada_para_revisao",
    ).length,
    overdue: db.tasks.filter(
      (t) => t.due && t.due < today() && t.status !== "Conclu√≠do",
    ).length,
    pendingPayouts: db.tasks.filter(
      (t) => Number(t.reward) > 0 && t.rewardStatus === "aprovada",
    ).length,
  };
  const myTasks = db.tasks.filter(
    (t) =>
      t.assigneeId === db.user.id ||
      (t.assignees || []).some((a) => a.userId === db.user.id),
  );
  const collaboratorStats = {
    inProgress: myTasks.filter((t) => t.status !== "Conclu√≠do").length,
    inReview: myTasks.filter((t) => t.missionStatus === "enviada_para_revisao")
      .length,
    correctionsNeeded: myTasks.filter(
      (t) => t.missionStatus === "correcao_solicitada",
    ).length,
  };
  const myPlan = (db.developmentPlans || []).find(
    (p) => p.assigneeId === db.user.id,
  );
  const activeTasks = db.tasks.filter(
    (x) => x.status !== "Conclu√≠do" && (!business || x.businessId === business.id),
  );
  const followups = db.leads.filter(
    (x) =>
      (!business || x.businessId === business.id) &&
      x.status !== "Ganho" &&
      x.status !== "Perdido",
  );
  const upcomingAppointments = (db.appointments || [])
    .filter(
      (a) =>
        (!business || a.businessId === business.id) &&
        a.status !== "Cancelado" &&
        a.date >= today(),
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 4);
  const recent = db.history
    .filter((x) => !business || x.businessId === business.id)
    .slice(0, 3);
  const selectSpecialist = (name) => {
    update((d) => ({ ...d, preferences: { ...d.preferences, specialist: name } }));
    setToast(`${name} selecionado ‚Äî envie sua mensagem abaixo`);
  };
  const quickEmployee = [
    ["Organizar minha semana", ListTodo, "operacao"],
    ["Organizar tarefas e prioridades", CheckCircle2, "operacao"],
    ["Escrever um e-mail ou mensagem", Mail, "ferramentas"],
    ["Resumir ou analisar um documento", FileText, "documentos"],
    ["Registrar resultados e entregas", History, "historico"],
  ];
  const quickEmployeeSpecialists = [
    ["Preparar uma reuni√£o", Users, "Reuni√µes"],
    ["Criar uma apresenta√ß√£o", Layers, "Apresenta√ß√µes"],
    ["Planejar um projeto", ListTodo, "Projetos"],
    ["Preparar uma conversa com meu gestor", MessageSquareText, "Lideran√ßa"],
    ["Melhorar um processo de trabalho", Workflow, "Processos"],
  ];
  const quickBase = [
    ["Validar uma ideia", Lightbulb, "comecar"],
    ["Montar meus pre√ßos", Calculator, "financeiro"],
    ["Encontrar clientes", Users, "vendas"],
    ["Criar um site", Globe2, "sites"],
    ["Organizar tarefas", ListTodo, "operacao"],
    ["Criar uma proposta", FileText, "documentos"],
    ["Traduzir um texto", Languages, "ferramentas"],
    ["Analisar meus n√∫meros", Filter, "ferramentas"],
  ];
  const priorityText =
    `${business?.goal || ""} ${business?.focusAreas || ""}`.toLowerCase();
  const recommendedPage = /pre√ß|finance/.test(priorityText)
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
  const thisWeek = weekRange();
  const weekSummary = computeWeeklySummary(db, thisWeek.start, thisWeek.end);
  const gamificationEnabled = db.preferences.gamificationEnabled !== false;
  const myPoints = useMemo(
    () => computeUserPoints(db.tasks, db.user.id),
    [db.tasks, db.user.id],
  );
  const myLevel = levelForPoints(myPoints, db.levels || DEFAULT_LEVELS);
  const myLevelProgress = levelProgress(myPoints, db.levels || DEFAULT_LEVELS);
  const myAchievements = useMemo(
    () => computeAchievements(db.tasks, db.user.id),
    [db.tasks, db.user.id],
  );
  const achievementIds = useMemo(
    () => myAchievements.map((a) => a.id).join(","),
    [myAchievements],
  );
  const focus = nextBestAction(db, business, db.user.id);
  const saveWeeklyGoal = (event) => {
    event.preventDefault();
    if (!business || !goalDraft.trim()) return;
    update((current) => ({
      ...current,
      businesses: (current.businesses || []).map((item) =>
        item.id === business.id
          ? { ...item, weeklyGoal: goalDraft.trim() }
          : item,
      ),
    }));
    trackProductEvent("weekly_goal_saved", { module: "inicio", success: true });
    setToast("Meta da semana atualizada");
  };
  useEffect(() => {
    if (!gamificationEnabled || myAchievements.length === 0) return;
    const key = `seu-funcionario-achievements-seen:${db.user.id}`;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      seen = [];
    }
    const newOnes = myAchievements.filter((a) => !seen.includes(a.id));
    if (newOnes.length === 0) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify([...seen, ...newOnes.map((a) => a.id)]),
      );
    } catch {}
    update((d) => ({
      ...d,
      notifications: newOnes.reduce(
        (list, a) =>
          pushNotification(list, {
            recipientId: db.user.id,
            message: `Conquista desbloqueada: ${a.label}`,
            link: "inicio",
            createdBy: db.user.id,
          }),
        d.notifications,
      ),
    }));
  }, [achievementIds, db.user.id, gamificationEnabled, myAchievements, update]);
  return (
    <>
      <HomeHub
        db={db}
        update={update}
        business={business}
        go={go}
        setToast={setToast}
        visibleNav={visibleNav}
        navGroups={navGroups}
        aiTools={aiTools}
        businessCatalog={BUSINESS_INDUSTRY_CATALOG}
      />
      {gamificationEnabled && myPoints > 0 && (
        <div className="progress-card">
          <div>
            <span className="eyebrow">MEU PROGRESSO</span>
            <h2>
              {myLevel.name} ¬∑ {myPoints} pontos
            </h2>
            {myLevelProgress.next ? (
              <div className="level-progress">
                <div className="level-progress-bar">
                  <div
                    className="level-progress-fill"
                    style={{ width: `${myLevelProgress.pct}%` }}
                  />
                </div>
                <small>
                  Faltam {myLevelProgress.pointsToNext} pontos para{" "}
                  {myLevelProgress.next.name}
                </small>
              </div>
            ) : (
              <small className="level-progress-max">
                N√≠vel m√°ximo alcan√ßado
              </small>
            )}
          </div>
          {myAchievements.length > 0 && (
            <div className="achievement-chips">
              {myAchievements.map((a) => (
                <span key={a.id} className="chip on">
                  <Award size={14} /> {a.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="welcome">
        <div>
          <span className="eyebrow">CENTRAL DE TRABALHO</span>
          <h1>
            Ol√°, {db.user.name.split(" ")[0]}.{" "}
            <span>Vamos fazer acontecer?</span>
          </h1>
          <p>
            {business ? (
              <>
                <strong>{business.name}</strong> est√° na fase ‚Äú{business.stage}
                ‚Äù.
              </>
            ) : isEmployeeMode ? (
              "Organize sua semana e conte com a IA para o seu trabalho."
            ) : (
              "Crie seu primeiro neg√≥cio para receber um painel personalizado."
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
      <section className={`today-focus ${focus.tone || "default"}`} id="today-focus">
        <div className="today-focus-main">
          <span className="eyebrow">{focus.eyebrow}</span>
          <h2>{focus.title}</h2>
          <p>{focus.text}</p>
          <Button icon={ArrowUpRight} onClick={() => go(focus.page)}>
            {focus.action}
          </Button>
        </div>
        {!isEmployeeMode && business && (
          <form className="weekly-goal" onSubmit={saveWeeklyGoal}>
            <label htmlFor="weekly-goal-input">Meta desta semana</label>
            <input
              id="weekly-goal-input"
              value={goalDraft}
              onChange={(event) => setGoalDraft(event.target.value)}
              placeholder="Qual resultado precisa estar pronto?"
            />
            <Button variant="secondary" type="submit" disabled={!goalDraft.trim()}>
              Salvar meta
            </Button>
          </form>
        )}
      </section>
      {!isEmployeeMode && (
        <section className="week-summary" id="week-summary">
          <div className="section-head">
            <div>
              <span className="eyebrow">SUA SEMANA</span>
              <h2>Resumo de {dayRangeLabel(thisWeek.start, thisWeek.end)}</h2>
            </div>
          </div>
          {weekSummary.hasActivity ? (
            <div className="week-stats">
              <div>
                <span className="week-stat-icon g2">
                  <ShoppingBag />
                </span>
                <div>
                  <small>Vendas</small>
                  <strong>{weekSummary.sales}</strong>
                  <span>{money(weekSummary.salesRevenue)}</span>
                </div>
              </div>
              <div>
                <span className="week-stat-icon g5">
                  <ArrowUpRight />
                </span>
                <div>
                  <small>Entrou em caixa</small>
                  <strong>{money(weekSummary.cashIn)}</strong>
                  <span>Saldo {money(weekSummary.cashNet)}</span>
                </div>
              </div>
              <div>
                <span className="week-stat-icon g0">
                  <CheckCircle2 />
                </span>
                <div>
                  <small>Tarefas conclu√≠das</small>
                  <strong>{weekSummary.tasksDone}</strong>
                  {weekSummary.tasksReward > 0 && (
                    <span>{money(weekSummary.tasksReward)}</span>
                  )}
                </div>
              </div>
              <div>
                <span className="week-stat-icon g3">
                  <Users />
                </span>
                <div>
                  <small>Novos contatos</small>
                  <strong>{weekSummary.newLeads}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="week-empty">
              Sem movimento registrado nesta semana ainda. Registre uma venda,
              conclua uma tarefa ou adicione um contato ‚Äî os n√∫meros aparecem
              aqui na hora.
            </p>
          )}
          <small className="week-summary-note">
            Ative as notifica√ß√µes do navegador em Configura√ß√µes para receber
            esse resumo toda segunda-feira, mesmo com o app fechado.
          </small>
        </section>
      )}
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
          {isEmployeeMode ? (
            <>
              {quickEmployee.map(([t, I, p], i) => (
                <button key={t} onClick={() => go(p)}>
                  <span className={`quick-icon q${i % 6}`}>
                    <I />
                  </span>
                  <span>
                    <strong>{t}</strong>
                    <small>Abrir ferramenta</small>
                  </span>
                  <ArrowUpRight />
                </button>
              ))}
              {quickEmployeeSpecialists.map(([t, I, name], i) => (
                <button key={t} onClick={() => selectSpecialist(name)}>
                  <span className={`quick-icon q${(i + quickEmployee.length) % 6}`}>
                    <I />
                  </span>
                  <span>
                    <strong>{t}</strong>
                    <small>Conversar com a IA</small>
                  </span>
                  <ArrowUpRight />
                </button>
              ))}
            </>
          ) : (
            quick.map(([t, I, p], i) => (
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
            ))
          )}
        </div>
      </section>
      {isEmployeeMode ? (
        (collaboratorStats.inProgress > 0 ||
          collaboratorStats.inReview > 0 ||
          collaboratorStats.correctionsNeeded > 0 ||
          myPlan) && (
          <section className="section">
            <div className="section-head">
              <div>
                <span className="eyebrow">PAINEL DO COLABORADOR</span>
                <h2>Meu resumo</h2>
              </div>
            </div>
            <div className="settings-links">
              <div className="settings-stat">
                <ListTodo />
                <span>
                  <strong>{collaboratorStats.inProgress}</strong> tarefas em
                  andamento comigo
                </span>
              </div>
              <div className="settings-stat">
                <Clock3 />
                <span>
                  <strong>{collaboratorStats.inReview}</strong> entregas minhas
                  aguardando revis√£o
                </span>
              </div>
              <div className="settings-stat">
                <CircleAlert />
                <span>
                  <strong>{collaboratorStats.correctionsNeeded}</strong>{" "}
                  corre√ß√µes pendentes
                </span>
              </div>
              {myPlan && (
                <button
                  className="settings-stat as-button"
                  onClick={() => go("desenvolvimento")}
                >
                  <TrendingUp />
                  <span>
                    Meu plano de desenvolvimento: <strong>{myPlan.status}</strong>
                  </span>
                </button>
              )}
            </div>
          </section>
        )
      ) : (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">PAINEL DO GESTOR</span>
              <h2>Vis√£o geral da equipe</h2>
            </div>
            <button className="text-button" onClick={() => go("time")}>
              Gerenciar
            </button>
          </div>
          <div className="settings-links">
            <div className="settings-stat">
              <UserRound />
              <span>
                <strong>{managerStats.activeMembers}</strong> colaboradores
                ativos ¬∑ <strong>{managerStats.pendingInvites}</strong>{" "}
                convites aguardando ativa√ß√£o
              </span>
            </div>
            <button
              className="settings-stat as-button"
              onClick={() => go("operacao")}
            >
              <Clock3 />
              <span>
                <strong>{managerStats.awaitingReview}</strong> entregas
                aguardando revis√£o
              </span>
            </button>
            <button
              className="settings-stat as-button"
              onClick={() => go("operacao")}
            >
              <CircleAlert />
              <span>
                <strong>{managerStats.overdue}</strong> tarefas atrasadas
              </span>
            </button>
            <button
              className="settings-stat as-button"
              onClick={() => go("financeiro")}
            >
              <WalletCards />
              <span>
                <strong>{managerStats.pendingPayouts}</strong> recompensas
                aprovadas aguardando pagamento
              </span>
            </button>
          </div>
        </section>
      )}
      {(db.pluggedTools || []).length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">MINHAS FERRAMENTAS</span>
              <h2>Acesso r√°pido</h2>
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
              <h2>Pr√≥ximas a√ß√µes</h2>
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
                          x.id === t.id ? { ...x, status: "Conclu√≠do" } : x,
                        ),
                      }))
                    }
                  >
                    <Circle />
                  </button>
                  <span>
                    <strong>{t.title}</strong>
                    <small>
                      {t.due || "Sem prazo"} ¬∑ {t.priority}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={ListTodo}
              title="Nenhuma tarefa pendente"
              text="Transforme um plano em a√ß√µes ou crie sua primeira tarefa."
            />
          )}
        </section>
        {isEmployeeMode ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">AGENDA</span>
                <h2>Pr√≥ximos compromissos</h2>
              </div>
              <button className="text-button" onClick={() => go("agendamentos")}>
                Abrir agenda
              </button>
            </div>
            {upcomingAppointments.length ? (
              <div className="mini-list">
                {upcomingAppointments.map((a) => (
                  <div key={a.id}>
                    <span className="avatar">
                      {(a.clientName || a.title || "?")[0]}
                    </span>
                    <span>
                      <strong>{a.title}</strong>
                      <small>
                        {new Date(`${a.date}T12:00`).toLocaleDateString("pt-BR")}{" "}
                        ¬∑ {a.time}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                icon={CalendarDays}
                title="Nada agendado"
                text="Marque uma reuni√£o, prazo ou bloco de foco."
              />
            )}
          </section>
        ) : (
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
                        {l.status} ¬∑ {l.next || "Sem follow-up"}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                icon={Users}
                title="Seu CRM est√° livre"
                text="Adicione oportunidades e acompanhe cada conversa."
              />
            )}
          </section>
        )}
      </div>
      {recent.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">RECENTES</span>
              <h2>Continue de onde parou</h2>
            </div>
            <button className="text-button" onClick={() => go("historico")}>
              Ver hist√≥rico
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
  if (/pre√ß|finance/.test(text)) return "financeiro";
  if (/cliente|lead|vend|prospec|comercial/.test(text)) return "vendas";
  if (/site|p√°gina/.test(text)) return "sites";
  if (/marca|identidade|biografia|rede social|material/.test(text))
    return "estudio";
  if (/processo|tarefa|prioridade|atendimento/.test(text)) return "operacao";
  if (/plano|proposta|diagn√≥stico|portf√≥lio/.test(text)) return "documentos";
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
      text="Avance no seu ritmo. O progresso √© salvo automaticamente."
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
              <p>{j.steps.length} etapas pr√°ticas</p>
              <div className="meter">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="journey-meta">
                <span>
                  {done.length} de {j.steps.length} conclu√≠das
                </span>
                <strong>{pct}%</strong>
              </div>
              <Button variant="secondary" onClick={() => setOpen(id)}>
                {done.length ? "Continuar jornada" : "Come√ßar jornada"}
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
                          placeholder="Descreva o entreg√°vel, decis√£o ou evid√™ncia produzida nesta etapa."
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

const areaToolkits = {
  estrategia: {
    label: "Estrat√©gia",
    items: [
      {
        kind: "page",
        page: "comecar",
        title: "Jornadas guiadas",
        description: "Valide uma ideia ou estruture o neg√≥cio por etapas.",
        icon: Rocket,
      },
      {
        kind: "ai",
        tool: "dados",
        title: "An√°lise de cen√°rios e n√∫meros",
        description: "Transforme dados informados em padr√µes e decis√µes.",
        icon: Filter,
      },
      {
        kind: "page",
        page: "documentos",
        title: "Planos e diagn√≥sticos",
        description: "Crie e organize planos, pesquisas e relat√≥rios.",
        icon: FileText,
      },
      {
        kind: "page",
        page: "historico",
        title: "Projetos e decis√µes",
        description: "Continue, refine ou duplique trabalhos anteriores.",
        icon: History,
      },
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
        title: "Est√∫dio de logos e imagens",
        description: "Crie identidade, pe√ßas visuais, imagens e v√≠deos.",
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
        description: "Cadastre leads, etapas e hist√≥rico de intera√ß√µes.",
        icon: Users,
      },
      {
        kind: "page",
        page: "agendamentos",
        title: "Agenda de atendimentos",
        description: "Marque hor√°rios e confirme por WhatsApp ou Google Agenda.",
        icon: CalendarDays,
      },
      { kind: "ai", tool: "sales" },
      { kind: "ai", tool: "support" },
      { kind: "special", tool: "email" },
      { kind: "external", tool: "whatsapp" },
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
        title: "Metas e ponto de equil√≠brio",
        description: "Planeje a receita necess√°ria para cobrir os custos.",
        icon: Target,
      },
      {
        kind: "page",
        page: "horas",
        title: "Horas e faturamento",
        description: "Aponte horas por cliente e fature com um clique.",
        icon: Clock3,
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
    label: "Opera√ß√£o",
    items: [
      {
        kind: "page",
        page: "produtos",
        title: "Produtos, estoque e pedidos",
        description: "Cadastre produtos e registre pedidos com baixa autom√°tica.",
        icon: ShoppingBag,
      },
      { kind: "ai", tool: "ops" },
      { kind: "ai", tool: "rh" },
      { kind: "ai", tool: "compras" },
      { kind: "special", tool: "route" },
      { kind: "external", tool: "calendar" },
    ],
  },
  sites: {
    label: "Sites e Materiais",
    items: [
      {
        kind: "scroll",
        target: "site-projects",
        title: "Construtor de sites",
        description: "Crie sites multip√°gina e edite tudo por conversa.",
        icon: Globe2,
      },
      {
        kind: "page",
        page: "estudio",
        title: "Logos, imagens e v√≠deos",
        description: "Produza materiais visuais no Est√∫dio de IA.",
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
    ],
  },
};

function AreaToolkit({ area, db: _db, update, business, setToast, go }) {
  const config = areaToolkits[area];
  const storageKey = `sf-toolkit-open:${area}`;
  const [open, setOpen] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [activeTool, setActiveTool] = useState("");
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
            badge: "Servi√ßo externo",
          }
        : null;
    }
    if (item.kind === "ai") {
      const tool = aiTools[item.tool];
      return tool
        ? {
            ...item,
            title: item.title || tool.title.replace(/^.*? ‚Äî /, ""),
            description: item.description || tool.hint,
            icon: item.icon || tool.icon,
            badge: "Com IA",
          }
        : null;
    }
    const special = {
      translate: {
        title: "Tradutor profissional",
        description: "Traduza textos, propostas e comunica√ß√µes.",
        icon: Languages,
      },
      route: {
        title: "Roteirizador de entregas",
        description: "Organize paradas e abra a rota no Google Maps.",
        icon: Route,
      },
      email: {
        title: "Escrever e-mail",
        description: "Prepare a mensagem e envie pela sua pr√≥pria conta.",
        icon: Mail,
      },
    }[item.tool];
    return special ? { ...item, ...special, badge: "No app" } : item;
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
  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {}
      return next;
    });
  };
  return (
    <section className={`area-toolkit${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="area-toolkit-toggle"
        onClick={toggle}
        aria-expanded={open}
      >
        <span className="area-toolkit-label">
          <span className="eyebrow">Recursos desta √°rea</span>
          <strong>Tudo de {config.label} em um s√≥ lugar</strong>
        </span>
        <span className="area-toolkit-count">{items.length} recursos</span>
        <ChevronDown className="area-toolkit-caret" />
      </button>
      {open && (
        <div className="area-tools-grid">
          {items.map((item, index) => {
            const Icon = item.icon || Wrench;
            const content = (
              <>
                <span className={`quick-icon q${index % 6}`}>
                  <Icon />
                </span>
                <span>
                  <small>{item.badge || "No app"}</small>
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
      )}
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
      eyebrow={marketing ? "MARCA E MARKETING" : "ESTRAT√âGIA"}
      title={
        marketing
          ? "Marca, conte√∫do e crescimento conectados"
          : "A habilidade certa para cada desafio"
      }
      text={
        marketing
          ? "Crie estrat√©gia, conte√∫do, materiais e presen√ßa digital sem procurar ferramentas em outras telas."
          : "Analise, planeje e transforme decis√µes em projetos usando todos os recursos dispon√≠veis."
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

const taskUrgency = (task) => {
  if (!task?.due || task.status === "Conclu√≠do") return null;
  const diff = businessDaysBetween(today(), task.due);
  if (diff === null) return null;
  if (diff < 0) return { text: "Prazo vencido", tone: "danger" };
  if (diff === 0) return { text: "Vence hoje", tone: "danger" };
  if (diff <= 2)
    return {
      text: diff === 1 ? "Vence em 1 dia √∫til" : `Vence em ${diff} dias √∫teis`,
      tone: "warning",
    };
  return null;
};

function Tasks({
  db,
  update,
  business,
  setToast,
  go,
  searchSeed,
  clearSearchSeed,
  workspaceAction,
}) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [taskAiBusy, setTaskAiBusy] = useState(false);
  const [taskAiError, setTaskAiError] = useState("");
  const [search, setSearch] = useState("");
  const searchTerm = searchSeed || search;
  useEffect(() => {
    if (!searchSeed) return undefined;
    const id = setTimeout(() => {
      clearSearchSeed?.();
    }, 0);
    return () => clearTimeout(id);
  }, [clearSearchSeed, searchSeed]);
  const [view, setView] = useState("board");
  const [calendarMonth, setCalendarMonth] = useState(todayYearMonth);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [priorityFilter, setPriorityFilter] = useState("Todas");
  const [assigneeFilter, setAssigneeFilter] = useState("Todos");
  const [projectFilter, setProjectFilter] = useState("Todos");
  const [archiveFilter, setArchiveFilter] = useState("Ativas");
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => {
    const id = setTimeout(() => setVisibleCount(LIST_PAGE_SIZE), 0);
    return () => clearTimeout(id);
  }, [searchTerm, statusFilter, priorityFilter, assigneeFilter, projectFilter, archiveFilter]);
  const [realMembers, setRealMembers] = useState([]);
  const [deadlineCalc, setDeadlineCalc] = useState({ open: false, base: today(), days: "5" });
  const [deliveryFeedback, setDeliveryFeedback] = useState({
    wasClear: false,
    neededHelp: false,
  });
  const [reviewFeedback, setReviewFeedback] = useState({
    followedInstructions: false,
    autonomous: false,
  });
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const kanbanRef = useRef(null);
  const touchDragRef = useRef({ taskId: null, startX: 0, startY: 0, timer: null, active: false });
  const clearTouchDrag = () => {
    if (touchDragRef.current.timer) clearTimeout(touchDragRef.current.timer);
    touchDragRef.current = { taskId: null, startX: 0, startY: 0, timer: null, active: false };
  };
  const onCardTouchStart = (t) => (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    clearTouchDrag();
    touchDragRef.current = {
      taskId: t.id,
      startX: touch.clientX,
      startY: touch.clientY,
      timer: setTimeout(() => {
        touchDragRef.current.active = true;
        setDraggedTaskId(t.id);
      }, 350),
      active: false,
    };
  };
  const onCardTouchEnd = () => {
    const state = touchDragRef.current;
    if (state.active && state.taskId && dragOverStatus) {
      const task = items.find((x) => x.id === state.taskId);
      if (task && task.status !== dragOverStatus) changeTaskStatus(task, dragOverStatus);
    }
    clearTouchDrag();
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };
  useEffect(() => {
    const el = kanbanRef.current;
    if (!el) return undefined;
    const handleTouchMove = (e) => {
      const state = touchDragRef.current;
      if (!state.taskId) return;
      const touch = e.touches[0];
      if (!state.active) {
        const dx = Math.abs(touch.clientX - state.startX);
        const dy = Math.abs(touch.clientY - state.startY);
        if (dx > 10 || dy > 10) clearTouchDrag();
        return;
      }
      e.preventDefault();
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const column = target?.closest("[data-kanban-status]");
      setDragOverStatus(column ? column.getAttribute("data-kanban-status") : null);
    };
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  }, []);
  const [deliveryAttachments, setDeliveryAttachments] = useState([]);
  const taskAttachRef = useRef(null);
  const deliveryAttachRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const blankProject = {
    name: "",
    description: "",
    objective: "",
    scope: "",
    deliverables: "",
    successCriteria: "",
    sponsor: "",
    manager: "",
    startDate: "",
    dueDate: "",
    status: "Planejamento",
    priority: "M√©dia",
    budgetPlanned: "",
    costActual: "",
    hoursPlanned: "",
    hoursActual: "",
    workdays: [1, 2, 3, 4, 5],
    holidays: "",
    milestones: [],
    risks: [],
    issues: [],
    decisions: [],
    changeRequests: [],
  };
  const [projectForm, setProjectForm] = useState(blankProject);
  const [milestoneDraft, setMilestoneDraft] = useState({
    title: "",
    type: "Entrega",
    plannedDate: "",
    ownerName: "",
  });
  const [governanceDraft, setGovernanceDraft] = useState({
    kind: "risk",
    title: "",
    description: "",
    ownerName: "",
    severity: "M√©dia",
    dueDate: "",
  });
  const [editingProject, setEditingProject] = useState(null);
  const saveProject = (e) => {
    e.preventDefault();
    if (!projectForm.name.trim()) return;
    update((d) => {
      const previous = (d.projects || []).find((p) => p.id === editingProject);
      const item = createProjectRecord(
        projectForm,
        { businessId: business?.id, ownerId: db.user.id },
        previous,
      );
      return {
        ...d,
        projects: editingProject
          ? (d.projects || []).map((p) => (p.id === editingProject ? item : p))
          : [...(d.projects || []), item],
      };
    });
    setToast(editingProject ? "Projeto atualizado" : "Projeto criado");
    setProjectForm(blankProject);
    setEditingProject(null);
  };
  const editProject = (project) => {
    setEditingProject(project.id);
    setProjectForm({ ...blankProject, ...project });
  };
  const cancelProjectEdit = () => {
    setEditingProject(null);
    setProjectForm(blankProject);
  };
  const removeProject = (id) => {
    if (!confirm("Excluir este projeto? As tarefas j√° criadas com esse nome n√£o s√£o apagadas.")) return;
    update((d) => ({ ...d, projects: (d.projects || []).filter((p) => p.id !== id) }));
    if (editingProject === id) cancelProjectEdit();
    setToast("Projeto exclu√≠do");
  };
  const addMilestone = () => {
    if (!milestoneDraft.title.trim()) return;
    setProjectForm((current) => ({
      ...current,
      milestones: [
        ...(current.milestones || []),
        { ...milestoneDraft, id: uid(), status: "Pendente" },
      ],
    }));
    setMilestoneDraft({
      title: "",
      type: "Entrega",
      plannedDate: "",
      ownerName: "",
    });
  };
  const removeMilestone = (id) =>
    setProjectForm((current) => ({
      ...current,
      milestones: (current.milestones || []).filter((item) => item.id !== id),
    }));
  const governanceCollection = {
    risk: "risks",
    issue: "issues",
    decision: "decisions",
    change: "changeRequests",
  };
  const addGovernanceItem = () => {
    if (!governanceDraft.title.trim()) return;
    const collection = governanceCollection[governanceDraft.kind];
    const status =
      governanceDraft.kind === "decision"
        ? "Registrada"
        : governanceDraft.kind === "change"
          ? "Solicitada"
          : "Aberto";
    const item = normalizeGovernanceItem(
      { ...governanceDraft, status },
      governanceDraft.kind,
    );
    setProjectForm((current) => ({
      ...current,
      [collection]: [...(current[collection] || []), item],
    }));
    setGovernanceDraft({
      kind: governanceDraft.kind,
      title: "",
      description: "",
      ownerName: "",
      severity: "M√©dia",
      dueDate: "",
    });
  };
  const removeGovernanceItem = (kind, id) => {
    const collection = governanceCollection[kind];
    setProjectForm((current) => ({
      ...current,
      [collection]: (current[collection] || []).filter((item) => item.id !== id),
    }));
  };
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
      setToast("Evento adicionado √† sua Google Agenda");
    } catch {
      window.open(googleCalendarUrl(task), "_blank", "noopener");
    }
  };
  const blankTask = {
    title: "",
    description: "",
    priority: "M√©dia",
    status: "A fazer",
    startDate: "",
    due: "",
    estimatedDays: "1",
    baselineStart: "",
    baselineDue: "",
    area: "Opera√ß√£o",
    assigneeType: "real",
    assignee: "",
    assigneeId: "",
    project: "",
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
    visibility: "privado",
    sharedWith: [],
    sharedTeams: [],
    subtasks: [],
    subtaskDraft: "",
    acceptanceCriteria: [],
    criterionDraft: "",
    aiOutputs: [],
    aiRisks: [],
    aiQuestions: [],
    aiSuggestedSpecialist: "",
    dependsOn: [],
    attachments: [],
    recurrence: { frequency: "none" },
  };
  const [form, setForm] = useState(blankTask);
  const digitalCollaborators = [
    ...specialistData.map(([name]) => name),
    ...(db.customSpecialists || []).map((item) => item.name),
  ];
  useEffect(() => {
    let cancelled = false;
    const space = activeSpaceId();
    fetch(`/api/collab${space ? `?owner=${encodeURIComponent(space)}` : ""}`, {
      headers: authHeaders(),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setRealMembers(data?.members || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const statuses = ["A fazer", "Em andamento", "Aguardando", "Conclu√≠do"];
  const scoped = db.tasks.filter(
    (task) => !business || task.businessId === business.id,
  );
  const focusQueue = prioritizeTaskBacklog(scoped, { now: today() }).slice(0, 3);
  const assignees = [
    ...new Set(scoped.map((task) => task.assignee).filter(Boolean)),
  ];
  const projects = [
    ...new Set([
      ...(db.projects || []).map((p) => p.name),
      ...scoped.map((task) => task.project).filter(Boolean),
    ]),
  ];
  const ganttProject =
    projectFilter !== "Todos"
      ? (db.projects || []).find((project) => project.name === projectFilter)
      : null;
  const ganttSchedule = ganttProject
    ? buildProjectSchedule(db.tasks, ganttProject, {
        holidays: ganttProject.holidays || [],
        workdays: ganttProject.workdays || [1, 2, 3, 4, 5],
      })
    : null;
  const ganttRisks = ganttSchedule
    ? scheduleRiskSummary(ganttSchedule)
    : null;
  const applyCalculatedSchedule = () => {
    if (!ganttSchedule?.valid) {
      setToast("Corrija as depend√™ncias circulares antes de reprogramar.");
      return;
    }
    const calculated = new Map(
      ganttSchedule.rows.map((row) => [row.id, row]),
    );
    update((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        const row = calculated.get(task.id);
        if (!row) return task;
        return {
          ...task,
          startDate: row.start,
          due: row.end,
          estimatedDays: row.duration,
          baselineStart: task.baselineStart || task.startDate || row.start,
          baselineDue: task.baselineDue || task.due || row.end,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
    setToast("Cronograma aplicado sem alterar a baseline.");
  };
  const items = db.tasks.filter(
    (t) =>
      (!business || t.businessId === business.id) &&
      `${t.title} ${t.description || ""} ${t.assignee || ""} ${t.project || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) &&
      (statusFilter === "Todos" || t.status === statusFilter) &&
      (priorityFilter === "Todas" || t.priority === priorityFilter) &&
      (assigneeFilter === "Todos" || t.assignee === assigneeFilter) &&
      (projectFilter === "Todos" || t.project === projectFilter) &&
      (archiveFilter === "Todas" ||
        (archiveFilter === "Arquivadas" ? !!t.archived : !t.archived)),
  );
  const editingTask = editing ? db.tasks.find((t) => t.id === editing) : null;
  const availableMissions = db.tasks.filter(
    (t) =>
      (!business || t.businessId === business.id) &&
      t.isMission &&
      t.distribution === "disponivel" &&
      !t.archived &&
      (t.assignees || []).length < (t.slots || 1),
  );
  const openTask = (task = null) => {
    setEditing(task?.id || null);
    setForm(
      task
        ? {
            ...blankTask,
            ...task,
            acceptanceCriteria: (task.acceptanceCriteria || []).map((item) =>
              typeof item === "string"
                ? { id: uid(), text: item, done: false }
                : { ...item, id: item.id || uid() },
            ),
          }
        : blankTask,
    );
    setTaskAiError("");
    setDeadlineCalc({ open: false, base: today(), days: "5" });
    setModal(true);
  };
  const applyTaskStructure = (structure) => {
    const suggestedSpecialist = digitalCollaborators.includes(
      structure.suggestedSpecialist,
    )
      ? structure.suggestedSpecialist
      : "";
    const mergeChecklist = (current, generated, field) => {
      const existing = Array.isArray(current) ? current : [];
      const known = new Set(
        existing.map((item) =>
          String(item?.[field] || "").trim().toLocaleLowerCase("pt-BR"),
        ),
      );
      return [
        ...existing,
        ...(generated || [])
          .filter(
            (text) =>
              text && !known.has(String(text).trim().toLocaleLowerCase("pt-BR")),
          )
          .map((text) => ({ id: uid(), [field]: text, done: false })),
      ];
    };
    setForm((current) => ({
      ...current,
      title: structure.title || current.title,
      description: structure.description || current.description,
      priority: structure.priority || current.priority,
      area: structure.area || current.area,
      estimatedDays: structure.estimatedDays || current.estimatedDays,
      subtasks: mergeChecklist(current.subtasks, structure.subtasks, "title"),
      acceptanceCriteria: mergeChecklist(
        current.acceptanceCriteria,
        structure.acceptanceCriteria,
        "text",
      ),
      aiRisks: structure.risks || [],
      aiQuestions: structure.questions || [],
      aiSuggestedSpecialist: suggestedSpecialist,
      assigneeType: suggestedSpecialist ? "digital" : current.assigneeType,
      assignee: suggestedSpecialist || current.assignee,
    }));
  };
  const structureTaskWithAi = async () => {
    if (!form.title.trim() && !form.description.trim()) {
      setTaskAiError("Escreva ao menos um t√≠tulo ou uma descri√ß√£o.");
      return;
    }
    setTaskAiBusy(true);
    setTaskAiError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50_000);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: buildTaskStructurePrompt({
            task: form,
            business,
            projects,
            specialists: digitalCollaborators,
          }),
          specialist: "Diretor",
          ...aiWorkspaceContext(business),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Provedor indispon√≠vel");
      const structure = parseTaskStructure(data.content, form);
      if (!structure) throw new Error("A resposta n√£o veio no formato esperado");
      applyTaskStructure(structure);
      setToast("Tarefa estruturada com etapas e crit√©rios verific√°veis");
    } catch {
      applyTaskStructure(localTaskStructure(form));
      setTaskAiError(
        "A IA externa n√£o respondeu. A conting√™ncia local organizou uma vers√£o segura para voc√™ revisar.",
      );
      setToast("Tarefa organizada pela conting√™ncia local");
    } finally {
      clearTimeout(timer);
      setTaskAiBusy(false);
    }
  };
  const applyDeadlineCalc = () => {
    const due = addBusinessDays(deadlineCalc.base, Number(deadlineCalc.days) || 0);
    if (due) setForm((current) => ({ ...current, due }));
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (form.status === "Conclu√≠do") {
      const gaps = taskCompletionGaps(form);
      if (gaps.length) {
        setToast(`Ainda n√£o pode concluir: ${gaps.join("; ")}`);
        return;
      }
    }
    if (
      form.status === "Conclu√≠do" &&
      editingTask &&
      editingTask.status !== "Conclu√≠do" &&
      isBlocked(editingTask)
    ) {
      setToast(
        `Bloqueada: conclua antes "${blockingTasks(editingTask)
          .map((dep) => dep.title)
          .join('", "')}"`,
      );
      return;
    }
    const now = new Date().toISOString();
    update((d) => {
      const {
        deliveryDraft: _deliveryDraft,
        subtaskDraft: _subtaskDraft,
        criterionDraft: _criterionDraft,
        ...rest
      } = form;
      const isMission = !!form.isMission;
      const selectedProject = (d.projects || []).find(
        (project) => project.name === form.project,
      );
      const item = {
        ...rest,
        title: form.title.trim(),
        id: editing || uid(),
        businessId: business?.id || form.businessId || null,
        archived: !!form.archived,
        ownerId: form.ownerId || db.user.id,
        projectId: selectedProject?.id || form.projectId || null,
        baselineStart:
          form.baselineStart || (!editing ? form.startDate || "" : ""),
        baselineDue: form.baselineDue || (!editing ? form.due || "" : ""),
        visibility:
          isMission && form.distribution === "disponivel"
            ? "espaco_todo"
            : form.visibility || "privado",
        missionStatus:
          isMission && !editing && form.distribution === "disponivel"
            ? "disponivel"
            : form.missionStatus || "",
        slots: isMission ? Number(form.slots) || 1 : 1,
        points: isMission ? Number(form.points) || 0 : 0,
        reward: isMission ? Number(form.reward) || 0 : 0,
        rewardStatus:
          isMission && Number(form.reward) > 0
            ? form.rewardStatus || "prevista"
            : form.rewardStatus || "",
        assignees: Array.isArray(form.assignees) ? form.assignees : [],
        interested: Array.isArray(form.interested) ? form.interested : [],
        deliveries: Array.isArray(form.deliveries) ? form.deliveries : [],
        sharedWith: Array.isArray(form.sharedWith) ? form.sharedWith : [],
        sharedTeams: Array.isArray(form.sharedTeams) ? form.sharedTeams : [],
        subtasks: Array.isArray(form.subtasks) ? form.subtasks : [],
        acceptanceCriteria: Array.isArray(form.acceptanceCriteria)
          ? form.acceptanceCriteria
          : [],
        aiOutputs: Array.isArray(form.aiOutputs)
          ? form.aiOutputs.slice(0, 3)
          : [],
        dependsOn: Array.isArray(form.dependsOn) ? form.dependsOn : [],
        attachments: Array.isArray(form.attachments) ? form.attachments : [],
        recurrence:
          form.recurrence?.frequency && form.recurrence.frequency !== "none"
            ? {
                frequency: form.recurrence.frequency,
                seriesId: form.recurrence.seriesId || uid(),
              }
            : { frequency: "none" },
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
  const blockingTasks = (task) =>
    (task.dependsOn || [])
      .map((depId) => db.tasks.find((x) => x.id === depId))
      .filter((dep) => dep && dep.status !== "Conclu√≠do");
  const isBlocked = (task) => blockingTasks(task).length > 0;
  const changeTaskStatus = (task, newStatus) => {
    if (newStatus === "Conclu√≠do") {
      const gaps = taskCompletionGaps(task);
      if (gaps.length) {
        setToast(`Ainda n√£o pode concluir: ${gaps.join("; ")}`);
        return;
      }
    }
    if (newStatus === "Conclu√≠do" && isBlocked(task)) {
      setToast(
        `Bloqueada: conclua antes "${blockingTasks(task)
          .map((dep) => dep.title)
          .join('", "')}"`,
      );
      return;
    }
    const frequency = task.recurrence?.frequency;
    const completesRecurring =
      newStatus === "Conclu√≠do" &&
      task.status !== "Conclu√≠do" &&
      frequency &&
      frequency !== "none";
    if (!completesRecurring) {
      changeTask(task.id, { status: newStatus });
      return;
    }
    const now = new Date().toISOString();
    const nextTask = {
      ...task,
      id: uid(),
      status: "A fazer",
      due: nextRecurrenceDue(task.due, frequency),
      deliveries: [],
      interested: [],
      attachments: [],
      subtasks: (task.subtasks || []).map((item) => ({ ...item, done: false })),
      acceptanceCriteria: (task.acceptanceCriteria || []).map((item) => ({
        ...item,
        done: false,
      })),
      aiOutputs: [],
      missionStatus:
        task.isMission && task.distribution === "disponivel"
          ? "disponivel"
          : "",
      createdAt: now,
      updatedAt: now,
    };
    update((d) => ({
      ...d,
      tasks: [
        nextTask,
        ...d.tasks.map((x) =>
          x.id === task.id ? { ...x, status: newStatus, updatedAt: now } : x,
        ),
      ],
    }));
    setToast("Tarefa conclu√≠da ‚Äî pr√≥xima ocorr√™ncia criada");
  };
  const notifyUser = (recipientId, message) => {
    if (!recipientId || recipientId === db.user.id) return;
    update((d) => ({
      ...d,
      notifications: pushNotification(d.notifications, {
        recipientId,
        message,
        link: "operacao",
        createdBy: db.user.id,
      }),
    }));
  };
  const expressInterest = async (task) => {
    const already = (task.interested || []).some((i) => i.userId === db.user.id);
    if (already) return;
    try {
      const payload = await workspaceAction("interest", task.id);
      if (!payload?.task) {
        changeTask(task.id, {
          interested: [
            ...(task.interested || []),
            { userId: db.user.id, name: db.user.name, at: new Date().toISOString() },
          ],
        });
        notifyUser(task.ownerId, `Novo interesse em "${task.title}"`);
      }
      setToast("Interesse enviado");
    } catch (error) {
      setToast(error.message || "N√£o foi poss√≠vel enviar o interesse");
    }
  };
  const withdrawInterest = async (task) => {
    try {
      const payload = await workspaceAction("withdraw-interest", task.id);
      if (!payload?.task)
        changeTask(task.id, {
          interested: (task.interested || []).filter(
            (i) => i.userId !== db.user.id,
          ),
        });
      setToast("Interesse retirado");
    } catch (error) {
      setToast(error.message || "N√£o foi poss√≠vel retirar o interesse");
    }
  };
  const assumeTask = async (task) => {
    if (isBlocked(task)) {
      setToast(
        `Bloqueada: conclua antes "${blockingTasks(task)
          .map((dep) => dep.title)
          .join('", "')}"`,
      );
      return;
    }
    const assignees = task.assignees || [];
    if (assignees.some((a) => a.userId === db.user.id)) return;
    const slots = task.slots || 1;
    if (assignees.length >= slots) {
      setToast("N√£o h√° mais vagas dispon√≠veis para esta miss√£o");
      return;
    }
    try {
      const payload = await workspaceAction("assume", task.id);
      if (!payload?.task) {
        const nextAssignees = [
          ...assignees,
          { userId: db.user.id, name: db.user.name, at: new Date().toISOString() },
        ];
        const full = nextAssignees.length >= slots;
        changeTask(task.id, {
          assignees: nextAssignees,
          missionStatus: full ? "em_andamento" : "disponivel",
          status: full ? "Em andamento" : task.status,
        });
        notifyUser(task.ownerId, `Vaga assumida em "${task.title}"`);
      }
      trackProductEvent("task_claimed", {
        module: "operacao",
        kind: "mission",
        success: true,
      });
      setToast("Miss√£o assumida");
    } catch (error) {
      setToast(error.message || "N√£o foi poss√≠vel assumir a miss√£o");
    }
  };
  const approveInterested = (task, userId) => {
    const person = (task.interested || []).find((i) => i.userId === userId);
    if (!person) return;
    const assignees = [...(task.assignees || []), person];
    const full = assignees.length >= (task.slots || 1);
    changeTask(task.id, {
      assignees,
      interested: (task.interested || []).filter((i) => i.userId !== userId),
      missionStatus: full ? "em_andamento" : "aguardando_aprovacao",
      status: full ? "Em andamento" : task.status,
    });
    notifyUser(userId, `Voc√™ foi aprovado(a) para "${task.title}"`);
    setToast(`${person.name} aprovado(a) para a miss√£o`);
  };
  const rejectInterested = (task, userId) => {
    changeTask(task.id, {
      interested: (task.interested || []).filter((i) => i.userId !== userId),
    });
    setToast("Interesse recusado");
  };
  const submitDelivery = (task, comment, collaboratorFeedback = {}, attachments = []) => {
    if (!comment.trim()) return;
    if (isBlocked(task)) {
      setToast(
        `Bloqueada: conclua antes "${blockingTasks(task)
          .map((dep) => dep.title)
          .join('", "')}"`,
      );
      return;
    }
    changeTask(task.id, {
      deliveries: [
        ...(task.deliveries || []),
        {
          id: uid(),
          comment: comment.trim(),
          authorId: db.user.id,
          authorName: db.user.name,
          createdAt: new Date().toISOString(),
          status: "enviada",
          wasClear: !!collaboratorFeedback.wasClear,
          neededHelp: !!collaboratorFeedback.neededHelp,
          attachments: Array.isArray(attachments) ? attachments : [],
        },
      ],
      missionStatus: "enviada_para_revisao",
    });
    notifyUser(task.ownerId, `Nova entrega em "${task.title}"`);
    setToast("Entrega enviada para revis√£o");
  };
  const reviewDelivery = (task, approved, feedback, managerFeedback = {}) => {
    if (approved) {
      const gaps = taskCompletionGaps(task);
      if (gaps.length) {
        setToast(`Confirme a entrega antes de aprovar: ${gaps.join("; ")}`);
        return;
      }
    }
    changeTask(task.id, {
      missionStatus: approved ? "aprovada" : "correcao_solicitada",
      status: approved ? "Conclu√≠do" : task.status,
      rewardStatus:
        approved && Number(task.reward) > 0 ? "aprovada" : task.rewardStatus,
      deliveries: (task.deliveries || []).map((d, i) =>
        i === (task.deliveries || []).length - 1
          ? {
              ...d,
              status: approved ? "aprovada" : "correcao_solicitada",
              feedback,
              followedInstructions: !!managerFeedback.followedInstructions,
              autonomous: !!managerFeedback.autonomous,
            }
          : d,
      ),
    });
    const notifyMessage = approved
      ? `Entrega aprovada: "${task.title}"`
      : `Corre√ß√£o solicitada: "${task.title}"`;
    const recipients = new Set(
      [task.assigneeId, ...(task.assignees || []).map((a) => a.userId)].filter(
        Boolean,
      ),
    );
    recipients.forEach((id) => notifyUser(id, notifyMessage));
    setToast(approved ? "Entrega aprovada" : "Corre√ß√£o solicitada");
  };
  const removeTask = (id) => {
    if (!confirm("Excluir esta tarefa definitivamente?")) return;
    update((d) => ({
      ...d,
      tasks: d.tasks.filter((task) => task.id !== id),
    }));
    setToast("Tarefa exclu√≠da");
  };
  const toggleSelected = (id) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );
  const clearSelection = () => setSelectedIds([]);
  const bulkArchive = (archived) => {
    const now = new Date().toISOString();
    update((d) => ({
      ...d,
      tasks: d.tasks.map((task) =>
        selectedIds.includes(task.id)
          ? { ...task, archived, updatedAt: now }
          : task,
      ),
    }));
    setToast(
      archived
        ? `${selectedIds.length} tarefa(s) arquivada(s)`
        : `${selectedIds.length} tarefa(s) desarquivada(s)`,
    );
    clearSelection();
  };
  const bulkReassign = () => {
    const value = bulkAssignee.trim();
    if (!value) return;
    const member = realMembers.find((m) => m.name === value);
    const now = new Date().toISOString();
    update((d) => ({
      ...d,
      tasks: d.tasks.map((task) =>
        selectedIds.includes(task.id)
          ? {
              ...task,
              assignee: value,
              assigneeId: member ? member.id : "",
              updatedAt: now,
            }
          : task,
      ),
    }));
    setToast(`${selectedIds.length} tarefa(s) reatribu√≠da(s) para ${value}`);
    setBulkAssignee("");
    clearSelection();
  };
  const startDigitalTask = (task) => {
    const specialist = task.assignee || "Diretor";
    const prompt = buildDigitalTaskPrompt(task, {
      specialist,
      business,
      dependencies: (task.dependsOn || [])
        .map((id) => db.tasks.find((item) => item.id === id))
        .filter(Boolean),
    });
    const conversationId = uid();
    const now = new Date().toISOString();
    localStorage.setItem("sf-draft", prompt);
    update((d) => ({
      ...d,
      selectedConversationId: conversationId,
      conversations: [
        {
          id: conversationId,
          sourceTaskId: task.id,
          title: task.title,
          businessId: business?.id || null,
          specialist,
          ownerId: db.user.id,
          createdAt: now,
          messages: [],
        },
        ...(d.conversations || []),
      ],
      preferences: { ...d.preferences, specialist },
      tasks: d.tasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: item.status === "A fazer" ? "Em andamento" : item.status,
              startedAt: item.startedAt || now,
              updatedAt: now,
            }
          : item,
      ),
    }));
    setToast(`Tarefa encaminhada para ${specialist}`);
    go("estrategia");
  };
  return (
    <PageTitle
      eyebrow="OPERA√á√ÉO"
      title="Tarefas e projetos"
      text="Organize as pr√≥ximas a√ß√µes sem perder o contexto."
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
      <section className="task-focus-card" aria-label="Foco recomendado">
        <div className="task-focus-head">
          <span><Target /></span>
          <div>
            <strong>Foco recomendado</strong>
            <small>
              Prioridade calculada no aparelho por prazo, urg√™ncia e bloqueios ‚Äî sem gastar cota de IA.
            </small>
          </div>
        </div>
        {focusQueue.length ? (
          <div className="task-focus-list">
            {focusQueue.map(({ task, reasons }, index) => (
              <button
                type="button"
                key={task.id}
                aria-label={`Abrir tarefa priorit√°ria: ${task.title}`}
                onClick={() => openTask(task)}
              >
                <span>{index + 1}</span>
                <span>
                  <strong
                    className="task-focus-title"
                    data-title={task.title}
                    aria-hidden="true"
                  />
                  <small>{reasons.slice(0, 2).join(" ¬∑ ") || "pr√≥xima a√ß√£o dispon√≠vel"}</small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
        ) : (
          <small className="task-focus-empty">Nenhuma tarefa ativa esperando aten√ß√£o.</small>
        )}
      </section>
      <div className="toolbar" id="task-board">
        <div className="search">
          <Search />
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearch(e.target.value);
              clearSearchSeed?.();
            }}
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
          <button
            className={view === "missoes" ? "active" : ""}
            onClick={() => setView("missoes")}
          >
            <Award />
            Dispon√≠veis
          </button>
          <button
            className={view === "calendario" ? "active" : ""}
            onClick={() => setView("calendario")}
          >
            <CalendarDays />
            Calend√°rio
          </button>
          <button
            className={view === "gantt" ? "active" : ""}
            onClick={() => setView("gantt")}
          >
            <BarChart3 />
            Gantt
          </button>
        </div>
      </div>
      <div className="collab-card">
        <h3>
          <ListTodo />
          Projetos
        </h3>
        <p>
          Crie um projeto antes de come√ßar as tarefas, ou apenas escreva o
          nome do projeto na tarefa ‚Äî funciona dos dois jeitos.
        </p>
        <Button
          variant="ghost"
          icon={ListTodo}
          onClick={() => setProjectsOpen((v) => !v)}
        >
          {projectsOpen ? "Ocultar projetos" : "Gerenciar projetos"}
        </Button>
        {projectsOpen && (
          <>
            <form className="invite-form" onSubmit={saveProject}>
              <div className="form-grid">
                <Field label="Nome do projeto">
                  <input
                    required
                    value={projectForm.name}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Descri√ß√£o (opcional)">
                  <input
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, description: e.target.value })
                    }
                  />
                </Field>
                <Field label="Objetivo">
                  <input
                    value={projectForm.objective}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, objective: e.target.value })
                    }
                  />
                </Field>
                <Field label="Escopo">
                  <input
                    value={projectForm.scope}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, scope: e.target.value })
                    }
                  />
                </Field>
                <Field label="Entreg√°veis">
                  <input
                    value={projectForm.deliverables}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        deliverables: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Crit√©rios de sucesso">
                  <input
                    value={projectForm.successCriteria}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        successCriteria: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Patrocinador">
                  <input
                    value={projectForm.sponsor}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, sponsor: e.target.value })
                    }
                  />
                </Field>
                <Field label="Gerente do projeto">
                  <input
                    value={projectForm.manager}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, manager: e.target.value })
                    }
                  />
                </Field>
                <Field label="In√≠cio">
                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, startDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Conclus√£o prevista">
                  <input
                    type="date"
                    value={projectForm.dueDate}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, dueDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={projectForm.status}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, status: e.target.value })
                    }
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Prioridade">
                  <select
                    value={projectForm.priority}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, priority: e.target.value })
                    }
                  >
                    {["Baixa", "M√©dia", "Alta", "Cr√≠tica"].map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Or√ßamento planejado">
                  <input
                    type="number"
                    min="0"
                    value={projectForm.budgetPlanned}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        budgetPlanned: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Custo realizado">
                  <input
                    type="number"
                    min="0"
                    value={projectForm.costActual}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, costActual: e.target.value })
                    }
                  />
                </Field>
                <Field label="Horas previstas">
                  <input
                    type="number"
                    min="0"
                    value={projectForm.hoursPlanned}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        hoursPlanned: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Horas realizadas">
                  <input
                    type="number"
                    min="0"
                    value={projectForm.hoursActual}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, hoursActual: e.target.value })
                    }
                  />
                </Field>
                <Field label="Feriados do projeto">
                  <textarea
                    rows={2}
                    value={
                      Array.isArray(projectForm.holidays)
                        ? projectForm.holidays.join("\n")
                        : projectForm.holidays || ""
                    }
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        holidays: e.target.value,
                      })
                    }
                    placeholder={"2026-09-07\n2026-10-12"}
                  />
                </Field>
              </div>
              <div className="field">
                <span>Dias de trabalho</span>
                <div className="checkbox-list compact">
                  {[
                    [1, "Seg"],
                    [2, "Ter"],
                    [3, "Qua"],
                    [4, "Qui"],
                    [5, "Sex"],
                    [6, "S√°b"],
                    [0, "Dom"],
                  ].map(([day, label]) => (
                    <label className="cost-check" key={day}>
                      <input
                        type="checkbox"
                        checked={(projectForm.workdays || []).includes(day)}
                        onChange={() =>
                          setProjectForm((current) => ({
                            ...current,
                            workdays: (current.workdays || []).includes(day)
                              ? current.workdays.filter((item) => item !== day)
                              : [...(current.workdays || []), day],
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="project-milestone-editor">
                <h4>Linha de marcos</h4>
                <div className="form-grid">
                  <Field label="Marco">
                    <input
                      value={milestoneDraft.title}
                      onChange={(e) =>
                        setMilestoneDraft({
                          ...milestoneDraft,
                          title: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Tipo">
                    <select
                      value={milestoneDraft.type}
                      onChange={(e) =>
                        setMilestoneDraft({
                          ...milestoneDraft,
                          type: e.target.value,
                        })
                      }
                    >
                      {MILESTONE_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Data planejada">
                    <input
                      type="date"
                      value={milestoneDraft.plannedDate}
                      onChange={(e) =>
                        setMilestoneDraft({
                          ...milestoneDraft,
                          plannedDate: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Respons√°vel">
                    <input
                      value={milestoneDraft.ownerName}
                      onChange={(e) =>
                        setMilestoneDraft({
                          ...milestoneDraft,
                          ownerName: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  icon={Plus}
                  onClick={addMilestone}
                >
                  Adicionar marco
                </Button>
                {(projectForm.milestones || []).map((milestone) => (
                  <div className="project-milestone-row" key={milestone.id}>
                    <span>
                      <strong>{milestone.title}</strong>
                      <small>
                        {milestone.type}
                        {milestone.plannedDate
                          ? ` ¬∑ ${new Date(`${milestone.plannedDate}T12:00:00`).toLocaleDateString("pt-BR")}`
                          : ""}
                        {milestone.ownerName ? ` ¬∑ ${milestone.ownerName}` : ""}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="icon-button danger"
                      title="Remover marco"
                      onClick={() => removeMilestone(milestone.id)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
              <div className="project-milestone-editor">
                <h4>Governan√ßa do projeto</h4>
                <p className="field-hint">
                  Registre riscos, problemas, decis√µes e solicita√ß√µes de mudan√ßa
                  no mesmo projeto.
                </p>
                <div className="form-grid">
                  <Field label="Tipo">
                    <select
                      value={governanceDraft.kind}
                      onChange={(e) =>
                        setGovernanceDraft({
                          ...governanceDraft,
                          kind: e.target.value,
                        })
                      }
                    >
                      <option value="risk">Risco</option>
                      <option value="issue">Problema</option>
                      <option value="decision">Decis√£o</option>
                      <option value="change">Mudan√ßa de escopo</option>
                    </select>
                  </Field>
                  <Field label="T√≠tulo">
                    <input
                      value={governanceDraft.title}
                      onChange={(e) =>
                        setGovernanceDraft({
                          ...governanceDraft,
                          title: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Respons√°vel">
                    <input
                      value={governanceDraft.ownerName}
                      onChange={(e) =>
                        setGovernanceDraft({
                          ...governanceDraft,
                          ownerName: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Severidade">
                    <select
                      value={governanceDraft.severity}
                      onChange={(e) =>
                        setGovernanceDraft({
                          ...governanceDraft,
                          severity: e.target.value,
                        })
                      }
                    >
                      {["Baixa", "M√©dia", "Alta", "Cr√≠tica"].map((severity) => (
                        <option key={severity}>{severity}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Prazo">
                    <input
                      type="date"
                      value={governanceDraft.dueDate}
                      onChange={(e) =>
                        setGovernanceDraft({
                          ...governanceDraft,
                          dueDate: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Descri√ß√£o">
                    <input
                      value={governanceDraft.description}
                      onChange={(e) =>
                        setGovernanceDraft({
                          ...governanceDraft,
                          description: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  icon={Plus}
                  onClick={addGovernanceItem}
                >
                  Adicionar registro
                </Button>
                {[
                  ...(projectForm.risks || []),
                  ...(projectForm.issues || []),
                  ...(projectForm.decisions || []),
                  ...(projectForm.changeRequests || []),
                ].map((item) => (
                  <div className="project-milestone-row" key={item.id}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {{
                          risk: "Risco",
                          issue: "Problema",
                          decision: "Decis√£o",
                          change: "Mudan√ßa",
                        }[item.kind] || item.kind}
                        {" ¬∑ "}
                        {item.severity}
                        {item.ownerName ? ` ¬∑ ${item.ownerName}` : ""}
                        {item.status ? ` ¬∑ ${item.status}` : ""}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="icon-button danger"
                      title="Remover registro"
                      onClick={() => removeGovernanceItem(item.kind, item.id)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
              <div className="task-actions">
                <Button type="submit" icon={editingProject ? Save : Plus}>
                  {editingProject ? "Salvar projeto" : "Criar projeto"}
                </Button>
                {editingProject && (
                  <Button variant="ghost" type="button" onClick={cancelProjectEdit}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
            {(db.projects || []).length > 0 && (
              <div className="member-list">
                {(db.projects || []).map((p) => {
                  const metrics = projectMetrics(p, db.tasks);
                  return (
                  <div key={p.id} className="project-summary-row">
                    <span className="avatar">{p.name[0]}</span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.status || "Planejamento"} ¬∑ {metrics.progress}% ¬∑{" "}
                        {metrics.health}
                      </small>
                      {(metrics.openRisks > 0 || metrics.openIssues > 0) && (
                        <small>
                          {metrics.openRisks} risco(s) ¬∑ {metrics.openIssues} problema(s)
                        </small>
                      )}
                      <span className="project-progress" aria-label={`${metrics.progress}% conclu√≠do`}>
                        <i style={{ width: `${metrics.progress}%` }} />
                      </span>
                      {metrics.nextMilestones[0] && (
                        <small>
                          Pr√≥ximo marco: {metrics.nextMilestones[0].milestone.title}
                          {metrics.nextMilestones[0].milestone.plannedDate
                            ? ` ¬∑ ${new Date(`${metrics.nextMilestones[0].milestone.plannedDate}T12:00:00`).toLocaleDateString("pt-BR")}`
                            : ""}
                        </small>
                      )}
                    </span>
                    <span className="task-actions">
                      <button
                        className="icon-button"
                        title="Editar projeto"
                        onClick={() => editProject(p)}
                      >
                        <Edit3 />
                      </button>
                      <button
                        className="icon-button danger"
                        title="Excluir projeto"
                        onClick={() => removeProject(p.id)}
                      >
                        <Trash2 />
                      </button>
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {view !== "missoes" && <div className="filter-row">
        <FilterSelect
          aria-label="Filtrar por status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>Todos</option>
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          aria-label="Filtrar por prioridade"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option>Todas</option>
          <option>Baixa</option>
          <option>M√©dia</option>
          <option>Alta</option>
        </FilterSelect>
        <FilterSelect
          aria-label="Filtrar por respons√°vel"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option>Todos</option>
          {assignees.map((assignee) => (
            <option key={assignee}>{assignee}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          aria-label="Filtrar por projeto"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option>Todos</option>
          {projects.map((project) => (
            <option key={project}>{project}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          aria-label="Filtrar arquivamento"
          value={archiveFilter}
          onChange={(e) => setArchiveFilter(e.target.value)}
        >
          <option>Ativas</option>
          <option>Arquivadas</option>
          <option>Todas</option>
        </FilterSelect>
      </div>}
      {view === "missoes" ? (
        availableMissions.length === 0 ? (
          <Empty
            icon={Award}
            title="Nenhuma miss√£o dispon√≠vel no momento"
            text="Quando algu√©m publicar uma miss√£o aberta para escolha, ela aparece aqui."
          />
        ) : (
          <div className="data-list">
            {availableMissions.map((t) => {
              const alreadyAssigned = (t.assignees || []).some(
                (a) => a.userId === db.user.id,
              );
              const alreadyInterested = (t.interested || []).some(
                (i) => i.userId === db.user.id,
              );
              const slotsLeft = (t.slots || 1) - (t.assignees || []).length;
              return (
                <article key={t.id}>
                  <span>
                    <strong>{t.title}</strong>
                    <small>
                      {t.difficulty} ¬∑ {t.points || 0} pontos
                      {t.reward ? ` ¬∑ ${money(t.reward)}` : ""} ¬∑ {slotsLeft}{" "}
                      {slotsLeft === 1 ? "vaga" : "vagas"}
                      {t.due ? ` ¬∑ Prazo: ${t.due}` : ""}
                    </small>
                  </span>
                  {alreadyAssigned ? (
                    <span className="publish-state live">
                      <BadgeCheck /> Voc√™ assumiu
                    </span>
                  ) : t.approvalMode === "aprovacao" ? (
                    <Button
                      variant={alreadyInterested ? "ghost" : "secondary"}
                      onClick={() =>
                        alreadyInterested
                          ? withdrawInterest(t)
                          : expressInterest(t)
                      }
                    >
                      {alreadyInterested ? "Retirar interesse" : "Demonstrar interesse"}
                    </Button>
                  ) : (
                    <Button onClick={() => assumeTask(t)}>Assumir miss√£o</Button>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : items.length === 0 ? (
        <Empty
          icon={ListTodo}
          title="Nenhuma tarefa encontrada"
          text="Crie uma a√ß√£o com prioridade e prazo para come√ßar."
          action="Criar tarefa"
          onAction={() => openTask()}
        />
      ) : view === "board" ? (
        <div className="kanban" ref={kanbanRef}>
          {statuses.map((s) => (
            /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
            <section
              key={s}
              data-kanban-status={s}
              className={dragOverStatus === s ? "drag-over" : ""}
              onDragOver={(e) => {
                if (!draggedTaskId) return;
                e.preventDefault();
                setDragOverStatus(s);
              }}
              onDragLeave={() =>
                setDragOverStatus((current) => (current === s ? null : current))
              }
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStatus(null);
                const task = items.find((x) => x.id === draggedTaskId);
                setDraggedTaskId(null);
                if (task && task.status !== s) changeTaskStatus(task, s);
              }}
            >
              <header>
                <span>{s}</span>
                <b>{items.filter((x) => x.status === s).length}</b>
              </header>
              {items
                .filter((x) => x.status === s)
                .map((t) => (
                  /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
                  <article
                    key={t.id}
                    draggable
                    className={draggedTaskId === t.id ? "dragging" : ""}
                    onDragStart={() => setDraggedTaskId(t.id)}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDragOverStatus(null);
                    }}
                    onTouchStart={onCardTouchStart(t)}
                    onTouchEnd={onCardTouchEnd}
                    onTouchCancel={() => {
                      clearTouchDrag();
                      setDraggedTaskId(null);
                      setDragOverStatus(null);
                    }}
                  >
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
                    <h3>
                      {t.title}
                      {isBlocked(t) && (
                        <span
                          className="blocked-badge"
                          title={`Aguardando: ${blockingTasks(t)
                            .map((dep) => dep.title)
                            .join(", ")}`}
                        >
                          Bloqueada
                        </span>
                      )}
                    </h3>
                    <p>{t.description || "Sem descri√ß√£o"}</p>
                    <footer>
                      <span>
                        <Clock3 />
                        {t.due || "Sem prazo"}
                        {taskUrgency(t) && (
                          <em className={`urgency ${taskUrgency(t).tone}`}>
                            {taskUrgency(t).text}
                          </em>
                        )}
                        {(t.attachments || []).length > 0 && (
                          <em
                            className="attachment-count"
                            title={`${t.attachments.length} anexo(s)`}
                          >
                            <Paperclip />
                            {t.attachments.length}
                          </em>
                        )}
                        {t.recurrence?.frequency &&
                          t.recurrence.frequency !== "none" && (
                            <em
                              className="attachment-count"
                              title={
                                RECURRENCE_OPTIONS.find(
                                  (option) =>
                                    option.value === t.recurrence.frequency,
                                )?.label || "Tarefa recorrente"
                              }
                            >
                              <Repeat />
                            </em>
                          )}
                      </span>
                      <select
                        value={t.status}
                        onChange={(e) => changeTaskStatus(t, e.target.value)}
                      >
                        {statuses.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </footer>
                    {(t.project || t.assignee) && (
                      <small className="task-context">
                        {t.project || "Sem projeto"} ¬∑{" "}
                        {t.assignee || "Sem respons√°vel"}
                        {t.assignee &&
                          ` ¬∑ ${t.assigneeType === "digital" ? "Colaborador digital" : "Pessoa"}`}
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
      ) : view === "gantt" ? (
        !ganttProject ? (
          <div className="empty-state">
            <BarChart3 />
            <h3>Escolha um projeto</h3>
            <p>
              Use o filtro de projeto para calcular depend√™ncias, folgas e
              caminho cr√≠tico.
            </p>
          </div>
        ) : ganttSchedule.rows.length === 0 ? (
          <div className="empty-state">
            <BarChart3 />
            <h3>Projeto sem tarefas</h3>
            <p>Vincule tarefas a {ganttProject.name} para gerar o cronograma.</p>
          </div>
        ) : (
          <div className="gantt-panel">
            <div className="gantt-summary">
              <span>
                <strong>{ganttProject.name}</strong>
                <small>
                  {ganttSchedule.start} a {ganttSchedule.end} ¬∑{" "}
                  {ganttSchedule.duration} dias √∫teis
                </small>
              </span>
              <span
                className={
                  ganttSchedule.valid
                    ? "publish-state live"
                    : "publish-state error"
                }
              >
                {ganttSchedule.valid
                  ? `${ganttRisks.criticalTasks} tarefa(s) cr√≠tica(s)`
                  : `${ganttRisks.cyclicTasks} depend√™ncia(s) circular(es)`}
              </span>
              {ganttRisks.delayedAgainstBaseline > 0 && (
                <span className="blocked-badge">
                  {ganttRisks.delayedAgainstBaseline} atraso(s) contra baseline
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                icon={RefreshCw}
                onClick={applyCalculatedSchedule}
                disabled={!ganttSchedule.valid}
              >
                Aplicar reprograma√ß√£o
              </Button>
            </div>
            <div className="gantt-table">
              <div className="gantt-head">
                <span>Tarefa</span>
                <span>Cronograma calculado</span>
              </div>
              {ganttSchedule.rows.map((row) => (
                <div className="gantt-row" key={row.id}>
                  <button type="button" onClick={() => openTask(row.task)}>
                    <strong>{row.task.title}</strong>
                    <small>
                      {row.start} a {row.end} ¬∑ {row.duration}d ¬∑ folga{" "}
                      {row.slack}d
                    </small>
                  </button>
                  <div className="gantt-track">
                    {row.task.baselineStart && row.task.baselineDue && (
                      <i
                        className="gantt-baseline"
                        style={{
                          left: `${ganttPosition(
                            row.task.baselineStart,
                            ganttSchedule,
                          )}%`,
                          width: `${Math.max(
                            2,
                            ganttPosition(
                              row.task.baselineDue,
                              ganttSchedule,
                            ) -
                              ganttPosition(
                                row.task.baselineStart,
                                ganttSchedule,
                              ),
                          )}%`,
                        }}
                      />
                    )}
                    <i
                      className={`gantt-bar ${row.critical ? "critical" : ""} ${
                        row.cyclic ? "cyclic" : ""
                      }`}
                      style={{
                        left: `${ganttPosition(row.start, ganttSchedule)}%`,
                        width: `${ganttWidth(row.duration, ganttSchedule)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {(ganttProject.milestones || []).length > 0 && (
              <div className="gantt-milestones">
                <strong>Marcos</strong>
                {(ganttProject.milestones || []).map((milestone) => (
                  <span key={milestone.id}>
                    <i
                      style={{
                        left: `${ganttPosition(
                          milestone.actualDate || milestone.plannedDate,
                          ganttSchedule,
                        )}%`,
                      }}
                    />
                    {milestone.title} ¬∑{" "}
                    {milestone.actualDate || milestone.plannedDate}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      ) : view === "calendario" ? (
        <div className="task-calendar">
          <div className="task-calendar-header">
            <button
              type="button"
              className="icon-button"
              aria-label="M√™s anterior"
              onClick={() =>
                setCalendarMonth((m) => shiftYearMonth(m, -1))
              }
            >
              <ChevronLeft />
            </button>
            <strong>
              {new Date(`${calendarMonth}-01T00:00:00`).toLocaleDateString(
                "pt-BR",
                { month: "long", year: "numeric" },
              )}
            </strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Pr√≥ximo m√™s"
              onClick={() =>
                setCalendarMonth((m) => shiftYearMonth(m, 1))
              }
            >
              <ChevronRight />
            </button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCalendarMonth(todayYearMonth())}
            >
              Hoje
            </Button>
          </div>
          <div className="task-calendar-weekdays">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S√°b"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="task-calendar-grid">
            {buildTaskCalendar(calendarMonth, items).map((cell, index) =>
              cell ? (
                <div
                  key={cell.ymd}
                  className={`task-calendar-cell ${
                    cell.ymd === today() ? "is-today" : ""
                  }`}
                >
                  <span className="task-calendar-day">{cell.day}</span>
                  {cell.tasks.slice(0, 3).map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      className={`task-calendar-chip priority-${t.priority.toLowerCase()}`}
                      onClick={() => openTask(t)}
                    >
                      {t.title}
                    </button>
                  ))}
                  {cell.tasks.length > 3 && (
                    <small>+{cell.tasks.length - 3} mais</small>
                  )}
                </div>
              ) : (
                <div key={`blank-${index}`} className="task-calendar-cell is-blank" />
              ),
            )}
          </div>
        </div>
      ) : (
        <div className="data-list">
          {items.length > 0 && (
            <div className="bulk-bar">
              <label className="cost-check">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas as tarefas vis√≠veis"
                  checked={
                    selectedIds.length > 0 &&
                    items.every((t) => selectedIds.includes(t.id))
                  }
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? items.map((t) => t.id) : [])
                  }
                />
                <span>
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selecionada(s)`
                    : "Selecionar todas"}
                </span>
              </label>
              {selectedIds.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    icon={Archive}
                    onClick={() => bulkArchive(true)}
                  >
                    Arquivar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={() => bulkArchive(false)}
                  >
                    Desarquivar
                  </Button>
                  <input
                    list="real-team-members"
                    className="bulk-assignee-input"
                    aria-label="Reatribuir selecionadas para"
                    value={bulkAssignee}
                    onChange={(e) => setBulkAssignee(e.target.value)}
                    placeholder="Reatribuir para..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!bulkAssignee.trim()}
                    onClick={bulkReassign}
                  >
                    Aplicar
                  </Button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={clearSelection}
                  >
                    Limpar sele√ß√£o
                  </button>
                </>
              )}
            </div>
          )}
          {items.slice(0, visibleCount).map((t) => (
            <article key={t.id} className={selectedIds.includes(t.id) ? "selected" : ""}>
              <input
                type="checkbox"
                aria-label={`Selecionar "${t.title}"`}
                checked={selectedIds.includes(t.id)}
                onChange={() => toggleSelected(t.id)}
              />
              <button
                onClick={() =>
                  changeTaskStatus(
                    t,
                    t.status === "Conclu√≠do" ? "A fazer" : "Conclu√≠do",
                  )
                }
              >
                {t.status === "Conclu√≠do" ? <CheckCircle2 /> : <Circle />}
              </button>
              <span>
                <strong>
                  {t.title}
                  {isBlocked(t) && (
                    <span
                      className="blocked-badge"
                      title={`Aguardando: ${blockingTasks(t)
                        .map((dep) => dep.title)
                        .join(", ")}`}
                    >
                      Bloqueada
                    </span>
                  )}
                </strong>
                <small>
                  {t.area} ¬∑ {t.priority} ¬∑ {t.due || "Sem prazo"} ¬∑{" "}
                  {t.project || "Sem projeto"} ¬∑{" "}
                  {t.assignee || "Sem respons√°vel"}
                  {t.assignee &&
                    ` ¬∑ ${t.assigneeType === "digital" ? "Digital" : "Pessoa"}`}
                  {taskUrgency(t) && (
                    <em className={`urgency ${taskUrgency(t).tone}`}>
                      {taskUrgency(t).text}
                    </em>
                  )}
                  {(t.attachments || []).length > 0 && (
                    <em
                      className="attachment-count"
                      title={`${t.attachments.length} anexo(s)`}
                    >
                      <Paperclip />
                      {t.attachments.length}
                    </em>
                  )}
                  {t.recurrence?.frequency &&
                    t.recurrence.frequency !== "none" && (
                      <em
                        className="attachment-count"
                        title={
                          RECURRENCE_OPTIONS.find(
                            (option) => option.value === t.recurrence.frequency,
                          )?.label || "Tarefa recorrente"
                        }
                      >
                        <Repeat />
                      </em>
                    )}
                </small>
              </span>
              <select
                value={t.status}
                onChange={(e) => changeTaskStatus(t, e.target.value)}
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
          <LoadMoreButton
            shown={Math.min(visibleCount, items.length)}
            total={items.length}
            onClick={() => setVisibleCount((c) => c + LIST_PAGE_SIZE)}
          />
        </div>
      )}
      {modal && (
        <Modal
          title={editing ? "Editar tarefa" : "Criar tarefa"}
          onClose={() => setModal(false)}
        >
          <form className="modal-body" onSubmit={save}>
            <Field label="T√≠tulo">
              <input
                autoFocus
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Descri√ß√£o">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <div className="task-ai-actions">
              <Button
                type="button"
                variant="secondary"
                icon={taskAiBusy ? RefreshCw : WandSparkles}
                disabled={taskAiBusy}
                onClick={structureTaskWithAi}
              >
                {taskAiBusy ? "Estruturando..." : "Estruturar tarefa com IA"}
              </Button>
              <small>
                Organiza o rascunho em etapas, crit√©rios, prioridade e respons√°vel sugerido. Voc√™ revisa tudo antes de salvar.
              </small>
            </div>
            {(taskAiError ||
              form.aiSuggestedSpecialist ||
              (form.aiRisks || []).length > 0 ||
              (form.aiQuestions || []).length > 0) && (
              <div className="task-ai-insights" role="status">
                {taskAiError && <p>{taskAiError}</p>}
                {form.aiSuggestedSpecialist && (
                  <p><strong>Colaborador sugerido:</strong> {form.aiSuggestedSpecialist}</p>
                )}
                {(form.aiRisks || []).length > 0 && (
                  <div>
                    <strong>Riscos para revisar</strong>
                    <ul>{form.aiRisks.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
                {(form.aiQuestions || []).length > 0 && (
                  <div>
                    <strong>Informa√ß√µes que podem melhorar a execu√ß√£o</strong>
                    <ul>{form.aiQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
            <div className="field">
              <span>Anexos</span>
              <input
                ref={taskAttachRef}
                className="visually-hidden"
                type="file"
                multiple
                accept="image/*,.pdf,.docx,.txt,.md,.markdown,.csv"
                aria-label="Anexar arquivo √† tarefa"
                onChange={async (e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  const next = await addAttachmentsFromFiles(
                    files,
                    form.attachments || [],
                    setToast,
                  );
                  setForm((current) => ({ ...current, attachments: next }));
                }}
              />
              <Button
                type="button"
                variant="ghost"
                icon={Paperclip}
                onClick={() => taskAttachRef.current?.click()}
              >
                Anexar arquivo
              </Button>
              <AttachmentList
                attachments={form.attachments}
                onRemove={(id) =>
                  setForm((current) => ({
                    ...current,
                    attachments: (current.attachments || []).filter(
                      (a) => a.id !== id,
                    ),
                  }))
                }
              />
            </div>
            <div className="form-grid">
              <Field label="Prioridade">
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option>Baixa</option>
                  <option>M√©dia</option>
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
              <Field label="In√≠cio planejado">
                <input
                  type="date"
                  value={form.startDate || ""}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Dura√ß√£o estimada (dias √∫teis)">
                <input
                  type="number"
                  min="1"
                  value={form.estimatedDays || "1"}
                  onChange={(e) =>
                    setForm({ ...form, estimatedDays: e.target.value })
                  }
                />
              </Field>
              <Field label="Repetir">
                <select
                  value={form.recurrence?.frequency || "none"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recurrence: {
                        frequency: e.target.value,
                        seriesId: form.recurrence?.seriesId,
                      },
                    })
                  }
                >
                  {RECURRENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {editing &&
                  form.recurrence?.frequency &&
                  form.recurrence.frequency !== "none" &&
                  form.recurrence.seriesId && (
                    <p className="recurrence-note">
                      Parte de uma s√©rie recorrente (
                      {
                        db.tasks.filter(
                          (t) =>
                            t.recurrence?.seriesId ===
                            form.recurrence.seriesId,
                        ).length
                      }{" "}
                      no total).{" "}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          setForm({
                            ...form,
                            recurrence: { frequency: "none" },
                          })
                        }
                      >
                        Cancelar recorr√™ncia
                      </button>
                    </p>
                  )}
              </Field>
              <div className="deadline-calc-wrap">
                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    setDeadlineCalc((c) => ({ ...c, open: !c.open }))
                  }
                >
                  {deadlineCalc.open ? "Fechar calculadora" : "Calcular em dias √∫teis"}
                </button>
                {deadlineCalc.open && (
                  <div className="deadline-calc">
                    <input
                      type="date"
                      aria-label="Data base do prazo"
                      value={deadlineCalc.base}
                      onChange={(e) =>
                        setDeadlineCalc((c) => ({ ...c, base: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      min="1"
                      aria-label="Dias √∫teis"
                      value={deadlineCalc.days}
                      onChange={(e) =>
                        setDeadlineCalc((c) => ({ ...c, days: e.target.value }))
                      }
                    />
                    <Button type="button" variant="secondary" onClick={applyDeadlineCalc}>
                      Usar como prazo
                    </Button>
                    <small>
                      Conta apenas dias √∫teis (sem s√°bado e domingo). Feriados
                      nacionais n√£o s√£o descontados automaticamente.
                    </small>
                  </div>
                )}
              </div>
              <Field label="√Årea">
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                >
                  <option>Opera√ß√£o</option>
                  <option>Estrat√©gia</option>
                  <option>Vendas</option>
                  <option>Marketing</option>
                  <option>Atendimento</option>
                  <option>Financeiro</option>
                  <option>Jur√≠dico</option>
                  <option>RH / Pessoas</option>
                  <option>TI / Tecnologia</option>
                  <option>Log√≠stica</option>
                  <option>Compras</option>
                  <option>Administrativo</option>
                  <option>Outra</option>
                </select>
              </Field>
              <Field label="Respons√°vel">
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
                  <option value="real">Funcion√°rio real</option>
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
                    <option value="">Escolha quem executar√°</option>
                    {digitalCollaborators.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Nome do respons√°vel">
                  <input
                    list="real-team-members"
                    value={form.assignee || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const member = realMembers.find((m) => m.name === value);
                      setForm({
                        ...form,
                        assignee: value,
                        assigneeId: member ? member.id : "",
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
                  placeholder="Ex.: Lan√ßamento de julho"
                />
              </Field>
            </div>
            {db.tasks.filter((t) => t.id !== editing).length > 0 && (
              <div className="field">
                <span>Depende de</span>
                <div className="checkbox-list">
                  {db.tasks
                    .filter((t) => t.id !== editing)
                    .map((t) => (
                      <label key={t.id} className="cost-check">
                        <input
                          type="checkbox"
                          checked={(form.dependsOn || []).includes(t.id)}
                          onChange={() =>
                            setForm({
                              ...form,
                              dependsOn: (form.dependsOn || []).includes(t.id)
                                ? form.dependsOn.filter((id) => id !== t.id)
                                : [...(form.dependsOn || []), t.id],
                            })
                          }
                        />
                        {t.title} ({t.status})
                      </label>
                    ))}
                </div>
                <small>
                  Esta tarefa fica bloqueada para concluir, entregar ou
                  assumir enquanto as tarefas marcadas acima n√£o estiverem
                  conclu√≠das.
                </small>
              </div>
            )}
            <div className="field">
              <label className="cost-check">
                <input
                  type="checkbox"
                  checked={!!form.isMission}
                  onChange={(e) =>
                    setForm({ ...form, isMission: e.target.checked })
                  }
                />
                <span>Tratar como miss√£o (vagas, pontos, recompensa, subtarefas e entregas)</span>
              </label>
            </div>
            <SharingFields
              value={{
                visibility: form.visibility,
                sharedWith: form.sharedWith,
                sharedTeams: form.sharedTeams,
                project: form.project,
              }}
              onChange={(next) => setForm({ ...form, ...next })}
              teams={db.teams}
              projectOptions={projects}
              hideProjectField
              disabled={form.isMission && form.distribution === "disponivel"}
              disabledHint="Miss√µes dispon√≠veis ficam vis√≠veis para todo o espa√ßo automaticamente."
            />
            {form.isMission && (
              <div className="form-grid">
                <Field label="Distribui√ß√£o">
                  <select
                    value={form.distribution}
                    onChange={(e) =>
                      setForm({ ...form, distribution: e.target.value })
                    }
                  >
                    <option value="atribuida">Atribu√≠da diretamente</option>
                    <option value="disponivel">
                      Dispon√≠vel para colaboradores escolherem
                    </option>
                    <option value="pessoal">Pessoal (organiza√ß√£o pr√≥pria)</option>
                  </select>
                </Field>
                <Field label="Dificuldade">
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm({ ...form, difficulty: e.target.value })
                    }
                  >
                    <option>Simples</option>
                    <option>Intermedi√°ria</option>
                    <option>Avan√ßada</option>
                  </select>
                </Field>
                {form.distribution === "disponivel" && (
                  <>
                    <Field label="Vagas">
                      <input
                        type="number"
                        min="1"
                        value={form.slots}
                        onChange={(e) =>
                          setForm({ ...form, slots: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Como assumir">
                      <select
                        value={form.approvalMode}
                        onChange={(e) =>
                          setForm({ ...form, approvalMode: e.target.value })
                        }
                      >
                        <option value="imediata">Aceita√ß√£o imediata</option>
                        <option value="aprovacao">
                          Precisa da minha aprova√ß√£o
                        </option>
                      </select>
                    </Field>
                  </>
                )}
                <Field label="Pontos">
                  <input
                    type="number"
                    min="0"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: e.target.value })}
                  />
                </Field>
                <Field label="Recompensa financeira (opcional)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.reward}
                    onChange={(e) => setForm({ ...form, reward: e.target.value })}
                    placeholder="R$"
                  />
                </Field>
                <Field label="Desist√™ncia">
                  <label className="cost-check">
                    <input
                      type="checkbox"
                      checked={!!form.allowWithdrawal}
                      onChange={(e) =>
                        setForm({ ...form, allowWithdrawal: e.target.checked })
                      }
                    />
                    <span>Permitir desistir antes do in√≠cio</span>
                  </label>
                </Field>
              </div>
            )}
            <div className="field">
              <span>Crit√©rios de conclus√£o</span>
              <small>
                A tarefa s√≥ poder√° ser conclu√≠da depois que todos os crit√©rios cadastrados forem confirmados.
              </small>
              <div className="subtask-editor">
                <input
                  value={form.criterionDraft || ""}
                  onChange={(e) =>
                    setForm({ ...form, criterionDraft: e.target.value })
                  }
                  placeholder="Ex.: Cliente aprovou o PDF final"
                  aria-label="Novo crit√©rio de conclus√£o"
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon={Plus}
                  disabled={!(form.criterionDraft || "").trim()}
                  onClick={() =>
                    setForm({
                      ...form,
                      acceptanceCriteria: [
                        ...(form.acceptanceCriteria || []),
                        { id: uid(), text: form.criterionDraft.trim(), done: false },
                      ],
                      criterionDraft: "",
                    })
                  }
                >
                  Adicionar crit√©rio
                </Button>
              </div>
              {(form.acceptanceCriteria || []).length > 0 && (
                <div className="member-list">
                  {form.acceptanceCriteria.map((criterion) => (
                    <div key={criterion.id}>
                      <label className="cost-check">
                        <input
                          type="checkbox"
                          checked={!!criterion.done}
                          onChange={() =>
                            setForm({
                              ...form,
                              acceptanceCriteria: form.acceptanceCriteria.map((item) =>
                                item.id === criterion.id
                                  ? { ...item, done: !item.done }
                                  : item,
                              ),
                            })
                          }
                        />
                        <span className={criterion.done ? "subtask-done" : undefined}>
                          {criterion.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label={`Remover crit√©rio ${criterion.text}`}
                        onClick={() =>
                          setForm({
                            ...form,
                            acceptanceCriteria: form.acceptanceCriteria.filter(
                              (item) => item.id !== criterion.id,
                            ),
                          })
                        }
                      >
                        <X />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="field">
                <span>{form.isMission ? "Subtarefas (mini-miss√µes)" : "Etapas da tarefa"}</span>
                <div className="subtask-editor">
                  <input
                    value={form.subtaskDraft || ""}
                    onChange={(e) =>
                      setForm({ ...form, subtaskDraft: e.target.value })
                    }
                    placeholder="Ex.: Enviar or√ßamento para aprova√ß√£o"
                    aria-label="Nova subtarefa"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    icon={Plus}
                    disabled={!(form.subtaskDraft || "").trim()}
                    onClick={() =>
                      setForm({
                        ...form,
                        subtasks: [
                          ...(form.subtasks || []),
                          { id: uid(), title: form.subtaskDraft.trim(), done: false },
                        ],
                        subtaskDraft: "",
                      })
                    }
                  >
                    Adicionar
                  </Button>
                </div>
                {(form.subtasks || []).length > 0 && (
                  <div className="member-list">
                    {form.subtasks.map((s) => (
                      <div key={s.id}>
                        <label className="cost-check">
                          <input
                            type="checkbox"
                            checked={!!s.done}
                            onChange={() =>
                              setForm({
                                ...form,
                                subtasks: form.subtasks.map((x) =>
                                  x.id === s.id ? { ...x, done: !x.done } : x,
                                ),
                              })
                            }
                          />
                          <span className={s.done ? "subtask-done" : undefined}>
                            {s.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label={`Remover subtarefa ${s.title}`}
                          onClick={() =>
                            setForm({
                              ...form,
                              subtasks: form.subtasks.filter((x) => x.id !== s.id),
                            })
                          }
                        >
                          <X />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            {editingTask && (form.aiOutputs || []).length > 0 && (
              <div className="field task-ai-outputs">
                <span>Entregas produzidas pela IA</span>
                <small>
                  Confira a entrega e os crit√©rios antes de marcar a tarefa como conclu√≠da.
                </small>
                {form.aiOutputs.map((output, index) => (
                  <details className="task-ai-output" key={output.id}>
                    <summary>
                      Entrega {index + 1} ¬∑ {output.specialist || "Seu Funcion√°rio"}
                    </summary>
                    <Markdown text={output.content} />
                  </details>
                ))}
              </div>
            )}
            {editingTask?.isMission &&
              (editingTask.interested || []).length > 0 && (
                <div className="field">
                  <span>Interessados nesta miss√£o</span>
                  <div className="member-list">
                    {editingTask.interested.map((i) => (
                      <div key={i.userId}>
                        <span className="avatar">{i.name[0]}</span>
                        <span>
                          <strong>{i.name}</strong>
                        </span>
                        <span className="task-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => approveInterested(editingTask, i.userId)}
                          >
                            Aprovar
                          </Button>
                          <button
                            type="button"
                            className="icon-button danger"
                            aria-label={`Recusar interesse de ${i.name}`}
                            onClick={() => rejectInterested(editingTask, i.userId)}
                          >
                            <X />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            {editingTask &&
              (editingTask.assigneeId === db.user.id ||
                (editingTask.assignees || []).some(
                  (a) => a.userId === db.user.id,
                )) && (
                <div className="field">
                  <span>Enviar entrega</span>
                  <textarea
                    aria-label="Coment√°rio da entrega"
                    value={form.deliveryDraft || ""}
                    onChange={(e) =>
                      setForm({ ...form, deliveryDraft: e.target.value })
                    }
                    placeholder="Descreva o que foi feito, links ou observa√ß√µes"
                  />
                  <div className="feedback-toggles">
                    <label className="cost-check">
                      <input
                        type="checkbox"
                        checked={deliveryFeedback.wasClear}
                        onChange={(e) =>
                          setDeliveryFeedback((f) => ({
                            ...f,
                            wasClear: e.target.checked,
                          }))
                        }
                      />
                      <span>A tarefa estava clara</span>
                    </label>
                    <label className="cost-check">
                      <input
                        type="checkbox"
                        checked={deliveryFeedback.neededHelp}
                        onChange={(e) =>
                          setDeliveryFeedback((f) => ({
                            ...f,
                            neededHelp: e.target.checked,
                          }))
                        }
                      />
                      <span>Precisei de ajuda</span>
                    </label>
                  </div>
                  <input
                    ref={deliveryAttachRef}
                    className="visually-hidden"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.docx,.txt,.md,.markdown,.csv"
                    aria-label="Anexar arquivo √† entrega"
                    onChange={async (e) => {
                      const files = e.target.files;
                      e.target.value = "";
                      const next = await addAttachmentsFromFiles(
                        files,
                        deliveryAttachments,
                        setToast,
                      );
                      setDeliveryAttachments(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    icon={Paperclip}
                    onClick={() => deliveryAttachRef.current?.click()}
                  >
                    Anexar arquivo √† entrega
                  </Button>
                  <AttachmentList
                    attachments={deliveryAttachments}
                    onRemove={(id) =>
                      setDeliveryAttachments((current) =>
                        current.filter((a) => a.id !== id),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!(form.deliveryDraft || "").trim()}
                    onClick={() => {
                      submitDelivery(
                        editingTask,
                        form.deliveryDraft || "",
                        deliveryFeedback,
                        deliveryAttachments,
                      );
                      setForm({ ...form, deliveryDraft: "" });
                      setDeliveryFeedback({ wasClear: false, neededHelp: false });
                      setDeliveryAttachments([]);
                    }}
                  >
                    Enviar entrega
                  </Button>
                </div>
              )}
            {editingTask &&
              editingTask.ownerId === db.user.id &&
              editingTask.missionStatus === "enviada_para_revisao" && (
                <Field label="Revisar entrega">
                  <p>
                    {editingTask.deliveries?.[editingTask.deliveries.length - 1]
                      ?.comment}
                  </p>
                  <AttachmentList
                    attachments={
                      editingTask.deliveries?.[editingTask.deliveries.length - 1]
                        ?.attachments
                    }
                  />
                  <div className="feedback-toggles">
                    <label className="cost-check">
                      <input
                        type="checkbox"
                        checked={reviewFeedback.followedInstructions}
                        onChange={(e) =>
                          setReviewFeedback((f) => ({
                            ...f,
                            followedInstructions: e.target.checked,
                          }))
                        }
                      />
                      <span>Seguiu as instru√ß√µes</span>
                    </label>
                    <label className="cost-check">
                      <input
                        type="checkbox"
                        checked={reviewFeedback.autonomous}
                        onChange={(e) =>
                          setReviewFeedback((f) => ({
                            ...f,
                            autonomous: e.target.checked,
                          }))
                        }
                      />
                      <span>Demonstrou autonomia</span>
                    </label>
                  </div>
                  <div className="modal-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        reviewDelivery(
                          editingTask,
                          false,
                          "Ajuste solicitado pelo gestor",
                          reviewFeedback,
                        )
                      }
                    >
                      Solicitar corre√ß√£o
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        reviewDelivery(editingTask, true, "", reviewFeedback)
                      }
                    >
                      Aprovar entrega
                    </Button>
                  </div>
                </Field>
              )}
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editing ? "Salvar altera√ß√µes" : "Criar tarefa"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}





const TASK_STATUS_TONE = {
  "A fazer": "muted",
  "Em andamento": "info",
  Aguardando: "warn",
  Conclu√≠do: "ok",
};

function MyWork({ db, business, setToast: _setToast, go }) {
  const userId = db.user?.id;
  const work = computeMyWork(db, userId, business);
  const gamificationEnabled = db.preferences?.gamificationEnabled !== false;
  const points = computeUserPoints(db.tasks, userId);
  const level = levelForPoints(points, db.levels || DEFAULT_LEVELS);
  const progress = levelProgress(points, db.levels || DEFAULT_LEVELS);
  const achievements = computeAchievements(db.tasks, userId);
  const myPlan = (db.developmentPlans || []).find(
    (p) => p.assigneeId === userId,
  );
  const firstName = (db.user?.name || "").trim().split(" ")[0] || "";
  const needsAttention = work.corrections + work.overdue + work.inReview;
  const stats = [
    [work.inProgress, "Em andamento", ListTodo],
    [work.inReview, "Aguardando revis√£o", Clock3],
    [work.corrections, "Corre√ß√µes pedidas", CircleAlert],
    [work.overdue, "Atrasadas", CalendarDays],
  ];
  return (
    <PageTitle
      eyebrow="MEU TRABALHO"
      title={firstName ? `Ol√°, ${firstName}` : "Meu trabalho"}
      text="Tudo que est√° com voc√™ agora ‚Äî tarefas, entregas e seu progresso ‚Äî reunido em um s√≥ lugar."
    >
      <div className="mywork-stats">
        {stats.map(([n, label, Icon]) => (
          <div key={label} className="mywork-stat">
            <Icon />
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {needsAttention > 0 && (
        <button className="mywork-attention" onClick={() => go("operacao")}>
          <CircleAlert />
          <span>
            Voc√™ tem {needsAttention} item(ns) pedindo aten√ß√£o ‚Äî abra suas
            tarefas para resolver.
          </span>
          <ArrowUpRight />
        </button>
      )}
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">MINHAS TAREFAS</span>
            <h2>Pr√≥ximas a fazer</h2>
          </div>
          <button className="text-button" onClick={() => go("operacao")}>
            Ver todas
          </button>
        </div>
        {work.active.length === 0 ? (
          <Empty
            icon={BriefcaseBusiness}
            title="Nada na sua fila"
            text="Quando algu√©m atribuir uma tarefa a voc√™ (ou voc√™ assumir uma miss√£o), ela aparece aqui."
            action="Ver miss√µes dispon√≠veis"
            onAction={() => go("operacao")}
          />
        ) : (
          <div className="mywork-tasks">
            {work.active.slice(0, 8).map((t) => (
              <button
                key={t.id}
                className="mywork-task"
                onClick={() => go("operacao")}
              >
                <span
                  className={`mywork-dot ${TASK_STATUS_TONE[t.status] || "muted"}`}
                />
                <span className="mywork-task-body">
                  <strong>{t.title}</strong>
                  <small>
                    {t.status}
                    {t.priority ? ` ¬∑ ${t.priority}` : ""}
                    {t.due ? ` ¬∑ prazo ${t.due}` : ""}
                  </small>
                </span>
                {t.due && t.due < today() && t.status !== "Conclu√≠do" && (
                  <span className="mywork-late">Atrasada</span>
                )}
                <ArrowUpRight />
              </button>
            ))}
          </div>
        )}
      </section>
      {gamificationEnabled && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">MEU PROGRESSO</span>
              <h2>{level.name}</h2>
            </div>
          </div>
          <div className="mywork-progress">
            <div className="mywork-level">
              <div className="mywork-level-top">
                <strong>{points} pontos</strong>
                {progress.next && (
                  <small>
                    faltam {progress.pointsToNext} para {progress.next.name}
                  </small>
                )}
              </div>
              <div className="mywork-bar">
                <span style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
            {achievements.length > 0 && (
              <div className="mywork-achievements">
                {achievements.map((a) => (
                  <span key={a.id} className="mywork-badge">
                    <Award />
                    {a.label}
                  </span>
                ))}
              </div>
            )}
            <div className="mywork-links">
              <button
                className="settings-stat as-button"
                onClick={() => go("desenvolvimento")}
              >
                <TrendingUp />
                <span>
                  {myPlan ? (
                    <>
                      Meu plano de desenvolvimento:{" "}
                      <strong>{myPlan.status}</strong>
                    </>
                  ) : (
                    "Ver plano de desenvolvimento"
                  )}
                </span>
              </button>
              <button
                className="settings-stat as-button"
                onClick={() => go("certificacoes")}
              >
                <Award />
                <span>Minhas certifica√ß√µes</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </PageTitle>
  );
}



const orderStatuses = [
  "Novo",
  "Preparando",
  "Pronto",
  "Enviado",
  "Entregue",
  "Cancelado",
];
const orderChannels = ["Balc√£o", "Retirada", "Delivery", "Online", "Mesa"];

function Catalog({ db, update, business, setToast, go: _go }) {
  const wa = useWhatsappSender({ db, setToast });
  const [view, setView] = useState("produtos"),
    [search, setSearch] = useState(""),
    [productModal, setProductModal] = useState(false),
    [editingProduct, setEditingProduct] = useState(null),
    [orderModal, setOrderModal] = useState(false),
    [editingOrder, setEditingOrder] = useState(null),
    [zoneModal, setZoneModal] = useState(false),
    [editingZone, setEditingZone] = useState(null);
  const blankProduct = {
    name: "",
    category: "",
    price: "",
    cost: "",
    stock: "",
    lowStockAlert: "5",
    unit: "un",
    variants: [],
    visibility: "espaco_todo",
    sharedWith: [],
    sharedTeams: [],
  };
  const [productForm, setProductForm] = useState(blankProduct);
  const blankOrder = {
    clientName: "",
    clientContact: "",
    channel: "Balc√£o",
    status: "Novo",
    notes: "",
    items: [],
    deliveryZoneId: "",
    postToFinance: true,
    visibility: "espaco_todo",
    sharedWith: [],
    sharedTeams: [],
  };
  const [orderForm, setOrderForm] = useState(blankOrder);
  const [pickProduct, setPickProduct] = useState("");
  const [pickVariant, setPickVariant] = useState("");
  const [pickQty, setPickQty] = useState("1");
  const blankZone = { name: "", fee: "", etaMinutes: "" };
  const [zoneForm, setZoneForm] = useState(blankZone);

  const products = (db.products || []).filter(
    (p) => !business || p.businessId === business.id,
  );
  const orders = (db.orders || []).filter(
    (o) => !business || o.businessId === business.id,
  );
  const zones = (db.deliveryZones || []).filter(
    (z) => !business || z.businessId === business.id,
  );
  const filteredProducts = products.filter(
    (p) =>
      !search ||
      `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredOrders = orders
    .filter(
      (o) =>
        !search ||
        `${o.clientName} ${o.items.map((i) => i.name).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => {
    const id = setTimeout(() => setVisibleCount(LIST_PAGE_SIZE), 0);
    return () => clearTimeout(id);
  }, [search, view]);

  const openProduct = (item = null) => {
    setEditingProduct(item?.id || null);
    setProductForm(item ? { ...blankProduct, ...item } : blankProduct);
    setProductModal(true);
  };
  const addVariantRow = () =>
    setProductForm((current) => ({
      ...current,
      variants: [
        ...(current.variants || []),
        { id: uid(), name: "", price: "", stock: "" },
      ],
    }));
  const updateVariantRow = (id, field, value) =>
    setProductForm((current) => ({
      ...current,
      variants: (current.variants || []).map((v) =>
        v.id === id ? { ...v, [field]: value } : v,
      ),
    }));
  const removeVariantRow = (id) =>
    setProductForm((current) => ({
      ...current,
      variants: (current.variants || []).filter((v) => v.id !== id),
    }));
  const saveProduct = (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;
    const now = new Date().toISOString();
    const variants = (productForm.variants || [])
      .filter((v) => v.name.trim())
      .map((v) => ({
        id: v.id || uid(),
        name: v.name.trim(),
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0,
      }));
    const item = {
      ...productForm,
      name: productForm.name.trim(),
      price: Number(productForm.price) || 0,
      cost: Number(productForm.cost) || 0,
      stock: Number(productForm.stock) || 0,
      lowStockAlert: Number(productForm.lowStockAlert) || 0,
      variants,
      id: editingProduct || uid(),
      businessId: business?.id || null,
      ownerId: productForm.ownerId || db.user.id,
      visibility: productForm.visibility || "espaco_todo",
      sharedWith: Array.isArray(productForm.sharedWith)
        ? productForm.sharedWith
        : [],
      sharedTeams: Array.isArray(productForm.sharedTeams)
        ? productForm.sharedTeams
        : [],
      createdAt: productForm.createdAt || now,
      updatedAt: now,
    };
    update((d) => ({
      ...d,
      products: editingProduct
        ? (d.products || []).map((p) => (p.id === editingProduct ? item : p))
        : [item, ...(d.products || [])],
    }));
    setProductModal(false);
    setToast(editingProduct ? "Produto atualizado" : "Produto cadastrado");
  };
  const removeProduct = (id) => {
    if (!confirm("Excluir este produto do cat√°logo?")) return;
    update((d) => ({
      ...d,
      products: (d.products || []).filter((p) => p.id !== id),
    }));
  };
  const productPriceLabel = (p) =>
    (p.variants || []).length > 0
      ? `A partir de ${money(Math.min(...p.variants.map((v) => v.price)))}`
      : money(p.price);
  const productStockTotal = (p) =>
    (p.variants || []).length > 0
      ? p.variants.reduce((sum, v) => sum + v.stock, 0)
      : p.stock;

  const openOrder = (item = null) => {
    setEditingOrder(item?.id || null);
    setOrderForm(item ? { ...blankOrder, ...item } : blankOrder);
    setPickProduct("");
    setPickVariant("");
    setPickQty("1");
    setOrderModal(true);
  };
  const addItemToOrder = () => {
    const product = products.find((p) => p.id === pickProduct);
    const qty = Number(pickQty) || 0;
    if (!product || qty <= 0) return;
    const hasVariants = (product.variants || []).length > 0;
    const variant = hasVariants
      ? product.variants.find((v) => v.id === pickVariant)
      : null;
    if (hasVariants && !variant) return;
    const price = variant ? variant.price : product.price;
    const name = variant ? `${product.name} - ${variant.name}` : product.name;
    setOrderForm((current) => {
      const existing = current.items.find(
        (i) =>
          i.productId === product.id &&
          (i.variantId || null) === (variant?.id || null),
      );
      const items = existing
        ? current.items.map((i) =>
            i.productId === product.id &&
            (i.variantId || null) === (variant?.id || null)
              ? { ...i, quantity: i.quantity + qty }
              : i,
          )
        : [
            ...current.items,
            {
              productId: product.id,
              variantId: variant?.id || null,
              name,
              price,
              quantity: qty,
            },
          ];
      return { ...current, items };
    });
    setPickProduct("");
    setPickVariant("");
    setPickQty("1");
  };
  const removeItemFromOrder = (productId, variantId) =>
    setOrderForm((current) => ({
      ...current,
      items: current.items.filter(
        (i) =>
          !(
            i.productId === productId &&
            (i.variantId || null) === (variantId || null)
          ),
      ),
    }));
  const orderTotal = (items) =>
    (items || []).reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFeeFor = (zoneId) =>
    zones.find((z) => z.id === zoneId)?.fee || 0;
  const saveOrder = (e) => {
    e.preventDefault();
    if (!orderForm.clientName.trim() || !orderForm.items.length) return;
    const now = new Date().toISOString();
    const deliveryFee =
      orderForm.channel === "Delivery"
        ? deliveryFeeFor(orderForm.deliveryZoneId)
        : 0;
    const item = {
      ...orderForm,
      deliveryZoneId: orderForm.channel === "Delivery" ? orderForm.deliveryZoneId : "",
      deliveryFee,
      clientName: orderForm.clientName.trim(),
      total: orderTotal(orderForm.items) + deliveryFee,
      id: editingOrder || uid(),
      businessId: business?.id || null,
      ownerId: orderForm.ownerId || db.user.id,
      visibility: orderForm.visibility || "espaco_todo",
      sharedWith: Array.isArray(orderForm.sharedWith)
        ? orderForm.sharedWith
        : [],
      sharedTeams: Array.isArray(orderForm.sharedTeams)
        ? orderForm.sharedTeams
        : [],
      createdAt: orderForm.createdAt || now,
      updatedAt: now,
    };
    // Jornada transversal: o pedido tamb√©m vira receita no caixa (se marcado)
    // e um registro na linha do tempo do cliente.
    const receita =
      !editingOrder && orderForm.postToFinance
        ? buildOrderReceita(item, {
            businessId: item.businessId,
            ownerId: db.user.id,
          })
        : null;
    update((d) => ({
      ...d,
      orders: editingOrder
        ? (d.orders || []).map((o) => (o.id === editingOrder ? item : o))
        : [item, ...(d.orders || [])],
      products: editingOrder
        ? d.products
        : (d.products || []).map((p) => {
            const lines = orderForm.items.filter((i) => i.productId === p.id);
            if (!lines.length) return p;
            if ((p.variants || []).length > 0) {
              return {
                ...p,
                variants: p.variants.map((v) => {
                  const line = lines.find((i) => i.variantId === v.id);
                  return line
                    ? { ...v, stock: Math.max(0, v.stock - line.quantity) }
                    : v;
                }),
              };
            }
            const line = lines[0];
            return { ...p, stock: Math.max(0, p.stock - line.quantity) };
          }),
      contacts:
        item.channel === "Mesa"
          ? d.contacts || []
          : upsertContact(d.contacts || [], {
              name: item.clientName,
              contact: item.clientContact,
              businessId: item.businessId,
              ownerId: db.user.id,
            }),
      transactions: editingOrder
        ? // ao editar, mant√©m a receita vinculada em sincronia com o novo total
          (d.transactions || []).map((t) =>
            t.sourceOrderId === item.id
              ? {
                  ...t,
                  value: item.total,
                  description: `Pedido ‚Äî ${item.clientName}`,
                }
              : t,
          )
        : receita
          ? [receita, ...(d.transactions || [])]
          : d.transactions || [],
    }));
    if (!editingOrder && item.channel !== "Mesa" && item.clientName) {
      const links = contactLinks(item.clientContact);
      logInteraction({
        channel: "note",
        direction: "out",
        contactName: item.clientName,
        contactHandle: links.phone || links.email || item.clientContact || "",
        subject: "Pedido registrado",
        body: `Pedido de ${money(item.total)} ¬∑ ${item.items.length} item(ns).`,
      });
    }
    setOrderModal(false);
    setToast(
      editingOrder
        ? "Pedido atualizado"
        : receita
          ? "Pedido criado ‚Äî estoque e caixa atualizados"
          : "Pedido criado e estoque atualizado",
    );
  };
  const removeOrder = (id) => {
    if (!confirm("Excluir este pedido?")) return;
    update((d) => ({ ...d, orders: (d.orders || []).filter((o) => o.id !== id) }));
  };
  const changeOrderStatus = (item, status) =>
    update((d) => ({
      ...d,
      orders: (d.orders || []).map((o) =>
        o.id === item.id ? { ...o, status, updatedAt: new Date().toISOString() } : o,
      ),
    }));
  const confirmOrderWhatsapp = (item) => {
    const { phone } = contactLinks(item.clientContact);
    const list = item.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    wa.open({
      phone,
      category: "Pedido",
      vars: {
        nome: item.clientName || "",
        negocio: business?.name || "",
        itens: list,
        status: item.status || "",
        valor: money(item.total),
      },
    });
  };

  const openZone = (item = null) => {
    setEditingZone(item?.id || null);
    setZoneForm(item ? { ...blankZone, ...item } : blankZone);
    setZoneModal(true);
  };
  const saveZone = (e) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) return;
    const now = new Date().toISOString();
    const item = {
      ...zoneForm,
      name: zoneForm.name.trim(),
      fee: Number(zoneForm.fee) || 0,
      etaMinutes: Number(zoneForm.etaMinutes) || 0,
      id: editingZone || uid(),
      businessId: business?.id || null,
      createdAt: zoneForm.createdAt || now,
      updatedAt: now,
    };
    update((d) => ({
      ...d,
      deliveryZones: editingZone
        ? (d.deliveryZones || []).map((z) => (z.id === editingZone ? item : z))
        : [item, ...(d.deliveryZones || [])],
    }));
    setEditingZone(item.id);
    setZoneForm(item);
    setToast(editingZone ? "Zona de entrega atualizada" : "Zona de entrega cadastrada");
  };
  const removeZone = (id) => {
    if (!confirm("Excluir esta zona de entrega?")) return;
    update((d) => ({
      ...d,
      deliveryZones: (d.deliveryZones || []).filter((z) => z.id !== id),
    }));
    if (editingZone === id) {
      setEditingZone(null);
      setZoneForm(blankZone);
    }
  };

  return (
    <PageTitle
      eyebrow="PRODUTOS E PEDIDOS"
      title="Cat√°logo, estoque e pedidos em um s√≥ lugar"
      text="Cadastre produtos, acompanhe o estoque e registre pedidos com atualiza√ß√£o autom√°tica."
      action={
        <Button
          icon={Plus}
          onClick={() => (view === "produtos" ? openProduct() : openOrder())}
        >
          {view === "produtos" ? "Novo produto" : "Novo pedido"}
        </Button>
      }
    >
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            type="search"
            placeholder={view === "produtos" ? "Buscar produto" : "Buscar pedido"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar"
          />
        </div>
        <div className="view-toggle">
          <button
            className={view === "produtos" ? "active" : ""}
            onClick={() => setView("produtos")}
          >
            Cat√°logo
          </button>
          <button
            className={view === "pedidos" ? "active" : ""}
            onClick={() => setView("pedidos")}
          >
            Pedidos
          </button>
        </div>
        {view === "pedidos" && (
          <Button
            variant="secondary"
            icon={MapPin}
            onClick={() => setZoneModal(true)}
          >
            Zonas de entrega
          </Button>
        )}
      </div>

      {view === "produtos" ? (
        filteredProducts.length === 0 ? (
          <Empty
            icon={ShoppingBag}
            title="Nenhum produto cadastrado"
            text="Cadastre produtos com pre√ßo e estoque para come√ßar a montar pedidos."
            action="Novo produto"
            onAction={() => openProduct()}
          />
        ) : (
          <div className="data-list">
            {filteredProducts.slice(0, visibleCount).map((p) => (
              <article key={p.id}>
                <span
                  className={`status-dot ${productStockTotal(p) <= 0 ? "cancelado" : productStockTotal(p) <= (p.lowStockAlert || 0) ? "faltou" : "conclu√≠do"}`}
                />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.category || "Sem categoria"} ¬∑ {productPriceLabel(p)} ¬∑{" "}
                    {productStockTotal(p)} {p.unit || "un"} em estoque
                    {(p.variants || []).length > 0 &&
                      ` ¬∑ ${p.variants.length} varia√ß√µes`}
                    {productStockTotal(p) <= (p.lowStockAlert || 0) &&
                      " ¬∑ Estoque baixo"}
                  </small>
                </span>
                <span className="task-actions">
                  <button
                    className="icon-button"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => openProduct(p)}
                  >
                    <Edit3 />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Excluir ${p.name}`}
                    onClick={() => removeProduct(p.id)}
                  >
                    <Trash2 />
                  </button>
                </span>
              </article>
            ))}
            <LoadMoreButton
              shown={Math.min(visibleCount, filteredProducts.length)}
              total={filteredProducts.length}
              onClick={() => setVisibleCount((c) => c + LIST_PAGE_SIZE)}
            />
          </div>
        )
      ) : filteredOrders.length === 0 ? (
        <Empty
          icon={ReceiptText}
          title="Nenhum pedido registrado"
          text="Monte um pedido escolhendo produtos do cat√°logo."
          action="Novo pedido"
          onAction={() => openOrder()}
        />
      ) : (
        <div className="data-list">
          {filteredOrders.slice(0, visibleCount).map((o) => (
            <article key={o.id}>
              <span>
                <strong>
                  {o.clientName} ¬∑ {money(o.total)}
                </strong>
                <small>
                  {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")} ¬∑{" "}
                  {o.channel}
                </small>
              </span>
              <select
                value={o.status}
                onChange={(e) => changeOrderStatus(o, e.target.value)}
              >
                {orderStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <span className="task-actions">
                {o.channel === "Mesa" &&
                  !["Entregue", "Cancelado"].includes(o.status) && (
                    <button
                      className="icon-button"
                      aria-label="Fechar comanda"
                      title="Fechar comanda"
                      onClick={() => changeOrderStatus(o, "Entregue")}
                    >
                      <CheckCircle2 />
                    </button>
                  )}
                {contactLinks(o.clientContact).phone && (
                  <button
                    className="icon-button"
                    aria-label={`Avisar ${o.clientName} por WhatsApp`}
                    title="Avisar por WhatsApp"
                    onClick={() => confirmOrderWhatsapp(o)}
                  >
                    <MessageSquareText />
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={`Editar pedido de ${o.clientName}`}
                  onClick={() => openOrder(o)}
                >
                  <Edit3 />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir pedido de ${o.clientName}`}
                  onClick={() => removeOrder(o.id)}
                >
                  <Trash2 />
                </button>
              </span>
            </article>
          ))}
          <LoadMoreButton
            shown={Math.min(visibleCount, filteredOrders.length)}
            total={filteredOrders.length}
            onClick={() => setVisibleCount((c) => c + LIST_PAGE_SIZE)}
          />
        </div>
      )}

      {productModal && (
        <Modal
          title={editingProduct ? "Editar produto" : "Novo produto"}
          onClose={() => setProductModal(false)}
        >
          <form className="modal-body" onSubmit={saveProduct}>
            <Field label="Nome do produto">
              <input
                required
                autoFocus
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Categoria">
                <input
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm({ ...productForm, category: e.target.value })
                  }
                />
              </Field>
              <Field label="Pre√ßo de venda">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
              </Field>
              <Field label="Custo (opcional)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.cost}
                  onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                />
              </Field>
              <Field label="Estoque atual">
                <input
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                />
              </Field>
              <Field label="Alertar quando estoque for menor que">
                <input
                  type="number"
                  min="0"
                  value={productForm.lowStockAlert}
                  onChange={(e) =>
                    setProductForm({ ...productForm, lowStockAlert: e.target.value })
                  }
                />
              </Field>
              <Field label="Unidade">
                <input
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  placeholder="un, kg, caixa..."
                />
              </Field>
            </div>
            <div className="field">
              <span>Varia√ß√µes (opcional ‚Äî tamanho, cor...)</span>
              <div className="variant-rows">
                {(productForm.variants || []).map((v) => (
                  <div key={v.id} className="variant-row">
                    <input
                      value={v.name}
                      onChange={(e) =>
                        updateVariantRow(v.id, "name", e.target.value)
                      }
                      placeholder="Nome da varia√ß√£o (ex.: G, Azul)"
                      aria-label="Nome da varia√ß√£o"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={v.price}
                      onChange={(e) =>
                        updateVariantRow(v.id, "price", e.target.value)
                      }
                      placeholder="Pre√ßo"
                      aria-label={`Pre√ßo da varia√ß√£o ${v.name || ""}`}
                    />
                    <input
                      type="number"
                      min="0"
                      value={v.stock}
                      onChange={(e) =>
                        updateVariantRow(v.id, "stock", e.target.value)
                      }
                      placeholder="Estoque"
                      aria-label={`Estoque da varia√ß√£o ${v.name || ""}`}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Remover varia√ß√£o"
                      onClick={() => removeVariantRow(v.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={addVariantRow}>
                  Adicionar varia√ß√£o
                </Button>
              </div>
            </div>
            <SharingFields
              value={{
                visibility: productForm.visibility,
                sharedWith: productForm.sharedWith,
                sharedTeams: productForm.sharedTeams,
              }}
              onChange={(next) => setProductForm({ ...productForm, ...next })}
              teams={db.teams}
            />
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setProductModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editingProduct ? "Salvar altera√ß√µes" : "Salvar produto"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {orderModal && (
        <Modal
          title={editingOrder ? "Editar pedido" : "Novo pedido"}
          wide
          onClose={() => setOrderModal(false)}
        >
          <form className="modal-body" onSubmit={saveOrder}>
            <div className="form-grid">
              <Field label={orderForm.channel === "Mesa" ? "Mesa / Comanda" : "Cliente"}>
                <input
                  required
                  autoFocus
                  value={orderForm.clientName}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, clientName: e.target.value })
                  }
                  placeholder={orderForm.channel === "Mesa" ? "Mesa 5" : undefined}
                />
              </Field>
              {orderForm.channel !== "Mesa" && (
                <Field label="WhatsApp ou e-mail">
                  <input
                    value={orderForm.clientContact}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, clientContact: e.target.value })
                    }
                    placeholder="(11) 98888-7777"
                  />
                </Field>
              )}
              <Field label="Canal">
                <select
                  value={orderForm.channel}
                  onChange={(e) => setOrderForm({ ...orderForm, channel: e.target.value })}
                >
                  {orderChannels.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              {orderForm.channel === "Delivery" && (
                <Field label="Zona de entrega">
                  <select
                    value={orderForm.deliveryZoneId}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, deliveryZoneId: e.target.value })
                    }
                  >
                    <option value="">A combinar (sem taxa)</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ¬∑ {money(z.fee)}
                        {z.etaMinutes ? ` ¬∑ ${z.etaMinutes} min` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Status">
                <select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                >
                  {orderStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Adicionar produto">
              <div className="order-item-picker">
                <select
                  value={pickProduct}
                  onChange={(e) => {
                    setPickProduct(e.target.value);
                    setPickVariant("");
                  }}
                  aria-label="Escolher produto"
                >
                  <option value="">Escolha um produto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ¬∑ {productPriceLabel(p)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={pickQty}
                  onChange={(e) => setPickQty(e.target.value)}
                  aria-label="Quantidade"
                />
                <Button type="button" variant="secondary" onClick={addItemToOrder}>
                  Adicionar
                </Button>
              </div>
              {(() => {
                const selected = products.find((p) => p.id === pickProduct);
                if (!selected || !(selected.variants || []).length) return null;
                return (
                  <select
                    className="variant-picker"
                    value={pickVariant}
                    onChange={(e) => setPickVariant(e.target.value)}
                    aria-label="Escolha a varia√ß√£o"
                  >
                    <option value="">Escolha a varia√ß√£o</option>
                    {selected.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ¬∑ {money(v.price)}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </Field>
            {orderForm.items.length > 0 && (
              <div className="order-items">
                {orderForm.items.map((i) => (
                  <div
                    key={`${i.productId}-${i.variantId || "base"}`}
                    className="order-item-row"
                  >
                    <span>
                      {i.quantity}x {i.name}
                    </span>
                    <span>{money(i.price * i.quantity)}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remover ${i.name} do pedido`}
                      onClick={() => removeItemFromOrder(i.productId, i.variantId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {orderForm.channel === "Delivery" &&
                  deliveryFeeFor(orderForm.deliveryZoneId) > 0 && (
                    <div className="order-item-row">
                      <span>Taxa de entrega</span>
                      <span>{money(deliveryFeeFor(orderForm.deliveryZoneId))}</span>
                    </div>
                  )}
                <div className="order-item-row order-total">
                  <span>Total</span>
                  <span>
                    {money(
                      orderTotal(orderForm.items) +
                        (orderForm.channel === "Delivery"
                          ? deliveryFeeFor(orderForm.deliveryZoneId)
                          : 0),
                    )}
                  </span>
                </div>
              </div>
            )}
            {!editingOrder && (
              <label className="cost-check">
                <input
                  type="checkbox"
                  checked={orderForm.postToFinance !== false}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, postToFinance: e.target.checked })
                  }
                />
                <span>Lan√ßar este pedido como receita no Financeiro</span>
              </label>
            )}
            <Field label="Observa√ß√µes">
              <textarea
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              />
            </Field>
            <SharingFields
              value={{
                visibility: orderForm.visibility,
                sharedWith: orderForm.sharedWith,
                sharedTeams: orderForm.sharedTeams,
              }}
              onChange={(next) => setOrderForm({ ...orderForm, ...next })}
              teams={db.teams}
            />
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setOrderModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save} disabled={!orderForm.items.length}>
                {editingOrder ? "Salvar altera√ß√µes" : "Salvar pedido"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {zoneModal && (
        <Modal
          title="Zonas de entrega"
          wide
          onClose={() => {
            setZoneModal(false);
            setEditingZone(null);
            setZoneForm(blankZone);
          }}
        >
          <form className="modal-body" onSubmit={saveZone}>
            <div className="form-grid">
              <Field label="Nome da zona">
                <input
                  required
                  autoFocus
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  placeholder="Centro, Zona Sul, at√© 5 km..."
                />
              </Field>
              <Field label="Taxa de entrega">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={zoneForm.fee}
                  onChange={(e) => setZoneForm({ ...zoneForm, fee: e.target.value })}
                />
              </Field>
              <Field label="Tempo estimado (minutos)">
                <input
                  type="number"
                  min="0"
                  value={zoneForm.etaMinutes}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, etaMinutes: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="modal-actions">
              {editingZone && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingZone(null);
                    setZoneForm(blankZone);
                  }}
                >
                  Cancelar edi√ß√£o
                </Button>
              )}
              <Button type="submit" icon={Save}>
                {editingZone ? "Salvar altera√ß√µes" : "Adicionar zona"}
              </Button>
            </div>
          </form>
          {zones.length === 0 ? (
            <Empty
              icon={MapPin}
              title="Nenhuma zona de entrega cadastrada"
              text="Cadastre zonas com taxa fixa para calcular o total do pedido automaticamente."
            />
          ) : (
            <div className="data-list">
              {zones.map((z) => (
                <article key={z.id}>
                  <span>
                    <strong>{z.name}</strong>
                    <small>
                      {money(z.fee)}
                      {z.etaMinutes ? ` ¬∑ ${z.etaMinutes} min` : ""}
                    </small>
                  </span>
                  <span className="task-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${z.name}`}
                      onClick={() => openZone(z)}
                    >
                      <Edit3 />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Excluir ${z.name}`}
                      onClick={() => removeZone(z.id)}
                    >
                      <Trash2 />
                    </button>
                  </span>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}
      {wa.modal}
    </PageTitle>
  );
}

const vehicleStatuses = ["Ativo", "Manuten√ß√£o", "Inativo"];
const tripStatuses = ["Agendado", "Em rota", "Entregue", "Cancelado"];

function Fleet({ db, update, business, setToast, go: _go }) {
  const [view, setView] = useState("frota"),
    [search, setSearch] = useState(""),
    [vehicleModal, setVehicleModal] = useState(false),
    [editingVehicle, setEditingVehicle] = useState(null),
    [tripModal, setTripModal] = useState(false),
    [editingTrip, setEditingTrip] = useState(null);
  const blankVehicle = {
    plate: "",
    model: "",
    type: "Caminh√£o",
    capacityKg: "",
    status: "Ativo",
    driverName: "",
    driverContact: "",
    nextMaintenanceDate: "",
    notes: "",
    visibility: "espaco_todo",
    sharedWith: [],
    sharedTeams: [],
  };
  const [vehicleForm, setVehicleForm] = useState(blankVehicle);
  const blankTrip = {
    vehicleId: "",
    driverName: "",
    origin: "",
    destination: "",
    cargoDescription: "",
    weightKg: "",
    freightValue: "",
    cteNumber: "",
    cteValue: "",
    status: "Agendado",
    scheduledDate: today(),
    notes: "",
    visibility: "espaco_todo",
    sharedWith: [],
    sharedTeams: [],
  };
  const [tripForm, setTripForm] = useState(blankTrip);

  const vehicles = (db.vehicles || []).filter(
    (v) => !business || v.businessId === business.id,
  );
  const trips = (db.trips || []).filter(
    (t) => !business || t.businessId === business.id,
  );
  const filteredVehicles = vehicles.filter(
    (v) =>
      !search ||
      `${v.plate} ${v.model} ${v.driverName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const filteredTrips = trips
    .filter(
      (t) =>
        !search ||
        `${t.origin} ${t.destination} ${t.driverName}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""));
  const maintenanceDue = (v) =>
    v.nextMaintenanceDate &&
    v.nextMaintenanceDate <= addDaysYmdDashed(today(), 7);

  const openVehicle = (item = null) => {
    setEditingVehicle(item?.id || null);
    setVehicleForm(item ? { ...blankVehicle, ...item } : blankVehicle);
    setVehicleModal(true);
  };
  const saveVehicle = (e) => {
    e.preventDefault();
    if (!vehicleForm.plate.trim()) return;
    const now = new Date().toISOString();
    const item = {
      ...vehicleForm,
      plate: vehicleForm.plate.trim().toUpperCase(),
      model: vehicleForm.model.trim(),
      capacityKg: Number(vehicleForm.capacityKg) || 0,
      id: editingVehicle || uid(),
      businessId: business?.id || null,
      ownerId: vehicleForm.ownerId || db.user.id,
      visibility: vehicleForm.visibility || "espaco_todo",
      sharedWith: Array.isArray(vehicleForm.sharedWith)
        ? vehicleForm.sharedWith
        : [],
      sharedTeams: Array.isArray(vehicleForm.sharedTeams)
        ? vehicleForm.sharedTeams
        : [],
      createdAt: vehicleForm.createdAt || now,
      updatedAt: now,
    };
    update((d) => ({
      ...d,
      vehicles: editingVehicle
        ? (d.vehicles || []).map((v) => (v.id === editingVehicle ? item : v))
        : [item, ...(d.vehicles || [])],
    }));
    setVehicleModal(false);
    setToast(editingVehicle ? "Ve√≠culo atualizado" : "Ve√≠culo cadastrado");
  };
  const removeVehicle = (id) => {
    if (!confirm("Excluir este ve√≠culo da frota?")) return;
    update((d) => ({
      ...d,
      vehicles: (d.vehicles || []).filter((v) => v.id !== id),
    }));
  };

  const openTrip = (item = null) => {
    setEditingTrip(item?.id || null);
    setTripForm(item ? { ...blankTrip, ...item } : blankTrip);
    setTripModal(true);
  };
  const saveTrip = (e) => {
    e.preventDefault();
    if (!tripForm.origin.trim() || !tripForm.destination.trim()) return;
    const now = new Date().toISOString();
    const item = {
      ...tripForm,
      origin: tripForm.origin.trim(),
      destination: tripForm.destination.trim(),
      weightKg: Number(tripForm.weightKg) || 0,
      freightValue: Number(tripForm.freightValue) || 0,
      cteValue: Number(tripForm.cteValue) || 0,
      id: editingTrip || uid(),
      businessId: business?.id || null,
      ownerId: tripForm.ownerId || db.user.id,
      visibility: tripForm.visibility || "espaco_todo",
      sharedWith: Array.isArray(tripForm.sharedWith) ? tripForm.sharedWith : [],
      sharedTeams: Array.isArray(tripForm.sharedTeams)
        ? tripForm.sharedTeams
        : [],
      createdAt: tripForm.createdAt || now,
      updatedAt: now,
    };
    update((d) => ({
      ...d,
      trips: editingTrip
        ? (d.trips || []).map((t) => (t.id === editingTrip ? item : t))
        : [item, ...(d.trips || [])],
    }));
    setTripModal(false);
    setToast(editingTrip ? "Frete atualizado" : "Frete registrado");
  };
  const removeTrip = (id) => {
    if (!confirm("Excluir este frete?")) return;
    update((d) => ({ ...d, trips: (d.trips || []).filter((t) => t.id !== id) }));
  };
  const changeTripStatus = (item, status) =>
    update((d) => ({
      ...d,
      trips: (d.trips || []).map((t) =>
        t.id === item.id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
      ),
    }));
  const vehicleLabel = (id) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.plate} ¬∑ ${v.model}` : "Sem ve√≠culo definido";
  };

  return (
    <PageTitle
      eyebrow="FROTA E FRETES"
      title="Ve√≠culos e fretes em um s√≥ lugar"
      text="Cadastre a frota, acompanhe manuten√ß√µes e registre fretes com controle de CT-e."
      action={
        <Button
          icon={Plus}
          onClick={() => (view === "frota" ? openVehicle() : openTrip())}
        >
          {view === "frota" ? "Novo ve√≠culo" : "Novo frete"}
        </Button>
      }
    >
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            type="search"
            placeholder={view === "frota" ? "Buscar ve√≠culo" : "Buscar frete"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar"
          />
        </div>
        <div className="view-toggle">
          <button
            className={view === "frota" ? "active" : ""}
            onClick={() => setView("frota")}
          >
            Frota
          </button>
          <button
            className={view === "fretes" ? "active" : ""}
            onClick={() => setView("fretes")}
          >
            Fretes
          </button>
        </div>
      </div>

      {view === "frota" ? (
        filteredVehicles.length === 0 ? (
          <Empty
            icon={Truck}
            title="Nenhum ve√≠culo cadastrado"
            text="Cadastre os ve√≠culos da frota para vincul√°-los aos fretes."
            action="Novo ve√≠culo"
            onAction={() => openVehicle()}
          />
        ) : (
          <div className="data-list">
            {filteredVehicles.map((v) => (
              <article key={v.id}>
                <span
                  className={`status-dot ${v.status === "Inativo" ? "cancelado" : maintenanceDue(v) ? "faltou" : "conclu√≠do"}`}
                />
                <span>
                  <strong>
                    {v.plate} ¬∑ {v.model || "Sem modelo"}
                  </strong>
                  <small>
                    {v.type} ¬∑ {v.status}
                    {v.driverName && ` ¬∑ Motorista: ${v.driverName}`}
                    {maintenanceDue(v) && " ¬∑ Manuten√ß√£o pr√≥xima"}
                  </small>
                </span>
                <span className="task-actions">
                  <button
                    className="icon-button"
                    aria-label={`Editar ${v.plate}`}
                    onClick={() => openVehicle(v)}
                  >
                    <Edit3 />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Excluir ${v.plate}`}
                    onClick={() => removeVehicle(v.id)}
                  >
                    <Trash2 />
                  </button>
                </span>
              </article>
            ))}
          </div>
        )
      ) : filteredTrips.length === 0 ? (
        <Empty
          icon={Route}
          title="Nenhum frete registrado"
          text="Registre fretes vinculando ve√≠culo, rota e o CT-e correspondente."
          action="Novo frete"
          onAction={() => openTrip()}
        />
      ) : (
        <div className="data-list">
          {filteredTrips.map((t) => (
            <article key={t.id}>
              <span>
                <strong>
                  {t.origin} ‚Üí {t.destination}
                </strong>
                <small>
                  {vehicleLabel(t.vehicleId)}
                  {t.cteNumber && ` ¬∑ CT-e ${t.cteNumber}`} ¬∑{" "}
                  {t.scheduledDate}
                </small>
              </span>
              <select
                value={t.status}
                onChange={(e) => changeTripStatus(t, e.target.value)}
              >
                {tripStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <span className="task-actions">
                <button
                  className="icon-button"
                  aria-label={`Editar frete ${t.origin} para ${t.destination}`}
                  onClick={() => openTrip(t)}
                >
                  <Edit3 />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir frete ${t.origin} para ${t.destination}`}
                  onClick={() => removeTrip(t.id)}
                >
                  <Trash2 />
                </button>
              </span>
            </article>
          ))}
        </div>
      )}

      {vehicleModal && (
        <Modal
          title={editingVehicle ? "Editar ve√≠culo" : "Novo ve√≠culo"}
          onClose={() => setVehicleModal(false)}
        >
          <form className="modal-body" onSubmit={saveVehicle}>
            <div className="form-grid">
              <Field label="Placa">
                <input
                  required
                  autoFocus
                  value={vehicleForm.plate}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, plate: e.target.value })
                  }
                />
              </Field>
              <Field label="Modelo">
                <input
                  value={vehicleForm.model}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, model: e.target.value })
                  }
                />
              </Field>
              <Field label="Tipo">
                <input
                  value={vehicleForm.type}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, type: e.target.value })
                  }
                  placeholder="Caminh√£o, Van, Moto..."
                />
              </Field>
              <Field label="Capacidade (kg)">
                <input
                  type="number"
                  min="0"
                  value={vehicleForm.capacityKg}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, capacityKg: e.target.value })
                  }
                />
              </Field>
              <Field label="Status">
                <select
                  value={vehicleForm.status}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, status: e.target.value })
                  }
                >
                  {vehicleStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Motorista">
                <input
                  value={vehicleForm.driverName}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, driverName: e.target.value })
                  }
                />
              </Field>
              <Field label="WhatsApp do motorista">
                <input
                  value={vehicleForm.driverContact}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      driverContact: e.target.value,
                    })
                  }
                  placeholder="(11) 98888-7777"
                />
              </Field>
              <Field label="Pr√≥xima manuten√ß√£o">
                <input
                  type="date"
                  value={vehicleForm.nextMaintenanceDate}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      nextMaintenanceDate: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Observa√ß√µes">
              <textarea
                value={vehicleForm.notes}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, notes: e.target.value })
                }
              />
            </Field>
            <SharingFields
              value={{
                visibility: vehicleForm.visibility,
                sharedWith: vehicleForm.sharedWith,
                sharedTeams: vehicleForm.sharedTeams,
              }}
              onChange={(next) => setVehicleForm({ ...vehicleForm, ...next })}
              teams={db.teams}
            />
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setVehicleModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editingVehicle ? "Salvar altera√ß√µes" : "Salvar ve√≠culo"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {tripModal && (
        <Modal
          title={editingTrip ? "Editar frete" : "Novo frete"}
          wide
          onClose={() => setTripModal(false)}
        >
          <form className="modal-body" onSubmit={saveTrip}>
            <div className="form-grid">
              <Field label="Ve√≠culo">
                <select
                  value={tripForm.vehicleId}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, vehicleId: e.target.value })
                  }
                >
                  <option value="">A definir</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} ¬∑ {v.model}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Motorista">
                <input
                  value={tripForm.driverName}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, driverName: e.target.value })
                  }
                />
              </Field>
              <Field label="Origem">
                <input
                  required
                  autoFocus
                  value={tripForm.origin}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, origin: e.target.value })
                  }
                />
              </Field>
              <Field label="Destino">
                <input
                  required
                  value={tripForm.destination}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, destination: e.target.value })
                  }
                />
              </Field>
              <Field label="Peso da carga (kg)">
                <input
                  type="number"
                  min="0"
                  value={tripForm.weightKg}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, weightKg: e.target.value })
                  }
                />
              </Field>
              <Field label="Valor do frete">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tripForm.freightValue}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, freightValue: e.target.value })
                  }
                />
              </Field>
              <Field label="Data programada">
                <input
                  type="date"
                  value={tripForm.scheduledDate}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, scheduledDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Status">
                <select
                  value={tripForm.status}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, status: e.target.value })
                  }
                >
                  {tripStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descri√ß√£o da carga">
              <input
                value={tripForm.cargoDescription}
                onChange={(e) =>
                  setTripForm({ ...tripForm, cargoDescription: e.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="N√∫mero do CT-e (registro manual)">
                <input
                  value={tripForm.cteNumber}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, cteNumber: e.target.value })
                  }
                />
              </Field>
              <Field label="Valor do CT-e">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tripForm.cteValue}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, cteValue: e.target.value })
                  }
                />
              </Field>
            </div>
            <p className="settings-note">
              <CircleAlert />A emiss√£o oficial do CT-e √© feita no seu emissor
              fiscal homologado. Aqui voc√™ s√≥ registra o n√∫mero e o valor
              para controle interno do frete.
            </p>
            <Field label="Observa√ß√µes">
              <textarea
                value={tripForm.notes}
                onChange={(e) =>
                  setTripForm({ ...tripForm, notes: e.target.value })
                }
              />
            </Field>
            <SharingFields
              value={{
                visibility: tripForm.visibility,
                sharedWith: tripForm.sharedWith,
                sharedTeams: tripForm.sharedTeams,
              }}
              onChange={(next) => setTripForm({ ...tripForm, ...next })}
              teams={db.teams}
            />
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setTripModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editingTrip ? "Salvar altera√ß√µes" : "Salvar frete"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}

const planStatuses = ["Planejado", "Em andamento", "Conclu√≠do", "Cancelado"];
const suggestedCompetencies = [
  "Organiza√ß√£o",
  "Comunica√ß√£o",
  "Responsabilidade",
  "Atendimento",
  "Ferramentas digitais",
  "Vendas",
  "Qualidade",
  "Produtividade",
  "Trabalho em equipe",
  "Autonomia",
  "Pontualidade",
  "Aten√ß√£o aos detalhes",
  "Resolu√ß√£o de problemas",
];

function DevelopmentPlans({ db, update, business, setToast, go: _go }) {
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState(""),
    [realMembers, setRealMembers] = useState([]);
  useEffect(() => {
    const space = activeSpaceId();
    fetch(`/api/collab${space ? `?owner=${encodeURIComponent(space)}` : ""}`, {
      headers: authHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRealMembers(d.members || []))
      .catch(() => {});
  }, []);
  const blankPlan = {
    title: "",
    collaboratorId: "",
    collaboratorName: "",
    generalObjective: "",
    period: "",
    status: "Planejado",
    competencies: [],
    finalResult: "",
    notes: "",
  };
  const [form, setForm] = useState(blankPlan);
  const plans = db.developmentPlans || [];
  const filtered = plans.filter(
    (p) =>
      (!business || p.businessId === business.id) &&
      (!search ||
        `${p.title} ${p.collaboratorName}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const openPlan = (plan = null) => {
    setEditing(plan?.id || null);
    setForm(plan ? { ...blankPlan, ...plan } : blankPlan);
    setModal(true);
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.collaboratorName.trim()) return;
    const now = new Date().toISOString();
    update((d) => {
      const item = {
        ...form,
        title: form.title.trim(),
        id: editing || uid(),
        businessId: business?.id || null,
        ownerId: form.ownerId || db.user.id,
        assigneeId: form.collaboratorId || null,
        createdAt: form.createdAt || now,
        updatedAt: now,
      };
      return {
        ...d,
        developmentPlans: editing
          ? (d.developmentPlans || []).map((p) => (p.id === editing ? item : p))
          : [item, ...(d.developmentPlans || [])],
      };
    });
    setModal(false);
    setToast(editing ? "Plano atualizado" : "Plano de desenvolvimento criado");
  };
  const removePlan = (id) => {
    if (!confirm("Excluir este plano de desenvolvimento?")) return;
    update((d) => ({
      ...d,
      developmentPlans: (d.developmentPlans || []).filter((p) => p.id !== id),
    }));
  };
  const blankCompetency = {
    name: "",
    currentSituation: "",
    objective: "",
    deadline: "",
    progress: "0",
    evidence: "",
    managerEvaluation: "",
  };
  const addCompetency = () =>
    setForm((c) => ({
      ...c,
      competencies: [...(c.competencies || []), { id: uid(), ...blankCompetency }],
    }));
  const updateCompetency = (id, field, value) =>
    setForm((c) => ({
      ...c,
      competencies: (c.competencies || []).map((comp) =>
        comp.id === id ? { ...comp, [field]: value } : comp,
      ),
    }));
  const removeCompetency = (id) =>
    setForm((c) => ({
      ...c,
      competencies: (c.competencies || []).filter((comp) => comp.id !== id),
    }));
  const overallProgress = (plan) => {
    const list = plan.competencies || [];
    if (!list.length) return 0;
    return Math.round(
      list.reduce((sum, c) => sum + (Number(c.progress) || 0), 0) / list.length,
    );
  };
  return (
    <PageTitle
      eyebrow="DESENVOLVIMENTO"
      title="Planos de desenvolvimento"
      text="Acompanhe compet√™ncias e evolu√ß√£o da equipe."
      action={
        <Button icon={Plus} onClick={() => openPlan()}>
          Novo plano
        </Button>
      }
    >
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            type="search"
            placeholder="Buscar plano"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <Empty
          icon={TrendingUp}
          title="Nenhum plano de desenvolvimento"
          text="Crie um plano vinculando compet√™ncias e metas pr√°ticas para um colaborador."
          action="Novo plano"
          onAction={() => openPlan()}
        />
      ) : (
        <div className="data-list">
          {filtered.map((p) => (
            <article key={p.id}>
              <span>
                <strong>{p.title}</strong>
                <small>
                  {p.collaboratorName} ¬∑ {p.status} ¬∑ {overallProgress(p)}% conclu√≠do
                </small>
              </span>
              <span className="task-actions">
                <button
                  className="icon-button"
                  aria-label={`Editar ${p.title}`}
                  onClick={() => openPlan(p)}
                >
                  <Edit3 />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir ${p.title}`}
                  onClick={() => removePlan(p.id)}
                >
                  <Trash2 />
                </button>
              </span>
            </article>
          ))}
        </div>
      )}
      {modal && (
        <Modal
          title={editing ? "Editar plano" : "Novo plano de desenvolvimento"}
          wide
          onClose={() => setModal(false)}
        >
          <form className="modal-body" onSubmit={save}>
            <Field label="T√≠tulo do plano">
              <input
                required
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Colaborador">
                <input
                  required
                  list="dev-plan-members"
                  value={form.collaboratorName}
                  onChange={(e) => {
                    const value = e.target.value;
                    const member = realMembers.find((m) => m.name === value);
                    setForm({
                      ...form,
                      collaboratorName: value,
                      collaboratorId: member ? member.id : "",
                    });
                  }}
                  placeholder="Nome da pessoa"
                />
                <datalist id="dev-plan-members">
                  {realMembers.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Per√≠odo">
                <input
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  placeholder="Ex.: Jul‚ÄìSet 2026"
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {planStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Objetivo geral">
              <textarea
                value={form.generalObjective}
                onChange={(e) =>
                  setForm({ ...form, generalObjective: e.target.value })
                }
              />
            </Field>
            <div className="field">
              <span>Compet√™ncias</span>
              <div className="variant-rows">
                {(form.competencies || []).map((c) => (
                  <div key={c.id} className="competency-row">
                    <input
                      list="suggested-competencies"
                      value={c.name}
                      onChange={(e) =>
                        updateCompetency(c.id, "name", e.target.value)
                      }
                      placeholder="Compet√™ncia"
                      aria-label="Nome da compet√™ncia"
                    />
                    <input
                      value={c.objective}
                      onChange={(e) =>
                        updateCompetency(c.id, "objective", e.target.value)
                      }
                      placeholder="Objetivo"
                      aria-label={`Objetivo da compet√™ncia ${c.name || ""}`}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={c.progress}
                      onChange={(e) =>
                        updateCompetency(c.id, "progress", e.target.value)
                      }
                      placeholder="% conclu√≠do"
                      aria-label={`Progresso da compet√™ncia ${c.name || ""}`}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Remover compet√™ncia"
                      onClick={() => removeCompetency(c.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
      ◊7Ô¶ÚµÎ(ö+my“∂Wì¢f˜&“Ê∂WíÁG&ñ“Çí¿¢Ê÷S¢f˜&“ÊÊ÷RÁG&ñ“Çí¿¢6óGì¢f˜&“Ê6óGíÁG&ñ“Çí¿¢÷˜VÁC¢f˜&“Ê÷˜VÁB¿¢FW67&óFñˆ„¢f˜&“ÊFW67&óFñˆ‚ÁG&ñ“Çí¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢7&VFVDC¢Ê˜r¿¢”∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢óÑ6Ü&vW3¢∑&V6˜&B¬‚‚‚á&WbÁóÑ6Ü&vW2«¬µ“íÊfñ«FW"ÇÜ2í”‚2ÊñB”“ñBï“¿¢“íì∞¢6WDf˜&“ÇÜbí”‚á≤‚‚Êb¬ñB“íì∞¢6WEFˆ7BÇ$6ˆ'&Ï:v6«f"ì∞¢”∞¢6ˆÁ7B˜V‰6Ü&vR“Ü2í”‡¢6WDf˜&“á∞¢ñC¢2ÊñB¿¢∂Wì¢2Ê∂Wí«¬""¿¢Ê÷S¢2ÊÊ÷R«¬""¿¢6óGì¢2Ê6óGí«¬""¿¢÷˜VÁC¢2Ê÷˜VÁB«¬""¿¢FW67&óFñˆ„¢2ÊFW67&óFñˆ‚«¬""¿¢“ì∞¢6ˆÁ7B&V÷˜fT6Ü&vR“ÜñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç$WÜ6«Vó"W7F6ˆ'&Ï:vÚ"íí&WGW&„∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢óÑ6Ü&vW3¢á&WbÁóÑ6Ü&vW2«¬µ“íÊfñ«FW"ÇÜ2í”‚2ÊñB”“ñBí¿¢“íì∞¢ñbÜf˜&“ÊñB””“ñBí6WDf˜&“ÇÜbí”‚á≤‚‚Êb¬ñC¢ÁV∆¬“íì∞¢6WEFˆ7BÇ$6ˆ'&Ï:vWÜ6«\:÷F"ì∞¢”∞†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'vRóÇ◊vR#‡¢∆ÜVFW"6∆74Ê÷S“'vR÷ÜVB#‡¢∆Fóc‡¢∆É‰6ˆ'&Ï:vóÉ¬ˆÉ‡¢«6∆74Ê÷S“'vR◊7V"#‡¢vW&RV“óÇgV˜C∂6˜ñR6ˆ∆gV˜C≤6ˆ“Úf∆˜"RFW67&ú:|:6Ú¬RVÁfñR¢6∆ñVÁFR‚w&GVóFÚ(	BÚFñÊÜVó&Ú6íFó&WFÚÊ6ˆÁFF7V6ÜfR‡¢¬˜‡¢¬ˆFóc‡¢¬ˆÜVFW#‡†¢∆Fób6∆74Ê÷S“&6&BóÇ÷f˜&“#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢≈$6ˆFRÛ‡¢«7„‡¢ÚVÊ2÷ˆÁFÚ<;6FñvÚóÇ'Fó"F7V6ÜfR(	BÏ:6¢&ˆ6W76v÷VÁF˜2ÊV“Fˆ6ÊÚ6WRFñÊÜVó&Ú‚6ˆÊfó&7V6ÜfP¢ÁFW2FRVÁfñ"‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“%7V6ÜfRóÇ#‡¢∆ñÁW@¢f«VS◊∂f˜&“Ê∂Wó–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&∂Wí"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$5bÙ4Â¢¬R÷÷ñ¬¬FV∆VfˆÊR˜R6ÜfR∆VL;7&ñ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$Êˆ÷RFÚ&V6V&VF˜"#‡¢∆ñÁWBf«VS◊∂f˜&“ÊÊ÷W“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&Ê÷R"¬RÁF&vWBÁf«VRó“Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6ñFFR#‡¢∆ñÁW@¢f«VS◊∂f˜&“Ê6óGó–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&6óGí"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢&V6ñfR ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%f∆˜"Ü˜6ñˆÊ¬í#‡¢∆ñÁW@¢GóS“&ÁV÷&W" ¢÷ñ„“# ¢7FW“#„ ¢f«VS◊∂f˜&“Ê÷˜VÁG–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&÷˜VÁB"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$FVóÜRV“'&Ê6Ú&Ú6∆ñVÁFRFñvóF" ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$FW67&ú:|:6ÚÜ˜6ñˆÊ¬í#‡¢∆ñÁW@¢f«VS◊∂f˜&“ÊFW67&óFñˆÁ–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&FW67&óFñˆ‚"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢&ˆ∆ÚFRÊófW'<:&ñÚ ¢Û‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢¬ˆFóc‡†¢∂6ˆFRÚÄ¢∆Fób6∆74Ê÷S“&6&BóÇ◊&W7V«B#‡¢«7‚6∆74Ê÷S“'óÇ◊&W7V«B÷∆&V¬#ÂóÇ6˜ñR6ˆ∆¬˜7„‡¢«FWáF&V6∆74Ê÷S“'óÇ÷6ˆFR"&VDˆÊ«í&˜w3◊≥G“f«VS◊∂6ˆFW“Û‡¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊∂6˜î6ˆFW”‡¢ƒ6˜í6ó¶S◊≥g“Û‚6˜ñ"<;6Fñv¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∑6Ü&UvÜG6”‡¢≈6VÊB6ó¶S◊≥g“Û‚VÁfñ"˜"vÜG4 ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∑6fT6Ü&vW”‡¢6«f ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢«6∆74Ê÷S“'óÇ÷ÜñÁB#‡¢Ú6∆ñVÁFRvV“«7G&ˆÊsÂóÇ(i"6˜ñR6ˆ∆¬˜7G&ˆÊs‚ÊÚF¢&Ê6Ú‚6Rfˆ<:¢&VVÊ6ÜWRÚf∆˜"¬V∆R¨:fV“&VVÊ6ÜñFÚ‡¢¬˜‡¢¬ˆFóc‡¢í¢Ä¢∆Fób6∆74Ê÷S“&V◊Gí◊7FFR#‡¢≈$6ˆFRÛ‡¢∆É3‰ñÊf˜&÷R7V6ÜfRóÉ¬ˆÉ3‡¢«Â&VVÊ6Ü6ÜfR6ñ÷&vW&"Ú<;6FñvÚFR6ˆ'&Ï:v„¬˜‡¢¬ˆFóc‡¢ó–†¢∂6Ü&vW2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“'óÇ◊6fVB#‡¢∆É3‰6ˆ'&Ï:v26«f3¬ˆÉ3‡¢∆Fób6∆74Ê÷S“'óÇ◊6fVB÷∆ó7B#‡¢∂6Ü&vW2Ê÷ÇÜ2í”‚Ä¢∆'Fñ6∆R∂Wì◊∂2ÊñG“6∆74Ê÷S“&6&BóÇ◊6fVB÷óFV“#‡¢∆Fóc‡¢∆ÉC‡¢¥ÁV÷&W"Ü2Ê÷˜VÁBí‚ ¢Ú"BG¥ÁV÷&W"Ü2Ê÷˜VÁBíÁFÙfóÜVBÉ"íÁ&W∆6RÇ"‚"¬"¬"ó÷ ¢¢%f∆˜"∆óg&R'–¢¬ˆÉC‡¢«6∆74Ê÷S“'óÇ◊6fVB÷÷WF#‡¢∂2ÊFW67&óFñˆ‚«¬2Ê∂Wó–¢¬˜‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'óÇ◊6fVB÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊≤Çí”‚˜V‰6Ü&vRÜ2ó”‡¢≈VÊ6ñ¬6ó¶S◊≥W“Û‚'&ó ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fT6Ü&vRÜ2ÊñBó–¢‡¢≈G&6É"6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶gVÊ7Fñˆ‚V÷ñ≈6ñvÊGW&Rá≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B“í∞¢6ˆÁ7B&∆Ê≤“∞¢ñC¢ÁV∆¬¿¢∆&V√¢""¿¢Ê÷S¢F"ÁW6W#ÚÊÊ÷R«¬""¿¢&ˆ∆S¢""¿¢'W6ñÊW73¢'W6ñÊW73ÚÊÊ÷R«¬""¿¢ÜˆÊS¢""¿¢V÷ñ√¢F"ÁW6W#ÚÊV÷ñ¬«¬""¿¢6óFS¢""¿¢6óGì¢""¿¢ñÁ7Fw&”¢""¿¢66VÁC¢"33cñ"¿¢”∞¢6ˆÁ7B∂f˜&“¬6WDf˜&’““W6U7FFRÜ&∆Ê≤ì∞¢6ˆÁ7B6WB“Ü≤¬bí”‚6WDf˜&“ÇÜbí”‚á≤‚‚Êb¬∂µ”¢b“íì∞¢6ˆÁ7B6ñr“'Vñ∆DV÷ñ≈6ñvÊGW&RÜf˜&“ì∞¢6ˆÁ7B6fVB“F"Á6ñvÊGW&W0¢Êfñ«FW"Çá2í”‚'W6ñÊW72«¬2Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñBê¢Á6∆ñ6RÇê¢Á6˜'BÇÜ¬"í”‚Ü"ÁWFFVDB«¬""íÊ∆ˆ6∆T6ˆ◊&RÜÁWFFVDB«¬""íì∞†¢6ˆÁ7BvFñvóG2“7G&ñÊrÜf˜&“ÁvÜG6«¬f˜&“ÁÜˆÊR«¬""íÁ&W∆6RÇıƒBˆr¬""ì∞¢6ˆÁ7Bv∆ñÊ≤“vFñvóG0¢ÚáGG3¢Ú˜vÊ÷RÚG∑vFñvóG2Á7F'G5vóFÇÇ#SR"íÚvFñvóG2¢SRG∑vFñvóG7÷÷ ¢¢"#∞¢6ˆÁ7Bñt∆ñÊ≤“f˜&“ÊñÁ7Fw&–¢ÚıÊáGG3Û•¬ı¬ÚˆíÁFW7BÜf˜&“ÊñÁ7Fw&“ê¢Úf˜&“ÊñÁ7Fw&–¢¢áGG3¢ÚˆñÁ7Fw&“Ê6ˆ“ÚG∂f˜&“ÊñÁ7Fw&“Á&W∆6RÇı‰Ú¬""ó÷ ¢¢"#∞¢6ˆÁ7B66VÁB“ı‚5≥”ñ÷e◊≥2√á“BˆíÁFW7BÜf˜&“Ê66VÁBíÚf˜&“Ê66VÁB¢"33cñ#∞†¢6ˆÁ7B6˜ï&ñ6Ç“7ñÊ2Çí”‚∞¢G'í∞¢ñbÜÊfñvF˜"Ê6∆ó&ˆ&BbbvñÊF˜r‰6∆ó&ˆ&DóFV“í∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFRÖ∞¢ÊWrvñÊF˜r‰6∆ó&ˆ&DóFV“á∞¢'FWáBˆáF÷¬#¢ÊWr&∆ˆ"Ö∑6ñrÊáF÷≈“¬≤GóS¢'FWáBˆáF÷¬"“í¿¢'FWáB˜∆ñ‚#¢ÊWr&∆ˆ"Ö∑6ñrÁFWáE“¬≤GóS¢'FWáB˜∆ñ‚"“í¿¢“í¿¢“ì∞¢“V«6R∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFUFWáBá6ñrÁFWáBì∞¢–¢6WEFˆ7BÇ$76ñÊGW&6˜ñF(	B6ˆ∆RÊÚ6WRR÷÷ñ¬"ì∞¢G&6µ&ˆGV7DWfVÁBÇ'6ñvÊGW&Uˆ6˜ñVB"¬≤÷ˆGV∆S¢&76ñÊGW&"¬f˜&÷C¢&áF÷¬"“ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬6˜ñ"v˜&"ì∞¢–¢”∞¢6ˆÁ7B6˜ïFWáB“7ñÊ2Çí”‚∞¢G'í∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFUFWáBá6ñrÁFWáBì∞¢6WEFˆ7BÇ%FWáFÚ6˜ñFÚ"ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬6˜ñ"v˜&"ì∞¢–¢”∞¢6ˆÁ7BF˜vÊ∆ˆDáF÷¬“Çí”‚∞¢6ˆÁ7B&∆ˆ"“ÊWr&∆ˆ"Ä¢∂¬Fˆ7GóRáF÷√„∆÷WF6Ü'6WC“'WFb”Ç#„∆&ˆGì‚G∑6ñrÊáF÷«”¬ˆ&ˆGìÊ“¿¢≤GóS¢'FWáBˆáF÷√∂6Ü'6WC◊WFb”Ç"“¿¢ì∞¢6ˆÁ7B“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢Êá&Vb“U$¬Ê7&VFTˆ&¶V7EU$¬Ü&∆ˆ"ì∞¢ÊF˜vÊ∆ˆB“76ñÊGW&“G∑6«VvñgíÜf˜&“ÊÊ÷R«¬&V÷ñ¬"ó“ÊáF÷∆∞¢Ê6∆ñ6≤Çì∞¢U$¬Á&Wfˆ∂Tˆ&¶V7EU$¬ÜÊá&Vbì∞¢”∞¢6ˆÁ7B6fU6ñvÊGW&R“Çí”‚∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢6ˆÁ7BñB“f˜&“ÊñB«¬VñBÇì∞¢6ˆÁ7B&V6˜&B“∞¢‚‚Êf˜&“¿¢ñB¿¢∆&V√¢f˜&“Ê∆&V¬«¬f˜&“ÊÊ÷R«¬$76ñÊGW&"¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢f˜&“Ê˜vÊW$ñB«¬F"ÁW6W"ÊñB¿¢7&VFVDC¢f˜&“Ê7&VFVDB«¬Ê˜r¿¢WFFVDC¢Ê˜r¿¢”∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢6ñvÊGW&W3¢&WbÁ6ñvÊGW&W2Á6ˆ÷RÇá2í”‚2ÊñB””“ñBê¢Ú&WbÁ6ñvÊGW&W2Ê÷Çá2í”‚á2ÊñB””“ñBÚ&V6˜&B¢2íê¢¢∑&V6˜&B¬‚‚Á&WbÁ6ñvÊGW&W5“¿¢“íì∞¢6WDf˜&“ÇÜbí”‚á≤‚‚Êb¬ñB¬7&VFVDC¢&V6˜&BÊ7&VFVDB¬˜vÊW$ñC¢&V6˜&BÊ˜vÊW$ñB“íì∞¢6WEFˆ7BÇ$76ñÊGW&6«f"ì∞¢”∞¢6ˆÁ7B˜VÂ6fVB“á2í”‚6WDf˜&“á≤‚‚Ê&∆Ê≤¬‚‚Á2“ì∞¢6ˆÁ7B&V÷˜fU6fVB“ÜñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç$WÜ6«Vó"W7F76ñÊGW&Ú"íí&WGW&„∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢6ñvÊGW&W3¢&WbÁ6ñvÊGW&W2Êfñ«FW"Çá2í”‚2ÊñB”“ñBí¿¢“íì∞¢ñbÜf˜&“ÊñB””“ñBí6WDf˜&“Ü&∆Ê≤ì∞¢6WEFˆ7BÇ$76ñÊGW&WÜ6«\:÷F"ì∞¢”∞†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'vR6ñvÊGW&R◊vR#‡¢∆ÜVFW"6∆74Ê÷S“'vR÷ÜVB#‡¢∆Fóc‡¢∆É‰76ñÊGW&FRR÷÷ñ√¬ˆÉ‡¢«6∆74Ê÷S“'vR◊7V"#‡¢÷ˆÁFRV÷76ñÊGW&&ˆfó76ñˆÊ¬R6˜ñR&ˆÁF&Úv÷ñ¬¿¢˜WF∆ˆˆ≤˜RV«VW"R÷÷ñ¬‚w&GVóFÚRñÁ7FÁL:&ÊVÚ‡¢¬˜‡¢¬ˆFóc‡¢¬ˆÜVFW#‡†¢∆Fób6∆74Ê÷S“'6ñvÊGW&R÷∆ñ˜WB#‡¢∆Fób6∆74Ê÷S“&6&B6ñvÊGW&R÷f˜&“#‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“%6WRÊˆ÷R#‡¢∆ñÁWBf«VS◊∂f˜&“ÊÊ÷W“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&Ê÷R"¬RÁF&vWBÁf«VRó“Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6&vÚÚgVÏ:|:6Ú#‡¢∆ñÁW@¢f«VS◊∂f˜&“Á&ˆ∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ'&ˆ∆R"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢gVÊFF˜& ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$ÊV|;66ñÚ#‡¢∆ñÁW@¢f«VS◊∂f˜&“Ê'W6ñÊW77–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&'W6ñÊW72"¬RÁF&vWBÁf«VRó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6ñFFRÜ˜6ñˆÊ¬í#‡¢∆ñÁW@¢f«VS◊∂f˜&“Ê6óGó–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&6óGí"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢&V6ñfR¬R ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%FV∆VfˆÊR#‡¢∆ñÁW@¢f«VS◊∂f˜&“ÁÜˆÊW–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ'ÜˆÊR"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“"ÉÉíììììí”ìììí ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$R÷÷ñ¬#‡¢∆ñÁWBf«VS◊∂f˜&“ÊV÷ñ«“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&V÷ñ¬"¬RÁF&vWBÁf«VRó“Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%6óFRÜ˜6ñˆÊ¬í#‡¢∆ñÁW@¢f«VS◊∂f˜&“Á6óFW–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ'6óFR"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“'wwrÁ6WVÊVvˆ6ñÚÊ6ˆ“Ê'" ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$ñÁ7Fw&“Ü˜6ñˆÊ¬í#‡¢∆ñÁW@¢f«VS◊∂f˜&“ÊñÁ7Fw&◊–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&ñÁ7Fw&“"¬RÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$6WVÊVvˆ6ñÚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6˜"FRFW7FVR#‡¢∆ñÁW@¢GóS“&6ˆ∆˜" ¢f«VS◊∂66VÁG–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÇ&66VÁB"¬RÁF&vWBÁf«VRó–¢&ñ÷∆&V√“$6˜"FRFW7FVR ¢Û‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊∂6˜ï&ñ6á”‡¢ƒ6˜í6ó¶S◊≥g“Û‚6˜ñ"76ñÊGW&¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∂6˜ïFWáG”‡¢6˜ñ"FWáF¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∂F˜vÊ∆ˆDáF÷«”‡¢ƒF˜vÊ∆ˆB6ó¶S◊≥g“Û‚&óÜ"ÖD‘¿¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∑6fU6ñvÊGW&W”‡¢6«f ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡†¢∆Fób6∆74Ê÷S“'6ñvÊGW&R◊&WfñWr◊w&#‡¢«7‚6∆74Ê÷S“'6ñvÊGW&R◊&WfñWr÷∆&V¬#Â,:ófñ¬˜7„‡¢∆Fób6∆74Ê÷S“&6&B6ñvÊGW&R◊&WfñWr#‡¢∆Fó`¢6∆74Ê÷S“'6ñvÊGW&R÷6&B ¢7Gñ∆S◊∑≤&˜&FW$∆VgC¢7Ç6ˆ∆ñBG∂66VÁG÷◊–¢‡¢∂f˜&“ÊÊ÷Rbb∆Fób6∆74Ê÷S“'6ñr÷Ê÷R#Á∂f˜&“ÊÊ÷W”¬ˆFócÁ–¢≤Üf˜&“Á&ˆ∆R«¬f˜&“Ê'W6ñÊW72íbbÄ¢∆Fób6∆74Ê÷S“'6ñr◊&ˆ∆R#‡¢µ∂f˜&“Á&ˆ∆R¬f˜&“Ê'W6ñÊW75“Êfñ«FW"Ñ&ˆˆ∆V‚íÊ¶ˆñ‚Ç"(	B"ó–¢¬ˆFóc‡¢ó–¢∂f˜&“Ê6óGíbb∆Fób6∆74Ê÷S“'6ñr÷6óGí#Á∂f˜&“Ê6óGó”¬ˆFócÁ–¢≤Üf˜&“ÁÜˆÊR«¬f˜&“ÊV÷ñ¬«¬f˜&“Á6óFRíbbÄ¢∆Fób6∆74Ê÷S“'6ñr÷6ˆÁF7B#‡¢µ∂f˜&“ÁÜˆÊR¬f˜&“ÊV÷ñ¬¬f˜&“Á6óFU“Êfñ«FW"Ñ&ˆˆ∆V‚íÊ÷ÇÜ&óB¬í¬'"í”‚Ä¢«7‚∂Wì◊∂ó”‡¢«7‚7Gñ∆S◊∑≤6ˆ∆˜#¢66VÁB◊”Á∂&óG”¬˜7„‡¢∂í¬'"Ê∆VÊwFÇ“bb«7‚6∆74Ê÷S“'6ñr◊6W#‚¬¬˜7„Á–¢¬˜7„‡¢íó–¢¬ˆFóc‡¢ó–¢≤áv∆ñÊ≤«¬ñt∆ñÊ≤íbbÄ¢∆Fób6∆74Ê÷S“'6ñr÷∆ñÊ∑2#‡¢∑v∆ñÊ≤bb«7‚7Gñ∆S◊∑≤6ˆ∆˜#¢66VÁB◊”ÂvÜG4¬˜7„Á–¢∑v∆ñÊ≤bbñt∆ñÊ≤bb«7‚6∆74Ê÷S“'6ñr◊6W#‚¬¬˜7„Á–¢∂ñt∆ñÊ≤bb«7‚7Gñ∆S◊∑≤6ˆ∆˜#¢66VÁB◊”‰ñÁ7Fw&”¬˜7„Á–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬ˆFóc‡†¢∑6fVBÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“'6ñvÊGW&R◊6fVB#‡¢∆É3‰76ñÊGW&26«f3¬ˆÉ3‡¢∆Fób6∆74Ê÷S“'6ñvÊGW&R◊6fVB÷∆ó7B#‡¢∑6fVBÊ÷Çá2í”‚Ä¢∆'Fñ6∆R∂Wì◊∑2ÊñG“6∆74Ê÷S“&6&B6ñvÊGW&R◊6fVB÷óFV“#‡¢∆Fóc‡¢∆ÉCÁ∑2Ê∆&V«”¬ˆÉC‡¢«6∆74Ê÷S“'6ñvÊGW&R◊6fVB÷÷WF#‡¢µ∑2Á&ˆ∆R¬2Ê'W6ñÊW75“Êfñ«FW"Ñ&ˆˆ∆V‚íÊ¶ˆñ‚Ç"(	B"ó–¢¬˜‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6ñvÊGW&R◊6fVB÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊≤Çí”‚˜VÂ6fVBá2ó”‡¢≈VÊ6ñ¬6ó¶S◊≥W“Û‚'&ó ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU6fVBá2ÊñBó–¢‡¢≈G&6É"6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶6ˆÁ7B‘î‰D‘ÙUÑ’ƒU2“∞¢$6ˆ÷ÚG&ó"÷ó26∆ñVÁFW2&Ú÷WRÊV|;66ñÚ"¿¢$˜&vÊó¶"Ú∆Ï:v÷VÁFÚFRV“Ê˜fÚ&ˆGWFÚ"¿¢%&VGW¶ó"7W7F˜26V“W&FW"V∆ñFFR"¿¢$ñFVñ2FR6ˆÁF\;¶FÚ&2&VFW26ˆ6ñó2"¿•”∞†¢ÚÚF&Vf7&ñF'Fó"FRV÷ñFVñFÚ÷(	BW7V∆ÜÚ&∆ÊµF6≤FRF6∑0¢ÚÚ&&V6W"6˜'&WF÷VÁFRÊÚVG&ÚFR˜W&:|:6Ú‡¶6ˆÁ7BF6¥g&ˆ‘ñFV“áFóF∆R¬7GÇ“∑“í”‚á∞¢ñC¢VñBÇí¿¢FóF∆R¿¢FW67&óFñˆ„¢""¿¢&ñ˜&óGì¢$‹:ñFñ"¿¢7FGW3¢$f¶W""¿¢GVS¢""¿¢&V¢$˜W&:|:6Ú"¿¢76ñvÊVUGóS¢'&V¬"¿¢76ñvÊVS¢""¿¢76ñvÊVTñC¢""¿¢&ˆ¶V7C¢""¿¢ó4÷ó76ñˆ„¢f«6R¿¢Fó7G&ñ'WFñˆ„¢&G&ñ'VñF"¿¢Fñffñ7V«Gì¢%6ñ◊∆W2"¿¢6∆˜G3¢#"¿¢ˆñÁG3¢""¿¢&Wv&C¢""¿¢&˜fƒ÷ˆFS¢&ñ÷VFñF"¿¢∆∆˜uvóFÜG&v√¢G'VR¿¢76ñvÊVW3¢µ“¿¢ñÁFW&W7FVC¢µ“¿¢÷ó76ñˆÂ7FGW3¢""¿¢FV∆ófW&ñW3¢µ“¿¢FV∆ófW'îG&gC¢""¿¢fó6ñ&ñ∆óGì¢'&ófFÚ"¿¢6Ü&VEvóFÉ¢µ“¿¢6Ü&VEFV◊3¢µ“¿¢7V'F6∑3¢µ“¿¢7V'F6¥G&gC¢""¿¢FWVÊG4ˆ„¢µ“¿¢GF6Ü÷VÁG3¢µ“¿¢&V7W'&VÊ6S¢≤g&WVVÊ7ì¢&ÊˆÊR"“¿¢'W6ñÊW74ñC¢7GÇÊ'W6ñÊW74ñB«¬ÁV∆¬¿¢˜vÊW$ñC¢7GÇÊ˜vÊW$ñB«¬ÁV∆¬¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿ß“ì∞†¶gVÊ7Fñˆ‚÷ñÊD÷á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B¬vÚ“í∞¢6ˆÁ7B∑FÜV÷R¬6WEFÜV÷U““W6U7FFRÇ""ì∞¢6ˆÁ7B∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∂7FófR¬6WD7FófU““W6U7FFRÜÁV∆¬ì∞†¢6ˆÁ7B6fVB“F"Ê'&ñÁ7F˜&◊0¢Êfñ«FW"ÇÜ"í”‚'W6ñÊW72«¬"Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñBê¢Á6∆ñ6RÇê¢Á6˜'BÇÜ¬"í”‚Ü"ÁWFFVDB«¬""íÊ∆ˆ6∆T6ˆ◊&RÜÁWFFVDB«¬""íì∞†¢6ˆÁ7BvVÊW&FR“7ñÊ2Çí”‚∞¢6ˆÁ7BB“FÜV÷RÁG&ñ“Çì∞¢ñbáBÊ∆VÊwFÇ¬B«¬'W7íí∞¢ñbáBÊ∆VÊwFÇ¬Bí6WDW'"Ç$FW67&WfÚFV÷V“V∆Ú÷VÊ˜2B∆WG&2‚"ì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢6ˆÁ7B&ˆ◊B“fˆ<:¢f6ñ∆óFV“'&ñÁ7F˜&÷ñÊr&V“WVVÊÚÊV|;66ñÚÊÚ'&6ñ¬‚Wá∆˜&RÚFV÷&óÜÚÁV“÷FRñFVñ2‡†•FV÷6VÁG&√¢G∑G–†•&W7ˆÊF4Ù‘TÂDR6ˆ“V“ˆ&¶WFÚ•4Ù‚l:∆ñFÚ¬6V“6ˆ÷VÁL:&ñ˜2R6V“6W&62FR<;6FñvÚ¬ÊÚf˜&÷FÛ†ß≤'FóF∆R#¢'FV÷6VÁG&¬"¬&'&Ê6ÜW2#¢∑≤'FóF∆R#¢&Êˆ÷RFÚ&÷Ú"¬&ñFV2#¢≤&ñFVñ"¬‚‚Â◊“¬‚‚Â◊–†•&Vw&3†¢“FRBb&÷˜2å:&ÊwV∆˜2ˆ6FVv˜&ñ2FñfW&VÁFW2FÚFV÷í‡¢“FR2RñFVñ27W'F2R6ñˆÏ:fVó2˜"&÷Ú‡¢“˜'GVw\:ß2FÚ'&6ñ¬¬6ˆÊ7&WFÚR:óFñ6Ú‚Ï:6ÚñÁfVÁFRÏ;¶÷W&˜2¬&\:v˜2˜R&W7V«FF˜2Ê∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤&ˆ◊B¬7V6ñ∆ó7C¢$W7G&FVvó7F"“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚Çì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬vW&"v˜&‚"ì∞¢6ˆÁ7B÷“'6T÷ñÊD÷ÜFFÊ6ˆÁFVÁB«¬""ì∞¢ñbÇ÷Ê'&Ê6ÜW2Ê∆VÊwFÇê¢Fá&˜rÊWrW'&˜"Ä¢$î&W7ˆÊFWR¬÷2Ï:6Ú6ˆÁ6VwVí÷ˆÁF"Ú÷‚FVÁFRFRÊ˜fÚ‚"¿¢ì∞¢6WD7FófRá∞¢ñC¢ÁV∆¬¿¢FóF∆S¢÷ÁFóF∆R«¬B¿¢'&Ê6ÜW3¢÷Ê'&Ê6ÜW2¿¢“ì∞¢G&6µ&ˆGV7DWfVÁBÇ&÷ñÊF÷ˆvVÊW&FVB"¬∞¢÷ˆGV∆S¢&ñFVñ2"¿¢'&Ê6ÜW3¢÷Ê'&Ê6ÜW2Ê∆VÊwFÇ¿¢“ì∞¢6WEFÜV÷RÇ""ì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞†¢6ˆÁ7B6WD'&Ê6Ç“Ü&í¬F6Çí”‡¢6WD7FófRÇá2í”‚á∞¢‚‚Á2¿¢'&Ê6ÜW3¢2Ê'&Ê6ÜW2Ê÷ÇÜ"¬íí”‚Üí””“&íÚ≤‚‚Ê"¬‚‚ÁF6Ç“¢"íí¿¢“íì∞¢6ˆÁ7B6WDñFV“Ü&í¬ñí¬f«VRí”‡¢6WD'&Ê6ÇÜ&í¬∞¢ñFV3¢7FófRÊ'&Ê6ÜW5∂&ï“ÊñFV2Ê÷Çáb¬íí”‚Üí””“ñíÚf«VR¢bíí¿¢“ì∞¢6ˆÁ7BFDñFV“Ü&íí”‡¢6WD'&Ê6ÇÜ&í¬≤ñFV3¢≤‚‚Ê7FófRÊ'&Ê6ÜW5∂&ï“ÊñFV2¬"%““ì∞¢6ˆÁ7B&V÷˜fTñFV“Ü&í¬ñíí”‡¢6WD'&Ê6ÇÜ&í¬≤ñFV3¢7FófRÊ'&Ê6ÜW5∂&ï“ÊñFV2Êfñ«FW"ÇÖÚ¬íí”‚í”“ñíí“ì∞¢6ˆÁ7BFD'&Ê6Ç“Çí”‡¢6WD7FófRÇá2í”‚á∞¢‚‚Á2¿¢'&Ê6ÜW3¢≤‚‚Á2Ê'&Ê6ÜW2¬≤FóF∆S¢$Ê˜fÚ&÷Ú"¬ñFV3¢≤"%“’“¿¢“íì∞¢6ˆÁ7B&V÷˜fT'&Ê6Ç“Ü&íí”‡¢6WD7FófRÇá2í”‚á≤‚‚Á2¬'&Ê6ÜW3¢2Ê'&Ê6ÜW2Êfñ«FW"ÇÖÚ¬íí”‚í”“&íí“íì∞†¢6ˆÁ7BñFVFıF6≤“ÜñFVí”‚∞¢6ˆÁ7BFóF∆R“ñFVÁG&ñ“Çì∞¢ñbÇFóF∆Rí&WGW&„∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢F6∑3¢∞¢F6¥g&ˆ‘ñFVáFóF∆R¬≤'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB¬˜vÊW$ñC¢F"ÁW6W"ÊñB“í¿¢‚‚Á&WbÁF6∑2¿¢“¿¢“íì∞¢6WEFˆ7BÇ$ñFVñfó&˜RF&VfV“˜W&:|:6Ú"ì∞¢”∞†¢6ˆÁ7B÷FıFWáB“Ü÷í”‡¢∞¢2G∂÷ÁFóF∆W÷¿¢‚‚Ê÷Ê'&Ê6ÜW2Ê÷Ä¢Ü"í”‡¢∆‚22G∂"ÁFóF∆W’∆‚G∂"ÊñFV2Ê÷ÇÜíí”‚“G∂ó÷íÊ¶ˆñ‚Ç%∆‚"ó÷¿¢í¿¢“Ê¶ˆñ‚Ç%∆‚"ì∞¢6ˆÁ7B6˜î÷“7ñÊ2Çí”‚∞¢G'í∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFUFWáBÜ÷FıFWáBÜ7FófRíì∞¢6WEFˆ7BÇ$÷6˜ñFÚ"ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬6˜ñ"v˜&"ì∞¢–¢”∞¢6ˆÁ7B6fT÷“Çí”‚∞¢ñbÇ7FófRí&WGW&„∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢6ˆÁ7BñB“7FófRÊñB«¬VñBÇì∞¢6ˆÁ7B&V6˜&B“∞¢ñB¿¢FóF∆S¢7FófRÁFóF∆R«¬$÷FRñFVñ2"¿¢'&Ê6ÜW3¢7FófRÊ'&Ê6ÜW2¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢7FófRÊ˜vÊW$ñB«¬F"ÁW6W"ÊñB¿¢7&VFVDC¢7FófRÊ7&VFVDB«¬Ê˜r¿¢WFFVDC¢Ê˜r¿¢”∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢'&ñÁ7F˜&◊3¢&WbÊ'&ñÁ7F˜&◊2Á6ˆ÷RÇÜ"í”‚"ÊñB””“ñBê¢Ú&WbÊ'&ñÁ7F˜&◊2Ê÷ÇÜ"í”‚Ü"ÊñB””“ñBÚ&V6˜&B¢"íê¢¢∑&V6˜&B¬‚‚Á&WbÊ'&ñÁ7F˜&◊5“¿¢“íì∞¢6WD7FófRÇá2í”‚á≤‚‚Á2¬ñB¬7&VFVDC¢&V6˜&BÊ7&VFVDB¬˜vÊW$ñC¢&V6˜&BÊ˜vÊW$ñB“íì∞¢6WEFˆ7BÇ$÷6«fÚ"ì∞¢”∞¢6ˆÁ7B˜V‰÷“Ü"í”‡¢6WD7FófRá∞¢ñC¢"ÊñB¿¢FóF∆S¢"ÁFóF∆R¿¢'&Ê6ÜW3¢"Ê'&Ê6ÜW2«¬µ“¿¢7&VFVDC¢"Ê7&VFVDB¿¢˜vÊW$ñC¢"Ê˜vÊW$ñB¿¢“ì∞¢6ˆÁ7B&V÷˜fU6fVB“ÜñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç$WÜ6«Vó"W7FR÷Ú"íí&WGW&„∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢'&ñÁ7F˜&◊3¢&WbÊ'&ñÁ7F˜&◊2Êfñ«FW"ÇÜ"í”‚"ÊñB”“ñBí¿¢“íì∞¢ñbÜ7FófSÚÊñB””“ñBí6WD7FófRÜÁV∆¬ì∞¢6WEFˆ7BÇ$÷WÜ6«\:÷FÚ"ì∞¢”∞†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'vR÷ñÊF÷◊vR#‡¢∆ÜVFW"6∆74Ê÷S“'vR÷ÜVB#‡¢∆Fóc‡¢∆É‰÷FRñFVñ3¬ˆÉ‡¢«6∆74Ê÷S“'vR◊7V"#‡¢W67&WfV“FW6fñÚ˜RFV÷Rî'&RV“&÷˜2RñFVñ2‚VFóFR¿¢G&Á6f˜&÷RñFVñ2V“F&Vf2R6«fR‚GVFÚw&GVóFÚ‡¢¬˜‡¢¬ˆFóc‡¢¬ˆÜVFW#‡†¢∆Fób6∆74Ê÷S“&6&B÷ñÊF÷÷vVÊW&F˜"#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒ∆ñváF'V∆"Û‡¢«7„‡¢97Fñ÷Ú&FW7G&f"V“&ˆ&∆V÷¬∆ÊV¶"∆vÚÊ˜fÚ˜RßVÁF ¢ñFVñ2ÁFW2FRvó"‚îÏ:6ÚñÁfVÁFÏ;¶÷W&˜2ÊV“&W7V«FF˜2‡¢¬˜7„‡¢¬ˆFóc‡¢ƒfñV∆B∆&V√“%V¬:íÚFV÷˜RFW6fñÛÚ#‡¢«FWáF&V¢&˜w3◊≥'–¢f«VS◊∑FÜV÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEFÜV÷RÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢6ˆ÷Ú6ˆÁ6VwVó"÷WW2&ñ÷Vó&˜26∆ñVÁFW2 ¢Û‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“&÷ñÊF÷÷WÜ◊∆W2#‡¢¥‘î‰D‘ÙUÑ’ƒU2Ê÷ÇÜWÇí”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂Wá–¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&6Üó÷'F‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEFÜV÷RÜWÇó–¢‡¢∂Wá–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢∂W'"bb«6∆74Ê÷S“&f˜&“÷W'&˜"#Á∂W''”¬˜Á–¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊∂vVÊW&FW“Fó6&∆VC◊∂'W7ó”‡¢≈7&∂∆W26ó¶S◊≥g“Û‡¢∂'W7íÚ%VÁ6ÊFÚ‚‚‚"¢$vW&"÷FRñFVñ2'–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡†¢∂7FófRbbÄ¢∆Fób6∆74Ê÷S“&÷ñÊF÷÷7FófR#‡¢∆Fób6∆74Ê÷S“&÷ñÊF÷÷7FófR÷ÜVB#‡¢∆ñÁW@¢6∆74Ê÷S“&÷ñÊF÷◊FóF∆R÷ñÁWB ¢f«VS◊∂7FófRÁFóF∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD7FófRÇá2í”‚á≤‚‚Á2¬FóF∆S¢RÁF&vWBÁf«VR“íó–¢∆6VÜˆ∆FW#“%FV÷6VÁG&¬ ¢Û‡¢∆Fób6∆74Ê÷S“&÷ñÊF÷◊Fˆˆ∆&"#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊∂FD'&Ê6á”‡¢≈«W26ó¶S◊≥W“Û‚&÷¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊∂6˜î÷”‡¢ƒ6˜í6ó¶S◊≥W“Û‚6˜ñ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í6“"ˆ‰6∆ñ6≥◊∑6fT÷”‡¢6«f ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊≤Çí”‚6WD7FófRÜÁV∆¬ó”‡¢≈Ç6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷ñÊF÷÷'&Ê6ÜW2#‡¢∂7FófRÊ'&Ê6ÜW2Ê÷ÇÜ'&Ê6Ç¬&íí”‚Ä¢∆Fób∂Wì◊∂&ó“6∆74Ê÷S“&6&B÷ñÊF÷÷'&Ê6Ç#‡¢∆Fób6∆74Ê÷S“&÷ñÊF÷÷'&Ê6Ç÷ÜVB#‡¢∆ñÁW@¢6∆74Ê÷S“&÷ñÊF÷÷'&Ê6Ç◊FóF∆R ¢f«VS◊∂'&Ê6ÇÁFóF∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD'&Ê6ÇÜ&í¬≤FóF∆S¢RÁF&vWBÁf«VR“ó–¢&ñ÷∆&V√◊∂Êˆ÷RFÚ&÷ÚG∂&í≤÷–¢Û‡¢∆'WGFˆ‡¢6∆74Ê÷S“'6ÜVWB÷6ˆ¬÷FV¬ ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fT'&Ê6ÇÜ&íó–¢FóF∆S“$WÜ6«Vó"&÷Ú ¢‡¢≈Ç6ó¶S◊≥G“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢«V¬6∆74Ê÷S“&÷ñÊF÷÷ñFV2#‡¢∂'&Ê6ÇÊñFV2Ê÷ÇÜñFV¬ñíí”‚Ä¢∆∆í∂Wì◊∂ñó”‡¢∆ñÁW@¢f«VS◊∂ñFV–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDñFVÜ&í¬ñí¬RÁF&vWBÁf«VRó–¢&ñ÷∆&V√◊∂ñFVñG∂ñí≤“FRG∂'&Ê6ÇÁFóF∆W÷–¢∆6VÜˆ∆FW#“$Ê˜fñFVñ ¢Û‡¢∆'WGFˆ‡¢6∆74Ê÷S“&÷ñÊF÷÷ñFV◊F6≤ ¢ˆ‰6∆ñ6≥◊≤Çí”‚ñFVFıF6≤ÜñFVó–¢FóF∆S“%fó&"F&Vf ¢Fó6&∆VC◊≤ñFVÁG&ñ“Çó–¢‡¢ƒ6ÜV6¥6ó&6∆S"6ó¶S◊≥G“Û‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“'6ÜVWB÷6ˆ¬÷FV¬ ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fTñFVÜ&í¬ñíó–¢FóF∆S“%&V÷˜fW"ñFVñ ¢‡¢≈Ç6ó¶S◊≥7“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆ∆ì‡¢íó–¢¬˜V√‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“÷ñÊF÷÷FB÷ñFV"ˆ‰6∆ñ6≥◊≤Çí”‚FDñFVÜ&íó”‡¢≈«W26ó¶S◊≥G“Û‚ñFVñ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢«6∆74Ê÷S“&÷ñÊF÷÷ÜñÁB#‡¢Fñ6¢6∆óVRÊÚ)…2FRV÷ñFVñ&G&Á6f˜&‹:÷∆ÁV÷F&VfV◊≤"'–¢∆'WGFˆ‚6∆74Ê÷S“&∆ñÊ≤÷'F‚"ˆ‰6∆ñ6≥◊≤Çí”‚vÛÚ‚Ç&˜W&6Ú"ó”‡¢˜W&:|:6¢¬ˆ'WGFˆ„‡¢‡¢¬˜‡¢¬ˆFóc‡¢ó–†¢∑6fVBÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&÷ñÊF÷◊6fVB#‡¢∆É3‰÷26«f˜3¬ˆÉ3‡¢∆Fób6∆74Ê÷S“&÷ñÊF÷◊6fVB÷∆ó7B#‡¢∑6fVBÊ÷ÇÜ"í”‚Ä¢∆'Fñ6∆R∂Wì◊∂"ÊñG“6∆74Ê÷S“&6&B÷ñÊF÷◊6fVB÷óFV“#‡¢∆Fóc‡¢∆ÉCÁ∂"ÁFóF∆W”¬ˆÉC‡¢«6∆74Ê÷S“&÷ñÊF÷◊6fVB÷÷WF#‡¢≤Ü"Ê'&Ê6ÜW2«¬µ“íÊ∆VÊwFá“&÷˜2+w≤"'–¢≤Ü"Ê'&Ê6ÜW2«¬µ“íÁ&VGV6RÄ¢Ü‚¬Çí”‚‚≤áÇÊñFV2«¬µ“íÊ∆VÊwFÇ¿¢¿¢ó◊≤"'–¢ñFVñ0¢¬˜‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷ñÊF÷◊6fVB÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊≤Çí”‚˜V‰÷Ü"ó”‡¢≈VÊ6ñ¬6ó¶S◊≥W“Û‚'&ó ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU6fVBÜ"ÊñBó–¢‡¢≈G&6É"6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶gVÊ7Fñˆ‚Ê«ó6ó5&W7V«EfñWrá≤"¬“í∞¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“&Ê«ó6ó2◊&W7V«B#‡¢∑"ÊÁ7vW"bbÄ¢∆Fób6∆74Ê÷S“&Ê«ó6ó2÷&∆ˆ6≤Ê«ó6ó2÷Á7vW"#‡¢∆ÉCÂ&W7˜7F∑Ú":7VW&wVÁF"¢"'”¬ˆÉC‡¢«Á∑"ÊÁ7vW'”¬˜‡¢¬ˆFóc‡¢ó–¢∑"Á7V÷÷'íbbÄ¢∆Fób6∆74Ê÷S“&Ê«ó6ó2÷&∆ˆ6≤#‡¢∆ÉCÂ&W7V÷Û¬ˆÉC‡¢«Á∑"Á7V÷÷'ó”¬˜‡¢¬ˆFóc‡¢ó–¢∑"Ê∂WïˆñÁG3ÚÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&Ê«ó6ó2÷&∆ˆ6≤#‡¢∆ÉCÂˆÁF˜2÷6ÜfS¬ˆÉC‡¢«V√‡¢∑"Ê∂WïˆñÁG2Ê÷Çá¬íí”‚Ä¢∆∆í∂Wì◊∂ó”Á∑”¬ˆ∆ì‡¢íó–¢¬˜V√‡¢¬ˆFóc‡¢ó–¢∑"Á&ó6∑3ÚÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&Ê«ó6ó2÷&∆ˆ6≤Ê«ó6ó2◊&ó6∑2#‡¢∆ÉCÂˆÁF˜2FRFVÏ:|:6Û¬ˆÉC‡¢«V√‡¢∑"Á&ó6∑2Ê÷Çá¬íí”‚Ä¢∆∆í∂Wì◊∂ó”Á∑”¬ˆ∆ì‡¢íó–¢¬˜V√‡¢¬ˆFóc‡¢ó–¢∑"Ê7FñˆÁ3ÚÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&Ê«ó6ó2÷&∆ˆ6≤#‡¢∆ÉCÂ,;7Üñ÷2:|;VW3¬ˆÉC‡¢«V√‡¢∑"Ê7FñˆÁ2Ê÷Çá¬íí”‚Ä¢∆∆í∂Wì◊∂ó”Á∑”¬ˆ∆ì‡¢íó–¢¬˜V√‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶gVÊ7Fñˆ‚Ê«ó¶W"á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B“í∞¢6ˆÁ7B∑FWáB¬6WEFWáE““W6U7FFRÇ""ì∞¢6ˆÁ7B∑VW7Fñˆ‚¬6WEVW7FñˆÂ““W6U7FFRÇ""ì∞¢6ˆÁ7B∑6˜W&6TÊ÷R¬6WE6˜W&6TÊ÷U““W6U7FFRÇ""ì∞¢6ˆÁ7B∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑W∆ˆFñÊr¬6WEW∆ˆFñÊu““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∑&W7V«B¬6WE&W7V«E““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7BW∆ˆE&Vb“W6U&VbÜÁV∆¬ì∞†¢6ˆÁ7B6fVB“F"ÊÊ«ó6W0¢Êfñ«FW"ÇÜí”‚'W6ñÊW72«¬Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñBê¢Á6∆ñ6RÇê¢Á6˜'BÇÜ¬"í”‚Ü"Ê7&VFVDB«¬""íÊ∆ˆ6∆T6ˆ◊&RÜÊ7&VFVDB«¬""íì∞†¢6ˆÁ7Bñ◊˜'Dfñ∆R“7ñÊ2Üfñ∆Rí”‚∞¢ñbÇfñ∆R«¬W∆ˆFñÊrí&WGW&„∞¢6WEW∆ˆFñÊráG'VRì∞¢6WDW'"Ç""ì∞¢G'í∞¢6ˆÁ7BWáG&7FVB“vóBWáG&7DFˆ7V÷VÁEFWáBÜfñ∆Rì∞¢6WEFWáBÜWáG&7FVBÊ6ˆÁFVÁB«¬""ì∞¢6WE6˜W&6TÊ÷RÜfñ∆RÊÊ÷Rì∞¢ñbÜWáG&7FVBÁG'VÊ6FVBê¢6WEFˆ7BÇ$'VófÚw&ÊFS¢Ê∆ó6VíÚ6ˆ÷\:vÚFÚ6ˆÁF\;¶FÚ"ì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WEW∆ˆFñÊrÜf«6Rì∞¢ñbáW∆ˆE&VbÊ7W'&VÁBíW∆ˆE&VbÊ7W'&VÁBÁf«VR“"#∞¢–¢”∞†¢6ˆÁ7BÊ«ó¶R“7ñÊ2Çí”‚∞¢6ˆÁ7B6˜W&6R“FWáBÁG&ñ“Çì∞¢ñbá6˜W&6RÊ∆VÊwFÇ¬#«¬'W7íí∞¢ñbá6˜W&6RÊ∆VÊwFÇ¬#ê¢6WDW'"Ç$6ˆ∆R˜RVÁfñRV“FWáFÚ6ˆ“V∆Ú÷VÊ˜2#∆WG&2‚"ì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢6ˆÁ7B“VW7Fñˆ‚ÁG&ñ“Çì∞¢6ˆÁ7B&ˆ◊B“fˆ<:¢:íV“Ê∆ó7FVRG&&∆ÜT‰26ˆ“ÚFWáFÚf˜&ÊV6ñFÚ&óÜÚ‚Ï:6ÚW6R6ˆÊÜV6ñ÷VÁFÚWáFW&ÊÚRÏ:6ÚñÁfVÁFRÊF¢6RñÊf˜&÷:|:6ÚÏ:6ÚW7FófW"ÊÚFWáFÚ¬FñvVRÏ:6Ú6ˆÁ7F‡†¢G∑ÚW&wVÁFFÚW7\:&ñÛ¢G∑’∆Â∆Ê¢"'’FWáFÚ&Ê∆ó6"ÜVÁG&R2÷&62ì†£√√¿¢G∑6˜W&6RÁ6∆ñ6RÉ¬Éó–£„„‡†•&W7ˆÊF4Ù‘TÂDR6ˆ“V“ˆ&¶WFÚ•4Ù‚l:∆ñFÚ¬6V“6ˆ÷VÁL:&ñ˜2R6V“6W&62FR<;6FñvÚ¬ÊÚf˜&÷FÛ†ß≤'7V÷÷'í#¢'&W7V÷ÚV“"Bg&6W2"¬&∂WïˆñÁG2#¢≤'ˆÁFÚ"¬‚‚Â“¬'&ó6∑2#¢≤'ˆÁFÚFRFVÏ:|:6Ú˜R&ó66Ú"¬‚‚Â“¬&7FñˆÁ2#¢≤',;7Üñ÷:|:6Ú7VvW&ñF"¬‚‚Â“¬&Á7vW"#¢"G∑Ú'&W7˜7Fˆ&¶WFóf:W&wVÁF¬&6VF<;2ÊÚFWáFÚ"¢"'“'–†•W6R˜'GVw\:ß2FÚ'&6ñ¬‚6R∆wV“6◊ÚÏ:6Ú6R∆ñ6"¬W6R∆ó7Ff¶ñ˜R7G&ñÊrf¶ñ‚‹:Üñ÷ÚFRbóFVÁ2˜"∆ó7FÊ∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤&ˆ◊B¬7V6ñ∆ó7C¢$W7G&FVvó7F"“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚Çì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬Ê∆ó6"v˜&‚"ì∞¢6ˆÁ7B'6VB“'6TÊ«ó6ó2ÜFFÊ6ˆÁFVÁB«¬""ì∞¢ñbÇ'6VBê¢Fá&˜rÊWrW'&˜"Ä¢$î&W7ˆÊFWR¬÷2Ï:6Ú6ˆÁ6VwVíW7G'WGW&"Ï:∆ó6R‚FVÁFRFRÊ˜fÚ‚"¿¢ì∞¢6ˆÁ7BFóF∆R–¢6˜W&6TÊ÷R«¿¢áÚÁ6∆ñ6RÉ¬cí¢6˜W&6RÁ7∆óBÇı«2≤ÚíÁ6∆ñ6RÉ¬ríÊ¶ˆñ‚Ç""íì∞¢6ˆÁ7B&V6˜&B“∞¢ñC¢VñBÇí¿¢FóF∆R¿¢VW7Fñˆ„¢¿¢WÜ6W'C¢6˜W&6RÁ6∆ñ6RÉ¬#Éí¿¢&W7V«C¢'6VB¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢”∞¢WFFRÇá&Wbí”‚á≤‚‚Á&Wb¬Ê«ó6W3¢∑&V6˜&B¬‚‚Á&WbÊÊ«ó6W5““íì∞¢G&6µ&ˆGV7DWfVÁBÇ&Ê«ó6ó5ˆFˆÊR"¬∞¢÷ˆGV∆S¢&Ê∆ó6R"¿¢Ü5VW7Fñˆ„¢¿¢“ì∞¢6WE&W7V«Bá'6VBì∞¢6WEFˆ7BÇ$Ï:∆ó6R&ˆÁF"ì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞†¢6ˆÁ7B6∆V$∆¬“Çí”‚∞¢6WEFWáBÇ""ì∞¢6WEVW7Fñˆ‚Ç""ì∞¢6WE6˜W&6TÊ÷RÇ""ì∞¢6WE&W7V«BÜÁV∆¬ì∞¢6WDW'"Ç""ì∞¢”∞¢6ˆÁ7B&V÷˜fU6fVB“ÜñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç$WÜ6«Vó"W7FÏ:∆ó6SÚ"íí&WGW&„∞¢WFFRÇá&Wbí”‚á≤‚‚Á&Wb¬Ê«ó6W3¢&WbÊÊ«ó6W2Êfñ«FW"ÇÜí”‚ÊñB”“ñBí“íì∞¢6WEFˆ7BÇ$Ï:∆ó6RWÜ6«\:÷F"ì∞¢”∞¢6ˆÁ7B6˜ï&W7V«B“7ñÊ2á"¬í”‚∞¢6ˆÁ7B&∆ˆ6≤“Ü∆&V¬¬óFV◊2í”‡¢óFV◊3ÚÊ∆VÊwFÇÚG∂∆&V«”•∆‚G∂óFV◊2Ê÷ÇÜíí”‚“G∂ó÷íÊ¶ˆñ‚Ç%∆‚"ó÷¢"#∞¢6ˆÁ7B'G2“∞¢"Á7V÷÷'íÚ&W7V÷Û•∆‚G∑"Á7V÷÷'ó÷¢""¿¢&∆ˆ6≤Ç%ˆÁF˜2÷6ÜfR"¬"Ê∂WïˆñÁG2í¿¢&∆ˆ6≤Ç%ˆÁF˜2FRFVÏ:|:6Ú"¬"Á&ó6∑2í¿¢&∆ˆ6≤Ç%,;7Üñ÷2:|;VW2"¬"Ê7FñˆÁ2í¿¢"ÊÁ7vW"ÚG∑ÚW&wVÁF¢G∑’∆Ê¢"'’&W7˜7F•∆‚G∑"ÊÁ7vW'÷¢""¿¢“Êfñ«FW"Ñ&ˆˆ∆V‚ì∞¢G'í∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFUFWáBá'G2Ê¶ˆñ‚Ç%∆Â∆‚"íì∞¢6WEFˆ7BÇ$Ï:∆ó6R6˜ñF"ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬6˜ñ"v˜&"ì∞¢–¢”∞†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'vRÊ«ó¶W"◊vR#‡¢∆ÜVFW"6∆74Ê÷S“'vR÷ÜVB#‡¢∆Fóc‡¢∆É‰Ï:∆ó6RFRFWáF˜3¬ˆÉ‡¢«6∆74Ê÷S“'vR◊7V"#‡¢6ˆ∆RV“FWáFÚ˜RVÁfñRV“DbÙDÙ5ÇRî&W7V÷R¬FW7F6˜2ˆÁF˜0¢ñ◊˜'FÁFW2R&W7ˆÊFR7V2W&wVÁF2(	B<;26ˆ“ÚVRW7L:ÊÚFWáFÚ‡¢¬˜‡¢¬ˆFóc‡¢¬ˆÜVFW#‡†¢∆Fób6∆74Ê÷S“&6&BÊ«ó¶W"÷ñÁWB#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒfñ∆U6V&6ÇÛ‡¢«7„‡¢îG&&∆ÜVÊ26ˆ“Ú6ˆÁF\;¶FÚVRfˆ<:¢f˜&ÊV6W"‚ñFV¬&¢6ˆÁG&F˜2¬R÷÷ñ«2∆ˆÊv˜2¬VFóFó2R&˜˜7F2‚Ï:6ÚñÁfVÁFÚVP¢Ï:6ÚW7FófW"W67&óFÚ‡¢¬˜7„‡¢¬ˆFóc‡¢ƒfñV∆@¢∆&V√◊∞¢6˜W&6TÊ÷RÚFWáFÚÜFS¢G∑6˜W&6TÊ÷W“ñ¢$6ˆ∆RÚFWáFÚ&Ê∆ó6" ¢–¢‡¢«FWáF&V¢&˜w3◊≥w–¢f«VS◊∑FWáG–¢ˆ‰6ÜÊvS◊≤ÜRí”‚∞¢6WEFWáBÜRÁF&vWBÁf«VRì∞¢ñbá6˜W&6TÊ÷Rí6WE6˜W&6TÊ÷RÇ""ì∞¢◊–¢∆6VÜˆ∆FW#“$6ˆ∆RVíV“6ˆÁG&FÚ¬R÷÷ñ¬¬VFóF¬¬&˜˜7F‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$∆wV÷W&wVÁFW7V<:÷fñ6ÚÜ˜6ñˆÊ¬í#‡¢∆ñÁW@¢f«VS◊∑VW7FñˆÁ–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEVW7Fñˆ‚ÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢Vó2<:6Ú˜2&¶˜2R2◊V«F2FW7FR6ˆÁG&FÛÚ ¢Û‡¢¬ÙfñV∆C‡¢∆ñÁW@¢&Vc◊∑W∆ˆE&Vg–¢GóS“&fñ∆R ¢66WC“"ÁFb¬ÊFˆ7Ç¬ÁGáB¬Ê÷B¬Ê÷&∂F˜v‚¬Ê77b ¢ÜñFFV‡¢ˆ‰6ÜÊvS◊≤ÜRí”‚ñ◊˜'Dfñ∆RÜRÁF&vWBÊfñ∆W3ÚÂ≥“ó–¢Û‡¢∂W'"bb«6∆74Ê÷S“&f˜&“÷W'&˜"#Á∂W''”¬˜Á–¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚W∆ˆE&VbÊ7W'&VÁCÚÊ6∆ñ6≤Çó–¢Fó6&∆VC◊∑W∆ˆFñÊw–¢‡¢ƒfñ∆UFWáB6ó¶S◊≥g“Û‡¢∑W∆ˆFñÊrÚ$∆VÊFÚ'VófÚ‚‚‚"¢$VÁfñ"'VófÚ'–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊∂Ê«ó¶W“Fó6&∆VC◊∂'W7ó”‡¢≈7&∂∆W26ó¶S◊≥g“Û‡¢∂'W7íÚ$Ê∆ó6ÊFÚ‚‚‚"¢$Ê∆ó6"'–¢¬ˆ'WGFˆ„‡¢≤áFWáB«¬&W7V«BíbbÄ¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∂6∆V$∆«”‡¢∆ñ◊ ¢¬ˆ'WGFˆ„‡¢ó–¢¬ˆFóc‡¢¬ˆFóc‡†¢∑&W7V«BbbÄ¢∆Fób6∆74Ê÷S“&6&BÊ«ó6ó2÷7W'&VÁB#‡¢∆Fób6∆74Ê÷S“&Ê«ó6ó2÷7W'&VÁB÷ÜVB#‡¢∆É3Â&W7V«FFÛ¬ˆÉ3‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚6˜ï&W7V«Bá&W7V«B¬VW7Fñˆ‚ÁG&ñ“Çíó–¢‡¢ƒ6˜í6ó¶S◊≥W“Û‚6˜ñ ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢ƒÊ«ó6ó5&W7V«EfñWr#◊∑&W7V«G“◊∑VW7Fñˆ‚ÁG&ñ“Çó“Û‡¢¬ˆFóc‡¢ó–†¢∑6fVBÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&Ê«ó6ó2◊6fVB#‡¢∆É3‰Ï:∆ó6W2ÁFW&ñ˜&W3¬ˆÉ3‡¢∑6fVBÊ÷ÇÜí”‚Ä¢∆FWFñ«2∂Wì◊∂ÊñG“6∆74Ê÷S“&6&BÊ«ó6ó2◊6fVB÷óFV“#‡¢«7V÷÷'ì‡¢«7‚6∆74Ê÷S“&Ê«ó6ó2◊6fVB◊FóF∆R#Á∂ÁFóF∆W”¬˜7„‡¢«7‚6∆74Ê÷S“&Ê«ó6ó2◊6fVB÷FFR#‡¢∂ÊWrFFRÜÊ7&VFVDBíÁFÙ∆ˆ6∆TFFU7G&ñÊrÇ'B‘%""ó–¢¬˜7„‡¢¬˜7V÷÷'ì‡¢∆Fób6∆74Ê÷S“&Ê«ó6ó2◊6fVB÷&ˆGí#‡¢∂ÊWÜ6W'Bbb«6∆74Ê÷S“&Ê«ó6ó2÷WÜ6W'B#Ó(	«∂ÊWÜ6W'Gﬁ(
n(	”¬˜Á–¢ƒÊ«ó6ó5&W7V«EfñWr#◊∂Á&W7V«G“◊∂ÁVW7FñˆÁ“Û‡¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚6˜ï&W7V«BÜÁ&W7V«B¬ÁVW7Fñˆ‚ó–¢‡¢ƒ6˜í6ó¶S◊≥W“Û‚6˜ñ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU6fVBÜÊñBó–¢‡¢≈G&6É"6ó¶S◊≥W“Û‚WÜ6«Vó ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬ˆFWFñ«3‡¢íó–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶6ˆÁ7B4ÑTUEÙUÑ’ƒU2“∞¢$6ˆÁG&ˆ∆RFRW7F˜VRFRV÷∆ˆ¶FR&˜W2"¿¢$f«WÜÚFR6óÜ÷VÁ6¬FRV“‘Tí"¿¢$∆ó7FFR6∆ñVÁFW26ˆ“6ˆÁFFÚRÜó7L;7&ñ6ÚFR6ˆ◊&2"¿¢$6&L:ñÚ6ˆ“&\:vÚFRfVÊFR7W7FÚFR6FóFV“"¿¢$6ˆÁG&ˆ∆RFRÜ˜&2G&&∆ÜF2˜"&ˆ¶WFÚ"¿¢%∆ÊV¶÷VÁFÚFR÷WF2FÚG&ñ÷W7G&R"¿•”∞†¶6ˆÁ7B4Ñ%EÙ4Ùƒı%2“∞¢"33cñ"¿¢"3f3F"¿¢"6cSñS""¿¢"6F3#c#b"¿¢"3v36VB"¿¢"3Éì#""¿¢"6F##ssr"¿¢"3cV3B"¿•”∞†¶gVÊ7Fñˆ‚6ÜVWD6Ü'Bá≤6W&ñW2¬GóR“í∞¢6ˆÁ7BFF“á6W&ñW2«¬µ“íÁ6∆ñ6RÉ¬"ì∞¢ñbÜFFÊ∆VÊwFÇ””“ê¢&WGW&‚«6∆74Ê÷S“&F"÷V◊Gí÷ÜñÁB#Â6V“FF˜2&Úw,:fñ6Ú„¬˜„∞¢6ˆÁ7Bf«VW2“FFÊ÷ÇÜBí”‚BÁf«VRì∞¢6ˆÁ7B÷Ç“÷FÇÊ÷ÇÉ¬‚‚Áf«VW2Ê÷Çábí”‚÷FÇÊ'2ábííì∞†¢ñbáGóR””“'óß¶"í∞¢6ˆÁ7BF˜F¬“f«VW2Á&VGV6RÇá2¬bí”‚2≤÷FÇÊ÷ÇÉ¬bí¬ì∞¢ñbáF˜F¬√“ê¢&WGW&‚«6∆74Ê÷S“&F"÷V◊Gí÷ÜñÁB#‰6ˆ«VÊFRf∆˜&W2&V6ó6FW"Ï;¶÷W&˜2˜6óFóf˜2„¬˜„∞¢6ˆÁ7B7Ç“∞¢6ˆÁ7B7í“∞¢6ˆÁ7B"“É#∞¢6ˆÁ7Bˆ∆"“Üí”‚∂7Ç≤"¢÷FÇÊ6˜2Üí¬7í≤"¢÷FÇÁ6ñ‚Üï”∞¢6ˆÁ7B6∆ñ6W2“FFÁ&VGV6RÄ¢Ü62¬B¬íí”‚∞¢6ˆÁ7Bg&2“÷FÇÊ÷ÇÉ¬BÁf«VRíÚF˜F√∞¢ñbÜg&2√“í&WGW&‚63∞¢6ˆÁ7B7F'B“62ÊÊv∆S∞¢6ˆÁ7BVÊB“7F'B≤g&2¢÷FÇÂí¢#∞¢62ÊóFV◊2ÁW6Çá≤í¬7F'B¬VÊB“ì∞¢62ÊÊv∆R“VÊC∞¢&WGW&‚63∞¢“¿¢≤Êv∆S¢‘÷FÇÂíÚ"¬óFV◊3¢µ““¿¢íÊóFV◊3∞¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'6ÜVWB÷6Ü'B◊w&#‡¢«7frfñWt&˜É“###"6∆74Ê÷S“'6ÜVWB÷6Ü'B◊7fr"&ˆ∆S“&ñ÷r#‡¢∑6∆ñ6W2Ê÷Çá≤í¬7F'B¬VÊB“í”‚∞¢6ˆÁ7B∑É¬ì““ˆ∆"á7F'Bì∞¢6ˆÁ7B∑É"¬ì%““ˆ∆"ÜVÊBì∞¢6ˆÁ7B∆&vR“VÊB“7F'B‚÷FÇÂíÚ¢∞¢&WGW&‚Ä¢«FÄ¢∂Wì◊∂ó–¢C◊∂“G∂7á“G∂7ó“¬G∑ÉÁFÙfóÜVBÉó“G∑ìÁFÙfóÜVBÉó“G∑'“G∑'“G∂∆&vW“G∑É"ÁFÙfóÜVBÉó“G∑ì"ÁFÙfóÜVBÉó“¶–¢fñ∆√◊¥4Ñ%EÙ4Ùƒı%5∂íR4Ñ%EÙ4Ùƒı%2Ê∆VÊwFÖ◊–¢Û‡¢ì∞¢“ó–¢¬˜7fs‡¢«V¬6∆74Ê÷S“'6ÜVWB÷6Ü'B÷∆VvVÊB#‡¢∂FFÊ÷ÇÜB¬íí”‚Ä¢∆∆í∂Wì◊∂ó”‡¢«7‡¢6∆74Ê÷S“'6ÜVWB÷6Ü'B◊7vF6Ç ¢7Gñ∆S◊∑≤&6∂w&˜VÊC¢4Ñ%EÙ4Ùƒı%5∂íR4Ñ%EÙ4Ùƒı%2Ê∆VÊwFÖ“◊–¢Û‡¢∂BÊ∆&V«“+rµ7G&ñÊrÜBÁf«VRíÁ&W∆6RÇ"‚"¬"¬"ó–¢¬ˆ∆ì‡¢íó–¢¬˜V√‡¢¬ˆFóc‡¢ì∞¢–†¢ÚÚ&'&2R∆ñÊÜ6ˆ◊'Fñ∆Ü“VóÜ¢6ˆÁ7Br“3#∞¢6ˆÁ7BÇ“É∞¢6ˆÁ7BB“#C∞¢6ˆÁ7B∆˜Er“r“B¢#∞¢6ˆÁ7B∆˜DÇ“Ç“B¢#∞¢6ˆÁ7B7FW“∆˜ErÚFFÊ∆VÊwFÉ∞¢&WGW&‚Ä¢«7frfñWt&˜É◊∂Gµw“G¥á÷“6∆74Ê÷S“'6ÜVWB÷6Ü'B◊7frvñFR"&ˆ∆S“&ñ÷r#‡¢∆∆ñÊRÉ◊∑G“ì◊¥Ç“G“É#◊µr“G“ì#◊¥Ç“G“7G&ˆ∂S“"66&CVS"Û‡¢∑GóR””“&∆ñÊÜ"ÚÄ¢√‡¢«ˆ«ñ∆ñÊP¢fñ∆√“&ÊˆÊR ¢7G&ˆ∂S“"33cñ ¢7G&ˆ∂UvñGFÉ“#" ¢ˆñÁG3◊∂FF¢Ê÷ÇÜB¬íí”‚∞¢6ˆÁ7BÇ“B≤7FW¢í≤7FWÚ#∞¢6ˆÁ7Bí“Ç“B“Ñ÷FÇÊ÷ÇÉ¬BÁf«VRíÚ÷Çí¢∆˜DÉ∞¢&WGW&‚G∑ÇÁFÙfóÜVBÉó“¬G∑íÁFÙfóÜVBÉó÷∞¢“ê¢Ê¶ˆñ‚Ç""ó–¢Û‡¢∂FFÊ÷ÇÜB¬íí”‚∞¢6ˆÁ7BÇ“B≤7FW¢í≤7FWÚ#∞¢6ˆÁ7Bí“Ç“B“Ñ÷FÇÊ÷ÇÉ¬BÁf«VRíÚ÷Çí¢∆˜DÉ∞¢&WGW&‚∆6ó&6∆R∂Wì◊∂ó“7É◊∑á“7ì◊∑ó“#“#2"fñ∆√“"33cñ"Û„∞¢“ó–¢¬Û‡¢í¢Ä¢FFÊ÷ÇÜB¬íí”‚∞¢6ˆÁ7B&Ç“Ñ÷FÇÊ÷ÇÉ¬BÁf«VRíÚ÷Çí¢∆˜DÉ∞¢6ˆÁ7BÇ“B≤7FW¢í≤7FW¢„S∞¢6ˆÁ7B'r“7FW¢„s∞¢&WGW&‚Ä¢«&V7@¢∂Wì◊∂ó–¢É◊∑á–¢ì◊¥Ç“B“&á–¢vñGFÉ◊∂'w–¢ÜVñváC◊∂&á–¢fñ∆√◊¥4Ñ%EÙ4Ùƒı%5∂íR4Ñ%EÙ4Ùƒı%2Ê∆VÊwFÖ◊–¢'É“#" ¢Û‡¢ì∞¢“ê¢ó–¢∂FFÊ÷ÇÜB¬íí”‚Ä¢«FWá@¢∂Wì◊∂ó–¢É◊∑B≤7FW¢í≤7FWÚ'–¢ì◊¥Ç“B≤'–¢FWáDÊ6Ü˜#“&÷ñFF∆R ¢6∆74Ê÷S“'6ÜVWB÷6Ü'B÷∆&V¬ ¢‡¢∂BÊ∆&V¬Ê∆VÊwFÇ‚ÇÚG∂BÊ∆&V¬Á6∆ñ6RÉ¬róﬁ(
f¢BÊ∆&V«–¢¬˜FWáC‡¢íó–¢¬˜7fs‡¢ì∞ß–†¶gVÊ7Fñˆ‚6ÜVWD'Vñ∆FW"á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B“í∞¢6ˆÁ7B∂FW62¬6WDFW65““W6U7FFRÇ""ì∞¢6ˆÁ7B∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∂7FófR¬6WD7FófU““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B∂6Ü'D˜V‚¬6WD6Ü'D˜VÂ““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂6Ü'EGóR¬6WD6Ü'EGóU““W6U7FFRÇ&&'&2"ì∞¢6ˆÁ7B∂∆&Vƒ6ˆ¬¬6WD∆&Vƒ6ˆ≈““W6U7FFRÉì∞¢6ˆÁ7B∑f«VT6ˆ¬¬6WEf«VT6ˆ≈““W6U7FFRÉì∞†¢6ˆÁ7B6fVB“F"Á6ÜVWG0¢Êfñ«FW"Çá2í”‚'W6ñÊW72«¬2Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñBê¢Á6∆ñ6RÇê¢Á6˜'BÇÜ¬"í”‚Ü"ÁWFFVDB«¬""íÊ∆ˆ6∆T6ˆ◊&RÜÁWFFVDB«¬""íì∞†¢6ˆÁ7BvVÊW&FR“7ñÊ2Çí”‚∞¢6ˆÁ7BB“FW62ÁG&ñ“Çì∞¢ñbÜBÊ∆VÊwFÇ¬B«¬'W7íí∞¢ñbÜBÊ∆VÊwFÇ¬Bí6WDW'"Ç$FW67&Wf∆Êñ∆ÜV“V∆Ú÷VÊ˜2B∆WG&2‚"ì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢6ˆÁ7B&ˆ◊B“fˆ<:¢÷ˆÁF∆Êñ∆Ü2&WVVÊ˜2ÊV|;66ñ˜2ÊÚ'&6ñ¬‚7&ñRW7G'WGW&FRV÷∆Êñ∆Ü&ÚVFñFÚ&óÜÚ‡†•VFñFÛ¢G∂G–†•&W7ˆÊF4Ù‘TÂDR6ˆ“V“ˆ&¶WFÚ•4Ù‚l:∆ñFÚ¬6V“6ˆ÷VÁL:&ñ˜2R6V“6W&62FR<;6FñvÚ¬ÊÚf˜&÷FÛ†ß≤'FóF∆R#¢$Êˆ÷RF∆Êñ∆Ü"¬&6ˆ«V÷Á2#¢≤$6ˆ«VÊ"¬$6ˆ«VÊ""¬‚‚Â“¬'&˜w2#¢µ≤'f∆˜""¬'f∆˜""¬‚‚Â“¬‚‚Â◊–†•&Vw&3†¢“W6RFR2Ç6ˆ«VÊ2;ßFVó2R&V“Êˆ÷VF2¬Ê˜&FV“V“VRf¶V“6VÁFñFÚ‡¢“ñÊ6«VFR2b∆ñÊÜ2FRUÑT’ƒÚ∆W<:◊fVó2&W76ˆVÁFVÊFW"RFWˆó27V'7FóGVó"V∆˜2FF˜2&Vó2‡¢“f∆˜&W2÷ˆÊWL:&ñ˜2ÊÚf˜&÷FÚ'&6ñ∆Vó&ÚÜWÇ„¢%"B„#√"í‚FF26ˆ÷Ú‘‘“‘DB‡¢“Ï:6ÚñÁfVÁFRFF˜2&Vó2FR6∆ñVÁFW2¬&\:v˜2FR÷W&6FÚ˜R&W7V«FF˜3≤˜2WÜV◊∆˜2<:6ÚVÊ2ñ«W7G&Fóf˜2Ê∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤&ˆ◊B¬7V6ñ∆ó7C¢$W7G&FVvó7F"“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚Çì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬vW&"v˜&‚"ì∞¢6ˆÁ7B6ÜVWB“'6U6ÜVWBÜFFÊ6ˆÁFVÁB«¬""ì∞¢ñbÇ6ÜVWBÊ6ˆ«V÷Á2Ê∆VÊwFÇê¢Fá&˜rÊWrW'&˜"Ä¢$î&W7ˆÊFWR¬÷2Ï:6Ú6ˆÁ6VwVí÷ˆÁF"∆Êñ∆Ü‚FVÁFRFRÊ˜fÚ‚"¿¢ì∞¢6WD7FófRá∞¢ñC¢ÁV∆¬¿¢FóF∆S¢6ÜVWBÁFóF∆R«¬BÁ6∆ñ6RÉ¬cí¿¢6ˆ«V÷Á3¢6ÜVWBÊ6ˆ«V÷Á2¿¢&˜w3¢6ÜVWBÁ&˜w2¿¢“ì∞¢6WD6Ü'D˜V‚ÑDTdT≈EÙ4Ñ%EÙ4Ù‰dîrÊVÊ&∆VBì∞¢6WD6Ü'EGóRÑDTdT≈EÙ4Ñ%EÙ4Ù‰dîrÁGóRì∞¢6WD∆&Vƒ6ˆ¬ÑDTdT≈EÙ4Ñ%EÙ4Ù‰dîrÊ∆&Vƒ6ˆ¬ì∞¢6WEf«VT6ˆ¬Ä¢÷FÇÊ÷ñ‚Ä¢÷FÇÊ÷ÇÉ¬6ÜVWBÊ6ˆ«V÷Á2Ê∆VÊwFÇ“í¿¢DTdT≈EÙ4Ñ%EÙ4Ù‰dîrÁf«VT6ˆ¬¿¢í¿¢ì∞¢G&6µ&ˆGV7DWfVÁBÇ'6ÜVWEˆvVÊW&FVB"¬∞¢÷ˆGV∆S¢'∆Êñ∆Ü2"¿¢6ˆ«V÷Á3¢6ÜVWBÊ6ˆ«V÷Á2Ê∆VÊwFÇ¿¢&˜w3¢6ÜVWBÁ&˜w2Ê∆VÊwFÇ¿¢“ì∞¢6WDFW62Ç""ì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞†¢6ˆÁ7BVFóD6V∆¬“á"¬2¬f«VRí”‡¢6WD7FófRÇá2í”‚á∞¢‚‚Á2¿¢&˜w3¢2Á&˜w2Ê÷Çá&˜r¬&íí”‡¢&í””“"Ú&˜rÊ÷ÇÜ6V∆¬¬6íí”‚Ü6í””“2Úf«VR¢6V∆¬íí¢&˜r¿¢í¿¢“íì∞¢6ˆÁ7BVFóDÜVFW"“Ü2¬f«VRí”‡¢6WD7FófRÇá2í”‚á∞¢‚‚Á2¿¢6ˆ«V÷Á3¢2Ê6ˆ«V÷Á2Ê÷ÇÜ6ˆ¬¬6íí”‚Ü6í””“2Úf«VR¢6ˆ¬íí¿¢“íì∞¢6ˆÁ7BFE&˜r“Çí”‡¢6WD7FófRÇá2í”‚á≤‚‚Á2¬&˜w3¢≤‚‚Á2Á&˜w2¬2Ê6ˆ«V÷Á2Ê÷ÇÇí”‚""ï““íì∞¢6ˆÁ7B&V÷˜fU&˜r“á"í”‡¢6WD7FófRÇá2í”‚á≤‚‚Á2¬&˜w3¢2Á&˜w2Êfñ«FW"ÇÖÚ¬&íí”‚&í”“"í“íì∞¢6ˆÁ7BFD6ˆ«V÷‚“Çí”‡¢6WD7FófRÇá2í”‚á∞¢‚‚Á2¿¢6ˆ«V÷Á3¢≤‚‚Á2Ê6ˆ«V÷Á2¬6ˆ«VÊG∑2Ê6ˆ«V÷Á2Ê∆VÊwFÇ≤÷“¿¢&˜w3¢2Á&˜w2Ê÷Çá&˜rí”‚≤‚‚Á&˜r¬"%“í¿¢“íì∞¢6ˆÁ7B&V÷˜fT6ˆ«V÷‚“Ü2í”‡¢6WD7FófRÇá2í”‚á∞¢‚‚Á2¿¢6ˆ«V÷Á3¢2Ê6ˆ«V÷Á2Êfñ«FW"ÇÖÚ¬6íí”‚6í”“2í¿¢&˜w3¢2Á&˜w2Ê÷Çá&˜rí”‚&˜rÊfñ«FW"ÇÖÚ¬6íí”‚6í”“2íí¿¢“íì∞†¢6ˆÁ7BF˜vÊ∆ˆD77b“Çí”‚∞¢ñbÇ7FófRí&WGW&„∞¢6ˆÁ7B77b“'Vñ∆D77bÜ7FófRÊ6ˆ«V÷Á2¬7FófRÁ&˜w2ì∞¢6ˆÁ7B&∆ˆ"“ÊWr&∆ˆ"Ö≤.˚ªÚ"≤77e“¬∞¢GóS¢'FWáBˆ77c∂6Ü'6WC◊WFb”Ç"¿¢“ì∞¢6ˆÁ7B“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢Êá&Vb“U$¬Ê7&VFTˆ&¶V7EU$¬Ü&∆ˆ"ì∞¢ÊF˜vÊ∆ˆB“G∑6«VvñgíÜ7FófRÁFóF∆R«¬'∆Êñ∆Ü"ó“Ê77f∞¢Ê6∆ñ6≤Çì∞¢U$¬Á&Wfˆ∂Tˆ&¶V7EU$¬ÜÊá&Vbì∞¢G&6µ&ˆGV7DWfVÁBÇ'6ÜVWEˆWá˜'FVB"¬≤÷ˆGV∆S¢'∆Êñ∆Ü2"¬f˜&÷C¢&77b"“ì∞¢”∞¢6ˆÁ7B6˜ïF&∆R“7ñÊ2Çí”‚∞¢ñbÇ7FófRí&WGW&„∞¢6ˆÁ7B6∆V‚“ábí”‚7G&ñÊráb”“ÁV∆¬Ú""¢bíÁ&W∆6RÇıµ«E«%∆Â“≤ˆr¬""ì∞¢6ˆÁ7BG7b“∞¢7FófRÊ6ˆ«V÷Á2Ê÷Ü6∆V‚íÊ¶ˆñ‚Ç%«B"í¿¢‚‚Ê7FófRÁ&˜w2Ê÷Çá&˜rí”‚7FófRÊ6ˆ«V÷Á2Ê÷ÇÖÚ¬íí”‚6∆V‚á&˜u∂ï“ííÊ¶ˆñ‚Ç%«B"íí¿¢“Ê¶ˆñ‚Ç%∆‚"ì∞¢G'í∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFUFWáBáG7bì∞¢6WEFˆ7BÇ$6˜ñFÚ(	B6ˆ∆RÊÚWÜ6V¬˜Rvˆˆv∆R∆Êñ∆Ü2"ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬6˜ñ"v˜&"ì∞¢–¢”∞¢6ˆÁ7B6fU6ÜVWB“Çí”‚∞¢ñbÇ7FófRí&WGW&„∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢6ˆÁ7BñB“7FófRÊñB«¬VñBÇì∞¢6ˆÁ7B&V6˜&B“∞¢ñB¿¢FóF∆S¢7FófRÁFóF∆R«¬%∆Êñ∆Ü"¿¢6ˆ«V÷Á3¢7FófRÊ6ˆ«V÷Á2¿¢&˜w3¢7FófRÁ&˜w2¿¢6Ü'C¢Ê˜&÷∆ó¶T6Ü'D6ˆÊfñrÄ¢∞¢VÊ&∆VC¢6Ü'D˜V‚¿¢GóS¢6Ü'EGóR¿¢∆&Vƒ6ˆ¬¿¢f«VT6ˆ¬¿¢“¿¢7FófRÊ6ˆ«V÷Á2Ê∆VÊwFÇ¿¢í¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢7FófRÊ˜vÊW$ñB«¬F"ÁW6W"ÊñB¿¢7&VFVDC¢7FófRÊ7&VFVDB«¬Ê˜r¿¢WFFVDC¢Ê˜r¿¢”∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢6ÜVWG3¢&WbÁ6ÜVWG2Á6ˆ÷RÇá2í”‚2ÊñB””“ñBê¢Ú&WbÁ6ÜVWG2Ê÷Çá2í”‚á2ÊñB””“ñBÚ&V6˜&B¢2íê¢¢∑&V6˜&B¬‚‚Á&WbÁ6ÜVWG5“¿¢“íì∞¢6WD7FófRÇá2í”‚á≤‚‚Á2¬ñB¬7&VFVDC¢&V6˜&BÊ7&VFVDB¬˜vÊW$ñC¢&V6˜&BÊ˜vÊW$ñB“íì∞¢6WEFˆ7BÇ%∆Êñ∆Ü6«f"ì∞¢”∞¢6ˆÁ7B˜VÂ6ÜVWB“á2í”‚∞¢6ˆÁ7B6Ü'B“Ê˜&÷∆ó¶T6Ü'D6ˆÊfñrá2Ê6Ü'B¬á2Ê6ˆ«V÷Á2«¬µ“íÊ∆VÊwFÇì∞¢6WD6Ü'D˜V‚Ü6Ü'BÊVÊ&∆VBì∞¢6WD6Ü'EGóRÜ6Ü'BÁGóRì∞¢6WD∆&Vƒ6ˆ¬Ü6Ü'BÊ∆&Vƒ6ˆ¬ì∞¢6WEf«VT6ˆ¬Ü6Ü'BÁf«VT6ˆ¬ì∞¢6WD7FófRá∞¢ñC¢2ÊñB¿¢FóF∆S¢2ÁFóF∆R¿¢6ˆ«V÷Á3¢2Ê6ˆ«V÷Á2«¬µ“¿¢&˜w3¢2Á&˜w2«¬µ“¿¢7&VFVDC¢2Ê7&VFVDB¿¢˜vÊW$ñC¢2Ê˜vÊW$ñB¿¢“ì∞¢”∞¢6ˆÁ7B&V÷˜fU6ÜVWB“ÜñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç$WÜ6«Vó"W7F∆Êñ∆ÜÚ"íí&WGW&„∞¢WFFRÇá&Wbí”‚á≤‚‚Á&Wb¬6ÜVWG3¢&WbÁ6ÜVWG2Êfñ«FW"Çá2í”‚2ÊñB”“ñBí“íì∞¢ñbÜ7FófSÚÊñB””“ñBí6WD7FófRÜÁV∆¬ì∞¢6WEFˆ7BÇ%∆Êñ∆ÜWÜ6«\:÷F"ì∞¢”∞†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'vR6ÜVWB÷'Vñ∆FW"◊vR#‡¢∆ÜVFW"6∆74Ê÷S“'vR÷ÜVB#‡¢∆Fóc‡¢∆ÉÂ∆Êñ∆Ü3¬ˆÉ‡¢«6∆74Ê÷S“'vR◊7V"#‡¢FW67&WfÚVR&V6ó6Rî÷ˆÁF∆Êñ∆Ü&ˆÁF‚VFóFRR&óÜP¢V“55bÜ'&RÊÚWÜ6V¬RÊÚvˆˆv∆R∆Êñ∆Ü2í‚GVFÚw&GVóFÚ‡¢¬˜‡¢¬ˆFóc‡¢¬ˆÜVFW#‡†¢∆Fób6∆74Ê÷S“&6&B6ÜVWB÷vVÊW&F˜"#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢≈F&∆RÛ‡¢«7„‡¢˜2f∆˜&W2vW&F˜2<:6ÚWÜV◊∆˜2&fˆ<:¢VÁFVÊFW"W7G'WGW&P¢FWˆó27V'7FóGVó"V∆˜26WW2FF˜2&Vó2‡¢¬˜7„‡¢¬ˆFóc‡¢ƒfñV∆B∆&V√“%VR∆Êñ∆Üfˆ<:¢&V6ó6Ú#‡¢«FWáF&V¢&˜w3◊≥'–¢f«VS◊∂FW67–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDFW62ÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢6ˆÁG&ˆ∆RFRW7F˜VR6ˆ“&ˆGWFÚ¬VÁFñFFR¬7W7FÚR&\:vÚFRfVÊF ¢Û‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“'6ÜVWB÷WÜ◊∆W2#‡¢µ4ÑTUEÙUÑ’ƒU2Ê÷ÇÜWÇí”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂Wá–¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&6Üó÷'F‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WDFW62ÜWÇó–¢‡¢∂Wá–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢∂W'"bb«6∆74Ê÷S“&f˜&“÷W'&˜"#Á∂W''”¬˜Á–¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊∂vVÊW&FW“Fó6&∆VC◊∂'W7ó”‡¢≈7&∂∆W26ó¶S◊≥g“Û‡¢∂'W7íÚ$÷ˆÁFÊFÚ∆Êñ∆Ü‚‚‚"¢$vW&"∆Êñ∆Ü'–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡†¢∂7FófRbbÄ¢∆Fób6∆74Ê÷S“&6&B6ÜVWB◊v˜&∑76R#‡¢∆Fób6∆74Ê÷S“'6ÜVWB◊v˜&∑76R÷ÜVB#‡¢∆ñÁW@¢6∆74Ê÷S“'6ÜVWB◊FóF∆R÷ñÁWB ¢f«VS◊∂7FófRÁFóF∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD7FófRÇá2í”‚á≤‚‚Á2¬FóF∆S¢RÁF&vWBÁf«VR“íó–¢∆6VÜˆ∆FW#“$Êˆ÷RF∆Êñ∆Ü ¢Û‡¢∆Fób6∆74Ê÷S“'6ÜVWB◊Fˆˆ∆&"#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊∂FE&˜w”‡¢≈«W26ó¶S◊≥W“Û‚∆ñÊÜ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊∂FD6ˆ«V÷Á”‡¢≈«W26ó¶S◊≥W“Û‚6ˆ«VÊ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊∂6˜ïF&∆W”‡¢ƒ6˜í6ó¶S◊≥W“Û‚6˜ñ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊∂F˜vÊ∆ˆD77g”‡¢ƒF˜vÊ∆ˆB6ó¶S◊≥W“Û‚55`¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂'F‚vÜ˜7B6“G∂6Ü'D˜V‚Ú&7FófR"¢"'÷–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD6Ü'D˜V‚Çábí”‚bó–¢‡¢ƒ&$6Ü'C26ó¶S◊≥W“Û‚w,:fñ6¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í6“"ˆ‰6∆ñ6≥◊∑6fU6ÜVWG”‡¢6«f ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊≤Çí”‚6WD7FófRÜÁV∆¬ó”‡¢≈Ç6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6ÜVWB◊67&ˆ∆¬#‡¢«F&∆R6∆74Ê÷S“'6ÜVWB◊F&∆R#‡¢«FÜVC‡¢«G#‡¢«FÇ6∆74Ê÷S“'6ÜVWB◊&˜vÁV“"&ñ÷ÜñFFV„“'G'VR#„¬˜FÉ‡¢∂7FófRÊ6ˆ«V÷Á2Ê÷ÇÜ6ˆ¬¬2í”‚Ä¢«FÇ∂Wì◊∂7”‡¢∆Fób6∆74Ê÷S“'6ÜVWB÷ÜVFW"÷6V∆¬#‡¢∆ñÁW@¢f«VS◊∂6ˆ«–¢ˆ‰6ÜÊvS◊≤ÜRí”‚VFóDÜVFW"Ü2¬RÁF&vWBÁf«VRó–¢&ñ÷∆&V√◊∂Êˆ÷RF6ˆ«VÊG∂2≤÷–¢Û‡¢∆'WGFˆ‡¢6∆74Ê÷S“'6ÜVWB÷6ˆ¬÷FV¬ ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fT6ˆ«V÷‚Ü2ó–¢FóF∆S“$WÜ6«Vó"6ˆ«VÊ ¢Fó6&∆VC◊∂7FófRÊ6ˆ«V÷Á2Ê∆VÊwFÇ√“–¢‡¢≈Ç6ó¶S◊≥7“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬˜FÉ‡¢íó–¢¬˜G#‡¢¬˜FÜVC‡¢«F&ˆGì‡¢∂7FófRÁ&˜w2Ê÷Çá&˜r¬"í”‚Ä¢«G"∂Wì◊∑'”‡¢«FB6∆74Ê÷S“'6ÜVWB◊&˜vÁV“#‡¢∆'WGFˆ‡¢6∆74Ê÷S“'6ÜVWB◊&˜r÷FV¬ ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU&˜rá"ó–¢FóF∆S“$WÜ6«Vó"∆ñÊÜ ¢‡¢≈Ç6ó¶S◊≥7“Û‡¢¬ˆ'WGFˆ„‡¢¬˜FC‡¢∂7FófRÊ6ˆ«V÷Á2Ê÷ÇÖÚ¬2í”‚Ä¢«FB∂Wì◊∂7”‡¢∆ñÁW@¢f«VS◊∑&˜u∂5“ÛÚ"'–¢ˆ‰6ÜÊvS◊≤ÜRí”‚VFóD6V∆¬á"¬2¬RÁF&vWBÁf«VRó–¢&ñ÷∆&V√◊∂∆ñÊÜG∑"≤“¬G∂7FófRÊ6ˆ«V÷Á5∂5◊÷–¢Û‡¢¬˜FC‡¢íó–¢¬˜G#‡¢íó–¢¬˜F&ˆGì‡¢¬˜F&∆S‡¢¬ˆFóc‡¢∂7FófRÁ&˜w2Ê∆VÊwFÇ””“bbÄ¢«6∆74Ê÷S“'6ÜVWB÷V◊Gí÷ÜñÁB#‡¢6V“∆ñÊÜ2ñÊF‚W6R(	¬≤∆ñÊÜ(	“&6ˆ÷\:v"‡¢¬˜‡¢ó–¢∂6Ü'D˜V‚bbÄ¢∆Fób6∆74Ê÷S“'6ÜVWB÷6Ü'B6&B#‡¢∆Fób6∆74Ê÷S“'6ÜVWB÷6Ü'B÷6ˆÁG&ˆ«2#‡¢∆∆&V√‡¢6FVv˜&ñ3ß≤"'–¢«6V∆V7@¢f«VS◊∂∆&Vƒ6ˆ«–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD∆&Vƒ6ˆ¬ÑÁV÷&W"ÜRÁF&vWBÁf«VRíó–¢‡¢∂7FófRÊ6ˆ«V÷Á2Ê÷ÇÜ2¬íí”‚Ä¢∆˜Fñˆ‚∂Wì◊∂ó“f«VS◊∂ó”‡¢∂2«¬6ˆ«VÊG∂í≤÷–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ˆ∆&V√‡¢∆∆&V√‡¢f∆˜&W3ß≤"'–¢«6V∆V7@¢f«VS◊∑f«VT6ˆ«–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEf«VT6ˆ¬ÑÁV÷&W"ÜRÁF&vWBÁf«VRíó–¢‡¢∂7FófRÊ6ˆ«V÷Á2Ê÷ÇÜ2¬íí”‚Ä¢∆˜Fñˆ‚∂Wì◊∂ó“f«VS◊∂ó”‡¢∂2«¬6ˆ«VÊG∂í≤÷–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ˆ∆&V√‡¢∆Fób6∆74Ê÷S“'6ÜVWB÷6Ü'B◊GóW2#‡¢µ∞¢≤&&'&2"¬$&'&2%“¿¢≤&∆ñÊÜ"¬$∆ñÊÜ%“¿¢≤'óß¶"¬%óß¶%“¿¢“Ê÷ÇÖ∑B¬∆&V≈“í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∑G–¢6∆74Ê÷S◊∂F"◊fñWr÷'F‚G∂6Ü'EGóR””“BÚ&7FófR"¢"'÷–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD6Ü'EGóRáBó–¢‡¢∂∆&V«–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢≈6ÜVWD6Ü'@¢6W&ñW3◊∑6ÜVWD6Ü'E6W&ñW2Ü7FófRÊ6ˆ«V÷Á2¬7FófRÁ&˜w2¬∆&Vƒ6ˆ¬¬f«VT6ˆ¬ó–¢GóS◊∂6Ü'EGóW–¢Û‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ó–†¢∑6fVBÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“'6ÜVWB◊6fVB#‡¢∆É3Â∆Êñ∆Ü26«f3¬ˆÉ3‡¢∆Fób6∆74Ê÷S“'6ÜVWB◊6fVB÷∆ó7B#‡¢∑6fVBÊ÷Çá2í”‚Ä¢∆'Fñ6∆R∂Wì◊∑2ÊñG“6∆74Ê÷S“&6&B6ÜVWB◊6fVB÷óFV“#‡¢∆Fóc‡¢∆ÉCÁ∑2ÁFóF∆W”¬ˆÉC‡¢«6∆74Ê÷S“'6ÜVWB◊6fVB÷÷WF#‡¢≤á2Ê6ˆ«V÷Á2«¬µ“íÊ∆VÊwFá“6ˆ«VÊ2+r≤á2Á&˜w2«¬µ“íÊ∆VÊwFá“∆ñÊÜ0¢∑2Ê6Ü'CÚÊVÊ&∆VBÚ"+rw,:fñ6Ú6«fÚ"¢"'–¢¬˜‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6ÜVWB◊6fVB÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊≤Çí”‚˜VÂ6ÜVWBá2ó”‡¢≈VÊ6ñ¬6ó¶S◊≥W“Û‚'&ó ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU6ÜVWBá2ÊñBó–¢‡¢≈G&6É"6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶6ˆÁ7B4ÙÂDTÂEÙ4Ñ‰‰T≈2“∞¢$ñÁ7Fw&“"¿¢$f6V&ˆˆ≤"¿¢%vÜG47FGW2"¿¢%FñµFˆ≤"¿¢$∆ñÊ∂VDñ‚"¿¢$vˆˆv∆R÷WRÊV|;66ñÚ"¿•”∞¶6ˆÁ7B4ÙÂDTÂEÙtÙ≈2“∞¢$G&ó"Ê˜f˜26∆ñVÁFW2"¿¢$VÊv¶"6VwVñF˜&W2"¿¢$FógV∆v"V÷&ˆ÷¸:|:6Ú"¿¢$÷˜7G&"˜2&7FñF˜&W2"¿¢$VGV6"6ˆ'&RÚ6W'fú:vÚ"¿¢$FWˆñ÷VÁF˜2R&˜f6ˆ6ñ¬"¿•”∞¶6ˆÁ7B4ÙÂDTÂEı5DEU2“∞¢ñFVñ¢≤∆&V√¢$ñFVñ"¬ÊWáC¢'&ˆÁFÚ"“¿¢&ˆÁFÛ¢≤∆&V√¢%&ˆÁFÚ"¬ÊWáC¢'V&∆ñ6FÚ"“¿¢V&∆ñ6FÛ¢≤∆&V√¢%V&∆ñ6FÚ"¬ÊWáC¢&ñFVñ"“¿ß”∞¶6ˆÁ7B6ˆÁFVÁDFFT∆&V¬“áñ÷Bí”‡¢ñ÷@¢ÚÊWrFFRÜG∑ñ÷G’C#££íÁFÙ∆ˆ6∆TFFU7G&ñÊrÇ'B‘%""¬∞¢vVV∂Fì¢'6Ü˜'B"¿¢Fì¢#"÷FñvóB"¿¢÷ˆÁFÉ¢'6Ü˜'B"¿¢“ê¢¢%6V“FF#∞†¶gVÊ7Fñˆ‚6ˆÁFVÁE∆ÊÊW"á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B“í∞¢6ˆÁ7B∑FV÷¬6WEFV÷““W6U7FFRÇ""ì∞¢6ˆÁ7B∂6Ê¬¬6WD6Ê≈““W6U7FFRÑ4ÙÂDTÂEÙ4Ñ‰‰T≈5≥“ì∞¢6ˆÁ7B∂ˆ&¶WFófÚ¬6WDˆ&¶WFófı““W6U7FFRÑ4ÙÂDTÂEÙtÙ≈5≥“ì∞¢6ˆÁ7B∑FB¬6WEFE““W6U7FFRÉbì∞¢6ˆÁ7B∂ñÊñ6ñÚ¬6WDñÊñ6ñı““W6U7FFRáFˆFíÇíì∞¢6ˆÁ7B∂6FVÊ6ñ¬6WD6FVÊ6ñ““W6U7FFRÉ"ì∞¢6ˆÁ7B∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∂VFóFñÊr¬6WDVFóFñÊu““W6U7FFRÜÁV∆¬ì∞†¢6ˆÁ7B˜7G2“F"Ê6ˆÁFVÁE∆‡¢Êfñ«FW"Çáí”‚'W6ñÊW72«¬Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñBê¢Á6∆ñ6RÇê¢Á6˜'BÇÜ¬"í”‚ÜÊFFR«¬""íÊ∆ˆ6∆T6ˆ◊&RÜ"ÊFFR«¬""íì∞†¢6ˆÁ7BvVÊW&FR“7ñÊ2Çí”‚∞¢6ˆÁ7BFÜV÷R“FV÷ÁG&ñ“Çì∞¢ñbáFÜV÷RÊ∆VÊwFÇ¬2«¬'W7íí∞¢ñbáFÜV÷RÊ∆VÊwFÇ¬2í6WDW'"Ç$FW67&WfÚFV÷V“V∆Ú÷VÊ˜22∆WG&2‚"ì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢6ˆÁ7B‚“÷FÇÊ÷ÇÉ2¬÷FÇÊ÷ñ‚ÉR¬ÁV÷&W"áFBí«¬bíì∞¢6ˆÁ7B&ˆ◊B“fˆ<:¢:íV“W7G&FVvó7FFR6ˆÁF\;¶FÚ&&VFW26ˆ6ñó2FRWVVÊ˜2ÊV|;66ñ˜2ÊÚ'&6ñ¬‚7&ñRV“6∆VÊL:&ñÚVFóF˜&ñ¬6ˆ“G∂Á“˜7G2V“˜'GVw\:ß2FÚ'&6ñ¬‡†§ÊV|;66ñÚ˜FV÷¢G∑FÜV÷W–§6Ê¬&ñÊ6ó√¢G∂6Ê«–§ˆ&¶WFófÛ¢G∂ˆ&¶WFóf˜–†•&W7ˆÊF4Ù‘TÂDR6ˆ“V“'&í•4Ù‚l:∆ñFÚ¬6V“6ˆ÷VÁL:&ñ˜2R6V“6W&62FR<;6FñvÚ‚6FóFV“FWfRFW#†¢“&6ÜÊÊV¬#¢&VFR6ˆ6ñ¬7VvW&ñF&W76R˜7@¢“&f˜&÷B#¢Úf˜&÷FÚÜWÇ„¢˜7B¬&VV«2¬6'&˜76V¬¬7F˜'í¬l:÷FVÚ7W'FÚê¢“&Üˆˆ≤#¢V÷6Ü÷FˆñFVñ7W'FRG&FófÜ‹:Ç‚∆g&2ê¢“&6Fñˆ‚#¢V÷∆VvVÊF&ˆÁF&V&∆ñ6"¬6ˆ“"Bg&6W2RFˆ“,;7Üñ÷ÚFÚ;¶&∆ñ6¢“&7F#¢V÷6Ü÷F&:|:6Ú6∆&ÜWÇ„¢$6Ü÷RÊÚvÜG4"¬$vVÊFRv˜&"ê¢“&Ü6áFw2#¢∆ó7FFR2bÜ6áFw2&V∆WfÁFW2¬6V“Ú<:÷÷&ˆ∆Ú0†•f&ñR˜2f˜&÷F˜2R˜2:&ÊwV∆˜2‚Ï:6ÚñÁfVÁFR&\:v˜2¬&ˆ÷¸:|;VW2¬FWˆñ÷VÁF˜2˜R&W7V«FF˜2VRÏ:6Úf˜&“ñÊf˜&÷F˜2Ê∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤&ˆ◊B¬7V6ñ∆ó7C¢%&VFF˜""“í¿¢“ì∞¢6ˆÁ7BB“vóB&W7ˆÁ6RÊß6ˆ‚Çì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬vW&"v˜&‚"ì∞¢6ˆÁ7B'6VB“'6T6ˆÁFVÁE∆‚ÜBÊ6ˆÁFVÁB«¬""ì∞¢ñbÇ'6VBÊ∆VÊwFÇê¢Fá&˜rÊWrW'&˜"Ä¢$î&W7ˆÊFWR¬÷2Ï:6Ú6ˆÁ6VwVí÷ˆÁF"Ú6∆VÊL:&ñÚ‚FVÁFRFRÊ˜fÚ‚"¿¢ì∞¢6ˆÁ7BFFW2“66ÜVGV∆T6ˆÁFVÁDFFW2á'6VBÊ∆VÊwFÇ¬ñÊñ6ñÚ¬6FVÊ6ñì∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢6ˆÁ7B7&VFVB“'6VBÊ÷Çá¬íí”‚á∞¢‚‚Á¿¢ñC¢VñBÇí¿¢7FGW3¢&ñFVñ"¿¢FFS¢FFW5∂ï“¿¢FÜV÷R¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢7&VFVDC¢Ê˜r¿¢“íì∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢6ˆÁFVÁE∆„¢≤‚‚Ê7&VFVB¬‚‚Á&WbÊ6ˆÁFVÁE∆Â“¿¢“íì∞¢G&6µ&ˆGV7DWfVÁBÇ&6ˆÁFVÁE˜∆ÂˆvVÊW&FVB"¬∞¢÷ˆGV∆S¢&6ˆÁFWVFÚ"¿¢˜7G3¢7&VFVBÊ∆VÊwFÇ¿¢“ì∞¢6WEFV÷Ç""ì∞¢6WEFˆ7BÜG∂7&VFVBÊ∆VÊwFá“˜7G2Fñ6ñˆÊF˜2Ú6∆VÊL:&ñˆì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞†¢6ˆÁ7BF6Ö˜7B“ÜñB¬F6Çí”‡¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢6ˆÁFVÁE∆„¢&WbÊ6ˆÁFVÁE∆‚Ê÷Çáí”‡¢ÊñB””“ñBÚ≤‚‚Á¬‚‚ÁF6Ç“¢¿¢í¿¢“íì∞¢6ˆÁ7B7ñ6∆U7FGW2“á˜7Bí”‡¢F6Ö˜7Bá˜7BÊñB¬∞¢7FGW3¢4ÙÂDTÂEı5DEU5∑˜7BÁ7FGW5”ÚÊÊWáB«¬&ñFVñ"¿¢“ì∞¢6ˆÁ7B&V÷˜fU˜7B“ÜñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç%&V÷˜fW"W7FR˜7BFÚ6∆VÊL:&ñÛÚ"íí&WGW&„∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢6ˆÁFVÁE∆„¢&WbÊ6ˆÁFVÁE∆‚Êfñ«FW"Çáí”‚ÊñB”“ñBí¿¢“íì∞¢6WEFˆ7BÇ%˜7B&V÷˜fñFÚ"ì∞¢”∞¢6ˆÁ7B˜7EFWáB“á˜7Bí”‚∞¢6ˆÁ7BFw2“á˜7BÊÜ6áFw2«¬µ“íÊ÷ÇáBí”‚2G∑G÷íÊ¶ˆñ‚Ç""ì∞¢&WGW&‚∑˜7BÊ6Fñˆ‚¬˜7BÊ7F¬Fw5“Êfñ«FW"Ñ&ˆˆ∆V‚íÊ¶ˆñ‚Ç%∆Â∆‚"ì∞¢”∞¢6ˆÁ7B6˜ï˜7B“7ñÊ2á˜7Bí”‚∞¢G'í∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFUFWáBá˜7EFWáBá˜7Bíì∞¢6WEFˆ7BÇ$∆VvVÊF6˜ñF"ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬6˜ñ"v˜&"ì∞¢–¢”∞¢6ˆÁ7B6Ü&UvÜG6“á˜7Bí”‚∞¢vñÊF˜rÊ˜V‚ávÜG6∆ñÊ≤Ç""¬˜7EFWáBá˜7Bíí¬%ˆ&∆Ê≤"¬&Êˆ˜VÊW""ì∞¢”∞†¢6ˆÁ7B6fTVFóB“á˜7Bí”‚∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢6ˆÁFVÁE∆„¢&WbÊ6ˆÁFVÁE∆‚Ê÷Çáí”‚áÊñB””“˜7BÊñBÚ˜7B¢íí¿¢“íì∞¢6WDVFóFñÊrÜÁV∆¬ì∞¢6WEFˆ7BÇ%˜7B6«fÚ"ì∞¢”∞†¢6ˆÁ7Bw&˜WVB“µ”∞¢f˜"Ü6ˆÁ7B˜7Bˆb˜7G2í∞¢6ˆÁ7B∂Wí“˜7BÊFFR«¬"#∞¢∆WB'V6∂WB“w&˜WVBÊfñÊBÇÜrí”‚rÊ∂Wí””“∂Wíì∞¢ñbÇ'V6∂WBí∞¢'V6∂WB“≤∂Wí¬óFV◊3¢µ“”∞¢w&˜WVBÁW6ÇÜ'V6∂WBì∞¢–¢'V6∂WBÊóFV◊2ÁW6Çá˜7Bì∞¢–†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'vR6ˆÁFVÁB◊∆ÊÊW"◊vR#‡¢∆ÜVFW"6∆74Ê÷S“'vR÷ÜVB#‡¢∆Fóc‡¢∆É‰6∆VÊL:&ñÚFR6ˆÁF\;¶FÛ¬ˆÉ‡¢«6∆74Ê÷S“'vR◊7V"#‡¢î∆ÊV¶6WW2˜7G2F2&VFW26ˆ6ñó3¢ñFVñ¬∆VvVÊF&ˆÁF¿¢6Ü÷FRÜ6áFw2‚VFóFR¬vVÊFRRV&∆óVR‚GVFÚw&GVóFÚ‡¢¬˜‡¢¬ˆFóc‡¢¬ˆÜVFW#‡†¢∆Fób6∆74Ê÷S“&6&B6ˆÁFVÁB÷vVÊW&F˜"#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒ÷VvÜˆÊRÛ‡¢«7„‡¢FW67&Wf6WRÊV|;66ñÚRÚˆ&¶WFófÚ‚î7VvW&RV÷6W\:¶Ê6ñFP¢˜7G2(	B6V“ñÁfVÁF"&\:v˜2˜R&ˆ÷¸:|;VW2VRfˆ<:¢Ï:6ÚñÊf˜&÷˜R‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“%6ˆ'&RÚVR˜7F#Ú#‡¢«FWáF&V¢&˜w3◊≥'–¢f«VS◊∑FV÷–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEFV÷ÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢6ˆÊfVóF&ñ'FW6Ê¬FR&ˆ∆˜2RFˆ6W2&fW7F2 ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6Ê¬&ñÊ6ó¬#‡¢«6V∆V7Bf«VS◊∂6Ê«“ˆ‰6ÜÊvS◊≤ÜRí”‚6WD6Ê¬ÜRÁF&vWBÁf«VRó”‡¢¥4ÙÂDTÂEÙ4Ñ‰‰T≈2Ê÷ÇÜ2í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂7“f«VS◊∂7”‡¢∂7–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$ˆ&¶WFófÚ#‡¢«6V∆V7Bf«VS◊∂ˆ&¶WFóf˜“ˆ‰6ÜÊvS◊≤ÜRí”‚6WDˆ&¶WFófÚÜRÁF&vWBÁf«VRó”‡¢¥4ÙÂDTÂEÙtÙ≈2Ê÷ÇÜrí”‚Ä¢∆˜Fñˆ‚∂Wì◊∂w“f«VS◊∂w”‡¢∂w–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%VÁF˜2˜7G2#‡¢«6V∆V7Bf«VS◊∑FG“ˆ‰6ÜÊvS◊≤ÜRí”‚6WEFBÑÁV÷&W"ÜRÁF&vWBÁf«VRíó”‡¢µ≥2¬B¬R¬b¬Ç¬¬%“Ê÷ÇÜ‚í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂Á“f«VS◊∂Á”‡¢∂Á“˜7G0¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6ˆ÷\:v"V“#‡¢∆ñÁW@¢GóS“&FFR ¢f«VS◊∂ñÊñ6ñ˜–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDñÊñ6ñÚÜRÁF&vWBÁf«VRó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$g&W\:¶Ê6ñ#‡¢«6V∆V7@¢f«VS◊∂6FVÊ6ñ–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD6FVÊ6ñÑÁV÷&W"ÜRÁF&vWBÁf«VRíó–¢‡¢∆˜Fñˆ‚f«VS◊≥”ÂFˆFÚFñ¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS◊≥'”‰6F"Fñ3¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS◊≥7”‰6F2Fñ3¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS◊≥w”„˜"6V÷Ê¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢∂W'"bb«6∆74Ê÷S“&f˜&“÷W'&˜"#Á∂W''”¬˜Á–¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊∂vVÊW&FW“Fó6&∆VC◊∂'W7ó”‡¢≈7&∂∆W26ó¶S◊≥g“Û‡¢∂'W7íÚ%∆ÊV¶ÊFÚ‚‚‚"¢$vW&"6∆VÊL:&ñÚ'–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡†¢∑˜7G2Ê∆VÊwFÇ””“ÚÄ¢∆Fób6∆74Ê÷S“&V◊Gí◊7FFR#‡¢ƒ÷VvÜˆÊRÛ‡¢∆É3Â6WR6∆VÊL:&ñÚW7L:f¶ñÛ¬ˆÉ3‡¢«‰FW67&Wf6WRÊV|;66ñÚ6ñ÷R7&ñR&ñ÷Vó&6W\:¶Ê6ñFR˜7G2„¬˜‡¢¬ˆFóc‡¢í¢Ä¢∆Fób6∆74Ê÷S“&6ˆÁFVÁB◊∆‚÷∆ó7B#‡¢∂w&˜WVBÊ÷ÇÜw&˜Wí”‚Ä¢«6V7Fñˆ‚∂Wì◊∂w&˜WÊ∂Wó“6∆74Ê÷S“&6ˆÁFVÁB÷Fí#‡¢∆É26∆74Ê÷S“&6ˆÁFVÁB÷Fí÷∆&V¬#Á∂6ˆÁFVÁDFFT∆&V¬Üw&˜WÊ∂Wíó”¬ˆÉ3‡¢∂w&˜WÊóFV◊2Ê÷Çá˜7Bí”‚Ä¢∆'Fñ6∆P¢∂Wì◊∑˜7BÊñG–¢6∆74Ê÷S◊∂6&B6ˆÁFVÁB◊˜7B7FGW2“G∑˜7BÁ7FGW7÷–¢‡¢∆Fób6∆74Ê÷S“&6ˆÁFVÁB◊˜7B◊F˜#‡¢«7‚6∆74Ê÷S“&6ˆÁFVÁB÷6Üó#Á∑˜7BÊ6ÜÊÊV«”¬˜7„‡¢«7‚6∆74Ê÷S“&6ˆÁFVÁB÷6ÜóvÜ˜7B#Á∑˜7BÊf˜&÷G”¬˜7„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂6ˆÁFVÁB◊7FGW2÷'F‚2“G∑˜7BÁ7FGW7÷–¢ˆ‰6∆ñ6≥◊≤Çí”‚7ñ6∆U7FGW2á˜7Bó–¢FóF∆S“$◊VF"6óGV:|:6Ú ¢‡¢¥4ÙÂDTÂEı5DEU5∑˜7BÁ7FGW5”ÚÊ∆&V¬«¬$ñFVñ'–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢∆ÉCÁ∑˜7BÊÜˆˆ∑”¬ˆÉC‡¢«6∆74Ê÷S“&6ˆÁFVÁB÷6Fñˆ‚#Á∑˜7BÊ6FñˆÁ”¬˜‡¢∑˜7BÊ7Fbb«6∆74Ê÷S“&6ˆÁFVÁB÷7F#Ó)Í∑˜7BÊ7F”¬˜Á–¢∑˜7BÊÜ6áFw3ÚÊ∆VÊwFÇ‚bbÄ¢«6∆74Ê÷S“&6ˆÁFVÁB◊Fw2#‡¢∑˜7BÊÜ6áFw2Ê÷ÇáBí”‚2G∑G÷íÊ¶ˆñ‚Ç""ó–¢¬˜‡¢ó–¢∆Fób6∆74Ê÷S“&6ˆÁFVÁB◊˜7B÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊≤Çí”‚6˜ï˜7Bá˜7Bó”‡¢ƒ6˜í6ó¶S◊≥W“Û‚6˜ñ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚6Ü&UvÜG6á˜7Bó–¢‡¢≈6VÊB6ó¶S◊≥W“Û‚vÜG4 ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WDVFóFñÊrá7G'V7GW&VD6∆ˆÊRá˜7Bíó–¢‡¢≈VÊ6ñ¬6ó¶S◊≥W“Û‚VFóF ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU˜7Bá˜7BÊñBó–¢‡¢≈G&6É"6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬˜6V7Fñˆ„‡¢íó–¢¬ˆFóc‡¢ó–†¢∂VFóFñÊrbbÄ¢ƒ6ˆÁFVÁE˜7DVFóF˜ ¢˜7C◊∂VFóFñÊw–¢ˆ‰6ÜÊvS◊∑6WDVFóFñÊw–¢ˆÂ6fS◊∑6fTVFóG–¢ˆ‰6∆˜6S◊≤Çí”‚6WDVFóFñÊrÜÁV∆¬ó–¢Û‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶gVÊ7Fñˆ‚6ˆÁFVÁE˜7DVFóF˜"á≤˜7B¬ˆ‰6ÜÊvR¬ˆÂ6fR¬ˆ‰6∆˜6R“í∞¢6ˆÁ7B6WB“áF6Çí”‚ˆ‰6ÜÊvRá≤‚‚Á˜7B¬‚‚ÁF6Ç“ì∞¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S“$VFóF"˜7B"vñFRˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“$FF#‡¢∆ñÁW@¢GóS“&FFR ¢f«VS◊∑˜7BÊFFR«¬"'–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBá≤FFS¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6Ê¬#‡¢«6V∆V7@¢f«VS◊∑˜7BÊ6ÜÊÊV«–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBá≤6ÜÊÊV√¢RÁF&vWBÁf«VR“ó–¢‡¢¥4ÙÂDTÂEÙ4Ñ‰‰T≈2Ê÷ÇÜ2í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂7“f«VS◊∂7”‡¢∂7–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$f˜&÷FÚ#‡¢∆ñÁW@¢f«VS◊∑˜7BÊf˜&÷G–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBá≤f˜&÷C¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%6óGV:|:6Ú#‡¢«6V∆V7@¢f«VS◊∑˜7BÁ7FGW7–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBá≤7FGW3¢RÁF&vWBÁf«VR“ó–¢‡¢¥ˆ&¶V7BÊVÁG&ñW2Ñ4ÙÂDTÂEı5DEU2íÊ÷ÇÖ∂≤¬e“í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂∑“f«VS◊∂∑”‡¢∑bÊ∆&V«–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢ƒfñV∆B∆&V√“$6Ü÷FÚñFVñ#‡¢∆ñÁWBf«VS◊∑˜7BÊÜˆˆ∑“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBá≤Üˆˆ≥¢RÁF&vWBÁf«VR“ó“Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$∆VvVÊF#‡¢«FWáF&V¢&˜w3◊≥W–¢f«VS◊∑˜7BÊ6FñˆÁ–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WBá≤6Fñˆ„¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6Ü÷F&:|:6ÚÑ5Dí#‡¢∆ñÁWBf«VS◊∑˜7BÊ7F«¬"'“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBá≤7F¢RÁF&vWBÁf«VR“ó“Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$Ü6áFw2á6W&F2˜"W7:vÚ¬6V“2í#‡¢∆ñÁW@¢f«VS◊≤á˜7BÊÜ6áFw2«¬µ“íÊ¶ˆñ‚Ç""ó–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WBá∞¢Ü6áFw3¢RÁF&vWBÁf«VP¢Á7∆óBÇıµ«2≈“≤Úê¢Ê÷ÇáBí”‚BÁ&W∆6RÇı‚2≤Ú¬""íÁG&ñ“Çíê¢Êfñ«FW"Ñ&ˆˆ∆V‚í¿¢“ê¢–¢Û‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊≤Çí”‚ˆÂ6fRá˜7Bó”‡¢6«f"˜7@¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–†¶6ˆÁ7B$U4TÂDDîÙÂÙtÙ≈2“∞¢$&W6VÁF"V÷&˜˜7F6ˆ÷W&6ñ¬"¿¢$fV6Ü"V÷fVÊF"¿¢$Wá∆ñ6"V“6W'fú:vÚ˜R&ˆGWFÚ"¿¢%G&VñÊ"WVóR"¿¢$F"V÷V∆˜R∆W7G&"¿¢%&W7F"6ˆÁF2Ú&V∆L;7&ñÚFR&W7V«FF˜2"¿•”∞†¶gVÊ7Fñˆ‚&W6VÁFFñˆÁ2á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B“í∞¢6ˆÁ7B∑FV÷¬6WEFV÷““W6U7FFRÇ""ì∞¢6ˆÁ7B∑V&∆ñ6Ú¬6WEV&∆ñ6ı““W6U7FFRÇ""ì∞¢6ˆÁ7B∂ˆ&¶WFófÚ¬6WDˆ&¶WFófı““W6U7FFRÖ$U4TÂDDîÙÂÙtÙ≈5≥“ì∞¢6ˆÁ7B∂ÁV’6∆ñFW2¬6WDÁV’6∆ñFW5““W6U7FFRÉbì∞¢6ˆÁ7B∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∑fñWvñÊr¬6WEfñWvñÊu““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B∑6∆ñFTñÊFWÇ¬6WE6∆ñFTñÊFWÖ““W6U7FFRÉì∞¢6ˆÁ7B∂VFóFñÊr¬6WDVFóFñÊu““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B∂Wá˜'D'W7í¬6WDWá˜'D'W7ï““W6U7FFRÇ""ì∞†¢6ˆÁ7BFV6∑2“F"Á&W6VÁFFñˆÁ2Êfñ«FW"Ä¢áí”‚'W6ñÊW72«¬Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñB¿¢ì∞¢6ˆÁ7BfñWvñÊtFV6≤“fñWvñÊp¢ÚFV6∑2ÊfñÊBÇÜBí”‚BÊñB””“fñWvñÊrí«¬ÁV∆¿¢¢ÁV∆√∞†¢6ˆÁ7BvVÊW&FR“7ñÊ2Çí”‚∞¢6ˆÁ7BFÜV÷R“FV÷ÁG&ñ“Çì∞¢ñbáFÜV÷RÊ∆VÊwFÇ¬2«¬'W7íí∞¢ñbáFÜV÷RÊ∆VÊwFÇ¬2í6WDW'"Ç$FW67&WfÚFV÷V“V∆Ú÷VÊ˜22∆WG&2‚"ì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢6ˆÁ7B‚“÷FÇÊ÷ÇÉ2¬÷FÇÊ÷ñ‚É"¬ÁV÷&W"ÜÁV’6∆ñFW2í«¬bíì∞¢6ˆÁ7B&ˆ◊B“fˆ<:¢:íV“W7V6ñ∆ó7FV“&W6VÁF:|;VW2&ˆfó76ñˆÊó2‚÷ˆÁFRÚ&˜FVó&ÚFRV÷&W6VÁF:|:6ÚFR6∆ñFW2V“˜'GVw\:ß2FÚ'&6ñ¬‡†•FV÷¢G∑FÜV÷W–§ˆ&¶WFófÛ¢G∂ˆ&¶WFóf˜–•;¶&∆ñ6Û¢G∑V&∆ñ6ÚÁG&ñ“Çí«¬&6∆ñVÁFW2R&6Vó&˜2FÚÊV|;66ñÚ'–•VÁFñFFRFR6∆ñFW3¢WÜF÷VÁFRG∂Á“ÜñÊ6«VV“6∆ñFRFR6ÊÚñÏ:÷6ñÚRV“6∆ñFRFR,;7Üñ÷˜276˜2ˆ6ˆÁFFÚÊÚfñ“í‡†•&W7ˆÊF4Ù‘TÂDR6ˆ“V“'&í•4Ù‚l:∆ñFÚ¬6V“6ˆ÷VÁL:&ñ˜2R6V“6W&62FR<;6FñvÚ‚6FóFV“FWfRFW#†¢“'FóF∆R#¢L:◊GV∆Ú7W'FÚRf˜'FRFÚ6∆ñFRÜ‹:Ç‚Ç∆g&2ê¢“&'V∆∆WG2#¢∆ó7FFR"Rg&6W27W'F2Rˆ&¶WFóf2ÜÚ6∆ñFRFR6ˆFRFW"'V∆∆WB6ˆ“Ú7V'L:◊GV∆Úê¢“&Ê˜FW2#¢V÷g&6RFRˆñÚ&VV“fí&W6VÁF"ÜÚVRf∆"ê†§Ï:6ÚñÁfVÁFRÏ;¶÷W&˜2¬&\:v˜2¬FWˆñ÷VÁF˜2˜R&W7V«FF˜2VRÏ:6Úf˜&“ñÊf˜&÷F˜2‚6V¶6ˆÊ7&WFÚR:óFñ6ÚÊ∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤&ˆ◊B¬7V6ñ∆ó7C¢%&VFF˜""“í¿¢“ì∞¢6ˆÁ7BB“vóB&W7ˆÁ6RÊß6ˆ‚Çì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬vW&"v˜&‚"ì∞¢6ˆÁ7B6∆ñFW2“'6TFV6µ6∆ñFW2ÜBÊ6ˆÁFVÁB«¬""ì∞¢ñbÇ6∆ñFW2Ê∆VÊwFÇê¢Fá&˜rÊWrW'&˜"Ä¢$î&W7ˆÊFWR¬÷2Ï:6Ú6ˆÁ6VwVí÷ˆÁF"˜26∆ñFW2‚FVÁFRFRÊ˜fÚ‚"¿¢ì∞¢6ˆÁ7BFV6≤“∞¢ñC¢VñBÇí¿¢FóF∆S¢FÜV÷RÊ∆VÊwFÇ‚cÚG∑FÜV÷RÁ6∆ñ6RÉ¬Sró“‚‚Ê¢FÜV÷R¿¢ˆ&¶WFófÚ¿¢V&∆ñ6Û¢V&∆ñ6ÚÁG&ñ“Çí¿¢6∆ñFW2¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢”∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢&W6VÁFFñˆÁ3¢∂FV6≤¬‚‚Á&WbÁ&W6VÁFFñˆÁ5“¿¢“íì∞¢G&6µ&ˆGV7DWfVÁBÇ'&W6VÁFFñˆÂˆvVÊW&FVB"¬∞¢÷ˆGV∆S¢&&W6VÁF6ˆW2"¿¢6∆ñFW3¢6∆ñFW2Ê∆VÊwFÇ¿¢“ì∞¢6WEFV÷Ç""ì∞¢6WEV&∆ñ6ÚÇ""ì∞¢6WEFˆ7BÜ&W6VÁF:|:6Ú7&ñF6ˆ“G∑6∆ñFW2Ê∆VÊwFá“6∆ñFW6ì∞¢6WEfñWvñÊrÜFV6≤ÊñBì∞¢6WE6∆ñFTñÊFWÇÉì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞†¢6ˆÁ7B&V÷˜fTFV6≤“ÜñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç$WÜ6«Vó"W7F&W6VÁF:|:6ÛÚ"íí&WGW&„∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢&W6VÁFFñˆÁ3¢&WbÁ&W6VÁFFñˆÁ2Êfñ«FW"Çáí”‚ÊñB”“ñBí¿¢“íì∞¢ñbáfñWvñÊr””“ñBí6WEfñWvñÊrÜÁV∆¬ì∞¢6WEFˆ7BÇ$&W6VÁF:|:6ÚWÜ6«\:÷F"ì∞¢”∞†¢6ˆÁ7BGW∆ñ6FTFV6≤“ÜFV6≤í”‚∞¢6ˆÁ7B6˜í“∞¢‚‚ÊFV6≤¿¢ñC¢VñBÇí¿¢FóF∆S¢G∂FV6≤ÁFóF∆W“Ü<;7ññ¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢”∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢&W6VÁFFñˆÁ3¢∂6˜í¬‚‚Á&WbÁ&W6VÁFFñˆÁ5“¿¢“íì∞¢6WEFˆ7BÇ$<;7ñ7&ñF"ì∞¢”∞†¢6ˆÁ7B6fTVFóB“ÜFV6≤í”‚∞¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢&W6VÁFFñˆÁ3¢&WbÁ&W6VÁFFñˆÁ2Ê÷Çáí”‡¢ÊñB””“FV6≤ÊñBÚ≤‚‚ÊFV6≤¬WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí“¢¿¢í¿¢“íì∞¢6WDVFóFñÊrÜÁV∆¬ì∞¢6WEFˆ7BÇ$&W6VÁF:|:6Ú6«f"ì∞¢”∞†¢6ˆÁ7BWá˜'EFb“7ñÊ2ÜFV6≤í”‚∞¢6WDWá˜'D'W7íÜG∂FV6≤ÊñG”ßFfì∞¢G'í∞¢6ˆÁ7B≤ß5Db““vóBñ◊˜'BÇ&ß7Fb"ì∞¢6ˆÁ7BFb“ÊWrß5Dbá≤VÊóC¢&÷“"¬f˜&÷C¢&B"¬˜&ñVÁFFñˆ„¢&∆ÊG66R"“ì∞¢6ˆÁ7Br“#ìs∞¢6ˆÁ7BÇ“#∞¢ÜFV6≤Á6∆ñFW2«¬µ“íÊf˜$V6ÇÇá6∆ñFR¬íí”‚∞¢ñbÜí‚íFbÊFEvRÇì∞¢FbÁ6WDfñ∆ƒ6ˆ∆˜"ÉR¬#2¬C"ì∞¢FbÁ&V7BÉ¬¬r¬Ç¬$b"ì∞¢FbÁ6WEFWáD6ˆ∆˜"É#SR¬#SR¬#SRì∞¢FbÁ6WDfˆÁBÇ&ÜV«fWFñ6"¬&&ˆ∆B"ì∞¢FbÁ6WDfˆÁE6ó¶RÜí””“Ú3¢#Bì∞¢6ˆÁ7BFóF∆R“FbÁ7∆óEFWáEFı6ó¶Rá6∆ñFRÁFóF∆R«¬%6∆ñFR"¬r“Cì∞¢FbÁFWáBáFóF∆R¬#"¬í””“Úì¢3Bì∞¢FbÁ6WDfˆÁBÇ&ÜV«fWFñ6"¬&Ê˜&÷¬"ì∞¢FbÁ6WDfˆÁE6ó¶RÉRì∞¢FbÁ6WEFWáD6ˆ∆˜"É##b¬#3"¬#Cì∞¢∆WBí“í””“Úì≤FóF∆RÊ∆VÊwFÇ¢"≤Ç¢3B≤FóF∆RÊ∆VÊwFÇ¢"≤c∞¢á6∆ñFRÊ'V∆∆WG2«¬µ“íÊf˜$V6ÇÇÜ"í”‚∞¢6ˆÁ7B∆ñÊW2“FbÁ7∆óEFWáEFı6ó¶RÜ(
"G∂'÷¬r“Sì∞¢∆ñÊW2Êf˜$V6ÇÇÜ∆ñÊRí”‚∞¢ñbáí‚Ç“#"í&WGW&„∞¢FbÁFWáBÜ∆ñÊR¬#b¬íì∞¢í≥“ì∞¢“ì∞¢í≥“#∞¢“ì∞¢FbÁ6WEFWáD6ˆ∆˜"ÉCÇ¬c2¬ÉBì∞¢FbÁ6WDfˆÁE6ó¶RÉíì∞¢FbÁFWáBÜG∂í≤“ÚG∂FV6≤Á6∆ñFW2Ê∆VÊwFá÷¬r“#b¬Ç“"ì∞¢“ì∞¢6ˆÁ7B“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢Êá&Vb“FbÊ˜WGWBÇ&&∆ˆ'W&¬"ì∞¢ÊF˜vÊ∆ˆB“G∑6«VvñgíÜFV6≤ÁFóF∆R«¬&&W6VÁF6Ú"ó“ÁFf∞¢Ê6∆ñ6≤Çì∞¢G&6µ&ˆGV7DWfVÁBÇ'&W6VÁFFñˆÂˆWá˜'FVB"¬∞¢÷ˆGV∆S¢&&W6VÁF6ˆW2"¿¢f˜&÷C¢'Fb"¿¢“ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬vW&"ÚDbv˜&"ì∞¢“fñÊ∆«í∞¢6WDWá˜'D'W7íÇ""ì∞¢–¢”∞†¢6ˆÁ7BWá˜'EGÇ“7ñÊ2ÜFV6≤í”‚∞¢6WDWá˜'D'W7íÜG∂FV6≤ÊñG”ßGÜì∞¢G'í∞¢6ˆÁ7B≤F˜vÊ∆ˆE&W6VÁFFñˆÂGÇ““vóBñ◊˜'BÄ¢"‚ˆfVGW&W2˜&W6VÁFFñˆÁ2˜&W6VÁFFñˆÂGÇÊß2 ¢ì∞¢vóBF˜vÊ∆ˆE&W6VÁFFñˆÂGÇÜFV6≤¬∞¢WFÜ˜#¢'W6ñÊW73ÚÊÊ÷R«¬F"ÁW6W#ÚÊÊ÷R«¬%6WRgVÊ6ñˆÏ:&ñÚ"¿¢6ˆ◊Áì¢'W6ñÊW73ÚÊÊ÷R«¬%6WRgVÊ6ñˆÏ:&ñÚ"¿¢“ì∞¢6WEFˆ7BÇ$&W6VÁF:|:6ÚWá˜'FFV“EÇ"ì∞¢G&6µ&ˆGV7DWfVÁBÇ'&W6VÁFFñˆÂˆWá˜'FVB"¬∞¢÷ˆGV∆S¢&&W6VÁF6ˆW2"¿¢f˜&÷C¢'GÇ"¿¢“ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬vW&"ÚEÇv˜&"ì∞¢“fñÊ∆«í∞¢6WDWá˜'D'W7íÇ""ì∞¢–¢”∞†¢W6TVffV7BÇÇí”‚∞¢ñbÇfñWvñÊtFV6≤í&WGW&„∞¢6ˆÁ7Bˆ‰∂Wí“ÜRí”‚∞¢ñbÜRÊ∂Wí””“$'&˜u&ñváB"«¬RÊ∂Wí””“""ê¢6WE6∆ñFTñÊFWÇÇÜíí”‚÷FÇÊ÷ñ‚ÇáfñWvñÊtFV6≤Á6∆ñFW2Ê∆VÊwFÇ«¬í“¬í≤íì∞¢V«6RñbÜRÊ∂Wí””“$'&˜t∆VgB"í6WE6∆ñFTñÊFWÇÇÜíí”‚÷FÇÊ÷ÇÉ¬í“íì∞¢V«6RñbÜRÊ∂Wí””“$W66R"í6WEfñWvñÊrÜÁV∆¬ì∞¢”∞¢vñÊF˜rÊFDWfVÁD∆ó7FVÊW"Ç&∂WñF˜v‚"¬ˆ‰∂Wíì∞¢&WGW&‚Çí”‚vñÊF˜rÁ&V÷˜fTWfVÁD∆ó7FVÊW"Ç&∂WñF˜v‚"¬ˆ‰∂Wíì∞¢“¬∑fñWvñÊtFV6µ“ì∞†¢6ˆÁ7B7W'&VÁB“fñWvñÊtFV6≥ÚÁ6∆ñFW3ÚÂ∑6∆ñFTñÊFWÖ”∞†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'vR&W6VÁFFñˆÁ2◊vR#‡¢∆ÜVFW"6∆74Ê÷S“'vR÷ÜVB#‡¢∆Fóc‡¢∆É‰&W6VÁF:|;VW3¬ˆÉ‡¢«6∆74Ê÷S“'vR◊7V"#‡¢FW67&WfÚFV÷Rî÷ˆÁF˜26∆ñFW2‚VFóFR¬&W6VÁFRV“FV∆¢6ÜVñR&óÜRV“Db˜R˜vW%ˆñÁB(	BGVFÚw&GVóFÚ‡¢¬˜‡¢¬ˆFóc‡¢¬ˆÜVFW#‡†¢∆Fób6∆74Ê÷S“&6&B&W6VÁFFñˆ‚÷vVÊW&F˜"#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒ∆ñW'2Û‡¢«7„‡¢ñFV¬&&˜˜7F2¬óF6ÇFRfVÊF2¬G&VñÊ÷VÁF˜2RV∆2‚î¢Ï:6ÚñÁfVÁF&\:v˜2ÊV“&W7V«FF˜2VRfˆ<:¢Ï:6ÚñÊf˜&÷"‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“%6ˆ'&RÚVR:í&W6VÁF:|:6ÛÚ#‡¢«FWáF&V¢&˜w3◊≥'–¢f«VS◊∑FV÷–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEFV÷ÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢6W'fú:vÚFR˜&vÊó¶:|:6Ú&W6ñFVÊ6ñ¬&f‹:÷∆ñ2ˆ7WF2 ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$ˆ&¶WFófÚ#‡¢«6V∆V7Bf«VS◊∂ˆ&¶WFóf˜“ˆ‰6ÜÊvS◊≤ÜRí”‚6WDˆ&¶WFófÚÜRÁF&vWBÁf«VRó”‡¢µ$U4TÂDDîÙÂÙtÙ≈2Ê÷ÇÜrí”‚Ä¢∆˜Fñˆ‚∂Wì◊∂w“f«VS◊∂w”‡¢∂w–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%&VV“á;¶&∆ñ6Úí#‡¢∆ñÁW@¢f«VS◊∑V&∆ñ6˜–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEV&∆ñ6ÚÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢FˆÊ2FR66¬<:÷ÊFñ6˜2¬WVVÊ2V◊&W62 ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%VÁFñFFRFR6∆ñFW2#‡¢«6V∆V7@¢f«VS◊∂ÁV’6∆ñFW7–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDÁV’6∆ñFW2ÑÁV÷&W"ÜRÁF&vWBÁf«VRíó–¢‡¢µ≥B¬R¬b¬r¬Ç¬¬%“Ê÷ÇÜ‚í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂Á“f«VS◊∂Á”‡¢∂Á“6∆ñFW0¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢∂W'"bb«6∆74Ê÷S“&f˜&“÷W'&˜"#Á∂W''”¬˜Á–¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊∂vVÊW&FW“Fó6&∆VC◊∂'W7ó”‡¢≈7&∂∆W26ó¶S◊≥g“Û‡¢∂'W7íÚ$÷ˆÁFÊFÚ6∆ñFW2‚‚‚"¢$vW&"&W6VÁF:|:6Ú'–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡†¢∂FV6∑2Ê∆VÊwFÇ””“ÚÄ¢∆Fób6∆74Ê÷S“&V◊Gí◊7FFR#‡¢ƒ∆ñW'2Û‡¢∆É3‰ÊVÊáV÷&W6VÁF:|:6ÚñÊF¬ˆÉ3‡¢«‰FW67&WfV“FV÷6ñ÷R7&ñR&ñ÷Vó&V“6VwVÊF˜2„¬˜‡¢¬ˆFóc‡¢í¢Ä¢∆Fób6∆74Ê÷S“'&W6VÁFFñˆ‚÷w&ñB#‡¢∂FV6∑2Ê÷ÇÜFV6≤í”‚Ä¢∆'Fñ6∆R∂Wì◊∂FV6≤ÊñG“6∆74Ê÷S“&6&B&W6VÁFFñˆ‚÷6&B#‡¢∆Fób6∆74Ê÷S“'&W6VÁFFñˆ‚◊FáV÷""&ñ÷ÜñFFV„“'G'VR#‡¢«7‚6∆74Ê÷S“'&W6VÁFFñˆ‚◊FáV÷"◊FóF∆R#‡¢∂FV6≤Á6∆ñFW3ÚÂ≥”ÚÁFóF∆R«¬FV6≤ÁFóF∆W–¢¬˜7„‡¢«7‚6∆74Ê÷S“'&W6VÁFFñˆ‚◊FáV÷"÷6˜VÁB#‡¢∂FV6≤Á6∆ñFW3ÚÊ∆VÊwFÇ«¬“6∆ñFW0¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'&W6VÁFFñˆ‚÷6&B÷&ˆGí#‡¢∆É3Á∂FV6≤ÁFóF∆W”¬ˆÉ3‡¢«6∆74Ê÷S“'&W6VÁFFñˆ‚÷÷WF#Á∂FV6≤Êˆ&¶WFóf˜”¬˜‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'&W6VÁFFñˆ‚÷6&B÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚&ñ÷'í6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WEfñWvñÊrÜFV6≤ÊñBì∞¢6WE6∆ñFTñÊFWÇÉì∞¢◊–¢‡¢≈∆í6ó¶S◊≥W“Û‚&W6VÁF ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WDVFóFñÊrá7G'V7GW&VD6∆ˆÊRÜFV6≤íó–¢‡¢≈VÊ6ñ¬6ó¶S◊≥W“Û‚VFóF ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚Wá˜'EFbÜFV6≤ó–¢Fó6&∆VC◊≤Wá˜'D'W7ó–¢‡¢ƒF˜vÊ∆ˆB6ó¶S◊≥W“Û‡¢∂Wá˜'D'W7í””“G∂FV6≤ÊñG”ßFfÚ$vW&ÊFÚ‚‚‚"¢%Db'–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚Wá˜'EGÇÜFV6≤ó–¢Fó6&∆VC◊≤Wá˜'D'W7ó–¢‡¢ƒF˜vÊ∆ˆB6ó¶S◊≥W“Û‡¢∂Wá˜'D'W7í””“G∂FV6≤ÊñG”ßGÜÚ$vW&ÊFÚ‚‚‚"¢%EÇ'–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚GW∆ñ6FTFV6≤ÜFV6≤ó–¢FóF∆S“$GW∆ñ6" ¢‡¢ƒ6˜í6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fTFV6≤ÜFV6≤ÊñBó–¢FóF∆S“$WÜ6«Vó" ¢‡¢≈G&6É"6ó¶S◊≥W“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢ó–†¢∑fñWvñÊtFV6≤bb7W'&VÁBbbÄ¢∆Fó`¢6∆74Ê÷S“'&W6VÁFW"÷˜fW&∆í ¢&ˆ∆S“&Fñ∆ˆr ¢&ñ÷÷ˆF√“'G'VR ¢&ñ÷∆&V√◊∂&W6VÁF:|:6Û¢G∑fñWvñÊtFV6≤ÁFóF∆W÷–¢‡¢∆Fób6∆74Ê÷S“'&W6VÁFW"◊6∆ñFR#‡¢∆É#Á∂7W'&VÁBÁFóF∆W”¬ˆÉ#‡¢∂7W'&VÁBÊ'V∆∆WG3ÚÊ∆VÊwFÇ‚bbÄ¢«V√‡¢∂7W'&VÁBÊ'V∆∆WG2Ê÷ÇÜ"¬íí”‚Ä¢∆∆í∂Wì◊∂ó”Á∂'”¬ˆ∆ì‡¢íó–¢¬˜V√‡¢ó–¢∂7W'&VÁBÊÊ˜FW2bbÄ¢«6∆74Ê÷S“'&W6VÁFW"÷Ê˜FW2#‡¢«7G&ˆÊs‰f∆S£¬˜7G&ˆÊs‚∂7W'&VÁBÊÊ˜FW7–¢¬˜‡¢ó–¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'&W6VÁFW"÷&"#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WE6∆ñFTñÊFWÇÇÜíí”‚÷FÇÊ÷ÇÉ¬í“íó–¢Fó6&∆VC◊∑6∆ñFTñÊFWÇ””“–¢‡¢ƒ6ÜWg&ˆ‰∆VgB6ó¶S◊≥á“Û‚ÁFW&ñ˜ ¢¬ˆ'WGFˆ„‡¢«7‚6∆74Ê÷S“'&W6VÁFW"÷6˜VÁB#‡¢∑6∆ñFTñÊFWÇ≤“Ú∑fñWvñÊtFV6≤Á6∆ñFW2Ê∆VÊwFá–¢¬˜7„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢6WE6∆ñFTñÊFWÇÇÜíí”‡¢÷FÇÊ÷ñ‚áfñWvñÊtFV6≤Á6∆ñFW2Ê∆VÊwFÇ“¬í≤í¿¢ê¢–¢Fó6&∆VC◊∑6∆ñFTñÊFWÇ””“fñWvñÊtFV6≤Á6∆ñFW2Ê∆VÊwFÇ“–¢‡¢,;7Üñ÷Úƒ6ÜWg&ˆÂ&ñváB6ó¶S◊≥á“Û‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚"ˆ‰6∆ñ6≥◊≤Çí”‚6WEfñWvñÊrÜÁV∆¬ó”‡¢≈Ç6ó¶S◊≥á“Û‚fV6Ü ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢ó–†¢∂VFóFñÊrbbÄ¢≈&W6VÁFFñˆ‰VFóF˜ ¢FV6≥◊∂VFóFñÊw–¢ˆ‰6ÜÊvS◊∑6WDVFóFñÊw–¢ˆÂ6fS◊∑6fTVFóG–¢ˆ‰6∆˜6S◊≤Çí”‚6WDVFóFñÊrÜÁV∆¬ó–¢Û‡¢ó–¢¬ˆFóc‡¢ì∞ß–†¶gVÊ7Fñˆ‚&W6VÁFFñˆ‰VFóF˜"á≤FV6≤¬ˆ‰6ÜÊvR¬ˆÂ6fR¬ˆ‰6∆˜6R“í∞¢6ˆÁ7B6WE6∆ñFR“ÜñGÇ¬F6Çí”‡¢ˆ‰6ÜÊvRá∞¢‚‚ÊFV6≤¿¢6∆ñFW3¢FV6≤Á6∆ñFW2Ê÷Çá2¬íí”‚Üí””“ñGÇÚ≤‚‚Á2¬‚‚ÁF6Ç“¢2íí¿¢“ì∞¢6ˆÁ7BFE6∆ñFR“Çí”‡¢ˆ‰6ÜÊvRá∞¢‚‚ÊFV6≤¿¢6∆ñFW3¢≤‚‚ÊFV6≤Á6∆ñFW2¬≤FóF∆S¢$Ê˜fÚ6∆ñFR"¬'V∆∆WG3¢µ“¬Ê˜FW3¢""’“¿¢“ì∞¢6ˆÁ7B&V÷˜fU6∆ñFR“ÜñGÇí”‡¢ˆ‰6ÜÊvRá≤‚‚ÊFV6≤¬6∆ñFW3¢FV6≤Á6∆ñFW2Êfñ«FW"ÇÖÚ¬íí”‚í”“ñGÇí“ì∞¢6ˆÁ7B÷˜fU6∆ñFR“ÜñGÇ¬Fó"í”‚∞¢6ˆÁ7B¢“ñGÇ≤Fó#∞¢ñbÜ¢¬«¬¢„“FV6≤Á6∆ñFW2Ê∆VÊwFÇí&WGW&„∞¢6ˆÁ7B6∆ñFW2“≤‚‚ÊFV6≤Á6∆ñFW5”∞¢∑6∆ñFW5∂ñGÖ“¬6∆ñFW5∂•’““∑6∆ñFW5∂•“¬6∆ñFW5∂ñGÖ’”∞¢ˆ‰6ÜÊvRá≤‚‚ÊFV6≤¬6∆ñFW2“ì∞¢”∞¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S“$VFóF"&W6VÁF:|:6Ú"vñFRˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢ƒfñV∆B∆&V√“%L:◊GV∆ÚF&W6VÁF:|:6Ú#‡¢∆ñÁW@¢f«VS◊∂FV6≤ÁFóF∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚ˆ‰6ÜÊvRá≤‚‚ÊFV6≤¬FóF∆S¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“&VFóF˜"◊6∆ñFW2#‡¢∂FV6≤Á6∆ñFW2Ê÷Çá6∆ñFR¬ñGÇí”‚Ä¢∆Fób∂Wì◊∂ñGá“6∆74Ê÷S“&VFóF˜"◊6∆ñFR#‡¢∆Fób6∆74Ê÷S“&VFóF˜"◊6∆ñFR÷ÜVB#‡¢«7‚6∆74Ê÷S“&VFóF˜"◊6∆ñFR÷ÁV“#Â6∆ñFR∂ñGÇ≤”¬˜7„‡¢∆Fób6∆74Ê÷S“&VFóF˜"◊6∆ñFR◊Fˆˆ«2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚÷˜fU6∆ñFRÜñGÇ¬”ó–¢Fó6&∆VC◊∂ñGÇ””“–¢FóF∆S“%7V&ó" ¢‡¢(i¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“ ¢ˆ‰6∆ñ6≥◊≤Çí”‚÷˜fU6∆ñFRÜñGÇ¬ó–¢Fó6&∆VC◊∂ñGÇ””“FV6≤Á6∆ñFW2Ê∆VÊwFÇ“–¢FóF∆S“$FW66W" ¢‡¢(i0¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU6∆ñFRÜñGÇó–¢Fó6&∆VC◊∂FV6≤Á6∆ñFW2Ê∆VÊwFÇ√“–¢FóF∆S“$WÜ6«Vó"6∆ñFR ¢‡¢≈G&6É"6ó¶S◊≥G“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆ñÁW@¢6∆74Ê÷S“&VFóF˜"◊6∆ñFR◊FóF∆R ¢f«VS◊∑6∆ñFRÁFóF∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE6∆ñFRÜñGÇ¬≤FóF∆S¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“%L:◊GV∆ÚFÚ6∆ñFR ¢Û‡¢«FWáF&V¢&˜w3◊≥G–¢f«VS◊≤á6∆ñFRÊ'V∆∆WG2«¬µ“íÊ¶ˆñ‚Ç%∆‚"ó–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WE6∆ñFRÜñGÇ¬∞¢'V∆∆WG3¢RÁF&vWBÁf«VP¢Á7∆óBÇ%∆‚"ê¢Ê÷ÇÜ¬í”‚¬ÁG&ñ“Çíê¢Êfñ«FW"Ñ&ˆˆ∆V‚í¿¢“ê¢–¢∆6VÜˆ∆FW#“%V“L;7ñ6Ú˜"∆ñÊÜ ¢Û‡¢∆ñÁW@¢6∆74Ê÷S“&VFóF˜"◊6∆ñFR÷Ê˜FW2 ¢f«VS◊∑6∆ñFRÊÊ˜FW2«¬"'–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE6∆ñFRÜñGÇ¬≤Ê˜FW3¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“$Ê˜FFÚ&W6VÁFF˜"ÜÚVRf∆"í ¢Û‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∂FE6∆ñFW”‡¢≈«W26ó¶S◊≥g“Û‚Fñ6ñˆÊ"6∆ñFP¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚&ñ÷'í"ˆ‰6∆ñ6≥◊≤Çí”‚ˆÂ6fRÜFV6≤ó”‡¢6«f"&W6VÁF:|:6¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–†¶6ˆÁ7B÷W&vUf«VW4g&ˆ‘&6R“Ü&6R¬&˜r¬&6W2í”‚∞¢6ˆÁ7Bf«VW2“∑”∞¢f˜"Ü6ˆÁ7Bbˆb&6RÊfñV∆G2«¬µ“í∞¢6ˆÁ7B&r“&˜rÊ6V∆«3ÚÂ∂bÊñE”∞¢f«VW5∂bÊÊ÷U“–¢bÁGóR””“'&V∆Fñˆ‚ ¢Ú&V6˜&D∆&V¬ÇÜ&6W2«¬µ“íÊfñÊBÇÜ"í”‚"ÊñB””“bÁF&vWD&6TñBí¬&rí«¬" ¢¢f˜&÷D6V∆≈f«VRÜbÁGóR¬&rí«¬"#∞¢–¢&WGW&‚f«VW3∞ß”∞†¶6ˆÁ7B÷W&vUf«VW4g&ˆ‘6ˆÁF7B“Ü6ˆÁF7Bí”‚á∞¢Êˆ÷S¢6ˆÁF7BÊÊ÷R«¬""¿¢6ˆÁFFÛ¢6ˆÁF7BÁÜˆÊR«¬6ˆÁF7BÊV÷ñ¬«¬6ˆÁF7BÊ6ˆÁF7B«¬""¿¢V◊&W6¢6ˆÁF7BÊ6ˆ◊Áí«¬6ˆÁF7BÊ'W6ñÊW72«¬""¿¢ˆ'6W'f6Û¢6ˆÁF7BÊÊ˜FW2«¬6ˆÁF7BÊÊ˜FR«¬""¿ß“ì∞†¶gVÊ7Fñˆ‚÷ñƒ÷W&vT÷ˆF¬á≤F"¬'W6ñÊW72¬ˆ‰6∆˜6R¬ˆ‰vVÊW&FR¬6WEFˆ7B“í∞¢6ˆÁ7B&6W2“ÜF"ÊFF&6W2«¬µ“íÊfñ«FW"Ä¢Ü"í”‚'W6ñÊW72«¬"Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñB¿¢ì∞¢6ˆÁ7B6˜W&6W2“∞¢≤ñC¢&6ˆÁFF˜2"¬Ê÷S¢$6ˆÁFF˜2"¬fñV∆G3¢≤&Êˆ÷R"¬&6ˆÁFFÚ"¬&V◊&W6"¬&ˆ'6W'f6Ú%““¿¢‚‚Ê&6W2Ê÷ÇÜ"í”‚á∞¢ñC¢"ÊñB¿¢Ê÷S¢"ÊÊ÷R¿¢fñV∆G3¢Ü"ÊfñV∆G2«¬µ“íÊ÷ÇÜbí”‚bÊÊ÷Rí¿¢&6S¢"¿¢“íí¿¢”∞¢6ˆÁ7B∑6˜W&6TñB¬6WE6˜W&6TñE““W6U7FFRá6˜W&6W5≥”ÚÊñB«¬&6ˆÁFF˜2"ì∞¢6ˆÁ7B∑FóF∆UGFW&‚¬6WEFóF∆UGFW&Â““W6U7FFRÇ$6'F(	B∑∂Êˆ÷W◊“"ì∞¢6ˆÁ7B∑FV◊∆FR¬6WEFV◊∆FU““W6U7FFRÄ¢$ˆÃ:∑∂Êˆ÷W◊“≈∆Â∆‰W67&WfVí7V÷VÁ6vV“W'6ˆÊ∆ó¶FÂ∆Â∆‰FVÊ6ñ˜6÷VÁFR¬"¿¢ì∞†¢6ˆÁ7B6˜W&6R“6˜W&6W2ÊfñÊBÇá2í”‚2ÊñB””“6˜W&6TñBí«¬6˜W&6W5≥”∞¢6ˆÁ7B&V6˜&G2“6˜W&6SÚÊ&6P¢Úá6˜W&6RÊ&6RÁ&˜w2«¬µ“íÊ÷Çá"í”‡¢÷W&vUf«VW4g&ˆ‘&6Rá6˜W&6RÊ&6R¬"¬&6W2í¿¢ê¢¢ÜF"Ê6ˆÁF7G2«¬µ“ê¢Êfñ«FW"ÇÜ2í”‚'W6ñÊW72«¬2Ê'W6ñÊW74ñB«¬2Ê'W6ñÊW74ñB””“'W6ñÊW72ÊñBê¢Ê÷Ü÷W&vUf«VW4g&ˆ‘6ˆÁF7Bì∞†¢6ˆÁ7BñÁ6W'DfñV∆B“ÜÊ÷Rí”‚6WEFV◊∆FRÇáBí”‚G∑G◊∑≤G∂Ê÷W◊◊÷ì∞¢6ˆÁ7B&WfñWr“&V6˜&G5≥–¢Ú«î÷W&vTfñV∆G2áFV◊∆FR¬&V6˜&G5≥“ê¢¢"á6V“&Vvó7G&˜2ÊW7FfˆÁFRí#∞†¢6ˆÁ7BvVÊW&FR“Çí”‚∞¢ñbá&V6˜&G2Ê∆VÊwFÇ””“í∞¢6WEFˆ7BÇ$W76fˆÁFRÏ:6ÚFV“&Vvó7G&˜2‚"ì∞¢&WGW&„∞¢–¢6ˆÁ7BFˆ72“&V6˜&G2Ê÷Çáf«VW2í”‚á∞¢FóF∆S¢«î÷W&vTfñV∆G2áFóF∆UGFW&‚¬f«VW2íÁG&ñ“Çí«¬$Fˆ7V÷VÁFÚ"¿¢6ˆÁFVÁC¢«î÷W&vTfñV∆G2áFV◊∆FR¬f«VW2í¿¢“íì∞¢ˆ‰vVÊW&FRÜFˆ72ì∞¢”∞†¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S“$÷∆Fó&WF"vñFRˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒfñ∆UFWáBÛ‡¢«7„‡¢W67&WfV“÷ˆFV∆Ú6ˆ“6◊˜2VÁG&R6ÜfW2RvW&RV“Fˆ7V÷VÁF¢W'6ˆÊ∆ó¶FÚ&6F&Vvó7G&ÚFfˆÁFRW66ˆ∆ÜñF‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“$fˆÁFRF˜2FF˜2#‡¢«6V∆V7Bf«VS◊∑6˜W&6TñG“ˆ‰6ÜÊvS◊≤ÜRí”‚6WE6˜W&6TñBÜRÁF&vWBÁf«VRó”‡¢∑6˜W&6W2Ê÷Çá2í”‚Ä¢∆˜Fñˆ‚∂Wì◊∑2ÊñG“f«VS◊∑2ÊñG”‡¢∑2ÊÊ÷W–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%L:◊GV∆ÚFR6FFˆ7V÷VÁFÚ#‡¢∆ñÁW@¢f«VS◊∑FóF∆UGFW&Á–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEFóF∆UGFW&‚ÜRÁF&vWBÁf«VRó–¢Û‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷W&vR÷fñV∆G2#‡¢«7„‰ñÁ6W&ó"6◊Û£¬˜7„‡¢≤á6˜W&6SÚÊfñV∆G2«¬µ“íÊ÷ÇÜÊ÷Rí”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂Ê÷W–¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&6Üó÷'F‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‚ñÁ6W'DfñV∆BÜÊ÷Ró–¢‡¢∂∑≤G∂Ê÷W◊◊÷–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢ƒfñV∆B∆&V√“$÷ˆFV∆ÚFÚFˆ7V÷VÁFÚ#‡¢«FWáF&V¢&˜w3◊≥w–¢f«VS◊∑FV◊∆FW–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEFV◊∆FRÜRÁF&vWBÁf«VRó–¢Û‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“&÷W&vR◊&WfñWr#‡¢«7‚6∆74Ê÷S“&÷W&vR◊&WfñWr÷∆&V¬#‡¢,:ófñÉ+¢FR∑&V6˜&G2Ê∆VÊwFá“&Vvó7G&˜∑&V6˜&G2Ê∆VÊwFÇ””“Ú""¢'2'“ê¢¬˜7„‡¢«&SÁ∑&WfñWw”¬˜&S‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&'F‚&ñ÷'í ¢ˆ‰6∆ñ6≥◊∂vVÊW&FW–¢Fó6&∆VC◊∑&V6˜&G2Ê∆VÊwFÇ””“–¢‡¢vW&"∑&V6˜&G2Ê∆VÊwFá“Fˆ7V÷VÁF˜∑&V6˜&G2Ê∆VÊwFÇ””“Ú""¢'2'–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–††¢ÚÚ8&VFRFW6VÊÜÚF76ñÊGW&Ü÷˜W6R˜RF˜VRí‚FVw&F6ˆ“V∆V|:&Ê6ñVÊF¢ÚÚÚÊfVvF˜"ˆ÷&ñVÁFRÏ:6ÚˆfW&V6R6Áf3¢76ñÊGW&V∆ÚÊˆ÷R6ˆÁFñÁVf∆VÊFÚ‡¶gVÊ7Fñˆ‚6ñvÊGW&UBá≤ˆ‰ñÊ¥6ÜÊvR¬E&Vb“í∞¢6ˆÁ7B6Áf5&Vb“W6U&VbÜÁV∆¬ì∞¢6ˆÁ7BG&vñÊr“W6U&VbÜf«6Rì∞¢6ˆÁ7B∆7B“W6U&VbÜÁV∆¬ì∞¢6ˆÁ7B∂Ü4ñÊ≤¬6WDÜ4ñÊµ““W6U7FFRÜf«6Rì∞†¢6ˆÁ7B6ˆÁFWáB“Çí”‚∞¢G'í∞¢&WGW&‚6Áf5&VbÊ7W'&VÁCÚÊvWD6ˆÁFWáCÚ‚Ç#&B"í«¬ÁV∆√∞¢“6F6Ç∞¢&WGW&‚ÁV∆√∞¢–¢”∞¢6ˆÁ7BˆñÁDˆb“ÜWfVÁBí”‚∞¢6ˆÁ7B6Áf2“6Áf5&VbÊ7W'&VÁC∞¢ñbÇ6Áf3ÚÊvWD&˜VÊFñÊt6∆ñVÁE&V7Bí&WGW&‚ÁV∆√∞¢6ˆÁ7B&V7B“6Áf2ÊvWD&˜VÊFñÊt6∆ñVÁE&V7BÇì∞¢6ˆÁ7BF˜V6Ç“WfVÁBÁF˜V6ÜW3ÚÂ≥”∞¢6ˆÁ7B6∆ñVÁEÇ“F˜V6ÇÚF˜V6ÇÊ6∆ñVÁEÇ¢WfVÁBÊ6∆ñVÁEÉ∞¢6ˆÁ7B6∆ñVÁEí“F˜V6ÇÚF˜V6ÇÊ6∆ñVÁEí¢WfVÁBÊ6∆ñVÁEì∞¢ñbÜ6∆ñVÁEÇ”“ÁV∆¬«¬6∆ñVÁEí”“ÁV∆¬í&WGW&‚ÁV∆√∞¢&WGW&‚∞¢É¢ÇÜ6∆ñVÁEÇ“&V7BÊ∆VgBíÚá&V7BÁvñGFÇ«¬íí¢6Áf2ÁvñGFÇ¿¢ì¢ÇÜ6∆ñVÁEí“&V7BÁF˜íÚá&V7BÊÜVñváB«¬íí¢6Áf2ÊÜVñváB¿¢”∞¢”∞¢6ˆÁ7B7F'B“ÜWfVÁBí”‚∞¢G&vñÊrÊ7W'&VÁB“G'VS∞¢∆7BÊ7W'&VÁB“ˆñÁDˆbÜWfVÁBì∞¢”∞¢6ˆÁ7B÷˜fR“ÜWfVÁBí”‚∞¢ñbÇG&vñÊrÊ7W'&VÁBí&WGW&„∞¢6ˆÁ7B7GÇ“6ˆÁFWáBÇì∞¢6ˆÁ7BˆñÁB“ˆñÁDˆbÜWfVÁBì∞¢ñbÇ7GÇ«¬ˆñÁBí&WGW&„∞¢WfVÁBÁ&WfVÁDFVfV«CÚ‚Çì∞¢7GÇÁ7G&ˆ∂U7Gñ∆R“"3cs&#∞¢7GÇÊ∆ñÊUvñGFÇ“"„C∞¢7GÇÊ∆ñÊT6“'&˜VÊB#∞¢7GÇÊ∆ñÊT¶ˆñ‚“'&˜VÊB#∞¢7GÇÊ&VvñÂFÇÇì∞¢7GÇÊ÷˜fUFÚÜ∆7BÊ7W'&VÁCÚÁÇÛÚˆñÁBÁÇ¬∆7BÊ7W'&VÁCÚÁíÛÚˆñÁBÁíì∞¢7GÇÊ∆ñÊUFÚáˆñÁBÁÇ¬ˆñÁBÁíì∞¢7GÇÁ7G&ˆ∂RÇì∞¢∆7BÊ7W'&VÁB“ˆñÁC∞¢ñbÇÜ4ñÊ≤í∞¢6WDÜ4ñÊ≤áG'VRì∞¢ˆ‰ñÊ¥6ÜÊvSÚ‚áG'VRì∞¢–¢”∞¢6ˆÁ7B7F˜“Çí”‚∞¢G&vñÊrÊ7W'&VÁB“f«6S∞¢∆7BÊ7W'&VÁB“ÁV∆√∞¢”∞¢6ˆÁ7B6∆V"“Çí”‚∞¢6ˆÁ7B7GÇ“6ˆÁFWáBÇì∞¢6ˆÁ7B6Áf2“6Áf5&VbÊ7W'&VÁC∞¢ñbÜ7GÇbb6Áf2í7GÇÊ6∆V%&V7BÉ¬¬6Áf2ÁvñGFÇ¬6Áf2ÊÜVñváBì∞¢6WDÜ4ñÊ≤Üf«6Rì∞¢ˆ‰ñÊ¥6ÜÊvSÚ‚Üf«6Rì∞¢”∞¢6ˆÁ7B&VDñ÷vR“Çí”‚∞¢ñbÇÜ4ñÊ≤í&WGW&‚"#∞¢G'í∞¢&WGW&‚6Áf5&VbÊ7W'&VÁCÚÁFÙFFU$√Ú‚Ç&ñ÷vR˜Êr"í«¬"#∞¢“6F6Ç∞¢&WGW&‚"#∞¢–¢”∞†¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'6ñv‚◊B#‡¢∆6Áf0¢&Vc◊≤ÜÊˆFRí”‚∞¢6Áf5&VbÊ7W'&VÁB“ÊˆFS∞¢ñbÜÊˆFRíÊˆFRÁ&VE6ñvÊGW&R“&VDñ÷vS∞¢ñbáE&VbíE&VbÊ7W'&VÁB“ÊˆFS∞¢◊–¢vñGFÉ◊≥Sc–¢ÜVñváC◊≥É–¢&ñ÷∆&V√“,8&V&FW6VÊÜ"76ñÊGW& ¢ˆ‰÷˜W6TF˜v„◊∑7F'G–¢ˆ‰÷˜W6T÷˜fS◊∂÷˜fW–¢ˆ‰÷˜W6UW◊∑7F˜–¢ˆ‰÷˜W6T∆VfS◊∑7F˜–¢ˆÂF˜V6Ö7F'C◊∑7F'G–¢ˆÂF˜V6Ñ÷˜fS◊∂÷˜fW–¢ˆÂF˜V6ÑVÊC◊∑7F˜–¢Û‡¢∆Fób6∆74Ê÷S“'6ñv‚◊B÷7FñˆÁ2#‡¢«6÷∆√‰FW6VÊÜR7V76ñÊGW&6ˆ“ÚFVFÚ˜RÚ÷˜W6RÜ˜6ñˆÊ¬í„¬˜6÷∆√‡¢∆'WGFˆ‚GóS“&'WGFˆ‚"6∆74Ê÷S“&'F‚vÜ˜7B6“"ˆ‰6∆ñ6≥◊∂6∆V'”‡¢≈G&6É"6ó¶S◊≥G“Û‚∆ñ◊ ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢ì∞ß–†¢ÚÚ÷ˆF¬FR76ñÊGW&V∆WG,;FÊñ66ñ◊∆W2FRV“Fˆ7V÷VÁFÚ‡¶gVÊ7Fñˆ‚6ñv‰Fˆ7V÷VÁD÷ˆF¬á≤Fˆ2¬W6W"¬ˆ‰6∆˜6R¬ˆÂ6ñv‚“í∞¢6ˆÁ7B∂f˜&“¬6WDf˜&’““W6U7FFRá∞¢6ñvÊW$Ê÷S¢W6W#ÚÊÊ÷R«¬""¿¢6ñvÊW$V÷ñ√¢W6W#ÚÊV÷ñ¬«¬""¿¢6ñvÊW%&ˆ∆S¢""¿¢“ì∞¢6ˆÁ7B∂6ˆÊfó&÷VB¬6WD6ˆÊfó&÷VE““W6U7FFRÜf«6Rì∞¢6ˆÁ7BE&Vb“W6U&VbÜÁV∆¬ì∞¢6ˆÁ7B6ñvÊGW&W2“Fˆ2Á6ñvÊGW&W2«¬µ”∞†¢6ˆÁ7B7V&÷óB“ÜWfVÁBí”‚∞¢WfVÁBÁ&WfVÁDFVfV«BÇì∞¢ñbÇf˜&“Á6ñvÊW$Ê÷RÁG&ñ“Çí«¬6ˆÊfó&÷VBí&WGW&„∞¢6ˆÁ7Bñ÷vTFFW&¬“E&VbÊ7W'&VÁCÚÁ&VE6ñvÊGW&SÚ‚Çí«¬"#∞¢ˆÂ6ñv‚Ä¢÷∂U6ñvÊGW&Rá∞¢ñC¢VñBÇí¿¢6ñvÊW$Ê÷S¢f˜&“Á6ñvÊW$Ê÷R¿¢6ñvÊW$V÷ñ√¢f˜&“Á6ñvÊW$V÷ñ¬¿¢6ñvÊW%&ˆ∆S¢f˜&“Á6ñvÊW%&ˆ∆R¿¢6ˆÁFVÁC¢Fˆ2Ê6ˆÁFVÁB¿¢ñ÷vTFFW&¬¿¢“í¿¢ì∞¢”∞†¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S◊∂76ñÊ"(	¬G∂Fˆ2ÁFóF∆Wﬁ(	÷“ˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆f˜&“6∆74Ê÷S“&÷ˆF¬÷&ˆGí"ˆÂ7V&÷óC◊∑7V&÷óG”‡¢«6∆74Ê÷S“'6ñv‚÷Wá∆ñ‚#‡¢76ñÊGW&&Vvó7G&VV“76ñÊ˜R¬VÊFÚ¬RwV&FV÷ñ◊&W7<:6¢FñvóF¬FÚFWáFÚ‚6RÚFˆ7V÷VÁFÚf˜"VFóFFÚFWˆó2¬Úfó6VP¢V∆R◊VF˜R‚8íV÷«7G&ˆÊsÊ76ñÊGW&V∆WG,;FÊñ66ñ◊∆W3¬˜7G&ˆÊs‚Ñ∆Vê¢B„c2Û##í(	BÏ:6Ú7V'7FóGVí6W'Fñfñ6FÚFñvóF¬î5‘'&6ñ¬VÊFÚ¢∆VíWÜñvó"V“‡¢¬˜‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“%VV“W7L:76ñÊÊFÚ#‡¢∆ñÁW@¢&WVó&V@¢WFÙfˆ7W0¢f«VS◊∂f˜&“Á6ñvÊW$Ê÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬6ñvÊW$Ê÷S¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$R÷÷ñ¬Ü˜6ñˆÊ¬í#‡¢∆ñÁW@¢GóS“&V÷ñ¬ ¢f«VS◊∂f˜&“Á6ñvÊW$V÷ñ«–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬6ñvÊW$V÷ñ√¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%V¬ÊÚFˆ7V÷VÁFÚÜ˜6ñˆÊ¬í#‡¢∆ñÁW@¢∆6VÜˆ∆FW#“$6ˆÁG&FF¬6∆ñVÁFR¬FW7FV◊VÊÜ‚‚‚ ¢f«VS◊∂f˜&“Á6ñvÊW%&ˆ∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬6ñvÊW%&ˆ∆S¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢≈6ñvÊGW&UBE&Vc◊∑E&Vg“Û‡¢∆∆&V¬6∆74Ê÷S“'6ñv‚÷6ˆÊfó&“#‡¢∆ñÁW@¢GóS“&6ÜV6∂&˜Ç ¢6ÜV6∂VC◊∂6ˆÊfó&÷VG–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD6ˆÊfó&÷VBÜRÁF&vWBÊ6ÜV6∂VBó–¢Û‡¢«7„‡¢∆íÚFˆ7V÷VÁFÚR6ˆÊ6˜&FÚ6ˆ“Ú6WR6ˆÁF\;¶FÚ¬76ñÊÊF¢V∆WG&ˆÊñ6÷VÁFR‡¢¬˜7„‡¢¬ˆ∆&V√‡¢∑6ñvÊGW&W2Ê∆VÊwFÇ‚bbÄ¢«6∆74Ê÷S“'6ñv‚÷WÜó7FñÊr#‡¢W7FRFˆ7V÷VÁFÚ¨:FV“∑6ñvÊGW&W2Ê∆VÊwFá◊≤"'–¢∑6ñvÊGW&W2Ê∆VÊwFÇ””“Ú&76ñÊGW&"¢&76ñÊGW&2'“‡¢¬˜‡¢ó–¢∆fˆ˜FW"6∆74Ê÷S“&÷ˆF¬÷fˆ˜B#‡¢∆'WGFˆ‚GóS“&'WGFˆ‚"6∆74Ê÷S“&'F‚vÜ˜7B"ˆ‰6∆ñ6≥◊∂ˆ‰6∆˜6W”‡¢6Ê6V∆ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&'F‚"GóS“'7V&÷óB"Fó6&∆VC◊≤6ˆÊfó&÷VG”‡¢≈V‰∆ñÊR6ó¶S◊≥W“Û‚76ñÊ"Fˆ7V÷VÁF¢¬ˆ'WGFˆ„‡¢¬ˆfˆ˜FW#‡¢¬ˆf˜&”‡¢¬Ù÷ˆF√‡¢ì∞ß–†¢ÚÚ∆ó7FF276ñÊGW&2FRV“Fˆ7V÷VÁFÚ¬6ˆ“6ˆÊfW,:¶Ê6ñFRñÁFVw&ñFFR‡¶gVÊ7Fñˆ‚6ñvÊGW&T∆ó7Bá≤Fˆ2¬ˆÂ&V÷˜fR“í∞¢6ˆÁ7B6ñvÊGW&W2“Fˆ2Á6ñvÊGW&W2«¬µ”∞¢ñbá6ñvÊGW&W2Ê∆VÊwFÇ””“í&WGW&‚ÁV∆√∞¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'6ñv‚÷∆ó7B#‡¢∆ÉC‰76ñÊGW&3¬ˆÉC‡¢∑6ñvÊGW&W2Ê÷Çá6ñrí”‚∞¢6ˆÁ7B6ÜV6≤“fW&ñgï6ñvÊGW&Rá6ñr¬Fˆ2Ê6ˆÁFVÁBì∞¢&WGW&‚Ä¢∆'Fñ6∆P¢∂Wì◊∑6ñrÊñG–¢6∆74Ê÷S◊∂6ñv‚÷óFV“G∂6ÜV6≤Áf∆ñBÚ&ˆ≤"¢'v&‚'÷–¢‡¢∑6ñrÊñ÷vTFFW&¬ÚÄ¢∆ñ÷r7&3◊∑6ñrÊñ÷vTFFW&«“«C◊∂76ñÊGW&FRG∑6ñrÁ6ñvÊW$Ê÷W÷“Û‡¢í¢ÁV∆«–¢∆Fóc‡¢«7G&ˆÊs‡¢∑6ñrÁ6ñvÊW$Ê÷W–¢∑6ñrÁ6ñvÊW%&ˆ∆RÚ(	BG∑6ñrÁ6ñvÊW%&ˆ∆W÷¢"'–¢¬˜7G&ˆÊs‡¢∑6ñrÁ6ñvÊW$V÷ñ¬bb«6÷∆√Á∑6ñrÁ6ñvÊW$V÷ñ«”¬˜6÷∆√Á–¢«6÷∆√Á∂ÊWrFFRá6ñrÁ6ñvÊVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó”¬˜6÷∆√‡¢«6÷∆¬6∆74Ê÷S“'6ñv‚÷6ˆFR#‰<;6FñvÛ¢∑6ñrÊ6ˆFW”¬˜6÷∆√‡¢«6÷∆¬6∆74Ê÷S◊∂6ÜV6≤Áf∆ñBÚ'6ñv‚÷ˆ≤"¢'6ñv‚◊v&‚'”‡¢∂6ÜV6≤Áf∆ñBÚƒ&FvT6ÜV6≤6ó¶S◊≥7“Û‚¢ƒ∆W'EG&ñÊv∆R6ó¶S◊≥7“ÛÁ◊≤"'–¢∂6ÜV6≤Ê÷W76vW–¢¬˜6÷∆√‡¢¬ˆFóc‡¢∂ˆÂ&V÷˜fRbbÄ¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&'F‚vÜ˜7B6“FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚ˆÂ&V÷˜fRá6ñrÊñBó–¢FóF∆S“%&V÷˜fW"76ñÊGW& ¢‡¢≈Ç6ó¶S◊≥G“Û‡¢¬ˆ'WGFˆ„‡¢ó–¢¬ˆ'Fñ6∆S‡¢ì∞¢“ó–¢¬ˆFóc‡¢ì∞ß–†¶gVÊ7Fñˆ‚Fˆ7V÷VÁG2á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B¬vÚ¬6V&6Ö6VVB¬6∆V%6V&6Ö6VVB“í∞¢6ˆÁ7B∂÷ˆF¬¬6WD÷ˆF≈““W6U7FFRÜf«6Rí¿¢∂VFóFñÊr¬6WDVFóFñÊu““W6U7FFRÜÁV∆¬í¿¢∑6V&6Ç¬6WE6V&6Ö““W6U7FFRÇ""í¿¢∂î'W7í¬6WDî'W7ï““W6U7FFRÜf«6Rí¿¢∂Wá˜'D'W7í¬6WDWá˜'D'W7ï““W6U7FFRÇ""í¿¢∑W∆ˆFñÊr¬6WEW∆ˆFñÊu““W6U7FFRÜf«6Rí¿¢∑W∆ˆDW'&˜'2¬6WEW∆ˆDW'&˜'5““W6U7FFRÖµ“í¿¢∑FV◊∆FUñ6∂W"¬6WEFV◊∆FUñ6∂W%““W6U7FFRÜf«6Rí¿¢∂÷W&vT˜V‚¬6WD÷W&vT˜VÂ““W6U7FFRÜf«6Rí¿¢∑6ñvÊñÊtñB¬6WE6ñvÊñÊtñE““W6U7FFRÜÁV∆¬í¿¢∂G&vvñÊr¬6WDG&vvñÊu““W6U7FFRÜf«6Rì∞¢6ˆÁ7B6V&6ÖFW&““6V&6Ö6VVB«¬6V&6É∞¢W6TVffV7BÇÇí”‚∞¢ñbÇ6V&6Ö6VVBí&WGW&‚VÊFVfñÊVC∞¢6ˆÁ7BñB“6WEFñ÷V˜WBÇÇí”‚∞¢6∆V%6V&6Ö6VVCÚ‚Çì∞¢“¬ì∞¢&WGW&‚Çí”‚6∆V%Fñ÷V˜WBÜñBì∞¢“¬∂6∆V%6V&6Ö6VVB¬6V&6Ö6VVE“ì∞¢6ˆÁ7B∑fó6ñ&∆T6˜VÁB¬6WEfó6ñ&∆T6˜VÁE““W6U7FFRÑƒï5EıtUı4ï§Rì∞¢W6TVffV7BÇÇí”‚∞¢6ˆÁ7BñB“6WEFñ÷V˜WBÇÇí”‚6WEfó6ñ&∆T6˜VÁBÑƒï5EıtUı4ï§Rí¬ì∞¢&WGW&‚Çí”‚6∆V%Fñ÷V˜WBÜñBì∞¢“¬∑6V&6ÖFW&’“ì∞¢6ˆÁ7BW∆ˆE&Vb“W6U&VbÜÁV∆¬ì∞¢6ˆÁ7B&∆ˆ6¥6ˆÁFWáB“∞¢7ñÊ6VD&∆ˆ6∑3¢F"Á7ñÊ6VD&∆ˆ6∑2«¬µ“¿¢FF&6W3¢F"ÊFF&6W2«¬µ“¿¢f˜&◊3¢F"ÁV&∆ñ4f˜&◊2«¬µ“¿¢Fˆ7V÷VÁG3¢F"ÊFˆ7V÷VÁG2«¬µ“¿¢&ˆ¶V7G3¢F"Á&ˆ¶V7G2«¬µ“¿¢”∞¢6ˆÁ7B&W6ˆ«fVDFˆ7V÷VÁD6ˆÁFVÁB“ÜFˆ7V÷VÁBí”‡¢'&íÊó4'&íÜFˆ7V÷VÁCÚÊ&∆ˆ6∑2íbbFˆ7V÷VÁBÊ&∆ˆ6∑2Ê∆VÊwFÄ¢ÚFˆ7V÷VÁD&∆ˆ6∑5FıFWáBÜFˆ7V÷VÁBÊ&∆ˆ6∑2¬&∆ˆ6¥6ˆÁFWáBê¢¢Fˆ7V÷VÁCÚÊ6ˆÁFVÁB«¬"#∞¢6ˆÁ7BFˆ72“F"ÊFˆ7V÷VÁG2Êfñ«FW"Ä¢ÜFˆ7V÷VÁBí”‡¢Ç'W6ñÊW72«¬Fˆ7V÷VÁBÊ'W6ñÊW74ñB””“'W6ñÊW72ÊñBíb`¢G∂Fˆ7V÷VÁBÁFóF∆W“G∂Fˆ7V÷VÁBÁGóR«¬"'“G∞¢Fˆ7V÷VÁBÊ˜&ñvñÊƒfñ∆TÊ÷R«¬" ¢“G∑&W6ˆ«fVDFˆ7V÷VÁD6ˆÁFVÁBÜFˆ7V÷VÁBó÷ ¢ÁFÙ∆˜vW$66RÇê¢ÊñÊ6«VFW2á6V&6ÖFW&“ÁFÙ∆˜vW$66RÇíí¿¢ì∞¢6ˆÁ7B&∆Ê¥Fˆ7V÷VÁB“∞¢FóF∆S¢""¿¢GóS¢%&˜˜7F6ˆ÷W&6ñ¬"¿¢6ˆÁFVÁC¢""¿¢&∆ˆ6∑3¢µ“¿¢6ñvÊGW&W3¢µ“¿¢fó6ñ&ñ∆óGì¢'&ófFÚ"¿¢6Ü&ñÊuW&÷ó76ñˆ„¢'fó7V∆ó¶""¿¢6Ü&VEvóFÉ¢µ“¿¢6Ü&VEFV◊3¢µ“¿¢&ˆ¶V7C¢""¿¢”∞¢6ˆÁ7B∂f˜&“¬6WDf˜&’““W6U7FFRÜ&∆Ê¥Fˆ7V÷VÁBì∞¢6ˆÁ7BF6µ&ˆ¶V7G2“∞¢‚‚ÊÊWr6WBÖ∞¢‚‚‚ÜF"Á&ˆ¶V7G2«¬µ“íÊ÷Çáí”‚ÊÊ÷Rí¿¢‚‚‚ÜF"ÁF6∑2«¬µ“íÊ÷ÇáBí”‚BÁ&ˆ¶V7BíÊfñ«FW"Ñ&ˆˆ∆V‚í¿¢“í¿¢”∞¢6ˆÁ7B˜V‚“ÜBí”‚∞¢6ˆÁ7BÊWáB“BÚ≤‚‚Ê&∆Ê¥Fˆ7V÷VÁB¬‚‚ÊB“¢≤‚‚Ê&∆Ê¥Fˆ7V÷VÁB”∞¢ÊWáBÊ&∆ˆ6∑2“Ê˜&÷∆ó¶TFˆ7V÷VÁD&∆ˆ6∑2ÜCÚÊ&∆ˆ6∑2¬CÚÊ6ˆÁFVÁBì∞¢ÊWáBÊ6ˆÁFVÁB“&W6ˆ«fVDFˆ7V÷VÁD6ˆÁFVÁBÜÊWáBì∞¢6WDf˜&“ÜÊWáBì∞¢6WDVFóFñÊrÜCÚÊñB«¬ÁV∆¬ì∞¢6WD÷ˆF¬áG'VRì∞¢”∞¢6ˆÁ7B6ñvÊñÊu&V6˜&B“F"ÊFˆ7V÷VÁG2ÊfñÊBÇÜBí”‚BÊñB””“6ñvÊñÊtñBí«¬ÁV∆√∞¢6ˆÁ7B6ñvÊñÊtFˆ2“6ñvÊñÊu&V6˜&@¢Ú≤‚‚Á6ñvÊñÊu&V6˜&B¬6ˆÁFVÁC¢&W6ˆ«fVDFˆ7V÷VÁD6ˆÁFVÁBá6ñvÊñÊu&V6˜&Bí–¢¢ÁV∆√∞¢6ˆÁ7BF6ÑFˆ7V÷VÁB“ÜñB¬WFFW"í”‡¢WFFRÇá&Wbí”‚á∞¢‚‚Á&Wb¿¢Fˆ7V÷VÁG3¢&WbÊFˆ7V÷VÁG2Ê÷ÇÜBí”‚ÜBÊñB””“ñBÚWFFW"ÜBí¢Bíí¿¢“íì∞¢6ˆÁ7BFE6ñvÊGW&R“á6ñvÊGW&Rí”‚∞¢F6ÑFˆ7V÷VÁBá6ñvÊñÊtñB¬ÜBí”‚á∞¢‚‚ÊB¿¢6ñvÊGW&W3¢≤‚‚‚ÜBÁ6ñvÊGW&W2«¬µ“í¬6ñvÊGW&U“¿¢“íì∞¢6WE6ñvÊñÊtñBÜÁV∆¬ì∞¢6WEFˆ7BÜFˆ7V÷VÁFÚ76ñÊFÚ(	B<;6FñvÚG∑6ñvÊGW&RÊ6ˆFW÷ì∞¢G&6µ&ˆGV7DWfVÁBÇ&Fˆ7V÷VÁE˜6ñvÊVB"¬≤÷ˆGV∆S¢&Fˆ7V÷VÁF˜2"“ì∞¢”∞¢6ˆÁ7B&V÷˜fU6ñvÊGW&R“ÜFˆ4ñB¬6ñvÊGW&TñBí”‚∞¢ñbÇvñÊF˜rÊ6ˆÊfó&“Ç%&V÷˜fW"W7F76ñÊGW&FÚFˆ7V÷VÁFÛÚ"íí&WGW&„∞¢F6ÑFˆ7V÷VÁBÜFˆ4ñB¬ÜBí”‚á∞¢‚‚ÊB¿¢6ñvÊGW&W3¢ÜBÁ6ñvÊGW&W2«¬µ“íÊfñ«FW"Çá2í”‚2ÊñB”“6ñvÊGW&TñBí¿¢“íì∞¢”∞†¢6ˆÁ7B«ïFV◊∆FR“áFV◊∆FRí”‚∞¢6WEFV◊∆FUñ6∂W"Üf«6Rì∞¢˜V‚á∞¢‚‚Ê&∆Ê¥Fˆ7V÷VÁB¿¢FóF∆S¢FV◊∆FRÊÊ÷R¿¢GóS¢FV◊∆FRÁGóR¿¢6ˆÁFVÁC¢fñ∆ƒFˆ5FV◊∆FRáFV◊∆FR¬≤'W6ñÊW73¢'W6ñÊW73ÚÊÊ÷R“í¿¢&∆ˆ6∑3¢FWáEFÙFˆ7V÷VÁD&∆ˆ6∑2Ä¢fñ∆ƒFˆ5FV◊∆FRáFV◊∆FR¬≤'W6ñÊW73¢'W6ñÊW73ÚÊÊ÷R“í¿¢í¿¢“ì∞¢G&6µ&ˆGV7DWfVÁBÇ&Fˆ7V÷VÁE˜FV◊∆FU˜W6VB"¬∞¢÷ˆGV∆S¢&Fˆ7V÷VÁF˜2"¿¢FV◊∆FS¢FV◊∆FRÊñB¿¢“ì∞¢”∞¢6ˆÁ7BvVÊW&FT÷W&vR“ÜFˆ72í”‚∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢6ˆÁ7B7&VFVB“Fˆ72Ê÷ÇÜBí”‚á∞¢‚‚Ê&∆Ê¥Fˆ7V÷VÁB¿¢ñC¢VñBÇí¿¢FóF∆S¢BÁFóF∆R¿¢GóS¢$÷∆Fó&WF"¿¢6ˆÁFVÁC¢BÊ6ˆÁFVÁB¿¢&∆ˆ6∑3¢FWáEFÙFˆ7V÷VÁD&∆ˆ6∑2ÜBÊ6ˆÁFVÁBí¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢WFFVDC¢Ê˜r¿¢“íì∞¢WFFRÇá&Wbí”‚á≤‚‚Á&Wb¬Fˆ7V÷VÁG3¢≤‚‚Ê7&VFVB¬‚‚Á&WbÊFˆ7V÷VÁG5““íì∞¢G&6µ&ˆGV7DWfVÁBÇ&÷ñ≈ˆ÷W&vUˆvVÊW&FVB"¬∞¢÷ˆGV∆S¢&Fˆ7V÷VÁF˜2"¿¢6˜VÁC¢7&VFVBÊ∆VÊwFÇ¿¢“ì∞¢6WD÷W&vT˜V‚Üf«6Rì∞¢6WEFˆ7BÜG∂7&VFVBÊ∆VÊwFá“Fˆ7V÷VÁF˜2vW&F˜6ì∞¢”∞¢6ˆÁ7Bñ◊˜'Dfñ∆W2“7ñÊ2Üfñ∆T∆ó7Bí”‚∞¢6ˆÁ7Bfñ∆W2“≤‚‚‚Üfñ∆T∆ó7B«¬µ“ï“Á6∆ñ6RÉ¬ì∞¢ñbÇfñ∆W2Ê∆VÊwFÇ«¬W∆ˆFñÊrí&WGW&„∞¢6WEW∆ˆFñÊráG'VRì∞¢6WEW∆ˆDW'&˜'2Öµ“ì∞¢6ˆÁ7Bñ◊˜'FVB“µ”∞¢6ˆÁ7BW'&˜'2“µ”∞¢f˜"Ü6ˆÁ7Bfñ∆Rˆbfñ∆W2í∞¢G'í∞¢6ˆÁ7BWáG&7FVB“vóBWáG&7DFˆ7V÷VÁEFWáBÜfñ∆Rì∞¢ñ◊˜'FVBÁW6Çá∞¢ñC¢VñBÇí¿¢FóF∆S¢Fˆ7V÷VÁEFóF∆Tg&ˆ‘fñ∆VÊ÷RÜfñ∆RÊÊ÷Rí¿¢GóS¢WáG&7FVBÊ∂ñÊBÊ∆&V¬¿¢6ˆÁFVÁC¢WáG&7FVBÊ6ˆÁFVÁB¿¢&∆ˆ6∑3¢FWáEFÙFˆ7V÷VÁD&∆ˆ6∑2ÜWáG&7FVBÊ6ˆÁFVÁBí¿¢˜&ñvñÊƒfñ∆TÊ÷S¢fñ∆RÊÊ÷R¿¢˜&ñvñÊƒ÷ñ÷UGóS¢fñ∆RÁGóR«¬&∆ñ6Fñˆ‚ˆˆ7FWB◊7G&V“"¿¢˜&ñvñÊ≈6ó¶S¢fñ∆RÁ6ó¶R¿¢ñ◊˜'FVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢ñ◊˜'FVD6ˆÁFVÁEG'VÊ6FVC¢WáG&7FVBÁG'VÊ6FVB¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢fW'6ñˆÁ3¢µ“¿¢“ì∞¢“6F6ÇÜW'&˜"í∞¢W'&˜'2ÁW6Çá≤Ê÷S¢fñ∆RÊÊ÷R¬÷W76vS¢W'&˜"Ê÷W76vR“ì∞¢–¢–¢ñbÜñ◊˜'FVBÊ∆VÊwFÇê¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢Fˆ7V÷VÁG3¢≤‚‚Êñ◊˜'FVB¬‚‚ÊBÊFˆ7V÷VÁG5“¿¢“íì∞¢6WEW∆ˆDW'&˜'2ÜW'&˜'2ì∞¢ñbÜñ◊˜'FVBÊ∆VÊwFÇbbW'&˜'2Ê∆VÊwFÇê¢6WEFˆ7BÄ¢ñ◊˜'FVBÊ∆VÊwFÇ””“¢Ú$Fˆ7V÷VÁFÚñ◊˜'FFÚR&ˆÁFÚ&VFóF" ¢¢G∂ñ◊˜'FVBÊ∆VÊwFá“Fˆ7V÷VÁF˜2ñ◊˜'FF˜6¿¢ì∞¢V«6RñbÜñ◊˜'FVBÊ∆VÊwFÇê¢6WEFˆ7BÄ¢G∂ñ◊˜'FVBÊ∆VÊwFá“ñ◊˜'FF˜3≤G∂W'&˜'2Ê∆VÊwFá“Ï:6ÚVFW&“6W"∆ñF˜6¿¢ì∞¢V«6R6WEFˆ7BÇ$ÊVÊáV“Fˆ7V÷VÁFÚ;FFR6W"ñ◊˜'FFÚ"ì∞¢G&6µ&ˆGV7DWfVÁBÇ&ñ◊˜'Eˆ6ˆ◊∆WFVB"¬∞¢÷ˆGV∆S¢&Fˆ7V÷VÁF˜2"¿¢6˜VÁC¢ñ◊˜'FVBÊ∆VÊwFÇ¿¢7V66W73¢ñ◊˜'FVBÊ∆VÊwFÇ‚¿¢“ì∞¢6WEW∆ˆFñÊrÜf«6Rì∞¢ñbáW∆ˆE&VbÊ7W'&VÁBíW∆ˆE&VbÊ7W'&VÁBÁf«VR“"#∞¢”∞¢6ˆÁ7B6fR“ÜRí”‚∞¢RÁ&WfVÁDFVfV«BÇì∞¢ñbÇf˜&“ÁFóF∆RÁG&ñ“Çíí&WGW&„∞¢6ˆÁ7B&Wfñ˜W2“VFóFñÊp¢ÚF"ÊFˆ7V÷VÁG2ÊfñÊBÇáÇí”‚ÇÊñB””“VFóFñÊrê¢¢ÁV∆√∞¢6ˆÁ7B&∆ˆ6∑2“Ê˜&÷∆ó¶TFˆ7V÷VÁD&∆ˆ6∑2Üf˜&“Ê&∆ˆ6∑2¬f˜&“Ê6ˆÁFVÁBì∞¢6ˆÁ7B6ˆÁFVÁB“Fˆ7V÷VÁD&∆ˆ6∑5FıFWáBÜ&∆ˆ6∑2¬&∆ˆ6¥6ˆÁFWáBì∞¢6ˆÁ7B&Wfñ˜W4&∆ˆ6∑2“&Wfñ˜W0¢ÚÊ˜&÷∆ó¶TFˆ7V÷VÁD&∆ˆ6∑2á&Wfñ˜W2Ê&∆ˆ6∑2¬&Wfñ˜W2Ê6ˆÁFVÁBê¢¢µ”∞¢6ˆÁ7B6ÜÊvVB–¢&Wfñ˜W2b`¢á&Wfñ˜W2ÁFóF∆R”“f˜&“ÁFóF∆R«¿¢&Wfñ˜W2ÁGóR”“f˜&“ÁGóR«¿¢&Wfñ˜W2Ê6ˆÁFVÁB”“6ˆÁFVÁB«¿¢•4Ù‚Á7G&ñÊvñgíá&Wfñ˜W4&∆ˆ6∑2í”“•4Ù‚Á7G&ñÊvñgíÜ&∆ˆ6∑2íì∞¢6ˆÁ7BóFV““∞¢‚‚Êf˜&“¿¢&∆ˆ6∑2¿¢6ˆÁFVÁB¿¢ñC¢VFóFñÊr«¬VñBÇí¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢f˜&“Ê˜vÊW$ñB«¬F"ÁW6W"ÊñB¿¢WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢fW'6ñˆÁ3¢6ÜÊvV@¢Ú∞¢‚‚‚á&Wfñ˜W2ÁfW'6ñˆÁ2«¬µ“í¿¢∞¢FóF∆S¢&Wfñ˜W2ÁFóF∆R¿¢GóS¢&Wfñ˜W2ÁGóR¿¢6ˆÁFVÁC¢&Wfñ˜W2Ê6ˆÁFVÁB¿¢&∆ˆ6∑3¢&Wfñ˜W4&∆ˆ6∑2¿¢C¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢“¿¢–¢¢&Wfñ˜W3ÚÁfW'6ñˆÁ2«¬µ“¿¢”∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢Fˆ7V÷VÁG3¢VFóFñÊp¢ÚBÊFˆ7V÷VÁG2Ê÷ÇáÇí”‚áÇÊñB””“VFóFñÊrÚóFV“¢Çíê¢¢∂óFV“¬‚‚ÊBÊFˆ7V÷VÁG5“¿¢“íì∞¢6WD÷ˆF¬Üf«6Rì∞¢6WEFˆ7BÇ$Fˆ7V÷VÁFÚ6«fÚ"ì∞¢”∞¢6ˆÁ7B6fT&∆ˆ"“Ü&∆ˆ"¬fñ∆VÊ÷Rí”‚∞¢6ˆÁ7B“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢Êá&Vb“U$¬Ê7&VFTˆ&¶V7EU$¬Ü&∆ˆ"ì∞¢ÊF˜vÊ∆ˆB“fñ∆VÊ÷S∞¢Ê6∆ñ6≤Çì∞¢U$¬Á&Wfˆ∂Tˆ&¶V7EU$¬ÜÊá&Vbì∞¢”∞¢6ˆÁ7BF˜vÊ∆ˆB“7ñÊ2ÜB¬f˜&÷Bí”‚∞¢ñbÇf˜&÷Bí&WGW&„∞¢6WDWá˜'D'W7íÜG∂BÊñG”¢G∂f˜&÷G÷ì∞¢G'í∞¢6ˆÁ7B6ˆÁFVÁB“&W6ˆ«fVDFˆ7V÷VÁD6ˆÁFVÁBÜBì∞¢6ˆÁ7B6ñv‰&∆ˆ6≤“6ñvÊGW&T&∆ˆ6µFWáBÜBÁ6ñvÊGW&W2¬6ˆÁFVÁBì∞¢6ˆÁ7B&ˆGí“6ñv‰&∆ˆ6≤ÚG∂6ˆÁFVÁG’∆Â∆‚G∑6ñv‰&∆ˆ6∑÷¢6ˆÁFVÁC∞¢ñbÜf˜&÷B””“'GáB"í∞¢6fT&∆ˆ"Ä¢ÊWr&∆ˆ"Ö∂G∂BÁFóF∆W’∆Â∆‚G∂&ˆGó÷“¬∞¢GóS¢'FWáB˜∆ñ„∂6Ü'6WC◊WFb”Ç"¿¢“í¿¢G∑6«VvñgíÜBÁFóF∆Ró“ÁGáF¿¢ì∞¢“V«6RñbÜf˜&÷B””“&Fˆ7Ç"í∞¢6ˆÁ7B≤Fˆ7V÷VÁB¬6∂W"¬&w&Ç¬ÜVFñÊt∆WfV¬“–¢vóBñ◊˜'BÇ&Fˆ7Ç"ì∞¢6ˆÁ7Bfñ∆R“ÊWrFˆ7V÷VÁBá∞¢6V7FñˆÁ3¢∞¢∞¢6Üñ∆G&V„¢∞¢ÊWr&w&Çá≤FWáC¢BÁFóF∆R¬ÜVFñÊs¢ÜVFñÊt∆WfV¬ÂDïDƒR“í¿¢ÊWr&w&Çá∞¢FWáC¢BÁGóR¿¢ÜVFñÊs¢ÜVFñÊt∆WfV¬‰ÑTDî‰uÛ"¿¢“í¿¢‚‚Â7G&ñÊrÜ&ˆGí«¬""ê¢Á7∆óBÇ%∆‚"ê¢Ê÷ÇÜ∆ñÊRí”‚ÊWr&w&Çá≤FWáC¢∆ñÊR«¬""“íí¿¢“¿¢“¿¢“¿¢“ì∞¢6fT&∆ˆ"ÜvóB6∂W"ÁFÙ&∆ˆ"Üfñ∆Rí¬G∑6«VvñgíÜBÁFóF∆Ró“ÊFˆ7Üì∞¢“V«6R∞¢6ˆÁ7B≤ß5Db““vóBñ◊˜'BÇ&ß7Fb"ì∞¢6ˆÁ7BFb“ÊWrß5Dbá≤VÊóC¢&÷“"¬f˜&÷C¢&B"“ì∞¢FbÁ6WDfˆÁBÇ&ÜV«fWFñ6"¬&&ˆ∆B"ì∞¢FbÁ6WDfˆÁE6ó¶RÉÇì∞¢FbÁFWáBáFbÁ7∆óEFWáEFı6ó¶RÜBÁFóF∆R¬sRí¬Ç¬#ì∞¢FbÁ6WDfˆÁBÇ&ÜV«fWFñ6"¬&Ê˜&÷¬"ì∞¢FbÁ6WDfˆÁE6ó¶RÉì∞¢FbÁ6WEFWáD6ˆ∆˜"ÉìRì∞¢FbÁFWáBÜBÁGóR¬Ç¬3ì∞¢FbÁ6WEFWáD6ˆ∆˜"É#Rì∞¢FbÁ6WDfˆÁE6ó¶RÉì∞¢6ˆÁ7B∆ñÊW2“FbÁ7∆óEFWáEFı6ó¶RÖ7G&ñÊrÜ&ˆGí«¬""í¬sRì∞¢∆WBí“C#∞¢∆ñÊW2Êf˜$V6ÇÇÜ∆ñÊRí”‚∞¢ñbáí‚#É"í∞¢FbÊFEvRÇì∞¢í“É∞¢–¢FbÁFWáBÜ∆ñÊR¬Ç¬íì∞¢í≥“R„S∞¢“ì∞¢FbÁ6fRÜG∑6«VvñgíÜBÁFóF∆Ró“ÁFfì∞¢–¢6WEFˆ7BÜFˆ7V÷VÁFÚWá˜'FFÚV“G∂f˜&÷BÁFıWW$66RÇó÷ì∞¢G&6µ&ˆGV7DWfVÁBÇ&Wá˜'Eˆ6ˆ◊∆WFVB"¬∞¢÷ˆGV∆S¢&Fˆ7V÷VÁF˜2"¿¢∂ñÊC¢f˜&÷B¿¢7V66W73¢G'VR¿¢“ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬Wá˜'F"W7FRFˆ7V÷VÁFÚ"ì∞¢“fñÊ∆«í∞¢6WDWá˜'D'W7íÇ""ì∞¢–¢”∞¢6ˆÁ7B&VfñÊR“7ñÊ2Çí”‚∞¢6ˆÁ7B7W'&VÁD6ˆÁFVÁB–¢f˜&“Ê6ˆÁFVÁB«¬Fˆ7V÷VÁD&∆ˆ6∑5FıFWáBÜf˜&“Ê&∆ˆ6∑2¬&∆ˆ6¥6ˆÁFWáBì∞¢ñbÜî'W7í«¬7W'&VÁD6ˆÁFVÁBÁG&ñ“Çíí&WGW&„∞¢6WDî'W7íáG'VRì∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢7V6ñ∆ó7C¢$6ˆÁF\;¶FÚ"¿¢&ˆ◊C¢&ñ÷˜&RÚFˆ7V÷VÁFÚ&óÜÚ‚&W6W'fRFˆF˜2˜2fF˜2¬Ï;¶÷W&˜2R6ˆ◊&ˆ÷ó76˜2ñÊf˜&÷F˜3≤6˜'&ñ¶6∆&W¶¬W7G'WGW&R∆ñÊwVvV“‚Ï:6ÚñÁfVÁFRFF˜2‚VÁG&VwVR6ˆ÷VÁFRfW'<:6ÚfñÊ¬FÚFˆ7V÷VÁFÚV“÷&∂F˜v‚Â∆Â∆ÂL:◊GV∆Û¢G∂f˜&“ÁFóF∆W’∆ÂFóÛ¢G∂f˜&“ÁGóW’∆Â∆‚G∂7W'&VÁD6ˆÁFVÁG÷¿¢‚‚Êïv˜&∑76T6ˆÁFWáBÜ'W6ñÊW72í¿¢“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ&W7ˆÁ6RÊˆ≤íFá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$f∆ÜÚ&ñ÷˜&""ì∞¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞¢‚‚Ê7W'&VÁB¿¢6ˆÁFVÁC¢FFÊ6ˆÁFVÁB«¬7W'&VÁBÊ6ˆÁFVÁB¿¢&∆ˆ6∑3¢FFÊ6ˆÁFVÁ@¢ÚFWáEFÙFˆ7V÷VÁD&∆ˆ6∑2ÜFFÊ6ˆÁFVÁBê¢¢7W'&VÁBÊ&∆ˆ6∑2¿¢“íì∞¢6WEFˆ7BÇ%fW'<:6Ú&ñ÷˜&FÊÚVFóF˜#≤6«fR&&Vvó7G&"«FW&:|:6Ú"ì∞¢“6F6ÇÜW'&˜"í∞¢6WEFˆ7BÜW'&˜"Ê÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬&ñ÷˜&"v˜&"ì∞¢“fñÊ∆«í∞¢6WDî'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7B7&VFU7ñÊ6VD&∆ˆ6≤“Çí”‚∞¢6ˆÁ7B&V6˜&B“Ê˜&÷∆ó¶U7ñÊ6VD&∆ˆ6≤Ä¢∞¢Ê÷S¢$Ê˜fÚ6ˆÁF\;¶FÚ&WWFñ∆ó¨:fV¬"¿¢6ˆÁFVÁC¢""¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢fó6ñ&ñ∆óGì¢f˜&“Áfó6ñ&ñ∆óGí¿¢6Ü&ñÊuW&÷ó76ñˆ„¢f˜&“Á6Ü&ñÊuW&÷ó76ñˆ‚¿¢6Ü&VEvóFÉ¢f˜&“Á6Ü&VEvóFÇ¿¢6Ü&VEFV◊3¢f˜&“Á6Ü&VEFV◊2¿¢&ˆ¶V7C¢f˜&“Á&ˆ¶V7B¿¢“¿¢∞¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢“¿¢ì∞¢WFFRÇÜ7W'&VÁBí”‚á∞¢‚‚Ê7W'&VÁB¿¢7ñÊ6VD&∆ˆ6∑3¢∑&V6˜&B¬‚‚‚Ü7W'&VÁBÁ7ñÊ6VD&∆ˆ6∑2«¬µ“ï“¿¢“íì∞¢&WGW&‚&V6˜&BÊñC∞¢”∞¢6ˆÁ7BWFFU7ñÊ6VD&∆ˆ6≤“ÜñB¬F6Çí”‡¢WFFRÇÜ7W'&VÁBí”‚á∞¢‚‚Ê7W'&VÁB¿¢7ñÊ6VD&∆ˆ6∑3¢Ü7W'&VÁBÁ7ñÊ6VD&∆ˆ6∑2«¬µ“íÊ÷Çá&V6˜&Bí”‡¢&V6˜&BÊñB””“ñ@¢ÚÊ˜&÷∆ó¶U7ñÊ6VD&∆ˆ6≤Ä¢≤‚‚Á&V6˜&B¬‚‚ÁF6Ç¬ñC¢&V6˜&BÊñB“¿¢∞¢'W6ñÊW74ñC¢&V6˜&BÊ'W6ñÊW74ñB«¬'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢&V6˜&BÊ˜vÊW$ñB«¬F"ÁW6W"ÊñB¿¢“¿¢ê¢¢&V6˜&B¿¢í¿¢“íì∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$DÙ5T‘TÂDı2 ¢FóF∆S“$7&ñR¬VFóFRR∆WfR6WRG&&∆ÜÚ6ˆ“fˆ<:¢ ¢FWáC“%&˜˜7F2¬∆Ê˜2¬&V∆L;7&ñ˜2R÷FW&ñó2fñ6“˜&vÊó¶F˜2˜"ÊV|;66ñÚ‚ ¢7Fñˆ„◊∞¢∆Fób6∆74Ê÷S“'vR÷7FñˆÁ2#‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊∑W∆ˆFñÊrÚ&Vg&W6Ñ7r¢W∆ˆG–¢Fó6&∆VC◊∑W∆ˆFñÊw–¢ˆ‰6∆ñ6≥◊≤Çí”‚W∆ˆE&VbÊ7W'&VÁCÚÊ6∆ñ6≤Çó–¢‡¢∑W∆ˆFñÊrÚ$ñ◊˜'FÊFÚ‚‚‚"¢$VÁfñ"'Vóf˜2'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊¥fñ∆UFWáG–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEFV◊∆FUñ6∂W"áG'VRó–¢‡¢÷ˆFV∆˜2&ˆÁF˜0¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊µW6W'7–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷W&vT˜V‚áG'VRó–¢‡¢÷∆Fó&WF¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚ñ6ˆ„◊µ«W7“ˆ‰6∆ñ6≥◊≤Çí”‚˜V‚ÜÁV∆¬ó”‡¢Ê˜fÚFˆ7V÷VÁF¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢–¢‡¢∂÷W&vT˜V‚bbÄ¢ƒ÷ñƒ÷W&vT÷ˆF¿¢F#◊∂F'–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢ˆ‰6∆˜6S◊≤Çí”‚6WD÷W&vT˜V‚Üf«6Ró–¢ˆ‰vVÊW&FS◊∂vVÊW&FT÷W&vW–¢Û‡¢ó–¢∑FV◊∆FUñ6∂W"bbÄ¢ƒ÷ˆF¿¢FóF∆S“$6ˆ÷V6RFRV“÷ˆFV∆Ú&ˆÁFÚ ¢vñFP¢ˆ‰6∆˜6S◊≤Çí”‚6WEFV◊∆FUñ6∂W"Üf«6Ró–¢‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒfñ∆UFWáBÛ‡¢«7„‡¢W66ˆ∆ÜV“÷ˆFV∆Ú¬&VVÊ6Ü˜26◊˜2VÁG&R∂6ˆ∆6ÜWFW5“RßW7FP¢:7V&V∆ñFFR‚Ï:6Ú:í6ˆÁ6V∆Ü÷VÁFÚßW,:÷Fñ6Ú(	B&Wfó6RÁFW2FP¢W6"‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'FV◊∆FR÷w&ñB#‡¢¥DÙ5T‘TÂEıDT’ƒDU2Ê÷ÇáFV◊∆FRí”‚Ä¢∆'WGFˆ‡¢∂Wì◊∑FV◊∆FRÊñG–¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“'FV◊∆FR÷6&B ¢ˆ‰6∆ñ6≥◊≤Çí”‚«ïFV◊∆FRáFV◊∆FRó–¢‡¢«7‚6∆74Ê÷S“'FV◊∆FR÷6&B◊GóR#Á∑FV◊∆FRÁGóW”¬˜7„‡¢«7G&ˆÊsÁ∑FV◊∆FRÊÊ÷W”¬˜7G&ˆÊs‡¢«7‚6∆74Ê÷S“'FV◊∆FR÷6&B◊6Vr#Á∑FV◊∆FRÁ6Vv÷VÁG”¬˜7„‡¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–¢ƒ&VFˆˆ∆∂ó@¢&V“&Fˆ7V÷VÁF˜2 ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢∆FóbñC“&Fˆ7V÷VÁB÷∆ñ'&'í"Û‡¢∆ñÁW@¢&Vc◊∑W∆ˆE&Vg–¢6∆74Ê÷S“'fó7V∆«í÷ÜñFFV‚ ¢GóS“&fñ∆R ¢◊V«Fó∆P¢66WC“"ÁFb¬ÊFˆ7Ç¬ÁGáB¬Ê÷B¬Ê÷&∂F˜v‚¬Ê77b∆∆ñ6Fñˆ‚˜Fb∆∆ñ6Fñˆ‚˜fÊBÊ˜VÁÜ÷∆f˜&÷G2÷ˆffñ6VFˆ7V÷VÁBÁv˜&G&ˆ6W76ñÊv÷¬ÊFˆ7V÷VÁB«FWáB˜∆ñ‚«FWáBˆ÷&∂F˜v‚«FWáBˆ77b ¢&ñ÷∆&V√“%6V∆V6ñˆÊ"Fˆ7V÷VÁF˜2&VÁfñ" ¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚ñ◊˜'Dfñ∆W2ÜWfVÁBÁF&vWBÊfñ∆W2ó–¢Û‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S◊∂Fˆ7V÷VÁB÷G&˜¶ˆÊRG∂G&vvñÊrÚ&G&vvñÊr"¢"'÷–¢ˆ‰6∆ñ6≥◊≤Çí”‚W∆ˆE&VbÊ7W'&VÁCÚÊ6∆ñ6≤Çó–¢ˆ‰G&tVÁFW#◊≤ÜWfVÁBí”‚∞¢WfVÁBÁ&WfVÁDFVfV«BÇì∞¢6WDG&vvñÊráG'VRì∞¢◊–¢ˆ‰G&t˜fW#◊≤ÜWfVÁBí”‚WfVÁBÁ&WfVÁDFVfV«BÇó–¢ˆ‰G&t∆VfS◊≤ÜWfVÁBí”‚∞¢WfVÁBÁ&WfVÁDFVfV«BÇì∞¢ñbÇWfVÁBÊ7W'&VÁEF&vWBÊ6ˆÁFñÁ2ÜWfVÁBÁ&V∆FVEF&vWBíê¢6WDG&vvñÊrÜf«6Rì∞¢◊–¢ˆ‰G&˜◊≤ÜWfVÁBí”‚∞¢WfVÁBÁ&WfVÁDFVfV«BÇì∞¢6WDG&vvñÊrÜf«6Rì∞¢ñ◊˜'Dfñ∆W2ÜWfVÁBÊFFG&Á6fW"Êfñ∆W2ì∞¢◊–¢Fó6&∆VC◊∑W∆ˆFñÊw–¢‡¢«7‚6∆74Ê÷S“&Fˆ7V÷VÁB◊W∆ˆB÷ñ6ˆ‚#‡¢∑W∆ˆFñÊrÚ≈&Vg&W6Ñ7rÛ‚¢≈W∆ˆBÛÁ–¢¬˜7„‡¢«7„‡¢«7G&ˆÊs‡¢∑W∆ˆFñÊp¢Ú$∆VÊFÚR˜&vÊó¶ÊFÚ6WW2'Vóf˜2‚‚‚ ¢¢$'&7FRFˆ7V÷VÁF˜2&<:˜R6∆óVR&W66ˆ∆ÜW"'–¢¬˜7G&ˆÊs‡¢«6÷∆√ÂDb¬DÙ5Ç¬EÖB¬÷&∂F˜v‚˜R55b+rL:í‘"˜"'VófÛ¬˜6÷∆√‡¢¬˜7„‡¢¬ˆ'WGFˆ„‡¢∑W∆ˆDW'&˜'2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&Fˆ7V÷VÁB◊W∆ˆB÷W'&˜'2"&ˆ∆S“&∆W'B#‡¢«7G&ˆÊs‰∆wVÁ2'Vóf˜2Ï:6Úf˜&“ñ◊˜'FF˜3£¬˜7G&ˆÊs‡¢∑W∆ˆDW'&˜'2Ê÷ÇÜW'&˜"í”‚Ä¢«7‚∂Wì◊∂G∂W'&˜"ÊÊ÷W““G∂W'&˜"Ê÷W76vW÷”‡¢∆#Á∂W'&˜"ÊÊ÷W”¬ˆ#„¢∂W'&˜"Ê÷W76vW–¢¬˜7„‡¢íó–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'Fˆˆ∆&"#‡¢∆Fób6∆74Ê÷S“'6V&6Ç#‡¢≈6V&6ÇÛ‡¢∆ñÁW@¢f«VS◊∑6V&6ÖFW&◊–¢ˆ‰6ÜÊvS◊≤ÜRí”‚∞¢6WE6V&6ÇÜRÁF&vWBÁf«VRì∞¢6∆V%6V&6Ö6VVCÚ‚Çì∞¢◊–¢∆6VÜˆ∆FW#“%W7Vó6"Fˆ7V÷VÁF˜2 ¢Û‡¢¬ˆFóc‡¢¬ˆFóc‡¢∂Fˆ72Ê∆VÊwFÇ””“ÚÄ¢ƒV◊Gê¢ñ6ˆ„◊¥fñ∆UFWáG–¢FóF∆S“$ÊVÊáV“Fˆ7V÷VÁFÚ7&ñFÚ ¢FWáC“$VÁfñRV“'VófÚ˜R7&ñRV“Fˆ7V÷VÁFÚVFóL:fV¬¬&VfñÊR6ˆ“76ó7L:¶Ê6ññÁFV∆ñvVÁFRRWá˜'FRV“Db¬DÙ5Ç˜REÖB‚ ¢7Fñˆ„“$7&ñ"Fˆ7V÷VÁFÚ ¢ˆ‰7Fñˆ„◊≤Çí”‚˜V‚ÜÁV∆¬ó–¢Û‡¢í¢Ä¢∆Fób6∆74Ê÷S“&Fˆ7V÷VÁB÷w&ñB#‡¢∂Fˆ72Á6∆ñ6RÉ¬fó6ñ&∆T6˜VÁBíÊ÷ÇÜBí”‚Ä¢∆'Fñ6∆R∂Wì◊∂BÊñG”‡¢«7‚6∆74Ê÷S“&Fˆ2÷ñ6ˆ‚#‡¢ƒfñ∆UFWáBÛ‡¢¬˜7„‡¢«7‚6∆74Ê÷S“'Fr#Á∂BÁGóW”¬˜7„‡¢∆É3Á∂BÁFóF∆W”¬ˆÉ3‡¢«‡¢∑&W6ˆ«fVDFˆ7V÷VÁD6ˆÁFVÁBÜBíÁ6∆ñ6RÉ¬í«¬$Fˆ7V÷VÁFÚf¶ñÚ'–¢¬˜‡¢∂BÊ˜&ñvñÊƒfñ∆TÊ÷RbbÄ¢«6÷∆¬6∆74Ê÷S“&Fˆ7V÷VÁB◊6˜W&6R#‡¢≈W∆ˆBÛ‚∂BÊ˜&ñvñÊƒfñ∆TÊ÷W“+w≤"'–¢∂BÊ˜&ñvñÊ≈6ó¶R¬#B¢#@¢ÚG¥÷FÇÊ÷ÇÉ¬÷FÇÁ&˜VÊBÜBÊ˜&ñvñÊ≈6ó¶RÚ#Bíó“¥& ¢¢G≤ÜBÊ˜&ñvñÊ≈6ó¶RÚÉ#B¢#BííÁFÙfóÜVBÉó“‘&–¢¬˜6÷∆√‡¢ó–¢«6÷∆√‡¢GV∆ó¶FÚ∂ÊWrFFRÜBÁWFFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó–¢¬˜6÷∆√‡¢≤ÇÇí”‚∞¢6ˆÁ7B7FGW2“6ñvÊGW&U7FGW2Ä¢BÁ6ñvÊGW&W2¿¢&W6ˆ«fVDFˆ7V÷VÁD6ˆÁFVÁBÜBí¿¢ì∞¢ñbá7FGW2Á7FFR””“'6V“÷76ñÊGW&"í&WGW&‚ÁV∆√∞¢&WGW&‚Ä¢«6÷∆¿¢6∆74Ê÷S◊∂Fˆ2◊6ñv‚÷&FvRG∑7FGW2Á7FFW÷–¢FóF∆S◊∞¢7FGW2Á7FFR””“&76ñÊFÚ ¢Ú$Fˆ7V÷VÁFÚ:÷ÁFVw&ÚFW6FR76ñÊGW& ¢¢$ÚFWáFÚ◊VF˜RFWˆó2FR76ñÊFÚ ¢–¢‡¢∑7FGW2Á7FFR””“&76ñÊFÚ"ÚÄ¢ƒ&FvT6ÜV6≤6ó¶S◊≥7“Û‡¢í¢Ä¢ƒ∆W'EG&ñÊv∆R6ó¶S◊≥7“Û‡¢ó–¢∑7FGW2Á7FFR””“&76ñÊFÚ ¢Ú76ñÊFÚÇG∑7FGW2ÁF˜F«“ñ ¢¢$«FW&FÚ;7276ñÊ"'–¢¬˜6÷∆√‡¢ì∞¢“íÇó–¢∆fˆ˜FW#‡¢∆'WGFˆ‚ˆ‰6∆ñ6≥◊≤Çí”‚˜V‚ÜBó”‡¢ƒVFóC2Û‡¢VFóF ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚ˆ‰6∆ñ6≥◊≤Çí”‚6WE6ñvÊñÊtñBÜBÊñBó”‡¢≈V‰∆ñÊRÛ‡¢76ñÊ ¢¬ˆ'WGFˆ„‡¢∆∆&V¬6∆74Ê÷S“&6ˆ◊7B÷Wá˜'B#‡¢ƒF˜vÊ∆ˆBÛ‡¢«6V∆V7@¢&ñ÷∆&V√◊∂Wá˜'F"G∂BÁFóF∆W÷–¢f«VS“" ¢Fó6&∆VC◊∂Wá˜'D'W7íÁ7F'G5vóFÇÜG∂BÊñG”¶ó–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚F˜vÊ∆ˆBÜB¬WfVÁBÁF&vWBÁf«VRó–¢‡¢∆˜Fñˆ‚f«VS“"#‡¢∂Wá˜'D'W7íÁ7F'G5vóFÇÜG∂BÊñG”¶ê¢Ú$Wá˜'FÊFÚ‚‚‚ ¢¢$Wá˜'F"'–¢¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“'Fb#ÂDc¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&Fˆ7Ç#‰DÙ5É¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“'GáB#ÂEÖC¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢¬ˆ∆&V√‡¢∆'WGFˆ‡¢6∆74Ê÷S“&FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢WFFRÇáÇí”‚á∞¢‚‚ÁÇ¿¢Fˆ7V÷VÁG3¢ÇÊFˆ7V÷VÁG2Êfñ«FW"Çáíí”‚íÊñB”“BÊñBí¿¢“íê¢–¢‡¢≈G&6É"Û‡¢¬ˆ'WGFˆ„‡¢¬ˆfˆ˜FW#‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢ó–¢∂Fˆ72Ê∆VÊwFÇ‚bbÄ¢ƒ∆ˆD÷˜&T'WGFˆ‡¢6Ü˜v„◊¥÷FÇÊ÷ñ‚áfó6ñ&∆T6˜VÁB¬Fˆ72Ê∆VÊwFÇó–¢F˜F√◊∂Fˆ72Ê∆VÊwFá–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEfó6ñ&∆T6˜VÁBÇÜ2í”‚2≤ƒï5EıtUı4ï§Ró–¢Û‡¢ó–¢∂÷ˆF¬bbÄ¢ƒ÷ˆF¿¢FóF∆S◊∂VFóFñÊrÚ$VFóF"Fˆ7V÷VÁFÚ"¢$Ê˜fÚFˆ7V÷VÁFÚ'–¢ˆ‰6∆˜6S◊≤Çí”‚6WD÷ˆF¬Üf«6Ró–¢vñFP¢‡¢∆f˜&“6∆74Ê÷S“&÷ˆF¬÷&ˆGí"ˆÂ7V&÷óC◊∑6fW”‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“%L:◊GV∆Ú#‡¢∆ñÁW@¢&WVó&V@¢WFÙfˆ7W0¢f«VS◊∂f˜&“ÁFóF∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬FóF∆S¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%FóÚ#‡¢«6V∆V7@¢f«VS◊∂f˜&“ÁGóW–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬GóS¢RÁF&vWBÁf«VR“ó–¢‡¢µ∞¢%&˜˜7F6ˆ÷W&6ñ¬"¿¢%∆ÊÚFRÊV|;66ñÚ"¿¢%∆ÊÚFR÷&∂WFñÊr"¿¢$˜,:v÷VÁFÚ"¿¢%&V∆L;7&ñÚ"¿¢$6ÜV6∂∆ó7B"¿¢%&ˆ6VFñ÷VÁFÚ"¿¢$&W6VÁF:|:6Ú"¿¢$'&ñVfñÊr"¿¢%∆ÊÚFR:|:6Ú"¿¢$Fˆ7V÷VÁFÚv˜&B"¿¢%Dbñ◊˜'FFÚ"¿¢$Fˆ7V÷VÁFÚñ◊˜'FFÚ"¿¢%∆Êñ∆Ü55b"¿¢“Ê÷ÇáÇí”‚Ä¢∆˜Fñˆ‚∂Wì◊∑á”Á∑á”¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢∂f˜&“Ê˜&ñvñÊƒfñ∆TÊ÷RbbÄ¢∆Fób6∆74Ê÷S“&Ê˜Fñ6RFˆ7V÷VÁB÷˜&ñvñ‚÷Ê˜Fñ6R#‡¢≈W∆ˆBÛ‡¢«7„‡¢6ˆÁF\;¶FÚñ◊˜'FFÚFR«7G&ˆÊsÁ∂f˜&“Ê˜&ñvñÊƒfñ∆TÊ÷W”¬˜7G&ˆÊs‡¢∂f˜&“Êñ◊˜'FVD6ˆÁFVÁEG'VÊ6FV@¢Ú"‚ÚFWáFÚW&◊VóFÚWáFVÁ6ÚRfˆí∆ñ÷óFFÚ&÷ÁFW"6ñÊ7&ˆÊó¶:|:6Ú6VwW&‚ ¢¢"‚fˆ<:¢ˆFRVFóF"¬&ñ÷˜&"RWá˜'F"Ê˜&÷∆÷VÁFR‚'–¢¬˜7„‡¢¬ˆFóc‡¢ó–¢ƒfñV∆B∆&V√“$6ˆÁF\;¶FÚ#‡¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‡¢6'&VvÊFÚVFóF˜"VÊófW'6¬‚‚‡¢¬ˆFóc‡¢–¢‡¢ƒ&∆ˆ6¥Fˆ7V÷VÁDVFóF˜ ¢&∆ˆ6∑3◊∂f˜&“Ê&∆ˆ6∑7–¢ˆ‰6ÜÊvS◊≤Ü&∆ˆ6∑2í”‡¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞¢‚‚Ê7W'&VÁB¿¢&∆ˆ6∑2¿¢6ˆÁFVÁC¢Fˆ7V÷VÁD&∆ˆ6∑5FıFWáBÜ&∆ˆ6∑2¬&∆ˆ6¥6ˆÁFWáBí¿¢“íê¢–¢F#◊∂F'–¢'W6ñÊW73◊∂'W6ñÊW77–¢7ñÊ6VD&∆ˆ6∑3◊∂F"Á7ñÊ6VD&∆ˆ6∑2«¬µ◊–¢ˆ‰7&VFU7ñÊ6VD&∆ˆ6≥◊∂7&VFU7ñÊ6VD&∆ˆ6∑–¢ˆÂWFFU7ñÊ6VD&∆ˆ6≥◊∑WFFU7ñÊ6VD&∆ˆ6∑–¢Û‡¢¬ı7W7VÁ6S‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“&VFóF˜"◊Fˆˆ«2#‡¢ƒ'WGFˆ‡¢GóS“&'WGFˆ‚ ¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊∂î'W7íÚ&Vg&W6Ñ7r¢vÊE7&∂∆W7–¢Fó6&∆VC◊∂î'W7í«¬f˜&“Ê6ˆÁFVÁBÁG&ñ“Çó–¢ˆ‰6∆ñ6≥◊∑&VfñÊW–¢‡¢∂î'W7íÚ$&ñ÷˜&ÊFÚ‚‚‚"¢$&ñ÷˜&"FWáFÚ'–¢¬Ù'WGFˆ„‡¢«6÷∆√‡¢ÚFWáFÚGV¬W&÷ÊV6RÊÚÜó7L;7&ñ6ÚVÊFÚfˆ<:¢6«fÊ˜f¢fW'<:6Ú‡¢¬˜6÷∆√‡¢¬ˆFóc‡¢∂VFóFñÊrbbÜf˜&“ÁfW'6ñˆÁ2«¬µ“íÊ∆VÊwFÇ‚bbÄ¢«6V7Fñˆ‚6∆74Ê÷S“'fW'6ñˆ‚÷Üó7F˜'í#‡¢«7G&ˆÊsÂfW'<;VW2ÁFW&ñ˜&W3¬˜7G&ˆÊs‡¢«Â&W7FW&RV÷fW'<:6Ú&ÚVFóF˜"ÁFW2FR6«f"„¬˜‡¢∆Fóc‡¢µ≤‚‚‚Üf˜&“ÁfW'6ñˆÁ2«¬µ“ï–¢Á&WfW'6RÇê¢Ê÷ÇáfW'6ñˆ‚¬ñÊFWÇí”‚Ä¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢∂Wì◊∂G∑fW'6ñˆ‚ÊG““G∂ñÊFWá÷–¢ˆ‰6∆ñ6≥◊≤Çí”‡¢6WDf˜&“ÇÜ7W'&VÁBí”‚∞¢6ˆÁ7B&∆ˆ6∑2“Ê˜&÷∆ó¶TFˆ7V÷VÁD&∆ˆ6∑2Ä¢fW'6ñˆ‚Ê&∆ˆ6∑2¿¢fW'6ñˆ‚Ê6ˆÁFVÁB¿¢ì∞¢&WGW&‚∞¢‚‚Ê7W'&VÁB¿¢FóF∆S¢fW'6ñˆ‚ÁFóF∆R«¬7W'&VÁBÁFóF∆R¿¢GóS¢fW'6ñˆ‚ÁGóR«¬7W'&VÁBÁGóR¿¢&∆ˆ6∑2¿¢6ˆÁFVÁC¢Fˆ7V÷VÁD&∆ˆ6∑5FıFWáBÄ¢&∆ˆ6∑2¿¢&∆ˆ6¥6ˆÁFWáB¿¢í¿¢”∞¢“ê¢–¢‡¢≈&˜FFT67rÛ‡¢∂ÊWrFFRáfW'6ñˆ‚ÊBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ó–¢∂VFóFñÊrbbÄ¢≈6ñvÊGW&T∆ó7@¢Fˆ3◊∑≤‚‚Êf˜&“¬ñC¢VFóFñÊr◊–¢ˆÂ&V÷˜fS◊≤á6ñtñBí”‚&V÷˜fU6ñvÊGW&RÜVFóFñÊr¬6ñtñBó–¢Û‡¢ó–¢≈6Ü&ñÊtfñV∆G0¢f«VS◊∑∞¢fó6ñ&ñ∆óGì¢f˜&“Áfó6ñ&ñ∆óGí¿¢6Ü&ñÊuW&÷ó76ñˆ„¢f˜&“Á6Ü&ñÊuW&÷ó76ñˆ‚¿¢6Ü&VEvóFÉ¢f˜&“Á6Ü&VEvóFÇ¿¢6Ü&VEFV◊3¢f˜&“Á6Ü&VEFV◊2¿¢&ˆ¶V7C¢f˜&“Á&ˆ¶V7B¿¢◊–¢ˆ‰6ÜÊvS◊≤ÜÊWáBí”‚6WDf˜&“á≤‚‚Êf˜&“¬‚‚ÊÊWáB“ó–¢FV◊3◊∂F"ÁFV◊7–¢&ˆ¶V7D˜FñˆÁ3◊∑F6µ&ˆ¶V7G7–¢Û‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆF¬Üf«6Ró”‡¢6Ê6V∆ ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚GóS“'7V&÷óB"ñ6ˆ„◊µ6fW”‡¢6«f"Fˆ7V÷VÁF¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆf˜&”‡¢¬Ù÷ˆF√‡¢ó–¢∑6ñvÊñÊtFˆ2bbÄ¢≈6ñv‰Fˆ7V÷VÁD÷ˆF¿¢Fˆ3◊∑6ñvÊñÊtFˆ7–¢W6W#◊∂F"ÁW6W'–¢ˆ‰6∆˜6S◊≤Çí”‚6WE6ñvÊñÊtñBÜÁV∆¬ó–¢ˆÂ6ñv„◊∂FE6ñvÊGW&W–¢Û‡¢ó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶Wá˜'BgVÊ7Fñˆ‚∆ˆˆ∑4∆ñ∂U6óFTñÁ7G'V7Fñˆ‚áf«VRí∞¢6ˆÁ7BFWáB“7G&ñÊráf«VR«¬""ê¢ÁG&ñ“Çê¢ÁFÙ∆˜vW$66RÇì∞¢&WGW&‚Ä¢ı‚Ü7&ñW∆7&ñ'∆vW&W∆vW&'∆f:v∆f¶W'∆FW6VÁfˆ«f∆÷ˆÁFW∆6ˆÁ7G'Vï∆"ÚÁFW7BÄ¢FWáB¿¢í«¿¢ı∆"ÜÚ6óFW∆:vñÊ∆∆ÊFñÊrvRíÜFWfW«&V6ó6«FV“VRï∆"ÚÁFW7BáFWáBí«¿¢ı∆"Ü&W6VÁFW∆Wá∆óVW∆÷˜7G&W∆ñÊ6«Vï∆"Á≥√É’∆"á6óFW«:vñÊ«∆Ff˜&÷ï∆"ÚÁFW7BÄ¢FWáB¿¢ê¢ì∞ß–†¶6ˆÁ7B6óFTf∆∆&6¥FW67&óFñˆ‚“Üf˜&“í”‚∞¢6ˆÁ7BÊ÷R“f˜&“ÊÊ÷R«¬$Ê˜76ÚÊV|;66ñÚ#∞¢6ˆÁ7B6Vv÷VÁB“f˜&“Á6Vv÷VÁ@¢ÚV“Gµ7G&ñÊrÜf˜&“Á6Vv÷VÁBíÁFÙ∆˜vW$66RÇó÷ ¢¢"#∞¢&WGW&‚G∂Ê÷W“ˆfW&V6R6ˆ«\:|;VW2G∑6Vv÷VÁG“6ˆ“FVÊFñ÷VÁFÚ,;7Üñ÷Ú¬6∆&W¶Rfˆ6ÚÊÚVR6F6∆ñVÁFR&V6ó6Ê∞ß”∞†¶6ˆÁ7B6óFU6W'fñ6W2“áf«VRí”‚∞¢6ˆÁ7B6˜W&6R“'&íÊó4'&íáf«VRê¢Úf«VP¢¢7G&ñÊrÄ¢f«VR«¿¢$FVÊFñ÷VÁFÚW'6ˆÊ∆ó¶Fı∆Â6ˆ«\:|:6Ú6ˆ"÷VFñF∆‰6ˆ◊ÊÜ÷VÁFÚ,;7Üñ÷Ú"¿¢ê¢Á7∆óBÇ%∆‚"ê¢Êfñ«FW"Ñ&ˆˆ∆V‚ì∞¢&WGW&‚6˜W&6RÁ6∆ñ6RÉ¬ÇíÊ÷ÇÜóFV“í”‡¢GóVˆbóFV“””“'7G&ñÊr ¢Ú∞¢FóF∆S¢óFV“ÁG&ñ“Çí¿¢FW67&óFñˆ„†¢%V÷6ˆ«\:|:6Ú6ˆÊGW¶ñF6ˆ“6∆&W¶¬7VñFFÚR6ˆ◊ÊÜ÷VÁFÚV“6FWF‚"¿¢–¢¢∞¢FóF∆S¢7G&ñÊrÜóFV”ÚÁFóF∆R«¬%6ˆ«\:|:6Ú"íÁG&ñ“Çí¿¢FW67&óFñˆ„¢7G&ñÊrÄ¢óFV”ÚÊFW67&óFñˆ‚«¿¢$6ˆÁfW'6R6ˆÊ˜66Ú&VÁFVÊFW"6ˆ÷ÚW7F6ˆ«\:|:6ÚˆFRßVF"‚"¿¢íÁG&ñ“Çí¿¢“¿¢ì∞ß”∞†¶Wá˜'BgVÊ7Fñˆ‚÷W&vU6óFT'&ñVbÜ&6R¬F6Çí∞¢6ˆÁ7B∆∆˜vVB“∞¢&Ê÷R"¿¢'6Vv÷VÁB"¿¢&ÜVF∆ñÊR"¿¢&FW67&óFñˆ‚"¿¢&&˜WEFóF∆R"¿¢&&˜WB"¿¢'6W'fñ6W2"¿¢&7F"¿¢&6ˆÁF7B"¿¢&6ˆ∆˜""¿¢&f"¿¢&ÜW&ı7Gñ∆R"¿¢&fVGW&W2"¿¢&Üˆ÷T&∆ˆ6∑2"¿¢”∞¢6ˆÁ7BÊWáB“≤‚‚Ê&6R”∞¢∆∆˜vVBÊf˜$V6ÇÇÜ∂Wíí”‚∞¢ñbáF6ÉÚÂ∂∂Wï“”“VÊFVfñÊVBbbF6Ö∂∂Wï“”“ÁV∆¬ê¢ÊWáE∂∂Wï““F6Ö∂∂Wï”∞¢“ì∞¢ñbÄ¢7G&ñÊrÜÊWáBÊFW67&óFñˆ‚«¬""íÁG&ñ“Çí«¿¢∆ˆˆ∑4∆ñ∂U6óFTñÁ7G'V7Fñˆ‚ÜÊWáBÊFW67&óFñˆ‚ê¢ê¢ÊWáBÊFW67&óFñˆ‚“6óFTf∆∆&6¥FW67&óFñˆ‚ÜÊWáBì∞¢ñbÇı‚5≥”ñ÷e◊≥g“BˆíÁFW7BÜÊWáBÊ6ˆ∆˜"«¬""ííÊWáBÊ6ˆ∆˜"“"3fC3ÜS#∞¢&WGW&‚ÊWáC∞ß–†¶6ˆÁ7B6óFUvUFÇ“á6«Vr¬vR“""í”‡¢˜2ÚG∑6«Vvñgíá6«Vr«¬&÷WR◊6óFR"ó“G∑vRÚÚG∑vW÷¢"'÷∞†¶Wá˜'B6ˆÁ7B4ïDUıDÑT‘U2“∞¢∞¢ñC¢&÷ˆFW&ÊÚ"¿¢∆&V√¢$÷ˆFW&ÊÚ"¿¢7vF6É¢&∆ñÊV"÷w&FñVÁBÉ3VFVr¬6cFcfb¬6ffccrí"¿¢“¿¢∞¢ñC¢&W67W&Ú"¿¢∆&V√¢$÷ñÊñ÷∆ó7FW67W&Ú"¿¢7vF6É¢&∆ñÊV"÷w&FñVÁBÉ3VFVr¬3ÉC3¬3cCí"¿¢“¿¢∞¢ñC¢'fñ'&ÁFR"¿¢∆&V√¢%fñ'&ÁFR"¿¢7vF6É¢&∆ñÊV"÷w&FñVÁBÉ3VFVr¬6fcf#Sr¬6ff#cCÇí"¿¢“¿•”∞†¶6ˆÁ7BFÜV÷UFˆ∂VÁ2“áFÜV÷R¬6ˆ∆˜"í”‡¢á∞¢÷ˆFW&ÊÛ¢∞¢&s¢"6fffb"¿¢FWáC¢"3sS&""¿¢◊WFVC¢"3VCSsfB"¿¢ÜW&Ù&s¢&∆ñÊV"÷w&FñVÁBÉ3VFVr¬6cFcfb¬6ffccrí"¿¢ÜW&ıFWáC¢"3sS&""¿¢ÜVFW$&s¢"6ffb"¿¢ÜVFW$&˜&FW#¢"6V6SñcB"¿¢ÊeFWáC¢"3SsSf""¿¢6&D&s¢"6ffb"¿¢6&D&˜&FW#¢"6SÜSVc""¿¢6ˆÁF7D&s¢"3sS&""¿¢6ˆÁF7EFWáC¢"6ffb"¿¢fˆÁC¢$ñÁFW"ƒ&ñ¬«6Á2◊6W&ñb"¿¢&FóW3¢##Ç"¿¢“¿¢W67W&Û¢∞¢&s¢"3S2"¿¢FWáC¢"6cFc&f""¿¢◊WFVC¢"6#f#3r"¿¢ÜW&Ù&s¢&∆ñÊV"÷w&FñVÁBÉ3VFVr¬3c3¬3S2í"¿¢ÜW&ıFWáC¢"6ffb"¿¢ÜVFW$&s¢"3S##R"¿¢ÜVFW$&˜&FW#¢"3#c#62"¿¢ÊeFWáC¢"63ñ3FF"¿¢6&D&s¢"3c3"¿¢6&D&˜&FW#¢"3&#SC""¿¢6ˆÁF7D&s¢"3"¿¢6ˆÁF7EFWáC¢"6ffb"¿¢fˆÁC¢"u˜ñÁ2rƒñÁFW"ƒ&ñ¬«6Á2◊6W&ñb"¿¢&FóW3¢#gÇ"¿¢“¿¢fñ'&ÁFS¢∞¢&s¢"6fffc""¿¢FWáC¢"3#c"¿¢◊WFVC¢"3fcV3C"¿¢ÜW&Ù&s¢∆ñÊV"÷w&FñVÁBÉ3VFVr¬G∂6ˆ∆˜'“¬6fcvCBñ¿¢ÜW&ıFWáC¢"6ffb"¿¢ÜVFW$&s¢"6ffb"¿¢ÜVFW$&˜&FW#¢"6ffS662"¿¢ÊeFWáC¢"3fcV3C"¿¢6&D&s¢"6ffb"¿¢6&D&˜&FW#¢"6ffS662"¿¢6ˆÁF7D&s¢6ˆ∆˜"¿¢6ˆÁF7EFWáC¢"6ffb"¿¢fˆÁC¢"u˜ñÁ2rƒñÁFW"ƒ&ñ¬«6Á2◊6W&ñb"¿¢&FóW3¢##gÇ"¿¢“¿¢“ï∑FÜV÷U“«¬FÜV÷UFˆ∂VÁ2Ç&÷ˆFW&ÊÚ"¬6ˆ∆˜"ì∞†¶6ˆÁ7Bó56fTñ÷vUW&¬“áf«VRí”‚ıÊáGG3•¬ı¬ı≈2≤BˆíÁFW7BÖ7G&ñÊráf«VR«¬""íÁG&ñ“Çíì∞†¶6ˆÁ7B6óFTv∆∆W'í“áf«VRí”‡¢Ñ'&íÊó4'&íáf«VRíÚf«VR¢µ“ê¢Êfñ«FW"ÇÜóFV“í”‚óFV“bbó56fTñ÷vUW&¬ÜóFV“ÁW&¬íê¢Á6∆ñ6RÉ¬Çê¢Ê÷ÇÜóFV“í”‚á∞¢W&√¢7G&ñÊrÜóFV“ÁW&¬íÁG&ñ“Çí¿¢6Fñˆ„¢7G&ñÊrÜóFV“Ê6Fñˆ‚«¬""íÁG&ñ“ÇíÁ6∆ñ6RÉ¬#í¿¢“íì∞†¶6ˆÁ7B6óFUFW7Fñ÷ˆÊñ«2“áf«VRí”‡¢Ñ'&íÊó4'&íáf«VRíÚf«VR¢µ“ê¢Êfñ«FW"ÇÜóFV“í”‚óFV“bb7G&ñÊrÜóFV“ÁV˜FR«¬""íÁG&ñ“Çíê¢Á6∆ñ6RÉ¬bê¢Ê÷ÇÜóFV“í”‚á∞¢Ê÷S¢7G&ñÊrÜóFV“ÊÊ÷R«¬$6∆ñVÁFR"íÁG&ñ“ÇíÁ6∆ñ6RÉ¬cí«¬$6∆ñVÁFR"¿¢&ˆ∆S¢7G&ñÊrÜóFV“Á&ˆ∆R«¬""íÁG&ñ“ÇíÁ6∆ñ6RÉ¬cí¿¢V˜FS¢7G&ñÊrÜóFV“ÁV˜FR«¬""íÁG&ñ“ÇíÁ6∆ñ6RÉ¬Cí¿¢“íì∞†¶6ˆÁ7B6óFTf“áf«VRí”‡¢Ñ'&íÊó4'&íáf«VRíÚf«VR¢µ“ê¢Êfñ«FW"Ä¢ÜóFV“í”‡¢óFV“bb7G&ñÊrÜóFV“ÁVW7Fñˆ‚«¬""íÁG&ñ“Çíbb7G&ñÊrÜóFV“ÊÁ7vW"«¬""íÁG&ñ“Çí¿¢ê¢Á6∆ñ6RÉ¬bê¢Ê÷ÇÜóFV“í”‚á∞¢VW7Fñˆ„¢7G&ñÊrÜóFV“ÁVW7Fñˆ‚íÁG&ñ“ÇíÁ6∆ñ6RÉ¬cí¿¢Á7vW#¢7G&ñÊrÜóFV“ÊÁ7vW"íÁG&ñ“ÇíÁ6∆ñ6RÉ¬Cí¿¢“íì∞†¶6ˆÁ7B6óFTfVGW&W2“áf«VRí”‡¢Ñ'&íÊó4'&íáf«VRíÚf«VR¢µ“ê¢Êfñ«FW"ÇÜóFV“í”‚óFV“bb7G&ñÊrÜóFV“ÁFóF∆R«¬""íÁG&ñ“Çíê¢Á6∆ñ6RÉ¬Bê¢Ê÷ÇÜóFV“í”‚á∞¢FóF∆S¢7G&ñÊrÜóFV“ÁFóF∆RíÁG&ñ“ÇíÁ6∆ñ6RÉ¬cí¿¢FW67&óFñˆ„¢7G&ñÊrÜóFV“ÊFW67&óFñˆ‚«¬""íÁG&ñ“ÇíÁ6∆ñ6RÉ¬#í¿¢“íì∞†¶Wá˜'B6ˆÁ7BÑÙ‘UÙ$ƒÙ4µÙîE2“≤&fVGW&W2"¬&v∆∆W'í"¬'FW7Fñ÷ˆÊñ«2"¬&7F%”∞†¶6ˆÁ7B6ÊóFó¶TÜˆ÷T&∆ˆ6∑2“áf«VRí”‡¢Ñ'&íÊó4'&íáf«VRíÚf«VR¢µ“ê¢Êfñ«FW"ÇÜñBí”‚ÑÙ‘UÙ$ƒÙ4µÙîE2ÊñÊ6«VFW2ÜñBíê¢Êfñ«FW"ÇÜñB¬ñÊFWÇ¬'"í”‚'"ÊñÊFWÑˆbÜñBí””“ñÊFWÇê¢Á6∆ñ6RÉ¬ÑÙ‘UÙ$ƒÙ4µÙîE2Ê∆VÊwFÇì∞†¶Wá˜'B6ˆÁ7BÑU$ıı5EîƒU2“∞¢≤ñC¢&6VÁG&FÚ"¬∆&V√¢$6VÁG&FÚ"“¿¢≤ñC¢&FófñFñFÚ"¬∆&V√¢$FófñFñFÚ"“¿¢≤ñC¢&ñ◊7FÚ"¬∆&V√¢$ñ◊7FÚ"“¿•”∞†¶Wá˜'BgVÊ7Fñˆ‚÷∂U6óFRÜf˜&“¬vR“""¬6óFU6«Vr“""í∞¢6ˆÁ7BFóF∆R“f˜&“ÊÊ÷R«¬$÷WRÊV|;66ñÚ#∞¢6ˆÁ7BFW62–¢f˜&“ÊFW67&óFñˆ‚bb∆ˆˆ∑4∆ñ∂U6óFTñÁ7G'V7Fñˆ‚Üf˜&“ÊFW67&óFñˆ‚ê¢Úf˜&“ÊFW67&óFñˆ‡¢¢6óFTf∆∆&6¥FW67&óFñˆ‚Üf˜&“ì∞¢6ˆÁ7B6ˆ∆˜"“ı‚5≥”ñ÷e◊≥g“BˆíÁFW7BÜf˜&“Ê6ˆ∆˜"«¬""ê¢Úf˜&“Ê6ˆ∆˜ ¢¢"3fC3ÜS#∞¢6ˆÁ7B6ˆÁF7B“ı‚ÜáGG3Ûß∆÷ñ«FÛß«FV√ß¬2íˆíÁFW7BÜf˜&“Ê6ˆÁF7B«¬""ê¢Úf˜&“Ê6ˆÁF7@¢¢"66ˆÁFFÚ#∞¢6ˆÁ7B6«Vr“6óFU6«Vr«¬6«VvñgíáFóF∆Rì∞¢6ˆÁ7B6W'fñ6W2“6óFU6W'fñ6W2Üf˜&“Á6W'fñ6W2ì∞¢6ˆÁ7BB“FÜV÷UFˆ∂VÁ2Üf˜&“ÁFÜV÷R¬6ˆ∆˜"ì∞¢6ˆÁ7BÜW&Ùñ÷r“ó56fTñ÷vUW&¬Üf˜&“ÊÜW&Ùñ÷vRíÚ7G&ñÊrÜf˜&“ÊÜW&Ùñ÷vRíÁG&ñ“Çí¢"#∞¢6ˆÁ7Bv∆∆W'í“6óFTv∆∆W'íÜf˜&“Êv∆∆W'íì∞¢6ˆÁ7BFW7Fñ÷ˆÊñ«2“6óFUFW7Fñ÷ˆÊñ«2Üf˜&“ÁFW7Fñ÷ˆÊñ«2ì∞¢6ˆÁ7Bf“6óFTfÜf˜&“Êfì∞¢6ˆÁ7BfVGW&W2“6óFTfVGW&W2Üf˜&“ÊfVGW&W2ì∞¢6ˆÁ7BÜˆ÷T&∆ˆ6∑2“6ÊóFó¶TÜˆ÷T&∆ˆ6∑2Üf˜&“ÊÜˆ÷T&∆ˆ6∑2ì∞¢6ˆÁ7BÜW&ı7Gñ∆R“ÑU$ıı5EîƒU2Á6ˆ÷RÇá2í”‚2ÊñB””“f˜&“ÊÜW&ı7Gñ∆Rê¢Úf˜&“ÊÜW&ı7Gñ∆P¢¢&6VÁG&FÚ#∞¢6ˆÁ7B6&G2“6W'fñ6W0¢Ê÷Ä¢á6W'fñ6Rí”‡¢∆'Fñ6∆R6∆73“&6&B#„∆É3‚G∂W66TáF÷¬á6W'fñ6RÁFóF∆Ró”¬ˆÉ3„«‚G∂W66TáF÷¬á6W'fñ6RÊFW67&óFñˆ‚ó”¬˜„¬ˆ'Fñ6∆SÊ¿¢ê¢Ê¶ˆñ‚Ç""ì∞¢6ˆÁ7BÊb“∞¢≤""¬$ñÏ:÷6ñÚ%“¿¢≤'6ˆ'&R"¬%6ˆ'&R%“¿¢≤'6W'fñ6˜2"¬%6W'fú:v˜2%“¿¢≤&6ˆÁFFÚ"¬$6ˆÁFFÚ%“¿¢–¢Ê÷Ä¢Ö∑FÇ¬∆&V≈“í”‡¢∆G∑vR””“FÇÚr&ñ÷7W'&VÁC“'vR"r¢"'“á&Vc“"G∑6óFUvUFÇá6«Vr¬FÇó“#‚G∂∆&V«”¬ˆÊ¿¢ê¢Ê¶ˆñ‚Ç""ì∞¢6ˆÁ7B&˜WB–¢f˜&“Ê&˜WB«¿¢G∑FóF∆W“Ê66WR&ˆfW&V6W"V÷WáW&ú:¶Ê6ñ6ˆÊfú:fV¬¬6ñ◊∆W2R,;7Üñ÷‚6FFVÊFñ÷VÁFÚ'FRFÚ6ˆÁFWáFÚ&V¬FÚ6∆ñVÁFR&6ÜVv"V÷6ˆ«\:|:6ÚFWVFÊ∞¢6ˆÁ7BÜW&Ù6˜í“«7„‚G∂W66TáF÷¬Üf˜&“Á6Vv÷VÁB«¬$&V“◊fñÊFÚ"ó”¬˜7„„∆É‚G∂W66TáF÷¬Üf˜&“ÊÜVF∆ñÊR«¬FóF∆Ró”¬ˆÉ„«‚G∂W66TáF÷¬ÜFW62ó”¬˜„∆6∆73“&7F"á&Vc“"G∑6óFUvUFÇá6«Vr¬&6ˆÁFFÚ"ó“#‚G∂W66TáF÷¬Üf˜&“Ê7F«¬%VW&Ú6&W"÷ó2"ó”¬ˆÊ∞¢6ˆÁ7BÜW&ıfó7V¬“ÜW&Ùñ÷p¢Ú∆ñ÷r7&3“"G∂W66TáF÷¬ÜÜW&Ùñ÷ró“"«C“"G∂W66TáF÷¬áFóF∆Ró“"∆ˆFñÊs“&∆ßí#Ê ¢¢∆Fób6∆73“&ÜW&Ú÷FV6˜""&ñ÷ÜñFFV„“'G'VR#„«7„‚G∂W66TáF÷¬ÇáFóF∆RÁG&ñ“Çï≥“«¬%2"íÁFıWW$66RÇíó”¬˜7„„¬ˆFócÊ∞¢6ˆÁ7BÜW&ı6V7Fñˆ‚–¢ÜW&ı7Gñ∆R””“&ñ◊7FÚ ¢Ú«6V7Fñˆ‚6∆73“&ÜW&Ú7Gñ∆R÷ñ◊7FÚ#„∆Fóc‚G∂ÜW&Ù6˜ó”¬ˆFóc„¬˜6V7Fñˆ„Ê ¢¢ÜW&ı7Gñ∆R””“&FófñFñFÚ ¢Ú«6V7Fñˆ‚6∆73“&ÜW&ÚÜW&Ùñ÷r7Gñ∆R÷FófñFñFÚ#„∆Fóc‚G∂ÜW&Ù6˜ó”¬ˆFóc‚G∂ÜW&ıfó7V«”¬˜6V7Fñˆ„Ê ¢¢ÜW&Ùñ÷p¢Ú«6V7Fñˆ‚6∆73“&ÜW&ÚÜW&Ùñ÷r#„∆Fóc‚G∂ÜW&Ù6˜ó”¬ˆFóc‚G∂ÜW&ıfó7V«”¬˜6V7Fñˆ„Ê ¢¢«6V7Fñˆ‚6∆73“&ÜW&Ú#„∆Fóc‚G∂ÜW&Ù6˜ó”¬ˆFóc„¬˜6V7Fñˆ„Ê∞¢6ˆÁ7Bv∆∆W'ï6V7Fñˆ‚“v∆∆W'íÊ∆VÊwFÄ¢Ú«6V7Fñˆ‚6∆73“'6V7Fñˆ‚v∆∆W'í#„«7‚6∆73“&∂ñ6∂W"#‰tƒU$î¬˜7„„∆É#ÂV“˜V6ÚFÚÊ˜76ÚG&&∆ÜÛ¬ˆÉ#„∆Fób6∆73“&v∆∆W'í÷w&ñB#‚G∂v∆∆W'ê¢Ê÷Ä¢Ürí”‡¢∆fñwW&S„∆ñ÷r7&3“"G∂W66TáF÷¬ÜrÁW&¬ó“"«C“"G∂W66TáF÷¬ÜrÊ6Fñˆ‚«¬FóF∆Ró“"∆ˆFñÊs“&∆ßí#‚G∂rÊ6Fñˆ‚Ú∆fñv6Fñˆ„‚G∂W66TáF÷¬ÜrÊ6Fñˆ‚ó”¬ˆfñv6Fñˆ„Ê¢"'”¬ˆfñwW&SÊ¿¢ê¢Ê¶ˆñ‚Ç""ó”¬ˆFóc„¬˜6V7Fñˆ„Ê ¢¢"#∞¢6ˆÁ7BFW7Fñ÷ˆÊñ«56V7Fñˆ‚“FW7Fñ÷ˆÊñ«2Ê∆VÊwFÄ¢Ú«6V7Fñˆ‚6∆73“'6V7Fñˆ‚FW7Fñ÷ˆÊñ«2#„«7‚6∆73“&∂ñ6∂W"#ÂTT“¨84Ù‰dîıS¬˜7„„∆É#‰ÚVRFó¶V“6ˆ'&RvVÁFS¬ˆÉ#„∆Fób6∆73“&6&G2FW7Fí÷6&G2#‚G∑FW7Fñ÷ˆÊñ«0¢Ê÷Ä¢ÜóFV“í”‡¢∆'Fñ6∆R6∆73“&6&BFW7Fí#„«‚f∆GVÛ≤G∂W66TáF÷¬ÜóFV“ÁV˜FRó“g&GVÛ≥¬˜„∆fˆ˜FW#„«7G&ˆÊs‚G∂W66TáF÷¬ÜóFV“ÊÊ÷Ró”¬˜7G&ˆÊs‚G∂óFV“Á&ˆ∆RÚ«7„‚G∂W66TáF÷¬ÜóFV“Á&ˆ∆Ró”¬˜7„Ê¢"'”¬ˆfˆ˜FW#„¬ˆ'Fñ6∆SÊ¿¢ê¢Ê¶ˆñ‚Ç""ó”¬ˆFóc„¬˜6V7Fñˆ„Ê ¢¢"#∞¢6ˆÁ7Bf6V7Fñˆ‚“fÊ∆VÊwFÄ¢Ú«6V7Fñˆ‚6∆73“'6V7Fñˆ‚f#„«7‚6∆73“&∂ñ6∂W"#ÂU$uTÂD2e$UTTÂDU3¬˜7„„∆É#‰L;ßfñF26ˆ◊VÁ3¬ˆÉ#„∆Fób6∆73“&f÷∆ó7B#‚G∂f¢Ê÷Ä¢ÜóFV“í”‡¢∆FWFñ«3„«7V÷÷'ì‚G∂W66TáF÷¬ÜóFV“ÁVW7Fñˆ‚ó”¬˜7V÷÷'ì„«‚G∂W66TáF÷¬ÜóFV“ÊÁ7vW"ó”¬˜„¬ˆFWFñ«3Ê¿¢ê¢Ê¶ˆñ‚Ç""ó”¬ˆFóc„¬˜6V7Fñˆ„Ê ¢¢"#∞¢6ˆÁ7BfVGW&W56V7Fñˆ‚“fVGW&W2Ê∆VÊwFÄ¢Ú«6V7Fñˆ‚6∆73“'6V7Fñˆ‚fVGW&W2#„«7‚6∆73“&∂ñ6∂W"#Âı"TRU44ÙƒÑU"tTÂDS¬˜7„„∆É#‰ÚVRÊ˜2FñfW&VÊ6ñ¬ˆÉ#„∆Fób6∆73“&6&G2fVGW&R÷6&G2#‚G∂fVGW&W0¢Ê÷Ä¢Üb¬íí”‡¢∆'Fñ6∆R6∆73“&6&BfVGW&R#„«7‚6∆73“&fVGW&R÷ÁV“#‚Gµ7G&ñÊrÜí≤íÁE7F'BÉ"¬#"ó”¬˜7„„∆É3‚G∂W66TáF÷¬ÜbÁFóF∆Ró”¬ˆÉ3‚G∂bÊFW67&óFñˆ‚Ú«‚G∂W66TáF÷¬ÜbÊFW67&óFñˆ‚ó”¬˜Ê¢"'”¬ˆ'Fñ6∆SÊ¿¢ê¢Ê¶ˆñ‚Ç""ó”¬ˆFóc„¬˜6V7Fñˆ„Ê ¢¢"#∞¢6ˆÁ7B7F&ÊÊW%6V7Fñˆ‚“«6V7Fñˆ‚6∆73“'6V7Fñˆ‚7F÷&ÊÊW"#„∆Fóc„∆É#Âf÷˜26ˆÁfW'6"6ˆ'&RÚVRG∂W66TáF÷¬áFóF∆Ró“ˆFRf¶W"˜"fˆ<:£Û¬ˆÉ#„∆6∆73“&7F∆ñváB"á&Vc“"G∑6óFUvUFÇá6«Vr¬&6ˆÁFFÚ"ó“#‚G∂W66TáF÷¬Üf˜&“Ê7F«¬$f∆"v˜&"ó”¬ˆ„¬ˆFóc„¬˜6V7Fñˆ„Ê∞¢6ˆÁ7BÜˆ÷T&∆ˆ6¥6ˆÁFVÁB“∞¢fVGW&W3¢fVGW&W56V7Fñˆ‚¿¢v∆∆W'ì¢v∆∆W'ï6V7Fñˆ‚¿¢FW7Fñ÷ˆÊñ«3¢FW7Fñ÷ˆÊñ«56V7Fñˆ‚¿¢7F¢7F&ÊÊW%6V7Fñˆ‚¿¢”∞¢6ˆÁ7BÜˆ÷T˜&FW"“Üˆ÷T&∆ˆ6∑2Ê∆VÊwFÇÚÜˆ÷T&∆ˆ6∑2¢ÑÙ‘UÙ$ƒÙ4µÙîE3∞¢6ˆÁ7B&VÊFW&VDÜˆ÷TñG2“ÊWr6WBÇì∞¢6ˆÁ7BÜˆ÷TWáG&2“Üˆ÷T˜&FW ¢Êfñ«FW"ÇÜñBí”‚Üˆ÷T&∆ˆ6¥6ˆÁFVÁE∂ñE“ê¢Ê÷ÇÜñBí”‚∞¢&VÊFW&VDÜˆ÷TñG2ÊFBÜñBì∞¢&WGW&‚Üˆ÷T&∆ˆ6¥6ˆÁFVÁE∂ñE”∞¢“ì∞¢≤&v∆∆W'í"¬'FW7Fñ÷ˆÊñ«2%“Êf˜$V6ÇÇÜñBí”‚∞¢ñbÜÜˆ÷T&∆ˆ6¥6ˆÁFVÁE∂ñE“bb&VÊFW&VDÜˆ÷TñG2ÊÜ2ÜñBííÜˆ÷TWáG&2ÁW6ÇÜÜˆ÷T&∆ˆ6¥6ˆÁFVÁE∂ñE“ì∞¢“ì∞¢6ˆÁ7BvT6ˆÁFVÁB–¢∞¢"#¢G∂ÜW&ı6V7FñˆÁ”«6V7Fñˆ‚6∆73“'6V7Fñˆ‚ñÁG&Ú#„«7‚6∆73“&∂ñ6∂W"#‰ÚTRd§T‘ı3¬˜7„„∆É#Â6ˆ«\:|;VW2VÁ6F2&ÊV6W76ñFFW2&Vó3¬ˆÉ#„∆Fób6∆73“&6&G2#‚G∂6&G7”¬ˆFóc„¬˜6V7Fñˆ„‚G∂Üˆ÷TWáG&2Ê¶ˆñ‚Ç""ó÷¿¢6ˆ'&S¢«6V7Fñˆ‚6∆73“'vR÷ÜW&Ú#„«7„ÂTT“4Ù‘ı3¬˜7„„∆É‚G∂W66TáF÷¬Üf˜&“Ê&˜WEFóF∆R«¬6ˆ'&RG∑FóF∆W÷ó”¬ˆÉ„«‚G∂W66TáF÷¬ÜFW62ó”¬˜„¬˜6V7Fñˆ„„«6V7Fñˆ‚6∆73“'6V7Fñˆ‚&˜6R#„∆É#ÂV“G&&∆ÜÚ6ˆÁ7G'\:÷FÚ6ˆ“fˆ<:£¬ˆÉ#„«‚G∂W66TáF÷¬Ü&˜WBó”¬˜„∆6∆73“&7F"á&Vc“"G∑6óFUvUFÇá6«Vr¬&6ˆÁFFÚ"ó“#‰6ˆÁfW'6"6ˆ“WVóS¬ˆ„¬˜6V7Fñˆ„‚G∑FW7Fñ÷ˆÊñ«56V7FñˆÁ÷¿¢6W'fñ6˜3¢«6V7Fñˆ‚6∆73“'vR÷ÜW&Ú#„«7„‰‰ı5424Ù≈\8|9TU3¬˜7„„∆É‰6ˆ÷ÚˆFV÷˜2ßVF#¬ˆÉ„«‰6ˆÊÜ\:v2g&VÁFW2FRG&&∆ÜÚRVÊ6ˆÁG&RÚ÷V∆Ü˜"ˆÁFÚFR'FñF„¬˜„¬˜6V7Fñˆ„„«6V7Fñˆ‚6∆73“'6V7Fñˆ‚#„∆Fób6∆73“&6&G2#‚G∂6&G7”¬ˆFóc„¬˜6V7Fñˆ„‚G∂f6V7FñˆÁ÷¿¢6ˆÁFFÛ¢«6V7Fñˆ‚6∆73“'6V7Fñˆ‚6ˆÁF7B"ñC“&6ˆÁFFÚ#„∆Fób6∆73“&6ˆÁF7B÷w&ñB#„∆Fóc„«7‚6∆73“&∂ñ6∂W"#‰4ÙÂDDÛ¬˜7„„∆ÉÂf÷˜26ˆÁfW'6#Û¬ˆÉ„«‰6ˆÁFRÚVRfˆ<:¢&V6ó6‚÷VÁ6vV“6ÜVvFó&WF÷VÁFR:WVóR&W7ˆÁ<:fV¬„¬˜‚G∂6ˆÁF7B”“"66ˆÁFFÚ"Ú«„∆6∆73“&7F∆ñváB"á&Vc“"G∂W66TáF÷¬Ü6ˆÁF7Bó“#‚G∂W66TáF÷¬Üf˜&“Ê7F«¬$f∆"v˜&"ó”¬ˆ„¬˜Ê¢"'”¬ˆFóc„∆f˜&“6∆73“&∆VB÷f˜&“"FF◊6b÷∆VB÷f˜&”„∆∆&V√‰Êˆ÷S∆ñÁWBÊ÷S“&Ê÷R"&WVó&VB÷Ü∆VÊwFÉ“#"WFˆ6ˆ◊∆WFS“&Ê÷R#„¬ˆ∆&V√„∆∆&V√‰R÷÷ñ√∆ñÁWBÊ÷S“&V÷ñ¬"GóS“&V÷ñ¬"÷Ü∆VÊwFÉ“#c"WFˆ6ˆ◊∆WFS“&V÷ñ¬#„¬ˆ∆&V√„∆∆&V√ÂFV∆VfˆÊS∆ñÁWBÊ÷S“'ÜˆÊR"÷Ü∆VÊwFÉ“#C"WFˆ6ˆ◊∆WFS“'FV¬#„¬ˆ∆&V√„∆∆&V√‰÷VÁ6vV”«FWáF&VÊ÷S“&÷W76vR"÷Ü∆VÊwFÉ“###„¬˜FWáF&V„¬ˆ∆&V√„∆'WGFˆ‚GóS“'7V&÷óB#‰VÁfñ"÷VÁ6vV”¬ˆ'WGFˆ„„«6∆73“&∆VB◊7FGW2"FF◊6b÷∆VB◊7FGW2&ñ÷∆ófS“'ˆ∆óFR#„¬˜„¬ˆf˜&”„¬ˆFóc„¬˜6V7Fñˆ„Ê¿¢’∑vU“«¬"#∞¢&WGW&‚¬Fˆ7GóRáF÷√‡£∆áF÷¬∆Ês“'B‘%"#„∆ÜVC„∆÷WF6Ü'6WC“%UDb”Ç#„∆÷WFÊ÷S“'fñWw˜'B"6ˆÁFVÁC“'vñGFÉ÷FWfñ6R◊vñGFÇ∆ñÊóFñ¬◊66∆S”#„«FóF∆S‚G∂W66TáF÷¬ávRÚG∑vU≥“ÁFıWW$66RÇó“G∑vRÁ6∆ñ6RÉó“+rG∑FóF∆W÷¢FóF∆Ró”¬˜FóF∆S„∆÷WFÊ÷S“&FW67&óFñˆ‚"6ˆÁFVÁC“"G∂W66TáF÷¬ÜFW62Á6∆ñ6RÉ¬Síó“#„«7Gñ∆S‡¢ß∂&˜Ç◊6ó¶ñÊs¶&˜&FW"÷&˜á÷áF÷«∑67&ˆ∆¬÷&VÜfñ˜#ß6÷ˆ˜Fá÷&ˆGó∂÷&vñ„£∂fˆÁB÷f÷ñ«ì¢G∑BÊfˆÁG”∂6ˆ∆˜#¢G∑BÁFWáG”∂&6∂w&˜VÊC¢G∑BÊ&w◊÷ÜVFW'∂Fó7∆ì¶f∆WÉ∂ßW7Fñgí÷6ˆÁFVÁCß76R÷&WGvVV„∂∆ñv‚÷óFV◊3¶6VÁFW#∂v£#áÉ∑FFñÊs£#'ÇrS∂&6∂w&˜VÊC¢G∑BÊÜVFW$&w”∂&˜&FW"÷&˜GFˆ”£Ç6ˆ∆ñBG∑BÊÜVFW$&˜&FW'”∑˜6óFñˆ„ß7Fñ6∑ì∑F˜£∑¢÷ñÊFWÉ£7÷ÜVFW"'∂fˆÁB◊6ó¶S£„'&V◊÷Êg∂Fó7∆ì¶f∆WÉ∂∆ñv‚÷óFV◊3¶6VÁFW#∂v£#Gá÷Êb∂6ˆ∆˜#¢G∑BÊÊeFWáG”∑FWáB÷FV6˜&Fñˆ„¶ÊˆÊS∂fˆÁB◊vVñváC£s∂fˆÁB◊6ó¶S¢„ì7&V”∑G&Á6óFñˆ„¶6ˆ∆˜"„'7÷Êb¶Ü˜fW'∂6ˆ∆˜#¢G∂6ˆ∆˜'◊÷Êb∂&ñ÷7W'&VÁC◊vU◊∂6ˆ∆˜#¢G∂6ˆ∆˜'◊÷∂6ˆ∆˜#¶ñÊÜW&óG“Ê7F∆'WGFˆÁ∂Fó7∆ì¶ñÊ∆ñÊR÷&∆ˆ6≥∂&6∂w&˜VÊC¢G∂6ˆ∆˜'”∂6ˆ∆˜#ßvÜóFS∑FFñÊs£GÇ#'É∂&˜&FW#£∂&˜&FW"◊&FóW3£'É∑FWáB÷FV6˜&Fñˆ„¶ÊˆÊS∂fˆÁB◊vVñváC£É∂7W'6˜#ßˆñÁFW#∑G&Á6óFñˆ„ßG&Á6f˜&“„'2∆&˜Ç◊6ÜF˜r„'7“Ê7F¶Ü˜fW"∆'WGFˆ„¶Ü˜fW'∑G&Á6f˜&”ßG&Á6∆FUíÇ”'Çì∂&˜Ç◊6ÜF˜s£'Ç#gÇ&v&É√√¬„Çó“Ê7FÊ∆ñváG∂&6∂w&˜VÊC¢6ffc∂6ˆ∆˜#¢3sS&'“ÊÜW&Ú¬ÁvR÷ÜW&˜∑FFñÊs£ÇrS∂&6∂w&˜VÊC¢G∑BÊÜW&Ù&w”∂6ˆ∆˜#¢G∑BÊÜW&ıFWáG”∂Fó7∆ì¶w&ñC∂∆ñv‚÷6ˆÁFVÁC¶6VÁFW'“ÊÜW&˜∂÷ñ‚÷ÜVñváC£cáfá“ÊÜW&ÛÊFóg∂÷Ç◊vñGFÉ£É#á“ÊÜW&ÚÊÜW&Ùñ÷w∂w&ñB◊FV◊∆FR÷6ˆ«V÷Á3£„g"„ñg#∂∆ñv‚÷óFV◊3¶6VÁFW#∂v£CGÉ∂÷Ç◊vñGFÉ£#ÉÉ∂÷&vñ„£WF˜“ÊÜW&ÚÊÜW&Ùñ÷sÊFóg∂÷Ç◊vñGFÉ¶ÊˆÊW“ÊÜW&ÚÊÜW&Ùñ÷rñ÷w∑vñGFÉ£S∂ÜVñváC£3ÉÉ∂ˆ&¶V7B÷fóC¶6˜fW#∂&˜&FW"◊&FóW3¢G∑BÁ&FóW7◊“ÊÜW&Ú÷FV6˜'∑vñGFÉ£S∂ÜVñváC£3ÉÉ∂&˜&FW"◊&FóW3¢G∑BÁ&FóW7”∂&6∂w&˜VÊC¶∆ñÊV"÷w&FñVÁBÉ3VFVr¬G∂6ˆ∆˜'“¬G∑BÊ6&D&w“ì∂Fó7∆ì¶w&ñC∑∆6R÷óFV◊3¶6VÁFW#∂˜fW&f∆˜s¶ÜñFFVÁ“ÊÜW&Ú÷FV6˜"7Á∂fˆÁB◊6ó¶S£á&V”∂fˆÁB◊vVñváC£ì∂6ˆ∆˜#ß&v&É#SR√#SR√#SR¬„ÉRó“ÊÜW&ÚÁ7Gñ∆R÷ñ◊7F˜∑FWáB÷∆ñv„¶6VÁFW'“ÊÜW&ÚÁ7Gñ∆R÷ñ◊7FÛÊFóg∂÷Ç◊vñGFÉ£ìÉ∂÷&vñ„£WF˜“ÊÜW&ÚÁ7Gñ∆R÷ñ◊7FÚ∂÷&vñ‚÷∆VgC¶WFÛ∂÷&vñ‚◊&ñváC¶WF˜“ÊÜW&Ú7‚¬ÁvR÷ÜW&Ú7‚¬Ê∂ñ6∂W'∂6ˆ∆˜#¢G∂6ˆ∆˜'”∂fˆÁB◊vVñváC£ì∑FWáB◊G&Á6f˜&”ßWW&66S∂∆WGFW"◊76ñÊs¢„&V◊“ÊÜW&ÚÉ¬ÁvR÷ÜW&ÚÉ¬Ê6ˆÁF7BÉ∂fˆÁB◊6ó¶S¶6∆◊É"„g&V“√wgr√R„G&V“ì∂∆ñÊR÷ÜVñváC£„#∂÷&vñ„¢„#VV““ÊÜW&ÚÁ7Gñ∆R÷ñ◊7FÚÉ∂fˆÁB◊6ó¶S¶6∆◊É7&V“√ágr√b„'&V“ó“ÊÜW&Ú¬ÁvR÷ÜW&Ú∂fˆÁB◊6ó¶S£„'&V”∂∆ñÊR÷ÜVñváC£„s∂÷Ç◊vñGFÉ£s#á“ÁvR÷ÜW&˜∂÷ñ‚÷ÜVñváC£Cáfá“Á6V7FñˆÁ∑FFñÊs£ÉÇrW“Á6V7Fñˆ„ÊÉ'∂fˆÁB◊6ó¶S¶6∆◊É'&V“√Ggr√2„G&V“ì∂÷Ç◊vñGFÉ£sÉá“Ê6&G7∂Fó7∆ì¶w&ñC∂w&ñB◊FV◊∆FR÷6ˆ«V÷Á3ß&WVBÉ2√g"ì∂v£#É∂÷&vñ‚◊F˜£3Gá“Ê6&G∂&6∂w&˜VÊC¢G∑BÊ6&D&w”∑FFñÊs£#áÉ∂&˜&FW#£Ç6ˆ∆ñBG∑BÊ6&D&˜&FW'”∂&˜&FW"◊&FóW3¢G∑BÁ&FóW7”∂&˜Ç◊6ÜF˜s£'Ç3WÇ&v&É3R√#R√s"¬„bì∑G&Á6óFñˆ„ßG&Á6f˜&“„#W2∆&˜Ç◊6ÜF˜r„#W7“Ê6&C¶Ü˜fW'∑G&Á6f˜&”ßG&Á6∆FUíÇ”WÇì∂&˜Ç◊6ÜF˜s£áÇCWÇ&v&É3R√#R√s"¬„"ó“Ê6&BÉ7∂fˆÁB◊6ó¶S£„#W&V◊“Ê6&B¬Á&˜6R∂6ˆ∆˜#¢G∑BÊ◊WFVG”∂∆ñÊR÷ÜVñváC£„w“Á&˜6W∂÷Ç◊vñGFÉ£ì#á“Á&˜6R∂fˆÁB◊6ó¶S£„á&V◊“ÁFW7Fí∂fˆÁB◊6ó¶S£„W&V”∂fˆÁB◊7Gñ∆S¶óF∆ñ3∂6ˆ∆˜#¢G∑BÁFWáG◊“ÁFW7Fífˆ˜FW'∂÷&vñ‚◊F˜£GÉ∂Fó7∆ì¶f∆WÉ∂f∆WÇ÷Fó&V7Fñˆ„¶6ˆ«V÷„∂v£'á“ÁFW7Fífˆ˜FW"7Á∂6ˆ∆˜#¢G∑BÊ◊WFVG”∂fˆÁB◊6ó¶S¢„Éá&V◊“ÊfVGW&R÷ÁV◊∂fˆÁB◊6ó¶S£'&V”∂fˆÁB◊vVñváC£ì∂6ˆ∆˜#¢G∂6ˆ∆˜'”∂˜6óGì¢„C∂Fó7∆ì¶&∆ˆ6≥∂÷&vñ‚÷&˜GFˆ”£gá“Êv∆∆W'í÷w&ñG∂Fó7∆ì¶w&ñC∂w&ñB◊FV◊∆FR÷6ˆ«V÷Á3ß&WVBÜWFÚ÷fñ∆¬∆÷ñÊ÷ÇÉ##Ç√g"íì∂v£gÉ∂÷&vñ‚◊F˜£3Gá“Êv∆∆W'í÷w&ñBfñwW&W∂÷&vñ„£∂&˜&FW"◊&FóW3¢G∑BÁ&FóW7”∂˜fW&f∆˜s¶ÜñFFV„∂&6∂w&˜VÊC¢G∑BÊ6&D&w◊“Êv∆∆W'í÷w&ñBñ÷w∑vñGFÉ£S∂ÜVñváC£##É∂ˆ&¶V7B÷fóC¶6˜fW#∂Fó7∆ì¶&∆ˆ6∑“Êv∆∆W'í÷w&ñBfñv6FñˆÁ∑FFñÊs£ÇGÉ∂fˆÁB◊6ó¶S¢„ÉW&V”∂6ˆ∆˜#¢G∑BÊ◊WFVG◊“Êf÷∆ó7G∂÷&vñ‚◊F˜£3GÉ∂Fó7∆ì¶w&ñC∂v£'É∂÷Ç◊vñGFÉ£É#á“Êf÷∆ó7BFWFñ«7∂&6∂w&˜VÊC¢G∑BÊ6&D&w”∂&˜&FW#£Ç6ˆ∆ñBG∑BÊ6&D&˜&FW'”∂&˜&FW"◊&FóW3£GÉ∑FFñÊs£gÇ#á“Êf÷∆ó7B7V÷÷'ó∂7W'6˜#ßˆñÁFW#∂fˆÁB◊vVñváC£É“Êf÷∆ó7B∂÷&vñ„£'Ç∂6ˆ∆˜#¢G∑BÊ◊WFVG”∂∆ñÊR÷ÜVñváC£„g“Ê7F÷&ÊÊW'∂&6∂w&˜VÊC¢G∑BÊ6ˆÁF7D&w”∂6ˆ∆˜#¢G∑BÊ6ˆÁF7EFWáG◊“Ê7F÷&ÊÊW"Fóg∂÷Ç◊vñGFÉ£cCÉ∂÷&vñ„£WFÛ∂Fó7∆ì¶w&ñC∂v£#É∂ßW7Fñgí÷óFV◊3¶6VÁFW#∑FWáB÷∆ñv„¶6VÁFW'“Ê7F÷&ÊÊW"É'∂fˆÁB◊6ó¶S¶6∆◊É„á&V“√Ggr√"„á&V“ì∂÷&vñ„£“Ê6ˆÁF7G∂&6∂w&˜VÊC¢G∑BÊ6ˆÁF7D&w”∂6ˆ∆˜#¢G∑BÊ6ˆÁF7EFWáG”∂÷ñ‚÷ÜVñváC£s'fÉ∂Fó7∆ì¶w&ñC∂∆ñv‚÷6ˆÁFVÁC¶6VÁFW'“Ê6ˆÁF7B÷w&ñG∂Fó7∆ì¶w&ñC∂w&ñB◊FV◊∆FR÷6ˆ«V÷Á3£g"g#∂v£SÉ∂∆ñv‚÷óFV◊3ß7F'C∂÷Ç◊vñGFÉ£SÉ∂÷&vñ„¶WF˜“Ê∆VB÷f˜&◊∂Fó7∆ì¶w&ñC∂v£'É∂&6∂w&˜VÊC¢6ffc∂6ˆ∆˜#¢3sS&#∑FFñÊs£#áÉ∂&˜&FW"◊&FóW3£#á“Ê∆VB÷f˜&“∆&V«∂Fó7∆ì¶w&ñC∂v£gÉ∑FWáB÷∆ñv„¶∆VgC∂fˆÁB◊vVñváC£s“Ê∆VB÷f˜&“ñÁWB¬Ê∆VB÷f˜&“FWáF&V∑vñGFÉ£S∑FFñÊs£7É∂&˜&FW#£Ç6ˆ∆ñB6CÜCFSS∂&˜&FW"◊&FóW3£É∂fˆÁC¶ñÊÜW&óG“Ê∆VB÷f˜&“FWáF&V∂÷ñ‚÷ÜVñváC£É∑&W6ó¶SßfW'Fñ6«“Ê∆VB◊7FGW7∂÷ñ‚÷ÜVñváC£#'É∂÷&vñ„£∂6ˆ∆˜#¢3CC6CSS∂fˆÁB◊6ó¶S¢„ì'&V◊÷fˆ˜FW'∑FFñÊs£#áÇrS∑FWáB÷∆ñv„¶6VÁFW#∂6ˆ∆˜#¢G∑BÊ◊WFVG”∂&6∂w&˜VÊC¢G∑BÊÜVFW$&w◊‘∂Wñg&÷W26dfFUW∂g&ˆ◊∂˜6óGì£∑G&Á6f˜&”ßG&Á6∆FUíÉáÇó◊F˜∂˜6óGì£∑G&Á6f˜&”ßG&Á6∆FUíÉó◊“ÊÜW&ÛÊFób¬ÊÜW&Ú÷FV6˜"¬ÁvR÷ÜW&Û‚ß∂Êñ÷Fñˆ„ß6dfFUW„w2V6R&˜Fá“Ê6&G2Ê6&G∂Êñ÷Fñˆ„ß6dfFUW„g2V6R&˜Fá“Ê6&G2Ê6&C¶ÁFÇ÷6Üñ∆BÉ"ó∂Êñ÷Fñˆ‚÷FV∆ì¢„á7“Ê6&G2Ê6&C¶ÁFÇ÷6Üñ∆BÉ2ó∂Êñ÷Fñˆ‚÷FV∆ì¢„g7“Ê6&G2Ê6&C¶ÁFÇ÷6Üñ∆BÉBó∂Êñ÷Fñˆ‚÷FV∆ì¢„#G7‘÷VFñÜ÷Ç◊vñGFÉ£scÇó∂ÜVFW'∑FFñÊs£áÇRS∂∆ñv‚÷óFV◊3¶f∆WÇ◊7F'C∂f∆WÇ÷Fó&V7Fñˆ„¶6ˆ«V÷Á÷Êg∑vñGFÉ£S∂v£gÉ∂˜fW&f∆˜s¶WFÛ∑FFñÊr÷&˜GFˆ”£7á“ÊÜW&Ú¬ÁvR÷ÜW&Ú¬Á6V7FñˆÁ∑FFñÊs£c'ÇbW“Ê6&G2¬Ê6ˆÁF7B÷w&ñB¬Êv∆∆W'í÷w&ñG∂w&ñB◊FV◊∆FR÷6ˆ«V÷Á3£g'“ÊÜW&ÚÊÜW&Ùñ÷w∂w&ñB◊FV◊∆FR÷6ˆ«V÷Á3£g'“ÊÜW&ÚÊÜW&Ùñ÷rñ÷r¬ÊÜW&Ú÷FV6˜'∂ÜVñváC£#Cá◊–£¬˜7Gñ∆S„¬ˆÜVC„∆&ˆGì„∆ÜVFW#„∆#‚G∂W66TáF÷¬áFóF∆Ró”¬ˆ#„∆Êb&ñ÷∆&V√“%:vñÊ2FÚ6óFR#‚G∂Êg”¬ˆÊc„¬ˆÜVFW#„∆÷ñ„‚G∑vT6ˆÁFVÁG”¬ˆ÷ñ„„∆fˆ˜FW#Ï*íG∂ÊWrFFRÇíÊvWDgV∆≈ñV"Çó“G∂W66TáF÷¬áFóF∆Ró”¬ˆfˆ˜FW#„¬ˆ&ˆGì„¬ˆáF÷√Ê∞ß–†¶Wá˜'BgVÊ7Fñˆ‚÷∂U6óFUvW2Üf˜&“¬6«Vrí∞¢&WGW&‚∞¢≤6«Vs¢""¬Ê÷S¢$ñÏ:÷6ñÚ"“¿¢≤6«Vs¢'6ˆ'&R"¬Ê÷S¢%6ˆ'&R"“¿¢≤6«Vs¢'6W'fñ6˜2"¬Ê÷S¢%6W'fú:v˜2"“¿¢≤6«Vs¢&6ˆÁFFÚ"¬Ê÷S¢$6ˆÁFFÚ"“¿¢“Ê÷ÇÜóFV“í”‚á∞¢‚‚ÊóFV“¿¢áF÷√¢÷∂U6óFRÜf˜&“¬óFV“Á6«Vr¬6«Vrí¿¢“íì∞ß–¶6ˆÁ7BW66TáF÷¬“á2í”‡¢7G&ñÊrá2«¬""íÁ&W∆6RÄ¢ı≤c√‚r%“ˆr¿¢Ü2í”‡¢á≤"b#¢"f◊≤"¬#¬#¢"f«C≤"¬#‚#¢"fwC≤"¬"r#¢"b33ì≤"¬r"s¢"gV˜C≤"“ï∞¢0¢“¿¢ì∞†¶Wá˜'BgVÊ7Fñˆ‚vV'6óFT÷ñ∆W7FˆÊW2á6óFRí∞¢6ˆÁ7B'&ñVb“6óFSÚÊ'&ñVb«¬∑”∞¢6ˆÁ7B6W'fñ6T6˜VÁB“'&íÊó4'&íÜ'&ñVbÁ6W'fñ6W2ê¢Ú'&ñVbÁ6W'fñ6W2Ê∆VÊwFÄ¢¢Ü'&ñVbÁ6W'fñ6W2«¬""íÁ7∆óBÇ%∆‚"íÊfñ«FW"ÇáÇí”‚ÇÁG&ñ“ÇííÊ∆VÊwFÉ∞¢6ˆÁ7B&WfñWvVB“6óFSÚÁ&WfñWvVDFWfñ6W2«¬µ”∞¢&WGW&‚∞¢∞¢ñC¢&7&VFVB"¿¢FóF∆S¢%&ˆ¶WFÚ7&ñFÚ"¿¢FWáC¢$vW&"R6«f"V÷:vñÊgVÊ6ñˆÊ¬‚"¿¢FˆÊS¢6óFR¿¢“¿¢∞¢ñC¢&'&ñVb"¿¢FóF∆S¢$'&ñVfñÊr6ˆÁ6ó7FVÁFR"¿¢FWáC¢$ñÊf˜&÷"Êˆ÷R¬6Vv÷VÁFÚRˆ&¶WFófÚF:vñÊ‚"¿¢FˆÊS¢Ä¢6óFRb`¢'&ñVbÊÊ÷Rb`¢'&ñVbÁ6Vv÷VÁBb`¢'&ñVbÊFW67&óFñˆ‚b`¢∆ˆˆ∑4∆ñ∂U6óFTñÁ7G'V7Fñˆ‚Ü'&ñVbÊFW67&óFñˆ‚ê¢í¿¢“¿¢∞¢ñC¢&6ˆÁFVÁB"¿¢FóF∆S¢$6ˆÁF\;¶FÚW7G'WGW&FÚ"¿¢FWáC¢$FVfñÊó"L:◊GV∆Ú&ñÊ6ó¬RV∆Ú÷VÊ˜2Fˆó26W'fú:v˜2‚"¿¢FˆÊS¢á6óFRbb'&ñVbÊÜVF∆ñÊRbb6W'fñ6T6˜VÁB„“"í¿¢“¿¢∞¢ñC¢&ñFVÁFóGí"¿¢FóF∆S¢$ñFVÁFñFFRW'6ˆÊ∆ó¶F"¿¢FWáC¢%W'6ˆÊ∆ó¶"6˜"¬6Ü÷F˜R6ˆÁF\;¶FÚFÚ<;6FñvÚ‚"¿¢FˆÊS¢Ä¢6óFRb`¢á6óFRÊ6ˆFTVFóFVB«¿¢Ü'&ñVbÊ6ˆ∆˜"bb'&ñVbÊ6ˆ∆˜"”“"3fC3ÜS"í«¿¢Ü'&ñVbÊ7Fbb'&ñVbÊ7F”“$f∆"6ˆ“vVÁFR"íê¢í¿¢“¿¢∞¢ñC¢'&W7ˆÁ6ófR"¿¢FóF∆S¢%&Wfó<:6Ú&W7ˆÁ6óf"¿¢FWáC¢$6ˆÊfW&ó"Ú&W7V«FFÚV“FW6∑F˜¬F&∆WBR6V«V∆"‚"¿¢FˆÊS¢≤&FW6∑F˜"¬'F&∆WB"¬&÷ˆ&ñ∆R%“ÊWfW'íÇáÇí”‚&WfñWvVBÊñÊ6«VFW2áÇíí¿¢“¿¢∞¢ñC¢'V&∆ó6ÜVB"¿¢FóF∆S¢%V&∆ñ6:|:6Ú6ˆÊ6«\:÷F"¿¢FWáC¢%V&∆ñ6"ÊÚ6W'fñF˜"R6ˆÊfó&÷"V÷U$¬;¶&∆ñ66W7<:◊fV¬‚"¿¢FˆÊS¢Ä¢6óFSÚÁV&∆ó6ÜVBb`¢6óFSÚÁ6W'fW%V&∆ó6ÜVBb`¢6óFSÚÁV&∆ñ5W&¬b`¢6óFSÚÁV&∆ó6ÜVD@¢í¿¢“¿¢”∞ß–†¶Wá˜'BgVÊ7Fñˆ‚'6U6óFTß6ˆ‚Ü6ˆÁFVÁBí∞¢6ˆÁ7BFWáB“7G&ñÊrÜ6ˆÁFVÁB«¬""ê¢Á&W∆6RÇˆÉÛ¶ß6ˆ‚ìÚˆví¬""ê¢Á&W∆6RÇˆˆr¬""ê¢ÁG&ñ“Çì∞¢6ˆÁ7B÷F6Ç“FWáBÊ÷F6ÇÇı«µµ«5≈5“•«“Úì∞¢ñbÇ÷F6ÇíFá&˜rÊWrW'&˜"Ç$&W7˜7FÏ:6ÚG&˜WÜR«FW&:|;VW2W7G'WGW&F2‚"ì∞¢&WGW&‚•4Ù‚Á'6RÜ÷F6Ö≥“ì∞ß–†¶gVÊ7Fñˆ‚6óFUfó7VƒVFóF˜"á≤'&ñVb¬ˆ‰6ÜÊvR“í∞¢6ˆÁ7Bv∆∆W'í“'&ñVbÊv∆∆W'í«¬µ”∞¢6ˆÁ7BFW7Fñ÷ˆÊñ«2“'&ñVbÁFW7Fñ÷ˆÊñ«2«¬µ”∞¢6ˆÁ7BF6Ñ∆ó7B“Ü∂Wí¬∆ó7Bí”‚ˆ‰6ÜÊvRá≤∂∂Wï”¢∆ó7B“ì∞¢&WGW&‚Ä¢∆Fób6∆74Ê÷S“'6óFR◊fó7V¬÷VFóF˜"#‡¢ƒfñV∆B∆&V√“$W7Fñ∆Úfó7V¬#‡¢∆Fób6∆74Ê÷S“'FÜV÷R◊ñ6∂W"#‡¢µ4ïDUıDÑT‘U2Ê÷ÇÜóFV“í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂óFV“ÊñG–¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S◊≤Ü'&ñVbÁFÜV÷R«¬&÷ˆFW&ÊÚ"í””“óFV“ÊñBÚ&7FófR"¢"'–¢7Gñ∆S◊∑≤&6∂w&˜VÊC¢óFV“Á7vF6Ç◊–¢ˆ‰6∆ñ6≥◊≤Çí”‚ˆ‰6ÜÊvRá≤FÜV÷S¢óFV“ÊñB“ó–¢‡¢∂óFV“Ê∆&V«–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬ÙfñV∆C‡¢ƒfñV∆@¢∆&V√“$f˜&÷FÚFÚF˜ÚF:vñÊ ¢ÜñÁC“$FófñFñFÚW6ñ÷vV“FR6Ü˜RV“FW7FVRFV6˜&FófÚ6RÏ:6ÚÜ˜WfW"í‚ñ◊7FÚ6VÁG&∆ó¶V“L:◊GV∆Úw&ÊFR‚ ¢‡¢∆Fób6∆74Ê÷S“'FÜV÷R◊ñ6∂W"ÜW&Ú◊7Gñ∆R◊ñ6∂W"#‡¢¥ÑU$ıı5EîƒU2Ê÷ÇÜóFV“í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂óFV“ÊñG–¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S◊∞¢Ü'&ñVbÊÜW&ı7Gñ∆R«¬&6VÁG&FÚ"í””“óFV“ÊñBÚ&7FófR"¢" ¢–¢ˆ‰6∆ñ6≥◊≤Çí”‚ˆ‰6ÜÊvRá≤ÜW&ı7Gñ∆S¢óFV“ÊñB“ó–¢‡¢∂óFV“Ê∆&V«–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬ÙfñV∆C‡¢ƒfñV∆@¢∆&V√“$ñ÷vV“FR6ÖU$¬¬˜6ñˆÊ¬í ¢ÜñÁC“%W6RV“∆ñÊ≤áGG3¢ÚÚFRV÷ñ÷vV“7V‚fñ6Ú∆FÚFÚL:◊GV∆ÚÊ:vñÊñÊñ6ñ¬‚ ¢‡¢∆ñÁW@¢f«VS◊∂'&ñVbÊÜW&Ùñ÷vR«¬"'–¢ˆ‰6ÜÊvS◊≤ÜRí”‚ˆ‰6ÜÊvRá≤ÜW&Ùñ÷vS¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“&áGG3¢ÚÚ‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$v∆W&ñFRf˜F˜2Ü˜6ñˆÊ¬í#‡¢∆Fób6∆74Ê÷S“&∆ó7B÷VFóF˜"#‡¢∂v∆∆W'íÊ÷ÇÜóFV“¬íí”‚Ä¢∆Fób6∆74Ê÷S“&∆ó7B÷VFóF˜"◊&˜r"∂Wì◊∂ó”‡¢∆ñÁW@¢f«VS◊∂óFV“ÁW&«–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢F6Ñ∆ó7BÄ¢&v∆∆W'í"¿¢v∆∆W'íÊ÷ÇÜr¬Çí”‚áÇ””“íÚ≤‚‚Êr¬W&√¢RÁF&vWBÁf«VR“¢ríí¿¢ê¢–¢∆6VÜˆ∆FW#“%U$¬Fñ÷vV“ÜáGG3¢ÚÚ‚‚‚í ¢Û‡¢∆ñÁW@¢f«VS◊∂óFV“Ê6FñˆÁ–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢F6Ñ∆ó7BÄ¢&v∆∆W'í"¿¢v∆∆W'íÊ÷ÇÜr¬Çí”‡¢Ç””“íÚ≤‚‚Êr¬6Fñˆ„¢RÁF&vWBÁf«VR“¢r¿¢í¿¢ê¢–¢∆6VÜˆ∆FW#“$∆VvVÊFÜ˜6ñˆÊ¬í ¢Û‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‚F6Ñ∆ó7BÇ&v∆∆W'í"¬v∆∆W'íÊfñ«FW"ÇÖÚ¬Çí”‚Ç”“ííó–¢‡¢≈G&6É"6ó¶S◊≥g“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢íó–¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µ«W7–¢ˆ‰6∆ñ6≥◊≤Çí”‚F6Ñ∆ó7BÇ&v∆∆W'í"¬≤‚‚Êv∆∆W'í¬≤W&√¢""¬6Fñˆ„¢""’“ó–¢‡¢Fñ6ñˆÊ"f˜F¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$FWˆñ÷VÁF˜2FR6∆ñVÁFW2Ü˜6ñˆÊ¬í#‡¢∆Fób6∆74Ê÷S“&∆ó7B÷VFóF˜"#‡¢∑FW7Fñ÷ˆÊñ«2Ê÷ÇÜóFV“¬íí”‚Ä¢∆Fób6∆74Ê÷S“&∆ó7B÷VFóF˜"◊&˜rFW7Fñ÷ˆÊñ¬◊&˜r"∂Wì◊∂ó”‡¢∆ñÁW@¢f«VS◊∂óFV“ÊÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢F6Ñ∆ó7BÄ¢'FW7Fñ÷ˆÊñ«2"¿¢FW7Fñ÷ˆÊñ«2Ê÷ÇáB¬Çí”‡¢Ç””“íÚ≤‚‚ÁB¬Ê÷S¢RÁF&vWBÁf«VR“¢B¿¢í¿¢ê¢–¢∆6VÜˆ∆FW#“$Êˆ÷RFÚ6∆ñVÁFR ¢Û‡¢∆ñÁW@¢f«VS◊∂óFV“Á&ˆ∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢F6Ñ∆ó7BÄ¢'FW7Fñ÷ˆÊñ«2"¿¢FW7Fñ÷ˆÊñ«2Ê÷ÇáB¬Çí”‡¢Ç””“íÚ≤‚‚ÁB¬&ˆ∆S¢RÁF&vWBÁf«VR“¢B¿¢í¿¢ê¢–¢∆6VÜˆ∆FW#“$6&vÚ˜RV◊&W6Ü˜6ñˆÊ¬í ¢Û‡¢«FWáF&V¢f«VS◊∂óFV“ÁV˜FW–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢F6Ñ∆ó7BÄ¢'FW7Fñ÷ˆÊñ«2"¿¢FW7Fñ÷ˆÊñ«2Ê÷ÇáB¬Çí”‡¢Ç””“íÚ≤‚‚ÁB¬V˜FS¢RÁF&vWBÁf«VR“¢B¿¢í¿¢ê¢–¢∆6VÜˆ∆FW#“$ÚVRÚ6∆ñVÁFRFó76R ¢Û‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢F6Ñ∆ó7BÇ'FW7Fñ÷ˆÊñ«2"¬FW7Fñ÷ˆÊñ«2Êfñ«FW"ÇÖÚ¬Çí”‚Ç”“ííê¢–¢‡¢≈G&6É"6ó¶S◊≥g“Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢íó–¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µ«W7–¢ˆ‰6∆ñ6≥◊≤Çí”‡¢F6Ñ∆ó7BÇ'FW7Fñ÷ˆÊñ«2"¬∞¢‚‚ÁFW7Fñ÷ˆÊñ«2¿¢≤Ê÷S¢""¬&ˆ∆S¢""¬V˜FS¢""“¿¢“ê¢–¢‡¢Fñ6ñˆÊ"FWˆñ÷VÁF¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢ì∞ß–†¶gVÊ7Fñˆ‚6óFW2á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B¬vÚ“í∞¢6ˆÁ7B∂÷ˆF¬¬6WD÷ˆF≈““W6U7FFRÜf«6Rí¿¢∑&WfñWr¬6WE&WfñWu““W6U7FFRÜÁV∆¬í¿¢∂FWfñ6R¬6WDFWfñ6U““W6U7FFRÇ&FW6∑F˜"í¿¢∂VFóD6ˆFR¬6WDVFóD6ˆFU““W6U7FFRÜf«6Rí¿¢∑V&∆ó6ÜñÊr¬6WEV&∆ó6ÜñÊu““W6U7FFRÜf«6Rí¿¢∑6óFTW'&˜"¬6WE6óFTW'&˜%““W6U7FFRÇ""í¿¢∂∆VG2¬6WD∆VG5““W6U7FFRÖµ“í¿¢∂∆ˆFñÊt∆VG2¬6WD∆ˆFñÊt∆VG5““W6U7FFRÜf«6Rí¿¢∂vVÊW&FñÊr¬6WDvVÊW&FñÊu““W6U7FFRÜf«6Rí¿¢∑6óFT6ÜEFWáB¬6WE6óFT6ÜEFWáE““W6U7FFRÇ""í¿¢∑6óFT6ÜD'W7í¬6WE6óFT6ÜD'W7ï““W6U7FFRÜf«6Rí¿¢∂7W7Fˆ÷ó¶ñÊr¬6WD7W7Fˆ÷ó¶ñÊu““W6U7FFRÜf«6Rí¿¢∑&WfñWuvR¬6WE&WfñWuvU““W6U7FFRÇ""ì∞¢6ˆÁ7B∂f˜&“¬6WDf˜&’““W6U7FFRá∞¢Ê÷S¢'W6ñÊW73ÚÊÊ÷R«¬""¿¢6Vv÷VÁC¢'W6ñÊW73ÚÁ6Vv÷VÁB«¬""¿¢ñÁ7G'V7FñˆÁ3¢""¿¢FW67&óFñˆ„¢""¿¢ÜVF∆ñÊS¢""¿¢6W'fñ6W3¢'W6ñÊW73ÚÊˆffW"«¬""¿¢7F¢$f∆"6ˆ“vVÁFR"¿¢6ˆÁF7C¢"66ˆÁFFÚ"¿¢6ˆ∆˜#¢"3fC3ÜS"¿¢FÜV÷S¢&÷ˆFW&ÊÚ"¿¢ÜW&ı7Gñ∆S¢&6VÁG&FÚ"¿¢ÜW&Ùñ÷vS¢""¿¢v∆∆W'ì¢µ“¿¢FW7Fñ÷ˆÊñ«3¢µ“¿¢f¢µ“¿¢fVGW&W3¢µ“¿¢Üˆ÷T&∆ˆ6∑3¢µ“¿¢“ì∞¢6ˆÁ7B6óFW2“F"Á6óFW2Êfñ«FW"Ä¢áÇí”‚'W6ñÊW72«¬ÇÊ'W6ñÊW74ñB””“'W6ñÊW72ÊñB¿¢ì∞¢6ˆÁ7BvVÊW&FR“7ñÊ2ÜRí”‚∞¢RÁ&WfVÁDFVfV«BÇì∞¢ñbÇf˜&“ÊñÁ7G'V7FñˆÁ2ÁG&ñ“Çí«¬vVÊW&FñÊrí&WGW&„∞¢6WDvVÊW&FñÊráG'VRì∞¢6WE6óFTW'&˜"Ç""ì∞¢∆WBvVÊW&FVD'&ñVb“≤‚‚Êf˜&“”∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢7V6ñ∆ó7C¢$7&ñF˜"FR6óFW2"¿¢‚‚Êïv˜&∑76T6ˆÁFWáBÜ'W6ñÊW72í¿¢&ˆ◊C¢G&Á6f˜&÷RÚ'&ñVfñÊr&óÜÚV“6ˆÁF\;¶FÚ;¶&∆ñ6ÚFRV“6óFR&ˆfó76ñˆÊ¬R;¶Êñ6Ú¬WfóFÊFÚV“∆ñ˜WBvVÏ:ó&ñ6ÚñwV¬&V«VW"ÊV|;66ñÚ‚Ú'&ñVfñÊr:íV÷ñÁ7G'\:|:6ÚñÁFW&ÊRÂT‰4ˆFR&V6W"∆óFW&∆÷VÁFRÊ˜2FWáF˜2FÚ6óFR‚Ï:6ÚñÁfVÁFR6∆ñVÁFW2¬Ï;¶÷W&˜2¬FWˆñ÷VÁF˜2˜RfF˜2‚&W7ˆÊF4Ù‘TÂDR6ˆ“•4Ù‚l:∆ñFÚ¬6V“÷&∂F˜v‚¬W6ÊFÚ˜26◊˜3¢ÜVF∆ñÊR¬FW67&óFñˆ‚ÜL:í#C6&7FW&W2¬FWáFÚ&fó6óFÁFW2í¬&˜WEFóF∆R¬&˜WB¬6W'fñ6W2Ü∆ó7FFRˆ&¶WF˜26ˆ“FóF∆RRFW67&óFñˆ‚í¬7F¬fÜ∆ó7FFR2Rˆ&¶WF˜26ˆ“VW7Fñˆ‚RÁ7vW"¬L;ßfñF2vVÏ:ó&ñ626ˆ'&R6ˆ÷ÚgVÊ6ñˆÊÚFVÊFñ÷VÁFÚ¬6V“ñÁfVÁF"&\:v˜2¬&¶˜2˜RÏ;¶÷W&˜2W7V<:÷fñ6˜2í¬fVGW&W2Ü∆ó7FFR2Bˆ&¶WF˜26ˆ“FóF∆RRFW67&óFñˆ‚¬FñfW&VÊ6ñó2vVÁ\:÷Ê˜26ˆ“&6RÊÚ'&ñVfñÊr¬6V“Ï;¶÷W&˜2ñÁfVÁFF˜2í¬ÜW&ı7Gñ∆RÜW66ˆ∆Ü&6VÁG&FÚ"¬&FófñFñFÚ"˜R&ñ◊7FÚ"6ˆÊf˜&÷RÚFˆ“FÚÊV|;66ñÛ¢&ñ◊7FÚ"&∆vÚ÷ó2˜W6FÚˆ÷ˆFW&ÊÚ¬&FófñFñFÚ"&∆vÚfó7V¬¬&6VÁG&FÚ"&∆vÚ6Ã:76ñ6Úˆ6ˆÊfú:fV¬í¬Üˆ÷T&∆ˆ6∑2Ü∆ó7F˜&FVÊF6ˆ“6ˆ÷&ñÊ:|:6ÚVRfó¶W"÷ó26VÁFñFÚ¬W6ÊFÚ6ˆ÷VÁFR˜2ñG3¢&fVGW&W2"¬&v∆∆W'í"¬'FW7Fñ÷ˆÊñ«2"¬&7F"íÂ∆Â∆‰Êˆ÷S¢G∂f˜&“ÊÊ÷W’∆Â6Vv÷VÁFÛ¢G∂f˜&“Á6Vv÷VÁG’∆‰'&ñVfñÊrñÁFW&ÊÛ¢G∂f˜&“ÊñÁ7G'V7FñˆÁ2Á6∆ñ6RÉ¬Có’∆Â6W'fú:v˜2ñÊf˜&÷F˜3¢Gµ7G&ñÊrÜf˜&“Á6W'fñ6W2«¬""íÁ6∆ñ6RÉ¬có’∆ÂFWáFÚ;¶&∆ñ6ÚñÊf˜&÷FÛ¢G∂f˜&“ÊFW67&óFñˆ‚Á6∆ñ6RÉ¬Éó÷¿¢“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbá&W7ˆÁ6RÊˆ≤bbFFÊ6ˆÁFVÁBê¢vVÊW&FVD'&ñVb“÷W&vU6óFT'&ñVbÜf˜&“¬'6U6óFTß6ˆ‚ÜFFÊ6ˆÁFVÁBíì∞¢“6F6Ç∞¢vVÊW&FVD'&ñVb“÷W&vU6óFT'&ñVbÜf˜&“¬∑“ì∞¢–¢∆WB6«Vr“6«VvñgíÜf˜&“ÊÊ÷R«¬'W6ñÊW73ÚÊÊ÷R«¬&÷WR◊6óFR"ì∞¢∆WB‚“#∞¢vÜñ∆RÜF"Á6óFW2Á6ˆ÷RÇáÇí”‚ÇÁ6«Vr””“6«Vríê¢6«Vr“G∑6«VvñgíÜf˜&“ÊÊ÷Ró““G∂‚≤∑÷∞¢6ˆÁ7BvW2“÷∂U6óFUvW2ÜvVÊW&FVD'&ñVb¬6«Vrì∞¢6ˆÁ7B6óFR“∞¢ñC¢VñBÇí¿¢Ê÷S¢f˜&“ÊÊ÷R«¬$Ê˜fÚ6óFR"¿¢6«Vr¿¢áF÷√¢vW5≥“ÊáF÷¬¿¢vW2¿¢'&ñVc¢vVÊW&FVD'&ñVb¿¢6ÜC¢∞¢∞¢ñC¢VñBÇí¿¢&ˆ∆S¢&76ó7FÁB"¿¢6ˆÁFVÁC†¢%6WR6óFRfˆí7&ñFÚ6ˆ“:vñÊ2FRñÏ:÷6ñÚ¬6ˆ'&R¬6W'fú:v˜2R6ˆÁFFÚ‚\:vV«VW"«FW&:|:6Ú˜"Ví‚"¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢“¿¢“¿¢V&∆ó6ÜVC¢f«6R¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢∆VG3¢µ“¿¢&WfñWvVDFWfñ6W3¢µ“¿¢6ˆFTVFóFVC¢f«6R¿¢6W'fW%V&∆ó6ÜVC¢f«6R¿¢V&∆ñ5W&√¢ÁV∆¬¿¢V&∆ó6ÜVDC¢ÁV∆¬¿¢”∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬6óFW3¢∑6óFR¬‚‚ÊBÁ6óFW5““íì∞¢6WD÷ˆF¬Üf«6Rì∞¢6WE&WfñWrá6óFRÊñBì∞¢6WEFˆ7BÇ%6óFR6ˆ◊∆WFÚ7&ñFÚR6«fÚ"ì∞¢6WDvVÊW&FñÊrÜf«6Rì∞¢”∞¢6ˆÁ7B7W'&VÁB“F"Á6óFW2ÊfñÊBÇáÇí”‚ÇÊñB””“&WfñWrì∞¢6ˆÁ7B6V∆V7FVE6óFUvR“7W'&VÁCÚÁvW3ÚÊfñÊBÄ¢ÜóFV“í”‚óFV“Á6«Vr””“&WfñWuvR¿¢ì∞¢6ˆÁ7B&WfñWtáF÷¬“6V∆V7FVE6óFUvSÚÊáF÷¬«¬7W'&VÁCÚÊáF÷¬«¬"#∞¢W6TVffV7BÇÇí”‚∞¢6ˆÁ7BñB“6WEFñ÷V˜WBÇÇí”‚6WE&WfñWuvRÇ""í¬ì∞¢&WGW&‚Çí”‚6∆V%Fñ÷V˜WBÜñBì∞¢“¬∑&WfñWu“ì∞¢6ˆÁ7B˜vÊW$ñB“7FófU76TñBÇí«¬F"ÁW6W"ÊñC∞¢6ˆÁ7BWFFU6óFR“W6T6∆∆&6≤Ä¢ÜñB¬F6Çí”‡¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢6óFW3¢BÁ6óFW2Ê÷ÇáÇí”‡¢ÇÊñB””“ñ@¢Ú≤‚‚ÁÇ¬‚‚ÁF6Ç¬WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí–¢¢Ç¿¢í¿¢“íí¿¢∑WFFU“¿¢ì∞¢6ˆÁ7B6óFU&WVW7B“W6T6∆∆&6≤Ü7ñÊ2Ü7Fñˆ‚¬&ˆGíí”‚∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÜˆí˜6óFW2ÚG∂7FñˆÁ÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤‚‚Ê&ˆGí¬˜vÊW$ñB“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6ˆÊ6«Vó"V&∆ñ6:|:6Ú‚"ì∞¢&WGW&‚FF∞¢“¬∂˜vÊW$ñE“ì∞¢6ˆÁ7BWFFT'&ñVb“áF6Çí”‚∞¢ñbÇ7W'&VÁBí&WGW&„∞¢6ˆÁ7B'&ñVb“≤‚‚‚Ü7W'&VÁBÊ'&ñVb«¬∑“í¬‚‚ÁF6Ç”∞¢6ˆÁ7BvW2“÷∂U6óFUvW2Ü'&ñVb¬7W'&VÁBÁ6«Vrì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢'&ñVb¿¢vW2¿¢áF÷√¢vW5≥“ÊáF÷¬¿¢6W'fW%V&∆ó6ÜVC¢f«6R¿¢“ì∞¢”∞¢6ˆÁ7B&Wó$∆Vv7ï6óFR“W6T6∆∆&6≤Ü7ñÊ2Çí”‚∞¢ñbÇ7W'&VÁBí&WGW&„∞¢6ˆÁ7Bˆ∆D'&ñVb“7W'&VÁBÊ'&ñVb«¬∑”∞¢6ˆÁ7B'&ñVb“÷W&vU6óFT'&ñVbÄ¢∞¢‚‚Êˆ∆D'&ñVb¿¢ñÁ7G'V7FñˆÁ3¢ˆ∆D'&ñVbÊñÁ7G'V7FñˆÁ2«¬ˆ∆D'&ñVbÊFW67&óFñˆ‚«¬""¿¢FW67&óFñˆ„¢6óFTf∆∆&6¥FW67&óFñˆ‚Üˆ∆D'&ñVbí¿¢“¿¢∑“¿¢ì∞¢6ˆÁ7BvW2“÷∂U6óFUvW2Ü'&ñVb¬7W'&VÁBÁ6«Vrì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢'&ñVb¿¢vW2¿¢áF÷√¢vW5≥“ÊáF÷¬¿¢6W'fW%V&∆ó6ÜVC¢f«6R¿¢6ÜC¢∞¢‚‚‚Ü7W'&VÁBÊ6ÜB«¬µ“í¿¢∞¢ñC¢VñBÇí¿¢&ˆ∆S¢&76ó7FÁB"¿¢6ˆÁFVÁC†¢%6W&VíÚ'&ñVfñÊrñÁFW&ÊÚFÚFWáFÚ;¶&∆ñ6ÚR&V6ˆÁ7G'\:“2:vñÊ26V“WÜñ&ó"2ñÁ7G'\:|;VW2‚"¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢“¿¢“¿¢“ì∞¢ñbÜ7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜVBí∞¢6WEV&∆ó6ÜñÊráG'VRì∞¢G'í∞¢6ˆÁ7BFF“vóB6óFU&WVW7BÇ'V&∆ó6Ç"¬∞¢ñC¢7W'&VÁBÊñB¿¢6«Vs¢7W'&VÁBÁ6«Vr¿¢Ê÷S¢7W'&VÁBÊÊ÷R¿¢FW67&óFñˆ„¢'&ñVbÊFW67&óFñˆ‚¿¢áF÷√¢vW5≥“ÊáF÷¬¿¢vW2¿¢“ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢V&∆ó6ÜVC¢G'VR¿¢6W'fW%V&∆ó6ÜVC¢G'VR¿¢V&∆ñ5W&√¢FFÁW&¬¿¢V&∆ó6ÜVDC¢FFÁV&∆ó6ÜVDB¿¢“ì∞¢6WEFˆ7BÇ$6ˆÁF\;¶FÚ6˜'&ñvñFÚRV&∆ñ6:|:6ÚGV∆ó¶F"ì∞¢“6F6ÇÜW'&˜"í∞¢6WE6óFTW'&˜"Ä¢W'&˜"Ê÷W76vR«¬$6˜'&ñvñ÷˜2Ú6óFR¬÷2f«F&WV&∆ñ6"‚"¿¢ì∞¢6WEFˆ7BÇ$6ˆÁF\;¶FÚ6˜'&ñvñFÛ≤&Wfó6RRGV∆ó¶RV&∆ñ6:|:6Ú"ì∞¢“fñÊ∆«í∞¢6WEV&∆ó6ÜñÊrÜf«6Rì∞¢–¢“V«6R∞¢6WEFˆ7BÇ$'&ñVfñÊr&V÷˜fñFÚFÚ6ˆÁF\;¶FÚ;¶&∆ñ6Ú"ì∞¢–¢“¬∂7W'&VÁB¬6WEFˆ7B¬6óFU&WVW7B¬WFFU6óFU“ì∞¢6ˆÁ7B&WVW7E6óFT6ÜÊvR“7ñÊ2Çí”‚∞¢6ˆÁ7B&WVW7B“6óFT6ÜEFWáBÁG&ñ“Çì∞¢ñbÇ7W'&VÁB«¬&WVW7B«¬6óFT6ÜD'W7íí&WGW&„∞¢6ˆÁ7BW6W$÷W76vR“∞¢ñC¢VñBÇí¿¢&ˆ∆S¢'W6W""¿¢6ˆÁFVÁC¢&WVW7B¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢”∞¢6WE6óFT6ÜEFWáBÇ""ì∞¢6WE6óFT6ÜD'W7íáG'VRì∞¢6WE6óFTW'&˜"Ç""ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢6ÜC¢≤‚‚‚Ü7W'&VÁBÊ6ÜB«¬µ“í¬W6W$÷W76vU“¿¢“ì∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢7V6ñ∆ó7C¢$7&ñF˜"FR6óFW2"¿¢‚‚Êïv˜&∑76T6ˆÁFWáBÜ'W6ñÊW72í¿¢&ˆ◊C¢fˆ<:¢W7L:VFóFÊFÚV“6óFRWÜó7FVÁFR˜"6ˆÁfW'6‚«FW&RT‰2ÚVRÚW7\:&ñÚVFóRR&W6W'fRFˆFÚÚ&W7FÚ‚ÚVFñFÚ:íV÷ñÁ7G'\:|:6ÚñÁFW&ÊRÁVÊ6FWfR&V6W"6ˆ÷ÚFWáFÚFÚ6óFR‚Ï:6ÚñÁfVÁFRfF˜2‚fˆ<:¢F÷,:ñ“ˆFR&V˜&vÊó¶"W7G'WGW&F:vñÊñÊñ6ñ¬VÊFÚVFñFÚÜFñ6ñˆÊ"¬&V÷˜fW"˜R&V˜&FVÊ"6\:|;VW2í‚&W7ˆÊF4Ù‘TÂDR6ˆ“V“ˆ&¶WFÚ•4Ù‚6ˆÁFVÊFÚVÊ2˜26◊˜2«FW&F˜2VÁG&S¢Ê÷R¬6Vv÷VÁB¬ÜVF∆ñÊR¬FW67&óFñˆ‚¬&˜WEFóF∆R¬&˜WB¬6W'fñ6W2Ü∆ó7FFRˆ&¶WF˜26ˆ“FóF∆RRFW67&óFñˆ‚í¬7F¬6ˆÁF7B¬6ˆ∆˜"¬fÜ∆ó7FFRˆ&¶WF˜26ˆ“VW7Fñˆ‚RÁ7vW"¬6V“ñÁfVÁF"&\:v˜2¬&¶˜2˜RÏ;¶÷W&˜2W7V<:÷fñ6˜2í¬fVGW&W2Ü∆ó7FFRˆ&¶WF˜26ˆ“FóF∆RRFW67&óFñˆ‚¬FñfW&VÊ6ñó26V“Ï;¶÷W&˜2ñÁfVÁFF˜2í¬ÜW&ı7Gñ∆RÇ&6VÁG&FÚ"¬&FófñFñFÚ"˜R&ñ◊7FÚ"í¬Üˆ÷T&∆ˆ6∑2Ü∆ó7F˜&FVÊFW6ÊFÚ6ˆ÷VÁFR˜2ñG2&fVGW&W2"¬&v∆∆W'í"¬'FW7Fñ÷ˆÊñ«2"¬&7F"(	BñÊ6«V<;2ÚVRFWfR&V6W"Ê:vñÊñÊñ6ñ¬¬Ê˜&FV“VFñFíÂ∆Â∆Â6óFRGV√•∆‚G¥•4Ù‚Á7G&ñÊvñgíÜ7W'&VÁBÊ'&ñVb«¬∑“íÁ6∆ñ6RÉ¬ó’∆Â∆‰«FW&:|:6ÚVFñF¢G∑&WVW7BÁ6∆ñ6RÉ¬3ó÷¿¢“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬∆ñ6"«FW&:|:6Ú‚"ì∞¢6ˆÁ7BF6Ç“'6U6óFTß6ˆ‚ÜFFÊ6ˆÁFVÁBì∞¢6ˆÁ7B'&ñVb“÷W&vU6óFT'&ñVbÜ7W'&VÁBÊ'&ñVb«¬∑“¬F6Çì∞¢6ˆÁ7BvW2“÷∂U6óFUvW2Ü'&ñVb¬7W'&VÁBÁ6«Vrì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢Ê÷S¢'&ñVbÊÊ÷R«¬7W'&VÁBÊÊ÷R¿¢'&ñVb¿¢vW2¿¢áF÷√¢vW5≥“ÊáF÷¬¿¢6W'fW%V&∆ó6ÜVC¢f«6R¿¢6ÜC¢∞¢‚‚‚Ü7W'&VÁBÊ6ÜB«¬µ“í¿¢W6W$÷W76vR¿¢∞¢ñC¢VñBÇí¿¢&ˆ∆S¢&76ó7FÁB"¿¢6ˆÁFVÁC†¢$«FW&:|:6Ú∆ñ6F‚&Wfó6RÚ&W7V«FFÚÚ∆FÛ≤fˆ<:¢ˆFR6ˆÁFñÁV"VFñÊFÚßW7FW2‚"¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢“¿¢“¿¢“ì∞¢6WEFˆ7BÇ$«FW&:|:6Ú∆ñ6FÚ6óFR"ì∞¢“6F6ÇÜW'&˜"í∞¢6WE6óFTW'&˜"ÜW'&˜"Ê÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬«FW&"Ú6óFRv˜&‚"ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢6ÜC¢∞¢‚‚‚Ü7W'&VÁBÊ6ÜB«¬µ“í¿¢W6W$÷W76vR¿¢∞¢ñC¢VñBÇí¿¢&ˆ∆S¢&76ó7FÁB"¿¢6ˆÁFVÁC†¢$Ï:6Ú6ˆÁ6VwVí∆ñ6"W76«FW&:|:6Úv˜&‚FVÁFRFW67&WfW"ÚFWáFÚ¬6\:|:6Ú˜R6˜"VRFW6V¶◊VF"‚"¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢“¿¢“¿¢“ì∞¢“fñÊ∆«í∞¢6WE6óFT6ÜD'W7íÜf«6Rì∞¢–¢”∞¢W6TVffV7BÇÇí”‚∞¢ñbÇ7W'&VÁB«¬∆ˆˆ∑4∆ñ∂U6óFTñÁ7G'V7Fñˆ‚Ü7W'&VÁBÊ'&ñVcÚÊFW67&óFñˆ‚íê¢&WGW&‚VÊFVfñÊVC∞¢6ˆÁ7BñB“6WEFñ÷V˜WBÇÇí”‚∞¢&Wó$∆Vv7ï6óFRÇì∞¢“¬ì∞¢&WGW&‚Çí”‚6∆V%Fñ÷V˜WBÜñBì∞¢“¬∂7W'&VÁB¬7W'&VÁCÚÊñB¬&Wó$∆Vv7ï6óFU“ì∞¢6ˆÁ7BF˜vÊ∆ˆB“á2í”‚∞¢6ˆÁ7B&∆ˆ"“ÊWr&∆ˆ"Ö∑2ÊáF÷≈“¬≤GóS¢'FWáBˆáF÷¬"“í¿¢“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢Êá&Vb“U$¬Ê7&VFTˆ&¶V7EU$¬Ü&∆ˆ"ì∞¢ÊF˜vÊ∆ˆB“G∑2Á6«Vw“ÊáF÷∆∞¢Ê6∆ñ6≤Çì∞¢U$¬Á&Wfˆ∂Tˆ&¶V7EU$¬ÜÊá&Vbì∞¢”∞¢6ˆÁ7BV&∆ó6Ö6óFR“7ñÊ2Çí”‚∞¢ñbÇ7W'&VÁB«¬V&∆ó6ÜñÊrí&WGW&„∞¢6WEV&∆ó6ÜñÊráG'VRì∞¢6WE6óFTW'&˜"Ç""ì∞¢G'í∞¢ñbÜ7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜVBí∞¢vóB6óFU&WVW7BÇ'VÁV&∆ó6Ç"¬≤ñC¢7W'&VÁBÊñB“ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢V&∆ó6ÜVC¢f«6R¿¢6W'fW%V&∆ó6ÜVC¢f«6R¿¢V&∆ñ5W&√¢ÁV∆¬¿¢V&∆ó6ÜVDC¢ÁV∆¬¿¢“ì∞¢6WEFˆ7BÇ%6óFRFW7V&∆ñ6FÚ"ì∞¢“V«6R∞¢6ˆÁ7BFF“vóB6óFU&WVW7BÇ'V&∆ó6Ç"¬∞¢ñC¢7W'&VÁBÊñB¿¢6«Vs¢7W'&VÁBÁ6«Vr¿¢Ê÷S¢7W'&VÁBÊÊ÷R¿¢FW67&óFñˆ„¢7W'&VÁBÊ'&ñVcÚÊFW67&óFñˆ‚«¬""¿¢áF÷√¢7W'&VÁBÊáF÷¬¿¢vW3¢7W'&VÁBÁvW2«¬µ“¿¢“ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢6«Vs¢FFÁ6«Vr¿¢V&∆ó6ÜVC¢G'VR¿¢6W'fW%V&∆ó6ÜVC¢G'VR¿¢V&∆ñ5W&√¢FFÁW&¬¿¢V&∆ó6ÜVDC¢FFÁV&∆ó6ÜVDB¿¢“ì∞¢6WEFˆ7BÄ¢7W'&VÁBÁV&∆ó6ÜV@¢Ú%V&∆ñ6:|:6ÚGV∆ó¶F ¢¢%6óFRV&∆ñ6FÚFRfW&FFR"¿¢ì∞¢–¢“6F6ÇÜW'&˜"í∞¢6WE6óFTW'&˜"ÜW'&˜"Ê÷W76vRì∞¢“fñÊ∆«í∞¢6WEV&∆ó6ÜñÊrÜf«6Rì∞¢–¢”∞¢6ˆÁ7BFV∆WFU6óFR“7ñÊ2á6óFRí”‚∞¢ñbÄ¢6ˆÊfó&“Ä¢WÜ6«Vó"G∑6óFRÊÊ÷W”ÚW7F:|:6Ú&V÷˜fRF÷,:ñ“:vñÊ;¶&∆ñ6R˜2∆VG2&V6V&ñF˜2Ê¿¢ê¢ê¢&WGW&„∞¢G'í∞¢vóB6óFU&WVW7BÇ&FV∆WFR"¬≤ñC¢6óFRÊñB“ì∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬6óFW3¢BÁ6óFW2Êfñ«FW"ÇáÇí”‚ÇÊñB”“6óFRÊñBí“íì∞¢ñbá&WfñWr””“6óFRÊñBí6WE&WfñWrÜÁV∆¬ì∞¢6WEFˆ7BÇ%6óFRWÜ6«\:÷FÚ"ì∞¢“6F6ÇÜW'&˜"í∞¢6WEFˆ7BÜW'&˜"Ê÷W76vRì∞¢–¢”∞†¢W6TVffV7BÇÇí”‚∞¢ñbÇ7W'&VÁCÚÁV&∆ó6ÜVBí∞¢6ˆÁ7BñB“6WEFñ÷V˜WBÇÇí”‚6WD∆VG2Öµ“í¬ì∞¢&WGW&‚Çí”‚6∆V%Fñ÷V˜WBÜñBì∞¢–¢∆WB6Ê6V∆∆VB“f«6S∞¢6ˆÁ7BñB“6WEFñ÷V˜WBÇÇí”‚∞¢6WD∆ˆFñÊt∆VG2áG'VRì∞¢fWF6ÇÜˆí˜6óFW2ˆ∆VG3˜6óFUˆñC“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜ7W'&VÁBÊñBó÷¬∞¢ÜVFW'3¢WFÑÜVFW'2Çí¿¢“ê¢ÁFÜV‚Ü7ñÊ2á&W7ˆÁ6Rí”‚á∞¢ˆ≥¢&W7ˆÁ6RÊˆ≤¿¢FF¢vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íí¿¢“íê¢ÁFÜV‚Çá≤ˆ≤¬FF“í”‚∞¢ñbÜ6Ê6V∆∆VBí&WGW&„∞¢ñbÇˆ≤ê¢Fá&˜rÊWrW'&˜"Ä¢FFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6'&Vv"˜26ˆÁFF˜2‚"¿¢ì∞¢6WD∆VG2ÜFFÊ∆VG2«¬µ“ì∞¢“ê¢Ê6F6ÇÇÜW'&˜"í”‚∞¢ñbÇ6Ê6V∆∆VBí6WE6óFTW'&˜"ÜW'&˜"Ê÷W76vRì∞¢“ê¢ÊfñÊ∆«íÇÇí”‚∞¢ñbÇ6Ê6V∆∆VBí6WD∆ˆFñÊt∆VG2Üf«6Rì∞¢“ì∞¢“¬ì∞¢&WGW&‚Çí”‚∞¢6Ê6V∆∆VB“G'VS∞¢6∆V%Fñ÷V˜WBÜñBì∞¢”∞¢“¬∂7W'&VÁCÚÊñB¬7W'&VÁCÚÁV&∆ó6ÜVB¬7W'&VÁCÚÁV&∆ó6ÜVDE“ì∞¢ñbÜ7W'&VÁBí∞¢6ˆÁ7B&ˆw&W72“vV'6óFT÷ñ∆W7FˆÊW2Ü7W'&VÁBì∞¢6ˆÁ7B6ˆ◊∆WFVB“&ˆw&W72Êfñ«FW"ÇáÇí”‚ÇÊFˆÊRíÊ∆VÊwFÉ∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$TDïDı"DR4ïDR ¢FóF∆S◊∂7W'&VÁBÊÊ÷W–¢FWáC◊∞¢7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜV@¢ÚV&∆ñ6FÚV“G∂7W'&VÁBÁV&∆ñ5W&¬«¬˜2ÚG∂7W'&VÁBÁ6«Vw÷÷ ¢¢7W'&VÁBÁV&∆ó6ÜV@¢Ú$«FW&:|;VW2VÊFVÁFW2FRV&∆ñ6:|:6Ú ¢¢%&67VÊÜÚ&ófFÚ ¢–¢7Fñˆ„◊∞¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥6ÜWg&ˆ‰∆VgG–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WE&WfñWrÜÁV∆¬ó–¢‡¢÷WW26óFW0¢¬Ù'WGFˆ„‡¢–¢‡¢∆Fób6∆74Ê÷S“&6W'B◊&ˆw&W72÷÷ñÊí#‡¢«7‚6∆74Ê÷S“&6W'B÷÷ñÊí÷ñ6ˆ‚#‡¢ƒv&BÛ‡¢¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÂG&ñ∆Ü¢7&ñ:|:6ÚFRvV'6óFW2ÊÚ‘6ˆFS¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂6ˆ◊∆WFVG“FR∑&ˆw&W72Ê∆VÊwFá“÷&6˜26ˆÊ6«\:÷F˜2&∆ñ&W&"¢6W'Fñfñ6F¢¬˜6÷∆√‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷WFW"#‡¢«7‡¢7Gñ∆S◊∑≤vñGFÉ¢G≤Ü6ˆ◊∆WFVBÚ&ˆw&W72Ê∆VÊwFÇí¢“V◊–¢Û‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6óFR◊Fˆˆ∆&"#‡¢∆Fób6∆74Ê÷S“'fñWr◊Fˆvv∆R#‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂FWfñ6R””“&FW6∑F˜"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WDFWfñ6RÇ&FW6∑F˜"ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢&WfñWvVDFWfñ6W3¢∞¢‚‚ÊÊWr6WBÖ≤‚‚‚Ü7W'&VÁBÁ&WfñWvVDFWfñ6W2«¬µ“í¬&FW6∑F˜%“í¿¢“¿¢“ì∞¢◊–¢‡¢ƒ÷ˆÊóF˜"Û‡¢FW6∑F˜ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂FWfñ6R””“'F&∆WB"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WDFWfñ6RÇ'F&∆WB"ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢&WfñWvVDFWfñ6W3¢∞¢‚‚ÊÊWr6WBÖ≤‚‚‚Ü7W'&VÁBÁ&WfñWvVDFWfñ6W2«¬µ“í¬'F&∆WB%“í¿¢“¿¢“ì∞¢◊–¢‡¢≈F&∆WBÛ‡¢F&∆W@¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂FWfñ6R””“&÷ˆ&ñ∆R"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WDFWfñ6RÇ&÷ˆ&ñ∆R"ì∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢&WfñWvVDFWfñ6W3¢∞¢‚‚ÊÊWr6WBÖ≤‚‚‚Ü7W'&VÁBÁ&WfñWvVDFWfñ6W2«¬µ“í¬&÷ˆ&ñ∆R%“í¿¢“¿¢“ì∞¢◊–¢‡¢≈6÷'GÜˆÊRÛ‡¢6V«V∆ ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢∆Fóc‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µ∆WGFW–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD7W7Fˆ÷ó¶ñÊrÇ7W7Fˆ÷ó¶ñÊró–¢‡¢∂7W7Fˆ÷ó¶ñÊrÚ$fV6Ü"W'6ˆÊ∆ó¶:|:6Ú"¢%W'6ˆÊ∆ó¶"fó7V¬'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥VFóC7–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WDVFóD6ˆFRÇVFóD6ˆFRó–¢‡¢∂VFóD6ˆFRÚ%fW"&WfñWr"¢$VFóF"ÖD‘¬'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢ñ6ˆ„◊∂7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜVBÚWñR¢v∆ˆ&S'–¢Fó6&∆VC◊∑V&∆ó6ÜñÊw–¢ˆ‰6∆ñ6≥◊∑V&∆ó6Ö6óFW–¢‡¢∑V&∆ó6ÜñÊp¢Ú%V&∆ñ6ÊFÚ‚‚‚ ¢¢7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜV@¢Ú$FW7V&∆ñ6" ¢¢7W'&VÁBÁV&∆ó6ÜV@¢Ú$GV∆ó¶"V&∆ñ6:|:6Ú ¢¢%V&∆ñ6"'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢∂7W7Fˆ÷ó¶ñÊrbbÄ¢∆Fób6∆74Ê÷S“'6óFR÷7W7Fˆ÷ó¶R◊ÊV¬#‡¢≈6óFUfó7VƒVFóF˜"'&ñVc◊∂7W'&VÁBÊ'&ñVb«¬∑◊“ˆ‰6ÜÊvS◊∑WFFT'&ñVg“Û‡¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'6óFR◊V&∆ñ2◊ÊV¬#‡¢ƒfñV∆B∆&V√“$VÊFW&\:vÚ;¶&∆ñ6Ú#‡¢∆Fób6∆74Ê÷S“'6«Vr÷VFóF˜"#‡¢«7„Á∂∆ˆ6Fñˆ‚Ê˜&ñvñÁ“˜2Û¬˜7„‡¢∆ñÁW@¢f«VS◊∂7W'&VÁBÁ6«Vw–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚∞¢6ˆÁ7BÊWáE6«Vr“6«VvñgíÜWfVÁBÁF&vWBÁf«VRì∞¢6ˆÁ7Bˆ∆EFÇ“˜2ÚG∂7W'&VÁBÁ6«Vw÷∞¢6ˆÁ7BÊWáEFÇ“˜2ÚG∂ÊWáE6«Vw÷∞¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢6«Vs¢ÊWáE6«Vr¿¢áF÷√¢7W'&VÁBÊáF÷¬Á7∆óBÜˆ∆EFÇíÊ¶ˆñ‚ÜÊWáEFÇí¿¢vW3¢Ü7W'&VÁBÁvW2«¬µ“íÊ÷ÇÜóFV“í”‚á∞¢‚‚ÊóFV“¿¢áF÷√¢óFV“ÊáF÷¬Á7∆óBÜˆ∆EFÇíÊ¶ˆñ‚ÜÊWáEFÇí¿¢“íí¿¢6W'fW%V&∆ó6ÜVC¢f«6R¿¢“ì∞¢◊–¢&ñ÷∆&V√“$VÊFW&\:vÚ;¶&∆ñ6ÚFÚ6óFR ¢Û‡¢¬ˆFóc‡¢¬ÙfñV∆C‡¢≈6Ü&ñÊtfñV∆G0¢f«VS◊∑∞¢fó6ñ&ñ∆óGì¢7W'&VÁBÁfó6ñ&ñ∆óGí¿¢6Ü&VEvóFÉ¢7W'&VÁBÁ6Ü&VEvóFÇ¿¢6Ü&VEFV◊3¢7W'&VÁBÁ6Ü&VEFV◊2¿¢&ˆ¶V7C¢7W'&VÁBÁ&ˆ¶V7B¿¢◊–¢ˆ‰6ÜÊvS◊≤ÜÊWáBí”‚WFFU6óFRÜ7W'&VÁBÊñB¬ÊWáBó–¢FV◊3◊∂F"ÁFV◊7–¢&ˆ¶V7D˜FñˆÁ3◊µ∞¢‚‚ÊÊWr6WBÖ∞¢‚‚‚ÜF"Á&ˆ¶V7G2«¬µ“íÊ÷Çáí”‚ÊÊ÷Rí¿¢‚‚‚ÜF"ÁF6∑2«¬µ“íÊ÷ÇáBí”‚BÁ&ˆ¶V7BíÊfñ«FW"Ñ&ˆˆ∆V‚í¿¢“í¿¢◊–¢Û‡¢∂7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜVBbbÄ¢∆Fób6∆74Ê÷S“'6óFR◊V&∆ñ2÷7FñˆÁ2#‡¢«7‚6∆74Ê÷S“'V&∆ó6Ç◊7FFR∆ófR#‡¢ƒ&FvT6ÜV6≤Û‚:vñÊ;¶&∆ñ66ˆÊfó&÷F¢¬˜7„‡¢∆¢6∆74Ê÷S“&'WGFˆ‚6V6ˆÊF'í ¢á&Vc◊∂7W'&VÁBÁV&∆ñ5W&¬«¬˜2ÚG∂7W'&VÁBÁ6«Vw÷–¢F&vWC“%ˆ&∆Ê≤ ¢&V√“&Ê˜&VfW'&W" ¢‡¢ƒWáFW&Êƒ∆ñÊ≤6ó¶S◊≥w“Û‚'&ó"6óFP¢¬ˆ‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥6˜ó–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ÊfñvF˜"Ê6∆ó&ˆ&CÚÁw&óFUFWáBÄ¢7W'&VÁBÁV&∆ñ5W&¬«¬G∂∆ˆ6Fñˆ‚Ê˜&ñvñÁ“˜2ÚG∂7W'&VÁBÁ6«Vw÷¿¢ì∞¢6WEFˆ7BÇ$∆ñÊ≤;¶&∆ñ6Ú6˜ñFÚ"ì∞¢◊–¢‡¢6˜ñ"∆ñÊ∞¢¬Ù'WGFˆ„‡¢∆¢6∆74Ê÷S“&'WGFˆ‚6V6ˆÊF'í ¢á&Vc◊∂ˆ∆ˆ¶ÚG∂7W'&VÁBÁ6«Vw÷–¢F&vWC“%ˆ&∆Ê≤ ¢&V√“&Ê˜&VfW'&W" ¢‡¢≈6Ü˜ñÊt&r6ó¶S◊≥w“Û‚fW"∆ˆ¶fó'GV¬Ü6'&ñÊÜÚê¢¬ˆ‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥6˜ó–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ÊfñvF˜"Ê6∆ó&ˆ&CÚÁw&óFUFWáBÄ¢G∂∆ˆ6Fñˆ‚Ê˜&ñvñÁ“ˆ∆ˆ¶ÚG∂7W'&VÁBÁ6«Vw÷¿¢ì∞¢6WEFˆ7BÇ$∆ñÊ≤F∆ˆ¶fó'GV¬6˜ñFÚ"ì∞¢◊–¢‡¢6˜ñ"∆ñÊ≤F∆ˆ¶¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢ó–¢∂7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜVBbbÄ¢«7‚6∆74Ê÷S“'V&∆ó6Ç◊7FFRVÊFñÊr#‡¢ƒ6∆ˆ6≥2Û‚å:◊VFÏ:v2∆ˆ6ó2‚6∆óVRV“GV∆ó¶"V&∆ñ6:|:6Ú‡¢¬˜7„‡¢ó–¢∑6óFTW'&˜"bbÄ¢∆Fób6∆74Ê÷S“&6≤÷W'&˜"#‡¢ƒ6ó&6∆T∆W'BÛ‚∑6óFTW'&˜'–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢∂∆ˆˆ∑4∆ñ∂U6óFTñÁ7G'V7Fñˆ‚Ü7W'&VÁBÊ'&ñVcÚÊFW67&óFñˆ‚íbbÄ¢∆Fób6∆74Ê÷S“'6óFR◊&Wó"÷Ê˜Fñ6R#‡¢ƒ6ó&6∆T∆W'BÛ‡¢«7„‡¢W7FR&ˆ¶WFÚÁFñvÚ&V6RWÜñ&ó"Ú'&ñVfñÊr6ˆ÷ÚFWáFÚ;¶&∆ñ6Ú‡¢¬˜7„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µvÊE7&∂∆W7–¢ˆ‰6∆ñ6≥◊∑&Wó$∆Vv7ï6óFW–¢‡¢6˜'&ñvó"6ˆÁF\;¶F¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'6óFR◊vR÷∆ó7B"&ñ÷∆&V√“%:vñÊ2FÚ6óFR#‡¢≤Ü7W'&VÁBÁvW3ÚÊ∆VÊwFÄ¢Ú7W'&VÁBÁvW0¢¢∞¢≤6«Vs¢""¬Ê÷S¢$ñÏ:÷6ñÚ"“¿¢≤6«Vs¢'6ˆ'&R"¬Ê÷S¢%6ˆ'&R"“¿¢≤6«Vs¢'6W'fñ6˜2"¬Ê÷S¢%6W'fú:v˜2"“¿¢≤6«Vs¢&6ˆÁFFÚ"¬Ê÷S¢$6ˆÁFFÚ"“¿¢–¢íÊ÷ÇÜóFV“í”‚Ä¢∆'WGFˆ‡¢6∆74Ê÷S◊∑&WfñWuvR””“óFV“Á6«VrÚ&7FófR"¢"'–¢∂Wì◊∂óFV“Á6«Vr«¬&Üˆ÷R'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WE&WfñWuvRÜóFV“Á6«Vró–¢‡¢ƒfñ∆UFWáBÛ‚∂óFV“ÊÊ÷W–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6óFR◊v˜&∑76R#‡¢∆6ñFR6∆74Ê÷S“'6óFR÷6ÜB#‡¢∆ÜVFW#‡¢«7‚6∆74Ê÷S“'6óFR÷6ÜB÷ñ6ˆ‚#‡¢≈7&∂∆W2Û‡¢¬˜7„‡¢∆Fóc‡¢«7G&ˆÊs‰VFóF"˜"6ˆÁfW'6¬˜7G&ˆÊs‡¢«6÷∆√Â\:v«FW&:|;VW26ˆ÷Úf&ñ6ˆ“V÷W76ˆ„¬˜6÷∆√‡¢¬ˆFóc‡¢¬ˆÜVFW#‡¢∆Fób6∆74Ê÷S“'6óFR÷6ÜB÷÷W76vW2#‡¢≤Ä¢7W'&VÁBÊ6ÜB«¬∞¢∞¢ñC¢'vV∆6ˆ÷R"¿¢&ˆ∆S¢&76ó7FÁB"¿¢6ˆÁFVÁC†¢$FñvÚVRFW6V¶◊VF"‚WÇ„¢(	∆FVóÜRÚL:◊GV∆Ú÷ó2Fó&WF˛(	“˜R(	«G&˜VR6˜"&fW&F^(	“‚"¿¢“¿¢–¢íÊ÷ÇÜ÷W76vRí”‚Ä¢∆Fób6∆74Ê÷S◊∂÷W76vRÁ&ˆ∆W“∂Wì◊∂÷W76vRÊñG”‡¢∂÷W76vRÊ6ˆÁFVÁG–¢¬ˆFóc‡¢íó–¢∑6óFT6ÜD'W7íbbÄ¢∆Fób6∆74Ê÷S“&76ó7FÁB#‰∆ñ6ÊFÚ«FW&:|:6Ú‚‚„¬ˆFóc‡¢ó–¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6óFR÷6ÜB÷6ˆ◊˜6R#‡¢«FWáF&V¢f«VS◊∑6óFT6ÜEFWáG–¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚6WE6óFT6ÜEFWáBÜWfVÁBÁF&vWBÁf«VRó–¢ˆ‰∂WîF˜v„◊≤ÜWfVÁBí”‚∞¢ñbÜWfVÁBÊ∂Wí””“$VÁFW""bbWfVÁBÁ6ÜñgD∂Wíí∞¢WfVÁBÁ&WfVÁDFVfV«BÇì∞¢&WVW7E6óFT6ÜÊvRÇì∞¢–¢◊–¢∆6VÜˆ∆FW#“$WÇ„¢◊VFRÚL:◊GV∆ÚRFVóÜRÚFWáFÚ÷ó26ˆ∆ÜVF˜" ¢Û‡¢∆'WGFˆ‡¢ˆ‰6∆ñ6≥◊∑&WVW7E6óFT6ÜÊvW–¢Fó6&∆VC◊≤6óFT6ÜEFWáBÁG&ñ“Çí«¬6óFT6ÜD'W7ó–¢&ñ÷∆&V√“$VÁfñ"«FW&:|:6ÚFÚ6óFR ¢‡¢≈6VÊBÛ‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ6ñFS‡¢∂VFóD6ˆFRÚÄ¢∆Fób6∆74Ê÷S“&6ˆFR÷VFóF˜"#‡¢∆Fóc‡¢«7„‰ÖD‘¬F:vñÊñÊñ6ñ√¬˜7„‡¢«6÷∆√Â67&óG2ñÁ6W&ñF˜2<:6Ú&∆˜VVF˜2ÊÚ&WfñWr„¬˜6÷∆√‡¢¬ˆFóc‡¢«FWáF&V¢f«VS◊∑&WfñWtáF÷«–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢WFFU6óFRÜ7W'&VÁBÊñB¬∞¢áF÷√¢&WfñWuvRÚ7W'&VÁBÊáF÷¬¢RÁF&vWBÁf«VR¿¢vW3¢Ü7W'&VÁBÁvW2«¬µ“íÊ÷ÇÜóFV“í”‡¢óFV“Á6«Vr””“&WfñWuvP¢Ú≤‚‚ÊóFV“¬áF÷√¢RÁF&vWBÁf«VR–¢¢óFV“¿¢í¿¢6ˆFTVFóFVC¢G'VR¿¢6W'fW%V&∆ó6ÜVC¢f«6R¿¢“ê¢–¢Û‡¢¬ˆFóc‡¢í¢Ä¢∆Fób6∆74Ê÷S◊∂6óFR◊&WfñWrG∂FWfñ6W÷”‡¢∆ñg&÷P¢FóF∆S◊∂&WfñWrFRG∂7W'&VÁBÊÊ÷W÷–¢6ÊF&˜É“&∆∆˜r÷f˜&◊2∆∆˜r◊˜W2 ¢7&4Fˆ3◊∑&WfñWtáF÷«–¢Û‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢∂7W'&VÁBÁV&∆ó6ÜVBbb7W'&VÁBÁ6W'fW%V&∆ó6ÜVBbbÄ¢«6V7Fñˆ‚6∆74Ê÷S“'6óFR÷∆VG26V7Fñˆ‚#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰4ÙÂDDı2$T4T$îDı3¬˜7„‡¢∆É#‰∆VG2FW7FR6óFS¬ˆÉ#‡¢«‰÷VÁ6vVÁ2VÁfñF2V∆Úf˜&◊VÃ:&ñÚF:vñÊ;¶&∆ñ6„¬˜‡¢¬ˆFóc‡¢«7‚6∆74Ê÷S“&∆VB÷6˜VÁB#Á∂∆VG2Ê∆VÊwFá”¬˜7„‡¢¬ˆFóc‡¢∂∆ˆFñÊt∆VG2ÚÄ¢«6∆74Ê÷S“&◊WFVB#‰6'&VvÊFÚ6ˆÁFF˜2‚‚„¬˜‡¢í¢∆VG2Ê∆VÊwFÇ””“ÚÄ¢∆Fób6∆74Ê÷S“&∆VB÷V◊Gí#‡¢ƒ÷ñ¬Û‡¢«7„‰ÊVÊáV“6ˆÁFFÚ&V6V&ñFÚñÊF„¬˜7„‡¢¬ˆFóc‡¢í¢Ä¢∆Fób6∆74Ê÷S“&∆VB÷∆ó7B#‡¢∂∆VG2Ê÷ÇÜ∆VBí”‚Ä¢∆'Fñ6∆R∂Wì◊∂∆VBÊñG”‡¢∆Fóc‡¢«7G&ˆÊsÁ∂∆VBÊÊ÷W”¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂ÊWrFFRÜ∆VBÊ7&VFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó–¢¬˜6÷∆√‡¢¬ˆFóc‡¢«Á∂∆VBÊ÷W76vR«¬%6V“÷VÁ6vV“‚'”¬˜‡¢∆fˆ˜FW#‡¢∆á&Vc◊∂÷ñ«FÛ¢G∂∆VBÊV÷ñ«÷”‡¢ƒ÷ñ¬Û‚∂∆VBÊV÷ñ«–¢¬ˆ‡¢∂∆VBÁÜˆÊRbb«7„Á∂∆VBÁÜˆÊW”¬˜7„Á–¢¬ˆfˆ˜FW#‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢ó–¢¬˜6V7Fñˆ„‡¢ó–¢¬ıvUFóF∆S‡¢ì∞¢–¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“%4ïDU2R‘DU$îï2 ¢FóF∆S“$7&ñRV÷&W6VÏ:vFñvóF¬FRfW&FFR ¢FWáC“$vW&RV“6óFR6ˆ“l:&ñ2:vñÊ2¬VFóFR˜"6ˆÁfW'6¬fó7V∆ó¶RV“FñfW&VÁFW2FV∆2RV&∆óVR‚ ¢7Fñˆ„◊∞¢ƒ'WGFˆ‚ñ6ˆ„◊µ«W7“ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆF¬áG'VRó”‡¢7&ñ"6óFP¢¬Ù'WGFˆ„‡¢–¢‡¢ƒ&VFˆˆ∆∂ó@¢&V“'6óFW2 ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢∆FóbñC“'6óFR◊&ˆ¶V7G2"Û‡¢∑6óFW2Ê∆VÊwFÇ””“ÚÄ¢ƒV◊Gê¢ñ6ˆ„◊¥v∆ˆ&S'–¢FóF∆S“$ÊVÊáV“6óFR7&ñFÚ ¢FWáC“$FW67&Wf6WRÊV|;66ñÚRvW&RV“6óFR&W7ˆÁ6ófÚ6ˆ“:vñÊ2FRñÏ:÷6ñÚ¬6ˆ'&R¬6W'fú:v˜2R6ˆÁFFÚ‚ ¢7Fñˆ„“$7&ñ"÷WR&ñ÷Vó&Ú6óFR ¢ˆ‰7Fñˆ„◊≤Çí”‚6WD÷ˆF¬áG'VRó–¢Û‡¢í¢Ä¢∆Fób6∆74Ê÷S“'6óFW2÷w&ñB#‡¢∑6óFW2Ê÷Çá2í”‚Ä¢∆'Fñ6∆R∂Wì◊∑2ÊñG”‡¢∆Fób6∆74Ê÷S“'6óFR◊FáV÷"#‡¢∆ñg&÷RFóF∆S“$÷ñÊñGW&"6ÊF&˜É“""7&4Fˆ3◊∑2ÊáF÷«“Û‡¢«7‡¢6∆74Ê÷S◊∞¢2ÁV&∆ó6ÜVBbb2Á6W'fW%V&∆ó6ÜV@¢Ú&∆ófR ¢¢2ÁV&∆ó6ÜV@¢Ú'VÊFñÊr ¢¢" ¢–¢‡¢∑2ÁV&∆ó6ÜVBbb2Á6W'fW%V&∆ó6ÜV@¢Ú%V&∆ñ6FÚ ¢¢2ÁV&∆ó6ÜV@¢Ú$GV∆ó¶:|:6ÚVÊFVÁFR ¢¢%&67VÊÜÚ'–¢¬˜7„‡¢¬ˆFóc‡¢∆Fóc‡¢∆É3Á∑2ÊÊ÷W”¬ˆÉ3‡¢«Á∑2ÁV&∆ñ5W&¬«¬˜2ÚG∑2Á6«Vw÷”¬˜‡¢«6÷∆√‡¢GV∆ó¶FÚ∂ÊWrFFRá2ÁWFFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó–¢¬˜6÷∆√‡¢∆fˆ˜FW#‡¢∆'WGFˆ‚ˆ‰6∆ñ6≥◊≤Çí”‚6WE&WfñWrá2ÊñBó”‡¢ƒVFóC2Û‡¢VFóF ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚ˆ‰6∆ñ6≥◊≤Çí”‚F˜vÊ∆ˆBá2ó”‡¢ƒF˜vÊ∆ˆBÛ‡¢&óÜ ¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ÊfñvF˜"Ê6∆ó&ˆ&CÚÁw&óFUFWáBá2ÊáF÷¬ì∞¢6WEFˆ7BÇ$<;6FñvÚ6˜ñFÚ"ì∞¢◊–¢‡¢ƒ6˜íÛ‡¢<;6Fñv¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“&FÊvW""ˆ‰6∆ñ6≥◊≤Çí”‚FV∆WFU6óFRá2ó”‡¢≈G&6É"Û‡¢¬ˆ'WGFˆ„‡¢¬ˆfˆ˜FW#‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢ó–¢∂÷ˆF¬bbÄ¢ƒ÷ˆF¬FóF∆S“$7&ñ"V“6óFR"vñFRˆ‰6∆˜6S◊≤Çí”‚6WD÷ˆF¬Üf«6Ró”‡¢∆f˜&“6∆74Ê÷S“&÷ˆF¬÷&ˆGí"ˆÂ7V&÷óC◊∂vVÊW&FW”‡¢ƒfñV∆@¢∆&V√“$ñÁ7G'\:|;VW2&7&ñ"Ú6óFR ¢ÜñÁC“$W7FR'&ñVfñÊr˜&ñVÁF7&ñ:|:6ÚRÁVÊ66W,:WÜñ&ñFÚ˜2fó6óFÁFW2‚ ¢‡¢«FWáF&V¢&WVó&V@¢WFÙfˆ7W0¢f«VS◊∂f˜&“ÊñÁ7G'V7FñˆÁ7–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WDf˜&“á≤‚‚Êf˜&“¬ñÁ7G'V7FñˆÁ3¢RÁF&vWBÁf«VR“ê¢–¢∆6VÜˆ∆FW#“$WÇ„¢V÷∆ÊFñÊrvR&&W6VÁF"÷WW26W'fú:v˜2FR˜&vÊó¶:|:6Ú&W6ñFVÊ6ñ¬‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆@¢∆&V√“%FWáFÚFR&W6VÁF:|:6ÚÚfó6óFÁFRÜ˜6ñˆÊ¬í ¢ÜñÁC“%6Rfñ6"f¶ñÚ¬Ú76ó7FVÁFR7&ñ,:V“FWáFÚ;¶&∆ñ6Ú'Fó"FÚ'&ñVfñÊr‚ ¢‡¢«FWáF&V¢f«VS◊∂f˜&“ÊFW67&óFñˆÁ–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WDf˜&“á≤‚‚Êf˜&“¬FW67&óFñˆ„¢RÁF&vWBÁf«VR“ê¢–¢∆6VÜˆ∆FW#“$WÇ„¢˜&vÊó¶:|:6Ú,:Fñ6&V÷66÷ó2∆WfRRgVÊ6ñˆÊ¬‚ ¢Û‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“$Êˆ÷RFÚÊV|;66ñÚ#‡¢∆ñÁW@¢f«VS◊∂f˜&“ÊÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬Ê÷S¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%6Vv÷VÁFÚ#‡¢∆ñÁW@¢f«VS◊∂f˜&“Á6Vv÷VÁG–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WDf˜&“á≤‚‚Êf˜&“¬6Vv÷VÁC¢RÁF&vWBÁf«VR“ê¢–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%L:◊GV∆Ú&ñÊ6ó¬#‡¢∆ñÁW@¢f«VS◊∂f˜&“ÊÜVF∆ñÊW–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WDf˜&“á≤‚‚Êf˜&“¬ÜVF∆ñÊS¢RÁF&vWBÁf«VR“ê¢–¢∆6VÜˆ∆FW#“%6Rf¶ñÚ¬W6ÚÊˆ÷RFÚÊV|;66ñÚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6Ü÷FFÚ&˜L:6Ú#‡¢∆ñÁW@¢f«VS◊∂f˜&“Ê7F–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬7F¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6ˆÁFFÚ˜R∆ñÊ≤#‡¢∆ñÁW@¢f«VS◊∂f˜&“Ê6ˆÁF7G–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WDf˜&“á≤‚‚Êf˜&“¬6ˆÁF7C¢RÁF&vWBÁf«VR“ê¢–¢∆6VÜˆ∆FW#“&áGG3¢Ú˜vÊ÷RÚ‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6˜"&ñÊ6ó¬#‡¢∆ñÁW@¢GóS“&6ˆ∆˜" ¢f«VS◊∂f˜&“Ê6ˆ∆˜'–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬6ˆ∆˜#¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢ƒfñV∆B∆&V√“%6W'fú:v˜2áV“˜"∆ñÊÜí#‡¢«FWáF&V¢f«VS◊∂f˜&“Á6W'fñ6W7–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬6W'fñ6W3¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢≈6óFUfó7VƒVFóF˜ ¢'&ñVc◊∂f˜&◊–¢ˆ‰6ÜÊvS◊≤áF6Çí”‚6WDf˜&“á≤‚‚Êf˜&“¬‚‚ÁF6Ç“ó–¢Û‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢≈6ÜñV∆D6ÜV6≤Û‡¢«7„‡¢ÚFWáFÚ:ívW&FÚV∆Ú76ó7FVÁFR'Fó"FÚ'&ñVfñÊs≤f˜F˜2P¢FWˆñ÷VÁF˜2<:6Ú6V◊&R˜2VRfˆ<:¢VÁfñ"Ví¬ÁVÊ6ñÁfVÁFF˜2‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆF¬Üf«6Ró”‡¢6Ê6V∆ ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚GóS“'7V&÷óB"ñ6ˆ„◊µvÊE7&∂∆W7“Fó6&∆VC◊∂vVÊW&FñÊw”‡¢∂vVÊW&FñÊrÚ$7&ñÊFÚ:vñÊ2‚‚‚"¢$vW&"6óFR6ˆ◊∆WFÚ'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆf˜&”‡¢¬Ù÷ˆF√‡¢ó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶gVÊ7Fñˆ‚V÷ñƒ6ˆ◊˜6W"á≤ˆ‰6∆˜6R¬6WEFˆ7B¬ñÊóFñ¬“í∞¢6ˆÁ7B∂f˜&“¬6WDf˜&’““W6U7FFRá∞¢FÛ¢ñÊóFñ√ÚÁFÚ«¬""¿¢7V&¶V7C¢ñÊóFñ√ÚÁ7V&¶V7B«¬""¿¢&ˆGì¢ñÊóFñ√ÚÊ&ˆGí«¬""¿¢“ì∞¢6ˆÁ7B∂vˆˆv∆TñB¬6WDvˆˆv∆TñE““W6U7FFRÇ""ì∞¢6ˆÁ7B∑6VÊFñÊr¬6WE6VÊFñÊu““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑6VÊDW'&˜"¬6WE6VÊDW'&˜%““W6U7FFRÇ""ì∞¢W6TVffV7BÇÇí”‚∞¢fWF6ÇÇ"ˆíˆ6ˆÊfñr"ê¢ÁFÜV‚Çá"í”‚"Êß6ˆ‚Çíê¢ÁFÜV‚ÇÜBí”‚6WDvˆˆv∆TñBÜBÊvˆˆv∆T6∆ñVÁDñB«¬""íê¢Ê6F6ÇÇÇí”‚∑“ì∞¢“¬µ“ì∞¢6ˆÁ7B∆ˆtV÷ñ¬“Çí”‡¢∆ˆtñÁFW&7Fñˆ‚á∞¢6ÜÊÊV√¢&V÷ñ¬"¿¢Fó&V7Fñˆ„¢&˜WB"¿¢6ˆÁF7DñC¢ñÊóFñ√ÚÊ6ˆÁF7DñB«¬""¿¢6ˆÁF7DÊ÷S¢ñÊóFñ√ÚÊ6ˆÁF7DÊ÷R«¬""¿¢6ˆÁF7DÜÊF∆S¢f˜&“ÁFÚÁG&ñ“Çí¿¢7V&¶V7C¢f˜&“Á7V&¶V7B¿¢&ˆGì¢f˜&“Ê&ˆGí¿¢“ì∞¢6ˆÁ7B6VÊE&V¬“7ñÊ2Çí”‚∞¢ñbÇf˜&“ÁFÚÁG&ñ“Çí«¬6VÊFñÊrí&WGW&„∞¢6WE6VÊFñÊráG'VRì∞¢6WE6VÊDW'&˜"Ç""ì∞¢G'í∞¢vóB6VÊDv÷ñ≈&V¬Üvˆˆv∆TñB¬f˜&“ì∞¢∆ˆtV÷ñ¬Çì∞¢6WEFˆ7BÇ$R÷÷ñ¬VÁfñFÚV∆7V6ˆÁFvˆˆv∆R"ì∞¢ˆ‰6∆˜6RÇì∞¢“6F6ÇÜW'&˜"í∞¢6WE6VÊDW'&˜"ÜW'&˜"Ê÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬VÁfñ"v˜&‚"ì∞¢“fñÊ∆«í∞¢6WE6VÊFñÊrÜf«6Rì∞¢–¢”∞¢6ˆÁ7B&◊2“Çí”‡¢FÛ“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“ÁFÚó“g7S“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“Á7V&¶V7Bó“f&ˆGì“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“Ê&ˆGíó÷∞¢6ˆÁ7B˜V‰v÷ñ¬“Çí”‚∞¢vñÊF˜rÊ˜V‚Ä¢áGG3¢Úˆ÷ñ¬Êvˆˆv∆RÊ6ˆ“ˆ÷ñ¬Û˜fñWs÷6“fg3”bG∑&◊2Çó÷¿¢%ˆ&∆Ê≤"¿¢&Êˆ˜VÊW""¿¢ì∞¢∆ˆtV÷ñ¬Çì∞¢6WEFˆ7BÇ%&67VÊÜÚ&W'FÚÊÚv÷ñ¬&7V6ˆÊfó&÷:|:6Ú"ì∞¢”∞¢6ˆÁ7B˜V‰˜WF∆ˆˆ≤“Çí”‚∞¢vñÊF˜rÊ˜V‚Ä¢áGG3¢Úˆ˜WF∆ˆˆ≤Êˆffñ6RÊ6ˆ“ˆ÷ñ¬ˆFVW∆ñÊ≤ˆ6ˆ◊˜6S˜FÛ“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“ÁFÚó“g7V&¶V7C“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“Á7V&¶V7Bó“f&ˆGì“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“Ê&ˆGíó÷¿¢%ˆ&∆Ê≤"¿¢&Êˆ˜VÊW""¿¢ì∞¢∆ˆtV÷ñ¬Çì∞¢6WEFˆ7BÇ%&67VÊÜÚ&W'FÚÊÚ˜WF∆ˆˆ≤&7V6ˆÊfó&÷:|:6Ú"ì∞¢”∞¢6ˆÁ7B˜V‰6∆ñVÁB“Çí”‚∞¢∆ˆtV÷ñ¬Çì∞¢∆ˆ6Fñˆ‚Êá&Vb“÷ñ«FÛ¢G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“ÁFÚó”˜7V&¶V7C“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“Á7V&¶V7Bó“f&ˆGì“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜf˜&“Ê&ˆGíó÷∞¢”∞¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S“$W67&WfW"R÷÷ñ¬"vñFRˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢≈6ÜñV∆D6ÜV6≤Û‡¢«7„‡¢gV˜C¥VÁfñ"V∆Úv÷ñ¬gV˜C≤VFR7VW&÷ó7<:6ÚFÚvˆˆv∆RRVÁfñFó&WF¢V∆7V6ˆÁF‚2FV÷ó2˜:|;VW2<;2&W&“V“&67VÊÜÚ&fˆ<:†¢&Wfó6"RVÁfñ"÷ÁV∆÷VÁFR‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“%&#‡¢∆ñÁW@¢GóS“&V÷ñ¬ ¢f«VS◊∂f˜&“ÁF˜–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬FÛ¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“&6∆ñVÁFTV◊&W6Ê6ˆ“ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$77VÁFÚ#‡¢∆ñÁW@¢f«VS◊∂f˜&“Á7V&¶V7G–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬7V&¶V7C¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“$77VÁFÚFÚR÷÷ñ¬ ¢Û‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢ƒfñV∆B∆&V√“%W6"V“÷ˆFV∆Ú&ˆÁFÚÜ˜6ñˆÊ¬í#‡¢«6V∆V7@¢f«VS“" ¢ˆ‰6ÜÊvS◊≤ÜRí”‚∞¢6ˆÁ7BG¬“T‘î≈ıDT’ƒDU2ÊfñÊBÇáBí”‚BÊñB””“RÁF&vWBÁf«VRì∞¢ñbáG¬í6WDf˜&“á≤‚‚Êf˜&“¬7V&¶V7C¢G¬Á7V&¶V7B¬&ˆGì¢G¬Ê&ˆGí“ì∞¢◊–¢‡¢∆˜Fñˆ‚f«VS“"#‰W66ˆ∆ÜV“÷ˆFV∆Ú‚‚„¬ˆ˜Fñˆ„‡¢¥T‘î≈ıDT’ƒDU2Ê÷ÇáBí”‚Ä¢∆˜Fñˆ‚∂Wì◊∑BÊñG“f«VS◊∑BÊñG”‡¢∑BÊ6FVv˜'ó“(	B∑BÊÊ÷W–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$÷VÁ6vV“#‡¢«FWáF&V¢6∆74Ê÷S“&V÷ñ¬÷&ˆGí ¢f«VS◊∂f˜&“Ê&ˆGó–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬&ˆGì¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“$W67&Wf˜R6ˆ∆R7V÷VÁ6vV“‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢∑6VÊDW'&˜"bbÄ¢∆Fób6∆74Ê÷S“&6≤÷W'&˜"#‡¢ƒ6ó&6∆T∆W'BÛ‚∑6VÊDW'&˜'–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“&V÷ñ¬÷7FñˆÁ2#‡¢ƒ'WGFˆ‡¢ñ6ˆ„◊µ6VÊG–¢ˆ‰6∆ñ6≥◊∑6VÊE&V«–¢Fó6&∆VC◊∑6VÊFñÊr«¬f˜&“ÁFÚÁG&ñ“Çó–¢‡¢∑6VÊFñÊrÚ$VÁfñÊFÚ‚‚‚"¢$VÁfñ"V∆Úv÷ñ¬'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ñ6ˆ„◊¥÷ñ«“ˆ‰6∆ñ6≥◊∂˜V‰v÷ñ«”‡¢'&ó"&67VÊÜÚÊÚv÷ñ¿¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ñ6ˆ„◊¥÷ñ«“ˆ‰6∆ñ6≥◊∂˜V‰˜WF∆ˆˆ∑”‡¢'&ó"ÊÚ˜WF∆ˆˆ∞¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ñ6ˆ„◊¥WáFW&Êƒ∆ñÊ∑“ˆ‰6∆ñ6≥◊∂˜V‰6∆ñVÁG”‡¢W6"∆ñ6FófÚG,:6¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–†¶gVÊ7Fñˆ‚G&Á6∆F˜$÷ˆF¬á≤ˆ‰6∆˜6R¬6WEFˆ7B“í∞¢6ˆÁ7B∑FWáB¬6WEFWáE““W6U7FFRÇ""í¿¢∂∆Êr¬6WD∆Êu““W6U7FFRÇ$ñÊvÃ:ß2"í¿¢∂÷ˆFR¬6WD÷ˆFU““W6U7FFRÇ'G&GW¶ó""í¿¢∂˜WB¬6WD˜WE““W6U7FFRÇ""í¿¢∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rí¿¢∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∆Êw2“∞¢$ñÊvÃ:ß2"¿¢$W7ÊÜˆ¬"¿¢$g&Ê<:ß2"¿¢$óF∆ñÊÚ"¿¢$∆V‹:6Ú"¿¢%˜'GVw\:ß2"¿¢$6ÜñÏ:ß2Ñ÷ÊF&ñ“í"¿¢$¶ˆÏ:ß2"¿¢$6˜&VÊÚ"¿¢,8&&R"¿¢%'W76Ú"¿¢$Üˆ∆ÊL:ß2"¿¢”∞¢6ˆÁ7BG&Á6∆FR“7ñÊ2Çí”‚∞¢ñbáFWáBÁG&ñ“ÇíÊ∆VÊwFÇ¬«¬'W7íí&WGW&„∞¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢6WD˜WBÇ""ì∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢&ˆ◊C†¢÷ˆFR””“'G&GW¶ó" ¢ÚFWFV7FRWFˆ÷Fñ6÷VÁFRÚñFñˆ÷FÚFWáFÚ&óÜÚRG&GW¶÷Ú&G∂∆Êw“‚&W7ˆÊF4Ù‘TÂDR6ˆ“G&G\:|:6Ú¬÷ÁFVÊFÚÚFˆ“Rf˜&÷F:|:6Ú¬6V“72R6V“6ˆ÷VÁL:&ñ˜2Â∆Â∆‚G∑FWáBÁG&ñ“Çó÷ ¢¢÷VÁ6vV“&óÜÚfˆí&V6V&ñFFRV“6∆ñVÁFR˜R&6Vó&ÚÜFWFV7FRÚñFñˆ÷WFˆ÷Fñ6÷VÁFRí‚íG&GW¶÷VÁ6vV“&˜'GVw\:ß2‚"í7Vvó&V÷&W7˜7F&ˆfó76ñˆÊ¬R6˜&Fñ¬V“G∂∆Êw“¬&ˆÁF&VÁfñ"‚2í÷˜7G&RG&G\:|:6ÚF&W7˜7FV“˜'GVw\:ß2&6ˆÊfW,:¶Ê6ñ‚W6RL:◊GV∆˜27W'F˜2&2G,:ß2'FW2‚Ï:6ÚñÁfVÁFRñÊf˜&÷:|;VW2VRÏ:6ÚW7FV¶“Ê÷VÁ6vV“Â∆Â∆‚G∑FWáBÁG&ñ“Çó÷¿¢7V6ñ∆ó7C¢%&VFF˜""¿¢“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬G&GW¶ó"v˜&‚"ì∞¢6WD˜WBÇÜBÊ6ˆÁFVÁB«¬""íÁG&ñ“Çíì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S“$gVÊ6ñˆÏ:&ñÚ&ñÃ:÷ÊwVR(	BG&GWF˜""vñFRˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒ∆ÊwVvW2Û‡¢«7„‡¢G&G\:|:6Ú˜"î¬w&GVóF‚ñFV¬&R÷÷ñ«2¬&˜˜7F2¬FW67&ú:|;VW0¢RFVÊFñ÷VÁFÚ6∆ñVÁFW2FR˜WG&˜2:◊6W2‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“$ÚVRfˆ<:¢&V6ó6#‡¢«6V∆V7Bf«VS◊∂÷ˆFW“ˆ‰6ÜÊvS◊≤ÜRí”‚6WD÷ˆFRÜRÁF&vWBÁf«VRó”‡¢∆˜Fñˆ‚f«VS“'G&GW¶ó"#ÂG&GW¶ó"V“FWáFÚÜFWFV7FÚñFñˆ÷6˜¶ñÊÜÚì¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“'&W7ˆÊFW"#Â&V6V&íV÷÷VÁ6vV“(	BG&GW¶ó"R7VvW&ó"&W7˜7F¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√◊∂÷ˆFR””“'G&GW¶ó""Ú%FWáFÚ&G&GW¶ó""¢$÷VÁ6vV“&V6V&ñF'”‡¢«FWáF&V¢WFÙfˆ7W0¢f«VS◊∑FWáG–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEFWáBÜRÁF&vWBÁf«VRÁ6∆ñ6RÉ¬Síó–¢∆6VÜˆ∆FW#“$6ˆ∆R˜RW67&WfÚFWáFÚ‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%G&GW¶ó"&#‡¢«6V∆V7Bf«VS◊∂∆Êw“ˆ‰6ÜÊvS◊≤ÜRí”‚6WD∆ÊrÜRÁF&vWBÁf«VRó”‡¢∂∆Êw2Ê÷ÇÜ¬í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂«”Á∂«”¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢∂W'"bbÄ¢∆Fób6∆74Ê÷S“&6≤÷W'&˜"#‡¢ƒ6ó&6∆T∆W'BÛ‡¢∂W''–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ˆ‰6∆ñ6≥◊∂ˆ‰6∆˜6W”‡¢fV6Ü ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢ñ6ˆ„◊∂'W7íÚ&Vg&W6Ñ7r¢∆ÊwVvW7–¢Fó6&∆VC◊∂'W7í«¬FWáBÁG&ñ“Çó–¢ˆ‰6∆ñ6≥◊∑G&Á6∆FW–¢‡¢∂'W7íÚ%G&GW¶ñÊFÚ‚‚‚"¢%G&GW¶ó"'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢∂˜WBbbÄ¢∆Fób6∆74Ê÷S“'G&Á6∆FR÷˜WB#‡¢∆Fób6∆74Ê÷S“'G&Á6∆FR÷ÜVB#‡¢«7„ÂG&G\:|:6Úá∂∆Êw“ì¬˜7„‡¢∆'WGFˆ‡¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ÊfñvF˜"Ê6∆ó&ˆ&CÚÁw&óFUFWáBÜ˜WBì∞¢6WEFˆ7BÇ%G&G\:|:6Ú6˜ñF"ì∞¢◊–¢‡¢ƒ6˜íÛ‡¢6˜ñ ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢«&SÁ∂˜WG”¬˜&S‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–†¶gVÊ7Fñˆ‚&˜WFW$÷ˆF¬á≤ˆ‰6∆˜6R¬6WEFˆ7B“í∞¢6ˆÁ7B∑7F˜2¬6WE7F˜5““W6U7FFRÖ≤""¬"%“í¿¢∂÷ˆFR¬6WD÷ˆFU““W6U7FFRÇ&G&ófñÊr"í¿¢∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑7Vvr¬6WE7Vvu““W6U7FFRá∑“ì∞¢6ˆÁ7B∂WF¬6WDWF““W6U7FFRÇ""ì∞¢6ˆÁ7B7VvuFñ÷W"“W6U&VbÜÁV∆¬ì∞¢6ˆÁ7B7VvvW7B“Üí¬í”‚∞¢6∆V%Fñ÷V˜WBá7VvuFñ÷W"Ê7W'&VÁBì∞¢ñbáÁG&ñ“ÇíÊ∆VÊwFÇ¬Bí&WGW&„∞¢7VvuFñ÷W"Ê7W'&VÁB“6WEFñ÷V˜WBÇÇí”‚∞¢fWF6ÇÄ¢áGG3¢ÚˆÊˆ÷ñÊFñ“Ê˜VÁ7G&VWF÷Ê˜&r˜6V&6Éˆf˜&÷C÷ß6ˆ‚f∆ñ÷óC”Bf6˜VÁG'ñ6ˆFW3÷'"g“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBáó÷¿¢≤ÜVFW'3¢≤66WC¢&∆ñ6Fñˆ‚ˆß6ˆ‚"““¿¢ê¢ÁFÜV‚Çá"í”‚á"Êˆ≤Ú"Êß6ˆ‚Çí¢µ“íê¢ÁFÜV‚ÇÜ∆ó7Bí”‡¢6WE7VvrÇÜ7W"í”‚á≤‚‚Ê7W"¬∂ï”¢Ü∆ó7B«¬µ“íÊ÷ÇáÇí”‚ÇÊFó7∆ïˆÊ÷Rí“íí¿¢ê¢Ê6F6ÇÇÇí”‚∑“ì∞¢“¬SSì∞¢”∞¢6ˆÁ7B6∆4WF“7ñÊ2Çí”‚∞¢6ˆÁ7BG2“6∆V‚Çì∞¢ñbáG2Ê∆VÊwFÇ¬"í∞¢6WEFˆ7BÇ$ñÊf˜&÷RÚ÷VÊ˜2˜&ñvV“RFW7FñÊÚ"ì∞¢&WGW&„∞¢–¢6WDWFÇ&6∆7V∆ÊFÚ"ì∞¢G'í∞¢6ˆÁ7B6ˆ˜&G2“µ”∞¢f˜"Ü6ˆÁ7BˆbG2í∞¢6ˆÁ7B"“vóBfWF6ÇÄ¢áGG3¢ÚˆÊˆ÷ñÊFñ“Ê˜VÁ7G&VWF÷Ê˜&r˜6V&6Éˆf˜&÷C÷ß6ˆ‚f∆ñ÷óC”f6˜VÁG'ñ6ˆFW3÷'"g“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBáó÷¿¢≤ÜVFW'3¢≤66WC¢&∆ñ6Fñˆ‚ˆß6ˆ‚"““¿¢ì∞¢6ˆÁ7B¢“vóB"Êß6ˆ‚Çì∞¢ñbÇ•≥“íFá&˜rÊWrW'&˜"ÜVÊFW&\:vÚÏ:6ÚVÊ6ˆÁG&FÛ¢G∑Á6∆ñ6RÉ¬Có÷ì∞¢6ˆ˜&G2ÁW6ÇÜG∂•≥“Ê∆ˆÁ“¬G∂•≥“Ê∆G÷ì∞¢–¢6ˆÁ7B˜"“vóBfWF6ÇÄ¢áGG3¢Ú˜&˜WFW"Á&ˆ¶V7B÷˜7&“Ê˜&r˜&˜WFR˜cˆG&ófñÊrÚG∂6ˆ˜&G2Ê¶ˆñ‚Ç#≤"ó”ˆ˜fW'fñWs÷f«6V¿¢ì∞¢6ˆÁ7Bˆ¢“vóB˜"Êß6ˆ‚Çì∞¢6ˆÁ7B&˜WFR“ˆ¢Á&˜WFW2bbˆ¢Á&˜WFW5≥”∞¢ñbÇ&˜WFRíFá&˜rÊWrW'&˜"Ç$Ï:6Úfˆí˜7<:◊fV¬G&:v"&˜F‚"ì∞¢6ˆÁ7B÷ñ‚“÷FÇÁ&˜VÊBá&˜WFRÊGW&Fñˆ‚Úcì∞¢6ˆÁ7BÇ“÷FÇÊf∆ˆ˜"Ü÷ñ‚Úcì∞¢6ˆÁ7B∂““á&˜WFRÊFó7FÊ6RÚíÁFÙfóÜVBÉì∞¢6WDWFÄ¢(òÇG∂Ç‚ÚG∂á÷ÇGµ7G&ñÊrÜ÷ñ‚RcíÁE7F'BÉ"¬#"ó÷¢G∂÷ñÁ“÷ñÊ“FR6'&Ú+rG∂∂◊“∂“á6V“G,:&Á6óFÚ+rFF˜2*í˜VÂ7G&VWD÷ñ¿¢ì∞¢“6F6ÇÜRí∞¢6WDWFÇ""ì∞¢6WEFˆ7BÜRÊ÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬6∆7V∆"v˜&"ì∞¢–¢”∞¢6ˆÁ7B6WE7F˜“Üí¬bí”‚6WE7F˜2Çá2í”‚2Ê÷ÇáÇ¬¢í”‚Ü¢””“íÚb¢Çííì∞¢6ˆÁ7BFE7F˜“Çí”‡¢6WE7F˜2Çá2í”‡¢2Ê∆VÊwFÇ¬"Ú≤‚‚Á2Á6∆ñ6RÉ¬”í¬""¬5∑2Ê∆VÊwFÇ“’“¢2¿¢ì∞¢6ˆÁ7B&V÷˜fU7F˜“Üíí”‡¢6WE7F˜2Çá2í”‚á2Ê∆VÊwFÇ‚"Ú2Êfñ«FW"ÇÖÚ¬¢í”‚¢”“íí¢2íì∞¢6ˆÁ7B6∆V‚“Çí”‚7F˜2Ê÷Çá2í”‚2ÁG&ñ“ÇííÊfñ«FW"Ñ&ˆˆ∆V‚ì∞¢6ˆÁ7B'Vñ∆EW&¬“áG2í”‡¢áGG3¢Ú˜wwrÊvˆˆv∆RÊ6ˆ“ˆ÷2ˆFó"Ûˆì”f˜&ñvñ„“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBáG5≥“ó“fFW7FñÊFñˆ„“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBáG5∑G2Ê∆VÊwFÇ““ó“G∑G2Ê∆VÊwFÇ‚"Ú"gvóˆñÁG3“"≤G2Á6∆ñ6RÉ¬”íÊ÷ÜVÊ6ˆFUU$î6ˆ◊ˆÊVÁBíÊ¶ˆñ‚Ç"St2"í¢"'“gG&fV∆÷ˆFS“G∂÷ˆFW÷∞¢6ˆÁ7B˜V‚“Çí”‚∞¢6ˆÁ7BG2“6∆V‚Çì∞¢ñbáG2Ê∆VÊwFÇ¬"í∞¢6WEFˆ7BÇ$ñÊf˜&÷RÚ÷VÊ˜2˜&ñvV“RFW7FñÊÚ"ì∞¢&WGW&„∞¢–¢vñÊF˜rÊ˜V‚Ü'Vñ∆EW&¬áG2í¬%ˆ&∆Ê≤"¬&Êˆ˜VÊW""ì∞¢6WEFˆ7BÇ%&˜F&W'FÊÚvˆˆv∆R÷2"ì∞¢”∞¢6ˆÁ7B˜Fñ÷ó¶R“7ñÊ2Çí”‚∞¢6ˆÁ7BG2“6∆V‚Çì∞¢ñbáG2Ê∆VÊwFÇ¬2í∞¢6WEFˆ7BÇ$Fñ6ñˆÊR&F2&˜Fñ÷ó¶""ì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢&ˆ◊C¢6˜RVÁG&VvF˜"‚˜&FVÊR˜2VÊFW&\:v˜2&óÜÚÊ6W\:¶Ê6ñ÷ó2Vfñ6ñVÁFRFR&˜F¬÷ÁFVÊFÚÚ&ñ÷Vó&Ú6ˆ÷ÚˆÁFÚFR'FñF‚&W7ˆÊF4Ù‘TÂDR6ˆ“∆ó7FÁV÷W&FF˜2VÊFW&\:v˜2ÊÊ˜f˜&FV“¬6V“6ˆ÷VÁL:&ñ˜2Â∆Â∆‚G∑G2Ê÷Çá¬íí”‚G∂í≤“‚G∑÷íÊ¶ˆñ‚Ç%∆‚"ó÷¿¢7V6ñ∆ó7C¢$∆ˆ|:◊7Fñ6"¿¢“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbá"Êˆ≤bbBÊ6ˆÁFVÁBí∞¢6ˆÁ7B&V˜&FW&VB“BÊ6ˆÁFVÁ@¢Á7∆óBÇ%∆‚"ê¢Ê÷ÇÜ¬í”‚¬Á&W∆6RÇıÂ«2•∆Bµ≤‚ï’«2¢Ú¬""íÁG&ñ“Çíê¢Êfñ«FW"Ñ&ˆˆ∆V‚ì∞¢ñbá&V˜&FW&VBÊ∆VÊwFÇ„“G2Ê∆VÊwFÇí∞¢6WE7F˜2Ö≤‚‚Á&V˜&FW&VBÁ6∆ñ6RÉ¬G2Ê∆VÊwFÇí¬"%“ì∞¢6WEFˆ7BÇ$˜&FV“7VvW&ñFV∆î∆ñ6F"ì∞¢–¢–¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬˜Fñ÷ó¶"v˜&"ì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S“$∆ˆ|:◊7Fñ6(	B&˜FVó&ó¶F˜""vñFRˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢≈&˜WFRÛ‡¢«7„‡¢÷ˆÁFR&˜F6ˆ“l:&ñ2&F2R'&Fó&WFÚÊÚvˆˆv∆R÷2&¢ÊfVv"‚w&GVóFÚ¬6V“6F7G&Ú‚FV◊ÚFRG&¶WFÚ¬G,:&Á6óFÚRVL:vñ˜2&V6V“ÊÚ÷2Ú'&ó"&˜F‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'&˜WFR÷∆ó7B#‡¢∑7F˜2Ê÷Çá2¬íí”‚Ä¢∆Fób6∆74Ê÷S“'&˜WFR◊&˜r"∂Wì◊∂ó”‡¢«7‚6∆74Ê÷S“'&˜WFR÷F˜B#‡¢∂í””“ÚÄ¢ƒ÷ñ‚Û‡¢í¢í””“7F˜2Ê∆VÊwFÇ“ÚÄ¢ƒÊfñvFñˆ‚Û‡¢í¢Ä¢ê¢ó–¢¬˜7„‡¢∆ñÁW@¢∆ó7C◊∂&˜WFR◊7Vvr“G∂ó÷–¢f«VS◊∑7–¢ˆ‰6ÜÊvS◊≤ÜRí”‚∞¢6WE7F˜Üí¬RÁF&vWBÁf«VRì∞¢7VvvW7BÜí¬RÁF&vWBÁf«VRì∞¢◊–¢∆6VÜˆ∆FW#◊∞¢í””“ ¢Ú$˜&ñvV“ÜVÊFW&\:vÚFR'FñFí ¢¢í””“7F˜2Ê∆VÊwFÇ“¢Ú$FW7FñÊÚfñÊ¬ ¢¢&FG∂ó÷ ¢–¢Û‡¢∆FF∆ó7BñC◊∂&˜WFR◊7Vvr“G∂ó÷”‡¢≤á7Vvu∂ï“«¬µ“íÊ÷ÇÜ˜Bí”‚Ä¢∆˜Fñˆ‚∂Wì◊∂˜G“f«VS◊∂˜G“Û‡¢íó–¢¬ˆFF∆ó7C‡¢∑7F˜2Ê∆VÊwFÇ‚"bbÄ¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fU7F˜Üíó–¢‡¢≈ÇÛ‡¢¬ˆ'WGFˆ„‡¢ó–¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢∆'WGFˆ‚6∆74Ê÷S“'FWáB÷'WGFˆ‚"ˆ‰6∆ñ6≥◊∂FE7F˜”‡¢≈«W26ó¶S◊≥g“Û‡¢Fñ6ñˆÊ"&F¢¬ˆ'WGFˆ„‡¢∂WFbbÄ¢∆Fób6∆74Ê÷S“'&˜WFR÷WF#‡¢∂WF””“&6∆7V∆ÊFÚ"Ú$6∆7V∆ÊFÚ&˜F‚‚‚"¢WF–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'&˜WFR÷÷ˆFR#‡¢«7„‰6ˆ÷Úfí6RFW6∆ˆ6#£¬˜7„‡¢«6V∆V7Bf«VS◊∂÷ˆFW“ˆ‰6ÜÊvS◊≤ÜRí”‚6WD÷ˆFRÜRÁF&vWBÁf«VRó”‡¢∆˜Fñˆ‚f«VS“&G&ófñÊr#‰6'&Úˆ÷˜FÛ¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“'v∆∂ñÊr#‰:ì¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&&ñ7ñ6∆ñÊr#‰&ñ6ñ6∆WF¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“'G&Á6óB#ÂG&Á7˜'FR;¶&∆ñ6Û¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2#‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊∂'W7íÚ&Vg&W6Ñ7r¢7&∂∆W7–¢Fó6&∆VC◊∂'W7ó–¢ˆ‰6∆ñ6≥◊∂˜Fñ÷ó¶W–¢‡¢∂'W7íÚ$˜Fñ÷ó¶ÊFÚ‚‚‚"¢%7VvW&ó"÷V∆Ü˜"˜&FV“Ñîí'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ñ6ˆ„◊¥6∆ˆ6≥7“ˆ‰6∆ñ6≥◊∂6∆4WF”‡¢FV◊ÚRFó7L:&Ê6ñ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚ñ6ˆ„◊¥ÊfñvFñˆÁ“ˆ‰6∆ñ6≥◊∂˜VÁ”‡¢'&ó"&˜FÊÚ÷0¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–†¶6ˆÁ7BïFˆˆ«2“∞¢&ñ6S¢∞¢FóF∆S¢$fñÊÊ6Vó&Ú(	B6∆7V∆F˜&FR&\:vÚ"¿¢ñ6ˆ„¢Fˆ∆∆%6ñv‚¿¢7V6ñ∆ó7C¢%&V6ñfñ6F˜""¿¢7F¢$6∆7V∆"&\:vÚ"¿¢˜WEFóF∆S¢%&\:vÚ7VvW&ñFÚ"¿¢ÜñÁC¢$6∆7V∆Ú&\:vÚFRfVÊF6ˆ“&6RVÊ2Ê˜2Ï;¶÷W&˜2VRfˆ<:¢ñÊf˜&÷"‚÷˜7G&l;7&◊V∆R6W&7W7FÚ¬÷&vV“RW7Fñ÷Fóf2‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢'&ˆGWFÚ"¿¢∆&V√¢%&ˆGWFÚ˜R6W'fú:vÚ"¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢&ˆ∆ÚFR˜FR#S÷¬"¿¢“¿¢∞¢∂Wì¢&7W7FÚ"¿¢∆&V√¢$7W7FÚFó&WFÚ˜"VÊñFFRÖ"Bí"¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢B√S"¿¢“¿¢∞¢∂Wì¢'FV◊Ú"¿¢∆&V√¢%FV◊Úˆ‹:6ÚFRˆ'&˜"VÊñFFR"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢#÷ñ‚"B#RˆÇ"¿¢“¿¢∞¢∂Wì¢&fóÜ2"¿¢∆&V√¢$FW7W62fóÜ2&FV"Ö"Bí"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢«VwVV¬ˆ«W¢˜"VÊñFFR¬6R6˜V&W""¿¢“¿¢∞¢∂Wì¢&÷&vV“"¿¢∆&V√¢$÷&vV“FR«V7&ÚFW6V¶FÇRí"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢C"¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢6∆7V∆RV“&\:vÚFRfVÊF7VvW&ñFÚW6ÊFÚ4Ù‘TÂDRW7FW2Ï;¶÷W&˜2‚÷˜7G&Rl;7&◊V∆¬6ˆ÷R7W7FÚFó&WFÚ≤‹:6ÚFRˆ'&≤&FVñÚFRFW7W62¬∆óVR÷&vV“¬R6W&R6∆&÷VÁFRÚVR:ífFÚñÊf˜&÷FÚFÚVR:íW7Fñ÷Fóf‚Ï:6ÚñÁfVÁFRf∆˜&W2W6VÁFW2(	B6Rf«F"∆vÚ¬ˆÁFRÂ∆Â∆Â&ˆGWFÛ¢G∑bÁ&ˆGWF˜’∆‰7W7FÚFó&WFÚ˜VÊñFFS¢"BG∑bÊ7W7F˜’∆‰‹:6ÚFRˆ'&˜FV◊Û¢G∑bÁFV◊Ú«¬&Ï:6ÚñÊf˜&÷FÚ'’∆‰FW7W62fóÜ2&FV#¢G∑bÊfóÜ2«¬&Ï:6ÚñÊf˜&÷FÚ'’∆‰÷&vV“FW6V¶F¢G∑bÊ÷&vV“«¬&Ï:6ÚñÊf˜&÷F'“V¿¢“¿¢˜7C¢∞¢FóF∆S¢$÷&∂WFñÊr(	BvW&F˜"FR˜7G2"¿¢ñ6ˆ„¢÷VvÜˆÊR¿¢7V6ñ∆ó7C¢$÷&∂WFñÊr"¿¢7F¢$vW&"˜7G2"¿¢˜WEFóF∆S¢$∆VvVÊF2&ˆÁF2"¿¢ÜñÁC¢$7&ñ˜:|;VW2FR∆VvVÊF6ˆ“Ü6áFw2&7V2&VFW2¬'Fó"FÚVRfˆ<:¢fVÊFRRFÚFˆ“F÷&6‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢&ˆfW'F"¿¢∆&V√¢$ÚVRfˆ<:¢VW"FógV∆v""¿¢GóS¢'FWáF&V"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢Ê˜f∆ñÊÜFR&ˆ∆˜2ÊÚ˜FR¬6&˜&W2FRñÁfW&ÊÚ"¿¢“¿¢∞¢∂Wì¢'&VFR"¿¢∆&V√¢%&VFR6ˆ6ñ¬"¿¢GóS¢'6V∆V7B"¿¢˜FñˆÁ3¢∞¢$ñÁ7Fw&“"¿¢$f6V&ˆˆ≤"¿¢$∆ñÊ∂VDñ‚"¿¢%FñµFˆ≤"¿¢%vÜG47FGW2"¿¢“¿¢“¿¢∞¢∂Wì¢&ˆ&¶WFófÚ"¿¢∆&V√¢$ˆ&¶WFófÚ"¿¢GóS¢'6V∆V7B"¿¢˜FñˆÁ3¢∞¢%fVÊFW""¿¢$VÊv¶"ˆñÁFW&vó""¿¢$FógV∆v"Ê˜fñFFR"¿¢$VGV6"Ú;¶&∆ñ6Ú"¿¢“¿¢“¿¢∞¢∂Wì¢'Fˆ“"¿¢∆&V√¢%Fˆ“F÷&6"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢6ˆ∆ÜVF˜"RFófW'FñFÚ"¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢7&ñR2˜:|;VW2FR∆VvVÊF&G∑bÁ&VFW“6ˆ“Úˆ&¶WFófÚFRG∑bÊˆ&¶WFóf˜“‚Fˆ”¢G∑bÁFˆ“«¬'&ˆfó76ñˆÊ¬R,;7Üñ÷Ú'“‚W6RV÷ˆ¶ó2FWVF˜2R¬ÚfñÊ¬FR6F˜:|:6Ú¬RÇÜ6áFw2&V∆WfÁFW2‚Ï:6ÚñÁfVÁFR&\:v˜2¬&ˆ÷¸:|;VW2¬&¶˜2˜R&W7V«FF˜2VRÏ:6Úf˜&“ñÊf˜&÷F˜2Â∆Â∆‰77VÁFÛ¢G∑bÊˆfW'F÷¿¢“¿¢6ˆÁG&7C¢∞¢FóF∆S¢$ßW,:÷Fñ6Ú(	BvW&F˜"FR6ˆÁG&FÚ"¿¢ñ6ˆ„¢'&ñVf66T'W6ñÊW72¿¢7V6ñ∆ó7C¢$ßW,:÷Fñ6Ú"¿¢7F¢$vW&"÷ñÁWF"¿¢˜WEFóF∆S¢$÷ñÁWFFR6ˆÁG&FÚ"¿¢ÜñÁC¢$÷ˆÁFV÷÷ñÁWFFR6ˆÁG&FÚFR&W7F:|:6ÚFR6W'fú:v˜26ˆ“6WW2FF˜2¬V“6Ã:W7V∆2¬&ˆÁF&&Wfó<:6ÚFRV“GfˆvFÚ‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢&6ˆÁG&FÁFR"¿¢∆&V√¢$6ˆÁG&FÁFRáVV“6ˆÁG&Fí"¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$Êˆ÷RˆV◊&W6R¬6RFófW"¬4Â¢Ù5b"¿¢“¿¢∞¢∂Wì¢&6ˆÁG&FFÚ"¿¢∆&V√¢$6ˆÁG&FFÚáVV“&W7FÚ6W'fú:vÚí"¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$Êˆ÷RˆV◊&W6R¬6RFófW"¬4Â¢Ù5b"¿¢“¿¢∞¢∂Wì¢'6W'fñ6Ú"¿¢∆&V√¢%6W'fú:vÚ6W"&W7FFÚ"¿¢GóS¢'FWáF&V"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$FW67&WfÚˆ&¶WFÚFÚ6ˆÁG&FÚ"¿¢“¿¢∞¢∂Wì¢'f∆˜""¿¢∆&V√¢%f∆˜"Rf˜&÷FRv÷VÁFÚ"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢"B„SV“7Ç¬fñóÇ"¿¢“¿¢∞¢∂Wì¢'&¶Ú"¿¢∆&V√¢%&¶ÚÚfñ|:¶Ê6ñ"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢3Fñ2'Fó"F76ñÊGW&"¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢÷ˆÁFRV÷÷ñÁWFFR4ÙÂE$DÚDR$U5D8|84ÚDR4U%dú8tı2V“6Ã:W7V∆2ÁV÷W&F2Üˆ&¶WFÚ¬ˆ'&ñv:|;VW2F2'FW2¬f∆˜"Rv÷VÁFÚ¬&¶Ú¬6ˆÊfñFVÊ6ñ∆ñFFR¬&W66ó<:6Ú¬f˜&Úí¬W6ÊFÚ4Ù‘TÂDR˜2FF˜2&óÜÚRFVóÜÊFÚ∆7VÊ2∂VÁG&R6ˆ∆6ÜWFW5“ˆÊFRf«F"ñÊf˜&÷:|:6Ú‚ÚfñÊ¬¬ñÊ6«VV÷ˆ'6W'f:|:6ÚFRVR÷ñÁWFFWfR6W"&Wfó6F˜"V“GfˆvFÚÁFW2F76ñÊGW&‚Ï:6Ú6óFRÏ;¶÷W&˜2FR∆Vó2W7V<:÷fñ62ÊV“ñÁfVÁFR6Ã:W7V∆26ˆ“f∆˜&W2Ï:6ÚñÊf˜&÷F˜2Â∆Â∆‰6ˆÁG&FÁFS¢G∑bÊ6ˆÁG&FÁFW’∆‰6ˆÁG&FFÛ¢G∑bÊ6ˆÁG&FF˜’∆Â6W'fú:vÛ¢G∑bÁ6W'fñ6˜’∆Âf∆˜"˜v÷VÁFÛ¢G∑bÁf∆˜"«¬%∂FVfñÊó%“'’∆Â&¶Û¢G∑bÁ&¶Ú«¬%∂FVfñÊó%“'÷¿¢“¿¢6∆W3¢∞¢FóF∆S¢%fVÊF2(	B&˜FVó&ÚRfˆ∆∆˜r◊W"¿¢ñ6ˆ„¢G&VÊFñÊuW¿¢7V6ñ∆ó7C¢%fVÊF2"¿¢7F¢$vW&"&˜FVó&Ú"¿¢˜WEFóF∆S¢%&˜FVó&ÚFRfVÊF2"¿¢ÜñÁC¢$7&ñ67&óBFR&˜&FvV“¬&W7˜7F2ˆ&¶\:|;VW2R÷VÁ6vVÁ2FR6ˆ◊ÊÜ÷VÁFÚ&fV6Ü"÷ó2fVÊF2‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢&ˆfW'F"¿¢∆&V√¢%&ˆGWFÚ˜R6W'fú:vÚ"¿¢GóS¢'FWáF&V"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$ÚVRfˆ<:¢fVÊFRRÚ&ñÊ6ó¬&VÊVl:÷6ñÚ"¿¢“¿¢∞¢∂Wì¢&6∆ñVÁFR"¿¢∆&V√¢$6∆ñVÁFRñFV¬"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢‹:6W2VR6ˆ◊&“˜"VÊ6ˆ÷VÊF"¿¢“¿¢∞¢∂Wì¢&6Ê¬"¿¢∆&V√¢$6Ê¬FR6ˆÁFFÚ"¿¢GóS¢'6V∆V7B"¿¢˜FñˆÁ3¢∞¢%vÜG4"¿¢$R÷÷ñ¬"¿¢%FV∆VfˆÊR"¿¢%&W6VÊ6ñ¬"¿¢$ñÁ7Fw&“Fó&V7B"¿¢“¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢7&ñRV“&˜FVó&ÚFRfVÊF2,:Fñ6Ú&G∑bÊ6Ê«“¬6ˆ”¢í&˜&FvV“ñÊñ6ñ¬¬"í2W&wVÁF2FRV∆ñfñ6:|:6Ú¬2í&W6VÁF:|:6ÚFRf∆˜"¬Bí2ˆ&¶\:|;VW26ˆ◊VÁ26ˆ“&W7˜7F2&ˆÁF2¬Rí"÷VÁ6vVÁ2FRfˆ∆∆˜r◊WÜ6ˆ“ñÁFW'f∆Ú7VvW&ñFÚí‚6V¶W7V<:÷fñ6ÚR:óFñ6Ú‚Ï:6ÚñÁfVÁFRFWˆñ÷VÁF˜2¬&W7V«FF˜2˜R&\:v˜2Ï:6ÚñÊf˜&÷F˜2Â∆Â∆Â&ˆGWFÚ˜6W'fú:vÛ¢G∑bÊˆfW'F’∆‰6∆ñVÁFRñFV√¢G∑bÊ6∆ñVÁFR«¬&Ï:6ÚñÊf˜&÷FÚ'÷¿¢“¿¢&É¢∞¢FóF∆S¢%$Ç(	BfvRVÁG&Wfó7F"¿¢ñ6ˆ„¢W6W$6ˆr¿¢7V6ñ∆ó7C¢%W76ˆ2"¿¢7F¢$vW&""¿¢˜WEFóF∆S¢$FW67&ú:|:6ÚFRfv≤VÁG&Wfó7F"¿¢ÜñÁC¢$7&ñFW67&ú:|:6ÚFRV÷fvRV“&˜FVó&ÚFRVÁG&Wfó7F¬6V“W6"7&óL:ó&ñ˜2Fó67&ñ÷ñÊL;7&ñ˜2‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢&6&vÚ"¿¢∆&V√¢$6&vÚ"¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢WÜñ∆ñ"FR6ˆÊfVóF&ñ"¿¢“¿¢∞¢∂Wì¢'&W7ˆÁ6"¿¢∆&V√¢%&ñÊ6óó2&W7ˆÁ6&ñ∆ñFFW2"¿¢GóS¢'FWáF&V"¿¢∆6VÜˆ∆FW#¢$ÚVRW76ˆfíf¶W"ÊÚFñFñ"¿¢“¿¢∞¢∂Wì¢'&WVó6óF˜2"¿¢∆&V√¢%&WVó6óF˜2FW6V¶F˜2"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢WáW&ú:¶Ê6ñ6ˆ“÷762¬Fó7ˆÊñ&ñ∆ñFFR÷Êå:2"¿¢“¿¢∞¢∂Wì¢'FóÚ"¿¢∆&V√¢%FóÚFR6ˆÁG&F:|:6Ú"¿¢GóS¢'6V∆V7B"¿¢˜FñˆÁ3¢≤$4≈B"¬%¢"¬$W7L:vñÚ"¬$g&VV∆Ê6W""¬%FV◊˜,:&ñÚ%“¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢7&ñS¢íV÷FW67&ú:|:6ÚFRfv&ˆfó76ñˆÊ¬RG&FófR"íV“&˜FVó&Ú6ˆ“ÇW&wVÁF2FRVÁG&Wfó7FÜ6ˆ◊˜'F÷VÁFó2RL:ñ6Êñ62í‚Ï:6ÚW6R7&óL:ó&ñ˜2Fó67&ñ÷ñÊL;7&ñ˜2ÜñFFR¬|:¶ÊW&Ú¬W7FFÚ6ófñ¬¬,:¶Ê6ñí‚Ï:6ÚñÁfVÁFR&VÊVl:÷6ñ˜2˜R6Ã:&ñ˜2Ï:6ÚñÊf˜&÷F˜2Â∆Â∆‰6&vÛ¢G∑bÊ6&v˜’∆Â&W7ˆÁ6&ñ∆ñFFW3¢G∑bÁ&W7ˆÁ6«¬&Ï:6ÚñÊf˜&÷F2'’∆Â&WVó6óF˜3¢G∑bÁ&WVó6óF˜2«¬&Ï:6ÚñÊf˜&÷F˜2'’∆‰6ˆÁG&F:|:6Û¢G∑bÁFó˜÷¿¢“¿¢˜3¢∞¢FóF∆S¢$˜W&:|;VW2(	B76Ú76ÚÖıí"¿¢ñ6ˆ„¢v˜&∂f∆˜r¿¢7V6ñ∆ó7C¢$˜W&:|;VW2"¿¢7F¢$vW&"ı"¿¢˜WEFóF∆S¢%&ˆ6VFñ÷VÁFÚ˜W&6ñˆÊ¬"¿¢ÜñÁC¢%G&Á6f˜&÷V÷F&Vf&V6˜'&VÁFRV“V“&ˆ6VFñ÷VÁFÚG,:6Ú6ˆ“6ÜV6∂∆ó7B¬&V«VW"W76ˆWÜV7WF"ñwV¬‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢'&ˆ6W76Ú"¿¢∆&V√¢%&ˆ6W76ÚG&ˆÊó¶""¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢&W&ÚRVÁG&VvFRVÊ6ˆ÷VÊF2"¿¢“¿¢∞¢∂Wì¢&ˆ&¶WFófÚ"¿¢∆&V√¢$ˆ&¶WFófÚÚ&W7V«FFÚW7W&FÚ"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢VÁG&Vv"ÊÚ&¶ÚR6V“W'&˜2"¿¢“¿¢∞¢∂Wì¢'VV“"¿¢∆&V√¢%VV“WÜV7WF"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢WÜñ∆ñ"RVÁG&VvF˜""¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢7&ñRV“&ˆ6VFñ÷VÁFÚ˜W&6ñˆÊ¬G,:6ÚÖıí&Ú&ˆ6W76Ú&óÜÛ¢76˜2ÁV÷W&F˜2Ê˜&FV“6˜'&WF¬&W7ˆÁ<:fVó2˜"WF¬ˆÁF˜2FRFVÏ:|:6ÚRV“6ÜV6∂∆ó7BfñÊ¬FR6ˆÊfW,:¶Ê6ñ‚6V¶,:Fñ6ÚRW7V<:÷fñ6ÚÂ∆Â∆Â&ˆ6W76Û¢G∑bÁ&ˆ6W76˜’∆‰ˆ&¶WFófÛ¢G∑bÊˆ&¶WFófÚ«¬&Ï:6ÚñÊf˜&÷FÚ'’∆‰WÜV7WF˜&W3¢G∑bÁVV“«¬&Ï:6ÚñÊf˜&÷FÚ'÷¿¢“¿¢7W˜'C¢∞¢FóF∆S¢$FVÊFñ÷VÁFÚ(	B&W7˜7F2&ˆÁF2"¿¢ñ6ˆ„¢ÜVGÜˆÊW2¿¢7V6ñ∆ó7C¢$FVÊFñ÷VÁFÚ"¿¢7F¢$vW&"&W7˜7F2"¿¢˜WEFóF∆S¢$÷ˆFV∆˜2FR&W7˜7F"¿¢ÜñÁC¢$vW&÷ˆFV∆˜2FR&W7˜7F6ˆ“V◊FñRfˆ6ÚV“&W6ˆ«\:|:6Ú¬&fˆ<:¢FF"RVÁfñ"‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢'6óGV6Ú"¿¢∆&V√¢%6óGV:|:6ÚFÚ6∆ñVÁFR"¿¢GóS¢'FWáF&V"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢6∆ñVÁFR&V6∆÷ÊFÚFRG&6ÚÊVÁG&Vv"¿¢“¿¢∞¢∂Wì¢&6Ê¬"¿¢∆&V√¢$6Ê¬"¿¢GóS¢'6V∆V7B"¿¢˜FñˆÁ3¢∞¢%vÜG4"¿¢$R÷÷ñ¬"¿¢$ñÁ7Fw&“Fó&V7B"¿¢%FV∆VfˆÊRá&˜FVó&Úí"¿¢“¿¢“¿¢∞¢∂Wì¢'Fˆ“"¿¢∆&V√¢%Fˆ“FW6V¶FÚ"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢VGV6FÚ¬6ˆ∆ÜVF˜"Rˆ&¶WFófÚ"¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢7&ñR2÷ˆFV∆˜2FR&W7˜7F&G∑bÊ6Ê«“&6óGV:|:6Ú&óÜÚ¬6ˆ“V◊FñRfˆ6ÚV“&W6ˆ«\:|:6Ú‚ˆfW&\:vV÷6ˆ«\:|:6Ú6ˆÊ7&WF˜R,;7Üñ÷Ú76Ú‚Ï:6Ú&ˆ÷WF&VV÷&ˆ«6˜2¬&¶˜2˜R6ˆÊFú:|;VW2Ï:6ÚñÊf˜&÷F˜2Â∆Â∆Â6óGV:|:6Û¢G∑bÁ6óGV6˜’∆ÂFˆ”¢G∑bÁFˆ“«¬&VGV6FÚRˆ&¶WFófÚ'÷¿¢“¿¢FF˜3¢∞¢FóF∆S¢$FF˜2(	BÏ:∆ó6RFRÏ;¶÷W&˜2"¿¢ñ6ˆ„¢fñ«FW"¿¢7V6ñ∆ó7C¢$FF˜2"¿¢7F¢$Ê∆ó6""¿¢˜WEFóF∆S¢$Ï:∆ó6RF˜2FF˜2"¿¢ÜñÁC¢$6ˆ∆R6WW2Ï;¶÷W&˜2áfVÊF2¬FW7W62¬fó6óF2‚‚‚íR&V6V&G,;VW2¬6ˆ◊&:|;VW2R&V6ˆ÷VÊF:|;VW2&6VF2VÊ2ÊÚVRfˆ<:¢ñÊf˜&÷"‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢&FF˜2"¿¢∆&V√¢$6ˆ∆R6WW2FF˜2"¿¢GóS¢'FWáF&V"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#†¢$WÇ„•∆‰¶„¢C"fVÊF2¬"B2„∆‰fWc¢3ÇfVÊF2¬"B"„ì∆‰÷#¢SRfVÊF2¬"BB„C"¿¢“¿¢∞¢∂Wì¢'W&wVÁF"¿¢∆&V√¢$ÚVRfˆ<:¢VW"FW66ˆ'&ó#Ú"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢˜"VR÷,:vÚ7&W66WSÚÚVRFWfÚ&WWFó#Ú"¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢Ê∆ó6RT‰2˜2FF˜2&óÜÚ¬6V“ñÁfVÁF"ÊVÊáV“Ï;¶÷W&Û¢ñFVÁFñfóVRG,;VW2¬f&ñ:|;VW2&V∆WfÁFW2Ü6ˆ“W&6VÁGVó26∆7V∆F˜2í¬˜7<:◊fVó26W62ñÁfW7Fñv"R2&V6ˆ÷VÊF:|;VW2,:Fñ62&6VF2V“WfñL:¶Ê6ñ2‚6R˜2FF˜2f˜&V“ñÁ7Vfñ6ñVÁFW2&∆wV÷6ˆÊ6«W<:6Ú¬Fñv6∆&÷VÁFRÂ∆Â∆‰FF˜3•∆‚G∑bÊFF˜7’∆Â∆ÂW&wVÁF&ñÊ6ó√¢G∑bÁW&wVÁF«¬'fó<:6ÚvW&¬'÷¿¢“¿¢V6ˆ÷÷W&6S¢∞¢FóF∆S¢$R÷6ˆ÷÷W&6R(	BFW67&ú:|:6ÚFR&ˆGWFÚ"¿¢ñ6ˆ„¢6Ü˜ñÊt&r¿¢7V6ñ∆ó7C¢$R÷6ˆ÷÷W&6R"¿¢7F¢$vW&"FW67&ú:|:6Ú"¿¢˜WEFóF∆S¢$Ï;¶Ê6ñÚ&ˆÁFÚ"¿¢ÜñÁC¢$7&ñL:◊GV∆Ú˜Fñ÷ó¶FÚ¬FW67&ú:|:6ÚfVÊFVF˜&R∆g&2÷6ÜfR&7V∆ˆ¶˜R÷&∂WG∆6R‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢'&ˆGWFÚ"¿¢∆&V√¢%&ˆGWFÚ"¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢∂óBB&ˆ∆˜2FR˜FR6&˜&W26˜'FñF˜2"¿¢“¿¢∞¢∂Wì¢&6&7FW&ó7Fñ62"¿¢∆&V√¢$6&7FW,:◊7Fñ62RFñfW&VÊ6ñó2"¿¢GóS¢'FWáF&V"¿¢∆6VÜˆ∆FW#†¢%F÷ÊÜÚ¬6&˜"¬÷FW&ñ¬¬&¶ÚFRf∆ñFFR¬ÚVRÚF˜&ÊW7V6ñ¬‚‚‚"¿¢“¿¢∞¢∂Wì¢'∆Ff˜&÷"¿¢∆&V√¢$ˆÊFRfífVÊFW""¿¢GóS¢'6V∆V7B"¿¢˜FñˆÁ3¢∞¢$÷W&6FÚ∆óg&R"¿¢%6Ü˜VR"¿¢$÷¶ˆ‚"¿¢$∆ˆ¶,;7&ñÚ6óFR"¿¢$ñÁ7Fw&“ÚvÜG4"¿¢“¿¢“¿¢∞¢∂Wì¢'V&∆ñ6Ú"¿¢∆&V√¢%;¶&∆ñ6Ú÷«fÚ"¿¢GóS¢&ñÁWB"¿¢∆6VÜˆ∆FW#¢$WÇ„¢&W6VÁFW26˜'˜&Fóf˜2¬fW7F2ñÊfÁFó2"¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢7&ñRV“Ï;¶Ê6ñÚ˜Fñ÷ó¶FÚ&G∑bÁ∆Ff˜&÷”¢íL:◊GV∆Ú6ˆ“∆g&2÷6ÜfRá&W7VóFÊFÚÚW7Fñ∆ÚF∆Ff˜&÷í¬"íFW67&ú:|:6ÚfVÊFVF˜&RW66Ê\:fV¬6ˆ“'V∆∆WG2¬2í∆ó7FFRÇ∆g&2÷6ÜfRFR'W66¬Bí7VvW7L:6ÚFRW&wVÁFg&WVVÁFR6ˆ“&W7˜7F‚Ï:6ÚñÁfVÁFR÷VFñF2¬&¶˜2¬v&ÁFñ2˜R6W'Fñfñ6:|;VW2Ï:6ÚñÊf˜&÷F2Â∆Â∆Â&ˆGWFÛ¢G∑bÁ&ˆGWF˜’∆‰6&7FW,:◊7Fñ63¢G∑bÊ6&7FW&ó7Fñ62«¬&Ï:6ÚFWF∆ÜF2'’∆Â;¶&∆ñ6Û¢G∑bÁV&∆ñ6Ú«¬&vW&¬'÷¿¢“¿¢6ˆ◊&3¢∞¢FóF∆S¢$6ˆ◊&2(	B6ˆ◊&F˜"FR6˜F:|;VW2"¿¢ñ6ˆ„¢&˜ÜW2¿¢7V6ñ∆ó7C¢$6ˆ◊&2"¿¢7F¢$6ˆ◊&""¿¢˜WEFóF∆S¢$6ˆ◊&FófÚR&V6ˆ÷VÊF:|:6Ú"¿¢ÜñÁC¢$6ˆ∆R26˜F:|;VW2&V6V&ñF2R&V6V&V÷6ˆ◊&:|:6ÚW7G'WGW&F6ˆ“&V6ˆ÷VÊF:|:6ÚRˆÁF˜2FRÊVvˆ6ñ:|:6Ú‚"¿¢fñV∆G3¢∞¢∞¢∂Wì¢&óFV“"¿¢∆&V√¢$ÚVRfˆ<:¢W7L:6ˆ◊&ÊFÚ"¿¢GóS¢&ñÁWB"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#¢$WÇ„¢SV÷&∆vVÁ2&&ˆ∆ÚFR˜FR"¿¢“¿¢∞¢∂Wì¢&6˜F6ˆW2"¿¢∆&V√¢$6˜F:|;VW2&V6V&ñF2"¿¢GóS¢'FWáF&V"¿¢&WVó&VC¢G'VR¿¢∆6VÜˆ∆FW#†¢$WÇ„•∆‰f˜&ÊV6VF˜"¢"B√ì˜V‚¬&¶ÚFñ2¬g&WFRw,:Fó5∆‰f˜&ÊV6VF˜"#¢"B√sR˜V‚¬&¶Ú#Fñ2¬g&WFR"BÉ"¿¢“¿¢∞¢∂Wì¢'&ñ˜&ñFFR"¿¢∆&V√¢%7V&ñ˜&ñFFR"¿¢GóS¢'6V∆V7B"¿¢˜FñˆÁ3¢∞¢$÷VÊ˜"7W7FÚF˜F¬"¿¢%&¶Ú÷ó2,:ñFÚ"¿¢$WVñÃ:÷'&ñÚ7W7FÚÇ&¶Ú"¿¢%V∆ñFFRˆ6ˆÊfñ&ñ∆ñFFR"¿¢“¿¢“¿¢“¿¢'Vñ∆C¢ábí”‡¢6ˆ◊&R26˜F:|;VW2&óÜÚV“V÷F&V∆Ü7W7FÚF˜F¬6∆7V∆FÚ¬&¶Ú¬6ˆÊFú:|;VW2í¬ˆÁFR÷V∆Ü˜"˜:|:6Ú6ˆÁ6ñFW&ÊFÚ&ñ˜&ñFFR"G∑bÁ&ñ˜&ñFFW“"¬˜2&ó66˜2FR6Ff˜&ÊV6VF˜"R2ˆÁF˜2&ÊVvˆ6ñ"ÁFW2FRfV6Ü"‚W6R6ˆ÷VÁFR˜2f∆˜&W2ñÊf˜&÷F˜3≤6∆7V∆RF˜Fó2VÊFÚ˜7<:◊fV¬R÷˜7G&RÚ<:∆7V∆ÚÂ∆Â∆‰óFV”¢G∑bÊóFV◊’∆‰6˜F:|;VW3•∆‚G∑bÊ6˜F6ˆW7÷¿¢“¿ß”∞†¶gVÊ7Fñˆ‚ïFˆˆƒ÷ˆF¬á≤6ˆÊfñr¬F#¢ˆF"¬WFFR¬ˆ‰6∆˜6R¬6WEFˆ7B¬'W6ñÊW72“í∞¢6ˆÁ7B∑f«2¬6WEf«5““W6U7FFRÄ¢ˆ&¶V7BÊg&ˆ‘VÁG&ñW2Ä¢6ˆÊfñrÊfñV∆G2Ê÷ÇÜbí”‚∂bÊ∂Wí¬bÁGóR””“'6V∆V7B"ÚbÊ˜FñˆÁ5≥“¢"%“í¿¢í¿¢ì∞¢6ˆÁ7B∂˜WB¬6WD˜WE““W6U7FFRÇ""í¿¢∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rí¿¢∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∂6ÜB¬6WD6ÜE““W6U7FFRÖµ“ì∞¢6ˆÁ7B∂6≤¬6WD6µ““W6U7FFRÇ""ì∞¢6ˆÁ7B6WB“Ü≤¬bí”‚6WEf«2Çá2í”‚á≤‚‚Á2¬∂µ”¢b“íì∞¢6ˆÁ7B6fT˜WGWB“ÜFW7FñÊFñˆ‚í”‚∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢WFFRÇÜ7W'&VÁBí”‚∞¢ñbÜFW7FñÊFñˆ‚””“&Fˆ7V÷VÁB"ê¢&WGW&‚∞¢‚‚Ê7W'&VÁB¿¢Fˆ7V÷VÁG3¢∞¢∞¢ñC¢VñBÇí¿¢FóF∆S¢6ˆÊfñrÁFóF∆R¿¢GóS¢6ˆÊfñrÊFˆ5GóR«¬$÷FW&ñ¬FRG&&∆ÜÚ"¿¢6ˆÁFVÁC¢˜WB¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢WFFVDC¢Ê˜r¿¢fW'6ñˆÁ3¢µ“¿¢“¿¢‚‚Ê7W'&VÁBÊFˆ7V÷VÁG2¿¢“¿¢”∞¢ñbÜFW7FñÊFñˆ‚””“'F6≤"ê¢&WGW&‚∞¢‚‚Ê7W'&VÁB¿¢F6∑3¢∞¢∞¢ñC¢VñBÇí¿¢FóF∆S¢&Wfó6#¢G∂6ˆÊfñrÁFóF∆W÷¿¢FW67&óFñˆ„¢˜WBÁ6∆ñ6RÉ¬Éí¿¢&ñ˜&óGì¢$‹:ñFñ"¿¢7FGW3¢$f¶W""¿¢GVS¢""¿¢&V¢6ˆÊfñrÁ7V6ñ∆ó7B«¬$˜W&:|:6Ú"¿¢76ñvÊVS¢""¿¢&ˆ¶V7C¢6ˆÊfñrÁFóF∆R¿¢&6ÜófVC¢f«6R¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢7&VFVDC¢Ê˜r¿¢WFFVDC¢Ê˜r¿¢“¿¢‚‚Ê7W'&VÁBÁF6∑2¿¢“¿¢”∞¢&WGW&‚∞¢‚‚Ê7W'&VÁB¿¢Üó7F˜'ì¢∞¢∞¢ñC¢VñBÇí¿¢FóF∆S¢6ˆÊfñrÁFóF∆R¿¢&WVW7C¢6ˆÊfñrÊ'Vñ∆Báf«2í¿¢&W7V«C¢˜WB¿¢7V6ñ∆ó7C¢6ˆÊfñrÁ7V6ñ∆ó7B¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢GóS¢$fW'&÷VÁFñÁFV∆ñvVÁFR"¿¢7FGW3¢$6ˆÊ6«\:÷FÚ"¿¢7&VFVDC¢Ê˜r¿¢WFFVDC¢Ê˜r¿¢&6ÜófVC¢f«6R¿¢“¿¢‚‚Ê7W'&VÁBÊÜó7F˜'í¿¢“¿¢”∞¢“ì∞¢6WEFˆ7BÄ¢FW7FñÊFñˆ‚””“&Fˆ7V÷VÁB ¢Ú%&W7V«FFÚ6«fÚV“Fˆ7V÷VÁF˜2 ¢¢FW7FñÊFñˆ‚””“'F6≤ ¢Ú%&W7V«FFÚG&Á6f˜&÷FÚV“F&Vf ¢¢%&W7V«FFÚ6«fÚV“&ˆ¶WF˜2"¿¢ì∞¢”∞¢6ˆÁ7Bñ6ˆ‚“6ˆÊfñrÊñ6ˆ„∞¢6ˆÁ7B6∆¬“7ñÊ2á&ˆ◊B¬÷W76vW2í”‚∞¢6ˆÁ7B"“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢&ˆ◊B¿¢7V6ñ∆ó7C¢6ˆÊfñrÁ7V6ñ∆ó7B¿¢÷W76vW2¿¢‚‚Êïv˜&∑76T6ˆÁFWáBÜ'W6ñÊW72í¿¢“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬vW&"v˜&‚"ì∞¢&WGW&‚ÜBÊ6ˆÁFVÁB«¬""íÁG&ñ“Çì∞¢”∞¢6ˆÁ7B'V‚“7ñÊ2Çí”‚∞¢6ˆÁ7B÷ó76ñÊr“6ˆÊfñrÊfñV∆G2Êfñ«FW"Ä¢Übí”‚bÁ&WVó&VBbb7G&ñÊráf«5∂bÊ∂Wï“íÁG&ñ“Çí¿¢ì∞¢ñbÜ÷ó76ñÊrÊ∆VÊwFÇí∞¢6WDW'"Ç%&VVÊ6Ü¢"≤÷ó76ñÊrÊ÷ÇÜbí”‚bÊ∆&V¬íÊ¶ˆñ‚Ç"¬"íì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢G'í∞¢6ˆÁ7B&ˆ◊B“6ˆÊfñrÊ'Vñ∆Báf«2ì∞¢6ˆÁ7B6ˆÁFVÁB“vóB6∆¬á&ˆ◊B¬µ“ì∞¢6WD˜WBÜ6ˆÁFVÁBì∞¢6WD6ÜBÖ∑≤&ˆ∆S¢'W6W""¬6ˆÁFVÁC¢&ˆ◊B“¬≤&ˆ∆S¢&76ó7FÁB"¬6ˆÁFVÁB’“ì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7B&VfñÊR“7ñÊ2Çí”‚∞¢6ˆÁ7B“6≤ÁG&ñ“Çì∞¢ñbÇ«¬'W7íí&WGW&„∞¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢G'í∞¢6ˆÁ7B÷W76vW2“≤‚‚Ê6ÜB¬≤&ˆ∆S¢'W6W""¬6ˆÁFVÁC¢’“Á6∆ñ6RÇ”ì∞¢6ˆÁ7B6ˆÁFVÁB“vóB6∆¬á¬÷W76vW2ì∞¢6WD˜WBÜ6ˆÁFVÁBì∞¢6WD6ÜBÇÜ2í”‚≤‚‚Ê2¬≤&ˆ∆S¢'W6W""¬6ˆÁFVÁC¢“¬≤&ˆ∆S¢&76ó7FÁB"¬6ˆÁFVÁB’“ì∞¢6WD6≤Ç""ì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞¢&WGW&‚Ä¢ƒ÷ˆF¬FóF∆S◊∂6ˆÊfñrÁFóF∆W“vñFRˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒñ6ˆ‚Û‡¢«7„Á∂6ˆÊfñrÊÜñÁG”¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢∂6ˆÊfñrÊfñV∆G2Ê÷ÇÜbí”‚Ä¢ƒfñV∆B∂Wì◊∂bÊ∂Wó“∆&V√◊∂bÊ∆&V«“ÜñÁC◊∂bÊÜñÁG”‡¢∂bÁGóR””“'FWáF&V"ÚÄ¢«FWáF&Vf«VS◊∑f«5∂bÊ∂Wï◊“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÜbÊ∂Wí¬RÁF&vWBÁf«VRó“∆6VÜˆ∆FW#◊∂bÁ∆6VÜˆ∆FW'“Û‡¢í¢bÁGóR””“'6V∆V7B"ÚÄ¢«6V∆V7Bf«VS◊∑f«5∂bÊ∂Wï◊“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÜbÊ∂Wí¬RÁF&vWBÁf«VRó”‡¢∂bÊ˜FñˆÁ2Ê÷ÇÜÚí”‚Ä¢∆˜Fñˆ‚∂Wì◊∂˜”Á∂˜”¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢í¢Ä¢∆ñÁWBf«VS◊∑f«5∂bÊ∂Wï◊“ˆ‰6ÜÊvS◊≤ÜRí”‚6WBÜbÊ∂Wí¬RÁF&vWBÁf«VRó“∆6VÜˆ∆FW#◊∂bÁ∆6VÜˆ∆FW'“Û‡¢ó–¢¬ÙfñV∆C‡¢íó–¢¬ˆFóc‡¢∂W'"bbÄ¢∆Fób6∆74Ê÷S“&6≤÷W'&˜"#‡¢ƒ6ó&6∆T∆W'BÛ‡¢∂W''–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ˆ‰6∆ñ6≥◊∂ˆ‰6∆˜6W”‡¢fV6Ü ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚ñ6ˆ„◊∂'W7íbb˜WBÚ&Vg&W6Ñ7r¢7&∂∆W7“Fó6&∆VC◊∂'W7ó“ˆ‰6∆ñ6≥◊∑'VÁ”‡¢∂'W7íbb˜WBÚ$vW&ÊFÚ‚‚‚"¢˜WBÚ$vW&"FRÊ˜fÚ"¢6ˆÊfñrÊ7F–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢∂˜WBbbÄ¢∆Fób6∆74Ê÷S“'G&Á6∆FR÷˜WB#‡¢∆Fób6∆74Ê÷S“'G&Á6∆FR÷ÜVB#‡¢«7„Á∂6ˆÊfñrÊ˜WEFóF∆W”¬˜7„‡¢∆'WGFˆ‡¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ÊfñvF˜"Ê6∆ó&ˆ&CÚÁw&óFUFWáBÜ˜WBì∞¢6WEFˆ7BÇ$6˜ñFÚ"ì∞¢◊–¢‡¢ƒ6˜íÛ‡¢6˜ñ ¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'G&Á6∆FR÷&ˆGí#‡¢ƒ÷&∂F˜v‚FWáC◊∂˜WG“Û‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'Fˆˆ¬÷fˆ∆∆˜wW#‡¢∆ñÁW@¢f«VS◊∂6∑–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD6≤ÜRÁF&vWBÁf«VRó–¢ˆ‰∂WîF˜v„◊≤ÜRí”‚≤ñbÜRÊ∂Wí””“$VÁFW""í≤RÁ&WfVÁDFVfV«BÇì≤&VfñÊRÇì≤“◊–¢∆6VÜˆ∆FW#“%Fó&RV÷L;ßfñF˜R\:vV“ßW7FRÜWÇ„¢FVóÜR÷ó27W'FÚ¬◊VFRÚFˆ“‚‚‚í ¢Û‡¢ƒ'WGFˆ‚ñ6ˆ„◊∂'W7íÚ&Vg&W6Ñ7r¢6VÊG“Fó6&∆VC◊∂'W7í«¬6≤ÁG&ñ“Çó“ˆ‰6∆ñ6≥◊∑&VfñÊW”‡¢∂'W7íÚ"‚‚‚"¢$VÁfñ"'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'&W7V«B÷FW7FñÊFñˆÁ2#‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊¥fñ∆UFWáG–¢ˆ‰6∆ñ6≥◊≤Çí”‚6fT˜WGWBÇ&Fˆ7V÷VÁB"ó–¢‡¢6«f"Fˆ7V÷VÁF¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊¥∆ó7EFˆF˜–¢ˆ‰6∆ñ6≥◊≤Çí”‚6fT˜WGWBÇ'F6≤"ó–¢‡¢7&ñ"F&Vf¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚ñ6ˆ„◊µ6fW“ˆ‰6∆ñ6≥◊≤Çí”‚6fT˜WGWBÇ'&ˆ¶V7B"ó”‡¢6«f"&ˆ¶WF¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–†¶6ˆÁ7B&∆ÊµvFV◊∆FR“≤Ê÷S¢""¬6FVv˜'ì¢$6ˆÁFFÚ"¬&ˆGì¢""”∞†¢ÚÚ2"fW'&÷VÁF2ñÁFV∆ñvVÁFW2w'WF2V∆Úˆ&¶WFófÚFRVV“&ˆ7W&(	@¢ÚÚW7V∆Ü26FVv˜&ñ2FÚ÷VÁR∆FW&¬V“fW¢FRV÷&VFR∆ÊFR6'L;VW2‡¶6ˆÁ7B6÷'EFˆˆƒw&˜W2“∞¢∞¢∆&V√¢%fVÊF2R6∆ñVÁFW2"¿¢óFV◊3¢∞¢≤'6∆W2"¬%&˜FVó&ÚFRfVÊF2"¬G&VÊFñÊuW¬$&˜&FvV“¬ˆ&¶\:|;VW2Rfˆ∆∆˜r◊W&fV6Ü"÷ó2‚"¬&sR%“¿¢≤'7W˜'B"¬%&W7˜7F2FRFVÊFñ÷VÁFÚ"¬ÜVGÜˆÊW2¬$÷ˆFV∆˜26ˆ“V◊Fñ&&W7ˆÊFW"6∆ñVÁFW2‚"¬&sÇ%“¿¢≤&V6ˆ÷÷W&6R"¬$FW67&ú:|:6ÚFR&ˆGWFÚ"¬6Ü˜ñÊt&r¬$Ï;¶Ê6ñÚ˜Fñ÷ó¶FÚ&÷&∂WG∆6R˜R∆ˆ¶‚"¬&s%“¿¢≤'˜7B"¬$vW&F˜"FR˜7G2"¬÷VvÜˆÊR¬$∆VvVÊF26ˆ“Ü6áFw2&27V2&VFW26ˆ6ñó2‚"¬&s2%“¿¢“¿¢“¿¢∞¢∆&V√¢$FñÊÜVó&ÚRÏ;¶÷W&˜2"¿¢óFV◊3¢∞¢≤'&ñ6R"¬$6∆7V∆F˜&FR&\:vÚ"¬Fˆ∆∆%6ñv‚¬$FW67V'&Ú&\:vÚFRfVÊFñFV¬'Fó"F˜26WW27W7F˜2‚"¬&s"%“¿¢≤&FF˜2"¬$Ï:∆ó6RFRÏ;¶÷W&˜2ÑFF˜2í"¬fñ«FW"¬$6ˆ∆RfVÊF2RFW7W62RFW67V'&G,;VW2‚"¬&sí%“¿¢≤&6ˆ◊&2"¬$6ˆ◊&F˜"FR6˜F:|;VW2"¬&˜ÜW2¬$6ˆ◊&Rf˜&ÊV6VF˜&W2R6ñ&ÚVRÊVvˆ6ñ"‚"¬&s%“¿¢“¿¢“¿¢∞¢∆&V√¢$Fˆ7V÷VÁF˜2RFWáF˜2"¿¢óFV◊3¢∞¢≤&6ˆÁG&7B"¬$vW&F˜"FR6ˆÁG&FÚ"¬'&ñVf66T'W6ñÊW72¬$÷ñÁWFFR&W7F:|:6ÚFR6W'fú:v˜2&ˆÁF&&Wfó<:6Ú‚"¬&sB%“¿¢≤'G&Á6∆FR"¬$gVÊ6ñˆÏ:&ñÚ&ñÃ:÷ÊwVR"¬∆ÊwVvW2¬%G&GW¶FWáF˜2¬R÷÷ñ«2R&˜˜7F2&"ñFñˆ÷26ˆ“î‚"¬&s%“¿¢“¿¢“¿¢∞¢∆&V√¢$WVóRR˜W&:|:6Ú"¿¢óFV◊3¢∞¢≤'&Ç"¬%fvRVÁG&Wfó7FÖ$Çí"¬W6W$6ˆr¬$FW67&ú:|:6ÚFRfvRW&wVÁF2FRVÁG&Wfó7F‚"¬&sb%“¿¢≤&˜2"¬%76Ú76ÚÑ˜W&:|;VW2í"¬v˜&∂f∆˜r¬%&ˆ6VFñ÷VÁFÚG,:6Ú6ˆ“6ÜV6∂∆ó7B&WVóR‚"¬&sr%“¿¢≤'&˜WFR"¬%&˜FVó&ó¶F˜"FRVÁG&Vv2"¬&˜WFR¬$÷ˆÁFR&˜F26ˆ“l:&ñ2&F2R'&ÊÚvˆˆv∆R÷2‚"¬&s%“¿¢“¿¢“¿•”∞†¶gVÊ7Fñˆ‚Fˆˆ«4áV"á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B“í∞¢6ˆÁ7B∑6÷'B¬6WE6÷'E““W6U7FFRÇ""ì∞¢6ˆÁ7B∑6V&6Ç¬6WE6V&6Ö““W6U7FFRÇ""í¿¢∂6FVv˜'í¬6WD6FVv˜'ï““W6U7FFRÇ%FˆF2"í¿¢∂V÷ñƒ˜V‚¬6WDV÷ñƒ˜VÂ““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑vf˜&“¬6WEvf˜&’““W6U7FFRÜ&∆ÊµvFV◊∆FRì∞¢6ˆÁ7B∑vVFóFñÊr¬6WEvVFóFñÊu““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7BvFV◊∆FW2–¢F"ÁvFV◊∆FW2bbF"ÁvFV◊∆FW2Ê∆VÊwFÄ¢ÚF"ÁvFV◊∆FW0¢¢DTdT≈EıtıDT’ƒDU3∞¢6ˆÁ7B6fUvFV◊∆FR“ÜRí”‚∞¢RÁ&WfVÁDFVfV«BÇì∞¢ñbÇvf˜&“ÊÊ÷RÁG&ñ“Çí«¬vf˜&“Ê&ˆGíÁG&ñ“Çíí&WGW&„∞¢6ˆÁ7B∆ó7B“vFV◊∆FW3∞¢6ˆÁ7BÊWáB“vVFóFñÊp¢Ú∆ó7BÊ÷ÇáBí”‡¢BÊñB””“vVFóFñÊrÚ≤‚‚ÁB¬‚‚Ávf˜&“¬ñC¢vVFóFñÊr“¢B¿¢ê¢¢≤‚‚Ê∆ó7B¬≤‚‚Ávf˜&“¬ñC¢VñBÇí’”∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬vFV◊∆FW3¢ÊWáB“íì∞¢6WEvf˜&“Ü&∆ÊµvFV◊∆FRì∞¢6WEvVFóFñÊrÜÁV∆¬ì∞¢6WEFˆ7BávVFóFñÊrÚ$÷ˆFV∆ÚGV∆ó¶FÚ"¢$÷ˆFV∆Ú7&ñFÚ"ì∞¢”∞¢6ˆÁ7BVFóEvFV◊∆FR“áBí”‚∞¢6WEvVFóFñÊráBÊñBì∞¢6WEvf˜&“á≤Ê÷S¢BÊÊ÷R¬6FVv˜'ì¢BÊ6FVv˜'í¬&ˆGì¢BÊ&ˆGí“ì∞¢”∞¢6ˆÁ7BFV∆WFUvFV◊∆FR“ÜñBí”‚∞¢ñbÇ6ˆÊfó&“Ç$WÜ6«Vó"W7FR÷ˆFV∆ÛÚ"íí&WGW&„∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬vFV◊∆FW3¢vFV◊∆FW2Êfñ«FW"ÇáBí”‚BÊñB”“ñBí“íì∞¢ñbávVFóFñÊr””“ñBí∞¢6WEvVFóFñÊrÜÁV∆¬ì∞¢6WEvf˜&“Ü&∆ÊµvFV◊∆FRì∞¢–¢6WEFˆ7BÇ$÷ˆFV∆ÚWÜ6«\:÷FÚ"ì∞¢”∞¢6ˆÁ7B&W7F˜&UvFV◊∆FW2“Çí”‚∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢vFV◊∆FW3¢DTdT≈EıtıDT’ƒDU2Ê÷ÇáBí”‚á≤‚‚ÁB“íí¿¢“íì∞¢6WEFˆ7BÇ$÷ˆFV∆˜2G,:6Ú&W7FW&F˜2"ì∞¢”∞¢6ˆÁ7B«VvvVB“F"Á«VvvVEFˆˆ«2«¬µ”∞¢6ˆÁ7BFˆvv∆U«Vr“ÜñBí”‚∞¢6ˆÁ7Bˆ‚“«VvvVBÊñÊ6«VFW2ÜñBì∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢«VvvVEFˆˆ«3¢ˆ‡¢ÚÜBÁ«VvvVEFˆˆ«2«¬µ“íÊfñ«FW"ÇáÇí”‚Ç”“ñBê¢¢≤‚‚‚ÜBÁ«VvvVEFˆˆ«2«¬µ“í¬ñE“¿¢“íì∞¢6WEFˆ7BÄ¢ˆ‚Ú$fW'&÷VÁFFW66ˆÊV7FF"¢$fW'&÷VÁF«VvFÊÚ6WRñÊV¬"¿¢ì∞¢”∞¢6ˆÁ7B6FVv˜&ñW2“≤%FˆF2"¬‚‚ÊÊWr6WBáFˆˆƒ6F∆ˆrÊ÷ÇáÇí”‚ÇÊ6FVv˜'ííï”∞¢6ˆÁ7Bfñ«FW&VB“Fˆˆƒ6F∆ˆrÊfñ«FW"Ä¢áÇí”‡¢Ü6FVv˜'í””“%FˆF2"«¬ÇÊ6FVv˜'í””“6FVv˜'ííb`¢G∑ÇÊÊ÷W“G∑ÇÊFW67&óFñˆÁ“G∑ÇÊ∂Wóv˜&G7÷ ¢ÁFÙ∆˜vW$66RÇê¢ÊñÊ6«VFW2á6V&6ÇÁFÙ∆˜vW$66RÇíí¿¢ì∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$4TÂE$¬DRdU%$‘TÂD2 ¢FóF∆S“%GVFÚ6ˆÊV7FFÚÚG&&∆ÜÚVR&V6ó66ˆÁFV6W" ¢FWáC“$VÊ6ˆÁG&RfW'&÷VÁF6W'F¬'&Ú6W'fú:vÚˆfñ6ñ¬R6ˆÁFñÁVRWÜV7\:|:6Ú6V“fñ6"&W6ÚV“V÷FV∆6V“6:÷F‚ ¢7Fñˆ„◊∞¢ƒ'WGFˆ‚ñ6ˆ„◊¥÷ñ«“ˆ‰6∆ñ6≥◊≤Çí”‚6WDV÷ñƒ˜V‚áG'VRó”‡¢W67&WfW"R÷÷ñ¿¢¬Ù'WGFˆ„‡¢–¢‡¢«6V7Fñˆ‚6∆74Ê÷S“'6÷'B◊Fˆˆ«2#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰dU%$‘TÂD2îÂDTƒîtTÂDU2+ru,8Dï3¬˜7„‡¢∆É#‰gVÏ:|;VW2VRG&&∆Ü“˜"FVÁG&ÚFÚ¬ˆÉ#‡¢¬ˆFóc‡¢¬ˆFóc‡¢∑6÷'EFˆˆƒw&˜W2Ê÷ÇÜw&˜Wí”‚Ä¢∆Fób6∆74Ê÷S“'6÷'B÷w&˜W"∂Wì◊∂w&˜WÊ∆&V«”‡¢«6÷∆¬6∆74Ê÷S“'6÷'B÷w&˜W÷∆&V¬#Á∂w&˜WÊ∆&V«”¬˜6÷∆√‡¢∆Fób6∆74Ê÷S“'6÷'B÷w&ñB#‡¢∂w&˜WÊóFV◊2Ê÷ÇÖ∂ñB¬Ê÷R¬ñ6ˆ‚¬FW67&óFñˆ‚¬FˆÊU“í”‚Ä¢∆'WGFˆ‡¢6∆74Ê÷S“'6÷'B÷6&B ¢∂Wì◊∂ñG–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WE6÷'BÜñBó–¢‡¢«7‚6∆74Ê÷S◊∂6÷'B÷ñ6ˆ‚G∑FˆÊW÷”‡¢ƒñ6ˆ‚Û‡¢¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÁ∂Ê÷W”¬˜7G&ˆÊs‡¢«6÷∆√Á∂FW67&óFñˆÁ”¬˜6÷∆√‡¢¬ˆFóc‡¢ƒ'&˜uW&ñváBÛ‡¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢íó–¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'ÊV¬v◊FV◊∆FW2"ñC“'v◊FV◊∆FW2#‡¢∆Fób6∆74Ê÷S“'ÊV¬÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#ÂtÑE4¬˜7„‡¢∆É#‰÷ˆFV∆˜2FR÷VÁ6vV”¬ˆÉ#‡¢¬ˆFóc‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µ&˜FFT67w–¢ˆ‰6∆ñ6≥◊∑&W7F˜&UvFV◊∆FW7–¢‡¢&W7FW&"G,:6¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢«6∆74Ê÷S“&F2÷ñÁG&Ú#‡¢7&ñR÷VÁ6vVÁ2&WWFñ∆ó¨:fVó26ˆ“f&ú:fVó2VÁG&R6ÜfW2GW∆2‚¢VÁfñ"V“vÜG4'Fó"FRV“∆VB¬6ˆÁFFÚ¬VFñFÚ˜P¢vVÊF÷VÁFÚ¬Ú&VVÊ6ÜR2f&ú:fVó2WFˆ÷Fñ6÷VÁFRRfˆ<:¢<;0¢&Wfó6ÁFW2FR÷ÊF"‡¢¬˜‡¢∆f˜&“6∆74Ê÷S“'v◊FV◊∆FR÷f˜&“"ˆÂ7V&÷óC◊∑6fUvFV◊∆FW”‡¢ƒfñV∆B∆&V√“$Êˆ÷RFÚ÷ˆFV∆Ú#‡¢∆ñÁW@¢f«VS◊∑vf˜&“ÊÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEvf˜&“á≤‚‚Ávf˜&“¬Ê÷S¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“$WÇ„¢6ˆÊfó&÷:|:6ÚFRVFñFÚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$6FVv˜&ñ#‡¢«6V∆V7@¢f«VS◊∑vf˜&“Ê6FVv˜'ó–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WEvf˜&“á≤‚‚Ávf˜&“¬6FVv˜'ì¢RÁF&vWBÁf«VR“ê¢–¢‡¢µtıDT’ƒDUÙ4DTtı$îU2Ê÷ÇÜ2í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂7”Á∂7”¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“'v◊FV◊∆FR÷&ˆGí#‡¢ƒfñV∆B∆&V√“$÷VÁ6vV“#‡¢«FWáF&V¢&˜w3◊≥7–¢f«VS◊∑vf˜&“Ê&ˆGó–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEvf˜&“á≤‚‚Ávf˜&“¬&ˆGì¢RÁF&vWBÁf«VR“ó–¢∆6VÜˆ∆FW#“$ˆÃ:∑∂Êˆ÷W◊“¬GVFÚ&V”ÚVí:íF∑∂ÊVvˆ6ñ˜◊“‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢¬ˆFóc‡¢«6∆74Ê÷S“'v◊FV◊∆FR◊f'2#‡¢f&ú:fVó2Fó7ˆÏ:◊fVó3¢∆6ˆFSÁ≤'∑∂Êˆ÷W◊“'”¬ˆ6ˆFSÁ≤"'–¢∆6ˆFSÁ≤'∑∂ÊVvˆ6ñ˜◊“'”¬ˆ6ˆFS‚∆6ˆFSÁ≤'∑∑f∆˜'◊“'”¬ˆ6ˆFSÁ≤"'–¢∆6ˆFSÁ≤'∑∂óFVÁ7◊“'”¬ˆ6ˆFS‚∆6ˆFSÁ≤'∑∑7FGW7◊“'”¬ˆ6ˆFSÁ≤"'–¢∆6ˆFSÁ≤'∑∑6W'fñ6˜◊“'”¬ˆ6ˆFS‚∆6ˆFSÁ≤'∑∂FF◊“'”¬ˆ6ˆFSÁ≤"'–¢∆6ˆFSÁ≤'∑∂Ü˜&◊“'”¬ˆ6ˆFS‚∆6ˆFSÁ≤'∑∂FW67&ñ6˜◊“'”¬ˆ6ˆFS‡¢¬˜‡¢∆Fób6∆74Ê÷S“'v◊FV◊∆FR÷&ˆGí#‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2#‡¢∑vVFóFñÊrbbÄ¢ƒ'WGFˆ‡¢GóS“&'WGFˆ‚ ¢f&ñÁC“&vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WEvVFóFñÊrÜÁV∆¬ì∞¢6WEvf˜&“Ü&∆ÊµvFV◊∆FRì∞¢◊–¢‡¢6Ê6V∆"VFú:|:6¢¬Ù'WGFˆ„‡¢ó–¢ƒ'WGFˆ‡¢GóS“'7V&÷óB ¢ñ6ˆ„◊∑vVFóFñÊrÚ6fR¢«W7–¢Fó6&∆VC◊≤vf˜&“ÊÊ÷RÁG&ñ“Çí«¬vf˜&“Ê&ˆGíÁG&ñ“Çó–¢‡¢∑vVFóFñÊrÚ%6«f"÷ˆFV∆Ú"¢$Fñ6ñˆÊ"÷ˆFV∆Ú'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬ˆf˜&”‡¢∆Fób6∆74Ê÷S“'v◊FV◊∆FR÷∆ó7B#‡¢∑vFV◊∆FW2Ê÷ÇáBí”‚Ä¢∆Fób6∆74Ê÷S“'v◊FV◊∆FR÷óFV“"∂Wì◊∑BÊñG”‡¢∆Fóc‡¢«7‚6∆74Ê÷S“'Fr#Á∑BÊ6FVv˜'ó”¬˜7„‡¢«7G&ˆÊsÁ∑BÊÊ÷W”¬˜7G&ˆÊs‡¢«Á∑BÊ&ˆGó”¬˜‡¢¬ˆFóc‡¢«7‚6∆74Ê÷S“'F6≤÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢&ñ÷∆&V√◊∂VFóF"÷ˆFV∆ÚG∑BÊÊ÷W÷–¢FóF∆S“$VFóF" ¢ˆ‰6∆ñ6≥◊≤Çí”‚VFóEvFV◊∆FRáBó–¢‡¢ƒVFóC2Û‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FÊvW" ¢&ñ÷∆&V√◊∂WÜ6«Vó"÷ˆFV∆ÚG∑BÊÊ÷W÷–¢FóF∆S“$WÜ6«Vó" ¢ˆ‰6∆ñ6≥◊≤Çí”‚FV∆WFUvFV◊∆FRáBÊñBó–¢‡¢≈G&6É"Û‡¢¬ˆ'WGFˆ„‡¢¬˜7„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢∆Fób6∆74Ê÷S“'Fˆˆ¬÷ÜW&Ú#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r∆ñváB#Â$TDï$T4îÙ‰Dı"îÂDTƒîtTÂDS¬˜7„‡¢∆É#‡¢Ú6WRgVÊ6ñˆÏ:&ñÚf¢ÚVRˆFRVí‡¢∆'"Û‡¢VÊFÚÏ:6ÚˆFR¬∆Wffˆ<:¢Ú«Vv"6W'FÚ‡¢¬ˆÉ#‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6V&6ÇFˆˆ¬◊6V&6Ç#‡¢≈6V&6ÇÛ‡¢∆ñÁW@¢f«VS◊∑6V&6á–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE6V&6ÇÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$WÇ„¢V÷óFó"Ê˜Ffó66¬¬VÁfñ"R÷÷ñ¬¬7&ñ"FW6ñv‚‚‚‚ ¢Û‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&6FVv˜'í◊F'2#‡¢∂6FVv˜&ñW2Ê÷ÇáÇí”‚Ä¢∆'WGFˆ‡¢6∆74Ê÷S◊∂6FVv˜'í””“ÇÚ&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD6FVv˜'íáÇó–¢∂Wì◊∑á–¢‡¢∑á–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'Fˆˆ«2÷w&ñB#‡¢∂fñ«FW&VBÊ÷ÇáFˆˆ¬í”‚∞¢6ˆÁ7Bˆ‚“«VvvVBÊñÊ6«VFW2áFˆˆ¬ÊñBì∞¢&WGW&‚Ä¢∆'Fñ6∆R∂Wì◊∑Fˆˆ¬ÊñG”‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂ˆ‚Ú'«Vr◊Fˆvv∆Rˆ‚"¢'«Vr◊Fˆvv∆R'–¢FóF∆S◊∂ˆ‚Ú$FW66ˆÊV7F""¢%«Vv"ÊÚ÷WRñÊV¬'–¢ˆ‰6∆ñ6≥◊≤Çí”‚Fˆvv∆U«VráFˆˆ¬ÊñBó–¢‡¢≈«VrÛ‡¢¬ˆ'WGFˆ„‡¢«7‚6∆74Ê÷S“'Fˆˆ¬÷ñ6ˆ‚#‡¢ƒGñÊ÷ñ4ñ6ˆ‚ñ6ˆ„◊∑Fˆˆ¬Êñ6ˆÁ“Û‡¢¬˜7„‡¢∆Fóc‡¢«7‚6∆74Ê÷S“'Fr#Á∑Fˆˆ¬Ê6FVv˜'ó”¬˜7„‡¢∆É3Á∑Fˆˆ¬ÊÊ÷W”¬ˆÉ3‡¢«Á∑Fˆˆ¬ÊFW67&óFñˆÁ”¬˜‡¢«6÷∆√Á∑Fˆˆƒ&FvT∆&V¬áFˆˆ¬ó”¬˜6÷∆√‡¢¬ˆFóc‡¢∆á&Vc◊∑Fˆˆ¬ÁW&«“F&vWC“%ˆ&∆Ê≤"&V√“&Ê˜&VfW'&W"#‡¢'&ó"fW'&÷VÁFƒWáFW&Êƒ∆ñÊ≤Û‡¢¬ˆ‡¢¬ˆ'Fñ6∆S‡¢ì∞¢“ó–¢¬ˆFóc‡¢∂fñ«FW&VBÊ∆VÊwFÇ””“bbÄ¢ƒV◊Gê¢ñ6ˆ„◊µ6V&6á–¢FóF∆S“$ÊVÊáV÷fW'&÷VÁFVÊ6ˆÁG&F ¢FWáC“%FVÁFR'W66"V∆Úˆ&¶WFófÚ¬6ˆ÷ÚÊ˜Ffó66¬¬5$“¬FW6ñv‚˜RvVÊF‚ ¢Û‡¢ó–¢«6V7Fñˆ‚6∆74Ê÷S“&Êb÷wVñFR#‡¢«7‚6∆74Ê÷S“'Fˆˆ¬÷ñ6ˆ‚#‡¢≈&V6VóEFWáBÛ‡¢¬˜7„‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰DƒÑÚdï44√¬˜7„‡¢∆É#ÂV¬Ê˜Ffó66¬fˆ<:¢&V6ó6Û¬ˆÉ#‡¢«‡¢«7G&ˆÊsÂ&W7F:|:6ÚFR6W'fú:v˜3£¬˜7G&ˆÊs‚W6R‰e2÷RÊ6ñˆÊ¬Á≤"'–¢«7G&ˆÊsÂfVÊFFR&ˆGWF˜3£¬˜7G&ˆÊs‚W6R‰b÷R¬6ˆ÷ÚÚV÷ó76˜ ¢w&GVóFÚFÚ6V'&R‚ˆ'&ñv:|;VW2f&ñ“6ˆÊf˜&÷RFófñFFR¬◊VÊñ<:◊ñ¢R&Vvñ÷S≤f∆ñFRL;ßfñF2G&ñ'WL:&ñ26ˆ“V“6ˆÁFF˜"‡¢¬˜‡¢¬ˆFóc‡¢∆Fóc‡¢∆¢á&Vc“&áGG3¢Ú˜wwrÊv˜bÊ'"˜B÷'"˜6W'fñ6˜2ˆV÷óFó"÷Ê˜F÷fó66¬÷FR◊6W'fñ6Ú÷V∆WG&ˆÊñ6 ¢F&vWC“%ˆ&∆Ê≤ ¢&V√“&Ê˜&VfW'&W" ¢‡¢V÷óFó"‰e2÷P¢¬ˆ‡¢∆¢á&Vc“&áGG3¢ÚˆV÷ó76˜&ÊfRÁ6V'&RÊ6ˆ“Ê'"Ú ¢F&vWC“%ˆ&∆Ê≤ ¢&V√“&Ê˜&VfW'&W" ¢‡¢V÷óFó"‰b÷P¢¬ˆ‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢∂V÷ñƒ˜V‚bbÄ¢ƒV÷ñƒ6ˆ◊˜6W ¢ˆ‰6∆˜6S◊≤Çí”‚6WDV÷ñƒ˜V‚Üf«6Ró–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ó–¢∑6÷'B””“'G&Á6∆FR"bbÄ¢≈G&Á6∆F˜$÷ˆF¬ˆ‰6∆˜6S◊≤Çí”‚6WE6÷'BÇ""ó“6WEFˆ7C◊∑6WEFˆ7G“Û‡¢ó–¢∑6÷'B””“'&˜WFR"bbÄ¢≈&˜WFW$÷ˆF¬ˆ‰6∆˜6S◊≤Çí”‚6WE6÷'BÇ""ó“6WEFˆ7C◊∑6WEFˆ7G“Û‡¢ó–¢∂ïFˆˆ«5∑6÷'E“bbÄ¢ƒïFˆˆƒ÷ˆF¿¢6ˆÊfñs◊∂ïFˆˆ«5∑6÷'E◊–¢F#◊∂F'–¢ˆ‰6∆˜6S◊≤Çí”‚6WE6÷'BÇ""ó–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢Û‡¢ó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶gVÊ7Fñˆ‚7&VFófU7GVFñÚá≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B“í∞¢6ˆÁ7B∑GóR¬6WEGóU““W6U7FFRÇ&∆ˆvÚ"í¿¢∑&ˆ◊B¬6WE&ˆ◊E““W6U7FFRÇ""í¿¢∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rí¿¢∂W'&˜"¬6WDW'&˜%““W6U7FFRÇ""í¿¢∑&ˆw&W72¬6WE&ˆw&W75““W6U7FFRÉí¿¢∑fñFVÙVÊ&∆VB¬6WEfñFVÙVÊ&∆VE““W6U7FFRÜf«6Rì∞¢W6TVffV7BÇÇí”‚∞¢fWF6ÇÇ"ˆíˆ6ˆÊfñr"ê¢ÁFÜV‚Çá&W7ˆÁ6Rí”‚&W7ˆÁ6RÊß6ˆ‚Çíê¢ÁFÜV‚ÇÜ6ˆÊfñrí”‚6WEfñFVÙVÊ&∆VBÇ6ˆÊfñrÁfñFVÙVÊ&∆VBíê¢Ê6F6ÇÇÇí”‚6WEfñFVÙVÊ&∆VBÜf«6Ríì∞¢“¬µ“ì∞¢6ˆÁ7BóFV◊2“W6T÷V÷ÚÄ¢Çí”‡¢ÜF"Ê÷VFñ«¬µ“íÊfñ«FW"Ä¢áÇí”‚'W6ñÊW72«¬ÇÊ'W6ñÊW74ñB””“'W6ñÊW72ÊñB¿¢í¿¢∂'W6ñÊW72¬F"Ê÷VFñ“¿¢ì∞¢W6TVffV7BÇÇí”‚∞¢∆WB7FófR“G'VS∞¢6ˆÁ7B6fVEfñFV˜2“óFV◊2Êfñ«FW"Ä¢ÜóFV“í”‚óFV“ÁGóR””“'fñFVÚ"bbóFV“Á&WVW7DñB¿¢ì∞¢ñbÇ6fVEfñFV˜2Ê∆VÊwFÇí&WGW&‚Çí”‚∑”∞¢&ˆ÷ó6RÊ∆¬Ä¢6fVEfñFV˜2Ê÷Ü7ñÊ2ÜóFV“í”‚∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÄ¢ˆíˆ÷VFñ˜&WVW7EˆñC“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜóFV“Á&WVW7DñBó÷¿¢≤ÜVFW'3¢WFÑÜVFW'2Çí“¿¢ì∞¢6ˆÁ7B7FGW2“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢&WGW&‚&W7ˆÁ6RÊˆ≤Ú≤ñC¢óFV“ÊñB¬‚‚Á7FGW2“¢ÁV∆√∞¢“í¿¢ê¢ÁFÜV‚Çá7FGW6W2í”‚∞¢ñbÇ7FófRí&WGW&„∞¢6ˆÁ7Bfñ∆&∆R“7FGW6W2Êfñ«FW"Ñ&ˆˆ∆V‚ì∞¢ñbÇfñ∆&∆RÊ∆VÊwFÇí&WGW&„∞¢WFFRÇÜ7W'&VÁBí”‚á∞¢‚‚Ê7W'&VÁB¿¢÷VFñ¢Ü7W'&VÁBÊ÷VFñ«¬µ“íÊ÷ÇÜóFV“í”‚∞¢6ˆÁ7B7FGW2“fñ∆&∆RÊfñÊBÇÜVÁG'íí”‚VÁG'íÊñB””“óFV“ÊñBì∞¢ñbÇ7FGW2í&WGW&‚óFV”∞¢&WGW&‚∞¢‚‚ÊóFV“¿¢7FGW3¢7FGW2Á7FGW2«¬óFV“Á7FGW2¿¢W&√¢7FGW2ÁW&¬«¬óFV“ÁW&¬¿¢GW&Fñˆ„¢7FGW2ÊGW&Fñˆ‚«¬óFV“ÊGW&Fñˆ‚¿¢”∞¢“í¿¢“íì∞¢“ê¢Ê6F6ÇÇÇí”‚∑“ì∞¢&WGW&‚Çí”‚∞¢7FófR“f«6S∞¢”∞¢ÚÚ6ˆÁ7V«FÊ˜f÷VÁFR6V◊&RVRÚW7\:&ñÚfˆ«FÚW7L;¶FñÚ˜RG&ˆ6FRÊV|;66ñÚ‡¢“¬∂'W6ñÊW73ÚÊñB¬óFV◊2¬WFFU“ì∞¢6ˆÁ7BvVÊW&FR“7ñÊ2Çí”‚∞¢ñbá&ˆ◊BÁG&ñ“ÇíÊ∆VÊwFÇ¬R«¬'W7í«¬áGóR””“'fñFVÚ"bbfñFVÙVÊ&∆VBíê¢&WGW&„∞¢6WD'W7íáG'VRì∞¢6WDW'&˜"Ç""ì∞¢6WE&ˆw&W72ÉRì∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆ÷VFñ"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢GóR¿¢&ˆ◊C¢&ˆ◊BÁG&ñ“Çí¿¢V∆óGì¢GóR””“'fñFVÚ"Ú&GfÊ6VB"¢VÊFVfñÊVB¿¢“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚Çì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬vW&"Ú÷FW&ñ¬‚"ì∞¢6ˆÁ7BóFV““∞¢ñC¢VñBÇí¿¢GóR¿¢&ˆ◊C¢&ˆ◊BÁG&ñ“Çí¿¢7FGW3¢FFÁ7FGW2¿¢W&√¢FFÁW&¬«¬ÁV∆¬¿¢&WVW7DñC¢FFÁ&WVW7DñB«¬ÁV∆¬¿¢g&VUFñW#¢FFÊg&VUFñW"¿¢'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB«¬ÁV∆¬¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢fó6ñ&ñ∆óGì¢'&ófFÚ"¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢”∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬÷VFñ¢∂óFV“¬‚‚‚ÜBÊ÷VFñ«¬µ“ï““íì∞¢ñbáGóR””“'fñFVÚ"bbFFÁ&WVW7DñBí∞¢∆WBfñÊó6ÜVB“f«6S∞¢f˜"Ü∆WBí“≤í¬É≤í≤≤í∞¢vóBÊWr&ˆ÷ó6RÇá&W6ˆ«fRí”‚6WEFñ÷V˜WBá&W6ˆ«fR¬Síì∞¢6ˆÁ7B6ÜV6≤“vóBfWF6ÇÄ¢ˆíˆ÷VFñ˜&WVW7EˆñC“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜFFÁ&WVW7DñBó÷¿¢≤ÜVFW'3¢WFÑÜVFW'2Çí“¿¢í¿¢7FGW2“vóB6ÜV6≤Êß6ˆ‚Çì∞¢ñbÇ6ÜV6≤Êˆ≤ê¢Fá&˜rÊWrW'&˜"Ä¢7FGW2ÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6ˆÁ7V«F"vW&:|:6Ú‚"¿¢ì∞¢6WE&ˆw&W72á7FGW2Á&ˆw&W72«¬÷FÇÊ÷ñ‚Éìb¬Ç≤÷FÇÁ&˜VÊBÜí¢„Rííì∞¢ñbá7FGW2Á7FGW2””“&FˆÊR"bb7FGW2ÁW&¬í∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢÷VFñ¢ÜBÊ÷VFñ«¬µ“íÊ÷ÇáÇí”‡¢ÇÊñB””“óFV“Êñ@¢Ú∞¢‚‚ÁÇ¿¢7FGW3¢&FˆÊR"¿¢W&√¢7FGW2ÁW&¬¿¢GW&Fñˆ„¢7FGW2ÊGW&Fñˆ‚¿¢–¢¢Ç¿¢í¿¢“íì∞¢6WEFˆ7BÇ%l:÷FVÚvVÊW&FófÚ6ˆÊ6«\:÷FÚ"ì∞¢fñÊó6ÜVB“G'VS∞¢'&V≥∞¢–¢ñbá7FGW2Á7FGW2””“&fñ∆VB"«¬7FGW2Á7FGW2””“&Wáó&VB"ê¢Fá&˜rÊWrW'&˜"Ä¢7FGW2ÊW'&˜"«¬$vW&:|:6ÚFÚl:÷FVÚÏ:6Úfˆí6ˆÊ6«\:÷F‚"¿¢ì∞¢–¢ñbÇfñÊó6ÜVBê¢Fá&˜rÊWrW'&˜"Ä¢$vW&:|:6Ú6ˆÁFñÁVÊÚ6W'fñF˜"‚V∆W&÷ÊV6W,:Êfñ∆≤FVÁFR6ˆÁ7V«F"Ê˜f÷VÁFRV“∆wVÁ2÷ñÁWF˜2‚"¿¢ì∞¢“V«6P¢6WEFˆ7BÄ¢FFÊg&VUFñW ¢ÚGóR””“&∆ˆvÚ ¢Ú$∆ˆvÚ7&ñFÚÊñÊg&W7G'WGW&w&GVóF ¢¢$ñ÷vV“7&ñFÊñÊg&W7G'WGW&w&GVóF ¢¢GóR””“&∆ˆvÚ ¢Ú$6ˆÊ6VóFÚFR∆ˆvÚ7&ñFÚ ¢¢$ñ÷vV“7&ñF"¿¢ì∞¢6WE&ˆ◊BÇ""ì∞¢“6F6ÇÜW'"í∞¢6WDW'&˜"ÜW'"Ê÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢6WE&ˆw&W72Éì∞¢–¢”∞¢6ˆÁ7B∆&V«2“∞¢∆ˆvÛ¢∞¢FóF∆S¢$7&ñF˜"FR∆ˆv˜2"¿¢FWáC¢$FW67&WfÊˆ÷R¬6Vv÷VÁFÚ¬W'6ˆÊ∆ñFFR¬6˜&W2R<:÷÷&ˆ∆˜2VRFWfV“6W"WfóFF˜2‚"¿¢∆6VÜˆ∆FW#†¢$WÇ„¢∆ˆvÚ&V÷6ˆÊfVóF&ñ'FW6Ê¬6Ü÷FFˆ6RÊ˜'FR¬V∆VvÁFR¬6ˆ∆ÜVF˜&¬FW'&6˜FR7&V÷R‚‚‚"¿¢“¿¢ñ÷vS¢∞¢FóF∆S¢$vW&F˜"FRñ÷vVÁ2"¿¢FWáC¢$7&ñRñ÷vVÁ2&6◊ÊÜ2¬6óFW2¬&ˆGWF˜2R&VFW26ˆ6ñó2‚"¿¢∆6VÜˆ∆FW#†¢$WÇ„¢f˜Fˆw&fñVFóF˜&ñ¬FRV÷÷W66ˆ“&ˆ∆˜2'FW6Êó2¬«W¢ÊGW&¬7VfR‚‚‚"¿¢“¿¢fñFVÛ¢∞¢FóF∆S¢$vW&F˜"FRl:÷FV˜2"¿¢FWáC¢$vW&RV“l:÷FVÚ7W'FÚFR6Vó26VwVÊF˜2'Fó"FRV÷FW67&ú:|:6Ú‚"¿¢∆6VÜˆ∆FW#†¢$WÇ„¢<:&÷W&6R&˜Üñ÷∆VÁF÷VÁFRFRV÷fóG&ñÊRFR6ˆÊfVóF&ñÚ÷ÊÜV6W"‚‚‚"¿¢“¿¢’∑GóU”∞¢6ˆÁ7B6ÜÊvUGóR“ÜÊWáBí”‚∞¢6WEGóRÜÊWáBì∞¢6WDW'&˜"Ç""ì∞¢”∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$U5L9§DîÚ5$îDïdÚ ¢FóF∆S“$7&ñR÷FW&ñó2fó7Vó26ˆ“î ¢FWáC“$∆ˆv˜2Rñ÷vVÁ2W6“ñÊg&W7G'WGW&FRîFó7ˆÏ:◊fV¬‚l:÷FVÚ,;7&ñÚ<;2:í∆ñ&W&FÚVÊFÚV“6W'fñF˜"uR:í6ˆÊV7FFÚ‚ ¢‡¢∆Fób6∆74Ê÷S“'7GVFñÚ◊F'2#‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑GóR””“&∆ˆvÚ"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6ÜÊvUGóRÇ&∆ˆvÚ"ó–¢‡¢≈∆WGFRÛ‡¢∆ˆv˜0¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑GóR””“&ñ÷vR"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6ÜÊvUGóRÇ&ñ÷vR"ó–¢‡¢ƒñ÷vTñ6ˆ‚Û‡¢ñ÷vVÁ0¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑GóR””“'fñFVÚ"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6ÜÊvUGóRÇ'fñFVÚ"ó–¢‡¢≈fñFVÚÛ‡¢l:÷FV˜0¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢«6V7Fñˆ‚6∆74Ê÷S“'7GVFñÚ÷7&VF˜"#‡¢∆Fób6∆74Ê÷S“'7GVFñÚ÷6˜í#‡¢«7‚6∆74Ê÷S“'7&≤÷F˜B#‡¢≈vÊE7&∂∆W2Û‡¢¬˜7„‡¢∆É#Á∂∆&V«2ÁFóF∆W”¬ˆÉ#‡¢«Á∂∆&V«2ÁFWáG”¬˜‡¢∆Fób6∆74Ê÷S“'7GVFñÚ◊ˆñÁG2#‡¢«7„‡¢ƒ6ÜV6¥6ó&6∆S"Û‡¢&ˆ◊B&ñ÷˜&FÚWFˆ÷Fñ6÷VÁFP¢¬˜7„‡¢«7„‡¢ƒ6ÜV6¥6ó&6∆S"Û‡¢∑GóR””“'fñFVÚ ¢ÚfñFVÙVÊ&∆V@¢Ú$vW&:|:6ÚFRl:÷FVÚFó7ˆÏ:◊fV¬ ¢¢$«FW&ÊFófw&GVóFWáFW&ÊFó7ˆÏ:◊fV¬ ¢¢$vW&:|:6Úfó7V¬w&GVóFVÊFÚFó7ˆÏ:◊fV¬'–¢¬˜7„‡¢«7„‡¢≈6ÜñV∆D6ÜV6≤Û‡¢6V“÷&62˜RFWˆñ÷VÁF˜2ñÁfVÁFF˜0¢¬˜7„‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'7GVFñÚ÷f˜&“#‡¢ƒfñV∆B∆&V√“$FW67&WfÚVRFW6V¶7&ñ"#‡¢«FWáF&V¢f«VS◊∑&ˆ◊G–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE&ˆ◊BÜRÁF&vWBÁf«VRÁ6∆ñ6RÉ¬3íó–¢∆6VÜˆ∆FW#◊∂∆&V«2Á∆6VÜˆ∆FW'–¢Û‡¢¬ÙfñV∆C‡¢∑GóR””“'fñFVÚ"bbÄ¢√‡¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢≈fñFVÚÛ‡¢«7„‡¢∑fñFVÙVÊ&∆V@¢Ú$vW&:|:6Ú6ˆÁFV6RÊÁWfV“¬6V“W6"Ú6WR6ˆ◊WFF˜"‚ ¢¢$vW&:|:6ÚñÁFVw&FñÊFÏ:6ÚW7L:Fó7ˆÏ:◊fV¬‚W6R«FW&ÊFófw&GVóF&óÜÛ≤V∆ˆFRFW"fñ∆‚'–¢¬˜7„‡¢¬ˆFóc‡¢∆¢6∆74Ê÷S“&'WGFˆ‚6V6ˆÊF'í ¢á&Vc“&áGG3¢ÚˆáVvvñÊvf6RÊ6Ú˜76W2Ù∆ñváG&ñ6∑2Ù≈EÇ”"”2 ¢F&vWC“%ˆ&∆Ê≤ ¢&V√“&Ê˜&VfW'&W" ¢‡¢ƒWáFW&Êƒ∆ñÊ≤6ó¶S◊≥w“Û‡¢«7„‰'&ó"vW&F˜"FRl:÷FVÚw&GVóFÛ¬˜7„‡¢¬ˆ‡¢«6÷∆√‡¢6W'fú:vÚWáFW&ÊÚw&GVóFÚ¬7V¶VóFÚ:Fó7ˆÊñ&ñ∆ñFFRRfñ∆‡¢¬˜6÷∆√‡¢¬Û‡¢ó–¢∂W'&˜"bbÄ¢∆Fób6∆74Ê÷S“&6≤÷W'&˜"#‡¢ƒ6ó&6∆T∆W'BÛ‡¢∂W'&˜'–¢¬ˆFóc‡¢ó–¢ƒ'WGFˆ‡¢ñ6ˆ„◊∂'W7íÚ&Vg&W6Ñ7r¢vÊE7&∂∆W7–¢Fó6&∆VC◊∞¢'W7í«¿¢&ˆ◊BÁG&ñ“ÇíÊ∆VÊwFÇ¬R«¿¢áGóR””“'fñFVÚ"bbfñFVÙVÊ&∆VBê¢–¢ˆ‰6∆ñ6≥◊∂vVÊW&FW–¢‡¢∂'W7ê¢ÚGóR””“'fñFVÚ ¢ÚvW&ÊFÚl:÷FVÚG∑&ˆw&W72Ú+rG∑&ˆw&W77“V¢"'÷ ¢¢$7&ñÊFÚ‚‚‚ ¢¢GóR””“'fñFVÚ"bbfñFVÙVÊ&∆V@¢Ú%6W'fñF˜"FRl:÷FVÚñÊFó7ˆÏ:◊fV¬ ¢¢$vW&"v˜&'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢∂óFV◊2Ê∆VÊwFÇ‚bbÄ¢«6V7Fñˆ‚6∆74Ê÷S“'6V7Fñˆ‚#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰5$î8|9TU3¬˜7„‡¢∆É#‰v∆W&ñFÚÊV|;66ñÛ¬ˆÉ#‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷VFñ÷w&ñB#‡¢∂óFV◊2Ê÷ÇÜóFV“í”‚Ä¢∆'Fñ6∆R∂Wì◊∂óFV“ÊñG”‡¢∂óFV“Á7FGW2””“&FˆÊR"bbóFV“ÁW&¬ÚÄ¢óFV“ÁGóR””“'fñFVÚ"ÚÄ¢«fñFVÚ6ˆÁG&ˆ«27&3◊∂óFV“ÁW&«”‡¢«G&6≤∂ñÊC“&6FñˆÁ2"Û‡¢¬˜fñFVÛ‡¢í¢Ä¢∆ñ÷r7&3◊∂óFV“ÁW&«“«C◊∂óFV“Á&ˆ◊G“Û‡¢ê¢í¢Ä¢∆Fób6∆74Ê÷S“&÷VFñ◊VÊFñÊr#‡¢≈&Vg&W6Ñ7rÛ‡¢«7„Â&ˆ6W76ÊFÛ¬˜7„‡¢¬ˆFóc‡¢ó–¢∆Fóc‡¢«7‚6∆74Ê÷S“'Fr#‡¢∂óFV“ÁGóR””“&∆ˆvÚ ¢Ú$∆ˆvÚ ¢¢óFV“ÁGóR””“&ñ÷vR ¢Ú$ñ÷vV“ ¢¢%l:÷FVÚ'–¢¬˜7„‡¢«Á∂óFV“Á&ˆ◊G”¬˜‡¢«6÷∆√‡¢∂óFV“Á7FGW2””“&FˆÊR ¢Ú$÷FW&ñ¬6ˆÊ6«\:÷FÚ ¢¢$V“&ˆG\:|:6Ú'–¢¬˜6÷∆√‡¢∂óFV“ÁW&¬bbÄ¢∆¢á&Vc◊∂óFV“ÁW&«–¢F&vWC“%ˆ&∆Ê≤ ¢&V√“&Ê˜&VfW'&W" ¢F˜vÊ∆ˆ@¢‡¢'&ó"R&óÜ"ƒF˜vÊ∆ˆBÛ‡¢¬ˆ‡¢ó–¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶gVÊ7Fñˆ‚Üó7F˜'ïvRá≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B¬vÚ“í∞¢6ˆÁ7B∂˜V‚¬6WD˜VÂ““W6U7FFRÜÁV∆¬í¿¢∑6V&6Ç¬6WE6V&6Ö““W6U7FFRÇ""í¿¢∑fó6ñ&ñ∆óGí¬6WEfó6ñ&ñ∆óGï““W6U7FFRÇ$Fóf˜2"í¿¢∑GóTfñ«FW"¬6WEGóTfñ«FW%““W6U7FFRÇ%FˆF˜2"í¿¢∑&VÊ÷R¬6WE&VÊ÷U““W6U7FFRÇ""í¿¢∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7BGóW2“∞¢‚‚ÊÊWr6WBÜF"ÊÜó7F˜'íÊ÷ÇÜóFV“í”‚óFV“ÁGóRíÊfñ«FW"Ñ&ˆˆ∆V‚íí¿¢”∞¢6ˆÁ7BóFV◊2“F"ÊÜó7F˜'íÊfñ«FW"Ä¢áÇí”‡¢Ç'W6ñÊW72«¬ÇÊ'W6ñÊW74ñB””“'W6ñÊW72ÊñBíb`¢G∑ÇÁFóF∆W“G∑ÇÁ&W7V«B«¬"'÷ ¢ÁFÙ∆˜vW$66RÇê¢ÊñÊ6«VFW2á6V&6ÇÁFÙ∆˜vW$66RÇííb`¢áfó6ñ&ñ∆óGí””“%FˆF˜2"«¿¢áfó6ñ&ñ∆óGí””“$'VófF˜2"ÚÇÊ&6ÜófVB¢ÇÊ&6ÜófVBííb`¢áGóTfñ«FW"””“%FˆF˜2"«¬ÇÁGóR””“GóTfñ«FW"í¿¢ì∞¢6ˆÁ7B6ÜÊvU&ˆ¶V7B“ÜñB¬6ÜÊvW2í”‡¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢Üó7F˜'ì¢BÊÜó7F˜'íÊ÷ÇÜóFV“í”‡¢óFV“ÊñB””“ñ@¢Ú≤‚‚ÊóFV“¬‚‚Ê6ÜÊvW2¬WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí–¢¢óFV“¿¢í¿¢“íì∞¢6ˆÁ7B˜VÂ&ˆ¶V7B“ÜóFV“í”‚∞¢6WD˜V‚ÜóFV“ÊñBì∞¢6WE&VÊ÷RÜóFV“ÁFóF∆Rì∞¢”∞¢6ˆÁ7BGW∆ñ6FR“ÜóFV“í”‚∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢Üó7F˜'ì¢∞¢∞¢‚‚ÊóFV“¿¢ñC¢VñBÇí¿¢FóF∆S¢G∂óFV“ÁFóF∆W“Ü<;7ññ¿¢7&VFVDC¢Ê˜r¿¢WFFVDC¢Ê˜r¿¢&6ÜófVC¢f«6R¿¢“¿¢‚‚ÊBÊÜó7F˜'í¿¢“¿¢“íì∞¢6WEFˆ7BÇ%&ˆ¶WFÚGW∆ñ6FÚ"ì∞¢”∞¢6ˆÁ7B6ˆÁFñÁVU&ˆ¶V7B“ÜóFV“í”‚∞¢6ˆÁ7B6ˆÁfW'6Fñˆ‰ñB“VñBÇì∞¢6ˆÁ7BÊ˜r“ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇì∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢6V∆V7FVD6ˆÁfW'6Fñˆ‰ñC¢6ˆÁfW'6Fñˆ‰ñB¿¢6ˆÁfW'6FñˆÁ3¢∞¢∞¢ñC¢6ˆÁfW'6Fñˆ‰ñB¿¢FóF∆S¢óFV“ÁFóF∆R¿¢'W6ñÊW74ñC¢óFV“Ê'W6ñÊW74ñB¿¢7V6ñ∆ó7C¢óFV“Á7V6ñ∆ó7B«¬$Fó&WF˜""¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢7&VFVDC¢Ê˜r¿¢WFFVDC¢Ê˜r¿¢÷W76vW3¢∞¢∞¢ñC¢VñBÇí¿¢&ˆ∆S¢'W6W""¿¢6ˆÁFVÁC¢óFV“Á&WVW7B«¬6ˆÁFñÁVRÚ&ˆ¶WFÚG∂óFV“ÁFóF∆W÷¿¢7&VFVDC¢óFV“Ê7&VFVDB«¬Ê˜r¿¢“¿¢∞¢ñC¢VñBÇí¿¢&ˆ∆S¢&76ó7FÁB"¿¢6ˆÁFVÁC¢óFV“Á&W7V«B¿¢7&VFVDC¢óFV“ÁWFFVDB«¬óFV“Ê7&VFVDB«¬Ê˜r¿¢“¿¢“¿¢“¿¢‚‚‚ÜBÊ6ˆÁfW'6FñˆÁ2«¬µ“í¿¢“¿¢“íì∞¢6WD˜V‚ÜÁV∆¬ì∞¢vÚÇ&ñÊñ6ñÚ"ì∞¢”∞¢6ˆÁ7B&VfñÊU&ˆ¶V7B“7ñÊ2ÜóFV“í”‚∞¢ñbÜ'W7íí&WGW&„∞¢6WD'W7íáG'VRì∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÇ"ˆíˆí"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢7V6ñ∆ó7C¢óFV“Á7V6ñ∆ó7B«¬$Fó&WF˜""¿¢&ˆ◊C¢&Wfó6RR&ˆgVÊFRÚ&ˆ¶WFÚ&óÜÚ‚&W6W'fRfF˜2RÏ;¶÷W&˜2f˜&ÊV6ñF˜2¬V∆ñ÷ñÊRvVÊW&∆ñFFW2R7&W66VÁFR,;7Üñ÷2:|;VW2fW&ñfñ<:fVó2‚VÁG&VwVRfW'<:6ÚfñÊ¬6ˆ◊∆WFV“÷&∂F˜v‚Â∆Â∆‚G∂óFV“Á&W7V«G÷¿¢‚‚Êïv˜&∑76T6ˆÁFWáBÜ'W6ñÊW72í¿¢“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ&W7ˆÁ6RÊˆ≤íFá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$f∆ÜÚ&VfñÊ""ì∞¢6ÜÊvU&ˆ¶V7BÜóFV“ÊñB¬∞¢&W7V«C¢FFÊ6ˆÁFVÁB¿¢fW'6ñˆÁ3¢∞¢∞¢&W7V«C¢óFV“Á&W7V«B¿¢C¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢“¿¢‚‚‚ÜóFV“ÁfW'6ñˆÁ2«¬µ“í¿¢“¿¢“ì∞¢6WEFˆ7BÇ%&ˆ¶WFÚ&VfñÊFÛ≤fW'<:6ÚÁFW&ñ˜"fˆí&W6W'fF"ì∞¢“6F6ÇÜW'&˜"í∞¢6WEFˆ7BÜW'&˜"Ê÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬&VfñÊ"v˜&"ì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7BG&Á6f˜&““áÇ¬GóRí”‚∞¢ñbáGóR””“'F6≤"ê¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢F6∑3¢∞¢∞¢ñC¢VñBÇí¿¢FóF∆S¢ÇÁFóF∆R¿¢FW67&óFñˆ„¢ÇÁ&W7V«BÁ6∆ñ6RÉ¬#Cí¿¢&ñ˜&óGì¢$‹:ñFñ"¿¢7FGW3¢$f¶W""¿¢GVS¢""¿¢&V¢$W7G&L:ñvñ"¿¢'W6ñÊW74ñC¢ÇÊ'W6ñÊW74ñB¿¢“¿¢‚‚ÊBÁF6∑2¿¢“¿¢“íì∞¢V«6P¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢Fˆ7V÷VÁG3¢∞¢∞¢ñC¢VñBÇí¿¢FóF∆S¢ÇÁFóF∆R¿¢GóS¢%∆ÊÚFR:|:6Ú"¿¢6ˆÁFVÁC¢ÇÁ&W7V«B¿¢'W6ñÊW74ñC¢ÇÊ'W6ñÊW74ñB¿¢WFFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢fW'6ñˆÁ3¢µ“¿¢“¿¢‚‚ÊBÊFˆ7V÷VÁG2¿¢“¿¢“íì∞¢6WEFˆ7BáGóR””“'F6≤"Ú%F&Vf7&ñF"¢$Fˆ7V÷VÁFÚ7&ñFÚ"ì∞¢”∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$Ñï5L95$î4Ú ¢FóF∆S“%GVFÚÚVRfˆ<:¢W66ˆ∆ÜWRwV&F"¬&ˆÁFÚ&6ˆÁFñÁV" ¢FWáC“$26ˆÁfW'62fñ6“ÊÚ6ÜC≤6ˆ÷VÁFR&W7˜7F2VRfˆ<:¢6«f"VÁG&“Ví‚ ¢‡¢∆Fób6∆74Ê÷S“'Fˆˆ∆&"#‡¢∆Fób6∆74Ê÷S“'6V&6Ç#‡¢≈6V&6ÇÛ‡¢∆ñÁW@¢f«VS◊∑6V&6á–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE6V&6ÇÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“%W7Vó6"ÊÚÜó7L;7&ñ6Ú ¢Û‡¢¬ˆFóc‡¢«6V∆V7@¢f«VS◊∑GóTfñ«FW'–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEGóTfñ«FW"ÜRÁF&vWBÁf«VRó–¢‡¢∆˜Fñˆ„ÂFˆF˜3¬ˆ˜Fñˆ„‡¢∑GóW2Ê÷ÇáGóRí”‚Ä¢∆˜Fñˆ‚∂Wì◊∑GóW”Á∑GóW”¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢«6V∆V7@¢f«VS◊∑fó6ñ&ñ∆óGó–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WEfó6ñ&ñ∆óGíÜRÁF&vWBÁf«VRó–¢‡¢∆˜Fñˆ„‰Fóf˜3¬ˆ˜Fñˆ„‡¢∆˜Fñˆ„‰'VófF˜3¬ˆ˜Fñˆ„‡¢∆˜Fñˆ„ÂFˆF˜3¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢¬ˆFóc‡¢∂óFV◊2Ê∆VÊwFÇ””“ÚÄ¢ƒV◊Gê¢ñ6ˆ„◊¥Üó7F˜'ó–¢FóF∆S“%6WRÜó7L;7&ñ6ÚW7L:f¶ñÚ ¢FWáC“$ÊÚ6ÜB¬W6R(	≈6«f"V“&ˆ¶WF˜>(	“VÊ2Ê2&W7˜7F2VRVó6W"÷ÁFW"Ví‚ ¢Û‡¢í¢Ä¢∆Fób6∆74Ê÷S“&Üó7F˜'í÷∆ó7B#‡¢∂óFV◊2Ê÷ÇáÇí”‚Ä¢∆Fó`¢∂Wì◊∑ÇÊñG–¢6∆74Ê÷S“&Üó7F˜'í÷6&B ¢&ˆ∆S“&'WGFˆ‚ ¢F$ñÊFWÉ◊≥–¢ˆ‰6∆ñ6≥◊≤Çí”‚˜VÂ&ˆ¶V7BáÇó–¢ˆ‰∂WîF˜v„◊≤ÜWfVÁBí”‚∞¢ñbÜWfVÁBÊ∂Wí””“$VÁFW""«¬WfVÁBÊ∂Wí””“""í∞¢WfVÁBÁ&WfVÁDFVfV«BÇì∞¢˜VÂ&ˆ¶V7BáÇì∞¢–¢◊–¢‡¢«7‚6∆74Ê÷S“&Fˆ2÷ñ6ˆ‚#‡¢≈7&∂∆W2Û‡¢¬˜7„‡¢«7„‡¢«7‚6∆74Ê÷S“'Fr#Á∑ÇÁ7V6ñ∆ó7G”¬˜7„‡¢∆É3Á∑ÇÁFóF∆W”¬ˆÉ3‡¢«6÷∆√‡¢∂ÊWrFFRáÇÊ7&VFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó“+r∑ÇÁGóW–¢¬˜6÷∆√‡¢¬˜7„‡¢«7‚6∆74Ê÷S“'&ˆ¶V7B÷6&B÷7FñˆÁ2#‡¢∆'WGFˆ‡¢&ñ÷∆&V√“$GW∆ñ6"&ˆ¶WFÚ ¢ˆ‰6∆ñ6≥◊≤ÜWfVÁBí”‚∞¢WfVÁBÁ7F˜&˜vFñˆ‚Çì∞¢GW∆ñ6FRáÇì∞¢◊–¢‡¢ƒ6˜íÛ‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢&ñ÷∆&V√◊∞¢ÇÊ&6ÜófVBÚ$FW6'Vóf"&ˆ¶WFÚ"¢$'Vóf"&ˆ¶WFÚ ¢–¢ˆ‰6∆ñ6≥◊≤ÜWfVÁBí”‚∞¢WfVÁBÁ7F˜&˜vFñˆ‚Çì∞¢6ÜÊvU&ˆ¶V7BáÇÊñB¬≤&6ÜófVC¢ÇÊ&6ÜófVB“ì∞¢◊–¢‡¢ƒ&6ÜófRÛ‡¢¬ˆ'WGFˆ„‡¢¬˜7„‡¢ƒ6ÜWg&ˆÂ&ñváBÛ‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢ó–¢∂˜V‚b`¢ÇÇí”‚∞¢6ˆÁ7BÇ“F"ÊÜó7F˜'íÊfñÊBÇÜíí”‚íÊñB””“˜V‚ì∞¢6ˆÁ7B&ˆ◊E&VÊ÷R“Çí”‚∞¢6ˆÁ7BB“&ˆ◊BÇ$Ê˜fÚÊˆ÷R&W7FRóFV”¢"¬ÇÁFóF∆Rì∞¢ñbÇB«¬BÁG&ñ“Çíí&WGW&„∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬Üó7F˜'ì¢BÊÜó7F˜'íÊ÷ÇÜíí”‚ÜíÊñB””“ÇÊñBÚ≤‚‚Êí¬FóF∆S¢BÁG&ñ“Çí“¢ííí“íì∞¢6WEFˆ7BÇ%&VÊˆ÷VFÚ"ì∞¢”∞¢6ˆÁ7BGW∆ñ6FR“Çí”‚∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬Üó7F˜'ì¢∑≤‚‚ÁÇ¬ñC¢VñBÇí¬FóF∆S¢G∑ÇÁFóF∆W“Ü<;7ññ¬7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí“¬‚‚ÊBÊÜó7F˜'ï““íì∞¢6WEFˆ7BÇ$GW∆ñ6FÚ"ì∞¢”∞¢6ˆÁ7B&V÷˜fTóFV““Çí”‚∞¢ñbÇ6ˆÊfó&“Ç$WÜ6«Vó"W7FRóFV“FÚÜó7L;7&ñ6ÛÚ"íí&WGW&„∞¢6WD˜V‚ÜÁV∆¬ì∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬Üó7F˜'ì¢BÊÜó7F˜'íÊfñ«FW"ÇÜíí”‚íÊñB”“ÇÊñBí“íì∞¢6WEFˆ7BÇ$WÜ6«\:÷FÚ"ì∞¢”∞¢6ˆÁ7B6ˆÁFñÁVT6ÜB“Çí”‚∞¢6ˆÁ7B6ñB“VñBÇì∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢6V∆V7FVD6ˆÁfW'6Fñˆ‰ñC¢6ñB¿¢6ˆÁfW'6FñˆÁ3¢∞¢≤ñC¢6ñB¬FóF∆S¢ÇÁFóF∆RÁ6∆ñ6RÉ¬SRí¬'W6ñÊW74ñC¢ÇÊ'W6ñÊW74ñB¬7V6ñ∆ó7C¢ÇÁ7V6ñ∆ó7B¬˜vÊW$ñC¢F"ÁW6W"ÊñB¬7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¬÷W76vW3¢∞¢≤ñC¢VñBÇí¬&ˆ∆S¢'W6W""¬6ˆÁFVÁC¢ÇÁ&WVW7B«¬ÇÁFóF∆R¬7&VFVDC¢ÇÊ7&VFVDB“¿¢≤ñC¢VñBÇí¬&ˆ∆S¢&76ó7FÁB"¬6ˆÁFVÁC¢ÇÁ&W7V«B¬&˜fñFW#¢ÇÁ&˜fñFW"¬÷ˆFV√¢ÇÊ÷ˆFV¬¬7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí“¿¢““¿¢‚‚‚ÜBÊ6ˆÁfW'6FñˆÁ2«¬µ“í¿¢“¿¢“íì∞¢6WD˜V‚ÜÁV∆¬ì∞¢6WEFˆ7BÇ$6ˆÁfW'6&WFˆ÷F(	B'&ÚñÏ:÷6ñÚ&6ˆÁFñÁV"FRˆÊFR&˜R"ì∞¢”∞¢&WGW&‚Ä¢ƒ÷ˆF¬vñFRFóF∆S◊∑ÇÁFóF∆W“ˆ‰6∆˜6S◊≤Çí”‚6WD˜V‚ÜÁV∆¬ó”‡¢∆Fób6∆74Ê÷S“'&W7V«B#‡¢∆Fób6∆74Ê÷S“'&ˆ¶V7B◊FóF∆R÷VFóF˜"#‡¢∆ñÁW@¢f«VS◊∑&VÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE&VÊ÷RÜRÁF&vWBÁf«VRó–¢Û‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊µ6fW–¢Fó6&∆VC◊≤&VÊ÷RÁG&ñ“Çí«¬&VÊ÷RÁG&ñ“Çí””“ÇÁFóF∆W–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6ÜÊvU&ˆ¶V7BáÇÊñB¬≤FóF∆S¢&VÊ÷RÁG&ñ“Çí“ì∞¢6WEFˆ7BÇ%&ˆ¶WFÚ&VÊˆ÷VFÚ"ì∞¢◊–¢‡¢&VÊˆ÷V ¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'&W7V«B÷÷WF#‡¢«7„‡¢ƒ'Vñ∆FñÊs"Û‡¢∂F"Ê'W6ñÊW76W2ÊfñÊBÇÜ"í”‚"ÊñB””“ÇÊ'W6ñÊW74ñBìÚÊÊ÷R«¿¢%6V“ÊV|;66ñÚ'–¢¬˜7„‡¢«7„‡¢≈7&∂∆W2Û‡¢∑ÇÁ7V6ñ∆ó7G–¢¬˜7„‡¢¬ˆFóc‡¢ƒ÷&∂F˜v‚FWáC◊∑ÇÁ&W7V«G“Û‡¢≤áÇÁfW'6ñˆÁ2«¬µ“íÊ∆VÊwFÇ‚bbÄ¢«6÷∆¬6∆74Ê÷S“'fW'6ñˆ‚÷Ê˜FR#‡¢∑ÇÁfW'6ñˆÁ2Ê∆VÊwFá“fW'<:6Úå;VW2íÁFW&ñ˜"ÜW2í&W6W'fFá2í‡¢¬˜6÷∆√‡¢ó–¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ27&VB#‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥6˜ó–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ÊfñvF˜"Ê6∆ó&ˆ&CÚÁw&óFUFWáBáÇÁ&W7V«Bì∞¢6WEFˆ7BÇ%&W7V«FFÚ6˜ñFÚ"ì∞¢◊–¢‡¢6˜ñ ¢¬Ù'WGFˆ„‡¢∆Fóc‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊¥÷W76vU7V&UFWáG–¢ˆ‰6∆ñ6≥◊≤Çí”‚6ˆÁFñÁVU&ˆ¶V7BáÇó–¢‡¢6ˆÁFñÁV"ÊÚ6Ü@¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊∂'W7íÚ&Vg&W6Ñ7r¢vÊE7&∂∆W7–¢Fó6&∆VC◊∂'W7ó–¢ˆ‰6∆ñ6≥◊≤Çí”‚&VfñÊU&ˆ¶V7BáÇó–¢‡¢∂'W7íÚ%&VfñÊÊFÚ‚‚‚"¢%&VfñÊ"'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊¥∆ó7EFˆF˜–¢ˆ‰6∆ñ6≥◊≤Çí”‚G&Á6f˜&“áÇ¬'F6≤"ó–¢‡¢fó&"F&Vf¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚ñ6ˆ„◊¥fñ∆UFWáG“ˆ‰6∆ñ6≥◊≤Çí”‚G&Á6f˜&“áÇ¬&Fˆ2"ó”‡¢fó&"Fˆ7V÷VÁF¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥6˜ó–¢ˆ‰6∆ñ6≥◊≤Çí”‚GW∆ñ6FRáÇó–¢‡¢GW∆ñ6 ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥&6ÜófW–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6ÜÊvU&ˆ¶V7BáÇÊñB¬≤&6ÜófVC¢ÇÊ&6ÜófVB“ì∞¢6WD˜V‚ÜÁV∆¬ì∞¢◊–¢‡¢∑ÇÊ&6ÜófVBÚ$FW6'Vóf""¢$'Vóf"'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µG&6É'–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ñbÇ6ˆÊfó&“Ç$WÜ6«Vó"W7FR&ˆ¶WFÚFVfñÊóFóf÷VÁFSÚ"íê¢&WGW&„∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢Üó7F˜'ì¢BÊÜó7F˜'íÊfñ«FW"ÇÜóFV“í”‚óFV“ÊñB”“ÇÊñBí¿¢“íì∞¢6WD˜V‚ÜÁV∆¬ì∞¢6WEFˆ7BÇ%&ˆ¶WFÚWÜ6«\:÷FÚ"ì∞¢◊–¢‡¢WÜ6«Vó ¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2Üó7F˜'í÷WáG&#‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ñ6ˆ„◊¥÷W76vU7V&UFWáG“ˆ‰6∆ñ6≥◊∂6ˆÁFñÁVT6ÜG”‡¢6ˆÁFñÁV"ÊÚ6Ü@¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ñ6ˆ„◊¥VFóC7“ˆ‰6∆ñ6≥◊∑&ˆ◊E&VÊ÷W”‡¢&VÊˆ÷V ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ñ6ˆ„◊¥6˜ó“ˆ‰6∆ñ6≥◊∂GW∆ñ6FW”‡¢GW∆ñ6 ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ñ6ˆ„◊µG&6É'“ˆ‰6∆ñ6≥◊∑&V÷˜fTóFV◊”‡¢WÜ6«Vó ¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞¢“íÇó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶gVÊ7Fñˆ‚6W'Fñfñ6FTFˆ7V÷VÁBÜ6W'Bí∞¢&WGW&‚¬Fˆ7GóRáF÷√„∆áF÷¬∆Ês“'B‘%"#„∆ÜVC„∆÷WF6Ü'6WC“'WFb”Ç#„∆÷WFÊ÷S“'fñWw˜'B"6ˆÁFVÁC“'vñGFÉ÷FWfñ6R◊vñGFÇ#„«FóF∆S‚G∂W66TáF÷¬Ü6W'BÁFóF∆Ró”¬˜FóF∆S„«7Gñ∆S‰vW∑6ó¶S§B∆ÊG66S∂÷&vñ„£“ß∂&˜Ç◊6ó¶ñÊs¶&˜&FW"÷&˜á÷&ˆGó∂÷&vñ„£∂&6∂w&˜VÊC¢6VVS∂fˆÁB÷f÷ñ«ì§&ñ¬«6Á2◊6W&ñc∂6ˆ∆˜#¢3ÉC&'“Á6ÜVWG∑vñGFÉ£#ìv÷”∂ÜVñváC£#÷”∂÷&vñ„¶WFÛ∂&6∂w&˜VÊC¢6ffc∑FFñÊs£6÷”∑˜6óFñˆ„ß&V∆FófS∂˜fW&f∆˜s¶ÜñFFVÁ“Êg&÷W∂ÜVñváC£S∂&˜&FW#£'Ç6ˆ∆ñB3&##S∑FFñÊs£Ü÷”∂Fó7∆ì¶f∆WÉ∂f∆WÇ÷Fó&V7Fñˆ„¶6ˆ«V÷„∂∆ñv‚÷óFV◊3¶6VÁFW#∂ßW7Fñgí÷6ˆÁFVÁC¶6VÁFW#∑FWáB÷∆ñv„¶6VÁFW#∑˜6óFñˆ„ß&V∆FófW“Êg&÷S¶&Vf˜&R¬Êg&÷S¶gFW'∂6ˆÁFVÁC¢rs∑˜6óFñˆ„¶'6ˆ«WFS∑vñGFÉ£÷”∂ÜVñváC£÷”∂&˜&FW"◊&FóW3£SS∂fñ«FW#¶&«W"É'Çì∂˜6óGì¢„'“Êg&÷S¶&Vf˜&W∂&6∂w&˜VÊC¢3fC3ÜS∂∆VgC¢”S÷”∑F˜¢”SV÷◊“Êg&÷S¶gFW'∂&6∂w&˜VÊC¢6VC6Sì∑&ñváC¢”CÜ÷”∂&˜GFˆ”¢”SÜ÷◊“Ê÷&∑∑vñGFÉ£Ü÷”∂ÜVñváC£Ü÷”∂&˜&FW"◊&FóW3£V÷”∂&6∂w&˜VÊC¶∆ñÊV"÷w&FñVÁBÉ3VFVr¬3fC3ÜS¬6VC6Sìì∂6ˆ∆˜#ßvÜóFS∂Fó7∆ì¶w&ñC∑∆6R÷óFV◊3¶6VÁFW#∂fˆÁB◊6ó¶S£ñ÷”∂fˆÁB◊vVñváC¶&ˆ∆C∂÷&vñ‚÷&˜GFˆ”£V÷◊“Êó77VW'∂fˆÁB◊6ó¶S£F÷”∂∆WGFW"◊76ñÊs¢„fV”∑FWáB◊G&Á6f˜&”ßWW&66S∂fˆÁB◊vVñváC¶&ˆ∆C∂6ˆ∆˜#¢3fC3ÜS“Á7V'∂fˆÁB◊6ó¶S£2„÷”∂6ˆ∆˜#¢3ccVcsS∂÷&vñ‚◊F˜£&÷◊“Á'V∆W∑vñGFÉ£3V÷”∂ÜVñváC¢„f÷”∂&6∂w&˜VÊC¶∆ñÊV"÷w&FñVÁBÉìFVr¬3fC3ÜS¬6VC6Sìì∂÷&vñ„£f÷◊“Ê∆&V«∂fˆÁB◊6ó¶S£2„V÷”∂6ˆ∆˜#¢3ccVcsW“ÊÊ÷W∂fˆÁB÷f÷ñ«ì§vV˜&vñ«6W&ñc∂fˆÁB◊6ó¶S£&÷”∂÷&vñ„£F÷“∂6ˆ∆˜#¢3#ÉCg“ÁFWáG∂fˆÁB◊6ó¶S£F÷”∂∆ñÊR÷ÜVñváC£„c∂÷Ç◊vñGFÉ£#V÷”∂6ˆ∆˜#¢3C6S“ÁFóF∆W∂fˆÁB◊6ó¶S£v÷”∂fˆÁB◊vVñváC¶&ˆ∆C∂6ˆ∆˜#¢3fC3ÜS∂÷&vñ„£6÷““Êfˆ˜FW'∂Fó7∆ì¶f∆WÉ∂v£#F÷”∂÷&vñ‚◊F˜£÷◊“Êfˆ˜FW"Fóg∂÷ñ‚◊vñGFÉ£SV÷”∂&˜&FW"◊F˜¢„F÷“6ˆ∆ñB6∑FFñÊr◊F˜£&÷”∂fˆÁB◊6ó¶S£2„&÷◊“Ê6ˆFW∑˜6óFñˆ„¶'6ˆ«WFS∂&˜GFˆ”£f÷”∂fˆÁB◊6ó¶S£"„Ü÷”∂6ˆ∆˜#¢3ssw“ÊÊ˜FW∑˜6óFñˆ„¶'6ˆ«WFS∂∆VgC£÷”∂&˜GFˆ”£V÷”∂fˆÁB◊6ó¶S£"„V÷”∂6ˆ∆˜#¢3ÉÉÉ∂÷Ç◊vñGFÉ£cV÷”∑FWáB÷∆ñv„¶∆VgG‘÷VFñ&ñÁG∂&ˆGó∂&6∂w&˜VÊC¢6ffg“Á6ÜVWG∂÷&vñ„£◊”¬˜7Gñ∆S„¬ˆÜVC„∆&ˆGì„∆÷ñ‚6∆73“'6ÜVWB#„«6V7Fñˆ‚6∆73“&g&÷R#„∆Fób6∆73“&÷&≤#Â¬ˆFóc„∆Fób6∆73“&ó77VW"#‰6FV÷ñ&Üó3¬ˆFóc„∆Fób6∆73“'7V"#‰6ˆ◊WL:¶Ê6ñ2∆ñ6F2&ÊV|;66ñ˜3¬ˆFóc„∆Fób6∆73“''V∆R#„¬ˆFóc„∆Fób6∆73“&∆&V¬#‰4U%Dîdî4DÚDR4Ù’UL8§‰4î,8Dî4¬ˆFóc„∆É6∆73“&Ê÷R#‚G∂W66TáF÷¬Ü6W'BÊÊ÷Ró”¬ˆÉ„∆Fób6∆73“'FWáB#Ê6ˆÊ6«VóR˜2÷&6˜2fW&ñfñ<:fVó2FG&ñ∆ÜRFV÷ˆÁ7G&˜R6ˆ◊WL:¶Ê6ñ∆ñ6FV”¬ˆFóc„∆É"6∆73“'FóF∆R#‚G∂W66TáF÷¬Ü6W'BÁFóF∆Ró”¬ˆÉ#„∆Fób6∆73“'FWáB#Á˜"W7G'WGW&"'&ñVfñÊrR6ˆÁF\;¶FÚ¬W'6ˆÊ∆ó¶"WáW&ú:¶Ê6ñ¬f∆ñF"&W7ˆÁ6ófñFFRR6ˆÊ6«Vó"V&∆ñ6:|:6ÚFRV“&ˆ¶WFÚgVÊ6ñˆÊ¬„¬ˆFóc„∆Fób6∆73“&fˆ˜FW"#„∆Fóc„«7G&ˆÊs‚G∂ÊWrFFRÜ6W'BÊó77VVDBíÁFÙ∆ˆ6∆TFFU7G&ñÊrÇ'B‘%""ó”¬˜7G&ˆÊs„∆'#‰FFFRV÷ó7<:6Û¬ˆFóc„∆Fóc„«7G&ˆÊs‰6FV÷ñ&Üó3¬˜7G&ˆÊs„∆'#ÂVÊñFFRf˜&÷Fóf¬ˆFóc„¬ˆFóc„∆Fób6∆73“&Ê˜FR#Â&ˆw&÷f˜&÷FófÚñÁFVw&FÚÚ∆ñ6FófÚ6WRgVÊ6ñˆÏ:&ñÚ‚6W'Fñfñ6FÚFR&V∆ó¶:|:6Ú,:Fñ6≤Ï:6ÚWVóf∆RFó∆ˆ÷6L:¶÷ñ6Ú˜RÜ&ñ∆óF:|:6Ú&ˆfó76ñˆÊ¬&VwV∆÷VÁFF„¬ˆFóc„∆Fób6∆73“&6ˆFR#‰7&VFVÊ6ñ¬G∂W66TáF÷¬Ü6W'BÊ6ˆFRó“+r&ˆ¶WFÛ¢G∂W66TáF÷¬Ü6W'BÁ&ˆ¶V7DÊ÷Ró”¬ˆFóc„¬˜6V7Fñˆ„„¬ˆ÷ñ„„¬ˆ&ˆGì„¬ˆáF÷√Ê∞ß–†¶gVÊ7Fñˆ‚6W'Fñfñ6FUfñWrá≤6W'B¬ˆ‰6∆˜6R“í∞¢6ˆÁ7BF˜vÊ∆ˆB“Çí”‚∞¢6ˆÁ7B&∆ˆ"“ÊWr&∆ˆ"Ö∂6W'Fñfñ6FTFˆ7V÷VÁBÜ6W'Bï“¬∞¢GóS¢'FWáBˆáF÷√∂6Ü'6WC◊WFb”Ç"¿¢“í¿¢“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢Êá&Vb“U$¬Ê7&VFTˆ&¶V7EU$¬Ü&∆ˆ"ì∞¢ÊF˜vÊ∆ˆB“6W'Fñfñ6FÚ“G∑6«VvñgíÜ6W'BÊÊ÷Ró“ÊáF÷∆∞¢Ê6∆ñ6≤Çì∞¢U$¬Á&Wfˆ∂Tˆ&¶V7EU$¬ÜÊá&Vbì∞¢”∞¢6ˆÁ7B&ñÁB“Çí”‚∞¢6ˆÁ7Br“vñÊF˜rÊ˜V‚Ç""¬%ˆ&∆Ê≤"ì∞¢ñbÇrí&WGW&„∞¢rÊFˆ7V÷VÁBÁw&óFRÜ6W'Fñfñ6FTFˆ7V÷VÁBÜ6W'Bíì∞¢rÊFˆ7V÷VÁBÊ6∆˜6RÇì∞¢6WEFñ÷V˜WBÇÇí”‚rÁ&ñÁBÇí¬3Sì∞¢”∞¢&WGW&‚Ä¢ƒ÷ˆF¬vñFRFóF∆S“%7V7&VFVÊ6ñ¬"ˆ‰6∆˜6S◊∂ˆ‰6∆˜6W”‡¢∆Fób6∆74Ê÷S“&6W'Fñfñ6FR#‡¢∆Fób6∆74Ê÷S“&6W'Fñfñ6FR÷ñÊÊW"#‡¢∆Fób6∆74Ê÷S“'&Üó2÷÷&≤#Â¬ˆFóc‡¢«7‚6∆74Ê÷S“'&Üó2÷Ê÷R#‰4DT‘î$Ñï3¬˜7„‡¢«6÷∆√‰6ˆ◊WL:¶Ê6ñ2∆ñ6F2&ÊV|;66ñ˜3¬˜6÷∆√‡¢∆íÛ‡¢«7‚6∆74Ê÷S“&6W'Fñfñ6FR÷∆&V¬#‡¢4U%Dîdî4DÚDR4Ù’UL8§‰4î,8Dî4¢¬˜7„‡¢∆É#Á∂6W'BÊÊ÷W”¬ˆÉ#‡¢«‡¢6ˆÊ6«VóR˜2÷&6˜2fW&ñfñ<:fVó2FG&ñ∆ÜRFV÷ˆÁ7G&˜R6ˆ◊WL:¶Ê6ñ¢∆ñ6FV–¢¬˜‡¢∆É3Á∂6W'BÁFóF∆W”¬ˆÉ3‡¢«‡¢˜"W7G'WGW&"'&ñVfñÊrR6ˆÁF\;¶FÚ¬W'6ˆÊ∆ó¶"WáW&ú:¶Ê6ñ¿¢f∆ñF"&W7ˆÁ6ófñFFRR6ˆÊ6«Vó"V&∆ñ6:|:6ÚFRV“&ˆ¶WF¢gVÊ6ñˆÊ¬‡¢¬˜‡¢∆Fób6∆74Ê÷S“&6W'Fñfñ6FR◊6ñvÊGW&W2#‡¢«7„‡¢«7G&ˆÊs‡¢∂ÊWrFFRÜ6W'BÊó77VVDBíÁFÙ∆ˆ6∆TFFU7G&ñÊrÇ'B‘%""ó–¢¬˜7G&ˆÊs‡¢«6÷∆√‰FFFRV÷ó7<:6Û¬˜6÷∆√‡¢¬˜7„‡¢«7„‡¢«7G&ˆÊs‰6FV÷ñ&Üó3¬˜7G&ˆÊs‡¢«6÷∆√ÂVÊñFFRf˜&÷Fóf¬˜6÷∆√‡¢¬˜7„‡¢¬ˆFóc‡¢∆6ˆFS‡¢7&VFVÊ6ñ¬∂6W'BÊ6ˆFW“+r&ˆ¶WFÛ¢∂6W'BÁ&ˆ¶V7DÊ÷W–¢¬ˆ6ˆFS‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&6W'Fñfñ6FR÷Fó66∆ñ÷W"#‡¢≈6ÜñV∆D6ÜV6≤Û‡¢«7„‡¢&ˆw&÷f˜&÷FófÚñÁFVw&FÚÚ6WRgVÊ6ñˆÏ:&ñÚ‚W7F7&VFVÊ6ñ¿¢6ˆ◊&˜f6ˆÊ6«W<:6ÚFRFófñFFW2,:Fñ62FVÁG&ÚF∆Ff˜&÷≤Ï:6¢:íFó∆ˆ÷6L:¶÷ñ6ÚÊV“Ü&ñ∆óF:|:6Ú&VwV∆÷VÁFF‡¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&÷ˆF¬÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"ñ6ˆ„◊µ&ñÁFW'“ˆ‰6∆ñ6≥◊∑&ñÁG”‡¢ñ◊&ñ÷ó"˜R6«f"V“D`¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚ñ6ˆ„◊¥F˜vÊ∆ˆG“ˆ‰6∆ñ6≥◊∂F˜vÊ∆ˆG”‡¢&óÜ"6W'Fñfñ6F¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ì∞ß–†¶gVÊ7Fñˆ‚6W'Fñfñ6FñˆÁ2á≤F"¬WFFR¬'W6ñÊW72¬6WEFˆ7B¬vÚ“í∞¢6ˆÁ7B&V∆WfÁB“F"Á6óFW2Êfñ«FW"Ä¢áÇí”‚'W6ñÊW72«¬ÇÊ'W6ñÊW74ñB””“'W6ñÊW72ÊñB¿¢ì∞¢6ˆÁ7B&Ê∂VB“≤‚‚Á&V∆WfÁE“Á6˜'BÄ¢Ü¬"í”‡¢vV'6óFT÷ñ∆W7FˆÊW2Ü"íÊfñ«FW"ÇáÇí”‚ÇÊFˆÊRíÊ∆VÊwFÇ–¢vV'6óFT÷ñ∆W7FˆÊW2ÜíÊfñ«FW"ÇáÇí”‚ÇÊFˆÊRíÊ∆VÊwFÇ¿¢ì∞¢6ˆÁ7B∑6óFTñB¬6WE6óFTñE““W6U7FFRá&Ê∂VE≥”ÚÊñB«¬""ì∞¢6ˆÁ7B∑fñWr¬6WEfñWu““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B6óFR“&V∆WfÁBÊfñÊBÇáÇí”‚ÇÊñB””“6óFTñBí«¬&Ê∂VE≥”∞¢6ˆÁ7B÷ñ∆W7FˆÊW2“vV'6óFT÷ñ∆W7FˆÊW2á6óFRí¿¢FˆÊR“÷ñ∆W7FˆÊW2Êfñ«FW"ÇáÇí”‚ÇÊFˆÊRíÊ∆VÊwFÇ¿¢6ˆ◊∆WFR“FˆÊR””“÷ñ∆W7FˆÊW2Ê∆VÊwFÉ∞¢6ˆÁ7Bó77VVB“F"Ê6W'Fñfñ6FW2ÊfñÊBÄ¢áÇí”‚ÇÁG&6≤””“'vV'6óFR÷ÊÚ÷6ˆFR"bbÇÁ&ˆ¶V7DñB””“6óFSÚÊñB¿¢ì∞¢6ˆÁ7Bó77VR“Çí”‚∞¢ñbÇ6ˆ◊∆WFR«¬ó77VVBí&WGW&„∞¢6ˆÁ7B6W'B“∞¢ñC¢VñBÇí¿¢G&6≥¢'vV'6óFR÷ÊÚ÷6ˆFR"¿¢&ˆ¶V7DñC¢6óFRÊñB¿¢&ˆ¶V7DÊ÷S¢6óFRÊÊ÷R¿¢Ê÷S¢F"ÁW6W"ÊÊ÷R¿¢FóF∆S¢$6ˆ◊WL:¶Ê6ñ∆ñ6FV“7&ñ:|:6ÚFRvV'6óFW2ÊÚ‘6ˆFR"¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢fó6ñ&ñ∆óGì¢'&ófFÚ"¿¢ó77VVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢6ˆFS¢%Ç’tT"“G∂ÊWrFFRÇíÊvWDgV∆≈ñV"Çó““G∑6óFRÊñBÁ6∆ñ6RÉ¬ÇíÁFıWW$66RÇó÷¿¢”∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬6W'Fñfñ6FW3¢∂6W'B¬‚‚‚ÜBÊ6W'Fñfñ6FW2«¬µ“ï““íì∞¢6WEfñWrÜ6W'Bì∞¢6WEFˆ7BÇ$6W'Fñfñ6FÚV÷óFñFÚV∆6FV÷ñ&Üó2"ì∞¢”∞¢6ˆÁ7B6W'G2“F"Ê6W'Fñfñ6FW2«¬µ”∞¢6ˆÁ7B◊î6ˆ◊∆WFVE∆Á2“ÜF"ÊFWfV∆˜÷VÁE∆Á2«¬µ“íÊfñ«FW"Ä¢áí”‚Ê76ñvÊVTñB””“F"ÁW6W"ÊñBbbÁ7FGW2””“$6ˆÊ6«\:÷FÚ"¿¢ì∞¢6ˆÁ7Bó77VU∆‰6W'Fñfñ6FR“á∆‚í”‚∞¢6ˆÁ7B«&VGîó77VVB“6W'G2Á6ˆ÷RÄ¢Ü2í”‚2ÁG&6≤””“&FWfV∆˜÷VÁB◊∆‚"bb2Á&ˆ¶V7DñB””“∆‚ÊñB¿¢ì∞¢ñbÜ«&VGîó77VVBí&WGW&„∞¢6ˆÁ7B6W'B“∞¢ñC¢VñBÇí¿¢G&6≥¢&FWfV∆˜÷VÁB◊∆‚"¿¢&ˆ¶V7DñC¢∆‚ÊñB¿¢&ˆ¶V7DÊ÷S¢∆‚ÁFóF∆R¿¢Ê÷S¢F"ÁW6W"ÊÊ÷R¿¢FóF∆S¢∆ÊÚFRFW6VÁfˆ«fñ÷VÁFÚ6ˆÊ6«\:÷FÛ¢G∑∆‚ÁFóF∆W÷¿¢˜vÊW$ñC¢F"ÁW6W"ÊñB¿¢fó6ñ&ñ∆óGì¢'&ófFÚ"¿¢ó77VVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢6ˆFS¢%Ç‘DUb“G∂ÊWrFFRÇíÊvWDgV∆≈ñV"Çó““G∑∆‚ÊñBÁ6∆ñ6RÉ¬ÇíÁFıWW$66RÇó÷¿¢”∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬6W'Fñfñ6FW3¢∂6W'B¬‚‚‚ÜBÊ6W'Fñfñ6FW2«¬µ“ï““íì∞¢6WEfñWrÜ6W'Bì∞¢6WEFˆ7BÇ$6W'Fñfñ6FÚV÷óFñFÚ"ì∞¢”∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$4DT‘î$Ñï2 ¢FóF∆S“$6ˆ◊WL:¶Ê6ñ2VRfˆ<:¢6ˆÁ6VwVRFV÷ˆÁ7G&" ¢FWáC“$27&VFVÊ6ñó2<:6Ú∆ñ&W&F2˜"WfñL:¶Ê6ñ2FÚG&&∆ÜÚ&V∆ó¶FÚ(	BÏ:6Ú˜"FV◊ÚFRW6Ú˜R6∆óVW2∆VL;7&ñ˜2‚ ¢‡¢∆Fób6∆74Ê÷S“&ó77VW"÷&ÊÊW"#‡¢∆Fób6∆74Ê÷S“'&Üó2÷÷&≤#Â¬ˆFóc‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#ÂT‰îDDRdı$‘DïdDÚ4UReT‰4îÙÏ8$îÛ¬˜7„‡¢∆É#‰6FV÷ñ&Üó3¬ˆÉ#‡¢«‰6ˆ◊WL:¶Ê6ñ2∆ñ6F2&ÊV|;66ñ˜3¬˜‡¢¬ˆFóc‡¢ƒ&FvT6ÜV6≤Û‡¢¬ˆFóc‡¢«6V7Fñˆ‚6∆74Ê÷S“&6W'B◊G&6≤#‡¢∆Fób6∆74Ê÷S“'G&6≤÷ÜVB#‡¢«7‚6∆74Ê÷S“'G&6≤÷ñ6ˆ‚#‡¢ƒv∆ˆ&S"Û‡¢¬˜7„‡¢∆Fóc‡¢«7‚6∆74Ê÷S“'Fr#ÂE$îƒÑ,8Dî4¬˜7„‡¢∆É#‰7&ñ:|:6ÚFRvV'6óFW2ÊÚ‘6ˆFS¬ˆÉ#‡¢«‡¢FFVfñÊú:|:6ÚFÚˆ&¶WFófÚ:V&∆ñ6:|:6ÚFRV÷:vñÊgVÊ6ñˆÊ¬‡¢¬˜‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'G&6≤◊66˜&R#‡¢«7G&ˆÊs‡¢∂FˆÊW“˜∂÷ñ∆W7FˆÊW2Ê∆VÊwFá–¢¬˜7G&ˆÊs‡¢«6÷∆√Ê÷&6˜3¬˜6÷∆√‡¢¬ˆFóc‡¢¬ˆFóc‡¢∑&V∆WfÁBÊ∆VÊwFÇ‚bbÄ¢ƒfñV∆B∆&V√“%&ˆ¶WFÚf∆ñFÚ#‡¢«6V∆V7@¢f«VS◊∑6óFSÚÊñB«¬"'–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE6óFTñBÜRÁF&vWBÁf«VRó–¢‡¢∑&V∆WfÁBÊ÷ÇáÇí”‚Ä¢∆˜Fñˆ‚f«VS◊∑ÇÊñG“∂Wì◊∑ÇÊñG”‡¢∑ÇÊÊ÷W–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ó–¢∆Fób6∆74Ê÷S“&÷ñ∆W7FˆÊR÷∆ó7B#‡¢∂÷ñ∆W7FˆÊW2Ê÷ÇÜ“¬íí”‚Ä¢∆Fób6∆74Ê÷S◊∂“ÊFˆÊRÚ&FˆÊR"¢"'“∂Wì◊∂“ÊñG”‡¢«7„Á∂“ÊFˆÊRÚƒ6ÜV6¥6ó&6∆S"Û‚¢ƒ∆ˆ6¥∂WñÜˆ∆RÛÁ”¬˜7„‡¢∆Fóc‡¢«6÷∆√‰÷&6Ú∂í≤”¬˜6÷∆√‡¢«7G&ˆÊsÁ∂“ÁFóF∆W”¬˜7G&ˆÊs‡¢«Á∂“ÁFWáG”¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'G&6≤÷fˆ˜FW"#‡¢∆Fóc‡¢∆Fób6∆74Ê÷S“&÷WFW"#‡¢«7‚7Gñ∆S◊∑≤vñGFÉ¢G≤ÜFˆÊRÚ÷ñ∆W7FˆÊW2Ê∆VÊwFÇí¢“V◊“Û‡¢¬ˆFóc‡¢«6÷∆√‡¢∂6ˆ◊∆WFP¢Ú%FˆF˜2˜27&óL:ó&ñ˜2f˜&“6ˆ◊&˜fF˜2‚ ¢¢f«F“G∂÷ñ∆W7FˆÊW2Ê∆VÊwFÇ“FˆÊW“÷&6˜2&∆ñ&W&"7&VFVÊ6ñ¬Ê–¢¬˜6÷∆√‡¢¬ˆFóc‡¢≤6óFRÚÄ¢ƒ'WGFˆ‚ñ6ˆ„◊¥v∆ˆ&S'“ˆ‰6∆ñ6≥◊≤Çí”‚vÚÇ'6óFW2"ó”‡¢7&ñ"&ñ÷Vó&Ú6óFP¢¬Ù'WGFˆ„‡¢í¢ó77VVBÚÄ¢ƒ'WGFˆ‚ñ6ˆ„◊¥v&G“ˆ‰6∆ñ6≥◊≤Çí”‚6WEfñWrÜó77VVBó”‡¢fW"6W'Fñfñ6F¢¬Ù'WGFˆ„‡¢í¢Ä¢ƒ'WGFˆ‚ñ6ˆ„◊¥w&GVFñˆ‰6“Fó6&∆VC◊≤6ˆ◊∆WFW“ˆ‰6∆ñ6≥◊∂ó77VW”‡¢V÷óFó"6W'Fñfñ6F¢¬Ù'WGFˆ„‡¢ó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢∂◊î6ˆ◊∆WFVE∆Á2Ê∆VÊwFÇ‚bbÄ¢«6V7Fñˆ‚6∆74Ê÷S“'6V7Fñˆ‚#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰DU4TÂdÙ≈dî‘TÂDÛ¬˜7„‡¢∆É#Â∆Ê˜26ˆÊ6«\:÷F˜3¬ˆÉ#‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&FF÷∆ó7B#‡¢∂◊î6ˆ◊∆WFVE∆Á2Ê÷Çáí”‚∞¢6ˆÁ7B«&VGîó77VVB“6W'G2Á6ˆ÷RÄ¢Ü2í”‚2ÁG&6≤””“&FWfV∆˜÷VÁB◊∆‚"bb2Á&ˆ¶V7DñB””“ÊñB¿¢ì∞¢6ˆÁ7BWÜó7FñÊt6W'B“6W'G2ÊfñÊBÄ¢Ü2í”‚2ÁG&6≤””“&FWfV∆˜÷VÁB◊∆‚"bb2Á&ˆ¶V7DñB””“ÊñB¿¢ì∞¢&WGW&‚Ä¢∆'Fñ6∆R∂Wì◊∑ÊñG”‡¢«7„‡¢«7G&ˆÊsÁ∑ÁFóF∆W”¬˜7G&ˆÊs‡¢«6÷∆√Â∆ÊÚFRFW6VÁfˆ«fñ÷VÁFÚ6ˆÊ6«\:÷FÛ¬˜6÷∆√‡¢¬˜7„‡¢∂«&VGîó77VVBÚÄ¢ƒ'WGFˆ‚ñ6ˆ„◊¥v&G“ˆ‰6∆ñ6≥◊≤Çí”‚6WEfñWrÜWÜó7FñÊt6W'Bó”‡¢fW"6W'Fñfñ6F¢¬Ù'WGFˆ„‡¢í¢Ä¢ƒ'WGFˆ‡¢ñ6ˆ„◊¥w&GVFñˆ‰6–¢ˆ‰6∆ñ6≥◊≤Çí”‚ó77VU∆‰6W'Fñfñ6FRáó–¢‡¢V÷óFó"6W'Fñfñ6F¢¬Ù'WGFˆ„‡¢ó–¢¬ˆ'Fñ6∆S‡¢ì∞¢“ó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ó–¢∂6W'G2Ê∆VÊwFÇ‚bbÄ¢«6V7Fñˆ‚6∆74Ê÷S“'6V7Fñˆ‚#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰5$TDT‰4îï2T‘ïDîD3¬˜7„‡¢∆É#‰÷WW26W'Fñfñ6F˜3¬ˆÉ#‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&7&VFVÁFñ¬÷w&ñB#‡¢∂6W'G2Ê÷ÇÜ2í”‚Ä¢∆'WGFˆ‚∂Wì◊∂2ÊñG“ˆ‰6∆ñ6≥◊≤Çí”‚6WEfñWrÜ2ó”‡¢«7„‡¢ƒv&BÛ‡¢¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÁ∂2ÁFóF∆W”¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂ÊWrFFRÜ2Êó77VVDBíÁFÙ∆ˆ6∆TFFU7G&ñÊrÇ'B‘%""ó“+w≤"'–¢∂2Ê6ˆFW–¢¬˜6÷∆√‡¢¬ˆFóc‡¢ƒ6ÜWg&ˆÂ&ñváBÛ‡¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ó–¢∑fñWrbbƒ6W'Fñfñ6FUfñWr6W'C◊∑fñWw“ˆ‰6∆˜6S◊≤Çí”‚6WEfñWrÜÁV∆¬ó“ÛÁ–¢¬ıvUFóF∆S‡¢ì∞ß–†¶gVÊ7Fñˆ‚'W6ñÊW76W2á≤F"¬WFFR¬6WEFˆ7B¬vÚ“í∞¢6ˆÁ7B∂÷ˆF¬¬6WD÷ˆF≈““W6U7FFRÜf«6Rí¿¢∂VFóFñÊr¬6WDVFóFñÊu““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B6fR“Ü"í”‚∞¢WFFRÇÜBí”‚∞¢6ˆÁ7BWÜó7G2“BÊ'W6ñÊW76W2Á6ˆ÷RÇáÇí”‚ÇÊñB””“"ÊñBì∞¢&WGW&‚∞¢‚‚ÊB¿¢'W6ñÊW76W3¢WÜó7G0¢ÚBÊ'W6ñÊW76W2Ê÷ÇáÇí”‚áÇÊñB””“"ÊñBÚ"¢Çíê¢¢∂"¬‚‚ÊBÊ'W6ñÊW76W5“¿¢6V∆V7FVD'W6ñÊW74ñC¢"ÊñB¿¢”∞¢“ì∞¢6WD÷ˆF¬Üf«6Rì∞¢6WEFˆ7BÇ%W&fñ¬FÚÊV|;66ñÚ6«fÚ"ì∞¢”∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“%U$dï2DR‰T|944îÚ ¢FóF∆S“%6WW2ÊV|;66ñ˜2 ¢FWáC“$÷ÁFVÊÜ6F6ˆÁFWáFÚ6W&FÚR«FW&ÊRVÊFÚ&V6ó6"‚ ¢7Fñˆ„◊∞¢ƒ'WGFˆ‡¢ñ6ˆ„◊µ«W7–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WDVFóFñÊrÜÁV∆¬ì∞¢6WD÷ˆF¬áG'VRì∞¢◊–¢‡¢Ê˜fÚÊV|;66ñ¢¬Ù'WGFˆ„‡¢–¢‡¢∆Fób6∆74Ê÷S“&'W6ñÊW72÷w&ñB#‡¢∂F"Ê'W6ñÊW76W2Ê÷ÇÜ"í”‚Ä¢∆'Fñ6∆P¢6∆74Ê÷S◊∂F"Á6V∆V7FVD'W6ñÊW74ñB””“"ÊñBÚ'6V∆V7FVB"¢"'–¢∂Wì◊∂"ÊñG–¢‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&'W6ñÊW72÷fF"#Á∂"ÊÊ÷U≥◊”¬˜7„‡¢∂F"Á6V∆V7FVD'W6ñÊW74ñB””“"ÊñBbbÄ¢«7‚6∆74Ê÷S“'6V∆V7FVB÷&FvR#‡¢ƒ6ÜV6≤Û‡¢6V∆V6ñˆÊF¢¬˜7„‡¢ó–¢¬ˆFóc‡¢∆É3Á∂"ÊÊ÷W”¬ˆÉ3‡¢«Á∂"ÊñÊGW7G'î7FófóGí«¬"Á6Vv÷VÁB«¬%6Vv÷VÁFÚÏ:6ÚñÊf˜&÷FÚ'”¬˜‡¢«6÷∆√Á∂"Á7FvW”¬˜6÷∆√‡¢∆fˆ˜FW#‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚WFFRá≤‚‚ÊF"¬6V∆V7FVD'W6ñÊW74ñC¢"ÊñB“ó–¢‡¢W6"W7FP¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬6V∆V7FVD'W6ñÊW74ñC¢"ÊñB“íì∞¢vÚÇ'W&fñ¬÷ÊVvˆ6ñÚ"ì∞¢◊–¢‡¢6ˆÊfñwW&"gVÏ:|;VW0¢¬Ù'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WDVFóFñÊrÜ"ì∞¢6WD÷ˆF¬áG'VRì∞¢◊–¢‡¢ƒVFóC2Û‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FÊvW" ¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ñbÄ¢6ˆÊfó&“Ä¢WÜ6«Vó"G∂"ÊÊ÷W”Ú˜2óFVÁ2fñÊ7V∆F˜2Ï:6Ú6W,:6ÚvF˜2Ê¿¢ê¢ê¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢'W6ñÊW76W3¢BÊ'W6ñÊW76W2Êfñ«FW"ÇáÇí”‚ÇÊñB”“"ÊñBí¿¢6V∆V7FVD'W6ñÊW74ñC†¢BÁ6V∆V7FVD'W6ñÊW74ñB””“"Êñ@¢ÚBÊ'W6ñÊW76W2ÊfñÊBÇáÇí”‚ÇÊñB”“"ÊñBìÚÊñB«¬ÁV∆¿¢¢BÁ6V∆V7FVD'W6ñÊW74ñB¿¢“íì∞¢◊–¢‡¢≈G&6É"Û‡¢¬ˆ'WGFˆ„‡¢¬ˆfˆ˜FW#‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢∂F"Ê'W6ñÊW76W2Ê∆VÊwFÇ””“bbÄ¢ƒV◊Gê¢ñ6ˆ„◊¥'Vñ∆FñÊs'–¢FóF∆S“$ÊVÊáV“ÊV|;66ñÚ6F7G&FÚ ¢FWáC“$7&ñRV“W&fñ¬&W'6ˆÊ∆ó¶"fW'&÷VÁF2R˜&vÊó¶"˜2FF˜2‚ ¢7Fñˆ„“$7&ñ"ÊV|;66ñÚ ¢ˆ‰7Fñˆ„◊≤Çí”‚6WD÷ˆF¬áG'VRó–¢Û‡¢ó◊≤"'–¢∂÷ˆF¬bbÄ¢ƒ÷ˆF¿¢vñFP¢FóF∆S◊∂VFóFñÊrÚ$VFóF"ÊV|;66ñÚ"¢$7&ñ"ÊV|;66ñÚ'–¢ˆ‰6∆˜6S◊≤Çí”‚6WD÷ˆF¬Üf«6Ró–¢‡¢ƒ'W6ñÊW74f˜&–¢f«VS◊∂VFóFñÊw–¢ˆÂ6fS◊∑6fW–¢ˆ‰6∆˜6S◊≤Çí”‚6WD÷ˆF¬Üf«6Ró–¢Û‡¢¬Ù÷ˆF√‡¢ó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶gVÊ7Fñˆ‚V&∆ñ56óFRá≤6óFR¬vR“""“í∞¢6ˆÁ7B6V∆V7FVEvR“6óFSÚÁvW3ÚÊfñÊBÇÜóFV“í”‚óFV“Á6«Vr””“vRì∞¢ñbÇ6óFR«¬6óFRÁV&∆ó6ÜVB«¬ávRbb6V∆V7FVEvRíê¢&WGW&‚Ä¢∆÷ñ‚6∆74Ê÷S“'V&∆ñ2÷÷ó76ñÊr#‡¢ƒ∆ˆvÚÛ‡¢ƒ6ó&6∆T∆W'BÛ‡¢∆É‰W7F:vñÊÏ:6ÚW7L:Fó7ˆÏ:◊fV√¬ˆÉ‡¢«‰ÚVÊFW&\:vÚˆFRW7F"ñÊ6˜'&WFÚ˜RÚ6óFRfˆíFW7V&∆ñ6FÚ„¬˜‡¢¬ˆ÷ñ„‡¢ì∞¢&WGW&‚Ä¢∆ñg&÷P¢6∆74Ê÷S“'V&∆ñ2÷g&÷R ¢6ÊF&˜É“&∆∆˜r÷f˜&◊2∆∆˜r◊˜W2∆∆˜r◊F˜÷ÊfñvFñˆ‚÷'í◊W6W"÷7FófFñˆ‚ ¢FóF∆S◊∑6óFRÊÊ÷W–¢7&4Fˆ3◊∑6V∆V7FVEvSÚÊáF÷¬«¬6óFRÊáF÷«–¢Û‡¢ì∞ß–†¶gVÊ7Fñˆ‚7vóF6Ö76RÜñB¬Ê÷Rí∞¢G'í∞¢ñbÜñBí∞¢∆ˆ6≈7F˜&vRÁ6WDóFV“Ç'6b◊76R"¬ñBì∞¢∆ˆ6≈7F˜&vRÁ6WDóFV“Ç'6b◊76R÷Ê÷R"¬Ê÷R«¬$W7:vÚ6ˆ◊'Fñ∆ÜFÚ"ì∞¢“V«6R∞¢∆ˆ6≈7F˜&vRÁ&V÷˜fTóFV“Ç'6b◊76R"ì∞¢∆ˆ6≈7F˜&vRÁ&V÷˜fTóFV“Ç'6b◊76R÷Ê÷R"ì∞¢–¢“6F6Ç∑–¢∆ˆ6Fñˆ‚Á&V∆ˆBÇì∞ß–†¶6ˆÁ7B$Ù‰EıEïU2“∞¢$gVÊ6ñˆÏ:&ñÚ"¿¢$g&VV∆Ê6W""¿¢%&W7FF˜""¿¢$76ó7FVÁFR"¿¢$W7Fvú:&ñÚ"¿¢$&VÊFó¢"¿¢%FV◊˜,:&ñÚ"¿¢%&6Vó&Ú"¿¢$˜WG&Ú"¿•”∞†¶6ˆÁ7BîÂdïDUı5DEU5Ùƒ$T≈2“∞¢VÁfñFÛ¢$wV&FÊFÚFóf:|:6Ú"¿¢Wáó&FÛ¢$Wáó&FÚ"¿¢FófÛ¢$FófÚ"¿¢6Ê6V∆FÛ¢$6Ê6V∆FÚ"¿ß”∞†¶6ˆÁ7B&∆Ê¥ñÁfóFTf˜&““∞¢Ê÷S¢""¿¢V÷ñ√¢""¿¢gVÊ7FñˆÂFóF∆S¢""¿¢&ˆÊEGóS¢""¿¢&ˆ∆S¢&6ˆ∆&˜&F˜""¿¢Fó&V7D÷ÊvW$ñC¢""¿ß”∞†¶6ˆÁ7BTDïEÙ5DîÙÂÙƒ$T≈2“∞¢6ˆÁfóFUˆ7&ñFÛ¢$6ˆÁfóFRVÁfñFÚ"¿¢6ˆÁfóFU˜&VVÁfñFÛ¢$6ˆÁfóFR&VVÁfñFÚ"¿¢6ˆÁfóFUˆ6Ê6V∆FÛ¢$6ˆÁfóFR6Ê6V∆FÚ"¿¢6ˆÁfóFUˆ6VóFÛ¢$6ˆÁfóFR6VóFÚ"¿¢6ˆ∆&˜&F˜%˜7W7VÁ6Û¢$6W76Ú7W7VÁ6Ú"¿¢6ˆ∆&˜&F˜%˜&VFófFÛ¢$6W76Ú&VFófFÚ"¿¢V≈ˆ«FW&FÛ¢%V¬«FW&FÚ"¿¢6ˆ∆&˜&F˜%˜&V÷˜fñFÛ¢$6ˆ∆&˜&F˜"&V÷˜fñFÚ"¿ß”∞†¶gVÊ7Fñˆ‚6ˆ∆∆&˜&F˜'2á≤F"¬WFFR¬6WEFˆ7B“í∞¢6ˆÁ7B∂FF¬6WDFF““W6U7FFRá∞¢÷V÷&W'3¢µ“¿¢ñÁfóFW3¢µ“¿¢76W3¢µ“¿¢6‰÷ÊvS¢G'VR¿¢“ì∞¢6ˆÁ7B∂f˜&“¬6WDf˜&’““W6U7FFRÜ&∆Ê¥ñÁfóFTf˜&“ì∞¢6ˆÁ7B∑6VÊFñÊr¬6WE6VÊFñÊu““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂VFóD˜V‚¬6WDVFóD˜VÂ““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂VFóD∆ˆw2¬6WDVFóD∆ˆw5““W6U7FFRÖµ“ì∞¢6ˆÁ7B∂VFóD∆ˆFñÊr¬6WDVFóD∆ˆFñÊu““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑FV‘f˜&“¬6WEFV‘f˜&’““W6U7FFRá≤Ê÷S¢""¬÷V÷&W$ñG3¢µ““ì∞¢6ˆÁ7B∂VFóFñÊuFV“¬6WDVFóFñÊuFV’““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B∑F"¬6WEF%““W6U7FFRÇ&6ˆ∆&˜&F˜&W2"ì∞¢6ˆÁ7B7FófR“7FófU76TñBÇì∞¢6ˆÁ7B6ˆ∆∆%VW'í“7FófRÚˆ˜vÊW#“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÜ7FófRó÷¢"#∞¢6ˆÁ7BFV◊2“F"ÁFV◊2«¬µ”∞¢6ˆÁ7B6fUFV““ÜRí”‚∞¢RÁ&WfVÁDFVfV«BÇì∞¢ñbÇFV‘f˜&“ÊÊ÷RÁG&ñ“Çíí&WGW&„∞¢WFFRÇÜBí”‚∞¢6ˆÁ7BóFV““∞¢ñC¢VFóFñÊuFV“«¬VñBÇí¿¢Ê÷S¢FV‘f˜&“ÊÊ÷RÁG&ñ“Çí¿¢÷V÷&W$ñG3¢FV‘f˜&“Ê÷V÷&W$ñG2¿¢”∞¢&WGW&‚∞¢‚‚ÊB¿¢FV◊3¢VFóFñÊuFV–¢ÚÜBÁFV◊2«¬µ“íÊ÷ÇáBí”‚áBÊñB””“VFóFñÊuFV“ÚóFV“¢Bíê¢¢≤‚‚‚ÜBÁFV◊2«¬µ“í¬óFV’“¿¢”∞¢“ì∞¢6WEFˆ7BÜVFóFñÊuFV“Ú$WVóRGV∆ó¶F"¢$WVóR7&ñF"ì∞¢6WEFV‘f˜&“á≤Ê÷S¢""¬÷V÷&W$ñG3¢µ““ì∞¢6WDVFóFñÊuFV“ÜÁV∆¬ì∞¢”∞¢6ˆÁ7BVFóEFV““áFV“í”‚∞¢6WDVFóFñÊuFV“áFV“ÊñBì∞¢6WEFV‘f˜&“á≤Ê÷S¢FV“ÊÊ÷R¬÷V÷&W$ñG3¢FV“Ê÷V÷&W$ñG2«¬µ““ì∞¢”∞¢6ˆÁ7B6Ê6V≈FV‘VFóB“Çí”‚∞¢6WDVFóFñÊuFV“ÜÁV∆¬ì∞¢6WEFV‘f˜&“á≤Ê÷S¢""¬÷V÷&W$ñG3¢µ““ì∞¢”∞¢6ˆÁ7B&V÷˜fUFV““ÜñBí”‚∞¢ñbÇ6ˆÊfó&“Ç$WÜ6«Vó"W7FWVóSÚ"íí&WGW&„∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬FV◊3¢ÜBÁFV◊2«¬µ“íÊfñ«FW"ÇáBí”‚BÊñB”“ñBí“íì∞¢ñbÜVFóFñÊuFV“””“ñBí6Ê6V≈FV‘VFóBÇì∞¢6WEFˆ7BÇ$WVóRWÜ6«\:÷F"ì∞¢”∞¢6ˆÁ7BFˆvv∆UFV‘÷V÷&W"“ÜñBí”‚∞¢6WEFV‘f˜&“ÇÜ7W'&VÁBí”‚á∞¢‚‚Ê7W'&VÁB¿¢÷V÷&W$ñG3¢7W'&VÁBÊ÷V÷&W$ñG2ÊñÊ6«VFW2ÜñBê¢Ú7W'&VÁBÊ÷V÷&W$ñG2Êfñ«FW"ÇáÇí”‚Ç”“ñBê¢¢≤‚‚Ê7W'&VÁBÊ÷V÷&W$ñG2¬ñE“¿¢“íì∞¢”∞¢6ˆÁ7B∆ˆB“W6T6∆∆&6≤Ä¢Çí”‡¢fWF6ÇÜˆíˆ6ˆ∆∆"G∂6ˆ∆∆%VW'ó÷¬≤ÜVFW'3¢WFÑÜVFW'2Çí“ê¢ÁFÜV‚Çá"í”‚á"Êˆ≤Ú"Êß6ˆ‚Çí¢ÁV∆¬íê¢ÁFÜV‚Ä¢ÜBí”‡¢Bb`¢6WDFFá∞¢÷V÷&W'3¢BÊ÷V÷&W'2«¬µ“¿¢ñÁfóFW3¢BÊñÁfóFW2«¬µ“¿¢76W3¢BÁ76W2«¬µ“¿¢6‰÷ÊvS¢BÊ6‰÷ÊvR”“f«6R¿¢“í¿¢ê¢Ê6F6ÇÇÇí”‚∑“í¿¢∂6ˆ∆∆%VW'ï“¿¢ì∞¢W6TVffV7BÇÇí”‚∞¢6ˆÁ7BñB“6WEFñ÷V˜WBÜ∆ˆB¬ì∞¢&WGW&‚Çí”‚6∆V%Fñ÷V˜WBÜñBì∞¢“¬∂∆ˆE“ì∞¢6ˆÁ7B6VÊDñÁfóFR“7ñÊ2ÜRí”‚∞¢RÁ&WfVÁDFVfV«BÇì∞¢ñbÇf˜&“ÊÊ÷RÁG&ñ“Çí«¬f˜&“ÊV÷ñ¬ÁG&ñ“Çíí&WGW&„∞¢6WE6VÊFñÊráG'VRì∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÜˆíˆ6ˆ∆∆"ˆñÁfóFRG∂6ˆ∆∆%VW'ó÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíÜf˜&“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬VÁfñ"Ú6ˆÁfóFR‚"ì∞¢6WDf˜&“Ü&∆Ê¥ñÁfóFTf˜&“ì∞¢∆ˆBÇì∞¢6WEFˆ7BÜ6ˆÁfóFRVÁfñFÚ&G∂f˜&“ÊV÷ñ«÷ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WE6VÊFñÊrÜf«6Rì∞¢–¢”∞¢6ˆÁ7B&W6VÊB“7ñÊ2ÜñBí”‚∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÜˆíˆ6ˆ∆∆"˜&W6VÊBG∂6ˆ∆∆%VW'ó÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤ñB“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬&VVÁfñ"‚"ì∞¢∆ˆBÇì∞¢6WEFˆ7BÇ$6ˆÁfóFR&VVÁfñFÚ"ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vRì∞¢–¢”∞¢6ˆÁ7B6Ê6VƒñÁfóFR“7ñÊ2ÜñBí”‚∞¢ñbÇ6ˆÊfó&“Ç$6Ê6V∆"W7FR6ˆÁfóFSÚ"íí&WGW&„∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÜˆíˆ6ˆ∆∆"ˆ6Ê6V¬G∂6ˆ∆∆%VW'ó÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤ñB“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6Ê6V∆"‚"ì∞¢∆ˆBÇì∞¢6WEFˆ7BÇ$6ˆÁfóFR6Ê6V∆FÚ"ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vRì∞¢–¢”∞¢6ˆÁ7B6WD÷V÷&W%7FGW2“7ñÊ2Ü÷V÷&W$ñB¬7FGW2í”‚∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÜˆíˆ6ˆ∆∆"ˆ÷V÷&W"◊7FGW2G∂6ˆ∆∆%VW'ó÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤÷V÷&W$ñB¬7FGW2“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬GV∆ó¶"Ú6W76Ú‚"ì∞¢∆ˆBÇì∞¢6WEFˆ7Bá7FGW2””“'7W7VÁ6Ú"Ú$6ˆ∆&˜&F˜"7W7VÁ6Ú"¢$6W76Ú&VFófFÚ"ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vRì∞¢–¢”∞¢6ˆÁ7B6WD÷V÷&W%&ˆ∆R“7ñÊ2Ü÷V÷&W$ñB¬&ˆ∆Rí”‚∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÜˆíˆ6ˆ∆∆"ˆ÷V÷&W"◊&ˆ∆RG∂6ˆ∆∆%VW'ó÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤÷V÷&W$ñB¬&ˆ∆R“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬GV∆ó¶"ÚV¬‚"ì∞¢∆ˆBÇì∞¢6WEFˆ7BÇ%V¬GV∆ó¶FÚ"ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vRì∞¢–¢”∞¢6ˆÁ7B&V÷˜fR“7ñÊ2ÜñBí”‚∞¢ñbÇ6ˆÊfó&“Ç%&V÷˜fW"W7FW76ˆFÚW7:vÛÚ"íí&WGW&„∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÜˆíˆ6ˆ∆∆"˜&V÷˜fRG∂6ˆ∆∆%VW'ó÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤÷V÷&W$ñC¢ñB“í¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬&V÷˜fW"‚"ì∞¢∆ˆBÇì∞¢6WEFˆ7BÇ$6ˆ∆&˜&F˜"&V÷˜fñFÚ"ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vRì∞¢–¢”∞¢6ˆÁ7BFˆvv∆TVFóB“7ñÊ2Çí”‚∞¢ñbÜVFóD˜V‚í∞¢6WDVFóD˜V‚Üf«6Rì∞¢&WGW&„∞¢–¢6WDVFóD∆ˆFñÊráG'VRì∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÜˆíˆ6ˆ∆∆"ˆVFóBG∂6ˆ∆∆%VW'ó÷¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢WFÑÜVFW'2Çí¿¢“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚Çì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6'&Vv"ÚÜó7L;7&ñ6Ú‚"ì∞¢6WDVFóD∆ˆw2ÜBÊ∆ˆw2«¬µ“ì∞¢6WDVFóD˜V‚áG'VRì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬6'&Vv"ÚÜó7L;7&ñ6Ú‚"ì∞¢“fñÊ∆«í∞¢6WDVFóD∆ˆFñÊrÜf«6Rì∞¢–¢”∞¢6ˆÁ7BVÊFñÊtñÁfóFW2“FFÊñÁfóFW2Êfñ«FW"Ä¢Üíí”‚íÁ7FGW2”“&FófÚ"bbíÁ7FGW2”“&6Ê6V∆FÚ"¿¢ì∞¢&WGW&‚Ä¢«6V7Fñˆ‚6∆74Ê÷S“'6V7Fñˆ‚#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#ÂU54Ù3¬˜7„‡¢∆É#‰6ˆÁfñFR6ˆ∆&˜&F˜&W2&Vó3¬ˆÉ#‡¢¬ˆFóc‡¢¬ˆFóc‡¢∂7FófRbbFFÊ6‰÷ÊvRbbÄ¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒ6ó&6∆T∆W'BÛ‡¢«7„‡¢fˆ<:¢W7L:F÷ñÊó7G&ÊFÚÚW7:vÚFR˜WG&W76ˆ6ˆ÷¢F÷ñÊó7G&F˜"6ˆÁfñFFÚ‚6ˆÁfóFW2¬:ñó2R&V÷¸:|;VW2&óÜ¢fWF“WVóRFW76RW7:vÚ¬Ï:6Ú7V‡¢¬˜7„‡¢¬ˆFóc‡¢ó–¢∂7FófRbbFFÊ6‰÷ÊvRbbÄ¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒ6ó&6∆T∆W'BÛ‡¢«7„‡¢fˆ<:¢W7L:fó7V∆ó¶ÊFÚ˜WG&ÚW7:vÚ¬÷2<;2VV“:íFˆÊÚ˜P¢F÷ñÊó7G&F˜"6ˆÁfñFFÚˆFRvW&VÊ6ñ"6ˆÁfóFW2¬:ñó2P¢&V÷¸:|;VW2˜"Ví‡¢¬˜7„‡¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'fñWr◊Fˆvv∆R#‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑F"””“&6ˆ∆&˜&F˜&W2"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEF"Ç&6ˆ∆&˜&F˜&W2"ó–¢‡¢≈W6W%&˜VÊBÛ‡¢6ˆ∆&˜&F˜&W0¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑F"””“&WVóW2"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEF"Ç&WVóW2"ó–¢‡¢≈W6W'2Û‡¢WVóW0¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑F"””“&W76˜2"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEF"Ç&W76˜2"ó–¢‡¢ƒ∆ñW'2Û‡¢W7:v˜2FRG&&∆Ü¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑F"””“&Üó7F˜&ñ6Ú"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEF"Ç&Üó7F˜&ñ6Ú"ó–¢‡¢ƒÜó7F˜'íÛ‡¢Üó7L;7&ñ6¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“&6ˆ∆∆"÷w&ñB#‡¢∑F"””“&6ˆ∆&˜&F˜&W2"bbÄ¢∆Fób6∆74Ê÷S“&6ˆ∆∆"÷6&BvñFR#‡¢∆É3‡¢≈W6W%&˜VÊBÛ‡¢6ˆÁfñF"6ˆ∆&˜&F˜ ¢¬ˆÉ3‡¢«‡¢W76ˆ&V6V&RV“R÷÷ñ¬6ˆ“V“∆ñÊ≤6VwW&Ú&7&ñ",;7&ñ¢6VÊÜRFóf"6ˆÁF‚FˆF˜2˜26ˆ∆&˜&F˜&W2Fóf˜2ˆFV–¢WFñ∆ó¶"FˆF22fW'&÷VÁF2F∆Ff˜&÷‡¢¬˜‡¢∆f˜&“6∆74Ê÷S“&ñÁfóFR÷f˜&“"ˆÂ7V&÷óC◊∑6VÊDñÁfóFW”‡¢∆Fób6∆74Ê÷S“&f˜&“÷w&ñB#‡¢ƒfñV∆B∆&V√“$Êˆ÷R#‡¢∆ñÁW@¢&WVó&V@¢f«VS◊∂f˜&“ÊÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬Ê÷S¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$R÷÷ñ¬#‡¢∆ñÁW@¢&WVó&V@¢GóS“&V÷ñ¬ ¢f«VS◊∂f˜&“ÊV÷ñ«–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬V÷ñ√¢RÁF&vWBÁf«VR“ó–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$gVÏ:|:6Ú#‡¢∆ñÁW@¢f«VS◊∂f˜&“ÊgVÊ7FñˆÂFóF∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WDf˜&“á≤‚‚Êf˜&“¬gVÊ7FñˆÂFóF∆S¢RÁF&vWBÁf«VR“ê¢–¢∆6VÜˆ∆FW#“$WÇ„¢FVÊFñ÷VÁFÚ¬fVÊF2‚‚‚ ¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%FóÚFRl:÷Ê7V∆Ú#‡¢«6V∆V7@¢f«VS◊∂f˜&“Ê&ˆÊEGóW–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬&ˆÊEGóS¢RÁF&vWBÁf«VR“ó–¢‡¢∆˜Fñˆ‚f«VS“"#‰Ï:6ÚñÊf˜&÷FÛ¬ˆ˜Fñˆ„‡¢¥$Ù‰EıEïU2Ê÷ÇÜ"í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂'”Á∂'”¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“%V¬ñÊñ6ñ¬#‡¢«6V∆V7@¢f«VS◊∂f˜&“Á&ˆ∆W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDf˜&“á≤‚‚Êf˜&“¬&ˆ∆S¢RÁF&vWBÁf«VR“ó–¢‡¢∆˜Fñˆ‚f«VS“&6ˆ∆&˜&F˜"#‰6ˆ∆&˜&F˜#¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&vW7F˜"#‰vW7F˜#¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&F÷ñ‚#‰F÷ñÊó7G&F˜#¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢∂FFÊ÷V÷&W'2Ê∆VÊwFÇ‚bbÄ¢ƒfñV∆B∆&V√“%&W7ˆÁ<:fV¬Fó&WFÚÜ˜6ñˆÊ¬í#‡¢«6V∆V7@¢f«VS◊∂f˜&“ÊFó&V7D÷ÊvW$ñG–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WDf˜&“á≤‚‚Êf˜&“¬Fó&V7D÷ÊvW$ñC¢RÁF&vWBÁf«VR“ê¢–¢‡¢∆˜Fñˆ‚f«VS“"#‰ÊVÊáV”¬ˆ˜Fñˆ„‡¢∂FFÊ÷V÷&W'2Ê÷ÇÜ“í”‚Ä¢∆˜Fñˆ‚∂Wì◊∂“ÊñG“f«VS◊∂“ÊñG”‡¢∂“ÊÊ÷W–¢¬ˆ˜Fñˆ„‡¢íó–¢¬˜6V∆V7C‡¢¬ÙfñV∆C‡¢ó–¢¬ˆFóc‡¢ƒ'WGFˆ‚GóS“'7V&÷óB"ñ6ˆ„◊µ6VÊG“Fó6&∆VC◊∑6VÊFñÊr«¬FFÊ6‰÷ÊvW”‡¢∑6VÊFñÊrÚ$VÁfñÊFÚ‚‚‚"¢$VÁfñ"6ˆÁfóFR'–¢¬Ù'WGFˆ„‡¢¬ˆf˜&”‡¢∑VÊFñÊtñÁfóFW2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&÷V÷&W"÷∆ó7B#‡¢«6÷∆¬6∆74Ê÷S“&÷V÷&W"◊FóF∆R#‰6ˆÁfóFW3¬˜6÷∆√‡¢∑VÊFñÊtñÁfóFW2Ê÷ÇÜñÁbí”‚Ä¢∆Fób∂Wì◊∂ñÁbÊñG”‡¢«7‚6∆74Ê÷S“&fF"#Á∂ñÁbÊÊ÷U≥◊”¬˜7„‡¢«7„‡¢«7G&ˆÊsÁ∂ñÁbÊÊ÷W”¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂ñÁbÊV÷ñ«“+r¥îÂdïDUı5DEU5Ùƒ$T≈5∂ñÁbÁ7FGW5“«¬ñÁbÁ7FGW7–¢¬˜6÷∆√‡¢¬˜7„‡¢«7‚6∆74Ê÷S“'F6≤÷7FñˆÁ2#‡¢≤ÜñÁbÁ7FGW2””“&VÁfñFÚ"«¬ñÁbÁ7FGW2””“&Wáó&FÚ"íbbÄ¢√‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢FóF∆S“%&VVÁfñ"6ˆÁfóFR ¢Fó6&∆VC◊≤FFÊ6‰÷ÊvW–¢ˆ‰6∆ñ6≥◊≤Çí”‚&W6VÊBÜñÁbÊñBó–¢‡¢≈&Vg&W6Ñ7rÛ‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FÊvW" ¢FóF∆S“$6Ê6V∆"6ˆÁfóFR ¢Fó6&∆VC◊≤FFÊ6‰÷ÊvW–¢ˆ‰6∆ñ6≥◊≤Çí”‚6Ê6VƒñÁfóFRÜñÁbÊñBó–¢‡¢≈ÇÛ‡¢¬ˆ'WGFˆ„‡¢¬Û‡¢ó–¢¬˜7„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢ó–¢∂FFÊ÷V÷&W'2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&÷V÷&W"÷∆ó7B#‡¢«6÷∆¬6∆74Ê÷S“&÷V÷&W"◊FóF∆R#‡¢∂7FófRÚ$ÊW7FRW7:vÚ"¢$ÊÚ6WRW7:vÚ'–¢¬˜6÷∆√‡¢∂FFÊ÷V÷&W'2Ê÷ÇÜ“í”‚Ä¢∆Fób∂Wì◊∂“ÊñG”‡¢«7‚6∆74Ê÷S“&fF"#Á∂“ÊÊ÷U≥◊”¬˜7„‡¢«7„‡¢«7G&ˆÊsÁ∂“ÊÊ÷W”¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂“ÊV÷ñ«“+r∂“Á7FGW2””“'7W7VÁ6Ú"Ú%7W7VÁ6Ú"¢$FófÚ'–¢¬˜6÷∆√‡¢¬˜7„‡¢«6V∆V7@¢f«VS◊∂“Á&ˆ∆W–¢&ñ÷∆&V√◊∂V¬FRG∂“ÊÊ÷W÷–¢Fó6&∆VC◊≤FFÊ6‰÷ÊvW–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WD÷V÷&W%&ˆ∆RÜ“ÊñB¬RÁF&vWBÁf«VRó–¢‡¢∆˜Fñˆ‚f«VS“&6ˆ∆&˜&F˜"#‰6ˆ∆&˜&F˜#¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&vW7F˜"#‰vW7F˜#¬ˆ˜Fñˆ„‡¢∆˜Fñˆ‚f«VS“&F÷ñ‚#‰F÷ñÊó7G&F˜#¬ˆ˜Fñˆ„‡¢¬˜6V∆V7C‡¢«7‚6∆74Ê÷S“'F6≤÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢FóF∆S◊∂“Á7FGW2””“'7W7VÁ6Ú"Ú%&VFóf"6W76Ú"¢%7W7VÊFW"6W76Ú'–¢Fó6&∆VC◊≤FFÊ6‰÷ÊvW–¢ˆ‰6∆ñ6≥◊≤Çí”‡¢6WD÷V÷&W%7FGW2Ä¢“ÊñB¿¢“Á7FGW2””“'7W7VÁ6Ú"Ú&FófÚ"¢'7W7VÁ6Ú"¿¢ê¢–¢‡¢∂“Á7FGW2””“'7W7VÁ6Ú"Ú≈∆íÛ‚¢ƒ6∆ˆ6≥2ÛÁ–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FÊvW" ¢FóF∆S“%&V÷˜fW" ¢Fó6&∆VC◊≤FFÊ6‰÷ÊvW–¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fRÜ“ÊñBó–¢‡¢≈G&6É"Û‡¢¬ˆ'WGFˆ„‡¢¬˜7„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ó–¢∑F"””“&W76˜2"bbÄ¢∆Fób6∆74Ê÷S“&6ˆ∆∆"÷6&BvñFR#‡¢∆É3‡¢ƒ∆ñW'2Û‡¢W7:v˜2FRG&&∆Ü¢¬ˆÉ3‡¢«‰«FW&ÊRVÁG&RÚ6WRW7:vÚR˜2W7:v˜2˜2Vó2fˆ<:¢fˆíFñ6ñˆÊFÚ„¬˜‡¢∆Fób6∆74Ê÷S“'76R÷∆ó7B#‡¢∆'WGFˆ‡¢6∆74Ê÷S◊≤7FófRÚ&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚7vóF6Ö76RÇ""ó–¢‡¢«7‚6∆74Ê÷S“&'W6ñÊW72÷fF"6÷∆¬#‡¢ƒ'Vñ∆FñÊs"Û‡¢¬˜7„‡¢«7„‡¢«7G&ˆÊs‰÷WRW7:vÛ¬˜7G&ˆÊs‡¢«6÷∆√Â6WW2,;7&ñ˜2&ˆ¶WF˜3¬˜6÷∆√‡¢¬˜7„‡¢≤7FófRbbƒ6ÜV6≤ÛÁ–¢¬ˆ'WGFˆ„‡¢∂FFÁ76W2Ê÷Çá2í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∑2Ê˜vÊW$ñG–¢6∆74Ê÷S◊∂7FófR””“2Ê˜vÊW$ñBÚ&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚7vóF6Ö76Rá2Ê˜vÊW$ñB¬2Ê˜vÊW$Ê÷Ró–¢‡¢«7‚6∆74Ê÷S“&'W6ñÊW72÷fF"6÷∆¬#Á∑2Ê˜vÊW$Ê÷U≥◊”¬˜7„‡¢«7„‡¢«7G&ˆÊsÁ∑2Ê˜vÊW$Ê÷W”¬˜7G&ˆÊs‡¢«6÷∆√Á∑2Ê˜vÊW$V÷ñ«”¬˜6÷∆√‡¢¬˜7„‡¢∂7FófR””“2Ê˜vÊW$ñBbbƒ6ÜV6≤ÛÁ–¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢∑F"””“&WVóW2"bbÄ¢∆Fób6∆74Ê÷S“&6ˆ∆∆"÷6&BvñFR#‡¢∆É3‡¢≈W6W'2Û‡¢WVóW0¢¬ˆÉ3‡¢«‡¢w'WR6ˆ∆&˜&F˜&W2V“WVóW2&6ˆ◊'Fñ∆Ü"F&Vf2¿¢Fˆ7V÷VÁF˜2R6óFW26ˆ“FˆFÚÚw'WÚFRV÷fW¢‡¢¬˜‡¢∆f˜&“6∆74Ê÷S“&ñÁfóFR÷f˜&“"ˆÂ7V&÷óC◊∑6fUFV◊”‡¢ƒfñV∆B∆&V√“$Êˆ÷RFWVóR#‡¢∆ñÁW@¢&WVó&V@¢f«VS◊∑FV‘f˜&“ÊÊ÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢6WEFV‘f˜&“á≤‚‚ÁFV‘f˜&“¬Ê÷S¢RÁF&vWBÁf«VR“ê¢–¢Û‡¢¬ÙfñV∆C‡¢∂FFÊ÷V÷&W'2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&fñV∆B#‡¢«7„‰ñÁFVw&ÁFW3¬˜7„‡¢∆Fób6∆74Ê÷S“&6ÜV6∂&˜Ç÷∆ó7B#‡¢∂FFÊ÷V÷&W'2Ê÷ÇÜ“í”‚Ä¢∆∆&V¬∂Wì◊∂“ÊñG“6∆74Ê÷S“&6˜7B÷6ÜV6≤#‡¢∆ñÁW@¢GóS“&6ÜV6∂&˜Ç ¢6ÜV6∂VC◊∑FV‘f˜&“Ê÷V÷&W$ñG2ÊñÊ6«VFW2Ü“ÊñBó–¢ˆ‰6ÜÊvS◊≤Çí”‚Fˆvv∆UFV‘÷V÷&W"Ü“ÊñBó–¢Û‡¢∂“ÊÊ÷W–¢¬ˆ∆&V√‡¢íó–¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'F6≤÷7FñˆÁ2#‡¢ƒ'WGFˆ‚GóS“'7V&÷óB"ñ6ˆ„◊∂VFóFñÊuFV“Ú6fR¢«W7”‡¢∂VFóFñÊuFV“Ú%6«f"WVóR"¢$7&ñ"WVóR'–¢¬Ù'WGFˆ„‡¢∂VFóFñÊuFV“bbÄ¢ƒ'WGFˆ‚f&ñÁC“&vÜ˜7B"GóS“&'WGFˆ‚"ˆ‰6∆ñ6≥◊∂6Ê6V≈FV‘VFóG”‡¢6Ê6V∆ ¢¬Ù'WGFˆ„‡¢ó–¢¬ˆFóc‡¢¬ˆf˜&”‡¢∑FV◊2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&÷V÷&W"÷∆ó7B#‡¢«6÷∆¬6∆74Ê÷S“&÷V÷&W"◊FóF∆R#Â7V2WVóW3¬˜6÷∆√‡¢∑FV◊2Ê÷ÇáBí”‚Ä¢∆Fób∂Wì◊∑BÊñG”‡¢«7‚6∆74Ê÷S“&fF"#Á∑BÊÊ÷U≥◊”¬˜7„‡¢«7„‡¢«7G&ˆÊsÁ∑BÊÊ÷W”¬˜7G&ˆÊs‡¢«6÷∆√‡¢≤áBÊ÷V÷&W$ñG2«¬µ“íÊ∆VÊwFá“ñÁFVw&ÁFP¢≤áBÊ÷V÷&W$ñG2«¬µ“íÊ∆VÊwFÇ””“Ú""¢'2'–¢¬˜6÷∆√‡¢¬˜7„‡¢«7‚6∆74Ê÷S“'F6≤÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢FóF∆S“$VFóF"WVóR ¢ˆ‰6∆ñ6≥◊≤Çí”‚VFóEFV“áBó–¢‡¢ƒVFóC2Û‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FÊvW" ¢FóF∆S“$WÜ6«Vó"WVóR ¢ˆ‰6∆ñ6≥◊≤Çí”‚&V÷˜fUFV“áBÊñBó–¢‡¢≈G&6É"Û‡¢¬ˆ'WGFˆ„‡¢¬˜7„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ó–¢∑F"””“&Üó7F˜&ñ6Ú"bbÄ¢∆Fób6∆74Ê÷S“&6ˆ∆∆"÷6&BvñFR#‡¢∆É3‡¢ƒÜó7F˜'íÛ‡¢Üó7L;7&ñ6ÚFR:|;VW0¢¬ˆÉ3‡¢«Â&Vvó7G&ÚFR6ˆÁfóFW2¬:ñó2R6W76˜2«FW&F˜2ÊÚ6WRW7:vÚ„¬˜‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥Üó7F˜'ó–¢ˆ‰6∆ñ6≥◊∑Fˆvv∆TVFóG–¢Fó6&∆VC◊∂VFóD∆ˆFñÊw–¢‡¢∂VFóD∆ˆFñÊp¢Ú$6'&VvÊFÚ‚‚‚ ¢¢VFóD˜V‡¢Ú$ˆ7V«F"Üó7L;7&ñ6Ú ¢¢%fW"Üó7L;7&ñ6Ú'–¢¬Ù'WGFˆ„‡¢∂VFóD˜V‚bbÄ¢∆Fób6∆74Ê÷S“&÷V÷&W"÷∆ó7B#‡¢∂VFóD∆ˆw2Ê∆VÊwFÇ””“bbÄ¢«6÷∆¬6∆74Ê÷S“&÷V÷&W"◊FóF∆R#‡¢ÊVÊáV÷:|:6Ú&Vvó7G&FñÊF‡¢¬˜6÷∆√‡¢ó–¢∂VFóD∆ˆw2Ê÷ÇÜ∆ˆrí”‚Ä¢∆Fób∂Wì◊∂∆ˆrÊñG”‡¢«7‚6∆74Ê÷S“&fF"#Á∂∆ˆrÊ7F˜$Ê÷U≥◊”¬˜7„‡¢«7„‡¢«7G&ˆÊs‡¢∂∆ˆrÊ7F˜$Ê÷W“+w≤"'–¢¥TDïEÙ5DîÙÂÙƒ$T≈5∂∆ˆrÊ7FñˆÂ“«¬∆ˆrÊ7FñˆÁ–¢¬˜7G&ˆÊs‡¢«6÷∆√‡¢µ∂∆ˆrÁF&vWB¬∆ˆrÊFWFñ«5–¢Êfñ«FW"Ñ&ˆˆ∆V‚ê¢Ê¶ˆñ‚Ç"+r"ó–¢∂∆ˆrÁF&vWB«¬∆ˆrÊFWFñ«2Ú"+r"¢"'–¢∂ÊWrFFRÜ∆ˆrÊ7&VFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó–¢¬˜6÷∆√‡¢¬˜7„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ì∞ß–†¶gVÊ7Fñˆ‚FV“á≤F"¬WFFR¬6WEFˆ7B“í∞¢6ˆÁ7B∂ÊWtV◊∆˜ñVR¬6WDÊWtV◊∆˜ñVU““W6U7FFRÜf«6Rì∞¢6ˆÁ7B7FófR“F"Á&VfW&VÊ6W2Á7V6ñ∆ó7C∞¢6ˆÁ7B6V∆V7B“ÜÊ÷Rí”‚∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢&VfW&VÊ6W3¢≤‚‚ÊBÁ&VfW&VÊ6W2¬7V6ñ∆ó7C¢Ê÷R“¿¢“íì∞¢6WEFˆ7BÜG∂Ê÷W“v˜&W7L:ÊÚ6ˆ÷ÊFˆì∞¢”∞¢6ˆÁ7BFó6÷ó72“ÜÊ÷Rí”‚∞¢ñbÄ¢6ˆÊfó&“Ä¢Fó7VÁ6"ÚgVÊ6ñˆÏ:&ñÚFRG∂Ê÷W”ÚÚÜó7L;7&ñ6ÚFR6ˆÁfW'62:í÷ÁFñFÚÊ¿¢ê¢ê¢&WGW&„∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢7W7Fˆ’7V6ñ∆ó7G3¢ÜBÊ7W7Fˆ’7V6ñ∆ó7G2«¬µ“íÊfñ«FW"Ä¢áÇí”‚ÇÊÊ÷R”“Ê÷R¿¢í¿¢&VfW&VÊ6W3¢∞¢‚‚ÊBÁ&VfW&VÊ6W2¿¢7V6ñ∆ó7C†¢BÁ&VfW&VÊ6W2Á7V6ñ∆ó7B””“Ê÷P¢Ú$Fó&WF˜" ¢¢BÁ&VfW&VÊ6W2Á7V6ñ∆ó7B¿¢“¿¢“íì∞¢6WEFˆ7BÇ$gVÊ6ñˆÏ:&ñÚFó7VÁ6FÚ"ì∞¢”∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$‘URDî‘R ¢FóF∆S“$÷ˆÁFR7VWVóRFñvóF¬ ¢FWáC“$W66ˆ∆ÜVV“77V÷R6F6ˆÁfW'6‚6ˆÁG&FRW7V6ñ∆ó7F26ˆ"÷VFñF&Ú6WRÊV|;66ñÚV«VW"÷ˆ÷VÁFÚ‚ ¢7Fñˆ„◊∞¢ƒ'WGFˆ‚ñ6ˆ„◊µ«W7“ˆ‰6∆ñ6≥◊≤Çí”‚6WDÊWtV◊∆˜ñVRáG'VRó”‡¢6ˆÁG&F"gVÊ6ñˆÏ:&ñ¢¬Ù'WGFˆ„‡¢–¢‡¢∆Fób6∆74Ê÷S“'FV“÷ÜW&Ú#‡¢«7‚6∆74Ê÷S“'FV“÷ÜW&Ú÷ñ6ˆ‚#‡¢ƒ&˜BÛ‡¢¬˜7„‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r∆ñváB#‰eT‰4îÙÏ8$îÚDïdÛ¬˜7„‡¢∆É#Á∂7FófW”¬ˆÉ#‡¢«‡¢∑7V6ñ∆ó7DFFÊfñÊBÇá2í”‚5≥“””“7FófRìÚÂ≥%“«¿¢ÜF"Ê7W7Fˆ’7V6ñ∆ó7G2«¬µ“íÊfñÊBÇáÇí”‚ÇÊÊ÷R””“7FófRê¢ÚÊñÁ7G'V7FñˆÁ2«¿¢$W7V6ñ∆ó7F6ˆ"÷VFñFFÚ6WRFñ÷R‚'–¢¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢ƒ6ˆ∆∆&˜&F˜'2F#◊∂F'“WFFS◊∑WFFW“6WEFˆ7C◊∑6WEFˆ7G“Û‡¢≤ÜF"Ê7W7Fˆ’7V6ñ∆ó7G2«¬µ“íÊ∆VÊwFÇ‚bbÄ¢«6V7Fñˆ‚6∆74Ê÷S“'6V7Fñˆ‚#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰4ÙÂE$DDı2ı"dÙ<8£¬˜7„‡¢∆É#‰gVÊ6ñˆÏ:&ñ˜26ˆ"÷VFñF¬ˆÉ#‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'FV“÷w&ñB#‡¢∂F"Ê7W7Fˆ’7V6ñ∆ó7G2Ê÷ÇÜ2í”‚Ä¢∆'Fñ6∆P¢6∆74Ê÷S◊∂7FófR””“2ÊÊ÷RÚ&7FófR"¢"'–¢∂Wì◊∂2ÊÊ÷W–¢‡¢«7‚6∆74Ê÷S“'FV“÷fF"7W7Fˆ“#‡¢≈7&∂∆RÛ‡¢¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÁ∂2ÊÊ÷W”¬˜7G&ˆÊs‡¢«6÷∆√Á∂2ÊñÁ7G'V7FñˆÁ7”¬˜6÷∆√‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'FV“÷7FñˆÁ2#‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂7FófR””“2ÊÊ÷RÚ&6Üóˆ‚"¢&6Üó'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6V∆V7BÜ2ÊÊ÷Ró–¢‡¢∂7FófR””“2ÊÊ÷RÚÄ¢√‡¢ƒ6ÜV6≤Û‡¢ÊÚ6ˆ÷ÊF¢¬Û‡¢í¢Ä¢$6ˆ∆ˆ6"ÊÚ6ˆ÷ÊFÚ ¢ó–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FÊvW" ¢FóF∆S“$Fó7VÁ6" ¢ˆ‰6∆ñ6≥◊≤Çí”‚Fó6÷ó72Ü2ÊÊ÷Ró–¢‡¢≈G&6É"Û‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ó–¢«6V7Fñˆ‚6∆74Ê÷S“'6V7Fñˆ‚#‡¢∆Fób6∆74Ê÷S“'6V7Fñˆ‚÷ÜVB#‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r#‰UTïRE,84Û¬˜7„‡¢∆É#Á∑7V6ñ∆ó7DFFÊ∆VÊwFá“W7V6ñ∆ó7F26V◊&RFó7ˆÏ:◊fVó3¬ˆÉ#‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'FV“÷w&ñB#‡¢∑7V6ñ∆ó7DFFÊ÷ÇÖ∂‚¬í¬E“¬íí”‚Ä¢∆'Fñ6∆R6∆74Ê÷S◊∂7FófR””“‚Ú&7FófR"¢"'“∂Wì◊∂Á”‡¢«7‚6∆74Ê÷S◊∂FV“÷fF"BG∂íRg÷”‡¢ƒíÛ‡¢¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÁ∂Á”¬˜7G&ˆÊs‡¢«6÷∆√Á∂G”¬˜6÷∆√‡¢¬ˆFóc‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂7FófR””“‚Ú&6Üóˆ‚"¢&6Üó'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6V∆V7BÜ‚ó–¢‡¢∂7FófR””“‚ÚÄ¢√‡¢ƒ6ÜV6≤Û‡¢ÊÚ6ˆ÷ÊF¢¬Û‡¢í¢Ä¢$6ˆ∆ˆ6"ÊÚ6ˆ÷ÊFÚ ¢ó–¢¬ˆ'WGFˆ„‡¢¬ˆ'Fñ6∆S‡¢íó–¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢∂ÊWtV◊∆˜ñVRbbÄ¢ƒÊWtV◊∆˜ñVT÷ˆF¿¢ˆ‰6∆˜6S◊≤Çí”‚6WDÊWtV◊∆˜ñVRÜf«6Ró–¢ˆÂ6fS◊≤ÜV◊í”‚∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢7W7Fˆ’7V6ñ∆ó7G3¢∞¢‚‚‚ÜBÊ7W7Fˆ’7V6ñ∆ó7G2«¬µ“íÊfñ«FW"Ä¢áÇí”‚ÇÊÊ÷R”“V◊ÊÊ÷R¿¢í¿¢V◊¿¢“¿¢&VfW&VÊ6W3¢≤‚‚ÊBÁ&VfW&VÊ6W2¬7V6ñ∆ó7C¢V◊ÊÊ÷R“¿¢“íì∞¢6WDÊWtV◊∆˜ñVRÜf«6Rì∞¢6WEFˆ7BÜgVÊ6ñˆÏ:&ñÚFRG∂V◊ÊÊ÷W“6ˆÁG&FFˆì∞¢◊–¢Û‡¢ó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶gVÊ7Fñˆ‚WáFVÁ6ñˆ‰6&Bá≤6WEFˆ7B“í∞¢6ˆÁ7B∑6Ü˜v‚¬6WE6Ü˜vÂ““W6U7FFRÜf«6Rì∞¢6ˆÁ7BFˆ∂V‚–¢GóVˆb∆ˆ6≈7F˜&vR”“'VÊFVfñÊVB ¢Ú∆ˆ6≈7F˜&vRÊvWDóFV“ÑUDÖıDÙ¥TÂÙ¥Uíí«¬" ¢¢"#∞¢6ˆÁ7B÷6∂VB“Fˆ∂V‚ÚG∑Fˆ∂V‚Á6∆ñ6RÉ¬bó“G≤.(
""Á&WVBÉ"ó÷¢"#∞¢6ˆÁ7B6˜í“7ñÊ2Çí”‚∞¢ñbÇFˆ∂V‚í&WGW&„∞¢G'í∞¢vóBÊfñvF˜"Ê6∆ó&ˆ&BÁw&óFUFWáBáFˆ∂V‚ì∞¢6WEFˆ7BÇ%Fˆ∂V‚6˜ñFÚ(	B6ˆ∆RÊWáFVÁ<:6Ú"ì∞¢“6F6Ç∞¢6WEFˆ7BÇ$Ï:6Úfˆí˜7<:◊fV¬6˜ñ"v˜&"ì∞¢–¢”∞¢&WGW&‚Ä¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B"ñC“'6WGFñÊw2÷WáFVÁ6ñˆ‚#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢≈«VrÛ‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰WáFVÁ<:6ÚFÚÊfVvF˜#¬ˆÉ#‡¢«ÂW6RîFÚV“V«VW":vñÊFñÁFW&ÊWB„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢«6∆74Ê÷S“'6WGFñÊw2÷Ê˜FR#‡¢ñÁ7F∆RWáFVÁ<:6Úá7F∆6ˆFSÊWáFVÁ6ñˆ‚Û¬ˆ6ˆFS‚FÚ&ˆ¶WFÚíR6ˆÊV7FP¢6ˆ“ÚFˆ∂V‚&óÜÚ‚V∆Rfñ6<;2ÊÚ6WRÊfVvF˜"R6W'fR&WáFVÁ<:6¢f∆"6ˆ“÷W6÷î(	B6V“7W7FÚWáG&‡¢¬˜‡¢ƒfñV∆B∆&V√“%6WRFˆ∂V‚FR6W76Ú#‡¢∆ñÁW@¢f«VS◊∑6Ü˜v‚ÚFˆ∂V‚¢÷6∂VG–¢&VDˆÊ«ê¢6∆74Ê÷S“'&VFˆÊ«í ¢&ñ÷∆&V√“%Fˆ∂V‚FR6W76Ú ¢Û‡¢¬ÙfñV∆C‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ˆ‰6∆ñ6≥◊≤Çí”‚6WE6Ü˜v‚Çá2í”‚2ó”‡¢∑6Ü˜v‚Ú$ˆ7V«F""¢$÷˜7G&"'–¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‚ñ6ˆ„◊¥6˜ó“ˆ‰6∆ñ6≥◊∂6˜ó“Fó6&∆VC◊≤Fˆ∂VÁ”‡¢6˜ñ"Fˆ∂V‡¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ì∞ß–†¶gVÊ7Fñˆ‚66˜VÁE6WGFñÊw2á≤F"¬WFFR¬6WEFˆ7B¬vÚ“í∞¢6ˆÁ7B∂Ê÷R¬6WDÊ÷U““W6U7FFRÜF"ÁW6W"ÊÊ÷Rì∞¢6ˆÁ7B∂'W7í¬6WD'W7ï““W6U7FFRÜf«6Rí¿¢∂W'"¬6WDW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∂FV∆WFT˜V‚¬6WDFV∆WFT˜VÂ““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂FV∆WFT6ˆÊfó&“¬6WDFV∆WFT6ˆÊfó&’““W6U7FFRÇ""ì∞¢6ˆÁ7B∂FV∆WFñÊr¬6WDFV∆WFñÊu““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂FV∆WFTW'"¬6WDFV∆WFTW'%““W6U7FFRÇ""ì∞¢6ˆÁ7B∂W'&˜$∆ˆw2¬6WDW'&˜$∆ˆw5““W6U7FFRÖµ“ì∞¢6ˆÁ7B∂W'&˜$∆ˆw4˜V‚¬6WDW'&˜$∆ˆw4˜VÂ““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂W'&˜$∆ˆw4∆ˆFñÊr¬6WDW'&˜$∆ˆw4∆ˆFñÊu““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂W'&˜$∆ˆw4∆ˆFVB¬6WDW'&˜$∆ˆw4∆ˆFVE““W6U7FFRÜf«6Rì∞¢6ˆÁ7BFˆvv∆TW'&˜$∆ˆw2“7ñÊ2Çí”‚∞¢ñbÜW'&˜$∆ˆw4˜V‚í∞¢6WDW'&˜$∆ˆw4˜V‚Üf«6Rì∞¢&WGW&„∞¢–¢6WDW'&˜$∆ˆw4˜V‚áG'VRì∞¢ñbÜW'&˜$∆ˆw4∆ˆFVBí&WGW&„∞¢6WDW'&˜$∆ˆw4∆ˆFñÊráG'VRì∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÇ"ˆíˆW'&˜'2"¬≤ÜVFW'3¢WFÑÜVFW'2Çí“ì∞¢6ˆÁ7BB“vóB"Êß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜBÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6'&Vv"˜2W'&˜2‚"ì∞¢6WDW'&˜$∆ˆw2ÜBÊ∆ˆw2«¬µ“ì∞¢6WDW'&˜$∆ˆw4∆ˆFVBáG'VRì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vRì∞¢6WDW'&˜$∆ˆw4˜V‚Üf«6Rì∞¢“fñÊ∆«í∞¢6WDW'&˜$∆ˆw4∆ˆFñÊrÜf«6Rì∞¢–¢”∞¢6ˆÁ7BW6Ö7W˜'FVB–¢GóVˆbvñÊF˜r”“'VÊFVfñÊVB"b`¢'6W'fñ6Uv˜&∂W""ñ‚ÊfñvF˜"b`¢%W6Ñ÷ÊvW""ñ‚vñÊF˜rb`¢GóVˆbÊ˜Fñfñ6Fñˆ‚”“'VÊFVfñÊVB#∞¢6ˆÁ7B∑fñEV&∆ñ4∂Wí¬6WEfñEV&∆ñ4∂Wï““W6U7FFRÇ""ì∞¢6ˆÁ7B∑W6Ö7V'67&ñ&VB¬6WEW6Ö7V'67&ñ&VE““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑W6Ñ'W7í¬6WEW6Ñ'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑W6Ñ6ÜV6∂VB¬6WEW6Ñ6ÜV6∂VE““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∑7W˜'DV÷ñ¬¬6WE7W˜'DV÷ñ≈““W6U7FFRÇ""ì∞¢6ˆÁ7B∑6W'fñ6U7FGW2¬6WE6W'fñ6U7FGW5““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B∑W6vT÷WG&ñ72¬6WEW6vT÷WG&ñ75““W6U7FFRÜÁV∆¬ì∞¢6ˆÁ7B∂÷WG&ñ74'W7í¬6WD÷WG&ñ74'W7ï““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂&6∑W2¬6WD&6∑W5““W6U7FFRÖµ“ì∞¢6ˆÁ7B∂&6∑W4'W7í¬6WD&6∑W4'W7ï““W6U7FFRÜf«6Rì∞¢W6TVffV7BÇÇí”‚∞¢fWF6ÇÇ"ˆíˆ6ˆÊfñr"ê¢ÁFÜV‚Çá"í”‚"Êß6ˆ‚Çíê¢ÁFÜV‚ÇÜBí”‚∞¢6WEfñEV&∆ñ4∂WíÜBÁfñEV&∆ñ4∂Wí«¬""ì∞¢6WE7W˜'DV÷ñ¬ÜBÁ7W˜'DV÷ñ¬«¬""ì∞¢“ê¢Ê6F6ÇÇÇí”‚∑“ì∞¢fWF6ÇÇ"ˆí˜7FGW2"ê¢ÁFÜV‚Çá"í”‚"Êß6ˆ‚Çíê¢ÁFÜV‚ÇÜBí”‚6WE6W'fñ6U7FGW2ÜBíê¢Ê6F6ÇÇÇí”‚6WE6W'fñ6U7FGW2á≤7FGW3¢&ñÊFó7ˆÏ:◊fV¬"“íì∞¢ñbÇW6Ö7W˜'FVBí&WGW&„∞¢ÊfñvF˜"Á6W'fñ6Uv˜&∂W"Á&VGê¢ÁFÜV‚Çá&Vvó7G&Fñˆ‚í”‚&Vvó7G&Fñˆ‚ÁW6Ñ÷ÊvW"ÊvWE7V'67&óFñˆ‚Çíê¢ÁFÜV‚Çá7V'67&óFñˆ‚í”‚6WEW6Ö7V'67&ñ&VBÇ7V'67&óFñˆ‚íê¢Ê6F6ÇÇÇí”‚∑“ê¢ÊfñÊ∆«íÇÇí”‚6WEW6Ñ6ÜV6∂VBáG'VRíì∞¢“¬∑W6Ö7W˜'FVE“ì∞¢6ˆÁ7B∆ˆEW6vT÷WG&ñ72“7ñÊ2Çí”‚∞¢6WD÷WG&ñ74'W7íáG'VRì∞¢G'í∞¢6ˆÁ7B76R“7FófU76TñBÇì∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÄ¢ˆíˆWfVÁG2G∑76RÚˆ˜vÊW#“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBá76Ró÷¢"'÷¿¢≤ÜVFW'3¢WFÑÜVFW'2Çí“¿¢ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6'&Vv"˜2ñÊFñ6F˜&W2‚"ì∞¢6WEW6vT÷WG&ñ72ÜFFì∞¢“6F6ÇÜW'&˜"í∞¢6WEFˆ7BÜW'&˜"Ê÷W76vRì∞¢“fñÊ∆«í∞¢6WD÷WG&ñ74'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7B&6∑WW&¬“Çí”‚∞¢6ˆÁ7B76R“7FófU76TñBÇì∞¢&WGW&‚ˆí˜v˜&∑76Rˆ&6∑W2G∑76RÚˆ˜vÊW#“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBá76Ró÷¢"'÷∞¢”∞¢6ˆÁ7B∆ˆD&6∑W2“7ñÊ2Çí”‚∞¢6WD&6∑W4'W7íáG'VRì∞¢G'í∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÜ&6∑WW&¬Çí¬≤ÜVFW'3¢WFÑÜVFW'2Çí“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6'&Vv"˜2&6∑W2‚"ì∞¢6WD&6∑W2ÜFFÊ&6∑W2«¬µ“ì∞¢“6F6ÇÜW'&˜"í∞¢6WEFˆ7BÜW'&˜"Ê÷W76vRì∞¢“fñÊ∆«í∞¢6WD&6∑W4'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7B&W7F˜&T&6∑W“7ñÊ2Ü&6∑Wí”‚∞¢6ˆÁ7BvÜV‚“ÊWrFFRÜ&6∑WÊ7&VFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ì∞¢ñbÄ¢6ˆÊfó&“Ä¢&W7FW&"fW'<:6ÚG∂&6∑WÁ&Wfó6ñˆÁ“¬6«fV“G∑vÜVÁ”ÚfW'<:6ÚGV¬F÷,:ñ“6W,:&W6W'fFÊÚÜó7L;7&ñ6ÚÊ¿¢ê¢ê¢&WGW&„∞¢6WD&6∑W4'W7íáG'VRì∞¢G'í∞¢6ˆÁ7B76T∂Wí“7FófU76TñBÇí«¬F"ÁW6W"ÊñC∞¢6ˆÁ7B&W7ˆÁ6R“vóBfWF6ÇÜ&6∑WW&¬Çí¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá∞¢6Ê6Ü˜DñC¢&6∑WÊñB¿¢&Wfó6ñˆ„¢&VEv˜&∑76U&Wfó6ñˆ‚á76T∂Wíí¿¢“í¿¢“ì∞¢6ˆÁ7BFF“vóB&W7ˆÁ6RÊß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ&W7ˆÁ6RÊˆ≤ê¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬&W7FW&"Ú&6∑W‚"ì∞¢7F˜&Uv˜&∑76U&Wfó6ñˆ‚á76T∂Wí¬FFÁ&Wfó6ñˆ‚ì∞¢6WEFˆ7BÇ%fW'<:6Ú&W7FW&F‚GV∆ó¶ÊFÚÚW7:vÚ‚‚‚"ì∞¢vñÊF˜rÁ6WEFñ÷V˜WBÇÇí”‚vñÊF˜rÊ∆ˆ6Fñˆ‚Á&V∆ˆBÇí¬Cì∞¢“6F6ÇÜW'&˜"í∞¢6WEFˆ7BÜW'&˜"Ê÷W76vRì∞¢6WD&6∑W4'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7BF˜vÊ∆ˆDFñvÊ˜7Fñ72“Çí”‚∞¢6ˆÁ7Bñ∆ˆB“∞¢vVÊW&FVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢fW'6ñˆ„¢6W'fñ6U7FGW3ÚÁfW'6ñˆ‚«¬&FW66ˆÊÜV6ñF"¿¢6W'fñ6U7FGW3¢6W'fñ6U7FGW3ÚÁ7FGW2«¬&FW66ˆÊÜV6ñFÚ"¿¢'&˜w6W#¢ÊfñvF˜"ÁW6W$vVÁB¿¢&V6VÁDW'&˜'3¢W'&˜$∆ˆw2Á6∆ñ6RÉ¬í¿¢”∞¢6ˆÁ7B&∆ˆ"“ÊWr&∆ˆ"Ö¥•4Ù‚Á7G&ñÊvñgíáñ∆ˆB¬ÁV∆¬¬"ï“¬∞¢GóS¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¿¢“ì∞¢6ˆÁ7B∆ñÊ≤“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢∆ñÊ≤Êá&Vb“U$¬Ê7&VFTˆ&¶V7EU$¬Ü&∆ˆ"ì∞¢∆ñÊ≤ÊF˜vÊ∆ˆB“&FñvÊ˜7Fñ6Ú◊6WR÷gVÊ6ñˆÊ&ñÚÊß6ˆ‚#∞¢∆ñÊ≤Ê6∆ñ6≤Çì∞¢U$¬Á&Wfˆ∂Tˆ&¶V7EU$¬Ü∆ñÊ≤Êá&Vbì∞¢6WEFˆ7BÇ$FñvÏ;77Fñ6Ú&W&FÚ&Ú7W˜'FR"ì∞¢”∞¢6ˆÁ7BVÊ&∆UW6Ç“7ñÊ2Çí”‚∞¢ñbÇfñEV&∆ñ4∂Wíí∞¢6WEFˆ7BÇ$Ê˜Fñfñ6:|;VW2FÚÊfVvF˜"Ï:6ÚW7L:6Ú6ˆÊfñwW&F2‚"ì∞¢&WGW&„∞¢–¢6WEW6Ñ'W7íáG'VRì∞¢G'í∞¢6ˆÁ7BW&÷ó76ñˆ‚“vóBÊ˜Fñfñ6Fñˆ‚Á&WVW7EW&÷ó76ñˆ‚Çì∞¢ñbáW&÷ó76ñˆ‚”“&w&ÁFVB"í∞¢6WEFˆ7BÇ%W&÷ó7<:6ÚFRÊ˜Fñfñ6:|:6ÚÊVvF‚"ì∞¢&WGW&„∞¢–¢6ˆÁ7B&Vvó7G&Fñˆ‚“vóBÊfñvF˜"Á6W'fñ6Uv˜&∂W"Á&VGì∞¢6ˆÁ7B7V'67&óFñˆ‚“vóB&Vvó7G&Fñˆ‚ÁW6Ñ÷ÊvW"Á7V'67&ñ&Rá∞¢W6W%fó6ñ&∆TˆÊ«ì¢G'VR¿¢∆ñ6FñˆÂ6W'fW$∂Wì¢W&ƒ&6ScEFıVñÁCÑ'&íáfñEV&∆ñ4∂Wíí¿¢“ì∞¢6ˆÁ7B"“vóBfWF6ÇÇ"ˆí˜W6Ç˜7V'67&ñ&R"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá7V'67&óFñˆ‚ÁFÙ•4Ù‚Çíí¿¢“ì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"Ç$Ï:6Úfˆí˜7<:◊fV¬Fóf"2Ê˜Fñfñ6:|;VW2‚"ì∞¢6WEW6Ö7V'67&ñ&VBáG'VRì∞¢6WEFˆ7BÇ$Ê˜Fñfñ6:|;VW2FÚÊfVvF˜"FófF2"ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬Fóf"2Ê˜Fñfñ6:|;VW2‚"ì∞¢“fñÊ∆«í∞¢6WEW6Ñ'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7BFó6&∆UW6Ç“7ñÊ2Çí”‚∞¢6WEW6Ñ'W7íáG'VRì∞¢G'í∞¢6ˆÁ7B&Vvó7G&Fñˆ‚“vóBÊfñvF˜"Á6W'fñ6Uv˜&∂W"Á&VGì∞¢6ˆÁ7B7V'67&óFñˆ‚“vóB&Vvó7G&Fñˆ‚ÁW6Ñ÷ÊvW"ÊvWE7V'67&óFñˆ‚Çì∞¢ñbá7V'67&óFñˆ‚í∞¢vóBfWF6ÇÇ"ˆí˜W6Ç˜VÁ7V'67&ñ&R"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤VÊGˆñÁC¢7V'67&óFñˆ‚ÊVÊGˆñÁB“í¿¢“ì∞¢vóB7V'67&óFñˆ‚ÁVÁ7V'67&ñ&RÇì∞¢–¢6WEW6Ö7V'67&ñ&VBÜf«6Rì∞¢6WEFˆ7BÇ$Ê˜Fñfñ6:|;VW2FÚÊfVvF˜"FW6FófF2"ì∞¢“6F6ÇÜRí∞¢6WEFˆ7BÜRÊ÷W76vR«¬$Ï:6Úfˆí˜7<:◊fV¬FW6Fóf"2Ê˜Fñfñ6:|;VW2‚"ì∞¢“fñÊ∆«í∞¢6WEW6Ñ'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7Bv˜&∑76U6ó¶T'óFW2“ÇÇí”‚∞¢G'í∞¢&WGW&‚ÊWr&∆ˆ"Ö¥•4Ù‚Á7G&ñÊvñgíÜF"ï“íÁ6ó¶S∞¢“6F6Ç∞¢&WGW&‚∞¢–¢“íÇì∞¢6ˆÁ7Bv˜&∑76U6ó¶T∆ñ÷óB“ìÛ∞¢6ˆÁ7Bv˜&∑76U6ó¶U7B“÷FÇÊ÷ñ‚Ä¢¿¢÷FÇÁ&˜VÊBÇáv˜&∑76U6ó¶T'óFW2Úv˜&∑76U6ó¶T∆ñ÷óBí¢í¿¢ì∞¢6ˆÁ7B76T'&V∂F˜v‚“v˜&∑76T'&V∂F˜v‚ÜF"ì∞¢6ˆÁ7Bˆ∆D6ˆÁfW'6FñˆÁ2“÷FÇÊ÷ÇÄ¢¿¢ÜF"Ê6ˆÁfW'6FñˆÁ2«¬µ“íÊ∆VÊwFÇ“R¿¢ì∞¢6ˆÁ7Bg&VUW76R“Çí”‚∞¢ñbÄ¢6ˆÊfó&“Ä¢ó7FÚfív"G∂ˆ∆D6ˆÁfW'6FñˆÁ7“6ˆÁfW'6á2íFRî÷ó2ÁFñvá2í¬÷ÁFVÊFÚ2R÷ó2&V6VÁFW2‚ÚÜó7L;7&ñ6ÚvFÚÏ:6ÚˆFR6W"&V7WW&FÚ(	BWá˜'FR6WW2FF˜2ÁFW26RVó6W"wV&L:÷∆Ú‚6ˆÁFñÁV#ˆ¿¢ê¢ê¢&WGW&„∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢6ˆÁfW'6FñˆÁ3¢G&ñ‘ˆ∆D6ˆÁfW'6FñˆÁ2ÜBÊ6ˆÁfW'6FñˆÁ2¬Rí¿¢6V∆V7FVD6ˆÁfW'6Fñˆ‰ñC¢ÁV∆¬¿¢“íì∞¢6WEFˆ7BÇ$6ˆÁfW'62FRîÁFñv2&V÷˜fñF2(	BW7:vÚ∆ñ&W&FÚ"ì∞¢”∞¢6ˆÁ7BFÜV÷R“F"Á&VfW&VÊ6W2ÁFÜV÷S∞¢6ˆÁ7B6WEFÜV÷R“áBí”‡¢WFFRÇÜBí”‚á≤‚‚ÊB¬&VfW&VÊ6W3¢≤‚‚ÊBÁ&VfW&VÊ6W2¬FÜV÷S¢B““íì∞¢6ˆÁ7B÷ˆFR“F"Á&VfW&VÊ6W2Ê÷ˆFR«¬&'W6ñÊW72#∞¢6ˆÁ7B6WD÷ˆFR“Ü“í”‚∞¢ñbÜ“””“÷ˆFRí&WGW&„∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢&VfW&VÊ6W3¢≤‚‚ÊBÁ&VfW&VÊ6W2¬÷ˆFS¢“¬÷ˆFT6Ü˜6V„¢G'VR“¿¢“íì∞¢6WEFˆ7BÄ¢“””“&V◊∆˜ñVR ¢Ú$÷ˆFÚ«FW&FÛ¢÷RßVF"ÊÚ÷WRG&&∆ÜÚ ¢¢$÷ˆFÚ«FW&FÛ¢F÷ñÊó7G&"÷WRÊV|;66ñÚ"¿¢ì∞¢”∞¢6ˆÁ7B6fTÊ÷R“7ñÊ2Çí”‚∞¢6ˆÁ7B6∆V‚“Ê÷RÁG&ñ“Çì∞¢ñbÜ6∆V‚Ê∆VÊwFÇ¬"í∞¢6WDW'"Ç$ñÊf˜&÷RV“Êˆ÷Rl:∆ñFÚ‚"ì∞¢&WGW&„∞¢–¢6WD'W7íáG'VRì∞¢6WDW'"Ç""ì∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÇ"ˆíˆWFÇ˜&ˆfñ∆R"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤Ê÷S¢6∆V‚“í¿¢“ì∞¢6ˆÁ7BFF“vóB"Êß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢ñbÇ"Êˆ≤íFá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬6«f"‚"ì∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬W6W#¢≤‚‚ÊBÁW6W"¬Ê÷S¢FFÁW6W"ÊÊ÷R““íì∞¢6WEFˆ7BÇ$Êˆ÷RGV∆ó¶FÚ"ì∞¢“6F6ÇÜRí∞¢6WDW'"ÜRÊ÷W76vRì∞¢“fñÊ∆«í∞¢6WD'W7íÜf«6Rì∞¢–¢”∞¢6ˆÁ7BWá˜'DFF“Çí”‚∞¢6ˆÁ7B≤W6W#¢˜W6W"¬76T∂Wì¢˜76T∂Wí¬‚‚Á&W7B““F#∞¢6ˆÁ7B&∆ˆ"“ÊWr&∆ˆ"Ö¥•4Ù‚Á7G&ñÊvñgíá&W7B¬ÁV∆¬¬"ï“¬∞¢GóS¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¿¢“í¿¢“Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&"ì∞¢Êá&Vb“U$¬Ê7&VFTˆ&¶V7EU$¬Ü&∆ˆ"ì∞¢ÊF˜vÊ∆ˆB“'6WR÷gVÊ6ñˆÊ&ñÚ÷FF˜2Êß6ˆ‚#∞¢Ê6∆ñ6≤Çì∞¢U$¬Á&Wfˆ∂Tˆ&¶V7EU$¬ÜÊá&Vbì∞¢6WEFˆ7BÇ$FF˜2Wá˜'FF˜2"ì∞¢G&6µ&ˆGV7DWfVÁBÇ&Wá˜'Eˆ6ˆ◊∆WFVB"¬∞¢÷ˆGV∆S¢&6ˆÊfñr"¿¢∂ñÊC¢'v˜&∑76Uˆß6ˆ‚"¿¢7V66W73¢G'VR¿¢“ì∞¢”∞¢6ˆÁ7BFV∆WFT66˜VÁB“7ñÊ2Çí”‚∞¢6WDFV∆WFñÊráG'VRì∞¢6WDFV∆WFTW'"Ç""ì∞¢G'í∞¢6ˆÁ7B"“vóBfWF6ÇÇ"ˆíˆWFÇˆ66˜VÁB"¬∞¢÷WFÜˆC¢$DTƒUDR"¿¢ÜVFW'3¢WFÑÜVFW'2Çí¿¢“ì∞¢ñbÇ"Êˆ≤í∞¢6ˆÁ7BFF“vóB"Êß6ˆ‚ÇíÊ6F6ÇÇÇí”‚á∑“íì∞¢Fá&˜rÊWrW'&˜"ÜFFÊW'&˜"«¬$Ï:6Úfˆí˜7<:◊fV¬WÜ6«Vó"7V6ˆÁF‚"ì∞¢–¢6ˆÁ7BW6W$ñB“F"ÁW6W"ÊñC∞¢∆ˆ6≈7F˜&vRÁ&V÷˜fTóFV“ÑUDÖıDÙ¥TÂÙ¥Uíì∞¢∆ˆ6≈7F˜&vRÁ&V÷˜fTóFV“Ñ5DïdUıU4U%Ù¥Uíì∞¢∆ˆ6≈7F˜&vRÁ&V÷˜fTóFV“Ç'6b◊76R"ì∞¢∆ˆ6≈7F˜&vRÁ&V÷˜fTóFV“Ç'6b◊76R÷Ê÷R"ì∞¢∆ˆ6≈7F˜&vRÁ&V÷˜fTóFV“áW6W%7F˜&vT∂WíáW6W$ñBíì∞¢WFFRÇÇí”‚6∆V‰F"ÜÁV∆¬íì∞¢“6F6ÇÜRí∞¢6WDFV∆WFTW'"ÜRÊ÷W76vRì∞¢6WDFV∆WFñÊrÜf«6Rì∞¢–¢”∞¢6ˆÁ7B«VvvVB“ÜF"Á«VvvVEFˆˆ«2«¬µ“íÊ∆VÊwFÉ∞¢&WGW&‚Ä¢≈vUFóF∆P¢WñV'&˜s“$4Ù‰dîuU$8|9TU2 ¢FóF∆S“%6WRW7:vÚ¬FÚ6WR¶VóFÚ ¢FWáC“$7VñFRF7V6ˆÁF¬F2&VfW,:¶Ê6ñ2RF6VwW&Ï:vV“V“<;2«Vv"‚ ¢6∆74Ê÷S“'6WGFñÊw2◊FóF∆R ¢‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊vR#‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷˜fW'fñWr"&ñ÷∆&V√“%&W7V÷ÚF6ˆÁF#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷˜fW'fñWr◊&ˆfñ∆R#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷fF""&ñ÷ÜñFFV„“'G'VR#‡¢µ7G&ñÊrÜF"ÁW6W"ÊÊ÷R«¬%R"íÁG&ñ“ÇíÊ6Ü$BÉíÁFıWW$66RÇó–¢¬˜7„‡¢∆Fóc‡¢«7‚6∆74Ê÷S“&WñV'&˜r∆ñváB#‰4ÙÂD$î‰4ï√¬˜7„‡¢∆É#Á∂F"ÁW6W"ÊÊ÷W”¬ˆÉ#‡¢«Á∂F"ÁW6W"ÊV÷ñ«”¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷˜fW'fñWr◊7FGW2#‡¢«7‡¢6∆74Ê÷S◊∂6W'fñ6R◊ñ∆¬G∑6W'fñ6U7FGW3ÚÁ7FGW2””“&˜W&6ñˆÊ¬"Ú&ˆÊ∆ñÊR"¢"'÷–¢‡¢«7‚&ñ÷ÜñFFV„“'G'VR"Û‡¢∑6W'fñ6U7FGW3ÚÁ7FGW2””“&˜W&6ñˆÊ¬ ¢Ú%GVFÚgVÊ6ñˆÊÊFÚ ¢¢%fW&ñfñ6ÊFÚ6W'fú:vÚ'–¢¬˜7„‡¢«6÷∆√Á∑6W'fñ6U7FGW3ÚÁfW'6ñˆ‚«¬%fW'<:6ÚGV¬'”¬˜6÷∆√‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡†¢∆Ê`¢6∆74Ê÷S“'6WGFñÊw2÷ßV◊÷Êb ¢&ñ÷∆&V√“%6\:|;VW2F26ˆÊfñwW&:|;VW2 ¢‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢Fˆ7V÷VÁ@¢ÊvWDV∆V÷VÁD'îñBÇ'6WGFñÊw2÷66˜VÁB"ê¢ÚÁ67&ˆ∆ƒñÁFıfñWrá≤&VÜfñ˜#¢'6÷ˆ˜FÇ"“ê¢–¢‡¢≈W6W%&˜VÊBÛ‚6ˆÁF¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢Fˆ7V÷VÁ@¢ÊvWDV∆V÷VÁD'îñBÇ'6WGFñÊw2◊&VfW&VÊ6W2"ê¢ÚÁ67&ˆ∆ƒñÁFıfñWrá≤&VÜfñ˜#¢'6÷ˆ˜FÇ"“ê¢–¢‡¢≈∆WGFRÛ‚&VfW,:¶Ê6ñ0¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢Fˆ7V÷VÁ@¢ÊvWDV∆V÷VÁD'îñBÇ'6WGFñÊw2◊v˜&∑76R"ê¢ÚÁ67&ˆ∆ƒñÁFıfñWrá≤&VÜfñ˜#¢'6÷ˆ˜FÇ"“ê¢–¢‡¢ƒ∆ñW'2Û‚W7:vÚRWVóP¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢Fˆ7V÷VÁ@¢ÊvWDV∆V÷VÁD'îñBÇ'6WGFñÊw2◊7W˜'B"ê¢ÚÁ67&ˆ∆ƒñÁFıfñWrá≤&VÜfñ˜#¢'6÷ˆ˜FÇ"“ê¢–¢‡¢ƒ∆ñfT'V˜íÛ‚7W˜'FP¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢Fˆ7V÷VÁ@¢ÊvWDV∆V÷VÁD'îñBÇ'6WGFñÊw2◊6V7W&óGí"ê¢ÚÁ67&ˆ∆ƒñÁFıfñWrá≤&VÜfñ˜#¢'6÷ˆ˜FÇ"“ê¢–¢‡¢≈6ÜñV∆D6ÜV6≤Û‚&óf6ñFFP¢¬ˆ'WGFˆ„‡¢¬ˆÊc‡†¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷w&ñB#‡¢ƒWáFVÁ6ñˆ‰6&B6WEFˆ7C◊∑6WEFˆ7G“Û‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B"ñC“'6WGFñÊw2÷66˜VÁB#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢≈W6W%&˜VÊBÛ‡¢¬˜7„‡¢∆Fóc‡¢∆É#ÂW&fñ√¬ˆÉ#‡¢«‰6ˆ÷Úfˆ<:¢&V6RÊÚ∆ñ6FófÚ„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢ƒfñV∆B∆&V√“%6WRÊˆ÷R#‡¢∆ñÁW@¢f«VS◊∂Ê÷W–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDÊ÷RÜRÁF&vWBÁf«VRó–¢÷Ñ∆VÊwFÉ◊≥–¢Û‡¢¬ÙfñV∆C‡¢ƒfñV∆B∆&V√“$R÷÷ñ¬#‡¢∆ñÁWBf«VS◊∂F"ÁW6W"ÊV÷ñ«“&VDˆÊ«í6∆74Ê÷S“'&VFˆÊ«í"Û‡¢¬ÙfñV∆C‡¢∂W'"bbÄ¢∆Fób6∆74Ê÷S“&6≤÷W'&˜"#‡¢ƒ6ó&6∆T∆W'BÛ‡¢∂W''–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ2#‡¢ƒ'WGFˆ‡¢ñ6ˆ„◊µ6fW–¢Fó6&∆VC◊∂'W7í«¬Ê÷RÁG&ñ“Çí””“F"ÁW6W"ÊÊ÷W–¢ˆ‰6∆ñ6≥◊∑6fTÊ÷W–¢‡¢∂'W7íÚ%6«fÊFÚ‚‚‚"¢%6«f"W&fñ¬'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B"ñC“'6WGFñÊw2◊&VfW&VÊ6W2#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢≈∆WGFRÛ‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰,:¶Ê6ñ¬ˆÉ#‡¢«‰W66ˆ∆ÜÚFV÷FÚ∆ñ6FófÚ„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'FÜV÷R÷6Üˆñ6R#‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑FÜV÷R””“&∆ñváB"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEFÜV÷RÇ&∆ñváB"ó–¢‡¢«7‚6∆74Ê÷S“'FÜV÷R◊&WfñWr∆ñváB#‡¢≈7V‚Û‡¢¬˜7„‡¢«7G&ˆÊs‰6∆&Û¬˜7G&ˆÊs‡¢∑FÜV÷R””“&∆ñváB"bbƒ6ÜV6¥6ó&6∆S"6∆74Ê÷S“'FÜV÷R÷6ÜV6≤"ÛÁ–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∑FÜV÷R””“&F&≤"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WEFÜV÷RÇ&F&≤"ó–¢‡¢«7‚6∆74Ê÷S“'FÜV÷R◊&WfñWrF&≤#‡¢ƒ÷ˆˆ‚Û‡¢¬˜7„‡¢«7G&ˆÊs‰W67W&Û¬˜7G&ˆÊs‡¢∑FÜV÷R””“&F&≤"bbƒ6ÜV6¥6ó&6∆S"6∆74Ê÷S“'FÜV÷R÷6ÜV6≤"ÛÁ–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢ƒ'&ñVf66T'W6ñÊW72Û‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰÷ˆFÚFRW6Û¬ˆÉ#‡¢«‰ßW7FRÚ∆ñ6FófÚÚ6WR¶VóFÚFRG&&∆Ü"„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'FÜV÷R÷6Üˆñ6R#‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂÷ˆFR””“&'W6ñÊW72"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆFRÇ&'W6ñÊW72"ó–¢‡¢«7‚6∆74Ê÷S“'FÜV÷R◊&WfñWr∆ñváB#‡¢ƒ'&ñVf66T'W6ñÊW72Û‡¢¬˜7„‡¢«7G&ˆÊs‰F÷ñÊó7G&"÷WRÊV|;66ñÛ¬˜7G&ˆÊs‡¢∂÷ˆFR””“&'W6ñÊW72"bbƒ6ÜV6¥6ó&6∆S"6∆74Ê÷S“'FÜV÷R÷6ÜV6≤"ÛÁ–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S◊∂÷ˆFR””“&V◊∆˜ñVR"Ú&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆFRÇ&V◊∆˜ñVR"ó–¢‡¢«7‚6∆74Ê÷S“'FÜV÷R◊&WfñWrF&≤#‡¢≈W6W%&˜VÊBÛ‡¢¬˜7„‡¢«7G&ˆÊs‰÷RßVF"ÊÚ÷WRG&&∆ÜÛ¬˜7G&ˆÊs‡¢∂÷ˆFR””“&V◊∆˜ñVR"bbƒ6ÜV6¥6ó&6∆S"6∆74Ê÷S“'FÜV÷R÷6ÜV6≤"ÛÁ–¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢«6÷∆√Â6WW2FF˜2Ï:6Ú<:6ÚvF˜2ÊV“ˆ7V«FF˜2ÚG&ˆ6"FR÷ˆFÚ„¬˜6÷∆√‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢ƒv&BÛ‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰v÷ñfñ6:|:6Û¬ˆÉ#‡¢«ÂˆÁF˜2¬Ï:◊fVó2R6ˆÁVó7F2FR÷ó7<;VW26ˆÊ6«\:÷F2„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆∆&V¬6∆74Ê÷S“&6˜7B÷6ÜV6≤#‡¢∆ñÁW@¢GóS“&6ÜV6∂&˜Ç ¢6ÜV6∂VC◊∂F"Á&VfW&VÊ6W2Êv÷ñfñ6Fñˆ‰VÊ&∆VB”“f«6W–¢ˆ‰6ÜÊvS◊≤ÜRí”‡¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢&VfW&VÊ6W3¢∞¢‚‚ÊBÁ&VfW&VÊ6W2¿¢v÷ñfñ6Fñˆ‰VÊ&∆VC¢RÁF&vWBÊ6ÜV6∂VB¿¢“¿¢“íê¢–¢Û‡¢«7„‰÷˜7G&"ˆÁF˜2¬Ï:◊fV¬R6ˆÁVó7F2ÊÚñÊV√¬˜7„‡¢¬ˆ∆&V√‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B"ñC“'6WGFñÊw2◊v˜&∑76R#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢ƒ∆ñW'2Û‡¢¬˜7„‡¢∆Fóc‡¢∆É#ÂFñ÷RRfW'&÷VÁF3¬ˆÉ#‡¢«‰F∆Ü˜2&6ˆÊfñwW&"6WRW7:vÚ„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷∆ñÊ∑2#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB#‡¢ƒ&˜BÛ‡¢«7„‡¢«7G&ˆÊsÁ≤ÜF"Ê7W7Fˆ’7V6ñ∆ó7G2«¬µ“íÊ∆VÊwFá”¬˜7G&ˆÊsÁ≤"'–¢gVÊ6ñˆÏ:&ñ˜26ˆÁG&FF˜0¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB#‡¢≈«VrÛ‡¢«7„‡¢«7G&ˆÊsÁ∑«VvvVG”¬˜7G&ˆÊs‚fW'&÷VÁF2«VvF0¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB#‡¢ƒ'Vñ∆FñÊs"Û‡¢«7„‡¢«7G&ˆÊsÁ∂F"Ê'W6ñÊW76W2Ê∆VÊwFá”¬˜7G&ˆÊs‚ÊV|;66ñ˜26F7G&F˜0¢¬˜7„‡¢¬ˆFóc‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢≈G&VÊFñÊuWÛ‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰ñÊFñ6F˜&W2FRW6Û¬ˆÉ#‡¢«‰F¸:|:6Ú&V¬FÚW7:vÚÊ˜2;¶«Fñ÷˜23Fñ2¬6V“&÷¶VÊ"Ú6ˆÁF\;¶FÚFÚG&&∆ÜÚ„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∑W6vT÷WG&ñ72ÚÄ¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷∆ñÊ∑2#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB#‡¢≈W6W'2Û‡¢«7„‡¢«7G&ˆÊsÁ∑W6vT÷WG&ñ72Ê7FófUW6W'2«¬”¬˜7G&ˆÊs‚W76ˆ2Fóf0¢¬˜7„‡¢¬ˆFóc‡¢≤áW6vT÷WG&ñ72ÊWfVÁG2«¬µ“íÁ6∆ñ6RÉ¬RíÊ÷ÇÜóFV“í”‚Ä¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB"∂Wì◊∂óFV“ÊWfVÁG”‡¢ƒ7FófóGíÛ‡¢«7„‡¢«7G&ˆÊsÁ∂óFV“ÁF˜F«”¬˜7G&ˆÊs‚∂óFV“ÊWfVÁBÁ&W∆6T∆¬Ç%Ú"¬""ó–¢¬˜7„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢í¢Ä¢«6∆74Ê÷S“&◊WFVB÷6˜í#‡¢6'&VwVR˜2ñÊFñ6F˜&W2&6ˆ◊ÊÜ"Fóf:|:6Ú¬W6ÚFî¿¢ñ◊˜'F:|;VW2¬Wá˜'F:|;VW2R6ˆÊ6«W<:6ÚFR:|;VW2‡¢¬˜‡¢ó–¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ˆ‰6∆ñ6≥◊∂∆ˆEW6vT÷WG&ñ77“Fó6&∆VC◊∂÷WG&ñ74'W7ó”‡¢∂÷WG&ñ74'W7íÚ$6'&VvÊFÚ‚‚‚"¢$GV∆ó¶"ñÊFñ6F˜&W2'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B"ñC“'6WGFñÊw2◊7W˜'B#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢ƒ∆ñfT'V˜íÛ‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰ßVFR6ˆÁFñÁVñFFS¬ˆÉ#‡¢«‰6ˆÁ7V«FRÚW7FFÚFÚ6W'fú:vÚR∆WfRV“FñvÏ;77Fñ6Ú6VwW&ÚÚ7W˜'FR„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB#‡¢ƒ7FófóGíÛ‡¢«7„‡¢6W'fú:vÛ¢«7G&ˆÊsÁ∑6W'fñ6U7FGW3ÚÁ7FGW2«¬'fW&ñfñ6ÊFÚ‚‚‚'”¬˜7G&ˆÊs‡¢∑6W'fñ6U7FGW3ÚÁfW'6ñˆ‚Ú+rG∑6W'fñ6U7FGW2ÁfW'6ñˆÁ÷¢"'–¢¬˜7„‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ2#‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ˆ‰6∆ñ6≥◊∂F˜vÊ∆ˆDFñvÊ˜7Fñ77”‡¢&óÜ"FñvÏ;77Fñ6¢¬Ù'WGFˆ„‡¢∑7W˜'DV÷ñ¬bbÄ¢∆¢6∆74Ê÷S“&'WGFˆ‚6V6ˆÊF'í ¢á&Vc◊∂÷ñ«FÛ¢G∑7W˜'DV÷ñ«”˜7V&¶V7C“G∂VÊ6ˆFUU$î6ˆ◊ˆÊVÁBÇ%7W˜'FR(	B6WRgVÊ6ñˆÏ:&ñÚ"ó÷–¢‡¢VÁfñ"Ú7W˜'FP¢¬ˆ‡¢ó–¢∆6∆74Ê÷S“'FWáB÷'WGFˆ‚"á&Vc“"ˆí˜7FGW2"F&vWC“%ˆ&∆Ê≤"&V√“&Ê˜&VfW'&W"#‡¢fW"W7FFÚL:ñ6Êñ6¢¬ˆ‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B"ñC“'6WGFñÊw2◊6V7W&óGí#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢≈6ÜñV∆D6ÜV6≤Û‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰FF˜2R6VwW&Ï:v¬ˆÉ#‡¢«Â6WW2&ˆ¶WF˜2<:6Ú6ñÊ7&ˆÊó¶F˜26ˆ“7V6ˆÁF„¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB#‡¢ƒ&˜ÜW2Û‡¢«7„‡¢«7G&ˆÊsÁ∑v˜&∑76U6ó¶U7G“S¬˜7G&ˆÊs‚FÚW7:vÚFR6ñÊ7&ˆÊó¶:|:6¢W6FÚá¥÷FÇÁ&˜VÊBáv˜&∑76U6ó¶T'óFW2Ú#Bó“¥"FW≤"'–¢¥÷FÇÁ&˜VÊBáv˜&∑76U6ó¶T∆ñ÷óBÚ#Bó“¥"ê¢¬˜7„‡¢¬ˆFóc‡¢∑v˜&∑76U6ó¶U7B„“sbbÄ¢∆Fób6∆74Ê÷S“&Ê˜Fñ6R#‡¢ƒ6ó&6∆T∆W'BÛ‡¢«7„‡¢∑v˜&∑76U6ó¶U7B„“ì ¢Ú%6WRW7:vÚW7L:V6R6ÜVñÚ‚Wá˜'FR˜R'VófRóFVÁ2ÁFñv˜2ÜFˆ7V÷VÁF˜2¬F&Vf26ˆÊ6«\:÷F2¬Üó7L;7&ñ6Úí&WfóF"f∆Ü2FR6ñÊ7&ˆÊó¶:|:6Ú‚ ¢¢%6WRW7:vÚFR6ñÊ7&ˆÊó¶:|:6ÚW7L:VÊ6ÜVÊFÚ‚f∆RWá˜'F"˜R'Vóf"óFVÁ2ÁFñv˜26ˆ“ÚFV◊Ú‚'–¢¬˜7„‡¢¬ˆFóc‡¢ó–¢∑76T'&V∂F˜v‚Á&˜w2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“'76R÷'&V∂F˜v‚#‡¢«7‚6∆74Ê÷S“'76R÷'&V∂F˜v‚◊FóF∆R#‡¢ÚVRW7L:W6ÊFÚÚW7:v¢¬˜7„‡¢∑76T'&V∂F˜v‚Á&˜w2Á6∆ñ6RÉ¬bíÊ÷Çá&˜rí”‚∞¢6ˆÁ7B7B“76T'&V∂F˜v‚ÁF˜F¿¢Ú÷FÇÁ&˜VÊBÇá&˜rÊ'óFW2Ú76T'&V∂F˜v‚ÁF˜F¬í¢ê¢¢∞¢&WGW&‚Ä¢∆Fób∂Wì◊∑&˜rÊ∂Wó“6∆74Ê÷S“'76R◊&˜r#‡¢∆Fób6∆74Ê÷S“'76R◊&˜r÷ÜVB#‡¢«7„Á∑&˜rÊ∆&V«”¬˜7„‡¢«6÷∆√‡¢¥÷FÇÊ÷ÇÉ¬÷FÇÁ&˜VÊBá&˜rÊ'óFW2Ú#Bíó“¥"+r∑&˜rÊ6˜VÁG–¢¬˜6÷∆√‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'76R÷&"#‡¢«7‚7Gñ∆S◊∑≤vñGFÉ¢G∑7G“V◊“Û‡¢¬ˆFóc‡¢¬ˆFóc‡¢ì∞¢“ó–¢∂ˆ∆D6ˆÁfW'6FñˆÁ2‚bbÄ¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µG&6É'–¢ˆ‰6∆ñ6≥◊∂g&VUW76W–¢‡¢∆ñ&W&"W7:vÛ¢v"∂ˆ∆D6ˆÁfW'6FñˆÁ7“6ˆÁfW'6á2íFRî¢ÁFñvá2ê¢¬Ù'WGFˆ„‡¢ó–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ26ˆ¬#‡¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ñ6ˆ„◊¥F˜vÊ∆ˆG“ˆ‰6∆ñ6≥◊∂Wá˜'DFF”‡¢Wá˜'F"÷WW2FF˜0¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊¥Üó7F˜'ó–¢ˆ‰6∆ñ6≥◊∂∆ˆD&6∑W7–¢Fó6&∆VC◊∂&6∑W4'W7ó–¢‡¢∂&6∑W4'W7íÚ$6'&VvÊFÚfW'<;VW2‚‚‚"¢%fW"fW'<;VW2ÁFW&ñ˜&W2'–¢¬Ù'WGFˆ„‡¢∂&6∑W2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷∆ñÊ∑2#‡¢∂&6∑W2Ê÷ÇÜ&6∑Wí”‚Ä¢∆Fób6∆74Ê÷S“'6WGFñÊw2◊7FB"∂Wì◊∂&6∑WÊñG”‡¢ƒÜó7F˜'íÛ‡¢«7„‡¢«7G&ˆÊsÂfW'<:6Ú∂&6∑WÁ&Wfó6ñˆÁ”¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂ÊWrFFRÜ&6∑WÊ7&VFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó“+w≤"'–¢¥÷FÇÊ÷ÇÉ¬÷FÇÁ&˜VÊBÜ&6∑WÁ6ó¶RÚ#Bíó“¥ ¢¬˜6÷∆√‡¢¬˜7„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚&W7F˜&T&6∑WÜ&6∑Wó–¢Fó6&∆VC◊∂&6∑W4'W7ó–¢‡¢&W7FW& ¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢ó–¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊¥∆ˆt˜WG–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ñbÜ6ˆÊfó&“Ç$VÊ6W'&"W7F6W7<:6ÛÚ"íí∞¢VÊE6W76ñˆ‚Çì∞¢WFFRÇÇí”‚6∆V‰F"ÜÁV∆¬íì∞¢–¢◊–¢‡¢6ó"F6ˆÁF¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ñ6ˆ„◊µG&6É'–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6WDFV∆WFT6ˆÊfó&“Ç""ì∞¢6WDFV∆WFTW'"Ç""ì∞¢6WDFV∆WFT˜V‚áG'VRì∞¢◊–¢‡¢WÜ6«Vó"÷ñÊÜ6ˆÁF¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢«6∆74Ê÷S“'6WGFñÊw2÷Ê˜FR#‡¢≈6ÜñV∆D6ÜV6≤Û‰&V7WW&:|:6ÚFR6VÊÜ˜"<;6FñvÚFRR÷÷ñ¬W7L:¢Fó7ˆÏ:◊fV¬ÊFV∆FR∆ˆvñ‚‡¢¬˜‡¢«6∆74Ê÷S“'6WGFñÊw2÷Ê˜FR#‡¢ƒfñ∆UFWáBÛ‡¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&∆ñÊ≤÷'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‚vÚbbvÚÇ&∆Vv¬"ó–¢‡¢FW&÷˜2FRW6ÚRˆÃ:◊Fñ6FR&óf6ñFFP¢¬ˆ'WGFˆ„‡¢¬˜‡¢¬˜6V7Fñˆ„‡¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢ƒ'VrÛ‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰W'&˜2L:ñ6Êñ6˜3¬ˆÉ#‡¢«‡¢f∆Ü2&Vvó7G&F2WFˆ÷Fñ6÷VÁFRVÁVÁFÚfˆ<:¢W6f¢∆ñ6FófÚÊW7F6ˆÁF‡¢¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ2#‡¢ƒ'WGFˆ‡¢f&ñÁC“'6V6ˆÊF'í ¢ñ6ˆ„◊¥'Vw–¢ˆ‰6∆ñ6≥◊∑Fˆvv∆TW'&˜$∆ˆw7–¢Fó6&∆VC◊∂W'&˜$∆ˆw4∆ˆFñÊw–¢‡¢∂W'&˜$∆ˆw4∆ˆFñÊp¢Ú$6'&VvÊFÚ‚‚‚ ¢¢W'&˜$∆ˆw4˜V‡¢Ú$ˆ7V«F" ¢¢%fW"W'&˜2&V6VÁFW2'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢∂W'&˜$∆ˆw4˜V‚b`¢ÜW'&˜$∆ˆw2Ê∆VÊwFÇ””“ÚÄ¢«6∆74Ê÷S“'6WGFñÊw2÷Ê˜FR#‡¢ƒ&FvT6ÜV6≤Û‡¢ÊVÊáV“W'&Ú&Vvó7G&FÚÊW7F6ˆÁFL:ív˜&‡¢¬˜‡¢í¢Ä¢∆Fób6∆74Ê÷S“&÷V÷&W"÷∆ó7B#‡¢∂W'&˜$∆ˆw2Ê÷ÇÜ∆ˆrí”‚Ä¢∆FWFñ«2∂Wì◊∂∆ˆrÊñG“6∆74Ê÷S“&W'&˜"÷∆ˆr÷VÁG'í#‡¢«7V÷÷'ì‡¢«7G&ˆÊsÁ∂∆ˆrÊ÷W76vW”¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂∆ˆrÁW&¬ÚG∂∆ˆrÁW&«“+r¢"'–¢∂ÊWrFFRÜ∆ˆrÊ7&VFVDBíÁFÙ∆ˆ6∆U7G&ñÊrÇ'B‘%""ó–¢¬˜6÷∆√‡¢¬˜7V÷÷'ì‡¢∂∆ˆrÁ7F6≤bb«&SÁ∂∆ˆrÁ7F6∑”¬˜&SÁ–¢∂∆ˆrÊ6ˆ◊ˆÊVÁE7F6≤bb«&SÁ∂∆ˆrÊ6ˆ◊ˆÊVÁE7F6∑”¬˜&SÁ–¢¬ˆFWFñ«3‡¢íó–¢¬ˆFóc‡¢íó–¢¬˜6V7Fñˆ„‡¢∑W6Ö7W˜'FVBbbÄ¢«6V7Fñˆ‚6∆74Ê÷S“'6WGFñÊw2÷6&B#‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷6&B÷ÜVB#‡¢«7‚6∆74Ê÷S“'6WGFñÊw2÷ñ6ˆ‚#‡¢ƒ&V∆¬Û‡¢¬˜7„‡¢∆Fóc‡¢∆É#‰Ê˜Fñfñ6:|;VW2FÚÊfVvF˜#¬ˆÉ#‡¢«‡¢&V6V&V“fó6Ú÷W6÷Ú6ˆ“Ú∆ñ6FófÚfV6ÜFÚ(	BÊ˜f¢÷ó7<:6Ú¬VÁG&Vv&˜fF¬6ˆÁfóFR6VóFÚR˜WG&2Ê˜fñFFW2‡¢¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ2#‡¢ƒ'WGFˆ‡¢f&ñÁC◊∑W6Ö7V'67&ñ&VBÚ&vÜ˜7B"¢'6V6ˆÊF'í'–¢ñ6ˆ„◊¥&V∆«–¢ˆ‰6∆ñ6≥◊∑W6Ö7V'67&ñ&VBÚFó6&∆UW6Ç¢VÊ&∆UW6á–¢Fó6&∆VC◊∑W6Ñ'W7í«¬W6Ñ6ÜV6∂VG–¢‡¢∑W6Ñ'W7ê¢Ú$wV&FR‚‚‚ ¢¢W6Ö7V'67&ñ&V@¢Ú$FW6Fóf"Ê˜Fñfñ6:|;VW2 ¢¢$Fóf"Ê˜Fñfñ6:|;VW2'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬˜6V7Fñˆ„‡¢ó–¢¬ˆFóc‡¢¬ˆFóc‡¢∂FV∆WFT˜V‚bbÄ¢ƒ÷ˆF¬FóF∆S“$WÜ6«Vó"÷ñÊÜ6ˆÁF"ˆ‰6∆˜6S◊≤Çí”‚6WDFV∆WFT˜V‚Üf«6Ró”‡¢«‡¢W7F:|:6ÚvW&÷ÊVÁFV÷VÁFR7V6ˆÁFRFˆF˜2˜2FF˜2FÚ6WP¢W7:vÚFRG&&∆ÜÚÜÊV|;66ñ˜2¬F&Vf2¬∆VG2¬6ˆÁFF˜2¿¢vVÊF÷VÁF˜2¬&ˆGWF˜2¬fñÊÊ6Vó&Ú¬Fˆ7V÷VÁF˜2R6óFW0¢V&∆ñ6F˜2í‚Ï:6Ú:í˜7<:◊fV¬FW6f¶W"‡¢¬˜‡¢ƒfñV∆B∆&V√“u&6ˆÊfó&÷"¬FñvóFR$UÑ4≈Tï""s‡¢∆ñÁW@¢f«VS◊∂FV∆WFT6ˆÊfó&◊–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WDFV∆WFT6ˆÊfó&“ÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$UÑ4≈Tï" ¢WFÙfˆ7W0¢Û‡¢¬ÙfñV∆C‡¢∂FV∆WFTW'"bbÄ¢∆Fób6∆74Ê÷S“&6≤÷W'&˜"#‡¢ƒ6ó&6∆T∆W'BÛ‡¢∂FV∆WFTW''–¢¬ˆFóc‡¢ó–¢∆Fób6∆74Ê÷S“'6WGFñÊw2÷7FñˆÁ2#‡¢ƒ'WGFˆ‡¢f&ñÁC“&vÜ˜7B ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WDFV∆WFT˜V‚Üf«6Ró–¢Fó6&∆VC◊∂FV∆WFñÊw–¢‡¢6Ê6V∆ ¢¬Ù'WGFˆ„‡¢ƒ'WGFˆ‡¢f&ñÁC“&FÊvW" ¢ñ6ˆ„◊µG&6É'–¢Fó6&∆VC◊∂FV∆WFñÊr«¬FV∆WFT6ˆÊfó&“ÁG&ñ“Çí”“$UÑ4≈Tï"'–¢ˆ‰6∆ñ6≥◊∂FV∆WFT66˜VÁG–¢‡¢∂FV∆WFñÊrÚ$WÜ6«VñÊFÚ‚‚‚"¢$WÜ6«Vó"W&÷ÊVÁFV÷VÁFR'–¢¬Ù'WGFˆ„‡¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–¢¬ıvUFóF∆S‡¢ì∞ß–†¶Wá˜'BFVfV«BgVÊ7Fñˆ‚Çí∞¢6ˆÁ7B6fVEVí“ÇÇí”‚∞¢G'í∞¢&WGW&‚•4Ù‚Á'6RÜ∆ˆ6≈7F˜&vRÊvWDóFV“Ç'6b◊Ví"í«¬'∑“"ì∞¢“6F6Ç∞¢&WGW&‚∑”∞¢–¢“íÇì∞¢6ˆÁ7B∞¢F"¿¢WFFR¿¢v˜&∑76T6ˆÊf∆ñ7B¿¢7ñÊ6ñÊr¿¢7ñÊ4W'&˜"¿¢&WG'ï7ñÊ2¿¢∆ˆv˜WDg&ˆ‘Wáó&VE6W76ñˆ‚¿¢v˜&∑76T7Fñˆ‚¿¢““W6TFF&6RÇí¿¢∑vR¬6WEvU““W6U7FFRÇ&ñÊñ6ñÚ"í¿¢∂6ˆ∆∆6VB¬6WD6ˆ∆∆6VE““W6U7FFRÇ6fVEVíÊ6ˆ∆∆6VBí¿¢∂÷ˆ&ñ∆R¬6WD÷ˆ&ñ∆U““W6U7FFRÜf«6Rí¿¢ÚÚ6ˆ÷\:v$U%DFR&˜;76óFÚ‚fV6Ü"˜"G,:6ÚFó&&ñFfó7FóFVÁ2VP¢ÚÚW76ˆ¨:6&RˆÊFRfñ6“(	BÚ÷VÁRW66ˆ∆ÜñFÚ:í&FW7F6"ÚVRV∆¢ÚÚW6¬Ï:6Ú&W66ˆÊFW"Ú&W7FÚ‚VV“Vó6W"fó<:6ÚVÁáWFfV6ÜV÷fW¢¿¢ÚÚRfñ6fV6ÜF‚&V6ó6fñ6"VíV“6ñ÷¬ßVÁFÚF˜2˜WG&˜2W7FF˜3†¢ÚÚFV6∆&FÚFWˆó2F˜2&WGW&Á2ÁFV6óF˜2¬Ú&V7BVV'&˜&FV“F˜0¢ÚÚÜˆˆ∑2VÁG&R&VÊFW'2RFV∆G&f‡¢∑6Ü˜t∆≈Fˆˆ«2¬6WE6Ü˜t∆≈Fˆˆ«5““W6U7FFRÄ¢F#ÚÁ&VfW&VÊ6W3ÚÊ÷VÁTWáÊFVB”“f«6R¿¢í¿¢∑Fˆ7B¬6WEFˆ7E““W6U7FFRÇ""í¿¢∂'W6ñÊW74÷VÁR¬6WD'W6ñÊW74÷VÁU““W6U7FFRÜf«6Rí¿¢∂Ê˜Fñd˜V‚¬6WDÊ˜Fñd˜VÂ““W6U7FFRÜf«6Rí¿¢∑6V&6Ñ˜V‚¬6WE6V&6Ñ˜VÂ““W6U7FFRÜf«6Rí¿¢∑6V&6ÖVW'í¬6WE6V&6ÖVW'ï““W6U7FFRÇ""ì∞¢6ˆÁ7B∑6V&6Ö6VVB¬6WE6V&6Ö6VVE““W6U7FFRÇ""ì∞¢6ˆÁ7B6∆V%6V&6Ö6VVB“Çí”‚6WE6V&6Ö6VVBÇ""ì∞¢6ˆÁ7B∂6ÜÊvV∆ˆt˜V‚¬6WD6ÜÊvV∆ˆt˜VÂ““W6U7FFRÜf«6Rì∞¢6ˆÁ7B∂6ÜÊvV∆ˆu6VV‰ñB¬6WD6ÜÊvV∆ˆu6VV‰ñE““W6U7FFRÄ¢Çí”‚∆ˆ6≈7F˜&vRÊvWDóFV“Ç'6b÷6ÜÊvV∆ˆr◊6VV‚"í«¬""¿¢ì∞¢6ˆÁ7BÜ5VÁ6VV‰6ÜÊvV∆ˆr–¢4Ñ‰tTƒÙuÙTÂE$îU5≥“bb4Ñ‰tTƒÙuÙTÂE$îU5≥“ÊñB”“6ÜÊvV∆ˆu6VV‰ñC∞¢6ˆÁ7B'W6ñÊW72–¢F"Ê'W6ñÊW76W2ÊfñÊBÇáÇí”‚ÇÊñB””“F"Á6V∆V7FVD'W6ñÊW74ñBí«¿¢F"Ê'W6ñÊW76W5≥“«¿¢ÁV∆√∞¢6ˆÁ7B˜V‰6ÜÊvV∆ˆr“Çí”‚∞¢6WD6ÜÊvV∆ˆt˜V‚áG'VRì∞¢6ˆÁ7B∆FW7DñB“4Ñ‰tTƒÙuÙTÂE$îU5≥”ÚÊñB«¬"#∞¢∆ˆ6≈7F˜&vRÁ6WDóFV“Ç'6b÷6ÜÊvV∆ˆr◊6VV‚"¬∆FW7DñBì∞¢6WD6ÜÊvV∆ˆu6VV‰ñBÜ∆FW7DñBì∞¢”∞¢6ˆÁ7B∂÷VÁTÜñFFV‚¬6WD÷VÁTÜñFFVÂ““W6U7FFRÇ6fVEVíÊ÷VÁTÜñFFV‚ì∞¢6ˆÁ7B∑WFFTfñ∆&∆R¬6WEWFFTfñ∆&∆U““W6U7FFRÄ¢Çí”‚vñÊF˜rÂıı4eıUDDUÙdîƒ$ƒUıÚ¿¢ì∞¢6ˆÁ7B∑WFFTñÊfÚ¬6WEWFFTñÊfı““W6U7FFRÇÇí”‚á∞¢∆FW7EfW'6ñˆ„¢vñÊF˜rÂıı4eÙƒDU5EıdU%4îÙÂıÚ«¬""¿¢“íì∞¢6ˆÁ7B∑6'r¬6WE6'u““W6U7FFRÄ¢÷FÇÊ÷ñ‚É3É¬÷FÇÊ÷ÇÉ#¬6fVEVíÁ6'r«¬#cbíí¿¢ì∞¢W6TVffV7BÇÇí”‚∞¢G'í∞¢∆ˆ6≈7F˜&vRÁ6WDóFV“Ä¢'6b◊Ví"¿¢•4Ù‚Á7G&ñÊvñgíá≤6ˆ∆∆6VB¬÷VÁTÜñFFV‚¬6'r“í¿¢ì∞¢“6F6Ç∑–¢“¬∂6ˆ∆∆6VB¬÷VÁTÜñFFV‚¬6'u“ì∞¢W6TVffV7BÇÇí”‚∞¢6ˆÁ7B6Ü˜uWFFR“ÜWfVÁBí”‚∞¢6WEWFFTñÊfÚá∞¢∆FW7EfW'6ñˆ„†¢WfVÁBÊFWFñ√ÚÊ∆FW7EfW'6ñˆ‚«¬vñÊF˜rÂıı4eÙƒDU5EıdU%4îÙÂıÚ«¬""¿¢“ì∞¢6WEWFFTfñ∆&∆RáG'VRì∞¢”∞¢vñÊF˜rÊFDWfVÁD∆ó7FVÊW"Ç'6b÷◊WFFR÷fñ∆&∆R"¬6Ü˜uWFFRì∞¢&WGW&‚Çí”‡¢vñÊF˜rÁ&V÷˜fTWfVÁD∆ó7FVÊW"Ç'6b÷◊WFFR÷fñ∆&∆R"¬6Ü˜uWFFRì∞¢“¬µ“ì∞¢W6TVffV7BÇÇí”‚∞¢6ˆÁ7BÜÊF∆W"“ÜWfVÁBí”‚∞¢6ˆÁ7B∆ñÊ≤“WfVÁBÊFWFñ√ÚÊ∆ñÊ≥∞¢ñbÜ∆ñÊ≤í∞¢6WEvRÜ∆ñÊ≤ì∞¢6WD÷ˆ&ñ∆RÜf«6Rì∞¢–¢”∞¢vñÊF˜rÊFDWfVÁD∆ó7FVÊW"Ç'6b◊W6Ç÷ÊfñvFR"¬ÜÊF∆W"ì∞¢&WGW&‚Çí”‚vñÊF˜rÁ&V÷˜fTWfVÁD∆ó7FVÊW"Ç'6b◊W6Ç÷ÊfñvFR"¬ÜÊF∆W"ì∞¢“¬µ“ì∞¢ÚÚ6V“ó76Ú¬G&ˆ6"FRFV∆ÜW&F&ˆgVÊFñFFRFR&ˆ∆vV“FFV∆¢ÚÚÁFW&ñ˜"(	BVV“W7FfÊÚfñ“FRfW'&÷VÁF2'&ñ6ˆÊfñwW&:|;VW2¨:¢ÚÚÊÚ&ˆF:í¬&V6VÊFÚVR:vñÊ6'&Vv˜R'V∆÷WFFR"‡¢W6TVffV7BÇÇí”‚∞¢vñÊF˜rÁ67&ˆ∆≈FÚÉ¬ì∞¢“¬∑vU“ì∞¢ÚÚ∆V÷'&WFRWFˆ‹:Fñ6ÚFÚD2FÚ‘Tí‚<;2&ˆFÊÚW7:vÚFÚ,;7&ñÚFˆÊ¢ÚÚÜÁVÊ6Úfó7V∆ó¶"ÚW7:vÚFR˜WG&W76ˆíRÚFVGW˜"‹:ß2∑Fó¢ÚÚFVÁG&ÚFR'Vñ∆DF5&V÷ñÊFW"WfóF&WWFú:|:6Ú6F6'&Vv÷VÁFÚ‡¢W6TVffV7BÇÇí”‚∞¢ñbÜ7FófU76TñBÇí«¬F"ÁW6W#ÚÊñBí&WGW&„∞¢6ˆÁ7BÊWáB“'Vñ∆DF5&V÷ñÊFW"ÜF"ÁFÖ&ˆfñ∆R¬F"ÊÊ˜Fñfñ6FñˆÁ2¬F"ÁW6W"ÊñBì∞¢ñbÜÊWáBíWFFRÇÜBí”‚á≤‚‚ÊB¬Ê˜Fñfñ6FñˆÁ3¢ÊWáB“íì∞¢“¬∞¢F"ÁFÖ&ˆfñ∆SÚÊó4‘Tí¿¢F"ÁFÖ&ˆfñ∆SÚÊF4Üó7F˜'í¿¢F"ÁFÖ&ˆfñ∆R¿¢F"ÊÊ˜Fñfñ6FñˆÁ2¿¢F"ÁW6W#ÚÊñB¿¢WFFR¿¢“ì∞¢ÚÚ6ˆÁG&F˜2&V6˜'&VÁFW3¢∆V÷'&WFR÷VÁ6¬F˜2÷ÁVó2≤∆Ï:v÷VÁFÚWFˆ‹:Fñ6¢ÚÚF˜2÷&6F˜26ˆ÷ÚWFı˜7B‚<;2ÊÚW7:vÚFÚ,;7&ñÚFˆÊÚ¬ñFV◊˜FVÁFR˜ ¢ÚÚ‹:ß2ÜÜó7F˜'ï∑ñ’“FVÁG&ÚFR'Vñ∆E&V7W'&ñÊu˜7FñÊw2ı&V÷ñÊFW"í‡¢W6TVffV7BÇÇí”‚∞¢ñbÜ7FófU76TñBÇí«¬F"ÁW6W#ÚÊñBí&WGW&„∞¢6ˆÁ7B&V÷ñÊFW"“'Vñ∆E&V7W'&ñÊu&V÷ñÊFW"Ä¢F"Á&V7W'&ñÊr¿¢F"ÊÊ˜Fñfñ6FñˆÁ2¿¢F"ÁW6W"ÊñB¿¢ì∞¢6ˆÁ7B˜7FñÊw2“'Vñ∆E&V7W'&ñÊu˜7FñÊw2ÜF"Á&V7W'&ñÊr¬∞¢W6W$ñC¢F"ÁW6W"ÊñB¿¢“ì∞¢ñbÇ&V÷ñÊFW"bb˜7FñÊw2Ê∆VÊwFÇ””“í&WGW&„∞¢WFFRÇÜBí”‚∞¢6ˆÁ7BÊWáB“≤‚‚ÊB”∞¢ñbá&V÷ñÊFW"íÊWáBÊÊ˜Fñfñ6FñˆÁ2“&V÷ñÊFW#∞¢ñbá˜7FñÊw2Ê∆VÊwFÇí∞¢6ˆÁ7Bñ““FˆFíÇíÁ6∆ñ6RÉ¬rì∞¢6ˆÁ7B˜7FVDñG2“ÊWr6WBá˜7FñÊw2Ê÷Çáí”‚Ê6ˆÁG&7DñBíì∞¢ÊWáBÁG&Á67FñˆÁ2“∞¢‚‚Á˜7FñÊw2Ê÷Çáí”‚ÁG&Á67Fñˆ‚í¿¢‚‚‚ÜBÁG&Á67FñˆÁ2«¬µ“í¿¢”∞¢ÊWáBÁ&V7W'&ñÊr“ÜBÁ&V7W'&ñÊr«¬µ“íÊ÷ÇÜ2í”‡¢˜7FVDñG2ÊÜ2Ü2ÊñBê¢Ú∞¢‚‚Ê2¿¢Üó7F˜'ì¢∞¢‚‚‚Ü2ÊÜó7F˜'í«¬∑“í¿¢∑ñ’”¢≤˜7FVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí“¿¢“¿¢–¢¢2¿¢ì∞¢–¢&WGW&‚ÊWáC∞¢“ì∞¢“¬∂F"ÊÊ˜Fñfñ6FñˆÁ2¬F"Á&V7W'&ñÊr¬F"ÁW6W#ÚÊñB¬WFFU“ì∞¢ÚÚWFˆ÷:|;VW3¢&Vw&2vVÊFF2VR7&ñ“F&Vf2˜R∆V÷'&WFW26˜¶ñÊÜ2‡¢ÚÚ<;2ÊÚW7:vÚFÚ,;7&ñÚFˆÊÚ¬ñFV◊˜FVÁFR˜"W,:÷ˆFÚÜÜó7F˜'íÊ&Vw&í‡¢W6TVffV7BÇÇí”‚∞¢ñbÜ7FófU76TñBÇí«¬F"ÁW6W#ÚÊñBí&WGW&„∞¢6ˆÁ7B≤'V∆W2¬ñÁFVÁG2““'V‰WFˆ÷FñˆÁ2ÜF"ÊWFˆ÷FñˆÁ2«¬µ“ì∞¢ñbÜñÁFVÁG2Ê∆VÊwFÇ””“í&WGW&„∞¢WFFRÇÜBí”‚∞¢6ˆÁ7BF6∑2“ñÁFVÁG0¢Êfñ«FW"ÇÜíí”‚íÊ7FñˆÂGóR””“'F6≤"ê¢Ê÷ÇÜíí”‡¢F6¥g&ˆ‘ñFVÜíÁFWáB¬≤'W6ñÊW74ñC¢'W6ñÊW73ÚÊñB¬˜vÊW$ñC¢BÁW6W"ÊñB“í¿¢ì∞¢6ˆÁ7BÊ˜Fñg2“ñÁFVÁG0¢Êfñ«FW"ÇÜíí”‚íÊ7FñˆÂGóR””“'&V÷ñÊFW""ê¢Ê÷ÇÜíí”‚á∞¢ñC¢VñBÇí¿¢76ñvÊVTñC¢BÁW6W"ÊñB¿¢˜vÊW$ñC¢BÁW6W"ÊñB¿¢÷W76vS¢íÁFWáB¿¢∆ñÊ≥¢&WFˆ÷6ˆW2"¿¢&VC¢f«6R¿¢7&VFVDC¢ÊWrFFRÇíÁFÙï4ı7G&ñÊrÇí¿¢“íì∞¢&WGW&‚∞¢‚‚ÊB¿¢WFˆ÷FñˆÁ3¢'V∆W2¿¢F6∑3¢≤‚‚ÁF6∑2¬‚‚‚ÜBÁF6∑2«¬µ“ï“¿¢Ê˜Fñfñ6FñˆÁ3¢≤‚‚ÊÊ˜Fñg2¬‚‚‚ÜBÊÊ˜Fñfñ6FñˆÁ2«¬µ“ï“¿¢”∞¢“ì∞¢“¬∂'W6ñÊW73ÚÊñB¬F"ÊWFˆ÷FñˆÁ2¬F"ÁW6W#ÚÊñB¬WFFU“ì∞¢6ˆÁ7B7F'E&W6ó¶R“ÜRí”‚∞¢RÁ&WfVÁDFVfV«BÇì∞¢Fˆ7V÷VÁBÊ&ˆGíÁ7Gñ∆RÁW6W%6V∆V7B“&ÊˆÊR#∞¢Fˆ7V÷VÁBÊ&ˆGíÁ7Gñ∆RÊ7W'6˜"“&6ˆ¬◊&W6ó¶R#∞¢6ˆÁ7B÷˜fR“ÜWbí”‚6WE6'rÑ÷FÇÊ÷ñ‚É3É¬÷FÇÊ÷ÇÉ#¬WbÊ6∆ñVÁEÇííì∞¢6ˆÁ7BW“Çí”‚∞¢Fˆ7V÷VÁBÊ&ˆGíÁ7Gñ∆RÁW6W%6V∆V7B“"#∞¢Fˆ7V÷VÁBÊ&ˆGíÁ7Gñ∆RÊ7W'6˜"“"#∞¢&V÷˜fTWfVÁD∆ó7FVÊW"Ç'ˆñÁFW&÷˜fR"¬÷˜fRì∞¢&V÷˜fTWfVÁD∆ó7FVÊW"Ç'ˆñÁFW'W"¬Wì∞¢”∞¢FDWfVÁD∆ó7FVÊW"Ç'ˆñÁFW&÷˜fR"¬÷˜fRì∞¢FDWfVÁD∆ó7FVÊW"Ç'ˆñÁFW'W"¬Wì∞¢”∞¢W6TVffV7BÇÇí”‚∞¢Fˆ7V÷VÁBÊFˆ7V÷VÁDV∆V÷VÁBÊFF6WBÁFÜV÷R“F"Á&VfW&VÊ6W2ÁFÜV÷S∞¢“¬∂F"Á&VfW&VÊ6W2ÁFÜV÷U“ì∞¢W6TVffV7BÇÇí”‚∞¢ñbÇF"ÁW6W#ÚÊñBí&WGW&„∞¢6ˆÁ7B∂Wí“6b◊6W76ñˆ‚÷WfVÁC¢G∂F"ÁW6W"ÊñG”¢G∂F"Á76T∂Wí«¬&˜v‚'”¢G∑FˆFíÇó÷∞¢G'í∞¢ñbá6W76ñˆÂ7F˜&vRÊvWDóFV“Ü∂Wííí&WGW&„∞¢6W76ñˆÂ7F˜&vRÁ6WDóFV“Ü∂Wí¬#"ì∞¢“6F6Ç∑–¢G&6µ&ˆGV7DWfVÁBÇ'6W76ñˆÂ˜7F'FVB"¬∞¢÷ˆGV∆S¢&"¿¢÷ˆFS¢F"Á&VfW&VÊ6W2Ê÷ˆFR«¬&'W6ñÊW72"¿¢“ì∞¢“¬∂F"ÁW6W#ÚÊñB¬F"Á76T∂Wí¬F"Á&VfW&VÊ6W2Ê÷ˆFU“ì∞¢W6TVffV7BÇÇí”‚∞¢ñbÇF"ÁW6W"í&WGW&„∞¢6ˆÁ7B““∆ˆ6Fñˆ‚Á6V&6ÇÊ÷F6ÇÇı≥Úe÷6ˆÁfóFS“Öµ‚e“≤íÚì∞¢ñbÇ“í&WGW&„∞¢6ˆÁ7B6ˆFR“FV6ˆFUU$î6ˆ◊ˆÊVÁBÜ’≥“ì∞¢Üó7F˜'íÁ&W∆6U7FFRá∑“¬""¬∆ˆ6Fñˆ‚ÁFÜÊ÷Rì∞¢fWF6ÇÇ"ˆíˆ6ˆ∆∆"ˆ¶ˆñ‚"¬∞¢÷WFÜˆC¢%ı5B"¿¢ÜVFW'3¢≤&6ˆÁFVÁB◊GóR#¢&∆ñ6Fñˆ‚ˆß6ˆ‚"¬‚‚ÊWFÑÜVFW'2Çí“¿¢&ˆGì¢•4Ù‚Á7G&ñÊvñgíá≤6ˆFR“í¿¢“ê¢ÁFÜV‚Çá"í”‚"Êß6ˆ‚Çíê¢ÁFÜV‚ÇÜBí”‚∞¢ñbÜBbbBÊ˜vÊW$ñBí6WEFˆ7BÜfˆ<:¢VÁG&˜RÊÚW7:vÚFRG∂BÊ˜vÊW$Ê÷W÷ì∞¢V«6RñbÜBbbBÊW'&˜"í6WEFˆ7BÜBÊW'&˜"ì∞¢“ê¢Ê6F6ÇÇÇí”‚∑“ì∞¢“¬∂F"ÁW6W"¬6WEFˆ7E“ì∞¢W6TVffV7BÇÇí”‚∞¢ñbáFˆ7Bí∞¢6ˆÁ7BB“6WEFñ÷V˜WBÇÇí”‚6WEFˆ7BÇ""í¬#Cì∞¢&WGW&‚Çí”‚6∆V%Fñ÷V˜WBáBì∞¢–¢“¬∑Fˆ7E“ì∞¢W6TVffV7BÇÇí”‚∞¢6ˆÁ7Bˆ‰∂Wí“ÜRí”‚∞¢ñbÇÜRÊ÷WF∂Wí«¬RÊ7G&ƒ∂WííbbRÊ∂WíÁFÙ∆˜vW$66RÇí””“&≤"í∞¢RÁ&WfVÁDFVfV«BÇì∞¢6WE6V&6Ñ˜V‚áG'VRì∞¢–¢ñbÜRÊ∂Wí””“$W66R"í6WE6V&6Ñ˜V‚Üf«6Rì∞¢”∞¢vñÊF˜rÊFDWfVÁD∆ó7FVÊW"Ç&∂WñF˜v‚"¬ˆ‰∂Wíì∞¢&WGW&‚Çí”‚vñÊF˜rÁ&V÷˜fTWfVÁD∆ó7FVÊW"Ç&∂WñF˜v‚"¬ˆ‰∂Wíì∞¢“¬µ“ì∞¢W6TVffV7BÇÇí”‚∞¢ñbÇF"ÁW6W"í&WGW&„∞¢ñbÜF"Á&VfW&VÊ6W2Ê÷ˆFT6Ü˜6V‚í&WGW&„∞¢ñbÇÜ4Áïv˜&∑76TFFÜF"íí&WGW&„∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢&VfW&VÊ6W3¢∞¢‚‚ÊBÁ&VfW&VÊ6W2¿¢÷ˆFS¢BÁ&VfW&VÊ6W2Ê÷ˆFR«¬&'W6ñÊW72"¿¢÷ˆFT6Ü˜6V„¢G'VR¿¢“¿¢“íì∞¢“¬∂F"¬F"Á&VfW&VÊ6W2Ê÷ˆFT6Ü˜6V‚¬F"ÁW6W"¬WFFU“ì∞¢6ˆÁ7BV&∆ñ4÷F6Ç“∆ˆ6Fñˆ‚ÁFÜÊ÷RÊ÷F6ÇÇıÂ¬˜5¬ÚÖµ‚ı“≤íÉÛ•¬ÚÖµ‚ı“≤íìÚÚì∞¢6ˆÁ7BV&∆ñ56«Vr“V&∆ñ4÷F6ÉÚÂ≥”∞¢ñbáV&∆ñ56«Vrê¢&WGW&‚Ä¢≈V&∆ñ56óFP¢6óFS◊∂F"Á6óFW2ÊfñÊBÇáÇí”‚ÇÁ6«Vr””“V&∆ñ56«Vró–¢vS◊∑V&∆ñ4÷F6ÉÚÂ≥%“«¬"'–¢Û‡¢ì∞¢6ˆÁ7BñÁfóFT÷F6Ç“∆ˆ6Fñˆ‚ÁFÜÊ÷RÊ÷F6ÇÇıÂ¬ˆ6ˆÁfóFU¬ÚÖµ‚ı“≤íÚì∞¢ñbÜñÁfóFT÷F6Çê¢&WGW&‚ƒ66WDñÁfóFRF#◊∂F'“WFFS◊∑WFFW“Fˆ∂V„◊∂ñÁfóFT÷F6Ö≥◊“Û„∞¢ñbÇF"ÁW6W"í&WGW&‚ƒ∆ˆvñ‚WFFS◊∑WFFW“Û„∞¢ñbÇF"Á&VfW&VÊ6W2Ê÷ˆFT6Ü˜6V‚bbÜ4Áïv˜&∑76TFFÜF"íê¢&WGW&‚ƒ÷ˆFTˆÊ&ˆ&FñÊrWFFS◊∑WFFW“Û„∞¢6ˆÁ7B÷ˆFR“F"Á&VfW&VÊ6W2Ê÷ˆFR«¬&'W6ñÊW72#∞¢ñbÄ¢÷ˆFR””“&'W6ñÊW72"b`¢F"Á&VfW&VÊ6W2ÊÊVVG4'W6ñÊW74ˆÊ&ˆ&FñÊr””“G'VP¢ê¢&WGW&‚ƒˆÊ&ˆ&FñÊrF#◊∂F'“WFFS◊∑WFFW“Û„∞¢6ˆÁ7Bó4V◊∆˜ñVT÷ˆFR“÷ˆFR””“&V◊∆˜ñVR#∞¢6ˆÁ7Bfó6ñ&∆TÊb“Êdf˜$'W6ñÊW72Ü÷ˆFR¬'W6ñÊW72ì∞¢6ˆÁ7B◊îÊ˜Fñfñ6FñˆÁ2“ÜF"ÊÊ˜Fñfñ6FñˆÁ2«¬µ“íÊfñ«FW"Ä¢Ü‚í”‚‚Ê76ñvÊVTñB””“F"ÁW6W"ÊñB¿¢ì∞¢6ˆÁ7BÊ˜&÷∆ó¶U6V&6Ç“á2í”‡¢7G&ñÊrá2«¬""ê¢ÊÊ˜&÷∆ó¶RÇ$‰dB"ê¢Á&W∆6RÇıº»‹⁄ı“ˆr¬""ê¢ÁFÙ∆˜vW$66RÇì∞¢6ˆÁ7B6V&6Ü&∆TÊb“≤‚‚Áfó6ñ&∆TÊb¬‚‚ÊÊe6V6ˆÊF'ï”∞¢6ˆÁ7B6V&6Ö&W7V«G2“6V&6ÖVW'íÁG&ñ“Çê¢Ú6V&6Ü&∆TÊbÊfñ«FW"ÇÖ≤¬∆&V≈“í”‡¢Ê˜&÷∆ó¶U6V&6ÇÜ∆&V¬íÊñÊ6«VFW2ÜÊ˜&÷∆ó¶U6V&6Çá6V&6ÖVW'ííí¿¢ê¢¢6V&6Ü&∆TÊc∞¢6ˆÁ7B6ˆÁFVÁE6V&6Ö&W7V«G2“ÇÇí”‚∞¢6ˆÁ7B“Ê˜&÷∆ó¶U6V&6Çá6V&6ÖVW'íì∞¢ñbÇí&WGW&‚µ”∞¢&WGW&‚∞¢‚‚‚ÜF"ÁF6∑2«¬µ“ê¢Êfñ«FW"ÇáBí”‡¢Ê˜&÷∆ó¶U6V&6ÇÜG∑BÁFóF∆W“G∑BÊFW67&óFñˆ‚«¬"'÷íÊñÊ6«VFW2áí¿¢ê¢Ê÷ÇáBí”‚á∞¢∂ñÊC¢'F6≤"¿¢∂Wì¢F6≤“G∑BÊñG÷¿¢ñ6ˆ„¢v˜&∂f∆˜r¿¢FóF∆S¢BÁFóF∆R¿¢7V'FóF∆S¢BÁ&ˆ¶V7B«¬BÊ&V«¬%F&Vf"¿¢vS¢&˜W&6Ú"¿¢“íí¿¢‚‚‚ÜF"Ê∆VG2«¬µ“ê¢Êfñ«FW"ÇÜ¬í”‡¢Ê˜&÷∆ó¶U6V&6ÇÜG∂¬ÊÊ÷W“G∂¬Ê6ˆ◊Áí«¬"'÷íÊñÊ6«VFW2áí¿¢ê¢Ê÷ÇÜ¬í”‚á∞¢∂ñÊC¢&∆VB"¿¢∂Wì¢∆VB“G∂¬ÊñG÷¿¢ñ6ˆ„¢ÜÊG6Ü∂R¿¢FóF∆S¢¬ÊÊ÷R¿¢7V'FóF∆S¢¬Ê6ˆ◊Áí«¬$∆VB"¿¢vS¢'fVÊF2"¿¢“íí¿¢‚‚‚ÜF"ÊFˆ7V÷VÁG2«¬µ“ê¢Êfñ«FW"ÇÜBí”‚Ê˜&÷∆ó¶U6V&6ÇÜBÁFóF∆RíÊñÊ6«VFW2áíê¢Ê÷ÇÜBí”‚á∞¢∂ñÊC¢&Fˆ7V÷VÁB"¿¢∂Wì¢Fˆ2“G∂BÊñG÷¿¢ñ6ˆ„¢fñ∆UFWáB¿¢FóF∆S¢BÁFóF∆R¿¢7V'FóF∆S¢BÁGóR«¬$Fˆ7V÷VÁFÚ"¿¢vS¢&Fˆ7V÷VÁF˜2"¿¢“íí¿¢‚‚‚ÜF"Ê6ˆÁF7G2«¬µ“ê¢Êfñ«FW"ÇÜ2í”‡¢Ê˜&÷∆ó¶U6V&6ÇÜG∂2ÊÊ÷W“G∂2Ê6ˆ◊Áí«¬"'÷íÊñÊ6«VFW2áí¿¢ê¢Ê÷ÇÜ2í”‚á∞¢∂ñÊC¢&6ˆÁF7B"¿¢∂Wì¢6ˆÁF7B“G∂2ÊñG÷¿¢ñ6ˆ„¢W6W'2¿¢FóF∆S¢2ÊÊ÷R¿¢7V'FóF∆S¢2Ê6ˆ◊Áí«¬$6ˆÁFFÚ"¿¢vS¢&6ˆÁFF˜2"¿¢“íí¿¢“Á6∆ñ6RÉ¬#ì∞¢“íÇì∞¢6ˆÁ7B˜V‰6ˆÁFVÁE6V&6Ö&W7V«B“á&W7V«Bí”‚∞¢6WE6V&6Ö6VVBá&W7V«BÁFóF∆Rì∞¢vÚá&W7V«BÁvRì∞¢6WE6V&6Ñ˜V‚Üf«6Rì∞¢6WE6V&6ÖVW'íÇ""ì∞¢”∞¢6ˆÁ7BvÚ“áí”‚∞¢6WEvRáì∞¢6WD÷ˆ&ñ∆RÜf«6Rì∞¢G&6µ&ˆGV7DWfVÁBÇ&ÊfñvFñˆ‚"¬≤÷ˆGV∆S¢“ì∞¢ÚÚ6ˆÁFfó6óF&ˆFW"7VvW&ó"FWˆó2ÚVRW76ˆW6FRfW&FFR‡¢ÚÚfñ6ÊÚ&V∆ÜÚ¬f˜&FÚv˜&∑76S¢w&f"Ú&Ê6ÚñÁFVó&Ú6F6∆óVP¢ÚÚFRÊfVv:|:6ÚG&˜V∆fÚW7FFÚFRFV∆2&W'F2‡¢ÚÚ7VvW7L:6Ú:í<;27VvW7L:6Û¢Ú÷VÁRÁVÊ66R&V˜&vÊó¶6˜¶ñÊÜÚ¬6VÏ:6Ú¢ÚÚW76ˆW&FRÚ&˜L:6ÚVR¨:FñÊÜFV6˜&FÚ‡¢w&óFUfó6óBávñÊF˜rÊ∆ˆ6≈7F˜&vR¬ì∞¢”∞¢6ˆÁ7B6ˆÁFVÁB“Çí”‚∞¢7vóF6ÇávRí∞¢66R&ñÊñ6ñÚ#†¢&WGW&‚Ä¢ƒF6Ü&ˆ&@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢vÛ◊∂v˜–¢6WEFˆ7C◊∑6WEFˆ7G–¢fó6ñ&∆TÊc◊∑fó6ñ&∆TÊg–¢Û‡¢ì∞¢66R&6ˆ÷V6"#†¢&WGW&‚ƒ¶˜W&ÊWó2F#◊∂F'“WFFS◊∑WFFW“vÛ◊∂v˜“Û„∞¢66R&W7G&FVvñ#†¢66R&÷&∂WFñÊr#†¢&WGW&‚Ä¢≈7V6ñ∆ó7G0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢&V◊∑vW–¢Û‡¢ì∞¢66R'fVÊF2#†¢&WGW&‚Ä¢ƒ5$–¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢6V&6Ö6VVC◊∑6V&6Ö6VVG–¢6∆V%6V&6Ö6VVC◊∂6∆V%6V&6Ö6VVG–¢&VFˆˆ∆∂óC◊¥&VFˆˆ∆∂óG–¢V÷ñƒ6ˆ◊˜6W#◊¥V÷ñƒ6ˆ◊˜6W'–¢6Ü&ñÊtfñV∆G3◊µ6Ü&ñÊtfñV∆G7–¢'Vñ∆D∆VEvˆÂ6ñFTVffV7G3◊∂'Vñ∆D∆VEvˆÂ6ñFTVffV7G7–¢∆ˆtñÁFW&7Fñˆ„◊∂∆ˆtñÁFW&7FñˆÁ–¢W6W'D6ˆÁF7C◊∑W6W'D6ˆÁF7G–¢W6UvÜG66VÊFW#◊∑W6UvÜG66VÊFW'–¢Û‡¢ì∞¢66R&÷WR◊G&&∆ÜÚ#†¢&WGW&‚Ä¢ƒ◊ïv˜&≤F#◊∂F'“'W6ñÊW73◊∂'W6ñÊW77“6WEFˆ7C◊∑6WEFˆ7G“vÛ◊∂v˜“Û‡¢ì∞¢66R'&W7V«FF˜2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚF6Ü&ˆ&G2‚‚„¬ˆFócÁ–¢‡¢ƒ6ˆÊfñwW&&∆TF6Ü&ˆ&@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&6ÜB÷6˜'˜&FófÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ6ˆÁfW'62‚‚„¬ˆFócÁ–¢‡¢ƒ6˜'˜&FT6Ü@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢vÛ◊∂v˜–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢˜vÊW$ñC◊∂7FófU76TñBÇó–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&˜&6÷VÁF˜2#†¢&WGW&‚Ä¢≈V˜FW0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢'Vñ∆D˜&FW%&V6VóF◊∂'Vñ∆D˜&FW%&V6VóF–¢∆ˆtñÁFW&7Fñˆ„◊∂∆ˆtñÁFW&7FñˆÁ–¢˜&FW$g&ˆ’V˜FS◊∂˜&FW$g&ˆ’V˜FW–¢V˜FUF˜F√◊∑V˜FUF˜F«–¢6Ü&ñÊtfñV∆G3◊µ6Ü&ñÊtfñV∆G7–¢W6W'D6ˆÁF7C◊∑W6W'D6ˆÁF7G–¢W6UvÜG66VÊFW#◊∑W6UvÜG66VÊFW'–¢Û‡¢ì∞¢66R'&V6ñfñ66Ú#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ&V6ñfñ6:|:6Ú‚‚„¬ˆFócÁ–¢‡¢≈&ñ6ñÊtñ◊7E7GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&6ˆ◊&2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ6ˆ◊&2‚‚„¬ˆFócÁ–¢‡¢≈&ˆ7W&V÷VÁ@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢WáG&7DFˆ7V÷VÁEFWáC◊∂WáG&7DFˆ7V÷VÁEFWáG–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&6óÜ#†¢&WGW&‚Ä¢ƒñÊ&˜ÑáV ¢WFFS◊∑WFFW–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢7FófU76TñC◊∂7FófU76TñG–¢ñÊ&˜ÖW&√◊∂ñÊ&˜ÖW&«–¢∆ˆtñÁFW&7Fñˆ„◊∂∆ˆtñÁFW&7FñˆÁ–¢Û‡¢ì∞¢66R&6ˆÁFF˜2#†¢&WGW&‚Ä¢ƒ6ˆÁF7G0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢6V&6Ö6VVC◊∑6V&6Ö6VVG–¢6∆V%6V&6Ö6VVC◊∂6∆V%6V&6Ö6VVG–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢ñÊ&˜ÖW&√◊∂ñÊ&˜ÖW&«–¢'6TFV∆ñ÷óFVEFWáC◊∑'6TFV∆ñ÷óFVEFWáG–¢G&6µ&ˆGV7DWfVÁC◊∑G&6µ&ˆGV7DWfVÁG–¢6Ü&ñÊtfñV∆G3◊µ6Ü&ñÊtfñV∆G7–¢V÷ñƒ6ˆ◊˜6W#◊¥V÷ñƒ6ˆ◊˜6W'–¢W6UvÜG66VÊFW#◊∑W6UvÜG66VÊFW'–¢Û‡¢ì∞¢66R&vVÊF÷VÁF˜2#†¢&WGW&‚Ä¢ƒˆñÁF÷VÁG0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢6Ü&ñÊtfñV∆G3◊µ6Ü&ñÊtfñV∆G7–¢7&VFTvˆˆv∆T6∆VÊF$WfVÁE&V√◊∂7&VFTvˆˆv∆T6∆VÊF$WfVÁE&V«–¢vˆˆv∆T6∆VÊF%W&√◊∂vˆˆv∆T6∆VÊF%W&«–¢W6W'D6ˆÁF7C◊∑W6W'D6ˆÁF7G–¢W6UvÜG66VÊFW#◊∑W6UvÜG66VÊFW'–¢Û‡¢ì∞¢66R'&ˆGWF˜2#†¢&WGW&‚Ä¢ƒ6F∆ˆp¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R&g&˜F#†¢&WGW&‚Ä¢ƒf∆VW@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R&Ü˜&2#†¢&WGW&‚Ä¢≈Fñ÷UG&6∂ñÊp¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&fñÊÊ6Vó&Ú#†¢&WGW&‚Ä¢ƒfñÊÊ6P¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R&˜W&6Ú#†¢&WGW&‚Ä¢≈F6∑0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢6V&6Ö6VVC◊∑6V&6Ö6VVG–¢6∆V%6V&6Ö6VVC◊∂6∆V%6V&6Ö6VVG–¢v˜&∑76T7Fñˆ„◊∑v˜&∑76T7FñˆÁ–¢Û‡¢ì∞¢66R&W7G'WGW&#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚW7G'WGW&‚‚„¬ˆFócÁ–¢‡¢≈v˜&µ7G'V7GW&P¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'VG&Ú◊&ñFÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚVG&Ú‚‚„¬ˆFócÁ–¢‡¢≈Vñ6µvÜóFV&ˆ&@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&Fñw&÷2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚFñw&÷2‚‚„¬ˆFócÁ–¢‡¢ƒFñw&’7GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'VG&Ú#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚVG&Ú‚‚„¬ˆFócÁ–¢‡¢ƒ6Áf4&ˆ&@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'&WVÊñˆW2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ&WVÊú;VW2‚‚„¬ˆFócÁ–¢‡¢ƒ÷VWFñÊw0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'&W7V«FFÚ÷÷W2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ&W7V«FFÚ‚‚„¬ˆFócÁ–¢‡¢ƒ÷ˆÁFÜ«ï7FFV÷VÁBF#◊∂F'“'W6ñÊW73◊∂'W6ñÊW77“Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&gVÊñ¬#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚgVÊñ¬‚‚„¬ˆFócÁ–¢‡¢≈6∆W5óV∆ñÊP¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&6ˆÁF2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ6ˆÁF2‚‚„¬ˆFócÁ–¢‡¢ƒ&ñ∆«0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&Ê∆ó6R÷FF˜2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚÏ:∆ó6R‚‚„¬ˆFócÁ–¢‡¢ƒFF∆"F#◊∂F'“'W6ñÊW73◊∂'W6ñÊW77“Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&÷V÷˜&ñ÷'W66#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ÷V‹;7&ñ‚‚„¬ˆFócÁ–¢‡¢ƒ∂Ê˜v∆VFvT6VÁFW ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'W'6ˆÊ∆ó¶"÷÷VÁR#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ÷VÁR‚‚„¬ˆFócÁ–¢‡¢ƒ÷VÁU6WGFñÊw0¢F#◊∂F'–¢WFFS◊∑WFFW–¢Êc◊∑fó6ñ&∆TÊg–¢w&˜W3◊∂Êdw&˜W7–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&÷WR◊∆ÊÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ∆ÊÚ‚‚„¬ˆFócÁ–¢‡¢≈∆ÂÊV¬6WEFˆ7C◊∑6WEFˆ7G“Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&vVÁFW2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚvVÁFW2‚‚„¬ˆFócÁ–¢‡¢ƒvVÁE7GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢v˜&∑76T˜vÊW$ñC◊∂7FófU76TñBÇí«¬F"ÁW6W#ÚÊñB«¬"'–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'˜'Ffˆ∆ñÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ˜'Fl;6∆ñÚ‚‚„¬ˆFócÁ–¢‡¢≈˜'Ffˆ∆ñÙ&ˆ&@¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&Ê˜F2÷6ˆÊV7FF2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚÊ˜F2‚‚„¬ˆFócÁ–¢‡¢ƒ6ˆÊÊV7FVDÊ˜FW0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'∆ÊV¶"#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ∆ÊV¶÷VÁFÚ‚‚„¬ˆFócÁ–¢‡¢ƒFï∆ÊÊW ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&÷WF2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ÷WF2‚‚„¬ˆFócÁ–¢‡¢ƒvˆ«0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'&ˆ6W76˜2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ&ˆ6W76˜2‚‚„¬ˆFócÁ–¢‡¢≈&ˆ6W757GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&f˜&◊V∆&ñ˜2◊V&∆ñ6˜2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚf˜&◊VÃ:&ñ˜2‚‚„¬ˆFóc‡¢–¢‡¢≈V&∆ñ4f˜&◊57GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢˜vÊW$ñC◊∂7FófU76TñBÇó–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R'˜'F¬÷6∆ñVÁFR#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‡¢6'&VvÊFÚ˜'F¬FÚ6∆ñVÁFR‚‚‡¢¬ˆFóc‡¢–¢‡¢ƒ6∆ñVÁE˜'F≈7GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢˜vÊW$ñC◊∂7FófU76TñBÇó–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&66ñFFR#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ66ñFFR‚‚„¬ˆFócÁ–¢‡¢ƒ66óGï∆ÊÊW ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&FW6VÁfˆ«fñ÷VÁFÚ#†¢&WGW&‚Ä¢ƒFWfV∆˜÷VÁE∆Á0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R'6óFW2#†¢&WGW&‚Ä¢≈6óFW0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R&Fˆ7V÷VÁF˜2#†¢&WGW&‚Ä¢ƒFˆ7V÷VÁG0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢6V&6Ö6VVC◊∑6V&6Ö6VVG–¢6∆V%6V&6Ö6VVC◊∂6∆V%6V&6Ö6VVG–¢Û‡¢ì∞¢66R&&W6VÁF6ˆW2#†¢&WGW&‚Ä¢≈&W6VÁFFñˆÁ0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&6ˆÁFWVFÚ#†¢&WGW&‚Ä¢ƒ6ˆÁFVÁE∆ÊÊW ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R'∆Êñ∆Ü2#†¢&WGW&‚Ä¢≈6ÜVWD'Vñ∆FW ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&Ê∆ó6R#†¢&WGW&‚Ä¢ƒÊ«ó¶W ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&ñFVñ2#†¢&WGW&‚Ä¢ƒ÷ñÊD÷ ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R&76ñÊGW&#†¢&WGW&‚Ä¢ƒV÷ñ≈6ñvÊGW&P¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&6ˆ'&Ê6#†¢&WGW&‚Ä¢≈óÑ6Ü&vP¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&&6W2#†¢&WGW&‚Ä¢ƒFF&6W0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R'vñ∂í#†¢&WGW&‚Ä¢≈vñ∂ê¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&WFˆ÷6ˆW2#†¢&WGW&‚Ä¢ƒWFˆ÷FñˆÁ0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&fW'&÷VÁF2#†¢&WGW&‚Ä¢≈Fˆˆ«4áV ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R'Fñ÷R#†¢&WGW&‚≈FV“F#◊∂F'“WFFS◊∑WFFW“6WEFˆ7C◊∑6WEFˆ7G“Û„∞¢66R&6ˆÊfñr#†¢&WGW&‚Ä¢ƒ66˜VÁE6WGFñÊw2F#◊∂F'“WFFS◊∑WFFW“6WEFˆ7C◊∑6WEFˆ7G“vÛ◊∂v˜“Û‡¢ì∞¢66R&∆Vv¬#†¢&WGW&‚ƒ∆Vv≈vRvÛ◊∂v˜“Û„∞¢66R&7&ñ6Ú÷∆ˆ6¬#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚfW'&÷VÁF2‚‚„¬ˆFóc‡¢–¢‡¢ƒ7&VFófUFˆˆ∆∂óB'W6ñÊW73◊∂'W6ñÊW77“6WEFˆ7C◊∑6WEFˆ7G“Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&∆&˜&F˜&ñÚ÷w&GVóFÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ∆&˜&L;7&ñÚ‚‚„¬ˆFóc‡¢–¢‡¢ƒg&VU7VóFP¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢˜vÊW$ñC◊∂7FófU76TñBÇó–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&6VÁG&¬÷7&W66ñ÷VÁFÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ6VÁG&¬‚‚„¬ˆFóc‡¢–¢‡¢≈∆Ff˜&’7VóFP¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢˜vÊW$ñC◊∂7FófU76TñBÇó–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&VFóF˜"÷6ˆFñvÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚVFóF˜"‚‚„¬ˆFócÁ–¢‡¢ƒ6ˆFU7GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&Ê˜FV&ˆˆ≤#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚÊ˜FV&ˆˆ≤‚‚„¬ˆFócÁ–¢‡¢ƒFFÊ˜FV&ˆˆ∞¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&ñÁFVw&6ˆW2#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚñÁFVw&:|;VW2‚‚„¬ˆFóc‡¢–¢‡¢ƒñÁFVw&FñˆÁ4áV ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢WFÑÜVFW'3◊∂WFÑÜVFW'7–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&÷ñFñ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊≥∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#‰6'&VvÊFÚ‹:÷Fñ‚‚„¬ˆFócÁ–¢‡¢ƒ÷VFñ7GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&W7GVFñÚ#†¢&WGW&‚Ä¢ƒ7&VFófU7GVFñ¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢ì∞¢66R&Üó7F˜&ñ6Ú#†¢&WGW&‚Ä¢ƒÜó7F˜'ïvP¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R&6W'Fñfñ66ˆW2#†¢&WGW&‚Ä¢ƒ6W'Fñfñ6FñˆÁ0¢F#◊∂F'–¢WFFS◊∑WFFW–¢'W6ñÊW73◊∂'W6ñÊW77–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢66R'W&fñ¬÷ÊVvˆ6ñÚ#†¢&WGW&‚Ä¢≈7W7VÁ6P¢f∆∆&6≥◊∞¢∆Fób6∆74Ê÷S“&ñÊ&˜Ç÷∆ˆFñÊr#Â&W&ÊFÚ6WRÊV|;66ñÚ‚‚„¬ˆFóc‡¢–¢‡¢ƒ'W6ñÊW75&ˆfñ∆U7GVFñ¢∂Wì◊∂'W6ñÊW73ÚÊñB«¬'6V“÷ÊVvˆ6ñÚ'–¢'W6ñÊW73◊∂'W6ñÊW77–¢WFFS◊∑WFFW–¢vÛ◊∂v˜–¢6WEFˆ7C◊∑6WEFˆ7G–¢Û‡¢¬ı7W7VÁ6S‡¢ì∞¢66R&'W6ñÊW76W2#†¢&WGW&‚Ä¢ƒ'W6ñÊW76W0¢F#◊∂F'–¢WFFS◊∑WFFW–¢6WEFˆ7C◊∑6WEFˆ7G–¢vÛ◊∂v˜–¢Û‡¢ì∞¢FVfV«C†¢&WGW&‚ÁV∆√∞¢–¢”∞¢&WGW&‚Ä¢∆Fó`¢6∆74Ê÷S◊∂G∂6ˆ∆∆6VBÚ&6ˆ∆∆6VB"¢"'“G∂÷VÁTÜñFFV‚Ú&÷VÁR÷ÜñFFV‚"¢"'÷–¢7Gñ∆S◊∑≤"“◊6'r#¢G∑6'w◊Ü◊–¢‡¢∆6ñFR6∆74Ê÷S◊∂÷ˆ&ñ∆RÚ&˜V‚"¢"'”‡¢∆Fób6∆74Ê÷S“'6ñFR◊F˜#‡¢ƒ∆ˆvÚ6ˆ◊7C◊∂6ˆ∆∆6VG“Û‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚÷ˆ&ñ∆R÷6∆˜6R ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆ&ñ∆RÜf«6Ró–¢‡¢≈ÇÛ‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢∆Êc‡¢≤ÇÇí”‚∞¢ÚÚÚ÷VÁR&ñÊ6ó¬:íW66ˆ∆ÜñFÚ˜"VV“W6‚ÚVRfñ6FRf˜&Ï84¢ÚÚW&FR6W76Û¢6íV“%FˆF22fW'&÷VÁF2"¬∆ˆvÚ&óÜÚ¬P¢ÚÚ6ˆÁFñÁV6å:fV¬V∆'W66‚W66ˆ∆ÜW"÷VÁR:í˜&vÊó¶"F∆ÜÚ‡¢6ˆÁ7B≤÷ñ‚¬&W7B““'Vñ∆DÊfñvFñˆ‚Ä¢fó6ñ&∆TÊb¿¢F"Á&VfW&VÊ6W3ÚÊ÷ñ‰÷VÁR¿¢Êdw&˜W2¿¢ì∞¢6ˆÁ7B&˜FÚ“Ö∂ñB¬∆&V¬¬ï“í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂ñG–¢6∆74Ê÷S◊∑vR””“ñBÚ&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚vÚÜñBó–¢FóF∆S◊∂6ˆ∆∆6VBÚ∆&V¬¢VÊFVfñÊVG–¢‡¢ƒíÛ‡¢«7„Á∂∆&V«”¬˜7„‡¢¬ˆ'WGFˆ„‡¢ì∞¢&WGW&‚Ä¢√‡¢∆Fób6∆74Ê÷S“&Êb÷w&˜W#Á∂÷ñ‚Ê÷Ñ&˜FÚó”¬ˆFóc‡¢∑&W7BÊ∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&Êb÷w&˜WÊb◊&W7B#‡¢≤6ˆ∆∆6VBbbÄ¢∆'WGFˆ‡¢GóS“&'WGFˆ‚ ¢6∆74Ê÷S“&Êb◊&W7B◊Fˆvv∆R ¢&ñ÷WáÊFVC◊∑6Ü˜t∆≈Fˆˆ«7–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢6ˆÁ7B&˜Üñ÷Ú“6Ü˜t∆≈Fˆˆ«3∞¢6WE6Ü˜t∆≈Fˆˆ«2á&˜Üñ÷Úì∞¢WFFRá∞¢‚‚ÊF"¿¢&VfW&VÊ6W3¢∞¢‚‚ÊF"Á&VfW&VÊ6W2¿¢÷VÁTWáÊFVC¢&˜Üñ÷Ú¿¢“¿¢“ì∞¢◊–¢‡¢ƒ6ÜWg&ˆ‰F˜v‡¢6∆74Ê÷S◊∑6Ü˜t∆≈Fˆˆ«2Ú&&W'FÚ"¢"'–¢6ó¶S◊≥W–¢Û‡¢«7„ÂFˆF22fW'&÷VÁF3¬˜7„‡¢¬ˆ'WGFˆ„‡¢ó–¢≤á6Ü˜t∆≈Fˆˆ«2«¬6ˆ∆∆6VBíb`¢&W7BÊ÷ÇÜw&˜W¬víí”‚Ä¢∆Fó`¢6∆74Ê÷S“&Êb÷w&˜W ¢∂Wì◊∂w&˜WÊ∆&V¬«¬"G∂vó÷–¢‡¢∂w&˜WÊ∆&V¬bb6ˆ∆∆6VBbbÄ¢«7‚6∆74Ê÷S“&Êb÷w&˜W÷∆&V¬#‡¢∂w&˜WÊ∆&V«–¢¬˜7„‡¢ó–¢∂w&˜WÊóFV◊2Ê÷Ñ&˜FÚó–¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢ó–¢¬Û‡¢ì∞¢“íÇó–¢∆Fób6∆74Ê÷S“&Êb÷FófñFW""Û‡¢∂Êe6V6ˆÊF'íÊ÷ÇÖ∂ñB¬∆&V¬¬ï“í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂ñG–¢6∆74Ê÷S◊∑vR””“ñBÚ&7FófR"¢"'–¢ˆ‰6∆ñ6≥◊≤Çí”‚vÚÜñBó–¢FóF∆S◊∂6ˆ∆∆6VBÚ∆&V¬¢VÊFVfñÊVG–¢‡¢ƒíÛ‡¢«7„Á∂∆&V«”¬˜7„‡¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆÊc‡¢∆Fób6∆74Ê÷S“'6ñFR÷&˜GFˆ“#‡¢∆'WGFˆ‡¢ˆ‰6∆ñ6≥◊≤Çí”‡¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢&VfW&VÊ6W3¢∞¢‚‚ÊBÁ&VfW&VÊ6W2¿¢FÜV÷S¢BÁ&VfW&VÊ6W2ÁFÜV÷R””“&∆ñváB"Ú&F&≤"¢&∆ñváB"¿¢“¿¢“íê¢–¢‡¢∂F"Á&VfW&VÊ6W2ÁFÜV÷R””“&∆ñváB"Úƒ÷ˆˆ‚Û‚¢≈7V‚ÛÁ–¢«7„‡¢∂F"Á&VfW&VÊ6W2ÁFÜV÷R””“&∆ñváB"Ú$÷ˆFÚW67W&Ú"¢$÷ˆFÚ6∆&Ú'–¢¬˜7„‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢ñbÄ¢6ˆÊfó&“Ä¢$VÊ6W'&"W7F6W7<:6ÛÚ6WW2&ˆ¶WF˜26ˆÁFñÁV,:6Ú&˜FVvñF˜2Ê7V6ˆÁF‚"¿¢ê¢í∞¢VÊE6W76ñˆ‚Çì∞¢WFFRÇÇí”‚6∆V‰F"ÜÁV∆¬íì∞¢–¢◊–¢‡¢ƒ∆ˆt˜WBÛ‡¢«7„Â6ó#¬˜7„‡¢¬ˆ'WGFˆ„‡¢∆Fób6∆74Ê÷S“'6ñFR÷6ˆÁG&ˆ«2#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FW6∑F˜÷6ˆ∆∆6R ¢FóF∆S◊∂6ˆ∆∆6VBÚ$WáÊFó"÷VÁR"¢$÷ˆFÚ6ˆ◊7FÚ'–¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD6ˆ∆∆6VBÇ6ˆ∆∆6VBó–¢‡¢∂6ˆ∆∆6VBÚƒ6ÜWg&ˆÂ&ñváBÛ‚¢ƒ6ÜWg&ˆ‰∆VgBÛÁ–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FW6∑F˜÷6∆˜6R ¢FóF∆S“$fV6Ü"÷VÁR ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷VÁTÜñFFV‚áG'VRó–¢‡¢≈ÇÛ‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'6"◊&W6ó¶R"ˆÂˆñÁFW$F˜v„◊∑7F'E&W6ó¶W“Û‡¢¬ˆ6ñFS‡¢∂÷ˆ&ñ∆RbbÄ¢∆Fó`¢6∆74Ê÷S“&÷ˆ&ñ∆R÷˜fW&∆í ¢&ˆ∆S“&'WGFˆ‚ ¢F$ñÊFWÉ◊≥–¢&ñ÷∆&V√“$fV6Ü"÷VÁR ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆ&ñ∆RÜf«6Ró–¢ˆ‰∂WîF˜v„◊≤ÜWfVÁBí”‚∞¢ñbÜWfVÁBÊ∂Wí””“$W66R"«¬WfVÁBÊ∂Wí””“$VÁFW""«¬WfVÁBÊ∂Wí””“""ê¢6WD÷ˆ&ñ∆RÜf«6Rì∞¢◊–¢Û‡¢ó–¢∆÷ñ‚6∆74Ê÷S“'v˜&∑76R#‡¢∑v˜&∑76T6ˆÊf∆ñ7BbbÄ¢∆Fób6∆74Ê÷S“'v˜&∑76R÷6ˆÊf∆ñ7B"&ˆ∆S“&∆W'B#‡¢ƒ6ó&6∆T∆W'BÛ‡¢∆Fóc‡¢«7G&ˆÊs‰«FW&:|;VW2VÊ6ˆÁG&F2V“˜WG&ÚFó7˜6óFófÚ˜R&¬˜7G&ˆÊs‡¢«7„‡¢W7FfW'<:6ÚÏ:6ÚfˆíVÁfñFR6ˆÁFñÁV6«fÊW7FRÊfVvF˜"‡¢ÊVÊáV“FFÚ&V÷˜FÚfˆí7V'7FóG\:÷FÛ≤Ï:6Úf¶V÷˜2÷W&vP¢WFˆ‹:Fñ6Ú‡¢¬˜7„‡¢¬ˆFóc‡¢¬ˆFóc‡¢ó–¢∑7ñÊ4W'&˜"bbÄ¢∆Fób6∆74Ê÷S“'v˜&∑76R÷6ˆÊf∆ñ7B"&ˆ∆S“&∆W'B#‡¢ƒ6ó&6∆T∆W'BÛ‡¢∆Fóc‡¢«7G&ˆÊs‡¢∑7ñÊ4W'&˜"Ê6ˆFR””“&WFÇ ¢Ú%7V6W7<:6ÚWáó&˜R ¢¢%7V2«FW&:|;VW2Ï:6Úf˜&“6«f2'–¢¬˜7G&ˆÊs‡¢«7„Á∑7ñÊ4W'&˜"Ê÷W76vW”¬˜7„‡¢¬ˆFóc‡¢∑7ñÊ4W'&˜"Ê6ˆFR””“&WFÇ"ÚÄ¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ˆ‰6∆ñ6≥◊∂∆ˆv˜WDg&ˆ‘Wáó&VE6W76ñˆÁ”‡¢VÁG&"Ê˜f÷VÁFP¢¬Ù'WGFˆ„‡¢í¢Ä¢ƒ'WGFˆ‚f&ñÁC“'6V6ˆÊF'í"ˆ‰6∆ñ6≥◊∑&WG'ï7ñÊ7”‡¢FVÁF"v˜&¢¬Ù'WGFˆ„‡¢ó–¢¬ˆFóc‡¢ó–¢∆ÜVFW"6∆74Ê÷S“'F˜&"#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚÷ˆ&ñ∆R÷÷VÁR ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷ˆ&ñ∆RáG'VRó–¢&ñ÷∆&V√“$'&ó"÷VÁR ¢‡¢ƒ÷VÁRÛ‡¢¬ˆ'WGFˆ„‡¢∆Fób6∆74Ê÷S“'F˜&"÷÷ˆ&ñ∆R÷'&ÊB#‡¢ƒ∆ˆvÚÛ‡¢¬ˆFóc‡¢∂÷VÁTÜñFFV‚bbÄ¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚FW6∑F˜÷˜V‚ ¢FóF∆S“$'&ó"÷VÁR ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WD÷VÁTÜñFFV‚Üf«6Ró–¢‡¢ƒ÷VÁRÛ‡¢¬ˆ'WGFˆ„‡¢ó–¢∆Fób6∆74Ê÷S“'F˜÷'W6ñÊW72#‡¢«7„Á∂ó4V◊∆˜ñVT÷ˆFRÚ$÷WRG&&∆ÜÚ"¢$ÊV|;66ñÚFófÚ'”¬˜7„‡¢∆'WGFˆ‚ˆ‰6∆ñ6≥◊≤Çí”‚6WD'W6ñÊW74÷VÁRÇ'W6ñÊW74÷VÁRó”‡¢«7‚6∆74Ê÷S“&'W6ñÊW72÷fF"6÷∆¬#‡¢∂'W6ñÊW73ÚÊÊ÷SÚÂ≥“«¬"≤'–¢¬˜7„‡¢«7G&ˆÊsÁ∂'W6ñÊW73ÚÊÊ÷R«¬$7&ñ"ÊV|;66ñÚ'”¬˜7G&ˆÊs‡¢ƒ6ÜWg&ˆÂ&ñváB6∆74Ê÷S◊∂'W6ñÊW74÷VÁRÚ'&˜FFVB"¢"'“Û‡¢¬ˆ'WGFˆ„‡¢∂'W6ñÊW74÷VÁRbbÄ¢∆Fób6∆74Ê÷S“&'W6ñÊW72◊˜˜fW"#‡¢∂F"Ê'W6ñÊW76W2Ê÷ÇÜ"í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂"ÊñG–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢WFFRÇÜBí”‚á≤‚‚ÊB¬6V∆V7FVD'W6ñÊW74ñC¢"ÊñB“íì∞¢6WD'W6ñÊW74÷VÁRÜf«6Rì∞¢◊–¢‡¢«7‚6∆74Ê÷S“&'W6ñÊW72÷fF"6÷∆¬#Á∂"ÊÊ÷U≥◊”¬˜7„‡¢«7„‡¢«7G&ˆÊsÁ∂"ÊÊ÷W”¬˜7G&ˆÊs‡¢«6÷∆√‡¢∂"ÊñÊGW7G'î7FófóGí«¬"Á6Vv÷VÁB«¬%6V“6Vv÷VÁFÚ'–¢¬˜6÷∆√‡¢¬˜7„‡¢∂'W6ñÊW73ÚÊñB””“"ÊñBbbƒ6ÜV6≤ÛÁ–¢¬ˆ'WGFˆ„‡¢íó–¢∆'WGFˆ‡¢6∆74Ê÷S“&÷ÊvR ¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢vÚÇ&'W6ñÊW76W2"ì∞¢6WD'W6ñÊW74÷VÁRÜf«6Rì∞¢◊–¢‡¢ƒ'Vñ∆FñÊs"Û‡¢vW&VÊ6ñ"ÊV|;66ñ˜0¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢∆Fób6∆74Ê÷S“'F˜÷7FñˆÁ2#‡¢∑7ñÊ6ñÊrbbÄ¢«7‚6∆74Ê÷S“'7ñÊ2÷ñÊFñ6F˜""&ˆ∆S“'7FGW2#‡¢≈&Vg&W6Ñ7rÛ‡¢6ñÊ7&ˆÊó¶ÊFÚ‚‚‡¢¬˜7„‡¢ó–¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚6V&6Ç◊G&ñvvW" ¢&ñ÷∆&V√“$'W66"V“GVFÚ ¢FóF∆S“$'W66"Ñ7G&¬¥≤í ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WE6V&6Ñ˜V‚áG'VRó–¢‡¢≈6V&6ÇÛ‡¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚6ÜÊvV∆ˆr◊G&ñvvW" ¢&ñ÷∆&V√“$Ê˜fñFFW2 ¢FóF∆S“$Ê˜fñFFW2 ¢ˆ‰6∆ñ6≥◊∂˜V‰6ÜÊvV∆ˆw–¢‡¢ƒ÷VvÜˆÊRÛ‡¢∂Ü5VÁ6VV‰6ÜÊvV∆ˆrbb«7‚6∆74Ê÷S“&Ê˜Fñb÷F˜B"ÛÁ–¢¬ˆ'WGFˆ„‡¢∂7FófU76TñBÇíbbÄ¢∆'WGFˆ‡¢6∆74Ê÷S“'76R÷&FvR ¢ˆ‰6∆ñ6≥◊≤Çí”‚7vóF6Ö76RÇ""ó–¢FóF∆S“%fˆ«F"Ú÷WRW7:vÚ ¢‡¢≈W6W'2Û‡¢«7„‡¢∂∆ˆ6≈7F˜&vRÊvWDóFV“Ç'6b◊76R÷Ê÷R"í«¿¢$W7:vÚ6ˆ◊'Fñ∆ÜFÚ'–¢¬˜7„‡¢≈ÇÛ‡¢¬ˆ'WGFˆ„‡¢ó–¢∆Fób6∆74Ê÷S“&Ê˜Fñb◊w&#‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢&ñ÷∆&V√“$Ê˜Fñfñ6:|;VW2 ¢ˆ‰6∆ñ6≥◊≤Çí”‚6WDÊ˜Fñd˜V‚Çábí”‚bó–¢‡¢ƒ&V∆¬Û‡¢∂◊îÊ˜Fñfñ6FñˆÁ2Á6ˆ÷RÇÜ‚í”‚‚Á&VBíbbÄ¢«7‚6∆74Ê÷S“&Ê˜Fñb÷F˜B"Û‡¢ó–¢¬ˆ'WGFˆ„‡¢∂Ê˜Fñd˜V‚bbÄ¢∆Fób6∆74Ê÷S“&Ê˜Fñb◊˜˜fW"#‡¢∂◊îÊ˜Fñfñ6FñˆÁ2Ê∆VÊwFÇ””“ÚÄ¢«6∆74Ê÷S“&Ê˜Fñb÷V◊Gí#‰ÊVÊáV÷Ê˜Fñfñ6:|:6Ú˜"Ví„¬˜‡¢í¢Ä¢◊îÊ˜Fñfñ6FñˆÁ2Á6∆ñ6RÉ¬#íÊ÷ÇÜ‚í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂‚ÊñG–¢6∆74Ê÷S◊∂‚Á&VBÚ""¢'VÁ&VB'–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢Ê˜Fñfñ6FñˆÁ3¢ÜBÊÊ˜Fñfñ6FñˆÁ2«¬µ“íÊ÷ÇáÇí”‡¢ÇÊñB””“‚ÊñBÚ≤‚‚ÁÇ¬&VC¢G'VR“¢Ç¿¢í¿¢“íì∞¢6WDÊ˜Fñd˜V‚Üf«6Rì∞¢ñbÜ‚Ê∆ñÊ≤ívÚÜ‚Ê∆ñÊ≤ì∞¢◊–¢‡¢∂‚Ê÷W76vW–¢¬ˆ'WGFˆ„‡¢íê¢ó–¢¬ˆFóc‡¢ó–¢¬ˆFóc‡¢∆'WGFˆ‡¢6∆74Ê÷S“&ñ6ˆ‚÷'WGFˆ‚ ¢ˆ‰6∆ñ6≥◊≤Çí”‡¢WFFRÇÜBí”‚á∞¢‚‚ÊB¿¢&VfW&VÊ6W3¢∞¢‚‚ÊBÁ&VfW&VÊ6W2¿¢FÜV÷S¢BÁ&VfW&VÊ6W2ÁFÜV÷R””“&∆ñváB"Ú&F&≤"¢&∆ñváB"¿¢“¿¢“íê¢–¢‡¢∂F"Á&VfW&VÊ6W2ÁFÜV÷R””“&∆ñváB"Úƒ÷ˆˆ‚Û‚¢≈7V‚ÛÁ–¢¬ˆ'WGFˆ„‡¢∆'WGFˆ‚6∆74Ê÷S“'W6W"÷6Üó"ˆ‰6∆ñ6≥◊≤Çí”‚vÚÇ&6ˆÊfñr"ó”‡¢«7„Á∂F"ÁW6W"ÊÊ÷U≥◊”¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÁ∂F"ÁW6W"ÊÊ÷W”¬˜7G&ˆÊs‡¢«6÷∆√Á∂F"ÁW6W"ÊV÷ñ«”¬˜6÷∆√‡¢¬ˆFóc‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢¬ˆÜVFW#‡¢∑6V&6Ñ˜V‚bbÄ¢ƒ÷ˆF¿¢FóF∆S“$'W66"V“GVFÚ ¢ˆ‰6∆˜6S◊≤Çí”‚∞¢6WE6V&6Ñ˜V‚Üf«6Rì∞¢6WE6V&6ÖVW'íÇ""ì∞¢◊–¢‡¢∆Fób6∆74Ê÷S“&v∆ˆ&¬◊6V&6Ç#‡¢∆ñÁW@¢WFÙfˆ7W0¢&ñ÷∆&V√“$'W66"6\:|:6Ú ¢f«VS◊∑6V&6ÖVW'ó–¢ˆ‰6ÜÊvS◊≤ÜRí”‚6WE6V&6ÖVW'íÜRÁF&vWBÁf«VRó–¢∆6VÜˆ∆FW#“$FñvóFRÚÊˆ÷RFRV÷fW'&÷VÁF˜R6\:|:6Ú‚‚‚ ¢Û‡¢∑6V&6Ö&W7V«G2Ê∆VÊwFÇ””“bb6ˆÁFVÁE6V&6Ö&W7V«G2Ê∆VÊwFÇ””“ÚÄ¢«6∆74Ê÷S“&Ê˜Fñb÷V◊Gí#‰ÊFVÊ6ˆÁG&FÚ„¬˜‡¢í¢Ä¢√‡¢∂6ˆÁFVÁE6V&6Ö&W7V«G2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&v∆ˆ&¬◊6V&6Ç◊&W7V«G2#‡¢«6∆74Ê÷S“&v∆ˆ&¬◊6V&6Ç÷w&˜W÷∆&V¬#Â&W7V«FF˜3¬˜‡¢∂6ˆÁFVÁE6V&6Ö&W7V«G2Ê÷Çá&W7V«Bí”‚Ä¢∆'WGFˆ‡¢∂Wì◊∑&W7V«BÊ∂Wó–¢ˆ‰6∆ñ6≥◊≤Çí”‚˜V‰6ˆÁFVÁE6V&6Ö&W7V«Bá&W7V«Bó–¢‡¢«&W7V«BÊñ6ˆ‚Û‡¢«7„‡¢∑&W7V«BÁFóF∆W–¢«6÷∆√Á∑&W7V«BÁ7V'FóF∆W”¬˜6÷∆√‡¢¬˜7„‡¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢ó–¢∑6V&6Ö&W7V«G2Ê∆VÊwFÇ‚bbÄ¢∆Fób6∆74Ê÷S“&v∆ˆ&¬◊6V&6Ç◊&W7V«G2#‡¢∑6V&6ÖVW'íÁG&ñ“Çíbb6ˆÁFVÁE6V&6Ö&W7V«G2Ê∆VÊwFÇ‚bbÄ¢«6∆74Ê÷S“&v∆ˆ&¬◊6V&6Ç÷w&˜W÷∆&V¬#Â6\:|;VW3¬˜‡¢ó–¢∑6V&6Ö&W7V«G2Ê÷ÇÖ∂ñB¬∆&V¬¬ï“í”‚Ä¢∆'WGFˆ‡¢∂Wì◊∂ñG–¢ˆ‰6∆ñ6≥◊≤Çí”‚∞¢vÚÜñBì∞¢6WE6V&6Ñ˜V‚Üf«6Rì∞¢6WE6V&6ÖVW'íÇ""ì∞¢◊–¢‡¢ƒíÛ‡¢«7„Á∂∆&V«”¬˜7„‡¢¬ˆ'WGFˆ„‡¢íó–¢¬ˆFóc‡¢ó–¢¬Û‡¢ó–¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–¢∂6ÜÊvV∆ˆt˜V‚bbÄ¢ƒ÷ˆF¬FóF∆S“$Ê˜fñFFW2"ˆ‰6∆˜6S◊≤Çí”‚6WD6ÜÊvV∆ˆt˜V‚Üf«6Ró”‡¢∆Fób6∆74Ê÷S“&6ÜÊvV∆ˆr÷∆ó7B#‡¢¥4Ñ‰tTƒÙuÙTÂE$îU2Ê÷ÇÜVÁG'íí”‚Ä¢∆Fób∂Wì◊∂VÁG'íÊñG“6∆74Ê÷S“&6ÜÊvV∆ˆr÷óFV“#‡¢«7‚6∆74Ê÷S“&6ÜÊvV∆ˆr÷FFR#‡¢∂ÊWrFFRÜG∂VÁG'íÊFFW’C££íÁFÙ∆ˆ6∆TFFU7G&ñÊrÄ¢'B‘%""¿¢≤Fì¢#"÷FñvóB"¬÷ˆÁFÉ¢'6Ü˜'B"“¿¢ó–¢¬˜7„‡¢∆Fóc‡¢«7G&ˆÊsÁ∂VÁG'íÁFóF∆W”¬˜7G&ˆÊs‡¢«Á∂VÁG'íÊFW67&óFñˆÁ”¬˜‡¢¬ˆFóc‡¢¬ˆFóc‡¢íó–¢¬ˆFóc‡¢¬Ù÷ˆF√‡¢ó–¢∆Fób6∆74Ê÷S“'vR"∂Wì◊∑vW”‡¢∂6ˆÁFVÁBÇó–¢¬ˆFóc‡¢¬ˆ÷ñ„‡¢ƒWFFP¢fó6ñ&∆S◊∑WFFTfñ∆&∆W–¢∆FW7EfW'6ñˆ„◊∑WFFTñÊfÚÊ∆FW7EfW'6ñˆÁ–¢Û‡¢≈Fˆ7BFˆ7C◊∑Fˆ7G“Û‡¢¬ˆFóc‡¢ì∞ß–