// ===== Edição de imagem no próprio aparelho =====
// Camada pura: só contas. Nada aqui toca em canvas, arquivo ou rede — é o que
// permite testar recorte, redimensionamento e compressão sem navegador.
//
// A decisão de fundo: tudo acontece no aparelho de quem usa, com a API de
// canvas que já vem no navegador. Custo zero de servidor, funciona sem
// internet e a foto do produto não sai do celular. É o que sustenta a promessa
// de gratuidade sem depender de serviço de terceiro.

export const FORMATS = [
  { id: "image/webp", label: "WebP", ext: "webp", hint: "Menor arquivo" },
  { id: "image/jpeg", label: "JPEG", ext: "jpg", hint: "Compatível com tudo" },
  { id: "image/png", label: "PNG", ext: "png", hint: "Sem perda, mais pesado" },
];

// Tamanhos que um negócio pequeno realmente usa. Não é catálogo de designer:
// é o que a pessoa precisa para publicar hoje.
export const PRESETS = [
  { id: "quadrado", label: "Post quadrado", width: 1080, height: 1080 },
  { id: "story", label: "Story / Reels", width: 1080, height: 1920 },
  { id: "paisagem", label: "Post paisagem", width: 1200, height: 628 },
  { id: "produto", label: "Foto de produto", width: 800, height: 800 },
  { id: "capa", label: "Capa de site", width: 1600, height: 900 },
  { id: "perfil", label: "Foto de perfil", width: 400, height: 400 },
];

const num = (v, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
};

export const clamp = (v, min, max) => Math.min(max, Math.max(min, num(v, min)));

// ---------------------------------------------------------------------------
// Tamanho
// ---------------------------------------------------------------------------

// Cabe dentro do limite sem distorcer. Imagem menor que o limite NÃO é
// esticada: aumentar só borra, e a pessoa acharia que o app estragou a foto.
export const fitInside = (w, h, maxW, maxH) => {
  const largura = Math.max(1, Math.round(num(w, 1)));
  const altura = Math.max(1, Math.round(num(h, 1)));
  const limiteW = num(maxW, 0) > 0 ? num(maxW) : Infinity;
  const limiteH = num(maxH, 0) > 0 ? num(maxH) : Infinity;
  const fator = Math.min(limiteW / largura, limiteH / altura, 1);
  return {
    width: Math.max(1, Math.round(largura * fator)),
    height: Math.max(1, Math.round(altura * fator)),
    scale: fator,
  };
};

// Redimensionamento pedido à mão: por largura, por altura ou por porcentagem.
// Informar só um lado mantém a proporção — é o comportamento que as pessoas
// esperam e evita foto achatada.
export const resizeTo = (w, h, pedido = {}) => {
  const largura = Math.max(1, Math.round(num(w, 1)));
  const altura = Math.max(1, Math.round(num(h, 1)));
  const proporcao = largura / altura;

  if (num(pedido.percent, 0) > 0) {
    const p = clamp(pedido.percent, 1, 400) / 100;
    return {
      width: Math.max(1, Math.round(largura * p)),
      height: Math.max(1, Math.round(altura * p)),
    };
  }
  const pw = num(pedido.width, 0);
  const ph = num(pedido.height, 0);
  if (pw > 0 && ph > 0) {
    if (pedido.keepRatio === false)
      return { width: Math.round(pw), height: Math.round(ph) };
    return fitInside(largura, altura, pw, ph);
  }
  if (pw > 0)
    return { width: Math.round(pw), height: Math.max(1, Math.round(pw / proporcao)) };
  if (ph > 0)
    return { width: Math.max(1, Math.round(ph * proporcao)), height: Math.round(ph) };
  return { width: largura, height: altura };
};

// Girar em 90° troca largura por altura. Errar isso corta a imagem pela metade.
export const rotateSize = (w, h, graus) => {
  const g = ((num(graus, 0) % 360) + 360) % 360;
  return g === 90 || g === 270
    ? { width: Math.round(num(h, 1)), height: Math.round(num(w, 1)) }
    : { width: Math.round(num(w, 1)), height: Math.round(num(h, 1)) };
};

export const normalizeAngle = (graus) => (((num(graus, 0) % 360) + 360) % 360);

// ---------------------------------------------------------------------------
// Recorte
// ---------------------------------------------------------------------------

// O recorte sempre precisa sobrar dentro da imagem. Um retângulo que vaza gera
// borda preta ou erro no canvas, e a pessoa não entende o motivo.
export const clampCrop = (crop = {}, w, h) => {
  const largura = Math.max(1, Math.round(num(w, 1)));
  const altura = Math.max(1, Math.round(num(h, 1)));
  const cw = Math.round(clamp(num(crop.width, largura), 1, largura));
  const ch = Math.round(clamp(num(crop.height, altura), 1, altura));
  return {
    x: Math.round(clamp(num(crop.x, 0), 0, largura - cw)),
    y: Math.round(clamp(num(crop.y, 0), 0, altura - ch)),
    width: cw,
    height: ch,
  };
};

// Recorte centralizado numa proporção (1:1, 4:5, 16:9). É como se corta foto
// de produto para o catálogo sem perder o meio da imagem.
export const cropToRatio = (w, h, ratio) => {
  const largura = Math.max(1, Math.round(num(w, 1)));
  const altura = Math.max(1, Math.round(num(h, 1)));
  const alvo = num(ratio, 0);
  if (alvo <= 0) return { x: 0, y: 0, width: largura, height: altura };
  const atual = largura / altura;
  if (Math.abs(atual - alvo) < 0.0001)
    return { x: 0, y: 0, width: largura, height: altura };
  if (atual > alvo) {
    const nova = Math.max(1, Math.round(altura * alvo));
    return {
      x: Math.round((largura - nova) / 2),
      y: 0,
      width: nova,
      height: altura,
    };
  }
  const nova = Math.max(1, Math.round(largura / alvo));
  return {
    x: 0,
    y: Math.round((altura - nova) / 2),
    width: largura,
    height: nova,
  };
};

export const RATIOS = [
  { id: "livre", label: "Livre", value: 0 },
  { id: "1:1", label: "1:1 quadrado", value: 1 },
  { id: "4:5", label: "4:5 retrato", value: 4 / 5 },
  { id: "9:16", label: "9:16 story", value: 9 / 16 },
  { id: "16:9", label: "16:9 paisagem", value: 16 / 9 },
];

// ---------------------------------------------------------------------------
// Ajustes visuais
// ---------------------------------------------------------------------------

export const DEFAULT_ADJUST = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  blur: 0,
};

// Devolve a string de `filter` do canvas/CSS. Valor fora da faixa é preso no
// limite em vez de gerar filtro inválido, que o canvas ignora inteiro — a
// pessoa mexeria no controle e não veria efeito nenhum.
export const filterCss = (ajustes = {}) => {
  const a = { ...DEFAULT_ADJUST, ...ajustes };
  const partes = [
    `brightness(${clamp(a.brightness, 0, 300)}%)`,
    `contrast(${clamp(a.contrast, 0, 300)}%)`,
    `saturate(${clamp(a.saturate, 0, 300)}%)`,
    `grayscale(${clamp(a.grayscale, 0, 100)}%)`,
    `blur(${clamp(a.blur, 0, 40)}px)`,
  ];
  return partes.join(" ");
};

export const isDefaultAdjust = (ajustes = {}) => {
  const a = { ...DEFAULT_ADJUST, ...ajustes };
  return Object.keys(DEFAULT_ADJUST).every(
    (k) => num(a[k], DEFAULT_ADJUST[k]) === DEFAULT_ADJUST[k],
  );
};

// ---------------------------------------------------------------------------
// Compressão
// ---------------------------------------------------------------------------

// PNG não tem qualidade variável: pedir 60% de qualidade num PNG não reduz
// nada e daria a impressão de que a compressão não funciona.
export const supportsQuality = (formato) =>
  formato === "image/jpeg" || formato === "image/webp";

// Busca binária pela qualidade: cada passo escolhe o meio da faixa que ainda
// pode servir. Doze tentativas já chegam perto o bastante, e o navegador não
// trava porque cada tentativa é rápida.
export const compressionStep = (estado = {}, tamanhoAtual, alvoBytes) => {
  const baixo = num(estado.low, 0.3);
  const alto = num(estado.high, 0.95);
  const tentativas = num(estado.tries, 0);
  const atual = num(estado.quality, (baixo + alto) / 2);
  const alvo = num(alvoBytes, 0);

  if (alvo <= 0 || tentativas >= 12 || alto - baixo < 0.02)
    return { done: true, quality: atual, low: baixo, high: alto, tries: tentativas };

  const coube = num(tamanhoAtual, Infinity) <= alvo;
  const novo = coube
    ? { low: atual, high: alto }
    : { low: baixo, high: atual };
  const proxima = (novo.low + novo.high) / 2;
  return {
    done: false,
    quality: Number(proxima.toFixed(3)),
    low: novo.low,
    high: novo.high,
    tries: tentativas + 1,
    // Guarda o melhor resultado que já coube, para não devolver uma tentativa
    // pior só porque foi a última.
    best: coube ? { quality: atual, size: num(tamanhoAtual, 0) } : estado.best,
  };
};

export const startCompression = (qualidadeInicial = 0.82) => ({
  quality: clamp(qualidadeInicial, 0.1, 1),
  low: 0.1,
  high: 1,
  tries: 0,
  best: null,
  done: false,
});

// ---------------------------------------------------------------------------
// Arquivo
// ---------------------------------------------------------------------------

export const extensionFor = (formato) =>
  FORMATS.find((f) => f.id === formato)?.ext || "png";

// Nome de saída previsível: mantém o nome original e troca a extensão. Nome
// aleatório faz a pessoa perder o arquivo na pasta de downloads.
export const outputName = (nome, formato, sufixo = "editado") => {
  const base = String(nome || "imagem")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim()
    .slice(0, 60) || "imagem";
  const marca = sufixo ? `-${String(sufixo).trim()}` : "";
  return `${base}${marca}.${extensionFor(formato)}`;
};

export const formatBytes = (bytes) => {
  const n = num(bytes, 0);
  if (n <= 0) return "0 KB";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

// Quanto encolheu, em porcentagem. Negativo significa que ficou maior — e isso
// precisa aparecer, não ser escondido: converter PNG pequeno para WebP às
// vezes engorda o arquivo.
export const savingPercent = (antes, depois) => {
  const a = num(antes, 0);
  const d = num(depois, 0);
  if (a <= 0) return 0;
  return Math.round(((a - d) / a) * 100);
};

export const describeSaving = (antes, depois) => {
  const p = savingPercent(antes, depois);
  if (p > 0) return `${p}% menor que o original`;
  if (p < 0) return `${Math.abs(p)}% maior que o original`;
  return "mesmo tamanho do original";
};

// Um data URL em base64 ocupa ~4/3 do binário. Serve para avisar antes de
// gravar algo enorme no espaço de trabalho.
export const dataUrlBytes = (url) => {
  const texto = String(url || "");
  const virgula = texto.indexOf(",");
  if (!texto.startsWith("data:") || virgula < 0) return 0;
  const corpo = texto.slice(virgula + 1);
  if (!texto.slice(0, virgula).includes(";base64")) return corpo.length;
  const enchimento = corpo.endsWith("==") ? 2 : corpo.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((corpo.length * 3) / 4) - enchimento);
};

// Teto para não estourar o espaço de trabalho com uma foto só. Acima disso a
// tela oferece baixar o arquivo em vez de guardar.
export const MAX_SAVE_BYTES = 1.5 * 1024 * 1024;

export const canSaveToWorkspace = (bytes) => num(bytes, 0) <= MAX_SAVE_BYTES;

// Só aceita imagem de verdade. SVG fica de fora de propósito: SVG é código e
// pode carregar script — não é o tipo de arquivo que se abre sem pensar.
export const ACCEPTED_INPUT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const isAcceptedImage = (tipo) =>
  ACCEPTED_INPUT.includes(String(tipo || "").toLowerCase());

// Resumo do que foi feito, para virar legenda do item na biblioteca. Sem isso
// a pessoa olha três versões da mesma foto e não sabe qual é qual.
export const describeEdit = (edicao = {}) => {
  const partes = [];
  if (edicao.width && edicao.height)
    partes.push(`${edicao.width}×${edicao.height}`);
  if (num(edicao.rotation, 0)) partes.push(`girada ${normalizeAngle(edicao.rotation)}°`);
  if (edicao.flipH) partes.push("espelhada");
  if (edicao.cropped) partes.push("recortada");
  if (edicao.adjusted) partes.push("com ajuste de cor");
  const f = FORMATS.find((x) => x.id === edicao.format);
  if (f) partes.push(f.label);
  return partes.join(" · ") || "sem alteração";
};
