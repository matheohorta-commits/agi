// Turn the ordered list of placements into instruction steps (like a LEGO booklet):
// sections are kept in build order; inside a section parts are ordered bottom-up and split into
// steps of a handful of parts, grouped spatially so each step touches one area of the model.
import { part, dims } from './parts.js';

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
