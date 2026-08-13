import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const emptyForm = { scenarioId: "", referenceMonth: new Date().toISOString().slice(0, 7), actualRevenue: "", actualCost: "", actualTrips: "", actualDistanceKm: "", actualCo2Kg: "", notes: "" };

export default function PricingPerformancePanel({ authHeaders, canManage, setToast }) {
  const [data, setData] = useState({ scenarios: [], comparisons: [], learning: [] });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/todogreen/pricing-performance", { headers: authHeaders?.() || {} });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o realizado.");
      setData({
        scenarios: Array.isArray(payload.scenarios) ? payload.scenarios : [],
        comparisons: Array.isArray(payload.comparisons) ? payload.comparisons : [],
        learning: Array.isArray(payload.learning) ? payload.learning : [],
      });
    } catch (error) { setToast?.(error.message); }
    finally { setLoading(false); }
  }, [authHeaders, setToast]);
  useEffect(() => { load(); }, [load]);
  const field = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/todogreen/pricing-performance", {
      method: "POST",
      headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setToast?.(payload.error || "Não foi possível salvar o realizado.");
    setToast?.("Realizado salvo e aprendizado recalculado.");
    setForm(emptyForm);
    load();
  };
  return <section className="tdg-price-guidance" aria-label="Planejado versus realizado">
    <div>
      <span className="tdg-kicker">PLANNED VS ACTUAL</span>
      <h3>Pricing × operação real</h3>
      <p>Compara o snapshot aprovado com receita e custo executados. A régua só recebe recomendação após três períodos reais.</p>
      <button type="button" onClick={load} disabled={loading}><RefreshCw size={14} />{loading ? "Atualizando..." : "Atualizar"}</button>
      <div className="tdg-price-details">
        {data.comparisons.slice(0, 8).map((item) => <span className={item.status === "attention" ? "risk" : "good"} key={`${item.scenarioId}-${item.referenceMonth}`}><small>{item.referenceMonth} · {item.productId}</small><strong>{item.actualMargin === null ? "Margem indisponível" : `${item.actualMargin.toLocaleString("pt-BR")}% realizada`}</strong><small>{BRL.format(item.revenueVariance)} receita · {BRL.format(item.costVariance)} custo vs. plano</small></span>)}
        {!loading && data.comparisons.length === 0 && <p>Nenhum realizado vinculado às simulações ainda.</p>}
      </div>
      {data.learning.map((item) => <p key={item.productId}><strong>{item.productId} · {item.samples} período(s):</strong> {item.recommendation}</p>)}
    </div>
    {canManage && <form className="tdg-form" onSubmit={save}>
      <fieldset><legend>Registrar realizado</legend>
        <label><span>Simulação</span><select required value={form.scenarioId} onChange={field("scenarioId")}><option value="">Selecione</option>{data.scenarios.map((item) => <option value={item.id} key={item.id}>{item.productId} · {item.clientId || item.id}</option>)}</select></label>
        <label><span>Mês</span><input required type="month" value={form.referenceMonth} onChange={field("referenceMonth")} /></label>
        <label><span>Receita realizada (R$)</span><input required type="number" min="0" value={form.actualRevenue} onChange={field("actualRevenue")} /></label>
        <label><span>Custo realizado (R$)</span><input required type="number" min="0" value={form.actualCost} onChange={field("actualCost")} /></label>
        <label><span>Viagens realizadas</span><input type="number" min="0" value={form.actualTrips} onChange={field("actualTrips")} /></label>
        <label><span>Distância realizada (km)</span><input type="number" min="0" value={form.actualDistanceKm} onChange={field("actualDistanceKm")} /></label>
        <label><span>CO₂ evitado realizado (kg)</span><input type="number" min="0" value={form.actualCo2Kg} onChange={field("actualCo2Kg")} /></label>
        <label><span>Observações / fonte</span><textarea value={form.notes} onChange={field("notes")} /></label>
        <button className="tdg-action" type="submit"><Save size={15} />Salvar realizado</button>
      </fieldset>
    </form>}
  </section>;
}
