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
