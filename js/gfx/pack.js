/* The Lore Crate opening: "HOLD TO OPEN". A faithful homage to the pixel card-reveal clip:
 * brick wall + torches, locked card with a breathing ring, hold to charge (shake, cracks, lightning),
 * burst (flash, shockwave, bricks exploding and piling on the floor), rarity title slam, card flip,
 * NEW!/xN badge, coins raining, DRAW ANOTHER. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const Pack = (G.Pack = { active: false });

  let cv, cx, buf, bx, W = 640, H = 360, SC = 3;
  let state = 'off', st = 0; // state + time in state
  let packType = 'basic';
  let charge = 0, holding = false, rolled = null;
  let bricks = [], debris = [], sparks = [], coins = [], cracks = [], lines = [];
  let shake = 0, flash = 0, flashCol = '#ffffff', wave = 0;
  let cardFace = null, cardBack = null;
  let raf = 0, last = 0;
  let onClose = null;
  let buttons = [];
  let hoverBtn = -1;
  let queueAll = false;
  const RC = () => (rolled ? rolled.rarity : null);

  const COL = {
    brickA: '#241d57', brickB: '#2d2468', brickC: '#3b3183', brickHi: '#8f86d8', mortar: '#120e2e',
    floor: '#0c0a22', torch: '#ffb938', gold: '#f5b642', navy: '#15123a',
  };

  /* ------------------------------------------------------------------ setup */
  Pack.init = () => {
    cv = document.getElementById('packCanvas');
    cx = cv.getContext('2d');
    buf = document.createElement('canvas');
    bx = buf.getContext('2d');
    resize();
    window.addEventListener('resize', () => { if (Pack.active) resize(); });
    const down = (e) => {
      if (!Pack.active) return;
      e.preventDefault();
      const p = local(e);
      const b = hitButton(p);
      if (b) { b.fn(); return; }
      if (state === 'idle' || state === 'charge') {
        holding = true;
        if (state === 'idle') { state = 'charge'; st = 0; G.Audio.chargeStart(); }
      }
    };
    const up = () => { holding = false; };
    cv.addEventListener('mousedown', down);
    cv.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    cv.addEventListener('mousemove', (e) => {
      const p = local(e);
      const idx = buttons.findIndex((b) => inside(p, b));
      if (idx !== hoverBtn) { hoverBtn = idx; if (idx >= 0) G.Audio.hover(); }
      cv.style.cursor = idx >= 0 ? 'pointer' : state === 'idle' || state === 'charge' ? 'grab' : 'default';
    });
    window.addEventListener('keydown', (e) => {
      if (!Pack.active) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'idle' || state === 'charge') {
          holding = true;
          if (state === 'idle') { state = 'charge'; st = 0; G.Audio.chargeStart(); }
        } else if (state === 'reveal' && st > 0.8) drawAnother();
      }
      if (e.code === 'Enter' && state === 'reveal') drawAnother();
      if (e.code === 'Escape') Pack.close();
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') holding = false; });
  };
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    SC = Math.max(2, Math.floor(h / 330));
    W = Math.ceil(w / SC);
    H = Math.ceil(h / SC);
    cv.width = W * SC;
    cv.height = H * SC;
    buf.width = W;
    buf.height = H;
    cx.imageSmoothingEnabled = false;
    bx.imageSmoothingEnabled = false;
    buildWall();
  }
  function local(e) {
    const t = e.touches ? e.touches[0] : e;
    const r = cv.getBoundingClientRect();
    return { x: ((t.clientX - r.left) / r.width) * W, y: ((t.clientY - r.top) / r.height) * H };
  }
  const inside = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  function hitButton(p) { return buttons.find((b) => inside(p, b)); }

  /* ------------------------------------------------------------------ wall */
  const BW = 16, BH = 8;
  function floorY() { return Math.round(H * 0.7); }
  function buildWall() {
    bricks = [];
    const fy = floorY();
    for (let y = 0, row = 0; y < fy; y += BH, row++) {
      const off = row % 2 ? -BW / 2 : 0;
      for (let x = off; x < W; x += BW) {
        const r = Math.random();
        bricks.push({ x, y, hx: x, hy: y, c: r < 0.08 ? COL.brickC : r < 0.5 ? COL.brickB : COL.brickA, alive: true, drop: 0 });
      }
    }
  }
  function cardRect() {
    const w = 84, h = 116;
    return { x: Math.round(W / 2 - w / 2), y: Math.round(H * 0.4 - h / 2), w, h };
  }

  /* ------------------------------------------------------------------ public */
  Pack.open = (type, cb) => {
    if (!G.S.packs[type]) {
      const any = ['legendary', 'epic', 'premium', 'basic'].find((k) => G.S.packs[k] > 0);
      if (!any) return false;
      type = any;
    }
    packType = type;
    onClose = cb || null;
    Pack.active = true;
    document.getElementById('packOverlay').classList.add('show');
    resize();
    begin();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    G.bus.emit('pack:open');
    return true;
  };
  Pack.close = () => {
    if (!Pack.active) return;
    if (state === 'burst') return;
    G.Audio.chargeStop();
    Pack.active = false;
    document.getElementById('packOverlay').classList.remove('show');
    cancelAnimationFrame(raf);
    G.bus.emit('pack:close');
    if (onClose) onClose();
  };
  /** open everything without animation */
  Pack.openAllInstant = () => {
    const results = [];
    for (const k of ['legendary', 'epic', 'premium', 'basic']) while (G.S.packs[k] > 0) results.push(G.Sim.openPack(k));
    return results;
  };

  function begin() {
    state = 'enter';
    st = 0;
    charge = 0;
    holding = false;
    rolled = null;
    debris = [];
    sparks = [];
    coins = [];
    cracks = [];
    lines = [];
    shake = 0;
    flash = 0;
    wave = 0;
    cardFace = null;
    cardBack = makeBack();
    for (const b of bricks) { b.alive = true; b.drop = -(Math.random() * 0.25 + (b.hy / H) * 0.35); b.x = b.hx; b.y = b.hy; }
  }
  function drawAnother() {
    if (state !== 'reveal') return;
    const any = G.S.packs[packType] > 0 ? packType : ['legendary', 'epic', 'premium', 'basic'].find((k) => G.S.packs[k] > 0);
    if (!any) { Pack.close(); return; }
    packType = any;
    G.Audio.whoosh();
    begin();
  }

  /* ------------------------------------------------------------------ card faces */
  function makeBack() {
    const c = document.createElement('canvas');
    c.width = 84; c.height = 116;
    const x = c.getContext('2d');
    const P = G.PACKS[packType];
    const gold = packType === 'basic' ? COL.gold : P.color;
    x.fillStyle = '#0b0a1a'; x.fillRect(0, 0, 84, 116);
    x.fillStyle = gold; x.fillRect(2, 2, 80, 112);
    x.fillStyle = '#0b0a1a'; x.fillRect(4, 4, 76, 108);
    x.fillStyle = COL.navy; x.fillRect(6, 6, 72, 104);
    x.fillStyle = shade(gold, -0.3); x.fillRect(6, 6, 72, 2); x.fillRect(6, 108, 72, 2);
    // dotted diagonals
    x.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 72; i += 3) {
      x.fillRect(6 + i, 6 + i * (104 / 72), 1, 1);
      x.fillRect(78 - i, 6 + i * (104 / 72), 1, 1);
    }
    // diamond
    const cxp = 42, cyp = 58;
    for (let r = 20; r >= 0; r--) {
      x.fillStyle = r > 18 ? gold : r > 16 ? '#0b0a1a' : '#241d57';
      for (let k = -r; k <= r; k++) {
        const w = r - Math.abs(k);
        x.fillRect(cxp - w, cyp + k, w * 2 + 1, 1);
      }
      if (r === 16) break;
    }
    x.fillStyle = '#241d57';
    for (let k = -15; k <= 15; k++) { const w = 15 - Math.abs(k); x.fillRect(cxp - w, cyp + k, w * 2 + 1, 1); }
    // lock
    const lock = G.Sprites.render('lock', 1);
    x.drawImage(lock, cxp - 8, cyp - 8);
    // sparkles
    x.fillStyle = gold;
    for (const [sx, sy] of [[42, 20], [42, 96], [20, 58], [64, 58]]) { x.fillRect(sx, sy - 2, 1, 5); x.fillRect(sx - 2, sy, 5, 1); }
    // corner rivets
    x.fillStyle = shade(gold, 0.3);
    for (const [sx, sy] of [[6, 6], [76, 6], [6, 108], [76, 108]]) x.fillRect(sx, sy, 2, 2);
    return c;
  }
  function makeFace(res) {
    const c = document.createElement('canvas');
    c.width = 84; c.height = 116;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const rc = res.rarity.color;
    const card = res.card;
    x.fillStyle = '#0b0a1a'; x.fillRect(0, 0, 84, 116);
    x.fillStyle = rc; x.fillRect(2, 2, 80, 112);
    x.fillStyle = shade(rc, 0.4); x.fillRect(2, 2, 80, 2);
    x.fillStyle = '#0b0a1a'; x.fillRect(4, 4, 76, 108);
    // art panel with stars
    x.fillStyle = '#0f0c2e'; x.fillRect(6, 6, 72, 56);
    const rng = U.seeded(card.id);
    for (let i = 0; i < 30; i++) { x.fillStyle = rng() < 0.3 ? '#ffffff' : '#5a54a8'; x.fillRect(6 + rng() * 72, 6 + rng() * 56, 1, 1); }
    x.fillStyle = shade(rc, -0.5); x.fillRect(6, 60, 72, 2);
    const art = G.Sprites.cardArt(card, 48);
    if (art) x.drawImage(art, 42 - art.width / 2, 34 - art.height / 2);
    // name
    x.fillStyle = '#1a1640'; x.fillRect(6, 64, 72, 13);
    x.font = '8px Silkscreen, monospace';
    x.textAlign = 'center'; x.textBaseline = 'top';
    const name = card.name.toUpperCase();
    let size = 8;
    x.font = `${size}px Silkscreen, monospace`;
    while (x.measureText(name).width > 70 && size > 5) { size--; x.font = `${size}px Silkscreen, monospace`; }
    x.fillStyle = '#ffffff';
    x.fillText(name, 42, 66 + (8 - size) / 2);
    // stats
    const labels = ['SCL', 'VIB', 'SAF'];
    x.font = '8px Silkscreen, monospace';
    x.textAlign = 'left';
    labels.forEach((l, i) => {
      const yy = 80 + i * 9;
      x.fillStyle = '#9aa0b8';
      x.fillText(l, 8, yy);
      for (let k = 0; k < 5; k++) {
        x.fillStyle = k < card.stats[i] ? (i === 0 ? '#ff9b3d' : i === 1 ? '#ff5cc8' : '#4dffd2') : '#2a2650';
        x.fillRect(30 + k * 9, yy + 1, 7, 5);
      }
    });
    // footer pips
    x.fillStyle = rc;
    for (let k = 0; k <= res.rarity.idx; k++) x.fillRect(36 + k * 4 - res.rarity.idx * 2, 108, 2, 2);
    return c;
  }
  function shade(hex, amt) { return G.Sprites.shade(hex, amt); }

  /* ------------------------------------------------------------------ loop */
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    if (Pack.active) raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    st += dt;
    shake = Math.max(0, shake - dt * 3);
    flash = Math.max(0, flash - dt * 2.5);
    if (state === 'enter') {
      if (st > 0.7) { state = 'idle'; st = 0; }
    } else if (state === 'charge') {
      if (holding) charge = Math.min(1, charge + dt / 1.15);
      else charge = Math.max(0, charge - dt * 1.6);
      G.Audio.chargeSet(charge);
      if (charge > 0.45 && !rolled) {
        rolled = G.Sim.openPack(packType);
        if (!rolled) { Pack.close(); return; }
      }
      // cracks accumulate
      if (charge > 0.25 && Math.random() < charge * 0.5) addCrack();
      // inward streaks
      if (Math.random() < charge * 0.9) {
        const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 80;
        const c = cardRect();
        lines.push({ x: c.x + c.w / 2 + Math.cos(a) * r, y: c.y + c.h / 2 + Math.sin(a) * r, a, life: 0.35, inward: true });
      }
      if (charge <= 0 && !holding) { state = 'idle'; st = 0; G.Audio.chargeStop(); cracks = []; }
      if (charge >= 1) burst();
    } else if (state === 'burst') {
      if (st > 0.55 && !cardFace) cardFace = makeFace(rolled);
      if (st > 1.0) {
        state = 'reveal';
        st = 0;
        G.Audio.reveal(rolled.rarity.idx);
        for (let i = 0; i < 10 + rolled.rarity.idx * 12; i++) spawnCoin();
      }
    } else if (state === 'reveal') {
      if (Math.random() < 0.02 + (rolled ? rolled.rarity.idx * 0.03 : 0)) spawnCoin();
      if (rolled && rolled.rarity.idx >= 2 && Math.random() < 0.3) spawnSpark(true);
    }
    // bricks falling in on enter
    for (const b of bricks) if (b.drop < 0) b.drop = Math.min(0, b.drop + dt);
    // physics
    const fy = floorY();
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.vy += 420 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      const ground = fy + 4 + d.pile;
      if (d.y > ground) {
        d.y = ground;
        d.vy *= -0.25;
        d.vx *= 0.6;
        d.vr *= 0.5;
        if (Math.abs(d.vy) < 20) { d.vy = 0; d.rest = true; }
      }
      if (d.x < -40 || d.x > W + 40) debris.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.vy += (s.g || 0) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.vy += 380 * dt;
      c.y += c.vy * dt;
      c.x += c.vx * dt;
      c.spin += dt * 10;
      if (c.y > fy + 12 && c.vy > 0) {
        c.y = fy + 12;
        c.vy *= -0.45;
        c.vx *= 0.8;
        if (!c.bounced) { c.bounced = true; if (Math.random() < 0.3) G.Audio.coin(i); }
        if (Math.abs(c.vy) < 30) c.life -= dt * 2;
      }
      c.life -= dt * 0.15;
      if (c.life <= 0) coins.splice(i, 1);
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      l.life -= dt;
      if (l.life <= 0) lines.splice(i, 1);
    }
    if (wave > 0) wave += dt * 420;
    if (wave > W) wave = 0;
    // buttons for reveal
    buttons = [];
    if (state === 'reveal' && st > 0.4) {
      const more = Object.values(G.S.packs).reduce((a, b) => a + b, 0);
      const bw = 92, bh = 16, by = Math.round(H * 0.86);
      if (more > 0) {
        buttons.push({ x: Math.round(W / 2 - bw - 4), y: by, w: bw, h: bh, label: 'DRAW ANOTHER', primary: true, fn: drawAnother });
        buttons.push({ x: Math.round(W / 2 + 4), y: by, w: bw, h: bh, label: 'DONE', fn: Pack.close });
      } else {
        buttons.push({ x: Math.round(W / 2 - bw / 2), y: by, w: bw, h: bh, label: 'COLLECT', primary: true, fn: Pack.close });
      }
    }
    if (state === 'idle' || state === 'enter' || state === 'charge') {
      buttons.push({ x: W - 44, y: 6, w: 38, h: 12, label: 'CLOSE', fn: Pack.close });
    }
  }

  function addCrack() {
    const c = cardRect();
    const cxp = c.x + c.w / 2, cyp = c.y + c.h / 2;
    let x = cxp + U.rand(-6, 6), y = cyp + U.rand(-6, 6);
    const a0 = Math.random() * Math.PI * 2;
    const pts = [[x, y]];
    const len = 4 + Math.floor(charge * 7);
    let a = a0;
    for (let i = 0; i < len; i++) {
      a += U.rand(-0.8, 0.8);
      x += Math.cos(a) * U.rand(3, 7);
      y += Math.sin(a) * U.rand(3, 7);
      pts.push([x, y]);
    }
    cracks.push({ pts, life: 0.25 + Math.random() * 0.3 });
    if (cracks.length > 24) cracks.shift();
    if (Math.random() < 0.3) G.Audio.crack();
  }

  function burst() {
    state = 'burst';
    st = 0;
    G.Audio.chargeStop();
    const r = rolled.rarity;
    G.Audio.boom(r.idx);
    shake = 1 + r.idx * 0.4;
    flash = 0.85;
    flashCol = r.idx >= 1 ? r.glow : '#ffffff';
    wave = 1;
    const c = cardRect();
    const cxp = c.x + c.w / 2, cyp = c.y + c.h / 2;
    // bricks near the center explode into debris
    const radius = 44 + r.idx * 20;
    const fy = floorY();
    const piles = {};
    for (const b of bricks) {
      const bxc = b.hx + BW / 2, byc = b.hy + BH / 2;
      const d = Math.hypot(bxc - cxp, (byc - cyp) * 1.3);
      if (d < radius + Math.random() * 30) {
        b.alive = false;
        const a = Math.atan2(byc - cyp, bxc - cxp);
        const sp = 90 + Math.random() * 220 * (1 - d / (radius + 40));
        const col = r.idx >= 2 && Math.random() < 0.6 ? tint(b.c, r.color) : b.c;
        const col_key = Math.round((bxc + Math.cos(a) * 120) / 10);
        piles[col_key] = (piles[col_key] || 0) + 1;
        debris.push({ x: bxc, y: byc, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, rot: 0, vr: U.rand(-8, 8), w: BW - 1, h: BH - 1, c: col, pile: -Math.min(20, piles[col_key] * 1.5) * Math.random(), rest: false });
      }
    }
    // sparks & speed lines
    for (let i = 0; i < 70 + r.idx * 40; i++) spawnSpark(false);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + Math.random() * 0.1;
      lines.push({ x: cxp, y: cyp, a, life: 0.5 + Math.random() * 0.4, inward: false, len: 60 + Math.random() * 140 });
    }
  }
  function tint(base, col) {
    return Math.random() < 0.5 ? shade(col, -0.3) : shade(col, 0.1);
  }
  function spawnSpark(ambient) {
    const c = cardRect();
    const cxp = c.x + c.w / 2, cyp = c.y + c.h / 2;
    const r = rolled ? rolled.rarity : G.RARITIES[0];
    if (ambient) {
      sparks.push({ x: U.rand(0, W), y: H + 4, vx: U.rand(-10, 10), vy: U.rand(-60, -20), life: 3, c: U.pick([r.color, r.glow, '#ffffff']), g: 0, sz: 1 });
      return;
    }
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 280;
    sparks.push({ x: cxp, y: cyp, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.9, c: U.pick([r.color, r.glow, '#ffffff', '#ffe45c']), g: 180, sz: Math.random() < 0.3 ? 2 : 1 });
  }
  function spawnCoin() {
    coins.push({ x: U.rand(W * 0.2, W * 0.8), y: -10, vx: U.rand(-30, 30), vy: U.rand(0, 60), spin: Math.random() * 6, life: 1 });
  }

  /* ------------------------------------------------------------------ draw */
  function rect(x, y, w, h, c) { bx.fillStyle = c; bx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function text(s, x, y, c, size, font, align) {
    bx.font = `${size}px ${font || 'Silkscreen'}, monospace`;
    bx.fillStyle = c;
    bx.textAlign = align || 'center';
    bx.textBaseline = 'top';
    bx.fillText(s, Math.round(x), Math.round(y));
  }
  function disc(x0, y0, r, c) {
    bx.fillStyle = c;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      bx.fillRect(Math.round(x0 - w), Math.round(y0 + y), w * 2 + 1, 1);
    }
  }
  function ringDots(x0, y0, r, c, n, phase) {
    bx.fillStyle = c;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (phase || 0);
      bx.fillRect(Math.round(x0 + Math.cos(a) * r), Math.round(y0 + Math.sin(a) * r), 1, 1);
    }
  }

  function draw() {
    const r = rolled && (state === 'burst' || state === 'reveal') ? rolled.rarity : null;
    const time = performance.now() / 1000;
    bx.setTransform(1, 0, 0, 1, 0, 0);
    // background
    rect(0, 0, W, H, '#07061a');
    const sx = shake > 0 ? U.rand(-1, 1) * shake * 4 : 0;
    const sy = shake > 0 ? U.rand(-1, 1) * shake * 4 : 0;
    bx.setTransform(1, 0, 0, 1, Math.round(sx), Math.round(sy));
    const c = cardRect();
    const cxp = c.x + c.w / 2, cyp = c.y + c.h / 2;
    const fy = floorY();

    // wall
    const wallTint = r && r.idx >= 2 ? r.color : null;
    for (const b of bricks) {
      if (!b.alive) continue;
      const yy = b.hy + (b.drop < 0 ? b.drop * 400 : 0);
      // light falloff from center-top
      const d = Math.hypot(b.hx + 8 - cxp, (b.hy - cyp) * 1.2) / (W * 0.6);
      let col = b.c;
      if (wallTint) col = mixHex(b.c, wallTint, 0.35 * (1 - Math.min(1, d)));
      if (state === 'charge') col = mixHex(col, '#ffffff', charge * 0.12 * (1 - Math.min(1, d)));
      rect(b.hx, yy, BW - 1, BH - 1, col);
      if (d < 0.35) rect(b.hx, yy, BW - 1, 1, mixHex(col, '#ffffff', 0.15));
    }
    // vignette darkness on wall edges
    const grd = bx.createRadialGradient(cxp, cyp, 40, cxp, cyp, W * 0.65);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(5,4,18,0.85)');
    bx.fillStyle = grd;
    bx.fillRect(0, 0, W, fy);

    // torches
    for (const side of [-1, 1]) {
      const tx = cxp + side * (c.w / 2 + 34), ty = cyp - 6;
      rect(tx - 2, ty + 4, 5, 12, '#5a3a22');
      rect(tx - 4, ty + 2, 9, 3, '#8a5a3a');
      const fl = Math.sin(time * 18 + side) * 1.5;
      for (let k = 0; k < 8; k++) {
        bx.globalAlpha = 0.05;
        disc(tx, ty - 2, 10 + k * 3 + fl, '#ffb938');
      }
      bx.globalAlpha = 1;
      disc(tx, ty - 1, 4 + fl * 0.3, '#ff9b3d');
      disc(tx, ty - 3, 3, '#ffe45c');
      disc(tx, ty - 3, 1, '#ffffff');
      if (Math.random() < 0.3) sparks.push({ x: tx + U.rand(-2, 2), y: ty - 6, vx: U.rand(-6, 6), vy: U.rand(-30, -10), life: 0.5, c: '#ffb938', g: -10, sz: 1 });
    }

    // floor
    rect(0, fy, W, H - fy, COL.floor);
    for (let y = fy; y < H; y += 4) {
      const k = (y - fy) / (H - fy);
      bx.fillStyle = `rgba(80,70,180,${0.12 * (1 - k)})`;
      for (let x = (y % 8) * 2; x < W; x += 8) bx.fillRect(x, y, 1, 1);
    }
    // plinth
    rect(cxp - 44, fy - 6, 88, 6, '#1d1850');
    rect(cxp - 36, fy - 10, 72, 4, '#2a2468');

    // god rays for legendary+
    if (r && r.idx >= 3) {
      bx.save();
      bx.translate(cxp, cyp);
      bx.rotate(time * 0.3);
      for (let i = 0; i < 12; i++) {
        bx.rotate(Math.PI / 6);
        bx.fillStyle = i % 2 ? 'rgba(255,220,120,0.08)' : 'rgba(255,255,255,0.05)';
        bx.beginPath(); bx.moveTo(0, 0); bx.lineTo(W, -30); bx.lineTo(W, 30); bx.closePath(); bx.fill();
      }
      bx.restore();
    }
    // singular: rainbow hue sweep
    if (r && r.idx >= 4) {
      bx.globalAlpha = 0.18;
      for (let i = 0; i < 6; i++) {
        bx.fillStyle = `hsl(${(time * 80 + i * 60) % 360},100%,60%)`;
        bx.fillRect(0, i * (fy / 6), W, fy / 6);
      }
      bx.globalAlpha = 1;
    }

    // speed lines
    for (const l of lines) {
      bx.strokeStyle = l.inward ? `rgba(255,255,255,${l.life * 1.5})` : `rgba(255,255,255,${Math.min(1, l.life * 1.6)})`;
      bx.lineWidth = 1;
      bx.beginPath();
      if (l.inward) {
        const k = 1 - l.life / 0.35;
        const x1 = U.lerp(l.x, cxp, k), y1 = U.lerp(l.y, cyp, k);
        bx.moveTo(x1, y1);
        bx.lineTo(x1 + Math.cos(l.a) * 14, y1 + Math.sin(l.a) * 14);
      } else {
        const k = 1 - l.life;
        const r0 = 40 + k * 200, r1 = r0 + l.len * (1 - k * 0.5);
        bx.moveTo(cxp + Math.cos(l.a) * r0, cyp + Math.sin(l.a) * r0);
        bx.lineTo(cxp + Math.cos(l.a) * r1, cyp + Math.sin(l.a) * r1);
      }
      bx.stroke();
    }

    // ring (breathing), shockwave
    if (state === 'idle' || state === 'enter' || state === 'charge') {
      const breathe = Math.sin(time * 2.2) * 0.5 + 0.5;
      const rr = 72 + breathe * 10 + charge * 30 - (state === 'enter' ? (1 - st / 0.7) * 30 : 0);
      bx.globalAlpha = 0.5 + charge * 0.5;
      ringDots(cxp, cyp, rr, charge > 0.5 ? '#3ee6ff' : '#a9a2ff', 220, 0);
      ringDots(cxp, cyp, rr + 1, charge > 0.5 ? '#3ee6ff' : '#a9a2ff', 220, 0.01);
      bx.globalAlpha = 1;
    }
    if (wave > 0) {
      bx.globalAlpha = Math.max(0, 1 - wave / (W * 0.7));
      ringDots(cxp, cyp, wave, r ? r.glow : '#ffffff', 400, 0);
      ringDots(cxp, cyp, wave * 0.8, '#ffffff', 300, 0.3);
      bx.globalAlpha = 1;
    }

    // card
    drawCard(c, time, r);

    // cracks (lightning over card)
    for (let i = cracks.length - 1; i >= 0; i--) {
      const k = cracks[i];
      k.life -= 1 / 60;
      if (k.life <= 0 && state !== 'charge') { cracks.splice(i, 1); continue; }
      bx.strokeStyle = charge > 0.6 ? '#ffffff' : '#d8d0ff';
      bx.lineWidth = 1;
      bx.beginPath();
      k.pts.forEach(([x, y], j) => (j ? bx.lineTo(x, y) : bx.moveTo(x, y)));
      bx.stroke();
    }

    // debris
    for (const d of debris) {
      bx.save();
      bx.translate(d.x, d.y);
      bx.rotate(d.rest ? Math.round(d.rot / (Math.PI / 2)) * (Math.PI / 2) : d.rot);
      bx.fillStyle = d.c;
      bx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
      bx.fillStyle = 'rgba(255,255,255,0.15)';
      bx.fillRect(-d.w / 2, -d.h / 2, d.w, 1);
      bx.restore();
    }
    // sparks
    for (const s of sparks) {
      bx.globalAlpha = Math.min(1, s.life * 2);
      rect(s.x, s.y, s.sz || 1, s.sz || 1, s.c);
    }
    bx.globalAlpha = 1;
    // coins
    for (const cn of coins) {
      const w = Math.max(1, Math.round(Math.abs(Math.cos(cn.spin)) * 5));
      rect(cn.x - w / 2, cn.y - 3, w, 6, '#ffb938');
      rect(cn.x - w / 2, cn.y - 3, w, 1, '#ffe45c');
      rect(cn.x - w / 2, cn.y + 2, w, 1, '#c25e12');
    }

    // UI texts
    bx.setTransform(1, 0, 0, 1, 0, 0);
    const P = G.PACKS[packType];
    text(`${P.name.toUpperCase()}  ·  ${G.S.packs[packType] || 0} LEFT`, 6, 8, '#ffffff', 8, 'Silkscreen', 'left');
    if (state === 'idle' || state === 'charge' || state === 'enter') {
      const blink = Math.sin(time * 5) > -0.3;
      if (blink || state === 'charge') {
        const label = state === 'charge' ? (charge > 0.8 ? '!!!' : 'KEEP HOLDING') : 'HOLD TO OPEN';
        drawDottedFrame(cxp - 58, fy + 22, 116, 22, time);
        text(label, cxp, fy + 29, '#ffffff', 8);
      }
      // charge bar
      if (charge > 0) {
        rect(cxp - 40, fy + 50, 80, 3, '#2a2650');
        rect(cxp - 40, fy + 50, 80 * charge, 3, charge > 0.8 ? '#ffffff' : '#3ee6ff');
      }
      text('[SPACE] or hold click', cxp, fy + 58, '#6a6fa0', 8);
    }
    if (state === 'reveal' && rolled) drawReveal(time);
    // rarity odds tabs (like the clip's RANDOM / COMMON / RARE / EPIC / LEGEND row)
    drawTabs(time);
    // buttons
    for (let i = 0; i < buttons.length; i++) drawButton(buttons[i], i === hoverBtn);
    // flash
    if (flash > 0) {
      bx.globalAlpha = Math.min(1, flash);
      rect(0, 0, W, H, flashCol);
      bx.globalAlpha = 1;
    }
    // blit
    cx.imageSmoothingEnabled = false;
    cx.drawImage(buf, 0, 0, W * SC, H * SC);
  }

  function drawCard(c, time, r) {
    let scaleX = 1;
    let yOff = 0;
    let showFace = false;
    if (state === 'enter') {
      const k = Math.min(1, st / 0.6);
      yOff = -(1 - U.easeOutBack(k)) * 160;
      // light beam from above
      bx.globalAlpha = 0.25 * (1 - k * 0.6);
      rect(c.x + 10, 0, c.w - 20, c.y + yOff + 10, '#ffffff');
      bx.globalAlpha = 1;
    } else if (state === 'charge') {
      const a = charge * charge * 3.5;
      c = Object.assign({}, c, { x: c.x + U.rand(-a, a), y: c.y + U.rand(-a, a) });
    } else if (state === 'burst') {
      const k = st / 1.0;
      if (k < 0.3) scaleX = 1 - k / 0.3;
      else if (k < 0.6) { scaleX = (k - 0.3) / 0.3; showFace = 'white'; }
      else { scaleX = 1; showFace = true; }
      yOff = -Math.sin(Math.min(1, k) * Math.PI) * 16;
    } else if (state === 'reveal') {
      showFace = true;
      yOff = Math.sin(time * 1.8) * 2;
    } else if (state === 'idle') {
      yOff = Math.sin(time * 1.8) * 2;
    }
    const w = Math.max(1, Math.round(c.w * scaleX));
    const x = Math.round(c.x + (c.w - w) / 2);
    const y = Math.round(c.y + yOff);
    // shadow
    bx.globalAlpha = 0.35;
    rect(c.x + 6, floorY() - 4, c.w - 12, 3, '#000000');
    bx.globalAlpha = 1;
    // glow behind card
    if (r || state === 'charge') {
      const gc = r ? r.glow : '#a9a2ff';
      const gr = r ? 30 + r.idx * 14 : 10 + charge * 30;
      const g = bx.createRadialGradient(x + w / 2, y + c.h / 2, 10, x + w / 2, y + c.h / 2, c.h / 2 + gr);
      g.addColorStop(0, hexA(gc, r ? 0.45 : 0.3 * charge));
      g.addColorStop(1, hexA(gc, 0));
      bx.fillStyle = g;
      bx.fillRect(x - gr - 40, y - gr - 40, w + gr * 2 + 80, c.h + gr * 2 + 80);
    }
    if (showFace === 'white') {
      rect(x, y, w, c.h, '#ffffff');
      rect(x, y, w, 4, '#dddddd');
    } else if (showFace && cardFace) {
      bx.drawImage(cardFace, 0, 0, 84, 116, x, y, w, c.h);
      // shine sweep (the dotted diagonal from the clip)
      const ph = ((time * 0.6) % 1.6) - 0.3;
      bx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < c.h; i += 2) {
        const sx = x + (ph * c.w) + i * 0.5;
        if (sx > x && sx < x + w) bx.fillRect(Math.round(sx), y + i, 1, 1);
      }
    } else {
      bx.drawImage(cardBack, 0, 0, 84, 116, x, y, w, c.h);
      if (state === 'charge') {
        bx.globalAlpha = charge * 0.5;
        rect(x, y, w, c.h, '#ffffff');
        bx.globalAlpha = 1;
      }
    }
  }

  function drawReveal(time) {
    const res = rolled;
    const r = res.rarity;
    const c = cardRect();
    const cxp = c.x + c.w / 2;
    // rarity title slam
    const k = Math.min(1, st / 0.45);
    const ty = Math.round(U.lerp(-40, c.y - 38, U.easeOutBack(k)));
    const size = 24;
    bx.font = `${size}px "Press Start 2P", monospace`;
    bx.textAlign = 'center';
    bx.textBaseline = 'top';
    if (r.idx >= 2) {
      const g = Math.random() < 0.15 ? 3 : 1;
      bx.fillStyle = 'rgba(255,0,80,0.7)';
      bx.fillText(r.name, cxp - g, ty);
      bx.fillStyle = 'rgba(0,220,255,0.7)';
      bx.fillText(r.name, cxp + g, ty);
    }
    bx.fillStyle = '#0b0a1a';
    bx.fillText(r.name, cxp + 2, ty + 3);
    bx.fillStyle = r.idx >= 4 ? `hsl(${(time * 120) % 360},100%,70%)` : r.idx === 0 ? '#ffffff' : r.glow;
    bx.fillText(r.name, cxp, ty);
    // badge
    if (st > 0.3) {
      const bxp = c.x + c.w - 6, byp = c.y - 8 + Math.sin(time * 4) * 1.5;
      if (res.isNew) {
        bx.save();
        bx.translate(bxp, byp);
        bx.rotate(-0.12);
        rect(-18, -7, 36, 14, '#0b0a1a');
        rect(-17, -6, 34, 12, '#ffe45c');
        text('NEW!', 0, -3, '#0b0a1a', 8);
        bx.restore();
      } else {
        rect(bxp - 14, byp - 6, 28, 13, '#0b0a1a');
        rect(bxp - 13, byp - 5, 26, 11, '#8a8fb8');
        text('×' + res.count, bxp, byp - 3, '#ffffff', 8);
      }
    }
    // details below
    if (st > 0.5) {
      const fy = floorY();
      const lv = res.level;
      const card = res.card;
      const bonus = G.BONUS[card.b] ? G.BONUS[card.b].fmt(card.v * lv) : '';
      text(`LV ${lv}${res.levelUp ? '  LEVEL UP!' : ''}  ·  ${bonus}`, cxp, fy + 18, res.levelUp ? '#5cf27a' : '#ffe45c', 8);
      wrapText(card.flavor, cxp, fy + 32, Math.min(W - 40, 300), '#c8c4ff');
      if (res.strawberries) text(`+${res.strawberries} strawberries (duplicate)`, cxp, fy + 62, '#ff5c8a', 8);
    }
  }
  function wrapText(s, x, y, maxW, col) {
    bx.font = '8px Silkscreen, monospace';
    const words = s.split(' ');
    let line = '', yy = y, n = 0;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (bx.measureText(test).width > maxW && line) {
        text(line, x, yy, col, 8);
        line = w;
        yy += 10;
        if (++n >= 2) { line += '…'; break; }
      } else line = test;
    }
    if (line) text(line, x, yy, col, 8);
  }
  function drawDottedFrame(x, y, w, h, time) {
    bx.fillStyle = '#6a6fa0';
    for (let i = 0; i < w; i += 3) {
      if ((i + Math.floor(time * 20)) % 6 < 3) { bx.fillRect(x + i, y, 1, 1); bx.fillRect(x + w - i, y + h, 1, 1); }
    }
    for (let j = 0; j < h; j += 3) { bx.fillRect(x, y + j, 1, 1); bx.fillRect(x + w, y + j, 1, 1); }
  }
  function drawTabs(time) {
    const labels = G.RARITIES.map((r) => r.name.slice(0, 6));
    const y = H - 30;
    let total = 0;
    const minR = G.PACKS[packType].minRarity;
    const ws = G.RARITIES.map((r) => (r.idx >= minR ? r.weight * (1 + G.D.M.packLuck * r.idx * 0.6) : 0));
    total = ws.reduce((a, b) => a + b, 0);
    const tw = 56, gap = 3;
    const x0 = Math.round(W / 2 - (labels.length * (tw + gap)) / 2);
    labels.forEach((l, i) => {
      const x = x0 + i * (tw + gap);
      const hit = rolled && state === 'reveal' && rolled.rarity.idx === i;
      rect(x, y, tw, 11, hit ? '#ffffff' : '#15123a');
      rect(x, y + 11, tw, 1, '#0b0a1a');
      text(l, x + tw / 2, y + 2, hit ? '#0b0a1a' : G.RARITIES[i].color, 8);
      const pct = ws[i] / total * 100;
      text(pct >= 1 ? pct.toFixed(0) + '%' : pct.toFixed(1) + '%', x + tw / 2, y + 13, '#6a6fa0', 8);
    });
  }
  function drawButton(b, hover) {
    const push = hover ? 1 : 0;
    rect(b.x, b.y + 2, b.w, b.h, '#0b0a1a');
    rect(b.x, b.y + push, b.w, b.h, b.primary ? (hover ? '#ffd24a' : '#f5b642') : hover ? '#3b3183' : '#241d57');
    rect(b.x, b.y + push, b.w, 1, b.primary ? '#fff0a8' : '#5a50b0');
    text(b.label, b.x + b.w / 2, b.y + 4 + push, b.primary ? '#1a1030' : '#ffffff', 8);
  }
  function hexA(hex, a) {
    const p = parseInt(hex.slice(1), 16);
    return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${a})`;
  }
  function mixHex(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - k) + ((pb >> 16) & 255) * k);
    const g = Math.round(((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k);
    const bl = Math.round((pa & 255) * (1 - k) + (pb & 255) * k);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  /** small preview renderer used by the collection UI */
  Pack.faceFor = (card, count) => {
    const r = G.RARITY[card.r];
    if (!count) {
      // unknown card: rarity-colored frame, silhouette, no name
      const c = document.createElement('canvas');
      c.width = 84; c.height = 116;
      const x = c.getContext('2d');
      x.fillStyle = '#0b0a1a'; x.fillRect(0, 0, 84, 116);
      x.fillStyle = shade(r.color, -0.45); x.fillRect(2, 2, 80, 112);
      x.fillStyle = '#0b0a1a'; x.fillRect(4, 4, 76, 108);
      x.fillStyle = '#120f30'; x.fillRect(6, 6, 72, 104);
      x.font = '24px "Press Start 2P", monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = shade(r.color, -0.3);
      x.fillText('?', 42, 50);
      x.font = '8px Silkscreen, monospace';
      x.fillText(r.name, 42, 92);
      return c;
    }
    return makeFace({ card, rarity: r, count });
  };
})(typeof window !== 'undefined' ? window : globalThis);
