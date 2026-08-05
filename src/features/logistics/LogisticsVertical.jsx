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
  Truck,
  Trash2,
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
  TODO_GREEN_ROLES,
  TODO_GREEN_TENANT,
  centralPricingEngine,
  createPricingScenarioSnapshot,
  esgTranslator,
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
  Truck,
  UserRound,
  Users,
  WalletCards,
  Workflow,
  Zap,
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const todoGreenPath = () =>
  typeof window === "undefined" ? "/todogreen" : window.location.pathname;

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

const moduleMatches = (item, query) =>
  `${item.name} ${item.area} ${item.description}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes(
      String(query || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    );

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

const canAccessTodoGreen = (db = {}, access = {}) => {
  if (access.allowed) return true;
  if (db?.user?.email && /@todogreen\.com\.br$/i.test(db.user.email)) return true;
  const tenantAccess = db?.tenantAccess?.todogreen || db?.todoGreenAccess;
  if (tenantAccess?.active !== false && tenantAccess?.role) return true;
  return (db?.businesses || []).some(
    (business) =>
      /to\s*do\s*green/i.test(business.name || "") ||
      business.tenantSlug === TODO_GREEN_TENANT.slug,
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
    client: "Cliente enterprise",
    clientId: "cliente-enterprise",
    origin: "CD Cajamar",
    destination: "Hub SP",
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
  { userId: "seed", tenantId: TODO_GREEN_TENANT.id },
);

const seedLastMile = createPricingScenarioSnapshot(
  "last-mile",
  {
    client: "Operação e-commerce",
    clientId: "ecommerce",
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
  { userId: "seed", tenantId: TODO_GREEN_TENANT.id },
);

const defaultVerticalData = (db = {}) => ({
  pricingScenarios:
    db.todoGreenPricingScenarios?.length > 0
      ? db.todoGreenPricingScenarios
      : [seedScenario, seedLastMile],
  revenueEntries: db.todoGreenRevenueEntries || [
    { id: "rev-1", amount: 138000, clientId: "cliente-enterprise", productId: "middle-mile" },
    { id: "rev-2", amount: 91000, clientId: "ecommerce", productId: "last-mile" },
  ],
  operations: db.todoGreenOperations || [
    { id: "op-1", deliveries: 8400, packages: 9600, trips: 396, distanceKm: 24552, occupancyPercent: 81 },
    { id: "op-2", deliveries: 0, packages: 0, trips: 44, distanceKm: 3784, occupancyPercent: 78 },
  ],
  tasks: db.tasks || [],
  inboxUnread: (db.notifications || []).filter((item) => !item.read).length,
});

function AccessDenied({ db }) {
  return (
    <main className="tdg tdg-denied" aria-labelledby="tdg-denied-title">
      <section className="tdg-denied-card">
        <div className="tdg-denied-mark">
          <ShieldCheck />
        </div>
        <span className="tdg-kicker">ACESSO PRIVADO</span>
        <h1 id="tdg-denied-title">Vertical To Do Green protegida</h1>
        <p>
          Esta área só abre para usuários vinculados ao workspace da To Do Green
          ou com permissão individual ativa. Entrar pela URL não concede acesso.
        </p>
        <dl>
          <div>
            <dt>Usuário atual</dt>
            <dd>{db?.user?.email || "sessão local"}</dd>
          </div>
          <div>
            <dt>Tenant</dt>
            <dd>{TODO_GREEN_TENANT.slug}</dd>
          </div>
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
  return (
    <button className="tdg-module-card" type="button" onClick={() => navigate(item.route)}>
      <span className="tdg-module-icon">
        <Icon size={22} />
      </span>
      <span>
        <strong>{item.name}</strong>
        <small>{item.description || "Abrir módulo"}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}

function AreaSection({ area, modules }) {
  return (
    <section className="tdg-section" aria-labelledby={`area-${area.id}`}>
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">{area.name}</span>
          <h2 id={`area-${area.id}`}>{area.description}</h2>
        </div>
        <span>{modules.length} funções</span>
      </div>
      <div className="tdg-module-grid">
        {modules.map((item) => (
          <ModuleCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, active, onSelect }) {
  return (
    <button
      className={`tdg-product-card ${active ? "active" : ""}`}
      type="button"
      onClick={() => onSelect(product.id)}
    >
      <span>{product.code}</span>
      <strong>{product.name}</strong>
      <small>{product.billingUnit} · {product.requiredFields.length} campos obrigatórios</small>
    </button>
  );
}

function PricingPanel({ role }) {
  const [productId, setProductId] = useState("middle-mile");
  const [inputs, setInputs] = useState({
    client: "Cliente enterprise",
    distanceKm: 92,
    tripsPerMonth: 40,
    packages: 5200,
    daysPerMonth: 22,
    routesPerDay: 12,
    kmPerRoute: 58,
    vehicleType: "Elétrico",
    customerTargetPrice: 68000,
    occupancyPercent: 76,
    dataQuality: 78,
    weightKg: 2800,
    pallets: 10,
  });
  const allowed = hasTodoGreenPermission(role, "pricing:simulate");
  const result = useMemo(
    () => centralPricingEngine(productId, inputs),
    [inputs, productId],
  );
  const outputs = productSpecificOutputs(productId, result);

  if (!allowed) {
    return (
      <section className="tdg-panel">
        <h2>Sem permissão para simular</h2>
        <p>Seu papel pode visualizar dados, mas não alterar premissas comerciais.</p>
      </section>
    );
  }

  return (
    <section className="tdg-panel tdg-pricing">
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">PRECIFICAÇÃO LOGÍSTICA</span>
          <h2>Calculadoras por produto usando motor financeiro compartilhado</h2>
        </div>
        <strong>{result.recommendation.decision}</strong>
      </div>
      <div className="tdg-product-strip">
        {LOGISTICS_PRODUCTS.map((product) => (
          <ProductCard
            product={product}
            active={product.id === productId}
            onSelect={setProductId}
            key={product.id}
          />
        ))}
      </div>
      <div className="tdg-calculator-grid">
        <form className="tdg-form">
          {[
            ["distanceKm", "Distância ou km da rota"],
            ["tripsPerMonth", "Viagens/mês"],
            ["packages", "Pacotes"],
            ["customerTargetPrice", "Target do cliente"],
            ["occupancyPercent", "Ocupação prevista (%)"],
            ["dataQuality", "Qualidade dos dados (%)"],
          ].map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                value={inputs[key] || ""}
                inputMode="decimal"
                onChange={(event) =>
                  setInputs((current) => ({
                    ...current,
                    [key]: Number(event.target.value) || 0,
                  }))
                }
              />
            </label>
          ))}
        </form>
        <div className="tdg-result">
          <MetricCard label="Preço mínimo" value={BRL.format(result.minimumPrice)} detail="piso com margem mínima" />
          <MetricCard label="Preço recomendado" value={BRL.format(result.recommendedPrice)} detail="margem alvo e riscos" tone="good" />
          <MetricCard label="Margem" value={`${number.format(result.marginPercent)}%`} detail={BRL.format(result.marginValue)} tone={result.marginPercent < 18 ? "risk" : "good"} />
          <MetricCard label="CO2 evitado" value={`${number.format(result.impact.co2AvoidedKg / 1000)} t`} detail={`${number.format(result.impact.reductionPercent)}% redução`} />
        </div>
      </div>
      <div className="tdg-output-grid">
        {Object.entries(outputs).map(([key, value]) => (
          <span key={key}>
            <small>{key.replace(/[A-Z]/g, " $&").toLowerCase()}</small>
            <strong>{typeof value === "number" ? number.format(value) : value}</strong>
          </span>
        ))}
      </div>
      {result.approval.required && (
        <div className="tdg-alert">
          <AlertTriangle size={18} />
          <span>Deal Desk obrigatório: {result.approval.triggers.join(", ")}.</span>
        </div>
      )}
      <ul className="tdg-reasons">
        {result.recommendation.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}

function EsgPanel({ dashboard }) {
  const translator = esgTranslator(dashboard.co2Evitado);
  return (
    <section className="tdg-panel tdg-esg">
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">INTELIGÊNCIA ESG</span>
          <h2>Green Score, calculadora ambiental e tradutor ESG</h2>
        </div>
        <strong>{number.format(dashboard.greenScore)} / 100</strong>
      </div>
      <div className="tdg-result">
        <MetricCard label="CO2 evitado" value={`${number.format(dashboard.co2Evitado / 1000)} t`} detail="estimativa auditável" tone="good" />
        <MetricCard label="Diesel não consumido" value={`${number.format(dashboard.dieselNaoConsumido)} L`} detail="referência diesel" />
        <MetricCard label="Redução" value={`${number.format(dashboard.reducaoEmissoesPercent)}%`} detail="cenário sustentável vs convencional" />
        <MetricCard label="Árvores equivalentes" value={number.format(translator.equivalents.treesYear)} detail="equivalência ilustrativa anual" />
      </div>
      <div className="tdg-method">
        <strong>Texto para proposta</strong>
        <p>{translator.proposalText}</p>
        <small>{translator.disclaimer}</small>
      </div>
    </section>
  );
}

function GovernancePanel({ role }) {
  return (
    <section className="tdg-panel">
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">GOVERNANÇA</span>
          <h2>Permissões por papel, auditoria e campos bloqueados</h2>
        </div>
        <strong>{role || "sem papel"}</strong>
      </div>
      <div className="tdg-governance-grid">
        {[
          ["Custos oficiais", "Bloqueado para vendedores", "cost:manage"],
          ["Margem mínima", "Alteração exige Pricing ou Financeiro", "pricing:manage"],
          ["Fatores ambientais", "Sustentabilidade mantém versões", "esg:manage"],
          ["Aprovação Deal Desk", "Fluxo com justificativa e decisão", "deal:approve"],
          ["Auditoria", "Logs de cálculo, exportação e aprovação", "audit:read"],
        ].map(([title, detail, permission]) => (
          <div className="tdg-rule" key={title}>
            <ShieldCheck size={18} />
            <strong>{title}</strong>
            <span>{detail}</span>
            <small>{hasTodoGreenPermission(role, permission) ? "permitido" : "sem permissão direta"}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccessPanel({ role, authHeaders, setToast }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    role: "admin",
    note: "",
  });
  const canManage = role === "admin" || role === "owner";

  const load = useCallback(() => {
    const headers = authHeaders?.() || {};
    if (!headers.authorization || !canManage) return;
    fetch(`/api/todogreen/access-list?owner=${encodeURIComponent(ownerId())}`, {
      headers,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os acessos.");
        setEmails(payload.emails || []);
      })
      .catch((error) => setToast?.(error.message))
      .finally(() => setLoading(false));
  }, [authHeaders, canManage, setToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    const headers = authHeaders?.() || {};
    if (!headers.authorization || !canManage) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/todogreen/access-list?owner=${encodeURIComponent(ownerId())}`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...headers },
          body: JSON.stringify(form),
        },
      );
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
      const response = await fetch(
        `/api/todogreen/access-list?owner=${encodeURIComponent(ownerId())}&email=${encodeURIComponent(email)}`,
        { method: "DELETE", headers },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível remover o acesso.");
      setEmails((current) => current.filter((item) => item.email !== email));
      setToast?.("Acesso removido");
    } catch (error) {
      setToast?.(error.message);
    }
  };

  if (!canManage) {
    return (
      <section className="tdg-panel">
        <div className="tdg-section-head">
          <div>
            <span className="tdg-kicker">ACESSOS</span>
            <h2>Você pode usar a vertical, mas não gerenciar usuários.</h2>
          </div>
          <strong>{role || "sem papel"}</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="tdg-panel tdg-access-panel">
      <div className="tdg-section-head">
        <div>
          <span className="tdg-kicker">ACESSOS</span>
          <h2>Autorize e-mails externos para entrar na vertical sem novo deploy.</h2>
        </div>
        <strong>{loading ? "carregando" : `${emails.length} e-mail(s)`}</strong>
      </div>
      <form className="tdg-access-form" onSubmit={save}>
        <label>
          <span>E-mail autorizado</span>
          <input
            value={form.email}
            type="email"
            required
            placeholder="nome@empresa.com.br"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label>
          <span>Papel</span>
          <select
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            {TODO_GREEN_ROLES.filter((item) => item !== "owner").map((item) => (
              <option value={item} key={item}>
                {item.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Observação</span>
          <input
            value={form.note}
            placeholder="Ex.: teste, cliente, fundador"
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
        </label>
        <button className="tdg-action" type="submit" disabled={saving}>
          <Plus size={17} />
          {saving ? "Salvando..." : "Autorizar"}
        </button>
      </form>
      <div className="tdg-access-list">
        {emails.length === 0 && (
          <div className="tdg-empty-access">
            <ShieldCheck size={18} />
            Nenhum e-mail manual autorizado ainda. O domínio @todogreen.com.br continua liberado automaticamente.
          </div>
        )}
        {emails.map((item) => (
          <div className="tdg-access-row" key={item.email}>
            <span>
              <strong>{item.email}</strong>
              <small>{item.note || "sem observação"}</small>
            </span>
            <span>{item.role.replace(/_/g, " ")}</span>
            <span className={item.status === "active" ? "good" : ""}>
              {item.status === "active" ? "ativo" : "inativo"}
            </span>
            <button type="button" onClick={() => remove(item.email)} aria-label={`Remover ${item.email}`}>
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LogisticsVertical({
  db,
  update,
  setToast,
  access = {},
  authHeaders,
}) {
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
    fetch(`/api/todogreen/access?owner=${encodeURIComponent(ownerId())}`, {
      headers,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.role) setRemoteAccess({ allowed: true, ...payload });
      })
      .catch(() => {});
  }, [authHeaders]);
  const allowed = canAccessTodoGreen(db, remoteAccess);
  const role = accessRole(db, remoteAccess);
  const page = todoGreenRouteToPage(path);
  const verticalData = useMemo(() => defaultVerticalData(db), [db]);
  const dashboard = useMemo(
    () => summarizeTodoGreenDashboard(verticalData),
    [verticalData],
  );
  const filteredCatalog = TODO_GREEN_MODULE_CATALOG.filter((item) =>
    moduleMatches(item, query),
  );
  const modulesByArea = TODO_GREEN_MODULE_AREAS.map((area) => ({
    ...area,
    modules: filteredCatalog
      .filter((item) => item.area === area.id)
      .sort((a, b) => a.order - b.order),
  }));

  if (!allowed) return <AccessDenied db={db} />;

  const saveSeed = () => {
    const snapshot = createPricingScenarioSnapshot(
      "middle-mile",
      seedScenario.inputs,
      { userId: db?.user?.id || "local", tenantId: TODO_GREEN_TENANT.id },
    );
    update?.((current) => ({
      ...current,
      tenantAccess: {
        ...(current.tenantAccess || {}),
        todogreen: { role: role || "admin", active: true },
      },
      todoGreenPricingScenarios: [
        snapshot,
        ...(current.todoGreenPricingScenarios || []).slice(0, 20),
      ],
    }));
    fetch(
      `/api/todogreen/audit?owner=${encodeURIComponent(ownerId())}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
        body: JSON.stringify({
          action: "pricing_snapshot_created",
          target: snapshot.id,
          details: "Simulação salva a partir da vertical To Do Green.",
        }),
      },
    ).catch(() => {});
    setToast?.("Simulação To Do Green salva");
  };

  return (
    <main className="tdg" aria-labelledby="tdg-title">
      <section className="tdg-hero">
        <div>
          <span className="tdg-kicker">VERTICAL PRIVADA · {TODO_GREEN_TENANT.name}</span>
          <h1 id="tdg-title">Logística sustentável com preço, operação e ESG no mesmo painel.</h1>
          <p>
            A To Do Green vende transporte, eficiência operacional, redução de
            emissões, rastreabilidade e dados para relatórios ESG.
          </p>
          <div className="tdg-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar função, área, produto ou especialista"
              aria-label="Buscar funções da vertical To Do Green"
            />
          </div>
        </div>
        <aside>
          <strong>{TODO_GREEN_FEATURE_COUNT}</strong>
          <span>funções catalogadas</span>
          <small>módulos por tenant, com rota e permissão</small>
        </aside>
      </section>

      <nav className="tdg-tabs" aria-label="Navegação To Do Green">
        {[
          ["dashboard", "Dashboard", "/todogreen/dashboard"],
          ["precificacao", "Precificação", "/todogreen/precificacao"],
          ["esg", "ESG", "/todogreen/esg"],
          ["operacoes", "Operações", "/todogreen/operacoes"],
          ["auditoria", "Auditoria", "/todogreen/auditoria"],
          ["acessos", "Acessos", "/todogreen/acessos"],
        ].map(([id, label, route]) => (
          <button
            type="button"
            className={page === id ? "active" : ""}
            onClick={() => navigate(route)}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="tdg-metrics" aria-label="Indicadores executivos">
        <MetricCard label="Receita contratada" value={BRL.format(dashboard.receitaPrevista)} detail="simulações e propostas" />
        <MetricCard label="Margem operacional" value={`${number.format(dashboard.margemOperacionalPercent)}%`} detail={BRL.format(dashboard.margemContribuicao)} tone={dashboard.margemOperacionalPercent < 18 ? "risk" : "good"} />
        <MetricCard label="CO2 evitado" value={`${number.format(dashboard.co2Evitado / 1000)} t`} detail={`${number.format(dashboard.reducaoEmissoesPercent)}% redução`} tone="good" />
        <MetricCard label="Aprovações pendentes" value={number.format(dashboard.aprovacoesPendentes)} detail="Deal Desk" tone={dashboard.aprovacoesPendentes ? "warn" : "good"} />
        <MetricCard label="Tarefas atrasadas" value={number.format(dashboard.tarefasAtrasadas)} detail="workspace atual" tone={dashboard.tarefasAtrasadas ? "risk" : "neutral"} />
      </section>

      {page === "precificacao" && <PricingPanel role={role} />}
      {["esg", "green-score", "calculadora-ambiental", "tradutor-esg", "escopo-3"].includes(page) && (
        <EsgPanel dashboard={dashboard} />
      )}
      {["auditoria", "configuracoes"].includes(page) && <GovernancePanel role={role} />}
      {page === "acessos" && (
        <AccessPanel role={role} authHeaders={authHeaders} setToast={setToast} />
      )}
      {["dashboard", "clientes", "oportunidades", "propostas", "receita", "custos", "comissoes", "operacoes", "relatorios", "metodologia"].includes(page) && (
        <section className="tdg-panel">
          <div className="tdg-section-head">
            <div>
              <span className="tdg-kicker">CENTRAL DE MÓDULOS</span>
              <h2>Escolha pela função, área ou produto logístico</h2>
            </div>
            <button className="tdg-action" type="button" onClick={saveSeed}>
              Salvar simulação auditável
            </button>
          </div>
          <div className="tdg-product-strip">
            {LOGISTICS_PRODUCTS.map((product) => (
              <ProductCard product={product} active={false} onSelect={() => navigate("/todogreen/precificacao")} key={product.id} />
            ))}
          </div>
        </section>
      )}

      {modulesByArea.map((area) => (
        <AreaSection area={area} modules={area.modules} key={area.id} />
      ))}
    </main>
  );
}
