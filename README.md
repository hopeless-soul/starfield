# Starfield

An animated, scroll-reactive starfield background for the web. Multiple layers of seeded stars orbit the center of a full-viewport transparent canvas behind the page content; scrolling (mouse wheel or touch drag) smoothly accelerates their rotation and adds a vertical drift that glides back to rest when input stops.

## Key Features

- **Layered parallax starfield** — independently configured layers (star count, size/speed ranges, color, orbit shape). Far layers orbit on ovals (`yScale`), and layers can rotate or react to scroll in opposite directions via negative multipliers.
- **Scroll-reactive motion** — wheel and touch input feed a single smoothed velocity that modulates rotation speed and vertical drift per layer.
- **Deterministic rendering** — star fields are generated from seeded PRNG streams (mulberry32); every reload produces the identical sky. Position, size, and speed use independent seeds so tuning one distribution never reshuffles the others.
- **Mobile-hardened** — batched canvas paths (one fill per layer), capped device pixel ratio, large-viewport (`lvh`) sizing to survive URL-bar resizes, frame-time clamping, and slew-limited speed so dropped frames never teleport stars.
- **Composable input sources** — pages choose which inputs drive the effect (`wheelInput()`, `touchInput({ gain })`), all feeding one framework-free velocity sink.

## Technology Stack

| Technology | Version | Role |
| --- | --- | --- |
| [Vue](https://vuejs.org/) | 3.5 | UI shell (single component wires the canvas) |
| [Vite](https://vite.dev/) | 8 | Dev server and build |
| [anime.js](https://animejs.com/) | 4.5 | Render-loop timer and input smoothing (`createTimer`, `createAnimatable`) |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Styling (via Vite plugin, no config file) |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Throughout, type-checked with `vue-tsc` |
| [Vitest](https://vitest.dev/) | 4 | Unit tests (plain Node environment, no DOM) |
| oxlint + ESLint + Prettier | — | Linting and formatting |

Package manager: **pnpm**. Node `^22.18.0 || >=24.12.0`.

## Architecture

The code is deliberately split into a **framework-free core** and a **thin Vue shell** — everything with logic is testable without a browser:

```
wheel / touch events                    requestAnimationFrame (anime.js timer)
        │                                              │
scrollInputs.ts  ── deltas ──►  useScrollVelocity.ts   │
(wheelInput, touchInput)        (smoothing, decay)     │
                                        │ speed        │ dt
                                        ▼              ▼
                              StarfieldBackground.vue (canvas, DPR, resize)
                                        │
                                        ▼
                              starfield/engine.ts (update + project + draw)
                              starfield/config.ts (seeds, layers, tuning)
```

- Stars live in **polar coordinates** (angle + radius as a fraction of the canvas half-diagonal) orbiting the canvas center. Scroll speed adds angular velocity during update and a vertical drift at projection time.
- Input sources implement `ScrollInput = (target, emit) => detach`. All configured sources stay attached (no device detection); the one whose events never fire stays silent.
- The velocity sink accumulates deltas into an explicit target that anime.js eases toward, then glides back to zero after idle — so small inputs can never override a larger pending target.

## Getting Started

Prerequisites: Node 22.18+ (or 24.12+) and pnpm.

```sh
pnpm install
pnpm dev        # dev server with HMR (reachable on LAN for phone testing)
```

Other scripts:

```sh
pnpm build      # type-check + production build
pnpm preview    # serve the production build
pnpm test       # run all unit tests once
pnpm type-check # vue-tsc only
pnpm lint       # oxlint then eslint, both with --fix
pnpm format     # prettier over src/
```

## Project Structure

```
src/
  main.ts                        entry — mounts App, imports Tailwind CSS
  App.vue                        page content over the starfield
  assets/main.css                Tailwind import + body background
  components/
    StarfieldBackground.vue      canvas element, DPR/resize handling, render loop
  composables/
    scrollInputs.ts              ScrollInput contract; wheelInput/touchInput factories
    useScrollVelocity.ts         smoothed scroll-velocity sink (framework-free)
  starfield/
    config.ts                    seeds, layer configs, all tuning constants
    engine.ts                    createStars / updateStars / projectStar / drawStars
    prng.ts                      mulberry32 seeded PRNG
    types.ts                     Star, LayerConfig, SeedSet
```

Tests live in `__tests__/` directories next to the code they cover. `@` aliases to `src/`.

## Tuning

All knobs live in `src/starfield/config.ts`:

- `SEEDS` — global seeds for the position/size/speed PRNG streams.
- Per-layer (`LayerConfig`): `count`, `sizeMin/Max`, `speedMin/Max`, `yScale` (1 = circle, 1.5 = oval), `speedMult` (negative reverses rotation), `scrollMult` (scroll → rotation), `driftMult` (scroll → vertical drift), `color`.
- Global: `SCROLL_TO_ANGULAR`, `SCROLL_TO_DRIFT`, `MAX_FRAME_TIME`, `SPEED_SLEW`, `MAX_DPR`.

Input feel (gains, smoothing/decay durations) lives in `src/composables/scrollInputs.ts` and `useScrollVelocity.ts`.

## Testing

```sh
pnpm test                                            # all suites
pnpm vitest run src/starfield/__tests__/engine.spec.ts  # single file
```

Tests run in a plain Node environment — no browser or DOM emulation. This works because the core is framework-free: engine math and PRNG determinism are tested directly; input sources are tested synchronously with a fake `emit`; the velocity sink's smoothing/decay is tested against real anime.js timing (anime's engine falls back to `setImmediate` in Node). Timing constants are exported so specs derive their waits instead of hardcoding them.

## Coding Standards

- TypeScript everywhere; strict, with `vue-tsc` for `.vue` type-checking.
- Keep logic framework-free and put it in `src/starfield/` or `src/composables/`; `StarfieldBackground.vue` is the only place Vue, the DOM, and the render loop meet.
- New scroll input types implement the `ScrollInput` contract in `scrollInputs.ts` — the sink must stay ignorant of event types.
- Linting is enforced by oxlint + ESLint (`pnpm lint`), formatting by Prettier (`pnpm format`).

## Contributing

Before committing: `pnpm test`, `pnpm type-check`, and `pnpm lint` must pass. Add tests alongside changed logic in the nearest `__tests__/` directory — anything in the framework-free core is expected to be covered.
