// ===== Margem e rentabilidade =====
//
// "Margem" e "Rentabilidade" eram dois cartões que caíam no painel geral,
// que mostra um número agregado só: margemOperacionalPercent, um total.
// Um total não diz onde a margem está sangrando — e "onde" é a única
// pergunta que importa para quem decide preço.
//
// A matéria-prima já existe: cada simulação de precificação grava
// loadedCost, selectedPrice e marginPercent, presos a um produto e a um
// cliente, com o piso e o alvo do produto (centralPricingEngine). Este
// módulo não recalcula nada — lê o que a precificação já decidiu e organiza
// por onde a margem se explica: produto, cliente, tendência no tempo.

const numero = (valor) => (Number.isFinite(Number(valor)) ? Number(valor) : 0);
const texto = (valor) => String(valor ?? "").trim();
const arredondar = (valor, casas = 1) => {
  const fator = 10 ** casas;
  return Math.round(numero(valor) * fator) / fator;
};

const PADRAO = Object.freeze({ minimumMarginPercent: 18, targetMarginPercent: 26 });

const pisoDoCenario = (cenario) =>
  numero(cenario?.piso ?? cenario?.result?.minimumMarginPercent) || PADRAO.minimumMarginPercent;

const valido = (cenario) => cenario && Number.isFinite(Number(cenario.result?.selectedPrice)) && numero(cenario.result?.selectedPrice) > 0;

/**
 * Visão geral: quanto se vendeu, quanto custou, quanto sobrou, e quantos
 * cenários estão abaixo do piso do próprio produto — não de um piso genérico.
 */
export function resumoDeMargem({ cenarios = [] } = {}) {
  const validos = (Array.isArray(cenarios) ? cenarios : []).filter(valido);
  if (!validos.length)
    return {
      receita: 0, custo: 0, margemValor: 0, margemPercent: null,
      abaixoDoPiso: 0, total: 0, leitura: "Nenhuma simulação de precificação registrada ainda.",
    };

  const receita = validos.reduce((soma, item) => soma + numero(item.result.selectedPrice), 0);
  const custo = validos.reduce((soma, item) => soma + numero(item.result.loadedCost), 0);
  const abaixoDoPiso = validos.filter((item) => numero(item.result.marginPercent) < pisoDoCenario(item));

  return {
    receita: arredondar(receita, 0),
    custo: arredondar(custo, 0),
    margemValor: arredondar(receita - custo, 0),
    margemPercent: receita ? arredondar(((receita - custo) / receita) * 100) : null,
    abaixoDoPiso: abaixoDoPiso.length,
    total: validos.length,
    leitura: !abaixoDoPiso.length
      ? `${validos.length} simulação(ões), todas acima do piso do próprio produto.`
      : `${abaixoDoPiso.length} de ${validos.length} simulação(ões) abaixo do piso do produto.`,
  };
}

/**
 * Margem por produto. É aqui que "middle mile dá dinheiro e last mile não"
 * aparece — informação que o total sozinho nunca mostrou.
 */
export function margemPorProduto({ cenarios = [], catalogo = [] } = {}) {
  const nomes = new Map((Array.isArray(catalogo) ? catalogo : []).map((item) => [item.id, item.name]));
  const grupos = new Map();
  for (const cenario of (Array.isArray(cenarios) ? cenarios : []).filter(valido)) {
    const chave = texto(cenario.productId) || "sem-produto";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(cenario);
  }
  return [...grupos.entries()]
    .map(([produtoId, itens]) => {
      const receita = itens.reduce((soma, item) => soma + numero(item.result.selectedPrice), 0);
      const custo = itens.reduce((soma, item) => soma + numero(item.result.loadedCost), 0);
      return {
        produtoId,
        produto: nomes.get(produtoId) || produtoId,
        quantidade: itens.length,
        receita: arredondar(receita, 0),
        margemPercent: receita ? arredondar(((receita - custo) / receita) * 100) : 0,
        abaixoDoPiso: itens.filter((item) => numero(item.result.marginPercent) < pisoDoCenario(item)).length,
      };
    })
    .sort((a, b) => a.margemPercent - b.margemPercent);
}

/**
 * Margem por cliente. A conta que puxa a margem para baixo aparece na frente
 * — é o oposto de "resumir tudo", é "mostrar quem está custando caro".
 */
export function margemPorCliente({ cenarios = [] } = {}) {
  const grupos = new Map();
  for (const cenario of (Array.isArray(cenarios) ? cenarios : []).filter(valido)) {
    const chave = texto(cenario.clienteNome) || texto(cenario.clientId) || "sem-cliente";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(cenario);
  }
  return [...grupos.entries()]
    .map(([cliente, itens]) => {
      const receita = itens.reduce((soma, item) => soma + numero(item.result.selectedPrice), 0);
      const custo = itens.reduce((soma, item) => soma + numero(item.result.loadedCost), 0);
      return {
        cliente,
        quantidade: itens.length,
        receita: arredondar(receita, 0),
        margemPercent: receita ? arredondar(((receita - custo) / receita) * 100) : 0,
      };
    })
    .sort((a, b) => a.margemPercent - b.margemPercent);
}

/**
 * Tendência mensal. Uma margem de 22% não diz se está subindo ou descendo —
 * e a direção importa mais que o ponto para quem está decidindo uma mudança
 * de precificação.
 */
export function tendenciaDeMargem({ cenarios = [] } = {}) {
  const grupos = new Map();
  for (const cenario of (Array.isArray(cenarios) ? cenarios : []).filter(valido)) {
    const mes = texto(cenario.createdAt).slice(0, 7);
    if (!mes) continue;
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes).push(cenario);
  }
  const meses = [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, itens]) => {
      const receita = itens.reduce((soma, item) => soma + numero(item.result.selectedPrice), 0);
      const custo = itens.reduce((soma, item) => soma + numero(item.result.loadedCost), 0);
      return { mes, margemPercent: receita ? arredondar(((receita - custo) / receita) * 100) : 0, quantidade: itens.length };
    });
  const variacao = meses.length >= 2 ? arredondar(meses.at(-1).margemPercent - meses.at(-2).margemPercent) : null;
  return {
    meses,
    variacao,
    leitura:
      meses.length < 2
        ? "Histórico insuficiente para tendência — precisa de pelo menos dois meses com simulação."
        : variacao >= 0
          ? `Margem subiu ${variacao} ponto(s) percentual(is) em relação ao mês anterior.`
          : `Margem caiu ${Math.abs(variacao)} ponto(s) percentual(is) em relação ao mês anterior.`,
  };
}

/**
 * Os cenários que estão sangrando a margem, com o nome do cliente e a
 * distância até o piso — é o que alguém precisa abrir e renegociar.
 */
export function cenariosAbaixoDoPiso({ cenarios = [], limite = 12 } = {}) {
  return (Array.isArray(cenarios) ? cenarios : [])
    .filter(valido)
    .filter((item) => numero(item.result.marginPercent) < pisoDoCenario(item))
    .map((item) => ({
      id: item.id,
      cliente: texto(item.clienteNome) || texto(item.clientId) || "sem cliente",
      produtoId: item.productId,
      margemPercent: arredondar(numero(item.result.marginPercent)),
      piso: pisoDoCenario(item),
      distanciaDoPiso: arredondar(pisoDoCenario(item) - numero(item.result.marginPercent)),
    }))
    .sort((a, b) => b.distanciaDoPiso - a.distanciaDoPiso)
    .slice(0, limite);
}
