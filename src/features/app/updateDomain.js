// ===== Quando é seguro recarregar a página sozinho =====
// Camada pura: só decide. Quem recarrega de fato é o main.jsx.
//
// O problema que isto resolve: quando sai uma versão nova, uma aba aberta há
// horas continua rodando a versão antiga. Recarregar sozinho conserta isso — e
// cria um risco pior, se feito na hora errada. O app tem editor de código,
// notebook, formulários e um campo de conversa: recarregar enquanto alguém
// digita joga fora o que a pessoa escreveu, sem aviso e sem desfazer.
//
// A regra, então: **o app só se recarrega sozinho em aba intocada.** Bastou um
// toque, uma tecla ou um campo em foco para a decisão virar do dono da aba —
// aparece o aviso "nova versão pronta" com o botão de atualizar, e ele espera
// o tempo que precisar.

export const UPDATE_EVENT = "sf-app-update-available";

// Marca de "já recarreguei por esta versão", guardada por aba. Sem ela, uma
// falha de deploy que servisse versões alternadas colocaria a aba num laço de
// recarregamento.
export const reloadKey = (versao) => `sf-auto-reloaded:${versao}`;

export const hasNewVersion = (atual, publicada) => {
  const a = String(atual || "").trim();
  const b = String(publicada || "").trim();
  return !!a && !!b && a !== b;
};

// `interagiu`  — a pessoa tocou, clicou ou digitou nesta aba
// `campoAtivo` — há um campo de texto em foco agora
// `jaRecarregou` — esta aba já se recarregou por esta mesma versão
export const shouldAutoReload = ({
  currentVersion,
  latestVersion,
  interacted = false,
  hasFocusedField = false,
  alreadyReloaded = false,
} = {}) => {
  if (!hasNewVersion(currentVersion, latestVersion)) return false;
  if (alreadyReloaded) return false;
  if (interacted || hasFocusedField) return false;
  return true;
};

// O aviso aparece sempre que há versão nova — inclusive quando o recarregamento
// automático foi recusado. É ele que devolve a escolha para a pessoa.
export const shouldAnnounce = ({ currentVersion, latestVersion } = {}) =>
  hasNewVersion(currentVersion, latestVersion);

// Um campo de texto em foco é o sinal mais forte de que há trabalho em
// andamento. `isEditable` é separado para poder ser testado sem DOM.
export const isEditableElement = (el) => {
  if (!el) return false;
  const tag = String(el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return el.isContentEditable === true;
};

export const INTERACTION_EVENTS = [
  "keydown",
  "pointerdown",
  "input",
  "paste",
  "drop",
];
