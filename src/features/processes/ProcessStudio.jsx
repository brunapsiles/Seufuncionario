import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Plus,
  Settings2,
  Trash2,
  Workflow,
} from "lucide-react";
import {
  buildProcessConnections,
  createProcessCase,
  createProcessDefinition,
  fieldIsVisible,
  PROCESS_FIELD_TYPES,
  PROCESS_TEMPLATES,
  processMetrics,
  processSla,
  transitionProcessCase,
} from "./processDomain.js";

const id = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const fieldInput = (field, value, onChange) => {
  if (field.type === "longtext")
    return (
      <textarea
        rows={3}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  if (field.type === "select")
    return (
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Selecione...</option>
        {(field.options || []).map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  if (field.type === "multiselect")
    return (
      <input
        value={Array.isArray(value) ? value.join(", ") : value ?? ""}
        placeholder="Separe por vírgulas"
        onChange={(event) =>
          onChange(
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
    );
  if (field.type === "checkbox")
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  const type = {
    number: "number",
    currency: "number",
    date: "date",
    datetime: "datetime-local",
    email: "email",
    phone: "tel",
  }[field.type];
  return (
    <input
      type={type || "text"}
      step={field.type === "currency" ? "0.01" : undefined}
      value={value ?? ""}
      onChange={(event) =>
        onChange(
          ["number", "currency"].includes(field.type)
            ? event.target.value === ""
              ? ""
              : Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
};

export default function ProcessStudio({ db, update, business, setToast }) {
  const processes = (db.processes || []).filter(
    (process) => !business || process.businessId === business.id,
  );
  const cases = (db.processCases || []).filter(
    (item) => !business || item.businessId === business.id,
  );
  const [selectedId, setSelectedId] = useState(processes[0]?.id || "");
  const [tab, setTab] = useState("cases");
  const [showCreate, setShowCreate] = useState(processes.length === 0);
  const [templateId, setTemplateId] = useState("approval");
  const [processName, setProcessName] = useState("");
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newField, setNewField] = useState({
    name: "",
    type: "text",
    required: false,
    options: "",
  });
  const selected =
    processes.find((process) => process.id === selectedId) || processes[0] || null;
  const selectedCases = cases.filter((item) => item.processId === selected?.id);
  const metrics = selected ? processMetrics(selected, cases) : null;
  const selectedCase = selectedCases.find((item) => item.id === selectedCaseId);

  const patchProcess = (patch) =>
    update((current) => ({
      ...current,
      processes: (current.processes || []).map((process) =>
        process.id === selected.id
          ? { ...process, ...patch, updatedAt: new Date().toISOString() }
          : process,
      ),
    }));

  const createProcess = () => {
    const process = createProcessDefinition(
      {
        templateId,
        name:
          processName.trim() ||
          PROCESS_TEMPLATES.find((item) => item.id === templateId)?.name,
      },
      { businessId: business?.id, ownerId: db.user?.id },
    );
    update((current) => ({
      ...current,
      processes: [process, ...(current.processes || [])],
    }));
    setSelectedId(process.id);
    setShowCreate(false);
    setProcessName("");
    setToast("Processo criado");
  };

  const removeProcess = () => {
    if (!window.confirm("Arquivar este processo? Os casos e o histórico serão mantidos."))
      return;
    patchProcess({ active: false, archivedAt: new Date().toISOString() });
    setToast("Processo arquivado");
  };

  const addStage = () => {
    const name = newStageName.trim();
    if (!name) return;
    const currentStages = selected.stages || [];
    const terminal = currentStages[currentStages.length - 1];
    const stages = [
      ...currentStages.slice(0, -1),
      {
        id: id("stage"),
        name,
        description: "",
        slaHours: 24,
        approvalRequired: false,
        requiredFieldIds: [],
        terminal: false,
        order: Math.max(0, currentStages.length - 1),
      },
      { ...terminal, order: currentStages.length },
    ];
    patchProcess({ stages });
    setNewStageName("");
  };

  const patchStage = (stageId, patch) =>
    patchProcess({
      stages: selected.stages.map((stage, index) =>
        stage.id === stageId ? { ...stage, ...patch, order: index } : stage,
      ),
    });

  const deleteStage = (stageId) => {
    if (selected.stages.length <= 2) {
      setToast("O processo precisa ter pelo menos duas etapas");
      return;
    }
    if (selectedCases.some((item) => item.stageId === stageId)) {
      setToast("Mova os casos desta etapa antes de excluí-la");
      return;
    }
    patchProcess({
      stages: selected.stages
        .filter((stage) => stage.id !== stageId)
        .map((stage, index, list) => ({
          ...stage,
          order: index,
          terminal: index === list.length - 1,
        })),
    });
  };

  const addField = () => {
    if (!newField.name.trim()) return;
    patchProcess({
      fields: [
        ...(selected.fields || []),
        {
          id: id("field"),
          name: newField.name.trim(),
          type: newField.type,
          required: newField.required,
          options: newField.options
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean),
          condition: null,
        },
      ],
    });
    setNewField({ name: "", type: "text", required: false, options: "" });
  };

  const patchField = (fieldId, patch) =>
    patchProcess({
      fields: selected.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    });

  const deleteField = (fieldId) => {
    patchProcess({
      fields: selected.fields.filter((field) => field.id !== fieldId),
      stages: selected.stages.map((stage) => ({
        ...stage,
        requiredFieldIds: (stage.requiredFieldIds || []).filter(
          (item) => item !== fieldId,
        ),
      })),
    });
  };

  const submitCase = (event) => {
    event.preventDefault();
    const sequence = cases.filter((item) => item.processId === selected.id).length + 1;
    const result = createProcessCase(selected, values, {
      sequence,
      requesterId: db.user?.id,
      requesterName: db.user?.name,
      requesterEmail: db.user?.email,
      ownerId: db.user?.id,
      businessId: business?.id,
    });
    if (!result.caseRecord) {
      setErrors(result.errors);
      setToast("Revise os campos obrigatórios");
      return;
    }
    const links = buildProcessConnections(
      selected,
      result.caseRecord,
      db.databases || [],
      {
        ownerId: db.user?.id,
        businessId: business?.id,
      },
    );
    const caseRecord = {
      ...result.caseRecord,
      linkedRecord: links.linkedRecord,
      linkedTaskId: links.task?.id || null,
    };
    update((current) => ({
      ...current,
      processCases: [caseRecord, ...(current.processCases || [])],
      formResponses: [
        {
          id: id("response"),
          processId: selected.id,
          caseId: caseRecord.id,
          values: caseRecord.values,
          submittedAt: caseRecord.createdAt,
          submittedBy: db.user?.id,
          businessId: business?.id || null,
          ownerId: db.user?.id || null,
          visibility: "espaco_todo",
        },
        ...(current.formResponses || []),
      ],
      databases: links.databases,
      tasks: links.task ? [links.task, ...(current.tasks || [])] : current.tasks,
    }));
    setValues({});
    setErrors({});
    setSelectedCaseId(caseRecord.id);
    setToast(`Solicitação criada: ${caseRecord.protocol}`);
  };

  const moveCase = (caseRecord, direction) => {
    const currentIndex = selected.stages.findIndex(
      (stage) => stage.id === caseRecord.stageId,
    );
    const target = selected.stages[currentIndex + direction];
    if (!target) return;
    const result = transitionProcessCase(selected, caseRecord, target.id, {
      approved: !!target.approvalRequired,
      actorId: db.user?.id,
      actorName: db.user?.name,
    });
    if (result.error) {
      setToast(result.error);
      setErrors(result.errors || {});
      return;
    }
    update((current) => ({
      ...current,
      processCases: (current.processCases || []).map((item) =>
        item.id === caseRecord.id ? result.caseRecord : item,
      ),
    }));
    setToast(target.terminal ? "Caso concluído" : `Movido para ${target.name}`);
  };

  if (!selected || showCreate)
    return (
      <main className="page process-page">
        <header className="page-head">
          <div>
            <h1>Processos e solicitações</h1>
            <p className="page-sub">
              Estruture etapas, formulários, SLAs e aprovações sem depender de
              outros módulos.
            </p>
          </div>
        </header>
        <section className="panel process-create">
          <h2>Criar processo</h2>
          <div className="process-template-grid">
            {PROCESS_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className={templateId === template.id ? "active" : ""}
                onClick={() => setTemplateId(template.id)}
              >
                <Workflow />
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
          <label>
            Nome do processo
            <input
              value={processName}
              onChange={(event) => setProcessName(event.target.value)}
              placeholder="Ex.: Aprovação de compras"
            />
          </label>
          <div className="process-create-actions">
            {processes.length > 0 && (
              <button className="btn ghost" onClick={() => setShowCreate(false)}>
                Cancelar
              </button>
            )}
            <button className="btn primary" onClick={createProcess}>
              Criar processo
            </button>
          </div>
        </section>
      </main>
    );

  return (
    <main className="page process-page">
      <header className="page-head process-head">
        <div>
          <span className="eyebrow">EXECUTAR</span>
          <h1>Processos e solicitações</h1>
          <p className="page-sub">
            Casos, formulários, aprovações e SLAs sobre uma única definição.
          </p>
        </div>
        <button className="btn primary" onClick={() => setShowCreate(true)}>
          <Plus /> Novo processo
        </button>
      </header>

      <div className="process-shell">
        <aside className="process-sidebar">
          <strong>Processos</strong>
          {processes.map((process) => (
            <button
              key={process.id}
              className={process.id === selected.id ? "active" : ""}
              onClick={() => {
                setSelectedId(process.id);
                setSelectedCaseId("");
              }}
            >
              <Workflow />
              <span>
                {process.name}
                <small>{process.active === false ? "Arquivado" : "Ativo"}</small>
              </span>
            </button>
          ))}
        </aside>

        <section className="process-workspace">
          <div className="process-titlebar">
            <div>
              <h2>{selected.name}</h2>
              <p>{selected.description || "Sem descrição."}</p>
            </div>
            <div className="process-tabs">
              <button
                className={tab === "cases" ? "active" : ""}
                onClick={() => setTab("cases")}
              >
                Casos
              </button>
              <button
                className={tab === "form" ? "active" : ""}
                onClick={() => setTab("form")}
              >
                Formulário
              </button>
              <button
                className={tab === "settings" ? "active" : ""}
                onClick={() => setTab("settings")}
              >
                Configurar
              </button>
            </div>
          </div>

          {tab === "cases" && (
            <>
              <div className="process-metrics">
                <article>
                  <span>Total</span>
                  <strong>{metrics.total}</strong>
                </article>
                <article>
                  <span>Em andamento</span>
                  <strong>{metrics.active}</strong>
                </article>
                <article>
                  <span>Concluídos</span>
                  <strong>{metrics.completed}</strong>
                </article>
                <article className={metrics.delayed ? "danger" : ""}>
                  <span>Fora do SLA</span>
                  <strong>{metrics.delayed}</strong>
                </article>
              </div>
              <div className="process-board">
                {selected.stages.map((stage) => (
                  <section key={stage.id} className="process-column">
                    <header>
                      <strong>{stage.name}</strong>
                      <span>
                        {
                          selectedCases.filter((item) => item.stageId === stage.id)
                            .length
                        }
                      </span>
                    </header>
                    {selectedCases
                      .filter((item) => item.stageId === stage.id)
                      .map((caseRecord) => {
                        const sla = processSla(selected, caseRecord);
                        const index = selected.stages.findIndex(
                          (item) => item.id === stage.id,
                        );
                        return (
                          <article
                            key={caseRecord.id}
                            className={`process-case ${sla.status}`}
                          >
                            <button
                              className="process-case-open"
                              onClick={() => setSelectedCaseId(caseRecord.id)}
                            >
                              <small>{caseRecord.protocol}</small>
                              <strong>{caseRecord.title}</strong>
                            </button>
                            <div className="process-case-sla">
                              <Clock3 />
                              {sla.status === "sem_sla"
                                ? "Sem SLA"
                                : sla.status === "atrasado"
                                  ? `${Math.ceil(Math.abs(sla.remainingHours))}h atrasado`
                                  : `${Math.ceil(sla.remainingHours)}h restantes`}
                            </div>
                            <div className="process-case-actions">
                              <button
                                disabled={index === 0}
                                aria-label="Voltar etapa"
                                onClick={() => moveCase(caseRecord, -1)}
                              >
                                <ArrowLeft />
                              </button>
                              <button
                                disabled={index === selected.stages.length - 1}
                                aria-label={
                                  selected.stages[index + 1]?.approvalRequired
                                    ? "Aprovar e avançar"
                                    : "Avançar etapa"
                                }
                                onClick={() => moveCase(caseRecord, 1)}
                              >
                                {selected.stages[index + 1]?.approvalRequired ? (
                                  <CheckCircle2 />
                                ) : (
                                  <ArrowRight />
                                )}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                  </section>
                ))}
              </div>
              {selectedCase && (
                <section className="panel process-case-detail">
                  <div>
                    <small>{selectedCase.protocol}</small>
                    <h3>{selectedCase.title}</h3>
                  </div>
                  <div className="process-detail-grid">
                    {selected.fields.map((field) => (
                      <div key={field.id}>
                        <span>{field.name}</span>
                        <strong>
                          {Array.isArray(selectedCase.values?.[field.id])
                            ? selectedCase.values[field.id].join(", ")
                            : String(selectedCase.values?.[field.id] ?? "—")}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div className="process-history">
                    <h4>Histórico</h4>
                    {(selectedCase.history || []).map((event) => (
                      <p key={event.id}>
                        <span>{new Date(event.at).toLocaleString("pt-BR")}</span>
                        {event.type === "created"
                          ? "Solicitação criada"
                          : event.type === "completed"
                            ? "Caso concluído"
                            : `Movido para ${
                                selected.stages.find(
                                  (stage) => stage.id === event.stageId,
                                )?.name || "etapa"
                              }`}
                        {event.actorName ? ` por ${event.actorName}` : ""}
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {tab === "form" && (
            <form className="panel process-form" onSubmit={submitCase}>
              <div>
                <span className="eyebrow">NOVA SOLICITAÇÃO</span>
                <h3>{selected.name}</h3>
                <p>
                  Ao enviar, a resposta entra diretamente neste processo
                  {selected.connections?.baseId ? ", na base conectada" : ""}
                  {selected.connections?.createTask ? " e cria uma tarefa" : ""}.
                </p>
              </div>
              {selected.fields
                .filter((field) => fieldIsVisible(field, values))
                .map((field) => (
                  <label key={field.id}>
                    <span>
                      {field.name}
                      {field.required ? " *" : ""}
                    </span>
                    {fieldInput(field, values[field.id], (value) => {
                      setValues((current) => ({ ...current, [field.id]: value }));
                      setErrors((current) => ({ ...current, [field.id]: "" }));
                    })}
                    {errors[field.id] && (
                      <small className="field-error">{errors[field.id]}</small>
                    )}
                  </label>
                ))}
              <button className="btn primary" type="submit">
                Enviar solicitação
              </button>
            </form>
          )}

          {tab === "settings" && (
            <div className="process-settings">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">DEFINIÇÃO</span>
                    <h3>Dados e conexões</h3>
                  </div>
                  <Settings2 />
                </div>
                <label>
                  Nome
                  <input
                    value={selected.name}
                    onChange={(event) => patchProcess({ name: event.target.value })}
                  />
                </label>
                <label>
                  Descrição
                  <textarea
                    rows={3}
                    value={selected.description || ""}
                    onChange={(event) =>
                      patchProcess({ description: event.target.value })
                    }
                  />
                </label>
                <label>
                  Código do protocolo
                  <input
                    value={selected.serviceCode || ""}
                    onChange={(event) =>
                      patchProcess({ serviceCode: event.target.value })
                    }
                    placeholder="Ex.: CMP"
                  />
                </label>
                <label>
                  Base para receber as respostas
                  <select
                    value={selected.connections?.baseId || ""}
                    onChange={(event) =>
                      patchProcess({
                        connections: {
                          ...(selected.connections || {}),
                          baseId: event.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Não conectar a uma base</option>
                    {(db.databases || [])
                      .filter(
                        (base) => !business || base.businessId === business.id,
                      )
                      .map((base) => (
                        <option key={base.id} value={base.id}>
                          {base.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="process-check">
                  <input
                    type="checkbox"
                    checked={!!selected.connections?.createTask}
                    onChange={(event) =>
                      patchProcess({
                        connections: {
                          ...(selected.connections || {}),
                          createTask: event.target.checked,
                        },
                      })
                    }
                  />
                  Criar uma tarefa para cada solicitação
                </label>
                <button className="btn ghost danger" onClick={removeProcess}>
                  <Trash2 /> Arquivar processo
                </button>
              </section>

              <section className="panel">
                <h3>Etapas, SLA e aprovações</h3>
                <div className="process-stage-editor">
                  {selected.stages.map((stage, index) => (
                    <article key={stage.id}>
                      <span>{index + 1}</span>
                      <input
                        value={stage.name}
                        onChange={(event) =>
                          patchStage(stage.id, { name: event.target.value })
                        }
                      />
                      <label>
                        SLA
                        <input
                          type="number"
                          min="0"
                          value={stage.slaHours}
                          onChange={(event) =>
                            patchStage(stage.id, {
                              slaHours: Number(event.target.value) || 0,
                            })
                          }
                        />
                        h
                      </label>
                      <label className="process-check">
                        <input
                          type="checkbox"
                          checked={!!stage.approvalRequired}
                          disabled={stage.terminal}
                          onChange={(event) =>
                            patchStage(stage.id, {
                              approvalRequired: event.target.checked,
                            })
                          }
                        />
                        Aprovação
                      </label>
                      <button
                        className="icon-button danger"
                        disabled={stage.terminal}
                        onClick={() => deleteStage(stage.id)}
                        aria-label={`Excluir etapa ${stage.name}`}
                      >
                        <Trash2 />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="process-inline-add">
                  <input
                    value={newStageName}
                    onChange={(event) => setNewStageName(event.target.value)}
                    placeholder="Nova etapa antes da conclusão"
                  />
                  <button className="btn ghost" onClick={addStage}>
                    <Plus /> Adicionar
                  </button>
                </div>
              </section>

              <section className="panel">
                <h3>Campos do formulário</h3>
                <div className="process-field-editor">
                  {selected.fields.map((field) => (
                    <article key={field.id}>
                      <input
                        value={field.name}
                        onChange={(event) =>
                          patchField(field.id, { name: event.target.value })
                        }
                      />
                      <select
                        value={field.type}
                        onChange={(event) =>
                          patchField(field.id, { type: event.target.value })
                        }
                      >
                        {PROCESS_FIELD_TYPES.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <label className="process-check">
                        <input
                          type="checkbox"
                          checked={!!field.required}
                          onChange={(event) =>
                            patchField(field.id, {
                              required: event.target.checked,
                            })
                          }
                        />
                        Obrigatório
                      </label>
                      <button
                        className="icon-button danger"
                        onClick={() => deleteField(field.id)}
                        aria-label={`Excluir campo ${field.name}`}
                      >
                        <Trash2 />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="process-new-field">
                  <input
                    value={newField.name}
                    onChange={(event) =>
                      setNewField((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nome do campo"
                  />
                  <select
                    value={newField.type}
                    onChange={(event) =>
                      setNewField((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    {PROCESS_FIELD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {["select", "multiselect"].includes(newField.type) && (
                    <input
                      value={newField.options}
                      onChange={(event) =>
                        setNewField((current) => ({
                          ...current,
                          options: event.target.value,
                        }))
                      }
                      placeholder="Opções separadas por vírgula"
                    />
                  )}
                  <label className="process-check">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(event) =>
                        setNewField((current) => ({
                          ...current,
                          required: event.target.checked,
                        }))
                      }
                    />
                    Obrigatório
                  </label>
                  <button className="btn ghost" onClick={addField}>
                    <Plus /> Campo
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>

      {metrics.delayed > 0 && (
        <div className="process-alert" role="status">
          <CircleAlert />
          {metrics.delayed} caso(s) fora do SLA neste processo.
        </div>
      )}
    </main>
  );
}
