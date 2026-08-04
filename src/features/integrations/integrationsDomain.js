// ===== Integrações: entrar e sair com os dados =====
// Camada pura. Trata o que o negócio precisa para NÃO ficar preso no app:
// trazer o que já está numa planilha, levar o que está aqui para qualquer
// outro lugar, e publicar a agenda em qualquer calendário.
//
// Tudo roda no aparelho. Nenhuma dessas integrações depende de servidor pago
// nem de conta em serviço de terceiro — foi assim de propósito, para caber na
// promessa de gratuidade.
//
// O envio automático para outro sistema (webhook de saída) NÃO está aqui: ele
// precisa sair do servidor, e não do navegador, senão o navegador bloqueia por
// CORS e o endereço secreto do cliente ficaria visível no aparelho. Ver
// PENDENCIAS_DA_TITULAR.md.

const texto = (v) => String(v ?? "");

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

// Detecta o separador em vez de exigir um. Planilha brasileira sai com ";" e
// planilha em inglês com "," — obrigar a pessoa a saber disso faria a
// importação falhar sem explicação.
export const detectDelimiter = (linha) => {
  const amostra = texto(linha);
  const conta = (c) => (amostra.split(c).length - 1);
  const candidatos = [";", ",", "\t"].map((c) => [c, conta(c)]);
  candidatos.sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : ";";
};

// Leitor de CSV que respeita aspas: sem isso, "Bolo, 2 andares" vira duas
// colunas e a linha inteira sai torta.
export const parseCsv = (conteudo, delimitador) => {
  const bruto = texto(conteudo).replace(/^\uFEFF/, "");
  if (!bruto.trim()) return { header: [], rows: [] };
  const sep = delimitador || detectDelimiter(bruto.split(/\r?\n/)[0]);

  const linhas = [];
  let campo = "";
  let linha = [];
  let entreAspas = false;

  for (let i = 0; i < bruto.length; i++) {
    const c = bruto[i];
    if (entreAspas) {
      if (c === '"') {
        if (bruto[i + 1] === '"') {
          campo += '"';
          i++;
        } else entreAspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') {
      entreAspas = true;
      continue;
    }
    if (c === sep) {
      linha.push(campo);
      campo = "";
      continue;
    }
    if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
      continue;
    }
    if (c === "\r") continue;
    campo += c;
  }
  linha.push(campo);
  linhas.push(linha);

  const limpas = linhas.filter((l) => l.some((v) => texto(v).trim()));
  if (!limpas.length) return { header: [], rows: [] };
  const header = limpas[0].map((h) => texto(h).trim());
  return {
    header,
    rows: limpas.slice(1).map((l) => {
      const obj = {};
      header.forEach((h, i) => {
        obj[h] = texto(l[i]).trim();
      });
      return obj;
    }),
  };
};

export const toCsv = (linhas = [], colunas) => {
  const cols =
    colunas || (linhas.length ? Object.keys(linhas[0]) : []);
  if (!cols.length) return "";
  const escapa = (v) => {
    const s = texto(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    cols.join(";"),
    ...linhas.map((l) => cols.map((c) => escapa(l[c])).join(";")),
  ].join("\n");
};

// O Excel em português precisa do BOM para abrir acento corretamente. Sem ele
// "Serviço" vira "ServiÃ§o" e a pessoa acha que o app corrompeu o dado.
export const withBom = (conteudo) => `\uFEFF${texto(conteudo)}`;

// ---------------------------------------------------------------------------
// O que dá para importar
// ---------------------------------------------------------------------------

const normalizar = (v) =>
  texto(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // marcas de acento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export const IMPORTS = [
  {
    id: "contatos",
    label: "Contatos",
    collection: "contacts",
    campos: [
      { id: "name", label: "Nome", obrigatorio: true, apelidos: ["nome", "cliente", "contato"] },
      { id: "phone", label: "Telefone", apelidos: ["telefone", "celular", "whatsapp", "fone"] },
      { id: "email", label: "E-mail", apelidos: ["email", "e-mail"] },
      { id: "notes", label: "Observação", apelidos: ["observacao", "obs", "notas"] },
    ],
  },
  {
    id: "produtos",
    label: "Produtos",
    collection: "products",
    campos: [
      { id: "name", label: "Produto", obrigatorio: true, apelidos: ["nome", "produto", "item", "descricao"] },
      { id: "price", label: "Preço", numero: true, apelidos: ["preco", "valor", "price"] },
      { id: "stock", label: "Estoque", numero: true, apelidos: ["estoque", "quantidade", "qtd"] },
    ],
  },
  {
    id: "lancamentos",
    label: "Lançamentos do financeiro",
    collection: "transactions",
    campos: [
      { id: "description", label: "Descrição", obrigatorio: true, apelidos: ["descricao", "historico", "item"] },
      { id: "amount", label: "Valor", numero: true, obrigatorio: true, apelidos: ["valor", "preco", "total"] },
      { id: "date", label: "Data", data: true, apelidos: ["data", "vencimento", "dia"] },
      { id: "category", label: "Categoria", apelidos: ["categoria", "tipo", "classificacao"] },
    ],
  },
];

export const importById = (id) => IMPORTS.find((i) => i.id === id) || IMPORTS[0];

// Adivinha a coluna certa pelo nome. Fazer a pessoa apontar coluna por coluna
// numa planilha de 20 colunas é onde a maioria desiste da importação.
export const guessMapping = (header = [], modeloId) => {
  const modelo = importById(modeloId);
  const mapa = {};
  const usados = new Set();
  for (const campo of modelo.campos) {
    const achado = header.find((h) => {
      if (usados.has(h)) return false;
      const n = normalizar(h);
      return (
        n === normalizar(campo.label) ||
        campo.apelidos?.some((a) => n === normalizar(a))
      );
    });
    if (achado) {
      mapa[campo.id] = achado;
      usados.add(achado);
    }
  }
  return mapa;
};

// Aceita 1.234,56 e 1234.56. Uma planilha brasileira tem vírgula decimal; ler
// isso como inglês transformaria R$ 1.234,56 em 1,23.
export const parseNumber = (v) => {
  const bruto = texto(v).replace(/[^\d,.-]/g, "");
  if (!bruto) return 0;
  const temVirgula = bruto.includes(",");
  const temPonto = bruto.includes(".");
  let limpo = bruto;
  if (temVirgula && temPonto)
    limpo = bruto.lastIndexOf(",") > bruto.lastIndexOf(".")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto.replace(/,/g, "");
  else if (temVirgula) limpo = bruto.replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
};

// Data brasileira (31/12/2026) e ISO (2026-12-31). Ler 03/04 como abril ou
// março muda o mês do lançamento inteiro.
export const parseDate = (v) => {
  const s = texto(v).trim();
  if (!s) return "";
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (br) {
    const [, d, m, a] = br;
    const ano = a.length === 2 ? `20${a}` : a;
    return `${ano}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, a, m, d] = iso;
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
};

// Converte as linhas e diz o que NÃO deu para converter, com o número da linha.
// Importação que descarta em silêncio é pior que importação que falha: a
// pessoa só descobre o buraco meses depois.
export const buildImport = (rows = [], mapping = {}, modeloId) => {
  const modelo = importById(modeloId);
  const prontos = [];
  const recusados = [];

  rows.forEach((linha, i) => {
    const item = {};
    const faltando = [];
    for (const campo of modelo.campos) {
      const coluna = mapping[campo.id];
      const bruto = coluna ? linha[coluna] : "";
      if (campo.obrigatorio && !texto(bruto).trim()) {
        faltando.push(campo.label);
        continue;
      }
      if (campo.numero) item[campo.id] = parseNumber(bruto);
      else if (campo.data) item[campo.id] = parseDate(bruto);
      else item[campo.id] = texto(bruto).trim();
    }
    if (faltando.length)
      recusados.push({ linha: i + 2, motivo: `sem ${faltando.join(" e ")}` });
    else prontos.push(item);
  });

  return { prontos, recusados, modelo };
};

// Não importa duas vezes o mesmo contato só porque a pessoa clicou de novo.
export const dedupe = (novos = [], existentes = [], chave = "name") => {
  const jaTem = new Set(
    existentes.map((e) => normalizar(e?.[chave] || e?.name || "")),
  );
  const vistos = new Set();
  const entram = [];
  const repetidos = [];
  for (const item of novos) {
    const k = normalizar(item?.[chave] || "");
    if (!k) {
      entram.push(item);
      continue;
    }
    if (jaTem.has(k) || vistos.has(k)) {
      repetidos.push(item);
      continue;
    }
    vistos.add(k);
    entram.push(item);
  }
  return { entram, repetidos };
};

// ---------------------------------------------------------------------------
// Agenda em .ics
// ---------------------------------------------------------------------------

// .ics é o formato que Google Agenda, Apple e Outlook leem. É a integração de
// calendário mais barata que existe: um arquivo, nenhuma API, nenhuma chave.

const escapaIcs = (v) =>
  texto(v)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const carimbo = (valor) => {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
};

export const buildIcs = (eventos = [], opcoes = {}) => {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Seu Funcionario//Agenda//PT",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapaIcs(opcoes.nome || "Agenda do negócio")}`,
  ];
  let incluidos = 0;

  for (const ev of eventos) {
    const inicio = carimbo(ev?.inicio);
    if (!inicio) continue; // evento sem data não vira compromisso
    const fim =
      carimbo(ev?.fim) ||
      carimbo(new Date(new Date(ev.inicio).getTime() + 60 * 60 * 1000));
    incluidos++;
    linhas.push(
      "BEGIN:VEVENT",
      `UID:${escapaIcs(ev.id || `${inicio}-${incluidos}`)}@seufuncionario`,
      `DTSTAMP:${carimbo(new Date()) || inicio}`,
      `DTSTART:${inicio}`,
      `DTEND:${fim}`,
      `SUMMARY:${escapaIcs(ev.titulo || "Compromisso")}`,
    );
    if (ev.descricao) linhas.push(`DESCRIPTION:${escapaIcs(ev.descricao)}`);
    if (ev.local) linhas.push(`LOCATION:${escapaIcs(ev.local)}`);
    linhas.push("END:VEVENT");
  }

  linhas.push("END:VCALENDAR");
  // O padrão pede quebra de linha CRLF; sem isso, parte dos calendários recusa
  // o arquivo inteiro sem dizer o motivo.
  return { conteudo: `${linhas.join("\r\n")}\r\n`, incluidos };
};

// Traduz o que o app guarda para o formato de evento acima.
export const appointmentsToEvents = (agendamentos = []) =>
  (Array.isArray(agendamentos) ? agendamentos : []).map((a) => ({
    id: a?.id,
    titulo: [a?.service || a?.title, a?.client || a?.customer]
      .filter(Boolean)
      .join(" — "),
    inicio: a?.start || a?.date,
    fim: a?.end,
    descricao: a?.notes,
    local: a?.location,
  }));

// ---------------------------------------------------------------------------
// Levar tudo embora
// ---------------------------------------------------------------------------

// Direito de quem usa: sair com os próprios dados a qualquer momento, sem
// pedir para ninguém. Campos internos e de sessão ficam de fora — não são do
// negócio e só confundiriam quem abrir o arquivo.
export const EXPORT_SKIP = [
  "user",
  "selectedConversationId",
  "onboarding",
  "selectedBusinessId",
];

export const exportableCollections = (db) =>
  Object.entries(db || {})
    .filter(([chave, valor]) => Array.isArray(valor) && !EXPORT_SKIP.includes(chave))
    .map(([chave, valor]) => ({ chave, total: valor.length }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

export const buildFullExport = (db, business) => {
  const saida = {
    exportadoEm: new Date().toISOString(),
    negocio: business?.name || null,
    dados: {},
  };
  for (const { chave } of exportableCollections(db)) {
    saida.dados[chave] = (db[chave] || []).filter(
      (x) => !business?.id || !x?.businessId || x.businessId === business.id,
    );
  }
  return saida;
};

// ---------------------------------------------------------------------------
// Catálogo, com o estado verdadeiro de cada conexão
// ---------------------------------------------------------------------------

// "pronto" = funciona agora, sem ninguém fazer nada.
// "depende" = falta uma decisão ou uma chave da titular. Dizer isso na cara é
// melhor do que anunciar integração que não liga.
export const CONNECTIONS = [
  {
    id: "planilha",
    nome: "Planilha (Excel, Google Sheets, LibreOffice)",
    estado: "pronto",
    como: "Importe e exporte em CSV nesta mesma tela. O arquivo abre com acento certo no Excel em português.",
  },
  {
    id: "calendario",
    nome: "Google Agenda, Apple e Outlook",
    estado: "pronto",
    como: "Baixe a agenda em .ics e importe no seu calendário. Nenhuma chave, nenhuma conta.",
  },
  {
    id: "whatsapp",
    nome: "WhatsApp",
    estado: "pronto",
    como: "Os botões de conversa do app abrem o WhatsApp com a mensagem pronta, pelo link oficial.",
  },
  {
    id: "backup",
    nome: "Cópia de tudo (JSON)",
    estado: "pronto",
    como: "Baixe o espaço de trabalho inteiro quando quiser. Os seus dados são seus.",
  },
  {
    id: "webhook",
    nome: "Envio automático para outro sistema",
    estado: "depende",
    como: "Precisa de um endereço de saída no servidor: o navegador é bloqueado por CORS e guardaria o endereço secreto no aparelho. Está anotado nas pendências.",
  },
  {
    id: "pagamento",
    nome: "Cobrança automática (Pix, cartão)",
    estado: "depende",
    como: "Depende de conectar um provedor de pagamento na conta da titular.",
  },
];

export const connectionsByState = (estado) =>
  CONNECTIONS.filter((c) => c.estado === estado);
