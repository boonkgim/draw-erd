// draw-erd — geometry sweep. Paste into the browser console with the ERD open, or run it
// through an evaluate_script tool, and read the result. It returns { failures: [] } when the
// page is clean; anything in `failures` is a defect to fix by MOVING A BOX, never by editing
// the router.
//
// It drives the page's own state, so it catches what an eye on one screenshot cannot: the
// diagram has three levels per box and two grids, and a box collapsing changes every edge
// anchored to it. Checking only the state you happen to be looking at is checking one of
// thousands.
//
//   verifyErd()            // three uniform levels + every single-box override + 1000 mixes
//   verifyErd({mixes: 0})  // uniform levels and single-box overrides only, if you are in a hurry

function verifyErd({ mixes = 1000, seed = 20260818 } = {}) {
  const ents = [...document.querySelectorAll('.entity')];
  const LV = ['keys', 'model', 'all'];
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

  set(ents.map(() => 'model'));
  const statesTested = 3 + 3 * ents.length * 3 + mixes;
  return { boxes: ents.length, edges: document.querySelectorAll('.edge').length,
           statesTested, sizes, failures };
}

verifyErd();
