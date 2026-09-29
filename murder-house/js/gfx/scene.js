// three.js scene for the model.
//  - one InstancedMesh per part design (bodies) + one instanced layer of studs, drawing only the
//    studs that are not covered by another part; hidden parts are compacted out of the buffers
//  - glossy ABS materials lit by a studio environment map, soft shadows, ground-truth ambient
//    occlusion (GTAO) so the seams between bricks read like a photo of a real set
//  - the four floor modules can be lifted off each other (explode), levels hidden, parts highlighted
//  - snapshots for the instruction booklet are rendered with the same pipeline into an offscreen target
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { part, dims } from '../core/parts.js';
import { COLORS } from '../core/colors.js';
import { partGeometry, studGeometry, PLATE } from './geometry.js';
import { InkPass } from './ink.js';
import { buildFigure as buildFig, makeFaceTexture as faceTex } from './minifig.js';

export const buildFigure = buildFig;
export const makeFaceTexture = faceTex;
export const LEVELS = ['base', 'garden', 'basement', 'ground', 'upper', 'attic', 'roof', 'gazebo', 'figs'];
export const MODULES = ['A', 'B', 'C', 'D'];
const MODULE_RANK = { A: 0, B: 1, C: 2, D: 3 };
const LIFT = 34;          // plates between floors when the modules are fully lifted apart

const tmpM = new THREE.Matrix4(), tmpM2 = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();
const tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1), tmpC = new THREE.Color();
const Y_AXIS = new THREE.Vector3(0, 1, 0), X_AXIS = new THREE.Vector3(1, 0, 0);

export function partMatrix(q, out = new THREE.Matrix4(), dy = 0) {
  const p = part(q.id);
  const d = dims(p, q.r);
  if (q.up) {
    // an upright tile hooked on a side stud: stands against the wall face, top facing direction r
    const along = p.w, y = (q.y + (q.up.yOff ?? 0) + dy) * PLATE + p.d / 2;
    const [px, pz] = [[q.x + along / 2, q.z], [q.x, q.z + along / 2], [q.x + along / 2, q.z + 1], [q.x + 1, q.z + along / 2]][q.r];
    tmpV.set(px, y, pz);
    tmpQ.setFromAxisAngle(Y_AXIS, (q.r * Math.PI) / 2).multiply(tmpQ2.setFromAxisAngle(X_AXIS, Math.PI / 2));
    return out.compose(tmpV, tmpQ, tmpS);
  }
  tmpV.set(q.x + d.w / 2 + (q.off?.[0] ?? 0), (q.y + dy) * PLATE, q.z + d.d / 2 + (q.off?.[1] ?? 0));
  tmpQ.setFromAxisAngle(Y_AXIS, (q.r * Math.PI) / 2);
  return out.compose(tmpV, tmpQ, tmpS);
}

function makeMaterials() {
  const glow = { value: 0.0 };        // extra glow for lit windows at night
  const opaque = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.0, envMapIntensity: 0.85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.85, envMapIntensity: 1.1 });
  const trans = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.52, depthWrite: false, envMapIntensity: 1.4, specularIntensity: 1 });
  const transGlow = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, transparent: true, opacity: 0.8, depthWrite: false, envMapIntensity: 1.2 });
  const addGlow = (m, base, night) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = glow;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uGlow;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor * (${base.toFixed(2)} + uGlow * ${night.toFixed(2)});\n#endif`);
    };
    m.customProgramCacheKey = () => 'glow' + base + night;
  };
  addGlow(transGlow, 0.35, 1.4);
  addGlow(trans, 0.0, 0.9);
  return { opaque, metal, trans, transGlow, glow };
}

function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class BrickScene {
  constructor(canvas) {
    this.canvas = canvas;
    const R = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.NeutralToneMapping;
    R.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(R);
    this.envTex = pm.fromScene(new RoomEnvironment(), 0.035).texture;
    pm.dispose();
    this.scene.environment = this.envTex;
    this.camera = new THREE.PerspectiveCamera(32, 1, 1, 900);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 420;
    this.controls.addEventListener('change', () => this.kick());
    this.mats = makeMaterials();
    this.meshes = [];           // {mesh, id, kind, list:[partIndex], order:[partIndex]}
    this.slot = [];             // partIndex -> {mi, k} while shown
    this.figs = new Map();      // partIndex -> Group
    this.visible = null;        // Uint8Array
    this.explode = 0;
    this.moduleLift = { A: 0, B: 0, C: 0, D: 0 };   // extra lift per module (plates), for lifting floors away
    this.hiddenLevels = new Set();
    this.hiddenModules = new Set();
    this.highlight = new Set();
    this.override = new Map();  // partIndex -> hex colour (fading)
    this.night = false;
    this.quality = 'high';
    this._setupLights();
    this._setupComposer();
    this.clock = new THREE.Clock();
    this.onFrame = [];
    this._dirty = 3;
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
  }

  kick(n = 2) { this._dirty = Math.max(this._dirty, n); }

  _setupLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xf2f5ff, 0x6b6257, 0.55);
    s.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0de, 2.3);
    this.sun.position.set(-38, 95, 72);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const c = this.sun.shadow.camera;
    c.left = -42; c.right = 42; c.top = 46; c.bottom = -40; c.near = 30; c.far = 260;
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 3;
    this.sun.target.position.set(24, 8, 24);
    s.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight(0xc6d4ff, 0.45);
    this.fill.position.set(90, 50, -20);
    s.add(this.fill);
    this.rim = new THREE.DirectionalLight(0xffffff, 0.35);
    this.rim.position.set(30, 60, -90);
    s.add(this.rim);
    // warm interior lights for night mode
    this.lamps = [];
    for (const [x, y, z] of [[11, 28, 20], [22, 28, 24], [36, 28, 16], [36, 28, 24], [11, 20, 20], [22, 20, 14], [36, 20, 24], [22, 6, 20], [22, 30, 20]]) {
      const l = new THREE.PointLight(0xffb45a, 0, 24, 1.6);
      l.position.set(x, y, z);
      s.add(l); this.lamps.push(l);
    }
    this.moon = new THREE.DirectionalLight(0x7f95ff, 0);
    this.moon.position.set(60, 80, 90);
    s.add(this.moon);
    // shadow catcher: the set stands on an endless studio floor that fades into the backdrop
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ color: 0x1a2230, opacity: 0.22 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(24, -0.03, 24);
    this.ground.receiveShadow = true;
    s.add(this.ground);
    this.dayBg = gradientTexture('#eef2f6', '#c9d1da');
    this.nightBg = gradientTexture('#0a0f24', '#1b2340');
    this.setNight(false);
  }

  _setupComposer() {
    const R = this.renderer;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(R, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.gtao = new GTAOPass(this.scene, this.camera, 4, 4);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 1.0;
    this.gtao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16 });
    this.composer.addPass(this.gtao);
    this.composer.addPass(new OutputPass());
  }

  setQuality(q) {
    this.quality = q;
    this.gtao.enabled = q === 'high';
    this.renderer.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio || 1, 1.75) : 1);
    this.resize();
  }

  setNight(on) {
    this.night = on;
    this.scene.background = on ? this.nightBg : this.dayBg;
    this.scene.fog = null;
    this.scene.environmentIntensity = on ? 0.12 : 1;
    this.hemi.intensity = on ? 0.18 : 0.55;
    this.hemi.color.set(on ? 0x6a78b0 : 0xf2f5ff);
    this.sun.intensity = on ? 0 : 2.3;
    this.fill.intensity = on ? 0.03 : 0.45;
    this.rim.intensity = on ? 0.0 : 0.35;
    this.moon.intensity = on ? 0.8 : 0;
    this.moon.castShadow = false;
    for (const l of this.lamps) l.intensity = on ? 70 : 0;
    this.mats.glow.value = on ? 1 : 0;
    this.ground.material.opacity = on ? 0.5 : 0.22;
    this.kick();
  }

  setModel(mb) {
    this.mb = mb;
    const P = mb.parts;
    for (const m of this.meshes) { this.scene.remove(m.mesh); m.mesh.dispose(); }
    for (const m of this.studMeshes ?? []) { this.scene.remove(m.mesh); m.mesh.dispose(); }
    for (const g of this.figs.values()) this.scene.remove(g);
    this.meshes = []; this.figs.clear();
    this.slot = new Array(P.length).fill(null);
    this.levelOf = P.map((q) => {
      const lv = mb.sections[q.sec].level;
      if (lv !== 'figs') return lv;
      return q.y < 16 ? (q.y < 5 && q.z < 10 ? 'gazebo' : 'basement') : q.y < 39 ? 'ground' : q.y < 59 ? 'upper' : 'attic';
    });
    this.moduleOf = P.map((q) => {
      if (q.id === 'fig') return q.y < 17 ? 'A' : q.y < 40 ? 'B' : q.y < 60 ? 'C' : 'D';
      return mb.sections[q.sec].module ?? 'A';
    });
    const kindOf = (c) => (c.trans ? (c.glow ? 'transGlow' : 'trans') : c.metal ? 'metal' : 'opaque');
    const groups = new Map();
    P.forEach((q, i) => {
      const p = part(q.id);
      if (q.id === 'fig' || p.figPart) { this._makeFig(i); return; }
      const kind = kindOf(COLORS[q.c]);
      const key = q.id + '|' + kind;
      if (!groups.has(key)) groups.set(key, { id: q.id, kind, list: [] });
      groups.get(key).list.push(i);
    });
    for (const g of groups.values()) {
      const geo = partGeometry(g.id).body;
      if (!geo) continue;
      const mesh = new THREE.InstancedMesh(geo, this.mats[g.kind], g.list.length);
      mesh.castShadow = g.kind === 'opaque' || g.kind === 'metal';
      mesh.receiveShadow = true;
      if (g.kind.startsWith('trans')) mesh.renderOrder = 2;
      mesh.setColorAt(0, tmpC.set(0xffffff));
      mesh.frustumCulled = false;
      mesh.userData.mi = this.meshes.length;
      this.scene.add(mesh);
      this.meshes.push({ mesh, id: g.id, kind: g.kind, list: g.list, order: [] });
    }
    // studs: one record per stud, with the part that covers it (if any)
    this.studRecs = [];
    const studKinds = new Map();
    P.forEach((q, i) => {
      if (q.id === 'fig' || q.up) return;
      const pg = partGeometry(q.id);
      if (!pg.studs?.length) return;
      const p = part(q.id);
      const { w, d } = dims(p, q.r);
      const c = Math.round(Math.cos(q.r * Math.PI / 2)), s = Math.round(Math.sin(q.r * Math.PI / 2));
      for (const [sx, sy, sz] of pg.studs) {
        const wx = q.x + w / 2 + (sx * c + sz * s), wz = q.z + d / 2 + (-sx * s + sz * c);
        const yTop = q.y + Math.round(sy / PLATE + 0.3);
        const cover = mb.occAt(Math.floor(wx), yTop, Math.floor(wz));
        const kind = kindOf(COLORS[q.c]);
        if (!studKinds.has(kind)) studKinds.set(kind, 0);
        studKinds.set(kind, studKinds.get(kind) + 1);
        this.studRecs.push({ pi: i, lx: sx, ly: sy, lz: sz, cover: cover ?? -1, kind });
      }
    });
    this.studMeshes = [];
    this.studMeshOf = {};
    for (const [kind, n] of studKinds) {
      const mesh = new THREE.InstancedMesh(studGeometry(), this.mats[kind], n);
      mesh.castShadow = kind === 'opaque' || kind === 'metal';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (kind.startsWith('trans')) mesh.renderOrder = 2;
      mesh.setColorAt(0, tmpC.set(0xffffff));
      mesh.raycast = () => {};
      this.scene.add(mesh);
      this.studMeshOf[kind] = { mesh, n: 0 };
      this.studMeshes.push(this.studMeshOf[kind]);
    }
    this.studSlots = new Map();   // partIndex -> [[kind, k, rec]]
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
    this.scene.add(grp);
    this.figs.set(i, grp);
  }

  explodeOffset(i) {
    const m = this.moduleOf[i];
    const r = MODULE_RANK[m];
    return (r ? r * this.explode * LIFT : 0) + (this.moduleLift[m] || 0);
  }

  // animate the lift of some modules (plates) - used to take floors off the house and put them back
  animateLift(mods, from, to, ms = 700, done) {
    const st = performance.now();
    const key = mods.join('');
    cancelAnimationFrame(this._liftRaf?.[key]);
    this._liftRaf ??= {};
    const step = () => {
      const u = Math.min(1, (performance.now() - st) / ms);
      const e = to > from ? u * u * (3 - 2 * u) : 1 - Math.pow(1 - u, 3);
      for (const m of mods) this.moduleLift[m] = from + (to - from) * e;
      this.update();
      if (u < 1) this._liftRaf[key] = requestAnimationFrame(step); else done?.();
    };
    step();
  }

  // visibility: fn(i) -> bool (for build steps); level/module toggles are applied on top
  setVisibility(fn) {
    const P = this.mb.parts;
    for (let i = 0; i < P.length; i++) this.visible[i] = fn(i) ? 1 : 0;
    this.update();
  }

  isShown(i) { return this.visible[i] && !this.hiddenLevels.has(this.levelOf[i]) && !this.hiddenModules.has(this.moduleOf[i]); }

  colorOf(i) { return this.override.get(i) ?? COLORS[this.mb.parts[i].c].hex; }

  _studVisible(r) {
    if (!this.isShown(r.pi)) return false;
    if (r.cover < 0) return true;
    return !(this.isShown(r.cover) && this.explodeOffset(r.cover) === this.explodeOffset(r.pi));
  }

  update() {
    const P = this.mb.parts;
    for (const m of this.meshes) {
      let n = 0;
      m.order = [];
      for (const pi of m.list) {
        if (this.isShown(pi)) {
          m.mesh.setMatrixAt(n, partMatrix(P[pi], tmpM, this.explodeOffset(pi)));
          m.mesh.setColorAt(n, tmpC.set(this.colorOf(pi)));
          this.slot[pi] = { mi: m.mesh.userData.mi, k: n };
          m.order.push(pi);
          n++;
        } else this.slot[pi] = null;
      }
      m.mesh.count = n;
      m.mesh.instanceMatrix.needsUpdate = true;
      if (m.mesh.instanceColor) m.mesh.instanceColor.needsUpdate = true;
      m.mesh.visible = n > 0;
    }
    for (const sm of this.studMeshes) sm.n = 0;
    this.studSlots.clear();
    for (const r of this.studRecs) {
      if (!this._studVisible(r)) continue;
      const sm = this.studMeshOf[r.kind];
      const k = sm.n++;
      this._setStud(sm.mesh, k, r, this.explodeOffset(r.pi));
      sm.mesh.setColorAt(k, tmpC.set(this.colorOf(r.pi)));
      if (!this.studSlots.has(r.pi)) this.studSlots.set(r.pi, []);
      this.studSlots.get(r.pi).push([r.kind, k, r]);
    }
    for (const sm of this.studMeshes) {
      sm.mesh.count = sm.n;
      sm.mesh.visible = sm.n > 0;
      sm.mesh.instanceMatrix.needsUpdate = true;
      if (sm.mesh.instanceColor) sm.mesh.instanceColor.needsUpdate = true;
    }
    for (const [i, g] of this.figs) {
      g.visible = !!this.isShown(i);
      g.position.y = g.userData.base.y + this.explodeOffset(i) * PLATE;
    }
    this.kick();
  }

  _setStud(mesh, k, r, dy) {
    partMatrix(this.mb.parts[r.pi], tmpM, dy);
    tmpM2.makeTranslation(r.lx, r.ly, r.lz);
    mesh.setMatrixAt(k, tmpM.multiply(tmpM2));
  }

  setColorOf(i, hex) {
    const s = this.slot[i];
    if (s) {
      const m = this.meshes[s.mi].mesh;
      m.setColorAt(s.k, tmpC.set(hex));
      m.instanceColor.needsUpdate = true;
    }
    for (const [kind, k] of this.studSlots.get(i) ?? []) {
      const m = this.studMeshOf[kind].mesh;
      m.setColorAt(k, tmpC.set(hex));
      m.instanceColor.needsUpdate = true;
    }
    this.kick();
  }

  // pulse the parts of the current step
  setHighlight(list) {
    for (const i of this.highlight) this.setColorOf(i, this.colorOf(i));
    this.highlight = new Set(list || []);
  }

  _pulse(t) {
    if (!this.highlight.size) return;
    const k = 0.5 + 0.5 * Math.sin(t * 5);
    const c = new THREE.Color(), hi = new THREE.Color(0xffe27a);
    for (const i of this.highlight) this.setColorOf(i, c.set(this.colorOf(i)).lerp(hi, 0.16 + 0.3 * k).getHex());
  }

  // bounding box (world units) of a list of parts
  boxOf(list) {
    const b = new THREE.Box3();
    const P = this.mb.parts;
    for (const i of list) {
      const q = P[i], p = part(q.id), d = dims(p, q.r), dy = this.explodeOffset(i);
      b.expandByPoint(tmpV.set(q.x, (q.y + dy) * PLATE, q.z));
      b.expandByPoint(tmpV.set(q.x + d.w, (q.y + p.h + dy) * PLATE, q.z + d.d));
    }
    if (b.isEmpty()) b.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(48, 4, 48));
    return b;
  }

  // place a camera looking at box from a named direction
  viewDir(view) {
    switch (view) {
      case 'back': return new THREE.Vector3(0.55, 0.62, -0.95);
      case 'top': return new THREE.Vector3(-0.45, 1.25, 0.8);
      case 'left': return new THREE.Vector3(-1, 0.6, 0.35);
      case 'right': return new THREE.Vector3(1, 0.6, 0.35);
      case 'hero': return new THREE.Vector3(-0.78, 0.42, 1);
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

  flyTo(box, view, ms = 800) {
    const start = this.camera.position.clone(), t0 = this.controls.target.clone();
    const tmp = this.camera.clone();
    tmp.aspect = this.camera.aspect;
    const { center } = this.frame(box, view, tmp);
    const end = tmp.position.clone();
    const st = performance.now();
    const step = () => {
      const u = Math.min(1, (performance.now() - st) / ms), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      this.camera.position.lerpVectors(start, end, e);
      this.controls.target.lerpVectors(t0, center, e);
      this.kick();
      if (u < 1) requestAnimationFrame(step);
    };
    step();
  }

  // animate the modules lifting apart / settling back (0..1)
  animateExplode(to, ms = 900, done) {
    const from = this.explode, st = performance.now();
    cancelAnimationFrame(this._exRaf);
    const step = () => {
      const u = Math.min(1, (performance.now() - st) / ms), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      this.explode = from + (to - from) * e;
      this.update();
      if (u < 1) this._exRaf = requestAnimationFrame(step); else done?.();
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
        if (s) {
          this.meshes[s.mi].mesh.setMatrixAt(s.k, partMatrix(P[i], tmpM, dy)); touched.add(this.meshes[s.mi].mesh);
          for (const [kind, k, r] of this.studSlots.get(i) ?? []) { const m = this.studMeshOf[kind].mesh; this._setStud(m, k, r, dy); touched.add(m); }
        } else { const g = this.figs.get(i); if (g) g.position.y = g.userData.base.y + dy * PLATE; }
      }
      for (const m of touched) m.instanceMatrix.needsUpdate = true;
      this.kick();
      if (u < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  // Render an image of the model in some state without disturbing the live view.
  snapshot({ w = 900, h = 700, show, fade = null, view = 'front', box, bg = null, pad = 1.12, night = false, shadows = true, ao = true, jpeg = false, ink = true }) {
    const R = this.renderer;
    if (!this.snap) {
      const cam = new THREE.PerspectiveCamera(30, 1, 1, 900);
      const comp = new EffectComposer(R, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
      comp.renderToScreen = false;
      const rp = new RenderPass(this.scene, cam);
      const gtao = new GTAOPass(this.scene, cam, 4, 4);
      gtao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16 });
      const inkPass = new InkPass(gtao, cam);
      comp.addPass(rp); comp.addPass(gtao); comp.addPass(inkPass);
      const out = new OutputPass();
      const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType });
      const canvas = document.createElement('canvas');
      this.snap = { cam, comp, gtao, ink: inkPass, out, target, canvas, size: [0, 0] };
    }
    const S = this.snap;
    if (S.size[0] !== w || S.size[1] !== h) {
      S.comp.setPixelRatio(1); S.comp.setSize(w, h); S.gtao.setSize(w, h); S.target.setSize(w, h);
      S.canvas.width = w; S.canvas.height = h; S.size = [w, h];
    }
    S.gtao.enabled = ao || ink;
    S.gtao.blendIntensity = ao ? 1 : 0;
    S.ink.enabled = ink;
    const savedVis = this.visible.slice(), savedNight = this.night, savedExplode = this.explode, savedHi = this.highlight;
    const savedBg = this.scene.background, savedFog = this.scene.fog, savedShadow = R.shadowMap.enabled;
    const savedClear = R.getClearAlpha(), savedClearColor = R.getClearColor(new THREE.Color());
    this.highlight = new Set();
    for (let i = 0; i < this.visible.length; i++) this.visible[i] = show(i) ? 1 : 0;
    this.explode = 0;
    if (fade) {
      const c = new THREE.Color(), bgc = new THREE.Color(fade.color);
      for (let i = 0; i < this.visible.length; i++) if (this.visible[i] && fade.test(i)) this.override.set(i, c.set(COLORS[this.mb.parts[i].c].hex).lerp(bgc, fade.amount).getHex());
    }
    if (night !== savedNight) this.setNight(night);
    this.update();
    this.scene.background = bg === null ? null : new THREE.Color(bg);
    this.scene.fog = null;
    this.ground.visible = false;
    R.shadowMap.enabled = shadows;
    R.setClearColor(bg === null ? 0x000000 : bg, bg === null ? 0 : 1);
    const cam = S.cam;
    cam.aspect = w / h;
    this.frame(box, view, cam, pad, w / h);
    S.comp.render();
    S.out.renderToScreen = false;
    S.out.render(R, S.target, S.comp.readBuffer);
    const buf = new Uint8Array(w * h * 4);
    R.readRenderTargetPixels(S.target, 0, 0, w, h, buf);
    const ctx = S.canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    const url = jpeg ? S.canvas.toDataURL('image/jpeg', 0.9) : S.canvas.toDataURL('image/png');
    // restore
    this.override.clear();
    this.ground.visible = true;
    this.scene.background = savedBg; this.scene.fog = savedFog;
    R.shadowMap.enabled = savedShadow;
    R.setClearColor(savedClearColor, savedClear);
    if (night !== savedNight) this.setNight(savedNight);
    this.visible = savedVis;
    this.explode = savedExplode;
    this.highlight = savedHi;
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
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // keep the model centred in the part of the view that is not covered by a side panel
    const L = w > 900 ? (this.insetLeft || 0) : 0, Rr = w > 900 ? (this.insetRight || 0) : 0;
    if (L || Rr) this.camera.setViewOffset(w + L + Rr, h, Rr, 0, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  render() {
    if (this.gtao.enabled) this.composer.render();
    else { this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera); }
  }

  start() {
    let lastRender = 0, slowFrames = 0, fastFrames = 0;
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      if (this.paused) return;
      const t = this.clock.getElapsedTime();
      if (this.controls.update()) this.kick();
      if (this.controls.autoRotate) this.kick();
      if (this.highlight.size) { this._pulse(t); }
      for (const f of this.onFrame) if (f(t)) this.kick();
      if (this._dirty <= 0) { lastRender = 0; return; }
      this._dirty--;
      // judge the GPU by the time between frames while we render continuously
      if (lastRender && this.autoQuality !== false) {
        const dt = now - lastRender;
        if (this.quality === 'high') { slowFrames = dt > 48 ? slowFrames + 1 : Math.max(0, slowFrames - 2); if (slowFrames > 24) { slowFrames = 0; this.setQuality('low'); this.onQualityDrop?.(); } }
      }
      lastRender = now;
      this.render();
      void fastFrames;
    };
    this.resize();
    const q = new URLSearchParams(location.search).get('q');
    if (q === 'low' || q === 'high') { this.autoQuality = false; this.setQuality(q); }
    this._raf = requestAnimationFrame(loop);
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
        const pi = m.order[h.instanceId];
        if (pi !== undefined && this.isShown(pi)) return { i: pi, point: h.point };
      } else {
        let o = h.object;
        while (o && o.userData.pi === undefined) o = o.parent;
        if (o) return { i: o.userData.pi, point: h.point };
      }
    }
    return null;
  }
}
