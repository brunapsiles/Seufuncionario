// ===== Telemetria e notificação =====
//
// Registrar o que aconteceu (evento de produto, interação) e avisar a pessoa
// (notificação no app, que a sincronização transforma em Web Push).
//
// Todas carregam o espaço ativo e o token da sessão — é por isso que ficam
// juntas, e junto da camada de sessão: um evento gravado sem espaço não diz
// de quem é.

import { AUTH_TOKEN_KEY } from "./espacoVazio.js";
import { activeSpaceId, authHeaders } from "./armazenamento.js";

export const aiWorkspaceContext = (business) => ({
  workspaceOwnerId: activeSpaceId() || undefined,
  businessId: business?.id || undefined,
});

export const trackProductEvent = (event, metadata = {}) => {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return;
  const space = activeSpaceId();
  fetch(`/api/events${space ? `?owner=${encodeURIComponent(space)}` : ""}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ event, metadata }),
    keepalive: true,
  }).catch(() => {});
};

export const inboxUrl = () => {
  const space = activeSpaceId();
  return `/api/inbox${space ? `?owner=${encodeURIComponent(space)}` : ""}`;
};

// Registra uma interação (mensagem enviada/recebida, ligação, nota) na caixa
// de entrada unificada. Chamado nos pontos de envio (WhatsApp, e-mail) para
// que todo canal caia num só lugar, ligado ao contato.
export const logInteraction = (interaction) => {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return Promise.resolve(null);
  return fetch(inboxUrl(), {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(interaction),
    keepalive: true,
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
};
