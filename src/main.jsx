import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const reportError = (message, stack, componentStack) => {
  try {
    fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: String(message || "").slice(0, 500),
        stack: String(stack || "").slice(0, 4000),
        componentStack: String(componentStack || "").slice(0, 4000),
        url: location.href,
      }),
    }).catch(() => {});
  } catch {}
};

window.addEventListener("error", (event) => {
  reportError(event.message, event.error?.stack);
});
window.addEventListener("unhandledrejection", (event) => {
  reportError(
    event.reason?.message || String(event.reason || "unhandled rejection"),
    event.reason?.stack,
  );
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    reportError(error?.message || String(error), error?.stack, info?.componentStack);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="crash-screen">
        <div className="crash-card">
          <strong>Seu Funcionário</strong>
          <h1>Algo deu errado</h1>
          <p>
            Encontramos um problema inesperado. Seus dados estão salvos; tente
            recarregar a página.
          </p>
          <button onClick={() => location.reload()}>Recarregar</button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

const UPDATE_EVENT = "sf-app-update-available";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "local";
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || "";

window.__SF_APP_VERSION__ = APP_VERSION;
window.__SF_BUILD_TIME__ = BUILD_TIME;

const announceUpdate = (detail = {}) => {
  window.__SF_UPDATE_AVAILABLE__ = true;
  window.__SF_LATEST_VERSION__ = detail.latestVersion || "";
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail }));
};

const reloadOnceForVersion = (latestVersion) => {
  if (!latestVersion || latestVersion === APP_VERSION) return false;
  const key = `sf-auto-reloaded:${latestVersion}`;
  try {
    if (sessionStorage.getItem(key) === "1") return false;
    sessionStorage.setItem(key, "1");
  } catch {}
  location.reload();
  return true;
};

const checkPublishedVersion = async () => {
  try {
    const response = await fetch(
      `/api/status?client=${encodeURIComponent(APP_VERSION)}&t=${Date.now()}`,
      { cache: "no-store" },
    );
    const status = await response.json();
    const latestVersion = status?.version;
    if (latestVersion && latestVersion !== APP_VERSION) {
      announceUpdate({ currentVersion: APP_VERSION, latestVersion });
      window.setTimeout(() => reloadOnceForVersion(latestVersion), 250);
    }
  } catch {
    // Sem rede, o app continua usando a versão instalada.
  }
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "sf-push-navigate") {
      window.dispatchEvent(
        new CustomEvent("sf-push-navigate", { detail: { link: event.data.link } }),
      );
    }
  });
  window.addEventListener("load", async () => {
    try {
      let controlled = !!navigator.serviceWorker.controller;
      const swUrl = `/sw.js?v=${encodeURIComponent(APP_VERSION)}`;
      const registration = await navigator.serviceWorker.register(swUrl, {
        updateViaCache: "none",
      });
      const watchInstalling = (worker) => {
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && controlled) announceUpdate();
        });
      };
      watchInstalling(registration.installing);
      registration.addEventListener("updatefound", () =>
        watchInstalling(registration.installing),
      );
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (controlled) announceUpdate();
        controlled = true;
      });
      // Uma aba pode permanecer aberta por muitas horas. Verificar em intervalos
      // curtos evita que ela continue indefinidamente em uma versão antiga.
      await checkPublishedVersion();
      window.setInterval(() => {
        registration.update().catch(() => {});
        checkPublishedVersion();
      }, 5 * 60_000);
    } catch {
      // O aplicativo continua funcionando normalmente sem o modo instalável.
    }
  });
}
