// Minifigures: hips & legs, a tapered torso with bent arms and C-shaped hands, a round head with a
// printed face and a hollow stud, and sculpted hair pieces. Proportions follow the real figure
// (1 unit = 1 stud = 8 mm): legs 1.5, torso 1.5, neck, head 1.08 tall and 1.12 wide.
import * as THREE from 'three';
import { PARTS } from '../core/parts.js';
import { COLORS } from '../core/colors.js';
import { merge, cbox, lathe } from './geometry.js';

const HEAD_Y0 = 3.14, HEAD_Y1 = 4.22, HEAD_R = 0.56;

// ------------------------------------------------------------------ geometry
function tube(points, radii, seg = 12) {
  // smooth tube through points (each [x,y,z]) with per-point radius
  const pos = [], nor = [];
  const rings = [];
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < points.length; i++) {
    const p = new THREE.Vector3(...points[i]);
    const a = new THREE.Vector3(...points[Math.max(0, i - 1)]), b = new THREE.Vector3(...points[Math.min(points.length - 1, i + 1)]);
    const t = b.sub(a).normalize();
    let n = new THREE.Vector3().crossVectors(t, up);
    if (n.lengthSq() < 1e-4) n = new THREE.Vector3().crossVectors(t, new THREE.Vector3(1, 0, 0));
    n.normalize();
    const bn = new THREE.Vector3().crossVectors(t, n).normalize();
    const ring = [];
    for (let k = 0; k <= seg; k++) {
      const ang = (k / seg) * Math.PI * 2;
      const d = n.clone().multiplyScalar(Math.cos(ang)).addScaledVector(bn, Math.sin(ang));
      ring.push([p.clone().addScaledVector(d, radii[i]), d]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) {
    const q = [rings[i][k], rings[i + 1][k], rings[i + 1][k + 1], rings[i][k + 1]];
    for (const j of [0, 1, 2, 0, 2, 3]) { pos.push(q[j][0].x, q[j][0].y, q[j][0].z); nor.push(q[j][1].x, q[j][1].y, q[j][1].z); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  // make sure faces point outward (normals are outward, fix winding)
  const p = g.attributes.position.array, nn = g.attributes.normal.array;
  for (let t = 0; t < p.length; t += 9) {
    const ax = p[t + 3] - p[t], ay = p[t + 4] - p[t + 1], az = p[t + 5] - p[t + 2];
    const bx = p[t + 6] - p[t], by = p[t + 7] - p[t + 1], bz = p[t + 8] - p[t + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    if (cx * nn[t] + cy * nn[t + 1] + cz * nn[t + 2] < 0) for (const arr of [p, nn]) for (let c = 0; c < 3; c++) { const tmp = arr[t + 3 + c]; arr[t + 3 + c] = arr[t + 6 + c]; arr[t + 6 + c] = tmp; }
  }
  return g;
}

function ball(r, x, y, z) { const g = new THREE.SphereGeometry(r, 14, 10); g.translate(x, y, z); return g; }

function arc(r0, y0, y1, rc, n = 3) {
  // profile of a cylinder side with rounded rims: bottom rim then top rim ([r, y, nr, ny])
  const out = [[0, y0, 0, -1], [r0 - rc, y0, 0, -1]];
  for (let i = 1; i < n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); out.push([r0 - rc + rc * Math.cos(a), y0 + rc + rc * Math.sin(a), Math.cos(a), Math.sin(a)]); }
  out.push([r0, y0 + rc, 1, 0], [r0, y1 - rc, 1, 0]);
  for (let i = 1; i < n; i++) { const a = (i / n) * (Math.PI / 2); out.push([r0 - rc + rc * Math.cos(a), y1 - rc + rc * Math.sin(a), Math.cos(a), Math.sin(a)]); }
  out.push([r0 - rc, y1, 0, 1], [0, y1, 0, 1]);
  return out;
}

let G = null;
export function figGeometries() {
  if (G) return G;
  const legs = merge([
    cbox(1.56, 0.34, 0.84, 0, 1.16, 0, 0.05),
    cbox(0.1, 0.25, 0.7, 0, 0.93, 0, 0.02),
    ...[-1, 1].flatMap((s) => [cbox(0.76, 0.92, 0.76, s * 0.4, 0.26, -0.03, 0.05), cbox(0.76, 0.28, 0.9, s * 0.4, 0, 0.04, 0.05)]),
  ]);
  // tapered torso: 1.56 wide at the hips, 1.18 at the shoulders, 0.8 deep
  const t = cbox(1.56, 1.5, 0.8, 0, 1.5, 0, 0.08);
  const tp = t.attributes.position;
  for (let i = 0; i < tp.count; i++) { const f = 1 - ((tp.getY(i) - 1.5) / 1.5) * (1 - 1.18 / 1.56); tp.setX(i, tp.getX(i) * f); }
  const torso = merge([t, lathe(arc(0.29, 3.0, HEAD_Y0 + 0.02, 0.03, 2), 16)]);
  // right arm (+x); the left one is mirrored
  const armPts = [[0.62, 2.84, 0], [0.72, 2.5, 0.0], [0.8, 2.15, 0.02], [0.83, 1.95, 0.16], [0.85, 1.8, 0.36]];
  const arm = merge([tube(armPts, [0.2, 0.21, 0.2, 0.19, 0.17], 14), ball(0.215, 0.62, 2.84, 0), ball(0.17, 0.85, 1.8, 0.36)]);
  const armArc = 1.5 * Math.PI;
  const hand = merge([
    new THREE.TorusGeometry(0.155, 0.085, 10, 20, armArc).rotateZ(Math.PI / 2 - armArc / 2).rotateX(-Math.PI / 2).rotateX(0.45).translate(0, 0, 0.08),
    new THREE.CylinderGeometry(0.085, 0.085, 0.2, 12).rotateX(Math.PI / 2 + 0.45).translate(0, 0.07, -0.1),
  ]);
  const head = lathe(arc(HEAD_R, HEAD_Y0, HEAD_Y1, 0.14, 4), 36, 0, 0, 0, true);
  const headStud = lathe([[0.3, HEAD_Y1 - 0.02, 1, 0], [0.3, HEAD_Y1 + 0.15, 1, 0], [0.285, HEAD_Y1 + 0.17, 0.5, 0.8], [0.2, HEAD_Y1 + 0.17, 0, 1], [0.2, HEAD_Y1 + 0.17, -1, 0], [0.2, HEAD_Y1 + 0.06, -1, 0], [0.2, HEAD_Y1 + 0.06, 0, 1], [0, HEAD_Y1 + 0.06, 0, 1]], 18);
  G = { legs, torso, arm, hand, head, headStud };
  return G;
}

// ------------------------------------------------------------------ hair
// A hair piece is a shell around the head: a dome on top, hanging down to a length that depends on
// the direction (front hairline, sides, back), plus extras (bun, ponytail, beehive).
const STYLES = {
  short:   { front: 3.98, side: 3.62, back: 3.36, top: 4.5, flare: 0.0, noise: 0.02 },
  messy:   { front: 3.9, side: 3.52, back: 3.28, top: 4.56, flare: 0.02, noise: 0.05, tufts: 0.07 },
  smooth:  { front: 4.0, side: 3.58, back: 3.24, top: 4.46, flare: 0.0, noise: 0 },
  mid:     { front: 3.98, side: 3.06, back: 2.95, top: 4.5, flare: 0.07, noise: 0.03, wave: 0.03 },
  long:    { front: 3.98, side: 2.86, back: 2.7, top: 4.5, flare: 0.1, noise: 0.03, wave: 0.035 },
  pony:    { front: 3.99, side: 3.62, back: 3.5, top: 4.46, flare: 0.0, noise: 0.01, pony: true },
  bun:     { front: 4.0, side: 3.62, back: 3.44, top: 4.46, flare: 0.0, noise: 0.01, bun: true },
  beehive: { front: 4.0, side: 3.56, back: 3.36, top: 4.62, flare: 0.02, noise: 0.015, hive: true },
};

function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }

function hairShell(st, seed = 3) {
  const U = 48, V = 18, R0 = 0.635, yDome = 3.98;
  const pos = [];
  const grid = [];
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const phase = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let j = 0; j <= V; j++) {
    const row = [];
    for (let i = 0; i < U; i++) {
      const a = (i / U) * Math.PI * 2;                 // 0 = front (+z)
      const ca = Math.cos(a);
      // hanging length by direction: front hairline, sides, back
      const fb = (1 - ca) / 2;                          // 0 front .. 1 back
      // the face stays clear up to ~65 degrees either side of the front
      const side = smooth((Math.abs(Math.sin(a)) - 0.86) / 0.12) * (ca < 0.42 ? 1 : 0) + (ca < 0.42 ? smooth((0.42 - ca) / 0.25) : 0);
      let yEnd = st.front + (st.back - st.front) * smooth((fb - 0.3) / 0.6);
      yEnd = Math.min(yEnd, st.front - (st.front - st.side) * Math.min(1, side));
      const v = j / V;
      // arc length split: dome part (top .. yDome) then hanging part (yDome .. yEnd)
      const domeShare = 0.5;
      let y, r;
      if (v <= domeShare) {
        const t = v / domeShare;                         // 0 at the pole, 1 at the dome rim
        const ang = t * Math.PI / 2;
        y = yDome + (st.top - yDome) * Math.cos(ang);
        r = R0 * Math.sin(ang);
      } else {
        const t = (v - domeShare) / (1 - domeShare);
        const yy = Math.min(yDome, yEnd);
        y = yDome + (yy - yDome) * t;
        r = R0 + st.flare * t * t;
      }
      const n = st.noise * (Math.sin(a * 5 + phase[0] + v * 4) * 0.6 + Math.sin(a * 11 + phase[1]) * 0.4);
      const w = st.wave ? st.wave * Math.sin(y * 18 + a * 2 + phase[2]) * smooth((yDome - y) / 0.3) : 0;
      const tuft = st.tufts ? st.tufts * Math.max(0, Math.sin(a * 7 + phase[1])) * smooth((y - 4.1) / 0.3) : 0;
      r = Math.max(0, r * (1 + n + tuft) + w);
      row.push([Math.sin(a) * r, y, Math.cos(a) * r]);
    }
    grid.push(row);
  }
  const idx = [];
  for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
    const a = j * U + i, b = j * U + ((i + 1) % U), c = (j + 1) * U + ((i + 1) % U), d = (j + 1) * U + i;
    idx.push(a, d, c, a, c, b);
  }
  for (const row of grid) for (const p of row) pos.push(...p);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

const hairCache = new Map();
export function hairGeometry(style) {
  if (hairCache.has(style)) return hairCache.get(style);
  const st = STYLES[style] ?? STYLES.short;
  const list = [hairShell(st)];
  if (st.bun) list.push(ball(0.27, 0, 4.14, -0.58));
  if (st.pony) {
    list.push(ball(0.13, 0, 3.98, -0.63));
    list.push(tube([[0, 3.98, -0.66], [0, 3.8, -0.76], [0, 3.55, -0.78], [0, 3.3, -0.74], [0, 3.12, -0.68]], [0.14, 0.16, 0.15, 0.12, 0.06], 12));
  }
  if (st.hive) { const g = new THREE.SphereGeometry(0.52, 24, 16); g.scale(1, 0.85, 1); g.translate(0, 4.56, -0.12); list.push(g); }
  const g = merge(list);
  hairCache.set(style, g);
  return g;
}

// ------------------------------------------------------------------ printed faces
const faceCache = new Map();
export function makeFaceTexture(headId) {
  if (faceCache.has(headId)) return faceCache.get(headId);
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 320;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height);
  // canvas x 512 = front of the head; 1 unit of head height = 296 px (v), around: 1024 px = 2*pi*0.56
  const cx = 512, eyeY = 115, mouthY = 168;
  g.fillStyle = '#16120f'; g.strokeStyle = '#16120f'; g.lineCap = 'round';
  if (headId === '3626cpr0001') {
    // the classic grin: two round eyes and a smile
    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(cx + s * 52, eyeY, 13, 19, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffffff';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 52 + 4, eyeY - 7, 4, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 11;
    g.beginPath(); g.arc(cx, mouthY - 58, 72, 0.26 * Math.PI, 0.74 * Math.PI); g.stroke();
  } else if (headId === '3626cpr0895') {
    // skull
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 50, eyeY + 4, 30, 30, 0, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(cx, eyeY + 42); g.lineTo(cx - 12, eyeY + 64); g.lineTo(cx + 12, eyeY + 64); g.closePath(); g.fill();
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx - 56, mouthY + 26); g.lineTo(cx + 56, mouthY + 26); g.stroke();
    for (let i = -48; i <= 48; i += 16) { g.beginPath(); g.moveTo(cx + i, mouthY + 12); g.lineTo(cx + i, mouthY + 40); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.offset.x = 0.5;                // lathe u = 0 is the front (+z): sample the middle of the canvas there
  t.anisotropy = 4;
  faceCache.set(headId, t);
  return t;
}

// ------------------------------------------------------------------ assembled figure
const matCache = new Map();
function mat(hex, opts = {}) {
  const k = hex + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.3, clearcoat: 0.25, clearcoatRoughness: 0.35, ...opts }));
  return matCache.get(k);
}

// figParts: [{id, c, role, arms?, hands?}] -> Group standing at the origin facing +z
export function buildFigure(figParts, loose = false) {
  const g = figGeometries();
  const grp = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); grp.add(o); return o; };
  for (const f of figParts) {
    const hex = COLORS[f.c].hex;
    if (f.role === 'legs') add(g.legs, mat(hex));
    else if (f.role === 'torso') {
      add(g.torso, mat(hex));
      const am = mat(COLORS[f.arms].hex), hm = mat(COLORS[f.hands].hex);
      const r = add(g.arm, am); const l = add(g.arm, am); l.scale.x = -1;
      for (const s of [-1, 1]) add(g.hand, hm, s * 0.86, 1.68, 0.46);
      r.rotation.x = 0; l.rotation.x = 0;
    } else if (f.role === 'head') {
      const dy = loose ? -HEAD_Y0 : 0;
      const plain = PARTS[f.id]?.geo?.plain;
      add(g.head, plain ? mat(hex) : mat(hex, { map: makeFaceTexture(f.id) }), 0, dy);
      add(g.headStud, mat(hex), 0, dy);
    } else if (f.role === 'hair') {
      const m = mat(hex, { roughness: 0.42, clearcoat: 0.1, side: THREE.DoubleSide });
      add(hairGeometry(PARTS[f.id].geo.style), m);
    }
  }
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}

export const FIG_HEAD_Y = HEAD_Y0;
