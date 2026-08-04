import { useState } from "react";
import {
  CalendarOff,
  CircleAlert,
  Gauge,
  Plus,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";
import {
  capacityConflicts,
  createResourceAbsence,
  createResourceAllocation,
  createResourceProfile,
  simulateCapacity,
  teamCapacity,
} from "./capacityDomain.js";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (date, days) => {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};
const number = (value) => Number(value || 0);
const hours = (value) => `${Math.round(number(value) * 10) / 10}h`;
const money = (value) =>
  number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CapacityPlanner({ db, update, business, setToast }) {
  const scope = (items) =>
    (items || []).filter((item) => !business || item.businessId === business.id);
  const profiles = scope(db.resourceProfiles);
  const absences = scope(db.resourceAbsences);
  const allocations = scope(db.resourceAllocations);
  const projects = scope(db.projects);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(plusDays(today(), 27));
  const [modal, setModal] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    role: "",
    skills: "",
    seniority: "Pleno",
    weeklyHours: 40,
    hourlyCost: 0,
    hourlyRevenue: 0,
  });
  const [allocationForm, setAllocationForm] = useState({
    resourceId: "",
    projectId: "",
    startDate: today(),
    endDate: plusDays(today(), 27),
    allocationPercent: 50,
    weeklyHours: 0,
    billable: true,
  });
  const [absenceForm, setAbsenceForm] = useState({
    resourceId: "",
    type: "Férias",
    startDate: today(),
    endDate: today(),
    hoursPerDay: 0,
  });
  const [scenario, setScenario] = useState({
    demandHours: 0,
    hireCount: 0,
    hoursPerHire: 40,
  });

  const report = teamCapacity(profiles, {
    startDate,
    endDate,
    absences,
    allocations,
    timeEntries: scope(db.timeEntries),
  });
  const conflicts = capacityConflicts(report.rows);
  const projection = simulateCapacity({
    availableHours: report.totals.availableHours,
    plannedHours: report.totals.plannedHours,
    ...scenario,
  });

  const context = { businessId: business?.id, ownerId: db.user?.id };
  const saveProfile = (event) => {
    event.preventDefault();
    if (!profileForm.name.trim()) return;
    const item = createResourceProfile(profileForm, context);
    update((current) => ({
      ...current,
      resourceProfiles: [item, ...(current.resourceProfiles || [])],
    }));
    setProfileForm({
      name: "",
      role: "",
      skills: "",
      seniority: "Pleno",
      weeklyHours: 40,
      hourlyCost: 0,
      hourlyRevenue: 0,
    });
    setModal("");
    setToast("Recurso adicionado à capacidade");
  };
  const saveAllocation = (event) => {
    event.preventDefault();
    if (!allocationForm.resourceId) return;
    const project = projects.find((item) => item.id === allocationForm.projectId);
    const item = createResourceAllocation(
      { ...allocationForm, projectName: project?.name || "Operação interna" },
      context,
    );
    update((current) => ({
      ...current,
      resourceAllocations: [item, ...(current.resourceAllocations || [])],
    }));
    setModal("");
    setToast("Alocação registrada");
  };
  const saveAbsence = (event) => {
    event.preventDefault();
    if (!absenceForm.resourceId) return;
    const item = createResourceAbsence(absenceForm, context);
    update((current) => ({
      ...current,
      resourceAbsences: [item, ...(current.resourceAbsences || [])],
    }));
    setModal("");
    setToast("Ausência considerada na capacidade");
  };
  const remove = (collection, id) =>
    update((current) => ({
      ...current,
      [collection]: (current[collection] || []).filter((item) => item.id !== id),
    }));

  return (
    <main className="capacity-page">
      <header className="capacity-hero">
        <div>
          <span>CAPACIDADE E RECURSOS</span>
          <h1>Planeje pessoas, carga e margem</h1>
          <p>
            Controle disponibilidade, ausências e alocações. Projetos e horas
            enriquecem os indicadores quando vinculados, sem serem obrigatórios.
          </p>
        </div>
        <div className="capacity-actions">
          <button className="btn ghost" onClick={() => setModal("absence")}>
            <CalendarOff size={17} /> Registrar ausência
          </button>
          <button className="btn ghost" onClick={() => setModal("allocation")}>
            <Plus size={17} /> Nova alocação
          </button>
          <button className="btn primary" onClick={() => setModal("profile")}>
            <UserRoundPlus size={17} /> Adicionar recurso
          </button>
        </div>
      </header>

      <section className="capacity-period" aria-label="Período da análise">
        <label>
          Início
          <input
            aria-label="Início do período"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          Fim
          <input
            aria-label="Fim do período"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <span>O cálculo respeita a jornada e os dias úteis de cada pessoa.</span>
      </section>

      <section className="capacity-metrics">
        <article><Users /><span>Disponível</span><strong>{hours(report.totals.availableHours)}</strong></article>
        <article><Gauge /><span>Carga planejada</span><strong>{hours(report.totals.plannedHours)}</strong></article>
        <article><CircleAlert /><span>Sobrecarga</span><strong>{hours(report.totals.overloadHours)}</strong></article>
        <article><Gauge /><span>Utilização</span><strong>{report.totals.utilization}%</strong></article>
        <article><Gauge /><span>Margem planejada</span><strong>{money(report.totals.plannedMargin)}</strong></article>
      </section>

      {profiles.length === 0 ? (
        <section className="capacity-empty">
          <Users size={34} />
          <h2>Cadastre a capacidade da equipe</h2>
          <p>
            Comece por uma pessoa ou função. Depois distribua a carga por projeto
            ou por operação interna.
          </p>
          <button className="btn primary" onClick={() => setModal("profile")}>
            Adicionar primeiro recurso
          </button>
        </section>
      ) : (
        <section className="capacity-grid">
          <article className="capacity-panel capacity-table-panel">
            <header>
              <div><h2>Capacidade da equipe</h2><p>Planejado, realizado e disponibilidade líquida.</p></div>
              {conflicts.length > 0 && <span className="capacity-warning">{conflicts.length} conflito(s)</span>}
            </header>
            <div className="capacity-table-wrap">
              <table>
                <thead><tr><th>Recurso</th><th>Disponível</th><th>Planejado</th><th>Realizado</th><th>Utilização</th><th>Saldo</th></tr></thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.resourceId}>
                      <td><strong>{row.name}</strong><small>{profiles.find((p) => p.id === row.resourceId)?.role || "Sem função"}</small></td>
                      <td>{hours(row.availableHours)}</td>
                      <td>{hours(row.plannedHours)}</td>
                      <td>{hours(row.actualHours)}</td>
                      <td><span className={`capacity-util ${row.utilization > 100 ? "over" : ""}`}>{row.utilization}%</span></td>
                      <td className={row.overloadHours ? "negative" : "positive"}>{row.overloadHours ? `-${hours(row.overloadHours)}` : `+${hours(row.idleHours)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="capacity-panel">
            <header><div><h2>Simulação de demanda</h2><p>Antecipe déficit e cenários de contratação.</p></div></header>
            <div className="capacity-scenario">
              <label>Nova demanda (horas)<input aria-label="Nova demanda em horas" type="number" min="0" value={scenario.demandHours} onChange={(event) => setScenario({ ...scenario, demandHours: number(event.target.value) })} /></label>
              <label>Contratações simuladas<input aria-label="Contratações simuladas" type="number" min="0" value={scenario.hireCount} onChange={(event) => setScenario({ ...scenario, hireCount: number(event.target.value) })} /></label>
              <label>Horas por contratação<input aria-label="Horas por contratação" type="number" min="1" value={scenario.hoursPerHire} onChange={(event) => setScenario({ ...scenario, hoursPerHire: number(event.target.value) })} /></label>
              <div className={`capacity-projection ${projection.gap < 0 ? "deficit" : ""}`}>
                <span>{projection.status}</span>
                <strong>{projection.gap >= 0 ? "+" : ""}{hours(projection.gap)}</strong>
                <small>{projection.requiredHires ? `Ainda seriam necessárias ${projection.requiredHires} contratação(ões).` : "A capacidade cobre a demanda simulada."}</small>
              </div>
            </div>
          </article>
        </section>
      )}

      <section className="capacity-grid lower">
        <article className="capacity-panel">
          <header><div><h2>Alocações</h2><p>Reservas parciais por projeto ou operação.</p></div></header>
          <div className="capacity-list">
            {allocations.length === 0 && <p className="muted">Nenhuma alocação no período.</p>}
            {allocations.map((item) => (
              <div key={item.id}>
                <span><strong>{profiles.find((p) => p.id === item.resourceId)?.name || "Recurso"}</strong><small>{item.projectName || "Operação interna"} · {item.weeklyHours ? `${item.weeklyHours}h/sem` : `${item.allocationPercent}%`}</small></span>
                <button aria-label="Excluir alocação" onClick={() => remove("resourceAllocations", item.id)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </article>
        <article className="capacity-panel">
          <header><div><h2>Ausências</h2><p>Férias, feriados, licenças e indisponibilidades.</p></div></header>
          <div className="capacity-list">
            {absences.length === 0 && <p className="muted">Nenhuma ausência registrada.</p>}
            {absences.map((item) => (
              <div key={item.id}>
                <span><strong>{profiles.find((p) => p.id === item.resourceId)?.name || "Recurso"}</strong><small>{item.type} · {item.startDate} a {item.endDate}</small></span>
                <button aria-label="Excluir ausência" onClick={() => remove("resourceAbsences", item.id)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </article>
      </section>

      {modal && (
        <div
          className="capacity-modal-backdrop"
          role="button"
          tabIndex={0}
          aria-label="Fechar modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ")
              setModal("");
          }}
        >
          <section className="capacity-modal" role="dialog" aria-modal="true">
            {modal === "profile" && (
              <form onSubmit={saveProfile}>
                <header><h2>Adicionar recurso</h2><p>Defina jornada, competência e economia da função.</p></header>
                <label>Nome *<input aria-label="Nome do recurso" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
                <label>Função<input value={profileForm.role} onChange={(event) => setProfileForm({ ...profileForm, role: event.target.value })} /></label>
                <label>Competências<input value={profileForm.skills} placeholder="Vendas, UX, financeiro" onChange={(event) => setProfileForm({ ...profileForm, skills: event.target.value })} /></label>
                <div className="capacity-form-row">
                  <label>Senioridade<select value={profileForm.seniority} onChange={(event) => setProfileForm({ ...profileForm, seniority: event.target.value })}><option>Júnior</option><option>Pleno</option><option>Sênior</option><option>Especialista</option></select></label>
                  <label>Horas semanais<input aria-label="Horas semanais" type="number" min="0" value={profileForm.weeklyHours} onChange={(event) => setProfileForm({ ...profileForm, weeklyHours: number(event.target.value) })} /></label>
                </div>
                <div className="capacity-form-row">
                  <label>Custo por hora<input type="number" min="0" step="0.01" value={profileForm.hourlyCost} onChange={(event) => setProfileForm({ ...profileForm, hourlyCost: number(event.target.value) })} /></label>
                  <label>Receita por hora<input type="number" min="0" step="0.01" value={profileForm.hourlyRevenue} onChange={(event) => setProfileForm({ ...profileForm, hourlyRevenue: number(event.target.value) })} /></label>
                </div>
                <footer><button type="button" className="btn ghost" onClick={() => setModal("")}>Cancelar</button><button className="btn primary">Salvar recurso</button></footer>
              </form>
            )}
            {modal === "allocation" && (
              <form onSubmit={saveAllocation}>
                <header><h2>Nova alocação</h2><p>Reserve capacidade sem exigir um projeto.</p></header>
                <label>Recurso *<select aria-label="Recurso da alocação" value={allocationForm.resourceId} onChange={(event) => setAllocationForm({ ...allocationForm, resourceId: event.target.value })}><option value="">Selecione...</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Projeto opcional<select value={allocationForm.projectId} onChange={(event) => setAllocationForm({ ...allocationForm, projectId: event.target.value })}><option value="">Operação interna</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <div className="capacity-form-row"><label>Início<input type="date" value={allocationForm.startDate} onChange={(event) => setAllocationForm({ ...allocationForm, startDate: event.target.value })} /></label><label>Fim<input type="date" value={allocationForm.endDate} onChange={(event) => setAllocationForm({ ...allocationForm, endDate: event.target.value })} /></label></div>
                <div className="capacity-form-row"><label>Percentual<input aria-label="Percentual de alocação" type="number" min="0" max="100" value={allocationForm.allocationPercent} onChange={(event) => setAllocationForm({ ...allocationForm, allocationPercent: number(event.target.value) })} /></label><label>Horas por semana<input type="number" min="0" value={allocationForm.weeklyHours} onChange={(event) => setAllocationForm({ ...allocationForm, weeklyHours: number(event.target.value) })} /></label></div>
                <label className="capacity-check"><input type="checkbox" checked={allocationForm.billable} onChange={(event) => setAllocationForm({ ...allocationForm, billable: event.target.checked })} /> Alocação faturável</label>
                <footer><button type="button" className="btn ghost" onClick={() => setModal("")}>Cancelar</button><button className="btn primary">Salvar alocação</button></footer>
              </form>
            )}
            {modal === "absence" && (
              <form onSubmit={saveAbsence}>
                <header><h2>Registrar ausência</h2><p>Reduza a capacidade disponível no período.</p></header>
                <label>Recurso *<select aria-label="Recurso da ausência" value={absenceForm.resourceId} onChange={(event) => setAbsenceForm({ ...absenceForm, resourceId: event.target.value })}><option value="">Selecione...</option>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Tipo<select value={absenceForm.type} onChange={(event) => setAbsenceForm({ ...absenceForm, type: event.target.value })}><option>Férias</option><option>Ausência</option><option>Licença</option><option>Feriado</option><option>Treinamento</option></select></label>
                <div className="capacity-form-row"><label>Início<input type="date" value={absenceForm.startDate} onChange={(event) => setAbsenceForm({ ...absenceForm, startDate: event.target.value })} /></label><label>Fim<input type="date" value={absenceForm.endDate} onChange={(event) => setAbsenceForm({ ...absenceForm, endDate: event.target.value })} /></label></div>
                <label>Horas por dia (vazio usa a jornada)<input type="number" min="0" value={absenceForm.hoursPerDay} onChange={(event) => setAbsenceForm({ ...absenceForm, hoursPerDay: number(event.target.value) })} /></label>
                <footer><button type="button" className="btn ghost" onClick={() => setModal("")}>Cancelar</button><button className="btn primary">Registrar ausência</button></footer>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
