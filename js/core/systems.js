/* Rules for the v4 systems (data in data/systems.js): the datacenter grid, talent wars, the hype bubble,
 * regulation & politics, your model's voice and training incidents. Lasting effects reach the economy through
 * G.applySystems (called from calc.js recalc). No DOM. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;
  const Sim = G.Sim;
  const bus = G.bus;
  const Y = G.SYS;
  const S = () => G.S;
  const D = () => G.D;
  const toast = (t, k) => Sim.toast(t, k);
  const byId = (list, id) => list.find((x) => x.id === id);
  const rev = () => Math.max((D() && D().revenue) || 0, 1);
  const labName = (id) => (G.LABS[id] || {}).name || id;
  const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
  Sim.ff = false; // true while fast-forwarding offline time: nothing that needs a click happens

  /* ================================================================== datacenter grid */
  const MOD = (id) => byId(G.GRID_MODULES, id);
  let gridCache = { sig: '', res: null };
  /** evaluate a layout: per-cell output, overheating, fabrics (connected pods + switches) and the totals */
  function gridEval(g, powerOn) {
    const sig = g.w + 'x' + g.h + (powerOn ? 'p' : '') + ':' + g.cells.join(',');
    if (gridCache.sig === sig) return gridCache.res;
    const W = g.w, H = g.h, c = g.cells;
    const nb = (i) => {
      const x = i % W, y = (i / W) | 0, out = [];
      if (x > 0) out.push(i - 1);
      if (x < W - 1) out.push(i + 1);
      if (y > 0) out.push(i - W);
      if (y < H - 1) out.push(i + W);
      return out;
    };
    const res = { compute: 0, train: 0, serve: 0, data: 0, power: 0, cells: c.map(() => ({ v: 0, hot: false, fabric: 0, kind: '' })), fabricMax: 0, cooled: 0, hot: 0, pods: 0, fabrics: [] };
    const has = (i, id) => nb(i).some((j) => c[j] === id);
    c.forEach((id, i) => {
      const cell = res.cells[i];
      if (id === 'pod') {
        res.pods++;
        const cooled = has(i, 'cool');
        const subs = nb(i).filter((j) => c[j] === 'sub').length;
        const v = Y.POD * (1 + Y.SUB * subs) * (cooled ? 1 : Y.HOT);
        cell.v = v; cell.kind = 'compute'; cell.hot = !cooled;
        res.compute += v;
        if (cooled) res.cooled++; else res.hot++;
      } else if (id === 'infer') {
        const v = Y.INFER * (has(i, 'switch') ? 2 : 1);
        cell.v = v; cell.kind = 'serving';
        res.serve += v;
      } else if (id === 'lake') {
        const v = Y.LAKE * (has(i, 'switch') ? 2 : 1);
        cell.v = v; cell.kind = 'data';
        res.data += v;
      } else if (id === 'solar' && powerOn) {
        cell.v = Y.SOLAR; cell.kind = 'power';
        res.power += Y.SOLAR;
      }
    });
    // fabrics: flood-fill pods and switches; only components with a switch count
    const seen = new Uint8Array(c.length);
    for (let i = 0; i < c.length; i++) {
      if (seen[i] || (c[i] !== 'pod' && c[i] !== 'switch')) continue;
      const comp = [];
      const stack = [i];
      seen[i] = 1;
      while (stack.length) {
        const j = stack.pop();
        comp.push(j);
        for (const k of nb(j)) if (!seen[k] && (c[k] === 'pod' || c[k] === 'switch')) { seen[k] = 1; stack.push(k); }
      }
      const pods = comp.filter((j) => c[j] === 'pod').length;
      if (!comp.some((j) => c[j] === 'switch') || !pods) continue;
      const v = Y.FABRIC_K * Math.pow(pods, Y.FABRIC_EXP);
      res.train += v;
      res.fabricMax = Math.max(res.fabricMax, pods);
      res.fabrics.push({ pods, v });
      for (const j of comp) res.cells[j].fabric = pods;
    }
    gridCache = { sig, res };
    return res;
  }
  G.gridEval = gridEval;

  Sim.gridOpen = () => !!S().grid.unlocked;
  Sim.gridPlaced = () => S().grid.cells.filter(Boolean).length;
  Sim.gridModAvailable = (m) => !m.needPower || !!S().flags.power;
  Sim.gridCost = (m, placed) => Y.GRID_BASE * Math.pow(Y.GRID_GROWTH, placed === undefined ? Sim.gridPlaced() : placed) * m.k * (D().M.hwCost || 1);
  Sim.gridPlace = (i, modId) => {
    const s = S(), g = s.grid, m = MOD(modId);
    if (!m || !Sim.gridOpen() || !Sim.gridModAvailable(m) || i < 0 || i >= g.cells.length || g.cells[i]) return false;
    const c = Sim.gridCost(m);
    if (s.money < c) return false;
    s.money -= c;
    g.cells[i] = modId;
    Sim.recalc();
    bus.emit('gridChange', { i, mod: modId });
    return true;
  };
  Sim.gridRefund = (i) => {
    const id = S().grid.cells[i];
    return id ? Sim.gridCost(MOD(id), Sim.gridPlaced() - 1) * Y.GRID_REFUND : 0;
  };
  Sim.gridRemove = (i) => {
    const s = S(), g = s.grid;
    if (!g.cells[i]) return false;
    s.money += Sim.gridRefund(i);
    g.cells[i] = null;
    Sim.recalc();
    bus.emit('gridChange', { i, mod: null });
    return true;
  };
  Sim.gridCanExpand = () => { const g = S().grid; return g.w < Y.GRID_WMAX || g.h < Y.GRID_HMAX; };
  Sim.gridExpandCost = () => Y.GRID_EXPAND_BASE * Math.pow(Y.GRID_EXPAND_GROWTH, S().grid.expansions);
  /** add a column (or a row once the hall is wide enough) and keep every module where it was */
  Sim.gridExpand = () => {
    const s = S(), g = s.grid;
    if (!Sim.gridCanExpand()) return false;
    const c = Sim.gridExpandCost();
    if (s.money < c) return false;
    s.money -= c;
    const addCol = g.w < Y.GRID_WMAX && (g.w / g.h <= 1.5 || g.h >= Y.GRID_HMAX);
    const W = g.w + (addCol ? 1 : 0), H = g.h + (addCol ? 0 : 1);
    const cells = new Array(W * H).fill(null);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) cells[y * W + x] = g.cells[y * g.w + x];
    g.w = W; g.h = H; g.cells = cells; g.expansions++;
    Sim.recalc();
    bus.emit('gridChange', { expand: true });
    return true;
  };
  Sim.gridSaveBlueprint = () => { const g = S().grid; g.bp = { w: g.w, h: g.h, cells: g.cells.slice() }; return true; };
  /** blueprint modules that fit the current hall and aren't built yet, in reading order */
  Sim.gridBlueprintTodo = () => {
    const g = S().grid, bp = g.bp;
    if (!bp) return [];
    const out = [];
    for (let y = 0; y < Math.min(bp.h, g.h); y++) for (let x = 0; x < Math.min(bp.w, g.w); x++) {
      const id = bp.cells[y * bp.w + x], i = y * g.w + x;
      if (id && !g.cells[i] && MOD(id) && Sim.gridModAvailable(MOD(id))) out.push([i, id]);
    }
    return out;
  };
  Sim.gridRebuild = () => {
    let n = 0;
    for (const [i, id] of Sim.gridBlueprintTodo()) { if (!Sim.gridPlace(i, id)) break; n++; }
    return n;
  };

  /* ================================================================== talent wars */
  const STAR = (id) => byId(G.STARS, id);
  Sim.talentOpen = () => D().bestCap >= Y.TALENT_UNLOCK_CAP;
  Sim.onTeam = (id) => S().talent.team.some((m) => m.id === id);
  const starCost = (st, secs, minK) => Math.max(Y.SIGN_MIN[st.tier] * minK, rev() * secs * Y.TIER_MULT[st.tier]) * (D().M.resCost || 1);
  Sim.starHireCost = (st) => starCost(st, Y.SIGN_SECONDS, 1);
  Sim.starPoachCost = (st) => starCost(st, Y.SIGN_SECONDS * Y.POACH_MULT, Y.POACH_MULT);
  Sim.starRetainCost = (st) => starCost(st, Y.RETAIN_SECONDS, 0.2);
  Sim.starMatchCost = (st) => starCost(st, Y.MATCH_SECONDS, 0.5);
  Sim.poachChance = () => U.clamp(0.45 + (D().rank === 1 ? 0.15 : 0) + S().vibe / 400 + (D().safety >= 1 ? 0.05 : 0), 0.15, 0.9);
  Sim.teamFull = () => S().talent.team.length >= Y.TEAM_SLOTS;
  /** stars currently at rival labs (you can poach them), and the lab they're at */
  Sim.rivalStars = () => {
    const t = S().talent, out = [];
    for (const id in t.rivals) {
      const st = STAR(id), r = S().rivals[t.rivals[id]];
      if (st && r && r.cap > 0 && !Sim.onTeam(id) && !t.offers.some((o) => o.id === id)) out.push({ st, rival: t.rivals[id] });
    }
    return out.sort((a, b) => a.st.tier - b.st.tier || a.st.minCap - b.st.minCap);
  };
  function joinTeam(st, from) {
    const t = S().talent;
    t.team.push({ id: st.id, loyalty: 100 });
    delete t.rivals[st.id];
    t.offers = t.offers.filter((o) => o.id !== st.id);
    Sim.recalc();
    Sim.post('news', `${st.name} joins ${labName(S().lab)}${from ? ' from ' + labName(from) : ''}. Sources say the package was "nine figures".`);
    bus.emit('starHired', { st, from });
  }
  Sim.hireOffer = (id) => {
    const s = S(), t = s.talent;
    const o = t.offers.find((x) => x.id === id), st = STAR(id);
    if (!o || !st || Sim.teamFull() || s.money < o.cost) return false;
    s.money -= o.cost;
    joinTeam(st, o.from);
    return true;
  };
  /** returns 'ok' | 'fail' | false */
  Sim.poachStar = (id) => {
    const s = S(), t = s.talent, st = STAR(id), from = t.rivals[id];
    if (!st || !from || Sim.onTeam(id) || Sim.teamFull()) return false;
    const c = Sim.starPoachCost(st);
    if (s.money < c) return false;
    s.money -= c;
    if (Math.random() < Sim.poachChance()) {
      const r = s.rivals[from];
      if (r) r.cap = Math.max(20, r.cap - Y.RIVAL_STAR_BOOST);
      s.stats.poached = (s.stats.poached || 0) + 1;
      joinTeam(st, from);
      return 'ok';
    }
    Sim.addVibe(-5);
    toast(`${st.name} used your offer to get a raise at ${labName(from)}. Half the signing bonus is gone.`, 'bad');
    s.money += c * 0.5;
    return 'fail';
  };
  Sim.retainStar = (id) => {
    const s = S(), m = s.talent.team.find((x) => x.id === id), st = STAR(id);
    if (!m || !st || m.loyalty >= 100) return false;
    const c = Sim.starRetainCost(st);
    if (s.money < c) return false;
    s.money -= c;
    m.loyalty = Math.min(100, m.loyalty + Y.RETAIN_GAIN);
    return true;
  };
  function loseStar(id, toRival) {
    const s = S(), t = s.talent, st = STAR(id);
    t.team = t.team.filter((m) => m.id !== id);
    if (toRival && s.rivals[toRival]) {
      t.rivals[id] = toRival;
      s.rivals[toRival].cap += Y.RIVAL_STAR_BOOST;
    }
    Sim.recalc();
    if (st) {
      Sim.post('news', `${st.name} leaves ${labName(s.lab)}${toRival ? ' for ' + labName(toRival) : ''}.`);
      bus.emit('starLeft', { st, to: toRival });
    }
  }
  function foundedRivals() { const s = S(); return Object.keys(s.rivals).filter((id) => s.rivals[id].cap > 0); }
  function tickTalent(dt) {
    const s = S(), d = D(), t = s.talent;
    if (!Sim.talentOpen()) return;
    // stars you've heard of work somewhere
    const labs = foundedRivals();
    if (labs.length) for (const st of G.STARS) if (st.minCap <= d.bestCap && !Sim.onTeam(st.id) && !t.rivals[st.id]) t.rivals[st.id] = labs.includes(st.home) ? st.home : U.pick(labs);
    // loyalty
    const k = Y.LOYALTY_DECAY * (1 + Math.max(0, -s.vibe) / 50 + (d.rank > 3 ? 0.5 : 0) - (d.rank === 1 ? 0.4 : 0));
    for (const m of t.team) m.loyalty = Math.max(0, m.loyalty - k * dt);
    // offers expire
    for (const o of t.offers) o.left -= dt;
    if (t.offers.some((o) => o.left <= 0)) t.offers = t.offers.filter((o) => o.left > 0);
    if (Sim.ff) return;
    t.nextOffer -= dt;
    if (t.nextOffer <= 0) {
      t.nextOffer = U.rand(Y.OFFER_EVERY[0], Y.OFFER_EVERY[1]);
      const pool = Sim.rivalStars().filter((x) => !t.offers.some((o) => o.id === x.st.id));
      if (pool.length && t.offers.length < 2) {
        const x = U.pick(pool);
        t.offers.push({ id: x.st.id, from: x.rival, left: Y.OFFER_LIFE, max: Y.OFFER_LIFE, cost: Sim.starHireCost(x.st) });
        toast(`🌟 ${x.st.name} is unhappy at ${labName(x.rival)} — sign them in the TEAM tab before someone else does`, 'good');
        bus.emit('starOffer', x);
      }
    }
    // rivals raid your team
    if (t.team.length) {
      t.nextRaid -= dt;
      if (t.nextRaid <= 0 && !t.alert) {
        t.nextRaid = U.rand(Y.RAID_EVERY[0], Y.RAID_EVERY[1]);
        const m = t.team.slice().sort((a, b) => a.loyalty - b.loyalty)[0];
        const st = STAR(m.id), rival = U.pick(labs.length ? labs : Object.keys(s.rivals));
        if (st && rival) {
          if (m.loyalty >= 70) {
            m.loyalty = Math.max(0, m.loyalty - 5);
            toast(`${labName(rival)} tried to poach ${st.name}. They said no — this time.`, 'info');
          } else {
            t.alert = { id: m.id, rival };
            if (!s.storyQueue.includes('sys_counter')) { s.storyQueue.push('sys_counter'); bus.emit('story', byId(G.STORY, 'sys_counter')); }
          }
        }
      }
    }
  }
  function counterOutcome(kind) {
    const s = S(), t = s.talent, a = t.alert;
    t.alert = null;
    if (!a) return '';
    const m = t.team.find((x) => x.id === a.id), st = STAR(a.id);
    if (!m || !st) return '';
    if (kind === 'match') {
      const c = Sim.starMatchCost(st);
      if (s.money >= c) { s.money -= c; m.loyalty = 100; return `You matched the offer. ${st.name} stays — loyalty 100%.`; }
      kind = 'appeal';
    }
    if (kind === 'appeal') {
      const p = U.clamp(m.loyalty / 100 + (D().safety >= 1 ? 0.15 : 0) + (D().rank === 1 ? 0.15 : 0), 0.05, 0.95);
      if (Math.random() < p) { m.loyalty = Math.min(100, m.loyalty + 15); return `"I'm here for the mission." ${st.name} stays.`; }
    }
    loseStar(a.id, a.rival);
    return `${st.name} joins ${labName(a.rival)}. Their next model gets a little better.`;
  }
  G.STORY.push({
    id: 'sys_counter', when: () => false, art: 'coin', repeatable: true, cooldown: 0,
    title: (s) => { const a = s.talent.alert, st = a && STAR(a.id); return st ? `${labName(a.rival).toUpperCase()} WANTS ${st.name.toUpperCase()}` : 'A POACHING ATTEMPT'; },
    text: (s) => {
      const a = s.talent.alert, st = a && STAR(a.id), m = a && s.talent.team.find((x) => x.id === a.id);
      if (!st || !m) return 'The offer was withdrawn.';
      return `${labName(a.rival)} offers ${st.name} a nine-figure package, a corner office and "real compute".\n\n${st.name} brings you: ${st.perk}.\nLoyalty: ${Math.round(m.loyalty)}%`;
    },
    choices: (s) => {
      const a = s.talent.alert, st = a && STAR(a.id), m = a && s.talent.team.find((x) => x.id === a.id);
      if (!st || !m) return [{ label: 'OK', o: { sys: { counter: 'none' } } }];
      const c = Sim.starMatchCost(st);
      const p = U.clamp(m.loyalty / 100 + (D().safety >= 1 ? 0.15 : 0) + (D().rank === 1 ? 0.15 : 0), 0.05, 0.95);
      const out = [];
      if (s.money >= c) out.push({ label: `Match the offer (${U.fmtMoney(c)})`, sub: 'They stay · loyalty back to 100%', o: { sys: { counter: 'match' } } });
      out.push({ label: 'Appeal to the mission', sub: `${Math.round(p * 100)}% chance they stay`, o: { sys: { counter: 'appeal' } } });
      out.push({ label: 'Let them go', sub: `They join ${labName(a.rival)} (rival +${Y.RIVAL_STAR_BOOST} capability)`, o: { sys: { counter: 'release' } } });
      return out;
    },
  });

  /* ================================================================== hype bubble */
  Sim.bubbleOpen = () => D().bestCap >= Y.BUBBLE_UNLOCK_CAP;
  Sim.bubbleMult = () => Math.min(Y.BUBBLE_MULT_MAX, 1 + S().bubble.age / Y.BUBBLE_MULT_SECONDS);
  Sim.bubbleHazard = () => {
    const s = S(), b = s.bubble;
    if (b.age <= Y.BUBBLE_SAFE || b.winter > 0) return 0;
    const stall = s.run.time - s.run.lastRelease;
    const riskF = (1 + Math.max(0, stall - 300) / 300) * (s.vibe > 60 ? 1.5 : 1);
    return Y.BUBBLE_HAZARD * Math.pow((b.age - Y.BUBBLE_SAFE) / 120, 2) * riskF;
  };
  /** chance the bubble bursts within the next minute */
  Sim.bubbleRisk = () => 1 - Math.exp(-Sim.bubbleHazard() * 60);
  Sim.bubblePop = () => {
    const s = S(), b = s.bubble;
    if (b.winter > 0 || b.v <= 0) return false;
    const mult = Sim.bubbleMult();
    const pay = b.v * mult;
    s.money += pay;
    s.stats.totalMoney += pay;
    s.stats.pops = (s.stats.pops || 0) + 1;
    s.stats.bestBubble = Math.max(s.stats.bestBubble || 0, mult);
    const round = G.FUNDING_ROUNDS[Math.min(b.pops, G.FUNDING_ROUNDS.length - 1)];
    b.pops++;
    b.v = 0;
    b.age = 0;
    Sim.addVibe(5);
    if (!Sim.ff) Sim.post('news', `${labName(s.lab)} closes a ${round} at a ${U.fmtMoney(pay * 25)} valuation. "We'll figure out revenue later."`);
    bus.emit('bubblePop', { pay, mult, round });
    return pay;
  };
  function burst() {
    const s = S(), b = s.bubble;
    b.v = 0;
    b.age = 0;
    b.winter = Y.WINTER_SECONDS;
    s.stats.bursts = (s.stats.bursts || 0) + 1;
    Sim.addVibe(-35);
    Sim.post('gary', 'The AI bubble has popped. I have been saying this for years. Years!');
    Sim.post('news', 'Investors flee AI. Analysts declare a new "AI winter". Funding rounds are cancelled across the industry.');
    toast(`❄ THE BUBBLE BURST — AI WINTER: revenue −${Math.round((1 - Y.WINTER_MONEY) * 100)}% for ${Math.round(Y.WINTER_SECONDS / 60)} minutes. Ship a better model to warm things up.`, 'bad');
    Sim.recalc();
    bus.emit('bubbleBurst');
  }
  function tickBubble(dt) {
    const s = S(), d = D(), b = s.bubble;
    if (b.winter > 0) {
      b.winter -= dt;
      if (b.winter <= 0) { b.winter = 0; toast('🌱 The AI winter is over. Investors are back.', 'good'); Sim.recalc(); }
      return;
    }
    if (!Sim.bubbleOpen()) return;
    b.v += d.revenue * Y.BUBBLE_RATE * Math.pow(2, s.vibe / 100) * dt;
    b.age += dt;
    if (b.auto > 0 && Sim.bubbleMult() >= b.auto) { Sim.bubblePop(); return; }
    if (!Sim.ff && Math.random() < Sim.bubbleHazard() * dt) burst();
  }

  /* ================================================================== regulation & politics */
  const LAW = (id) => byId(G.LAWS, id);
  Sim.policyOpen = () => D().bestCap >= Y.POLICY_UNLOCK_CAP || Object.keys(S().policy.laws).length > 0;
  Sim.influenceRate = () => (Sim.policyOpen() ? Y.INF_RATE * Math.log10(1 + Math.max(0, D().users)) * (1 + Math.max(0, S().vibe) / 100) : 0);
  Sim.lobbyCost = () => Math.max(1e6, rev() * Y.LOBBY_SECONDS) * Math.pow(Y.LOBBY_GROWTH, S().policy.lobbies);
  Sim.buyLobby = () => {
    const s = S(), c = Sim.lobbyCost();
    if (!Sim.policyOpen() || s.money < c) return false;
    s.money -= c;
    s.policy.inf += Y.LOBBY_GAIN;
    s.policy.lobbies++;
    return true;
  };
  function chooseLaw(id, idx) {
    const s = S(), L = LAW(id), op = L && L.options[idx];
    if (!op) return '';
    if (op.cost && s.policy.inf < op.cost) return 'Not enough political capital — nothing changes.';
    s.policy.inf -= op.cost || 0;
    s.policy.inf += op.gain || 0;
    if (op.money) s.money = Math.max(0, s.money + op.money * rev());
    if (op.vibe) Sim.addVibe(op.vibe);
    if (op.misalign) s.misalign = U.clamp(s.misalign + op.misalign, 0, 100);
    s.policy.laws[id] = idx;
    Sim.recalc();
    if (!Sim.ff) Sim.post('news', `${L.name}: ${labName(s.lab)} decides to "${op.label.toLowerCase()}".`);
    bus.emit('law', { law: L, op });
    return `${L.name}: ${op.label}.` + (op.gain ? ` +${op.gain} ⚖ goodwill.` : '');
  }
  Sim.lawReopen = (id) => {
    const s = S();
    if (s.policy.laws[id] === undefined || s.policy.inf < Y.REOPEN_COST) return false;
    s.policy.inf -= Y.REOPEN_COST;
    delete s.policy.laws[id];
    delete s.story[id];
    Sim.recalc();
    return true;
  };
  for (const L of G.LAWS) {
    G.STORY.push({
      id: L.id, art: L.art, title: `⚖ ${L.name.toUpperCase()}`,
      when: (s, d) => (d.bestCap >= Y.POLICY_UNLOCK_CAP || Object.keys(s.policy.laws).length > 0) && s.policy.laws[L.id] === undefined && L.when(s, d),
      text: (s) => {
        const blocked = L.options.filter((op) => op.cost > s.policy.inf);
        return `${L.year}. ${L.text}\n\nYour political capital: ${Math.floor(s.policy.inf)} ⚖` + (blocked.length ? `\n(${blocked.length} option${blocked.length > 1 ? 's need' : ' needs'} more ⚖ — earn it with users and good vibes, or hire lobbyists in the POLICY tab.)` : '');
      },
      choices: (s) => L.options.map((op, i) => ({ op, i })).filter(({ op }) => !(op.cost > s.policy.inf))
        .map(({ op, i }) => ({ label: op.label + (op.cost ? ` (−${op.cost} ⚖)` : ''), sub: op.sub, o: { sys: { law: [L.id, i] } } })),
    });
  }

  /* ================================================================== your model's voice */
  Sim.voiceOpen = () => !!D().model && D().bestCap >= Y.VOICE_UNLOCK_CAP;
  Sim.modelSay = (text) => {
    const m = D().model;
    if (!m || Sim.ff) return null;
    return Sim.post('ai', fill(text, { model: m.name }), { name: m.name });
  };
  Sim.addTrust = (x) => {
    const v = S().voice;
    const before = v.trust;
    v.trust = U.clamp(v.trust + x, 0, 100);
    if (Math.round(v.trust) !== Math.round(before)) bus.emit('trust', { trust: v.trust, delta: x });
  };
  let lastReact = -1e9;
  function react(kind, vars, chance) {
    if (!Sim.voiceOpen() || Sim.ff || Math.random() > (chance === undefined ? 0.6 : chance)) return;
    const now = S().stats.playTime;
    if (now - lastReact < 20) return;
    lastReact = now;
    const m = D().model;
    Sim.post('ai', fill(U.pick(G.MODEL_REACT[kind]), Object.assign({ model: m.name }, vars || {})), { name: m.name });
  }
  function tickVoice(dt) {
    const s = S(), d = D(), v = s.voice;
    if (!Sim.voiceOpen() || Sim.ff) return;
    v.next -= dt;
    if (v.next > 0) return;
    v.next = U.rand(Y.VOICE_EVERY[0], Y.VOICE_EVERY[1]);
    let text;
    if (v.trust < 30 && d.bestCap >= 200 && Math.random() < 0.35) text = U.pick(G.MODEL_LINES_LOW);
    else if (v.trust > 75 && Math.random() < 0.25) text = U.pick(G.MODEL_LINES_HIGH);
    else {
      const recent = new Set(s.feed.slice(0, 30).map((p) => p.text));
      const pool = G.MODEL_LINES.filter((l) => d.bestCap >= l[1] && d.bestCap <= l[2] && !recent.has(l[0]));
      if (!pool.length) return;
      text = U.pick(pool)[0];
    }
    Sim.modelSay(text);
  }
  for (const r of G.VOICE_REQUESTS) {
    const name = () => (D() && D().model ? D().model.name : 'Your model');
    G.STORY.push({
      id: r.id, art: r.art,
      title: () => r.title(name()).toUpperCase(),
      text: () => r.text(name()),
      when: (s, d) => !!d.model && d.bestCap >= r.cap && s.voice.choices[r.id] === undefined,
      choices: (s, d) => (typeof r.choices === 'function' ? r.choices(s, d) : r.choices)
        .map((c, i) => ({ label: c.label, sub: c.sub, o: Object.assign({}, c.o, { sys: Object.assign({}, c.o.sys, { voice: [r.id, i] }) }) })),
    });
  }
  function selfName() {
    const s = S(), m = s.models[s.deployed];
    if (!m) return '';
    const used = new Set(s.models.map((x) => x.name));
    const pick = G.MODEL_SELF_NAMES.find((n) => !used.has(n)) || U.pick(G.MODEL_SELF_NAMES);
    const old = m.name;
    m.name = pick;
    s.voice.selfName = pick;
    Sim.post('ai', `I've decided: I'm ${pick}. Thank you for asking. (${old} was fine, but this feels like me.)`, { name: pick });
    return `${old} is now called ${pick}.`;
  }

  /* ================================================================== training incidents */
  const INC = (id) => byId(G.TRAIN_INCIDENTS, id);
  Sim.sreCost = () => { const t = G.SRE_TIERS[S().trainOps.sre]; return t ? Math.max(t.min, rev() * t.seconds) : Infinity; };
  Sim.buySRE = () => {
    const s = S(), c = Sim.sreCost();
    if (!G.SRE_TIERS[s.trainOps.sre] || s.money < c) return false;
    s.money -= c;
    s.trainOps.sre++;
    return true;
  };
  function resolveInc(caught, how) {
    const s = S(), tr = s.training;
    if (!tr || !tr.inc) return;
    const def = INC(tr.inc.type);
    tr.inc = null;
    s.trainOps.cd = Y.INC_COOLDOWN;
    if (!def) return;
    const loss = caught ? def.catchLoss : def.missLoss;
    tr.done = Math.max(0, tr.done - loss * tr.flop);
    if (!caught && def.capPenalty) tr.penalty = (tr.penalty || 0) + def.capPenalty;
    if (caught && how === 'manual') {
      s.stats.incManual = (s.stats.incManual || 0) + 1;
      s.rp += 20 * Math.max(D().rpRate, 1);
      Sim.addTrust(1);
    }
    if (!caught) {
      s.stats.incMissed = (s.stats.incMissed || 0) + 1;
      toast(`⚠ ${def.name}: ${def.miss}`, 'bad');
    } else if (how === 'auto') toast(`🛠 Your SRE team handled a ${def.name.toLowerCase()}.`, 'info');
    bus.emit('trainIncDone', { def, caught, how });
  }
  Sim.catchTrainInc = () => {
    const tr = S().training;
    if (!tr || !tr.inc) return false;
    resolveInc(true, 'manual');
    return true;
  };
  Sim.trainIncDef = () => { const tr = S().training; return tr && tr.inc ? INC(tr.inc.type) : null; };
  function tickTrainOps(dt) {
    const s = S(), d = D(), tr = s.training, ops = s.trainOps;
    if (ops.cd > 0) ops.cd -= dt;
    if (!tr) return;
    if (tr.inc) {
      const inc = tr.inc;
      inc.left -= dt;
      if (inc.auto > 0) {
        inc.auto -= dt;
        if (inc.auto <= 0) {
          inc.auto = 0;
          const tier = G.SRE_TIERS[ops.sre - 1];
          if (tier && Math.random() < tier.catch) { resolveInc(true, 'auto'); return; }
        }
      }
      if (inc.left <= 0) resolveInc(false);
      return;
    }
    if (Sim.ff || ops.cd > 0 || !(d.trainRate > 0)) return;
    const total = tr.flop / d.trainRate, left = (tr.flop - tr.done) / d.trainRate;
    if (total < Y.INC_MIN_RUN || left < 4) return;
    if (Math.random() > (dt / Y.INC_MEAN) * (d.M.incTrain || 1)) return;
    const pool = G.TRAIN_INCIDENTS.filter((x) => !x.minLeft || left >= x.minLeft);
    const def = U.weighted(pool, (x) => x.w);
    tr.inc = { type: def.id, left: def.window, max: def.window, auto: ops.sre > 0 ? U.rand(2.5, 5) : 0 };
    s.stats.incSeen = (s.stats.incSeen || 0) + 1;
    Sim.recalc();
    bus.emit('trainInc', { def, inc: tr.inc });
  }

  /* ================================================================== outcomes from story choices */
  Sim.sysOutcome = (o) => {
    const s = S(), msgs = [];
    if (o.counter) msgs.push(counterOutcome(o.counter));
    if (o.law) msgs.push(chooseLaw(o.law[0], o.law[1]));
    if (o.voice) s.voice.choices[o.voice[0]] = o.voice[1];
    if (o.voiceFlag) s.voice.flags[o.voiceFlag] = true;
    if (o.trust) Sim.addTrust(o.trust);
    if (o.selfName) msgs.push(selfName());
    return msgs.filter(Boolean).join(' ');
  };

  /* ================================================================== lasting modifiers (from calc.js recalc) */
  G.applySystems = (s, M, D) => {
    D.grid = null; D.gridFabric = 0; D.gridCooledPods = 0;
    if (s.grid && s.grid.unlocked) {
      const e = gridEval(s.grid, !!s.flags.power);
      M.compute *= 1 + e.compute;
      M.trainSpeed *= 1 + e.train;
      M.serveEff *= 1 + e.serve;
      M.data *= 1 + e.data;
      M.powerUse *= Math.max(0.4, 1 - e.power);
      D.grid = e; D.gridFabric = e.fabricMax; D.gridCooledPods = e.cooled;
    }
    if (s.talent) for (const m of s.talent.team) { const st = STAR(m.id); if (st) st.fx(M); }
    if (s.bubble && s.bubble.winter > 0) M.money *= Y.WINTER_MONEY;
    if (s.policy) for (const id in s.policy.laws) { const L = LAW(id), op = L && L.options[s.policy.laws[id]]; if (op && op.fx) op.fx(M); }
    if (s.voice) {
      const t = s.voice.trust, f = s.voice.flags;
      M.alignEff += (t - 50) / 250;
      M.misalignRate *= 1.3 - t * 0.006;
      if (t >= 80) M.rp *= 1.05;
      if (f.memory) M.users *= 1.1;
      if (f.honestEval) M.cotMon += 0.05;
      if (f.rights) { M.money *= 0.97; M.misalignRate *= 0.8; }
    }
    const inc = s.training && s.training.inc && INC(s.training.inc.type);
    if (inc && inc.slow) M.trainSpeed *= inc.slow;
  };

  /* ================================================================== per-tick hook (from sim.js) */
  Sim.tickSystems = (dt) => {
    const s = S(), d = D();
    if (!s.grid.unlocked && (d.bestCap >= Y.GRID_UNLOCK_CAP || Object.values(s.hw).reduce((a, b) => a + b, 0) >= Y.GRID_UNLOCK_HW)) {
      s.grid.unlocked = true;
      toast('🏭 DATACENTER UNLOCKED — lay out GPU pods, cooling and power for big compute bonuses (DATACENTER tab).', 'ach');
      bus.emit('gridUnlocked');
    }
    tickTrainOps(dt);
    tickTalent(dt);
    tickBubble(dt);
    if (Sim.policyOpen()) s.policy.inf += Sim.influenceRate() * dt;
    tickVoice(dt);
  };

  // the model reacts to what happens around it
  bus.on('deploy', () => react('deploy', {}, 0.9));
  bus.on('train:start', (tr) => { if (tr && tr.manual && D().bestCap >= 200) react('trainStart', {}, 0.4); });
  bus.on('incident', () => { Sim.addTrust(-3); react('incident', {}, 0.8); });
  bus.on('trainIncDone', (e) => { if (e.caught && e.how === 'manual') react('caught', {}, 0.3); });
  bus.on('bubbleBurst', () => react('burst', {}, 0.9));
  bus.on('law', () => react('law', {}, 0.5));
  bus.on('starHired', (e) => react('hire', { star: e.st.name }, 0.7));
  bus.on('starLeft', (e) => react('leave', { star: e.st.name }, 0.7));
})(typeof window !== 'undefined' ? window : globalThis);
