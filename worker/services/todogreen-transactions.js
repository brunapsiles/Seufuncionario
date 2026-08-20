import { paginacao, podeNaVertical, TENANT_ID } from "./todogreen-access.js";
import {
  canTransitionServiceOrder,
  serviceOrderAmounts,
  settlementState,
  validateAllocation,
} from "../../src/features/logistics/transactionalSpineDomain.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

const allowed = (access, permission) =>
  podeNaVertical(access, permission) || podeNaVertical(access, "*");

async function reserveNumber(env, ownerId, docType, prefix, now) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO todogreen_document_series
       (id,tenant_id,workspace_owner_id,doc_type,series,prefix,next_number,padding,created_at,updated_at)
     VALUES (?,?,?,?, '1',?,1,6,?,?)`,
  ).bind(crypto.randomUUID(), TENANT_ID, ownerId, docType, prefix, now, now).run();
  const row = await env.DB.prepare(
    `UPDATE todogreen_document_series SET next_number=next_number+1,updated_at=?
      WHERE tenant_id=? AND workspace_owner_id=? AND doc_type=? AND series='1'
      RETURNING prefix,next_number-1 AS value,padding`,
  ).bind(now, TENANT_ID, ownerId, docType).first();
  return `${row?.prefix || prefix}${String(row?.value || 1).padStart(row?.padding || 6, "0")}`;
}

const orderView = (row) => ({
  id: row.id, number: row.number, clientId: row.client_id, contractId: row.contract_id,
  operationId: row.operation_id, serviceId: row.service_id, priceTableId: row.price_table_id,
  status: row.status, requestedAt: row.requested_at, scheduledStartAt: row.scheduled_start_at,
  scheduledEndAt: row.scheduled_end_at, completedAt: row.completed_at,
  quantity: row.quantity, chargeUnit: row.charge_unit, unitPrice: row.unit_price,
  grossAmount: row.gross_amount, discountAmount: row.discount_amount, taxAmount: row.tax_amount,
  netAmount: row.net_amount, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at,
});

async function contractInScope(env, ownerId, contractId, clientId) {
  return env.DB.prepare(
    `SELECT * FROM todogreen_contracts WHERE id=? AND tenant_id=? AND workspace_owner_id=?
      AND client_id=? AND archived_at IS NULL AND status NOT IN ('cancelled','draft')`,
  ).bind(contractId, TENANT_ID, ownerId, clientId).first();
}

async function listOrders(env, access, url) {
  const { limit, offset } = paginacao(url);
  const status = text(url.searchParams.get("status"), 30);
  const contractId = text(url.searchParams.get("contractId"), 120);
  const filters = `${status ? "AND status=?" : ""} ${contractId ? "AND contract_id=?" : ""}`;
  const params = [TENANT_ID, access.ownerId, ...(status ? [status] : []), ...(contractId ? [contractId] : [])];
  const { results } = await env.DB.prepare(
    `SELECT * FROM todogreen_service_orders WHERE tenant_id=? AND workspace_owner_id=?
      AND archived_at IS NULL ${filters} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...params, limit, offset).all();
  return json({ records: (results || []).map(orderView), limit, offset });
}

async function createOrder(env, access, user, body) {
  if (!allowed(access, "operations:manage")) return json({ error: "Sem permissão para criar ordem de serviço." }, 403);
  const clientId = text(body.clientId, 120);
  const contractId = text(body.contractId, 120);
  if (!clientId || !contractId) return json({ error: "Cliente e contrato são obrigatórios." }, 400);
  const contract = await contractInScope(env, access.ownerId, contractId, clientId);
  if (!contract) return json({ error: "Contrato ativo não encontrado neste espaço." }, 409);
  if (contract.approval_status !== "approved" || contract.signature_status !== "signed")
    return json({ error: "A ordem exige contrato aprovado e assinado." }, 409);

  const amounts = serviceOrderAmounts(body);
  if (!amounts.quantity || !amounts.unitPrice) return json({ error: "Quantidade e preço unitário devem ser maiores que zero." }, 400);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const number = await reserveNumber(env, access.ownerId, "ordem_servico", "OS-", now);
  await env.DB.prepare(
    `INSERT INTO todogreen_service_orders
      (id,tenant_id,workspace_owner_id,number,client_id,contract_id,operation_id,service_id,
       price_table_id,status,requested_at,scheduled_start_at,scheduled_end_at,origin_json,
       destination_json,quantity,charge_unit,unit_price,gross_amount,discount_amount,tax_amount,
       net_amount,sla_json,fields_json,revision,created_by,updated_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)`,
  ).bind(
    id, TENANT_ID, access.ownerId, number, clientId, contractId, text(body.operationId, 120),
    text(body.serviceId || contract.service_id, 120), text(body.priceTableId || contract.price_table_id, 120),
    text(body.requestedAt, 40) || now, text(body.scheduledStartAt, 40) || null,
    text(body.scheduledEndAt, 40) || null, JSON.stringify(object(body.origin)),
    JSON.stringify(object(body.destination)), amounts.quantity, text(body.chargeUnit, 30),
    amounts.unitPrice, amounts.grossAmount, amounts.discountAmount, amounts.taxAmount, amounts.netAmount,
    JSON.stringify(object(body.sla || JSON.parse(contract.sla_json || "{}"))),
    JSON.stringify(object(body.fields)), user.id, user.id, now, now,
  ).run();
  const row = await env.DB.prepare("SELECT * FROM todogreen_service_orders WHERE id=?").bind(id).first();
  return json({ record: orderView(row) }, 201);
}

async function transitionOrder(env, access, user, id, body) {
  if (!allowed(access, "operations:manage")) return json({ error: "Sem permissão para alterar ordem de serviço." }, 403);
  const row = await env.DB.prepare(
    "SELECT * FROM todogreen_service_orders WHERE id=? AND tenant_id=? AND workspace_owner_id=? AND archived_at IS NULL",
  ).bind(id, TENANT_ID, access.ownerId).first();
  if (!row) return json({ error: "Ordem de serviço não encontrada." }, 404);
  const next = text(body.status, 30);
  if (!canTransitionServiceOrder(row.status, next))
    return json({ error: `Transição inválida de ${row.status} para ${next}.` }, 409);
  const revision = Number(body.revision);
  if (!Number.isFinite(revision) || revision !== row.revision) return json({ error: "A ordem mudou. Recarregue antes de salvar." }, 409);
  const now = new Date().toISOString();
  const completedAt = next === "completed" ? text(body.completedAt, 40) || now : row.completed_at;
  const statements = [env.DB.prepare(
    `UPDATE todogreen_service_orders SET status=?,completed_at=?,revision=revision+1,updated_by=?,updated_at=?
      WHERE id=? AND tenant_id=? AND workspace_owner_id=? AND revision=?`,
  ).bind(next, completedAt, user.id, now, id, TENANT_ID, access.ownerId, revision)];
  if (next === "completed") statements.push(env.DB.prepare(
    `INSERT OR IGNORE INTO todogreen_billing_items
      (id,tenant_id,workspace_owner_id,service_order_id,client_id,contract_id,status,amount,
       competence_date,created_by,updated_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,'eligible',?,?,?,?,?,?)`,
  ).bind(crypto.randomUUID(), TENANT_ID, access.ownerId, id, row.client_id, row.contract_id,
    row.net_amount, completedAt.slice(0, 10), user.id, user.id, now, now));
  await env.DB.batch(statements);
  const updated = await env.DB.prepare("SELECT * FROM todogreen_service_orders WHERE id=?").bind(id).first();
  return json({ record: orderView(updated), billingEligible: next === "completed" });
}

async function listBilling(env, access, url) {
  const status = text(url.searchParams.get("status"), 30) || "eligible";
  const { results } = await env.DB.prepare(
    `SELECT b.*,s.number AS service_order_number FROM todogreen_billing_items b
      JOIN todogreen_service_orders s ON s.id=b.service_order_id
      WHERE b.tenant_id=? AND b.workspace_owner_id=? AND b.status=? ORDER BY b.competence_date,b.created_at`,
  ).bind(TENANT_ID, access.ownerId, status).all();
  return json({ records: results || [] });
}

async function checkBilling(env, access, user, id, body) {
  if (!allowed(access, "finance:manage")) return json({ error: "Sem permissão financeira." }, 403);
  const next = body.approved === false ? "blocked" : "checked";
  const meta = await env.DB.prepare(
    `UPDATE todogreen_billing_items SET status=?,block_reason=?,revision=revision+1,updated_by=?,updated_at=?
      WHERE id=? AND tenant_id=? AND workspace_owner_id=? AND status IN ('eligible','blocked') AND revision=?`,
  ).bind(next, text(body.reason, 500), user.id, new Date().toISOString(), id, TENANT_ID, access.ownerId, Number(body.revision)).run();
  if (!meta?.meta?.changes) return json({ error: "Item não encontrado ou alterado por outra pessoa." }, 409);
  return json({ ok: true, status: next });
}

async function closeBilling(env, access, user, body) {
  if (!allowed(access, "finance:manage")) return json({ error: "Sem permissão financeira." }, 403);
  const ids = [...new Set((Array.isArray(body.itemIds) ? body.itemIds : []).map((id) => text(id, 120)).filter(Boolean))];
  if (!ids.length) return json({ error: "Selecione itens conferidos." }, 400);
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT * FROM todogreen_billing_items WHERE tenant_id=? AND workspace_owner_id=?
      AND id IN (${placeholders}) AND status='checked'`,
  ).bind(TENANT_ID, access.ownerId, ...ids).all();
  const items = results || [];
  if (items.length !== ids.length) return json({ error: "Todos os itens precisam estar conferidos e no mesmo espaço." }, 409);
  const clients = new Set(items.map((item) => item.client_id));
  if (clients.size !== 1) return json({ error: "Um fechamento pode conter apenas um cliente." }, 400);
  const amount = items.reduce((sum, item) => sum + num(item.amount), 0);
  const now = new Date().toISOString();
  const runId = crypto.randomUUID();
  const invoiceId = crypto.randomUUID();
  const titleId = crypto.randomUUID();
  const runNumber = `FAT-${now.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const invoiceNumber = await reserveNumber(env, access.ownerId, "nota_fiscal", "NF-", now);
  const titleNumber = await reserveNumber(env, access.ownerId, "titulo", "REC-", now);
  const dueDate = text(body.dueDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return json({ error: "Informe o vencimento do título." }, 400);
  const competence = text(body.competenceDate, 10) || items[0].competence_date;
  const contractId = new Set(items.map((item) => item.contract_id)).size === 1 ? items[0].contract_id : "";
  const statements = [
    env.DB.prepare(`INSERT INTO todogreen_billing_runs
      (id,tenant_id,workspace_owner_id,number,client_id,contract_id,status,competence_date,gross_amount,net_amount,closed_by,closed_at)
      VALUES (?,?,?,?,?,?,'closed',?,?,?,?,?)`).bind(runId,TENANT_ID,access.ownerId,runNumber,items[0].client_id,contractId,competence,amount,amount,user.id,now),
    env.DB.prepare(`INSERT INTO todogreen_invoices
      (id,tenant_id,workspace_owner_id,billing_run_id,number,series,status,issued_at,amount,created_by,created_at)
      VALUES (?,?,?,?,?,'1','issued',?,?,?,?)`).bind(invoiceId,TENANT_ID,access.ownerId,runId,invoiceNumber,now,amount,user.id,now),
    env.DB.prepare(`INSERT INTO todogreen_financial_titles
      (id,tenant_id,workspace_owner_id,number,kind,client_id,contract_id,billing_run_id,invoice_id,
       competence_date,issue_date,due_date,original_amount,open_amount,status,created_by,updated_by,created_at,updated_at)
      VALUES (?,?,?,?,'receivable',?,?,?,?,?,?,?,?,?,'open',?,?,?,?)`).bind(titleId,TENANT_ID,access.ownerId,titleNumber,items[0].client_id,contractId,runId,invoiceId,competence,now.slice(0,10),dueDate,amount,amount,user.id,user.id,now,now),
    env.DB.prepare(`UPDATE todogreen_billing_items SET status='billed',billing_run_id=?,revision=revision+1,updated_by=?,updated_at=?
      WHERE tenant_id=? AND workspace_owner_id=? AND id IN (${placeholders}) AND status='checked'`).bind(runId,user.id,now,TENANT_ID,access.ownerId,...ids),
  ];
  await env.DB.batch(statements);
  return json({ billingRunId: runId, invoiceId, invoiceNumber, titleId, titleNumber, amount }, 201);
}

async function listTitles(env, access, url) {
  const kind = text(url.searchParams.get("kind"), 20);
  const { results } = await env.DB.prepare(
    `SELECT * FROM todogreen_financial_titles WHERE tenant_id=? AND workspace_owner_id=? AND archived_at IS NULL
      ${kind ? "AND kind=?" : ""} ORDER BY due_date,created_at`,
  ).bind(TENANT_ID, access.ownerId, ...(kind ? [kind] : [])).all();
  return json({ records: results || [] });
}

async function settleTitle(env, access, user, id, body) {
  if (!allowed(access, "finance:manage")) return json({ error: "Sem permissão financeira." }, 403);
  const row = await env.DB.prepare(
    "SELECT * FROM todogreen_financial_titles WHERE id=? AND tenant_id=? AND workspace_owner_id=? AND archived_at IS NULL",
  ).bind(id,TENANT_ID,access.ownerId).first();
  if (!row) return json({ error: "Título não encontrado." }, 404);
  if (!["open","partial","overdue"].includes(row.status)) return json({ error: "Este título não aceita baixa." }, 409);
  const state = settlementState(row.open_amount, body.amount);
  if (!state.valid) return json({ error: state.error }, 400);
  const now = new Date().toISOString();
  const settlementId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO todogreen_settlements
      (id,tenant_id,workspace_owner_id,title_id,amount,settled_at,method,bank_account_id,reference,notes,created_by,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(settlementId,TENANT_ID,access.ownerId,id,num(body.amount),text(body.settledAt,40)||now,text(body.method,50),text(body.bankAccountId,120),text(body.reference,120),text(body.notes,500),user.id,now),
    env.DB.prepare(`UPDATE todogreen_financial_titles SET open_amount=?,status=?,revision=revision+1,updated_by=?,updated_at=?
      WHERE id=? AND tenant_id=? AND workspace_owner_id=?`).bind(state.remaining,state.status,user.id,now,id,TENANT_ID,access.ownerId),
  ]);
  return json({ settlementId, openAmount: state.remaining, status: state.status }, 201);
}

async function createCost(env, access, user, body) {
  if (!allowed(access, "finance:manage")) return json({ error: "Sem permissão financeira." }, 403);
  const amount = Math.max(0, num(body.amount));
  const validation = validateAllocation(amount, body.allocations);
  if (!validation.valid) return json({ error: validation.error }, 400);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const allocations = body.allocations.map((item) => ({ ...item, id: crypto.randomUUID() }));
  const statements = [env.DB.prepare(`INSERT INTO todogreen_cost_entries
    (id,tenant_id,workspace_owner_id,description,amount,competence_date,supplier_id,purchase_order_id,
     financial_title_id,document_number,fields_json,created_by,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,TENANT_ID,access.ownerId,text(body.description,300),amount,text(body.competenceDate,10),text(body.supplierId,120),text(body.purchaseOrderId,120),text(body.financialTitleId,120),text(body.documentNumber,80),JSON.stringify(object(body.fields)),user.id,now)];
  for (const item of allocations) statements.push(env.DB.prepare(`INSERT INTO todogreen_cost_allocations
    (id,tenant_id,workspace_owner_id,cost_entry_id,service_order_id,operation_id,client_id,contract_id,
     vehicle_id,supplier_id,cost_center_id,amount,percentage,rule,created_by,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(item.id,TENANT_ID,access.ownerId,id,text(item.serviceOrderId,120),text(item.operationId,120),text(item.clientId,120),text(item.contractId,120),text(item.vehicleId,120),text(item.supplierId||body.supplierId,120),text(item.costCenterId,120),num(item.amount),amount ? num(item.amount)/amount*100 : 0,text(item.rule,50)||"manual",user.id,now));
  await env.DB.batch(statements);
  return json({ costEntryId: id, amount, allocations: allocations.map((item) => item.id) }, 201);
}

async function listCosts(env, access, url) {
  const { limit, offset } = paginacao(url);
  const { results } = await env.DB.prepare(
    `SELECT * FROM todogreen_cost_entries WHERE tenant_id=? AND workspace_owner_id=?
      ORDER BY competence_date DESC,created_at DESC LIMIT ? OFFSET ?`,
  ).bind(TENANT_ID, access.ownerId, limit, offset).all();
  const records = [];
  for (const row of results || []) {
    const allocationRows = await env.DB.prepare(
      `SELECT * FROM todogreen_cost_allocations WHERE tenant_id=? AND workspace_owner_id=?
        AND cost_entry_id=? ORDER BY created_at,id`,
    ).bind(TENANT_ID, access.ownerId, row.id).all();
    records.push({ ...row, allocations: allocationRows.results || [] });
  }
  return json({ records, limit, offset });
}

export async function handleTodoGreenTransactions(request, env, access, user) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/todogreen\/transactions\/?/, "").split("/").filter(Boolean);
  const [resource, id, action] = parts;
  let body = {};
  if (!["GET","HEAD"].includes(request.method)) body = await request.json().catch(() => ({}));

  if (resource === "service-orders" && request.method === "GET" && !id) return listOrders(env, access, url);
  if (resource === "service-orders" && request.method === "POST" && !id) return createOrder(env, access, user, body);
  if (resource === "service-orders" && request.method === "POST" && id && action === "transition") return transitionOrder(env, access, user, id, body);
  if (resource === "billing-items" && request.method === "GET") return listBilling(env, access, url);
  if (resource === "billing-items" && request.method === "POST" && id && action === "check") return checkBilling(env, access, user, id, body);
  if (resource === "billing-runs" && request.method === "POST" && !id) return closeBilling(env, access, user, body);
  if (resource === "titles" && request.method === "GET" && !id) return listTitles(env, access, url);
  if (resource === "titles" && request.method === "POST" && id && action === "settle") return settleTitle(env, access, user, id, body);
  if (resource === "costs" && request.method === "GET" && !id) return listCosts(env, access, url);
  if (resource === "costs" && request.method === "POST" && !id) return createCost(env, access, user, body);
  return json({ error: "Rota transacional não encontrada." }, 404);
}
