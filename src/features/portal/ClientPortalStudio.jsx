import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  FolderKanban,
  Link2,
  LockKeyhole,
  Mail,
  MessageSquarePlus,
  PackageCheck,
  Palette,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import {
  CLIENT_PORTAL_DEFAULT_PERMISSIONS,
  CLIENT_PORTAL_PERMISSION_LABELS,
  CLIENT_PORTAL_RESOURCE_GROUPS,
  clientPortalResourceCount,
  normalizeClientPortal,
} from "./clientPortalDomain.js";

const formatDate = (value) => {
  if (!value) return "";
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

const statusLabel = (type) =>
  ({
    ticket: "Chamado aberto",
    upload: "Documento enviado",
    delivery: "Resposta sobre entrega",
  })[type] || "Interação";

const eventIcon = (type) =>
  ({ ticket: MessageSquarePlus, upload: FileUp, delivery: ClipboardCheck })[
    type
  ] || ShieldCheck;

const resourceIcon = {
  projectIds: FolderKanban,
  taskIds: ClipboardCheck,
  documentIds: FileUp,
  reportIds: Download,
  quoteIds: Link2,
  orderIds: PackageCheck,
  tripIds: Truck,
};

function resourceOptions(db, key, business) {
  const scoped = (items) =>
    (Array.isArray(items) ? items : []).filter(
      (item) =>
        !business || !item.businessId || item.businessId === business.id,
    );
  if (key === "projectIds")
    return scoped(db.projects).map((item) => ({
      id: item.id,
      label: item.name || "Projeto sem nome",
      detail: item.status || item.objective || "",
    }));
  if (key === "taskIds")
    return scoped(db.tasks).map((item) => ({
      id: item.id,
      label: item.title || "Tarefa sem título",
      detail: [item.project, item.status].filter(Boolean).join(" · "),
    }));
  if (key === "documentIds" || key === "reportIds")
    return scoped(db.documents).map((item) => ({
      id: item.id,
      label: item.title || item.name || "Documento sem título",
      detail: item.type || item.category || "",
    }));
  if (key === "quoteIds")
    return scoped(db.quotes).map((item) => ({
      id: item.id,
      label: item.clientName || "Orçamento",
      detail: item.status || "",
    }));
  if (key === "orderIds")
    return scoped(db.orders).map((item) => ({
      id: item.id,
      label: item.clientName || item.id,
      detail: item.status || "",
    }));
  return scoped(db.trips).map((item) => ({
    id: item.id,
    label: item.code || item.reference || item.name || "Entrega",
    detail: [item.origin, item.destination].filter(Boolean).join(" → "),
  }));
}

export default function ClientPortalStudio({
  db,
  update,
  business,
  setToast,
  authHeaders = () => ({}),
  ownerId = "",
}) {
  const workspaceOwnerId = ownerId || db.user?.id || "";
  const portals = useMemo(
    () =>
      (db.clientPortals || []).filter(
        (portal) =>
          !business ||
          !portal.businessId ||
          portal.businessId === business.id,
      ),
    [business, db.clientPortals],
  );
  const [selectedId, setSelectedId] = useState(portals[0]?.id || "");
  const [tab, setTab] = useState("editor");
  const [remote, setRemote] = useState({});
  const [links, setLinks] = useState({});
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState("");
  const selected =
    portals.find((portal) => portal.id === selectedId) || portals[0] || null;

  const suffix = ownerId
    ? `?owner=${encodeURIComponent(ownerId)}`
    : "";
  const withOwner = useCallback((path) =>
    `${path}${path.includes("?") ? "&" : "?"}owner=${encodeURIComponent(
      workspaceOwnerId,
    )}`, [workspaceOwnerId]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/client-portals/status${suffix}`, {
        headers: authHeaders(),
      });
      const data = response.ok ? await response.json() : { items: [] };
      setRemote(
        Object.fromEntries((data.items || []).map((item) => [item.id, item])),
      );
    } catch {
      setRemote({});
    }
  }, [authHeaders, suffix]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadStatus();
    }, 0);
    return () => clearTimeout(id);
  }, [loadStatus]);

  useEffect(() => {
    const nextSelectedId =
      !selectedId && portals[0]
        ? portals[0].id
        : selectedId && !portals.some((portal) => portal.id === selectedId)
          ? portals[0]?.id || ""
          : selectedId;
    if (nextSelectedId === selectedId) return undefined;
    const id = setTimeout(() => setSelectedId(nextSelectedId), 0);
    return () => clearTimeout(id);
  }, [portals, selectedId]);

  const patchSelected = (patch) => {
    if (!selected) return;
    const next = normalizeClientPortal(
      {
        ...selected,
        ...patch,
        permissions: {
          ...selected.permissions,
          ...(patch.permissions || {}),
        },
        resources: {
          ...selected.resources,
          ...(patch.resources || {}),
        },
        appearance: {
          ...selected.appearance,
          ...(patch.appearance || {}),
        },
      },
      {
        ownerId: selected.ownerId || db.user?.id,
        workspaceOwnerId,
        businessId: selected.businessId || business?.id,
      },
    );
    update((current) => ({
      ...current,
      clientPortals: (current.clientPortals || []).map((portal) =>
        portal.id === selected.id ? next : portal,
      ),
    }));
  };

  const createPortal = () => {
    const portal = normalizeClientPortal(
      {
        name: "Portal do cliente",
        clientName: "",
        clientEmail: "",
        title: "Acompanhamento do cliente",
        permissions: CLIENT_PORTAL_DEFAULT_PERMISSIONS,
      },
      {
        ownerId: db.user?.id,
        workspaceOwnerId,
        businessId: business?.id,
      },
    );
    update((current) => ({
      ...current,
      clientPortals: [portal, ...(current.clientPortals || [])],
    }));
    setSelectedId(portal.id);
    setTab("editor");
    setToast?.("Portal criado. Escolha o que o cliente poderá acessar.");
  };

  const togglePermission = (key) =>
    patchSelected({
      permissions: {
        [key]: !selected.permissions?.[key],
      },
    });

  const toggleResource = (key, id) => {
    const current = selected.resources?.[key] || [];
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    const patch = { [key]: next };
    if (key === "documentIds")
      patch.reportIds = (selected.resources?.reportIds || []).filter((value) =>
        next.includes(value),
      );
    patchSelected({ resources: patch });
  };

  const publish = async () => {
    if (!selected?.clientName?.trim()) {
      setToast?.("Informe o nome do cliente antes de publicar.");
      return;
    }
    setBusy("publish");
    try {
      const response = await fetch(
        `/api/client-portals/publish${suffix}`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeaders() },
          body: JSON.stringify({ portal: selected }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.url)
        throw new Error(data.error || "Não foi possível publicar.");
      setLinks((current) => ({ ...current, [selected.id]: data.url }));
      await loadStatus();
      try {
        await navigator.clipboard.writeText(data.url);
        setToast?.("Novo link seguro copiado.");
      } catch {
        setToast?.(`Portal publicado: ${data.url}`);
      }
    } catch (error) {
      setToast?.(error.message || "Não foi possível publicar.");
    } finally {
      setBusy("");
    }
  };

  const revoke = async () => {
    if (!selected) return;
    setBusy("revoke");
    try {
      const response = await fetch(`/api/client-portals/revoke${suffix}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id: selected.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao revogar.");
      setLinks((current) => ({ ...current, [selected.id]: "" }));
      await loadStatus();
      setToast?.("Acesso revogado.");
    } catch (error) {
      setToast?.(error.message || "Não foi possível revogar.");
    } finally {
      setBusy("");
    }
  };

  const loadEvents = useCallback(async () => {
    if (!selected) return;
    setBusy("events");
    try {
      const response = await fetch(
        withOwner(
          `/api/client-portals/events?portal_id=${encodeURIComponent(
            selected.id,
          )}`,
        ),
        { headers: authHeaders() },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível carregar.");
      setEvents(data.items || []);
    } catch (error) {
      setEvents([]);
      setToast?.(error.message || "Não foi possível carregar as interações.");
    } finally {
      setBusy("");
    }
  }, [authHeaders, selected, setToast, withOwner]);

  useEffect(() => {
    if (tab !== "events" || !selected) return undefined;
    const id = setTimeout(() => {
      void loadEvents();
    }, 0);
    return () => clearTimeout(id);
  }, [loadEvents, selected, tab]);

  const copyLink = async () => {
    const link = links[selected?.id];
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setToast?.("Link copiado.");
    } catch {
      setToast?.(link);
    }
  };

  const downloadEventFile = async (portalEvent) => {
    setBusy(`file-${portalEvent.id}`);
    try {
      const response = await fetch(
        withOwner(
          `/api/client-portals/file?event_id=${encodeURIComponent(
            portalEvent.id,
          )}`,
        ),
        { headers: authHeaders() },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível baixar o arquivo.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = portalEvent.payload?.file?.name || "documento";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      setToast?.(error.message || "Não foi possível baixar o arquivo.");
    } finally {
      setBusy("");
    }
  };

  const selectedStatus = selected ? remote[selected.id] : null;

  return (
    <section className="client-portal-studio">
      <header className="client-portal-title">
        <div>
          <span className="client-portal-kicker">
            <ShieldCheck size={15} /> ACESSO EXTERNO CONTROLADO
          </span>
          <h1>Portal do cliente</h1>
          <p>
            Compartilhe somente o que cada cliente precisa acompanhar e receba
            aprovações, chamados e documentos com protocolo.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={createPortal}>
          <Plus size={16} /> Novo portal
        </button>
      </header>

      {!portals.length ? (
        <div className="client-portal-empty">
          <UserRoundCheck size={40} />
          <h2>Crie o primeiro acesso do cliente</h2>
          <p>
            Você escolhe os projetos, documentos, pedidos e entregas. Todo o
            restante do workspace permanece invisível.
          </p>
          <button type="button" className="btn primary" onClick={createPortal}>
            <Plus size={16} /> Criar portal
          </button>
        </div>
      ) : (
        <div className="client-portal-layout">
          <aside className="client-portal-list">
            <div className="client-portal-list-head">
              <strong>Clientes</strong>
              <span>{portals.length}</span>
            </div>
            {portals.map((portal) => {
              const status = remote[portal.id];
              return (
                <button
                  type="button"
                  key={portal.id}
                  className={portal.id === selected?.id ? "active" : ""}
                  onClick={() => {
                    setSelectedId(portal.id);
                    setTab("editor");
                  }}
                >
                  <span className="client-portal-avatar">
                    {(portal.clientName || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{portal.clientName || "Cliente não informado"}</strong>
                    <small>
                      {clientPortalResourceCount(portal)} item(ns) ·{" "}
                      {status?.active ? "ativo" : "não publicado"}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </aside>

          <main className="client-portal-main">
            <div className="client-portal-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "editor"}
                className={tab === "editor" ? "active" : ""}
                onClick={() => setTab("editor")}
              >
                Configuração
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "events"}
                className={tab === "events" ? "active" : ""}
                onClick={() => setTab("events")}
              >
                Interações{" "}
                {selectedStatus?.events ? (
                  <span>{selectedStatus.events}</span>
                ) : null}
              </button>
            </div>

            {tab === "editor" && selected && (
              <div className="client-portal-editor">
                <section className="client-portal-panel">
                  <div className="client-portal-panel-title">
                    <div>
                      <span>IDENTIFICAÇÃO</span>
                      <h2>Cliente e mensagem</h2>
                    </div>
                    <Mail size={19} />
                  </div>
                  <div className="client-portal-fields two">
                    <label>
                      Nome deste acesso
                      <input
                        value={selected.name}
                        maxLength={120}
                        onChange={(event) =>
                          patchSelected({ name: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Cliente
                      <input
                        value={selected.clientName}
                        maxLength={160}
                        placeholder="Nome da empresa ou pessoa"
                        onChange={(event) =>
                          patchSelected({ clientName: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      E-mail de referência
                      <input
                        type="email"
                        value={selected.clientEmail}
                        maxLength={240}
                        placeholder="cliente@empresa.com"
                        onChange={(event) =>
                          patchSelected({ clientEmail: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Validade opcional
                      <input
                        type="datetime-local"
                        value={
                          selected.expiresAt
                            ? selected.expiresAt.slice(0, 16)
                            : ""
                        }
                        onChange={(event) =>
                          patchSelected({
                            expiresAt: event.target.value
                              ? new Date(event.target.value).toISOString()
                              : "",
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Título no portal
                    <input
                      value={selected.title}
                      maxLength={160}
                      onChange={(event) =>
                        patchSelected({ title: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Mensagem de boas-vindas
                    <textarea
                      value={selected.welcome}
                      maxLength={1200}
                      onChange={(event) =>
                        patchSelected({ welcome: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Orientação de suporte
                    <input
                      value={selected.supportText}
                      maxLength={500}
                      placeholder="Ex.: responderemos em até um dia útil"
                      onChange={(event) =>
                        patchSelected({ supportText: event.target.value })
                      }
                    />
                  </label>
                </section>

                <section className="client-portal-panel">
                  <div className="client-portal-panel-title">
                    <div>
                      <span>PERMISSÕES</span>
                      <h2>O que este cliente pode fazer</h2>
                    </div>
                    <LockKeyhole size={19} />
                  </div>
                  <div className="client-portal-permissions">
                    {Object.entries(CLIENT_PORTAL_PERMISSION_LABELS).map(
                      ([key, label]) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={!!selected.permissions?.[key]}
                            onChange={() => togglePermission(key)}
                          />
                          <span>
                            <Check size={14} />
                            {label}
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </section>

                <section className="client-portal-panel">
                  <div className="client-portal-panel-title">
                    <div>
                      <span>CONTEÚDO</span>
                      <h2>Registros liberados</h2>
                    </div>
                    <FolderKanban size={19} />
                  </div>
                  <p className="client-portal-help">
                    Nada é compartilhado por nome do cliente. Marque os registros
                    exatos que este link poderá acessar.
                  </p>
                  <label className="client-portal-inline-check">
                    <input
                      type="checkbox"
                      checked={selected.resources?.includeProjectTasks !== false}
                      onChange={(event) =>
                        patchSelected({
                          resources: {
                            includeProjectTasks: event.target.checked,
                          },
                        })
                      }
                    />
                    Incluir automaticamente as tarefas dos projetos marcados
                  </label>
                  <div className="client-portal-resources">
                    {CLIENT_PORTAL_RESOURCE_GROUPS.map((group) => {
                      const Icon = resourceIcon[group.key];
                      const options = resourceOptions(db, group.key, business);
                      const values = selected.resources?.[group.key] || [];
                      return (
                        <details key={group.key}>
                          <summary>
                            <span>
                              <Icon size={16} />
                              {group.label}
                            </span>
                            <b>{values.length}</b>
                          </summary>
                          <div>
                            {options.length ? (
                              options.map((option) => (
                                <label key={option.id}>
                                  <input
                                    type="checkbox"
                                    checked={values.includes(option.id)}
                                    disabled={
                                      group.key === "reportIds" &&
                                      !(
                                        selected.resources?.documentIds || []
                                      ).includes(option.id)
                                    }
                                    onChange={() =>
                                      toggleResource(group.key, option.id)
                                    }
                                  />
                                  <span>
                                    <strong>{option.label}</strong>
                                    {option.detail && (
                                      <small>{option.detail}</small>
                                    )}
                                  </span>
                                </label>
                              ))
                            ) : (
                              <p>Nenhum registro disponível neste módulo.</p>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>

                <section className="client-portal-panel">
                  <div className="client-portal-panel-title">
                    <div>
                      <span>APARÊNCIA</span>
                      <h2>Identidade do portal</h2>
                    </div>
                    <Palette size={19} />
                  </div>
                  <div className="client-portal-fields three">
                    <label>
                      Cor principal
                      <input
                        type="color"
                        value={selected.appearance?.primaryColor || "#0b9f8f"}
                        onChange={(event) =>
                          patchSelected({
                            appearance: { primaryColor: event.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      Cor de destaque
                      <input
                        type="color"
                        value={selected.appearance?.accentColor || "#16b8a6"}
                        onChange={(event) =>
                          patchSelected({
                            appearance: { accentColor: event.target.value },
                          })
                        }
                      />
                    </label>
                    <label className="wide">
                      URL HTTPS do logotipo
                      <input
                        type="url"
                        value={selected.appearance?.logoUrl || ""}
                        placeholder="https://..."
                        onChange={(event) =>
                          patchSelected({
                            appearance: { logoUrl: event.target.value },
                          })
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="client-portal-publish">
                  <div>
                    <span
                      className={`client-portal-live ${
                        selectedStatus?.active ? "active" : ""
                      }`}
                    >
                      {selectedStatus?.active ? "Portal ativo" : "Não publicado"}
                    </span>
                    <h2>Link individual do cliente</h2>
                    <p>
                      Publicar gera um novo token e invalida automaticamente o
                      link anterior.
                    </p>
                    {selectedStatus?.lastAccessedAt && (
                      <small>
                        Último acesso: {formatDate(selectedStatus.lastAccessedAt)}
                      </small>
                    )}
                  </div>
                  <div className="client-portal-publish-actions">
                    {links[selected.id] && (
                      <>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={copyLink}
                        >
                          <Copy size={15} /> Copiar
                        </button>
                        <a
                          className="btn ghost"
                          href={links[selected.id]}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={15} /> Abrir
                        </a>
                      </>
                    )}
                    {selectedStatus?.active && (
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={busy === "revoke"}
                        onClick={revoke}
                      >
                        Revogar
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy === "publish"}
                      onClick={publish}
                    >
                      {busy === "publish" ? (
                        <RefreshCw className="spin" size={16} />
                      ) : (
                        <Save size={16} />
                      )}
                      {selectedStatus?.active
                        ? "Gerar novo link"
                        : "Publicar portal"}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {tab === "events" && selected && (
              <div className="client-portal-events">
                <div className="client-portal-events-head">
                  <div>
                    <span>TRILHA DO CLIENTE</span>
                    <h2>Interações com protocolo</h2>
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={loadEvents}
                    disabled={busy === "events"}
                  >
                    <RefreshCw size={15} /> Atualizar
                  </button>
                </div>
                {events.length ? (
                  <div className="client-portal-event-list">
                    {events.map((event) => {
                      const Icon = eventIcon(event.type);
                      return (
                        <article key={event.id}>
                          <span className="client-portal-event-icon">
                            <Icon size={18} />
                          </span>
                          <div>
                            <div className="client-portal-event-title">
                              <strong>{statusLabel(event.type)}</strong>
                              <span>{event.protocol}</span>
                            </div>
                            <small>{formatDate(event.createdAt)}</small>
                            {event.payload?.title && (
                              <h3>{event.payload.title}</h3>
                            )}
                            {event.payload?.description && (
                              <p>{event.payload.description}</p>
                            )}
                            {event.payload?.feedback && (
                              <p>{event.payload.feedback}</p>
                            )}
                            {event.payload?.file && (
                              <button
                                type="button"
                                className="client-portal-file"
                                disabled={busy === `file-${event.id}`}
                                onClick={() => downloadEventFile(event)}
                              >
                                <Download size={14} />{" "}
                                {event.payload.file.name}
                              </button>
                            )}
                            {event.error && (
                              <p className="client-portal-event-error">
                                {event.error}
                              </p>
                            )}
                          </div>
                          <span
                            className={`client-portal-event-state ${event.status}`}
                          >
                            {event.status === "applied"
                              ? "Aplicado"
                              : event.status === "failed"
                                ? "Requer atenção"
                                : "Recebido"}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="client-portal-events-empty">
                    <ShieldCheck size={34} />
                    <h3>Nenhuma interação ainda</h3>
                    <p>
                      Chamados, documentos e aprovações aparecerão aqui com data
                      e protocolo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </section>
  );
}
