export const SOCIAL_IMAGE_PRESETS = [
  { id: "quadrado", label: "Post quadrado", width: 1080, height: 1080 },
  { id: "vertical", label: "Post vertical", width: 1080, height: 1350 },
  { id: "story", label: "Story / Reels", width: 1080, height: 1920 },
  { id: "capa", label: "Capa horizontal", width: 1200, height: 628 },
];

const cleanText = (value, limit = 240) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);

export function normalizeCarouselPoints(value, limit = 8) {
  return String(value || "")
    .split(/\n|;/)
    .map((line) => cleanText(line, 220).replace(/^[-•\d.)\s]+/, ""))
    .filter(Boolean)
    .slice(0, limit);
}

export function createCarouselSlides({
  title,
  points,
  callToAction,
  brandName,
} = {}) {
  const safeTitle = cleanText(title, 120);
  if (!safeTitle) return [];
  const items = normalizeCarouselPoints(points);
  const slides = [
    {
      kind: "cover",
      eyebrow: cleanText(brandName, 60) || "CONTEÚDO PRÁTICO",
      title: safeTitle,
      body: items.length
        ? `${items.length} pontos para aplicar`
        : "Deslize para continuar",
    },
    ...items.map((point, index) => ({
      kind: "content",
      eyebrow: `${String(index + 1).padStart(2, "0")} / ${String(
        items.length,
      ).padStart(2, "0")}`,
      title: point,
      body: "",
    })),
  ];
  const cta = cleanText(callToAction, 180);
  if (cta)
    slides.push({
      kind: "cta",
      eyebrow: cleanText(brandName, 60) || "PRÓXIMO PASSO",
      title: cta,
      body: "Salve e compartilhe com quem precisa.",
    });
  return slides.slice(0, 10);
}

export function sanitizeHexColor(value, fallback = "#6d38e0") {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function fitImageRect(
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  mode = "cover",
) {
  const sw = Math.max(1, Number(sourceWidth) || 1);
  const sh = Math.max(1, Number(sourceHeight) || 1);
  const tw = Math.max(1, Number(targetWidth) || 1);
  const th = Math.max(1, Number(targetHeight) || 1);
  if (mode === "contain") {
    const scale = Math.min(tw / sw, th / sh);
    const width = sw * scale;
    const height = sh * scale;
    return {
      sx: 0,
      sy: 0,
      sw,
      sh,
      dx: (tw - width) / 2,
      dy: (th - height) / 2,
      dw: width,
      dh: height,
    };
  }
  const scale = Math.max(tw / sw, th / sh);
  const cropWidth = tw / scale;
  const cropHeight = th / scale;
  return {
    sx: (sw - cropWidth) / 2,
    sy: (sh - cropHeight) / 2,
    sw: cropWidth,
    sh: cropHeight,
    dx: 0,
    dy: 0,
    dw: tw,
    dh: th,
  };
}

export function averageCornerColor(data, width, height) {
  if (!data?.length || width < 1 || height < 1) return [255, 255, 255];
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4,
  ];
  return [0, 1, 2].map((channel) =>
    Math.round(
      corners.reduce((total, index) => total + data[index + channel], 0) /
        corners.length,
    ),
  );
}

export function removeSolidBackgroundPixels(
  source,
  width,
  height,
  tolerance = 40,
) {
  const output = new Uint8ClampedArray(source || []);
  const background = averageCornerColor(output, width, height);
  const threshold = Math.max(0, Math.min(255, Number(tolerance) || 0));
  for (let index = 0; index < output.length; index += 4) {
    const distance = Math.sqrt(
      (output[index] - background[0]) ** 2 +
        (output[index + 1] - background[1]) ** 2 +
        (output[index + 2] - background[2]) ** 2,
    );
    if (distance <= threshold) {
      const feather = threshold > 8 ? Math.max(0, distance / threshold) : 0;
      output[index + 3] = Math.round(output[index + 3] * feather);
    }
  }
  return output;
}

export function safeDownloadName(value, fallback = "arquivo") {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}
