// ===== Semente — a inteligência comercial da To Do Green =====
//
// "Planta oportunidades. Colhe resultados."
//
// A parte pura: qual especialista atende cada tela, o que a Semente sabe
// fazer, e como ela se apresenta. Fica separada do componente porque é isso
// que dá para testar sem montar tela — e porque a escolha do especialista é
// regra de produto, não detalhe de renderização.
//
// A Semente não é um especialista novo: ela é a porta. Quem responde são os
// dez especialistas registrados em todoGreenAiSpecialists.js, e ela escolhe
// qual chamar pelo lugar onde a pessoa está. Perguntar sobre margem na tela
// de precificação e receber resposta de um generalista seria o mesmo defeito
// que a Central de Trabalho tinha.

export const SEMENTE = Object.freeze({
  nome: "Semente",
  assinatura: "A inteligência comercial da To Do Green",
  lema: "Planta oportunidades. Colhe resultados.",
  saudacao:
    "Olá! Eu sou a Semente. Posso analisar empresas, identificar oportunidades, avaliar riscos ESG e sugerir a próxima ação — sempre com os dados desta tela.",
});

// O que ela faz, na ordem em que a marca apresenta.
export const HABILIDADES = Object.freeze([
  "Analisa empresas",
  "Identifica oportunidades",
  "Avalia riscos ESG",
  "Sugere abordagens",
  "Acompanha sua carteira",
  "Recomenda próximas ações",
]);

// Cada tela tem um especialista que responde melhor por ela. O nome à direita
// precisa existir em todoGreenAiSpecialists.js — se não existir, o núcleo cai
// no Consultor genérico, que é exatamente o defeito que acabamos de corrigir.
export const ESPECIALISTA_POR_TELA = Object.freeze({
  clientes: "Especialista Comercial",
  oportunidades: "Especialista Comercial",
  propostas: "Especialista Comercial",
  "performance-comercial": "Especialista Comercial",

  precificacao: "Especialista em Precificação Logística",
  regua: "Especialista em Precificação Logística",
  custos: "Especialista em Precificação Logística",
  "deal-desk": "Especialista em Precificação Logística",

  esg: "Especialista ESG",
  "green-score": "Especialista ESG",
  "central-esg": "Especialista ESG",
  "calculadora-ambiental": "Especialista ESG",
  "tradutor-esg": "Especialista ESG",
  "escopo-3": "Especialista ESG",
  metodologia: "Especialista ESG",

  operacoes: "Especialista em Operações Logísticas",
  rastreamento: "Especialista em Operações Logísticas",
  solicitacoes: "Especialista em Operações Logísticas",

  receita: "Especialista Financeiro",
  comissoes: "Especialista Financeiro",

  documentos: "Especialista em Dados",
  auditoria: "Especialista em Dados",
  relatorios: "Especialista em Dados",
  dashboards: "Especialista em Dados",

  metas: "Especialista em Projetos",
});

// Sem tela conhecida, quem atende é o comercial: é a porta de entrada da
// vertical e o assunto mais provável de quem abre a Semente sem contexto.
export const especialistaDaTela = (pagina) =>
  ESPECIALISTA_POR_TELA[String(pagina || "").trim()] || "Especialista Comercial";

// O que a pessoa provavelmente quer perguntar naquela tela. Existe para a
// Semente não abrir com uma caixa de texto vazia — campo vazio é a forma mais
// rápida de alguém fechar e não voltar.
const ATALHOS_POR_ESPECIALISTA = Object.freeze({
  "Especialista Comercial": [
    "O que está parado na minha carteira?",
    "Quais contas correm risco de perda?",
    "Qual a próxima ação em cada oportunidade aberta?",
  ],
  "Especialista em Precificação Logística": [
    "Onde a margem está abaixo do piso?",
    "Este preço se sustenta? Abra a conta.",
    "Que dado falta para fechar esta simulação?",
  ],
  "Especialista ESG": [
    "O que sustenta o Green Score deste período?",
    "Onde falta evidência para o relatório do cliente?",
    "Quanto do cálculo é medição e quanto é estimativa?",
  ],
  "Especialista em Operações Logísticas": [
    "Que rota está com ocupação abaixo do previsto?",
    "Onde há atraso ou ocorrência se repetindo?",
    "Qual operação precisa de ação hoje?",
  ],
  "Especialista Financeiro": [
    "Qual contrato está abaixo da margem mínima?",
    "A receita está concentrada em poucos clientes?",
    "O que fugiu do padrão neste período?",
  ],
  "Especialista em Dados": [
    "Que registro está incompleto ou inconsistente?",
    "Quanto do total está apoiado em medição?",
    "Que número não se sustenta na evidência?",
  ],
  "Especialista em Projetos": [
    "O que está atrasado ou bloqueado?",
    "Que meta corre risco de não fechar?",
    "Qual o próximo passo com responsável e prazo?",
  ],
});

export const atalhosDaTela = (pagina) =>
  ATALHOS_POR_ESPECIALISTA[especialistaDaTela(pagina)] ||
  ATALHOS_POR_ESPECIALISTA["Especialista Comercial"];

// A pergunta vai junto de um resumo do que está na tela — sem isso a Semente
// responderia genérico sobre logística, que é conselho de internet, não
// análise da operação de quem perguntou.
export const montarPergunta = ({ pergunta, tela, resumo } = {}) => {
  const texto = String(pergunta || "").trim();
  if (texto.length < 3) return { valido: false, prompt: "" };
  const contexto = resumo && Object.keys(resumo).length
    ? `Dados desta tela (${tela || "vertical"}):\n${JSON.stringify(resumo, null, 2)}\n\n`
    : "";
  return {
    valido: true,
    prompt: `${contexto}Pergunta: ${texto}\n\nResponda com base apenas nos dados acima. Se faltar dado para concluir, diga qual falta em vez de estimar.`,
  };
};

// ===== O corpo que vai para /api/ai =====
//
// A Semente não fala com um endpoint reduzido: ela usa a mesma API do resto do
// Seu Funcionário, com tudo que ela oferece. Estava mandando só `prompt` e
// `specialist`, e com isso perdia quatro coisas que o produto já tem pronto:
//
//   workspaceOwnerId  o espaço ativo. Sem ele o servidor assume o espaço
//                     pessoal de quem perguntou — e a vertical é operada
//                     dentro do espaço do tenant. Perfil do negócio, memórias
//                     aprovadas e cota iam todos para o lugar errado.
//   businessId        omitido de propósito: o servidor cai no negócio
//                     selecionado do espaço, que é a resposta certa aqui.
//   messages          a conversa anterior. Sem isso cada pergunta nascia
//                     amnésica e "e o segundo caso?" não queria dizer nada.
//   webSearch         a busca na internet, com as fontes de volta na resposta.
//
// As memórias aprovadas do espaço entram sozinhas no servidor assim que o
// espaço certo chega — não há nada a mandar por aqui.

export const HISTORICO_MAXIMO = 10;

const PAPEL = { voce: "user", semente: "assistant" };

export const corpoDaPergunta = ({
  pergunta,
  tela,
  resumo,
  historico = [],
  buscarNaWeb,
} = {}) => {
  const { valido, prompt } = montarPergunta({ pergunta, tela, resumo });
  if (!valido) return { valido: false, corpo: null };
  const texto = String(pergunta).trim();
  const anteriores = (Array.isArray(historico) ? historico : [])
    // Mensagem que falhou é aviso de erro na tela, não fala da assistente.
    // Reenviá-la ensinaria o modelo a imitar mensagem de erro.
    .filter((item) => item && !item.falhou && PAPEL[item.de] && typeof item.texto === "string")
    .map((item) => ({ role: PAPEL[item.de], content: item.texto }));
  const corpo = {
    prompt,
    specialist: especialistaDaTela(tela),
    // O servidor descarta a última mensagem por entender que é a pergunta
    // atual (`slice(-9, -1)`). Ela vai junto, como o resto do produto manda.
    messages: [...anteriores, { role: "user", content: texto }].slice(-HISTORICO_MAXIMO),
  };
  if (buscarNaWeb !== undefined) corpo.webSearch = !!buscarNaWeb;
  // A consulta externa usa a pergunta crua. Mandar o `prompt` inteiro faria a
  // busca na internet procurar pelos números da operação do cliente.
  if (buscarNaWeb) corpo.webSearchQuery = texto;
  return { valido: true, corpo };
};

// ===== Leitura do streaming =====
//
// O /api/ai/stream devolve Server-Sent Events: quadros separados por linha em
// branco, cada um com uma linha `data: {...}`. Fica aqui, puro, porque partir
// texto em quadros é onde erro de borda mora — um chunk da rede corta um
// quadro no meio, e o resto precisa esperar o próximo pedaço.

export const eventosDoTrecho = (buffer) => {
  const partes = String(buffer || "").split("\n\n");
  const resto = partes.pop() || "";
  const eventos = [];
  for (const parte of partes) {
    const linha = parte.split("\n").find((item) => item.startsWith("data:"));
    if (!linha) continue;
    try {
      eventos.push(JSON.parse(linha.slice(5).trim()));
    } catch {
      // Quadro que não é JSON não derruba a leitura do resto da resposta.
    }
  }
  return { eventos, resto };
};
