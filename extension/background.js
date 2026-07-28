// Service worker da extensão: cria um item de menu de contexto que abre o
// popup do Seu Funcionário com o texto selecionado guardado para uso.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sf-ask",
    title: "Perguntar ao Seu Funcionário",
    contexts: ["selection", "page"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  chrome.storage.local.set({ pendingSelection: info.selectionText || "" });
  // Abre o popup quando o navegador permitir (Chrome recente).
  if (chrome.action && chrome.action.openPopup) {
    chrome.action.openPopup().catch(() => {});
  }
});
