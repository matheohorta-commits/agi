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

const LEVEL_LABELS = [
  ['garden', 'Front garden'], ['base', 'Base'], ['basement', 'Basement lab'], ['ground', 'Ground floor'],
  ['upper', 'Upper floor'], ['attic', 'Attic'], ['roof', 'Roof & turret'], ['gazebo', 'Backyard'], ['figs', 'Residents'],
];

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
    $('brand-sub').textContent = `1120 Westchester Pl. · ${this.bom.pieces.toLocaleString('en')} pieces`;

    this.sc = new BrickScene($('view'));
    this.sc.setModel(this.mb);
    this.sc.insetLeft = 288;
    this.all = this.mb.parts.map((_, i) => i);
    this.sc.resize();
    const { center } = this.sc.frame(this.sc.boxOf(this.all), 'front', this.sc.camera, 0.92);
    this.sc.controls.target.copy(center);
    this.sc.start();
    let first = true;
    this.sc.onFrame.push(() => { if (first) { first = false; $('loading').classList.add('gone'); } });

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
    this.mode = mode;
    $('app').dataset.mode = mode;
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
    this.stopPlay();
    $('tip').hidden = true;
    $('info-card').hidden = true;
    const overlay = mode === 'booklet' || mode === 'parts';
    this.sc.paused = overlay;
    this.sc.insetLeft = mode === 'explore' ? 288 : 0;
    this.sc.resize();
    if (mode === 'explore') this.applyExplore();
    if (mode === 'booklet') this.booklet.show(this.booklet.pos);
    if (mode === 'build') this.build.enter();
    if (mode === 'parts') this.parts.show();
    const tag = { explore: 'explore', booklet: 'instructions', build: 'build', parts: 'parts' }[mode];
    try { history.replaceState(null, '', '#' + tag); } catch { /* sandboxed */ }
  }

  // ------------------------------------------------ explore
  initExplore() {
    const chips = $('level-chips');
    this.hidden = new Set();
    for (const [lv, label] of LEVEL_LABELS) {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = label; b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', () => {
        if (this.hidden.has(lv)) this.hidden.delete(lv); else this.hidden.add(lv);
        b.setAttribute('aria-pressed', String(!this.hidden.has(lv)));
        this.applyExplore();
      });
      chips.appendChild(b);
    }
    document.querySelectorAll('#view-buttons button').forEach((b) => b.addEventListener('click', () => this.sc.flyTo(this.sc.boxOf(this.shownList()), b.dataset.view)));
    $('explode').addEventListener('input', (e) => { this.sc.explode = e.target.value / 100; this.sc.update(); });
    $('night').addEventListener('change', (e) => this.sc.setNight(e.target.checked));
    $('spin').addEventListener('change', (e) => { this.sc.controls.autoRotate = e.target.checked; this.sc.controls.autoRotateSpeed = 1.2; });
    const tl = $('tl');
    tl.max = String(this.steps.length);
    tl.value = String(this.steps.length);
    this.tlStep = this.steps.length;
    tl.addEventListener('input', () => { this.stopPlay(); this.tlStep = +tl.value; this.applyExplore(); });
    $('tl-play').addEventListener('click', () => (this.playing ? this.stopPlay() : this.play()));
    this.updateTL();

    // hover + click identification
    const canvas = $('view');
    let last = 0, downAt = null;
    canvas.addEventListener('pointermove', (e) => {
      if (this.mode !== 'explore' || e.buttons) { $('tip').hidden = true; return; }
      const now = performance.now();
      if (now - last < 60) return;
      last = now;
      const hit = this.sc.pick(e.clientX, e.clientY);
      const tip = $('tip');
      if (!hit) { tip.hidden = true; return; }
      const q = this.mb.parts[hit.i];
      tip.innerHTML = this.partLabel(q);
      const r = canvas.getBoundingClientRect();
      tip.style.left = Math.min(r.width - 290, e.clientX - r.left + 14) + 'px';
      tip.style.top = (e.clientY - r.top + 14) + 'px';
      tip.hidden = false;
    });
    canvas.addEventListener('pointerleave', () => ($('tip').hidden = true));
    canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
    canvas.addEventListener('pointerup', (e) => {
      if (this.mode !== 'explore' || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
      const hit = this.sc.pick(e.clientX, e.clientY);
      if (hit) this.showInfo(hit.i); else $('info-card').hidden = true;
    });
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
      card.innerHTML = `<button class="x" aria-label="Close">×</button><img alt="" src="${thumb('fig', 'black', 96, q.fig)}"><div><h3>${c.name}</h3><p>${c.note}. Built from ${q.figParts.map((f) => `${part(f.id).name} (${COLORS[f.c].name})`).join(', ')}.</p><p>Moves in at step ${n}.</p></div>`;
    } else {
      const p = part(q.id);
      const L = this.lotOf.get(q.id + '|' + q.c);
      card.innerHTML = `<button class="x" aria-label="Close">×</button><img alt="" src="${thumb(q.id, q.c, 96)}"><div>
        <h3>${L?.officialName ?? p.name}</h3>
        <p><span class="swatch" style="background:${COLORS[q.c].hex}"></span>${COLORS[q.c].name} · part <span class="mono">${p.bl}</span></p>
        <p>${L ? `${L.qty} in this set · about €${L.unit.toFixed(2)} each · ${L.rarity.label.toLowerCase()}` : ''}</p>
        <p>Placed in step ${n} (${this.steps[n - 1].name}). ${L ? `<a href="${brickLinkURL(L)}" target="_blank" rel="noopener">Find it on BrickLink ↗</a>` : ''}</p></div>`;
    }
    card.hidden = false;
    card.querySelector('.x').addEventListener('click', () => (card.hidden = true));
  }

  shownList() { return this.all.filter((i) => this.sc.isShown(i)); }

  applyExplore() {
    this.sc.hiddenLevels = new Set(this.hidden);
    this.sc.explode = $('explode').value / 100;
    const n = this.tlStep;
    this.sc.setVisibility((i) => this.stepOf[i] <= n);
    this.sc.setHighlight(n < this.steps.length ? this.steps[n - 1]?.parts ?? [] : []);
    this.updateTL();
  }

  updateTL() {
    const n = this.tlStep;
    $('tl').value = String(n);
    $('tl-play').textContent = this.playing ? '❚❚' : '▶';
    $('tl-label').textContent = n >= this.steps.length ? `Finished house · all ${this.steps.length} steps`
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
