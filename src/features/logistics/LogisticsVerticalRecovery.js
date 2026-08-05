const TODO_GREEN_PATH = /^\/todogreen(?:\/|$)/;
const LOADING_TEXT = "Carregando vertical To Do Green";
const RELOAD_KEY = "tdg-recovery-reloaded";
const TIMEOUT_MS = 6500;

const isTodoGreen = () => TODO_GREEN_PATH.test(window.location.pathname);

const loadingNode = () =>
  [...document.querySelectorAll(".inbox-loading")].find((node) =>
    String(node.textContent || "").includes(LOADING_TEXT),
  );

const clearOldRuntime = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {}

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update().catch(() => {})));
    }
  } catch {}
};

const reloadFresh = async () => {
  await clearOldRuntime();
  const url = new URL(window.location.href);
  url.searchParams.set("tdg_refresh", String(Date.now()));
  window.location.replace(url.toString());
};

const renderRecovery = (node) => {
  if (!node || node.dataset.tdgRecovery === "ready") return;
  node.dataset.tdgRecovery = "ready";
  node.classList.add("tdg-load-recovery");
  node.innerHTML = `
    <div class="tdg-load-recovery-card" role="alert">
      <strong>Não foi possível carregar a To Do Green</strong>
      <p>A versão salva no navegador pode estar desatualizada. Atualize os arquivos do aplicativo para continuar.</p>
      <div class="tdg-load-recovery-actions">
        <button type="button" data-tdg-retry>Tentar novamente</button>
        <a href="/">Voltar ao Seu Funcionário</a>
      </div>
      <small>Se a conexão estiver instável, aguarde alguns segundos e tente novamente.</small>
    </div>
  `;
  node.querySelector("[data-tdg-retry]")?.addEventListener("click", (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Atualizando...";
    reloadFresh();
  });
};

const recoverIfStuck = async () => {
  if (!isTodoGreen()) return;
  const node = loadingNode();
  if (!node) return;

  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
  } catch {}

  if (!alreadyReloaded) {
    try {
      sessionStorage.setItem(RELOAD_KEY, "1");
    } catch {}
    await reloadFresh();
    return;
  }

  renderRecovery(node);
};

const scheduleRecovery = () => {
  if (!isTodoGreen()) return;
  window.setTimeout(recoverIfStuck, TIMEOUT_MS);
};

if (typeof window !== "undefined") {
  const start = () => {
    scheduleRecovery();
    const observer = new MutationObserver(() => {
      if (loadingNode()) scheduleRecovery();
      else {
        try {
          sessionStorage.removeItem(RELOAD_KEY);
        } catch {}
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pageshow", scheduleRecovery);
    window.addEventListener("focus", scheduleRecovery);
    window.addEventListener("popstate", scheduleRecovery);
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
