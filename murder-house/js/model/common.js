// Shared layout constants and helpers for the Murder House design.
import { part, dims } from '../core/parts.js';
import { disk, ringOf } from '../core/builder.js';

// ---- vertical levels (in plates, 1 brick = 3)
export const Y = {
  base: 0,        // 16x16 base plates: y 0..1
  bsmt: 1,        // module A: basement walls 1..16 (5 courses), tile cap 16..17
  gSlab: 17,      // module B: ground floor slab 17..18
  gWall: 18,      //           floor tiles 18..19, walls 18..39 (7 courses), cap 39..40
  uSlab: 40,      // module C: upper slab 40..41
  uWall: 41,      //           walls 41..59 (6 courses), cap 59..60
  aSlab: 60,      // module D: attic slab, two plate layers 60..62
  eave: 62,       //           roofs start
  terrace: 7,     // front terrace lawn plates 7..8
};

// ---- plan (x = left->right, z = back->front)
export const HX0 = 6, HX1 = 42;          // house x range [6,42)
export const HZ0 = 10, HZF = 29;         // back row / main facade row
export const WA = { x0: 6, x1: 16, zf: 31 };   // left wing (projects to z=31)
export const WC = { x0: 32, x1: 42, zf: 30 };  // right wing (projects to z=30)
export const TUR = { cx: 21, cz: 30, r: 4 };   // turret / stair hall
export const POR = { x0: 26, x1: 32, z0: 30, z1: 34 }; // portico

export const C = {
  brick: 'reddishBrown', trim: 'tan', roof: 'dbg', floor: 'dbg', frame: 'black', wood: 'reddishBrown',
  mottle: 'darkRed', lawn: 'brightGreen', path: 'tan', walk: 'lbg',
};

export const turretDisk = disk(TUR.cx, TUR.cz, TUR.r);
export const turretRing = (() => {
  const s = new Set(turretDisk.map(([x, z]) => x + ',' + z));
  return turretDisk.filter(([x, z]) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (!s.has(x + dx + ',' + (z + dz))) return true;
    return false;
  });
})();
export const turretFront = turretRing.filter(([, z]) => z >= HZF);
export const turretInside = turretDisk.filter(([x, z]) => z >= HZF && !turretRing.some(([a, b]) => a === x && b === z));

export const key = (x, z) => x + ',' + z;
export function cellSet(cells) { return new Set(cells.map(([x, z]) => key(x, z))); }

// exterior wall outline for the ground and upper floors (open back = dollhouse)
export function outline() {
  const cells = [];
  const s = new Set();
  const add = (x, z) => { const k = key(x, z); if (!s.has(k)) { s.add(k); cells.push([x, z]); } };
  for (let z = HZ0; z <= WA.zf; z++) add(WA.x0, z);                 // left wall
  for (let x = WA.x0; x < WA.x1; x++) add(x, WA.zf);                // wing A front
  for (let z = HZF; z <= WA.zf; z++) add(WA.x1 - 1, z);             // wing A return
  add(16, HZF);
  for (const [x, z] of turretFront) add(x, z);                     // turret bay
  for (let x = 25; x < WC.x0; x++) add(x, HZF);                     // facade behind portico
  for (let z = HZF; z <= WC.zf; z++) add(WC.x0, z);                 // wing C return
  for (let x = WC.x0; x < WC.x1; x++) add(x, WC.zf);                // wing C front
  for (let z = HZ0; z <= WC.zf; z++) add(WC.x1 - 1, z);             // right wall
  for (let x = HX0; x < HX1; x++) add(x, HZ0);                      // back wall
  return cells;
}

// all cells inside the house footprint (including walls)
export function footprint() {
  const cells = [];
  const s = new Set();
  const add = (x, z) => { const k = key(x, z); if (!s.has(k)) { s.add(k); cells.push([x, z]); } };
  for (let x = HX0; x < HX1; x++) for (let z = HZ0; z <= HZF; z++) add(x, z);
  for (let x = WA.x0; x < WA.x1; x++) for (let z = HZF; z <= WA.zf; z++) add(x, z);
  for (let x = WC.x0; x < WC.x1; x++) for (let z = HZF; z <= WC.zf; z++) add(x, z);
  for (const [x, z] of turretDisk) if (z >= HZF) add(x, z);
  return cells;
}

// Local frame for small builds (furniture etc.). (x,y,z) = world min corner of the W x D box,
// r = rotation of the whole build (0: its front faces +z, 1: +x, 2: -z, 3: -x)
export class Local {
  constructor(mb, x, y, z, W, D, r = 0) { Object.assign(this, { mb, x, y, z, W, D, r: r & 3 }); }
  map(lx, lz, a, b) {
    const { W, D, r } = this;
    switch (r) {
      case 0: return [lx, lz];
      case 1: return [lz, W - lx - a];
      case 2: return [W - lx - a, D - lz - b];
      default: return [D - lz - b, lx];
    }
  }
  add(id, color, lx, ly, lz, lr = 0, extra = {}) {
    const p = part(id);
    const { w, d } = dims(p, lr);
    const [wx, wz] = this.map(lx, lz, w, d);
    return this.mb.add(id, color, this.x + wx, this.y + ly, this.z + wz, (lr + this.r) & 3, extra);
  }
  // world cells covered by a local rect
  cells(lx, lz, a, b) {
    const [wx, wz] = this.map(lx, lz, a, b);
    const rot = this.r & 1;
    const A = rot ? b : a, B = rot ? a : b;
    const out = [];
    for (let i = 0; i < A; i++) for (let k = 0; k < B; k++) out.push([this.x + wx + i, this.z + wz + k]);
    return out;
  }
}
