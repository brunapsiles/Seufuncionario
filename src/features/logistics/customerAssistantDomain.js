// ===== Assistente do cliente: montagem do contexto =====
// Camada pura.
//
// A regra que este arquivo existe para garantir: o assistente do portal só
// conhece o cliente da sessão. Ele não tem como falar de CRM, pipeline,
// margem, comissão ou de outro cliente — não porque foi instruído a não falar,
// mas porque esses dados nunca entram no contexto que ele recebe.
//
// Instrução de sistema é pedido; contexto é fato. Um modelo pode ser
// convencido a ignorar a instrução — não pode inventar um dado que não recebeu.

// Campos que jamais podem entrar no contexto do assistente do cliente.
// A lista é varrida pelo teste contra o contexto montado.
export const CAMPOS_PROIBIDOS = [
  "margem",
  "margemPercent",
  "custo",
  "custoTotal",
  "comissao",
  "receitaContratada",
  "precoMinimo",
  "precoRecomendado",
  "pipeline",
  "oportunidades",
  "propostas",
  "concorrente",
  "dealDesk",
  "clientes",
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const arredondar = (v, casas = 1) => {
  const f = 10 ** casas;
  return Math.round(num(v) * f) / f;
};

// Monta o contexto. Recebe o que veio do banco já filtrado pelo cliente da
// sessão e devolve só o que o assistente precisa — em vez de repassar o objeto
// inteiro e torcer para não haver nada demais dentro.
export const montarContextoDoCliente = (dados = {}) => {
  const { cliente, resumo, operacoes = [], greenScore } = dados;
  if (!cliente?.id)
    throw new Error("Contexto do assistente sem cliente na sessão.");

  return {
    cliente: { nome: cliente.nome || "" },
    periodo: {
      operacoes: num(resumo?.operacoes?.total),
      entregas: num(resumo?.operacoes?.entregas),
      distanciaKm: arredondar(resumo?.operacoes?.distanciaKm, 0),
      ocupacaoMediaPercent: arredondar(resumo?.operacoes?.ocupacaoMedia),
    },
    ambiental: {
      co2EvitadoKg: arredondar(resumo?.ambiental?.co2EvitadoKg, 2),
      dieselEvitadoLitros: arredondar(resumo?.ambiental?.dieselEvitadoL, 2),
      reducaoPercent: arredondar(resumo?.ambiental?.reducaoPercent),
      qualidadeDadosPercent: arredondar(resumo?.ambiental?.qualidadeDados, 0),
    },
    greenScore: greenScore
      ? {
          valor: arredondar(greenScore.valor ?? greenScore.score),
          versaoPesos: greenScore.versaoPesos || greenScore.weights_version || "",
          componentes: greenScore.componentes || null,
        }
      : null,
    // Só o que o cliente já enxerga na tela dele. Nada de custo, preço ou
    // margem — nem sequer o campo existe aqui.
    operacoesRecentes: operacoes.slice(0, 20).map((op) => ({
      referencia: op.referencia || "",
      data: op.data || "",
      origem: op.origem || "",
      destino: op.destino || "",
      situacao: op.status || "",
      entregas: num(op.campos?.deliveries),
      distanciaKm: num(op.campos?.distanceKm),
      ocupacaoPercent: num(op.campos?.occupancyPercent),
    })),
  };
};

export const INSTRUCAO_ASSISTENTE = `Você é o assistente do portal da To Do Green para um cliente específico.

Responda apenas com base nos dados fornecidos no contexto desta conversa. O contexto contém exclusivamente informações do cliente atual.

Regras:
- Se perguntarem sobre outro cliente, sobre a carteira da To Do Green, sobre preços, custos, margens, comissões ou pipeline comercial, responda que essas informações não fazem parte do portal do cliente e ofereça falar sobre a operação dele.
- Nunca invente número. Se o dado não está no contexto, diga que não consta e sugira abrir uma solicitação.
- Green Score e indicadores ambientais são estimativas próprias da To Do Green, com memória de cálculo. Nunca os apresente como certificação ou verificação por terceira parte.
- Quando citar um indicador ambiental cuja qualidade de dados esteja abaixo de 70%, diga que ele serve para acompanhar tendência, não para relatório regulatório.
- Escreva em português do Brasil, direto, sem jargão.`;

// Perguntas que o assistente do cliente não responde. Reconhecer antes de
// chamar o modelo economiza chamada e, principalmente, garante a resposta —
// não depende do modelo obedecer.
const PADROES_FORA_DE_ESCOPO = [
  /\b(margem|markup)\b/i,
  // Pega "custo", "custos", "custa", "custam", "custar", "custando".
  /\bcust(o|os|a|am|ar|ando)\b/i,
  /\bcomiss(ão|ao|ões|oes)\b/i,
  /\bpipeline\b/i,
  /\bpropostas?\s+(de|do|da)\s+outr/i,
  /\boutro\s+cliente\b/i,
  /\boutros\s+clientes\b/i,
  /\bcarteira\b/i,
  /\bconcorrent/i,
  /\bquanto\s+(a\s+)?to\s*do\s*green\s+(fatura|lucra|ganha)/i,
  /\bpre(ç|c)o\s+(de|do|da)\s+outr/i,
];

export const foraDoEscopoDoCliente = (pergunta) =>
  PADROES_FORA_DE_ESCOPO.some((padrao) => padrao.test(String(pergunta || "")));

export const RESPOSTA_FORA_DE_ESCOPO =
  "Essa informação não faz parte do portal do cliente — aqui eu falo sobre a sua operação: entregas, rotas, ocupação, Green Score, CO2 evitado e documentos do seu contrato. Se precisar de dados comerciais, abra uma solicitação e o seu contato na To Do Green responde.";

// Verificação final antes de enviar. Se algum campo proibido escapou para o
// contexto, isto derruba a chamada em vez de deixar vazar.
export const validarContexto = (contexto) => {
  const texto = JSON.stringify(contexto || {}).toLowerCase();
  const encontrados = CAMPOS_PROIBIDOS.filter((campo) =>
    texto.includes(`"${campo.toLowerCase()}"`),
  );
  if (encontrados.length)
    throw new Error(
      `Contexto do assistente contém campo interno: ${encontrados.join(", ")}.`,
    );
  return true;
};
