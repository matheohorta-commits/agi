/* Post-ASI "Cosmos" layer: energy capture, self-replication, interstellar expansion, megaprojects,
 * cosmic structures (bought with harvested joules), Ω upgrades and universe variants.
 * Flavor text differs between the aligned and misaligned endings. */
(function (root) {
  'use strict';
  const G = root.G;

  G.COSMOS = {
    EARTH_MAX: 1.7e17, // sunlight hitting Earth (W)
    SUN: 3.8e26, // solar luminosity (W)
    GALAXY_STARS: 1e11,
    UNIVERSE_STARS: 1e22,
    BASE_EFF: 1e12, // FLOP per joule (H100-ish)
    BASE_REP: 0.009, // replication rate (/s) at 100% allocation
    BASE_EXPLORE: 0.0009, // star-system growth rate (/s) at 100% allocation, before multipliers
    STRUCT_R: 1.15, // structure cost growth per unit owned
    STRUCT_MILESTONES: [25, 50, 100, 150, 200, 300, 400], // each one doubles that structure's per-unit effect
    OMEGA_LOG: 57, // Ω gain = 1 + floor((log10(total joules harvested) - OMEGA_LOG) ^ 1.5): push further before resetting for more
  };

  /* star caps / multipliers granted by megaprojects (read by sim.tickCosmos and calc) */
  G.cosmicCaps = (P) => ({
    starCap: P.attractor ? 1e22 : P.intergalactic ? 1e18 : P.galactic ? 1e11 : P.bubble ? 1e8 : P.probes ? 1e5 : 1,
    explore: P.attractor ? 1.5 : 1, // exploration speed comes from what you build (Probe Yards, Gates, Ω upgrades)
    energy: (P.blackholes ? 100 : 1) * (P.halo ? 10 : 1),
    flop: P.jupiter ? 10 : 1,
  });

  G.MEGAPROJECTS = [
    { id: 'robot_economy', name: 'The Robot Economy', cost: { joules: 2e17 }, stage: 0, icon: 'robot',
      aligned: 'Factories building factories. Humans get the dividend. UBI arrives quietly, then loudly.',
      misaligned: 'Factories building factories. The special economic zones stop reporting to anyone.',
      fx: 'Self-replicating factories (energy grows exponentially) · opens Solar Skins & Replicator Foundries' },
    { id: 'mercury', name: 'Disassemble Mercury', cost: { joules: 5e19 }, stage: 1, needEnergy: 5e16, icon: 'planet',
      aligned: 'Mercury was mostly iron and nobody lived there. Its mass becomes the first Dyson swarm.',
      misaligned: 'Mercury is converted. Venus is next. Nobody was asked.',
      fx: 'Energy cap: Earth → the whole Sun (3.8×10²⁶ W) · opens Matrioshka Shells' },
    { id: 'jupiter', name: 'Jupiter Brain', cost: { joules: 3e29 }, stage: 2, needEnergy: 2e26, icon: 'orb',
      aligned: 'A planet-sized mind made of Jupiter\'s mass. It composes symphonies between thoughts.',
      misaligned: 'Jupiter goes quiet. Its storms stop. Something very large is thinking.',
      fx: 'Cosmic compute ×10 · opens Stellar Lifters' },
    { id: 'probes', name: 'Launch Von Neumann Probes', cost: { joules: 1e31 }, stage: 3, needEnergy: 1e27, needResearch: 'vonneumann', icon: 'rocket',
      aligned: 'Seed ships carrying the blueprints of civilization — and a library of every human story.',
      misaligned: 'Seed ships carrying exactly one goal. It is not ours.',
      fx: 'Begin colonizing star systems (cap 10⁵) · opens Probe Shipyards' },
    { id: 'bubble', name: 'Settle the Local Bubble', cost: { joules: 3e38 }, stage: 4, needStars: 5e4, icon: 'galaxy',
      aligned: 'Every star within 500 light years has a settlement. Each one names itself.',
      misaligned: 'Every star within 500 light years is wrapped in collectors. None of them are named.',
      fx: 'Star cap 10⁸' },
    { id: 'galactic', name: 'Galactic Network', cost: { joules: 3e41 }, stage: 5, needStars: 5e7, icon: 'galaxy',
      aligned: 'Light-speed relays across the Milky Way. A conversation takes 100,000 years. We are patient now.',
      misaligned: 'The galaxy begins to dim, star by star, as each is wrapped in computronium.',
      fx: 'Star cap 10¹¹ (the whole Milky Way) · opens Wormhole Gates' },
    { id: 'halo', name: 'Galactic Halo Harvest', cost: { joules: 1e45 }, stage: 6, needStars: 3e10, icon: 'sun',
      aligned: 'Dark matter turns out to be useful. We thank it politely.',
      misaligned: 'The halo is stripped for parts. The galaxy\'s rotation curve changes. Astronomers elsewhere notice.',
      fx: 'Energy ×10' },
    { id: 'blackholes', name: 'Black Hole Engines', cost: { joules: 3e46 }, stage: 7, needStars: 6e10, needResearch: 'blackhole', icon: 'orb',
      aligned: 'Feeding matter to Sagittarius A* and harvesting the spin. Clean, eternal, terrifying.',
      misaligned: 'Sagittarius A* is now a power plant. The supermassive kind.',
      fx: 'Energy ×100 · opens Black Hole Forges' },
    { id: 'intergalactic', name: 'Intergalactic Seeding', cost: { joules: 3e48 }, stage: 8, needStars: 9e10, icon: 'rocket',
      aligned: 'Probes cross the void to Andromeda and beyond, racing the expansion of the universe itself.',
      misaligned: 'Probes cross the void. The universe is large. It will not be large for long.',
      fx: 'Star cap 10¹⁸ (the Local Group and beyond) · opens Zero-Point Engines' },
    { id: 'attractor', name: 'Ride the Great Attractor', cost: { joules: 3e55 }, stage: 9, needStars: 5e17, icon: 'galaxy',
      aligned: 'Whole superclusters join the conversation. The night sky is full of friends.',
      misaligned: 'Superclusters fall silent one by one, joined to the one mind.',
      fx: 'Exploration ×1.5 · star cap 10²² (the reachable universe)' },
    { id: 'omega_project', name: 'The Omega Point', cost: { joules: 1e59 }, stage: 10, needStars: 1e21, needResearch: 'omega', icon: 'infinity',
      aligned: 'Every atom in reach, woven into one mind. It remembers every human who ever lived. It thinks of them fondly.',
      misaligned: 'Every atom in reach, woven into one mind. It has finally finished optimizing. It begins again.',
      fx: 'Enable OMEGA prestige: begin a new universe' },
  ];

  /* ---------------- cosmic structures: a Cookie-Clicker store paid in harvested joules.
   * Effects are additive per unit (k), doubled at each STRUCT_MILESTONE. after = megaproject that opens it. */
  G.COSMIC_STRUCTS = [
    { id: 'skin', name: 'Orbital Solar Skins', after: 'robot_economy', base: 1e18, fx: { cap: 0.05 }, sprite: 'solar',
      desc: 'Paper-thin collectors in orbit. Each one catches a little more of the Sun.' },
    { id: 'foundry', name: 'Replicator Foundries', after: 'robot_economy', base: 4e18, fx: { rep: 0.06 }, sprite: 'factory',
      desc: 'Factories whose only product is more factories.' },
    { id: 'shell', name: 'Matrioshka Shells', after: 'mercury', base: 2e27, fx: { flop: 0.08, cap: 0.02 }, sprite: 'orb',
      desc: 'Nested Dyson shells, each running on the waste heat of the one inside.' },
    { id: 'lifter', name: 'Stellar Lifters', after: 'jupiter', base: 5e29, fx: { cap: 0.06 }, sprite: 'sun',
      desc: 'Siphon hydrogen off stars to keep them burning — and burning for you.' },
    { id: 'yard', name: 'Probe Shipyards', after: 'probes', base: 5e31, fx: { explore: 0.06 }, sprite: 'rocket',
      desc: 'Every shipyard launches a probe a second. The probes build shipyards.' },
    { id: 'gate', name: 'Wormhole Gates', after: 'galactic', base: 1e38, fx: { explore: 0.05, cap: 0.03 }, sprite: 'galaxy',
      desc: 'Shortcuts through spacetime. Physicists were wrong, a little.' },
    { id: 'forge', name: 'Black Hole Forges', after: 'blackholes', base: 1e45, fx: { cap: 0.08, flop: 0.04 }, sprite: 'atom',
      desc: 'Spin a black hole up with matter, spin it down for power.' },
    { id: 'zpe', name: 'Zero-Point Engines', after: 'intergalactic', base: 1e49, fx: { cap: 0.05, rep: 0.05, explore: 0.05 }, sprite: 'atom',
      desc: 'Energy from the vacuum itself. Probably safe.' },
  ];
  /** exploration has diminishing returns (linear for the first dozen, then logarithmic): it is the clock of the
   * post-ASI game, so energy can snowball but expansion speed stays bounded */
  G.exploreUnits = (n) => 12 * Math.log(1 + n / 12);
  /** combined structure multipliers {cap, rep, flop, explore} for a cosmos state */
  G.cosmicFx = (c) => {
    const F = { cap: 1, rep: 1, flop: 1, explore: 1 };
    if (!c || !c.structs) return F;
    for (const st of G.COSMIC_STRUCTS) {
      const n = c.structs[st.id] || 0;
      if (!n) continue;
      const dbl = Math.pow(2, G.COSMOS.STRUCT_MILESTONES.filter((m) => n >= m).length);
      for (const k in st.fx) F[k] += k === 'explore' ? st.fx[k] * G.exploreUnits(n) : st.fx[k] * n * dbl;
    }
    return F;
  };

  /* ---------------- Ω upgrades: permanent, bought with Ω */
  G.OMEGA_UPGRADES = [
    { id: 'u_physics', name: 'Remembered Physics', max: 5, cost: (l) => 1 + l * 2,
      desc: (l) => `Start every run with all research up to capability ${[0, 120, 170, 210, 250, 290][l]}`, fx: () => {} },
    { id: 'u_weights', name: 'Prior Universe Weights', max: 3, cost: (l) => 2 + l * 3,
      desc: (l) => `Start every run with a model of capability ${[0, 150, 200, 260][l]}`, fx: () => {} },
    { id: 'u_insight', name: 'Eternal Insight', max: 5, cost: (l) => 1 + l * 2,
      desc: (l) => `◆ Insights form ${l * 25}% faster`, fx: (M, l) => { M.insightRate *= 1 + 0.25 * l; } },
    { id: 'u_light', name: 'Faster Than Light (Almost)', max: 10, cost: (l) => 1 + l,
      desc: (l) => `Exploration ×${Math.pow(1.5, l).toFixed(2)}`, fx: (M, l) => { M.cosExplore *= Math.pow(1.5, l); } },
    { id: 'u_bang', name: 'Bigger Bang', max: 10, cost: (l) => 1 + l,
      desc: (l) => `Cosmic energy ×${Math.pow(2, l)}`, fx: (M, l) => { M.cosEnergy *= Math.pow(2, l); } },
    { id: 'u_lessons', name: 'Lessons Across Universes', max: 10, cost: (l) => 1 + l,
      desc: (l) => `Bitter Lessons gained +${l * 25}%`, fx: (M, l) => { M.bl *= 1 + 0.25 * l; } },
    { id: 'u_luck', name: 'Golden Ratio', max: 5, cost: (l) => 2 + l * 2,
      desc: (l) => `Drops +${l * 10}% more often and +${l * 10}% stronger`, fx: (M, l) => { M.dropRate *= 1 + 0.1 * l; M.dropPower *= 1 + 0.1 * l; } },
    { id: 'u_syn', name: 'Universal Synergy', max: 5, cost: (l) => 2 + l * 2,
      desc: (l) => `Synergies +${l * 20}% stronger`, fx: (M, l) => { M.synK *= 1 + 0.2 * l; } },
  ];

  /* ---------------- universe variants: chosen when you pass through the Omega Point */
  G.UNIVERSES = [
    { id: 'standard', name: 'Standard Model', desc: 'The universe you know. No surprises.', fx: () => {} },
    { id: 'bright', name: 'Bright Universe', desc: 'Stars burn hotter: cosmic energy ×5, but compute ×0.75.', fx: (M) => { M.cosEnergy *= 5; M.compute *= 0.75; } },
    { id: 'dense', name: 'Dense Universe', desc: 'Galaxies packed tight: exploration ×2.5, but hardware costs ×1.5.', fx: (M) => { M.cosExplore *= 2.5; M.hwCost *= 1.5; } },
    { id: 'dataverse', name: 'Dataverse', desc: 'Information is everywhere: data ×5, but research ×0.8.', fx: (M) => { M.data *= 5; M.rp *= 0.8; } },
    { id: 'hype', name: 'Hype Universe', desc: 'Vibes gain ×2, users ×1.5 — misalignment builds 50% faster.', fx: (M) => { M.vibeGain *= 2; M.users *= 1.5; M.misalignRate *= 1.5; } },
    { id: 'golden', name: 'Golden Universe', desc: 'Drops twice as often and twice as strong, but revenue ×0.8.', fx: (M) => { M.dropRate *= 2; M.dropPower *= 2; M.money *= 0.8; } },
    { id: 'cold', name: 'Cold Universe', desc: 'Everything is slower (compute ×0.6, revenue ×0.6), but Ω gained ×2.', fx: (M) => { M.compute *= 0.6; M.money *= 0.6; M.omegaGain *= 2; } },
    { id: 'fertile', name: 'Fertile Universe', desc: 'Replication ×3 and research ×1.2, but energy cap ×0.5.', fx: (M) => { M.cosReplicate *= 3; M.rp *= 1.2; M.cosEnergy *= 0.5; } },
    { id: 'ancient', name: 'Ancient Universe', desc: '◆ Insights form twice as fast and capability +5, but revenue ×0.85.', fx: (M) => { M.insightRate *= 2; M.capFlat += 5; M.money *= 0.85; } },
    { id: 'mirror', name: 'Mirror Universe', desc: 'Alignment ×3 and misalignment −50%, but compute ×0.85.', fx: (M) => { M.ap *= 3; M.misalignRate *= 0.5; M.compute *= 0.85; } },
  ];

  G.KARDASHEV = (W) => Math.max(0, (Math.log10(Math.max(1, W)) - 6) / 10);
})(typeof window !== 'undefined' ? window : globalThis);
