import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

const UPDATE_EVENT = "sf-app-update-available";

const announceUpdate = () => {
  window.__SF_UPDATE_AVAILABLE__ = true;
  window.dispatchEvent(new Event(UPDATE_EVENT));
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      let controlled = !!navigator.serviceWorker.controller;
      const registration = await navigator.serviceWorker.register("/sw.js", {
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
      window.setInterval(() => registration.update().catch(() => {}), 5 * 60_000);
    } catch {
      // O aplicativo continua funcionando normalmente sem o modo instalável.
    }
  });
}
