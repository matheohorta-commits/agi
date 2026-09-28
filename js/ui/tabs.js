/* Center tabs: COMPUTE, DATA, TRAIN, RESEARCH, TEAM, PRODUCTS, CARDS, RACE, LESSONS, COSMOS, STATS */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const h = U.h;
  const UI = G.UI;
  const T = UI.tabs;

  /* ================================================================== shared components */
  function section(title, help) {
    const s = h('div.section', h('h4', title, h('span.grow')));
    if (help) s.appendChild(h('p.help', help));
    return s;
  }
  function buyBar(extra) {
    const bar = h('div.buybar', 'BUY:');
    for (const n of [1, 10, 100, 'max']) {
      const b = h('button', n === 'max' ? 'MAX' : '×' + n);
      if (UI.buyAmt === n) b.classList.add('on');
      b.addEventListener('click', () => {
        UI.buyAmt = n;
        U.$$('.buybar button').forEach((x) => x.classList.toggle('on', x.textContent === (n === 'max' ? 'MAX' : '×' + n)));
      });
      bar.appendChild(b);
    }
    if (extra) for (const e of [].concat(extra)) bar.appendChild(e);
    return bar;
  }
  function toggle(label, get, set, tipText) {
    const inp = h('input', { type: 'checkbox' });
    inp.checked = !!get();
    inp.addEventListener('change', () => set(inp.checked));
    const el = h('label.toggle', { style: { marginLeft: '10px' } }, inp, h('span.sw'), label);
    if (tipText) UI.tip(el, () => tipText);
    return el;
  }
  const PROD_FMT = {
    hw: (it, n, M) => U.fmtFlops(it.flops * (M.hw[it.id] || 1) * (n || 1)),
    power: (it, n, M) => U.fmtWatts(it.watts * (M.pow[it.id] || 1) * M.powerCap * (n || 1)),
    res: (it, n, M) => U.fmt(it.rp * (M.res[it.id] || 1) * M.rp * G.D.rdMult * (n || 1)) + ' RP/s',
    safety: (it, n, M) => U.fmt(it.ap * (M.safety[it.id] || 1) * M.ap * (n || 1)) + ' AP/s',
    src: (it, n, M) => U.fmt(it.tps * (M.src[it.id] || 1) * M.data * (it.quality || 1) * (n || 1)) + ' tok/s',
  };
  function buyCount(kind, id) {
    if (UI.buyAmt === 'max') return Math.max(1, G.Sim.maxBuy(kind, id));
    return UI.buyAmt;
  }
  /** building row */
  function itemRow(kind, it) {
    const ic = h('img.ic', { src: UI.icon(it.sprite, 3, it.tint) });
    const name = h('div.name', it.name);
    const prod = h('div.prod');
    const cost = h('div.cost');
    const own = h('div.own', '0');
    const el = h('div.item', ic, h('div', name, prod, cost), own);
    el.addEventListener('click', () => {
      const S = G.S;
      if (!G.Sim.unlocked(it.req)) return;
      const n = buyCount(kind, it.id);
      const got = G.Sim.buy(kind, it.id, n);
      if (got) {
        el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
        const r = el.getBoundingClientRect();
        G.FX.burst(r.left + 20, r.top + 20, { n: 8, speed: 120, colors: ['#5cf27a', '#ffffff'] });
      } else G.Audio.error();
    });
    UI.tip(el, () => {
      const M = G.D.M;
      const n = G.Sim.owned(kind, it.id);
      const unlocked = G.Sim.unlocked(it.req);
      let s = `<b>${it.name}</b>${it.year ? ` <span class="tiny">(${it.year})</span>` : ''}<div class="tl2">${it.desc}</div><hr>`;
      if (!unlocked) s += `<span style="color:var(--red)">🔒 ${reqText(it.req)}</span>`;
      else {
        s += `Each: ${PROD_FMT[kind](it, 1, M)}<br>Owned ${n}: ${PROD_FMT[kind](it, n, M)}`;
        if (kind === 'hw' && G.S.flags.power) s += `<br>Power: ${U.fmtWatts(it.watts)} each${it.watts === 0 ? ' (self-powered!)' : ''}`;
        if (kind === 'src' && it.human && G.D.dataWall) s += '<br><span style="color:var(--red)">Human data exhausted — produces nothing</span>';
        const nb = buyCount(kind, it.id);
        s += `<br>Buy ${nb}: ${U.fmtMoney(G.Sim.price(kind, it.id, nb))}`;
      }
      return s;
    });
    el._upd = () => {
      const S = G.S, M = G.D.M;
      const unlocked = G.Sim.unlocked(it.req);
      U.toggleClass(el, 'locked', !unlocked);
      const n = G.Sim.owned(kind, it.id);
      U.setText(own, n);
      if (!unlocked) {
        U.setText(prod, reqText(it.req));
        U.setText(cost, '');
        U.toggleClass(el, 'can', false);
        return;
      }
      const nb = buyCount(kind, it.id);
      const c = G.Sim.price(kind, it.id, nb);
      U.setText(prod, '+' + PROD_FMT[kind](it, 1, M) + (kind === 'src' && it.human && G.D.dataWall ? ' (WALL)' : ''));
      U.setText(cost, (nb > 1 ? '×' + nb + ' ' : '') + U.fmtMoney(c));
      const can = S.money >= c;
      U.toggleClass(cost, 'no', !can);
      U.toggleClass(el, 'can', can);
      U.toggleClass(el, 'cant', !can);
    };
    return el;
  }
  function reqText(req) {
    if (!req) return '';
    if (req.research) return 'Requires research: ' + ((G.RESEARCH.find((r) => r.id === req.research) || {}).name || req.research);
    if (req.cap !== undefined) return 'Requires capability ' + req.cap;
    if (req.asi) return 'Requires superintelligence';
    if (req.product) return 'Requires product: ' + req.product;
    return '';
  }
  /** show all unlocked + the next locked one */
  function visibleList(list) {
    const out = [];
    let lockedShown = 0;
    for (const it of list) {
      if (G.Sim.unlocked(it.req) || G.Sim.owned(kindOf(list), it.id) > 0) out.push(it);
      else if (lockedShown < 1) { out.push(it); lockedShown++; }
    }
    return out;
  }
  function kindOf(list) {
    return list === G.HARDWARE ? 'hw' : list === G.POWER ? 'power' : list === G.RESEARCHERS ? 'res' : list === G.SAFETY ? 'safety' : 'src';
  }
  function itemsBlock(kind, list) {
    const box = h('div.items');
    const rows = new Map();
    const refresh = () => {
      const vis = visibleList(list);
      for (const it of vis) if (!rows.has(it.id)) {
        const r = itemRow(kind, it);
        rows.set(it.id, r);
        box.appendChild(r);
      }
      for (const [id, r] of rows) {
        const it = list.find((x) => x.id === id);
        if (!vis.includes(it)) { r.remove(); rows.delete(id); }
      }
      // keep order
      for (const it of vis) box.appendChild(rows.get(it.id));
    };
    refresh();
    box._upd = () => {
      if (visibleList(list).length !== rows.size) refresh();
      for (const r of rows.values()) r._upd();
    };
    return box;
  }
  function upgradesBlock(kinds) {
    const box = h('div.upgrades');
    let sig = '';
    box._upd = () => {
      const S = G.S;
      const avail = G.BUILDING_UPGRADES.filter((u) => kinds.includes(u.kind) && G.Sim.upgradeAvailable(u)).sort((a, b) => G.Sim.upgradeCost(a) - G.Sim.upgradeCost(b)).slice(0, 24);
      const nsig = avail.map((u) => u.id).join(',');
      if (nsig !== sig) {
        sig = nsig;
        box.innerHTML = '';
        if (!avail.length) box.appendChild(h('div.empty', 'No upgrades available. Buy more to unlock ×2 upgrades (at 1, 5, 25, 50, 100...).'));
        for (const u of avail) {
          const el = h('div.upg', h('img', { src: UI.icon(u.sprite, 2, u.tint) }), h('span.x2', '×2'));
          el._u = u;
          el.addEventListener('click', () => { if (!G.Sim.buyUpgrade(u.id)) G.Audio.error(); else { const r = el.getBoundingClientRect(); G.FX.burst(r.left + 22, r.top + 22, { n: 16, colors: ['#ffe45c', '#ffffff'] }); } });
          UI.tip(el, () => `<b>${u.name}</b><br>${u.sub}: output ×2<div class="tl2">Unlocked at ${u.need} owned.</div><hr>Cost: ${U.fmtMoney(G.Sim.upgradeCost(u))}`);
          box.appendChild(el);
        }
      }
      for (const el of box.children) if (el._u) {
        const can = S.money >= G.Sim.upgradeCost(el._u);
        U.toggleClass(el, 'can', can);
        U.toggleClass(el, 'cant', !can);
      }
    };
    return box;
  }
  function kv(pairs) {
    const box = h('div.kv');
    const vals = {};
    for (const [k, label, tip] of pairs) {
      const kEl = h('span.k', label);
      if (tip) UI.tip(kEl, () => tip);
      const v = h('span.v', '-');
      vals[k] = v;
      box.appendChild(kEl);
      box.appendChild(v);
    }
    box._v = vals;
    return box;
  }

  /* ================================================================== COMPUTE */
  T.push({
    id: 'compute', name: 'COMPUTE', unlocked: () => true,
    build(page) {
      const S = G.S;
      const L = S.prestige.lessons;
      const autos = [];
      if (L.autobuy) {
        autos.push(toggle('AUTO-BUY', () => S.auto.hw, (v) => (S.auto.hw = v), 'Buys the best FLOP/$ hardware with up to 50% of your cash, and power when needed.'));
      }
      const s1 = section('HARDWARE', 'GPUs, TPUs, racks and gigawatt campuses. Compute is split between training, serving users, and (later) AI research.');
      s1.appendChild(buyBar(autos));
      this.hw = itemsBlock('hw', G.HARDWARE);
      s1.appendChild(this.hw);
      page.appendChild(s1);
      this.pow = null;
      if (S.flags.power) {
        const s2 = section('POWER', 'The bottleneck is now power. If hardware draws more than your capacity, all compute is throttled.');
        this.powInfo = h('div.card', { style: { marginBottom: '8px' } });
        s2.appendChild(this.powInfo);
        this.pow = itemsBlock('power', G.POWER);
        s2.appendChild(this.pow);
        page.appendChild(s2);
      }
      const s3 = section('UPGRADES');
      this.upg = upgradesBlock(['hw']);
      s3.appendChild(this.upg);
      page.appendChild(s3);
    },
    update() {
      this.hw._upd();
      this.upg._upd();
      if (this.pow) {
        this.pow._upd();
        const D = G.D;
        const pct = D.powerCap > 0 ? D.powerUse / D.powerCap : 0;
        U.setHTML(this.powInfo, `<div class="row sb"><span class="small">Power use</span><span class="num" style="color:${pct > 1 ? 'var(--red)' : 'var(--green)'}">${U.fmtWatts(D.powerUse)} / ${U.fmtWatts(D.powerCap)}</span></div><div class="pbar" style="margin-top:4px"><i style="width:${Math.min(100, pct * 100)}%;${pct > 1 ? 'background:var(--red)' : ''}"></i><span>${pct > 1 ? 'THROTTLED to ' + U.fmtPct(D.throttle) : U.fmtPct(pct) + ' used'}</span></div><div class="tiny" style="margin-top:4px">Kardashev index: ${D.kard.toFixed(3)}</div>`);
      }
    },
  });

  /* ================================================================== DATA */
  T.push({
    id: 'data', name: 'DATA', unlocked: () => true,
    build(page) {
      const S = G.S;
      const autos = [];
      if (S.prestige.lessons.autobuy) autos.push(toggle('AUTO-BUY', () => S.auto.src, (v) => (S.auto.src = v)));
      this.info = h('div.card', { style: { marginBottom: '10px' } });
      page.appendChild(this.info);
      const s1 = section('DATA SOURCES', 'Your dataset size limits how many tokens a model can train on. Human-written text is finite — "we have but one internet."');
      s1.appendChild(buyBar(autos));
      this.src = itemsBlock('src', G.DATASRC);
      s1.appendChild(this.src);
      page.appendChild(s1);
      const s3 = section('UPGRADES');
      this.upg = upgradesBlock(['src']);
      s3.appendChild(this.upg);
      page.appendChild(s3);
    },
    update() {
      const S = G.S, D = G.D;
      const frac = Math.min(1, S.humanTokens / D.humanPool);
      U.setHTML(this.info, `<div class="row sb"><span class="small">Dataset</span><span class="num" style="color:var(--data)">${U.fmtTokens(S.tokens)} (+${U.fmt(D.tokenRate)}/s)</span></div>
        <div class="row sb" style="margin-top:6px"><span class="small">Human-written text used (the data wall)</span><span class="num">${U.fmt(S.humanTokens)} / ${U.fmt(D.humanPool)}</span></div>
        <div class="pbar" style="margin-top:4px"><i style="width:${frac * 100}%;${frac >= 1 ? 'background:var(--red)' : ''}"></i><span>${frac >= 1 ? 'DATA WALL — research Synthetic Data' : U.fmtPct(frac, 1) + ' of the internet'}</span></div>
        <div class="tiny" style="margin-top:4px">Compute-optimal models want ~20 tokens per parameter. Effective data quality: ×${D.M.kD.toFixed(2)}</div>`);
      this.src._upd();
      this.upg._upd();
    },
  });

  /* ================================================================== TRAIN */
  T.push({
    id: 'train', name: 'TRAIN', unlocked: () => true,
    build(page) {
      const S = G.S;
      const grid = h('div.traingrid');
      // --- designer
      const des = h('div.card');
      des.appendChild(h('div.section', h('h4', 'NEW TRAINING RUN', h('span.grow'))));
      const cfg = S.trainCfg;
      this.nIn = h('input', { type: 'range', min: 5, max: 16, step: 0.01, value: Math.log10(cfg.N) });
      this.dIn = h('input', { type: 'range', min: 6, max: 18, step: 0.01, value: Math.log10(cfg.D) });
      this.nLbl = h('span.num');
      this.dLbl = h('span.num');
      const sl = (label, inp, lbl, tipText) => {
        const r = h('div.slider', { style: { gridTemplateColumns: '70px 1fr 70px' } }, label, inp, lbl);
        UI.tip(r, () => tipText);
        return r;
      };
      des.appendChild(sl('PARAMS N', this.nIn, this.nLbl, '<b>PARAMETERS</b><br>Bigger models learn more from the same data — but cost more to train (6·N·D FLOP) and more to serve per user.'));
      des.appendChild(sl('TOKENS D', this.dIn, this.dLbl, '<b>TRAINING TOKENS</b><br>Limited by your dataset. More data lowers loss (B/D^β term).'));
      this.nIn.addEventListener('input', () => { cfg.N = Math.pow(10, +this.nIn.value); this.update(true); });
      this.dIn.addEventListener('input', () => { cfg.D = Math.pow(10, +this.dIn.value); this.update(true); });
      const presets = h('div.row', { style: { flexWrap: 'wrap', gap: '4px', margin: '6px 0' } });
      const addP = (label, fn, tipText) => {
        const b = h('button.btn', label);
        b.addEventListener('click', () => { fn(); G.Audio.tab(); this.update(true); });
        if (tipText) UI.tip(b, () => tipText);
        presets.appendChild(b);
      };
      const optimal = (eta) => {
        const nd = G.Sim.optimalForEta(eta, cfg.rl);
        cfg.N = nd.N;
        cfg.D = nd.D;
      };
      addP('⚡ 15s', () => optimal(15), 'Loss-optimal N and D for a ~15 second run at your current training speed.');
      addP('1 MIN', () => optimal(60), 'Loss-optimal (compute-optimal) run that takes ~1 minute.');
      addP('5 MIN', () => optimal(300));
      addP('20 MIN', () => optimal(1200));
      addP('MAX DATA', () => { cfg.D = S.tokens; }, 'Use your whole dataset.');
      addP('20 TOK/PARAM', () => { cfg.N = Math.max(G.BAL.MIN_PARAMS, cfg.D / 20); }, 'Chinchilla rule of thumb: ~20 tokens per parameter.');
      addP('SMALL & CHEAP', () => { cfg.N = Math.max(G.BAL.MIN_PARAMS, cfg.D / 200); }, 'Overtrained small model (200 tokens/param): slightly worse, but much cheaper to serve to users. Llama-style.');
      des.appendChild(presets);
      this.rlBox = h('div');
      des.appendChild(this.rlBox);
      this.pred = kv([
        ['flop', 'Compute', 'Training compute = 6 × N × D FLOP (×1.5 with RL).'],
        ['eta', 'Time', 'At your current training allocation.'],
        ['tpp', 'Tokens / param'],
        ['loss', 'Predicted loss', 'L = E + A/N^α + B/D^β (Chinchilla fit), with your algorithmic efficiency multipliers.'],
        ['cap', 'Capability', 'Pretraining capability + current post-training bonuses.'],
        ['delta', 'vs deployed'],
        ['serve', 'Serving cost / user'],
      ]);
      des.appendChild(this.pred);
      this.startBtn = h('button.bigbtn', { style: { width: '100%', marginTop: '8px' } }, 'START TRAINING');
      this.startBtn.addEventListener('click', () => {
        if (S.training) { if (confirm('Cancel the current training run? Progress is lost.')) G.Sim.cancelTraining(); this.update(true); return; }
        if (G.Sim.startTraining(cfg.N, cfg.D, cfg.rl)) { G.Audio.bigBuy(); this.update(true); }
      });
      des.appendChild(this.startBtn);
      const autos = h('div.row', { style: { marginTop: '8px', flexWrap: 'wrap' } });
      autos.appendChild(toggle('AUTO-DEPLOY BETTER MODELS', () => cfg.autoDeploy, (v) => (cfg.autoDeploy = v)));
      if (S.prestige.lessons.autotrain) {
        autos.appendChild(toggle('AUTO-TRAIN', () => S.auto.train, (v) => (S.auto.train = v), 'Automatically starts a compute-optimal run of the chosen length whenever idle and a better model is possible.'));
        const sel = h('select', { style: { background: '#0b0a1a', color: '#fff', border: '1px solid var(--line)', fontFamily: 'var(--font-ui)', fontSize: '9px', marginLeft: '6px' } });
        for (const [v, l] of [[15, '15s'], [30, '30s'], [60, '1m'], [180, '3m'], [600, '10m'], [1800, '30m']]) {
          const o = h('option', { value: v }, l);
          if (S.auto.trainEta === v) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener('change', () => (S.auto.trainEta = +sel.value));
        autos.appendChild(sel);
      }
      des.appendChild(autos);
      grid.appendChild(des);
      // --- live chart
      const live = h('div.card');
      live.appendChild(h('div.section', h('h4', 'LIVE LOSS', h('span.grow'))));
      this.bigLoss = h('canvas', { width: 420, height: 200 });
      live.appendChild(h('div.chartbox', this.bigLoss));
      this.liveInfo = h('div.small', { style: { marginTop: '6px' } });
      live.appendChild(this.liveInfo);
      grid.appendChild(live);
      page.appendChild(grid);
      // --- models
      const sm = section('MODELS', 'Deploy any trained model. Only the deployed model earns revenue and counts for the leaderboard. Double-click a name to rename it.');
      this.models = h('div.models');
      sm.appendChild(this.models);
      page.appendChild(sm);
      // --- scaling laws
      if (S.research.scaling_laws) {
        const ss = section('SCALING LAWS', 'Every model you train, on log-log axes. Loss falls as a power law in compute, data and parameters.');
        const row = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' } });
        this.sl = [0, 1, 2].map(() => h('canvas', { width: 260, height: 170 }));
        this.sl.forEach((c) => row.appendChild(h('div.chartbox', c)));
        ss.appendChild(row);
        page.appendChild(ss);
      } else this.sl = null;
      if (S.research.strawberry) {
        const sr = section('REASONING SCALING', 'Two scaling laws for reasoning: accuracy rises with train-time RL compute and with test-time compute (the reasoning-effort buttons under COMPUTE ALLOCATION).');
        const row = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } });
        this.o1 = [h('canvas', { width: 380, height: 220 }), h('canvas', { width: 380, height: 220 })];
        this.o1.forEach((c) => row.appendChild(h('div.chartbox', c)));
        sr.appendChild(row);
        page.appendChild(sr);
      } else this.o1 = null;
      this.lastModels = -1;
    },
    update(force) {
      const S = G.S, D = G.D;
      const cfg = S.trainCfg;
      const maxD = Math.max(6.01, Math.log10(Math.max(1e6, S.tokens)));
      this.dIn.max = maxD.toFixed(2);
      if (cfg.D > S.tokens) cfg.D = S.tokens;
      if (force || document.activeElement !== this.nIn) this.nIn.value = Math.log10(cfg.N);
      if (force || document.activeElement !== this.dIn) this.dIn.value = Math.log10(Math.max(1e6, cfg.D));
      U.setText(this.nLbl, U.fmtParams(cfg.N));
      U.setText(this.dLbl, U.fmt(cfg.D));
      // RL toggle
      const hasRL = D.M.rlBonus > 0;
      if (hasRL && !this.rlBox._built) {
        this.rlBox._built = true;
        this.rlBox.appendChild(toggle(`RL POST-TRAINING (+50% compute, +${D.M.rlBonus} cap)`, () => cfg.rl, (v) => { cfg.rl = v; this.update(true); }, 'Reinforcement learning on chains of thought after pretraining. Accuracy grows with train-time RL compute.'));
      }
      if (!hasRL) cfg.rl = false;
      const p = G.Sim.predict(cfg.N, Math.min(cfg.D, S.tokens), cfg.rl);
      const v = this.pred._v;
      U.setText(v.flop, U.fmtFlop(p.flop));
      U.setText(v.eta, U.fmtTime(p.eta));
      v.eta.style.color = p.eta > 1800 ? 'var(--red)' : '';
      U.setText(v.tpp, p.tpp.toFixed(p.tpp < 10 ? 1 : 0));
      U.setText(v.loss, p.loss.toFixed(3));
      U.setText(v.cap, p.cap.toFixed(1));
      const cur = D.model ? D.cap : 0;
      const delta = p.cap - cur;
      U.setText(v.delta, (delta >= 0 ? '+' : '') + delta.toFixed(1));
      v.delta.style.color = delta > 0 ? 'var(--green)' : 'var(--red)';
      U.setText(v.serve, U.fmtFlops((cfg.N * D.M.activeFrac * D.effortServe) / (G.BAL.SERVE_K * D.M.serveEff)));
      this.startBtn.textContent = S.training ? 'CANCEL RUN' : 'START TRAINING';
      this.startBtn.className = 'bigbtn' + (S.training ? ' red' : '');
      // live
      P().drawLossChart(this.bigLoss, S.training, true);
      if (S.training) {
        const tr = S.training;
        const f = tr.done / tr.flop;
        U.setHTML(this.liveInfo, `Run: ${U.fmtParams(tr.N)} params · ${U.fmt(tr.D)} tokens · ${U.fmtFlop(tr.flop)}<br>Progress ${(f * 100).toFixed(1)}% · ETA ${U.fmtTime((tr.flop - tr.done) / Math.max(1, D.trainRate))} · target capability ≈ ${(tr.capPre + tr.rlBonus + D.capTTC + D.capTTT + D.capAgents + D.M.capFlat).toFixed(1)}`);
      } else U.setHTML(this.liveInfo, `Training speed: ${U.fmtFlop(D.trainRate)}/s (${U.fmtPct(D.alloc.train)} of compute × MFU ${U.fmtPct(D.mfu)})`);
      // models
      const sig = S.models.length + ':' + S.deployed + ':' + S.models.map((m) => m.name).join('|').length;
      if (force || sig !== this.lastModels) {
        this.lastModels = sig;
        this.models.innerHTML = '';
        const list = S.models.slice().reverse();
        if (!list.length) this.models.appendChild(h('div.empty', 'No models yet. Configure a run above and press START TRAINING.'));
        for (const m of list) {
          const idx = S.models.indexOf(m);
          const capNow = m.capPre + (m.rlBonus || 0) + D.capTTC + D.capTTT + D.capAgents + D.M.capFlat;
          const nameEl = h('span.mn', m.name);
          nameEl.addEventListener('dblclick', () => { const n = prompt('Rename model:', m.name); if (n) { G.Sim.renameModel(idx, n); this.update(true); } });
          const btn = h('button.btn', idx === S.deployed ? 'LIVE' : 'DEPLOY');
          btn.disabled = idx === S.deployed;
          btn.addEventListener('click', () => { G.Sim.deploy(idx); this.update(true); });
          const row = h('div.mrow' + (idx === S.deployed ? '.dep' : ''), nameEl, h('span.pill', U.fmtParams(m.N)), h('span.pill', (m.D / m.N).toFixed(0) + ' tok/p'), h('span.pill.gold', 'cap ' + capNow.toFixed(0)), btn);
          UI.tip(row, () => `<b>${m.name}</b><br>${U.fmtParams(m.N)} params · ${U.fmt(m.D)} tokens<br>Loss ${m.loss.toFixed(4)} · ${U.fmtFlop(m.flop)}<br>Pretraining capability ${m.capPre.toFixed(1)}${m.rlBonus ? ' + RL ' + m.rlBonus : ''}`);
          this.models.appendChild(row);
        }
      }
      if (this.sl && (force || Math.random() < 0.1)) drawScalingPlots(this.sl);
      if (this.o1 && (force || Math.random() < 0.1)) drawReasoningPlots(this.o1);
    },
  });
  function P() { return G.Panels; }

  function drawScalingPlots(cvs) {
    const S = G.S;
    const ms = S.models;
    const specs = [
      { key: (m) => m.flop, lab: 'Compute (FLOP)', f: 'L=(C/2.3·10⁸)^-0.050', col: '#ffb938' },
      { key: (m) => m.D, lab: 'Dataset (tokens)', f: 'L=(D/5.4·10¹³)^-0.095', col: '#3fa7ff' },
      { key: (m) => m.N, lab: 'Parameters', f: 'L=(N/8.8·10¹³)^-0.076', col: '#3fa7ff' },
    ];
    specs.forEach((sp, i) => {
      const c = cvs[i];
      const x = c.getContext('2d');
      const w = c.width, hh = c.height;
      x.fillStyle = '#0b0a1a';
      x.fillRect(0, 0, w, hh);
      if (!ms.length) return;
      const xs = ms.map(sp.key), ys = ms.map((m) => m.loss);
      let x0 = Math.log10(Math.min(...xs)) - 0.5, x1 = Math.log10(Math.max(...xs)) + 0.5;
      let y0 = Math.log10(Math.min(...ys)) - 0.02, y1 = Math.log10(Math.max(...ys)) + 0.02;
      if (x1 - x0 < 1) { x0 -= 0.5; x1 += 0.5; }
      if (y1 - y0 < 0.05) { y0 -= 0.03; y1 += 0.03; }
      const px = (v) => 24 + ((Math.log10(v) - x0) / (x1 - x0)) * (w - 32);
      const py = (v) => hh - 22 - ((Math.log10(v) - y0) / (y1 - y0)) * (hh - 36);
      x.strokeStyle = '#1d1a4a';
      for (let k = Math.ceil(x0); k <= x1; k++) { const X = px(Math.pow(10, k)); x.beginPath(); x.moveTo(X, 10); x.lineTo(X, hh - 22); x.stroke(); }
      // fit line through frontier (best loss so far per x)
      const pts = ms.map((m) => [sp.key(m), m.loss]).sort((a, b) => a[0] - b[0]);
      const front = [];
      let best = Infinity;
      for (const p of pts) if (p[1] < best) { best = p[1]; front.push(p); }
      if (front.length >= 2) {
        const lx = front.map((p) => Math.log10(p[0])), ly = front.map((p) => Math.log10(p[1]));
        const n = lx.length, mx = lx.reduce((a, b) => a + b) / n, my = ly.reduce((a, b) => a + b) / n;
        let num = 0, den = 0;
        for (let k = 0; k < n; k++) { num += (lx[k] - mx) * (ly[k] - my); den += (lx[k] - mx) ** 2; }
        const slope = den ? num / den : 0;
        x.strokeStyle = sp.col;
        x.setLineDash(i === 0 ? [4, 3] : []);
        x.beginPath();
        const X0 = Math.pow(10, x0), X1 = Math.pow(10, x1);
        x.moveTo(px(X0), py(Math.pow(10, my + slope * (x0 - mx))));
        x.lineTo(px(X1), py(Math.pow(10, my + slope * (x1 - mx))));
        x.stroke();
        x.setLineDash([]);
        x.fillStyle = '#e8e6ff';
        x.font = '8px Silkscreen, monospace';
        x.fillText(`slope ${slope.toFixed(3)}`, 28, 20);
      }
      for (const p of pts) {
        x.fillStyle = '#3ee6ff';
        x.fillRect(Math.round(px(p[0])) - 2, Math.round(py(p[1])) - 2, 4, 4);
      }
      x.fillStyle = '#9a96c8';
      x.font = '8px Silkscreen, monospace';
      x.fillText(sp.lab, 28, hh - 8);
      x.save();
      x.translate(10, hh / 2 + 20);
      x.rotate(-Math.PI / 2);
      x.fillText('Test Loss', 0, 0);
      x.restore();
    });
  }

  /** o1-style plots: pass@1 vs train-time RL compute, and vs test-time compute */
  const AIME = { n: 'AIME', c: 250, w: 20, floor: 0 };
  function drawReasoningPlots(cvs) {
    const D = G.D;
    const base = D.cap - D.capTTC - D.capRL;
    const skill = G.BAL.TTC_K * D.M.ttcSkill;
    const rl = Math.max(D.M.rlBonus, 1);
    const sets = [
      { title: 'AIME accuracy during training', xl: 'train-time compute (log scale)', pts: Array.from({ length: 8 }, (_, i) => G.benchScore(AIME, base + D.capTTC + rl * Math.pow(i / 7, 0.8) + (i ? 0 : -4))) },
      { title: 'AIME accuracy at test time', xl: 'test-time compute (log scale)', pts: Array.from({ length: 8 }, (_, i) => G.benchScore(AIME, base + D.capRL + skill * Math.log2(Math.pow(1024, i / 7)))) },
    ];
    sets.forEach((set, k) => {
      const c = cvs[k];
      const x = c.getContext('2d');
      const w = c.width, hh = c.height;
      x.fillStyle = '#000000';
      x.fillRect(0, 0, w, hh);
      const L = 44, B = hh - 30, T = 34, Rr = w - 16;
      x.strokeStyle = '#d0d0d0';
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(L, T - 6); x.lineTo(L, B); x.lineTo(Rr, B); x.stroke();
      x.fillStyle = '#d0d0d0';
      x.font = '9px VT323, monospace';
      x.textAlign = 'right';
      for (let v = 0; v <= 100; v += 20) {
        const y = B - (v / 100) * (B - T);
        x.fillText(String(v), L - 6, y + 3);
        x.beginPath(); x.moveTo(L - 3, y); x.lineTo(L, y); x.stroke();
      }
      for (let i = 0; i < 16; i++) { const X = L + ((i + 0.5) / 16) * (Rr - L); x.beginPath(); x.moveTo(X, B); x.lineTo(X, B + (i % 4 === 0 ? 4 : 2)); x.stroke(); }
      x.textAlign = 'center';
      x.font = '12px VT323, monospace';
      x.fillText(set.title, (L + Rr) / 2, 16);
      x.fillText(set.xl, (L + Rr) / 2, hh - 8);
      x.save(); x.translate(12, (T + B) / 2); x.rotate(-Math.PI / 2); x.fillText('pass@1 accuracy', 0, 0); x.restore();
      x.fillStyle = '#ffffff';
      set.pts.forEach((v, i) => {
        const X = L + 16 + (i / 7) * (Rr - L - 32);
        const Y = B - (v / 100) * (B - T);
        x.beginPath(); x.arc(X, Y, 3, 0, Math.PI * 2); x.fill();
      });
      x.textAlign = 'left';
    });
  }

  /* ================================================================== RESEARCH */
  T.push({
    id: 'research', name: 'RESEARCH', unlocked: () => G.S.deployed >= 0 || G.D.rpRate > 0 || Object.keys(G.S.research).length > 0,
    build(page) {
      const S = G.S;
      const top = h('div.rsub');
      this.rpInfo = h('span.num', { style: { color: 'var(--rp)' } });
      top.appendChild(this.rpInfo);
      if (S.prestige.lessons.autoresearch) top.appendChild(toggle('AUTO-RESEARCH', () => S.auto.research, (v) => (S.auto.research = v), 'Researches the cheapest available project automatically.'));
      this.hideDone = toggle('HIDE COMPLETED', () => S.settings.hideDone, (v) => { S.settings.hideDone = v; this.sig = ''; this.update(true); });
      top.appendChild(this.hideDone);
      page.appendChild(top);
      const s = section('REPEATABLE RESEARCH', 'Infinite research sinks. Each level costs more.');
      this.rep = h('div.items');
      s.appendChild(this.rep);
      page.appendChild(s);
      this.lanes = h('div.lanes');
      page.appendChild(section('RESEARCH TREE'));
      page.appendChild(this.lanes);
      this.sig = '';
    },
    update(force) {
      const S = G.S, D = G.D;
      U.setText(this.rpInfo, `${U.fmt(S.rp)} RP (+${U.fmt(D.rpRate)}/s)`);
      const visible = G.RESEARCH.filter((r) => G.Sim.researchVisible(r) && !(S.settings.hideDone && S.research[r.id]));
      const locked = G.RESEARCH.filter((r) => !G.Sim.researchVisible(r) && (!r.asi || S.flags.asi) && (r.req || []).some((q) => S.research[q] || G.Sim.researchVisible(G.RESEARCH.find((x) => x.id === q))));
      const sig = visible.map((r) => r.id + (S.research[r.id] ? 1 : 0)).join(',') + '|' + locked.length;
      if (force || sig !== this.sig) {
        this.sig = sig;
        this.lanes.innerHTML = '';
        for (const bid in G.BRANCHES) {
          const br = G.BRANCHES[bid];
          const nodes = visible.filter((r) => r.b === bid).concat(locked.filter((r) => r.b === bid).slice(0, 2)).sort((a, b) => a.t - b.t);
          if (!nodes.length) continue;
          const lane = h('div.lane', h('h5', { style: { background: br.color } }, br.name.toUpperCase()));
          for (const r of nodes) {
            const vis = G.Sim.researchVisible(r);
            const el = h('div.rnode', h('div.rn', vis ? r.name : '???'), h('div.rf', r.fx), h('div.rc', U.fmt(G.Sim.researchCost(r)) + ' RP'), h('div.rp-prog'));
            el._r = r;
            if (!vis) el.classList.add('hidden');
            el.addEventListener('click', () => {
              if (!vis || S.research[r.id]) return;
              if (!G.Sim.research(r.id)) G.Audio.error();
              else { const rc = el.getBoundingClientRect(); G.FX.burst(rc.left + rc.width / 2, rc.top + 10, { n: 20, colors: [br.color, '#ffffff'] }); }
            });
            UI.tip(el, () => vis ? `<b>${r.name}</b><div class="fx">${r.fx}</div><div class="tl2">${r.lore}</div><hr>Cost: ${U.fmt(G.Sim.researchCost(r))} RP${S.research[r.id] ? '<br><span style="color:var(--green)">RESEARCHED</span>' : ''}` : `<b>???</b><br>Requires: ${(r.req || []).map((q) => (G.RESEARCH.find((x) => x.id === q) || {}).name).join(', ')}`);
            lane.appendChild(el);
          }
          this.lanes.appendChild(lane);
        }
        // repeatables
        this.rep.innerHTML = '';
        for (const r of G.REPEATABLE) {
          if (!G.Sim.repeatVisible(r)) continue;
          const lvl = h('div.own');
          const cost = h('div.cost.rp');
          const fx = h('div.desc');
          const el = h('div.item', h('img.ic', { src: UI.icon('gear', 3, G.BRANCHES[r.b].color) }), h('div', h('div.name', r.name), fx, cost), lvl);
          el._r = r;
          el._lvl = lvl; el._cost = cost; el._fx = fx;
          el.addEventListener('click', () => { if (!G.Sim.researchRepeat(r.id)) G.Audio.error(); });
          UI.tip(el, () => `<b>${r.name}</b> (level ${S.repeat[r.id] || 0})<div class="fx">${r.fx(S.repeat[r.id] || 0)}</div><hr>Next level: ${U.fmt(G.Sim.repeatCost(r))} RP`);
          this.rep.appendChild(el);
        }
        if (!this.rep.childElementCount) this.rep.appendChild(h('div.empty', 'Unlock repeatable research by researching the Transformer, Mixed Precision, Quality Filtering...'));
      }
      for (const el of this.lanes.querySelectorAll('.rnode')) {
        const r = el._r;
        const done = !!S.research[r.id];
        U.toggleClass(el, 'done', done);
        if (!done && G.Sim.researchVisible(r)) {
          const c = G.Sim.researchCost(r);
          U.toggleClass(el, 'can', S.rp >= c);
          U.toggleClass(el, 'cant', S.rp < c);
          el.lastChild.style.width = Math.min(100, (S.rp / c) * 100) + '%';
        } else el.lastChild.style.width = '0';
      }
      for (const el of this.rep.children) if (el._r) {
        const r = el._r;
        const c = G.Sim.repeatCost(r);
        U.setText(el._lvl, S.repeat[r.id] || 0);
        U.setText(el._cost, U.fmt(c) + ' RP');
        U.setText(el._fx, r.fx(S.repeat[r.id] || 0));
        U.toggleClass(el, 'can', S.rp >= c);
        U.toggleClass(el._cost, 'no', S.rp < c);
      }
    },
  });

  /* ================================================================== TEAM */
  T.push({
    id: 'team', name: 'TEAM', unlocked: () => G.S.deployed >= 0 || Object.keys(G.S.res).length > 0,
    build(page) {
      const S = G.S;
      const autos = [];
      if (S.prestige.lessons.autohire) autos.push(toggle('AUTO-HIRE', () => S.auto.hire, (v) => (S.auto.hire = v), 'Hires the best RP/$ researchers with up to 30% of cash, and safety staff when your margin is low.'));
      const s1 = section('RESEARCHERS', 'Generate Research Points (RP). Boosted by the AI R&D multiplier as your models get smarter.');
      s1.appendChild(buyBar(autos));
      this.res = itemsBlock('res', G.RESEARCHERS);
      s1.appendChild(this.res);
      page.appendChild(s1);
      const s2 = section('SAFETY TEAM', 'Generate Alignment Points (AP). As capability grows, alignment must keep up — or incidents happen, and hidden misalignment builds toward a bad ending.');
      this.dash = h('div.dash', { style: { marginBottom: '8px' } });
      s2.appendChild(this.dash);
      this.saf = itemsBlock('safety', G.SAFETY);
      s2.appendChild(this.saf);
      page.appendChild(s2);
      const s3 = section('UPGRADES');
      this.upg = upgradesBlock(['res', 'safety']);
      s3.appendChild(this.upg);
      page.appendChild(s3);
      this.metrics = {};
      const mk = (id, title, tipText, red) => {
        const m = h('div.metric' + (red ? '.red' : ''), h('div.mt', title), h('div.mv', '-'));
        this.metrics[id] = m.lastChild;
        UI.tip(m, () => tipText);
        this.dash.appendChild(m);
      };
      mk('safety', 'SAFETY MARGIN', 'Effective alignment ÷ what your capability requires. Keep it ≥ 100%.');
      mk('align', 'ALIGNMENT SCORE', 'Grows with the log of accumulated Alignment Points, boosted by interpretability research.');
      mk('cot', 'CoT MONITORING', 'How readable your model\'s reasoning is. Falls with neuralese and superhuman capability.', true);
      mk('eval', 'EVAL AWARENESS', 'How often your model notices it\'s being tested. High awareness makes safety evals less trustworthy.', true);
      mk('mis', 'HIDDEN MISALIGNMENT', 'Grows while your safety margin is below 100%. Determines the ending at superintelligence. Research Model Organisms to measure it.', true);
    },
    update() {
      const S = G.S, D = G.D;
      this.res._upd();
      this.saf._upd();
      this.upg._upd();
      const m = this.metrics;
      U.setText(m.safety, D.alignReq > 0 ? U.fmtPct(Math.min(3, D.safety)) : 'N/A');
      m.safety.style.color = D.safety >= 1 ? 'var(--green)' : 'var(--red)';
      U.setText(m.align, `${D.alignEffective.toFixed(0)} / ${D.alignReq.toFixed(0)}`);
      U.setText(m.cot, U.fmtPct(Math.min(1, D.cotMon)));
      U.setText(m.eval, U.fmtPct(D.evalAware));
      U.setText(m.mis, D.revealMisalign ? S.misalign.toFixed(0) + '%' : '???');
    },
  });

  /* ================================================================== PRODUCTS */
  T.push({
    id: 'products', name: 'PRODUCTS', unlocked: () => !!G.S.research.gpt || Object.keys(G.S.products).length > 0,
    build(page) {
      this.mk = h('div.card', { style: { marginBottom: '10px' } });
      page.appendChild(this.mk);
      const s = section('PRODUCTS', 'Ship products to grow users and revenue per user (ARPU).');
      this.list = h('div.items');
      s.appendChild(this.list);
      page.appendChild(s);
      this.sig = '';
    },
    update(force) {
      const S = G.S, D = G.D;
      const over = D.usersDemand > D.usersCap * 1.01;
      U.setHTML(this.mk, `<div class="row sb"><span class="small">Users (served / demand)</span><span class="num">${U.fmt(D.users)} / ${U.fmt(D.usersDemand)}</span></div>
        <div class="pbar" style="margin-top:4px"><i style="width:${Math.min(100, (D.users / Math.max(1, D.usersDemand)) * 100)}%;${over ? 'background:var(--red)' : ''}"></i><span>${over ? '🔥 OUR GPUS ARE MELTING — add serving compute' : 'demand met'}</span></div>
        <div class="kv" style="margin-top:6px"><span class="k">ARPU</span><span class="v">${U.fmtMoney(D.arpu)}/user/s</span><span class="k">Revenue</span><span class="v">${U.fmtMoney(D.revenue)}/s</span><span class="k">Market size</span><span class="v">${U.fmt(D.popCap)}</span><span class="k">Vibes × rank</span><span class="v">${U.fmtMult(D.vibeMult)} × ${U.fmtMult(D.rankMult)}</span><span class="k">Serving cost/user</span><span class="v">${U.fmtFlops(D.costPerUser)}</span></div>`);
      const vis = G.PRODUCTS.filter((p) => S.products[p.id] || G.Sim.productUnlocked(p)).concat(G.PRODUCTS.filter((p) => !S.products[p.id] && !G.Sim.productUnlocked(p)).slice(0, 1));
      const sig = vis.map((p) => p.id + (S.products[p.id] ? 1 : 0)).join(',');
      if (force || sig !== this.sig) {
        this.sig = sig;
        this.list.innerHTML = '';
        for (const p of vis) {
          const un = G.Sim.productUnlocked(p);
          const cost = h('div.cost');
          const el = h('div.item' + (un ? '' : '.locked'), h('img.ic', { src: UI.icon(p.sprite, 3) }), h('div', h('div.name', G.Sim.productName(p)), h('div.desc', p.fx), cost), h('div.own', S.products[p.id] ? '✓' : ''));
          el._p = p; el._cost = cost;
          el.addEventListener('click', () => { if (S.products[p.id]) return; if (!G.Sim.buyProduct(p.id)) G.Audio.error(); else this.update(true); });
          UI.tip(el, () => `<b>${G.Sim.productName(p)}</b><div class="fx">${p.fx}</div><div class="tl2">${p.desc}</div>${un ? '' : '<hr><span style="color:var(--red)">🔒 ' + reqText(p.req) + '</span>'}`);
          this.list.appendChild(el);
        }
      }
      for (const el of this.list.children) if (el._p) {
        const p = el._p;
        if (S.products[p.id]) { U.setText(el._cost, 'LAUNCHED'); el._cost.style.color = 'var(--green)'; U.toggleClass(el, 'can', false); continue; }
        const c = G.Sim.productCost(p);
        U.setText(el._cost, U.fmtMoney(c));
        U.toggleClass(el._cost, 'no', S.money < c);
        U.toggleClass(el, 'can', S.money >= c && G.Sim.productUnlocked(p));
      }
    },
  });

  /* ================================================================== CARDS */
  T.push({
    id: 'cards', name: 'CARDS', unlocked: () => G.S.stats.packsOpened > 0 || G.Sim.totalPacks() > 0 || Object.keys(G.S.cards).length > 0,
    build(page) {
      const S = G.S;
      const s0 = section('LORE CRATES', 'HOLD TO OPEN. Duplicates level cards up (1→2→4→8→16 copies). Card bonuses stack.');
      this.inv = h('div.packshop');
      s0.appendChild(this.inv);
      const openAll = h('button.btn', { style: { marginTop: '6px' } }, 'OPEN ALL (INSTANT)');
      openAll.addEventListener('click', () => {
        const res = G.Pack.openAllInstant();
        if (!res.length) return;
        const best = res.slice().sort((a, b) => b.rarity.idx - a.rarity.idx)[0];
        UI.toast(`Opened ${res.length} crates. Best: ${best.rarity.name} ${best.card.name}. New cards: ${res.filter((r) => r.isNew).length}`, 'good');
        G.Audio.reveal(best.rarity.idx);
        this.update(true);
      });
      s0.appendChild(openAll);
      page.appendChild(s0);
      const s1 = section('STRAWBERRY SHOP', 'Spend 🍓 on crates.');
      this.shop = h('div.packshop');
      for (const k in G.PACKS) {
        const p = G.PACKS[k];
        const btn = h('button.btn', `${p.cost} 🍓`);
        btn.addEventListener('click', () => { if (G.Sim.buyPack(k)) { G.Audio.buy(); this.update(true); } else G.Audio.error(); });
        btn._c = p.cost;
        this.shop.appendChild(h('div.packbox', h('img', { src: UI.icon('crate', 3, p.color) }), h('div', h('div.name', { style: { fontFamily: 'var(--font-ui)', fontSize: '10px' } }, p.name), h('div.small', p.desc), btn)));
      }
      s1.appendChild(this.shop);
      page.appendChild(s1);
      const s2 = section('COLLECTION');
      this.summary = h('div.small', { style: { marginBottom: '6px' } });
      s2.appendChild(this.summary);
      const filters = h('div.filters');
      this.filter = this.filter || 'all';
      for (const f of ['all', 'owned', ...G.RARITIES.map((r) => r.id)]) {
        const b = h('button', f.toUpperCase());
        if (f === this.filter) b.classList.add('on');
        b.addEventListener('click', () => { this.filter = f; filters.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); this.sig = ''; this.update(true); });
        filters.appendChild(b);
      }
      s2.appendChild(filters);
      this.grid = h('div.cardgrid');
      s2.appendChild(this.grid);
      page.appendChild(s2);
      const s3 = section('SETS', 'Complete a set for a big bonus.');
      this.sets = h('div.sets');
      s3.appendChild(this.sets);
      page.appendChild(s3);
      this.sig = '';
    },
    update(force) {
      const S = G.S;
      // inventory
      const invSig = JSON.stringify(S.packs);
      if (force || invSig !== this.invSig) {
        this.invSig = invSig;
        this.inv.innerHTML = '';
        let any = false;
        for (const k in G.PACKS) {
          const n = S.packs[k] || 0;
          if (!n) continue;
          any = true;
          const p = G.PACKS[k];
          const btn = h('button.bigbtn', { style: { padding: '6px 10px', fontSize: '10px' } }, 'OPEN');
          btn.addEventListener('click', () => G.Pack.open(k, () => this.update(true)));
          this.inv.appendChild(h('div.packbox', h('img', { src: UI.icon('crate', 3, p.color) }), h('div', h('div', { style: { fontFamily: 'var(--font-ui)', fontSize: '10px' } }, `${p.name} ×${n}`), btn)));
        }
        if (!any) this.inv.appendChild(h('div.empty', 'No crates. Catch floating crates, complete objectives and milestones, or buy some with 🍓.'));
      }
      for (const b of this.shop.querySelectorAll('button')) b.disabled = S.strawberries < b._c;
      // collection
      const owned = Object.keys(S.cards).length;
      U.setText(this.summary, `${owned} / ${G.CARDS.length} cards · ${G.D.setsDone} / ${G.CARD_SETS.length} sets complete`);
      const sig = this.filter + JSON.stringify(S.cards);
      if (force || sig !== this.sig) {
        this.sig = sig;
        this.grid.innerHTML = '';
        const list = G.CARDS.filter((c) => this.filter === 'all' || (this.filter === 'owned' ? S.cards[c.id] : c.r === this.filter));
        for (const c of list) {
          const n = S.cards[c.id] || 0;
          const el = h('div.cc' + (n ? '' : '.missing'));
          el.appendChild(h('img', { src: faceUrl(c, n) }));
          if (n) {
            el.appendChild(h('span.lv', 'LV' + G.Calc.cardLevel(n)));
            el.appendChild(h('span.cnt', '×' + n));
          }
          el.addEventListener('click', () => { if (n) G.Modals.card(c); });
          UI.tip(el, () => {
            const r = G.RARITY[c.r];
            if (!n) return `<b>???</b> <span style="color:${r.color}">${r.name}</span><br>Not collected yet.`;
            const lv = G.Calc.cardLevel(n);
            return `<b>${c.name}</b> <span style="color:${r.color}">${r.name}</span>${c.handle ? '<br><span class="tiny">' + c.handle + '</span>' : ''}<div class="fx">LV ${lv}: ${G.BONUS[c.b].fmt(c.v * lv)}</div><div class="tl2">${c.flavor}</div><hr>${n} copies · next level at ${G.Calc.cardNext(n)}`;
          });
          this.grid.appendChild(el);
        }
        this.sets.innerHTML = '';
        for (const set of G.CARD_SETS) {
          const have = set.cards.filter((id) => S.cards[id]).length;
          const done = have === set.cards.length;
          const el = h('div.setbox' + (done ? '.done' : ''), h('b', set.name + (done ? ' ✓' : '')), h('div', `${have}/${set.cards.length} · ${set.desc}`), h('div.tiny', set.cards.map((id) => (S.cards[id] ? G.CARD[id].name : '???')).join(', ')));
          this.sets.appendChild(el);
        }
      }
    },
  });
  const faceCache = new Map();
  function faceUrl(card, n) {
    const key = card.id + (n ? '1' : '0');
    if (faceCache.has(key)) return faceCache.get(key);
    const c = G.Pack.faceFor(card, n);
    const u = c.toDataURL();
    faceCache.set(key, u);
    return u;
  }
  G.cardFaceUrl = faceUrl;

  /* ================================================================== RACE */
  T.push({
    id: 'race', name: 'RACE', unlocked: () => G.D.bestCap >= 60,
    build(page) {
      const s1 = section('LEADERBOARD (LMARENA)', 'Rivals release new models over time. Rank #1 = ×1.6 demand. Stall too long and they catch up.');
      this.board = h('div.board');
      s1.appendChild(this.board);
      page.appendChild(s1);
      const s2 = section('AI 2027 DASHBOARD', 'Inspired by the scenario at ai-2027.com — a month-by-month forecast of the road to superintelligence.');
      const link = h('a', { href: 'https://ai-2027.com', target: '_blank', rel: 'noopener', style: { color: 'var(--cyan)', fontFamily: 'var(--font-ui)', fontSize: '10px' } }, 'READ AI-2027.COM ↗');
      s2.appendChild(link);
      this.ai27 = h('div.dash', { style: { marginTop: '8px' } });
      s2.appendChild(this.ai27);
      this.radar = h('canvas.radar', { width: 260, height: 220 });
      const rbox = h('div.metric', h('div.mt', 'CAPABILITY PROFILE (vs top human experts)'), this.radar);
      this.ai27.appendChild(rbox);
      this.m = {};
      const mk = (id, title, tipText) => {
        const m = h('div.metric', h('div.mt', title), h('div.mv', '-'));
        this.m[id] = m.lastChild;
        if (tipText) UI.tip(m, () => tipText);
        this.ai27.appendChild(m);
      };
      mk('rd', 'AI R&D PROGRESS MULTIPLIER', 'How much faster research goes with your AIs than without. AI 2027: Agent-1 1.5×, Agent-2 3×, Agent-3 4-10×, Agent-4 50×.');
      mk('china', 'LEAD OVER DEEPCENT', 'How far ahead you are of the leading Chinese lab (≈6 capability per month).');
      mk('share', 'YOUR SHARE OF FRONTIER COMPUTE', 'Your compute vs rivals (estimated).');
      mk('approval', 'PUBLIC APPROVAL', 'Net approval of your lab (from vibes and safety).');
      mk('rev', 'ANNUALIZED REVENUE', 'Revenue per second × seconds per year (game time is compressed).');
      mk('stage', 'NEXT CAPABILITY STAGE', 'Superhuman Coder (350) → Superhuman AI Researcher (400) → Superintelligent AI Researcher (450) → ASI (500).');
      this.timeline = h('div.timeline', { style: { marginTop: '10px' } });
      s2.appendChild(this.timeline);
      page.appendChild(s2);
      const s3 = section('FRONTIER DASHBOARD', 'Every axis of scaling, plus the two red curves everyone worries about.');
      this.front = h('div.dash');
      this.fc = {};
      const axes = [
        ['substrate', 'Compute substrate', 'Model & hardware co-design'],
        ['ttc', 'Test-time compute', 'More inference-time thought'],
        ['train', 'Training-time compute', 'Larger runs on more/better data'],
        ['ttt', 'Test-time training', 'Weight updates during a task'],
        ['agents', 'Agents & swarm-training', 'Coordinated execution > parallel compute'],
        ['rsi', 'Recursive self-improvement', 'AI speeding AI research'],
        ['eval', 'Eval awareness', 'Increasing recognition of evaluations', true],
        ['cot', 'CoT monitoring effectiveness', 'Decreasing visibility into reasoning', true],
      ];
      for (const [id, title, sub, red] of axes) {
        const cv = h('canvas', { width: 240, height: 70 });
        this.fc[id] = cv;
        this.front.appendChild(h('div.metric' + (red ? '.red' : ''), h('div.mt', title.toUpperCase()), h('div.tiny', sub), cv));
      }
      s3.appendChild(this.front);
      page.appendChild(s3);
    },
    update() {
      const S = G.S, D = G.D;
      // leaderboard
      const rows = [{ id: S.lab, cap: D.cap, model: D.model ? D.model.name : '—', me: true }];
      for (const id in S.rivals) if (S.rivals[id].cap > 0) rows.push({ id, cap: S.rivals[id].cap, model: S.rivals[id].model });
      rows.sort((a, b) => b.cap - a.cap);
      const maxCap = Math.max(1, rows[0].cap);
      const html = rows.map((r, i) => {
        const lab = G.LABS[r.id];
        return `<div class="lrow${r.me ? ' me' : ''}"><span class="rk">#${i + 1}</span><img src="${G.Sprites.url(lab.logo, 2)}" style="width:24px;height:24px"><span><div class="ln" style="color:${lab.color}">${lab.name}${r.me ? ' (YOU)' : ''}</div><div class="lm">${U.escape(r.model)}</div></span><span class="lbar"><i style="width:${(r.cap / maxCap) * 100}%;background:${lab.color}"></i></span><span class="lc">${Math.round(1000 + r.cap * 3.2)}</span></div>`;
      }).join('');
      U.setHTML(this.board, html);
      // ai 2027 metrics
      const m = this.m;
      U.setText(m.rd, U.fmtMult(Math.max(1, D.rdEffective || D.rdMult)));
      const ds = S.rivals.deepseek ? S.rivals.deepseek.cap : 0;
      const gap = (D.cap - ds) / 6;
      U.setText(m.china, S.lab === 'deepseek' ? 'You ARE DeepCent' : gap >= 0 ? `${gap.toFixed(1)} months` : `${(-gap).toFixed(1)} months BEHIND`);
      const rivalCompute = Object.values(S.rivals).reduce((a, r) => a + (r.cap > 0 ? D.compute * Math.pow(10, (r.cap - D.cap) / 15.2) : 0), 0);
      const share = D.compute / Math.max(1, D.compute + rivalCompute);
      U.setText(m.share, U.fmtPct(Math.min(0.99, share)));
      const approval = U.clamp(S.vibe * 0.4 + (D.safety - 1) * 20 - (S.stats.incidents || 0) * 0.5, -60, 60);
      U.setText(m.approval, (approval >= 0 ? '+' : '') + approval.toFixed(0) + '%');
      m.approval.style.color = approval >= 0 ? 'var(--green)' : 'var(--red)';
      U.setText(m.rev, U.fmtMoney(D.revenue * 3.15e7) + '/yr');
      const stages = [[300, 'Agent-1'], [350, 'Superhuman Coder'], [400, 'Superhuman AI Researcher'], [450, 'Superintelligent AI Researcher'], [500, 'ASI']];
      const nx = stages.find(([c]) => D.bestCap < c);
      U.setText(m.stage, nx ? `${nx[1]} @ ${nx[0]}` : 'ASI ACHIEVED');
      drawRadar(this.radar, D.cap);
      // timeline
      const tl = G.MILESTONES.filter((x) => x.ai27);
      const next = tl.find((x) => !S.milestones[x.id]);
      U.setHTML(this.timeline, tl.map((x) => `<div class="tl ${S.milestones[x.id] ? 'done' : x === next ? 'next' : 'future'}"><span class="d">${U.fmtDate(x.date)}</span><span class="tt">${U.escape(x.title)}</span></div>`).join(''));
      // frontier charts
      const H = G.Hist.data;
      const series = {
        substrate: H.map((p) => p.hw), ttc: H.map((p) => p.ttc), train: H.map((p) => p.run), ttt: H.map((p) => p.ttt),
        agents: H.map((p) => p.ag), rsi: H.map((p) => p.rd), eval: H.map((p) => p.ev), cot: H.map((p) => p.cot),
      };
      for (const id in this.fc) drawSpark(this.fc[id], series[id], id === 'eval' || id === 'cot' ? '#ff4d6d' : '#3fa7ff', id === 'cot');
    },
  });
  function drawSpark(cv, data, col, invert) {
    const x = cv.getContext('2d');
    const w = cv.width, hh = cv.height;
    x.fillStyle = '#0b0a1a';
    x.fillRect(0, 0, w, hh);
    x.strokeStyle = '#2a2650';
    x.beginPath(); x.moveTo(12, 6); x.lineTo(12, hh - 8); x.lineTo(w - 4, hh - 8); x.stroke();
    if (!data || data.length < 2) return;
    let mn = Math.min(...data), mx = Math.max(...data);
    if (mx - mn < 1e-9) { mx += 1; mn -= invert ? 0 : 0; }
    const px = (i) => 14 + (i / (data.length - 1)) * (w - 20);
    const py = (v) => hh - 10 - ((v - mn) / (mx - mn)) * (hh - 20);
    x.strokeStyle = col;
    x.lineWidth = 2;
    x.beginPath();
    data.forEach((v, i) => (i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v))));
    x.stroke();
    // projection (dotted)
    const n = data.length;
    const slope = (data[n - 1] - data[Math.max(0, n - 10)]) / Math.min(9, n - 1);
    x.setLineDash([2, 3]);
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(px(n - 1), py(data[n - 1]));
    x.lineTo(w - 4, py(data[n - 1] + slope * 6));
    x.stroke();
    x.setLineDash([]);
    x.fillStyle = col;
    x.fillRect(px(n - 1) - 2, py(data[n - 1]) - 2, 5, 5);
    x.fillStyle = '#ff4d6d';
    x.fillRect(px(n - 1) - 1, hh - 9, 3, 3);
    x.font = '7px Silkscreen, monospace';
    x.fillText('NOW', px(n - 1) - 8, hh - 1);
  }
  function drawRadar(cv, cap) {
    const axes = [['Hacking', 330], ['Coding', 300], ['Politics', 380], ['Bioweapons', 360], ['Robotics', 420], ['Forecasting', 350]];
    const x = cv.getContext('2d');
    const w = cv.width, hh = cv.height, cxp = w / 2, cyp = hh / 2 + 6, R = 78;
    x.fillStyle = '#0b0a1a';
    x.fillRect(0, 0, w, hh);
    const pt = (i, r) => {
      const a = -Math.PI / 2 + (i / axes.length) * Math.PI * 2;
      return [cxp + Math.cos(a) * r, cyp + Math.sin(a) * r];
    };
    x.strokeStyle = '#2a2650';
    for (const k of [0.25, 0.5, 0.75, 1]) {
      x.beginPath();
      axes.forEach((_, i) => { const [px, py] = pt(i, R * k); i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.closePath();
      x.stroke();
    }
    // human expert ring at 0.6
    x.strokeStyle = '#ffe45c';
    x.setLineDash([3, 3]);
    x.beginPath();
    axes.forEach((_, i) => { const [px, py] = pt(i, R * 0.6); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.closePath();
    x.stroke();
    x.setLineDash([]);
    x.fillStyle = 'rgba(255,92,200,0.35)';
    x.strokeStyle = '#ff5cc8';
    x.beginPath();
    axes.forEach(([, c], i) => {
      const v = 0.05 + 0.95 * U.sigmoid((cap - c) / 30);
      const [px, py] = pt(i, R * v);
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#9a96c8';
    x.font = '8px Silkscreen, monospace';
    x.textAlign = 'center';
    axes.forEach(([n], i) => { const [px, py] = pt(i, R + 12); x.fillText(n, px, py + 3); });
    x.textAlign = 'left';
    x.fillStyle = '#ffe45c';
    x.fillText('--- top human', 4, hh - 4);
  }

  /* ================================================================== LESSONS (prestige) */
  T.push({
    id: 'lessons', name: 'LESSONS', unlocked: () => G.S.prestige.count > 0 || G.D.bestCap >= G.BAL.PRESTIGE_MIN_CAP - 25,
    build(page) {
      this.top = h('div.card', { style: { marginBottom: '10px' } });
      page.appendChild(this.top);
      this.pbtn = h('button.bigbtn', { style: { marginTop: '8px' } }, 'LEARN THE BITTER LESSON');
      this.pbtn.addEventListener('click', () => G.Modals.prestige());
      this.top.appendChild(h('div#blInfo'));
      this.top.appendChild(this.pbtn);
      const s = section('LESSONS', 'Permanent upgrades bought with Bitter Lessons. They survive every reset.');
      this.list = h('div.items');
      for (const l of G.LESSONS) {
        const lvl = h('div.own');
        const cost = h('div.cost');
        const fx = h('div.desc');
        const el = h('div.item', h('img.ic', { src: UI.icon('scroll', 3) }), h('div', h('div.name', l.name), fx, cost), lvl);
        el._l = l; el._lvl = lvl; el._cost = cost; el._fx = fx;
        el.addEventListener('click', () => { if (G.Sim.buyLesson(l.id)) { G.Audio.bigBuy(); if (['autobuy', 'autotrain', 'autoresearch', 'autohire'].includes(l.id)) G.UI.rebuild(); } else G.Audio.error(); });
        UI.tip(el, () => `<b>${l.name}</b> (${G.S.prestige.lessons[l.id] || 0}/${l.max})<div class="fx">Now: ${l.fx(G.S.prestige.lessons[l.id] || 0)}</div>${(G.S.prestige.lessons[l.id] || 0) < l.max ? `<div>Next: ${l.fx((G.S.prestige.lessons[l.id] || 0) + 1)}</div><hr>Cost: ${G.Sim.lessonCost(l)} BL` : ''}`);
        this.list.appendChild(el);
      }
      s.appendChild(this.list);
      page.appendChild(s);
      // challenges
      if (G.Sim.challengesUnlocked()) {
        const sc = section('CHALLENGES', 'Rule-changing runs. Starting one resets your run (you still earn any Bitter Lessons). It lasts across resets until you reach ASI or abandon it.');
        this.chal = h('div.items');
        for (const c of G.CHALLENGES) {
          const st = h('div.cost');
          const btn = h('button.btn', 'START');
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const S = G.S;
            if (S.challenge && S.challenge.id === c.id) {
              if (confirm('Abandon this challenge?')) { G.Sim.abandonChallenge(); this.update(); }
              return;
            }
            if (confirm(`Start "${c.name}"?\n\n${c.rules}\n\nThis resets your current run.`)) { G.Sim.startChallenge(c.id); G.Main.save(); }
          });
          const el = h('div.item', h('img.ic', { src: UI.icon(c.icon, 3) }), h('div', h('div.name', c.name), h('div.desc', c.rules), st), btn);
          el._c = c; el._st = st; el._btn = btn;
          UI.tip(el, () => `<b>${c.name}</b><br>${c.rules}<div class="fx">Reward: ${c.reward}</div>`);
          this.chal.appendChild(el);
        }
        sc.appendChild(this.chal);
        page.appendChild(sc);
      } else this.chal = null;
    },
    update() {
      const S = G.S, D = G.D;
      if (this.chal) for (const el of this.chal.children) {
        const c = el._c;
        const done = S.challengesDone && S.challengesDone[c.id];
        const active = S.challenge && S.challenge.id === c.id;
        U.setText(el._st, active ? `ACTIVE${c.timeLimit ? ' · ' + U.fmtTime(Math.max(0, c.timeLimit - (S.stats.playTime - S.challenge.start))) + ' left' : ''}` : done ? 'COMPLETED ✓ · ' + c.reward : 'Reward: ' + c.reward);
        el._st.style.color = active ? 'var(--yellow)' : done ? 'var(--green)' : 'var(--dim)';
        el._btn.textContent = active ? 'ABANDON' : 'START';
        el._btn.disabled = !!(S.challenge && !active);
      }
      const gain = D.blGain;
      const capForNext = G.BAL.BL_BASE + G.BAL.BL_DIV * Math.pow((gain + 1) / D.M.bl, 1 / G.BAL.BL_POW);
      U.setHTML(document.getElementById('blInfo'), `<div class="row sb"><span class="small">Bitter Lessons (bank / total)</span><span class="num" style="color:var(--gold)">${U.fmtInt(S.prestige.bank)} / ${U.fmtInt(S.prestige.totalBL)}</span></div>
        <div class="row sb"><span class="small">Passive bonus (compute, revenue, research)</span><span class="num">${U.fmtMult(D.blMult)}</span></div>
        <div class="row sb"><span class="small">Prestiges</span><span class="num">${S.prestige.count}</span></div>
        <div class="row sb" style="margin-top:6px"><span class="small">Gain if you reset now (best capability ${D.bestCap.toFixed(1)})</span><span class="num" style="color:${gain > 0 ? 'var(--green)' : 'var(--red)'}">+${U.fmtInt(gain)} BL</span></div>
        <div class="tiny">${gain < 1 ? `Reach capability ${(G.BAL.BL_BASE + G.BAL.BL_DIV).toFixed(0)} to earn your first Bitter Lesson.` : `Next +1 at capability ${capForNext.toFixed(1)}.`} Resets money, hardware, data, team, research and models. Keeps cards, strawberries, achievements, lessons.</div>`);
      this.pbtn.disabled = gain < 1;
      for (const el of this.list.children) {
        const l = el._l;
        const lv = S.prestige.lessons[l.id] || 0;
        U.setText(el._lvl, lv + '/' + l.max);
        U.setText(el._fx, l.fx(lv));
        if (lv >= l.max) { U.setText(el._cost, 'MAXED'); U.toggleClass(el, 'can', false); continue; }
        const c = G.Sim.lessonCost(l);
        U.setText(el._cost, U.fmtInt(c) + ' BL');
        U.toggleClass(el._cost, 'no', S.prestige.bank < c);
        U.toggleClass(el, 'can', S.prestige.bank >= c);
      }
    },
  });

  /* ================================================================== COSMOS */
  T.push({
    id: 'cosmos', name: 'COSMOS', unlocked: () => !!G.S.cosmos,
    build(page) {
      const S = G.S;
      if (!S.cosmos) return;
      this.info = h('div.dash');
      page.appendChild(this.info);
      this.m = {};
      const mk = (id, title) => { const m = h('div.metric', h('div.mt', title), h('div.mv', '-')); this.m[id] = m.lastChild; this.info.appendChild(m); };
      mk('energy', 'ENERGY CAPTURED');
      mk('kard', 'KARDASHEV SCALE');
      mk('stars', 'STAR SYSTEMS');
      mk('cc', 'COSMIC COMPUTE');
      mk('joules', 'TOTAL ENERGY HARVESTED');
      mk('ending', 'THE TRAJECTORY');
      const s1 = section('ALLOCATION', 'Split the output of your self-replicating industry.');
      this.sl = {};
      for (const [k, label, tipText] of [['rep', 'REPLICATE', 'Build more collectors & factories (energy grows exponentially).'], ['compute', 'THINK', 'Turn energy into compute for training ever-smarter minds.'], ['explore', 'EXPLORE', 'Launch probes to colonize star systems (after Von Neumann Probes).']]) {
        const inp = h('input', { type: 'range', min: 0, max: 100, value: Math.round(S.cosmos.alloc[k] * 100) });
        const v = h('span.num');
        inp.addEventListener('input', () => { G.Sim.setCosmosAlloc(k, inp.value / 100); });
        this.sl[k] = { inp, v };
        const row = h('div.slider', { style: { gridTemplateColumns: '90px 1fr 50px' } }, label, inp, v);
        UI.tip(row, () => tipText);
        s1.appendChild(row);
      }
      page.appendChild(s1);
      const s2 = section('MEGAPROJECTS');
      this.proj = h('div.items');
      s2.appendChild(this.proj);
      page.appendChild(s2);
      const s3 = section('THE OMEGA POINT', 'Reset everything — even Bitter Lessons — to begin a new universe with Ω. Ω multiplies everything forever.');
      this.omega = h('div.card');
      this.obtn = h('button.bigbtn', 'BEGIN A NEW UNIVERSE');
      this.obtn.addEventListener('click', () => G.Modals.omega());
      s3.appendChild(this.omega);
      s3.appendChild(h('div', { style: { marginTop: '6px' } }, this.obtn));
      page.appendChild(s3);
      this.psig = '';
    },
    update(force) {
      const S = G.S, D = G.D;
      const c = S.cosmos;
      if (!c || !this.m) return;
      const m = this.m;
      U.setText(m.energy, U.fmtWatts(c.energy));
      U.setText(m.kard, 'Type ' + G.KARDASHEV(c.energy).toFixed(2));
      U.setText(m.stars, U.fmt(c.stars));
      U.setText(m.cc, U.fmtFlops(D.cosmicCompute));
      U.setText(m.joules, U.fmt(c.joules) + ' J');
      m.joules.previousSibling.textContent = 'ENERGY BANK (spend on megaprojects)';
      U.setText(m.ending, S.ending === 'aligned' ? 'Machines of Loving Grace' : 'Consensus-1');
      m.ending.style.color = S.ending === 'aligned' ? 'var(--green)' : 'var(--red)';
      for (const k in this.sl) {
        const { inp, v } = this.sl[k];
        if (document.activeElement !== inp) inp.value = Math.round(c.alloc[k] * 100);
        U.setText(v, Math.round(c.alloc[k] * 100) + '%');
      }
      const sig = Object.keys(c.projects).join(',') + G.MEGAPROJECTS.map((p) => (G.Sim.projectAvailable(p) ? 1 : 0)).join('');
      if (force || sig !== this.psig) {
        this.psig = sig;
        this.proj.innerHTML = '';
        for (const p of G.MEGAPROJECTS) {
          const done = !!c.projects[p.id];
          const av = G.Sim.projectAvailable(p);
          const idx = G.MEGAPROJECTS.indexOf(p);
          if (!done && !av && idx > 0 && !c.projects[G.MEGAPROJECTS[idx - 1].id]) continue;
          const cost = h('div.cost');
          const el = h('div.item' + (done ? '' : av ? '' : '.locked'), h('img.ic', { src: UI.icon(['robot', 'planet', 'rocket', 'galaxy', 'orb', 'galaxy', 'infinity'][idx], 3) }), h('div', h('div.name', p.name), h('div.desc', p.fx), cost), h('div.own', done ? '✓' : ''));
          el._p = p; el._cost = cost;
          el.addEventListener('click', () => { if (!done && !G.Sim.buyProject(p.id)) G.Audio.error(); else this.update(true); });
          UI.tip(el, () => {
            const reqs = [];
            if (p.needEnergy) reqs.push('Energy ≥ ' + U.fmtWatts(p.needEnergy));
            if (p.needStars) reqs.push('Stars ≥ ' + U.fmt(p.needStars));
            if (p.needResearch) reqs.push('Research: ' + G.RESEARCH.find((r) => r.id === p.needResearch).name);
            return `<b>${p.name}</b><div class="fx">${p.fx}</div><div class="tl2">${S.ending === 'misaligned' ? p.misaligned : p.aligned}</div><hr>Cost: ${U.fmt(p.cost.joules)} J of harvested energy${reqs.length ? '<br>Requires: ' + reqs.join(', ') : ''}`;
          });
          this.proj.appendChild(el);
        }
      }
      for (const el of this.proj.children) if (el._p && !c.projects[el._p.id]) {
        const p = el._p;
        U.setText(el._cost, `${U.fmt(p.cost.joules)} J`);
        const can = G.Sim.projectAvailable(p) && c.joules >= p.cost.joules;
        U.toggleClass(el, 'can', can);
      }
      const og = G.Sim.omegaGain();
      U.setHTML(this.omega, `<div class="row sb"><span class="small">Ω (total)</span><span class="num" style="color:var(--accent2)">${S.omega.total}</span></div><div class="row sb"><span class="small">Gain now</span><span class="num">${og ? '+' + og + ' Ω' : 'complete The Omega Point megaproject'}</span></div>`);
      this.obtn.disabled = !og;
    },
  });

  /* ================================================================== STATS */
  T.push({
    id: 'stats', name: 'STATS', unlocked: () => true,
    build(page) {
      this.stats = h('div.card', { style: { marginBottom: '10px' } });
      page.appendChild(this.stats);
      const row = h('div.row', { style: { gap: '6px', marginBottom: '10px', flexWrap: 'wrap' } });
      const b1 = h('button.btn', 'SETTINGS & SAVES');
      b1.addEventListener('click', () => G.Modals.settings());
      const b2 = h('button.btn', 'CREDITS & ABOUT');
      b2.addEventListener('click', () => G.Modals.credits());
      const b3 = h('button.btn', 'HOW TO PLAY');
      b3.addEventListener('click', () => G.Modals.help());
      row.appendChild(b1); row.appendChild(b2); row.appendChild(b3);
      page.appendChild(row);
      const s = section('ACHIEVEMENTS', 'Each achievement: +1% compute, revenue and research.');
      this.ach = h('div.upgrades');
      s.appendChild(this.ach);
      page.appendChild(s);
      this.sig = '';
    },
    update(force) {
      const S = G.S, D = G.D;
      const st = S.stats;
      const rows = [
        ['Play time', U.fmtTime(st.playTime)], ['This run', U.fmtTime(S.run.time)], ['Lab', G.LABS[S.lab].name],
        ['Total money earned', U.fmtMoney(st.totalMoney)], ['Clicks', U.fmtInt(st.clicks)], ['Training runs', st.runs],
        ['Largest run', U.fmtFlop(st.maxRunFlop)], ['Best capability ever', st.bestCapEver.toFixed(1)], ['Drops caught', st.drops],
        ['Crates opened', st.packsOpened], ['Mini-events won', st.miniWins], ['Incidents', st.incidents || 0],
        ['Prestiges', S.prestige.count], ['Superintelligences', st.asiCount], ['Achievements', Object.keys(S.achievements).length + ' / ' + G.ACHIEVEMENTS.length],
      ];
      U.setHTML(this.stats, '<div class="kv">' + rows.map(([k, v]) => `<span class="k">${k}</span><span class="v">${v}</span>`).join('') + '</div>');
      const sig = Object.keys(S.achievements).length;
      if (force || sig !== this.sig) {
        this.sig = sig;
        this.ach.innerHTML = '';
        for (const a of G.ACHIEVEMENTS) {
          const got = !!S.achievements[a.id];
          const el = h('div.upg' + (got ? '' : '.cant'), { style: { opacity: got ? 1 : 0.35 } }, h('img', { src: UI.icon(got ? 'trophy' : 'lock', 2) }));
          UI.tip(el, () => (got || !a.hidden ? `<b>${a.name}</b><br>${a.desc}${got ? '<br><span style="color:var(--green)">UNLOCKED</span>' : ''}` : '<b>???</b><br>Hidden achievement'));
          this.ach.appendChild(el);
        }
      }
    },
  });

  /* ================================================================== history sampler (for charts) */
  G.Hist = {
    data: [],
    acc: 0,
    tick(dt) {
      this.acc += dt;
      if (this.acc < 5 && this.data.length > 2) return;
      this.acc = 0;
      const D = G.D, S = G.S;
      this.data.push({
        hw: Math.log10(Math.max(1, D.computeRaw)), ttc: D.capTTC, run: Math.log10(Math.max(1, S.stats.maxRunFlop)), ttt: D.capTTT,
        ag: D.capAgents, rd: D.rdEffective || D.rdMult, ev: D.evalAware, cot: Math.min(1, D.cotMon),
      });
      if (this.data.length > 240) this.data.shift();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
