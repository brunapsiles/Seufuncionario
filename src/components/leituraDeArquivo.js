// ===== Ler o conteúdo de um arquivo escolhido no navegador =====
//
// PDF, planilha, texto, imagem. Usado por anexos, documentos, bases e pela IA —
// quatro telas diferentes, o que é exatamente o motivo de não morar dentro de
// nenhuma delas.

export const DOCUMENT_UPLOAD_LIMIT = 10 * 1024 * 1024;
const DOCUMENT_TEXT_LIMIT = 300_000;

export function documentFileKind(file) {
  const extension = String(file?.name || "")
    .toLowerCase()
    .split(".")
    .pop();
  if (extension === "pdf") return { id: "pdf", label: "PDF importado" };
  if (extension === "docx") return { id: "docx", label: "Documento Word" };
  if (["txt", "md", "markdown", "csv"].includes(extension))
    return {
      id: "text",
      label: extension === "csv" ? "Planilha CSV" : "Documento importado",
    };
  return null;
}

export const documentTitleFromFilename = (name) =>
  String(name || "Documento importado")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Documento importado";

export async function extractDocumentText(file) {
  const kind = documentFileKind(file);
  if (!kind)
    throw new Error("Formato não aceito. Use PDF, DOCX, TXT, Markdown ou CSV.");
  if (!file?.size) throw new Error("O arquivo está vazio.");
  if (file.size > DOCUMENT_UPLOAD_LIMIT)
    throw new Error("O arquivo ultrapassa o limite de 10 MB.");
  const arrayBuffer = await file.arrayBuffer();
  let text = "";
  if (kind.id === "text") {
    text = new TextDecoder("utf-8").decode(arrayBuffer);
  } else if (kind.id === "docx") {
    const module = await import("mammoth");
    const mammoth = module.default || module;
    const result = await mammoth.extractRawText(
      typeof globalThis.Buffer !== "undefined"
        ? { buffer: globalThis.Buffer.from(arrayBuffer) }
        : { arrayBuffer },
    );
    text = result.value || "";
  } else {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof globalThis.Worker === "undefined") {
      globalThis.pdfjsWorker =
        await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    } else {
      const worker =
        await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    }
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim(),
      );
      page.cleanup();
    }
    if (typeof pdf.cleanup === "function") await pdf.cleanup();
    if (typeof loadingTask.destroy === "function") await loadingTask.destroy();
    text = pages.filter(Boolean).join("\n\n");
  }
  text = String(text)
    .replace(/\u0000/g, "")
    .trim();
  if (!text)
    throw new Error(
      kind.id === "pdf"
        ? "Este PDF não contém texto selecionável. PDFs digitalizados precisam de OCR."
        : "Não foi possível encontrar texto nesse arquivo.",
    );
  return {
    content: text.slice(0, DOCUMENT_TEXT_LIMIT),
    truncated: text.length > DOCUMENT_TEXT_LIMIT,
    kind,
  };
}
