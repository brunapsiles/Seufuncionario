import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../worker-entry.js";

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createUser(id, email) {
  const token = `tracker-readiness-${id}`;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, 'hash', 'salt', ?)`,
  ).bind(id, `Pessoa ${id}`, email, now).run();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, '2099-01-01T00:00:00.000Z', ?)`,
  ).bind(`session-${id}`, id, await sha256(token), now).run();
  await env.DB.prepare(
    `INSERT INTO todogreen_access_emails
      (id, tenant_id, email, role, status, permissions_json, note, created_by, created_at, updated_at)
     VALUES (?, 'todogreen', ?, 'operations', 'active', '["read","fleet:manage","integration:manage"]', '', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), email, id, now, now).run();
  return { id, email, token };
}

const request = (path, { method = "GET", token, body } = {}) => {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(
    new Request(`https://app.test${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
    { waitUntil() {}, passThroughOnException() {} },
  );
};

let manager;
let integrationId;

beforeAll(async () => {
  manager = await createUser(
    "tracker-readiness-manager",
    "tracker.readiness@todogreen.com.br",
  );
});

describe("prontidão da integração Tracker", () => {
  it("protege os endpoints de diagnóstico com sessão", async () => {
    expect((await request("/api/todogreen/tracker/health")).status).toBe(401);
    expect((await request("/api/todogreen/tracker/runs")).status).toBe(401);
    expect((await request("/api/todogreen/tracker/events")).status).toBe(401);
    expect(
      (await request("/api/todogreen/tracker/preview", {
        method: "POST",
        body: { payload: [] },
      })).status,
    ).toBe(401);
  });

  it("informa saúde vazia sem inventar conexão ou dados", async () => {
    const response = await request("/api/todogreen/tracker/health", {
      token: manager.token,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
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
      counts: { vehicles: 0, positions: 0, events: 0, syncRuns: 0 },
    });
  });

  it("analisa a estrutura de uma amostra sem devolver os valores recebidos", async () => {
    const response = await request("/api/todogreen/tracker/preview", {
      method: "POST",
      token: manager.token,
      body: {
        payload: {
          data: {
            vehicles: [
              {
                vehicle: { id: "veiculo-secreto-123" },
                placa: "ABC1D23",
                location: { latitude: -23.5, longitude: -46.6 },
                velocidade: 42,
                ignicao: true,
                timestamp: "2026-08-11T12:00:00-03:00",
              },
            ],
          },
        },
      },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.collectionPath).toBe("data.vehicles");
    expect(data.itemsFound).toBe(1);
    expect(data.fieldPaths).toContain("vehicle.id");
    expect(data.fieldPaths).toContain("location.latitude");
    expect(data.suggestedFieldMap.plate).toBe("placa");
    expect(data.suggestedFieldMap.latitude).toBe("location.latitude");
    expect(JSON.stringify(data)).not.toContain("veiculo-secreto-123");
    expect(JSON.stringify(data)).not.toContain("ABC1D23");
  });

  it("expõe somente o estado das credenciais, nunca os segredos", async () => {
    const configured = await request("/api/todogreen/tracker/config", {
      method: "PUT",
      token: manager.token,
      body: {
        name: "Sistemas Tracker",
        baseUrl: "https://tracker.example.com/api/",
        externalAccountId: "conta-readiness",
        authMode: "bearer",
        tokenEnvKey: "TODOGREEN_TRACKER_API_TOKEN",
        webhookSecretEnvKey: "TODOGREEN_TRACKER_WEBHOOK_SECRET",
        syncMode: "polling",
        pollingIntervalMinutes: 60,
        providerConfig: {
          vehiclesPath: "v1/positions",
          collectionPath: "data.vehicles",
        },
      },
    });
    expect(configured.status).toBe(201);
    const configuredData = await configured.json();
    integrationId = configuredData.integration.id;

    const response = await request("/api/todogreen/tracker/health", {
      token: manager.token,
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.configured).toBe(true);
    expect(data.syncMode).toBe("polling");
    expect(data.apiSecretConfigured).toBe(false);
    expect(data.webhookSecretConfigured).toBe(false);
    expect(JSON.stringify(data)).not.toContain("TODOGREEN_TRACKER_API_TOKEN");
    expect(JSON.stringify(data)).not.toContain("TODOGREEN_TRACKER_WEBHOOK_SECRET");
  });

  it("lista histórico de sincronização e eventos sem expor payload bruto", async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO todogreen_tracker_sync_runs
       (id, integration_id, workspace_owner_id, trigger_type, status,
        imported_count, updated_count, ignored_count, error_count, cursor_value,
        error_message, started_at, finished_at)
       VALUES (?, ?, ?, 'manual', 'success', 3, 1, 2, 0, '', '', ?, ?)`,
    ).bind(
      "tracker-readiness-run",
      integrationId,
      manager.id,
      now,
      now,
    ).run();

    await env.DB.prepare(
      `INSERT INTO todogreen_tracker_events
       (id, integration_id, workspace_owner_id, vehicle_link_id, vehicle_id,
        external_vehicle_id, provider_event_id, event_type, severity, title,
        latitude, longitude, occurred_at, payload_json, created_at)
       VALUES (?, ?, ?, NULL, NULL, 'external-1', 'evt-1', 'overspeed', 'warning',
               'Excesso de velocidade', -23.5, -46.6, ?, ?, ?)`,
    ).bind(
      "tracker-readiness-event",
      integrationId,
      manager.id,
      now,
      JSON.stringify({ segredoOperacional: "não deve sair" }),
      now,
    ).run();

    const runsResponse = await request("/api/todogreen/tracker/runs", {
      token: manager.token,
    });
    expect(runsResponse.status).toBe(200);
    const runs = (await runsResponse.json()).runs;
    expect(runs[0]).toMatchObject({
      id: "tracker-readiness-run",
      status: "success",
      importedCount: 3,
      updatedCount: 1,
      ignoredCount: 2,
    });

    const eventsResponse = await request("/api/todogreen/tracker/events", {
      token: manager.token,
    });
    expect(eventsResponse.status).toBe(200);
    const eventsData = await eventsResponse.json();
    expect(eventsData.events[0]).toMatchObject({
      id: "tracker-readiness-event",
      eventType: "overspeed",
      severity: "warning",
      title: "Excesso de velocidade",
    });
    expect(JSON.stringify(eventsData)).not.toContain("segredoOperacional");
    expect(JSON.stringify(eventsData)).not.toContain("não deve sair");
  });
});
