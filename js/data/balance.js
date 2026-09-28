/* Balance constants. Tweak here; tools/balance.js runs a headless bot to check pacing. */
(function (root) {
  'use strict';
  const G = root.G;
  G.BAL = {
    VERSION: 1,
    TICK: 0.05, // simulation step (s)
    TIME_SCALE: 3600, // 1 real second of compute = 1 simulated hour of training FLOPs

    /* ---- Chinchilla loss fit (Hoffmann et al. 2022): L = E + A/N^a + B/D^b */
    E: 1.69,
    A: 406.4,
    B: 410.7,
    alpha: 0.34,
    beta: 0.28,
    /* capability index = CAP_K * log10(CAP_R0 / reducibleLoss) */
    CAP_K: 100,
    CAP_R0: 20,

    /* ---- training */
    MIN_PARAMS: 1e5,
    MIN_TOKENS: 1e6,
    BASE_MFU: 0.3,
    MAX_MFU: 0.75,
    RL_COMPUTE_FRAC: 0.5, // RL post-training adds +50% to run compute when enabled

    /* ---- market */
    USERS0: 90, // users at cap 0 with no product multipliers
    USERS_DECADE: 70, // +70 capability = 10x demand
    ARPU0: 0.03, // $ per user per second
    ARPU_DECADE: 120,
    ECON_KNEE: 280, // beyond this capability, economic formulas grow at ECON_SLOPE
    ECON_SLOPE: 0.4,
    ECON_SOFT: 500, // beyond this capability, economic formulas grow logarithmically
    AGENT_COST: 2e4, // FLOP/s per active param per automated researcher copy
    AGENT_RP0: 0.02,
    AGENT_DECADE: 70,
    POP: 8e9,
    SERVE_K: 0.01, // users served per (FLOP/s / active params)

    /* ---- cost scaling knobs: cost = base * K * TIER^(index in list) */
    COST: {
      hw: { K: 30, TIER: 1.9, LATE: { from: 9, mult: 8 } },
      power: { K: 10, TIER: 1.5 },
      res: { K: 20, TIER: 1.8, LATE: { from: 7, mult: 6 } },
      safety: { K: 20, TIER: 1.8, LATE: { from: 6, mult: 6 } },
      src: { K: 20, TIER: 1.9, LATE: { from: 8, mult: 8 } },
      product: 20,
      upgrade: 1,
    },
    RC0: 20, // research cost at t=20
    RC_DECADE: 22, // research cost x10 per this much target capability
    RC_LATE: 40, // extra x10 per this much capability beyond 260
    REPEAT_SUPER: 1.15, // repeatable research cost gets an extra x1.15^(l(l-1)/2)
    TTC_K: 0.5, // capability per (reasoning skill x log2(test-time compute multiplier))

    /* ---- vibes (it's so over <-> we're so back) */
    VIBE_DECAY: 0.03,
    VIBE_CLICK: 0.35,

    /* ---- research */
    RD_POINTS: [
      [0, 1], [270, 1], [300, 1.5], [330, 3], [350, 4], [380, 10], [400, 25], [450, 50], [500, 100], [600, 300],
    ],

    /* ---- alignment */
    ALIGN_CAP_START: 160, // capability where alignment starts being required
    ALIGN_K: 30, // alignment score = ALIGN_K * log10(1 + AP)

    /* ---- drops */
    DROP_MIN: 55,
    DROP_MAX: 110,
    DROP_LIFETIME: 13,
    CRATE_CHANCE: 0.22,

    /* ---- prestige */
    PRESTIGE_MIN_CAP: 185,
    BL_BASE: 175, // Bitter Lessons = ((maxCap - BL_BASE) / BL_DIV) ^ BL_POW
    BL_DIV: 12,
    BL_POW: 2,
    BL_BONUS: 0.5, // passive multiplier = (1 + BL_BONUS * totalBL) ^ BL_EXP
    BL_EXP: 0.45,

    /* ---- offline */
    OFFLINE_BASE_HOURS: 4,
    OFFLINE_BASE_EFF: 0.5,

    /* ---- ASI */
    ASI_CAP: 500,
  };
})(typeof window !== 'undefined' ? window : globalThis);
