// Part library.
// Every id is a real LEGO design id as used by Rebrickable (verified against the Rebrickable catalogue
// by tools/gen-catalog.py). `bl` is the BrickLink catalogue id when it differs.
//
// Local frame of a part (rotation r = 0):
//   w = size along +x (studs), d = size along +z (studs), h = height in plates (brick = 3 plates)
//   the part's "front" faces +z (slopes run down towards +z, windows look out towards +z)
//
// geo    : what geometry/gfx/geometry.js builds for it
// top    : where the studs are ('all' | 'none' | 'back' = row v=0 only | [[u,v],...])
// bottom : which cells can take studs from below ('all' | 'none' | [[u,v],...])
// insert : lives inside another part's cells (glass in a window, door in a frame, ...)
// cost   : rough base price in EUR before the colour-rarity factor (see catalog.js)

const P = {};
function def(id, o) { P[id] = { id, bl: id, top: 'all', bottom: 'all', ...o }; }

// ---------------------------------------------------------------- bricks
const brick = (id, w, d, name, cost) => def(id, { name, cat: 'Brick', w, d, h: 3, geo: { t: 'box', studs: true }, cost });
brick('3005', 1, 1, 'Brick 1 x 1', 0.04);
brick('3004', 2, 1, 'Brick 1 x 2', 0.05);
brick('3622', 3, 1, 'Brick 1 x 3', 0.06);
brick('3010', 4, 1, 'Brick 1 x 4', 0.07);
brick('3009', 6, 1, 'Brick 1 x 6', 0.10);
brick('3008', 8, 1, 'Brick 1 x 8', 0.14);
brick('3003', 2, 2, 'Brick 2 x 2', 0.07);
brick('3002', 3, 2, 'Brick 2 x 3', 0.09);
brick('3001', 4, 2, 'Brick 2 x 4', 0.11);
def('98283', { name: 'Brick 1 x 2 with Masonry Brick Profile', cat: 'Brick', w: 2, d: 1, h: 3, geo: { t: 'masonry' }, cost: 0.07 });
def('15533', { name: 'Brick 1 x 4 with Masonry Brick Profile', cat: 'Brick', w: 4, d: 1, h: 3, geo: { t: 'masonry' }, cost: 0.12 });
def('3245c', { name: 'Brick 1 x 2 x 2 with Inside Stud Holder', cat: 'Brick', w: 2, d: 1, h: 6, geo: { t: 'box', studs: true }, cost: 0.08 });
def('2453b', { name: 'Brick 1 x 1 x 5 with Solid Stud', cat: 'Brick', w: 1, d: 1, h: 15, geo: { t: 'box', studs: true }, cost: 0.12 });
def('30136', { name: 'Brick 1 x 2 Palisade (Log)', cat: 'Brick', w: 2, d: 1, h: 3, geo: { t: 'log' }, cost: 0.06 });
def('3062b', { name: 'Brick Round 1 x 1 Open Stud', cat: 'Brick', w: 1, d: 1, h: 3, geo: { t: 'round', r: 0.48, studs: true }, cost: 0.05 });
def('3941', { name: 'Brick Round 2 x 2 with Axle Hole', cat: 'Brick', w: 2, d: 2, h: 3, geo: { t: 'round', r: 0.98, studs: true }, cost: 0.10 });
def('59900', { bl: '4589b', name: 'Cone 1 x 1', cat: 'Brick', w: 1, d: 1, h: 3, geo: { t: 'cone' }, cost: 0.04 });
def('87087', { name: 'Brick 1 x 1 with Stud on 1 Side', cat: 'Brick', w: 1, d: 1, h: 3, geo: { t: 'box', studs: true, sideStud: true }, cost: 0.05 });
def('6091', { name: 'Brick Curved 1 x 2 x 1 1/3 with Curved Top', cat: 'Brick', w: 2, d: 1, h: 4, top: 'none', geo: { t: 'curvedTop' }, cost: 0.08 });

// ---------------------------------------------------------------- plates
const plate = (id, w, d, cost) => def(id, { name: `Plate ${Math.min(w, d)} x ${Math.max(w, d)}`, cat: 'Plate', w, d, h: 1, geo: { t: 'box', studs: true }, cost });
plate('3024', 1, 1, 0.03); plate('3023', 2, 1, 0.03); plate('3623', 3, 1, 0.04); plate('3710', 4, 1, 0.05);
plate('3666', 6, 1, 0.07); plate('3460', 8, 1, 0.09); plate('4477', 10, 1, 0.12); plate('60479', 12, 1, 0.15);
plate('3022', 2, 2, 0.05); plate('3021', 3, 2, 0.06); plate('3020', 4, 2, 0.07); plate('3795', 6, 2, 0.09);
plate('3034', 8, 2, 0.11); plate('3832', 10, 2, 0.14); plate('2445', 12, 2, 0.18); plate('91988', 14, 2, 0.25); plate('4282', 16, 2, 0.28);
plate('3031', 4, 4, 0.14); plate('3032', 6, 4, 0.18); plate('3035', 8, 4, 0.25); plate('3030', 10, 4, 0.35); plate('3029', 12, 4, 0.45);
plate('3958', 6, 6, 0.30); plate('3036', 8, 6, 0.38); plate('3033', 10, 6, 0.50); plate('3028', 12, 6, 0.60);
plate('41539', 8, 8, 0.55); plate('92438', 16, 8, 1.10); plate('91405', 16, 16, 2.40);
def('6141', { bl: '4073', name: 'Plate Round 1 x 1', cat: 'Plate', w: 1, d: 1, h: 1, geo: { t: 'round', r: 0.48, studs: true }, cost: 0.03 });
def('15573', { name: 'Plate 1 x 2 with 1 Stud (Jumper)', cat: 'Plate', w: 2, d: 1, h: 1, top: 'none', geo: { t: 'box', jumper: true }, cost: 0.04 });
def('87580', { name: 'Plate 2 x 2 with Center Stud (Jumper)', cat: 'Plate', w: 2, d: 2, h: 1, top: 'none', geo: { t: 'box', jumper: true }, cost: 0.06 });

// ---------------------------------------------------------------- tiles
const tile = (id, w, d, cost, name) => def(id, { name: name || `Tile ${Math.min(w, d)} x ${Math.max(w, d)}`, cat: 'Tile', w, d, h: 1, top: 'none', geo: { t: 'box', studs: false }, cost });
tile('3070b', 1, 1, 0.04); tile('3069b', 2, 1, 0.04); tile('63864', 3, 1, 0.06); tile('2431', 4, 1, 0.07);
tile('6636', 6, 1, 0.10); tile('4162', 8, 1, 0.13); tile('3068b', 2, 2, 0.07); tile('26603', 3, 2, 0.09);
tile('87079', 4, 2, 0.12); tile('69729', 6, 2, 0.18);
def('2412b', { name: 'Tile 1 x 2 Grille', cat: 'Tile', w: 2, d: 1, h: 1, top: 'none', geo: { t: 'grille' }, cost: 0.05 });
def('98138', { name: 'Tile Round 1 x 1', cat: 'Tile', w: 1, d: 1, h: 1, top: 'none', geo: { t: 'round', r: 0.48, studs: false }, cost: 0.04 });
def('14769', { name: 'Tile Round 2 x 2', cat: 'Tile', w: 2, d: 2, h: 1, top: 'none', geo: { t: 'round', r: 0.98, studs: false }, cost: 0.08 });

// ---------------------------------------------------------------- slopes
const slope = (id, w, d, h, kind, name, cost, extra = {}) => def(id, { name, cat: 'Slope', w, d, h, geo: { t: 'slope', kind }, top: 'back', cost, ...extra });
slope('3040b', 1, 2, 3, '45', 'Slope 45° 2 x 1', 0.05);
slope('3039', 2, 2, 3, '45', 'Slope 45° 2 x 2', 0.07);
slope('3037', 4, 2, 3, '45', 'Slope 45° 2 x 4', 0.13);
slope('3298', 2, 3, 3, '33', 'Slope 33° 3 x 2', 0.09);
slope('4286', 1, 3, 3, '33', 'Slope 33° 3 x 1', 0.07);
slope('60481', 1, 2, 6, '65', 'Slope 65° 2 x 1 x 2', 0.08);
slope('4460b', 1, 2, 9, '75', 'Slope 75° 2 x 1 x 3', 0.10);
slope('54200', 1, 1, 2, '30', 'Slope 30° 1 x 1 x 2/3 (Cheese)', 0.03, { top: 'none' });
slope('85984', 2, 1, 2, '30', 'Slope 30° 1 x 2 x 2/3', 0.05, { top: 'none' });
slope('3044c', 1, 2, 3, 'double', 'Slope 45° 2 x 1 Double', 0.07, { top: 'none' });
slope('3043', 2, 2, 3, 'double', 'Slope 45° 2 x 2 Double', 0.10, { top: 'none' });
slope('3045', 2, 2, 3, 'convex', 'Slope 45° 2 x 2 Double Convex', 0.10, { top: 'none' });
slope('3665', 1, 2, 3, 'inv', 'Slope Inverted 45° 2 x 1', 0.06, { top: 'all', bottom: [[0, 0]] });
slope('3660', 2, 2, 3, 'inv', 'Slope Inverted 45° 2 x 2', 0.08, { top: 'all', bottom: [[0, 0], [1, 0]] });
slope('2449', 1, 2, 9, 'inv75', 'Slope Inverted 75° 2 x 1 x 3', 0.10, { top: 'all', bottom: [[0, 0]] });
def('15068', { name: 'Slope Curved 2 x 2 x 2/3', cat: 'Slope', w: 2, d: 2, h: 2, top: 'none', geo: { t: 'slope', kind: 'curve' }, cost: 0.07 });
def('11477', { name: 'Slope Curved 2 x 1 No Studs', cat: 'Slope', w: 1, d: 2, h: 2, top: 'none', geo: { t: 'slope', kind: 'curve' }, cost: 0.05 });

// ---------------------------------------------------------------- arches
const arch = (id, w, h, name, geo, cost) => def(id, { name, cat: 'Arch', w, d: 1, h, geo: { t: 'arch', ...geo }, bottom: [[0, 0], [w - 1, 0]], cost });
arch('4490', 3, 3, 'Brick Arch 1 x 3', { span: 1, rise: 0.7 }, 0.08);
arch('3659', 4, 3, 'Brick Arch 1 x 4', { span: 2, rise: 0.95 }, 0.09);
arch('6182', 4, 6, 'Brick Arch 1 x 4 x 2', { span: 2, rise: 1.95 }, 0.14);
arch('88292', 3, 6, 'Brick Arch 1 x 3 x 2', { span: 1, rise: 1.9 }, 0.10);
def('6005', { name: 'Brick Arch 1 x 3 x 2 Curved Top', cat: 'Arch', w: 3, d: 1, h: 6, top: 'none', geo: { t: 'archTop' }, cost: 0.12 });
def('18653', { name: 'Brick Arch 1 x 3 x 2 Inverted', cat: 'Arch', w: 3, d: 1, h: 6, bottom: [[0, 0]], geo: { t: 'archInv' }, cost: 0.12 });

// ---------------------------------------------------------------- windows & doors
def('60592', { name: 'Window 1 x 2 x 2 Flat Front', cat: 'Window', w: 2, d: 1, h: 6, geo: { t: 'window' }, cost: 0.12 });
def('60593', { name: 'Window 1 x 2 x 3 Flat Front', cat: 'Window', w: 2, d: 1, h: 9, geo: { t: 'window' }, cost: 0.16 });
def('60594', { name: 'Window 1 x 4 x 3', cat: 'Window', w: 4, d: 1, h: 9, geo: { t: 'window' }, cost: 0.25 });
def('30044', { name: 'Window 1 x 2 x 2 2/3 with Rounded Top', cat: 'Window', w: 2, d: 1, h: 8, geo: { t: 'window', round: true }, cost: 0.20 });
def('57894', { name: 'Window 1 x 4 x 6 Frame with 3 Panes', cat: 'Window', w: 4, d: 1, h: 18, geo: { t: 'window', panes: 3 }, cost: 0.60 });
const glass = (id, w, h, name, g, cost) => def(id, { name, cat: 'Window', w, d: 1, h, top: 'none', bottom: 'none', insert: true, geo: { t: 'glass', ...g }, cost });
glass('60601', 2, 6, 'Glass for Window 1 x 2 x 2 Flat', {}, 0.06);
glass('60602', 2, 9, 'Glass for Window 1 x 2 x 3 Flat Front', {}, 0.08);
glass('60603', 4, 9, 'Glass for Window 1 x 4 x 3', {}, 0.12);
glass('57895', 4, 18, 'Glass for Window 1 x 4 x 6', {}, 0.20);
glass('38320', 2, 6, 'Window Pane Latticed 1 x 2 x 2', { lattice: 'grid' }, 0.18);
glass('60607', 2, 9, 'Window 1 x 2 x 3 Pane Latticed', { lattice: 'grid' }, 0.22);
glass('30046', 2, 8, 'Window 1 x 2 x 2 2/3 Pane Lattice Diamond with Rounded Top', { lattice: 'diamond', round: true }, 0.25);
def('60596', { name: 'Door Frame 1 x 4 x 6', cat: 'Door', w: 4, d: 1, h: 18, geo: { t: 'doorframe' }, bottom: [[0, 0], [3, 0]], cost: 0.30 });
def('60616b', { name: 'Door 1 x 4 x 6 Smooth', cat: 'Door', w: 4, d: 1, h: 18, top: 'none', bottom: 'none', insert: true, geo: { t: 'door', kind: 'smooth' }, cost: 0.40 });
def('60623', { name: 'Door 1 x 4 x 6 with 4 Panes and Stud Handle', cat: 'Door', w: 4, d: 1, h: 18, top: 'none', bottom: 'none', insert: true, geo: { t: 'door', kind: 'panes' }, cost: 0.55 });

// ---------------------------------------------------------------- fences
def('19121', { name: 'Fence Ornamented 1 x 4 x 2 with 4 Studs', cat: 'Fence', w: 4, d: 1, h: 6, geo: { t: 'fence', kind: 'ornament' }, cost: 0.35 });
def('15332', { name: 'Fence Spindled 1 x 4 x 2', cat: 'Fence', w: 4, d: 1, h: 6, geo: { t: 'fence', kind: 'spindle' }, cost: 0.12 });
def('3633', { name: 'Fence Lattice 1 x 4 x 1', cat: 'Fence', w: 4, d: 1, h: 3, top: 'none', geo: { t: 'fence', kind: 'lattice' }, cost: 0.08 });

// ---------------------------------------------------------------- nature
def('2417', { name: 'Plant, Leaves 6 x 5', cat: 'Plant', w: 1, d: 1, h: 2, top: 'none', geo: { t: 'plant', kind: 'leaves65' }, cost: 0.15 });
def('2423', { name: 'Plant, Leaves 4 x 3', cat: 'Plant', w: 1, d: 1, h: 2, top: 'none', geo: { t: 'plant', kind: 'leaves43' }, cost: 0.08 });
def('6064', { name: 'Plant, Bush 2 x 2 x 4', cat: 'Plant', w: 2, d: 2, h: 12, top: 'none', geo: { t: 'plant', kind: 'bush' }, cost: 0.45 });
def('32607', { name: 'Plant, Plate 1 x 1 Round with 3 Leaves', cat: 'Plant', w: 1, d: 1, h: 1, top: 'all', geo: { t: 'plant', kind: 'leaf3' }, cost: 0.04 });
def('24866', { name: 'Plant, Flower, Plate Round 1 x 1 with 5 Petals', cat: 'Plant', w: 1, d: 1, h: 1, top: 'none', geo: { t: 'plant', kind: 'flower' }, cost: 0.04 });

// ---------------------------------------------------------------- furniture & accessories
const acc = (id, w, d, h, name, geo, cost, extra = {}) => def(id, { name, cat: 'Accessory', w, d, h, geo, top: 'none', cost, ...extra });
acc('11062', 2, 2, 21, 'Lamp Post 2 x 2 x 7', { t: 'lamppost' }, 0.85);
acc('4079b', 2, 2, 5, 'Seat / Chair 2 x 2', { t: 'chair' }, 0.12);
acc('37762', 1, 1, 3, 'Equipment Candlestick', { t: 'candle' }, 0.05);
acc('95228', 1, 1, 3, 'Equipment Bottle', { t: 'bottle' }, 0.10);
acc('3899', 1, 1, 2, 'Equipment Cup / Mug', { t: 'cup' }, 0.06);
acc('4528', 1, 1, 1, 'Equipment Frying Pan', { t: 'pan' }, 0.10);
acc('2489', 2, 2, 6, 'Barrel 2 x 2 x 2', { t: 'barrel' }, 0.20);
acc('30150', 4, 3, 5, 'Box / Crate with Handholds 3 x 4 x 1 2/3', { t: 'crate' }, 0.30);
acc('4738c', 4, 2, 4, 'Treasure Chest Bottom', { t: 'chestBase' }, 0.25);
acc('4739a', 4, 2, 3, 'Treasure Chest Lid', { t: 'chestLid' }, 0.25, { insert: true, bottom: 'none' });
acc('92410', 3, 2, 6, 'Cupboard 2 x 3 x 2', { t: 'cupboard' }, 0.30, { top: 'all' });
acc('4533', 3, 1, 6, 'Cupboard 2 x 3 x 2 Door', { t: 'cupDoor' }, 0.12, { insert: true, bottom: 'none' });
acc('4536', 3, 1, 3, 'Cupboard 2 x 3 Drawer', { t: 'drawer' }, 0.12, { insert: true, bottom: 'none' });
acc('37775', 1, 1, 3, 'Wave / Flame Small with Pin', { t: 'flame' }, 0.10);
acc('6126b', 1, 1, 3, 'Wave / Flame Rounded with Base Rim', { t: 'flame2' }, 0.10);
acc('298c02', 1, 2, 2, 'Lever Small Base with Black Lever', { t: 'lever' }, 0.08);
acc('90398', 1, 1, 5, 'Minifig Trophy Statuette', { t: 'statuette' }, 0.20);
acc('24093', 2, 1, 1, 'Book Cover', { t: 'book' }, 0.15);

// ---------------------------------------------------------------- minifigure parts (only used inside a fig)
const fig = (id, name, geo, cost) => def(id, { name, cat: 'Minifig', w: 1, d: 1, h: 3, geo, cost, figPart: true });
fig('3626cpr0001', 'Minifig Head Standard Grin', { t: 'head' }, 0.18);
fig('3626cpr0895', 'Minifig Head Skeleton, Skull Print', { t: 'head', skull: true }, 0.35);
fig('3626c', 'Minifig Head (Plain)', { t: 'head', plain: true }, 0.18);
fig('62810', 'Hair Short, Tousled with Side Part', { t: 'hair', style: 'short' }, 0.35);
fig('11256', 'Hair Short Wavy with Side Part', { t: 'hair', style: 'short' }, 0.35);
fig('85974', 'Hair Mid-Length with Part over Front of Right Shoulder', { t: 'hair', style: 'long' }, 0.45);
fig('88283', 'Hair Mid-Length Tousled with Center Part', { t: 'hair', style: 'mid' }, 0.45);
fig('90396', 'Hair Mid-Length Wavy with Center Part', { t: 'hair', style: 'mid' }, 0.45);
fig('15503', 'Hair Beehive Style with Sideways Fringe', { t: 'hair', style: 'beehive' }, 0.60);
fig('99240', 'Hair Swept Back Into Bun', { t: 'hair', style: 'bun' }, 0.45);
fig('3901', 'Hair, Smooth', { t: 'hair', style: 'smooth' }, 0.30);
fig('92746', 'Hair Tousled and Layered', { t: 'hair', style: 'messy' }, 0.40);
fig('23187', 'Hair Mid-length with Side Part, Wavy', { t: 'hair', style: 'mid' }, 0.45);
fig('87990', 'Hair Ponytail and Swept Sideways Fringe', { t: 'hair', style: 'pony' }, 0.35);
fig('27186', 'Hair Large High Bun', { t: 'hair', style: 'beehive' }, 0.50);
fig('92081', 'Hair Combed Back', { t: 'hair', style: 'short' }, 0.30);
// Torso / legs ids encode the arm, hand and leg colours (Rebrickable style)
const TORSO_ARMS = { '22': 'red', '28': 'blue', '01': 'yellow', '03': 'black', '27': 'white', '10': 'darkRed', '19': 'reddishBrown', '12': 'dbg', '26': 'tan', '05': 'darkBlue', '25': 'sandGreen', '31': 'green', '24': 'sandBlue', '14': 'lbg' };
const HANDS = { '01': 'yellow', '03': 'black', '27': 'white' };
const LEGS = { '28': 'blue', '22': 'red', '03': 'black', '05': 'darkBlue', '10': 'darkRed', '12': 'dbg', '19': 'reddishBrown', '25': 'sandGreen', '26': 'tan', '27': 'white', '07': 'darkBrown', '14': 'lbg', '24': 'sandBlue' };
const CN = { red: 'Red', blue: 'Blue', black: 'Black', white: 'White', darkRed: 'Dark Red', reddishBrown: 'Reddish Brown', dbg: 'Dark Bluish Gray', lbg: 'Light Bluish Gray', tan: 'Tan', darkBlue: 'Dark Blue', sandGreen: 'Sand Green', sandBlue: 'Sand Blue', green: 'Green', yellow: 'Yellow', darkBrown: 'Dark Brown' };
export function torsoId(arms, hands) {
  const a = Object.keys(TORSO_ARMS).find((k) => TORSO_ARMS[k] === arms);
  const h = Object.keys(HANDS).find((k) => HANDS[k] === hands);
  const id = `973c${a}h${h}`;
  if (!P[id]) fig(id, `Torso Plain, ${CN[arms]} Arms, ${CN[hands]} Hands`, { t: 'torso', arms, hands }, 0.40);
  return id;
}
export function legsId(legs) {
  const l = Object.keys(LEGS).find((k) => LEGS[k] === legs);
  const id = `970c${l}`;
  if (!P[id]) fig(id, `Hips and ${CN[legs]} Legs`, { t: 'legs', legs }, 0.30);
  return id;
}
// the composite used for placing a whole minifigure in the model
def('fig', { name: 'Minifigure', cat: 'Minifig', w: 2, d: 1, h: 13, top: 'none', geo: { t: 'fig' }, composite: true, cost: 0 });

// ---------------------------------------------------------------- base
export const PARTS = P;
export function part(id) {
  const p = P[id];
  if (!p) throw new Error('Unknown part ' + id);
  return p;
}

// Footprint & connectivity helpers -------------------------------------------------
export function dims(p, r) {
  return (r & 1) ? { w: p.d, d: p.w } : { w: p.w, d: p.d };
}

// local cell (u,v) -> world offset (dx,dz) from the placement's min corner, for rotation r
export function rotCell(p, r, u, v) {
  // rotate the cell centre (u+.5, v+.5) about the footprint centre
  const cx = u + 0.5 - p.w / 2, cz = v + 0.5 - p.d / 2;
  let x, z;
  switch (r & 3) {
    case 0: x = cx; z = cz; break;
    case 1: x = cz; z = -cx; break;
    case 2: x = -cx; z = -cz; break;
    default: x = -cz; z = cx; break;
  }
  const { w, d } = dims(p, r);
  return [Math.floor(x + w / 2), Math.floor(z + d / 2)];
}

function cellsOf(spec, p) {
  if (spec === 'none') return [];
  if (spec === 'all') {
    const out = [];
    for (let u = 0; u < p.w; u++) for (let v = 0; v < p.d; v++) out.push([u, v]);
    return out;
  }
  if (spec === 'back') {
    const out = [];
    for (let u = 0; u < p.w; u++) out.push([u, 0]);
    return out;
  }
  return spec;
}
export function studCells(p) { return cellsOf(p.top, p); }
export function bottomCells(p) { return cellsOf(p.bottom, p); }
