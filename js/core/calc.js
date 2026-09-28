/* Derived-state calculation: modifiers (M) and all rates (D). Pure function of state. */
(function (root) {
  'use strict';
  const G = root.G;
  const U = G.U;

  const MULT_KEYS = ['compute', 'money', 'rp', 'ap', 'data', 'users', 'arpu', 'click', 'vibeGain', 'dropRate', 'trainSpeed', 'serveEff', 'strawberry', 'bl', 'rdMult'];

  function baseM() {
    const B = G.BAL;
    return {
      compute: 1, money: 1, rp: 1, ap: 1, data: 1, click: 1, clickPct: 0.05, vibeGain: 1, vibeLoss: 1, vibeFloor: 0, releaseVibe: 1,
      users: 1, arpu: 1, popCap: 1, serveEff: 1, trainSpeed: 1, mfu: 0, activeFrac: 1,
      kN: 1, kD: 1, arch: 0.35, capFlat: 0, ttcSkill: 0, tttSkill: 0, agentCap: 0, swarmSkill: 0, rlBonus: 0, smallModelBonus: 0,
      hwCost: 1, resCost: 1, safeCost: 1, dataCost: 1, powerCost: 1, powerCap: 1, powerUse: 1,
      dropRate: 1, packLuck: 0, strawberry: 1, bl: 1, rdMult: 1, offlineHours: B.OFFLINE_BASE_HOURS, offlineEff: B.OFFLINE_BASE_EFF,
      cotMon: 0, alignEff: 0, incidentRate: 1, evalAwareRes: 0, security: 0, humanPool: 3e14,
      maxEffort: 0, autoRP: 1, enterprise: false,
      hw: {}, res: {}, safety: {}, src: {}, pow: {},
      cost_cai: 1, cost_chat: 1, cosReplicate: 1, cosEff: 1, cosEnergy: 1,
    };
  }

  function cardLevel(n) {
    if (!n) return 0;
    return Math.min(10, 1 + Math.floor(Math.log2(n)));
  }
  /** copies needed for next level */
  function cardNext(n) {
    const l = cardLevel(n);
    return l >= 10 ? Infinity : Math.pow(2, l);
  }

  function applyBonusSums(M, sums) {
    for (const k in sums) {
      const v = sums[k];
      switch (k) {
        case 'hwCost': M.hwCost *= Math.max(0.25, 1 - v); break;
        case 'resCost': M.resCost *= Math.max(0.25, 1 - v); break;
        case 'vibeFloor': M.vibeFloor += v; break;
        case 'capFlat': M.capFlat += v; break;
        case 'ttcSkill': M.ttcSkill += v; break;
        case 'packLuck': M.packLuck += v; break;
        case 'cotMon': M.cotMon += v; break;
        case 'mfu': M.mfu += v; break;
        case 'offline': M.offlineEff += v; break;
        case 'all': M.compute *= 1 + v; M.money *= 1 + v; M.rp *= 1 + v; break;
        default:
          if (M[k] !== undefined) M[k] *= 1 + v;
      }
    }
  }

  /* ------------------------------------------------------------ scaling law */
  function lossR(N, D, kN, kD) {
    const B = G.BAL;
    return B.A / Math.pow(Math.max(1, N * kN), B.alpha) + B.B / Math.pow(Math.max(1, D * kD), B.beta);
  }
  function capFromR(R) {
    return G.BAL.CAP_K * Math.log10(G.BAL.CAP_R0 / R);
  }
  /** capability from pretraining; architecture compresses gains above 30 (LSTMs plateau) */
  function capPre(N, D, kN, kD, arch) {
    const c = capFromR(lossR(N, D, kN, kD));
    if (c <= 30 || arch >= 1) return c;
    return 30 + (c - 30) * arch;
  }
  /** loss-optimal (N, D) for compute C (FLOP), with D <= maxD */
  function optimalND(C, maxD, kN, kD) {
    const B = G.BAL;
    const a = B.alpha, b = B.beta;
    const g = Math.pow((a * B.A) / (b * B.B), 1 / (a + b));
    const X = (C * kN * kD) / 6;
    let Np = g * Math.pow(X, b / (a + b));
    let Dp = Math.pow(X, a / (a + b)) / g;
    let N = Np / kN, Dt = Dp / kD;
    if (maxD && Dt > maxD) {
      // data-limited: spend the compute on a bigger model, but not absurdly bigger than the data (>= 0.2 tokens/param)
      Dt = maxD;
      N = Math.min(C / (6 * Dt), Dt * 5);
    }
    N = Math.max(B.MIN_PARAMS, N);
    Dt = Math.max(B.MIN_TOKENS, Math.min(Dt, maxD || Dt));
    return { N, D: Dt };
  }

  function isUnlocked(s, D, req) {
    if (!req) return true;
    if (req.cap !== undefined && D.bestCap < req.cap) return false;
    if (req.research && !s.research[req.research]) return false;
    if (req.product && !s.products[req.product]) return false;
    if (req.asi && !s.flags.asi) return false;
    return true;
  }

  /* ------------------------------------------------------------ recalc */
  function recalc(s) {
    const B = G.BAL;
    const M = baseM();
    const D = { M };
    const lab = G.LABS[s.lab] || G.LABS.anthropic;
    lab.apply(M);

    for (const r of G.RESEARCH) if (s.research[r.id]) r.eff(M);
    for (const r of G.REPEATABLE) {
      const l = s.repeat[r.id] || 0;
      if (l) r.eff(M, l);
    }
    for (const u of G.BUILDING_UPGRADES) {
      if (s.upgrades[u.id]) {
        const tbl = M[u.kind];
        tbl[u.target] = (tbl[u.target] || 1) * u.mult;
      }
    }
    for (const p of G.PRODUCTS) if (s.products[p.id]) p.eff(M);

    // cards & sets
    const sums = {};
    let setsDone = 0;
    for (const id in s.cards) {
      const c = G.CARD[id];
      if (!c) continue;
      sums[c.b] = (sums[c.b] || 0) + c.v * cardLevel(s.cards[id]);
    }
    for (const set of G.CARD_SETS) {
      if (set.cards.every((id) => s.cards[id])) {
        setsDone++;
        sums[set.bonus] = (sums[set.bonus] || 0) + set.v;
      }
    }
    D.setsDone = setsDone;
    applyBonusSums(M, sums);

    // lessons (prestige)
    for (const l of G.LESSONS) {
      const lv = s.prestige.lessons[l.id] || 0;
      if (lv) l.eff(M, lv);
    }
    const blMult = Math.pow(1 + B.BL_BONUS * s.prestige.totalBL, B.BL_EXP);
    M.compute *= blMult;
    M.money *= blMult;
    M.rp *= blMult;
    M.ap *= Math.sqrt(blMult);
    D.blMult = blMult;
    // omega
    const om = Math.pow(1 + s.omega.total, 0.8);
    M.compute *= om; M.money *= om; M.rp *= om; M.ap *= om; M.data *= om;
    M.bl *= 1 + s.omega.total * 0.25;
    D.omegaMult = om;
    // achievements
    const achN = Object.keys(s.achievements).length;
    const am = 1 + 0.01 * achN;
    M.compute *= am; M.money *= am; M.rp *= am;
    D.achMult = am;
    // story flags
    if (s.flags.race) M.rdMult *= 2;
    if (s.flags.slowdown) M.ap *= 3;
    if (s.flags.englishCoT) M.cotMon += 0.15;
    if (s.flags.goldengate) M.vibeFloor += 0;
    // buffs
    D.frenzy = 1;
    for (const b of s.buffs) {
      for (const k of ['compute', 'money', 'rp', 'ap', 'users', 'click', 'data', 'hwCost', 'trainSpeed', 'vibeGain']) if (b[k]) M[k] *= b[k];
    }
    M.vibeFloor = Math.min(70, M.vibeFloor);
    M.mfu = Math.min(B.MAX_MFU - B.BASE_MFU, M.mfu);

    /* ---------------- best capability (this run) */
    const model = s.deployed >= 0 ? s.models[s.deployed] : null;
    D.model = model;

    /* ---------------- compute & power */
    let raw = 0, use = 0;
    D.hwFlops = {};
    for (const h of G.HARDWARE) {
      const n = s.hw[h.id] || 0;
      if (!n) continue;
      const f = n * h.flops * (M.hw[h.id] || 1);
      D.hwFlops[h.id] = f;
      raw += f;
      use += n * h.watts;
    }
    use *= M.powerUse;
    let pcap = s.flags.powerBase || 0;
    for (const p of G.POWER) {
      const n = s.power[p.id] || 0;
      if (n) pcap += n * p.watts * (M.pow[p.id] || 1);
    }
    pcap *= M.powerCap;
    D.powerUse = use;
    D.powerCap = pcap;
    D.throttle = !s.flags.power || use <= pcap ? 1 : Math.max(0.02, pcap / use);
    D.computeRaw = raw;
    D.cosmicCompute = 0;
    if (s.cosmos) {
      const c = s.cosmos;
      D.cosmicCompute = c.energy * G.COSMOS.BASE_EFF * M.cosEff * (c.alloc.compute || 0) * 1e-3;
    }
    D.compute = raw * M.compute * D.throttle + D.cosmicCompute * M.compute;
    D.mfu = Math.min(B.MAX_MFU, B.BASE_MFU + M.mfu);

    /* ---------------- capability */
    D.effort = Math.min(s.effort, M.maxEffort);
    D.effortMult = G.EFFORTS[D.effort].mult;
    D.effortServe = Math.pow(D.effortMult, 0.55);
    if (model) {
      D.capPre = model.capPre + (model.N < 3e10 ? M.smallModelBonus : 0);
      D.capRL = model.rlBonus || 0;
      D.capTTC = B.TTC_K * M.ttcSkill * Math.log2(D.effortMult);
      D.capTTT = M.tttSkill * Math.log10(1 + (s.lastUsers || 0) / 1e8);
      D.capAgents = M.agentCap + M.swarmSkill * Math.log10(1 + (s.lastAgents || 0) / 1e3);
      D.capFlat = M.capFlat;
      D.cap = D.capPre + D.capRL + D.capTTC + D.capTTT + D.capAgents + D.capFlat;
    } else {
      D.capPre = D.capRL = D.capTTC = D.capTTT = D.capAgents = D.capFlat = 0;
      D.cap = 0;
    }
    D.bestCap = Math.max(s.run.maxCap || 0, D.cap);

    /* ---------------- vibes & rank */
    D.vibeMult = Math.pow(2, s.vibe / 100);
    let rank = 1;
    D.rivalCap = {};
    for (const id in s.rivals) {
      D.rivalCap[id] = s.rivals[id].cap;
      if (s.rivals[id].cap > D.cap) rank++;
    }
    D.rank = rank;
    D.rankMult = [1.6, 1.25, 1.05, 0.95, 0.85, 0.8, 0.75, 0.7, 0.65][Math.min(8, rank - 1)];

    /* ---------------- market */
    const Nact = model ? model.N * M.activeFrac : 1;
    D.Nact = Nact;
    D.costPerUser = (Nact * D.effortServe) / (B.SERVE_K * M.serveEff);
    const ec = econCap(D.cap);
    D.econCap = ec;
    const usersRaw = model ? B.USERS0 * Math.pow(10, ec / B.USERS_DECADE) * M.users * D.vibeMult * D.rankMult : 0;
    D.popCap = B.POP * M.popCap;
    D.usersDemand = usersRaw / (1 + usersRaw / D.popCap);
    D.serveNeed = D.compute > 0 ? (D.usersDemand * D.costPerUser) / D.compute : 0;

    /* ---------------- allocation */
    const hasResearch = !!s.research.computer;
    const hasAlign = !!s.research.oversight;
    let ar = hasResearch ? U.clamp(s.alloc.research, 0, 0.9) : 0;
    let aa = hasAlign ? U.clamp(s.alloc.align, 0, 0.9) : 0;
    if (ar + aa > 0.9) {
      const k = 0.9 / (ar + aa);
      ar *= k;
      aa *= k;
    }
    const rest = 1 - ar - aa;
    let as;
    if (!model) as = 0;
    else if (s.autoAlloc) as = Math.min(D.serveNeed * 1.03, rest * 0.8);
    else as = Math.min(rest, U.clamp(s.alloc.serve, 0, 1));
    const at = Math.max(0, rest - as);
    D.alloc = { train: at, serve: as, research: ar, align: aa };
    D.serveFlops = D.compute * as;
    D.researchFlops = D.compute * ar;
    D.alignFlops = D.compute * aa;
    D.trainRate = D.compute * at * D.mfu * B.TIME_SCALE * M.trainSpeed;

    D.usersCap = D.costPerUser > 0 ? D.serveFlops / D.costPerUser : 0;
    D.users = Math.min(D.usersDemand, D.usersCap);
    D.arpu = B.ARPU0 * Math.pow(10, ec / B.ARPU_DECADE) * M.arpu;
    D.safetyPreview = s._lastSafety || 1;
    if (M.enterprise) D.arpu *= 1 + 0.6 * Math.min(2, D.safetyPreview);
    D.grant = 0.3 * M.money;
    D.revenue = D.users * D.arpu * M.money + D.grant;

    /* ---------------- research */
    D.rdMult = U.logInterp(B.RD_POINTS, ec) * M.rdMult;
    let rph = 0;
    for (const r of G.RESEARCHERS) {
      const n = s.res[r.id] || 0;
      if (n) rph += n * r.rp * (M.res[r.id] || 1);
    }
    D.rpHuman = rph * M.rp * D.rdMult;
    const agentCost = (Nact * B.AGENT_COST * D.effortServe) / M.serveEff;
    D.agentCopies = hasResearch && agentCost > 0 ? D.researchFlops / agentCost : 0;
    const perAgent = B.AGENT_RP0 * Math.pow(10, (ec - 250) / B.AGENT_DECADE) * M.autoRP;
    D.rpAuto = D.agentCopies * perAgent * M.rp;
    D.rpRate = D.rpHuman + D.rpAuto;
    D.rdEffective = rph > 0 ? D.rpRate / (rph * M.rp) : D.rdMult;

    /* ---------------- alignment */
    let aph = 0;
    for (const r of G.SAFETY) {
      const n = s.safety[r.id] || 0;
      if (n) aph += n * r.ap * (M.safety[r.id] || 1);
    }
    D.alignCopies = hasAlign && agentCost > 0 ? D.alignFlops / agentCost : 0;
    D.apHuman = aph * M.ap * Math.sqrt(D.rdMult);
    D.apAuto = D.alignCopies * perAgent * M.ap;
    D.apRate = D.apHuman + D.apAuto;
    D.alignScore = B.ALIGN_K * Math.log10(1 + s.ap) * (1 + M.alignEff);
    D.alignReq = Math.max(0, D.cap - B.ALIGN_CAP_START) * 1.0;
    D.cotMon = U.clamp(1 + M.cotMon - 0.55 * U.sigmoid((D.cap - 380) / 35), 0.05, 1.5);
    D.evalAware = U.sigmoid((D.cap - 330) / 35) * Math.max(0, 1 - M.evalAwareRes);
    D.alignEffective = D.alignScore * (0.4 + 0.6 * Math.min(1, D.cotMon)) * (1 - 0.45 * D.evalAware);
    D.safety = D.alignReq <= 0 ? 3 : Math.min(3, D.alignEffective / D.alignReq);
    D.revealMisalign = !!s.research.organisms;
    D.security = M.security;

    /* ---------------- data */
    let tps = 0, htps = 0;
    const wall = s.humanTokens >= M.humanPool;
    D.humanPool = M.humanPool;
    D.dataWall = wall;
    for (const src of G.DATASRC) {
      const n = s.src[src.id] || 0;
      if (!n) continue;
      const t = n * src.tps * (M.src[src.id] || 1) * M.data * (src.quality || 1);
      if (src.human) {
        if (!wall) {
          htps += t;
          tps += t;
        }
      } else tps += t;
    }
    D.tokenRate = tps;
    D.humanTokenRate = htps;

    /* ---------------- click */
    D.clickValue = (1 + D.revenue * M.clickPct) * M.click;
    D.dropInterval = 1 / M.dropRate;

    /* ---------------- era/date */
    D.era = eraFor(s, D);
    D.date = dateFor(D.bestCap);

    /* ---------------- misc */
    D.blGain = blGain(s, D);
    D.kard = s.cosmos ? G.KARDASHEV(s.cosmos.energy) : G.KARDASHEV(Math.max(D.powerUse, 1e3));
    return D;
  }

  /** capability as seen by the economy: full slope up to ECON_KNEE, then ECON_SLOPE, then logarithmic past ECON_SOFT */
  function econCap(c) {
    const B = G.BAL;
    if (c <= B.ECON_KNEE) return c;
    const k2 = B.ECON_KNEE + (B.ECON_SOFT - B.ECON_KNEE) * B.ECON_SLOPE;
    if (c <= B.ECON_SOFT) return B.ECON_KNEE + (c - B.ECON_KNEE) * B.ECON_SLOPE;
    return k2 + 80 * B.ECON_SLOPE * Math.log(1 + (c - B.ECON_SOFT) / 80);
  }

  function eraFor(s, D) {
    if (s.cosmos) {
      if (s.cosmos.stars >= 1000) return 7;
      if (s.cosmos.energy >= 1e21) return 6;
      return 5;
    }
    let e = 0;
    for (const era of G.ERAS) if (D.bestCap >= era.cap) e = era.id;
    return Math.min(e, s.flags.asi ? 5 : 4);
  }
  function dateFor(cap) {
    const ms = G.MILESTONES;
    if (cap <= ms[0].cap) return ms[0].date;
    for (let i = 1; i < ms.length; i++) {
      if (cap < ms[i].cap) {
        const a = ms[i - 1], b = ms[i];
        return U.lerp(a.date, b.date, (cap - a.cap) / (b.cap - a.cap));
      }
    }
    return ms[ms.length - 1].date + (cap - ms[ms.length - 1].cap) * 2;
  }

  function blGain(s, D) {
    const B = G.BAL;
    const c = Math.max(s.run.maxCap || 0, D ? D.cap : 0);
    if (c < B.BL_BASE + B.BL_DIV) return 0;
    return Math.floor(Math.pow((c - B.BL_BASE) / B.BL_DIV, B.BL_POW) * (D ? D.M.bl : 1));
  }

  G.Calc = { econCap, baseM, recalc, cardLevel, cardNext, lossR, capFromR, capPre, optimalND, isUnlocked, blGain, dateFor, MULT_KEYS };
})(typeof window !== 'undefined' ? window : globalThis);
