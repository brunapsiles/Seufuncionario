// ===== Formatos de exibição =====
//
// Dinheiro em real, com o separador que o Brasil usa. Uma função, usada em
// dezenas de telas — e era exatamente por ser pequena que ninguém a movia.

export const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export const slugify = (s) =>
  (s || "meu-site")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const escapeHtml = (s) =>
  String(s || "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );

// PushManager.subscribe() exige a chave VAPID como Uint8Array, mas o
// servidor entrega base64url — essa é a conversão padrão da MDN.
export const urlBase64ToUint8Array = (base64) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
