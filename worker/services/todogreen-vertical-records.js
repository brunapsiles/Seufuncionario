// ===== Registros da vertical =====
//
// Simulações, propostas, oportunidades, operações, receitas, custos e comissões
// moravam no estado genérico do espaço de trabalho — um JSON por usuário,
// gravado inteiro a cada alteração. O preço disso aparecia em quatro lugares:
//
//   • duas pessoas no mesmo espaço sobrescreviam o trabalho uma da outra;
//   • o portal do cliente não enxergava nada escrito por dentro;
//   • auditoria e versionamento valiam para metade da vertical;
//   • o painel somava fontes diferentes, com identificadores que não casavam.
//
// Aqui é a outra metade indo para o mesmo lugar onde clientes, carteiras,
// solicitações, ESG e Tracker já estavam.
//
// Duas decisões que valem explicação:
//
// 1) O escopo é da LINHA, não da consulta. Todo SELECT e todo UPDATE carregam
//    `workspace_owner_id = ?` vindo do vínculo da sessão, nunca do corpo do
//    pedido. Um handler que esquecesse o filtro devolveria a tabela inteira, e
//    é exatamente esse esquecimento que o formato abaixo torna difícil.
//
// 2) Escrita concorrente é resolvida por `revision`, não por "quem chegou
//    depois vence". O UPDATE exige a revisão que o cliente leu; se ela mudou,
//    a resposta é 409 e a tela recarrega — em vez de apagar em silêncio o que
//    a outra pessoa acabou de escrever, que é o defeito do JSON único.

import { TENANT_ID, podeNaVertical } from "./todogreen-access.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const texto = (valor, max = 500) => String(valor ?? "").trim().slice(0, max);
const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};
const parse = (valor, alternativa) => {
  try {
    return JSON.parse(valor || "");
  } catch {
    return alternativa;
  }
};
const objeto = (valor) => (valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {});

// Cada coleção declara como uma linha vira registro e como um registro vira
// linha. Sem essa tabela, cada endpoint reescreveria o mesmo mapeamento com
// uma diferença sutil — e a diferença sutil é o que faz o painel somar errado.
const COLECOES = {
  opportunities: {
    tabela: "todogreen_opportunities",
    permissao: "crm:manage",
    ordem: "updated_at DESC",
    daLinha: (row) => ({
      id: row.id,
      clientId: row.client_id,
      cliente: row.client_name,
      estagio: row.stage,
      valorMensal: row.monthly_value,
      valorContrato: row.contract_value,
      distanciaKm: row.distance_km,
      viagensMes: row.trips_per_month,
      tipoVeiculo: row.vehicle_type,
      responsavelId: row.owner_user_id || "",
      ultimaInteracaoEm: row.last_interaction_at || "",
      campos: parse(row.fields_json, {}),
      revision: row.revision,
      criadoEm: row.created_at,
      atualizadoEm: row.updated_at,
    }),
    colunas: (corpo) => ({
      client_id: texto(corpo.clientId, 120),
      client_name: texto(corpo.cliente || corpo.clientName, 200),
      stage: texto(corpo.estagio || corpo.stage, 60) || "Mapeamento",
      monthly_value: numero(corpo.valorMensal),
      contract_value: numero(corpo.valorContrato),
      distance_km: numero(corpo.distanciaKm),
      trips_per_month: numero(corpo.viagensMes),
      vehicle_type: texto(corpo.tipoVeiculo, 120),
      owner_user_id: texto(corpo.responsavelId, 120) || null,
      last_interaction_at: texto(corpo.ultimaInteracaoEm, 40) || null,
      fields_json: JSON.stringify(objeto(corpo.campos)),
    }),
    exigido: (corpo) => (texto(corpo.cliente || corpo.clientName) ? "" : "Informe o cliente da oportunidade."),
  },

  proposals: {
    tabela: "todogreen_proposals",
    permissao: "proposal:manage",
    ordem: "updated_at DESC",
    daLinha: (row) => ({
      id: row.id,
      clientId: row.client_id,
      cliente: row.client_name,
      oportunidadeId: row.opportunity_id,
      cenarioId: row.scenario_id,
      titulo: row.title,
      escopo: row.scope,
      condicoes: row.commercial_terms,
      riscos: row.risks,
      texto: row.proposal_text,
      situacao: row.status,
      campos: parse(row.fields_json, {}),
      revision: row.revision,
      criadoEm: row.created_at,
      atualizadoEm: row.updated_at,
    }),
    colunas: (corpo) => ({
      client_id: texto(corpo.clientId, 120),
      client_name: texto(corpo.cliente || corpo.clientName, 200),
      opportunity_id: texto(corpo.oportunidadeId, 120),
      scenario_id: texto(corpo.cenarioId, 120),
      title: texto(corpo.titulo, 240),
      scope: texto(corpo.escopo, 4000),
      commercial_terms: texto(corpo.condicoes, 4000),
      risks: texto(corpo.riscos, 4000),
      proposal_text: texto(corpo.texto, 8000),
      status: texto(corpo.situacao, 40) || "draft",
      fields_json: JSON.stringify(objeto(corpo.campos)),
    }),
    // Uma proposta sem simulação por trás é preço sem conta. O vínculo é
    // exigido aqui, no servidor, e não só no botão da tela.
    exigido: (corpo) =>
      texto(corpo.cenarioId)
        ? ""
        : "A proposta precisa apontar para a simulação que gerou o preço.",
  },

  operations: {
    tabela: "todogreen_operations",
    permissao: "operations:manage",
    ordem: "updated_at DESC",
    daLinha: (row) => ({
      id: row.id,
      clientId: row.client_id,
      produtoId: row.product_id,
      mesReferencia: row.reference_month,
      entregas: row.deliveries,
      pacotes: row.packages,
      viagens: row.trips,
      distanciaKm: row.distance_km,
      ocupacaoPercent: row.occupancy_percent,
      situacao: row.status,
      campos: parse(row.fields_json, {}),
      revision: row.revision,
      criadoEm: row.created_at,
      atualizadoEm: row.updated_at,
    }),
    colunas: (corpo) => ({
      client_id: texto(corpo.clientId, 120),
      product_id: texto(corpo.produtoId, 120),
      reference_month: texto(corpo.mesReferencia, 10),
      deliveries: numero(corpo.entregas),
      packages: numero(corpo.pacotes),
      trips: numero(corpo.viagens),
      distance_km: numero(corpo.distanciaKm),
      occupancy_percent: numero(corpo.ocupacaoPercent),
      status: texto(corpo.situacao, 40) || "active",
      fields_json: JSON.stringify(objeto(corpo.campos)),
    }),
    exigido: (corpo) => (texto(corpo.clientId) ? "" : "Informe o cliente da operação."),
  },

  financial: {
    tabela: "todogreen_financial_entries",
    permissao: "finance:manage",
    ordem: "reference_month DESC, updated_at DESC",
    daLinha: (row) => ({
      id: row.id,
      tipo: row.kind,
      clientId: row.client_id,
      produtoId: row.product_id,
      cenarioId: row.scenario_id,
      categoria: row.category,
      descricao: row.description,
      valor: row.amount,
      mesReferencia: row.reference_month,
      situacao: row.status,
      campos: parse(row.fields_json, {}),
      revision: row.revision,
      criadoEm: row.created_at,
      atualizadoEm: row.updated_at,
    }),
    colunas: (corpo) => ({
      kind: ["revenue", "cost", "commission"].includes(texto(corpo.tipo)) ? texto(corpo.tipo) : "cost",
      client_id: texto(corpo.clientId, 120),
      product_id: texto(corpo.produtoId, 120),
      scenario_id: texto(corpo.cenarioId, 120),
      category: texto(corpo.categoria, 120),
      description: texto(corpo.descricao, 500),
      amount: numero(corpo.valor),
      reference_month: texto(corpo.mesReferencia, 10),
      status: texto(corpo.situacao, 40) || "confirmed",
      fields_json: JSON.stringify(objeto(corpo.campos)),
    }),
    exigido: (corpo) =>
      ["revenue", "cost", "commission"].includes(texto(corpo.tipo))
        ? numero(corpo.valor) > 0
          ? ""
          : "Informe o valor do lançamento."
        : "Informe se o lançamento é receita, custo ou comissão.",
  },
};

const listar = async (env, colecao, ownerId) => {
  const { results } = await env.DB.prepare(
    `SELECT * FROM ${colecao.tabela}
      WHERE workspace_owner_id = ? AND archived_at IS NULL
      ORDER BY ${colecao.ordem} LIMIT 500`,
  )
    .bind(ownerId)
    .all();
  return (results || []).map(colecao.daLinha);
};

const criar = async (env, colecao, access, user, corpo) => {
  const erro = colecao.exigido(corpo);
  if (erro) return json({ error: erro }, 400);

  const valores = colecao.colunas(corpo);
  const campos = Object.keys(valores);
  const agora = new Date().toISOString();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO ${colecao.tabela}
       (id, tenant_id, workspace_owner_id, ${campos.join(", ")},
        revision, created_by, updated_by, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ${campos.map(() => "?").join(", ")}, 1, ?, ?, ?, ?, NULL)`,
  )
    .bind(id, TENANT_ID, access.ownerId, ...campos.map((c) => valores[c]), user.id, user.id, agora, agora)
    .run();

  const row = await env.DB.prepare(
    `SELECT * FROM ${colecao.tabela} WHERE id = ? AND workspace_owner_id = ?`,
  )
    .bind(id, access.ownerId)
    .first();
  return json({ registro: colecao.daLinha(row) }, 201);
};

const atualizar = async (env, colecao, access, user, id, corpo) => {
  const atual = await env.DB.prepare(
    `SELECT * FROM ${colecao.tabela}
      WHERE id = ? AND workspace_owner_id = ? AND archived_at IS NULL`,
  )
    .bind(id, access.ownerId)
    .first();
  // 404 e não 403: dizer "existe, mas não é seu" já entrega que existe.
  if (!atual) return json({ error: "Registro não encontrado." }, 404);

  // A revisão vem de quem edita, não do banco. Se viesse do banco, o UPDATE
  // sempre casaria e a trava de concorrência não travaria nada — que é o
  // mesmo comportamento do JSON único que esta tabela veio substituir.
  const revisaoEsperada = Number(corpo.revision);
  if (!Number.isFinite(revisaoEsperada) || revisaoEsperada <= 0)
    return json({ error: "Informe a revisão do registro que você leu." }, 400);

  const proximo = { ...colecao.daLinha(atual), ...corpo };
  const erro = colecao.exigido(proximo);
  if (erro) return json({ error: erro }, 400);

  const valores = colecao.colunas(proximo);
  const campos = Object.keys(valores);
  const agora = new Date().toISOString();

  const { meta } = await env.DB.prepare(
    `UPDATE ${colecao.tabela}
        SET ${campos.map((c) => `${c} = ?`).join(", ")},
            revision = revision + 1, updated_by = ?, updated_at = ?
      WHERE id = ? AND workspace_owner_id = ? AND revision = ?`,
  )
    .bind(...campos.map((c) => valores[c]), user.id, agora, id, access.ownerId, revisaoEsperada)
    .run();

  // Alguém salvou entre a leitura e a escrita. Sobrescrever aqui seria repetir
  // o defeito do JSON único, que é justamente o motivo desta tabela existir.
  if (!meta?.changes)
    return json(
      { error: "Este registro mudou enquanto você editava. Recarregue para ver a versão atual." },
      409,
    );

  const row = await env.DB.prepare(
    `SELECT * FROM ${colecao.tabela} WHERE id = ? AND workspace_owner_id = ?`,
  )
    .bind(id, access.ownerId)
    .first();
  return json({ registro: colecao.daLinha(row) });
};

const arquivar = async (env, colecao, access, user, id) => {
  const agora = new Date().toISOString();
  // Arquiva em vez de apagar: o histórico é a única defesa quando alguém
  // pergunta, meses depois, de onde veio um número.
  const { meta } = await env.DB.prepare(
    `UPDATE ${colecao.tabela}
        SET archived_at = ?, updated_by = ?, updated_at = ?, revision = revision + 1
      WHERE id = ? AND workspace_owner_id = ? AND archived_at IS NULL`,
  )
    .bind(agora, user.id, agora, id, access.ownerId)
    .run();
  if (!meta?.changes) return json({ error: "Registro não encontrado." }, 404);
  return json({ ok: true });
};

export async function handleTodoGreenVerticalRecords(request, env, access, user) {
  const url = new URL(request.url);
  const partes = url.pathname.split("/").filter(Boolean); // api, todogreen, records, [colecao], [id]
  const nome = partes[3] || "";
  const id = texto(partes[4], 120);

  // Sem coleção na URL: a vertical inteira de uma vez. É esta chamada que
  // substitui o `db` genérico que a tela lia antes.
  if (!nome) {
    if (request.method !== "GET") return json({ error: "Método não permitido." }, 405);
    const nomes = Object.keys(COLECOES);
    const listas = await Promise.all(nomes.map((n) => listar(env, COLECOES[n], access.ownerId)));
    return json(Object.fromEntries(nomes.map((n, i) => [n, listas[i]])));
  }

  const colecao = COLECOES[nome];
  if (!colecao) return json({ error: "Coleção desconhecida." }, 404);

  if (request.method === "GET")
    return json({ registros: await listar(env, colecao, access.ownerId) });

  // Leitura segue o vínculo; escrita exige permissão. Papel que só consulta
  // não altera premissa comercial.
  if (!podeNaVertical(access, colecao.permissao))
    return json({ error: "Seu papel não pode alterar estes registros." }, 403);

  const corpo = request.method === "DELETE" ? {} : await request.json().catch(() => ({}));

  if (request.method === "POST" && !id) return criar(env, colecao, access, user, corpo);
  if (request.method === "PATCH" && id) return atualizar(env, colecao, access, user, id, corpo);
  if (request.method === "DELETE" && id) return arquivar(env, colecao, access, user, id);
  return json({ error: "Método não permitido." }, 405);
}
