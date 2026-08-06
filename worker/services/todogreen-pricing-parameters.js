// ===== Parâmetros comerciais: API =====
//
// A régua que o gestor administra: margem mínima, margem alvo, OPEX, imposto,
// administrativo, risco e comissão. Reusa sessão e resolução de acesso do
// centro de trabalho — as mesmas regras de quem-é-quem da vertical.
//
// Ler é de quem está na vertical (o vendedor precisa saber o piso que o
// governa). Escrever é de quem gere preço: mudar a régua muda a proposta de
// todo mundo daqui para frente.

import { exigirAcessoTodoGreen } from "./todogreen-access.js";
import {
  explicarMudanca,
  simularEfeito,
  validarParametros,
} from "../../src/features/logistics/pricingParametersDomain.js";
import { DEFAULT_PRICING_ASSUMPTIONS } from "../../src/features/logistics/logisticsVerticalDomain.js";

const TENANT_ID = "todogreen";

const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const clean = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const parse = (v, fallback) => {
  try {
    return JSON.parse(v || "");
  } catch {
    return fallback;
  }
};

const podeGerirPreco = (access) =>
  access.role === "owner" ||
  access.role === "admin" ||
  access.permissions.includes("*") ||
  access.permissions.includes("pricing:manage");


// A régua em vigor. Sem nenhuma cadastrada, valem os padrões do código — e a
// resposta diz isso, para a tela não fingir que existe uma decisão de gestor
// onde só existe o padrão de fábrica.
export async function reguaEmVigor(env) {
  const linha = await env.DB.prepare(
    `SELECT version, parameters_json, responsible, effective_from, change_summary
       FROM todogreen_pricing_parameters
      WHERE tenant_id = ? AND status = 'active'
      ORDER BY effective_from DESC LIMIT 1`,
  )
    .bind(TENANT_ID)
    .first()
    .catch(() => null);
  if (!linha)
    return {
      versao: "padrao-de-fabrica",
      parametros: {
        minimumMarginPercent: DEFAULT_PRICING_ASSUMPTIONS.minimumMarginPercent,
        targetMarginPercent: DEFAULT_PRICING_ASSUMPTIONS.targetMarginPercent,
        opexPercent: DEFAULT_PRICING_ASSUMPTIONS.opexPercent,
        adminPercent: DEFAULT_PRICING_ASSUMPTIONS.adminPercent,
        taxPercent: DEFAULT_PRICING_ASSUMPTIONS.taxPercent,
        riskPercent: DEFAULT_PRICING_ASSUMPTIONS.riskPercent,
        commissionPercent: DEFAULT_PRICING_ASSUMPTIONS.commissionPercent,
      },
      responsavel: "",
      deFabrica: true,
    };
  return {
    versao: linha.version,
    parametros: parse(linha.parameters_json, {}),
    responsavel: linha.responsible,
    vigenciaInicio: linha.effective_from,
    mudanca: linha.change_summary,
    deFabrica: false,
  };
}

export async function handleTodoGreenPricingParameters(request, env) {
  if (!env.DB) return response({ error: "Banco indisponível." }, 503);

  const porta = await exigirAcessoTodoGreen(request, env);
  if (porta.response) return porta.response;
  const { user, access } = porta;

  if (request.method === "GET") {
    const atual = await reguaEmVigor(env);
    const historico = await env.DB.prepare(
      `SELECT version, parameters_json, change_summary, justification,
              responsible, effective_from, effective_to, status, created_at
         FROM todogreen_pricing_parameters
        WHERE tenant_id = ?
        ORDER BY effective_from DESC LIMIT 24`,
    )
      .bind(TENANT_ID)
      .all()
      .catch(() => ({ results: [] }));
    return response({
      atual,
      podeEditar: podeGerirPreco(access),
      historico: (historico.results || []).map((l) => ({
        versao: l.version,
        parametros: parse(l.parameters_json, {}),
        mudanca: l.change_summary,
        justificativa: l.justification,
        responsavel: l.responsible,
        vigenciaInicio: l.effective_from,
        vigenciaFim: l.effective_to,
        status: l.status,
      })),
    });
  }

  if (request.method === "POST") {
    if (!podeGerirPreco(access))
      return response(
        { error: "Só quem gere preço pode alterar a régua comercial." },
        403,
      );
    let body = {};
    try {
      body = await request.json();
    } catch {
      return response({ error: "Corpo JSON inválido." }, 400);
    }

    const versao = clean(body.versao ?? body.version, 40);
    if (!versao) return response({ error: "Informe a versão da régua." }, 400);

    const { valido, erros, parametros } = validarParametros(
      body.parametros ?? body.parameters ?? {},
    );
    if (!valido) return response({ error: erros.join(" ") }, 400);

    // Justificativa é obrigatória: régua sem motivo registrado é régua que
    // ninguém consegue defender numa auditoria — nem numa reunião.
    const justificativa = clean(body.justificativa ?? body.justification, 500);
    if (justificativa.length < 5)
      return response(
        { error: "Escreva a justificativa da mudança — ela fica no registro." },
        400,
      );

    // A comparação é sempre contra o que estava em vigor — inclusive o padrão
    // de fábrica. "Primeira régua cadastrada" esconderia justamente a mudança
    // mais importante: a que tirou a empresa dos valores de fábrica.
    const anterior = await reguaEmVigor(env);
    const mudanca = explicarMudanca(parametros, anterior.parametros);

    const agora = new Date().toISOString();
    const vigencia =
      clean(body.vigenciaInicio ?? body.effectiveFrom, 10) || agora.slice(0, 10);

    await env.DB.prepare(
      `UPDATE todogreen_pricing_parameters
          SET status = 'superseded', effective_to = ?
        WHERE tenant_id = ? AND status = 'active'`,
    )
      .bind(vigencia, TENANT_ID)
      .run()
      .catch(() => {});

    await env.DB.prepare(
      `INSERT INTO todogreen_pricing_parameters
         (version, tenant_id, parameters_json, change_summary, justification,
          responsible, effective_from, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(version) DO UPDATE SET
         parameters_json = excluded.parameters_json,
         change_summary = excluded.change_summary,
         justification = excluded.justification,
         responsible = excluded.responsible,
         effective_from = excluded.effective_from,
         status = 'active'`,
    )
      .bind(
        versao,
        TENANT_ID,
        JSON.stringify(parametros),
        mudanca,
        justificativa,
        clean(body.responsavel ?? body.responsible, 200) || user.name || user.email,
        vigencia,
        user.id,
        agora,
      )
      .run();

    return response(
      {
        ok: true,
        versao,
        mudanca,
        efeito: simularEfeito(parametros, 10000),
      },
      201,
    );
  }

  return response({ error: "Método não permitido." }, 405);
}
