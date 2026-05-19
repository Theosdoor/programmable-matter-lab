# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Project Overview

Astro static site hosting three interactive browser-based simulators for bio-inspired computation models (P-systems, active membranes, robot swarms). Built output is deployed to GitHub Pages.

**Live site:** https://theosdoor.github.io/programmable-matter-lab/

## Local Development

```sh
npm run dev
npm run build
npm run preview
```

Astro is the build system. Edit `src/pages/*.astro`, `src/styles/global.css`, and browser scripts in `public/`. The old root `.html`/`.js` files are retained as migration source/reference material unless explicitly cleaned up.

## Smoke Tests

The repo has browser-based smoke tests under `public/tests/` so they are included in Astro preview/build output. Run `npm run dev` or `npm run preview`, then open each test page in a browser:

```sh
# http://localhost:4321/programmable-matter-lab/tests/formal-step-smoke.html
# http://localhost:4321/programmable-matter-lab/tests/active-membrane-page-smoke.html
```

Each smoke test writes a `... passed` message to the page or throws an error in the browser console. There is no CLI test runner unless one is added separately.

## Architecture

**Astro hub-and-spoke layout:**
- `src/pages/index.astro` — landing page with navigation; loads tools in an `<iframe id="tool-frame">`
- `src/pages/active-membranes.astro` — membrane rule analyser
- `src/pages/p-systems.astro` — visual P-system simulator with drag-and-drop editor
- `src/pages/robot-swarms.astro` — connectivity-preserving swarm shape transformer
- `src/styles/global.css` — Tailwind entrypoint and small global theme/browser defaults
- `public/theme.css` — legacy shared CSS custom property theme system used by migrated tool pages
- `public/theme-init.js` — early theme initialiser used by tool pages
- `public/membrane-editor.js` — shared DOM helpers for membrane-tree editing
- `public/formal-step.js` — shared maximal-rule-multiset enumeration logic
- `public/active-membrane-parser.js` — parser for active-membrane rule notation
- `public/active-membrane-analysis.js` — one-step active-membrane analyser

**Theme synchronisation:** `localStorage['pm-theme']` holds `"dark"` or `"light"`. Tool pages load `theme-init.js` before render and set `data-theme` on `<html>`. The hub also patches the iframe's `documentElement` directly via same-origin access when the user toggles theme.

**Styling:** Tailwind CSS v4 is wired through `@tailwindcss/vite` and imported from `src/styles/global.css`. Keep custom CSS small; prefer Astro components and Tailwind utilities for new structure. Existing migrated tool pages still rely on some page-local CSS and `public/theme.css`.

**Tool pages are still static:** Runtime code is loaded directly by Astro pages with plain `<script is:inline>` tags and static files from `public/`. Keep shared behaviour in focused browser scripts instead of burying it in page templates.

## Key Implementation Patterns

**Drag-and-drop membrane editor** (`src/pages/p-systems.astro`, `src/pages/active-membranes.astro`): Membranes are DOM elements with `data-membrane-id` attributes. Child membranes nest inside `.membrane-content` divs. Functions like `parseMembraneStructureFromVisual()` and `parseRulesFromVisualForms()` translate the visual editor state into computation inputs.

**Rule types** (P-system notation used throughout): `(a)` evolution, `(b)` send-in, `(c)` send-out, `(d)` dissolution, `(e)` elementary division, `(f)` non-elementary division.

**Formal step enumeration:** Shared branching logic lives in `public/formal-step.js` and returns maximal multisets of rule applications. Active membranes use this via the parser/analyser modules; avoid duplicating the enumeration algorithm inside page scripts.

**Simulation state** (`src/pages/p-systems.astro`): `currentStep`, `initialPsystemState`, `psystem` globals. Buttons toggle `disabled` based on load/step/reset state.

**Canvas animation** (`src/pages/index.astro`): DNA double helix drawn on `<canvas>` using `requestAnimationFrame`. Reads colours from CSS variables at runtime. Three helices at x-fractions `[0.07, 0.93, 0.5]`.

**Robot swarms shareable state** (`robot-swarms.html`): Grid state serialised into URL query params for link sharing.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`, which installs dependencies, runs `npm run build`, and uploads `dist/` to GitHub Pages.
