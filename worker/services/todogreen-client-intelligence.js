import { recorteDeCarteira, TENANT_ID } from "./todogreen-access.js";
import { searchWeb, webSearchConfiguration } from "./web-search.js";

const clean = (value, max = 1000) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const parse = (value, fallback) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const normalize = (value) => clean(value, 1200).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const safeUrl = (value) => { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } };
const resultKey = (item) => safeUrl(item?.url).replace(/[#?].*$/, "").replace(/\/$/, "");
const includesAny = (text, terms) => terms.some((term) => text.includes(term));

const VACANCY = ["vaga", "vagas", "career", "carreira", "emprego", "job", "talentos", "recrutamento", "analista de compras", "comprador"];
const TRANSPORT = ["transporte", "transportadora", "logistica", "frete", "frota", "middle mile", "last mile", "transferencia", "distribuicao", "carrier"];
const RFQ = ["rfq", "rfp", "request for proposal", "bid", "licitacao", "edital", "concorrencia", "cotacao de frete"];
const OPEN = ["aberta", "aberto", "inscricoes", "prazo", "participe", "envie sua proposta", "recebimento de propostas", "chamada publica"];
const SUPPLIER = ["cadastro de fornecedores", "seja fornecedor", "portal do fornecedor", "supplier portal", "supplier registration", "homologacao de fornecedores"];
const ESG = ["esg", "sustentabilidade", "descarbonizacao", "emissoes", "escopo 3", "scope 3", "net zero", "carbono", "clima"];
const PROCUREMENT = ["procurement", "compras", "suprimentos", "sourcing", "supply chain"];
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
  snippet: clean(item?.snippet, 700),
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

const publicContact = (item, index) => {
  const parts = clean(item.title, 240).replace(/\s*[|·]\s*LinkedIn.*$/i, "").split(/\s+[–—-]\s+/).map((part) => clean(part, 120)).filter(Boolean);
  const name = parts[0] || "";
  if (name.split(/\s+/).length < 2 || /linkedin|procurement|compras|suprimentos/i.test(name)) return null;
  return {
    id: `web-contact-${index + 1}`,
    name,
    title: parts.slice(1).join(" · ") || "Cargo público a confirmar",
    department: "Compras / Procurement",
    linkedinUrl: safeUrl(item.url),
    relationshipRole: "Influenciador",
    source: "Pesquisa web",
    sourceUrl: safeUrl(item.url),
    validation: "Contato público encontrado na pesquisa; confirme vínculo e cargo antes da abordagem.",
    active: true,
  };
};

/** Classifica apenas o que está evidenciado no resultado. Não transforma notícia ou vaga em RFQ. */
export function classifyCompanyResearch({ company, segment, searches, checkedAt = new Date().toISOString() }) {
  const byKind = Object.fromEntries(searches.map((item) => [item.kind, item.results || []]));
  const all = unique(searches.flatMap((item) => item.results || []), 40);
  const companyToken = normalize(company).split(/\s+/).filter((item) => item.length > 3)[0] || "";
  const linkedInCompany = all.find((item) => /linkedin\.com\/company\//i.test(item.url));
  const officialWebsite = (byKind.identity || []).find((item) => {
    const url = normalize(item.url);
    return !includesAny(url, ["linkedin.com", "facebook.com", "instagram.com", "wikipedia.org", "youtube.com", "jusbrasil.com", "glassdoor."]) &&
      (!companyToken || url.includes(companyToken));
  });
  const officialHost = officialWebsite ? new URL(officialWebsite.url).hostname.replace(/^www\./, "") : "";
  const trustedForCompany = (item) => {
    const host = new URL(item.url).hostname.replace(/^www\./, "");
    return (officialHost && (host === officialHost || host.endsWith(`.${officialHost}`))) ||
      (companyToken && normalize(host).includes(companyToken)) ||
      /(?:^|\.)(gov\.br|sp\.gov\.br)$/.test(host);
  };
  const supplierCandidates = unique((byKind.supplier || []).filter((item) => includesAny(normalize(`${item.title} ${item.snippet} ${item.url}`), SUPPLIER) && !isVacancy(item)));
  const supplierLinks = supplierCandidates.filter(trustedForCompany).map((item) => source(item, "supplier", { actionable: true, validation: "Link compatível com o domínio da empresa ou portal público; confirme os requisitos da homologação." }));
  const supplierWatchlist = supplierCandidates.filter((item) => !trustedForCompany(item)).map((item) => source(item, "supplier_watchlist", { actionable: false, validation: "O domínio não foi confirmado como oficial da empresa." }));
  const rfqCandidates = unique((byKind.rfq || []).filter((item) => includesAny(normalize(`${item.title} ${item.snippet} ${item.url}`), RFQ) && !isVacancy(item)));
  const openRfqs = rfqCandidates.filter((item) => {
    const text = normalize(`${item.title} ${item.snippet} ${item.url}`);
    return includesAny(text, TRANSPORT) && includesAny(text, OPEN);
  }).filter(trustedForCompany).map((item) => source(item, "rfq", { actionable: true, validation: "O resultado menciona processo aberto e escopo de transporte em domínio compatível; confirme prazo e elegibilidade." }));
  const rfqWatchlist = rfqCandidates.filter((item) => !openRfqs.some((open) => resultKey(open) === resultKey(item))).map((item) => source(item, "rfq_watchlist", { actionable: false, validation: "Sinal de compras encontrado, mas sem evidência suficiente de RFQ de transporte aberta agora." }));
  const esgSignals = unique((byKind.esg || []).filter((item) => includesAny(normalize(`${item.title} ${item.snippet}`), ESG) && !isVacancy(item))).map((item) => source(item, "esg"));
  const procurementPeople = unique(all.filter((item) => /linkedin\.com\/in\//i.test(item.url) && includesAny(normalize(`${item.title} ${item.snippet}`), PROCUREMENT) && !isVacancy(item))).map((item) => source(item, "procurement_contact", { currentness: "A função deve ser confirmada no perfil antes do contato." }));
  const contactCandidates = procurementPeople.map(publicContact).filter(Boolean);
  const companyNews = unique((byKind.news || []).filter((item) => !isVacancy(item))).map((item) => source(item, "company_news"));
  const segmentNews = unique((byKind.segment || []).filter((item) => !isVacancy(item))).map((item) => source(item, "segment_news"));
  const esgRelevance = esgSignals.length ? "Alta" : segment && includesAny(normalize(segment), TRANSPORT.concat(["varejo", "industria", "e-commerce", "alimentos", "energia"])) ? "Provável" : "A validar";

  const nextActions = [];
  if (openRfqs.length) nextActions.push("Validar imediatamente prazo, rota, frota e documentos da RFQ identificada.");
  if (supplierLinks.length) nextActions.push("Iniciar ou revisar a homologação no portal oficial de fornecedores.");
  if (procurementPeople.length) nextActions.push("Confirmar cargo e vínculo atual do contato de procurement antes da abordagem.");
  if (esgSignals.length) nextActions.push("Usar a meta ESG encontrada para adaptar o argumento de redução de emissões da operação.");
  if (!nextActions.length) nextActions.push("Completar o mapa de procurement e monitorar sinais públicos; nenhuma oportunidade acionável foi comprovada nesta pesquisa.");

  return {
    version: 1,
    company: clean(company, 200),
    segment: clean(segment, 120),
    suggestedSegment: inferredSegment([...(byKind.identity || []), ...(byKind.news || [])]),
    checkedAt,
    officialWebsite: officialWebsite ? source(officialWebsite, "official_candidate", { verification: "Candidato a site oficial; confirme o domínio antes de usar." }) : null,
    linkedinCompany: linkedInCompany ? source(linkedInCompany, "linkedin_company") : null,
    esg: { relevance: esgRelevance, signals: esgSignals },
    supplierLinks,
    supplierWatchlist,
    openRfqs,
    rfqWatchlist,
    procurementPeople,
    contactCandidates,
    companyNews,
    segmentNews,
    nextActions,
    excludedVacancies: all.filter(isVacancy).length,
    disclaimer: "Resultados públicos verificados na data indicada. Notícia, vaga e expansão não são tratadas como RFQ. Links e cargos podem mudar e devem ser confirmados na fonte.",
  };
}

const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

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
  const cached = fields.intelligence && typeof fields.intelligence === "object" ? fields.intelligence : null;
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
  if (resultado.erro) return response({ error: resultado.erro }, resultado.status || 502);
  if (resultado.doCache) return response({ intelligence: resultado.relatorio, cached: true });
  return response({ intelligence: resultado.relatorio, enrichment: resultado.enrichment, cached: false });
}

/**
 * A pesquisa em si, separada da rota.
 *
 * Existe como função porque tem dois chamadores: os botões "Pesquisar
 * empresa"/"Pesquisar contatos" da tela do cliente e a ação
 * `pesquisar_empresa` que a Semente propõe. Duplicar as consultas, o
 * enriquecimento e a gravação em dois lugares garantiria que um dia
 * divergissem — e a divergência apareceria como "a pesquisa da Semente acha
 * coisa diferente da pesquisa do botão".
 */
export async function pesquisarEmpresa(env, { linha, ownerId, userId, forcar = false, focus = "company" }) {
  const fields = parse(linha.fields_json, {});
  const cached = fields.intelligence && typeof fields.intelligence === "object" ? fields.intelligence : null;
  const idadeDoCache = cached?.checkedAt ? Date.now() - Date.parse(cached.checkedAt) : Infinity;
  if (!forcar && idadeDoCache < 24 * 60 * 60 * 1000) return { relatorio: cached, doCache: true };

  const company = clean(linha.name, 200);
  const segment = clean(linha.segment, 120);
  const year = new Date().getUTCFullYear();
  const queries = [
    ["identity", `"${company}" site oficial LinkedIn empresa procurement compras`],
    ["supplier", `"${company}" ("cadastro de fornecedores" OR "seja fornecedor" OR "supplier portal")`],
    ["rfq", `"${company}" (RFQ OR RFP OR licitação OR concorrência) (transporte OR transportadora OR logística OR frete)`],
    ["esg", `"${company}" ESG sustentabilidade descarbonização emissões logística Escopo 3`],
    ["news", `"${company}" notícias ${year} logística expansão operação`],
    ["segment", `${segment || "logística e transporte"} notícias tendências ${year} Brasil ESG fornecedores transporte`],
    ["contacts", `"${company}" site:linkedin.com/in (procurement OR compras OR suprimentos OR sourcing OR logística OR supply chain)`],
  ];
  if (focus === "contacts")
    queries.push(["contacts", `"${company}" site:linkedin.com/in (head OR diretor OR gerente) (procurement OR compras OR suprimentos OR logística)`]);
  const settled = await Promise.all(queries.map(async ([kind, query]) => ({ kind, ...(await searchWeb(env, query)) })));
  if (settled.every((item) => !item.configured))
    return { erro: "Pesquisa web ainda não configurada. Cadastre uma chave do Brave Search, Tavily, Serper, Exa, Jina ou Google Search.", status: 503 };
  const report = classifyCompanyResearch({ company, segment, searches: settled, checkedAt: new Date().toISOString() });
  report.providers = [...new Set(settled.flatMap((item) => item.providers || []))];
  report.failures = settled.flatMap((item) => item.failures || []).slice(0, 12);
  const existingContacts = Array.isArray(fields.contacts) ? fields.contacts : [];
  const existingIdentities = new Set(existingContacts.flatMap((item) => [normalize(item.linkedinUrl), normalize(item.name)].filter(Boolean)));
  const discoveredContacts = (report.contactCandidates || []).filter((item) => !existingIdentities.has(normalize(item.linkedinUrl)) && !existingIdentities.has(normalize(item.name)));
  const filledSegment = !clean(linha.segment, 120) && report.suggestedSegment?.value ? report.suggestedSegment.value : clean(linha.segment, 120);
  report.autoEnrichment = {
    segmentFilled: !clean(linha.segment, 120) && Boolean(filledSegment),
    contactsAdded: discoveredContacts.length,
  };
  const nextFields = { ...fields, contacts: [...existingContacts, ...discoveredContacts], intelligence: report };
  await env.DB.prepare(
    `UPDATE todogreen_clients SET segment=?,fields_json=?,revision=revision+1,updated_by=?,updated_at=?
      WHERE id=? AND tenant_id=? AND workspace_owner_id=?`,
  ).bind(filledSegment, JSON.stringify(nextFields), userId, report.checkedAt, linha.id, TENANT_ID, ownerId).run();
  return { relatorio: report, enrichment: report.autoEnrichment, doCache: false };
}
