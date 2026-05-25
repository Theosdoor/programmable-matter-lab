# Site Modernization & Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the Programmable Matter Lab static site by leveraging Tailwind v4, Astro layout components, modularizing client scripts, DRYing code through a centralized tool configuration layer, and optimizing animation performance.

**Architecture:** 
1. Centralize simulator properties in a single `tools.js` configuration file.
2. Build reusable, dynamic `ToolCard.astro` and `ToolIcon.astro` components using modern Tailwind v4 syntax.
3. Migrate color theme tokens natively into `src/styles/global.css` using Tailwind v4 `@theme`, removing the legacy `public/theme.css` override sheet.
4. Extract large inline client logic from Astro pages into standalone, cached ES modules in `src/scripts/` while maintaining full browser-based smoke test API compatibility.
5. Pause canvas DNA helix calculations when a simulation iframe is running.

**Tech Stack:** Astro v6, Tailwind CSS v4, Node.js Test Runner (TDD)

---

### Task 1: New Branch Setup & Clean Check

**Files:**
- Create: N/A
- Modify: N/A

- [ ] **Step 1: Check baseline git branch status**
  Run: `rtk git status`
  Expected: Clean checkout on a working branch

- [ ] **Step 2: Create and checkout a new development branch**
  Run: `rtk git checkout -b feature/site-modernization`
  Expected: Switched to a new branch `feature/site-modernization`

- [ ] **Step 3: Commit empty state to verify git**
  Run: `rtk git commit --allow-empty -m "chore: start site modernization branch"`
  Expected: Empty commit created on the feature branch

---

### Task 2: Shared Multi-Set Parser TDD Refactoring

**Files:**
- Create: [multiset-parser.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/utils/multiset-parser.js)
- Create: [multiset-parser.test.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/tests/multiset-parser.test.js)

- [ ] **Step 1: Write failing test for multiset parsing**
  Create `tests/multiset-parser.test.js` with the following failing test:
  ```javascript
  import assert from 'node:assert';
  import { test } from 'node:test';
  import { parseMultiset } from '../src/utils/multiset-parser.js';

  test('parses comma-separated strings with quantities into counts map', () => {
    const result = parseMultiset('a:2,b:1,c');
    assert.strictEqual(result.get('a'), 2);
    assert.strictEqual(result.get('b'), 1);
    assert.strictEqual(result.get('c'), 1);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test tests/multiset-parser.test.js`
  Expected: FAIL with "Cannot find module" or "parseMultiset is not a function"

- [ ] **Step 3: Write minimal implementation**
  Create `src/utils/multiset-parser.js`:
  ```javascript
  export function parseMultiset(str) {
    const multiset = new Map();
    if (!str || str.trim() === '') return multiset;
    str.split(',').forEach(part => {
      part = part.trim();
      if (!part) return;
      const [objRaw, countStr] = part.split(':');
      const obj = objRaw.trim();
      const count = countStr ? parseInt(countStr.trim(), 10) : 1;
      if (obj && !isNaN(count) && count > 0) {
        multiset.set(obj, (multiset.get(obj) || 0) + count);
      }
    });
    return multiset;
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test tests/multiset-parser.test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run: `rtk git add src/utils/multiset-parser.js tests/multiset-parser.test.js`
  Run: `rtk git commit -m "feat: add shared multiset parser helper with TDD unit tests"`

---

### Task 3: Content Data Layer

**Files:**
- Create: [tools.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/data/tools.js)
- Create: [tools.test.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/tests/tools.test.js)

- [ ] **Step 1: Write failing test verifying tools metadata schema**
  Create `tests/tools.test.js`:
  ```javascript
  import assert from 'node:assert';
  import { test } from 'node:test';
  import { tools } from '../src/data/tools.js';

  test('verifies tools metadata contains expected properties', () => {
    assert.strictEqual(tools.length, 3);
    assert.strictEqual(tools[0].id, 'membranes');
    assert.ok(tools[0].title);
    assert.ok(tools[0].description);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test tests/tools.test.js`
  Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**
  Create `src/data/tools.js`:
  ```javascript
  export const tools = [
    {
      id: 'membranes',
      path: 'active-membranes/',
      tag: 'A — 01',
      title: 'Active Membranes',
      description: 'Analyse P-systems with active membranes. Find all maximally parallel sets of applicable rewriting rules.',
      cta: 'Open analyser',
      gradient: 'from-accent-a to-accent-g',
      iconName: 'membranes'
    },
    {
      id: 'psystems',
      path: 'p-systems/',
      tag: 'G — 02',
      title: 'P-System Simulator',
      description: 'Step-by-step visual simulation of membrane computing. Define, load, and evolve P-systems with nested membranes.',
      cta: 'Open simulator',
      gradient: 'from-accent-g to-accent-c',
      iconName: 'psystems'
    },
    {
      id: 'swarms',
      path: 'robot-swarms/',
      tag: 'T — 03',
      title: 'Robot Swarms',
      description: 'Simulate connectivity-preserving transformations in robot swarms via pivot rotations on a square grid.',
      cta: 'Open simulator',
      gradient: 'from-accent-c to-accent-t',
      iconName: 'swarms'
    }
  ];
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test tests/tools.test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run: `rtk git add src/data/tools.js tests/tools.test.js`
  Run: `rtk git commit -m "feat: add central tools metadata configuration with TDD tests"`

---

### Task 4: Reusable Astro Components

**Files:**
- Create: [ToolIcon.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/components/ToolIcon.astro)
- Create: [ToolCard.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/components/ToolCard.astro)

- [ ] **Step 1: Implement `src/components/ToolIcon.astro`**
  Write this file with conditional SVG elements for each `iconName` to cleanly isolate custom vector shapes from index pages.

- [ ] **Step 2: Implement `src/components/ToolCard.astro`**
  Write this file importing `ToolIcon.astro` and utilizing the standard Tailwind v4 gradient maps:
  ```astro
  ---
  import ToolIcon from './ToolIcon.astro';
  const { tool } = Astro.props;
  ---
  <div class="card bg-surface border border-border hover:border-border-bright transition p-6 rounded" data-tool={tool.id} tabindex="0" role="button" onclick={`openTool('${tool.path}','${tool.id}')`}>
    <div class="card-tag text-text-dim text-xs mb-3">{tool.tag}</div>
    <ToolIcon iconName={tool.iconName} />
    <h2 class="card-title text-xl font-bold text-text mt-3">{tool.title}</h2>
    <p class="card-desc text-text-sub text-sm mt-2">{tool.description}</p>
    <div class="card-cta text-text-dim text-xs mt-4 flex items-center gap-1 hover:text-accent-a">
      {tool.cta} <span aria-hidden="true">&rarr;</span>
    </div>
  </div>
  ```

- [ ] **Step 3: Commit**
  Run: `rtk git add src/components/ToolIcon.astro src/components/ToolCard.astro`
  Run: `rtk git commit -m "feat: implement reusable ToolCard and ToolIcon Astro components"`

---

### Task 5: Modularize Main Page and Pausable Canvas Loop

**Files:**
- Modify: [index.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/pages/index.astro)
- Create: [index-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/index-client.js)

- [ ] **Step 1: Extract all inline javascript from `index.astro` to `src/scripts/index-client.js`**
  Extract DNA Canvas calculations, navigation tabs, active iframe switches, and theme toggling.
  **Performance Optimization**: Modify the canvas animation runner so that when an iframe tool is open (`animationEnabled = false`), the `requestAnimationFrame` loop does not compute points, and when return-to-landing is clicked (`showLanding()`), it resumes correctly.

- [ ] **Step 2: Clean up `index.astro` UI and script bindings**
  Import the central `tools` list in `index.astro` frontmatter. Map `tools` dynamically to render navigation buttons and `ToolCard` components.
  Link the extracted script via standard `<script src="../scripts/index-client.js"></script>` to let Astro handle bundling and caching.

- [ ] **Step 3: Commit**
  Run: `rtk git add src/pages/index.astro src/scripts/index-client.js`
  Run: `rtk git commit -m "feat: modularize landing page client scripts and dynamically loop over tools"`

---

### Task 6: Refactor Active Membranes Simulator Page

**Files:**
- Modify: [active-membranes.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/pages/active-membranes.astro)
- Create: [active-membranes-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/active-membranes-client.js)

- [ ] **Step 1: Extract inline JS from `active-membranes.astro` into `src/scripts/active-membranes-client.js`**
  Move all editor state handling, membrane visualization drawers, and rules parsing text listeners. Expose all crucial methods like `parseMembraneStructureFromVisual` on the window object:
  ```javascript
  window.parseMembraneStructureFromVisual = parseMembraneStructureFromVisual;
  ```

- [ ] **Step 2: Clean up `active-membranes.astro` template**
  Import the shared parser helpers, replace direct script links with a single Astro `<script src="../scripts/active-membranes-client.js"></script>` tag, and map styling using clean Tailwind classes.

- [ ] **Step 3: Commit**
  Run: `rtk git add src/pages/active-membranes.astro src/scripts/active-membranes-client.js`
  Run: `rtk git commit -m "feat: modularize Active Membranes client logic and integrate Astro modules"`

---

### Task 7: Refactor P-Systems Simulator Page

**Files:**
- Modify: [p-systems.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/pages/p-systems.astro)
- Create: [p-systems-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/p-systems-client.js)

- [ ] **Step 1: Extract interactive client JS from `p-systems.astro` to `src/scripts/p-systems-client.js`**
  Extract step-by-step multiset subtraction, branch choices renderings, and environment displays. Expose necessary simulation hooks on `window` for validation framework compat.

- [ ] **Step 2: Bind global components in `p-systems.astro`**
  Reference the script via `<script src="../scripts/p-systems-client.js"></script>` and clean up layout elements.

- [ ] **Step 3: Commit**
  Run: `rtk git add src/pages/p-systems.astro src/scripts/p-systems-client.js`
  Run: `rtk git commit -m "feat: modularize P-Systems visual simulator client scripts"`

---

### Task 8: Refactor Robot Swarms Simulator Page

**Files:**
- Modify: [robot-swarms.astro](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/pages/robot-swarms.astro)
- Create: [robot-swarms-client.js](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/scripts/robot-swarms-client.js)

- [ ] **Step 1: Extract full board calculations from `robot-swarms.astro` to `src/scripts/robot-swarms-client.js`**
  Move coordinate display calculations, pivot rotation validators, share links generation, and history drawers.

- [ ] **Step 2: Connect Astro scripts**
  Load using Astro's module compiler.

- [ ] **Step 3: Commit**
  Run: `rtk git add src/pages/robot-swarms.astro src/scripts/robot-swarms-client.js`
  Run: `rtk git commit -m "feat: modularize Robot Swarms visual tracker client scripts"`

---

### Task 9: Styling Layer Modernization (Tailwind v4 Theme)

**Files:**
- Modify: [global.css](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/src/styles/global.css)
- Delete: [theme.css](file:///Users/Subspace_Explorer/Projects/programmable-matter-lab/public/theme.css)

- [ ] **Step 1: Bind CSS custom design properties in `src/styles/global.css`**
  Configure a native Tailwind v4 `@theme` directive, overriding color properties and linking variables directly to the root CSS styles.

- [ ] **Step 2: Delete public legacy CSS**
  Remove `public/theme.css` since it is completely replaced by clean Tailwind mapping variables inside `global.css`.

- [ ] **Step 3: Commit**
  Run: `rtk git rm public/theme.css`
  Run: `rtk git add src/styles/global.css`
  Run: `rtk git commit -m "style: migrate theme color variables to Tailwind v4 @theme and remove public theme stylesheet"`

---

### Task 10: Final Verification and Smoke Testing

**Files:**
- Modify: N/A

- [ ] **Step 1: Build the site statically to ensure zero Astro compile errors**
  Run: `npm run build`
  Expected: Successful production compilation in `dist/` with optimized scripts and bundles.

- [ ] **Step 2: Run local preview server**
  Run: `npm run preview` in background

- [ ] **Step 3: Run all automated browser smoke tests and check outcomes**
  Ensure `/tests/formal-step-smoke.html`, `/tests/active-membrane-page-smoke.html`, `/tests/hub-routing-smoke.html` all pass inside browser console logs.
