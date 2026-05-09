# Formal Revision Release Design

## Goal

Prepare the site for lecturer/student use by prioritising formal correctness, predictable behaviour, and clear model boundaries over framework migration or broad feature work.

## Scope

The current static HTML/CSS/JS architecture stays in place for this release. Astro or React migration is deferred until after sharing, because the immediate risk is semantic correctness rather than packaging.

This release makes the tools narrower where needed, but removes silent approximations.

## Active Membranes Analyser

The analyser should compute one formal maximally parallel step for active membranes.

It will:
- Parse the visual membrane structure and typed rule forms into a configuration.
- Enumerate compatible rule-application multisets, including repeated applications when enough objects are available.
- Respect object consumption, charge preconditions, and membrane-use constraints for active-membrane rule families.
- Display maximal multisets with rule identifiers and application counts.

If a rule type cannot be implemented precisely within this release, it must be marked unsupported before analysis. Unsupported behaviour must not be approximated silently.

## P-System Visual Simulator

The simulator becomes a branching trace explorer rather than a deterministic greedy animation.

It will:
- Parse the current visual P-system into a configuration.
- On each step, enumerate all maximally parallel applicable rule multisets for the current configuration.
- Derive successor configurations for each branch.
- Show the available branches to the user and allow choosing one branch to continue.
- Keep reset/load behaviour simple and explicit.

The UI should make nondeterminism visible. It must not imply that one arbitrary rule order is the formal evolution.

## Robot Swarms

The swarm tool remains an interactive practice tool.

It will:
- Keep valid pivot-rotation interaction.
- Fix small state bugs that affect sharing/resetting.
- Document invariants and limits: connected initial shape, local pivot rotations, no automatic solver.

## Cross-Cutting Hardening

All tools should avoid rendering user-entered labels, objects, or rules through unsafe `innerHTML` paths. Use text nodes or explicit DOM construction for user-controlled values.

The hub should pause background DNA animation while an iframe tool is open, and resume on the landing page.

Each tool should include a concise "Model assumptions" section explaining what is exact and what is out of scope.

## Verification

Because the repo has no build system, verification will use:
- Manual browser smoke tests for each page.
- Small scripted regression checks for multiset/rule enumeration where practical.
- A local static server check to ensure all pages load without console-breaking errors.

## Non-Goals

- No Astro/React migration before this release.
- No broad redesign.
- No automatic swarm solver.
- No full formal coverage for unsupported membrane rule cases unless implemented exactly.
