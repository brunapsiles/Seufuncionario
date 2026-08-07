// ===== Modelos de mensagem do WhatsApp =====
//
// O público faz vendas inteiras pelo WhatsApp; digitar a mesma mensagem toda
// vez é atrito. Modelos com variáveis ({{nome}}, {{valor}}) preenchidas a
// partir do próprio registro fecham esse ciclo — sem API paga do Meta e sem
// credencial externa.

// ── Modelos de mensagem do WhatsApp ─────────────────────────────────────
// O público faz vendas inteiras pelo WhatsApp; digitar a mesma mensagem toda
// vez é atrito. Modelos reutilizáveis com variáveis ({{nome}}, {{valor}}...)
// preenchidas a partir do próprio registro (lead, pedido, agendamento) fecham
// esse ciclo — 100% grátis, sem API paga do Meta e sem credenciais externas.
export const DEFAULT_WA_TEMPLATES = [
  {
    id: "wa-boasvindas",
    name: "Boas-vindas",
    category: "Contato",
    body: "Olá {{nome}}, tudo bem? Aqui é da {{negocio}}. Obrigado pelo contato! Como posso te ajudar?",
  },
  {
    id: "wa-pedido",
    name: "Confirmação de pedido",
    category: "Pedido",
    body: "Olá {{nome}}! Seu pedido na {{negocio}} ({{itens}}) está no status: {{status}}. Total: {{valor}}. Qualquer dúvida, é só chamar.",
  },
  {
    id: "wa-agendamento",
    name: "Confirmação de agendamento",
    category: "Agendamento",
    body: "Olá {{nome}}, confirmando seu horário na {{negocio}}: {{servico}}, no dia {{data}} às {{hora}}. Até lá!",
  },
  {
    id: "wa-cobranca",
    name: "Cobrança amigável",
    category: "Cobrança",
    body: "Oi {{nome}}, tudo bem? Passando para lembrar do pagamento de {{valor}} referente a {{descricao}}. Qualquer coisa, estou à disposição!",
  },
  {
    id: "wa-agradecimento",
    name: "Agradecimento pós-venda",
    category: "Pedido",
    body: "{{nome}}, muito obrigado pela preferência! Espero que tenha gostado. Se puder, me conta o que achou. 🙏",
  },
];

export const WA_TEMPLATE_CATEGORIES = [
  "Contato",
  "Pedido",
  "Agendamento",
  "Cobrança",
  "Outros",
];

// Substitui {{chave}} pelo valor correspondente; variáveis sem valor viram
// [chave] para o usuário perceber e completar antes de enviar.
export const fillWhatsappTemplate = (body, vars = {}) =>
  String(body || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value == null || value === "" ? `[${key}]` : String(value);
  });
