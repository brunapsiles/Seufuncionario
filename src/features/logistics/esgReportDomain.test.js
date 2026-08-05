import { describe, expect, it } from "vitest";
import { calcularImpactoAmbiental } from "./esgEngineDomain.js";
import { calcularGreenScore } from "./greenScoreDomain.js";
import {
  SECOES_OBRIGATORIAS,
  montarRelatorio,
  nomeDoArquivo,
  relatorioParaCsv,
  relatorioParaHtml,
  rotularPeriodo,
} from "./esgReportDomain.js";

// Um relatório ambiental sem metodologia, premissa, fonte, qualidade e memória
// de cálculo não é relatório — é slide. Estes testes tratam essas seções como
// requisito, não como enfeite.

const calculo = {
  ...calcularImpactoAmbiental({
    distanciaKm: 90,
    viagens: 20,
    tipoVeiculo: "Furgão elétrico",
    origens: { distancia: "medido", ocupacao: "documentado" },
    calculadoEm: "2026-08-01T00:00:00.000Z",
  }),
  referencia: "Rota CD Cajamar → Hub SP",
};

const score = calcularGreenScore({
  reducaoPercent: 62,
  ocupacaoPercent: 80,
  frotaLimpaPercent: 70,
  qualidadeDados: 92,
  operacoes: 20,
  ocorrencias: 1,
  calculadoEm: "2026-08-01T00:00:00.000Z",
});

const base = {
  cliente: { nome: "Cliente A", documento: "00.000.000/0001-00" },
  periodo: { tipo: "mensal", inicio: "2026-07-01", fim: "2026-07-31" },
  escopo: "cliente",
  calculos: [calculo],
  greenScore: score,
  operacoes: [{ id: "op1" }, { id: "op2" }],
  geradoPor: "Sustentabilidade",
  geradoEm: "2026-08-05T00:00:00.000Z",
};

describe("o relatório não sai sem o que o torna defensável", () => {
  it("traz todas as seções obrigatórias preenchidas", () => {
    const r = montarRelatorio(base);
    for (const secao of SECOES_OBRIGATORIAS) {
      expect(r[secao], secao).toBeTruthy();
      if (Array.isArray(r[secao])) expect(r[secao].length, secao).toBeGreaterThan(0);
    }
  });

  it("sem cliente identificado, recusa", () => {
    expect(() => montarRelatorio({ ...base, cliente: {} })).toThrow(/sem cliente/i);
  });

  it("sem período, recusa — número sem intervalo não se confere", () => {
    expect(() => montarRelatorio({ ...base, periodo: {} })).toThrow(/sem período/i);
  });

  it("sem cálculo nenhum, recusa em vez de emitir relatório vazio", () => {
    // Um relatório com zero memória de cálculo passaria a impressão de que os
    // números foram apurados quando não houve apuração.
    expect(() => montarRelatorio({ ...base, calculos: [] })).toThrow(/seção obrigatória/i);
  });
});

describe("a memória de cálculo vai inteira para o relatório", () => {
  it("cada passo do motor aparece no documento", () => {
    const r = montarRelatorio(base);
    expect(r.memoriaCalculo[0].passos.length).toBe(calculo.memoria.passos.length);
    expect(r.memoriaCalculo[0].referencia).toBe("Rota CD Cajamar → Hub SP");
  });

  it("as fontes trazem valor, unidade, versão e responsável", () => {
    const r = montarRelatorio(base);
    expect(r.fontes.length).toBeGreaterThan(0);
    for (const f of r.fontes) {
      expect(f.fonte).toBeTruthy();
      expect(f.unidade).toBeTruthy();
      expect(f.versao).toBeTruthy();
      expect(f.responsavel).toBeTruthy();
    }
  });

  it("não repete a mesma fonte", () => {
    const r = montarRelatorio({ ...base, calculos: [calculo, calculo] });
    const chaves = r.fontes.map((f) => f.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("as versões de fatores e de pesos ficam registradas", () => {
    const r = montarRelatorio(base);
    expect(r.metodologia.versaoFatores).toBe(calculo.versaoFatores);
    expect(r.metodologia.versaoPesos).toBe(score.versaoPesos);
  });
});

describe("qualidade do dado muda o que o relatório afirma", () => {
  it("qualidade alta libera para comunicação", () => {
    const r = montarRelatorio(base);
    expect(r.qualidadeDados.adequadoParaRegulatorio).toBe(true);
  });

  it("qualidade baixa avisa que não serve para regulatório", () => {
    const fraco = { ...calculo, qualidadeDados: 40 };
    const r = montarRelatorio({ ...base, calculos: [fraco] });
    expect(r.qualidadeDados.adequadoParaRegulatorio).toBe(false);
    expect(r.qualidadeDados.observacao).toMatch(/não para relatório regulatório/i);
  });
});

describe("aprovação", () => {
  it("sem aprovador, nasce pendente — nunca aprovado por omissão", () => {
    expect(montarRelatorio(base).aprovacao.status).toBe("pendente");
  });

  it("com aprovador, registra quem, cargo e data", () => {
    const r = montarRelatorio({
      ...base,
      aprovacao: { responsavel: "Ana", cargo: "Diretora ESG", data: "2026-08-04", status: "aprovado" },
    });
    expect(r.aprovacao).toMatchObject({ responsavel: "Ana", cargo: "Diretora ESG", status: "aprovado" });
  });
});

describe("CSV", () => {
  it("leva metodologia, premissas, fontes e memória — não só o resumo", () => {
    const csv = relatorioParaCsv(montarRelatorio(base));
    expect(csv).toMatch(/Metodologia/);
    expect(csv).toMatch(/Premissa/);
    expect(csv).toMatch(/Fonte/);
    expect(csv).toMatch(/Memória 1/);
    expect(csv).toMatch(/Ressalva/);
  });

  it("começa com BOM, para o Excel brasileiro abrir com acento certo", () => {
    expect(relatorioParaCsv(montarRelatorio(base)).charCodeAt(0)).toBe(0xfeff);
  });
});

describe("HTML de impressão", () => {
  it("traz as seções e a ressalva", () => {
    const html = relatorioParaHtml(montarRelatorio(base));
    expect(html).toMatch(/Metodologia/);
    expect(html).toMatch(/Memória de cálculo/);
    expect(html).toMatch(/Aprovação/);
    expect(html).toMatch(/não constituem certificação/i);
  });

  it("mostra o aviso em destaque quando a qualidade é baixa", () => {
    const html = relatorioParaHtml(
      montarRelatorio({ ...base, calculos: [{ ...calculo, qualidadeDados: 30 }] }),
    );
    expect(html).toMatch(/class="aviso"/);
  });

  it("não injeta HTML vindo do nome do cliente", () => {
    // Nome de cliente é dado de fora; sem escape, viraria script no relatório
    // que alguém abre no navegador.
    const html = relatorioParaHtml(
      montarRelatorio({ ...base, cliente: { nome: '<script>alert(1)</script>' } }),
    );
    expect(html).not.toMatch(/<script>alert/);
    expect(html).toMatch(/&lt;script&gt;/);
  });
});

describe("detalhes", () => {
  it("o nome do arquivo identifica cliente, escopo e período", () => {
    const nome = nomeDoArquivo(montarRelatorio(base), "pdf");
    expect(nome).toBe("todogreen-cliente-cliente-a-2026-07-01-2026-07-31.pdf");
  });

  it("período sem data diz isso em vez de mentir um intervalo", () => {
    expect(rotularPeriodo("", "")).toMatch(/não informado/i);
  });

  it("tipo de período inválido cai no mensal", () => {
    const r = montarRelatorio({ ...base, periodo: { ...base.periodo, tipo: "decenal" } });
    expect(r.periodo.tipo).toBe("mensal");
  });
});
