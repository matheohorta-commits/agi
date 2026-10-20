/* UI infrastructure: tooltips, toasts, banners, drops layer, top bar, event wiring. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const h = U.h;
  const UI = (G.UI = { buyAmt: 1 });

  /* ------------------------------------------------------------------ sprites in static html */
  UI.initSprites = () => {
    U.$$('img[data-sprite]').forEach((img) => { img.src = G.Sprites.url(img.dataset.sprite, +img.dataset.scale || 3); });
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
    combo: () => {
      const S = G.S, D = G.D;
      const rows = S.buffs.map((b) => `${b.name}: ${buffFx(b)} · ${Math.ceil(b.left)}s`);
      return `<b>ACTIVE COMBO</b><br>${rows.join('<br>') || 'No buffs active.'}<hr>Revenue ×${U.fmt(D.comboMoney)} · Clicks ×${U.fmt(D.comboClick)}<div class="tl2">Buffs multiply each other. Stack drops and abilities for huge combos.</div>`;
    },
    insight: () => {
      const ins = G.S.insight;
      const left = G.STRAT.INSIGHT_SECONDS - ins.t;
      return `<b>◆ INSIGHTS</b><br>${ins.n} available · ${ins.total} earned<br>Next in ${Math.floor(left / 60)}m ${Math.floor(left % 60)}s<hr><span class="tl2">Spend them in STRATEGY → INSIGHTS to level up buildings (permanent).</span>`;
    },
    era: () => {
      const D = G.D, era = G.ERAS[D.era];
      return `<b>${era.name.toUpperCase()}</b> · ${era.years}<br>${U.fmtDate(D.date)}<hr>Era progress: ${U.fmtPct(eraProgress())}<div class="tl2">${D.era < 5 ? 'Eras advance with your best capability. Each era changes the lab, the music and the news.' : 'Post-ASI eras advance with cosmic energy and the stars you reach.'}</div>`;
    },
    track: () => {
      const n = nextMilestone();
      return `<b>ROAD TO SUPERINTELLIGENCE</b><br>Every diamond is a milestone of the real AI timeline (cyan = AI 2027). Reach the capability to unlock it — most give rewards.<hr>${n ? `Next: <b>${U.escape(n.title)}</b> at capability ${n.cap}<br>You: ${G.D.bestCap.toFixed(1)}` : 'All milestones reached.'}<div class="tl2">Hover a diamond for details.</div>`;
    },
    vibes: () => {
      const S = G.S, D = G.D;
      return `<b>THE VIBES ${S.vibe > 0 ? '+' : ''}${S.vibe.toFixed(0)}</b><br>Public sentiment about AI and your lab.<br>User demand ${U.fmtMult(D.vibeMult)}<hr><span class="tl2">Vagueposting, launches and SOTA releases push it up. Incidents and outages drag it down. It drifts back to neutral.</span>`;
    },
    ticker: () => (G.UI.tickerLeak() ? '<b>🍎 LEAK!</b><br>Click the headline before it disappears.' : '<b>NEWS TICKER</b><br>Headlines change as you progress. Watch for 🍎 leaks — they are clickable.'),
  };
  function buffFx(b) {
    const parts = [];
    for (const [k, lbl] of [['money', 'revenue'], ['compute', 'compute'], ['users', 'users'], ['click', 'clicks'], ['rp', 'RP'], ['data', 'data'], ['trainSpeed', 'training'], ['hwCost', 'hardware cost']]) {
      if (b[k] && b[k] !== 1) parts.push(`${lbl} ×${U.fmt(b[k])}`);
    }
    return parts.join(', ') || 'special';
  }
  UI.buffFx = buffFx;
  UI.tickerLeak = () => !!TK.leak;
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
  /* toasts stack in the bottom-right corner (never over the shop); a repeated message bumps a ×N counter */
  UI.toast = (text, kind, ms) => {
    const box = U.$('#toasts');
    const life = ms || (kind === 'bad' ? 5500 : 3500);
    const same = [...box.children].find((x) => x._text === text && !x.classList.contains('out'));
    if (same) {
      same._n = (same._n || 1) + 1;
      U.setText(same._cnt, '×' + same._n);
      clearTimeout(same._timer);
      same._timer = setTimeout(() => dismiss(same), life);
      return same;
    }
    while (box.childElementCount > 2) box.firstChild.remove();
    const cnt = h('span.tcnt');
    const t = h('div.toast.' + (kind || 'info'), h('span.ttx', text), cnt);
    t._text = text;
    t._cnt = cnt;
    t.addEventListener('click', () => dismiss(t));
    box.appendChild(t);
    t._timer = setTimeout(() => dismiss(t), life);
    return t;
  };
  function dismiss(t) {
    if (t.classList.contains('out')) return;
    t.classList.add('out');
    setTimeout(() => t.remove(), 320);
  }
  /* big announcements: one at a time, queued so they never overwrite each other */
  const bannerQ = [];
  let bannerBusy = false;
  UI.banner = (kicker, title, textStr) => {
    if (bannerQ.length >= 3) bannerQ.shift();
    bannerQ.push([kicker, title, textStr]);
    if (!bannerBusy) nextBanner();
  };
  function nextBanner() {
    const next = bannerQ.shift();
    const b = U.$('#banner');
    if (!next) { bannerBusy = false; return; }
    bannerBusy = true;
    U.$('#bannerK').textContent = next[0] || '';
    U.$('#bannerT').textContent = next[1] || '';
    U.$('#bannerX').textContent = next[2] || '';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    setTimeout(() => { b.classList.remove('show'); setTimeout(nextBanner, 150); }, 2900);
  }

  /* ------------------------------------------------------------------ news ticker */
  const TK = { left: 2, leak: null, lastLeak: -1e9, el: null };
  UI.initTicker = () => {
    TK.el = U.$('#tkText');
    TK.el.addEventListener('click', () => {
      if (!TK.leak) return;
      const kind = TK.leak;
      TK.leak = null;
      const text = G.Sim.catchLeak(kind);
      const r = TK.el.getBoundingClientRect();
      G.Audio.catch();
      G.FX.burst(r.left + 60, r.top + 10, { n: 24, colors: ['#ff4d6d', '#ffe45c', '#5cf27a', '#ffffff'] });
      G.FX.float(r.left + 120, r.top + 30, text, 'big');
      TK.left = 0.6;
    });
  };
  function fillTicker(t) {
    const S = G.S, D = G.D;
    const rivals = Object.keys(S.rivals || {}).filter((id) => S.rivals[id].cap > 0);
    const vars = {
      model: D.model ? D.model.name : 'a tiny RNN', lab: (G.LABS[S.lab] || {}).name || 'your lab',
      rival: rivals.length ? G.LABS[U.pick(rivals)].name : 'a rival lab', users: U.fmt(Math.max(1, D.users)),
      cap: Math.round(D.cap), money: U.fmtMoney(S.stats.totalMoney),
    };
    return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
  }
  UI.updateTicker = (dt) => {
    if (!TK.el) return;
    TK.left -= dt;
    if (TK.left > 0) return;
    const S = G.S, D = G.D, cap = D.bestCap;
    const now = S.stats.playTime;
    let text, leak = null;
    if (cap >= 25 && now - TK.lastLeak > 75 && Math.random() < 0.12) {
      const L = U.pick(G.TICKER_LEAKS);
      text = L[0];
      leak = L[1];
      TK.lastLeak = now;
    } else {
      const pool = G.TICKER.filter((x) => cap >= x[1] && cap <= x[2]);
      text = fillTicker(U.weighted(pool.length ? pool : G.TICKER, (x) => x[3])[0]);
    }
    TK.leak = leak;
    TK.left = leak ? 9 : 12;
    TK.el.textContent = text;
    TK.el.className = leak ? 'leak' : '';
    U.setText(U.$('#tkLabel'), leak ? 'LEAK' : cap >= 500 ? 'COSMIC NEWS' : 'NEWS');
    U.toggleClass(U.$('#ticker'), 'leak', !!leak);
    TK.el.classList.remove('in'); void TK.el.offsetWidth; TK.el.classList.add('in');
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
        const sprite = { crate: 'crate', strawberry: 'strawberry', apple: 'apple', gpu: 'gpu', coin: 'coin', rocket: 'rocket', brain: 'brain', storm: 'lightning', boom: 'factory' }[d.type] || 'drop_default';
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
    for (const id of ['rMoney', 'rMoneyR', 'rFlops', 'rFlopsR', 'rData', 'rDataR', 'rRP', 'rRPR', 'rAP', 'rAPR', 'rStraw', 'dateTxt', 'eraTxt', 'packCount', 'eraBadge', 'clickVal', 'clickVal2', 'combo', 'insChip', 'rIns', 'rInsR', 'eraProg', 'trackFill', 'trackMe', 'trackTicks', 'trackEras', 'trackNextT', 'trackNextS', 'sbPlay', 'sbLab', 'sbSave']) R[id] = document.getElementById(id);
    initTrack();
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
    const combo = Math.max(D.comboMoney, D.comboClick);
    U.setText(R.combo, combo > 1.01 ? '×' + U.fmt(combo) : '');
    U.toggleClass(R.combo, 'on', combo > 1.01);
    U.toggleClass(R.combo, 'huge', combo >= 49);
    const fl = U.fmtFlops(D.compute), sp = fl.lastIndexOf(' ');
    U.setText(R.rFlops, fl.slice(0, sp));
    U.setText(R.rFlopsR, fl.slice(sp + 1) + (D.throttle < 1 ? ' ⚡' + Math.round(D.throttle * 100) + '%' : ''));
    U.toggleClass(R.rFlops.closest('.res'), 'warn', D.throttle < 1);
    U.setText(R.rData, U.fmt(S.tokens));
    U.setText(R.rDataR, D.dataWall && D.tokenRate === 0 ? 'DATA WALL' : '+' + U.fmt(D.tokenRate) + '/s');
    U.setText(R.rRP, U.fmt(S.rp));
    U.setText(R.rRPR, '+' + U.fmt(D.rpRate) + '/s');
    U.setText(R.rAP, D.alignReq > 0 ? Math.round(Math.min(3, D.safety) * 100) + '%' : U.fmt(S.ap));
    U.setText(R.rAPR, D.alignReq > 0 ? 'safety margin' : 'alignment');
    U.toggleClass(R.rAP.closest('.res'), 'warn', D.alignReq > 0 && D.safety < 1);
    U.setText(R.rStraw, U.fmtInt(S.strawberries));
    R.insChip.style.display = S.insight.unlocked ? '' : 'none';
    if (S.insight.unlocked) {
      U.setText(R.rIns, '◆ ' + S.insight.n);
      const left = G.STRAT.INSIGHT_SECONDS - S.insight.t;
      U.setText(R.rInsR, 'next ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'));
    }
    U.setText(R.dateTxt, U.fmtDate(D.date));
    const era = G.ERAS[D.era];
    U.setText(R.eraTxt, era.name);
    U.setText(R.eraBadge, era.name.toUpperCase() + ' · ' + era.years);
    const np = G.Sim.totalPacks();
    U.setText(R.packCount, np);
    R.packCount.style.display = np ? 'block' : 'none';
    U.toggleClass(U.$('#packBtn'), 'has', np > 0);
    U.setText(R.clickVal, '+' + U.fmtMoney(D.clickValue));
    U.setText(R.clickVal2, '+' + U.fmtMoney(D.clickValue));
    R.eraProg.style.width = (eraProgress() * 100).toFixed(1) + '%';
    updateTrack();
    U.setText(R.sbLab, (G.LABS[S.lab] || {}).name || '');
    U.setText(R.sbPlay, '⏱ ' + U.fmtTime(S.stats.playTime));
    document.body.className = 'era-' + D.era + (S.ending === 'misaligned' ? ' bad' : '') + (S.settings.reduceFx ? ' reduce-fx' : '');
  };

  /* ------------------------------------------------------------------ road to superintelligence */
  const ERA_COL = ['#b04dff', '#3fa7ff', '#10c28f', '#ff9b3d', '#3ee6ff', '#ffe45c'];
  /** milestones are evenly spaced on the track; capability interpolates between them */
  function capPos(cap) {
    const ms = G.MILESTONES, n = ms.length - 1;
    if (!(cap > ms[0].cap)) return 0;
    for (let i = 0; i < n; i++) if (cap < ms[i + 1].cap) return (i + (cap - ms[i].cap) / (ms[i + 1].cap - ms[i].cap)) / n;
    return 1;
  }
  const reached = (m) => (m.id === 'm_asi' ? !!G.S.flags.asi : !!G.S.milestones[m.id]);
  function nextMilestone() { return G.MILESTONES.find((m) => !reached(m)) || null; }
  function eraProgress() {
    const S = G.S, D = G.D, e = D.era;
    if (S.cosmos) {
      if (e === 5) return U.clamp((Math.log10(Math.max(1, S.cosmos.energy)) - 15) / 6, 0, 1);
      if (e === 6) return U.clamp(Math.log10(Math.max(1, S.cosmos.stars)) / 3, 0, 1);
      return 1;
    }
    const a = G.ERAS[e].cap, b = e >= 4 ? 500 : G.ERAS[e + 1].cap;
    return U.clamp((D.bestCap - a) / (b - a), 0, 1);
  }
  UI.eraProgress = eraProgress;
  UI.nextMilestone = nextMilestone;
  let trackSig = '';
  function initTrack() {
    R.trackTicks.innerHTML = '';
    R.trackEras.innerHTML = '';
    const eras = G.ERAS.filter((e) => e.cap < Infinity);
    eras.forEach((e, i) => {
      const a = capPos(e.cap), b = i + 1 < eras.length ? capPos(eras[i + 1].cap) : 1;
      R.trackEras.appendChild(h('div', { style: { left: a * 100 + '%', width: (b - a) * 100 + '%', background: ERA_COL[i] || '#fff' } }));
    });
    const n = G.MILESTONES.length - 1;
    G.MILESTONES.forEach((m, i) => {
      const t = h('div.tk' + (m.ai27 ? '.ai27' : ''), { style: { left: (i / n) * 100 + '%' } });
      t._m = m;
      UI.tip(t, () => {
        const done = reached(m);
        return `<b>${U.escape(m.title)}</b><br><span class="tiny">${U.fmtDate(m.date)} · capability ${m.cap}${m.ai27 ? ' · AI 2027' : ''}</span>` +
          (done ? `<div class="tl2">${U.escape(m.text)}</div><span style="color:var(--green)">✓ Reached</span>` : `<br><span style="color:var(--yellow)">Reach capability ${m.cap} (you: ${G.D.bestCap.toFixed(1)})</span>`);
      });
      R.trackTicks.appendChild(t);
    });
    trackSig = '';
  }
  function updateTrack() {
    const D = G.D;
    const p = capPos(D.bestCap) * 100;
    R.trackFill.style.width = p.toFixed(2) + '%';
    R.trackMe.style.left = p.toFixed(2) + '%';
    const next = nextMilestone();
    const sig = G.MILESTONES.map((m) => (reached(m) ? 1 : 0)).join('') + (next ? next.id : '');
    if (sig !== trackSig) {
      trackSig = sig;
      for (const t of R.trackTicks.children) {
        U.toggleClass(t, 'done', reached(t._m));
        U.toggleClass(t, 'next', t._m === next);
      }
    }
    if (next) {
      U.setText(R.trackNextT, next.title);
      U.setText(R.trackNextS, `capability ${D.bestCap.toFixed(D.bestCap < 100 ? 1 : 0)} / ${next.cap} · ${U.fmtDate(next.date)}`);
    } else {
      U.setText(R.trackNextT, G.S.omega && G.S.omega.count ? 'BEYOND THE OMEGA POINT' : 'THE OMEGA POINT AWAITS');
      U.setText(R.trackNextS, 'every milestone reached');
    }
  }
  /** brief "saved" pulse in the status bar */
  UI.savedFlash = () => {
    if (!R.sbSave) return;
    R.sbSave.textContent = '● saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    R.sbSave.classList.remove('flash'); void R.sbSave.offsetWidth; R.sbSave.classList.add('flash');
    setTimeout(() => R.sbSave.classList.remove('flash'), 900);
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
    bus.on('modelUpgrade', (e) => UI.banner('NEW MODEL DEPLOYED', e.m.name, `Capability ${e.prev.toFixed(1)} → ${e.cap.toFixed(1)}  (+${(e.cap - e.prev).toFixed(1)})`));
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
    bus.on('omega', (e) => { G.Hist.data = []; G.Modals.reset(); G.Audio.asi(); G.FX.confetti(300); UI.banner('OMEGA POINT · +' + e.gain + ' Ω', (e.universe ? e.universe.name : 'A NEW UNIVERSE').toUpperCase(), e.universe ? e.universe.desc : 'A new universe begins. It remembers you.'); UI.rebuild(); });
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
    // optimization layer
    bus.on('synergy', (sy) => { G.Audio.bigBuy(); UI.toast(`⇄ Synergy online: ${sy.name}`, 'good'); });
    bus.on('influencer', (f) => { G.Audio.milestone(); UI.toast(`📣 Hired ${f.name} — Hype now pays more`, 'good'); });
    bus.on('levelUp', (e) => {
      const it = G.Sim.item(e.kind, e.id);
      UI.toast(`◆ ${it ? it.name : e.id} reached level ${e.level}`, 'good');
      const opened = Object.entries(G.Sim.UNLOCKS).find(([, u]) => u.kind === e.kind && u.id === e.id);
      if (opened && e.level === 1) {
        const name = { board: 'THE BOARD OF ADVISORS', shog: 'THE SHOGGOTH', market: 'THE GPU EXCHANGE' }[opened[0]];
        UI.banner('NEW SYSTEM UNLOCKED', name, 'Find it in the STRATEGY tab.');
        G.Audio.milestone();
        UI.markTab('strategy');
      }
    });
    bus.on('shogLevel', (e) => { UI.banner('THE SHOGGOTH GROWS', 'LEVEL ' + e.level, e.aura ? 'New aura revealed: ' + e.aura.name : 'It seems pleased.'); G.FX.shake(U.$('#app'), 4); });
    bus.on('leak', (e) => UI.toast('🍎 ' + e.text, 'good'));
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
      const badge = h('span.badge');
      const btn = h('button.tab', { id: 'tab-' + t.id, data: { id: t.id } }, h('img', { src: UI.icon(TAB_ICON[t.id] || 'star', 1) }), h('span.tlab', t.name), badge, h('span.dot'));
      btn._badge = badge;
      btn.addEventListener('click', () => { G.Audio.tab(); UI.showTab(t.id); });
      UI.tip(btn, () => `<b>${t.name}</b>${BADGES[t.id] ? '<br><span class="tl2">Green number = things you can afford right now.</span>' : ''}`);
      nav.appendChild(btn);
      const page = h('div.tabpage', { data: { id: t.id } });
      t.page = page;
      t.build(page);
      body.appendChild(page);
    }
    UI.refreshTabLocks();
    if (!UI.tabs.find((t) => t.id === UI.current && t.unlocked())) UI.current = 'compute';
    UI.showTab(UI.current);
    fitTabs();
  };
  const TAB_ICON = { compute: 'chip', data: 'book', train: 'brain', research: 'flask', team: 'crowd', strategy: 'chess', products: 'rocket', cards: 'crate', race: 'trophy', lessons: 'scroll', cosmos: 'galaxy', stats: 'magnifier' };
  const canBuy = (kind, list) => list.filter((it) => G.Sim.unlocked(it.req) && G.S.money >= G.Sim.price(kind, it.id, 1)).length;
  const canUpg = (kinds) => G.BUILDING_UPGRADES.filter((u) => kinds.includes(u.kind) && G.Sim.upgradeAvailable(u) && G.S.money >= G.Sim.upgradeCost(u)).length;
  /** how many things on each tab you can afford right now (Cookie Clicker-style "buy me" counters) */
  const BADGES = {
    compute: () => canBuy('hw', G.HARDWARE) + (G.S.flags.power ? canBuy('power', G.POWER) : 0) + canUpg(['hw']),
    data: () => canBuy('src', G.DATASRC) + canUpg(['src']),
    team: () => canBuy('res', G.RESEARCHERS) + canBuy('safety', G.SAFETY) + canUpg(['res', 'safety']),
    research: () => G.RESEARCH.filter((r) => G.Sim.canResearch(r)).length,
    products: () => G.PRODUCTS.filter((p) => !G.S.products[p.id] && G.Sim.productUnlocked(p) && G.S.money >= G.Sim.productCost(p)).length,
    strategy: () => G.SYNERGIES.filter((sy) => G.Sim.synAvailable(sy) && G.S.money >= G.Sim.synCost(sy)).length + G.INFLUENCERS.filter((f) => G.Sim.inflAvailable(f) && G.S.money >= f.cost).length,
    cosmos: () => (G.S.cosmos ? G.COSMIC_STRUCTS.filter((st) => G.Sim.structUnlocked(st) && G.S.cosmos.joules >= G.Sim.structCost(st, 1)).length : 0),
    cards: () => G.Sim.totalPacks(),
  };
  let badgeSig = '';
  UI.updateTabBadges = () => {
    let sig = '';
    for (const t of UI.tabs) {
      const btn = U.$('#tab-' + t.id);
      if (!btn || !btn._badge || !BADGES[t.id] || btn.classList.contains('locked')) continue;
      let n = 0;
      try { n = BADGES[t.id](); } catch (e) { n = 0; }
      U.setText(btn._badge, n > 0 ? (n > 99 ? '99+' : String(n)) : '');
      sig += n > 0 ? (n > 9 ? 2 : 1) : 0;
    }
    if (sig !== badgeSig) { badgeSig = sig; fitTabs(); } // badges change the width the labels need
  };
  /** labels on every tab when they fit; otherwise icons only (active tab keeps its label) */
  function fitTabs() {
    const nav = U.$('#tabs');
    if (!nav) return;
    nav.classList.remove('compact');
    if (nav.scrollWidth > nav.clientWidth + 1) nav.classList.add('compact');
  }
  UI.fitTabs = fitTabs;
  if (typeof window !== 'undefined') window.addEventListener('resize', () => { try { fitTabs(); } catch (e) { /* not built yet */ } });
  UI.refreshTabLocks = () => {
    for (const t of UI.tabs) {
      const btn = U.$('#tab-' + t.id);
      if (!btn) continue;
      const un = t.unlocked();
      if (btn.classList.contains('locked') && un) {
        btn.classList.remove('locked');
        btn.classList.add('alert');
        UI.toast(`New tab unlocked: ${t.name}`, 'good');
        setTimeout(fitTabs, 0);
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
