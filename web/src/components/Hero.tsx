import { useState } from "react";
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
    scrim: "bg-gradient-to-b from-transparent via-black/25 to-black/55",
    shadow: "drop-shadow-[0_2px_18px_rgb(0_0_0/0.6)]",
  },
  light: {
    shell: "bg-[#e8e8ec]",
    backgroundColor: "#e8e8ec",
    color: "#9a9aa2",
    hoverColor: "#1d1d1f",
    headline: "text-ink",
    sub: "text-ink-soft",
    cta: "!bg-ink !text-white hover:!bg-ink/90",
    scrim: "bg-gradient-to-b from-transparent via-white/45 to-white/65",
    shadow: "",
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

export default function Hero() {
  const { theme } = useTheme();
  const [gpuFailed, setGpuFailed] = useState(false);
  const p = PALETTE[theme];
  const useGpu = hasWebGPU && !gpuFailed;
  return (
    <section className={`relative overflow-hidden ${p.shell} transition-colors duration-500`}>
      <div className="h-[300px] sm:h-[400px]">
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
          <WavesCanvas {...WAVE} color={p.color} backgroundColor={p.backgroundColor} speed={0.9} fade={0.35} />
        )}
      </div>
      <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center ${p.scrim}`}>
        <h1
          className={`animate-fade-up text-[34px] font-semibold leading-tight tracking-tight transition-colors duration-500 sm:text-5xl ${p.headline} ${p.shadow}`}
        >
          记录，是为了不遗忘
        </h1>
        <p className={`animate-fade-up text-sm transition-colors duration-500 [animation-delay:150ms] sm:text-base ${p.sub}`}>
          一个关于嵌入式、写作与生活的个人博客
        </p>
        <div className="pointer-events-auto mt-2 animate-fade-up [animation-delay:300ms]">
          <Link to="/archive" className={`btn-primary transition-colors duration-500 ${p.cta}`}>
            浏览全部文章
          </Link>
        </div>
      </div>
    </section>
  );
}
