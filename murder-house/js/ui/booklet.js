// Instruction booklet: a real book on a desk. Pages are generated from the build steps and laid out
// like a LEGO booklet (light-blue pages, big step numbers, parts callouts, bag openers, a "put the
// floor on" page after each floor module, the inventory at the back). Leaves turn in 3D: click a
// page, use the arrows/keys, or grab a page and drag it over. Step pictures are rendered in the
// background (visible pages first, then the ones ahead) so turning never waits.
import { COLORS } from '../core/colors.js';
import { CHARACTERS } from '../model/furniture.js';
import { thumb } from '../gfx/thumbs.js';

const PAGE_BG = 0xcfe4f4;
const PAGE_CSS = '#cfe4f4';
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const MODULE_NAME = { A: 'the garden & basement', B: 'the ground floor', C: 'the upper floor', D: 'the attic & roofs' };
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export class Booklet {
  constructor(app) {
    this.app = app;
    this.book = document.getElementById('book');
    this.desk = document.getElementById('desk');
    this.left = document.getElementById('pg-left');
    this.right = document.getElementById('pg-right');
    this.leaf = document.getElementById('leaf');
    this.front = document.getElementById('leaf-front');
    this.back = document.getElementById('leaf-back');
    this.cast = document.getElementById('cast');
    this.slider = document.getElementById('bk-page');
    this.jump = document.getElementById('bk-jump');
    this.count = document.getElementById('bk-count');
    this.cache = new Map();        // image key -> url
    this.jobs = new Map();         // image key -> snapshot options (waiting)
    this.order = [];               // queue of keys, most urgent first
    this.pages = this.paginate();
    this.pos = 0;                  // first page of the spread (two-page: even index)
    this.flipping = false;
    this.pendingFlips = 0;
    document.getElementById('bk-prev').addEventListener('click', () => this.turn(-1));
    document.getElementById('bk-next').addEventListener('click', () => this.turn(1));
    this.slider.addEventListener('input', () => this.show(+this.slider.value * this.per()));
    this.jump.addEventListener('change', () => this.show(+this.jump.value));
    window.addEventListener('keydown', (e) => {
      if (this.app.mode !== 'booklet' || e.target.closest('select, input')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { this.turn(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { this.turn(-1); e.preventDefault(); }
    });
    window.addEventListener('resize', () => { if (this.app.mode === 'booklet') { this.layout(); this.show(this.pos); } });
    this.initDrag();
    this.buildJump();
  }

  per() { return this.single ? 1 : 2; }

  enter() {
    this.active = true;
    this.layout();
    this.show(this.pos);
  }
  leave() { this.active = false; }

  // ------------------------------------------------ pages
  paginate() {
    const { steps, bom, sc } = this.app;
    const pages = [{ type: 'blank' }, { type: 'cover' }, { type: 'figs' }];
    let bag = 0;
    for (let k = 0; k < steps.length; k++) {
      const s = steps[k];
      if (s.bag !== bag) { bag = s.bag; pages.push({ type: 'bag', bag }); }
      const nxt = steps[k + 1];
      const small = (x) => x && x.parts.length <= 4 && x.lots.length <= 3;
      if (small(s) && small(nxt) && nxt.sec === s.sec && nxt.bag === s.bag) { pages.push({ type: 'step', steps: [s, nxt] }); k++; }
      else pages.push({ type: 'step', steps: [s] });
      // a floor module is finished: put it on the house
      const cur = pages[pages.length - 1].steps;
      const last = cur[cur.length - 1];
      const m = this.modOfStep(last);
      const after = steps[steps.indexOf(last) + 1];
      if (m !== 'A' && (!after || this.modOfStep(after) !== m)) pages.push({ type: 'stack', m, n: last.n });
    }
    const per = 48;
    for (let i = 0; i < bom.lots.length; i += per) pages.push({ type: 'inv', lots: bom.lots.slice(i, i + per), first: i === 0 });
    pages.push({ type: 'notes' });
    pages.push({ type: 'end' });
    pages.forEach((p, i) => (p.no = i));
    void sc;
    return pages;
  }

  modOfStep(s) { return this.app.mb.sections[s.sec].module ?? 'A'; }

  buildJump() {
    const opts = [];
    let lastSec = -1;
    this.pages.forEach((p, i) => {
      if (p.type === 'cover') opts.push([i, 'Cover']);
      if (p.type === 'figs') opts.push([i, 'The residents (minifigures)']);
      if (p.type === 'bag') opts.push([i, `Bag ${p.bag} · ${bagTitle(p.bag)}`]);
      if (p.type === 'step' && p.steps[0].sec !== lastSec) { lastSec = p.steps[0].sec; opts.push([i, `   Step ${p.steps[0].n} · ${p.steps[0].name}`]); }
      if (p.type === 'inv' && p.first) opts.push([i, 'Parts inventory']);
    });
    this.jump.innerHTML = opts.map(([i, t]) => `<option value="${i}">${t.replace(/ /g, '&nbsp;')}</option>`).join('');
  }

  pageOfStep(n) { return Math.max(0, this.pages.findIndex((p) => p.type === 'step' && p.steps.some((s) => s.n === n))); }

  // ------------------------------------------------ layout
  layout() {
    const r = this.desk.getBoundingClientRect();
    const W = r.width - 24, H = r.height - 16;
    this.single = window.innerWidth < 820;
    const aspect = 0.77;          // page width / height
    let pw, ph;
    if (this.single) { pw = Math.min(W * 0.96, H * aspect); ph = pw / aspect; }
    else { pw = Math.min(W / 2, H * aspect); ph = pw / aspect; }
    pw = Math.floor(pw); ph = Math.floor(ph);
    this.pw = pw; this.ph = ph;
    this.book.classList.toggle('single', this.single);
    this.book.style.setProperty('--bw', (this.single ? pw : pw * 2) + 'px');
    this.book.style.setProperty('--bh', ph + 'px');
    this.book.style.setProperty('--pw', pw + 'px');
  }

  clampPos(pos) {
    pos = Math.max(0, Math.min(this.pages.length - 1, pos));
    if (!this.single) pos -= pos % 2;
    else if (pos === 0) pos = 1;
    return pos;
  }

  show(pos) {
    if (this.flipping) return;
    this.pos = this.clampPos(pos);
    this.left.innerHTML = ''; this.right.innerHTML = '';
    if (this.single) this.right.appendChild(this.renderPage(this.pos, 'right'));
    else {
      this.left.appendChild(this.renderPage(this.pos, 'left'));
      this.right.appendChild(this.renderPage(this.pos + 1, 'right'));
    }
    this.leaf.hidden = true;
    this.syncBar();
    this.prefetch();
  }

  syncBar() {
    const per = this.per(), n = this.pages.length;
    this.slider.max = String(Math.ceil(n / per) - 1);
    this.slider.value = String(Math.floor(this.pos / per));
    const a = this.pos, b = Math.min(n - 1, this.pos + per - 1);
    this.count.textContent = a <= 1 && b <= 1 ? `cover · ${n - 1} pages` : per === 1 ? `page ${a} of ${n - 1}` : `pages ${a}–${b} of ${n - 1}`;
    let sel = 0;
    for (const o of this.jump.options) if (+o.value <= this.pos + per - 1) sel = o.index;
    this.jump.selectedIndex = sel;
  }

  // ------------------------------------------------ turning pages
  turn(dir, ms = 640) {
    if (this.flipping) { this.pendingFlips += dir; return; }
    const per = this.per();
    const to = this.clampPos(this.pos + dir * per);
    if (to === this.pos) return;
    this.flip(dir, 0, ms);
  }

  setupFlip(dir) {
    const per = this.per();
    const p = this.pos;
    this.flipping = true;
    this.flipDir = dir;
    this.leaf.className = 'leaf ' + (this.single ? 'fwd' : dir > 0 ? 'fwd' : 'back');
    this.front.innerHTML = ''; this.back.innerHTML = '';
    if (this.single) {
      if (dir > 0) {
        this.front.appendChild(this.renderPage(p, 'right'));
        this.right.innerHTML = ''; this.right.appendChild(this.renderPage(p + 1, 'right'));
      } else {
        this.front.appendChild(this.renderPage(p - 1, 'right'));
      }
      this.back.appendChild(Object.assign(document.createElement('div'), { className: 'pg left' }));
    } else if (dir > 0) {
      this.front.appendChild(this.renderPage(p + 1, 'right'));
      this.back.appendChild(this.renderPage(p + 2, 'left'));
      this.right.innerHTML = ''; this.right.appendChild(this.renderPage(p + 3, 'right'));
    } else {
      this.front.appendChild(this.renderPage(p, 'left'));
      this.back.appendChild(this.renderPage(p - 1, 'right'));
      this.left.innerHTML = ''; this.left.appendChild(this.renderPage(p - 2, 'left'));
    }
    this.leaf.hidden = false;
    void per;
  }

  // angle in degrees 0..180 of the turning leaf
  setAngle(a) {
    this.angle = a;
    const rad = (a * Math.PI) / 180;
    const lift = Math.sin(rad);
    if (this.single) {
      const aa = this.flipDir > 0 ? a : 180 - a;
      this.leaf.style.transform = `rotateY(${-aa}deg) translateZ(${lift * 2}px)`;
      this.leaf.style.opacity = String(Math.min(1, Math.max(0, (180 - aa) / 70)));
      this.front.style.setProperty('--shade', (Math.sin((aa * Math.PI) / 180) * 0.8).toFixed(3));
      this.cast.style.opacity = '0';
      return;
    }
    const sgn = this.flipDir > 0 ? -1 : 1;
    this.leaf.style.transform = `rotateY(${sgn * a}deg) translateZ(${lift * 2}px)`;
    this.front.style.setProperty('--shade', (lift * (a < 90 ? 0.85 : 0.2)).toFixed(3));
    this.back.style.setProperty('--shade', (lift * (a > 90 ? 0.85 : 0.2)).toFixed(3));
    // shadow the leaf casts on the page it is uncovering / about to cover
    const onRight = (this.flipDir > 0) === (a < 90);
    this.cast.style.left = onRight ? '50%' : '0';
    this.cast.style.background = onRight
      ? `linear-gradient(90deg, rgba(0,20,40,${0.45 * lift}), rgba(0,20,40,0) ${20 + 60 * Math.abs(Math.cos(rad))}%)`
      : `linear-gradient(270deg, rgba(0,20,40,${0.45 * lift}), rgba(0,20,40,0) ${20 + 60 * Math.abs(Math.cos(rad))}%)`;
    this.cast.style.opacity = '1';
  }

  flip(dir, from, ms, done) {
    if (!this.flipping) this.setupFlip(dir);
    const st = performance.now();
    const run = () => {
      const u = Math.min(1, (performance.now() - st) / ms);
      this.setAngle(from + (180 - from) * ease(u));
      if (u < 1) { this._raf = requestAnimationFrame(run); return; }
      this.finishFlip(true);
      done?.();
    };
    this.app.sound && this.app.radio?.synth?.page?.();
    run();
  }

  unflip(from, ms) {
    const st = performance.now();
    const run = () => {
      const u = Math.min(1, (performance.now() - st) / ms);
      this.setAngle(from * (1 - ease(u)));
      if (u < 1) { this._raf = requestAnimationFrame(run); return; }
      this.finishFlip(false);
    };
    run();
  }

  finishFlip(completed) {
    const dir = this.flipDir;
    this.flipping = false;
    this.leaf.hidden = true;
    this.leaf.style.transform = '';
    this.cast.style.opacity = '0';
    if (completed) this.pos = this.clampPos(this.pos + dir * this.per());
    this.show(this.pos);
    if (this.pendingFlips) {
      const d = Math.sign(this.pendingFlips);
      this.pendingFlips -= d;
      this.turn(d, 380);
    }
  }

  initDrag() {
    let start = null;
    this.book.addEventListener('pointerdown', (e) => {
      if (this.flipping || e.button !== 0 || e.target.closest('button, a, select, input')) return;
      const r = this.book.getBoundingClientRect();
      const side = this.single ? (e.clientX - r.left > r.width * 0.35 ? 1 : -1) : (e.clientX > r.left + r.width / 2 ? 1 : -1);
      start = { x: e.clientX, y: e.clientY, t: performance.now(), side, dragging: false, r, id: e.pointerId, lastX: e.clientX, lastT: performance.now(), v: 0 };
    });
    window.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      if (!start.dragging) {
        if (Math.abs(dx) < 8) return;
        const dir = dx < 0 ? 1 : -1;
        if (dir !== start.side || this.clampPos(this.pos + dir * this.per()) === this.pos) { start = null; return; }
        start.dragging = true;
        start.dir = dir;
        this.setupFlip(dir);
      }
      const span = this.single ? start.r.width * 0.9 : start.r.width * 0.75;
      const t = Math.max(0, Math.min(1, (start.dir > 0 ? -dx : dx) / span));
      this.setAngle(t * 180);
      const now = performance.now();
      start.v = (e.clientX - start.lastX) / Math.max(1, now - start.lastT);
      start.lastX = e.clientX; start.lastT = now;
    });
    const end = (e) => {
      if (!start || e.pointerId !== start.id) return;
      const s = start;
      start = null;
      if (!s.dragging) {
        // a click: turn towards the side that was clicked
        if (performance.now() - s.t < 400) this.turn(s.side);
        return;
      }
      const flick = s.dir > 0 ? s.v < -0.45 : s.v > 0.45;
      const back = s.dir > 0 ? s.v > 0.3 : s.v < -0.3;
      if ((this.angle > 90 || flick) && !back) this.flip(s.dir, this.angle, 180 + (180 - this.angle) * 2.2);
      else this.unflip(this.angle, 160 + this.angle * 2);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  // ------------------------------------------------ page renderers
  renderPage(i, side) {
    const p = this.pages[i];
    const el = document.createElement('article');
    el.className = `pg ${side}`;
    if (!p) { el.style.background = 'transparent'; el.classList.add('none'); return el; }
    const pno = `<span class="pno">${p.no}</span>`;
    const edge = '<i class="pg-edge"></i>';
    switch (p.type) {
      case 'blank': el.style.background = 'transparent'; el.classList.add('none'); return el;
      case 'cover': this.cover(el); break;
      case 'figs': el.innerHTML = this.figsHTML() + pno; break;
      case 'bag': el.innerHTML = this.bagHTML(p) + pno; break;
      case 'step': this.stepPage(el, p); el.insertAdjacentHTML('beforeend', pno); break;
      case 'stack': el.innerHTML = this.stackHTML(p) + pno; break;
      case 'inv': el.innerHTML = this.invHTML(p) + pno; break;
      case 'notes': el.innerHTML = this.notesHTML() + pno; break;
      case 'end': this.endPage(el); el.insertAdjacentHTML('beforeend', pno); break;
    }
    el.insertAdjacentHTML('afterbegin', edge);
    el.querySelectorAll('[data-open3d]').forEach((b) => b.addEventListener('click', () => this.app.openStepIn3D(+b.dataset.open3d)));
    el.querySelectorAll('[data-build]').forEach((b) => b.addEventListener('click', () => this.app.buildFromStep(+b.dataset.build)));
    return el;
  }

  img(key, opts, alt = '') {
    const url = this.request(key, opts);
    return `<img alt="${alt}" data-key="${key}" src="${url ?? BLANK}"${url ? '' : ' class="pending"'}>${url ? '' : '<span class="skeleton"></span>'}`;
  }

  cover(el) {
    const { bom, mb, sc } = this.app;
    el.classList.add('cover');
    const all = mb.parts.map((_, i) => i);
    el.innerHTML = `<div class="cover-top"><span class="age">18+</span><span class="setno">1120</span></div>
      <h2>The Murder House</h2>
      <p class="sub">1120 Westchester Place · Los Angeles · a modular house in real LEGO® parts</p>
      <div class="step-img">${this.img('cover', { show: () => true, view: 'hero', box: sc.boxOf(all), bg: null, pad: 0.86, w: 1000, h: 1000 }, 'The finished Murder House')}</div>
      <p class="pcs">${bom.pieces.toLocaleString('en')} <span>pieces</span> 4 <span>floor modules</span> 9 <span>minifigures</span></p>`;
  }

  figsHTML() {
    const figs = Object.entries(CHARACTERS).map(([k, c]) => `<div class="fig"><img alt="${c.name}" src="${thumb('fig', 'black', 160, k)}"><b>${c.name}</b>${c.note}</div>`).join('');
    return `<h3>The residents</h3><p class="note">Nine minifigures from plain parts: legs, torso, a printed head and hair. Build them first; they move in at the very end.</p><div class="figs">${figs}</div>`;
  }

  // what a step picture shows: the floor module being built on its own (like a real modular),
  // the whole house once the garden is finished around it
  showFor(n, m, bag) {
    const { stepOf, sc } = this.app;
    const alone = m !== 'A' || bag <= 2;
    return alone ? (i) => stepOf[i] <= n && sc.moduleOf[i] === m : (i) => stepOf[i] <= n;
  }

  secBox(s) {
    const { mb, sc } = this.app;
    if (this._boxes?.has(s.sec)) return this._boxes.get(s.sec);
    const own = [];
    for (let i = 0; i < mb.parts.length; i++) if (mb.parts[i].sec === s.sec && !mb.parts[i].loose) own.push(i);
    const box = sc.boxOf(own);
    // never zoom in closer than a 14 x 14 stud patch, and keep some of the surroundings
    const c = box.getCenter(box.min.clone()), size = box.getSize(box.max.clone());
    const half = { x: Math.max(size.x * 0.62, 7), y: Math.max(size.y * 0.6, 2.5), z: Math.max(size.z * 0.62, 7) };
    box.min.set(c.x - half.x, Math.max(0, c.y - half.y), c.z - half.z);
    box.max.set(c.x + half.x, c.y + half.y, c.z + half.z);
    (this._boxes ??= new Map()).set(s.sec, box);
    return box;
  }

  stepPage(el, p) {
    const two = p.steps.length > 1;
    el.innerHTML = p.steps.map((s) => this.stepBlock(s, two)).join('') + `<span class="pfoot">${p.steps[0].name}</span>`;
  }

  stepBlock(s, two) {
    const lots = s.lots.map((L) => `<span class="it"><img alt="" src="${thumb(L.fig ? 'fig' : L.id, L.c, 96, L.fig)}">${L.n}x</span>`).join('');
    const m = this.modOfStep(s);
    const newSet = new Set(s.parts);
    const img = this.img('step' + s.n, {
      show: this.showFor(s.n, m, s.bag), view: s.view, box: this.secBox(s),
      fade: { test: (i) => !newSet.has(i), amount: 0.2, color: PAGE_BG }, pad: 1.02, w: two ? 1100 : 1000, h: two ? 520 : 1000, bg: null,
    }, `Step ${s.n}`);
    return `<div class="step">
      <div class="step-head"><span class="step-no">${s.n}</span><div class="callout">${lots}</div></div>
      <div class="step-img">${img}
        <div class="step-acts"><button data-open3d="${s.n}" title="Look at this step in 3D"><svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5"/></svg>3D</button><button data-build="${s.n}" title="Place these parts yourself"><svg viewBox="0 0 24 24"><path d="M7 11V6a2 2 0 014 0v5 M11 10V5a2 2 0 014 0v5 M15 10V7a2 2 0 014 0v7a7 7 0 01-7 7h-1a7 7 0 01-6-3.5L3.5 14a1.8 1.8 0 013-2L8 14"/></svg>Build</button></div>
      </div></div>`;
  }

  bagHTML(p) {
    const { steps, mb, sc, stepOf } = this.app;
    const inBag = steps.filter((s) => s.bag === p.bag);
    const secs = [...new Set(inBag.map((s) => s.name))];
    const last = inBag[inBag.length - 1].n;
    const bagParts = new Set(inBag.flatMap((s) => s.parts));
    const pieces = inBag.reduce((a, s) => a + s.parts.reduce((b, i) => b + (mb.parts[i].figParts ? mb.parts[i].figParts.length : 1), 0), 0);
    const m = this.modOfStep(inBag[0]);
    const show = this.showFor(last, m, p.bag);
    const list = mb.parts.map((_, i) => i).filter(show);
    const img = this.img('bag' + p.bag, {
      show, view: inBag[0].view === 'back' ? 'back' : 'hero', box: sc.boxOf(list),
      fade: { test: (i) => !bagParts.has(i), amount: 0.55, color: PAGE_BG }, w: 1000, h: 760, pad: 1.0, bg: null,
    }, `What bag ${p.bag} builds`);
    void stepOf;
    return `<div class="bag">${bagArt(p.bag)}
      <h3>${bagTitle(p.bag)}</h3>
      <p class="note">${secs.slice(0, 5).join(' · ')}${secs.length > 5 ? ' …' : ''}<br>${pieces} pieces · steps ${inBag[0].n}–${last}</p>
      <div class="step-img">${img}</div></div>`;
  }

  stackHTML(p) {
    const { mb, sc, stepOf } = this.app;
    const show = (i) => stepOf[i] <= p.n;
    const list = mb.parts.map((_, i) => i).filter(show);
    const img = this.img('stack' + p.m, {
      show, view: 'hero', box: sc.boxOf(list), lift: { [p.m]: 16 },
      fade: { test: (i) => sc.moduleOf[i] !== p.m, amount: 0.35, color: PAGE_BG }, w: 1000, h: 1000, pad: 1.0, bg: null,
    }, `Put ${MODULE_NAME[p.m]} on the house`);
    const name = MODULE_NAME[p.m];
    return `<h3>Put ${name} on</h3>
      <p class="note">Set ${name} straight down onto the floor below. It only rests on the little locator studs left on the wall tops, so it lifts off again whenever you want to play inside.</p>
      <div class="step-img">${img}<svg class="stack-arrow" viewBox="0 0 60 90" style="position:absolute;top:4%;left:50%;width:8%;transform:translateX(-50%)"><path d="M30 4v70 M12 56l18 22 18-22" fill="none" stroke="#102033" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/></svg></div>`;
  }

  invHTML(p) {
    const items = p.lots.map((L) => `<div class="it" title="${L.qty}x ${L.officialName} (${COLORS[L.c].name})"><img alt="" src="${thumb(L.id, L.c, 72)}">${L.qty}x<span>${L.bl}</span></div>`).join('');
    return `${p.first ? '<h3>Parts inventory</h3>' : ''}<div class="inv">${items}</div>`;
  }

  notesHTML() {
    return `<h3>How this set works</h3>
      <p class="note">Like the big LEGO modular buildings, the house comes apart in four floors. Each floor is built on its own layer of plates; the wall tops below are finished with smooth tiles and a few 1x1 plates act as locators, so a floor sits firmly but lifts straight off.</p>
      <p class="note">Every part is a standard LEGO element in a colour that was really produced. Common colours (Reddish Brown, Tan, Dark Bluish Gray, Black) keep the price down.</p>
      <p class="note">Shopping lists for BrickLink and Rebrickable are on the "Parts &amp; buying" tab.</p>`;
  }

  endPage(el) {
    const { mb, sc } = this.app;
    const all = mb.parts.map((_, i) => i);
    el.classList.add('cover');
    el.innerHTML = `<h2>Welcome home.</h2><p class="sub">"Normal people scare me." Now switch the 3D house to night.</p>
      <div class="step-img">${this.img('night', { show: () => true, view: 'hero', box: sc.boxOf(all), bg: 0x0b0f1f, night: true, pad: 0.9, w: 1000, h: 1000 }, 'The Murder House at night')}</div>`;
  }

  // ------------------------------------------------ background rendering of step pictures
  request(key, opts) {
    if (this.cache.has(key)) return this.cache.get(key);
    if (!this.jobs.has(key)) { this.jobs.set(key, opts); this.order.push(key); }
    this.pump();
    return null;
  }

  // visible pages first: move their keys to the front
  prioritize(keys) {
    for (const k of keys.reverse()) { const i = this.order.indexOf(k); if (i > 0) { this.order.splice(i, 1); this.order.unshift(k); } }
  }

  prefetch() {
    const visible = [...this.book.querySelectorAll('img.pending[data-key]')].map((e) => e.dataset.key);
    this.prioritize(visible);
    // render the next two spreads and the previous one ahead of time
    const per = this.per();
    for (const off of [per, per * 2, -per, per * 3]) {
      const i0 = this.pos + off;
      for (let k = 0; k < per; k++) { const pg = this.pages[i0 + k]; if (pg) this.renderPage(i0 + k, 'right'); }
    }
  }

  pump() {
    if (this._pumping) return;
    this._pumping = true;
    const tick = () => {
      if (!this.order.length || !this.active) { this._pumping = false; return; }
      if (this.flipping) { setTimeout(tick, 120); return; }
      const key = this.order.shift();
      const opts = this.jobs.get(key);
      this.jobs.delete(key);
      const url = this.snap(opts);
      this.cache.set(key, url);
      document.querySelectorAll(`img[data-key="${key}"]`).forEach((im) => {
        im.src = url; im.classList.remove('pending');
        im.parentElement.querySelector('.skeleton')?.remove();
      });
      setTimeout(tick, 16);
    };
    setTimeout(tick, 30);
  }

  snap(opts) {
    const sc = this.app.sc;
    const saved = { ...sc.moduleLift };
    if (opts.lift) Object.assign(sc.moduleLift, opts.lift);
    let url;
    try { url = sc.snapshot({ ...opts, jpeg: opts.bg !== null }); } finally { Object.assign(sc.moduleLift, saved); }
    return url;
  }
}

function bagTitle(n) {
  return ['', 'Base, basement walls & porch', 'Dr. Montgomery\'s laboratory', 'Ground floor', 'Ground floor rooms', 'Upper floor',
    'Upper floor rooms', 'Attic & turret', 'The roofs', 'The front garden', 'The backyard', 'The residents'][n] ?? `Bag ${n}`;
}

function bagArt(n) {
  return `<svg class="bagart" viewBox="0 0 120 150" aria-hidden="true">
    <path d="M14 18h92l6 118c0 6-4 10-10 10H18c-6 0-10-4-10-10z" fill="#fff" stroke="#9fb7c8" stroke-width="2"/>
    <path d="M14 18h92v10H14z" fill="#e3edf4"/>
    <path d="M20 23h80" stroke="#9fb7c8" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="M22 40c20 6 56 6 76 0" fill="none" stroke="#e9f1f7" stroke-width="6" stroke-linecap="round"/>
    <text x="60" y="112" text-anchor="middle" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="62" fill="${PAGE_CSS === '#cfe4f4' ? '#102033' : '#000'}">${n}</text>
  </svg>`;
}
