// Small builds (furniture, props, minifigures). Every build uses a Local frame whose front faces +z
// when r = 0; lz = 0 is the back (against a wall).
import { Local } from './common.js';
import { PLATES, TILES, avail } from '../core/builder.js';
import { torsoId, legsId } from '../core/parts.js';

export function plateFor(w, d, tiles = false) {
  const list = tiles ? TILES : PLATES;
  for (const [W, D, id] of list) {
    if (W === w && D === d) return [id, 0];
    if (W === d && D === w) return [id, 1];
  }
  throw new Error(`no ${tiles ? 'tile' : 'plate'} ${w}x${d}`);
}
// plate/tile of any size: one piece when it exists, else split along the long side
function has(w, d, tiles) { try { plateFor(w, d, tiles); return true; } catch { return false; } }
function PT(L, w, d, color, lx, ly, lz, tiles) {
  if (has(w, d, tiles)) { const [id, r] = plateFor(w, d, tiles); return L.add(id, color, lx, ly, lz, r); }
  if (w >= d) { let a = Math.min(w - 1, 8); while (a > 1 && !(has(a, d, tiles))) a--; PT(L, a, d, color, lx, ly, lz, tiles); return PT(L, w - a, d, color, lx + a, ly, lz, tiles); }
  let b = Math.min(d - 1, 8); while (b > 1 && !(has(w, b, tiles))) b--; PT(L, w, b, color, lx, ly, lz, tiles); return PT(L, w, d - b, color, lx, ly, lz + b, tiles);
}
const P = (L, w, d, color, lx, ly, lz) => PT(L, w, d, color, lx, ly, lz, false);
const T = (L, w, d, color, lx, ly, lz) => PT(L, w, d, color, lx, ly, lz, true);

export function sofa(mb, x, y, z, r, col = 'darkRed', cushion = 'tan') {
  const L = new Local(mb, x, y, z, 4, 2, r);
  P(L, 4, 2, col, 0, 0, 0);
  L.add('3010', col, 0, 1, 0);
  L.add('3005', col, 0, 1, 1); L.add('3005', col, 3, 1, 1);
  T(L, 2, 1, cushion, 1, 1, 1);
  T(L, 4, 1, col, 0, 4, 0);
  L.add('3070b', col, 0, 4, 1); L.add('3070b', col, 3, 4, 1);
}

export function chair(mb, x, y, z, r, col = 'reddishBrown') {
  new Local(mb, x, y, z, 2, 2, r).add('4079b', col, 0, 0, 0);
}

// table with round legs; W x D top
export function table(mb, x, y, z, W, D, r, col = 'reddishBrown', top = null) {
  const L = new Local(mb, x, y, z, W, D, r);
  for (const [a, b] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1]]) L.add('3062b', col, a, 0, b);
  P(L, W, D, col, 0, 3, 0);
  if (top !== false) tileArea(L, 0, 4, 0, W, D, top || col);
}

export function tileArea(L, lx, ly, lz, W, D, color) {
  // cover a W x D local area with tiles (2-wide tiles first)
  for (let b = 0; b < D; ) {
    const d = D - b >= 2 ? 2 : 1;
    for (let a = 0; a < W; ) {
      let w = Math.min(W - a, d === 2 ? 4 : 8);
      while (w > 0) { try { plateFor(w, d, true); break; } catch { w--; } }
      T(L, w, d, color, lx + a, ly, lz + b);
      a += w;
    }
    b += d;
  }
}

export function bed(mb, x, y, z, r, o = {}) {
  const W = o.W ?? 4, D = o.D ?? 6, frame = o.frame ?? 'reddishBrown', sheet = o.sheet ?? 'white', blanket = o.blanket ?? 'darkRed';
  const L = new Local(mb, x, y, z, W, D, r);
  P(L, W, D, frame, 0, 0, 0);
  // headboard (two courses)
  L.add(W === 4 ? '3010' : '3004', frame, 0, 1, 0); L.add(W === 4 ? '3010' : '3004', frame, 0, 4, 0);
  T(L, W, 1, frame, 0, 7, 0);
  // mattress plates
  let b = 1;
  while (b < D) { const d = D - b >= 2 ? 2 : 1; P(L, W, d, sheet, 0, 1, b); b += d; }
  // pillows + blanket
  for (let a = 0; a < W; a += 2) T(L, 2, 1, sheet, a, 2, 1);
  tileArea(L, 0, 2, 2, W, D - 2, blanket);
}

export function nightstand(mb, x, y, z, r, col = 'reddishBrown', prop = 'candle') {
  const L = new Local(mb, x, y, z, 2, 2, r);
  L.add('3003', col, 0, 0, 0);
  if (prop === 'candle') { L.add('3023', col, 0, 3, 0, 1); L.add('37762', 'pearlGold', 0, 4, 1); L.add('3070b', col, 0, 4, 0); L.add('3070b', col, 1, 3, 0); L.add('3070b', col, 1, 3, 1); }
  else T(L, 2, 2, col, 0, 3, 0);
}

export function fireplace(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 4, 2, r);
  P(L, 4, 2, 'black', 0, 0, 0);
  L.add('3010', 'black', 0, 1, 0);
  L.add('3005', 'tan', 0, 1, 1); L.add('3005', 'tan', 3, 1, 1);
  L.add('6126b', 'transOrange', 1, 1, 1); L.add('37775', 'transOrange', 2, 1, 1);
  L.add('3010', 'black', 0, 4, 0);
  L.add('3005', 'tan', 0, 4, 1); L.add('3005', 'tan', 3, 4, 1);
  P(L, 4, 2, 'reddishBrown', 0, 7, 0);
  L.add('37762', 'pearlGold', 0, 8, 1); L.add('37762', 'pearlGold', 3, 8, 1);
  L.add('90398', 'pearlGold', 1, 8, 0);
  T(L, 2, 1, 'reddishBrown', 1, 8, 1);
  L.add('3070b', 'reddishBrown', 2, 8, 0); L.add('3070b', 'reddishBrown', 3, 8, 0); L.add('3070b', 'reddishBrown', 0, 8, 0);
}

export function bookcase(mb, x, y, z, r, col = 'reddishBrown', doors = 'transLightBlue', tall = 2) {
  const L = new Local(mb, x, y, z, 3, 2, r);
  for (let i = 0; i < tall; i++) {
    L.add('92410', col, 0, 6 * i, 0);
    if (doors) L.add('4533', doors, 0, 6 * i, 1);
  }
  T(L, 3, 2, col, 0, 6 * tall, 0);
}

export function desk(mb, x, y, z, r, col = 'reddishBrown') {
  const L = new Local(mb, x, y, z, 4, 4, r);
  L.add('3004', col, 0, 0, 0, 1); L.add('3004', col, 3, 0, 0, 1);
  P(L, 4, 2, col, 0, 3, 0);
  T(L, 2, 2, 'darkGreen', 0, 4, 0);
  L.add('3069b', col, 2, 4, 0, 1);
  L.add('37762', 'pearlGold', 3, 4, 0);
  L.add('3899', 'white', 3, 4, 1);
  L.add('4079b', 'reddishBrown', 1, 0, 2, 2);
}

export function counter(mb, x, y, z, r, W, o = {}) {
  // kitchen counter W x 2 with cupboards, a stove and a sink
  const L = new Local(mb, x, y, z, W, 2, r);
  let a = 0;
  while (a < W) {
    const kind = o.layout?.[a] ?? 'cab';
    if (kind === 'stove') {
      L.add('3003', 'black', a, 0, 0); L.add('3003', 'black', a, 3, 0);
      P(L, 2, 2, 'black', a, 6, 0); L.add('4528', 'flatSilver', a, 7, 1); L.add('3070b', 'black', a + 1, 7, 1); T(L, 2, 1, 'black', a, 7, 0);
      a += 2;
    } else if (kind === 'sink') {
      L.add('3003', 'white', a, 0, 0); L.add('3003', 'white', a, 3, 0);
      L.add('2412b', 'lbg', a, 6, 1); T(L, 2, 1, 'lbg', a, 6, 0);
      a += 2;
    } else {
      L.add('92410', 'white', a, 0, 0); L.add('4536', 'white', a, 0, 1); L.add('4536', 'white', a, 3, 1);
      tileArea(L, a, 6, 0, 3, 2, 'dbg');
      a += 3;
    }
  }
}

export function fridge(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 2, 2, r);
  for (let i = 0; i < 5; i++) L.add('3003', 'white', 0, 3 * i, 0);
  T(L, 2, 2, 'white', 0, 15, 0);
}

export function bathtub(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 4, 3, r);
  P(L, 4, 2, 'white', 0, 0, 0); P(L, 4, 1, 'white', 0, 0, 2);
  L.add('3010', 'white', 0, 1, 0); L.add('3010', 'white', 0, 1, 2);
  L.add('3005', 'white', 0, 1, 1); L.add('3005', 'white', 3, 1, 1);
  T(L, 2, 1, 'transLightBlue', 1, 1, 1);
  T(L, 4, 1, 'white', 0, 4, 0); T(L, 4, 1, 'white', 0, 4, 2);
  L.add('3070b', 'white', 0, 4, 1); L.add('3070b', 'white', 3, 4, 1);
}

export function toilet(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 1, 2, r);
  L.add('3004', 'white', 0, 0, 0, 1);
  L.add('3024', 'white', 0, 3, 0); L.add('3070b', 'white', 0, 4, 0); L.add('3070b', 'white', 0, 3, 1);
}

export function pedestalSink(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 1, 1, r);
  L.add('3062b', 'white', 0, 0, 0); L.add('3062b', 'white', 0, 3, 0); L.add('98138', 'white', 0, 6, 0);
}

export function crib(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 4, 3, r);
  P(L, 4, 2, 'white', 0, 0, 0); P(L, 4, 1, 'white', 0, 0, 2);
  L.add('15332', 'white', 0, 1, 0); L.add('15332', 'white', 0, 1, 2);
  T(L, 4, 1, 'white', 0, 1, 1);
  T(L, 4, 1, 'white', 0, 7, 0); T(L, 4, 1, 'white', 0, 7, 2);
}

export function operatingTable(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 2, 6, r);
  L.add('3004', 'lbg', 0, 0, 0); L.add('3004', 'lbg', 0, 0, 5);
  P(L, 2, 6, 'lbg', 0, 3, 0);
  T(L, 2, 4, 'white', 0, 4, 0);
}

export function jarShelf(mb, x, y, z, r, W = 6, seed = 1) {
  // brick base, rows of trans "specimen jars" (round 1x1 bricks), plate shelves
  const L = new Local(mb, x, y, z, W, 1, r);
  const jars = ['transGreen', 'transClear', 'transYellow', 'transGreen', 'transRed', 'transLightBlue'];
  const line = (ly, kind) => {
    let a = 0;
    while (a < W) {
      const l = W - a >= 6 ? 6 : W - a >= 4 ? 4 : W - a >= 2 ? 2 : 1;
      const id = kind === 'brick' ? { 6: '3009', 4: '3010', 2: '3004', 1: '3005' }[l] : { 6: '3666', 4: '3710', 2: '3023', 1: '3024' }[l];
      L.add(id, 'reddishBrown', a, ly, 0);
      a += l;
    }
  };
  line(0, 'brick');
  let yy = 3;
  for (let row = 0; row < 3; row++) {
    for (let a = 0; a < W; a++) L.add('3062b', jars[(a + row * 2 + seed) % jars.length], a, yy, 0);
    yy += 3;
    line(yy, 'plate');
    yy += 1;
  }
}

export function boiler(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 2, 2, r);
  for (let i = 0; i < 4; i++) L.add('3941', i === 0 ? 'black' : 'dbg', 0, 3 * i, 0);
  L.add('14769', 'black', 0, 12, 0);
}

export function chest(mb, x, y, z, r, col = 'reddishBrown') {
  const L = new Local(mb, x, y, z, 4, 2, r);
  L.add('4738c', col, 0, 0, 0);
  L.add('4739a', col, 0, 4, 0);
}

export function lampPost(mb, x, y, z) {
  mb.add('11062', 'black', x, y, z, 0);
}

// Trees: round-brick trunk, two tiers of 4x4 plates carrying leaf clusters, a crown on top
export function tree(mb, x, y, z, height = 5, leafCol = 'darkGreen', alt = 'green') {
  for (let i = 0; i < height; i++) mb.add('3941', 'reddishBrown', x, y + 3 * i, z);
  let top = y + 3 * height;
  const tier = (yy, big) => {
    mb.add('3031', 'reddishBrown', x - 1, yy, z - 1);          // 4x4 branch plate
    const L = [[x - 1, z - 1], [x + 2, z - 1], [x - 1, z + 2], [x + 2, z + 2]];
    L.forEach(([a, b], i) => mb.add(big ? '2417' : '2423', i % 2 ? alt : leafCol, a, yy + 1, b));
    for (const [a, b] of [[x, z - 1], [x + 1, z + 2], [x - 1, z + 1], [x + 2, z]]) mb.add('2423', leafCol, a, yy + 1, b);
  };
  tier(top, true);
  mb.add('3941', 'reddishBrown', x, top + 1, z);
  tier(top + 4, false);
  mb.add('3022', 'reddishBrown', x, top + 5, z);
  mb.add('2417', alt, x, top + 6, z); mb.add('2417', leafCol, x + 1, top + 6, z + 1);
}


// ---------------------------------------------------------------- more furniture (v2)
const BOOKS = ['darkRed', 'darkTan', 'black', 'sandGreen', 'tan', 'darkBrown', 'medNougat', 'darkBlue', 'darkGreen', 'dbg', 'reddishBrown', 'red'];
let bookSeed = 7;
const rnd = () => ((bookSeed = (bookSeed * 16807) % 2147483647) / 2147483647);

// brick-built bookcase, 1 stud deep: plate shelves with rows of 1x1 "books"
export function bookshelf(mb, x, y, z, r, W = 4, shelves = 3, wood = 'reddishBrown') {
  const L = new Local(mb, x, y, z, W, 1, r);
  const books = BOOKS.filter((c) => avail('3005', c));
  let ly = 0;
  for (let s = 0; s < shelves; s++) {
    P(L, W, 1, wood, 0, ly, 0);
    ly += 1;
    L.add('3005', wood, 0, ly, 0); L.add('3005', wood, W - 1, ly, 0);
    for (let a = 1; a < W - 1; a++) {
      if (rnd() < 0.15) L.add('3062b', ['pearlGold', 'white', 'transGreen'][Math.floor(rnd() * 3)], a, ly, 0);
      else L.add('3005', books[Math.floor(rnd() * books.length)], a, ly, 0);
    }
    ly += 3;
  }
  P(L, W, 1, wood, 0, ly, 0);
  tileArea(L, 0, ly + 1, 0, W, 1, wood);
}

export function piano(mb, x, y, z, r) {
  // upright piano W=4, D=2 (keys at the front)
  const L = new Local(mb, x, y, z, 4, 2, r);
  L.add('3010', 'black', 0, 0, 0); L.add('3010', 'black', 0, 3, 0); L.add('3010', 'black', 0, 6, 0);
  L.add('3005', 'black', 0, 0, 1); L.add('3005', 'black', 3, 0, 1);
  P(L, 4, 1, 'black', 0, 3, 1);
  T(L, 4, 1, 'white', 0, 4, 1);
  P(L, 4, 1, 'black', 0, 9, 0);
  L.add('37762', 'pearlGold', 0, 10, 0); L.add('37762', 'pearlGold', 3, 10, 0);
  T(L, 2, 1, 'black', 1, 10, 0);
}

export function floorLamp(mb, x, y, z, shade = 'darkRed') {
  mb.add('3062b', 'black', x, y, z); mb.add('3062b', 'black', x, y + 3, z); mb.add('3062b', 'black', x, y + 6, z);
  mb.add('3062b', 'transYellow', x, y + 9, z); mb.add('59900', shade, x, y + 12, z);
}

export function tableLamp(mb, x, y, z, shade = 'darkGreen') {
  mb.add('3062b', 'pearlGold', x, y, z); mb.add('3062b', 'transYellow', x, y + 3, z); mb.add('59900', shade, x, y + 6, z);
}

export function wardrobe(mb, x, y, z, r, col = 'reddishBrown', front = 'medNougat', levels = 3) {
  const L = new Local(mb, x, y, z, 3, 2, r);
  for (let i = 0; i < levels; i++) { L.add('92410', col, 0, 6 * i, 0); L.add('4536', front, 0, 6 * i, 1); L.add('4536', front, 0, 6 * i + 3, 1); }
  T(L, 3, 2, col, 0, 6 * levels, 0);
}

export function dresser(mb, x, y, z, r, col = 'reddishBrown', front = 'medNougat') {
  const L = new Local(mb, x, y, z, 3, 2, r);
  L.add('92410', col, 0, 0, 0); L.add('4536', front, 0, 0, 1); L.add('4536', front, 0, 3, 1);
  P(L, 3, 2, col, 0, 6, 0);
  L.add('37762', 'pearlGold', 0, 7, 0); L.add('3899', 'white', 2, 7, 1);
  T(L, 2, 1, col, 1, 7, 0); L.add('3070b', col, 0, 7, 1); L.add('3070b', col, 1, 7, 1);
}

export function coffeeTable(mb, x, y, z, r, col = 'reddishBrown') {
  const L = new Local(mb, x, y, z, 4, 2, r);
  L.add('3062b', col, 0, 0, 0); L.add('3062b', col, 3, 0, 1);
  L.add('3062b', col, 3, 0, 0); L.add('3062b', col, 0, 0, 1);
  P(L, 4, 2, col, 0, 3, 0);
  L.add('3899', 'white', 0, 4, 0); L.add('2343', 'transClear', 3, 4, 1);
  T(L, 2, 2, 'darkGreen', 1, 4, 0); L.add('3070b', col, 0, 4, 1); L.add('3070b', col, 3, 4, 0);
}

export function rug(mb, x0, z0, x1, z1, y, inner = 'darkRed', border = 'darkTan') {
  // a rug made of tiles: border ring + inner field
  const cells = [];
  for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) cells.push([x, z]);
  const ring = cells.filter(([x, z]) => x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1);
  const field = cells.filter(([x, z]) => !(x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1));
  mb.fill(field, y, inner, { tiles: true });
  mb.fill(ring, y, border, { tiles: true, sizes: [[4, 1, '2431'], [3, 1, '63864'], [2, 1, '3069b'], [1, 1, '3070b']] });
}

export function recordPlayer(mb, x, y, z) {
  mb.add('3003', 'reddishBrown', x, y, z);
  mb.add('3022', 'black', x, y + 3, z);
  mb.add('14769', 'black', x, y + 4, z);
}

export function rockingHorse(mb, x, y, z, r) {
  // 1 x 3: rockers (plate), legs, body and a head
  const L = new Local(mb, x, y, z, 1, 3, r);
  P(L, 1, 3, 'reddishBrown', 0, 0, 0);
  L.add('3062b', 'white', 0, 1, 0); L.add('3062b', 'white', 0, 1, 2);
  P(L, 1, 3, 'white', 0, 4, 0);
  L.add('3005', 'white', 0, 5, 2); L.add('54200', 'black', 0, 8, 2, 0);
  L.add('3070b', 'red', 0, 5, 1); L.add('54200', 'black', 0, 5, 0, 2);
}

export function toyBlocks(mb, x, y, z) {
  mb.add('3005', 'red', x, y, z); mb.add('3005', 'yellow', x, y + 3, z); mb.add('3005', 'blue', x + 1, y, z);
}

export function gurney(mb, x, y, z, r) {
  const L = new Local(mb, x, y, z, 2, 5, r);
  for (const [a, b] of [[0, 0], [1, 0], [0, 4], [1, 4]]) L.add('3062b', 'lbg', a, 0, b);
  P(L, 2, 4, 'lbg', 0, 3, 0); P(L, 2, 1, 'lbg', 0, 3, 4);
  T(L, 2, 4, 'white', 0, 4, 0); T(L, 2, 1, 'white', 0, 4, 4);
}

export function labBench(mb, x, y, z, r) {
  // bench with bottles, a lantern and candles (W 4, D 2)
  const L = new Local(mb, x, y, z, 4, 2, r);
  L.add('3010', 'darkBrown', 0, 0, 0); L.add('3005', 'darkBrown', 0, 0, 1); L.add('3005', 'darkBrown', 3, 0, 1);
  P(L, 4, 2, 'darkBrown', 0, 3, 0);
  L.add('95228', 'transGreen', 0, 4, 0); L.add('95228', 'transClear', 1, 4, 0); L.add('37776', 'black', 3, 4, 0);
  L.add('37762', 'white', 2, 4, 1); L.add('34172', 'white', 0, 4, 1);
  L.add('3070b', 'darkBrown', 2, 4, 0); L.add('3070b', 'darkBrown', 1, 4, 1); L.add('3070b', 'darkBrown', 3, 4, 1);
}

export function sideboard(mb, x, y, z, r, col = 'reddishBrown') {
  const L = new Local(mb, x, y, z, 3, 2, r);
  L.add('92410', col, 0, 0, 0); L.add('4533', 'transLightBlue', 0, 0, 1);
  P(L, 3, 2, col, 0, 6, 0);
  L.add('2343', 'transClear', 0, 7, 1); L.add('2343', 'transClear', 1, 7, 1); L.add('37762', 'pearlGold', 2, 7, 0);
  T(L, 2, 1, col, 0, 7, 0); L.add('3070b', col, 2, 7, 1);
}

export function pottedPlant(mb, x, y, z, big = false) {
  if (big) { mb.add('3941', 'reddishBrown', x, y, z); mb.add('2417', 'green', x, y + 3, z); mb.add('2423', 'green', x + 1, y + 3, z + 1); }
  else { mb.add('3062b', 'darkOrange', x, y, z); mb.add('2423', 'green', x, y + 3, z); }
}

export function dressForm(mb, x, y, z) {
  mb.add('3062b', 'black', x, y, z); mb.add('3062b', 'black', x, y + 3, z); mb.add('3062b', 'white', x, y + 6, z); mb.add('3062b', 'white', x, y + 9, z); mb.add('98138', 'black', x, y + 12, z);
}

export function trunk(mb, x, y, z, r, col = 'darkBrown') {
  const L = new Local(mb, x, y, z, 4, 2, r);
  L.add('3001', col, 0, 0, 0);
  T(L, 4, 2, 'reddishBrown', 0, 3, 0);
}

export function bench(mb, x, y, z, r, col = 'reddishBrown') {
  const L = new Local(mb, x, y, z, 4, 1, r);
  L.add('3005', 'black', 0, 0, 0); L.add('3005', 'black', 3, 0, 0);
  P(L, 4, 1, col, 0, 3, 0);
  T(L, 4, 1, col, 0, 4, 0);
}

export function mailbox(mb, x, y, z) {
  mb.add('3062b', 'black', x, y, z); mb.add('3062b', 'black', x, y + 3, z); mb.add('3005', 'black', x, y + 6, z); mb.add('54200', 'black', x, y + 9, z, 0);
}

// ---------------------------------------------------------------- minifigures
export const CHARACTERS = {
  tate:      { name: 'Tate Langdon', hair: ['92746', 'darkTan'], torso: ['black', 'black', 'yellow'], legs: 'darkBlue', note: 'Black sweater, dark jeans, messy blond hair' },
  violet:    { name: 'Violet Harmon', hair: ['85974', 'darkBrown'], torso: ['red', 'red', 'yellow'], legs: 'black', note: 'Red cardigan, long brown hair' },
  ben:       { name: 'Dr. Ben Harmon', hair: ['62810', 'darkBrown'], torso: ['white', 'white', 'yellow'], legs: 'dbg', note: 'Psychiatrist in a white shirt' },
  vivien:    { name: 'Vivien Harmon', hair: ['23187', 'reddishBrown'], torso: ['sandBlue', 'sandBlue', 'yellow'], legs: 'tan', note: 'Sand blue blouse, wavy auburn hair' },
  constance: { name: 'Constance Langdon', hair: ['27186', 'brightLightYellow'], torso: ['blue', 'blue', 'yellow'], legs: 'blue', note: 'Blue 1960s dress, blonde bouffant' },
  moira:     { name: 'Moira O\'Hara (young)', hair: ['87990', 'darkOrange'], torso: ['black', 'black', 'yellow'], legs: 'black', note: 'Black maid uniform, red hair' },
  moiraOld:  { name: 'Moira O\'Hara (old)', hair: ['11256', 'lbg'], torso: ['white', 'white', 'yellow'], legs: 'black', note: 'Grey hair, white uniform' },
  rubberMan: { name: 'The Rubber Man', head: ['3626c', 'black'], hair: ['3901', 'black'], torso: ['black', 'black', 'black'], legs: 'black', note: 'All-black latex suit' },
  charles:   { name: 'Dr. Charles Montgomery', hair: ['92081', 'black'], torso: ['white', 'white', 'white'], legs: 'black', note: '1920s surgeon, white gloves' },
};

// TORSO_ARMS in parts.js does not know every body colour: the torso body colour is the placement colour,
// arms/hands are encoded in the id.
export function figParts(key) {
  const ch = CHARACTERS[key];
  const [body, arms, hands] = ch.torso;
  return [
    { id: legsId(ch.legs), c: ch.legs, role: 'legs' },
    { id: torsoId(arms, hands), c: body, role: 'torso', arms, hands },
    { id: ch.head?.[0] ?? '3626cpr0001', c: ch.head?.[1] ?? 'yellow', role: 'head' },
    { id: ch.hair[0], c: ch.hair[1], role: 'hair' },
  ];
}

export function minifig(mb, key, x, y, z, r = 0) {
  return mb.add('fig', 'black', x, y, z, r, { fig: key, figParts: figParts(key) });
}
