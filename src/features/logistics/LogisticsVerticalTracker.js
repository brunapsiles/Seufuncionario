import "./LogisticsVerticalTracker.css";
import {
  TRACKER_DEFAULT_CONFIG,
  normalizeTrackerConfig,
  trackerOperationalSummary,
  trackerRequirements,
  trackerStatusLabel,
  trackerVehicleState,
} from "./trackerIntegrationDomain.js";

const TOKEN_KEY = "seu-funcionario-auth-token";
let integration = null;
let requirements = {};
let summary = trackerOperationalSummary();
let vehicles = [];
let access = { canManage: false };
let loading = false;
let working = false;
let notice = null;

const token = () => localStorage.getItem(TOKEN_KEY) || "";
const api = async (path = "", options = {}) => {
  const response = await fetch(`/api/todogreen/tracker${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token() ? { authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const formatDate = (value) => {
  if (!value) return "Ainda não ocorreu";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Horário indisponível"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};
const yesNo = (value) => value ? "Sim" : "Não";

const ensureTab = () => {
  const nav = document.querySelector(".tdg-tabs");
  if (!nav || nav.querySelector('[data-tdg-tracker-tab="true"]')) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.tdgTrackerTab = "true";
  button.textContent = "Rastreamento";
  button.addEventListener("click", () => {
    history.pushState({}, "", "/todogreen/rastreamento");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  nav.appendChild(button);
};

const hideOtherContent = (active) => {
  const main = document.querySelector("main.tdg");
  if (!main) return;
  [...main.children].forEach((child) => {
    if (child.matches(".tdg-hero,.tdg-tabs,.tdg-metrics,[data-tdg-tracker-root]")) return;
    child.style.display = active ? "none" : "";
  });
};

const requirementCards = (config) => trackerRequirements(config, requirements)
  .map((item) => `
    <article class="tdg-tracker-requirement ${item.ready ? "is-ready" : "is-pending"}">
      <span>${item.ready ? "Pronto" : item.optional ? "Opcional" : "Pendente"}</span>
      <strong>${escapeHtml(item.label)}</strong>
    </article>`)
  .join("");

const statusPanel = (config) => `
  <section class="tdg-tracker-status-grid">
    <article><small>Situação</small><strong>${escapeHtml(trackerStatusLabel(integration?.status))}</strong></article>
    <article><small>Veículos vinculados</small><strong>${summary.linkedVehicles}</strong></article>
    <article><small>Posições recebidas</small><strong>${summary.positions}</strong></article>
    <article><small>Eventos recebidos</small><strong>${summary.events}</strong></article>
    <article><small>Última posição</small><strong>${escapeHtml(formatDate(summary.latestPositionAt))}</strong></article>
    <article><small>Modo seguro</small><strong>Somente leitura</strong></article>
  </section>
  <div class="tdg-tracker-requirements">${requirementCards(config)}</div>`;

const fieldInput = (label, name, value, placeholder = "") => `
  <label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"></label>`;

const configForm = (config) => `
  <form class="tdg-tracker-form" data-tracker-config>
    <div class="tdg-tracker-section-title">
      <div><span class="tdg-kicker">CONEXÃO</span><h3>Dados fornecidos pela Sistemas Tracker</h3></div>
      <span class="tdg-tracker-readonly">Nenhuma credencial é salva aqui</span>
    </div>
    ${fieldInput("Nome da integração", "name", config.name)}
    ${fieldInput("URL base da API", "baseUrl", config.baseUrl, "https://api.fornecedor.com/")}
    ${fieldInput("Identificação da conta", "externalAccountId", config.externalAccountId, "Código informado pelo fornecedor")}
    ${fieldInput("Caminho de veículos ou posições", "vehiclesPath", config.providerConfig.vehiclesPath, "v1/vehicles/positions")}
    ${fieldInput("Caminho da lista na resposta", "collectionPath", config.providerConfig.collectionPath, "data.vehicles")}
    <label><span>Autenticação</span><select name="authMode">
      <option value="bearer" ${config.authMode === "bearer" ? "selected" : ""}>Bearer token</option>
      <option value="api_key" ${config.authMode === "api_key" ? "selected" : ""}>Chave em cabeçalho</option>
      <option value="basic" ${config.authMode === "basic" ? "selected" : ""}>Basic</option>
    </select></label>
    ${fieldInput("Nome do cabeçalho da chave", "authHeaderName", config.providerConfig.authHeaderName, "x-api-key")}
    ${fieldInput("Nome do segredo da API", "tokenEnvKey", config.tokenEnvKey)}
    <label><span>Atualização</span><select name="syncMode">
      <option value="manual" ${config.syncMode === "manual" ? "selected" : ""}>Manual</option>
      <option value="polling" ${config.syncMode === "polling" ? "selected" : ""}>Automática, por consulta</option>
      <option value="webhook" ${config.syncMode === "webhook" ? "selected" : ""}>Automática, por webhook</option>
    </select></label>
    <label><span>Intervalo mínimo em minutos</span><input name="pollingIntervalMinutes" type="number" min="60" max="1440" value="${config.pollingIntervalMinutes}"></label>
    ${fieldInput("Nome do segredo do webhook", "webhookSecretEnvKey", config.webhookSecretEnvKey)}
    ${fieldInput("Caminho da lista no webhook", "webhookCollectionPath", config.providerConfig.webhookCollectionPath, "events")}
    <details class="tdg-tracker-advanced full">
      <summary>Correspondência dos campos recebidos</summary>
      <p>Altere somente quando a documentação da Tracker usar nomes diferentes.</p>
      <div class="tdg-tracker-field-map">
        ${fieldInput("Identificador do veículo", "map_id", config.providerConfig.fieldMap.id)}
        ${fieldInput("IMEI", "map_imei", config.providerConfig.fieldMap.imei)}
        ${fieldInput("Placa", "map_plate", config.providerConfig.fieldMap.plate)}
        ${fieldInput("Nome", "map_name", config.providerConfig.fieldMap.name)}
        ${fieldInput("Latitude", "map_latitude", config.providerConfig.fieldMap.latitude)}
        ${fieldInput("Longitude", "map_longitude", config.providerConfig.fieldMap.longitude)}
        ${fieldInput("Velocidade", "map_speed", config.providerConfig.fieldMap.speed)}
        ${fieldInput("Direção", "map_heading", config.providerConfig.fieldMap.heading)}
        ${fieldInput("Ignição", "map_ignition", config.providerConfig.fieldMap.ignition)}
        ${fieldInput("Odômetro", "map_odometer", config.providerConfig.fieldMap.odometer)}
        ${fieldInput("Endereço", "map_address", config.providerConfig.fieldMap.address)}
        ${fieldInput("Data da posição", "map_recordedAt", config.providerConfig.fieldMap.recordedAt)}
        ${fieldInput("ID do evento", "map_eventId", config.providerConfig.fieldMap.eventId)}
        ${fieldInput("Tipo do evento", "map_eventType", config.providerConfig.fieldMap.eventType)}
        ${fieldInput("Gravidade", "map_severity", config.providerConfig.fieldMap.severity)}
        ${fieldInput("Título do evento", "map_title", config.providerConfig.fieldMap.title)}
      </div>
    </details>
    <div class="tdg-tracker-actions full">
      <button class="tdg-action" type="submit" ${!access.canManage || working ? "disabled" : ""}>Salvar configuração</button>
      <button class="tdg-login-secondary" type="button" data-tracker-test ${!access.canManage || !integration || working ? "disabled" : ""}>Testar conexão</button>
      <button class="tdg-login-secondary" type="button" data-tracker-sync ${!access.canManage || !integration || working ? "disabled" : ""}>Sincronizar agora</button>
    </div>
  </form>`;

const webhookPanel = (config) => {
  const path = integration?.id ? `/api/todogreen/tracker/webhook/${integration.id}` : "Salve a configuração para gerar";
  return `
    <section class="tdg-panel tdg-tracker-webhook">
      <div><span class="tdg-kicker">WEBHOOK</span><h3>Recebimento de posições e alertas</h3></div>
      <p>A rastreadora deverá enviar JSON assinado por HMAC-SHA256 no cabeçalho <code>x-tracker-signature</code>.</p>
      <label><span>Endereço no Seu Funcionário</span><output>${escapeHtml(path)}</output></label>
      <small>O segredo usado para validar a assinatura é <strong>${escapeHtml(config.webhookSecretEnvKey)}</strong> e fica somente no cofre do Worker.</small>
    </section>`;
};

const vehicleRows = () => vehicles.length
  ? vehicles.map((vehicle) => {
      const position = vehicle.position;
      const mapUrl = position
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${position.latitude},${position.longitude}`)}`
        : "";
      return `
        <tr>
          <td><strong>${escapeHtml(vehicle.prefix || vehicle.name || vehicle.externalVehicleId)}</strong><small>${escapeHtml(vehicle.plate || "Sem placa")}</small></td>
          <td>${vehicle.linked ? "Vinculado à frota" : "Aguardando vínculo"}</td>
          <td><span class="tdg-tracker-state">${escapeHtml(trackerVehicleState(vehicle))}</span><small>${escapeHtml(formatDate(position?.recordedAt || vehicle.lastSeenAt))}</small></td>
          <td>${position ? `${Number(position.speedKmh || 0).toFixed(0)} km/h` : "—"}</td>
          <td>${position ? yesNo(position.ignition) : "—"}</td>
          <td>${mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noreferrer">Ver posição</a>` : "Sem coordenadas"}</td>
        </tr>`;
    }).join("")
  : `<tr><td colspan="6" class="tdg-tracker-empty">Nenhum veículo recebido. A lista permanecerá vazia até uma sincronização real.</td></tr>`;

const vehiclesPanel = () => `
  <section class="tdg-panel tdg-tracker-vehicles">
    <div class="tdg-tracker-section-title"><div><span class="tdg-kicker">FROTA RASTREADA</span><h3>Última comunicação por veículo</h3></div><span>${vehicles.length} veículo(s)</span></div>
    <div class="tdg-tracker-table-wrap"><table><thead><tr><th>Veículo</th><th>Vínculo</th><th>Comunicação</th><th>Velocidade</th><th>Ignição</th><th>Localização</th></tr></thead><tbody>${vehicleRows()}</tbody></table></div>
  </section>`;

const renderPanel = () => {
  const root = document.querySelector("[data-tdg-tracker-root]");
  if (!root) return;
  const config = normalizeTrackerConfig(integration || TRACKER_DEFAULT_CONFIG);
  root.innerHTML = `
    <section class="tdg-panel tdg-tracker">
      <div class="tdg-tracker-head">
        <div><span class="tdg-kicker">RASTREAMENTO VEICULAR</span><h2>Integração com Sistemas Tracker</h2><p>Estrutura para receber posição, ignição, velocidade, odômetro e eventos sem expor credenciais nem permitir comandos remotos.</p></div>
        <span class="tdg-tracker-provider">${escapeHtml(config.name)}</span>
      </div>
      ${notice ? `<div class="tdg-tracker-notice ${notice.type === "error" ? "is-error" : "is-success"}">${escapeHtml(notice.text)}</div>` : ""}
      ${loading ? '<div class="tdg-tracker-loading">Carregando a integração...</div>' : `${statusPanel(config)}${configForm(config)}`}
    </section>
    ${loading ? "" : `${webhookPanel(config)}${vehiclesPanel()}`}`;

  root.querySelector("[data-tracker-config]")?.addEventListener("submit", saveConfiguration);
  root.querySelector("[data-tracker-test]")?.addEventListener("click", testConnection);
  root.querySelector("[data-tracker-sync]")?.addEventListener("click", syncNow);
};

const formPayload = (form) => {
  const data = Object.fromEntries(new FormData(form).entries());
  const fieldMap = {};
  for (const key of Object.keys(TRACKER_DEFAULT_CONFIG.providerConfig.fieldMap)) {
    fieldMap[key] = data[`map_${key}`] || TRACKER_DEFAULT_CONFIG.providerConfig.fieldMap[key];
  }
  return {
    revision: integration?.revision,
    name: data.name,
    baseUrl: data.baseUrl,
    externalAccountId: data.externalAccountId,
    authMode: data.authMode,
    tokenEnvKey: data.tokenEnvKey,
    webhookSecretEnvKey: data.webhookSecretEnvKey,
    syncMode: data.syncMode,
    pollingIntervalMinutes: Number(data.pollingIntervalMinutes),
    providerConfig: {
      vehiclesPath: data.vehiclesPath,
      collectionPath: data.collectionPath,
      webhookCollectionPath: data.webhookCollectionPath,
      authHeaderName: data.authHeaderName,
      fieldMap,
      webhookFieldMap: fieldMap,
    },
  };
};

async function saveConfiguration(event) {
  event.preventDefault();
  working = true;
  notice = null;
  renderPanel();
  try {
    const payload = await api("/config", { method: "PUT", body: JSON.stringify(formPayload(event.currentTarget)) });
    integration = payload.integration;
    notice = { type: "success", text: "Configuração salva. Agora cadastre os segredos no Cloudflare para testar a conexão." };
    await load(false);
  } catch (error) {
    notice = { type: "error", text: error.message };
  } finally {
    working = false;
    renderPanel();
  }
}

async function testConnection() {
  working = true;
  notice = null;
  renderPanel();
  try {
    const result = await api("/test", { method: "POST" });
    notice = { type: "success", text: `Conexão confirmada. ${result.itemsFound} registro(s) localizado(s), sem importar dados.` };
    await load(false);
  } catch (error) {
    notice = { type: "error", text: error.message };
  } finally {
    working = false;
    renderPanel();
  }
}

async function syncNow() {
  working = true;
  notice = null;
  renderPanel();
  try {
    const result = await api("/sync", { method: "POST" });
    notice = { type: "success", text: `Sincronização concluída: ${result.imported} novo(s), ${result.updated} veículo(s) reconhecido(s) e ${result.ignored} item(ns) ignorado(s).` };
    await load(false);
  } catch (error) {
    notice = { type: "error", text: error.message };
  } finally {
    working = false;
    renderPanel();
  }
}

const load = async (showLoading = true) => {
  if (showLoading) loading = true;
  renderPanel();
  try {
    const [statusResult, vehiclesResult] = await Promise.allSettled([api(), api("/vehicles")]);
    if (statusResult.status === "fulfilled") {
      integration = statusResult.value.integration;
      requirements = statusResult.value.requirements || {};
      summary = trackerOperationalSummary(statusResult.value.summary);
      access = statusResult.value.access || access;
    } else {
      throw statusResult.reason;
    }
    vehicles = vehiclesResult.status === "fulfilled" ? vehiclesResult.value.vehicles || [] : [];
    if (vehiclesResult.status === "rejected") {
      notice = { type: "error", text: "A configuração abriu, mas a lista de veículos não pôde ser carregada." };
    }
  } catch (error) {
    notice = { type: "error", text: error.message };
  } finally {
    loading = false;
    renderPanel();
  }
};

const syncShell = () => {
  ensureTab();
  const active = location.pathname.startsWith("/todogreen/rastreamento");
  hideOtherContent(active);
  let root = document.querySelector("[data-tdg-tracker-root]");
  if (active && !root) {
    root = document.createElement("div");
    root.dataset.tdgTrackerRoot = "true";
    document.querySelector("main.tdg")?.appendChild(root);
    load();
  }
  if (root) root.style.display = active ? "" : "none";
};

if (typeof window !== "undefined") {
  const start = () => {
    syncShell();
    window.addEventListener("popstate", () => {
      window.setTimeout(syncShell, 0);
      window.setTimeout(syncShell, 100);
    });
    const observer = new MutationObserver(() => {
      const main = document.querySelector("main.tdg");
      if (!main) return;
      const needsTab = !document.querySelector('[data-tdg-tracker-tab="true"]');
      const needsRoot = location.pathname.startsWith("/todogreen/rastreamento") && !document.querySelector("[data-tdg-tracker-root]");
      if (needsTab || needsRoot) syncShell();
    });
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
  };
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", start, { once: true })
    : start();
}
