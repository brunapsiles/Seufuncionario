const MAX_QUERY_LENGTH = 500;
const MAX_RESULTS = 6;
const MAX_COMBINED_RESULTS = 12;

const EXPLICIT_WEB_INTENT =
  /\b(pesquis|busc|procur|internet|web|online|fontes?)/i;
const CURRENT_FACT_INTENT =
  /\b(not[ií]cias?|pre[cç]os?|cota[cç][aã]o|concorrentes?|mercado atual|dados atuais|informa[cç][oõ]es atuais|lei atual|regra atual)/i;

export function shouldSearchWeb(prompt, requested) {
  if (requested === false) return false;
  if (requested === true) return true;
  const text = String(prompt || "");
  return EXPLICIT_WEB_INTENT.test(text) || CURRENT_FACT_INTENT.test(text);
}

export function normalizeSearchQuery(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function normalizeSearchResults(items, provider) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: String(item?.title || item?.name || "").trim().slice(0, 240),
      url: safeUrl(item?.url || item?.link),
      snippet: String(
        item?.description ||
          item?.snippet ||
          item?.content ||
          item?.text ||
          "",
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 700),
      provider,
    }))
    .filter((item) => item.title && item.url)
    .slice(0, MAX_RESULTS);
}

async function braveSearch(query, key, fetcher) {
  const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("count", String(MAX_RESULTS));
  endpoint.searchParams.set("search_lang", "pt-br");
  endpoint.searchParams.set("country", "BR");
  endpoint.searchParams.set("safesearch", "moderate");
  const response = await fetcher(endpoint, {
    headers: {
      accept: "application/json",
      "x-subscription-token": key,
    },
  });
  if (!response.ok)
    throw new Error(`Brave Search indisponível (${response.status})`);
  const data = await response.json();
  return normalizeSearchResults(data?.web?.results, "Brave Search");
}

async function googleSearch(query, key, engineId, fetcher) {
  const endpoint = new URL("https://www.googleapis.com/customsearch/v1");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("cx", engineId);
  endpoint.searchParams.set("num", String(MAX_RESULTS));
  endpoint.searchParams.set("gl", "br");
  endpoint.searchParams.set("hl", "pt-BR");
  const response = await fetcher(endpoint);
  if (!response.ok)
    throw new Error(`Google Search indisponível (${response.status})`);
  const data = await response.json();
  return normalizeSearchResults(data?.items, "Google Search");
}

async function tavilySearch(query, key, fetcher) {
  const response = await fetcher("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      topic: "general",
      search_depth: "advanced",
      max_results: MAX_RESULTS,
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!response.ok)
    throw new Error(`Tavily indisponível (${response.status})`);
  const data = await response.json();
  return normalizeSearchResults(data?.results, "Tavily");
}

async function serperSearch(query, key, fetcher) {
  const response = await fetcher("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      q: query,
      gl: "br",
      hl: "pt-br",
      num: MAX_RESULTS,
    }),
  });
  if (!response.ok)
    throw new Error(`Serper indisponível (${response.status})`);
  const data = await response.json();
  return normalizeSearchResults(data?.organic, "Serper");
}

async function exaSearch(query, key, fetcher) {
  const response = await fetcher("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults: MAX_RESULTS,
      contents: {
        highlights: { maxCharacters: 700 },
      },
    }),
  });
  if (!response.ok) throw new Error(`Exa indisponível (${response.status})`);
  const data = await response.json();
  const items = (data?.results || []).map((item) => ({
    ...item,
    description:
      item?.highlights?.filter(Boolean).join(" ") ||
      item?.summary ||
      item?.text ||
      "",
  }));
  return normalizeSearchResults(items, "Exa");
}

async function jinaSearch(query, key, fetcher) {
  const endpoint = `https://s.jina.ai/${encodeURIComponent(query)}`;
  const response = await fetcher(endpoint, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      "x-respond-with": "no-content",
    },
  });
  if (!response.ok) throw new Error(`Jina Search indisponível (${response.status})`);
  const data = await response.json();
  const items = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.results)
      ? data.results
      : [];
  return normalizeSearchResults(items, "Jina Search");
}

function deduplicateResults(groups) {
  const seen = new Set();
  const combined = [];
  for (const group of groups) {
    for (const item of group) {
      const key = item.url.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
      if (combined.length >= MAX_COMBINED_RESULTS) return combined;
    }
  }
  return combined;
}

export async function searchWeb(env, rawQuery, { fetcher = fetch } = {}) {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 3)
    return { configured: true, query, results: [], providers: [], failures: [] };

  const braveKey =
    env.BRAVE_SEARCH_API_KEY ||
    (env.SEARCH_API_KEY && !env.SEARCH_ENGINE_ID ? env.SEARCH_API_KEY : "");
  const googleKey = env.GOOGLE_SEARCH_API_KEY || env.SEARCH_API_KEY;
  const configured = [
    env.TAVILY_API_KEY && {
      name: "Tavily",
      run: () => tavilySearch(query, env.TAVILY_API_KEY, fetcher),
    },
    braveKey && {
      name: "Brave Search",
      run: () => braveSearch(query, braveKey, fetcher),
    },
    env.SERPER_API_KEY && {
      name: "Serper",
      run: () => serperSearch(query, env.SERPER_API_KEY, fetcher),
    },
    env.EXA_API_KEY && {
      name: "Exa",
      run: () => exaSearch(query, env.EXA_API_KEY, fetcher),
    },
    env.JINA_API_KEY && {
      name: "Jina Search",
      run: () => jinaSearch(query, env.JINA_API_KEY, fetcher),
    },
    googleKey &&
      env.SEARCH_ENGINE_ID && {
        name: "Google Search",
        run: () =>
          googleSearch(query, googleKey, env.SEARCH_ENGINE_ID, fetcher),
      },
  ].filter(Boolean);

  if (!configured.length)
    return {
      configured: false,
      query,
      results: [],
      providers: [],
      failures: [],
    };

  const settled = await Promise.allSettled(configured.map((item) => item.run()));
  const successful = settled
    .map((result, index) => ({ result, provider: configured[index].name }))
    .filter((item) => item.result.status === "fulfilled");
  const failures = settled
    .map((result, index) => ({ result, provider: configured[index].name }))
    .filter((item) => item.result.status === "rejected")
    .map((item) => ({
      provider: item.provider,
      error: String(item.result.reason?.message || "Falha na busca").slice(0, 160),
    }));
  return {
    configured: true,
    query,
    results: deduplicateResults(
      successful.map((item) => item.result.value || []),
    ),
    providers: successful.map((item) => item.provider),
    failures,
  };
}

export function webResultsToContext(search) {
  if (!search?.results?.length) return "";
  const sources = search.results
    .map(
      (item, index) =>
        `[${index + 1}] ${item.title}\nURL: ${item.url}\nTrecho: ${item.snippet || "Sem resumo disponível."}`,
    )
    .join("\n\n");
  return `FONTES DA WEB RECUPERADAS AGORA
${sources}

Use somente essas fontes para afirmações atuais. Cite a fonte no formato [n] logo após a afirmação. Não invente conteúdo ausente nos trechos. Ao final, inclua "Fontes" com os links utilizados.`;
}
