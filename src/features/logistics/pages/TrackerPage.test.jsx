/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrackerPage from "./TrackerPage.jsx";

describe("página do TMS Tracker", () => {
  afterEach(() => vi.restoreAllMocks());

  it("carrega configuração e frota sem expor campo de credencial", async () => {
    const integration = {
      name: "Sistemas Tracker", baseUrl: "https://api.tracker.example", externalAccountId: "conta-1",
      authMode: "bearer", tokenEnvKey: "TODOGREEN_TRACKER_API_TOKEN", webhookSecretEnvKey: "TODOGREEN_TRACKER_WEBHOOK_SECRET",
      syncMode: "manual", pollingIntervalMinutes: 60, status: "ready", revision: 1,
      providerConfig: { vehiclesPath: "v1/vehicles", collectionPath: "data", authHeaderName: "x-api-key", webhookCollectionPath: "" },
    };
    vi.stubGlobal("fetch", vi.fn((url) => Promise.resolve(new Response(JSON.stringify(
      url.endsWith("/vehicles")
        ? { vehicles: [{ id: "vehicle-1", plate: "ABC1D23", name: "Frota 1", position: null }] }
        : { integration, summary: { linkedVehicles: 1, positions: 3, events: 2 }, access: { canManage: true }, requirements: { apiSecret: false, webhookSecret: true } },
    ), { status: 200 }))));

    render(<TrackerPage authHeaders={() => ({ authorization: "Bearer teste" })} />);

    expect(await screen.findByRole("heading", { name: "Integração com o TMS Tracker" })).toBeInTheDocument();
    expect(await screen.findByText("ABC1D23")).toBeInTheDocument();
    expect(screen.queryByLabelText(/token|senha|credencial/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("TODOGREEN_TRACKER_API_TOKEN")).toBeInTheDocument();
  });
});
