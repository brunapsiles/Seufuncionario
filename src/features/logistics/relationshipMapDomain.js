// ===== Mapa de relacionamento =====
//
// Quem manda, quem ajuda e quem atravessa — desenhado, não listado.
//
// Os três eixos já estavam no cadastro do contato e ninguém via: `influence`,
// `supportLevel` e `accessLevel` eram números guardados que nenhuma tela lia.
// Em venda enterprise, esses três respondem a pergunta que decide a conta:
// "estou falando com quem decide, e essa pessoa está do meu lado?".
//
// A leitura é sempre a mesma: linha = área, coluna = poder, cor = posição.
// Sem isso, um mapa vira um organograma bonito que não muda decisão nenhuma.

const texto = (valor) => String(valor ?? "").trim();
const numero = (valor) => (Number.isFinite(Number(valor)) ? Number(valor) : 0);

// A posição da pessoa em relação à To Do Green. `supportLevel` vai de -100 a
// 100 no cadastro, e é o único dos três eixos que admite valor negativo —
// porque "contrário" é uma informação diferente de "desconhecido".
export const POSICOES = Object.freeze({
  aliado: { rotulo: "Aliado", sinal: "🟢", ordem: 0 },
  neutro: { rotulo: "Neutro", sinal: "🟡", ordem: 1 },
  barreira: { rotulo: "Barreira", sinal: "🔴", ordem: 2 },
  desconhecido: { rotulo: "Posição não mapeada", sinal: "⚪", ordem: 3 },
});

export const posicaoDoContato = (contato = {}) => {
  const apoio = contato.supportLevel;
  if (apoio === null || apoio === undefined || apoio === "") return "desconhecido";
  const valor = numero(apoio);
  if (valor >= 25) return "aliado";
  if (valor <= -25) return "barreira";
  return "neutro";
};

// Poder de decisão: o papel manda mais que o número, porque o papel foi
// escolhido por uma pessoa e o número costuma vir zerado do cadastro.
export const PODERES = Object.freeze({
  decide: { rotulo: "Decide", ordem: 0 },
  influencia: { rotulo: "Influencia", ordem: 1 },
  usa: { rotulo: "Usuário", ordem: 2 },
});

const PAPEIS_QUE_DECIDEM = ["decisor econômico", "decisor tecnico", "decisor técnico", "patrocinador"];

export const poderDoContato = (contato = {}) => {
  const papel = texto(contato.relationshipRole).toLowerCase();
  if (PAPEIS_QUE_DECIDEM.includes(papel)) return "decide";
  if (numero(contato.accessLevel) >= 70 || numero(contato.influence) >= 70) return "decide";
  if (papel === "usuário" || papel === "usuario") return "usa";
  if (numero(contato.influence) >= 35 || papel) return "influencia";
  return "usa";
};

// A área agrupa as colunas do mapa. Vem do papel e do cargo, nesta ordem,
// porque o papel é declarado e o cargo é texto livre.
const AREAS = Object.freeze([
  ["Compras", ["compras", "procurement", "suprimentos", "sourcing"]],
  ["Supply Chain", ["supply chain", "supply", "abastecimento", "planejamento"]],
  ["Logística", ["logística", "logistica", "transporte", "transportes", "distribuição", "frota"]],
  ["Operações", ["operações", "operacoes", "operação", "operacao", "coo"]],
  ["ESG", ["esg", "sustentabilidade", "ambiental", "meio ambiente"]],
  ["Financeiro", ["financeiro", "controladoria", "cfo", "custos"]],
  ["Jurídico", ["jurídico", "juridico", "legal", "contratos"]],
  ["Diretoria", ["ceo", "diretor", "diretoria", "vp", "presidente", "head"]],
]);

export const areaDoContato = (contato = {}) => {
  const alvo = texto(`${contato.relationshipRole} ${contato.department} ${contato.title}`)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [area, termos] of AREAS)
    if (termos.some((termo) => alvo.includes(termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) return area;
  return "Outros";
};

// ===== Força do relacionamento =====
//
// A força com a CONTA, não com uma pessoa: é o que a equipe quer ver antes de
// entrar na reunião. Três degraus em vez de um número, porque ninguém discute
// se o relacionamento é 61 ou 68 — discute se está fraco, morno ou forte.
export const DEGRAUS = 3;

export function forcaDoRelacionamento(contatos = []) {
  const ativos = contatos.filter((item) => item?.name && item?.active !== false);
  if (!ativos.length) return { nivel: 0, total: DEGRAUS, leitura: "Nenhum contato mapeado." };

  const decisores = ativos.filter((item) => poderDoContato(item) === "decide");
  const aliados = ativos.filter((item) => posicaoDoContato(item) === "aliado");
  const barreiras = ativos.filter((item) => posicaoDoContato(item) === "barreira");
  const comCanal = ativos.filter((item) => item.email || item.phone || item.linkedinUrl);

  // Um degrau por conquista real. Barreira conhecida não tira degrau: saber
  // quem é contra vale mais do que não saber — o que tira é não ter aliado.
  let nivel = 0;
  if (comCanal.length) nivel += 1;
  if (decisores.length) nivel += 1;
  if (aliados.length) nivel += 1;

  const leitura = [
    `${ativos.length} contato(s)`,
    decisores.length ? `${decisores.length} com poder de decisão` : "nenhum decisor mapeado",
    aliados.length ? `${aliados.length} aliado(s)` : "nenhum aliado identificado",
    barreiras.length ? `${barreiras.length} barreira(s)` : "",
  ].filter(Boolean).join(" · ");

  return { nivel, total: DEGRAUS, leitura };
}

// ===== O mapa =====

export function montarMapa(contatos = []) {
  const ativos = (Array.isArray(contatos) ? contatos : []).filter((item) => item?.name && item?.active !== false);
  const nos = ativos.map((contato, indice) => ({
    id: texto(contato.id) || `contato-${indice}`,
    nome: texto(contato.name),
    cargo: texto(contato.title) || null,
    papel: texto(contato.relationshipRole) || null,
    area: areaDoContato(contato),
    poder: poderDoContato(contato),
    posicao: posicaoDoContato(contato),
    influencia: numero(contato.influence),
    canais: {
      email: texto(contato.email) || null,
      telefone: texto(contato.phone) || null,
      linkedin: texto(contato.linkedinUrl) || null,
    },
  }));

  const areas = [...new Set(nos.map((no) => no.area))]
    .sort((a, b) => (a === "Outros" ? 1 : b === "Outros" ? -1 : a.localeCompare(b, "pt-BR")))
    .map((area) => ({
      area,
      contatos: nos
        .filter((no) => no.area === area)
        .sort((a, b) =>
          PODERES[a.poder].ordem - PODERES[b.poder].ordem ||
          POSICOES[a.posicao].ordem - POSICOES[b.posicao].ordem ||
          b.influencia - a.influencia ||
          a.nome.localeCompare(b.nome, "pt-BR")),
    }));

  // O buraco do mapa é a informação mais acionável dele: mostra onde a venda
  // trava antes de travar.
  const lacunas = [];
  if (!nos.length) lacunas.push("Nenhum contato mapeado nesta conta.");
  else {
    if (!nos.some((no) => no.poder === "decide")) lacunas.push("Nenhum contato com poder de decisão.");
    if (!areas.some((item) => item.area === "Compras")) lacunas.push("Compras / Procurement não mapeado.");
    if (!nos.some((no) => no.posicao === "aliado")) lacunas.push("Nenhum aliado identificado.");
    const semPosicao = nos.filter((no) => no.posicao === "desconhecido");
    if (semPosicao.length) lacunas.push(`${semPosicao.length} contato(s) sem posição definida.`);
  }

  return {
    areas,
    total: nos.length,
    forca: forcaDoRelacionamento(contatos),
    lacunas,
    porPosicao: Object.keys(POSICOES).reduce((conta, chave) => {
      conta[chave] = nos.filter((no) => no.posicao === chave).length;
      return conta;
    }, {}),
  };
}
