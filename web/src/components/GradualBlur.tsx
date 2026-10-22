import { useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

const LAYERS = [6, 5, 4, 3, 2, 1];

const subscribeToScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};

const getScrollSnapshot = () => window.scrollY > 24;

export default function GradualBlur() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const scrolled = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, () => false);
  const visible = !isHome || scrolled;

  return (
    <div className={`gradual-blur${visible ? " gradual-blur--visible" : ""}`} aria-hidden="true" data-gradual-blur>
      {LAYERS.map((blur, index) => (
        <span key={blur} className={`gradual-blur__layer gradual-blur__layer--${index + 1}`} style={{ backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)` }} />
      ))}
    </div>
  );
}
