# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm.

- `pnpm dev` — start Vite dev server with HMR
- `pnpm build` — type-check (vue-tsc) and build in parallel
- `pnpm type-check` — vue-tsc only
- `pnpm test` — run all tests (Vitest, single run)
- `pnpm vitest run src/starfield/__tests__/engine.spec.ts` — run a single test file
- `pnpm lint` — runs oxlint then eslint, both with `--fix`
- `pnpm format` — Prettier over `src/`

## Architecture

A Vue 3 + Vite app rendering an animated starfield canvas behind page content, driven by anime.js v4 (`createTimer`, `createAnimatable`) and styled with Tailwind CSS v4 (via the Vite plugin; no tailwind.config file).

The code is deliberately split into a framework-free core and a thin Vue shell:

- `src/starfield/` — pure, unit-tested logic with no Vue or DOM-lifecycle dependencies:
  - `prng.ts` — mulberry32 seeded PRNG; star fields are fully deterministic.
  - `config.ts` — all tunable constants: the global `SEEDS`, scroll-to-motion conversion factors, and the two `LayerConfig`s (`FAR_LAYER`, `CLOSE_LAYER`). Position, size, and speed use independent seed streams so tweaking one distribution never reshuffles the others. Draw order in `LAYERS` is far-first.
  - `engine.ts` — `createStars` / `updateStars` / `projectStar` / `drawStars`. Stars live in polar coordinates (angle + radius as a fraction of the canvas half-diagonal) orbiting the canvas center; scroll speed adds both angular speed and vertical drift at projection time.
- `src/composables/useScrollVelocity.ts` — accumulates wheel deltas into a smoothed scroll speed using anime.js `createAnimatable`, decaying back to zero after idle. Despite the `use` name it is framework-free and caller-managed: call `destroy()` on unmount. This is what makes it testable.
- `src/components/StarfieldBackground.vue` — the only place Vue, the canvas element, DPR-aware resizing, and the anime.js render-loop timer meet. It wires the pieces above together in `onMounted`/`onUnmounted`.

Tests live in `__tests__/` directories next to the code they cover and target the framework-free modules only.

`@` aliases to `src/` (vite.config.ts + tsconfig).

Note: the top-level `starfield/` directory is an empty untracked leftover clone — ignore it; the real source is in `src/`.
