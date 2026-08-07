// ===== O que uma venda dispara =====
//
import { contactLinks, today, uid } from "../domain.js";

// Jornada transversal: um pedido registrado vira, opcionalmente, uma receita no
// caixa; um lead ganho vira pedido e receita; um orçamento aprovado vira
// pedido. É para o negócio não digitar a mesma venda duas ou três vezes.
//
// Tudo puro, devolvendo null quando não há o que lançar — quem chama decide se
// grava. Uma função que grava sozinha esconde a decisão de quem a chamou.

// Jornada transversal: um pedido registrado vira, opcionalmente, uma receita
// no caixa — para o negócio não precisar digitar a mesma venda duas vezes.
// Pura e testável; devolve null quando não há valor a lançar.
export const buildOrderReceita = (
  order,
  { businessId, ownerId, dateYmd } = {},
) => {
  const value = Number(order?.total || 0);
  if (!(value > 0)) return null;
  return {
    id: uid(),
    type: "Receita",
    description: `Pedido — ${order.clientName || "cliente"}`,
    value,
    date: dateYmd || today(),
    category: "Vendas",
    businessId: businessId || null,
    ownerId: ownerId || null,
    sourceOrderId: order.id || null,
  };
};

// Jornada transversal: quando um lead é marcado como "Ganho", o negócio
// ganha uma tarefa de primeiro atendimento (Vendas → Operação) e um registro
// na linha do tempo do cliente. Puro e testável.
export const buildLeadWonSideEffects = (
  lead,
  { businessId, ownerId, dateYmd } = {},
) => {
  const now = new Date().toISOString();
  const handle =
    contactLinks(lead?.contact).phone ||
    contactLinks(lead?.contact).email ||
    lead?.contact ||
    "";
  const task = {
    id: uid(),
    title: `Iniciar atendimento — ${lead?.name || "novo cliente"}`,
    description:
      "Negócio fechado no CRM. Faça o primeiro atendimento e combine os próximos passos.",
    status: "A fazer",
    priority: "Alta",
    due: dateYmd || today(),
    project: lead?.project || "",
    businessId: businessId || null,
    ownerId: ownerId || null,
    sourceLeadId: lead?.id || null,
    createdAt: now,
    updatedAt: now,
  };
  const interaction = {
    channel: "note",
    direction: "out",
    contactName: lead?.name || "",
    contactHandle: handle,
    subject: "Negócio ganho",
    body: "Lead convertido em cliente. Uma tarefa de primeiro atendimento foi criada automaticamente.",
  };
  return { task, interaction };
};

// Total de um orçamento: soma das linhas menos desconto (nunca negativo).
export const quoteTotal = (quote) => {
  const items = (quote?.items || []).reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0,
  );
  const discount = Number(quote?.discount) || 0;
  return Math.max(0, items - discount);
};

// Jornada transversal: um orçamento aprovado vira um pedido (que, por sua vez,
// já lança receita e linha do tempo via buildOrderReceita). Puro e testável.
export const orderFromQuote = (quote, { businessId, ownerId } = {}) => {
  const now = new Date().toISOString();
  return {
    id: uid(),
    clientName: quote?.clientName || "",
    clientContact: quote?.clientContact || "",
    channel: "Orçamento",
    status: "Novo",
    items: (quote?.items || []).map((i) => ({
      productId: i.productId || "",
      name: i.name || "",
      price: Number(i.price) || 0,
      quantity: Number(i.quantity) || 1,
    })),
    notes: quote?.notes || "",
    total: quoteTotal(quote),
    businessId: businessId || null,
    ownerId: ownerId || null,
    sourceQuoteId: quote?.id || null,
    visibility: quote?.visibility || "espaco_todo",
    sharedWith: Array.isArray(quote?.sharedWith) ? quote.sharedWith : [],
    sharedTeams: Array.isArray(quote?.sharedTeams) ? quote.sharedTeams : [],
    createdAt: now,
    updatedAt: now,
  };
};
