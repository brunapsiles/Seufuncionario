// ===== Premissas da simulação =====
//
// Uma calculadora que abre preenchida devolve preço, margem e CO₂ no primeiro
// segundo. O número tem cara de cálculo, mas é a resposta às premissas que a
// própria tela escolheu — distância 120 km, 40 viagens por mês, ocupação 78%,
// confiança no dado 80%. Ninguém informou nada disso, e mesmo assim aquilo
// vira preço na proposta e tonelada de CO₂ no relatório.
//
// Este módulo separa três situações que a tela tratava como uma só:
//
//   • INCOMPLETA — falta premissa obrigatória. O resultado não representa a
//     operação e não pode sair da tela.
//   • HIPÓTESE — está tudo preenchido, mas ninguém confirmou de onde veio.
//     Serve para simular; não serve para prometer.
//   • CONFIRMADA — alguém declarou que os números vieram do cliente ou de
//     medição. Só daqui sai proposta e relatório.
//
// A confirmação cai sozinha a cada mudança de premissa: confirmar um cenário
// e depois trocar a distância deixaria a declaração valendo para um cálculo
// que já não é o mesmo.

// Não são obrigatórios em nenhum produto, mas mudam o resultado inteiro: a
// ocupação move o custo por unidade, e a confiança no dado move a margem de
// risco. Vazios, o cálculo continua rodando com um chute.
export const CAMPOS_DE_CONFIANCA = Object.freeze(["dataQuality", "occupancyPercent"]);

export const NIVEIS = Object.freeze({
  incompleta: "incompleta",
  hipotese: "hipotese",
  confirmada: "confirmada",
});

// Zero conta como "não informado" em campo obrigatório: ninguém contrata zero
// viagem por mês nem rota de zero quilômetro. Já `false` é resposta — quem
// desmarcou "veículo reserva" respondeu que não tem.
export const naoInformado = (valor) => {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "boolean") return false;
  const texto = String(valor).trim();
  if (!texto) return true;
  const numero = Number(texto);
  return Number.isFinite(numero) && numero === 0;
};

export const premissasDaSimulacao = (produto, inputs = {}) => {
  const obrigatorias = Array.isArray(produto?.requiredFields) ? produto.requiredFields : [];
  const faltando = obrigatorias.filter((campo) => naoInformado(inputs[campo]));
  const semConfianca = CAMPOS_DE_CONFIANCA.filter((campo) => naoInformado(inputs[campo]));
  return {
    faltando,
    semConfianca,
    // Confirmar só faz sentido quando não falta nada — inclusive a confiança
    // no dado, que é justamente o campo que diz o quanto o resto vale.
    podeConfirmar: faltando.length === 0 && semConfianca.length === 0,
    totalObrigatorias: obrigatorias.length,
  };
};

const lista = (campos, nome) => campos.map((campo) => nome(campo)).join(", ");

export const situacaoDoResultado = (premissas, confirmada = false, nome = (campo) => campo) => {
  if (premissas.faltando.length)
    return {
      nivel: NIVEIS.incompleta,
      rotulo: "Premissas incompletas",
      resumo: `Falta informar ${lista(premissas.faltando, nome)}. Os valores abaixo não representam esta operação.`,
      podeSalvar: false,
      podeVirarProposta: false,
    };
  if (premissas.semConfianca.length)
    return {
      nivel: NIVEIS.incompleta,
      rotulo: "Premissas incompletas",
      resumo: `Falta informar ${lista(premissas.semConfianca, nome)}. Sem isso o cálculo assume um número que ninguém verificou.`,
      podeSalvar: false,
      podeVirarProposta: false,
    };
  if (!confirmada)
    return {
      nivel: NIVEIS.hipotese,
      rotulo: "Hipótese de trabalho",
      resumo:
        "Está tudo preenchido, mas ninguém declarou de onde vieram estes números. Confirme as premissas para poder salvar, propor ou reportar.",
      podeSalvar: false,
      podeVirarProposta: false,
    };
  return {
    nivel: NIVEIS.confirmada,
    rotulo: "Premissas confirmadas",
    resumo: "As premissas foram declaradas como vindas do cliente ou de medição. O resultado pode virar proposta e relatório.",
    podeSalvar: true,
    podeVirarProposta: true,
  };
};

// O que fica gravado junto da simulação. Sem isto, uma proposta antiga não
// tem como provar que nasceu de premissa confirmada — e "confiar na memória"
// é exatamente o que auditoria não aceita.
export const registroDaConfirmacao = (situacao, { userId = "", agora = new Date() } = {}) =>
  situacao.nivel === NIVEIS.confirmada
    ? { confirmadas: true, confirmadasPor: String(userId || ""), confirmadasEm: new Date(agora).toISOString() }
    : { confirmadas: false, confirmadasPor: "", confirmadasEm: "" };

// Um cenário só pode virar proposta ou relatório se nasceu confirmado. Vale
// também para o que já estava salvo antes desta regra existir: sem o registro,
// não há confirmação — e presumir que houve seria inventar procedência.
export const cenarioConfirmado = (cenario) => Boolean(cenario?.premissas?.confirmadas);
