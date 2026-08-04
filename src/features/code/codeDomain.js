// ===== Editor de código com prévia ao vivo =====
// Camada pura: monta o documento, valida e organiza os projetos. Nada aqui
// toca no DOM nem executa código.
//
// A decisão que manda em tudo neste arquivo é de segurança. A prévia roda
// dentro de um iframe com `sandbox="allow-scripts"` e SEM `allow-same-origin`.
// Os dois juntos anulariam a caixa: o código escrito na tela passaria a rodar
// na mesma origem do app e poderia ler o `localStorage` — onde está o token de
// login — e chamar /api com a sessão de quem está usando. Como o app é
// multiusuário, isso não é "risco teórico": é conta de uma pessoa acessando o
// negócio de outra. Ver `SANDBOX` e o teste que o trava.

export const SANDBOX = "allow-scripts";

// Guarda explícita para quem mexer aqui depois. `allow-same-origin` junto de
// `allow-scripts` devolve ao código previsualizado a origem do app inteiro.
export const isSandboxSafe = (valor) => {
  const partes = String(valor || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.includes("allow-scripts")) return true; // sem script, sem risco
  return !partes.includes("allow-same-origin");
};

const texto = (v) => String(v ?? "");

// ---------------------------------------------------------------------------
// Projeto
// ---------------------------------------------------------------------------

export const makeProject = ({ id, name, html, css, js } = {}) => ({
  id: id || `code-${Math.random().toString(36).slice(2, 10)}`,
  name: texto(name).trim().slice(0, 60) || "Sem título",
  html: texto(html),
  css: texto(css),
  js: texto(js),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const renameProject = (projeto, nome) => ({
  ...projeto,
  name: texto(nome).trim().slice(0, 60) || projeto?.name || "Sem título",
  updatedAt: new Date().toISOString(),
});

export const duplicateProject = (projeto) => ({
  ...makeProject(projeto),
  id: `code-${Math.random().toString(36).slice(2, 10)}`,
  name: `${projeto?.name || "Sem título"} (cópia)`.slice(0, 60),
});

export const upsertProject = (lista = [], projeto) => {
  const atual = Array.isArray(lista) ? lista : [];
  if (!projeto?.id) return atual;
  return atual.some((p) => p?.id === projeto.id)
    ? atual.map((p) => (p?.id === projeto.id ? projeto : p))
    : [projeto, ...atual];
};

export const removeProject = (lista = [], id) =>
  (Array.isArray(lista) ? lista : []).filter((p) => p?.id !== id);

// ---------------------------------------------------------------------------
// Pontos de partida
// ---------------------------------------------------------------------------

// Não são exemplos de programador: são peças que um negócio pequeno realmente
// publica. Quem nunca escreveu código consegue trocar o texto e usar.
export const TEMPLATES = [
  {
    id: "vazio",
    label: "Em branco",
    html: "<h1>Olá</h1>\n<p>Escreva aqui.</p>",
    css: "body { font-family: system-ui; padding: 24px; }",
    js: "",
  },
  {
    id: "cartao",
    label: "Cartão de visita",
    html: `<main class="cartao">
  <h1>Doces da Ana</h1>
  <p>Bolos e doces artesanais sob encomenda</p>
  <a class="zap" href="https://wa.me/5511999999999">Falar no WhatsApp</a>
</main>`,
    css: `body { margin:0; min-height:100vh; display:grid; place-items:center;
  font-family: system-ui; background:#f2fbf8; }
.cartao { text-align:center; padding:40px 28px; border-radius:20px;
  background:#fff; box-shadow:0 18px 50px rgba(11,159,143,.14); }
.cartao h1 { margin:0 0 6px; }
.cartao p { color:#5b6f6d; margin:0 0 20px; }
.zap { display:inline-block; padding:12px 22px; border-radius:12px;
  background:#25d366; color:#fff; text-decoration:none; font-weight:700; }`,
    js: "",
  },
  {
    id: "formulario",
    label: "Formulário de pedido",
    html: `<form id="pedido">
  <h2>Fazer pedido</h2>
  <label>Seu nome <input name="nome" required></label>
  <label>O que deseja <input name="item" required></label>
  <label>Quantidade <input name="qtd" type="number" min="1" value="1"></label>
  <button>Enviar pelo WhatsApp</button>
</form>`,
    css: `body { font-family: system-ui; padding:24px; background:#fafafa; }
form { display:grid; gap:12px; max-width:380px; margin:0 auto; padding:24px;
  background:#fff; border-radius:16px; }
label { display:grid; gap:5px; font-size:14px; font-weight:600; }
input { padding:10px; border:1px solid #ddd; border-radius:9px; font:inherit; }
button { padding:12px; border:0; border-radius:10px; background:#0b9f8f;
  color:#fff; font-weight:700; cursor:pointer; }`,
    js: `document.getElementById("pedido").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = new FormData(e.target);
  const texto = \`Olá! Sou \${d.get("nome")} e quero \${d.get("qtd")}x \${d.get("item")}.\`;
  console.log("Mensagem pronta:", texto);
});`,
  },
  {
    id: "precos",
    label: "Tabela de preços",
    html: `<section class="precos">
  <article><h3>Simples</h3><strong>R$ 60</strong><p>Bolo de 1 andar</p></article>
  <article class="destaque"><h3>Festa</h3><strong>R$ 140</strong><p>Bolo de 2 andares</p></article>
  <article><h3>Casamento</h3><strong>sob consulta</strong><p>Projeto exclusivo</p></article>
</section>`,
    css: `body { font-family: system-ui; padding:24px; background:#f2fbf8; }
.precos { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr)); }
article { padding:22px; border-radius:16px; background:#fff; text-align:center; }
.destaque { outline:2px solid #0b9f8f; }
strong { display:block; font-size:26px; margin:8px 0; color:#0b9f8f; }
p { color:#5b6f6d; margin:0; }`,
    js: "",
  },
];

export const templateById = (id) =>
  TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

// ---------------------------------------------------------------------------
// Montagem do documento
// ---------------------------------------------------------------------------

// `</script>` dentro de uma string de JS fecha a tag do documento inteiro e
// quebra a prévia de um jeito que ninguém entende. Escapar a barra resolve sem
// mudar o que o código faz.
export const escapeScript = (js) => texto(js).replace(/<\/(script)/gi, "<\\/$1");

// Ponte do console: o código da prévia roda numa caixa isolada, então a única
// forma de a pessoa ver um erro é mandarmos a mensagem para fora. Sem isso, o
// erro acontece e a tela simplesmente não faz nada.
const PONTE = `<script>(function(){
  var envia=function(nivel,args){
    try{
      parent.postMessage({__seufuncionario:"console",nivel:nivel,
        texto:Array.prototype.map.call(args,function(a){
          try{return typeof a==="string"?a:JSON.stringify(a);}catch(e){return String(a);}
        }).join(" ")},"*");
    }catch(e){}
  };
  ["log","warn","error","info"].forEach(function(n){
    var orig=console[n];
    console[n]=function(){envia(n,arguments);try{orig.apply(console,arguments);}catch(e){}};
  });
  window.addEventListener("error",function(e){envia("error",[e.message+" (linha "+e.lineno+")"]);});
  window.addEventListener("unhandledrejection",function(e){envia("error",["Promessa rejeitada: "+e.reason]);});
})();</script>`;

export const buildDocument = ({ html = "", css = "", js = "" } = {}, opcoes = {}) => {
  const comPonte = opcoes.console !== false;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${texto(css)}</style>
</head>
<body>
${texto(html)}
${comPonte ? PONTE : ""}
<script>${escapeScript(js)}</script>
</body>
</html>`;
};

// Arquivo único para baixar: sem a ponte do console, que só serve dentro do app.
export const exportHtml = (projeto = {}) =>
  buildDocument(projeto, { console: false });

export const exportName = (nome) =>
  `${texto(nome)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 60) || "pagina"}.html`;

// ---------------------------------------------------------------------------
// Mensagens vindas da prévia
// ---------------------------------------------------------------------------

// A prévia não tem origem própria (o navegador dá a ela a origem opaca "null"),
// então conferir `event.origin` não protege nada. Quem chama precisa conferir
// a IDENTIDADE da janela — `event.source === iframe.contentWindow` — e este
// parse ainda descarta qualquer coisa fora do nosso formato, para uma extensão
// ou outra aba não conseguir injetar linha falsa no console.
export const parseConsoleMessage = (data) => {
  if (!data || typeof data !== "object") return null;
  if (data.__seufuncionario !== "console") return null;
  const nivel = ["log", "warn", "error", "info"].includes(data.nivel)
    ? data.nivel
    : "log";
  return { nivel, texto: texto(data.texto).slice(0, 2000) };
};

export const MAX_LOGS = 60;

export const appendLog = (logs = [], entrada) => {
  if (!entrada) return Array.isArray(logs) ? logs : [];
  const lista = [...(Array.isArray(logs) ? logs : []), { ...entrada, id: `${Date.now()}-${Math.random()}` }];
  // Corta pelo começo: um laço acidental joga milhares de linhas e travaria a
  // tela se a gente guardasse tudo.
  return lista.slice(-MAX_LOGS);
};

// ---------------------------------------------------------------------------
// Conferências antes de rodar
// ---------------------------------------------------------------------------

// Não é um validador de verdade — é um punhado de avisos para quem está
// começando não ficar meia hora olhando uma tela branca sem entender.
export const describeIssues = ({ html = "", css = "", js = "" } = {}) => {
  const avisos = [];
  const h = texto(html);
  const c = texto(css);
  const j = texto(js);

  const abre = (c.match(/\{/g) || []).length;
  const fecha = (c.match(/\}/g) || []).length;
  if (abre !== fecha)
    avisos.push({
      onde: "CSS",
      texto: `Há ${abre} "{" e ${fecha} "}". Falta fechar alguma chave — o resto do estilo depois disso não vale.`,
    });

  for (const tag of ["div", "section", "form", "main", "article", "p"]) {
    const a = (h.match(new RegExp(`<${tag}[\\s>]`, "gi")) || []).length;
    const f = (h.match(new RegExp(`</${tag}>`, "gi")) || []).length;
    if (a > f)
      avisos.push({
        onde: "HTML",
        texto: `A tag <${tag}> foi aberta ${a}x e fechada ${f}x.`,
      });
  }

  if (/\blocalStorage\b|\bdocument\.cookie\b|\bsessionStorage\b/.test(j))
    avisos.push({
      onde: "JavaScript",
      texto:
        "localStorage e cookie não funcionam na prévia: ela roda numa caixa isolada, de propósito, para o código não alcançar os seus dados. Na sua hospedagem vai funcionar.",
    });

  if (/http:\/\//.test(h + c + j))
    avisos.push({
      onde: "Endereço",
      texto:
        "Há um endereço http:// (sem s). Navegador moderno bloqueia isso dentro de uma página segura. Use https://.",
    });

  if (/\balert\s*\(/.test(j))
    avisos.push({
      onde: "JavaScript",
      texto: "alert() é bloqueado na prévia. Use console.log() para ver o valor.",
    });

  return avisos;
};

// ---------------------------------------------------------------------------
// Tamanho
// ---------------------------------------------------------------------------

export const projectSize = (projeto = {}) =>
  texto(projeto.html).length + texto(projeto.css).length + texto(projeto.js).length;

export const MAX_PROJECT_CHARS = 120_000;

export const canSaveProject = (projeto) =>
  projectSize(projeto) <= MAX_PROJECT_CHARS;

export const LANGUAGES = [
  { id: "html", label: "HTML", hint: "O conteúdo da página" },
  { id: "css", label: "CSS", hint: "A aparência" },
  { id: "js", label: "JavaScript", hint: "O comportamento" },
];
