// ===== Portal do Cliente: API =====
//
// Regra única deste arquivo: o cliente da sessão sai do banco, nunca da
// requisição. Não existe parâmetro `client` em endpoint nenhum daqui. Quem
// tentar passar um é ignorado, porque não há onde ele entrar.
//
// A autenticação, a sessão, os usuários, a auditoria e o banco são os mesmos
// do resto do Seu Funcionário. Isto é outra experiência, não outro sistema.

import {
  clientCan,
  isValidEmail,
  menuForAccess,
  normalizeEmail,
  permissionsForRole,
  clientPortalRole,
  resolveClientScope,
  scopedWhere,
} from "../../src/features/logistics/customerPortalDomain.js";

const TENANT_ID = "todogreen";
const MAX_LIMIT = 100;

const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const sha256 = async (value) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);

const parse = (value, fallback) => {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
};

// Mesma sessão do resto do produto: o portal não tem login próprio.
async function authenticatedUser(request, env) {
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
    .first()
    .catch(() => null);
}

// As tabelas nascem na migração 0032. Criá-las aqui também evita que o portal
// devolva erro quando a migração ainda não rodou — o mesmo cinto que a vertical
// já usa para o próprio catálogo.
async function ensureTables(env) {
  const ddl = [
    `CREATE TABLE IF NOT EXISTS todogreen_clients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'todogreen',
      workspace_owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      legal_name TEXT NOT NULL DEFAULT '',
      document TEXT NOT NULL DEFAULT '',
      segment TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ativo',
      portal_enabled INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      fields_json TEXT NOT NULL DEFAULT '{}',
      revision INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_todogreen_clients_tenant
       ON todogreen_clients (tenant_id, status, name)`,
    `CREATE TABLE IF NOT EXISTS todogreen_client_users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'todogreen',
      client_id TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      user_id TEXT,
      role TEXT NOT NULL DEFAULT 'cliente_leitor',
      status TEXT NOT NULL DEFAULT 'active',
      permissions_json TEXT NOT NULL DEFAULT '["portal:read"]',
      note TEXT NOT NULL DEFAULT '',
      invited_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_access_at TEXT,
      UNIQUE(tenant_id, email)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_todogreen_client_users_lookup
       ON todogreen_client_users (tenant_id, email, status)`,
    `CREATE TABLE IF NOT EXISTS todogreen_client_portal_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'todogreen',
      client_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_todogreen_client_portal_events_client
       ON todogreen_client_portal_events (client_id, created_at DESC)`,
  ];
  for (const sql of ddl) await env.DB.prepare(sql).run().catch(() => {});
}

// O ponto onde o isolamento acontece. Uma consulta, pelo e-mail da sessão.
// O resultado carrega o cliente; nada além dele é alcançável depois.
async function clientScopeForSession(env, user) {
  if (!user?.email) return null;
  const vinculo = await env.DB.prepare(
    `SELECT v.tenant_id, v.client_id, v.email, v.role, v.status,
            c.name AS client_name, c.status AS client_status,
            c.portal_enabled, c.workspace_owner_id
       FROM todogreen_client_users v
       JOIN todogreen_clients c ON c.id = v.client_id
      WHERE v.tenant_id = ? AND v.email = ?
      LIMIT 1`,
  )
    .bind(TENANT_ID, normalizeEmail(user.email))
    .first()
    .catch(() => null);
  return resolveClientScope(vinculo);
}

async function logPortalEvent(env, escopo, user, action, target = "", details = "") {
  await env.DB.prepare(
    `INSERT INTO todogreen_client_portal_events
       (id, tenant_id, client_id, user_id, email, action, target, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      escopo.tenantId,
      escopo.clientId,
      user?.id || null,
      escopo.email,
      clean(action, 80),
      clean(target, 200),
      clean(details, 500),
      new Date().toISOString(),
    )
    .run()
    .catch(() => {});
}

// ----- Indicadores do cliente -----
//
// Cada número abaixo é lido das tabelas da vertical, sempre com o cliente da
// sessão amarrado na condição. Sem registro, o número não é inventado: vem
// zero e a tela diz que não há dado.
async function clientOverview(env, escopo) {
  const { sql, params } = scopedWhere(escopo);

  const operacoes = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CAST(json_extract(fields_json, '$.deliveries') AS REAL)), 0) AS entregas,
            COALESCE(SUM(CAST(json_extract(fields_json, '$.distanceKm') AS REAL)), 0) AS km,
            COALESCE(AVG(CAST(json_extract(fields_json, '$.occupancyPercent') AS REAL)), 0) AS ocupacao
       FROM todogreen_client_operations
      WHERE ${sql}`,
  )
    .bind(...params)
    .first()
    .catch(() => null);

  // Reusa a tabela que a vertical já grava; os números moram no resultado em
  // JSON, com os mesmos nomes que o motor ambiental produz.
  const ambiental = await env.DB.prepare(
    `SELECT COALESCE(SUM(CAST(json_extract(result_json, '$.impact.co2AvoidedKg') AS REAL)), 0) AS co2,
            COALESCE(SUM(CAST(json_extract(result_json, '$.impact.dieselAvoidedLiters') AS REAL)), 0) AS diesel,
            COALESCE(AVG(CAST(json_extract(result_json, '$.impact.reductionPercent') AS REAL)), 0) AS reducao,
            COALESCE(AVG(data_quality), 0) AS qualidade,
            COUNT(*) AS calculos
       FROM environmental_calculations
      WHERE tenant_id = ? AND client_id = ?`,
  )
    .bind(escopo.tenantId, escopo.clientId)
    .first()
    .catch(() => null);

  const score = await env.DB.prepare(
    `SELECT score, weights_version, calculated_at
       FROM todogreen_green_scores
      WHERE tenant_id = ? AND client_id = ? AND scope_type = 'cliente'
      ORDER BY calculated_at DESC LIMIT 1`,
  )
    .bind(escopo.tenantId, escopo.clientId)
    .first()
    .catch(() => null);

  return {
    operacoes: {
      total: operacoes?.total || 0,
      entregas: operacoes?.entregas || 0,
      distanciaKm: operacoes?.km || 0,
      ocupacaoMedia: operacoes?.ocupacao || 0,
    },
    ambiental: {
      co2EvitadoKg: ambiental?.co2 || 0,
      dieselEvitadoL: ambiental?.diesel || 0,
      reducaoPercent: ambiental?.reducao || 0,
      qualidadeDados: ambiental?.qualidade || 0,
      calculos: ambiental?.calculos || 0,
    },
    greenScore: score
      ? {
          valor: score.score,
          versaoPesos: score.weights_version,
          calculadoEm: score.calculated_at,
        }
      : null,
    // Sem dado é sem dado. A tela mostra convite para cadastrar, não número
    // bonito que ninguém pode auditar.
    semDados:
      !(operacoes?.total || 0) && !(ambiental?.calculos || 0) && !score,
  };
}

export async function handleTodoGreenCustomerPortal(request, env) {
  if (!env.DB) return response({ error: "Banco indisponível." }, 503);

  const url = new URL(request.url);
  const resource = url.pathname
    .replace(/^\/api\/todogreen\/portal\/?/, "")
    .split("/")[0];

  const user = await authenticatedUser(request, env);
  if (!user) return response({ error: "Sessão inválida." }, 401);

  await ensureTables(env);

  const escopo = await clientScopeForSession(env, user);
  if (!escopo)
    return response(
      {
        error:
          "Esta conta não está vinculada a nenhum cliente da To Do Green.",
      },
      403,
    );

  // Sessão — quem sou eu, o que posso ver, qual é o meu menu.
  if (request.method === "GET" && (resource === "" || resource === "sessao")) {
    await logPortalEvent(env, escopo, user, "portal_aberto");
    return response({
      cliente: { id: escopo.clientId, nome: escopo.clientName },
      papel: escopo.role,
      permissoes: escopo.permissions,
      menu: menuForAccess(escopo),
      usuario: { nome: user.name, email: escopo.email },
    });
  }

  if (request.method === "GET" && resource === "resumo") {
    return response({ resumo: await clientOverview(env, escopo) });
  }

  if (request.method === "GET" && resource === "operacoes") {
    const limite = Math.min(
      Number(url.searchParams.get("limite")) || 25,
      MAX_LIMIT,
    );
    const { sql, params } = scopedWhere(escopo);
    const linhas = await env.DB.prepare(
      `SELECT id, reference, status, service_date, origin, destination,
              fields_json, created_at
         FROM todogreen_client_operations
        WHERE ${sql}
        ORDER BY service_date DESC, created_at DESC
        LIMIT ?`,
    )
      .bind(...params, limite)
      .all()
      .catch(() => ({ results: [] }));
    return response({
      operacoes: (linhas.results || []).map((linha) => ({
        id: linha.id,
        referencia: linha.reference,
        status: linha.status,
        data: linha.service_date,
        origem: linha.origin,
        destino: linha.destination,
        campos: parse(linha.fields_json, {}),
      })),
    });
  }

  if (request.method === "GET" && resource === "trilha") {
    if (!clientCan(escopo, "portal:user:manage"))
      return response({ error: "Sem permissão para ver a trilha." }, 403);
    const linhas = await env.DB.prepare(
      `SELECT action, target, details, email, created_at
         FROM todogreen_client_portal_events
        WHERE tenant_id = ? AND client_id = ?
        ORDER BY created_at DESC LIMIT 50`,
    )
      .bind(escopo.tenantId, escopo.clientId)
      .all()
      .catch(() => ({ results: [] }));
    return response({ eventos: linhas.results || [] });
  }

  return response({ error: "Rota do portal não encontrada." }, 404);
}

// ----- Administração do portal, do lado interno -----
//
// Fica aqui porque compartilha as tabelas, mas exige acesso interno de gestão:
// é a To Do Green cadastrando clientes e liberando quem entra em cada sala.
export async function handleTodoGreenClients(request, env, access, user) {
  if (!env.DB) return response({ error: "Banco indisponível." }, 503);
  if (!["owner", "admin"].includes(access?.role))
    return response({ error: "Sem permissão para gerenciar clientes." }, 403);

  await ensureTables(env);
  const url = new URL(request.url);
  const agora = new Date().toISOString();

  if (request.method === "GET") {
    const linhas = await env.DB.prepare(
      `SELECT c.id, c.name, c.document, c.segment, c.status, c.portal_enabled,
              c.updated_at,
              (SELECT COUNT(*) FROM todogreen_client_users v
                WHERE v.client_id = c.id AND v.status = 'active') AS pessoas
         FROM todogreen_clients c
        WHERE c.tenant_id = ? AND c.archived_at IS NULL
        ORDER BY c.name`,
    )
      .bind(TENANT_ID)
      .all()
      .catch(() => ({ results: [] }));
    return response({ clientes: linhas.results || [] });
  }

  if (request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return response({ error: "Corpo JSON inválido." }, 400);
    }
    const nome = clean(body.nome ?? body.name, 200);
    if (nome.length < 2)
      return response({ error: "Informe o nome do cliente." }, 400);
    const id = clean(body.id, 60) || crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO todogreen_clients
         (id, tenant_id, workspace_owner_id, name, legal_name, document, segment,
          status, portal_enabled, notes, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         legal_name = excluded.legal_name,
         document = excluded.document,
         segment = excluded.segment,
         status = excluded.status,
         portal_enabled = excluded.portal_enabled,
         notes = excluded.notes,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at,
         revision = todogreen_clients.revision + 1`,
    )
      .bind(
        id,
        TENANT_ID,
        access.ownerId || user.id,
        nome,
        clean(body.razaoSocial ?? body.legalName, 200),
        clean(body.documento ?? body.document, 40),
        clean(body.segmento ?? body.segment, 80),
        clean(body.status, 20) || "ativo",
        body.portalLiberado === true || body.portalEnabled === true ? 1 : 0,
        clean(body.observacoes ?? body.notes, 1000),
        user.id,
        user.id,
        agora,
        agora,
      )
      .run();
    return response({ ok: true, id, nome }, 201);
  }

  // Pessoas do cliente: quem, daquele cliente, entra na sala dele.
  if (request.method === "PUT") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return response({ error: "Corpo JSON inválido." }, 400);
    }
    const clientId = clean(body.clienteId ?? body.clientId, 60);
    const email = normalizeEmail(body.email);
    if (!clientId) return response({ error: "Informe o cliente." }, 400);
    if (!isValidEmail(email))
      return response({ error: "Informe um e-mail válido." }, 400);

    const cliente = await env.DB.prepare(
      "SELECT id FROM todogreen_clients WHERE tenant_id = ? AND id = ?",
    )
      .bind(TENANT_ID, clientId)
      .first();
    if (!cliente) return response({ error: "Cliente não encontrado." }, 404);

    const papel = clientPortalRole(body.papel ?? body.role);
    await env.DB.prepare(
      `INSERT INTO todogreen_client_users
         (id, tenant_id, client_id, email, role, status, permissions_json, note,
          invited_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, email) DO UPDATE SET
         client_id = excluded.client_id,
         role = excluded.role,
         status = excluded.status,
         permissions_json = excluded.permissions_json,
         note = excluded.note,
         updated_at = excluded.updated_at`,
    )
      .bind(
        crypto.randomUUID(),
        TENANT_ID,
        clientId,
        email,
        papel,
        body.status === "inactive" ? "inactive" : "active",
        JSON.stringify(permissionsForRole(papel)),
        clean(body.observacao ?? body.note, 240),
        user.id,
        agora,
        agora,
      )
      .run();
    return response({ ok: true, email, papel });
  }

  if (request.method === "DELETE") {
    const email = normalizeEmail(url.searchParams.get("email"));
    if (!email) return response({ error: "Informe o e-mail." }, 400);
    await env.DB.prepare(
      "DELETE FROM todogreen_client_users WHERE tenant_id = ? AND email = ?",
    )
      .bind(TENANT_ID, email)
      .run();
    return response({ ok: true });
  }

  return response({ error: "Método não permitido." }, 405);
}
