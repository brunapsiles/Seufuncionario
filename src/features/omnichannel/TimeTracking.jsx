import { useState } from "react";
import { Clock3, DollarSign, Edit3, Plus, Save, Search, Trash2 } from "lucide-react";
import Modal from "../../components/Modal.jsx";
import { Button, Empty, Field, PageTitle } from "../../components/ui.jsx";
import { today, uid } from "../../domain.js";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

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

export default function TimeTracking({ db, update, business, setToast }) {
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Não faturadas");
  const blankEntry = {
    clientName: "",
    project: "",
    description: "",
    date: today(),
    hours: "1",
    rate: "",
    billable: true,
    billed: false,
  };
  const [form, setForm] = useState(blankEntry);
  const scoped = (db.timeEntries || []).filter(
    (e) => !business || e.businessId === business.id,
  );
  const filtered = scoped
    .filter(
      (e) =>
        !search ||
        `${e.clientName} ${e.project}`.toLowerCase().includes(search.toLowerCase()),
    )
    .filter((e) => {
      if (filter === "Não faturadas") return e.billable && !e.billed;
      if (filter === "Faturadas") return e.billed;
      return true;
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const unbilled = scoped.filter((e) => e.billable && !e.billed);
  const unbilledHours = unbilled.reduce((sum, e) => sum + Number(e.hours || 0), 0);
  const unbilledValue = unbilled.reduce(
    (sum, e) => sum + Number(e.hours || 0) * Number(e.rate || 0),
    0,
  );
  const openEntry = (item = null) => {
    setEditing(item?.id || null);
    setForm(item ? { ...blankEntry, ...item } : blankEntry);
    setModal(true);
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.clientName.trim() || !Number(form.hours)) return;
    const now = new Date().toISOString();
    const item = {
      ...form,
      clientName: form.clientName.trim(),
      hours: Number(form.hours) || 0,
      rate: Number(form.rate) || 0,
      id: editing || uid(),
      businessId: business?.id || null,
      ownerId: form.ownerId || db.user.id,
      visibility: form.visibility || "privado",
      createdAt: form.createdAt || now,
      updatedAt: now,
    };
    update((d) => ({
      ...d,
      timeEntries: editing
        ? (d.timeEntries || []).map((x) => (x.id === editing ? item : x))
        : [item, ...(d.timeEntries || [])],
    }));
    setModal(false);
    setToast(editing ? "Apontamento atualizado" : "Apontamento registrado");
  };
  const removeEntry = (id) => {
    if (!confirm("Excluir este apontamento?")) return;
    update((d) => ({
      ...d,
      timeEntries: (d.timeEntries || []).filter((x) => x.id !== id),
    }));
  };
  const markBilled = (item) => {
    if (item.billed) return;
    const value = Number(item.hours) * Number(item.rate);
    update((d) => ({
      ...d,
      timeEntries: (d.timeEntries || []).map((x) =>
        x.id === item.id
          ? { ...x, billed: true, updatedAt: new Date().toISOString() }
          : x,
      ),
      transactions: [
        {
          id: uid(),
          type: "Receita",
          description: `${item.project || item.clientName} — ${item.hours}h`,
          value,
          date: today(),
          category: "Horas faturadas",
          businessId: business?.id || null,
          ownerId: db.user.id,
        },
        ...d.transactions,
      ],
    }));
    setToast("Horas faturadas e lançadas no Financeiro");
  };
  return (
    <PageTitle
      eyebrow="HORAS E FATURAMENTO"
      title="Apontamento de horas por cliente"
      text="Registre horas trabalhadas e transforme em faturamento com um clique."
      action={
        <Button icon={Plus} onClick={() => openEntry()}>
          Novo apontamento
        </Button>
      }
    >
      <div className="metric-row">
        <Metric icon={Clock3} label="Horas não faturadas" value={unbilledHours} />
        <Metric icon={DollarSign} label="A faturar" value={money(unbilledValue)} />
      </div>
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            type="search"
            placeholder="Buscar por cliente ou projeto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar apontamentos"
          />
        </div>
        <div className="view-toggle">
          {["Não faturadas", "Faturadas", "Todas"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <Empty
          icon={Clock3}
          title="Nenhum apontamento aqui"
          text="Registre as horas trabalhadas para um cliente ou projeto."
          action="Novo apontamento"
          onAction={() => openEntry()}
        />
      ) : (
        <div className="data-list">
          {filtered.map((item) => (
            <article key={item.id}>
              <span className={`status-dot ${item.billed ? "concluído" : "confirmado"}`} />
              <span>
                <strong>
                  {item.clientName}
                  {item.project && ` · ${item.project}`}
                </strong>
                <small>
                  {new Date(`${item.date}T12:00`).toLocaleDateString("pt-BR")} ·{" "}
                  {item.hours}h × {money(item.rate)} = {money(item.hours * item.rate)}
                  {item.billed && " · Faturado"}
                  {!item.billable && " · Não faturável"}
                </small>
              </span>
              <span className="task-actions">
                {item.billable && !item.billed && (
                  <button
                    className="icon-button"
                    aria-label={`Faturar horas de ${item.clientName}`}
                    title="Marcar como faturado"
                    onClick={() => markBilled(item)}
                  >
                    <DollarSign />
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={`Editar apontamento de ${item.clientName}`}
                  onClick={() => openEntry(item)}
                >
                  <Edit3 />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir apontamento de ${item.clientName}`}
                  onClick={() => removeEntry(item.id)}
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
          title={editing ? "Editar apontamento" : "Novo apontamento"}
          onClose={() => setModal(false)}
        >
          <form className="modal-body" onSubmit={save}>
            <div className="form-grid">
              <Field label="Cliente">
                <input
                  required
                  autoFocus
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                />
              </Field>
              <Field label="Projeto (opcional)">
                <input
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                />
              </Field>
              <Field label="Data">
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Horas">
                <input
                  required
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                />
              </Field>
              <Field label="Valor por hora">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                />
              </Field>
              <Field label="Faturável">
                <select
                  value={form.billable ? "sim" : "nao"}
                  onChange={(e) =>
                    setForm({ ...form, billable: e.target.value === "sim" })
                  }
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não (interno)</option>
                </select>
              </Field>
            </div>
            <Field label="O que foi feito">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editing ? "Salvar alterações" : "Salvar apontamento"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageTitle>
  );
}
