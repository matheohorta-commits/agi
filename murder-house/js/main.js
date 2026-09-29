import { buildHouse } from './model/house.js';
import { makeSteps } from './core/steps.js';
import { computeBOM, brickLinkURL } from './core/bom.js';
import { COLORS } from './core/colors.js';
import { part } from './core/parts.js';
import { CHARACTERS } from './model/furniture.js';
import { BrickScene } from './gfx/scene.js';
import { thumb } from './gfx/thumbs.js';
import { Booklet } from './ui/booklet.js';
import { BuildMode } from './ui/build.js';
import { PartsList } from './ui/partslist.js';
import { Radio } from './ui/radio.js';

const $ = (id) => document.getElementById(id);

// the four modules of the house, top to bottom (how they are shown in the floor stack)
export const FLOORS = [
  { m: 'D', name: 'Attic & roofs', note: 'the Rubber Man\'s hideout', icon: 'roof' },
  { m: 'C', name: 'Upper floor', note: 'bedrooms & nursery', icon: 'floor' },
  { m: 'B', name: 'Ground floor', note: 'grand staircase & kitchen', icon: 'floor' },
  { m: 'A', name: 'Garden & basement', note: 'the laboratory', icon: 'base' },
];
const ORDER = ['A', 'B', 'C', 'D'];

function floorIcon(kind, m) {
  const brick = '#a8452c', tan = '#d8bd8a', roof = '#6b7280', green = '#4caf50';
  const slab = (y, c) => `<path d="M4 ${y}l18-7 18 7-18 7z" fill="${c}"/><path d="M4 ${y}v3l18 7v-3z" fill="${c}" opacity=".75"/><path d="M40 ${y}v3l-18 7v-3z" fill="${c}" opacity=".55"/>`;
  if (kind === 'roof') return `<svg class="floor-icon" viewBox="0 0 44 34" aria-hidden="true">${slab(22, '#8a8f98')}<path d="M8 21l14-15 14 15-14 6z" fill="${roof}"/><path d="M22 6l14 15-14 6z" fill="#4b5563"/><rect x="28" y="6" width="4" height="8" fill="${brick}"/></svg>`;
  if (kind === 'base') return `<svg class="floor-icon" viewBox="0 0 44 34" aria-hidden="true">${slab(22, green)}<path d="M10 20V12l12-5 12 5v8l-12 5z" fill="${brick}" opacity=".9"/><path d="M22 7l12 5v8l-12 5z" fill="#7d311f"/><circle cx="36" cy="18" r="3" fill="#2e7d32"/></svg>`;
  const lift = m === 'C' ? 0 : 0;
  return `<svg class="floor-icon" viewBox="0 0 44 34" aria-hidden="true">${slab(24 - lift, tan)}<path d="M6 22V10l16-6 16 6v12l-16 6z" fill="${brick}"/><path d="M22 4l16 6v12l-16 6z" fill="#7d311f"/><rect x="10" y="13" width="3" height="5" fill="#1f2937"/><rect x="16" y="11" width="3" height="5" fill="#1f2937"/><rect x="26" y="12" width="3" height="5" fill="#111827"/><rect x="32" y="14" width="3" height="5" fill="#111827"/></svg>`;
}

class App {
  constructor() {
    this.mode = 'explore';
    this.sound = true;
    this.mb = buildHouse();
    this.steps = makeSteps(this.mb);
    this.stepOf = new Int32Array(this.mb.parts.length);
    this.steps.forEach((s) => s.parts.forEach((i) => (this.stepOf[i] = s.n)));
    this.bom = computeBOM(this.mb, this.steps);
    this.lotOf = new Map(this.bom.lots.map((L) => [L.id + '|' + L.c, L]));
    $('brand-sub').textContent = `1120 Westchester Pl. · ${this.bom.pieces.toLocaleString('en')} pieces · 4 floor modules`;

    this.sc = new BrickScene($('view'));
    this.sc.setModel(this.mb);
    this.all = this.mb.parts.map((_, i) => i);
    this.sc.insetRight = 300;
    this.sc.resize();
    const { center } = this.sc.frame(this.sc.boxOf(this.all), 'hero', this.sc.camera, 0.9);
    this.sc.controls.target.copy(center);
    this.sc.start();
    let first = true;
    this.sc.onFrame.push(() => { if (first) { first = false; setTimeout(() => $('loading').classList.add('gone'), 60); } });

    this.radio = new Radio();
    this.booklet = new Booklet(this);
    this.build = new BuildMode(this);
    this.parts = new PartsList(this);
    this.initExplore();
    this.initTabs();
    const hash = location.hash.replace('#', '');
    const fromHash = { explore: 'explore', instructions: 'booklet', build: 'build', parts: 'parts' }[hash];
    if (fromHash) this.setMode(fromHash);
  }

  charName(k) { return CHARACTERS[k]?.name ?? k; }

  // ------------------------------------------------ modes
  initTabs() {
    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
  }

  setMode(mode) {
    if (mode === this.mode) return;
    if (this.mode === 'build') this.build.leave();
    if (this.mode === 'booklet') this.booklet.leave?.();
    this.mode = mode;
    $('app').dataset.mode = mode;
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
    this.stopPlay();
    $('tip').hidden = true;
    $('info-card').hidden = true;
    const overlay = mode === 'booklet' || mode === 'parts';
    this.sc.paused = overlay;
    this.sc.insetRight = mode === 'explore' ? 300 : 0;
    this.sc.resize();
    if (mode === 'explore') { this.sc.hiddenModules = new Set(this.hiddenMods); this.applyExplore(); }
    if (mode === 'booklet') this.booklet.enter();
    if (mode === 'build') this.build.enter();
    if (mode === 'parts') this.parts.show();
    const tag = { explore: 'explore', booklet: 'instructions', build: 'build', parts: 'parts' }[mode];
    try { history.replaceState(null, '', '#' + tag); } catch { /* sandboxed */ }
  }

  // ------------------------------------------------ explore
  initExplore() {
    this.hiddenMods = new Set();
    this.openM = null;
    const pieces = { A: 0, B: 0, C: 0, D: 0 };
    this.mb.parts.forEach((q, i) => { pieces[this.sc.moduleOf[i]] += q.figParts ? q.figParts.length : 1; });
    const stack = $('floor-stack');
    const eyeSVG = '<svg viewBox="0 0 24 24" class="open-e"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><svg viewBox="0 0 24 24" class="shut"><path d="M3 3l18 18 M10.6 5.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9 M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 004.6-1.2"/></svg>';
    for (const f of FLOORS) {
      const li = document.createElement('li');
      li.className = 'floor';
      li.dataset.m = f.m;
      li.innerHTML = `<button class="floor-main" title="Open the house at this floor">${floorIcon(f.icon, f.m)}<span class="floor-text"><b>${f.name}</b><small>${pieces[f.m].toLocaleString('en')} pcs · ${f.note}</small></span></button>
        <button class="eye" aria-pressed="true" aria-label="Show or hide the ${f.name.toLowerCase()}">${eyeSVG}</button>`;
      li.querySelector('.floor-main').addEventListener('click', () => this.openFloor(this.openM === f.m ? null : f.m));
      li.querySelector('.eye').addEventListener('click', () => this.toggleFloor(f.m));
      stack.appendChild(li);
    }
    $('floors-all').addEventListener('click', () => this.openFloor(null, true));
    $('lift').addEventListener('click', () => this.setLift(this.sc.explode < 0.5));
    document.querySelectorAll('#view-buttons button').forEach((b) => b.addEventListener('click', () => {
      this.sc.flyTo(this.sc.boxOf(this.shownList()), b.dataset.view);
    }));
    $('night').addEventListener('click', () => {
      const on = !this.sc.night;
      this.sc.setNight(on);
      $('night').setAttribute('aria-pressed', String(on));
      $('app').dataset.night = on ? '1' : '';
    });
    $('spin').addEventListener('click', () => {
      const on = !this.sc.controls.autoRotate;
      this.sc.controls.autoRotate = on; this.sc.controls.autoRotateSpeed = 1.1;
      $('spin').setAttribute('aria-pressed', String(on));
    });
    const hd = $('hd');
    const syncHD = () => hd.setAttribute('aria-pressed', String(this.sc.quality === 'high'));
    hd.addEventListener('click', () => { this.sc.autoQuality = false; this.sc.setQuality(this.sc.quality === 'high' ? 'low' : 'high'); syncHD(); });
    this.sc.onQualityDrop = syncHD;
    syncHD();
    const tl = $('tl');
    tl.max = String(this.steps.length);
    tl.value = String(this.steps.length);
    this.tlStep = this.steps.length;
    tl.addEventListener('input', () => { this.stopPlay(); this.tlStep = +tl.value; this.applyExplore(); });
    $('tl-play').addEventListener('click', () => (this.playing ? this.stopPlay() : this.play()));
    this.updateTL();
    this.syncFloors();
    setTimeout(() => $('hint').classList.add('faded'), 12000);

    // hover + click identification
    const canvas = $('view');
    let last = 0, downAt = null;
    canvas.addEventListener('pointermove', (e) => {
      if (this.mode !== 'explore' || e.buttons || e.pointerType === 'touch') { $('tip').hidden = true; return; }
      const now = performance.now();
      if (now - last < 70) return;
      last = now;
      const hit = this.sc.pick(e.clientX, e.clientY);
      const tip = $('tip');
      if (!hit) { tip.hidden = true; return; }
      const q = this.mb.parts[hit.i];
      tip.innerHTML = this.partLabel(q);
      const r = canvas.getBoundingClientRect();
      tip.style.left = Math.min(r.width - 290, e.clientX - r.left + 16) + 'px';
      tip.style.top = (e.clientY - r.top + 16) + 'px';
      tip.hidden = false;
    });
    canvas.addEventListener('pointerleave', () => ($('tip').hidden = true));
    canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
    canvas.addEventListener('pointerup', (e) => {
      if (this.mode !== 'explore' || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
      const hit = this.sc.pick(e.clientX, e.clientY);
      if (hit) this.showInfo(hit.i); else $('info-card').hidden = true;
    });
    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'explore' || e.target.closest('input, select, textarea')) return;
      if (e.key === ' ') { e.preventDefault(); this.playing ? this.stopPlay() : this.play(); }
    });
  }

  // open the house at a floor: the floors above are lifted off and set aside, the camera looks in
  openFloor(m, reassemble = false) {
    const sc = this.sc;
    const prev = this.openM;
    this.openM = m;
    const above = m ? ORDER.slice(ORDER.indexOf(m) + 1) : [];
    const wasAway = prev ? ORDER.slice(ORDER.indexOf(prev) + 1) : [];
    const goAway = above.filter((x) => !wasAway.includes(x));
    const comeBack = wasAway.filter((x) => !above.includes(x));
    if (sc.explode > 0) { sc.explode = 0; $('lift').setAttribute('aria-pressed', 'false'); }
    if (reassemble) for (const x of ORDER) this.hiddenMods.delete(x);
    // lift away
    if (goAway.length) {
      sc.animateLift(goAway, 0, 110, 650, () => {
        goAway.forEach((x) => { this.hiddenMods.add(x); sc.moduleLift[x] = 0; });
        sc.hiddenModules = new Set(this.hiddenMods);
        sc.update();
      });
    }
    // put back
    if (comeBack.length) {
      comeBack.forEach((x) => { this.hiddenMods.delete(x); sc.moduleLift[x] = 110; });
      sc.hiddenModules = new Set(this.hiddenMods);
      sc.animateLift(comeBack, 110, 0, 750);
    }
    if (reassemble && !comeBack.length) { sc.hiddenModules = new Set(this.hiddenMods); sc.update(); }
    this.syncFloors();
    const target = m ? this.all.filter((i) => sc.moduleOf[i] === m && this.stepOf[i] <= this.tlStep && sc.levelOf[i] !== 'garden' && sc.levelOf[i] !== 'base' && sc.levelOf[i] !== 'gazebo') : this.all;
    const box = sc.boxOf(target.length ? target : this.all);
    if (m) box.max.y -= 0; // keep
    sc.flyTo(box, m ? (m === 'D' ? 'hero' : 'back') : 'hero', 900);
  }

  toggleFloor(m) {
    if (this.hiddenMods.has(m)) this.hiddenMods.delete(m); else this.hiddenMods.add(m);
    this.sc.hiddenModules = new Set(this.hiddenMods);
    this.sc.update();
    this.syncFloors();
  }

  setLift(on) {
    const sc = this.sc;
    if (on && this.openM) { this.openM = null; for (const x of ORDER) this.hiddenMods.delete(x); sc.hiddenModules = new Set(this.hiddenMods); }
    $('lift').setAttribute('aria-pressed', String(on));
    sc.animateExplode(on ? 1 : 0, 900, () => sc.flyTo(sc.boxOf(this.shownList()), on ? 'back' : 'hero', 700));
    this.syncFloors();
  }

  syncFloors() {
    document.querySelectorAll('.floor').forEach((li) => {
      const m = li.dataset.m;
      li.classList.toggle('open', this.openM === m);
      li.classList.toggle('off', this.hiddenMods.has(m));
      li.querySelector('.eye').setAttribute('aria-pressed', String(!this.hiddenMods.has(m)));
    });
    $('floors-all').disabled = !this.openM && !this.hiddenMods.size;
  }

  partLabel(q) {
    if (q.id === 'fig') return `<b>${this.charName(q.fig)}</b>${CHARACTERS[q.fig].note}`;
    const p = part(q.id);
    return `<b>${p.name}</b><span class="swatch" style="background:${COLORS[q.c].hex}"></span>${COLORS[q.c].name} · <code>${p.bl}</code>`;
  }

  showInfo(i) {
    const q = this.mb.parts[i];
    const card = $('info-card');
    const n = this.stepOf[i];
    if (q.id === 'fig') {
      const c = CHARACTERS[q.fig];
      card.innerHTML = `<button class="x" aria-label="Close">×</button><img alt="" src="${thumb('fig', 'black', 152, q.fig)}"><div><h3>${c.name}</h3><p>${c.note}.</p><p>Built from ${q.figParts.map((f) => `${part(f.id).name} (${COLORS[f.c].name})`).join(', ')}.</p><p>Moves in at step ${n}.</p></div>`;
    } else {
      const p = part(q.id);
      const L = this.lotOf.get(q.id + '|' + q.c);
      card.innerHTML = `<button class="x" aria-label="Close">×</button><img alt="" src="${thumb(q.id, q.c, 152)}"><div>
        <h3>${L?.officialName ?? p.name}</h3>
        <p><span class="swatch" style="background:${COLORS[q.c].hex}"></span>${COLORS[q.c].name} · part <span class="mono">${p.bl}</span></p>
        <p>${L ? `${L.qty} in this set · about €${L.unit.toFixed(2)} each · ${L.rarity.label.toLowerCase()}` : ''}</p>
        <p>Step ${n} · ${this.steps[n - 1].name}</p>
        <p>${L ? `<a href="${brickLinkURL(L)}" target="_blank" rel="noopener">Find it on BrickLink ↗</a>` : ''}</p></div>`;
    }
    card.hidden = false;
    card.querySelector('.x').addEventListener('click', () => (card.hidden = true));
  }

  shownList() { return this.all.filter((i) => this.sc.isShown(i)); }

  applyExplore() {
    this.sc.hiddenModules = new Set(this.hiddenMods);
    const n = this.tlStep;
    this.sc.setVisibility((i) => this.stepOf[i] <= n);
    this.sc.setHighlight(n < this.steps.length ? this.steps[n - 1]?.parts ?? [] : []);
    this.updateTL();
  }

  updateTL() {
    const n = this.tlStep;
    $('tl').value = String(n);
    $('tl-play').classList.toggle('on', !!this.playing);
    $('tl-play').setAttribute('aria-label', this.playing ? 'Pause the build' : 'Play the build');
    $('tl-label').textContent = n >= this.steps.length ? `Finished · all ${this.steps.length} steps · press play to watch it being built`
      : n === 0 ? 'Empty lot' : `Step ${n} of ${this.steps.length} · ${this.steps[n - 1].name}`;
  }

  play() {
    if (this.tlStep >= this.steps.length) this.tlStep = 0;
    this.playing = true;
    const tick = () => {
      if (!this.playing) return;
      this.tlStep++;
      this.applyExplore();
      this.sc.drop(this.steps[this.tlStep - 1].parts, 300, 12);
      if (this.tlStep >= this.steps.length) { this.stopPlay(); return; }
      this.playTimer = setTimeout(tick, 320);
    };
    tick();
    this.updateTL();
  }
  stopPlay() { this.playing = false; clearTimeout(this.playTimer); this.updateTL(); }

  openStepIn3D(n) {
    this.tlStep = n;
    this.setMode('explore');
    this.applyExplore();
    const s = this.steps[n - 1];
    const list = this.all.filter((i) => this.mb.parts[i].sec === s.sec && this.stepOf[i] <= n);
    this.sc.flyTo(this.sc.boxOf(list), s.view);
  }

  buildFromStep(n) {
    if (this.mode === 'build') { this.build.goto(n); return; }
    this.build.n = n;
    this.setMode('build');
  }
}

try {
  window.app = new App();
} catch (err) {
  console.error(err);
  document.querySelector('#loading p').textContent = 'Could not start the 3D view: ' + err.message;
}
