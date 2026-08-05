import { handleTodoGreenWorkCenter, authenticatedUser, resolveAccess } from "./todogreen-work-center.js";
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

const internalAccess = async (request, env, url) => {
  const user = await authenticatedUser(request, env);
  if (!user) return { response: json({ error: "Sessão inválida." }, 401) };
  const access = await resolveAccess(env, user, url.searchParams.get("owner"));
  if (!access) return { response: json({ error: "Você não tem acesso à To Do Green." }, 403) };
  return { user, access };
};

export async function routeTodoGreenApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/todogreen/")) return null;

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
  if (path.startsWith("/api/todogreen/fleet"))
    return guarded("To Do Green fleet error", "Não foi possível sincronizar a frota.",
      () => handleTodoGreenFleet(request, env));

  if (path.startsWith("/api/todogreen/clients") || path.startsWith("/api/todogreen/client-assignments")) {
    return guarded("To Do Green clients error", "Não foi possível carregar os clientes.", async () => {
      const resolved = await internalAccess(request, env, url);
      if (resolved.response) return resolved.response;
      return path.startsWith("/api/todogreen/client-assignments")
        ? handleTodoGreenClientAssignments(request, env, resolved.access, resolved.user)
        : handleTodoGreenClients(request, env, resolved.access, resolved.user);
    });
  }

  return null;
}
