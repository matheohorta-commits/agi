/* Game state: creation, persistence (localStorage + export/import), migration, prestige resets. */
(function (root) {
  'use strict';
  const G = root.G;
  const SAVE_KEY = 'ftagi.idle.save.v2';

  function newStats() {
    return {
      totalMoney: 0, clicks: 0, runs: 0, maxRunFlop: 0, drops: 0, packsOpened: 0, rarityPulls: [0, 0, 0, 0, 0],
      miniWins: 0, miniById: {}, rank1Streak: 0, playTime: 0, maxHwOwned: 0, efficientModel: false, asiCount: 0,
      chinchillaRun: false, overtrained: false, undertrained: false, strawberryDrops: 0, longestOffline: 0,
      bestCapEver: 0, incidents: 0,
    };
  }

  G.newState = function (labId, carry) {
    const s = {
      v: G.BAL.VERSION,
      lab: labId || 'anthropic',
      created: Date.now(),
      lastSeen: Date.now(),
      money: 0,
      tokens: 2e6, // a small starter corpus
      humanTokens: 2e6,
      rp: 0,
      ap: 0,
      vibe: 0,
      misalign: 0,
      hw: { gtx580: 1 },
      power: {},
      res: {},
      safety: {},
      src: {},
      upgrades: {},
      research: {},
      repeat: {},
      products: {},
      models: [],
      deployed: -1,
      bestN: 0,
      training: null,
      // auto: auto-size runs to the best ~N-second run (0 = manual sliders)
      trainCfg: { N: 3e5, D: 2e6, rl: false, autoDeploy: true, eta: 20, auto: 15 },
      auto: { hw: false, src: false, power: false, train: false, research: false, hire: false, trainEta: 60, deploy: true },
      alloc: { train: 1, serve: 1, research: 0.25, align: 0.1 },
      autoAlloc: true,
      effort: 0,
      buffs: [],
      cds: {},
      drops: [],
      mini: null,
      rivals: {},
      date: 2012.7,
      milestones: {},
      story: {},
      storyCd: {},
      storyQueue: [],
      achievements: {},
      objectives: {},
      cards: {},
      packs: { basic: 0, premium: 0, epic: 0, legendary: 0 },
      strawberries: 0,
      flags: {},
      ending: null,
      feed: [],
      run: { time: 0, maxCap: 0, lastRelease: 0 },
      stats: newStats(),
      prestige: { count: 0, totalBL: 0, bank: 0, lessons: {} },
      omega: { count: 0, total: 0, bank: 0 },
      labsUnlocked: { anthropic: true, openai: true },
      cosmos: null,
      challenge: null,
      challengesDone: {},
      settings: { sfx: 0.7, music: 0.45, notation: 'short', skipPackAnim: false, reduceFx: false, autosave: true, showTips: true },
      nextDrop: 35,
      nextMini: 75,
      nextFeed: 6,
      lastUsers: 0,
    };
    const lab = G.LABS[s.lab];
    if (lab && lab.start) {
      if (lab.start.hw) for (const k in lab.start.hw) s.hw[k] = (s.hw[k] || 0) + lab.start.hw[k];
      if (lab.start.res) for (const k in lab.start.res) s.res[k] = (s.res[k] || 0) + lab.start.res[k];
      if (lab.start.safety) for (const k in lab.start.safety) s.safety[k] = (s.safety[k] || 0) + lab.start.safety[k];
    }
    if (carry) carryOver(s, carry);
    if (lab && lab.start && lab.start.cards) for (const k in lab.start.cards) if (!s.cards[k]) s.cards[k] = 1;
    return s;
  };

  /* persistent fields survive a Bitter Lesson prestige */
  function carryOver(s, old) {
    s.created = old.created;
    s.cards = old.cards;
    s.packs = old.packs;
    s.strawberries = old.strawberries;
    s.achievements = old.achievements;
    s.objectives = old.objectives;
    s.stats = Object.assign(newStats(), old.stats);
    s.stats.rank1Streak = 0;
    s.prestige = old.prestige;
    s.omega = old.omega;
    s.labsUnlocked = old.labsUnlocked;
    s.challenge = old.challenge || null;
    s.challengesDone = old.challengesDone || {};
    s.settings = old.settings;
    s.story = {};
    // keep one-shot lore events seen, so the player isn't re-asked every run? We re-ask: choices matter per run.
    s.flags = { tutorialDone: old.flags.tutorialDone, seenIntro: true };
    s.feed = old.feed.slice(0, 20);
    s.alloc = old.alloc;
    s.autoAlloc = old.autoAlloc;
    s.auto = old.auto;
    s.trainCfg.autoDeploy = old.trainCfg ? old.trainCfg.autoDeploy : true;
    if (old.trainCfg && old.trainCfg.auto !== undefined) s.trainCfg.auto = old.trainCfg.auto;
  }

  /* ------------------------------------------------------------------ save repair
   * Opened from disk (file://), every local HTML page shares one localStorage, so a save can be damaged or
   * overwritten by something else. A loaded save is never trusted: every field must have the type the game
   * expects, or it is reset (and reported) instead of crashing training / the UI later. */
  const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
  // objects with a fixed set of keys (repaired recursively); everything else is a free-form map
  const SHAPED = new Set(['stats', 'settings', 'auto', 'trainCfg', 'alloc', 'run', 'prestige', 'omega', 'packs']);
  const NUM_MAPS = ['hw', 'power', 'res', 'safety', 'src', 'repeat', 'cards', 'packs', 'storyCd', 'cds']; // id → count/level/time
  const NULLABLE = { training: 'object', mini: 'object', cosmos: 'object', challenge: 'object', ending: 'string' };
  const finite = (x) => typeof x === 'number' && isFinite(x);
  function repairShape(s, fresh, path, fixed) {
    for (const k in fresh) {
      const want = fresh[k], have = s[k];
      if (have === undefined) { s[k] = want; continue; }
      if (want === null) continue;
      if (typeOf(want) !== typeOf(have) || (typeof want === 'number' && !isFinite(have))) { fixed.push(path + k); s[k] = want; continue; }
      if (SHAPED.has(path + k)) repairShape(have, want, path + k + '.', fixed);
    }
  }
  function repair(s) {
    const fixed = [];
    if (typeOf(s) !== 'object') return null;
    if (!G.LABS[s.lab]) { if (s.lab !== undefined) fixed.push('lab'); s.lab = 'anthropic'; }
    const fresh = G.newState(s.lab);
    repairShape(s, fresh, '', fixed);
    for (const k in NULLABLE) if (s[k] !== null && typeOf(s[k]) !== NULLABLE[k]) { fixed.push(k); s[k] = null; }
    for (const k of NUM_MAPS) for (const id in s[k]) if (!finite(s[k][id])) { fixed.push(k + '.' + id); delete s[k][id]; }
    // models: keep only well-formed ones, and a valid live one
    const okModel = (m) => typeOf(m) === 'object' && typeof m.name === 'string' && finite(m.N) && finite(m.D) && finite(m.capPre) && finite(m.loss);
    const before = s.models.length;
    s.models = s.models.filter(okModel).slice(-40);
    if (s.models.length !== before) fixed.push('models');
    s.models.forEach((m, i) => { m.id = i; if (!finite(m.rlBonus)) m.rlBonus = 0; if (!finite(m.flop)) m.flop = 6 * m.N * m.D; });
    if (!(Number.isInteger(s.deployed) && s.deployed >= -1 && s.deployed < s.models.length)) {
      fixed.push('deployed');
      s.deployed = s.models.reduce((b, m, i) => (b < 0 || m.capPre > s.models[b].capPre ? i : b), -1);
    }
    const tr = s.training;
    if (tr && !(finite(tr.N) && finite(tr.D) && finite(tr.flop) && tr.flop > 0 && finite(tr.done) && finite(tr.capPre) && finite(tr.kN) && finite(tr.kD) && finite(tr.arch))) { fixed.push('training'); s.training = null; }
    for (const k of ['buffs', 'feed']) { const n = s[k].length; s[k] = s[k].filter((x) => typeOf(x) === 'object'); if (s[k].length !== n) fixed.push(k); }
    s.storyQueue = s.storyQueue.filter((id) => typeof id === 'string');
    for (const id in s.prestige.lessons) if (!finite(s.prestige.lessons[id])) { fixed.push('prestige.lessons.' + id); delete s.prestige.lessons[id]; }
    if (s.challenge && !(G.CHALLENGES || []).some((c) => c.id === s.challenge.id)) { fixed.push('challenge'); s.challenge = null; }
    // rivals are regenerated by Sim.set() when empty
    if (Object.values(s.rivals).some((r) => typeOf(r) !== 'object' || !finite(r.cap) || !finite(r.next))) { fixed.push('rivals'); s.rivals = {}; }
    if (fixed.length) console.warn('[FEEL THE AGI] repaired save fields:', fixed.join(', '));
    s._repaired = fixed;
    return s;
  }

  const LEGACY_KEY = 'feel-the-agi-save-v1'; // generic name other local pages could also use
  const IMPORTED_FLAG = 'ftagi.idle.legacyImported';
  G.Save = {
    key: SAVE_KEY,
    repair,
    serialize(s) {
      s.lastSeen = Date.now();
      return JSON.stringify(s, (k, v) => (k === '_repaired' ? undefined : v));
    },
    save(s) {
      try {
        localStorage.setItem(SAVE_KEY, G.Save.serialize(s));
        return true;
      } catch (e) {
        console.warn('save failed', e);
        return false;
      }
    },
    load() {
      try {
        let raw = localStorage.getItem(SAVE_KEY);
        // one-time import of a save from before the key was made unique
        if (!raw && !localStorage.getItem(IMPORTED_FLAG)) {
          raw = localStorage.getItem(LEGACY_KEY);
          localStorage.setItem(IMPORTED_FLAG, '1');
        }
        if (!raw) return null;
        return G.Save.migrate(JSON.parse(raw));
      } catch (e) {
        console.warn('load failed', e);
        return null;
      }
    },
    wipe() {
      try { localStorage.removeItem(SAVE_KEY); localStorage.setItem(IMPORTED_FLAG, '1'); } catch (e) { /* ignore */ }
    },
    exportString(s) {
      const json = G.Save.serialize(s);
      return 'FTAGI1:' + btoa(unescape(encodeURIComponent(json)));
    },
    importString(str) {
      str = str.trim();
      if (str.startsWith('FTAGI1:')) str = str.slice(7);
      const json = decodeURIComponent(escape(atob(str)));
      return G.Save.migrate(JSON.parse(json));
    },
    migrate(s) {
      // fill fields added in later versions and repair anything damaged
      s = repair(s);
      if (!s) throw new Error('not a FEEL THE AGI save');
      s.drops = [];
      s.mini = null;
      s.v = G.BAL.VERSION;
      return s;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
