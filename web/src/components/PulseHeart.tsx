import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import FavouriteIcon from "@hugeicons/core-free-icons/FavouriteIcon";
import StarIcon from "@hugeicons/core-free-icons/StarIcon";
import ThumbsUpIcon from "@hugeicons/core-free-icons/ThumbsUpIcon";

import "./PulseHeart.css";

const OUT = 0.4;
const ICONS = { heart: FavouriteIcon, star: StarIcon, thumb: ThumbsUpIcon };

const back = (k: number, c: number) => {
  const u = k - 1;
  return 1 + (c + 1) * u ** 3 + c * u ** 2;
};
const swellOf = (t: number, c: number) =>
  t <= 0 ? 0 : t < OUT ? 1 - (1 - t / OUT) ** 3 : 1 - back((t - OUT) / (1 - OUT), c);
const format = (n: number) => new Intl.NumberFormat().format(n);
const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type BuiltInIcon = keyof typeof ICONS;

interface PulseHeartProps {
  liked?: boolean;
  defaultLiked?: boolean;
  count?: number;
  onChange?: (liked: boolean, count: number) => void;
  showCount?: boolean;
  icon?: BuiltInIcon | ReactNode;
  idleOutline?: boolean;
  size?: number;
  corner?: number;
  likedColor?: string;
  idleColor?: string;
  pillColor?: string;
  textColor?: string;
  duration?: number;
  dotSize?: number;
  overshoot?: number;
  beat?: number;
  rollDuration?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export default function PulseHeart({
  liked: likedProp,
  defaultLiked = false,
  count = 0,
  onChange,
  showCount = true,
  icon = "heart",
  idleOutline = true,
  size = 40,
  corner = 32,
  likedColor = "#ff4d6d",
  idleColor = "#8b8b93",
  pillColor = "#232326",
  textColor = "#f5f5f5",
  duration = 560,
  dotSize = 0.3,
  overshoot = 1.7,
  beat = 3,
  rollDuration = 350,
  disabled = false,
  label = "点赞",
  className = "",
}: PulseHeartProps) {
  const controlled = likedProp !== undefined;
  const [inner, setInner] = useState(defaultLiked);
  const [localCount, setLocalCount] = useState(count);
  const [previousCount, setPreviousCount] = useState(count);
  if (previousCount !== count) {
    setPreviousCount(count);
    setLocalCount(count);
  }
  const total = controlled ? count : localCount;
  const liked = controlled ? likedProp : inner;
  const [shown, setShown] = useState({ liked, count });
  const [roll, setRoll] = useState<{ a: string; b: string; at: number; up: boolean } | null>(null);

  const rootRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const heartRef = useRef<HTMLSpanElement>(null);
  const glyphRef = useRef<SVGGElement>(null);
  const rollRef = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viaPointer = useRef(false);
  const shownRef = useRef(shown);
  const logical = useRef({ liked, count: total });
  const cfg = useRef({ duration, dotSize, overshoot, beat, rollDuration });

  useLayoutEffect(() => {
    logical.current = { liked, count: total };
    cfg.current = { duration, dotSize, overshoot, beat, rollDuration };
  }, [liked, total, duration, dotSize, overshoot, beat, rollDuration]);

  useEffect(() => {
    if (raf.current) return;
    if (shownRef.current.liked === liked && shownRef.current.count === total) return;
    shownRef.current = { liked, count: total };
    setShown(shownRef.current);
  }, [liked, total]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.instant === undefined) return;
    root.getBoundingClientRect();
    delete root.dataset.instant;
  }, [shown]);

  useLayoutEffect(() => {
    const el = rollRef.current;
    if (!el || !roll) return;
    el.style.transition = "none";
    el.style.transform = `translateY(${roll.up ? "0" : "-1em"})`;
    el.getBoundingClientRect();
    el.style.transition = "";
    el.style.transform = `translateY(${roll.up ? "-1em" : "0"})`;
  }, [roll]);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    if (rollTimer.current) clearTimeout(rollTimer.current);
  }, []);

  const startRoll = (from: number, to: number) => {
    if (from === to) return;
    const a = format(from);
    const b = format(to);
    const changed = a.length === b.length ? [...b].flatMap((ch, i) => ch !== a[i] ? [i] : []) : [];
    setRoll({ a, b, at: changed.length === 1 ? changed[0] : -1, up: to > from });
    if (rollTimer.current) clearTimeout(rollTimer.current);
    rollTimer.current = setTimeout(() => setRoll(null), cfg.current.rollDuration);
  };

  const run = (nextLiked: boolean, nextCount: number) => {
    const root = rootRef.current;
    const heart = heartRef.current;
    const pill = pillRef.current;
    if (!root || !heart || !pill) return;
    const glyph = glyphRef.current;
    root.dataset.running = "";
    let swapped = false;
    let previousFrame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const { duration: runDuration, dotSize: dot, overshoot: c, beat: beatAmount } = cfg.current;
      const t = Math.min(1, (now - startedAt) / runDuration);
      const step = previousFrame ? now - previousFrame : 1000 / 60;
      previousFrame = now;
      const swell = swellOf(t, c);
      const scale = 1 - (1 - dot) * swell;
      if (glyph) glyph.setAttribute("transform", `translate(12 12) scale(${scale}) translate(-12 -12)`);
      else heart.style.transform = `scale(${scale})`;
      pill.style.transform = `scale(${1 - (beatAmount / 100) * swell})`;
      if (!swapped && t + step / 2 / runDuration >= OUT) {
        swapped = true;
        root.dataset.liked = String(nextLiked);
        startRoll(shownRef.current.count, nextCount);
        shownRef.current = { liked: nextLiked, count: nextCount };
        setShown(shownRef.current);
      }
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      raf.current = 0;
      glyph?.removeAttribute("transform");
      heart.style.transform = "";
      pill.style.transform = "";
      delete root.dataset.running;
      const latest = logical.current;
      if (latest.liked !== shownRef.current.liked || latest.count !== shownRef.current.count) {
        shownRef.current = latest;
        setShown(latest);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || raf.current) return;
    const pointer = viaPointer.current && event.detail !== 0;
    viaPointer.current = false;
    const nextLiked = !liked;
    const nextCount = Math.max(0, total + (nextLiked ? 1 : -1));
    if (!controlled) {
      setInner(nextLiked);
      setLocalCount(nextCount);
    }
    onChange?.(nextLiked, nextCount);
    if (pointer && !reducedMotion()) run(nextLiked, nextCount);
    else if (rootRef.current) rootRef.current.dataset.instant = "";
  };

  const paths = typeof icon === "string" ? ICONS[icon as BuiltInIcon] ?? ICONS.heart : null;
  const text = format(shown.count);
  const cells = roll
    ? roll.at === -1
      ? [{ top: roll.up ? roll.a : roll.b, bottom: roll.up ? roll.b : roll.a }]
      : [...roll.b].map((ch, i) => i === roll.at
        ? { top: roll.up ? roll.a[i] : ch, bottom: roll.up ? ch : roll.a[i] }
        : { ch })
    : [...text].map((ch) => ({ ch }));

  return (
    <button
      ref={rootRef}
      type="button"
      aria-pressed={liked}
      disabled={disabled}
      data-liked={String(shown.liked)}
      data-solid={idleOutline ? undefined : ""}
      data-no-count={showCount ? undefined : ""}
      className={`pulse-heart${className ? ` ${className}` : ""}`}
      style={{
        "--ph-size": `${size}px`, "--ph-corner": `${corner}px`, "--ph-pill": pillColor,
        "--ph-idle": idleColor, "--ph-liked": likedColor, "--ph-text": textColor,
        "--ph-roll": `${rollDuration}ms`, "--ph-stroke": `${(1.5 * size) / 24}px`,
      } as React.CSSProperties}
      onPointerDown={(event) => {
        if (event.button !== 0 || disabled) return;
        viaPointer.current = true;
        if (!reducedMotion() && rootRef.current) rootRef.current.dataset.pressed = "";
      }}
      onPointerUp={() => { if (rootRef.current) delete rootRef.current.dataset.pressed; }}
      onPointerLeave={() => { if (rootRef.current) delete rootRef.current.dataset.pressed; }}
      onPointerCancel={() => {
        viaPointer.current = false;
        if (rootRef.current) delete rootRef.current.dataset.pressed;
      }}
      onKeyDown={() => { viaPointer.current = false; }}
      onClick={handleClick}
    >
      <span ref={pillRef} className="pulse-heart__pill">
        <span ref={heartRef} className="pulse-heart__heart" aria-hidden="true">
          {paths ? (
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g ref={glyphRef}>
                {paths.map(([, attrs]) => (
                  <path key={String(attrs.key)} d={String(attrs.d)} vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            </svg>
          ) : icon}
        </span>
        {showCount ? (
          <span className="pulse-heart__count" aria-hidden="true">
            {cells.map((cell, i) => "ch" in cell ? (
              <span key={`c${i}`}>{cell.ch}</span>
            ) : (
              <span key={`r${i}`} className="pulse-heart__slot">
                <span ref={rollRef} className="pulse-heart__roll">
                  <span>{cell.top}</span><span>{cell.bottom}</span>
                </span>
              </span>
            ))}
          </span>
        ) : null}
        <span className="pulse-heart__sr">{showCount ? `${label}，${format(total)}` : label}</span>
      </span>
    </button>
  );
}
