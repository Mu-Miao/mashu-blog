import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ShapeWaves from "./ShapeWaves";
import WavesCanvas from "./WavesCanvas";
import { useTheme } from "../lib/theme";

const PALETTE = {
  dark: {
    shell: "bg-[#060608]",
    backgroundColor: "#060608",
    color: "#6f6f76",
    hoverColor: "#f5f5f7",
    headline: "text-white",
    sub: "text-white/70",
    cta: "!bg-white !text-ink hover:!bg-white/90",
    scrim: "bg-gradient-to-b from-black/30 via-transparent to-black/60",
    shadow: "drop-shadow-[0_2px_18px_rgb(0_0_0/0.6)]",
    hint: "text-white/50",
  },
  light: {
    shell: "bg-[#e8e8ec]",
    backgroundColor: "#e8e8ec",
    color: "#9a9aa2",
    hoverColor: "#1d1d1f",
    headline: "text-ink",
    sub: "text-ink-soft",
    cta: "!bg-ink !text-white hover:!bg-ink/90",
    scrim: "bg-gradient-to-b from-white/40 via-transparent to-white/70",
    shadow: "",
    hint: "text-ink-faint",
  },
};

const WAVE = {
  text: "MASHUTABA",
  fontFamily: '"SF Pro Display", -apple-system, "Helvetica Neue", system-ui, sans-serif',
  fontWeight: 600,
  textSize: 0.38,
  cellSize: 9,
  dotSize: 0.72,
  fade: 0.32,
};

const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

function scrollToContent() {
  document.getElementById("content")?.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

export default function Hero() {
  const { theme } = useTheme();
  const [gpuFailed, setGpuFailed] = useState(false);
  const p = PALETTE[theme];
  const useGpu = hasWebGPU && !gpuFailed;

  const overlayRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const progress = Math.min(1, Math.max(0, window.scrollY / vh));
      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.5));
        overlayRef.current.style.transform = `translateY(${progress * -70}px) scale(${1 - progress * 0.08})`;
      }
      if (waveRef.current) {
        waveRef.current.style.transform = `translateY(${progress * 100}px) scale(${1 + progress * 0.1})`;
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = String(Math.max(0, 1 - progress * 3.2));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative h-screen min-h-[560px] overflow-hidden supports-[height:100svh]:h-[100svh]">
      <div
        ref={waveRef}
        className={`absolute inset-0 will-change-transform ${p.shell} transition-colors duration-500`}
      >
        {useGpu ? (
          <ShapeWaves
            {...WAVE}
            shapes="mixed"
            color={p.color}
            hoverColor={p.hoverColor}
            backgroundColor={p.backgroundColor}
            speed={0.9}
            scale={1.15}
            brightness={0.42}
            glow={theme === "dark" ? 0.3 : 0}
            intro
            introDuration={1.8}
            onError={() => setGpuFailed(true)}
          />
        ) : (
          <WavesCanvas {...WAVE} cellSize={14} targetFps={30} color={p.color} backgroundColor={p.backgroundColor} speed={0.9} fade={0.35} />
        )}
      </div>

      <div
        ref={overlayRef}
        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-5 text-center will-change-transform ${p.scrim}`}
      >
        <p className={`animate-fade-up text-xs font-medium uppercase tracking-[0.3em] ${p.sub}`}>MASHUTABA · 博客</p>
        <h1
          className={`animate-fade-up text-[40px] font-semibold leading-[1.08] tracking-tight transition-colors duration-500 sm:text-6xl ${p.headline} ${p.shadow}`}
        >
          记录，是为了不遗忘
        </h1>
        <p className={`animate-fade-up max-w-md text-sm leading-7 transition-colors duration-500 [animation-delay:150ms] sm:text-base ${p.sub}`}>
          一个关于嵌入式、写作与生活的个人博客
        </p>
        <div className="pointer-events-auto mt-3 flex animate-fade-up items-center gap-3 [animation-delay:300ms]">
          <Link to="/archive" className={`btn-primary !px-6 !py-2.5 transition-colors duration-500 ${p.cta}`}>
            浏览全部文章
          </Link>
        </div>
      </div>

      <div
        ref={hintRef}
        className={`absolute inset-x-0 bottom-7 flex flex-col items-center gap-2 will-change-transform ${p.hint}`}
      >
        <button
          onClick={scrollToContent}
          aria-label="向下阅读"
          className="pointer-events-auto flex flex-col items-center gap-2 transition active:scale-95"
        >
          <span className="text-xs tracking-widest">下滑</span>
          <svg className="animate-bounce" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
