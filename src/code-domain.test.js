import { describe, expect, it } from "vitest";
import {
  MAX_LOGS,
  MAX_PROJECT_CHARS,
  SANDBOX,
  TEMPLATES,
  appendLog,
  buildDocument,
  canSaveProject,
  describeIssues,
  duplicateProject,
  escapeScript,
  exportHtml,
  exportName,
  isSandboxSafe,
  makeProject,
  parseConsoleMessage,
  projectSize,
  removeProject,
  renameProject,
  templateById,
  upsertProject,
} from "./features/code/codeDomain";

describe("caixa de areia da prévia", () => {
  it("nunca junta allow-scripts com allow-same-origin", () => {
    // Os dois juntos devolvem ao código escrito na tela a origem do app: ele
    // passaria a ler o localStorage (onde está o token de login) e a chamar a
    // /api com a sessão de quem está usando. Este teste existe para que
    // ninguém "conserte" a prévia adicionando same-origin.
    expect(SANDBOX).toBe("allow-scripts");
    expect(isSandboxSafe(SANDBOX)).toBe(true);
  });

  it("reconhece a combinação perigosa", () => {
    expect(isSandboxSafe("allow-scripts allow-same-origin")).toBe(false);
    expect(isSandboxSafe("allow-same-origin allow-scripts allow-forms")).toBe(
      false,
    );
  });

  it("sem script, same-origin não é problema", () => {
    expect(isSandboxSafe("allow-same-origin")).toBe(true);
  });

  it("valor vazio não é tratado como perigoso", () => {
    expect(isSandboxSafe("")).toBe(true);
    expect(isSandboxSafe(null)).toBe(true);
  });
});

describe("buildDocument", () => {
  it("junta HTML, CSS e JS num documento que abre", () => {
    const doc = buildDocument({
      html: "<h1>Oi</h1>",
      css: "h1{color:red}",
      js: "console.log(1)",
    });
    expect(doc).toContain("<!doctype html>");
    expect(doc).toContain("<h1>Oi</h1>");
    expect(doc).toContain("h1{color:red}");
    expect(doc).toContain("console.log(1)");
  });

  it("escapa </script> dentro do JavaScript", () => {
    // Sem isto, a tag fecha o documento inteiro e a prévia quebra de um jeito
    // que ninguém consegue diagnosticar.
    const doc = buildDocument({ js: 'var s = "</script>";' });
    expect(doc).not.toContain('"</script>"');
    expect(doc).toContain("<\\/script>");
  });

  it("escapa em qualquer caixa de letra", () => {
    expect(escapeScript("</SCRIPT>")).toBe("<\\/SCRIPT>");
    expect(escapeScript("</ScRiPt >")).toBe("<\\/ScRiPt >");
  });

  it("leva a ponte do console, senão o erro acontece e a tela não faz nada", () => {
    expect(buildDocument({})).toContain("__seufuncionario");
  });

  it("o arquivo para baixar sai sem a ponte, que só serve dentro do app", () => {
    const arquivo = exportHtml({ html: "<h1>Oi</h1>" });
    expect(arquivo).toContain("<h1>Oi</h1>");
    expect(arquivo).not.toContain("__seufuncionario");
  });

  it("projeto vazio ainda gera documento válido", () => {
    expect(buildDocument({})).toContain("<html");
    expect(buildDocument()).toContain("<html");
  });

  it("declara português e viewport, para a prévia bater com o celular", () => {
    const doc = buildDocument({});
    expect(doc).toContain('lang="pt-BR"');
    expect(doc).toContain("width=device-width");
  });
});

describe("mensagens vindas da prévia", () => {
  it("aceita o que está no nosso formato", () => {
    expect(
      parseConsoleMessage({
        __seufuncionario: "console",
        nivel: "error",
        texto: "quebrou",
      }),
    ).toEqual({ nivel: "error", texto: "quebrou" });
  });

  it("descarta mensagem de terceiro, que poderia forjar linha de console", () => {
    expect(parseConsoleMessage({ nivel: "log", texto: "oi" })).toBeNull();
    expect(parseConsoleMessage({ __seufuncionario: "outro" })).toBeNull();
    expect(parseConsoleMessage("texto solto")).toBeNull();
    expect(parseConsoleMessage(null)).toBeNull();
  });

  it("nível desconhecido vira log em vez de passar direto", () => {
    expect(
      parseConsoleMessage({
        __seufuncionario: "console",
        nivel: "<script>",
        texto: "x",
      }).nivel,
    ).toBe("log");
  });

  it("corta texto gigante em vez de travar a tela", () => {
    const r = parseConsoleMessage({
      __seufuncionario: "console",
      nivel: "log",
      texto: "a".repeat(9999),
    });
    expect(r.texto.length).toBe(2000);
  });
});

describe("appendLog", () => {
  it("acumula na ordem", () => {
    let logs = appendLog([], { nivel: "log", texto: "um" });
    logs = appendLog(logs, { nivel: "log", texto: "dois" });
    expect(logs.map((l) => l.texto)).toEqual(["um", "dois"]);
  });

  it("um laço acidental não trava a tela: guarda só as últimas linhas", () => {
    let logs = [];
    for (let i = 0; i < 500; i++)
      logs = appendLog(logs, { nivel: "log", texto: `linha ${i}` });
    expect(logs).toHaveLength(MAX_LOGS);
    expect(logs[logs.length - 1].texto).toBe("linha 499");
  });

  it("entrada vazia não polui a lista", () => {
    expect(appendLog([{ texto: "x" }], null)).toHaveLength(1);
  });
});

describe("projetos", () => {
  it("cria com nome limpo", () => {
    expect(makeProject({ name: "  Meu site  " }).name).toBe("Meu site");
  });

  it("sem nome, não fica em branco na lista", () => {
    expect(makeProject({}).name).toBe("Sem título");
  });

  it("renomear para vazio mantém o nome antigo", () => {
    const p = makeProject({ name: "Original" });
    expect(renameProject(p, "   ").name).toBe("Original");
  });

  it("duplicar gera id novo e nome que dá para diferenciar", () => {
    const p = makeProject({ name: "Cartão", html: "<h1>x</h1>" });
    const copia = duplicateProject(p);
    expect(copia.id).not.toBe(p.id);
    expect(copia.name).toBe("Cartão (cópia)");
    expect(copia.html).toBe("<h1>x</h1>");
  });

  it("guardar atualiza no lugar em vez de duplicar", () => {
    const p = makeProject({ name: "A" });
    const lista = upsertProject([], p);
    const depois = upsertProject(lista, { ...p, name: "B" });
    expect(depois).toHaveLength(1);
    expect(depois[0].name).toBe("B");
  });

  it("projeto sem id não entra", () => {
    expect(upsertProject([], { name: "sem id" })).toHaveLength(0);
  });

  it("apaga pelo id", () => {
    const p = makeProject({});
    expect(removeProject([p], p.id)).toHaveLength(0);
    expect(removeProject([p], "outro")).toHaveLength(1);
  });
});

describe("pontos de partida", () => {
  it("todos os modelos abrem com algo na tela", () => {
    for (const t of TEMPLATES) {
      expect(t.label).toBeTruthy();
      expect(buildDocument(t)).toContain("<html");
    }
  });

  it("id desconhecido cai no primeiro em vez de quebrar", () => {
    expect(templateById("nao-existe")).toBe(TEMPLATES[0]);
  });
});

describe("describeIssues", () => {
  it("avisa chave de CSS que ficou aberta", () => {
    const a = describeIssues({ css: "body { color: red;" });
    expect(a.some((x) => x.onde === "CSS")).toBe(true);
  });

  it("CSS equilibrado não gera aviso", () => {
    expect(describeIssues({ css: "body { color: red; }" })).toEqual([]);
  });

  it("avisa tag HTML que não foi fechada", () => {
    const a = describeIssues({ html: "<div><p>oi</p>" });
    expect(a.some((x) => x.texto.includes("<div>"))).toBe(true);
  });

  it("explica que localStorage não funciona na prévia, e por quê", () => {
    const a = describeIssues({ js: "localStorage.setItem('x',1)" });
    expect(a[0].texto).toContain("caixa isolada");
  });

  it("avisa endereço http:// que o navegador vai bloquear", () => {
    const a = describeIssues({ html: '<img src="http://exemplo.com/a.png">' });
    expect(a.some((x) => x.onde === "Endereço")).toBe(true);
  });

  it("avisa que alert() não aparece", () => {
    const a = describeIssues({ js: "alert('oi')" });
    expect(a.some((x) => x.texto.includes("alert()"))).toBe(true);
  });

  it("projeto limpo não inventa problema", () => {
    expect(
      describeIssues({
        html: "<div><p>oi</p></div>",
        css: "p { color: blue; }",
        js: "console.log('ok')",
      }),
    ).toEqual([]);
  });
});

describe("tamanho e nome do arquivo", () => {
  it("mede o projeto inteiro", () => {
    expect(projectSize({ html: "12", css: "345", js: "6" })).toBe(6);
  });

  it("projeto gigante não vai para o espaço de trabalho", () => {
    expect(canSaveProject({ html: "a".repeat(MAX_PROJECT_CHARS) })).toBe(true);
    expect(canSaveProject({ html: "a".repeat(MAX_PROJECT_CHARS + 1) })).toBe(
      false,
    );
  });

  it("nome de arquivo não carrega caractere que quebra o download", () => {
    expect(exportName('meu/site:novo')).toBe("meu-site-novo.html");
  });

  it("sem nome, ainda gera arquivo utilizável", () => {
    expect(exportName("")).toBe("pagina.html");
  });
});
