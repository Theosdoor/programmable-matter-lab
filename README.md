# Programmable Matter Lab

A collection of interactive browser tools for simulating bio-inspired computation models. Built with Astro as a static site, with Tailwind CSS, a shared hub, DNA-aesthetic UI, and dark/light mode.

**Live site:** https://theosdoor.github.io/programmable-matter-lab/

---

## Tools

### Active Membranes Analyser
Define a P-system with active membranes, add rules of types (a)–(f), and find all **maximally parallel sets** of applicable rules — the core computational step in membrane computing.

Supported rule types:
- (a) Evolution
- (b) Send-in
- (c) Send-out
- (d) Dissolution
- (e) Elementary division
- (f) Non-elementary division

### P-System Visual Simulator
A drag-and-drop editor for building nested membrane structures, with step-by-step simulation. Define objects and rewriting rules per membrane, load the system, and step through configurations one at a time or run 10 steps at once.

### Robot Swarm Transformer
Simulate **connectivity-preserving shape transformations** in robot swarms on a square grid. Place an initial configuration, define a target shape, then perform pivot rotations. Tracks rotation history with mini-grid previews, supports undo, and generates shareable state links.

## Formal Coverage Notes

- Active Membranes Analyser: exact one-step maximally parallel analysis for supported rule types (a)-(d) and non-elementary division (f). Elementary division (e) is blocked until its full structural semantics are implemented.
- P-System Visual Simulator: exact one-step branching for the page's rewriting-rule syntax. Users choose a successor branch to continue a trace.
- Robot Swarm Transformer: validates interactive pivot rotations and connected initial shapes, but does not compute an automatic transformation sequence.

---

## Development

Astro builds the static site to `dist/`:

```sh
npm install
npm run dev
npm run build
npm run preview
```

### File structure

```
src/pages/index.astro              Hub / landing page
src/pages/active-membranes.astro   Active Membranes Analyser
src/pages/p-systems.astro          P-System Visual Simulator
src/pages/robot-swarms.astro       Robot Swarm Transformer
src/styles/global.css              Tailwind entrypoint and small global styles
public/theme.css                   Shared legacy theme variables for migrated tools
public/theme-init.js               Early tool-page theme initialiser
public/formal-step.js              Shared maximal-rule-multiset enumeration
public/membrane-editor.js          Shared membrane editor DOM helpers
public/active-membrane-parser.js
public/active-membrane-analysis.js
public/tests/                      Browser-based smoke tests
.github/workflows/
  deploy.yml            GitHub Pages deployment
```

### Smoke tests

Run the dev server or preview server and open the smoke-test pages in `public/tests/`:

```sh
npm run dev
# http://localhost:4321/programmable-matter-lab/tests/formal-step-smoke.html
# http://localhost:4321/programmable-matter-lab/tests/active-membrane-analysis-smoke.html
```

Tests report a `... passed` message on the page or throw in the browser console. There is currently no package-managed CLI test runner.

### Theming

The hub reads and writes a `pm-theme` key in `localStorage` (`"dark"` or `"light"`). Each tool page picks this up on load via `theme-init.js` in `<head>`. Toggling in the hub also updates the active iframe in real time via direct DOM access (same-origin).

---

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the included workflow. The workflow runs `npm ci`, `npm run build`, and uploads `dist/`.

---

## Background

These tools implement models from the field of **membrane computing** (P-systems), introduced by Gheorghe Păun in 1998, and **programmable matter** — the study of physical or computational systems that can change their structure or behaviour in response to input. The robot swarm tool is based on connectivity-preserving pivot rotation algorithms studied in distributed robotics.
