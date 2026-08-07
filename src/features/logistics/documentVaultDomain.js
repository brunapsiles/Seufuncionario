// ===== Cofre de documentos =====
//
// Regras que valem para os dois lados — quem cadastra por dentro e quem baixa
// pelo portal. Ficam aqui, e não dentro do serviço, porque as duas telas
// precisam dizer a mesma coisa antes de bater no servidor.

export const TIPOS_DE_DOCUMENTO = Object.freeze([
  { id: "nota_fiscal", nome: "Nota fiscal" },
  { id: "telemetria", nome: "Telemetria" },
  { id: "contrato", nome: "Contrato" },
  { id: "comprovante", nome: "Comprovante de entrega" },
  { id: "laudo", nome: "Laudo" },
  { id: "outro", nome: "Outro" },
]);

export const ehTipoValido = (tipo) => TIPOS_DE_DOCUMENTO.some((item) => item.id === tipo);

// Quinze minutos. Tempo de clicar e baixar, não de guardar no favoritos.
export const VALIDADE_DO_LINK_MINUTOS = 15;

export const validadeDoLink = (agora = Date.now()) =>
  new Date(new Date(agora).getTime() + VALIDADE_DO_LINK_MINUTOS * 60 * 1000).toISOString();

export const linkExpirado = (concessao, agora = Date.now()) => {
  if (!concessao) return true;
  if (concessao.revogadoEm) return true;
  const limite = new Date(concessao.expiraEm || 0).getTime();
  return !Number.isFinite(limite) || limite <= new Date(agora).getTime();
};

const texto = (valor, max = 400) => String(valor ?? "").trim().slice(0, max);

// Só http(s), e nada de endereço interno. Um worker que busca a URL que o
// usuário digitou é um proxy: sem esta trava, ele viraria porta de entrada para
// a rede de onde ele roda.
export const enderecoAceito = (url) => {
  const bruto = texto(url, 2000);
  if (!bruto) return { ok: false, motivo: "Informe o endereço do arquivo." };
  let alvo;
  try {
    alvo = new URL(bruto);
  } catch {
    return { ok: false, motivo: "O endereço do arquivo não é uma URL válida." };
  }
  if (!["http:", "https:"].includes(alvo.protocol))
    return { ok: false, motivo: "O endereço precisa começar com http:// ou https://." };
  const host = alvo.hostname.toLowerCase();
  const proibido =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host.endsWith(".internal");
  if (proibido)
    return { ok: false, motivo: "Endereços de rede interna não são aceitos como fonte de documento." };
  return { ok: true, motivo: "", url: alvo.toString() };
};

export const documentoValido = (documento = {}) => {
  const problemas = [];
  if (!texto(documento.titulo)) problemas.push("Dê um título ao documento.");
  if (!texto(documento.clientId)) problemas.push("Diga a qual cliente o documento pertence.");
  if (!ehTipoValido(texto(documento.tipo))) problemas.push("Escolha o tipo do documento.");
  const endereco = enderecoAceito(documento.arquivoUrl);
  if (!endereco.ok) problemas.push(endereco.motivo);
  return { valido: problemas.length === 0, problemas, url: endereco.url || "" };
};

// Tamanho legível. O portal mostra "2,4 MB" e não "2517143".
export const tamanhoLegivel = (bytes) => {
  const n = Number(bytes) || 0;
  if (n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};
