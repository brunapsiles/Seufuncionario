import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Calculator,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  FileCheck,
  FileText,
  Gauge,
  GitBranch,
  Handshake,
  History,
  Inbox,
  Languages,
  Leaf,
  ListChecks,
  ListTodo,
  LockKeyhole,
  Network,
  PackageCheck,
  Plus,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sigma,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Trash2,
  Truck,
  UserRound,
  Users,
  WalletCards,
  Workflow,
  Zap,
} from "lucide-react";
import {
  LOGISTICS_PRODUCTS,
  TODO_GREEN_FEATURE_COUNT,
  TODO_GREEN_MODULE_AREAS,
  TODO_GREEN_MODULE_CATALOG,
  TODO_GREEN_PRODUCTION_DATA_POLICY,
  TODO_GREEN_ROLES,
  TODO_GREEN_TENANT,
  centralPricingEngine,
  createPricingScenarioSnapshot,
  esgTranslator,
  getProductPricingBlueprint,
  hasTodoGreenPermission,
  productSpecificOutputs,
  summarizeTodoGreenDashboard,
} from "./logisticsVerticalDomain.js";

const iconMap = {
  Activity,
  AlertTriangle,
  Archive,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Calculator,
  CheckCircle2,
  DollarSign,
  FileCheck,
  FileText,
  Gauge,
  GitBranch,
  Handshake,
  History,
  Inbox,
  Languages,
  Leaf,
  ListChecks,
  ListTodo,
  LockKeyhole,
  Network,
  PackageCheck,
  Route,
  Settings,
  ShieldCheck,
  Sigma,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Trash2,
  Truck,
  UserRound,
  Users,
  WalletCards,
  Workflow,
  Zap,
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const IMPLEMENTED_MODULE_IDS = new Set([
  "dashboard-esg",
  "green-score",
  "calculadora-ambiental",
  "tradutor-esg",
  "escopo-3",
  "relatorios-esg",
  "metodologia",
  "cofre-evidencias",
  "clientes",
  "contatos",
  "oportunidades",
  "pipeline",
  "propostas",
  "contratos",
  "simulacoes",
  "precificacao",
  "deal-desk",
  "receita",
  "forecast",
  "faturamento",
  "recebimento",
  "custos",
  "opex",
  "margem",
  "rentabilidade",
  "operacoes",
  "produtos-logisticos",
  "rotas",
  "viagens",
  "veiculos",
  "entregas",
  "ocupacao",
  "produtividade",
  "energia",
  "ocorrencias",
  "relatorios",
  "auditoria",
  "usuarios",
  "permissoes",
  "configuracoes",
]);

const MODULE_IMPLEMENTATION = Object.freeze({
  dashboard: {
    title: "Cockpit executivo",
    route: "/todogreen/dashboard",
    area: "gestao",
    status: "functional",
    description: "KPIs reais, pendências, pipeline, rentabilidade e impacto ESG calculados a partir dos registros do workspace.",
  },
  clientes: {
    title: "Clientes e contatos",
    route: "/todogreen/clientes",
    area: "comercial",
    status: "functional",
    description: "Cadastro de cliente, segmento, decisor, maturidade ESG, dores logísticas e próximo passo comercial.",
  },
  oportunidades: {
    title: "Oportunidades e pipeline",
    route: "/todogreen/oportunidades",
    area: "comercial",
    status: "functional",
    description: "Criação de oportunidades por produto logístico, estágio, valor estimado, probabilidade e prioridade.",
  },
  propostas: {
    title: "Propostas e contratos",
    route: "/todogreen/propostas",
    area: "comercial",
    status: "functional",
    description: "Geração de proposta textual com preço, premissas, ROI ambiental, ressalvas e aprovações necessárias.",
  },
  precificacao: {
    title: "Precificação e Deal Desk",
    route: "/todogreen/precificacao",
    area: "comercial",
    status: "functional",
    description: "Calculadoras por produto, margem, custo, target, gatilhos de aprovação e evidências obrigatórias.",
  },
  esg: {
    title: "ESG, Green Score e Escopo 3",
    route: "/todogreen/esg",
    area: "esg",
    status: "functional",
    description: "CO2 evitado, diesel não consumido, equivalências, metodologia e textos comerciais auditáveis.",
  },
  operacoes: {
    title: "Operações logísticas",
    route: "/todogreen/operacoes",
    area: "operacional",
    status: "functional",
    description: "Registro de rotas, viagens, entregas, frota, ocupação, produtividade, energia e ocorrências.",
  },
  receita: {
    title: "Receita, forecast e faturamento",
    route: "/todogreen/receita",
    area: "financeiro",
    status: "functional",
    description: "Entradas financeiras por cliente/produto, forecast, faturamento, recebimento e comissão prevista.",
  },
  custos: {
    title: "Custos, OPEX e margem",
    route: "/todogreen/custos",
    area: "financeiro",
    status: "functional",
    description: "Centro de custos operacional, custo por categoria, margem e comparação contra receita/simulações.",
  },
  relatorios: {
    title: "Relatórios executivos",
    route: "/todogreen/relatorios",
    area: "gestao",
    status: "functional",
    description: "Resumo comercial, financeiro, operacional e ESG pronto para comitê, proposta ou prestação de contas.",
  },
  metodologia: {
    title: "Metodologia e premissas",
    route: "/todogreen/metodologia",
    area: "esg",
    status: "functional",
    description: "Fatores ambientais, fórmulas, versão, governança, disclaimer e evidências exigidas por produto.",
  },
  auditoria: {
    title: "Auditoria e governança",
    route: "/todogreen/auditoria",
    area: "gestao",
    status: "functional",
    description: "Permissões por papel, rastreabilidade de cálculo, bloqueios e fluxo de aprovação.",
  },
  acessos: {
    title: "Acessos",
    route: "/todogreen/acessos",
    area: "gestao",
    status: "functional",
    description: "Gestão de e-mails autorizados e papéis privados da vertical.",
  },
});

const fieldLabels = {
  allocationPercent: "Alocação da rota (%)",
  cashFlowMonths: "Meses de fluxo de caixa",
  chargingWindow: "Janela de recarga",
  city: "Cidade",
  client: "Cliente",
  clientId: "ID do cliente",
  clientsOnRoute: "Clientes na rota",
  components: "Componentes do projeto",
  consolidationPercent: "Consolidação (%)",
  contractMonths: "Meses de contrato",
  customerTargetPrice: "Target do cliente",
  daysPerMonth: "Dias/mês",
  deliveryWindows: "Janelas de entrega",
  density: "Densidade da rota",
  deliveries: "Entregas",
  destination: "Destino",
  distanceKm: "Distância km",
  driverShift: "Turno do motorista",
  drivers: "Motoristas",
  frequencyPerMonth: "Frequência/mês",
  hazmat: "Carga perigosa",
  helpers: "Ajudantes",
  hoursPerDay: "Horas/dia",
  implementationCost: "Implantação R$",
  initialInvestment: "Investimento inicial R$",
  kmPerRoute: "Km por rota",
  licenseCost: "Licenças R$",
  lossPercent: "Perda técnica (%)",
  materialType: "Tipo de material",
  occupancyPercent: "Ocupação (%)",
  origin: "Origem",
  packages: "Pacotes",
  pallets: "Pallets",
  peakSeasonFactor: "Fator pico sazonal",
  points: "Pontos atendidos",
  reserveVehicle: "Veículo reserva",
  returnLoaded: "Retorno carregado",
  reverseLogistics: "Logística reversa",
  riskManagementCost: "Gerenciamento de risco R$",
  routesPerDay: "Rotas/dia",
  services: "Serviços inclusos",
  sharedRouteCost: "Custo rota compartilhada R$",
  sla: "SLA",
  stops: "Paradas",
  stores: "Lojas",
  strategicContract: "Contrato estratégico",
  successRate: "Sucesso entrega (%)",
  suppliers: "Fornecedores",
  supervisionCost: "Supervisão R$",
  technologyCost: "Tecnologia R$",
  temperatureControlled: "Temperatura controlada",
  tollCost: "Pedágio por viagem R$",
  tons: "Toneladas",
  trainingCost: "Treinamento R$",
  tripsPerMonth: "Viagens/mês",
  unloadingHours: "Horas descarga",
  vehicleType: "Tipo de veículo",
  visitsPerMonth: "Visitas/mês",
  volumeM3: "Volume m³",
  waitingHours: "Horas de espera",
  weeklyFrequency: "Frequência semanal",
  weightKg: "Peso kg",
  dataQuality: "Qualidade dos dados (%)",
};

const textFields = new Set([
  "city",
  "client",
  "clientId",
  "components",
  "deliveryWindows",
  "destination",
  "driverShift",
  "materialType",
  "origin",
  "services",
  "sla",
  "vehicleType",
]);

const booleanFields = new Set([
  "hazmat",
  "reserveVehicle",
  "returnLoaded",
  "reverseLogistics",
  "strategicContract",
  "temperatureControlled",
]);

const productDefaults = {
  "middle-mile": {
    client: "",
    origin: "",
    destination: "",
    distanceKm: 120,
    tripsPerMonth: 40,
    vehicleType: "VUC elétrico",
    pallets: 12,
    weightKg: 3200,
    tollCost: 0,
    waitingHours: 1,
    customerTargetPrice: 0,
    occupancyPercent: 78,
    dataQuality: 80,
  },
  "last-mile": {
    client: "",
    city: "São Paulo",
    packages: 9000,
    routesPerDay: 18,
    daysPerMonth: 22,
    kmPerRoute: 62,
    vehicleType: "Furgão elétrico",
    stops: 7000,
    successRate: 92,
    returnsRate: 4,
    customerTargetPrice: 0,
    occupancyPercent: 80,
    dataQuality: 76,
  },
  dedicated: {
    client: "",
    vehicles: 4,
    vehicleType: "Frota elétrica dedicada",
    drivers: 4,
    helpers: 0,
    hoursPerDay: 9,
    daysPerMonth: 22,
    reserveVehicle: false,
    supervisionCost: 0,
    technologyCost: 0,
    trainingCost: 0,
    implementationCost: 0,
    customerTargetPrice: 0,
    occupancyPercent: 75,
    dataQuality: 75,
  },
  transfer: {
    client: "",
    origin: "",
    destination: "",
    distanceKm: 160,
    frequencyPerMonth: 30,
    vehicleType: "Caminhão elétrico",
    pallets: 14,
    weightKg: 4000,
    waitingHours: 1,
    customerTargetPrice: 0,
    occupancyPercent: 76,
    dataQuality: 75,
  },
  "store-replenishment": {
    client: "",
    stores: 12,
    visitsPerMonth: 96,
    kmPerRoute: 70,
    vehicleType: "Furgão elétrico",
    helpers: 1,
    unloadingHours: 1,
    customerTargetPrice: 0,
    occupancyPercent: 78,
    dataQuality: 74,
  },
  "supplier-pickup": {
    client: "",
    suppliers: 8,
    frequencyPerMonth: 40,
    distanceKm: 80,
    vehicleType: "VUC elétrico",
    waitingHours: 1,
    consolidationPercent: 70,
    weightKg: 2500,
    pallets: 8,
    customerTargetPrice: 0,
    occupancyPercent: 74,
    dataQuality: 72,
  },
  "fractional-distribution": {
    client: "",
    sharedRouteCost: 90000,
    allocationPercent: 45,
    deliveries: 6500,
    distanceKm: 3200,
    clientsOnRoute: 4,
    occupancyPercent: 78,
    weightKg: 6000,
    volumeM3: 36,
    customerTargetPrice: 0,
    dataQuality: 72,
  },
  bulk: {
    client: "",
    materialType: "",
    tons: 90,
    distanceKm: 180,
    tripsPerMonth: 24,
    vehicleType: "Caminhão elétrico adaptado",
    cleaningCost: 0,
    waitingHours: 1,
    lossPercent: 0,
    licenseCost: 0,
    customerTargetPrice: 0,
    occupancyPercent: 76,
    dataQuality: 70,
  },
  "custom-project": {
    client: "",
    components: "Frota, operação, tecnologia, implantação",
    contractMonths: 12,
    initialInvestment: 0,
    cashFlowMonths: 12,
    customerTargetPrice: 0,
    occupancyPercent: 75,
    dataQuality: 65,
  },
};

const todoGreenPath = () => (typeof window === "undefined" ? "/todogreen" : window.location.pathname);

const sectionFromPath = (path) => {
  const slug = String(path || "").replace(/^\/todogreen\/?/, "").split("/")[0];
  return slug || "dashboard";
};

export const todoGreenRouteToPage = (path) => {
  const section = sectionFromPath(path);
  if (section === "comercial") return "clientes";
  if (!section || section === "dashboard") return "dashboard";
  return section;
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const moduleMatches = (item, query) => normalize(`${item.name} ${item.area} ${item.description}`).includes(normalize(query));

const navigate = (route) => {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const ownerId = () => {
  try {
    return localStorage.getItem("sf-space") || localStorage.getItem("sf-active-user") || "";
  } catch {
    return "";
  }
};

const demoModeEnabled = (db = {}, access = {}) => Boolean(db?.[TODO_GREEN_PRODUCTION_DATA_POLICY.demoModeFlag] || access.demoMode);

const canAccessTodoGreen = (db = {}, access = {}) => {
  if (access.allowed) return true;
  if (db?.user?.email && /@todogreen\.com\.br$/i.test(db.user.email)) return true;
  const tenantAccess = db?.tenantAccess?.todogreen || db?.todoGreenAccess;
  if (tenantAccess?.active !== false && tenantAccess?.role) return true;
  return (db?.businesses || []).some(
    (business) => /to\s*do\s*green/i.test(business.name || "") || business.tenantSlug === TODO_GREEN_TENANT.slug,
  );
};

const accessRole = (db = {}, access = {}) => {
  if (access.role) return access.role;
  const role = db?.tenantAccess?.todogreen?.role || db?.todoGreenAccess?.role || "";
  if (TODO_GREEN_ROLES.includes(role)) return role;
  if (db?.user?.email && /@todogreen\.com\.br$/i.test(db.user.email)) return "admin";
  return canAccessTodoGreen(db, access) ? "admin" : "";
};

const seedScenario = createPricingScenarioSnapshot(
  "middle-mile",
  {
    client: "Demonstração Middle Mile",
    clientId: "demo-middle-mile",
    origin: "CD exemplo",
    destination: "Hub exemplo",
    distanceKm: 86,
    tripsPerMonth: 44,
    vehicleType: "VUC elétrico",
    pallets: 12,
    weightKg: 3200,
    waitingHours: 1.5,
    tollCost: 42,
    customerTargetPrice: 72000,
    occupancyPercent: 78,
    dataQuality: 82,
  },
  { userId: "demo", tenantId: TODO_GREEN_TENANT.id, justification: "Dado demonstrativo; não usar como produção." },
);

const seedLastMile = createPricingScenarioSnapshot(
  "last-mile",
  {
    client: "Demonstração Last Mile",
    clientId: "demo-last-mile",
    city: "São Paulo",
    packages: 9600,
    routesPerDay: 18,
    daysPerMonth: 22,
    kmPerRoute: 62,
    vehicleType: "Furgão elétrico",
    stops: 7200,
    successRate: 93,
    customerTargetPrice: 142000,
    occupancyPercent: 81,
    dataQuality: 76,
  },
  { userId: "demo", tenantId: TODO_GREEN_TENANT.id, justification: "Dado demonstrativo; não usar como produção." },
);

const defaultVerticalData = (db = {}, access = {}) => {
  const demo = demoModeEnabled(db, access);
  const hasScenarios = db.todoGreenPricingScenarios?.length > 0;
  const demoRevenue = demo
    ? [
        { id: "demo-rev-1", amount: 138000, clientId: "demo-middle-mile", productId: "middle-mile", status: "demo" },
        { id: "demo-rev-2", amount: 91000, clientId: "demo-last-mile", productId: "last-mile", status: "demo" },
      ]
    : [];
  const demoOperations = demo
    ? [
        { id: "demo-op-1", clientId: "demo-last-mile", productId: "last-mile", deliveries: 8400, packages: 9600, trips: 396, distanceKm: 24552, occupancyPercent: 81, status: "demo" },
        { id: "demo-op-2", clientId: "demo-middle-mile", productId: "middle-mile", deliveries: 0, packages: 0, trips: 44, distanceKm: 3784, occupancyPercent: 78, status: "demo" },
      ]
    : [];
  return {
    demo,
    clients: db.todoGreenClients || [],
    opportunities: db.todoGreenOpportunities || [],
    proposals: db.todoGreenProposals || [],
    pricingScenarios: hasScenarios ? db.todoGreenPricingScenarios : demo ? [seedScenario, seedLastMile] : [],
    revenueEntries: db.todoGreenRevenueEntries || demoRevenue,
    costEntries: db.todoGreenCostEntries || [],
    operations: db.todoGreenOperations || demoOperations,
    tasks: db.tasks || [],
    inboxUnread: (db.notifications || []).filter((item) => !item.read).length,
  };
};

const appendRecord = (update, key, record) => {
  update?.((current) => ({ ...current, [key]: [record, ...(current[key] || [])] }));
};

function AccessDenied({ db }) {
  return (
    <main className="tdg tdg-denied" aria-labelledby="tdg-denied-title">
      <section className="tdg-denied-card">
        <div className="tdg-denied-mark"><ShieldCheck /></div>
        <span className="tdg-kicker">ACESSO PRIVADO</span>
        <h1 id="tdg-denied-title">Vertical To Do Green protegida</h1>
        <p>Esta área só abre para usuários vinculados ao workspace da To Do Green ou com permissão individual ativa. Entrar pela URL não concede acesso.</p>
        <dl>
          <div><dt>Usuário atual</dt><dd>{db?.user?.email || "sessão local"}</dd></div>
          <div><dt>Tenant</dt><dd>{TODO_GREEN_TENANT.slug}</dd></div>
        </dl>
      </section>
    </main>
  );
}

function MetricCard({ label, value, detail, tone = "neutral" }) {
  return (
    <button className={`tdg-metric ${tone}`} type="button">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

function ModuleCard({ item }) {
  const Icon = iconMap[item.icon] || Boxes;
  const implemented = IMPLEMENTED_MODULE_IDS.has(item.id);
  return (
    <button className={`tdg-module-card ${implemented ? "" : "disabled"}`} type="button" onClick={() => implemented && navigate(item.route)}>
      <span className="tdg-module-icon"><Icon size={22} /></span>
      <span>
        <strong>{item.name}</strong>
        <small>{implemented ? item.description || "Abrir módulo" : "Backlog mapeado; ainda não exibido como funcional."}</small>
      </span>
      <em>{implemented ? "funcional" : "backlog"}</em>
      {implemented && <ChevronRight size={18} />}
    </button>
  );
}

function AreaSection({ area, modules }) {
  const functional = modules.filter((item) => IMPLEMENTED_MODULE_IDS.has(item.id));
  const backlog = modules.filter((item) => !IMPLEMENTED_MODULE_IDS.has(item.id));
  return (
    <section className="tdg-section" aria-labelledby={`area-${area.id}`}>
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">{area.name}</span>
          <h2 id={`area-${area.id}`}>{area.description}</h2>
        </div>
        <span>{functional.length} funcionais · {backlog.length} backlog</span>
      </div>
      <div className="tdg-module-grid">
        {functional.map((item) => <ModuleCard item={item} key={item.id} />)}
      </div>
      {backlog.length > 0 && (
        <details className="tdg-backlog">
          <summary>Ver itens planejados desta área</summary>
          <div className="tdg-module-grid">
            {backlog.map((item) => <ModuleCard item={item} key={item.id} />)}
          </div>
        </details>
      )}
    </section>
  );
}

function ProductCard({ product, active, onSelect }) {
  return (
    <button className={`tdg-product-card ${active ? "active" : ""}`} type="button" onClick={() => onSelect(product.id)}>
      <span>{product.code}</span>
      <strong>{product.name}</strong>
      <small>{product.billingUnit} · {product.requiredFields.length} obrigatórios</small>
    </button>
  );
}

function FieldInput({ name, value, required, onChange }) {
  if (booleanFields.has(name)) {
    return (
      <label className="tdg-check-field">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(name, event.target.checked)} />
        <span>{fieldLabels[name] || name}{required ? " *" : ""}</span>
      </label>
    );
  }
  return (
    <label>
      <span>{fieldLabels[name] || name}{required ? " *" : ""}</span>
      <input
        value={value ?? ""}
        inputMode={textFields.has(name) ? "text" : "decimal"}
        onChange={(event) => onChange(name, textFields.has(name) ? event.target.value : Number(event.target.value) || 0)}
      />
    </label>
  );
}

function EmptyState({ onCreate }) {
  return (
    <section className="tdg-panel tdg-empty-state">
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">SEM DADOS FICTÍCIOS</span>
          <h2>Nenhum indicador real carregado ainda.</h2>
          <p>O painel não usa receita, cliente ou operação inventada como produção. Cadastre a primeira simulação ou ative o modo demonstração explicitamente.</p>
        </div>
        <button className="tdg-action" type="button" onClick={onCreate}>Criar primeira simulação</button>
      </div>
    </section>
  );
}

function DashboardPanel({ data, dashboard }) {
  const pipeline = data.opportunities.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return (
    <section className="tdg-panel">
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">COCKPIT EXECUTIVO</span>
          <h2>Visão real da vertical, sem card falso.</h2>
          <p>Os indicadores abaixo são calculados a partir de clientes, oportunidades, simulações, receitas, custos e operações cadastradas.</p>
        </div>
        <strong>{data.demo ? "modo demonstração" : "produção"}</strong>
      </div>
      <div className="tdg-result">
        <MetricCard label="Clientes" value={number.format(data.clients.length)} detail="cadastros reais" />
        <MetricCard label="Pipeline" value={BRL.format(pipeline)} detail="oportunidades abertas" />
        <MetricCard label="Receita" value={BRL.format(dashboard.receitaRealizada || dashboard.receitaPrevista)} detail="realizada + simulada" />
        <MetricCard label="CO2 evitado" value={`${number.format(dashboard.co2Evitado / 1000)} t`} detail="estimativa auditável" tone="good" />
      </div>
      <div className="tdg-output-grid">
        <span><small>Simulações</small><strong>{data.pricingScenarios.length}</strong></span>
        <span><small>Propostas</small><strong>{data.proposals.length}</strong></span>
        <span><small>Operações</small><strong>{data.operations.length}</strong></span>
        <span><small>Itens de custo</small><strong>{data.costEntries.length}</strong></span>
      </div>
    </section>
  );
}

function ClientPanel({ data, update, setToast }) {
  const [form, setForm] = useState({ name: "", segment: "E-commerce", contact: "", pain: "", esgMaturity: "Média", nextStep: "" });
  const save = (event) => {
    event.preventDefault();
    appendRecord(update, "todoGreenClients", { id: `client-${Date.now()}`, createdAt: new Date().toISOString(), ...form });
    setForm({ name: "", segment: "E-commerce", contact: "", pain: "", esgMaturity: "Média", nextStep: "" });
    setToast?.("Cliente To Do Green cadastrado");
  };
  return (
    <section className="tdg-panel">
      <div className="tdg-section-head"><div><span className="tdg-kicker">CLIENTES E CONTATOS</span><h2>CRM enxuto para grandes contas sustentáveis</h2></div><strong>{data.clients.length} cliente(s)</strong></div>
      <form className="tdg-access-form" onSubmit={save}>
        {[
          ["name", "Cliente"],
          ["segment", "Segmento"],
          ["contact", "Contato/decisor"],
          ["pain", "Dor logística"],
          ["esgMaturity", "Maturidade ESG"],
          ["nextStep", "Próximo passo"],
        ].map(([key, label]) => (
          <label key={key}><span>{label}</span><input value={form[key]} required={key === "name"} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>
        ))}
        <button className="tdg-action" type="submit"><Plus size={17} />Cadastrar cliente</button>
      </form>
      <div className="tdg-access-list">
        {data.clients.length === 0 && <div className="tdg-empty-access">Nenhum cliente real cadastrado.</div>}
        {data.clients.map((item) => (
          <div className="tdg-access-row" key={item.id}><span><strong>{item.name}</strong><small>{item.segment} · {item.pain || "sem dor mapeada"}</small></span><span>{item.esgMaturity}</span><span>{item.nextStep || "sem próximo passo"}</span></div>
        ))}
      </div>
    </section>
  );
}

function OpportunityPanel({ data, update, setToast }) {
  const [form, setForm] = useState({ client: "", productId: "middle-mile", stage: "Diagnóstico", value: 0, probability: 30, priority: "Alta", nextStep: "" });
  const save = (event) => {
    event.preventDefault();
    appendRecord(update, "todoGreenOpportunities", { id: `opp-${Date.now()}`, createdAt: new Date().toISOString(), ...form, value: Number(form.value || 0), probability: Number(form.probability || 0) });
    setToast?.("Oportunidade To Do Green cadastrada");
    setForm({ client: "", productId: "middle-mile", stage: "Diagnóstico", value: 0, probability: 30, priority: "Alta", nextStep: "" });
  };
  return (
    <section className="tdg-panel">
      <div className="tdg-section-head"><div><span className="tdg-kicker">PIPELINE</span><h2>Oportunidades com produto, valor, estágio e probabilidade</h2></div><strong>{data.opportunities.length} aberta(s)</strong></div>
      <form className="tdg-access-form" onSubmit={save}>
        <label><span>Cliente</span><input value={form.client} required onChange={(event) => setForm((current) => ({ ...current, client: event.target.value }))} /></label>
        <label><span>Produto</span><select value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}>{LOGISTICS_PRODUCTS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        {[["stage", "Estágio"], ["value", "Valor estimado R$"], ["probability", "Probabilidade %"], ["priority", "Prioridade"], ["nextStep", "Próximo passo"]].map(([key, label]) => <label key={key}><span>{label}</span><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
        <button className="tdg-action" type="submit"><Plus size={17} />Criar oportunidade</button>
      </form>
      <div className="tdg-access-list">
        {data.opportunities.length === 0 && <div className="tdg-empty-access">Nenhuma oportunidade real cadastrada.</div>}
        {data.opportunities.map((item) => <div className="tdg-access-row" key={item.id}><span><strong>{item.client}</strong><small>{item.productId} · {item.stage}</small></span><span>{BRL.format(item.value)}</span><span>{item.probability}%</span></div>)}
      </div>
    </section>
  );
}

function PricingPanel({ role, update, db, authHeaders, setToast }) {
  const [productId, setProductId] = useState("middle-mile");
  const [inputs, setInputs] = useState(productDefaults["middle-mile"]);
  const allowed = hasTodoGreenPermission(role, "pricing:simulate");
  const blueprint = getProductPricingBlueprint(productId);
  const product = LOGISTICS_PRODUCTS.find((item) => item.id === productId);
  const result = useMemo(() => centralPricingEngine(productId, inputs), [inputs, productId]);
  const outputs = productSpecificOutputs(productId, result);
  const selectProduct = (nextProductId) => {
    setProductId(nextProductId);
    setInputs(productDefaults[nextProductId] || { client: "", distanceKm: 100, frequencyPerMonth: 1, customerTargetPrice: 0, dataQuality: 70 });
  };
  const changeInput = (key, value) => setInputs((current) => ({ ...current, [key]: value }));
  const saveScenario = () => {
    const snapshot = createPricingScenarioSnapshot(productId, inputs, { userId: db?.user?.id || "local", tenantId: TODO_GREEN_TENANT.id, justification: "Simulação criada pela calculadora To Do Green." });
    update?.((current) => ({
      ...current,
      tenantAccess: { ...(current.tenantAccess || {}), todogreen: { role: role || "admin", active: true } },
      todoGreenPricingScenarios: [snapshot, ...(current.todoGreenPricingScenarios || []).slice(0, 20)],
    }));
    fetch(`/api/todogreen/audit?owner=${encodeURIComponent(ownerId())}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
      body: JSON.stringify({ action: "pricing_snapshot_created", target: snapshot.id, details: `Simulação ${product?.name || productId} salva.` }),
    }).catch(() => {});
    setToast?.("Simulação To Do Green salva");
  };
  if (!allowed) return <section className="tdg-panel"><h2>Sem permissão para simular</h2><p>Seu papel pode visualizar dados, mas não alterar premissas comerciais.</p></section>;
  return (
    <section className="tdg-panel tdg-pricing">
      <div className="tdg-section-head"><div><span className="tdg-kicker">PRECIFICAÇÃO LOGÍSTICA</span><h2>{blueprint.title}</h2><p>{blueprint.pricingUnit}</p></div><strong>{result.recommendation.decision}</strong></div>
      <div className="tdg-product-strip">{LOGISTICS_PRODUCTS.map((item) => <ProductCard product={item} active={item.id === productId} onSelect={selectProduct} key={item.id} />)}</div>
      <div className="tdg-calculator-grid">
        <form className="tdg-form">
          {blueprint.inputGroups.map(([group, fields]) => (
            <fieldset key={group}><legend>{group}</legend>{fields.map((field) => <FieldInput key={field} name={field} value={inputs[field]} required={product?.requiredFields?.includes(field)} onChange={changeInput} />)}</fieldset>
          ))}
          <fieldset><legend>Governança</legend><FieldInput name="dataQuality" value={inputs.dataQuality} onChange={changeInput} /><FieldInput name="occupancyPercent" value={inputs.occupancyPercent} onChange={changeInput} /></fieldset>
        </form>
        <div className="tdg-result">
          <MetricCard label="Preço mínimo" value={BRL.format(result.minimumPrice)} detail="piso com margem mínima" />
          <MetricCard label="Preço recomendado" value={BRL.format(result.recommendedPrice)} detail="margem alvo e riscos" tone="good" />
          <MetricCard label="Margem" value={`${number.format(result.marginPercent)}%`} detail={BRL.format(result.marginValue)} tone={result.marginPercent < 18 ? "risk" : "good"} />
          <MetricCard label="CO2 evitado" value={`${number.format(result.impact.co2AvoidedKg / 1000)} t`} detail={`${number.format(result.impact.reductionPercent)}% redução`} />
        </div>
      </div>
      <div className="tdg-output-grid">{Object.entries(outputs).map(([key, value]) => <span key={key}><small>{key.replace(/[A-Z]/g, " $&").toLowerCase()}</small><strong>{typeof value === "number" ? number.format(value) : value}</strong></span>)}</div>
      <div className="tdg-method"><strong>Evidências exigidas</strong><p>{blueprint.requiredEvidence.join(" · ")}</p><small>Saídas executivas: {blueprint.executiveOutputs.join(" · ")}</small></div>
      {result.approval.required && <div className="tdg-alert"><AlertTriangle size={18} /><span>Deal Desk obrigatório: {result.approval.triggers.join(", ")}.</span></div>}
      <ul className="tdg-reasons">{result.recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <button className="tdg-action" type="button" onClick={saveScenario}><Plus size={17} />Salvar simulação auditável</button>
    </section>
  );
}

function ProposalPanel({ data, update, setToast }) {
  const latest = data.pricingScenarios[0];
  const translated = esgTranslator(latest?.result?.impact?.co2AvoidedKg || 0);
  const [form, setForm] = useState({ client: "", title: "Proposta logística sustentável", scope: "", commercialTerms: "", risks: "" });
  const proposalText = latest
    ? `Proposta ${latest.result.productName}: preço recomendado ${BRL.format(latest.result.recommendedPrice)}, margem estimada ${number.format(latest.result.marginPercent)}%, CO2 evitado estimado de ${number.format(latest.result.impact.co2AvoidedKg / 1000)} tCO2e. ${translated.proposalText}`
    : "Crie uma simulação de precificação antes de gerar uma proposta com preço e ESG.";
  const save = (event) => {
    event.preventDefault();
    appendRecord(update, "todoGreenProposals", { id: `proposal-${Date.now()}`, createdAt: new Date().toISOString(), ...form, scenarioId: latest?.id || "", proposalText });
    setToast?.("Proposta To Do Green salva");
  };
  return (
    <section className="tdg-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">PROPOSTAS</span><h2>Proposta comercial com preço, operação e ROI ambiental</h2></div><strong>{data.proposals.length} proposta(s)</strong></div>
      <form className="tdg-access-form" onSubmit={save}>{[["client", "Cliente"], ["title", "Título"], ["scope", "Escopo operacional"], ["commercialTerms", "Condições comerciais"], ["risks", "Riscos e ressalvas"]].map(([key, label]) => <label key={key}><span>{label}</span><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<button className="tdg-action" type="submit"><Plus size={17} />Salvar proposta</button></form>
      <div className="tdg-method"><strong>Texto gerado</strong><p>{proposalText}</p><small>{translated.disclaimer}</small></div>
      <div className="tdg-access-list">{data.proposals.map((item) => <div className="tdg-access-row" key={item.id}><span><strong>{item.title}</strong><small>{item.client || "cliente não informado"}</small></span><span>{item.scenarioId ? "com simulação" : "rascunho"}</span></div>)}</div>
    </section>
  );
}

function EsgPanel({ dashboard, data }) {
  const translator = esgTranslator(dashboard.co2Evitado);
  const latest = data.pricingScenarios[0]?.result?.impact;
  return (
    <section className="tdg-panel tdg-esg">
      <div className="tdg-section-head"><div><span className="tdg-kicker">INTELIGÊNCIA ESG</span><h2>Green Score, calculadora ambiental, Escopo 3 e tradutor ESG</h2></div><strong>{number.format(dashboard.greenScore)} / 100</strong></div>
      <div className="tdg-result">
        <MetricCard label="CO2 evitado" value={`${number.format(dashboard.co2Evitado / 1000)} t`} detail="estimativa auditável" tone="good" />
        <MetricCard label="Diesel não consumido" value={`${number.format(dashboard.dieselNaoConsumido)} L`} detail="referência diesel" />
        <MetricCard label="Redução" value={`${number.format(dashboard.reducaoEmissoesPercent)}%`} detail="sustentável vs convencional" />
        <MetricCard label="Árvores equivalentes" value={number.format(translator.equivalents.treesYear)} detail="equivalência ilustrativa anual" />
      </div>
      <div className="tdg-method"><strong>Texto para proposta</strong><p>{translator.proposalText}</p><small>{translator.disclaimer}</small></div>
      <div className="tdg-output-grid">
        <span><small>Versão metodologia</small><strong>{latest?.methodologyVersion || "tdg-env-v1"}</strong></span>
        <span><small>Fórmula</small><strong>{latest?.formula || "sem simulação"}</strong></span>
        <span><small>Unidades</small><strong>{latest?.units || "kgCO2e, litros, km, kWh"}</strong></span>
      </div>
    </section>
  );
}

function OperationsPanel({ data, update, setToast }) {
  const [form, setForm] = useState({ clientId: "", productId: "middle-mile", route: "", trips: 0, deliveries: 0, packages: 0, distanceKm: 0, occupancyPercent: 75, incidents: 0 });
  const save = (event) => {
    event.preventDefault();
    appendRecord(update, "todoGreenOperations", { id: `operation-${Date.now()}`, createdAt: new Date().toISOString(), ...form, trips: Number(form.trips || 0), deliveries: Number(form.deliveries || 0), packages: Number(form.packages || 0), distanceKm: Number(form.distanceKm || 0), occupancyPercent: Number(form.occupancyPercent || 0), incidents: Number(form.incidents || 0) });
    setToast?.("Operação registrada");
  };
  return (
    <section className="tdg-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">OPERAÇÕES</span><h2>Controle real de rotas, viagens, entregas, frota e produtividade</h2></div><strong>{data.operations.length} registro(s)</strong></div>
      <form className="tdg-access-form" onSubmit={save}>{[["clientId", "Cliente"], ["route", "Rota"], ["trips", "Viagens"], ["deliveries", "Entregas"], ["packages", "Pacotes"], ["distanceKm", "Km"], ["occupancyPercent", "Ocupação %"], ["incidents", "Ocorrências"]].map(([key, label]) => <label key={key}><span>{label}</span><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label><span>Produto</span><select value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}>{LOGISTICS_PRODUCTS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button className="tdg-action" type="submit"><Plus size={17} />Registrar operação</button></form>
      <div className="tdg-access-list">{data.operations.length === 0 && <div className="tdg-empty-access">Nenhuma operação real registrada.</div>}{data.operations.map((item) => <div className="tdg-access-row" key={item.id}><span><strong>{item.route || item.productId}</strong><small>{item.clientId || "sem cliente"}</small></span><span>{number.format(item.trips)} viagens</span><span>{number.format(item.occupancyPercent)}%</span></div>)}</div>
    </section>
  );
}

function FinancePanel({ type, data, update, setToast }) {
  const key = type === "cost" ? "todoGreenCostEntries" : "todoGreenRevenueEntries";
  const title = type === "cost" ? "Custos, OPEX e margem" : "Receita, forecast e faturamento";
  const [form, setForm] = useState({ clientId: "", productId: "middle-mile", category: type === "cost" ? "energia" : "faturamento", amount: 0, status: "previsto", note: "" });
  const entries = type === "cost" ? data.costEntries : data.revenueEntries;
  const save = (event) => {
    event.preventDefault();
    appendRecord(update, key, { id: `${type}-${Date.now()}`, createdAt: new Date().toISOString(), ...form, amount: Number(form.amount || 0) });
    setToast?.(type === "cost" ? "Custo registrado" : "Receita registrada");
  };
  return (
    <section className="tdg-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">FINANCEIRO</span><h2>{title}</h2></div><strong>{BRL.format(entries.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong></div>
      <form className="tdg-access-form" onSubmit={save}>{[["clientId", "Cliente"], ["category", "Categoria"], ["amount", "Valor R$"], ["status", "Status"], ["note", "Observação"]].map(([field, label]) => <label key={field}><span>{label}</span><input value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} /></label>)}<label><span>Produto</span><select value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}>{LOGISTICS_PRODUCTS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button className="tdg-action" type="submit"><Plus size={17} />Salvar lançamento</button></form>
      <div className="tdg-access-list">{entries.length === 0 && <div className="tdg-empty-access">Nenhum lançamento real cadastrado.</div>}{entries.map((item) => <div className="tdg-access-row" key={item.id}><span><strong>{item.category}</strong><small>{item.clientId || "sem cliente"} · {item.productId}</small></span><span>{BRL.format(item.amount)}</span><span>{item.status}</span></div>)}</div>
    </section>
  );
}

function ReportsPanel({ dashboard, data }) {
  const report = [
    `Clientes cadastrados: ${data.clients.length}.`,
    `Oportunidades abertas: ${data.opportunities.length}.`,
    `Receita prevista/contratada: ${BRL.format(dashboard.receitaPrevista)}.`,
    `Margem operacional estimada: ${number.format(dashboard.margemOperacionalPercent)}%.`,
    `CO2 evitado estimado: ${number.format(dashboard.co2Evitado / 1000)} tCO2e.`,
    `Aprovações pendentes no Deal Desk: ${dashboard.aprovacoesPendentes}.`,
  ].join("\n");
  return <section className="tdg-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">RELATÓRIOS</span><h2>Resumo executivo consolidado</h2></div><strong>copiável</strong></div><textarea className="tdg-report-text" readOnly value={report} aria-label="Relatório executivo To Do Green" /></section>;
}

function MethodologyPanel() {
  const rows = LOGISTICS_PRODUCTS.map((product) => ({ product, blueprint: getProductPricingBlueprint(product.id) }));
  return (
    <section className="tdg-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">METODOLOGIA</span><h2>Premissas, evidências e rastreabilidade por produto</h2></div><strong>tdg-env-v1</strong></div>
      <div className="tdg-access-list">{rows.map(({ product, blueprint }) => <div className="tdg-access-row" key={product.id}><span><strong>{product.name}</strong><small>{blueprint.requiredEvidence.join(" · ")}</small></span><span>{blueprint.pricingUnit}</span></div>)}</div>
      <div className="tdg-method"><strong>Regra de dados</strong><p>{TODO_GREEN_PRODUCTION_DATA_POLICY.rule}</p><small>Estimativas ESG não são certificação oficial; servem como memória de cálculo comercial e operacional.</small></div>
    </section>
  );
}

function GovernancePanel({ role }) {
  return (
    <section className="tdg-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">GOVERNANÇA</span><h2>Permissões por papel, auditoria e campos bloqueados</h2></div><strong>{role || "sem papel"}</strong></div>
      <div className="tdg-governance-grid">{[["Custos oficiais", "Bloqueado para vendedores", "cost:manage"], ["Margem mínima", "Alteração exige Pricing ou Financeiro", "pricing:manage"], ["Fatores ambientais", "Sustentabilidade mantém versões", "esg:manage"], ["Aprovação Deal Desk", "Fluxo com justificativa e decisão", "deal:approve"], ["Auditoria", "Logs de cálculo, exportação e aprovação", "audit:read"]].map(([title, detail, permission]) => <div className="tdg-rule" key={title}><ShieldCheck size={18} /><strong>{title}</strong><span>{detail}</span><small>{hasTodoGreenPermission(role, permission) ? "permitido" : "sem permissão direta"}</small></div>)}</div>
    </section>
  );
}

function AccessPanel({ role, authHeaders, setToast }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", role: "admin", note: "" });
  const canManage = role === "admin" || role === "owner";
  const load = useCallback(() => {
    const headers = authHeaders?.() || {};
    if (!headers.authorization || !canManage) return;
    setLoading(true);
    fetch(`/api/todogreen/access-list?owner=${encodeURIComponent(ownerId())}`, { headers })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os acessos.");
        setEmails(payload.emails || []);
      })
      .catch((error) => setToast?.(error.message))
      .finally(() => setLoading(false));
  }, [authHeaders, canManage, setToast]);
  useEffect(() => { load(); }, [load]);
  const save = async (event) => {
    event.preventDefault();
    const headers = authHeaders?.() || {};
    if (!headers.authorization || !canManage) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/todogreen/access-list?owner=${encodeURIComponent(ownerId())}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar o acesso.");
      setForm({ email: "", role: "admin", note: "" });
      setToast?.("E-mail autorizado na To Do Green");
      load();
    } catch (error) {
      setToast?.(error.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (email) => {
    const headers = authHeaders?.() || {};
    if (!headers.authorization || !canManage) return;
    if (!confirm(`Remover o acesso de ${email}?`)) return;
    try {
      const response = await fetch(`/api/todogreen/access-list?owner=${encodeURIComponent(ownerId())}&email=${encodeURIComponent(email)}`, { method: "DELETE", headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível remover o acesso.");
      setEmails((current) => current.filter((item) => item.email !== email));
      setToast?.("Acesso removido");
    } catch (error) {
      setToast?.(error.message);
    }
  };
  if (!canManage) return <section className="tdg-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">ACESSOS</span><h2>Você pode usar a vertical, mas não gerenciar usuários.</h2></div><strong>{role || "sem papel"}</strong></div></section>;
  return (
    <section className="tdg-panel tdg-access-panel"><div className="tdg-section-head"><div><span className="tdg-kicker">ACESSOS</span><h2>Autorize e-mails externos para entrar na vertical sem novo deploy.</h2></div><strong>{loading ? "carregando" : `${emails.length} e-mail(s)`}</strong></div>
      <form className="tdg-access-form" onSubmit={save}><label><span>E-mail autorizado</span><input value={form.email} type="email" required placeholder="nome@empresa.com.br" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label><label><span>Papel</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>{TODO_GREEN_ROLES.filter((item) => item !== "owner").map((item) => <option value={item} key={item}>{item.replace(/_/g, " ")}</option>)}</select></label><label><span>Observação</span><input value={form.note} placeholder="Ex.: teste, cliente, fundador" onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></label><button className="tdg-action" type="submit" disabled={saving}><Plus size={17} />{saving ? "Salvando..." : "Autorizar"}</button></form>
      <div className="tdg-access-list">{emails.length === 0 && <div className="tdg-empty-access"><ShieldCheck size={18} />Nenhum e-mail manual autorizado ainda. O domínio @todogreen.com.br continua liberado automaticamente.</div>}{emails.map((item) => <div className="tdg-access-row" key={item.email}><span><strong>{item.email}</strong><small>{item.note || "sem observação"}</small></span><span>{item.role.replace(/_/g, " ")}</span><span className={item.status === "active" ? "good" : ""}>{item.status === "active" ? "ativo" : "inativo"}</span><button type="button" onClick={() => remove(item.email)} aria-label={`Remover ${item.email}`}><Trash2 size={17} /></button></div>)}</div>
    </section>
  );
}

export default function LogisticsVertical({ db, update, setToast, access = {}, authHeaders }) {
  const [path, setPath] = useState(todoGreenPath());
  const [query, setQuery] = useState("");
  const [remoteAccess, setRemoteAccess] = useState(access);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const sync = () => setPath(todoGreenPath());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const headers = authHeaders?.() || {};
    if (!headers.authorization) return;
    fetch(`/api/todogreen/access?owner=${encodeURIComponent(ownerId())}`, { headers })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => { if (payload?.role) setRemoteAccess({ allowed: true, ...payload }); })
      .catch(() => {});
  }, [authHeaders]);
  const allowed = canAccessTodoGreen(db, remoteAccess);
  const role = accessRole(db, remoteAccess);
  const page = todoGreenRouteToPage(path);
  const verticalData = useMemo(() => defaultVerticalData(db, remoteAccess), [db, remoteAccess]);
  const dashboard = useMemo(() => summarizeTodoGreenDashboard(verticalData), [verticalData]);
  const filteredCatalog = TODO_GREEN_MODULE_CATALOG.filter((item) => moduleMatches(item, query));
  const modulesByArea = TODO_GREEN_MODULE_AREAS.map((area) => ({ ...area, modules: filteredCatalog.filter((item) => item.area === area.id).sort((a, b) => a.order - b.order) }));
  const implementedCount = TODO_GREEN_MODULE_CATALOG.filter((item) => IMPLEMENTED_MODULE_IDS.has(item.id)).length;

  if (!allowed) return <AccessDenied db={db} />;

  const openPricing = () => navigate("/todogreen/precificacao");

  return (
    <main className="tdg" aria-labelledby="tdg-title">
      <section className="tdg-hero">
        <div>
          <span className="tdg-kicker">VERTICAL PRIVADA · {TODO_GREEN_TENANT.name}</span>
          <h1 id="tdg-title">Logística sustentável com preço, operação e ESG no mesmo painel.</h1>
          <p>A vertical agora separa módulos funcionais de backlog. Card sem fluxo real não aparece como pronto.</p>
          <div className="tdg-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar função, área, produto ou especialista" aria-label="Buscar funções da vertical To Do Green" /></div>
        </div>
        <aside><strong>{TODO_GREEN_FEATURE_COUNT}</strong><span>{implementedCount} funcionais · {TODO_GREEN_FEATURE_COUNT - implementedCount} backlog</span><small>módulos por tenant, com rota e permissão</small></aside>
      </section>

      <nav className="tdg-tabs" aria-label="Navegação To Do Green">
        {Object.entries(MODULE_IMPLEMENTATION).map(([id, item]) => <button type="button" className={page === id ? "active" : ""} onClick={() => navigate(item.route)} key={id}>{item.title.split(" ")[0]}</button>)}
      </nav>

      <section className="tdg-metrics" aria-label="Indicadores executivos">
        <MetricCard label="Receita contratada" value={BRL.format(dashboard.receitaPrevista || dashboard.receitaRealizada)} detail="simulações e lançamentos" />
        <MetricCard label="Margem operacional" value={`${number.format(dashboard.margemOperacionalPercent)}%`} detail={BRL.format(dashboard.margemContribuicao)} tone={dashboard.margemOperacionalPercent < 18 ? "risk" : "good"} />
        <MetricCard label="CO2 evitado" value={`${number.format(dashboard.co2Evitado / 1000)} t`} detail={`${number.format(dashboard.reducaoEmissoesPercent)}% redução`} tone="good" />
        <MetricCard label="Aprovações pendentes" value={number.format(dashboard.aprovacoesPendentes)} detail="Deal Desk" tone={dashboard.aprovacoesPendentes ? "warn" : "good"} />
        <MetricCard label="Dados" value={verticalData.demo ? "Demo" : "Real"} detail={verticalData.demo ? "rotulado" : "sem seed fake"} />
      </section>

      {!verticalData.demo && dashboard.receitaPrevista === 0 && dashboard.receitaRealizada === 0 && verticalData.clients.length === 0 && page === "dashboard" && <EmptyState onCreate={openPricing} />}
      {page === "dashboard" && <DashboardPanel data={verticalData} dashboard={dashboard} />}
      {page === "clientes" && <ClientPanel data={verticalData} update={update} setToast={setToast} />}
      {page === "oportunidades" && <OpportunityPanel data={verticalData} update={update} setToast={setToast} />}
      {page === "propostas" && <ProposalPanel data={verticalData} update={update} setToast={setToast} />}
      {page === "precificacao" && <PricingPanel role={role} update={update} db={db} authHeaders={authHeaders} setToast={setToast} />}
      {["esg", "green-score", "calculadora-ambiental", "tradutor-esg", "escopo-3"].includes(page) && <EsgPanel dashboard={dashboard} data={verticalData} />}
      {page === "operacoes" && <OperationsPanel data={verticalData} update={update} setToast={setToast} />}
      {page === "receita" && <FinancePanel type="revenue" data={verticalData} update={update} setToast={setToast} />}
      {["custos", "comissoes"].includes(page) && <FinancePanel type="cost" data={verticalData} update={update} setToast={setToast} />}
      {page === "relatorios" && <ReportsPanel dashboard={dashboard} data={verticalData} />}
      {page === "metodologia" && <MethodologyPanel />}
      {page === "auditoria" && <GovernancePanel role={role} />}
      {page === "acessos" && <AccessPanel role={role} authHeaders={authHeaders} setToast={setToast} />}
      {!Object.keys(MODULE_IMPLEMENTATION).includes(page) && !["green-score", "calculadora-ambiental", "tradutor-esg", "escopo-3", "custos", "comissoes"].includes(page) && <DashboardPanel data={verticalData} dashboard={dashboard} />}

      <section className="tdg-panel">
        <div className="tdg-section-head"><div><span className="tdg-kicker">PRODUTOS LOGÍSTICOS</span><h2>Calculadoras reais disponíveis</h2></div><button className="tdg-action" type="button" onClick={openPricing}>Abrir precificação</button></div>
        <div className="tdg-product-strip">{LOGISTICS_PRODUCTS.map((product) => <ProductCard product={product} active={false} onSelect={openPricing} key={product.id} />)}</div>
      </section>

      {modulesByArea.map((area) => <AreaSection area={area} modules={area.modules} key={area.id} />)}
    </main>
  );
}
