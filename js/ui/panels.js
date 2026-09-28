/* Side panels: deployed model, benchmarks, training mini-chart, compute allocation, vibes, feed, objectives, buffs. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const h = U.h;
  const P = (G.Panels = {});

  /* ------------------------------------------------------------------ benchmarks */
  const BENCH = [
    { n: 'MMLU', c: 172, w: 16, floor: 25 },
    { n: 'GSM8K', c: 196, w: 14, floor: 0 },
    { n: 'HumanEval', c: 205, w: 14, floor: 0 },
    { n: 'GPQA', c: 238, w: 16, floor: 25 },
    { n: 'SWE-bench', c: 262, w: 16, floor: 0 },
    { n: 'ARC-AGI-2', c: 300, w: 18, floor: 0 },
    { n: 'FrontierMath', c: 322, w: 18, floor: 0 },
    { n: 'Humanity\'s Last Exam', c: 338, w: 20, floor: 0 },
    { n: 'AI R&D (RE-Bench)', c: 370, w: 20, floor: 0 },
    { n: 'Millennium Problems', c: 470, w: 25, floor: 0 },
    { n: 'Unified Physics', c: 620, w: 40, floor: 0 },
  ];
  G.benchScore = (b, cap) => b.floor + (100 - b.floor) * U.sigmoid((cap - b.c) / b.w * 2.2);
  G.metrHorizon = (cap) => Math.pow(2, (cap - 230) / 10); // minutes
  G.fmtHorizon = (min) => {
    if (min < 1) return Math.round(min * 60) + ' sec';
    if (min < 60) return min.toFixed(0) + ' min';
    if (min < 60 * 24) return (min / 60).toFixed(1) + ' hr';
    if (min < 60 * 24 * 30) return (min / 1440).toFixed(1) + ' days';
    if (min < 60 * 24 * 365) return (min / 43200).toFixed(1) + ' months';
    if (min < 60 * 24 * 365 * 1000) return (min / 525600).toFixed(0) + ' years';
    return '∞';
  };
  G.BENCH = BENCH;

  const E = {};
  P.init = () => {
    for (const id of ['modelName', 'capBig', 'capBar', 'modelSub', 'benches', 'rankBadge', 'trainBar', 'trainPct', 'trainEta', 'lossMini', 'allocBody', 'vibeKnob', 'vibeText', 'vibeNum', 'feed', 'objectives', 'buffs', 'buffPanel', 'autoAlloc']) E[id] = document.getElementById(id);
    // model panel interactions
    E.modelName.addEventListener('dblclick', () => {
      const S = G.S;
      if (S.deployed < 0) return;
      const n = prompt('Rename your model:', S.models[S.deployed].name);
      if (n) G.Sim.renameModel(S.deployed, n);
    });
    G.UI.tip(E.capBig, capTip);
    G.UI.tip(E.capBar, capTip);
    G.UI.tip(E.rankBadge, () => `<b>LEADERBOARD RANK</b><br>Rank #1 gives ×1.6 users. Lower ranks lose demand.<br>Rivals release new models over time — keep shipping.`);
    E.autoAlloc.addEventListener('change', () => { G.S.autoAlloc = E.autoAlloc.checked; P.buildAlloc(); });
    // scene click
    const sc = document.getElementById('sceneCanvas');
    sc.addEventListener('mousedown', (e) => {
      G.Audio.unlock();
      if (!G.Scene.hitOrb(e)) return;
      const r = G.Sim.click();
      G.Scene.pulse(r.crit);
      G.Audio.click(r.crit);
      G.FX.float(e.clientX, e.clientY - 10, '+' + U.fmtMoney(r.v) + (r.crit ? ' EUREKA!' : ''), r.crit ? 'crit' : '');
      if (Math.random() < 0.35 || r.crit) G.FX.flyTo(e.clientX, e.clientY, U.$('.res.money'), { n: r.crit ? 8 : 1 });
      if (r.crit) G.FX.burst(e.clientX, e.clientY, { n: 16 });
    });
    P.rebuild();
  };
  P.rebuild = () => {
    P.buildAlloc();
    E.feed.innerHTML = '';
    const S = G.S;
    for (const p of S.feed.slice(0, 30).reverse()) P.addPost(p, true);
  };

  function capTip() {
    const D = G.D;
    const rows = [
      ['Pretraining (scaling laws)', D.capPre, '#b04dff'],
      ['RL post-training', D.capRL, '#ff9b3d'],
      ['Test-time compute (reasoning)', D.capTTC, '#ff5cc8'],
      ['Test-time training', D.capTTT, '#3ee6ff'],
      ['Agents & swarms', D.capAgents, '#ffe45c'],
      ['Other (RLHF, cards, research)', D.capFlat, '#5cf27a'],
    ];
    return `<b>CAPABILITY ${D.cap.toFixed(1)}</b><br>` + rows.map(([n, v, c]) => `<span style="color:${c}">■</span> ${n}: ${v.toFixed(1)}`).join('<br>') +
      `<hr>METR time horizon: <b>${G.fmtHorizon(G.metrHorizon(D.cap))}</b><br>Best this run: ${D.bestCap.toFixed(1)}`;
  }

  /* ------------------------------------------------------------------ model panel update */
  P.updateModel = () => {
    const S = G.S, D = G.D;
    const m = D.model;
    U.setText(E.modelName, m ? m.name : '— no model yet —');
    U.setHTML(E.capBig, `${D.cap.toFixed(D.cap < 100 ? 1 : 0)}<small>CAPABILITY</small>`);
    U.setText(E.rankBadge, D.bestCap > 0 ? '#' + D.rank : '#?');
    U.toggleClass(E.rankBadge, 'first', D.rank === 1 && D.cap > 0);
    const parts = [[D.capPre, '#b04dff'], [D.capRL, '#ff9b3d'], [D.capTTC, '#ff5cc8'], [D.capTTT, '#3ee6ff'], [D.capAgents, '#ffe45c'], [D.capFlat, '#5cf27a']];
    const tot = Math.max(1, parts.reduce((a, [v]) => a + Math.max(0, v), 0));
    const html = parts.map(([v, c]) => `<div style="width:${(Math.max(0, v) / tot) * 100}%;background:${c}"></div>`).join('');
    U.setHTML(E.capBar, html);
    if (m) {
      U.setText(E.modelSub, `${U.fmtParams(m.N)} params · ${U.fmt(m.D)} tokens · loss ${m.loss.toFixed(3)} · ${U.fmt(D.users)} users`);
    } else U.setText(E.modelSub, 'Train your first model in the TRAIN tab.');
    // benches: pick 3 unsaturated + METR
    const cap = D.cap;
    let shown = BENCH.filter((b) => G.benchScore(b, cap) < 97).slice(0, 3);
    if (shown.length < 3) shown = BENCH.slice(-3);
    const bh = shown.map((b) => {
      const s = G.benchScore(b, cap);
      return `<div class="bench"><span class="bl">${b.n}</span><span class="bb"><i style="width:${s}%"></i></span><span class="bv">${s.toFixed(0)}%</span></div>`;
    }).join('') + `<div class="bench"><span class="bl">METR horizon</span><span class="bv" style="color:var(--yellow)">${G.fmtHorizon(G.metrHorizon(cap))}</span></div>`;
    U.setHTML(E.benches, bh);
  };

  /* ------------------------------------------------------------------ training mini */
  P.updateTrain = () => {
    const S = G.S, D = G.D;
    const tr = S.training;
    if (tr) {
      const p = Math.min(1, tr.done / tr.flop);
      E.trainBar.style.width = (p * 100).toFixed(1) + '%';
      U.setText(E.trainPct, `${(p * 100).toFixed(1)}% · ${U.fmtParams(tr.N)} params`);
      const eta = D.trainRate > 0 ? (tr.flop - tr.done) / D.trainRate : Infinity;
      U.setText(E.trainEta, 'ETA ' + U.fmtTime(eta));
    } else {
      E.trainBar.style.width = '0%';
      U.setText(E.trainPct, S.prestige.lessons.autotrain && S.auto.train ? 'AUTO-TRAIN: waiting...' : 'IDLE — start a run in TRAIN');
      U.setText(E.trainEta, '');
    }
    drawLossChart(E.lossMini, tr, false);
  };
  /** train/test loss curve like a classic ML plot (log-y). */
  function drawLossChart(cv, tr, big) {
    const x = cv.getContext('2d');
    const w = cv.width, hh = cv.height;
    x.fillStyle = '#0b0a1a';
    x.fillRect(0, 0, w, hh);
    x.strokeStyle = '#1d1a4a';
    x.lineWidth = 1;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(0, (i * hh) / 4 + 0.5); x.lineTo(w, (i * hh) / 4 + 0.5); x.stroke(); }
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo((i * w) / 6 + 0.5, 0); x.lineTo((i * w) / 6 + 0.5, hh); x.stroke(); }
    if (!tr) {
      x.fillStyle = '#6a67a0';
      x.font = '8px Silkscreen, monospace';
      x.fillText('loss curve appears while training', 6, hh / 2 + 3);
      return;
    }
    const p = Math.min(1, tr.done / tr.flop);
    const Lmax = G.Sim.trainingLoss(tr, 0.002) + 0.3;
    const Lmin = Math.max(G.BAL.E, G.Sim.trainingLoss(tr, 1) - 0.05);
    const ly = (L) => {
      const a = Math.log(Lmin), b = Math.log(Lmax);
      return hh - 4 - ((Math.log(Math.max(Lmin, L)) - a) / (b - a)) * (hh - 8);
    };
    const N = big ? 120 : 60;
    // predicted (dashed)
    x.setLineDash([2, 3]);
    x.strokeStyle = '#4a4680';
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const f = 0.002 + (i / N) * 0.998;
      const L = G.Sim.trainingLoss(tr, f);
      const X = (i / N) * w;
      i ? x.lineTo(X, ly(L)) : x.moveTo(X, ly(L));
    }
    x.stroke();
    x.setLineDash([]);
    // train (blue) and test (orange)
    const rng = U.seeded(Math.floor(tr.flop % 1e6) + 7);
    const noise = Array.from({ length: N + 1 }, () => rng() - 0.5);
    const gap = 0.012 + 0.06 * Math.min(1, Math.sqrt(tr.N / Math.max(1, tr.D)));
    for (const [col, off] of [['#ff9b3d', gap], ['#3fa7ff', 0]]) {
      x.strokeStyle = col;
      x.lineWidth = big ? 2 : 1;
      x.beginPath();
      const upto = Math.max(1, Math.floor(N * p));
      for (let i = 0; i <= upto; i++) {
        const f = 0.002 + (i / N) * 0.998;
        const L = G.Sim.trainingLoss(tr, f) * (1 + off * (0.5 + f)) * (1 + noise[i] * 0.01 * (1 - f));
        const X = (i / N) * w;
        i ? x.lineTo(X, ly(L)) : x.moveTo(X, ly(L));
      }
      x.stroke();
    }
    x.fillStyle = '#9a96c8';
    x.font = '8px Silkscreen, monospace';
    x.fillText('loss ' + G.Sim.trainingLoss(tr, p).toFixed(3), 4, 10);
    x.fillStyle = '#3fa7ff'; x.fillText('train', w - 58, 10);
    x.fillStyle = '#ff9b3d'; x.fillText('test', w - 26, 10);
  }
  P.drawLossChart = drawLossChart;

  /* ------------------------------------------------------------------ allocation */
  const ALLOC_COL = { train: '#b04dff', serve: '#5cf27a', research: '#ffe45c', align: '#4dffd2' };
  P.buildAlloc = () => {
    const S = G.S, D = G.D;
    E.autoAlloc.checked = S.autoAlloc;
    const b = E.allocBody;
    b.innerHTML = '';
    b.appendChild(h('div.stack#allocStack'));
    const mk = (key, label, tipText, disabled) => {
      const inp = h('input', { type: 'range', min: 0, max: key === 'serve' ? 100 : 90, step: 1, value: Math.round((S.alloc[key] || 0) * 100), disabled: disabled || undefined });
      const val = h('span.num', { id: 'allocV-' + key });
      inp.addEventListener('input', () => { S.alloc[key] = inp.value / 100; G.Sim.recalc(); P.updateAlloc(); });
      const row = h('div.slider', h('span', { style: { color: ALLOC_COL[key] } }, label), inp, val);
      G.UI.tip(row, () => tipText);
      b.appendChild(row);
    };
    mk('serve', 'SERVE', '<b>SERVING</b><br>Compute used to run your model for users. More users → more revenue, but bigger models and longer reasoning cost more per user.' + (S.autoAlloc ? '<br><i>Auto mode sets this for you.</i>' : ''), S.autoAlloc);
    if (S.research.computer) mk('research', 'AI R&D', '<b>AUTOMATED RESEARCH</b><br>Copies of your model working as AI researchers. Output grows fast with capability. (AI 2027: "Agent-2 triples the pace of algorithmic progress.")');
    if (S.research.oversight) mk('align', 'ALIGN', '<b>AUTOMATED ALIGNMENT</b><br>Copies of your model doing alignment research. Keeps your safety margin up as capabilities race ahead.');
    const eff = h('div.effort#effortRow');
    if (D.M.maxEffort > 0) {
      b.appendChild(h('div.small', { style: { margin: '6px 0 3px', fontFamily: 'var(--font-ui)', fontSize: '9px' } }, 'REASONING EFFORT (test-time compute)'));
      G.EFFORTS.forEach((e, i) => {
        const btn = h('button', { disabled: i > D.M.maxEffort || undefined }, e.name);
        btn.addEventListener('click', () => { S.effort = i; G.Audio.tab(); G.Sim.recalc(); P.updateAlloc(); });
        G.UI.tip(btn, () => {
          const skill = G.D.M.ttcSkill;
          return `<b>${e.name.toUpperCase()} — ${e.mult}× thinking tokens</b><br>Capability +${(G.BAL.TTC_K * skill * Math.log2(e.mult)).toFixed(1)}<br>Serving cost per user ×${Math.pow(e.mult, 0.55).toFixed(1)}<hr><span class="tl2">Accuracy rises with the log of test-time compute — the second scaling law.</span>`;
        });
        eff.appendChild(btn);
      });
      b.appendChild(eff);
    }
    P.updateAlloc();
  };
  P.updateAlloc = () => {
    const S = G.S, D = G.D;
    const st = document.getElementById('allocStack');
    if (!st) return;
    const a = D.alloc;
    const html = ['train', 'serve', 'research', 'align'].filter((k) => a[k] > 0.001).map((k) => `<div style="width:${a[k] * 100}%;background:${ALLOC_COL[k]}">${a[k] > 0.12 ? k.toUpperCase() + ' ' + Math.round(a[k] * 100) + '%' : ''}</div>`).join('');
    U.setHTML(st, html);
    for (const k of ['serve', 'research', 'align']) {
      const v = document.getElementById('allocV-' + k);
      if (v) U.setText(v, Math.round(a[k] * 100) + '%');
    }
    const row = document.getElementById('effortRow');
    if (row) Array.from(row.children).forEach((btn, i) => {
      U.toggleClass(btn, 'on', i === D.effort);
      btn.disabled = i > D.M.maxEffort;
    });
    if (S.autoAlloc) {
      const inp = E.allocBody.querySelector('input[type=range]');
      if (inp && document.activeElement !== inp) inp.value = Math.round(a.serve * 100);
    }
  };

  /* ------------------------------------------------------------------ vibes */
  P.updateVibes = () => {
    const S = G.S, D = G.D;
    E.vibeKnob.style.left = ((S.vibe + 100) / 2).toFixed(1) + '%';
    const v = S.vibe;
    const t = v < -80 ? "IT'S SO OVER 💀" : v < -40 ? "it's over" : v < -10 ? 'meh' : v < 10 ? 'neutral' : v < 40 ? 'good vibes' : v < 80 ? "we're back" : "WE'RE SO BACK 🚀";
    U.setText(E.vibeText, t);
    U.setText(E.vibeNum, `${v > 0 ? '+' : ''}${v.toFixed(0)} · demand ${U.fmtMult(D.vibeMult)}`);
  };

  /* ------------------------------------------------------------------ feed */
  function avatar(who) {
    const w = G.FEED_WHO[who] || G.FEED_WHO.news;
    if (w.card && G.CARD[w.card]) return G.Sprites.cardUrl(G.CARD[w.card], 32);
    if (who === 'you') return G.Sprites.url(G.LABS[G.S.lab].logo, 2);
    if (who === 'ai') return G.Sprites.url('orb', 2);
    if (who === 'status') return G.Sprites.url('lightning', 2);
    return G.Sprites.url('bird', 2);
  }
  P.addPost = (p, silent) => {
    const w = G.FEED_WHO[p.who] || G.FEED_WHO.news;
    let name = w.name, handle = w.handle;
    if (p.who === 'you') { name = G.LABS[G.S.lab].name; handle = '@' + G.LABS[G.S.lab].short.toLowerCase(); }
    const el = h('div.post' + (p.mini ? '.mini' : '') + (w.reddit ? '.reddit' : '') + (w.sys ? '.sys' : ''), { id: 'post-' + p.id },
      h('img.av', { src: avatar(p.who) }),
      h('div',
        h('div.who', name + ' ', h('span', handle)),
        h('div.tx', p.text)));
    if (p.mini) {
      const m = G.MINI.find((x) => x.id === p.mini);
      if (p.resolved) el.classList.add(p.resolved);
      else if (G.S.mini && G.S.mini.post === p.id) {
        const btn = h('button.btn', m.btn);
        btn.addEventListener('click', () => { G.Sim.resolveMini(true); });
        const timer = h('div.timer', h('i'));
        el.lastChild.appendChild(h('div.act', btn, timer));
        el._timer = timer.firstChild;
      }
    }
    if (w.card && G.CARD[w.card]) {
      G.UI.tip(el.firstChild, () => {
        const c = G.CARD[w.card];
        const n = G.S.cards[c.id] || 0;
        return `<b>${c.name}</b> <span style="color:${G.RARITY[c.r].color}">${G.RARITY[c.r].name}</span><br>${n ? 'You own this card (×' + n + ')' : 'Card not collected yet'}<div class="tl2">${c.flavor}</div>`;
      });
    }
    E.feed.insertBefore(el, E.feed.firstChild);
    while (E.feed.childElementCount > 40) E.feed.lastChild.remove();
  };
  P.resolvePost = (postId, success) => {
    const el = document.getElementById('post-' + postId);
    if (!el) return;
    el.classList.add(success ? 'win' : 'lose');
    const act = el.querySelector('.act');
    if (act) act.innerHTML = `<span class="pill ${success ? 'good' : 'bad'}">${success ? 'WON' : 'MISSED'}</span>`;
  };
  P.updateFeedTimers = () => {
    const S = G.S;
    if (!S.mini) return;
    const el = document.getElementById('post-' + S.mini.post);
    if (el && el._timer) el._timer.style.width = (S.mini.left / S.mini.timer) * 100 + '%';
  };

  /* ------------------------------------------------------------------ objectives & buffs */
  P.updateObjectives = () => {
    const obs = G.Sim.currentObjectives(3);
    const html = obs.map((o) => `<div class="obj">${U.escape(o.text)}</div>`).join('') || '<div class="obj done">All objectives complete. The universe awaits.</div>';
    U.setHTML(E.objectives, html);
  };
  P.updateBuffs = () => {
    const S = G.S;
    E.buffPanel.style.display = S.buffs.length ? 'block' : 'none';
    const html = S.buffs.map((b) => {
      const bad = (b.users && b.users < 1) || (b.rp && b.rp < 1) || (b.money && b.money < 1);
      return `<div class="buff${bad ? ' bad' : ''}"><span>${U.escape(b.name)}</span><span>${Math.ceil(b.left)}s</span></div>`;
    }).join('');
    U.setHTML(E.buffs, html);
  };
})(typeof window !== 'undefined' ? window : globalThis);
