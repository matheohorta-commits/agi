/* STRATEGY tab: Hype & influencers, synergies, ◆ insights & building levels, the Board of Advisors,
 * the Shoggoth and its auras, and the GPU Exchange. Inserted after TEAM in the tab bar. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const h = U.h;
  const UI = G.UI;
  const Sim = () => G.Sim;

  const KIND_LIST = { hw: () => G.HARDWARE, power: () => G.POWER, res: () => G.RESEARCHERS, safety: () => G.SAFETY, src: () => G.DATASRC };
  const KIND_NAME = { hw: 'HARDWARE', power: 'POWER', res: 'RESEARCHERS', safety: 'SAFETY TEAM', src: 'DATA' };
  const itemOf = (k, id) => KIND_LIST[k]().find((x) => x.id === id);
  const icon = (it, scale) => UI.icon(it.sprite, scale || 2, it.tint);
  function section(title, help) {
    const s = h('div.section', h('h4', title, h('span.grow')));
    if (help) s.appendChild(h('p.help', help));
    return s;
  }
  function flash(el, colors) {
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    const r = el.getBoundingClientRect();
    G.FX.burst(r.left + 24, r.top + 18, { n: 16, colors: colors || ['#ffe45c', '#ffffff', '#5cf27a'] });
  }
  const portrait = (id, size) => (G.CARD && G.CARD[id] ? G.Sprites.cardUrl(G.CARD[id], size || 48) : UI.icon('person', 3));
  const clock = (sec) => { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };

  const SUBS = [
    { id: 'hype', name: 'HYPE & SYNERGIES', open: () => true },
    { id: 'insight', name: '◆ INSIGHTS', open: () => G.S.insight.unlocked, lock: () => `Reach capability ${G.STRAT.INSIGHT_UNLOCK_CAP}` },
    { id: 'board', name: 'BOARD', open: () => Sim().featureOpen('board'), lock: () => Sim().UNLOCKS.board.label + ' (◆ INSIGHTS)' },
    { id: 'shog', name: 'SHOGGOTH', open: () => Sim().featureOpen('shog'), lock: () => Sim().UNLOCKS.shog.label + ' (◆ INSIGHTS)' },
    { id: 'market', name: 'GPU EXCHANGE', open: () => Sim().featureOpen('market'), lock: () => Sim().UNLOCKS.market.label + ' (◆ INSIGHTS)' },
  ];

  const tab = {
    id: 'strategy', name: 'STRATEGY',
    unlocked: () => G.D.bestCap >= 40 || G.S.insight.unlocked || Object.keys(G.S.syn).length > 0,
    sub: 'hype',
    build(page) {
      this.page = page;
      this.nav = h('div.subnav');
      this.navBtns = {};
      for (const sb of SUBS) {
        const b = h('button', sb.name);
        b.addEventListener('click', () => {
          if (!sb.open()) { G.Audio.error(); return; }
          G.Audio.tab();
          this.sub = sb.id;
          this.renderSub();
        });
        UI.tip(b, () => (sb.open() ? `<b>${sb.name}</b>` : `<b>🔒 ${sb.name}</b><br>${sb.lock()}`));
        this.navBtns[sb.id] = b;
        this.nav.appendChild(b);
      }
      page.appendChild(this.nav);
      this.body = h('div');
      page.appendChild(this.body);
      if (!SUBS.find((x) => x.id === this.sub).open()) this.sub = 'hype';
      this.renderSub();
    },
    renderSub() {
      this.body.innerHTML = '';
      this.parts = {};
      ({ hype: buildHype, insight: buildInsight, board: buildBoard, shog: buildShog, market: buildMarket })[this.sub].call(this, this.body);
      this.update(true);
    },
    update(force) {
      for (const sb of SUBS) {
        const b = this.navBtns[sb.id];
        U.toggleClass(b, 'on', this.sub === sb.id);
        U.toggleClass(b, 'locked', !sb.open());
      }
      if (this.parts && this.parts.upd) this.parts.upd(force);
    },
  };

  /* ================================================================== HYPE & SYNERGIES */
  function buildHype(body) {
    const S = G.S;
    const hype = h('div.card.hypecard');
    body.appendChild(hype);
    const s1 = section('INFLUENCERS', 'Achievements build Hype (4% each). Influencers turn Hype into revenue: each multiplies revenue by (1 + Hype × its power), and they stack. Cookie Clicker players: these are your kittens.');
    const infl = h('div.items');
    const rows = [];
    for (const f of G.INFLUENCERS) {
      const cost = h('div.cost'), st = h('div.prod');
      const el = h('div.item', h('img.ic', { src: UI.icon('bird', 3) }), h('div.mid', h('div.nl', h('div.name', f.name)), st, h('div.cl', cost)), h('div.own'));
      el.addEventListener('click', () => { if (G.Sim.buyInfl(f.id)) flash(el); else G.Audio.error(); });
      UI.tip(el, () => `<b>${f.name}</b><div class="tl2">${f.desc}</div><hr>Revenue ×(1 + Hype × ${f.k}) = <b>×${(1 + G.D.hype * f.k).toFixed(2)}</b> right now<br>Needs ${f.need} achievements · cost ${U.fmtMoney(f.cost)}`);
      rows.push({ f, el, cost, st });
      infl.appendChild(el);
    }
    s1.appendChild(infl);
    body.appendChild(s1);
    const s2 = section('SYNERGIES', 'Buildings that make each other better. Each pair needs a minimum count of both; after that, every extra unit of one boosts the other. Mixing what you buy pays off.');
    const syn = h('div.synlist');
    s2.appendChild(syn);
    body.appendChild(s2);
    let sig = '';
    this.parts.upd = () => {
      const D = G.D;
      const nAch = Object.keys(S.achievements).length;
      U.setHTML(hype, `<div class="row sb"><div><div class="tiny">HYPE (from ${nAch} achievements × 4%)</div><div class="bignum" style="color:var(--accent2)">${U.fmtPct(D.hype)}</div></div><div style="text-align:right"><div class="tiny">INFLUENCER MULTIPLIER</div><div class="bignum" style="color:var(--money)">×${(D.inflMult || 1).toFixed(2)}</div><div class="tiny">on revenue</div></div></div>`);
      for (const r of rows) {
        const got = !!S.infl[r.f.id];
        const av = G.Sim.inflAvailable(r.f);
        U.setText(r.st, got ? `HIRED · revenue ×${(1 + D.hype * r.f.k).toFixed(2)}` : `×(1 + Hype × ${r.f.k}) · needs ${r.f.need} achievements (${nAch})`);
        U.setText(r.cost, got ? '' : U.fmtMoney(r.f.cost));
        U.toggleClass(r.cost, 'no', !got && S.money < r.f.cost);
        U.toggleClass(r.el, 'locked', !got && nAch < r.f.need);
        U.toggleClass(r.el, 'can', av && S.money >= r.f.cost);
        U.toggleClass(r.el, 'done', got);
      }
      // synergies: available first, then by cost; owned ones last
      const vis = G.SYNERGIES.filter((sy) => G.Sim.synVisible(sy) || S.syn[sy.id]);
      const nsig = vis.map((sy) => sy.id + (S.syn[sy.id] ? 1 : G.Sim.synAvailable(sy) ? 2 : 0)).join(',');
      if (nsig !== sig) {
        sig = nsig;
        syn.innerHTML = '';
        if (!vis.length) syn.appendChild(h('div.empty', 'No synergies yet — unlock more buildings.'));
        const order = vis.slice().sort((a, b) => (S.syn[a.id] ? 1 : 0) - (S.syn[b.id] ? 1 : 0) || G.Sim.synCost(a) - G.Sim.synCost(b));
        for (const sy of order) syn.appendChild(synRow(sy));
      }
      for (const el of syn.children) if (el._upd) el._upd();
    };
  }
  function synRow(sy) {
    const S = G.S;
    const A = itemOf(...sy.a), B = itemOf(...sy.b);
    const info = h('div.syninfo'), cost = h('div.cost');
    const el = h('div.synrow', h('div.synic', h('img', { src: icon(A, 2) }), h('span', '⇄'), h('img', { src: icon(B, 2) })), h('div', h('div.name', sy.name), info), cost);
    el.addEventListener('click', () => { if (G.Sim.buySyn(sy.id)) flash(el, ['#3ee6ff', '#ffffff', '#b04dff']); else G.Audio.error(); });
    UI.tip(el, () => `<b>${sy.name}</b><div class="tl2">${sy.desc}</div><hr>${A.name}: +${+(sy.ka * 100).toFixed(2)}% output per ${B.name}<br>${B.name}: +${+(sy.kb * 100).toFixed(2)}% output per ${A.name}<br>Needs ${sy.need} of each.`);
    el._upd = () => {
      const na = G.Sim.owned(...sy.a), nb = G.Sim.owned(...sy.b);
      const got = !!S.syn[sy.id];
      const ok = na >= sy.need && nb >= sy.need;
      U.setHTML(info, `${A.name} <b style="color:var(--green)">+${U.fmtPct(sy.ka * nb)}</b> · ${B.name} <b style="color:var(--green)">+${U.fmtPct(sy.kb * na)}</b>${got ? '' : ` <span class="tiny">· own ${sy.need} of each (${na} / ${nb})</span>`}`);
      const c = G.Sim.synCost(sy);
      U.setText(cost, got ? '✓ ACTIVE' : U.fmtMoney(c));
      U.toggleClass(cost, 'no', !got && S.money < c);
      U.toggleClass(el, 'done', got);
      U.toggleClass(el, 'locked', !got && !ok);
      U.toggleClass(el, 'can', !got && ok && S.money >= c);
    };
    return el;
  }

  /* ================================================================== INSIGHTS */
  function buildInsight(body) {
    const S = G.S;
    const head = h('div.card.inshead');
    body.appendChild(head);
    const s1 = section('BUILDING LEVELS', 'Spend ◆ Insights to level up a building type: +5% of its output per level. Levels are permanent — they survive Bitter Lessons. Level 1 of three special buildings opens a new system (marked below).');
    const grid = h('div.lvgrid');
    s1.appendChild(grid);
    body.appendChild(s1);
    const special = {};
    for (const [f, u] of Object.entries(G.Sim.UNLOCKS)) special[u.kind + ':' + u.id] = { board: 'BOARD', shog: 'SHOGGOTH', market: 'GPU EXCHANGE' }[f];
    let sig = '';
    this.parts.upd = () => {
      const ins = S.insight;
      U.setHTML(head, `<div class="row sb"><div><div class="tiny">INSIGHTS</div><div class="bignum" style="color:var(--cyan)">◆ ${ins.n}</div><div class="tiny">${ins.total} earned all time</div></div><div style="flex:1;max-width:360px"><div class="tiny">NEXT INSIGHT IN ${clock(G.STRAT.INSIGHT_SECONDS - ins.t)}</div><div class="pbar" style="margin-top:4px"><i style="width:${(ins.t / G.STRAT.INSIGHT_SECONDS) * 100}%;background:var(--cyan)"></i><span></span></div><div class="tiny" style="margin-top:4px">One every 20 minutes of play (offline time counts). 10% chance of a double.</div></div></div>`);
      const list = [];
      for (const k of Object.keys(KIND_LIST)) for (const it of KIND_LIST[k]()) if (G.Sim.owned(k, it.id) > 0 || G.Sim.buildingLevel(k, it.id) > 0) list.push([k, it]);
      const nsig = list.map(([k, it]) => k + it.id).join(',');
      if (nsig !== sig) {
        sig = nsig;
        grid.innerHTML = '';
        for (const [k, it] of list) {
          const lv = h('div.lvn'), btn = h('button.btn');
          const tag = special[k + ':' + it.id];
          const el = h('div.lvcard' + (tag ? '.special' : ''), h('img', { src: icon(it, 2) }), h('div', h('div.name', it.name), h('div.tiny', KIND_NAME[k]), lv), btn, tag ? h('span.unlocktag', 'OPENS ' + tag) : null);
          btn.addEventListener('click', () => { if (G.Sim.levelUp(k, it.id)) { flash(el, ['#3ee6ff', '#ffffff']); G.Audio.bigBuy(); } else G.Audio.error(); });
          UI.tip(el, () => `<b>${it.name}</b> — level ${G.Sim.buildingLevel(k, it.id)}<br>Output ×${(1 + G.STRAT.LEVEL_BONUS * G.Sim.buildingLevel(k, it.id)).toFixed(2)} from levels${tag ? `<br><span style="color:var(--yellow)">Level 1 opens the ${tag}</span>` : ''}<hr>Next level: ◆ ${G.Sim.levelCost(k, it.id)}`);
          el._upd = () => {
            const l = G.Sim.buildingLevel(k, it.id), c = G.Sim.levelCost(k, it.id);
            U.setText(lv, 'LV ' + l + ' · ×' + (1 + G.STRAT.LEVEL_BONUS * l).toFixed(2));
            U.setText(btn, 'LEVEL UP ◆ ' + c);
            btn.disabled = S.insight.n < c;
          };
          grid.appendChild(el);
        }
      }
      for (const el of grid.children) if (el._upd) el._upd();
    };
  }

  /* ================================================================== BOARD */
  function buildBoard(body) {
    const S = G.S;
    const top = h('div.card', { style: { marginBottom: '10px' } });
    body.appendChild(top);
    const seats = h('div.seats');
    const seatEls = {};
    for (const seat of G.SEATS) {
      const img = h('img.seatimg'), nm = h('div.name'), fx = h('div.seatfx');
      const clear = h('button.btn', 'EMPTY SEAT');
      clear.addEventListener('click', () => { G.Sim.unseat(seat.id); G.Audio.tab(); });
      const el = h('div.seat', h('div.seathd', seat.name + ' · ' + Math.round(seat.k * 100) + '%'), img, nm, fx, clear);
      seatEls[seat.id] = { el, img, nm, fx, clear };
      seats.appendChild(el);
    }
    body.appendChild(seats);
    const s2 = section('ADVISORS', 'Seat up to three advisors. The CHAIR gets 100% of an advisor\'s effects (good and bad), the BOARD SEAT 50%, the ADVISOR seat 25%. Seating someone costs a swap; swaps regenerate every 30 minutes (max 3).');
    const roster = h('div.roster');
    for (const a of G.ADVISORS) {
      const btns = h('div.row', { style: { gap: '3px', flexWrap: 'wrap' } });
      for (const seat of G.SEATS) {
        const b = h('button.btn', seat.name.split(' ')[0]);
        b.addEventListener('click', () => { if (G.Sim.seatAdvisor(a.id, seat.id)) { G.Audio.bigBuy(); flash(seatEls[seat.id].el); } else G.Audio.error(); });
        b._seat = seat.id;
        btns.appendChild(b);
      }
      const el = h('div.advcard', h('img', { src: portrait(a.portrait, 48) }), h('div', h('div.name', a.name), h('div.tiny', '"' + a.title + '"'), h('div.up', '▲ ' + a.up), h('div.down', '▼ ' + a.down), btns));
      el._a = a; el._btns = btns;
      roster.appendChild(el);
    }
    s2.appendChild(roster);
    body.appendChild(s2);
    this.parts.upd = () => {
      const b = S.board;
      U.setHTML(top, `<div class="row sb"><span class="small">Swaps available</span><span class="num" style="color:var(--yellow)">${'◇'.repeat(b.swaps)}${'·'.repeat(3 - b.swaps)} ${b.swaps}/3${b.swaps < 3 ? ' · next in ' + clock(G.STRAT.SWAP_SECONDS - b.t) : ''}</span></div>`);
      for (const seat of G.SEATS) {
        const se = seatEls[seat.id];
        const a = b[seat.id] && G.ADVISORS.find((x) => x.id === b[seat.id]);
        se.img.src = a ? portrait(a.portrait, 64) : UI.icon('lock', 4);
        U.setText(se.nm, a ? a.name : '— empty —');
        U.setHTML(se.fx, a ? `<span class="up">▲ ${a.up}</span><br><span class="down">▼ ${a.down}</span><br><span class="tiny">at ${Math.round(seat.k * 100)}% strength</span>` : '<span class="tiny">Pick an advisor below.</span>');
        se.clear.style.visibility = a ? 'visible' : 'hidden';
        U.toggleClass(se.el, 'filled', !!a);
      }
      for (const el of roster.children) {
        const where = G.Sim.seatOf(el._a.id);
        U.toggleClass(el, 'seated', !!where);
        for (const btn of el._btns.children) {
          U.toggleClass(btn, 'on', where && where.id === btn._seat);
          btn.disabled = b.swaps < 1 && !(where && where.id === btn._seat);
        }
      }
    };
  }

  /* ================================================================== SHOGGOTH */
  function buildShog(body) {
    const S = G.S;
    const wrap = h('div.shogwrap');
    const pic = h('img.shogimg', { src: UI.icon('shoggoth', 8) });
    const info = h('div');
    const feed = h('button.bigbtn', 'FEED THE SHOGGOTH');
    feed.addEventListener('click', () => {
      if (G.Sim.feedShog()) { G.Audio.milestone(); flash(pic, ['#5cf27a', '#b04dff', '#ffffff']); G.FX.shake(pic, 5); }
      else G.Audio.error();
    });
    wrap.appendChild(pic);
    wrap.appendChild(h('div', info, h('div', { style: { marginTop: '8px' } }, feed)));
    body.appendChild(wrap);
    const s2 = section('AURAS', 'Each level reveals an aura. Choose which one the Shoggoth radiates (a second slot opens at the final level). Swapping out an active aura costs one unit of your best hardware.');
    const slots = h('div.auraslots');
    s2.appendChild(slots);
    const list = h('div.auras');
    s2.appendChild(list);
    body.appendChild(s2);
    let sig = '';
    this.parts.upd = () => {
      const sh = S.shog;
      const c = G.Sim.shogFeedCost();
      const max = sh.level >= G.SHOGGOTH.MAX_LEVEL;
      U.setHTML(info, `<div class="tiny">THE SHOGGOTH (with a smiley mask)</div><div class="bignum" style="color:var(--green)">LEVEL ${sh.level} / ${G.SHOGGOTH.MAX_LEVEL}</div>` +
        (max ? '<div class="small">Fully grown. It is very polite now.</div>' : `<div class="small">Next feeding: <b style="color:var(--money)">${U.fmtMoney(c.money)}</b>${c.sacrifice ? ` + sacrifice <b style="color:var(--red)">${c.sacrifice.n} ${c.sacrifice.name}</b>` : ''}</div><div class="tiny">Reveals aura: ${G.AURAS[sh.level].name}</div>`));
      feed.disabled = max || S.money < c.money || (c.sacrifice && (S.hw[c.sacrifice.id] || 0) < c.sacrifice.n);
      const nsig = sh.level + ':' + sh.auras.join(',') + ':' + G.Sim.auraSlots();
      if (nsig === sig) return;
      sig = nsig;
      slots.innerHTML = '';
      for (let i = 0; i < G.Sim.auraSlots(); i++) {
        const a = G.AURAS.find((x) => x.id === sh.auras[i]);
        slots.appendChild(h('div.auraslot' + (a ? '.on' : ''), h('div.tiny', 'AURA SLOT ' + (i + 1)), h('div.name', a ? a.name : '— none —'), h('div.small', a ? a.desc : 'Pick an unlocked aura below.')));
      }
      list.innerHTML = '';
      G.AURAS.forEach((a, idx) => {
        const unlocked = G.Sim.auraUnlocked(a.id);
        const active = sh.auras.includes(a.id);
        const btns = h('div.row', { style: { gap: '3px' } });
        if (unlocked && !active) for (let i = 0; i < G.Sim.auraSlots(); i++) {
          const b = h('button.btn', 'USE IN SLOT ' + (i + 1));
          b.addEventListener('click', () => { if (G.Sim.setAura(i, a.id)) G.Audio.bigBuy(); else G.Audio.error(); });
          btns.appendChild(b);
        }
        list.appendChild(h('div.aura' + (active ? '.on' : unlocked ? '' : '.locked'), h('div.name', (active ? '✦ ' : '') + a.name), h('div.small', unlocked ? a.desc : 'Revealed at level ' + (idx + 1)), btns));
      });
    };
  }

  /* ================================================================== GPU EXCHANGE */
  function buildMarket(body) {
    const S = G.S;
    const head = h('div.card', { style: { marginBottom: '10px' } });
    const broker = h('button.btn', 'HIRE BROKER');
    broker.addEventListener('click', () => { if (G.Sim.hireBroker()) G.Audio.buy(); else G.Audio.error(); });
    UI.tip(broker, () => `<b>BROKERS</b><br>Each one cuts the transaction overhead by 7%.<br>Now: ${U.fmtPct(G.Sim.marketFee(), 1)} overhead · next broker ${U.fmtMoney(G.Sim.brokerCost())}`);
    body.appendChild(head);
    body.appendChild(h('div.row', { style: { marginBottom: '8px', gap: '6px' } }, broker, h('span.tiny', 'Prices move every 30 s. Each stock has hidden moods (stable, rising, falling, chaotic). Buy low, sell high — and sell while a revenue buff is active: $1 of stock is worth one second of your CURRENT revenue.')));
    const table = h('div.stocks');
    const rows = [];
    G.STOCKS.forEach((d, i) => {
      const val = h('div.sv'), delta = h('div.sd'), own = h('div.so'), cv = h('canvas.spark', { width: 140, height: 34 });
      const mk = (label, fn) => { const b = h('button.btn', label); b.addEventListener('click', () => { if (fn()) G.Audio.buy(); else G.Audio.error(); }); return b; };
      const buys = h('div.sbtn', mk('BUY 1', () => G.Sim.buyStock(i, 1)), mk('10', () => G.Sim.buyStock(i, 10)), mk('MAX', () => G.Sim.buyStock(i, 'max')));
      const sells = h('div.sbtn', mk('SELL 1', () => G.Sim.sellStock(i, 1)), mk('10', () => G.Sim.sellStock(i, 10)), mk('ALL', () => G.Sim.sellStock(i, 'all')));
      const el = h('div.stock', h('div', h('div.name', d.id), h('div.tiny', d.name)), val, delta, cv, own, h('div', buys, sells));
      UI.tip(el, () => {
        const st = S.market.stocks[i];
        if (!st) return '';
        const avg = st.own ? st.paid / st.own : 0;
        return `<b>${d.id} — ${d.name}</b><div class="tl2">${d.desc}</div><hr>Value ${st.v.toFixed(2)} → price ${U.fmtMoney(G.Sim.stockPrice(i))} per share<br>Owned ${st.own}${st.own ? ` · avg cost ${U.fmtMoney(avg)} per share` : ''}<br>Max shares: ${G.Sim.maxShares()} (more hardware → more)`;
      });
      rows.push({ el, val, delta, own, cv });
      table.appendChild(el);
    });
    body.appendChild(table);
    let lastHist = '';
    this.parts.upd = () => {
      const m = S.market;
      if (!m.stocks.length) { U.setHTML(head, '<span class="small">The exchange opens on the next tick…</span>'); return; }
      U.setHTML(head, `<div class="row sb" style="flex-wrap:wrap;gap:8px"><span class="small">$1 of stock = 1 s of revenue = <b style="color:var(--money)">${U.fmtMoney(G.Sim.stockScale())}</b></span><span class="small">Overhead ${U.fmtPct(G.Sim.marketFee(), 1)} · brokers ${m.brokers}</span><span class="small">Max ${G.Sim.maxShares()} shares/stock</span><span class="small">Profit this run: <b style="color:${m.profit >= 0 ? 'var(--green)' : 'var(--red)'}">${U.fmtMoney(m.profit)}</b></span><span class="small">Next tick ${clock(G.STRAT.MARKET_TICK - m.t)}</span></div>`);
      const hsig = m.stocks.map((s) => s.hist.length + ':' + s.v.toFixed(2)).join(',');
      rows.forEach((r, i) => {
        const st = m.stocks[i];
        const prev = st.hist.length > 1 ? st.hist[st.hist.length - 2] : st.v;
        const dv = st.v - prev;
        U.setText(r.val, '$' + st.v.toFixed(2));
        U.setText(r.delta, (dv >= 0 ? '▲ ' : '▼ ') + Math.abs(dv).toFixed(2));
        r.delta.style.color = dv >= 0 ? 'var(--green)' : 'var(--red)';
        const avg = st.own ? st.paid / st.own / G.Sim.stockScale() : 0;
        U.setHTML(r.own, `${st.own}<span class="tiny">/${G.Sim.maxShares()}</span>${st.own ? `<div class="tiny" style="color:${st.v * (1) >= avg ? 'var(--green)' : 'var(--red)'}">paid ~$${avg.toFixed(2)}</div>` : ''}`);
      });
      if (hsig !== lastHist) {
        lastHist = hsig;
        rows.forEach((r, i) => drawSpark(r.cv, m.stocks[i].hist));
      }
    };
  }
  function drawSpark(cv, data) {
    const x = cv.getContext('2d'), w = cv.width, hh = cv.height;
    x.fillStyle = '#0b0a1a';
    x.fillRect(0, 0, w, hh);
    if (data.length < 2) return;
    const mn = Math.min(...data), mx = Math.max(...data) + 1e-9;
    x.strokeStyle = data[data.length - 1] >= data[0] ? '#5cf27a' : '#ff4d6d';
    x.lineWidth = 1.5;
    x.beginPath();
    data.forEach((v, i) => { const X = (i / (data.length - 1)) * (w - 2) + 1, Y = hh - 2 - ((v - mn) / (mx - mn)) * (hh - 4); i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
    x.stroke();
  }

  /* ------------------------------------------------------------------ register (after TEAM) + alerts */
  const T = UI.tabs;
  const at = T.findIndex((t) => t.id === 'team');
  T.splice(at >= 0 ? at + 1 : T.length, 0, tab);

  let alertSig = '';
  UI.strategyAlerts = () => {
    const S = G.S;
    if (!S || !tab.unlocked()) return;
    const nsig = [G.SYNERGIES.filter((sy) => G.Sim.synAvailable(sy) && S.money >= G.Sim.synCost(sy)).length,
      G.INFLUENCERS.filter((f) => G.Sim.inflAvailable(f) && S.money >= f.cost).length, S.insight.n, G.Sim.featureOpen('board'), G.Sim.featureOpen('shog'), G.Sim.featureOpen('market')].join(',');
    if (nsig !== alertSig) {
      const was = alertSig;
      alertSig = nsig;
      if (was) UI.markTab('strategy');
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
