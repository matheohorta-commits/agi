// ModelBuilder: places real LEGO parts on a stud grid and keeps an occupancy map so that
// nothing overlaps, walls get a proper running bond, floors get staggered seams, etc.
//
// World grid:  x = studs (left -> right), z = studs (back -> front / street), y = plates (up)
import { part, dims, rotCell, studCells, bottomCells } from './parts.js';
import { CATALOG } from './catalog.js';
import { COLORS } from './colors.js';

// was this part ever produced in this colour? (checked against the Rebrickable catalogue)
export function avail(id, color) {
  const e = CATALOG.parts[id];
  if (!e) return true;                 // not in the catalogue file (yet): don't block
  const c = e.colors[COLORS[color]?.rb];
  return !!c && c[2] > 0;
}

const KEY = (x, y, z) => ((x + 64) * 256 + (z + 64)) * 1024 + y;

// Tiny deterministic RNG so the model is the same on every load
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BRICK_LENGTHS = { 1: '3005', 2: '3004', 3: '3622', 4: '3010', 6: '3009', 8: '3008' };
export const PLATE_1 = { 1: '3024', 2: '3023', 3: '3623', 4: '3710', 6: '3666', 8: '3460', 10: '4477', 12: '60479' };
export const TILE_1 = { 1: '3070b', 2: '3069b', 3: '63864', 4: '2431', 6: '6636', 8: '4162' };
// [w, d, id] (w >= d), biggest first
export const PLATES = [
  [16, 16, '91405'], [16, 8, '92438'], [8, 8, '41539'], [12, 6, '3028'], [10, 6, '3033'], [8, 6, '3036'],
  [6, 6, '3958'], [12, 4, '3029'], [10, 4, '3030'], [8, 4, '3035'], [6, 4, '3032'], [4, 4, '3031'],
  [16, 2, '4282'], [14, 2, '91988'], [12, 2, '2445'], [10, 2, '3832'], [8, 2, '3034'], [6, 2, '3795'],
  [4, 2, '3020'], [3, 2, '3021'], [2, 2, '3022'],
  [12, 1, '60479'], [10, 1, '4477'], [8, 1, '3460'], [6, 1, '3666'], [4, 1, '3710'], [3, 1, '3623'], [2, 1, '3023'], [1, 1, '3024'],
];
export const TILES = [
  [6, 2, '69729'], [4, 2, '87079'], [3, 2, '26603'], [2, 2, '3068b'],
  [8, 1, '4162'], [6, 1, '6636'], [4, 1, '2431'], [3, 1, '63864'], [2, 1, '3069b'], [1, 1, '3070b'],
];

export class ModelBuilder {
  constructor(seed = 1120) {
    this.parts = [];
    this.sections = [];
    this.occ = new Map();       // cell -> part index
    this.studs = new Map();     // top-of-stud cell (x, yTop, z) -> part index
    this.cur = null;
    this.rand = rng(seed);
    this.errors = [];
    this.figs = [];
    this.reserved = new Set();
  }

  // keep cells free for later (minifig spots, stair wells...)
  reserve(cells, y0, y1) { for (const [x, z] of cells) for (let y = y0; y < y1; y++) this.reserved.add(KEY(x, y, z)); }
  unreserve(cells, y0, y1) { for (const [x, z] of cells) for (let y = y0; y < y1; y++) this.reserved.delete(KEY(x, y, z)); }

  // A section is a named chunk of the build that becomes one or more instruction steps
  section(name, opts = {}) {
    const s = { name, idx: this.sections.length, bag: opts.bag ?? this.cur?.bag ?? 1, view: opts.view ?? this.cur?.view ?? 'front',
      level: opts.level ?? this.cur?.level ?? 'base', maxStep: opts.maxStep ?? 12, sub: opts.sub ?? null, note: opts.note ?? null,
      order: opts.order ?? 'layer', module: opts.module ?? this.cur?.module ?? 'A', settle: opts.settle ?? false };
    this.sections.push(s);
    this.cur = s;
    return s;
  }

  // switch back to an earlier section (e.g. lay a floor around furniture that was placed first)
  use(sec) { this.cur = sec; return sec; }

  occAt(x, y, z) { return this.occ.get(KEY(x, y, z)); }
  isFreeCell(x, y, z) { const k = KEY(x, y, z); return !this.occ.has(k) && !this.reserved.has(k); }

  cells(id, x, y, z, r) {
    const p = part(id);
    const { w, d } = dims(p, r);
    const out = [];
    for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) out.push([x + i, z + k]);
    return { out, h: p.h };
  }

  fits(id, x, y, z, r = 0) {
    const p = part(id);
    if (p.insert) return true;
    const { out, h } = this.cells(id, x, y, z, r);
    for (const [cx, cz] of out) for (let j = 0; j < h; j++) { const k = KEY(cx, y + j, cz); if (this.occ.has(k) || this.reserved.has(k)) return false; }
    return true;
  }

  // Place one part. (x, z) = min corner of its (rotated) footprint, y = bottom in plates.
  add(id, color, x, y, z, r = 0, extra = {}) {
    const p = part(id);
    if (!p.insert && !this.fits(id, x, y, z, r)) {
      const who = [];
      const { out, h } = this.cells(id, x, y, z, r);
      for (const [cx, cz] of out) for (let j = 0; j < h; j++) { const o = this.occ.get(KEY(cx, y + j, cz)); if (o !== undefined) who.push(o); }
      const other = this.parts[who[0]];
      this.errors.push(other ? `overlap: ${id} ${color} @${x},${y},${z} r${r} [${this.cur?.name}] hits ${other.id} @${other.x},${other.y},${other.z} [${this.sections[other.sec].name}]`
        : `reserved: ${id} ${color} @${x},${y},${z} r${r} [${this.cur?.name}]`);
      if (!extra.force) return -1;
    }
    const idx = this.parts.length;
    const rec = { id, c: color, x, y, z, r: r & 3, sec: this.cur ? this.cur.idx : 0, ...extra };
    this.parts.push(rec);
    if (!p.insert) {
      const { out, h } = this.cells(id, x, y, z, r);
      for (const [cx, cz] of out) for (let j = 0; j < h; j++) this.occ.set(KEY(cx, y + j, cz), idx);
    }
    for (const [u, v] of studCells(p)) {
      const [dx, dz] = rotCell(p, r, u, v);
      this.studs.set(KEY(x + dx, y + p.h, z + dz), idx);
    }
    return idx;
  }

  // Build something only if it fits: run fn(); if it caused any overlap, take all of it out again.
  tryBuild(fn) {
    const n0 = this.parts.length, e0 = this.errors.length;
    try { fn(); } catch { this.errors.push('tryBuild threw'); }
    if (this.errors.length === e0) return true;
    for (let i = this.parts.length - 1; i >= n0; i--) {
      const q = this.parts[i], p = part(q.id);
      if (!p.insert) {
        if (q.up) { for (const [k, v] of this.occ) if (v === i) this.occ.delete(k); }
        else { const { out, h } = this.cells(q.id, q.x, q.y, q.z, q.r); for (const [cx, cz] of out) for (let j = 0; j < h; j++) { const k = KEY(cx, q.y + j, cz); if (this.occ.get(k) === i) this.occ.delete(k); } }
      }
      for (const [u, v] of studCells(p)) { const [dx, dz] = rotCell(p, q.r, u, v); const k = KEY(q.x + dx, q.y + p.h, q.z + dz); if (this.studs.get(k) === i) this.studs.delete(k); }
    }
    this.parts.length = n0;
    this.errors.length = e0;
    this.figs = this.figs.filter((f) => f < n0);
    return false;
  }

  tryAdd(id, color, x, y, z, r = 0, extra = {}) {
    return this.fits(id, x, y, z, r) ? this.add(id, color, x, y, z, r, extra) : -1;
  }

  // does something below provide a stud for a part at (x,y,z)?
  supported(id, x, y, z, r = 0) {
    const p = part(id);
    for (const [u, v] of bottomCells(p)) {
      const [dx, dz] = rotCell(p, r, u, v);
      if (this.studs.has(KEY(x + dx, y, z + dz))) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ walls
  // Fill one brick course (3 plates tall) at height y over the cells in `mask` (array of [x,z]),
  // skipping cells already occupied (windows, doors...). Runs are split with a dynamic program
  // that avoids putting a vertical joint straight above a joint of the course below.
  course(mask, y, color, opts = {}) {
    const prefer = opts.prefer ?? (Math.round(y / 3) % 2 === 0 ? 'x' : 'z');
    const texture = opts.texture ?? null;   // {color, chance} -> some 1x2 become masonry bricks
    const lengths = opts.lengths ?? [8, 6, 4, 3, 2, 1];
    const free = new Set();
    const partial = [];
    for (const [x, z] of mask) {
      let f = 0;
      for (let j = 0; j < 3; j++) if (this.isFreeCell(x, y + j, z)) f++;
      if (f === 3) free.add(x + ',' + z);
      else if (f > 0) partial.push([x, z]);
    }
    const has = (x, z) => free.has(x + ',' + z);
    const take = (x, z) => free.delete(x + ',' + z);
    const runs = [];
    const scan = (axis, minLen) => {
      const cellsList = [...free].map((s) => s.split(',').map(Number));
      cellsList.sort((a, b) => (axis === 'x' ? (a[1] - b[1]) || (a[0] - b[0]) : (a[0] - b[0]) || (a[1] - b[1])));
      for (const [x, z] of cellsList) {
        if (!has(x, z)) continue;
        // start of a run?
        const px = axis === 'x' ? x - 1 : x, pz = axis === 'x' ? z : z - 1;
        if (has(px, pz)) continue;
        const run = [];
        let cx = x, cz = z;
        while (has(cx, cz)) { run.push([cx, cz]); if (axis === 'x') cx++; else cz++; }
        if (run.length >= minLen) { runs.push({ axis, cells: run }); run.forEach(([a, b]) => take(a, b)); }
      }
    };
    const other = prefer === 'x' ? 'z' : 'x';
    scan(prefer, 2);
    scan(other, 2);
    scan(prefer, 1);
    const colAt = typeof color === 'function' ? color : () => color;
    for (const run of runs) {
      // split runs where the colour changes (stone trim, quoins...)
      let start = 0;
      for (let i = 1; i <= run.cells.length; i++) {
        if (i === run.cells.length || colAt(run.cells[i][0], y, run.cells[i][1]) !== colAt(run.cells[start][0], y, run.cells[start][1])) {
          const cells = run.cells.slice(start, i);
          this._fillRun({ axis: run.axis, cells }, y, colAt(cells[0][0], y, cells[0][1]), lengths, texture, opts);
          start = i;
        }
      }
    }
    // cells with only part of the course free -> runs of plates, one plate level at a time
    for (let j = 0; j < 3; j++) {
      const lvl = partial.filter(([x, z]) => this.isFreeCell(x, y + j, z));
      if (!lvl.length) continue;
      const set = new Set(lvl.map(([x, z]) => x + ',' + z));
      const done = new Set();
      const sorted = lvl.slice().sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
      for (const [x, z] of sorted) {
        if (done.has(x + ',' + z)) continue;
        const col = colAt(x, y, z);
        let n = 0;
        while (set.has((x + n) + ',' + z) && !done.has((x + n) + ',' + z) && colAt(x + n, y, z) === col) n++;
        let m = 0;
        while (set.has(x + ',' + (z + m)) && !done.has(x + ',' + (z + m)) && colAt(x, y, z + m) === col) m++;
        const [axis, len] = n >= m ? ['x', n] : ['z', m];
        this.line(x, y + j, z, len, axis, col);
        for (let i = 0; i < len; i++) done.add(axis === 'x' ? (x + i) + ',' + z : x + ',' + (z + i));
      }
    }
  }

  _fillRun(run, y, color, lengths, texture, opts) {
    lengths = lengths.filter((L) => avail(BRICK_LENGTHS[L], color));
    const cells = run.cells;
    const n = cells.length;
    const below = cells.map(([x, z]) => this.occAt(x, y - 1, z));
    // joint[i] = true if there is a joint below between cell i-1 and i
    const joint = new Array(n + 1).fill(false);
    for (let i = 1; i < n; i++) joint[i] = below[i - 1] !== undefined && below[i] !== undefined && below[i - 1] !== below[i];
    const best = new Array(n + 1).fill(Infinity), from = new Array(n + 1).fill(-1);
    best[0] = 0;
    for (let i = 0; i < n; i++) {
      if (best[i] === Infinity) continue;
      for (const L of lengths) {
        if (i + L > n) continue;
        let c = 1 + (L === 1 ? 0.7 : 0) + (L === 3 ? 0.1 : 0) + this.rand() * 0.15;
        if (i + L < n && joint[i + L]) c += 2.5;
        if (opts.maxLen && L > opts.maxLen) c += 5;
        if (best[i] + c < best[i + L]) { best[i + L] = best[i] + c; from[i + L] = i; }
      }
    }
    const segs = [];
    for (let k = n; k > 0; k = from[k]) segs.push([from[k], k]);
    segs.reverse();
    for (const [a, b] of segs) {
      const L = b - a;
      const [x, z] = cells[a];
      const r = run.axis === 'x' ? 0 : 1;
      // rotated 1xL brick along z: footprint min corner is the first cell
      let id = BRICK_LENGTHS[L], col = color;
      if (texture && L === 2 && col === texture.on && this.rand() < texture.chance) { id = texture.id || '98283'; col = texture.color; }
      else if (opts.masonry && L === 2) id = '98283';
      this.add(id, col, x, y, z, r);
    }
  }

  // Build `courses` brick courses of a wall mask (function or array) starting at y0
  wall(mask, y0, courses, color, opts = {}) {
    for (let k = 0; k < courses; k++) {
      const m = typeof mask === 'function' ? mask(k, y0 + 3 * k) : mask;
      this.course(m, y0 + 3 * k, color, opts);
    }
  }

  // ------------------------------------------------------------------ plates / tiles
  // Cover the free cells of `mask` at height y (1 plate) with the biggest plates (or tiles) that fit.
  // mask: array of [x,z] or {x0,z0,x1,z1} rectangle (x1/z1 exclusive).
  fill(mask, y, color, opts = {}) {
    const list = (opts.sizes ?? (opts.tiles ? TILES : PLATES)).filter((s) => !opts.maxW || Math.max(s[0], s[1]) <= opts.maxW);
    const cells = Array.isArray(mask) ? mask : rectCells(mask);
    const want = new Set();
    for (const [x, z] of cells) if (this.isFreeCell(x, y, z)) want.add(x + ',' + z);
    const has = (x, z) => want.has(x + ',' + z);
    const sorted = [...want].map((s) => s.split(',').map(Number)).sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
    const colorFn = typeof color === 'function' ? color : () => color;
    const fitsAt = (x, z, w, d) => { for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) if (!has(x + i, z + k)) return false; return true; };
    if (opts.global) {
      // repeatedly place the biggest supported plate anywhere; slabs then rest on the walls below
      for (;;) {
        let best = null;
        const cellsLeft = [...want].map((s) => s.split(',').map(Number)).sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
        if (!cellsLeft.length) break;
        for (const [W, D, id] of list) {
          if (best && W * D < best.area) break;
          for (const [w, d, r] of (W === D ? [[W, D, 0]] : [[W, D, 0], [D, W, 1]])) {
            for (const [x, z] of cellsLeft) {
              if (!fitsAt(x, z, w, d)) continue;
              if (!avail(id, colorFn(x, z, w, d))) continue;
              if (!this._rectSupported(x, y, z, w, d)) continue;
              best = { x, z, w, d, r, id, area: W * D };
              break;
            }
            if (best) break;
          }
          if (best) break;
        }
        if (!best) break;
        const { x, z, w, d, r, id } = best;
        this.add(id, colorFn(x, z, w, d), x, y, z, r);
        for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) want.delete((x + i) + ',' + (z + k));
      }
    }
    for (const [x, z] of sorted) {
      if (!has(x, z)) continue;
      let pick = null, fallback = null;
      for (const [W, D, id] of list) {
        for (const [w, d, r] of (W === D ? [[W, D, 0]] : [[W, D, 0], [D, W, 1]])) {
          if (!fitsAt(x, z, w, d)) continue;
          if (!avail(id, colorFn(x, z, w, d))) continue;
          if (opts.needSupport && !this._rectSupported(x, y, z, w, d)) { fallback ??= [w, d, r, id]; continue; }
          pick = [w, d, r, id];
          break;
        }
        if (pick) break;
      }
      pick ??= fallback;
      if (!pick) { want.delete(x + ',' + z); continue; }
      const [w, d, r, id] = pick;
      const idx = this.add(id, colorFn(x, z, w, d), x, y, z, r);
      if (opts.needSupport && idx >= 0 && !this._rectSupported(x, y, z, w, d)) this.ensureSupport(idx, opts.supportColor ?? 'dbg');
      for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) want.delete((x + i) + ',' + (z + k));
    }
  }

  // A tying layer: cover the free cells of `mask` at height y so that the parts of the layer below end
  // up joined together (Kruskal-like: repeatedly place the plate that joins the most still-separate
  // groups below), then fill the rest with the biggest plates. Makes a two-layer floor hold together.
  bond(mask, y, color, opts = {}) {
    const list = (opts.sizes ?? PLATES).filter(([W, D]) => W * D <= (opts.maxArea ?? 48));
    const cells = Array.isArray(mask) ? mask : rectCells(mask);
    const want = new Set();
    for (const [x, z] of cells) if (this.isFreeCell(x, y, z)) want.add(x + ',' + z);
    const has = (x, z) => want.has(x + ',' + z);
    const colorFn = typeof color === 'function' ? color : () => color;
    const par = new Map();
    const find = (a) => { let r = a; while (par.has(r)) r = par.get(r); return r; };
    for (let iter = 0; iter < 400; iter++) {
      let best = null, bestScore = 0;
      for (const k of want) {
        const [x, z] = k.split(',').map(Number);
        for (const [W, D, id] of list) {
          for (const [w, d, r] of (W === D ? [[W, D, 0]] : [[W, D, 0], [D, W, 1]])) {
            let ok = true;
            const roots = new Set();
            for (let i = 0; i < w && ok; i++) for (let kk = 0; kk < d; kk++) {
              if (!has(x + i, z + kk)) { ok = false; break; }
              const b = this.occAt(x + i, y - 1, z + kk);
              if (b !== undefined) roots.add(find(b));
            }
            if (!ok || roots.size < 2) continue;
            const score = roots.size * 1000 + W * D;
            if (score > bestScore && avail(id, colorFn(x, z, w, d))) { bestScore = score; best = { x, z, w, d, r, id, roots }; }
          }
        }
      }
      if (!best) break;
      const { x, z, w, d, r, id, roots } = best;
      this.add(id, colorFn(x, z, w, d), x, y, z, r);
      for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) want.delete((x + i) + ',' + (z + k));
      const [first, ...rest] = [...roots];
      for (const o of rest) par.set(o, first);
    }
    this.fill([...want].map((k) => k.split(',').map(Number)), y, color, {});
  }

  // Plates of a slab that rest on nothing get a small plate on top that ties them to a neighbour
  lockLayer(y, color, from = 0) {
    for (let i = from; i < this.parts.length; i++) {
      const q = this.parts[i];
      if (q.y !== y || this.supported(q.id, q.x, q.y, q.z, q.r)) continue;
      const p = part(q.id);
      const { w, d } = dims(p, q.r);
      let done = false;
      for (let a = 0; a < w && !done; a++) for (let b = 0; b < d && !done; b++) {
        const x = q.x + a, z = q.z + b;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = this.occAt(x + dx, y, z + dz);
          if (j === undefined || j === i) continue;
          const o = this.parts[j];
          if (o.y !== y || !this.supported(o.id, o.x, o.y, o.z, o.r)) continue;
          const [px, pz, r] = dx ? [Math.min(x, x + dx), z, 0] : [x, Math.min(z, z + dz), 1];
          if (this.fits('3023', px, y + 1, pz, r)) { this.add('3023', color, px, y + 1, pz, r, { follow: i }); done = true; break; }
        }
      }
    }
  }

  _rectSupported(x, y, z, w, d) {
    for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) if (this.studs.has(KEY(x + i, y, z + k))) return true;
    return false;
  }

  // A line of 1-wide plates/tiles along x (r=0) or z (r=1)
  line(x, y, z, len, axis, color, kind = 'plate') {
    const table = kind === 'tile' ? TILE_1 : PLATE_1;
    const sizes = Object.keys(table).map(Number).sort((a, b) => b - a).filter((L) => avail(table[L], color));
    let i = 0;
    while (i < len) {
      const L = sizes.find((s) => s <= len - i);
      const cx = axis === 'x' ? x + i : x, cz = axis === 'x' ? z : z + i;
      this.add(table[L], color, cx, y, cz, axis === 'x' ? 0 : 1);
      i += L;
    }
  }

  // ------------------------------------------------------------------ modular floors
  // Tile the top of a floor's walls (one plate thick), leaving a few 1x1 plates as locator studs:
  // the next floor module rests on the tiles and only clicks onto the locators, so it lifts off.
  capWalls(mask, y, color, isLocator) {
    const free = new Set(mask.filter(([x, z]) => this.isFreeCell(x, y, z)).map(([x, z]) => x + ',' + z));
    const has = (x, z) => free.has(x + ',' + z);
    const runs = [];
    for (const axis of ['x', 'z', 'x']) {
      const list = [...free].map((k) => k.split(',').map(Number)).sort((a, b) => (axis === 'x' ? (a[1] - b[1]) || (a[0] - b[0]) : (a[0] - b[0]) || (a[1] - b[1])));
      for (const [x, z] of list) {
        if (!has(x, z)) continue;
        if (axis === 'x' ? has(x - 1, z) : has(x, z - 1)) continue;
        const run = [];
        let cx = x, cz = z;
        while (has(cx, cz)) { run.push([cx, cz]); if (axis === 'x') cx++; else cz++; }
        if (run.length < 2 && runs.length && axis === 'z') continue;
        runs.push({ axis, run });
        run.forEach(([a, b]) => free.delete(a + ',' + b));
      }
    }
    const sizes = [8, 6, 4, 3, 2, 1];
    for (const { axis, run } of runs) {
      let seg = [];
      const flush = () => {
        let i = 0;
        while (i < seg.length) {
          const L = sizes.find((n) => n <= seg.length - i && avail(TILE_1[n], color));
          const [x, z] = seg[i];
          this.add(TILE_1[L], color, x, y, z, axis === 'x' ? 0 : 1);
          i += L;
        }
        seg = [];
      };
      run.forEach(([x, z], i) => {
        if (isLocator(x, z, i, run.length)) { flush(); this.add('3024', color, x, y, z, 0); }
        else seg.push([x, z]);
      });
      flush();
    }
  }

  // Floorboards: rows of 1-wide tiles with staggered joints (a wooden floor made of many tiles)
  boards(mask, y, color, axis = 'x', opts = {}) {
    const free = new Set(mask.filter(([x, z]) => this.isFreeCell(x, y, z)).map(([x, z]) => x + ',' + z));
    const lengths = (opts.lengths ?? [4, 3, 2, 1]);
    const colorFn = typeof color === 'function' ? color : () => color;
    const rows = new Map();
    for (const k of free) { const [x, z] = k.split(',').map(Number); const r = axis === 'x' ? z : x; if (!rows.has(r)) rows.set(r, []); rows.get(r).push(axis === 'x' ? x : z); }
    for (const [r, list] of rows) {
      list.sort((a, b) => a - b);
      let i = 0;
      while (i < list.length) {
        let j = i; while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
        // run list[i..j]; first board shortened by the row offset so joints stagger
        let a = list[i];
        const end = list[j] + 1;
        const off = ((r % 3) + 3) % 3;
        let first = true;
        while (a < end) {
          let L = lengths.find((n) => n <= end - a && (!first || !off || n <= off + 1)) ?? 1;
          if (first && off && L > off) L = off;
          first = false;
          const col = colorFn(axis === 'x' ? a : r, axis === 'x' ? r : a);
          const L2 = [L, 3, 2, 1].find((n) => n <= end - a && avail(TILE_1[n], col));
          if (axis === 'x') this.add(TILE_1[L2], col, a, y, r, 0); else this.add(TILE_1[L2], col, r, y, a, 1);
          a += L2;
        }
        i = j + 1;
      }
    }
  }

  // A tile or plate standing upright against a wall (SNOT), hooked on a brick with a side stud.
  // (x, z): the room cell in front of the wall at the left end of the part, facing r (into the room)
  upright(id, color, x, y, z, r, host, yOff = 0) {
    const p = part(id);
    const hPl = Math.ceil(p.d * 2.5);
    const along = (r & 1) ? [0, 1] : [1, 0];
    const cells = [];
    for (let i = 0; i < p.w; i++) cells.push([x + along[0] * i, z + along[1] * i]);
    for (const [cx, cz] of cells) for (let j = 0; j < hPl; j++) if (!this.isFreeCell(cx, y + j, cz)) {
      this.errors.push(`upright ${id} blocked at ${cx},${y + j},${cz} [${this.cur?.name}]`);
      return -1;
    }
    const idx = this.parts.length;
    const minx = Math.min(...cells.map((c) => c[0])), minz = Math.min(...cells.map((c) => c[1]));
    this.parts.push({ id, c: color, x: minx, y, z: minz, r: r & 3, sec: this.cur.idx, up: { h: hPl, yOff }, attach: host });
    for (const [cx, cz] of cells) for (let j = 0; j < hPl; j++) this.occ.set(KEY(cx, y + j, cz), idx);
    return idx;
  }

  // highest stud-top at (x,z) that is <= y (or -1)
  studBelow(x, z, y) {
    for (let yy = y; yy >= 0; yy--) {
      if (this.studs.has(KEY(x, yy, z))) return yy;
      if (yy < y && this.occ.has(KEY(x, yy, z))) return -1;   // blocked by a stud-less part
    }
    return -1;
  }

  // fill a vertical gap at (x,z) from y0 to y1 (plates) with 1x1 bricks / plates
  column(x, z, y0, y1, color) {
    let y = y0;
    while (y1 - y >= 3) { this.add('3005', color, x, y, z, 0); y += 3; }
    while (y < y1) { this.add('3024', color, x, y, z, 0); y += 1; }
  }

  // make sure part #idx has something to sit on: add a hidden column under one of its cells
  ensureSupport(idx, color) {
    const q = this.parts[idx];
    if (this.supported(q.id, q.x, q.y, q.z, q.r)) return true;
    const p = part(q.id);
    const cands = bottomCells(p).map(([u, v]) => { const [dx, dz] = rotCell(p, q.r, u, v); return [q.x + dx, q.z + dz]; });
    for (const [x, z] of cands) {
      let ok = true;
      for (let yy = q.y - 1; yy >= 0; yy--) {
        const k = KEY(x, yy, z);
        if (this.studs.has(KEY(x, yy + 1, z)) && this.occ.has(KEY(x, yy, z))) { this.column(x, z, yy + 1, q.y, color); return true; }
        if (this.occ.has(k) || this.reserved.has(k)) { ok = false; break; }
        if (yy === 0 && ok) { this.column(x, z, 0, q.y, color); return true; }
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ roofs
  // Gable roof: ridge runs along `axis` over [a0,a1); walls at b0 (back) and b1 (front) across,
  // (b1-b0+1) must be even. Course k: front slope studs on row b1-k, back slope studs on row b0+k;
  // when they cross, a row of double slopes forms the ridge. `ends` colours the two end columns
  // (stone coping on a parapet gable); `gable.cols` get brick infill between the slopes.
  gableRoof({ axis = 'x', a0, a1, b0, b1, y, color, ridgeColor, gable = null, ends = null, supportColor = null, fillers = true, stagger = 0 }) {
    if ((b1 - b0 + 1) % 2) throw new Error('gableRoof needs an even width');
    const sc = supportColor ?? color;
    const toXZ = (a, bMin, facing) => (axis === 'x' ? [a, bMin, facing > 0 ? 0 : 2] : [bMin, a, facing > 0 ? 1 : 3]);
    const put = (id, col, x, yy, z, r) => {
      const idx = this.add(id, col, x, yy, z, r);
      if (idx >= 0 && !this.supported(id, x, yy, z, r)) this.ensureSupport(idx, sc);
      return idx;
    };
    const place = (L, col, a, bMin, yy, facing) => {
      const id = { 4: '3037', 2: '3039', 1: '3040b' }[L];
      const [x, z, r] = toXZ(a, bMin, facing);
      if (this.fits(id, x, yy, z, r)) { put(id, col, x, yy, z, r); return; }
      for (let i = 0; i < L; i++) {
        const [x1, z1, r1] = toXZ(a + i, bMin, facing);
        if (this.fits('3040b', x1, yy, z1, r1)) { put('3040b', col, x1, yy, z1, r1); continue; }
        const studRow = facing > 0 ? bMin : bMin + 1;
        const [sx, sz] = axis === 'x' ? [a + i, studRow] : [studRow, a + i];
        if (fillers && this.fits('3005', sx, yy, sz, 0)) put('3005', sc, sx, yy, sz, 0);
      }
    };
    const ridge = (a, bMin, yy, col, L) => {
      const id = L === 2 ? '3043' : '3044c';
      const [x, z] = axis === 'x' ? [a, bMin] : [bMin, a];
      const r = axis === 'x' ? 0 : 1;
      if (this.fits(id, x, yy, z, r)) { put(id, col, x, yy, z, r); return; }
      if (L === 2) { ridge(a, bMin, yy, col, 1); ridge(a + 1, bMin, yy, col, 1); }
    };
    const segs = (k) => {
      // split [a0,a1) into pieces: 1-wide end columns (if ends), then 4/2/1 pieces staggered per course
      const out = [];
      let s0 = a0, s1 = a1;
      if (ends) { out.push([a0, 1, ends]); out.push([a1 - 1, 1, ends]); s0++; s1--; }
      let a = s0;
      if ((k + stagger) % 2 && s1 - s0 > 2) { out.push([a, 2, null]); a += 2; }
      while (a < s1) { const L = s1 - a >= 4 ? 4 : s1 - a >= 2 ? 2 : 1; out.push([a, L, null]); a += L; }
      return out;
    };
    let k = 0;
    for (; ; k++) {
      const yy = y + 3 * k, fS = b1 - k, bS = b0 + k;
      if (fS < bS) {
        // ridge course on top of the two studded rows (fS .. fS+1)
        let a = a0;
        if (ends) { ridge(a0, fS, yy, ends, 1); ridge(a1 - 1, fS, yy, ends, 1); a = a0 + 1; }
        const end = ends ? a1 - 1 : a1;
        while (a < end) { const L = end - a >= 2 ? 2 : 1; ridge(a, fS, yy, ridgeColor ?? color, L); a += L; }
        break;
      }
      for (const [a, L, col] of segs(k)) {
        place(L, col ?? color, a, fS, yy, +1);
        place(L, col ?? color, a, bS - 1, yy, -1);
      }
      if (gable) {
        for (const ga of gable.cols) {
          const cells = [];
          for (let b = bS + 1; b < fS; b++) cells.push(axis === 'x' ? [ga, b] : [b, ga]);
          if (cells.length) this.course(cells, yy, gable.color, { prefer: axis === 'x' ? 'z' : 'x' });
        }
      }
    }
    return y + 3 * (k + 1);
  }

  // square pyramid (hip) roof over the square [x0,x0+n)x[z0,z0+n) (n even): rings of 45° slopes with
  // convex corners; the last 4x4 ring is four corners that meet in a point.
  pyramid(x0, z0, n, y, color) {
    const tryAdd = (id, c, x, yy, z, r) => {
      const idx = this.tryAdd(id, c, x, yy, z, r);
      if (idx >= 0 && !this.supported(id, x, yy, z, r)) this.ensureSupport(idx, color);
      return idx;
    };
    let k = 0;
    for (; n - 2 * k >= 4; k++) {
      const yy = y + 3 * k, a = x0 + k, b = z0 + k, m = n - 2 * k;
      tryAdd('3045', color, a, yy, b, 2);                 // back-left  (faces -x,-z)
      tryAdd('3045', color, a + m - 2, yy, b, 1);         // back-right (faces +x,-z)
      tryAdd('3045', color, a + m - 2, yy, b + m - 2, 0); // front-right(faces +x,+z)
      tryAdd('3045', color, a, yy, b + m - 2, 3);         // front-left (faces -x,+z)
      for (let i = 2; i < m - 2; ) {
        const L = m - 2 - i >= 2 ? 2 : 1;
        const id = L === 2 ? '3039' : '3040b';
        tryAdd(id, color, a + i, yy, b + m - 2, 0);   // front, faces +z
        tryAdd(id, color, a + i, yy, b, 2);           // back, faces -z
        tryAdd(id, color, a + m - 2, yy, b + i, 1);   // right, faces +x
        tryAdd(id, color, a, yy, b + i, 3);           // left, faces -x
        i += L;
      }
    }
    return y + 3 * k;
  }
}

export function rectCells({ x0, z0, x1, z1 }) {
  const out = [];
  for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) out.push([x, z]);
  return out;
}

// outline (1 stud thick) of a rectangle, optionally skipping sides
export function rectRing({ x0, z0, x1, z1 }, skip = {}) {
  const out = [];
  const s = new Set();
  const push = (x, z) => { const k = x + ',' + z; if (!s.has(k)) { s.add(k); out.push([x, z]); } };
  for (let x = x0; x < x1; x++) { if (!skip.back) push(x, z0); if (!skip.front) push(x, z1 - 1); }
  for (let z = z0; z < z1; z++) { if (!skip.left) push(x0, z); if (!skip.right) push(x1 - 1, z); }
  return out;
}

// pixel circle: cells whose centre is within r of (cx, cz) (cx,cz may be half-integers)
export function disk(cx, cz, r) {
  const out = [];
  for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
    for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r * r) out.push([x, z]);
    }
  return out;
}
export function ringOf(cells) {
  const s = new Set(cells.map(([x, z]) => x + ',' + z));
  return cells.filter(([x, z]) => !s.has(x + 1 + ',' + z) || !s.has(x - 1 + ',' + z) || !s.has(x + ',' + (z + 1)) || !s.has(x + ',' + (z - 1)));
}
