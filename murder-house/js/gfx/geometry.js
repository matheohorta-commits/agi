// Procedural geometry for every part in parts.js.
// Units: 1 stud = 1.0, 1 plate = 0.4 (a brick = 1.2). Local origin: centre of the footprint at the bottom.
import * as THREE from 'three';
import { PARTS } from '../core/parts.js';

export const PLATE = 0.4;
const G = 0.018;            // gap between neighbouring bricks
const STUD_R = 0.3, STUD_H = 0.17, SEG = 14;

// ------------------------------------------------------------------ low level helpers
function nonIndexed(g) { return g.index ? g.toNonIndexed() : g; }

export function merge(list) {
  const geos = list.filter(Boolean).map((g) => {
    let n = nonIndexed(g);
    if (!n.attributes.normal) n.computeVertexNormals();
    return n;
  });
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return g;
}
function cyl(rt, rb, h, x = 0, y = 0, z = 0, seg = SEG) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y + h / 2, z);
  return g;
}
function sphere(r, x, y, z, sx = 1, sy = 1, sz = 1, detail = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}
function stud(x, y, z) { return cyl(STUD_R, STUD_R, STUD_H, x, y, z); }
function studGrid(w, d, y, cells = null) {
  const out = [];
  for (let u = 0; u < w; u++) for (let v = 0; v < d; v++) {
    if (cells && !cells.some(([a, b]) => a === u && b === v)) continue;
    out.push(stud(u + 0.5 - w / 2, y, v + 0.5 - d / 2));
  }
  return out;
}

// Solid between a bottom and a top height field over [0,w]x[0,d] (local u,v from the back-left corner).
function heightfield(w, d, top, bot, us, vs) {
  const P = [];
  const X = (u) => u - w / 2, Z = (v) => v - d / 2;
  const tri = (a, b, c) => P.push(...a, ...b, ...c);
  const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e); };
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) {
    const u0 = us[i], u1 = us[i + 1], v0 = vs[j], v1 = vs[j + 1];
    const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
    for (const [f, up] of [[top, true], [bot, false]]) {
      const a = [X(u0), f(u0, v0), Z(v0)], b = [X(u1), f(u1, v0), Z(v0)], c = [X(u1), f(u1, v1), Z(v1)], e = [X(u0), f(u0, v1), Z(v1)];
      // choose the diagonal that matches the surface at the cell centre
      const m1 = (a[1] + c[1]) / 2, m2 = (b[1] + e[1]) / 2, fm = f(um, vm);
      const diagAC = Math.abs(m1 - fm) <= Math.abs(m2 - fm);
      if (up) { if (diagAC) { tri(a, c, b); tri(a, e, c); } else { tri(a, e, b); tri(b, e, c); } }
      else { if (diagAC) { tri(a, b, c); tri(a, c, e); } else { tri(a, b, e); tri(b, c, e); } }
    }
  }
  // side walls
  const side = (pts, outward) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [u0, v0] = pts[k], [u1, v1] = pts[k + 1];
      const a = [X(u0), bot(u0, v0), Z(v0)], b = [X(u1), bot(u1, v1), Z(v1)];
      const c = [X(u1), top(u1, v1), Z(v1)], e = [X(u0), top(u0, v0), Z(v0)];
      if (c[1] - b[1] < 1e-4 && e[1] - a[1] < 1e-4) continue;
      if (outward) quad(a, b, c, e); else quad(a, e, c, b);
    }
  };
  side(us.map((u) => [u, d]), true);     // front (+z)
  side(us.map((u) => [u, 0]), false);    // back
  side(vs.map((v) => [w, v]), false);    // right
  side(vs.map((v) => [0, v]), true);     // left
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals();
  return g;
}

function range(a, b, n) { const out = []; for (let i = 0; i <= n; i++) out.push(a + (b - a) * i / n); return out; }

// ------------------------------------------------------------------ builders per geo type
function boxPart(p, geo) {
  const H = p.h * PLATE;
  const parts = [box(p.w - 2 * G, H, p.d - 2 * G)];
  if (geo.studs) parts.push(...studGrid(p.w, p.d, H));
  if (geo.jumper) parts.push(stud(0, H, 0));
  if (geo.sideStud) parts.push(new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, SEG).rotateX(Math.PI / 2).translate(0, H / 2, p.d / 2 + STUD_H / 2));
  return merge(parts);
}

function masonry(p) {
  const H = p.h * PLATE, W = p.w - 2 * G, D = p.d - 2 * G, inset = 0.05;
  const parts = [box(W, H, D - 2 * inset)];
  const rows = 2, rh = H / rows, gap = 0.05;
  for (const face of [1, -1]) {
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 0.5 : 0;
      for (let x = -off; x < p.w; x += 1) {
        const x0 = Math.max(x, 0), x1 = Math.min(x + 1, p.w);
        if (x1 - x0 < 0.2) continue;
        parts.push(box(x1 - x0 - gap, rh - gap, inset, (x0 + x1) / 2 - p.w / 2, r * rh + gap / 2, face * (D / 2 - inset / 2)));
      }
    }
  }
  parts.push(...studGrid(p.w, p.d, H));
  return merge(parts);
}

function logBrick(p) {
  const H = p.h * PLATE;
  const parts = [box(p.w - 2 * G, H, p.d - 0.25)];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.CylinderGeometry(0.2, 0.2, p.w - 2 * G, 10);
    g.rotateZ(Math.PI / 2);
    g.translate(0, 0.2 + i * 0.4, 0);
    parts.push(g.clone().translate(0, 0, 0.3), g.clone().translate(0, 0, -0.3));
  }
  parts.push(...studGrid(p.w, p.d, H));
  return merge(parts);
}

function curvedTop(p) {
  // brick with a quarter-round top along its length (6091)
  const H = p.h * PLATE, base = 0.4;
  const top = (u, v) => {
    const t = Math.min(1, Math.max(0, v / p.d));
    return base + (H - base) * Math.sqrt(Math.max(0, 1 - t * t));
  };
  return heightfield(p.w - 2 * G, p.d - 2 * G, top, () => 0, [0, p.w - 2 * G], range(0, p.d - 2 * G, 8));
}

function slope(p, kind) {
  const H = p.h * PLATE, w = p.w, d = p.d;
  let top, bot = () => 0, us = [0, w], vs, studs = [];
  const lip = 0.2 * (p.h / 3);
  if (kind === '45' || kind === '33' || kind === '65' || kind === '75') {
    const flat = 1;
    top = (u, v) => (v <= flat ? H : H - (v - flat) / (d - flat) * (H - lip));
    vs = [0, flat, d];
    for (let u = 0; u < w; u++) studs.push([u, 0]);
  } else if (kind === '30') {
    top = (u, v) => H - (v / d) * (H - 0.12);
    vs = [0, d];
  } else if (kind === 'double') {
    const m = d / 2;
    top = (u, v) => H - Math.abs(v - m) / m * (H - lip);
    vs = [0, m, d];
  } else if (kind === 'convex') {
    const g = (t) => (t <= 1 ? H : H - (t - 1) * (H - lip));
    top = (u, v) => Math.min(g(v), g(u));
    us = [0, 1, 2]; vs = [0, 1, 2];
  } else if (kind === 'inv' || kind === 'inv75') {
    top = () => H;
    bot = (u, v) => (v <= 1 ? 0 : Math.min(H - lip, (v - 1) / (d - 1) * (H - lip)));
    vs = [0, 1, d];
    for (let u = 0; u < w; u++) for (let v = 0; v < d; v++) studs.push([u, v]);
  } else if (kind === 'curve') {
    top = (u, v) => { const t = v / d; return lip * 0.4 + (H - lip * 0.4) * Math.cos(t * Math.PI / 2); };
    vs = range(0, d, 10);
  }
  // shrink a hair for the gap
  const sx = (w - 2 * G) / w, sz = (d - 2 * G) / d;
  const g = heightfield(w, d, top, bot, us, vs);
  g.scale(sx, 1, sz);
  const parts = [g];
  for (const [u, v] of studs) parts.push(stud(u + 0.5 - w / 2, H, v + 0.5 - d / 2));
  return merge(parts);
}

function arch(p, geo) {
  const W = p.w - 2 * G, H = p.h * PLATE, D = p.d - 2 * G;
  const s = new THREE.Shape();
  const hw = geo.span / 2, rise = Math.min(geo.rise, H - 0.2);
  s.moveTo(-W / 2, 0); s.lineTo(-hw, 0);
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const a = Math.PI - (i / N) * Math.PI;
    s.lineTo(hw * Math.cos(a), rise * Math.sin(a));
  }
  s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.lineTo(-W / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -D / 2);
  return merge([g, ...studGrid(p.w, p.d, H)]);
}

function archTop(p) {
  // 1x3x2 with curved top: arch opening below + rounded crown, no studs
  const W = p.w - 2 * G, H = p.h * PLATE, D = p.d - 2 * G;
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(-0.5, 0);
  for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI; s.lineTo(0.5 * Math.cos(a), 1.2 + 0.5 * Math.sin(a)); }
  s.lineTo(0.5, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H * 0.55);
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; s.lineTo(W / 2 * Math.cos(a), H * 0.55 + (H * 0.45) * Math.sin(a)); }
  s.lineTo(-W / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
  g.translate(0, 0, -D / 2);
  return merge([g]);
}

function archInv(p) {
  // 1x3x2 inverted arch: flat top, one leg, the underside bows up to the far end
  const W = p.w - 2 * G, H = p.h * PLATE, D = p.d - 2 * G;
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(-W / 2 + 1 - G, 0);
  const rx = W - 1 + G, ry = H - 0.3;
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * (Math.PI / 2); s.lineTo(W / 2 - rx * Math.cos(a), ry * Math.sin(a)); }
  s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.lineTo(-W / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
  g.translate(0, 0, -D / 2);
  return merge([g, ...studGrid(p.w, p.d, H)]);
}

function windowFrame(p, geo) {
  const W = p.w - 2 * G, H = p.h * PLATE, D = p.d - 2 * G;
  const t = 0.16, head = 0.36, sill = 0.24;
  const parts = [
    box(W, sill, D, 0, 0, 0),
    box(t, H - sill - head, D * 0.55, -W / 2 + t / 2, sill, D * 0.2),
    box(t, H - sill - head, D * 0.55, W / 2 - t / 2, sill, D * 0.2),
    // flat front frame border
    box(W, 0.1, 0.08, 0, sill, D / 2 - 0.04),
    box(0.1, H - sill - head, 0.08, -W / 2 + t + 0.05, sill, D / 2 - 0.04),
    box(0.1, H - sill - head, 0.08, W / 2 - t - 0.05, sill, D / 2 - 0.04),
  ];
  if (geo.round) {
    // rounded top: build head as an arch
    const s = new THREE.Shape();
    const r = W / 2 - t;
    const yb = H - head - r * 0.6;
    s.moveTo(-W / 2, yb); s.lineTo(-r, yb);
    for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI; s.lineTo(r * Math.cos(a), yb + r * 0.9 * Math.sin(a)); }
    s.lineTo(W / 2, yb); s.lineTo(W / 2, H - 0.2);
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; s.lineTo(W / 2 * Math.cos(a), H - 0.2 + 0.2 * Math.sin(a)); }
    const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
    g.translate(0, 0, -D / 2);
    parts.push(g);
  } else {
    parts.push(box(W, head, D, 0, H - head, 0));
    parts.push(...studGrid(p.w, p.d, H));
  }
  if (geo.panes === 3) {
    parts.push(box(0.08, H - sill - head, 0.2, -W / 6, sill, 0.1), box(0.08, H - sill - head, 0.2, W / 6, sill, 0.1));
  }
  return merge(parts);
}

function glassPane(p, geo) {
  const W = p.w - 0.4, H = p.h * PLATE - 0.62, y0 = 0.24;
  // plain glass: a thin pane (rendered transparent because its colour is Trans-*)
  if (!geo.lattice) return box(W, H, 0.05, 0, y0, 0.12);
  // latticed panes are opaque leading bars with open holes (no glass)
  const bars = [];
  const bw = 0.06;
  bars.push(box(W, bw, 0.1, 0, y0, 0.14), box(W, bw, 0.1, 0, y0 + H - bw, 0.14), box(bw, H, 0.1, -W / 2 + bw / 2, y0, 0.14), box(bw, H, 0.1, W / 2 - bw / 2, y0, 0.14));
  if (geo.lattice === 'grid') {
    const cols = 2, rows = Math.max(2, Math.round(H / 0.55));
    for (let i = 1; i < cols; i++) bars.push(box(bw, H, 0.1, -W / 2 + (W * i) / cols, y0, 0.14));
    for (let j = 1; j < rows; j++) bars.push(box(W, bw, 0.1, 0, y0 + (H * j) / rows - bw / 2, 0.14));
  } else {
    const step = 0.42;
    const x0 = -W / 2, x1 = W / 2, ya = y0, yb = y0 + H;
    for (let c = -H - W; c < H + W; c += step) {
      for (const sgn of [1, -1]) {
        const pts = [];
        for (const x of [x0, x1]) { const y = ya + sgn * (x - x0) + c; if (y >= ya - 1e-6 && y <= yb + 1e-6) pts.push([x, y]); }
        for (const y of [ya, yb]) { const x = x0 + (y - ya - c) / sgn; if (x > x0 && x < x1) pts.push([x, y]); }
        if (pts.length < 2) continue;
        const [a, b] = pts;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.05) continue;
        const g = new THREE.BoxGeometry(len, bw, 0.1);
        g.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]));
        g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.14);
        bars.push(g);
      }
    }
  }
  return merge(bars);
}

function doorFrame(p) {
  const W = p.w - 2 * G, H = p.h * PLATE, D = p.d - 2 * G;
  return merge([
    box(0.3, H - 0.4, D, -W / 2 + 0.15, 0, 0),
    box(0.3, H - 0.4, D, W / 2 - 0.15, 0, 0),
    box(W, 0.4, D, 0, H - 0.4, 0),
    box(W - 0.6, 0.06, D, 0, 0, 0),
    ...studGrid(p.w, p.d, H),
  ]);
}

function door(p, geo) {
  const W = p.w - 0.7, H = p.h * PLATE - 0.52, t = 0.12, y0 = 0.06, z = 0.25;
  if (geo.kind === 'smooth') return merge([box(W, H, t, 0, y0, z), cyl(0.12, 0.12, 0.14, W / 2 - 0.35, y0 + H * 0.45, z + 0.12)]);
  // four panes: frame bars around 2x2 openings (upper half), solid lower panel
  const parts = [
    box(W, H * 0.45, t, 0, y0, z),                 // lower solid panel
    box(W, 0.14, t, 0, y0 + H - 0.14, z),          // top rail
    box(0.14, H * 0.55, t, -W / 2 + 0.07, y0 + H * 0.45, z),
    box(0.14, H * 0.55, t, W / 2 - 0.07, y0 + H * 0.45, z),
    box(0.1, H * 0.55, t, 0, y0 + H * 0.45, z),
    box(W, 0.1, t, 0, y0 + H * 0.72, z),
    // raised panels on the lower half
    box(W * 0.36, H * 0.3, 0.05, -W * 0.22, y0 + H * 0.07, z + 0.07),
    box(W * 0.36, H * 0.3, 0.05, W * 0.22, y0 + H * 0.07, z + 0.07),
    cyl(0.14, 0.14, 0.14, W / 2 - 0.35, y0 + H * 0.42, z + 0.12),
  ];
  return merge(parts);
}

function fence(p, geo) {
  const W = p.w - 2 * G, H = p.h * PLATE;
  const parts = [];
  if (geo.kind === 'ornament') {
    parts.push(box(W, 0.2, 0.9, 0, 0, 0), box(W, 0.3, 0.9, 0, H - 0.3, 0), ...studGrid(p.w, p.d, H));
    for (let i = 0; i < 9; i++) parts.push(cyl(0.06, 0.06, H - 0.5, -W / 2 + 0.2 + i * (W - 0.4) / 8, 0.2, 0, 6));
    for (let i = 0; i < 4; i++) {
      const g = new THREE.TorusGeometry(0.22, 0.045, 5, 12);
      g.translate(-W / 2 + 0.5 + i, H * 0.55, 0);
      parts.push(g);
    }
  } else if (geo.kind === 'spindle') {
    parts.push(box(W, 0.25, 0.8, 0, 0, 0), box(W, 0.35, 0.8, 0, H - 0.35, 0), ...studGrid(p.w, p.d, H));
    for (let i = 0; i < 7; i++) parts.push(cyl(0.09, 0.09, H - 0.6, -W / 2 + 0.3 + i * (W - 0.6) / 6, 0.25, 0, 8));
  } else {
    parts.push(box(W, 0.18, 0.5, 0, 0, 0), box(W, 0.18, 0.5, 0, H - 0.18, 0));
    parts.push(box(0.15, H, 0.5, -W / 2 + 0.075, 0, 0), box(0.15, H, 0.5, W / 2 - 0.075, 0, 0));
    for (let c = -2; c < 6; c++) for (const s of [1, -1]) {
      const g = new THREE.BoxGeometry(1.05, 0.07, 0.3);
      g.rotateZ(s * Math.atan2(H - 0.36, 0.75));
      g.translate(-W / 2 + 0.4 + c * 0.75, H / 2, 0);
      if (Math.abs(-W / 2 + 0.4 + c * 0.75) < W / 2 - 0.2) parts.push(g);
    }
  }
  return merge(parts);
}

function plant(p, geo, seed = 7) {
  let s = seed;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const parts = [];
  if (geo.kind === 'leaves65') {
    parts.push(cyl(0.3, 0.3, 0.3, 0, 0, 0, 8));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, r = 1.2 + R() * 0.9;
      parts.push(sphere(0.9 + R() * 0.3, Math.cos(a) * r, 0.45 + R() * 0.35, Math.sin(a) * r * 0.85, 1.25, 0.42, 1.0, 0));
    }
    parts.push(sphere(1.1, 0, 0.6, 0, 1.3, 0.5, 1.2, 0));
  } else if (geo.kind === 'leaves43') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, r = 0.7 + R() * 0.4;
      parts.push(sphere(0.55, Math.cos(a) * r, 0.35 + R() * 0.3, Math.sin(a) * r * 0.7, 1.2, 0.5, 1, 0));
    }
    parts.push(sphere(0.6, 0, 0.55, 0, 1, 0.8, 1, 0));
  } else if (geo.kind === 'bush') {
    parts.push(cyl(0.9, 0.9, 0.4, 0, 0, 0, 10));
    for (let i = 0; i < 10; i++) {
      const a = R() * Math.PI * 2, r = R() * 0.45;
      parts.push(sphere(0.62 + R() * 0.25, Math.cos(a) * r, 0.9 + i * 0.36, Math.sin(a) * r, 1, 0.9, 1, 0));
    }
  } else if (geo.kind === 'leaf3') {
    parts.push(cyl(0.45, 0.45, 0.2, 0, 0, 0, 10), stud(0, 0.2, 0));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; parts.push(sphere(0.3, Math.cos(a) * 0.4, 0.25, Math.sin(a) * 0.4, 1.3, 0.3, 0.8, 0)); }
  } else if (geo.kind === 'flower') {
    parts.push(cyl(0.12, 0.12, 0.3, 0, 0, 0, 8));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; parts.push(sphere(0.22, Math.cos(a) * 0.28, 0.3, Math.sin(a) * 0.28, 1, 0.45, 1, 0)); }
  }
  return merge(parts);
}

function accessory(p, geo) {
  const H = p.h * PLATE;
  switch (geo.t) {
    case 'lamppost': return merge([
      cyl(0.9, 0.95, 0.35, 0, 0, 0, 16), cyl(0.55, 0.8, 0.5, 0, 0.35, 0, 12), cyl(0.2, 0.26, H - 1.9, 0, 0.85, 0, 10),
      cyl(0.32, 0.22, 0.25, 0, H - 1.05, 0, 10),
      // lantern
      box(0.7, 0.08, 0.7, 0, H - 0.8, 0), box(0.08, 0.6, 0.08, -0.3, H - 0.72, -0.3), box(0.08, 0.6, 0.08, 0.3, H - 0.72, -0.3),
      box(0.08, 0.6, 0.08, -0.3, H - 0.72, 0.3), box(0.08, 0.6, 0.08, 0.3, H - 0.72, 0.3), cyl(0.05, 0.5, 0.3, 0, H - 0.12, 0, 4),
    ]);
    case 'chair': return merge([
      box(1.9, 0.2, 1.9, 0, 0.8, 0), box(1.9, 1.3, 0.25, 0, 1.0, -0.82),
      box(0.25, 0.8, 0.25, -0.8, 0, -0.8), box(0.25, 0.8, 0.25, 0.8, 0, -0.8), box(0.25, 0.8, 0.25, -0.8, 0, 0.8), box(0.25, 0.8, 0.25, 0.8, 0, 0.8),
    ]);
    case 'candle': return merge([cyl(0.3, 0.38, 0.12, 0, 0, 0, 10), cyl(0.08, 0.1, 0.6, 0, 0.12, 0, 8), cyl(0.25, 0.1, 0.12, 0, 0.7, 0, 10), cyl(0.12, 0.12, 0.35, 0, 0.82, 0, 8)]);
    case 'bottle': return merge([cyl(0.28, 0.28, 0.65, 0, 0, 0, 10), cyl(0.12, 0.28, 0.2, 0, 0.65, 0, 10), cyl(0.1, 0.1, 0.3, 0, 0.85, 0, 8)]);
    case 'cup': return merge([cyl(0.3, 0.26, 0.55, 0, 0, 0, 12), new THREE.TorusGeometry(0.14, 0.04, 5, 10).translate(0.34, 0.3, 0)]);
    case 'pan': return merge([cyl(0.42, 0.36, 0.14, 0, 0, 0, 14), box(0.8, 0.06, 0.12, 0.8, 0.08, 0)]);
    case 'barrel': return merge([cyl(0.9, 0.8, H / 2, 0, 0, 0, 16), cyl(0.8, 0.9, H / 2, 0, H / 2, 0, 16), ...studGrid(2, 2, H)]);
    case 'crate': return merge([box(p.w - 0.1, H, p.d - 0.1), box(p.w - 0.3, 0.08, p.d - 0.3, 0, H, 0)]);
    case 'chestBase': return merge([box(p.w - 0.2, H, p.d - 0.2)]);
    case 'chestLid': {
      const g = heightfield(p.w - 0.2, p.d - 0.2, (u, v) => { const t = (v / (p.d - 0.2)) * 2 - 1; return 0.2 + 0.6 * Math.sqrt(Math.max(0, 1 - t * t)); }, () => 0, [0, p.w - 0.2], range(0, p.d - 0.2, 8));
      return merge([g.translate(0, 0, 0)]);
    }
    case 'cupboard': return merge([box(p.w - 0.06, 0.2, p.d - 0.06), box(p.w - 0.06, 0.4, p.d - 0.06, 0, H - 0.4, 0), box(0.16, H, p.d - 0.06, -p.w / 2 + 0.11, 0, 0), box(0.16, H, p.d - 0.06, p.w / 2 - 0.11, 0, 0), box(p.w - 0.06, H, 0.16, 0, 0, -p.d / 2 + 0.11), box(p.w - 0.3, 0.08, p.d - 0.4, 0, H / 2, 0), ...studGrid(p.w, p.d, H)]);
    case 'cupDoor': return merge([box(p.w - 0.35, H - 0.62, 0.1, 0, 0.21, 0.45), cyl(0.07, 0.07, 0.1, p.w / 2 - 0.45, H / 2, 0.52)]);
    case 'drawer': return merge([box(p.w - 0.35, H - 0.3, 0.1, 0, 0.15, 0.45), box(0.5, 0.08, 0.08, 0, H / 2, 0.52)]);
    case 'flame': return merge([sphere(0.28, 0, 0.35, 0, 1, 1.6, 1, 1), cyl(0.02, 0.2, 0.55, 0, 0.55, 0, 6)]);
    case 'flame2': return merge([cyl(0.35, 0.35, 0.1, 0, 0, 0, 10), sphere(0.3, 0.05, 0.4, 0, 1, 1.4, 0.9, 1), cyl(0.0, 0.22, 0.6, 0, 0.6, 0, 6)]);
    case 'lever': return merge([box(0.9, 0.25, 1.8, 0, 0, 0), cyl(0.06, 0.06, 0.7, 0, 0.25, 0, 6).rotateX(0.5)]);
    case 'statuette': return merge([cyl(0.35, 0.4, 0.25, 0, 0, 0, 10), cyl(0.16, 0.2, 1.2, 0, 0.25, 0, 8), sphere(0.2, 0, 1.6, 0, 1, 1.1, 1, 1)]);
    case 'book': return merge([box(1.6, 0.25, 0.9, 0, 0, 0)]);
    default: return merge([box(p.w - 0.1, H, p.d - 0.1)]);
  }
}

// ------------------------------------------------------------------ minifigure pieces (built per figure)
export function figGeometries() {
  const legs = merge([
    box(1.5, 0.38, 0.7, 0, 1.12, 0),                      // hips
    box(0.7, 1.1, 0.7, -0.38, 0, 0.02), box(0.7, 1.1, 0.7, 0.38, 0, 0.02),
    box(0.7, 0.2, 0.3, -0.38, 0, 0.45), box(0.7, 0.2, 0.3, 0.38, 0, 0.45),
  ]);
  // torso: tapered box
  const t = new THREE.BoxGeometry(1.5, 1.3, 0.7);
  const pos = t.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setX(i, pos.getX(i) * 0.72);
  t.computeVertexNormals();
  t.translate(0, 1.5 + 0.65, 0);
  const torso = merge([t, cyl(0.28, 0.28, 0.12, 0, 2.8, 0, 10)]);
  const armL = merge([cyl(0.2, 0.22, 1.0, 0, -0.9, 0, 8)]);
  const hand = merge([cyl(0.14, 0.14, 0.25, 0, -0.2, 0, 8)]);
  const head = new THREE.CylinderGeometry(0.46, 0.46, 0.9, 20);
  head.translate(0, 2.92 + 0.45, 0);
  const headTop = merge([cyl(0.3, 0.3, 0.16, 0, 3.82, 0, 12), cyl(0.4, 0.46, 0.06, 0, 3.82, 0, 16)]);
  return { legs, torso, armL, hand, head, headTop };
}

export function hairGeometry(style) {
  const y = 3.35;
  const cap = sphere(0.56, 0, y + 0.15, 0, 1, 0.9, 1.02, 2);
  switch (style) {
    case 'long': return merge([cap, box(1.1, 1.2, 0.35, 0, y - 0.7, -0.35), box(0.3, 1.0, 0.7, -0.5, y - 0.6, -0.05), box(0.3, 1.3, 0.5, 0.55, y - 0.9, 0.05)]);
    case 'mid': return merge([cap, box(1.1, 0.8, 0.4, 0, y - 0.35, -0.32), box(0.25, 0.7, 0.7, -0.5, y - 0.3, -0.05), box(0.25, 0.7, 0.7, 0.5, y - 0.3, -0.05)]);
    case 'beehive': return merge([sphere(0.6, 0, y + 0.45, -0.05, 1, 1.35, 1.05, 2), box(0.25, 0.6, 0.6, -0.52, y - 0.2, -0.05), box(0.25, 0.6, 0.6, 0.52, y - 0.2, -0.05)]);
    case 'bun': return merge([cap, sphere(0.3, 0, y + 0.3, -0.55, 1, 1, 1, 1)]);
    case 'pony': return merge([cap, box(1.0, 0.3, 0.3, 0, y - 0.05, -0.4), sphere(0.22, 0, y - 0.2, -0.62, 1, 2.2, 1, 1)]);
    case 'messy': {
      const tufts = [];
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; tufts.push(sphere(0.2, Math.cos(a) * 0.42, y + 0.45 + (i % 2) * 0.08, Math.sin(a) * 0.42, 1, 0.7, 1, 0)); }
      return merge([sphere(0.57, 0, y + 0.15, 0, 1, 0.92, 1.03, 2), box(1.0, 0.4, 0.3, 0, y - 0.15, -0.38), ...tufts]);
    }
    case 'smooth': return merge([sphere(0.58, 0, y + 0.08, 0, 1, 1.05, 1.03, 2), box(1.06, 0.9, 0.36, 0, y - 0.55, -0.36)]);
    default: return merge([cap, box(1.0, 0.35, 0.3, 0, y - 0.1, -0.38)]);
  }
}

// ------------------------------------------------------------------ public
const cache = new Map();
// returns { geo, glass?, lattice? } ; glass parts return transparent geometry in `geo`
export function partGeometry(id) {
  if (cache.has(id)) return cache.get(id);
  const p = PARTS[id];
  const geo = p.geo;
  let out;
  switch (geo.t) {
    case 'box': out = { geo: boxPart(p, geo) }; break;
    case 'grille': out = { geo: merge([box(p.w - 2 * G, PLATE, p.d - 2 * G), ...[0, 1, 2, 3].map((i) => box(p.w - 0.5, 0.05, 0.1, 0, PLATE, -0.3 + i * 0.2))]) }; break;
    case 'masonry': out = { geo: masonry(p) }; break;
    case 'log': out = { geo: logBrick(p) }; break;
    case 'curvedTop': out = { geo: curvedTop(p) }; break;
    case 'round': {
      const H = p.h * PLATE;
      const list = [cyl(geo.r, geo.r, H, 0, 0, 0, 20)];
      if (geo.studs) list.push(...(p.w === 1 ? [stud(0, H, 0)] : studGrid(p.w, p.d, H)));
      out = { geo: merge(list) };
      break;
    }
    case 'slope': out = { geo: slope(p, geo.kind) }; break;
    case 'cone': out = { geo: merge([cyl(0.24, 0.48, 1.0, 0, 0, 0, 16), cyl(0.2, 0.2, 0.2, 0, 1.0, 0, 12)]) }; break;
    case 'arch': out = { geo: arch(p, geo) }; break;
    case 'archTop': out = { geo: archTop(p) }; break;
    case 'archInv': out = { geo: archInv(p) }; break;
    case 'window': out = { geo: windowFrame(p, geo) }; break;
    case 'glass': out = { geo: glassPane(p, geo) }; break;
    case 'doorframe': out = { geo: doorFrame(p) }; break;
    case 'door': out = { geo: door(p, geo) }; break;
    case 'fence': out = { geo: fence(p, geo) }; break;
    case 'plant': out = { geo: plant(p, geo) }; break;
    default: out = { geo: accessory(p, geo) };
  }
  cache.set(id, out);
  return out;
}
