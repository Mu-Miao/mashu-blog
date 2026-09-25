import { useEffect, useRef } from "react";

type Props = {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  textSize?: number;
  cellSize?: number;
  dotSize?: number;
  color?: string;
  backgroundColor?: string;
  speed?: number;
  fade?: number;
  className?: string;
};

const MAX_DPR = 2;

function parseHex(value: string): [number, number, number] {
  const m = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
  let hex = m ? m[1] : "929292";
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((o) => parseInt(hex.slice(o, o + 2), 16) / 255) as [number, number, number];
}

function buildMask(
  cols: number,
  rows: number,
  text: string,
  fontFamily: string,
  fontWeight: number,
  textSize: number
): Uint8Array | null {
  if (!text) return null;
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cols, rows);
  let fontPx = Math.max(1, textSize * rows);
  ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;
  const maxWidth = cols * 0.92;
  if (measured > maxWidth) {
    fontPx = Math.max(1, (fontPx * maxWidth) / measured);
    ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, cols / 2, rows / 2);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const mask = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) mask[i] = data[i * 4] > 128 ? 1 : 0;
  return mask;
}

export default function WavesCanvas({
  text = "",
  fontFamily = 'system-ui, "PingFang SC", sans-serif',
  fontWeight = 600,
  textSize = 0.38,
  cellSize = 9,
  dotSize = 0.72,
  color = "#929292",
  backgroundColor = "#060608",
  speed = 1,
  fade = 0.35,
  className = ""
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const [r, g, b] = parseHex(color);
    const [br, bg, bb] = parseHex(backgroundColor);
    const bgRgb = `${Math.round(br * 255)},${Math.round(bg * 255)},${Math.round(bb * 255)}`;
    const bandAlpha = [0.45, 0.7, 1];
    const bandColor = bandAlpha.map(
      (a) => `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`
    );

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cols = 0;
    let rows = 0;
    let cellPx = cellSize;
    let originY = 0;
    let mask: Uint8Array | null = null;
    let time = 0;
    let last = 0;
    let frameId = 0;
    let visible = true;

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.round(w / cellSize));
      cellPx = w / cols;
      rows = Math.max(1, Math.floor(h / cellPx));
      originY = (h - rows * cellPx) / 2;
      mask = buildMask(cols, rows, text.trim(), fontFamily, fontWeight, textSize);
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, w, h);
      const shapes: number[][] = [[], [], []];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (mask && mask[idx]) continue;
          const cx = (col + 0.5) * cellPx;
          const cy = originY + (row + 0.5) * cellPx;
          const fx = col * 0.16;
          const fy = row * 0.16;
          const v =
            Math.sin(fx + time) * 0.5 +
            Math.sin(fy * 1.3 - time * 0.8) * 0.3 +
            Math.sin((fx + fy) * 0.9 + time * 0.45) * 0.25;
          const tone = Math.min(0.999, Math.max(0, v * 0.5 + 0.5));
          const band = Math.min(2, Math.floor(tone * 3));
          shapes[band].push(cx, cy);
        }
      }
      const size = cellPx * dotSize * 0.5;
      shapes.forEach((list, band) => {
        if (!list.length) return;
        ctx.beginPath();
        for (let i = 0; i < list.length; i += 2) {
          const cx = list[i];
          const cy = list[i + 1];
          if (band === 1) {
            ctx.moveTo(cx + size, cy);
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
          } else if (band === 2) {
            ctx.rect(cx - size, cy - size, size * 2, size * 2);
          } else {
            ctx.moveTo(cx, cy - size);
            ctx.lineTo(cx + size, cy + size);
            ctx.lineTo(cx - size, cy + size);
            ctx.closePath();
          }
        }
        ctx.fillStyle = bandColor[band];
        ctx.fill();
      });
      if (fade > 0) {
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
        grad.addColorStop(0, `rgba(${bgRgb},0)`);
        grad.addColorStop(1, `rgba(${bgRgb},1)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      time += dt * 0.6 * speed;
      draw();
      frameId = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frameId || !visible || document.hidden || reduceMotion.matches) return;
      last = 0;
      frameId = requestAnimationFrame(tick);
    };
    const sleep = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const onVisibility = () => (document.hidden ? sleep() : wake());
    const observer = new ResizeObserver(() => {
      layout();
      draw();
    });
    const intersect = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      visible ? wake() : sleep();
    });

    layout();
    if (reduceMotion.matches) draw();
    else wake();
    observer.observe(root);
    intersect.observe(root);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", () => {
      sleep();
      draw();
      wake();
    });

    return () => {
      sleep();
      observer.disconnect();
      intersect.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [text, fontFamily, fontWeight, textSize, cellSize, dotSize, color, backgroundColor, speed, fade]);

  return (
    <div ref={rootRef} className={`relative h-full w-full overflow-hidden ${className}`} style={{ backgroundColor }}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
    </div>
  );
}
