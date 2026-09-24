import { useState } from "react";
import { Link } from "react-router-dom";
import ShapeWaves from "./ShapeWaves";
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
  },
  light: {
    shell: "bg-[#e8e8ec]",
    backgroundColor: "#e8e8ec",
    color: "#9a9aa2",
    hoverColor: "#1d1d1f",
    headline: "text-ink",
    sub: "text-ink-soft",
    cta: "!bg-ink !text-white hover:!bg-ink/90",
  },
};

export default function Hero() {
  const { theme } = useTheme();
  const [gpuFailed, setGpuFailed] = useState(false);
  const p = PALETTE[theme];
  return (
    <section className={`relative overflow-hidden ${p.shell} transition-colors duration-500`}>
      <div className="h-[300px] sm:h-[400px]">
        <ShapeWaves
          text="MASHUTABA"
          fontFamily='"SF Pro Display", -apple-system, "Helvetica Neue", system-ui, sans-serif'
          fontWeight={600}
          textSize={0.38}
          shapes="mixed"
          cellSize={9}
          dotSize={0.72}
          color={p.color}
          hoverColor={p.hoverColor}
          backgroundColor={p.backgroundColor}
          speed={0.9}
          scale={1.15}
          brightness={0.42}
          fade={0.32}
          glow={theme === "dark" ? 0.3 : 0}
          intro
          introDuration={1.8}
          onError={() => setGpuFailed(true)}
        />
      </div>
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center ${
          gpuFailed ? "" : theme === "dark" ? "bg-gradient-to-b from-transparent via-black/25 to-black/55" : "bg-gradient-to-b from-transparent via-white/45 to-white/65"
        }`}
      >
        <h1
          className={`animate-fade-up text-[34px] font-semibold leading-tight tracking-tight transition-colors duration-500 sm:text-5xl ${p.headline} ${
            gpuFailed || theme === "light" ? "" : "drop-shadow-[0_2px_18px_rgb(0_0_0/0.6)]"
          }`}
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
      {gpuFailed && (
        <p className={`absolute bottom-3 w-full text-center text-[11px] ${theme === "dark" ? "text-white/30" : "text-ink-faint"}`}>
          当前浏览器不支持 WebGPU，已切换为静态封面
        </p>
      )}
    </section>
  );
}
