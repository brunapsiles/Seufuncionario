// ===== Anexos =====
//
// Ler arquivo escolhido no navegador, guardar e listar. O preview ampliado
// abre em cima da tela porque miniatura de comprovante não se lê.

import { FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { authHeaders } from "../session/armazenamento.js";
import { uid } from "../domain.js";
import { extractDocumentText } from "./leituraDeArquivo.js";

const ATTACHMENT_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
const MAX_ATTACHMENT_IMAGE_BYTES = 350_000;
const MAX_ATTACHMENT_TEXT_CHARS = 8_000;
const MAX_ATTACHMENTS_PER_ITEM = 5;

function isImageAttachmentFile(file) {
  const extension = String(file?.name || "")
    .toLowerCase()
    .split(".")
    .pop();
  return (
    ATTACHMENT_IMAGE_EXTENSIONS.includes(extension) ||
    (file?.type || "").startsWith("image/")
  );
}

export async function compressImageForAttachment(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Imagem inválida."));
    el.src = dataUrl;
  });
  const maxDim = 1280;
  const width = image.naturalWidth || image.width || maxDim;
  const height = image.naturalHeight || image.height || maxDim;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length * 0.75 > MAX_ATTACHMENT_IMAGE_BYTES && quality > 0.35) {
    quality -= 0.12;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length * 0.75 > MAX_ATTACHMENT_IMAGE_BYTES)
    throw new Error(
      "A imagem é grande demais mesmo após compressão. Tente uma imagem menor.",
    );
  return out;
}

export async function buildAttachment(file) {
  if (!file?.size) throw new Error("O arquivo está vazio.");
  if (isImageAttachmentFile(file)) {
    const dataUrl = await compressImageForAttachment(file);
    return {
      id: uid(),
      name: file.name,
      kind: "image",
      dataUrl,
      size: file.size,
      createdAt: new Date().toISOString(),
    };
  }
  const { content, truncated } = await extractDocumentText(file);
  return {
    id: uid(),
    name: file.name,
    kind: "document",
    content: content.slice(0, MAX_ATTACHMENT_TEXT_CHARS),
    truncated: truncated || content.length > MAX_ATTACHMENT_TEXT_CHARS,
    size: file.size,
    createdAt: new Date().toISOString(),
  };
}

export async function addAttachmentsFromFiles(fileList, current, onError) {
  const existing = Array.isArray(current) ? current : [];
  const room = Math.max(0, MAX_ATTACHMENTS_PER_ITEM - existing.length);
  const files = [...(fileList || [])].slice(0, room);
  const results = [...existing];
  for (const file of files) {
    try {
      results.push(await buildAttachment(file));
    } catch (error) {
      onError?.(error.message || `Não foi possível anexar "${file.name}".`);
    }
  }
  return results;
}

export function AttachmentList({ attachments, onRemove }) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!preview) return undefined;
    const h = (e) => e.key === "Escape" && setPreview(null);
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [preview]);
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="attachment-list">
      {attachments.map((a) => (
        <span key={a.id} className="attachment-chip">
          {a.kind === "image" ? (
            <button
              type="button"
              className="attachment-thumb"
              aria-label={`Ver imagem ampliada de ${a.name}`}
              onClick={() => setPreview(a)}
            >
              <img src={a.dataUrl} alt={a.name} />
            </button>
          ) : (
            <FileText />
          )}
          <b>{a.name}</b>
          {onRemove && (
            <button
              type="button"
              className="icon-button"
              aria-label={`Remover anexo ${a.name}`}
              onClick={() => onRemove(a.id)}
            >
              <X />
            </button>
          )}
        </span>
      ))}
      {preview && (
        <div
          className="attachment-lightbox"
          role="dialog"
          aria-label={`Imagem ampliada: ${preview.name}`}
        >
          <img src={preview.dataUrl} alt={preview.name} />
          <button
            type="button"
            className="attachment-lightbox-close"
            aria-label="Fechar imagem ampliada"
            onClick={() => setPreview(null)}
          >
            <X />
          </button>
        </div>
      )}
    </div>
  );
}
