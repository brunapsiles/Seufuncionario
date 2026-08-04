import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  Globe2,
  Inbox,
  Mail,
  MessageSquareText,
  NotebookPen,
  Phone,
  Plus,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import { Button, Empty, Field, PageTitle } from "../../components/ui.jsx";
import { contactLinks } from "../../domain.js";
import { groupInteractions } from "./inboxDomain.js";

const PersonalInbox = lazy(() => import("../inbox/PersonalInbox.jsx"));

const INBOX_CHANNEL_META = {
  whatsapp: { label: "WhatsApp", icon: MessageSquareText },
  email: { label: "E-mail", icon: Mail },
  sms: { label: "SMS", icon: Phone },
  phone: { label: "Ligação", icon: Phone },
  form: { label: "Formulário do site", icon: Globe2 },
  note: { label: "Nota interna", icon: NotebookPen },
};

const inboxChannel = (id) =>
  INBOX_CHANNEL_META[id] || { label: id, icon: Inbox };

function InboxRegisterModal({ onClose, onSaved, setToast, logInteraction }) {
  const [form, setForm] = useState({
    channel: "note",
    direction: "in",
    contactName: "",
    contactHandle: "",
    subject: "",
    body: "",
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.body.trim() || saving) return;
    setSaving(true);
    const res = await logInteraction(form);
    setSaving(false);
    if (res?.ok) {
      onSaved();
      onClose();
      setToast?.("Registro adicionado à caixa de entrada");
    } else {
      setToast?.("Não foi possível registrar agora.");
    }
  };
  return (
    <Modal title="Registrar contato" onClose={onClose}>
      <div className="modal-body">
        <div className="form-grid">
          <Field label="Canal">
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
            >
              {Object.entries(INBOX_CHANNEL_META).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sentido">
            <select
              value={form.direction}
              onChange={(e) =>
                setForm({ ...form, direction: e.target.value })
              }
            >
              <option value="in">Recebido</option>
              <option value="out">Enviado</option>
            </select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Contato">
            <input
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
              placeholder="Nome do cliente ou empresa"
            />
          </Field>
          <Field label="Telefone ou e-mail" hint="Ajuda a reunir a conversa.">
            <input
              value={form.contactHandle}
              onChange={(e) =>
                setForm({ ...form, contactHandle: e.target.value })
              }
              placeholder="(11) 90000-0000 ou email@..."
            />
          </Field>
        </div>
        <Field label="Mensagem ou anotação">
          <textarea
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="O que foi conversado?"
          />
        </Field>
        <div className="wa-send-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            icon={Check}
            disabled={!form.body.trim() || saving}
            onClick={save}
          >
            {saving ? "Registrando..." : "Registrar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InboxThread({ thread, onMarkRead }) {
  const [open, setOpen] = useState(thread.unread > 0);
  return (
    <div className={`inbox-thread${thread.unread ? " has-unread" : ""}`}>
      <button
        type="button"
        className="inbox-thread-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="inbox-avatar">
          {(thread.name || "?").trim().charAt(0).toUpperCase()}
        </span>
        <span className="inbox-thread-info">
          <strong>{thread.name}</strong>
          {thread.handle && <small>{thread.handle}</small>}
        </span>
        <span className="inbox-thread-meta">
          {thread.unread > 0 && (
            <span className="inbox-unread">{thread.unread}</span>
          )}
          <small>{new Date(thread.last).toLocaleDateString("pt-BR")}</small>
        </span>
      </button>
      {open && (
        <div className="inbox-messages">
          {thread.items
            .slice()
            .sort((a, b) =>
              String(b.createdAt).localeCompare(String(a.createdAt)),
            )
            .map((it) => {
              const meta = inboxChannel(it.channel);
              const Icon = meta.icon;
              return (
                <div
                  key={it.id}
                  className={`inbox-message ${it.direction}${it.readAt ? "" : " unread"}`}
                >
                  <span className="inbox-message-icon">
                    <Icon />
                  </span>
                  <span className="inbox-message-body">
                    <span className="inbox-message-top">
                      <span className="inbox-chip">
                        {meta.label} ·{" "}
                        {it.direction === "out" ? "Enviado" : "Recebido"}
                      </span>
                      <small>
                        {new Date(it.createdAt).toLocaleString("pt-BR")}
                      </small>
                    </span>
                    {it.subject && <strong>{it.subject}</strong>}
                    {it.body && <p>{it.body}</p>}
                  </span>
                </div>
              );
            })}
          {thread.unread > 0 && (
            <div className="inbox-thread-actions">
              <Button
                variant="ghost"
                icon={Check}
                onClick={() =>
                  onMarkRead(
                    thread.items.filter((i) => !i.readAt).map((i) => i.id),
                  )
                }
              >
                Marcar como lidas
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InboxPage({ setToast, authHeaders, inboxUrl, logInteraction }) {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [registering, setRegistering] = useState(false);
  const load = useCallback(() => {
    setItems(null);
    fetch(inboxUrl(), { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, [authHeaders, inboxUrl]);
  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);
  const markRead = (ids) => {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) =>
      (prev || []).map((it) =>
        ids.includes(it.id) ? { ...it, readAt: it.readAt || now } : it,
      ),
    );
    fetch(inboxUrl(), {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  };
  const all = items || [];
  const unreadTotal = all.filter((i) => !i.readAt).length;
  const filtered = all.filter((it) => {
    if (filter === "todos") return true;
    if (filter === "naolidas") return !it.readAt;
    return it.channel === filter;
  });
  const threads = groupInteractions(filtered);
  const chips = [
    ["todos", "Tudo"],
    ["naolidas", `Não lidas${unreadTotal ? ` (${unreadTotal})` : ""}`],
    ["whatsapp", "WhatsApp"],
    ["email", "E-mail"],
    ["form", "Formulários"],
    ["note", "Notas"],
  ];
  return (
    <PageTitle
      eyebrow="VENDAS E CLIENTES"
      title="Caixa de entrada"
      text="Tudo que entra e sai — WhatsApp, e-mail, formulários e ligações — reunido por contato."
      action={
        <Button icon={Plus} onClick={() => setRegistering(true)}>
          Registrar contato
        </Button>
      }
    >
      <div className="inbox-filters">
        {chips.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`inbox-chip-btn${filter === id ? " active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {items === null ? (
        <p className="inbox-loading">Carregando a caixa de entrada...</p>
      ) : threads.length === 0 ? (
        <Empty
          icon={Inbox}
          title={
            all.length === 0
              ? "Sua caixa de entrada está pronta"
              : "Nada neste filtro"
          }
          text={
            all.length === 0
              ? "Cada WhatsApp ou e-mail que você enviar pelo app aparece aqui, reunido por contato. Você também pode registrar uma conversa manualmente."
              : "Troque o filtro acima para ver outros registros."
          }
          action={all.length === 0 ? "Registrar um contato" : undefined}
          onAction={all.length === 0 ? () => setRegistering(true) : undefined}
        />
      ) : (
        <div className="inbox-list">
          {threads.map((thread) => (
            <InboxThread
              key={thread.key}
              thread={thread}
              onMarkRead={markRead}
            />
          ))}
        </div>
      )}
      {registering && (
        <InboxRegisterModal
          onClose={() => setRegistering(false)}
          onSaved={load}
          setToast={setToast}
          logInteraction={logInteraction}
        />
      )}
    </PageTitle>
  );
}

export function ContactTimeline({ contact, authHeaders, inboxUrl }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(inboxUrl(), { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!cancelled) setItems(d.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authHeaders, inboxUrl]);
  const links = contactLinks(
    contact?.rawContact || contact?.phone || contact?.email || "",
  );
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const phone = digits(links.phone || contact?.phone);
  const email = String(links.email || contact?.email || "").toLowerCase();
  const name = String(contact?.name || "").toLowerCase();
  const matches = (it) => {
    if (contact?.id && it.contactId && it.contactId === contact.id) return true;
    const handleDigits = digits(it.contactHandle);
    if (phone && handleDigits && handleDigits.slice(-8) === phone.slice(-8))
      return true;
    if (email && String(it.contactHandle || "").toLowerCase() === email)
      return true;
    if (name && String(it.contactName || "").toLowerCase() === name)
      return true;
    return false;
  };
  const mine = (items || []).filter(matches);
  if (items === null)
    return <p className="inbox-loading">Carregando histórico...</p>;
  if (mine.length === 0)
    return (
      <div className="contact-timeline-empty">
        Ainda não há mensagens registradas com este contato. WhatsApp e e-mails
        que você enviar pelo app aparecem aqui.
      </div>
    );
  return (
    <div className="contact-timeline">
      {mine.slice(0, 20).map((it) => {
        const meta = inboxChannel(it.channel);
        const Icon = meta.icon;
        return (
          <div key={it.id} className={`inbox-message ${it.direction}`}>
            <span className="inbox-message-icon">
              <Icon />
            </span>
            <span className="inbox-message-body">
              <span className="inbox-message-top">
                <span className="inbox-chip">
                  {meta.label} ·{" "}
                  {it.direction === "out" ? "Enviado" : "Recebido"}
                </span>
                <small>{new Date(it.createdAt).toLocaleString("pt-BR")}</small>
              </span>
              {it.subject && <strong>{it.subject}</strong>}
              {it.body && <p>{it.body}</p>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function InboxHub({
  update,
  setToast,
  go,
  authHeaders,
  activeSpaceId,
  inboxUrl,
  logInteraction,
}) {
  const [mode, setMode] = useState("personal");
  const markNativeNotificationsRead = (keys) => {
    const ids = new Set(
      (keys || [])
        .filter((key) => key.startsWith("notification:"))
        .map((key) => key.slice("notification:".length)),
    );
    if (!ids.size) return;
    const now = new Date().toISOString();
    update((current) => ({
      ...current,
      notifications: (current.notifications || []).map((notification) =>
        ids.has(notification.id)
          ? {
              ...notification,
              read: true,
              readAt: notification.readAt || now,
            }
          : notification,
      ),
    }));
  };
  return (
    <>
      <div
        className="inbox-mode-tabs"
        role="tablist"
        aria-label="Tipo de caixa de entrada"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "personal"}
          className={mode === "personal" ? "active" : ""}
          onClick={() => setMode("personal")}
        >
          <Bell /> Pessoal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "conversations"}
          className={mode === "conversations" ? "active" : ""}
          onClick={() => setMode("conversations")}
        >
          <MessageSquareText /> Conversas com clientes
        </button>
      </div>
      {mode === "personal" ? (
        <Suspense
          fallback={<div className="inbox-loading">Carregando sua caixa...</div>}
        >
          <PersonalInbox
            go={go}
            setToast={setToast}
            authHeaders={authHeaders}
            ownerId={activeSpaceId()}
            onNativeRead={markNativeNotificationsRead}
          />
        </Suspense>
      ) : (
        <InboxPage
          setToast={setToast}
          authHeaders={authHeaders}
          inboxUrl={inboxUrl}
          logInteraction={logInteraction}
        />
      )}
    </>
  );
}
