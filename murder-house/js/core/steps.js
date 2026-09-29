// Turn the ordered list of placements into instruction steps (like a LEGO booklet):
// sections are kept in build order; inside a section parts are ordered bottom-up and split into
// steps of a handful of parts, grouped spatially so each step touches one area of the model.
import { part, dims } from './parts.js';
import { buildEdges } from './connect.js';

export function makeSteps(mb) {
  const steps = [];
  const bySec = mb.sections.map(() => []);
  mb.parts.forEach((q, i) => bySec[q.sec].push(i));
  for (const sec of mb.sections) {
    const list = bySec[sec.idx];
    if (!list.length) continue;
    const P = mb.parts;
    // centroid for angular ordering inside a layer
    let cx = 0, cz = 0;
    for (const i of list) { const q = P[i]; const d = dims(part(q.id), q.r); cx += q.x + d.w / 2; cz += q.z + d.d / 2; }
    cx /= list.length; cz /= list.length;
    const ang = (i) => { const q = P[i]; const d = dims(part(q.id), q.r); return Math.atan2(q.z + d.d / 2 - cz, q.x + d.w / 2 - cx); };
    // inserts (glass, doors, drawers) follow their host
    const hosts = new Map();
    const order = list.filter((i) => !part(P[i].id).insert && P[i].follow === undefined);
    for (const i of list) {
      if (P[i].follow !== undefined) { if (!hosts.has(P[i].follow)) hosts.set(P[i].follow, []); hosts.get(P[i].follow).push(i); continue; }
      if (!part(P[i].id).insert) continue;
      let host = -1;
      for (let k = order.length - 1; k >= 0; k--) { const h = P[order[k]]; if (order[k] < i && Math.abs(h.x - P[i].x) <= 1 && Math.abs(h.z - P[i].z) <= 1 && Math.abs(h.y - P[i].y) <= 4) { host = order[k]; break; } }
      if (host < 0) order.push(i); else { if (!hosts.has(host)) hosts.set(host, []); hosts.get(host).push(i); }
    }
    const layerKey = sec.order === 'place' ? (i) => 0 : (i) => P[i].y;
    order.sort((a, b) => (layerKey(a) - layerKey(b)) || (sec.order === 'place' ? a - b : (ang(a) - ang(b)) || (a - b)));
    const max = sec.maxStep ?? 12;
    let cur = null;
    const flush = () => { if (cur && cur.parts.length) steps.push(cur); cur = null; };
    for (const i of order) {
      const group = [i, ...(hosts.get(i) || [])];
      const y = P[i].y;
      const lots = cur ? new Set(cur.parts.map((k) => P[k].id + P[k].c)) : new Set();
      group.forEach((k) => lots.add(P[k].id + P[k].c));
      if (cur && (cur.parts.length + group.length > max || lots.size > 8 || y - cur.y0 > 6)) flush();
      if (!cur) cur = { sec: sec.idx, name: sec.name, bag: sec.bag, view: sec.view, level: sec.level, note: sec.note, parts: [], y0: y };
      cur.parts.push(...group);
    }
    flush();
  }
  settle(mb, steps);
  for (let k = steps.length - 1; k >= 0; k--) if (!steps[k].parts.length) steps.splice(k, 1);
  steps.forEach((s, n) => {
    s.n = n + 1;
    // callout: lots used in this step
    const lots = new Map();
    for (const i of s.parts) {
      const q = mb.parts[i];
      const k = q.id + '|' + q.c + (q.fig ? '|' + q.fig : '');
      lots.set(k, (lots.get(k) || 0) + 1);
    }
    s.lots = [...lots.entries()].map(([k, n]) => { const [id, c, fig] = k.split('|'); return { id, c, n, fig }; });
  });
  return steps;
}

// Never leave a part hanging in mid-air at the end of a step: a part that is not yet held by what has
// been built so far moves on to the first later step where it is (e.g. a floor plate that only gets
// locked in by the wall standing on it).
function settle(mb, steps) {
  const P = mb.parts;
  const { edges } = buildEdges(mb);
  const placed = new Uint8Array(P.length);
  let carry = [];
  for (let si = 0; si < steps.length; si++) {
    const s = steps[si];
    const cand = [...carry, ...s.parts];
    const inCand = new Set(cand);
    const ok = new Set();
    const queue = [];
    for (const i of cand) {
      if (P[i].y === 0 || P[i].loose || P[i].id === 'fig' || edges[i].some((j) => placed[j])) { ok.add(i); queue.push(i); }
    }
    while (queue.length) {
      const a = queue.pop();
      for (const b of edges[a]) if (inCand.has(b) && !ok.has(b)) { ok.add(b); queue.push(b); }
    }
    const keep = [], next = [];
    for (const i of cand) (ok.has(i) ? keep : next).push(i);
    // keep the step's own order, carried parts first
    s.parts = keep;
    for (const i of keep) placed[i] = 1;
    carry = next;
  }
  if (carry.length) steps[steps.length - 1].parts.push(...carry);
}
