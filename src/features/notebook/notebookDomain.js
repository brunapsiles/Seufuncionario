// ===== Notebook de dados =====
// Camada pura: lê os dados que já existem no espaço de trabalho e responde
// perguntas sobre eles.
//
// A decisão central: NADA aqui executa código. As consultas são escritas numa
// linguagem pequena, em português, que este arquivo interpreta passo a passo.
// A alternativa óbvia — deixar a pessoa escrever JavaScript e rodar com eval —
// abriria um caminho para qualquer texto colado de fora executar dentro do app,
// com acesso ao token de login. Uma lista fechada de comandos custa mais para
// escrever e não tem essa porta.

const num = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const limpo = String(v ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
};

const texto = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // marcas de acento
    .toLowerCase()
    .trim();

// ---------------------------------------------------------------------------
// De onde vêm os dados
// ---------------------------------------------------------------------------

// Só coleções que já existem no espaço de trabalho. O notebook não inventa
// dado nem busca nada fora: ele responde sobre o que o negócio já registrou.
export const SOURCES = [
  {
    id: "transacoes",
    label: "Financeiro (entradas e saídas)",
    collection: "transactions",
    // Nome do campo JÁ MAPEADO, não o da coleção crua: quem lê daqui em diante
    // só enxerga as linhas traduzidas para português.
    dateField: "data",
    fields: ["tipo", "valor", "categoria", "descricao", "data"],
    map: (t) => ({
      tipo: t.type === "income" ? "receita" : "despesa",
      valor: num(t.amount ?? t.value),
      categoria: t.category || "sem categoria",
      descricao: t.description || t.title || "",
      data: t.date || t.createdAt || "",
    }),
  },
  {
    id: "tarefas",
    label: "Tarefas",
    collection: "tasks",
    dateField: "prazo",
    fields: ["titulo", "status", "prioridade", "responsavel", "prazo"],
    map: (t) => ({
      titulo: t.title || t.name || "",
      status: t.done ? "concluida" : t.status || "aberta",
      prioridade: t.priority || "normal",
      responsavel: t.assignee || t.ownerId || "sem responsável",
      prazo: t.dueDate || t.due || "",
    }),
  },
  {
    id: "pedidos",
    label: "Pedidos",
    collection: "orders",
    dateField: "data",
    fields: ["cliente", "valor", "status", "data"],
    map: (o) => ({
      cliente: o.customer || o.contactName || "sem cliente",
      valor: num(o.total ?? o.amount),
      status: o.status || "aberto",
      data: o.createdAt || o.date || "",
    }),
  },
  {
    id: "contatos",
    label: "Contatos",
    collection: "contacts",
    dateField: "cadastro",
    fields: ["nome", "origem", "etiqueta", "cadastro"],
    map: (c) => ({
      nome: c.name || "",
      origem: c.source || "não informado",
      etiqueta: (c.tags || []).join(", ") || "sem etiqueta",
      cadastro: c.createdAt || "",
    }),
  },
  {
    id: "agendamentos",
    label: "Agendamentos",
    collection: "appointments",
    dateField: "data",
    fields: ["cliente", "servico", "status", "data"],
    map: (a) => ({
      cliente: a.client || a.customer || "sem cliente",
      servico: a.service || a.title || "",
      status: a.status || "marcado",
      data: a.date || a.start || "",
    }),
  },
  {
    id: "contas",
    label: "Contas a pagar",
    collection: "bills",
    dateField: "vencimento",
    fields: ["fornecedor", "valor", "status", "vencimento"],
    map: (b) => ({
      fornecedor: b.supplier || b.name || "sem fornecedor",
      valor: num(b.amount ?? b.value),
      status: b.paidAt ? "paga" : "em aberto",
      vencimento: b.dueDate || b.due || "",
    }),
  },
  {
    id: "horas",
    label: "Horas trabalhadas",
    collection: "timeEntries",
    dateField: "data",
    fields: ["projeto", "horas", "pessoa", "data"],
    map: (h) => ({
      projeto: h.project || h.taskTitle || "sem projeto",
      horas: num(h.hours ?? h.minutes / 60),
      pessoa: h.userId || h.ownerId || "sem responsável",
      data: h.date || h.createdAt || "",
    }),
  },
];

export const sourceById = (id) => SOURCES.find((s) => s.id === id) || SOURCES[0];

export const loadSource = (db, id, businessId) => {
  const fonte = sourceById(id);
  const bruto = db?.[fonte.collection] || [];
  return bruto
    .filter(
      (x) => !businessId || !x?.businessId || x.businessId === businessId,
    )
    .map((x) => {
      try {
        return fonte.map(x);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

// ---------------------------------------------------------------------------
// A linguagem
// ---------------------------------------------------------------------------

export const COMMANDS = [
  { nome: "filtrar", exemplo: "filtrar tipo = receita", ajuda: "Fica só com as linhas que batem. Aceita =, !=, >, <, >=, <= e contem." },
  { nome: "periodo", exemplo: "periodo ultimos 30 dias", ajuda: "Fica só com o que aconteceu nesse intervalo." },
  { nome: "agrupar", exemplo: "agrupar categoria", ajuda: "Junta as linhas iguais. Em campo de data aceita agrupar mes, dia ou ano." },
  { nome: "somar", exemplo: "somar valor", ajuda: "Soma o campo." },
  { nome: "media", exemplo: "media valor", ajuda: "Tira a média do campo." },
  { nome: "contar", exemplo: "contar", ajuda: "Conta quantas linhas há." },
  { nome: "maximo", exemplo: "maximo valor", ajuda: "Pega o maior." },
  { nome: "minimo", exemplo: "minimo valor", ajuda: "Pega o menor." },
  { nome: "ordenar", exemplo: "ordenar total desc", ajuda: "Ordena o resultado." },
  { nome: "limite", exemplo: "limite 10", ajuda: "Mostra só as primeiras linhas." },
];

const OPERADORES = ["!=", ">=", "<=", "=", ">", "<", "contem"];

// Cada linha é um passo. Linha em branco e linha começando com # são ignoradas,
// para a pessoa poder comentar a própria consulta.
export const parsePipeline = (fonteTexto) => {
  const passos = [];
  const erros = [];
  const linhas = String(fonteTexto || "").split("\n");

  linhas.forEach((linhaBruta, i) => {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith("#")) return;
    const partes = linha.split(/\s+/);
    const comando = texto(partes[0]);
    const resto = partes.slice(1);
    const numeroLinha = i + 1;

    const falha = (msg) => erros.push({ linha: numeroLinha, texto: msg });

    switch (comando) {
      case "filtrar": {
        const posOp = resto.findIndex((p) => OPERADORES.includes(texto(p)));
        if (posOp < 1 || posOp === resto.length - 1)
          return falha(
            'Escreva assim: filtrar campo = valor. Exemplo: filtrar tipo = receita',
          );
        passos.push({
          tipo: "filtrar",
          campo: texto(resto.slice(0, posOp).join(" ")),
          operador: texto(resto[posOp]),
          valor: resto.slice(posOp + 1).join(" "),
        });
        return;
      }
      case "periodo": {
        const n = Number(resto.find((p) => /^\d+$/.test(p)));
        if (!Number.isFinite(n) || n <= 0)
          return falha("Escreva assim: periodo ultimos 30 dias");
        passos.push({ tipo: "periodo", dias: n });
        return;
      }
      case "agrupar": {
        if (!resto.length) return falha("Diga por qual campo agrupar.");
        passos.push({ tipo: "agrupar", campo: texto(resto.join(" ")) });
        return;
      }
      case "somar":
      case "media":
      case "maximo":
      case "minimo": {
        if (!resto.length)
          return falha(`Diga qual campo ${comando}. Exemplo: ${comando} valor`);
        passos.push({ tipo: comando, campo: texto(resto.join(" ")) });
        return;
      }
      case "contar":
        passos.push({ tipo: "contar" });
        return;
      case "ordenar": {
        if (!resto.length) return falha("Diga por qual campo ordenar.");
        const direcao = texto(resto[resto.length - 1]);
        const desc = direcao === "desc" || direcao === "decrescente";
        const asc = direcao === "asc" || direcao === "crescente";
        passos.push({
          tipo: "ordenar",
          campo: texto((desc || asc ? resto.slice(0, -1) : resto).join(" ")),
          desc,
        });
        return;
      }
      case "limite": {
        const n = Number(resto[0]);
        if (!Number.isFinite(n) || n <= 0)
          return falha("Escreva assim: limite 10");
        passos.push({ tipo: "limite", n: Math.floor(n) });
        return;
      }
      default:
        falha(
          `Não conheço o comando "${partes[0]}". Os que existem: ${COMMANDS.map((c) => c.nome).join(", ")}.`,
        );
    }
  });

  return { passos, erros };
};

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const comparar = (valorLinha, operador, valorAlvo) => {
  if (operador === "contem") return texto(valorLinha).includes(texto(valorAlvo));
  const numerico =
    typeof valorLinha === "number" || /^-?[\d.,]+$/.test(String(valorAlvo).trim());
  if (numerico) {
    const a = num(valorLinha);
    const b = num(valorAlvo);
    if (operador === "=") return a === b;
    if (operador === "!=") return a !== b;
    if (operador === ">") return a > b;
    if (operador === "<") return a < b;
    if (operador === ">=") return a >= b;
    if (operador === "<=") return a <= b;
  }
  const a = texto(valorLinha);
  const b = texto(valorAlvo);
  if (operador === "=") return a === b;
  if (operador === "!=") return a !== b;
  if (operador === ">") return a > b;
  if (operador === "<") return a < b;
  if (operador === ">=") return a >= b;
  if (operador === "<=") return a <= b;
  return false;
};

const chaveDeGrupo = (linha, campo, campoData) => {
  if (["mes", "dia", "ano"].includes(campo)) {
    const iso = String(linha[campoData] || "");
    const d = iso.slice(0, 10);
    if (!d) return "sem data";
    if (campo === "ano") return d.slice(0, 4);
    if (campo === "mes") return d.slice(0, 7);
    return d;
  }
  const v = linha[campo];
  return v === undefined || v === null || v === "" ? "sem valor" : String(v);
};

const agregar = (tipo, linhas, campo) => {
  if (tipo === "contar") return linhas.length;
  const valores = linhas.map((l) => num(l[campo]));
  if (!valores.length) return 0;
  if (tipo === "somar") return valores.reduce((a, b) => a + b, 0);
  if (tipo === "media")
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  if (tipo === "maximo") return Math.max(...valores);
  if (tipo === "minimo") return Math.min(...valores);
  return 0;
};

const NOME_AGREGACAO = {
  somar: "total",
  media: "media",
  maximo: "maximo",
  minimo: "minimo",
  contar: "quantidade",
};

export const runPipeline = (dados, passos = [], opcoes = {}) => {
  const fonte = sourceById(opcoes.sourceId);
  const agora = opcoes.now ? new Date(opcoes.now) : new Date();
  let linhas = Array.isArray(dados) ? [...dados] : [];
  const avisos = [];
  let grupo = null;

  for (const passo of passos) {
    if (passo.tipo === "filtrar") {
      if (linhas.length && !(passo.campo in linhas[0]))
        avisos.push(
          `O campo "${passo.campo}" não existe nesta fonte. Campos: ${fonte.fields.join(", ")}.`,
        );
      linhas = linhas.filter((l) =>
        comparar(l[passo.campo], passo.operador, passo.valor),
      );
    } else if (passo.tipo === "periodo") {
      const limite = new Date(agora);
      limite.setDate(limite.getDate() - passo.dias);
      linhas = linhas.filter((l) => {
        const d = String(l[fonte.dateField] || "").slice(0, 10);
        return d ? new Date(d) >= limite : false;
      });
    } else if (passo.tipo === "agrupar") {
      grupo = passo.campo;
    } else if (
      ["somar", "media", "contar", "maximo", "minimo"].includes(passo.tipo)
    ) {
      const nome = NOME_AGREGACAO[passo.tipo];
      if (grupo) {
        const mapa = new Map();
        for (const l of linhas) {
          const chave = chaveDeGrupo(l, grupo, fonte.dateField);
          if (!mapa.has(chave)) mapa.set(chave, []);
          mapa.get(chave).push(l);
        }
        linhas = [...mapa.entries()].map(([chave, itens]) => ({
          [grupo]: chave,
          [nome]: agregar(passo.tipo, itens, passo.campo),
        }));
      } else {
        linhas = [{ [nome]: agregar(passo.tipo, linhas, passo.campo) }];
      }
      grupo = null;
    } else if (passo.tipo === "ordenar") {
      linhas.sort((a, b) => {
        const va = a[passo.campo];
        const vb = b[passo.campo];
        const ambosNumeros =
          typeof va === "number" && typeof vb === "number";
        const cmp = ambosNumeros
          ? va - vb
          : String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR");
        return passo.desc ? -cmp : cmp;
      });
    } else if (passo.tipo === "limite") {
      linhas = linhas.slice(0, passo.n);
    }
  }

  // Agrupar sem nenhuma conta depois é o engano mais comum. Em vez de devolver
  // resultado vazio sem explicação, contamos — que é o que a pessoa queria.
  if (grupo) {
    const mapa = new Map();
    for (const l of linhas) {
      const chave = chaveDeGrupo(l, grupo, fonte.dateField);
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    }
    linhas = [...mapa.entries()].map(([chave, total]) => ({
      [grupo]: chave,
      quantidade: total,
    }));
    avisos.push(
      `Agrupei por "${grupo}" e contei as linhas. Para outra conta, acrescente por exemplo "somar valor".`,
    );
  }

  const colunas = linhas.length ? Object.keys(linhas[0]) : [];
  return { linhas, colunas, avisos };
};

// ---------------------------------------------------------------------------
// Apresentação do resultado
// ---------------------------------------------------------------------------

// Só sugere gráfico quando ele diz alguma coisa: uma coluna de rótulo e uma de
// número, com poucas linhas. Gráfico de 300 barras não é leitura, é enfeite.
export const suggestChart = ({ linhas = [], colunas = [] } = {}) => {
  if (linhas.length < 2 || linhas.length > 30) return null;
  if (colunas.length !== 2) return null;
  const [rotulo, valor] = colunas;
  if (typeof linhas[0][valor] !== "number") return null;
  return { rotulo, valor, maximo: Math.max(...linhas.map((l) => num(l[valor]))) };
};

export const formatCell = (valor) => {
  if (typeof valor === "number") {
    const arredondado = Math.round(valor * 100) / 100;
    return arredondado.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  return String(valor ?? "");
};

export const toCsv = ({ linhas = [], colunas = [] } = {}) => {
  if (!colunas.length) return "";
  const escapa = (v) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    colunas.map(escapa).join(";"),
    ...linhas.map((l) => colunas.map((c) => escapa(l[c])).join(";")),
  ].join("\n");
};

// ---------------------------------------------------------------------------
// Células do notebook
// ---------------------------------------------------------------------------

export const CELL_TYPES = ["texto", "consulta"];

export const makeCell = ({ id, tipo = "consulta", ...resto } = {}) => ({
  id: id || `cel-${Math.random().toString(36).slice(2, 10)}`,
  tipo: CELL_TYPES.includes(tipo) ? tipo : "consulta",
  titulo: resto.titulo || "",
  texto: resto.texto || "",
  fonte: resto.fonte || SOURCES[0].id,
  consulta: resto.consulta || "",
});

export const makeNotebook = ({ id, name } = {}) => ({
  id: id || `nb-${Math.random().toString(36).slice(2, 10)}`,
  name: String(name || "").trim().slice(0, 60) || "Notebook sem título",
  cells: [makeCell({ tipo: "consulta" })],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const moveCell = (cells = [], id, direcao) => {
  const lista = [...(Array.isArray(cells) ? cells : [])];
  const i = lista.findIndex((c) => c?.id === id);
  if (i < 0) return lista;
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (j < 0 || j >= lista.length) return lista;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return lista;
};

export const removeCell = (cells = [], id) => {
  const lista = (Array.isArray(cells) ? cells : []).filter((c) => c?.id !== id);
  // Notebook sem célula nenhuma vira uma tela vazia sem saída.
  return lista.length ? lista : [makeCell({})];
};

export const updateCell = (cells = [], id, mudancas) =>
  (Array.isArray(cells) ? cells : []).map((c) =>
    c?.id === id ? { ...c, ...mudancas } : c,
  );

// Receitas prontas: quem nunca escreveu consulta começa daqui e vai ajustando.
export const RECIPES = [
  {
    label: "Quanto entrou por mês",
    fonte: "transacoes",
    consulta: "filtrar tipo = receita\nagrupar mes\nsomar valor\nordenar mes",
  },
  {
    label: "Onde mais gastei",
    fonte: "transacoes",
    consulta:
      "filtrar tipo = despesa\nagrupar categoria\nsomar valor\nordenar total desc\nlimite 10",
  },
  {
    label: "Entradas dos últimos 30 dias",
    fonte: "transacoes",
    consulta: "periodo ultimos 30 dias\nfiltrar tipo = receita\nsomar valor",
  },
  {
    label: "Tarefas em aberto por responsável",
    fonte: "tarefas",
    consulta: "filtrar status != concluida\nagrupar responsavel\ncontar",
  },
  {
    label: "Meus melhores clientes",
    fonte: "pedidos",
    consulta: "agrupar cliente\nsomar valor\nordenar total desc\nlimite 10",
  },
  {
    label: "Contas em aberto",
    fonte: "contas",
    consulta: "filtrar status = em aberto\nsomar valor",
  },
];
