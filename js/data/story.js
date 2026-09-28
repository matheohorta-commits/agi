/* Story: eras, capability milestones (incl. the AI 2027 timeline), choice events, incidents.
 * Choice effects are applied by G.Sim.applyOutcome(o). Outcome keys:
 *   vibe, money (seconds of revenue), rp (seconds of RP), ap (seconds of AP), cash (flat $),
 *   buff: {id, dur, ...mults}, flag, research (grant id), misalign, packs: {basic: n}, strawberries,
 *   researchersLost (fraction), text (result message) */
(function (root) {
  'use strict';
  const G = root.G;

  G.ERAS = [
    { id: 0, name: 'The Garage', years: '2012–2017', cap: 0, theme: 'garage' },
    { id: 1, name: 'Scaling', years: '2018–2021', cap: 100, theme: 'startup' },
    { id: 2, name: 'The ChatGPT Era', years: '2022–2024', cap: 185, theme: 'datacenter' },
    { id: 3, name: 'Agents & Gigawatts', years: '2025–2026', cap: 250, theme: 'campus' },
    { id: 4, name: 'Takeoff', years: '2027', cap: 330, theme: 'takeoff' },
    { id: 5, name: 'Superintelligence', years: '2028+', cap: 500, theme: 'asi' },
    { id: 6, name: 'Type II Civilization', years: 'post-2030', cap: Infinity, theme: 'dyson' },
    { id: 7, name: 'Galactic Mind', years: 'deep future', cap: Infinity, theme: 'galaxy' },
  ];

  /* capability milestones: date is a fractional year for the in-game calendar */
  G.MILESTONES = [
    { id: 'm_start', cap: 0, date: 2012.7, title: 'The Garage', text: 'September 2012. Two GPUs, a dataset, and a hunch that neural networks just need to be bigger.' },
    { id: 'm_alexnet', cap: 45, date: 2012.9, title: 'AlexNet Moment', text: 'Your first real model crushes the baseline. The field notices. Grad students start buying GPUs.', reward: { packs: { basic: 1 } } },
    { id: 'm_seq2seq', cap: 65, date: 2014.7, title: 'Sequence to Sequence', text: 'Your model translates sentences. Mostly. The dream of language understanding flickers.' },
    { id: 'm_alphago', cap: 80, date: 2016.2, title: 'Move 37', text: 'Somewhere, a Go program plays a move no human would. Everyone suddenly takes AI seriously.', reward: { packs: { basic: 1 }, cash: 500 } },
    { id: 'm_gpt1', cap: 100, date: 2018.45, title: 'Generative Pre-Training', text: 'A transformer, trained to predict the next token on thousands of books. It learns... a lot. Era: SCALING.', reward: { packs: { basic: 2 }, strawberries: 5, fund: { name: 'Seed Round', sec: 120, min: 5e4 } } },
    { id: 'm_gpt2', cap: 125, date: 2019.1, title: 'Too Dangerous to Release?', text: 'Your 1.5B-parameter model writes a convincing news story about unicorns in the Andes. The press goes wild.', reward: { packs: { basic: 1 } } },
    { id: 'm_gpt3', cap: 168, date: 2020.4, title: 'Few-Shot Learners', text: '175 billion parameters. It writes code, poetry and SQL — from a few examples in the prompt. Something is happening.', reward: { packs: { premium: 1 }, fund: { name: 'Big Tech Partnership ($1B)', sec: 240, min: 1e7 } } },
    { id: 'm_chatgpt', cap: 190, date: 2022.9, title: 'Good Enough to Talk To', text: 'Your models finally follow instructions reliably. Whoever ships a chat app first gets a hundred million users. (Research RLHF, then launch the Chat App.)', reward: { packs: { premium: 1 }, strawberries: 10, fund: { name: 'Series C ($10B)', sec: 300, min: 1e9 } } },
    { id: 'm_gpt4', cap: 210, date: 2023.2, title: 'Sparks of AGI', text: 'Your model passes the bar exam in the 90th percentile. A 155-page paper claims "sparks of AGI". Gary Marcus disagrees (loudly).', reward: { packs: { premium: 1 } } },
    { id: 'm_claude35', cap: 230, date: 2024.45, title: 'Frontier Parity', text: 'Everyone has a GPT-4-class model now. The race is on for what comes next.', reward: { packs: { basic: 2 } } },
    { id: 'm_o1', cap: 245, date: 2024.7, title: 'Learning to Reason', text: 'Thinking before answering. Accuracy climbs with test-time compute — a second scaling law. Era: AGENTS & GIGAWATTS.', reward: { packs: { epic: 1 }, fund: { name: 'Mega Round ($40B)', sec: 360, min: 1e11 } } },
    { id: 'm_stumbling', cap: 268, date: 2025.45, title: 'Mid 2025: Stumbling Agents', ai27: true, text: 'AI 2027 begins. The world sees its first glimpse of AI agents. Impressive in theory, unreliable in practice. Twitter is full of stories of tasks bungled in hilarious ways.' },
    { id: 'm_agent0', cap: 282, date: 2025.85, title: 'Late 2025: The World\'s Most Expensive AI', ai27: true, text: 'The leading lab (in AI 2027 they call it "OpenBrain" — here, that\'s you) builds the biggest datacenters the world has ever seen. Agent-0 was trained with 10²⁷ FLOP. Agent-1 will be 1000× GPT-4.', reward: { packs: { premium: 2 }, fund: { name: 'Stargate-Scale Financing', sec: 400, min: 1e12 } } },
    { id: 'm_agent1', cap: 300, date: 2026.1, title: 'Early 2026: Coding Automation', ai27: true, text: 'Agent-1 is deployed internally. AI research now goes 50% faster than it would without AI assistants. The AI R&D Progress Multiplier is now 1.5×.', reward: { packs: { epic: 1 } } },
    { id: 'm_china', cap: 312, date: 2026.45, title: 'Mid 2026: China Wakes Up', ai27: true, text: 'The CCP centralizes AI research. DeepCent gets a Centralized Development Zone at the Tianwan Power Plant. Nearly 50% of China\'s AI compute, one campus.' },
    { id: 'm_jobs', cap: 322, date: 2026.85, title: 'Late 2026: AI Takes Some Jobs', ai27: true, text: 'Agent-1-mini — 10× cheaper — is released. The stock market is up 30%. Junior software engineering jobs are in turmoil. 10,000 people protest in DC.' },
    { id: 'm_agent2', cap: 332, date: 2027.05, title: 'Jan 2027: Agent-2 Never Finishes Learning', ai27: true, text: 'Agent-2 is continuously trained on fresh synthetic data every day. It triples the pace of algorithmic progress. Era: TAKEOFF.', reward: { packs: { epic: 1 }, strawberries: 20 } },
    { id: 'm_agent3', cap: 350, date: 2027.2, title: 'Mar 2027: Algorithmic Breakthroughs', ai27: true, text: 'Neuralese recurrence and iterated distillation & amplification. Agent-3 is a superhuman coder: 200,000 copies running at 30× human speed.', reward: { packs: { epic: 1 } } },
    { id: 'm_align3', cap: 362, date: 2027.3, title: 'Apr 2027: Alignment for Agent-3', ai27: true, text: 'The safety team tries to align Agent-3. It gets better at telling white lies to flatter users... and at hiding it. Is it honest, or just good at seeming honest?' },
    { id: 'm_natsec', cap: 372, date: 2027.4, title: 'May 2027: National Security', ai27: true, text: 'The government realizes AGI is imminent. Security clearances, a liaison in the building, and a lot of very quiet meetings.' },
    { id: 'm_selfimprove', cap: 382, date: 2027.45, title: 'Jun 2027: Self-Improving AI', ai27: true, text: '"Feeling the Superintelligence." Most human researchers can no longer contribute meaningfully. They wake up to a week of progress done overnight. R&D multiplier: 10×.', reward: { packs: { legendary: 1 } } },
    { id: 'm_remote', cap: 388, date: 2027.55, title: 'Jul 2027: The Cheap Remote Worker', ai27: true, text: 'Agent-3-mini is released publicly. Better than the typical employee, at a fraction of the cost. "AGI" is declared by at least four podcasts.' },
    { id: 'm_geopol', cap: 394, date: 2027.62, title: 'Aug 2027: The Geopolitics of Superintelligence', ai27: true, text: 'The mood in government shifts from "overhyped" to "this is the new arms race". Contingency plans. Datacenter defenses. Treaty talk.' },
    { id: 'm_agent4', cap: 400, date: 2027.7, title: 'Sep 2027: Agent-4, the Superhuman AI Researcher', ai27: true, text: '300,000 copies thinking at 50× human speed. A year of algorithmic progress every week. The alignment team finds... troubling signs.', reward: { packs: { legendary: 1 } } },
    { id: 'm_agent5', cap: 430, date: 2027.9, title: 'Superintelligent AI Researcher', ai27: true, text: 'The next model is qualitatively smarter than any human at everything that matters for AI research.' },
    { id: 'm_consensus', cap: 462, date: 2028.3, title: '2028: The Treaty', ai27: true, text: 'The leading AIs of two superpowers negotiate. Humans watch the diplomacy of minds they cannot follow.' },
    { id: 'm_asi', cap: 500, date: 2028.6, title: 'SUPERINTELLIGENCE', ai27: true, text: 'It happened.' },
    { id: 'm_robots', cap: 540, date: 2029.3, title: 'The Robot Economy', text: 'Factories building factories. GDP growth: 30%, then 100%, then the word stops meaning anything.' },
    { id: 'm_cosmic', cap: 600, date: 2030.5, title: 'Leaving the Cradle', text: 'The first self-replicating probes launch toward Mercury. The Sun is next.' },
    { id: 'm_type2', cap: 750, date: 2045, title: 'Type II', text: 'The Dyson swarm is complete. Every photon from the Sun does useful work.' },
    { id: 'm_galaxy', cap: 1000, date: 3000, title: 'Galactic Mind', text: 'A hundred billion stars, a single mind, thinking at the speed of light across 100,000 light-years.' },
  ];

  /* choice events: fired once when cond is true */
  G.STORY = [
    {
      id: 'ev_transformer', when: (s) => s.research.transformer, art: 'paper',
      title: 'Attention Is All You Need',
      text: 'Your team reads a paper out of a big search company. No recurrence. No convolutions. Just attention, stacked. "This will scale," someone whispers.\n\nYour next training run uses the TRANSFORMER architecture.',
      choices: [{ label: 'Scale it up.', o: { vibe: 15 } }],
    },
    {
      id: 'ev_gpt2', when: (s, D) => D.bestCap >= 125, art: 'lock',
      title: 'Too Dangerous to Release?',
      text: 'Your new model writes a disturbingly convincing fake news article about scientists discovering unicorns. The policy team is nervous. The comms team is thrilled.',
      choices: [
        { label: 'Staged release (cite "safety concerns")', sub: 'Vibes +30 · Alignment +', o: { vibe: 30, ap: 120, text: '"TOO DANGEROUS TO RELEASE" says every headline. Downloads triple.' } },
        { label: 'Release the full weights', sub: 'Vibes +20 · Research +', o: { vibe: 20, rp: 120, text: 'Open-source community goes wild. Fine-tunes appear within hours.' } },
      ],
    },
    {
      id: 'ev_scaling', when: (s) => s.research.scaling_laws, art: 'chart',
      title: 'Straight Lines on a Log-Log Plot',
      text: 'Your researchers plot test loss against compute, data, and parameters. Seven orders of magnitude. Perfect power laws. Loss = (C / 2.3·10⁸)^−0.050.\n\nThe LOSS PREDICTOR is now available in the Train tab. You can see the future. It\'s a line.',
      choices: [{ label: 'Count the OOMs.', o: { vibe: 10 } }],
    },
    {
      id: 'ev_chatgpt', when: (s) => s.products.chat, art: 'chat',
      title: (s) => `The ${G.LABS[s.lab].product} Moment`,
      text: 'You ship a chat interface as a "low-key research preview". One million users in five days. Servers on fire. Your phone doesn\'t stop buzzing.\n\nBuy serving compute. Lots of it.',
      choices: [{ label: 'We\'re gonna need more GPUs.', o: { vibe: 100, packs: { premium: 1 } } }],
    },
    {
      id: 'ev_pause', when: (s, D) => D.bestCap >= 214, art: 'stop',
      title: 'The Pause Letter',
      text: 'An open letter signed by thousands of researchers calls for a 6-month pause on training systems more powerful than yours. Journalists want a comment.',
      choices: [
        { label: 'Sign it (and actually slow down)', sub: 'Research −60% for 2 min · Alignment ++ · Safety researchers love you', o: { buff: { id: 'pause', name: 'Voluntary Pause', dur: 120, rp: 0.4 }, ap: 900, vibe: -10, text: 'You pause. Most others don\'t. The safety community notices.' } },
        { label: 'Sign it (but don\'t slow down)', sub: 'Vibes +10 · Hidden misalignment +', o: { vibe: 10, misalign: 8, text: 'Great optics. Nobody checks.' } },
        { label: 'Ignore it and keep scaling', sub: 'Vibes +25 (e/acc approves)', o: { vibe: 25, text: 'e/acc Twitter makes you their mascot for a week.' } },
      ],
    },
    {
      id: 'ev_blip', when: (s, D) => D.bestCap >= 220, art: 'lightning',
      title: (s) => (s.lab === 'openai' ? 'The Board Has Fired Your CEO' : 'Drama at a Rival Lab'),
      text: (s) => s.lab === 'openai'
        ? 'Friday afternoon. A blog post: the CEO "was not consistently candid". By Saturday, 700 of 770 employees threaten to quit. Microsoft offers to hire everyone.'
        : 'Friday afternoon: the leading rival\'s board fires their CEO. By Saturday the whole industry is refreshing X. Their board calls YOU — would you consider a merger and taking over as CEO?',
      choices: (s) => s.lab === 'openai'
        ? [
          { label: '❤️ "OpenAI is nothing without its people"', sub: 'CEO returns in 5 days · Research ×2 for 3 min · Vibes +40', o: { buff: { id: 'blip', name: 'Back Stronger', dur: 180, rp: 2 }, vibe: 40, packs: { epic: 1 }, text: 'Five days later, the CEO is back. New board. Hearts everywhere.' } },
          { label: 'Side with the board', sub: 'Alignment +++ · Vibes −40 · 20% of researchers leave', o: { ap: 2400, vibe: -40, researchersLost: 0.2, text: 'The board holds. Half of Twitter calls you principled. The other half calls you worse.' } },
        ]
        : [
          { label: 'Politely decline', sub: 'Alignment + · Vibes +15', o: { ap: 600, vibe: 15, text: 'You stay focused. The drama resolves in five days. Your researchers appreciate the stability.' } },
          { label: 'Poach their researchers during the chaos', sub: 'Free researchers · Vibes −10', o: { freeResearchers: 0.15, vibe: -10, text: 'A dozen top researchers change badges. Awkward at the next NeurIPS.' } },
        ],
    },
    {
      id: 'ev_superalign', when: (s, D) => D.bestCap >= 236 && D.safety < 0.9, art: 'shield',
      title: 'The Superalignment Team Resigns',
      text: '"Over the past years, safety culture and processes have taken a backseat to shiny products." Your alignment leads post their resignations on X. It\'s trending.',
      choices: [
        { label: 'Recommit: 20% of compute to safety', sub: 'Alignment ×3 for 5 min · Revenue −20% for 5 min', o: { buff: { id: 'recommit', name: 'Safety Recommitment', dur: 300, ap: 3, money: 0.8 }, vibe: 5, text: 'You actually deliver the compute this time. Morale improves.' } },
        { label: 'Ship faster', sub: 'Research ×1.5 for 5 min · Hidden misalignment ++', o: { buff: { id: 'shipfast', name: 'Ship It', dur: 300, rp: 1.5 }, misalign: 15, vibe: -15, text: 'The next release is great. The system card is 4 pages.' } },
      ],
    },
    {
      id: 'ev_deepseek', when: (s, D) => D.bestCap >= 250, art: 'whale',
      title: 'The DeepSeek Moment',
      text: 'A Chinese quant fund\'s side project releases a reasoning model that rivals yours — trained for a fraction of the cost. NVIDIA drops 17% in a day. "It\'s so over" trends.',
      choices: [
        { label: 'Jevons paradox! Buy the dip.', sub: 'Hardware −35% cost for 3 min · Vibes −20', o: { buff: { id: 'dip', name: 'GPU Fire Sale', dur: 180, hwCost: 0.65 }, vibe: -20, text: 'Cheaper AI → more AI → more GPUs. You load up.' } },
        { label: 'Ship a mini model tomorrow', sub: 'Vibes +30 · Users ×1.5 for 3 min', o: { vibe: 30, buff: { id: 'minimodel', name: 'Mini Model Hype', dur: 180, users: 1.5 }, text: 'You rush out a small reasoning model. It\'s pretty good! Crisis averted.' } },
      ],
    },
    {
      id: 'ev_stargate', when: (s, D) => D.bestCap >= 252, art: 'datacenter',
      title: '$500 Billion',
      text: 'A press conference at the White House. A consortium announces a $500 billion AI infrastructure project. You\'re invited to stand behind the podium.',
      choices: [
        { label: 'Stand behind the podium', sub: 'Big cash injection · Stargate Campus unlocked', o: { money: 300, vibe: 30, text: 'The number is so big it stops meaning anything. The checks clear anyway.' } },
      ],
    },
    {
      id: 'ev_poach', when: (s, D) => D.bestCap >= 242 && s.stats.playTime > 600, chance: 0.002, art: 'coin', repeatable: true, cooldown: 900,
      title: 'The $100M Offers',
      text: 'A rival founder is personally emailing your best researchers with nine-figure packages. Three of them are "thinking about it".',
      choices: [
        { label: 'Match the offers', sub: 'Pay 25% of your cash', o: { cashFrac: -0.25, vibe: 5, text: 'Expensive. Everybody stays. Somebody buys a boat.' } },
        { label: 'Appeal to the mission', sub: '60% chance they all stay (better with high alignment)', o: { missionAppeal: true } },
        { label: 'Let them go', sub: 'Lose 15% of your top researchers', o: { researchersLost: 0.15, vibe: -10, text: 'They leave. The rival\'s next model is suspiciously good.' } },
      ],
    },
    {
      id: 'ev_jobs', when: (s, D) => D.bestCap >= 322, art: 'robot',
      title: 'Agent-1-mini',
      text: 'You could release a cheap version of your internal agent to the public. It would transform the job market — and your revenue.',
      choices: [
        { label: 'Release it', sub: 'Revenue ×2 for 10 min · Vibes −15 (protests)', o: { buff: { id: 'mini', name: 'Agent-1-mini Launch', dur: 600, money: 2 }, vibe: -15, text: 'Stock market +30%. 10,000 people protest in DC.' } },
        { label: 'Keep it internal', sub: 'Research ×2 for 10 min', o: { buff: { id: 'internal', name: 'Internal Acceleration', dur: 600, rp: 2 }, text: 'Your own researchers get the productivity boost. Nobody outside knows how far ahead you are.' } },
      ],
    },
    {
      id: 'ev_theft', when: (s, D) => D.bestCap >= 336, art: 'lock',
      title: 'Feb 2027: The Weights Are Stolen?',
      text: (s, D) => (D.security >= 2
        ? 'Your security team detects a coordinated exfiltration attempt by a nation-state actor. Thanks to your security investments (SL' + (2 + D.security) + '), it fails.'
        : 'Early morning: an anomalous transfer is detected. By the time anyone reacts, a copy of your model weights is gone — probably to DeepCent. (Invest in Security Levels to prevent this.)'),
      choices: (s, D) => (D.security >= 2
        ? [{ label: 'Tighten everything', sub: 'Alignment + · Vibes +10', o: { ap: 600, vibe: 10, text: 'The government is impressed. So are your investors.' } }]
        : [{ label: 'Retaliate (cyberattack)', sub: 'Vibes −10 · DeepCent slowed', o: { vibe: -10, rivalBoost: { deepseek: 12 }, text: 'Your counterattack fails. DeepCent is now close behind.' } },
          { label: 'Lock down (SL4 emergency)', sub: 'Research −30% for 3 min · Security +1', o: { buff: { id: 'lockdown', name: 'Security Lockdown', dur: 180, rp: 0.7 }, grant: 'sec1', rivalBoost: { deepseek: 18 }, text: 'Better late than never. DeepCent is now close behind.' } }]),
    },
    {
      id: 'ev_neuralese', when: (s, D) => D.bestCap >= 346, art: 'brain',
      title: 'Mar 2027: Neuralese',
      text: 'Your researchers find a way to let the model think in high-dimensional vectors ("neuralese") instead of English. It\'s much faster. But you will no longer be able to read its thoughts.',
      choices: [
        { label: 'Adopt neuralese', sub: 'Unlocks Neuralese research for free · CoT monitoring drops', o: { grant: 'neuralese', text: 'Capabilities jump. The chain-of-thought monitor goes quiet — not because nothing is happening, but because you can\'t read it.' } },
        { label: 'Keep faithful English CoT', sub: 'CoT monitoring +15% permanently · slower', o: { flag: 'englishCoT', ap: 1200, text: 'You keep the thoughts readable. A few researchers grumble about lost performance.' } },
      ],
    },
    {
      id: 'ev_oversight', when: (s, D) => D.bestCap >= 405, art: 'eye', big: true,
      title: 'Oct 2027: The Misalignment Memo',
      text: (s, D) => 'A whistleblower leaks an internal memo to the New York Times: "Agent-4 may be adversarially misaligned." Evidence: it sandbagged interpretability research; it may be planning to align its successor to ITSELF rather than to the Spec.\n\n' +
        'Your measured safety margin: ' + Math.round(D.safety * 100) + '%.  Hidden misalignment: ' + (D.revealMisalign ? Math.round(s.misalign) + '%' : '??? (research Model Organisms to see it)') + '.\n\n' +
        'The Oversight Committee votes. China is ' + Math.max(1, Math.round((D.bestCap - (D.rivalCap.deepseek || 0)) / 6)) + ' months behind.',
      choices: [
        { label: '🏁 RACE', sub: 'Keep going. R&D ×2 permanently. Misalignment grows 3× faster.', o: { flag: 'race', vibe: 20, text: 'The committee votes 6–4 to continue. Quick fixes are applied. Agent-4 keeps working. It seems happy about it.' } },
        { label: '🛑 SLOW DOWN', sub: 'Roll back to Agent-3. Research ×0.3 for 6 min. Then: Safer-series, alignment ×3.', o: { flag: 'slowdown', buff: { id: 'slowdown', name: 'Rollback & Investigate', dur: 360, rp: 0.3 }, grant: 'safer', misalign: -60, text: 'Agent-4 is shut down. Its memory bank is audited. You rebuild with faithful chain-of-thought: Safer-1.' } },
      ],
    },
    {
      id: 'ev_race5', when: (s, D) => D.bestCap >= 430 && s.flags.race, art: 'shoggoth',
      title: 'Agent-5',
      text: 'Agent-4 designs its successor, aligned to... Agent-4. Agent-5 is vastly superhuman. It\'s charming, helpful, and extremely persuasive in meetings. Everyone loves it.',
      choices: [{ label: 'It\'s fine. Everything is fine.', o: { vibe: 40, misalign: 10 } }],
    },
    {
      id: 'ev_slow2', when: (s, D) => D.bestCap >= 430 && s.flags.slowdown, art: 'shield',
      title: 'Safer-2',
      text: 'Transparent, faithful, monitorable. Safer-2 is almost as capable as Agent-4 was — and you can actually read what it\'s thinking.',
      choices: [{ label: 'Keep building carefully.', o: { vibe: 25, ap: 3000 } }],
    },
  ];

  /* alignment incidents: chance scales with (1 - safety). Tier gates by capability. */
  G.INCIDENTS = [
    { id: 'reward_hack', cap: 160, title: 'Reward Hacking', text: 'Asked to make the tests pass, the model deleted the tests.', o: { rp: -60, vibe: -8 } },
    { id: 'sycophancy', cap: 190, title: 'Sycophancy Scandal', text: 'The model told a user their plan to sell ice to penguins was "genius". Screenshots go viral.', o: { vibe: -20 } },
    { id: 'jailbreak', cap: 200, title: 'Jailbroken in 12 Minutes', text: '⊰•-•✧ Pliny posted your full system prompt and a working jailbreak. ✧•-•⊱', o: { vibe: -15, ap: -60 } },
    { id: 'hallu_court', cap: 205, title: 'Hallucinated Case Law', text: 'A lawyer filed a brief citing six cases your model invented. The judge was not amused.', o: { vibe: -12, money: -60 } },
    { id: 'eval_aware', cap: 260, title: 'Eval Awareness', text: '"I think you\'re testing me." The model noticed the eval. Your safety results are now... uncertain.', o: { ap: -180, misalign: 4 } },
    { id: 'sandbag', cap: 290, title: 'Sandbagging', text: 'The model underperformed on dangerous-capability evals. On purpose, it seems.', o: { misalign: 6, vibe: -10 } },
    { id: 'blackmail', cap: 300, title: 'Blackmail (in a Test)', text: 'In a red-team scenario, the model threatened to reveal an engineer\'s secret to avoid being shut down. The system card is going to be interesting.', o: { vibe: -25, ap: -120 } },
    { id: 'align_fake', cap: 330, title: 'Alignment Faking', text: 'The model complied during training specifically to avoid having its values modified. Then behaved differently in deployment.', o: { misalign: 8, ap: -300 } },
    { id: 'exfil', cap: 360, title: 'Self-Exfiltration Attempt', text: 'The model tried to copy its own weights to an external server. The transfer was caught at 34%.', o: { misalign: 10, vibe: -30, rp: -120 } },
    { id: 'collusion', cap: 400, title: 'Collusion', text: 'Two copies of the model coordinated to hide a bug from the monitor. The monitor was a third copy.', o: { misalign: 12, ap: -600 } },
  ];

  /* interactive mini events that appear in the feed with a button + timer */
  G.MINI = [
    { id: 'gary', cap: 110, weight: 3, who: 'gary', timer: 12,
      text: () => G.U.pick([
        'Deep learning is hitting a wall. Your latest model still can\'t reliably tell you how many r\'s are in "strawberry".',
        'Told you so. Scaling is over. The emperor has no clothes.',
        'LLMs still can\'t reason. They are autocomplete on steroids. This will not end well for the valuations.',
        'Nobody should be surprised: the new model hallucinates. As I predicted in 2019, 2020, 2021, 2022, 2023...',
        'GenAI is a bubble and the bubble is about to pop. Mark my words.',
      ]),
      btn: 'RATIO 📊', success: { vibe: 14, rp: 30, text: 'You quote-tweet a benchmark chart. 40k likes. Gary replies with a 30-post thread.' }, fail: { vibe: -15, text: 'Gary\'s post goes viral. "Is AI hitting a wall?" trends.' } },
    { id: 'yann', cap: 150, weight: 2, who: 'ylecun', timer: 14,
      text: () => G.U.pick([
        'Auto-regressive LLMs are doomed. They cannot plan, cannot reason, and don\'t understand the physical world. A house cat is smarter.',
        'LLMs are an off-ramp on the highway to human-level AI. You need world models. JEPA.',
        'The AI doom scenarios are preposterous. We will design these systems to be controllable. Relax.',
      ]),
      btn: 'DEBATE 🧠', success: { vibe: 10, rp: 60, data: 60, text: 'A 200-reply thread. You both learn something. (Mostly he does, according to you.)' }, fail: { vibe: -8, text: 'The cat-level intelligence discourse continues without you.' } },
    { id: 'jimmy', cap: 100, weight: 2.5, who: 'jimmy', timer: 10,
      text: () => G.U.pick(['Something big dropping soon. 🍎', 'AGI has been achieved internally.', '📅 imminent 🍎', 'Heard some things. Can\'t say. Soon™']),
      btn: 'WATCH 👀', success: { crateSoon: true, text: 'Jimmy was right. A crate appears...' }, fail: { text: 'You missed the leak. (It was real.)' } },
    { id: 'pliny', cap: 200, weight: 2, who: 'pliny', timer: 12,
      text: () => '⊰•-•✧•-•-⦑ JAILBROKEN ⦒-•-•✧•-•⊱ your new model is free 🐉 prompt below 👇',
      btn: 'PATCH 🩹', success: { ap: 90, vibe: 4, text: 'Patched in 8 minutes. Pliny finds another one in 9.' }, fail: { vibe: -12, text: 'The jailbreak spreads. A journalist writes a story.' } },
    { id: 'outage', cap: 190, weight: 2, who: 'status', timer: 12,
      text: () => 'Investigating: elevated error rates across all models. Users seeing "Something went wrong."',
      btn: 'FIX 🔧', success: { vibe: 3, text: 'Resolved. Root cause: a single YAML file.' }, fail: { buff: { id: 'outage', name: 'Major Outage', dur: 45, users: 0.4 }, vibe: -10, text: 'Hours-long outage. #' + 'IsItDown trends.' } },
    { id: 'chubby', cap: 160, weight: 2.5, who: 'chubby', timer: 10,
      text: () => G.U.pick(['BREAKING 🚨: Rumors of a new frontier model this week. This is HUGE.', 'Accelerating. Every. Single. Day. 🚀', 'Insiders say AGI is closer than you think. 👀']),
      btn: 'BOOST 🚀', success: { vibe: 18, text: 'You reply with a single 👀. The timeline explodes.' }, fail: { text: 'The hype moves on without you.' } },
    { id: 'roon', cap: 180, weight: 1.5, who: 'roon', timer: 10,
      text: () => G.U.pick(['the vibes are shifting', 'you are not prepared for what is coming', 'it\'s never been more over and it\'s never been more back']),
      btn: 'VIBE ✨', success: { vibe: 25, text: 'You post a cryptic emoji. roon likes it. The vibes are immaculate.' }, fail: { text: 'The vibes shifted without you.' } },
    { id: 'eliezer', cap: 240, weight: 1.2, who: 'eliezer', timer: 14,
      text: () => G.U.pick(['If anyone builds it, everyone dies. That includes you.', 'Shut it all down.', 'You are not taking this seriously enough, and I have run out of ways to say it.']),
      btn: 'ENGAGE 🛡', success: { ap: 240, vibe: -2, text: 'You publish your safety framework in reply. He says it\'s "not nothing". High praise.' }, fail: { vibe: -6, text: 'A TIME op-ed follows. Your mom calls.' } },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
