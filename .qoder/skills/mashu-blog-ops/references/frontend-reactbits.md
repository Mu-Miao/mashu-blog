# Frontend development & react-bits components

Stack: React 19 + TypeScript + Vite + Tailwind 3 (`darkMode:"class"`) + React Router, in `web/`.
Design language: Apple (see the `apple-design` skill). Build: `cd web && npm run build` → `web/dist`.

## Design tokens (reuse, don't reinvent)

Tailwind theme (`web/tailwind.config.js`) + component classes (`web/src/index.css`):
- Colors: `ink` (#1d1d1f / soft #6e6e73 / faint #86868b), `canvas` (#fff / dim #f5f5f7),
  `line` #e8e8ed, `accent` #0071e3, `accent-link` #06c. Brand name is **麻薯ta爸** with `ta` in pink
  (`text-pink-500 dark:text-pink-400`).
- Radius: `rounded-pill` (980px), `rounded-card` (18px). Shadows `shadow-card`/`shadow-lift`.
- Component classes: `.btn-primary`, `.btn-ghost`, `.pill`, `.surface`, `.field`.
- Font: SF Pro system stack. Headings use negative tracking; body ~0.
- **Every new surface needs `dark:` variants.** Dark mode = `.dark` on `<html>`, driven by
  `web/src/lib/theme.tsx` (ThemeProvider, localStorage + system pref) + an inline anti-flash script
  in `index.html`.

## Adding a react-bits / shadcn component

The user pastes a reactbits "Integrate the <X /> component" doc (or gives the name). Workflow:
```bash
cd "C:\Users\MZH\Desktop\个人博客/web"
npx --yes shadcn@latest add @react-bits/<Name>-JS-CSS -y
```
Then the recurring quirks (all seen in this project):
1. `components.json` must exist (already created; style new-york, alias `@/*` → `src/*`). If you
   recreate a project, add the `@` alias to `vite.config.ts` + `tsconfig.app.json` `paths`.
2. **The CLI writes into a literal `@/` directory** (e.g. `@/components/Foo.jsx`) instead of
   resolving the alias. Move files by hand: `mv @/components/Foo.* src/components/ && rm -rf @`.
3. The JS source is plain `.jsx`; rename to `.tsx` and prepend `// @ts-nocheck` (registry code is
   untyped; don't fight it).
4. **Props with no default get inferred as required** by TS consumers. If a consumer errors on a
   missing prop, add `= undefined` to that prop's destructure (e.g. `onStackComplete = undefined`).
   For a `width`/`height` that accepts number|string, cast the default: `width = 200 as number|string`.
5. Install the component's npm dep if it has one (`gsap`, `lenis`, `vgpu`, …). Remove deps that
   become unused after swapping a component out.
6. `npx tsc -b` and `npm run build` must pass; verify in the browser; then deploy.

## Homepage components currently in place

- **Nav**: `GlassSurface` (react-bits, SVG `feDisplacementMap` refraction) as a fixed floating
  capsule. Its CSS has a `.dark` class override added (the component ships media-query dark styles
  that clash with our class-based dark mode).
- **Hero**: `ShapeWaves` (WebGPU, react-bits) full-viewport, carving "MASHUTABA"; falls back to
  `WavesCanvas` (a custom Canvas-2D approximation) when `navigator.gpu` is absent. See
  performance.md.
- **Featured posts**: `MagicBento` (react-bits + gsap) — bento grid with cursor spotlight, border
  glow, hover particles, tilt, magnetism, click ripple; fed with real posts, click → `/post/:slug`.
  (History: this slot was CardSwap → ScrollStack → MagicBento; ScrollStack's pinned-stack was
  dropped. Don't reintroduce `lenis`/`ScrollStack` unless asked.)

## Verifying UI changes

Run locally (`本地调试.bat` / `npm run dev`) and drive the built-in browser via the `browser-use`
MCP: `navigate_page` then `evaluate_script` to assert DOM/classes (e.g. card count, active nav,
`getComputedStyle` tokens). Screenshots need the browser panel **visible**; when hidden, fall back
to `evaluate_script` probes. After a change: `npx tsc -b` → `npm run build` → deploy.

## Git hygiene on a shared tree

Another agent may edit the same repo concurrently. Always `git status --short` first, `git add`
only your explicit files, and never `git add -A` blindly. Don't stash others' work.
