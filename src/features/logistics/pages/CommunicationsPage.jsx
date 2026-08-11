import { useMemo, useState } from "react";
import { ExternalLink, Mail, MessageCircle, Search, Users } from "lucide-react";
import { InboxPage } from "../../omnichannel/InboxHub.jsx";
import { inboxUrl, logInteraction } from "../../../session/telemetria.js";
import { gmailComposeUrl, isTrustedCrmContact, outlookComposeUrl, whatsappUrl } from "../accountIntelligenceDomain.js";
import "./CommunicationsPage.css";

const cleanContacts = (clients = []) => {
  const unique = new Map();
  clients.flatMap((client) =>
    (client.crm?.contacts || []).filter((contact) => contact?.name && isTrustedCrmContact(contact)).map((contact) => ({
      ...contact,
      clientId: client.id,
      clientName: client.name,
    })),
  ).forEach((contact) => {
    const email = String(contact.email || "").trim().toLowerCase();
    const linkedin = String(contact.linkedinUrl || "").trim().toLowerCase();
    const phone = String(contact.phone || "").replace(/\D/g, "");
    const identity = email || linkedin || contact.id || `${String(contact.name).toLowerCase()}:${phone}:${String(contact.title || "").toLowerCase()}`;
    const key = [
      contact.clientId,
      identity,
    ].join(":");
    if (!unique.has(key)) unique.set(key, contact);
  });
  return [...unique.values()];
};

export default function CommunicationsPage({ authHeaders, clients = [], onNavigate, setToast }) {
  const [search, setSearch] = useState("");
  const contacts = useMemo(() => cleanContacts(clients), [clients]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts.slice(0, 30);
    return contacts.filter((contact) =>
      [contact.name, contact.clientName, contact.title, contact.department, contact.email, contact.phone]
        .some((value) => String(value || "").toLowerCase().includes(term)),
    ).slice(0, 80);
  }, [contacts, search]);

  return (
    <section className="tdg-communications-page">
      <section className="tdg-panel tdg-communications-contacts">
        <header className="tdg-page-title">
          <div><span>RELACIONAMENTO</span><h2>Comunicação com clientes</h2><p>Contatos do CRM e histórico de WhatsApp, e-mail, ligação, formulário e notas em um só lugar.</p></div>
        </header>
        <div className="tdg-communications-note">WhatsApp, Gmail, Outlook e LinkedIn abrem o canal correto daquele contato. O histórico só registra mensagens confirmadas ou anotações adicionadas por você.</div>
        <label className="tdg-communications-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar contato, empresa, cargo, e-mail ou telefone" /></label>
        {contacts.length === 0 ? <div className="tdg-work-empty"><Users size={22} />Nenhum contato com nome cadastrado no CRM.</div> : <div className="tdg-communications-grid">{visible.map((contact) => {
          const whatsapp = whatsappUrl(contact.phone);
          const subject = `To Do Green · ${contact.clientName}`;
          return <article key={`${contact.clientId}:${contact.id || contact.email || contact.phone || contact.name}`}>
            <button type="button" className="tdg-communications-person" onClick={() => onNavigate?.(`/todogreen/clientes?client=${encodeURIComponent(contact.clientId)}`)}><strong>{contact.name}</strong><small>{contact.title || contact.department || "Função não informada"} · {contact.clientName}</small></button>
            <div>{contact.email && <a href={`mailto:${contact.email}`}><Mail size={13} />{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}</div>
            <footer>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={14} />WhatsApp</a>}{contact.email && <><a href={gmailComposeUrl(contact.email, subject)} target="_blank" rel="noreferrer">Gmail</a><a href={outlookComposeUrl(contact.email, subject)} target="_blank" rel="noreferrer">Outlook</a></>}{contact.linkedinUrl && <a href={contact.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />LinkedIn</a>}</footer>
          </article>;
        })}</div>}
      </section>
      <section className="tdg-panel tdg-communications-inbox">
        <InboxPage setToast={setToast} authHeaders={authHeaders} inboxUrl={inboxUrl} logInteraction={logInteraction} />
      </section>
    </section>
  );
}
