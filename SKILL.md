---
name: draw-erd
description: Draw the entity-relationship diagram for a nanostore data model as one self-contained HTML page — every table a box, every foreign key a crow's-foot edge with its cardinality and optionality, collapsing to a keys-only map for reading relationships and expanding to every column, placed beside the data model it renders. Use when the user asks to draw an ERD, diagram the schema, visualise the data model, or "show me the tables and how they relate". It renders an existing data model; it never designs one — `db-design` decides what is true, and this only draws it.
---

# draw-erd

The ERD is a **view**, not a source. `NN-data-model.md` decides what is true; this page shows
the shape of it at a glance. When the two disagree the data model wins and the page is
redrawn — never patched to say something the document does not.

## Input

The newest dated folder under `docs/` — its `NN-data-model.md`, section **4. Tables** for the
boxes and section **5. Decisions** (the cardinality decision, usually `DM-9`) for the edges.
Never `docs/2026-08-08-setup`; that is the scaffold's plan of record and `pnpm docs:check`
compares it against the working tree.

If the user names a different folder or asks for the live schema instead, read
`packages/db/src/schema.ts`. If neither exists, stop and say so — do not draw from the PRD.

## Output

`docs/<same-folder>/NN-erd.html`, at the next free number, following the same folder rule as
`db-design`: **a new number is for new material, a correction goes back into the file it
corrects.** Redrawing the same model overwrites the same file. Do not commit — the user or the
`feature` skill decides that.

Copy `.claude/skills/draw-erd/template.html` and fill in four things: the `<article
class="entity">` boxes with every column marked by the level it belongs to, the `REL` array,
the second set of coordinates in `data-compact`, and the title / `Not shown` list. The rest —
the CSS and the JS — is the deliverable's machinery. Read it once, then leave it alone: **every
fix in this skill is a coordinate, never a change to the router.**

What the machinery gives you: orthogonal connectors between boxes, several edges sharing a side
spread along it, everything unrelated dimmed while a box is hovered, and three levels of detail
— keys only, the data model's selection, every column — set for the whole page from the toolbar
or for one table by clicking its name. Collapsing every box moves the diagram onto the second,
tighter grid. Two invariants make that safe, and both must survive any edit:

- **Widths are pinned** at the widest level each grid ever shows, so only heights change and a
  box can never grow into its neighbour.
- **Edge sides are frozen** from the detail geometry, so collapsing a box slides its edges but
  never flips one onto a different side. `sides()` picks by centre separation; unfrozen, a box
  shrinking re-routes edges that were verified in some other state, and a lane that cleared a
  box by a pixel stops clearing it.
- **Edges leaving one side toward one column all bend at the same x, and that is fine.** The
  bend is the midpoint between the two boxes, so a column of boxes with a shared left edge
  gives every one of those edges the same lane. They do not stack, because the slots run down
  the hub's side in `REL` order: order them to match the rows they reach and the top edge
  sweeps up, the bottom edge sweeps down, and the one on the hub's own row is a stub between
  them. **This is the note to re-read before you move a box off the lattice to "avoid a
  collision".** You are not avoiding one; `verify.js` flags a genuine two-edges-on-one-line
  overlap, and if it is silent there is nothing to dodge.

## Procedure

1. Read section 4 and list every table, in the document's dependency order.
2. **Work out the adjacency before placing anything**: for each table, which tables it shares an
   edge with. A box must end up next to — orthogonally or diagonally — every box it connects to.
   That is what decides the arrangement. Parents above and left of their children is the
   tie-breaker inside it, not the rule: a hub table with five children, or an external table
   referenced from opposite corners, will defeat "above and left". Place it where its edges are
   clean and say in your report that you did.
3. **Assign each box a cell — a column index and a row index — and place the hub's partners by
   compass direction, not just by adjacency.** `sides()` sends an edge out of the side whose
   centre separation dominates, so a partner directly above leaves the top, one directly left
   leaves the left, and a *diagonal* partner leaves whichever axis is longer. That is the lever
   for spreading a hub's edges: a table with six relationships should have them leaving on all
   four sides, not fanned out of one. Put the hub's own parent in the row above and it lands on
   the top; put a child in the row below and to the side and it lands on the side. Then read
   the assignment back off the page (`SIDES` after `calibrate()`) rather than assuming it — a
   diagonal decided by a 30px margin is a decision, and it should be one you made.
4. **Place the leaves last, and never let one open a column or a row of its own.** A table
   with exactly one relationship is the only box whose cell is not already decided: every box
   with two or more partners is pinned by the intersection of its partners' neighbourhoods, so
   the leaves are the whole remaining freedom in the layout. Fix everything else first, then
   give each leaf a cell the lattice already has — of the eight cells around its partner, take
   a hole inside the existing columns and rows before taking one that adds a column or a row.
   **A leaf that adds a column buys that column's full width for one box**, and the rest of it
   is the empty region a finished diagram gets asked about. Where two holes qualify, take the
   one that continues the chain in the direction it was already going over the one that doubles
   it back level with where it started — and let that outrank *parents above and left of their
   children*, which is a tie-breaker, and this is not a tie.
5. **Place both grids as a lattice: one x per column, one y per row, and every box on an
   intersection.** Pick the column x from the widest box in that column plus a gutter, and the
   row y from the tallest box in that row plus a gutter, so the gutters are near-constant even
   though the pitch is not. **The gutter must be wider than the longest edge label crossing it,
   with room to spare** — a connector bends at the midpoint between its two boxes, so every lane
   lands in a gutter and every label is centred on one; a label filling more than half its
   gutter reads as cramped even when nothing collides. **Never nudge one box off the lattice.**
   The temptation is real — see the coincident-bend note below — and it is always the wrong fix:
   a single off-grid box is the difference between a diagram that reads as rows and columns and
   one that reads as scatter.
6. Put every column of section 4 in its box, each `<li>` marked `data-in`: `k` for the primary
   key, every foreign key and every column in a unique; `m` for the rest of what the data model
   itself puts forward; `a` for everything else.
7. Write one `REL` entry per foreign key — cardinality rule below, self-references excepted —
   and **order the array so that, on every side that carries more than one edge, the slots run
   in the same top-to-bottom (or left-to-right) order as the boxes they reach.** `draw()` hands
   out slots in `REL` order, so this is the only control you have over which edge sits where on
   a crowded side, and getting it right is what makes the next note true.
8. Place the compact grid in `data-compact` when the detail grid runs more than two rows deep;
   shallower than that there is no whitespace to reclaim, and leaving `data-compact` off every
   box is the supported way to skip it. Same tables in the same cells — collapsing should
   tighten the picture, not redraw it — with the pitch taken from the collapsed sizes. Measure
   the narrowest `.canvas.compact .entity` max-width that makes nothing wrap or clip, measured
   against the widest row any box still shows at `keys` level — usually a long foreign-key or
   composite-key column name. Do not guess it: an overtight cap drops the end of a type or a
   name silently, and a name that lost its last characters is a wrong name, not a short one.
9. Run `verify.js` and read **all three** of the things it returns. `failures` is a defect, and
   is fixed by moving a box, never by editing the router. `warnings` is a layout that is legal
   but may read badly — a leaf alone in a column, a hub fanning its edges out of one side, a
   label filling its gutter — and each one is either fixed, or kept deliberately and named in
   the report. Read `lattice` even when both lists are empty: it prints the occupancy of every
   column and row, and more entries than the columns you meant to draw means a box is off the
   grid.
10. **Critique the render, not the file.** Take a screenshot of both grids and look at them with
   fresh eyes against the checklist in **Verify** — composition only exists in the picture, and
   critiquing the markup you just wrote is critiquing it from inside the choices that made it.
   The critique **reports; it does not edit**: every finding becomes a deliberate coordinate
   change, and `verify.js` runs again after, because a moved box invalidates the whole sweep.
   One round is the budget. This is not how you enforce the rules above — `verify.js` does that,
   and it cannot drift. It is how you find the rule that is not written yet.

## Do

- **One box per table in section 4, and nothing else.** Same names, same spelling, no plurals
  invented, no join table that the document does not have.
- **Every column goes in its box; `data-in` decides when it shows.** The page opens at the data
  model's own selection, so it opens saying what the document says. A box of 20 rows is a table,
  not a diagram — but a column left out of the markup can never be revealed at all.
- **Say what is hidden, and by how much.** The count badge in each header (`6/8`) does that and
  stays true as the level changes. The footer is for constraint notes — unique keys, composite
  FK targets, append-only — never a column count that one click makes wrong.
- **Both ends of every edge carry a cardinality.** The parent end is that column's `Null` cell
  and nothing else: nullable → `0..1` plus `optional: true`, not-null → `1`. The child end is
  `*` unless the model *states* a bound — a unique on the child makes it `0..1`. Do not write
  `1..*`: it claims every parent has at least one child, which a not-null foreign key never says
  and which is usually false. Where the model is silent on a minimum, draw `*` and report it as
  a thing the model does not settle.
- **Use the document's semantic types** — `uuid v7`, `int minor`, `timestamptz` — not DDL you
  invented for the picture.
- **Label each relationship with a verb read in one direction**: `workshop —is run as→
  workshop_run`. If no verb fits, the edge is probably two edges.
- **Draw a composite foreign key as one edge**, its columns as separate rows in the child box and
  the reference named in the footer. It is one reference; two lines would imply two.
- **List a self-reference; do not draw it.** A foreign key to its own table has no second box to
  reach, and the router would strike a line through the one box. Put the column in the box, name
  it in `Not shown`, and say why the edge count is one short of the foreign-key count.
- **Show generated or external tables as boundary boxes** — `class="entity boundary"`, which
  keeps them out of the `<article class="entity"` count, plus `data-nocount` because section 4
  does not list their columns. `user` gets its key, its email, and a footer saying Better Auth
  owns it. They are context, not content.
- **Keep the file self-contained.** No CDN, no web font, no fetch. It must open from `file://`
  on a laptop with no network in five years.

## Don't

- **Don't invent a relationship the document does not state.** Two tables that plainly *should*
  relate but don't is a finding — put it in `Not shown` and tell the user. Drawing it makes the
  page a second, wrong specification.
- **Don't reach for mermaid, d3, or any library.** They need a CDN, which breaks `file://` and
  is blocked outright by the artifact CSP. The template's inline JS is the whole dependency.
- **Don't auto-layout.** A hand-placed diagram is stable across redraws — the same model
  produces the same picture, and a diff is readable. Both grids are placed by hand, for the same
  reason. Force-directed output is different every run and never groups by meaning.
- **Don't let hand-placed become free-placed.** Every box on a column x and a row y: the number
  of distinct `left` values is the number of columns, and one more than that means one box is
  sitting between two of them. `failures: []` does not mean the layout is good — the sweep
  checks that nothing collides, not that anything lines up, and the two are easy to confuse
  when a nudged box has just made the sweep pass.
- **Don't let a leaf define a column or a row.** A column or a row holding exactly one box, when
  that box has one relationship, means the leaf is in the wrong cell — the lattice grew by a
  whole column's width to seat a table that could have hung inside it. `verify.js` warns on this;
  the fix is a hole beside its partner, not a wider canvas.
- **Don't draw derived values or "deliberately absent" columns.** `ends_at`, `seats_remaining`
  and a `status` column that the model rejected are not in the database; putting them in a box
  is how they get built.
- **Don't carry meaning in colour alone.** Header tint groups a subject area, and the grouping
  must also be legible from the names and the legend.
- **Don't let a line pass under a box, and don't let a name wrap or clip.** Move the box, or
  shorten the label, or — last — widen the cap. A truncated column name is not a summary; it is
  a wrong name. Two traps sit under this one, and both are silent:
  - **Any type containing a space wraps inside a box that is wide enough for it.** The row is a
    grid of `30px 1fr auto`; the `1fr` name column takes the slack and squeezes the type column,
    so a type like `→ parent_table`, `uuid v7` or `enum{a, b}` breaks over two lines while the
    box itself measures a comfortable fit. Write every `.t` value with `&nbsp;` in place of its
    spaces — `&rarr;&nbsp;parent_table`, `uuid&nbsp;v7` — and the type becomes one atom the box
    must size around. Do it in the `.t` spans only; footers should still wrap.
  - **The footer sets the box's width.** `width: max-content` takes the widest child, and a
    long `<p>` is wider than any row, so a two-line constraint note silently pushes the box to
    the cap. Keep footers short, or accept the cap deliberately for the one or two boxes whose
    references genuinely need spelling out.
- **Prefer a shorter honest label to a wider cap.** One over-long row is usually one label that
  could be shorter without saying less — a self-reference written `→ self` rather than repeating
  the table's own name, a value list moved out of the type cell and into the footer. Raising the
  cap for it widens every box already at the cap, and the canvas with them, and it turns a
  coordinate fix into a CSS fix. Widen the cap only when no honest label fits.
- **Don't verify the state you happen to be looking at.** Eleven boxes at three levels is
  thousands of geometries, and the one that breaks is not the one on screen. Sweep them.
- **Don't restate the invariants.** The check predicates, the enforcement ladder and the
  reasoning live in the data model; a diagram that tries to hold them becomes unreadable and
  stale at the same time.
- **Don't write it into `docs/2026-08-08-setup`**, and don't hand-edit a generated file to make
  the picture true.

## Verify

Counts first:

```bash
grep -c '<article class="entity"' docs/<folder>/NN-erd.html   # == tables in section 4
grep -c '<li data-in='            docs/<folder>/NN-erd.html   # == columns in section 4 + boundary rows
grep -o 'FK→[a-z_]*' docs/<folder>/NN-data-model.md | sort | uniq -c   # one REL entry each
```

The last one over-counts — section 4's type legend and section 6's restatements match the same
pattern, and composite keys are written `FK (a, b) → …` instead — so reconcile it by hand and
show the reconciliation. Edges = foreign keys − self-references, composites counted once.

Then the geometry, which is not an eyeball job. Open the page and run
`.claude/skills/draw-erd/verify.js`: paste it into the console, or load it with a `<script src>`
(a relative path out of `docs/` works — `file://` blocks `fetch`, not `<script>`). It returns
three things:

- **`failures`** — the sweep. Every uniform level, every single-box override and a thousand
  mixed states, checking for boxes on top of each other, edges under boxes, labels over boxes,
  two edges drawn along one line, and any name that wrapped or clipped. **`failures: []` is the
  only passing result**, and every entry is fixed by moving a box.
- **`warnings`** — the composition check, run once per grid rather than once per state, because
  it is a property of the placement. A leaf alone in a column or a row; a box with four or more
  edges sending them out of fewer than three sides, or more than half out of one; a label
  filling more than half the corridor it sits in. A warning is a judgement, not a defect: fix
  it, or keep it and say in the report that you chose it. Never leave one unmentioned.
- **`lattice`** — the occupancy of every column and row in both grids, read back off the page.
  Check it even when the other two are empty: it is the only thing that shows a box sitting
  between two columns rather than on one.

Then the critique pass, once, against a screenshot of each grid — because a warning can only
catch what someone already thought to write down:

- Is there a dead region, and is it dead because the model has nothing there or because a box
  is in the wrong cell?
- Does each chain step in one direction, or does one double back level with where it started?
- Do the subject-area groups read as groups from the arrangement, not just from the colour?
- Are two boxes sitting next to each other with no edge in a way that implies one?
- Is anything cramped that the pixel checks called legal?

Findings become deliberate coordinate changes, and then `verify.js` runs again — a moved box
invalidates every state the sweep just cleared.

Report the counts, both canvas sizes, how many states were swept, every warning and whether it
was fixed or kept on purpose, what the critique round found, and anything the data model
left ambiguous. Report the layout as a lattice too — how many distinct column x values and row y
values the boxes occupy. **If those two numbers are larger than the number of columns and rows
you meant to draw, a box is off the grid**, and no amount of `failures: []` makes that the
picture you wanted:

```bash
grep -o 'style="left:[0-9]*px' docs/<folder>/NN-erd.html | sort | uniq -c   # boxes per column
grep -o 'px; top:[0-9]*px'     docs/<folder>/NN-erd.html | sort | uniq -c   # boxes per row
```

`uniq -c` rather than `sort -u | wc -l`, because the count of lines is the number of columns and
the counts *within* them are the occupancy — and a `1` there is the leaf check by hand: cross it
against the box's `REL` entries, and a column holding one box that has one relationship is a box
in the wrong cell. `verify.js`'s `lattice` prints the same thing with the names filled in.

Anchor the patterns like that: a bare `top:[0-9]*px` also matches the legend's inline
`margin-top`, and a lattice that looks one row too tall is a scare, not a finding.
