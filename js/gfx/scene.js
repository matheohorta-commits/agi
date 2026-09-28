/* The Lab scene: a low-res pixel-art canvas that evolves with the era.
 * Garage -> startup office -> datacenter -> gigawatt campus -> takeoff -> Earth -> Dyson swarm -> galaxy.
 * The glowing "model" in the middle is the click target. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;

  const W = 240, H = 180;
  const Scene = (G.Scene = {});
  let cv, cx, buf, bx, bg = {}, t = 0;
  let orb = { x: 120, y: 62, r: 16, squish: 0, hover: false };
  const parts = [];
  const floaters = [];
  let stars = [];
  let theme = 'garage';
  let themeFade = 0, prevTheme = null;
  let agents = [];

  const C = {
    night: '#0b0a1a', night2: '#141233', brick: '#2a2356', brick2: '#342b6b', brickHi: '#4a3f8f',
    floor: '#1a1638', wood: '#5a3a22', woodHi: '#7a5230', steel: '#3a3f5c', steelHi: '#5b6285',
    led: ['#5cf27a', '#3ee6ff', '#ffe45c', '#ff4d6d'], amber: '#ffb938',
  };

  Scene.init = (canvas) => {
    cv = canvas;
    cv.width = W;
    cv.height = H;
    cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    buf = document.createElement('canvas');
    buf.width = W;
    buf.height = H;
    bx = buf.getContext('2d');
    const rng = U.seeded('stars');
    stars = Array.from({ length: 140 }, () => ({ x: rng() * W, y: rng() * H, b: rng(), s: rng() < 0.1 ? 2 : 1, tw: rng() * 6 }));
    for (let i = 0; i < 90; i++) agents.push({ a: Math.random() * Math.PI * 2, r: 20 + Math.random() * 60, sp: 0.3 + Math.random() * 1.2, y: Math.random() });
    cv.addEventListener('mousemove', (e) => {
      const p = toLocal(e);
      orb.hover = Math.hypot(p.x - orb.x, p.y - orb.y) < orb.r + 8;
      cv.style.cursor = orb.hover ? 'pointer' : 'default';
    });
  };
  function toLocal(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  Scene.hitOrb = (e) => {
    const p = toLocal(e);
    return Math.hypot(p.x - orb.x, p.y - orb.y) < orb.r + 10;
  };
  Scene.orbScreenPos = () => {
    const r = cv.getBoundingClientRect();
    return { x: r.left + (orb.x / W) * r.width, y: r.top + (orb.y / H) * r.height };
  };
  Scene.pulse = (crit) => {
    orb.squish = crit ? 1 : 0.6;
    const n = crit ? 22 : 8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * (crit ? 90 : 50);
      parts.push({ x: orb.x, y: orb.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0.6 + Math.random() * 0.5, c: crit ? U.pick(['#ffe45c', '#ffffff', '#ff9b3d']) : U.pick(['#ff5cc8', '#b04dff', '#3ee6ff', '#ffffff']), g: 60 });
    }
  };
  Scene.setTheme = (th) => {
    if (th === theme) return;
    prevTheme = theme;
    theme = th;
    themeFade = 1;
  };
  Scene.theme = () => theme;

  /* ------------------------------------------------------------------ drawing helpers */
  function rect(x, y, w, h, c) { bx.fillStyle = c; bx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function px(x, y, c) { bx.fillStyle = c; bx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function disc(x0, y0, r, c) {
    bx.fillStyle = c;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      bx.fillRect(Math.round(x0 - w), Math.round(y0 + y), w * 2 + 1, 1);
    }
  }
  function ring(x0, y0, r, c, step) {
    bx.fillStyle = c;
    const n = Math.max(12, Math.floor(r * 6));
    for (let i = 0; i < n; i += step || 1) {
      const a = (i / n) * Math.PI * 2;
      bx.fillRect(Math.round(x0 + Math.cos(a) * r), Math.round(y0 + Math.sin(a) * r), 1, 1);
    }
  }
  function sprite(name, x, y, scale, tint) {
    const s = G.Sprites.render(name, scale || 1, tint);
    if (s) bx.drawImage(s, Math.round(x), Math.round(y));
  }
  function text(s, x, y, c, size, align) {
    bx.font = `${size || 8}px Silkscreen, monospace`;
    bx.fillStyle = c;
    bx.textAlign = align || 'left';
    bx.textBaseline = 'top';
    bx.fillText(s, Math.round(x), Math.round(y));
  }

  /* ------------------------------------------------------------------ static backgrounds (cached) */
  function makeBg(th) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const saveBx = bx;
    bx = c.getContext('2d');
    bx.imageSmoothingEnabled = false;
    const rng = U.seeded(th);
    switch (th) {
      case 'garage': {
        rect(0, 0, W, H, C.brick);
        for (let y = 0; y < 128; y += 8) {
          const off = (y / 8) % 2 ? 0 : 8;
          for (let x = -16; x < W; x += 16) {
            const col = rng() < 0.1 ? C.brickHi : rng() < 0.5 ? C.brick2 : C.brick;
            rect(x + off + 1, y + 1, 14, 6, col);
          }
        }
        // window
        rect(160, 16, 56, 40, '#06050f');
        for (let i = 0; i < 30; i++) px(161 + rng() * 54, 17 + rng() * 38, rng() < 0.5 ? '#ffffff' : '#9fd3ff');
        rect(160, 16, 56, 2, C.steelHi); rect(160, 54, 56, 2, C.steelHi); rect(187, 16, 2, 40, C.steelHi);
        disc(205, 26, 4, '#e8e8ff');
        // poster
        rect(20, 18, 34, 44, '#e8d8b0');
        rect(22, 20, 30, 40, '#1a1638');
        text('FEEL', 24, 24, '#ff5cc8', 8);
        text('THE', 26, 34, '#ffffff', 8);
        text('AGI', 25, 44, '#3ee6ff', 8);
        // floor
        rect(0, 128, W, 52, C.floor);
        for (let x = 0; x < W; x += 20) rect(x, 128, 1, 52, '#221d48');
        rect(0, 128, W, 2, '#3a3280');
        // desk
        rect(126, 112, 90, 6, C.woodHi);
        rect(126, 118, 90, 3, C.wood);
        rect(130, 121, 4, 30, C.wood);
        rect(208, 121, 4, 30, C.wood);
        // CRT monitor
        rect(150, 84, 34, 28, '#c8c4b0');
        rect(153, 87, 28, 20, '#0a2010');
        rect(160, 108, 14, 4, '#a8a490');
        // keyboard
        rect(148, 110, 30, 3, '#d8d4c0');
        // shelf for GPUs
        rect(10, 100, 100, 4, C.woodHi);
        rect(10, 104, 100, 2, C.wood);
        break;
      }
      case 'startup': {
        rect(0, 0, W, H, '#1c1a3a');
        rect(0, 0, W, 110, '#221f47');
        // windows w/ city
        for (let i = 0; i < 3; i++) {
          const x0 = 12 + i * 76;
          rect(x0, 10, 64, 44, '#07061a');
          for (let b = 0; b < 8; b++) {
            const bh = 10 + rng() * 26, bw = 6 + rng() * 6, bxx = x0 + rng() * 56;
            rect(bxx, 54 - bh, bw, bh, '#15133a');
            for (let k = 0; k < 6; k++) if (rng() < 0.5) px(bxx + 1 + rng() * (bw - 2), 54 - bh + 2 + rng() * (bh - 3), '#ffe45c');
          }
          rect(x0, 10, 64, 2, C.steelHi); rect(x0, 52, 64, 2, C.steelHi);
        }
        // whiteboard with scaling plot
        rect(90, 62, 60, 36, '#e8e8f0');
        rect(94, 66, 1, 28, '#333'); rect(94, 93, 52, 1, '#333');
        for (let i = 0; i < 48; i++) px(95 + i, 92 - i * 0.55, '#3fa7ff');
        text('L~C', 124, 66, '#ff4d6d', 8);
        // floor
        rect(0, 110, W, 70, '#2a2552');
        for (let y = 110; y < H; y += 10) rect(0, y, W, 1, '#312a60');
        break;
      }
      case 'datacenter': {
        rect(0, 0, W, H, '#070814');
        // ceiling lights
        for (let x = 10; x < W; x += 40) { rect(x, 4, 22, 2, '#9fd3ff'); rect(x + 2, 6, 18, 1, '#3a5a8a'); }
        // perspective floor
        for (let y = 110; y < H; y++) {
          const k = (y - 110) / 70;
          rect(0, y, W, 1, U.lerp(0, 1, k) > 0.5 ? '#10142c' : '#0c1024');
        }
        for (let i = -8; i <= 8; i++) {
          bx.strokeStyle = '#18204a';
          bx.beginPath();
          bx.moveTo(120 + i * 6, 110);
          bx.lineTo(120 + i * 40, 180);
          bx.stroke();
        }
        // back rows of racks
        for (let row = 0; row < 3; row++) {
          const y0 = 40 + row * 14, h = 60 - row * 12, w = 10 - row * 2;
          for (let x = 4 + row * 6; x < W - 4; x += w + 2) {
            rect(x, y0, w, h, row === 0 ? '#1b1f3a' : row === 1 ? '#15182f' : '#101226');
          }
        }
        break;
      }
      case 'campus':
      case 'takeoff': {
        // sky gradient
        for (let y = 0; y < 120; y++) {
          const k = y / 120;
          rect(0, y, W, 1, th === 'takeoff' ? mix('#1a0830', '#3a1060', k) : mix('#05040f', '#1a1848', k));
        }
        for (const s of stars) if (s.y < 110) px(s.x, s.y, '#ffffff');
        // distant mountains
        bx.fillStyle = '#12102a';
        for (let x = 0; x < W; x++) {
          const h = 16 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.13) * 3;
          bx.fillRect(x, 120 - h, 1, h);
        }
        // ground
        rect(0, 120, W, 60, '#0e1a14');
        for (let y = 120; y < H; y += 6) rect(0, y, W, 1, '#10201a');
        // cooling towers (nuclear)
        for (const x0 of [16, 40]) {
          for (let y = 0; y < 30; y++) {
            const w = 16 - Math.sin((y / 30) * Math.PI) * 4;
            rect(x0 + (16 - w) / 2, 90 + y, w, 1, y < 3 ? '#9aa0b8' : '#6a6f8a');
          }
        }
        // datacenter buildings
        for (let i = 0; i < 4; i++) {
          const x0 = 76 + i * 40, y0 = 96 - (i % 2) * 6;
          rect(x0, y0, 34, 26, '#262a48');
          rect(x0, y0, 34, 2, '#3a3f66');
          for (let k = 0; k < 6; k++) rect(x0 + 3 + k * 5, y0 + 6, 3, 1, '#5b6285');
        }
        // power lines
        for (let x = 0; x < W; x += 60) {
          rect(x + 10, 104, 1, 18, '#3a3f5c');
          rect(x + 6, 104, 9, 1, '#3a3f5c');
        }
        break;
      }
      case 'asi':
      case 'asi_bad': {
        rect(0, 0, W, H, '#020208');
        for (const s of stars) px(s.x, s.y, s.b > 0.6 ? '#ffffff' : '#6a6f9a');
        break;
      }
      case 'dyson':
      case 'galaxy': {
        rect(0, 0, W, H, '#010106');
        for (const s of stars) px(s.x, s.y, s.b > 0.7 ? '#ffffff' : s.b > 0.4 ? '#8a90c0' : '#3a3f66');
        break;
      }
    }
    bx = saveBx;
    return c;
  }
  function mix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - k) + ((pb >> 16) & 255) * k);
    const g = Math.round(((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k);
    const bl = Math.round((pa & 255) * (1 - k) + (pb & 255) * k);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  /* ------------------------------------------------------------------ dynamic layers */
  function drawGarage(S, D) {
    // CRT text flicker
    const lines = Math.floor((t * 3) % 6);
    for (let i = 0; i < lines; i++) rect(155, 89 + i * 3, 6 + ((i * 7 + Math.floor(t)) % 18), 1, '#5cf27a');
    if (Math.floor(t * 2) % 2) rect(155 + ((lines * 5) % 20), 89 + lines * 3, 2, 2, '#5cf27a');
    // GPUs on shelf based on owned
    const total = Object.values(S.hw).reduce((a, b) => a + b, 0);
    const n = Math.min(10, total);
    for (let i = 0; i < n; i++) {
      const x = 12 + i * 10, y = 88;
      rect(x, y, 9, 12, '#2a2a3a');
      rect(x + 1, y + 1, 7, 10, '#3a3f5c');
      const spin = (t * 20 + i) % 4 < 2;
      disc(x + 4.5, y + 4, 2, spin ? '#6a6f8a' : '#4a4e6a');
      px(x + 4, y + 9, (t * 5 + i) % 2 < 1 ? '#5cf27a' : '#2a9d4a');
    }
    // the cat (cat-level intelligence)
    const cxp = 60, cyp = 140;
    rect(cxp, cyp, 14, 6, '#5a5a6a');
    rect(cxp + 11, cyp - 3, 5, 5, '#5a5a6a');
    px(cxp + 12, cyp - 4, '#5a5a6a'); px(cxp + 15, cyp - 4, '#5a5a6a');
    const tail = Math.sin(t * 2) * 2;
    rect(cxp - 3, cyp + 1 + tail, 3, 1, '#5a5a6a');
    if (Math.floor(t) % 4 === 0) text('z', cxp + 16, cyp - 12 - (t % 1) * 4, '#9aa0b8', 8);
    // desk lamp glow
    bx.fillStyle = 'rgba(255,230,150,0.06)';
    bx.beginPath(); bx.arc(200, 100, 30, 0, Math.PI * 2); bx.fill();
  }
  function drawStartup(S, D) {
    // racks (count ∝ log hardware)
    const nR = Math.min(6, 1 + Math.floor(Math.log10(1 + D.computeRaw / 1e13)));
    for (let i = 0; i < nR; i++) {
      const x = 8 + i * 13, y = 76;
      rect(x, y, 12, 40, '#15172e');
      rect(x + 1, y + 1, 10, 38, '#1e2242');
      for (let k = 0; k < 9; k++) {
        const on = Math.sin(t * (3 + k) + i * 7 + k) > 0.2;
        px(x + 2 + (k % 3) * 3, y + 3 + Math.floor(k / 3) * 12, on ? C.led[(i + k) % 4] : '#2a2e50');
      }
    }
    // desks with researchers (count ∝ researchers)
    const nres = Object.values(S.res).reduce((a, b) => a + b, 0);
    const nD = Math.min(5, Math.ceil(Math.log2(1 + nres)));
    for (let i = 0; i < nD; i++) {
      const x = 150 + (i % 3) * 30, y = 118 + Math.floor(i / 3) * 26;
      rect(x, y, 24, 3, C.woodHi);
      rect(x + 2, y + 3, 2, 10, C.wood); rect(x + 20, y + 3, 2, 10, C.wood);
      rect(x + 8, y - 9, 10, 8, '#2a2e50'); rect(x + 9, y - 8, 8, 6, (t * 2 + i) % 3 < 1.5 ? '#3ee6ff' : '#2a9daf');
      const bob = Math.sin(t * 4 + i) > 0.7 ? -1 : 0;
      rect(x + 2, y - 8 + bob, 5, 5, '#f2c9a5'); rect(x + 2, y - 9 + bob, 5, 2, '#4f3220'); rect(x + 1, y - 3, 7, 6, '#3fa7ff');
    }
    // neon sign with lab name
    const lab = G.LABS[S.lab];
    const glow = 0.7 + Math.sin(t * 3) * 0.3;
    bx.globalAlpha = glow;
    text(lab.short, 196, 66, lab.color, 8, 'center');
    bx.globalAlpha = 1;
  }
  function drawDatacenter(S, D) {
    // front rows of racks with blinking LEDs
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 5; i++) {
        const x = side === 0 ? 4 + i * 16 : W - 20 - i * 16;
        const y = 60 + i * 4;
        const h = 64 - i * 6;
        rect(x, y, 14, h, '#1b1f3a');
        rect(x + 1, y + 1, 12, h - 2, '#242a4c');
        for (let k = 0; k < Math.floor(h / 5); k++) {
          const on = Math.sin(t * (4 + ((k + i) % 5)) + k * 1.7 + i * 3 + side) > 0.1;
          px(x + 3, y + 3 + k * 5, on ? C.led[(k + i + side) % 4] : '#2a2e50');
          px(x + 6, y + 3 + k * 5, on && k % 2 ? '#3ee6ff' : '#2a2e50');
        }
      }
    }
    // cold aisle glow
    bx.fillStyle = 'rgba(62,230,255,0.07)';
    bx.fillRect(80, 30, 80, 150);
    // cooling pipes
    rect(0, 20, W, 3, '#2a4a8a');
    rect(0, 26, W, 2, '#8a2a4a');
    for (let x = (t * 30) % 20; x < W; x += 20) px(x, 21, '#9fd3ff');
  }
  function drawCampus(S, D, takeoff) {
    // steam from cooling towers
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < 6; k++) {
        const ph = (t * 0.4 + k / 6) % 1;
        const x = 24 + i * 24 + Math.sin(ph * 6 + k) * 3;
        const y = 88 - ph * 40;
        bx.globalAlpha = 0.5 * (1 - ph);
        disc(x, y, 2 + ph * 5, '#b8bcd8');
      }
    }
    bx.globalAlpha = 1;
    // datacenter windows blink
    for (let i = 0; i < 4; i++) {
      const x0 = 76 + i * 40, y0 = 96 - (i % 2) * 6;
      for (let k = 0; k < 6; k++) px(x0 + 4 + k * 5, y0 + 14, Math.sin(t * 5 + i * 3 + k) > 0 ? '#5cf27a' : '#3ee6ff');
      rect(x0 + 2, y0 - 3, 30, 1, Math.floor(t * 2 + i) % 2 ? '#ff4d6d' : '#661a2a');
    }
    // power flowing along lines
    for (let x = (t * 50) % 60; x < W; x += 60) px(x, 104, '#ffe45c');
    if (takeoff) {
      // aurora
      for (let x = 0; x < W; x += 2) {
        const h = 20 + Math.sin(x * 0.04 + t) * 8 + Math.sin(x * 0.11 - t * 1.3) * 5;
        bx.globalAlpha = 0.18;
        rect(x, 10 + Math.sin(x * 0.02 + t * 0.5) * 6, 2, h, x % 4 ? '#5cf27a' : '#ff5cc8');
      }
      bx.globalAlpha = 1;
      drawAgents(D, '#3ee6ff');
    }
  }
  function drawAgents(D, col) {
    const n = Math.min(agents.length, 10 + Math.floor(Math.log10(1 + (D.agentCopies || 0)) * 10));
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      a.a += a.sp * 0.016;
      const x = orb.x + Math.cos(a.a) * a.r;
      const y = orb.y + Math.sin(a.a * 1.3) * a.r * 0.45 + a.y * 10;
      px(x, y, i % 5 === 0 ? '#ffffff' : col);
    }
  }
  function drawEarth(S, D, bad) {
    const ex = 120, ey = 128, r = 58;
    // atmosphere glow
    for (let k = 6; k > 0; k--) {
      bx.globalAlpha = 0.05;
      disc(ex, ey, r + k * 2, bad ? '#ff4d6d' : '#3fa7ff');
    }
    bx.globalAlpha = 1;
    disc(ex, ey, r, '#123a8a');
    const rng = U.seeded('earth');
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2, d = rng() * r * 0.85;
      const lx = ex + Math.cos(a + t * 0.02) * d * 0.95, ly = ey + Math.sin(a) * d * 0.9;
      disc(lx, ly, 3 + rng() * 6, bad ? '#3a1a1a' : '#1f6a3a');
    }
    // city lights
    for (let i = 0; i < 90; i++) {
      const a = rng() * Math.PI * 2, d = rng() * r * 0.9;
      const lx = ex + Math.cos(a + t * 0.02) * d, ly = ey + Math.sin(a) * d * 0.9;
      if (Math.hypot(lx - ex, ly - ey) < r - 1) px(lx, ly, bad ? (rng() < 0.5 ? '#ff4d6d' : '#ff9b3d') : rng() < 0.5 ? '#ffe45c' : '#ffffff');
    }
    // satellites
    for (let i = 0; i < 16; i++) {
      const a = t * (0.2 + i * 0.013) + i;
      const x = ex + Math.cos(a) * (r + 10 + (i % 4) * 6);
      const y = ey + Math.sin(a) * (r * 0.35 + (i % 3) * 5) - 10;
      px(x, y, bad ? '#ff4d6d' : '#ffffff');
    }
  }
  function drawDyson(S, D) {
    const sx = 120, sy = 90;
    const c = S.cosmos || { energy: 1e17, maxEnergy: 3.8e26 };
    // sun
    for (let k = 10; k > 0; k--) {
      bx.globalAlpha = 0.05;
      disc(sx, sy, 16 + k * 3, '#ffb938');
    }
    bx.globalAlpha = 1;
    disc(sx, sy, 16, '#ffe45c');
    disc(sx - 3, sy - 3, 8, '#fff5b0');
    // swarm fill fraction
    const frac = U.clamp((Math.log10(Math.max(1e17, c.energy)) - 17) / (26.6 - 17), 0, 1);
    const n = Math.floor(20 + frac * 500);
    const rng = U.seeded('swarm');
    for (let i = 0; i < n; i++) {
      const rr = 22 + rng() * 46;
      const sp = 0.3 / Math.sqrt(rr / 22);
      const a = rng() * Math.PI * 2 + t * sp;
      const tilt = rng() * 0.6 + 0.2;
      const x = sx + Math.cos(a) * rr;
      const y = sy + Math.sin(a) * rr * tilt;
      px(x, y, rng() < 0.2 ? '#3ee6ff' : '#9fd3ff');
    }
    // mercury being disassembled
    if (!(S.cosmos && S.cosmos.projects.mercury)) {
      const a = t * 0.5;
      disc(sx + Math.cos(a) * 30, sy + Math.sin(a) * 10, 2, '#9a8a7a');
    }
  }
  function drawGalaxy(S, D) {
    const gx = 120, gy = 90;
    const c = S.cosmos || { stars: 1 };
    const lit = U.clamp(Math.log10(Math.max(1, c.stars)) / 22, 0, 1);
    const rng = U.seeded('galaxy');
    const N = 900;
    for (let i = 0; i < N; i++) {
      const arm = i % 2;
      const d = Math.pow(rng(), 0.7) * 80;
      const a = d * 0.07 + arm * Math.PI + rng() * 0.5 + t * 0.02;
      const x = gx + Math.cos(a) * d;
      const y = gy + Math.sin(a) * d * 0.55;
      const isLit = rng() < lit * 1.1 && d < 80 * Math.min(1, lit * 2);
      px(x, y, isLit ? (S.ending === 'misaligned' ? '#ff4d6d' : '#ffe45c') : d < 12 ? '#fff5d0' : rng() < 0.5 ? '#6a70a8' : '#3a3f66');
    }
    disc(gx, gy, 5, '#fff5d0');
  }

  /* ------------------------------------------------------------------ the model (click target) */
  function drawOrb(S, D, era) {
    orb.squish *= 0.85;
    const bob = Math.sin(t * 1.6) * 2;
    const y = orb.y + bob;
    const sq = 1 + orb.squish * 0.25;
    const vibe = (S.vibe + 100) / 200;
    // halo
    const hr = orb.r + 6 + Math.sin(t * 3) * 1.5 + (orb.hover ? 2 : 0);
    bx.globalAlpha = 0.25 + vibe * 0.3;
    ring(orb.x, y, hr, vibe > 0.6 ? '#5cf27a' : vibe < 0.35 ? '#ff4d6d' : '#b04dff', 1);
    ring(orb.x, y, hr + 3, '#ffffff', 3);
    bx.globalAlpha = 1;
    // training progress ring
    if (S.training) {
      const p = S.training.done / S.training.flop;
      const n = 60;
      for (let i = 0; i < n * p; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        px(orb.x + Math.cos(a) * (orb.r + 3), y + Math.sin(a) * (orb.r + 3), '#ffe45c');
      }
    }
    const r = Math.round(orb.r * sq);
    if (era === 0) {
      // tiny neural net
      const layers = [3, 4, 4, 2];
      const pts = [];
      layers.forEach((n, li) => {
        for (let i = 0; i < n; i++) pts.push({ l: li, x: orb.x - 15 + li * 10, y: y - (n - 1) * 5 + i * 10 });
      });
      bx.strokeStyle = 'rgba(176,77,255,0.6)';
      bx.lineWidth = 1;
      for (const a of pts) for (const b of pts) if (b.l === a.l + 1) {
        bx.beginPath(); bx.moveTo(a.x + 0.5, a.y + 0.5); bx.lineTo(b.x + 0.5, b.y + 0.5); bx.stroke();
      }
      for (const p of pts) {
        const on = Math.sin(t * 4 + p.x * 0.3 + p.y * 0.2) > 0;
        disc(p.x, p.y, 2, on ? '#ff5cc8' : '#6a2bb3');
      }
      return;
    }
    if (era <= 2) {
      // glowing orb, with shoggoth mask in ChatGPT era
      for (let k = 4; k > 0; k--) {
        bx.globalAlpha = 0.08;
        disc(orb.x, y, r + k * 2, '#ff5cc8');
      }
      bx.globalAlpha = 1;
      disc(orb.x, y, r, '#6a2bb3');
      disc(orb.x, y, r - 2, '#b04dff');
      disc(orb.x - 4, y - 4, Math.max(2, r / 3), '#ff9be0');
      if (era === 2) {
        // smiley mask (RLHF)
        disc(orb.x, y + 2, 8, '#ffe45c');
        px(orb.x - 3, y, '#0b0a1a'); px(orb.x + 3, y, '#0b0a1a');
        rect(orb.x - 3, y + 5, 7, 1, '#0b0a1a'); px(orb.x - 4, y + 4, '#0b0a1a'); px(orb.x + 4, y + 4, '#0b0a1a');
        // tentacles
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI + Math.PI * 0.1;
          for (let k = 0; k < 8; k++) {
            const w = Math.sin(t * 3 + i + k * 0.5) * 2;
            px(orb.x + Math.cos(a) * (r + k) + w, y + Math.sin(a) * (r + k), '#2a9d4a');
          }
        }
      }
      return;
    }
    if (era <= 4) {
      // big eye (the superhuman researcher)
      for (let k = 5; k > 0; k--) {
        bx.globalAlpha = 0.07;
        disc(orb.x, y, r + k * 3, era === 4 ? '#3ee6ff' : '#b04dff');
      }
      bx.globalAlpha = 1;
      disc(orb.x, y, r, '#1a0f3a');
      disc(orb.x, y, r - 2, '#e8e8ff');
      const lx = Math.sin(t * 0.7) * 3, ly = Math.cos(t * 0.5) * 2;
      disc(orb.x + lx, y + ly, r / 2, era === 4 ? '#3ee6ff' : '#b04dff');
      disc(orb.x + lx, y + ly, r / 4, '#0b0a1a');
      px(orb.x + lx - 2, y + ly - 2, '#ffffff');
      // blink
      if (Math.sin(t * 0.8) > 0.985) rect(orb.x - r, y - 1, r * 2, 3, '#1a0f3a');
      return;
    }
    // post-ASI: a star-like mind
    const bad = S.ending === 'misaligned';
    for (let k = 6; k > 0; k--) {
      bx.globalAlpha = 0.08;
      disc(orb.x, y, r + k * 3, bad ? '#ff4d6d' : '#ffe45c');
    }
    bx.globalAlpha = 1;
    disc(orb.x, y, r - 4, bad ? '#ff2e2e' : '#fff5b0');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.5;
      rect(orb.x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), 2, 2, bad ? '#ff9b3d' : '#ffffff');
    }
  }

  /* ------------------------------------------------------------------ main render */
  Scene.render = (dt, S, D) => {
    if (!cx) return;
    t += dt;
    const era = D.era;
    const th = themeFor(S, D);
    if (th !== theme) Scene.setTheme(th);
    if (!bg[theme]) bg[theme] = makeBg(theme);
    orb.y = era >= 5 ? 54 : 62;
    orb.x = 120;
    if (era >= 5) orb.y = era >= 6 ? 36 : 48;
    bx.drawImage(bg[theme], 0, 0);
    switch (theme) {
      case 'garage': drawGarage(S, D); break;
      case 'startup': drawStartup(S, D); break;
      case 'datacenter': drawDatacenter(S, D); break;
      case 'campus': drawCampus(S, D, false); break;
      case 'takeoff': drawCampus(S, D, true); break;
      case 'asi': drawEarth(S, D, false); break;
      case 'asi_bad': drawEarth(S, D, true); break;
      case 'dyson': drawDyson(S, D); break;
      case 'galaxy': drawGalaxy(S, D); break;
    }
    if (era >= 5 && era < 6) drawAgents(D, S.ending === 'misaligned' ? '#ff4d6d' : '#ffe45c');
    drawOrb(S, D, era);
    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      px(p.x, p.y, p.c);
    }
    // theme crossfade (flash)
    if (themeFade > 0) {
      themeFade -= dt * 0.8;
      bx.globalAlpha = Math.max(0, themeFade);
      rect(0, 0, W, H, '#ffffff');
      bx.globalAlpha = 1;
    }
    // vignette
    cx.drawImage(buf, 0, 0);
  };

  function themeFor(S, D) {
    const e = D.era;
    if (e >= 7) return 'galaxy';
    if (e >= 6) return 'dyson';
    if (e >= 5) return S.ending === 'misaligned' ? 'asi_bad' : 'asi';
    return ['garage', 'startup', 'datacenter', 'campus', 'takeoff'][e];
  }
  Scene.themeFor = themeFor;
})(typeof window !== 'undefined' ? window : globalThis);
