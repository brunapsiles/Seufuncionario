import { useEffect, useState } from "react";
import {
  DollarSign,
  Edit3,
  Mail,
  MessageSquareText,
  Plus,
  Save,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import {
  Button,
  Empty,
  Field,
  LIST_PAGE_SIZE,
  LoadMoreButton,
  PageTitle,
} from "../../components/ui.jsx";
import { contactLinks, today, uid } from "../../domain.js";

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

export default function CRM({
  db,
  update,
  business,
  setToast,
  go,
  searchSeed,
  clearSearchSeed,
  AreaToolkit,
  EmailComposer,
  SharingFields,
  buildLeadWonSideEffects,
  logInteraction,
  upsertContact,
  useWhatsappSender,
}) {
  const wa = useWhatsappSender({ db, setToast });
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
  const searchTerm = searchSeed || search;
  useEffect(() => {
    if (!searchSeed) return undefined;
    const id = setTimeout(() => {
      clearSearchSeed?.();
    }, 0);
    return () => clearTimeout(id);
  }, [clearSearchSeed, searchSeed]);
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => {
    const id = setTimeout(() => setVisibleCount(LIST_PAGE_SIZE), 0);
    return () => clearTimeout(id);
  }, [searchTerm, filter]);
  const blankLead = {
    name: "",
    company: "",
    contact: "",
    value: "",
    status: "Novo",
    next: "",
    notes: "",
    interactions: [],
    visibility: "privado",
    sharedWith: [],
    sharedTeams: [],
    project: "",
  };
  const taskProjects = [
    ...new Set([
      ...(db.projects || []).map((p) => p.name),
      ...(db.tasks || []).map((t) => t.project).filter(Boolean),
    ]),
  ];
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
      (!searchTerm ||
        `${l.name} ${l.company}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) &&
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
    const previous = editing
      ? db.leads.find((lead) => lead.id === editing)
      : null;
    const stageChanged = previous && previous.status !== form.status;
    const item = {
      ...form,
      name: form.name.trim(),
      id: editing || uid(),
      businessId: business?.id || form.businessId || null,
      ownerId: form.ownerId || db.user.id,
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
    const wonNow =
      form.status === "Ganho" && (!previous || previous.status !== "Ganho");
    const won = wonNow
      ? buildLeadWonSideEffects(item, {
          businessId: item.businessId,
          ownerId: db.user.id,
        })
      : null;
    update((d) => ({
      ...d,
      leads: editing
        ? d.leads.map((lead) => (lead.id === editing ? item : lead))
        : [item, ...d.leads],
      contacts: upsertContact(d.contacts || [], {
        name: item.name,
        contact: item.contact,
        company: item.company,
        businessId: item.businessId,
        ownerId: db.user.id,
      }),
      tasks: won ? [won.task, ...(d.tasks || [])] : d.tasks || [],
    }));
    if (won) logInteraction(won.interaction);
    setModal(false);
    setEditing(null);
    setForm(blankLead);
    setToast(
      won
        ? "Negócio ganho! Cliente e tarefa de atendimento criados"
        : editing
          ? "Lead atualizado"
          : "Lead adicionado ao CRM",
    );
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
    const won =
      status === "Ganho" && lead.status !== "Ganho"
        ? buildLeadWonSideEffects(lead, {
            businessId: lead.businessId || business?.id || null,
            ownerId: db.user.id,
          })
        : null;
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
      tasks: won ? [won.task, ...(d.tasks || [])] : d.tasks || [],
    }));
    if (won) {
      logInteraction(won.interaction);
      setToast?.("Negócio ganho! Tarefa de primeiro atendimento criada");
    }
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
            value={searchTerm}
            onChange={(e) => {
              setSearch(e.target.value);
              clearSearchSeed?.();
            }}
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
          {leads.slice(0, visibleCount).map((l) => (
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
                  <button
                    className="icon-button"
                    aria-label={`Enviar WhatsApp para ${l.name}`}
                    title="Enviar WhatsApp"
                    onClick={() =>
                      wa.open({
                        phone: contactLinks(l.contact).phone,
                        category: "Contato",
                        vars: {
                          nome: l.name || "",
                          negocio: business?.name || "",
                          valor: l.value ? money(l.value) : "",
                        },
                      })
                    }
                  >
                    <MessageSquareText />
                  </button>
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
      {leads.length > 0 && (
        <LoadMoreButton
          shown={Math.min(visibleCount, leads.length)}
          total={leads.length}
          onClick={() => setVisibleCount((c) => c + LIST_PAGE_SIZE)}
        />
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
            <SharingFields
              value={{
                visibility: form.visibility,
                sharedWith: form.sharedWith,
                sharedTeams: form.sharedTeams,
                project: form.project,
              }}
              onChange={(next) => setForm({ ...form, ...next })}
              teams={db.teams}
              projectOptions={taskProjects}
            />
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
      {wa.modal}
    </PageTitle>
  );
}
