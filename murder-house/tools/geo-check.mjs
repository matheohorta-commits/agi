// Build every part geometry in node and report vertex counts / problems
import { PARTS } from '../js/core/parts.js';
import { partGeometry } from '../js/gfx/geometry.js';
let total = 0, bad = 0;
for (const id of Object.keys(PARTS)) {
  const p = PARTS[id];
  if (p.figPart || id === 'fig') continue;
  try {
    const { geo } = partGeometry(id);
    const n = geo.attributes.position.count;
    const arr = geo.attributes.position.array;
    let nan = 0; for (const v of arr) if (!Number.isFinite(v)) nan++;
    const nn = geo.attributes.normal.array; let zero = 0;
    for (let i = 0; i < nn.length; i += 3) if (Math.hypot(nn[i], nn[i + 1], nn[i + 2]) < 0.5) zero++;
    if (nan || zero) { bad++; console.log(id, 'NaN', nan, 'zero normals', zero); }
    total += n;
    if (process.argv[2] === '-v') console.log(id.padEnd(14), n);
  } catch (e) { bad++; console.log(id, 'ERROR', e.message); }
}
console.log('parts ok; total verts over designs', total, 'bad', bad);
// vertex load of the whole model
const { buildHouse } = await import('../js/model/house.js');
const mb = buildHouse();
let load = 0; const per = new Map();
let studs = 0, studsVisible = 0;
for (const q of mb.parts) {
  if (q.id === 'fig' || PARTS[q.id].figPart) continue;
  const g = partGeometry(q.id); const n = g.body.attributes.position.count; load += n; per.set(q.id, (per.get(q.id) || 0) + n);
  const p = PARTS[q.id];
  for (const [sx, , sz] of g.studs) {
    studs++;
    const w = (q.r & 1) ? p.d : p.w, d = (q.r & 1) ? p.w : p.d;
    const c = Math.cos(q.r * Math.PI / 2), s = Math.sin(q.r * Math.PI / 2);
    const wx = q.x + w / 2 + (sx * c + sz * s), wz = q.z + d / 2 + (-sx * s + sz * c);
    if (mb.occAt(Math.floor(wx), q.y + p.h, Math.floor(wz)) === undefined) studsVisible++;
  }
}
console.log('model body vertex load', load, 'studs', studs, 'uncovered', studsVisible);
console.log([...per].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + ':' + v).join(' '));
