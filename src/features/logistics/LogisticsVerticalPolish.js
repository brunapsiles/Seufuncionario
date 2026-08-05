import "./LogisticsVerticalAccess.css";

const LABELS = new Map([
  ["VERTICAL PRIVADA · To Do Green", "TO DO GREEN"],
  ["VERTICAL PRIVADA · TO DO GREEN", "TO DO GREEN"],
  ["PORTAL TO DO GREEN", "TO DO GREEN"],
  ["Portal To Do Green", "To Do Green"],
  ["Vertical To Do Green protegida", "Acesso restrito"],
  ["Acesso restrito à To Do Green", "Acesso restrito"],
  ["Esta área só abre para usuários vinculados ao workspace da To Do Green ou com permissão individual ativa. Entrar pela URL não concede acesso.", "Entre com uma conta autorizada para acessar as rotinas da To Do Green."],
  ["Este ambiente é exclusivo para usuários autorizados da To Do Green. O acesso é liberado por convite, e-mail corporativo ou permissão individual ativa.", "Entre com uma conta autorizada para acessar as rotinas da To Do Green."],
  ["Usuário atual", "Conta"],
  ["Tenant", "Empresa"],
  ["Ambiente", "Empresa"],
  ["todogreen", "To Do Green"],
  ["Central To Do Green", "Painel operacional"],
  ["Logística sustentável com preço, operação e ESG no mesmo painel.", "Painel operacional"],
  ["Operação, pricing, ESG, pipeline e governança em uma experiência privada e objetiva.", "Acompanhe clientes, oportunidades, preços, operações, custos e indicadores ambientais."],
  ["A vertical agora separa módulos funcionais de backlog. Card sem fluxo real não aparece como pronto.", "Acompanhe clientes, oportunidades, preços, operações, custos e indicadores ambientais."],
  ["funções privadas com acesso controlado", "rotinas disponíveis"],
  ["módulos por tenant, com rota e permissão", "rotinas disponíveis"],
  ["módulos por tenant", "rotinas"],
  ["módulos", "rotinas"],
  ["Módulos", "Rotinas"],
  ["funcionais", "ativas"],
  ["funcional", "ativo"],
  ["backlog", "planejado"],
  ["Backlog", "Planejado"],
  ["Card sem fluxo real", "Item sem rotina liberada"],
  ["Visão real da vertical, sem card falso.", "Indicadores da operação"],
  ["Os indicadores abaixo são calculados a partir de clientes, oportunidades, simulações, receitas, custos e operações cadastradas.", "Os números abaixo usam os registros cadastrados nas rotinas da To Do Green."],
  ["Nenhum indicador real carregado ainda.", "Nenhum registro cadastrado ainda."],
  ["O painel não usa receita, cliente ou operação inventada como produção. Cadastre a primeira simulação ou ative o modo demonstração explicitamente.", "Cadastre clientes, simulações ou operações para alimentar os indicadores."],
  ["SEM DADOS FICTÍCIOS", "SEM REGISTROS"],
  ["Criar primeira simulação", "Criar simulação"],
  ["Produtos logísticos", "Produtos"],
  ["PRODUTOS LOGÍSTICOS", "PRODUTOS"],
  ["Calculadoras reais disponíveis", "Produtos disponíveis"],
  ["Abrir precificação", "Calcular preço"],
  ["Produto logístico customizado", "Projeto customizado"],
  ["Projeto logístico personalizado", "Projeto customizado"],
  ["Transferência entre CDs, hubs ou lojas", "Transferência entre CDs"],
  ["Receita, forecast e faturamento", "Receita e forecast"],
  ["Custos, OPEX e margem", "Custos e margem"],
  ["ESG, Green Score e Escopo 3", "ESG e Green Score"],
  ["Operação a granel", "Granel"],
  ["Distribuição fracionada", "Fracionado"],
  ["Abastecimento de lojas", "Abastecimento"],
  ["Coleta em fornecedores", "Coletas"],
  ["Operação dedicada", "Dedicada"],
  ["Calculadora Ambiental", "Cálculo ambiental"],
  ["Dashboard ESG", "Painel ESG"],
  ["Relatórios ESG", "Relatórios"],
  ["Certificados e declarações", "Declarações"],
  ["Remuneração Variável", "Comissões"],
  ["Oportunidades e pipeline", "Oportunidades"],
  ["Clientes e contatos", "Clientes"],
  ["Propostas e contratos", "Propostas"],
  ["Precificação e Deal Desk", "Precificação"],
  ["Receita e forecast", "Receita"],
  ["Custos e margem", "Custos"],
  ["Auditoria e governança", "Auditoria"],
  ["Metodologia e premissas", "Metodologia"],
  ["Cockpit executivo", "Painel"],
  ["COCKPIT EXECUTIVO", "PAINEL"],
  ["CRM enxuto para grandes contas sustentáveis", "Cadastro de clientes"],
  ["Oportunidades com produto, valor, estágio e probabilidade", "Oportunidades comerciais"],
  ["Proposta comercial com preço, operação e ROI ambiental", "Propostas"],
  ["PRECIFICAÇÃO LOGÍSTICA", "PRECIFICAÇÃO"],
  ["Logística sustentável", "Operação"],
  ["sustentável", ""],
  ["Sustentável", ""],
  ["Ver itens planejados desta área", "Ver planejados"],
  ["Planejado. Ainda não liberado como função.", "Planejado. Ainda não liberado."],
  ["Backlog mapeado; ainda não exibido como funcional.", "Planejado. Ainda não liberado."],
  ["Abrir módulo", "Abrir"],
]);

const BLOCKED_PATTERNS = [
  /\bvertical\b/gi,
  /\btenant\b/gi,
  /\bworkspace\b/gi,
  /\btudo em um só lugar\b/gi,
  /\bexperiência privada\b/gi,
  /\bproduto pronto\b/gi,
  /\bsem card falso\b/gi,
  /\bcard falso\b/gi,
  /\bcard\b/gi,
  /\bmódulo funcional\b/gi,
];

const replaceTextNode = (node) => {
  const original = node.nodeValue;
  if (!original) return;
  let next = original;
  for (const [from, to] of LABELS.entries()) {
    next = next.replaceAll(from, to);
  }
  BLOCKED_PATTERNS.forEach((pattern) => {
    next = next.replace(pattern, "").replace(/\s{2,}/g, " ");
  });
  next = next
    .replace(/ · planejado$/i, "")
    .replace(/ · ativo$/i, "")
    .replace(/\s+([,.])/g, "$1")
    .trimStart();
  if (next !== original) node.nodeValue = next;
};

const walk = (root) => {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll(".tdg *").forEach((element) => {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) replaceTextNode(node);
    }
  });
};

const markCards = () => {
  document.querySelectorAll(".tdg-module-card:not(.disabled), .tdg-product-card, .tdg-tabs button").forEach((button) => {
    button.setAttribute("data-tdg-clickable", "true");
    if (!button.getAttribute("aria-label")) {
      const label = button.textContent?.replace(/\s+/g, " ").trim();
      if (label) button.setAttribute("aria-label", `Abrir ${label}`);
    }
  });
};

const polishAccessScreen = () => {
  const denied = document.querySelector(".tdg-denied-card");
  if (!denied) return;
  denied.setAttribute("data-tdg-access", "private-portal");
  const terms = denied.querySelectorAll("dt, dd, h1, p, span");
  terms.forEach((element) => {
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) replaceTextNode(node);
    }
  });
};

const polish = () => {
  walk(document);
  markCards();
  polishAccessScreen();
};

if (typeof window !== "undefined") {
  const start = () => {
    polish();
    const observer = new MutationObserver(() => polish());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
