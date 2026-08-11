import { recorteDeCarteira, TENANT_ID } from "./todogreen-access.js";
import { searchWeb, webSearchConfiguration } from "./web-search.js";
import { normalizedPhone } from "../../src/features/logistics/crmContactNormalizationDomain.js";

const clean = (value, max = 1000) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const parse = (value, fallback) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const normalize = (value) => clean(value, 1200).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const safeUrl = (value) => { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } };
const resultKey = (item) => safeUrl(item?.url).replace(/[#?].*$/, "").replace(/\/$/, "");
const includesAny = (text, terms) => terms.some((term) => text.includes(term));
export const COMPANY_RESEARCH_VERSION = 3;

const VACANCY = ["vaga", "vagas", "career", "carreira", "emprego", "job", "jobs", "hiring", "we are hiring", "we're looking", "talentos", "recrutamento", "analista de compras", "comprador"];
const TRANSPORT = ["transporte", "transportadora", "logistica", "frete", "frota", "middle mile", "last mile", "transferencia", "distribuicao", "carrier"];
const RFQ = ["rfq", "rfp", "request for proposal", "bid", "licitacao", "edital", "concorrencia", "cotacao de frete"];
const OPEN = ["aberta", "aberto", "inscricoes", "prazo", "participe", "envie sua proposta", "recebimento de propostas", "chamada publica", "submission deadline", "open tender"];
const ACTION_CHANNEL = ["inscreva", "cadastre", "envie", "submeta", "formulario", "portal", "documentos", "propostas ate", "recebimento de propostas", "submission", "apply", "register"];
const RFQ_EDUCATIONAL = ["o que e", "what is", "significa", "diferencas", "afinal", "sopa de letrinhas", "guia", "glossario", "template", "modelo de rfp", "como funciona"];
const SUPPLIER = ["cadastro de fornecedores", "seja fornecedor", "portal do fornecedor", "supplier portal", "supplier registration", "homologacao de fornecedores"];
const ESG = ["esg", "sustentabilidade", "descarbonizacao", "emissoes", "escopo 3", "scope 3", "net zero", "carbono", "clima"];
const PROCUREMENT = ["procurement", "compras", "suprimentos", "sourcing", "supply chain"];
const LOGISTICS_PROCUREMENT = [
  "logistica", "logistics", "transporte", "transportes", "transportation", "frete",
  "freight", "carrier", "distribution", "distribuicao", "supply chain", "last mile",
  "middle mile", "inbound", "outbound",
];
const BRAZIL = [
  "brasil", "brazil", "sao paulo", "campinas", "jundiai", "guarulhos", "osasco",
  "barueri", "rio de janeiro", "belo horizonte", "curitiba", "porto alegre", "recife",
  "salvador", "fortaleza", "brasilia", "goiania", "manaus", "parana", "santa catarina",
  "rio grande do sul", "minas gerais",
];
const FOREIGN_PROFILE_HOST = /^(?:ca|ch|uk|de|fr|es|it|nl|au|mx|ar|cl|co)\.linkedin\.com$/i;
const FOREIGN_LOCATION = [
  "north america", "united states", "usa", "canada", "ontario", "toronto", "portugal",
  "porto, portugal", "switzerland", "zurich", "lucerne", "germany", "herzogenaurach",
  "united kingdom", "london", "spain", "france", "mexico", "argentina", "chile",
];
const BRAZIL_HEADQUARTERS = [
  ["sao paulo", "São Paulo, SP"], ["campinas", "Campinas, SP"], ["jundiai", "Jundiaí, SP"],
  ["guarulhos", "Guarulhos, SP"], ["osasco", "Osasco, SP"], ["barueri", "Barueri, SP"],
  ["rio de janeiro", "Rio de Janeiro, RJ"], ["belo horizonte", "Belo Horizonte, MG"],
  ["curitiba", "Curitiba, PR"], ["porto alegre", "Porto Alegre, RS"], ["recife", "Recife, PE"],
  ["salvador", "Salvador, BA"], ["fortaleza", "Fortaleza, CE"], ["brasilia", "Brasília, DF"],
  ["goiania", "Goiânia, GO"], ["manaus", "Manaus, AM"],
];
const SEGMENTS = [
  ["E-commerce", ["e-commerce", "marketplace", "comercio eletronico"]],
  ["Varejo", ["varejo", "lojas", "retail"]],
  ["Alimentos e bebidas", ["alimentos", "bebidas", "food", "restaurante"]],
  ["Indústria", ["industria", "industrial", "manufatura", "fabricacao"]],
  ["Saúde e farmacêutico", ["saude", "farmaceut", "hospital", "healthcare"]],
  ["Tecnologia", ["tecnologia", "software", "cloud", "tecnologia da informacao"]],
  ["Energia", ["energia", "eletricidade", "oil & gas", "petroleo"]],
  ["Logística e transportes", ["logistica", "transporte", "transportadora", "frete"]],
  ["Serviços financeiros", ["banco", "financeir", "fintech", "seguros"]],
];

const source = (item, category, extra = {}) => ({
  title: clean(item?.title, 240),
  url: safeUrl(item?.url),
  snippet: clean(item?.snippet, category === "procurement_contact" ? 380 : 700),
  provider: clean(item?.provider, 60),
  category,
  ...extra,
});

const unique = (items, limit = 8) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = resultKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
};

const isVacancy = (item) => includesAny(normalize(`${item.title} ${item.snippet} ${item.url}`), VACANCY);

const resultsByKind = (searches = []) => searches.reduce((groups, item) => {
  const kind = clean(item?.kind, 40);
  if (!kind) return groups;
  groups[kind] = [...(groups[kind] || []), ...(Array.isArray(item?.results) ? item.results : [])];
  return groups;
}, {});

const companyTokens = (company) => normalize(company)
  .split(/\s+/)
  .filter((item) => item.length > 3 && !["grupo", "brasil"].includes(item));

const websiteBelongsToCompany = (value, company) => {
  let host = "";
  try { host = normalize(new URL(safeUrl(value)).hostname.replace(/^www\./, "")); } catch { return false; }
  const tokens = companyTokens(company);
  return Boolean(host && tokens.length && tokens.some((token) => host.includes(token)));
};

export function resolveWebsiteEnrichment({ existingWebsite, previousResearchWebsite, officialWebsite, company }) {
  const existing = safeUrl(existingWebsite);
  const previous = safeUrl(previousResearchWebsite);
  const official = safeUrl(officialWebsite);
  const wasAutoFilled = Boolean(existing && previous && resultKey({ url: existing }) === resultKey({ url: previous }));
  const shouldCorrect = Boolean(existing && !websiteBelongsToCompany(existing, company) && wasAutoFilled);
  return {
    value: shouldCorrect ? official : (!existing && official ? official : existing),
    filled: !existing && Boolean(official),
    corrected: shouldCorrect && Boolean(official),
    removed: shouldCorrect && !official,
  };
}

const mentionsCompany = (item, company) => {
  const tokens = companyTokens(company);
  if (!tokens.length) return true;
  const text = normalize(`${item?.title} ${item?.snippet} ${item?.url}`).slice(0, 900);
  return tokens.some((token) => text.includes(token));
};

const profileGeography = (item) => {
  let host = "";
  try { host = new URL(safeUrl(item?.url)).hostname.replace(/^www\./, ""); } catch { host = ""; }
  if (FOREIGN_PROFILE_HOST.test(host)) return "foreign";
  const leadingEvidence = normalize(`${item?.title} ${item?.snippet}`).slice(0, 650);
  if (includesAny(leadingEvidence, FOREIGN_LOCATION)) return "foreign";
  if (host === "br.linkedin.com" || includesAny(leadingEvidence, BRAZIL)) return "brazil";
  return "unknown";
};

const classifyContactResult = (item, company) => {
  if (!/linkedin\.com\/in\//i.test(safeUrl(item?.url))) return "not-profile";
  if (isVacancy(item)) return "vacancy";
  if (!mentionsCompany(item, company)) return "other-company";
  const text = normalize(`${item?.title} ${item?.snippet}`);
  if (!includesAny(text, PROCUREMENT)) return "not-procurement";
  if (!includesAny(text, LOGISTICS_PROCUREMENT)) return "not-logistics";
  const geography = profileGeography(item);
  if (geography === "foreign") return "foreign";
  if (geography !== "brazil") return "no-brazil-evidence";
  return "accepted";
};

const inferredSegment = (items) => {
  const evidence = unique(items, 12);
  const ranked = SEGMENTS.map(([value, terms]) => ({
    value,
    matches: evidence.filter((item) => includesAny(normalize(`${item.title} ${item.snippet}`), terms)),
  })).filter((item) => item.matches.length).sort((a, b) => b.matches.length - a.matches.length);
  const winner = ranked[0];
  if (!winner) return null;
  return { value: winner.value, source: source(winner.matches[0], "segment_evidence"), confidence: winner.matches.length > 1 ? "alta" : "moderada" };
};

const inferredHeadquarters = (items) => {
  const evidence = unique(items, 12);
  for (const item of evidence) {
    const text = normalize(`${item.title} ${item.snippet}`);
    if (!includesAny(text, ["brasil", "brazil"])) continue;
    const city = BRAZIL_HEADQUARTERS.find(([term]) => text.includes(term));
    if (city) return { value: city[1], source: source(item, "headquarters_evidence"), confidence: "moderada" };
  }
  return null;
};

const contactEmail = (item, officialHost, company) => {
  const matches = clean(`${item?.title} ${item?.snippet}`, 1600)
    .match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const companyToken = companyTokens(company)[0] || "";
  const allowed = [...new Set(matches.map((value) => value.toLowerCase()))].filter((value) => {
    const domain = value.split("@")[1] || "";
    return (officialHost && (domain === officialHost || domain.endsWith(`.${officialHost}`))) ||
      (companyToken && normalize(domain).includes(companyToken));
  });
  return allowed.length === 1 ? allowed[0] : "";
};

const contactPhone = (item) => {
  const matches = clean(`${item?.title} ${item?.snippet}`, 1600)
    .match(/(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?9?\d{4}[\s.-]*\d{4}/g) || [];
  const phones = [...new Set(matches.map(normalizedPhone).filter(Boolean))];
  return phones.length === 1 ? phones[0] : "";
};

const publicContact = (item, index, { company, officialHost }) => {
  const parts = clean(item.title, 240).replace(/\s*[|·]\s*LinkedIn.*$/i, "").split(/\s+[–—-]\s+/).map((part) => clean(part, 120)).filter(Boolean);
  const name = parts[0] || "";
  if (name.split(/\s+/).length < 2 || /linkedin|procurement|compras|suprimentos/i.test(name)) return null;
  const title = parts.slice(1).filter((part) => !companyTokens(company).some((token) => normalize(part).includes(token))).join(" · ");
  return {
    id: `web-contact-${index + 1}`,
    name,
    title: title || "Procurement logístico a confirmar",
    department: "Procurement de Logística e Transportes",
    email: contactEmail(item, officialHost, company),
    phone: contactPhone(item),
    linkedinUrl: safeUrl(item.url),
    relationshipRole: "Influenciador",
    source: "Pesquisa web",
    sourceUrl: safeUrl(item.url),
    country: "Brasil",
    specialty: "Procurement logístico",
    validation: "Perfil público com evidência de atuação no Brasil, vínculo com a empresa e escopo de logística/transportes. Confirme cargo e atualidade antes da abordagem.",
    verifiedBrazil: true,
    researchVersion: COMPANY_RESEARCH_VERSION,
    active: true,
  };
};

const isLegacyUnverifiedWebContact = (contact) =>
  normalize(contact?.source).startsWith("pesquisa web") &&
  (Number(contact?.researchVersion || 0) < COMPANY_RESEARCH_VERSION || contact?.verifiedBrazil !== true);

/** Classifica apenas o que está evidenciado no resultado. Não transforma notícia ou vaga em RFQ. */
export function classifyCompanyResearch({ company, segment, searches, checkedAt = new Date().toISOString() }) {
  const byKind = resultsByKind(searches);
  const all = unique(searches.flatMap((item) => item.results || []), 40);
  const companyToken = companyTokens(company)[0] || "";
  const linkedInCompany = all.find((item) => /linkedin\.com\/company\//i.test(item.url) && mentionsCompany(item, company));
  const officialWebsiteResult = (byKind.identity || []).find((item) => {
    const url = normalize(safeUrl(item.url));
    return Boolean(url) && !includesAny(url, ["linkedin.com", "facebook.com", "instagram.com", "wikipedia.org", "youtube.com", "jusbrasil.com", "glassdoor."]) &&
      websiteBelongsToCompany(item.url, company);
  });
  const officialWebsite = officialWebsiteResult ? {
    ...officialWebsiteResult,
    url: new URL(officialWebsiteResult.url).origin,
  } : null;
  const officialHost = officialWebsite ? new URL(officialWebsite.url).hostname.replace(/^www\./, "") : "";
  const trustedForCompany = (item) => {
    let host = "";
    try { host = new URL(safeUrl(item.url)).hostname.replace(/^www\./, ""); } catch { return false; }
    return (officialHost && (host === officialHost || host.endsWith(`.${officialHost}`))) ||
      (companyToken && normalize(host).includes(companyToken)) ||
      /(?:^|\.)(gov\.br|sp\.gov\.br)$/.test(host);
  };
  const supplierCandidates = unique((byKind.supplier || []).filter((item) => includesAny(normalize(`${item.title} ${item.snippet} ${item.url}`), SUPPLIER) && mentionsCompany(item, company) && !isVacancy(item)));
  const supplierLinks = supplierCandidates.filter(trustedForCompany).map((item) => source(item, "supplier", { actionable: true, validation: "Link compatível com o domínio da empresa ou portal público; confirme os requisitos da homologação." }));
  const supplierRejected = supplierCandidates.length - supplierLinks.length;
  const rfqCandidates = unique((byKind.rfq || []).filter((item) => {
    const text = normalize(`${item.title} ${item.snippet} ${item.url}`);
    return includesAny(text, RFQ) && !includesAny(text, RFQ_EDUCATIONAL) && !isVacancy(item) && mentionsCompany(item, company);
  }));
  const openRfqs = rfqCandidates.filter((item) => {
    const text = normalize(`${item.title} ${item.snippet} ${item.url}`);
    return includesAny(text, TRANSPORT) && includesAny(text, OPEN) && includesAny(text, ACTION_CHANNEL);
  }).filter(trustedForCompany).map((item) => source(item, "rfq", { actionable: true, validation: "O resultado menciona processo aberto e escopo de transporte em domínio compatível; confirme prazo e elegibilidade." }));
  const rejectedRfqCandidates = rfqCandidates.length - openRfqs.length;
  const esgSignals = unique((byKind.esg || []).filter((item) => mentionsCompany(item, company) && includesAny(normalize(`${item.title} ${item.snippet}`), ESG) && !isVacancy(item))).map((item) => source(item, "esg"));
  const profileResults = unique(all.filter((item) => /linkedin\.com\/in\//i.test(item.url)), 20);
  const classifiedProfiles = profileResults.map((item) => ({ item, reason: classifyContactResult(item, company) }));
  const acceptedProfiles = classifiedProfiles.filter((item) => item.reason === "accepted").map((item) => item.item);
  const procurementPeople = acceptedProfiles.map((item) => source(item, "procurement_contact", {
    currentness: "Perfil compatível com Brasil e procurement logístico; confirme vínculo e cargo antes do contato.",
    validation: "Resultado filtrado por empresa, Brasil e escopo de logística/transportes.",
  }));
  const contactCandidates = acceptedProfiles.map((item, index) => publicContact(item, index, { company, officialHost })).filter(Boolean);
  const companyNews = unique((byKind.news || []).filter((item) => mentionsCompany(item, company) && !isVacancy(item))).map((item) => source(item, "company_news"));
  const segmentNews = unique((byKind.segment || []).filter((item) => !isVacancy(item))).map((item) => source(item, "segment_news"));
  const esgRelevance = esgSignals.length ? "Alta" : segment && includesAny(normalize(segment), TRANSPORT.concat(["varejo", "industria", "e-commerce", "alimentos", "energia"])) ? "Provável" : "A validar";

  const nextActions = [];
  if (openRfqs.length) nextActions.push("Validar imediatamente prazo, rota, frota e documentos da RFQ identificada.");
  if (supplierLinks.length) nextActions.push("Iniciar ou revisar a homologação no portal oficial de fornecedores.");
  if (procurementPeople.length) nextActions.push("Confirmar cargo e vínculo atual do contato de procurement antes da abordagem.");
  if (esgSignals.length) nextActions.push("Usar a meta ESG encontrada para adaptar o argumento de redução de emissões da operação.");
  if (!nextActions.length) nextActions.push("Completar o mapa de procurement e monitorar sinais públicos; nenhuma oportunidade acionável foi comprovada nesta pesquisa.");

  return {
    version: COMPANY_RESEARCH_VERSION,
    company: clean(company, 200),
    segment: clean(segment, 120),
    suggestedSegment: inferredSegment([...(byKind.identity || []), ...(byKind.news || [])].filter((item) => mentionsCompany(item, company))),
    suggestedHeadquarters: inferredHeadquarters([...(byKind.identity || []), ...(byKind.news || [])].filter((item) => mentionsCompany(item, company))),
    checkedAt,
    officialWebsite: officialWebsite ? source(officialWebsite, "official_candidate", { verification: "Candidato a site oficial; confirme o domínio antes de usar." }) : null,
    linkedinCompany: linkedInCompany ? source(linkedInCompany, "linkedin_company") : null,
    esg: { relevance: esgRelevance, signals: esgSignals },
    supplierLinks,
    supplierRejected,
    openRfqs,
    rfqRejected: rejectedRfqCandidates,
    procurementPeople,
    contactCandidates,
    contactSearchQuality: {
      accepted: acceptedProfiles.length,
      foreignRejected: classifiedProfiles.filter((item) => item.reason === "foreign").length,
      noBrazilEvidenceRejected: classifiedProfiles.filter((item) => item.reason === "no-brazil-evidence").length,
      nonLogisticsRejected: classifiedProfiles.filter((item) => item.reason === "not-logistics").length,
      otherCompanyRejected: classifiedProfiles.filter((item) => item.reason === "other-company").length,
      vacanciesRejected: classifiedProfiles.filter((item) => item.reason === "vacancy").length,
      policy: "Somente Brasil + empresa confirmada no resultado + Procurement ligado a Logística, Transportes, Frete, Distribuição ou Supply Chain.",
    },
    companyNews,
    segmentNews,
    nextActions,
    excludedVacancies: all.filter(isVacancy).length,
    disclaimer: "Resultados públicos verificados na data indicada. Contatos só são aceitos com evidência de Brasil, vínculo com a empresa e escopo de procurement logístico. RFQ só aparece quando há empresa-alvo, transporte, processo aberto e canal real de participação. Links e cargos podem mudar e devem ser confirmados na fonte.",
  };
}

const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

/** Uma pesquisa 360 reaproveita cada resultado em várias classificações. */
export function buildCompanyResearchPlans({ company, segment, year, focus = "company" }) {
  const name = clean(company, 200);
  const market = clean(segment, 120) || "logística e transporte";
  const plans = [
    {
      kinds: ["identity", "esg", "news", "segment"],
      query: `"${name}" Brasil site oficial LinkedIn empresa segmento ESG sustentabilidade notícias ${year} ${market}`,
    },
    {
      kinds: ["supplier", "rfq"],
      query: `"${name}" Brasil ("cadastro de fornecedores" OR "seja fornecedor" OR "RFQ aberta" OR "RFP aberta" OR licitação OR concorrência) (transporte OR transportadora OR logística OR frete) (inscrições OR prazo OR proposta OR portal)`,
    },
    {
      kinds: ["contacts"],
      query: `"${name}" Brasil site:linkedin.com/in (procurement OR compras OR suprimentos OR sourcing) (logística OR transportes OR frete OR distribution OR "supply chain")`,
    },
  ];
  if (focus === "contacts") plans.push({
    kinds: ["contacts"],
    query: `"${name}" Brasil site:linkedin.com/in (head OR diretor OR gerente OR manager) (procurement OR compras OR suprimentos OR sourcing) (logística OR transporte OR frete OR distribution OR "supply chain")`,
  });
  return plans;
}

export async function handleTodoGreenClientIntelligence(request, env, access, user) {
  if (!env.DB) return response({ error: "Banco indisponível." }, 503);
  if (!['GET', 'POST'].includes(request.method)) return response({ error: "Método não permitido." }, 405);
  const url = new URL(request.url);
  const clientId = clean(url.pathname.split("/").filter(Boolean)[3], 60);
  if (!clientId) return response({ error: "Informe o cliente." }, 400);
  const scope = recorteDeCarteira(access, user?.email, "c", "id");
  const row = await env.DB.prepare(
    `SELECT c.id,c.name,c.legal_name,c.document,c.segment,c.notes,c.fields_json,c.revision
       FROM todogreen_clients c
      WHERE c.id=? AND c.tenant_id=? AND c.workspace_owner_id=? AND c.archived_at IS NULL ${scope.sql}`,
  ).bind(clientId, TENANT_ID, access.ownerId, ...scope.params).first();
  if (!row) return response({ error: "Cliente não encontrado na sua carteira." }, 404);
  const fields = parse(row.fields_json, {});
  const cached = fields.intelligence && typeof fields.intelligence === "object" && Number(fields.intelligence.version || 0) >= COMPANY_RESEARCH_VERSION ? fields.intelligence : null;
  if (request.method === "GET")
    return response({
      intelligence: cached,
      configured: webSearchConfiguration(env).configured,
    });
  const body = await request.json().catch(() => ({}));
  const resultado = await pesquisarEmpresa(env, {
    linha: row,
    ownerId: access.ownerId,
    userId: user.id,
    forcar: body.force === true,
    focus: body.focus === "contacts" ? "contacts" : "company",
  });
  if (resultado.erro) return response({ error: resultado.erro, failures: resultado.failures }, resultado.status || 502);
  if (resultado.doCache) return response({ intelligence: resultado.relatorio, cached: true });
  return response({ intelligence: resultado.relatorio, enrichment: resultado.enrichment, client: resultado.clientPatch, cached: false });
}

/** Pesquisa compartilhada pelos botões do CRM e pelas ações confirmadas da Semente. */
export async function pesquisarEmpresa(env, { linha, ownerId, userId, forcar = false, focus = "company" }) {
  const fields = parse(linha.fields_json, {});
  const cached = fields.intelligence && typeof fields.intelligence === "object" && Number(fields.intelligence.version || 0) >= COMPANY_RESEARCH_VERSION ? fields.intelligence : null;
  const idadeDoCache = cached?.checkedAt ? Date.now() - Date.parse(cached.checkedAt) : Infinity;
  if (!forcar && idadeDoCache < 24 * 60 * 60 * 1000) return { relatorio: cached, doCache: true };

  const company = clean(linha.name, 200);
  const segment = clean(linha.segment, 120);
  const year = new Date().getUTCFullYear();
  const plans = buildCompanyResearchPlans({ company, segment, year, focus });
  const planResults = await Promise.all(plans.map(async (plan) => ({ ...plan, ...(await searchWeb(env, plan.query)) })));
  const settled = planResults.flatMap((item) => item.kinds.map((kind) => ({
    kind, configured: item.configured, results: item.results,
  })));
  if (planResults.every((item) => !item.configured))
    return { erro: "Pesquisa web ainda não configurada. Cadastre uma chave do Brave Search, Tavily, Serper, Exa, Jina ou Google Search.", status: 503 };
  const report = classifyCompanyResearch({ company, segment, searches: settled, checkedAt: new Date().toISOString() });
  report.providers = [...new Set(planResults.flatMap((item) => item.providers || []))];
  report.failures = planResults.flatMap((item) => item.failures || []).slice(0, 12);
  if (!report.providers.length && report.failures.length)
    return { erro: "A pesquisa web está configurada, mas o provedor não respondeu. Tente novamente em instantes.", failures: report.failures, status: 502 };
  const allExistingContacts = Array.isArray(fields.contacts) ? fields.contacts : [];
  const existingContacts = allExistingContacts.filter((contact) => !isLegacyUnverifiedWebContact(contact));
  const legacyContactsRemoved = allExistingContacts.length - existingContacts.length;
  let contactsUpdated = 0;
  const matchedCandidates = new Set();
  const enrichedContacts = existingContacts.map((existing) => {
    const match = (report.contactCandidates || []).find((candidate) =>
      (normalize(existing.linkedinUrl) && normalize(existing.linkedinUrl) === normalize(candidate.linkedinUrl)) ||
      (normalize(existing.email) && normalize(existing.email) === normalize(candidate.email)) ||
      normalize(existing.name) === normalize(candidate.name));
    if (!match) return existing;
    matchedCandidates.add(match.linkedinUrl);
    const next = {
      ...existing,
      title: existing.title || match.title,
      department: existing.department || match.department,
      email: existing.email || match.email,
      phone: existing.phone || match.phone,
      linkedinUrl: existing.linkedinUrl || match.linkedinUrl,
      source: existing.source || "Pesquisa web (complemento)",
      sourceUrl: existing.sourceUrl || match.sourceUrl,
      validation: existing.validation || match.validation,
      country: existing.country || match.country,
      specialty: existing.specialty || match.specialty,
    };
    if (JSON.stringify(next) !== JSON.stringify(existing)) contactsUpdated += 1;
    return next;
  });
  const existingIdentities = new Set(enrichedContacts.flatMap((item) => [normalize(item.linkedinUrl), normalize(item.email), normalize(item.name)].filter(Boolean)));
  const discoveredContacts = (report.contactCandidates || []).filter((item) => !matchedCandidates.has(item.linkedinUrl) && !existingIdentities.has(normalize(item.linkedinUrl)) && !existingIdentities.has(normalize(item.email)) && !existingIdentities.has(normalize(item.name)));
  const filledSegment = !clean(linha.segment, 120) && report.suggestedSegment?.value ? report.suggestedSegment.value : clean(linha.segment, 120);
  const websiteEnrichment = resolveWebsiteEnrichment({
    existingWebsite: fields.website,
    previousResearchWebsite: fields.intelligence?.officialWebsite?.url,
    officialWebsite: report.officialWebsite?.url,
    company,
  });
  const filledWebsite = websiteEnrichment.value;
  const filledLinkedin = !clean(fields.linkedinUrl, 1000) && report.linkedinCompany?.url ? report.linkedinCompany.url : clean(fields.linkedinUrl, 1000);
  const filledHeadquarters = !clean(fields.headquarters, 160) && report.suggestedHeadquarters?.value ? report.suggestedHeadquarters.value : clean(fields.headquarters, 160);
  report.autoEnrichment = {
    segmentFilled: !clean(linha.segment, 120) && Boolean(filledSegment),
    websiteFilled: websiteEnrichment.filled,
    websiteCorrected: websiteEnrichment.corrected,
    invalidWebsiteRemoved: websiteEnrichment.removed,
    linkedinFilled: !clean(fields.linkedinUrl, 1000) && Boolean(filledLinkedin),
    headquartersFilled: !clean(fields.headquarters, 160) && Boolean(filledHeadquarters),
    contactsAdded: discoveredContacts.length,
    contactsUpdated,
    legacyContactsRemoved,
  };
  const nextContacts = [...enrichedContacts, ...discoveredContacts];
  const nextFields = { ...fields, website: filledWebsite, linkedinUrl: filledLinkedin, headquarters: filledHeadquarters, contacts: nextContacts, intelligence: report };
  await env.DB.prepare(
    `UPDATE todogreen_clients SET segment=?,fields_json=?,revision=revision+1,updated_by=?,updated_at=?
      WHERE id=? AND tenant_id=? AND workspace_owner_id=?`,
  ).bind(filledSegment, JSON.stringify(nextFields), userId, report.checkedAt, linha.id, TENANT_ID, ownerId).run();
  return {
    relatorio: report,
    enrichment: report.autoEnrichment,
    clientPatch: {
      id: linha.id,
      segment: filledSegment,
      revision: Number(linha.revision || 0) + 1,
      updatedAt: report.checkedAt,
      crm: { website: filledWebsite, linkedinUrl: filledLinkedin, headquarters: filledHeadquarters, intelligence: report },
    },
    doCache: false,
  };
}
