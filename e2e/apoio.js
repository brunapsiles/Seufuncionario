// Apoio dos testes de ponta a ponta.
//
// Nada aqui fala com o banco por baixo dos panos: as contas são criadas pela
// mesma tela e pela mesma API que uma pessoa usaria. Um E2E que semeia o banco
// direto deixa de testar justamente o cadastro e o login.

export const unico = (prefixo) =>
  `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const contaNova = (prefixo = "e2e") => ({
  nome: `Pessoa ${prefixo}`,
  email: `${unico(prefixo)}@exemplo.com.br`,
  senha: "SenhaForte2026!",
});

// Cria a conta pela tela de cadastro e devolve já autenticada.
export async function criarConta(page, conta = contaNova()) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("Seu nome", { exact: true }).fill(conta.nome);
  await page.getByLabel("E-mail", { exact: true }).fill(conta.email);
  await page.getByLabel(/^Senha/).fill(conta.senha);
  await page.getByRole("button", { name: /Criar minha conta/ }).click();
  await esperarEntrar(page);
  return conta;
}

export async function entrar(page, conta) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Entrar" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(conta.email);
  await page.getByLabel(/^Senha/).fill(conta.senha);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await esperarEntrar(page);
}

// Entrar é o formulário de acesso sumir: o app troca a tela de acesso pelo
// produto.
//
// Já tentei condicionar isto a `waitForLoadState("networkidle")` — foi pior.
// O app mantém conexões abertas, a rede nunca "sossega", e a espera consumia
// o orçamento inteiro do teste antes de olhar a tela uma vez sequer. A espera
// direta pelo elemento é a que funciona.
export async function esperarEntrar(page) {
  await page.waitForSelector(".auth-shell", { state: "detached", timeout: 45_000 });
}

export async function sair(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/");
  // Esperar a porta de entrada voltar, e não só mandar navegar: sem isso o
  // teste segue enquanto o app ainda está decidindo o que mostrar.
  await page.waitForSelector(".auth-shell", { timeout: 45_000 });
}

// O token que o app guardou. Serve para chamar a API como a própria sessão —
// é assim que o teste monta cenário sem inventar caminho paralelo.
export const tokenDaSessao = (page) =>
  page.evaluate(() => localStorage.getItem("seu-funcionario-auth-token"));

export async function api(page, caminho, opcoes = {}) {
  const token = await tokenDaSessao(page);
  return page.evaluate(
    async ({ caminho, opcoes, token }) => {
      const resposta = await fetch(caminho, {
        method: opcoes.method || "GET",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      });
      return { status: resposta.status, corpo: await resposta.json().catch(() => ({})) };
    },
    { caminho, opcoes, token },
  );
}

// Concede acesso à vertical pelo mesmo INSERT que um admin usaria na tela de
// "acessos por e-mail" — /api/test-support/todogreen-acesso só existe quando
// não há `cf-connecting-ip` (ausente em `wrangler dev` local, sempre presente
// atrás da borda da Cloudflare em produção) e só concede para o e-mail da
// própria sessão. Escrever um negócio chamado "To Do Green" no espaço não
// libera mais nada — essa checagem foi removida do worker por ser
// contornável por qualquer pessoa que renomeasse o próprio negócio.
export async function habilitarTodoGreen(page, papel) {
  const r = await api(page, "/api/test-support/todogreen-acesso", {
    method: "POST",
    body: papel ? { role: papel } : {},
  });
  // O React não fica sabendo de uma escrita feita por fora dele: sem recarregar,
  // a vertical continua invisível porque o estado da tela é o de antes.
  await page.goto("/");
  await esperarEntrar(page);
  return r;
}
