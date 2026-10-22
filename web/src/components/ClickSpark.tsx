import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

const RAYS = Array.from({ length: 6 }, (_, index) => index * 60);

interface Spark {
  id: number;
  x: number;
  y: number;
}

export default function ClickSpark({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [spark, setSpark] = useState<Spark | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const trigger = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = event.target as HTMLElement;
    if (target.closest("button:disabled")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setSpark({ id: performance.now(), x: event.clientX - rect.left, y: event.clientY - rect.top });
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setSpark(null), 320);
  };

  return (
    <span className={`click-spark ${className}`} onPointerDown={trigger}>
      {children}
      {spark && (
        <span
          key={spark.id}
          className="click-spark__burst"
          style={{ left: spark.x, top: spark.y } as CSSProperties}
          aria-hidden="true"
          data-click-spark
        >
          {RAYS.map((angle) => (
            <span key={angle} className="click-spark__ray" style={{ "--spark-angle": `${angle}deg` } as CSSProperties} />
          ))}
        </span>
      )}
    </span>
  );
}
