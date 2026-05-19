# Astro Migration Design

## Goal

Migrate the existing static HTML programmable-matter site to Astro while preserving the current tools, URLs, shareable state, and GitHub Pages deployment. The migration should make future editing easier without turning the project into a large framework app.

Styling should move to Tailwind-first Astro components. Custom CSS should stay small and purposeful: theme tokens, base resets, and any canvas/tool-specific styles that are awkward or noisy as utility classes.

## Current State

The site currently has four top-level HTML pages:

- `index.html`: hub page with navigation, theme toggle, iframe loading, and DNA canvas animation.
- `active-membranes.html`: active membrane rule analyser.
- `p-systems.html`: visual P-system simulator.
- `robot-swarms.html`: robot swarm transformer with URL query sharing.

Shared browser scripts already exist:

- `theme-init.js`
- `membrane-editor.js`
- `formal-step.js`
- `active-membrane-parser.js`
- `active-membrane-analysis.js`

The Astro starter template now exists with `astro.config.mjs`, `package.json`, `src/`, and `public/`. Tailwind has been added with `npx astro add tailwind`, which installed `tailwindcss` and `@tailwindcss/vite`, created `src/styles/global.css`, and added the Vite plugin to `astro.config.mjs`.

## Recommended Architecture

Use Astro as a static-site build layer, not as a client-side application framework.

Target structure:

```txt
src/
  layouts/
    BaseLayout.astro
  components/
    HubNav.astro
    ThemeToggle.astro
    ToolCard.astro
  pages/
    index.astro
    active-membranes.astro
    p-systems.astro
    robot-swarms.astro
  scripts/
    hub.ts
    active-membranes.ts
    p-systems.ts
    robot-swarms.ts
    theme-init.ts
    membrane-editor.ts
    formal-step.ts
    active-membrane-parser.ts
    active-membrane-analysis.ts
  styles/
    global.css
```

Keep pages mostly server-rendered Astro markup. Browser interactivity should live in page-specific scripts loaded by the page, not inside large inline `<script>` blocks.

## Styling Design

Use Tailwind through the Astro/Vite build rather than the Tailwind CDN.

Tailwind setup should use Astro's integration command:

```sh
npx astro add tailwind
```

The command adds the Vite plugin. The config should then be extended with GitHub Pages deployment settings:

```js
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://theosdoor.github.io',
  base: '/programmable-matter-lab',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Import the generated stylesheet from the shared layout:

```astro
---
import '../styles/global.css';
---
```

`src/styles/global.css` should stay small:

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

html[data-theme="light"] {
  color-scheme: light;
}
```

Any larger visual system should be expressed with Tailwind utility classes in Astro components. If reusable class combinations become noisy, prefer small Astro components over a growing CSS file.

Theme colors can be handled in one of two ways:

- Preferred first pass: keep the existing CSS custom properties temporarily and map page markup to Tailwind utilities gradually.
- Final pass: move stable color decisions into Tailwind-friendly design tokens, keeping only the runtime `data-theme` switch in CSS variables where necessary.

Do not recreate the current `theme.css` as another large stylesheet.

## Routing And URLs

Astro routes should match the existing tool names without `.html`:

- `/`
- `/active-membranes/`
- `/p-systems/`
- `/robot-swarms/`

The hub should link to Astro routes rather than loading root HTML files. If the iframe hub interaction is retained, the iframe `src` values must use `import.meta.env.BASE_URL` or an equivalent base-path helper so GitHub Pages subpath deployment works.

Robot swarm query parameters must remain stable across the migration. Existing shared links should either keep working through a redirect/compatibility page or be intentionally documented as changed.

## JavaScript Migration

Migrate scripts in this order:

1. Keep existing `.js` files working as static scripts while converting markup to Astro.
2. Move shared scripts into `src/scripts/` once pages build correctly.
3. Convert to TypeScript only where it reduces risk or improves clarity; avoid a broad type-conversion project during the first migration.
4. Remove inline page scripts only after the equivalent module has been verified in the browser.

Page scripts should expose only the globals required by existing page markup during the transition. Longer term, prefer explicit event listeners over inline `onclick` handlers.

## Page Migration Plan

### Phase 1: Build Shell

- Configure Astro `site` and `base`.
- Replace the starter `src/pages/index.astro` with the current hub markup.
- Add `BaseLayout.astro` with metadata, favicon links, global stylesheet import, and early theme initialisation.
- Keep the old HTML files available until the Astro hub works.

### Phase 2: Styling Foundation

- Add Tailwind via the Vite plugin.
- Replace CDN Tailwind usage.
- Start converting hub layout styles to Tailwind utilities.
- Keep custom CSS limited to theme variables, canvas-specific styling, and small browser reset rules.

### Phase 3: Tool Pages

Convert one tool at a time:

1. `active-membranes.html` -> `src/pages/active-membranes.astro`
2. `p-systems.html` -> `src/pages/p-systems.astro`
3. `robot-swarms.html` -> `src/pages/robot-swarms.astro`

For each page:

- Move markup first.
- Load existing scripts.
- Verify controls and theme sync.
- Then extract/reduce inline JavaScript.

### Phase 4: Deployment

Update GitHub Pages workflow to build Astro:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm

- run: npm ci
- run: npm run build

- uses: actions/upload-pages-artifact@v3
  with:
    path: dist
```

The current workflow uploads the repo root; that must change because Astro outputs to `dist/`.

## Testing And Verification

Keep browser smoke tests. Update them to target Astro routes after each converted page lands.

Minimum verification for each phase:

```sh
npm run build
npm run preview
```

Manual browser checks:

- Home page renders at `/programmable-matter-lab/`.
- Theme toggle affects hub and tool page.
- Active membranes examples still analyse.
- P-system simulator loads and steps.
- Robot swarm sharing link round-trips query state.
- GitHub Pages asset paths work with the configured base path.

## Non-Goals

- No CMS.
- No React/Vue/Svelte island migration unless a tool clearly needs it later.
- No large CSS rewrite.
- No full TypeScript conversion in the first pass.
- No redesign beyond the styling cleanup needed to fit Astro/Tailwind.

## Open Decisions

- Whether to preserve iframe-based tool loading or convert the hub to direct page navigation.
- Whether old `.html` URLs should redirect to new Astro routes.
- Whether the canvas DNA animation should stay in the hub script or become a small component script.
