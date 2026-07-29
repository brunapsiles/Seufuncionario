import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCopy,
  Code2,
  CreditCard,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  FileUp,
  Link2,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Trash2,
  Workflow,
} from "lucide-react";
import {
  createPublicFormFromProcess,
  normalizePublicForm,
  PUBLIC_FORM_DESTINATIONS,
  PUBLIC_FORM_FIELD_TYPES,
  PUBLIC_FORM_TEMPLATES,
  publicFormEmbedCode,
  slugifyPublicForm,
} from "./publicFormDomain.js";

const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const destinationLabel = (type) =>
  PUBLIC_FORM_DESTINATIONS.find((item) => item.id === type)?.label ||
  "Somente resposta";

export default function PublicFormsStudio({
  db,
  update,
  business,
  setToast,
  authHeaders,
  ownerId,
}) {
  const workspaceOwnerId = ownerId || db.user?.id;
  const forms = (db.publicForms || []).filter(
    (form) => !business || form.businessId === business.id,
  );
  const processes = (db.processes || []).filter(
    (process) =>
      process.active !== false &&
      (!business || process.businessId === business.id),
  );
  const [selectedId, setSelectedId] = useState(forms[0]?.id || "");
  const [tab, setTab] = useState("builder");
  const [creating, setCreating] = useState(forms.length === 0);
  const [templateId, setTemplateId] = useState("lead");
  const [processTemplateId, setProcessTemplateId] = useState("");
  const [newName, setNewName] = useState("");
  const [newField, setNewField] = useState({
    label: "",
    type: "text",
    required: false,
    options: "",
  });
  const [published, setPublished] = useState({});
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const selected =
    forms.find((form) => form.id === selectedId) || forms[0] || null;
  const publishedState = selected ? published[selected.id] : null;

  const ownerQuery =
    workspaceOwnerId && workspaceOwnerId !== db.user?.id
      ? `?owner=${encodeURIComponent(workspaceOwnerId)}`
      : "";

  const loadStatus = async () => {
    try {
      const response = await fetch(`/api/forms/status${ownerQuery}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPublished(
        Object.fromEntries((data.items || []).map((item) => [item.id, item])),
      );
    } catch {
      // O editor local continua funcionando mesmo se o status remoto falhar.
    }
  };

  useEffect(() => {
    loadStatus();
  }, [workspaceOwnerId]);

  const patchSelected = (patch) => {
    if (!selected) return;
    update((current) => ({
      ...current,
      publicForms: (current.publicForms || []).map((form) =>
        form.id === selected.id
          ? {
              ...form,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : form,
      ),
    }));
  };

  const createForm = () => {
    const context = {
      ownerId: db.user?.id,
      workspaceOwnerId,
      businessId: business?.id || null,
    };
    const process = processes.find((item) => item.id === processTemplateId);
    const form = process
      ? createPublicFormFromProcess(
          process,
          { name: newName.trim() || process.name },
          context,
        )
      : normalizePublicForm(
          {
            templateId,
            name:
              newName.trim() ||
              PUBLIC_FORM_TEMPLATES.find((item) => item.id === templateId)?.name,
          },
          context,
        );
    update((current) => ({
      ...current,
      publicForms: [form, ...(current.publicForms || [])],
    }));
    setSelectedId(form.id);
    setCreating(false);
    setNewName("");
    setProcessTemplateId("");
    setTab("builder");
    setToast("Formulário criado");
  };

  const removeForm = async () => {
    if (
      !selected ||
      !window.confirm(
        "Excluir este formulário do editor? As respostas já recebidas continuam preservadas.",
      )
    )
      return;
    if (publishedState?.published) {
      await fetch(`/api/forms/unpublish${ownerQuery}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id: selected.id }),
      }).catch(() => null);
    }
    update((current) => ({
      ...current,
      publicForms: (current.publicForms || []).filter(
        (form) => form.id !== selected.id,
      ),
    }));
    const next = forms.find((form) => form.id !== selected.id);
    setSelectedId(next?.id || "");
    setCreating(!next);
    setToast("Formulário removido do editor");
  };

  const patchField = (fieldId, patch) =>
    patchSelected({
      fields: selected.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    });

  const addField = () => {
    if (!newField.label.trim()) return;
    patchSelected({
      fields: [
        ...(selected.fields || []),
        {
          id: makeId("field"),
          label: newField.label.trim(),
          type: newField.type,
          required: newField.required,
          placeholder: "",
          help: "",
          options: newField.options
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean),
          condition: null,
          processFieldId: "",
          multiple: true,
        },
      ],
    });
    setNewField({ label: "", type: "text", required: false, options: "" });
  };

  const moveField = (fieldId, direction) => {
    const fields = [...selected.fields];
    const index = fields.findIndex((field) => field.id === fieldId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    patchSelected({ fields });
  };

  const removeField = (fieldId) =>
    patchSelected({
      fields: selected.fields
        .filter((field) => field.id !== fieldId)
        .map((field) =>
          field.condition?.fieldId === fieldId
            ? { ...field, condition: null }
            : field,
        ),
    });

  const publishForm = async () => {
    if (!selected) return;
    setPublishing(true);
    try {
      const suffix = ownerQuery ? `&${ownerQuery.slice(1)}` : "";
      const response = await fetch(`/api/forms/publish?source=editor${suffix}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ form: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível publicar.");
      patchSelected({
        published: true,
        publishedUrl: data.url,
        publishedAt: data.publishedAt,
      });
      setPublished((current) => ({
        ...current,
        [selected.id]: {
          ...(current[selected.id] || {}),
          id: selected.id,
          slug: data.slug,
          url: data.url,
          published: true,
          updatedAt: data.publishedAt,
        },
      }));
      setToast("Formulário publicado");
    } catch (error) {
      setToast(error.message || "Não foi possível publicar");
    } finally {
      setPublishing(false);
    }
  };

  const unpublishForm = async () => {
    if (!selected) return;
    setPublishing(true);
    try {
      const response = await fetch(`/api/forms/unpublish${ownerQuery}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id: selected.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      patchSelected({ published: false });
      setPublished((current) => ({
        ...current,
        [selected.id]: {
          ...(current[selected.id] || {}),
          published: false,
        },
      }));
      setToast("Formulário despublicado");
    } catch (error) {
      setToast(error.message || "Não foi possível despublicar");
    } finally {
      setPublishing(false);
    }
  };

  const loadSubmissions = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ form_id: selected.id });
      if (workspaceOwnerId && workspaceOwnerId !== db.user?.id)
        params.set("owner", workspaceOwnerId);
      const response = await fetch(`/api/forms/submissions?${params}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSubmissions(data.items || []);
    } catch (error) {
      setToast(error.message || "Não foi possível carregar as respostas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "submissions" && selected) loadSubmissions();
  }, [tab, selected?.id]);

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
    } catch {
      setToast("Não foi possível copiar neste navegador");
    }
  };

  const downloadAttachment = async (submission, attachment) => {
    const params = new URLSearchParams({
      submission_id: submission.id,
      attachment_id: attachment.id,
    });
    if (workspaceOwnerId && workspaceOwnerId !== db.user?.id)
      params.set("owner", workspaceOwnerId);
    try {
      const response = await fetch(`/api/forms/file?${params}`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("Arquivo indisponível.");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = attachment.name;
      link.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      setToast(error.message);
    }
  };

  const responseStats = useMemo(
    () => ({
      total: submissions.length,
      converted: submissions.filter(
        (item) => item.conversionStatus === "completed",
      ).length,
      signed: submissions.filter((item) => item.signature?.consent).length,
      paid: submissions.filter((item) => item.payment?.acknowledged).length,
    }),
    [submissions],
  );

  if (!selected || creating)
    return (
      <main className="page public-forms-page">
        <header className="page-head public-forms-head">
          <div>
            <span className="eyebrow">CAPTAR E OPERAR</span>
            <h1>Formulários públicos</h1>
            <p className="page-sub">
              Publique um link ou incorpore no site. Cada resposta recebe
              protocolo e pode virar tarefa, lead, chamado ou processo.
            </p>
          </div>
        </header>
        <section className="panel public-form-create">
          <div>
            <h2>Escolha uma base</h2>
            <p>Todos os campos e integrações continuam editáveis.</p>
          </div>
          <div className="public-form-template-grid">
            {PUBLIC_FORM_TEMPLATES.map((template) => (
              <button
                type="button"
                key={template.id}
                className={
                  templateId === template.id && !processTemplateId ? "active" : ""
                }
                onClick={() => {
                  setTemplateId(template.id);
                  setProcessTemplateId("");
                }}
              >
                <FileText />
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
          {processes.length > 0 && (
            <label>
              Ou reutilize um processo já configurado
              <select
                value={processTemplateId}
                onChange={(event) => setProcessTemplateId(event.target.value)}
              >
                <option value="">Não importar processo</option>
                {processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Nome do formulário
            <input
              value={newName}
              placeholder="Ex.: Solicitação de coleta"
              onChange={(event) => setNewName(event.target.value)}
            />
          </label>
          <div className="public-form-create-actions">
            {forms.length > 0 && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setCreating(false)}
              >
                Cancelar
              </button>
            )}
            <button type="button" className="btn primary" onClick={createForm}>
              <Plus /> Criar formulário
            </button>
          </div>
        </section>
      </main>
    );

  const formUrl =
    publishedState?.url ||
    selected.publishedUrl ||
    `${window.location.origin}/f/${selected.slug}`;
  const embedCode = publicFormEmbedCode(formUrl, selected.title);

  return (
    <main className="page public-forms-page">
      <header className="page-head public-forms-head">
        <div>
          <span className="eyebrow">CAPTAR E OPERAR</span>
          <h1>Formulários públicos</h1>
          <p className="page-sub">
            Link público, incorporação, lógica condicional, upload, assinatura,
            pagamento e conversões automáticas.
          </p>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <Plus /> Novo formulário
        </button>
      </header>

      <div className="public-form-shell">
        <aside className="public-form-sidebar">
          <strong>Formulários</strong>
          {forms.map((form) => {
            const remote = published[form.id];
            return (
              <button
                type="button"
                key={form.id}
                className={form.id === selected.id ? "active" : ""}
                onClick={() => {
                  setSelectedId(form.id);
                  setTab("builder");
                  setSubmissions([]);
                }}
              >
                <FileText />
                <span>
                  <b>{form.name}</b>
                  <small>
                    {remote?.published ? "Publicado" : "Rascunho"} ·{" "}
                    {remote?.submissions || 0} resposta(s)
                  </small>
                </span>
              </button>
            );
          })}
        </aside>

        <section className="public-form-workspace">
          <div className="public-form-titlebar">
            <div>
              <h2>{selected.name}</h2>
              <p>
                {destinationLabel(selected.destination?.type)} · /f/{selected.slug}
              </p>
            </div>
            <div className="public-form-tabs">
              <button
                type="button"
                className={tab === "builder" ? "active" : ""}
                onClick={() => setTab("builder")}
              >
                Construir
              </button>
              <button
                type="button"
                className={tab === "publish" ? "active" : ""}
                onClick={() => setTab("publish")}
              >
                Publicar
              </button>
              <button
                type="button"
                className={tab === "submissions" ? "active" : ""}
                onClick={() => setTab("submissions")}
              >
                Respostas
              </button>
            </div>
          </div>

          {tab === "builder" && (
            <div className="public-form-builder">
              <section className="panel public-form-settings">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">IDENTIDADE</span>
                    <h3>Nome e conteúdo</h3>
                  </div>
                  <Settings2 />
                </div>
                <div className="public-form-grid two">
                  <label>
                    Nome interno
                    <input
                      value={selected.name}
                      onChange={(event) =>
                        patchSelected({ name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Endereço público
                    <div className="public-form-slug">
                      <span>/f/</span>
                      <input
                        value={selected.slug}
                        onChange={(event) =>
                          patchSelected({
                            slug: slugifyPublicForm(event.target.value),
                          })
                        }
                      />
                    </div>
                  </label>
                  <label>
                    Título para quem responde
                    <input
                      value={selected.title}
                      onChange={(event) =>
                        patchSelected({ title: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Código do protocolo
                    <input
                      maxLength={12}
                      value={selected.serviceCode}
                      onChange={(event) =>
                        patchSelected({
                          serviceCode: event.target.value
                            .replace(/[^a-z0-9]/gi, "")
                            .toUpperCase(),
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Descrição
                  <textarea
                    rows={3}
                    value={selected.description}
                    onChange={(event) =>
                      patchSelected({ description: event.target.value })
                    }
                  />
                </label>
              </section>

              <section className="panel public-form-settings">
                <h3>Contato da pessoa</h3>
                <div className="public-form-toggle-grid">
                  {[
                    ["Name", "Nome"],
                    ["Email", "E-mail"],
                    ["Phone", "Telefone"],
                  ].map(([key, label]) => (
                    <article key={key}>
                      <label className="public-form-check">
                        <input
                          type="checkbox"
                          checked={!!selected.contact[`collect${key}`]}
                          onChange={(event) =>
                            patchSelected({
                              contact: {
                                ...selected.contact,
                                [`collect${key}`]: event.target.checked,
                                [`require${key}`]: event.target.checked
                                  ? selected.contact[`require${key}`]
                                  : false,
                              },
                            })
                          }
                        />
                        Coletar {label.toLowerCase()}
                      </label>
                      <label className="public-form-check">
                        <input
                          type="checkbox"
                          disabled={!selected.contact[`collect${key}`]}
                          checked={!!selected.contact[`require${key}`]}
                          onChange={(event) =>
                            patchSelected({
                              contact: {
                                ...selected.contact,
                                [`require${key}`]: event.target.checked,
                              },
                            })
                          }
                        />
                        Obrigatório
                      </label>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel public-form-settings">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">CAMPOS</span>
                    <h3>Perguntas e condições</h3>
                  </div>
                  <FileText />
                </div>
                <div className="public-form-field-list">
                  {selected.fields.map((field, index) => {
                    const previousFields = selected.fields.slice(0, index);
                    return (
                      <article key={field.id}>
                        <div className="public-form-field-main">
                          <span>{index + 1}</span>
                          <input
                            aria-label={`Nome do campo ${index + 1}`}
                            value={field.label}
                            onChange={(event) =>
                              patchField(field.id, { label: event.target.value })
                            }
                          />
                          <select
                            aria-label={`Tipo do campo ${field.label}`}
                            value={field.type}
                            onChange={(event) =>
                              patchField(field.id, {
                                type: event.target.value,
                                options: ["select", "multiselect"].includes(
                                  event.target.value,
                                )
                                  ? field.options
                                  : [],
                              })
                            }
                          >
                            {PUBLIC_FORM_FIELD_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <label className="public-form-check">
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
                          <div className="public-form-field-actions">
                            <button
                              type="button"
                              disabled={index === 0}
                              aria-label={`Mover ${field.label} para cima`}
                              onClick={() => moveField(field.id, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === selected.fields.length - 1}
                              aria-label={`Mover ${field.label} para baixo`}
                              onClick={() => moveField(field.id, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir ${field.label}`}
                              onClick={() => removeField(field.id)}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </div>
                        {["select", "multiselect"].includes(field.type) && (
                          <label>
                            Opções, separadas por vírgula
                            <input
                              value={(field.options || []).join(", ")}
                              onChange={(event) =>
                                patchField(field.id, {
                                  options: event.target.value
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </label>
                        )}
                        {previousFields.length > 0 && (
                          <div className="public-form-condition">
                            <label>
                              Exibir somente se
                              <select
                                value={field.condition?.fieldId || ""}
                                onChange={(event) =>
                                  patchField(field.id, {
                                    condition: event.target.value
                                      ? {
                                          fieldId: event.target.value,
                                          operator: "equals",
                                          value: "",
                                        }
                                      : null,
                                  })
                                }
                              >
                                <option value="">Sempre visível</option>
                                {previousFields.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {field.condition?.fieldId && (
                              <>
                                <label>
                                  Regra
                                  <select
                                    value={field.condition.operator}
                                    onChange={(event) =>
                                      patchField(field.id, {
                                        condition: {
                                          ...field.condition,
                                          operator: event.target.value,
                                        },
                                      })
                                    }
                                  >
                                    <option value="equals">É igual a</option>
                                    <option value="not_equals">É diferente de</option>
                                    <option value="contains">Contém</option>
                                  </select>
                                </label>
                                <label>
                                  Valor
                                  <input
                                    value={field.condition.value}
                                    onChange={(event) =>
                                      patchField(field.id, {
                                        condition: {
                                          ...field.condition,
                                          value: event.target.value,
                                        },
                                      })
                                    }
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className="public-form-new-field">
                  <input
                    value={newField.label}
                    placeholder="Nova pergunta"
                    onChange={(event) =>
                      setNewField((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
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
                    {PUBLIC_FORM_FIELD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {["select", "multiselect"].includes(newField.type) && (
                    <input
                      value={newField.options}
                      placeholder="Opções separadas por vírgula"
                      onChange={(event) =>
                        setNewField((current) => ({
                          ...current,
                          options: event.target.value,
                        }))
                      }
                    />
                  )}
                  <label className="public-form-check">
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
                  <button type="button" className="btn ghost" onClick={addField}>
                    <Plus /> Campo
                  </button>
                </div>
              </section>

              <section className="panel public-form-settings">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">DESTINO</span>
                    <h3>O que acontece após o envio</h3>
                  </div>
                  <Workflow />
                </div>
                <div className="public-form-grid two">
                  <label>
                    Converter cada resposta em
                    <select
                      value={selected.destination.type}
                      onChange={(event) =>
                        patchSelected({
                          destination: {
                            ...selected.destination,
                            type: event.target.value,
                          },
                        })
                      }
                    >
                      {PUBLIC_FORM_DESTINATIONS.map((destination) => (
                        <option key={destination.id} value={destination.id}>
                          {destination.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selected.destination.type === "process" && (
                    <label>
                      Processo
                      <select
                        value={selected.destination.processId || ""}
                        onChange={(event) =>
                          patchSelected({
                            destination: {
                              ...selected.destination,
                              processId: event.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Escolha...</option>
                        {processes.map((process) => (
                          <option key={process.id} value={process.id}>
                            {process.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {["task", "ticket"].includes(selected.destination.type) && (
                    <label>
                      Área da tarefa
                      <input
                        value={
                          selected.destination.type === "ticket"
                            ? "Atendimento"
                            : selected.destination.taskArea || "Operação"
                        }
                        disabled={selected.destination.type === "ticket"}
                        onChange={(event) =>
                          patchSelected({
                            destination: {
                              ...selected.destination,
                              taskArea: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  )}
                </div>
                <p className="public-form-note">
                  A resposta original continua preservada. A conversão cria um
                  registro rastreável com o protocolo e o vínculo de origem.
                </p>
              </section>

              <section className="panel public-form-settings">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">VALIDAÇÃO</span>
                    <h3>Assinatura e pagamento</h3>
                  </div>
                  <FileSignature />
                </div>
                <div className="public-form-feature-grid">
                  <article>
                    <FileSignature />
                    <label className="public-form-check">
                      <input
                        type="checkbox"
                        checked={selected.signature.enabled}
                        onChange={(event) =>
                          patchSelected({
                            signature: {
                              ...selected.signature,
                              enabled: event.target.checked,
                              required: event.target.checked
                                ? selected.signature.required
                                : false,
                            },
                          })
                        }
                      />
                      Solicitar assinatura
                    </label>
                    <label className="public-form-check">
                      <input
                        type="checkbox"
                        disabled={!selected.signature.enabled}
                        checked={selected.signature.required}
                        onChange={(event) =>
                          patchSelected({
                            signature: {
                              ...selected.signature,
                              required: event.target.checked,
                            },
                          })
                        }
                      />
                      Tornar obrigatória
                    </label>
                    {selected.signature.enabled && (
                      <textarea
                        rows={3}
                        value={selected.signature.consentText}
                        onChange={(event) =>
                          patchSelected({
                            signature: {
                              ...selected.signature,
                              consentText: event.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </article>
                  <article>
                    <CreditCard />
                    <label className="public-form-check">
                      <input
                        type="checkbox"
                        checked={selected.payment.enabled}
                        onChange={(event) =>
                          patchSelected({
                            payment: {
                              ...selected.payment,
                              enabled: event.target.checked,
                              required: event.target.checked
                                ? selected.payment.required
                                : false,
                            },
                          })
                        }
                      />
                      Incluir pagamento
                    </label>
                    {selected.payment.enabled && (
                      <>
                        <div className="public-form-grid two">
                          <label>
                            Meio
                            <select
                              value={selected.payment.method}
                              onChange={(event) =>
                                patchSelected({
                                  payment: {
                                    ...selected.payment,
                                    method: event.target.value,
                                  },
                                })
                              }
                            >
                              <option value="pix">Pix copia e cola</option>
                              <option value="link">Link de pagamento</option>
                            </select>
                          </label>
                          <label>
                            Valor
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selected.payment.amount || ""}
                              onChange={(event) =>
                                patchSelected({
                                  payment: {
                                    ...selected.payment,
                                    amount: Number(event.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </label>
                        </div>
                        {selected.payment.method === "pix" ? (
                          <label>
                            Código Pix
                            <textarea
                              rows={3}
                              value={selected.payment.pixCode}
                              onChange={(event) =>
                                patchSelected({
                                  payment: {
                                    ...selected.payment,
                                    pixCode: event.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                        ) : (
                          <label>
                            Link seguro de pagamento
                            <input
                              type="url"
                              value={selected.payment.link}
                              onChange={(event) =>
                                patchSelected({
                                  payment: {
                                    ...selected.payment,
                                    link: event.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                        )}
                        <label>
                          Instruções
                          <textarea
                            rows={2}
                            value={selected.payment.instructions}
                            onChange={(event) =>
                              patchSelected({
                                payment: {
                                  ...selected.payment,
                                  instructions: event.target.value,
                                },
                              })
                            }
                          />
                        </label>
                        <label className="public-form-check">
                          <input
                            type="checkbox"
                            checked={selected.payment.required}
                            onChange={(event) =>
                              patchSelected({
                                payment: {
                                  ...selected.payment,
                                  required: event.target.checked,
                                },
                              })
                            }
                          />
                          Exigir confirmação
                        </label>
                      </>
                    )}
                  </article>
                </div>
              </section>

              <section className="panel public-form-settings">
                <h3>Privacidade e aparência</h3>
                <label className="public-form-check">
                  <input
                    type="checkbox"
                    checked={selected.privacy.consentRequired}
                    onChange={(event) =>
                      patchSelected({
                        privacy: {
                          ...selected.privacy,
                          consentRequired: event.target.checked,
                        },
                      })
                    }
                  />
                  Exigir consentimento para uso dos dados
                </label>
                <label>
                  Texto de consentimento
                  <textarea
                    rows={2}
                    value={selected.privacy.consentText}
                    onChange={(event) =>
                      patchSelected({
                        privacy: {
                          ...selected.privacy,
                          consentText: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <div className="public-form-colors">
                  {[
                    ["primaryColor", "Cor principal"],
                    ["backgroundColor", "Fundo"],
                    ["cardColor", "Cartão"],
                    ["textColor", "Texto"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="color"
                        value={selected.appearance[key]}
                        onChange={(event) =>
                          patchSelected({
                            appearance: {
                              ...selected.appearance,
                              [key]: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="public-form-grid two">
                  <label>
                    URL do logo
                    <input
                      type="url"
                      value={selected.appearance.logoUrl}
                      onChange={(event) =>
                        patchSelected({
                          appearance: {
                            ...selected.appearance,
                            logoUrl: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Texto do botão
                    <input
                      value={selected.appearance.buttonLabel}
                      onChange={(event) =>
                        patchSelected({
                          appearance: {
                            ...selected.appearance,
                            buttonLabel: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Mensagem após o envio
                  <textarea
                    rows={2}
                    value={selected.appearance.successMessage}
                    onChange={(event) =>
                      patchSelected({
                        appearance: {
                          ...selected.appearance,
                          successMessage: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={removeForm}
                >
                  <Trash2 /> Excluir formulário do editor
                </button>
              </section>
            </div>
          )}

          {tab === "publish" && (
            <div className="public-form-publish">
              <section
                className={`panel public-form-publish-status ${
                  publishedState?.published ? "online" : ""
                }`}
              >
                <div>
                  {publishedState?.published ? <CheckCircle2 /> : <Send />}
                  <span>
                    <strong>
                      {publishedState?.published
                        ? "Formulário publicado"
                        : "Formulário em rascunho"}
                    </strong>
                    <small>
                      {publishedState?.published
                        ? `Atualizado em ${formatDate(publishedState.updatedAt)}`
                        : "Publique para liberar o link e a incorporação."}
                    </small>
                  </span>
                </div>
                {publishedState?.published ? (
                  <button
                    className="btn ghost"
                    disabled={publishing}
                    onClick={unpublishForm}
                  >
                    Despublicar
                  </button>
                ) : (
                  <button
                    className="btn primary"
                    disabled={publishing}
                    onClick={publishForm}
                  >
                    <Send /> {publishing ? "Publicando..." : "Publicar agora"}
                  </button>
                )}
              </section>

              <section className="panel public-form-share">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">LINK PÚBLICO</span>
                    <h3>Compartilhar diretamente</h3>
                  </div>
                  <Link2 />
                </div>
                <div className="public-form-copy-row">
                  <input readOnly value={formUrl} />
                  <button
                    className="btn ghost"
                    onClick={() => copy(formUrl, "Link copiado")}
                  >
                    <ClipboardCopy /> Copiar
                  </button>
                  {publishedState?.published && (
                    <a
                      className="btn ghost"
                      href={formUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink /> Abrir
                    </a>
                  )}
                </div>
              </section>

              <section className="panel public-form-share">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">INCORPORAR</span>
                    <h3>Colocar em qualquer site</h3>
                  </div>
                  <Code2 />
                </div>
                <textarea readOnly rows={5} value={embedCode} />
                <button
                  className="btn ghost"
                  onClick={() => copy(embedCode, "Código de incorporação copiado")}
                >
                  <ClipboardCopy /> Copiar código
                </button>
              </section>

              {publishedState?.published && (
                <section className="panel public-form-preview">
                  <h3>Prévia publicada</h3>
                  <iframe src={formUrl} title={`Prévia de ${selected.title}`} />
                </section>
              )}
            </div>
          )}

          {tab === "submissions" && (
            <div className="public-form-submissions">
              <div className="public-form-response-head">
                <div className="public-form-response-metrics">
                  <article>
                    <span>Respostas</span>
                    <strong>{responseStats.total}</strong>
                  </article>
                  <article>
                    <span>Convertidas</span>
                    <strong>{responseStats.converted}</strong>
                  </article>
                  <article>
                    <span>Assinadas</span>
                    <strong>{responseStats.signed}</strong>
                  </article>
                  <article>
                    <span>Pagamento informado</span>
                    <strong>{responseStats.paid}</strong>
                  </article>
                </div>
                <button
                  className="btn ghost"
                  disabled={loading}
                  onClick={loadSubmissions}
                >
                  <RefreshCw /> {loading ? "Atualizando..." : "Atualizar"}
                </button>
              </div>

              {submissions.length === 0 && !loading ? (
                <section className="panel public-form-empty">
                  <FileUp />
                  <h3>Nenhuma resposta ainda</h3>
                  <p>
                    Publique o formulário e compartilhe o link. As respostas
                    aparecerão aqui sem ocupar o espaço de sincronização.
                  </p>
                </section>
              ) : (
                <div className="public-form-response-list">
                  {submissions.map((submission) => (
                    <details key={submission.id} className="panel">
                      <summary>
                        <span>
                          <strong>
                            {submission.contact.name || "Resposta sem nome"}
                          </strong>
                          <small>
                            {submission.protocol} ·{" "}
                            {formatDate(submission.submittedAt)}
                          </small>
                        </span>
                        <span className="public-form-response-tags">
                          <b>{destinationLabel(submission.destination)}</b>
                          <b className={submission.conversionStatus}>
                            {submission.conversionStatus === "completed"
                              ? "Convertida"
                              : submission.conversionStatus === "failed"
                                ? "Conversão pendente"
                                : "Recebida"}
                          </b>
                        </span>
                      </summary>
                      <div className="public-form-response-detail">
                        <div className="public-form-contact-line">
                          {submission.contact.email && (
                            <a href={`mailto:${submission.contact.email}`}>
                              {submission.contact.email}
                            </a>
                          )}
                          {submission.contact.phone && (
                            <a href={`tel:${submission.contact.phone}`}>
                              {submission.contact.phone}
                            </a>
                          )}
                        </div>
                        <dl>
                          {selected.fields
                            .filter(
                              (field) =>
                                field.type !== "file" &&
                                submission.values?.[field.id] !== undefined,
                            )
                            .map((field) => (
                              <div key={field.id}>
                                <dt>{field.label}</dt>
                                <dd>
                                  {Array.isArray(submission.values[field.id])
                                    ? submission.values[field.id].join(", ")
                                    : submission.values[field.id] === true
                                      ? "Sim"
                                      : submission.values[field.id] === false
                                        ? "Não"
                                        : String(
                                            submission.values[field.id] || "—",
                                          )}
                                </dd>
                              </div>
                            ))}
                        </dl>
                        {submission.attachments.length > 0 && (
                          <div className="public-form-files">
                            <strong>Anexos</strong>
                            {submission.attachments.map((attachment) => (
                              <button
                                key={attachment.id}
                                onClick={() =>
                                  downloadAttachment(submission, attachment)
                                }
                              >
                                <Download />
                                <span>
                                  {attachment.name}
                                  <small>
                                    {Math.ceil(attachment.size / 1024)} KB
                                  </small>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {(submission.signature?.consent ||
                          submission.payment?.acknowledged) && (
                          <div className="public-form-proof-row">
                            {submission.signature?.consent && (
                              <span>
                                <FileSignature /> Assinado por{" "}
                                {submission.signature.name}
                              </span>
                            )}
                            {submission.payment?.acknowledged && (
                              <span>
                                <CreditCard /> Pagamento informado pela pessoa
                              </span>
                            )}
                          </div>
                        )}
                        {submission.conversionError && (
                          <p className="public-form-conversion-error">
                            {submission.conversionError}
                          </p>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
