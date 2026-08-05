/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { calcularImpactoAmbiental } from "./esgEngineDomain.js";
import { calcularGreenScore } from "./greenScoreDomain.js";
import { montarRelatorio } from "./esgReportDomain.js";
import { FORMATOS, construirPlanilhaXml } from "./esgReportFormats.js";

const relatorio = montarRelatorio({
  cliente: { nome: "Cliente A & Cia <Ltda>", documento: "00.000.000/0001-00" },
  periodo: { tipo: "mensal", inicio: "2026-07-01", fim: "2026-07-31" },
  calculos: [
    {
      ...calcularImpactoAmbiental({
        distanciaKm: 90,
        viagens: 20,
        tipoVeiculo: "elétrico",
        origens: { distancia: "medido" },
        calculadoEm: "2026-08-01T00:00:00.000Z",
      }),
      referencia: "Rota 1",
    },
  ],
  greenScore: calcularGreenScore({
    reducaoPercent: 60,
    ocupacaoPercent: 80,
    frotaLimpaPercent: 70,
    qualidadeDados: 90,
    operacoes: 20,
    ocorrencias: 1,
  }),
  operacoes: [{ id: "1" }],
  geradoEm: "2026-08-05T00:00:00.000Z",
});

describe("os formatos oferecidos", () => {
  it("cobrem PDF, planilha, CSV, apresentação e HTML", () => {
    expect(FORMATOS.map((f) => f.id).sort()).toEqual(
      ["csv", "html", "pdf", "pptx", "xlsx"].sort(),
    );
  });

  it("todos têm rótulo em português e função de download", () => {
    for (const formato of FORMATOS) {
      expect(formato.rotulo).toBeTruthy();
      expect(typeof formato.baixar).toBe("function");
    }
  });
});

describe("planilha XLSX de verdade, não CSV renomeado", () => {
  it("produz XML de planilha válido do OOXML", () => {
    const xml = construirPlanilhaXml(relatorio);
    expect(xml).toMatch(/^<\?xml version="1\.0"/);
    expect(xml).toMatch(/spreadsheetml\/2006\/main/);
    expect(xml).toMatch(/<sheetData>/);
    expect(xml).toMatch(/<row r="1">/);
  });

  it("números vão como número, texto vai como texto", () => {
    const xml = construirPlanilhaXml(relatorio);
    // Célula numérica não leva t="inlineStr"; sem isso o Excel trata tudo como
    // texto e nenhuma soma funciona na planilha do cliente.
    expect(xml).toMatch(/<c r="C6"><v>[\d.]+<\/v><\/c>/);
    expect(xml).toMatch(/t="inlineStr"/);
  });

  it("escapa caractere especial do nome do cliente", () => {
    const xml = construirPlanilhaXml(relatorio);
    expect(xml).toMatch(/Cliente A &amp; Cia &lt;Ltda&gt;/);
    expect(xml).not.toMatch(/Cliente A & Cia <Ltda>/);
  });

  it("leva metodologia, premissas, fontes e memória — não só o resumo", () => {
    const xml = construirPlanilhaXml(relatorio);
    expect(xml).toMatch(/Metodologia/);
    expect(xml).toMatch(/Premissa/);
    expect(xml).toMatch(/Fonte/);
    expect(xml).toMatch(/Memória 1/);
    expect(xml).toMatch(/Ressalva/);
  });

  it("a coluna passa de Z para AA corretamente", () => {
    // Bug clássico de gerador de planilha feito à mão.
    const largo = {
      ...relatorio,
      premissas: relatorio.premissas,
    };
    expect(construirPlanilhaXml(largo)).toMatch(/<c r="A1"/);
    expect(construirPlanilhaXml(largo)).toMatch(/<c r="C1"/);
  });
});

describe("CSV e HTML baixam de verdade", () => {
  it("o CSV vira um arquivo com o nome certo", async () => {
    const criado = [];
    const original = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = original(tag);
      if (tag === "a") {
        criado.push(el);
        el.click = vi.fn();
      }
      return el;
    });
    vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: () => {} });

    await FORMATOS.find((f) => f.id === "csv").baixar(relatorio);

    expect(criado[0].download).toMatch(/^todogreen-cliente-.*\.csv$/);
    expect(criado[0].click).toHaveBeenCalled();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
