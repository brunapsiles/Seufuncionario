import { exigirAcessoTodoGreen } from "./todogreen-access.js";

const MAX_PREVIEW_BYTES = 1_000_000;
const MAX_PREVIEW_ITEMS = 5;
const MAX_PATHS = 160;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const clean = (value, max = 500) => String(value || "").trim().slice(0, max);

const valueAt = (source, path, fallback = undefined) => {
  if (!path) return source;
  const value = String(path)
    .split(".")
    .filter(Boolean)
    .reduce(
      (current, key) =>
        current && Object.prototype.hasOwnProperty.call(current, key)
          ? current[key]
          : undefined,
      source,
    );
  return value === undefined ? fallback : value;
};

const boundedLimit = (url, fallback, max) => {
  const requested = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(requested) || requested <= 0) return fallback;
  return Math.min(max, Math.trunc(requested));
};

async function integrationForOwner(env, ownerId) {
  return env.DB.prepare(
    `SELECT * FROM todogreen_tracker_integrations
      WHERE workspace_owner_id = ?
        AND provider = 'sistemas_tracker'
        AND archived_at IS NULL
      LIMIT 1`,
  )
    .bind(ownerId)
    .first();
}

const credentialStatus = (integration, env) => ({
  api: Boolean(integration?.token_env_key && env[integration.token_env_key]),
  webhook: Boolean(
    integration?.webhook_secret_env_key && env[integration.webhook_secret_env_key],
  ),
});

const safeIntegrationHealth = (integration, env) => {
  if (!integration) {
    return {
      configured: false,
      status: "not_configured",
      syncMode: "",
      apiSecretConfigured: false,
      webhookSecretConfigured: false,
      lastTestAt: "",
      lastSyncAt: "",
      lastSuccessAt: "",
      lastError: "",
      nextExpectedSyncAt: "",
      stale: false,
    };
  }

  const credentials = credentialStatus(integration, env);
  const intervalMinutes = Math.max(
    60,
    Number(integration.polling_interval_minutes) || 60,
  );
  const lastSuccess = integration.last_success_at
    ? new Date(integration.last_success_at).getTime()
    : NaN;
  const nextExpected = Number.isFinite(lastSuccess)
    ? new Date(lastSuccess + intervalMinutes * 60_000).toISOString()
    : "";
  const staleThreshold = Math.max(intervalMinutes * 2, 120) * 60_000;
  const stale =
    integration.sync_mode === "polling" &&
    Number.isFinite(lastSuccess) &&
    Date.now() - lastSuccess > staleThreshold;

  return {
    configured: true,
    status: integration.status,
    syncMode: integration.sync_mode,
    pollingIntervalMinutes: intervalMinutes,
    apiSecretConfigured: credentials.api,
    webhookSecretConfigured: credentials.webhook,
    lastTestAt: integration.last_test_at || "",
    lastSyncAt: integration.last_sync_at || "",
    lastSuccessAt: integration.last_success_at || "",
    lastError: integration.last_error || "",
    nextExpectedSyncAt: nextExpected,
    stale,
  };
};

async function health(env, ownerId) {
  const integration = await integrationForOwner(env, ownerId);
  const base = safeIntegrationHealth(integration, env);
  if (!integration) {
    return {
      ...base,
      counts: { vehicles: 0, positions: 0, events: 0, syncRuns: 0 },
    };
  }

  const counts = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM todogreen_tracker_vehicle_links
         WHERE workspace_owner_id = ? AND integration_id = ? AND active = 1) AS vehicles,
       (SELECT COUNT(*) FROM todogreen_tracker_positions
         WHERE workspace_owner_id = ? AND integration_id = ?) AS positions,
       (SELECT COUNT(*) FROM todogreen_tracker_events
         WHERE workspace_owner_id = ? AND integration_id = ?) AS events,
       (SELECT COUNT(*) FROM todogreen_tracker_sync_runs
         WHERE workspace_owner_id = ? AND integration_id = ?) AS sync_runs`,
  )
    .bind(
      ownerId,
      integration.id,
      ownerId,
      integration.id,
      ownerId,
      integration.id,
      ownerId,
      integration.id,
    )
    .first();

  return {
    ...base,
    counts: {
      vehicles: Number(counts?.vehicles || 0),
      positions: Number(counts?.positions || 0),
      events: Number(counts?.events || 0),
      syncRuns: Number(counts?.sync_runs || 0),
    },
  };
}

async function listRuns(env, ownerId, integrationId, limit) {
  if (!integrationId) return [];
  const result = await env.DB.prepare(
    `SELECT id, trigger_type, status, imported_count, updated_count, ignored_count,
            error_count, error_message, started_at, finished_at
       FROM todogreen_tracker_sync_runs
      WHERE workspace_owner_id = ? AND integration_id = ?
      ORDER BY started_at DESC
      LIMIT ?`,
  )
    .bind(ownerId, integrationId, limit)
    .all();

  return (result.results || []).map((row) => ({
    id: row.id,
    triggerType: row.trigger_type,
    status: row.status,
    importedCount: Number(row.imported_count || 0),
    updatedCount: Number(row.updated_count || 0),
    ignoredCount: Number(row.ignored_count || 0),
    errorCount: Number(row.error_count || 0),
    errorMessage: row.error_message || "",
    startedAt: row.started_at,
    finishedAt: row.finished_at || "",
  }));
}

async function listEvents(env, ownerId, integrationId, limit) {
  if (!integrationId) return [];
  const result = await env.DB.prepare(
    `SELECT e.id, e.external_vehicle_id, e.provider_event_id, e.event_type,
            e.severity, e.title, e.latitude, e.longitude, e.occurred_at,
            l.plate, l.display_name
       FROM todogreen_tracker_events e
       LEFT JOIN todogreen_tracker_vehicle_links l ON l.id = e.vehicle_link_id
      WHERE e.workspace_owner_id = ? AND e.integration_id = ?
      ORDER BY e.occurred_at DESC
      LIMIT ?`,
  )
    .bind(ownerId, integrationId, limit)
    .all();

  return (result.results || []).map((row) => ({
    id: row.id,
    externalVehicleId: row.external_vehicle_id,
    providerEventId: row.provider_event_id || "",
    eventType: row.event_type,
    severity: row.severity,
    title: row.title || row.event_type,
    latitude: row.latitude,
    longitude: row.longitude,
    occurredAt: row.occurred_at,
    plate: row.plate || "",
    vehicleName: row.display_name || "",
  }));
}

const collectPaths = (value, prefix = "", depth = 0, output = new Set()) => {
  if (depth > 4 || output.size >= MAX_PATHS || value === null || value === undefined)
    return output;

  if (Array.isArray(value)) {
    for (const item of value.slice(0, MAX_PREVIEW_ITEMS)) {
      collectPaths(item, prefix, depth + 1, output);
      if (output.size >= MAX_PATHS) break;
    }
    return output;
  }

  if (typeof value !== "object") return output;

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    output.add(path);
    if (child && typeof child === "object") collectPaths(child, path, depth + 1, output);
    if (output.size >= MAX_PATHS) break;
  }
  return output;
};

const COMMON_COLLECTION_PATHS = [
  "data.vehicles",
  "data.positions",
  "data.items",
  "vehicles",
  "positions",
  "items",
  "data",
];

const locateCollection = (payload, requestedPath) => {
  if (requestedPath) {
    const requested = valueAt(payload, requestedPath);
    return {
      path: requestedPath,
      value: Array.isArray(requested) ? requested : null,
    };
  }
  if (Array.isArray(payload)) return { path: "", value: payload };
  for (const path of COMMON_COLLECTION_PATHS) {
    const value = valueAt(payload, path);
    if (Array.isArray(value)) return { path, value };
  }
  return { path: "", value: null };
};

const FIELD_HINTS = {
  id: [/^id$/i, /vehicle.*id/i, /external.*id/i, /codigo/i],
  imei: [/imei/i, /device.*id/i],
  plate: [/plate/i, /placa/i, /license/i],
  latitude: [/latitude/i, /(^|\.)lat$/i],
  longitude: [/longitude/i, /(^|\.)(lng|lon|long)$/i],
  speed: [/speed/i, /veloc/i],
  ignition: [/ignition/i, /ignicao/i, /ignição/i],
  odometer: [/odometer/i, /hodometro/i, /hodômetro/i, /mileage/i],
  recordedAt: [/recorded.*at/i, /timestamp/i, /position.*time/i, /data.*hora/i, /datetime/i],
  eventType: [/event.*type/i, /tipo.*evento/i, /alert.*type/i],
};

const suggestFields = (paths) => {
  const suggestions = {};
  for (const [field, patterns] of Object.entries(FIELD_HINTS)) {
    suggestions[field] =
      paths.find((path) => patterns.some((pattern) => pattern.test(path))) || "";
  }
  return suggestions;
};

async function previewPayload(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_PREVIEW_BYTES)
    return json({ error: "A amostra excede 1 MB." }, 413);

  const raw = await request.text();
  if (raw.length > MAX_PREVIEW_BYTES)
    return json({ error: "A amostra excede 1 MB." }, 413);

  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return json({ error: "Envie uma amostra JSON válida." }, 400);
  }

  const payload = body?.payload;
  if (payload === undefined)
    return json({ error: "Informe o JSON recebido no campo payload." }, 400);

  const requestedPath = clean(body.collectionPath, 160);
  const located = locateCollection(payload, requestedPath);
  if (!located.value) {
    return json(
      {
        ok: false,
        collectionFound: false,
        collectionPath: requestedPath,
        itemsFound: 0,
        availableTopLevelKeys:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? Object.keys(payload).slice(0, 80)
            : [],
      },
      422,
    );
  }

  const sample = located.value.slice(0, MAX_PREVIEW_ITEMS);
  const paths = [...collectPaths(sample)].sort();
  return json({
    ok: true,
    collectionFound: true,
    collectionPath: located.path,
    itemsFound: located.value.length,
    inspectedItems: sample.length,
    fieldPaths: paths,
    suggestedFieldMap: suggestFields(paths),
    note: "A amostra foi analisada em memória e não foi gravada no banco.",
  });
}

export async function handleTodoGreenTrackerReadiness(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/todogreen/tracker/")) return null;
  const action = url.pathname.split("/").filter(Boolean)[3] || "";
  if (!["health", "runs", "events", "preview"].includes(action)) return null;

  const resolved = await exigirAcessoTodoGreen(request, env);
  if (resolved.response) return resolved.response;
  const { access } = resolved;
  const integration = await integrationForOwner(env, access.ownerId);

  if (request.method === "GET" && action === "health") {
    return json(await health(env, access.ownerId));
  }

  if (request.method === "GET" && action === "runs") {
    const limit = boundedLimit(url, 20, 100);
    return json({
      runs: await listRuns(env, access.ownerId, integration?.id, limit),
    });
  }

  if (request.method === "GET" && action === "events") {
    const limit = boundedLimit(url, 50, 200);
    return json({
      events: await listEvents(env, access.ownerId, integration?.id, limit),
    });
  }

  if (request.method === "POST" && action === "preview") {
    return previewPayload(request);
  }

  return json({ error: "Método não permitido." }, 405);
}
