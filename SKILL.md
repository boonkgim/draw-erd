---
name: draw-erd
description: Draw the entity-relationship diagram for a nanostore data model as one self-contained HTML page — every table a box, every foreign key a crow's-foot edge with its cardinality and optionality, placed beside the data model it renders. Use when the user asks to draw an ERD, diagram the schema, visualise the data model, or "show me the tables and how they relate". It renders an existing data model; it never designs one — `db-design` decides what is true, and this only draws it.
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

Copy `.claude/skills/draw-erd/template.html` and fill in three things: the `<article
class="entity">` boxes, the `REL` array, and the title / `Not shown` list. The template's CSS
and its ~80 lines of edge-routing JS are the deliverable's whole machinery — read them once,
then leave them alone. It draws orthogonal connectors between the nearest sides of each pair of
boxes, spreads several edges that share a side, and dims everything unrelated while a box is
hovered.

## Procedure

1. Read section 4 and list every table, in the document's dependency order.
2. Place the boxes: parents above and left of the tables that reference them, so foreign keys
   read down and to the right. Coordinates are hand-written `left`/`top` px on each `<article>`
   — a 340px column pitch and a 240px row pitch keeps edges clear of boxes.
3. Write one `REL` entry per foreign key. The **many** end is the table holding the column. The
   optionality is not a judgement call: it is that column's `Null` cell — nullable means
   `optional: true` and a `0..1`/`*` card, not-null means `1`/`1..*`.
4. Open the file in a browser and look at it. Boxes must not sit under an edge, and the
   crossings that remain should be few; if one is ugly, move a box rather than touch the JS.
5. Verify mechanically before returning — see below.

## Do

- **One box per table in section 4, and nothing else.** Same names, same spelling, no plurals
  invented, no join table that the document does not have.
- **Show the keys and the columns that carry an invariant** — `PK`, every `FK`, every unique,
  every nullable timestamp that encodes a lifecycle. Then stop: a box of 20 rows is a table, not
  a diagram.
- **Say what you left out**, in the box's footer (`+4 more columns`) and in the `Not shown`
  panel. An elision that announces itself is a summary; a silent one is a lie.
- **Both ends of every edge carry a cardinality**, including optionality. The interesting half
  of a relationship is usually the `0`.
- **Use the document's semantic types** — `uuid v7`, `int minor`, `timestamptz` — not DDL you
  invented for the picture.
- **Label each relationship with a verb read in one direction**: `workshop —is run as→
  workshop_run`. If no verb fits, the edge is probably two edges.
- **Draw a composite foreign key as one edge**, with the columns listed in the child box. It is
  one reference; two lines would imply two.
- **Show generated or external tables as boundary boxes** — `user` gets its key, its email, and
  a footer saying Better Auth owns it. They are context, not content.
- **Keep the file self-contained.** No CDN, no web font, no fetch. It must open from `file://`
  on a laptop with no network in five years.

## Don't

- **Don't invent a relationship the document does not state.** Two tables that plainly *should*
  relate but don't is a finding — put it in `Not shown` and tell the user. Drawing it makes the
  page a second, wrong specification.
- **Don't reach for mermaid, d3, or any library.** They need a CDN, which breaks `file://` and
  is blocked outright by the artifact CSP. The template's inline JS is the whole dependency.
- **Don't auto-layout.** A hand-placed diagram is stable across redraws — the same model
  produces the same picture, and a diff is readable. Force-directed output is different every
  run and never groups by meaning.
- **Don't draw derived values or "deliberately absent" columns.** `ends_at`, `seats_remaining`
  and a `status` column that the model rejected are not in the database; putting them in a box
  is how they get built.
- **Don't carry meaning in colour alone.** Header tint groups a subject area, and the grouping
  must also be legible from the names and the legend.
- **Don't let a line pass under a box.** Move the box.
- **Don't restate the invariants.** The check predicates, the enforcement ladder and the
  reasoning live in the data model; a diagram that tries to hold them becomes unreadable and
  stale at the same time.
- **Don't write it into `docs/2026-08-08-setup`**, and don't hand-edit a generated file to make
  the picture true.

## Verify

Mechanical, before returning:

```bash
grep -c '<article class="entity"' docs/<folder>/NN-erd.html   # == tables in section 4
grep -o 'FK→[a-z_]*' docs/<folder>/NN-data-model.md | sort | uniq -c   # == one REL entry each
```

Then confirm by eye, in a browser: every box reachable, no edge under a box, the legend matches
the glyphs actually drawn. Report the counts and anything the data model left ambiguous.
