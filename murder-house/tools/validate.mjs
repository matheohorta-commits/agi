// Structural validation of the Murder House model:
//  - no overlapping parts (the builder records them)
//  - every part is connected (through studs) to the base plates
//  - build order: when a part is placed it must connect to something already built
//  - every part/colour combination exists in the real LEGO catalogue (catalog.js)
import { buildHouse } from '../js/model/house.js';
import { PARTS, part, dims, rotCell, studCells, bottomCells } from '../js/core/parts.js';
import { makeSteps } from '../js/core/steps.js';
import { buildEdges } from '../js/core/connect.js';

const t0 = Date.now();
const mb = buildHouse();
const parts = mb.parts;
console.log(`built ${parts.length} placements in ${Date.now() - t0} ms, ${mb.sections.length} sections`);
let bad = 0;
if (mb.errors.length) { bad += mb.errors.length; console.log(`\n${mb.errors.length} placement errors:`); for (const e of mb.errors.slice(0, 40)) console.log('  ' + e); }

// ---- connectivity
const { edges, looseInserts } = buildEdges(mb);
for (const i of looseInserts) { const q = parts[i]; console.log('  loose insert', q.id, q.x, q.y, q.z); bad++; }
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
const pending = [];
steps.forEach((s, si) => {
  for (const i of s.parts) { added[i] = 1; for (const j of edges[i]) if (added[j]) par[find(i)] = find(j); }
  pending.push(...s.parts);
  // floors laid in "settle" sections only have to hang together once the section is finished
  const nxt = steps[si + 1];
  if (mb.sections[s.sec].settle && nxt && nxt.sec === s.sec) return;
  const root = find(baseIds[0]);
  for (const i of pending.splice(0)) {
    if (find(i) !== root && !parts[i].loose) { orderIssues++; const sn = mb.sections[parts[i].sec].name; (orderBySec[sn] ??= []).push(i); }
  }
});
console.log(`\nbuild order: ${steps.length} steps; ${orderIssues} parts left floating at the end of their step`);
for (const [s, list] of Object.entries(orderBySec)) console.log(`  [${s}] ${list.length}: ` + list.slice(0, 6).map((i) => `${parts[i].id}@${parts[i].x},${parts[i].y},${parts[i].z}`).join(' '));
bad += orderIssues;

// ---- modular floors: each module must hold together on its own and lift off the one below
const modOf = (i) => mb.sections[parts[i].sec].module ?? 'A';
const mods = [...new Set(parts.map((_, i) => modOf(i)))].sort();
for (const m of mods) {
  const list = parts.map((_, i) => i).filter((i) => modOf(i) === m && !(parts[i].id === 'fig'));
  const inM = new Set(list);
  const seenM = new Set();
  const st = [list[0]]; seenM.add(list[0]);
  while (st.length) { const a = st.pop(); for (const b of edges[a]) if (inM.has(b) && !seenM.has(b)) { seenM.add(b); st.push(b); } }
  const loose = list.filter((i) => !seenM.has(i));
  const links = new Set();
  for (const i of list) for (const j of edges[i]) if (!inM.has(j) && parts[j].id !== 'fig') links.add(modOf(j));
  const nLinks = list.reduce((a, i) => a + edges[i].filter((j) => !inM.has(j) && parts[j].id !== 'fig').length, 0);
  console.log(`module ${m}: ${list.length} parts, ${loose.length ? loose.length + ' NOT held by the module itself' : 'holds together'}; ${nLinks} stud links to modules ${[...links].join(',') || '-'}`);
  if (loose.length) { bad += loose.length; const bySecL = {}; for (const i of loose) { const sn = mb.sections[parts[i].sec].name; (bySecL[sn] ??= []).push(i); } for (const [sn, l] of Object.entries(bySecL)) console.log(`   [${sn}] ${l.length}: ` + l.slice(0, 5).map((i) => `${parts[i].id}@${parts[i].x},${parts[i].y},${parts[i].z}`).join(' ')); }
}

// lift-off test: in every column, the parts of a lower module must all be below those of the upper ones
{
  const colSpan = new Map();   // "x,z" -> {mod: [minY, maxY]}
  parts.forEach((q, i) => {
    if (q.id === 'fig' || part(q.id).insert) return;
    const p = part(q.id); const { w, d } = dims(p, q.r); const m = modOf(i);
    const h = q.up ? q.up.h : p.h;
    for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) {
      const k = (q.x + a) + ',' + (q.z + b);
      const e = colSpan.get(k) ?? {}; const s = e[m] ?? [Infinity, -Infinity];
      s[0] = Math.min(s[0], q.y); s[1] = Math.max(s[1], q.y + h); e[m] = s; colSpan.set(k, e);
    }
  });
  let blocked = 0; const ex = [];
  for (const [k, e] of colSpan) {
    const ms = Object.keys(e).sort();
    for (let a = 0; a < ms.length; a++) for (let b = a + 1; b < ms.length; b++) {
      if (e[ms[a]][1] > e[ms[b]][0]) { blocked++; if (ex.length < 12) ex.push(`${k}: ${ms[a]} up to ${e[ms[a]][1]} > ${ms[b]} from ${e[ms[b]][0]}`); }
    }
  }
  console.log(`lift-off: ${blocked} columns where a lower module reaches into a higher one`);
  for (const s of ex) console.log('   ' + s);
  bad += blocked;
}

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
