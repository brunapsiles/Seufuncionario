import appWorker from "./worker.js";
import { handleTodoGreenWorkCenter } from "./worker/services/todogreen-work-center.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/todogreen/work-center")) {
      try {
        return await handleTodoGreenWorkCenter(request, env);
      } catch (error) {
        console.error("To Do Green work center error", error);
        return new Response(
          JSON.stringify({ error: "Não foi possível sincronizar a Central de Trabalho." }),
          {
            status: 500,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      }
    }
    return appWorker.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof appWorker.scheduled === "function")
      return appWorker.scheduled(controller, env, ctx);
  },
};
