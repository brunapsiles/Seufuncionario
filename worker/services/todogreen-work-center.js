const TENANT_ID = "todogreen";
const MAX_LIMIT = 200;

const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const parse = (value, fallback) => {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
};
const sha256 = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Exportado para o servico de ESG usar as MESMAS regras de sessao. Uma
// segunda copia divergiria no primeiro ajuste.
export async function authenticatedUser(request, env) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !env.DB) return null;
  return env.DB.prepare(
    `SELECT u.id, u.name, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first();
}

// Exportado pelo mesmo motivo: quem pode operar a vertical e decidido em um
// lugar so.
export async function resolveAccess(env, user, requestedOwnerId) {
  const adminEmails = String(env.TODOGREEN_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const email = String(user.email || "").toLowerCase();
  const manual = await env.DB.prepare(
    `SELECT role, permissions_json
       FROM todogreen_access_emails
      WHERE tenant_id = ? AND lower(email) = ? AND status = 'active'`,
  )
    .bind(TENANT_ID, email)
    .first()
    .catch(() => null);
  const membership = await env.DB.prepare(
    `SELECT role, permissions_json, workspace_owner_id
       FROM tenant_users
      WHERE tenant_id = ? AND user_id = ? AND status = 'active'`,
  )
    .bind(TENANT_ID, user.id)
    .first()
    .catch(() => null);
  const allowed =
    adminEmails.includes(email) ||
    email.endsWith("@todogreen.com.br") ||
    !!manual ||
    !!membership;
  if (!allowed) return null;
  const role = adminEmails.includes(email)
    ? "admin"
    : manual?.role || membership?.role || "auditor";
  const permissions = adminEmails.includes(email)
    ? ["*"]
    : parse(manual?.permissions_json || membership?.permissions_json, []);
  const ownerId =
    clean(requestedOwnerId, 100) || membership?.workspace_owner_id || user.id;
  return { ownerId, role, permissions };
}

const canWrite = (access) =>
  access.role === "owner" ||
  access.role === "admin" ||
  access.permissions.includes("*") ||
  access.permissions.includes("work:manage") ||
  access.permissions.includes("work:item:write");

const mapBoard = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  specialist: row.specialist,
  types: parse(row.object_types_json, []),
  permissions: parse(row.permissions_json, {}),
  status: row.status,
  order: row.display_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapItem = (row) => ({
  id: row.id,
  boardId: row.board_id,
  type: row.type,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  responsibleUserId: row.responsible_user_id || "",
  responsible: row.responsible_label || "",
  client: row.client_label || "",
  dueDate: row.due_date || "",
  fields: parse(row.fields_json, {}),
  relations: parse(row.relations_json, []),
  dependencies: parse(row.dependencies_json, []),
  revision: row.revision,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

async function seedBoards(env, ownerId, userId) {
  const now = new Date().toISOString();
  const templates = [
    ["implantacoes", "Implantações de clientes", "Da assinatura do contrato ao início estável da operação.", "projects", ["implantacao", "tarefa", "aprovacao", "risco"], 10],
    ["torre-controle", "Torre de Controle", "Viagens, atrasos, SLA, ocorrências e planos de ação.", "operations", ["operacao", "viagem", "entrega", "nao-conformidade", "plano-de-acao"], 20],
    ["frota-sustentavel", "Frota sustentável", "Disponibilidade, manutenção, pneus, bateria, carregadores e energia.", "supplyChain", ["veiculo", "tarefa", "risco", "auditoria"], 30],
    ["comercial-deal-desk", "Comercial e Deal Desk", "RFQs, propostas, exceções, aprovações e contratos.", "commercial", ["rfq", "oportunidade", "aprovacao", "contrato", "cotacao"], 40],
    ["esg-evidencias", "ESG e Evidências", "Metas, relatórios, fatores, evidências e planos de melhoria.", "esg", ["indicador", "auditoria", "documento", "plano-de-acao"], 50],
    ["pessoas", "Pessoas e Escalas", "Treinamentos, certificações, férias, escalas e desenvolvimento.", "people", ["motorista", "tarefa", "aprovacao", "documento"], 60],
  ];
  const statements = templates.map(([id, name, description, specialist, types, order]) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO todogreen_work_boards
       (id, tenant_id, workspace_owner_id, name, description, specialist,
        object_types_json, permissions_json, status, display_order, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'active', ?, ?, ?, ?)`,
    ).bind(`${ownerId}:${id}`, TENANT_ID, ownerId, name, description, specialist, JSON.stringify(types), order, userId, now, now),
  );
  if (statements.length) await env.DB.batch(statements);
}

async function event(env, ownerId, boardId, itemId, actorId, action, before, after) {
  await env.DB.prepare(
    `INSERT INTO todogreen_work_item_events
     (id, workspace_owner_id, board_id, item_id, actor_user_id, action, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), ownerId, boardId, itemId, actorId, action, JSON.stringify(before || {}), JSON.stringify(after || {}), new Date().toISOString())
    .run();
}

export async function handleTodoGreenWorkCenter(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/todogreen/work-center")) return null;
  const user = await authenticatedUser(request, env);
  if (!user) return response({ error: "Sua sessão expirou. Entre novamente." }, 401);
  const access = await resolveAccess(env, user, url.searchParams.get("owner"));
  if (!access) return response({ error: "Você não tem acesso à To Do Green." }, 403);
  await seedBoards(env, access.ownerId, user.id);

  const parts = url.pathname.split("/").filter(Boolean);
  const itemId = parts[3] || "";
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const boardId = clean(url.searchParams.get("board"), 160);
  const cursor = clean(url.searchParams.get("cursor"), 60);

  if (request.method === "GET" && !itemId) {
    const boards = await env.DB.prepare(
      `SELECT * FROM todogreen_work_boards
        WHERE workspace_owner_id = ? AND status = 'active'
        ORDER BY display_order, name`,
    ).bind(access.ownerId).all();
    const clauses = ["workspace_owner_id = ?", "archived_at IS NULL"];
    const binds = [access.ownerId];
    if (boardId) { clauses.push("board_id = ?"); binds.push(boardId); }
    if (cursor) { clauses.push("updated_at < ?"); binds.push(cursor); }
    const rows = await env.DB.prepare(
      `SELECT * FROM todogreen_work_items
        WHERE ${clauses.join(" AND ")}
        ORDER BY updated_at DESC LIMIT ?`,
    ).bind(...binds, limit + 1).all();
    const items = (rows.results || []).map(mapItem);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    return response({
      boards: (boards.results || []).map(mapBoard),
      items,
      nextCursor: hasMore ? items[items.length - 1]?.updatedAt || null : null,
      access: { role: access.role, canWrite: canWrite(access) },
    });
  }

  if (!canWrite(access)) return response({ error: "Você não pode alterar itens da Central de Trabalho." }, 403);

  if (request.method === "POST" && !itemId) {
    const body = await request.json().catch(() => ({}));
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const normalizedBoardId = clean(body.boardId, 160);
    if (!normalizedBoardId || !clean(body.title, 240))
      return response({ error: "Informe quadro e título." }, 400);
    const board = await env.DB.prepare(
      "SELECT id FROM todogreen_work_boards WHERE id = ? AND workspace_owner_id = ? AND status = 'active'",
    ).bind(normalizedBoardId, access.ownerId).first();
    if (!board) return response({ error: "Quadro inválido." }, 400);
    await env.DB.prepare(
      `INSERT INTO todogreen_work_items
       (id, tenant_id, workspace_owner_id, board_id, type, title, description, status,
        priority, responsible_user_id, responsible_label, client_label, due_date,
        fields_json, relations_json, dependencies_json, revision, created_by, updated_by,
        created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NULL)`,
    ).bind(
      id, TENANT_ID, access.ownerId, normalizedBoardId,
      clean(body.type, 60) || "tarefa", clean(body.title, 240), clean(body.description, 4000),
      clean(body.status, 40) || "novo", clean(body.priority, 40) || "media",
      clean(body.responsibleUserId, 100) || null, clean(body.responsible, 160), clean(body.client, 200),
      clean(body.dueDate, 20) || null, JSON.stringify(body.fields || {}), JSON.stringify(body.relations || []),
      JSON.stringify(body.dependencies || []), user.id, user.id, now, now,
    ).run();
    const row = await env.DB.prepare("SELECT * FROM todogreen_work_items WHERE id = ?").bind(id).first();
    const item = mapItem(row);
    await event(env, access.ownerId, normalizedBoardId, id, user.id, "created", {}, item);
    return response({ item }, 201);
  }

  if (request.method === "PATCH" && itemId) {
    const body = await request.json().catch(() => ({}));
    const current = await env.DB.prepare(
      "SELECT * FROM todogreen_work_items WHERE id = ? AND workspace_owner_id = ? AND archived_at IS NULL",
    ).bind(itemId, access.ownerId).first();
    if (!current) return response({ error: "Item não encontrado." }, 404);
    const expectedRevision = Number(body.revision || 0);
    if (expectedRevision && expectedRevision !== Number(current.revision))
      return response({ error: "Este item foi alterado por outra pessoa. Recarregue antes de salvar.", code: "revision_conflict", current: mapItem(current) }, 409);
    const before = mapItem(current);
    const nextFields = body.fields && typeof body.fields === "object" ? body.fields : before.fields;
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE todogreen_work_items SET
       title = ?, description = ?, status = ?, priority = ?, responsible_user_id = ?,
       responsible_label = ?, client_label = ?, due_date = ?, fields_json = ?,
       relations_json = ?, dependencies_json = ?, revision = revision + 1,
       updated_by = ?, updated_at = ?
       WHERE id = ? AND workspace_owner_id = ? AND revision = ?`,
    ).bind(
      clean(body.title ?? before.title, 240), clean(body.description ?? before.description, 4000),
      clean(body.status ?? before.status, 40), clean(body.priority ?? before.priority, 40),
      clean(body.responsibleUserId ?? before.responsibleUserId, 100) || null,
      clean(body.responsible ?? before.responsible, 160), clean(body.client ?? before.client, 200),
      clean(body.dueDate ?? before.dueDate, 20) || null, JSON.stringify(nextFields),
      JSON.stringify(body.relations ?? before.relations), JSON.stringify(body.dependencies ?? before.dependencies),
      user.id, now, itemId, access.ownerId, current.revision,
    ).run();
    const row = await env.DB.prepare("SELECT * FROM todogreen_work_items WHERE id = ?").bind(itemId).first();
    const item = mapItem(row);
    await event(env, access.ownerId, item.boardId, item.id, user.id, "updated", before, item);
    return response({ item });
  }

  if (request.method === "DELETE" && itemId) {
    const current = await env.DB.prepare(
      "SELECT * FROM todogreen_work_items WHERE id = ? AND workspace_owner_id = ? AND archived_at IS NULL",
    ).bind(itemId, access.ownerId).first();
    if (!current) return response({ ok: true });
    const now = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE todogreen_work_items SET archived_at = ?, updated_at = ?, updated_by = ?, revision = revision + 1 WHERE id = ? AND workspace_owner_id = ?",
    ).bind(now, now, user.id, itemId, access.ownerId).run();
    await event(env, access.ownerId, current.board_id, itemId, user.id, "archived", mapItem(current), { archivedAt: now });
    return response({ ok: true });
  }

  return response({ error: "Método não permitido." }, 405);
}
