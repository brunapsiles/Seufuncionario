// ===== O que os dados dizem sobre a conta =====
//
// Quatro leituras que saem da mesma matéria-prima — a linha do tempo, a
// carteira de produtos e o cadastro — e que hoje eram feitas de cabeça pela
// equipe, ou não eram feitas:
//
//   Health Score      a conta está saudável ou está morrendo devagar?
//   Next Best Action  qual é a próxima coisa a fazer, e por quê?
//   White Space       o que a To Do Green vende que esta conta ainda não compra?
//   Share of Wallet   quanto do gasto logístico dela é nosso?
//
// A regra que atravessa as quatro, e que é o motivo de este arquivo existir
// separado da tela: TODO NÚMERO CARREGA O PORQUÊ. Um score de 62 sem os
// fatores que o formaram é um palpite com cara de medição — e a equipe
// comercial aprende rápido a ignorar número que não sabe explicar.
//
// A segunda regra: falta de dado é dita, nunca preenchida. Share of Wallet
// sem o gasto logístico total do cliente não é 100%; é "não dá para saber".

const numero = (valor) => (Number.isFinite(Number(valor)) ? Number(valor) : 0);
const arredondar = (valor, casas = 0) => {
  const fator = 10 ** casas;
  return Math.round(numero(valor) * fator) / fator;
};
const limitar = (valor, minimo = 0, maximo = 100) => Math.min(maximo, Math.max(minimo, numero(valor)));

// ===== Health Score =====
//
// Cinco fatores, com peso declarado. Os pesos ficam aqui, visíveis e
// versionados, porque mudar a régua da saúde da carteira é decisão de gestão
// — não pode ser um número escondido no meio de uma função.

export const VERSAO_DA_SAUDE = "2026.1";

export const FATORES_DE_SAUDE = Object.freeze([
  { id: "atividade", peso: 30, rotulo: "Atividade recente" },
  { id: "relacionamento", peso: 25, rotulo: "Mapa de relacionamento" },
  { id: "pipeline", peso: 20, rotulo: "Pipeline vivo" },
  { id: "entrega", peso: 15, rotulo: "Qualidade da entrega" },
  { id: "dados", peso: 10, rotulo: "Completude do cadastro" },
]);

const notaDeAtividade = (dias) => {
  // Conta nova não é conta parada: sem evento nenhum a nota não é zero, é
  // desconhecida — e o motivo diz isso.
  if (dias === null || dias === undefined)
    return { nota: null, porque: "Nenhuma interação registrada ainda." };
  if (dias <= 7) return { nota: 100, porque: `Atividade há ${dias} dia(s).` };
  if (dias <= 15) return { nota: 80, porque: `Última atividade há ${dias} dias.` };
  if (dias <= 30) return { nota: 55, porque: `Última atividade há ${dias} dias.` };
  if (dias <= 60) return { nota: 30, porque: `Sem atividade há ${dias} dias.` };
  return { nota: 5, porque: `Sem atividade há ${dias} dias — a conta esfriou.` };
};

const notaDeRelacionamento = (contatos = []) => {
  const ativos = contatos.filter((item) => item?.active !== false && item?.name);
  if (!ativos.length) return { nota: 0, porque: "Nenhum contato mapeado." };
  const comCanal = ativos.filter((item) => item.email || item.phone || item.linkedinUrl);
  const decisores = ativos.filter((item) =>
    ["decisor econômico", "patrocinador"].includes(String(item.relationshipRole || "").toLowerCase()));
  const compras = ativos.filter((item) =>
    /compras|procurement|suprimentos|sourcing|supply/i.test(`${item.title} ${item.department} ${item.relationshipRole}`));
  const nota = limitar(
    (comCanal.length ? 34 : 0) + (decisores.length ? 33 : 0) + (compras.length ? 33 : 0),
  );
  const faltas = [
    comCanal.length ? "" : "nenhum contato com canal",
    decisores.length ? "" : "decisor econômico não mapeado",
    compras.length ? "" : "Compras não mapeado",
  ].filter(Boolean);
  return {
    nota,
    porque: faltas.length
      ? `${ativos.length} contato(s); falta: ${faltas.join(", ")}.`
      : `${ativos.length} contato(s), com canal, decisor e Compras mapeados.`,
  };
};

const notaDePipeline = (oportunidades = []) => {
  const abertas = oportunidades.filter((item) => !["ganha", "perdida"].includes(String(item?.stage || "").toLowerCase()));
  if (!oportunidades.length) return { nota: 0, porque: "Nenhuma oportunidade registrada." };
  if (!abertas.length) return { nota: 20, porque: "Nenhuma oportunidade aberta no momento." };
  const valor = abertas.reduce((soma, item) => soma + numero(item.contract_value || item.monthly_value), 0);
  return {
    nota: limitar(40 + abertas.length * 20),
    porque: `${abertas.length} oportunidade(s) aberta(s)${valor ? ` somando ${arredondar(valor)}` : ""}.`,
  };
};

const notaDeEntrega = (operacoes = []) => {
  if (!operacoes.length) return { nota: null, porque: "Nenhuma operação executada ainda." };
  const comIncidente = operacoes.filter((item) => numero(item.incident_count) > 0);
  const foraDoSla = operacoes.filter((item) => String(item.sla_status || "").toLowerCase() === "violado");
  const nota = limitar(100 - (comIncidente.length / operacoes.length) * 60 - (foraDoSla.length / operacoes.length) * 40);
  return {
    nota: arredondar(nota),
    porque: `${operacoes.length} operação(ões): ${comIncidente.length} com ocorrência, ${foraDoSla.length} fora do SLA.`,
  };
};

const notaDeDados = (conta = {}) => {
  const campos = [
    ["segmento", conta.segment],
    ["documento", conta.document],
    ["etapa", conta.stage],
    ["próxima ação", conta.nextAction],
    ["sede", conta.headquarters],
  ];
  const preenchidos = campos.filter(([, valor]) => String(valor || "").trim());
  const faltando = campos.filter(([, valor]) => !String(valor || "").trim()).map(([nome]) => nome);
  return {
    nota: arredondar((preenchidos.length / campos.length) * 100),
    porque: faltando.length ? `Falta preencher: ${faltando.join(", ")}.` : "Cadastro completo.",
  };
};

/**
 * Saúde da conta com a memória do cálculo junto.
 *
 * Fator sem dado NÃO vira zero: ele sai da média e o peso é redistribuído.
 * Zerar o que não se sabe puniria a conta nova exatamente como pune a conta
 * abandonada — e essas duas exigem decisões opostas.
 */
export function saudeDaConta({ conta = {}, contatos = [], oportunidades = [], operacoes = [], diasSemAtividade } = {}) {
  const calculados = {
    atividade: notaDeAtividade(diasSemAtividade),
    relacionamento: notaDeRelacionamento(contatos),
    pipeline: notaDePipeline(oportunidades),
    entrega: notaDeEntrega(operacoes),
    dados: notaDeDados(conta),
  };
  const fatores = FATORES_DE_SAUDE.map((fator) => ({
    ...fator,
    nota: calculados[fator.id].nota,
    porque: calculados[fator.id].porque,
    considerado: calculados[fator.id].nota !== null,
  }));
  const considerados = fatores.filter((fator) => fator.considerado);
  const pesoTotal = considerados.reduce((soma, fator) => soma + fator.peso, 0);
  const score = pesoTotal
    ? arredondar(considerados.reduce((soma, fator) => soma + fator.nota * fator.peso, 0) / pesoTotal)
    : null;
  return {
    versao: VERSAO_DA_SAUDE,
    score,
    faixa: score === null ? "sem dados" : score >= 75 ? "saudável" : score >= 45 ? "atenção" : "crítica",
    fatores,
    ignorados: fatores.filter((fator) => !fator.considerado).map((fator) => fator.rotulo),
  };
}

// ===== White Space =====
//
// O que a To Do Green vende e esta conta ainda não compra. Sai do catálogo
// real de produtos contra o que a conta já tem em operação, contrato ou
// oportunidade — não de uma lista escrita à mão que envelhece sozinha.

export function whiteSpace({ catalogo = [], operacoes = [], contratos = [], oportunidades = [] } = {}) {
  const usados = new Set();
  const registrar = (valor) => { const id = String(valor || "").trim(); if (id) usados.add(id); };
  for (const item of operacoes) registrar(item.product_id);
  for (const item of contratos) registrar(item.product_id);
  for (const item of oportunidades) registrar(item.product_id);

  const atuais = catalogo.filter((produto) => usados.has(produto.id));
  const espacos = catalogo.filter((produto) => !usados.has(produto.id));
  return {
    atuais: atuais.map((produto) => ({ id: produto.id, nome: produto.name })),
    espacos: espacos.map((produto) => ({ id: produto.id, nome: produto.name })),
    penetracao: catalogo.length ? arredondar((atuais.length / catalogo.length) * 100) : 0,
    // Sem nenhum produto ativo não existe white space a atacar: existe uma
    // conta que ainda não comprou nada, que é outra conversa.
    leitura: atuais.length
      ? `${atuais.length} de ${catalogo.length} produtos ativos; ${espacos.length} em aberto.`
      : "Nenhum produto ativo nesta conta ainda.",
  };
}

// ===== Share of Wallet =====
//
// Quanto do gasto logístico do cliente é nosso. Só existe se alguém informou
// o gasto total — que é dado do cliente, não do nosso banco.

export function shareOfWallet({ receitaAnualNossa = 0, gastoLogisticoAnualDoCliente = 0 } = {}) {
  const nossa = numero(receitaAnualNossa);
  const total = numero(gastoLogisticoAnualDoCliente);
  if (total <= 0)
    return {
      percentual: null,
      potencial: null,
      leitura:
        "Gasto logístico anual do cliente não informado — sem ele não dá para calcular participação. Registre a estimativa na visão 360º.",
    };
  const percentual = arredondar(Math.min(100, (nossa / total) * 100), 1);
  return {
    percentual,
    potencial: arredondar(Math.max(0, total - nossa)),
    leitura:
      percentual >= 60
        ? `Somos ${percentual}% do gasto logístico — conta consolidada.`
        : `Somos ${percentual}% do gasto logístico; restam ${arredondar(total - nossa)} com concorrentes.`,
  };
}

// ===== Next Best Action =====
//
// Uma ação, com o motivo e a urgência. Regras em ordem de prioridade, e a
// primeira que casa vence — porque entregar sete sugestões é a mesma coisa
// que não entregar nenhuma.
//
// Cada regra aponta para algo que a pessoa consegue FAZER na vertical hoje.
// Sugestão que não tem tela para executar vira frustração.

const REGRAS = [
  {
    id: "sem-contato",
    urgencia: "alta",
    quando: ({ contatos }) => !contatos.filter((item) => item?.name && item?.active !== false).length,
    acao: "Mapear o primeiro contato da conta",
    porque: "Não há nenhum contato registrado — sem pessoa não há venda.",
    onde: "Editar 360º → Mapa de relacionamento",
  },
  {
    id: "sem-compras",
    urgencia: "alta",
    quando: ({ contatos }) =>
      !contatos.some((item) => /compras|procurement|suprimentos|sourcing|supply/i.test(`${item.title} ${item.department} ${item.relationshipRole}`)),
    acao: "Identificar quem lidera Compras ou Procurement",
    porque: "Nenhum contato de Compras mapeado; a decisão de frete passa por lá.",
    onde: "Pesquisar contatos",
  },
  {
    id: "parada",
    urgencia: "alta",
    quando: ({ diasSemAtividade }) => numero(diasSemAtividade) >= 30,
    acao: "Retomar contato com a conta",
    porque: ({ diasSemAtividade }) => `Sem nenhuma interação registrada há ${diasSemAtividade} dias.`,
    onde: "Linha do tempo da conta",
  },
  {
    id: "sem-pesquisa",
    urgencia: "media",
    quando: ({ pesquisaEm }) => !pesquisaEm,
    acao: "Pesquisar a empresa na web",
    porque: "A conta nunca foi pesquisada: RFQs, portal de fornecedor e metas ESG ainda são desconhecidos.",
    onde: "Inteligência externa",
  },
  {
    id: "sem-proxima-acao",
    urgencia: "media",
    quando: ({ conta }) => !String(conta?.nextAction || "").trim(),
    acao: "Definir a próxima ação e o prazo",
    porque: "A conta está sem próximo passo combinado.",
    onde: "Editar 360º",
  },
  {
    id: "white-space",
    urgencia: "media",
    quando: ({ espacos }) => espacos.length > 0 && espacos.length < 9,
    acao: ({ espacos }) => `Propor ${espacos[0].nome}`,
    porque: ({ espacos }) => `A conta já compra outros produtos, mas ${espacos.length} continuam em aberto.`,
    onde: "Oportunidades",
  },
  {
    id: "sem-pipeline",
    urgencia: "media",
    quando: ({ oportunidades }) =>
      !oportunidades.some((item) => !["ganha", "perdida"].includes(String(item?.stage || "").toLowerCase())),
    acao: "Abrir uma oportunidade para a conta",
    porque: "Não há nenhuma oportunidade aberta neste momento.",
    onde: "Oportunidades",
  },
];

const resolver = (valor, contexto) => (typeof valor === "function" ? valor(contexto) : valor);

export function proximaMelhorAcao(contexto = {}) {
  const dados = {
    conta: contexto.conta || {},
    contatos: Array.isArray(contexto.contatos) ? contexto.contatos.filter(Boolean) : [],
    oportunidades: Array.isArray(contexto.oportunidades) ? contexto.oportunidades : [],
    espacos: Array.isArray(contexto.espacos) ? contexto.espacos : [],
    diasSemAtividade: contexto.diasSemAtividade,
    pesquisaEm: contexto.pesquisaEm,
  };
  for (const regra of REGRAS) {
    if (!regra.quando(dados)) continue;
    return {
      id: regra.id,
      urgencia: regra.urgencia,
      acao: resolver(regra.acao, dados),
      porque: resolver(regra.porque, dados),
      onde: regra.onde,
    };
  }
  // Nada pendente é uma resposta legítima, e dizer isso vale mais do que
  // inventar uma tarefa para a tela não ficar vazia.
  return {
    id: "em-dia",
    urgencia: "baixa",
    acao: "Seguir o plano combinado",
    porque: "Contatos mapeados, pipeline vivo, pesquisa feita e próxima ação definida.",
    onde: "Linha do tempo da conta",
  };
}
