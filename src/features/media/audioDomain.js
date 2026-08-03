// ===== Áudio: gravar, ditar e ouvir =====
// Camada pura. Nada aqui abre microfone nem fala — só as contas e o texto.
//
// Tudo roda no navegador: MediaRecorder para gravar, reconhecimento de fala
// para ditar e síntese de fala para ouvir. Nenhum serviço pago, nenhum áudio
// sai do aparelho. É a única forma de entregar isto mantendo a gratuidade.

const num = (v, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
};

export const formatDuration = (segundos) => {
  const total = Math.max(0, Math.round(num(segundos, 0)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

// Teto de gravação. Não é limitação técnica: é para a pessoa não gravar meia
// hora sem perceber e estourar o espaço de trabalho com um arquivo só.
export const MAX_RECORD_SECONDS = 300;

export const recordingWarning = (segundos) => {
  const s = num(segundos, 0);
  if (s >= MAX_RECORD_SECONDS) return "Limite de 5 minutos atingido.";
  if (s >= MAX_RECORD_SECONDS - 30)
    return `Faltam ${MAX_RECORD_SECONDS - Math.round(s)}s para o limite.`;
  return "";
};

export const shouldStopRecording = (segundos) =>
  num(segundos, 0) >= MAX_RECORD_SECONDS;

// ---------------------------------------------------------------------------
// Ouvir texto (síntese de fala)
// ---------------------------------------------------------------------------

// A síntese de fala engasga com textos longos: alguns navegadores cortam no
// meio, outros simplesmente param. Quebrar em pedaços por frase resolve, e
// quebrar POR FRASE (não por número de letras) evita cortar palavra ao meio e
// perder a entonação.
export const chunkForSpeech = (texto, maxChars = 180) => {
  const limpo = String(texto || "").replace(/\s+/g, " ").trim();
  if (!limpo) return [];
  const teto = Math.max(40, num(maxChars, 180));

  const frases = limpo.match(/[^.!?…]+[.!?…]*\s*/g) || [limpo];
  const pedacos = [];
  let atual = "";

  const empurrar = (t) => {
    const v = t.trim();
    if (v) pedacos.push(v);
  };

  for (const frase of frases) {
    const f = frase.trim();
    if (!f) continue;
    if (f.length > teto) {
      // Frase gigante sem pontuação: quebra na última palavra que couber.
      empurrar(atual);
      atual = "";
      let resto = f;
      while (resto.length > teto) {
        const corte = resto.lastIndexOf(" ", teto);
        const pos = corte > teto * 0.5 ? corte : teto;
        empurrar(resto.slice(0, pos));
        resto = resto.slice(pos).trim();
      }
      atual = resto;
      continue;
    }
    if ((atual ? atual.length + 1 : 0) + f.length > teto) {
      empurrar(atual);
      atual = f;
    } else {
      atual = atual ? `${atual} ${f}` : f;
    }
  }
  empurrar(atual);
  return pedacos;
};

export const SPEECH_RATES = [
  { id: "lenta", label: "Lenta", value: 0.8 },
  { id: "normal", label: "Normal", value: 1 },
  { id: "rapida", label: "Rápida", value: 1.25 },
];

export const speechRate = (id) =>
  SPEECH_RATES.find((r) => r.id === id)?.value ?? 1;

// Escolhe uma voz em português entre as que o aparelho oferece. Sem isso o
// navegador lê texto em português com voz em inglês, e fica incompreensível.
export const pickVoice = (vozes = [], preferida = "") => {
  const lista = Array.isArray(vozes) ? vozes : [];
  if (!lista.length) return null;
  if (preferida) {
    const escolhida = lista.find((v) => v?.name === preferida);
    if (escolhida) return escolhida;
  }
  const porIdioma = (prefixo) =>
    lista.find((v) => String(v?.lang || "").toLowerCase().startsWith(prefixo));
  return porIdioma("pt-br") || porIdioma("pt") || lista[0] || null;
};

// ---------------------------------------------------------------------------
// Ditar (reconhecimento de fala)
// ---------------------------------------------------------------------------

// O reconhecimento devolve trechos "provisórios" que ele ainda vai corrigir.
// Se a gente fosse somando tudo, o texto sairia repetido. Aqui o final é
// acumulado e o provisório só aparece na ponta, como prévia.
export const mergeTranscript = (acumulado, resultado = {}) => {
  const base = String(acumulado || "");
  const finalNovo = String(resultado.final || "").trim();
  const provisorio = String(resultado.interim || "").trim();
  const juntar = (a, b) => (a && b ? `${a.replace(/\s+$/, "")} ${b}` : a || b);
  return {
    final: finalNovo ? juntar(base, finalNovo) : base,
    preview: provisorio,
  };
};

// Arruma o que sai do ditado: espaço antes de pontuação, letra maiúscula
// depois de ponto, e primeira letra maiúscula. Sem isso a pessoa reescreve
// tudo à mão e o ditado deixa de valer a pena.
export const cleanTranscript = (texto) => {
  let t = String(texto || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=[^\s])/g, "$1 ")
    .trim();
  if (!t) return "";
  t = t.replace(/(^|[.!?…]\s+)([\p{Ll}])/gu, (_, antes, letra) => antes + letra.toUpperCase());
  return t;
};

export const wordCount = (texto) => {
  const t = String(texto || "").trim();
  return t ? t.split(/\s+/).length : 0;
};

// Ritmo de leitura em voz alta: ~150 palavras por minuto é o que se usa para
// estimar duração de locução. Serve para a pessoa saber se o texto do vídeo
// cabe nos 30 segundos antes de gravar.
export const estimateSpeechSeconds = (texto, rate = 1) => {
  const palavras = wordCount(texto);
  const velocidade = Math.max(0.5, num(rate, 1));
  return Math.round((palavras / 150) * 60 / velocidade);
};

// ---------------------------------------------------------------------------
// Item guardado
// ---------------------------------------------------------------------------

export const buildAudioItem = ({
  id,
  url,
  seconds,
  transcript = "",
  name = "",
  businessId = null,
  ownerId = null,
  createdAt,
} = {}) => ({
  id: id || `audio-${Math.random().toString(36).slice(2, 10)}`,
  type: "audio",
  name: String(name || "").trim() || `Gravação ${formatDuration(seconds)}`,
  url: url || null,
  duration: Math.max(0, Math.round(num(seconds, 0))),
  transcript: String(transcript || "").trim(),
  tags: [],
  businessId,
  ownerId,
  visibility: "privado",
  createdAt: createdAt || new Date().toISOString(),
});

// O navegador escolhe o formato que sabe gravar. Nem todos aceitam webm, e o
// Safari só grava mp4 — pedir um formato que o aparelho não tem faz a gravação
// falhar sem mensagem.
export const pickRecorderMime = (suportado = () => false) => {
  const candidatos = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidatos.find((tipo) => suportado(tipo)) || "";
};
