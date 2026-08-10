// ===== Jornada de eletrificação =====
//
// A oportunidade já reúne inteligência comercial, preço e impacto ambiental.
// Esta camada não cria um segundo cadastro: ela mede quanto do caminho
// Mapear -> Simular -> Rodar -> Reportar -> Escalar já foi comprovado pelos
// registros existentes.

const texto = (valor) => String(valor ?? "").trim();
const numeroPositivo = (valor) => Number.isFinite(Number(valor)) && Number(valor) > 0;

export const OBJETIVOS_ELETRIFICACAO = [
  { id: "custo", label: "Reduzir ou estabilizar custo" },
  { id: "sla", label: "Melhorar nível de serviço" },
  { id: "esg", label: "Reduzir emissões e comprovar ESG" },
  { id: "expansao", label: "Expandir a operação elétrica" },
];

export const ETAPAS_ELETRIFICACAO = [
  { id: "mapear", label: "Mapear", descricao: "Diagnóstico da operação" },
  { id: "simular", label: "Simular", descricao: "Preço, capacidade e CO₂" },
  { id: "rodar", label: "Rodar", descricao: "Piloto com critérios de sucesso" },
  { id: "reportar", label: "Reportar", descricao: "Resultado e evidências" },
  { id: "escalar", label: "Escalar", descricao: "Plano de expansão aprovado" },
];

export const GRUPOS_DO_MAPEAMENTO = [
  {
    id: "rota",
    label: "Rota e frequência",
    campos: ["origin", "destination", "distanciaKm", "viagensMes"],
    completo: (o) =>
      Boolean(texto(o.origin) && texto(o.destination)) &&
      numeroPositivo(o.distanciaKm) &&
      numeroPositivo(o.viagensMes),
  },
  {
    id: "demanda",
    label: "Volume e carga",
    campos: ["weightKg", "volumeM3", "pallets", "packages", "loadDescription"],
    completo: (o) =>
      [o.weightKg, o.volumeM3, o.pallets, o.packages].some(numeroPositivo) ||
      Boolean(texto(o.loadDescription)),
  },
  {
    id: "sla",
    label: "SLA e restrições",
    campos: ["sla", "deliveryWindows", "operationalRestrictions"],
    completo: (o) => Boolean(texto(o.sla) && texto(o.deliveryWindows)),
  },
  {
    id: "sistemas",
    label: "Sistemas e rastreamento",
    campos: ["trackingSystem", "integrationNeeds"],
    completo: (o) => Boolean(texto(o.trackingSystem) || texto(o.integrationNeeds)),
  },
  {
    id: "objetivo",
    label: "Objetivo do cliente",
    campos: ["primaryObjective", "electrificationTarget"],
    completo: (o) => Boolean(texto(o.primaryObjective)),
  },
];

export const avaliarMapeamento = (oportunidade = {}) => {
  const grupos = GRUPOS_DO_MAPEAMENTO.map((grupo) => ({
    id: grupo.id,
    label: grupo.label,
    campos: grupo.campos,
    completo: grupo.completo(oportunidade),
  }));
  const completos = grupos.filter((grupo) => grupo.completo).length;
  return {
    grupos,
    completos,
    total: grupos.length,
    percentual: Math.round((completos / grupos.length) * 100),
    completo: completos === grupos.length,
    faltando: grupos.filter((grupo) => !grupo.completo).map((grupo) => grupo.label),
  };
};

const temSimulacao = (oportunidade, cenarios) =>
  Boolean(
    texto(oportunidade.scenarioId) ||
      cenarios.some(
        (cenario) =>
          texto(cenario.opportunityId) && texto(cenario.opportunityId) === texto(oportunidade.id),
      ),
  );

export const avaliarJornadaEletrificacao = (oportunidade = {}, cenarios = []) => {
  const mapeamento = avaliarMapeamento(oportunidade);
  const concluidas = {
    mapear: mapeamento.completo,
    simular: temSimulacao(oportunidade, Array.isArray(cenarios) ? cenarios : []),
    rodar:
      texto(oportunidade.pilotStatus).toLowerCase() === "concluido" &&
      Boolean(texto(oportunidade.pilotStart) && texto(oportunidade.pilotSuccessCriteria)),
    reportar:
      texto(oportunidade.reportStatus).toLowerCase() === "publicado" &&
      Boolean(texto(oportunidade.reportUrl) || texto(oportunidade.reportEvidenceId)),
    escalar:
      ["aprovada", "implantada"].includes(
        texto(oportunidade.expansionStatus).toLowerCase(),
      ) && Boolean(texto(oportunidade.expansionPlan)),
  };

  let anteriorConcluida = true;
  let encontrouAtual = false;
  const etapas = ETAPAS_ELETRIFICACAO.map((etapa) => {
    let estado = "bloqueada";
    if (concluidas[etapa.id]) estado = "concluida";
    else if (anteriorConcluida && !encontrouAtual) {
      estado = "atual";
      encontrouAtual = true;
    }
    anteriorConcluida = anteriorConcluida && concluidas[etapa.id];
    return { ...etapa, estado };
  });

  const etapaAtual = etapas.find((etapa) => etapa.estado === "atual") || null;
  const totalConcluido = etapas.filter((etapa) => etapa.estado === "concluida").length;
  return {
    etapas,
    etapaAtual,
    mapeamento,
    percentual: Math.round((totalConcluido / etapas.length) * 100),
    concluida: totalConcluido === etapas.length,
  };
};

// Leva o diagnóstico para a calculadora já existente. Campos de custo ficam
// intocados e continuam dependendo de preenchimento e confirmação explícitos.
export const inputsDePrecificacaoDaOportunidade = (oportunidade = {}, padrao = {}) => ({
  ...padrao,
  client: texto(oportunidade.cliente || oportunidade.clientName),
  clientId: texto(oportunidade.clientId),
  origin: texto(oportunidade.origin),
  destination: texto(oportunidade.destination),
  distanceKm: oportunidade.distanciaKm || "",
  tripsPerMonth: oportunidade.viagensMes || "",
  frequencyPerMonth: oportunidade.viagensMes || "",
  vehicleType: texto(oportunidade.tipoVeiculo),
  pallets: oportunidade.pallets || "",
  weightKg: oportunidade.weightKg || "",
  occupancyPercent: oportunidade.ocupacaoPrevistaPercent || "",
  dataQuality: oportunidade.dataQuality || "",
});
