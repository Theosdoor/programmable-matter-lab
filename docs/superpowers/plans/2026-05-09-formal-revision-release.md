# Formal Revision Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the revision site formally accurate for one-step membrane/P-system exploration, with explicit limits and pre-share hardening.

**Architecture:** Keep the static site. Add one small shared pure-JS formal engine for multiset enumeration and successor construction, then wire it into the active membrane analyser and P-system simulator. Keep UI changes local to existing HTML files.

**Tech Stack:** Plain HTML, CSS, JavaScript, browser DOM APIs, Python static server for user-run manual smoke testing.

---

## File Structure

- Create `formal-step.js`: pure helper functions for multiset cloning, rule multiplicity enumeration, maximal multiset filtering, and deterministic successor application for the supported formal subsets.
- Modify `active-membranes.html`: load `formal-step.js`, convert parsed rule forms into formal active-membrane rules for types a-d, block e/f with a visible unsupported message, and display maximal rule multisets with counts.
- Modify `p-systems.html`: load `formal-step.js`, replace greedy stepping with branch enumeration, render branch choices, and apply the selected successor.
- Modify `robot-swarms.html`: fix shared-link history default and remove double initialisation on generate/restart.
- Modify `index.html`: pause DNA animation while a tool is open.
- Modify `README.md`: document exact/unsupported model coverage.

## Task 1: Shared Formal Step Engine

**Files:**
- Create: `formal-step.js`
- Create: `tests/formal-step-smoke.html`

- [ ] **Step 1: Write browser smoke tests**

Create `tests/formal-step-smoke.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>formal-step smoke tests</title>
<script src="../formal-step.js"></script>
<script>
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function map(entries) {
    return new Map(entries);
  }

  const rules = [
    { id: 'r1', label: 'a -> b', membraneId: '1', lhs: map([['a', 1]]), kind: 'rewrite' },
    { id: 'r2', label: 'a -> c', membraneId: '1', lhs: map([['a', 1]]), kind: 'rewrite' }
  ];
  const resources = new Map([['1', map([['a', 2]])]]);
  const maximal = window.FormalStep.enumerateMaximalRuleMultisets(rules, resources, () => true);
  assert(maximal.length === 3, 'two competing single-object rules over a:2 should produce three maximal count vectors');
  assert(maximal.some(set => set.counts.get('r1') === 2), 'r1 twice branch missing');
  assert(maximal.some(set => set.counts.get('r2') === 2), 'r2 twice branch missing');
  assert(maximal.some(set => set.counts.get('r1') === 1 && set.counts.get('r2') === 1), 'mixed branch missing');

  const exclusive = window.FormalStep.enumerateMaximalRuleMultisets(rules, resources, rule => rule.membraneId);
  assert(exclusive.length === 2, 'exclusive membrane use should leave one branch per rule');

  document.body.textContent = 'formal-step smoke tests passed';
</script>
```

- [ ] **Step 2: Note expected pre-implementation browser result**

Expected if the user opens `tests/formal-step-smoke.html` before implementation: the browser console reports `FormalStep` is undefined or the page throws before displaying the pass message.

- [ ] **Step 3: Implement `formal-step.js`**

Create `formal-step.js`:

```js
(function () {
  function cloneMultiset(multiset) {
    return new Map(multiset || []);
  }

  function cloneResourceMap(resources) {
    const out = new Map();
    resources.forEach((value, key) => out.set(key, cloneMultiset(value)));
    return out;
  }

  function canConsume(resourceMap, resourceKey, lhs) {
    const available = resourceMap.get(resourceKey);
    if (!available) return false;
    for (const [obj, count] of lhs) {
      if ((available.get(obj) || 0) < count) return false;
    }
    return true;
  }

  function consume(resourceMap, resourceKey, lhs) {
    const available = resourceMap.get(resourceKey);
    for (const [obj, count] of lhs) {
      const next = (available.get(obj) || 0) - count;
      if (next > 0) available.set(obj, next);
      else available.delete(obj);
    }
  }

  function addToMultiset(multiset, obj, count) {
    if (!obj || count <= 0) return;
    multiset.set(obj, (multiset.get(obj) || 0) + count);
  }

  function makeSignature(counts) {
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => `${id}:${count}`)
      .join('|');
  }

  function isStrictSubset(candidate, other) {
    let strictlyLess = false;
    for (const [ruleId, count] of candidate.counts) {
      const otherCount = other.counts.get(ruleId) || 0;
      if (count > otherCount) return false;
      if (count < otherCount) strictlyLess = true;
    }
    for (const [ruleId, count] of other.counts) {
      if (!candidate.counts.has(ruleId) && count > 0) strictlyLess = true;
    }
    return strictlyLess;
  }

  function enumerateMaximalRuleMultisets(rules, resources, exclusiveKeyForRule) {
    const results = [];
    const seen = new Set();

    function recurse(index, remainingResources, counts, usedExclusiveKeys) {
      let extended = false;
      for (let i = index; i < rules.length; i += 1) {
        const rule = rules[i];
        const exclusiveKey = exclusiveKeyForRule(rule);
        if (exclusiveKey && usedExclusiveKeys.has(exclusiveKey)) continue;
        if (!canConsume(remainingResources, rule.resourceKey || rule.membraneId, rule.lhs)) continue;

        const nextResources = cloneResourceMap(remainingResources);
        consume(nextResources, rule.resourceKey || rule.membraneId, rule.lhs);
        const nextCounts = new Map(counts);
        nextCounts.set(rule.id, (nextCounts.get(rule.id) || 0) + 1);
        const nextUsed = new Set(usedExclusiveKeys);
        if (exclusiveKey) nextUsed.add(exclusiveKey);
        extended = true;
        recurse(i, nextResources, nextCounts, nextUsed);
      }

      if (!extended && counts.size > 0) {
        const signature = makeSignature(counts);
        if (!seen.has(signature)) {
          seen.add(signature);
          results.push({ counts: new Map(counts), signature });
        }
      }
    }

    recurse(0, cloneResourceMap(resources), new Map(), new Set());

    return results.filter(candidate =>
      !results.some(other => other !== candidate && isStrictSubset(candidate, other))
    );
  }

  window.FormalStep = {
    cloneMultiset,
    cloneResourceMap,
    addToMultiset,
    enumerateMaximalRuleMultisets
  };
})();
```

- [ ] **Step 4: Commit and add user-run smoke check**

User-run browser check: open `tests/formal-step-smoke.html`.

Expected user-visible result: page displays `formal-step smoke tests passed`.

Commit:

```sh
git add formal-step.js tests/formal-step-smoke.html
git commit -m "Add formal rule multiset engine"
```

## Task 2: Active Membranes Formal One-Step Analyser

**Files:**
- Modify: `active-membranes.html`

- [ ] **Step 1: Load the shared engine**

Add before the inline script:

```html
<script src="membrane-editor.js"></script>
<script src="formal-step.js"></script>
```

- [ ] **Step 2: Add unsupported rule detection**

Add near parsing helpers:

```js
function getUnsupportedFormalRules(rules) {
    return rules.filter(rule => rule.type === 'e' || rule.type === 'f');
}
```

Expected behaviour: if elementary or non-elementary division rules are present, analysis stops with a message explaining that these rule types are not included in the exact release subset.

- [ ] **Step 3: Convert supported rules into formal resource rules**

Add:

```js
function toFormalActiveRule(rule, membranes) {
    const mainId = rule.conditions.membraneLabel;
    if (!mainId || !membranes.has(mainId)) return null;
    const mainMembrane = membranes.get(mainId);
    if (mainMembrane.charge !== rule.conditions.charge) return null;

    if (rule.type === 'b') {
        if (!mainMembrane.parentId) return null;
        return {
            id: rule.id,
            formId: rule.formId,
            displayLabel: `${rule.formId} (type b)`,
            type: rule.type,
            membraneId: mainId,
            resourceKey: mainMembrane.parentId,
            lhs: rule.consumingObjects,
            raw: rule.raw,
            exclusiveKey: `membrane:${mainId}`
        };
    }

    return {
        id: rule.id,
        formId: rule.formId,
        displayLabel: `${rule.formId} (type ${rule.type})`,
        type: rule.type,
        membraneId: mainId,
        resourceKey: mainId,
        lhs: rule.consumingObjects,
        raw: rule.raw,
        exclusiveKey: ['c', 'd'].includes(rule.type) ? `membrane:${mainId}` : ''
    };
}
```

- [ ] **Step 4: Replace set enumeration with formal multiset enumeration**

In the analyse click handler, after parsing rules:

```js
const unsupportedRules = getUnsupportedFormalRules(rulesArray);
if (unsupportedRules.length > 0) {
    displayError(`Exact one-step analysis currently supports rule types (a)-(d). Remove division rule forms: ${unsupportedRules.map(r => r.formId).join(', ')}.`);
    resultsDisplayEl.textContent = 'Analysis stopped because unsupported formal rule types are present.';
    return;
}

const resourceMap = new Map();
membranes.forEach(mem => resourceMap.set(mem.id, new Map(mem.objects)));
const formalRules = rulesArray
    .map(rule => toFormalActiveRule(rule, membranes))
    .filter(Boolean);
const maximalSets = window.FormalStep.enumerateMaximalRuleMultisets(
    formalRules,
    resourceMap,
    rule => rule.exclusiveKey
);
```

- [ ] **Step 5: Render counted multisets safely**

Replace result rendering with DOM creation:

```js
resultsDisplayEl.replaceChildren();
maximalSets.forEach((set, index) => {
    const setDiv = document.createElement('div');
    setDiv.classList.add('result-item');
    const heading = document.createElement('h3');
    heading.className = 'font-semibold text-gray-700';
    heading.textContent = `Set ${index + 1}`;
    setDiv.appendChild(heading);
    const line = document.createElement('div');
    line.className = 'mt-1';
    set.counts.forEach((count, ruleId) => {
        const rule = formalRules.find(candidate => candidate.id === ruleId);
        const tag = document.createElement('span');
        tag.className = 'rule-tag';
        tag.title = rule.raw;
        tag.textContent = `${rule.formId || rule.id} x ${count} (Type ${rule.type})`;
        line.appendChild(tag);
    });
    setDiv.appendChild(line);
    resultsDisplayEl.appendChild(setDiv);
});
```

- [ ] **Step 6: Add model assumptions panel**

Add below the log:

```html
<div class="mt-6 p-4 bg-gray-50 rounded-md border text-sm text-gray-600">
  <h3 class="text-lg font-semibold text-gray-600 mb-2">Model assumptions</h3>
  <p>This analyser performs exact one-step maximally parallel analysis for active-membrane rule types (a)-(d). Division rules (e)-(f) are blocked until their full structural semantics are implemented.</p>
</div>
```

- [ ] **Step 7: Smoke test and commit**

User-run browser checks:
- Default example should stop with a visible unsupported division message.
- A membrane with `a:2` and one evolution rule consuming `a` should show that rule with count `2`.
- A membrane with `a:2` and two competing evolution rules consuming `a` should show three maximal branches: `r1 x 2`, `r1 x 1 + r2 x 1`, `r2 x 2`.

Commit:

```sh
git add active-membranes.html
git commit -m "Make active membrane analysis count rule applications"
```

## Task 3: P-System Branching Trace Explorer

**Files:**
- Modify: `p-systems.html`

- [ ] **Step 1: Load shared engine and add branch container**

Load `formal-step.js` after `membrane-editor.js`.

Add below simulation status:

```html
<div id="branch-choices" class="space-y-2"></div>
```

- [ ] **Step 2: Build formal rules for current configuration**

Add:

```js
function getFormalPsystemRules() {
    return psystem.rules
        .filter(rule => {
            const membrane = psystem.membranes.get(rule.membraneId);
            return membrane && !membrane.dissolved;
        })
        .map(rule => ({
            id: rule.id,
            membraneId: rule.membraneId,
            resourceKey: rule.membraneId,
            lhs: rule.lhs,
            originalRuleString: rule.originalRuleString,
            exclusiveKey: ''
        }));
}
```

- [ ] **Step 3: Compute successor branch without mutating current state**

Add:

```js
function clonePsystemState(source) {
    return {
        membranes: new Map(Array.from(source.membranes.entries()).map(([id, mem]) => [id, {
            ...mem,
            initialObjects: new Map(mem.initialObjects || []),
            objects: new Map(mem.objects || [])
        }])),
        rules: source.rules,
        environmentObjects: new Map(source.environmentObjects || [])
    };
}

function applyRuleMultisetToClone(ruleCounts) {
    const next = clonePsystemState(psystem);
    const membraneOutputs = new Map();
    const environmentOutputs = new Map();
    const dissolveSet = new Set();

    ruleCounts.forEach((count, ruleId) => {
        const rule = next.rules.find(candidate => candidate.id === ruleId);
        const membrane = next.membranes.get(rule.membraneId);
        for (let i = 0; i < count; i += 1) {
            subtractObjects(membrane.objects, rule.lhs);
            rule.rhsProducts.forEach(prod => {
                const targetMap = new Map([[prod.obj, prod.count]]);
                if (prod.target === 'here') addObjects(membrane.objects, targetMap);
                else if (prod.target === 'out' && membrane.parentId) {
                    if (!membraneOutputs.has(membrane.parentId)) membraneOutputs.set(membrane.parentId, new Map());
                    addObjects(membraneOutputs.get(membrane.parentId), targetMap);
                } else if (prod.target === 'out') {
                    addObjects(environmentOutputs, targetMap);
                } else if (prod.target === 'out@' && prod.targetMembrane) {
                    if (!membraneOutputs.has(prod.targetMembrane)) membraneOutputs.set(prod.targetMembrane, new Map());
                    addObjects(membraneOutputs.get(prod.targetMembrane), targetMap);
                }
            });
            if (rule.dissolves) dissolveSet.add(rule.membraneId);
        }
    });

    membraneOutputs.forEach((objects, targetId) => {
        const target = next.membranes.get(targetId);
        if (target && !target.dissolved) addObjects(target.objects, objects);
    });
    addObjects(next.environmentObjects, environmentOutputs);

    dissolveSet.forEach(memId => {
        const membrane = next.membranes.get(memId);
        if (!membrane || membrane.dissolved) return;
        if (membrane.parentId && next.membranes.has(membrane.parentId)) {
            addObjects(next.membranes.get(membrane.parentId).objects, membrane.objects);
            next.membranes.forEach(child => {
                if (child.parentId === memId) child.parentId = membrane.parentId;
            });
        } else {
            addObjects(next.environmentObjects, membrane.objects);
            next.membranes.forEach(child => {
                if (child.parentId === memId) child.parentId = null;
            });
        }
        membrane.objects.clear();
        membrane.dissolved = true;
    });

    return next;
}
```

- [ ] **Step 4: Replace greedy step with branch rendering**

Add:

```js
function computePsystemBranches() {
    const formalRules = getFormalPsystemRules();
    const resources = new Map();
    psystem.membranes.forEach(mem => {
        if (!mem.dissolved) resources.set(mem.id, new Map(mem.objects));
    });
    return window.FormalStep.enumerateMaximalRuleMultisets(formalRules, resources, () => '')
        .map((set, index) => ({
            index,
            counts: set.counts,
            nextState: applyRuleMultisetToClone(set.counts)
        }));
}

function renderBranchChoices(branches) {
    const branchChoices = document.getElementById('branch-choices');
    branchChoices.replaceChildren();
    if (branches.length === 0) {
        const stable = document.createElement('p');
        stable.className = 'text-sm text-gray-500';
        stable.textContent = 'No applicable maximally parallel branches. The system is stable.';
        branchChoices.appendChild(stable);
        return;
    }
    branches.forEach(branch => {
        const button = document.createElement('button');
        button.className = 'w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-3 rounded-md shadow text-left';
        const parts = [];
        branch.counts.forEach((count, ruleId) => {
            const rule = psystem.rules.find(candidate => candidate.id === ruleId);
            parts.push(`${rule.originalRuleString} x ${count} in ${rule.membraneId}`);
        });
        button.textContent = `Branch ${branch.index + 1}: ${parts.join('; ')}`;
        button.addEventListener('click', () => {
            psystem = branch.nextState;
            currentStep += 1;
            renderBranchChoices([]);
            updateSimulationDisplay();
            logMessage(`Selected branch ${branch.index + 1}.`);
        });
        branchChoices.appendChild(button);
    });
}
```

Change `stepButton` to call:

```js
stepButton.addEventListener('click', () => {
    if (!psystem) return;
    renderBranchChoices(computePsystemBranches());
});
```

Disable or relabel `Run (10 Steps)` because branching requires user choice:

```js
runButton.textContent = 'Branching mode';
runButton.disabled = true;
```

- [ ] **Step 5: Add model assumptions panel**

Add below the log:

```html
<div class="mt-6 p-4 bg-gray-50 rounded-md border text-sm text-gray-600">
  <h3 class="text-lg font-semibold text-gray-600 mb-2">Model assumptions</h3>
  <p>This explorer computes exact one-step maximally parallel branches for the rule syntax shown on this page. Each step may produce several successor configurations; choose one branch to continue the trace.</p>
</div>
```

- [ ] **Step 6: Smoke test and commit**

User-run browser checks:
- A membrane with `a:2` and rules `a -> b`, `a -> c` should show three branches.
- Selecting a branch should update the displayed objects and increment the step once.
- Reset should clear branch choices.

Commit:

```sh
git add p-systems.html
git commit -m "Add branching P-system step explorer"
```

## Task 4: Safety, Swarm Polish, and Hub Performance

**Files:**
- Modify: `robot-swarms.html`
- Modify: `index.html`
- Modify: `README.md`

- [ ] **Step 1: Fix swarm double initialisation**

In `robot-swarms.html`, change generate/restart handlers to:

```js
generateGridBtn.addEventListener('click', () => {
    const size = parseInt(gridSizeInput.value);
    if (size % 2 === 0) {
         messageBox.textContent = "Grid size must be an odd number. Please correct.";
         messageBox.className = 'info-box mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm';
         return;
    }
    gridSizeInput.value = size;
    gridSize = size;
    resetState();
});

restartBtn.addEventListener('click', () => {
    window.location.hash = '';
    resetState();
});
```

- [ ] **Step 2: Harden shared-link loading**

Change history parsing to:

```js
const loadedHistory = Array.isArray(loadedData.history) ? loadedData.history : [];
moveHistory = loadedHistory.map(h => ({
    fromState: h.from,
    toState: h.to,
    moveDetails: h.details
}));
```

- [ ] **Step 3: Pause hub animation while tools are open**

In `index.html`, add:

```js
let animationEnabled = true;
let animationFrameId = null;
```

Update navigation:

```js
function showLanding() {
  animationEnabled = true;
  document.getElementById('landing').style.display = 'flex';
  document.getElementById('tool-view').classList.remove('active');
  document.getElementById('tool-frame').src = '';
  setActiveTab('home');
}

function openTool(src, toolId) {
  animationEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('landing').style.display = 'none';
  document.getElementById('tool-view').classList.add('active');
  document.getElementById('tool-frame').src = src;
  setActiveTab(toolId);
}
```

Update frame:

```js
function frame() {
  if (animationEnabled) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const alpha = parseFloat(getVar('--canvas-alpha')) || 0.5;
    for (const h of HELICES) drawHelix(canvas.width * h.xFrac, h.phaseOff, alpha);
    animT += 0.004;
  }
  animationFrameId = requestAnimationFrame(frame);
}
```

- [ ] **Step 4: Update README exactness notes**

Add:

```md
## Formal Coverage Notes

- Active Membranes Analyser: exact one-step maximally parallel analysis for supported rule types (a)-(d). Division rules (e)-(f) are blocked until full structural semantics are implemented.
- P-System Visual Simulator: exact one-step branching for the page's rewriting-rule syntax. Users choose a successor branch to continue a trace.
- Robot Swarm Transformer: validates interactive pivot rotations and connected initial shapes, but does not compute an automatic transformation sequence.
```

- [ ] **Step 5: Smoke test and commit**

User-run browser checks:
- Swarm share link with missing history loads without crashing.
- Opening a tool clears/pauses the DNA canvas.
- README accurately describes scope.

Commit:

```sh
git add robot-swarms.html index.html README.md
git commit -m "Harden revision site behaviour"
```

## Task 5: Final Verification

**Files:**
- No required edits unless verification reveals defects.

- [ ] **Step 1: Start static server**

Run:

```sh
python3 -m http.server 8000
```

Expected: server starts and serves the repo root.

- [ ] **Step 2: Give user the manual browser smoke-test checklist**

Open:

```text
http://localhost:8000/
```

Verify:
- Landing page loads.
- Each tool opens from nav.
- Theme toggle affects current iframe.
- Active membranes exact subset examples work.
- P-system branch selection updates state.
- Robot swarm grid setup, target setup, one rotation, undo, and share link work.

- [ ] **Step 3: Final git status**

Run:

```sh
git status --short
```

Expected: only pre-existing unrelated changes remain, especially the `CLAUDE.md -> AGENTS.md` rename if it is still present.
