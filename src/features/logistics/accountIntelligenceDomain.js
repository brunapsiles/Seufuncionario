const lower = (value) => String(value || "").trim().toLowerCase();

const ESG_HIGH = ["logística", "transporte", "varejo", "e-commerce", "indústria", "automot", "alimentos", "bebidas", "farmac", "energia", "mineração", "construção"];
const PROCUREMENT = ["procurement", "compras", "suprimentos", "sourcing", "supply"];
const LOGISTICS = ["logística", "logistica", "transporte", "transportes", "frete", "freight", "distribution", "distribuição", "carrier", "supply chain", "last mile", "middle mile"];
const DECISION_ROLES = ["patrocinador", "decisor econômico", "compras"];

export function assessAccount(account = {}) {
  const contacts = account.crm?.contacts || [];
  const hasCurrentDecisionEvidence = (contact) => contact.active !== false && contact.employmentStatus !== "former" &&
    (!contact.employmentCheckedAt || contact.currentEmploymentVerified === true);
  const activeContacts = contacts.filter((contact) => contact.active !== false && contact.employmentStatus !== "former");
  const currentDecisionContacts = contacts.filter(hasCurrentDecisionEvidence);
  const profile = lower(`${account.segment || ""} ${account.name || ""} ${account.notes || ""}`);
  const esgMatches = ESG_HIGH.filter((keyword) => profile.includes(keyword));
  const procurementContacts = currentDecisionContacts.filter((contact) => PROCUREMENT.some((keyword) => lower(`${contact.title} ${contact.department} ${contact.relationshipRole}`).includes(keyword)));
  const logisticsProcurementContacts = procurementContacts.filter((contact) => LOGISTICS.some((keyword) => lower(`${contact.title} ${contact.department} ${contact.specialty || ""}`).includes(keyword)));
  const decisionContacts = currentDecisionContacts.filter((contact) => DECISION_ROLES.includes(lower(contact.relationshipRole)));
  const staleContacts = contacts.filter((contact) => contact.active === false);
  const noChannel = contacts.filter((contact) => !contact.email && !contact.phone && !contact.linkedinUrl);

  const namedContact = activeContacts.find((contact) => contact.name)?.name || "o contato cadastrado";
  const completed = new Set(Array.isArray(account.crm?.completedSuggestedActions) ? account.crm.completedSuggestedActions : []);
  const candidates = [];
  if (!activeContacts.length) candidates.push({
    key: "map-first-contact",
    title: "Mapear ao menos um contato de Procurement de Logística e Transportes no Brasil.",
  });
  if (activeContacts.length && !procurementContacts.length) candidates.push({
    key: "request-procurement-referral",
    title: `Pedir a ${namedContact} a indicação de quem decide sobre contratação de transportes e logística no Brasil.`,
  });
  if (procurementContacts.length && !logisticsProcurementContacts.length) candidates.push({
    key: "validate-logistics-scope",
    title: `Confirmar com ${procurementContacts[0].name} se sua atuação inclui fretes, transportes ou logística no Brasil.`,
  });
  if (activeContacts.length && !decisionContacts.length) candidates.push({
    key: "confirm-economic-decision",
    title: "Confirmar o decisor econômico e o patrocinador interno antes da abordagem comercial.",
  });
  if (logisticsProcurementContacts.length && !account.crm?.nextAction) candidates.push({
    key: "schedule-procurement-approach",
    title: `Agendar uma abordagem com ${logisticsProcurementContacts[0].name} e registrar objetivo e prazo.`,
  });
  if (account.crm?.nextAction) candidates.push({
    key: `crm-next-action:${lower(account.crm.nextAction).slice(0, 80)}`,
    title: account.crm.nextAction,
  });
  const pending = candidates.find((item) => !completed.has(item.key)) || {
    key: "review-commercial-plan",
    title: "Revisar o estágio da conta e definir uma nova ação comercial com responsável e prazo.",
  };

  return {
    esgRelevance: esgMatches.length ? "Alta" : profile ? "A validar" : "Sem dados suficientes",
    esgReason: esgMatches.length
      ? `O perfil menciona ${esgMatches.slice(0, 3).join(", ")}, atividades em que emissões logísticas e cadeia de fornecedores costumam ser materiais.`
      : "Complete segmento, operação logística e compromissos ambientais para a IA avaliar a materialidade ESG sem suposição.",
    procurementContacts,
    logisticsProcurementContacts,
    strongestContacts: [...decisionContacts, ...procurementContacts].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 3),
    staleContacts,
    noChannel,
    nextTask: pending.title,
    nextTaskKey: pending.key,
    nextTaskCanComplete: !completed.has(pending.key),
  };
}

export const whatsappUrl = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return "";
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${international}`;
};

export const gmailComposeUrl = (address, subject = "") =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address || "")}&su=${encodeURIComponent(subject)}`;

export const outlookComposeUrl = (address, subject = "") =>
  `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(address || "")}&subject=${encodeURIComponent(subject)}`;
