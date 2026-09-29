// Instruction booklet: pages generated from the build steps, laid out like a real LEGO booklet
// (light-blue pages, big step numbers, parts callouts with counts, bag openers, inventory at the end).
import { COLORS } from '../core/colors.js';
import { PARTS } from '../core/parts.js';
import { CHARACTERS } from '../model/furniture.js';
import { thumb } from '../gfx/thumbs.js';

const PAGE_BG = '#bfdff2';

export class Booklet {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('booklet');
    this.spread = document.getElementById('spread');
    this.slider = document.getElementById('bk-page');
    this.jump = document.getElementById('bk-jump');
    this.count = document.getElementById('bk-count');
    this.imgCache = new Map();
    this.pages = this.paginate();
    this.pos = 0;         // index of the first page shown
    document.getElementById('bk-prev').addEventListener('click', () => this.go(-1));
    document.getElementById('bk-next').addEventListener('click', () => this.go(1));
    this.slider.addEventListener('input', () => this.show(+this.slider.value * this.per()));
    this.jump.addEventListener('change', () => this.show(+this.jump.value));
    window.addEventListener('keydown', (e) => {
      if (this.app.mode !== 'booklet') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { this.go(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { this.go(-1); e.preventDefault(); }
    });
    window.addEventListener('resize', () => { if (this.app.mode === 'booklet') this.show(this.pos); });
    this.buildJump();
  }

  per() { return window.innerWidth <= 900 ? 1 : 2; }

  paginate() {
    const { steps, bom } = this.app;
    const pages = [{ type: 'cover' }, { type: 'figs' }];
    let bag = 0;
    for (let k = 0; k < steps.length; k++) {
      const s = steps[k];
      if (s.bag !== bag) {
        bag = s.bag;
        pages.push({ type: 'bag', bag });
      }
      const nxt = steps[k + 1];
      const small = (x) => x && x.parts.length <= 3 && x.lots.length <= 3;
      if (small(s) && small(nxt) && nxt.sec === s.sec && nxt.bag === s.bag) { pages.push({ type: 'step', steps: [s, nxt] }); k++; }
      else pages.push({ type: 'step', steps: [s] });
    }
    // inventory
    const lots = bom.lots;
    const per = 48;
    for (let i = 0; i < lots.length; i += per) pages.push({ type: 'inv', lots: lots.slice(i, i + per), first: i === 0 });
    pages.push({ type: 'end' });
    if (pages.length % 2) pages.splice(pages.length - 1, 0, { type: 'notes' });
    pages.forEach((p, i) => (p.no = i + 1));
    return pages;
  }

  buildJump() {
    const opts = [];
    let lastSec = -1;
    this.pages.forEach((p, i) => {
      if (p.type === 'cover') opts.push([i, 'Cover']);
      if (p.type === 'figs') opts.push([i, 'The residents (minifigures)']);
      if (p.type === 'bag') opts.push([i, `Bag ${p.bag}`]);
      if (p.type === 'step' && p.steps[0].sec !== lastSec) { lastSec = p.steps[0].sec; opts.push([i, `   Step ${p.steps[0].n} · ${p.steps[0].name}`]); }
      if (p.type === 'inv' && p.first) opts.push([i, 'Parts inventory']);
    });
    this.jump.innerHTML = opts.map(([i, t]) => `<option value="${i}">${t.replace(/ /g, '&nbsp;')}</option>`).join('');
  }

  pageOfStep(n) {
    return Math.max(0, this.pages.findIndex((p) => p.type === 'step' && p.steps.some((s) => s.n === n)));
  }

  go(dir) { this.show(this.pos + dir * this.per(), dir); }

  show(pos, dir = 0) {
    const per = this.per();
    pos = Math.max(0, Math.min(this.pages.length - 1, pos));
    pos -= pos % per;
    this.pos = pos;
    const show = this.pages.slice(pos, pos + per);
    this.spread.innerHTML = '';
    show.forEach((p, j) => {
      const el = this.renderPage(p, per === 1 ? 'right' : j === 0 ? 'left' : 'right');
      if (dir > 0 && (j === show.length - 1)) el.classList.add('turn-next');
      if (dir < 0 && j === 0) el.classList.add('turn-prev');
      this.spread.appendChild(el);
    });
    this.slider.max = String(Math.ceil(this.pages.length / per) - 1);
    this.slider.value = String(Math.floor(pos / per));
    this.count.textContent = per === 1 ? `${pos + 1} / ${this.pages.length}` : `${pos + 1}–${Math.min(this.pages.length, pos + 2)} / ${this.pages.length}`;
    let sel = 0;
    for (const o of this.jump.options) if (+o.value <= pos + per - 1) sel = o.index;
    this.jump.selectedIndex = sel;
  }

  // ------------------------------------------------ page renderers
  renderPage(p, side) {
    const el = document.createElement('article');
    el.className = `page ${side}`;
    const pno = `<span class="pno">${p.no}</span>`;
    switch (p.type) {
      case 'cover': return this.cover(el);
      case 'figs': el.innerHTML = this.figsHTML() + pno; break;
      case 'bag': el.innerHTML = this.bagHTML(p) + pno; break;
      case 'step': this.stepPage(el, p); el.insertAdjacentHTML('beforeend', pno); break;
      case 'inv': el.innerHTML = this.invHTML(p) + pno; break;
      case 'notes': el.innerHTML = this.notesHTML() + pno; break;
      case 'end': this.endPage(el); el.insertAdjacentHTML('beforeend', pno); break;
    }
    return el;
  }

  cover(el) {
    const { bom, mb } = this.app;
    el.classList.add('cover');
    const all = mb.parts.map((_, i) => i);
    el.innerHTML = `<div class="cover-top"><span class="age">16+</span><span class="setno">1120</span></div>
      <h2>The Murder House</h2>
      <p>1120 Westchester Place · Los Angeles · a fan-designed set in real LEGO® parts</p>
      <div class="step-img"><img alt="The finished Murder House" src="${this.snap('cover', { show: () => true, view: 'front', box: this.app.sc.boxOf(all), bg: null, pad: 0.92, w: 900, h: 760 })}"></div>
      <p class="pcs">${bom.pieces.toLocaleString('en')} pieces · ${this.app.steps.length} steps · 9 minifigures</p>`;
    return el;
  }

  figsHTML() {
    const figs = Object.entries(CHARACTERS).map(([k, c]) => `<div class="fig"><img alt="${c.name}" src="${thumb('fig', 'black', 160, k)}"><b>${c.name}</b>${c.note}</div>`).join('');
    return `<h3>The residents</h3><p class="note">Build the nine minifigures first: legs, torso, head, hair. They move in at the end of the build.</p><div class="figs">${figs}</div>`;
  }

  bagHTML(p) {
    const { steps, mb, sc } = this.app;
    const inBag = steps.filter((s) => s.bag === p.bag);
    const secs = [...new Set(inBag.map((s) => s.name))];
    const last = inBag[inBag.length - 1].n;
    const bagParts = new Set(inBag.flatMap((s) => s.parts));
    const pieces = inBag.reduce((a, s) => a + s.parts.reduce((b, i) => b + (mb.parts[i].figParts ? mb.parts[i].figParts.length : 1), 0), 0);
    const img = this.snap('bag' + p.bag, {
      show: (i) => this.app.stepOf[i] <= last, view: inBag[0].view === 'back' ? 'back' : 'front',
      box: sc.boxOf(mb.parts.map((_, i) => i).filter((i) => this.app.stepOf[i] <= last)),
      fade: { test: (i) => !bagParts.has(i), amount: 0.55, color: PAGE_BG }, w: 700, h: 520, pad: 1.0,
    });
    return `<div class="bag"><div class="bagicon">${p.bag}</div>
      <h3>${bagTitle(p.bag)}</h3>
      <p class="note">${secs.join(' · ')}<br>${pieces} pieces · steps ${inBag[0].n}–${last}</p>
      <div class="step-img" style="width:100%"><img alt="What bag ${p.bag} builds" src="${img}"></div></div>`;
  }

  stepPage(el, p) {
    const inner = p.steps.map((s) => this.stepBlock(s)).join('');
    el.innerHTML = p.steps.length > 1 ? `<div class="two-steps">${inner}</div>` : inner;
    el.insertAdjacentHTML('beforeend', `<span class="sec-name">${p.steps[0].name}</span>`);
    el.querySelectorAll('[data-open3d]').forEach((b) => b.addEventListener('click', () => this.app.openStepIn3D(+b.dataset.open3d)));
    el.querySelectorAll('[data-build]').forEach((b) => b.addEventListener('click', () => this.app.buildFromStep(+b.dataset.build)));
  }

  stepBlock(s) {
    const { sc, mb } = this.app;
    const lots = s.lots.map((L) => `<span class="it"><img alt="" src="${thumb(L.fig ? 'fig' : L.id, L.c, 96, L.fig)}">${L.n}x</span>`).join('');
    const secParts = mb.parts.map((_, i) => i).filter((i) => mb.parts[i].sec === s.sec && this.app.stepOf[i] <= s.n);
    const box = sc.boxOf([...secParts, ...s.parts]);
    const newSet = new Set(s.parts);
    const img = this.snap('step' + s.n, {
      show: (i) => this.app.stepOf[i] <= s.n, view: s.view, box,
      fade: { test: (i) => !newSet.has(i), amount: 0.22, color: PAGE_BG }, pad: s.parts.length < 4 ? 1.35 : 1.08,
    });
    return `<div class="stepblock" style="display:flex;flex-direction:column;flex:1;min-height:0">
      <div class="step-head"><span class="step-no">${s.n}</span><div class="callout">${lots}</div></div>
      <div class="step-img"><img alt="Step ${s.n}" src="${img}"><button class="open3d" data-open3d="${s.n}">Turn it in 3D</button></div>
      <button class="build-this" data-build="${s.n}">Place these parts yourself</button></div>`;
  }

  invHTML(p) {
    const items = p.lots.map((L) => `<div class="it" title="${L.qty}x ${L.officialName} (${COLORS[L.c].name})"><img alt="" src="${thumb(L.id, L.c, 64)}">${L.qty}x<span>${L.bl}</span></div>`).join('');
    return `${p.first ? '<h3>Parts inventory</h3>' : ''}<div class="inv">${items}</div>`;
  }

  notesHTML() {
    return `<h3>Notes for the builder</h3>
      <p class="note">Every floor of this house is built on its own slab of plates, so you can open it like a dollhouse from the back. The roof lifts off the attic floor to show the Rubber Man's hiding place.</p>
      <p class="note">All parts are standard LEGO elements in colours that were produced for real sets. Common colours (Reddish Brown, Tan, Dark Bluish Gray, Black) keep the price down.</p>
      <p class="note">Parts lists for BrickLink and Rebrickable are on the "Parts &amp; buying" tab.</p>`;
  }

  endPage(el) {
    const { mb, sc } = this.app;
    const all = mb.parts.map((_, i) => i);
    el.classList.add('cover');
    el.innerHTML = `<h2>Welcome home.</h2><p>"Normal people scare me." Turn the lights off and switch the 3D view to night.</p>
      <div class="step-img"><img alt="The Murder House at night" src="${this.snap('night', { show: () => true, view: 'front', box: sc.boxOf(all), bg: 0x0b0f1f, night: true, pad: 0.95, w: 900, h: 760 })}"></div>`;
  }

  snap(key, opts) {
    if (this.imgCache.has(key)) return this.imgCache.get(key);
    const url = this.app.sc.snapshot({ w: 900, h: 700, ...opts });
    this.imgCache.set(key, url);
    return url;
  }
}

function bagTitle(n) {
  return ['', 'The grounds & basement', 'The laboratory & the porch', 'Ground floor', 'Ground floor rooms', 'Upper floor',
    'Upper floor rooms', 'Attic, turret & roofs', 'The front garden', 'The backyard gazebo', 'The residents'][n] ?? `Bag ${n}`;
}
