import { expect, test } from "@playwright/test";
import { api, contaNova, criarConta, habilitarTodoGreen } from "./apoio.js";

// ===== E2E de acesso da vertical To Do Green =====
//
// Separado de `vertical.spec.js` de propósito: aquele arquivo cobre a
// vertical inteira (telas, formulários, cálculo) e é instável por um motivo
// já conhecido; este cobre só CONTROLE DE ACESSO — a parte que, se quebrar,
// não pode chegar a produção — com a menor superfície possível: poucos
// testes, sem preencher formulário de produto.
//
// ESTADO: ainda `fixme`, apesar da separação. Três causas reais de
// instabilidade já foram encontradas e corrigidas nesta rodada de
// investigação (worker.js, App.jsx, LogisticsVerticalCredentials.js — ver
// commit), mas o sintoma original permanece: rodando os quatro testes deste
// arquivo em sequência (`npx playwright test e2e/vertical-acesso.spec.js`),
// o primeiro passa e os demais travam nos 45s de `esperarEntrar`, sempre a
// partir do teste que faz um `page.goto("/")` inteiro (recarga de página) no
// meio da sequência — mesmo com `.wrangler/state` completamente zerado antes
// de rodar, o que descarta acúmulo de dados de execuções anteriores como
// causa. Rodado sozinho (`--grep`), qualquer um dos quatro passa em segundos.
//
// Hipóteses já eliminadas: colisão do limite de tentativas (`auth:${ip}`) —
// corrigida e testada em `test/auth-rate-limit-local-dev.worker.test.js`,
// mas o sintoma persiste mesmo com ela corrigida; e acúmulo de dados no D1
// local entre execuções — eliminada rodando com estado zerado.
//
// Ainda não fica claro se o problema é específico deste ambiente (o `wrangler
// dev` local detectou um proxy de saída configurado — "Proxy environment
// variables detected" no início do log — algo que um runner de CI comum não
// tem) ou algo que também aconteceria lá. Por isso este arquivo NÃO entra no
// fluxo "Qualidade" ainda: colocar um portão instável bloqueando publicação
// seria pior do que não ter portão nenhum. Assim que alguém confirmar rodando
// em CI de verdade (ou achar a causa raiz do travamento), promover para
// `test.describe` sem `.fixme` e adicionar o passo em `.github/workflows/ci.yml`.

const abas = (page) => page.getByRole("navigation", { name: /Navegação To Do Green/ });

test.describe.fixme("acesso à vertical To Do Green", () => {
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
    await expect(abas(page).getByRole("button", { name: /Painel$/ }).first()).toBeVisible();
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
