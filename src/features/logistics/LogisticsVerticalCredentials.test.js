/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

// `.tdg-denied-card` é o mesmo cartão para dois estados diferentes:
// "Confirmando seu acesso..." (checagem em andamento, todo mundo passa por
// aqui) e "acesso negado" (checagem terminou e recusou). A diferença visível
// é só o `aria-busy="true"` no <main> pai durante a checagem.
//
// Sem essa distinção, o formulário "Login privado" injetado por este arquivo
// aparecia também durante o carregamento normal — para QUALQUER pessoa
// autorizada, no instante antes do painel de verdade chegar.

const flush = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  vi.resetModules();
  history.pushState({}, "", "/todogreen/dashboard");
});

describe("Login privado só aparece quando o acesso já foi mesmo negado", () => {
  it("não injeta enquanto a checagem está em andamento, e injeta assim que ela nega de verdade", async () => {
    document.body.innerHTML = `
      <main class="tdg tdg-denied" aria-busy="true">
        <section class="tdg-denied-card">
          <span class="tdg-kicker">ACESSO PRIVADO</span>
          <h1>Confirmando seu acesso...</h1>
        </section>
      </main>
    `;
    await import("./LogisticsVerticalCredentials.js");
    await flush();

    expect(document.querySelector(".tdg-login-box")).toBeNull();
    expect(document.querySelector("h1").textContent).toBe("Confirmando seu acesso...");

    // A checagem termina e nega de verdade: o React trocaria o texto e
    // removeria o `aria-busy` no mesmo passe.
    document.querySelector("main").removeAttribute("aria-busy");
    document.querySelector("h1").textContent = "Vertical To Do Green protegida";
    await flush();

    expect(document.querySelector(".tdg-login-box")).not.toBeNull();
    expect(document.querySelector("h1").textContent).toBe("Acesso To Do Green");
  });

  it("num cartão de negação (sem aria-busy) desde o início, injeta direto", async () => {
    document.body.innerHTML = `
      <main class="tdg tdg-denied">
        <section class="tdg-denied-card">
          <span class="tdg-kicker">ACESSO PRIVADO</span>
          <h1>Vertical To Do Green protegida</h1>
        </section>
      </main>
    `;
    await import("./LogisticsVerticalCredentials.js");
    await flush();

    expect(document.querySelector(".tdg-login-box")).not.toBeNull();
  });
});
