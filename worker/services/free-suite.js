// ===== Laboratório de apps (Free Suite) =====
//
// CRUD de apps gerados e do marketplace de templates: quem pode ver o quê
// (freeSuiteOwner), como uma linha do banco vira app ou template na resposta,
// e as rotas que a tela chama.
//
// Extraído de worker.js, que reunia isso entre a rota pública de sites e a
// API pública de terceiros — sem nenhuma relação temática com nenhum dos
// dois vizinhos.

import { randomHex, sha256 } from "../auth/credenciais.js";
import { cleanText } from "../lib/format.js";
import { json } from "../lib/http.js";
import { membershipRole } from "../lib/membership.js";
import {
  moderateTemplate,
  normalizeAppSchema,
} from "../../src/features/free-suite/freeSuiteDomain.js";

export async function freeSuiteOwner(env, user, requestedOwnerId) {
  const ownerId = requestedOwnerId || user.id;
  const role = await membershipRole(env, user.id, ownerId);
  return role ? { ownerId, role } : null;
}

function mapGeneratedApp(row) {
  let schema = {};
  try {
    schema = normalizeAppSchema(JSON.parse(row.schema_json));
  } catch {}
  return {
    id: row.id,
    name: row.name,
    businessId: row.business_id || null,
    schema,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMarketplaceTemplate(row) {
  let schema = {};
  try {
    schema = normalizeAppSchema(JSON.parse(row.payload_json));
  } catch {}
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    license: row.license,
    publisherName: row.publisher_name,
    schema,
    status: row.status,
    moderationNotes: row.moderation_notes,
    installs: row.installs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function handleFreeSuite(request, env, user, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const resource = parts[2] || "";
  const itemId = parts[3] || "";
  let body = {};
  if (request.method !== "GET") {
    try {
      body = await request.json();
    } catch {
      return json({ error: "Solicitação inválida." }, 400);
    }
  }
  const access = await freeSuiteOwner(
    env,
    user,
    request.method === "GET"
      ? url.searchParams.get("owner")
      : body.ownerId,
  );
  if (!access)
    return json({ error: "Você não tem acesso a este espaço." }, 403);
  const { ownerId, role } = access;
  const now = new Date().toISOString();

  if (resource === "apps") {
    if (request.method === "GET") {
      const rows = await env.DB.prepare(
        `SELECT id, name, business_id, schema_json, created_at, updated_at
         FROM generated_apps WHERE workspace_owner_id = ?
         ORDER BY updated_at DESC LIMIT 100`,
      )
        .bind(ownerId)
        .all();
      return json({ apps: (rows.results || []).map(mapGeneratedApp) });
    }
    if (request.method === "POST") {
      const schema = normalizeAppSchema(body.schema);
      if (!schema.blocks.length)
        return json({ error: "Inclua ao menos um bloco válido." }, 400);
      const id = cleanText(body.id, 80) || crypto.randomUUID();
      const existing = await env.DB.prepare(
        "SELECT created_by FROM generated_apps WHERE id = ? AND workspace_owner_id = ?",
      )
        .bind(id, ownerId)
        .first();
      if (
        existing &&
        role !== "owner" &&
        role !== "admin" &&
        existing.created_by !== user.id
      )
        return json({ error: "Você não pode alterar este aplicativo." }, 403);
      await env.DB.prepare(
        `INSERT INTO generated_apps
          (id, workspace_owner_id, created_by, business_id, name, schema_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           business_id = excluded.business_id,
           name = excluded.name,
           schema_json = excluded.schema_json,
           updated_at = excluded.updated_at`,
      )
        .bind(
          id,
          ownerId,
          user.id,
          cleanText(body.businessId, 80) || null,
          cleanText(body.name || schema.name, 80),
          JSON.stringify(schema),
          now,
          now,
        )
        .run();
      const row = await env.DB.prepare(
        `SELECT id, name, business_id, schema_json, created_at, updated_at
         FROM generated_apps WHERE id = ?`,
      )
        .bind(id)
        .first();
      return json({ app: mapGeneratedApp(row) }, existing ? 200 : 201);
    }
    return json({ error: "Método não permitido." }, 405);
  }

  if (resource === "marketplace") {
    if (request.method === "GET") {
      const rows = await env.DB.prepare(
        `SELECT id, publisher_name, name, description, category, license,
                payload_json, status, moderation_notes, installs, created_at, updated_at
         FROM marketplace_templates
         WHERE status = 'approved' OR workspace_owner_id = ?
         ORDER BY CASE status WHEN 'approved' THEN 0 ELSE 1 END, updated_at DESC
         LIMIT 200`,
      )
        .bind(ownerId)
        .all();
      return json({
        templates: (rows.results || []).map(mapMarketplaceTemplate),
      });
    }
    if (request.method === "POST") {
      const schema = normalizeAppSchema(body.schema);
      const draft = {
        name: cleanText(body.name, 80),
        description: cleanText(body.description, 500),
        license: cleanText(body.license, 20),
        schema,
      };
      const moderation = moderateTemplate(draft);
      if (!moderation.approved)
        return json(
          {
            error: moderation.reasons[0],
            moderation: { approved: false, reasons: moderation.reasons },
          },
          422,
        );
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO marketplace_templates
          (id, workspace_owner_id, created_by, publisher_name, name, description,
           category, license, payload_json, status, moderation_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)`,
      )
        .bind(
          id,
          ownerId,
          user.id,
          cleanText(user.name, 80) || "Comunidade",
          draft.name,
          draft.description,
          cleanText(body.category, 40) || "Negócios",
          draft.license,
          JSON.stringify(schema),
          "Aprovado pelas regras automáticas de blocos e licença.",
          now,
          now,
        )
        .run();
      const row = await env.DB.prepare(
        `SELECT id, publisher_name, name, description, category, license,
                payload_json, status, moderation_notes, installs, created_at, updated_at
         FROM marketplace_templates WHERE id = ?`,
      )
        .bind(id)
        .first();
      return json(
        {
          template: mapMarketplaceTemplate(row),
          moderation: { approved: true, reasons: [] },
        },
        201,
      );
    }
    return json({ error: "Método não permitido." }, 405);
  }

  if (resource === "api-keys") {
    if (role !== "owner")
      return json(
        { error: "Somente o dono do espaço pode gerenciar chaves." },
        403,
      );
    if (request.method === "GET") {
      const rows = await env.DB.prepare(
        `SELECT id, name, key_prefix, scope, last_used_at, revoked_at, created_at
         FROM public_api_keys WHERE workspace_owner_id = ?
         ORDER BY created_at DESC`,
      )
        .bind(ownerId)
        .all();
      return json({
        keys: (rows.results || []).map((row) => ({
          id: row.id,
          name: row.name,
          keyPrefix: row.key_prefix,
          scope: row.scope,
          lastUsedAt: row.last_used_at,
          revokedAt: row.revoked_at,
          createdAt: row.created_at,
        })),
      });
    }
    if (request.method === "POST" && !itemId) {
      const name = cleanText(body.name, 80);
      const scope = body.scope === "read-write" ? "read-write" : "read";
      if (!name) return json({ error: "Informe o nome da chave." }, 400);
      const count = await env.DB.prepare(
        `SELECT COUNT(*) AS total FROM public_api_keys
         WHERE workspace_owner_id = ? AND revoked_at IS NULL`,
      )
        .bind(ownerId)
        .first();
      if ((count?.total || 0) >= 10)
        return json(
          { error: "Revogue uma chave antes de criar outra. Limite: 10." },
          409,
        );
      const key = `sf_live_${randomHex(24)}`;
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO public_api_keys
          (id, workspace_owner_id, created_by, name, key_hash, key_prefix, scope, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          ownerId,
          user.id,
          name,
          await sha256(key),
          key.slice(0, 16),
          scope,
          now,
        )
        .run();
      return json(
        {
          id,
          key,
          keyPrefix: key.slice(0, 16),
          scope,
          warning: "Copie agora: esta chave não será exibida novamente.",
        },
        201,
      );
    }
    if (request.method === "DELETE" && itemId) {
      const result = await env.DB.prepare(
        `UPDATE public_api_keys SET revoked_at = ?
         WHERE id = ? AND workspace_owner_id = ? AND revoked_at IS NULL`,
      )
        .bind(now, itemId, ownerId)
        .run();
      if (!result.meta?.changes)
        return json({ error: "Chave não encontrada ou já revogada." }, 404);
      return json({ ok: true });
    }
    return json({ error: "Método não permitido." }, 405);
  }

  return json({ error: "Recurso não encontrado." }, 404);
}
