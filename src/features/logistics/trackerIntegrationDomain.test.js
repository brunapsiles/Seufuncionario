import { describe, expect, it } from "vitest";
import {
  normalizeTrackerConfig,
  trackerOperationalSummary,
  trackerRequirements,
  trackerStatusLabel,
  trackerVehicleState,
} from "./trackerIntegrationDomain.js";

describe("integração de rastreamento", () => {
  it("mantém o modo somente leitura e os nomes seguros dos segredos", () => {
    const config = normalizeTrackerConfig({
      readOnly: false,
      pollingIntervalMinutes: 5,
    });
    expect(config.readOnly).toBe(true);
    expect(config.pollingIntervalMinutes).toBe(60);
    expect(config.tokenEnvKey).toBe("TODOGREEN_TRACKER_API_TOKEN");
    expect(config.webhookSecretEnvKey).toBe("TODOGREEN_TRACKER_WEBHOOK_SECRET");
  });

  it("só considera a documentação pronta com URL e endpoint", () => {
    const pending = trackerRequirements({ baseUrl: "https://api.example.com" }, {
      apiSecret: true,
      webhookSecret: true,
    });
    expect(pending.find((item) => item.id === "documentation").ready).toBe(false);

    const ready = trackerRequirements({
      baseUrl: "https://api.example.com",
      providerConfig: { vehiclesPath: "v1/positions" },
    }, { apiSecret: false, webhookSecret: true });
    expect(ready.find((item) => item.id === "documentation").ready).toBe(true);
    expect(ready.find((item) => item.id === "api-secret").ready).toBe(true);
  });

  it("não transforma ausência de dados em indicadores fictícios", () => {
    expect(trackerOperationalSummary()).toEqual({
      linkedVehicles: 0,
      positions: 0,
      events: 0,
      latestPositionAt: "",
    });
  });

  it("classifica o estado do veículo pela posição real", () => {
    const now = new Date("2026-08-05T15:00:00.000Z").getTime();
    expect(trackerVehicleState({ position: null }, now)).toBe("Sem posição");
    expect(trackerVehicleState({
      position: { recordedAt: "2026-08-05T14:59:00.000Z", ignition: true, speedKmh: 42 },
    }, now)).toBe("Em movimento");
    expect(trackerVehicleState({
      position: { recordedAt: "2026-08-05T14:59:00.000Z", ignition: false, speedKmh: 0 },
    }, now)).toBe("Desligado");
    expect(trackerVehicleState({
      position: { recordedAt: "2026-08-04T10:00:00.000Z", ignition: true, speedKmh: 0 },
    }, now)).toBe("Sem comunicação");
  });

  it("traduz os estados da integração", () => {
    expect(trackerStatusLabel("active")).toBe("Conectada");
    expect(trackerStatusLabel("error")).toBe("Requer atenção");
  });
});
