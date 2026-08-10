import { describe, expect, it } from "vitest";
import { classifyCompanyResearch } from "../../../worker/services/todogreen-client-intelligence.js";

const result = (title, url, snippet = "") => ({ title, url, snippet, provider: "teste" });

describe("inteligência externa comercial", () => {
  it("não confunde vaga com RFQ e só confirma oportunidade aberta de transporte", () => {
    const report = classifyCompanyResearch({ company: "Empresa X", segment: "Varejo", searches: [
      { kind: "rfq", results: [
        result("Vaga Comprador de Fretes", "https://jobs.example.com/1", "contratação de analista de compras"),
        result("RFQ aberta para transportadoras", "https://empresa-x.com/rfq", "Inscrições e recebimento de propostas para transporte e frete"),
        result("Notícia de expansão", "https://news.example.com/x", "nova unidade logística"),
      ] },
      { kind: "identity", results: [] }, { kind: "supplier", results: [] }, { kind: "esg", results: [] }, { kind: "news", results: [] }, { kind: "segment", results: [] },
    ], checkedAt: "2026-08-10T00:00:00.000Z" });
    expect(report.openRfqs).toHaveLength(1);
    expect(report.openRfqs[0].url).toContain("empresa-x.com/rfq");
    expect(report.excludedVacancies).toBe(1);
  });

  it("separa notícias da empresa e do segmento", () => {
    const report = classifyCompanyResearch({ company: "Amazon", segment: "E-commerce", searches: [
      { kind: "news", results: [result("Amazon amplia operação", "https://news.example.com/amazon")] },
      { kind: "segment", results: [result("E-commerce e logística sustentável", "https://news.example.com/setor")] },
      { kind: "identity", results: [] }, { kind: "supplier", results: [] }, { kind: "rfq", results: [] }, { kind: "esg", results: [] },
    ] });
    expect(report.companyNews[0].category).toBe("company_news");
    expect(report.segmentNews[0].category).toBe("segment_news");
  });

  it("sugere segmento e transforma perfil público de procurement em contato verificável", () => {
    const report = classifyCompanyResearch({ company: "Loja Exemplo", segment: "", searches: [
      { kind: "identity", results: [result("Loja Exemplo | LinkedIn", "https://www.linkedin.com/company/loja-exemplo", "Rede brasileira de varejo com lojas físicas")] },
      { kind: "contacts", results: [result("Ana Souza - Gerente de Procurement - Loja Exemplo | LinkedIn", "https://www.linkedin.com/in/ana-souza", "Compras e suprimentos")] },
      { kind: "supplier", results: [] }, { kind: "rfq", results: [] }, { kind: "esg", results: [] }, { kind: "news", results: [] }, { kind: "segment", results: [] },
    ] });
    expect(report.suggestedSegment.value).toBe("Varejo");
    expect(report.contactCandidates).toEqual([expect.objectContaining({
      name: "Ana Souza",
      linkedinUrl: "https://www.linkedin.com/in/ana-souza",
      source: "Pesquisa web",
    })]);
  });
});
