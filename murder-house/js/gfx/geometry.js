// Procedural geometry for every part in parts.js.
// Units: 1 stud = 1.0, 1 plate = 0.4 (a brick = 1.2). Local origin: centre of the footprint at the bottom.
import * as THREE from 'three';
import { PARTS } from '../core/parts.js';

export const PLATE = 0.4;
const G = 0.022;            // gap between neighbouring bricks
const BEV = 0.045;          // rounded edges on every brick (catch the light like moulded ABS)
const STUD_R = 0.3, STUD_H = 0.18, SEG = 14;

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
  const hasUV = geos.length && geos.every((g) => g.attributes.uv);
  const uv = hasUV ? new Float32Array(count * 2) : null;
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

// Triangle soup with per-vertex normals; triangles are wound automatically so that they face
// the way their vertex normals point.
class Soup {
  constructor() { this.p = []; this.n = []; }
  tri(a, b, c, na, nb, nc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const mx = na[0] + nb[0] + nc[0], my = na[1] + nb[1] + nc[1], mz = na[2] + nb[2] + nc[2];
    if (cx * mx + cy * my + cz * mz < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
    this.p.push(...a, ...b, ...c); this.n.push(...na, ...nb, ...nc);
  }
  quad(a, b, c, d, na, nb, nc, nd) { this.tri(a, b, c, na, nb, nc); this.tri(a, c, d, na, nc, nd); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    return g;
  }
}

// Box with chamfered edges whose normals blend from one face to the next, so the edges read as
// rounded. (x, y, z) = centre of the bottom face.
export function cbox(w, h, d, x = 0, y = 0, z = 0, b = BEV) {
  const H = [w / 2, h / 2, d / 2];
  b = Math.min(b, H[0] * 0.45, H[1] * 0.45, H[2] * 0.45);
  const I = H.map((v) => v - b);
  const S = new Soup();
  const pt = (a) => [a[0] + x, a[1] + h / 2 + y, a[2] + z];
  const axN = (ax, s) => { const n = [0, 0, 0]; n[ax] = s; return n; };
  // faces
  for (let ax = 0; ax < 3; ax++) for (const s of [-1, 1]) {
    const u = (ax + 1) % 3, v = (ax + 2) % 3;
    const q = [];
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const c = [0, 0, 0]; c[ax] = s * H[ax]; c[u] = su * I[u]; c[v] = sv * I[v]; q.push(pt(c)); }
    const n = axN(ax, s);
    S.quad(q[0], q[1], q[2], q[3], n, n, n, n);
  }
  // edges
  for (let a1 = 0; a1 < 3; a1++) for (let a2 = a1 + 1; a2 < 3; a2++) {
    const c3 = 3 - a1 - a2;
    for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
      const P = (on1, t) => { const c = [0, 0, 0]; c[a1] = s1 * (on1 ? H[a1] : I[a1]); c[a2] = s2 * (on1 ? I[a2] : H[a2]); c[c3] = t * I[c3]; return pt(c); };
      const n1 = axN(a1, s1), n2 = axN(a2, s2);
      S.quad(P(true, -1), P(true, 1), P(false, 1), P(false, -1), n1, n1, n2, n2);
    }
  }
  // corners
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const sg = [sx, sy, sz];
    const v = [0, 1, 2].map((ax) => { const c = [0, 0, 0]; for (let k = 0; k < 3; k++) c[k] = sg[k] * (k === ax ? H[k] : I[k]); return pt(c); });
    S.tri(v[0], v[1], v[2], axN(0, sx), axN(1, sy), axN(2, sz));
  }
  return S.geo();
}

// Surface of revolution from a profile of [r, y, nr, ny] points (bottom to top), smooth normals
export function lathe(profile, seg = SEG, x = 0, y = 0, z = 0, uv = false) {
  const pos = [], nor = [], uvs = [];
  const y0 = profile[0][1], y1 = profile[profile.length - 1][1];
  for (let i = 0; i < profile.length - 1; i++) {
    const A = profile[i], B = profile[i + 1];
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      const P = (Q, a) => [Math.sin(a) * Q[0] + x, Q[1] + y, Math.cos(a) * Q[0] + z];
      const N = (Q, a) => { const l = Math.hypot(Q[2], Q[3]) || 1; return [Math.sin(a) * Q[2] / l, Q[3] / l, Math.cos(a) * Q[2] / l]; };
      const U = (Q, a) => [a / (Math.PI * 2), (Q[1] - y0) / ((y1 - y0) || 1)];
      const quad = [[A, a0], [A, a1], [B, a1], [B, a0]];
      for (const idx of [[0, 1, 2], [0, 2, 3]]) for (const j of idx) {
        const [Q, a] = quad[j];
        pos.push(...P(Q, a)); nor.push(...N(Q, a)); if (uv) uvs.push(...U(Q, a));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  // outward winding: lathe goes around counter-clockwise seen from above with +z at a=0 -> flip
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let t = 0; t < p.length; t += 9) {
    const ax = p[t + 3] - p[t], ay = p[t + 4] - p[t + 1], az = p[t + 5] - p[t + 2];
    const bx = p[t + 6] - p[t], by = p[t + 7] - p[t + 1], bz = p[t + 8] - p[t + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    if (cx * (n[t] + n[t + 3] + n[t + 6]) + cy * (n[t + 1] + n[t + 4] + n[t + 7]) + cz * (n[t + 2] + n[t + 5] + n[t + 8]) < 0) {
      for (const arr of uv ? [p, n] : [p, n]) for (let c = 0; c < 3; c++) { const tmp = arr[t + 3 + c]; arr[t + 3 + c] = arr[t + 6 + c]; arr[t + 6 + c] = tmp; }
      if (uv) { const u2 = g.attributes.uv.array, o = (t / 9) * 6; for (let c = 0; c < 2; c++) { const tmp = u2[o + 2 + c]; u2[o + 2 + c] = u2[o + 4 + c]; u2[o + 4 + c] = tmp; } }
    }
  }
  return g;
}

// rounded cylinder (round bricks, plates, tiles): bevelled top and bottom rims
function rcyl(r, h, x = 0, y = 0, z = 0, seg = 20, b = BEV) {
  const k = 1 - Math.SQRT1_2, c = Math.SQRT1_2;
  return lathe([[0, 0, 0, -1], [r - b, 0, 0, -1], [r - b * k, b * k, c, -c], [r, b, 1, 0], [r, h - b, 1, 0],
    [r - b * k, h - b * k, c, c], [r - b, h, 0, 1], [0, h, 0, 1]], seg, x, y, z);
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
// stud with a softly rounded top edge (the classic shape)
const STUD_PROFILE = [[STUD_R, 0, 1, 0], [STUD_R, STUD_H - 0.045, 1, 0], [STUD_R - 0.013, STUD_H - 0.013, 0.7, 0.7], [STUD_R - 0.045, STUD_H, 0, 1], [0, STUD_H, 0, 1]];
let studProto = null;
function stud(x, y, z) {
  studProto ??= lathe(STUD_PROFILE, SEG);
  return studProto.clone().translate(x, y, z);
}
// Top studs are drawn by the scene as their own instanced layer (only the ones not covered by
// another part); while a part's body is built they are collected instead of merged in.
let COLLECT = null;
function tstud(x, y, z) {
  if (COLLECT) { COLLECT.push([x, y, z]); return null; }
  return stud(x, y, z);
}
export function studGeometry() { studProto ??= lathe(STUD_PROFILE, SEG); return studProto; }
function studGrid(w, d, y, cells = null) {
  const out = [];
  for (let u = 0; u < w; u++) for (let v = 0; v < d; v++) {
    if (cells && !cells.some(([a, b]) => a === u && b === v)) continue;
    out.push(tstud(u + 0.5 - w / 2, y, v + 0.5 - d / 2));
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
  const parts = [cbox(p.w - 2 * G, H - G, p.d - 2 * G)];
  if (geo.studs) parts.push(...studGrid(p.w, p.d, H - G));
  if (geo.jumper) parts.push(tstud(0, H - G, 0));
  if (geo.sideStud) parts.push(stud(0, 0, 0).rotateX(Math.PI / 2).translate(0, H / 2, p.d / 2 - G));
  return merge(parts);
}

function masonry(p) {
  const H = p.h * PLATE, W = p.w - 2 * G, D = p.d - 2 * G, inset = 0.05;
  const parts = [cbox(W, H - G, D - 2 * inset, 0, 0, 0, 0.03)];
  const rows = 2, rh = (H - G) / rows, gap = 0.06;
  for (const face of [1, -1]) {
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 0.5 : 0;
      for (let x = -off; x < p.w; x += 1) {
        const x0 = Math.max(x, 0), x1 = Math.min(x + 1, p.w);
        if (x1 - x0 < 0.2) continue;
        parts.push(cbox(x1 - x0 - gap, rh - gap, inset + 0.02, (x0 + x1) / 2 - p.w / 2, r * rh + gap / 2, face * (D / 2 - inset / 2), 0.025));
      }
    }
  }
  parts.push(...studGrid(p.w, p.d, H - G));
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
  // 6091: a 1 x 2 brick whose top is one smooth arch along its length (low at both ends)
  const H = p.h * PLATE - G, base = 0.98, W = p.w - 2 * G;
  const top = (u) => { const t = (u / W) * 2 - 1; return base + (H - base) * Math.sqrt(Math.max(0, 1 - t * t)); };
  return heightfield(W, p.d - 2 * G, top, () => 0, range(0, W, 16), [0, p.d - 2 * G]);
}

function slope(p, kind) {
  const H = p.h * PLATE - G, w = p.w, d = p.d;
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
  for (const [u, v] of studs) parts.push(tstud(u + 0.5 - w / 2, H, v + 0.5 - d / 2));
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

// a smooth ellipsoid (for bushes and petals)
function blob(r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 12) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.67)));
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}
// one flat leaf blade: pointed oval, a little thickness, drooping outward from the centre
function leafBlade(len, wid, thick = 0.12, droop = 0.25, x = 0, y = 0, z = 0, ang = 0) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -wid * 0.18);
  sh.bezierCurveTo(len * 0.35, -wid * 0.75, len * 0.8, -wid * 0.55, len, 0);
  sh.bezierCurveTo(len * 0.8, wid * 0.55, len * 0.35, wid * 0.75, 0, wid * 0.18);
  sh.lineTo(0, -wid * 0.18);
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: len > 2 ? 7 : 5 });
  g.translate(0, 0, -thick / 2);
  g.rotateX(-Math.PI / 2);                       // lie flat, length along +x
  // droop: bend the blade down along its length
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const u = Math.max(0, pos.getX(i)) / len; pos.setY(i, pos.getY(i) - droop * u * u); }
  g.computeVertexNormals();
  g.rotateY(ang);
  g.translate(x, y, z);
  return g;
}

function plant(p, geo, seed = 7) {
  let s = seed;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const parts = [];
  if (geo.kind === 'leaves65') {
    // Plant Leaves 6 x 5: a central clip with five big fronds
    parts.push(rcyl(0.36, 0.34, 0, 0, 0, 12, 0.05));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      parts.push(leafBlade(2.6 + R() * 0.3, 1.25, 0.14, 0.45, 0, 0.22 + (i % 2) * 0.08, 0, a));
    }
    for (let i = 0; i < 3; i++) parts.push(leafBlade(1.5, 0.8, 0.12, 0.2, 0, 0.36, 0, (i / 3) * Math.PI * 2 + 1.1));
  } else if (geo.kind === 'leaves43') {
    parts.push(rcyl(0.34, 0.3, 0, 0, 0, 12, 0.05));
    for (let i = 0; i < 3; i++) parts.push(leafBlade(1.7, 0.95, 0.13, 0.3, 0, 0.2 + i * 0.04, 0, (i / 3) * Math.PI * 2 + 0.5));
  } else if (geo.kind === 'bush') {
    // Plant Bush 2 x 2 x 4: lumpy cone
    parts.push(rcyl(0.95, 0.4, 0, 0, 0, 16, 0.06));
    for (let k = 0; k < 5; k++) {
      const yy = 0.7 + k * 0.72, rr = 0.95 - k * 0.15;
      const n = Math.max(1, 6 - k);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 0.7;
        parts.push(blob(0.46 - k * 0.04, Math.cos(a) * rr * 0.55, yy, Math.sin(a) * rr * 0.55, 1, 0.85, 1));
      }
    }
    parts.push(blob(0.34, 0, 4.2, 0, 1, 0.9, 1));
  } else if (geo.kind === 'leaf3') {
    parts.push(rcyl(0.45, 0.2, 0, 0, 0, 14, 0.04), tstud(0, 0.2, 0));
    for (let i = 0; i < 3; i++) parts.push(leafBlade(0.75, 0.42, 0.08, 0.08, 0, 0.1, 0, (i / 3) * Math.PI * 2 + 0.4));
  } else if (geo.kind === 'flower') {
    parts.push(cyl(0.12, 0.12, 0.26, 0, 0, 0, 8));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; parts.push(blob(0.2, Math.cos(a) * 0.24, 0.3, Math.sin(a) * 0.24, 1.15, 0.45, 0.9, 8)); }
    parts.push(blob(0.12, 0, 0.36, 0, 1, 0.7, 1, 8));
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
    case 'lantern': return merge([
      rcyl(0.36, 0.14, 0, 0, 0, 14, 0.03), cyl(0.3, 0.3, 0.62, 0, 0.14, 0, 12), rcyl(0.38, 0.1, 0, 0.76, 0, 14, 0.03),
      cyl(0.12, 0.3, 0.14, 0, 0.86, 0, 12), new THREE.TorusGeometry(0.16, 0.035, 6, 14).translate(0, 1.08, 0),
      ...[0, 1, 2, 3].map((i) => box(0.05, 0.62, 0.05, Math.cos(i * Math.PI / 2 + 0.78) * 0.32, 0.14, Math.sin(i * Math.PI / 2 + 0.78) * 0.32)),
    ]);
    case 'bat': {
      const wing = new THREE.Shape();
      wing.moveTo(0, 0); wing.lineTo(0.95, 0.25); wing.lineTo(0.8, 0.02); wing.lineTo(0.62, 0.12); wing.lineTo(0.5, -0.08); wing.lineTo(0.3, 0.02); wing.lineTo(0.12, -0.18); wing.lineTo(0, -0.1);
      const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.05, bevelEnabled: false });
      return merge([
        sphere(0.17, 0, 0.45, 0, 1, 1.35, 1, 1), sphere(0.13, 0, 0.72, 0.02, 1, 1, 1, 1),
        cyl(0.0, 0.05, 0.14, -0.08, 0.78, 0, 4), cyl(0.0, 0.05, 0.14, 0.08, 0.78, 0, 4),
        wg.clone().translate(0.08, 0.5, -0.025), wg.clone().scale(-1, 1, 1).translate(-0.08, 0.5, -0.025),
        cyl(0.12, 0.12, 0.1, 0, 0, 0, 8),
      ]);
    }
    case 'web': {
      const parts = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const g = new THREE.BoxGeometry(0.035, 0.9, 0.035); g.translate(0, 0.45, 0); g.rotateZ(a); g.translate(0, 0.2, 0); parts.push(g); }
      for (const r of [0.22, 0.44, 0.66]) parts.push(new THREE.TorusGeometry(r, 0.018, 3, 8).translate(0, 0.2, 0));
      return merge(parts);
    }
    case 'goblet': return merge([cyl(0.22, 0.26, 0.05, 0, 0, 0, 12), cyl(0.05, 0.06, 0.35, 0, 0.05, 0, 8), cyl(0.28, 0.08, 0.2, 0, 0.4, 0, 12), cyl(0.3, 0.28, 0.2, 0, 0.6, 0, 12)]);
    case 'bowl': return merge([lathe([[0, 0, 0, -1], [0.22, 0, 0.2, -1], [0.42, 0.18, 1, -0.4], [0.46, 0.34, 1, 0.2], [0.4, 0.34, -1, 0.3], [0.2, 0.14, -0.4, 1], [0, 0.14, 0, 1]], 16)]);
    case 'pole': return merge([rcyl(0.3, 0.3, 0, 0, 0, 14, 0.03), cyl(0.12, 0.12, H - 0.5, 0, 0.3, 0, 10), rcyl(0.3, 0.2, 0, H - 0.2, 0, 14, 0.03), tstud(0, H, 0)]);
    default: return merge([box(p.w - 0.1, H, p.d - 0.1)]);
  }
}

// ------------------------------------------------------------------ public
const cache = new Map();
// returns { geo, glass?, lattice? } ; glass parts return transparent geometry in `geo`
export function partGeometry(id) {
  if (cache.has(id)) return cache.get(id);
  COLLECT = [];
  let out;
  try { out = build(id); } finally { out ??= {}; out.studs = COLLECT; COLLECT = null; }
  out.body = out.geo;
  if (out.studs.length) out.geo = merge([out.body, ...out.studs.map(([x, y, z]) => stud(x, y, z))]);
  cache.set(id, out);
  return out;
}

function build(id) {
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
      const list = [rcyl(geo.r - G, H - G, 0, 0, 0, geo.r > 0.6 ? 28 : 18)];
      if (geo.studs) list.push(...(p.w === 1 ? [tstud(0, H - G, 0)] : studGrid(p.w, p.d, H - G)));
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
  return out;
}
