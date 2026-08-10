const lower = (value) => String(value || "").trim().toLowerCase();

const ESG_HIGH = ["logística", "transporte", "varejo", "e-commerce", "indústria", "automot", "alimentos", "bebidas", "farmac", "energia", "mineração", "construção"];
const PROCUREMENT = ["procurement", "compras", "suprimentos", "sourcing", "supply"];
const DECISION_ROLES = ["patrocinador", "decisor econômico", "compras"];

export function assessAccount(account = {}) {
  const contacts = account.crm?.contacts || [];
  const profile = lower(`${account.segment || ""} ${account.name || ""} ${account.notes || ""}`);
  const esgMatches = ESG_HIGH.filter((keyword) => profile.includes(keyword));
  const procurementContacts = contacts.filter((contact) => PROCUREMENT.some((keyword) => lower(`${contact.title} ${contact.department} ${contact.relationshipRole}`).includes(keyword)));
  const decisionContacts = contacts.filter((contact) => DECISION_ROLES.includes(lower(contact.relationshipRole)));
  const staleContacts = contacts.filter((contact) => contact.active === false);
  const noChannel = contacts.filter((contact) => !contact.email && !contact.phone && !contact.linkedinUrl);

  let nextTask;
  if (!contacts.length) nextTask = "Mapear ao menos um contato de compras/procurement e um patrocinador da operação.";
  else if (!procurementContacts.length) nextTask = "Identificar quem lidera Compras, Procurement ou Strategic Sourcing nesta empresa.";
  else if (!decisionContacts.length) nextTask = "Confirmar o decisor econômico e o patrocinador interno antes da abordagem comercial.";
  else if (!account.crm?.nextAction) nextTask = `Agendar uma abordagem com ${procurementContacts[0].name} e registrar objetivo e prazo.`;
  else nextTask = account.crm.nextAction;

  return {
    esgRelevance: esgMatches.length ? "Alta" : profile ? "A validar" : "Sem dados suficientes",
    esgReason: esgMatches.length
      ? `O perfil menciona ${esgMatches.slice(0, 3).join(", ")}, atividades em que emissões logísticas e cadeia de fornecedores costumam ser materiais.`
      : "Complete segmento, operação logística e compromissos ambientais para a IA avaliar a materialidade ESG sem suposição.",
    procurementContacts,
    strongestContacts: [...decisionContacts, ...procurementContacts].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 3),
    staleContacts,
    noChannel,
    nextTask,
  };
}

export const whatsappUrl = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${international}`;
};

export const gmailComposeUrl = (address, subject = "") =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address || "")}&su=${encodeURIComponent(subject)}`;

export const outlookComposeUrl = (address, subject = "") =>
  `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(address || "")}&subject=${encodeURIComponent(subject)}`;
