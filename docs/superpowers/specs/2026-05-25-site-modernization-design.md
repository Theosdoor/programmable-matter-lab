# Spec: Programmable Matter Lab Modernization & Performance Optimization
Date: 2026-05-25

## 1. Goal Description
The objective of this task is to modernize the Programmable Matter Lab static site by leveraging Tailwind v4 and Astro features, improving codebase maintainability, drying up CSS and HTML structural duplication, modularizing large client-side scripts, and optimizing performance (specifically runtime CPU/GPU rendering overhead).

We want to achieve:
1. **Single Source of Truth**: Center the metadata of the simulator tools into a single configuration file.
2. **Native Tailwind v4 Styling**: Configure a unified `@theme` inside standard global CSS to handle all light/dark styling without legacy colour-override sheets.
3. **Modular Scripts**: Extract massive inline scripts into ES modules processed and optimized by Astro's asset pipeline, while maintaining full backward-compatibility with automated browser smoke tests.
4. **Performance Boost**: Automatically pause the heavy DNA canvas animation loop when simulation iframes are active to minimize client resource usage.

---

## 2. Architecture & Components

### 2.1 Content Data Layer
We will define the central metadata structure for our simulators in a new data file:
*   [NEW] [tools.ts](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/data/tools.ts)
    *   Defines the `Tool` interface.
    *   Exports a list `tools` containing all active simulators, titles, descriptors, tab buttons, theme color combinations, and icon paths.

### 2.2 Reusable Astro Components
To eliminate code repetition in the landing page, we will implement new Astro components:
*   [NEW] [ToolCard.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/components/ToolCard.astro)
    *   Renders the dynamic landing card for a simulator tool.
    *   Implements hover transitions, linear gradients, custom icons, and unique descriptive labels.
*   [NEW] [ToolIcon.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/components/ToolIcon.astro)
    *   Renders the precise inline SVG markup corresponding to a tool's unique graphical representation.

### 2.3 Style Sheet Modernization
*   [MODIFY] [global.css](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/styles/global.css)
    *   Adds a native Tailwind v4 `@theme` configuration map:
        ```css
        @theme {
          --color-bg: var(--bg);
          --color-surface: var(--surface);
          --color-surface-2: var(--surface-2);
          --color-border: var(--border);
          --color-border-bright: var(--border-bright);
          --color-accent-a: var(--accent-a);
          --color-accent-t: var(--accent-t);
          --color-accent-g: var(--accent-g);
          --color-accent-c: var(--accent-c);
          --color-text: var(--text);
          --color-text-sub: var(--text-sub);
          --color-text-dim: var(--text-dim);
        }
        ```
    *   Incorporates theme-specific styles, canvas alignment, visual membrane skin definitions, and responsive overrides.
*   [DELETE] [theme.css](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/public/theme.css)
    *   Remove legacy custom theme overrides, replacing all style properties with native Tailwind utility classes.

### 2.4 Modularity of Scripts
We will extract all heavy inline client scripts into dedicated modular JS files:
*   [NEW] [index-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/index-client.js)
    *   Handles landing page theme synchronization, tab switches, and DNA canvas animation.
    *   **Performance Optimization**: Exposes a hook to pause the DNA canvas animation `requestAnimationFrame` loop when a simulator iframe is active, and resumes it upon return to the home screen.
*   [NEW] [active-membranes-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/active-membranes-client.js)
    *   Simulator client logic for the Membrane Notation Workbench.
    *   Binds interactive handlers to the window context for test/comp compatability.
*   [NEW] [p-systems-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/p-systems-client.js)
    *   Step-by-step P-System simulation event handlers and visual parsing logic.
*   [NEW] [robot-swarms-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/robot-swarms-client.js)
    *   Coordinate translation, grid connectivity calculations, and interactive swarming rules.

---

## 3. Verification & Testing Plan

### 3.1 Automated Smoke Tests
We must run all automated browser smoke tests to verify backward compatibility:
*   `/tests/formal-step-smoke.html`
*   `/tests/active-membrane-page-smoke.html`
*   `/tests/hub-routing-smoke.html`
*   All other tests located under `public/tests/`.

### 3.2 Test-Driven Development (TDD)
Before modifying or creating parsing/coordinate helpers (such as URL state encoder or coordinate display maps), we will write dedicated unit tests under a new test suite, run and watch them fail (RED phase), implement the minimal code to pass (GREEN phase), and refactor.
