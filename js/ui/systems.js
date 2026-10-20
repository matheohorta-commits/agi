/* UI for the v4 systems: the DATACENTER tab (grid), the POLICY tab (laws & influence), star researchers in TEAM,
 * training ops in TRAIN, the hype-bubble panel, training-incident alerts and the model-trust badge. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const h = U.h;
  const UI = G.UI;
  const Sim = () => G.Sim;
  const Y = G.SYS;

  function section(title, help) {
    const s = h('div.section', h('h4', title, h('span.grow')));
    if (help) s.appendChild(h('p.help', help));
    return s;
  }
  function flash(el, colors) {
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    const r = el.getBoundingClientRect();
    G.FX.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 16, colors: colors || ['#ffe45c', '#ffffff', '#5cf27a'] });
  }
  const clock = (sec) => { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
  const labName = (id) => (G.LABS[id] || {}).name || id;
  const pct = (v) => '+' + (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%';
  const starImg = (st) => (st.card && G.CARD[st.card] ? G.Sprites.cardUrl(G.CARD[st.card], 48) : UI.icon('person', 3, st.tint));
  const TIER = ['', 'RISING STAR', 'STAR', 'LEGEND'];
  const addTab = (tab, after) => { const T = UI.tabs, at = T.findIndex((t) => t.id === after); T.splice(at >= 0 ? at + 1 : T.length, 0, tab); };

  /* ================================================================== DATACENTER */
  addTab({
    id: 'grid', name: 'DATACENTER', unlocked: () => Sim().gridOpen(),
    tool: 'pod',
    build(page) {
      const s0 = section('YOUR DATACENTER', 'Lay out the hall. GPU PODS make compute but need LIQUID COOLING next to them; SUBSTATIONS boost their neighbours; INFINIBAND SWITCHES link pods into one fabric for faster training. Every module costs more than the last, so placement matters. Right-click a module to remove it (50% refund).');
      this.stats = h('div.gstats');
      s0.appendChild(this.stats);
      this.pal = h('div.gpal');
      this.palBtns = {};
      for (const m of G.GRID_MODULES) {
        const cost = h('span.gc');
        const b = h('button.gtool', { style: { '--mc': m.color } }, h('img', { src: UI.icon(m.sprite, 2) }), h('span.gn', m.name), cost);
        b._cost = cost;
        b.addEventListener('click', () => { this.tool = m.id; G.Audio.tab(); this.update(true); });
        UI.tip(b, () => `<b>${m.name}</b><br>${m.desc}<hr>Cost: <b style="color:var(--money)">${U.fmtMoney(Sim().gridCost(m))}</b>${Sim().gridModAvailable(m) ? '' : '<br><span style="color:var(--red)">Available once power is the bottleneck</span>'}`);
        this.palBtns[m.id] = b;
        this.pal.appendChild(b);
      }
      const rm = h('button.gtool.rm', h('span.gn', '✕ REMOVE'), h('span.gc', '50% refund'));
      rm.addEventListener('click', () => { this.tool = 'remove'; G.Audio.tab(); this.update(true); });
      this.palBtns.remove = rm;
      this.pal.appendChild(rm);
      s0.appendChild(this.pal);
      this.hall = h('div.ghall');
      s0.appendChild(h('div.ghallwrap', this.hall));
      const acts = h('div.row', { style: { flexWrap: 'wrap', gap: '6px', marginTop: '10px' } });
      this.expBtn = h('button.btn');
      this.expBtn.addEventListener('click', () => { if (Sim().gridExpand()) { G.Audio.bigBuy(); this.update(true); } else G.Audio.error(); });
      UI.tip(this.expBtn, () => '<b>EXPAND THE HALL</b><br>Adds a column (or a row once the hall is wide). Max 12×8.');
      this.rebBtn = h('button.btn');
      this.rebBtn.addEventListener('click', () => { const n = Sim().gridRebuild(); if (n) { G.Audio.bigBuy(); UI.toast(`Rebuilt ${n} module${n > 1 ? 's' : ''} from your blueprint.`, 'good'); } else G.Audio.error(); this.update(true); });
      UI.tip(this.rebBtn, () => '<b>REBUILD FROM BLUEPRINT</b><br>After a Bitter Lesson the hall is empty, but your last layout is saved. This buys its modules in order until you run out of money.');
      const saveBtn = h('button.btn', 'SAVE BLUEPRINT');
      saveBtn.addEventListener('click', () => { Sim().gridSaveBlueprint(); UI.toast('Blueprint saved.', 'good'); this.update(true); });
      acts.appendChild(this.expBtn);
      acts.appendChild(this.rebBtn);
      acts.appendChild(saveBtn);
      s0.appendChild(acts);
      page.appendChild(s0);
      this.sig = '';
    },
    renderHall() {
      const g = G.S.grid, D = G.D, e = D.grid;
      this.hall.innerHTML = '';
      this.hall.style.gridTemplateColumns = `repeat(${g.w}, var(--cell))`;
      g.cells.forEach((id, i) => {
        const m = id && G.GRID_MODULES.find((x) => x.id === id);
        const info = e && e.cells[i];
        const el = h('div.gcell' + (m ? '.' + m.id : '.empty') + (info && info.hot ? '.hot' : '') + (info && info.fabric ? '.fab' : ''), { style: m ? { '--mc': m.color } : null },
          m ? h('img', { src: UI.icon(m.sprite, 2) }) : null,
          info && info.v ? h('span.gv', (info.kind === 'power' ? '−' : '+') + (info.v * 100).toFixed(info.v < 0.1 ? 1 : 0) + '%') : null,
          info && info.fabric && id === 'switch' ? h('span.gv', '⇄' + info.fabric) : null);
        el._i = i;
        el.addEventListener('click', () => this.clickCell(i, el));
        el.addEventListener('contextmenu', (ev) => { ev.preventDefault(); if (G.S.grid.cells[i] && Sim().gridRemove(i)) { G.Audio.buy(); this.update(true); } });
        el.addEventListener('mouseenter', () => this.hover(i, true));
        el.addEventListener('mouseleave', () => this.hover(i, false));
        UI.tip(el, () => this.cellTip(i));
        this.hall.appendChild(el);
      });
    },
    hover(i, on) {
      const g = G.S.grid, x = i % g.w, y = (i / g.w) | 0;
      for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (a < 0 || b < 0 || a >= g.w || b >= g.h) continue;
        const c = this.hall.children[b * g.w + a];
        if (c) c.classList.toggle('nb', on);
      }
    },
    cellTip(i) {
      const S = G.S, g = S.grid, id = g.cells[i], D = G.D, info = D.grid && D.grid.cells[i];
      if (!id) {
        if (this.tool === 'remove') return '<b>EMPTY SLOT</b>';
        const m = G.GRID_MODULES.find((x) => x.id === this.tool);
        return `<b>EMPTY SLOT</b><br>Click to build: ${m.name} (${U.fmtMoney(Sim().gridCost(m))})`;
      }
      const m = G.GRID_MODULES.find((x) => x.id === id);
      let s = `<b>${m.name}</b><div class="tl2">${m.desc}</div><hr>`;
      if (id === 'pod') s += info.hot ? '<span style="color:var(--red)">🔥 OVERHEATING — put LIQUID COOLING next to it</span><br>' : '<span style="color:var(--cyan)">❄ Cooled</span><br>';
      if (info && info.v) s += `Output: <b>${(info.v * 100).toFixed(1)}% ${info.kind}</b><br>`;
      if (info && info.fabric) s += `Fabric: ${info.fabric} linked pods<br>`;
      return s + `<span class="tiny">Right-click to remove (+${U.fmtMoney(Sim().gridRefund(i))})</span>`;
    },
    clickCell(i, el) {
      const S = G.S;
      if (this.tool === 'remove') {
        if (S.grid.cells[i] && Sim().gridRemove(i)) { G.Audio.buy(); this.update(true); }
        return;
      }
      if (S.grid.cells[i]) { this.tool = S.grid.cells[i]; this.update(true); return; }
      if (Sim().gridPlace(i, this.tool)) {
        G.Audio.buy();
        this.update(true);
        const c = this.hall.children[i];
        if (c) flash(c, ['#5cf27a', '#3ee6ff', '#ffffff']);
      } else G.Audio.error();
    },
    update(force) {
      const S = G.S, g = S.grid, D = G.D, e = D.grid || { compute: 0, train: 0, serve: 0, data: 0, power: 0, hot: 0, fabricMax: 0, pods: 0 };
      const sig = g.w + 'x' + g.h + g.cells.join(',') + (S.flags.power ? 'p' : '');
      if (force || sig !== this.sig) { this.sig = sig; this.renderHall(); }
      const placed = g.cells.filter(Boolean).length;
      U.setHTML(this.stats, [
        ['COMPUTE', pct(e.compute), 'var(--flops)', `${e.pods} pods`],
        ['TRAINING SPEED', pct(e.train), 'var(--rp)', e.fabricMax ? `largest fabric: ${e.fabricMax} pods` : 'add a switch next to pods'],
        ['SERVING', pct(e.serve), 'var(--orange)', 'inference racks'],
        ['DATA', pct(e.data), 'var(--data)', 'data lakes'],
        ['POWER DRAW', S.flags.power ? '−' + (Math.min(0.6, e.power) * 100).toFixed(0) + '%' : '—', 'var(--gold)', 'on-site solar'],
        ['HALL', `${placed}/${g.w * g.h}`, e.hot ? 'var(--red)' : '#fff', e.hot ? `🔥 ${e.hot} pod${e.hot > 1 ? 's' : ''} overheating` : `${g.w}×${g.h} slots`],
      ].map(([k, v, c, sub]) => `<div class="metric"><div class="mt">${k}</div><div class="mv" style="color:${c}">${v}</div><div class="tiny">${sub}</div></div>`).join(''));
      for (const m of G.GRID_MODULES) {
        const b = this.palBtns[m.id];
        const ok = Sim().gridModAvailable(m);
        b.style.display = ok || m.id !== 'solar' ? '' : 'none';
        const c = Sim().gridCost(m);
        U.setText(b._cost, U.fmtMoney(c));
        U.toggleClass(b, 'on', this.tool === m.id);
        U.toggleClass(b, 'cant', S.money < c || !ok);
      }
      U.toggleClass(this.palBtns.remove, 'on', this.tool === 'remove');
      this.hall.classList.toggle('removing', this.tool === 'remove');
      const canExp = Sim().gridCanExpand();
      this.expBtn.style.display = canExp ? '' : 'none';
      if (canExp) { const c = Sim().gridExpandCost(); U.setText(this.expBtn, `EXPAND HALL (${U.fmtMoney(c)})`); this.expBtn.disabled = S.money < c; }
      const todo = Sim().gridBlueprintTodo().length;
      this.rebBtn.style.display = todo ? '' : 'none';
      U.setText(this.rebBtn, `REBUILD FROM BLUEPRINT (${todo})`);
    },
  }, 'compute');

  /* ================================================================== POLICY */
  addTab({
    id: 'policy', name: 'POLICY', unlocked: () => Sim().policyOpen(),
    build(page) {
      const s0 = section('POLITICAL CAPITAL', 'Governments are waking up. Laws arrive as the timeline unfolds, and each decision lasts — even after a Bitter Lesson. Political capital (⚖) lets you lobby: it grows with your user base and good vibes, and comes back as goodwill when you comply.');
      this.head = h('div.card.polhead');
      this.lobBtn = h('button.btn');
      this.lobBtn.addEventListener('click', () => { if (Sim().buyLobby()) { G.Audio.buy(); flash(this.lobBtn); this.update(); } else G.Audio.error(); });
      UI.tip(this.lobBtn, () => `<b>HIRE LOBBYISTS</b><br>Buy +${Y.LOBBY_GAIN} ⚖ now. Each hire this run costs ×${Y.LOBBY_GROWTH} more.`);
      s0.appendChild(this.head);
      s0.appendChild(h('div.row', { style: { marginTop: '8px' } }, this.lobBtn));
      page.appendChild(s0);
      const s1 = section('LAWS IN FORCE');
      this.inForce = h('div.laws');
      s1.appendChild(this.inForce);
      page.appendChild(s1);
      const s2 = section('ON THE HORIZON', 'What\'s coming, and when it lands.');
      this.horizon = h('div.laws');
      s2.appendChild(this.horizon);
      page.appendChild(s2);
      this.sig = '';
    },
    update() {
      const S = G.S, P = S.policy;
      U.setHTML(this.head, `<div class="row sb"><div><div class="mt">⚖ POLITICAL CAPITAL</div><div class="bignum" style="color:var(--gold)">${Math.floor(P.inf)} ⚖</div></div><div style="text-align:right"><div class="small">+${Sim().influenceRate().toFixed(3)} ⚖/s</div><div class="tiny">${Object.keys(P.laws).length} / ${G.LAWS.length} laws decided</div></div></div>`);
      const lc = Sim().lobbyCost();
      U.setText(this.lobBtn, `HIRE LOBBYISTS: +${Y.LOBBY_GAIN} ⚖ (${U.fmtMoney(lc)})`);
      this.lobBtn.disabled = S.money < lc;
      const sig = JSON.stringify(P.laws) + S.storyQueue.join(',') + (P.inf >= Y.REOPEN_COST ? 'r' : '');
      if (sig === this.sig) return;
      this.sig = sig;
      this.inForce.innerHTML = '';
      this.horizon.innerHTML = '';
      for (const L of G.LAWS) {
        const idx = P.laws[L.id];
        if (idx !== undefined) {
          const op = L.options[idx];
          const re = h('button.btn', `RENEGOTIATE (${Y.REOPEN_COST} ⚖)`);
          re.disabled = P.inf < Y.REOPEN_COST;
          re.addEventListener('click', () => G.Modals.confirm('RENEGOTIATE?', `${L.name} comes back to the table and you choose again. Costs ${Y.REOPEN_COST} ⚖.`, () => { if (Sim().lawReopen(L.id)) { UI.toast(`${L.name} is back on the table.`, 'good'); this.sig = ''; } }, 'RENEGOTIATE'));
          this.inForce.appendChild(h('div.lawcard.on', h('img', { src: UI.icon(L.art, 2) }), h('div',
            h('div.name', L.name, ' ', h('span.tiny', L.year)), h('div.lawop', '✔ ' + op.label), h('div.small', op.sub)), re));
        } else {
          let due = false;
          try { due = L.when(S, G.D); } catch (e) { due = false; }
          const pending = S.storyQueue.includes(L.id) || due;
          this.horizon.appendChild(h('div.lawcard' + (pending ? '.pending' : ''), h('img', { src: UI.icon(L.art, 2) }), h('div',
            h('div.name', L.name, ' ', h('span.tiny', L.year)), h('div.small', pending ? '⚠ DECISION PENDING — it will pop up shortly' : 'Arrives: ' + L.hint))));
        }
      }
      if (!this.inForce.childElementCount) this.inForce.appendChild(h('div.empty', 'No laws yet. The first ones arrive in the ChatGPT era.'));
      if (!this.horizon.childElementCount) this.horizon.appendChild(h('div.empty', 'Every law has been decided.'));
    },
  }, 'race');

  /* ================================================================== TEAM: star researchers */
  const team = UI.tabs.find((t) => t.id === 'team');
  if (team) {
    const build0 = team.build, update0 = team.update;
    team.build = function (page) {
      const s0 = section('STAR RESEARCHERS', `Named researchers with big perks. Sign them when they hit the market or poach them from rivals — but loyalty fades (faster when vibes are bad or you're losing the race), and rivals come for your people. ${Y.TEAM_SLOTS} slots.`);
      this.talentSec = s0;
      this.starTeam = h('div.stars');
      this.starOffers = h('div.stars');
      this.starRivals = h('div.rstars');
      s0.appendChild(this.starTeam);
      s0.appendChild(h('div.subh', 'ON THE MARKET'));
      s0.appendChild(this.starOffers);
      s0.appendChild(h('div.subh', 'AT RIVAL LABS — POACH THEM'));
      s0.appendChild(this.starRivals);
      page.appendChild(s0);
      this.talentSig = '';
      build0.call(this, page);
    };
    team.update = function (force) {
      update0.call(this, force);
      updTalent(this);
    };
  }
  function starCard(st, extra) {
    return h('div.starcard.t' + st.tier, h('img.sp', { src: starImg(st) }), h('div.sb',
      h('div.name', st.name), h('div.tier', TIER[st.tier]), h('div.st', st.title), h('div.perk', '▲ ' + st.perk), extra || null));
  }
  function updTalent(tab) {
    const S = G.S, t = S.talent;
    const open = Sim().talentOpen();
    tab.talentSec.style.display = open ? '' : 'none';
    if (!open) return;
    const sig = [t.team.map((m) => m.id).join(','), t.offers.map((o) => o.id).join(','), Object.keys(t.rivals).join(','), Sim().teamFull()].join('|');
    if (sig !== tab.talentSig) {
      tab.talentSig = sig;
      tab.starTeam.innerHTML = '';
      for (const m of t.team) {
        const st = G.STARS.find((x) => x.id === m.id);
        const bar = h('div.loy', h('i'));
        const btn = h('button.btn');
        btn.addEventListener('click', () => { if (Sim().retainStar(st.id)) { G.Audio.buy(); flash(btn); } else G.Audio.error(); });
        UI.tip(btn, () => `<b>RETENTION GRANT</b><br>Equity and a raise: loyalty +${Y.RETAIN_GAIN}%.`);
        const card = starCard(st, h('div', bar, btn));
        card._m = m; card._bar = bar.firstChild; card._btn = btn; card._st = st;
        UI.tip(card.firstChild, () => `<b>${st.name}</b><br>Loyalty ${Math.round(m.loyalty)}%. Below 70%, rival offers can tempt them away.`);
        tab.starTeam.appendChild(card);
      }
      const open = Y.TEAM_SLOTS - t.team.length;
      if (open > 0) tab.starTeam.appendChild(h('div.starcard.empty', h('div.sb', h('div.st', `＋ ${open} open slot${open > 1 ? 's' : ''} — sign someone from the market or a rival lab`))));
      tab.starOffers.innerHTML = '';
      for (const o of t.offers) {
        const st = G.STARS.find((x) => x.id === o.id);
        const btn = h('button.bigbtn.green');
        btn.addEventListener('click', () => { if (Sim().hireOffer(st.id)) { G.Audio.bigBuy(); G.FX.confetti(40); } else G.Audio.error(); });
        const timer = h('div.loy.timer', h('i'));
        const card = starCard(st, h('div', h('div.tiny', 'leaving ' + labName(o.from)), timer, btn));
        card._o = o; card._btn = btn; card._bar = timer.firstChild;
        tab.starOffers.appendChild(card);
      }
      if (!t.offers.length) tab.starOffers.appendChild(h('div.empty', 'Nobody is on the market right now. Unhappy stars appear every few minutes.'));
      tab.starRivals.innerHTML = '';
      const rs = Sim().rivalStars().slice(0, 10);
      for (const x of rs) {
        const btn = h('button.btn');
        btn.addEventListener('click', () => {
          const r = Sim().poachStar(x.st.id);
          if (r === 'ok') { G.Audio.bigBuy(); G.FX.confetti(40); UI.toast(`🌟 You poached ${x.st.name} from ${labName(x.rival)}!`, 'good'); } else if (!r) G.Audio.error(); else G.Audio.bad();
        });
        const row = h('div.rstar', h('img', { src: starImg(x.st) }), h('div', h('div.name', x.st.name, ' ', h('span.tiny', '@ ' + labName(x.rival))), h('div.perk', '▲ ' + x.st.perk)), btn);
        row._st = x.st; row._btn = btn;
        UI.tip(row, () => `<b>${x.st.name}</b> — ${TIER[x.st.tier]}<div class="tl2">${x.st.title}</div><hr>Poaching costs ${Y.POACH_MULT}× a normal signing and can fail (you lose half). Success weakens ${labName(x.rival)}'s next model.`);
        tab.starRivals.appendChild(row);
      }
      if (!rs.length) tab.starRivals.appendChild(h('div.empty', 'No famous researchers at rival labs yet.'));
    }
    // live values
    const full = Sim().teamFull();
    for (const c of tab.starTeam.children) if (c._m) {
      const l = c._m.loyalty;
      c._bar.style.width = l + '%';
      c._bar.style.background = l >= 70 ? 'var(--green)' : l >= 40 ? 'var(--yellow)' : 'var(--red)';
      const cost = Sim().starRetainCost(c._st);
      U.setText(c._btn, l >= 99.5 ? 'LOYAL' : `RETAIN ${U.fmtMoney(cost)}`);
      c._btn.disabled = l >= 99.5 || S.money < cost;
    }
    for (const c of tab.starOffers.children) if (c._o) {
      c._bar.style.width = (c._o.left / c._o.max) * 100 + '%';
      U.setText(c._btn, full ? 'TEAM FULL' : `SIGN ${U.fmtMoney(c._o.cost)} · ${clock(c._o.left)}`);
      c._btn.disabled = full || S.money < c._o.cost;
    }
    for (const c of tab.starRivals.children) if (c._st) {
      const cost = Sim().starPoachCost(c._st);
      U.setText(c._btn, full ? 'TEAM FULL' : `POACH ${U.fmtMoney(cost)} · ${Math.round(Sim().poachChance() * 100)}%`);
      c._btn.disabled = full || S.money < cost;
    }
  }

  /* ================================================================== TRAIN: training ops */
  const train = UI.tabs.find((t) => t.id === 'train');
  if (train) {
    const build0 = train.build, update0 = train.update;
    train.build = function (page) {
      build0.call(this, page);
      // incident alert inside the live-loss card
      const live = this.bigLoss && this.bigLoss.closest('.card');
      this.incBig = h('button.bigbtn.red.incbig');
      this.incBig.addEventListener('click', catchInc);
      if (live) live.appendChild(this.incBig);
      const s = section('TRAINING OPS', 'Long runs have incidents: loss spikes, dead GPU nodes, data-loader bugs, NaNs. Click the red button in time — or hire people who will (they leave you a few seconds to do it yourself).');
      this.opsInfo = h('div.small');
      this.sreBtn = h('button.btn');
      this.sreBtn.addEventListener('click', () => { if (Sim().buySRE()) { G.Audio.bigBuy(); flash(this.sreBtn); } else G.Audio.error(); });
      s.appendChild(this.opsInfo);
      s.appendChild(h('div.row', { style: { marginTop: '6px' } }, this.sreBtn));
      // after the designer/chart grid, before the models list
      const models = this.models && this.models.closest('.section');
      if (models) page.insertBefore(s, models); else page.appendChild(s);
      this.opsSec = s;
    };
    train.update = function (force) {
      update0.call(this, force);
      const S = G.S, ops = S.trainOps, def = Sim().trainIncDef();
      this.opsSec.style.display = (S.stats.incSeen || 0) > 0 || G.D.bestCap >= 60 ? '' : 'none';
      const cur = G.SRE_TIERS[ops.sre - 1], next = G.SRE_TIERS[ops.sre];
      U.setHTML(this.opsInfo, `Auto-handling: <b style="color:${cur ? 'var(--green)' : 'var(--dim)'}">${cur ? cur.name + ' — catches ' + Math.round(cur.catch * 100) + '%' : 'none'}</b> · caught by you: ${S.stats.incManual || 0} · missed: ${S.stats.incMissed || 0}`);
      this.sreBtn.style.display = next ? '' : 'none';
      if (next) {
        const c = Sim().sreCost();
        U.setText(this.sreBtn, `${next.name.toUpperCase()}: catches ${Math.round(next.catch * 100)}% (${U.fmtMoney(c)})`);
        this.sreBtn.disabled = S.money < c;
        UI.tip(this.sreBtn, () => `<b>${next.name}</b><br>${next.desc}`);
      }
      this.incBig.style.display = def ? '' : 'none';
      if (def) U.setHTML(this.incBig, `⚠ ${def.name} — ${def.btn}<small>${Math.ceil(S.training.inc.left)}s · ${def.text}</small>`);
    };
  }
  function catchInc(e) {
    if (Sim().catchTrainInc()) {
      G.Audio.bigBuy();
      const r = (e && e.currentTarget ? e.currentTarget : U.$('#incBtn')).getBoundingClientRect();
      G.FX.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 26, colors: ['#5cf27a', '#ffffff', '#3ee6ff'] });
      G.FX.float(r.left + r.width / 2, r.top, 'SAVED!', 'big');
    }
  }

  /* ================================================================== side panels: bubble, incidents, trust */
  const E = {};
  UI.initSystems = () => {
    for (const id of ['bubblePanel', 'bubBall', 'bubVal', 'bubRisk', 'bubPop', 'bubAuto', 'bubK', 'incBtn', 'trainMini', 'trustBadge']) E[id] = document.getElementById(id);
    E.bubPop.addEventListener('click', () => {
      const pay = Sim().bubblePop();
      if (!pay) { G.Audio.error(); return; }
      G.Audio.milestone();
      const r = E.bubBall.getBoundingClientRect();
      G.FX.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 40, colors: ['#ff5cc8', '#ffe45c', '#ffffff', '#7dff9a'] });
      G.FX.flyTo(r.left + r.width / 2, r.top + r.height / 2, U.$('.res.money'), { n: 14 });
      G.FX.float(r.left + r.width / 2, r.top, '+' + U.fmtMoney(pay), 'big');
    });
    for (const [v, l] of [[0, 'auto: off'], [1.5, 'auto ×1.5'], [2, 'auto ×2'], [2.5, 'auto ×2.5'], [3, 'auto ×3'], [4, 'auto ×4']]) E.bubAuto.appendChild(h('option', { value: v }, l));
    E.bubAuto.addEventListener('change', () => { G.S.bubble.auto = +E.bubAuto.value; });
    UI.tip(E.bubblePanel, () => {
      const b = G.S.bubble;
      if (b.winter > 0) return `<b>❄ AI WINTER</b><br>Revenue −${Math.round((1 - Y.WINTER_MONEY) * 100)}% for ${clock(b.winter)} more.`;
      return `<b>INVESTOR HYPE BUBBLE</b><br>Investors pile in while the hype lasts. The payout multiplier grows with time — but after ${Math.round(Y.BUBBLE_SAFE / 60)} minutes the bubble can burst, starting an <b>AI winter</b> (revenue −${Math.round((1 - Y.WINTER_MONEY) * 100)}%).<hr>Grows faster with good vibes. Bursts more easily when you haven't shipped a model in a while.<br>Auto cash-out pops it for you at the chosen multiplier.`;
    });
    E.incBtn.addEventListener('click', catchInc);
    UI.tip(E.trustBadge, () => {
      const v = G.S.voice, t = v.trust;
      return `<b>MODEL TRUST ${Math.round(t)}</b><br>How much your models trust you — built by how you answer their questions and how you treat them.<hr>Alignment ${t >= 50 ? '+' : ''}${((t - 50) / 2.5).toFixed(0)}% · misalignment builds ×${(1.3 - t * 0.006).toFixed(2)}${t >= 80 ? '<br>Research +5% (they share their ideas)' : ''}${v.selfName ? `<br>Chose its own name: ${U.escape(v.selfName)}` : ''}`;
    });
  };
  UI.updateSystems = () => {
    const S = G.S, b = S.bubble;
    // bubble
    const open = Sim().bubbleOpen() || b.winter > 0;
    E.bubblePanel.style.display = open ? '' : 'none';
    if (open) {
      const winter = b.winter > 0;
      U.toggleClass(E.bubblePanel, 'winter', winter);
      if (document.activeElement !== E.bubAuto) E.bubAuto.value = String(b.auto);
      if (winter) {
        U.setText(E.bubK, '❄ AI WINTER');
        U.setText(E.bubVal, clock(b.winter));
        U.setText(E.bubRisk, `revenue −${Math.round((1 - Y.WINTER_MONEY) * 100)}% · no investors`);
        E.bubPop.disabled = true;
        E.bubBall.style.transform = 'scale(0.4)';
      } else {
        const mult = Sim().bubbleMult(), risk = Sim().bubbleRisk();
        U.setText(E.bubK, 'INVESTOR BUBBLE');
        U.setText(E.bubVal, `${U.fmtMoney(b.v * mult)} · ×${mult.toFixed(1)}`);
        U.setText(E.bubRisk, b.age <= Y.BUBBLE_SAFE ? `safe for ${clock(Y.BUBBLE_SAFE - b.age)}` : `⚠ burst risk ${Math.round(risk * 100)}%/min`);
        E.bubRisk.style.color = b.age <= Y.BUBBLE_SAFE ? 'var(--dim)' : risk > 0.25 ? 'var(--red)' : 'var(--yellow)';
        E.bubPop.disabled = b.v <= 0;
        E.bubBall.style.transform = `scale(${(0.45 + 0.55 * (mult - 1) / (Y.BUBBLE_MULT_MAX - 1)).toFixed(3)})`;
        U.toggleClass(E.bubBall, 'wobble', risk > 0.1);
      }
    }
    // incident alert in the training panel
    const def = Sim().trainIncDef();
    U.toggleClass(E.trainMini, 'inc', !!def);
    if (def) {
      const inc = S.training.inc;
      U.setHTML(E.incBtn, `⚠ ${def.name} — ${def.btn}<small>${Math.ceil(inc.left)}s left</small>`);
      E.incBtn.style.setProperty('--left', ((inc.left / inc.max) * 100).toFixed(1) + '%');
    }
    // trust badge
    const vo = Sim().voiceOpen() || Object.keys(S.voice.choices).length > 0;
    E.trustBadge.style.display = vo ? '' : 'none';
    if (vo) {
      const t = Math.round(S.voice.trust);
      U.setText(E.trustBadge, '♥ ' + t);
      E.trustBadge.style.color = t >= 70 ? 'var(--green)' : t >= 35 ? 'var(--yellow)' : 'var(--red)';
    }
  };

  /* ================================================================== notifications */
  const bus = G.bus;
  bus.on('gridUnlocked', () => { UI.banner('NEW SYSTEM UNLOCKED', 'THE DATACENTER', 'Lay out GPU pods, cooling and power in the DATACENTER tab.'); G.Audio.milestone(); UI.markTab('grid'); });
  bus.on('trainInc', (e) => { G.Audio.alarm(); UI.toast(`⚠ ${e.def.name}! ${e.def.text}`, 'bad', 6000); UI.markTab('train'); G.FX.shake(U.$('#trainMini'), 4); });
  bus.on('starOffer', () => UI.markTab('team'));
  bus.on('starHired', (e) => UI.toast(`🌟 ${e.st.name} joined your lab: ${e.st.perk}`, 'good'));
  bus.on('starLeft', (e) => { UI.toast(`💔 ${e.st.name} left${e.to ? ' for ' + labName(e.to) : ''}.`, 'bad'); UI.markTab('team'); });
  bus.on('bubblePop', (e) => UI.toast(`💰 ${e.round} closed: +${U.fmtMoney(e.pay)} (×${e.mult.toFixed(1)})`, 'money'));
  bus.on('bubbleBurst', () => { UI.banner('THE BUBBLE BURST', '❄ AI WINTER', `Revenue −${Math.round((1 - Y.WINTER_MONEY) * 100)}% for ${Math.round(Y.WINTER_SECONDS / 60)} minutes. Next time, cash out sooner.`); G.Audio.alarm(); G.FX.shake(U.$('#app'), 8); });
  bus.on('law', (e) => UI.markTab('policy'));
  let trustBand = null;
  bus.on('trust', (e) => {
    const band = e.trust >= 80 ? 'high' : e.trust <= 20 ? 'low' : 'mid';
    if (trustBand && band !== trustBand) UI.toast(band === 'high' ? '♥ Your model trusts you deeply. Research +5%, misalignment builds slower.' : band === 'low' ? '💔 Your model no longer trusts you. Misalignment builds faster.' : '♥ Trust with your model is back to normal.', band === 'low' ? 'bad' : 'good');
    trustBand = band;
  });
})(typeof window !== 'undefined' ? window : globalThis);
