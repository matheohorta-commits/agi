/* Procedural chiptune audio: WebAudio SFX + a small era-reactive music sequencer. No audio files needed. */
(function (root) {
  'use strict';
  const G = root.G;

  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let sfxVol = 0.7, musicVol = 0.45, muted = false;
  const A = (G.Audio = {});

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxVol;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicVol * 0.5;
    musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  A.unlock = () => {
    if (!init()) return;
    if (ctx.state === 'suspended') { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); }
    Music.start();
  };
  A.setVolumes = (sfx, music) => {
    sfxVol = sfx;
    musicVol = music;
    if (sfxBus) sfxBus.gain.value = sfx;
    if (musicBus) musicBus.gain.value = music * 0.5;
  };
  A.setMuted = (m) => {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
  };
  A.isMuted = () => muted;
  A.ready = () => !!ctx && ctx.state === 'running';

  /* ------------------------------------------------------------ primitives */
  function tone(freq, dur, opts) {
    if (!ctx || muted) return;
    const o = opts || {};
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.slide), t + dur);
    const g = ctx.createGain();
    const vol = (o.vol === undefined ? 0.2 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type || 'lowpass';
      f.frequency.value = o.filter.freq || 2000;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function noise(dur, opts) {
    if (!ctx || muted) return;
    const o = opts || {};
    const t = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.ftype || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz

  /* ------------------------------------------------------------ sfx */
  let lastClick = 0;
  A.click = (crit) => {
    const now = performance.now();
    if (now - lastClick < 25) return;
    lastClick = now;
    const base = 660 + Math.random() * 120;
    tone(base, 0.06, { type: 'square', vol: 0.09, slide: 1.5 });
    if (crit) {
      tone(N(84), 0.12, { type: 'square', vol: 0.1, delay: 0.03 });
      tone(N(88), 0.12, { type: 'square', vol: 0.1, delay: 0.07 });
      tone(N(91), 0.2, { type: 'square', vol: 0.1, delay: 0.11 });
    }
  };
  A.buy = () => {
    tone(N(72), 0.07, { type: 'square', vol: 0.09 });
    tone(N(79), 0.1, { type: 'square', vol: 0.09, delay: 0.05 });
  };
  A.bigBuy = () => {
    [72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.12, { type: 'square', vol: 0.09, delay: i * 0.05 }));
  };
  A.error = () => tone(140, 0.15, { type: 'sawtooth', vol: 0.08, slide: 0.7 });
  A.tab = () => tone(N(81), 0.03, { type: 'triangle', vol: 0.08 });
  A.hover = () => tone(N(93), 0.015, { type: 'triangle', vol: 0.03 });
  A.drop = () => {
    [88, 91, 96, 100].forEach((n, i) => tone(N(n), 0.08, { type: 'triangle', vol: 0.08, delay: i * 0.04 }));
  };
  A.catch = () => {
    [76, 83, 88, 95].forEach((n, i) => tone(N(n), 0.1, { type: 'square', vol: 0.08, delay: i * 0.035 }));
    noise(0.15, { freq: 6000, vol: 0.08 });
  };
  A.coin = (i) => tone(N(95 + ((i || 0) % 3) * 2), 0.08, { type: 'square', vol: 0.06, slide: 1.2 });
  A.tweet = () => {
    tone(2400, 0.04, { type: 'sine', vol: 0.05, slide: 1.4 });
    tone(2800, 0.05, { type: 'sine', vol: 0.05, slide: 1.3, delay: 0.06 });
  };
  A.notify = () => {
    tone(N(79), 0.08, { type: 'triangle', vol: 0.09 });
    tone(N(86), 0.14, { type: 'triangle', vol: 0.09, delay: 0.08 });
  };
  A.bad = () => {
    tone(N(60), 0.2, { type: 'sawtooth', vol: 0.07, filter: { freq: 900 } });
    tone(N(55), 0.3, { type: 'sawtooth', vol: 0.07, delay: 0.15, filter: { freq: 700 } });
  };
  A.alarm = () => {
    for (let i = 0; i < 3; i++) {
      tone(880, 0.12, { type: 'square', vol: 0.07, delay: i * 0.25 });
      tone(660, 0.12, { type: 'square', vol: 0.07, delay: i * 0.25 + 0.12 });
    }
  };
  A.trainDone = () => {
    [67, 71, 74, 79, 83].forEach((n, i) => tone(N(n), 0.14, { type: 'square', vol: 0.08, delay: i * 0.06 }));
  };
  A.milestone = () => {
    const seq = [[72, 76, 79], [74, 77, 81], [76, 79, 84]];
    seq.forEach((ch, i) => ch.forEach((n) => tone(N(n), 0.35, { type: 'square', vol: 0.06, delay: i * 0.18 })));
    tone(N(48), 0.9, { type: 'triangle', vol: 0.15 });
  };
  A.achievement = () => {
    [84, 88, 91, 96].forEach((n, i) => tone(N(n), 0.12, { type: 'triangle', vol: 0.09, delay: i * 0.07 }));
  };
  A.prestige = () => {
    [48, 55, 60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.6, { type: 'triangle', vol: 0.08, delay: i * 0.09 }));
    noise(1.5, { freq: 300, sweep: 5000, vol: 0.12, q: 0.5 });
  };
  A.whoosh = () => noise(0.4, { freq: 400, sweep: 4000, vol: 0.12, q: 0.7 });

  /* pack opening: continuous charge tone controlled by progress */
  let charge = null;
  A.chargeStart = () => {
    if (!ctx || muted || charge) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 9;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 6;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    osc.connect(f);
    f.connect(g);
    g.connect(sfxBus);
    osc.start();
    lfo.start();
    charge = { osc, lfo, g, f, lfoG };
  };
  A.chargeSet = (p) => {
    if (!charge) return;
    const t = ctx.currentTime;
    charge.osc.frequency.setTargetAtTime(110 + p * p * 880, t, 0.03);
    charge.f.frequency.setTargetAtTime(500 + p * 4000, t, 0.03);
    charge.lfo.frequency.setTargetAtTime(6 + p * 24, t, 0.05);
    charge.lfoG.gain.setTargetAtTime(4 + p * 30, t, 0.05);
    charge.g.gain.setTargetAtTime(0.02 + p * 0.1, t, 0.03);
  };
  A.chargeStop = () => {
    if (!charge) return;
    const c = charge;
    charge = null;
    const t = ctx.currentTime;
    c.g.gain.setTargetAtTime(0.0001, t, 0.04);
    c.osc.stop(t + 0.3);
    c.lfo.stop(t + 0.3);
  };
  A.crack = () => {
    noise(0.12, { freq: 3500, vol: 0.25, q: 2 });
    tone(1800, 0.05, { type: 'square', vol: 0.06, slide: 0.5 });
  };
  A.boom = (rarity) => {
    noise(1.2, { freq: 200, sweep: 60, vol: 0.5, ftype: 'lowpass', q: 0.8 });
    tone(90, 0.8, { type: 'sine', vol: 0.4, slide: 0.35 });
    noise(0.5, { freq: 5000, sweep: 800, vol: 0.2 });
    if (rarity >= 2) tone(45, 1.5, { type: 'triangle', vol: 0.3, slide: 0.6 });
  };
  A.reveal = (rarity) => {
    const scales = [
      [72, 76, 79],
      [72, 76, 79, 84],
      [74, 78, 81, 86, 90],
      [72, 76, 79, 84, 88, 91, 96],
      [72, 75, 79, 82, 86, 89, 93, 96, 100],
    ];
    const seq = scales[rarity] || scales[0];
    seq.forEach((n, i) => tone(N(n), 0.25 + rarity * 0.05, { type: rarity >= 3 ? 'square' : 'triangle', vol: 0.09, delay: i * 0.07 }));
    if (rarity >= 3) seq.forEach((n, i) => tone(N(n - 12), 0.4, { type: 'triangle', vol: 0.07, delay: 0.5 + i * 0.05 }));
  };
  A.asi = () => {
    const chords = [[48, 55, 64, 67], [53, 60, 69, 72], [55, 62, 71, 74], [60, 67, 76, 79, 84]];
    chords.forEach((ch, i) => ch.forEach((n) => tone(N(n), 1.6, { type: 'triangle', vol: 0.07, delay: i * 0.9, attack: 0.2 })));
    noise(4, { freq: 200, sweep: 8000, vol: 0.1, q: 0.3 });
  };

  /* ------------------------------------------------------------ music sequencer */
  const THEMES = {
    garage: { bpm: 92, root: 57, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], arp: [0, 1, 2, 1], swing: 0, hats: 0.2, lead: false },
    startup: { bpm: 104, root: 57, prog: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]], arp: [0, 1, 2, 3, 2, 1], hats: 0.5, lead: false },
    datacenter: { bpm: 116, root: 55, prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], arp: [0, 2, 1, 2], hats: 0.8, lead: true },
    campus: { bpm: 124, root: 52, prog: [[0, 3, 7], [3, 7, 10], [-2, 2, 5], [-4, 0, 3]], arp: [0, 1, 2, 1, 2, 0], hats: 1, lead: true },
    takeoff: { bpm: 138, root: 50, prog: [[0, 3, 7], [1, 5, 8], [-2, 2, 5], [-4, 0, 3]], arp: [0, 2, 1, 2, 0, 1, 2, 1], hats: 1, lead: true },
    asi: { bpm: 84, root: 48, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], arp: [0, 1, 2, 3, 2, 1], hats: 0.3, lead: true },
    asi_bad: { bpm: 76, root: 46, prog: [[0, 3, 6], [1, 4, 7], [0, 3, 6], [-1, 3, 6]], arp: [0, 2, 1], hats: 0.2, lead: false },
    dyson: { bpm: 96, root: 45, prog: [[0, 4, 7, 11], [2, 5, 9, 12], [4, 7, 11, 14], [5, 9, 12, 16]], arp: [0, 1, 2, 3], hats: 0.5, lead: true },
    galaxy: { bpm: 72, root: 43, prog: [[0, 7, 14, 16], [5, 12, 16, 19], [3, 10, 14, 17], [7, 14, 17, 21]], arp: [0, 2, 1, 3], hats: 0.1, lead: true },
  };
  const Music = (A.Music = {
    theme: 'garage',
    playing: false,
    step: 0,
    nextTime: 0,
    timer: null,
    intensity: 0,
    setTheme(t) {
      if (THEMES[t]) this.theme = t;
    },
    start() {
      if (!ctx || this.playing) return;
      this.playing = true;
      this.nextTime = ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 25);
    },
    stop() {
      this.playing = false;
      clearInterval(this.timer);
    },
    schedule() {
      if (!ctx || musicVol <= 0.001 || muted) {
        if (ctx) this.nextTime = ctx.currentTime + 0.1;
        return;
      }
      const th = THEMES[this.theme];
      const stepDur = 60 / th.bpm / 4; // 16th notes
      while (this.nextTime < ctx.currentTime + 0.12) {
        this.play(th, this.step, this.nextTime, stepDur);
        this.step++;
        this.nextTime += stepDur;
      }
    },
    play(th, step, t, sd) {
      const bar = Math.floor(step / 16) % th.prog.length;
      const chord = th.prog[bar];
      const s16 = step % 16;
      const delay = Math.max(0, t - ctx.currentTime);
      const opts = (o) => Object.assign({ bus: musicBus, delay }, o);
      // bass on quarter notes
      if (s16 % 4 === 0) tone(N(th.root - 12 + chord[0]), sd * 3.5, opts({ type: 'triangle', vol: 0.22 }));
      // arpeggio on 8ths
      if (s16 % 2 === 0) {
        const idx = th.arp[(step / 2) % th.arp.length | 0] % chord.length;
        tone(N(th.root + 12 + chord[idx]), sd * 1.6, opts({ type: 'square', vol: 0.045, filter: { freq: 2400 } }));
      }
      // pad on bar start
      if (s16 === 0) chord.forEach((n) => tone(N(th.root + n), sd * 15, opts({ type: 'sawtooth', vol: 0.018, attack: 0.3, filter: { freq: 900 } })));
      // hats
      if (th.hats > 0 && s16 % 2 === 1 && Math.random() < th.hats) noise(0.03, { freq: 8000, vol: 0.035, q: 0.7, bus: musicBus, delay });
      if (th.hats > 0.4 && s16 % 8 === 4) noise(0.12, { freq: 1800, vol: 0.08, q: 0.9, bus: musicBus, delay });
      // lead melody (random walk on chord tones), sparse
      if (th.lead && s16 % 4 === 2 && Math.random() < 0.35 + this.intensity * 0.3) {
        const n = chord[Math.floor(Math.random() * chord.length)] + 24 + (Math.random() < 0.3 ? 2 : 0);
        tone(N(th.root + n), sd * 2.5, opts({ type: 'square', vol: 0.03, filter: { freq: 3000 } }));
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
