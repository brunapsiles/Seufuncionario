import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Crop,
  Download,
  Image as ImageIcon,
  Mic,
  Pause,
  Play,
  RotateCw,
  Save,
  Search,
  Sparkles,
  Square,
  Tag,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { Button, Empty, Field, PageTitle } from "../../components/ui.jsx";
import {
  DEFAULT_ADJUST,
  FORMATS,
  MAX_SAVE_BYTES,
  PRESETS,
  RATIOS,
  canSaveToWorkspace,
  clampCrop,
  compressionStep,
  cropToRatio,
  describeEdit,
  describeSaving,
  filterCss,
  fitInside,
  formatBytes,
  isAcceptedImage,
  isDefaultAdjust,
  normalizeAngle,
  outputName,
  resizeTo,
  rotateSize,
  startCompression,
  supportsQuality,
} from "./imageDomain.js";
import {
  MAX_RECORD_SECONDS,
  buildAudioItem,
  chunkForSpeech,
  cleanTranscript,
  estimateSpeechSeconds,
  formatDuration,
  mergeTranscript,
  pickRecorderMime,
  pickVoice,
  recordingWarning,
  shouldStopRecording,
  speechRate,
  SPEECH_RATES,
  wordCount,
} from "./audioDomain.js";
import {
  MEDIA_TYPES,
  SORTS,
  allTags,
  filterMedia,
  forBusiness,
  itemBytes,
  libraryStats,
  libraryWarning,
  normalizeTag,
  removeMedia,
  renameMedia,
  sortMedia,
  toggleTag,
  typeLabel,
  upsertMedia,
} from "./libraryDomain.js";

const novoId = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

const baixar = (url, nome) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// ===========================================================================
// Aba 1 — Editor de imagem
// ===========================================================================

function ImageEditor({ onSave, setToast }) {
  const [arquivo, setArquivo] = useState(null); // {name, size, type, url}
  const [tamanho, setTamanho] = useState(null); // {width, height} do original
  const [rotacao, setRotacao] = useState(0);
  const [espelhado, setEspelhado] = useState(false);
  const [proporcao, setProporcao] = useState("livre");
  const [medida, setMedida] = useState({ width: "", height: "", percent: "" });
  const [preset, setPreset] = useState(null);
  const [ajustes, setAjustes] = useState(DEFAULT_ADJUST);
  const [formato, setFormato] = useState("image/webp");
  const [alvoKb, setAlvoKb] = useState("");
  const [saida, setSaida] = useState(null); // {url, bytes, width, height}
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const imgRef = useRef(null);

  // Solta o endereço temporário quando a imagem sai de cena. Sem isto, cada
  // troca de foto deixa a anterior presa na memória do navegador.
  useEffect(
    () => () => {
      if (arquivo?.url) URL.revokeObjectURL(arquivo.url);
    },
    [arquivo?.url],
  );

  const limpar = () => {
    setSaida(null);
    setErro("");
  };

  const escolher = (file) => {
    if (!file) return;
    if (!isAcceptedImage(file.type)) {
      setErro(
        "Formato não aceito. Use PNG, JPEG, WebP ou GIF. (SVG fica de fora de propósito: é código, não foto.)",
      );
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setTamanho({ width: img.naturalWidth, height: img.naturalHeight });
      setArquivo({ name: file.name, size: file.size, type: file.type, url });
      setRotacao(0);
      setEspelhado(false);
      setProporcao("livre");
      setMedida({ width: "", height: "", percent: "" });
      setPreset(null);
      setAjustes(DEFAULT_ADJUST);
      limpar();
    };
    img.onerror = () => setErro("Não consegui abrir esta imagem.");
    img.src = url;
  };

  const recorte = useMemo(() => {
    if (!tamanho) return null;
    const valor = RATIOS.find((r) => r.id === proporcao)?.value || 0;
    if (!valor) return null;
    return clampCrop(
      cropToRatio(tamanho.width, tamanho.height, valor),
      tamanho.width,
      tamanho.height,
    );
  }, [tamanho, proporcao]);

  const destino = useMemo(() => {
    if (!tamanho) return null;
    const base = recorte
      ? { width: recorte.width, height: recorte.height }
      : tamanho;
    const girado = rotateSize(base.width, base.height, rotacao);
    // O tamanho pronto é uma CAIXA em que a imagem tem de caber, não uma
    // largura fixa: aplicado depois do recorte, uma largura fixa aumentaria a
    // imagem já cortada, e aumentar só borra.
    if (preset)
      return fitInside(girado.width, girado.height, preset.width, preset.height);
    return resizeTo(girado.width, girado.height, {
      width: Number(medida.width) || 0,
      height: Number(medida.height) || 0,
      percent: Number(medida.percent) || 0,
    });
  }, [tamanho, recorte, rotacao, medida, preset]);

  const desenhar = useCallback(
    (qualidade) =>
      new Promise((resolve, reject) => {
        const img = imgRef.current;
        if (!img || !destino) return reject(new Error("Escolha uma imagem."));
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext?.("2d");
        if (!ctx)
          return reject(
            new Error("Este navegador não permite editar imagem por aqui."),
          );
        canvas.width = destino.width;
        canvas.height = destino.height;

        const corte = recorte || {
          x: 0,
          y: 0,
          width: tamanho.width,
          height: tamanho.height,
        };
        // Fundo branco antes de tudo: JPEG e WebP sem transparência mostrariam
        // preto onde o PNG era transparente.
        if (formato !== "image/png") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((normalizeAngle(rotacao) * Math.PI) / 180);
        if (espelhado) ctx.scale(-1, 1);
        if (!isDefaultAdjust(ajustes)) ctx.filter = filterCss(ajustes);

        const girou = normalizeAngle(rotacao) % 180 !== 0;
        const larguraDesenho = girou ? canvas.height : canvas.width;
        const alturaDesenho = girou ? canvas.width : canvas.height;
        ctx.drawImage(
          img,
          corte.x,
          corte.y,
          corte.width,
          corte.height,
          -larguraDesenho / 2,
          -alturaDesenho / 2,
          larguraDesenho,
          alturaDesenho,
        );
        ctx.restore();

        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("Não consegui gerar o arquivo.")),
          formato,
          supportsQuality(formato) ? qualidade : undefined,
        );
      }),
    [destino, recorte, tamanho, rotacao, espelhado, ajustes, formato],
  );

  const aplicar = async () => {
    if (!arquivo || processando) return;
    setProcessando(true);
    setErro("");
    try {
      const alvo = Number(alvoKb) > 0 ? Number(alvoKb) * 1024 : 0;
      let blob = await desenhar(0.92);

      // Comprimir só faz sentido quando há alvo E o formato tem qualidade.
      if (alvo > 0 && supportsQuality(formato)) {
        let estado = startCompression(0.9);
        let melhor = blob.size <= alvo ? { blob, quality: 0.9 } : null;
        while (!estado.done) {
          estado = compressionStep(estado, blob.size, alvo);
          if (estado.done) break;
          blob = await desenhar(estado.quality);
          if (blob.size <= alvo) melhor = { blob, quality: estado.quality };
        }
        if (melhor) blob = melhor.blob;
      }

      if (saida?.url) URL.revokeObjectURL(saida.url);
      setSaida({
        url: URL.createObjectURL(blob),
        bytes: blob.size,
        width: destino.width,
        height: destino.height,
        blob,
      });
    } catch (e) {
      setErro(e.message || "Não consegui processar a imagem.");
    } finally {
      setProcessando(false);
    }
  };

  const guardar = async () => {
    if (!saida) return;
    if (!canSaveToWorkspace(saida.bytes)) {
      setErro(
        `A imagem tem ${formatBytes(saida.bytes)} e o limite para guardar é ${formatBytes(MAX_SAVE_BYTES)}. Baixe o arquivo ou reduza o tamanho antes.`,
      );
      return;
    }
    const dataUrl = await new Promise((resolve) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = () => resolve(null);
      leitor.readAsDataURL(saida.blob);
    });
    if (!dataUrl) {
      setErro("Não consegui guardar a imagem. Baixe o arquivo.");
      return;
    }
    onSave({
      id: novoId("img"),
      type: "image",
      name: outputName(arquivo.name, formato).replace(/\.[a-z0-9]+$/i, ""),
      url: dataUrl,
      bytes: saida.bytes,
      note: describeEdit({
        width: saida.width,
        height: saida.height,
        rotation: rotacao,
        flipH: espelhado,
        cropped: !!recorte,
        adjusted: !isDefaultAdjust(ajustes),
        format: formato,
      }),
    });
    setToast?.("Imagem guardada na biblioteca.");
  };

  return (
    <section className="me-editor">
      <div className="me-dropzone">
        <label className="me-upload">
          <Upload size={18} />
          <span>{arquivo ? "Trocar imagem" : "Escolher imagem"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => escolher(e.target.files?.[0])}
          />
        </label>
        {arquivo && (
          <p className="muted">
            {arquivo.name} · {tamanho?.width}×{tamanho?.height} ·{" "}
            {formatBytes(arquivo.size)}
          </p>
        )}
        <small className="muted">
          A edição acontece no seu aparelho. A foto não é enviada para lugar
          nenhum, e funciona mesmo sem internet.
        </small>
      </div>

      {erro && <div className="ask-error">{erro}</div>}

      {arquivo && (
        <>
          <div className="me-grid">
            <div className="me-preview">
              <img
                src={saida?.url || arquivo.url}
                alt="Prévia da imagem"
                style={
                  saida ? undefined : { filter: filterCss(ajustes) }
                }
              />
              <p className="muted">
                {saida
                  ? `Resultado: ${saida.width}×${saida.height} · ${formatBytes(saida.bytes)} · ${describeSaving(arquivo.size, saida.bytes)}`
                  : `Vai ficar ${destino?.width}×${destino?.height}`}
              </p>
            </div>

            <div className="me-controles">
              <fieldset>
                <legend>Tamanho pronto para publicar</legend>
                <div className="me-presets">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn tiny${preset?.id === p.id ? " ativo" : ""}`}
                      onClick={() => {
                        setPreset(preset?.id === p.id ? null : p);
                        setMedida({ width: "", height: "", percent: "" });
                        limpar();
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Medida</legend>
                <div className="me-linha">
                  <label>
                    Largura
                    <input
                      type="number"
                      min="1"
                      value={medida.width}
                      placeholder={String(tamanho?.width || "")}
                      onChange={(e) => {
                        setPreset(null);
                        setMedida({ ...medida, width: e.target.value, percent: "" });
                        limpar();
                      }}
                    />
                  </label>
                  <label>
                    Altura
                    <input
                      type="number"
                      min="1"
                      value={medida.height}
                      placeholder={String(tamanho?.height || "")}
                      onChange={(e) => {
                        setPreset(null);
                        setMedida({ ...medida, height: e.target.value, percent: "" });
                        limpar();
                      }}
                    />
                  </label>
                  <label>
                    %
                    <input
                      type="number"
                      min="1"
                      max="400"
                      value={medida.percent}
                      placeholder="100"
                      onChange={(e) => {
                        setPreset(null);
                        setMedida({ width: "", height: "", percent: e.target.value });
                        limpar();
                      }}
                    />
                  </label>
                </div>
                <small className="muted">
                  Informe só um lado para manter a proporção.
                </small>
              </fieldset>

              <fieldset>
                <legend>
                  <Crop size={13} /> Recorte
                </legend>
                <div className="me-chips">
                  {RATIOS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`btn tiny${proporcao === r.id ? " ativo" : ""}`}
                      onClick={() => {
                        setProporcao(r.id);
                        limpar();
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Girar</legend>
                <div className="me-chips">
                  <button
                    type="button"
                    className="btn tiny"
                    onClick={() => {
                      setRotacao(normalizeAngle(rotacao + 90));
                      limpar();
                    }}
                  >
                    <RotateCw size={13} /> 90°
                  </button>
                  <button
                    type="button"
                    className={`btn tiny${espelhado ? " ativo" : ""}`}
                    onClick={() => {
                      setEspelhado(!espelhado);
                      limpar();
                    }}
                  >
                    Espelhar
                  </button>
                  <span className="muted">{normalizeAngle(rotacao)}°</span>
                </div>
              </fieldset>

              <fieldset>
                <legend>Ajuste de cor</legend>
                {[
                  ["brightness", "Brilho", 0, 200],
                  ["contrast", "Contraste", 0, 200],
                  ["saturate", "Saturação", 0, 200],
                  ["grayscale", "Preto e branco", 0, 100],
                ].map(([campo, rotulo, min, max]) => (
                  <label key={campo} className="me-slider">
                    <span>
                      {rotulo} <b>{ajustes[campo]}%</b>
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={ajustes[campo]}
                      onChange={(e) => {
                        setAjustes({ ...ajustes, [campo]: Number(e.target.value) });
                        limpar();
                      }}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => {
                    setAjustes(DEFAULT_ADJUST);
                    limpar();
                  }}
                >
                  Zerar ajustes
                </button>
              </fieldset>

              <fieldset>
                <legend>Arquivo</legend>
                <div className="me-chips">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`btn tiny${formato === f.id ? " ativo" : ""}`}
                      onClick={() => {
                        setFormato(f.id);
                        limpar();
                      }}
                      title={f.hint}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <label className="me-alvo">
                  Tamanho máximo (KB)
                  <input
                    type="number"
                    min="10"
                    value={alvoKb}
                    placeholder="sem limite"
                    onChange={(e) => {
                      setAlvoKb(e.target.value);
                      limpar();
                    }}
                  />
                </label>
                {!supportsQuality(formato) && Number(alvoKb) > 0 && (
                  <small className="muted">
                    PNG não tem qualidade variável: o limite de tamanho não vai
                    ter efeito. Use WebP ou JPEG.
                  </small>
                )}
              </fieldset>
            </div>
          </div>

          <div className="me-acoes">
            <Button icon={Sparkles} disabled={processando} onClick={aplicar}>
              {processando ? "Processando…" : "Aplicar"}
            </Button>
            {saida && (
              <>
                <Button
                  icon={Download}
                  variant="secondary"
                  onClick={() => baixar(saida.url, outputName(arquivo.name, formato))}
                >
                  Baixar
                </Button>
                <Button icon={Save} variant="secondary" onClick={guardar}>
                  Guardar na biblioteca
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ===========================================================================
// Aba 2 — Áudio
// ===========================================================================

function AudioStudio({ onSave, setToast }) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [gravacao, setGravacao] = useState(null); // {url, blob, seconds}
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState("");
  const [ditando, setDitando] = useState(false);
  const [falando, setFalando] = useState(false);
  const [velocidade, setVelocidade] = useState("normal");
  const gravador = useRef(null);
  const pedacos = useRef([]);
  const relogio = useRef(null);
  const reconhecimento = useRef(null);

  const suportaGravar =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";
  const suportaDitar =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const suportaFalar =
    typeof window !== "undefined" && !!window.speechSynthesis;

  useEffect(
    () => () => {
      if (relogio.current) clearInterval(relogio.current);
      try {
        reconhecimento.current?.stop();
        window.speechSynthesis?.cancel();
      } catch {
        /* nada a fazer ao desmontar */
      }
    },
    [],
  );

  const pararGravacao = useCallback(() => {
    try {
      gravador.current?.stop();
      gravador.current?.stream?.getTracks?.().forEach((t) => t.stop());
    } catch {
      /* já parado */
    }
    if (relogio.current) clearInterval(relogio.current);
    setGravando(false);
  }, []);

  const iniciarGravacao = async () => {
    setErro("");
    if (!suportaGravar) {
      setErro("Este navegador não permite gravar áudio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickRecorderMime((t) =>
        window.MediaRecorder.isTypeSupported?.(t),
      );
      const rec = new window.MediaRecorder(stream, mime ? { mimeType: mime } : {});
      pedacos.current = [];
      rec.ondataavailable = (e) => {
        if (e.data?.size) pedacos.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(pedacos.current, {
          type: mime || "audio/webm",
        });
        setGravacao((atual) => {
          if (atual?.url) URL.revokeObjectURL(atual.url);
          return { url: URL.createObjectURL(blob), blob, seconds: segundos };
        });
      };
      gravador.current = rec;
      rec.start();
      setGravando(true);
      setSegundos(0);
      relogio.current = setInterval(() => {
        setSegundos((s) => {
          const proximo = s + 1;
          if (shouldStopRecording(proximo)) pararGravacao();
          return proximo;
        });
      }, 1000);
    } catch {
      setErro(
        "Não consegui usar o microfone. Verifique a permissão do navegador.",
      );
    }
  };

  const ditar = () => {
    setErro("");
    if (!suportaDitar) {
      setErro(
        "Este navegador não faz ditado. No celular, o próprio teclado costuma ter um microfone.",
      );
      return;
    }
    if (ditando) {
      reconhecimento.current?.stop();
      return;
    }
    const Reconhecedor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Reconhecedor();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (evento) => {
      let final = "";
      let provisorio = "";
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const r = evento.results[i];
        if (r.isFinal) final += r[0].transcript;
        else provisorio += r[0].transcript;
      }
      setTexto((atual) => {
        const juntado = mergeTranscript(atual, { final, interim: provisorio });
        setPrevia(juntado.preview);
        return juntado.final;
      });
    };
    rec.onerror = () => setErro("O ditado foi interrompido. Tente de novo.");
    rec.onend = () => {
      setDitando(false);
      setPrevia("");
    };
    reconhecimento.current = rec;
    rec.start();
    setDitando(true);
  };

  const falar = () => {
    setErro("");
    if (!suportaFalar) {
      setErro("Este navegador não lê texto em voz alta.");
      return;
    }
    if (falando) {
      window.speechSynthesis.cancel();
      setFalando(false);
      return;
    }
    const partes = chunkForSpeech(texto);
    if (!partes.length) return;
    const voz = pickVoice(window.speechSynthesis.getVoices?.() || []);
    window.speechSynthesis.cancel();
    partes.forEach((parte, i) => {
      const fala = new window.SpeechSynthesisUtterance(parte);
      fala.lang = "pt-BR";
      fala.rate = speechRate(velocidade);
      if (voz) fala.voice = voz;
      if (i === partes.length - 1) fala.onend = () => setFalando(false);
      window.speechSynthesis.speak(fala);
    });
    setFalando(true);
  };

  const guardarGravacao = async () => {
    if (!gravacao) return;
    const dataUrl = await new Promise((resolve) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = () => resolve(null);
      leitor.readAsDataURL(gravacao.blob);
    });
    if (!dataUrl) {
      setErro("Não consegui guardar o áudio. Baixe o arquivo.");
      return;
    }
    if (!canSaveToWorkspace(gravacao.blob.size)) {
      setErro(
        `A gravação tem ${formatBytes(gravacao.blob.size)} e o limite para guardar é ${formatBytes(MAX_SAVE_BYTES)}. Baixe o arquivo em vez de guardar.`,
      );
      return;
    }
    onSave({
      ...buildAudioItem({
        id: novoId("aud"),
        url: dataUrl,
        seconds: gravacao.seconds,
        transcript: texto,
      }),
      bytes: gravacao.blob.size,
    });
    setToast?.("Áudio guardado na biblioteca.");
  };

  return (
    <section className="me-audio">
      {erro && <div className="ask-error">{erro}</div>}

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">GRAVAR</span>
            <h3>Recado de voz</h3>
          </div>
          <span className="muted">{formatDuration(segundos)}</span>
        </div>
        <p className="muted">
          Grava no seu aparelho, sem enviar para servidor nenhum. Limite de{" "}
          {formatDuration(MAX_RECORD_SECONDS)}.
        </p>
        <div className="me-acoes">
          {gravando ? (
            <Button icon={Square} onClick={pararGravacao}>
              Parar
            </Button>
          ) : (
            <Button icon={Mic} disabled={!suportaGravar} onClick={iniciarGravacao}>
              Gravar
            </Button>
          )}
          {gravacao && (
            <>
              <Button
                icon={Download}
                variant="secondary"
                onClick={() => baixar(gravacao.url, "gravacao.webm")}
              >
                Baixar
              </Button>
              <Button icon={Save} variant="secondary" onClick={guardarGravacao}>
                Guardar na biblioteca
              </Button>
            </>
          )}
        </div>
        {gravando && recordingWarning(segundos) && (
          <p className="muted">{recordingWarning(segundos)}</p>
        )}
        {gravacao && (
          <audio controls src={gravacao.url} className="me-player">
            <track kind="captions" />
          </audio>
        )}
        {!suportaGravar && (
          <p className="muted">
            Este navegador não permite gravar áudio. Tudo o mais nesta tela
            continua funcionando.
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">TEXTO E VOZ</span>
            <h3>Ditar e ouvir</h3>
          </div>
          <span className="muted">
            {wordCount(texto)} palavras · ~{formatDuration(
              estimateSpeechSeconds(texto, speechRate(velocidade)),
            )}{" "}
            falando
          </span>
        </div>
        <Field label="Texto">
          <textarea
            value={texto + (previa ? ` ${previa}` : "")}
            onChange={(e) => {
              setTexto(e.target.value);
              setPrevia("");
            }}
            placeholder="Dite ou escreva aqui. Serve para legenda de post, roteiro de vídeo ou recado para o cliente."
            rows={6}
          />
        </Field>
        <div className="me-acoes">
          <button
            type="button"
            className={`btn${ditando ? " primary" : ""}`}
            disabled={!suportaDitar}
            onClick={ditar}
          >
            <Mic size={15} /> {ditando ? "Parar ditado" : "Ditar"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!suportaFalar || !texto.trim()}
            onClick={falar}
          >
            {falando ? <Pause size={15} /> : <Volume2 size={15} />}
            {falando ? "Parar leitura" : "Ouvir"}
          </button>
          <select
            aria-label="Velocidade da leitura"
            value={velocidade}
            onChange={(e) => setVelocidade(e.target.value)}
          >
            {SPEECH_RATES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            disabled={!texto.trim()}
            onClick={() => setTexto(cleanTranscript(texto))}
          >
            Arrumar pontuação
          </button>
        </div>
        {!suportaDitar && (
          <small className="muted">
            O ditado depende do navegador. No celular, o microfone do próprio
            teclado faz o mesmo.
          </small>
        )}
      </div>
    </section>
  );
}

// ===========================================================================
// Aba 3 — Biblioteca
// ===========================================================================

function MediaLibrary({ itens, onChange, setToast }) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [etiqueta, setEtiqueta] = useState("");
  const [ordem, setOrdem] = useState("recentes");
  const [novaTag, setNovaTag] = useState({});

  const stats = useMemo(() => libraryStats(itens), [itens]);
  const aviso = libraryWarning(stats);
  const etiquetas = useMemo(() => allTags(itens), [itens]);
  const visiveis = useMemo(
    () => sortMedia(filterMedia(itens, { q: busca, type: tipo, tag: etiqueta }), ordem),
    [itens, busca, tipo, etiqueta, ordem],
  );

  const atualizar = (item) => onChange(upsertMedia(itens, item));
  const apagar = (id) => {
    onChange(removeMedia(itens, id));
    setToast?.("Arquivo removido da biblioteca.");
  };

  return (
    <section className="me-lib">
      <div className="me-lib-topo">
        <label className="me-busca">
          <Search size={15} />
          <input
            type="search"
            value={busca}
            placeholder="Buscar por nome, etiqueta ou o que foi dito no áudio"
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <select
          aria-label="Tipo de arquivo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {MEDIA_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordem"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <p className="muted">
        {stats.total} arquivo(s) · {stats.legivel} ocupados
      </p>
      {aviso && <div className="notice">{aviso}</div>}

      {etiquetas.length > 0 && (
        <div className="me-chips">
          <button
            type="button"
            className={`btn tiny${etiqueta ? "" : " ativo"}`}
            onClick={() => setEtiqueta("")}
          >
            Todas
          </button>
          {etiquetas.map((t) => (
            <button
              key={t.tag}
              type="button"
              className={`btn tiny${etiqueta === t.tag ? " ativo" : ""}`}
              onClick={() => setEtiqueta(etiqueta === t.tag ? "" : t.tag)}
            >
              {t.tag} ({t.total})
            </button>
          ))}
        </div>
      )}

      {!visiveis.length ? (
        itens.length ? (
          <p className="muted">Nada encontrado com esse filtro.</p>
        ) : (
          <Empty
            icon={Search}
            title="Ainda não há arquivos"
            text="O que você gerar, editar ou gravar aparece aqui, junto — com busca por nome, por etiqueta e pelo que foi dito dentro do áudio."
          />
        )
      ) : (
        <ul className="me-lista">
          {visiveis.map((item) => (
            <li key={item.id} className="me-card">
              {item.type === "audio" ? (
                <audio controls src={item.url} className="me-player">
                  <track kind="captions" />
                </audio>
              ) : item.url ? (
                <img src={item.url} alt={item.name || "Arquivo"} />
              ) : (
                <div className="me-sem-arquivo">Sem arquivo</div>
              )}
              <div className="me-card-corpo">
                <input
                  className="me-nome"
                  aria-label={`Nome de ${item.name || typeLabel(item.type)}`}
                  value={item.name || ""}
                  placeholder={typeLabel(item.type)}
                  onChange={(e) => atualizar(renameMedia(item, e.target.value))}
                />
                <small className="muted">
                  {typeLabel(item.type)}
                  {item.note ? ` · ${item.note}` : ""}
                  {itemBytes(item) ? ` · ${formatBytes(itemBytes(item))}` : ""}
                </small>
                {item.transcript && (
                  <small className="muted me-transcricao">{item.transcript}</small>
                )}
                <div className="me-chips">
                  {(item.tags || []).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="btn tiny ativo"
                      onClick={() => atualizar(toggleTag(item, t))}
                      title="Tirar etiqueta"
                    >
                      <Tag size={12} /> {t}
                    </button>
                  ))}
                  <input
                    className="me-tag-nova"
                    aria-label={`Nova etiqueta para ${item.name || typeLabel(item.type)}`}
                    value={novaTag[item.id] || ""}
                    placeholder="+ etiqueta"
                    onChange={(e) =>
                      setNovaTag({ ...novaTag, [item.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const t = normalizeTag(novaTag[item.id]);
                      if (!t) return;
                      atualizar(toggleTag(item, t));
                      setNovaTag({ ...novaTag, [item.id]: "" });
                    }}
                  />
                </div>
                <div className="me-card-acoes">
                  {item.url && (
                    <button
                      type="button"
                      className="btn tiny"
                      onClick={() =>
                        baixar(item.url, `${item.name || "arquivo"}`)
                      }
                    >
                      <Download size={13} /> Baixar
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn tiny"
                    onClick={() => apagar(item.id)}
                  >
                    <Trash2 size={13} /> Apagar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ===========================================================================
// Tela
// ===========================================================================

const ABAS = [
  ["imagem", "Editar imagem", ImageIcon],
  ["audio", "Áudio", AudioLines],
  ["biblioteca", "Biblioteca", Play],
];

export default function MediaStudio({ db, update, business, setToast }) {
  const [aba, setAba] = useState("imagem");

  const doNegocio = useMemo(
    () => forBusiness(db?.media || [], business?.id),
    [db?.media, business?.id],
  );

  // A biblioteca só enxerga os arquivos deste negócio, então ela devolve só
  // eles. Gravar essa lista direto apagaria a mídia dos outros negócios: aqui
  // a lista nova substitui apenas a fatia que era visível.
  const salvarLista = (lista) => {
    const visiveis = new Set(doNegocio.map((i) => i.id));
    update((atual) => ({
      ...atual,
      media: [
        ...lista,
        ...(atual.media || []).filter((i) => !visiveis.has(i?.id)),
      ],
    }));
  };

  const adicionar = (item) => {
    const completo = {
      tags: [],
      visibility: "privado",
      createdAt: new Date().toISOString(),
      ...item,
      businessId: business?.id || null,
      ownerId: db?.user?.id || null,
    };
    update((atual) => ({ ...atual, media: [completo, ...(atual.media || [])] }));
  };

  return (
    <PageTitle
      eyebrow="MÍDIA"
      title="Editar foto, gravar recado e achar arquivo depois"
      text="Roda no seu aparelho: sem custo, sem enviar arquivo para fora e funcionando mesmo sem internet."
      className="me"
    >
      <div className="studio-tabs">
        {ABAS.map(([id, rotulo, Icone]) => (
          <button
            key={id}
            type="button"
            className={aba === id ? "active" : ""}
            onClick={() => setAba(id)}
          >
            <Icone size={16} />
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "imagem" && <ImageEditor onSave={adicionar} setToast={setToast} />}
      {aba === "audio" && <AudioStudio onSave={adicionar} setToast={setToast} />}
      {aba === "biblioteca" && (
        <MediaLibrary
          itens={doNegocio}
          onChange={salvarLista}
          setToast={setToast}
        />
      )}
    </PageTitle>
  );
}
