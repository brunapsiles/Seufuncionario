import PptxGenJS from "pptxgenjs";

const safeFilename = (value) =>
  String(value || "apresentacao")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "apresentacao";

export function createPresentationPptx(deck, identity = {}) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : [];
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = identity.author || "Seu Funcionário";
  pptx.company = identity.company || "Seu Funcionário";
  pptx.subject = deck?.objetivo || "Apresentação";
  pptx.title = deck?.title || "Apresentação";
  pptx.lang = "pt-BR";

  slides.forEach((slide, index) => {
    const page = pptx.addSlide();
    page.background = { color: "0F172A" };
    page.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.18,
      h: 7.5,
      line: { color: "7C3AED", transparency: 100 },
      fill: { color: "7C3AED" },
    });
    page.addText(slide.title || "Slide", {
      x: 0.75,
      y: index === 0 ? 2.15 : 0.7,
      w: 11.6,
      h: index === 0 ? 1.6 : 1.15,
      margin: 0,
      fontFace: "Aptos Display",
      fontSize: index === 0 ? 30 : 25,
      bold: true,
      color: "FFFFFF",
      breakLine: false,
      fit: "shrink",
      valign: "mid",
    });
    const bullets = (slide.bullets || []).filter(Boolean);
    if (bullets.length)
      page.addText(bullets.map((item) => `•  ${item}`).join("\n"), {
        x: 0.95,
        y: index === 0 ? 4.05 : 2.15,
        w: 11,
        h: index === 0 ? 1.25 : 3.8,
        margin: 0,
        breakLine: false,
        fontFace: "Aptos",
        fontSize: index === 0 ? 17 : 18,
        color: "E2E8F0",
        fit: "shrink",
        paraSpaceAfterPt: 14,
        valign: "top",
      });
    page.addText(`${index + 1} / ${slides.length}`, {
      x: 11.7,
      y: 7,
      w: 0.85,
      h: 0.25,
      margin: 0,
      align: "right",
      fontFace: "Aptos",
      fontSize: 9,
      color: "94A3B8",
    });
    if (slide.notes) page.addNotes(String(slide.notes));
  });

  return pptx;
}

export async function downloadPresentationPptx(deck, identity = {}) {
  const pptx = createPresentationPptx(deck, identity);
  await pptx.writeFile({
    fileName: `${safeFilename(deck?.title)}.pptx`,
    compression: true,
  });
}
