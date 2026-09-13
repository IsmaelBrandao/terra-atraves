import type { ShareCardContent } from "./shareCardContent";

/** 4:5 portrait works in chats, feeds and stories without cropping the key text. */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif';
const SANS = 'Manrope, "Segoe UI", system-ui, sans-serif';
const ORIGIN_COLOR = "#f5c86a";
const DESTINATION_COLOR = "#7fe3f2";

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number, font: (size: number) => string, size: number, minSize: number) {
  let current = size;
  context.font = font(current);
  while (context.measureText(text).width > maxWidth && current > minSize) {
    current -= 4;
    context.font = font(current);
  }
  if (context.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && context.measureText(`${truncated}…`).width > maxWidth) truncated = truncated.slice(0, -1);
  return `${truncated.trimEnd()}…`;
}

function drawBackground(context: CanvasRenderingContext2D) {
  const gradient = context.createRadialGradient(540, 620, 60, 540, 620, 900);
  gradient.addColorStop(0, "#0d1b30");
  gradient.addColorStop(0.55, "#060d1a");
  gradient.addColorStop(1, "#02040a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  const random = seededRandom(20_260_913);
  for (let index = 0; index < 140; index += 1) {
    const radius = random() < 0.9 ? 0.9 : 1.6;
    context.globalAlpha = 0.15 + random() * 0.45;
    context.fillStyle = "#dbe7ff";
    context.beginPath();
    context.arc(random() * SHARE_CARD_WIDTH, random() * SHARE_CARD_HEIGHT, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawEarth(context: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const glow = context.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.22);
  glow.addColorStop(0, "rgba(110, 170, 255, 0.22)");
  glow.addColorStop(1, "rgba(110, 170, 255, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
  context.fill();

  const body = context.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
  body.addColorStop(0, "#1d3b5c");
  body.addColorStop(0.7, "#0c1f36");
  body.addColorStop(1, "#071426");
  context.fillStyle = body;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.clip();
  context.strokeStyle = "rgba(190, 215, 255, 0.12)";
  context.lineWidth = 1.5;
  for (let index = 1; index < 6; index += 1) {
    const offset = (index / 6) * 2 - 1;
    context.beginPath();
    context.ellipse(cx, cy, radius * Math.abs(offset) , radius, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(cx, cy + offset * radius, radius * Math.sqrt(1 - offset * offset), radius * 0.12 * Math.sqrt(1 - offset * offset), 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  context.strokeStyle = "rgba(200, 225, 255, 0.35)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.stroke();

  const top = cy - radius;
  const bottom = cy + radius;
  const route = context.createLinearGradient(cx, top, cx, bottom);
  route.addColorStop(0, ORIGIN_COLOR);
  route.addColorStop(1, DESTINATION_COLOR);
  context.strokeStyle = route;
  context.lineWidth = 4;
  context.setLineDash([2, 12]);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(cx, top);
  context.lineTo(cx, bottom);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = "#ffe3a3";
  context.beginPath();
  context.arc(cx, cy, 7, 0, Math.PI * 2);
  context.fill();

  for (const [y, color] of [[top, ORIGIN_COLOR], [bottom, DESTINATION_COLOR]] as const) {
    context.fillStyle = "#02040a";
    context.beginPath();
    context.arc(cx, y, 17, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(cx, y, 11, 0, Math.PI * 2);
    context.fill();
  }
}

function drawLabel(context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  context.font = `700 22px ${SANS}`;
  context.fillStyle = color;
  context.letterSpacing = "6px";
  context.fillText(text, x, y);
  context.letterSpacing = "0px";
}

export async function renderShareCard(content: ShareCardContent): Promise<Blob> {
  if (document.fonts?.load) {
    await Promise.race([
      Promise.all([document.fonts.load(`64px ${SERIF}`), document.fonts.load(`700 22px ${SANS}`)]),
      new Promise((resolve) => window.setTimeout(resolve, 1_200)),
    ]).catch(() => undefined);
  }

  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponível");

  drawBackground(context);
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  const center = SHARE_CARD_WIDTH / 2;
  const maxWidth = SHARE_CARD_WIDTH - 160;

  drawLabel(context, "TERRA ATRAVÉS", center, 110, "rgba(235, 242, 255, 0.78)");

  drawLabel(context, "ORIGEM", center, 205, ORIGIN_COLOR);
  const originTitle = fitText(context, content.originTitle, maxWidth, (size) => `400 ${size}px ${SERIF}`, 84, 52);
  context.fillStyle = "#f5f8ff";
  context.fillText(originTitle, center, 290);
  context.font = `500 28px ${SANS}`;
  context.fillStyle = "rgba(226, 235, 250, 0.62)";
  context.fillText(fitText(context, content.originSubtitle, maxWidth, (size) => `500 ${size}px ${SANS}`, 28, 22), center, 336);

  drawEarth(context, center, 632, 205);

  context.font = `600 30px ${SANS}`;
  context.fillStyle = "rgba(245, 248, 255, 0.92)";
  context.fillText(content.distanceLabel, center, 905);

  drawLabel(context, "ANTÍPODA", center, 1000, DESTINATION_COLOR);
  const destinationTitle = fitText(context, content.destinationTitle, maxWidth, (size) => `400 ${size}px ${SERIF}`, 96, 56);
  context.fillStyle = "#f5f8ff";
  context.fillText(destinationTitle, center, 1092);
  context.font = `500 28px ${SANS}`;
  context.fillStyle = "rgba(226, 235, 250, 0.62)";
  context.fillText(fitText(context, content.destinationSubtitle, maxWidth, (size) => `500 ${size}px ${SANS}`, 28, 22), center, 1140);

  if (content.footnote) {
    context.fillStyle = "rgba(226, 235, 250, 0.5)";
    context.fillText(fitText(context, content.footnote, maxWidth, (size) => `500 ${size}px ${SANS}`, 24, 20), center, 1186);
  }

  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(80, 1242);
  context.lineTo(SHARE_CARD_WIDTH - 80, 1242);
  context.stroke();
  context.textAlign = "left";
  context.font = `600 22px ${SANS}`;
  context.fillStyle = "rgba(226, 235, 250, 0.55)";
  context.fillText(content.kindLabel.toUpperCase(), 80, 1290);
  context.textAlign = "right";
  context.fillText(content.siteLabel, SHARE_CARD_WIDTH - 80, 1290);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))), "image/png");
  });
}
