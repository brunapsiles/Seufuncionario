import { buildExtensionPrompt } from "./prompt.js";

const DEFAULT_BASE = "https://seufuncionario-expo.brunapsiles.workers.dev";
const $ = (id) => document.getElementById(id);

const load = () =>
  new Promise((res) =>
    chrome.storage.local.get(["baseUrl", "token"], (v) => res(v || {})),
  );

async function init() {
  const { baseUrl, token } = await load();
  $("baseUrl").value = baseUrl || DEFAULT_BASE;
  $("token").value = token || "";
  if (!token) $("settings").classList.remove("hidden");
}

$("gear").addEventListener("click", () =>
  $("settings").classList.toggle("hidden"),
);

$("saveSettings").addEventListener("click", () => {
  chrome.storage.local.set(
    {
      baseUrl: $("baseUrl").value.trim() || DEFAULT_BASE,
      token: $("token").value.trim(),
    },
    () => {
      $("settings").classList.add("hidden");
      setStatus("Salvo.");
    },
  );
});

function setStatus(msg, isError) {
  const el = $("status");
  el.textContent = msg || "";
  el.classList.toggle("hidden", !msg);
  el.classList.toggle("error", !!isError);
}

// Extrai título, URL, seleção e texto da aba ativa.
async function getPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { url: "", title: "", selection: "", pageText: "" };
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: location.href,
        title: document.title,
        selection: String(window.getSelection() || ""),
        pageText: document.body ? document.body.innerText : "",
      }),
    });
    return result || { url: tab.url || "", title: tab.title || "", selection: "", pageText: "" };
  } catch {
    return { url: tab.url || "", title: tab.title || "", selection: "", pageText: "" };
  }
}

async function run(mode) {
  const { baseUrl, token } = await load();
  if (!token) {
    $("settings").classList.remove("hidden");
    setStatus("Cole seu token de acesso primeiro.", true);
    return;
  }
  setStatus("Consultando a IA...");
  $("result").classList.add("hidden");
  $("copy").classList.add("hidden");
  try {
    const ctx = await getPageContext();
    ctx.question = $("question").value.trim();
    const prompt = buildExtensionPrompt(mode, ctx);
    const resp = await fetch(`${(baseUrl || DEFAULT_BASE).replace(/\/$/, "")}/api/ai`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt, specialist: "Redator" }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok)
      throw new Error(data.error || `Falha (${resp.status}). Verifique o token.`);
    const text = (data.content || "").trim() || "Sem resposta.";
    $("result").textContent = text;
    $("result").classList.remove("hidden");
    $("copy").classList.remove("hidden");
    setStatus("");
  } catch (e) {
    setStatus(e.message || "Erro ao consultar.", true);
  }
}

document.querySelectorAll(".mode").forEach((btn) =>
  btn.addEventListener("click", () => run(btn.dataset.mode)),
);
$("ask").addEventListener("click", () => run("ask"));
$("copy").addEventListener("click", () => {
  navigator.clipboard
    .writeText($("result").textContent || "")
    .then(() => setStatus("Copiado."));
});

init();
