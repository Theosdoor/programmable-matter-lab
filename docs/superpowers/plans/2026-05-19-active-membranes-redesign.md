# Active Membranes Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Active Membranes analyser as a notation-first, exact one-step maximally parallel analyser with per-line parser feedback.

**Architecture:** Keep the static site architecture and the existing visual membrane editor. Add focused browser-global modules for parsing standard active-membrane notation and converting parsed rules into the existing formal one-step enumerator. Refactor `active-membranes.html` only enough to replace rule forms with a top-to-bottom pipeline: structure, examples, rules textbox, parse table, and results.

**Tech Stack:** Plain HTML, CSS, browser JavaScript, existing `theme.css`, existing `membrane-editor.js`, existing `formal-step.js`, static browser smoke tests under `tests/`.

---

## File Structure

- Create `active-membrane-parser.js`
  - Owns tokenization/parsing of one-rule-per-line standard notation.
  - Exposes `window.ActiveMembraneParser`.
  - Does not touch the DOM.

- Create `active-membrane-analysis.js`
  - Owns conversion from parsed rules plus membrane state into formal rules for `FormalStep.enumerateMaximalRuleMultisets`.
  - Owns one-step transition helpers where needed for structural rules.
  - Exposes `window.ActiveMembraneAnalysis`.
  - Does not touch the DOM.

- Modify `active-membranes.html`
  - Removes rule form templates and rule-form management.
  - Adds examples block, multiline rules textarea, parse table, and line-ID result rendering.
  - Keeps visual membrane editor and default Figure 2 structure.

- Modify `tests/revision-examples-smoke.html`
  - Keeps existing Figure 2 maximal-set regression coverage.
  - Updates IDs from old `ruleform_N`/handmade rule IDs to line-based parser output where practical.

- Create `tests/active-membrane-parser-smoke.html`
  - Covers accepted notation, rejected lines, comments, blank lines, multisets, and the explicit blocked `(e)` behavior allowed by the design when `(e)` transition support is deferred.

- Create `tests/active-membrane-analysis-smoke.html`
  - Covers parser-to-analysis integration, repeated applications, exclusivity, Figure 2 first-step maximal set, and elementary division support or explicit blocking.

---

## Conventions For This Plan

Use these browser-global shapes consistently across tasks:

```js
// active-membrane-parser.js
window.ActiveMembraneParser = {
  parseRulesText,
  parseRuleLine,
  parseMultiset,
  formatMultiset,
  normalizeRule
};
```

```js
// active-membrane-analysis.js
window.ActiveMembraneAnalysis = {
  buildFormalRules,
  buildResourceMap,
  analyzeOneStep,
  cloneMembranes,
  applyRuleMultiset
};
```

Parsed rule row shape:

```js
{
  lineNumber: 1,
  id: 'L1',
  source: '[5 b]^- -> [5]^+ b',
  type: 'c',
  status: 'pass',
  diagnostic: '',
  normalized: '[5 b]^- -> [5]^+ b',
  rule: {
    type: 'c',
    membrane: '5',
    initialCharge: '-',
    lhs: new Map([['b', 1]]),
    rhs: {
      finalCharge: '+',
      parentProducts: new Map([['b', 1]])
    }
  }
}
```

Failed row shape:

```js
{
  lineNumber: 3,
  id: 'L3',
  source: '[5 b]^- => broken',
  type: '',
  status: 'fail',
  diagnostic: 'Line 3 does not match any supported active-membrane rule pattern.',
  normalized: '',
  rule: null
}
```

Blocked row shape, used only if elementary division semantics are deferred:

```js
{
  lineNumber: 8,
  id: 'L8',
  source: '[1 a]^0 -> [1 b]^+ [1 c]^-',
  type: 'e',
  status: 'blocked',
  diagnostic: 'Elementary division parsed, but one-step transition semantics are not enabled in this build.',
  normalized: '[1 a]^0 -> [1 b]^+ [1 c]^-',
  rule: { type: 'e' }
}
```

---

### Task 1: Parser Smoke Test Skeleton

**Files:**
- Create: `tests/active-membrane-parser-smoke.html`
- Create: `active-membrane-parser.js`

- [ ] **Step 1: Add the failing parser smoke test**

Create `tests/active-membrane-parser-smoke.html` with this content:

```html
<!doctype html>
<meta charset="utf-8">
<title>active membrane parser smoke tests</title>
<script src="../active-membrane-parser.js"></script>
<body>
<script>
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function countOf(multiset, object) {
    return multiset.get(object) || 0;
  }

  const rows = window.ActiveMembraneParser.parseRulesText(`
# Figure-style comments are ignored
[2 a -> b c^2]2^0
a [5]^- -> [5 b]^+
[7 a]^+ -> [7]^- a
[4 x]^0 -> lambda
[1 a]^0 -> [1 b]^+ [1 c]^-
[9 [4]^- [5]^+]^0 -> [9 [4]^0]^0 [9 [5]^0]^0
broken rule line
`);

  assert(rows.length === 7, 'comments and blank lines should not create parser rows');
  assert(rows[0].id === 'L3', 'line IDs should use source line numbers');
  assert(rows[0].type === 'a', 'evolution rule should parse as type a');
  assert(countOf(rows[0].rule.rhs.products, 'c') === 2, 'c^2 should parse as two c objects');
  assert(rows[1].type === 'b', 'send-in rule should parse as type b');
  assert(rows[2].type === 'c', 'send-out rule should parse as type c');
  assert(rows[3].type === 'd', 'dissolution rule should parse as type d');
  assert(rows[3].normalized.includes('lambda'), 'empty multiset should normalize to lambda');
  assert(rows[4].type === 'e', 'elementary division should parse as type e');
  assert(['pass', 'blocked'].includes(rows[4].status), 'elementary division should parse or be explicitly blocked');
  assert(rows[5].type === 'f', 'non-elementary division should parse as type f');
  assert(rows[6].status === 'fail', 'malformed input should fail');
  assert(rows[6].diagnostic.includes('Line 9'), 'failure should include line number');

  document.body.textContent = 'active membrane parser smoke tests passed';
</script>
```

- [ ] **Step 2: Add the minimal parser module stub**

Create `active-membrane-parser.js` with this content so the test fails on behavior, not a missing script:

```js
(function () {
  'use strict';

  function parseRulesText() {
    return [];
  }

  function parseRuleLine(line, lineNumber) {
    return {
      lineNumber,
      id: `L${lineNumber}`,
      source: line,
      type: '',
      status: 'fail',
      diagnostic: `Line ${lineNumber} does not match any supported active-membrane rule pattern.`,
      normalized: '',
      rule: null
    };
  }

  function parseMultiset() {
    return new Map();
  }

  function formatMultiset(multiset) {
    if (!multiset || multiset.size === 0) return 'lambda';
    return Array.from(multiset).map(([obj, count]) => count === 1 ? obj : `${obj}^${count}`).join(' ');
  }

  function normalizeRule(row) {
    return row && row.normalized ? row.normalized : '';
  }

  window.ActiveMembraneParser = {
    parseRulesText,
    parseRuleLine,
    parseMultiset,
    formatMultiset,
    normalizeRule
  };
}());
```

- [ ] **Step 3: Run the parser smoke test and verify it fails**

Run:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/tests/active-membrane-parser-smoke.html
```

Expected: the page throws an assertion error containing `comments and blank lines should not create parser rows`.

- [ ] **Step 4: Commit the failing parser test**

```sh
rtk git add tests/active-membrane-parser-smoke.html active-membrane-parser.js
rtk git commit -m "test: add active membrane parser smoke coverage"
```

---

### Task 2: Parser Implementation

**Files:**
- Modify: `active-membrane-parser.js`
- Test: `tests/active-membrane-parser-smoke.html`

- [ ] **Step 1: Replace the parser module with a real tokenizer and rule parsers**

Replace the full contents of `active-membrane-parser.js` with:

```js
(function () {
  'use strict';

  const CHARGE_RE = String.raw`(?:\+|-|0)`;
  const LABEL_RE = String.raw`[A-Za-z0-9_]+`;

  function fail(line, lineNumber, message) {
    return {
      lineNumber,
      id: `L${lineNumber}`,
      source: line,
      type: '',
      status: 'fail',
      diagnostic: message || `Line ${lineNumber} does not match any supported active-membrane rule pattern.`,
      normalized: '',
      rule: null
    };
  }

  function pass(line, lineNumber, type, normalized, rule) {
    return {
      lineNumber,
      id: `L${lineNumber}`,
      source: line,
      type,
      status: 'pass',
      diagnostic: '',
      normalized,
      rule
    };
  }

  function parseRulesText(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#');
      })
      .map(({ line, lineNumber }) => parseRuleLine(line, lineNumber));
  }

  function parseMultiset(text) {
    const trimmed = String(text || '').trim();
    const multiset = new Map();
    if (!trimmed || trimmed === 'lambda') return multiset;

    for (const token of trimmed.split(/\s+/)) {
      const match = token.match(/^([A-Za-z][A-Za-z0-9_]*)(?:\^([1-9][0-9]*))?$/);
      if (!match) throw new Error(`Invalid multiset token "${token}"`);
      const object = match[1];
      const count = match[2] ? Number(match[2]) : 1;
      multiset.set(object, (multiset.get(object) || 0) + count);
    }

    return multiset;
  }

  function formatMultiset(multiset) {
    if (!multiset || multiset.size === 0) return 'lambda';
    return Array.from(multiset)
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([object, count]) => count === 1 ? object : `${object}^${count}`)
      .join(' ');
  }

  function parseInnerMembranes(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return [];

    const matches = Array.from(trimmed.matchAll(new RegExp(String.raw`\[(${LABEL_RE})\]\^(${CHARGE_RE})`, 'g')));
    const consumed = matches.map(match => match[0]).join(' ').replace(/\s+/g, ' ').trim();
    if (consumed !== trimmed.replace(/\s+/g, ' ').trim()) {
      throw new Error(`Invalid inner membrane list "${text}"`);
    }

    return matches.map(match => ({ label: match[1], charge: match[2] }));
  }

  function parseEvolution(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*->\s*(.*?)\s*\]\s*\1\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const products = parseMultiset(match[3]);
    const initialCharge = match[4];
    const normalized = `[${membrane} ${formatMultiset(lhs)} -> ${formatMultiset(products)}]${membrane}^${initialCharge}`;
    return pass(line, lineNumber, 'a', normalized, {
      type: 'a',
      membrane,
      initialCharge,
      lhs,
      rhs: { products }
    });
  }

  function parseSendIn(line, lineNumber) {
    const re = new RegExp(String.raw`^(.+?)\s+\[\s*(${LABEL_RE})\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\2(?:\s+(.*?))?\s*\]\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const objectOutside = parseMultiset(match[1]);
    const membrane = match[2];
    const initialCharge = match[3];
    const products = parseMultiset(match[4] || 'lambda');
    const finalCharge = match[5];
    const normalized = `${formatMultiset(objectOutside)} [${membrane}]^${initialCharge} -> [${membrane} ${formatMultiset(products)}]^${finalCharge}`;
    return pass(line, lineNumber, 'b', normalized, {
      type: 'b',
      membrane,
      initialCharge,
      lhs: objectOutside,
      rhs: { finalCharge, products }
    });
  }

  function parseSendOut(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\1\s*\]\^(${CHARGE_RE})(?:\s+(.*))?$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const initialCharge = match[3];
    const finalCharge = match[4];
    const parentProducts = parseMultiset(match[5] || 'lambda');
    const normalized = `[${membrane} ${formatMultiset(lhs)}]^${initialCharge} -> [${membrane}]^${finalCharge} ${formatMultiset(parentProducts)}`;
    return pass(line, lineNumber, 'c', normalized, {
      type: 'c',
      membrane,
      initialCharge,
      lhs,
      rhs: { finalCharge, parentProducts }
    });
  }

  function parseDissolution(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*(.+)$`);
    const match = line.match(re);
    if (!match) return null;
    if (line.match(new RegExp(String.raw`->\s*\[\s*${LABEL_RE}`, ''))) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const initialCharge = match[3];
    const productsToParent = parseMultiset(match[4]);
    const normalized = `[${membrane} ${formatMultiset(lhs)}]^${initialCharge} -> ${formatMultiset(productsToParent)}`;
    return pass(line, lineNumber, 'd', normalized, {
      type: 'd',
      membrane,
      initialCharge,
      lhs,
      rhs: { productsToParent }
    });
  }

  function parseElementaryDivision(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\1(?:\s+(.*?))?\s*\]\^(${CHARGE_RE})\s+\[\s*\1(?:\s+(.*?))?\s*\]\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const initialCharge = match[3];
    const firstProducts = parseMultiset(match[4] || 'lambda');
    const firstCharge = match[5];
    const secondProducts = parseMultiset(match[6] || 'lambda');
    const secondCharge = match[7];
    const normalized = `[${membrane} ${formatMultiset(lhs)}]^${initialCharge} -> [${membrane} ${formatMultiset(firstProducts)}]^${firstCharge} [${membrane} ${formatMultiset(secondProducts)}]^${secondCharge}`;
    return pass(line, lineNumber, 'e', normalized, {
      type: 'e',
      membrane,
      initialCharge,
      lhs,
      rhs: {
        first: { label: membrane, charge: firstCharge, products: firstProducts },
        second: { label: membrane, charge: secondCharge, products: secondProducts }
      }
    });
  }

  function parseNonElementaryDivision(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\1\s+(.*?)\s*\]\^(${CHARGE_RE})\s+\[\s*\1\s+(.*?)\s*\]\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    const lhsInner = parseInnerMembranes(match[2]);
    const initialCharge = match[3];
    const firstInner = parseInnerMembranes(match[4]);
    const firstCharge = match[5];
    const secondInner = parseInnerMembranes(match[6]);
    const secondCharge = match[7];
    const normalized = `[${membrane} ${formatInnerMembranes(lhsInner)}]^${initialCharge} -> [${membrane} ${formatInnerMembranes(firstInner)}]^${firstCharge} [${membrane} ${formatInnerMembranes(secondInner)}]^${secondCharge}`;
    return pass(line, lineNumber, 'f', normalized, {
      type: 'f',
      membrane,
      initialCharge,
      lhsInner,
      rhs: {
        first: { label: membrane, charge: firstCharge, inner: firstInner },
        second: { label: membrane, charge: secondCharge, inner: secondInner }
      }
    });
  }

  function formatInnerMembranes(inner) {
    return inner.map(mem => `[${mem.label}]^${mem.charge}`).join(' ');
  }

  function parseRuleLine(line, lineNumber) {
    const source = String(line || '').trim();
    try {
      const parsers = [
        parseNonElementaryDivision,
        parseElementaryDivision,
        parseSendIn,
        parseSendOut,
        parseEvolution,
        parseDissolution
      ];

      for (const parser of parsers) {
        const row = parser(source, lineNumber);
        if (row) return row;
      }
    } catch (error) {
      return fail(source, lineNumber, `Line ${lineNumber}: ${error.message}`);
    }

    return fail(source, lineNumber, `Line ${lineNumber} does not match any supported active-membrane rule pattern.`);
  }

  function normalizeRule(row) {
    return row && row.normalized ? row.normalized : '';
  }

  window.ActiveMembraneParser = {
    parseRulesText,
    parseRuleLine,
    parseMultiset,
    formatMultiset,
    normalizeRule
  };
}());
```

- [ ] **Step 2: Run parser smoke test**

Run:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/tests/active-membrane-parser-smoke.html
```

Expected: page text is `active membrane parser smoke tests passed`.

- [ ] **Step 3: Commit parser implementation**

```sh
rtk git add active-membrane-parser.js tests/active-membrane-parser-smoke.html
rtk git commit -m "feat: parse active membrane notation"
```

---

### Task 3: Analysis Integration Smoke Test

**Files:**
- Create: `tests/active-membrane-analysis-smoke.html`
- Create: `active-membrane-analysis.js`

- [ ] **Step 1: Add failing parser-to-analysis smoke test**

Create `tests/active-membrane-analysis-smoke.html` with:

```html
<!doctype html>
<meta charset="utf-8">
<title>active membrane analysis smoke tests</title>
<script src="../formal-step.js"></script>
<script src="../active-membrane-parser.js"></script>
<script src="../active-membrane-analysis.js"></script>
<body>
<script>
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function map(entries) {
    return new Map(entries);
  }

  function membrane(id, charge, objects, parentId, childrenIds) {
    return {
      id,
      label: id,
      charge,
      objects: map(objects || []),
      parentId: parentId || null,
      childrenIds: childrenIds || []
    };
  }

  function hasCounts(sets, expected) {
    return sets.some(set => {
      for (const [ruleId, count] of Object.entries(expected)) {
        if ((set.counts.get(ruleId) || 0) !== count) return false;
      }
      for (const [ruleId, count] of set.counts) {
        if ((expected[ruleId] || 0) !== count) return false;
      }
      return true;
    });
  }

  const membranes = new Map([
    ['10', membrane('10', '0', [], null, ['9'])],
    ['9', membrane('9', '0', [['b', 1]], '10', ['3', '4', '5'])],
    ['3', membrane('3', '0', [], '9', ['1', '2'])],
    ['1', membrane('1', '+', [], '3', [])],
    ['2', membrane('2', '-', [], '3', [])],
    ['4', membrane('4', '-', [['a', 1]], '9', ['6', '7'])],
    ['6', membrane('6', '+', [], '4', [])],
    ['7', membrane('7', '-', [], '4', [])],
    ['5', membrane('5', '-', [], '9', ['8'])],
    ['8', membrane('8', '+', [], '5', [])]
  ]);

  const rows = window.ActiveMembraneParser.parseRulesText(`
b [5]^- -> [5 b]^+
a [7]^- -> [7 a]^+
[3 [1]^+ [2]^-]^0 -> [3 [1]^0]^0 [3 [2]^0]^0
[4 [6]^+ [7]^-]^- -> [4 [6]^+]^- [4 [7]^+]^-
`);
  const analysis = window.ActiveMembraneAnalysis.analyzeOneStep(membranes, rows);
  assert(analysis.status === 'pass', 'Figure 2 analysis should pass');
  assert(hasCounts(analysis.maximalSets, { L1: 1, L2: 1, L3: 1 }), 'expected Figure 2 first maximal set missing');
  assert(analysis.maximalSets.every(set => !set.counts.has('L4') || !set.counts.has('L2')), 'rules competing for membrane 7 should not co-occur');

  const repeatedRows = window.ActiveMembraneParser.parseRulesText('[1 a -> b]1^0');
  const repeatedMembranes = new Map([
    ['1', membrane('1', '0', [['a', 3]], null, [])]
  ]);
  const repeated = window.ActiveMembraneAnalysis.analyzeOneStep(repeatedMembranes, repeatedRows);
  assert(hasCounts(repeated.maximalSets, { L1: 3 }), 'evolution should count repeated applications');

  const elementaryRows = window.ActiveMembraneParser.parseRulesText('[1 a]^0 -> [1 b]^+ [1 c]^-');
  const elementaryMembranes = new Map([
    ['1', membrane('1', '0', [['a', 1], ['z', 1]], null, [])]
  ]);
  const elementary = window.ActiveMembraneAnalysis.analyzeOneStep(elementaryMembranes, elementaryRows);
  assert(['pass', 'blocked'].includes(elementary.status), 'elementary division must pass or be explicitly blocked');
  if (elementary.status === 'blocked') {
    assert(elementary.diagnostics[0].includes('Elementary division'), 'blocked elementary division should explain itself');
  } else {
    assert(hasCounts(elementary.maximalSets, { L1: 1 }), 'elementary division should be applicable once');
  }

  document.body.textContent = 'active membrane analysis smoke tests passed';
</script>
```

- [ ] **Step 2: Add minimal analysis module stub**

Create `active-membrane-analysis.js`:

```js
(function () {
  'use strict';

  function buildFormalRules() {
    return [];
  }

  function buildResourceMap() {
    return new Map();
  }

  function analyzeOneStep() {
    return {
      status: 'pass',
      diagnostics: [],
      maximalSets: []
    };
  }

  function cloneMembranes(membranes) {
    return new Map(membranes || []);
  }

  function applyRuleMultiset(membranes) {
    return cloneMembranes(membranes);
  }

  window.ActiveMembraneAnalysis = {
    buildFormalRules,
    buildResourceMap,
    analyzeOneStep,
    cloneMembranes,
    applyRuleMultiset
  };
}());
```

- [ ] **Step 3: Run analysis smoke test and verify it fails**

Run:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/tests/active-membrane-analysis-smoke.html
```

Expected: assertion error containing `expected Figure 2 first maximal set missing`.

- [ ] **Step 4: Commit failing analysis test**

```sh
rtk git add tests/active-membrane-analysis-smoke.html active-membrane-analysis.js
rtk git commit -m "test: add active membrane analysis smoke coverage"
```

---

### Task 4: Analysis Implementation For One-Step Maximal Sets

**Files:**
- Modify: `active-membrane-analysis.js`
- Test: `tests/active-membrane-analysis-smoke.html`
- Test: `tests/formal-step-smoke.html`
- Test: `tests/revision-examples-smoke.html`

- [ ] **Step 1: Replace analysis module with formal-rule conversion**

Replace `active-membrane-analysis.js` with:

```js
(function () {
  'use strict';

  function cloneMultiset(multiset) {
    return new Map(multiset || []);
  }

  function cloneMembrane(membrane) {
    return {
      ...membrane,
      objects: cloneMultiset(membrane.objects),
      childrenIds: Array.from(membrane.childrenIds || [])
    };
  }

  function cloneMembranes(membranes) {
    return new Map(Array.from(membranes || []).map(([id, membrane]) => [id, cloneMembrane(membrane)]));
  }

  function resourceKey(membraneId) {
    return `membrane:${membraneId}`;
  }

  function buildResourceMap(membranes) {
    const resources = new Map();
    membranes.forEach((membrane, membraneId) => {
      resources.set(resourceKey(membraneId), cloneMultiset(membrane.objects));
    });
    return resources;
  }

  function hasChildren(membranes, membraneId) {
    for (const membrane of membranes.values()) {
      if (membrane.parentId === membraneId) return true;
    }
    return false;
  }

  function rowDiagnostic(row, message) {
    return `${row.id}: ${message}`;
  }

  function buildFormalRules(membranes, rows, options) {
    const diagnostics = [];
    const formalRules = [];
    const allowElementaryDivision = Boolean(options && options.allowElementaryDivision);

    for (const row of rows || []) {
      if (row.status === 'fail') {
        diagnostics.push(rowDiagnostic(row, row.diagnostic));
        continue;
      }
      if (row.status === 'blocked') {
        diagnostics.push(rowDiagnostic(row, row.diagnostic));
        continue;
      }

      const rule = row.rule;
      const membrane = membranes.get(rule.membrane);
      if (!membrane) {
        diagnostics.push(rowDiagnostic(row, `Unknown membrane "${rule.membrane}".`));
        continue;
      }
      if (membrane.charge !== rule.initialCharge) continue;

      if (rule.type === 'e' && !allowElementaryDivision) {
        diagnostics.push(rowDiagnostic(row, 'Elementary division parsed, but one-step transition semantics are not enabled in this build.'));
        continue;
      }

      if (rule.type === 'e' && hasChildren(membranes, rule.membrane)) continue;

      if (rule.type === 'f' && !innerMembranesMatch(membranes, rule)) continue;

      const formal = {
        id: row.id,
        displayLabel: row.id,
        type: rule.type,
        membraneId: rule.membrane,
        resourceKey: resourceKey(rule.membrane),
        lhs: cloneMultiset(rule.lhs),
        raw: row.source,
        parsedRow: row,
        exclusiveKeys: []
      };

      if (rule.type === 'b') {
        if (!membrane.parentId) continue;
        formal.resourceKey = resourceKey(membrane.parentId);
        formal.exclusiveKeys = [resourceKey(rule.membrane)];
      } else if (['c', 'd', 'e'].includes(rule.type)) {
        formal.exclusiveKeys = [resourceKey(rule.membrane)];
      } else if (rule.type === 'f') {
        formal.lhs = new Map();
        formal.exclusiveKeys = [
          resourceKey(rule.membrane),
          ...rule.lhsInner.map(inner => resourceKey(inner.label))
        ];
      }

      formalRules.push(formal);
    }

    return { formalRules, diagnostics };
  }

  function innerMembranesMatch(membranes, rule) {
    for (const inner of rule.lhsInner || []) {
      const membrane = membranes.get(inner.label);
      if (!membrane || membrane.parentId !== rule.membrane || membrane.charge !== inner.charge) return false;
    }
    return true;
  }

  function analyzeOneStep(membranes, rows, options) {
    const parserProblems = (rows || []).filter(row => row.status === 'fail' || row.status === 'blocked');
    if (parserProblems.length > 0) {
      return {
        status: parserProblems.some(row => row.status === 'blocked') ? 'blocked' : 'fail',
        diagnostics: parserProblems.map(row => rowDiagnostic(row, row.diagnostic)),
        maximalSets: []
      };
    }

    const built = buildFormalRules(membranes, rows, options);
    if (built.diagnostics.some(message => message.includes('Elementary division'))) {
      return {
        status: 'blocked',
        diagnostics: built.diagnostics,
        maximalSets: []
      };
    }

    const maximalSets = window.FormalStep.enumerateMaximalRuleMultisets(
      built.formalRules,
      buildResourceMap(membranes),
      rule => rule.exclusiveKeys
    );

    return {
      status: 'pass',
      diagnostics: built.diagnostics,
      maximalSets,
      formalRules: built.formalRules
    };
  }

  function applyRuleMultiset(membranes) {
    return cloneMembranes(membranes);
  }

  window.ActiveMembraneAnalysis = {
    buildFormalRules,
    buildResourceMap,
    analyzeOneStep,
    cloneMembranes,
    applyRuleMultiset
  };
}());
```

- [ ] **Step 2: Run smoke tests**

Run the local server:

```sh
python3 -m http.server 8000
```

Open each page:

```text
http://localhost:8000/tests/active-membrane-parser-smoke.html
http://localhost:8000/tests/active-membrane-analysis-smoke.html
http://localhost:8000/tests/formal-step-smoke.html
http://localhost:8000/tests/revision-examples-smoke.html
```

Expected page texts:

```text
active membrane parser smoke tests passed
active membrane analysis smoke tests passed
formal-step smoke tests passed
revision example smoke tests passed
```

- [ ] **Step 3: Commit analysis implementation**

```sh
rtk git add active-membrane-analysis.js tests/active-membrane-analysis-smoke.html
rtk git commit -m "feat: analyze parsed active membrane rules"
```

---

### Task 5: Replace Rule Forms With Textbox UI

**Files:**
- Modify: `active-membranes.html`
- Test: `tests/active-membrane-parser-smoke.html`
- Test: `tests/active-membrane-analysis-smoke.html`

- [ ] **Step 1: Replace the rule form section markup**

In `active-membranes.html`, replace the right-hand "Rules Definition" area and the old add-rule buttons/container with this top-to-bottom section below the visual editor:

```html
<section class="mb-8">
  <h2 class="text-2xl font-semibold text-gray-700 mb-3">Rule notation</h2>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="p-4 bg-gray-50 rounded-md border">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Accepted patterns</h3>
      <pre class="text-xs whitespace-pre-wrap bg-white p-3 border rounded-md overflow-auto" id="rule-examples-display">(a) Evolution:
[h a -> v]h^0

(b) Send-in:
a [h]^- -> [h b]^+

(c) Send-out:
[h a]^+ -> [h]^- b

(d) Dissolution:
[h a]^0 -> lambda

(e) Elementary division:
[h a]^0 -> [h b]^+ [h c]^-

(f) Non-elementary division:
[h [g1]^+ [g2]^-]^0 -> [h [g1]^0]^0 [h [g2]^0]^0</pre>
    </div>
    <div>
      <label for="rules-textarea" class="psystem-input-label">Rules, one per line:</label>
      <textarea id="rules-textarea" class="w-full h-72 p-3 border rounded-md bg-gray-50 font-mono text-sm" spellcheck="false"></textarea>
      <p class="text-xs text-gray-500 mt-2">Blank lines and lines starting with # are ignored. Use a^2 for repeated objects and lambda for the empty multiset.</p>
    </div>
  </div>
</section>

<section class="mb-8">
  <h2 class="text-2xl font-semibold text-gray-700 mb-3">Parse results</h2>
  <div id="parse-results-container" class="overflow-x-auto border rounded-md bg-white">
    <p class="text-gray-500 p-3">No rules parsed yet.</p>
  </div>
</section>
```

Keep the existing membrane editor section above this, and keep the existing analysis button below parse results.

- [ ] **Step 2: Remove obsolete templates and rule form management**

Delete these from `active-membranes.html`:

- all `<template id="rule-template-...">` blocks;
- `addRuleButtonsContainer`;
- `rulesListContainer`;
- `ruleFormCounter`;
- `createRuleForm`;
- `parseRulesFromVisualForms`;
- `addAndFillRuleForm`;
- all event handlers that add/remove rule form blocks.

Do not delete `parseObjectsFromInput()` or `parseMembraneStructureFromVisual()`; those still support the visual membrane editor.

- [ ] **Step 3: Load new scripts**

Near the existing script tags, ensure this order:

```html
<script src="membrane-editor.js"></script>
<script src="formal-step.js"></script>
<script src="active-membrane-parser.js"></script>
<script src="active-membrane-analysis.js"></script>
```

- [ ] **Step 4: Add DOM references and parse renderer**

Inside the page script, add:

```js
const rulesTextareaEl = document.getElementById('rules-textarea');
const parseResultsContainerEl = document.getElementById('parse-results-container');
let latestParsedRows = [];

function renderParseResults(rows) {
  latestParsedRows = rows;
  if (!rows.length) {
    parseResultsContainerEl.innerHTML = '<p class="text-gray-500 p-3">No active rule lines.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'min-w-full text-sm';
  table.innerHTML = `
    <thead class="bg-gray-50 text-gray-700">
      <tr>
        <th class="text-left p-2 border-b">Line</th>
        <th class="text-left p-2 border-b">Type</th>
        <th class="text-left p-2 border-b">Status</th>
        <th class="text-left p-2 border-b">Normalized</th>
        <th class="text-left p-2 border-b">Diagnostic</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  rows.forEach(row => {
    const tr = document.createElement('tr');
    const statusClass = row.status === 'pass' ? 'text-green-700' : row.status === 'blocked' ? 'text-amber-700' : 'text-red-700';
    tr.innerHTML = `
      <td class="p-2 border-b font-mono">${row.id}</td>
      <td class="p-2 border-b font-mono">${row.type || '-'}</td>
      <td class="p-2 border-b font-semibold ${statusClass}">${row.status}</td>
      <td class="p-2 border-b font-mono">${row.normalized || row.source}</td>
      <td class="p-2 border-b">${row.diagnostic || ''}</td>
    `;
    tbody.appendChild(tr);
  });

  parseResultsContainerEl.replaceChildren(table);
}

function parseRulesFromTextarea() {
  const rows = window.ActiveMembraneParser.parseRulesText(rulesTextareaEl.value);
  renderParseResults(rows);
  return rows;
}

rulesTextareaEl.addEventListener('input', () => {
  clearError();
  parseRulesFromTextarea();
});
```

- [ ] **Step 5: Run static smoke tests**

Run:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/active-membranes.html
```

Expected:

- The page loads.
- The old rule-form buttons are gone.
- The examples block is visible.
- The rules textbox is visible.
- Typing a malformed line updates the parse table with `fail`.

Also open:

```text
http://localhost:8000/tests/active-membrane-parser-smoke.html
http://localhost:8000/tests/active-membrane-analysis-smoke.html
```

Expected:

```text
active membrane parser smoke tests passed
active membrane analysis smoke tests passed
```

- [ ] **Step 6: Commit textbox UI**

```sh
rtk git add active-membranes.html
rtk git commit -m "feat: replace active membrane rule forms with notation editor"
```

---

### Task 6: Wire Textbox Analysis Results

**Files:**
- Modify: `active-membranes.html`
- Test: `tests/active-membrane-analysis-smoke.html`
- Test: `tests/revision-examples-smoke.html`

- [ ] **Step 1: Replace analysis click handler**

Replace the existing `analyzeBtnEl.addEventListener('click', ...)` body with:

```js
analyzeBtnEl.addEventListener('click', () => {
  clearError();
  setResultsMessage('Analyzing...', 'text-gray-500');
  log('--- Analysis Started ---', 'info');

  const membranes = parseMembraneStructureFromVisual();
  if (!membranes || membranes.size === 0) {
    displayErrorText('Failed to parse membranes. Ensure membranes are defined.');
    setResultsMessage('Error parsing membranes.', 'text-red-500');
    return;
  }

  const rows = parseRulesFromTextarea();
  const badRows = rows.filter(row => row.status === 'fail' || row.status === 'blocked');
  if (badRows.length > 0) {
    const message = `Fix or remove ${badRows.length} rule line(s) before analysis.`;
    displayErrorText(message);
    setResultsMessage(message, 'text-red-500');
    log(message, 'warn');
    return;
  }

  const analysis = window.ActiveMembraneAnalysis.analyzeOneStep(membranes, rows);
  if (analysis.status !== 'pass') {
    const message = analysis.diagnostics.join(' ') || 'Analysis could not run.';
    displayErrorText(message);
    setResultsMessage(message, analysis.status === 'blocked' ? 'text-amber-700' : 'text-red-500');
    log(message, analysis.status === 'blocked' ? 'warn' : 'error');
    return;
  }

  renderLineBasedMaximalSets(analysis.maximalSets, rows);
  log('--- Analysis Complete ---', 'info');
});
```

- [ ] **Step 2: Add line-based result renderer**

Add this function near the old result renderer, then remove `renderFormalMaximalSets` if nothing uses it:

```js
function renderLineBasedMaximalSets(maximalSets, rows) {
  resultsDisplayEl.replaceChildren();
  const rowsById = new Map(rows.map(row => [row.id, row]));

  if (!maximalSets.length) {
    setResultsMessage('No applicable maximally parallel sets at t = 0.');
    return;
  }

  maximalSets.forEach((set, index) => {
    const setDiv = document.createElement('div');
    setDiv.classList.add('result-item');

    const heading = document.createElement('h3');
    heading.className = 'font-semibold text-gray-700';
    heading.textContent = `t = 0 choice ${index + 1}`;
    setDiv.appendChild(heading);

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'mt-2 flex flex-wrap gap-1';

    set.counts.forEach((count, ruleId) => {
      const row = rowsById.get(ruleId);
      const tag = document.createElement('span');
      tag.className = 'rule-tag';
      tag.title = row ? row.source : '';
      tag.textContent = `${ruleId} x ${count} (Type ${row ? row.type : '?'})`;
      tagsContainer.appendChild(tag);
    });

    setDiv.appendChild(tagsContainer);
    resultsDisplayEl.appendChild(setDiv);
  });
}
```

- [ ] **Step 3: Update default example loader**

In `loadExampleFromScreenshotVisual()`, remove population of `exampleRulesData` via rule forms and instead set:

```js
rulesTextareaEl.value = [
  'b [5]^- -> [5 b]^+',
  'a [7]^- -> [7 a]^+',
  '[3 [1]^+ [2]^-]^0 -> [3 [1]^0]^0 [3 [2]^0]^0',
  '[4 [6]^+ [7]^-]^- -> [4 [6]^+]^- [4 [7]^+]^-',
  '[9 [4]^- [5]^+]^0 -> [9 [4]^0]^0 [9 [5]^0]^0'
].join('\\n');
renderParseResults(window.ActiveMembraneParser.parseRulesText(rulesTextareaEl.value));
```

Keep the visual membrane creation code unchanged unless parser/analysis tests force a charge correction.

- [ ] **Step 4: Manual browser verification**

Run:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/active-membranes.html
```

Expected:

- Default Figure 2 structure loads.
- Default rules textbox is populated.
- Parse table shows five `pass` rows.
- Clicking `Find Maximally Parallel Sets` shows `t = 0 choice` results with line IDs such as `L1 x 1 (Type b)`.
- Adding a malformed line disables/stops analysis with a line-level diagnostic.

- [ ] **Step 5: Run static smoke tests**

Open:

```text
http://localhost:8000/tests/active-membrane-parser-smoke.html
http://localhost:8000/tests/active-membrane-analysis-smoke.html
http://localhost:8000/tests/revision-examples-smoke.html
```

Expected:

```text
active membrane parser smoke tests passed
active membrane analysis smoke tests passed
revision example smoke tests passed
```

- [ ] **Step 6: Commit analysis wiring**

```sh
rtk git add active-membranes.html
rtk git commit -m "feat: show line-based active membrane analysis results"
```

---

### Task 7: Update Revision Smoke Test To Use Parser Path

**Files:**
- Modify: `tests/revision-examples-smoke.html`
- Test: `tests/revision-examples-smoke.html`

- [ ] **Step 1: Replace handmade active membrane rules with parser + analysis path**

In `tests/revision-examples-smoke.html`, add these scripts after `formal-step.js`:

```html
<script src="../active-membrane-parser.js"></script>
<script src="../active-membrane-analysis.js"></script>
```

Replace the `activeInitialRules`, `activeInitialResources`, and `activeInitialSets` block with:

```js
function membrane(id, charge, objects, parentId, childrenIds) {
  return {
    id,
    label: id,
    charge,
    objects: map(objects || []),
    parentId: parentId || null,
    childrenIds: childrenIds || []
  };
}

const activeMembranes = new Map([
  ['10', membrane('10', '0', [], null, ['9'])],
  ['9', membrane('9', '0', [['b', 1]], '10', ['3', '4', '5'])],
  ['3', membrane('3', '0', [], '9', ['1', '2'])],
  ['1', membrane('1', '+', [], '3', [])],
  ['2', membrane('2', '-', [], '3', [])],
  ['4', membrane('4', '-', [['a', 1]], '9', ['6', '7'])],
  ['6', membrane('6', '+', [], '4', [])],
  ['7', membrane('7', '-', [], '4', [])],
  ['5', membrane('5', '-', [], '9', ['8'])],
  ['8', membrane('8', '+', [], '5', [])]
]);

const activeRows = window.ActiveMembraneParser.parseRulesText(`
b [5]^- -> [5 b]^+
a [7]^- -> [7 a]^+
[3 [1]^+ [2]^-]^0 -> [3 [1]^0]^0 [3 [2]^0]^0
[4 [6]^+ [7]^-]^- -> [4 [6]^+]^- [4 [7]^+]^-
`);

const activeInitialAnalysis = window.ActiveMembraneAnalysis.analyzeOneStep(activeMembranes, activeRows);
assert(activeInitialAnalysis.status === 'pass', 'active membrane Figure 2 first-step analysis should pass');
assert(
  hasCounts(activeInitialAnalysis.maximalSets, { L1: 1, L2: 1, L3: 1 }),
  'active membrane Figure 2 first expected maximal set should be present'
);
```

Keep the existing `activeSecondRules` block if it is still useful for low-level `FormalStep` coverage.

- [ ] **Step 2: Run revision smoke test**

Run:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/tests/revision-examples-smoke.html
```

Expected:

```text
revision example smoke tests passed
```

- [ ] **Step 3: Commit revision smoke update**

```sh
rtk git add tests/revision-examples-smoke.html
rtk git commit -m "test: cover active membrane notation path in revision smoke"
```

---

### Task 8: Documentation And Hub Re-enable

**Files:**
- Modify: `README.md`
- Modify: `index.html`
- Modify: `TODO.md`

- [ ] **Step 1: Update README formal coverage**

In `README.md`, update the Active Membranes section to remove `[!temporarily offline]` only if browser verification passed in Task 6. Use this wording:

```markdown
### Active Membranes Analyser
Define a P-system with active membranes using standard active-membrane notation, inspect per-line parser feedback, and find all exact one-step maximally parallel sets of applicable rules.
```

Update Formal Coverage Notes:

```markdown
- Active Membranes Analyser: exact one-step maximally parallel analysis for parsed standard notation. Rule types (a)-(d) and (f) are supported in analysis; rule type (e) is parsed and either analysed if completed or explicitly blocked with a diagnostic.
```

- [ ] **Step 2: Re-enable active membrane nav/card**

In `index.html`, uncomment the Membranes nav button and card only if manual browser verification passed:

```html
<button class="tool-tab" id="tab-membranes"
        onclick="openTool('active-membranes.html','membranes')">Membranes</button>
```

```html
<div class="card" data-tool="membranes" tabindex="0" role="button"
     onclick="openTool('active-membranes.html','membranes')"
     onkeydown="if(event.key==='Enter')openTool('active-membranes.html','membranes')">
  <div class="card-tag">A &mdash; 01</div>
  <svg class="card-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
    <ellipse cx="20" cy="20" rx="18" ry="11" stroke-dasharray="3 2"/>
    <ellipse cx="20" cy="20" rx="11" ry="7"/>
    <circle  cx="20" cy="20" r="3" fill="currentColor" stroke="none" opacity="0.5"/>
    <line x1="14" y1="16" x2="20" y2="20" stroke-width="1" opacity="0.4"/>
    <line x1="26" y1="16" x2="20" y2="20" stroke-width="1" opacity="0.4"/>
  </svg>
  <h2 class="card-title">Active Membranes</h2>
  <p class="card-desc">Analyse active-membrane systems from standard notation with parser feedback and exact one-step maximal sets.</p>
  <div class="card-cta">Open analyser <span aria-hidden="true">&#8594;</span></div>
</div>
```

- [ ] **Step 3: Update TODO**

In `TODO.md`, replace the old "active membranes SUCK rn" block with:

```markdown
## active membranes next phase
- add interactive timestep tree once successor configurations are rendered reliably
- add URL sharing for membrane structure + rules textbox
- complete and verify elementary division (e) if it remains blocked after the first reliable parser/analyser pass
```

- [ ] **Step 4: Final browser verification**

Run:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/index.html
```

Expected:

- Membranes appears in the nav.
- Active Membranes card appears on the landing page.
- Opening it loads `active-membranes.html` in the iframe.
- Theme toggle still updates the iframe.
- The analyser still parses default rules and returns line-based `t = 0` choices.

- [ ] **Step 5: Run all smoke tests**

Open:

```text
http://localhost:8000/tests/formal-step-smoke.html
http://localhost:8000/tests/p-system-target-parser-smoke.html
http://localhost:8000/tests/revision-examples-smoke.html
http://localhost:8000/tests/active-membrane-parser-smoke.html
http://localhost:8000/tests/active-membrane-analysis-smoke.html
```

Expected all pages end in `passed`.

- [ ] **Step 6: Commit docs and hub re-enable**

```sh
rtk git add README.md TODO.md index.html
rtk git commit -m "docs: mark active membranes analyser ready"
```

---

## Final Verification Checklist

- [ ] `active-membranes.html` loads directly from the static server.
- [ ] Default Figure 2 structure and notation rules load.
- [ ] Parse table shows line IDs, type, status, normalized rule, and diagnostics.
- [ ] Malformed lines show `fail` with a line-number diagnostic.
- [ ] Elementary division either works under tested semantics or is visibly `blocked`.
- [ ] Results use `L<N> x <count> (Type <type>)`, not `ruleform_N`.
- [ ] Repeated applications are counted.
- [ ] Figure 2 expected maximal set is present.
- [ ] Hub card/nav are re-enabled only after the analyser works in the browser.
- [ ] All smoke test pages show `passed`.
