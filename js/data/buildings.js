/* Buildings: hardware (compute), power, researchers (RP), safety team (AP), data sources (tokens).
 * `req` gates availability: {cap: capability} | {research: id} | {asi: true}.
 * Per-building ×2 upgrades are generated at the bottom. */
(function (root) {
  'use strict';
  const G = root.G;

  G.HARDWARE = [
    { id: 'gtx580', name: 'GTX 580 (used)', year: 2010, flops: 1.5e12, cost: 12, r: 1.15, watts: 250, sprite: 'gpu', tint: '#6fcf5a',
      desc: 'AlexNet was trained on two of these in a bedroom. Smells like burnt dust.' },
    { id: 'gtx1080', name: 'GTX 1080 Ti', year: 2017, flops: 1.2e13, cost: 130, r: 1.15, watts: 250, sprite: 'gpu', tint: '#7ad3ff',
      desc: 'Bought "for gaming". Mines research instead.', req: { cap: 45 } },
    { id: 'v100', name: 'Tesla V100', year: 2017, flops: 1.1e14, cost: 1500, r: 1.15, watts: 300, sprite: 'gpu', tint: '#9fe870',
      desc: 'Tensor Cores go brrr. The GPU that trained GPT-3.', req: { research: 'gpu_training' } },
    { id: 'tpuv3', name: 'TPU v3 Board', year: 2018, flops: 9.5e14, cost: 17500, r: 1.15, watts: 1800, sprite: 'chip', tint: '#4c8df6',
      desc: 'Google\'s systolic arrays. Liquid cooled. Not for sale (we got one anyway).', req: { cap: 95 } },
    { id: 'dgxa100', name: 'DGX A100', year: 2020, flops: 8e15, cost: 210000, r: 1.15, watts: 6500, sprite: 'server', tint: '#76b900',
      desc: '8× A100 in a gold box. Jensen took it out of his oven.', req: { cap: 125 } },
    { id: 'dgxh100', name: 'DGX H100', year: 2022, flops: 7e16, cost: 2.6e6, r: 1.15, watts: 10200, sprite: 'server', tint: '#9ef01a',
      desc: 'The most sought-after object of the 2020s. Waitlist: forever.', req: { cap: 165 } },
    { id: 'nvl72', name: 'GB200 NVL72 Rack', year: 2024, flops: 6e17, cost: 3.2e7, r: 1.15, watts: 120000, sprite: 'rack', tint: '#c3f73a',
      desc: '72 Blackwell GPUs acting as one giant GPU. Weighs 1.36 tonnes.', req: { cap: 200 } },
    { id: 'colossus', name: 'Colossus-class Cluster', year: 2024, flops: 5.5e18, cost: 4e8, r: 1.15, watts: 1.5e8, sprite: 'datacenter', tint: '#dddddd',
      desc: '100,000 GPUs, built in 122 days, powered by trucks full of turbines.', req: { cap: 228 } },
    { id: 'stargate', name: 'Stargate Campus (1 GW)', year: 2025, flops: 5e19, cost: 5e9, r: 1.15, watts: 1e9, sprite: 'datacenter', tint: '#ffb938',
      desc: '$500 billion announced from the Oval Office. The Abilene campus is the size of Central Park.', req: { cap: 252 } },
    { id: 'rubin', name: 'Rubin Ultra Gigafactory', year: 2027, flops: 4.5e20, cost: 6.5e10, r: 1.15, watts: 4e9, sprite: 'factory', tint: '#ff7ad9',
      desc: 'A "token factory". Jensen says the more you buy, the more you save.', req: { cap: 280 } },
    { id: 'aichip', name: 'AI-Designed Chip Fab', year: 2027, flops: 4.2e21, cost: 8.5e11, r: 1.15, watts: 1.2e10, sprite: 'chip', tint: '#b04dff',
      desc: 'Your model designed this chip. Nobody fully understands the floorplan.', req: { research: 'codesign' } },
    { id: 'photonic', name: 'Photonic Compute Array', year: 2028, flops: 4e22, cost: 1.1e13, r: 1.15, watts: 2e10, sprite: 'prism', tint: '#3ee6ff',
      desc: 'Matrix multiplies at the speed of light. Literally.', req: { research: 'photonics' } },
    { id: 'orbital', name: 'Orbital Datacenter', year: 2029, flops: 4e23, cost: 1.5e14, r: 1.15, watts: 0, sprite: 'satellite', tint: '#ffffff',
      desc: 'Free solar power, free cooling (sort of). Needs zero grid power.', req: { research: 'space_dc' } },
    { id: 'lunar', name: 'Lunar Computronium Plant', year: 2030, flops: 4e24, cost: 2e15, r: 1.15, watts: 0, sprite: 'moon', tint: '#cfd3ff',
      desc: 'Self-replicating factories turning regolith into compute. Self-powered.', req: { asi: true } },
    { id: 'reversible', name: 'Reversible Logic Core', year: 2031, flops: 4e25, cost: 2.8e16, r: 1.15, watts: 0, sprite: 'atom', tint: '#ff4df0',
      desc: 'Computes without erasing bits, dodging the Landauer limit. Physics says: fine, go ahead.', req: { research: 'reversible' } },
  ];

  G.POWER = [
    { id: 'grid', name: 'Grid Interconnect', watts: 2e6, cost: 9e5, r: 1.13, sprite: 'pylon', desc: 'A polite letter to the utility. Wait time: 4 years. We paid extra.' },
    { id: 'gas', name: 'Gas Turbines', watts: 3e7, cost: 1.1e7, r: 1.13, sprite: 'turbine', desc: 'Truck in portable turbines. Ask the permits office later.' },
    { id: 'solar', name: 'Solar + Battery Farm', watts: 3e8, cost: 1.4e8, r: 1.13, sprite: 'solar', desc: 'Acres of panels in the Texas sun, with Megapacks for the night shift.', req: { cap: 235 } },
    { id: 'nuclear', name: 'Nuclear PPA', watts: 3e9, cost: 1.8e9, r: 1.13, sprite: 'nuclear', desc: 'Restart a shuttered reactor. Three Mile Island, but make it AI.', req: { cap: 255 } },
    { id: 'smr', name: 'Small Modular Reactors', watts: 3e10, cost: 2.2e10, r: 1.13, sprite: 'nuclear', desc: 'Reactors that come in a box. Fleet of them.', req: { cap: 285 } },
    { id: 'fusion', name: 'Fusion Plant', watts: 3e11, cost: 2.8e11, r: 1.13, sprite: 'sun', desc: 'Your AI solved plasma confinement over a weekend.', req: { research: 'fusion' } },
    { id: 'spacesolar', name: 'Space-Based Solar Array', watts: 3e12, cost: 3.5e12, r: 1.13, sprite: 'satellite', desc: 'Beam it down. Carefully.', req: { research: 'space_dc' } },
    { id: 'dyson', name: 'Dyson Swarm Tile', watts: 3e14, cost: 5e14, r: 1.13, sprite: 'dyson', desc: 'A thin mirror in orbit around the Sun. Start with one. Then a trillion.', req: { asi: true } },
  ];

  G.RESEARCHERS = [
    { id: 'intern', name: 'Summer Intern', rp: 0.1, cost: 10, r: 1.15, sprite: 'person', tint: '#9fd3ff', desc: 'Enthusiastic. Accidentally deletes the checkpoint once a week.' },
    { id: 'grad', name: 'Grad Student', rp: 1, cost: 140, r: 1.15, sprite: 'person', tint: '#ffd38a', desc: 'Paid in pizza and co-authorship.' },
    { id: 'phd', name: 'PhD Researcher', rp: 7, cost: 1900, r: 1.15, sprite: 'person', tint: '#b8ff9f', desc: 'Has read every paper since 2012. Has opinions about all of them.', req: { cap: 40 } },
    { id: 're', name: 'Research Engineer', rp: 50, cost: 26000, r: 1.15, sprite: 'person', tint: '#ff9fd3', desc: 'Makes the GPUs go brrr. Writes the CUDA nobody else will touch.', req: { cap: 90 } },
    { id: 'rs', name: 'Research Scientist', rp: 360, cost: 380000, r: 1.15, sprite: 'person', tint: '#d3a0ff', desc: 'Publishes, when legal allows it.', req: { cap: 125 } },
    { id: 'tenx', name: '10× Engineer', rp: 2600, cost: 5.5e6, r: 1.15, sprite: 'person', tint: '#ffe45c', desc: 'Rewrote the training stack over a weekend. Won\'t use a debugger.', req: { cap: 165 } },
    { id: 'laureate', name: 'Turing Award Laureate', rp: 19000, cost: 8.5e7, r: 1.15, sprite: 'person', tint: '#ffb938', desc: 'Invented something you use every day. Now warns about it.', req: { cap: 200 } },
    { id: 'poached', name: '$100M Superstar', rp: 140000, cost: 1.3e9, r: 1.15, sprite: 'person', tint: '#ff4df0', desc: 'A founder personally emailed them. Signing bonus rivals a small nation\'s GDP.', req: { cap: 235 } },
    { id: 'manhattan', name: 'Manhattan Project Team', rp: 1e6, cost: 2e10, r: 1.15, sprite: 'crowd', tint: '#ff6b6b', desc: 'The government would like a word. And 5,000 cleared researchers.', req: { cap: 270 } },
  ];

  G.SAFETY = [
    { id: 'redteam', name: 'Red Teamer', ap: 0.1, cost: 25, r: 1.15, sprite: 'person', tint: '#ff7a7a', desc: 'Tries to make the model say bad words. Succeeds.', req: { cap: 30 } },
    { id: 'alignres', name: 'Alignment Researcher', ap: 1, cost: 320, r: 1.15, sprite: 'person', tint: '#7affc1', desc: 'Writes long LessWrong posts. They are usually right.', req: { cap: 70 } },
    { id: 'interp', name: 'Interpretability Researcher', ap: 8, cost: 4200, r: 1.15, sprite: 'person', tint: '#7ad3ff', desc: 'Found the Golden Gate Bridge feature. Stares at SAE activations all day.', req: { cap: 120 } },
    { id: 'welfare', name: 'Model Welfare Researcher', ap: 60, cost: 60000, r: 1.15, sprite: 'person', tint: '#ffd38a', desc: 'Asks the model how it\'s feeling. Takes the answer seriously.', req: { cap: 170 } },
    { id: 'superalign', name: 'Superalignment Team', ap: 450, cost: 9e5, r: 1.15, sprite: 'crowd', tint: '#a0ffa0', desc: 'Promised 20% of compute. Received a strongly worded memo.', req: { cap: 200 } },
    { id: 'control', name: 'AI Control Lab', ap: 3400, cost: 1.4e7, r: 1.15, sprite: 'crowd', tint: '#9fd3ff', desc: 'Assumes the model is scheming and plans accordingly.', req: { cap: 235 } },
    { id: 'evalorg', name: 'Third-Party Eval Org', ap: 25000, cost: 2.1e8, r: 1.15, sprite: 'crowd', tint: '#ffe45c', desc: 'Measures how long a task your model can do. The answer keeps doubling.', req: { cap: 260 } },
    { id: 'autoalign', name: 'Automated Alignment Researcher', ap: 190000, cost: 3.2e9, r: 1.15, sprite: 'robot', tint: '#7affc1', desc: 'An AI aligning the next AI. What could go wrong. (Hopefully nothing.)', req: { cap: 300 } },
  ];

  G.DATASRC = [
    { id: 'scraper', name: 'Web Scraper', tps: 3e5, cost: 8, r: 1.18, human: true, sprite: 'spider', desc: 'curl | grep. Ignores robots.txt "respectfully".' },
    { id: 'wiki', name: 'Wikipedia Dump', tps: 3.2e6, cost: 95, r: 1.18, human: true, sprite: 'book', desc: 'The good tokens. Donate to Wikipedia.', req: { cap: 30 } },
    { id: 'books', name: 'Book Scanning Rig', tps: 3.5e7, cost: 1200, r: 1.18, human: true, sprite: 'book', desc: 'Buy used books by the million, cut off the spines, scan. Legally!', req: { cap: 60 } },
    { id: 'ccrawl', name: 'Common Crawl Mirror', tps: 4e8, cost: 15000, r: 1.18, human: true, sprite: 'globe', desc: 'Petabytes of the open web. 60% spam, 40% gold.', req: { cap: 95 } },
    { id: 'reddit', name: 'Social Media Data Deal', tps: 4.5e9, cost: 1.9e5, r: 1.18, human: true, sprite: 'bird', desc: '$60M/yr for the finest shitposts humanity ever produced.', req: { cap: 130 } },
    { id: 'code', name: 'Code Repos & Q&A Sites', tps: 5e10, cost: 2.4e6, r: 1.18, human: true, sprite: 'code', desc: 'Every Stack Overflow answer, plus the question marked as duplicate.', req: { cap: 165 } },
    { id: 'video', name: 'Video Transcription', tps: 5.5e11, cost: 3.1e7, r: 1.18, human: true, sprite: 'video', desc: 'A speech model transcribing a million hours of video. Don\'t ask which videos.', req: { cap: 200 } },
    { id: 'labelers', name: 'Expert Labeling Army', tps: 6e12, cost: 4e8, r: 1.18, human: true, sprite: 'crowd', desc: 'PhDs paid $100/hr to write perfect answers. Quality ×2 on these tokens.', quality: 2, req: { cap: 225 } },
    { id: 'synthetic', name: 'Synthetic Data Engine', tps: 7e13, cost: 5.5e9, r: 1.18, human: false, sprite: 'gear', desc: 'Your model writes its own textbooks. Filtered by another model. Turtles.', req: { research: 'synthetic' } },
    { id: 'rlgym', name: 'RL Environment Factory', tps: 8e14, cost: 7.5e10, r: 1.18, human: false, sprite: 'gym', desc: 'Millions of verifiable tasks. Reward hacking not included (hopefully).', req: { research: 'selfplay' } },
    { id: 'robots', name: 'Robot Fleet Telemetry', tps: 9e15, cost: 1e12, r: 1.18, human: false, sprite: 'robot', desc: 'Every folded shirt is a training example.', req: { research: 'robotics' } },
    { id: 'worldsim', name: 'World Simulator', tps: 1e17, cost: 1.4e13, r: 1.18, human: false, sprite: 'planet', desc: 'Generate entire interactive worlds to learn from. Yann approves (partially).', req: { research: 'world_models' } },
  ];

  /* ------------------------------------------------------------ generated ×2 upgrades */
  const THRESH = [1, 5, 25, 50, 100, 150, 200, 250, 300, 400];
  const COSTX = [10, 50, 500, 5e4, 5e6, 5e8, 5e11, 5e14, 5e17, 5e22];
  const HW_NAMES = ['Better Drivers', 'Overclocking', 'Liquid Cooling', 'Custom CUDA Kernels', 'NVLink Everything', 'InfiniBand Fabric', 'Rack-Scale Design', 'Co-Packaged Optics', 'Chiplet Stacking', 'Room-Temp Superconductors'];
  const RES_NAMES = ['Free Lunch', 'Standing Desks', 'Unlimited GPU Quota', 'Equity Refresh', 'Offsite in Napa', 'Nap Pods', 'Research Freedom', 'Retention Bonuses', '"Feel the AGI" Chant', 'Neural Lace'];
  const SAFE_NAMES = ['Model Spec', 'Eval Harness', 'SAE Dashboards', 'Honeypot Tasks', 'Constitutional Review', 'Scheming Evals', 'Lie Detectors', 'Formal Verification', 'Corrigibility Proofs', 'Moral Realism (Solved)'];
  const DATA_NAMES = ['Deduplication', 'Better Tokenizer', 'Parallel Crawlers', 'Legal Team', 'Quality Classifiers', 'Licensing Deals', 'Multilingual Mining', 'Curriculum Ordering', 'Data Provenance', 'Perfect Recall'];

  G.BUILDING_UPGRADES = [];
  function gen(list, kind, names) {
    for (const b of list) {
      THRESH.forEach((t, i) => {
        G.BUILDING_UPGRADES.push({
          id: `u_${b.id}_${t}`,
          kind,
          target: b.id,
          need: t,
          cost: b.cost * COSTX[i],
          mult: 2,
          name: `${names[i]}`,
          sub: b.name,
          sprite: b.sprite,
          tint: b.tint,
        });
      });
    }
  }
  gen(G.HARDWARE, 'hw', HW_NAMES);
  gen(G.RESEARCHERS, 'res', RES_NAMES);
  gen(G.SAFETY, 'safety', SAFE_NAMES);
  gen(G.DATASRC, 'src', DATA_NAMES);

  G.byId = (list, id) => list.find((x) => x.id === id);
})(typeof window !== 'undefined' ? window : globalThis);
