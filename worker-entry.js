import appWorker from "./worker.js";
import { handleTodoGreenWorkCenter } from "./worker/services/todogreen-work-center.js";
import { handleTodoGreenFleet } from "./worker/services/todogreen-fleet.js";
import { handleTodoGreenCustomerPortal } from "./worker/services/todogreen-customer-portal.js";
import { handleTodoGreenEsg } from "./worker/services/todogreen-esg.js";
import { handleTodoGreenPricingParameters } from "./worker/services/todogreen-pricing-parameters.js";
import { handleTodoGreenClients } from "./worker/services/todogreen-customer-portal.js";
import {
  authenticatedUser as todoGreenUser,
  resolveAccess as todoGreenAccess,
} from "./worker/services/todogreen-work-center.js";

const apiError = (message) => new Response(JSON.stringify({ error: message }), {
  status: 500,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/todogreen/work-center")) {
      try { return await handleTodoGreenWorkCenter(request, env); }
      catch (error) { console.error("To Do Green work center error", error); return apiError("Não foi possível sincronizar a Central de Trabalho."); }
    }
    // O portal vem antes da vertical: quem é do lado do cliente não passa pelo
    // resolvedor de acesso interno em momento nenhum.
    if (url.pathname.startsWith("/api/todogreen/portal")) {
      try { return await handleTodoGreenCustomerPortal(request, env); }
      catch (error) { console.error("To Do Green customer portal error", error); return apiError("Não foi possível abrir o portal do cliente."); }
    }
    // Cadastro de clientes e liberação de quem entra em cada sala. É do lado
    // interno, então passa pelo mesmo resolvedor de acesso da vertical.
    if (url.pathname.startsWith("/api/todogreen/clients")) {
      try {
        const user = await todoGreenUser(request, env);
        if (!user)
          return new Response(JSON.stringify({ error: "Sessão inválida." }), {
            status: 401,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        const access = await todoGreenAccess(env, user, url.searchParams.get("owner"));
        if (!access)
          return new Response(
            JSON.stringify({ error: "Você não tem acesso à To Do Green." }),
            { status: 403, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        return await handleTodoGreenClients(request, env, access, user);
      } catch (error) {
        console.error("To Do Green clients error", error);
        return apiError("Não foi possível carregar os clientes.");
      }
    }
    if (url.pathname.startsWith("/api/todogreen/pricing-parameters")) {
      try { return await handleTodoGreenPricingParameters(request, env); }
      catch (error) { console.error("To Do Green pricing parameters error", error); return apiError("Não foi possível carregar a régua comercial."); }
    }
    if (url.pathname.startsWith("/api/todogreen/esg")) {
      try { return await handleTodoGreenEsg(request, env); }
      catch (error) { console.error("To Do Green ESG error", error); return apiError("Não foi possível processar o cálculo ambiental."); }
    }
    if (url.pathname.startsWith("/api/todogreen/fleet")) {
      try { return await handleTodoGreenFleet(request, env); }
      catch (error) { console.error("To Do Green fleet error", error); return apiError("Não foi possível sincronizar a Frota."); }
    }
    return appWorker.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof appWorker.scheduled === "function") return appWorker.scheduled(controller, env, ctx);
  },
};
