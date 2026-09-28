/* Screen-space FX: pixel particle bursts, coins flying to counters, confetti, floating numbers. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const FX = (G.FX = {});
  let cv, cx, parts = [], W = 0, H = 0;
  const PX = 3; // particle pixel size

  FX.init = () => {
    cv = document.getElementById('fxCanvas');
    cx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  };
  function resize() {
    W = cv.width = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  FX.reduce = false;

  FX.burst = (x, y, opts) => {
    const o = opts || {};
    const n = FX.reduce ? Math.min(8, o.n || 20) : o.n || 20;
    const cols = o.colors || ['#ffffff', '#ffe45c', '#ff5cc8', '#3ee6ff'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (o.speed || 240) * (0.3 + Math.random());
      parts.push({ t: 'p', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 80), life: (o.life || 0.8) * (0.5 + Math.random()), max: 1, c: U.pick(cols), g: o.g === undefined ? 500 : o.g, s: o.size || PX });
    }
  };
  /** coins/pixels flying from (x,y) to an element (e.g., the money counter) */
  FX.flyTo = (x, y, el, opts) => {
    if (!el) return;
    const o = opts || {};
    const r = el.getBoundingClientRect();
    const tx = r.left + 18, ty = r.top + r.height / 2;
    const n = FX.reduce ? 2 : o.n || 6;
    for (let i = 0; i < n; i++) {
      parts.push({ t: 'fly', x: x + U.rand(-10, 10), y: y + U.rand(-10, 10), sx: x, sy: y, tx, ty, k: -i * 0.04, dur: 0.55 + Math.random() * 0.25, c: o.color || '#ffe45c', c2: o.color2 || '#c25e12', arc: U.rand(-120, 120), onDone: i === 0 ? o.onDone : null, el });
    }
  };
  FX.confetti = (n) => {
    const cols = ['#ff4d6d', '#ffe45c', '#5cf27a', '#3ee6ff', '#b04dff', '#ff5cc8', '#ffffff'];
    for (let i = 0; i < (FX.reduce ? 30 : n || 140); i++) {
      parts.push({ t: 'c', x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: U.rand(-40, 40), vy: U.rand(60, 180), life: 4, max: 4, c: U.pick(cols), g: 30, rot: Math.random() * 6, vr: U.rand(-8, 8), s: 4 + Math.random() * 4 });
    }
  };
  FX.shake = (el, amt) => {
    if (FX.reduce || !el) return;
    el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${amt || 4}px,-${amt || 3}px)` }, { transform: `translate(-${amt || 4}px,${amt || 3}px)` }, { transform: 'translate(0,0)' }], { duration: 180 });
  };

  FX.float = (x, y, text, cls) => {
    const layer = document.getElementById('floaters');
    if (!layer) return;
    if (layer.childElementCount > 40) layer.firstChild.remove();
    const d = document.createElement('div');
    d.className = 'float ' + (cls || '');
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    layer.appendChild(d);
    setTimeout(() => d.remove(), 1150);
  };

  FX.update = (dt) => {
    if (!cx) return;
    cx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.t === 'fly') {
        p.k += dt / p.dur;
        if (p.k < 0) continue;
        if (p.k >= 1) {
          parts.splice(i, 1);
          if (p.el) { p.el.classList.remove('pulse'); void p.el.offsetWidth; p.el.classList.add('pulse'); }
          if (p.onDone) p.onDone();
          continue;
        }
        const e = U.easeInCubic(p.k);
        const x = U.lerp(p.sx, p.tx, e) + Math.sin(p.k * Math.PI) * p.arc * 0.4;
        const y = U.lerp(p.sy, p.ty, e) - Math.sin(p.k * Math.PI) * 60;
        cx.fillStyle = '#0b0a1a';
        cx.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8);
        cx.fillStyle = p.c;
        cx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6);
        cx.fillStyle = p.c2;
        cx.fillRect(Math.round(x) - 3, Math.round(y) + 1, 6, 2);
        continue;
      }
      p.life -= dt;
      if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      cx.globalAlpha = Math.min(1, p.life / (p.max * 0.4));
      cx.fillStyle = p.c;
      if (p.t === 'c') {
        p.rot += p.vr * dt;
        const w = Math.abs(Math.cos(p.rot)) * p.s + 1;
        cx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(w), Math.round(p.s * 0.6));
      } else {
        cx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
    }
    cx.globalAlpha = 1;
  };
})(typeof window !== 'undefined' ? window : globalThis);
