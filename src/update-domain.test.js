import { describe, expect, it } from "vitest";
import {
  INTERACTION_EVENTS,
  hasNewVersion,
  isEditableElement,
  reloadKey,
  shouldAnnounce,
  shouldAutoReload,
} from "./features/app/updateDomain";

const base = { currentVersion: "abc123", latestVersion: "def456" };

describe("recarregar sozinho só em aba intocada", () => {
  it("aba intocada com versão nova pode recarregar", () => {
    expect(shouldAutoReload(base)).toBe(true);
  });

  it("NÃO recarrega se a pessoa digitou alguma coisa", () => {
    // O app tem editor de código, notebook e formulários. Recarregar no meio
    // joga fora o que foi escrito, sem aviso e sem desfazer.
    expect(shouldAutoReload({ ...base, interacted: true })).toBe(false);
  });

  it("NÃO recarrega com um campo em foco", () => {
    expect(shouldAutoReload({ ...base, hasFocusedField: true })).toBe(false);
  });

  it("não recarrega duas vezes pela mesma versão", () => {
    // Sem esta trava, um deploy servindo versões alternadas poria a aba num
    // laço de recarregamento.
    expect(shouldAutoReload({ ...base, alreadyReloaded: true })).toBe(false);
  });

  it("sem versão nova, não faz nada", () => {
    expect(
      shouldAutoReload({ currentVersion: "abc", latestVersion: "abc" }),
    ).toBe(false);
  });

  it("versão desconhecida não dispara recarregamento", () => {
    expect(shouldAutoReload({ currentVersion: "abc", latestVersion: "" })).toBe(
      false,
    );
    expect(shouldAutoReload({ currentVersion: "", latestVersion: "def" })).toBe(
      false,
    );
    expect(shouldAutoReload({})).toBe(false);
  });

  it("sem argumento nenhum, não quebra", () => {
    expect(shouldAutoReload()).toBe(false);
  });
});

describe("o aviso aparece mesmo quando o recarregamento é recusado", () => {
  it("é ele que devolve a escolha para a pessoa", () => {
    expect(shouldAnnounce(base)).toBe(true);
    // Mesmo contexto em que o recarregamento automático foi negado:
    expect(shouldAutoReload({ ...base, interacted: true })).toBe(false);
    expect(shouldAnnounce({ ...base, interacted: true })).toBe(true);
  });

  it("sem versão nova, nada é anunciado", () => {
    expect(shouldAnnounce({ currentVersion: "x", latestVersion: "x" })).toBe(
      false,
    );
    expect(shouldAnnounce({})).toBe(false);
  });
});

describe("hasNewVersion", () => {
  it("compara as duas versões", () => {
    expect(hasNewVersion("a", "b")).toBe(true);
    expect(hasNewVersion("a", "a")).toBe(false);
  });

  it("espaço sobrando não conta como versão diferente", () => {
    expect(hasNewVersion(" abc ", "abc")).toBe(false);
  });

  it("valor vazio ou nulo não conta", () => {
    expect(hasNewVersion(null, "b")).toBe(false);
    expect(hasNewVersion("a", undefined)).toBe(false);
  });
});

describe("campo em edição", () => {
  it("reconhece os campos de texto", () => {
    for (const tag of ["INPUT", "TEXTAREA", "SELECT"])
      expect(isEditableElement({ tagName: tag })).toBe(true);
  });

  it("reconhece área de texto rica", () => {
    expect(isEditableElement({ tagName: "DIV", isContentEditable: true })).toBe(
      true,
    );
  });

  it("um botão ou um parágrafo não é campo de edição", () => {
    expect(isEditableElement({ tagName: "BUTTON" })).toBe(false);
    expect(isEditableElement({ tagName: "P", isContentEditable: false })).toBe(
      false,
    );
  });

  it("elemento ausente não quebra", () => {
    expect(isEditableElement(null)).toBe(false);
    expect(isEditableElement(undefined)).toBe(false);
  });
});

describe("chave por aba", () => {
  it("é específica da versão", () => {
    expect(reloadKey("v1")).not.toBe(reloadKey("v2"));
    expect(reloadKey("v1")).toContain("v1");
  });
});

describe("sinais de que a pessoa está trabalhando", () => {
  it("cobre teclado, toque, digitação, colar e arrastar", () => {
    for (const e of ["keydown", "pointerdown", "input", "paste", "drop"])
      expect(INTERACTION_EVENTS).toContain(e);
  });
});
