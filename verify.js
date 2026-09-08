// draw-erd — geometry sweep and composition check. Paste into the browser console with the
// ERD open, or run it through an evaluate_script tool, and read the result.
//
// Two kinds of finding, and they are not the same kind of thing:
//
//   failures  — the page is WRONG. Boxes on top of each other, an edge under a box, a label
//               over a box, two edges along one line, a name wrapped or clipped. Every one is
//               a defect to fix by MOVING A BOX, never by editing the router. `failures: []`
//               is the only passing result.
//   warnings  — the page is LEGAL but may read badly. A leaf that opened a column of its own,
//               a hub fanning its edges out of one side, a label filling its gutter. Each is a
//               judgement, not a defect: fix it, or keep it and say in the report that you
//               chose it. Never leave one unmentioned.
//
// The sweep drives the page's own state, so it catches what an eye on one screenshot cannot:
// the diagram has three levels per box and two grids, and a box collapsing changes every edge
// anchored to it. Checking only the state you happen to be looking at is checking one of
// thousands. The composition check is the opposite — it is a property of the placement, not of
// the state, so it runs once per grid rather than once per state.
//
// Neither one can see whether the picture reads well. That is the critique pass, and it looks
// at a screenshot, not at this.
//
//   verifyErd()            // three uniform levels + every single-box override + 1000 mixes
//   verifyErd({mixes: 0})  // uniform levels and single-box overrides only, if you are in a hurry

function verifyErd({ mixes = 1000, seed = 20260818 } = {}) {
  const ents = [...document.querySelectorAll('.entity')];
  const LV = ['keys', 'model', 'all'];
  const entry = ents.map(n => n.dataset.lvl);   // put the page back the way it was found
  const canvas = document.getElementById('canvas');

  function problems() {
    const boxes = ents.map(n => ({
      id: n.id.slice(2), x: n.offsetLeft, y: n.offsetTop,
      r: n.offsetLeft + n.offsetWidth, b: n.offsetTop + n.offsetHeight,
    }));
    const bad = [], segs = [];

    // Two boxes on the same ground.
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.r >= c.x && a.x <= c.r && a.b >= c.y && a.y <= c.b)
          bad.push(`BOX ${a.id} overlaps ${c.id}`);
      }

    // A name the reader cannot trust: wrapped onto two lines, or clipped by the box edge.
    for (const n of ents) {
      for (const li of n.querySelectorAll('li')) {
        if (li.offsetParent === null) continue;
        if (li.offsetHeight > 24) bad.push(`WRAP ${n.id.slice(2)} ${li.textContent.trim()}`);
        for (const sp of li.querySelectorAll('.n, .t'))
          if (sp.scrollWidth > sp.clientWidth + 1)
            bad.push(`CLIP ${n.id.slice(2)} ${sp.textContent}`);
      }
      if (n.querySelector('h2').offsetHeight > 36) bad.push(`HEADWRAP ${n.id.slice(2)}`);
    }

    for (const g of document.querySelectorAll('.edge')) {
      const from = g.dataset.from, to = g.dataset.to;
      const pts = g.querySelector('polyline').getAttribute('points').trim()
        .split(/\s+/).map(p => p.split(',').map(Number));
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        if (x1 === x2 && y1 === y2) continue;
        segs.push({ e: `${from}>${to}`, x1, y1, x2, y2 });
        const sx = Math.min(x1, x2), ex = Math.max(x1, x2);
        const sy = Math.min(y1, y2), ey = Math.max(y1, y2);
        for (const bx of boxes) {                     // a line under a box
          if (bx.id === from || bx.id === to) continue;
          if (ex >= bx.x && sx <= bx.r && ey >= bx.y && sy <= bx.b)
            bad.push(`EDGE ${from}>${to} passes under ${bx.id}`);
        }
      }
      const t = g.querySelector('text');              // a label over a box
      if (t) {
        const bb = t.getBBox();
        for (const bx of boxes)
          if (bb.x + bb.width >= bx.x && bb.x <= bx.r && bb.y + bb.height >= bx.y && bb.y <= bx.b)
            bad.push(`LABEL "${t.textContent}" sits on ${bx.id}`);
      }
    }

    // Two edges drawn along the same line read as one edge.
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i], b = segs[j];
        if (a.e === b.e) continue;
        const over = (a1, a2, b1, b2) =>
          Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
        if (a.x1 === a.x2 && b.x1 === b.x2 && Math.abs(a.x1 - b.x1) < 2 &&
            over(a.y1, a.y2, b.y1, b.y2) > 8) bad.push(`OVERLAP ${a.e} & ${b.e}`);
        if (a.y1 === a.y2 && b.y1 === b.y2 && Math.abs(a.y1 - b.y1) < 2 &&
            over(a.x1, a.x2, b.x1, b.x2) > 8) bad.push(`OVERLAP ${a.e} & ${b.e}`);
      }
    return bad;
  }

  // ---- Composition ------------------------------------------------------------------
  // What problems() cannot see: a layout with nothing colliding that still reads badly.
  // `failures: []` says the picture is legal, which is not the same as saying it is the
  // picture you wanted, and the two are easy to confuse when a nudged box has just made
  // the sweep pass. Everything here is a property of the placement, so it runs once per
  // grid — call it in a uniform state, and read `lattice` even when `warnings` is empty.
  function composition(grid) {
    const warn = [], deg = {}, side = {};
    REL.forEach((r, i) => {
      deg[r.from] = (deg[r.from] || 0) + 1;
      deg[r.to] = (deg[r.to] || 0) + 1;
      const [a, b] = SIDES ? SIDES[i] : ['?', '?'];
      (side[r.from] = side[r.from] || []).push(a);
      (side[r.to] = side[r.to] || []).push(b);
    });

    // The lattice, read back off the page: one entry per distinct x (or y), with what sits
    // on it. More entries than the columns you meant to draw means a box is off the grid.
    const axis = prop => {
      const at = new Map();
      for (const n of ents) {
        const v = n[prop];
        if (!at.has(v)) at.set(v, []);
        at.get(v).push(n.id.slice(2));
      }
      return [...at.entries()].sort((p, q) => p[0] - q[0])
        .map(([v, ids]) => `${v}px × ${ids.length}: ${ids.join(', ')}`);
    };
    const columns = axis('offsetLeft'), rows = axis('offsetTop');

    // A leaf — exactly one relationship — is the only box whose cell is not pinned by the
    // intersection of its partners' neighbourhoods. Alone in a column, it has bought that
    // column's full width for one box. That is only a finding if there is somewhere else to
    // put it: an empty cell beside its partner, inside the lattice that already exists, in a
    // different column. A two-box diagram is two leaves with nowhere to go and is not one.
    const xs = [...new Set(ents.map(n => n.offsetLeft))].sort((a, b) => a - b);
    const ys = [...new Set(ents.map(n => n.offsetTop))].sort((a, b) => a - b);
    const at = new Map(), taken = new Set();
    for (const n of ents) {
      const c = [xs.indexOf(n.offsetLeft), ys.indexOf(n.offsetTop)];
      at.set(n.id.slice(2), c);
      taken.add(c.join(','));
    }
    const partners = {};
    for (const r of REL) {
      (partners[r.from] = partners[r.from] || []).push(r.to);
      (partners[r.to] = partners[r.to] || []).push(r.from);
    }
    for (const [name, ax, len] of [['column', 0, xs.length], ['row', 1, ys.length]]) {
      const lanes = new Map();
      for (const [id, c] of at) {
        if (!lanes.has(c[ax])) lanes.set(c[ax], []);
        lanes.get(c[ax]).push(id);
      }
      for (const [lane, ids] of lanes) {
        if (ids.length !== 1 || deg[ids[0]] !== 1) continue;
        const leaf = ids[0], mate = partners[leaf][0], p = at.get(mate);
        let hole = null;
        for (let dc = -1; dc <= 1; dc++)
          for (let dr = -1; dr <= 1; dr++) {
            if (!dc && !dr) continue;
            const c = [p[0] + dc, p[1] + dr];
            if (c[0] < 0 || c[0] >= xs.length || c[1] < 0 || c[1] >= ys.length) continue;
            if (c[ax] === lane || taken.has(c.join(','))) continue;
            hole = c;
          }
        if (hole)
          warn.push(`LEAF ${leaf} is the only box in its ${name} (${grid}) — ` +
                    `cell [col ${hole[0]}, row ${hole[1]}] beside ${mate} is free`);
      }
    }

    // A hub's edges should leave on several sides. `sides()` picks by centre separation, so
    // this is steered by where the partners sit, not by the router: put a partner in the row
    // above and its edge lands on the top, one below and to the side and it lands on the side.
    for (const t of Object.keys(deg)) {
      if (deg[t] < 4) continue;
      const hist = {};
      for (const s of side[t]) hist[s] = (hist[s] || 0) + 1;
      const used = Object.keys(hist).length;
      const most = Math.max(...Object.values(hist));
      if (used < 3 || most > Math.ceil(deg[t] / 2))
        warn.push(`HUB ${t} sends ${deg[t]} edges out of ${used} side(s) ` +
                  `${JSON.stringify(hist)} (${grid}) — spread its partners by compass`);
    }

    // A label is centred on its edge's bend, which lands in a gutter. One filling more than
    // half the corridor it sits in reads as cramped even though nothing collides. A label
    // whose vertical band clears every box is in a row gutter and is not measured.
    const boxes = ents.map(n => ({
      x: n.offsetLeft, y: n.offsetTop,
      r: n.offsetLeft + n.offsetWidth, b: n.offsetTop + n.offsetHeight,
    }));
    for (const g of document.querySelectorAll('.edge')) {
      const t = g.querySelector('text');
      if (!t) continue;
      const bb = t.getBBox(), cx = bb.x + bb.width / 2;
      let left = -Infinity, right = Infinity;
      for (const bx of boxes) {
        if (bb.y + bb.height < bx.y || bb.y > bx.b) continue;   // not beside this box
        if (bx.r <= cx) left = Math.max(left, bx.r);
        if (bx.x >= cx) right = Math.min(right, bx.x);
      }
      if (!isFinite(left) || !isFinite(right)) continue;        // sits in a row gutter
      const corridor = right - left;
      if (bb.width > corridor * 0.5)
        warn.push(`LABEL "${t.textContent}" fills ${Math.round(bb.width / corridor * 100)}% ` +
                  `of its ${Math.round(corridor)}px gutter (${grid}) — shorten it or widen it`);
    }

    return { warn, columns, rows };
  }

  const set = st => { ents.forEach((n, i) => setLevel(n, st[i])); applyLayout(); };
  const failures = [], sizes = {};
  const run = (name, st) => {
    set(st);
    const bad = problems();
    if (bad.length) failures.push(`${name} :: ${[...new Set(bad)].join(' | ')}`);
    return bad;
  };

  for (const l of LV) {
    run(l, ents.map(() => l));
    sizes[l] = { grid: canvas.classList.contains('compact') ? 'compact' : 'detail',
                 w: canvas.style.width, h: canvas.style.height };
  }
  for (const base of LV)
    for (let i = 0; i < ents.length; i++)
      for (const l of LV) {
        const st = ents.map(() => base); st[i] = l;
        run(`${ents[i].id}=${l} on ${base}`, st);
      }
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < mixes; k++) {
    const st = ents.map(() => LV[Math.floor(rnd() * 3)]);
    run(`mix#${k}`, st);
  }

  // Once per grid, in the uniform state each grid is for.
  set(ents.map(() => 'all'));
  const detail = composition('detail');
  set(ents.map(() => 'keys'));
  const compact = composition('compact');

  set(entry);
  const statesTested = 3 + 3 * ents.length * 3 + mixes;
  return { boxes: ents.length, edges: document.querySelectorAll('.edge').length,
           statesTested, sizes, failures,
           warnings: [...detail.warn, ...compact.warn],
           lattice: { detail: { columns: detail.columns, rows: detail.rows },
                      compact: { columns: compact.columns, rows: compact.rows } } };
}

verifyErd();
