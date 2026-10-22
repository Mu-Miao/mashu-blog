import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

export default function AnimatedContent({
  children,
  delay = 0,
  as: Component = "div",
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={`animated-content${visible ? " animated-content--visible" : ""}`}
      style={{ "--animated-content-delay": `${Math.min(delay, 200)}ms` } as CSSProperties}
      data-animated-content
    >
      {children}
    </Component>
  );
}
