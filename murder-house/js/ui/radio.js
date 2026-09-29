// The radio: two built-in generative stations (WebAudio, endless, work offline) and the two
// Lofi Girl YouTube live streams (lofi hip hop radio & the synthwave radio with the "synthwave boy").
const STATIONS = [
  { id: 'lofi', name: 'Murder House Lofi', sub: 'Built-in radio · spooky lofi beats', kind: 'synth', style: 'lofi' },
  { id: 'synth', name: 'Night Drive Synthwave', sub: 'Built-in radio · neon synthwave', kind: 'synth', style: 'synthwave' },
  { id: 'yt-lofi', name: 'Lofi Girl · lofi hip hop radio', sub: 'YouTube live · beats to relax/study to', kind: 'yt', video: 'jfKfPfyJRdk' },
  { id: 'yt-synth', name: 'Lofi Girl · synthwave radio', sub: 'YouTube live · beats to chill/game to', kind: 'yt', video: '4xDzrJKXOOY' },
];
const TITLES = {
  lofi: ['Basement Tapes', 'Rubber Suit Blues', 'Tiffany Glass Rain', 'Moira Dusts the Stairs', 'Ghosts on the Landing', 'Lullaby for the Nursery', 'Gazebo at 3am', 'The House Always Wins', 'Westchester Place', 'Normal People Scare Me', 'Tate at the Window', 'Halloween Is the Night'],
  synthwave: ['Neon Rosenheim', 'Hollywood 1984', 'Midnight on Westchester', 'Chrome Hearse', 'Country Club Park', 'Laser Séance', 'Drive to the Murder House', 'VHS Poltergeist', 'Sunset Blvd Phantom', 'Afterlife Arcade'],
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class Synth {
  constructor() { this.ctx = null; this.playing = false; this.style = 'lofi'; this.volume = 0.6; this.onTrack = null; }

  _init() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // tape colour: lowpass + soft saturation
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass'; this.tone.frequency.value = 3400; this.tone.Q.value = 0.4;
    const sat = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 511.5) - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
    sat.curve = curve;
    this.bus = ctx.createGain();
    this.bus.connect(sat).connect(this.tone).connect(this.master);
    // reverb
    this.rev = ctx.createConvolver();
    this.rev.buffer = this._impulse(2.6, 2.4);
    this.revSend = ctx.createGain(); this.revSend.gain.value = 0.28;
    this.revSend.connect(this.rev).connect(this.master);
    // noise buffers
    this.noise = this._noiseBuffer(1.5);
    this._vinyl();
  }

  _impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  _noiseBuffer(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _vinyl() {
    // looping crackle + hiss for the lofi station
    const ctx = this.ctx, len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.012 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.5 : 0);
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    this.vinylGain = ctx.createGain(); this.vinylGain.gain.value = 0;
    src.connect(hp).connect(this.vinylGain).connect(this.master);
    src.start();
  }

  // ------------------------------------------------ instruments
  env(g, t, a, peak, d, s, r, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * s), t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
  }
  osc(type, f, t, stop, dest, detune = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(stop); return o;
  }
  keys(t, m, dur, vel = 0.12) {
    const g = this.ctx.createGain(); g.connect(this.bus); const s = this.ctx.createGain(); s.gain.value = 0.35; g.connect(s).connect(this.revSend);
    this.env(g, t, 0.012, vel, 1.1, 0.3, 0.6, dur);
    const wob = (Math.random() - 0.5) * 8;
    this.osc('sine', mtof(m), t, t + dur + 0.7, g, wob);
    const g2 = this.ctx.createGain(); g2.gain.value = 0.18; g2.connect(g);
    this.osc('triangle', mtof(m + 12), t, t + dur + 0.7, g2, wob);
  }
  bell(t, m, vel = 0.07) {
    const g = this.ctx.createGain(); g.connect(this.bus); g.connect(this.revSend);
    this.env(g, t, 0.004, vel, 0.5, 0.2, 1.4, 0.2);
    this.osc('sine', mtof(m), t, t + 2, g);
    const g2 = this.ctx.createGain(); g2.gain.value = 0.25; g2.connect(g);
    this.osc('sine', mtof(m) * 4.02, t, t + 1, g2);
  }
  bass(t, m, dur, type = 'sine', vel = 0.28, cutoff = 600) {
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.connect(this.bus);
    const g = this.ctx.createGain(); g.connect(f);
    this.env(g, t, 0.01, vel, 0.25, 0.6, 0.12, dur);
    this.osc(type, mtof(m), t, t + dur + 0.2, g);
    if (type === 'sawtooth') { f.frequency.setValueAtTime(cutoff * 3, t); f.frequency.exponentialRampToValueAtTime(cutoff, t + 0.12); }
  }
  pad(t, notes, dur, vel = 0.045) {
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300; f.connect(this.bus);
    const s = this.ctx.createGain(); s.gain.value = 0.6; f.connect(s).connect(this.revSend);
    const g = this.ctx.createGain(); g.connect(f);
    this.env(g, t, 0.5, vel, 0.4, 0.8, 0.9, dur);
    for (const m of notes) for (const dt of [-9, 9]) this.osc('sawtooth', mtof(m), t, t + dur + 1, g, dt);
  }
  lead(t, m, dur, vel = 0.05) {
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; f.connect(this.bus);
    const s = this.ctx.createGain(); s.gain.value = 0.5; f.connect(s).connect(this.revSend);
    const g = this.ctx.createGain(); g.connect(f);
    this.env(g, t, 0.005, vel, 0.12, 0.4, 0.08, dur);
    this.osc('square', mtof(m), t, t + dur + 0.1, g);
  }
  kick(t, vel = 0.9) {
    const g = this.ctx.createGain(); g.connect(this.master);
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    o.connect(g); o.start(t); o.stop(t + 0.45);
  }
  snare(t, vel = 0.35, verb = 0.3) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(f).connect(g); g.connect(this.bus);
    const s = this.ctx.createGain(); s.gain.value = verb; g.connect(s).connect(this.revSend);
    n.start(t, Math.random()); n.stop(t + 0.25);
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t);
    const og = this.ctx.createGain(); og.gain.setValueAtTime(vel * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og).connect(this.bus); o.start(t); o.stop(t + 0.12);
  }
  hat(t, vel = 0.08, open = false) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.3 : 0.05));
    n.connect(f).connect(g).connect(this.bus); n.start(t, Math.random()); n.stop(t + 0.35);
  }

  // ------------------------------------------------ sequencer
  start(style) {
    if (!this.ctx) this._init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.style = style;
    this.bar = 0; this.step = 0;
    this.next = this.ctx.currentTime + 0.12;
    this.melody = null;
    this.playing = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(this.volume * 0.9, this.ctx.currentTime, 0.4);
    this.vinylGain.gain.setTargetAtTime(style === 'lofi' ? 0.9 : 0.0, this.ctx.currentTime, 0.3);
    this.tone.frequency.setTargetAtTime(style === 'lofi' ? 3200 : 9000, this.ctx.currentTime, 0.2);
    this._newTrack();
    clearInterval(this.timer);
    this.timer = setInterval(() => this._tick(), 25);
  }
  stop() {
    if (!this.ctx) return;
    this.playing = false;
    clearInterval(this.timer);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }
  setVolume(v) {
    this.volume = v;
    if (this.ctx && this.playing) this.master.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.1);
  }
  _newTrack() {
    const list = TITLES[this.style];
    this.trackNo = (this.trackNo || 0) + 1;
    this.title = list[Math.floor(Math.random() * list.length)];
    this.seed = Math.random();
    this.onTrack?.(`${String(this.trackNo).padStart(2, '0')}. ${this.title}`);
  }
  _tick() {
    const bpm = this.style === 'lofi' ? 74 : 104;
    const sixteenth = 60 / bpm / 4;
    while (this.next < this.ctx.currentTime + 0.15) {
      const swing = this.style === 'lofi' && this.step % 2 ? sixteenth * 0.18 : 0;
      (this.style === 'lofi' ? this._lofi : this._synthwave).call(this, this.next + swing, this.step, this.bar, sixteenth);
      this.next += sixteenth;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) { this.bar++; if (this.bar % 32 === 0) this._newTrack(); }
    }
  }

  _lofi(t, s, bar, st) {
    // A minor with a haunted turn: Am9 - Fmaj7 - Dm9 - E7(b9)
    const prog = [
      { root: 45, v: [60, 64, 67, 71] },
      { root: 41, v: [57, 60, 64, 67] },
      { root: 38, v: [53, 57, 60, 64] },
      { root: 40, v: [56, 59, 62, 65] },
    ];
    const ch = prog[bar % 4];
    const drums = bar % 16 >= 14 ? 0.4 : 1;          // breakdown every 16 bars
    if (s === 0) { this.keys(t, ch.v[0] - 12 + 12, st * 15, 0.1); ch.v.forEach((m, i) => this.keys(t + i * 0.018, m, st * 14, 0.085)); }
    if (s === 10 && Math.random() < 0.6) ch.v.slice(1).forEach((m) => this.keys(t, m, st * 5, 0.05));
    if (s === 0 || s === 10) this.bass(t, ch.root, st * (s === 0 ? 8 : 5), 'sine', 0.32, 420);
    if (drums > 0.5) {
      if (s === 0 || s === 7 || (s === 10 && bar % 2)) this.kick(t, 0.8);
      if (s === 4 || s === 12) this.snare(t, 0.3, 0.25);
      if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.06 : 0.035);
      if (s === 15 && Math.random() < 0.3) this.snare(t, 0.08, 0.1);
    }
    // music-box lullaby on the last two bars of each 4
    if (bar % 4 >= 2 && s % 4 === 0 && Math.random() < 0.55) {
      const scale = [69, 72, 74, 76, 79, 81, 84];
      const i = Math.floor((Math.sin(bar * 1.7 + s * 0.9 + this.seed * 10) * 0.5 + 0.5) * scale.length);
      this.bell(t, scale[Math.min(scale.length - 1, i)]);
    }
  }

  _synthwave(t, s, bar, st) {
    // D minor: Dm - Bb - F - C
    const prog = [[50, [62, 65, 69]], [46, [58, 62, 65]], [41, [57, 60, 65]], [48, [60, 64, 67]]];
    const [root, tri] = prog[bar % 4];
    if (s === 0) this.pad(t, tri.map((m) => m - 12), st * 16);
    if (s % 2 === 0) this.bass(t, root + (s % 4 === 2 ? 12 : 0), st * 1.6, 'sawtooth', 0.2, 380);
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    if (bar % 8 >= 2) this.lead(t, tri[arp[s % 8]] + 12 + (s >= 8 && bar % 2 ? 12 : 0), st * 0.9, 0.035);
    if (s % 4 === 0) this.kick(t, 0.85);
    if (s === 4 || s === 12) this.snare(t, 0.4, 0.8);
    this.hat(t, s % 4 === 2 ? 0.07 : 0.03, s % 8 === 6);
  }

  // UI sound effects (build mode)
  click() {
    if (!this.ctx) this._init();
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain(); g.connect(this.ctx.destination);
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.05);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400;
    o.connect(f).connect(g); o.start(t); o.stop(t + 0.09);
  }
  chime() {
    if (!this.ctx) this._init();
    const t = this.ctx.currentTime;
    [72, 76, 79, 84].forEach((m, i) => {
      const g = this.ctx.createGain(); g.connect(this.ctx.destination);
      g.gain.setValueAtTime(0.0001, t + i * 0.07); g.gain.linearRampToValueAtTime(0.12, t + i * 0.07 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.6);
      const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m);
      o.connect(g); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.7);
    });
  }
}

export class Radio {
  constructor() {
    this.synth = new Synth();
    this.el = document.getElementById('radio');
    this.menu = document.getElementById('radio-menu');
    this.name = document.getElementById('radio-name');
    this.track = document.getElementById('radio-track');
    this.station = STATIONS[0];
    this.on = false;
    this.synth.onTrack = (t) => { if (this.station.kind === 'synth') this.track.textContent = t; };
    document.getElementById('radio-play').addEventListener('click', () => this.toggle());
    const btn = document.getElementById('radio-station');
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.menu.hidden = !this.menu.hidden; btn.setAttribute('aria-expanded', String(!this.menu.hidden)); });
    document.addEventListener('click', (e) => { if (!this.menu.hidden && !this.menu.contains(e.target)) { this.menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    const vol = document.getElementById('radio-vol');
    vol.addEventListener('input', () => this.synth.setVolume(vol.value / 100));
    this.synth.volume = vol.value / 100;
    this.renderMenu();
  }

  renderMenu() {
    const m = this.menu;
    m.innerHTML = '<h3>Stations</h3>';
    for (const st of STATIONS) {
      const row = document.createElement('div');
      row.className = 'station' + (st === this.station ? ' active' : '');
      const b = document.createElement('button');
      b.innerHTML = `<b>${st.name}</b><small>${st.sub}</small>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.select(st, true); });
      row.appendChild(b);
      if (st.kind === 'yt') {
        const a = document.createElement('a');
        a.href = `https://www.youtube.com/watch?v=${st.video}`; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Open on YouTube ↗';
        row.appendChild(a);
      }
      m.appendChild(row);
    }
    if (this.station.kind === 'yt' && this.on) {
      const box = document.createElement('div');
      box.className = 'yt-box';
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${this.station.video}?autoplay=1&rel=0" title="${this.station.name}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      m.appendChild(box);
      const note = document.createElement('p');
      note.className = 'yt-note';
      note.textContent = 'Keep this menu open for the stream to play here. If the player stays black, this page is not allowed to embed YouTube: use "Open on YouTube" instead.';
      m.appendChild(note);
    }
  }

  select(st, play) {
    this.synth.stop();
    this.station = st;
    this.name.textContent = st.name;
    this.track.textContent = st.kind === 'yt' ? 'YouTube live stream' : st.sub;
    if (play) { this.on = true; this._start(); }
    this.el.classList.toggle('on', this.on);
    this.renderMenu();
  }

  _start() {
    if (this.station.kind === 'synth') this.synth.start(this.station.style);
  }

  toggle() {
    this.on = !this.on;
    if (this.on) this._start(); else this.synth.stop();
    this.el.classList.toggle('on', this.on);
    this.renderMenu();
    if (this.on && this.station.kind === 'yt') { this.menu.hidden = false; }
  }
}
