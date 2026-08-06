import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A vertical criava as próprias tabelas a cada requisição. O efeito colateral é
// caro: DDL em toda chamada e, pior, uma migração esquecida some do radar —
// a tabela aparece sozinha com o formato que o código do momento decidiu, que
// pode divergir do formato da migração.
//
// Estas asserções vivem aqui, e não no teste de worker, porque o runtime do
// workerd não lê o disco.

const dir = (caminho) => new URL(caminho, import.meta.url);

const servicos = readdirSync(dir("../worker/services/"))
  .filter((nome) => nome.endsWith(".js"))
  .map((nome) => ({
    nome,
    texto: readFileSync(dir(`../worker/services/${nome}`), "utf8"),
  }));

const daVertical = servicos.filter(({ nome }) => nome.startsWith("todogreen-"));

const migracoes = readdirSync(dir("../migrations/"))
  .filter((nome) => nome.endsWith(".sql"))
  .map((nome) => readFileSync(dir(`../migrations/${nome}`), "utf8"))
  .join("\n");

const declaradasNasMigracoes = new Set(
  [...migracoes.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z_0-9]+)/gi)].map((m) =>
    m[1].toLowerCase(),
  ),
);

describe("o schema vem das migrações, não da requisição", () => {
  it("nenhum serviço da vertical cria tabela em tempo de execução", () => {
    const culpados = daVertical
      .filter(({ texto }) => /CREATE TABLE IF NOT EXISTS/i.test(texto))
      .map(({ nome }) => nome);
    expect(culpados).toEqual([]);
  });

  it("nenhum serviço da vertical chama um ensureTables", () => {
    const culpados = daVertical
      .filter(({ texto }) => /await ensureTables?\(/.test(texto))
      .map(({ nome }) => nome);
    expect(culpados).toEqual([]);
  });

  it("as tabelas que a vertical usa estão declaradas em migração", () => {
    for (const tabela of [
      "todogreen_clients",
      "todogreen_client_users",
      "todogreen_client_operations",
      "todogreen_client_requests",
      "todogreen_client_request_messages",
      "todogreen_access_emails",
      "todogreen_green_scores",
      "todogreen_score_weights",
      "todogreen_client_assignments",
      "environmental_calculations",
    ]) {
      expect(declaradasNasMigracoes.has(tabela)).toBe(true);
    }
  });

  it("toda tabela ainda criada em runtime tem migração equivalente", () => {
    // Sobra criação de tabela fora da vertical (webhooks, por exemplo). Não é o
    // alvo deste corte, mas nenhuma delas pode existir sem migração.
    const emRuntime = new Set(
      servicos.flatMap(({ texto }) =>
        [...texto.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z_0-9]+)/gi)].map((m) =>
          m[1].toLowerCase(),
        ),
      ),
    );
    const semMigracao = [...emRuntime].filter((t) => !declaradasNasMigracoes.has(t));
    expect(semMigracao).toEqual([]);
  });
});
