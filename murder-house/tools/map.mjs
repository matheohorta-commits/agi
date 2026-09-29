// Debug: print a top-down map of one plate layer. usage: node tools/map.mjs y [x0 x1 z0 z1]
import { buildHouse } from '../js/model/house.js';
const [y, x0 = 0, x1 = 47, z0 = 0, z1 = 47] = process.argv.slice(2).map(Number);
const mb = buildHouse();
const sym = new Map(); let n = 0;
const ch = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let head = '   '; for (let x = x0; x <= x1; x++) head += x % 10; console.log(head);
for (let z = z0; z <= z1; z++) {
  let s = String(z).padStart(2) + ' ';
  for (let x = x0; x <= x1; x++) {
    const i = mb.occAt(x, y, z);
    if (i === undefined) { s += '.'; continue; }
    if (!sym.has(i)) sym.set(i, ch[n++ % ch.length]);
    s += sym.get(i);
  }
  console.log(s);
}
for (const [i, c] of sym) { const q = mb.parts[i]; console.log(c, q.id, q.c, `@${q.x},${q.y},${q.z} r${q.r}`, mb.sections[q.sec].name); }
