import { expect, test } from "@playwright/test";
import { contaNova, criarConta, habilitarTodoGreen } from "./apoio.js";

// A vertical inteira, do login à tela que calcula. É o caminho que os dois
// refactors seguintes — ligar entidades por ID e separar os arquivos
// monolíticos — mais têm chance de quebrar sem ninguém perceber.
//
// ESTADO: instável, e por isso marcada como pendente em vez de ficar vermelha
// sem explicação.
//
// Rodando sozinho, o arquivo de login passa inteiro em 18 segundos. Rodando a
// suíte completa, os testes daqui começam a estourar o tempo de espera do
// login — sempre em `criarConta`, nunca numa asserção de produto.
//
// UMA causa real já foi encontrada e corrigida: `wrangler dev` carimba
// `cf-connecting-ip: 127.0.0.1` em toda requisição local (não deixa o
// cabeçalho ausente, como a suíte de vitest-pool-workers simulava), e o
// limite de tentativas de `/api/auth/*` tratava esse loopback como IP de
// borda de produção — 8 por minuto. `edgeIp()` (worker/lib/http.js) corrigiu
// isso, e `vertical-acesso.spec.js` já roda com `.fixme` removido, os quatro
// testes passando em sequência, inclusive dentro da suíte `e2e/` inteira.
//
// Mesmo com essa causa corrigida, rodando `e2e/` inteiro ainda sobra: (1)
// `login.spec.js` "entra de novo depois de sair" trava no `.auth-shell`
// depois do logout — não é rate limit de auth, é outra coisa; (2) o teste de
// oportunidades deste arquivo salva o registro mas a lista não mostra
// "Distribuidora E2E" a tempo. Nenhum dos dois reproduz rodando isolado.
//
// Falta descobrir se o que sobra é memória do miniflare, o tamanho do bundle
// servido a cada navegação, ou contenção de D1. Enquanto isso não estiver
// resolvido, deixar estes testes ativos ensinaria a equipe a ignorar
// vermelho — que é o pior estrago que uma suíte pode causar.
//
// Para investigar: `npx playwright test e2e/vertical.spec.js --grep <nome>`.
//
// Os testes de CONTROLE DE ACESSO saíram daqui para `vertical-acesso.spec.js`
// — poucos, sem formulário de produto, estáveis o bastante para travar
// publicação. Regra de isolamento quebrada não podia esperar o resto da
// suíte ficar estável para virar gate; o que enche tela de campo é que pode.

test.describe.fixme("vertical To Do Green", () => {
  test("nenhuma aba aparece com rótulo quebrado", async ({ page }) => {
    await criarConta(page, contaNova("abas"));
    await habilitarTodoGreen(page);
    await page.goto("/todogreen/dashboard");
    await expect(page.locator(".tdg-tabs")).toBeVisible();

    const rotulos = await page.locator(".tdg-tabs button").allInnerTexts();
    expect(rotulos.length).toBeGreaterThan(5);
    // Era exatamente isto que aparecia: "ESG,", "Receita,", "Custos,".
    for (const rotulo of rotulos) {
      expect(rotulo.trim()).not.toMatch(/[,;:.]$/);
      expect(rotulo.trim()).not.toBe("");
    }
    // E nenhum nome repetido, que faria duas abas parecerem funções diferentes.
    expect(new Set(rotulos).size).toBe(rotulos.length);
  });

  test("a tela de custo e margem calcula e recomenda de ponta a ponta", async ({ page }) => {
    await criarConta(page, contaNova("margem"));
    await habilitarTodoGreen(page);
    await page.goto("/todogreen/custos");

    await expect(page.getByRole("heading", { name: "Aceito esta viagem?" })).toBeVisible();
    // Sem custo, não arrisca recomendação.
    await expect(page.getByText("Faltam dados")).toBeVisible();

    await page.getByLabel("Frete oferecido por viagem (R$)").fill("2200");
    await page.getByLabel("Km com carga (ida)").fill("400");
    await page.getByLabel("Valor de Combustível ou energia").fill("1.8");
    await page.getByLabel("Valor de Motorista").fill("320");

    await expect(page.getByText("Aceitar", { exact: true })).toBeVisible();
    await expect(page.getByText("Como a margem foi calculada")).toBeVisible();
  });

  test("a tela de oportunidades abre e aceita um registro", async ({ page }) => {
    await criarConta(page, contaNova("oportunidade"));
    await habilitarTodoGreen(page);
    await page.goto("/todogreen/oportunidades");

    await expect(page.getByRole("heading", { name: "Oportunidades" })).toBeVisible();
    await expect(page.getByText(/Nenhuma oportunidade registrada ainda/)).toBeVisible();

    await page.getByLabel("Cliente", { exact: true }).fill("Distribuidora E2E");
    await page.getByLabel("Km com carga (ida)").or(page.getByLabel("Distância por viagem (km)")).first().fill("120");
    await page.getByLabel("Viagens por mês").fill("20");
    await page.getByLabel("Valor mensal (R$)").fill("10000");
    await page.getByRole("button", { name: /Registrar oportunidade/ }).click();

    await expect(page.getByText("Distribuidora E2E")).toBeVisible();
  });
});
