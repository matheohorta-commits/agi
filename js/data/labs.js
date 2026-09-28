/* Labs: the player picks one; the rest become rivals on the leaderboard.
 * Names of real companies/people are used affectionately as parody/commentary. See CREDITS. */
(function (root) {
  'use strict';
  const G = root.G;

  // naming ladders: [capThreshold, familyName]
  const L = {
    openai: [
      [0, 'Perceptron'], [70, 'char-rnn'], [98, 'GPT-1'], [125, 'GPT-2'], [168, 'GPT-3'], [188, 'GPT-3.5'], [208, 'GPT-4'],
      [226, 'GPT-4o'], [242, 'o1'], [256, 'o3'], [270, 'GPT-5'], [285, 'GPT-5.5'], [300, 'GPT-6'], [330, 'GPT-7'],
      [360, 'GPT-8'], [400, 'GPT-9'], [450, 'GPT-10'], [500, 'GPT-∞'], [600, 'GPT-Ω'],
    ],
    anthropic: [
      [0, 'Neuron'], [70, 'Clawd-rnn'], [98, 'Claude α'], [125, 'Claude β'], [168, 'Claude 0.9'], [188, 'Claude 1'],
      [205, 'Claude 2'], [218, 'Claude 3'], [230, 'Claude 3.5'], [244, 'Claude 3.7'], [256, 'Claude 4'], [270, 'Claude 4.5'],
      [285, 'Claude 5'], [300, 'Claude 6'], [330, 'Claude 7'], [360, 'Claude 8'], [400, 'Claude 9'], [450, 'Claude 10'],
      [500, 'Claude ∞'], [600, 'Claude Ω'],
    ],
    deepmind: [
      [0, 'DQN'], [70, 'AlphaGo'], [98, 'BERT'], [125, 'T5'], [168, 'Gopher'], [188, 'PaLM'], [208, 'Gemini 1'],
      [226, 'Gemini 1.5'], [242, 'Gemini 2'], [256, 'Gemini 2.5'], [270, 'Gemini 3'], [300, 'Gemini 4'], [330, 'Gemini 5'],
      [400, 'Gemini Ultra Max'], [500, 'Gemini ∞'],
    ],
    xai: [
      [0, 'Grok-0'], [168, 'Grok 1'], [208, 'Grok 2'], [242, 'Grok 3'], [262, 'Grok 4'], [285, 'Grok 5'], [320, 'Grok 6'],
      [400, 'Grok 7'], [500, 'Grok ∞'],
    ],
    meta: [
      [0, 'FAIR-net'], [125, 'OPT'], [168, 'LLaMA'], [196, 'Llama 2'], [226, 'Llama 3'], [250, 'Llama 4'], [275, 'Behemoth'],
      [320, 'Llama 5'], [400, 'Llama 6'], [500, 'Llama ∞'],
    ],
    deepseek: [
      [0, 'DeepSeek-0'], [168, 'DeepSeek LLM'], [210, 'DeepSeek-V2'], [240, 'DeepSeek-V3'], [252, 'DeepSeek-R1'],
      [275, 'DeepSeek-V4'], [300, 'DeepSeek-R2'], [340, 'DeepCent-1'], [400, 'DeepCent-2'], [500, 'DeepCent-∞'],
    ],
    ssi: [
      [0, 'SSI-proto'], [250, 'SSI-0'], [320, 'SSI-1'], [400, 'SSI-2'], [500, 'Safe Superintelligence'],
    ],
    mistral: [
      [0, 'Mistral-0'], [180, 'Mistral 7B'], [205, 'Mixtral'], [230, 'Mistral Large'], [260, 'Magistral'], [300, 'Mistral 4'],
      [400, 'Le Grand Modèle'], [500, 'Mistral ∞'],
    ],
  };

  function family(labId, cap) {
    const ladder = L[labId] || L.openai;
    let name = ladder[0][1];
    for (const [c, n] of ladder) if (cap >= c) name = n;
    return name;
  }

  G.LABS = {
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic',
      short: 'ANT',
      product: 'Claude.ai',
      color: '#d97757',
      color2: '#f0c9a8',
      logo: 'spark',
      tagline: 'Safety is the product.',
      desc: 'Founded by researchers who left to build AI that is both safe and frontier. Constitutional AI, interpretability, and a very polite model.',
      perks: ['+50% alignment research', '+25% ARPU (enterprise trust)', 'Constitutional AI costs 50% less', 'Starts with a Red Teamer'],
      apply(M) {
        M.ap *= 1.5;
        M.arpu *= 1.25;
        M.cost_cai = 0.5;
      },
      start: { safety: { redteam: 1 } },
      unlocked: true,
      modelName(cap, N, maxN) {
        const fam = family('anthropic', cap);
        if (cap < 188) return fam;
        const r = maxN > 0 ? N / maxN : 1;
        const tier = r < 0.08 ? 'Haiku' : r < 0.5 ? 'Sonnet' : 'Opus';
        return fam + ' ' + tier;
      },
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      short: 'OAI',
      product: 'ChatGPT',
      color: '#10a37f',
      color2: '#9ff0d4',
      logo: 'knot',
      tagline: 'Ship it. Feel the AGI.',
      desc: 'Started as a non-profit to make AGI benefit all of humanity. Now ships consumer products at the speed of hype.',
      perks: ['+30% users', '+30% vibe gains', 'Chat App costs 50% less', 'Starts with 2 extra GPUs'],
      apply(M) {
        M.users *= 1.3;
        M.vibeGain *= 1.3;
        M.cost_chat = 0.5;
      },
      start: { hw: { gtx580: 2 } },
      unlocked: true,
      modelName(cap, N, maxN) {
        const fam = family('openai', cap);
        if (cap < 208) return fam;
        const r = maxN > 0 ? N / maxN : 1;
        return fam + (r < 0.08 ? '-nano' : r < 0.3 ? '-mini' : r >= 0.95 && cap >= 270 ? ' Pro' : '');
      },
    },
    deepmind: {
      id: 'deepmind',
      name: 'Google DeepMind',
      short: 'GDM',
      product: 'Gemini',
      color: '#4c8df6',
      color2: '#b7d1ff',
      logo: 'gem',
      tagline: 'Solve intelligence, then everything else.',
      desc: 'AlphaGo, AlphaFold, a Nobel prize and more TPUs than anyone. Research-first.',
      perks: ['+40% research points', 'TPU v3 boards are 5× stronger', '+20% data'],
      apply(M) {
        M.rp *= 1.4;
        M.data *= 1.2;
        M.hw.tpuv3 = (M.hw.tpuv3 || 1) * 5;
      },
      start: { res: { grad: 1 } },
      unlocked: false,
      unlockText: 'Earn 25 total Bitter Lessons',
      unlockCond: (s) => s.prestige.totalBL >= 25,
      modelName(cap) { return family('deepmind', cap); },
    },
    xai: {
      id: 'xai',
      name: 'xAI',
      short: 'xAI',
      product: 'Grok',
      color: '#e8e8e8',
      color2: '#888888',
      logo: 'x',
      tagline: 'Built a supercomputer in 122 days.',
      desc: 'Move fast, build Colossus, post through it. Maximal compute, spicy vibes.',
      perks: ['+30% compute', 'Hardware 15% cheaper', 'Vibes swing twice as hard (both ways)'],
      apply(M) {
        M.compute *= 1.3;
        M.hwCost *= 0.85;
        M.vibeGain *= 2;
        M.vibeLoss *= 2;
      },
      start: { hw: { gtx1080: 1 } },
      unlocked: false,
      unlockText: 'Own 100 of any one hardware in a single run',
      unlockCond: (s) => s.stats.maxHwOwned >= 100,
      modelName(cap) { return family('xai', cap); },
    },
    meta: {
      id: 'meta',
      name: 'Meta AI',
      short: 'META',
      product: 'Meta AI',
      color: '#0a7cff',
      color2: '#8fc3ff',
      logo: 'infinity',
      tagline: 'Open weights for everyone. Also $100M offers.',
      desc: 'Open-source the models, poach the researchers, own the social graph.',
      perks: ['+50% data', 'Researchers 25% cheaper', '+20% users (3B people already use our apps)'],
      apply(M) {
        M.data *= 1.5;
        M.resCost *= 0.75;
        M.users *= 1.2;
      },
      unlocked: false,
      unlockText: 'Collect 40 different cards',
      unlockCond: (s) => Object.keys(s.cards).length >= 40,
      modelName(cap) { return family('meta', cap); },
    },
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      short: 'DS',
      product: 'DeepSeek Chat',
      color: '#4d6bfe',
      color2: '#a9b8ff',
      logo: 'whale',
      tagline: 'Frontier at 1/10th the cost.',
      desc: 'A quant fund side-project that crashed NVIDIA stock by 17% in a day. Ruthless efficiency, export-controlled GPUs.',
      perks: ['+15% MFU', 'Training 40% faster', 'Hardware 30% more expensive (export controls)'],
      apply(M) {
        M.mfu += 0.15;
        M.trainSpeed *= 1.4;
        M.hwCost *= 1.3;
      },
      unlocked: false,
      unlockText: 'Reach capability 260 with a model under 100B params',
      unlockCond: (s) => s.stats.efficientModel,
      modelName(cap) { return family('deepseek', cap); },
    },
    ssi: {
      id: 'ssi',
      name: 'Safe Superintelligence Inc.',
      short: 'SSI',
      product: '(no product)',
      color: '#b8b8c8',
      color2: '#ffffff',
      logo: 'eye',
      tagline: 'Straight shot. One product: superintelligence.',
      desc: 'No products, no distractions. Investors fund you on vibes alone. Challenge lab.',
      perks: ['Revenue ×0.25 (no products — investor money only)', 'Research ×3', 'Alignment ×2', 'Starts with Ilya'],
      apply(M) {
        M.money *= 0.25;
        M.rp *= 3;
        M.ap *= 2;
      },
      start: { cards: { ilya: 1 } },
      unlocked: false,
      unlockText: 'Reach ASI once',
      unlockCond: (s) => s.stats.asiCount >= 1,
      modelName(cap) { return family('ssi', cap); },
    },
    mistral: {
      id: 'mistral',
      name: 'Mistral AI',
      short: 'MSTL',
      product: 'Le Chat',
      color: '#fa520f',
      color2: '#ffd08a',
      logo: 'wind',
      tagline: 'Open, efficient, European.',
      desc: 'Magnet links instead of launch events. Small models punching above their weight.',
      perks: ['Serving efficiency ×2', 'Small models get +8 capability', '+20% vibes from releases'],
      apply(M) {
        M.serveEff *= 2;
        M.smallModelBonus = 8;
        M.releaseVibe *= 1.2;
      },
      unlocked: false,
      unlockText: 'Prestige 5 times',
      unlockCond: (s) => s.prestige.count >= 5,
      modelName(cap) { return family('mistral', cap); },
    },
  };
  G.LAB_ORDER = ['anthropic', 'openai', 'deepmind', 'xai', 'meta', 'deepseek', 'mistral', 'ssi'];
  G.modelFamily = family;

  /* Rival personalities: offset = how far ahead (+) / behind (-) of the player they aim to be,
   * aggro = how fast they close the gap, early = offset in the early game. */
  G.RIVAL_TRAITS = {
    openai: { early: 12, late: -4, aggro: 1.2 },
    anthropic: { early: 6, late: -5, aggro: 1.1 },
    deepmind: { early: 14, late: -3, aggro: 1.0 },
    xai: { early: -40, late: -6, aggro: 1.5 },
    meta: { early: 6, late: -15, aggro: 0.8 },
    deepseek: { early: -30, late: -8, aggro: 1.3 },
    mistral: { early: -25, late: -20, aggro: 0.9 },
    ssi: { early: -80, late: -10, aggro: 0.6 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
