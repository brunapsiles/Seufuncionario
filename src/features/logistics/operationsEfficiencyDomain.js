// ===== Ocupação e produtividade =====
//
// Dois cartões que caíam no painel geral, que mostra um número agregado —
// ocupacao (média simples) e produtividade (nem existia). Na frota elétrica
// isso é onde a margem se decide de verdade: rota com ocupação baixa roda o
// mesmo custo fixo (motorista, veículo, energia) para entregar menos. Ver o
// número médio esconde a rota específica que está drenando.
//
// A matéria-prima é o registro de operação que a vertical já grava —
// entregas, pacotes, viagens, distância, ocupação — por produto e por mês.
// Este motor não inventa medição nova: organiza a que já existe pelo eixo
// que decide ação (qual rota, qual produto, qual mês).

const numero = (valor) => (Number.isFinite(Number(valor)) ? Number(valor) : 0);
const texto = (valor) => String(valor ?? "").trim();
const arredondar = (valor, casas = 1) => {
  const fator = 10 ** casas;
  return Math.round(numero(valor) * fator) / fator;
};

// Abaixo disso a operação roda no prejuízo do custo fixo: motorista, energia
// e veículo custam o mesmo para uma van cheia ou uma van pela metade.
export const OCUPACAO_CRITICA = 55;
export const OCUPACAO_SAUDAVEL = 75;

const registro = (item) =>
  item && (numero(item.entregas) || numero(item.pacotes) || numero(item.viagens) || numero(item.distanciaKm));

/**
 * Visão geral da frota em operação: ocupação média, quantas rodadas estão
 * abaixo da faixa crítica, e o que foi entregue no total.
 */
export function resumoDeOcupacao({ operacoes = [] } = {}) {
  const validas = (Array.isArray(operacoes) ? operacoes : []).filter(registro);
  if (!validas.length)
    return {
      ocupacaoMedia: null, entregas: 0, pacotes: 0, viagens: 0, distanciaKm: 0,
      criticas: 0, total: 0, leitura: "Nenhuma operação registrada ainda.",
    };

  const comOcupacao = validas.filter((item) => numero(item.ocupacaoPercent) > 0);
  const criticas = comOcupacao.filter((item) => numero(item.ocupacaoPercent) < OCUPACAO_CRITICA);

  return {
    ocupacaoMedia: comOcupacao.length
      ? arredondar(comOcupacao.reduce((soma, item) => soma + numero(item.ocupacaoPercent), 0) / comOcupacao.length)
      : null,
    entregas: validas.reduce((soma, item) => soma + numero(item.entregas), 0),
    pacotes: validas.reduce((soma, item) => soma + numero(item.pacotes), 0),
    viagens: validas.reduce((soma, item) => soma + numero(item.viagens), 0),
    distanciaKm: arredondar(validas.reduce((soma, item) => soma + numero(item.distanciaKm), 0), 0),
    criticas: criticas.length,
    total: validas.length,
    semOcupacaoRegistrada: validas.length - comOcupacao.length,
    leitura: !comOcupacao.length
      ? `${validas.length} operação(ões) sem percentual de ocupação registrado.`
      : !criticas.length
        ? `Ocupação saudável em ${comOcupacao.length} operação(ões) medida(s).`
        : `${criticas.length} de ${comOcupacao.length} operação(ões) abaixo de ${OCUPACAO_CRITICA}% de ocupação.`,
  };
}

/**
 * Produtividade por produto: entregas e pacotes por viagem. É a métrica que
 * separa "rodou muito" de "entregou muito" — uma rota pode ter dez viagens e
 * ocupação vazia, outra três viagens cheias.
 */
export function produtividadePorProduto({ operacoes = [], catalogo = [] } = {}) {
  const nomes = new Map((Array.isArray(catalogo) ? catalogo : []).map((item) => [item.id, item.name]));
  const grupos = new Map();
  for (const item of (Array.isArray(operacoes) ? operacoes : []).filter(registro)) {
    const chave = texto(item.produtoId) || "sem-produto";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(item);
  }
  return [...grupos.entries()]
    .map(([produtoId, itens]) => {
      const viagens = itens.reduce((soma, item) => soma + numero(item.viagens), 0);
      const entregas = itens.reduce((soma, item) => soma + numero(item.entregas), 0);
      const pacotes = itens.reduce((soma, item) => soma + numero(item.pacotes), 0);
      const comOcupacao = itens.filter((item) => numero(item.ocupacaoPercent) > 0);
      return {
        produtoId,
        produto: nomes.get(produtoId) || produtoId,
        operacoes: itens.length,
        entregasPorViagem: viagens ? arredondar(entregas / viagens) : null,
        pacotesPorViagem: viagens ? arredondar(pacotes / viagens) : null,
        ocupacaoMedia: comOcupacao.length
          ? arredondar(comOcupacao.reduce((soma, item) => soma + numero(item.ocupacaoPercent), 0) / comOcupacao.length)
          : null,
      };
    })
    .sort((a, b) => (a.ocupacaoMedia ?? 999) - (b.ocupacaoMedia ?? 999));
}

/**
 * Tendência mensal de ocupação. Uma ocupação de 68% não diz se a operação
 * está melhorando a alocação ou perdendo densidade de rota mês a mês.
 */
export function tendenciaDeOcupacao({ operacoes = [] } = {}) {
  const grupos = new Map();
  for (const item of (Array.isArray(operacoes) ? operacoes : []).filter(registro)) {
    const mes = texto(item.mesReferencia) || texto(item.criadoEm).slice(0, 7);
    if (!mes || !(numero(item.ocupacaoPercent) > 0)) continue;
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes).push(item);
  }
  const meses = [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, itens]) => ({
      mes,
      ocupacaoMedia: arredondar(itens.reduce((soma, item) => soma + numero(item.ocupacaoPercent), 0) / itens.length),
      operacoes: itens.length,
    }));
  const variacao = meses.length >= 2 ? arredondar(meses.at(-1).ocupacaoMedia - meses.at(-2).ocupacaoMedia) : null;
  return {
    meses,
    variacao,
    leitura:
      meses.length < 2
        ? "Histórico insuficiente para tendência — precisa de pelo menos dois meses com ocupação registrada."
        : variacao >= 0
          ? `Ocupação subiu ${variacao} ponto(s) percentual(is) em relação ao mês anterior.`
          : `Ocupação caiu ${Math.abs(variacao)} ponto(s) percentual(is) em relação ao mês anterior.`,
  };
}

/**
 * As operações específicas com ocupação crítica — a lista que alguém abre
 * para decidir se remaneja rota, consolida carga ou revisa a frequência.
 */
export function operacoesCriticas({ operacoes = [], limite = 12 } = {}) {
  return (Array.isArray(operacoes) ? operacoes : [])
    .filter(registro)
    .filter((item) => numero(item.ocupacaoPercent) > 0 && numero(item.ocupacaoPercent) < OCUPACAO_CRITICA)
    .map((item) => ({
      id: item.id,
      referencia: texto(item.referencia) || "sem referência",
      produtoId: item.produtoId,
      ocupacaoPercent: arredondar(numero(item.ocupacaoPercent)),
      distanciaKm: arredondar(numero(item.distanciaKm), 0),
      mesReferencia: item.mesReferencia,
    }))
    .sort((a, b) => a.ocupacaoPercent - b.ocupacaoPercent)
    .slice(0, limite);
}
