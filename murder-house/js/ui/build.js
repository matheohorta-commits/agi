// "Build it yourself": follow the steps and drag each part from the tray onto the model.
// A part snaps in when you drop it near a spot where it belongs.
import * as THREE from 'three';
import { part, dims } from '../core/parts.js';
import { COLORS } from '../core/colors.js';
import { PLATE } from '../gfx/geometry.js';
import { partMatrix } from '../gfx/scene.js';
import { thumb } from '../gfx/thumbs.js';

const SNAP_PX = 70;
const KEY = 'mh-build-progress';

export class BuildMode {
  constructor(app) {
    this.app = app;
    this.tray = document.getElementById('tray');
    this.toastEl = document.getElementById('toast');
    this.n = 1;
    this.placed = new Set();
    this.byHand = 0;
    this.t0 = performance.now();
    this.ghosts = new THREE.Group();
    this.hints = new THREE.Group();
    app.sc.scene.add(this.ghosts, this.hints);
    this.showAll = true;
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.n) { this.n = Math.min(s.n, app.steps.length); this.byHand = s.byHand || 0; } } catch { /* storage unavailable */ }
    document.getElementById('b-prev').addEventListener('click', () => this.goto(this.n - 1));
    document.getElementById('b-next').addEventListener('click', () => this.next());
    document.getElementById('b-auto').addEventListener('click', () => this.autoPlace());
    const hint = document.getElementById('b-hint');
    const syncHint = () => { hint.setAttribute('aria-pressed', String(this.showAll)); hint.textContent = this.showAll ? 'Spots shown' : 'Show spots'; };
    hint.addEventListener('click', () => { this.showAll = !this.showAll; syncHint(); this.refreshHints(); });
    syncHint();
    setInterval(() => this.clock(), 1000);
  }

  get step() { return this.app.steps[this.n - 1]; }

  enter() {
    this.active = true;
    this.goto(this.n, true);
  }
  leave() {
    this.active = false;
    this.ghosts.clear(); this.hints.clear();
    this.app.sc.setHighlight([]);
  }

  save() { try { localStorage.setItem(KEY, JSON.stringify({ n: this.n, byHand: this.byHand })); } catch { /* ignore */ } }

  goto(n, fly = true) {
    const { steps, sc } = this.app;
    this.n = Math.max(1, Math.min(steps.length, n));
    this.placed = new Set();
    this.applyVisibility();
    this.renderHUD();
    this.refreshHints();
    if (fly) sc.flyTo(this.frameBox(), this.step.view);
    this.save();
  }

  frameBox() {
    const { mb, sc, stepOf } = this.app;
    const s = this.step;
    const list = mb.parts.map((_, i) => i).filter((i) => mb.parts[i].sec === s.sec && stepOf[i] <= s.n);
    return sc.boxOf(list.length ? list : s.parts);
  }

  applyVisibility() {
    const { sc, stepOf } = this.app;
    sc.hiddenLevels.clear();
    sc.hiddenModules = new Set();
    for (const m in sc.moduleLift) sc.moduleLift[m] = 0;
    sc.explode = 0;
    sc.setVisibility((i) => stepOf[i] < this.n || this.placed.has(i));
    sc.setHighlight([...this.placed]);
  }

  remaining() { return this.step.parts.filter((i) => !this.placed.has(i)); }

  lotKey(i) { const q = this.app.mb.parts[i]; return q.id + '|' + q.c + '|' + (q.fig || ''); }

  renderHUD() {
    const s = this.step;
    document.getElementById('b-num').textContent = s.n;
    document.getElementById('b-title').textContent = s.name;
    document.getElementById('b-sub').textContent = `Bag ${s.bag} · step ${s.n} of ${this.app.steps.length}`;
    document.getElementById('b-placed').textContent = this.byHand;
    const done = (s.n - 1 + (s.parts.length ? this.placed.size / s.parts.length : 0)) / this.app.steps.length;
    document.getElementById('b-bar').style.width = (100 * done).toFixed(2) + '%';
    this.tray.innerHTML = '';
    const rem = this.remaining();
    for (const L of s.lots) {
      const key = L.id + '|' + L.c + '|' + (L.fig || '');
      const left = rem.filter((i) => this.lotKey(i) === key).length;
      const el = document.createElement('div');
      el.className = 'lot' + (left ? '' : ' done');
      el.dataset.key = key;
      const name = L.fig ? this.app.charName(L.fig) : part(L.id).name.replace(/ with .*$/, '');
      const colour = L.fig ? 'Minifigure' : COLORS[L.c].name;
      el.title = L.fig ? name : `${colour} ${part(L.id).name} (${part(L.id).bl})`;
      el.innerHTML = `<span class="n">${left}x</span><img alt="" src="${thumb(L.fig ? 'fig' : L.id, L.c, 96, L.fig)}"><small>${name}</small><small class="c">${colour}</small>`;
      if (left) el.addEventListener('pointerdown', (e) => this.startDrag(e, key, el));
      this.tray.appendChild(el);
    }
  }

  clock() {
    if (!this.active) return;
    const s = Math.floor((performance.now() - this.t0) / 1000);
    document.getElementById('b-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // translucent outlines where parts still go
  refreshHints(keyOnly = null) {
    this.hints.clear();
    if (!this.active) return;
    const { mb, sc } = this.app;
    const list = this.remaining().filter((i) => this.showAll || (keyOnly && this.lotKey(i) === keyOnly));
    for (const i of list) {
      const g = sc.makeGhost(mb.parts[i], 0xffe07a, 0.28);
      g.matrixAutoUpdate = false;
      g.matrix.copy(partMatrix(mb.parts[i]));
      this.hints.add(g);
    }
  }

  screenOf(i) {
    const { mb, sc } = this.app;
    const q = mb.parts[i], p = part(q.id), d = dims(p, q.r);
    const v = new THREE.Vector3(q.x + d.w / 2, (q.y + p.h * 0.6) * PLATE, q.z + d.d / 2).project(sc.camera);
    const r = sc.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, behind: v.z > 1 };
  }

  startDrag(e, key, el) {
    e.preventDefault();
    const { mb, sc } = this.app;
    const targets = this.remaining().filter((i) => this.lotKey(i) === key);
    if (!targets.length) return;
    const q0 = mb.parts[targets[0]];
    const ghost = sc.makeGhost(q0, 0xffffff, 0.6);
    ghost.matrixAutoUpdate = false;
    ghost.visible = false;
    this.ghosts.add(ghost);
    this.refreshHints(key);
    const img = document.createElement('img');
    img.className = 'drag-ghost';
    img.src = el.querySelector('img').src;
    document.body.appendChild(img);
    let snapped = -1;
    const ray = new THREE.Raycaster();
    const move = (ev) => {
      img.style.left = ev.clientX + 'px'; img.style.top = ev.clientY + 'px';
      const r = sc.canvas.getBoundingClientRect();
      const over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom && !this.tray.contains(document.elementFromPoint(ev.clientX, ev.clientY));
      let best = -1, bd = Infinity;
      for (const i of targets) {
        if (this.placed.has(i)) continue;
        const s = this.screenOf(i);
        if (s.behind) continue;
        const d = Math.hypot(s.x - ev.clientX, s.y - ev.clientY);
        if (d < bd) { bd = d; best = i; }
      }
      snapped = over && bd < SNAP_PX ? best : -1;
      img.style.opacity = over ? '0' : '0.85';
      ghost.visible = over;
      if (!over) return;
      const setColor = (hex) => ghost.traverse((o) => { if (o.material) o.material.color.set(hex); });
      if (snapped >= 0) {
        ghost.matrix.copy(partMatrix(mb.parts[snapped]));
        setColor(0x7fdc8e);
      } else {
        // follow the pointer on the horizontal plane at the height of the nearest spot
        const q = mb.parts[best >= 0 ? best : targets[0]];
        const v = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(v, sc.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(q.y + 1) * PLATE);
        const hit = new THREE.Vector3();
        if (ray.ray.intersectPlane(plane, hit)) {
          const d = dims(part(q.id), q.r);
          ghost.matrix.copy(partMatrix({ ...q, x: hit.x - d.w / 2, z: hit.z - d.d / 2, y: q.y + 2 }));
        }
        setColor(0xf4f1ea);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      img.remove();
      this.ghosts.remove(ghost);
      if (snapped >= 0) { this.place(snapped, true); }
      else if (ghost.visible) { this.toast('Not quite: drop it on one of the glowing outlines'); }
      this.refreshHints();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    move(e);
  }

  place(i, byHand) {
    this.placed.add(i);
    if (byHand) this.byHand++;
    this.applyVisibility();
    this.app.sc.drop([i], 260, byHand ? 3 : 10);
    if (this.app.sound) this.app.radio.synth.click();
    this.renderHUD();
    if (!this.remaining().length) this.complete();
  }

  complete() {
    if (this.app.sound) this.app.radio.synth.chime();
    const last = this.n === this.app.steps.length;
    this.toast(last ? 'The house is finished. Welcome home.' : `Step ${this.n} done!`);
    this.save();
    if (!last) { clearTimeout(this.adv); this.adv = setTimeout(() => { if (this.active && !this.remaining().length) this.goto(this.n + 1); }, 900); }
  }

  next() {
    if (this.remaining().length) this.autoPlace(() => this.goto(this.n + 1));
    else this.goto(this.n + 1);
  }

  autoPlace(done) {
    const rem = this.remaining();
    clearTimeout(this.adv);
    let k = 0;
    const tick = () => {
      if (!this.active) return;
      if (k >= rem.length) { done?.(); return; }
      const i = rem[k++];
      if (!this.placed.has(i)) {
        this.placed.add(i);
        this.applyVisibility();
        this.app.sc.drop([i], 240, 10);
        this.renderHUD();
      }
      if (k === rem.length) {
        this.refreshHints();
        if (!done) this.complete(); else setTimeout(done, 250);
      } else setTimeout(tick, Math.max(25, 260 / rem.length));
    };
    tick();
  }

  toast(msg) {
    const t = this.toastEl;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this.tt);
    this.tt = setTimeout(() => (t.hidden = true), 1800);
  }
}
