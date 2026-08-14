import { TENANT_ID, podeNaVertical } from "./todogreen-access.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
});

const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const safeObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const snapshot = (value) => JSON.stringify(safeObject(value)).slice(0, 24000);

export async function registrarAuditoriaTodoGreen(env, {
  access,
  user,
  action,
  resourceType,
  resourceId = "",
  clientId = "",
  before = {},
  after = {},
  details = "",
}) {
  if (!env?.DB || !access?.ownerId || !user?.id) return;
  try {
    await env.DB.prepare(
      `INSERT INTO todogreen_audit_events
         (id,tenant_id,workspace_owner_id,actor_user_id,actor_email,action,resource_type,
          resource_id,client_id,before_json,after_json,details,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      crypto.randomUUID(), TENANT_ID, access.ownerId, user.id,
      clean(user.email, 160).toLowerCase(), clean(action, 80), clean(resourceType, 80),
      clean(resourceId, 120), clean(clientId, 120), snapshot(before), snapshot(after),
      clean(details, 1000), new Date().toISOString(),
    ).run();
  } catch (error) {
    console.error("To Do Green audit", error);
  }
}

const parse = (value, fallback = {}) => {
  try { return JSON.parse(value || ""); } catch { return fallback; }
};

export async function handleTodoGreenGovernance(request, env, access, user) {
  if (!env.DB) return json({ error: "Banco indisponível." }, 503);
  if (!podeNaVertical(access, "audit:read"))
    return json({ error: "Seu papel não pode consultar a auditoria." }, 403);
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405);

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const tipo = clean(url.searchParams.get("tipo"), 80);
  const recurso = clean(url.searchParams.get("recurso"), 120);
  const cliente = clean(url.searchParams.get("cliente"), 120);
  // A vertical já tinha dois históricos anteriores: o log sensível da
  // plataforma e os eventos do portal. A tela unifica os três, sem apagar a
  // origem e sem fingir que o log antigo possui snapshots que nunca guardou.
  const { results } = await env.DB.prepare(
    `SELECT id,actor_user_id,actor_email,action,resource_type,resource_id,client_id,
            before_json,after_json,details,created_at
       FROM todogreen_audit_events
      WHERE tenant_id=? AND workspace_owner_id=?
     UNION ALL
     SELECT id,actor_id,actor_name,action,'platform',target,'','{}','{}',details,created_at
       FROM audit_log
      WHERE owner_id=? AND action LIKE 'todogreen_%'
     UNION ALL
     SELECT id,COALESCE(user_id,''),email,action,'portal',target,client_id,'{}','{}',details,created_at
       FROM todogreen_client_portal_events
      WHERE tenant_id=? AND workspace_owner_id=?
      ORDER BY created_at DESC LIMIT 1500`,
  ).bind(TENANT_ID, access.ownerId, access.ownerId, TENANT_ID, access.ownerId).all();
  const filtrados = (results || []).filter((row) =>
    (!tipo || row.resource_type === tipo)
    && (!recurso || row.resource_id === recurso)
    && (!cliente || row.client_id === cliente));
  const pagina = filtrados.slice(offset, offset + limit);
  return json({
    eventos: pagina.map((row) => ({
      id: row.id,
      atorId: row.actor_user_id,
      atorEmail: row.actor_email,
      acao: row.action,
      tipo: row.resource_type,
      recursoId: row.resource_id,
      clienteId: row.client_id,
      antes: parse(row.before_json, {}),
      depois: parse(row.after_json, {}),
      detalhes: row.details,
      criadoEm: row.created_at,
    })),
    total: filtrados.length,
    limit,
    offset,
    consultadoPor: user.email,
  });
}
