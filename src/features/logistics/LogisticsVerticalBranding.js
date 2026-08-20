const TODO_GREEN_PATH = /^\/todogreen(?:\/|$)/;

const applyTodoGreenBranding = () => {
  if (!TODO_GREEN_PATH.test(window.location.pathname)) return;

  document.title = document.title.includes("|") ? document.title : "To Do Green";
  document.querySelectorAll(".auth-shell .logo").forEach((logo) => {
    const image = logo.querySelector("img");
    const name = logo.querySelector("span");
    if (image) image.alt = "To Do Green";
    if (name) name.textContent = "To Do Green";
  });

  const art = document.querySelector(".auth-shell .auth-art");
  if (!art) return;
  const eyebrow = art.querySelector(".eyebrow");
  const title = art.querySelector("h1");
  const description = art.querySelector("p");
  if (eyebrow) eyebrow.textContent = "OPERAÇÃO CONECTADA";
  if (title) title.textContent = "Do comercial à entrega, tudo no mesmo fluxo.";
  if (description) description.textContent = "Clientes, propostas, operação, financeiro, gestão e ESG organizados para a rotina da To Do Green.";
};

if (typeof window !== "undefined") {
  const start = () => {
    applyTodoGreenBranding();
    const observer = new MutationObserver(applyTodoGreenBranding);
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
