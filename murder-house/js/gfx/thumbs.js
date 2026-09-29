// Small isometric pictures of single parts (booklet callouts, build tray, parts list).
import * as THREE from 'three';
import { PARTS } from '../core/parts.js';
import { COLORS } from '../core/colors.js';
import { partGeometry, PLATE } from './geometry.js';
import { buildFigure } from './minifig.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { figParts } from '../model/furniture.js';

let R, scene, cam, holder;
const cache = new Map();

function init() {
  const canvas = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1);
  R.toneMapping = THREE.NeutralToneMapping;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.035).texture;
  pm.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 0.6));
  const d = new THREE.DirectionalLight(0xffffff, 1.8);
  d.position.set(-3, 6, 5);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(24, 1, 0.1, 500);
  holder = new THREE.Group();
  scene.add(holder);
}

function objectFor(id, c, fig) {
  const p = PARTS[id];
  if (id === 'fig') return buildFigure(figParts(fig));
  if (p.figPart) {
    const role = p.geo.t === 'legs' ? 'legs' : p.geo.t === 'torso' ? 'torso' : p.geo.t === 'hair' ? 'hair' : 'head';
    const f = { id, c, role };
    if (role === 'torso') { f.arms = p.geo.arms; f.hands = p.geo.hands; }
    const g = buildFigure([f], role === 'head');
    if (role === 'hair') g.children.forEach((m) => m.position.y -= 3.3);
    return g;
  }
  const { geo } = partGeometry(id);
  const col = COLORS[c];
  const mat = new THREE.MeshStandardMaterial({
    color: col.hex, roughness: col.trans ? 0.05 : 0.3, metalness: col.metal ? 0.85 : 0,
    transparent: !!col.trans, opacity: col.trans ? 0.72 : 1, emissive: col.glow ? col.hex : 0x000000, emissiveIntensity: col.glow ? 0.25 : 0,
  });
  return new THREE.Mesh(geo, mat);
}

// returns a data URL (PNG with transparency)
export function thumb(id, c, size = 96, fig = null) {
  const key = id + '|' + c + '|' + size + '|' + (fig || '');
  if (cache.has(key)) return cache.get(key);
  if (!R) init();
  R.setSize(size, size, false);
  holder.clear();
  const obj = objectFor(id, c, fig);
  holder.add(obj);
  // glass panes are very thin: show them a bit from the front
  const p = PARTS[id];
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(0.6, box.getSize(new THREE.Vector3()).length() / 2);
  const flat = p.geo.t === 'glass' || p.geo.t === 'door' || p.geo.t === 'fence';
  const figure = id === 'fig' || p.figPart;
  const dir = figure ? new THREE.Vector3(-0.45, 0.28, 1) : flat ? new THREE.Vector3(-0.35, 0.3, 1) : new THREE.Vector3(-0.9, 0.85, 1.05);
  cam.position.copy(center).addScaledVector(dir.normalize(), radius / Math.sin((cam.fov * Math.PI) / 360) * 1.02);
  cam.lookAt(center);
  R.render(scene, cam);
  const url = R.domElement.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
