/* Achievements. Each unlocked achievement grants +1% compute/revenue/research.
 * cond(s, D) is evaluated about once per second. Hidden ones show "???" until earned. */
(function (root) {
  'use strict';
  const G = root.G;
  const A = [];
  const add = (id, name, desc, cond, o) => A.push(Object.assign({ id, name, desc, cond }, o || {}));

  // capability
  [[50, 'Hello, World'], [100, 'Next-Token Predictor'], [150, 'Few-Shot'], [190, 'Chat Moment'], [215, 'Sparks'], [250, 'Thinking...'],
    [300, 'Coding Automation'], [350, 'Superhuman Coder'], [400, 'Superhuman Researcher'], [500, 'Superintelligence'], [600, 'Beyond'],
    [800, 'Type II'], [1000, 'Galaxy Brain']].forEach(([c, n], i) =>
    add('cap' + c, n, `Deploy a model with capability ≥ ${c}`, (s, D) => D.cap >= c, { reward: { packs: { basic: 1 + (i >> 2) } } }));

  // money
  [[1e3, 'Ramen Profitable'], [1e6, 'Seed Stage'], [1e9, 'Unicorn'], [1e12, 'Trillion Dollar Club'], [1e15, 'GDP of Earth'], [1e18, 'Post-Scarcity'], [1e24, 'Money Is Meaningless']].forEach(([m, n]) =>
    add('money' + m, n, `Earn ${G.U.fmtMoney(m)} total (all time)`, (s) => s.stats.totalMoney >= m));

  // compute
  [[1e15, 'PetaFLOP'], [1e18, 'ExaFLOP'], [1e21, 'ZettaFLOP'], [1e24, 'YottaFLOP'], [1e27, 'RonnaFLOP'], [1e30, 'QuettaFLOP']].forEach(([f, n]) =>
    add('flops' + f, n, `Reach ${G.U.fmtFlops(f)}`, (s, D) => D.compute >= f));

  // training
  [[1, 'First Run'], [10, 'Hyperparameter Sweep'], [50, 'Ablation Study'], [200, 'Grad Student Descent'], [1000, 'Training Is All You Need']].forEach(([n, name]) =>
    add('runs' + n, name, `Complete ${n} training run${n > 1 ? 's' : ''}`, (s) => s.stats.runs >= n));
  add('bigrun', 'GPT-4 Scale', 'Complete a training run of ≥ 2×10²⁵ FLOP', (s) => s.stats.maxRunFlop >= 2e25);
  add('bigrun2', 'Agent-1 Scale', 'Complete a training run of ≥ 10²⁸ FLOP', (s) => s.stats.maxRunFlop >= 1e28);
  add('bigrun3', 'OOMs Counted', 'Complete a training run of ≥ 10³¹ FLOP', (s) => s.stats.maxRunFlop >= 1e31);
  add('chinchilla_opt', 'Compute-Optimal', 'Train a model within 15% of 20 tokens/param', (s) => s.stats.chinchillaRun);
  add('overtrained', 'Llama-Style', 'Train a model with ≥ 200 tokens per parameter', (s) => s.stats.overtrained);
  add('undertrained', 'Undertrained Behemoth', 'Train a model with < 2 tokens per parameter', (s) => s.stats.undertrained, { hidden: true });

  // clicks & vibes
  [[100, 'Prompt Engineer'], [1000, 'Power User'], [10000, 'Touch Grass?'], [50000, 'Carpal Tunnel Speedrun']].forEach(([n, name]) =>
    add('clicks' + n, name, `Click the model ${n.toLocaleString()} times`, (s) => s.stats.clicks >= n));
  add('so_back', 'WE\'RE SO BACK', 'Reach +100 vibes', (s) => s.vibe >= 99.5);
  add('so_over', 'IT\'S SO OVER', 'Hit −80 vibes', (s) => s.vibe <= -80, { hidden: true });
  add('ratio10', 'Ratio\'d', 'Win 10 mini-events (ratio, debate, patch...)', (s) => s.stats.miniWins >= 10);
  add('ratio50', 'Main Character', 'Win 50 mini-events', (s) => s.stats.miniWins >= 50);
  add('gary_friend', 'Gary\'s Pen Pal', 'Ratio Gary Marcus 25 times', (s) => (s.stats.miniById.gary || 0) >= 25);

  // drops & cards
  [[1, 'Loot Goblin'], [25, 'Drop Hunter'], [100, 'Strawberry Picker'], [500, 'Supply Chain']].forEach(([n, name]) =>
    add('drops' + n, name, `Catch ${n} drops`, (s) => s.stats.drops >= n));
  [[1, 'Hold to Open'], [10, 'Pack Rat'], [50, 'Whale'], [200, 'Gacha Brain']].forEach(([n, name]) =>
    add('packs' + n, name, `Open ${n} crates`, (s) => s.stats.packsOpened >= n));
  [[10, 'Collector'], [40, 'Archivist'], [80, 'Historian'], [G.CARDS.length, 'Complete Lore']].forEach(([n, name]) =>
    add('cards' + n, name, `Collect ${n} different cards`, (s) => Object.keys(s.cards).length >= n));
  add('leg1', 'Legendary Pull', 'Pull a LEGENDARY card', (s) => s.stats.rarityPulls[3] > 0);
  add('sing1', 'Singular', 'Pull a SINGULAR card', (s) => s.stats.rarityPulls[4] > 0);
  add('set1', 'Set Complete', 'Complete a card set', (s, D) => D.setsDone >= 1);
  add('set5', 'Lorekeeper', 'Complete 5 card sets', (s, D) => D.setsDone >= 5);
  add('lvl5', 'Max Level', 'Level a card to 5', (s) => Object.values(s.cards).some((n) => n >= 16));

  // research
  [[5, 'Literature Review'], [20, 'Publish or Perish'], [40, 'Research Lab'], [60, 'Frontier Lab']].forEach(([n, name]) =>
    add('res' + n, name, `Complete ${n} research projects`, (s) => Object.keys(s.research).length >= n));
  add('transformer', 'Attention Is All You Need', 'Research the Transformer', (s) => s.research.transformer);
  add('strawberry', '🍓', 'Research Strawberry', (s) => s.research.strawberry);

  // products & world
  add('chat', 'Low-Key Research Preview', 'Launch the Chat App', (s) => s.products.chat);
  add('users1b', 'A Billion Users', 'Serve 1 billion users at once', (s, D) => D.users >= 1e9);
  add('melting', 'Our GPUs Are Melting', 'Have demand exceed serving capacity by 5×', (s, D) => D.usersDemand > 5 * D.usersCap && D.usersDemand > 1e6);
  add('rank1', 'SOTA', 'Reach #1 on the leaderboard', (s, D) => D.rank === 1);
  add('rank1long', 'Undisputed', 'Hold #1 for 10 minutes straight', (s) => s.stats.rank1Streak >= 600);
  add('power', 'The Bottleneck Is Power', 'Unlock power management', (s) => s.flags.power);
  add('gigawatt', 'Gigawatt Club', 'Have 1 GW of power capacity', (s, D) => D.powerCap >= 1e9);
  add('datawall', 'We Have But One Internet', 'Exhaust all human-written data', (s) => s.flags.datawall);
  add('agents', 'Automated Researcher', 'Allocate compute to automated research', (s, D) => D.researchFlops > 0);
  add('rd10', 'Takeoff', 'Reach a 10× AI R&D multiplier', (s, D) => D.rdMult >= 10);
  add('rd1000', 'FOOM', 'Reach a 1000× AI R&D multiplier', (s, D) => D.rdMult >= 1000);
  add('safe', 'Safety Margin', 'Maintain ≥ 150% safety margin at capability ≥ 300', (s, D) => D.cap >= 300 && D.safety >= 1.5);
  add('race', 'Race', 'Choose to RACE', (s) => s.flags.race);
  add('slowdown', 'Slowdown', 'Choose to SLOW DOWN', (s) => s.flags.slowdown);
  add('asi_good', 'Machines of Loving Grace', 'Reach an aligned superintelligence', (s) => s.ending === 'aligned');
  add('asi_bad', 'Consensus-1', 'Reach a misaligned superintelligence', (s) => s.ending === 'misaligned', { hidden: true });
  add('dyson', 'Dyson Swarm', 'Capture 10²⁶ W', (s) => s.cosmos && s.cosmos.energy >= 1e26);
  add('galaxy', 'Galactic', 'Colonize 10⁹ star systems', (s) => s.cosmos && s.cosmos.stars >= 1e9);

  // prestige
  [[1, 'The Bitter Lesson'], [5, 'Slow Learner'], [15, 'Serial Founder'], [50, 'Lesson Learned']].forEach(([n, name]) =>
    add('prestige' + n, name, `Prestige ${n} time${n > 1 ? 's' : ''}`, (s) => s.prestige.count >= n));
  add('omega', 'Omega', 'Reach the Omega Point', (s) => s.omega.count >= 1);

  // labs
  add('lab_all', 'Every Lab', 'Unlock every lab', (s) => G.LAB_ORDER.every((id) => s.labsUnlocked[id]));
  add('secret_strawberry', 'Three R\'s', 'Click the strawberry drop 3 times in one session', (s) => s.stats.strawberryDrops >= 3, { hidden: true });
  add('night_owl', 'Touch Grass', 'Return after being offline for 8+ hours', (s) => s.stats.longestOffline >= 8 * 3600, { hidden: true });
  add('speed', 'Speedrun 2027', 'Reach capability 300 within 2 hours of a run', (s, D) => D.cap >= 300 && s.run.time <= 7200, { hidden: true });

  G.ACHIEVEMENTS = A;
})(typeof window !== 'undefined' ? window : globalThis);
