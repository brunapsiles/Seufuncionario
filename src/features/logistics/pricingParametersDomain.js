// ===== Parâmetros comerciais: margem, OPEX, imposto, comissão =====
// Camada pura.
//
// Até aqui esses números viviam fixos no código: mudar a margem mínima exigia
// alterar um arquivo e publicar. Para uma transportadora isso é inviável —
// margem muda por produto, por cliente e por período, e quem decide é o gestor
// comercial.
//
// Mesmo padrão do Green Score: régua tem versão. Cadastrar uma versão nova não
// recalcula proposta antiga; cada simulação guarda com qual régua nasceu. Sem
// isso, uma decisão de julho reescreveria silenciosamente o preço aprovado em
// janeiro — e ninguém conseguiria explicar ao cliente por que o número mudou.

export const PARAMETROS_VERSAO_PADRAO = "v1.2026";

// Cada parâmetro com faixa aceitável e o que ele significa na conta. A
// descrição não é enfeite: é o que o gestor lê antes de mexer.
export const PARAMETROS = {
  minimumMarginPercent: {
    rotulo: "Margem mínima",
    descricao: "Piso de margem. Abaixo disso a proposta exige aprovação do Deal Desk.",
    min: 0,
    max: 80,
    sufixo: "%",
  },
  targetMarginPercent: {
    rotulo: "Margem alvo",
    descricao: "Margem usada para calcular o preço recomendado.",
    min: 0,
    max: 90,
    sufixo: "%",
  },
  opexPercent: {
    rotulo: "OPEX",
    descricao: "Despesa operacional aplicada sobre o custo direto.",
    min: 0,
    max: 60,
    sufixo: "%",
  },
  adminPercent: {
    rotulo: "Administrativo",
    descricao: "Rateio de estrutura sobre o custo direto.",
    min: 0,
    max: 60,
    sufixo: "%",
  },
  taxPercent: {
    rotulo: "Impostos",
    descricao: "Carga tributária sobre o custo direto.",
    min: 0,
    max: 60,
    sufixo: "%",
  },
  riskPercent: {
    rotulo: "Risco",
    descricao: "Provisão para avaria, atraso e reentrega.",
    min: 0,
    max: 40,
    sufixo: "%",
  },
  commissionPercent: {
    rotulo: "Comissão",
    descricao: "Percentual sobre o preço de venda, não sobre o custo.",
    min: 0,
    max: 30,
    sufixo: "%",
  },
};

export const CHAVES_PARAMETROS = Object.keys(PARAMETROS);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const arredondar = (v, casas = 2) => {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
};

// Onde a fórmula do motor quebra em silêncio:
//
//   preço = custoCarregado / max(0.01, 1 − margem − comissão)
//
// Se margem + comissão chegar a 100%, o divisor é travado em 0,01 e o preço
// vira cem vezes o custo. Não dá erro; devolve um número absurdo com cara de
// cálculo. Por isso a soma é barrada aqui, antes de virar régua.
export const LIMITE_MARGEM_MAIS_COMISSAO = 90;

export const validarParametros = (valores = {}) => {
  const erros = [];
  const limpos = {};

  for (const [chave, definicao] of Object.entries(PARAMETROS)) {
    const valor = num(valores[chave]);
    if (Number.isNaN(valor)) {
      erros.push(`${definicao.rotulo}: informe um número.`);
      continue;
    }
    if (valor < definicao.min || valor > definicao.max) {
      erros.push(
        `${definicao.rotulo}: use um valor entre ${definicao.min}% e ${definicao.max}%.`,
      );
      continue;
    }
    limpos[chave] = arredondar(valor);
  }

  if (erros.length) return { valido: false, erros, parametros: null };

  // Margem alvo abaixo da mínima significa que o preço recomendado nasce
  // abaixo do piso: toda proposta cairia em aprovação, e o "recomendado"
  // deixaria de recomendar coisa alguma.
  if (limpos.targetMarginPercent < limpos.minimumMarginPercent)
    erros.push(
      "A margem alvo não pode ser menor que a margem mínima — o preço recomendado nasceria abaixo do piso.",
    );

  const soma = limpos.targetMarginPercent + limpos.commissionPercent;
  if (soma >= LIMITE_MARGEM_MAIS_COMISSAO)
    erros.push(
      `Margem alvo (${limpos.targetMarginPercent}%) mais comissão (${limpos.commissionPercent}%) somam ${arredondar(soma)}%. Acima de ${LIMITE_MARGEM_MAIS_COMISSAO}% a fórmula de preço perde o sentido e devolve um valor irreal.`,
    );

  const somaMinima = limpos.minimumMarginPercent + limpos.commissionPercent;
  if (somaMinima >= LIMITE_MARGEM_MAIS_COMISSAO)
    erros.push(
      `Margem mínima mais comissão somam ${arredondar(somaMinima)}%, acima do limite de ${LIMITE_MARGEM_MAIS_COMISSAO}%.`,
    );

  if (erros.length) return { valido: false, erros, parametros: null };
  return { valido: true, erros: [], parametros: limpos };
};

// Efeito da mudança em cima de um custo de referência. É o que responde
// "quanto isso muda o preço?" antes de a régua entrar em vigor — sem isso, o
// gestor mexe às cegas.
export const simularEfeito = (parametros, custoDireto = 10000) => {
  const { valido, parametros: p } = validarParametros(parametros);
  if (!valido) return null;
  const custo = Math.max(0, num(custoDireto) || 0);
  const carregado =
    custo *
    (1 + (p.taxPercent + p.opexPercent + p.adminPercent + p.riskPercent) / 100);
  const divisorMinimo = 1 - (p.minimumMarginPercent + p.commissionPercent) / 100;
  const divisorAlvo = 1 - (p.targetMarginPercent + p.commissionPercent) / 100;
  return {
    custoDireto: arredondar(custo),
    custoCarregado: arredondar(carregado),
    precoMinimo: arredondar(carregado / divisorMinimo),
    precoRecomendado: arredondar(carregado / divisorAlvo),
    // Quanto do preço recomendado é custo, e quanto é margem — a leitura que
    // o gestor precisa para defender a régua.
    pesoDoCustoPercent: arredondar(
      (carregado / (carregado / divisorAlvo)) * 100,
      1,
    ),
  };
};

// Compara duas réguas e descreve o que mudou, em português, para o registro de
// auditoria e para a tela.
export const explicarMudanca = (nova, anterior) => {
  if (!anterior) return "Primeira régua cadastrada.";
  const partes = [];
  for (const [chave, definicao] of Object.entries(PARAMETROS)) {
    const de = num(anterior[chave]);
    const para = num(nova[chave]);
    if (Number.isNaN(de) || Number.isNaN(para) || de === para) continue;
    partes.push(
      `${definicao.rotulo}: ${de}${definicao.sufixo} → ${para}${definicao.sufixo}`,
    );
  }
  return partes.length ? partes.join(" · ") : "Nenhum parâmetro mudou.";
};
