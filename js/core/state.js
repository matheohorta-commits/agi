/* Game state: creation, persistence (localStorage + export/import), migration, prestige resets. */
(function (root) {
  'use strict';
  const G = root.G;
  const SAVE_KEY = 'feel-the-agi-save-v1';

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
      trainCfg: { N: 3e5, D: 2e6, rl: false, autoDeploy: true, eta: 20 },
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
    s.settings = old.settings;
    s.story = {};
    // keep one-shot lore events seen, so the player isn't re-asked every run? We re-ask: choices matter per run.
    s.flags = { tutorialDone: old.flags.tutorialDone, seenIntro: true };
    s.feed = old.feed.slice(0, 20);
    s.alloc = old.alloc;
    s.autoAlloc = old.autoAlloc;
    s.auto = old.auto;
    s.trainCfg.autoDeploy = old.trainCfg ? old.trainCfg.autoDeploy : true;
  }

  G.Save = {
    key: SAVE_KEY,
    serialize(s) {
      s.lastSeen = Date.now();
      return JSON.stringify(s);
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
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return G.Save.migrate(JSON.parse(raw));
      } catch (e) {
        console.warn('load failed', e);
        return null;
      }
    },
    wipe() {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
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
      // fill any fields added in later versions
      const fresh = G.newState(s.lab || 'anthropic');
      for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
      s.stats = Object.assign(newStats(), s.stats || {});
      s.settings = Object.assign(fresh.settings, s.settings || {});
      s.auto = Object.assign(fresh.auto, s.auto || {});
      s.trainCfg = Object.assign(fresh.trainCfg, s.trainCfg || {});
      s.packs = Object.assign(fresh.packs, s.packs || {});
      s.drops = [];
      s.mini = null;
      s.v = G.BAL.VERSION;
      return s;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
