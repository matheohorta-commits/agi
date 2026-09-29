// three.js scene for the model: one InstancedMesh per part design, per-instance colours,
// visibility per part (build steps, level toggles), exploded floors, highlight, figures, snapshots.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PARTS, part, dims } from '../core/parts.js';
import { COLORS } from '../core/colors.js';
import { partGeometry, PLATE, figGeometries, hairGeometry } from './geometry.js';

export const LEVELS = ['base', 'garden', 'basement', 'ground', 'upper', 'attic', 'roof', 'gazebo', 'figs'];
const EXPLODE_RANK = { basement: 0, ground: 1, upper: 2, attic: 3, roof: 4 };

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function partMatrix(q, out = new THREE.Matrix4(), dy = 0) {
  const p = part(q.id);
  const d = dims(p, q.r);
  tmpV.set(q.x + d.w / 2 + (q.off?.[0] ?? 0), (q.y + dy) * PLATE, q.z + d.d / 2 + (q.off?.[1] ?? 0));
  tmpQ.setFromAxisAngle(Y_AXIS, (q.r * Math.PI) / 2);
  return out.compose(tmpV, tmpQ, tmpS);
}

function makeMaterials() {
  const glow = { value: 0.0 };        // extra glow for lit windows at night
  const opaque = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.0 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.75 });
  const trans = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.5, depthWrite: false });
  const transGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.78, depthWrite: false });
  const addGlow = (m, base, night) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = glow;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uGlow;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor * (${base.toFixed(2)} + uGlow * ${night.toFixed(2)});\n#endif`);
    };
  };
  addGlow(transGlow, 0.35, 1.4);
  addGlow(trans, 0.0, 0.9);
  return { opaque, metal, trans, transGlow, glow };
}

export class BrickScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 2000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.mats = makeMaterials();
    this.meshes = [];           // {mesh, id, mat, list:[partIndex]}
    this.slot = [];             // partIndex -> {mi, k}
    this.figs = new Map();      // partIndex -> Group
    this.visible = null;        // Uint8Array
    this.explode = 0;
    this.hiddenLevels = new Set();
    this.highlight = new Set();
    this.night = false;
    this._setupLights();
    this.clock = new THREE.Clock();
    this.onFrame = [];
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
  }

  _setupLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x4a4030, 1.25);
    s.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
    this.sun.position.set(-40, 90, 70);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 10; c.far = 260;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.target.position.set(24, 0, 24);
    s.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight(0xb8c8ff, 0.55);
    this.fill.position.set(80, 40, -30);
    s.add(this.fill);
    // warm interior lights for night mode
    this.lamps = [];
    for (const [x, y, z] of [[11, 26, 20], [22, 26, 24], [36, 26, 16], [36, 26, 24], [11, 18, 20], [22, 18, 14], [36, 18, 24], [22, 6, 20], [22, 30, 20]]) {
      const l = new THREE.PointLight(0xffb45a, 0, 22, 1.6);
      l.position.set(x, y, z);
      s.add(l); this.lamps.push(l);
    }
    this.moon = new THREE.DirectionalLight(0x6f86ff, 0);
    this.moon.position.set(60, 80, 90);
    s.add(this.moon);
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 1 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(24, -0.02, 24);
    this.ground.receiveShadow = true;
    s.add(this.ground);
    this.setNight(false);
  }

  setNight(on) {
    this.night = on;
    this.scene.background = new THREE.Color(on ? 0x0b0f1f : 0xcfd9e3);
    this.scene.fog = new THREE.Fog(on ? 0x0b0f1f : 0xcfd9e3, 140, 420);
    this.hemi.intensity = on ? 0.28 : 1.25;
    this.hemi.color.set(on ? 0x6a78b0 : 0xdfe8ff);
    this.sun.intensity = on ? 0 : 2.4;
    this.fill.intensity = on ? 0.05 : 0.55;
    this.moon.intensity = on ? 0.75 : 0;
    this.moon.castShadow = false;
    for (const l of this.lamps) l.intensity = on ? 60 : 0;
    this.mats.glow.value = on ? 1 : 0;
    this.ground.material.color.set(on ? 0x0e1118 : 0x3a3f47);
  }

  setModel(mb) {
    this.mb = mb;
    const P = mb.parts;
    for (const m of this.meshes) { this.scene.remove(m.mesh); m.mesh.dispose(); }
    for (const g of this.figs.values()) this.scene.remove(g);
    this.meshes = []; this.figs.clear();
    this.slot = new Array(P.length);
    this.levelOf = P.map((q) => {
      const lv = mb.sections[q.sec].level;
      if (lv !== 'figs') return lv;
      return q.y < 16 ? (q.y < 5 && q.z < 10 ? 'gazebo' : 'basement') : q.y < 38 ? (q.z > 29 ? 'ground' : 'ground') : q.y < 57 ? 'upper' : 'attic';
    });
    const groups = new Map();
    P.forEach((q, i) => {
      const p = part(q.id);
      if (q.id === 'fig' || p.figPart) { this._makeFig(i); return; }
      const c = COLORS[q.c];
      const kind = c.trans ? (c.glow ? 'transGlow' : 'trans') : c.metal ? 'metal' : 'opaque';
      const key = q.id + '|' + kind;
      if (!groups.has(key)) groups.set(key, { id: q.id, kind, list: [] });
      groups.get(key).list.push(i);
    });
    for (const g of groups.values()) {
      const geo = partGeometry(g.id).geo;
      if (!geo) continue;
      const mat = this.mats[g.kind];
      const mesh = new THREE.InstancedMesh(geo, mat, g.list.length);
      mesh.castShadow = g.kind === 'opaque' || g.kind === 'metal';
      mesh.receiveShadow = true;
      if (g.kind.startsWith('trans')) mesh.renderOrder = 2;
      const col = new THREE.Color();
      g.list.forEach((pi, k) => {
        mesh.setMatrixAt(k, partMatrix(P[pi], tmpM));
        mesh.setColorAt(k, col.set(COLORS[P[pi].c].hex));
        this.slot[pi] = { mi: this.meshes.length, k };
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.userData.mi = this.meshes.length;
      this.scene.add(mesh);
      this.meshes.push({ mesh, id: g.id, kind: g.kind, list: g.list });
    }
    this.visible = new Uint8Array(P.length).fill(1);
    this.update();
  }

  _makeFig(i) {
    const q = this.mb.parts[i];
    const grp = buildFigure(q.figParts ?? [{ id: q.id, c: q.c, role: 'head' }], !q.figParts);
    const p = part(q.id);
    const d = dims(p, q.r);
    grp.position.set(q.x + d.w / 2, q.y * PLATE, q.z + d.d / 2);
    grp.rotation.y = (q.r * Math.PI) / 2;
    grp.userData.base = grp.position.clone();
    grp.userData.pi = i;
    grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(grp);
    this.figs.set(i, grp);
  }

  explodeOffset(i) {
    const r = EXPLODE_RANK[this.levelOf[i]];
    return r === undefined ? 0 : r * this.explode * 18;
  }

  // visibility: fn(i) -> bool (for build steps); level toggles are applied on top
  setVisibility(fn) {
    const P = this.mb.parts;
    for (let i = 0; i < P.length; i++) this.visible[i] = fn(i) ? 1 : 0;
    this.update();
  }

  isShown(i) { return this.visible[i] && !this.hiddenLevels.has(this.levelOf[i]); }

  update() {
    const P = this.mb.parts;
    for (const m of this.meshes) {
      let n = 0;
      m.list.forEach((pi, k) => {
        if (this.isShown(pi)) { m.mesh.setMatrixAt(k, partMatrix(P[pi], tmpM, this.explodeOffset(pi))); n++; }
        else m.mesh.setMatrixAt(k, ZERO);
      });
      m.mesh.instanceMatrix.needsUpdate = true;
      m.mesh.visible = n > 0;
    }
    for (const [i, g] of this.figs) {
      g.visible = !!this.isShown(i);
      g.position.y = g.userData.base.y + this.explodeOffset(i) * PLATE;
    }
  }

  setColorOf(i, hex) {
    const s = this.slot[i];
    if (!s) return;
    const m = this.meshes[s.mi].mesh;
    m.setColorAt(s.k, new THREE.Color(hex));
    m.instanceColor.needsUpdate = true;
  }

  // pulse the parts of the current step
  setHighlight(list) {
    for (const i of this.highlight) this.setColorOf(i, COLORS[this.mb.parts[i].c].hex);
    this.highlight = new Set(list || []);
  }

  _pulse(t) {
    if (!this.highlight.size) return;
    const k = 0.5 + 0.5 * Math.sin(t * 5);
    const c = new THREE.Color();
    const touched = new Set();
    for (const i of this.highlight) {
      const s = this.slot[i];
      if (!s) continue;
      c.set(COLORS[this.mb.parts[i].c].hex).lerp(new THREE.Color(0xffe27a), 0.18 + 0.32 * k);
      this.meshes[s.mi].mesh.setColorAt(s.k, c);
      touched.add(s.mi);
    }
    for (const mi of touched) this.meshes[mi].mesh.instanceColor.needsUpdate = true;
  }

  // bounding box (world units) of a list of parts
  boxOf(list) {
    const b = new THREE.Box3();
    const P = this.mb.parts;
    for (const i of list) {
      const q = P[i], p = part(q.id), d = dims(p, q.r), dy = this.explodeOffset(i);
      b.expandByPoint(new THREE.Vector3(q.x, (q.y + dy) * PLATE, q.z));
      b.expandByPoint(new THREE.Vector3(q.x + d.w, (q.y + p.h + dy) * PLATE, q.z + d.d));
    }
    return b;
  }

  // place a camera looking at box from a named direction
  viewDir(view) {
    switch (view) {
      case 'back': return new THREE.Vector3(0.55, 0.62, -0.95);
      case 'top': return new THREE.Vector3(-0.45, 1.25, 0.8);
      case 'left': return new THREE.Vector3(-1, 0.6, 0.35);
      case 'right': return new THREE.Vector3(1, 0.6, 0.35);
      default: return new THREE.Vector3(-0.62, 0.55, 1);
    }
  }

  frame(box, view = 'front', cam = this.camera, pad = 1.18, aspect = null) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(4, size.length() / 2) * pad;
    const a = aspect ?? cam.aspect;
    const fov = (cam.fov * Math.PI) / 180;
    const fitH = radius / Math.sin(fov / 2);
    const fitW = radius / Math.sin(Math.atan(Math.tan(fov / 2) * a));
    const dist = Math.max(fitH, fitW);
    const dir = this.viewDir(view).normalize();
    cam.position.copy(center).addScaledVector(dir, dist);
    cam.lookAt(center);
    cam.updateProjectionMatrix();
    return { center, dist };
  }

  flyTo(box, view, ms = 700) {
    const start = this.camera.position.clone(), t0 = this.controls.target.clone();
    const tmp = this.camera.clone();
    tmp.aspect = this.camera.aspect;
    const { center } = this.frame(box, view, tmp);
    const end = tmp.position.clone();
    const st = performance.now();
    const step = () => {
      const u = Math.min(1, (performance.now() - st) / ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      this.camera.position.lerpVectors(start, end, e);
      this.controls.target.lerpVectors(t0, center, e);
      if (u < 1) requestAnimationFrame(step);
    };
    step();
  }

  // animate parts falling into place
  drop(list, ms = 380, height = 14) {
    const t0 = performance.now();
    const P = this.mb.parts;
    const items = list.filter((i) => this.slot[i] || this.figs.has(i));
    if (!items.length) return;
    const tick = () => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      const e = 1 - Math.pow(1 - u, 3);
      const touched = new Set();
      for (const i of items) {
        if (!this.isShown(i)) continue;
        const dy = this.explodeOffset(i) + (1 - e) * height;
        const s = this.slot[i];
        if (s) { this.meshes[s.mi].mesh.setMatrixAt(s.k, partMatrix(P[i], tmpM, dy)); touched.add(s.mi); }
        else { const g = this.figs.get(i); g.position.y = g.userData.base.y + dy * PLATE; }
      }
      for (const mi of touched) this.meshes[mi].mesh.instanceMatrix.needsUpdate = true;
      if (u < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  // Render an image of the model in some state without disturbing the live view.
  snapshot({ w = 900, h = 700, show, fade = null, view = 'front', box, bg = null, pad = 1.12, night = false, shadows = true }) {
    if (!this.snapR) {
      this.snapCanvas = document.createElement('canvas');
      this.snapR = new THREE.WebGLRenderer({ canvas: this.snapCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.snapR.shadowMap.enabled = true;
      this.snapR.shadowMap.type = THREE.PCFSoftShadowMap;
      this.snapR.toneMapping = THREE.ACESFilmicToneMapping;
      this.snapR.toneMappingExposure = 1.05;
      this.snapCam = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
    }
    const R = this.snapR;
    R.setPixelRatio(1);
    R.setSize(w, h, false);
    R.shadowMap.enabled = shadows;
    const savedVis = this.visible.slice();
    const savedNight = this.night;
    const savedBg = this.scene.background, savedFog = this.scene.fog;
    this.visible = new Uint8Array(this.mb.parts.length);
    for (let i = 0; i < this.visible.length; i++) this.visible[i] = show(i) ? 1 : 0;
    const savedExplode = this.explode; this.explode = 0;
    this.update();
    if (night !== savedNight) this.setNight(night);
    const faded = [];
    if (fade) {
      const c = new THREE.Color();
      const bgc = new THREE.Color(fade.color);
      for (let i = 0; i < this.visible.length; i++) {
        if (!this.visible[i] || !fade.test(i)) continue;
        const s = this.slot[i];
        if (!s) continue;
        c.set(COLORS[this.mb.parts[i].c].hex).lerp(bgc, fade.amount);
        this.meshes[s.mi].mesh.setColorAt(s.k, c);
        faded.push(s);
      }
      for (const m of this.meshes) m.mesh.instanceColor.needsUpdate = true;
    }
    this.scene.background = bg === null ? null : new THREE.Color(bg);
    this.scene.fog = null;
    this.ground.visible = false;
    const cam = this.snapCam;
    cam.aspect = w / h;
    this.frame(box, view, cam, pad, w / h);
    R.render(this.scene, cam);
    const url = this.snapCanvas.toDataURL('image/png');
    // restore
    for (const s of faded) { const m = this.meshes[s.mi]; m.mesh.setColorAt(s.k, new THREE.Color(COLORS[this.mb.parts[m.list[s.k]].c].hex)); }
    if (faded.length) for (const m of this.meshes) m.mesh.instanceColor.needsUpdate = true;
    this.ground.visible = true;
    this.scene.background = savedBg; this.scene.fog = savedFog;
    if (night !== savedNight) this.setNight(savedNight);
    this.visible = savedVis;
    this.explode = savedExplode;
    this.update();
    return url;
  }

  // translucent copy of a part used while dragging in build mode
  makeGhost(q, color = 0x7fdc8e, opacity = 0.55) {
    if (q.id === 'fig' || part(q.id).figPart) {
      const g = buildFigure(q.figParts ?? [{ id: q.id, c: q.c, role: 'head' }], !q.figParts);
      g.traverse((o) => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }); } });
      return g;
    }
    const geo = partGeometry(q.id).geo;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.renderOrder = 5;
    return m;
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the model centred in the part of the view that is not covered by a side panel
    const inset = w > 900 ? (this.insetLeft || 0) : 0;
    if (inset) this.camera.setViewOffset(w + inset, h, 0, 0, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      if (this.paused) return;
      const t = this.clock.getElapsedTime();
      this.controls.update();
      this._pulse(t);
      for (const f of this.onFrame) f(t);
      this.renderer.render(this.scene, this.camera);
    };
    this.resize();
    loop();
  }

  // pick the part under a screen point
  pick(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.camera);
    const objs = [...this.meshes.map((m) => m.mesh).filter((m) => m.visible), ...[...this.figs.values()].filter((g) => g.visible)];
    const hits = ray.intersectObjects(objs, true);
    for (const h of hits) {
      if (h.object.isInstancedMesh) {
        const m = this.meshes[h.object.userData.mi];
        const pi = m.list[h.instanceId];
        if (this.isShown(pi)) return { i: pi, point: h.point };
      } else {
        let o = h.object;
        while (o && o.userData.pi === undefined) o = o.parent;
        if (o) return { i: o.userData.pi, point: h.point };
      }
    }
    return null;
  }
}

// ------------------------------------------------------------------ minifigures
// figParts: [{id, c, role, arms?, hands?}] -> Group standing at the origin facing +z
export function buildFigure(figParts, loose = false) {
  const G = figGeometries();
  const grp = new THREE.Group();
  const M = (hex, opts = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.32, ...opts });
  const addMesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; grp.add(m); return m; };
  for (const f of figParts) {
    const hex = COLORS[f.c].hex;
    if (f.role === 'legs') addMesh(G.legs, M(hex));
    else if (f.role === 'torso') {
      addMesh(G.torso, M(hex));
      const arm = M(COLORS[f.arms].hex), hand = M(COLORS[f.hands].hex);
      for (const s of [-1, 1]) {
        const a = addMesh(G.armL, arm, s * 0.72, 2.75, 0.05, -0.25);
        a.rotation.z = s * 0.12;
        const h = addMesh(G.hand, hand, s * 0.78, 1.83, 0.3, -0.4);
        h.rotation.z = s * 0.1;
      }
    } else if (f.role === 'head') {
      const dy = loose ? -2.92 : 0;
      const skin = M(hex);
      addMesh(G.head, [M(hex, { map: makeFaceTexture(f.id) }), skin, skin], 0, dy);
      addMesh(G.headTop, skin, 0, dy);
    } else if (f.role === 'hair') {
      addMesh(hairGeometry(PARTS[f.id].geo.style), M(hex, { roughness: 0.5 }));
    }
  }
  return grp;
}

// ------------------------------------------------------------------ minifig faces
const faceCache = new Map();
export function makeFaceTexture(headId) {
  if (faceCache.has(headId)) return faceCache.get(headId);
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 64);
  if (headId === '3626cpr0001') {
    // standard grin: two dots and a smile, printed on the front (texture u=0.25 faces +z)
    const cx = 64;
    g.fillStyle = '#111';
    g.beginPath(); g.ellipse(cx - 11, 26, 3.2, 5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + 11, 26, 3.2, 5, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3.2; g.strokeStyle = '#111';
    g.beginPath(); g.arc(cx, 34, 13, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  } else if (headId === '3626cpr0895') {
    const cx = 64;
    g.fillStyle = '#111';
    g.beginPath(); g.ellipse(cx - 11, 26, 7, 8, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + 11, 26, 7, 8, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx, 34); g.lineTo(cx - 3, 40); g.lineTo(cx + 3, 40); g.fill();
    g.fillRect(cx - 12, 45, 24, 2);
    for (let i = -10; i <= 10; i += 5) g.fillRect(cx + i, 43, 1.5, 7);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.offset.x = 0.25;          // cylinder u=0 is the +z (front) side
  faceCache.set(headId, t);
  return t;
}
