// ===== A quem a tarefa vai =====
//
// O responsável da tarefa era texto livre. A tabela sempre teve
// `responsible_user_id`, mas nada preenchia: o que ia para o banco era um
// nome digitado à mão em `responsible_label`. As consequências apareciam
// longe da causa:
//
//   - "minhas tarefas" não filtra nada, porque não há a quem comparar;
//   - erro de digitação cria um responsável que não existe, e a tarefa fica
//     órfã sem ninguém perceber;
//   - a automação que atribui por nome não tem quem notificar;
//   - e a Semente atribuía toda tarefa a quem PEDIU, mesmo quando a conta
//     tem outro dono na carteira — o vendedor descobria a tarefa dele na
//     conta de outra pessoa.
//
// Aqui a atribuição vira uma decisão explicada: uma ordem de prioridade, e o
// motivo junto. Atribuir errado em silêncio é pior do que não atribuir.

const texto = (valor) => String(valor ?? "").trim();
const chave = (valor) => texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Quem pode receber uma tarefa: os membros do espaço mais os vendedores com
 * carteira ativa. Uma lista só, sem repetido, com o e-mail como identidade —
 * é o que as duas origens têm em comum.
 */
export function pessoasAtribuiveis({ membros = [], vendedores = [] } = {}) {
  const porEmail = new Map();
  const registrar = (pessoa, origem) => {
    const email = chave(pessoa?.email);
    if (!email) return;
    const atual = porEmail.get(email);
    if (atual) {
      // Quem é membro E vendedor aparece uma vez, com o id do membro (que é
      // o que permite notificar) e a marca das duas origens.
      atual.userId = atual.userId || texto(pessoa.userId || pessoa.id);
      atual.nome = atual.nome || texto(pessoa.name || pessoa.nome);
      if (!atual.origens.includes(origem)) atual.origens.push(origem);
      return;
    }
    porEmail.set(email, {
      email,
      userId: texto(pessoa.userId || pessoa.id),
      nome: texto(pessoa.name || pessoa.nome) || email,
      origens: [origem],
    });
  };
  for (const membro of Array.isArray(membros) ? membros : []) registrar(membro, "membro");
  for (const vendedor of Array.isArray(vendedores) ? vendedores : []) registrar(vendedor, "carteira");
  return [...porEmail.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export const encontrarPessoa = (pessoas, procurado) => {
  const alvo = chave(procurado);
  if (!alvo) return null;
  return (
    pessoas.find((pessoa) => pessoa.email === alvo) ||
    pessoas.find((pessoa) => pessoa.userId && texto(pessoa.userId) === texto(procurado)) ||
    pessoas.find((pessoa) => chave(pessoa.nome) === alvo) ||
    null
  );
};

export const MOTIVOS = Object.freeze({
  informado: "Responsável escolhido por quem criou a tarefa.",
  carteira: "Atribuída ao vendedor responsável por esta conta na carteira.",
  criador: "Atribuída a quem criou, porque a conta não tem vendedor definido.",
  naoResolvido: "Nome informado não corresponde a ninguém do espaço — a tarefa fica sem responsável até alguém assumir.",
  semNinguem: "Não há pessoa atribuível neste espaço.",
});

/**
 * Decide o responsável e diz por quê.
 *
 * Ordem: quem foi escolhido explicitamente → o dono da conta na carteira →
 * quem criou. O nome que não casa com ninguém NÃO vira responsável de
 * mentira: a tarefa fica em aberto, e o motivo diz isso. Gravar um texto que
 * não aponta para pessoa nenhuma é como a atribuição se perdia antes.
 */
export function resolverResponsavel({ informado, vendedoresDaConta = [], criador, pessoas = [] } = {}) {
  const semNinguem = { userId: "", label: "", motivo: MOTIVOS.semNinguem, resolvido: false };

  if (texto(informado)) {
    const escolhido = encontrarPessoa(pessoas, informado);
    if (escolhido)
      return { userId: escolhido.userId, label: escolhido.nome, motivo: MOTIVOS.informado, resolvido: true };
    return { userId: "", label: "", motivo: MOTIVOS.naoResolvido, resolvido: false, informado: texto(informado) };
  }

  for (const vendedor of vendedoresDaConta) {
    const dono = encontrarPessoa(pessoas, vendedor?.email || vendedor);
    if (dono) return { userId: dono.userId, label: dono.nome, motivo: MOTIVOS.carteira, resolvido: true };
    // Vendedor da carteira que ainda não é membro do espaço continua sendo a
    // resposta certa: ele é o dono da conta, mesmo sem id para notificar.
    const email = chave(vendedor?.email || vendedor);
    if (email) return { userId: "", label: email, motivo: MOTIVOS.carteira, resolvido: true };
  }

  if (criador && (texto(criador.email) || texto(criador.userId || criador.id)))
    return {
      userId: texto(criador.userId || criador.id),
      label: texto(criador.name || criador.nome) || chave(criador.email),
      motivo: MOTIVOS.criador,
      resolvido: true,
    };

  return semNinguem;
}
