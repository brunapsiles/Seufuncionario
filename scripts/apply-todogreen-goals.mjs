import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, content) => fs.writeFileSync(path, content);
const replaceOnce = (content, before, after, label) => {
  const occurrences = content.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`${label}: esperado 1 trecho, encontrado ${occurrences}.`);
  return content.replace(before, after);
};

const domainPath = "src/features/logistics/logisticsVerticalDomain.js";
let domain = read(domainPath);
domain = replaceOnce(
  domain,
  '  lideranca_comercial: ["read", "deal:approve", "pricing:simulate", "proposal:create"],\n  vendedor: ["read", "pricing:simulate", "proposal:create"],\n  pricing: ["read", "pricing:simulate", "pricing:manage", "deal:review"],\n  financeiro: ["read", "cost:manage", "revenue:manage", "commission:manage", "deal:review"],\n  operacoes: ["read", "operation:manage", "deal:review", "evidence:manage"],\n  sustentabilidade: ["read", "esg:manage", "deal:review", "audit:read", "evidence:manage"],\n  auditor: ["read", "audit:read", "export:read"],',
  '  lideranca_comercial: ["read", "deal:approve", "pricing:simulate", "proposal:create", "goal:read", "goal:create", "goal:update", "goal:checkin", "goal:approve", "goal:close", "goal:manage-team", "goal:export"],\n  vendedor: ["read", "pricing:simulate", "proposal:create", "goal:read", "goal:checkin"],\n  pricing: ["read", "pricing:simulate", "pricing:manage", "deal:review", "goal:read", "goal:checkin"],\n  financeiro: ["read", "cost:manage", "revenue:manage", "commission:manage", "deal:review", "goal:read", "goal:checkin", "goal:validate"],\n  operacoes: ["read", "operation:manage", "deal:review", "evidence:manage", "goal:read", "goal:checkin", "goal:validate"],\n  sustentabilidade: ["read", "esg:manage", "deal:review", "audit:read", "evidence:manage", "goal:read", "goal:checkin", "goal:validate"],\n  auditor: ["read", "audit:read", "export:read", "goal:read", "goal:export"],',
  "permissões de metas",
);
domain = replaceOnce(
  domain,
  '  module("metas", "Metas", "comercial", "/todogreen/dashboard", { icon: "Target", order: 19 }),',
  '  module("metas", "Metas", "comercial", "/todogreen/metas", {\n    icon: "Target",\n    order: 19,\n    description: "Metas por empresa, área, equipe, pessoa, cliente, contrato, produto ou operação, com medição, check-ins, planos de ação e histórico.",\n    permissions: ["goal:read", "goal:create", "goal:checkin", "goal:manage-team"],\n  }),',
  "rota do catálogo de metas",
);
write(domainPath, domain);

const verticalPath = "src/features/logistics/LogisticsVertical.jsx";
let vertical = read(verticalPath);
vertical = replaceOnce(
  vertical,
  'const DashboardBuilderPage = lazy(() => import("./pages/DashboardBuilderPage.jsx"));',
  'const DashboardBuilderPage = lazy(() => import("./pages/DashboardBuilderPage.jsx"));\nconst GoalsPage = lazy(() => import("./pages/GoalsPage.jsx"));',
  "importação da página de metas",
);
vertical = replaceOnce(
  vertical,
  '  "dashboards",\n  "rastreamento",',
  '  "dashboards",\n  "metas",\n  "rastreamento",',
  "módulo implementado",
);
vertical = replaceOnce(
  vertical,
  `  dashboards: {
    title: "Painéis personalizados",
    navLabel: "Meus painéis",
    route: "/todogreen/dashboards",
    area: "gestao",
    status: "functional",
    description: "Criação de painéis pessoais ou compartilhados com indicadores escolhidos por cada usuário.",
  },
  clientes: {`,
  `  dashboards: {
    title: "Painéis personalizados",
    navLabel: "Meus painéis",
    route: "/todogreen/dashboards",
    area: "gestao",
    status: "functional",
    description: "Criação de painéis pessoais ou compartilhados com indicadores escolhidos por cada usuário.",
  },
  metas: {
    title: "Metas e acompanhamento",
    navLabel: "Metas",
    route: "/todogreen/metas",
    area: "comercial",
    status: "functional",
    description: "Metas com fonte de medição, responsável, período, ritmo, projeção, check-ins, planos de ação, desdobramento e histórico.",
  },
  clientes: {`,
  "registro da página de metas",
);
vertical = replaceOnce(
  vertical,
  '  metas: "dashboards",\n',
  "",
  "remoção do alias de metas",
);
vertical = replaceOnce(
  vertical,
  '      {page === "dashboards" && <Suspense fallback={<section className="tdg-panel">Carregando seus painéis...</section>}><DashboardBuilderPage authHeaders={authHeaders} summary={dashboard} setToast={setToast} /></Suspense>}\n',
  '      {page === "dashboards" && <Suspense fallback={<section className="tdg-panel">Carregando seus painéis...</section>}><DashboardBuilderPage authHeaders={authHeaders} summary={dashboard} setToast={setToast} /></Suspense>}\n      {page === "metas" && <Suspense fallback={<section className="tdg-panel">Carregando metas...</section>}><GoalsPage authHeaders={authHeaders} setToast={setToast} /></Suspense>}\n',
  "renderização da página de metas",
);
write(verticalPath, vertical);

const corePath = "worker/services/todogreen-core.js";
let core = read(corePath);
core = replaceOnce(
  core,
  'import { resolveTodoGreenAccess } from "./todogreen-access.js";',
  'import { resolveTodoGreenAccess } from "./todogreen-access.js";\nimport { handleTodoGreenGoals } from "./todogreen-goals.js";',
  "importação do serviço de metas",
);
core = replaceOnce(
  core,
  '  const resource = url.pathname.split("/").filter(Boolean)[2] || "access";\n\n  if (request.method === "GET" && resource === "access")',
  '  const resource = url.pathname.split("/").filter(Boolean)[2] || "access";\n\n  if (resource === "goals") return handleTodoGreenGoals(request, env, user, access, url);\n\n  if (request.method === "GET" && resource === "access")',
  "rota da API de metas",
);
write(corePath, core);

const cssPath = "src/features/logistics/pages/TodoGreenPages.css";
let css = read(cssPath);
const marker = "/* ===== Metas To Do Green ===== */";
if (!css.includes(marker)) css += String.raw`

/* ===== Metas To Do Green ===== */
.tdg-goals-page { position: relative; }
.tdg-goal-summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
.tdg-goal-summary article { border: 1px solid #dbe5df; border-radius: 14px; background: #fff; padding: 15px; min-width: 0; }
.tdg-goal-summary span, .tdg-goal-summary small { display: block; color: #60716b; font-size: 12px; }
.tdg-goal-summary strong { display: block; color: #173b31; font-size: 25px; margin: 5px 0; }
.tdg-goal-filters { display: flex; gap: 12px; margin-bottom: 16px; }
.tdg-goal-filters label { min-width: 190px; }
.tdg-goal-filters label span { display: block; color: #50645d; font-size: 12px; font-weight: 700; margin-bottom: 5px; }
.tdg-goal-filters select { width: 100%; border: 1px solid #cad8d0; border-radius: 10px; background: #fff; padding: 10px 12px; }
.tdg-goals-layout { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 18px; align-items: start; }
.tdg-goal-list { display: grid; gap: 10px; max-height: 900px; overflow: auto; padding-right: 4px; }
.tdg-goal-card { width: 100%; border: 1px solid #d8e3dd; border-radius: 14px; background: #fff; color: #1b302a; padding: 14px; text-align: left; cursor: pointer; }
.tdg-goal-card:hover, .tdg-goal-card.selected { border-color: #17624f; box-shadow: 0 8px 22px rgba(25, 66, 54, .09); }
.tdg-goal-card-head, .tdg-goal-card footer, .tdg-goal-values { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.tdg-goal-card > strong { display: block; font-size: 15px; margin: 10px 0 12px; }
.tdg-goal-card-head small, .tdg-goal-card footer { color: #6b7c76; font-size: 11px; }
.tdg-goal-values span { color: #203a32; font-size: 13px; font-weight: 700; }
.tdg-goal-values small { display: block; color: #71817c; font-size: 10px; font-weight: 600; }
.tdg-goal-progress { height: 7px; overflow: hidden; background: #e7eee9; border-radius: 999px; margin: 12px 0; }
.tdg-goal-progress i { display: block; height: 100%; background: #17624f; border-radius: inherit; }
.tdg-goal-health { display: inline-flex; width: fit-content; border-radius: 999px; padding: 4px 8px; font-size: 10px; font-weight: 800; }
.health-on_track, .health-achieved, .health-exceeded { background: #e3f4eb; color: #17624f; }
.health-attention { background: #fff3cf; color: #765700; }
.health-critical, .health-blocked { background: #fde6e2; color: #9b2c20; }
.health-not_started, .health-closed { background: #edf0ee; color: #5e6c67; }
.tdg-goal-workspace { min-width: 0; }
.tdg-goal-placeholder, .tdg-goal-empty-state { border: 1px dashed #b9cbc1; border-radius: 16px; padding: 40px 24px; text-align: center; color: #63756e; }
.tdg-goal-placeholder strong, .tdg-goal-empty-state strong { display: block; color: #24443a; margin: 10px 0 4px; }
.tdg-goal-detail { border: 1px solid #d8e3dd; border-radius: 16px; background: #fff; padding: 20px; }
.tdg-goal-detail > header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
.tdg-goal-detail h3 { margin: 9px 0 5px; font-size: 23px; color: #153c30; }
.tdg-goal-detail p { color: #5d7069; }
.tdg-goal-detail-actions { display: flex; gap: 8px; }
.tdg-goal-detail-actions button { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #b9ccc2; border-radius: 10px; background: #fff; padding: 9px 11px; color: #244a3e; }
.tdg-goal-result-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 20px 0 12px; }
.tdg-goal-result-grid > div { border-radius: 12px; background: #f4f7f5; padding: 13px; }
.tdg-goal-result-grid span, .tdg-goal-result-grid small { display: block; color: #6b7b76; font-size: 11px; }
.tdg-goal-result-grid strong { display: block; color: #173d31; font-size: 18px; margin: 5px 0; }
.tdg-goal-meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0 0 20px; }
.tdg-goal-meta div { border-top: 1px solid #e5ebe7; padding-top: 10px; }
.tdg-goal-meta dt { display: flex; align-items: center; gap: 5px; color: #71817c; font-size: 11px; }
.tdg-goal-meta dd { margin: 4px 0 0; color: #263f37; font-size: 12px; }
.tdg-goal-detail-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.tdg-goal-detail-columns > section, .tdg-goal-checkin-form { border: 1px solid #e0e8e3; border-radius: 14px; padding: 15px; }
.tdg-goal-detail h4 { display: flex; align-items: center; gap: 7px; margin: 0 0 12px; color: #24453a; }
.tdg-goal-action { display: grid; grid-template-columns: 9px minmax(0, 1fr) auto; gap: 8px; align-items: center; border-top: 1px solid #edf1ee; padding: 10px 0; }
.tdg-goal-action > span { width: 8px; height: 8px; border-radius: 50%; background: #a8b5af; }
.tdg-goal-action .status-done { background: #23815f; }
.tdg-goal-action .status-blocked { background: #b63d31; }
.tdg-goal-action small { display: block; color: #73817c; font-size: 10px; }
.tdg-goal-action select { border: 1px solid #ccd8d2; border-radius: 8px; padding: 7px; max-width: 125px; }
.tdg-goal-checkin { border-top: 1px solid #edf1ee; padding: 10px 0; }
.tdg-goal-checkin strong, .tdg-goal-checkin small { display: block; }
.tdg-goal-checkin small { color: #7a8883; font-size: 10px; }
.tdg-goal-checkin p { margin: 6px 0; font-size: 12px; }
.tdg-goal-checkin span { display: flex; align-items: center; gap: 5px; color: #9b2c20; font-size: 11px; }
.tdg-goal-action-form, .tdg-goal-checkin-form { display: grid; gap: 10px; margin-top: 14px; }
.tdg-goal-action-form { border-top: 1px solid #e5ebe7; padding-top: 14px; }
.tdg-goal-action-form label span, .tdg-goal-checkin-form label span { display: block; color: #5f716a; font-size: 11px; font-weight: 700; margin-bottom: 4px; }
.tdg-goal-action-form input, .tdg-goal-action-form textarea, .tdg-goal-checkin-form input, .tdg-goal-checkin-form textarea { width: 100%; border: 1px solid #cbd8d1; border-radius: 9px; padding: 9px; }
.tdg-goal-action-form button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid #b8cbc1; border-radius: 9px; background: #fff; padding: 8px; color: #23483c; }
.tdg-goal-source-note { border-left: 3px solid #17624f; background: #f2f7f4; padding: 10px; font-size: 12px; }
.tdg-goal-history { margin-top: 16px; border-top: 1px solid #e0e8e3; padding-top: 12px; }
.tdg-goal-history summary { cursor: pointer; color: #315448; font-weight: 700; }
.tdg-goal-history > div { display: grid; grid-template-columns: 120px 1fr auto; gap: 8px; border-top: 1px solid #edf1ee; padding: 9px 0; font-size: 11px; }
.tdg-goal-history p { grid-column: 1 / -1; margin: 0; font-size: 11px; }
.tdg-goal-drawer { position: fixed; inset: 0; z-index: 80; display: flex; justify-content: flex-end; background: rgba(17, 31, 26, .42); }
.tdg-goal-drawer > form { width: min(680px, 96vw); height: 100%; overflow: auto; background: #fff; padding: 22px; box-shadow: -16px 0 38px rgba(20, 45, 36, .16); }
.tdg-goal-drawer header, .tdg-goal-drawer footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tdg-goal-drawer header { border-bottom: 1px solid #e1e8e4; padding-bottom: 14px; margin-bottom: 16px; }
.tdg-goal-drawer header span { color: #17624f; font-size: 10px; font-weight: 800; letter-spacing: .09em; }
.tdg-goal-drawer header h3 { margin: 4px 0 0; color: #173d31; }
.tdg-goal-drawer header button { border: 0; background: transparent; }
.tdg-goal-drawer label { display: block; margin-bottom: 12px; }
.tdg-goal-drawer label > span { display: block; color: #52665e; font-size: 11px; font-weight: 700; margin-bottom: 5px; }
.tdg-goal-drawer input, .tdg-goal-drawer select, .tdg-goal-drawer textarea { width: 100%; border: 1px solid #c9d6cf; border-radius: 10px; padding: 10px; }
.tdg-goal-drawer textarea { min-height: 80px; resize: vertical; }
.tdg-goal-drawer footer { border-top: 1px solid #e1e8e4; margin-top: 18px; padding-top: 14px; }
.tdg-goal-drawer footer > button:not(.tdg-action) { border: 0; background: transparent; color: #5e6f69; }
.tdg-goal-checkbox { display: flex !important; align-items: center; gap: 8px; }
.tdg-goal-checkbox input { width: auto; }
.tdg-goal-checkbox span { margin: 0 !important; }
.tdg-goal-empty { color: #7a8883; font-size: 12px; }
@media (max-width: 1100px) {
  .tdg-goal-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tdg-goals-layout { grid-template-columns: 1fr; }
  .tdg-goal-list { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: none; }
}
@media (max-width: 720px) {
  .tdg-goal-summary, .tdg-goal-result-grid, .tdg-goal-meta, .tdg-goal-detail-columns, .tdg-goal-list { grid-template-columns: 1fr; }
  .tdg-goal-filters, .tdg-goal-detail > header { display: grid; }
  .tdg-goal-filters label { min-width: 0; }
}
`;
write(cssPath, css);

console.log("Módulo de Metas integrado ao catálogo, à rota, às permissões e ao layout.");
