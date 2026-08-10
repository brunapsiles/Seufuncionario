// ===== HTTP e limite de taxa =====
//
// `json` é a resposta padrão de toda rota — cabeçalhos de segurança inclusos,
// para não depender de cada handler lembrar de repeti-los.
//
// `allowed` é o limitador de taxa em memória. Vive num único Map de processo
// porque o worker não tem outro estado compartilhado entre requisições; não
// sobrevive a um redeploy, e não precisa — é defesa contra rajada, não registro.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
    },
  });
}

const limits = new Map();

export function allowed(key, cap = 8) {
  const now = Date.now();
  const item = limits.get(key) || { start: now, count: 0 };
  if (now - item.start > 60_000) {
    item.start = now;
    item.count = 0;
  }
  item.count += 1;
  limits.set(key, item);
  return item.count <= cap;
}

// O IP de borda que separa "limite pensado para um atacante" de "limite
// generoso porque não há como identificar quem pede".
//
// A ausência do cabeçalho não é o único sinal disso: `wrangler dev` grava
// `cf-connecting-ip: 127.0.0.1` em toda requisição local — não deixa o
// cabeçalho ausente como a suíte de teste (`vitest-pool-workers`, que não
// passa por nenhum servidor de verdade) simulava. Um teto pensado para IP de
// borda de produção, aplicado sem essa distinção, prendia a própria suíte de
// E2E no limite de 8 por minuto assim que a sequência de testes criava mais
// de 8 contas — o que parecia travamento aleatório e era, na verdade,
// 429 silencioso em `criarConta`.
//
// Em produção o Cloudflare nunca reporta loopback como IP de um cliente
// externo, então tratar 127.0.0.1/::1 como "sem IP de borda" não abre brecha
// nenhuma — só corrige o que já deveria valer.
const LOOPBACK_IPS = new Set(["127.0.0.1", "::1"]);

export function edgeIp(request) {
  const ip = request.headers.get("cf-connecting-ip");
  return ip && !LOOPBACK_IPS.has(ip) ? ip : null;
}
