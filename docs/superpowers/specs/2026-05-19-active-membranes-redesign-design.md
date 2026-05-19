# Active Membranes Redesign Design

## Goal

Redesign `active-membranes.html` into a rigorous notation-first one-step analyser for P systems with active membranes.

The tool should be formally accurate even when narrow. It must not silently approximate unsupported semantics. The first implementation target is a reliable one-step analyser, not the full interactive timestep tree from `TODO.md`.

## Scope

In scope:

- Keep the project as static HTML, CSS, and JavaScript.
- Keep the visual membrane structure editor for the initial configuration.
- Replace the current rule-form UI with standard mathematical notation input.
- Show rule examples directly beside the editor so users can copy the accepted patterns.
- Parse one rule per non-empty line from a single large textbox.
- Show per-line parser status before analysis.
- Run exact one-step maximally parallel analysis when all active rule lines are valid and supported.
- Count repeated rule applications where resources permit repeated use.
- Use stable line-based rule identifiers in results, such as `L1 x 2 (Type a)`.
- Preserve the Figure 2 active-membrane example as the default page state.
- Keep the internal state model ready for future timestep branching.

Out of scope for this pass:

- Astro, React, or other framework migration.
- Interactive multi-step result tree from `t = 0` to later timesteps.
- URL sharing for active membrane configurations.
- Site-wide redesign beyond re-enabling the tool when it is reliable.

## Page Flow

Use the top-to-bottom pipeline layout:

1. **Membrane structure**
   - Existing visual membrane editor.
   - Membrane IDs, charges, parent/child nesting, and initial objects remain editable.

2. **Rule notation examples**
   - A read-only block shows the supported standard patterns:

```text
(a) Evolution:
[h a -> v]h^alpha

(b) Send-in:
a [h]^alpha -> [h b]^beta

(c) Send-out:
[h a]^alpha -> [h]^beta b

(d) Dissolution:
[h a]^alpha -> b

(e) Elementary division:
[h a]^alpha -> [h b]^beta [h c]^gamma

(f) Non-elementary division:
[h [g1]^c1 [g2]^c2 ...]^alpha -> [h [g_set1]...]^beta [h [g_set2]...]^gamma
```

   - Concrete editable examples should use `+`, `-`, and `0` for charges. Greek letters are explanatory placeholders only.
   - Examples should use concrete rules from the default Figure 2 example where possible.

3. **Rules textbox**
   - One large editable textarea.
   - One non-empty line is one rule.
   - Lines starting with `#` are comments and ignored by analysis.
   - Whitespace is flexible around brackets, arrows, and charge markers.

4. **Parse results**
   - A table appears before analysis.
   - Each non-comment line has:
     - line number;
     - original text;
     - detected rule type `(a)`-`(f)`;
     - normalized/pretty notation;
     - status: `pass`, `fail`, or `blocked`;
     - diagnostic message.
   - The analysis button is disabled, or analysis stops early, if any line is `fail` or `blocked`.

5. **One-step analysis results**
   - Results are labelled as `t = 0` choices.
   - Each maximal set shows rule line IDs and application counts.
   - Each result should be expandable or readable enough to inspect the original notation for each line.
   - Empty result states distinguish:
     - no valid rules;
     - no applicable rules;
     - parse errors;
     - blocked unsupported semantics.

## Rule Grammar

The parser should recognise these standard active-membrane forms:

### `(a)` Evolution

```text
[h a -> v]h^alpha
```

Meaning:

- target membrane label `h`;
- target membrane must have charge `alpha`;
- consume object multiset `a` inside `h`;
- produce multiset `v` inside `h`;
- optional final charge if the implementation supports the notation variant that changes charge.

### `(b)` Send-in

```text
a [h]^alpha -> [h b]^beta
```

Meaning:

- membrane `h` must have charge `alpha`;
- consume object `a` from the parent region;
- produce object or multiset `b` inside `h`;
- set membrane `h` charge to `beta`;
- this is exclusive on membrane `h` for the step.

### `(c)` Send-out

```text
[h a]^alpha -> [h]^beta b
```

Meaning:

- membrane `h` must have charge `alpha`;
- consume object `a` inside `h`;
- produce object or multiset `b` in the parent region;
- set membrane `h` charge to `beta`;
- this is exclusive on membrane `h` for the step.

### `(d)` Dissolution

```text
[h a]^alpha -> b
```

Meaning:

- membrane `h` must have charge `alpha`;
- consume object `a` inside `h`;
- dissolve membrane `h`;
- release produced multiset `b`, remaining objects, and children according to the active-membrane model used by the page;
- this is exclusive on membrane `h` for the step.

### `(e)` Elementary Division

```text
[h a]^alpha -> [h b]^beta [h c]^gamma
```

Meaning:

- membrane `h` must be elementary: it has no child membranes.
- membrane `h` must have charge `alpha`;
- consume object `a` inside `h`;
- replace the original membrane with two childless membranes using the result labels and charges from the right-hand side;
- copy the original membrane contents, after consuming `a`, into both result membranes;
- add multiset `b` to the first result membrane and multiset `c` to the second result membrane;
- this is exclusive on membrane `h` for the step.

The parser must recognise and preview this form. If full `(e)` transition semantics are not completed in the first implementation pass, `(e)` must be reported as `blocked`, not approximated.

### `(f)` Non-elementary Division

```text
[h [g1]^c1 [g2]^c2 ...]^alpha -> [h [g_set1]...]^beta [h [g_set2]...]^gamma
```

Meaning:

- outer membrane `h` must have charge `alpha`;
- listed inner membranes must be direct children with the required charges;
- the rule is exclusive on outer membrane `h` and all inner membranes participating in the division;
- replace the original outer membrane with two outer membranes whose contents are copied from the original outer region;
- distribute the listed child membranes into the two resulting structures according to the right-hand side, applying the right-hand charge updates;
- support at least the structural applicability needed by the Figure 2 example.

## Multisets

The parser should support compact multiset forms consistently across object positions:

- `a` means one copy of `a`;
- `a^2` is the canonical rule-text notation for two copies of `a`;
- `lambda` is the canonical empty multiset in editable examples and normalized preview;
- `a:2` can remain supported in the visual membrane-object editor for compatibility with the existing page, but the rule textbox should normalize examples toward `a^2`.

The implementation should avoid ad hoc string splitting for the full parser. A small tokenizer plus rule-specific parsers is preferred because bracket nesting matters for division rules.

## Analysis Model

The analyser performs exact one-step maximally parallel analysis:

- It enumerates all applicable rule multisets from the current initial configuration.
- It accounts for object consumption, so repeated applications are counted only when resources permit them.
- It respects membrane exclusivity constraints for `(b)`-`(f)`.
- It treats charge and structural preconditions as applicability constraints.
- It filters out non-maximal sets: if another compatible set can strictly add applications, the smaller set is not maximal.

The result of analysis should include enough structured information to become a future timestep tree node:

```text
configurationBefore
appliedRuleCounts
configurationAfter
diagnostics
```

The first pass may render only `configurationBefore` and `appliedRuleCounts`, but the internal shape should not prevent successor-state rendering later.

## Error Handling

Parser and analysis errors should be explicit and local:

- Invalid syntax reports the line number and the nearest expected pattern.
- Unknown membrane label reports the rule line and missing membrane ID.
- Charge mismatch is an applicability issue, not a parse error.
- Unsupported semantics report `blocked`, not `fail`.
- Analysis does not run if blocked rules are present.
- The log panel can remain, but primary feedback should appear in the parse table and results area.

## Default Example

The default page state should load the known Figure 2 active-membrane worked example:

- visual membrane structure as currently loaded by `loadExampleFromScreenshotVisual()`;
- the same example rules written in standard notation in the textbox;
- expected maximal sets preserved by regression tests.

Result labels should refer to text lines, not old form IDs. For example:

```text
L1 x 1 (Type b)
L2 x 1 (Type b)
L3 x 1 (Type f)
```

## Testing

Keep lightweight browser/static tests. Required coverage:

- parser accepts all six standard rule patterns;
- parser rejects malformed lines with useful line diagnostics;
- comment and blank lines do not create rules;
- Figure 2 maximal sets remain present;
- repeated rule applications produce counts greater than one where resources allow;
- blocked `(e)` behaviour is tested if full semantics are deferred;
- full `(e)` elementary division semantics are tested before marking `(e)` supported.

`tests/revision-examples-smoke.html` can remain the quick regression entry point, but parser-specific tests should be added rather than only testing `formal-step.js` directly.

## Implementation Notes

Recommended implementation approach:

- Keep the current static page shell and visual editor.
- Add a parser module, for example `active-membrane-parser.js`.
- Add an analysis/transition module, or extend `formal-step.js` carefully if that remains the shared one-step enumerator.
- Convert parsed rules into a formal rule representation with stable IDs based on source line numbers.
- Render parse feedback and analysis results from structured data, not raw parser strings.

Avoid:

- reintroducing one form per rule type;
- silently accepting ambiguous notation;
- using `ruleform_N` identifiers in user-facing output;
- mixing parse errors with runtime applicability failures.
