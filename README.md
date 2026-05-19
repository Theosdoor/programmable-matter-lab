# Programmable Matter Lab

A collection of interactive browser tools for simulating bio-inspired computation models. Built as standalone HTML pages with a shared hub, DNA-aesthetic UI, and dark/light mode.

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

No build step - all three tools are static HTML/CSS/JS files. Open `index.html` in a browser or serve the directory with any static server:

```sh
# Python
python3 -m http.server 8000

# Node (if npx is available)
npx serve .
```

### File structure

```
index.html              Hub / landing page
theme.css               Shared dark/light theme (loaded by all tool pages)
theme-init.js           Early tool-page theme initialiser
formal-step.js          Shared maximal-rule-multiset enumeration
membrane-editor.js      Shared membrane editor DOM helpers
active-membrane-parser.js
active-membrane-analysis.js
active-membranes.html   Active Membranes Analyser
p-systems.html          P-System Visual Simulator
robot-swarms.html       Robot Swarm Transformer
tests/                  Browser-based smoke tests
.github/workflows/
  deploy.yml            GitHub Pages deployment
```

### Smoke tests

Serve the repo root and open the smoke-test pages in `tests/`:

```sh
python3 -m http.server 8000
# http://localhost:8000/tests/formal-step-smoke.html
# http://localhost:8000/tests/active-membrane-analysis-smoke.html
```

Tests report a `... passed` message on the page or throw in the browser console. There is currently no package-managed CLI test runner.

### Theming

The hub reads and writes a `pm-theme` key in `localStorage` (`"dark"` or `"light"`). Each tool page picks this up on load via `theme-init.js` in `<head>`. Toggling in the hub also updates the active iframe in real time via direct DOM access (same-origin).

---

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the included workflow. No build or install step is required.

---

## Background

These tools implement models from the field of **membrane computing** (P-systems), introduced by Gheorghe Păun in 1998, and **programmable matter** — the study of physical or computational systems that can change their structure or behaviour in response to input. The robot swarm tool is based on connectivity-preserving pivot rotation algorithms studied in distributed robotics.
