import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  BriefcaseBusiness,
  Building2,
  Copy,
  FileStack,
  Folder,
  FolderTree,
  List,
  Plus,
  Star,
  Users,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import {
  allowedChildTypes,
  buildWorkTree,
  createWorkNode,
  duplicateWorkBranch,
  hierarchyMetrics,
  moveWorkNode,
  organizationRoot,
  WORK_NODE_TYPES,
  workBreadcrumbs,
} from "./hierarchyDomain.js";

const TYPE_LABELS = Object.fromEntries(WORK_NODE_TYPES);
const NEW_TYPE_LABELS = {
  workspace: "Novo workspace",
  space: "Novo espaço",
  folder: "Nova pasta",
  list: "Nova lista",
};
const TYPE_ICONS = {
  organization: Building2,
  workspace: BriefcaseBusiness,
  space: Users,
  folder: Folder,
  list: List,
};

function TreeNode({ node, selectedId, onSelect, level = 0 }) {
  const Icon = TYPE_ICONS[node.type] || Folder;
  return (
    <div className="work-tree-branch">
      <button
        className={selectedId === node.id ? "active" : ""}
        style={{ paddingLeft: 9 + level * 14 }}
        onClick={() => onSelect(node.id)}
      >
        <Icon size={16} />
        <span>{node.name}</span>
        {node.favorite && <Star size={13} fill="currentColor" />}
      </button>
      {(node.children || []).map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level + 1}
        />
      ))}
    </div>
  );
}

export default function WorkStructure({ db, update, business, setToast }) {
  const root = useMemo(() => organizationRoot(business || {}), [business]);
  const nodes = (db.workNodes || []).filter(
    (node) => !business || node.businessId === business.id,
  );
  const tree = buildWorkTree(nodes, root);
  const [selectedId, setSelectedId] = useState(root.id);
  const [modal, setModal] = useState(nodes.length === 0);
  const [newType, setNewType] = useState("workspace");
  const [newName, setNewName] = useState("");
  const [newVisibility, setNewVisibility] = useState("espaco_todo");
  const [newSharingPermission, setNewSharingPermission] =
    useState("visualizar");
  const selected =
    selectedId === root.id
      ? root
      : nodes.find((node) => node.id === selectedId) || root;
  const ownsSelected =
    selected.synthetic ||
    !selected.ownerId ||
    selected.ownerId === db.user?.id;
  const canEditSelected =
    ownsSelected || selected.sharingPermission === "editar";
  const childTypes = allowedChildTypes(selected);
  const breadcrumbs = workBreadcrumbs(nodes, selected.id, root);
  const projects = (db.projects || []).filter(
    (project) => !business || project.businessId === business.id,
  );
  const tasks = (db.tasks || []).filter(
    (task) => !business || task.businessId === business.id,
  );
  const metrics = hierarchyMetrics(selected, nodes, projects, tasks);
  const selectedProjects = projects.filter(
    (project) => project.containerId === selected.id,
  );
  const selectedTasks = tasks.filter((task) => task.listId === selected.id);
  const possibleParents = [root, ...nodes].filter(
    (parent) =>
      parent.id !== selected.id &&
      allowedChildTypes(parent).includes(selected.type) &&
      !parent.archivedAt &&
      !workBreadcrumbs(nodes, parent.id, root).some(
        (item) => item.id === selected.id,
      ),
  );
  const archivedRoots = nodes.filter(
    (node) =>
      node.archivedAt &&
      !nodes.some(
        (parent) => parent.id === node.parentId && parent.archivedAt,
      ),
  );

  const openCreate = (type = childTypes[0]) => {
    setNewType(type || "workspace");
    setNewName("");
    setNewVisibility("espaco_todo");
    setNewSharingPermission("visualizar");
    setModal(true);
  };

  const create = (event) => {
    event.preventDefault();
    const result = createWorkNode(
      {
        type: newType,
        name: newName,
        parentId: selected.id,
        visibility: newVisibility,
        sharingPermission: newSharingPermission,
      },
      { businessId: business?.id, ownerId: db.user?.id },
      nodes,
      root,
    );
    if (result.error) {
      setToast(result.error);
      return;
    }
    update((current) => ({
      ...current,
      workNodes: [...(current.workNodes || []), result.node],
    }));
    setSelectedId(result.node.id);
    setModal(false);
    setToast("Estrutura criada");
  };

  const patchSelected = (patch) =>
    update((current) => ({
      ...current,
      workNodes: (current.workNodes || []).map((node) =>
        node.id === selected.id
          ? { ...node, ...patch, updatedAt: new Date().toISOString() }
          : node,
      ),
    }));

  const move = (parentId) => {
    const result = moveWorkNode(nodes, selected.id, parentId, root);
    if (result.error) {
      setToast(result.error);
      return;
    }
    update((current) => ({
      ...current,
      workNodes: (current.workNodes || []).map(
        (node) => result.nodes.find((item) => item.id === node.id) || node,
      ),
    }));
    setToast("Estrutura movida");
  };

  const duplicate = () => {
    const result = duplicateWorkBranch(nodes, selected.id, {
      ownerId: db.user?.id,
    });
    update((current) => ({
      ...current,
      workNodes: [
        ...(current.workNodes || []),
        ...result.created,
      ],
    }));
    setSelectedId(result.created[0].id);
    setToast("Estrutura completa duplicada");
  };

  const archive = () => {
    const ids = new Set([selected.id]);
    let changed = true;
    while (changed) {
      changed = false;
      nodes.forEach((node) => {
        if (ids.has(node.parentId) && !ids.has(node.id)) {
          ids.add(node.id);
          changed = true;
        }
      });
    }
    const now = new Date().toISOString();
    update((current) => ({
      ...current,
      workNodes: (current.workNodes || []).map((node) =>
        ids.has(node.id) ? { ...node, archivedAt: now, updatedAt: now } : node,
      ),
    }));
    setSelectedId(root.id);
    setToast("Estrutura arquivada; projetos e tarefas foram preservados");
  };

  const restore = (nodeId) => {
    const ids = new Set([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      nodes.forEach((node) => {
        if (ids.has(node.parentId) && !ids.has(node.id)) {
          ids.add(node.id);
          changed = true;
        }
      });
    }
    const now = new Date().toISOString();
    update((current) => ({
      ...current,
      workNodes: (current.workNodes || []).map((node) =>
        ids.has(node.id)
          ? { ...node, archivedAt: null, updatedAt: now }
          : node,
      ),
    }));
    setSelectedId(nodeId);
    setToast("Estrutura restaurada");
  };

  const attachProject = (projectId) =>
    update((current) => ({
      ...current,
      projects: (current.projects || []).map((project) =>
        project.id === projectId
          ? { ...project, containerId: selected.id, updatedAt: new Date().toISOString() }
          : project,
      ),
    }));

  const attachTask = (taskId) =>
    update((current) => ({
      ...current,
      tasks: (current.tasks || []).map((task) =>
        task.id === taskId
          ? { ...task, listId: selected.id, updatedAt: new Date().toISOString() }
          : task,
      ),
    }));

  return (
    <main className="work-structure-page">
      <header className="work-structure-hero">
        <div>
          <span>ESTRUTURA DE TRABALHO</span>
          <h1>Uma hierarquia para toda a empresa</h1>
          <p>
            Organize workspaces, espaços, pastas e listas sem duplicar a empresa,
            os projetos ou as tarefas já existentes.
          </p>
        </div>
        {childTypes.length > 0 && canEditSelected && (
          <button className="btn primary" onClick={() => openCreate()}>
            <Plus size={17} /> Criar dentro de {selected.name}
          </button>
        )}
      </header>

      <section className="work-structure-layout">
        <aside className="work-tree-panel">
          <header>
            <FolderTree />
            <div><strong>Hierarquia</strong><small>{nodes.length} estrutura(s)</small></div>
          </header>
          <div className="work-tree">
            <TreeNode
              node={tree}
              selectedId={selected.id}
              onSelect={setSelectedId}
            />
          </div>
        </aside>

        <section className="work-structure-content">
          <nav className="work-breadcrumbs" aria-label="Caminho da estrutura">
            {breadcrumbs.map((item, index) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)}>
                {index > 0 && <span>/</span>}
                {item.name}
              </button>
            ))}
          </nav>
          <header className="work-node-header">
            <div>
              <span>{selected.type === "organization" ? "Organização" : TYPE_LABELS[selected.type]}</span>
              <h2>{selected.name}</h2>
              {selected.description && <p>{selected.description}</p>}
            </div>
            {!selected.synthetic && canEditSelected && (
              <div className="work-node-actions">
                <button
                  className="btn ghost"
                  onClick={() => patchSelected({ favorite: !selected.favorite })}
                >
                  <Star size={16} /> {selected.favorite ? "Desfavoritar" : "Favoritar"}
                </button>
                <button className="btn ghost" onClick={duplicate}>
                  <Copy size={16} /> Duplicar
                </button>
                <button className="btn ghost" onClick={archive}>
                  <Archive size={16} /> Arquivar
                </button>
              </div>
            )}
          </header>

          <div className="work-structure-metrics">
            <article><FolderTree /><span>Estruturas</span><strong>{metrics.structures}</strong></article>
            <article><BriefcaseBusiness /><span>Projetos</span><strong>{metrics.projects}</strong></article>
            <article><List /><span>Tarefas</span><strong>{metrics.tasks}</strong></article>
            <article><FileStack /><span>Concluídas</span><strong>{metrics.completedTasks}</strong></article>
            <article className={metrics.overdueTasks ? "warning" : ""}><Archive /><span>Atrasadas</span><strong>{metrics.overdueTasks}</strong></article>
          </div>

          {!selected.synthetic && (
            <article className="work-settings-card">
              <header><div><h3>Configuração</h3><p>A estrutura pode ser reorganizada sem mover ou excluir seus dados.</p></div></header>
              <div className="work-settings-grid">
                <label>
                  Nome
                  <input
                    disabled={!canEditSelected}
                    value={selected.name}
                    onChange={(event) => patchSelected({ name: event.target.value })}
                  />
                </label>
                <label>
                  Mover para
                  <select
                    disabled={!canEditSelected}
                    value={selected.parentId}
                    onChange={(event) => move(event.target.value)}
                  >
                    {possibleParents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Visibilidade
                  <select
                    disabled={!ownsSelected}
                    value={selected.visibility || "espaco_todo"}
                    onChange={(event) =>
                      patchSelected({ visibility: event.target.value })
                    }
                  >
                    <option value="espaco_todo">Toda a empresa</option>
                    <option value="privado">Privada</option>
                  </select>
                </label>
                <label>
                  Edição
                  <select
                    disabled={!ownsSelected}
                    value={selected.sharingPermission || "visualizar"}
                    onChange={(event) =>
                      patchSelected({ sharingPermission: event.target.value })
                    }
                  >
                    <option value="visualizar">Somente responsável</option>
                    <option value="editar">Membros podem editar</option>
                  </select>
                </label>
                <label className="wide">
                  Descrição
                  <input
                    disabled={!canEditSelected}
                    value={selected.description || ""}
                    onChange={(event) =>
                      patchSelected({ description: event.target.value })
                    }
                  />
                </label>
              </div>
            </article>
          )}

          {childTypes.length > 0 && canEditSelected && (
            <article className="work-settings-card">
              <header>
                <div><h3>Próximo nível</h3><p>Crie apenas níveis estruturalmente válidos.</p></div>
              </header>
              <div className="work-child-actions">
                {childTypes.map((type) => {
                  const Icon = TYPE_ICONS[type];
                  return (
                    <button key={type} onClick={() => openCreate(type)}>
                      <Icon size={18} /><span><strong>{NEW_TYPE_LABELS[type]}</strong><small>Dentro de {selected.name}</small></span>
                    </button>
                  );
                })}
              </div>
            </article>
          )}

          {["space", "folder"].includes(selected.type) && (
            <article className="work-settings-card">
              <header><div><h3>Projetos vinculados</h3><p>Projetos continuam sendo registros completos do motor de planejamento.</p></div></header>
              <select
                aria-label="Vincular projeto"
                disabled={!canEditSelected}
                value=""
                onChange={(event) => attachProject(event.target.value)}
              >
                <option value="">Vincular projeto existente...</option>
                {projects
                  .filter((project) => project.containerId !== selected.id)
                  .map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
              </select>
              <div className="work-linked-list">
                {selectedProjects.map((project) => (
                  <div key={project.id}><BriefcaseBusiness /><span><strong>{project.name}</strong><small>{project.status || "Planejamento"}</small></span></div>
                ))}
                {!selectedProjects.length && <p>Nenhum projeto vinculado.</p>}
              </div>
            </article>
          )}

          {selected.type === "list" && (
            <article className="work-settings-card">
              <header><div><h3>Tarefas da lista</h3><p>A tarefa mantém projeto, responsáveis, dependências e histórico.</p></div></header>
              <select
                aria-label="Vincular tarefa"
                disabled={!canEditSelected}
                value=""
                onChange={(event) => attachTask(event.target.value)}
              >
                <option value="">Vincular tarefa existente...</option>
                {tasks
                  .filter((task) => task.listId !== selected.id)
                  .map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
              </select>
              <div className="work-linked-list">
                {selectedTasks.map((task) => (
                  <div key={task.id}><List /><span><strong>{task.title}</strong><small>{task.status}</small></span></div>
                ))}
                {!selectedTasks.length && <p>Nenhuma tarefa vinculada.</p>}
              </div>
            </article>
          )}

          {selected.synthetic && archivedRoots.length > 0 && (
            <article className="work-settings-card">
              <header>
                <div>
                  <h3>Estruturas arquivadas</h3>
                  <p>Restaure a estrutura completa sem perder vínculos.</p>
                </div>
              </header>
              <div className="work-linked-list">
                {archivedRoots.map((node) => (
                  <div key={node.id}>
                    <Archive />
                    <span>
                      <strong>{node.name}</strong>
                      <small>{TYPE_LABELS[node.type]}</small>
                    </span>
                    <button
                      className="btn ghost"
                      disabled={
                        node.ownerId &&
                        node.ownerId !== db.user?.id &&
                        node.sharingPermission !== "editar"
                      }
                      onClick={() => restore(node.id)}
                    >
                      <ArchiveRestore size={16} /> Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}
        </section>
      </section>

      {modal && (
        <Modal
          title={`Criar dentro de ${selected.name}`}
          onClose={() => setModal(false)}
        >
          <form className="work-create-form" onSubmit={create}>
            <p>A hierarquia impede combinações inválidas automaticamente.</p>
            <label>
              Tipo
              <select
                aria-label="Tipo da estrutura"
                value={newType}
                onChange={(event) => setNewType(event.target.value)}
              >
                {childTypes.map((type) => (
                  <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <label>
              Nome
              <input
                aria-label="Nome da estrutura"
                autoFocus
                required
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </label>
            <div className="work-create-row">
              <label>
                Visibilidade
                <select
                  value={newVisibility}
                  onChange={(event) => setNewVisibility(event.target.value)}
                >
                  <option value="espaco_todo">Toda a empresa</option>
                  <option value="privado">Privada</option>
                </select>
              </label>
              <label>
                Edição
                <select
                  value={newSharingPermission}
                  onChange={(event) =>
                    setNewSharingPermission(event.target.value)
                  }
                >
                  <option value="visualizar">Somente responsável</option>
                  <option value="editar">Membros podem editar</option>
                </select>
              </label>
            </div>
            <footer>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setModal(false)}
              >
                Cancelar
              </button>
              <button className="btn primary">Criar estrutura</button>
            </footer>
          </form>
        </Modal>
      )}
    </main>
  );
}
