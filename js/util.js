/* FEEL THE AGI — shared utilities (formatting, math, rng, dom helpers, event bus)
 * Classic script (no modules) so the game runs from file://, in Electron and on the web.
 * Everything hangs off the global G namespace. */
(function (root) {
  'use strict';
  const G = (root.G = root.G || {});

  /* ------------------------------------------------------------------ math */
  const U = (G.U = {});
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.sigmoid = (x) => 1 / (1 + Math.exp(-x));
  U.log10 = (x) => Math.log10(Math.max(1e-300, x));
  U.log2 = (x) => Math.log2(Math.max(1e-300, x));
  U.sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  U.easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInCubic = (t) => t * t * t;
  U.easeOutElastic = (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  };
  /** piecewise-linear interpolation in log space through [[x,y],...] points (y>0) */
  U.logInterp = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return Math.pow(10, U.lerp(Math.log10(pts[i - 1][1]), Math.log10(pts[i][1]), t));
      }
    }
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const slope = (Math.log10(b[1]) - Math.log10(a[1])) / (b[0] - a[0]);
    return Math.pow(10, Math.log10(b[1]) + slope * (x - b[0]));
  };
  /** piecewise-linear interpolation (linear space) */
  U.linInterp = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return U.lerp(pts[i - 1][1], pts[i][1], t);
      }
    }
    return pts[pts.length - 1][1];
  };

  /** Cost of buying `n` items starting from `owned` with base cost and growth r */
  U.bulkCost = (base, r, owned, n) => {
    if (n <= 0) return 0;
    return (base * Math.pow(r, owned) * (Math.pow(r, n) - 1)) / (r - 1);
  };
  /** Max affordable count given money */
  U.maxAffordable = (base, r, owned, money) => {
    const first = base * Math.pow(r, owned);
    if (money < first) return 0;
    const n = Math.floor(Math.log((money * (r - 1)) / first + 1) / Math.log(r));
    return Math.max(0, Math.min(n, 100000));
  };

  /* ------------------------------------------------------------------ rng */
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(U.rand(a, b + 1));
  U.chance = (p) => Math.random() < p;
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.weighted = (items, wf) => {
    let tot = 0;
    for (const it of items) tot += Math.max(0, wf(it));
    let r = Math.random() * tot;
    for (const it of items) {
      r -= Math.max(0, wf(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  };
  U.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  /** deterministic rng (mulberry32) for procedural art */
  U.seeded = (seed) => {
    let a = typeof seed === 'string' ? U.hash(seed) : seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  /* ------------------------------------------------------------------ formatting */
  const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];
  U.notation = 'short'; // 'short' | 'sci' | 'eng'

  function sig(x, digits) {
    // show 3 significant digits, trimming zeros
    if (x >= 100) return x.toFixed(digits >= 3 ? 0 : 0);
    if (x >= 10) return x.toFixed(1).replace(/\.0$/, '');
    return x.toFixed(2).replace(/\.?0+$/, '');
  }

  U.fmt = (n, opts) => {
    if (n === undefined || n === null || Number.isNaN(n)) return '0';
    if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
    const neg = n < 0;
    n = Math.abs(n);
    let s;
    if (n < 1000) {
      if (opts && opts.int) s = Math.floor(n).toString();
      else if (n >= 100) s = Math.floor(n).toString();
      else if (n >= 10) s = n.toFixed(1).replace(/\.0$/, '');
      else if (n >= 1 || n === 0) s = n.toFixed(2).replace(/\.?0+$/, '') || '0';
      else if (n >= 0.01) s = n.toFixed(2).replace(/\.?0+$/, '');
      else s = n.toExponential(1);
    } else {
      const e = Math.floor(Math.log10(n));
      if (U.notation === 'sci' || (U.notation === 'short' && e >= SHORT.length * 3)) {
        const m = n / Math.pow(10, e);
        s = m.toFixed(2) + 'e' + e;
      } else if (U.notation === 'eng') {
        const e3 = Math.floor(e / 3) * 3;
        s = sig(n / Math.pow(10, e3), 3) + 'e' + e3;
      } else {
        const i = Math.floor(e / 3);
        s = sig(n / Math.pow(10, i * 3), 3) + SHORT[i];
      }
    }
    return (neg ? '-' : '') + s;
  };
  U.fmtInt = (n) => (n < 1e6 ? Math.floor(n).toLocaleString('en-US') : U.fmt(n));
  U.fmtMoney = (n) => (n < 0 ? '-$' + U.fmt(-n) : '$' + U.fmt(n));

  const SI = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'];
  U.fmtSI = (n, unit) => {
    if (!Number.isFinite(n) || n <= 0) return '0 ' + unit;
    const e = Math.floor(Math.log10(n));
    if (U.notation === 'sci' || e >= SI.length * 3 || e < 0) {
      if (e < 3 && e >= 0) return sig(n, 3) + ' ' + unit;
      return (n / Math.pow(10, e)).toFixed(2) + 'e' + e + ' ' + unit;
    }
    const i = Math.floor(e / 3);
    return sig(n / Math.pow(10, i * 3), 3) + ' ' + SI[i] + unit;
  };
  U.fmtFlops = (n) => U.fmtSI(n, 'FLOP/s');
  U.fmtFlop = (n) => {
    if (!Number.isFinite(n) || n <= 0) return '0 FLOP';
    const e = Math.floor(Math.log10(n));
    return (n / Math.pow(10, e)).toFixed(2).replace(/\.00$/, '') + 'e' + e + ' FLOP';
  };
  U.fmtTokens = (n) => U.fmt(n) + ' tok';
  U.fmtParams = (n) => {
    if (n < 1e3) return Math.round(n) + '';
    if (n < 1e6) return sig(n / 1e3, 3) + 'K';
    if (n < 1e9) return sig(n / 1e6, 3) + 'M';
    if (n < 1e12) return sig(n / 1e9, 3) + 'B';
    if (n < 1e15) return sig(n / 1e12, 3) + 'T';
    return U.fmt(n);
  };
  U.fmtWatts = (n) => U.fmtSI(n, 'W');
  U.fmtPct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  U.fmtMult = (x) => '×' + (x >= 1000 ? U.fmt(x) : x >= 10 ? x.toFixed(1).replace(/\.0$/, '') : x.toFixed(2).replace(/\.?0+$/, ''));
  U.fmtTime = (s) => {
    if (!Number.isFinite(s)) return '∞';
    if (s < 0) s = 0;
    if (s < 60) return s < 10 ? s.toFixed(1) + 's' : Math.floor(s) + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm ' + Math.floor(s % 60) + 's';
    if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
    if (s < 86400 * 365) return Math.floor(s / 86400) + 'd ' + Math.floor((s % 86400) / 3600) + 'h';
    return U.fmt(s / (86400 * 365)) + 'y';
  };
  U.fmtDate = (ym) => {
    // ym = fractional year e.g. 2027.25
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const y = Math.floor(ym);
    const m = U.clamp(Math.floor((ym - y) * 12), 0, 11);
    return M[m] + ' ' + y;
  };
  U.plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  U.escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------------ event bus */
  const listeners = {};
  G.bus = {
    on(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
      return () => {
        listeners[type] = listeners[type].filter((f) => f !== fn);
      };
    },
    emit(type, payload) {
      const ls = listeners[type];
      if (ls) for (const fn of ls.slice()) {
        try { fn(payload); } catch (e) { console.error('bus', type, e); }
      }
      const any = listeners['*'];
      if (any) for (const fn of any) fn(type, payload);
    },
  };

  /* ------------------------------------------------------------------ dom */
  if (typeof document !== 'undefined') {
    U.$ = (sel, rootEl) => (rootEl || document).querySelector(sel);
    U.$$ = (sel, rootEl) => Array.from((rootEl || document).querySelectorAll(sel));
    /** hyperscript: h('div.cls#id', {attrs, on:{click}}, children...) */
    U.h = (tag, attrs, ...children) => {
      let m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
      const el = document.createElement((m && m[1]) || 'div');
      if (m && m[2]) {
        m[2].replace(/([.#])([\w-]+)/g, (_, t, v) => {
          if (t === '.') el.classList.add(v);
          else el.id = v;
        });
      }
      if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
        children.unshift(attrs);
        attrs = null;
      }
      if (attrs) {
        for (const k in attrs) {
          const v = attrs[k];
          if (v === undefined || v === null || v === false) continue;
          if (k === 'on') for (const ev in v) el.addEventListener(ev, v[ev]);
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else if (k === 'html') el.innerHTML = v;
          else if (k === 'text') el.textContent = v;
          else if (k === 'cls') el.className += ' ' + v;
          else if (k === 'data') for (const d in v) el.dataset[d] = v[d];
          else el.setAttribute(k, v === true ? '' : v);
        }
      }
      const add = (c) => {
        if (c === null || c === undefined || c === false) return;
        if (Array.isArray(c)) c.forEach(add);
        else if (c instanceof Node) el.appendChild(c);
        else el.appendChild(document.createTextNode(String(c)));
      };
      children.forEach(add);
      return el;
    };
    /** set text only if it changed (avoids layout thrash) */
    U.setText = (el, txt) => {
      if (el && el._t !== txt) {
        el._t = txt;
        el.textContent = txt;
      }
    };
    U.setHTML = (el, html) => {
      if (el && el._h !== html) {
        el._h = html;
        el.innerHTML = html;
      }
    };
    U.toggleClass = (el, cls, on) => {
      if (!el) return;
      const has = el.classList.contains(cls);
      if (on && !has) el.classList.add(cls);
      else if (!on && has) el.classList.remove(cls);
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
