import { describe, expect, it } from "vitest";
import { buildCompanyResearchPlans, classifyCompanyResearch } from "../../../worker/services/todogreen-client-intelligence.js";

const result = (title, url, snippet = "") => ({ title, url, snippet, provider: "teste" });

describe("inteligência externa comercial", () => {
  it("faz a pesquisa completa em três chamadas e mantém o foco brasileiro", () => {
    const plans = buildCompanyResearchPlans({ company: "Adidas", segment: "Varejo", year: 2026 });
    expect(plans).toHaveLength(3);
    expect(new Set(plans.flatMap((item) => item.kinds))).toEqual(new Set(["identity", "supplier", "rfq", "esg", "news", "segment", "contacts"]));
    expect(plans.every((item) => item.query.includes("Brasil"))).toBe(true);
    expect(buildCompanyResearchPlans({ company: "Adidas", segment: "Varejo", year: 2026, focus: "contacts" })).toHaveLength(4);
  });
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
      { kind: "contacts", results: [result("Ana Souza - Gerente de Procurement - Loja Exemplo | LinkedIn", "https://br.linkedin.com/in/ana-souza", "São Paulo, Brasil. Procurement de logística, transportes e supply chain na Loja Exemplo.")] },
      { kind: "supplier", results: [] }, { kind: "rfq", results: [] }, { kind: "esg", results: [] }, { kind: "news", results: [] }, { kind: "segment", results: [] },
    ] });
    expect(report.suggestedSegment.value).toBe("Varejo");
    expect(report.contactCandidates).toEqual([expect.objectContaining({
      name: "Ana Souza",
      linkedinUrl: "https://br.linkedin.com/in/ana-souza",
      source: "Pesquisa web",
      country: "Brasil",
    })]);
  });

  it("descarta os perfis globais retornados na pesquisa da Adidas", () => {
    const report = classifyCompanyResearch({ company: "Adidas", segment: "Varejo", searches: [
      { kind: "contacts", results: [
        result("Matt Kelly - adidas | LinkedIn", "https://www.linkedin.com/in/mattyk", "Senior Manager Non-Trade Procurement para Marketing e Retail na North America."),
        result("Ian Aranjo - adidas | LinkedIn", "https://ca.linkedin.com/in/ian-aranjo", "Scarborough, Ontario, Canada. Procurement e supply chain."),
        result("Vanessa Faria - Teya | LinkedIn", "https://www.linkedin.com/in/vanessa-faria-77524020", "Matosinhos, Porto, Portugal. Procurement."),
        result("Amaury Parrot - adidas | LinkedIn", "https://ch.linkedin.com/in/amauryparrot", "Global Procurement Logistics & Distribution em Lucerne, Switzerland."),
        result("Dana Chen - adidas | LinkedIn", "https://ch.linkedin.com/in/danakaday", "Zurich, Switzerland. Supply chain professional."),
        result("Gustavo Macias - adidas | LinkedIn", "https://www.linkedin.com/in/gustavo-macias-7b31a633", "Procurement e logística sem localização pública."),
      ] },
    ] });
    expect(report.contactCandidates).toHaveLength(0);
    expect(report.contactSearchQuality.foreignRejected).toBeGreaterThanOrEqual(3);
    expect(report.contactSearchQuality.noBrazilEvidenceRejected).toBeGreaterThanOrEqual(1);
  });

  it("combina as duas consultas de contatos sem perder resultados válidos", () => {
    const report = classifyCompanyResearch({ company: "Empresa Brasil", segment: "Indústria", searches: [
      { kind: "contacts", results: [result("Ana Souza - Procurement Logístico - Empresa Brasil | LinkedIn", "https://br.linkedin.com/in/ana", "São Paulo, Brasil. Compras de frete e transportes na Empresa Brasil.")] },
      { kind: "contacts", results: [result("Bruno Lima - Gerente de Suprimentos - Empresa Brasil | LinkedIn", "https://br.linkedin.com/in/bruno", "Curitiba, Brasil. Supply chain e contratação de transportadoras na Empresa Brasil.")] },
    ] });
    expect(report.contactCandidates.map((item) => item.name)).toEqual(["Ana Souza", "Bruno Lima"]);
  });
});
