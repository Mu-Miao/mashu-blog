import { useCallback, useEffect, useState } from "react";
import { ThemeContext, type Theme } from "./themeContext";
import { readStorage, writeStorage } from "./storage";

function initial(): Theme {
  const requested = new URLSearchParams(location.search).get("theme");
  if (requested === "light" || requested === "dark") return requested;
  const stored = readStorage("theme");
  if (stored === "light" || stored === "dark") return stored;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    writeStorage("theme", theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
