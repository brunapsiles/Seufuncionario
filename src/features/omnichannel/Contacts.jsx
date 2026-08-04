import { useEffect, useRef, useState } from "react";
import {
  Edit3,
  Mail,
  MessageSquareText,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
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
import { contactLinks, uid } from "../../domain.js";
import { ContactTimeline } from "./InboxHub.jsx";

export default function Contacts({
  db,
  update,
  business,
  setToast,
  searchSeed,
  clearSearchSeed,
  authHeaders,
  inboxUrl,
  parseDelimitedText,
  trackProductEvent,
  SharingFields,
  EmailComposer,
  useWhatsappSender,
}) {
  const wa = useWhatsappSender({ db, setToast });
  const importRef = useRef(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [emailContact, setEmailContact] = useState(null);
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
  }, [searchTerm]);

  const blankContact = {
    name: "",
    rawContact: "",
    company: "",
    notes: "",
    visibility: "privado",
    sharingPermission: "visualizar",
    sharedWith: [],
    sharedTeams: [],
  };
  const [form, setForm] = useState(blankContact);
  const contacts = (db.contacts || [])
    .filter((c) => !business || c.businessId === business.id)
    .filter(
      (c) =>
        !searchTerm ||
        `${c.name} ${c.company || ""} ${c.rawContact || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const openContact = (item = null) => {
    setEditing(item?.id || null);
    setForm(item ? { ...blankContact, ...item } : blankContact);
    setModal(true);
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    const { phone, email } = contactLinks(form.rawContact);
    const item = {
      ...form,
      name: form.name.trim(),
      phone,
      email,
      id: editing || uid(),
      businessId: business?.id || null,
      ownerId: form.ownerId || db.user.id,
      createdAt: form.createdAt || now,
      updatedAt: now,
    };
    update((d) => ({
      ...d,
      contacts: editing
        ? (d.contacts || []).map((c) => (c.id === editing ? item : c))
        : [item, ...(d.contacts || [])],
    }));
    setModal(false);
    setToast(editing ? "Contato atualizado" : "Contato adicionado");
  };

  const importContacts = async (file) => {
    if (!file) return;
    try {
      const rows = parseDelimitedText(await file.text());
      const existingKeys = new Set(
        (db.contacts || []).flatMap((item) =>
          [item.email, item.phone]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase()),
        ),
      );
      const now = new Date().toISOString();
      const imported = rows
        .map((row) => {
          const name = row.nome || row.name || row.contato || "";
          const email = row.email || row["e-mail"] || "";
          const phone =
            row.telefone || row.whatsapp || row.celular || row.phone || "";
          return {
            id: uid(),
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            rawContact: phone.trim() || email.trim(),
            company: (row.empresa || row.company || row.organizacao || "").trim(),
            notes: (row.observacoes || row.observacao || row.notes || "").trim(),
            businessId: business?.id || null,
            ownerId: db.user.id,
            visibility: "privado",
            sharingPermission: "visualizar",
            sharedWith: [],
            sharedTeams: [],
            createdAt: now,
            updatedAt: now,
          };
        })
        .filter((item) => item.name)
        .filter((item) => {
          const keys = [item.email, item.phone]
            .filter(Boolean)
            .map((value) => value.toLowerCase());
          if (keys.some((key) => existingKeys.has(key))) return false;
          keys.forEach((key) => existingKeys.add(key));
          return true;
        });
      if (!imported.length)
        throw new Error("Nenhum contato novo foi encontrado no arquivo.");
      update((current) => ({
        ...current,
        contacts: [...imported, ...(current.contacts || [])],
      }));
      trackProductEvent("import_completed", {
        module: "contatos",
        kind: "csv",
        count: imported.length,
        success: true,
      });
      setToast(`${imported.length} contato(s) importado(s)`);
    } catch (error) {
      setToast(error.message || "Não foi possível importar os contatos");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const removeContact = (id) => {
    if (!confirm("Excluir este contato?")) return;
    update((d) => ({
      ...d,
      contacts: (d.contacts || []).filter((c) => c.id !== id),
    }));
  };

  return (
    <PageTitle
      eyebrow="CONTATOS"
      title="Todas as pessoas em um só lugar"
      text="Reúne automaticamente quem você cadastra no CRM, em Agendamentos e em Pedidos — também dá para adicionar direto por aqui."
      action={
        <div className="page-actions">
          <input
            ref={importRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            hidden
            onChange={(event) => importContacts(event.target.files?.[0])}
          />
          <Button
            variant="secondary"
            icon={Upload}
            onClick={() => importRef.current?.click()}
          >
            Importar CSV
          </Button>
          <Button icon={Plus} onClick={() => openContact()}>
            Novo contato
          </Button>
        </div>
      }
    >
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            type="search"
            placeholder="Buscar por nome, empresa ou contato"
            value={searchTerm}
            onChange={(e) => {
              setSearch(e.target.value);
              clearSearchSeed?.();
            }}
            aria-label="Buscar contatos"
          />
        </div>
      </div>
      {contacts.length === 0 ? (
        <Empty
          icon={Users}
          title="Nenhum contato ainda"
          text="Cadastre um contato ou use o CRM, Agendamentos e Pedidos — eles aparecem aqui automaticamente."
          action="Novo contato"
          onAction={() => openContact()}
        />
      ) : (
        <div className="data-list">
          {contacts.slice(0, visibleCount).map((c) => (
            <article key={c.id}>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.company || "Sem empresa"}
                  {c.rawContact && ` · ${c.rawContact}`}
                </small>
              </span>
              <span className="task-actions">
                {c.phone && (
                  <button
                    className="icon-button"
                    aria-label={`Enviar WhatsApp para ${c.name}`}
                    title="Enviar WhatsApp"
                    onClick={() =>
                      wa.open({
                        phone: c.phone,
                        category: "Contato",
                        vars: {
                          nome: c.name || "",
                          negocio: business?.name || "",
                        },
                      })
                    }
                  >
                    <MessageSquareText />
                  </button>
                )}
                {c.email && (
                  <button
                    className="icon-button"
                    aria-label={`Enviar e-mail para ${c.name}`}
                    title="Enviar e-mail"
                    onClick={() => setEmailContact(c)}
                  >
                    <Mail />
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={`Editar ${c.name}`}
                  onClick={() => openContact(c)}
                >
                  <Edit3 />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Excluir ${c.name}`}
                  onClick={() => removeContact(c.id)}
                >
                  <Trash2 />
                </button>
              </span>
            </article>
          ))}
          <LoadMoreButton
            shown={Math.min(visibleCount, contacts.length)}
            total={contacts.length}
            onClick={() => setVisibleCount((c) => c + LIST_PAGE_SIZE)}
          />
        </div>
      )}
      {modal && (
        <Modal
          title={editing ? "Editar contato" : "Novo contato"}
          onClose={() => setModal(false)}
        >
          <form className="modal-body" onSubmit={save}>
            <Field label="Nome">
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Empresa (opcional)">
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </Field>
              <Field label="WhatsApp ou e-mail">
                <input
                  value={form.rawContact}
                  onChange={(e) =>
                    setForm({ ...form, rawContact: e.target.value })
                  }
                  placeholder="(11) 98888-7777"
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
              value={form}
              onChange={(next) => setForm({ ...form, ...next })}
              teams={db.teams}
            />
            {editing && (
              <div className="field">
                <span>Histórico com este contato</span>
                <ContactTimeline
                  contact={{
                    id: editing,
                    name: form.name,
                    rawContact: form.rawContact,
                  }}
                  authHeaders={authHeaders}
                  inboxUrl={inboxUrl}
                />
              </div>
            )}
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save}>
                {editing ? "Salvar alterações" : "Salvar contato"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {emailContact && (
        <EmailComposer
          onClose={() => setEmailContact(null)}
          setToast={setToast}
          initial={{
            to: emailContact.email,
            subject: `Contato${business?.name ? ` - ${business.name}` : ""}`,
          }}
        />
      )}
      {wa.modal}
    </PageTitle>
  );
}
