# Performance & the hero animation

The user is on a modest machine and a 360 browser (no WebGPU), and has twice reported lag. Keep the
homepage cheap.

## The hero has two renderers

`web/src/components/Hero.tsx` picks based on `'gpu' in navigator`:
- **`ShapeWaves`** (WebGPU, react-bits) — the rich version with mouse-ripple. Only on secure
  contexts that expose WebGPU: localhost or https://blog.mashutaba.best. Not on
  `http://120.26.177.214:8080` (insecure → `navigator.gpu` undefined).
- **`WavesCanvas`** (`web/src/components/WavesCanvas.tsx`) — a Canvas-2D approximation (sine-sum
  field, 3 shape bands, text cutout via an offscreen mask, radial fade). Used when WebGPU is
  unavailable. It has NO mouse ripple (kept simple).

## WavesCanvas cost controls (already tuned — keep them)

A full-viewport 2D canvas redrawing thousands of dots every frame was the original lag source. The
fixes baked in:
- **Frame throttle** to ~30fps (`targetFps`): the waves move slowly, 30fps looks fine and halves
  work. Implemented by skipping the draw when `now - last < 1000/targetFps`.
- **DPR capped to 1** (`MAX_DPR = 1`): on a full-screen canvas, devicePixelRatio 2 quadruples
  pixels for no visible gain on dots.
- **Coarser grid** for the hero: `cellSize` 14 (fewer dots). Offscreen benchmark: 5.0ms → 1.65ms
  per frame, plus the 30fps cap ≈ 6× less work.
- Pauses via IntersectionObserver when the hero scrolls out of view, and on `document.hidden`.

If the user reports lag again, in order: lower `targetFps` (e.g. 24), raise `cellSize` (e.g. 16),
or shrink the hero height. Measure before/after with the offscreen benchmark below.

## Testing animation/perf CORRECTLY (this bit us)

- **A hidden browser tab throttles `requestAnimationFrame` to ~0**, so canvas/WebGL looks frozen and
  pixel-sampling returns blank. `visibilityState === 'hidden'` → your measurement is meaningless.
  Only trust animation checks when the browser panel is actually visible.
- To measure per-frame draw cost without a visible panel, run an **offscreen canvas benchmark**
  (create a temp canvas at target size, draw the same dot loop N times, time it). This is
  independent of rAF/visibility and gives a real ms/frame number to compare params.
- **Lenis-driven scroll only updates on real wheel events.** Setting `element.scrollTop` or
  `window.scrollTo` bypasses Lenis' internal loop, so scroll-linked transforms (e.g. a pinned card
  stack) won't update in your probe. Dispatch a real `new WheelEvent('wheel',{deltaY,...})` and wait
  a couple rAFs to see the effect.
- Diagnose which layer costs frames by toggling it off and re-measuring (e.g. hide the hero, disable
  the GlassSurface backdrop filter) — but only while the panel is visible.

## Other always-on costs

- `GlassSurface` nav uses an SVG `feDisplacementMap` backdrop filter — measured ~5fps. If it ever
  matters, fall back to plain `backdrop-filter: blur()` (cheaper) or drop the displacement.
- `MagicBento`'s cursor spotlight runs a `mousemove` handler that loops all cards (getBoundingClientRect
  each). It's hover-only and disabled on mobile/`prefers-reduced-motion`, but with many cards it can
  jank on slow machines — rAF-throttle the mousemove if the user complains.
- Respect `prefers-reduced-motion`: hero skips parallax and freezes to a static frame; MagicBento
  hides the spotlight. (This is also why a user with Windows "animation effects" off sees a static
  hero — not a bug.)
