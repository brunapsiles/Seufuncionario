import { useEffect, useMemo, useRef, useState } from "react";
import {
  AtSign,
  Check,
  Download,
  FileText,
  Hash,
  ListTodo,
  MessageSquareText,
  Paperclip,
  Pin,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Smile,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Modal from "../../components/Modal.jsx";
import {
  buildChatSummaryPrompt,
  channelDisplayName,
  channelLastActivity,
  channelUnreadCount,
  createChatChannel,
  createChatMessage,
  createTaskFromChatMessage,
  fallbackChatSummary,
  findDirectChannel,
  mentionHandle,
  searchChatMessages,
  threadMessages,
  toggleMessagePin,
  toggleMessageReaction,
} from "./corporateChatDomain.js";

const REACTIONS = ["👍", "❤️", "✅", "🎉"];
const MAX_CHAT_FILE_BYTES = 180_000;
const MAX_CHAT_ATTACHMENTS = 3;

const formatTime = (value) => {
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
    hour: "2-digit",
    minute: "2-digit",
  });
};

const readFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file?.size) {
      reject(new Error("O arquivo está vazio."));
      return;
    }
    if (file.size > MAX_CHAT_FILE_BYTES) {
      reject(
        new Error(
          `${file.name} excede 180 KB. Use um arquivo menor ou compartilhe um link.`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id:
          globalThis.crypto?.randomUUID?.() ||
          `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result,
        createdAt: new Date().toISOString(),
      });
    reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`));
    reader.readAsDataURL(file);
  });

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="corporate-chat-attachments">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.dataUrl}
          download={attachment.name}
          title={`Baixar ${attachment.name}`}
        >
          {String(attachment.type).startsWith("image/") ? (
            <img src={attachment.dataUrl} alt="" />
          ) : (
            <FileText aria-hidden="true" />
          )}
          <span>
            <strong>{attachment.name}</strong>
            <small>{Math.ceil(Number(attachment.size || 0) / 1024)} KB</small>
          </span>
          <Download aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function MessageCard({
  message,
  currentUserId,
  replyCount,
  onReply,
  onReact,
  onPin,
  onTask,
  compact = false,
}) {
  return (
    <article
      className={`corporate-chat-message${message.pinnedAt ? " pinned" : ""}${
        compact ? " compact" : ""
      }`}
      data-testid={`chat-message-${message.id}`}
    >
      <div className="corporate-chat-avatar" aria-hidden="true">
        {String(message.authorName || "?").trim().slice(0, 1).toUpperCase()}
      </div>
      <div className="corporate-chat-message-body">
        <header>
          <strong>{message.authorName || "Pessoa"}</strong>
          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
          {message.pinnedAt && (
            <span className="corporate-chat-pinned">
              <Pin size={12} /> Fixada
            </span>
          )}
        </header>
        {message.body && <p>{message.body}</p>}
        <AttachmentList attachments={message.attachments} />
        {!compact && (
          <div className="corporate-chat-message-actions">
            <div className="corporate-chat-reactions">
              {REACTIONS.map((emoji) => {
                const people = message.reactions?.[emoji] || [];
                const mine = people.includes(currentUserId);
                return (
                  <button
                    type="button"
                    key={emoji}
                    className={mine ? "active" : ""}
                    aria-label={`${mine ? "Remover" : "Adicionar"} reação ${emoji}`}
                    onClick={() => onReact(message, emoji)}
                  >
                    {emoji}
                    {people.length > 0 && <span>{people.length}</span>}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => onReply(message)}>
              <Reply size={14} />
              {replyCount ? `${replyCount} resposta(s)` : "Responder"}
            </button>
            <button type="button" onClick={() => onPin(message)}>
              <Pin size={14} />
              {message.pinnedAt ? "Desafixar" : "Fixar"}
            </button>
            <button type="button" onClick={() => onTask(message)}>
              <ListTodo size={14} /> Virar tarefa
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function ChannelModal({ kind, members, onClose, onSave }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState([]);
  const isDirect = kind === "direct";
  const isGroup = kind === "group";
  const title = isDirect
    ? "Nova mensagem direta"
    : isGroup
      ? "Novo grupo"
      : "Novo canal";

  const toggle = (id) =>
    setSelected((current) =>
      isDirect
        ? [id]
        : current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id],
    );

  const valid = isDirect
    ? selected.length === 1
    : isGroup
      ? name.trim() && selected.length > 0
      : name.trim();

  return (
    <Modal title={title} onClose={onClose}>
      <div className="corporate-chat-modal">
        {!isDirect && (
          <label>
            Nome
            <input
              autoFocus
              value={name}
              maxLength={80}
              placeholder={isGroup ? "Ex.: Lançamento do produto" : "Ex.: comercial"}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        {!isDirect && (
          <label>
            Assunto ou descrição
            <textarea
              value={topic}
              maxLength={240}
              placeholder="Para que esta conversa será usada?"
              onChange={(event) => setTopic(event.target.value)}
            />
          </label>
        )}
        {(isDirect || isGroup) && (
          <fieldset>
            <legend>{isDirect ? "Escolha uma pessoa" : "Escolha os participantes"}</legend>
            <div className="corporate-chat-member-picker">
              {members.length ? (
                members.map((member) => (
                  <label key={member.id} htmlFor={`chat-member-${member.id}`}>
                    <input
                      id={`chat-member-${member.id}`}
                      type={isDirect ? "radio" : "checkbox"}
                      name={isDirect ? "direct-member" : undefined}
                      aria-label={`Selecionar ${member.name || member.email}`}
                      checked={selected.includes(member.id)}
                      onChange={() => toggle(member.id)}
                    />
                    <span>
                      <strong>{member.name || member.email}</strong>
                      <small>{member.functionTitle || member.role || member.email}</small>
                    </span>
                  </label>
                ))
              ) : (
                <p>Convide pessoas em Meu Time antes de iniciar esta conversa.</p>
              )}
            </div>
          </fieldset>
        )}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!valid}
            onClick={() => onSave({ name, topic, memberIds: selected })}
          >
            <Check size={16} /> Criar conversa
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CorporateChat({
  db,
  update,
  business,
  setToast,
  authHeaders = () => ({}),
  ownerId = "",
}) {
  const userId = db.user?.id || "";
  const [remoteMembers, setRemoteMembers] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState("");
  const [channelModal, setChannelModal] = useState("");
  const [draft, setDraft] = useState("");
  const [threadDraft, setThreadDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [query, setQuery] = useState("");
  const [showPinned, setShowPinned] = useState(false);
  const [threadRootId, setThreadRootId] = useState("");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const suffix = ownerId ? `?owner=${encodeURIComponent(ownerId)}` : "";
    fetch(`/api/collab${suffix}`, { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const people = [...(payload?.members || [])];
        if (payload?.owner) people.push(payload.owner);
        setRemoteMembers(people);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authHeaders, ownerId]);

  const members = useMemo(() => {
    const map = new Map();
    for (const member of [db.user, ...remoteMembers]) {
      if (member?.id) map.set(member.id, member);
    }
    if (ownerId && !map.has(ownerId))
      map.set(ownerId, { id: ownerId, name: "Responsável do workspace" });
    return [...map.values()];
  }, [db.user, ownerId, remoteMembers]);

  const selectableMembers = members.filter((member) => member.id !== userId);
  const channels = useMemo(
    () =>
      (db.chatChannels || [])
        .filter(
          (channel) =>
            !channel.archivedAt &&
            (!business || !channel.businessId || channel.businessId === business.id),
        )
        .sort((a, b) =>
          channelLastActivity(db.chatMessages, b).localeCompare(
            channelLastActivity(db.chatMessages, a),
          ),
        ),
    [business, db.chatChannels, db.chatMessages],
  );
  const activeChannel =
    channels.find((channel) => channel.id === activeChannelId) || channels[0] || null;
  const activeReadState = (db.chatReadStates || []).find(
    (state) => state.channelId === activeChannel?.id && state.userId === userId,
  );
  const allChannelMessages = useMemo(
    () =>
      searchChatMessages(
        db.chatMessages || [],
        "",
        activeChannel?.id || "__none__",
      ),
    [activeChannel?.id, db.chatMessages],
  );
  const visibleMessages = useMemo(() => {
    const searched = searchChatMessages(
      allChannelMessages,
      query,
      activeChannel?.id || "__none__",
    );
    return searched.filter(
      (message) =>
        (query.trim() || !message.parentMessageId) &&
        (!showPinned || message.pinnedAt),
    );
  }, [activeChannel?.id, allChannelMessages, query, showPinned]);
  const thread = useMemo(
    () => threadMessages(allChannelMessages, threadRootId),
    [allChannelMessages, threadRootId],
  );
  const channelMembers =
    activeChannel?.type === "channel"
      ? members
      : members.filter((member) =>
          (activeChannel?.memberIds || activeChannel?.sharedWith || []).includes(
            member.id,
          ),
        );

  const updateReadState = (channelId, patch) => {
    if (!channelId || !userId) return;
    const recordId = `chat-read:${userId}:${channelId}`;
    update((current) => {
      const previous = (current.chatReadStates || []).find(
        (state) => state.id === recordId,
      );
      const next = {
        id: recordId,
        channelId,
        userId,
        ownerId: userId,
        businessId: business?.id || null,
        visibility: "privado",
        ...(previous || {}),
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...current,
        chatReadStates: previous
          ? (current.chatReadStates || []).map((state) =>
              state.id === recordId ? next : state,
            )
          : [...(current.chatReadStates || []), next],
      };
    });
  };

  const selectChannel = (channelId) => {
    setActiveChannelId(channelId);
    setThreadRootId("");
    setQuery("");
    setShowPinned(false);
    updateReadState(channelId, { lastReadAt: new Date().toISOString() });
  };

  const saveChannel = ({ name, topic, memberIds }) => {
    if (channelModal === "direct") {
      const existing = findDirectChannel(
        channels,
        userId,
        memberIds[0],
      );
      if (existing) {
        selectChannel(existing.id);
        setChannelModal("");
        setToast?.("Conversa direta aberta");
        return;
      }
    }
    const target = members.find((member) => member.id === memberIds[0]);
    const channel = createChatChannel({
      type: channelModal,
      name:
        channelModal === "direct"
          ? `Conversa com ${target?.name || "pessoa"}`
          : name,
      topic,
      memberIds,
      ownerId: userId,
      businessId: business?.id || null,
    });
    update((current) => ({
      ...current,
      chatChannels: [channel, ...(current.chatChannels || [])],
    }));
    setActiveChannelId(channel.id);
    setChannelModal("");
    setToast?.(
      channel.type === "channel"
        ? "Canal criado para toda a empresa"
        : channel.type === "group"
          ? "Grupo criado"
          : "Conversa direta criada",
    );
  };

  const addFiles = async (fileList) => {
    const room = Math.max(0, MAX_CHAT_ATTACHMENTS - attachments.length);
    const files = [...(fileList || [])].slice(0, room);
    const loaded = [];
    for (const file of files) {
      try {
        loaded.push(await readFile(file));
      } catch (error) {
        setToast?.(error.message);
      }
    }
    setAttachments((current) => [...current, ...loaded].slice(0, 3));
    if (fileRef.current) fileRef.current.value = "";
  };

  const persistMessage = (body, parentMessageId = null, messageFiles = []) => {
    if (!activeChannel) return null;
    const message = createChatMessage({
      body,
      attachments: messageFiles,
      parentMessageId,
      channel: activeChannel,
      authorId: userId,
      authorName: db.user?.name || db.user?.email || "Pessoa",
      businessId: business?.id || null,
      members,
    });
    if (!message) return null;
    update((current) => ({
      ...current,
      chatMessages: [...(current.chatMessages || []), message],
      chatChannels: (current.chatChannels || []).map((channel) =>
        channel.id === activeChannel.id
          ? { ...channel, updatedAt: message.createdAt }
          : channel,
      ),
      chatReadStates: (() => {
        const id = `chat-read:${userId}:${activeChannel.id}`;
        const previous = (current.chatReadStates || []).find(
          (state) => state.id === id,
        );
        const next = {
          id,
          channelId: activeChannel.id,
          userId,
          ownerId: userId,
          businessId: business?.id || null,
          visibility: "privado",
          ...(previous || {}),
          lastReadAt: message.createdAt,
          updatedAt: message.createdAt,
        };
        return previous
          ? (current.chatReadStates || []).map((state) =>
              state.id === id ? next : state,
            )
          : [...(current.chatReadStates || []), next];
      })(),
    }));
    return message;
  };

  const sendMessage = () => {
    if (!persistMessage(draft, null, attachments)) return;
    setDraft("");
    setAttachments([]);
    setToast?.("Mensagem enviada");
  };

  const sendThreadReply = () => {
    if (!persistMessage(threadDraft, threadRootId)) return;
    setThreadDraft("");
  };

  const patchMessage = (messageId, transform) =>
    update((current) => ({
      ...current,
      chatMessages: (current.chatMessages || []).map((message) =>
        message.id === messageId ? transform(message) : message,
      ),
    }));

  const convertToTask = (message) => {
    if ((db.tasks || []).some((task) => task.sourceChatMessageId === message.id)) {
      setToast?.("Esta mensagem já está vinculada a uma tarefa");
      return;
    }
    const task = createTaskFromChatMessage(message, {
      ownerId: userId,
      businessId: business?.id || null,
    });
    update((current) => ({
      ...current,
      tasks: [task, ...(current.tasks || [])],
    }));
    setToast?.("Mensagem convertida em tarefa");
  };

  const summarize = async () => {
    if (!activeChannel || summaryBusy) return;
    const fallback = fallbackChatSummary(allChannelMessages);
    if (!allChannelMessages.some((message) => message.body?.trim())) {
      updateReadState(activeChannel.id, {
        aiSummary: fallback,
        summaryGeneratedAt: new Date().toISOString(),
      });
      return;
    }
    setSummaryBusy(true);
    let content = "";
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          prompt: buildChatSummaryPrompt(activeChannel, allChannelMessages),
          specialist: "Diretor",
          workspaceOwnerId: ownerId || undefined,
          businessId: business?.id || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "IA indisponível");
      content = String(payload.content || "").trim();
      if (!content) throw new Error("Resumo vazio");
      setToast?.("Resumo da conversa atualizado");
    } catch {
      content = fallback;
      setToast?.("Resumo local criado; a IA poderá refiná-lo depois");
    } finally {
      updateReadState(activeChannel.id, {
        aiSummary: content || fallback,
        summaryGeneratedAt: new Date().toISOString(),
      });
      setSummaryBusy(false);
    }
  };

  const insertMention = (memberId, setter, current) => {
    const member = members.find((person) => person.id === memberId);
    if (!member) return;
    setter(`${current}${current && !current.endsWith(" ") ? " " : ""}@${mentionHandle(member)} `);
  };

  const renderChannelGroup = (type, title, Icon) => {
    const rows = channels.filter((channel) => channel.type === type);
    if (!rows.length) return null;
    return (
      <section className="corporate-chat-channel-group">
        <h3>{title}</h3>
        {rows.map((channel) => {
          const state = (db.chatReadStates || []).find(
            (item) => item.channelId === channel.id && item.userId === userId,
          );
          const count = channelUnreadCount(
            (db.chatMessages || []).filter(
              (message) => message.channelId === channel.id,
            ),
            state,
            userId,
          );
          return (
            <button
              type="button"
              key={channel.id}
              className={activeChannel?.id === channel.id ? "active" : ""}
              onClick={() => selectChannel(channel.id)}
            >
              <Icon aria-hidden="true" />
              <span>
                <strong>
                  {type === "channel" ? "#" : ""}
                  {channelDisplayName(channel, members, userId)}
                </strong>
                <small>
                  {channel.topic ||
                    (type === "direct"
                      ? "Mensagem direta"
                      : `${channel.memberIds?.length || 0} participantes`)}
                </small>
              </span>
              {count > 0 && <b aria-label={`${count} não lidas`}>{count}</b>}
            </button>
          );
        })}
      </section>
    );
  };

  return (
    <>
      <div className="page-title corporate-chat-title">
        <div>
          <span className="eyebrow">COLABORAÇÃO</span>
          <h1>Chat corporativo</h1>
          <p>
            Canais, grupos, mensagens diretas e decisões conectadas ao trabalho.
          </p>
        </div>
        <div className="corporate-chat-title-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setChannelModal("group")}
          >
            <Users size={16} /> Novo grupo
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => setChannelModal("channel")}
          >
            <Plus size={16} /> Novo canal
          </button>
        </div>
      </div>

      <section className="corporate-chat-shell">
        <aside className="corporate-chat-sidebar">
          <button
            type="button"
            className="corporate-chat-new-direct"
            onClick={() => setChannelModal("direct")}
          >
            <MessageSquareText /> Nova mensagem direta
          </button>
          <div className="corporate-chat-member-status">
            <span />
            {members.length} pessoa(s) no workspace
          </div>
          <div className="corporate-chat-channel-list">
            {renderChannelGroup("channel", "Canais", Hash)}
            {renderChannelGroup("group", "Grupos", Users)}
            {renderChannelGroup("direct", "Mensagens diretas", MessageSquareText)}
            {!channels.length && (
              <div className="corporate-chat-empty-side">
                <Hash />
                <strong>Comece pelo canal geral</strong>
                <p>Crie o primeiro espaço de conversa da empresa.</p>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => setChannelModal("channel")}
                >
                  Criar canal
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="corporate-chat-main">
          {activeChannel ? (
            <>
              <header className="corporate-chat-head">
                <div>
                  <h2>
                    {activeChannel.type === "channel" && "# "}
                    {channelDisplayName(activeChannel, members, userId)}
                  </h2>
                  <p>
                    {activeChannel.topic ||
                      (activeChannel.type === "channel"
                        ? "Canal aberto para toda a empresa"
                        : `${channelMembers.length} participante(s)`)}
                  </p>
                </div>
                <div className="corporate-chat-head-actions">
                  <button
                    type="button"
                    className={`btn ghost sm${showPinned ? " active" : ""}`}
                    onClick={() => setShowPinned((value) => !value)}
                  >
                    <Pin size={15} /> Fixadas
                  </button>
                  <button
                    type="button"
                    className="btn secondary sm"
                    disabled={summaryBusy}
                    onClick={summarize}
                  >
                    {summaryBusy ? (
                      <RefreshCw className="spin" size={15} />
                    ) : (
                      <Sparkles size={15} />
                    )}
                    Resumir com IA
                  </button>
                </div>
              </header>

              <div className="corporate-chat-search">
                <Search aria-hidden="true" />
                <input
                  value={query}
                  placeholder="Buscar mensagens, pessoas ou arquivos"
                  aria-label="Buscar mensagens"
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => setQuery("")}
                  >
                    <X />
                  </button>
                )}
              </div>

              {activeReadState?.aiSummary && (
                <aside className="corporate-chat-summary">
                  <header>
                    <span>
                      <Sparkles /> Resumo da conversa
                    </span>
                    <small>
                      {formatTime(activeReadState.summaryGeneratedAt)}
                    </small>
                  </header>
                  <p>{activeReadState.aiSummary}</p>
                  <button
                    type="button"
                    aria-label="Fechar resumo"
                    onClick={() =>
                      updateReadState(activeChannel.id, {
                        aiSummary: null,
                        summaryGeneratedAt: null,
                      })
                    }
                  >
                    <X />
                  </button>
                </aside>
              )}

              <div className="corporate-chat-feed" aria-live="polite">
                {visibleMessages.length ? (
                  visibleMessages.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      currentUserId={userId}
                      replyCount={allChannelMessages.filter(
                        (candidate) => candidate.parentMessageId === message.id,
                      ).length}
                      onReply={(item) =>
                        setThreadRootId(item.parentMessageId || item.id)
                      }
                      onReact={(item, emoji) =>
                        patchMessage(item.id, (current) =>
                          toggleMessageReaction(current, emoji, userId),
                        )
                      }
                      onPin={(item) =>
                        patchMessage(item.id, (current) =>
                          toggleMessagePin(current, userId),
                        )
                      }
                      onTask={convertToTask}
                    />
                  ))
                ) : (
                  <div className="corporate-chat-empty-feed">
                    {query || showPinned ? <Search /> : <MessageSquareText />}
                    <strong>
                      {query
                        ? "Nenhuma mensagem encontrada"
                        : showPinned
                          ? "Nenhuma mensagem fixada"
                          : "A conversa começa aqui"}
                    </strong>
                    <p>
                      {query || showPinned
                        ? "Ajuste o filtro para ver outras mensagens."
                        : "Compartilhe uma atualização, decisão ou pergunta com o time."}
                    </p>
                  </div>
                )}
              </div>

              <div className="corporate-chat-composer">
                {attachments.length > 0 && (
                  <div className="corporate-chat-draft-files">
                    {attachments.map((attachment) => (
                      <span key={attachment.id}>
                        <FileText />
                        {attachment.name}
                        <button
                          type="button"
                          aria-label={`Remover ${attachment.name}`}
                          onClick={() =>
                            setAttachments((current) =>
                              current.filter((item) => item.id !== attachment.id),
                            )
                          }
                        >
                          <X />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  value={draft}
                  aria-label="Mensagem"
                  placeholder={`Mensagem para ${channelDisplayName(
                    activeChannel,
                    members,
                    userId,
                  )}`}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <footer>
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      multiple
                      onChange={(event) => addFiles(event.target.files)}
                    />
                    <button
                      type="button"
                      title="Anexar arquivo"
                      disabled={attachments.length >= MAX_CHAT_ATTACHMENTS}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Paperclip />
                    </button>
                    <label className="corporate-chat-mention">
                      <AtSign />
                      <select
                        aria-label="Inserir menção"
                        value=""
                        onChange={(event) =>
                          insertMention(event.target.value, setDraft, draft)
                        }
                      >
                        <option value="">Mencionar</option>
                        {channelMembers
                          .filter((member) => member.id !== userId)
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name || member.email}
                            </option>
                          ))}
                      </select>
                    </label>
                    <span className="corporate-chat-emoji-hint">
                      <Smile /> Shift + Enter para nova linha
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!draft.trim() && !attachments.length}
                    onClick={sendMessage}
                  >
                    <Send size={16} /> Enviar
                  </button>
                </footer>
              </div>
            </>
          ) : (
            <div className="corporate-chat-no-channel">
              <MessageSquareText />
              <h2>Conversas da empresa em um só lugar</h2>
              <p>
                Crie canais abertos, grupos privados ou uma mensagem direta.
              </p>
              <button
                type="button"
                className="btn primary"
                onClick={() => setChannelModal("channel")}
              >
                <Plus size={16} /> Criar primeiro canal
              </button>
            </div>
          )}
        </main>

        {threadRootId && thread.length > 0 && (
          <aside className="corporate-chat-thread">
            <header>
              <div>
                <strong>Thread</strong>
                <small>{Math.max(0, thread.length - 1)} resposta(s)</small>
              </div>
              <button
                type="button"
                aria-label="Fechar thread"
                onClick={() => setThreadRootId("")}
              >
                <X />
              </button>
            </header>
            <div className="corporate-chat-thread-feed">
              {thread.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  compact
                  currentUserId={userId}
                  onReply={() => {}}
                  onReact={() => {}}
                  onPin={() => {}}
                  onTask={() => {}}
                />
              ))}
            </div>
            <div className="corporate-chat-thread-composer">
              <textarea
                value={threadDraft}
                aria-label="Responder na thread"
                placeholder="Responder na thread"
                onChange={(event) => setThreadDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendThreadReply();
                  }
                }}
              />
              <div>
                <label className="corporate-chat-mention">
                  <AtSign />
                  <select
                    aria-label="Inserir menção na thread"
                    value=""
                    onChange={(event) =>
                      insertMention(
                        event.target.value,
                        setThreadDraft,
                        threadDraft,
                      )
                    }
                  >
                    <option value="">Mencionar</option>
                    {channelMembers
                      .filter((member) => member.id !== userId)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name || member.email}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn primary sm"
                  aria-label="Enviar resposta na thread"
                  disabled={!threadDraft.trim()}
                  onClick={sendThreadReply}
                >
                  <Send size={14} /> Responder
                </button>
              </div>
            </div>
          </aside>
        )}
      </section>

      {channelModal && (
        <ChannelModal
          kind={channelModal}
          members={selectableMembers}
          onClose={() => setChannelModal("")}
          onSave={saveChannel}
        />
      )}
    </>
  );
}
