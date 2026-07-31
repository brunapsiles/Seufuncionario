import { useMemo, useState } from "react";
import {
  Download,
  Eraser,
  Images,
  Layers3,
  LoaderCircle,
  QrCode,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  SOCIAL_IMAGE_PRESETS,
  createCarouselSlides,
  fitImageRect,
  removeSolidBackgroundPixels,
  safeDownloadName,
  sanitizeHexColor,
} from "./creativeToolkitDomain.js";
import "./creativeToolkit.css";

const TABS = [
  { id: "carrossel", label: "Carrossel", icon: Layers3 },
  { id: "imagens", label: "Imagens em lote", icon: Images },
  { id: "qr", label: "QR Code", icon: QrCode },
];

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
}

function canvasBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      type,
      quality,
    );
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Imagem inválida"));
    image.src = source;
  });
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}`));
    reader.onload = async () => {
      try {
        const image = await loadImage(reader.result);
        resolve({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          name: file.name,
          source: reader.result,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(file);
  });
}

function wrapCanvasText(context, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function drawCarouselSlide(canvas, slide, index, total, options) {
  const context = canvas.getContext("2d");
  const accent = sanitizeHexColor(options.accent);
  const background = sanitizeHexColor(options.background, "#15102c");
  canvas.width = 1080;
  canvas.height = 1350;
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = accent;
  context.fillRect(0, 0, 34, canvas.height);
  context.beginPath();
  context.arc(900, 170, 230, 0, Math.PI * 2);
  context.fillStyle = `${accent}33`;
  context.fill();
  context.fillStyle = accent;
  context.font = "700 34px Arial";
  context.fillText(String(slide.eyebrow || "").toUpperCase(), 100, 150);
  context.fillStyle = "#ffffff";
  context.font = `800 ${slide.kind === "cover" ? 76 : 66}px Arial`;
  const titleLines = wrapCanvasText(context, slide.title, 850).slice(0, 7);
  const lineHeight = slide.kind === "cover" ? 88 : 78;
  let y = slide.kind === "cover" ? 390 : 320;
  for (const line of titleLines) {
    context.fillText(line, 100, y);
    y += lineHeight;
  }
  if (slide.body) {
    context.fillStyle = "#dbe4ff";
    context.font = "400 38px Arial";
    const bodyLines = wrapCanvasText(context, slide.body, 820).slice(0, 4);
    y += 35;
    for (const line of bodyLines) {
      context.fillText(line, 100, y);
      y += 52;
    }
  }
  context.fillStyle = "#94a3b8";
  context.font = "600 28px Arial";
  context.fillText(options.brandName || "Seu Funcionário", 100, 1240);
  context.textAlign = "right";
  context.fillText(`${index + 1} / ${total}`, 980, 1240);
  context.textAlign = "left";
}

function CarouselStudio({ business, setToast }) {
  const [form, setForm] = useState({
    title: "",
    points: "",
    callToAction: "Quer aplicar isso no seu negócio? Salve este post.",
    accent: "#7c3aed",
    background: "#15102c",
  });
  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState(false);
  const slides = useMemo(
    () =>
      createCarouselSlides({
        ...form,
        brandName: business?.name,
      }),
    [business?.name, form],
  );
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const create = () => {
    if (!form.title.trim()) {
      setToast("Escreva o título do carrossel");
      return;
    }
    setGenerated(true);
    setToast(`${slides.length} slides criados`);
  };

  const exportSlides = async () => {
    if (!slides.length || busy) return;
    setBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let index = 0; index < slides.length; index += 1) {
        const canvas = document.createElement("canvas");
        drawCarouselSlide(canvas, slides[index], index, slides.length, {
          ...form,
          brandName: business?.name,
        });
        zip.file(
          `slide-${String(index + 1).padStart(2, "0")}.png`,
          await canvasBlob(canvas),
        );
      }
      downloadBlob(
        await zip.generateAsync({ type: "blob" }),
        `${safeDownloadName(form.title, "carrossel")}.zip`,
      );
      setToast("Carrossel baixado em PNG");
    } catch {
      setToast("Não foi possível exportar o carrossel");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="creative-section">
      <div className="creative-intro">
        <div>
          <h2>Gerador de carrossel</h2>
          <p>Crie até dez slides com a identidade do negócio e baixe tudo em PNG.</p>
        </div>
        <span className="creative-local-badge">100% local</span>
      </div>
      <div className="creative-form-grid">
        <label className="creative-field creative-field-wide">
          <span>Título</span>
          <input
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Ex.: 5 erros que fazem sua empresa perder clientes"
          />
        </label>
        <label className="creative-field creative-field-wide">
          <span>Pontos do carrossel — um por linha</span>
          <textarea
            rows={6}
            value={form.points}
            onChange={(event) => set("points", event.target.value)}
            placeholder={"Demorar para responder\nNão registrar os pedidos\nNão acompanhar o pós-venda"}
          />
        </label>
        <label className="creative-field creative-field-wide">
          <span>Chamada final</span>
          <input
            value={form.callToAction}
            onChange={(event) => set("callToAction", event.target.value)}
          />
        </label>
        <label className="creative-field">
          <span>Cor de destaque</span>
          <input
            type="color"
            value={form.accent}
            onChange={(event) => set("accent", event.target.value)}
          />
        </label>
        <label className="creative-field">
          <span>Cor de fundo</span>
          <input
            type="color"
            value={form.background}
            onChange={(event) => set("background", event.target.value)}
          />
        </label>
      </div>
      <div className="creative-actions">
        <button className="btn primary" type="button" onClick={create}>
          <Sparkles size={17} /> Criar carrossel
        </button>
        {generated && (
          <button
            className="btn ghost"
            type="button"
            onClick={exportSlides}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}
            {busy ? "Preparando..." : "Baixar PNGs"}
          </button>
        )}
      </div>
      {generated && (
        <div className="carousel-preview" aria-label="Prévia do carrossel">
          {slides.map((slide, index) => (
            <article
              className={`carousel-slide-preview ${slide.kind}`}
              key={`${slide.kind}-${index}`}
              style={{
                "--creative-accent": sanitizeHexColor(form.accent),
                "--creative-background": sanitizeHexColor(
                  form.background,
                  "#15102c",
                ),
              }}
            >
              <small>{slide.eyebrow}</small>
              <h3>{slide.title}</h3>
              {slide.body && <p>{slide.body}</p>}
              <footer>
                <span>{business?.name || "Seu Funcionário"}</span>
                <span>
                  {index + 1}/{slides.length}
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ImageBatchStudio({ setToast }) {
  const [images, setImages] = useState([]);
  const [presetId, setPresetId] = useState("vertical");
  const [mode, setMode] = useState("cover");
  const [background, setBackground] = useState("#ffffff");
  const [tolerance, setTolerance] = useState(42);
  const [busy, setBusy] = useState("");
  const preset =
    SOCIAL_IMAGE_PRESETS.find((item) => item.id === presetId) ||
    SOCIAL_IMAGE_PRESETS[0];

  const importImages = async (files) => {
    const selected = [...(files || [])]
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 20);
    if (!selected.length) return;
    const settled = await Promise.allSettled(selected.map(readImage));
    const valid = settled
      .filter((item) => item.status === "fulfilled")
      .map((item) => item.value);
    setImages((current) => {
      const ids = new Set(current.map((item) => item.id));
      return [...current, ...valid.filter((item) => !ids.has(item.id))];
    });
    setToast(`${valid.length} imagem(ns) adicionada(s)`);
  };

  const resizeAll = async () => {
    if (!images.length || busy) return;
    setBusy("resize");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const item of images) {
        const image = await loadImage(item.source);
        const canvas = document.createElement("canvas");
        canvas.width = preset.width;
        canvas.height = preset.height;
        const context = canvas.getContext("2d");
        if (mode === "contain") {
          context.fillStyle = background;
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        const rect = fitImageRect(
          image.naturalWidth,
          image.naturalHeight,
          canvas.width,
          canvas.height,
          mode,
        );
        context.drawImage(
          image,
          rect.sx,
          rect.sy,
          rect.sw,
          rect.sh,
          rect.dx,
          rect.dy,
          rect.dw,
          rect.dh,
        );
        zip.file(
          `${safeDownloadName(item.name, "imagem")}-${preset.id}.jpg`,
          await canvasBlob(canvas, "image/jpeg", 0.92),
        );
      }
      downloadBlob(
        await zip.generateAsync({ type: "blob" }),
        `imagens-${preset.id}.zip`,
      );
      setToast(`${images.length} imagem(ns) redimensionada(s)`);
    } catch {
      setToast("Não foi possível redimensionar as imagens");
    } finally {
      setBusy("");
    }
  };

  const removeBackground = async (item) => {
    if (busy) return;
    setBusy(item.id);
    try {
      const image = await loadImage(item.source);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      imageData.data.set(
        removeSolidBackgroundPixels(
          imageData.data,
          canvas.width,
          canvas.height,
          tolerance,
        ),
      );
      context.putImageData(imageData, 0, 0);
      downloadBlob(
        await canvasBlob(canvas),
        `${safeDownloadName(item.name, "imagem")}-sem-fundo.png`,
      );
      setToast("Nova versão sem fundo baixada; o original foi preservado");
    } catch {
      setToast("Não foi possível remover este fundo");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="creative-section">
      <div className="creative-intro">
        <div>
          <h2>Imagens em lote</h2>
          <p>
            Redimensione até 20 imagens ou remova fundos de cor uniforme sem
            enviar arquivos para nenhum servidor.
          </p>
        </div>
        <span className="creative-local-badge">Privado e local</span>
      </div>
      <label className="creative-upload">
        <Upload size={22} />
        <strong>Adicionar imagens</strong>
        <span>PNG, JPG ou WEBP — até 20 por vez</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => {
            importImages(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <div className="creative-form-grid compact">
        <label className="creative-field">
          <span>Tamanho final</span>
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            {SOCIAL_IMAGE_PRESETS.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label} — {item.width}×{item.height}
              </option>
            ))}
          </select>
        </label>
        <label className="creative-field">
          <span>Ajuste</span>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="cover">Preencher e cortar</option>
            <option value="contain">Mostrar inteira</option>
          </select>
        </label>
        {mode === "contain" && (
          <label className="creative-field">
            <span>Fundo das margens</span>
            <input
              type="color"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
            />
          </label>
        )}
        <label className="creative-field">
          <span>Tolerância do removedor: {tolerance}</span>
          <input
            type="range"
            min="5"
            max="120"
            value={tolerance}
            onChange={(event) => setTolerance(Number(event.target.value))}
          />
        </label>
      </div>
      {images.length > 0 && (
        <>
          <div className="creative-actions">
            <button
              className="btn primary"
              type="button"
              onClick={resizeAll}
              disabled={!!busy}
            >
              {busy === "resize" ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Download size={17} />
              )}
              Redimensionar e baixar ZIP
            </button>
            <button className="btn ghost" type="button" onClick={() => setImages([])}>
              Limpar lista
            </button>
          </div>
          <div className="creative-image-list">
            {images.map((item) => (
              <article key={item.id}>
                <img src={item.source} alt="" />
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.width}×{item.height}
                  </small>
                </div>
                <button
                  className="btn ghost sm"
                  type="button"
                  onClick={() => removeBackground(item)}
                  disabled={!!busy}
                >
                  {busy === item.id ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Eraser size={15} />
                  )}
                  Remover fundo
                </button>
              </article>
            ))}
          </div>
          <p className="creative-help">
            O removedor local funciona melhor com fundos lisos. Ajuste a
            tolerância se partes do objeto também desaparecerem.
          </p>
        </>
      )}
    </section>
  );
}

function QrCodeStudio({ setToast }) {
  const [text, setText] = useState("");
  const [dark, setDark] = useState("#111827");
  const [light, setLight] = useState("#ffffff");
  const [dataUrl, setDataUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!text.trim() || busy) {
      if (!text.trim()) setToast("Informe o link ou texto do QR Code");
      return;
    }
    setBusy(true);
    try {
      const { default: QRCode } = await import("qrcode");
      setDataUrl(
        await QRCode.toDataURL(text.trim(), {
          errorCorrectionLevel: "H",
          width: 1024,
          margin: 3,
          color: { dark, light },
        }),
      );
      setToast("QR Code criado");
    } catch {
      setToast("Não foi possível criar o QR Code");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "qr-code.png";
    link.click();
  };

  return (
    <section className="creative-section">
      <div className="creative-intro">
        <div>
          <h2>QR Code genérico</h2>
          <p>Transforme links, cardápios, contatos ou qualquer texto em QR Code.</p>
        </div>
        <span className="creative-local-badge">Sem API</span>
      </div>
      <div className="creative-form-grid">
        <label className="creative-field creative-field-wide">
          <span>Link ou texto</span>
          <textarea
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="https://seusite.com.br ou uma mensagem"
          />
        </label>
        <label className="creative-field">
          <span>Cor do código</span>
          <input type="color" value={dark} onChange={(event) => setDark(event.target.value)} />
        </label>
        <label className="creative-field">
          <span>Cor do fundo</span>
          <input
            type="color"
            value={light}
            onChange={(event) => setLight(event.target.value)}
          />
        </label>
      </div>
      <div className="creative-actions">
        <button className="btn primary" type="button" onClick={generate} disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={17} /> : <QrCode size={17} />}
          Gerar QR Code
        </button>
        {dataUrl && (
          <button className="btn ghost" type="button" onClick={download}>
            <Download size={17} /> Baixar PNG
          </button>
        )}
      </div>
      {dataUrl && (
        <div className="creative-qr-preview">
          <img src={dataUrl} alt="QR Code gerado" />
          <p>Teste com a câmera do celular antes de imprimir ou publicar.</p>
        </div>
      )}
    </section>
  );
}

export default function CreativeToolkit({ business, setToast }) {
  const [tab, setTab] = useState("carrossel");
  return (
    <div className="page creative-toolkit-page">
      <header className="page-head">
        <div>
          <h1>Criação sem custo</h1>
          <p className="page-sub">
            Ferramentas locais para produzir materiais sem API, créditos ou
            assinatura adicional.
          </p>
        </div>
      </header>
      <div className="creative-tabs" role="tablist" aria-label="Ferramentas de criação">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            role="tab"
            id={`creative-tab-${id}`}
            aria-controls={`creative-panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>
      <div
        id={`creative-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`creative-tab-${tab}`}
      >
        {tab === "carrossel" && (
          <CarouselStudio business={business} setToast={setToast} />
        )}
        {tab === "imagens" && <ImageBatchStudio setToast={setToast} />}
        {tab === "qr" && <QrCodeStudio setToast={setToast} />}
      </div>
    </div>
  );
}
