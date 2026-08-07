// ===== Autenticação, escopo e autorização da To Do Green =====
//
// Um lugar só. Antes a decisão de "quem é você e o que você pode operar"
// estava dentro do serviço da Central de Trabalho e era importada por outros
// seis; qualquer endurecimento precisava ser lembrado em todos.
//
// Dois furos que este arquivo fecha, e que existiam de verdade:
//
// 1) ACESSO POR DOMÍNIO. A regra era `email.endsWith("@todogreen.com.br")`.
//    Qualquer pessoa que criasse uma conta com um e-mail nesse domínio entrava
//    na vertical inteira — e a regra estava num repositório público. Acesso
//    agora vem de vínculo explícito: a variável de administradores, a lista de
//    e-mails autorizados ou a associação ao tenant. Nada mais.
//
// 2) OWNER ARBITRÁRIO NA QUERY STRING. O espaço de trabalho vinha de
//    `?owner=...` sem nenhuma verificação: `clean(requestedOwnerId) || ...`.
//    Bastava trocar o parâmetro para operar o espaço de outra pessoa. Agora o
//    pedido é confrontado com os espaços que a sessão realmente alcança, e um
//    espaço fora do vínculo é recusado em vez de aceito.
//
// A regra que orienta o arquivo: **o que a sessão pode fazer sai do banco,
// nunca da requisição.**

import { verticalPermite } from "../../src/features/logistics/logisticsVerticalDomain.js";

export const TENANT_ID = "todogreen";

const clean = (value, max = 500) => String(value || "").trim().slice(0, max);

const parse = (value, fallback) => {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
};

const sha256 = async (value) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export async function authenticatedUser(request, env) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !env.DB) return null;
  return env.DB
    .prepare(
      `SELECT u.id, u.name, u.email
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(await sha256(token), new Date().toISOString())
    .first()
    .catch(() => null);
}

const administradoresDaEnv = (env) =>
  String(env.TODOGREEN_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

// Motivos de recusa. Existem para o chamador poder responder a coisa certa —
// "você não tem acesso" e "esse espaço não é seu" são situações diferentes, e
// tratá-las igual esconde tentativa de acesso indevido no meio do ruído.
export const NEGADO = {
  semVinculo: "sem-vinculo",
  espacoNaoAutorizado: "espaco-nao-autorizado",
};

export async function resolveTodoGreenAccess(env, user, requestedOwnerId) {
  if (!user?.id || !env?.DB) return { access: null, motivo: NEGADO.semVinculo };

  const email = String(user.email || "").trim().toLowerCase();
  const admins = administradoresDaEnv(env);
  const ehAdministrador = admins.includes(email);

  const autorizado = await env.DB
    .prepare(
      `SELECT role, permissions_json
         FROM todogreen_access_emails
        WHERE tenant_id = ? AND lower(email) = ? AND status = 'active'`,
    )
    .bind(TENANT_ID, email)
    .first()
    .catch(() => null);

  const vinculo = await env.DB
    .prepare(
      `SELECT role, permissions_json, workspace_owner_id
         FROM tenant_users
        WHERE tenant_id = ? AND user_id = ? AND status = 'active'`,
    )
    .bind(TENANT_ID, user.id)
    .first()
    .catch(() => null);

  // Sem domínio na conta: entrar exige alguém ter autorizado esta pessoa.
  if (!ehAdministrador && !autorizado && !vinculo)
    return { access: null, motivo: NEGADO.semVinculo };

  const role = ehAdministrador
    ? "admin"
    : autorizado?.role || vinculo?.role || "auditor";
  const permissions = ehAdministrador
    ? ["*"]
    : parse(autorizado?.permissions_json || vinculo?.permissions_json, []);

  // Os espaços que esta sessão alcança de fato. O administrador da vertical
  // opera qualquer espaço porque é dele que a operação depende; todos os
  // demais ficam presos ao próprio espaço e ao do vínculo.
  const espacoPadrao = vinculo?.workspace_owner_id || user.id;
  const permitidos = new Set([user.id, espacoPadrao].filter(Boolean));

  const pedido = clean(requestedOwnerId, 100);
  if (pedido && !ehAdministrador && !permitidos.has(pedido))
    return { access: null, motivo: NEGADO.espacoNaoAutorizado };

  return {
    access: {
      ownerId: pedido || espacoPadrao,
      role,
      permissions,
      email,
      userId: user.id,
      // Quem chegou por administrador global merece registro: é o acesso mais
      // amplo do sistema e precisa ser distinguível numa auditoria.
      viaAdministradorGlobal: ehAdministrador,
    },
    motivo: null,
  };
}

// Fachada única para os handlers: autentica, resolve e devolve a resposta
// pronta quando não pode passar. Sem isto cada serviço repetia — e às vezes
// esquecia — um dos dois passos.
export async function exigirAcessoTodoGreen(request, env) {
  const json = (data, status) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });

  const user = await authenticatedUser(request, env);
  if (!user) return { response: json({ error: "Sessão inválida." }, 401) };

  const url = new URL(request.url);
  const { access, motivo } = await resolveTodoGreenAccess(
    env,
    user,
    url.searchParams.get("owner"),
  );

  if (!access)
    return {
      response: json(
        {
          error:
            motivo === NEGADO.espacoNaoAutorizado
              ? "Este espaço de trabalho não pertence à sua conta."
              : "Você não tem acesso à To Do Green.",
        },
        403,
      ),
    };

  return { user, access };
}

// Permissão de verdade, lida do vínculo — nunca de rótulo de tela. Delega para
// a mesma regra que o front usa: uma divergência entre as duas seria um botão
// liberado na tela que o servidor recusa (ou o contrário).
export const podeNaVertical = (access, permissao) => {
  if (!access) return false;
  const concedidas = Array.isArray(access.permissions) ? access.permissions : [];
  return verticalPermite(access.role, concedidas, permissao);
};
