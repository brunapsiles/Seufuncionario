// ===== Relatórios ESG =====
// Camada pura: monta o documento. Quem renderiza em PDF, planilha ou
// apresentação recebe esta estrutura pronta.
//
// A regra do arquivo: um relatório ambiental sem metodologia, premissa, fonte,
// qualidade do dado e memória de cálculo não é relatório — é slide. Por isso
// essas seções não são opcionais aqui: `montarRelatorio` recusa produzir o
// documento se faltar qualquer uma delas.
//
// Isso importa porque o relatório vai para conselho, para due diligence e para
// inventário de Escopo 3. Quem assina precisa poder defender cada número.

import { toCsv, withBom } from "../integrations/integrationsDomain.js";

export const PERIODOS = ["mensal", "trimestral", "anual"];

export const ESCOPOS_RELATORIO = [
  "cliente",
  "contrato",
  "operacao",
  "conselho",
  "escopo3",
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const arredondar = (v, casas = 2) => {
  const f = 10 ** casas;
  return Math.round(num(v) * f) / f;
};

const texto = (v) => String(v ?? "").trim();

// As seções que todo relatório precisa ter. A lista existe para ser conferida
// programaticamente, não para ficar num documento de processo que ninguém lê.
export const SECOES_OBRIGATORIAS = [
  "metodologia",
  "premissas",
  "fontes",
  "qualidadeDados",
  "memoriaCalculo",
  "versao",
  "aprovacao",
];

export const periodoValido = (valor) =>
  PERIODOS.includes(valor) ? valor : "mensal";

export const escopoValido = (valor) =>
  ESCOPOS_RELATORIO.includes(valor) ? valor : "cliente";

// Rótulo humano do período coberto. Um relatório sem intervalo explícito não
// dá para conferir contra nota fiscal nem contra inventário.
export const rotularPeriodo = (inicio, fim) => {
  const i = texto(inicio);
  const f = texto(fim);
  if (!i || !f) return "período não informado";
  return `${i} a ${f}`;
};

export const montarRelatorio = (dados = {}) => {
  const {
    cliente,
    periodo = {},
    escopo = "cliente",
    calculos = [],
    greenScore = null,
    operacoes = [],
    aprovacao = null,
    versaoFatores = "",
    versaoPesos = "",
    geradoPor = "",
    geradoEm = new Date().toISOString(),
  } = dados;

  if (!cliente?.nome) throw new Error("Relatório sem cliente identificado.");
  if (!periodo.inicio || !periodo.fim)
    throw new Error("Relatório sem período definido.");

  const totalCo2 = calculos.reduce((a, c) => a + num(c?.impacto?.co2AvoidedKg), 0);
  const totalDiesel = calculos.reduce(
    (a, c) => a + num(c?.impacto?.dieselAvoidedLiters),
    0,
  );
  const reducaoMedia = calculos.length
    ? calculos.reduce((a, c) => a + num(c?.impacto?.reductionPercent), 0) /
      calculos.length
    : 0;
  const qualidadeMedia = calculos.length
    ? Math.round(
        calculos.reduce((a, c) => a + num(c?.qualidadeDados), 0) / calculos.length,
      )
    : 0;

  // Fontes sem repetição, na ordem em que apareceram.
  const fontes = [];
  for (const calculo of calculos)
    for (const fator of calculo?.memoria?.fatoresUsados || [])
      if (!fontes.some((f) => f.chave === fator.chave))
        fontes.push({
          chave: fator.chave,
          fonte: fator.fonte,
          valor: fator.valor,
          unidade: fator.unidade,
          versao: fator.versao,
          responsavel: fator.responsavel,
        });

  const premissas = [];
  for (const calculo of calculos)
    for (const premissa of calculo?.memoria?.premissas || [])
      if (!premissas.includes(premissa)) premissas.push(premissa);

  const relatorio = {
    titulo: `Relatório ${escopoValido(escopo)} — ${cliente.nome}`,
    cliente: { nome: cliente.nome, documento: texto(cliente.documento) },
    escopo: escopoValido(escopo),
    periodo: {
      tipo: periodoValido(periodo.tipo),
      inicio: periodo.inicio,
      fim: periodo.fim,
      rotulo: rotularPeriodo(periodo.inicio, periodo.fim),
    },
    resumo: {
      co2EvitadoKg: arredondar(totalCo2),
      co2EvitadoToneladas: arredondar(totalCo2 / 1000, 3),
      dieselEvitadoLitros: arredondar(totalDiesel),
      reducaoMediaPercent: arredondar(reducaoMedia, 1),
      operacoes: operacoes.length,
      calculos: calculos.length,
      greenScore: greenScore
        ? { valor: greenScore.score ?? greenScore.valor, versaoPesos: greenScore.versaoPesos }
        : null,
    },

    // ---- As seções que tornam o número defensável ----
    metodologia: {
      texto:
        greenScore?.metodologia ||
        "Comparação entre o cenário executado e um cenário de referência com frota diesel convencional, por operação, com fatores de emissão versionados.",
      versaoFatores: versaoFatores || calculos[0]?.versaoFatores || "",
      versaoPesos: versaoPesos || greenScore?.versaoPesos || "",
    },
    premissas,
    fontes,
    qualidadeDados: {
      media: qualidadeMedia,
      // O aviso que separa acompanhar tendência de assinar documento.
      adequadoParaRegulatorio: qualidadeMedia >= 70,
      observacao:
        qualidadeMedia >= 70
          ? "Qualidade suficiente para acompanhamento e comunicação, com memória de cálculo disponível."
          : "Qualidade abaixo de 70%: os números servem para acompanhar tendência, não para relatório regulatório ou inventário auditado.",
    },
    memoriaCalculo: calculos.map((calculo, indice) => ({
      indice: indice + 1,
      referencia: calculo?.referencia || `Cálculo ${indice + 1}`,
      versaoFatores: calculo?.versaoFatores,
      qualidade: num(calculo?.qualidadeDados),
      entradas: calculo?.memoria?.entradas || {},
      passos: calculo?.memoria?.passos || [],
      resultado: calculo?.impacto || {},
    })),
    versao: {
      documento: texto(dados.versaoDocumento) || "1",
      geradoEm,
      geradoPor: texto(geradoPor),
    },
    aprovacao: aprovacao
      ? {
          responsavel: texto(aprovacao.responsavel),
          cargo: texto(aprovacao.cargo),
          data: texto(aprovacao.data),
          status: texto(aprovacao.status) || "aprovado",
        }
      : {
          responsavel: "",
          cargo: "",
          data: "",
          status: "pendente",
        },
    ressalva:
      "Os indicadores deste relatório são estimativas próprias da To Do Green, reproduzíveis pela memória de cálculo apresentada. Não constituem certificação ambiental, verificação por terceira parte nem inventário auditado.",
  };

  const faltando = SECOES_OBRIGATORIAS.filter((secao) => {
    const valor = relatorio[secao];
    if (Array.isArray(valor)) return valor.length === 0;
    return valor === undefined || valor === null;
  });
  if (faltando.length)
    throw new Error(
      `Relatório sem seção obrigatória: ${faltando.join(", ")}. Um relatório ambiental sem essas seções não é auditável.`,
    );

  return relatorio;
};

// ---- Formatos ----

// CSV: reusa o construtor de CSV das integrações, com BOM para o Excel
// brasileiro abrir com acento certo.
export const relatorioParaCsv = (relatorio) => {
  const linhas = [
    { secao: "Cliente", campo: "Nome", valor: relatorio.cliente.nome },
    { secao: "Período", campo: "Intervalo", valor: relatorio.periodo.rotulo },
    { secao: "Período", campo: "Tipo", valor: relatorio.periodo.tipo },
    { secao: "Resumo", campo: "CO2 evitado (t)", valor: relatorio.resumo.co2EvitadoToneladas },
    { secao: "Resumo", campo: "Diesel evitado (L)", valor: relatorio.resumo.dieselEvitadoLitros },
    { secao: "Resumo", campo: "Redução média (%)", valor: relatorio.resumo.reducaoMediaPercent },
    { secao: "Resumo", campo: "Operações", valor: relatorio.resumo.operacoes },
    {
      secao: "Resumo",
      campo: "Green Score",
      valor: relatorio.resumo.greenScore ? relatorio.resumo.greenScore.valor : "não calculado",
    },
    { secao: "Metodologia", campo: "Descrição", valor: relatorio.metodologia.texto },
    { secao: "Metodologia", campo: "Versão dos fatores", valor: relatorio.metodologia.versaoFatores },
    { secao: "Metodologia", campo: "Versão dos pesos", valor: relatorio.metodologia.versaoPesos },
    { secao: "Qualidade", campo: "Média (%)", valor: relatorio.qualidadeDados.media },
    { secao: "Qualidade", campo: "Observação", valor: relatorio.qualidadeDados.observacao },
    { secao: "Aprovação", campo: "Status", valor: relatorio.aprovacao.status },
    { secao: "Aprovação", campo: "Responsável", valor: relatorio.aprovacao.responsavel },
    { secao: "Versão", campo: "Documento", valor: relatorio.versao.documento },
    { secao: "Versão", campo: "Gerado em", valor: relatorio.versao.geradoEm },
  ];
  for (const premissa of relatorio.premissas)
    linhas.push({ secao: "Premissa", campo: "—", valor: premissa });
  for (const fonte of relatorio.fontes)
    linhas.push({
      secao: "Fonte",
      campo: fonte.chave,
      valor: `${fonte.valor} ${fonte.unidade} — ${fonte.fonte} (versão ${fonte.versao}, ${fonte.responsavel})`,
    });
  for (const calculo of relatorio.memoriaCalculo)
    for (const passo of calculo.passos)
      linhas.push({
        secao: `Memória ${calculo.indice}`,
        campo: `${passo.ordem}. ${passo.descricao}`,
        valor: `${passo.formula} = ${passo.resultado} ${passo.unidade}`,
      });
  linhas.push({ secao: "Ressalva", campo: "—", valor: relatorio.ressalva });

  return withBom(toCsv(linhas, ["secao", "campo", "valor"]));
};

const escaparHtml = (valor) =>
  String(valor ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// HTML pronto para impressão. É a base do PDF e serve sozinho para envio por
// e-mail — sem depender de o cliente ter algum leitor específico.
export const relatorioParaHtml = (relatorio) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${escaparHtml(relatorio.titulo)}</title>
<style>
 body{font:14px/1.55 system-ui,sans-serif;color:#10241f;margin:0;padding:32px;max-width:820px}
 h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:26px 0 8px;color:#17624f;
   text-transform:uppercase;letter-spacing:.06em}
 table{width:100%;border-collapse:collapse;margin:8px 0}
 th,td{border:1px solid #d8e3de;padding:7px 9px;text-align:left;vertical-align:top}
 th{background:#f2f7f4;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
 .aviso{border:1px solid #e2c98a;background:#fffaeb;padding:12px;border-radius:8px;margin:14px 0}
 .ressalva{margin-top:28px;padding-top:14px;border-top:1px solid #d8e3de;font-size:12px;color:#5b6f68}
 @media print{body{padding:0}}
</style></head><body>
<h1>${escaparHtml(relatorio.titulo)}</h1>
<p>${escaparHtml(relatorio.periodo.rotulo)} · documento versão ${escaparHtml(relatorio.versao.documento)} · gerado em ${escaparHtml(relatorio.versao.geradoEm)}</p>

<h2>Resumo</h2>
<table><tbody>
<tr><th>CO₂ evitado</th><td>${relatorio.resumo.co2EvitadoToneladas} t</td></tr>
<tr><th>Diesel não consumido</th><td>${relatorio.resumo.dieselEvitadoLitros} L</td></tr>
<tr><th>Redução média</th><td>${relatorio.resumo.reducaoMediaPercent}%</td></tr>
<tr><th>Operações no período</th><td>${relatorio.resumo.operacoes}</td></tr>
<tr><th>Green Score</th><td>${
  relatorio.resumo.greenScore
    ? `${relatorio.resumo.greenScore.valor} (pesos ${escaparHtml(relatorio.resumo.greenScore.versaoPesos)})`
    : "não calculado no período"
}</td></tr>
</tbody></table>

${
  relatorio.qualidadeDados.adequadoParaRegulatorio
    ? ""
    : `<div class="aviso"><strong>Atenção:</strong> ${escaparHtml(relatorio.qualidadeDados.observacao)}</div>`
}

<h2>Metodologia</h2>
<p>${escaparHtml(relatorio.metodologia.texto)}</p>
<p>Versão dos fatores: <strong>${escaparHtml(relatorio.metodologia.versaoFatores)}</strong> · Versão dos pesos: <strong>${escaparHtml(relatorio.metodologia.versaoPesos)}</strong> · Qualidade média dos dados: <strong>${relatorio.qualidadeDados.media}%</strong></p>

<h2>Premissas</h2>
<ul>${relatorio.premissas.map((p) => `<li>${escaparHtml(p)}</li>`).join("")}</ul>

<h2>Fontes e fatores</h2>
<table><thead><tr><th>Fator</th><th>Valor</th><th>Fonte</th><th>Versão</th><th>Responsável</th></tr></thead>
<tbody>${relatorio.fontes
  .map(
    (f) =>
      `<tr><td>${escaparHtml(f.chave)}</td><td>${escaparHtml(f.valor)} ${escaparHtml(f.unidade)}</td><td>${escaparHtml(f.fonte)}</td><td>${escaparHtml(f.versao)}</td><td>${escaparHtml(f.responsavel)}</td></tr>`,
  )
  .join("")}</tbody></table>

<h2>Memória de cálculo</h2>
${relatorio.memoriaCalculo
  .map(
    (c) => `<h3>${escaparHtml(c.referencia)} (qualidade ${c.qualidade}%)</h3>
<table><thead><tr><th>#</th><th>Passo</th><th>Fórmula</th><th>Resultado</th></tr></thead>
<tbody>${c.passos
      .map(
        (p) =>
          `<tr><td>${p.ordem}</td><td>${escaparHtml(p.descricao)}</td><td>${escaparHtml(p.formula)}</td><td>${p.resultado} ${escaparHtml(p.unidade)}</td></tr>`,
      )
      .join("")}</tbody></table>`,
  )
  .join("")}

<h2>Aprovação</h2>
<table><tbody>
<tr><th>Situação</th><td>${escaparHtml(relatorio.aprovacao.status)}</td></tr>
<tr><th>Responsável</th><td>${escaparHtml(relatorio.aprovacao.responsavel) || "—"}</td></tr>
<tr><th>Cargo</th><td>${escaparHtml(relatorio.aprovacao.cargo) || "—"}</td></tr>
<tr><th>Data</th><td>${escaparHtml(relatorio.aprovacao.data) || "—"}</td></tr>
</tbody></table>

<p class="ressalva">${escaparHtml(relatorio.ressalva)}</p>
</body></html>`;

export const nomeDoArquivo = (relatorio, extensao) => {
  const cliente = texto(relatorio.cliente.nome)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `todogreen-${relatorio.escopo}-${cliente}-${relatorio.periodo.inicio}-${relatorio.periodo.fim}.${extensao}`;
};
