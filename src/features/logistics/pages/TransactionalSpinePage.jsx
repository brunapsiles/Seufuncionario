import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDollarSign, Plus, ReceiptText, Split } from "lucide-react";
import "./TransactionalSpinePage.css";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);
const apiPath = "/api/todogreen/transactions";
const statusLabel = { draft: "Rascunho", released: "Liberada", in_progress: "Em execução", completed: "Concluída", cancelled: "Cancelada", eligible: "Elegível", checked: "Conferido", blocked: "Bloqueado", billed: "Faturado", open: "Em aberto", partial: "Parcial", settled: "Liquidado", overdue: "Vencido" };
const nextStatus = { draft: "released", released: "in_progress", in_progress: "completed" };
const nextLabel = { draft: "Liberar", released: "Iniciar", in_progress: "Concluir e faturar" };

const request = async (path, authHeaders, options = {}) => {
  const response = await fetch(`${apiPath}/${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(authHeaders?.() || {}), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
};

const clientName = (clients, id) => clients.find((item) => item.id === id)?.name || clients.find((item) => item.id === id)?.nome || id || "Sem cliente";
const contractName = (contracts, id) => contracts.find((item) => item.id === id)?.titulo || contracts.find((item) => item.id === id)?.title || id || "Sem contrato";

function Empty({ children }) { return <div className="tdg-txn-empty">{children}</div>; }
function Status({ value }) { return <span className={`tdg-txn-status ${value}`}>{statusLabel[value] || value}</span>; }

function ServiceOrders({ authHeaders, clients, contracts, operations, setToast }) {
  const [records, setRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ clientId: "", contractId: "", operationId: "", quantity: "", chargeUnit: "entrega", unitPrice: "", discountAmount: "0", taxAmount: "0", scheduledStartAt: "", scheduledEndAt: "" });
  const load = useCallback(() => request("service-orders", authHeaders).then((data) => setRecords(data.records || [])).catch((error) => setToast?.(error.message)), [authHeaders, setToast]);
  useEffect(() => { load(); }, [load]);
  const eligibleContracts = contracts.filter((item) => (!form.clientId || (item.clientId || item.clienteId) === form.clientId) && (item.status === "active" || item.status === "ativo") && (item.aprovacao === "approved" || item.approvalStatus === "approved") && (item.assinatura === "signed" || item.signatureStatus === "signed"));
  const create = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await request("service-orders", authHeaders, { method: "POST", body: JSON.stringify({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), discountAmount: Number(form.discountAmount), taxAmount: Number(form.taxAmount) }) });
      setToast?.("Ordem de serviço criada"); setForm((value) => ({ ...value, quantity: "", unitPrice: "" })); await load();
    } catch (error) { setToast?.(error.message); } finally { setSaving(false); }
  };
  const transition = async (record) => {
    const status = nextStatus[record.status]; if (!status) return;
    try { await request(`service-orders/${record.id}/transition`, authHeaders, { method: "POST", body: JSON.stringify({ status, revision: record.revision }) }); setToast?.(status === "completed" ? "Operação concluída e enviada ao faturamento" : "Ordem atualizada"); await load(); } catch (error) { setToast?.(error.message); }
  };
  return <section className="tdg-panel tdg-txn-page"><div className="tdg-section-head"><div><span className="tdg-kicker">OBJETO CANÔNICO</span><h2>Ordens de serviço</h2><p>Contrato aprovado gera uma única OS. Execução, faturamento, título e custos usam o mesmo identificador.</p></div><strong>{records.length} ordem(ns)</strong></div>
    <form className="tdg-txn-form" onSubmit={create}>
      <label><span>Cliente</span><select required value={form.clientId} onChange={(e) => setForm((v) => ({ ...v, clientId: e.target.value, contractId: "" }))}><option value="">Selecione</option>{clients.map((item) => <option value={item.id} key={item.id}>{item.name || item.nome}</option>)}</select></label>
      <label><span>Contrato aprovado e assinado</span><select required value={form.contractId} onChange={(e) => setForm((v) => ({ ...v, contractId: e.target.value }))}><option value="">Selecione</option>{eligibleContracts.map((item) => <option value={item.id} key={item.id}>{item.titulo || item.title || item.id}</option>)}</select><small>{form.clientId && !eligibleContracts.length ? "Nenhum contrato elegível para este cliente." : ""}</small></label>
      <label><span>Operação vinculada</span><select value={form.operationId} onChange={(e) => setForm((v) => ({ ...v, operationId: e.target.value }))}><option value="">Vincular depois</option>{operations.filter((item) => !form.clientId || (item.clientId || item.clienteId) === form.clientId).map((item) => <option value={item.id} key={item.id}>{item.referencia || item.reference || item.id}</option>)}</select></label>
      <label><span>Quantidade</span><input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm((v) => ({ ...v, quantity: e.target.value }))} /></label>
      <label><span>Unidade de cobrança</span><input required value={form.chargeUnit} onChange={(e) => setForm((v) => ({ ...v, chargeUnit: e.target.value }))} /></label>
      <label><span>Preço unitário</span><input required type="number" min="0.01" step="0.01" value={form.unitPrice} onChange={(e) => setForm((v) => ({ ...v, unitPrice: e.target.value }))} /></label>
      <label><span>Início programado</span><input type="datetime-local" value={form.scheduledStartAt} onChange={(e) => setForm((v) => ({ ...v, scheduledStartAt: e.target.value }))} /></label>
      <label><span>Fim programado</span><input type="datetime-local" value={form.scheduledEndAt} onChange={(e) => setForm((v) => ({ ...v, scheduledEndAt: e.target.value }))} /></label>
      <button className="tdg-action" disabled={saving || !eligibleContracts.length}><Plus size={17} />Criar OS</button>
    </form>
    <div className="tdg-txn-list">{!records.length && <Empty>Nenhuma ordem de serviço criada.</Empty>}{records.map((record) => <article className="tdg-txn-row" key={record.id}><span><strong>{record.number}</strong><small>{clientName(clients, record.clientId)} · {contractName(contracts, record.contractId)}</small></span><span><small>Valor líquido</small><strong>{BRL.format(record.netAmount || 0)}</strong></span><Status value={record.status} />{nextStatus[record.status] && <button type="button" onClick={() => transition(record)}>{nextLabel[record.status]}<ArrowRight size={14} /></button>}</article>)}</div>
  </section>;
}

function Billing({ authHeaders, clients, setToast }) {
  const [records, setRecords] = useState([]); const [selected, setSelected] = useState([]); const [dueDate, setDueDate] = useState(today());
  const load = useCallback(async () => { try { const parts = await Promise.all(["eligible", "checked", "blocked"].map((status) => request(`billing-items?status=${status}`, authHeaders))); setRecords(parts.flatMap((item) => item.records || [])); } catch (error) { setToast?.(error.message); } }, [authHeaders, setToast]);
  useEffect(() => { load(); }, [load]);
  const check = async (item, approved) => { try { await request(`billing-items/${item.id}/check`, authHeaders, { method: "POST", body: JSON.stringify({ approved, reason: approved ? "" : "Bloqueado na conferência", revision: item.revision }) }); await load(); } catch (error) { setToast?.(error.message); } };
  const close = async () => { try { const result = await request("billing-runs", authHeaders, { method: "POST", body: JSON.stringify({ itemIds: selected, dueDate, competenceDate: today() }) }); setToast?.(`Faturamento fechado: ${result.invoiceNumber} · ${result.titleNumber}`); setSelected([]); await load(); } catch (error) { setToast?.(error.message); } };
  const checked = records.filter((item) => item.status === "checked");
  return <section className="tdg-panel tdg-txn-page"><div className="tdg-section-head"><div><span className="tdg-kicker">OPERAÇÃO → DOCUMENTO → TÍTULO</span><h2>Fila de faturamento</h2><p>Somente OS concluída entra na fila. Conferência e fechamento geram documento e conta a receber.</p></div><strong>{records.length} item(ns)</strong></div>
    {checked.length > 0 && <div className="tdg-txn-close"><label><span>Vencimento do título</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label><button className="tdg-action" type="button" disabled={!selected.length} onClick={close}><ReceiptText size={17} />Fechar {selected.length} item(ns)</button></div>}
    <div className="tdg-txn-list">{!records.length && <Empty>Nenhuma operação aguardando faturamento.</Empty>}{records.map((item) => <article className="tdg-txn-row" key={item.id}>{item.status === "checked" && <input aria-label={`Selecionar ${item.service_order_number}`} type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected((list) => e.target.checked ? [...list, item.id] : list.filter((id) => id !== item.id))} />}<span><strong>{item.service_order_number}</strong><small>{clientName(clients, item.client_id)} · competência {item.competence_date}</small></span><span><small>Faturável</small><strong>{BRL.format(item.amount || 0)}</strong></span><Status value={item.status} />{item.status !== "checked" && <span className="tdg-txn-actions"><button type="button" onClick={() => check(item, true)}>Conferir</button><button type="button" onClick={() => check(item, false)}>Bloquear</button></span>}</article>)}</div>
  </section>;
}

function Titles({ authHeaders, clients, setToast }) {
  const [records, setRecords] = useState([]); const [paying, setPaying] = useState(null); const [amount, setAmount] = useState("");
  const load = useCallback(() => request("titles", authHeaders).then((data) => setRecords(data.records || [])).catch((error) => setToast?.(error.message)), [authHeaders, setToast]); useEffect(() => { load(); }, [load]);
  const settle = async (event) => { event.preventDefault(); try { await request(`titles/${paying.id}/settle`, authHeaders, { method: "POST", body: JSON.stringify({ amount: Number(amount), settledAt: new Date().toISOString(), method: "pix" }) }); setToast?.("Baixa registrada"); setPaying(null); await load(); } catch (error) { setToast?.(error.message); } };
  const openTotal = useMemo(() => records.reduce((sum, item) => sum + Number(item.open_amount || 0), 0), [records]);
  return <section className="tdg-panel tdg-txn-page"><div className="tdg-section-head"><div><span className="tdg-kicker">CONTAS A PAGAR E RECEBER</span><h2>Títulos e baixas</h2><p>Competência, vencimento, parcela, origem documental e saldo real em um único razão.</p></div><strong>{BRL.format(openTotal)} em aberto</strong></div><div className="tdg-txn-list">{!records.length && <Empty>Nenhum título financeiro.</Empty>}{records.map((item) => <article className="tdg-txn-row" key={item.id}><span><strong>{item.number}</strong><small>{item.kind === "receivable" ? clientName(clients, item.client_id) : item.supplier_id || "Fornecedor"} · vence {item.due_date}</small></span><span><small>Saldo</small><strong>{BRL.format(item.open_amount || 0)}</strong></span><Status value={item.status} />{["open", "partial", "overdue"].includes(item.status) && <button type="button" onClick={() => { setPaying(item); setAmount(String(item.open_amount)); }}>Dar baixa</button>}</article>)}</div>
    {paying && <form className="tdg-txn-close" onSubmit={settle}><div><strong>Baixa de {paying.number}</strong><small>Saldo atual {BRL.format(paying.open_amount)}</small></div><label><span>Valor</span><input required type="number" min="0.01" max={paying.open_amount} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><button className="tdg-action"><CircleDollarSign size={17} />Confirmar baixa</button><button type="button" onClick={() => setPaying(null)}>Cancelar</button></form>}
  </section>;
}

const allocationEmpty = () => ({ serviceOrderId: "", operationId: "", clientId: "", contractId: "", vehicleId: "", supplierId: "", costCenterId: "", amount: "" });
function Costs({ authHeaders, clients, contracts, operations, setToast }) {
  const [records, setRecords] = useState([]); const [saving, setSaving] = useState(false); const [form, setForm] = useState({ description: "", amount: "", competenceDate: today(), supplierId: "", documentNumber: "", allocations: [allocationEmpty()] });
  const load = useCallback(() => request("costs", authHeaders).then((data) => setRecords(data.records || [])).catch(() => setRecords([])), [authHeaders]); useEffect(() => { load(); }, [load]);
  const allocated = form.allocations.reduce((sum, item) => sum + Number(item.amount || 0), 0); const remaining = Number(form.amount || 0) - allocated;
  const changeAllocation = (index, key, value) => setForm((current) => ({ ...current, allocations: current.allocations.map((item, position) => position === index ? { ...item, [key]: value } : item) }));
  const save = async (event) => { event.preventDefault(); setSaving(true); try { await request("costs", authHeaders, { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount), allocations: form.allocations.map((item) => ({ ...item, amount: Number(item.amount) })) }) }); setToast?.("Custo e rateios registrados"); setForm({ description: "", amount: "", competenceDate: today(), supplierId: "", documentNumber: "", allocations: [allocationEmpty()] }); await load(); } catch (error) { setToast?.(error.message); } finally { setSaving(false); } };
  return <section className="tdg-panel tdg-txn-page"><div className="tdg-section-head"><div><span className="tdg-kicker">CUSTO MULTIDIMENSIONAL</span><h2>Rateio de custos</h2><p>Um custo pode ser distribuído entre OS, operação, cliente, contrato, veículo, fornecedor e centro de custo.</p></div><strong>{records.length} custo(s)</strong></div>
    <form className="tdg-txn-cost" onSubmit={save}><div className="tdg-txn-form"><label><span>Descrição</span><input required value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></label><label><span>Valor total</span><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} /></label><label><span>Competência</span><input required type="date" value={form.competenceDate} onChange={(e) => setForm((v) => ({ ...v, competenceDate: e.target.value }))} /></label><label><span>Documento</span><input value={form.documentNumber} onChange={(e) => setForm((v) => ({ ...v, documentNumber: e.target.value }))} /></label></div>
      <div className="tdg-txn-allocation-head"><strong>Distribuição</strong><span className={Math.abs(remaining) < .01 ? "balanced" : ""}>Restante: {BRL.format(remaining)}</span></div>
      {form.allocations.map((item, index) => <div className="tdg-txn-allocation" key={index}><label><span>Valor</span><input required type="number" min="0.01" step="0.01" value={item.amount} onChange={(e) => changeAllocation(index, "amount", e.target.value)} /></label><label><span>Cliente</span><select value={item.clientId} onChange={(e) => changeAllocation(index, "clientId", e.target.value)}><option value="">Sem vínculo</option>{clients.map((x) => <option value={x.id} key={x.id}>{x.name || x.nome}</option>)}</select></label><label><span>Contrato</span><select value={item.contractId} onChange={(e) => changeAllocation(index, "contractId", e.target.value)}><option value="">Sem vínculo</option>{contracts.map((x) => <option value={x.id} key={x.id}>{x.titulo || x.title || x.id}</option>)}</select></label><label><span>Operação</span><select value={item.operationId} onChange={(e) => changeAllocation(index, "operationId", e.target.value)}><option value="">Sem vínculo</option>{operations.map((x) => <option value={x.id} key={x.id}>{x.referencia || x.reference || x.id}</option>)}</select></label><label><span>OS</span><input value={item.serviceOrderId} onChange={(e) => changeAllocation(index, "serviceOrderId", e.target.value)} placeholder="ID da OS" /></label><label><span>Veículo</span><input value={item.vehicleId} onChange={(e) => changeAllocation(index, "vehicleId", e.target.value)} /></label><label><span>Fornecedor</span><input value={item.supplierId} onChange={(e) => changeAllocation(index, "supplierId", e.target.value)} /></label><label><span>Centro de custo</span><input value={item.costCenterId} onChange={(e) => changeAllocation(index, "costCenterId", e.target.value)} /></label>{form.allocations.length > 1 && <button type="button" onClick={() => setForm((v) => ({ ...v, allocations: v.allocations.filter((_, position) => position !== index) }))}>Remover</button>}</div>)}
      <div className="tdg-txn-form-actions"><button type="button" onClick={() => setForm((v) => ({ ...v, allocations: [...v.allocations, allocationEmpty()] }))}><Plus size={16} />Adicionar rateio</button><button className="tdg-action" disabled={saving || Math.abs(remaining) >= .01}><Split size={17} />Salvar custo rateado</button></div>
    </form>
    <div className="tdg-txn-list">{!records.length && <Empty>Nenhum custo rateado registrado.</Empty>}{records.map((item) => <article className="tdg-txn-row" key={item.id}><span><strong>{item.description}</strong><small>{item.document_number || "sem documento"} · {item.allocations?.length || 0} dimensão(ões)</small></span><span><small>Valor</small><strong>{BRL.format(item.amount || 0)}</strong></span><CheckCircle2 size={18} /></article>)}</div>
  </section>;
}

export default function TransactionalSpinePage({ mode, authHeaders, clients = [], contracts = [], operations = [], setToast }) {
  if (mode === "service-orders") return <ServiceOrders {...{ authHeaders, clients, contracts, operations, setToast }} />;
  if (mode === "billing") return <Billing {...{ authHeaders, clients, setToast }} />;
  if (mode === "titles") return <Titles {...{ authHeaders, clients, setToast }} />;
  return <Costs {...{ authHeaders, clients, contracts, operations, setToast }} />;
}
