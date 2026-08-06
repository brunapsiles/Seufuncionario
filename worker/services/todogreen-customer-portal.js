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
import {
  STATUS_SOLICITACAO,
  TIPOS_LISTA,
  aplicarTransicao,
  prazoDaSolicitacao,
  resumoParaCliente,
  statusValido,
  validarSolicitacao,
} from "../../src/features/logistics/clientRequestDomain.js";
import {
  INSTRUCAO_ASSISTENTE,
  RESPOSTA_FORA_DE_ESCOPO,
  foraDoEscopoDoCliente,
  montarContextoDoCliente,
  validarContexto,
} from "../../src/features/logistics/customerAssistantDomain.js";

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

  // Dados para o relatório. O portal devolve o material bruto e a montagem do
  // documento acontece no navegador, com o mesmo código que a tela interna usa
  // — assim não existem duas versões do mesmo relatório.
  if (request.method === "GET" && resource === "relatorio") {
    if (!clientCan(escopo, "portal:report:export"))
      return response({ error: "Seu acesso não permite exportar relatórios." }, 403);

    const inicio = clean(url.searchParams.get("inicio"), 10);
    const fim = clean(url.searchParams.get("fim"), 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim))
      return response({ error: "Informe início e fim no formato AAAA-MM-DD." }, 400);

    const { sql, params } = scopedWhere(escopo, "service_date BETWEEN ? AND ?");
    const operacoes = await env.DB.prepare(
      `SELECT id, reference, status, service_date, origin, destination, fields_json
         FROM todogreen_client_operations
        WHERE ${sql}
        ORDER BY service_date`,
    )
      .bind(...params, inicio, fim)
      .all()
      .catch(() => ({ results: [] }));

    const calculos = await env.DB.prepare(
      `SELECT id, result_json, methodology_version, data_quality, created_at
         FROM environmental_calculations
        WHERE tenant_id = ? AND client_id = ?
          AND substr(created_at, 1, 10) BETWEEN ? AND ?
        ORDER BY created_at`,
    )
      .bind(escopo.tenantId, escopo.clientId, inicio, fim)
      .all()
      .catch(() => ({ results: [] }));

    const score = await env.DB.prepare(
      `SELECT score, weights_version, components_json, calculated_at
         FROM todogreen_green_scores
        WHERE tenant_id = ? AND client_id = ? AND scope_type = 'cliente'
        ORDER BY calculated_at DESC LIMIT 1`,
    )
      .bind(escopo.tenantId, escopo.clientId)
      .first()
      .catch(() => null);

    await logPortalEvent(env, escopo, user, "relatorio_gerado", `${inicio}..${fim}`);

    return response({
      cliente: { nome: escopo.clientName },
      periodo: { inicio, fim },
      operacoes: (operacoes.results || []).map((l) => ({
        id: l.id,
        referencia: l.reference,
        data: l.service_date,
        campos: parse(l.fields_json, {}),
      })),
      calculos: (calculos.results || []).map((l, i) => ({
        ...parse(l.result_json, {}),
        referencia: `Cálculo ${i + 1}`,
        qualidadeDados: l.data_quality,
        versaoFatores: l.methodology_version,
      })),
      greenScore: score
        ? {
            score: score.score,
            versaoPesos: score.weights_version,
            componentes: parse(score.components_json, {}),
          }
        : null,
    });
  }

  // Cofre de evidências: os documentos que sustentam os números do período.
  if (request.method === "GET" && resource === "evidencias") {
    if (!clientCan(escopo, "portal:document:download"))
      return response({ error: "Seu acesso não permite ver documentos." }, 403);
    const { sql, params } = scopedWhere(escopo);
    const linhas = await env.DB.prepare(
      `SELECT id, titulo, tipo, referencia, emitido_em, hash_conteudo, created_at
         FROM todogreen_evidences
        WHERE ${sql}
        ORDER BY emitido_em DESC, created_at DESC
        LIMIT ?`,
    )
      .bind(...params, MAX_LIMIT)
      .all()
      .catch(() => ({ results: [] }));
    return response({
      evidencias: (linhas.results || []).map((l) => ({
        id: l.id,
        titulo: l.titulo,
        tipo: l.tipo,
        referencia: l.referencia,
        emitidoEm: l.emitido_em,
        // A impressão digital do conteúdo é o que permite provar depois que o
        // documento não mudou desde a emissão.
        impressaoDigital: l.hash_conteudo,
      })),
    });
  }

  // Assistente. Reusa a IA já configurada no Worker; o que muda é o contexto,
  // montado aqui com o cliente da sessão e mais nada.
  if (request.method === "POST" && resource === "assistente") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return response({ error: "Corpo JSON inválido." }, 400);
    }
    const pergunta = clean(body.pergunta ?? body.question, 2000);
    if (pergunta.length < 2)
      return response({ error: "Escreva a sua pergunta." }, 400);

    // Recusa antes de chamar o modelo: garantia que não depende de o modelo
    // obedecer à instrução.
    if (foraDoEscopoDoCliente(pergunta)) {
      await logPortalEvent(env, escopo, user, "assistente_fora_escopo", "", pergunta.slice(0, 120));
      return response({ resposta: RESPOSTA_FORA_DE_ESCOPO, foraDeEscopo: true });
    }

    const resumo = await clientOverview(env, escopo);
    const { sql, params } = scopedWhere(escopo);
    const recentes = await env.DB.prepare(
      `SELECT reference, status, service_date, origin, destination, fields_json
         FROM todogreen_client_operations
        WHERE ${sql}
        ORDER BY service_date DESC LIMIT 20`,
    )
      .bind(...params)
      .all()
      .catch(() => ({ results: [] }));

    let contexto;
    try {
      contexto = montarContextoDoCliente({
        cliente: { id: escopo.clientId, nome: escopo.clientName },
        resumo,
        greenScore: resumo.greenScore,
        operacoes: (recentes.results || []).map((linha) => ({
          referencia: linha.reference,
          data: linha.service_date,
          origem: linha.origin,
          destino: linha.destination,
          status: linha.status,
          campos: parse(linha.fields_json, {}),
        })),
      });
      // Se algum campo interno escapou para o contexto, a chamada cai aqui em
      // vez de sair pela rede.
      validarContexto(contexto);
    } catch (erro) {
      console.error("contexto do assistente", erro);
      return response({ error: "Não foi possível preparar o assistente." }, 500);
    }

    if (!env.AI)
      return response(
        { error: "Assistente indisponível no momento." },
        503,
      );

    const modelo = env.GEMINI_MODEL || "gemini-flash-lite-latest";
    try {
      const saida = await env.AI.run(modelo, {
        messages: [
          { role: "system", content: INSTRUCAO_ASSISTENTE },
          {
            role: "user",
            content: `Dados do cliente (únicos disponíveis):\n${JSON.stringify(contexto, null, 2)}\n\nPergunta: ${pergunta}`,
          },
        ],
        max_tokens: 1200,
      });
      const texto =
        saida?.response ||
        saida?.result?.response ||
        saida?.choices?.[0]?.message?.content ||
        "";
      if (!texto.trim())
        return response({ error: "O assistente não respondeu. Tente de novo." }, 502);
      await logPortalEvent(env, escopo, user, "assistente_pergunta", "", pergunta.slice(0, 120));
      return response({ resposta: texto.trim(), foraDeEscopo: false });
    } catch (erro) {
      console.error("assistente do portal", erro);
      return response({ error: "O assistente está indisponível agora." }, 502);
    }
  }

  // ----- Solicitações -----
  //
  // A porta que a aba prometia. O cliente da solicitação vem do escopo da
  // sessão; não existe caminho para o corpo da requisição escolher outro.
  if (resource === "solicitacoes") {
    if (!clientCan(escopo, "portal:request:create") && request.method !== "GET")
      return response({ error: "Seu acesso não permite abrir solicitações." }, 403);

    if (request.method === "GET") {
      const { sql, params } = scopedWhere(escopo);
      const linhas = await env.DB.prepare(
        `SELECT id, type, subject, description, urgency, status, fields_json,
                due_at, opened_by, closed_at, created_at, updated_at
           FROM todogreen_client_requests
          WHERE ${sql}
          ORDER BY created_at DESC
          LIMIT ?`,
      )
        .bind(...params, MAX_LIMIT)
        .all()
        .catch(() => ({ results: [] }));

      const solicitacoes = (linhas.results || []).map(linhaParaSolicitacao);
      const detalhe = clean(url.searchParams.get("id"), 60);
      let mensagens = [];
      if (detalhe) {
        // Mensagem interna da equipe não sai daqui. Filtrada no SQL, não na
        // tela — esconder no navegador é entregar o dado e pedir para não olhar.
        const conversa = await env.DB.prepare(
          `SELECT id, author_side, author_name, body, created_at
             FROM todogreen_client_request_messages
            WHERE tenant_id = ? AND client_id = ? AND request_id = ? AND internal = 0
            ORDER BY created_at`,
        )
          .bind(escopo.tenantId, escopo.clientId, detalhe)
          .all()
          .catch(() => ({ results: [] }));
        mensagens = (conversa.results || []).map((m) => ({
          id: m.id,
          lado: m.author_side,
          autor: m.author_name,
          texto: m.body,
          criadaEm: m.created_at,
        }));
      }

      return response({
        solicitacoes,
        mensagens,
        resumo: resumoParaCliente(solicitacoes),
        tipos: TIPOS_LISTA.map((t) => ({
          id: t.id,
          rotulo: t.rotulo,
          descricao: t.descricao,
          prazoHoras: t.prazoHoras,
          obrigatorios: t.obrigatorios,
          camposRotulo: t.camposRotulo,
        })),
      });
    }

    if (request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return response({ error: "Corpo JSON inválido." }, 400);
      }

      // Uma nova mensagem numa solicitação existente.
      const emResposta = clean(body.solicitacaoId, 60);
      if (emResposta) return responderSolicitacao(env, escopo, user, emResposta, body);

      const validacao = validarSolicitacao(body);
      if (!validacao.valido)
        return response({ error: validacao.erros[0], erros: validacao.erros }, 400);

      const agora = new Date().toISOString();
      const id = crypto.randomUUID();
      const { tipo, assunto, descricao, urgencia, campos } = validacao.limpo;
      await env.DB.prepare(
        `INSERT INTO todogreen_client_requests
           (id, tenant_id, client_id, workspace_owner_id, type, subject, description,
            urgency, status, fields_json, due_at, opened_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberta', ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          escopo.tenantId,
          escopo.clientId,
          escopo.workspaceOwnerId || "",
          tipo,
          assunto,
          descricao,
          urgencia,
          JSON.stringify(campos),
          prazoDaSolicitacao(tipo, urgencia, agora),
          escopo.email,
          agora,
          agora,
        )
        .run();

      // A descrição vira a primeira mensagem da conversa: sem isso a thread
      // começaria no meio, sem o que foi pedido originalmente.
      await inserirMensagem(env, escopo, id, {
        lado: "cliente",
        email: escopo.email,
        nome: user?.name || escopo.email,
        texto: descricao,
      });

      await logPortalEvent(env, escopo, user, "solicitacao_aberta", id, assunto);
      return response({ ok: true, id }, 201);
    }

    if (request.method === "PATCH") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return response({ error: "Corpo JSON inválido." }, 400);
      }
      const id = clean(body.id, 60);
      if (!id) return response({ error: "Informe a solicitação." }, 400);

      const atual = await env.DB.prepare(
        `SELECT id, status FROM todogreen_client_requests
          WHERE tenant_id = ? AND client_id = ? AND id = ?`,
      )
        .bind(escopo.tenantId, escopo.clientId, id)
        .first();
      if (!atual) return response({ error: "Solicitação não encontrada." }, 404);

      const movimento = aplicarTransicao(atual, {
        lado: "cliente",
        para: clean(body.status, 30),
        autor: escopo.email,
      });
      if (!movimento.ok) return response({ error: movimento.erro }, 409);

      await env.DB.prepare(
        `UPDATE todogreen_client_requests
            SET status = ?, closed_at = ?, closed_by = ?, updated_at = ?
          WHERE tenant_id = ? AND client_id = ? AND id = ?`,
      )
        .bind(
          movimento.status,
          movimento.encerradoEm,
          movimento.encerradoPor,
          new Date().toISOString(),
          escopo.tenantId,
          escopo.clientId,
          id,
        )
        .run();

      await logPortalEvent(env, escopo, user, "solicitacao_status", id, movimento.status);
      return response({ ok: true, status: movimento.status });
    }

    return response({ error: "Método não permitido." }, 405);
  }

  return response({ error: "Rota do portal não encontrada." }, 404);
}

const linhaParaSolicitacao = (linha) => ({
  id: linha.id,
  tipo: linha.type,
  assunto: linha.subject,
  descricao: linha.description,
  urgencia: linha.urgency,
  status: linha.status,
  campos: parse(linha.fields_json, {}),
  prazoEm: linha.due_at,
  abertaPor: linha.opened_by,
  encerradaEm: linha.closed_at,
  criadaEm: linha.created_at,
  atualizadaEm: linha.updated_at,
});

async function inserirMensagem(env, escopo, requestId, { lado, email, nome, texto, interna = 0 }) {
  await env.DB.prepare(
    `INSERT INTO todogreen_client_request_messages
       (id, tenant_id, client_id, request_id, author_side, author_email, author_name,
        body, internal, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      escopo.tenantId,
      escopo.clientId,
      requestId,
      lado,
      clean(email, 160),
      clean(nome, 120),
      clean(texto, 4000),
      interna ? 1 : 0,
      new Date().toISOString(),
    )
    .run();
}

async function responderSolicitacao(env, escopo, user, id, body) {
  const texto = clean(body.mensagem ?? body.texto, 4000);
  if (texto.length < 2) return response({ error: "Escreva a sua mensagem." }, 400);

  const atual = await env.DB.prepare(
    `SELECT id, status FROM todogreen_client_requests
      WHERE tenant_id = ? AND client_id = ? AND id = ?`,
  )
    .bind(escopo.tenantId, escopo.clientId, id)
    .first();
  if (!atual) return response({ error: "Solicitação não encontrada." }, 404);
  if (STATUS_SOLICITACAO[statusValido(atual.status)].encerrado)
    return response(
      { error: "Esta solicitação já foi encerrada. Abra uma nova para retomar o assunto." },
      409,
    );

  await inserirMensagem(env, escopo, id, {
    lado: "cliente",
    email: escopo.email,
    nome: user?.name || escopo.email,
    texto,
  });

  // Cliente respondeu: a bola volta para a equipe e o relógio dela volta a
  // correr. Deixar em "aguardando cliente" esconderia o pedido da fila.
  const proximo = statusValido(atual.status) === "aguardando_cliente" ? "em_analise" : atual.status;
  await env.DB.prepare(
    `UPDATE todogreen_client_requests SET status = ?, updated_at = ?
      WHERE tenant_id = ? AND client_id = ? AND id = ?`,
  )
    .bind(proximo, new Date().toISOString(), escopo.tenantId, escopo.clientId, id)
    .run();

  await logPortalEvent(env, escopo, user, "solicitacao_mensagem", id, texto.slice(0, 120));
  return response({ ok: true, status: proximo });
}

// ----- Administração do portal, do lado interno -----
//
// Fica aqui porque compartilha as tabelas, mas exige acesso interno de gestão:
// é a To Do Green cadastrando clientes e liberando quem entra em cada sala.
export async function handleTodoGreenClients(request, env, access, user) {
  if (!env.DB) return response({ error: "Banco indisponível." }, 503);
  const url = new URL(request.url);
  const agora = new Date().toISOString();
  const podeGerenciar = ["owner", "admin"].includes(access?.role) ||
    access?.permissions?.includes("*") ||
    access?.permissions?.includes("clients:manage") ||
    access?.permissions?.includes("clients:assign");
  const emailSessao = normalizeEmail(user?.email);

  if (request.method === "GET") {
    const linhas = await env.DB.prepare(
      `SELECT c.id, c.name, c.document, c.segment, c.status, c.portal_enabled,
              c.updated_at,
              (SELECT COUNT(*) FROM todogreen_client_users v
                WHERE v.client_id = c.id AND v.status = 'active') AS pessoas
         FROM todogreen_clients c
        WHERE c.tenant_id = ? AND c.archived_at IS NULL
          AND (? = 1 OR EXISTS (
            SELECT 1 FROM todogreen_client_assignments a
             WHERE a.tenant_id = c.tenant_id AND a.client_id = c.id
               AND a.status = 'active' AND lower(a.seller_email) = ?
          ))
        ORDER BY c.name`,
    )
      .bind(TENANT_ID, podeGerenciar ? 1 : 0, emailSessao)
      .all()
      .catch(() => ({ results: [] }));
    const ids = (linhas.results || []).map((item) => item.id);
    let atribuicoes = [];
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const resultado = await env.DB.prepare(
        `SELECT client_id, seller_email, note, updated_at
           FROM todogreen_client_assignments
          WHERE tenant_id = ? AND status = 'active' AND client_id IN (${placeholders})
          ORDER BY seller_email`,
      ).bind(TENANT_ID, ...ids).all().catch(() => ({ results: [] }));
      atribuicoes = resultado.results || [];
    }
    return response({
      clientes: (linhas.results || []).map((cliente) => ({
        ...cliente,
        vendedores: atribuicoes
          .filter((item) => item.client_id === cliente.id)
          .map((item) => ({ email: item.seller_email, observacao: item.note, atualizadoEm: item.updated_at })),
      })),
      acesso: { podeGerenciar, somenteCarteira: !podeGerenciar, vendedor: emailSessao },
    });
  }

  if (!podeGerenciar)
    return response({ error: "Somente uma pessoa autorizada pode alterar clientes e carteiras." }, 403);

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

export async function handleTodoGreenClientAssignments(request, env, access, user) {
  if (!env.DB) return response({ error: "Banco indisponível." }, 503);
  const podeAtribuir = ["owner", "admin"].includes(access?.role) ||
    access?.permissions?.includes("*") ||
    access?.permissions?.includes("clients:assign");
  if (!podeAtribuir)
    return response({ error: "Você não pode definir carteiras comerciais." }, 403);

  const url = new URL(request.url);
  if (request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT a.id, a.client_id AS clientId, c.name AS clientName,
              a.seller_email AS sellerEmail, a.note, a.status,
              a.created_at AS createdAt, a.updated_at AS updatedAt
         FROM todogreen_client_assignments a
         JOIN todogreen_clients c ON c.id = a.client_id AND c.tenant_id = a.tenant_id
        WHERE a.tenant_id = ? AND a.status = 'active'
        ORDER BY c.name, a.seller_email`,
    ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
    return response({ atribuicoes: rows.results || [] });
  }

  if (request.method === "PUT") {
    const body = await request.json().catch(() => ({}));
    const clientId = clean(body.clientId ?? body.clienteId, 60);
    const sellerEmail = normalizeEmail(body.sellerEmail ?? body.vendedorEmail);
    if (!clientId) return response({ error: "Informe o cliente." }, 400);
    if (!isValidEmail(sellerEmail))
      return response({ error: "Informe o e-mail do vendedor." }, 400);
    const client = await env.DB.prepare(
      "SELECT id FROM todogreen_clients WHERE tenant_id = ? AND id = ? AND archived_at IS NULL",
    ).bind(TENANT_ID, clientId).first();
    if (!client) return response({ error: "Cliente não encontrado." }, 404);
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO todogreen_client_assignments
         (id, tenant_id, client_id, seller_email, status, note, assigned_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
       ON CONFLICT(tenant_id, client_id, seller_email) DO UPDATE SET
         status = 'active', note = excluded.note, assigned_by = excluded.assigned_by,
         updated_at = excluded.updated_at`,
    ).bind(
      crypto.randomUUID(), TENANT_ID, clientId, sellerEmail,
      clean(body.note ?? body.observacao, 240), user.id, now, now,
    ).run();
    return response({ ok: true, clientId, sellerEmail });
  }

  if (request.method === "DELETE") {
    const clientId = clean(url.searchParams.get("clientId"), 60);
    const sellerEmail = normalizeEmail(url.searchParams.get("sellerEmail"));
    if (!clientId || !sellerEmail)
      return response({ error: "Informe o cliente e o vendedor." }, 400);
    await env.DB.prepare(
      `UPDATE todogreen_client_assignments SET status = 'inactive', updated_at = ?
        WHERE tenant_id = ? AND client_id = ? AND lower(seller_email) = ?`,
    ).bind(new Date().toISOString(), TENANT_ID, clientId, sellerEmail).run();
    return response({ ok: true });
  }

  return response({ error: "Método não permitido." }, 405);
}
