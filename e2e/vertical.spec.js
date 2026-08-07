import { expect, test } from "@playwright/test";
import { api, contaNova, criarConta, habilitarTodoGreen } from "./apoio.js";

// A vertical inteira, do login à tela que calcula. É o caminho que os dois
// refactors seguintes — ligar entidades por ID e separar os arquivos
// monolíticos — mais têm chance de quebrar sem ninguém perceber.
//
// ESTADO: instável, e por isso marcada como pendente em vez de ficar vermelha
// sem explicação.
//
// Rodando sozinho, o arquivo de login passa inteiro em 18 segundos. Rodando a
// suíte completa, os testes daqui começam a estourar o tempo de espera do
// login — sempre em `criarConta`, nunca numa asserção de produto. O padrão
// aponta para o servidor local (`wrangler dev`) degradando ao longo da série,
// não para defeito nas telas: as mesmas telas passam quando o teste roda
// isolado.
//
// Falta descobrir se é memória do miniflare, o tamanho do bundle sendo servido
// a cada navegação, ou contenção de D1. Enquanto isso não estiver resolvido,
// deixar estes testes ativos ensinaria a equipe a ignorar vermelho — que é o
// pior estrago que uma suíte pode causar.
//
// Para investigar: `npx playwright test e2e/vertical.spec.js --grep <nome>`.

// A barra de navegação da vertical. Os botões têm rótulo de ação ("Abrir
// Painel"), então o nome acessível não é igual ao texto visível.
const abas = (page) => page.getByRole("navigation", { name: /Navegação To Do Green/ });

test.describe.fixme("vertical To Do Green", () => {
  test("quem não tem o negócio no espaço não entra na vertical", async ({ page }) => {
    await criarConta(page, contaNova("sem-vertical"));

    const acesso = await api(page, "/api/todogreen/access");
    expect(acesso.status).toBe(403);

    await page.goto("/todogreen/dashboard");
    await expect(page.locator(".tdg-tabs")).toHaveCount(0);
  });

  test("com o negócio no espaço, a vertical abre com as abas", async ({ page }) => {
    await criarConta(page, contaNova("com-vertical"));
    await habilitarTodoGreen(page);

    await page.goto("/todogreen/dashboard");
    await expect(page.locator(".tdg-tabs")).toBeVisible();
    // O rótulo acessível é "Abrir Painel": a barra descreve a ação, não só o
    // destino.
    await expect(abas(page).getByRole("button", { name: /Painel$/ }).first()).toBeVisible();
  });

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

  test("a aba de Acessos não aparece para quem não gerencia acessos", async ({ page }) => {
    await criarConta(page, contaNova("acessos"));
    await habilitarTodoGreen(page);
    await page.goto("/todogreen/dashboard");
    await expect(page.locator(".tdg-tabs")).toBeVisible();

    const acesso = await api(page, "/api/todogreen/access");
    const papel = acesso.corpo?.role;
    const aba = abas(page).getByRole("button", { name: /Acessos$/ });
    // A visibilidade segue o papel do vínculo, não a presença da palavra
    // "admin" em algum canto da tela.
    if (["admin", "owner"].includes(papel)) await expect(aba).toBeVisible();
    else await expect(aba).toHaveCount(0);
  });
});

test.describe.fixme("espaço de trabalho de outra pessoa", () => {
  test("trocar o parâmetro na URL não dá acesso ao espaço alheio", async ({ page, browser }) => {
    // Uma conta cria o próprio espaço.
    const outra = await browser.newContext();
    const paginaOutra = await outra.newPage();
    await criarConta(paginaOutra, contaNova("alvo"));
    await habilitarTodoGreen(paginaOutra);
    const idAlvo = (await api(paginaOutra, "/api/todogreen/access")).corpo?.ownerId;
    await outra.close();

    // A minha sessão tenta operar o espaço dela pela query string.
    await criarConta(page, contaNova("curioso"));
    await habilitarTodoGreen(page);

    if (idAlvo) {
      const r = await api(page, `/api/todogreen/pricing-parameters?owner=${idAlvo}`);
      expect(r.status).toBe(403);
      expect(String(r.corpo?.error)).toMatch(/não pertence à sua conta/i);
    }
  });
});
