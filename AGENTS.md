# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static site hosting three interactive browser-based simulators for bio-inspired computation models (P-systems, active membranes, robot swarms). No build step — deployed directly to GitHub Pages.

**Live site:** https://theosdoor.github.io/programmable-matter-lab/

## Local Development

```sh
python3 -m http.server 8000
# or
npx serve .
```

There is no build system, no package manager, and no test infrastructure. Edit HTML/CSS files directly and refresh the browser.

## Architecture

**Hub-and-spoke layout:**
- `index.html` — landing page with navigation; loads tools in an `<iframe id="tool-frame">`
- `active-membranes.html` — membrane rule analyser
- `p-systems.html` — visual P-system simulator with drag-and-drop editor
- `robot-swarms.html` — connectivity-preserving swarm shape transformer
- `theme.css` — shared CSS custom property theme system (included by all pages)

**Theme synchronisation:** `localStorage['pm-theme']` holds `"dark"` or `"light"`. Each page reads this in an inline `<script>` before render and sets `data-theme` on `<html>`. The hub also patches the iframe's `documentElement` directly via same-origin access when the user toggles theme.

**Styling:** Tailwind CSS (CDN) for layout utilities + `theme.css` custom properties for colours. CSS variables follow the pattern `--bg`, `--text`, `--accent-a`, `--accent-b`, etc., with `:root[data-theme="dark"]` overrides.

**Tool pages are self-contained:** Each HTML file embeds all JavaScript inline. There are no external `.js` or `.css` files beyond `theme.css` and the Tailwind CDN.

## Key Implementation Patterns

**Drag-and-drop membrane editor** (`p-systems.html`, `active-membranes.html`): Membranes are DOM elements with `data-membrane-id` attributes. Child membranes nest inside `.membrane-content` divs. Functions like `parseMembraneStructureFromVisual()` and `parseRulesFromVisualForms()` translate the visual editor state into computation inputs.

**Rule types** (P-system notation used throughout): `(a)` evolution, `(b)` send-in, `(c)` send-out, `(d)` dissolution, `(e)` elementary division, `(f)` non-elementary division.

**Simulation state** (`p-systems.html`): `currentStep`, `initialPsystemState`, `psystem` globals. Buttons toggle `disabled` based on load/step/reset state.

**Canvas animation** (`index.html`): DNA double helix drawn on `<canvas>` using `requestAnimationFrame`. Reads colours from CSS variables at runtime. Three helices at x-fractions `[0.07, 0.93, 0.5]`.

**Robot swarms shareable state** (`robot-swarms.html`): Grid state serialised into URL query params for link sharing.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`, which uploads the repo root to GitHub Pages. No build step in the workflow — files are served as-is.
