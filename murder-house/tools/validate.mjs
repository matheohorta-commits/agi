// Structural validation of the Murder House model:
//  - no overlapping parts (the builder records them)
//  - every part is connected (through studs) to the base plates
//  - build order: when a part is placed it must connect to something already built
//  - every part/colour combination exists in the real LEGO catalogue (catalog.js)
import { buildHouse } from '../js/model/house.js';
import { PARTS, part, dims, rotCell, studCells, bottomCells } from '../js/core/parts.js';
import { makeSteps } from '../js/core/steps.js';

const t0 = Date.now();
const mb = buildHouse();
const parts = mb.parts;
console.log(`built ${parts.length} placements in ${Date.now() - t0} ms, ${mb.sections.length} sections`);
let bad = 0;
if (mb.errors.length) { bad += mb.errors.length; console.log(`\n${mb.errors.length} placement errors:`); for (const e of mb.errors.slice(0, 40)) console.log('  ' + e); }

// ---- connectivity
const KEY = (x, y, z) => ((x + 64) * 256 + (z + 64)) * 1024 + y;
const studTop = new Map();   // stud at (x, yTop, z) -> part
parts.forEach((q, i) => {
  const p = part(q.id);
  for (const [u, v] of studCells(p)) { const [dx, dz] = rotCell(p, q.r, u, v); studTop.set(KEY(q.x + dx, q.y + p.h, q.z + dz), i); }
});
const edges = parts.map(() => []);
parts.forEach((q, i) => {
  const p = part(q.id);
  for (const [u, v] of bottomCells(p)) {
    const [dx, dz] = rotCell(p, q.r, u, v);
    const j = studTop.get(KEY(q.x + dx, q.y, q.z + dz));
    if (j !== undefined && j !== i) { edges[i].push(j); edges[j].push(i); }
  }
});
// inserts (glass, doors, drawers) are attached to their host frame
const occHost = (q) => {
  for (let j = 0; j < parts.length; j++) { const h = parts[j]; if (h !== q && h.x === q.x && h.y === q.y && h.z === q.z && !part(h.id).insert) return j; }
  // drawers/lids: find the part the insert sits in front of / on top of
  return -1;
};
parts.forEach((q, i) => {
  if (!part(q.id).insert) return;
  let j = occHost(q);
  if (j < 0) {
    // cupboard drawers/doors & chest lids: attach to the part occupying the cell behind/below
    const cands = [[q.x, q.y, q.z - 1], [q.x, q.y - 1, q.z], [q.x + 1, q.y, q.z - 1], [q.x - 1, q.y, q.z], [q.x + 1, q.y, q.z], [q.x, q.y, q.z + 1]];
    for (const [x, y, z] of cands) { const o = mb.occAt(x, y, z); if (o !== undefined) { j = o; break; } }
  }
  if (j >= 0) { edges[i].push(j); edges[j].push(i); } else { console.log('  loose insert', q.id, q.x, q.y, q.z); bad++; }
});
const seen = new Int32Array(parts.length).fill(-1);
let comps = 0;
const sizes = [];
for (let i = 0; i < parts.length; i++) {
  if (seen[i] >= 0) continue;
  const stack = [i]; seen[i] = comps; let n = 0;
  while (stack.length) { const a = stack.pop(); n++; for (const b of edges[a]) if (seen[b] < 0) { seen[b] = comps; stack.push(b); } }
  sizes.push(n); comps++;
}
const main = seen[0];
const floating = parts.map((q, i) => i).filter((i) => seen[i] !== main);
console.log(`\nconnectivity: ${comps} component(s); main = ${sizes[main]} parts; ${floating.length} parts not connected to the base`);
const bySec = {};
for (const i of floating) { const s = mb.sections[parts[i].sec].name; (bySec[s] ??= []).push(i); }
for (const [s, list] of Object.entries(bySec)) {
  console.log(`  [${s}] ${list.length}: ` + list.slice(0, 6).map((i) => `${parts[i].id}@${parts[i].x},${parts[i].y},${parts[i].z}`).join(' '));
}
bad += floating.length;

// ---- build order (steps)
const steps = makeSteps(mb);
const stepOf = new Int32Array(parts.length);
const rank = new Int32Array(parts.length);
let rk = 0;
steps.forEach((s, si) => s.parts.forEach((i) => { stepOf[i] = si; rank[i] = rk++; }));
// after every step, everything built so far must hang together with the base (nothing floats)
let orderIssues = 0;
const orderBySec = {};
const par = new Int32Array(parts.length).map((_, i) => i);
const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
const added = new Uint8Array(parts.length);
const baseIds = parts.map((q, i) => i).filter((i) => parts[i].id === '91405');
for (const b of baseIds) { added[b] = 1; par[find(b)] = find(baseIds[0]); }
for (const s of steps) {
  for (const i of s.parts) { added[i] = 1; for (const j of edges[i]) if (added[j]) par[find(i)] = find(j); }
  const root = find(baseIds[0]);
  for (const i of s.parts) {
    if (find(i) !== root && !parts[i].loose) { orderIssues++; const sn = mb.sections[parts[i].sec].name; (orderBySec[sn] ??= []).push(i); }
  }
}
console.log(`\nbuild order: ${steps.length} steps; ${orderIssues} parts left floating at the end of their step`);
for (const [s, list] of Object.entries(orderBySec)) console.log(`  [${s}] ${list.length}: ` + list.slice(0, 6).map((i) => `${parts[i].id}@${parts[i].x},${parts[i].y},${parts[i].z}`).join(' '));
bad += orderIssues;

// ---- stats
const count = {};
for (const q of parts) {
  if (q.figParts) for (const fp of q.figParts) count[fp.id + '/' + fp.c] = (count[fp.id + '/' + fp.c] || 0) + 1;
  else count[q.id + '/' + q.c] = (count[q.id + '/' + q.c] || 0) + 1;
}
const total = Object.values(count).reduce((a, b) => a + b, 0);
console.log(`\n${total} pieces, ${Object.keys(count).length} distinct part/colour lots`);
let catalog = null;
try { catalog = (await import('../js/core/catalog.js')).CATALOG; } catch { console.log('(no catalog.js yet)'); }
if (catalog) {
  const { COLORS } = await import('../js/core/colors.js');
  let missing = 0;
  for (const k of Object.keys(count)) {
    const [id, c] = k.split('/');
    const e = catalog.parts[id];
    if (!e) { console.log('  not in catalogue:', id); missing++; continue; }
    const rb = COLORS[c].rb;
    if (!e.colors[rb]) { console.log(`  never produced: ${id} ${PARTS[id].name} in ${c} (${count[k]}x)`); missing++; }
  }
  console.log(`catalogue check: ${missing} problems`);
  bad += missing;
}
console.log(bad ? `\nFAIL (${bad} issues)` : '\nOK');
process.exitCode = bad ? 1 : 0;
