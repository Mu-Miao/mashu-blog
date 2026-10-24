import { lazy, Suspense, useSyncExternalStore } from "react";
import { useTheme } from "../lib/themeContext";
import brandLogo from "../assets/brand/strict-father-logo-v1.png";
import "./ElectricLogo.css";

const ElectricLogo = lazy(() => import("./ElectricLogo"));
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const reducedMotionSnapshot = () => window.matchMedia(motionQuery).matches;
const serverMotionSnapshot = () => true;

/** Keep the original mark visible while the electric contour loads, or without WebGL. */
export default function BrandLogo() {
  const { theme } = useTheme();
  const reducedMotion = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, serverMotionSnapshot);

  return (
    <span className="brand-electric-logo" aria-hidden="true">
      <img src={brandLogo} alt="" width={44} height={44} />
      {!reducedMotion && (
        <Suspense fallback={null}>
          <ElectricLogo
            src={brandLogo}
            color={theme === "dark" ? "#f9a8d4" : "#ec4899"}
            glowColor="#ec4899"
            theme={theme}
            scale={0.68}
            intensity={0.35}
            glow={0.35}
            thickness={0.3}
            strands={2}
            bend={0.15}
            crackle={0.35}
            arcs={0.35}
            flicker={0.2}
            speed={1.4}
            cursorRadius={30}
            cursorIntensity={0.18}
          />
        </Suspense>
      )}
    </span>
  );
}
