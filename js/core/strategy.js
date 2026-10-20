/* Optimization layer actions (data in data/strategy.js, effects in calc.js): synergies, influencers,
 * insights & building levels, the Board of Advisors, the Shoggoth, and the GPU Exchange. No DOM. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const Sim = G.Sim;
  const bus = G.bus;
  const ST = G.STRAT;
  const S = () => G.S;
  const D = () => G.D;
  const toast = (t, k) => Sim.toast(t, k);
  const owned = (kind, id) => Sim.owned(kind, id);
  const byId = (list, id) => list.find((x) => x.id === id);

  /* ================================================================== synergies */
  Sim.synCost = (sy) => {
    const base = (k, id) => Sim.unitCost(k, Sim.item(k, id));
    return ST.SYN_COST * Math.max(base(...sy.a), base(...sy.b));
  };
  /** visible = both buildings unlocked; available = both owned >= need */
  Sim.synVisible = (sy) => !!(Sim.item(...sy.a) && Sim.item(...sy.b)) && Sim.unlocked(Sim.item(...sy.a).req) && Sim.unlocked(Sim.item(...sy.b).req);
  Sim.synAvailable = (sy) => !S().syn[sy.id] && owned(...sy.a) >= sy.need && owned(...sy.b) >= sy.need;
  Sim.buySyn = (id) => {
    const sy = byId(G.SYNERGIES, id);
    if (!sy || !Sim.synAvailable(sy)) return false;
    const c = Sim.synCost(sy);
    if (S().money < c) return false;
    S().money -= c;
    S().syn[id] = true;
    Sim.recalc();
    bus.emit('synergy', sy);
    return true;
  };

  /* ================================================================== hype & influencers */
  Sim.inflAvailable = (f) => !S().infl[f.id] && Object.keys(S().achievements).length >= f.need;
  Sim.buyInfl = (id) => {
    const f = byId(G.INFLUENCERS, id);
    if (!f || !Sim.inflAvailable(f) || S().money < f.cost) return false;
    S().money -= f.cost;
    S().infl[id] = true;
    Sim.recalc();
    bus.emit('influencer', f);
    return true;
  };

  /* ================================================================== insights & building levels */
  Sim.buildingLevel = (kind, id) => S().levels[kind + ':' + id] || 0;
  Sim.levelCost = (kind, id) => Sim.buildingLevel(kind, id) + 1;
  Sim.levelUp = (kind, id) => {
    const s = S();
    if (!s.insight.unlocked || owned(kind, id) < 1) return false;
    const c = Sim.levelCost(kind, id);
    if (s.insight.n < c) return false;
    s.insight.n -= c;
    const key = kind + ':' + id;
    s.levels[key] = (s.levels[key] || 0) + 1;
    Sim.recalc();
    bus.emit('levelUp', { kind, id, level: s.levels[key] });
    return true;
  };
  Sim.totalLevels = () => Object.values(S().levels).reduce((a, b) => a + b, 0);

  /* ================================================================== unlocks (each minigame is opened by a building level) */
  Sim.UNLOCKS = {
    board: { kind: 'res', id: 'rs', label: 'Level up Research Scientists once' },
    shog: { kind: 'safety', id: 'interp', label: 'Level up Interpretability Researchers once' },
    market: { kind: 'hw', id: 'dgxa100', label: 'Level up DGX A100s once' },
  };
  Sim.featureOpen = (f) => { const u = Sim.UNLOCKS[f]; return Sim.buildingLevel(u.kind, u.id) >= 1; };

  /* ================================================================== the Board of Advisors */
  Sim.seatOf = (advisorId) => G.SEATS.find((seat) => S().board[seat.id] === advisorId);
  Sim.seatAdvisor = (advisorId, seatId) => {
    const b = S().board;
    if (!Sim.featureOpen('board') || !byId(G.SEATS, seatId) || !byId(G.ADVISORS, advisorId)) return false;
    if (b[seatId] === advisorId) return true;
    if (b.swaps < 1) return false;
    b.swaps -= 1;
    const from = Sim.seatOf(advisorId);
    if (from) b[from.id] = b[seatId] || null; // swap seats
    b[seatId] = advisorId;
    Sim.recalc();
    bus.emit('board', { advisorId, seatId });
    return true;
  };
  Sim.unseat = (seatId) => { S().board[seatId] = null; Sim.recalc(); };

  /* ================================================================== the Shoggoth */
  Sim.shogFeedCost = () => {
    const s = S(), lv = s.shog.level;
    const money = Math.max(1e5, D().revenue * 300) * Math.pow(1.8, lv);
    let sacrifice = null;
    if (lv >= 5) {
      let best = null;
      for (const h of G.HARDWARE) if ((s.hw[h.id] || 0) > (best ? s.hw[best.id] : 0)) best = h;
      if (best) sacrifice = { kind: 'hw', id: best.id, name: best.name, n: 10 + 5 * (lv - 5) };
    }
    return { money, sacrifice };
  };
  Sim.feedShog = () => {
    const s = S();
    if (!Sim.featureOpen('shog') || s.shog.level >= G.SHOGGOTH.MAX_LEVEL) return false;
    const c = Sim.shogFeedCost();
    if (s.money < c.money) return false;
    if (c.sacrifice && (s.hw[c.sacrifice.id] || 0) < c.sacrifice.n) return false;
    s.money -= c.money;
    if (c.sacrifice) s.hw[c.sacrifice.id] -= c.sacrifice.n;
    s.shog.level++;
    if (s.shog.auras.length === 0) s.shog.auras.push(G.AURAS[0].id);
    Sim.recalc();
    bus.emit('shogLevel', { level: s.shog.level, aura: G.AURAS[s.shog.level - 1] });
    return true;
  };
  Sim.auraSlots = () => (S().shog.level >= G.SHOGGOTH.SECOND_AURA ? 2 : 1);
  Sim.auraUnlocked = (id) => G.AURAS.findIndex((a) => a.id === id) < S().shog.level;
  /** switching auras costs one unit of your best hardware (Krumblor rule) */
  Sim.auraSwitchCost = () => {
    let best = null;
    for (const h of G.HARDWARE) if ((S().hw[h.id] || 0) > 0) best = h;
    return best;
  };
  Sim.setAura = (slot, id) => {
    const s = S();
    if (!Sim.auraUnlocked(id) || slot >= Sim.auraSlots()) return false;
    if (s.shog.auras.includes(id)) return true;
    const cost = Sim.auraSwitchCost();
    if (s.shog.auras[slot]) {
      if (!cost) return false;
      s.hw[cost.id] -= 1;
    }
    s.shog.auras[slot] = id;
    s.shog.auras = s.shog.auras.filter(Boolean);
    Sim.recalc();
    bus.emit('aura', id);
    return true;
  };

  /* ================================================================== the GPU Exchange */
  const rest = (i) => 10 + 9 * i;
  function initMarket() {
    const m = S().market;
    m.stocks = G.STOCKS.map((d, i) => ({ v: rest(i) * U.rand(0.7, 1.3), d: 0, mode: U.randi(0, 5), dur: U.randi(10, 80), hist: [], own: 0, paid: 0 }));
    m.t = 0;
  }
  /** "$1 of stock value = 1 second of revenue" (Cookie Clicker rule). Buffs count, so selling during a frenzy pays ×7. */
  Sim.stockScale = () => Math.max(1, D().revenue);
  Sim.stockPrice = (i) => S().market.stocks[i].v * Sim.stockScale();
  Sim.maxShares = () => {
    const hw = Object.values(S().hw).reduce((a, b) => a + b, 0);
    return 100 + Math.floor(hw / 4) + 25 * Sim.buildingLevel('hw', 'dgxa100');
  };
  Sim.marketFee = () => ST.MARKET_FEE * Math.pow(0.93, S().market.brokers);
  Sim.brokerCost = () => Math.max(1e6, D().revenue * 1200) * Math.pow(1.3, S().market.brokers);
  Sim.hireBroker = () => {
    const m = S().market;
    const c = Sim.brokerCost();
    if (m.brokers >= 50 || S().money < c) return false;
    S().money -= c;
    m.brokers++;
    return true;
  };
  Sim.buyStock = (i, n) => {
    const m = S().market, st = m.stocks[i];
    if (!st || !Sim.featureOpen('market')) return 0;
    const unit = Sim.stockPrice(i) * (1 + Sim.marketFee());
    n = Math.min(n === 'max' ? Infinity : n, Sim.maxShares() - st.own, Math.floor(S().money / unit));
    if (n <= 0) return 0;
    S().money -= unit * n;
    st.own += n;
    st.paid += unit * n;
    bus.emit('stock', { i, n });
    return n;
  };
  Sim.sellStock = (i, n) => {
    const m = S().market, st = m.stocks[i];
    if (!st) return 0;
    n = Math.min(n === 'all' ? Infinity : n, st.own);
    if (n <= 0) return 0;
    const gain = Sim.stockPrice(i) * n;
    const basis = st.paid * (n / st.own);
    st.own -= n;
    st.paid -= basis;
    S().money += gain;
    S().stats.totalMoney += Math.max(0, gain - basis);
    m.profit += gain - basis;
    // profit measured in seconds of (unbuffed-ish) revenue, for achievements
    S().stats.marketProfitSec = (S().stats.marketProfitSec || 0) + (gain - basis) / Math.max(1, D().revenue / Math.max(1, D().comboMoney));
    bus.emit('stock', { i, n: -n, profit: gain - basis });
    return n;
  };
  function tickMarket() {
    const m = S().market;
    for (let i = 0; i < m.stocks.length; i++) {
      const st = m.stocks[i];
      const r = rest(i);
      st.d *= 0.97;
      st.v += (r - st.v) * 0.01; // drift back toward the resting value
      switch (G.STOCK_MODES[st.mode]) {
        case 'stable': st.d *= 0.95; break;
        case 'slow rise': st.d += 0.05; break;
        case 'slow fall': st.d -= 0.05; break;
        case 'fast rise': st.d += 0.15; st.v += U.rand(-0.3, 0.6); break;
        case 'fast fall': st.d -= 0.15; st.v += U.rand(-0.6, 0.3); break;
        case 'chaotic': st.d += U.rand(-0.3, 0.3); if (Math.random() < 0.1) st.v *= U.rand(0.8, 1.25); break;
      }
      st.d += U.rand(-0.08, 0.08);
      st.v += st.d + U.rand(-0.4, 0.4);
      if (st.v < 1) { st.v = 1 + Math.random(); st.d = Math.abs(st.d) * 0.5; }
      if (st.v > r * 3 + 40) st.d -= 0.6;
      if (--st.dur <= 0) { st.mode = U.randi(0, 5); st.dur = U.randi(10, 80); }
      st.hist.push(+st.v.toFixed(2));
      if (st.hist.length > 60) st.hist.shift();
    }
  }

  /* ================================================================== tick */
  Sim.tickStrategy = (dt) => {
    const s = S(), d = D();
    // insights
    const ins = s.insight;
    if (!ins.unlocked && d.bestCap >= ST.INSIGHT_UNLOCK_CAP) {
      ins.unlocked = true;
      ins.n += 1;
      ins.total += 1;
      toast('◆ INSIGHTS UNLOCKED — a new Insight forms every 20 minutes. Spend them to level up buildings (STRATEGY tab).', 'ach');
      bus.emit('insight', { first: true });
    }
    if (ins.unlocked) {
      ins.t += dt * (d.M.insightRate || 1);
      while (ins.t >= ST.INSIGHT_SECONDS) {
        ins.t -= ST.INSIGHT_SECONDS;
        const n = Math.random() < 0.1 ? 2 : 1;
        ins.n += n;
        ins.total += n;
        toast(n > 1 ? '◆◆ A double Insight crystallized!' : '◆ A new Insight crystallized.', 'good');
        bus.emit('insight', { n });
      }
    }
    // board swaps regenerate
    const b = s.board;
    if (b.swaps < 3) {
      b.t += dt;
      if (b.t >= ST.SWAP_SECONDS) { b.t = 0; b.swaps++; }
    } else b.t = 0;
    // market
    if (Sim.featureOpen('market')) {
      if (!s.market.stocks.length) initMarket();
      s.market.t += dt;
      while (s.market.t >= ST.MARKET_TICK) { s.market.t -= ST.MARKET_TICK; tickMarket(); }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
