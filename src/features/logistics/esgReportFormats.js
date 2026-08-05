// ===== Relatórios ESG: formatos binários =====
//
// Camada de saída. Recebe o documento pronto de `esgReportDomain` e gera o
// arquivo. Todas as bibliotecas entram por import dinâmico, do mesmo jeito que
// o resto do app já faz — quem não exporta relatório não paga o peso delas.
//
// Nenhum formato aqui pode omitir metodologia, premissas, fontes, qualidade do
// dado, memória de cálculo e ressalva. Um PDF bonito sem essas seções é
// exatamente o material que faz o cliente tratar estimativa como certificação.

import { nomeDoArquivo, relatorioParaCsv, relatorioParaHtml } from "./esgReportDomain.js";

const baixar = (blob, nome) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revogar imediatamente cancela o download em alguns navegadores; o atraso
  // curto é o suficiente para o arquivo já ter sido pego.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const baixarCsv = (relatorio) => {
  baixar(
    new Blob([relatorioParaCsv(relatorio)], { type: "text/csv;charset=utf-8" }),
    nomeDoArquivo(relatorio, "csv"),
  );
};

export const baixarHtml = (relatorio) => {
  baixar(
    new Blob([relatorioParaHtml(relatorio)], { type: "text/html;charset=utf-8" }),
    nomeDoArquivo(relatorio, "html"),
  );
};

// ---- PDF ----
//
// jsPDF escreve texto, não converte HTML. Escrever as seções à mão dá controle
// sobre quebra de página — e garante que a memória de cálculo entre inteira em
// vez de ser cortada por um conversor.
export const baixarPdf = async (relatorio) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 44;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;
  const alturaPagina = doc.internal.pageSize.getHeight();
  let y = margem;

  const quebrarSePreciso = (altura) => {
    if (y + altura <= alturaPagina - margem) return;
    doc.addPage();
    y = margem;
  };

  const escrever = (texto, { tamanho = 10, estilo = "normal", espaco = 4 } = {}) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamanho);
    const linhas = doc.splitTextToSize(String(texto ?? ""), largura);
    for (const linha of linhas) {
      quebrarSePreciso(tamanho + espaco);
      doc.text(linha, margem, y);
      y += tamanho + espaco;
    }
  };

  const titulo = (texto) => {
    y += 10;
    quebrarSePreciso(24);
    doc.setTextColor(23, 98, 79);
    escrever(texto.toUpperCase(), { tamanho: 11, estilo: "bold", espaco: 6 });
    doc.setTextColor(16, 36, 31);
  };

  escrever(relatorio.titulo, { tamanho: 17, estilo: "bold", espaco: 7 });
  escrever(
    `${relatorio.periodo.rotulo} · documento versão ${relatorio.versao.documento} · gerado em ${relatorio.versao.geradoEm}`,
    { tamanho: 9 },
  );

  titulo("Resumo");
  escrever(`CO2 evitado: ${relatorio.resumo.co2EvitadoToneladas} t`);
  escrever(`Diesel não consumido: ${relatorio.resumo.dieselEvitadoLitros} L`);
  escrever(`Redução média: ${relatorio.resumo.reducaoMediaPercent}%`);
  escrever(`Operações no período: ${relatorio.resumo.operacoes}`);
  escrever(
    `Green Score: ${
      relatorio.resumo.greenScore
        ? `${relatorio.resumo.greenScore.valor} (pesos ${relatorio.resumo.greenScore.versaoPesos})`
        : "não calculado no período"
    }`,
  );

  if (!relatorio.qualidadeDados.adequadoParaRegulatorio) {
    titulo("Atenção");
    escrever(relatorio.qualidadeDados.observacao, { estilo: "bold" });
  }

  titulo("Metodologia");
  escrever(relatorio.metodologia.texto);
  escrever(
    `Versão dos fatores: ${relatorio.metodologia.versaoFatores} · Versão dos pesos: ${relatorio.metodologia.versaoPesos} · Qualidade média dos dados: ${relatorio.qualidadeDados.media}%`,
  );

  titulo("Premissas");
  for (const premissa of relatorio.premissas) escrever(`• ${premissa}`);

  titulo("Fontes e fatores");
  for (const f of relatorio.fontes)
    escrever(`• ${f.chave}: ${f.valor} ${f.unidade} — ${f.fonte} (versão ${f.versao}, ${f.responsavel})`);

  titulo("Memória de cálculo");
  for (const calculo of relatorio.memoriaCalculo) {
    escrever(`${calculo.referencia} (qualidade ${calculo.qualidade}%)`, { estilo: "bold" });
    for (const passo of calculo.passos)
      escrever(`  ${passo.ordem}. ${passo.descricao}: ${passo.formula} = ${passo.resultado} ${passo.unidade}`);
  }

  titulo("Aprovação");
  escrever(`Situação: ${relatorio.aprovacao.status}`);
  escrever(`Responsável: ${relatorio.aprovacao.responsavel || "—"}`);
  escrever(`Cargo: ${relatorio.aprovacao.cargo || "—"}`);
  escrever(`Data: ${relatorio.aprovacao.data || "—"}`);

  y += 12;
  escrever(relatorio.ressalva, { tamanho: 8 });

  doc.save(nomeDoArquivo(relatorio, "pdf"));
};

// ---- XLSX ----
//
// Sem biblioteca de planilha no projeto, o caminho honesto é escrever o OOXML
// à mão e empacotar com o JSZip que já existe. É um .xlsx de verdade, que abre
// no Excel, no LibreOffice e no Google Planilhas — não um CSV renomeado.
const escaparXml = (valor) =>
  String(valor ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c],
  );

const linhasDaPlanilha = (relatorio) => {
  const linhas = [
    ["Seção", "Campo", "Valor"],
    ["Cliente", "Nome", relatorio.cliente.nome],
    ["Cliente", "Documento", relatorio.cliente.documento],
    ["Período", "Intervalo", relatorio.periodo.rotulo],
    ["Período", "Tipo", relatorio.periodo.tipo],
    ["Resumo", "CO2 evitado (t)", relatorio.resumo.co2EvitadoToneladas],
    ["Resumo", "Diesel evitado (L)", relatorio.resumo.dieselEvitadoLitros],
    ["Resumo", "Redução média (%)", relatorio.resumo.reducaoMediaPercent],
    ["Resumo", "Operações", relatorio.resumo.operacoes],
    [
      "Resumo",
      "Green Score",
      relatorio.resumo.greenScore ? relatorio.resumo.greenScore.valor : "não calculado",
    ],
    ["Metodologia", "Descrição", relatorio.metodologia.texto],
    ["Metodologia", "Versão dos fatores", relatorio.metodologia.versaoFatores],
    ["Metodologia", "Versão dos pesos", relatorio.metodologia.versaoPesos],
    ["Qualidade", "Média (%)", relatorio.qualidadeDados.media],
    ["Qualidade", "Observação", relatorio.qualidadeDados.observacao],
  ];
  for (const p of relatorio.premissas) linhas.push(["Premissa", "—", p]);
  for (const f of relatorio.fontes)
    linhas.push([
      "Fonte",
      f.chave,
      `${f.valor} ${f.unidade} — ${f.fonte} (versão ${f.versao}, ${f.responsavel})`,
    ]);
  for (const c of relatorio.memoriaCalculo)
    for (const passo of c.passos)
      linhas.push([
        `Memória ${c.indice}`,
        `${passo.ordem}. ${passo.descricao}`,
        `${passo.formula} = ${passo.resultado} ${passo.unidade}`,
      ]);
  linhas.push(["Aprovação", "Situação", relatorio.aprovacao.status]);
  linhas.push(["Aprovação", "Responsável", relatorio.aprovacao.responsavel || "—"]);
  linhas.push(["Versão", "Documento", relatorio.versao.documento]);
  linhas.push(["Versão", "Gerado em", relatorio.versao.geradoEm]);
  linhas.push(["Ressalva", "—", relatorio.ressalva]);
  return linhas;
};

const colunaExcel = (indice) => {
  let n = indice + 1;
  let nome = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    nome = String.fromCharCode(65 + resto) + nome;
    n = Math.floor((n - 1) / 26);
  }
  return nome;
};

export const construirPlanilhaXml = (relatorio) => {
  const linhas = linhasDaPlanilha(relatorio);
  const corpo = linhas
    .map((celulas, i) => {
      const celulasXml = celulas
        .map((valor, j) => {
          const ref = `${colunaExcel(j)}${i + 1}`;
          if (typeof valor === "number" && Number.isFinite(valor))
            return `<c r="${ref}"><v>${valor}</v></c>`;
          // t="inlineStr" evita precisar da tabela de strings compartilhadas.
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
        })
        .join("");
      return `<row r="${i + 1}">${celulasXml}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${corpo}</sheetData></worksheet>`;
};

export const baixarXlsx = async (relatorio) => {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
  );
  zip.folder("_rels").file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );
  const xl = zip.folder("xl");
  xl.file(
    "workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Relatorio ESG" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  );
  xl.folder("_rels").file(
    "workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
  );
  xl.folder("worksheets").file("sheet1.xml", construirPlanilhaXml(relatorio));

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  baixar(blob, nomeDoArquivo(relatorio, "xlsx"));
};

// ---- Apresentação ----
//
// Para conselho. Poucos slides, e o último é sempre a ressalva com a
// metodologia — porque é justamente na apresentação que o número vira manchete
// e perde o contexto.
export const baixarPptx = async (relatorio) => {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const capa = pptx.addSlide();
  capa.addText(relatorio.titulo, { x: 0.6, y: 1.6, w: 11.5, fontSize: 34, bold: true, color: "17624F" });
  capa.addText(relatorio.periodo.rotulo, { x: 0.6, y: 2.7, w: 11.5, fontSize: 18, color: "5B6F68" });
  capa.addText(`Documento versão ${relatorio.versao.documento} · ${relatorio.versao.geradoEm}`, {
    x: 0.6, y: 3.3, w: 11.5, fontSize: 12, color: "5B6F68",
  });

  const resumo = pptx.addSlide();
  resumo.addText("Resumo do período", { x: 0.6, y: 0.5, fontSize: 24, bold: true, color: "17624F" });
  resumo.addTable(
    [
      [
        { text: "Indicador", options: { bold: true } },
        { text: "Valor", options: { bold: true } },
      ],
      ["CO2 evitado", `${relatorio.resumo.co2EvitadoToneladas} t`],
      ["Diesel não consumido", `${relatorio.resumo.dieselEvitadoLitros} L`],
      ["Redução média", `${relatorio.resumo.reducaoMediaPercent}%`],
      ["Operações", String(relatorio.resumo.operacoes)],
      [
        "Green Score",
        relatorio.resumo.greenScore
          ? `${relatorio.resumo.greenScore.valor} (pesos ${relatorio.resumo.greenScore.versaoPesos})`
          : "não calculado",
      ],
      ["Qualidade dos dados", `${relatorio.qualidadeDados.media}%`],
    ],
    { x: 0.6, y: 1.4, w: 11.5, fontSize: 14, border: { pt: 1, color: "D8E3DE" } },
  );

  const metodologia = pptx.addSlide();
  metodologia.addText("Metodologia e premissas", { x: 0.6, y: 0.5, fontSize: 24, bold: true, color: "17624F" });
  metodologia.addText(
    [
      { text: relatorio.metodologia.texto, options: { fontSize: 13, breakLine: true } },
      {
        text: `Fatores ${relatorio.metodologia.versaoFatores} · Pesos ${relatorio.metodologia.versaoPesos}`,
        options: { fontSize: 12, color: "5B6F68", breakLine: true },
      },
      ...relatorio.premissas.map((p) => ({
        text: `• ${p}`,
        options: { fontSize: 12, breakLine: true },
      })),
    ],
    { x: 0.6, y: 1.4, w: 11.5, h: 4.8 },
  );

  // O slide que não pode faltar: sem ele, o número da capa vira certificação na
  // cabeça de quem assiste.
  const ressalva = pptx.addSlide();
  ressalva.addText("Como ler estes números", { x: 0.6, y: 0.5, fontSize: 24, bold: true, color: "17624F" });
  ressalva.addText(
    [
      { text: relatorio.ressalva, options: { fontSize: 14, breakLine: true } },
      { text: "", options: { breakLine: true } },
      { text: relatorio.qualidadeDados.observacao, options: { fontSize: 13, color: "6F5515", breakLine: true } },
      {
        text: `Aprovação: ${relatorio.aprovacao.status}${relatorio.aprovacao.responsavel ? ` · ${relatorio.aprovacao.responsavel}` : ""}`,
        options: { fontSize: 12, color: "5B6F68" },
      },
    ],
    { x: 0.6, y: 1.4, w: 11.5, h: 4.8 },
  );

  await pptx.writeFile({ fileName: nomeDoArquivo(relatorio, "pptx") });
};

export const FORMATOS = [
  { id: "pdf", rotulo: "PDF", baixar: baixarPdf },
  { id: "xlsx", rotulo: "Planilha (XLSX)", baixar: baixarXlsx },
  { id: "csv", rotulo: "CSV", baixar: async (r) => baixarCsv(r) },
  { id: "pptx", rotulo: "Apresentação", baixar: baixarPptx },
  { id: "html", rotulo: "HTML para impressão", baixar: async (r) => baixarHtml(r) },
];
