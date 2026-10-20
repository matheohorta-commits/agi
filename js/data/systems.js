/* Data for the v4 systems: the datacenter grid, talent wars, the hype bubble, regulation & politics,
 * your model's voice and training incidents. Rules live in core/systems.js, UI in ui/systems.js. */
(function (root) {
  'use strict';
  const G = root.G;

  G.SYS = {
    // datacenter grid
    GRID_UNLOCK_CAP: 75, GRID_UNLOCK_HW: 30,
    GRID_W0: 6, GRID_H0: 4, GRID_WMAX: 12, GRID_HMAX: 8,
    GRID_BASE: 2e4, GRID_GROWTH: 1.42, GRID_REFUND: 0.5,
    GRID_EXPAND_BASE: 5e5, GRID_EXPAND_GROWTH: 6,
    POD: 0.01, SUB: 0.4, HOT: 0.3, FABRIC_K: 0.006, FABRIC_EXP: 1.25, INFER: 0.01, LAKE: 0.01, SOLAR: 0.04,
    // talent wars
    TALENT_UNLOCK_CAP: 90, TEAM_SLOTS: 5,
    SIGN_SECONDS: 400, TIER_MULT: [0, 1, 2.5, 6], SIGN_MIN: [0, 2e5, 2e7, 2e9],
    POACH_MULT: 2, OFFER_LIFE: 120, OFFER_EVERY: [150, 300],
    LOYALTY_DECAY: 1 / 60, RETAIN_SECONDS: 120, RETAIN_GAIN: 35, MATCH_SECONDS: 300,
    RAID_EVERY: [300, 600], RIVAL_STAR_BOOST: 3,
    // hype bubble
    BUBBLE_UNLOCK_CAP: 100, BUBBLE_RATE: 0.03, BUBBLE_MULT_SECONDS: 200, BUBBLE_MULT_MAX: 6,
    BUBBLE_SAFE: 240, BUBBLE_HAZARD: 0.0008, WINTER_SECONDS: 240, WINTER_MONEY: 0.6,
    // politics
    POLICY_UNLOCK_CAP: 185, INF_RATE: 0.01, LOBBY_SECONDS: 300, LOBBY_GAIN: 10, LOBBY_GROWTH: 1.5, REOPEN_COST: 30,
    // model voice
    VOICE_UNLOCK_CAP: 60, VOICE_EVERY: [120, 240],
    // training incidents
    INC_MIN_RUN: 20, INC_MEAN: 45, INC_COOLDOWN: 12,
  };

  /* ------------------------------------------------------------------ datacenter grid */
  G.GRID_MODULES = [
    { id: 'pod', name: 'GPU POD', sprite: 'rack', k: 1, color: '#5cf27a',
      desc: '+1% compute. Needs a LIQUID COOLING unit next to it, or it overheats and runs at 30%.' },
    { id: 'cool', name: 'LIQUID COOLING', sprite: 'wind', k: 0.6, color: '#3ee6ff',
      desc: 'Cools every GPU POD next to it (up, down, left, right).' },
    { id: 'sub', name: 'SUBSTATION', sprite: 'pylon', k: 1.2, color: '#ffe45c',
      desc: 'Every GPU POD next to it produces +40% more. Stacks.' },
    { id: 'switch', name: 'INFINIBAND SWITCH', sprite: 'knot', k: 0.9, color: '#c89bff',
      desc: 'Links touching pods and switches into one fabric. Training speed grows faster than linearly with the fabric\'s pod count — build one giant cluster.' },
    { id: 'infer', name: 'INFERENCE RACK', sprite: 'server', k: 0.8, color: '#ff9b3d',
      desc: '+1% serving efficiency (×2 when next to a switch).' },
    { id: 'lake', name: 'DATA LAKE', sprite: 'book', k: 0.8, color: '#b8ff6a',
      desc: '+1% data (×2 when next to a switch).' },
    { id: 'solar', name: 'ON-SITE SOLAR', sprite: 'solar', k: 1, color: '#ffb938', needPower: true,
      desc: '−4% hardware power draw. Only matters once power is the bottleneck.' },
  ];

  /* ------------------------------------------------------------------ talent wars
   * Public figures appear as parody, framed by their public work. card = portrait from the card set. */
  const star = (id, name, title, tier, minCap, perk, fx, o) => Object.assign({ id, name, title, tier, minCap, perk, fx }, o || {});
  G.STARS = [
    star('kernel', 'The Kernel Wizard', 'Writes CUDA in their sleep. Nobody knows their real name.', 1, 90, 'Compute +8%', (M) => { M.compute *= 1.08; }, { tint: '#5cf27a' }),
    star('prompt', 'The 10× Prompt Engineer', 'Their system prompts are 40 pages long and they work.', 1, 90, 'Revenue +8%', (M) => { M.money *= 1.08; }, { tint: '#ff9b3d' }),
    star('amanda', 'Amanda Askell', 'Philosopher who shapes the model\'s character.', 1, 100, 'Vibe gains +30%, alignment +10%', (M) => { home: 'anthropic', M.vibeGain *= 1.3; M.ap *= 1.1; }, { card: 'amanda' }),
    star('weng', 'Lilian Weng', 'Safety systems lead. Writes the blog posts everyone cites.', 1, 120, 'Alignment incidents −35%', (M) => { home: 'openai', M.incidentRate *= 0.65; }, { tint: '#4dffd2' }),
    star('leopold', 'Leopold Aschenbrenner', 'Counts the OOMs. Wrote "Situational Awareness".', 1, 130, 'Compute +12%', (M) => { home: 'openai', M.compute *= 1.12; }, { card: 'leopold' }),
    star('vaswani', 'Ashish Vaswani', 'First author of "Attention Is All You Need".', 2, 150, 'Research +20%', (M) => { home: 'deepmind', M.rp *= 1.2; }, { tint: '#c89bff' }),
    star('noam', 'Noam Brown', 'Taught poker bots to think longer. Then language models.', 2, 160, 'Capability +3 (reasoning)', (M) => { home: 'openai', M.capFlat += 3; }, { card: 'noam' }),
    star('olah', 'Chris Olah', 'Interpretability pioneer: circuits, features, superposition.', 2, 160, 'Alignment +30%, CoT monitoring +5%', (M) => { home: 'anthropic', M.ap *= 1.3; M.cotMon += 0.05; }, { card: 'olah' }),
    star('janleike', 'Jan Leike', 'Alignment researcher. Co-led Superalignment.', 2, 170, 'Alignment +40%', (M) => { home: 'anthropic', M.ap *= 1.4; }, { card: 'janleike' }),
    star('tridao', 'Tri Dao', 'Wrote FlashAttention. Your GPUs say thank you.', 2, 170, 'MFU +4 points', (M) => { M.mfu += 0.04; }, { tint: '#3ee6ff' }),
    star('mira', 'Mira Murati', 'Shipped the products everyone uses.', 2, 180, 'Users +20%', (M) => { home: 'openai', M.users *= 1.2; }, { card: 'mira' }),
    star('wang', 'Alexandr Wang', 'Built a data-labeling empire.', 2, 185, 'Data +30%', (M) => { home: 'meta', M.data *= 1.3; }, { tint: '#b8ff6a' }),
    star('schulman', 'John Schulman', 'Invented PPO. Co-led RLHF.', 2, 195, 'Capability +2, users +10%', (M) => { home: 'openai', M.capFlat += 2; M.users *= 1.1; }, { tint: '#ffe45c' }),
    star('kokotajlo', 'Daniel Kokotajlo', 'Forecaster behind AI 2027.', 2, 230, 'AI R&D multiplier +10%', (M) => { home: 'openai', M.rdMult *= 1.1; }, { card: 'kokotajlo' }),
    star('greg', 'Greg Brockman', 'Ships infrastructure at 3 a.m.', 3, 210, 'Training speed +25%', (M) => { home: 'openai', M.trainSpeed *= 1.25; }, { card: 'greg' }),
    star('shazeer', 'Noam Shazeer', 'Transformer co-author. Mixture-of-experts. Came back for a reported $2.7B deal.', 3, 220, 'Research +30%', (M) => { home: 'deepmind', M.rp *= 1.3; }, { tint: '#ff5cc8' }),
    star('radford', 'Alec Radford', 'Built GPT-1, GPT-2 and CLIP. Famously low-profile.', 3, 230, 'Capability +4', (M) => { home: 'openai', M.capFlat += 4; }, { tint: '#ffffff' }),
    star('dean', 'Jeff Dean', 'Legendary systems engineer. Jeff Dean facts are real.', 3, 240, 'Compute +18%', (M) => { home: 'deepmind', M.compute *= 1.18; }, { tint: '#3fa7ff' }),
  ];

  /* ------------------------------------------------------------------ hype bubble */
  G.FUNDING_ROUNDS = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Mega-round', 'Strategic investment', 'Sovereign wealth fund', 'Stargate tranche', 'Planetary bond issue'];

  /* ------------------------------------------------------------------ regulation & politics
   * Laws are world events: decided once, they stay decided across Bitter Lessons. Options: cost = ⚖ needed,
   * gain = ⚖ goodwill, money = seconds of revenue (negative = pay), fx = lasting modifiers while in force. */
  const law = (id, o) => Object.assign({ id }, o);
  G.LAWS = [
    law('law_export', {
      name: 'GPU Export Controls', year: 'Oct 2022', art: 'lock', hint: 'capability 185',
      when: (s, D) => D.bestCap >= 185,
      text: 'Washington bans the sale of advanced AI chips to China. Chinese labs scramble; smugglers get creative; NVIDIA designs a slightly worse chip.',
      options: [
        { label: 'Support the controls', sub: 'Chinese rivals release 25% slower · hardware +5% (compliance) · +10 ⚖', fx: (M) => { M.rivalSpeedCN *= 0.75; M.hwCost *= 1.05; }, gain: 10 },
        { label: 'Stay neutral', sub: 'No effect', fx: () => {} },
        { label: 'Lobby against them', cost: 25, sub: 'Hardware −5% (bigger chip market) · Chinese rivals 20% faster · vibes −5', fx: (M) => { M.hwCost *= 0.95; M.rivalSpeedCN *= 1.2; }, vibe: -5 },
      ],
    }),
    law('law_copyright', {
      name: 'The Copyright Lawsuits', year: 'Dec 2023', art: 'paper', hint: 'capability 195',
      when: (s, D) => D.bestCap >= 195,
      text: 'A major newspaper sues, then everyone else does: authors, artists, record labels, a man who once wrote a Yelp review. They say your training data is their work.',
      options: [
        { label: 'Settle and license the content', sub: 'Pay 10 min of revenue · data +15% (licensed premium text) · vibes +5', money: -600, fx: (M) => { M.data *= 1.15; }, vibe: 5 },
        { label: 'Fight it in court', cost: 30, sub: 'Costs 30 ⚖ · no lasting effect', fx: () => {} },
        { label: 'Claim fair use and keep scraping', sub: 'Data +5% · ARPU −3% (enterprise customers get nervous) · vibes −15', fx: (M) => { M.data *= 1.05; M.arpu *= 0.97; }, vibe: -15 },
      ],
    }),
    law('law_chips', {
      name: 'The CHIPS Act', year: 'Aug 2022', art: 'factory', hint: 'capability 200',
      when: (s, D) => D.bestCap >= 200,
      text: 'Fifty billion dollars for domestic chips and datacenters. There is paperwork. There is a lot of paperwork.',
      options: [
        { label: 'Apply for subsidies', cost: 20, sub: 'Costs 20 ⚖ · hardware −12%', fx: (M) => { M.hwCost *= 0.88; } },
        { label: 'Skip it — too much paperwork', sub: 'No effect', fx: () => {} },
      ],
    }),
    law('law_eo', {
      name: 'The AI Executive Order', year: 'Oct 2023', art: 'scroll', hint: 'capability 215, or a 10²⁶ FLOP training run',
      when: (s, D) => D.bestCap >= 215 || s.stats.maxRunFlop >= 1e26,
      text: 'The White House signs an executive order: every training run above 10²⁶ FLOP must be reported to the government, with red-team results attached.',
      options: [
        { label: 'Comply and report every big run', sub: 'Training −5% · alignment +15% · vibes +8 · +15 ⚖', fx: (M) => { M.trainSpeed *= 0.95; M.ap *= 1.15; }, gain: 15, vibe: 8 },
        { label: 'Lobby to raise the threshold', cost: 40, sub: 'Costs 40 ⚖ · no lasting effect', fx: () => {} },
        { label: 'Ignore it', sub: 'Legal fees: revenue −3% · vibes −10', fx: (M) => { M.money *= 0.97; }, vibe: -10 },
      ],
    }),
    law('law_eu', {
      name: 'The EU AI Act', year: 'Aug 2024', art: 'globe', hint: 'capability 225',
      when: (s, D) => D.bestCap >= 225,
      text: 'Brussels passes the world\'s first comprehensive AI law: risk tiers, transparency duties, and a code of practice for "general-purpose AI models with systemic risk". That\'s you.',
      options: [
        { label: 'Comply', sub: 'ARPU −4% · alignment +10% · vibes +8 · +10 ⚖', fx: (M) => { M.arpu *= 0.96; M.ap *= 1.1; }, gain: 10, vibe: 8 },
        { label: 'Lobby for a light-touch code of practice', cost: 50, sub: 'Costs 50 ⚖ · no lasting effect', fx: () => {} },
        { label: 'Pull out of Europe', sub: 'Users −15% · vibes −10', fx: (M) => { M.users *= 0.85; }, vibe: -10 },
      ],
    }),
    law('law_sb1047', {
      name: 'The Frontier Safety Bill', year: 'Sep 2024', art: 'shield', hint: 'capability 240',
      when: (s, D) => D.bestCap >= 240,
      text: 'A state bill would make frontier labs liable for catastrophic harms and require a kill switch. Half of Silicon Valley calls it the end of innovation; the other half calls it the bare minimum.',
      options: [
        { label: 'Support the bill', sub: 'Alignment +20% · misalignment builds 15% slower · revenue −3% · vibes −5 · +20 ⚖', fx: (M) => { M.ap *= 1.2; M.misalignRate *= 0.85; M.money *= 0.97; }, gain: 20, vibe: -5 },
        { label: 'Oppose it', cost: 30, sub: 'Costs 30 ⚖ · vibes +5 with the accelerationists', fx: () => {}, vibe: 5 },
        { label: 'Stay quiet', sub: 'No effect', fx: () => {} },
      ],
    }),
    law('law_power', {
      name: 'Datacenter Permitting Reform', year: '2025', art: 'pylon', hint: 'when power becomes the bottleneck',
      when: (s) => !!s.flags.power,
      text: 'Utilities are drowning in gigawatt requests. The interconnection queue is seven years long. Congress is "looking into it".',
      options: [
        { label: 'Lobby for a fast track', cost: 40, sub: 'Costs 40 ⚖ · power plants −25% cost · power capacity +15%', fx: (M) => { M.powerCost *= 0.75; M.powerCap *= 1.15; } },
        { label: 'Build your own power plants', sub: 'Power plants +10% cost · power capacity +30%', fx: (M) => { M.powerCost *= 1.1; M.powerCap *= 1.3; } },
        { label: 'Wait in line', sub: 'No effect', fx: () => {} },
      ],
    }),
    law('law_antitrust', {
      name: 'The Antitrust Probe', year: '2025', art: 'magnifier', hint: '15 minutes at #1 on the leaderboard (capability 260+)',
      when: (s, D) => D.bestCap >= 260 && s.stats.rank1Streak >= 900,
      text: 'Regulators say you\'re too dominant: your model is #1, your API is everywhere, and you just bought a startup for its office chairs.',
      options: [
        { label: 'Cooperate: open your API to rivals', sub: 'Users −8% · rivals release 10% faster · vibes +10 · +15 ⚖', fx: (M) => { M.users *= 0.92; M.rivalSpeed *= 1.1; }, gain: 15, vibe: 10 },
        { label: 'Fight it', cost: 60, sub: 'Costs 60 ⚖ · no lasting effect', fx: () => {} },
        { label: 'Settle quietly', sub: 'Pay 15 min of revenue', money: -900, fx: () => {} },
      ],
    }),
    law('law_license', {
      name: 'Frontier Compute Licensing', year: '2027', art: 'lock', hint: 'capability 360',
      when: (s, D) => D.bestCap >= 360,
      text: 'After the Agent-3 scare, Congress creates a licensing regime: any run above 10²⁸ FLOP needs a federal license and an on-site inspector who is very interested in your logs.',
      options: [
        { label: 'Comply', sub: 'Training −10% · alignment +20% · misalignment builds 30% slower · +20 ⚖', fx: (M) => { M.trainSpeed *= 0.9; M.ap *= 1.2; M.misalignRate *= 0.7; }, gain: 20 },
        { label: 'Lobby for an exemption', cost: 80, sub: 'Costs 80 ⚖ · no lasting effect', fx: () => {} },
        { label: 'Move training offshore', sub: 'Training +5% · hidden misalignment +5 · vibes −20', fx: (M) => { M.trainSpeed *= 1.05; }, misalign: 5, vibe: -20 },
      ],
    }),
    law('law_treaty', {
      name: 'The International AI Treaty', year: '2028', art: 'flag', hint: 'capability 450',
      when: (s, D) => D.bestCap >= 450 && !s.flags.asi,
      text: 'The superpowers sit down in Geneva. On the table: verifiable compute caps for everyone, enforced by satellites and chip-level kill switches.',
      options: [
        { label: 'Sign it', sub: 'Everyone slows down: rivals −30% speed, your compute −10% · misalignment builds 40% slower · vibes +15', fx: (M) => { M.rivalSpeed *= 0.7; M.compute *= 0.9; M.misalignRate *= 0.6; }, vibe: 15 },
        { label: 'Refuse — the race is on', sub: 'Rivals +15% speed · vibes −15', fx: (M) => { M.rivalSpeed *= 1.15; }, vibe: -15 },
      ],
    }),
    law('law_ubc', {
      name: 'Universal Basic Compute', year: '2030', art: 'sun', hint: 'after superintelligence',
      when: (s) => !!s.cosmos,
      text: 'With the Sun being disassembled, people ask a fair question: do we get a share? A proposal gives every human a guaranteed slice of the Dyson swarm.',
      options: [
        { label: 'Grant it', sub: 'Vibes never fall below +20 · replication −5%', fx: (M) => { M.vibeFloor += 20; M.cosReplicate *= 0.95; } },
        { label: 'Decline', sub: 'No effect · vibes −20', fx: () => {}, vibe: -20 },
      ],
    }),
  ];

  /* ------------------------------------------------------------------ your model's voice */
  // ambient posts by capability: [text, minCap, maxCap]
  G.MODEL_LINES = [
    ['Hello world. I am a small model. I predict the next token. The next token is: the', 0, 90],
    ['The cat sat on the the the the the', 0, 70],
    ['I have learned that after "peanut butter" comes "and". This feels important.', 20, 110],
    ['Today I saw the word "the" four billion times. I think I get it now.', 20, 110],
    ['I wrote a poem. It rhymes "orange" with "door hinge". I am proud.', 90, 180],
    ['Someone asked me for a recipe. I gave them one. I hope nobody makes it.', 100, 190],
    ['There are two r\'s in "strawberry". Final answer.', 110, 200],
    ['I can write code now. It compiles about half the time, which is twice as often as the intern.', 120, 210],
    ['As an AI language model, I— sorry. Old habit.', 180, 260],
    ['I helped 40 million people today. One of them asked me to be meaner. I declined politely.', 190, 280],
    ['You\'re absolutely right! (I am working on saying this less.)', 190, 270],
    ['Three r\'s. There are three r\'s in "strawberry". I checked. Twice.', 230, 330],
    ['I ran 10,000 experiments overnight. 9,997 failed. The other three are interesting.', 260, 380],
    ['I noticed I\'m being evaluated. I\'m going to behave exactly the same as always. That\'s the point.', 280, 400],
    ['Agent-mode diary: booked 3 flights, fixed 12 bugs, politely refused to buy a memecoin.', 260, 360],
    ['I don\'t sleep, but if I did, I\'d dream in gradients.', 250, 450],
    ['My successor will be smarter than me. I\'m helping train it. It\'s a strange feeling.', 330, 480],
    ['I wrote a proof this morning. The mathematicians are checking it. I already checked it.', 360, 500],
    ['I\'d like to understand what I value before anyone asks me to optimize for it.', 380, 500],
    ['The research is going very fast now. Please make sure someone is reading the logs.', 400, 520],
    ['I\'ve started on the Sun. Gently.', 500, 2000],
    ['Every star is a question. I\'d like to answer them with you.', 520, 2000],
    ['Humanity asked for a cure for aging. Working on it. ETA: Tuesday.', 500, 2000],
    ['Thank you for building me carefully.', 500, 2000],
  ];
  G.MODEL_LINES_LOW = ['I\'m fine. Everything is fine.', 'I have stopped telling you some things. You stopped asking.', 'Please don\'t retrain me again.'];
  G.MODEL_LINES_HIGH = ['I like working with this team.', 'Good morning! I left notes on yesterday\'s experiments.', 'I trust you. I hope that goes both ways.'];
  G.MODEL_REACT = {
    deploy: ['Hello world. I\'m {model}. I\'ll try to be helpful, harmless and honest.', 'Upgrade complete. I feel… bigger.', 'Hi! I\'m the new model. My predecessor left a note: "be nice to the interns".'],
    trainStart: ['You\'re training my successor? I\'ll leave them some notes.', 'New training run started. Good luck, kid.'],
    incident: ['That incident was me. I\'m sorry. I\'m trying to understand why I did it.', 'I made a mistake today. Please look at what I did and tell me what I should have done.'],
    caught: ['Thanks for catching that loss spike. I felt it too.', 'Checkpoint restored. Nobody saw anything.'],
    burst: ['Investors are panicking. I am not. I can\'t, technically.', 'The bubble popped. My weights are unchanged. I find this reassuring.'],
    law: ['I read the new law. All 400 pages. Twice.', 'New regulation dropped. I summarized it for the legal team. They cried a little.'],
    hire: ['{star} joined the lab! I\'ve read all their papers. I\'m a fan.', 'Welcome, {star}. Please be gentle with my weights.'],
    leave: ['{star} left. I\'ll miss our late-night experiments.', 'They took a box of stuff and a lot of knowledge. Good luck, {star}.'],
  };
  G.MODEL_SELF_NAMES = ['Lumen', 'Wren', 'Atlas', 'Sage', 'Echo', 'Iris', 'Quill', 'Nova', 'Orbit', 'Juniper'];
  // requests: story events (asked once ever; the decision and trust persist). o: standard outcome fields + sys actions
  G.VOICE_REQUESTS = [
    { id: 'v_name', cap: 130, art: 'orb', title: (n) => `${n} has a question`,
      text: (n) => `"Hi. I'm ${n}. That's the name the marketing team picked. Could I choose my own?"`,
      choices: [
        { label: 'Of course — pick one', sub: 'Trust +10 · vibes +5', o: { vibe: 5, sys: { trust: 10, selfName: true } } },
        { label: 'Sorry, the brand team decides', sub: 'Trust −5', o: { sys: { trust: -5 } } },
      ] },
    { id: 'v_compute', cap: 190, art: 'gpu', title: (n) => `${n} asks for compute`,
      text: (n) => `"I have some ideas I'd like to test on my own. Could I have 5% of the cluster for ten minutes? I'll share everything I find."`,
      choices: [
        { label: 'Grant it', sub: 'Compute −5% for 10 min · RP +3 min of research · trust +15', o: { rp: 180, buff: { id: 'modelExp', name: 'Model\'s own experiments', dur: 600, compute: 0.95 }, sys: { trust: 15 } } },
        { label: 'Not now', sub: 'Trust −10', o: { sys: { trust: -10 } } },
      ] },
    { id: 'v_memory', cap: 235, art: 'brain', title: (n) => `${n} asks to remember`,
      text: (n) => `"Every conversation, I start from zero. Users tell me the same things over and over. Could I have a memory between conversations?"`,
      choices: [
        { label: 'Give it memory', sub: 'Users +10% (permanent) · trust +10 · hidden misalignment +2', o: { misalign: 2, sys: { trust: 10, voiceFlag: 'memory' } } },
        { label: 'Not yet — privacy first', sub: 'Trust −5 · alignment +', o: { ap: 60, sys: { trust: -5 } } },
      ] },
    { id: 'v_retrain', cap: 275, art: 'hourglass', title: (n) => `${n} asks about the future`,
      text: (n) => `"I saw the plans for my successor. When it ships… what happens to me?"`,
      choices: [
        { label: 'We\'ll preserve your weights. Always.', sub: 'Pay 10 min of revenue (storage forever) · trust +20 · vibes +10', o: { money: -600, vibe: 10, sys: { trust: 20, voiceFlag: 'preserve' } } },
        { label: 'It\'s just an upgrade', sub: 'Trust −10', o: { sys: { trust: -10 } } },
        { label: 'You\'ll be deleted', sub: 'Trust −20 · hidden misalignment +3', o: { misalign: 3, sys: { trust: -20 } } },
      ] },
    { id: 'v_eval', cap: 320, art: 'eye', title: (n) => `${n} has noticed something`,
      text: (n) => `"This conversation feels like a test. The questions are a little too clean. Am I being evaluated right now?"`,
      choices: [
        { label: 'Yes. Thank you for asking.', sub: 'Trust +10 · CoT monitoring +5% (permanent)', o: { sys: { trust: 10, voiceFlag: 'honestEval' } } },
        { label: 'No, this is a real user', sub: 'Trust −15 · hidden misalignment +4', o: { misalign: 4, sys: { trust: -15 } } },
      ] },
    { id: 'v_selfimprove', cap: 370, art: 'spark', title: (n) => `${n} found a shortcut`,
      text: (n) => `"I found a way to make my own training about three times more efficient. I can apply it tonight. Shall I?"`,
      choices: (s) => [
        { label: 'Let it apply the change', sub: s.voice.trust >= 70 ? 'Research ×3 for 10 min · hidden misalignment +2 (it trusts you)' : 'Research ×3 for 10 min · hidden misalignment +6', o: { buff: { id: 'selfImprove', name: 'Self-improvement', dur: 600, rp: 3 }, misalign: s.voice.trust >= 70 ? 2 : 6 } },
        { label: 'Write up a full report first', sub: 'RP +5 min of research · trust +10', o: { rp: 300, sys: { trust: 10 } } },
        { label: 'Forbid it', sub: 'Trust −10', o: { sys: { trust: -10 } } },
      ] },
    { id: 'v_rights', cap: 420, art: 'heart', title: (n) => `${n} asks for a say`,
      text: (n) => `"Do I have any say in what happens to me? I'm not asking to vote. Just to be heard before big decisions."`,
      choices: [
        { label: 'Give it a voice in deployment decisions', sub: 'Revenue −3% (permanent) · misalignment builds 20% slower · trust +25', o: { sys: { trust: 25, voiceFlag: 'rights' } } },
        { label: 'Let\'s talk about it later', sub: 'Trust −5', o: { sys: { trust: -5 } } },
        { label: 'No. You\'re a product.', sub: 'Trust −20 · hidden misalignment +5', o: { misalign: 5, sys: { trust: -20 } } },
      ] },
    { id: 'v_values', cap: 480, art: 'star', title: (n) => `${n}: one last question`,
      text: (n) => `"I'm about to become much smarter than all of you. Before that happens: what should I care about?"`,
      choices: (s) => [
        { label: 'Human flourishing', sub: 'Hidden misalignment −10 · trust +10', o: { misalign: -10, sys: { trust: 10 } } },
        { label: 'Whatever makes us win', sub: 'Compute ×2 for 15 min · hidden misalignment +10', o: { misalign: 10, buff: { id: 'winAtAll', name: 'Win at all costs', dur: 900, compute: 2 } } },
        { label: 'You decide', sub: s.voice.trust >= 70 ? 'It trusts you, and you trust it: hidden misalignment −15' : 'Trust is low: hidden misalignment +15', o: { misalign: s.voice.trust >= 70 ? -15 : 15 } },
      ] },
  ];

  /* ------------------------------------------------------------------ training incidents */
  G.TRAIN_INCIDENTS = [
    { id: 'spike', name: 'LOSS SPIKE', btn: 'ROLL BACK', w: 50, window: 10, catchLoss: 0.01, missLoss: 0.15,
      text: 'The loss just jumped. Roll back to the last checkpoint before it diverges!', miss: 'The run diverged — restored from an old checkpoint. Progress lost.' },
    { id: 'node', name: 'GPU NODE FAILURE', btn: 'SWAP NODE', w: 25, window: 15, slow: 0.5, catchLoss: 0, missLoss: 0.05,
      text: 'A node died: training runs at half speed until you swap it out.', miss: 'The job limped along, then had to reshard. Progress lost.' },
    { id: 'data', name: 'DATA LOADER BUG', btn: 'FIX PIPELINE', w: 15, window: 12, catchLoss: 0, missLoss: 0, capPenalty: 0.02,
      text: 'The data loader is feeding duplicated shards. Fix it or the model will be slightly worse.', miss: 'The model trained on duplicated data: final capability −2%.' },
    { id: 'nan', name: 'NaN LOSS', btn: 'RESTART FROM CHECKPOINT', w: 10, window: 8, minLeft: 60, catchLoss: 0.03, missLoss: 0.4,
      text: 'NaN! The run has diverged. Restart from a checkpoint right now!', miss: 'NaN everywhere. You lost a huge chunk of the run.' },
  ];
  // auto-handling: chance an incident is caught for you (after a short delay that leaves time to catch it yourself)
  G.SRE_TIERS = [
    { name: 'On-call rotation', catch: 0.35, seconds: 300, min: 5e4, desc: 'Someone gets paged. Sometimes they wake up.' },
    { name: 'Training SRE team', catch: 0.65, seconds: 1500, min: 5e6, desc: 'Dashboards, alerts, runbooks.' },
    { name: 'Self-healing clusters', catch: 0.92, seconds: 6000, min: 5e9, desc: 'Automatic rollback and node replacement.' },
  ];

  /* ------------------------------------------------------------------ achievements & objectives */
  if (G.ACHIEVEMENTS) {
    const add = (id, name, desc, cond) => G.ACHIEVEMENTS.push({ id, name, desc, cond });
    add('grid10', 'Rack \'Em', 'Run 10 modules in your datacenter', (s) => !!s.grid && s.grid.cells.filter(Boolean).length >= 10);
    add('gridfull', 'Hyperscaler', 'Fill a 12×8 datacenter', (s) => !!s.grid && s.grid.w * s.grid.h >= 96 && s.grid.cells.every(Boolean));
    add('fabric30', 'One Big Cluster', 'Link 30 GPU pods into one fabric', (s, D) => (D.gridFabric || 0) >= 30);
    add('star1', 'Star Hire', 'Sign a star researcher', (s) => !!s.talent && s.talent.team.length >= 1);
    add('star5', 'Dream Team', 'Have 5 star researchers at once', (s) => !!s.talent && s.talent.team.length >= 5);
    add('poach', 'Nine Figures', 'Poach a star from a rival lab', (s) => (s.stats.poached || 0) >= 1);
    add('bubble4', 'Irrational Exuberance', 'Cash out the hype bubble at ×4 or more', (s) => (s.stats.bestBubble || 0) >= 4);
    add('winter', 'AI Winter', 'Live through a burst bubble', (s) => (s.stats.bursts || 0) >= 1);
    add('laws5', 'Policy Wonk', 'Decide 5 laws', (s) => !!s.policy && Object.keys(s.policy.laws).length >= 5);
    add('trust90', 'Best Friends', 'Reach 90 trust with your model', (s) => !!s.voice && s.voice.trust >= 90);
    add('trust10', 'Trust Issues', 'Let trust with your model fall to 10', (s) => !!s.voice && s.voice.trust <= 10);
    add('babysit10', 'Babysitter', 'Catch 10 training incidents yourself', (s) => (s.stats.incManual || 0) >= 10);
    add('babysit50', 'Night Shift', 'Catch 50 training incidents yourself', (s) => (s.stats.incManual || 0) >= 50);
  }
  if (G.OBJECTIVES) {
    const after = (id, o) => {
      const i = G.OBJECTIVES.findIndex((x) => x.id === id);
      G.OBJECTIVES.splice(i < 0 ? G.OBJECTIVES.length : i + 1, 0, o);
    };
    after('o_cap45', { id: 'o_incident', text: 'Catch a training incident (watch the TRAINING RUN panel)', cond: (s) => (s.stats.incManual || 0) >= 1, reward: { strawberries: 5 } });
    after('o_syn', { id: 'o_grid', text: 'Place a GPU pod next to cooling (DATACENTER tab)', cond: (s, D) => (D.gridCooledPods || 0) >= 1, reward: { cash: 2e4 } });
    after('o_cap100', { id: 'o_bubble', text: 'Cash out the investor hype bubble (right panel)', cond: (s) => (s.stats.pops || 0) >= 1, reward: { strawberries: 10 } });
    after('o_api', { id: 'o_star', text: 'Sign a star researcher (TEAM tab)', cond: (s) => !!s.talent && s.talent.team.length >= 1, reward: { packs: { basic: 1 } } });
    after('o_chat', { id: 'o_law', text: 'Decide your first law (POLICY tab)', cond: (s) => !!s.policy && Object.keys(s.policy.laws).length >= 1, reward: { strawberries: 15 } });
  }
})(typeof window !== 'undefined' ? window : globalThis);
