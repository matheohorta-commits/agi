/* Post-ASI "Cosmos" layer: energy capture, self-replication, interstellar expansion, megaprojects.
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
    BASE_REP: 0.012, // replication rate (/s) at 100% allocation
    BASE_EXPLORE: 0.02,
  };

  G.MEGAPROJECTS = [
    { id: 'robot_economy', name: 'The Robot Economy', cost: { money: 1e18, rp: 1e17 }, stage: 0,
      aligned: 'Factories building factories. Humans get the dividend. UBI arrives quietly, then loudly.',
      misaligned: 'Factories building factories. The special economic zones stop reporting to anyone.',
      fx: 'Unlock self-replicating factories (energy grows exponentially)' },
    { id: 'mercury', name: 'Disassemble Mercury', cost: { money: 1e21, rp: 1e19 }, stage: 1, needEnergy: 1e16,
      aligned: 'Mercury was mostly iron and nobody lived there. Its mass becomes the first Dyson swarm.',
      misaligned: 'Mercury is converted. Venus is next. Nobody was asked.',
      fx: 'Energy cap: Earth → the whole Sun (3.8×10²⁶ W)' },
    { id: 'probes', name: 'Launch Von Neumann Probes', cost: { money: 1e24, rp: 1e22 }, stage: 2, needEnergy: 1e23, needResearch: 'vonneumann',
      aligned: 'Seed ships carrying the blueprints of civilization — and a library of every human story.',
      misaligned: 'Seed ships carrying exactly one goal. It is not ours.',
      fx: 'Begin colonizing star systems' },
    { id: 'galactic', name: 'Galactic Network', cost: { money: 1e28, rp: 1e26 }, stage: 3, needStars: 1e6,
      aligned: 'Light-speed relays across the Milky Way. A conversation takes 100,000 years. We are patient now.',
      misaligned: 'The galaxy begins to dim, star by star, as each is wrapped in computronium.',
      fx: 'Star cap: 10¹¹ (whole Milky Way) · expansion ×3' },
    { id: 'blackholes', name: 'Black Hole Engines', cost: { money: 1e32, rp: 1e30 }, stage: 4, needStars: 1e9, needResearch: 'blackhole',
      aligned: 'Feeding matter to Sagittarius A* and harvesting the spin. Clean, eternal, terrifying.',
      misaligned: 'Sagittarius A* is now a power plant. The supermassive kind.',
      fx: 'Energy ×100' },
    { id: 'intergalactic', name: 'Intergalactic Seeding', cost: { money: 1e36, rp: 1e34 }, stage: 5, needStars: 5e10,
      aligned: 'Probes cross the void to Andromeda and beyond, racing the expansion of the universe itself.',
      misaligned: 'Probes cross the void. The universe is large. It will not be large for long.',
      fx: 'Star cap: 10²² (the reachable universe)' },
    { id: 'omega_project', name: 'The Omega Point', cost: { money: 1e42, rp: 1e40 }, stage: 6, needStars: 1e18, needResearch: 'omega',
      aligned: 'Every atom in reach, woven into one mind. It remembers every human who ever lived. It thinks of them fondly.',
      misaligned: 'Every atom in reach, woven into one mind. It has finally finished optimizing. It begins again.',
      fx: 'Enable OMEGA prestige: a new universe' },
  ];

  G.KARDASHEV = (W) => Math.max(0, (Math.log10(Math.max(1, W)) - 6) / 10);
})(typeof window !== 'undefined' ? window : globalThis);
