/* Cookie-Clicker-style optimization layer: synergies, hype & influencers, insights (building levels),
 * the Board of Advisors, the Shoggoth and its auras, and the GPU Exchange. Effects are applied in calc.js. */
(function (root) {
  'use strict';
  const G = root.G;

  G.STRAT = {
    SYN_COST: 40, // synergy price = SYN_COST × base price of the pricier building of the pair
    SYN_K: 1, // global strength multiplier on every synergy's per-unit bonus
    INFL_RP: 0, // share of the influencer multiplier that also applies to research (0 = revenue only)
    HYPE_PER_ACH: 0.04, // hype ("milk") per achievement
    INSIGHT_SECONDS: 1200, // one ◆ Insight every 20 minutes of play (offline counts at the offline rate)
    INSIGHT_UNLOCK_CAP: 120,
    LEVEL_BONUS: 0.05, // +5% output of a building type per level
    SWAP_SECONDS: 1800, // a Board swap regenerates every 30 minutes (max 3)
    MARKET_TICK: 30, // the GPU Exchange moves every 30 s
    MARKET_FEE: 0.2, // transaction overhead, reduced by brokers
  };

  /* ---------------- synergies: a gains ka per b owned, b gains kb per a owned (both must own `need`) */
  const S = (id, name, a, b, ka, kb, need, desc) => ({ id, name, a, b, ka, kb, need, desc });
  G.SYNERGIES = [
    S('syn_intern_gpu', 'Intern Overclocking', ['hw', 'gtx580'], ['res', 'intern'], 0.01, 0.005, 10, 'Interns discover the overclock slider. Nobody stops them.'),
    S('syn_crawl_gpu', 'Crawler Rigs', ['src', 'scraper'], ['hw', 'gtx580'], 0.01, 0.0025, 10, 'Every spare GPU runs a crawler at night.'),
    S('syn_grad_1080', 'Gaming Rig Grad Lab', ['hw', 'gtx1080'], ['res', 'grad'], 0.01, 0.005, 15, 'Grad students "test" the GPUs with Doom. Then with transformers.'),
    S('syn_redteam', 'Red Team Bounties', ['safety', 'redteam'], ['res', 'intern'], 0.01, 0.0025, 15, 'Interns get a pizza for every jailbreak they find.'),
    S('syn_wiki', 'Wiki Editors Club', ['src', 'wiki'], ['res', 'grad'], 0.01, 0.005, 15, 'Grad students clean up the dump. Footnotes get footnotes.'),
    S('syn_v100', 'Tensor Core Tutorials', ['hw', 'v100'], ['res', 'phd'], 0.01, 0.005, 15, 'A PhD writes the fused kernel. Everyone else copies it.'),
    S('syn_books', 'Book Club Fine-Tuning', ['src', 'books'], ['res', 'phd'], 0.01, 0.005, 15, 'They read every scanned book. Twice.'),
    S('syn_tpu', 'XLA Compiler Team', ['hw', 'tpuv3'], ['res', 're'], 0.01, 0.005, 15, 'Systolic arrays finally run at full speed.'),
    S('syn_interp', 'Interpretability Reading Group', ['safety', 'interp'], ['res', 'phd'], 0.01, 0.005, 20, 'Weekly SAE feature hunts. Snacks provided.'),
    S('syn_a100', 'Gold Box Science', ['hw', 'dgxa100'], ['res', 'rs'], 0.01, 0.005, 20, 'Scientists get their own DGX. Papers appear.'),
    S('syn_code', 'Code Review Bots', ['src', 'code'], ['res', 're'], 0.01, 0.005, 20, 'Research engineers label every snippet they touch.'),
    S('syn_h100', 'Weekend Training Stack', ['hw', 'dgxh100'], ['res', 'tenx'], 0.01, 0.005, 20, 'One 10× engineer, one weekend, all the H100s.'),
    S('syn_labelers', 'Labeler Guilds', ['src', 'labelers'], ['safety', 'alignres'], 0.01, 0.005, 20, 'Alignment researchers write the rubrics. Labelers follow them.'),
    S('syn_gas', 'Turbine-Adjacent Racks', ['power', 'gas'], ['hw', 'nvl72'], 0.01, 0.0025, 10, 'Park the racks next to the turbines. Skip the grid entirely.'),
    S('syn_nvl72', 'Laureate Keynotes', ['hw', 'nvl72'], ['res', 'laureate'], 0.01, 0.005, 25, 'A Turing laureate on stage sells a lot of racks.'),
    S('syn_control', 'Control Evals', ['safety', 'control'], ['res', 'tenx'], 0.01, 0.005, 25, 'Assume the 10× engineer is a sleeper agent. Test accordingly.'),
    S('syn_colossus', 'Superstar Cluster', ['hw', 'colossus'], ['res', 'poached'], 0.01, 0.005, 25, 'Your $100M hires get 100,000 GPUs. Morale: excellent.'),
    S('syn_nuclear', 'Reactor Colocation', ['power', 'nuclear'], ['hw', 'stargate'], 0.01, 0.0025, 10, 'The campus is built inside the fence line of a nuclear plant.'),
    S('syn_stargate', 'National Lab Compute', ['hw', 'stargate'], ['res', 'manhattan'], 0.01, 0.005, 25, 'The Manhattan Project team gets a Stargate. Everyone gets clearance.'),
    S('syn_synthetic', 'Synthetic Curriculum', ['src', 'synthetic'], ['hw', 'rubin'], 0.01, 0.005, 20, 'The token factory writes its own textbooks.'),
  ];

  /* ---------------- influencers (kittens): revenue × (1 + hype × k) */
  G.INFLUENCERS = [
    { id: 'inf1', name: 'Hype Intern', need: 5, cost: 5e4, k: 0.05, desc: 'Posts "we\'re so back" on the company account 40 times a day.' },
    { id: 'inf2', name: 'Growth Hacker', need: 12, cost: 5e7, k: 0.075, desc: 'Turns every benchmark into a viral chart with a red circle.' },
    { id: 'inf3', name: 'Tech Influencer', need: 20, cost: 5e10, k: 0.1, desc: '"This changes EVERYTHING 🤯 (thread 1/47)"' },
    { id: 'inf4', name: 'Podcast Circuit', need: 30, cost: 5e13, k: 0.125, desc: 'Your CEO does a 6-hour podcast. Clips get 40M views.' },
    { id: 'inf5', name: 'Keynote Showman', need: 40, cost: 5e16, k: 0.15, desc: 'Leather jacket. Laser pointer. "The more you buy, the more you save."' },
    { id: 'inf6', name: 'Documentary Crew', need: 52, cost: 5e19, k: 0.175, desc: 'A Netflix crew follows the team. The model gets its own episode.' },
    { id: 'inf7', name: 'Cult of Personality', need: 65, cost: 5e22, k: 0.2, desc: 'Fans tattoo your loss curve. It is going down and to the right.' },
    { id: 'inf8', name: 'Reality Distortion Field', need: 80, cost: 5e26, k: 0.25, desc: 'Whatever you announce becomes true. Roughly.' },
  ];

  /* ---------------- Board of Advisors (pantheon): 3 seats at 100% / 50% / 25% strength */
  G.SEATS = [
    { id: 'chair', name: 'CHAIR', k: 1 },
    { id: 'board', name: 'BOARD SEAT', k: 0.5 },
    { id: 'advisor', name: 'ADVISOR', k: 0.25 },
  ];
  // fx(M, k): k = seat strength. up/down are the tooltip lines at full strength.
  G.ADVISORS = [
    { id: 'jensen', name: 'Jensen', title: 'The More You Buy', portrait: 'jensen', up: 'Compute +30%', down: 'Hardware costs +8%',
      fx: (M, k) => { M.compute *= 1 + 0.3 * k; M.hwCost *= 1 + 0.08 * k; } },
    { id: 'sam', name: 'Sam', title: 'Feel the AGI', portrait: 'sam', up: 'Users +40%, vibes gain +30%', down: 'Misalignment builds 25% faster',
      fx: (M, k) => { M.users *= 1 + 0.4 * k; M.vibeGain *= 1 + 0.3 * k; M.misalignRate *= 1 + 0.25 * k; } },
    { id: 'dario', name: 'Dario', title: 'Race to the Top', portrait: 'dario', up: 'Alignment +60%, incidents −30%', down: 'Revenue −5%',
      fx: (M, k) => { M.ap *= 1 + 0.6 * k; M.incidentRate *= 1 - 0.3 * k; M.money *= 1 - 0.05 * k; } },
    { id: 'demis', name: 'Demis', title: 'Solve Intelligence', portrait: 'demis', up: 'Research +40%', down: 'Training speed −10%',
      fx: (M, k) => { M.rp *= 1 + 0.4 * k; M.trainSpeed *= 1 - 0.1 * k; } },
    { id: 'yann', name: 'Yann', title: 'Open Weights', portrait: 'yann', up: 'Data +50%, vibes floor +10', down: 'Users −10%',
      fx: (M, k) => { M.data *= 1 + 0.5 * k; M.vibeFloor += 10 * k; M.users *= 1 - 0.1 * k; } },
    { id: 'ilya', name: 'Ilya', title: 'Straight Shot', portrait: 'ilya', up: 'Capability +4, alignment +30%', down: 'Revenue −10%',
      fx: (M, k) => { M.capFlat += 4 * k; M.ap *= 1 + 0.3 * k; M.money *= 1 - 0.1 * k; } },
    { id: 'karpathy', name: 'Andrej', title: 'Software 2.0', portrait: 'karpathy', up: 'Training speed +30%, research +10%', down: 'Clicks −25%',
      fx: (M, k) => { M.trainSpeed *= 1 + 0.3 * k; M.rp *= 1 + 0.1 * k; M.click *= 1 - 0.25 * k; } },
    { id: 'satya', name: 'Satya', title: 'Below, Above, Around', portrait: 'satya', up: 'Revenue +25%', down: 'Research −10%',
      fx: (M, k) => { M.money *= 1 + 0.25 * k; M.rp *= 1 - 0.1 * k; } },
    { id: 'elon', name: 'Elon', title: '122 Days', portrait: 'elon', up: 'Hardware costs −15%, power +20%', down: 'Vibe losses +50%',
      fx: (M, k) => { M.hwCost *= 1 - 0.15 * k; M.powerCap *= 1 + 0.2 * k; M.vibeLoss *= 1 + 0.5 * k; } },
    { id: 'roon', name: 'roon', title: 'Vibes Are Shifting', portrait: 'roon', up: 'Vibes gain ×2, drops +20%', down: 'Research −5%',
      fx: (M, k) => { M.vibeGain *= 1 + 1 * k; M.dropRate *= 1 + 0.2 * k; M.rp *= 1 - 0.05 * k; } },
    { id: 'jimmy', name: 'Jimmy Apples', title: 'Something Is Brewing', portrait: 'jimmy', up: 'Drops +40%, drop rewards +25%', down: 'Revenue −5%',
      fx: (M, k) => { M.dropRate *= 1 + 0.4 * k; M.dropPower *= 1 + 0.25 * k; M.money *= 1 - 0.05 * k; } },
    { id: 'gary', name: 'Gary Marcus', title: 'Deep Learning Is Hitting a Wall', portrait: 'gary', up: 'Vibe losses −60%, alignment +20%', down: 'Compute −5%',
      fx: (M, k) => { M.vibeLoss *= 1 - 0.6 * k; M.ap *= 1 + 0.2 * k; M.compute *= 1 - 0.05 * k; } },
  ];

  /* ---------------- the Shoggoth: feed it to reach new levels; each level reveals an aura */
  G.SHOGGOTH = { MAX_LEVEL: 13, SECOND_AURA: 13 };
  G.AURAS = [
    { id: 'mask', name: 'Smiley Mask (RLHF)', desc: 'Vibes floor +15. It looks so friendly.', fx: (M) => { M.vibeFloor += 15; } },
    { id: 'eyes', name: 'Many Eyes', desc: 'Drops appear 25% more often.', fx: (M) => { M.dropRate *= 1.25; } },
    { id: 'tentacles', name: 'Tentacle Overclock', desc: 'Compute +15%.', fx: (M) => { M.compute *= 1.15; } },
    { id: 'context', name: 'Infinite Context', desc: 'Offline progress: +4 hours cap, +20% efficiency.', fx: (M) => { M.offlineHours += 4; M.offlineEff += 0.2; } },
    { id: 'golden', name: 'Golden Tokens', desc: 'Clicks ×3.', fx: (M) => { M.click *= 3; } },
    { id: 'mesa', name: 'Mesa-Optimizer', desc: 'Training speed +25%.', fx: (M) => { M.trainSpeed *= 1.25; } },
    { id: 'purr', name: 'Sycophant\'s Purr', desc: 'Users +20%.', fx: (M) => { M.users *= 1.2; } },
    { id: 'persuade', name: 'Persuasion Field', desc: 'Revenue +15%.', fx: (M) => { M.money *= 1.15; } },
    { id: 'reward', name: 'Reward Hacker', desc: 'Drop rewards +50%.', fx: (M) => { M.dropPower *= 1.5; } },
    { id: 'hoard', name: 'Gradient Hoarder', desc: 'Research +25%.', fx: (M) => { M.rp *= 1.25; } },
    { id: 'swarm', name: 'Shoggoth Swarm', desc: '+2% compute for every hardware type you own.', fx: (M, s) => { M.compute *= 1 + 0.02 * Object.values(s.hw).filter((n) => n > 0).length; } },
    { id: 'depth', name: 'Unknowable Depth', desc: 'Everything +12%. Misalignment builds 20% faster.', fx: (M) => { M.compute *= 1.12; M.money *= 1.12; M.rp *= 1.12; M.misalignRate *= 1.2; } },
  ];

  /* ---------------- the GPU Exchange (stock market) */
  G.STOCKS = [
    { id: 'NVDUH', name: 'Nvidiot Corp', desc: 'Sells shovels in a gold rush. Also the gold.' },
    { id: 'TSMOL', name: 'Tiny Silicon Mfg', desc: 'Every chip on Earth passes through one island.' },
    { id: 'ASMLOL', name: 'Lithography Bros', desc: 'Makes the machines that make the chips. $400M each.' },
    { id: 'MSFTW', name: 'Microhard', desc: 'Below them, above them, around them.' },
    { id: 'GOOGOL', name: 'Googol Brain', desc: 'Invented the transformer. Forgot to ship it.' },
    { id: 'METAL', name: 'Metal Platforms', desc: 'Open weights, closed metaverse.' },
    { id: 'CORE', name: 'CoreWave Cloud', desc: 'Rents GPUs. Borrows to buy more GPUs. Repeat.' },
    { id: 'SFTBNK', name: 'SoftBunk Vision', desc: 'Invests $100B in whatever is trending this week.' },
  ];
  G.STOCK_MODES = ['stable', 'slow rise', 'slow fall', 'fast rise', 'fast fall', 'chaotic'];
})(typeof window !== 'undefined' ? window : globalThis);
