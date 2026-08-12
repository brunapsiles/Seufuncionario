import { describe, expect, it } from "vitest";
import { buildCompanyResearchPlans, classifyCompanyResearch, resolveWebsiteEnrichment } from "../../../worker/services/todogreen-client-intelligence.js";

const result = (title, url, snippet = "") => ({ title, url, snippet, provider: "teste" });

describe("inteligência externa comercial", () => {
  it("separa inteligência e faz duas buscas brasileiras de contatos", () => {
    const plans = buildCompanyResearchPlans({ company: "Adidas", segment: "Varejo", year: 2026 });
    expect(plans).toHaveLength(7);
    expect(new Set(plans.flatMap((item) => item.kinds))).toEqual(new Set(["identity", "supplier", "rfq", "esg", "news", "segment", "contacts"]));
    expect(plans.every((item) => item.query.includes("Brasil"))).toBe(true);
    expect(buildCompanyResearchPlans({ company: "Adidas", segment: "Varejo", year: 2026, focus: "contacts" })).toHaveLength(8);
    const focused = buildCompanyResearchPlans({
      company: "Adidas", segment: "Varejo", year: 2026, focus: "contacts",
      knownContacts: [{ name: "Thiago Souza" }, { name: "Fernanda Vasco" }],
    });
    expect(focused).toHaveLength(10);
    expect(focused.filter((item) => item.kinds.includes("known_contacts"))).toEqual([
      expect.objectContaining({
        knownContactNames: ["Thiago Souza"],
        query: expect.stringMatching(/"Thiago Souza".*"Adidas"/),
      }),
      expect.objectContaining({ knownContactNames: ["Fernanda Vasco"] }),
    ]);
    expect(focused.filter((item) => item.kinds.includes("contacts")).every((item) => /linkedin\.com\/in|LinkedIn/.test(item.query))).toBe(true);
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

  it("não transforma conteúdo educativo ou modelo de RFP em oportunidade comercial", () => {
    const report = classifyCompanyResearch({ company: "Adidas", segment: "Varejo", searches: [
      { kind: "rfq", results: [
        result("BID, RFI, RFQ, RFP: afinal o que significa?", "https://abrafac.org.br/rfq", "Guia sobre compras estratégicas e transporte."),
        result("Adidas RFP solution template", "https://scribd.com/adidas-rfp", "Modelo de RFP em inglês."),
        result("RFI, RFP e RFQ: diferenças", "https://pipefy.com/pt-br/blog/rfq", "Como funciona cada solicitação."),
      ] },
    ] });
    expect(report.openRfqs).toHaveLength(0);
    expect(report).not.toHaveProperty("rfqWatchlist");
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
      { kind: "identity", results: [result("Loja Exemplo | LinkedIn", "https://www.linkedin.com/company/loja-exemplo", "Rede brasileira de varejo com sede em São Paulo, Brasil")] },
      { kind: "contacts", results: [result("Ana Souza - Gerente de Procurement - Loja Exemplo | LinkedIn", "https://br.linkedin.com/in/ana-souza", "São Paulo, Brasil. Procurement de logística, transportes e supply chain na Loja Exemplo.")] },
      { kind: "supplier", results: [] }, { kind: "rfq", results: [] }, { kind: "esg", results: [] }, { kind: "news", results: [] }, { kind: "segment", results: [] },
    ] });
    expect(report.suggestedSegment.value).toBe("Varejo");
    expect(report.contactCandidates).toEqual([expect.objectContaining({
      name: "Ana Souza",
      linkedinUrl: "https://br.linkedin.com/in/ana-souza",
      source: "Pesquisa web",
      country: "Brasil",
      verifiedBrazil: true,
      researchVersion: 6,
    })]);
    expect(report.version).toBe(6);
    expect(report.suggestedHeadquarters?.value).toBe("São Paulo, SP");
  });

  it("não usa matéria da Mundo Logística como site da Amazon e corrige o preenchimento antigo", () => {
    const report = classifyCompanyResearch({ company: "Amazon", segment: "E-commerce", searches: [
      { kind: "identity", results: [
        result("Amazon amplia malha logística", "https://mundologistica.com.br/noticias/amazon-amplia-malha", "Notícia sobre a operação da Amazon no Brasil."),
        result("Amazon Brasil", "https://www.amazon.com.br/", "Site da Amazon Brasil."),
      ] },
    ] });
    expect(report.officialWebsite?.url).toBe("https://www.amazon.com.br/");

    expect(resolveWebsiteEnrichment({
      company: "Amazon",
      existingWebsite: "https://mundologistica.com.br/noticias/amazon-amplia-malha",
      previousResearchWebsite: "https://mundologistica.com.br/noticias/amazon-amplia-malha",
      officialWebsite: report.officialWebsite.url,
    })).toEqual({
      value: "https://www.amazon.com.br/",
      filled: false,
      corrected: true,
      removed: false,
    });
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

  it("só inclui lideranças de logística com evidência pública de Brasil", () => {
    const report = classifyCompanyResearch({ company: "Adidas", segment: "Varejo", searches: [
      { kind: "contacts", results: [
        { ...result("Nadiah Maluf - Gerente Logistica / Transportes - adidas", "https://br.linkedin.com/in/nadiah-maluf", "Responsável pela área de transportes da adidas e pela relação com transportadoras."), searchScope: "brazil-procurement-logistics" },
        { ...result("Mikaelly M. - Gerente de Compras na adidas", "https://www.linkedin.com/in/mikaellym", "São Paulo, Brasil. Gestão estratégica de compras, supply chain e varejo na adidas."), searchScope: "brazil-procurement-logistics" },
      ] },
    ] });
    expect(report.contactCandidates.map((item) => item.name)).toEqual(["Nadiah Maluf", "Mikaelly M."]);
    expect(report.contactSearchQuality.accepted).toBe(2);
  });

  it("não usa o texto da consulta como prova de atuação no Brasil", () => {
    const report = classifyCompanyResearch({ company: "Adidas", segment: "Varejo", searches: [
      { kind: "contacts", results: [{
        ...result("Mikaelly M. - Gerente de Compras na adidas", "https://www.linkedin.com/in/mikaellym", "Gestão estratégica de compras e supply chain na adidas."),
        searchScope: "brazil-procurement-logistics",
      }] },
    ] });
    expect(report.contactCandidates).toHaveLength(0);
    expect(report.reviewCandidates).toEqual([expect.objectContaining({ rejectionReason: "no-brazil-evidence" })]);
  });

  it("localiza o LinkedIn de um contato já cadastrado sem recriá-lo", () => {
    const report = classifyCompanyResearch({ company: "Amazon", segment: "E-commerce", knownContacts: [
      { name: "Fernanda Vasco", phone: "+55 11 98839-5335", email: "fevasco@amazon.com" },
    ], searches: [
      { kind: "known_contacts", results: [{
        ...result("Fernanda Vasco - Amazon | LinkedIn", "https://www.linkedin.com/in/fernanda-vasco", "Fernanda Vasco trabalha na Amazon."),
        searchScope: "brazil-known-contact",
        knownContactNames: ["Fernanda Vasco"],
      }] },
    ] });
    expect(report.knownContactProfiles).toEqual([expect.objectContaining({ title: "Fernanda Vasco", url: "https://www.linkedin.com/in/fernanda-vasco" })]);
    expect(report.contactCandidates).toEqual([expect.objectContaining({
      name: "Fernanda Vasco",
      linkedinUrl: "https://www.linkedin.com/in/fernanda-vasco",
      source: "Pesquisa web (LinkedIn do contato)",
    })]);
  });

  it("não associa perfil sem evidência brasileira a contato salvo sem país ou telefone", () => {
    const report = classifyCompanyResearch({ company: "Amazon", segment: "E-commerce", knownContacts: [
      { name: "Fernanda Vasco", email: "fevasco@amazon.com" },
    ], searches: [{ kind: "known_contacts", results: [{
      ...result("Fernanda Vasco - Amazon | LinkedIn", "https://www.linkedin.com/in/fernanda-vasco", "Fernanda Vasco trabalha na Amazon."),
      knownContactNames: ["Fernanda Vasco"],
    }] }] });
    expect(report.contactCandidates).toHaveLength(0);
  });

  it("não repete perfil corporativo como notícia nem duplica a empresa nas tendências", () => {
    const profile = result(
      "GRUPO Caffeine Army - Mais que um grupo",
      "https://www.linkedin.com/company/caffeine-army",
      "### Company Size 51-200 employees 179 associated members Founded 2016 ### Overview",
    );
    const duplicatedNews = result(
      "Caffeine Army anuncia nova operação logística",
      "https://noticias.example.com/caffeine-army-logistica",
      "A Caffeine Army anunciou investimento em distribuição no Brasil.",
    );
    const report = classifyCompanyResearch({ company: "Caffeine Army", segment: "Alimentos e bebidas", searches: [
      { kind: "news", results: [profile, duplicatedNews] },
      { kind: "segment", results: [profile, duplicatedNews, result("Logística de alimentos avança no Brasil", "https://setor.example.com/logistica-alimentos", "Tendências de transporte e distribuição para alimentos e bebidas.")] },
    ] });
    expect(report.companyNews.map((item) => item.url)).toEqual(["https://noticias.example.com/caffeine-army-logistica"]);
    expect(report.segmentNews.map((item) => item.url)).toEqual(["https://setor.example.com/logistica-alimentos"]);
    expect(report.companyNews[0].snippet).not.toContain("###");
  });
});
