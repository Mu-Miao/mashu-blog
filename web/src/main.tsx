import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./lib/theme";
import { writeStorage } from "./lib/storage";

const tq = new URLSearchParams(location.search).get("theme");
if (tq === "light" || tq === "dark") writeStorage("theme", tq);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
