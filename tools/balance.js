#!/usr/bin/env node
/* Headless balance simulator: plays the game with a heuristic bot and prints a pacing timeline.
 * Usage: node tools/balance.js [hours=12] [lab=anthropic] [clicksPerSec=2] [seed-free] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'js/util.js', 'js/data/balance.js', 'js/data/labs.js', 'js/data/buildings.js', 'js/data/research.js', 'js/data/products.js',
  'js/data/cards.js', 'js/data/story.js', 'js/data/feed.js', 'js/data/achievements.js', 'js/data/cosmos.js', 'js/data/objectives.js',
  'js/core/state.js', 'js/core/calc.js', 'js/core/sim.js',
];
// deterministic Math.random for reproducible runs (SEED env)
let seed = parseInt(process.env.SEED || '12345', 10) >>> 0;
const SMath = Object.create(Math);
SMath.random = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = SMath.random;
const ctx = { console, Math: SMath, Date, JSON, globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) deepMerge(a[k] = a[k] || {}, b[k]); else a[k] = b[k]; } }
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  if (f === 'js/data/balance.js' && process.env.BAL) deepMerge(ctx.G.BAL, JSON.parse(process.env.BAL));
}
const G = ctx.G;
const U = G.U;

const HOURS = parseFloat(process.argv[2] || '12');
const LAB = process.argv[3] || 'anthropic';
const CPS = parseFloat(process.argv[4] || '2');
const VERBOSE = process.argv.includes('-v');

G.Sim.set(G.newState(LAB));
let S = G.Sim.state();
let D = G.Sim.D();

const DT = 0.25;
const log = [];
const t0 = Date.now();
let simT = 0;
const firsts = {};
const capMarks = [30, 45, 65, 80, 100, 125, 150, 168, 190, 210, 230, 245, 260, 282, 300, 322, 332, 350, 380, 400, 430, 462, 500, 540, 600, 750, 1000];
const fmtT = (t) => `${(t / 3600).toFixed(2)}h`;

G.bus.on('prestige', (e) => { log.push(`${fmtT(simT)}  PRESTIGE #${S.prestige.count} +${e.gain} BL (total ${S.prestige.totalBL})`); });
G.bus.on('asi', (e) => log.push(`${fmtT(simT)}  *** ASI *** ending=${e.ending}`));
G.bus.on('story', (ev) => {
  const ch = G.Sim.storyChoices(ev);
  let idx = 0;
  if (ev.id === 'ev_oversight') idx = G.Sim.D().safety >= 1 ? 0 : 1;
  setTimeout0(() => G.Sim.choose(ev.id, idx));
});
const pending = [];
function setTimeout0(f) { pending.push(f); }
G.bus.on('project', (p) => log.push(`${fmtT(simT)}  project ${p.id}`));
G.bus.on('omega', (e) => log.push(`${fmtT(simT)}  OMEGA +${e.gain}`));
G.bus.on('datawall', () => log.push(`${fmtT(simT)}  data wall`));
G.bus.on('powerUnlocked', () => log.push(`${fmtT(simT)}  power unlocked`));

const LESSON_PRIO = ['autobuy', 'autotrain', 'capital', 'autohire', 'autoresearch', 'scale', 'money', 'research', 'memory', 'data', 'safety', 'headstart', 'rsi', 'drops', 'luck', 'offline', 'vibes', 'strawberries'];

let clickAcc = 0, decideAcc = 0, lastCapLog = 0;
function botDecide() {
  S = G.Sim.state();
  D = G.Sim.D();
  const Sim = G.Sim;
  // alloc
  S.autoAlloc = true;
  S.alloc.research = S.research.computer ? 0.3 : 0;
  S.alloc.align = S.research.oversight ? 0.1 : 0;
  // effort
  if (D.M.maxEffort > 0) {
    let best = 0, bs = -Infinity;
    for (let e = 0; e <= D.M.maxEffort; e++) {
      S.effort = e;
      const d = G.Sim.recalc();
      const sc = Math.log10(Math.max(1, d.revenue)) + d.cap / 40;
      if (sc > bs) { bs = sc; best = e; }
    }
    S.effort = best;
    G.Sim.recalc();
  }
  // products
  for (const p of G.PRODUCTS) if (!S.products[p.id] && Sim.productUnlocked(p) && Sim.productCost(p) < S.money * 0.7) Sim.buyProduct(p.id);
  // upgrades
  for (const u of G.BUILDING_UPGRADES) if (Sim.upgradeAvailable(u) && Sim.upgradeCost(u) < S.money * 0.25) Sim.buyUpgrade(u.id);
  // research
  for (let i = 0; i < 5; i++) {
    let cheapest = null, cc = Infinity;
    for (const r of G.RESEARCH) {
      if (S.research[r.id] || !Sim.researchVisible(r)) continue;
      const c = Sim.researchCost(r);
      if (c < cc) { cc = c; cheapest = r; }
    }
    if (cheapest && S.rp >= cc) { Sim.research(cheapest.id); continue; }
    let rep = null, rc = Infinity;
    for (const r of G.REPEATABLE) {
      if (!Sim.repeatVisible(r)) continue;
      const c = Sim.repeatCost(r);
      if (c < rc) { rc = c; rep = r; }
    }
    if (rep && S.rp >= rc && (!cheapest || cc > S.rp * 8)) { Sim.researchRepeat(rep.id); continue; }
    break;
  }
  // spending split
  const pick = (kind, valueFn, budgetFrac) => {
    let budget = S.money * budgetFrac;
    for (let i = 0; i < 30; i++) {
      let best = null, bv = 0;
      for (const it of Sim.KINDS[kind].list()) {
        if (!Sim.unlocked(it.req)) continue;
        if (kind === 'src' && it.human && D.dataWall) continue;
        const c = Sim.price(kind, it.id, 1);
        if (c > budget) continue;
        const v = valueFn(it) / c;
        if (v > bv) { bv = v; best = it; }
      }
      if (!best) break;
      budget -= Sim.price(kind, best.id, 1);
      Sim.buy(kind, best.id, 1);
    }
  };
  D = G.Sim.D();
  // how much data do we need?
  const need = Sim.optimalForEta(90, false);
  const dataHungry = S.tokens < need.D * 1.5;
  const safetyLow = D.cap >= 150 && D.safety < 1.25;
  const powerLow = S.flags.power && D.powerUse > D.powerCap * 0.85;
  if (powerLow) pick('power', (p) => p.watts, 0.5);
  pick('src', (x) => x.tps * (D.M.src[x.id] || 1), dataHungry ? 0.35 : 0.08);
  if (safetyLow) pick('safety', (x) => x.ap * (D.M.safety[x.id] || 1), 0.25);
  pick('res', (x) => x.rp * (D.M.res[x.id] || 1), 0.3);
  pick('hw', (x) => x.flops * (D.M.hw[x.id] || 1), 0.6);
  // training
  if (!S.training) {
    const eta = U.clamp(S.run.time * 0.04, 15, 240);
    const rl = D.M.rlBonus > 0;
    const nd = Sim.optimalForEta(eta, rl);
    const p = Sim.predict(nd.N, nd.D, rl);
    const cur = D.model ? D.model.capPre + (D.model.rlBonus || 0) : -Infinity;
    if (p.capPre + p.rlBonus > cur + 0.8) Sim.startTraining(nd.N, nd.D, rl);
  }
  // packs
  for (const k of ['legendary', 'epic', 'premium', 'basic']) while (S.packs[k] > 0) Sim.openPack(k);
  if (S.strawberries >= 20) Sim.buyPack('premium');
  // prestige
  if (!S.flags.asi && D.blGain >= Math.max(4, S.prestige.totalBL * 1.2) && S.run.time > 900) {
    Sim.prestige();
    S = G.Sim.state();
    for (let k = 0; k < 40; k++) {
      let bought = false;
      for (const id of LESSON_PRIO) if (Sim.buyLesson(id)) { bought = true; break; }
      if (!bought) break;
    }
    S.auto = { hw: true, src: true, power: true, train: false, research: false, hire: true, trainEta: 60, deploy: true };
  }
  // cosmos
  if (S.cosmos) {
    for (const p of G.MEGAPROJECTS) if (Sim.projectAvailable(p)) Sim.buyProject(p.id);
    if (Sim.omegaGain() > 0 && !S._omegaDone) { S._omegaDone = true; }
  }
}

const END = HOURS * 3600;
while (simT < END) {
  G.Sim.tick(DT);
  simT += DT;
  while (pending.length) pending.shift()();
  S = G.Sim.state();
  D = G.Sim.D();
  clickAcc += DT * (simT < 1200 ? CPS : CPS * 0.3);
  while (clickAcc >= 1) { clickAcc--; G.Sim.click(); }
  for (const d of S.drops.slice()) if (Math.random() < 0.02) G.Sim.catchDrop(d.id);
  if (S.mini && Math.random() < 0.05) G.Sim.resolveMini(Math.random() < 0.8);
  decideAcc += DT;
  if (decideAcc >= 1) { decideAcc = 0; botDecide(); }
  for (const c of capMarks) {
    if (!firsts[c] && D.bestCap >= c) {
      firsts[c] = simT;
      log.push(`${fmtT(simT)}  cap ${c}  [run ${(S.run.time / 60).toFixed(1)}m, P${S.prestige.count}] compute=${U.fmtFlops(D.compute)} $/s=${U.fmt(D.revenue)} rp/s=${U.fmt(D.rpRate)} users=${U.fmt(D.users)} tok=${U.fmt(S.tokens)} safety=${D.safety.toFixed(2)} rank=${D.rank} rd=${D.rdMult.toFixed(1)}`);
    }
  }
  if (VERBOSE && simT - lastCapLog >= 600) {
    lastCapLog = simT;
    log.push(`   ${fmtT(simT)} status: cap=${D.cap.toFixed(1)} best=${D.bestCap.toFixed(1)} $=${U.fmt(S.money)} $/s=${U.fmt(D.revenue)} comp=${U.fmtFlops(D.compute)} rp/s=${U.fmt(D.rpRate)} users=${U.fmt(D.users)}/${U.fmt(D.usersDemand)} alloc(t/s)=${D.alloc.train.toFixed(2)}/${D.alloc.serve.toFixed(2)} tok=${U.fmt(S.tokens)} res=${Object.keys(S.research).length} BL=${D.blGain} train=${S.training ? (S.training.done / S.training.flop * 100).toFixed(0) + '% of ' + U.fmtFlop(S.training.flop) : '-'} safety=${D.safety.toFixed(2)} mis=${S.misalign.toFixed(0)}${S.cosmos ? ' E=' + U.fmtWatts(S.cosmos.energy) + ' stars=' + U.fmt(S.cosmos.stars) : ''}`);
  }
}
console.log(log.join('\n'));
console.log(`\nfinal: cap=${D.cap.toFixed(1)} prestiges=${S.prestige.count} BL=${S.prestige.totalBL} cards=${Object.keys(S.cards).length}/${G.CARDS.length} achievements=${Object.keys(S.achievements).length}/${G.ACHIEVEMENTS.length} research=${Object.keys(S.research).length} (${((Date.now() - t0) / 1000).toFixed(1)}s wall)`);
