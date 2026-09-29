// "1120 Westchester Place": the Murder House (American Horror Story, season 1) in real LEGO parts,
// built like an official Modular Building: four modules that lift off each other.
//
//   Module A  base plates, garden, basement laboratory      (walls capped with tiles at y 16)
//   Module B  ground floor, grand staircase, portico         (slab 17, walls 18..39, cap 39)
//   Module C  upper floor and balcony                        (slab 40, walls 41..59, cap 59)
//   Module D  attic, turret top and the roofs                (slab 60, roofs from 61)
//
// Exterior after the real Rosenheim Mansion (Los Angeles, 1908): red-brown brick, pale stone trim,
// a bowed & turreted stair hall lit by nine Tiffany stained-glass panels, a carved stone entrance
// portico with a curved brick balcony above, steep slate roofs with stone-coped parapet gables, tall
// chimneys, and a broad lawn on a knoll edged by low brick walls with a stepped path to the portico.
// The rooms are imagined from the show.
import { ModelBuilder, rectCells, rectRing, avail } from '../core/builder.js';
import {
  Y, HX0, HX1, HZ0, HZF, WA, WC, POR, C, turretRing, turretInside, turretDisk,
  outline, footprint, key, cellSet,
} from './common.js';
import * as F from './furniture.js';

export function buildHouse() {
  const mb = new ModelBuilder(1120);
  const trim = new Map();                 // "x,y,z" (course start) -> colour override
  const T = (x, y, z, c = C.trim) => trim.set(x + ',' + y + ',' + z, c);
  const wallColor = (x, y, z) => trim.get(x + ',' + y + ',' + z) ?? C.brick;
  // textured brick: a share of the 1x2s are masonry-profile bricks
  const mottle = { on: C.brick, color: C.brick, chance: 0.3, id: '98283' };
  const OUT = [[0, 1], [1, 0], [0, -1], [-1, 0]];      // outward normal for facing r

  // ------------------------------------------------------------- helpers
  const win = (x, y, z, r, kind = 'l') => {
    if (kind === 'round') { mb.add('30044', C.frame, x, y, z, r); mb.add('30046', C.frame, x, y, z, r); return; }
    mb.add('60592', C.frame, x, y, z, r);
    if (kind === 'l') mb.add('38320', C.frame, x, y, z, r);
    else if (kind === 'b') mb.add('60601', 'transBlack', x, y, z, r);
    else mb.add('60601', 'transClear', x, y, z, r);
  };
  const along = (r) => ((r & 1) ? [0, 1] : [1, 0]);
  const trimOpening = (x, z, r, w, yBottom, yTop, sill = true) => {
    const [dx, dz] = along(r);
    for (let i = 0; i < w; i++) {
      const cx = x + dx * i, cz = z + dz * i;
      if (sill) T(cx, yBottom - 3, cz);
      T(cx, yTop, cz);
    }
  };
  // stone sill sticking out of the wall: a 2x2 plate half inside the wall, a tile on the ledge
  const sill = (x, y, z, r) => {
    const [ox, oz] = OUT[r];
    mb.add('3022', C.trim, ox < 0 ? x - 1 : x, y - 1, oz < 0 ? z - 1 : z, 0);
    mb.add('3069b', C.trim, x + ox, y, z + oz, r & 1);
  };
  const tallWindow = (x, y, z, r) => {
    win(x, y, z, r, 'l'); win(x, y + 6, z, r, 'l');
    trimOpening(x, z, r, 2, y, y + 12);
    sill(x, y, z, r);
  };
  const quoins = (x, z, dirs, y0, y1, first = 0) => {
    for (let y = y0, k = first; y < y1; y += 3, k++) {
      if (k % 2) continue;
      T(x, y, z);
      const [dx, dz] = dirs[(k >> 1) % 2];
      T(x + dx, y, z + dz);
    }
  };
  // paintings, posters, a mirror: a brick with a side stud built into the wall + an upright tile
  const artHosts = [];
  const artHost = (wx, y, wz, r, tile, color) => {
    const i = mb.add('87087', C.brick, wx, y, wz, r);
    artHosts.push({ i, wx, y, wz, r, tile, color });
  };
  const hangArt = () => {
    for (const a of artHosts.splice(0)) {
      const [ox, oz] = OUT[a.r];
      mb.upright(a.tile, a.color, a.wx + ox, a.y, a.wz + oz, a.r, a.i, 0.25);
    }
  };

  // Tiffany stained glass: stacked trans plates with black leading
  const PAL = [
    ['transYellow', 'transOrange', 'transGreen', 'transYellow', 'transRed', 'transGreen'],
    ['transLightBlue', 'transClear', 'transLightBlue', 'transDarkBlue', 'transLightBlue', 'transClear'],
    ['transOrange', 'transYellow', 'transRed', 'transOrange', 'transYellow', 'transGreen'],
    ['transGreen', 'transLightBlue', 'transGreen', 'transYellow', 'transGreen', 'transClear'],
    ['transRed', 'transOrange', 'transYellow', 'transClear', 'transYellow', 'transOrange'],
    ['transDarkBlue', 'transLightBlue', 'transDarkBlue', 'transLightBlue', 'transDarkBlue', 'transClear'],
    ['transYellow', 'transGreen', 'transClear', 'transGreen', 'transYellow', 'transOrange'],
    ['transRed', 'transOrange', 'transYellow', 'transRed', 'transDarkBlue', 'transYellow'],
    ['transClear', 'transLightBlue', 'transYellow', 'transLightBlue', 'transClear', 'transGreen'],
  ];
  let panelNo = 0;
  const tiffany = (cells, y0, h) => {
    const pal = PAL[panelNo++ % PAL.length];
    for (let j = 0; j < h; j++) {
      if (h > 6 && j % 4 === 3) {
        if (cells.length === 2) { const [[x0, z0], [x1, z1]] = cells; mb.add('3023', 'black', Math.min(x0, x1), y0 + j, Math.min(z0, z1), x0 === x1 ? 1 : 0); }
        else mb.add('3024', 'black', cells[0][0], y0 + j, cells[0][1]);
        continue;
      }
      if (cells.length === 2 && j % 3 !== 1) {
        const [[x0, z0], [x1, z1]] = cells;
        mb.add('3023', pal[j % pal.length], Math.min(x0, x1), y0 + j, Math.min(z0, z1), x0 === x1 ? 1 : 0);
      } else cells.forEach(([x, z], i) => mb.add('3024', pal[(j + i * 2 + 1) % pal.length], x, y0 + j, z));
    }
    for (const [x, z] of cells) { T(x, y0 - 3, z); T(x, y0 + h, z); }
  };
  const locator = (x, z, i, n) => i === 0 || i === n - 1 || i % 4 === 2;

  // Side chimneys: a 3 x 4 brick breast against the side wall, built floor by floor so every
  // module carries its own piece of chimney (tied to the module's floor plate) and still lifts off.
  const CHIM = [{ x0: 3, z0: 18, inner: 5, top: 84 }, { x0: 42, z0: 14, inner: 42, top: 87 }];
  const chimCells = (c) => rectCells({ x0: c.x0, z0: c.z0, x1: c.x0 + 3, z1: c.z0 + 4 });
  const chimTie = (y) => {                   // a 4x4 plate under the breast and the wall next to it
    for (const c of CHIM) mb.add('3031', C.trim, c.inner === c.x0 ? c.x0 - 1 : c.x0, y, c.z0, 0);
  };
  const chimBreast = (y0, courses, capY) => {
    for (const c of CHIM) {
      const outer = c.inner === c.x0 ? c.x0 + 1 : c.x0;        // min x of the two outer columns
      const far = c.inner === c.x0 ? c.x0 + 2 : c.x0;          // outermost column
      for (let k = 0; k < courses; k++) {
        const y = y0 + 3 * k;
        const col = (k === courses - 1 && capY === undefined) ? C.trim : C.brick;
        if (k % 2 === 0) { mb.add('3001', col, outer, y, c.z0, 1); mb.add('3010', col, c.inner, y, c.z0, 1); }
        else { mb.add('3010', col, far, y, c.z0, 1); mb.add('3001', col, far === c.x0 ? c.x0 + 1 : c.x0, y, c.z0, 1); }
      }
      if (capY !== undefined) mb.capWalls(chimCells(c), capY, C.brick, (x, z, i, n) => i === 0 || i === n - 1);
    }
  };

  const fp = footprint();
  const fpSet = cellSet(fp);
  const ext = outline();
  const extSet = cellSet(ext);
  const porCells = rectCells({ x0: POR.x0, z0: POR.z0, x1: POR.x1, z1: POR.z1 });
  const slabCells = [...fp, ...porCells];
  const touchesEdge = (x, z, w, d) => {
    for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) if (extSet.has(key(x + i, z + k)) || !fpSet.has(key(x + i, z + k))) return true;
    return false;
  };
  const slabColor = (x, z, w, d) => (touchesEdge(x, z, w, d) ? C.trim : 'dbg');
  const woodFloor = (x, z) => ((x * 7 + z * 13) % 10 < 2 ? 'darkBrown' : 'reddishBrown');

  for (const [y0, y1] of [[Y.bsmt, 16], [Y.gWall, 39], [Y.uWall, 59]]) {
    quoins(WA.x0, WA.zf, [[1, 0], [0, -1]], y0, y1);
    quoins(WA.x1 - 1, WA.zf, [[-1, 0], [0, -1]], y0, y1, 1);
    quoins(WC.x0, WC.zf, [[1, 0], [0, -1]], y0, y1, 1);
    quoins(WC.x1 - 1, WC.zf, [[-1, 0], [0, -1]], y0, y1);
  }

  // =================================================================== MODULE A
  mb.section('Base plates', { bag: 1, module: 'A', level: 'base', view: 'front', maxStep: 9 });
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) mb.add('91405', C.lawn, 16 * i, 0, 16 * k);

  mb.section('Sidewalk', { bag: 1, level: 'garden', view: 'front', maxStep: 14 });
  mb.fill(rectCells({ x0: 0, z0: 45, x1: 48, z1: 47 }), 1, (x) => ((x >> 1) % 5 === 0 ? 'dbg' : C.walk), { tiles: true, sizes: [[2, 2, '3068b']] });
  mb.line(0, 1, 47, 48, 'x', 'dbg', 'tile');

  mb.section('Basement floor', { bag: 1, level: 'basement', view: 'back' });
  const labSpots = [];
  const spot = (x0, z0, x1, z1) => labSpots.push(...rectCells({ x0, z0, x1, z1 }));
  spot(19, 20, 21, 26); spot(20, 18, 22, 19); spot(7, 12, 13, 13); spot(33, 12, 35, 14);
  spot(26, 12, 30, 14); spot(36, 23, 40, 24); spot(10, 22, 12, 24); spot(8, 25, 10, 30); spot(23, 12, 25, 16); spot(12, 16, 14, 18);
  const innerA = [...rectCells({ x0: 16, z0: 11, x1: 17, z1: 29 }), ...rectCells({ x0: 31, z0: 11, x1: 32, z1: 29 })];
  const bsmtInner = fp.filter(([x, z]) => !extSet.has(key(x, z)));
  mb.reserve([...labSpots, ...innerA], 1, 2);
  mb.fill(bsmtInner, 1, (x, z) => ((x + z) % 7 === 0 ? 'lbg' : 'dbg'), { tiles: true });
  mb.unreserve([...labSpots, ...innerA], 1, 2);

  mb.section('Basement walls', { bag: 1, level: 'basement', view: 'front', maxStep: 16 });
  const bw = [[8, WA.zf, 0], [12, WA.zf, 0], [34, WC.zf, 0], [38, WC.zf, 0],
    [HX0, 14, 3], [HX0, 24, 3], [HX1 - 1, 11, 1], [HX1 - 1, 24, 1], [10, HZ0, 2], [22, HZ0, 2], [35, HZ0, 2]];
  for (const [x, z, r] of bw) { win(x, 10, z, r, 'b'); trimOpening(x, z, r, 2, 10, 16, true); sill(x, 10, z, r); }
  const doorGapA = (k) => innerA.filter(([, z]) => !(k < 4 && z >= 21 && z <= 23));
  mb.wall((k) => [...ext, ...doorGapA(k)], Y.bsmt, 5, wallColor, { texture: mottle });
  chimBreast(Y.bsmt, 5, 16);

  mb.section('Portico plinth & porch steps', { bag: 1, level: 'garden', view: 'front' });
  const porRing = rectRing({ x0: POR.x0, z0: POR.z0, x1: POR.x1, z1: POR.z1 }, { back: true });
  mb.wall(porRing, Y.bsmt, 5, (x, y, z) => ((x === POR.x0 || x === POR.x1 - 1) && z === POR.z1 - 1 ? C.trim : C.brick));
  const steps = [[38, 13], [36, 16], [34, 19]];              // [z of the step, tread surface]
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

  mb.section('Basement: tile the wall tops', { bag: 1, level: 'basement', view: 'top', maxStep: 16 });
  mb.capWalls([...ext, ...innerA, ...porRing], 16, C.brick, locator);

  mb.section('Dr. Montgomery\'s basement laboratory', { bag: 2, level: 'basement', view: 'back', maxStep: 10 });
  F.operatingTable(mb, 19, 1, 20, 0);
  mb.add('37762', 'white', 19, 5, 25); mb.add('95228', 'transGreen', 20, 5, 25);
  mb.add('3626cpr0895', 'white', 20, 5, 24, 0, { loose: true });
  F.jarShelf(mb, 7, 1, 12, 0, 6, 0);
  F.jarShelf(mb, 36, 1, 23, 0, 4, 3);
  F.boiler(mb, 33, 1, 12, 0);
  F.chest(mb, 26, 1, 12, 0, 'reddishBrown');
  mb.add('2489', 'reddishBrown', 10, 1, 22);
  F.gurney(mb, 8, 1, 25, 0);
  F.labBench(mb, 23, 1, 12, 1);
  mb.add('37776', 'black', 12, 1, 16); mb.add('30103', 'black', 13, 1, 17);

  // =================================================================== MODULE B
  mb.section('Ground floor slab', { bag: 3, module: 'B', level: 'ground', view: 'top', maxStep: 10, settle: true });
  chimTie(Y.gSlab);
  mb.add('3032', slabColor(19, 28, 4, 6), 19, Y.gSlab, 28, 0);     // ties the turret bay to the floor
  mb.fill(slabCells, Y.gSlab, slabColor, { needSupport: true, global: true });
  const floorsG = mb.section('Ground floor: parquet, rugs & kitchen tiles', { bag: 3, level: 'ground', view: 'top', maxStep: 16, settle: true });

  mb.section('Ground floor walls, windows & Tiffany glass', { bag: 3, level: 'ground', view: 'front', maxStep: 16 });
  mb.add('60596', C.frame, 27, Y.gWall, HZF, 0);
  mb.add('60623', 'reddishBrown', 27, Y.gWall, HZF, 0);
  trimOpening(27, HZF, 0, 4, Y.gWall, Y.gWall + 18, false);
  const gw = Y.gWall + 3;
  for (const x of [7, 10, 13]) tallWindow(x, gw, WA.zf, 0);
  for (const x of [34, 38]) tallWindow(x, gw, WC.zf, 0);
  for (const z of [13, 25]) tallWindow(HX0, gw, z, 3);
  for (const z of [11, 25]) tallWindow(HX1 - 1, gw, z, 1);
  for (const x of [8, 12, 18, 28, 35]) tallWindow(x, gw, HZ0, 2);
  tiffany([[18, 32]], gw, 12);
  tiffany([[20, 33], [21, 33]], gw, 12);
  tiffany([[23, 32]], gw, 12);
  artHost(6, 32, 19, 1, '3068b', 'darkRed');        // above the fireplace
  artHost(16, 27, 26, 1, '3068b', 'darkBlue');      // foyer
  artHost(22, 27, HZ0, 0, '3068b', 'sandGreen');    // dining room
  artHost(31, 27, 26, 1, '3068b', 'darkGreen');     // office
  artHost(38, 27, 19, 0, '3069b', 'darkTan');       // office
  const gInner = (k) => {
    const cells = [];
    const door = (k < 5);
    for (let z = 11; z <= 28; z++) {
      if (!(door && z >= 22 && z <= 24)) cells.push([16, z]);
      if (!(door && ((z >= 22 && z <= 24) || (z >= 13 && z <= 15)))) cells.push([31, z]);
    }
    for (let x = 32; x <= 40; x++) if (!(door && x >= 35 && x <= 37)) cells.push([x, 19]);
    for (let x = 17; x <= 30; x++) if (!(k < 6 && x >= 19 && x <= 28)) cells.push([x, 19]);
    cells.push([17, 28], [24, 28]);
    return cells;
  };
  for (const [x, z] of turretRing) if (z >= HZF) { T(x, gw - 3, z); T(x, gw + 12, z); }   // stone bands
  mb.wall((k) => [...ext, ...gInner(k)], Y.gWall, 7, wallColor, { texture: mottle });
  chimBreast(Y.gWall, 7, 39);

  mb.section('Stone portico', { bag: 3, level: 'ground', view: 'front' });
  const PC = C.trim;
  win(26, Y.gWall + 6, 30, 3, 'l'); win(31, Y.gWall + 6, 30, 1, 'l');
  mb.wall([[26, 33], [26, 32], [26, 31], [26, 30], [31, 33], [31, 32], [31, 31], [31, 30]], Y.gWall, 4, PC);
  mb.add('3665', PC, 26, Y.gWall + 12, 33, 1);
  mb.add('3665', PC, 30, Y.gWall + 12, 33, 3);
  mb.wall([[26, 30], [26, 31], [26, 32], [31, 30], [31, 31], [31, 32]], Y.gWall + 12, 1, PC);
  const porTop = rectRing({ x0: 26, z0: 30, x1: 32, z1: 34 }, { back: true });
  mb.wall(porTop, Y.gWall + 15, 2, PC);
  mb.reserve([[28, 32], [29, 32]], Y.gWall, Y.gWall + 1);
  mb.fill(rectCells({ x0: 27, z0: 30, x1: 31, z1: 33 }), Y.gWall, (x, z) => ((x + z) % 2 ? 'white' : 'black'), { tiles: true, sizes: [[1, 1, '3070b']] });
  mb.unreserve([[28, 32], [29, 32]], Y.gWall, Y.gWall + 1);

  mb.section('Ground floor: tile the wall tops', { bag: 3, level: 'ground', view: 'top', maxStep: 16 });
  mb.capWalls([...ext, ...gInner(6), ...porTop], 39, C.brick, locator);

  mb.section('Grand staircase', { bag: 4, level: 'ground', view: 'back', maxStep: 10 });
  const stairPath = [[18, 25], [18, 26], [18, 27], [18, 28], [18, 29], [18, 30], [19, 31], [20, 32], [21, 32], [22, 31], [23, 30], [23, 29]];
  const stepTop = (i) => (i === stairPath.length - 1 ? 42 : Y.gWall + 1 + 2 * (i + 1));
  const stairSet = cellSet(stairPath);
  for (let c = 0; c < 8; c++) {
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
  mb.add('3062b', 'darkBrown', 19, Y.gWall, 25); mb.add('3062b', 'darkBrown', 19, Y.gWall + 3, 25); mb.add('6141', 'pearlGold', 19, Y.gWall + 6, 25);

  mb.section('Living room & fireplace', { bag: 4, level: 'ground', view: 'back', maxStep: 12 });
  const gF = Y.gWall;
  F.fireplace(mb, 7, gF, 18, 1);
  F.sofa(mb, 11, gF, 18, 3, 'darkRed', 'tan');
  F.chair(mb, 9, gF, 14, 0, 'darkRed');
  F.chair(mb, 9, gF, 24, 2, 'darkRed');
  F.coffeeTable(mb, 9, gF, 18, 1);
  F.piano(mb, 11, gF, 28, 2);
  F.bookshelf(mb, 15, gF, 11, 3, 5, 3);
  F.floorLamp(mb, 7, gF, 23, 'darkRed');
  F.floorLamp(mb, 7, gF, 16, 'tan');
  F.pottedPlant(mb, 7, gF, 29, true);

  mb.section('Foyer', { bag: 4, level: 'ground', view: 'back' });
  F.table(mb, 24, gF, 25, 2, 2, 0, 'reddishBrown', false);
  mb.add('3062b', 'transYellow', 24, gF + 4, 25); mb.add('59900', 'darkRed', 24, gF + 7, 25);
  mb.add('3070b', 'reddishBrown', 25, gF + 4, 25); mb.add('3069b', 'reddishBrown', 24, gF + 4, 26);
  F.pottedPlant(mb, 30, gF, 27, false); F.pottedPlant(mb, 26, gF, 27, false);
  mb.add('4079b', 'darkRed', 21, gF, 21, 1);

  mb.section('Ben\'s office', { bag: 4, level: 'ground', view: 'back' });
  F.desk(mb, 35, gF, 21, 0);
  F.bookshelf(mb, 40, gF, 24, 3, 5, 3);
  F.bookshelf(mb, 32, gF, 20, 1, 4, 3);
  F.sofa(mb, 33, gF, 25, 1, 'darkBrown', 'darkRed');
  F.floorLamp(mb, 33, gF, 29, 'darkGreen');
  F.pottedPlant(mb, 38, gF, 28, false);

  mb.section('Dining room', { bag: 4, level: 'ground', view: 'back' });
  F.table(mb, 22, gF, 13, 4, 4, 0, 'reddishBrown', false);
  for (const [x, z] of [[22, 13], [25, 16], [22, 16], [25, 13]]) mb.add('98138', 'white', x, gF + 4, z);
  mb.add('37762', 'pearlGold', 23, gF + 4, 14); mb.add('2343', 'transClear', 24, gF + 4, 15); mb.add('2343', 'transClear', 23, gF + 4, 15);
  mb.add('3899', 'white', 24, gF + 4, 14);
  for (const [x, z] of [[23, 13], [24, 13], [23, 16], [24, 16], [22, 14], [22, 15], [25, 14], [25, 15]]) mb.add('3070b', 'reddishBrown', x, gF + 4, z);
  F.chair(mb, 20, gF, 14, 1); F.chair(mb, 26, gF, 14, 3);
  F.chair(mb, 22, gF, 17, 2); F.chair(mb, 24, gF, 17, 2);
  F.sideboard(mb, 27, gF, 11, 0);
  F.floorLamp(mb, 17, gF, 11, 'tan');

  mb.section('Kitchen', { bag: 4, level: 'ground', view: 'back' });
  F.counter(mb, 39, gF, 11, 3, 7, { layout: { 0: 'cab', 3: 'stove', 5: 'sink' } });
  F.fridge(mb, 33, gF, 11, 0);
  F.table(mb, 34, gF, 15, 2, 2, 0, 'white', 'white');
  F.chair(mb, 32, gF, 15, 1, 'white');

  mb.section('Hang the paintings', { bag: 4, level: 'ground', view: 'back' });
  hangArt();

  // lay the ground floor around the furniture
  const lastG = mb.cur;
  mb.use(floorsG);
  const figSpotsG = [[11, 25], [12, 25], [36, 27], [37, 27], [35, 14], [36, 14], [20, 24], [21, 24]];
  mb.reserve(figSpotsG, gF, gF + 1);
  const gRoom = (x0, z0, x1, z1) => rectCells({ x0, z0, x1, z1 }).filter(([x, z]) => !stairSet.has(key(x, z)));
  F.rug(mb, 9, 20, 14, 25, gF, 'darkRed', 'darkTan');
  F.rug(mb, 20, 12, 28, 18, gF, 'darkRed', 'tan');
  F.rug(mb, 34, 20, 39, 25, gF, 'darkGreen', 'darkTan');
  mb.boards(gRoom(7, 11, 16, 31), gF, woodFloor, 'z');
  mb.boards(gRoom(17, 20, 31, 29), gF, woodFloor, 'x');
  mb.fill(turretInside.filter(([x, z]) => !stairSet.has(key(x, z))), gF, 'reddishBrown', { tiles: true });
  mb.boards(gRoom(17, 11, 31, 19), gF, woodFloor, 'x');
  mb.boards(gRoom(32, 20, 41, 30), gF, woodFloor, 'z');
  mb.fill(rectCells({ x0: 32, z0: 11, x1: 41, z1: 19 }), gF, (x, z) => ((x + z) % 2 ? 'black' : 'white'), { tiles: true, sizes: [[1, 1, '3070b']] });
  mb.unreserve(figSpotsG, gF, gF + 1);
  mb.use(lastG);

  // =================================================================== MODULE C
  mb.section('Upper floor slab', { bag: 5, module: 'C', level: 'upper', view: 'top', maxStep: 10, settle: true });
  const well = cellSet([...turretDisk.filter(([, z]) => z >= HZF)]);
  const uSlab = slabCells.filter(([x, z]) => !well.has(key(x, z)) || extSet.has(key(x, z)));
  mb.add('3460', C.wood, 17, Y.uSlab, 28, 0);
  chimTie(Y.uSlab);
  mb.fill(uSlab, Y.uSlab, slabColor, { needSupport: true, global: true });
  const floorsU = mb.section('Upper floor: carpets & tiles', { bag: 5, level: 'upper', view: 'top', maxStep: 16, settle: true });

  mb.section('Upper floor walls, windows & Tiffany glass', { bag: 5, level: 'upper', view: 'front', maxStep: 16 });
  mb.add('60596', C.frame, 27, Y.uWall, HZF, 0);
  mb.add('60616b', 'transClear', 27, Y.uWall, HZF, 0);
  const uw = Y.uWall + 3;
  for (const x of [8, 12]) tallWindow(x, uw, WA.zf, 0);
  for (const x of [33, 36, 39]) tallWindow(x, uw, WC.zf, 0);
  for (const z of [13, 25]) tallWindow(HX0, uw, z, 3);
  for (const z of [11, 25]) tallWindow(HX1 - 1, uw, z, 1);
  for (const x of [9, 19, 27, 37]) tallWindow(x, uw, HZ0, 2);
  tiffany([[18, 32]], uw, 12);
  tiffany([[20, 33], [21, 33]], uw, 12);
  tiffany([[23, 32]], uw, 12);
  artHost(6, 50, 17, 1, '3068b', 'darkBlue');       // above the master bed
  artHost(31, 50, 26, 1, '3069b', 'black');         // Violet's posters
  artHost(31, 50, 23, 1, '3069b', 'darkRed');
  artHost(23, 50, HZ0, 0, '3068b', 'sandBlue');     // nursery
  artHost(25, 50, 21, 3, '3068b', 'darkRed');       // hall
  artHost(35, 50, HZ0, 0, '3069b', avail('3069b', 'flatSilver') ? 'flatSilver' : 'lbg'); // bathroom mirror
  const uInner = (k) => {
    const cells = [];
    const door = k < 5;
    for (let z = 11; z <= 28; z++) {
      if (!(door && z >= 23 && z <= 24)) cells.push([16, z]);
      if (!(door && z >= 20 && z <= 21)) cells.push([31, z]);
    }
    for (let z = 20; z <= 28; z++) if (!(door && z >= 22 && z <= 23)) cells.push([25, z]);
    for (let x = 17; x <= 30; x++) if (!(door && x >= 20 && x <= 21) && x !== 25) cells.push([x, 19]);
    cells.push([25, 19]);
    for (let x = 32; x <= 40; x++) if (!(door && x >= 35 && x <= 36)) cells.push([x, 19]);
    cells.push([17, 28], [24, 28]);
    return cells;
  };
  for (const [x, z] of turretRing) if (z >= HZF) { T(x, uw - 3, z); T(x, uw + 12, z); }
  mb.wall((k) => [...ext, ...uInner(k)], Y.uWall, 6, wallColor, { texture: mottle });
  chimBreast(Y.uWall, 6, 59);

  mb.section('Curved brick balcony', { bag: 5, level: 'upper', view: 'front' });
  const bal = [[26, 30], [26, 31], [26, 32], [26, 33], [27, 33], [28, 33], [29, 33], [30, 33], [31, 33], [31, 32], [31, 31], [31, 30]];
  mb.course(bal, Y.uWall, C.brick);
  mb.add('6091', C.brick, 27, Y.uWall + 3, 33, 0); mb.add('6091', C.brick, 29, Y.uWall + 3, 33, 0);
  mb.add('6091', C.brick, 26, Y.uWall + 3, 31, 1); mb.add('6091', C.brick, 31, Y.uWall + 3, 31, 1);
  for (const [x, z] of [[26, 33], [31, 33], [26, 30], [31, 30]]) mb.add('3062b', C.trim, x, Y.uWall + 3, z);
  F.pottedPlant(mb, 27, Y.uWall, 32, false); F.pottedPlant(mb, 30, Y.uWall, 32, false);
  mb.fill(rectCells({ x0: 27, z0: 30, x1: 31, z1: 33 }), Y.uWall, (x, z) => ((x + z) % 2 ? C.trim : 'darkTan'), { tiles: true, sizes: [[1, 1, '3070b']] });

  mb.section('Upper floor: tile the wall tops', { bag: 5, level: 'upper', view: 'top', maxStep: 16 });
  mb.capWalls([...ext, ...uInner(6)], 59, C.brick, locator);

  mb.section('Upper hall & railing', { bag: 6, level: 'upper', view: 'back' });
  const uF = Y.uWall;
  mb.add('15332', C.wood, 18, uF, 28, 0);
  F.floorLamp(mb, 24, uF, 20, 'darkRed');

  mb.section('Master bedroom', { bag: 6, level: 'upper', view: 'back', maxStep: 12 });
  F.bed(mb, 7, uF, 16, 1, { frame: 'reddishBrown', blanket: 'darkRed' });
  F.nightstand(mb, 7, uF, 14, 1);
  F.nightstand(mb, 7, uF, 20, 1);
  F.wardrobe(mb, 13, uF, 11, 0, 'reddishBrown', 'medNougat', 3);
  F.dresser(mb, 10, uF, 28, 2);
  F.chair(mb, 13, uF, 24, 3, 'darkRed');

  mb.section('Violet\'s room', { bag: 6, level: 'upper', view: 'back' });
  F.bed(mb, 35, uF, 26, 3, { W: 2, D: 6, frame: 'black', blanket: 'darkBlue' });
  F.desk(mb, 33, uF, 21, 0, 'black');
  F.recordPlayer(mb, 39, uF, 20);
  F.bookshelf(mb, 40, uF, 22, 3, 3, 2, 'black');
  F.floorLamp(mb, 32, uF, 28, 'black');

  mb.section('Upstairs study', { bag: 6, level: 'upper', view: 'back' });
  F.bookshelf(mb, 26, uF, 20, 0, 5, 3);
  F.chair(mb, 29, uF, 26, 2, 'darkRed');
  F.tableLamp(mb, 26, uF, 27, 'darkGreen');

  mb.section('The nursery', { bag: 6, level: 'upper', view: 'back' });
  F.crib(mb, 18, uF, 12, 0);
  F.chair(mb, 23, uF, 12, 0, 'reddishBrown');
  mb.add('30150', 'medNougat', 27, uF, 12, 0);
  F.rockingHorse(mb, 26, uF, 16, 0);
  F.toyBlocks(mb, 21, uF, 16);
  F.dresser(mb, 17, uF, 16, 1, 'white', 'white');

  mb.section('Bathroom', { bag: 6, level: 'upper', view: 'back' });
  F.bathtub(mb, 37, uF, 11, 0);
  F.toilet(mb, 33, uF, 11, 0);
  F.pedestalSink(mb, 35, uF, 11, 0);
  mb.add('92410', 'white', 32, uF, 16, 1); mb.add('4533', 'white', 33, uF, 16, 1);

  mb.section('Hang the pictures', { bag: 6, level: 'upper', view: 'back' });
  hangArt();

  const lastU = mb.cur;
  mb.use(floorsU);
  const figSpotsU = [[37, 22], [38, 22]];
  mb.reserve(figSpotsU, uF, uF + 1);
  F.rug(mb, 9, 21, 14, 27, uF, 'darkRed', 'darkTan');
  mb.fill(rectCells({ x0: 7, z0: 11, x1: 16, z1: 32 }), uF, 'darkRed', { tiles: true });
  mb.boards(rectCells({ x0: 17, z0: 20, x1: 25, z1: 29 }), uF, woodFloor, 'x');
  mb.boards(rectCells({ x0: 26, z0: 20, x1: 31, z1: 29 }), uF, woodFloor, 'z');
  mb.fill(rectCells({ x0: 17, z0: 11, x1: 31, z1: 19 }), uF, 'sandGreen', { tiles: true });
  mb.fill(rectCells({ x0: 32, z0: 20, x1: 41, z1: 30 }), uF, 'darkBlue', { tiles: true });
  mb.fill(rectCells({ x0: 32, z0: 11, x1: 41, z1: 19 }), uF, (x, z) => ((x + z) % 2 ? 'white' : 'lbg'), { tiles: true, sizes: [[1, 1, '3070b']] });
  mb.unreserve(figSpotsU, uF, uF + 1);
  mb.use(lastU);

  // =================================================================== MODULE D
  mb.section('Attic floor', { bag: 7, module: 'D', level: 'attic', view: 'top', maxStep: 10, settle: true });
  mb.add('3460', C.wood, 17, Y.aSlab, 28, 0);
  chimTie(Y.aSlab);
  mb.fill(fp, Y.aSlab, 'dbg', { needSupport: true, global: true });
  const chimAll = CHIM.flatMap(chimCells);
  mb.bond([...fp, ...chimAll], Y.aSlab + 1, (x, z, w, d) => (touchesEdge(x, z, w, d) ? C.trim : 'dbg'));
  const boardsD = mb.section('Attic floorboards', { bag: 7, level: 'attic', view: 'top', maxStep: 16, settle: true });

  mb.section('Turret drum & top Tiffany panels', { bag: 7, level: 'roof', view: 'front' });
  const ey = Y.eave;
  tiffany([[20, 33], [21, 33]], ey + 1, 4);
  tiffany([[18, 32]], ey + 1, 4);
  tiffany([[23, 32]], ey + 1, 4);
  const drum = turretRing.filter(([, z]) => z >= HZF);
  const drumInside = turretDisk.filter(([x, z]) => z >= HZF && !drum.some(([a, b]) => a === x && b === z));
  mb.reserve(drumInside, ey, ey + 6);
  mb.wall(drum, ey, 2, (x, y, z) => trim.get(x + ',' + y + ',' + z) ?? C.brick);

  mb.section('Centre chimney', { bag: 7, level: 'roof', view: 'front' });
  const chimney = (x0, z0, w, d, y0, top) => {
    const id = w * d === 8 ? '3001' : '3003';
    const r = w === 2 && d === 4 ? 1 : 0;
    let yy = y0;
    for (; yy + 3 <= top; yy += 3) mb.add(id, yy + 6 > top ? C.trim : C.brick, x0, yy, z0, r);
    mb.add(w * d === 8 ? '3020' : '3022', C.trim, x0, yy, z0, r);
    mb.add('3062b', 'darkOrange', x0, yy + 1, z0); mb.add('3062b', 'darkOrange', x0 + (w - 1), yy + 1, z0 + (d - 1));
  };
  chimney(27, 19, 2, 2, ey, 97);
  for (const c of CHIM) chimney(c.inner === c.x0 ? c.x0 + 1 : c.x0, c.z0, 2, 4, ey, c.top);

  mb.section('The attic', { bag: 7, level: 'attic', view: 'back', maxStep: 12 });
  F.chest(mb, 18, ey, 13, 0, 'reddishBrown');
  mb.add('30150', 'medNougat', 24, ey, 12, 0);
  mb.add('2489', 'darkBrown', 18, ey, 24);
  F.chair(mb, 24, ey, 24, 2, 'reddishBrown');
  mb.add('24093', 'reddishBrown', 28, ey, 26, 0);
  F.dressForm(mb, 28, ey, 18);
  F.trunk(mb, 21, ey, 16, 1, 'darkBrown');
  F.rockingHorse(mb, 25, ey, 17, 1);
  mb.add('37776', 'black', 20, ey, 26);
  const lastD = mb.cur;
  mb.use(boardsD);
  mb.reserve([[20, 20], [21, 20]], ey, ey + 1);
  mb.boards(rectCells({ x0: 18, z0: 11, x1: 30, z1: 29 }), ey, (x, z) => ((x * 5 + z * 3) % 7 < 2 ? 'medNougat' : 'darkTan'), 'x');
  mb.unreserve([[20, 20], [21, 20]], ey, ey + 1);
  mb.use(lastD);

  mb.section('Main roof', { bag: 8, level: 'roof', view: 'front', maxStep: 14 });
  win(17, ey + 12, 19, 3, 'l');
  win(30, ey + 12, 19, 1, 'l');
  mb.gableRoof({ axis: 'x', a0: 17, a1: 31, b0: HZ0, b1: HZF, y: ey, color: C.roof, ends: C.trim, gable: { cols: [17, 30], color: wallColor } });

  mb.section('Turret roof', { bag: 8, level: 'roof', view: 'front', maxStep: 10 });
  mb.fill(rectCells({ x0: 17, z0: HZF, x1: 25, z1: 34 }), ey + 6, C.roof, { needSupport: true, global: true });
  for (let k = 0; ; k++) {
    const yy = ey + 7 + 3 * k, xa = 16 + k, xb = 26 - k, zb = 29 - k, zf = 35 - k;
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

  mb.section('Left wing roof & gable', { bag: 8, level: 'roof', view: 'front', maxStep: 14 });
  mb.add('30044', C.frame, 10, ey + 4, WA.zf, 0); mb.add('30046', C.frame, 10, ey + 4, WA.zf, 0);
  mb.gableRoof({ axis: 'z', a0: HZ0, a1: WA.zf + 1, b0: WA.x0, b1: WA.x1 - 1, y: ey, color: C.roof, ends: C.trim, gable: { cols: [HZ0, WA.zf], color: wallColor } });

  mb.section('Right wing roof & gable', { bag: 8, level: 'roof', view: 'front', maxStep: 14 });
  mb.add('30044', C.frame, 36, ey + 4, WC.zf, 0); mb.add('30046', C.frame, 36, ey + 4, WC.zf, 0);
  mb.gableRoof({ axis: 'z', a0: HZ0, a1: WC.zf + 1, b0: WC.x0, b1: WC.x1 - 1, y: ey, color: C.roof, ends: C.trim, gable: { cols: [HZ0, WC.zf], color: wallColor } });

  // =================================================================== MODULE A: the grounds
  mb.section('Terrace retaining walls', { bag: 9, module: 'A', level: 'garden', view: 'front', maxStep: 14 });
  const tx0 = 2, tx1 = 46, tz0 = 30, tz1 = 45;
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
  mb.wall(pillarsCells, 1, 5, (x, y) => (y >= 13 ? C.trim : C.brick));
  mb.fill(pillarsCells, 16, C.trim);

  mb.section('Terrace supports', { bag: 9, level: 'garden', view: 'front' });
  const retainSet = cellSet([...retain, ...pillarsCells]);
  const terrace = [];
  for (let x = tx0 + 1; x < tx1 - 1; x++) for (let z = tz0; z < tz1 - 1; z++) if (!fpAll.has(key(x, z)) && !retainSet.has(key(x, z))) terrace.push([x, z]);
  const posts = terrace.filter(([x, z]) => (x - 3) % 5 === 0 && (z - 32) % 4 === 0 && !(x >= 25 && x <= 32));
  mb.wall(posts, 1, 2, 'dbg');

  mb.section('Front lawn & cobbled path', { bag: 9, level: 'garden', view: 'front', maxStep: 14 });
  const path = rectCells({ x0: 27, z0: 40, x1: 31, z1: 44 });
  const pathSet = cellSet(path);
  mb.fill(terrace.filter(([x, z]) => !pathSet.has(key(x, z))), Y.terrace, C.lawn, { needSupport: true });
  mb.wall(path.filter(([, z]) => z === 41 || z === 43), 1, 2, 'dbg');
  mb.fill(path, Y.terrace, 'dbg');
  mb.fill(path, Y.terrace + 1, 'dbg');
  for (const [x, z] of path) mb.add('98138', ['lbg', 'dbg', 'darkTan', 'lbg'][(x * 3 + z * 5) % 4], x, Y.terrace + 2, z);
  mb.wall(rectCells({ x0: 27, z0: 44, x1: 31, z1: 45 }), 1, 1, C.brick);
  mb.fill(rectCells({ x0: 27, z0: 44, x1: 31, z1: 45 }), 4, 'dbg');
  mb.fill(rectCells({ x0: 27, z0: 44, x1: 31, z1: 45 }), 5, C.path, { tiles: true });
  mb.fill(retainOk, Y.terrace, C.trim, { sizes: [[8, 1, '3460'], [6, 1, '3666'], [4, 1, '3710'], [3, 1, '3623'], [2, 1, '3023'], [1, 1, '3024']] });

  mb.section('Iron fence & gate lamps', { bag: 9, level: 'garden', view: 'front', maxStep: 12 });
  const fenceRun = (x0, x1, z) => {
    let x = x0;
    while (x1 - x >= 4) { mb.add('19121', 'black', x, Y.terrace + 1, z, 0); x += 4; }
    while (x < x1) { mb.add('3062b', 'black', x, Y.terrace + 1, z); mb.add('3062b', 'black', x, Y.terrace + 4, z); x++; }
  };
  fenceRun(tx0, 25, tz1 - 1);
  fenceRun(33, tx1, tz1 - 1);
  F.lampPost(mb, 25, 17, 43);
  F.lampPost(mb, 31, 17, 43);
  F.mailbox(mb, 34, Y.terrace + 1, 42);

  mb.section('Trees, hedges & flower beds', { bag: 9, level: 'garden', view: 'front', maxStep: 14 });
  F.tree(mb, 5, Y.terrace + 1, 37, 6, 'darkGreen');
  F.tree(mb, 39, Y.terrace + 1, 38, 5, 'green');
  for (const [x, z] of [[8, 33], [11, 33], [14, 33], [35, 32], [38, 32]]) mb.tryAdd('6064', 'green', x, Y.terrace + 1, z);
  const flowers = ['red', 'white', 'yellow', 'darkRed', 'white'];
  const bed = [];
  for (let z = 35; z <= 42; z++) { bed.push([25, z]); bed.push([32, z]); }
  for (let x = 3; x <= 24; x += 2) bed.push([x, 43]);
  for (let x = 34; x <= 44; x += 2) bed.push([x, 43]);
  bed.forEach(([x, z], i) => { if (mb.tryAdd('32607', i % 3 ? 'green' : 'darkGreen', x, Y.terrace + 1, z) >= 0 && i % 2 === 0) mb.tryAdd('24866', flowers[i % flowers.length], x, Y.terrace + 2, z); });
  for (const [x, z] of [[22, 36], [19, 35], [33, 33], [41, 33], [3, 33], [17, 39], [9, 40], [42, 40]]) mb.tryAdd('2423', 'green', x, Y.terrace + 1, z);
  for (const [x, z] of [[13, 41], [36, 41], [22, 42], [4, 42], [44, 36]]) mb.tryAdd('24866', ['red', 'white', 'yellow'][(x + z) % 3], x, Y.terrace + 1, z);
  for (const [x, z] of [[33, 35], [23, 37]]) if (mb.tryAdd('3941', 'orange', x, Y.terrace + 1, z) >= 0) mb.add('6141', 'green', x, Y.terrace + 4, z);
  if (mb.tryAdd('3062b', 'orange', 24, Y.terrace + 1, 35) >= 0) mb.add('6141', 'green', 24, Y.terrace + 4, 35);

  mb.section('Backyard gazebo', { bag: 10, level: 'gazebo', view: 'back', maxStep: 12 });
  const gz = { x0: 8, z0: 1 };
  const gzAll = rectCells({ x0: gz.x0, z0: gz.z0, x1: gz.x0 + 8, z1: gz.z0 + 8 });
  mb.wall(rectRing({ x0: gz.x0, z0: gz.z0, x1: gz.x0 + 8, z1: gz.z0 + 8 }), 1, 1, 'white');
  mb.add('41539', 'white', gz.x0, 4, gz.z0);
  const gzPosts = [[gz.x0, gz.z0], [gz.x0 + 7, gz.z0], [gz.x0, gz.z0 + 7], [gz.x0 + 7, gz.z0 + 7]];
  for (const [x, z] of gzPosts) mb.add('2453b', 'white', x, 5, z);
  mb.add('15332', 'white', gz.x0 + 2, 5, gz.z0, 0); mb.add('15332', 'white', gz.x0 + 2, 5, gz.z0 + 7, 0);
  mb.add('15332', 'white', gz.x0, 5, gz.z0 + 2, 1);
  mb.reserve([[gz.x0 + 3, gz.z0 + 3], [gz.x0 + 4, gz.z0 + 3]], 5, 6);
  F.bench(mb, gz.x0 + 2, 5, gz.z0 + 1, 0, 'white');
  mb.boards(gzAll, 5, woodFloor, 'x');
  mb.unreserve([[gz.x0 + 3, gz.z0 + 3], [gz.x0 + 4, gz.z0 + 3]], 5, 6);
  mb.add('41539', 'white', gz.x0, 20, gz.z0);
  mb.pyramid(gz.x0, gz.z0, 8, 21, C.roof);

  mb.section('Moira\'s grave & the backyard', { bag: 10, level: 'gazebo', view: 'back', maxStep: 14 });
  mb.add('3004', 'lbg', 20, 1, 4, 0); mb.add('3004', 'lbg', 20, 4, 4, 0); mb.add('6091', 'lbg', 20, 7, 4, 0);
  for (const [x, z] of [[19, 5], [22, 5], [20, 6], [21, 6]]) mb.add('24866', ['white', 'red'][(x + z) % 2], x, 1, z);
  for (const [x, z] of [[17, 7], [22, 8], [25, 7], [28, 8]]) mb.tryAdd('14769', 'lbg', x, 1, z);
  for (let x = 0; x + 4 <= 48; x += 4) if (!(x >= 8 && x < 16)) mb.tryAdd('15332', 'white', x, 1, 0, 0);
  F.tree(mb, 36, 1, 3, 7, 'darkGreen');
  F.tree(mb, 1, 1, 12, 5, 'green');
  mb.tryAdd('6064', 'green', 44, 1, 6); mb.tryAdd('6064', 'green', 29, 1, 2);
  F.bench(mb, 40, 1, 8, 2);

  // =================================================================== the residents
  mb.section('The residents', { bag: 11, level: 'figs', view: 'back', maxStep: 1 });
  F.minifig(mb, 'charles', 20, 1, 18, 2);
  F.minifig(mb, 'constance', 28, Y.gWall, 32, 0);
  F.minifig(mb, 'vivien', 11, gF, 25, 2);
  F.minifig(mb, 'ben', 36, gF, 27, 2);
  F.minifig(mb, 'moira', 35, gF, 14, 2);
  F.minifig(mb, 'tate', 20, gF, 24, 2);
  F.minifig(mb, 'violet', 37, uF, 22, 2);
  F.minifig(mb, 'rubberMan', 20, ey, 20, 2);
  F.minifig(mb, 'moiraOld', gz.x0 + 3, 5, gz.z0 + 3, 2);

  return mb;
}
