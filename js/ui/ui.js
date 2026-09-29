/* UI infrastructure: tooltips, toasts, banners, drops layer, top bar, event wiring. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const h = U.h;
  const UI = (G.UI = { buyAmt: 1 });

  /* ------------------------------------------------------------------ sprites in static html */
  UI.initSprites = () => {
    U.$$('img[data-sprite]').forEach((img) => { img.src = G.Sprites.url(img.dataset.sprite, 3); });
  };
  UI.icon = (name, scale, tint) => G.Sprites.url(name, scale || 3, tint);

  /* ------------------------------------------------------------------ tooltips */
  const tipEl = () => U.$('#tooltip');
  let tipTarget = null;
  UI.tip = (el, fn) => { el._tip = fn; return el; };
  const GENERIC = {
    money: () => {
      const D = G.D, S = G.S;
      return `<b>MONEY</b><br>Revenue: ${U.fmtMoney(D.revenue)}/s<br>Users: ${U.fmt(D.users)} × ARPU ${U.fmtMoney(D.arpu)}/s<br>Demand: ${U.fmt(D.usersDemand)} · Serving capacity: ${U.fmt(D.usersCap)}<hr>Total earned: ${U.fmtMoney(S.stats.totalMoney)}`;
    },
    compute: () => {
      const D = G.D;
      return `<b>COMPUTE</b><br>${U.fmtFlops(D.compute)} total${D.throttle < 1 ? `<br><span style="color:var(--red)">⚡ Power-throttled to ${U.fmtPct(D.throttle)}</span>` : ''}<br>MFU ${U.fmtPct(D.mfu)} · Training rate ${U.fmtFlop(D.trainRate)}/s<hr><span class="tl2">1 real second = 1 simulated hour of training.</span>`;
    },
    data: () => {
      const D = G.D, S = G.S;
      return `<b>DATA</b><br>Dataset: ${U.fmtTokens(S.tokens)}<br>+${U.fmt(D.tokenRate)} tokens/s<br>Human text used: ${U.fmtPct(Math.min(1, S.humanTokens / D.humanPool), 1)} of ${U.fmt(D.humanPool)}${D.dataWall ? '<br><span style="color:var(--red)">DATA WALL reached</span>' : ''}`;
    },
    rp: () => {
      const D = G.D;
      return `<b>RESEARCH POINTS</b><br>+${U.fmt(D.rpRate)} RP/s<br>Human researchers: ${U.fmt(D.rpHuman)}/s<br>Automated (AI agents): ${U.fmt(D.rpAuto)}/s<br>AI R&D multiplier: ${U.fmtMult(D.rdMult)}`;
    },
    ap: () => {
      const D = G.D, S = G.S;
      return `<b>ALIGNMENT</b><br>Safety margin: <b>${U.fmtPct(Math.min(3, D.safety))}</b><br>Alignment score ${D.alignEffective.toFixed(0)} / required ${D.alignReq.toFixed(0)}<br>+${U.fmt(D.apRate)} AP/s (total ${U.fmt(S.ap)})<br>CoT monitoring ${U.fmtPct(D.cotMon)} · Eval awareness ${U.fmtPct(D.evalAware)}${D.revealMisalign ? `<br>Hidden misalignment: ${S.misalign.toFixed(0)}%` : ''}<hr><span class="tl2">Below 100%, incidents happen and hidden misalignment grows. It matters at superintelligence.</span>`;
    },
    straw: () => `<b>STRAWBERRIES 🍓</b><br>Catch 🍓 drops, earn achievements and pull duplicate cards.<br>Spend them on Lore Crates in the CARDS tab.`,
    packs: () => `<b>LORE CRATES</b><br>${Object.entries(G.S.packs).filter(([, n]) => n > 0).map(([k, n]) => `${G.PACKS[k].name}: ${n}`).join('<br>') || 'None — catch floating crates!'}<br><span class="tl2">Click to open.</span>`,
    autoalloc: () => `<b>AUTO ALLOCATION</b><br>Automatically gives serving just enough compute to meet user demand (max 80%), and the rest to training. Research/alignment shares are always set by you.`,
  };
  function findTip(el) {
    while (el && el !== document.body) {
      if (el._tip) return el._tip;
      if (el.dataset && el.dataset.tip && GENERIC[el.dataset.tip]) return GENERIC[el.dataset.tip];
      el = el.parentElement;
    }
    return null;
  }
  UI.initTooltips = () => {
    document.addEventListener('mousemove', (e) => {
      const el = tipEl();
      const fn = findTip(e.target);
      if (!fn) {
        el.style.display = 'none';
        tipTarget = null;
        return;
      }
      tipTarget = fn;
      el.innerHTML = fn();
      el.style.display = 'block';
      const w = el.offsetWidth, hh = el.offsetHeight;
      let x = e.clientX + 16, y = e.clientY + 16;
      if (x + w > window.innerWidth - 6) x = e.clientX - w - 12;
      if (y + hh > window.innerHeight - 6) y = window.innerHeight - hh - 6;
      el.style.left = x + 'px';
      el.style.top = Math.max(4, y) + 'px';
    });
    document.addEventListener('mouseleave', () => { tipEl().style.display = 'none'; });
  };
  UI.refreshTip = () => {
    if (tipTarget && tipEl().style.display === 'block') tipEl().innerHTML = tipTarget();
  };

  /* ------------------------------------------------------------------ toasts & banner */
  UI.toast = (text, kind, ms) => {
    const box = U.$('#toasts');
    while (box.childElementCount > 2) box.firstChild.remove();
    const t = h('div.toast.' + (kind || 'info'), text);
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || (kind === 'bad' ? 5000 : 3000));
    return t;
  };
  let bannerTimer = 0;
  UI.banner = (kicker, title, textStr) => {
    const b = U.$('#banner');
    U.$('#bannerK').textContent = kicker || '';
    U.$('#bannerT').textContent = title || '';
    U.$('#bannerX').textContent = textStr || '';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.remove('show'), 3500);
  };

  /* ------------------------------------------------------------------ drops layer */
  const dropEls = new Map();
  UI.updateDrops = () => {
    const S = G.S;
    const layer = U.$('#drops');
    const live = new Set();
    for (const d of S.drops) {
      live.add(d.id);
      let el = dropEls.get(d.id);
      if (!el) {
        const sprite = { crate: 'crate', strawberry: 'strawberry', apple: 'apple', gpu: 'gpu', coin: 'coin', rocket: 'rocket', brain: 'brain' }[d.type] || 'drop_default';
        el = h('div.drop.' + d.type, h('img', { src: UI.icon(sprite, 4), draggable: 'false' }));
        UI.tip(el, () => `<b>${d.name}</b><br>Click to grab!`);
        el.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          catchDrop(d, e.clientX, e.clientY);
        });
        const rng = U.seeded(Math.floor(d.seed * 1e9));
        el._path = { x0: rng() < 0.5 ? -0.05 : 1.05, y0: 0.2 + rng() * 0.6, y1: 0.15 + rng() * 0.7, amp: 0.04 + rng() * 0.08, freq: 1 + rng() * 2 };
        el._path.x1 = el._path.x0 < 0 ? 1.05 : -0.05;
        layer.appendChild(el);
        dropEls.set(d.id, el);
        G.Audio.drop();
      }
      const p = el._path;
      const k = 1 - d.life / d.max;
      const x = U.lerp(p.x0, p.x1, k) * window.innerWidth;
      const y = (U.lerp(p.y0, p.y1, k) + Math.sin(k * Math.PI * 2 * p.freq) * p.amp) * window.innerHeight;
      el.style.left = x - 28 + 'px';
      el.style.top = y - 28 + 'px';
      U.toggleClass(el, 'fade', d.life < 2.5 && Math.floor(d.life * 6) % 2 === 0);
    }
    for (const [id, el] of dropEls) if (!live.has(id)) { el.remove(); dropEls.delete(id); }
  };
  function catchDrop(d, x, y) {
    const res = G.Sim.catchDrop(d.id);
    if (!res) return;
    G.Audio.catch();
    G.FX.burst(x, y, { n: 30, colors: d.type === 'crate' ? ['#ffb938', '#ffe45c', '#ffffff', '#b04dff'] : ['#ff5cc8', '#ffe45c', '#3ee6ff', '#ffffff'] });
    G.FX.float(x, y - 20, res.text, 'big');
    if (d.type === 'coin') G.FX.flyTo(x, y, U.$('.res.money'), { n: 10 });
    if (d.type === 'strawberry') G.FX.flyTo(x, y, U.$('.res.straw'), { n: 5, color: '#ff5c8a', color2: '#a81d3c' });
    if (d.type === 'apple') G.FX.flyTo(x, y, U.$('.res.rp'), { n: 6, color: '#c89bff', color2: '#5f2aa8' });
    if (res.pack) {
      if (G.S.settings.skipPackAnim) {
        const r = G.Sim.openPack(res.pack);
        if (r) UI.toast(`${r.rarity.name}: ${r.card.name}${r.isNew ? ' (NEW!)' : ` ×${r.count}`}`, 'good');
      } else setTimeout(() => G.Pack.open(res.pack), 250);
    }
  }

  /* ------------------------------------------------------------------ top bar */
  const R = {};
  UI.initTop = () => {
    for (const id of ['rMoney', 'rMoneyR', 'rFlops', 'rFlopsR', 'rData', 'rDataR', 'rRP', 'rRPR', 'rAP', 'rAPR', 'rStraw', 'dateTxt', 'eraTxt', 'packCount', 'eraBadge', 'clickVal']) R[id] = document.getElementById(id);
    U.$('#packBtn').addEventListener('click', () => {
      G.Audio.tab();
      if (G.Sim.totalPacks() > 0) G.Pack.open('legendary');
      else { UI.showTab('cards'); UI.toast('No crates yet — catch floating crates or buy them with 🍓.', 'info'); }
    });
    U.$('#muteBtn').addEventListener('click', () => {
      G.Audio.setMuted(!G.Audio.isMuted());
      U.$('#muteBtn').textContent = G.Audio.isMuted() ? '✕' : '♪';
    });
    U.$('#setBtn').addEventListener('click', () => G.Modals.settings());
  };
  UI.updateTop = () => {
    const S = G.S, D = G.D;
    U.setText(R.rMoney, U.fmtMoney(S.money));
    U.setText(R.rMoneyR, '+' + U.fmtMoney(D.revenue) + '/s');
    U.setText(R.rFlops, U.fmtFlops(D.compute).replace(' FLOP/s', ''));
    U.setText(R.rFlopsR, 'FLOP/s' + (D.throttle < 1 ? ' ⚡' + Math.round(D.throttle * 100) + '%' : ''));
    U.toggleClass(R.rFlops.closest('.res'), 'warn', D.throttle < 1);
    U.setText(R.rData, U.fmt(S.tokens));
    U.setText(R.rDataR, D.dataWall && D.tokenRate === 0 ? 'DATA WALL' : '+' + U.fmt(D.tokenRate) + ' tok/s');
    U.setText(R.rRP, U.fmt(S.rp));
    U.setText(R.rRPR, '+' + U.fmt(D.rpRate) + ' RP/s');
    U.setText(R.rAP, D.alignReq > 0 ? Math.round(Math.min(3, D.safety) * 100) + '%' : U.fmt(S.ap));
    U.setText(R.rAPR, D.alignReq > 0 ? 'safety margin' : 'alignment');
    U.toggleClass(R.rAP.closest('.res'), 'warn', D.alignReq > 0 && D.safety < 1);
    U.setText(R.rStraw, U.fmtInt(S.strawberries));
    U.setText(R.dateTxt, U.fmtDate(D.date));
    const era = G.ERAS[D.era];
    U.setText(R.eraTxt, era.name);
    U.setText(R.eraBadge, era.name.toUpperCase() + ' · ' + era.years);
    const np = G.Sim.totalPacks();
    U.setText(R.packCount, np);
    R.packCount.style.display = np ? 'block' : 'none';
    U.toggleClass(U.$('#packBtn'), 'has', np > 0);
    U.setText(R.clickVal, '+' + U.fmtMoney(D.clickValue));
    document.body.className = 'era-' + D.era + (S.ending === 'misaligned' ? ' bad' : '') + (S.settings.reduceFx ? ' reduce-fx' : '');
  };

  /* ------------------------------------------------------------------ bus wiring */
  UI.wire = () => {
    const bus = G.bus;
    bus.on('toast', (t) => {
      UI.toast(t.text, t.kind);
      if (t.kind === 'bad') G.Audio.bad();
    });
    bus.on('feed', (p) => {
      G.Panels.addPost(p);
      if (!p.mini && Math.random() < 0.5) G.Audio.tweet();
    });
    bus.on('mini', () => G.Audio.notify());
    bus.on('miniResolved', (e) => { G.Panels.resolvePost(e.postId, e.success); if (e.success) G.Audio.achievement(); });
    bus.on('milestone', (m) => {
      UI.banner(m.ai27 ? 'AI 2027 · ' + U.fmtDate(m.date) : U.fmtDate(m.date), m.title, m.text);
      G.Audio.milestone();
      if (!G.S.settings.reduceFx) G.FX.confetti(80);
    });
    bus.on('achievement', (a) => {
      UI.toast(`🏆 ACHIEVEMENT: ${a.name} — ${a.desc}`, 'ach');
      G.Audio.achievement();
      UI.markTab('stats');
      if (root.steam) root.steam.activateAchievement('ACH_' + a.id.toUpperCase()).catch(() => {});
    });
    bus.on('objective', (o) => { UI.toast(`✔ OBJECTIVE: ${o.text}`, 'good'); G.Audio.notify(); });
    bus.on('train:done', (m) => { G.Audio.trainDone(); UI.markTab('train'); });
    bus.on('deploy', (m) => {
      const p = G.Scene.orbScreenPos();
      G.FX.burst(p.x, p.y, { n: 40, colors: ['#ffe45c', '#ffffff', '#5cf27a'] });
      UI.toast(`🚀 Deployed ${m.name} — capability ${Math.round(G.D.cap)}`, 'good');
    });
    bus.on('sota', () => { UI.banner('LMARENA', '#1 — STATE OF THE ART', 'Your model tops the leaderboard. The timeline goes wild.'); G.Audio.milestone(); });
    bus.on('buy', () => G.Audio.buy());
    bus.on('upgrade', () => G.Audio.bigBuy());
    bus.on('research', (r) => {
      G.Audio.bigBuy();
      UI.toast(`🔬 Researched: ${r.name}`, 'good');
      if (['scaling_laws', 'strawberry', 'cot', 'computer', 'oversight', 'rlscale', 'thinklong', 'selfconsist', 'prm'].includes(r.id)) setTimeout(UI.rebuild, 50);
    });
    bus.on('product', (p) => { G.Audio.milestone(); UI.toast(`📦 Launched: ${G.Sim.productName(p)}`, 'good'); });
    bus.on('incident', () => { G.Audio.alarm(); G.FX.shake(U.$('#app'), 6); });
    bus.on('story', () => G.Modals.checkStory());
    bus.on('rivalRelease', () => {});
    bus.on('dropCaught', () => {});
    bus.on('prestige', (e) => { G.Hist.data = []; G.Modals.reset(); G.Audio.prestige(); G.FX.confetti(200); if (e.challenge) UI.banner('CHALLENGE', e.challenge.name.toUpperCase(), e.challenge.rules); else UI.banner('THE BITTER LESSON', `+${e.gain} BITTER LESSONS`, 'General methods that leverage computation are ultimately the most effective.'); UI.rebuild(); });
    bus.on('omega', (e) => { G.Hist.data = []; G.Modals.reset(); G.Audio.asi(); G.FX.confetti(300); UI.banner('OMEGA POINT', `+${e.gain} Ω`, 'A new universe begins. It remembers you.'); UI.rebuild(); });
    bus.on('asi', () => G.Modals.asi());
    bus.on('era', (e) => {
      G.Audio.Music.setTheme(G.Scene.themeFor(G.S, G.D));
      UI.rebuild();
      if (root.steam) root.steam.setRichPresence(`${G.ERAS[e.era].name} · ${G.LABS[G.S.lab].name}`).catch(() => {});
    });
    bus.on('powerUnlocked', () => { UI.markTab('compute'); UI.rebuild(); });
    bus.on('datawall', () => UI.markTab('data'));
    bus.on('labUnlocked', () => {});
    bus.on('challengeDone', (c) => { UI.banner('CHALLENGE COMPLETE', c.name.toUpperCase(), c.reward); G.FX.confetti(200); G.Audio.milestone(); });
    bus.on('project', (p) => { G.Audio.milestone(); UI.banner('MEGAPROJECT', p.name.toUpperCase(), G.S.ending === 'misaligned' ? p.misaligned : p.aligned); G.FX.confetti(120); });
    bus.on('packOpened', (r) => { if (r.rarity.idx >= 3) UI.markTab('cards'); });
    bus.on('buff', (b) => {});
  };

  /* ------------------------------------------------------------------ tabs registry (filled in tabs.js) */
  UI.tabs = [];
  UI.current = 'compute';
  UI.markTab = (id) => {
    if (UI.current === id) return;
    const t = U.$('#tab-' + id);
    if (t) t.classList.add('alert');
  };
  UI.showTab = (id) => {
    const tab = UI.tabs.find((t) => t.id === id);
    if (!tab || !tab.unlocked()) return;
    UI.current = id;
    U.$$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === id));
    U.$$('.tabpage').forEach((p) => p.classList.toggle('on', p.dataset.id === id));
    const t = U.$('#tab-' + id);
    if (t) t.classList.remove('alert');
    if (tab.onShow) tab.onShow();
    tab.update && tab.update(true);
  };
  UI.buildTabs = () => {
    const nav = U.$('#tabs');
    const body = U.$('#tabBody');
    nav.innerHTML = '';
    body.innerHTML = '';
    for (const t of UI.tabs) {
      const btn = h('button.tab', { id: 'tab-' + t.id, data: { id: t.id } }, t.name, h('span.dot'));
      btn.addEventListener('click', () => { G.Audio.tab(); UI.showTab(t.id); });
      nav.appendChild(btn);
      const page = h('div.tabpage', { data: { id: t.id } });
      t.page = page;
      t.build(page);
      body.appendChild(page);
    }
    UI.refreshTabLocks();
    if (!UI.tabs.find((t) => t.id === UI.current && t.unlocked())) UI.current = 'compute';
    UI.showTab(UI.current);
  };
  UI.refreshTabLocks = () => {
    for (const t of UI.tabs) {
      const btn = U.$('#tab-' + t.id);
      if (!btn) continue;
      const un = t.unlocked();
      if (btn.classList.contains('locked') && un) {
        btn.classList.remove('locked');
        btn.classList.add('alert');
        UI.toast(`New tab unlocked: ${t.name}`, 'good');
      }
      U.toggleClass(btn, 'locked', !un);
    }
  };
  UI.rebuild = () => {
    for (const t of UI.tabs) if (t.page) { t.page.innerHTML = ''; t.build(t.page); }
    UI.refreshTabLocks();
    UI.showTab(UI.current);
    G.Panels.rebuild();
  };
  UI.updateTabs = () => {
    const t = UI.tabs.find((x) => x.id === UI.current);
    if (t && t.update) t.update(false);
  };
})(typeof window !== 'undefined' ? window : globalThis);
