import appWorker from "./worker.js";
import {
  runTodoGreenTrackerScheduled,
} from "./worker/services/todogreen-tracker.js";
import { routeTodoGreenApi } from "./worker/services/todogreen-router.js";

export default {
  async fetch(request, env, ctx) {
    const todoGreenResponse = await routeTodoGreenApi(request, env);
    if (todoGreenResponse) return todoGreenResponse;
    return appWorker.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runTodoGreenTrackerScheduled(env));
    if (typeof appWorker.scheduled === "function") return appWorker.scheduled(controller, env, ctx);
  },
};
