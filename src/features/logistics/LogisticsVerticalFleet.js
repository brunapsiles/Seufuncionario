import "./LogisticsVerticalFleet.css";
import { fleetAlerts, summarizeFleet } from "./todoGreenFleetDomain.js";

const TOKEN_KEY = "seu-funcionario-auth-token";
let vehicles = [];
let canWrite = false;
let loading = false;
let showForm = false;
let search = "";
let statusFilter = "all";

const token = () => localStorage.getItem(TOKEN_KEY) || "";
const api = async (path = "", options = {}) => {
  const response = await fetch(`/api/todogreen/fleet${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(token() ? { authorization: `Bearer ${token()}` } : {}), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir.");
  return payload;
};
const label = (value) => ({ available:"Disponível", "in-operation":"Em operação", maintenance:"Manutenção", reserved:"Reserva", blocked:"Bloqueado", inactive:"Inativo", electric:"Elétrico", biomethane:"Biometano", hybrid:"Híbrido", diesel:"Diesel" }[value] || String(value || ""));
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const filtered = () => vehicles.filter((v) => (statusFilter === "all" || v.status === statusFilter) && (!search || `${v.prefix} ${v.plate} ${v.manufacturer} ${v.model} ${v.operationalUnit}`.toLowerCase().includes(search.toLowerCase())));

const ensureTab = () => {
  const nav = document.querySelector(".tdg-tabs");
  if (!nav || nav.querySelector('[data-tdg-fleet-tab="true"]')) return;
  const button = document.createElement("button"); button.type = "button"; button.dataset.tdgFleetTab = "true"; button.textContent = "Frota";
  button.addEventListener("click", () => { history.pushState({}, "", "/todogreen/frota"); window.dispatchEvent(new PopStateEvent("popstate")); render(); });
  nav.appendChild(button);
};

const hideOtherContent = (active) => {
  const main = document.querySelector("main.tdg"); if (!main) return;
  [...main.children].forEach((child) => { if (child.matches(".tdg-hero,.tdg-tabs,.tdg-metrics,[data-tdg-fleet-root]")) return; child.style.display = active ? "none" : ""; });
};

const form = () => !showForm ? "" : `<form class="tdg-fleet-form" data-fleet-form>
<label><span>Prefixo</span><input name="prefix" required placeholder="TG-001"></label><label><span>Placa</span><input name="plate"></label><label><span>Status</span><select name="status"><option value="available">Disponível</option><option value="in-operation">Em operação</option><option value="maintenance">Manutenção</option><option value="reserved">Reserva</option><option value="blocked">Bloqueado</option></select></label>
<label><span>Fabricante</span><input name="manufacturer"></label><label><span>Modelo</span><input name="model"></label><label><span>Ano</span><input name="modelYear" type="number"></label>
<label><span>Energia</span><select name="energyType"><option value="electric">Elétrico</option><option value="biomethane">Biometano</option><option value="hybrid">Híbrido</option><option value="diesel">Diesel</option></select></label><label><span>Unidade</span><input name="operationalUnit"></label><label><span>Centro de custo</span><input name="costCenter"></label>
<label><span>Capacidade kg</span><input name="payloadKg" type="number" step="0.01"></label><label><span>Autonomia nominal km</span><input name="nominalRangeKm" type="number" step="0.01"></label><label><span>Autonomia real km</span><input name="realRangeKm" type="number" step="0.01"></label>
<label><span>SOH bateria %</span><input name="batterySohPercent" type="number" value="100" min="0" max="100"></label><label><span>Próxima manutenção</span><input name="nextMaintenanceAt" type="date"></label><label><span>Documento vence</span><input name="nextDocumentDueAt" type="date"></label>
<div class="tdg-fleet-actions full"><button class="tdg-action" type="submit">Cadastrar veículo</button><button class="tdg-login-secondary" type="button" data-fleet-cancel>Cancelar</button></div></form>`;

const card = (vehicle) => {
  const alerts = fleetAlerts(vehicle); const margin = Number(vehicle.revenueAccumulated || 0) - Number(vehicle.costAccumulated || 0);
  return `<article class="tdg-fleet-card" data-fleet-id="${vehicle.id}"><header><span>${vehicle.prefix} · ${vehicle.plate || "sem placa"}</span><strong>${vehicle.manufacturer || "Fabricante"} ${vehicle.model || ""}</strong><small>${label(vehicle.energyType)} · ${vehicle.operationalUnit || "Sem unidade"}</small>${alerts.map((a) => `<em class="tdg-fleet-alert">${a.message}</em>`).join("")}</header>
<select data-fleet-status ${canWrite ? "" : "disabled"}>${["available","in-operation","maintenance","reserved","blocked","inactive"].map((s) => `<option value="${s}" ${s===vehicle.status?"selected":""}>${label(s)}</option>`).join("")}</select>
<div><small>Autonomia</small><strong>${Number(vehicle.realRangeKm||0).toFixed(0)} km</strong></div><div><small>SOH bateria</small><strong>${Number(vehicle.batterySohPercent||0).toFixed(0)}%</strong></div><div><small>Margem acumulada</small><strong>${money(margin)}</strong></div></article>`;
};

const renderFleet = () => {
  const root = document.querySelector("[data-tdg-fleet-root]"); if (!root) return;
  const summary = summarizeFleet(vehicles); const rows = filtered();
  root.innerHTML = `<section class="tdg-panel tdg-fleet"><div class="tdg-fleet-head"><div><span class="tdg-kicker">FROTA</span><h2>Gestão da frota sustentável</h2><p>Disponibilidade, autonomia, bateria, manutenção, custos, receita e risco por veículo.</p></div>${canWrite ? '<button class="tdg-action" type="button" data-fleet-new>+ Novo veículo</button>' : ""}</div>
<div class="tdg-fleet-metrics"><article><small>Total</small><strong>${summary.total}</strong></article><article><small>Disponíveis</small><strong>${summary.available}</strong></article><article><small>Em operação</small><strong>${summary.inOperation}</strong></article><article><small>Manutenção</small><strong>${summary.maintenance}</strong></article><article><small>Margem</small><strong>${money(summary.margin)}</strong></article><article><small>Riscos bateria</small><strong>${summary.batteryRisks}</strong></article></div>
<div class="tdg-fleet-toolbar"><input data-fleet-search value="${search}" placeholder="Buscar prefixo, placa, modelo ou unidade"><select data-fleet-filter><option value="all">Todos os status</option>${["available","in-operation","maintenance","reserved","blocked","inactive"].map((s)=>`<option value="${s}" ${s===statusFilter?"selected":""}>${label(s)}</option>`).join("")}</select></div>${form()}<div class="tdg-fleet-list">${loading ? '<div class="tdg-fleet-empty">Carregando frota...</div>' : rows.length ? rows.map(card).join("") : '<div class="tdg-fleet-empty">Nenhum veículo cadastrado com os filtros atuais.</div>'}</div></section>`;
  root.querySelector("[data-fleet-new]")?.addEventListener("click",()=>{showForm=true;renderFleet();}); root.querySelector("[data-fleet-cancel]")?.addEventListener("click",()=>{showForm=false;renderFleet();});
  root.querySelector("[data-fleet-search]")?.addEventListener("input",(e)=>{search=e.target.value;renderFleet();}); root.querySelector("[data-fleet-filter]")?.addEventListener("change",(e)=>{statusFilter=e.target.value;renderFleet();});
  root.querySelector("[data-fleet-form]")?.addEventListener("submit", async (event)=>{event.preventDefault(); const data=Object.fromEntries(new FormData(event.currentTarget).entries()); try{const payload=await api("",{method:"POST",body:JSON.stringify(data)}); vehicles=[payload.vehicle,...vehicles];showForm=false;renderFleet();}catch(error){alert(error.message);}});
  root.querySelectorAll("[data-fleet-id]").forEach((row)=>row.querySelector("[data-fleet-status]")?.addEventListener("change",async(e)=>{const current=vehicles.find(v=>v.id===row.dataset.fleetId);try{const payload=await api(`/${current.id}`,{method:"PATCH",body:JSON.stringify({revision:current.revision,status:e.target.value})});vehicles=vehicles.map(v=>v.id===current.id?payload.vehicle:v);renderFleet();}catch(error){alert(error.message);await load();}}));
};

const load = async () => { loading=true;renderFleet();try{const payload=await api();vehicles=payload.vehicles||[];canWrite=!!payload.access?.canWrite;}catch(error){console.error(error);}finally{loading=false;renderFleet();} };
const render = () => { ensureTab(); const active=location.pathname.startsWith("/todogreen/frota"); hideOtherContent(active); let root=document.querySelector("[data-tdg-fleet-root]"); if(active&&!root){root=document.createElement("div");root.dataset.tdgFleetRoot="true";document.querySelector("main.tdg")?.appendChild(root);load();} if(root) root.style.display=active?"":"none"; if(active) renderFleet(); };
if(typeof window!=="undefined"){const start=()=>{render();addEventListener("popstate",render);new MutationObserver(render).observe(document.body,{childList:true,subtree:true});};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start,{once:true}):start();}
