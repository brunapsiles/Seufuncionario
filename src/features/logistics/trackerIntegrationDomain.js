export const TRACKER_DEFAULT_CONFIG = {
  name: "Sistemas Tracker",
  baseUrl: "",
  externalAccountId: "",
  authMode: "bearer",
  tokenEnvKey: "TODOGREEN_TRACKER_API_TOKEN",
  webhookSecretEnvKey: "TODOGREEN_TRACKER_WEBHOOK_SECRET",
  syncMode: "manual",
  pollingIntervalMinutes: 60,
  providerConfig: {
    vehiclesPath: "",
    collectionPath: "",
    webhookCollectionPath: "",
    authHeaderName: "x-api-key",
    fieldMap: {
      id: "id",
      imei: "imei",
      plate: "plate",
      name: "name",
      latitude: "latitude",
      longitude: "longitude",
      speed: "speed",
      heading: "heading",
      ignition: "ignition",
      odometer: "odometer",
      address: "address",
      recordedAt: "recordedAt",
      eventId: "eventId",
      eventType: "eventType",
      severity: "severity",
      title: "title",
    },
    webhookFieldMap: {},
  },
};

export function normalizeTrackerConfig(config = {}) {
  return {
    ...TRACKER_DEFAULT_CONFIG,
    ...config,
    pollingIntervalMinutes: Math.min(
      1440,
      Math.max(60, Number(config.pollingIntervalMinutes) || 60),
    ),
    readOnly: true,
    providerConfig: {
      ...TRACKER_DEFAULT_CONFIG.providerConfig,
      ...(config.providerConfig || {}),
      fieldMap: {
        ...TRACKER_DEFAULT_CONFIG.providerConfig.fieldMap,
        ...(config.providerConfig?.fieldMap || {}),
      },
      webhookFieldMap: {
        ...TRACKER_DEFAULT_CONFIG.providerConfig.fieldMap,
        ...(config.providerConfig?.fieldMap || {}),
        ...(config.providerConfig?.webhookFieldMap || {}),
      },
    },
  };
}

export function trackerStatusLabel(status) {
  return {
    draft: "Configuração incompleta",
    ready: "Pronta para testar",
    active: "Conectada",
    error: "Requer atenção",
  }[status] || "Não configurada";
}

export function trackerRequirements(config, requirements = {}) {
  const normalized = normalizeTrackerConfig(config || {});
  return [
    {
      id: "documentation",
      label: "URL e endpoint da API",
      ready: Boolean(normalized.baseUrl && normalized.providerConfig.vehiclesPath),
    },
    {
      id: "api-secret",
      label: `Segredo ${normalized.tokenEnvKey}`,
      ready: !requirements.apiSecret,
    },
    {
      id: "webhook-secret",
      label: `Segredo ${normalized.webhookSecretEnvKey}`,
      ready: !requirements.webhookSecret,
      optional: normalized.syncMode !== "webhook",
    },
  ];
}

export function trackerOperationalSummary(summary = {}) {
  return {
    linkedVehicles: Math.max(0, Number(summary.linkedVehicles) || 0),
    positions: Math.max(0, Number(summary.positions) || 0),
    events: Math.max(0, Number(summary.events) || 0),
    latestPositionAt: summary.latestPositionAt || "",
  };
}

export function trackerVehicleState(vehicle = {}, now = Date.now()) {
  if (!vehicle.position?.recordedAt) return "Sem posição";
  const age = now - new Date(vehicle.position.recordedAt).getTime();
  if (!Number.isFinite(age)) return "Horário inválido";
  if (age > 24 * 60 * 60 * 1000) return "Sem comunicação";
  if (age > 2 * 60 * 60 * 1000) return "Posição antiga";
  if (vehicle.position.ignition === false) return "Desligado";
  if (Number(vehicle.position.speedKmh || 0) > 2) return "Em movimento";
  return "Parado";
}
