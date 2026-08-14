import { useState } from "react";
import {
  CalendarDays,
  Database,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  uid,
  today,
  DB_FIELD_TYPES,
  coerceCellValue,
  formatCellValue,
  kanbanColumns,
  recordLabel,
  groupRowsByDate,
  monthMatrix,
  evalFormula,
} from "../../domain.js";
import {
  appendRecordComment,
  computedDatabaseValue,
  createDatabaseRecord,
  relationIds,
  relationLabels,
  removeRecordAndReferences,
  updateRelation,
} from "./relational.js";
import Modal from "../../components/Modal.jsx";
import { Field } from "../../components/ui.jsx";
import { AttachmentList, addAttachmentsFromFiles } from "../../components/Anexos.jsx";

const DB_TEMPLATES = [
  {
    name: "Clientes",
    fields: [
      { name: "Nome", type: "text" },
      { name: "Telefone", type: "text" },
      { name: "Cidade", type: "text" },
      { name: "Status", type: "select", options: ["Novo", "Ativo", "Inativo"] },
    ],
  },
  {
    name: "Estoque",
    fields: [
      { name: "Produto", type: "text" },
      { name: "Quantidade", type: "number" },
      { name: "Preço", type: "number" },
      { name: "Repor?", type: "checkbox" },
    ],
  },
  {
    name: "Projetos",
    fields: [
      { name: "Projeto", type: "text" },
      { name: "Responsável", type: "text" },
      { name: "Prazo", type: "date" },
      { name: "Etapa", type: "select", options: ["A fazer", "Fazendo", "Feito"] },
    ],
  },
];

const dbNewField = (name, type, options) => ({
  id: uid(),
  name: name || "Campo",
  type: type || "text",
  options: type === "select" ? options || [] : undefined,
});
const dbMakeBase = (name, template, ctx = {}) => ({
  id: uid(),
  name: name || template?.name || "Nova base",
  fields: (template?.fields || [{ name: "Nome", type: "text" }]).map((f) =>
    dbNewField(f.name, f.type, f.options),
  ),
  rows: [],
  businessId: ctx.businessId || null,
  ownerId: ctx.ownerId || null,
  createdAt: new Date().toISOString(),
});

function DbCell({ field, value, onChange, bases }) {
  if (field.type === "checkbox")
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={field.name}
      />
    );
  if (field.type === "relation") {
    const target = (bases || []).find((b) => b.id === field.targetBaseId);
    if (field.multiple !== false)
      return (
        <select
          multiple
          value={relationIds(value)}
          onChange={(e) =>
            onChange([...e.target.selectedOptions].map((option) => option.value))
          }
          aria-label={field.name}
          className="db-relation-multiple"
        >
          {(target?.rows || []).map((r) => (
            <option key={r.id} value={r.id}>
              {recordLabel(target, r.id) || "(sem título)"}
            </option>
          ))}
        </select>
      );
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.name}
      >
        <option value="">—</option>
        {(target?.rows || []).map((r) => (
          <option key={r.id} value={r.id}>
            {recordLabel(target, r.id) || "(sem título)"}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "select")
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.name}
      >
        <option value="">—</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  if (field.type === "multiselect")
    return (
      <input
        value={Array.isArray(value) ? value.join(", ") : value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.name}
        placeholder="Separe por vírgulas"
      />
    );
  if (field.type === "longtext")
    return (
      <textarea
        rows={1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.name}
      />
    );
  return (
    <input
      type={
        ["number", "currency", "percent"].includes(field.type)
          ? "number"
          : field.type === "date"
            ? "date"
            : field.type === "datetime"
              ? "datetime-local"
              : field.type === "email"
                ? "email"
                : field.type === "url"
                  ? "url"
                  : field.type === "phone"
                    ? "tel"
                    : "text"
      }
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label={field.name}
    />
  );
}

function DataBases({ db, update, business, setToast, excludedTemplates = [] }) {
  const bases = (db.databases || []).filter(
    (b) => !business || b.businessId === business.id,
  );
  const availableTemplates = DB_TEMPLATES.filter(
    (template) => !excludedTemplates.includes(template.name),
  );
  const [selectedId, setSelectedId] = useState(bases[0]?.id || null);
  const [view, setView] = useState("table");
  const [kanbanFieldId, setKanbanFieldId] = useState(null);
  const [calFieldId, setCalFieldId] = useState(null);
  const [calMonth, setCalMonth] = useState(today().slice(0, 7));
  const [fieldModal, setFieldModal] = useState(null); // {mode, id?, name, type, options, targetBaseId}
  const [newBaseName, setNewBaseName] = useState("");
  const [recordPageId, setRecordPageId] = useState(null);
  const [recordComment, setRecordComment] = useState("");

  const selected = bases.find((b) => b.id === selectedId) || bases[0] || null;
  const selectFields = (selected?.fields || []).filter((f) => f.type === "select");
  const dateFields = (selected?.fields || []).filter((f) => f.type === "date");
  const activeKanbanField =
    kanbanFieldId && selectFields.some((f) => f.id === kanbanFieldId)
      ? kanbanFieldId
      : selectFields[0]?.id || null;
  const activeCalField =
    calFieldId && dateFields.some((f) => f.id === calFieldId)
      ? calFieldId
      : dateFields[0]?.id || null;
  const rowNumericValues = (row) => {
    const map = {};
    for (const f of selected?.fields || []) {
      if (f.type === "formula") continue;
      map[f.name] =
        Number(String(row?.cells?.[f.id] ?? "").replace(",", ".")) || 0;
    }
    return map;
  };
  const formulaResult = (f, row) => {
    const r = evalFormula(f.formula, rowNumericValues(row));
    return r === "" ? "" : formatCellValue("number", r);
  };
  const displayCell = (f, row) => {
    if (f.type === "formula") return formulaResult(f, row);
    if (["lookup", "rollup"].includes(f.type)) {
      const computed = computedDatabaseValue(bases, selected, row, f);
      return Array.isArray(computed)
        ? computed.map((value) => formatCellValue("text", value)).join(", ")
        : formatCellValue("number", computed);
    }
    const value = row?.cells?.[f.id];
    if (f.type === "relation")
      return relationLabels(bases, f, value).join(", ");
    return formatCellValue(f.type, value);
  };

  const patchBase = (id, updater) =>
    update((prev) => ({
      ...prev,
      databases: (prev.databases || []).map((b) => (b.id === id ? updater(b) : b)),
    }));

  const createBase = (template) => {
    const base = dbMakeBase(newBaseName.trim() || template?.name, template, {
      businessId: business?.id,
      ownerId: db.user.id,
    });
    update((prev) => ({ ...prev, databases: [base, ...(prev.databases || [])] }));
    setSelectedId(base.id);
    setView("table");
    setNewBaseName("");
    setToast("Base criada");
  };
  const renameBase = (id, name) => patchBase(id, (b) => ({ ...b, name }));
  const deleteBase = (id) => {
    if (!window.confirm("Excluir esta base e todos os seus dados?")) return;
    update((prev) => ({
      ...prev,
      databases: (prev.databases || []).filter((b) => b.id !== id),
    }));
    setSelectedId(bases.find((b) => b.id !== id)?.id || null);
    setToast("Base excluída");
  };
  const addRow = () => {
    const row = createDatabaseRecord(uid());
    patchBase(selected.id, (b) => ({ ...b, rows: [...b.rows, row] }));
  };
  const updateCell = (rowId, field, raw) =>
    field.type === "relation"
      ? update((prev) => ({
          ...prev,
          databases: updateRelation(prev.databases || [], {
            baseId: selected.id,
            rowId,
            fieldId: field.id,
            value: raw,
          }),
        }))
      : patchBase(selected.id, (b) => ({
          ...b,
          rows: b.rows.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  cells: {
                    ...r.cells,
                    [field.id]: coerceCellValue(field.type, raw),
                  },
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        }));
  const deleteRow = (rowId) =>
    update((prev) => ({
      ...prev,
      databases: removeRecordAndReferences(prev.databases || [], selected.id, rowId),
    }));

  const patchRecord = (rowId, patch) =>
    patchBase(selected.id, (base) => ({
      ...base,
      rows: base.rows.map((row) =>
        row.id === rowId
          ? { ...row, ...patch, updatedAt: new Date().toISOString() }
          : row,
      ),
    }));

  const addRecordComment = () => {
    const text = recordComment.trim();
    if (!text) return;
    patchBase(selected.id, (base) => ({
      ...base,
      rows: base.rows.map((row) =>
        row.id === recordPageId
          ? appendRecordComment(row, {
              id: uid(),
              text,
              authorId: db.user?.id,
              authorName: db.user?.name,
            })
          : row,
      ),
    }));
    setRecordComment("");
  };

  const saveField = () => {
    const name = fieldModal.name.trim();
    if (!name) return;
    const options =
      fieldModal.type === "select"
        ? (fieldModal.options || "")
            .split(/[\n,]/)
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;
    const targetBaseId =
      fieldModal.type === "relation" ? fieldModal.targetBaseId || "" : undefined;
    const multiple =
      fieldModal.type === "relation" ? fieldModal.multiple !== false : undefined;
    const reciprocalFieldId =
      fieldModal.type === "relation"
        ? fieldModal.reciprocalFieldId || ""
        : undefined;
    const relationFieldId = ["lookup", "rollup"].includes(fieldModal.type)
      ? fieldModal.relationFieldId || ""
      : undefined;
    const targetFieldId = ["lookup", "rollup"].includes(fieldModal.type)
      ? fieldModal.targetFieldId || ""
      : undefined;
    const rollupOperation =
      fieldModal.type === "rollup" ? fieldModal.rollupOperation || "count" : undefined;
    const formula =
      fieldModal.type === "formula" ? fieldModal.formula || "" : undefined;
    if (fieldModal.mode === "edit") {
      patchBase(selected.id, (b) => ({
        ...b,
        fields: b.fields.map((f) =>
          f.id === fieldModal.id
            ? {
                ...f,
                name,
                type: fieldModal.type,
                options,
                targetBaseId,
                multiple,
                reciprocalFieldId,
                relationFieldId,
                targetFieldId,
                rollupOperation,
                formula,
              }
            : f,
        ),
      }));
    } else {
      patchBase(selected.id, (b) => ({
        ...b,
        fields: [
          ...b.fields,
          {
            ...dbNewField(name, fieldModal.type, options),
            targetBaseId,
            multiple,
            reciprocalFieldId,
            relationFieldId,
            targetFieldId,
            rollupOperation,
            formula,
          },
        ],
      }));
    }
    setFieldModal(null);
  };
  const deleteField = (fieldId) => {
    if (!window.confirm("Excluir esta coluna?")) return;
    patchBase(selected.id, (b) => ({
      ...b,
      fields: b.fields.filter((f) => f.id !== fieldId),
      rows: b.rows.map((r) => {
        const cells = { ...r.cells };
        delete cells[fieldId];
        return { ...r, cells };
      }),
    }));
  };

  if (bases.length === 0) {
    return (
      <div className="page databases-page">
        <header className="page-head">
          <div>
            <h1>Meus dados</h1>
            <p className="page-sub">
              Crie bases relacionais com registros completos, campos calculados e
              visualizações diferentes sobre os mesmos dados.
            </p>
          </div>
        </header>
        <div className="card db-starter">
          <h3>Comece com um modelo</h3>
          <div className="db-template-grid">
            {availableTemplates.map((t) => (
              <button key={t.name} className="template-card" onClick={() => createBase(t)}>
                <span className="template-card-type">Modelo</span>
                <strong>{t.name}</strong>
                <span className="template-card-seg">
                  {t.fields.map((f) => f.name).join(", ")}
                </span>
              </button>
            ))}
            <button className="template-card" onClick={() => createBase(null)}>
              <span className="template-card-type">Vazia</span>
              <strong>Base em branco</strong>
              <span className="template-card-seg">Comece do zero</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page databases-page">
      <header className="page-head">
        <div>
          <h1>Meus dados</h1>
          <p className="page-sub">
            Suas bases de dados: tabelas, campos personalizados e visões.
          </p>
        </div>
      </header>

      <div className="db-layout">
        <aside className="db-sidebar">
          <div className="db-sidebar-head">
            <span>Bases</span>
          </div>
          <ul className="db-base-list">
            {bases.map((b) => (
              <li key={b.id}>
                <button
                  className={`db-base-item ${b.id === selected?.id ? "active" : ""}`}
                  onClick={() => setSelectedId(b.id)}
                >
                  <Database size={15} /> {b.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="db-new-base">
            <input
              value={newBaseName}
              onChange={(e) => setNewBaseName(e.target.value)}
              placeholder="Nome da nova base"
            />
            <button className="btn ghost sm" onClick={() => createBase(null)}>
              <Plus size={15} /> Criar
            </button>
          </div>
        </aside>

        {selected && (
          <section className="db-main">
            <div className="db-toolbar">
              <input
                className="db-base-name"
                value={selected.name}
                onChange={(e) => renameBase(selected.id, e.target.value)}
                aria-label="Nome da base"
              />
              <div className="db-views">
                {[
                  ["table", "Tabela"],
                  ["gallery", "Galeria"],
                  ["kanban", "Quadro"],
                  ["calendar", "Calendário"],
                ].map(([v, label]) => (
                  <button
                    key={v}
                    className={`db-view-btn ${view === v ? "active" : ""}`}
                    onClick={() => setView(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="db-toolbar-actions">
                <button className="btn ghost sm" onClick={addRow}>
                  <Plus size={15} /> Registro
                </button>
                <button
                  className="btn ghost sm"
                  onClick={() =>
                    setFieldModal({ mode: "add", name: "", type: "text", options: "" })
                  }
                >
                  <Plus size={15} /> Campo
                </button>
                <button
                  className="btn ghost sm danger"
                  onClick={() => deleteBase(selected.id)}
                  title="Excluir base"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {view === "table" && (
              <div className="db-scroll">
                <table className="db-table">
                  <thead>
                    <tr>
                      {selected.fields.map((f) => (
                        <th key={f.id}>
                          <button
                            className="db-field-head"
                            onClick={() =>
                              setFieldModal({
                                mode: "edit",
                                id: f.id,
                                name: f.name,
                                type: f.type,
                                options: (f.options || []).join(", "),
                                targetBaseId: f.targetBaseId || "",
                                multiple: f.multiple !== false,
                                reciprocalFieldId: f.reciprocalFieldId || "",
                                relationFieldId: f.relationFieldId || "",
                                targetFieldId: f.targetFieldId || "",
                                rollupOperation: f.rollupOperation || "count",
                                formula: f.formula || "",
                              })
                            }
                            title="Editar campo"
                          >
                            {f.name}
                          </button>
                        </th>
                      ))}
                      <th className="db-rowactions" aria-hidden="true"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.map((row) => (
                      <tr key={row.id}>
                        {selected.fields.map((f) => (
                          <td key={f.id}>
                            {["formula", "lookup", "rollup"].includes(f.type) ? (
                              <span className="db-formula-cell">
                                {displayCell(f, row) || "—"}
                              </span>
                            ) : (
                              <DbCell
                                field={f}
                                value={row.cells?.[f.id]}
                                onChange={(v) => updateCell(row.id, f, v)}
                                bases={bases}
                              />
                            )}
                          </td>
                        ))}
                        <td className="db-rowactions">
                          <button
                            className="sheet-row-del"
                            onClick={() => setRecordPageId(row.id)}
                            title="Abrir página do registro"
                            aria-label="Abrir página do registro"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            className="sheet-row-del"
                            onClick={() => deleteRow(row.id)}
                            title="Excluir registro"
                          >
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selected.rows.length === 0 && (
                  <p className="db-empty-hint">
                    Sem registros. Use “+ Registro” para começar.
                  </p>
                )}
              </div>
            )}

            {view === "gallery" && (
              <div className="db-gallery">
                {selected.rows.map((row) => (
                  <article key={row.id} className="card db-card">
                    <button
                      className="db-card-open"
                      onClick={() => setRecordPageId(row.id)}
                    >
                      Abrir página
                    </button>
                    {selected.fields.map((f) => (
                      <div key={f.id} className="db-card-row">
                        <span className="db-card-label">{f.name}</span>
                        <span className="db-card-value">
                          {displayCell(f, row) || "—"}
                        </span>
                      </div>
                    ))}
                    <button
                      className="btn ghost sm danger db-card-del"
                      onClick={() => deleteRow(row.id)}
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </article>
                ))}
                {selected.rows.length === 0 && (
                  <p className="db-empty-hint">Sem registros ainda.</p>
                )}
              </div>
            )}

            {view === "kanban" &&
              (activeKanbanField ? (
                <>
                  <div className="db-kanban-pick">
                    <span>Agrupar por: </span>
                    <select
                      value={activeKanbanField}
                      onChange={(e) => setKanbanFieldId(e.target.value)}
                      aria-label="Agrupar por"
                    >
                      {selectFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="db-kanban">
                    {kanbanColumns(selected, activeKanbanField).map((col) => {
                      const titleField =
                        selected.fields.find((f) => f.type !== "select") ||
                        selected.fields[0];
                      return (
                        <div key={col.key} className="db-kanban-col">
                          <h4>
                            {col.key} <span>{col.rows.length}</span>
                          </h4>
                          {col.rows.map((row) => (
                            <div key={row.id} className="db-kanban-card">
                              <span>
                                {formatCellValue(
                                  titleField?.type,
                                  row.cells?.[titleField?.id],
                                ) || "Registro"}
                              </span>
                              <select
                                value={row.cells?.[activeKanbanField] ?? ""}
                                onChange={(e) =>
                                  updateCell(
                                    row.id,
                                    selected.fields.find((f) => f.id === activeKanbanField),
                                    e.target.value,
                                  )
                                }
                                aria-label="Mover"
                              >
                                <option value="">—</option>
                                {(
                                  selected.fields.find((f) => f.id === activeKanbanField)
                                    ?.options || []
                                ).map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Database />
                  <h3>Crie um campo de seleção</h3>
                  <p>
                    O quadro agrupa por um campo do tipo “Seleção” (ex.: Status,
                    Etapa). Adicione um em “+ Campo”.
                  </p>
                </div>
              ))}

            {view === "calendar" &&
              (activeCalField ? (
                (() => {
                  const groups = groupRowsByDate(selected.rows, activeCalField);
                  const titleField =
                    selected.fields.find((f) => f.type !== "date") ||
                    selected.fields[0];
                  const [cy, cm] = calMonth.split("-").map(Number);
                  const shift = (delta) =>
                    setCalMonth(
                      new Date(Date.UTC(cy, cm - 1 + delta, 1))
                        .toISOString()
                        .slice(0, 7),
                    );
                  const monthLabel = new Date(
                    `${calMonth}-01T12:00:00`,
                  ).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  });
                  return (
                    <>
                      <div className="db-cal-head">
                        <span>Datas por: </span>
                        <select
                          value={activeCalField}
                          onChange={(e) => setCalFieldId(e.target.value)}
                          aria-label="Campo de data"
                        >
                          {dateFields.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <div className="db-cal-nav">
                          <button className="btn ghost sm" onClick={() => shift(-1)}>
                            ‹
                          </button>
                          <strong>{monthLabel}</strong>
                          <button className="btn ghost sm" onClick={() => shift(1)}>
                            ›
                          </button>
                        </div>
                      </div>
                      <div className="db-cal-grid">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                          (d) => (
                            <div key={d} className="db-cal-dow">
                              {d}
                            </div>
                          ),
                        )}
                        {monthMatrix(calMonth)
                          .flat()
                          .map((cell) => (
                            <div
                              key={cell.date}
                              className={`db-cal-cell ${cell.inMonth ? "" : "out"}`}
                            >
                              <span className="db-cal-daynum">
                                {Number(cell.date.slice(8, 10))}
                              </span>
                              {(groups[cell.date] || []).map((row) => (
                                <div key={row.id} className="db-cal-event">
                                  {displayCell(titleField, row) || "Registro"}
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="empty-state">
                  <CalendarDays />
                  <h3>Crie um campo de data</h3>
                  <p>
                    O calendário posiciona os registros por um campo do tipo
                    “Data”. Adicione um em “+ Campo”.
                  </p>
                </div>
              ))}
          </section>
        )}
      </div>

      {fieldModal && (
        <Modal
          title={fieldModal.mode === "edit" ? "Editar campo" : "Novo campo"}
          onClose={() => setFieldModal(null)}
        >
          <div className="modal-body">
            <Field label="Nome do campo">
              <input
                value={fieldModal.name}
                onChange={(e) => setFieldModal((m) => ({ ...m, name: e.target.value }))}
                autoFocus
              />
            </Field>
            <Field label="Tipo">
              <select
                value={fieldModal.type}
                onChange={(e) => setFieldModal((m) => ({ ...m, type: e.target.value }))}
              >
                {DB_FIELD_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            {fieldModal.type === "select" && (
              <Field label="Opções (uma por linha ou separadas por vírgula)">
                <textarea
                  rows={3}
                  value={fieldModal.options}
                  onChange={(e) =>
                    setFieldModal((m) => ({ ...m, options: e.target.value }))
                  }
                  placeholder={"Novo\nAtivo\nInativo"}
                />
              </Field>
            )}
            {fieldModal.type === "relation" && (
              <>
                <Field label="Base relacionada">
                  <select
                    value={fieldModal.targetBaseId || ""}
                    onChange={(e) =>
                      setFieldModal((m) => ({
                        ...m,
                        targetBaseId: e.target.value,
                        reciprocalFieldId: "",
                      }))
                    }
                  >
                    <option value="">Escolha uma base...</option>
                    {bases.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={fieldModal.multiple !== false}
                    onChange={(e) =>
                      setFieldModal((m) => ({ ...m, multiple: e.target.checked }))
                    }
                  />
                  Permitir vários registros
                </label>
                <Field label="Campo inverso (relação bidirecional)">
                  <select
                    value={fieldModal.reciprocalFieldId || ""}
                    onChange={(e) =>
                      setFieldModal((m) => ({
                        ...m,
                        reciprocalFieldId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Sem sincronização inversa</option>
                    {(
                      bases.find((base) => base.id === fieldModal.targetBaseId)
                        ?.fields || []
                    )
                      .filter(
                        (field) =>
                          field.type === "relation" &&
                          field.targetBaseId === selected.id,
                      )
                      .map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </>
            )}
            {["lookup", "rollup"].includes(fieldModal.type) && (
              <>
                <Field label="Relação de origem">
                  <select
                    value={fieldModal.relationFieldId || ""}
                    onChange={(e) =>
                      setFieldModal((m) => ({
                        ...m,
                        relationFieldId: e.target.value,
                        targetFieldId: "",
                      }))
                    }
                  >
                    <option value="">Escolha uma relação...</option>
                    {selected.fields
                      .filter((field) => field.type === "relation")
                      .map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Campo da base relacionada">
                  <select
                    value={fieldModal.targetFieldId || ""}
                    onChange={(e) =>
                      setFieldModal((m) => ({
                        ...m,
                        targetFieldId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Escolha um campo...</option>
                    {(
                      bases.find(
                        (base) =>
                          base.id ===
                          selected.fields.find(
                            (field) => field.id === fieldModal.relationFieldId,
                          )?.targetBaseId,
                      )?.fields || []
                    ).map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {fieldModal.type === "rollup" && (
                  <Field label="Cálculo">
                    <select
                      value={fieldModal.rollupOperation || "count"}
                      onChange={(e) =>
                        setFieldModal((m) => ({
                          ...m,
                          rollupOperation: e.target.value,
                        }))
                      }
                    >
                      <option value="count">Contar valores</option>
                      <option value="count_unique">Contar únicos</option>
                      <option value="sum">Somar</option>
                      <option value="average">Média</option>
                      <option value="min">Mínimo</option>
                      <option value="max">Máximo</option>
                      <option value="join">Combinar textos</option>
                    </select>
                  </Field>
                )}
              </>
            )}
            {fieldModal.type === "formula" && (
              <>
                <Field label="Fórmula (use + − * / e nomes de campos)">
                  <input
                    value={fieldModal.formula || ""}
                    onChange={(e) =>
                      setFieldModal((m) => ({ ...m, formula: e.target.value }))
                    }
                    placeholder="Ex.: Preço * Quantidade"
                  />
                </Field>
                <div className="merge-fields">
                  <span>Inserir campo:</span>
                  {(selected?.fields || [])
                    .filter((f) => f.type !== "formula" && f.id !== fieldModal.id)
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="chip-btn"
                        onClick={() =>
                          setFieldModal((m) => ({
                            ...m,
                            formula: `${m.formula || ""}${f.name}`,
                          }))
                        }
                      >
                        {f.name}
                      </button>
                    ))}
                </div>
              </>
            )}
            <div className="form-actions">
              {fieldModal.mode === "edit" && (
                <button
                  className="btn ghost danger"
                  onClick={() => {
                    deleteField(fieldModal.id);
                    setFieldModal(null);
                  }}
                >
                  <Trash2 size={16} /> Excluir campo
                </button>
              )}
              <button className="btn primary" onClick={saveField}>
                Salvar campo
              </button>
            </div>
          </div>
        </Modal>
      )}

      {recordPageId &&
        (() => {
          const row = selected?.rows?.find((item) => item.id === recordPageId);
          if (!row) return null;
          return (
            <Modal
              title={recordLabel(selected, row.id) || "Página do registro"}
              onClose={() => setRecordPageId(null)}
            >
              <div className="modal-body db-record-page">
                <div className="db-record-properties">
                  {selected.fields.map((field) => (
                    <div key={field.id} className="db-record-property">
                      <span>{field.name}</span>
                      {["formula", "lookup", "rollup"].includes(field.type) ? (
                        <strong>{displayCell(field, row) || "—"}</strong>
                      ) : (
                        <DbCell
                          field={field}
                          value={row.cells?.[field.id]}
                          onChange={(value) => updateCell(row.id, field, value)}
                          bases={bases}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <Field label="Conteúdo do registro">
                  <textarea
                    rows={9}
                    value={row.content || ""}
                    onChange={(e) => patchRecord(row.id, { content: e.target.value })}
                    placeholder="Escreva contexto, decisões, instruções e informações detalhadas..."
                  />
                </Field>
                <section className="db-record-attachments">
                  <div>
                    <h4>Anexos</h4>
                    <label className="btn ghost sm">
                      <Upload size={15} /> Adicionar arquivos
                      <input
                        type="file"
                        multiple
                        hidden
                        onChange={async (event) => {
                          const attachments = await addAttachmentsFromFiles(
                            event.target.files,
                            row.attachments,
                            setToast,
                          );
                          patchRecord(row.id, { attachments });
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <AttachmentList
                    attachments={row.attachments}
                    onRemove={(attachmentId) =>
                      patchRecord(row.id, {
                        attachments: (row.attachments || []).filter(
                          (attachment) => attachment.id !== attachmentId,
                        ),
                      })
                    }
                  />
                </section>
                <section className="db-record-comments">
                  <h4>Comentários</h4>
                  {(row.comments || []).map((comment) => (
                    <article key={comment.id}>
                      <strong>{comment.authorName || "Usuário"}</strong>
                      <p>{comment.text}</p>
                    </article>
                  ))}
                  <div className="db-record-comment-form">
                    <input
                      value={recordComment}
                      onChange={(e) => setRecordComment(e.target.value)}
                      placeholder="Adicionar comentário"
                      aria-label="Adicionar comentário"
                    />
                    <button className="btn primary sm" onClick={addRecordComment}>
                      Comentar
                    </button>
                  </div>
                </section>
                <small className="db-record-meta">
                  Criado em{" "}
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleString("pt-BR")
                    : "data não registrada"}
                  {row.updatedAt
                    ? ` · Atualizado em ${new Date(row.updatedAt).toLocaleString("pt-BR")}`
                    : ""}
                </small>
              </div>
            </Modal>
          );
        })()}
    </div>
  );
}

export default DataBases;
