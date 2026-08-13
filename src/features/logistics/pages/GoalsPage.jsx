import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flag,
  ListChecks,
  Plus,
  Save,
  Settings2,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  GOAL_HEALTH_LABELS,
  formatGoalValue,
  goalMetric,
} from "../goalsDomain.js";
import "./TodoGreenPages.css";

const emptyForm = () => ({
  title: "",
  description: "",
  category: "commercial",
  scopeType: "company",
  scopeId: "",
  scopeLabel: "To Do Green",
  metricKey: "revenue",
  direction: "increase",
  measurementMode: "automatic",
  baselineValue: 0,
  targetValue: "",
  currentValue: 0,
  rangeMin: "",
  rangeMax: "",
  weight: 100,
  periodStart: new Date().toISOString().slice(0, 10),
  periodEnd: `${new Date().getFullYear()}-12-31`,
  cadence: "monthly",
  ownerEmail: "",
  ownerLabel: "",
  evidenceRequired: false,
  status: "active",
});

const api = async (path, authHeaders, options = {}) => {
  const response = await fetch(`/api/todogreen/goals${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(authHeaders?.() || {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
};

const percent = (value) => `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const healthClass = (health) => `tdg-goal-health health-${health || "not_started"}`;

function Summary({ summary = {} }) {
  return (
    <div className="tdg-goal-summary" aria-label="Resumo das metas">
      <article><span>Atingimento ponderado</span><strong>{percent(summary.weightedAttainmentPercent)}</strong><small>{summary.active || 0} metas ativas</small></article>
      <article><span>No ritmo</span><strong>{summary.onTrack || 0}</strong><small>ritmo compatível com o prazo</small></article>
      <article><span>Atenção</span><strong>{summary.attention || 0}</strong><small>abaixo do ritmo necessário</small></article>
      <article><span>Críticas</span><strong>{summary.critical || 0}</strong><small>exigem plano de ação</small></article>
      <article><span>Atingidas</span><strong>{summary.achieved || 0}</strong><small>alvo alcançado ou superado</small></article>
    </div>
  );
}

function GoalCard({ goal, selected, onSelect }) {
  const progress = goal.progress || {};
  const width = Math.min(100, Math.max(0, Number(progress.attainmentPercent || 0)));
  return (
    <button type="button" className={`tdg-goal-card${selected ? " selected" : ""}`} onClick={onSelect}>
      <div className="tdg-goal-card-head">
        <span className={healthClass(progress.healthStatus)}>{GOAL_HEALTH_LABELS[progress.healthStatus] || "Sem leitura"}</span>
        <small>{goal.category} · {goal.scopeLabel || goal.scopeType}</small>
      </div>
      <strong>{goal.title}</strong>
      <div className="tdg-goal-values">
        <span><small>Realizado</small>{formatGoalValue(goal.currentValue, goal.unit)}</span>
        <span><small>Meta</small>{formatGoalValue(goal.targetValue, goal.unit)}</span>
      </div>
      <div className="tdg-goal-progress" aria-label={`${percent(progress.attainmentPercent)} de atingimento`}>
        <i style={{ width: `${width}%` }} />
      </div>
      <footer><span>{percent(progress.attainmentPercent)}</span><span>{goal.ownerLabel || goal.ownerEmail || "Sem responsável"}</span><ChevronRight size={16} /></footer>
    </button>
  );
}

const emptyMetric = () => ({
  label: "", metricKey: "", description: "", category: "commercial", unit: "number",
  direction: "increase", sourceKey: "manual", formula: "", active: true, criteria: [],
});

function MetricsManager({ authHeaders, onClose, onChanged }) {
  const [payload, setPayload] = useState({ metrics: [], units: [], sources: [], categories: [], directions: [] });
  const [form, setForm] = useState(emptyMetric);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const customMetrics = (payload.metrics || []).filter((item) => item.custom);
  const nativeMetrics = (payload.metrics || []).filter((item) => !item.custom);
  const load = async () => {
    try { setPayload(await api("/metrics", authHeaders)); } catch (reason) { setError(reason.message); }
  };
  useEffect(() => { load(); }, []);
  const edit = (metric) => setForm({
    ...emptyMetric(), ...metric, metricKey: metric.id, sourceKey: metric.source,
    databaseId: metric.databaseId, revision: metric.revision,
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateCriterion = (index, key, value) => setForm((current) => ({
    ...current,
    criteria: current.criteria.map((criterion, position) => position === index ? { ...criterion, [key]: value } : criterion),
  }));
  const addCriterion = () => setForm((current) => ({
    ...current,
    criteria: [...current.criteria, { id: crypto.randomUUID(), label: "", operator: "gte", value: 0, max: null, status: "on_track" }],
  }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api(form.databaseId ? `/metrics/${form.databaseId}` : "/metrics", authHeaders, {
        method: form.databaseId ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      setForm(emptyMetric());
      await load();
      onChanged?.();
    } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  };
  const archive = async (metric) => {
    try {
      await api(`/metrics/${metric.databaseId}`, authHeaders, { method: "DELETE" });
      if (form.databaseId === metric.databaseId) setForm(emptyMetric());
      await load(); onChanged?.();
    } catch (reason) { setError(reason.message); }
  };
  return (
    <div className="tdg-goal-drawer tdg-metric-drawer" role="dialog" aria-modal="true" aria-labelledby="metric-manager-title">
      <div className="tdg-metric-manager">
        <header><div><span>ADMINISTRAÇÃO</span><h3 id="metric-manager-title">Métricas e critérios</h3><p>Crie indicadores, escolha a fonte e defina faixas de leitura sem alterar código.</p></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></header>
        {error && <div className="tdg-page-error">{error}</div>}
        <div className="tdg-metric-manager-grid">
          <aside>
            <button type="button" className="tdg-action" onClick={() => setForm(emptyMetric())}><Plus size={15} />Novo indicador</button>
            <strong>Personalizados</strong>
            {customMetrics.length === 0 && <small>Nenhum indicador personalizado.</small>}
            {customMetrics.map((metric) => <div className="tdg-metric-list-item" key={metric.databaseId}><button type="button" onClick={() => edit(metric)}><strong>{metric.label}</strong><small>{metric.category} · {metric.sourceLabel}</small></button><button type="button" aria-label={`Arquivar ${metric.label}`} onClick={() => archive(metric)}><Trash2 size={14} /></button></div>)}
            <details><summary>Indicadores nativos ({nativeMetrics.length})</summary>{nativeMetrics.map((metric) => <small key={metric.id}>{metric.label}</small>)}</details>
          </aside>
          <form onSubmit={save}>
            <div className="tdg-form-row"><label><span>Nome da métrica</span><input required minLength={2} value={form.label} onChange={(e) => update("label", e.target.value)} /></label><label><span>Identificador</span><input value={form.metricKey} disabled={Boolean(form.databaseId)} onChange={(e) => update("metricKey", e.target.value)} placeholder="gerado pelo nome" /></label></div>
            <label><span>Descrição</span><textarea value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
            <div className="tdg-form-row"><label><span>Categoria</span><select value={form.category} onChange={(e) => update("category", e.target.value)}>{(payload.categories || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label><span>Unidade</span><select value={form.unit} onChange={(e) => update("unit", e.target.value)}>{(payload.units || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div>
            <div className="tdg-form-row"><label><span>Direção</span><select value={form.direction} onChange={(e) => update("direction", e.target.value)}>{(payload.directions || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label><span>Fonte de cálculo</span><select value={form.sourceKey} onChange={(e) => update("sourceKey", e.target.value)}>{(payload.sources || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div>
            <label><span>Fórmula / regra documentada</span><input value={form.formula} onChange={(e) => update("formula", e.target.value)} placeholder="Ex.: soma das receitas confirmadas no período" /></label>
            <fieldset className="tdg-metric-criteria"><legend>Critérios de leitura</legend><p>O administrador pode adicionar quantos critérios forem necessários para interpretar o resultado.</p>{form.criteria.map((criterion, index) => <div className="tdg-metric-criterion" key={criterion.id || index}><input aria-label={`Nome do critério ${index + 1}`} value={criterion.label} onChange={(e) => updateCriterion(index, "label", e.target.value)} placeholder="Ex.: Meta atingida" /><select aria-label={`Operador do critério ${index + 1}`} value={criterion.operator} onChange={(e) => updateCriterion(index, "operator", e.target.value)}><option value="gte">Maior ou igual</option><option value="lte">Menor ou igual</option><option value="between">Entre</option></select><input aria-label={`Valor do critério ${index + 1}`} type="number" step="any" value={criterion.value} onChange={(e) => updateCriterion(index, "value", Number(e.target.value))} />{criterion.operator === "between" && <input aria-label={`Máximo do critério ${index + 1}`} type="number" step="any" value={criterion.max ?? ""} onChange={(e) => updateCriterion(index, "max", Number(e.target.value))} />}<select aria-label={`Situação do critério ${index + 1}`} value={criterion.status} onChange={(e) => updateCriterion(index, "status", e.target.value)}><option value="achieved">Atingida</option><option value="on_track">No ritmo</option><option value="attention">Atenção</option><option value="critical">Crítica</option></select><button type="button" aria-label={`Remover critério ${index + 1}`} onClick={() => setForm((current) => ({ ...current, criteria: current.criteria.filter((_, position) => position !== index) }))}><Trash2 size={14} /></button></div>)}<button type="button" onClick={addCriterion}><Plus size={14} />Adicionar critério</button></fieldset>
            <label className="tdg-goal-checkbox"><input type="checkbox" checked={form.active !== false} onChange={(e) => update("active", e.target.checked)} /><span>Disponível para novas metas</span></label>
            <footer><button type="button" onClick={onClose}>Fechar</button><button className="tdg-action" disabled={saving}><Save size={16} />{saving ? "Salvando..." : form.databaseId ? "Atualizar métrica" : "Criar métrica"}</button></footer>
          </form>
        </div>
      </div>
    </div>
  );
}

function GoalForm({ catalogs, goals, onClose, onSaved, authHeaders }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const metric = goalMetric(form.metricKey, catalogs.metrics || []);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = await api("", authHeaders, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          targetValue: Number(form.targetValue),
          baselineValue: Number(form.baselineValue || 0),
          currentValue: Number(form.currentValue || 0),
          rangeMin: form.rangeMin === "" ? null : Number(form.rangeMin),
          rangeMax: form.rangeMax === "" ? null : Number(form.rangeMax),
          weight: Number(form.weight || 100),
          unit: metric.unit,
        }),
      });
      onSaved(payload.goal);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="tdg-goal-drawer" role="dialog" aria-modal="true" aria-labelledby="new-goal-title">
      <form onSubmit={save}>
        <header><div><span>NOVA META</span><h3 id="new-goal-title">Definir compromisso e critério de medição</h3></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></header>
        {error && <div className="tdg-page-error">{error}</div>}
        <label className="full"><span>Título</span><input required minLength={3} value={form.title} onChange={(e) => change("title", e.target.value)} placeholder="Ex.: Receita contratada no trimestre" /></label>
        <label className="full"><span>Descrição</span><textarea value={form.description} onChange={(e) => change("description", e.target.value)} placeholder="Explique o resultado esperado e o que está dentro do escopo." /></label>
        <div className="tdg-form-row">
          <label><span>Categoria</span><select value={form.category} onChange={(e) => change("category", e.target.value)}>{(catalogs.categories || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label><span>Indicador</span><select value={form.metricKey} onChange={(e) => { const selected = goalMetric(e.target.value, catalogs.metrics || []); setForm((current) => ({ ...current, metricKey: selected.id, category: selected.category, direction: selected.direction || "increase", measurementMode: selected.source === "manual" ? "manual" : "automatic" })); }}>{(catalogs.metrics || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        </div>
        <div className="tdg-form-row">
          <label><span>Escopo</span><select value={form.scopeType} onChange={(e) => change("scopeType", e.target.value)}>{(catalogs.scopes || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label><span>Nome do escopo</span><input value={form.scopeLabel} onChange={(e) => change("scopeLabel", e.target.value)} placeholder="Empresa, área, cliente ou projeto" /></label>
        </div>
        {form.scopeType !== "company" && <label className="full"><span>ID do escopo</span><input value={form.scopeId} onChange={(e) => change("scopeId", e.target.value)} placeholder="ID do cliente, contrato, produto ou projeto" /></label>}
        <div className="tdg-form-row">
          <label><span>Valor inicial</span><input type="number" step="any" value={form.baselineValue} onChange={(e) => change("baselineValue", e.target.value)} /></label>
          <label><span>Valor alvo</span><input required type="number" step="any" value={form.targetValue} onChange={(e) => change("targetValue", e.target.value)} /></label>
        </div>
        <div className="tdg-form-row">
          <label><span>Direção</span><select value={form.direction} onChange={(e) => change("direction", e.target.value)}>{(catalogs.directions || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label><span>Forma de medição</span><select value={form.measurementMode} onChange={(e) => change("measurementMode", e.target.value)}><option value="automatic">Automática, pelos registros do sistema</option><option value="manual">Manual, com check-in</option></select></label>
        </div>
        {form.direction === "range" && <div className="tdg-form-row"><label><span>Mínimo aceitável</span><input required type="number" step="any" value={form.rangeMin} onChange={(e) => change("rangeMin", e.target.value)} /></label><label><span>Máximo aceitável</span><input required type="number" step="any" value={form.rangeMax} onChange={(e) => change("rangeMax", e.target.value)} /></label></div>}
        <div className="tdg-form-row">
          <label><span>Início</span><input required type="date" value={form.periodStart} onChange={(e) => change("periodStart", e.target.value)} /></label>
          <label><span>Fim</span><input required type="date" value={form.periodEnd} onChange={(e) => change("periodEnd", e.target.value)} /></label>
        </div>
        <div className="tdg-form-row">
          <label><span>Periodicidade do check-in</span><select value={form.cadence} onChange={(e) => change("cadence", e.target.value)}>{(catalogs.cadences || []).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label><span>Peso</span><input type="number" min="0" max="100" value={form.weight} onChange={(e) => change("weight", e.target.value)} /></label>
        </div>
        <div className="tdg-form-row"><label><span>Responsável</span><input value={form.ownerLabel} onChange={(e) => change("ownerLabel", e.target.value)} placeholder="Nome" /></label><label><span>E-mail do responsável</span><input type="email" value={form.ownerEmail} onChange={(e) => change("ownerEmail", e.target.value)} /></label></div>
        <label className="full"><span>Meta principal, opcional</span><select value={form.parentGoalId || ""} onChange={(e) => change("parentGoalId", e.target.value)}><option value="">Sem meta principal</option>{goals.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        <label className="tdg-goal-checkbox"><input type="checkbox" checked={form.evidenceRequired} onChange={(e) => change("evidenceRequired", e.target.checked)} /><span>Exigir evidência em cada check-in</span></label>
        <footer><button type="button" onClick={onClose}>Cancelar</button><button className="tdg-action" disabled={saving}><Save size={17} />{saving ? "Salvando..." : "Criar meta"}</button></footer>
      </form>
    </div>
  );
}

function CheckinForm({ goal, onSaved, authHeaders }) {
  const [form, setForm] = useState({ measuredValue: goal.currentValue, narrative: "", risks: "", blockers: "", nextSteps: "", evidenceUrl: "", evidenceNote: "", nextReviewAt: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api(`/${goal.id}/checkins`, authHeaders, { method: "POST", body: JSON.stringify(form) });
      setForm((current) => ({ ...current, narrative: "", risks: "", blockers: "", nextSteps: "", evidenceUrl: "", evidenceNote: "" }));
      onSaved();
    } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  };
  return (
    <form className="tdg-goal-checkin-form" onSubmit={save}>
      <h4><ClipboardCheck size={17} />Registrar check-in</h4>
      {error && <div className="tdg-page-error">{error}</div>}
      {goal.measurementMode === "manual" && <label><span>Resultado medido</span><input type="number" step="any" required value={form.measuredValue} onChange={(e) => setForm({ ...form, measuredValue: e.target.value })} /></label>}
      {goal.measurementMode === "automatic" && <p className="tdg-goal-source-note">O resultado vem automaticamente de {goal.sourceLabel}. O check-in registra análise, riscos e decisões.</p>}
      <label><span>O que mudou</span><textarea required minLength={3} value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} /></label>
      <div className="tdg-form-row"><label><span>Riscos</span><textarea value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} /></label><label><span>Bloqueios</span><textarea value={form.blockers} onChange={(e) => setForm({ ...form, blockers: e.target.value })} /></label></div>
      <label><span>Próximos passos</span><textarea value={form.nextSteps} onChange={(e) => setForm({ ...form, nextSteps: e.target.value })} /></label>
      <div className="tdg-form-row"><label><span>Link da evidência</span><input type="url" value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} /></label><label><span>Próxima revisão</span><input type="date" value={form.nextReviewAt} onChange={(e) => setForm({ ...form, nextReviewAt: e.target.value })} /></label></div>
      <label><span>Observação da evidência</span><input value={form.evidenceNote} onChange={(e) => setForm({ ...form, evidenceNote: e.target.value })} /></label>
      <button className="tdg-action" disabled={saving}><CheckCircle2 size={17} />{saving ? "Registrando..." : "Registrar check-in"}</button>
    </form>
  );
}

function ActionForm({ goalId, onSaved, authHeaders }) {
  const [form, setForm] = useState({ title: "", description: "", ownerLabel: "", ownerEmail: "", dueAt: "", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await api(`/${goalId}/actions`, authHeaders, { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", description: "", ownerLabel: "", ownerEmail: "", dueAt: "", priority: "medium" });
      onSaved();
    } finally { setSaving(false); }
  };
  return (
    <form className="tdg-goal-action-form" onSubmit={save}>
      <h4><ListChecks size={17} />Nova ação</h4>
      <label><span>Ação necessária</span><input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label><span>Descrição</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <div className="tdg-form-row"><label><span>Responsável</span><input value={form.ownerLabel} onChange={(e) => setForm({ ...form, ownerLabel: e.target.value })} /></label><label><span>Prazo</span><input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label></div>
      <button disabled={saving}><Plus size={16} />Adicionar ação</button>
    </form>
  );
}

function GoalDetail({ detail, onReload, authHeaders, setToast }) {
  const { goal, checkins = [], actions = [], events = [], access = {} } = detail;
  const transition = async (name) => {
    try {
      await api(`/${goal.id}/${name}`, authHeaders, { method: "POST", body: JSON.stringify({ note: name === "approve" ? "Meta aprovada pela gestão." : "Ciclo encerrado pela gestão." }) });
      setToast?.(name === "approve" ? "Meta aprovada." : "Meta encerrada.");
      onReload();
    } catch (reason) { setToast?.(reason.message); }
  };
  const updateAction = async (action, status) => {
    try {
      await api(`/${goal.id}/actions/${action.id}`, authHeaders, { method: "PATCH", body: JSON.stringify({ revision: action.revision, status }) });
      onReload();
    } catch (reason) { setToast?.(reason.message); }
  };
  return (
    <article className="tdg-goal-detail">
      <header>
        <div><span className={healthClass(goal.progress.healthStatus)}>{GOAL_HEALTH_LABELS[goal.progress.healthStatus]}</span><h3>{goal.title}</h3><p>{goal.description || "Sem descrição."}</p></div>
        <div className="tdg-goal-detail-actions">{access.canApprove && goal.approvalStatus === "pending" && <button onClick={() => transition("approve")}><ClipboardCheck size={16} />Aprovar</button>}{access.canClose && !["closed", "achieved", "cancelled"].includes(goal.status) && <button onClick={() => transition("close")}><Flag size={16} />Encerrar ciclo</button>}</div>
      </header>
      <div className="tdg-goal-result-grid">
        <div><span>Resultado atual</span><strong>{formatGoalValue(goal.currentValue, goal.unit)}</strong><small>{goal.sourceLabel}</small></div>
        <div><span>Valor alvo</span><strong>{formatGoalValue(goal.targetValue, goal.unit)}</strong><small>faltam {formatGoalValue(goal.progress.remaining, goal.unit)}</small></div>
        <div><span>Atingimento</span><strong>{percent(goal.progress.attainmentPercent)}</strong><small>{percent(goal.progress.elapsedPercent)} do prazo consumido</small></div>
        <div><span>Projeção</span><strong>{percent(goal.progress.projectedPercent)}</strong><small>mantido o ritmo atual</small></div>
      </div>
      <dl className="tdg-goal-meta"><div><dt><CalendarDays size={15} />Período</dt><dd>{goal.periodStart} a {goal.periodEnd}</dd></div><div><dt><UserRound size={15} />Responsável</dt><dd>{goal.ownerLabel || goal.ownerEmail || "Não definido"}</dd></div><div><dt><Target size={15} />Escopo</dt><dd>{goal.scopeLabel || goal.scopeType}</dd></div><div><dt>Versão</dt><dd>{goal.version}, revisão {goal.revision}</dd></div></dl>
      {(goal.thresholds?.criteria || []).length > 0 && <section className="tdg-goal-criteria-readout"><h4>Critérios configurados</h4>{goal.thresholds.criteria.map((criterion) => <span className={goal.progress.matchedCriterion?.id === criterion.id ? "matched" : ""} key={criterion.id}><strong>{criterion.label}</strong><small>{criterion.operator === "gte" ? "≥" : criterion.operator === "lte" ? "≤" : "entre"} {criterion.value}{criterion.operator === "between" ? ` e ${criterion.max}` : ""} · {GOAL_HEALTH_LABELS[criterion.status]}</small></span>)}</section>}
      <div className="tdg-goal-detail-columns">
        <section><h4>Plano de ação</h4>{actions.length === 0 && <p className="tdg-goal-empty">Nenhuma ação aberta.</p>}{actions.map((action) => <div className="tdg-goal-action" key={action.id}><span className={`status-${action.status}`} /><div><strong>{action.title}</strong><small>{action.ownerLabel || "Sem responsável"} · {action.dueAt || "sem prazo"}</small></div><select aria-label={`Situação de ${action.title}`} value={action.status} onChange={(e) => updateAction(action, e.target.value)}><option value="open">Aberta</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueada</option><option value="done">Concluída</option><option value="cancelled">Cancelada</option></select></div>)}{access.canCheckin && <ActionForm goalId={goal.id} authHeaders={authHeaders} onSaved={onReload} />}</section>
        <section><h4>Check-ins</h4>{checkins.length === 0 && <p className="tdg-goal-empty">Nenhum acompanhamento registrado.</p>}{checkins.map((item) => <div className="tdg-goal-checkin" key={item.id}><strong>{item.createdByLabel || "Responsável"}</strong><small>{new Date(item.createdAt).toLocaleString("pt-BR")}</small><p>{item.narrative}</p>{item.blockers && <span><AlertTriangle size={14} />{item.blockers}</span>}</div>)}</section>
      </div>
      {access.canCheckin && <CheckinForm goal={goal} authHeaders={authHeaders} onSaved={onReload} />}
      <details className="tdg-goal-history"><summary>Histórico e auditoria</summary>{events.map((item) => <div key={item.id}><strong>{item.action}</strong><span>{item.actorLabel}</span><small>{new Date(item.createdAt).toLocaleString("pt-BR")}</small><p>{item.note}</p></div>)}</details>
    </article>
  );
}

export default function GoalsPage({ authHeaders, setToast }) {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({});
  const [access, setAccess] = useState({});
  const [catalogs, setCatalogs] = useState({ categories: [], scopes: [], metrics: [], directions: [], cadences: [] });
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [managingMetrics, setManagingMetrics] = useState(false);
  const [filters, setFilters] = useState({ category: "", status: "" });

  const load = async () => {
    setStatus("loading"); setError("");
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
      const payload = await api(query ? `?${query}` : "", authHeaders);
      setGoals(payload.goals || []); setSummary(payload.summary || {}); setAccess(payload.access || {}); setCatalogs(payload.catalogs || catalogs); setStatus("ready");
      if (selectedId && !(payload.goals || []).some((item) => item.id === selectedId)) { setSelectedId(""); setDetail(null); }
    } catch (reason) { setError(reason.message); setStatus("error"); }
  };
  const loadDetail = async (id = selectedId) => {
    if (!id) return;
    try { setDetail(await api(`/${id}`, authHeaders)); } catch (reason) { setError(reason.message); }
  };
  useEffect(() => { load(); }, [filters.category, filters.status]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId]);
  const selected = useMemo(() => goals.find((item) => item.id === selectedId), [goals, selectedId]);
  const reloadAll = async () => { await load(); await loadDetail(); };

  return (
    <section className="tdg-panel tdg-page tdg-goals-page">
      <header className="tdg-page-title"><div><span>COMERCIAL, FINANCEIRO, OPERAÇÃO E ESG</span><h2>Metas e acompanhamento</h2><p>Defina o resultado, a fonte de medição, o responsável e o plano necessário para chegar lá.</p></div><div className="tdg-goal-admin-actions">{access.canManageMetrics && <button type="button" onClick={() => setManagingMetrics(true)}><Settings2 size={17} />Métricas e critérios</button>}{access.canCreate && <button type="button" className="tdg-action" onClick={() => setCreating(true)}><Plus size={17} />Nova meta</button>}</div></header>
      {error && <div className="tdg-page-error">{error}</div>}
      <Summary summary={summary} />
      <div className="tdg-goal-filters"><label><span>Categoria</span><select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">Todas</option>{catalogs.categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label><span>Situação</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Todas</option><option value="draft">Rascunho</option><option value="active">Ativa</option><option value="blocked">Bloqueada</option><option value="achieved">Atingida</option><option value="closed">Encerrada</option></select></label></div>
      <div className="tdg-goals-layout">
        <aside className="tdg-goal-list">{status === "loading" && <p>Carregando metas...</p>}{status !== "loading" && goals.length === 0 && <div className="tdg-goal-empty-state"><Target size={28} /><strong>Nenhuma meta definida</strong><p>Crie a primeira meta com período, responsável e critério de medição.</p></div>}{goals.map((goal) => <GoalCard goal={goal} selected={selectedId === goal.id} onSelect={() => setSelectedId(goal.id)} key={goal.id} />)}</aside>
        <div className="tdg-goal-workspace">{selected && !detail && <p>Carregando detalhes...</p>}{detail && detail.goal?.id === selectedId ? <GoalDetail detail={detail} authHeaders={authHeaders} setToast={setToast} onReload={reloadAll} /> : !selected && <div className="tdg-goal-placeholder"><Target size={34} /><strong>Escolha uma meta</strong><p>O detalhamento mostra ritmo, projeção, check-ins, ações e histórico.</p></div>}</div>
      </div>
      {creating && <GoalForm catalogs={catalogs} goals={goals} authHeaders={authHeaders} onClose={() => setCreating(false)} onSaved={(goal) => { setCreating(false); setSelectedId(goal.id); setToast?.("Meta criada."); load(); }} />}
      {managingMetrics && <MetricsManager authHeaders={authHeaders} onClose={() => setManagingMetrics(false)} onChanged={load} />}
    </section>
  );
}
