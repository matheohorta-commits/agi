// Small builds (furniture, props, minifigures). Every build uses a Local frame whose front faces +z
// when r = 0; lz = 0 is the back (against a wall).
import { Local } from './common.js';
import { PLATES, TILES } from '../core/builder.js';
import { torsoId, legsId } from '../core/parts.js';

export function plateFor(w, d, tiles = false) {
  const list = tiles ? TILES : PLATES;
  for (const [W, D, id] of list) {
    if (W === w && D === d) return [id, 0];
    if (W === d && D === w) return [id, 1];
  }
  throw new Error(`no ${tiles ? 'tile' : 'plate'} ${w}x${d}`);
}
const P = (L, w, d, color, lx, ly, lz) => { const [id, r] = plateFor(w, d); return L.add(id, color, lx, ly, lz, r); };
const T = (L, w, d, color, lx, ly, lz) => { const [id, r] = plateFor(w, d, true); return L.add(id, color, lx, ly, lz, r); };

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
