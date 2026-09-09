# draw-erd

**An ERD is a view, not a source. This renders an existing data model as one
self-contained HTML page — every table a box, every foreign key a crow's-foot edge with
its real cardinality — instead of letting a diagram quietly become a second, driftable
copy of the schema.**

An [agent skill](https://agentskills.io) for Claude Code, Codex, and any other AI coding
agent that reads `SKILL.md`. Hand it a data model document and it draws the diagram: no
mermaid, no d3, no CDN of any kind — one HTML file with inline CSS and about a hundred
lines of JS that measures its own boxes and routes the edges between them, so it opens
from `file://` on a laptop with no network, in five years, unchanged.

This repo's own [commit history](https://github.com/boonkgim/draw-erd/commits/main) *is*
the skill's design record: every commit that shaped it carries the real prompt that drove
the change, in order, from the first version through the project it was built inside. Read
it before you install anything.

## Why you would want this

Ask a coding agent to "draw the schema" without a skill in the way and you get whatever
mermaid or d3 happens to produce that run — auto-layout, a different picture every time,
and no way to tell whether the model changed or just the layout did. This skill draws by
hand, from data it reads off the document rather than infers, and treats the document as
the only source of truth.

- **Hand-placed, not auto-laid-out.** The same model produces the same picture. A redraw
  after a real schema change is a readable diff; a redraw of nothing looks like nothing
  changed, because nothing did.
- **Every mark on the page is a view of the document, never a guess.** Cardinality and
  optionality come off a column's nullability, not judgement. A `contended` or `ledger`
  badge only appears where the document says so. An elided column is announced in a count
  badge, never silently dropped.
- **Three levels of detail, one picture.** The page opens on a keys-only map for reading
  relationships at a glance, and a click expands any table — or every table — to its full
  column list, without redrawing or reflowing anything around it.
- **What happens if I delete this row, answered on the canvas.** A crow's foot has no
  notation for a referential action, so most ERDs drop it. This one puts `RESTRICT` /
  `CASCADE` in the key gutter instead of burying it in a caveat.
- **Verified by geometry, not by eye.** `verify.js` sweeps every level and a large sample
  of mixed states, checking for boxes on top of each other, edges passing under a box, two
  edges drawn along one line, and any name that silently wrapped or clipped — plus a set of
  composition warnings (a stranded leaf, a hub crowded onto one side) that a legality check
  can't catch on its own.
- **Self-contained, forever.** No CDN, no web font, no fetch. The one thing every other
  browser-based ERD tool assumes it can have, this one doesn't need.

## Folder convention

The diagram lives beside the data model it renders, sharing its number:

```
docs/<dated-folder>/
  04-prd.md
  06-data-model.md   <- the input
  06-erd.html        <- same number; this skill's output
```

It's a view of the data model, not new material, so it doesn't take the next free number the
way a new document would. **A correction goes back into the file it corrects** — redrawing
the same model overwrites the same file rather than adding a new one.

## Install

Paste this to your agent:

```
install the skill at https://github.com/boonkgim/draw-erd
```

It clones the repo and puts `SKILL.md` and `template.html` where your tool looks for
skills. To update it later, ask the same way, or `git pull` in the clone.

<details>
<summary>By hand</summary>

```bash
git clone https://github.com/boonkgim/draw-erd.git

# Claude Code
ln -s "$PWD/draw-erd" ~/.claude/skills/draw-erd

# Codex
ln -s "$PWD/draw-erd" ~/.agents/skills/draw-erd
```

Symlink into a project's `.claude/skills/` instead to scope it to one repo. Other tools
read skills from their own location, and some take an upload; check yours.

</details>

A skill is instructions your agent will follow, so read `SKILL.md` before installing this
or any other. It is one file, plus the `template.html` it copies and fills in, and the
`verify.js` sweep it runs against the result.

## Works with

`SKILL.md` follows the [Agent Skills](https://agentskills.io) open standard, so it loads
directly in any agent that reads the format — **Claude Code**, from `~/.claude/skills/`,
**OpenAI Codex**, from `~/.agents/skills/`, and any other tool with its own skills
directory. Where a tool does not read `SKILL.md` natively, paste it into the session or
drop it into the rules file that tool already reads, such as `AGENTS.md`. Nothing in it is
tool-specific — the whole skill is prose, HTML and vanilla JS.

Pairs naturally with [design-db](https://github.com/boonkgim/design-db), which produces
the numbered `NN-data-model.md` this skill reads, but it works against any data model
document written in the same shape — a tables section and a cardinality decision it can
point at.

## Usage

Have a data model document saved somewhere under `docs/<dated-folder>/`. Tools that
support invoking a skill by name take `/draw-erd` directly; otherwise just ask to draw an
ERD, diagram the schema, or "show me the tables and how they relate."

The skill reads the newest dated folder's data model, places every table on a lattice by
adjacency, writes one relationship per foreign key with its cardinality read off the
column's nullability, and fills in `template.html`. It runs `verify.js`'s full sweep, reads
back the failures, warnings and lattice occupancy it returns, then does one critique pass
against a screenshot of both grids before reporting the counts. It never commits — that
stays a decision for whoever owns the run.

If this is useful, a ⭐ helps other people find it.

## When not to use this

- **There's no data model yet.** This skill renders one; it doesn't design one. Use a
  schema-design skill first — [design-db](https://github.com/boonkgim/design-db), or
  whatever your project already has.
- **You want the live schema, auto-discovered.** This skill draws from a document by hand,
  deliberately, so a redraw is a stable diff. A tool that introspects a running database
  and lays itself out is solving a different problem.
- **You want a diagram a non-technical stakeholder edits themselves.** This produces a
  static, self-contained HTML file, not an interactive whiteboard.

## Author

Built by **Khur Boon Kgim** at [boonkgim.com](https://boonkgim.com), where I write about
practical AI for builders: AI agents, coding workflows, and shipping software.

## License

MIT. See [LICENSE](LICENSE).
