/* Core simulation: tick loop + all player actions. No DOM access (runs headless in tools/balance.js). */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const C = G.Calc;
  const bus = G.bus;

  const Sim = (G.Sim = {});
  let S = null; // current state
  let D = null; // derived
  let secAcc = 0;
  let autoAcc = 0;

  Sim.state = () => S;
  Sim.D = () => D;
  Sim.set = (s) => {
    S = s;
    if (!Object.keys(S.rivals).length) initRivals(S);
    D = C.recalc(S);
    G.D = D;
    G.S = S;
    return S;
  };
  Sim.recalc = () => {
    D = C.recalc(S);
    G.D = D;
    return D;
  };

  /* ================================================================== helpers */
  function toast(text, kind, extra) { bus.emit('toast', Object.assign({ text, kind: kind || 'info' }, extra || {})); }
  Sim.toast = toast;

  function fill(t, vars) {
    return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : '{' + k + '}'));
  }
  function post(who, text, extra) {
    const p = Object.assign({ id: 'p' + Math.random().toString(36).slice(2, 9), who, text, t: S.stats.playTime }, extra || {});
    S.feed.unshift(p);
    if (S.feed.length > 60) S.feed.length = 60;
    bus.emit('feed', p);
    return p;
  }
  Sim.post = post;
  function postFrom(list, vars, n) {
    const picks = U.shuffle(list.slice()).slice(0, n || 1);
    for (const [who, t] of picks) post(who, fill(t, vars));
  }

  function addVibe(x) {
    if (!x) return;
    const M = D.M;
    const v = x > 0 ? x * M.vibeGain : x * M.vibeLoss;
    S.vibe = U.clamp(S.vibe + v, -100, 100);
  }
  Sim.addVibe = addVibe;

  function addBuff(b) {
    const existing = S.buffs.find((x) => x.id === b.id);
    if (existing) {
      existing.left = Math.max(existing.left, b.dur);
      return;
    }
    S.buffs.push(Object.assign({ left: b.dur }, b));
    bus.emit('buff', b);
  }
  Sim.addBuff = addBuff;

  function labName(id) { return (G.LABS[id] || {}).name || id; }

  /* ================================================================== rivals */
  G.RIVAL_FOUNDED = { openai: 60, anthropic: 170, deepmind: 0, xai: 212, meta: 0, deepseek: 206, mistral: 204, ssi: 240 };
  function initRivals(s) {
    s.rivals = {};
    for (const id of G.LAB_ORDER) {
      if (id === s.lab) continue;
      const tr = G.RIVAL_TRAITS[id];
      const founded = G.RIVAL_FOUNDED[id];
      const cap = founded <= 0 ? Math.max(8, tr.early + 10) : 0;
      s.rivals[id] = { cap, next: U.rand(40, 140), model: cap ? G.modelFamily(id, cap) : '' };
    }
  }
  Sim.initRivals = initRivals;

  function updateRivals(dt) {
    for (const id in S.rivals) {
      const r = S.rivals[id];
      const tr = G.RIVAL_TRAITS[id];
      const founded = G.RIVAL_FOUNDED[id];
      if (D.bestCap < founded) continue;
      if (r.cap <= 0) {
        r.cap = Math.max(20, D.bestCap - 25 + U.rand(-5, 5));
        r.model = G.modelFamily(id, r.cap);
        post('news', `${labName(id)} is founded. "Our mission: build safe, beneficial AGI." (Everyone says that.)`);
        continue;
      }
      r.next -= dt * (tr.aggro || 1);
      if (r.next > 0) continue;
      r.next = U.rand(80, 190);
      const prog = U.smooth(U.clamp((D.bestCap - 60) / 280, 0, 1));
      const off = S.flags.asi ? -60 - Math.random() * 40 : U.lerp(tr.early, tr.late, prog);
      const stall = S.flags.asi ? 0 : Math.min(14, ((S.run.time - S.run.lastRelease) / 60) * 1.1);
      const target = D.bestCap + off + stall + U.rand(-4, 4);
      if (target > r.cap + 1.5) {
        const wasBelow = r.cap <= D.cap;
        r.cap = target;
        r.model = G.modelFamily(id, r.cap);
        const vars = { rival: labName(id), model: r.model, cap: Math.round(r.cap), lab: labName(S.lab) };
        if (D.bestCap > 60) {
          if (wasBelow && r.cap > D.cap) {
            postFrom(G.FEED_REACT.rival_top, vars, 1);
            addVibe(-8);
          } else if (Math.random() < 0.5) postFrom(G.FEED_REACT.rival, vars, 1);
        }
        bus.emit('rivalRelease', { id, cap: r.cap, model: r.model });
      }
    }
  }

  /* ================================================================== purchasing */
  const KINDS = {
    hw: { list: () => G.HARDWARE, own: (s) => s.hw, costKey: 'hwCost' },
    power: { list: () => G.POWER, own: (s) => s.power, costKey: 'powerCost' },
    res: { list: () => G.RESEARCHERS, own: (s) => s.res, costKey: 'resCost' },
    safety: { list: () => G.SAFETY, own: (s) => s.safety, costKey: 'resCost' },
    src: { list: () => G.DATASRC, own: (s) => s.src, costKey: 'dataCost' },
  };
  Sim.KINDS = KINDS;
  Sim.item = (kind, id) => G.byId(KINDS[kind].list(), id);
  Sim.owned = (kind, id) => KINDS[kind].own(S)[id] || 0;
  Sim.unitCost = (kind, it) => {
    const k = G.BAL.COST[kind];
    const idx = KINDS[kind].list().indexOf(it);
    const late = k.LATE && idx >= k.LATE.from ? Math.pow(k.LATE.mult, idx - k.LATE.from + 1) : 1;
    return it.cost * (idx === 0 ? 1 : k.K) * Math.pow(k.TIER, idx) * late * (D.M[KINDS[kind].costKey] || 1);
  };
  Sim.price = (kind, id, n) => {
    const it = Sim.item(kind, id);
    const owned = Sim.owned(kind, id);
    return U.bulkCost(Sim.unitCost(kind, it), it.r, owned, n);
  };
  Sim.maxBuy = (kind, id) => {
    const it = Sim.item(kind, id);
    return U.maxAffordable(Sim.unitCost(kind, it), it.r, Sim.owned(kind, id), S.money);
  };
  Sim.unlocked = (req) => C.isUnlocked(S, D, req);
  Sim.buy = (kind, id, n) => {
    const it = Sim.item(kind, id);
    if (!it || !Sim.unlocked(it.req)) return 0;
    if (n === 'max') n = Sim.maxBuy(kind, id);
    if (n <= 0) return 0;
    const cost = Sim.price(kind, id, n);
    if (cost > S.money) return 0;
    S.money -= cost;
    const own = KINDS[kind].own(S);
    own[id] = (own[id] || 0) + n;
    if (kind === 'hw') S.stats.maxHwOwned = Math.max(S.stats.maxHwOwned, own[id]);
    Sim.recalc();
    bus.emit('buy', { kind, id, n });
    return n;
  };

  Sim.upgradeAvailable = (u) => {
    const own = KINDS[u.kind].own(S)[u.target] || 0;
    return !S.upgrades[u.id] && own >= u.need;
  };
  Sim.upgradeCost = (u) => {
    const k = G.BAL.COST[u.kind];
    const it = Sim.item(u.kind, u.target);
    const idx = KINDS[u.kind].list().indexOf(it);
    const late = k.LATE && idx >= k.LATE.from ? Math.pow(k.LATE.mult, idx - k.LATE.from + 1) : 1;
    return u.cost * (idx === 0 ? 1 : k.K) * Math.pow(k.TIER, idx) * late * G.BAL.COST.upgrade * (D.M[KINDS[u.kind].costKey] || 1);
  };
  Sim.buyUpgrade = (id) => {
    const u = G.BUILDING_UPGRADES.find((x) => x.id === id);
    if (!u || !Sim.upgradeAvailable(u)) return false;
    const c = Sim.upgradeCost(u);
    if (S.money < c) return false;
    S.money -= c;
    S.upgrades[id] = true;
    Sim.recalc();
    bus.emit('upgrade', u);
    return true;
  };

  /* ================================================================== research */
  Sim.researchCost = (r) => r.cost * (r.id === 'cai' ? D.M.cost_cai : 1);
  Sim.researchVisible = (r) => {
    if (S.research[r.id]) return true;
    if (r.asi && !S.flags.asi) return false;
    return (r.req || []).every((q) => S.research[q]);
  };
  Sim.canResearch = (r) => !S.research[r.id] && Sim.researchVisible(r) && S.rp >= Sim.researchCost(r);
  Sim.research = (id) => {
    const r = G.RESEARCH.find((x) => x.id === id);
    if (!r || !Sim.canResearch(r)) return false;
    S.rp -= Sim.researchCost(r);
    S.research[id] = true;
    Sim.recalc();
    bus.emit('research', r);
    if (id === 'goldengate') addVibe(25);
    return true;
  };
  Sim.repeatCost = (r) => {
    const l = S.repeat[r.id] || 0;
    return r.base * Math.pow(r.growth, l) * Math.pow(G.BAL.REPEAT_SUPER, (l * (l - 1)) / 2);
  };
  Sim.repeatVisible = (r) => !!S.research[r.req];
  Sim.researchRepeat = (id) => {
    const r = G.REPEATABLE.find((x) => x.id === id);
    if (!r || !Sim.repeatVisible(r)) return false;
    const c = Sim.repeatCost(r);
    if (S.rp < c) return false;
    S.rp -= c;
    S.repeat[id] = (S.repeat[id] || 0) + 1;
    Sim.recalc();
    bus.emit('research', r);
    return true;
  };

  /* ================================================================== products */
  Sim.productName = (p) => (typeof p.name === 'function' ? p.name(G.LABS[S.lab]) : p.name);
  Sim.productCost = (p) => p.cost * G.BAL.COST.product * (p.costKey ? D.M[p.costKey] || 1 : 1);
  Sim.productUnlocked = (p) => Sim.unlocked(p.req);
  Sim.buyProduct = (id) => {
    const p = G.PRODUCTS.find((x) => x.id === id);
    if (!p || S.products[id] || !Sim.productUnlocked(p)) return false;
    const c = Sim.productCost(p);
    if (S.money < c) return false;
    S.money -= c;
    S.products[id] = true;
    Sim.recalc();
    bus.emit('product', p);
    if (id === 'image') {
      addVibe(50);
      addBuff({ id: 'ghibli', name: 'Ghibli Moment — "our GPUs are melting"', dur: 120, users: 3 });
      post('sama', 'the images are fun but our GPUs are melting. temporarily introducing rate limits.');
    }
    if (id === 'voice') addVibe(20);
    return true;
  };

  /* ================================================================== training */
  Sim.predict = (N, Dt, rl) => {
    const M = D.M;
    const capPre = C.capPre(N, Dt, M.kN, M.kD, M.arch);
    const rlBonus = rl ? M.rlBonus : 0;
    const post = D.capTTC + D.capTTT + D.capAgents + M.capFlat + (N < 3e10 ? M.smallModelBonus : 0);
    const flop = 6 * N * Dt * (rl ? 1 + G.BAL.RL_COMPUTE_FRAC : 1);
    const R = C.lossR(N, Dt, M.kN, M.kD);
    return {
      flop, capPre, rlBonus, cap: capPre + rlBonus + post, loss: G.BAL.E + R, R,
      eta: D.trainRate > 0 ? flop / D.trainRate : Infinity, tpp: Dt / N,
    };
  };
  Sim.optimalForEta = (eta, rl) => {
    const C0 = D.trainRate * eta / (rl ? 1 + G.BAL.RL_COMPUTE_FRAC : 1);
    return C.optimalND(Math.max(C0, 6 * G.BAL.MIN_PARAMS * G.BAL.MIN_TOKENS), S.tokens, D.M.kN, D.M.kD);
  };
  Sim.startTraining = (N, Dt, rl) => {
    if (S.training) return false;
    N = Math.max(G.BAL.MIN_PARAMS, N);
    Dt = Math.min(S.tokens, Math.max(G.BAL.MIN_TOKENS, Dt));
    rl = !!rl && D.M.rlBonus > 0;
    const p = Sim.predict(N, Dt, rl);
    S.training = {
      N, D: Dt, rl, flop: p.flop, done: 0, kN: D.M.kN, kD: D.M.kD, arch: D.M.arch, rlBonus: p.rlBonus,
      capPre: p.capPre, t: 0, startLoss: p.loss,
    };
    S.trainCfg.N = N;
    S.trainCfg.D = Dt;
    S.trainCfg.rl = rl;
    bus.emit('train:start', S.training);
    return true;
  };
  Sim.cancelTraining = () => {
    if (!S.training) return;
    S.training = null;
    bus.emit('train:cancel');
  };
  /** current training loss (as if trained on the fraction of data seen so far) */
  Sim.trainingLoss = (tr, frac) => {
    const f = Math.max(1e-4, frac);
    return G.BAL.E + C.lossR(tr.N, tr.D * f, tr.kN, tr.kD);
  };

  function finishTraining() {
    const tr = S.training;
    S.training = null;
    const R = C.lossR(tr.N, tr.D, tr.kN, tr.kD);
    const capPre = C.capPre(tr.N, tr.D, tr.kN, tr.kD, tr.arch);
    S.bestN = Math.max(S.bestN || 0, tr.N);
    const lab = G.LABS[S.lab];
    const estCap = capPre + tr.rlBonus + D.capTTC + D.capTTT + D.capAgents + D.M.capFlat;
    const m = {
      id: S.models.length,
      name: lab.modelName(estCap, tr.N, S.bestN),
      N: tr.N, D: tr.D, R, loss: G.BAL.E + R, capPre, rlBonus: tr.rlBonus, flop: tr.flop, arch: tr.arch,
      date: D.date, t: S.run.time,
    };
    // disambiguate duplicate names
    const same = S.models.filter((x) => x.name === m.name || x.name.startsWith(m.name + ' (')).length;
    if (same) m.name += ` (v${same + 1})`;
    S.models.push(m);
    if (S.models.length > 40) {
      // keep history bounded; preserve deployed index
      const dep = S.models[S.deployed];
      S.models.splice(0, S.models.length - 40);
      S.models.forEach((x, i) => (x.id = i));
      S.deployed = dep ? S.models.indexOf(dep) : -1;
    }
    S.stats.runs++;
    S.stats.maxRunFlop = Math.max(S.stats.maxRunFlop, tr.flop);
    const opt = C.optimalND(tr.flop / (tr.rl ? 1.5 : 1), Infinity, tr.kN, tr.kD);
    const optR = C.lossR(opt.N, opt.D, tr.kN, tr.kD);
    if (R <= optR * 1.01 && tr.N > 1e8) S.stats.chinchillaRun = true;
    const tpp = tr.D / tr.N;
    if (tpp >= 200 && tr.N > 1e8) S.stats.overtrained = true;
    if (tpp < 2 && tr.N > 1e9) S.stats.undertrained = true;
    if (estCap >= 260 && tr.N < 1e11) S.stats.efficientModel = true;
    bus.emit('train:done', m);
    const cur = S.deployed >= 0 ? S.models[S.deployed] : null;
    const better = !cur || m.capPre + m.rlBonus > cur.capPre + (cur.rlBonus || 0) + 0.01;
    if (S.trainCfg.autoDeploy && better) Sim.deploy(S.models.length - 1);
    else toast(`Training complete: ${m.name} (cap ${Math.round(estCap)})${better ? '' : ' — not better than current model'}`, 'good');
  }

  Sim.deploy = (idx) => {
    const m = S.models[idx];
    if (!m) return;
    const prevCap = D.cap;
    const prevRank = D.rank;
    S.deployed = idx;
    Sim.recalc();
    const gain = D.cap - prevCap;
    S.run.lastRelease = S.run.time;
    if (gain > 0.5) {
      addVibe(Math.min(40, gain * 1.5) * D.M.releaseVibe);
      const vars = { model: m.name, lab: labName(S.lab), cap: Math.round(D.cap), n: U.randi(4, 45) };
      if (D.bestCap >= 90) postFrom(G.FEED_REACT.release, vars, gain > 8 ? 3 : 1);
      if (D.rank === 1 && prevRank > 1 && D.bestCap >= 90) {
        postFrom(G.FEED_REACT.sota, vars, 1);
        addVibe(15);
        bus.emit('sota', m);
      }
    }
    bus.emit('deploy', m);
  };
  Sim.renameModel = (idx, name) => {
    if (S.models[idx] && name) S.models[idx].name = String(name).slice(0, 40);
  };

  /* ================================================================== click */
  Sim.click = () => {
    let v = D.clickValue;
    const crit = Math.random() < 0.04;
    if (crit) v *= 10;
    S.money += v;
    S.stats.totalMoney += v;
    S.stats.clicks++;
    S.vibe = Math.min(100, S.vibe + G.BAL.VIBE_CLICK * D.M.vibeGain * (S.vibe < 60 ? 1 : 0.4));
    if (S.training) S.training.done += D.trainRate * 0.01;
    return { v, crit };
  };

  /* ================================================================== drops */
  const DROP_TYPES = [
    { type: 'crate', w: () => G.BAL.CRATE_CHANCE, name: 'Lore Crate' },
    { type: 'strawberry', w: () => 0.2, name: '🍓 Strawberry' },
    { type: 'apple', w: () => 0.14, name: '🍎 Leak' },
    { type: 'gpu', w: () => 0.14, name: 'GPU Shipment' },
    { type: 'coin', w: () => 0.15, name: 'Funding' },
    { type: 'rocket', w: () => 0.08, name: 'Viral Demo' },
    { type: 'brain', w: () => (S.training ? 0.07 : 0), name: 'Eureka' },
  ];
  function spawnDrop(forceType) {
    const t = forceType ? DROP_TYPES.find((x) => x.type === forceType) : U.weighted(DROP_TYPES, (x) => x.w());
    const d = { id: 'd' + Math.random().toString(36).slice(2, 8), type: t.type, name: t.name, life: G.BAL.DROP_LIFETIME, max: G.BAL.DROP_LIFETIME, seed: Math.random() };
    S.drops.push(d);
    bus.emit('drop', d);
    return d;
  }
  Sim.spawnDrop = spawnDrop;
  Sim.catchDrop = (id) => {
    const i = S.drops.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const d = S.drops[i];
    S.drops.splice(i, 1);
    S.stats.drops++;
    const M = D.M;
    let text = '';
    let pack = null;
    switch (d.type) {
      case 'crate': {
        const r = Math.random();
        pack = r < 0.02 + M.packLuck * 0.01 ? 'epic' : r < 0.14 + M.packLuck * 0.04 ? 'premium' : 'basic';
        S.packs[pack]++;
        text = `${G.PACKS[pack].name}!`;
        break;
      }
      case 'strawberry': {
        const n = Math.max(1, Math.round(U.randi(1, 3) * M.strawberry));
        S.strawberries += n;
        S.stats.strawberryDrops++;
        addBuff({ id: 'frenzy', name: 'FEEL THE AGI', dur: 30, compute: 7, money: 7 });
        text = `FEEL THE AGI! ×7 compute & revenue · +${n}🍓`;
        break;
      }
      case 'apple': {
        const g = Math.max(20, D.rpRate * 120);
        S.rp += g;
        text = `Leaked research notes! +${U.fmt(g)} RP`;
        break;
      }
      case 'gpu': {
        let best = null;
        for (const h of G.HARDWARE) if (Sim.unlocked(h.req)) best = h;
        const own = S.hw[best.id] || 0;
        const n = Math.max(1, Math.floor(own * 0.06));
        S.hw[best.id] = own + n;
        text = `GPU shipment: +${n} ${best.name}`;
        break;
      }
      case 'coin': {
        const g = Math.max(50, D.revenue * 150);
        S.money += g;
        S.stats.totalMoney += g;
        text = `Surprise funding round! +${U.fmtMoney(g)}`;
        break;
      }
      case 'rocket': {
        addVibe(40);
        addBuff({ id: 'viral', name: 'Viral Demo', dur: 45, users: 2 });
        text = 'Your demo went viral! Vibes +40, users ×2';
        break;
      }
      case 'brain': {
        if (S.training) {
          S.training.done += S.training.flop * 0.15;
          text = 'Eureka! Training +15%';
        } else {
          S.rp += D.rpRate * 60;
          text = 'Eureka! +RP';
        }
        break;
      }
    }
    Sim.recalc();
    bus.emit('dropCaught', { drop: d, text, pack });
    return { drop: d, text, pack };
  };

  /* ================================================================== packs & cards */
  Sim.rollRarity = (packType) => {
    const minR = G.PACKS[packType].minRarity;
    const luck = D.M.packLuck;
    const items = G.RARITIES.filter((r) => r.idx >= minR);
    return U.weighted(items, (r) => r.weight * (1 + luck * r.idx * 0.6));
  };
  Sim.openPack = (packType) => {
    if (!S.packs[packType]) return null;
    S.packs[packType]--;
    const rarity = Sim.rollRarity(packType);
    const pool = G.CARDS.filter((c) => c.r === rarity.id);
    const card = U.weighted(pool, (c) => (S.cards[c.id] ? 1 : 1.6));
    const before = S.cards[card.id] || 0;
    const lvBefore = C.cardLevel(before);
    S.cards[card.id] = before + 1;
    const lv = C.cardLevel(before + 1);
    S.stats.packsOpened++;
    S.stats.rarityPulls[rarity.idx]++;
    let bonus = 0;
    if (before > 0) {
      bonus = Math.max(1, Math.round(rarity.shards / 2));
      S.strawberries += bonus;
    }
    Sim.recalc();
    const res = { card, rarity, isNew: before === 0, count: before + 1, level: lv, levelUp: lv > lvBefore && before > 0, strawberries: bonus };
    bus.emit('packOpened', res);
    return res;
  };
  Sim.buyPack = (type) => {
    const p = G.PACKS[type];
    if (S.strawberries < p.cost) return false;
    S.strawberries -= p.cost;
    S.packs[type]++;
    bus.emit('packBought', p);
    return true;
  };
  Sim.totalPacks = () => Object.values(S.packs).reduce((a, b) => a + b, 0);

  /* ================================================================== outcomes (story, mini, incidents) */
  Sim.applyOutcome = (o) => {
    if (!o) return '';
    const msgs = [];
    if (o.vibe) addVibe(o.vibe);
    if (o.money) S.money = Math.max(0, S.money + o.money * Math.max(D.revenue, 10));
    if (o.cash) S.money += o.cash;
    if (o.cashFrac) S.money = Math.max(0, S.money * (1 + o.cashFrac));
    if (o.rp) S.rp = Math.max(0, S.rp + o.rp * Math.max(D.rpRate, 1));
    if (o.ap) S.ap = Math.max(0, S.ap + o.ap * Math.max(D.apRate, 0.5));
    if (o.data) S.tokens += o.data * D.tokenRate;
    if (o.buff) addBuff(o.buff);
    if (o.flag) S.flags[o.flag] = true;
    if (o.grant) S.research[o.grant] = true;
    if (o.misalign) S.misalign = U.clamp(S.misalign + o.misalign, 0, 100);
    if (o.packs) for (const k in o.packs) S.packs[k] = (S.packs[k] || 0) + o.packs[k];
    if (o.strawberries) S.strawberries += o.strawberries;
    if (o.researchersLost) {
      const tiers = G.RESEARCHERS.filter((r) => S.res[r.id]).slice(-3);
      for (const r of tiers) S.res[r.id] -= Math.floor(S.res[r.id] * o.researchersLost);
    }
    if (o.freeResearchers) {
      const tiers = G.RESEARCHERS.filter((r) => S.res[r.id]).slice(-3);
      for (const r of tiers) S.res[r.id] += Math.max(1, Math.floor(S.res[r.id] * o.freeResearchers));
    }
    if (o.rivalBoost) {
      for (const id in o.rivalBoost) if (S.rivals[id]) S.rivals[id].cap = Math.max(S.rivals[id].cap, D.bestCap - o.rivalBoost[id]);
    }
    if (o.missionAppeal) {
      const p = 0.6 + 0.3 * U.clamp(D.safety - 1, 0, 1);
      if (Math.random() < p) {
        addVibe(10);
        msgs.push('They stay. "We\'re here for the mission." Morale +.');
      } else {
        Sim.applyOutcome({ researchersLost: 0.15, vibe: -10 });
        msgs.push('They leave anyway. The mission was not nine figures.');
      }
    }
    if (o.crateSoon) {
      S.forceCrate = true;
      S.nextDrop = Math.min(S.nextDrop, 4);
    }
    if (o.text) msgs.push(o.text);
    Sim.recalc();
    return msgs.join(' ');
  };

  Sim.currentStory = () => S.storyQueue[0] || null;
  Sim.storyDef = (id) => G.STORY.find((e) => e.id === id);
  Sim.storyChoices = (ev) => (typeof ev.choices === 'function' ? ev.choices(S, D) : ev.choices);
  Sim.choose = (id, idx) => {
    const ev = Sim.storyDef(id);
    if (!ev) return;
    const ch = Sim.storyChoices(ev)[idx];
    S.storyQueue = S.storyQueue.filter((x) => x !== id);
    const msg = Sim.applyOutcome(ch.o);
    bus.emit('storyResolved', { ev, choice: ch, msg });
    if (msg) toast(msg, 'story');
    return msg;
  };

  function checkStory() {
    for (const ev of G.STORY) {
      if (S.story[ev.id] && !ev.repeatable) continue;
      if (ev.repeatable && S.storyCd[ev.id] && S.storyCd[ev.id] > S.run.time) continue;
      if (S.storyQueue.includes(ev.id)) continue;
      let ok = false;
      try { ok = ev.when(S, D); } catch (e) { ok = false; }
      if (!ok) continue;
      if (ev.chance && Math.random() > ev.chance) continue;
      S.story[ev.id] = true;
      if (ev.repeatable) S.storyCd[ev.id] = S.run.time + (ev.cooldown || 600);
      S.storyQueue.push(ev.id);
      bus.emit('story', ev);
    }
  }

  function checkIncidents() {
    if (D.cap < 160 || D.safety >= 1) return;
    const p = 0.0045 * (1 - D.safety) * D.M.incidentRate;
    if (Math.random() > p) return;
    const pool = G.INCIDENTS.filter((x) => D.cap >= x.cap);
    if (!pool.length) return;
    const inc = U.pick(pool.slice(-4));
    Sim.applyOutcome(inc.o);
    S.stats.incidents++;
    postFrom(G.FEED_REACT.incident, { lab: labName(S.lab), incident: inc.title }, 1);
    bus.emit('incident', inc);
    toast(`⚠ INCIDENT: ${inc.title} — ${inc.text}`, 'bad');
  }

  /* ---------------------------------------------------------------- mini events */
  function spawnMini() {
    const pool = G.MINI.filter((m) => D.bestCap >= m.cap);
    if (!pool.length) return;
    const m = U.weighted(pool, (x) => x.weight);
    const who = G.FEED_WHO[m.who] ? m.who : 'news';
    const p = post(who, m.text(), { mini: m.id });
    S.mini = { id: m.id, post: p.id, left: m.timer, timer: m.timer };
    bus.emit('mini', S.mini);
  }
  Sim.resolveMini = (success) => {
    if (!S.mini) return;
    const m = G.MINI.find((x) => x.id === S.mini.id);
    const postId = S.mini.post;
    S.mini = null;
    const o = success ? m.success : m.fail;
    const msg = Sim.applyOutcome(o);
    if (success) {
      S.stats.miniWins++;
      S.stats.miniById[m.id] = (S.stats.miniById[m.id] || 0) + 1;
    }
    const p = S.feed.find((x) => x.id === postId);
    if (p) p.resolved = success ? 'win' : 'lose';
    bus.emit('miniResolved', { m, success, msg, postId });
    if (msg) toast(msg, success ? 'good' : 'bad');
  };

  /* ================================================================== milestones / achievements / objectives */
  function giveReward(r, label) {
    if (!r) return;
    if (r.cash) S.money += r.cash;
    if (r.strawberries) S.strawberries += r.strawberries;
    if (r.packs) for (const k in r.packs) S.packs[k] = (S.packs[k] || 0) + r.packs[k];
    if (r.fund) {
      const g = Math.max(r.fund.min, D.revenue * r.fund.sec);
      S.money += g;
      S.stats.totalMoney += g;
      toast(`💰 ${r.fund.name}: +${U.fmtMoney(g)}`, 'money');
    }
  }
  function checkMilestones() {
    for (const m of G.MILESTONES) {
      if (S.milestones[m.id]) continue;
      if (D.bestCap < m.cap) break;
      if (m.id === 'm_asi') break; // handled by ASI trigger
      S.milestones[m.id] = true;
      giveReward(m.reward);
      bus.emit('milestone', m);
    }
  }
  function checkAchievements() {
    for (const a of G.ACHIEVEMENTS) {
      if (S.achievements[a.id]) continue;
      let ok = false;
      try { ok = a.cond(S, D); } catch (e) { ok = false; }
      if (ok) {
        S.achievements[a.id] = Date.now();
        giveReward(a.reward);
        bus.emit('achievement', a);
      }
    }
  }
  function checkObjectives() {
    for (const o of G.OBJECTIVES) {
      if (S.objectives[o.id]) continue;
      let ok = false;
      try { ok = o.cond(S, D); } catch (e) { ok = false; }
      if (ok) {
        S.objectives[o.id] = true;
        giveReward(o.reward);
        bus.emit('objective', o);
      }
    }
  }
  Sim.currentObjectives = (n) => G.OBJECTIVES.filter((o) => !S.objectives[o.id]).slice(0, n || 3);
  function checkLabs() {
    for (const id of G.LAB_ORDER) {
      const lab = G.LABS[id];
      if (S.labsUnlocked[id] || !lab.unlockCond) continue;
      if (lab.unlockCond(S)) {
        S.labsUnlocked[id] = true;
        toast(`🔓 New lab unlocked: ${lab.name} (choose it when you prestige)`, 'good');
        bus.emit('labUnlocked', lab);
      }
    }
  }

  /* ================================================================== ASI & cosmos */
  function triggerASI() {
    S.flags.asi = true;
    S.stats.asiCount++;
    const aligned = (S.misalign < 50 && D.safety >= 0.9) || (S.flags.slowdown && S.misalign < 70 && D.safety >= 0.6);
    S.ending = aligned ? 'aligned' : 'misaligned';
    S.milestones.m_asi = true;
    S.cosmos = {
      energy: Math.max(1e15, D.powerCap || 0),
      joules: 0,
      stars: 1,
      alloc: { rep: 0.5, compute: 0.4, explore: 0.1 },
      projects: {},
      t: 0,
    };
    for (const [who, t] of G.FEED_REACT.asi) post(who, t);
    Sim.recalc();
    bus.emit('asi', { ending: S.ending });
  }
  Sim.triggerASI = triggerASI;

  Sim.projectCost = (p) => p.cost;
  Sim.projectAvailable = (p) => {
    const c = S.cosmos;
    if (!c || c.projects[p.id]) return false;
    if (p.needEnergy && c.energy < p.needEnergy) return false;
    if (p.needStars && c.stars < p.needStars) return false;
    if (p.needResearch && !S.research[p.needResearch]) return false;
    const idx = G.MEGAPROJECTS.indexOf(p);
    if (idx > 0 && !c.projects[G.MEGAPROJECTS[idx - 1].id]) return false;
    return true;
  };
  Sim.buyProject = (id) => {
    const p = G.MEGAPROJECTS.find((x) => x.id === id);
    if (!p || !Sim.projectAvailable(p)) return false;
    const cost = Sim.projectCost(p);
    if ((cost.money || 0) > S.money || (cost.rp || 0) > S.rp) return false;
    S.money -= cost.money || 0;
    S.rp -= cost.rp || 0;
    S.cosmos.projects[id] = true;
    if (id === 'probes') S.cosmos.stars = Math.max(S.cosmos.stars, 2);
    Sim.recalc();
    bus.emit('project', p);
    return true;
  };
  function tickCosmos(dt) {
    const c = S.cosmos;
    if (!c) return;
    const M = D.M;
    const P = c.projects;
    const K = G.COSMOS;
    c.t += dt;
    const rep = P.robot_economy ? K.BASE_REP * (0.25 + c.alloc.rep) * M.cosReplicate : 0.0005;
    let maxE = (P.mercury ? K.SUN * Math.max(1, c.stars) : K.EARTH_MAX) * M.cosEnergy * (P.blackholes ? 100 : 1);
    c.maxEnergy = maxE;
    c.energy = Math.min(maxE, c.energy + c.energy * rep * Math.max(0, 1 - c.energy / maxE) * dt);
    c.joules += c.energy * dt;
    if (P.probes) {
      const cap = P.intergalactic ? K.UNIVERSE_STARS : P.galactic ? K.GALAXY_STARS : 1e6;
      c.starCap = cap;
      const g = K.BASE_EXPLORE * (0.2 + c.alloc.explore * 2) * (P.galactic ? 3 : 1) * (P.intergalactic ? 2 : 1);
      c.stars = Math.min(cap, c.stars + c.stars * g * Math.max(0, 1 - c.stars / cap) * dt);
    }
  }
  Sim.setCosmosAlloc = (k, v) => {
    const c = S.cosmos;
    if (!c) return;
    c.alloc[k] = U.clamp(v, 0, 1);
    const keys = ['rep', 'compute', 'explore'];
    const others = keys.filter((x) => x !== k);
    const rest = 1 - c.alloc[k];
    const sumO = others.reduce((a, x) => a + c.alloc[x], 0) || 1;
    for (const x of others) c.alloc[x] = (c.alloc[x] / sumO) * rest;
  };

  /* ================================================================== prestige */
  Sim.canPrestige = () => D.blGain >= 1;
  Sim.prestige = (newLab) => {
    const gain = D.blGain;
    if (gain < 1) return null;
    const old = S;
    const lab = newLab && old.labsUnlocked[newLab] ? newLab : old.lab;
    old.prestige.count++;
    old.prestige.totalBL += gain;
    old.prestige.bank += gain;
    old.stats.bestCapEver = Math.max(old.stats.bestCapEver, D.bestCap);
    const s = G.newState(lab, old);
    applyStartLessons(s);
    Sim.set(s);
    post('you', 'Some of our best researchers are leaving to start something new. They take the lessons with them.');
    post('sutton', 'The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation are ultimately the most effective, and by a large margin.');
    bus.emit('prestige', { gain, lab });
    return gain;
  };
  function applyStartLessons(s) {
    const L = s.prestige.lessons;
    const cash = G.lessonStartCash(L.capital || 0);
    s.money += cash;
    const mem = G.MEMORY_TIERS[L.memory || 0] || 0;
    if (mem > 0) for (const r of G.RESEARCH) if (r.t <= mem && !r.asi) s.research[r.id] = true;
    const hs = G.HEADSTART_CAP[L.headstart || 0] || 0;
    if (hs > 0) {
      const tmpD = C.recalc(s);
      const target = hs - tmpD.M.capFlat;
      const m = modelForCap(target, tmpD.M);
      const lab = G.LABS[s.lab];
      s.models.push({ id: 0, name: 'Legacy ' + lab.modelName(hs, m.N, m.N), N: m.N, D: m.D, R: m.R, loss: G.BAL.E + m.R, capPre: m.capPre, rlBonus: 0, flop: 6 * m.N * m.D, arch: 1, date: 0, t: 0 });
      s.deployed = 0;
      s.bestN = m.N;
      s.run.maxCap = hs;
      s.tokens = Math.max(s.tokens, m.D);
      s.humanTokens = Math.max(s.humanTokens, m.D);
    }
    if (s.lab === 'ssi' && !s.cards.ilya) s.cards.ilya = 1;
  }
  function modelForCap(cap, M) {
    let lo = 10, hi = 40;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const nd = C.optimalND(Math.pow(10, mid), Infinity, M.kN, M.kD);
      const c = C.capPre(nd.N, nd.D, M.kN, M.kD, M.arch);
      if (c < cap) lo = mid; else hi = mid;
    }
    const nd = C.optimalND(Math.pow(10, hi), Infinity, M.kN, M.kD);
    return { N: nd.N, D: nd.D, R: C.lossR(nd.N, nd.D, M.kN, M.kD), capPre: C.capPre(nd.N, nd.D, M.kN, M.kD, M.arch) };
  }
  Sim.modelForCap = modelForCap;

  Sim.lessonCost = (l) => l.cost(S.prestige.lessons[l.id] || 0);
  Sim.buyLesson = (id) => {
    const l = G.LESSONS.find((x) => x.id === id);
    const lv = S.prestige.lessons[id] || 0;
    if (!l || lv >= l.max) return false;
    const c = l.cost(lv);
    if (S.prestige.bank < c) return false;
    S.prestige.bank -= c;
    S.prestige.lessons[id] = lv + 1;
    Sim.recalc();
    bus.emit('lesson', l);
    return true;
  };

  Sim.omegaGain = () => {
    if (!S.cosmos || !S.cosmos.projects.omega_project) return 0;
    return Math.max(1, Math.floor(Math.pow(Math.max(0, Math.log10(S.cosmos.joules + 1) - 50), 1.5)) + 1);
  };
  Sim.omegaPrestige = () => {
    const gain = Sim.omegaGain();
    if (gain < 1) return null;
    const old = S;
    old.omega.count++;
    old.omega.total += gain;
    old.omega.bank += gain;
    // automation lessons persist; numeric lessons reset
    const keep = {};
    for (const k of ['autobuy', 'autotrain', 'autoresearch', 'autohire']) if (old.prestige.lessons[k]) keep[k] = old.prestige.lessons[k];
    old.prestige = { count: old.prestige.count, totalBL: 0, bank: 0, lessons: keep };
    const s = G.newState(old.lab, old);
    s.flags = { tutorialDone: true, seenIntro: true };
    Sim.set(s);
    bus.emit('omega', { gain });
    return gain;
  };

  /* ================================================================== automation */
  function autoBuy() {
    const A = S.auto;
    const L = S.prestige.lessons;
    if (L.autobuy && A.hw) {
      let budget = S.money * 0.5;
      for (let i = 0; i < 25; i++) {
        let best = null, bestV = 0;
        for (const h of G.HARDWARE) {
          if (!Sim.unlocked(h.req)) continue;
          const c = Sim.price('hw', h.id, 1);
          if (c > budget) continue;
          const v = (h.flops * (D.M.hw[h.id] || 1)) / c;
          if (v > bestV) { bestV = v; best = h; }
        }
        if (!best) break;
        budget -= Sim.price('hw', best.id, 1);
        Sim.buy('hw', best.id, 1);
      }
      for (const u of G.BUILDING_UPGRADES) {
        if (u.kind !== 'hw' && u.kind !== 'src' && u.kind !== 'res' && u.kind !== 'safety') continue;
        if (Sim.upgradeAvailable(u) && Sim.upgradeCost(u) < S.money * 0.15) Sim.buyUpgrade(u.id);
      }
      if (S.flags.power && D.throttle < 1 || (S.flags.power && D.powerUse > D.powerCap * 0.9)) {
        let best = null, bestV = 0;
        for (const p of G.POWER) {
          if (!Sim.unlocked(p.req)) continue;
          const c = Sim.price('power', p.id, 1);
          if (c > S.money * 0.6) continue;
          const v = p.watts / c;
          if (v > bestV) { bestV = v; best = p; }
        }
        if (best) Sim.buy('power', best.id, 1);
      }
    }
    if (L.autobuy && A.src) {
      let budget = S.money * 0.25;
      for (let i = 0; i < 10; i++) {
        let best = null, bestV = 0;
        for (const src of G.DATASRC) {
          if (!Sim.unlocked(src.req)) continue;
          if (src.human && D.dataWall) continue;
          const c = Sim.price('src', src.id, 1);
          if (c > budget) continue;
          const v = src.tps / c;
          if (v > bestV) { bestV = v; best = src; }
        }
        if (!best) break;
        budget -= Sim.price('src', best.id, 1);
        Sim.buy('src', best.id, 1);
      }
    }
    if (L.autohire && A.hire) {
      let budget = S.money * 0.3;
      for (let i = 0; i < 10; i++) {
        let best = null, bestV = 0;
        for (const r of G.RESEARCHERS) {
          if (!Sim.unlocked(r.req)) continue;
          const c = Sim.price('res', r.id, 1);
          if (c > budget) continue;
          const v = r.rp / c;
          if (v > bestV) { bestV = v; best = r; }
        }
        if (!best) break;
        budget -= Sim.price('res', best.id, 1);
        Sim.buy('res', best.id, 1);
      }
      if (D.safety < 1.3) {
        let best = null, bestV = 0;
        for (const r of G.SAFETY) {
          if (!Sim.unlocked(r.req)) continue;
          const c = Sim.price('safety', r.id, 1);
          if (c > S.money * 0.2) continue;
          const v = r.ap / c;
          if (v > bestV) { bestV = v; best = r; }
        }
        if (best) Sim.buy('safety', best.id, 1);
      }
    }
    if (L.autoresearch && A.research) {
      let cheapest = null, cc = Infinity;
      for (const r of G.RESEARCH) {
        if (S.research[r.id] || !Sim.researchVisible(r)) continue;
        const c = Sim.researchCost(r);
        if (c < cc) { cc = c; cheapest = r; }
      }
      if (cheapest && S.rp >= cc) Sim.research(cheapest.id);
      else if (!cheapest || cc > S.rp * 20) {
        let rep = null, rc = Infinity;
        for (const r of G.REPEATABLE) {
          if (!Sim.repeatVisible(r)) continue;
          const c = Sim.repeatCost(r);
          if (c < rc) { rc = c; rep = r; }
        }
        if (rep && S.rp >= rc) Sim.researchRepeat(rep.id);
      }
    }
    if (L.autotrain && A.train && !S.training) {
      const nd = Sim.optimalForEta(A.trainEta || 60, D.M.rlBonus > 0);
      const p = Sim.predict(nd.N, nd.D, D.M.rlBonus > 0);
      const cur = D.model ? D.model.capPre + (D.model.rlBonus || 0) : -Infinity;
      if (p.capPre + p.rlBonus > cur + 1) Sim.startTraining(nd.N, nd.D, D.M.rlBonus > 0);
    }
  }
  Sim.autoBuy = autoBuy;

  /* ================================================================== tick */
  Sim.tick = (dt) => {
    const s = S;
    D = C.recalc(s);
    G.D = D;
    const B = G.BAL;
    s.stats.playTime += dt;
    s.run.time += dt;

    // economy
    const earned = D.revenue * dt;
    s.money += earned;
    s.stats.totalMoney += earned;
    s.rp += D.rpRate * dt;
    s.ap += D.apRate * dt;
    s.tokens += D.tokenRate * dt;
    s.humanTokens += D.humanTokenRate * dt;
    if (!s.flags.datawall && s.humanTokens >= D.humanPool) {
      s.flags.datawall = true;
      s.humanTokens = D.humanPool;
      postFrom(G.FEED_REACT.datawall, {}, 2);
      toast('🧱 DATA WALL: all human-written text has been used. Research Synthetic Data to keep scaling.', 'bad');
      bus.emit('datawall');
    }

    // training
    if (s.training) {
      s.training.done += D.trainRate * dt;
      s.training.t += dt;
      if (s.training.done >= s.training.flop) finishTraining();
    }

    // vibes drift toward floor
    const floor = D.M.vibeFloor;
    s.vibe += (floor - s.vibe) * B.VIBE_DECAY * dt;

    // buffs
    for (const b of s.buffs) b.left -= dt;
    if (s.buffs.some((b) => b.left <= 0)) {
      for (const b of s.buffs.filter((x) => x.left <= 0)) bus.emit('buffEnd', b);
      s.buffs = s.buffs.filter((b) => b.left > 0);
    }

    // misalignment dynamics
    if (D.cap >= 160) {
      if (D.safety < 1) s.misalign += (1 - D.safety) * 0.012 * dt * (s.flags.race ? 3 : 1) * (D.cap >= 300 ? 1 : 0.35);
      else s.misalign -= Math.min(0.03, (D.safety - 1) * 0.01) * dt;
      s.misalign = U.clamp(s.misalign, 0, 100);
    }

    updateRivals(dt);

    // drops
    s.nextDrop -= dt * D.M.dropRate;
    if (s.nextDrop <= 0) {
      spawnDrop(s.forceCrate ? 'crate' : null);
      s.forceCrate = false;
      s.nextDrop = U.rand(B.DROP_MIN, B.DROP_MAX);
    }
    for (const d of s.drops) d.life -= dt;
    if (s.drops.some((d) => d.life <= 0)) {
      for (const d of s.drops.filter((x) => x.life <= 0)) bus.emit('dropMissed', d);
      s.drops = s.drops.filter((d) => d.life > 0);
    }

    // mini events
    if (s.mini) {
      s.mini.left -= dt;
      if (s.mini.left <= 0) Sim.resolveMini(false);
    } else if (D.bestCap >= 100) {
      s.nextMini -= dt;
      if (s.nextMini <= 0) {
        spawnMini();
        s.nextMini = U.rand(60, 150);
      }
    }

    // idle feed
    s.nextFeed -= dt;
    if (s.nextFeed <= 0) {
      s.nextFeed = U.rand(9, 20);
      const pool = G.FEED_IDLE.filter((f) => D.bestCap >= f[2] && D.bestCap <= f[3]);
      if (pool.length) {
        const recent = new Set(s.feed.slice(0, 25).map((p) => p.text));
        const cand = pool.filter((f) => !recent.has(f[1]));
        const f = U.weighted(cand.length ? cand : pool, (x) => x[4]);
        post(f[0], f[1]);
      }
    }

    // run max capability
    if (D.cap > (s.run.maxCap || 0)) s.run.maxCap = D.cap;
    if (D.cap > s.stats.bestCapEver) s.stats.bestCapEver = D.cap;
    if (D.rank === 1 && D.cap > 60) s.stats.rank1Streak += dt;
    else s.stats.rank1Streak = 0;

    // power unlock
    if (!s.flags.power && D.bestCap >= 200) {
      s.flags.power = true;
      s.flags.powerBase = Math.max(D.powerUse * 1.3, 2e6);
      post('news', 'Datacenter power demand to double by 2030. Utilities warn of shortages. The bottleneck is now power.');
      toast('⚡ THE BOTTLENECK IS NOW POWER. New hardware needs power capacity (COMPUTE tab).', 'bad');
      bus.emit('powerUnlocked');
    }

    // ASI
    if (!s.flags.asi && D.cap >= B.ASI_CAP) triggerASI();
    tickCosmos(dt);

    // once per second
    secAcc += dt;
    if (secAcc >= 1) {
      secAcc = 0;
      checkMilestones();
      checkStory();
      checkIncidents();
      checkAchievements();
      checkObjectives();
      checkLabs();
      if (D.era !== s.lastEra) {
        const prev = s.lastEra;
        s.lastEra = D.era;
        if (prev !== undefined) bus.emit('era', { era: D.era, prev });
      }
    }
    autoAcc += dt;
    if (autoAcc >= 0.5) {
      autoAcc = 0;
      autoBuy();
    }

    s.lastUsers = D.users;
    s.lastAgents = D.agentCopies;
    s._lastSafety = D.safety;
    s.date = D.date;
  };

  /** fast-forward (offline progress). Simulates in coarse steps with drops/minis/stories suppressed. */
  Sim.fastForward = (seconds, eff) => {
    const before = { money: S.money, rp: S.rp, tokens: S.tokens, ap: S.ap, runs: S.stats.runs, cap: D.cap };
    const steps = Math.min(2000, Math.max(1, Math.ceil(seconds / 2)));
    const dt = (seconds * eff) / steps;
    const saveDrops = S.nextDrop, saveMini = S.nextMini, saveFeed = S.nextFeed;
    for (let i = 0; i < steps; i++) {
      S.nextDrop = 1e9;
      S.nextMini = 1e9;
      S.nextFeed = 1e9;
      Sim.tick(dt);
    }
    S.nextDrop = saveDrops;
    S.nextMini = saveMini;
    S.nextFeed = saveFeed;
    S.drops = [];
    return {
      seconds, eff,
      money: S.money - before.money, rp: S.rp - before.rp, tokens: S.tokens - before.tokens, ap: S.ap - before.ap,
      runs: S.stats.runs - before.runs, capGain: D.cap - before.cap,
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
