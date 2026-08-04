import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckSquare,
  ChevronDown,
  Code2,
  Columns3,
  Copy,
  Database,
  FileText,
  FormInput,
  Heading,
  Image,
  LayoutList,
  Link2,
  List,
  ListOrdered,
  MessageSquareQuote,
  Plus,
  Table2,
  Text,
  Trash2,
  Video,
} from "lucide-react";
import {
  createDocumentBlock,
  DOCUMENT_BLOCK_TYPES,
  DOCUMENT_BLOCK_TYPE_LABELS,
  documentBlockStats,
  normalizeDocumentBlock,
  normalizeDocumentBlocks,
} from "./blockDocumentDomain.js";

const typeIcon = {
  paragraph: Text,
  heading: Heading,
  bulletedList: List,
  numberedList: ListOrdered,
  checklist: CheckSquare,
  callout: MessageSquareQuote,
  toggle: ChevronDown,
  code: Code2,
  table: Table2,
  chart: BarChart3,
  columns: Columns3,
  image: Image,
  video: Video,
  file: FileText,
  database: Database,
  tasks: LayoutList,
  form: FormInput,
  synced: Link2,
};

const lines = (value) =>
  String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const findById = (items, id) =>
  (Array.isArray(items) ? items : []).find((item) => item?.id === id);

const databaseCell = (row, field) => {
  const value = row?.cells?.[field.id];
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value ?? "");
};

function BlockChart({ block }) {
  const values = block.values || [];
  const labels = block.labels || [];
  const max = Math.max(...values.map((value) => Math.abs(Number(value) || 0)), 1);
  if (block.chartType === "pie") {
    const total = values.reduce(
      (sum, value) => sum + Math.max(0, Number(value) || 0),
      0,
    );
    let cursor = 0;
    const colors = ["#0b9f8f", "#16b8a6", "#087a83", "#17a673", "#6df7d7"];
    const gradient = total
      ? values
          .map((value, index) => {
            const start = cursor;
            cursor += (Math.max(0, Number(value) || 0) / total) * 100;
            return `${colors[index % colors.length]} ${start}% ${cursor}%`;
          })
          .join(",")
      : "#e8e4f2 0 100%";
    return (
      <div className="block-chart-pie">
        <span style={{ background: `conic-gradient(${gradient})` }} />
        <ul>
          {labels.map((label, index) => (
            <li key={`${label}-${index}`}>
              <i style={{ background: colors[index % colors.length] }} />
              <span>{label}</span>
              <strong>{values[index] || 0}</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (block.chartType === "line") {
    const points = values
      .map((value, index) => {
        const x = values.length <= 1 ? 50 : (index / (values.length - 1)) * 100;
        const y = 92 - (Math.max(0, Number(value) || 0) / max) * 82;
        return `${x},${y}`;
      })
      .join(" ");
    return (
      <div className="block-chart-line">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
          <polyline points={points} />
          {values.map((value, index) => {
            const x =
              values.length <= 1 ? 50 : (index / (values.length - 1)) * 100;
            const y = 92 - (Math.max(0, Number(value) || 0) / max) * 82;
            return <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />;
          })}
        </svg>
        <div>
          {labels.map((label, index) => (
            <small key={`${label}-${index}`}>{label}</small>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="block-chart-bars">
      {labels.map((label, index) => (
        <div key={`${label}-${index}`}>
          <strong>{values[index] || 0}</strong>
          <span>
            <i
              style={{
                height: `${Math.max(
                  2,
                  (Math.abs(Number(values[index]) || 0) / max) * 100,
                )}%`,
                background: block.color,
              }}
            />
          </span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

export function DocumentBlockPreview({ block: rawBlock, db = {}, syncedBlocks = [] }) {
  const block = normalizeDocumentBlock(rawBlock);
  if (block.type === "paragraph")
    return <p className="block-preview-paragraph">{block.text || "Texto vazio"}</p>;
  if (block.type === "heading") {
    const Tag = `h${block.level}`;
    return <Tag>{block.text || "Título sem texto"}</Tag>;
  }
  if (block.type === "bulletedList")
    return (
      <ul>
        {block.items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  if (block.type === "numberedList")
    return (
      <ol>
        {block.items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ol>
    );
  if (block.type === "checklist")
    return (
      <div className="block-preview-checklist">
        {block.items.map((item) => (
          <label key={item.id}>
            <input type="checkbox" checked={item.done} readOnly />
            <span>{item.text}</span>
          </label>
        ))}
      </div>
    );
  if (block.type === "callout")
    return (
      <aside className={`block-preview-callout ${block.tone}`}>
        <span>{block.icon}</span>
        <p>{block.text || "Destaque vazio"}</p>
      </aside>
    );
  if (block.type === "toggle")
    return (
      <details className="block-preview-toggle">
        <summary>{block.title}</summary>
        <p>{block.content || "Sem conteúdo adicional."}</p>
      </details>
    );
  if (block.type === "code")
    return (
      <div className="block-preview-code">
        <span>{block.language}</span>
        <pre>
          <code>{block.code || "// Insira o código"}</code>
        </pre>
      </div>
    );
  if (block.type === "table")
    return (
      <div className="block-preview-table">
        <table>
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {block.columns.map((_, columnIndex) => (
                  <td key={columnIndex}>{row[columnIndex]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (block.type === "chart")
    return (
      <figure className="block-preview-chart">
        <figcaption>{block.title}</figcaption>
        <BlockChart block={block} />
      </figure>
    );
  if (block.type === "columns")
    return (
      <div
        className="block-preview-columns"
        style={{ gridTemplateColumns: `repeat(${block.columns.length}, minmax(0, 1fr))` }}
      >
        {block.columns.map((column) => (
          <section key={column.id}>
            {column.title && <strong>{column.title}</strong>}
            <p>{column.content || "Coluna vazia"}</p>
          </section>
        ))}
      </div>
    );
  if (block.type === "image")
    return block.url ? (
      <figure className="block-preview-media">
        <img src={block.url} alt={block.alt || block.caption || ""} />
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    ) : (
      <div className="block-preview-missing">
        <Image /> Informe uma URL HTTPS para exibir a imagem.
      </div>
    );
  if (block.type === "video")
    return block.url ? (
      <figure className="block-preview-media video">
        <a href={block.url} target="_blank" rel="noreferrer">
          <Video /> Abrir vídeo em uma nova aba
        </a>
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    ) : (
      <div className="block-preview-missing">
        <Video /> Informe uma URL HTTPS para o vídeo.
      </div>
    );
  if (block.type === "file") {
    const document = findById(db.documents, block.documentId);
    return (
      <div className="block-preview-file">
        <FileText />
        <span>
          <strong>{block.name || document?.title || "Arquivo não selecionado"}</strong>
          <small>{block.description || document?.type || "Referência de arquivo"}</small>
        </span>
        {block.url && (
          <a href={block.url} target="_blank" rel="noreferrer">
            Abrir
          </a>
        )}
      </div>
    );
  }
  if (block.type === "database") {
    const database = findById(db.databases, block.databaseId);
    if (!database)
      return (
        <div className="block-preview-missing">
          <Database /> Selecione uma base para incorporar.
        </div>
      );
    const fields = (database.fields || []).slice(0, 6);
    const rows = (database.rows || []).slice(0, block.limit);
    return (
      <section className="block-preview-embed">
        <header>
          <Database />
          <div>
            <strong>{database.name}</strong>
            <small>
              Visão {block.view} · {rows.length} registro(s)
            </small>
          </div>
        </header>
        <div className="block-preview-table">
          <table>
            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field.id}>{field.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {fields.map((field) => (
                    <td key={field.id}>{databaseCell(row, field)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  if (block.type === "tasks") {
    const explicit = new Set(block.taskIds || []);
    const selectedProject = findById(db.projects, block.projectId);
    const tasks = (db.tasks || [])
      .filter(
        (task) =>
          (!block.projectId ||
            task.projectId === block.projectId ||
            task.project === selectedProject?.name) &&
          (!explicit.size || explicit.has(task.id)) &&
          (block.filter === "all" ||
            (block.filter === "done"
              ? task.status === "Concluído"
              : task.status !== "Concluído")),
      )
      .slice(0, block.limit);
    return (
      <section className="block-preview-embed">
        <header>
          <LayoutList />
          <div>
            <strong>Tarefas incorporadas</strong>
            <small>{tasks.length} tarefa(s) nesta visão</small>
          </div>
        </header>
        <div className="block-preview-tasks">
          {tasks.length ? (
            tasks.map((task) => (
              <div key={task.id}>
                <input
                  type="checkbox"
                  checked={task.status === "Concluído"}
                  readOnly
                />
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.status || "A fazer"}</small>
                </span>
              </div>
            ))
          ) : (
            <p>Nenhuma tarefa corresponde ao filtro.</p>
          )}
        </div>
      </section>
    );
  }
  if (block.type === "form") {
    const form = findById(db.publicForms, block.formId);
    return form ? (
      <section className="block-preview-embed form">
        <header>
          <FormInput />
          <div>
            <strong>{form.name}</strong>
            <small>{(form.fields || []).length} campo(s)</small>
          </div>
          {form.slug && (
            <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer">
              Abrir
            </a>
          )}
        </header>
        {block.showDescription && form.description && <p>{form.description}</p>}
        <div className="block-preview-form-fields">
          {(form.fields || []).slice(0, 8).map((field) => (
            <span key={field.id}>
              {field.label}
              {field.required ? " *" : ""}
            </span>
          ))}
        </div>
      </section>
    ) : (
      <div className="block-preview-missing">
        <FormInput /> Selecione um formulário para incorporar.
      </div>
    );
  }
  const synced = findById(syncedBlocks, block.syncedBlockId);
  return synced ? (
    <section className="block-preview-synced">
      <header>
        <Link2 />
        <strong>{synced.name}</strong>
        <span>Sincronizado</span>
      </header>
      <div>{synced.content || "Conteúdo sincronizado vazio."}</div>
    </section>
  ) : (
    <div className="block-preview-missing">
      <Link2 /> Selecione um conteúdo sincronizado.
    </div>
  );
}

function ChecklistFields({ block, onPatch }) {
  const patchItem = (id, patch) =>
    onPatch({
      items: block.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  return (
    <div className="block-checklist-editor">
      {block.items.map((item) => (
        <div key={item.id}>
          <input
            type="checkbox"
            checked={item.done}
            aria-label={`Concluir ${item.text}`}
            onChange={(event) => patchItem(item.id, { done: event.target.checked })}
          />
          <input
            value={item.text}
            aria-label="Texto do item"
            onChange={(event) => patchItem(item.id, { text: event.target.value })}
          />
          <button
            type="button"
            title="Remover item"
            onClick={() =>
              onPatch({ items: block.items.filter((entry) => entry.id !== item.id) })
            }
          >
            <Trash2 />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="block-inline-add"
        onClick={() =>
          onPatch({
            items: [
              ...block.items,
              {
                id: globalThis.crypto?.randomUUID?.() || `item-${Date.now()}`,
                text: "Novo item",
                done: false,
              },
            ],
          })
        }
      >
        <Plus /> Adicionar item
      </button>
    </div>
  );
}

function BlockFields({
  block,
  onPatch,
  db,
  business,
  syncedBlocks,
  onCreateSyncedBlock,
  onUpdateSyncedBlock,
}) {
  if (block.type === "paragraph")
    return (
      <textarea
        rows={5}
        aria-label="Texto do bloco"
        value={block.text}
        placeholder="Escreva o texto..."
        onChange={(event) => onPatch({ text: event.target.value })}
      />
    );
  if (block.type === "heading")
    return (
      <div className="block-fields-grid">
        <label>
          Nível
          <select
            value={block.level}
            onChange={(event) => onPatch({ level: Number(event.target.value) })}
          >
            <option value="1">Título principal</option>
            <option value="2">Título de seção</option>
            <option value="3">Subtítulo</option>
          </select>
        </label>
        <label>
          Texto
          <input
            value={block.text}
            onChange={(event) => onPatch({ text: event.target.value })}
          />
        </label>
      </div>
    );
  if (block.type === "bulletedList" || block.type === "numberedList")
    return (
      <label>
        Um item por linha
        <textarea
          rows={5}
          value={block.items.join("\n")}
          onChange={(event) => onPatch({ items: lines(event.target.value) })}
        />
      </label>
    );
  if (block.type === "checklist")
    return <ChecklistFields block={block} onPatch={onPatch} />;
  if (block.type === "callout")
    return (
      <>
        <div className="block-fields-grid compact">
          <label>
            Ícone
            <input
              value={block.icon}
              maxLength={8}
              onChange={(event) => onPatch({ icon: event.target.value })}
            />
          </label>
          <label>
            Tom
            <select
              value={block.tone}
              onChange={(event) => onPatch({ tone: event.target.value })}
            >
              <option value="info">Informação</option>
              <option value="success">Sucesso</option>
              <option value="warning">Atenção</option>
              <option value="danger">Crítico</option>
              <option value="neutral">Neutro</option>
            </select>
          </label>
        </div>
        <textarea
          rows={4}
          aria-label="Texto do destaque"
          value={block.text}
          onChange={(event) => onPatch({ text: event.target.value })}
        />
      </>
    );
  if (block.type === "toggle")
    return (
      <>
        <label>
          Título recolhível
          <input
            value={block.title}
            onChange={(event) => onPatch({ title: event.target.value })}
          />
        </label>
        <label>
          Conteúdo
          <textarea
            rows={5}
            value={block.content}
            onChange={(event) => onPatch({ content: event.target.value })}
          />
        </label>
      </>
    );
  if (block.type === "code")
    return (
      <>
        <label>
          Linguagem
          <input
            value={block.language}
            placeholder="javascript, sql, texto..."
            onChange={(event) => onPatch({ language: event.target.value })}
          />
        </label>
        <textarea
          className="block-code-editor"
          rows={8}
          aria-label="Código"
          value={block.code}
          onChange={(event) => onPatch({ code: event.target.value })}
        />
      </>
    );
  if (block.type === "table")
    return (
      <>
        <label>
          Colunas separadas por |
          <input
            value={block.columns.join(" | ")}
            onChange={(event) =>
              onPatch({
                columns: event.target.value
                  .split("|")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label>
          Linhas, uma por linha e células separadas por |
          <textarea
            rows={6}
            value={block.rows.map((row) => row.join(" | ")).join("\n")}
            onChange={(event) =>
              onPatch({
                rows: event.target.value
                  .split("\n")
                  .filter((row) => row.trim())
                  .map((row) => row.split("|").map((cell) => cell.trim())),
              })
            }
          />
        </label>
      </>
    );
  if (block.type === "chart")
    return (
      <>
        <div className="block-fields-grid">
          <label>
            Título
            <input
              value={block.title}
              onChange={(event) => onPatch({ title: event.target.value })}
            />
          </label>
          <label>
            Tipo
            <select
              value={block.chartType}
              onChange={(event) => onPatch({ chartType: event.target.value })}
            >
              <option value="bar">Barras</option>
              <option value="line">Linha</option>
              <option value="pie">Pizza</option>
            </select>
          </label>
        </div>
        <div className="block-fields-grid">
          <label>
            Categorias, uma por linha
            <textarea
              rows={5}
              value={block.labels.join("\n")}
              onChange={(event) => onPatch({ labels: lines(event.target.value) })}
            />
          </label>
          <label>
            Valores, um por linha
            <textarea
              rows={5}
              value={block.values.join("\n")}
              onChange={(event) =>
                onPatch({
                  values: lines(event.target.value).map(
                    (value) => Number(String(value).replace(",", ".")) || 0,
                  ),
                })
              }
            />
          </label>
        </div>
      </>
    );
  if (block.type === "columns")
    return (
      <div className="block-columns-editor">
        {block.columns.map((column, index) => (
          <section key={column.id}>
            <div>
              <strong>Coluna {index + 1}</strong>
              {block.columns.length > 2 && (
                <button
                  type="button"
                  title="Remover coluna"
                  onClick={() =>
                    onPatch({
                      columns: block.columns.filter((item) => item.id !== column.id),
                    })
                  }
                >
                  <Trash2 />
                </button>
              )}
            </div>
            <input
              value={column.title}
              placeholder="Título opcional"
              aria-label={`Título da coluna ${index + 1}`}
              onChange={(event) =>
                onPatch({
                  columns: block.columns.map((item) =>
                    item.id === column.id
                      ? { ...item, title: event.target.value }
                      : item,
                  ),
                })
              }
            />
            <textarea
              rows={5}
              value={column.content}
              placeholder="Conteúdo da coluna"
              aria-label={`Conteúdo da coluna ${index + 1}`}
              onChange={(event) =>
                onPatch({
                  columns: block.columns.map((item) =>
                    item.id === column.id
                      ? { ...item, content: event.target.value }
                      : item,
                  ),
                })
              }
            />
          </section>
        ))}
        {block.columns.length < 4 && (
          <button
            type="button"
            className="block-inline-add"
            onClick={() =>
              onPatch({
                columns: [
                  ...block.columns,
                  {
                    id:
                      globalThis.crypto?.randomUUID?.() || `column-${Date.now()}`,
                    title: "",
                    content: "",
                  },
                ],
              })
            }
          >
            <Plus /> Adicionar coluna
          </button>
        )}
      </div>
    );
  if (block.type === "image" || block.type === "video")
    return (
      <>
        <label>
          URL HTTPS
          <input
            type="url"
            value={block.url}
            placeholder="https://..."
            onChange={(event) => onPatch({ url: event.target.value })}
          />
        </label>
        {block.type === "image" && (
          <label>
            Texto alternativo
            <input
              value={block.alt}
              onChange={(event) => onPatch({ alt: event.target.value })}
            />
          </label>
        )}
        <label>
          Legenda
          <input
            value={block.caption}
            onChange={(event) => onPatch({ caption: event.target.value })}
          />
        </label>
        <small className="block-security-note">
          Use um endereço HTTPS. Arquivos brutos não são gravados no espaço de
          sincronização.
        </small>
      </>
    );
  if (block.type === "file")
    return (
      <>
        <label>
          Documento existente
          <select
            value={block.documentId}
            onChange={(event) => onPatch({ documentId: event.target.value })}
          >
            <option value="">Nenhum</option>
            {(db.documents || []).map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
          </select>
        </label>
        <div className="block-fields-grid">
          <label>
            Nome exibido
            <input
              value={block.name}
              onChange={(event) => onPatch({ name: event.target.value })}
            />
          </label>
          <label>
            Link HTTPS opcional
            <input
              type="url"
              value={block.url}
              placeholder="https://..."
              onChange={(event) => onPatch({ url: event.target.value })}
            />
          </label>
        </div>
        <label>
          Descrição
          <input
            value={block.description}
            onChange={(event) => onPatch({ description: event.target.value })}
          />
        </label>
      </>
    );
  if (block.type === "database")
    return (
      <div className="block-fields-grid">
        <label>
          Base
          <select
            value={block.databaseId}
            onChange={(event) => onPatch({ databaseId: event.target.value })}
          >
            <option value="">Selecione</option>
            {(db.databases || [])
              .filter(
                (database) =>
                  !business ||
                  !database.businessId ||
                  database.businessId === business.id,
              )
              .map((database) => (
                <option key={database.id} value={database.id}>
                  {database.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Visão
          <select
            value={block.view}
            onChange={(event) => onPatch({ view: event.target.value })}
          >
            <option value="table">Tabela</option>
            <option value="gallery">Galeria</option>
            <option value="board">Quadro</option>
          </select>
        </label>
      </div>
    );
  if (block.type === "tasks") {
    const selectedProject = findById(db.projects, block.projectId);
    const projectTasks = (db.tasks || []).filter(
      (task) =>
        (!block.projectId ||
          task.projectId === block.projectId ||
          task.project === selectedProject?.name) &&
        (!business || !task.businessId || task.businessId === business.id),
    );
    return (
      <>
        <div className="block-fields-grid">
          <label>
            Projeto opcional
            <select
              value={block.projectId}
              onChange={(event) =>
                onPatch({ projectId: event.target.value, taskIds: [] })
              }
            >
              <option value="">Todos os projetos</option>
              {(db.projects || []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Filtro
            <select
              value={block.filter}
              onChange={(event) => onPatch({ filter: event.target.value })}
            >
              <option value="open">Em aberto</option>
              <option value="done">Concluídas</option>
              <option value="all">Todas</option>
            </select>
          </label>
        </div>
        <fieldset className="block-task-picker">
          <legend>
            Tarefas específicas, ou nenhuma para incluir todas do filtro
          </legend>
          {projectTasks.slice(0, 100).map((task) => (
            <label key={task.id}>
              <input
                type="checkbox"
                checked={block.taskIds.includes(task.id)}
                onChange={() =>
                  onPatch({
                    taskIds: block.taskIds.includes(task.id)
                      ? block.taskIds.filter((id) => id !== task.id)
                      : [...block.taskIds, task.id],
                  })
                }
              />
              <span>{task.title}</span>
            </label>
          ))}
        </fieldset>
      </>
    );
  }
  if (block.type === "form")
    return (
      <div className="block-fields-grid">
        <label>
          Formulário público
          <select
            value={block.formId}
            onChange={(event) => onPatch({ formId: event.target.value })}
          >
            <option value="">Selecione</option>
            {(db.publicForms || [])
              .filter(
                (form) =>
                  !business || !form.businessId || form.businessId === business.id,
              )
              .map((form) => (
                <option key={form.id} value={form.id}>
                  {form.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block-inline-check">
          <input
            type="checkbox"
            checked={block.showDescription}
            onChange={(event) =>
              onPatch({ showDescription: event.target.checked })
            }
          />
          Mostrar descrição
        </label>
      </div>
    );
  const synced = findById(syncedBlocks, block.syncedBlockId);
  const canEditSynced =
    synced &&
    (synced.ownerId === db.user?.id ||
      synced.sharingPermission === "editar" ||
      (synced.editors || []).includes(db.user?.id));
  return (
    <>
      <div className="block-fields-grid synced">
        <label>
          Componente sincronizado
          <select
            value={block.syncedBlockId}
            onChange={(event) => onPatch({ syncedBlockId: event.target.value })}
          >
            <option value="">Selecione</option>
            {syncedBlocks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            const id = onCreateSyncedBlock?.();
            if (id) onPatch({ syncedBlockId: id });
          }}
        >
          <Plus /> Novo conteúdo
        </button>
      </div>
      {synced && (
        <div className="block-synced-editor">
          <label>
            Nome do componente
            <input
              value={synced.name}
              disabled={!canEditSynced}
              onChange={(event) =>
                onUpdateSyncedBlock?.(synced.id, { name: event.target.value })
              }
            />
          </label>
          <label>
            Conteúdo compartilhado
            <textarea
              rows={6}
              value={synced.content}
              disabled={!canEditSynced}
              onChange={(event) =>
                onUpdateSyncedBlock?.(synced.id, {
                  content: event.target.value,
                })
              }
            />
          </label>
          <small>
            {canEditSynced
              ? "Alterações neste conteúdo aparecem em todos os documentos que o utilizam."
              : "Você pode usar este conteúdo, mas somente o proprietário e editores autorizados podem alterá-lo."}
          </small>
        </div>
      )}
    </>
  );
}

export default function BlockDocumentEditor({
  blocks: rawBlocks,
  onChange,
  db = {},
  business,
  syncedBlocks = [],
  onCreateSyncedBlock,
  onUpdateSyncedBlock,
}) {
  const blocks = useMemo(
    () =>
      Array.isArray(rawBlocks) && rawBlocks.length
        ? rawBlocks
        : normalizeDocumentBlocks(rawBlocks),
    [rawBlocks],
  );
  const [mode, setMode] = useState("edit");
  const [newType, setNewType] = useState("paragraph");
  const stats = documentBlockStats(blocks, {
    syncedBlocks,
    databases: db.databases,
    tasks: db.tasks,
    forms: db.publicForms,
    documents: db.documents,
    projects: db.projects,
  });

  const commit = (next) => onChange(next);
  const patch = (id, patchValue) =>
    commit(
      blocks.map((block) =>
        block.id === id
          ? { ...block, ...patchValue, id: block.id }
          : block,
      ),
    );
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };
  const duplicate = (block, index) => {
    const copy = createDocumentBlock(block.type, { ...block, id: undefined });
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    commit(next);
  };
  const add = () => {
    commit([...blocks, createDocumentBlock(newType)]);
  };

  return (
    <section className="block-document-editor">
      <header className="block-editor-head">
        <div className="block-editor-mode" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            className={mode === "edit" ? "active" : ""}
            onClick={() => setMode("edit")}
          >
            Editar blocos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            className={mode === "preview" ? "active" : ""}
            onClick={() => setMode("preview")}
          >
            Visualizar
          </button>
        </div>
        <div className="block-editor-stats">
          <span>{stats.blocks} bloco(s)</span>
          <span>{stats.words} palavra(s)</span>
          <span>{stats.connections} conexão(ões)</span>
        </div>
      </header>

      {mode === "preview" ? (
        <div className="block-document-preview">
          {blocks.map((block) => (
            <DocumentBlockPreview
              key={block.id}
              block={block}
              db={db}
              syncedBlocks={syncedBlocks}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="block-editor-list">
            {blocks.map((block, index) => {
              const Icon = typeIcon[block.type] || Text;
              return (
                <article className="block-editor-card" key={block.id}>
                  <header>
                    <span>
                      <Icon />
                      {DOCUMENT_BLOCK_TYPE_LABELS[block.type]}
                    </span>
                    <div>
                      <button
                        type="button"
                        title="Mover para cima"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp />
                      </button>
                      <button
                        type="button"
                        title="Mover para baixo"
                        disabled={index === blocks.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown />
                      </button>
                      <button
                        type="button"
                        title="Duplicar bloco"
                        onClick={() => duplicate(block, index)}
                      >
                        <Copy />
                      </button>
                      <button
                        type="button"
                        title="Excluir bloco"
                        className="danger"
                        disabled={blocks.length === 1}
                        onClick={() =>
                          commit(blocks.filter((item) => item.id !== block.id))
                        }
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </header>
                  <div className="block-editor-card-body">
                    <label className="block-type-select">
                      Tipo de bloco
                      <select
                        value={block.type}
                        onChange={(event) =>
                          commit(
                            blocks.map((item) =>
                              item.id === block.id
                                ? createDocumentBlock(event.target.value, {
                                    id: block.id,
                                  })
                                : item,
                            ),
                          )
                        }
                      >
                        {DOCUMENT_BLOCK_TYPES.map((type) => (
                          <option key={type.type} value={type.type}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <BlockFields
                      block={block}
                      onPatch={(value) => patch(block.id, value)}
                      db={db}
                      business={business}
                      syncedBlocks={syncedBlocks}
                      onCreateSyncedBlock={onCreateSyncedBlock}
                      onUpdateSyncedBlock={onUpdateSyncedBlock}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          <footer className="block-editor-add">
            <label>
              Novo bloco
              <select
                value={newType}
                onChange={(event) => setNewType(event.target.value)}
              >
                {Object.entries(
                  DOCUMENT_BLOCK_TYPES.reduce((groups, item) => {
                    groups[item.group] = [...(groups[item.group] || []), item];
                    return groups;
                  }, {}),
                ).map(([group, types]) => (
                  <optgroup key={group} label={group}>
                    {types.map((type) => (
                      <option key={type.type} value={type.type}>
                        {type.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={add}>
              <Plus /> Adicionar bloco
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
