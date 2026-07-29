import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  AtSign,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  ListTodo,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  groupPersonalInboxItems,
  personalInboxSummary,
} from "./personalInboxDomain.js";

const FILTERS = [
  ["all", "Tudo"],
  ["mention", "Menções"],
  ["task", "Tarefas"],
  ["comment", "Comentários"],
  ["approval", "Aprovações"],
  ["change", "Alterações"],
  ["snoozed", "Adiadas"],
];

const KIND_META = {
  mention: { label: "Menção", icon: AtSign },
  task: { label: "Tarefa", icon: ListTodo },
  comment: { label: "Comentário", icon: MessageSquareText },
  approval: { label: "Aprovação", icon: ShieldCheck },
  change: { label: "Alteração", icon: AlertTriangle },
  notification: { label: "Notificação", icon: Bell },
};

const tomorrowMorning = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 0, 0, 0);
  return date.toISOString();
};

const nextWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(8, 0, 0, 0);
  return date.toISOString();
};

const formatWhen = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};

const dueLabel = (value) => {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `Prazo ${date.toLocaleDateString("pt-BR")}`;
};

export default function PersonalInbox({
  go,
  setToast,
  authHeaders = () => ({}),
  ownerId = "",
  onNativeRead,
}) {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const endpoint = `/api/inbox/personal${
    ownerId ? `?owner=${encodeURIComponent(ownerId)}` : ""
  }`;

  const load = useCallback(async (signal) => {
    try {
      const response = await fetch(endpoint, {
        headers: authHeaders(),
        signal,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error || "Não foi possível carregar sua caixa de entrada.",
        );
      setError("");
      setItems(payload.items || []);
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      setItems([]);
      setError(
        loadError.message || "Não foi possível carregar sua caixa de entrada.",
      );
    }
  }, [authHeaders, endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    const start = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(start);
      controller.abort();
    };
  }, [load]);

  const patch = async (action, ids, until = null) => {
    const keys = [...new Set((ids || []).filter(Boolean))];
    if (!keys.length || busy) return;
    const previous = items;
    const now = new Date().toISOString();
    setBusy(true);
    setItems((current) =>
      (current || []).map((item) => {
        if (!keys.includes(item.id)) return item;
        if (action === "read") return { ...item, readAt: item.readAt || now };
        if (action === "unread") return { ...item, readAt: null };
        if (action === "snooze")
          return { ...item, snoozedUntil: until, snoozed: true };
        if (action === "unsnooze")
          return { ...item, snoozedUntil: null, snoozed: false };
        return item;
      }),
    );
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action, ids: keys, until }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "A ação não pôde ser concluída.");
      if (action === "read") onNativeRead?.(keys);
    } catch (patchError) {
      setItems(previous);
      setToast?.(patchError.message || "A ação não pôde ser concluída.");
    } finally {
      setBusy(false);
    }
  };

  const now = new Date().toISOString();
  const summary = useMemo(
    () => personalInboxSummary(items || [], now),
    [items, now],
  );
  const visible = useMemo(
    () =>
      (items || []).filter((item) => {
        if (filter === "snoozed") return item.snoozed;
        if (item.snoozed) return false;
        return filter === "all" || item.kind === filter;
      }),
    [items, filter],
  );
  const groups = useMemo(() => groupPersonalInboxItems(visible), [visible]);
  const unreadIds = visible.filter((item) => !item.readAt).map((item) => item.id);

  const openItem = (item) => {
    if (!item.readAt) patch("read", [item.id]);
    if (item.link) go?.(item.link);
  };

  return (
    <>
      <div className="page-title personal-inbox-title">
        <div>
          <span className="eyebrow">MEU TRABALHO</span>
          <h1>Caixa de entrada pessoal</h1>
          <p>
            Menções, tarefas, comentários, aprovações e mudanças importantes,
            organizadas em um só lugar.
          </p>
        </div>
        <div className="personal-inbox-title-actions">
          <button
            type="button"
            className="btn ghost"
            disabled={items === null || busy}
            onClick={() => load()}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          {unreadIds.length > 0 && (
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => patch("read", unreadIds)}
            >
              <CheckCheck size={16} /> Marcar tudo como lido
            </button>
          )}
        </div>
      </div>

      <section className="personal-inbox-summary" aria-label="Resumo da caixa de entrada">
        <div>
          <strong>{summary.unread}</strong>
          <span>não lidas</span>
        </div>
        <div>
          <strong>{summary.mentions}</strong>
          <span>menções</span>
        </div>
        <div>
          <strong>{summary.approvals}</strong>
          <span>aprovações</span>
        </div>
        <div>
          <strong>{summary.snoozed}</strong>
          <span>adiadas</span>
        </div>
      </section>

      <div className="inbox-filters personal-inbox-filters" role="tablist">
        {FILTERS.map(([id, label]) => {
          const count =
            id === "mention"
              ? summary.mentions
              : id === "task"
                ? summary.tasks
                : id === "comment"
                  ? summary.comments
                  : id === "approval"
                    ? summary.approvals
                    : id === "change"
                      ? summary.changes
                      : id === "snoozed"
                        ? summary.snoozed
                        : summary.total;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={filter === id}
              key={id}
              className={`inbox-chip-btn${filter === id ? " active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      {items === null ? (
        <p className="inbox-loading">
          <RefreshCw className="spin" /> Organizando suas prioridades...
        </p>
      ) : error ? (
        <div className="personal-inbox-error" role="alert">
          <AlertTriangle />
          <div>
            <strong>Não foi possível abrir sua caixa</strong>
            <p>{error}</p>
          </div>
          <button className="btn secondary" onClick={() => load()}>
            Tentar novamente
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="personal-inbox-empty">
          <CheckCheck />
          <h3>Nada pendente neste filtro</h3>
          <p>
            Novas atribuições, menções, comentários e decisões aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="personal-inbox-groups">
          {groups.map((group) => {
            const meta = KIND_META[group.kind] || KIND_META.notification;
            const Icon = meta.icon;
            return (
              <details
                className={`personal-inbox-group${group.unread ? " has-unread" : ""}`}
                key={group.id}
                open
              >
                <summary>
                  <span className={`personal-inbox-kind kind-${group.kind}`}>
                    <Icon />
                  </span>
                  <span className="personal-inbox-group-copy">
                    <strong>{group.title}</strong>
                    <small>
                      {meta.label} · {group.items.length}{" "}
                      {group.items.length === 1 ? "item" : "itens"}
                    </small>
                  </span>
                  {group.unread > 0 && (
                    <span className="inbox-unread">{group.unread}</span>
                  )}
                  <ChevronDown className="personal-inbox-chevron" />
                </summary>
                <div className="personal-inbox-items">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className={`personal-inbox-item${item.readAt ? "" : " unread"}`}
                    >
                      <button
                        type="button"
                        className="personal-inbox-item-main"
                        onClick={() => openItem(item)}
                      >
                        <span className="personal-inbox-item-copy">
                          <span>
                            {item.actorName && <b>{item.actorName}</b>}
                            {item.message}
                          </span>
                          <small>
                            {formatWhen(item.createdAt)}
                            {item.dueAt && ` · ${dueLabel(item.dueAt)}`}
                            {item.priority && ` · ${item.priority}`}
                          </small>
                        </span>
                      </button>
                      <div className="personal-inbox-item-actions">
                        {item.snoozed ? (
                          <button
                            type="button"
                            className="icon-button"
                            title="Trazer de volta"
                            aria-label="Trazer notificação de volta"
                            disabled={busy}
                            onClick={() => patch("unsnooze", [item.id])}
                          >
                            <RefreshCw />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="icon-button"
                              title="Adiar até amanhã"
                              aria-label="Adiar notificação até amanhã"
                              disabled={busy}
                              onClick={() =>
                                patch("snooze", [item.id], tomorrowMorning())
                              }
                            >
                              <Clock3 />
                            </button>
                            <button
                              type="button"
                              className="personal-inbox-week"
                              disabled={busy}
                              onClick={() =>
                                patch("snooze", [item.id], nextWeek())
                              }
                            >
                              1 semana
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="icon-button"
                          title={
                            item.readAt
                              ? "Marcar como não lida"
                              : "Marcar como lida"
                          }
                          aria-label={
                            item.readAt
                              ? "Marcar notificação como não lida"
                              : "Marcar notificação como lida"
                          }
                          disabled={busy}
                          onClick={() =>
                            patch(item.readAt ? "unread" : "read", [item.id])
                          }
                        >
                          <Check />
                        </button>
                      </div>
                    </article>
                  ))}
                  {group.unread > 0 && (
                    <button
                      type="button"
                      className="personal-inbox-group-read"
                      disabled={busy}
                      onClick={() =>
                        patch(
                          "read",
                          group.items
                            .filter((item) => !item.readAt)
                            .map((item) => item.id),
                        )
                      }
                    >
                      <CheckCheck /> Marcar grupo como lido
                    </button>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
