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

import { TENANT_ID, paginacao, podeNaVertical, recorteDeCarteira } from "./todogreen-access.js";
import { doBanco as pedidoDoBanco } from "./todogreen-deal-desk.js";
import { liberacaoDaProposta } from "../../src/features/logistics/dealDeskDomain.js";

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
// Campos da oportunidade que têm coluna própria. O que sobra é guardado como
// payload em vez de descartado — é ali que estão ocupação prevista, frota de
// baixa emissão, veículos disponíveis, meses de contrato e probabilidade, que
// a análise de oportunidade usa e esta tabela não precisa indexar.
const COLUNAS_DA_OPORTUNIDADE = new Set([
  "id", "clientId", "cliente", "clientName", "estagio", "stage",
  "valorMensal", "valorContrato", "distanciaKm", "viagensMes", "tipoVeiculo",
  "responsavelId", "ultimaInteracaoEm", "lastInteractionAt", "campos",
  "revision", "criadoEm", "atualizadoEm",
]);

const extrasDaOportunidade = (corpo) =>
  Object.fromEntries(
    Object.entries(corpo).filter(
      ([chave, valor]) => !COLUNAS_DA_OPORTUNIDADE.has(chave) && valor !== undefined,
    ),
  );

const COLECOES = {
  opportunities: {
    tabela: "todogreen_opportunities",
    permissao: "crm:manage",
    ordem: "updated_at DESC",
    daLinha: (row) => ({
      // O que não tem coluna própria volta primeiro, e as colunas mandam por
      // cima. A tela de oportunidades manda mais campos do que esta tabela
      // indexa — ocupação prevista, frota limpa, veículos disponíveis, meses
      // de contrato, probabilidade — e todos alimentam a análise. Descartá-los
      // no caminho faria a oportunidade voltar do servidor mais pobre do que
      // saiu, com a análise mudando sozinha depois de recarregar a página.
      ...parse(row.fields_json, {}),
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
      // O motor de oportunidade lê `lastInteractionAt`. Devolver os dois nomes
      // evita um adaptador a mais entre a API e o domínio.
      lastInteractionAt: row.last_interaction_at || "",
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
      last_interaction_at: texto(corpo.ultimaInteracaoEm || corpo.lastInteractionAt, 40) || null,
      fields_json: JSON.stringify({ ...objeto(corpo.campos), ...extrasDaOportunidade(corpo) }),
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
    // Fonte canônica compartilhada com o Portal do Cliente. Antes o painel
    // escrevia em todogreen_operations e o cliente lia outra tabela.
    tabela: "todogreen_client_operations",
    permissao: "operations:manage",
    ordem: "updated_at DESC",
    daLinha: (row) => ({
      id: row.id,
      clientId: row.client_id,
      produtoId: row.product_id,
      mesReferencia: row.service_date ? row.service_date.slice(0, 7) : "",
      referencia: row.reference,
      entregas: numero(parse(row.fields_json, {}).deliveries),
      pacotes: numero(parse(row.fields_json, {}).packages),
      viagens: numero(parse(row.fields_json, {}).trips),
      distanciaKm: numero(row.distance_km || parse(row.fields_json, {}).distanceKm),
      ocupacaoPercent: numero(parse(row.fields_json, {}).occupancyPercent),
      ocorrencias: numero(row.incident_count),
      situacao: row.status,
      campos: parse(row.fields_json, {}),
      revision: row.revision,
      criadoEm: row.created_at,
      atualizadoEm: row.updated_at,
    }),
    colunas: (corpo) => ({
      client_id: texto(corpo.clientId, 120),
      product_id: texto(corpo.produtoId, 120),
      reference: texto(corpo.referencia || corpo.rota, 200),
      service_date: /^\d{4}-\d{2}$/.test(texto(corpo.mesReferencia, 10))
        ? `${texto(corpo.mesReferencia, 10)}-01`
        : null,
      distance_km: numero(corpo.distanciaKm),
      incident_count: numero(corpo.ocorrencias),
      status: texto(corpo.situacao, 40) || "active",
      fields_json: JSON.stringify({
        ...objeto(corpo.campos),
        deliveries: numero(corpo.entregas),
        packages: numero(corpo.pacotes),
        trips: numero(corpo.viagens),
        distanceKm: numero(corpo.distanciaKm),
        occupancyPercent: numero(corpo.ocupacaoPercent),
      }),
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

// A simulação é um retrato, não um cadastro: ela registra o que a régua e as
// premissas diziam no momento em que alguém calculou. Editar uma simulação
// salva seria reescrever o passado — então ela nasce e não muda. Quem precisa
// de outro número faz outra simulação.
//
// Por isso `pricing_scenarios` não tem revision nem archived_at, e por isso
// esta coleção não passa pelo caminho genérico de atualizar e arquivar.
const CENARIOS = {
  daLinha: (row) => ({
    id: row.id,
    productId: row.product_id,
    clientId: row.client_id,
    opportunityId: row.opportunity_id,
    ruleVersion: row.rule_version,
    inputs: parse(row.inputs_json, {}),
    result: parse(row.result_json, {}),
    approvals: parse(row.approvals_json, {}),
    premissas: parse(row.premises_json, {}),
    status: row.status,
    criadoPor: row.created_by,
    criadoEm: row.created_at,
  }),
};

const listarCenarios = async (env, access, email, { clienteId = "", limit = 200, offset = 0 } = {}) => {
  const recorte = recorteDeCarteira(access, email, "pricing_scenarios");
  const filtroCliente = clienteId ? "AND pricing_scenarios.client_id = ?" : "";
  const paramsFiltro = clienteId ? [clienteId] : [];
  const base = `FROM pricing_scenarios
      WHERE tenant_id = ? AND workspace_owner_id = ? ${filtroCliente} ${recorte.sql}`;
  const params = [TENANT_ID, access.ownerId, ...paramsFiltro, ...recorte.params];
  const [{ results }, totalRow] = await Promise.all([
    env.DB.prepare(`SELECT * ${base} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all(),
    env.DB.prepare(`SELECT COUNT(*) AS total ${base}`).bind(...params).first(),
  ]);
  return { registros: (results || []).map(CENARIOS.daLinha), total: totalRow?.total || 0 };
};

const criarCenario = async (env, access, user, corpo) => {
  const produto = texto(corpo.productId, 80);
  if (!produto) return json({ error: "Informe o produto da simulação." }, 400);
  const resultado = objeto(corpo.result);
  if (!Object.keys(resultado).length)
    return json({ error: "A simulação precisa do resultado calculado." }, 400);

  const id = texto(corpo.id, 120) || crypto.randomUUID();
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO pricing_scenarios
       (id, tenant_id, workspace_owner_id, product_id, client_id, opportunity_id, created_by,
        rule_version, inputs_json, result_json, approvals_json, premises_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      TENANT_ID,
      access.ownerId,
      produto,
      texto(corpo.clientId, 120),
      texto(corpo.opportunityId, 120),
      user.id,
      texto(corpo.ruleVersion, 60) || "padrao",
      JSON.stringify(objeto(corpo.inputs)),
      JSON.stringify(resultado),
      JSON.stringify(objeto(corpo.approvals)),
      JSON.stringify(objeto(corpo.premissas)),
      texto(corpo.status, 40) || "draft",
      agora,
    )
    .run();

  const row = await env.DB.prepare(
    "SELECT * FROM pricing_scenarios WHERE id = ? AND workspace_owner_id = ?",
  )
    .bind(id, access.ownerId)
    .first();
  return json({ registro: CENARIOS.daLinha(row) }, 201);
};

// A leitura carrega o recorte de carteira além do escopo de espaço. São dois
// cortes diferentes: o espaço separa empresas, a carteira separa vendedores
// dentro da mesma empresa. Sem o segundo, um vendedor lista as oportunidades
// dos colegas.
const listar = async (env, colecao, access, email, { clienteId = "", limit = 500, offset = 0 } = {}) => {
  const recorte = recorteDeCarteira(access, email, "t");
  const filtroCliente = clienteId ? "AND t.client_id = ?" : "";
  const paramsFiltro = clienteId ? [clienteId] : [];
  const base = `FROM ${colecao.tabela} t
      WHERE t.tenant_id = ? AND t.workspace_owner_id = ? AND t.archived_at IS NULL ${filtroCliente} ${recorte.sql}`;
  const params = [TENANT_ID, access.ownerId, ...paramsFiltro, ...recorte.params];
  const [{ results }, totalRow] = await Promise.all([
    env.DB.prepare(
      `SELECT t.* ${base}
        ORDER BY ${colecao.ordem.replace(/\b(updated_at|reference_month)\b/g, "t.$1")}
        LIMIT ? OFFSET ?`,
    )
      .bind(...params, limit, offset)
      .all(),
    env.DB.prepare(`SELECT COUNT(*) AS total ${base}`).bind(...params).first(),
  ]);
  return { registros: (results || []).map(colecao.daLinha), total: totalRow?.total || 0 };
};

// Confirma que o registro está na carteira de quem pede, ANTES de escrever.
// 404 e não 403 quando está fora: dizer "existe mas não é sua" já entrega que
// o registro existe.
const noAlcanceDaCarteira = async (env, colecao, access, email, id) => {
  const recorte = recorteDeCarteira(access, email, "t");
  return env.DB
    .prepare(
      `SELECT t.id FROM ${colecao.tabela} t
        WHERE t.id = ? AND t.tenant_id = ? AND t.workspace_owner_id = ? AND t.archived_at IS NULL ${recorte.sql}
        LIMIT 1`,
    )
    .bind(id, TENANT_ID, access.ownerId, ...recorte.params)
    .first()
    .catch(() => null);
};

// A tela já recusa gerar a proposta quando o Deal Desk não liberou a
// simulação — "Guarda no código, não só no `disabled`", diz o comentário lá.
// Só que o guarda estava no componente React, e qualquer chamada direta a
// este endpoint passava por cima dele. A régua é a mesma (liberacaoDaProposta,
// de dealDeskDomain.js); o que muda é onde ela é aplicada.
const proposalLiberada = async (env, access, cenarioId) => {
  const { results } = await env.DB.prepare(
    "SELECT * FROM todogreen_deal_desk_requests WHERE workspace_owner_id = ? AND scenario_id = ?",
  )
    .bind(access.ownerId, cenarioId)
    .all();
  return liberacaoDaProposta(cenarioId, (results || []).map(pedidoDoBanco));
};

const criar = async (env, colecao, access, user, corpo) => {
  const erro = colecao.exigido(corpo);
  if (erro) return json({ error: erro }, 400);

  if (colecao === COLECOES.proposals) {
    const liberacao = await proposalLiberada(env, access, texto(corpo.cenarioId, 120));
    if (!liberacao.liberada) return json({ error: liberacao.motivo }, 409);
  }

  if (colecao === COLECOES.operations) {
    const cliente = await env.DB.prepare(
      `SELECT id FROM todogreen_clients
        WHERE tenant_id = ? AND workspace_owner_id = ? AND id = ?
          AND archived_at IS NULL AND status = 'ativo'`,
    ).bind(TENANT_ID, access.ownerId, texto(corpo.clientId, 120)).first();
    if (!cliente) return json({ error: "Cliente não encontrado neste espaço." }, 404);
  }

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
    `SELECT * FROM ${colecao.tabela} WHERE id = ? AND tenant_id = ? AND workspace_owner_id = ?`,
  )
    .bind(id, TENANT_ID, access.ownerId)
    .first();
  return json({ registro: colecao.daLinha(row) }, 201);
};

const atualizar = async (env, colecao, access, user, id, corpo) => {
  const atual = await env.DB.prepare(
    `SELECT * FROM ${colecao.tabela}
      WHERE id = ? AND tenant_id = ? AND workspace_owner_id = ? AND archived_at IS NULL`,
  )
    .bind(id, TENANT_ID, access.ownerId)
    .first();
  // 404 e não 403: dizer "existe, mas não é seu" já entrega que existe. Vale
  // tanto para registro de outro espaço quanto para cliente fora da carteira.
  if (!atual) return json({ error: "Registro não encontrado." }, 404);
  if (!(await noAlcanceDaCarteira(env, colecao, access, user.email, id)))
    return json({ error: "Registro não encontrado." }, 404);

  // A revisão vem de quem edita, não do banco. Se viesse do banco, o UPDATE
  // sempre casaria e a trava de concorrência não travaria nada — que é o
  // mesmo comportamento do JSON único que esta tabela veio substituir.
  const revisaoEsperada = Number(corpo.revision);
  if (!Number.isFinite(revisaoEsperada) || revisaoEsperada <= 0)
    return json({ error: "Informe a revisão do registro que você leu." }, 400);

  const proximo = { ...colecao.daLinha(atual), ...corpo };
  const erro = colecao.exigido(proximo);
  if (erro) return json({ error: erro }, 400);

  if (colecao === COLECOES.operations) {
    const cliente = await env.DB.prepare(
      `SELECT id FROM todogreen_clients
        WHERE tenant_id = ? AND workspace_owner_id = ? AND id = ?
          AND archived_at IS NULL AND status = 'ativo'`,
    ).bind(TENANT_ID, access.ownerId, texto(proximo.clientId, 120)).first();
    if (!cliente) return json({ error: "Cliente não encontrado neste espaço." }, 404);
  }

  const valores = colecao.colunas(proximo);
  const campos = Object.keys(valores);
  const agora = new Date().toISOString();

  const { meta } = await env.DB.prepare(
    `UPDATE ${colecao.tabela}
        SET ${campos.map((c) => `${c} = ?`).join(", ")},
            revision = revision + 1, updated_by = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ? AND workspace_owner_id = ? AND revision = ?`,
  )
    .bind(...campos.map((c) => valores[c]), user.id, agora, id, TENANT_ID, access.ownerId, revisaoEsperada)
    .run();

  // Alguém salvou entre a leitura e a escrita. Sobrescrever aqui seria repetir
  // o defeito do JSON único, que é justamente o motivo desta tabela existir.
  if (!meta?.changes)
    return json(
      { error: "Este registro mudou enquanto você editava. Recarregue para ver a versão atual." },
      409,
    );

  const row = await env.DB.prepare(
    `SELECT * FROM ${colecao.tabela} WHERE id = ? AND tenant_id = ? AND workspace_owner_id = ?`,
  )
    .bind(id, TENANT_ID, access.ownerId)
    .first();
  return json({ registro: colecao.daLinha(row) });
};

const arquivar = async (env, colecao, access, user, id) => {
  if (!(await noAlcanceDaCarteira(env, colecao, access, user.email, id)))
    return json({ error: "Registro não encontrado." }, 404);
  const agora = new Date().toISOString();
  // Arquiva em vez de apagar: o histórico é a única defesa quando alguém
  // pergunta, meses depois, de onde veio um número.
  const { meta } = await env.DB.prepare(
    `UPDATE ${colecao.tabela}
        SET archived_at = ?, updated_by = ?, updated_at = ?, revision = revision + 1
      WHERE id = ? AND tenant_id = ? AND workspace_owner_id = ? AND archived_at IS NULL`,
  )
    .bind(agora, user.id, agora, id, TENANT_ID, access.ownerId)
    .run();
  if (!meta?.changes) return json({ error: "Registro não encontrado." }, 404);
  return json({ ok: true });
};

export async function handleTodoGreenVerticalRecords(request, env, access, user) {
  const url = new URL(request.url);
  const partes = url.pathname.split("/").filter(Boolean); // api, todogreen, records, [colecao], [id]
  const nome = partes[3] || "";
  const id = texto(partes[4], 120);

  // Sem coleção na URL: a vertical inteira de uma vez, sem filtro nem
  // página — é a carga do painel, que precisa do total para somar, não de um
  // recorte dele. Filtro e paginação são de quem abre UMA coleção por vez.
  if (!nome) {
    if (request.method !== "GET") return json({ error: "Método não permitido." }, 405);
    const nomes = Object.keys(COLECOES);
    const [listas, cenarios] = await Promise.all([
      Promise.all(nomes.map((n) => listar(env, COLECOES[n], access, user.email))),
      listarCenarios(env, access, user.email),
    ]);
    return json({
      ...Object.fromEntries(nomes.map((n, i) => [n, listas[i].registros])),
      scenarios: cenarios.registros,
    });
  }

  if (nome === "scenarios") {
    if (request.method === "GET") {
      const { limit, offset } = paginacao(url);
      const clienteId = texto(url.searchParams.get("cliente"), 120);
      const resultado = await listarCenarios(env, access, user.email, { clienteId, limit, offset });
      return json({ ...resultado, limit, offset });
    }
    if (request.method === "POST") {
      if (!podeNaVertical(access, "pricing:simulate"))
        return json({ error: "Seu papel não pode salvar simulações." }, 403);
      return criarCenario(env, access, user, await request.json().catch(() => ({})));
    }
    return json({ error: "A simulação salva não muda. Faça outra simulação." }, 405);
  }

  const colecao = COLECOES[nome];
  if (!colecao) return json({ error: "Coleção desconhecida." }, 404);

  if (request.method === "GET") {
    const { limit, offset } = paginacao(url);
    const clienteId = texto(url.searchParams.get("cliente"), 120);
    const resultado = await listar(env, colecao, access, user.email, { clienteId, limit, offset });
    return json({ ...resultado, limit, offset });
  }

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
