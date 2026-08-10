import { handleTodoGreenWorkCenter } from "./todogreen-work-center.js";
import { exigirAcessoTodoGreen } from "./todogreen-access.js";
import { handleTodoGreenFleet } from "./todogreen-fleet.js";
import { handleTodoGreenTracker } from "./todogreen-tracker.js";
import {
  handleTodoGreenCustomerPortal,
  handleTodoGreenClients,
  handleTodoGreenClientAssignments,
} from "./todogreen-customer-portal.js";
import { handleTodoGreenEsg } from "./todogreen-esg.js";
import { handleTodoGreenPricingParameters } from "./todogreen-pricing-parameters.js";
import { handleTodoGreenDashboards } from "./todogreen-dashboards.js";
import { handleTodoGreenRequests } from "./todogreen-requests.js";
import { handleTodoGreenVerticalRecords } from "./todogreen-vertical-records.js";
import { handleTodoGreenDealDesk } from "./todogreen-deal-desk.js";
import { entregarArquivo, handleTodoGreenEvidences } from "./todogreen-evidences.js";
import { handleTodoGreenClientIntelligence } from "./todogreen-client-intelligence.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const guarded = async (label, message, handler) => {
  try { return await handler(); }
  catch (error) {
    console.error(label, error);
    return json({ error: message }, 500);
  }
};

// A porta é uma só, em todogreen-access.js. Antes cada serviço repetia estes
// dois passos — e a repetição é o que deixou passar o acesso por domínio e o
// espaço de trabalho vindo da query string.
const internalAccess = (request, env) => exigirAcessoTodoGreen(request, env);

export async function routeTodoGreenApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/todogreen/")) return null;

  // O download em si não passa pela porta de sessão: quem autoriza é a
  // concessão temporária, que já carrega o cliente e o espaço para os quais foi
  // emitida. Exigir sessão aqui quebraria o link aberto em outra aba ou num
  // gerenciador de download, sem ganhar segurança — o token é a credencial.
  if (path === "/api/todogreen/arquivo") {
    return guarded("To Do Green document error", "Não foi possível entregar o documento.", () =>
      entregarArquivo(env, url.searchParams.get("t") || ""),
    );
  }

  if (path.startsWith("/api/todogreen/evidencias")) {
    return guarded("To Do Green evidences error", "Não foi possível carregar os documentos.", async () => {
      const resolved = await internalAccess(request, env);
      if (resolved.response) return resolved.response;
      return handleTodoGreenEvidences(request, env, resolved.access, resolved.user);
    });
  }

  if (path.startsWith("/api/todogreen/portal"))
    return guarded("To Do Green customer portal error", "Não foi possível abrir o portal do cliente.",
      () => handleTodoGreenCustomerPortal(request, env));
  if (path.startsWith("/api/todogreen/work-center"))
    return guarded("To Do Green work center error", "Não foi possível sincronizar a Central de Trabalho.",
      () => handleTodoGreenWorkCenter(request, env));
  if (path.startsWith("/api/todogreen/pricing-parameters"))
    return guarded("To Do Green pricing parameters error", "Não foi possível carregar os parâmetros comerciais.",
      () => handleTodoGreenPricingParameters(request, env));
  if (path.startsWith("/api/todogreen/dashboards"))
    return guarded("To Do Green dashboards error", "Não foi possível carregar os painéis.",
      () => handleTodoGreenDashboards(request, env));
  if (path.startsWith("/api/todogreen/esg"))
    return guarded("To Do Green ESG error", "Não foi possível processar o cálculo ambiental.",
      () => handleTodoGreenEsg(request, env));
  if (path.startsWith("/api/todogreen/tracker"))
    return guarded("To Do Green Tracker error", "Não foi possível processar o rastreamento veicular.",
      () => handleTodoGreenTracker(request, env));
  if (path.startsWith("/api/todogreen/fleet")) {
    return guarded("To Do Green fleet error", "Não foi possível sincronizar a frota.", async () => {
      const resolved = await internalAccess(request, env);
      if (resolved.response) return resolved.response;
      return handleTodoGreenFleet(request, env, resolved.access, resolved.user);
    });
  }

  if (path.startsWith("/api/todogreen/deal-desk")) {
    return guarded("To Do Green deal desk error", "Não foi possível processar a aprovação comercial.", async () => {
      const resolved = await internalAccess(request, env);
      if (resolved.response) return resolved.response;
      return handleTodoGreenDealDesk(request, env, resolved.access, resolved.user);
    });
  }

  if (path.startsWith("/api/todogreen/records")) {
    return guarded("To Do Green records error", "Não foi possível carregar os registros da vertical.", async () => {
      const resolved = await internalAccess(request, env);
      if (resolved.response) return resolved.response;
      return handleTodoGreenVerticalRecords(request, env, resolved.access, resolved.user);
    });
  }

  if (path.startsWith("/api/todogreen/requests")) {
    return guarded("To Do Green requests error", "Não foi possível carregar as solicitações.", async () => {
      const resolved = await internalAccess(request, env);
      if (resolved.response) return resolved.response;
      return handleTodoGreenRequests(request, env, resolved.access, resolved.user);
    });
  }

  if (path.startsWith("/api/todogreen/clients") || path.startsWith("/api/todogreen/client-assignments")) {
    return guarded("To Do Green clients error", "Não foi possível carregar os clientes.", async () => {
      const resolved = await internalAccess(request, env);
      if (resolved.response) return resolved.response;
      return path.startsWith("/api/todogreen/client-assignments")
        ? handleTodoGreenClientAssignments(request, env, resolved.access, resolved.user)
        : handleTodoGreenClients(request, env, resolved.access, resolved.user);
    });
  }

  if (path.startsWith("/api/todogreen/client-intelligence")) {
    return guarded("To Do Green client intelligence error", "Não foi possível pesquisar a empresa.", async () => {
      const resolved = await internalAccess(request, env);
      if (resolved.response) return resolved.response;
      return handleTodoGreenClientIntelligence(request, env, resolved.access, resolved.user);
    });
  }

  return null;
}
