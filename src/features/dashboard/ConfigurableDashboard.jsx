import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  Copy,
  Gauge,
  GripVertical,
  Leaf,
  Plus,
  Settings2,
  Target,
  Trash2,
  TrendingUp,
  Truck,
  WalletCards,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import {
  buildDashboardMetrics,
  createDashboardConfig,
  DASHBOARD_PERIODS,
  DASHBOARD_WIDGETS,
  moveDashboardWidget,
  normalizeDashboardConfig,
  placeDashboardWidget,
  resizeDashboardWidget,
  toggleDashboardWidget,
} from "./dashboardDomain.js";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

const number = (value, maximumFractionDigits = 1) =>
  Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits });

const percent = (value) => `${number(value)}%`;

const moduleByWidget = {
  revenue: "financeiro",
  margin: "financeiro",
  goals: "metas",
  overdueTasks: "operacao",
  riskyProjects: "operacao",
  capacity: "capacidade",
  sla: "processos",
  emissions: "precificacao",
  logistics: "frota",
  revenueTrend: "financeiro",
  attentionTable: "operacao",
};

const iconByWidget = {
  revenue: WalletCards,
  margin: TrendingUp,
  goals: Target,
  overdueTasks: CircleAlert,
  riskyProjects: BriefcaseBusiness,
  capacity: Gauge,
  sla: CheckCircle2,
  emissions: Leaf,
  logistics: Truck,
  revenueTrend: BarChart3,
  attentionTable: CircleAlert,
};

function ProgressBar({ value, tone = "" }) {
  const bounded = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`config-dashboard-progress ${tone}`}>
      <span style={{ width: `${bounded}%` }} />
    </div>
  );
}

function MiniBars({ rows }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.value) || 0));
  return (
    <div className="config-dashboard-bars">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${(Number(row.value || 0) / max) * 100}%` }} />
          </div>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function FinanceChart({ series }) {
  const values = series.flatMap((item) => [item.revenue, item.expense]);
  const max = Math.max(1, ...values);
  const width = 720;
  const height = 210;
  const padding = 26;
  const points = (key) =>
    series
      .map((item, index) => {
        const x =
          series.length <= 1
            ? width / 2
            : padding + (index / (series.length - 1)) * (width - padding * 2);
        const y = height - padding - (item[key] / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  if (!series.length)
    return (
      <div className="config-dashboard-no-data">
        Registre movimentações para formar a evolução financeira.
      </div>
    );
  return (
    <>
      <div className="config-dashboard-chart-legend">
        <span className="revenue">Receitas</span>
        <span className="expense">Despesas</span>
      </div>
      <svg
        className="config-dashboard-line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Evolução de receitas e despesas"
      >
        <title>Evolução de receitas e despesas</title>
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <polyline className="revenue" points={points("revenue")} />
        <polyline className="expense" points={points("expense")} />
      </svg>
      <div className="config-dashboard-axis" aria-hidden="true">
        <span>{series[0]?.label}</span>
        <span>{series[Math.floor(series.length / 2)]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </>
  );
}

function ScopeBars({ byScope }) {
  const rows = ["Escopo 1", "Escopo 2", "Escopo 3"].map((scope) => ({
    label: scope,
    value: Number(byScope?.[scope] || 0),
  }));
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="config-dashboard-scopes">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <strong>{number(row.value, 2)}</strong>
        </div>
      ))}
    </div>
  );
}

function WidgetContent({ id, metrics, go }) {
  if (id === "revenue")
    return (
      <>
        <strong className="config-dashboard-kpi">{money(metrics.finance.revenue)}</strong>
        <span className="config-dashboard-caption">
          {money(metrics.finance.expense)} em despesas
        </span>
      </>
    );
  if (id === "margin")
    return (
      <>
        <strong
          className={`config-dashboard-kpi ${metrics.finance.margin < 0 ? "negative" : ""}`}
        >
          {money(metrics.finance.margin)}
        </strong>
        <span className="config-dashboard-caption">
          {percent(metrics.finance.marginPercent)} sobre a receita
        </span>
      </>
    );
  if (id === "goals")
    return (
      <>
        <strong className="config-dashboard-kpi">
          {percent(metrics.goals.progressoMedio * 100)}
        </strong>
        <ProgressBar value={metrics.goals.progressoMedio * 100} />
        <span className="config-dashboard-caption">
          {metrics.goals.risco + metrics.goals.atencao} de {metrics.goals.total} meta(s)
          pedem atenção
        </span>
      </>
    );
  if (id === "overdueTasks")
    return (
      <>
        <strong
          className={`config-dashboard-kpi ${metrics.tasks.overdue ? "negative" : ""}`}
        >
          {metrics.tasks.overdue}
        </strong>
        <span className="config-dashboard-caption">
          {metrics.tasks.blocked} bloqueada(s) · {metrics.tasks.total} no filtro
        </span>
        <MiniBars rows={metrics.tasks.status} />
      </>
    );
  if (id === "riskyProjects")
    return (
      <>
        <strong
          className={`config-dashboard-kpi ${metrics.projects.risky ? "negative" : ""}`}
        >
          {metrics.projects.risky}
        </strong>
        <span className="config-dashboard-caption">
          de {metrics.projects.total} projeto(s) analisado(s)
        </span>
        <div className="config-dashboard-mini-list">
          {metrics.projects.rows.slice(0, 2).map(({ project, metrics: row }) => (
            <button key={project.id} onClick={() => go("operacao")}>
              <span>{project.name}</span>
              <strong>{row.health}</strong>
            </button>
          ))}
        </div>
      </>
    );
  if (id === "capacity")
    return (
      <>
        <strong className="config-dashboard-kpi">
          {percent(metrics.capacity.totals.utilization)}
        </strong>
        <ProgressBar
          value={metrics.capacity.totals.utilization}
          tone={metrics.capacity.totals.utilization > 100 ? "danger" : ""}
        />
        <span className="config-dashboard-caption">
          {number(metrics.capacity.totals.availableHours)}h disponíveis ·{" "}
          {number(metrics.capacity.totals.overloadHours)}h de sobrecarga
        </span>
      </>
    );
  if (id === "sla")
    return (
      <>
        <strong className="config-dashboard-kpi">{percent(metrics.sla.rate)}</strong>
        <ProgressBar value={metrics.sla.rate} tone={metrics.sla.delayed ? "warning" : ""} />
        <span className="config-dashboard-caption">
          {metrics.sla.delayed} atrasado(s) · {metrics.sla.atRisk} em risco ·{" "}
          {metrics.sla.total} monitorado(s)
        </span>
      </>
    );
  if (id === "emissions")
    return (
      <>
        <strong className="config-dashboard-kpi">
          {number(metrics.emissions.totalKgCo2e, 2)} kgCO₂e
        </strong>
        <span className="config-dashboard-caption">
          confiança média {percent(metrics.emissions.confidence)}
        </span>
        <ScopeBars byScope={metrics.emissions.byScope} />
      </>
    );
  if (id === "logistics")
    return (
      <>
        <strong className="config-dashboard-kpi">{metrics.logistics.active}</strong>
        <span className="config-dashboard-caption">
          frete(s) em operação · {metrics.logistics.delayed} atrasado(s)
        </span>
        <div className="config-dashboard-logistics">
          <span>
            <strong>{metrics.logistics.delivered}</strong>
            Entregues
          </span>
          <span>
            <strong>
              {metrics.logistics.availableVehicles}/{metrics.logistics.vehicles}
            </strong>
            Frota ativa
          </span>
          <span>
            <strong>{money(metrics.logistics.freightValue)}</strong>
            Valor
          </span>
        </div>
      </>
    );
  if (id === "revenueTrend")
    return <FinanceChart series={metrics.finance.series} />;
  if (id === "attentionTable")
    return metrics.attention.length ? (
      <div className="config-dashboard-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Item</th>
              <th>Situação</th>
              <th aria-label="Ação" />
            </tr>
          </thead>
          <tbody>
            {metrics.attention.map((item) => (
              <tr key={item.id}>
                <td>{item.type}</td>
                <td>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </td>
                <td>
                  <span className="config-dashboard-severity">{item.severity}</span>
                </td>
                <td>
                  <button onClick={() => go(item.link)}>Abrir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="config-dashboard-no-data">
        Nenhuma tarefa, projeto ou SLA crítico neste filtro.
      </div>
    );
  return null;
}

function DashboardCard({
  item,
  index,
  total,
  metrics,
  go,
  onMove,
  onDrop,
  onDragStart,
}) {
  const definition = DASHBOARD_WIDGETS.find((widget) => widget.id === item.id);
  const Icon = iconByWidget[item.id] || BarChart3;
  return (
    <div
      className={`config-dashboard-card ${item.size}`}
      draggable
      role="button"
      tabIndex={0}
      aria-label={`Widget ${definition?.title}`}
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(item.id)}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") onMove(item.id, "up");
        if (event.key === "ArrowDown") onMove(item.id, "down");
      }}
      data-widget-id={item.id}
    >
      <header>
        <div>
          <span className="config-dashboard-card-icon">
            <Icon size={18} />
          </span>
          <span>
            <h2>{definition?.title}</h2>
            <small>{definition?.description}</small>
          </span>
        </div>
        <div className="config-dashboard-card-actions">
          <button
            aria-label={`Mover ${definition?.title} para cima`}
            disabled={index === 0}
            onClick={() => onMove(item.id, "up")}
          >
            <ArrowUp />
          </button>
          <button
            aria-label={`Mover ${definition?.title} para baixo`}
            disabled={index === total - 1}
            onClick={() => onMove(item.id, "down")}
          >
            <ArrowDown />
          </button>
          <GripVertical aria-hidden="true" />
        </div>
      </header>
      <div className="config-dashboard-card-body">
        <WidgetContent id={item.id} metrics={metrics} go={go} />
      </div>
      {!["revenueTrend", "attentionTable"].includes(item.id) && (
        <button
          className="config-dashboard-open"
          onClick={() => go(moduleByWidget[item.id])}
        >
          Ver detalhes
        </button>
      )}
    </div>
  );
}

export default function ConfigurableDashboard({
  db,
  update,
  business,
  go,
  setToast,
}) {
  const ownerId = db.user?.id || null;
  const businessId = business?.id || null;
  const persisted = (db.dashboardConfigs || []).filter(
    (item) =>
      item.ownerId === ownerId &&
      (!businessId || !item.businessId || item.businessId === businessId),
  );
  const [fallback, setFallback] = useState(() =>
    createDashboardConfig({ ownerId, businessId }),
  );
  const [activeId, setActiveId] = useState(persisted[0]?.id || fallback.id);
  const [customizing, setCustomizing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [draggedId, setDraggedId] = useState("");
  const active = normalizeDashboardConfig(
    persisted.find((item) => item.id === activeId) ||
      persisted[0] ||
      fallback,
    { ownerId, businessId },
  );
  const projects = (db.projects || []).filter(
    (item) => !businessId || !item.businessId || item.businessId === businessId,
  );
  const metrics = buildDashboardMetrics(db, {
    businessId,
    period: active.filters.period,
    projectId: active.filters.projectId,
  });

  const persist = (next, message = "") => {
    const normalized = normalizeDashboardConfig(
      { ...next, updatedAt: new Date().toISOString() },
      { ownerId, businessId },
    );
    setFallback(normalized);
    setActiveId(normalized.id);
    update((current) => {
      const configs = current.dashboardConfigs || [];
      const exists = configs.some((item) => item.id === normalized.id);
      return {
        ...current,
        dashboardConfigs: exists
          ? configs.map((item) => (item.id === normalized.id ? normalized : item))
          : [normalized, ...configs],
      };
    });
    if (message) setToast?.(message);
  };

  const setFilter = (key, value) =>
    persist({
      ...active,
      filters: { ...active.filters, [key]: value },
    });

  const createPanel = () => {
    const next = createDashboardConfig({
      ownerId,
      businessId,
      name: `Painel ${persisted.length + 2}`,
    });
    persist(next, "Novo painel criado");
  };

  const duplicatePanel = () => {
    const next = createDashboardConfig({
      ownerId,
      businessId,
      name: `${active.name} — cópia`,
    });
    persist(
      {
        ...next,
        layout: active.layout.map((item) => ({ ...item })),
        filters: { ...active.filters },
      },
      "Painel duplicado",
    );
  };

  const removePanel = () => {
    if (persisted.length <= 1) {
      setToast?.("Mantenha ao menos um painel");
      return;
    }
    if (!window.confirm(`Excluir o painel “${active.name}”?`)) return;
    const remaining = persisted.filter((item) => item.id !== active.id);
    update((current) => ({
      ...current,
      dashboardConfigs: (current.dashboardConfigs || []).filter(
        (item) => item.id !== active.id,
      ),
    }));
    setActiveId(remaining[0].id);
    setToast?.("Painel excluído");
  };

  const openCustomize = () => {
    setNameDraft(active.name);
    setCustomizing(true);
  };

  const saveName = () => {
    persist({ ...active, name: nameDraft }, "Personalização salva");
    setCustomizing(false);
  };

  const move = (widgetId, direction) =>
    persist({
      ...active,
      layout: moveDashboardWidget(active.layout, widgetId, direction),
    });

  const drop = (beforeWidgetId) => {
    if (!draggedId) return;
    persist({
      ...active,
      layout: placeDashboardWidget(active.layout, draggedId, beforeWidgetId),
    });
    setDraggedId("");
  };

  return (
    <main className="config-dashboard-page">
      <header className="config-dashboard-hero">
        <div>
          <span>DASHBOARDS CONFIGURÁVEIS</span>
          <h1>Decisões em um painel que se adapta à empresa</h1>
          <p>
            Escolha indicadores, filtre a operação e reorganize os cards. Cada
            pessoa mantém seus próprios painéis sem alterar a visão da equipe.
          </p>
        </div>
        <div className="config-dashboard-hero-actions">
          <button className="btn ghost" onClick={duplicatePanel}>
            <Copy size={17} /> Duplicar
          </button>
          <button className="btn ghost" onClick={createPanel}>
            <Plus size={17} /> Novo painel
          </button>
          <button className="btn primary" onClick={openCustomize}>
            <Settings2 size={17} /> Personalizar
          </button>
        </div>
      </header>

      <section className="config-dashboard-toolbar" aria-label="Filtros do painel">
        <label>
          Painel
          <select
            value={active.id}
            onChange={(event) => setActiveId(event.target.value)}
          >
            {(persisted.length ? persisted : [active]).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Período
          <select
            value={active.filters.period}
            onChange={(event) => setFilter("period", event.target.value)}
          >
            {DASHBOARD_PERIODS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Projeto
          <select
            value={active.filters.projectId}
            onChange={(event) => setFilter("projectId", event.target.value)}
          >
            <option value="all">Todos os projetos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <span className="config-dashboard-range">
          {metrics.range.startDate
            ? `${metrics.range.startDate.split("-").reverse().join("/")} a ${metrics.range.endDate
                .split("-")
                .reverse()
                .join("/")}`
            : "Todo o histórico"}
        </span>
        {persisted.length > 1 && (
          <button
            className="config-dashboard-delete"
            onClick={removePanel}
            aria-label="Excluir painel atual"
          >
            <Trash2 /> Excluir
          </button>
        )}
      </section>

      <section className="config-dashboard-grid" aria-label="Cards do painel">
        {active.layout.map((item, index) => (
          <DashboardCard
            key={item.id}
            item={item}
            index={index}
            total={active.layout.length}
            metrics={metrics}
            go={go}
            onMove={move}
            onDragStart={setDraggedId}
            onDrop={drop}
          />
        ))}
      </section>

      {customizing && (
        <Modal title="Personalizar painel" wide onClose={() => setCustomizing(false)}>
          <div className="modal-body config-dashboard-customize">
            <label>
              Nome do painel
              <input
                autoFocus
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={80}
              />
            </label>
            <div>
              <h3>Indicadores e tamanho</h3>
              <p>
                Ative os cards necessários. Eles podem ser arrastados no painel ou
                movidos pelos botões de seta.
              </p>
            </div>
            <div className="config-dashboard-widget-picker">
              {DASHBOARD_WIDGETS.map((widget) => {
                const configured = active.layout.find(
                  (item) => item.id === widget.id,
                );
                const Icon = iconByWidget[widget.id] || BarChart3;
                return (
                  <article key={widget.id}>
                    <Icon />
                    <span>
                      <strong>{widget.title}</strong>
                      <small>{widget.description}</small>
                    </span>
                    <label className="config-dashboard-switch">
                      <input
                        type="checkbox"
                        checked={!!configured}
                        onChange={(event) =>
                          persist({
                            ...active,
                            layout: toggleDashboardWidget(
                              active.layout,
                              widget.id,
                              event.target.checked,
                            ),
                          })
                        }
                      />
                      <span>Exibir</span>
                    </label>
                    <select
                      aria-label={`Tamanho de ${widget.title}`}
                      disabled={!configured}
                      value={configured?.size || widget.defaultSize}
                      onChange={(event) =>
                        persist({
                          ...active,
                          layout: resizeDashboardWidget(
                            active.layout,
                            widget.id,
                            event.target.value,
                          ),
                        })
                      }
                    >
                      <option value="compact">Compacto</option>
                      <option value="wide">Largo</option>
                    </select>
                  </article>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setCustomizing(false)}>
                Fechar
              </button>
              <button className="btn primary" onClick={saveName}>
                Salvar nome
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
