// "1120 Westchester Place" — the Murder House (American Horror Story, season 1) in real LEGO parts.
//
// Exterior after the real Rosenheim Mansion (Los Angeles, 1908): red-brown brick, pale stone trim,
// a bowed & turreted stair hall lit by nine Tiffany stained-glass panels, a carved stone entrance
// portico with a curved brick balcony above, steep slate roof with parapet gables, tall chimneys,
// and a broad lawn on a knoll edged by low brick walls with a stepped path to the portico.
// Interior is imagined from the show: Ben's office, the living room fireplace, the kitchen where
// Moira works, the grand staircase, Violet's room, the nursery, the attic with the Rubber Man, and
// Dr. Charles Montgomery's basement laboratory. Backyard gazebo over Moira's grave.
import { ModelBuilder, rectCells, rectRing } from '../core/builder.js';
import {
  Y, HX0, HX1, HZ0, HZF, WA, WC, TUR, POR, C, turretRing, turretFront, turretInside, turretDisk,
  outline, footprint, key, cellSet, Local,
} from './common.js';
import * as F from './furniture.js';

export function buildHouse() {
  const mb = new ModelBuilder(1120);
  const trim = new Map();                 // "x,y,z" (course start) -> colour override
  const T = (x, y, z, c = C.trim) => trim.set(x + ',' + y + ',' + z, c);
  const wallColor = (x, y, z) => trim.get(x + ',' + y + ',' + z) ?? C.brick;
  const mottle = { on: C.brick, color: C.mottle, chance: 0.1, id: '98283' };

  // ------------------------------------------------------------- helpers
  const win = (x, y, z, r, kind = 'l') => {
    // window + pane, 1x2 footprint (r: 0 faces +z, 1 +x, 2 -z, 3 -x)
    if (kind === 'round') { mb.add('30044', C.frame, x, y, z, r); mb.add('30046', C.frame, x, y, z, r); return 8; }
    mb.add('60592', C.frame, x, y, z, r);
    if (kind === 'l') mb.add('38320', C.frame, x, y, z, r);
    else if (kind === 'b') mb.add('60601', 'transBlack', x, y, z, r);
    else mb.add('60601', 'transClear', x, y, z, r);
    return 6;
  };
  // mark stone trim around an opening: sill course below and lintel course above, one cell wider
  const along = (r) => ((r & 1) ? [0, 1] : [1, 0]);
  const trimOpening = (x, z, r, w, yBottom, yTop, sill = true) => {
    // stone lintel one stud wider than the opening, stone sill as wide as the opening
    const [dx, dz] = along(r);
    for (let i = 0; i < w; i++) {
      const cx = x + dx * i, cz = z + dz * i;
      if (sill) T(cx, yBottom - 3, cz);
      T(cx, yTop, cz);
    }
  };
  const tallWindow = (x, y, z, r) => { win(x, y, z, r, 'l'); win(x, y + 6, z, r, 'l'); trimOpening(x, z, r, 2, y, y + 12); };
  const quoins = (x, z, dirs, y0, y1, first = 0) => {
    // stone quoins: every other course a 1x2 stone block turning the corner
    for (let y = y0, k = first; y < y1; y += 3, k++) {
      if (k % 2) continue;
      T(x, y, z);
      const [dx, dz] = dirs[(k >> 1) % 2];
      T(x + dx, y, z + dz);
    }
  };

  // Tiffany stained glass: stack of trans plates in a pattern (each panel is different)
  const PAL = [
    ['transYellow', 'transOrange', 'transGreen', 'transYellow', 'transRed', 'transGreen'],
    ['transLightBlue', 'transClear', 'transLightBlue', 'transDarkBlue', 'transLightBlue', 'transClear'],
    ['transOrange', 'transYellow', 'transRed', 'transOrange', 'transYellow', 'transGreen'],
    ['transGreen', 'transLightBlue', 'transGreen', 'transYellow', 'transGreen', 'transClear'],
    ['transRed', 'transOrange', 'transYellow', 'transClear', 'transYellow', 'transOrange'],
    ['transDarkBlue', 'transLightBlue', 'transDarkBlue', 'transLightBlue', 'transDarkBlue', 'transClear'],
    ['transYellow', 'transGreen', 'transClear', 'transGreen', 'transYellow', 'transOrange'],
    ['transDarkBlue', 'transRed', 'transOrange', 'transRed', 'transDarkBlue', 'transYellow'],
    ['transClear', 'transLightBlue', 'transYellow', 'transLightBlue', 'transClear', 'transGreen'],
  ];
  let panelNo = 0;
  const tiffany = (cells, y0, h) => {
    const pal = PAL[panelNo++ % PAL.length];
    for (let j = 0; j < h; j++) {
      const lead = h > 6 && j % 4 === 3;                    // black leading between the glass panes
      if (lead) {
        const [[x0, z0], [x1, z1]] = cells.length === 2 ? cells : [cells[0], cells[0]];
        if (cells.length === 2) mb.add('3023', 'black', Math.min(x0, x1), y0 + j, Math.min(z0, z1), x0 === x1 ? 1 : 0);
        else mb.add('3024', 'black', x0, y0 + j, z0);
        continue;
      }
      if (cells.length === 2 && j % 3 !== 1) {
        const [[x0, z0], [x1, z1]] = cells;
        const r = x0 === x1 ? 1 : 0;
        mb.add('3023', pal[j % pal.length], Math.min(x0, x1), y0 + j, Math.min(z0, z1), r);
      } else {
        cells.forEach(([x, z], i) => mb.add('3024', pal[(j + i * 2 + 1) % pal.length], x, y0 + j, z));
      }
    }
    for (const [x, z] of cells) { T(x, y0 - 3, z); T(x, y0 + h, z); }
  };

  // ============================================================= BAG 1: the grounds
  mb.section('Base plates', { bag: 1, level: 'base', view: 'front', maxStep: 9 });
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) mb.add('91405', C.lawn, 16 * i, 0, 16 * k);

  mb.section('Sidewalk', { bag: 1, level: 'garden', view: 'front' });
  mb.fill({ x0: 0, z0: 45, x1: 48, z1: 48 }, 1, C.walk, { tiles: true });

  // ============================================================= BAG 1-2: basement
  const fp = footprint();
  const fpSet = cellSet(fp);
  const ext = outline();
  const extSet = cellSet(ext);

  mb.section('Basement floor', { bag: 1, level: 'basement', view: 'back' });
  // concrete floor: dark grey tiles inside the walls, stud spots left for the lab furniture
  const labSpots = [];
  const spot = (x0, z0, x1, z1) => labSpots.push(...rectCells({ x0, z0, x1, z1 }));
  spot(19, 20, 21, 26);   // operating table
  spot(20, 18, 22, 19);   // Dr. Montgomery
  spot(7, 12, 13, 13);    // jar shelf
  spot(33, 12, 35, 14);   // boiler
  spot(26, 12, 30, 14);   // chest
  spot(36, 23, 40, 24);   // jar shelf 2
  spot(10, 22, 12, 24);   // barrel
  const bsmtInner = fp.filter(([x, z]) => !extSet.has(key(x, z)) && z >= HZ0);
  const innerWalls = new Set([...rectCells({ x0: 16, z0: 11, x1: 17, z1: 29 }), ...rectCells({ x0: 31, z0: 11, x1: 32, z1: 29 })].map(([x, z]) => key(x, z)));
  mb.reserve(labSpots, 1, 2);
  mb.reserve([...innerWalls].map((k) => k.split(',').map(Number)), 1, 2);
  mb.fill(bsmtInner, 1, 'dbg', { tiles: true });
  mb.unreserve(labSpots, 1, 2);
  mb.unreserve([...innerWalls].map((k) => k.split(',').map(Number)), 1, 2);

  mb.section('Basement walls', { bag: 1, level: 'basement', view: 'front', maxStep: 14 });
  // windows (y 10..16) peeking over the front lawn, side windows for the lab
  const bw = [[8, Y.bsmt + 9, WA.zf, 0], [12, Y.bsmt + 9, WA.zf, 0], [34, Y.bsmt + 9, WC.zf, 0], [38, Y.bsmt + 9, WC.zf, 0],
    [HX0, Y.bsmt + 9, 14, 3], [HX0, Y.bsmt + 9, 24, 3], [HX1 - 1, Y.bsmt + 9, 14, 1], [HX1 - 1, Y.bsmt + 9, 24, 1]];
  for (const [x, y, z, r] of bw) { win(x, y, z, r, 'b'); trimOpening(x, z, r, 2, y, y + 6, false); }
  // stone quoins on the front corners, full height
  for (const [y0, y1] of [[Y.bsmt, Y.gSlab], [Y.gWall, Y.uSlab], [Y.uWall, Y.aSlab]]) {
    quoins(WA.x0, WA.zf, [[1, 0], [0, -1]], y0, y1);
    quoins(WA.x1 - 1, WA.zf, [[-1, 0], [0, -1]], y0, y1, 1);
    quoins(WC.x0, WC.zf, [[1, 0], [0, -1]], y0, y1, 1);
    quoins(WC.x1 - 1, WC.zf, [[-1, 0], [0, -1]], y0, y1);
  }
  // basement outline = ground floor outline + the full turret ring front + portico plinth
  const bsmtWalls = [...ext];
  const bInner = [...innerWalls].map((k) => k.split(',').map(Number));
  const doorGap = (cells, k) => cells.filter(([x, z]) => !(k < 4 && ((x === 16 || x === 31) && (z >= 21 && z <= 23))));
  mb.wall((k) => [...bsmtWalls, ...doorGap(bInner, k)], Y.bsmt, 5, wallColor, { texture: mottle });

  // ------------------------------------------------------------- portico plinth & porch steps
  mb.section('Portico plinth & porch steps', { bag: 2, level: 'garden', view: 'front' });
  const porRing = rectRing({ x0: POR.x0, z0: POR.z0, x1: POR.x1, z1: POR.z1 }, { back: true });
  for (let k = 0; k < 5; k++) for (const [x, z] of porRing) if ((x === POR.x0 || x === POR.x1 - 1) && (z === POR.z1 - 1)) T(x, Y.bsmt + 3 * k, z);
  mb.wall(porRing, Y.bsmt, 5, wallColor);
  // three solid steps, 4 wide, climbing from the path (surface 9) to the porch (surface 18)
  const steps = [[38, 12], [36, 15], [34, 18]];              // [z of the step, tread surface]
  const stepCells = (zs) => rectCells({ x0: 27, z0: zs, x1: 31, z1: zs + 2 });
  const cheek = (zs) => [[26, zs], [26, zs + 1], [31, zs], [31, zs + 1]];
  for (let c = 0; c < 5; c++) {
    const yy = Y.bsmt + 3 * c;
    const m = [];
    for (const [zs, S] of steps) if (yy + 3 <= S - 1) m.push(...stepCells(zs), ...cheek(zs));
    if (m.length) mb.course(m, yy, (x) => (x === 26 || x === 31 ? C.trim : C.brick));
  }
  for (const [zs, S] of steps) {
    const base = Y.bsmt + 3 * Math.floor((S - 2) / 3);
    for (let yy = base; yy < S - 1; yy++) { mb.line(27, yy, zs, 4, 'x', 'dbg'); mb.line(27, yy, zs + 1, 4, 'x', 'dbg'); }
    mb.fill(stepCells(zs), S - 1, C.path, { tiles: true });
    for (const x of [26, 31]) for (let yy = base; yy < S; yy++) mb.line(x, yy, zs, 2, 'z', C.trim, yy === S - 1 ? 'tile' : 'plate');
  }

  // ============================================================= BAG 2: basement lab
  mb.section('Dr. Montgomery\'s basement laboratory', { bag: 2, level: 'basement', view: 'back', maxStep: 8 });
  F.operatingTable(mb, 19, 1, 20, 0);
  mb.add('37762', 'white', 19, 5, 25); mb.add('95228', 'transGreen', 20, 5, 25);
  mb.add('3626cpr0895', 'white', 20, 5, 24, 0, { loose: true });
  F.jarShelf(mb, 7, 1, 12, 0, 6, 0);
  F.jarShelf(mb, 36, 1, 23, 0, 4, 3);
  F.boiler(mb, 33, 1, 12, 0);
  F.chest(mb, 26, 1, 12, 0, 'reddishBrown');
  mb.add('2489', 'reddishBrown', 10, 1, 22);

  // ============================================================= BAG 3: ground floor
  mb.section('Ground floor slab', { bag: 3, level: 'ground', view: 'top', maxStep: 10 });
  const porCells = rectCells({ x0: POR.x0, z0: POR.z0, x1: POR.x1, z1: POR.z1 });
  const slabCells = [...fp, ...porCells];
  const slabSet = cellSet(slabCells);
  const touchesEdge = (x, z, w, d) => {
    for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) if (extSet.has(key(x + i, z + k)) || !fpSet.has(key(x + i, z + k))) return true;
    return false;
  };
  mb.fill(slabCells, Y.gSlab, (x, z, w, d) => (touchesEdge(x, z, w, d) ? C.trim : 'dbg'), { needSupport: true, global: true });

  // walls
  mb.section('Ground floor walls, windows & Tiffany glass', { bag: 3, level: 'ground', view: 'front', maxStep: 14 });
  // front door inside the portico
  mb.add('60596', C.frame, 27, Y.gWall, HZF, 0);
  mb.add('60623', 'reddishBrown', 27, Y.gWall, HZF, 0);
  trimOpening(27, HZF, 0, 4, Y.gWall, Y.gWall + 18, false);
  // wing A: three tall leaded windows with stone mullions
  for (const x of [7, 10, 13]) tallWindow(x, Y.gWall + 3, WA.zf, 0);
  // wing C (Ben's office): two tall windows
  for (const x of [34, 38]) tallWindow(x, Y.gWall + 3, WC.zf, 0);
  // side walls
  for (const z of [13, 25]) tallWindow(HX0, Y.gWall + 3, z, 3);
  for (const z of [13, 25]) tallWindow(HX1 - 1, Y.gWall + 3, z, 1);
  // turret: three Tiffany panels (ground floor tier)
  tiffany([[18, 32]], Y.gWall + 3, 12);
  tiffany([[20, 33], [21, 33]], Y.gWall + 3, 12);
  tiffany([[23, 32]], Y.gWall + 3, 12);

  const gInner = (k) => {
    const cells = [];
    const door = (k < 5);
    for (let z = 11; z <= 28; z++) {
      if (!(door && z >= 22 && z <= 24)) cells.push([16, z]);          // living room | foyer
      if (!(door && ((z >= 22 && z <= 24) || (z >= 13 && z <= 15)))) cells.push([31, z]); // foyer | office & kitchen
    }
    for (let x = 32; x <= 40; x++) if (!(door && x >= 35 && x <= 37)) cells.push([x, 19]);          // office | kitchen
    for (let x = 17; x <= 30; x++) if (!(k < 6 && x >= 19 && x <= 28)) cells.push([x, 19]);         // foyer | dining (wide arch)
    cells.push([17, 28], [24, 28]);                                                                 // stair-hall columns
    return cells;
  };
  // chimney-side fireplace wall, quoins on the portico
  mb.wall((k) => [...ext, ...gInner(k)], Y.gWall, 7, wallColor, { texture: mottle });

  // ------------------------------------------------------------- portico (carved stone entrance)
  mb.section('Stone portico', { bag: 3, level: 'ground', view: 'front' });
  // Tudor arch: pillars, inverted slopes as chamfered corners, lintel
  const PC = C.trim;
  // side windows in the portico walls
  win(26, Y.gWall + 6, 30, 3, 'l'); win(31, Y.gWall + 6, 30, 1, 'l');
  mb.wall([[26, 33], [26, 32], [26, 31], [26, 30], [31, 33], [31, 32], [31, 31], [31, 30]], Y.gWall, 4, PC);
  mb.add('3665', PC, 26, Y.gWall + 12, 33, 1);
  mb.add('3665', PC, 30, Y.gWall + 12, 33, 3);
  mb.wall([[26, 30], [26, 31], [26, 32], [31, 30], [31, 31], [31, 32]], Y.gWall + 12, 1, PC);
  mb.wall(rectRing({ x0: 26, z0: 30, x1: 32, z1: 34 }, { back: true }), Y.gWall + 15, 2, PC);
  // porch floor tiles, spot for Constance at the door
  mb.reserve([[28, 32], [29, 32]], Y.gWall, Y.gWall + 1);
  mb.fill(rectCells({ x0: 27, z0: 30, x1: 31, z1: 33 }), Y.gWall, (x, z) => ((x + z) % 2 ? 'white' : 'black'), { tiles: true, sizes: [[1, 1, '3070b']] });
  mb.unreserve([[28, 32], [29, 32]], Y.gWall, Y.gWall + 1);

  // ------------------------------------------------------------- grand staircase in the turret
  mb.section('Grand staircase', { bag: 4, level: 'ground', view: 'back', maxStep: 10 });
  const stairPath = [[18, 26], [18, 27], [18, 28], [18, 29], [18, 30], [19, 31], [20, 32], [21, 32], [22, 31], [23, 30], [23, 29]];
  const stepTop = (i) => Y.gWall + 1 + 2 * (i + 1);        // surface of step i
  const stairSet = cellSet(stairPath);
  for (let c = 0; c < 7; c++) {
    const yy = Y.gWall + 3 * c;
    const m = stairPath.filter((_, i) => stepTop(i) - 1 >= yy + 3);
    if (m.length) mb.course(m, yy, C.wood);
  }
  stairPath.forEach(([x, z], i) => {
    const top = stepTop(i) - 1;
    const base = Y.gWall + 3 * Math.floor((top - Y.gWall) / 3);
    for (let yy = base; yy < top; yy++) mb.add('3024', C.wood, x, yy, z);
    mb.add('3070b', 'darkBrown', x, top, z);
  });

  // ------------------------------------------------------------- ground floor rooms
  mb.section('Floors: parquet, rugs & kitchen tiles', { bag: 4, level: 'ground', view: 'back', maxStep: 14 });
  const gFloor = Y.gWall;       // tiles sit on the slab at y = 17
  const keep = [];              // stud spots for furniture / figures
  const K = (x0, z0, x1, z1) => keep.push(...rectCells({ x0, z0, x1, z1 }));
  // living room
  K(7, 18, 9, 22); K(11, 18, 13, 22); K(9, 14, 11, 16); K(9, 24, 11, 26); K(11, 25, 13, 26); K(13, 13, 15, 16);
  // foyer
  K(24, 25, 26, 27);
  // office
  K(35, 21, 39, 25); K(39, 25, 41, 28); K(33, 25, 35, 29); K(36, 27, 38, 28);
  // dining
  K(20, 12, 28, 19);
  // kitchen
  K(39, 11, 41, 18); K(33, 11, 35, 13); K(35, 14, 37, 15);
  mb.reserve(keep, gFloor, gFloor + 1);
  const room = (x0, z0, x1, z1, col) => mb.fill(rectCells({ x0, z0, x1, z1 }).filter(([x, z]) => !stairSet.has(key(x, z))), gFloor, col, { tiles: true });
  room(9, 20, 13, 24, 'darkRed');                              // rug by the fireplace
  room(7, 10, 16, 31, 'reddishBrown');                         // living room
  room(17, 20, 31, 29, 'reddishBrown');                        // foyer & vestibule
  mb.fill(turretInside.filter(([x, z]) => !stairSet.has(key(x, z))), gFloor, 'reddishBrown', { tiles: true });
  room(17, 10, 31, 19, 'medNougat');                           // dining room
  room(32, 20, 41, 30, 'darkTan');                             // Ben's office
  mb.fill(rectCells({ x0: 32, z0: 10, x1: 41, z1: 19 }), gFloor, (x, z) => (((x >> 1) + (z >> 1)) % 2 ? 'black' : 'white'), { tiles: true, sizes: [[2, 2, '3068b'], [2, 1, '3069b'], [1, 1, '3070b']] });
  mb.unreserve(keep, gFloor, gFloor + 1);

  mb.section('Living room & fireplace', { bag: 4, level: 'ground', view: 'back', maxStep: 10 });
  F.fireplace(mb, 7, gFloor, 18, 1);
  F.sofa(mb, 11, gFloor, 18, 3, 'darkRed', 'tan');
  F.chair(mb, 9, gFloor, 14, 0, 'darkRed');
  F.chair(mb, 9, gFloor, 24, 2, 'darkRed');
  F.bookcase(mb, 13, gFloor, 13, 3, 'reddishBrown', 'transLightBlue', 1);

  mb.section('Foyer', { bag: 4, level: 'ground', view: 'back' });
  F.table(mb, 24, gFloor, 25, 2, 2, 0, 'reddishBrown', false);
  mb.add('3062b', 'transYellow', 24, gFloor + 4, 25); mb.add('59900', 'darkRed', 24, gFloor + 7, 25); // table lamp
  mb.add('3070b', 'reddishBrown', 25, gFloor + 4, 25); mb.add('3069b', 'reddishBrown', 24, gFloor + 4, 26);

  mb.section('Ben\'s office', { bag: 4, level: 'ground', view: 'back' });
  F.desk(mb, 35, gFloor, 21, 0);
  F.bookcase(mb, 39, gFloor, 25, 3, 'reddishBrown', 'transLightBlue', 2);
  F.sofa(mb, 33, gFloor, 25, 1, 'darkBrown', 'darkRed');   // the patient couch

  mb.section('Dining room', { bag: 4, level: 'ground', view: 'back' });
  F.table(mb, 22, gFloor, 13, 4, 4, 0, 'reddishBrown', 'reddishBrown');
  F.chair(mb, 20, gFloor, 14, 1); F.chair(mb, 26, gFloor, 14, 3);
  F.chair(mb, 22, gFloor, 17, 2); F.chair(mb, 24, gFloor, 17, 2);

  mb.section('Kitchen', { bag: 4, level: 'ground', view: 'back' });
  F.counter(mb, 39, gFloor, 11, 3, 7, { layout: { 0: 'cab', 3: 'stove', 5: 'sink' } });
  F.fridge(mb, 33, gFloor, 11, 0);

  // ============================================================= BAG 5: upper floor
  mb.section('Upper floor slab & balcony', { bag: 5, level: 'upper', view: 'top', maxStep: 10 });
  const well = cellSet([...turretDisk.filter(([, z]) => z >= HZF)]);
  const uSlab = slabCells.filter(([x, z]) => !well.has(key(x, z)) || extSet.has(key(x, z)));
  mb.add('3460', C.wood, 17, Y.uSlab, 28, 0);          // beam over the stair-hall columns
  mb.fill(uSlab, Y.uSlab, (x, z, w, d) => (touchesEdge(x, z, w, d) ? C.trim : 'dbg'), { needSupport: true, global: true });

  mb.section('Upper floor walls, windows & Tiffany glass', { bag: 5, level: 'upper', view: 'front', maxStep: 14 });
  mb.add('60596', C.frame, 27, Y.uWall, HZF, 0);
  mb.add('60616b', 'transClear', 27, Y.uWall, HZF, 0);
  for (const x of [8, 12]) tallWindow(x, Y.uWall + 3, WA.zf, 0);
  for (const x of [33, 36, 39]) tallWindow(x, Y.uWall + 3, WC.zf, 0);
  for (const z of [13, 25]) tallWindow(HX0, Y.uWall + 3, z, 3);
  for (const z of [13, 25]) tallWindow(HX1 - 1, Y.uWall + 3, z, 1);
  tiffany([[18, 32]], Y.uWall + 3, 12);
  tiffany([[20, 33], [21, 33]], Y.uWall + 3, 12);
  tiffany([[23, 32]], Y.uWall + 3, 12);

  const uInner = (k) => {
    const cells = [];
    const door = k < 5;
    for (let z = 11; z <= 28; z++) {
      if (!(door && z >= 23 && z <= 24)) cells.push([16, z]);
      if (!(door && z >= 23 && z <= 24)) cells.push([31, z]);
    }
    for (let z = 20; z <= 28; z++) if (!(door && z >= 22 && z <= 23)) cells.push([25, z]);
    for (let x = 17; x <= 30; x++) if (!(door && x >= 20 && x <= 21) && x !== 25) cells.push([x, 19]);
    cells.push([25, 19]);
    for (let x = 32; x <= 40; x++) if (!(door && x >= 35 && x <= 36)) cells.push([x, 19]);
    cells.push([17, 28], [24, 28]);
    return cells;
  };
  mb.wall((k) => [...ext, ...uInner(k)], Y.uWall, 6, wallColor, { texture: mottle });

  mb.section('Curved brick balcony', { bag: 5, level: 'upper', view: 'front' });
  const bal = [[26, 30], [26, 31], [26, 32], [26, 33], [27, 33], [28, 33], [29, 33], [30, 33], [31, 33], [31, 32], [31, 31], [31, 30]];
  mb.course(bal, Y.uWall, C.brick);
  mb.add('6091', C.brick, 27, Y.uWall + 3, 33, 0); mb.add('6091', C.brick, 29, Y.uWall + 3, 33, 0);
  mb.add('6091', C.brick, 26, Y.uWall + 3, 31, 3); mb.add('6091', C.brick, 31, Y.uWall + 3, 31, 1);
  for (const [x, z] of [[26, 33], [31, 33], [26, 30], [31, 30]]) mb.add('3070b', C.trim, x, Y.uWall + 3, z);
  mb.fill(rectCells({ x0: 27, z0: 30, x1: 31, z1: 33 }), Y.uWall, C.trim, { tiles: true });

  // ============================================================= BAG 6: upper rooms
  mb.section('Upper floors & railing', { bag: 6, level: 'upper', view: 'back', maxStep: 14 });
  const uFloor = Y.uWall;
  const keep2 = [];
  const K2 = (x0, z0, x1, z1) => keep2.push(...rectCells({ x0, z0, x1, z1 }));
  K2(7, 16, 13, 20); K2(7, 14, 9, 16); K2(7, 20, 9, 22);                              // master bedroom
  K2(35, 26, 41, 28); K2(33, 21, 37, 25); K2(37, 22, 39, 23);                          // Violet
  K2(26, 20, 29, 22); K2(27, 24, 29, 25); K2(29, 26, 31, 28);                          // study
  K2(18, 12, 22, 15); K2(23, 12, 25, 14); K2(27, 12, 31, 15);                          // nursery
  K2(37, 11, 41, 14); K2(33, 11, 34, 13); K2(35, 11, 36, 12);                          // bathroom
  K2(18, 28, 22, 29);                                                                  // railing
  mb.reserve(keep2, uFloor, uFloor + 1);
  const uroom = (x0, z0, x1, z1, col) => mb.fill(rectCells({ x0, z0, x1, z1 }), uFloor, col, { tiles: true });
  uroom(7, 10, 16, 32, 'darkRed');                       // master bedroom carpet
  uroom(17, 20, 25, 29, 'reddishBrown');                 // hall
  uroom(26, 20, 31, 29, 'medNougat');                    // study
  uroom(17, 10, 31, 19, 'sandGreen');                    // nursery
  uroom(32, 20, 41, 30, 'darkBlue');                     // Violet's room
  mb.fill(rectCells({ x0: 32, z0: 10, x1: 41, z1: 19 }), uFloor, (x, z) => (((x >> 1) + (z >> 1)) % 2 ? 'white' : 'lbg'), { tiles: true, sizes: [[2, 2, '3068b'], [2, 1, '3069b'], [1, 1, '3070b']] });
  mb.unreserve(keep2, uFloor, uFloor + 1);
  mb.add('15332', C.wood, 18, uFloor, 28, 0);

  mb.section('Master bedroom', { bag: 6, level: 'upper', view: 'back' });
  F.bed(mb, 7, uFloor, 16, 1, { frame: 'reddishBrown', blanket: 'darkRed' });
  F.nightstand(mb, 7, uFloor, 14, 1);
  F.nightstand(mb, 7, uFloor, 20, 1);
  mb.section('Violet\'s room', { bag: 6, level: 'upper', view: 'back' });
  F.bed(mb, 35, uFloor, 26, 3, { W: 2, D: 6, frame: 'black', blanket: 'darkBlue' });
  F.desk(mb, 33, uFloor, 21, 0, 'black');
  mb.section('Upstairs study', { bag: 6, level: 'upper', view: 'back' });
  F.bookcase(mb, 26, uFloor, 20, 0, 'reddishBrown', null, 2);
  F.chair(mb, 29, uFloor, 26, 2, 'darkRed');
  mb.section('The nursery', { bag: 6, level: 'upper', view: 'back' });
  F.crib(mb, 18, uFloor, 12, 0);
  F.chair(mb, 23, uFloor, 12, 0, 'reddishBrown');
  mb.add('30150', 'medNougat', 27, uFloor, 12, 0);
  mb.section('Bathroom', { bag: 6, level: 'upper', view: 'back' });
  F.bathtub(mb, 37, uFloor, 11, 0);
  F.toilet(mb, 33, uFloor, 11, 0);
  F.pedestalSink(mb, 35, uFloor, 11, 0);

  // ============================================================= BAG 7: attic, turret & roofs
  mb.section('Attic floor', { bag: 7, level: 'attic', view: 'top', maxStep: 10 });
  mb.add('3460', C.wood, 17, Y.aSlab, 28, 0);
  const atticFrom = mb.parts.length;
  mb.fill(fp, Y.aSlab, 'dbg', { needSupport: true, global: true });
  mb.lockLayer(Y.aSlab, 'dbg', atticFrom);

  mb.section('Turret drum & top Tiffany panels', { bag: 7, level: 'roof', view: 'front' });
  tiffany([[20, 33], [21, 33]], Y.eave + 1, 4);
  tiffany([[18, 32]], Y.eave + 1, 4);
  tiffany([[23, 32]], Y.eave + 1, 4);
  const drum = turretRing.filter(([, z]) => z >= HZF);
  const drumInside = turretDisk.filter(([x, z]) => z >= HZF && !drum.some(([a, b]) => a === x && b === z));
  mb.reserve(drumInside, Y.eave, Y.eave + 6);    // keep the drum hollow (the roofs must not grow into it)
  mb.wall(drum, Y.eave, 2, (x, y, z) => trim.get(x + ',' + y + ',' + z) ?? C.brick);

  mb.section('Chimneys', { bag: 7, level: 'roof', view: 'front', maxStep: 12 });
  const chimney = (x0, z0, w, d, y0, top) => {
    // solid stack of 2x4 (or 2x2) bricks, stone cap, black flue plate
    const id = w * d === 8 ? '3001' : '3003';
    const r = w === 2 && d === 4 ? 1 : 0;
    let yy = y0;
    for (; yy + 3 <= top; yy += 3) mb.add(id, yy + 6 > top ? C.trim : C.brick, x0, yy, z0, r);
    const [pid, pr] = w * d === 8 ? ['3020', r] : ['3022', 0];
    mb.add(pid, 'black', x0, yy, z0, pr);
  };
  chimney(4, 18, 2, 4, 1, 76);
  chimney(42, 14, 2, 4, 1, 79);
  // centre chimney rising through the ridge of the main roof
  chimney(27, 19, 2, 2, Y.eave, 97);

  mb.section('Main roof', { bag: 7, level: 'roof', view: 'front', maxStep: 12 });
  // gable windows in the side gables of the main roof, round-top windows in the wing gables
  win(17, Y.eave + 12, 19, 3, 'l');
  win(30, Y.eave + 12, 19, 1, 'l');
  mb.gableRoof({ axis: 'x', a0: 17, a1: 31, b0: HZ0, b1: HZF, y: Y.eave, color: C.roof, ends: C.trim, gable: { cols: [17, 30], color: wallColor } });

  mb.section('Turret roof', { bag: 7, level: 'roof', view: 'front', maxStep: 10 });
  // deck of plates on the round drum, then a hipped "cone" whose back edge follows the main roof
  mb.fill(rectCells({ x0: 17, z0: HZF, x1: 25, z1: 34 }), Y.eave + 6, C.roof, { needSupport: true, global: true });
  for (let k = 0; ; k++) {
    const yy = Y.eave + 7 + 3 * k, xa = 16 + k, xb = 26 - k, zb = 29 - k, zf = 35 - k;
    const put = (id, x, z, r) => { const i = mb.tryAdd(id, C.roof, x, yy, z, r); if (i >= 0 && !mb.supported(id, x, yy, z, r)) mb.ensureSupport(i, C.roof); };
    if (xb - xa <= 2) {
      for (let z = zb; z < zf - 1; z += 2) put(zf - 1 - z >= 2 ? '3043' : '3044c', xa, z, 1);
      break;
    }
    put('3045', xa, zf - 2, 3); put('3045', xb - 2, zf - 2, 0);
    for (let x = xa + 2; x < xb - 2; ) { const L = xb - 2 - x >= 2 ? 2 : 1; put(L === 2 ? '3039' : '3040b', x, zf - 2, 0); x += L; }
    for (let z = zb; z < zf - 2; ) {
      const L = zf - 2 - z >= 2 ? 2 : 1;
      put(L === 2 ? '3039' : '3040b', xa, z, 3); put(L === 2 ? '3039' : '3040b', xb - 2, z, 1);
      z += L;
    }
  }
  // attic furniture
  mb.section('The attic', { bag: 7, level: 'attic', view: 'back' });
  F.chest(mb, 18, Y.eave, 13, 0, 'reddishBrown');
  mb.add('30150', 'medNougat', 24, Y.eave, 12, 0);
  mb.add('2489', 'darkBrown', 18, Y.eave, 24);
  F.chair(mb, 24, Y.eave, 24, 2, 'reddishBrown');
  mb.add('24093', 'reddishBrown', 28, Y.eave, 26, 0);

  mb.section('Left wing roof & gable', { bag: 7, level: 'roof', view: 'front', maxStep: 12 });
  mb.add('30044', C.frame, 10, Y.eave + 4, WA.zf, 0); mb.add('30046', C.frame, 10, Y.eave + 4, WA.zf, 0);
  mb.gableRoof({ axis: 'z', a0: HZ0, a1: WA.zf + 1, b0: WA.x0, b1: WA.x1 - 1, y: Y.eave, color: C.roof, ends: C.trim, gable: { cols: [HZ0, WA.zf], color: wallColor } });

  mb.section('Right wing roof & gable', { bag: 7, level: 'roof', view: 'front', maxStep: 12 });
  mb.add('30044', C.frame, 36, Y.eave + 4, WC.zf, 0); mb.add('30046', C.frame, 36, Y.eave + 4, WC.zf, 0);
  mb.gableRoof({ axis: 'z', a0: HZ0, a1: WC.zf + 1, b0: WC.x0, b1: WC.x1 - 1, y: Y.eave, color: C.roof, ends: C.trim, gable: { cols: [HZ0, WC.zf], color: wallColor } });

  // ============================================================= BAG 8: front garden
  mb.section('Terrace retaining walls', { bag: 8, level: 'garden', view: 'front', maxStep: 14 });
  const tx0 = 2, tx1 = 46, tz0 = 30, tz1 = 45;     // terrace [2,46) x [30,45)
  const gate = (x) => x >= 27 && x <= 30;
  const pillarsCells = [[25, 43], [26, 43], [25, 44], [26, 44], [31, 43], [32, 43], [31, 44], [32, 44]];
  const pillarSet = cellSet(pillarsCells);
  const retain = [];
  for (let x = tx0; x < tx1; x++) if (!gate(x) && !pillarSet.has(key(x, tz1 - 1))) retain.push([x, tz1 - 1]);
  for (let z = tz0; z < tz1 - 1; z++) { retain.push([tx0, z]); retain.push([tx1 - 1, z]); }
  for (let x = tx0 + 1; x < HX0; x++) retain.push([x, tz0]);
  for (let x = HX1; x < tx1 - 1; x++) retain.push([x, tz0]);
  const fpAll = cellSet([...fp, ...porCells, ...rectCells({ x0: 26, z0: 34, x1: 32, z1: 40 })]);
  const retainOk = retain.filter(([x, z]) => !fpAll.has(key(x, z)));
  mb.wall(retainOk, 1, 2, C.brick, { texture: mottle });
  // gate pillars (taller), lamp posts on top
  mb.wall(pillarsCells, 1, 5, (x, y) => (y >= 13 ? C.trim : C.brick));
  mb.fill(pillarsCells, 16, C.trim);

  mb.section('Terrace supports', { bag: 8, level: 'garden', view: 'front' });
  const retainSet = cellSet([...retain, ...pillarsCells]);
  const terrace = [];
  for (let x = tx0 + 1; x < tx1 - 1; x++) for (let z = tz0; z < tz1 - 1; z++) if (!fpAll.has(key(x, z)) && !retainSet.has(key(x, z))) terrace.push([x, z]);
  const posts = [];
  for (const [x, z] of terrace) if ((x - 3) % 5 === 0 && (z - 32) % 4 === 0 && !(x >= 25 && x <= 32)) posts.push([x, z]);
  mb.wall(posts, 1, 2, 'dbg');

  mb.section('Front lawn & path', { bag: 8, level: 'garden', view: 'front', maxStep: 12 });
  const path = rectCells({ x0: 27, z0: 40, x1: 31, z1: 44 });
  const pathSet = cellSet(path);
  mb.fill(terrace.filter(([x, z]) => !pathSet.has(key(x, z))), Y.terrace, C.lawn, { needSupport: true });
  // path: supports + plates + tan tiles, first step down to the sidewalk
  mb.wall(rectCells({ x0: 27, z0: 40, x1: 31, z1: 44 }).filter(([x, z]) => z === 41 || z === 43), 1, 2, 'dbg');
  mb.fill(path, Y.terrace, 'dbg');
  mb.fill(path, Y.terrace + 1, C.path, { tiles: true });
  mb.wall(rectCells({ x0: 27, z0: 44, x1: 31, z1: 45 }), 1, 1, C.brick);
  mb.fill(rectCells({ x0: 27, z0: 44, x1: 31, z1: 45 }), 4, C.path, { tiles: true });
  // stone caps on the retaining walls
  mb.fill(retainOk, Y.terrace, C.trim, { sizes: [[8, 1, '3460'], [6, 1, '3666'], [4, 1, '3710'], [3, 1, '3623'], [2, 1, '3023'], [1, 1, '3024']] });

  mb.section('Iron fence & gate lamps', { bag: 8, level: 'garden', view: 'front', maxStep: 12 });
  const fenceRun = (x0, x1, z) => {
    let x = x0;
    while (x1 - x >= 4) { mb.add('19121', 'black', x, Y.terrace + 1, z, 0); x += 4; }
    while (x < x1) { mb.add('3062b', 'black', x, Y.terrace + 1, z); mb.add('3062b', 'black', x, Y.terrace + 4, z); x++; }
  };
  fenceRun(tx0, 25, tz1 - 1);
  fenceRun(33, tx1, tz1 - 1);
  F.lampPost(mb, 25, 17, 43);
  F.lampPost(mb, 31, 17, 43);

  mb.section('Trees & hedges', { bag: 8, level: 'garden', view: 'front', maxStep: 12 });
  F.tree(mb, 5, Y.terrace + 1, 37, 6, 'darkGreen');
  F.tree(mb, 39, Y.terrace + 1, 38, 5, 'green');
  // hedge along the house front (bushes + leaves)
  for (const [x, z] of [[8, 33], [11, 33], [14, 33], [35, 32], [38, 32]]) mb.tryAdd('6064', 'green', x, Y.terrace + 1, z);
  for (const [x, z] of [[22, 36], [19, 35], [33, 33], [41, 33], [3, 33]]) mb.tryAdd('2423', 'green', x, Y.terrace + 1, z);
  for (const [x, z] of [[9, 40], [13, 41], [17, 39], [36, 41], [42, 40], [22, 42], [4, 42], [44, 36]]) mb.tryAdd('24866', ['red', 'white', 'yellow'][(x + z) % 3], x, Y.terrace + 1, z);

  // ============================================================= BAG 9: backyard
  mb.section('Backyard gazebo', { bag: 9, level: 'gazebo', view: 'back', maxStep: 12 });
  const gz = { x0: 8, z0: 1 };
  const gzAll = rectCells({ x0: gz.x0, z0: gz.z0, x1: gz.x0 + 8, z1: gz.z0 + 8 });
  // platform: brick ring + 8x8 plate + deck tiles
  mb.wall(rectRing({ x0: gz.x0, z0: gz.z0, x1: gz.x0 + 8, z1: gz.z0 + 8 }), 1, 1, 'white');
  mb.add('41539', 'white', gz.x0, 4, gz.z0);
  const gzPosts = [[gz.x0, gz.z0], [gz.x0 + 7, gz.z0], [gz.x0, gz.z0 + 7], [gz.x0 + 7, gz.z0 + 7]];
  for (const [x, z] of gzPosts) mb.add('2453b', 'white', x, 5, z);
  // railings between the posts (the right side is the entrance)
  mb.add('15332', 'white', gz.x0 + 2, 5, gz.z0, 0); mb.add('15332', 'white', gz.x0 + 2, 5, gz.z0 + 7, 0);
  mb.add('15332', 'white', gz.x0, 5, gz.z0 + 2, 1);
  mb.reserve([[gz.x0 + 3, gz.z0 + 3], [gz.x0 + 4, gz.z0 + 3]], 5, 6);
  mb.fill(gzAll, 5, 'reddishBrown', { tiles: true });
  mb.unreserve([[gz.x0 + 3, gz.z0 + 3], [gz.x0 + 4, gz.z0 + 3]], 5, 6);
  // ceiling plate on the posts, then the pyramid roof
  mb.add('41539', 'white', gz.x0, 20, gz.z0);
  mb.pyramid(gz.x0, gz.z0, 8, 21, C.roof);

  mb.section('Moira\'s grave & the backyard', { bag: 9, level: 'gazebo', view: 'back' });
  mb.add('3004', 'lbg', 20, 1, 4, 0); mb.add('3004', 'lbg', 20, 4, 4, 0); mb.add('6091', 'lbg', 20, 7, 4, 0);
  for (const [x, z] of [[19, 5], [22, 5], [20, 6], [21, 6]]) mb.add('24866', ['white', 'red'][(x + z) % 2], x, 1, z);
  F.tree(mb, 36, 1, 3, 7, 'darkGreen');
  F.tree(mb, 1, 1, 12, 5, 'green');
  mb.tryAdd('6064', 'green', 44, 1, 6); mb.tryAdd('6064', 'green', 28, 1, 2);

  // ============================================================= the residents
  mb.section('The residents', { bag: 10, level: 'figs', view: 'back', maxStep: 9 });
  F.minifig(mb, 'charles', 20, 1, 18, 2);
  F.minifig(mb, 'constance', 28, Y.gWall, 32, 0);
  F.minifig(mb, 'vivien', 11, gFloor, 25, 2);
  F.minifig(mb, 'ben', 36, gFloor, 27, 2);
  F.minifig(mb, 'moira', 35, gFloor, 14, 2);
  F.minifig(mb, 'violet', 37, uFloor, 22, 2);
  F.minifig(mb, 'tate', 27, uFloor, 24, 2);
  F.minifig(mb, 'rubberMan', 21, Y.eave, 20, 2);
  F.minifig(mb, 'moiraOld', gz.x0 + 3, 5, gz.z0 + 3, 2);

  return mb;
}
