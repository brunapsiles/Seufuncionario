import { configuredAiProviders, probeAiProvider } from "./ai.js";
import { podeNaVertical } from "./todogreen-access.js";
import { webSearchConfiguration } from "./web-search.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const nativeAutomations = (env) => {
  const configured = Boolean(env.DB);
  return [
    {
      id: "cloudflare-cron",
      name: "Agendamentos da Cloudflare",
      configured,
      detail: "Execução automática a cada hora.",
    },
    {
      id: "tasks-reminders",
      name: "Tarefas e lembretes automáticos",
      configured,
      detail: "Executados no Worker e registrados no D1.",
    },
    {
      id: "custom-workflow-rules",
      name: "Regras configuráveis da Central",
      configured,
      detail: "Gatilhos, condições e ações definidos pela equipe e executados no servidor.",
    },
    {
      id: "weekly-summary",
      name: "Resumo semanal",
      configured,
      detail: "Processado toda segunda-feira pela infraestrutura da plataforma.",
    },
  ];
};

const messagingIntegrations = (env = {}) => {
  const baseUrl = String(env.EVOLUTION_API_BASE_URL || "").trim();
  let validUrl = false;
  try {
    validUrl = ["http:", "https:"].includes(new URL(baseUrl).protocol);
  } catch {
    validUrl = false;
  }
  const configured = Boolean(
    validUrl && env.EVOLUTION_API_KEY && env.EVOLUTION_INSTANCE,
  );
  return [
    {
      id: "evolution-api",
      name: "Evolution API",
      configured,
      detail: configured
        ? "Credenciais da instância cadastradas para envio pelo CRM."
        : "Conector pronto. Requer URL, chave e nome da instância conectada.",
    },
  ];
};

export function todoGreenIntegrationStatus(env = {}) {
  const search = webSearchConfiguration(env);
  return {
    ai: configuredAiProviders(env),
    search: {
      configured: search.configured,
      providers: Object.entries(search.providers).map(([id, configured]) => ({ id, configured })),
    },
    automation: nativeAutomations(env),
    messaging: messagingIntegrations(env),
    automationEngine: {
      id: "cloudflare-native",
      name: "Cloudflare Worker + Cron + D1",
      configured: Boolean(env.DB),
      requiresExternalServer: false,
    },
    exclusions: [
      { id: "whisper", name: "Transcrição Whisper", reason: "Não faz parte da jornada da vertical." },
      { id: "image-generation", name: "Geração de imagens", reason: "Não faz parte da jornada da vertical." },
    ],
  };
}

export async function handleTodoGreenIntegrations(request, env, access) {
  if (request.method === "GET") return json(todoGreenIntegrationStatus(env));
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!podeNaVertical(access, "integration:manage"))
    return json({ error: "Seu papel não pode testar integrações." }, 403);
  const body = await request.json().catch(() => ({}));
  const provider = String(body.provider || "").trim().slice(0, 40);
  try {
    return json({ test: await probeAiProvider(env, provider), checkedAt: new Date().toISOString() });
  } catch (error) {
    return json({ error: String(error?.message || "Falha no teste do provedor").slice(0, 180), provider }, 502);
  }
}
