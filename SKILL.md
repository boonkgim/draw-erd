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

## Procedure

1. Read section 4 and list every table, in the document's dependency order.
2. **Work out the adjacency before placing anything**: for each table, which tables it shares an
   edge with. A box must end up next to — orthogonally or diagonally — every box it connects to.
   That is what decides the arrangement. Parents above and left of their children is the
   tie-breaker inside it, not the rule: a hub table with five children, or an external table
   referenced from opposite corners, will defeat "above and left". Place it where its edges are
   clean and say in your report that you did.
3. Place the detail grid — hand-written `left`/`top` px on each `<article>`. Column pitch is the
   widest box in that column plus a gutter, and **the gutter must be wider than the longest edge
   label crossing it**: a connector bends at the midpoint between its two boxes, so every lane
   lands in a gutter and every label is centred on one.
4. Put every column of section 4 in its box, each `<li>` marked `data-in`: `k` for the primary
   key, every foreign key and every column in a unique; `m` for the rest of what the data model
   itself puts forward; `a` for everything else.
5. Write one `REL` entry per foreign key — cardinality rule below, self-references excepted.
6. Place the compact grid in `data-compact` when the detail grid runs more than two rows deep;
   shallower than that there is no whitespace to reclaim, and leaving `data-compact` off every
   box is the supported way to skip it. Same tables in the same cells — collapsing should
   tighten the picture, not redraw it — with the pitch taken from the collapsed sizes. Measure
   the narrowest `.canvas.compact .entity` max-width that makes nothing wrap or clip. Do not
   guess it: at 280px this diagram silently rendered `enum` as `enu`.
7. Run `verify.js`, fix what it reports by moving boxes, and then look at the page in a
   browser — in both grids.

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
- **Don't draw derived values or "deliberately absent" columns.** `ends_at`, `seats_remaining`
  and a `status` column that the model rejected are not in the database; putting them in a box
  is how they get built.
- **Don't carry meaning in colour alone.** Header tint groups a subject area, and the grouping
  must also be legible from the names and the legend.
- **Don't let a line pass under a box, and don't let a name wrap or clip.** Move the box, or
  widen the cap. A truncated column name is not a summary; it is a wrong name.
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
from the same directory, since `file://` blocks `fetch`. It drives the page through every
uniform level, every single-box override and a thousand mixed states, checking for boxes on top
of each other, edges under boxes, labels over boxes, two edges drawn along one line, and any
name that wrapped or clipped. `failures: []` is the only passing result.

Report the counts, both canvas sizes, how many states were swept, and anything the data model
left ambiguous.
