// ===== Estoque: saldo, custo médio e divergência de contagem =====
//
// Camada pura. Nenhuma função aqui grava nada — todas recebem a lista de
// movimentos e devolvem o número que a tela mostra. É o que permite provar o
// custo médio com um teste em vez de conferir a olho num banco de produção.
//
// A regra que organiza o arquivo: o movimento é o registro, o saldo é a soma.
// Não existe "saldo atual" guardado em lugar nenhum, e por isso não existe
// saldo que possa divergir da história.

import { inventoryHealth } from "../platform-suite/platformSuiteDomain.js";

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const texto = (valor) => String(valor ?? "").trim();

// O sinal vive num lugar só. Espalhar `kind === "saida" ? -1 : 1` pelas
// consultas garantiria que uma delas esquecesse o ajuste negativo.
export const SINAL_DO_MOVIMENTO = Object.freeze({
  entrada: 1,
  ajuste_entrada: 1,
  saida: -1,
  ajuste_saida: -1,
});

export const MOVEMENT_KINDS = Object.freeze([
  { id: "entrada", name: "Entrada", sinal: 1 },
  { id: "saida", name: "Saída", sinal: -1 },
  { id: "ajuste_entrada", name: "Ajuste positivo", sinal: 1 },
  { id: "ajuste_saida", name: "Ajuste negativo", sinal: -1 },
]);

export const isMovementKind = (valor) => Object.hasOwn(SINAL_DO_MOVIMENTO, texto(valor));

// Movimento de tipo desconhecido conta como ZERO, não como entrada. Se um dia
// um tipo novo chegar do banco sem passar por aqui, é melhor o saldo ficar
// visivelmente baixo do que silenciosamente inflado.
export const movementSigned = (movimento) => {
  const sinal = SINAL_DO_MOVIMENTO[texto(movimento?.kind)] ?? 0;
  return sinal * Math.abs(numero(movimento?.quantity));
};

// ---------------------------------------------------------------------------
// Saldo
// ---------------------------------------------------------------------------

// Saldo por item, somando todos os depósitos.
export const saldoPorItem = (movimentos = []) => {
  const saldos = new Map();
  for (const movimento of movimentos) {
    const item = texto(movimento?.itemId);
    if (!item) continue;
    saldos.set(item, (saldos.get(item) || 0) + movementSigned(movimento));
  }
  return saldos;
};

// Saldo por item E depósito. A chave é `itemId|warehouseId` porque um estoque
// somado entre depósitos esconde exatamente o que a operação precisa saber:
// que há peça, mas na cidade errada.
export const saldoPorItemEDeposito = (movimentos = []) => {
  const saldos = new Map();
  for (const movimento of movimentos) {
    const item = texto(movimento?.itemId);
    const deposito = texto(movimento?.warehouseId);
    if (!item || !deposito) continue;
    const chave = `${item}|${deposito}`;
    saldos.set(chave, (saldos.get(chave) || 0) + movementSigned(movimento));
  }
  return saldos;
};

export const saldoDoItem = (movimentos, itemId, warehouseId = "") => {
  const alvoItem = texto(itemId);
  const alvoDeposito = texto(warehouseId);
  return movimentos
    .filter((movimento) =>
      texto(movimento?.itemId) === alvoItem &&
      (!alvoDeposito || texto(movimento?.warehouseId) === alvoDeposito))
    .reduce((total, movimento) => total + movementSigned(movimento), 0);
};

// ---------------------------------------------------------------------------
// Custo médio móvel
// ---------------------------------------------------------------------------

// Ordem cronológica pelo que ACONTECEU, com o registro como desempate. Lançar
// uma entrada retroativa é rotina, e ordenar por criação faria o custo médio
// ser montado numa ordem que nunca existiu na prática.
export const ordenarPorOcorrencia = (movimentos = []) =>
  [...movimentos].sort((a, b) =>
    texto(a?.occurredAt).localeCompare(texto(b?.occurredAt)) ||
    texto(a?.createdAt).localeCompare(texto(b?.createdAt)) ||
    texto(a?.id).localeCompare(texto(b?.id)));

// Média móvel ponderada: cada entrada recalcula a média com o que já havia; a
// saída consome a média vigente e NÃO a altera. Usar o preço da última compra
// para valorizar a saída faria o resultado do mês oscilar com a cotação do
// fornecedor em vez de com a operação.
//
// Devolve `null` quando não há entrada nenhuma — não `0`. Zero é um custo
// legítimo (doação, brinde) e não pode se confundir com "nunca comprei isto".
// É a mesma convenção de `statsDomain` e `statementDomain`.
export const custoMedioPonderado = (movimentos = [], itemId = "") => {
  const alvo = texto(itemId);
  const lista = ordenarPorOcorrencia(
    alvo ? movimentos.filter((m) => texto(m?.itemId) === alvo) : movimentos,
  );

  let quantidade = 0;
  let valor = 0;
  let houveEntrada = false;

  for (const movimento of lista) {
    const sinal = SINAL_DO_MOVIMENTO[texto(movimento?.kind)] ?? 0;
    const qtd = Math.abs(numero(movimento?.quantity));
    if (!qtd) continue;

    if (sinal > 0) {
      houveEntrada = true;
      valor += qtd * Math.max(0, numero(movimento?.unitCost));
      quantidade += qtd;
      continue;
    }
    if (sinal < 0) {
      // Consome pela média vigente. Quando o saldo zera, o valor zera com ele —
      // manter valor com quantidade zero produziria custo médio infinito na
      // entrada seguinte.
      const medio = quantidade > 0 ? valor / quantidade : 0;
      const baixa = Math.min(qtd, quantidade);
      quantidade -= baixa;
      valor = quantidade > 0 ? valor - baixa * medio : 0;
    }
  }

  if (!houveEntrada) return null;
  if (quantidade <= 0) return 0;
  return valor / quantidade;
};

// Valor do estoque de um item: saldo × custo médio. `null` quando o custo é
// desconhecido, para a tela poder escrever travessão em vez de "R$ 0,00", que
// leria como "não vale nada".
export const valorDoEstoque = (movimentos = [], itemId = "") => {
  const medio = custoMedioPonderado(movimentos, itemId);
  if (medio === null) return null;
  return Math.max(0, saldoDoItem(movimentos, itemId)) * medio;
};

// ---------------------------------------------------------------------------
// Ruptura e reposição
// ---------------------------------------------------------------------------

// Reaproveita `inventoryHealth` do platform-suite em vez de reescrever a
// classificação: ruptura, estoque baixo e reposição sugerida já estão resolvidos
// e testados lá. O que muda é a fonte do saldo — aqui ele vem dos movimentos,
// não de uma coluna mutável.
export const situacaoDoEstoque = (itens = [], movimentos = []) => {
  const saldos = saldoPorItem(movimentos);
  const produtos = itens.map((item) => ({
    id: item.id,
    name: item.nome || item.name,
    stock: saldos.get(texto(item.id)) || 0,
    lowStockAlert: Math.max(0, numero(item.estoqueMinimo ?? item.minStock)),
  }));
  const saude = inventoryHealth(produtos);
  return {
    ...saude,
    // A unidade viaja junto porque "12" sem unidade não é resposta para
    // "quanto tem?".
    rows: saude.rows.map((linha) => ({
      ...linha,
      unidade: itens.find((item) => item.id === linha.id)?.unidade || "",
    })),
  };
};

export const itensAbaixoDoMinimo = (itens = [], movimentos = []) =>
  situacaoDoEstoque(itens, movimentos).rows.filter((linha) => linha.status !== "normal");

// ---------------------------------------------------------------------------
// Contagem de inventário
// ---------------------------------------------------------------------------

// A divergência é contado − sistema, e o ajuste que a corrige tem o sinal
// oposto ao da falta. Linha sem contagem informada é ignorada em vez de tratada
// como zero: "não contei" e "contei e não tinha" são coisas diferentes, e
// confundi-las zeraria o estoque de todo item que ficou de fora da contagem.
export const divergenciaDeContagem = (linhas = []) =>
  linhas
    .filter((linha) => linha && linha.contado !== null && linha.contado !== undefined && linha.contado !== "")
    .map((linha) => {
      const contado = numero(linha.contado);
      const sistema = numero(linha.saldoSistema);
      const diferenca = contado - sistema;
      return {
        itemId: texto(linha.itemId),
        contado,
        saldoSistema: sistema,
        diferenca,
        // Sobra pede ajuste positivo; falta pede negativo.
        ajuste: diferenca === 0 ? null : {
          kind: diferenca > 0 ? "ajuste_entrada" : "ajuste_saida",
          quantity: Math.abs(diferenca),
        },
      };
    });

export const resumoDaContagem = (linhas = []) => {
  const divergencias = divergenciaDeContagem(linhas);
  const comDiferenca = divergencias.filter((linha) => linha.diferenca !== 0);
  return {
    contadas: divergencias.length,
    // Quantas linhas ficaram sem contagem — o número que diz se o inventário
    // está pronto para fechar.
    pendentes: linhas.length - divergencias.length,
    divergentes: comDiferenca.length,
    sobras: comDiferenca.filter((linha) => linha.diferenca > 0).length,
    faltas: comDiferenca.filter((linha) => linha.diferenca < 0).length,
    ajustes: comDiferenca.map((linha) => ({ itemId: linha.itemId, ...linha.ajuste })),
  };
};

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

// Mesmo contrato do `exigido` das coleções: "" quando está certo, a frase do
// problema quando não.
export const validateMovement = (movimento = {}) => {
  if (!texto(movimento.itemId)) return "Informe o material.";
  if (!texto(movimento.warehouseId)) return "Informe o depósito.";
  if (!isMovementKind(movimento.kind)) return "Informe se é entrada, saída ou ajuste.";
  const qtd = numero(movimento.quantity);
  if (!(qtd > 0)) return "A quantidade precisa ser maior que zero.";
  if (numero(movimento.unitCost) < 0) return "O custo unitário não pode ser negativo.";
  if (!texto(movimento.occurredAt)) return "Informe a data do movimento.";
  return "";
};

export const validateTransfer = (transferencia = {}) => {
  if (!texto(transferencia.itemId)) return "Informe o material.";
  if (!texto(transferencia.fromWarehouseId)) return "Informe o depósito de origem.";
  if (!texto(transferencia.toWarehouseId)) return "Informe o depósito de destino.";
  if (texto(transferencia.fromWarehouseId) === texto(transferencia.toWarehouseId))
    return "Origem e destino precisam ser depósitos diferentes.";
  if (!(numero(transferencia.quantity) > 0)) return "A quantidade precisa ser maior que zero.";
  return "";
};
