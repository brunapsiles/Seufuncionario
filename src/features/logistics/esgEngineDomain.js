// ===== Motor ambiental auditável =====
// Camada pura.
//
// O que separa um número ambiental que serve de um que não serve não é a
// fórmula — é conseguir refazer o cálculo daqui a dois anos, com o mesmo
// resultado, sabendo qual fator foi usado, de onde ele veio, quem respondeu
// por ele e o que era premissa em vez de medição.
//
// Por isso todo cálculo daqui devolve, junto do resultado, a memória: entradas,
// fatores com fonte e versão, passos na ordem em que aconteceram, e o que foi
// assumido. Sem isso, o relatório é opinião com casas decimais.

// Fatores de emissão. Cada um carrega fonte, unidade, vigência e responsável.
// Mudar um fator nunca reescreve o passado: entra uma versão nova.
export const FATOR_PADRAO_VERSAO = "2026.1";

export const FATORES_PADRAO = {
  versao: FATOR_PADRAO_VERSAO,
  vigenciaInicio: "2026-01-01",
  responsavel: "Sustentabilidade To Do Green",
  fatores: {
    diesel_b10_kgco2e_por_litro: {
      valor: 2.68,
      unidade: "kgCO2e/L",
      fonte: "Fator de combustão de diesel B10 — inventário nacional",
      tipo: "combustao",
    },
    diesel_consumo_km_por_litro: {
      valor: 3.2,
      unidade: "km/L",
      fonte: "Média de frota diesel de carga urbana",
      tipo: "operacional",
    },
    eletrico_kwh_por_km: {
      valor: 1.1,
      unidade: "kWh/km",
      fonte: "Consumo médio de veículo elétrico de carga leve",
      tipo: "operacional",
    },
    rede_eletrica_kgco2e_por_kwh: {
      valor: 0.0385,
      unidade: "kgCO2e/kWh",
      fonte: "Fator médio do Sistema Interligado Nacional",
      tipo: "eletricidade",
    },
    arvore_kgco2_ano: {
      valor: 22,
      unidade: "kgCO2/ano",
      fonte: "Equivalência ilustrativa de sequestro por árvore adulta",
      tipo: "equivalencia",
    },
  },
};

const num = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const arredondar = (valor, casas = 2) => {
  const f = 10 ** casas;
  return Math.round(num(valor) * f) / f;
};

export const fatorEmUso = (conjunto, chave) => {
  const fator = conjunto?.fatores?.[chave];
  if (!fator) throw new Error(`Fator ambiental ausente: ${chave}`);
  return fator;
};

// Qualidade do dado. Um cálculo feito com distância estimada e ocupação
// chutada não vale o mesmo que um feito com telemetria — e quem lê o relatório
// precisa saber disso antes de assinar embaixo.
export const QUALIDADE = {
  medido: 100,
  documentado: 85,
  estimado: 60,
  presumido: 35,
};

export const qualidadeDoCalculo = (origens = {}) => {
  const valores = Object.values(origens)
    .map((origem) => QUALIDADE[origem])
    .filter((v) => Number.isFinite(v));
  if (!valores.length) return QUALIDADE.presumido;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
};

// O cálculo. Compara o cenário executado com um cenário de referência (o que
// teria acontecido com frota diesel convencional) e devolve a diferença.
//
// A referência é premissa, não medição — e o resultado diz isso em voz alta.
export const calcularImpactoAmbiental = (entradas = {}, conjunto = FATORES_PADRAO) => {
  const distanciaKm = num(entradas.distanciaKm);
  const viagens = Math.max(1, num(entradas.viagens) || 1);
  const distanciaTotal = distanciaKm * viagens;

  if (distanciaTotal <= 0)
    throw new Error("Informe a distância para calcular o impacto ambiental.");

  const tipoVeiculo = String(entradas.tipoVeiculo || "eletrico").toLowerCase();
  const eletrico = /eletric|elétric|ev\b/.test(tipoVeiculo);

  const fatorDieselCO2 = fatorEmUso(conjunto, "diesel_b10_kgco2e_por_litro");
  const fatorDieselConsumo = fatorEmUso(conjunto, "diesel_consumo_km_por_litro");
  const fatorEvConsumo = fatorEmUso(conjunto, "eletrico_kwh_por_km");
  const fatorRede = fatorEmUso(conjunto, "rede_eletrica_kgco2e_por_kwh");

  const passos = [];

  // Cenário de referência: a mesma operação, feita com diesel.
  const litrosReferencia = distanciaTotal / fatorDieselConsumo.valor;
  passos.push({
    ordem: 1,
    descricao: "Litros de diesel que a operação de referência consumiria",
    formula: "distância total ÷ consumo (km/L)",
    entradas: { distanciaTotal, consumoKmPorL: fatorDieselConsumo.valor },
    resultado: arredondar(litrosReferencia, 2),
    unidade: "L",
    fator: "diesel_consumo_km_por_litro",
  });

  const co2Referencia = litrosReferencia * fatorDieselCO2.valor;
  passos.push({
    ordem: 2,
    descricao: "Emissão do cenário de referência",
    formula: "litros × fator de combustão",
    entradas: { litros: arredondar(litrosReferencia, 2), fator: fatorDieselCO2.valor },
    resultado: arredondar(co2Referencia, 2),
    unidade: "kgCO2e",
    fator: "diesel_b10_kgco2e_por_litro",
  });

  // Cenário executado.
  let co2Executado;
  let energia = null;
  if (eletrico) {
    const kwh = distanciaTotal * fatorEvConsumo.valor;
    co2Executado = kwh * fatorRede.valor;
    energia = arredondar(kwh, 2);
    passos.push({
      ordem: 3,
      descricao: "Energia consumida pela operação executada",
      formula: "distância total × consumo (kWh/km)",
      entradas: { distanciaTotal, consumoKwhPorKm: fatorEvConsumo.valor },
      resultado: energia,
      unidade: "kWh",
      fator: "eletrico_kwh_por_km",
    });
    passos.push({
      ordem: 4,
      descricao: "Emissão da operação executada",
      formula: "energia × fator da rede elétrica",
      entradas: { kwh: energia, fator: fatorRede.valor },
      resultado: arredondar(co2Executado, 2),
      unidade: "kgCO2e",
      fator: "rede_eletrica_kgco2e_por_kwh",
    });
  } else {
    // Operação diesel: sem ganho ambiental sobre a própria referência.
    co2Executado = co2Referencia;
    passos.push({
      ordem: 3,
      descricao: "Operação executada com diesel: igual à referência",
      formula: "emissão de referência",
      entradas: {},
      resultado: arredondar(co2Executado, 2),
      unidade: "kgCO2e",
      fator: "diesel_b10_kgco2e_por_litro",
    });
  }

  const evitadoKg = Math.max(0, co2Referencia - co2Executado);
  const reducaoPercent = co2Referencia > 0 ? (evitadoKg / co2Referencia) * 100 : 0;
  const litrosEvitados = eletrico ? litrosReferencia : 0;

  passos.push({
    ordem: passos.length + 1,
    descricao: "CO2 evitado",
    formula: "emissão de referência − emissão executada",
    entradas: {
      referencia: arredondar(co2Referencia, 2),
      executada: arredondar(co2Executado, 2),
    },
    resultado: arredondar(evitadoKg, 2),
    unidade: "kgCO2e",
    fator: null,
  });

  const qualidade = qualidadeDoCalculo(entradas.origens);

  return {
    versaoFatores: conjunto.versao,
    calculadoEm: entradas.calculadoEm || new Date().toISOString(),
    impacto: {
      co2ReferenciaKg: arredondar(co2Referencia, 2),
      co2ExecutadoKg: arredondar(co2Executado, 2),
      co2AvoidedKg: arredondar(evitadoKg, 2),
      reductionPercent: arredondar(reducaoPercent, 1),
      dieselAvoidedLiters: arredondar(litrosEvitados, 2),
      energiaKwh: energia,
    },
    qualidadeDados: qualidade,
    memoria: {
      entradas: {
        distanciaKm,
        viagens,
        distanciaTotal: arredondar(distanciaTotal, 2),
        tipoVeiculo,
      },
      fatoresUsados: passos
        .map((p) => p.fator)
        .filter(Boolean)
        .filter((v, i, lista) => lista.indexOf(v) === i)
        .map((chave) => ({
          chave,
          ...fatorEmUso(conjunto, chave),
          versao: conjunto.versao,
          responsavel: conjunto.responsavel,
        })),
      passos,
      premissas: [
        "O cenário de referência assume a mesma operação executada por frota diesel convencional.",
        `Consumo de referência: ${fatorDieselConsumo.valor} ${fatorDieselConsumo.unidade}.`,
        eletrico
          ? "A emissão da eletricidade usa o fator médio da rede, não contrato de energia renovável específico."
          : "A operação executada é diesel; não há redução sobre a própria referência.",
      ],
      // A frase que impede o número de virar o que ele não é.
      ressalva:
        "Estimativa própria da To Do Green, reproduzível pela memória de cálculo acima. Não constitui certificação, verificação por terceira parte nem inventário auditado.",
    },
  };
};

// Tradutor ESG: transforma o número em texto que vai para proposta e relatório,
// sem prometer mais do que o cálculo sustenta.
export const traduzirParaProposta = (resultado, conjunto = FATORES_PADRAO) => {
  const kg = num(resultado?.impacto?.co2AvoidedKg);
  const arvore = fatorEmUso(conjunto, "arvore_kgco2_ano");
  const toneladas = kg / 1000;
  return {
    titulo: `${arredondar(toneladas, 2)} t de CO2e evitadas`,
    texto:
      kg > 0
        ? `A operação evitou aproximadamente ${arredondar(toneladas, 2)} toneladas de CO2e em relação ao cenário de referência com frota diesel, uma redução de ${resultado.impacto.reductionPercent}%.`
        : "A operação executada não apresentou redução sobre o cenário de referência.",
    equivalencias:
      kg > 0
        ? [
            {
              rotulo: "árvores em um ano",
              valor: Math.round(kg / arvore.valor),
              ressalva: "Equivalência ilustrativa, não compensação.",
            },
          ]
        : [],
    qualidadeDados: resultado?.qualidadeDados ?? 0,
    versaoFatores: resultado?.versaoFatores,
    ressalva: resultado?.memoria?.ressalva,
  };
};
