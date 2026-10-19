'use strict';

/* =========================================================
   SECURITY GUARD — áudio

   1. AUDIO ............ caminhos dos ficheiros de som (assets/sfx/...)
   2. AUDIO_SETTINGS ... probabilidades, tempos e níveis do sound design
   3. D + RECIPES ...... sons gerados pelo próprio jogo (reserva)
   4. audioManager ..... toca sons, loops, volumes, prioridades
   5. soundDirector .... decide QUANDO tocar o quê (atmosfera e tensão)

   Para trocar um som: substitui o ficheiro em assets/sfx/ por outro
   com o mesmo nome (ou muda o caminho aqui em AUDIO).
   Os loops estão em .wav porque o .ogg acrescenta um bocadinho de
   silêncio no fim e o loop ficava com um "salto".
   Se um ficheiro faltar, o jogo usa um som gerado e avisa na consola.
   ========================================================= */


/* ---------------------------------------------------------
   1. FICHEIROS DE SOM
   Listas [a, b, c] = variações: o jogo escolhe uma ao calhas.
   --------------------------------------------------------- */

const SFX_PATH = 'assets/sfx/';

const AUDIO = {
  ambience: {
    hum:   SFX_PATH + 'ambience/building_hum.wav',      // loop: hum elétrico + máquinas
    vent:  SFX_PATH + 'ambience/ventilation.wav',       // loop: ventilação
    drone: SFX_PATH + 'ambience/pressure_drone.wav',    // loop: pressão (perigo perto)
    late:  SFX_PATH + 'ambience/late_night.wav',        // loop: camada das 4–6 AM
    metalCreak: [
      SFX_PATH + 'ambience/metal_creak_01.ogg',
      SFX_PATH + 'ambience/metal_creak_02.ogg',
      SFX_PATH + 'ambience/metal_creak_03.ogg'
    ],
    pipeKnock: [
      SFX_PATH + 'ambience/pipe_knock_01.ogg',
      SFX_PATH + 'ambience/pipe_knock_02.ogg'
    ],
    distantThud: [
      SFX_PATH + 'ambience/distant_thud_01.ogg',
      SFX_PATH + 'ambience/distant_thud_02.ogg'
    ],
    electricCrackle: [
      SFX_PATH + 'ambience/electric_crackle_01.ogg',
      SFX_PATH + 'ambience/electric_crackle_02.ogg'
    ],
    ventGust:       [SFX_PATH + 'ambience/vent_gust_01.ogg'],
    farDrop:        [SFX_PATH + 'ambience/far_drop_01.ogg'],
    ambiguousSteps: [SFX_PATH + 'ambience/ambiguous_steps_01.ogg']
  },

  cameras: {
    open:  SFX_PATH + 'cameras/monitor_open.ogg',
    close: SFX_PATH + 'cameras/monitor_close.ogg',
    switch: [
      SFX_PATH + 'cameras/switch_01.ogg',
      SFX_PATH + 'cameras/switch_02.ogg',
      SFX_PATH + 'cameras/switch_03.ogg'
    ],
    staticLoop: SFX_PATH + 'cameras/static_loop.wav',   // loop
    crtHum:     SFX_PATH + 'cameras/crt_hum.wav',       // loop
    interference: [
      SFX_PATH + 'cameras/interference_01.ogg',
      SFX_PATH + 'cameras/interference_02.ogg'
    ]
  },

  office: {
    doorClose: SFX_PATH + 'office/door_close.ogg',
    doorOpen:  SFX_PATH + 'office/door_open.ogg',
    doorBang: [
      SFX_PATH + 'office/door_bang_01.ogg',
      SFX_PATH + 'office/door_bang_02.ogg'
    ],
    lightOn:   SFX_PATH + 'office/light_on.ogg',
    lightOff:  SFX_PATH + 'office/light_off.ogg',
    lightBuzz: SFX_PATH + 'office/light_buzz.wav',      // loop
    powerDown: SFX_PATH + 'office/power_down.ogg',
    doorBreach: SFX_PATH + 'office/door_breach.ogg',    // Morrow a arrombar a porta
    ventRattle: SFX_PATH + 'office/vent_rattle.wav',    // loop: grelha da vent a vibrar
    ventPush: [
      SFX_PATH + 'office/vent_push_01.ogg',
      SFX_PATH + 'office/vent_push_02.ogg'
    ],
    ventGrab: SFX_PATH + 'office/vent_grab.ogg'
  },

  monsters: {
    blackStep: [
      SFX_PATH + 'monsters/black_step_01.ogg',
      SFX_PATH + 'monsters/black_step_02.ogg',
      SFX_PATH + 'monsters/black_step_03.ogg'
    ],
    blackDrag: [
      SFX_PATH + 'monsters/black_drag_01.ogg',
      SFX_PATH + 'monsters/black_drag_02.ogg'
    ],
    blackMetal:  [SFX_PATH + 'monsters/black_metal_01.ogg'],
    blackRumble: [SFX_PATH + 'monsters/black_rumble_01.ogg'],
    blackBreath: [
      SFX_PATH + 'monsters/black_breath_01.ogg',
      SFX_PATH + 'monsters/black_breath_02.ogg'
    ],
    watcherGlitch: [
      SFX_PATH + 'monsters/watcher_glitch_01.ogg',
      SFX_PATH + 'monsters/watcher_glitch_02.ogg',
      SFX_PATH + 'monsters/watcher_glitch_03.ogg'
    ],
    watcherWhine: SFX_PATH + 'monsters/watcher_whine.wav',  // loop
    watcherCrackle: [
      SFX_PATH + 'monsters/watcher_crackle_01.ogg',
      SFX_PATH + 'monsters/watcher_crackle_02.ogg'
    ],
    morrowBreath: SFX_PATH + 'monsters/morrow_breath.wav',   // loop
    morrowChain: [
      SFX_PATH + 'monsters/morrow_chain_01.ogg',
      SFX_PATH + 'monsters/morrow_chain_02.ogg'
    ],
    morrowShift: [
      SFX_PATH + 'monsters/morrow_shift_01.ogg',
      SFX_PATH + 'monsters/morrow_shift_02.ogg'
    ],
    morrowGrowl: [
      SFX_PATH + 'monsters/morrow_growl_01.ogg',
      SFX_PATH + 'monsters/morrow_growl_02.ogg'
    ],
    morrowClaw: [
      SFX_PATH + 'monsters/morrow_claw_01.ogg',
      SFX_PATH + 'monsters/morrow_claw_02.ogg'
    ],
    morrowWake:  SFX_PATH + 'monsters/morrow_wake.ogg',
    morrowStand: SFX_PATH + 'monsters/morrow_stand.ogg',
    morrowRunQuad: [
      SFX_PATH + 'monsters/morrow_run_quad_01.ogg',
      SFX_PATH + 'monsters/morrow_run_quad_02.ogg'
    ],
    morrowRunBiped: [
      SFX_PATH + 'monsters/morrow_run_biped_01.ogg',
      SFX_PATH + 'monsters/morrow_run_biped_02.ogg'
    ],
    morrowImpact: SFX_PATH + 'monsters/morrow_impact.ogg',
    echoClick: [
      SFX_PATH + 'monsters/echo_click_01.ogg',
      SFX_PATH + 'monsters/echo_click_02.ogg'
    ],
    echoShift: [
      SFX_PATH + 'monsters/echo_shift_01.ogg',
      SFX_PATH + 'monsters/echo_shift_02.ogg'
    ],
    echoScratch: [
      SFX_PATH + 'monsters/echo_scratch_01.ogg',
      SFX_PATH + 'monsters/echo_scratch_02.ogg',
      SFX_PATH + 'monsters/echo_scratch_03.ogg'
    ],
    echoVentMetal: [
      SFX_PATH + 'monsters/echo_vent_metal_01.ogg',
      SFX_PATH + 'monsters/echo_vent_metal_02.ogg'
    ],
    echoBreath: [
      SFX_PATH + 'monsters/echo_breath_01.ogg',
      SFX_PATH + 'monsters/echo_breath_02.ogg'
    ],
    echoRetreat: SFX_PATH + 'monsters/echo_retreat.ogg'
  },

  jumpscares: {
    black:   SFX_PATH + 'jumpscares/black.ogg',
    watcher: SFX_PATH + 'jumpscares/watcher.ogg',
    morrow:  SFX_PATH + 'jumpscares/morrow.ogg',
    echo:    SFX_PATH + 'jumpscares/echo.ogg'
  },

  ui: {
    click:      SFX_PATH + 'ui/click.ogg',
    nightStart: SFX_PATH + 'ui/night_start.ogg',
    sixAm:      SFX_PATH + 'ui/six_am.ogg'
  }
};

// Sons que tocam em loop (o resto toca uma vez)
const LOOPING_SOUNDS = new Set([
  'ambience.hum', 'ambience.vent', 'ambience.drone', 'ambience.late',
  'cameras.staticLoop', 'cameras.crtHum', 'office.lightBuzz', 'monsters.watcherWhine',
  'monsters.morrowBreath', 'office.ventRattle'
]);

// Prioridades: quando há demasiados sons ao mesmo tempo, os mais baixos cedem
const PRIORITY = { low: 1, medium: 2, high: 3, highest: 4 };


/* ---------------------------------------------------------
   2. AFINAÇÃO DO SOUND DESIGN
   --------------------------------------------------------- */

const AUDIO_SETTINGS = {
  defaultVolumes: { master: 1, sfx: 0.8, ambience: 0.45 },
  maxVoices: 16,                 // máximo de sons curtos em simultâneo

  ambientEvents: {
    minDelay: 8,                 // segundos entre eventos aleatórios
    maxDelay: 25,
    lateMinDelay: 7,             // 4–6 AM: um pouco mais irregular
    lateMaxDelay: 22,
    silenceChance: 0.25,         // às vezes não toca nada (silêncio também assusta)
    pool: [                      // pesos diferentes: nem todos acontecem com a mesma frequência
      { id: 'ambience.metalCreak',      weight: 5,   gain: [0.35, 0.75], pitch: true },
      { id: 'ambience.pipeKnock',       weight: 4,   gain: [0.3, 0.65],  pitch: true },
      { id: 'ambience.ventGust',        weight: 3,   gain: [0.35, 0.7],  pitch: true },
      { id: 'ambience.distantThud',     weight: 3,   gain: [0.4, 0.8],   pitch: true },
      { id: 'ambience.electricCrackle', weight: 2,   gain: [0.25, 0.5],  pitch: true },
      { id: 'ambience.farDrop',         weight: 1.5, gain: [0.3, 0.6],   pitch: true },
      { id: 'ambience.ambiguousSteps',  weight: 1,   gain: [0.3, 0.55],  pitch: false }
    ]
  },

  // Probabilidade de um movimento de monstro gerar uma pista sonora,
  // conforme a distância à porta (1 = última câmara, 2 = penúltima, 3+ = longe)
  monsterCues: {
    black:   { far: 0.04, near: 0.22, close: 0.32, atDoor: 0.45, retreat: 0.35 },
    watcher: { far: 0.15, near: 0.22, close: 0.3,  atDoor: 0.45 }
  },

  pressure: {
    riseSeconds: 7,              // o drone sobe devagar...
    fallSeconds: 9,              // ...e desce ainda mais devagar
    maxLevel: 0.8,
    lateBonus: 0.12              // 4–6 AM: um fundo de pressão sempre presente
  },

  watcherStare: {
    maxWhine: 0.7,               // nível máximo da interferência aguda (nunca irritante)
    fullAtExposure: 6
  },

  // Morrow: o que se ouve dele depende da raiva e de estares a ver a CAM 07
  // (a câmara tem microfone: a ver, ouves de perto; sem ver, só muito ao longe)
  morrow: {
    breathWatched: { sleeping: 0.32, restless: 0.42, awake: 0.52, standing: 0.65 },
    breathDistant: { sleeping: 0,    restless: 0.03, awake: 0.07, standing: 0.14 },
    breathRate:    { sleeping: 1,    restless: 1.12, awake: 1.25, standing: 1.42 },
    // segundos entre pequenos sons (correntes, rosnar, garras) em cada fase
    cueDelay: { sleeping: [16, 30], restless: [6, 12], awake: [4, 8], standing: [1.6, 3.2] },
    cueGainWatched: 0.5,
    cueGainDistant: 0.16
  },

  // Echo: nas vents ouve-se mais quanto mais perto estiver (A longe, C ao lado da sala)
  echo: {
    ventGain: { ventA: 0.1, ventB: 0.22, ventC: 0.42 },
    watchedBoost: 1.6,          // a ver a câmara dele, ouves melhor (microfone da vent)
    cueDelay: [3, 7],           // segundos entre pequenos sons dentro das vents
    moveCueChance: 0.7          // hipótese de um movimento nas vents se ouvir
  },

  preAttackSilenceChance: 0.4,   // às vezes o som desaparece mesmo antes do ataque
  pitchRange: [0.94, 1.06]
};


/* ---------------------------------------------------------
   3. SONS GERADOS (reserva quando falta um ficheiro)
   Pequena "caixa de ferramentas" de síntese + uma receita por som.
   --------------------------------------------------------- */

const TWO_PI = Math.PI * 2;

const D = {
  rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  buf(sr, seconds) {
    return new Float32Array(Math.max(1, Math.round(sr * seconds)));
  },

  noise(rnd, n, color = 'white') {
    const out = new Float32Array(n);
    if (color === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < n; i++) {
        const w = rnd() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
      }
    } else if (color === 'brown') {
      let last = 0;
      for (let i = 0; i < n; i++) {
        last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02;
        out[i] = last;
      }
    } else {
      for (let i = 0; i < n; i++) out[i] = rnd() * 2 - 1;
    }
    return D.normalize(out, 1);
  },

  // Curva aleatória suave entre -1 e 1 (para modular volumes devagar)
  smooth(rnd, sr, seconds, rate) {
    const n = Math.max(1, Math.round(sr * seconds));
    const out = new Float32Array(n);
    const step = Math.max(1, Math.round(sr / rate));
    let a = rnd() * 2 - 1;
    let b = rnd() * 2 - 1;
    for (let i = 0; i < n; i++) {
      if (i > 0 && i % step === 0) { a = b; b = rnd() * 2 - 1; }
      const k = (i % step) / step;
      out[i] = a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * k));
    }
    return out;
  },

  // Filtro biquad (lowpass / highpass / bandpass). freq pode ser uma função do tempo.
  filter(data, sr, type, freq, q = 0.707) {
    const coeffs = (f) => {
      f = Math.min(Math.max(f, 20), sr * 0.45);
      const w0 = TWO_PI * f / sr;
      const cos = Math.cos(w0);
      const alpha = Math.sin(w0) / (2 * q);
      let b0, b1, b2;
      if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
      else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
      else { b0 = alpha; b1 = 0; b2 = -alpha; }
      const a0 = 1 + alpha;
      return [b0 / a0, b1 / a0, b2 / a0, (-2 * cos) / a0, (1 - alpha) / a0];
    };
    const dynamic = typeof freq === 'function';
    let c = coeffs(dynamic ? freq(0) : freq);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < data.length; i++) {
      if (dynamic && i % 64 === 0) c = coeffs(freq(i / sr));
      const x = data[i];
      const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      data[i] = y;
    }
    return data;
  },

  // Soma um oscilador. freq e amp podem ser números ou funções do tempo (t local).
  tone(out, sr, o) {
    const s0 = Math.round((o.start || 0) * sr);
    const n = Math.round(o.dur * sr);
    const fFn = typeof o.freq === 'function';
    const aFn = typeof o.amp === 'function';
    let ph = o.phase || 0;
    for (let i = 0; i < n && s0 + i < out.length; i++) {
      const t = i / sr;
      ph += (fFn ? o.freq(t) : o.freq) / sr;
      ph -= Math.floor(ph);
      let v;
      if (o.type === 'saw') v = 2 * ph - 1;
      else if (o.type === 'square') v = ph < 0.5 ? 1 : -1;
      else v = Math.sin(TWO_PI * ph);
      out[s0 + i] += v * (aFn ? o.amp(t) : o.amp);
    }
    return out;
  },

  // Soma um pedaço de ruído filtrado com envelope
  burst(out, sr, rnd, o) {
    const s0 = Math.round((o.start || 0) * sr);
    const n = Math.min(Math.round(o.dur * sr), out.length - s0);
    if (n <= 0) return out;
    const tmp = D.noise(rnd, n, o.color || 'white');
    (o.filters || []).forEach(([type, f, q]) => D.filter(tmp, sr, type, f, q));
    D.normalize(tmp, 1);
    for (let i = 0; i < n; i++) out[s0 + i] += tmp[i] * o.amp(i / sr);
    return out;
  },

  exp: (t, tau) => Math.exp(-t / tau),

  mix(out, src, startSec, gain, sr) {
    const s0 = Math.round((startSec || 0) * (sr || 1));
    for (let i = 0; i < src.length && s0 + i < out.length; i++) out[s0 + i] += src[i] * gain;
    return out;
  },

  modulate(data, mod, depth) {
    for (let i = 0; i < data.length; i++) data[i] *= 1 + depth * mod[i % mod.length];
    return data;
  },

  drive(data, amount) {
    const norm = Math.tanh(amount);
    for (let i = 0; i < data.length; i++) data[i] = Math.tanh(data[i] * amount) / norm;
    return data;
  },

  crush(data, bits, hold) {
    const steps = Math.pow(2, bits - 1);
    let held = 0;
    for (let i = 0; i < data.length; i++) {
      if (i % hold === 0) held = Math.round(data[i] * steps) / steps;
      data[i] = held;
    }
    return data;
  },

  normalize(data, peak) {
    const chans = Array.isArray(data) ? data : [data];
    let max = 0;
    chans.forEach((ch) => { for (let i = 0; i < ch.length; i++) max = Math.max(max, Math.abs(ch[i])); });
    if (max > 0) chans.forEach((ch) => { for (let i = 0; i < ch.length; i++) ch[i] *= peak / max; });
    return data;
  },

  fade(data, sr, inSec, outSec) {
    const fi = Math.round(inSec * sr);
    const fo = Math.round(outSec * sr);
    for (let i = 0; i < fi && i < data.length; i++) data[i] *= i / fi;
    for (let i = 0; i < fo && i < data.length; i++) data[data.length - 1 - i] *= i / fo;
    return data;
  },

  // Junta o fim ao início para o loop não ter "salto"
  loopify(data, sr, fadeSec) {
    const f = Math.round(fadeSec * sr);
    const n = data.length - f;
    const out = data.slice(0, n);
    for (let i = 0; i < f; i++) {
      const k = i / f;
      out[i] = data[i] * Math.sin(k * Math.PI / 2) + data[n + i] * Math.cos(k * Math.PI / 2);
    }
    return out;
  }
};

// Ajudantes de "instrumentos" reutilizáveis
function addThump(out, sr, start, f1, f2, tau, amp) {
  D.tone(out, sr, {
    start, dur: tau * 6,
    freq: (t) => f2 + (f1 - f2) * Math.exp(-t / (tau * 0.6)),
    amp: (t) => amp * Math.exp(-t / tau)
  });
}

function addMetal(out, sr, start, base, ratios, amps, tau, amp) {
  ratios.forEach((r, i) => {
    D.tone(out, sr, {
      start, dur: tau * 5, freq: base * r,
      amp: (t) => amp * amps[i] * Math.exp(-t / (tau / (1 + i * 0.35)))
    });
  });
}

function addClick(out, sr, rnd, start, freq, amp) {
  D.burst(out, sr, rnd, { start, dur: 0.004, amp: (t) => amp * Math.exp(-t / 0.0012), filters: [['highpass', 1800]] });
  D.tone(out, sr, { start, dur: 0.03, freq, amp: (t) => amp * 0.6 * Math.exp(-t / 0.004) });
}

function stereoLoop(sr, seconds, fadeSec, peak, makeChannel) {
  const n = Math.round((seconds + fadeSec) * sr);
  const chans = [0, 1].map((ch) => D.loopify(makeChannel(ch, n), sr, fadeSec));
  return D.normalize(chans, peak);
}

function mono(data, peak) {
  return [D.normalize(data, peak)];
}

// Pedaços de "voz" distorcida (para os jumpscares)
function screamVoice(sr, rnd, dur, contour, formants, drive) {
  const n = Math.round(dur * sr);
  const src = new Float32Array(n);
  const jitter = D.smooth(rnd, sr, dur, 30);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f0 = contour(t) + 16 * Math.sin(TWO_PI * 6.5 * t) + 22 * jitter[i];
    ph += f0 / sr;
    ph -= Math.floor(ph);
    src[i] = 2 * ph - 1;
  }
  const voice = new Float32Array(n);
  formants.forEach(([f, q, g]) => D.mix(voice, D.filter(src.slice(), sr, 'bandpass', f, q), 0, g));
  D.burst(voice, sr, rnd, { dur, amp: () => 0.25, filters: [['bandpass', 1600, 0.8]] });
  D.normalize(voice, 1);
  return D.drive(voice, drive);
}

// Uma receita por som. Cada uma devolve [canal] ou [esquerdo, direito].
const RECIPES = {
  /* ----- Ambiente (loops) ----- */
  'ambience.hum': ({ sr, rnd }) => stereoLoop(sr, 16, 1.5, 0.5, (ch, n) => {
    const out = new Float32Array(n);
    const wob = D.smooth(rnd, sr, n / sr, 0.3);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const w = 1 + 0.3 * wob[i];
      out[i] = w * (0.1 * Math.sin(TWO_PI * 50 * t + ch) + 0.07 * Math.sin(TWO_PI * 100 * t + 0.3) +
        0.045 * Math.sin(TWO_PI * 150 * t + 1.1) + 0.028 * Math.sin(TWO_PI * 200 * t + 2) +
        0.014 * Math.sin(TWO_PI * 250 * t + ch));
    }
    const buzz = new Float32Array(n);
    for (let i = 0; i < n; i++) buzz[i] = Math.tanh(4 * Math.sin(TWO_PI * 100 * i / sr));
    D.mix(out, D.normalize(D.filter(buzz, sr, 'bandpass', 420, 1.2), 1), 0, 0.03);
    const air = D.noise(rnd, n, 'brown');
    D.filter(air, sr, 'lowpass', 380); D.filter(air, sr, 'highpass', 35);
    D.modulate(air, D.smooth(rnd, sr, n / sr, 0.1), 0.3);
    D.mix(out, D.normalize(air, 1), 0, 0.35);
    const rumble = D.noise(rnd, n, 'brown');
    D.filter(rumble, sr, 'lowpass', 90);
    D.modulate(rumble, D.smooth(rnd, sr, n / sr, 0.35), 0.4);
    D.mix(out, D.normalize(rumble, 1), 0, 0.3);
    return out;
  }),

  'ambience.vent': ({ sr, rnd }) => stereoLoop(sr, 12, 1.5, 0.35, (ch, n) => {
    const air = D.noise(rnd, n, 'pink');
    D.filter(air, sr, 'bandpass', 850, 0.6); D.filter(air, sr, 'highpass', 180);
    D.normalize(air, 1);
    D.modulate(air, D.smooth(rnd, sr, n / sr, 0.18), 0.45);
    const rs = Math.round(sr * (4 + rnd() * 4));
    const rl = Math.round(sr * 1.6);
    for (let i = 0; i < rl && rs + i < n; i++) {
      const env = Math.sin(Math.PI * i / rl);
      air[rs + i] *= 1 + 0.35 * env * Math.sin(TWO_PI * 19 * i / sr);
    }
    return air;
  }),

  'ambience.drone': ({ sr, rnd }) => stereoLoop(sr, 10, 1.5, 0.6, (ch, n) => {
    const out = new Float32Array(n);
    const partials = [[41.2, 0.5], [41.8 + ch * 0.3, 0.4], [55, 0.25], [82.4 + ch * 0.4, 0.18], [116.5, 0.06], [164.8, 0.05]];
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      partials.forEach(([f, a]) => { v += a * Math.sin(TWO_PI * f * t); });
      out[i] = v;
    }
    const rumble = D.noise(rnd, n, 'brown');
    D.filter(rumble, sr, 'lowpass', 110);
    D.mix(out, D.normalize(rumble, 1), 0, 0.35);
    D.modulate(out, D.smooth(rnd, sr, n / sr, 0.12), 0.2);
    return out;
  }),

  'ambience.late': ({ sr, rnd }) => stereoLoop(sr, 14, 1.5, 0.4, (ch, n) => {
    const out = new Float32Array(n);
    const swell = D.noise(rnd, n, 'pink');
    D.filter(swell, sr, 'bandpass', 320, 1.5);
    D.normalize(swell, 1);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const breathe = Math.max(0, Math.sin(TWO_PI * t / 3.7 + ch));
      out[i] += swell[i] * (0.2 + 0.8 * breathe * breathe) * 0.5;
      out[i] += 0.012 * (Math.sin(TWO_PI * 1860 * t) + Math.sin(TWO_PI * (1953 + ch * 3) * t)) * (0.6 + 0.4 * Math.sin(TWO_PI * 0.4 * t));
    }
    for (let k = 0; k < 6; k++) {
      const start = rnd() * (n / sr - 0.2);
      D.burst(out, sr, rnd, { start, dur: 0.08, amp: () => (rnd() < 0.08 ? 0.5 : 0), filters: [['highpass', 1500]] });
    }
    for (let k = 0; k < 2; k++) addThump(out, sr, rnd() * (n / sr - 1.5), 48, 36, 0.3, 0.35);
    return out;
  }),

  /* ----- Eventos ambientais ----- */
  'ambience.metalCreak': ({ sr, rnd }) => {
    const dur = 1.3 + rnd() * 0.9;
    const out = D.buf(sr, dur);
    const exc = new Float32Array(out.length);
    const base = 14 + rnd() * 14;
    const glide = (rnd() * 2 - 1) * 12;
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const k = i / out.length;
      const rate = Math.max(4, base + glide * k + 5 * Math.sin(TWO_PI * 0.8 * k * dur) + (rnd() - 0.5) * 6);
      ph += rate / sr;
      if (ph >= 1) { ph -= 1; exc[i] = 0.6 + 0.4 * rnd(); }
    }
    [[380 + rnd() * 200, 1], [1050 + rnd() * 400, 0.6], [2300 + rnd() * 700, 0.35]].forEach(([f, a]) => {
      D.mix(out, D.filter(exc.slice(), sr, 'bandpass', f, 12), 0, a);
    });
    D.filter(out, sr, 'lowpass', 4500);
    for (let i = 0; i < out.length; i++) out[i] *= Math.pow(Math.sin(Math.PI * i / out.length), 0.6);
    return mono(out, 0.6);
  },

  'ambience.pipeKnock': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.1);
    const base = 170 + rnd() * 90;
    let t = 0.02;
    const count = 2 + Math.floor(rnd() * 2);
    for (let j = 0; j < count; j++) {
      const amp = 1 - j * 0.2;
      D.burst(out, sr, rnd, { start: t, dur: 0.006, amp: (x) => amp * Math.exp(-x / 0.002), filters: [['highpass', 800]] });
      addMetal(out, sr, t, base, [1, 2.76, 5.4, 8.9], [1, 0.5, 0.25, 0.12], 0.18, amp * 0.7);
      t += 0.12 + rnd() * 0.15;
    }
    D.filter(out, sr, 'lowpass', 3500);
    return mono(out, 0.6);
  },

  'ambience.distantThud': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.4);
    addThump(out, sr, 0.01, 52 + rnd() * 10, 34, 0.25, 1);
    D.burst(out, sr, rnd, { start: 0.01, dur: 0.5, color: 'brown', amp: (t) => 0.6 * Math.exp(-t / 0.12), filters: [['lowpass', 180]] });
    D.burst(out, sr, rnd, { start: 0.03, dur: 1.3, color: 'pink', amp: (t) => 0.15 * Math.exp(-t / 0.5), filters: [['lowpass', 300]] });
    D.filter(out, sr, 'lowpass', 600);
    return mono(out, 0.6);
  },

  'ambience.electricCrackle': ({ sr, rnd }) => {
    const dur = 0.9;
    const out = D.buf(sr, dur);
    for (let i = 0; i < out.length; i++) {
      const rate = 220 * Math.pow(Math.sin(Math.PI * i / out.length), 2);
      if (rnd() < rate / sr) out[i] = (rnd() < 0.5 ? -1 : 1) * (0.4 + 0.6 * rnd());
    }
    D.filter(out, sr, 'highpass', 1200);
    const zap = D.buf(sr, 0.07);
    for (let i = 0; i < zap.length; i++) zap[i] = Math.tanh(3 * Math.sin(TWO_PI * 120 * i / sr)) * Math.exp(-i / sr / 0.03);
    D.filter(zap, sr, 'bandpass', 2200, 1);
    D.mix(out, D.normalize(zap, 1), 0.2 + rnd() * 0.4, 0.5, sr);
    return mono(out, 0.55);
  },

  'ambience.ventGust': ({ sr, rnd }) => {
    const dur = 2.6;
    const out = D.noise(rnd, Math.round(sr * dur), 'pink');
    D.filter(out, sr, 'bandpass', (t) => 300 + 600 * Math.sin(Math.PI * t / dur), 0.9);
    D.normalize(out, 1);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      let env = Math.pow(Math.sin(Math.PI * t / dur), 1.5);
      if (t > 0.8 && t < 1.8) env *= 1 + 0.5 * Math.sin(Math.PI * (t - 0.8)) * Math.sin(TWO_PI * 22 * t);
      out[i] *= env;
    }
    return mono(out, 0.55);
  },

  'ambience.farDrop': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.6);
    [[0, 1], [0.28, 0.6], [0.47, 0.42], [0.6, 0.3], [0.69, 0.2], [0.75, 0.12]].forEach(([t, a], j) => {
      D.burst(out, sr, rnd, { start: t, dur: 0.02, amp: (x) => a * Math.exp(-x / 0.005), filters: [['bandpass', 2200, 2]] });
      D.tone(out, sr, { start: t, dur: 0.1, freq: 1400 * (1 + j * 0.05), amp: (x) => a * 0.4 * Math.exp(-x / 0.03) });
    });
    for (let k = 0; k < 12; k++) {
      D.burst(out, sr, rnd, { start: 0.78 + k * 0.03 + rnd() * 0.01, dur: 0.008, amp: () => 0.08, filters: [['bandpass', 2600, 2]] });
    }
    D.filter(out, sr, 'lowpass', 2500);
    return mono(out, 0.45);
  },

  'ambience.ambiguousSteps': ({ sr, rnd }) => {
    const out = D.buf(sr, 2.6);
    [[0.05, 0.7], [0.62, 0.85], [1.12, 0.75], [1.71, 0.9], [2.2, 0.6]].forEach(([t, a]) => {
      const st = t + (rnd() - 0.5) * 0.06;
      addThump(out, sr, st, 85, 50, 0.07, a);
      D.burst(out, sr, rnd, { start: st + 0.01, dur: 0.15, amp: (x) => a * 0.4 * Math.exp(-x / 0.05), filters: [['lowpass', 500]] });
    });
    D.filter(out, sr, 'lowpass', 700);
    return mono(out, 0.5);
  },

  /* ----- Câmaras ----- */
  'cameras.open': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.75);
    addThump(out, sr, 0, 120, 55, 0.05, 0.9);
    addClick(out, sr, rnd, 0, 3000, 0.6);
    D.tone(out, sr, { start: 0.05, dur: 0.6, freq: 48, amp: (t) => 0.7 * (t < 0.08 ? t / 0.08 : Math.exp(-(t - 0.08) / 0.18)) });
    D.burst(out, sr, rnd, { start: 0.06, dur: 0.5, amp: (t) => 0.45 * Math.exp(-t / 0.14), filters: [['highpass', 2500]] });
    D.tone(out, sr, { start: 0.1, dur: 0.3, freq: (t) => 900 + 1700 * t / 0.3, amp: (t) => 0.03 * Math.sin(Math.PI * t / 0.3) });
    return mono(out, 0.6);
  },

  'cameras.close': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.55);
    addClick(out, sr, rnd, 0, 2600, 0.7);
    addClick(out, sr, rnd, 0.065, 1900, 0.5);
    addThump(out, sr, 0.065, 90, 50, 0.04, 0.4);
    D.tone(out, sr, { start: 0.03, dur: 0.3, freq: (t) => 500 + 4700 * Math.exp(-t / 0.07), amp: (t) => 0.07 * Math.exp(-t / 0.1) });
    D.burst(out, sr, rnd, { start: 0.02, dur: 0.3, amp: (t) => 0.3 * Math.exp(-t / 0.07), filters: [['highpass', 3000]] });
    return mono(out, 0.5);
  },

  'cameras.switch': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.22 + rnd() * 0.08);
    addClick(out, sr, rnd, 0, 2600 + rnd() * 1200, 0.8);
    const sDur = 0.2;
    const gate = D.buf(sr, sDur);
    const block = Math.round(sr * 0.005);
    let g = 1;
    for (let i = 0; i < gate.length; i++) { if (i % block === 0) g = rnd() > 0.3 ? 1 : 0.2; gate[i] = g; }
    const tau = 0.05 + rnd() * 0.05;
    D.burst(out, sr, rnd, { start: 0.008, dur: sDur, amp: (t) => 0.6 * Math.exp(-t / tau) * gate[Math.min(gate.length - 1, Math.round(t * sr))], filters: [['bandpass', 3500 + rnd() * 2500, 0.7]] });
    const zf = 900 + rnd() * 900;
    D.tone(out, sr, { start: 0.02 + rnd() * 0.04, dur: 0.05, type: 'square', freq: (t) => zf * (1 - t * 10), amp: 0.15 });
    D.filter(out, sr, 'lowpass', 5000);
    return mono(out, 0.6);
  },

  'cameras.staticLoop': ({ sr, rnd }) => stereoLoop(sr, 6, 0.5, 0.35, (ch, n) => {
    const out = D.noise(rnd, n, 'white');
    D.filter(out, sr, 'highpass', 3000); D.filter(out, sr, 'lowpass', 9000);
    D.normalize(out, 0.25);
    const crackle = new Float32Array(n);
    for (let i = 0; i < n; i++) if (rnd() < 20 / sr) crackle[i] = rnd() * 2 - 1;
    D.filter(crackle, sr, 'highpass', 1500);
    D.mix(out, D.normalize(crackle, 1), 0, 0.5);
    return out;
  }),

  'cameras.crtHum': ({ sr, rnd }) => stereoLoop(sr, 6, 0.5, 0.3, (ch, n) => {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      out[i] = (0.3 * Math.sin(TWO_PI * 120 * t) + 0.15 * Math.sin(TWO_PI * 240 * t + ch) + 0.05 * Math.sin(TWO_PI * 360 * t)) * (1 + 0.05 * Math.sin(TWO_PI * 0.5 * t));
    }
    const hiss = D.noise(rnd, n, 'pink');
    D.filter(hiss, sr, 'lowpass', 400);
    D.mix(out, D.normalize(hiss, 1), 0, 0.1);
    return out;
  }),

  'cameras.interference': ({ sr, rnd }) => {
    const dur = 0.45 + rnd() * 0.2;
    const out = D.noise(rnd, Math.round(sr * dur), 'white');
    D.filter(out, sr, 'bandpass', 3500, 0.8);
    D.normalize(out, 1);
    const block = Math.round(sr * 0.008);
    let g = 1;
    for (let i = 0; i < out.length; i++) {
      if (i % block === 0) g = 0.3 + 0.7 * rnd();
      const t = i / sr;
      out[i] *= g * (t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) / (dur * 0.5)));
    }
    let t = 0;
    while (t < dur - 0.04) {
      const len = 0.025 + rnd() * 0.015;
      if (rnd() < 0.5) D.tone(out, sr, { start: t, dur: len, type: 'square', freq: 400 + rnd() * 2600, amp: 0.2 });
      t += len;
    }
    D.crush(out, 6, 2);
    return mono(out, 0.6);
  },

  /* ----- Sala: porta e luz ----- */
  'office.doorClose': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.6);
    const motor = D.buf(sr, 0.8);
    D.tone(motor, sr, { dur: 0.8, type: 'saw', freq: (t) => 70 + 60 * Math.min(t / 0.6, 1), amp: (t) => Math.min(t / 0.05, 1) * (t > 0.7 ? Math.max(0, 1 - (t - 0.7) / 0.1) : 1) });
    D.filter(motor, sr, 'lowpass', 900);
    D.mix(out, D.drive(D.normalize(motor, 1), 2), 0, 0.22);
    const wobble = D.smooth(rnd, sr, 0.75, 30);
    D.burst(out, sr, rnd, { start: 0.05, dur: 0.7, amp: (t) => 0.3 * (0.6 + 0.4 * wobble[Math.min(wobble.length - 1, Math.round(t * sr))]) * Math.min(t / 0.05, 1), filters: [['bandpass', 1800, 1.2]] });
    addThump(out, sr, 0.75, 60, 32, 0.3, 0.9);
    D.burst(out, sr, rnd, { start: 0.75, dur: 0.3, amp: (t) => 0.6 * Math.exp(-t / 0.04), filters: [['lowpass', 2000]] });
    addMetal(out, sr, 0.75, 140, [1, 2.69, 4.37, 7, 10.2], [1, 0.7, 0.5, 0.3, 0.2], 0.5, 0.25);
    for (let k = 0; k < 4; k++) {
      D.burst(out, sr, rnd, { start: 0.86 + k * 0.08, dur: 0.04, amp: (t) => 0.12 * (1 - k * 0.2) * Math.exp(-t / 0.01), filters: [['bandpass', 1400, 2]] });
    }
    return mono(out, 0.85);
  },

  'office.doorOpen': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.3);
    const motor = D.buf(sr, 0.85);
    D.tone(motor, sr, { dur: 0.85, type: 'saw', freq: (t) => 130 - 60 * Math.min(t / 0.75, 1), amp: (t) => Math.min(t / 0.05, 1) * (t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.1) : 1) });
    D.filter(motor, sr, 'lowpass', 900);
    D.mix(out, D.drive(D.normalize(motor, 1), 2), 0, 0.2);
    const wobble = D.smooth(rnd, sr, 0.8, 26);
    D.burst(out, sr, rnd, { start: 0.04, dur: 0.75, amp: (t) => 0.26 * (0.6 + 0.4 * wobble[Math.min(wobble.length - 1, Math.round(t * sr))]) * Math.min(t / 0.05, 1), filters: [['bandpass', 1500, 1.2]] });
    addThump(out, sr, 0.85, 90, 60, 0.12, 0.4);
    addMetal(out, sr, 0.85, 224, [1, 2.69, 4.37, 7], [1, 0.6, 0.4, 0.2], 0.25, 0.18);
    return mono(out, 0.7);
  },

  'office.doorBang': ({ sr, rnd, v }) => {
    const out = D.buf(sr, 1.1);
    const hits = v === 1 ? [[0, 1], [0.22, 0.75]] : [[0, 1]];
    hits.forEach(([t, a]) => {
      addThump(out, sr, t, 55, 30, 0.35, a);
      addMetal(out, sr, t, 95 + rnd() * 10, [1, 2.64, 4.56, 7.26], [1, 0.6, 0.4, 0.25], 0.7, 0.35 * a);
      D.burst(out, sr, rnd, { start: t, dur: 0.3, amp: (x) => 0.7 * a * Math.exp(-x / 0.05), filters: [['lowpass', 1500]] });
    });
    for (let i = 0; i < out.length; i++) out[i] *= 1 + 0.25 * Math.sin(TWO_PI * 13 * i / sr) * Math.exp(-i / sr / 0.4);
    return mono(out, 0.9);
  },

  'office.lightOn': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.35);
    addClick(out, sr, rnd, 0, 2200, 0.9);
    const buzz = D.buf(sr, 0.32);
    D.tone(buzz, sr, { dur: 0.32, type: 'saw', freq: 100, amp: (t) => Math.min(t / 0.08, 1) * 0.5 });
    D.filter(buzz, sr, 'bandpass', 1200, 0.7);
    D.mix(out, D.normalize(buzz, 1), 0.03, 0.08, sr);
    D.fade(out, sr, 0, 0.04);
    return mono(out, 0.5);
  },

  'office.lightOff': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.25);
    addClick(out, sr, rnd, 0, 1400, 0.8);
    const buzz = D.buf(sr, 0.15);
    D.tone(buzz, sr, { dur: 0.15, type: 'saw', freq: 100, amp: (t) => Math.exp(-t / 0.04) });
    D.filter(buzz, sr, 'bandpass', 1100, 0.7);
    D.mix(out, D.normalize(buzz, 1), 0, 0.06, sr);
    return mono(out, 0.45);
  },

  'office.lightBuzz': ({ sr, rnd }) => stereoLoop(sr, 4, 0.5, 0.25, (ch, n) => {
    const out = new Float32Array(n);
    D.tone(out, sr, { dur: n / sr, type: 'saw', freq: 100, amp: 0.5 });
    D.filter(out, sr, 'bandpass', 1000, 0.7); D.filter(out, sr, 'lowpass', 2500);
    D.normalize(out, 1);
    D.tone(out, sr, { dur: n / sr, freq: 50, amp: 0.2 });
    D.modulate(out, D.smooth(rnd, sr, n / sr, 4), 0.08);
    return out;
  }),

  'office.powerDown': ({ sr, rnd }) => {
    const out = D.buf(sr, 3);
    addThump(out, sr, 0, 100, 45, 0.08, 0.8);
    addClick(out, sr, rnd, 0, 1800, 0.6);
    D.tone(out, sr, { dur: 2.6, freq: (t) => 35 + 345 * Math.exp(-t / 0.7), amp: (t) => 0.5 * Math.min(t / 0.03, 1) * Math.exp(-t / 1.1) });
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      out[i] += 0.12 * (Math.sin(TWO_PI * 50 * t) + 0.6 * Math.sin(TWO_PI * 100 * t)) * Math.exp(-t / 0.6);
    }
    return mono(out, 0.8);
  },

  /* ----- Monstros ----- */
  'monsters.blackStep': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.5);
    addThump(out, sr, 0, 65 + rnd() * 12, 38, 0.09, 1);
    D.burst(out, sr, rnd, { start: 0.02, dur: 0.3, amp: (t) => 0.35 * Math.exp(-t / 0.08), filters: [['lowpass', 700]] });
    D.filter(out, sr, 'lowpass', 1200);
    return mono(out, 0.7);
  },

  'monsters.blackDrag': ({ sr, rnd }) => {
    const dur = 1.4;
    const out = D.noise(rnd, Math.round(sr * dur), 'white');
    D.filter(out, sr, 'lowpass', 900); D.filter(out, sr, 'bandpass', 400, 0.8);
    D.normalize(out, 1);
    const grain = D.smooth(rnd, sr, dur, 40);
    for (let i = 0; i < out.length; i++) {
      const k = i / out.length;
      out[i] *= Math.pow(Math.sin(Math.PI * k), 0.8) * (0.5 + 0.5 * Math.abs(grain[i]));
    }
    return mono(out, 0.5);
  },

  'monsters.blackMetal': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.8);
    addClick(out, sr, rnd, 0, 900, 0.3);
    [[97, 1], [151, 0.7], [263, 0.5], [418, 0.3]].forEach(([f, a]) => {
      D.tone(out, sr, { dur: 1.8, freq: f, amp: (t) => a * Math.exp(-t / 0.9) * (1 + 0.4 * Math.sin(TWO_PI * 7 * t)) });
    });
    return mono(out, 0.45);
  },

  'monsters.blackRumble': ({ sr, rnd }) => {
    const dur = 2.5;
    const out = D.noise(rnd, Math.round(sr * dur), 'brown');
    D.filter(out, sr, 'lowpass', 70);
    D.normalize(out, 1);
    D.tone(out, sr, { dur, freq: 38, amp: 0.5 });
    for (let i = 0; i < out.length; i++) out[i] *= Math.pow(Math.sin(Math.PI * i / out.length), 1.5);
    return mono(out, 0.6);
  },

  'monsters.blackBreath': ({ sr, rnd, v }) => {
    const out = D.buf(sr, 2.3);
    const inLen = 0.85 + v * 0.1;
    D.burst(out, sr, rnd, { start: 0, dur: inLen, amp: (t) => Math.pow(Math.sin(Math.PI * t / inLen), 2) * (t < inLen * 0.7 ? 1 : 0.8), filters: [['bandpass', 1100, 0.6], ['lowpass', 3000]] });
    const exStart = inLen + 0.15;
    const exLen = 1.05;
    D.burst(out, sr, rnd, { start: exStart, dur: exLen, amp: (t) => 1.1 * Math.pow(Math.sin(Math.PI * t / exLen), 1.5) * (1 + 0.3 * Math.sin(TWO_PI * 9 * t)), filters: [['bandpass', 650, 0.5]] });
    return mono(out, 0.4);
  },

  'monsters.watcherGlitch': ({ sr, rnd }) => {
    const dur = 0.25 + rnd() * 0.25;
    const out = D.buf(sr, dur);
    let i = 0;
    let prev = null;
    while (i < out.length) {
      const len = Math.round(sr * (0.01 + rnd() * 0.015));
      const choice = rnd();
      const freq = 300 + rnd() * 3700;
      for (let j = 0; j < len && i + j < out.length; j++) {
        let s = 0;                                                            // silêncio
        if (choice < 0.3) s = Math.floor((j / sr) * freq * 2) % 2 ? 0.6 : -0.6; // tom digital
        else if (choice < 0.55) s = rnd() * 2 - 1;                           // ruído
        else if (choice < 0.8 && prev) s = prev[j % prev.length];            // repete (gaguejo)
        out[i + j] = s;
      }
      prev = out.slice(i, Math.min(out.length, i + len));
      i += len;
    }
    D.crush(out, 5, 3);
    D.fade(out, sr, 0.003, 0.02);
    return mono(out, 0.55);
  },

  'monsters.watcherWhine': ({ sr, rnd }) => stereoLoop(sr, 4, 0.5, 0.3, (ch, n) => {
    const out = new Float32Array(n);
    const drift = D.smooth(rnd, sr, n / sr, 0.6);
    let p1 = 0, p2 = 0, p3 = 0;
    for (let i = 0; i < n; i++) {
      const d = 15 * drift[i] * (ch ? -1 : 1);
      p1 += (2900 + d) / sr; p2 += (3010 - d + ch * 4) / sr; p3 += 4400 / sr;
      out[i] = 0.5 * Math.sin(TWO_PI * p1) + 0.4 * Math.sin(TWO_PI * p2) + 0.12 * Math.sin(TWO_PI * p3);
    }
    const st = D.noise(rnd, n, 'white');
    D.filter(st, sr, 'bandpass', 3500, 3);
    D.mix(out, D.normalize(st, 1), 0, 0.25);
    return out;
  }),

  'monsters.watcherCrackle': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.5);
    const pops = 8 + Math.floor(rnd() * 8);
    for (let k = 0; k < pops; k++) {
      const s = Math.floor(rnd() * (out.length - 4));
      const a = (rnd() < 0.5 ? -1 : 1) * (0.5 + 0.5 * rnd());
      out[s] += a; out[s + 1] += a * 0.6; out[s + 2] -= a * 0.3;
    }
    D.filter(out, sr, 'highpass', 800);
    D.tone(out, sr, { start: rnd() * 0.3, dur: 0.03, type: 'square', freq: 1800 + rnd() * 1500, amp: 0.15 });
    return mono(out, 0.5);
  },

  /* ----- Morrow ----- */
  'monsters.morrowBreath': ({ sr, rnd }) => stereoLoop(sr, 5.2, 0.3, 0.5, (ch, n) => {
    const out = new Float32Array(n);
    const inLen = 1.5;
    const exStart = 2.0;
    const exLen = 2.2;
    D.burst(out, sr, rnd, { start: 0.25, dur: inLen, amp: (t) => 0.7 * Math.pow(Math.sin(Math.PI * t / inLen), 2), filters: [['bandpass', 900, 0.7], ['lowpass', 2600]] });
    D.burst(out, sr, rnd, { start: exStart, dur: exLen, amp: (t) => Math.pow(Math.sin(Math.PI * t / exLen), 1.4), filters: [['bandpass', 380, 0.6]] });
    const growl = D.buf(sr, exLen);
    D.tone(growl, sr, { dur: exLen, type: 'saw', freq: (t) => 58 + 6 * Math.sin(TWO_PI * 0.7 * t), amp: (t) => Math.pow(Math.sin(Math.PI * t / exLen), 2) * (0.6 + 0.4 * Math.sin(TWO_PI * 24 * t)) });
    D.filter(growl, sr, 'lowpass', 420);
    D.mix(out, D.normalize(growl, 1), exStart, 0.35, sr);
    return out;
  }),

  'monsters.morrowChain': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.3);
    let t = 0.02;
    const count = 4 + Math.floor(rnd() * 4);
    for (let k = 0; k < count; k++) {
      const a = 0.4 + 0.6 * rnd();
      addMetal(out, sr, t, 1900 + rnd() * 1400, [1, 1.47, 2.31], [1, 0.6, 0.35], 0.05 + rnd() * 0.04, a);
      D.burst(out, sr, rnd, { start: t, dur: 0.01, amp: (x) => a * Math.exp(-x / 0.002), filters: [['highpass', 2500]] });
      t += 0.04 + rnd() * 0.14;
    }
    return mono(out, 0.5);
  },

  'monsters.morrowShift': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.4);
    D.burst(out, sr, rnd, { start: 0, dur: 1.2, amp: (t) => Math.pow(Math.sin(Math.PI * t / 1.2), 2), filters: [['bandpass', 650, 0.6], ['lowpass', 1800]] });
    addThump(out, sr, 0.35 + rnd() * 0.3, 70, 40, 0.1, 0.8);
    return mono(out, 0.5);
  },

  'monsters.morrowGrowl': ({ sr, rnd }) => {
    const dur = 1.6 + rnd() * 0.6;
    const n = Math.round(sr * dur);
    const src = new Float32Array(n);
    const jitter = D.smooth(rnd, sr, dur, 12);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      ph += (64 + 10 * jitter[i] + 6 * Math.sin(TWO_PI * 0.8 * t)) / sr;
      ph -= Math.floor(ph);
      src[i] = (2 * ph - 1) * (0.55 + 0.45 * Math.sin(TWO_PI * 27 * t));
    }
    const out = new Float32Array(n);
    [[320, 2, 1], [720, 3, 0.6], [1500, 4, 0.2]].forEach(([f, q, g]) => D.mix(out, D.filter(src.slice(), sr, 'bandpass', f, q), 0, g));
    D.normalize(out, 1);
    D.drive(out, 2.2);
    for (let i = 0; i < n; i++) out[i] *= Math.pow(Math.sin(Math.PI * i / n), 1.2);
    return mono(out, 0.6);
  },

  'monsters.morrowClaw': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.0);
    let t = 0.02;
    const strokes = 3 + Math.floor(rnd() * 2);
    for (let k = 0; k < strokes; k++) {
      const len = 0.12 + rnd() * 0.12;
      const f0 = 2800 + rnd() * 2000;
      D.burst(out, sr, rnd, { start: t, dur: len, amp: (x) => Math.min(x / 0.01, 1) * Math.exp(-x / (len * 0.5)), filters: [['bandpass', (x) => f0 * (1 - 0.35 * x / len), 6]] });
      addClick(out, sr, rnd, t, 1500 + rnd() * 1000, 0.5);
      t += len + 0.03 + rnd() * 0.08;
    }
    return mono(out, 0.5);
  },

  'monsters.morrowWake': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.6);
    D.burst(out, sr, rnd, { start: 0, dur: 0.35, amp: (t) => Math.min(t / 0.02, 1) * Math.exp(-t / 0.1), filters: [['bandpass', 1400, 1.2]] });  // snort
    const g = RECIPES['monsters.morrowGrowl']({ sr, rnd, v: 9 })[0];
    D.mix(out, g.slice(0, Math.round(sr * 1.2)), 0.25, 0.6, sr);
    D.tone(out, sr, { start: 0.2, dur: 1.3, freq: 1180, amp: (t) => 0.06 * Math.sin(Math.PI * t / 1.3) });
    D.tone(out, sr, { start: 0.2, dur: 1.3, freq: 1247, amp: (t) => 0.06 * Math.sin(Math.PI * t / 1.3) });
    D.fade(out, sr, 0, 0.2);
    return mono(out, 0.7);
  },

  'monsters.morrowStand': ({ sr, rnd }) => {
    const out = D.buf(sr, 2.0);
    [0.05, 0.22, 0.31, 0.55, 0.62].forEach((t) => {             // estalos de ossos
      D.burst(out, sr, rnd, { start: t, dur: 0.02, amp: (x) => Math.exp(-x / 0.003), filters: [['bandpass', 1400 + rnd() * 1200, 3]] });
      addThump(out, sr, t, 180, 90, 0.02, 0.4);
    });
    D.mix(out, RECIPES['monsters.morrowClaw']({ sr, rnd, v: 7 })[0], 0.7, 0.6, sr);
    D.burst(out, sr, rnd, { start: 1.0, dur: 0.95, amp: (t) => Math.pow(Math.sin(Math.PI * t / 0.95), 1.4), filters: [['bandpass', 420, 0.6]] });  // respiração pesada
    return mono(out, 0.8);
  },

  'monsters.morrowRunQuad': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.7);
    for (let g = 0; g < 5; g++) {                                 // galope: grupos de 4 patas
      const t0 = g * 0.31 + rnd() * 0.02;
      const a = 0.5 + 0.5 * (g / 4);
      [0, 0.055, 0.13, 0.18].forEach((dt) => {
        addThump(out, sr, t0 + dt, 95, 50, 0.045, a);
        addClick(out, sr, rnd, t0 + dt, 2200 + rnd() * 800, a * 0.4);
      });
    }
    D.burst(out, sr, rnd, { start: 0, dur: 1.6, amp: (t) => 0.15 * Math.min(t / 0.3, 1), filters: [['bandpass', 500, 0.7]] });
    return mono(out, 0.8);
  },

  'monsters.morrowRunBiped': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.6);
    for (let k = 0; k < 6; k++) {                                 // passos pesados em duas patas
      const t = k * 0.26 + rnd() * 0.02;
      const a = 0.55 + 0.45 * (k / 5);
      addThump(out, sr, t, 70, 34, 0.12, a);
      D.burst(out, sr, rnd, { start: t, dur: 0.12, amp: (x) => a * 0.5 * Math.exp(-x / 0.03), filters: [['lowpass', 900]] });
      addClick(out, sr, rnd, t + 0.01, 1700, a * 0.25);
    }
    return mono(out, 0.85);
  },

  'monsters.morrowImpact': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.4);
    addThump(out, sr, 0, 60, 28, 0.35, 1);
    D.burst(out, sr, rnd, { dur: 0.4, amp: (t) => 0.8 * Math.exp(-t / 0.05), filters: [['lowpass', 1600]] });
    for (let k = 0; k < 10; k++) {                                // destroços
      D.burst(out, sr, rnd, { start: 0.1 + rnd() * 0.8, dur: 0.02, amp: () => 0.1 + 0.1 * rnd(), filters: [['bandpass', 1800 + rnd() * 2000, 3]] });
    }
    return mono(out, 0.9);
  },

  /* ----- Echo ----- */
  'monsters.echoClick': ({ sr, rnd }) => {                       // estalidos de ecolocalização
    const out = D.buf(sr, 0.8);
    let t = 0.02;
    const count = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < count; k++) {
      const f = 3200 + rnd() * 1800;
      D.tone(out, sr, { start: t, dur: 0.02, freq: f, amp: (x) => Math.exp(-x / 0.0025) });
      D.burst(out, sr, rnd, { start: t, dur: 0.006, amp: (x) => 0.6 * Math.exp(-x / 0.0015), filters: [['highpass', 2500]] });
      t += 0.06 + rnd() * 0.12;
    }
    return mono(out, 0.45);
  },

  'monsters.echoShift': ({ sr, rnd }) => {                       // corpo magro a mexer-se
    const out = D.buf(sr, 1.0);
    D.burst(out, sr, rnd, { dur: 0.8, amp: (t) => Math.pow(Math.sin(Math.PI * t / 0.8), 2), filters: [['bandpass', 1300, 0.8], ['lowpass', 3500]] });
    for (let k = 0; k < 3; k++) {
      D.burst(out, sr, rnd, { start: 0.15 + rnd() * 0.6, dur: 0.012, amp: (x) => 0.5 * Math.exp(-x / 0.002), filters: [['bandpass', 2400 + rnd() * 1500, 3]] });
    }
    return mono(out, 0.4);
  },

  'monsters.echoScratch': ({ sr, rnd }) => {                     // garras no metal da conduta
    const out = D.buf(sr, 1.1);
    let t = 0.02;
    const strokes = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < strokes; k++) {
      const len = 0.08 + rnd() * 0.14;
      const f0 = 3500 + rnd() * 2500;
      D.burst(out, sr, rnd, { start: t, dur: len, amp: (x) => Math.min(x / 0.006, 1) * Math.exp(-x / (len * 0.6)), filters: [['bandpass', (x) => f0 * (1 - 0.3 * x / len), 9]] });
      addMetal(out, sr, t, 420 + rnd() * 200, [1, 2.4, 3.9], [1, 0.5, 0.3], 0.12, 0.25);
      t += len + 0.04 + rnd() * 0.1;
    }
    return mono(out, 0.5);
  },

  'monsters.echoVentMetal': ({ sr, rnd }) => {                   // a conduta a dobrar com o peso
    const out = D.buf(sr, 1.4);
    const base = 140 + rnd() * 60;
    D.tone(out, sr, { dur: 1.2, type: 'saw', freq: (t) => base * (1 + 0.15 * Math.sin(Math.PI * t / 1.2)), amp: (t) => 0.4 * Math.sin(Math.PI * t / 1.2) });
    D.filter(out, sr, 'bandpass', 700, 3);
    D.normalize(out, 1);
    addThump(out, sr, 0.05, 110, 60, 0.06, 0.6);
    addMetal(out, sr, 0.05, base * 2.1, [1, 1.83, 2.71], [1, 0.6, 0.4], 0.35, 0.3);
    return mono(out, 0.5);
  },

  'monsters.echoBreath': ({ sr, rnd, v }) => {                   // respiração rápida e fina, quase inaudível
    const out = D.buf(sr, 1.6);
    for (let k = 0; k < 4; k++) {
      const t = 0.05 + k * 0.36 + v * 0.02;
      D.burst(out, sr, rnd, { start: t, dur: 0.22, amp: (x) => Math.pow(Math.sin(Math.PI * x / 0.22), 2), filters: [['bandpass', 2600, 1.2]] });
    }
    return mono(out, 0.35);
  },

  'monsters.echoRetreat': ({ sr, rnd }) => {                     // arranhar a afastar-se, depois nada
    const out = D.buf(sr, 2.2);
    for (let k = 0; k < 6; k++) {
      const t = 0.05 + k * 0.3;
      const a = 1 - k * 0.15;
      D.burst(out, sr, rnd, { start: t, dur: 0.12, amp: (x) => a * Math.exp(-x / 0.05), filters: [['bandpass', 3800 - k * 300, 6]] });
      addThump(out, sr, t, 120, 70, 0.03, a * 0.3);
    }
    D.filter(out, sr, 'lowpass', 5000);
    return mono(out, 0.5);
  },

  'office.ventRattle': ({ sr, rnd }) => stereoLoop(sr, 3, 0.3, 0.5, (ch, n) => {
    const out = new Float32Array(n);
    let t = 0;
    while (t < n / sr - 0.05) {                                   // grelha a tremer: muitos toques metálicos pequenos
      const a = 0.3 + 0.7 * rnd();
      const st = Math.round(t * sr);
      for (let i = 0; i < Math.round(sr * 0.03) && st + i < n; i++) {
        out[st + i] += a * Math.exp(-i / sr / 0.006) * Math.sin(TWO_PI * (1800 + ch * 140) * i / sr);
      }
      t += 0.035 + rnd() * 0.07;
    }
    const hum = D.noise(rnd, n, 'pink');
    D.filter(hum, sr, 'bandpass', 900, 2);
    D.mix(out, D.normalize(hum, 1), 0, 0.15);
    D.modulate(out, D.smooth(rnd, sr, n / sr, 3), 0.4);
    return out;
  }),

  'office.ventPush': ({ sr, rnd }) => {                          // pancada do outro lado da grelha
    const out = D.buf(sr, 0.9);
    addThump(out, sr, 0, 90, 45, 0.12, 1);
    addMetal(out, sr, 0, 300 + rnd() * 60, [1, 2.3, 3.7, 5.9], [1, 0.6, 0.4, 0.2], 0.3, 0.45);
    D.burst(out, sr, rnd, { dur: 0.2, amp: (t) => 0.6 * Math.exp(-t / 0.03), filters: [['bandpass', 2000, 1]] });
    D.mix(out, RECIPES['monsters.echoScratch']({ sr, rnd, v: 3 })[0].slice(0, Math.round(sr * 0.5)), 0.15, 0.4, sr);
    return mono(out, 0.85);
  },

  'office.ventGrab': ({ sr, rnd }) => {                          // agarrar a grelha
    const out = D.buf(sr, 0.5);
    addThump(out, sr, 0, 160, 90, 0.04, 0.8);
    addMetal(out, sr, 0.005, 520, [1, 2.2, 3.6], [1, 0.5, 0.3], 0.12, 0.4);
    return mono(out, 0.55);
  },

  'office.doorBreach': ({ sr, rnd }) => {
    const out = D.buf(sr, 1.8);
    [[0.06, 0.8], [0.54, 0.9], [1.02, 1]].forEach(([t, a]) => {  // as 3 pancadas (iguais à animação)
      addThump(out, sr, t, 52, 26, 0.35, a);
      addMetal(out, sr, t, 88 + rnd() * 10, [1, 2.64, 4.56, 7.26], [1, 0.6, 0.4, 0.25], 0.5, 0.35 * a);
      D.burst(out, sr, rnd, { start: t, dur: 0.25, amp: (x) => 0.8 * a * Math.exp(-x / 0.04), filters: [['lowpass', 2200]] });
    });
    const groan = D.buf(sr, 0.9);                                 // metal a deformar
    D.tone(groan, sr, { dur: 0.9, type: 'saw', freq: (t) => 210 - 120 * t + 15 * Math.sin(TWO_PI * 7 * t), amp: (t) => Math.sin(Math.PI * t / 0.9) });
    D.filter(groan, sr, 'bandpass', 600, 2);
    D.mix(out, D.drive(D.normalize(groan, 1), 3), 0.75, 0.35, sr);
    D.burst(out, sr, rnd, { start: 1.35, dur: 0.4, amp: (t) => 0.6 * Math.exp(-t / 0.1), filters: [['highpass', 1200]] });  // rasgar
    return mono(out, 0.95);
  },

  /* ----- Jumpscares ----- */
  'jumpscares.black': ({ sr, rnd }) => {
    const dur = 1.5;
    const out = D.buf(sr, dur);
    D.burst(out, sr, rnd, { dur: 0.3, amp: (t) => Math.exp(-t / 0.03) });                           // IMPACTO
    const bass = D.buf(sr, 1.2);
    addThump(bass, sr, 0, 62, 28, 0.45, 1);
    D.mix(out, D.drive(bass, 2), 0, 1, sr);                                                           // bass hit
    addMetal(out, sr, 0, 83, [1, 2.54, 4.33, 6.95, 10.97], [1, 0.7, 0.5, 0.35, 0.2], 0.6, 0.35);   // metal pesado
    const voice = screamVoice(sr, rnd, 1.35, (t) => (t < 0.15 ? 380 + 600 * t : 470 - 140 * (t - 0.15)), [[800, 2, 1], [1250, 3, 0.8], [2600, 4, 0.5]], 5);
    for (let i = 0; i < voice.length; i++) {
      const t = i / sr;
      voice[i] *= Math.min(t / 0.015, 1) * (t > 1.0 ? Math.max(0, 1 - (t - 1.0) / 0.35) : 1);
    }
    D.mix(out, voice, 0.01, 0.45, sr);                                                                // grito distorcido
    D.burst(out, sr, rnd, { dur: 0.5, amp: (t) => 0.3 * Math.exp(-t / 0.2) * (rnd() < 0.7 ? 1 : 0.2), filters: [['highpass', 2000]] }); // estática
    D.fade(out, sr, 0, 0.1);
    return mono(out, 0.95);
  },

  'jumpscares.watcher': ({ sr, rnd }) => {
    const dur = 1.4;
    const out = D.buf(sr, dur);
    const burst = D.noise(rnd, Math.round(sr * 0.35), 'white');
    for (let i = 0; i < burst.length; i++) burst[i] *= Math.exp(-i / sr / 0.08);
    D.mix(out, D.crush(burst, 4, 3), 0, 1, sr);                                                       // burst abrupto
    addThump(out, sr, 0, 48, 26, 0.4, 1);                                                             // bass impact
    const shriek = D.buf(sr, 0.75);
    let ph = 0;
    for (let i = 0; i < shriek.length; i++) {
      const t = i / sr;
      const fc = 2600 + 800 * Math.min(t / 0.6, 1);
      ph += fc / sr;
      shriek[i] = Math.sin(TWO_PI * ph + 4 * Math.sin(TWO_PI * 170 * t)) * Math.min(t / 0.005, 1) * Math.exp(-t / 0.35);
    }
    D.mix(out, D.drive(shriek, 3), 0.01, 0.6, sr);                                                    // shriek agudo
    const voice = screamVoice(sr, rnd, 1.0, (t) => 520 + 180 * Math.min(t / 0.5, 1) + (Math.floor(t * 25) % 3) * 60, [[1800, 3, 1], [3000, 4, 0.7]], 6);
    D.crush(voice, 6, 2);
    for (let i = 0; i < voice.length; i++) voice[i] *= Math.min(i / sr / 0.01, 1) * Math.max(0, 1 - i / voice.length);
    D.mix(out, voice, 0.1, 0.6, sr);                                                                  // grito digital
    // caos de glitch: repete, corta e esmaga pedaços
    const start = Math.round(sr * 0.25);
    const end = Math.round(sr * 1.3);
    let i = start;
    while (i < end) {
      const len = Math.round(sr * (0.025 + rnd() * 0.035));
      const roll = rnd();
      for (let j = 0; j < len && i + j < out.length; j++) {
        if (roll < 0.35) out[i + j] = out[Math.max(0, i - len + j)];
        else if (roll < 0.5) out[i + j] *= 0.05;
        else if (roll < 0.7) out[i + j] = Math.round(out[i + j] * 4) / 4;
      }
      i += len;
    }
    D.fade(out, sr, 0, 0.12);
    return mono(out, 0.95);
  },

  'jumpscares.morrow': ({ sr, rnd }) => {
    const dur = 2.0;
    const out = D.buf(sr, dur);
    // 1. grande impacto (+ batida a erguer-se aos 0.54 s e a cabeça aos 0.94 s, como a animação)
    [[0, 1], [0.54, 0.8], [0.94, 1]].forEach(([t, a]) => {
      D.burst(out, sr, rnd, { start: t, dur: 0.25, amp: (x) => a * Math.exp(-x / 0.03) });
      const bass = D.buf(sr, 1);
      addThump(bass, sr, 0, 60, 26, 0.35, 1);
      D.mix(out, D.drive(bass, 2), t, a, sr);
    });
    // 2. garras
    D.mix(out, RECIPES['monsters.morrowClaw']({ sr, rnd, v: 5 })[0], 0.1, 0.6, sr);
    // 3. rugido animal distorcido
    const roarLen = 1.7;
    const n = Math.round(sr * roarLen);
    const src = new Float32Array(n);
    const jit = D.smooth(rnd, sr, roarLen, 20);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const f = (t < 0.8 ? 95 + 60 * t / 0.8 : 155 - 40 * (t - 0.8)) + 14 * jit[i];
      ph += f / sr;
      ph -= Math.floor(ph);
      src[i] = (2 * ph - 1) * (0.6 + 0.4 * Math.sin(TWO_PI * 31 * t));
    }
    const roar = new Float32Array(n);
    [[480, 2, 1], [1050, 3, 0.7], [2300, 4, 0.3]].forEach(([f, q, g]) => D.mix(roar, D.filter(src.slice(), sr, 'bandpass', f, q), 0, g));
    D.burst(roar, sr, rnd, { dur: roarLen, amp: () => 0.35, filters: [['bandpass', 900, 0.7]] });
    D.normalize(roar, 1);
    D.drive(roar, 4);
    for (let i = 0; i < n; i++) roar[i] *= Math.min(i / sr / 0.03, 1) * Math.max(0, 1 - i / n);
    D.mix(out, roar, 0.04, 0.75, sr);
    // 4. um pouco de voz quase humana, misturada (antinatural)
    const human = screamVoice(sr, rnd, 1.0, (t) => 330 + 90 * Math.sin(Math.PI * t), [[750, 3, 1], [1150, 4, 0.8], [2700, 5, 0.4]], 3);
    for (let i = 0; i < human.length; i++) human[i] *= Math.min(i / sr / 0.05, 1) * Math.max(0, 1 - i / human.length);
    D.mix(out, human, 0.94, 0.35, sr);
    D.fade(out, sr, 0, 0.15);
    return mono(out, 0.95);
  },

  'jumpscares.echo': ({ sr, rnd }) => {
    const dur = 2.1;
    const out = D.buf(sr, dur);
    // 1. a grelha rebenta: metal + burst grave
    D.burst(out, sr, rnd, { dur: 0.3, amp: (t) => Math.exp(-t / 0.04) });
    addMetal(out, sr, 0, 260, [1, 2.3, 3.7, 5.9, 8.2], [1, 0.7, 0.5, 0.35, 0.2], 0.45, 0.5);
    const bass = D.buf(sr, 1);
    addThump(bass, sr, 0, 55, 24, 0.4, 1);
    D.mix(out, D.drive(bass, 2.5), 0, 1, sr);
    // 2. garras a arranhar ao sair
    D.mix(out, RECIPES['monsters.echoScratch']({ sr, rnd, v: 8 })[0], 0.2, 0.7, sr);
    D.mix(out, RECIPES['monsters.echoScratch']({ sr, rnd, v: 9 })[0], 0.65, 0.6, sr);
    // 3. a cara chega: shriek animal curto e distorcido (agudo, a tremer) + burst grave
    const shLen = 0.75;
    const shriek = D.buf(sr, shLen);
    let ph = 0;
    for (let i = 0; i < shriek.length; i++) {
      const t = i / sr;
      const f = 1500 + 1900 * Math.min(t / 0.12, 1) - 500 * Math.max(0, t - 0.4) + 140 * Math.sin(TWO_PI * 38 * t);
      ph += f / sr;
      ph -= Math.floor(ph);
      shriek[i] = (2 * ph - 1) * Math.min(t / 0.004, 1) * Math.max(0, 1 - t / shLen);
    }
    const shBand = new Float32Array(shriek.length);
    [[2600, 3, 1], [4200, 4, 0.6], [1400, 2, 0.5]].forEach(([f, q, g]) => D.mix(shBand, D.filter(shriek.slice(), sr, 'bandpass', f, q), 0, g));
    D.normalize(shBand, 1);
    D.drive(shBand, 4);
    D.crush(shBand, 7, 2);
    D.mix(out, shBand, 1.38, 0.7, sr);
    const bass2 = D.buf(sr, 0.7);
    addThump(bass2, sr, 0, 70, 30, 0.25, 1);
    D.mix(out, D.drive(bass2, 2), 1.38, 0.9, sr);
    D.burst(out, sr, rnd, { start: 1.38, dur: 0.4, amp: (t) => 0.5 * Math.exp(-t / 0.08), filters: [['highpass', 1500]] });
    D.fade(out, sr, 0, 0.1);
    return mono(out, 0.95);
  },

  /* ----- Interface ----- */
  'ui.click': ({ sr, rnd }) => {
    const out = D.buf(sr, 0.08);
    addClick(out, sr, rnd, 0, 1800, 1);
    return mono(out, 0.4);
  },

  'ui.nightStart': ({ sr, rnd }) => {
    const out = D.buf(sr, 2.6);
    addThump(out, sr, 0, 45, 30, 1.2, 1);
    D.burst(out, sr, rnd, { dur: 2.5, color: 'brown', amp: (t) => 0.5 * Math.exp(-t / 0.8), filters: [['lowpass', 120]] });
    addMetal(out, sr, 0.02, 600, [1, 1.58], [1, 0.7], 1.5, 0.05);
    return mono(out, 0.7);
  },

  'ui.sixAm': ({ sr, rnd }) => {
    const out = D.buf(sr, 3.4);
    [0, 0.7, 1.4].forEach((t) => {
      [[1, 1, 2.2], [2.0, 0.5, 1.2], [2.76, 0.35, 0.9], [5.4, 0.15, 0.4]].forEach(([r, a, tau]) => {
        D.tone(out, sr, { start: t, dur: 2, freq: 523 * r, amp: (x) => a * 0.4 * Math.min(x / 0.004, 1) * Math.exp(-x / tau) });
      });
    });
    D.tone(out, sr, { dur: 3.4, freq: 261.6, amp: (t) => 0.06 * Math.min(t / 0.8, 1) * Math.max(0, 1 - t / 3.4) });
    return mono(out, 0.7);
  }
};


/* ---------------------------------------------------------
   4. AUDIO MANAGER
   --------------------------------------------------------- */

// Transforma AUDIO em { 'ambience.hum': ['assets/...'], 'cameras.switch': [...3] }
const SOUND_FILES = {};
for (const [group, sounds] of Object.entries(AUDIO)) {
  for (const [name, path] of Object.entries(sounds)) {
    SOUND_FILES[`${group}.${name}`] = Array.isArray(path) ? path : [path];
  }
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const audioManager = {
  masterVolume: AUDIO_SETTINGS.defaultVolumes.master,
  sfxVolume: AUDIO_SETTINGS.defaultVolumes.sfx,
  ambienceVolume: AUDIO_SETTINGS.defaultVolumes.ambience,

  ctx: null,
  nodes: {},
  buffers: {},
  lastVariant: {},
  lastStart: {},
  voices: [],
  loops: {},
  pendingLoops: {},
  channels: {},
  missingFiles: [],
  unlocked: false,
  ready: false,
  onReady: null,
  log: [],                  // últimos sons tocados (útil para testes / debug)

  // Gera um som pela receita (não precisa de AudioContext)
  renderSynth(id, variant = 0, sampleRate = 44100) {
    const recipe = RECIPES[id];
    if (!recipe) return null;
    const rnd = D.rng(hashString(id) + variant * 7919);
    const channels = recipe({ sr: sampleRate, rnd, v: variant });
    // Sons curtos terminam com um fade mínimo para não dar um "clique" no fim
    if (!LOOPING_SOUNDS.has(id)) channels.forEach((data) => D.fade(data, sampleRate, 0, 0.02));
    return channels;
  },

  loadVolumes() {
    try {
      const saved = JSON.parse(localStorage.getItem('securityGuard.audio') || 'null');
      if (saved) {
        if (typeof saved.master === 'number') this.masterVolume = saved.master;
        if (typeof saved.sfx === 'number') this.sfxVolume = saved.sfx;
        if (typeof saved.ambience === 'number') this.ambienceVolume = saved.ambience;
      }
    } catch (error) {
      // sem localStorage: fica com os valores por defeito
    }
  },

  saveVolumes() {
    try {
      localStorage.setItem('securityGuard.audio', JSON.stringify({
        master: this.masterVolume, sfx: this.sfxVolume, ambience: this.ambienceVolume
      }));
    } catch (error) { /* ignorar */ }
  },

  setVolume(kind, value) {
    const v = Math.min(1, Math.max(0, value));
    if (kind === 'master') this.masterVolume = v;
    if (kind === 'sfx') this.sfxVolume = v;
    if (kind === 'ambience') this.ambienceVolume = v;
    this.saveVolumes();
    this.applyVolumes();
  },

  applyVolumes(time = 0.05) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.nodes.master.gain.setTargetAtTime(this.masterVolume, now, time);
    this.nodes.ambience.gain.setTargetAtTime(this.ambienceVolume, now, time);
    this.nodes.sfx.gain.setTargetAtTime(this.sfxVolume, now, time);
    this.nodes.scare.gain.setTargetAtTime(this.sfxVolume, now, time);
  },

  // Chamado no primeiro clique do jogador (regras de autoplay do browser)
  unlock() {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended' && document.visibilityState === 'visible') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn('[audio] Este browser não suporta Web Audio — o jogo continua sem som.');
      return;
    }
    try {
      this.ctx = new AudioCtx();
    } catch (error) {
      console.warn('[audio] Não foi possível iniciar o áudio:', error.message);
      return;
    }
    this.unlocked = true;
    this.buildGraph();
    this.applyVolumes(0.01);
    if (this.ctx.state === 'suspended') this.ctx.resume();
    document.addEventListener('visibilitychange', () => this.handleVisibility());
    this.load().then(() => {
      this.ready = true;
      for (const [name, request] of Object.entries(this.pendingLoops)) this.startLoop(name, request.id, request.options);
      this.pendingLoops = {};
      if (this.onReady) this.onReady();
    });
  },

  // master -> limitador -> colunas; cada categoria tem o seu volume
  buildGraph() {
    const c = this.ctx;
    const n = this.nodes;
    n.limiter = c.createDynamicsCompressor();
    n.limiter.threshold.value = -3;
    n.limiter.knee.value = 0;
    n.limiter.ratio.value = 20;
    n.limiter.attack.value = 0.001;
    n.limiter.release.value = 0.12;
    n.master = c.createGain();
    n.master.connect(n.limiter).connect(c.destination);

    for (const bus of ['ambience', 'sfx']) {
      n[bus] = c.createGain();
      n[bus + 'Duck'] = c.createGain();
      n[bus].connect(n[bus + 'Duck']).connect(n.master);
    }
    n.scare = c.createGain();
    n.scare.connect(n.master);
  },

  async load() {
    const ids = Object.keys(SOUND_FILES);
    const canFetch = location.protocol !== 'file:';
    if (!canFetch) {
      console.info('[audio] Jogo aberto como ficheiro local (file://): o browser não deixa carregar os sons de assets/sfx assim, por isso uso os sons gerados pelo jogo. Abre com o Live Server para usar os ficheiros.');
    }

    await Promise.all(ids.map(async (id) => {
      this.buffers[id] = await Promise.all(SOUND_FILES[id].map((path) => (canFetch ? this.loadFile(path) : null)));
    }));

    // O que falhou é gerado pelo próprio jogo (um de cada vez, sem bloquear o ecrã)
    for (const id of ids) {
      for (let v = 0; v < this.buffers[id].length; v++) {
        if (this.buffers[id][v]) continue;
        this.buffers[id][v] = this.synthBuffer(id, v);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  },

  async loadFile(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        this.missingFiles.push(path);
        console.warn(`[audio] Ficheiro de som em falta: ${path} (${response.status}) — a usar um som gerado.`);
        return null;
      }
      const data = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(data);
    } catch (error) {
      this.missingFiles.push(path);
      console.warn(`[audio] Não consegui carregar ${path} — a usar um som gerado. (${error.message})`);
      return null;
    }
  },

  synthBuffer(id, variant) {
    const channels = this.renderSynth(id, variant, this.ctx.sampleRate);
    if (!channels) return null;
    const buffer = this.ctx.createBuffer(channels.length, channels[0].length, this.ctx.sampleRate);
    channels.forEach((data, i) => buffer.copyToChannel(data, i));
    return buffer;
  },

  // Escolhe uma variação (evita repetir a última)
  pickBuffer(id, variant) {
    const list = this.buffers[id];
    if (!list || !list.length) return null;
    let index = variant;
    if (index === undefined) {
      index = Math.floor(Math.random() * list.length);
      if (list.length > 1 && index === this.lastVariant[id]) index = (index + 1) % list.length;
    }
    this.lastVariant[id] = index;
    return list[index] || null;
  },

  /* ----- Sons curtos ----- */
  playSFX(id, options = {}) {
    if (!this.ready) return null;
    // Aba escondida: não acumula sons para tocarem todos de uma vez ao voltar
    if (document.visibilityState === 'hidden') return null;
    const {
      bus = 'sfx', gain = 1, rate = 1, pan = 0, priority = PRIORITY.medium,
      channel = null, delay = 0, variant
    } = options;
    const now = this.ctx.currentTime;

    // O mesmo som disparado duas vezes quase ao mesmo tempo (por erro)? Ignora.
    if (!channel && this.lastStart[id] !== undefined && now - this.lastStart[id] < 0.04) return null;

    // Demasiados sons: o de menor prioridade cede o lugar
    if (this.voices.length >= AUDIO_SETTINGS.maxVoices) {
      const victim = this.voices.reduce((low, v) => (!low || v.priority < low.priority ? v : low), null);
      if (!victim || victim.priority > priority) return null;
      this.stopVoice(victim, 0.02);
    }

    if (channel && this.channels[channel]) this.stopVoice(this.channels[channel], 0.015);

    const buffer = this.pickBuffer(id, variant);
    if (!buffer) return null;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const amp = this.ctx.createGain();
    amp.gain.value = gain;
    src.connect(amp);
    if (pan) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      amp.connect(panner).connect(this.nodes[bus]);
    } else {
      amp.connect(this.nodes[bus]);
    }

    const voice = { id, src, amp, priority, channel, bus };
    src.onended = () => {
      this.voices = this.voices.filter((v) => v !== voice);
      if (channel && this.channels[channel] === voice) delete this.channels[channel];
    };
    src.start(now + delay);
    this.voices.push(voice);
    if (channel) this.channels[channel] = voice;
    this.lastStart[id] = now;
    this.log.push({ id, bus, time: now, gain });
    if (this.log.length > 300) this.log.shift();
    return voice;
  },

  playRandomSFX(ids, options = {}) {
    return this.playSFX(ids[Math.floor(Math.random() * ids.length)], options);
  },

  stopVoice(voice, fade = 0.03) {
    if (!voice || voice.stopped) return;
    voice.stopped = true;
    const now = this.ctx.currentTime;
    try {
      voice.amp.gain.cancelScheduledValues(now);
      voice.amp.gain.setTargetAtTime(0, now, fade / 3);
      voice.src.stop(now + fade + 0.02);
    } catch (error) { /* já tinha parado */ }
    this.voices = this.voices.filter((v) => v !== voice);
    if (voice.channel && this.channels[voice.channel] === voice) delete this.channels[voice.channel];
  },

  stopAllVoices(fade = 0.05, keepBus = null) {
    [...this.voices].forEach((v) => { if (v.bus !== keepBus) this.stopVoice(v, fade); });
  },

  isChannelBusy(channel) {
    return Boolean(this.channels[channel]);
  },

  /* ----- Loops ----- */
  startLoop(name, id, options = {}) {
    const { bus = 'ambience', gain = 1, fade = 0.5 } = options;
    if (!this.ready) {
      if (this.unlocked) this.pendingLoops[name] = { id, options };
      return;
    }
    const now = this.ctx.currentTime;
    const existing = this.loops[name];
    if (existing && existing.id === id && !existing.stopping) {
      existing.target = gain;
      existing.amp.gain.cancelScheduledValues(now);
      existing.amp.gain.setTargetAtTime(gain, now, Math.max(0.01, fade / 3));
      return;
    }
    if (existing) this.stopLoop(name, 0.05);

    const buffer = this.pickBuffer(id, 0);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(gain, now + Math.max(0.01, fade));
    src.connect(amp).connect(this.nodes[bus]);
    src.start(now, Math.random() * buffer.duration);   // cada vez começa num ponto diferente
    this.loops[name] = { id, src, amp, target: gain, bus };
  },

  stopLoop(name, fade = 0.5) {
    delete this.pendingLoops[name];
    const loop = this.loops[name];
    if (!loop) return;
    const now = this.ctx.currentTime;
    loop.stopping = true;
    try {
      loop.amp.gain.cancelScheduledValues(now);
      loop.amp.gain.setValueAtTime(loop.amp.gain.value, now);
      loop.amp.gain.linearRampToValueAtTime(0, now + Math.max(0.01, fade));
      loop.src.stop(now + Math.max(0.01, fade) + 0.05);
    } catch (error) { /* ignorar */ }
    delete this.loops[name];
  },

  setLoopGain(name, gain, timeConstant = 0.3) {
    if (this.pendingLoops[name]) this.pendingLoops[name].options.gain = gain;
    const loop = this.loops[name];
    if (!loop) return;
    if (Math.abs(loop.target - gain) < 0.004) return;
    loop.target = gain;
    loop.amp.gain.setTargetAtTime(gain, this.ctx.currentTime, Math.max(0.01, timeConstant));
  },

  setLoopRate(name, rate, timeConstant = 0.5) {
    const loop = this.loops[name];
    if (!loop || Math.abs((loop.rate || 1) - rate) < 0.005) return;
    loop.rate = rate;
    loop.src.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, Math.max(0.01, timeConstant));
  },

  stopAllLoops(fade = 0.5) {
    Object.keys(this.loops).forEach((name) => this.stopLoop(name, fade));
    this.pendingLoops = {};
  },

  // Camadas de ambiente com nome (hum, vent, drone, late)
  setAmbienceLayer(name, level, fade = 1) {
    const id = `ambience.${name}`;
    if (level <= 0.001) {
      if (this.loops[name] || this.pendingLoops[name]) this.stopLoop(name, fade);
      return;
    }
    if (this.loops[name] && !this.loops[name].stopping) this.setLoopGain(name, level, fade / 3);
    else this.startLoop(name, id, { bus: 'ambience', gain: level, fade });
  },

  // Baixa (ou repõe) uma categoria inteira
  duckTargets: { ambience: 1, sfx: 1 },   // volume pedido a cada categoria (útil para testes)

  duck(bus, level, time = 0.05) {
    if (!this.ctx) return;
    const node = this.nodes[bus + 'Duck'];
    if (!node) return;
    this.duckTargets[bus] = level;
    const now = this.ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setTargetAtTime(level, now, Math.max(0.005, time / 3));
  },

  restoreDucks(time = 0.3) {
    this.duck('ambience', 1, time);
    this.duck('sfx', 1, time);
  },

  // Prioridade máxima: corta tudo o resto e toca o susto
  playJumpscare(monsterId) {
    if (!this.ready) return;
    this.stopAllVoices(0.03, 'scare');
    this.stopAllLoops(0.06);
    this.duck('ambience', 0, 0.03);
    this.duck('sfx', 0, 0.03);
    this.playSFX(`jumpscares.${monsterId}`, { bus: 'scare', gain: 0.85, priority: PRIORITY.highest, channel: 'jumpscare' });
  },

  // Mudou de aba: suspende tudo; ao voltar, retoma com um fade curto
  handleVisibility() {
    if (!this.ctx) return;
    if (document.visibilityState === 'hidden') {
      soundDirector.clearQueue();
      this.ctx.suspend();
    } else {
      const now = this.ctx.currentTime;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.setValueAtTime(0, now);
      this.ctx.resume().then(() => {
        const t = this.ctx.currentTime;
        this.nodes.master.gain.setValueAtTime(0, t);
        this.nodes.master.gain.linearRampToValueAtTime(this.masterVolume, t + 0.4);
      });
    }
  }
};

audioManager.loadVolumes();


/* ---------------------------------------------------------
   5. SOUND DIRECTOR — atmosfera e tensão
   O jogo avisa o que aconteceu (eventos) e manda o estado
   todos os frames; aqui decide-se o que se ouve.
   --------------------------------------------------------- */

function randomRange([min, max]) {
  return min + Math.random() * (max - min);
}

function randomPitch() {
  return randomRange(AUDIO_SETTINGS.pitchRange);
}

function randomPan(width = 0.6) {
  return (Math.random() * 2 - 1) * width;
}

const soundDirector = {
  mode: 'menu',             // 'menu', 'intro', 'night', 'end'
  eventTimer: 10,
  lastEvent: null,
  pressure: 0,
  late: 0,
  stareTimer: 0,
  failureTimer: 20,
  queue: [],
  morrowCueTimer: 10,
  echoCueTimer: 6,
  onFlicker: null,          // o jogo pode ligar aqui um efeito visual (falha elétrica)

  schedule(delay, fn) {
    this.queue.push({ time: delay, fn });
  },

  clearQueue() {
    this.queue = [];
  },

  /* ----- Reação a eventos do jogo ----- */
  handle(name, data) {
    const am = audioManager;
    switch (name) {
      case 'menu':
        this.mode = 'menu';
        this.clearQueue();
        am.restoreDucks(0.3);
        am.stopAllVoices(0.2);
        am.stopAllLoops(0.6);
        am.setAmbienceLayer('hum', 0.5, 1.5);
        break;

      case 'nightIntro':
        this.mode = 'intro';
        this.clearQueue();
        am.restoreDucks(0.05);
        am.stopAllVoices(0.1);
        am.stopAllLoops(0.4);
        am.playSFX('ui.nightStart', { gain: 0.8, priority: PRIORITY.high });
        break;

      case 'nightBegin':
        this.mode = 'night';
        this.eventTimer = 6 + Math.random() * 6;
        this.failureTimer = 15 + Math.random() * 20;
        this.pressure = 0;
        this.late = 0;
        this.stareTimer = 0;
        this.morrowCueTimer = 8 + Math.random() * 8;
        this.echoCueTimer = 5 + Math.random() * 4;
        am.restoreDucks(0.2);
        am.setAmbienceLayer('hum', 0.9, 1.5);
        am.setAmbienceLayer('vent', 0.6, 2.5);
        break;

      case 'uiClick':
        am.playSFX('ui.click', { gain: 0.6, priority: PRIORITY.medium, channel: 'ui' });
        break;

      case 'camerasOpened':
        am.playSFX('cameras.open', { gain: 0.8, priority: PRIORITY.medium, channel: 'monitor' });
        am.startLoop('camStatic', 'cameras.staticLoop', { bus: 'sfx', gain: 0.5, fade: 0.25 });
        am.startLoop('crtHum', 'cameras.crtHum', { bus: 'sfx', gain: 0.45, fade: 0.4 });
        break;

      case 'camerasClosed':
        if (this.mode !== 'night') break;
        am.playSFX('cameras.close', { gain: 0.75, priority: PRIORITY.medium, channel: 'monitor' });
        am.stopLoop('camStatic', 0.2);
        am.stopLoop('crtHum', 0.6);
        am.stopLoop('watcherWhine', 0.3);
        break;

      case 'cameraSwitch':
        am.playSFX('cameras.switch', { gain: 0.7, rate: randomPitch(), priority: PRIORITY.medium, channel: 'camSwitch' });
        this.bumpStatic(0.9);
        break;

      case 'interference':
        this.bumpStatic(1);
        if (data && data.reason === 'monster' && Math.random() < 0.5) {
          am.playSFX('cameras.interference', { gain: 0.4, rate: randomPitch(), priority: PRIORITY.high, channel: 'interference' });
        }
        break;

      case 'doorClosed':
        am.playSFX('office.doorClose', { gain: 0.95, priority: PRIORITY.high, channel: 'door' });
        break;

      case 'doorOpened':
        am.playSFX('office.doorOpen', { gain: 0.9, priority: PRIORITY.high, channel: 'door' });
        break;

      case 'lightOn':
        am.playSFX('office.lightOn', { gain: 0.5, rate: 0.98 + Math.random() * 0.04, priority: PRIORITY.medium, channel: 'lightClick' });
        am.startLoop('lightBuzz', 'office.lightBuzz', { bus: 'sfx', gain: 0.35, fade: 0.06 });
        break;

      case 'lightOff':
        am.playSFX('office.lightOff', { gain: 0.45, rate: 0.98 + Math.random() * 0.04, priority: PRIORITY.medium, channel: 'lightClick' });
        am.stopLoop('lightBuzz', 0.08);
        break;

      case 'monsterMoved':
        this.monsterMovedCue(data);
        break;

      case 'monsterAtDoor':
        this.monsterAtDoorCue(data);
        break;

      case 'monsterRetreat':
        if (data.monster.id === 'black' && Math.random() < AUDIO_SETTINGS.monsterCues.black.retreat) {
          this.schedule(0.5 + Math.random(), () => am.playRandomSFX(['monsters.blackStep', 'monsters.blackDrag'], { gain: 0.2, rate: randomPitch(), pan: randomPan(), priority: PRIORITY.high }));
        }
        break;

      case 'attackBlocked':
        am.playSFX('office.doorBang', { gain: 1, priority: PRIORITY.high, channel: 'bang' });
        break;

      case 'powerOut':
        this.clearQueue();
        am.stopLoop('lightBuzz', 0.05);
        am.stopLoop('camStatic', 0.1);
        am.stopLoop('crtHum', 0.3);
        am.stopLoop('watcherWhine', 0.2);
        am.stopLoop('morrowBreath', 1.5);
        am.stopLoop('ventRattle', 0.3);
        am.playSFX('office.powerDown', { gain: 1, priority: PRIORITY.high });
        am.setAmbienceLayer('hum', 0, 2.5);   // o edifício "morre": fica o silêncio
        am.setAmbienceLayer('vent', 0, 3.5);
        am.setAmbienceLayer('late', 0, 2);
        am.setAmbienceLayer('drone', 0.35, 6);
        break;

      case 'powerOutEyes':
        if (data.monsterId === 'watcher') am.playSFX('monsters.watcherCrackle', { gain: 0.25, priority: PRIORITY.high });
        else am.playSFX('monsters.blackBreath', { gain: 0.3, priority: PRIORITY.high });
        break;

      case 'morrowState':
        this.morrowStateCue(data);
        break;

      case 'morrowHunt':
        // Saiu da sala: patas rápidas, impacto, e a respiração deixa de estar onde estava
        am.stopLoop('morrowBreath', 0.4);
        am.playSFX('monsters.morrowImpact', { gain: 0.35, pan: -0.4, priority: PRIORITY.high });
        this.schedule(0.25, () => am.playSFX('monsters.morrowRunQuad', { gain: 0.4, rate: randomPitch(), pan: -0.3, priority: PRIORITY.high, channel: 'morrowRun' }));
        break;

      case 'morrowAtDoor':
        am.playSFX('monsters.morrowImpact', { gain: 0.9, priority: PRIORITY.high });
        am.playSFX('cameras.interference', { gain: 0.35, priority: PRIORITY.high, channel: 'interference' });
        break;

      case 'morrowBreach':
        am.playSFX('office.doorBreach', { gain: 1, priority: PRIORITY.highest, channel: 'door' });
        break;

      case 'echoState':
        this.echoStateCue(data);
        break;

      case 'echoEnterVent':
        // Entrou nas condutas: o metal cede um bocadinho, longe
        am.playSFX('monsters.echoVentMetal', { gain: 0.22, rate: randomPitch(), pan: -0.6, priority: PRIORITY.high });
        break;

      case 'echoMoved':
        this.echoMovedCue(data);
        break;

      case 'echoAtVent':
        // Está mesmo atrás da tua grelha
        am.startLoop('ventRattle', 'office.ventRattle', { bus: 'sfx', gain: 0.5, fade: 0.3 });
        am.playSFX('monsters.echoVentMetal', { gain: 0.6, pan: -0.5, priority: PRIORITY.high });
        break;

      case 'echoPush':
        am.playSFX('office.ventPush', { gain: 0.95, rate: randomPitch(), pan: -0.45, priority: PRIORITY.high, channel: 'ventPush' });
        break;

      case 'ventHold':
        am.playSFX('office.ventGrab', { gain: 0.6, rate: randomPitch(), pan: -0.45, priority: PRIORITY.medium, channel: 'ventGrab' });
        if (am.loops.ventRattle) am.setLoopGain('ventRattle', 0.25, 0.05);
        break;

      case 'ventRelease':
        if (am.loops.ventRattle) am.setLoopGain('ventRattle', 0.5, 0.1);
        break;

      case 'echoRepelled':
        // Desiste: metal, arranhões a afastar... e depois silêncio
        am.stopLoop('ventRattle', 0.25);
        am.playSFX('office.ventPush', { gain: 0.7, pan: -0.45, priority: PRIORITY.high, channel: 'ventPush' });
        this.schedule(0.35, () => am.playSFX('monsters.echoRetreat', { gain: 0.45, pan: -0.55, priority: PRIORITY.high }));
        this.echoCueTimer = 8 + Math.random() * 4;
        break;

      case 'preAttack':
        // Silêncio súbito mesmo antes do susto
        am.duck('ambience', 0, 0.06);
        am.duck('sfx', 0.15, 0.06);
        break;

      case 'caught':
        this.mode = 'end';
        this.clearQueue();
        am.playJumpscare(data);
        break;

      case 'nightWon':
        this.mode = 'end';
        this.clearQueue();
        am.stopAllVoices(0.4);
        am.stopAllLoops(1.2);
        am.playSFX('ui.sixAm', { gain: 0.9, priority: PRIORITY.highest });
        break;

      default:
        break;
    }
  },

  // Mudanças de fase do Morrow
  morrowStateCue({ from, to }) {
    if (this.mode !== 'night') return;
    const am = audioManager;
    const order = ['sleeping', 'restless', 'awake', 'standing', 'hunting'];
    const rising = order.indexOf(to) > order.indexOf(from);
    const near = this.morrowWatched;
    const gain = near ? 0.75 : 0.3;
    if (rising && to === 'restless') {
      am.playSFX('monsters.morrowShift', { gain: gain * 0.6, priority: PRIORITY.high, pan: near ? 0 : -0.5 });
    } else if (rising && to === 'awake') {
      am.playSFX('monsters.morrowWake', { gain, priority: PRIORITY.high, pan: near ? 0 : -0.5 });
    } else if (rising && to === 'standing') {
      am.playSFX('monsters.morrowStand', { gain: gain * 1.1, priority: PRIORITY.high, pan: near ? 0 : -0.5 });
    } else if (!rising && to !== 'hunting') {
      // a acalmar: um suspiro longo
      am.playSFX('monsters.morrowShift', { gain: gain * 0.4, priority: PRIORITY.medium, pan: near ? 0 : -0.5 });
    }
    this.morrowCueTimer = Math.min(this.morrowCueTimer, 2 + Math.random() * 2);
  },

  // Echo: quase nada fora das vents (é silencioso); nas vents, pistas pequenas
  echoStateCue({ monster, from, to }) {
    if (this.mode !== 'night') return;
    const am = audioManager;
    if (to === 'listening' && Math.random() < 0.5) {
      am.playSFX('monsters.echoShift', { gain: 0.12, rate: randomPitch(), pan: randomPan(0.8), priority: PRIORITY.medium });
    } else if (to === 'investigating' && Math.random() < 0.4) {
      am.playSFX('monsters.echoClick', { gain: 0.1, rate: randomPitch(), pan: randomPan(0.8), priority: PRIORITY.medium });
    } else if (to === 'retreating' && from !== 'atVent' && Math.random() < 0.6) {
      const near = monster.position === 'ventC' || monster.position === 'ventB';
      am.playSFX('monsters.echoRetreat', { gain: near ? 0.3 : 0.12, pan: -0.5, priority: PRIORITY.medium });
    }
  },

  echoMovedCue({ monster, to }) {
    if (this.mode !== 'night') return;
    const E = AUDIO_SETTINGS.echo;
    const base = E.ventGain[to];
    if (!base || Math.random() >= E.moveCueChance) return;
    if (monster.state === 'retreating') return;
    const watched = this.echoWatchedVent === to;
    const gain = base * (watched ? E.watchedBoost : 1) * (0.8 + Math.random() * 0.4);
    audioManager.playSFX(Math.random() < 0.7 ? 'monsters.echoScratch' : 'monsters.echoVentMetal', {
      gain, rate: randomPitch(), pan: -0.5 + Math.random() * 0.3, priority: PRIORITY.high, channel: 'echoCue'
    });
  },

  // Enquanto está nas vents: arranhões, metal, respiração. Se parou para ouvir, quase silêncio.
  updateEcho(dt, echo) {
    const E = AUDIO_SETTINGS.echo;
    const am = audioManager;
    this.echoWatchedVent = echo.watched ? echo.position : null;
    if (echo.state === 'atVent' || echo.state === 'attacking') return;
    if (!echo.inVent && am.loops.ventRattle) am.stopLoop('ventRattle', 0.3);
    if (!echo.inVent) return;

    this.echoCueTimer -= dt;
    if (this.echoCueTimer > 0) return;
    this.echoCueTimer = randomRange(E.cueDelay);
    const base = E.ventGain[echo.position] * (echo.watched ? E.watchedBoost : 1);
    const pan = -0.5 + Math.random() * 0.3;

    if (echo.still) {
      // Parou para ouvir: no máximo uma respiração quase inaudível
      if (Math.random() < 0.35) am.playSFX('monsters.echoBreath', { gain: base * 0.45, pan, priority: PRIORITY.low, channel: 'echoCue' });
      return;
    }
    const roll = Math.random();
    const id = roll < 0.45 ? 'monsters.echoScratch' : roll < 0.7 ? 'monsters.echoVentMetal' : roll < 0.9 ? 'monsters.echoBreath' : 'monsters.echoClick';
    am.playSFX(id, { gain: base * (0.7 + Math.random() * 0.5), rate: randomPitch(), pan, priority: PRIORITY.medium, channel: 'echoCue' });
  },

  // Respiração e pequenos sons do Morrow enquanto está na sala
  updateMorrow(dt, morrow) {
    const am = audioManager;
    const M = AUDIO_SETTINGS.morrow;
    this.morrowWatched = morrow.watched;
    const inRoom = M.breathWatched[morrow.state] !== undefined;

    if (!inRoom) {
      if (am.loops.morrowBreath) am.stopLoop('morrowBreath', 0.4);
      return;
    }

    const breath = morrow.watched ? M.breathWatched[morrow.state] : M.breathDistant[morrow.state];
    if (breath > 0.001) {
      if (!am.loops.morrowBreath) am.startLoop('morrowBreath', 'monsters.morrowBreath', { bus: 'sfx', gain: breath, fade: 0.6 });
      else am.setLoopGain('morrowBreath', breath, 0.25);
      am.setLoopRate('morrowBreath', M.breathRate[morrow.state], 1.5);
    } else if (am.loops.morrowBreath) {
      am.stopLoop('morrowBreath', 0.8);
    }

    // Pequenos sons: correntes a dormir; rosnar e garras quando está agitado
    this.morrowCueTimer -= dt;
    if (this.morrowCueTimer > 0) return;
    this.morrowCueTimer = randomRange(M.cueDelay[morrow.state]);
    const pools = {
      sleeping: ['monsters.morrowChain', 'monsters.morrowShift'],
      restless: ['monsters.morrowShift', 'monsters.morrowChain', 'monsters.morrowGrowl', 'monsters.morrowClaw'],
      awake: ['monsters.morrowGrowl', 'monsters.morrowClaw', 'monsters.morrowChain'],
      standing: ['monsters.morrowGrowl', 'monsters.morrowClaw', 'monsters.morrowGrowl']
    };
    const pool = pools[morrow.state];
    const id = pool[Math.floor(Math.random() * pool.length)];
    const base = morrow.watched ? M.cueGainWatched : M.cueGainDistant;
    const gain = base * (morrow.state === 'sleeping' ? 0.5 : 1) * (0.8 + Math.random() * 0.4);
    if (!morrow.watched && morrow.state === 'sleeping') return;   // a dormir, de longe, não se ouve nada
    am.playSFX(id, { gain, rate: randomPitch(), pan: morrow.watched ? randomPan(0.3) : -0.5, priority: PRIORITY.medium, channel: 'morrowCue' });
  },

  bumpStatic(level) {
    const loop = audioManager.loops.camStatic;
    if (!loop || !audioManager.ctx) return;
    const now = audioManager.ctx.currentTime;
    loop.amp.gain.cancelScheduledValues(now);
    loop.amp.gain.setTargetAtTime(level, now, 0.01);
    loop.amp.gain.setTargetAtTime(0.5, now + 0.08, 0.25);   // volta devagar ao nível normal
    loop.target = 0.5;
  },

  // Pistas ocasionais quando um monstro se mexe (nunca sempre!)
  monsterMovedCue({ monster, to, distance }) {
    if (this.mode !== 'night' || to === 'door') return;
    const am = audioManager;

    // Morrow a correr: sinais fortes, sempre (se o deixaste fugir, tens de saber)
    if (monster.id === 'morrow') {
      const biped = Math.random() < (distance <= 1 ? 0.6 : 0.3);
      am.playSFX(biped ? 'monsters.morrowRunBiped' : 'monsters.morrowRunQuad', {
        gain: distance <= 1 ? 0.85 : 0.6, rate: randomPitch(), pan: distance <= 1 ? 0.15 : -0.2,
        priority: PRIORITY.high, channel: 'morrowRun'
      });
      if (distance <= 1) am.playSFX('monsters.morrowImpact', { gain: 0.5, priority: PRIORITY.high });
      return;
    }

    const cues = AUDIO_SETTINGS.monsterCues[monster.id];
    if (!cues) return;
    const chance = distance <= 1 ? cues.close : distance === 2 ? cues.near : cues.far;
    if (Math.random() >= chance) return;

    if (monster.id === 'black') {
      const gain = distance <= 1 ? 0.42 : distance === 2 ? 0.3 : 0.18;
      const sound = ['monsters.blackStep', 'monsters.blackStep', 'monsters.blackDrag', 'monsters.blackMetal', 'monsters.blackRumble'][Math.floor(Math.random() * 5)];
      this.schedule(0.3 + Math.random() * 2.2, () => am.playSFX(sound, { gain: gain * (0.8 + Math.random() * 0.4), rate: randomPitch(), pan: randomPan(), priority: PRIORITY.high }));
    } else if (monster.id === 'watcher') {
      const gain = distance <= 1 ? 0.3 : 0.2;
      this.schedule(0.2 + Math.random() * 1.5, () => {
        if (Math.random() < 0.5) am.playSFX('monsters.watcherGlitch', { gain, pan: randomPan(0.8), priority: PRIORITY.high });
        else am.playSFX('cameras.interference', { gain: gain * 0.8, rate: randomPitch(), pan: randomPan(0.8), priority: PRIORITY.high });
      });
    }
  },

  // À porta: quase nada. O jogador tem de usar a LIGHT.
  monsterAtDoorCue(monster) {
    const am = audioManager;
    const cues = AUDIO_SETTINGS.monsterCues[monster.id];
    if (!cues || Math.random() >= cues.atDoor) return;
    const delay = 0.4 + Math.random() * 0.9;
    if (monster.id === 'black') {
      const sound = Math.random() < 0.6 ? 'monsters.blackBreath' : 'monsters.blackDrag';
      this.schedule(delay, () => am.playSFX(sound, { gain: 0.16, pan: randomPan(0.2), priority: PRIORITY.high }));
    } else {
      this.schedule(delay, () => am.playSFX('monsters.watcherCrackle', { gain: 0.16, pan: randomPan(0.3), priority: PRIORITY.high }));
    }
  },

  /* ----- Atualização a cada frame (só durante a noite) ----- */
  update(dt, state) {
    if (!audioManager.ready || this.mode !== 'night') return;
    const am = audioManager;

    // Pistas agendadas (tempo do jogo: param se o jogo parar)
    for (const item of [...this.queue]) {
      item.time -= dt;
      if (item.time <= 0) {
        this.queue.splice(this.queue.indexOf(item), 1);
        item.fn();
      }
    }

    // Pressão: drone grave que sobe devagar quando há perigo perto
    const P = AUDIO_SETTINGS.pressure;
    let danger = 0;
    for (const m of state.monsters) {
      const level = m.distance === 0 ? 1 : m.distance === 1 ? 0.6 : m.distance === 2 ? 0.2 : 0;
      danger = Math.max(danger, level);
    }
    // Morrow acordado também pesa: o drone sobe com a raiva dele
    if (state.morrow && state.morrow.rage > 50) {
      danger = Math.max(danger, Math.min(0.75, (state.morrow.rage - 50) / 50 * 0.75));
    }
    if (state.morrow && state.morrow.state !== 'hunting' && state.morrow.state !== 'attacking') {
      this.updateMorrow(dt, state.morrow);
    }
    // Echo nas vents também pesa (C e a grelha mais do que A)
    if (state.echo) {
      const level = state.echo.state === 'atVent' ? 0.8 : [0, 0.12, 0.3, 0.55][state.echo.ventIndex] || 0;
      danger = Math.max(danger, level);
      this.updateEcho(dt, state.echo);
    }
    const lateTarget = state.hour >= 4 ? 1 : 0;
    this.late += (lateTarget - this.late) * Math.min(1, dt / 20);
    const target = state.powerOut ? 0.35 : Math.min(1, danger * P.maxLevel + this.late * P.lateBonus);
    const speed = target > this.pressure ? P.riseSeconds : P.fallSeconds;
    this.pressure += (target - this.pressure) * Math.min(1, dt / speed);
    if (!state.powerOut) {
      am.setAmbienceLayer('drone', this.pressure, 1.5);
      am.setAmbienceLayer('late', this.late * 0.7, 3);
    }

    // Watcher observado: interferência aguda que cresce com a exposição
    const W = AUDIO_SETTINGS.watcherStare;
    if (state.watcherWatched && state.camerasOpen) {
      const level = Math.min(1, state.watcherExposure / W.fullAtExposure);
      if (level > 0.05) {
        if (!am.loops.watcherWhine) am.startLoop('watcherWhine', 'monsters.watcherWhine', { bus: 'sfx', gain: level * W.maxWhine, fade: 0.4 });
        else am.setLoopGain('watcherWhine', level * W.maxWhine, 0.15);
      }
      // exposição perigosa: pops e glitches pequenos
      if (state.watcherExposure >= 4) {
        this.stareTimer -= dt;
        if (this.stareTimer <= 0) {
          this.stareTimer = state.watcherExposure >= 6 ? 0.2 + Math.random() * 0.4 : 0.35 + Math.random() * 0.65;
          const id = Math.random() < 0.6 ? 'monsters.watcherCrackle' : 'monsters.watcherGlitch';
          am.playSFX(id, { gain: 0.12 + 0.1 * level, pan: randomPan(0.9), priority: PRIORITY.medium });
        }
      }
    } else if (am.loops.watcherWhine) {
      am.stopLoop('watcherWhine', 0.4);
    }

    // Eventos ambientais aleatórios
    this.updateAmbientEvents(dt, state, danger);

    // 4–6 AM: falhas elétricas ocasionais (o hum desaparece por instantes)
    if (state.hour >= 4 && !state.powerOut) {
      this.failureTimer -= dt;
      if (this.failureTimer <= 0) {
        this.failureTimer = 18 + Math.random() * 25;
        this.electricalFailure();
      }
    }
  },

  updateAmbientEvents(dt, state, danger) {
    if (state.powerOut) return;
    const E = AUDIO_SETTINGS.ambientEvents;
    this.eventTimer -= dt;
    if (this.eventTimer > 0) return;

    const late = state.hour >= 4;
    this.eventTimer = late ? randomRange([E.lateMinDelay, E.lateMaxDelay]) : randomRange([E.minDelay, E.maxDelay]);

    // Silêncio: às vezes não acontece nada, e há mais silêncio quando o perigo está perto
    if (Math.random() < E.silenceChance + danger * 0.4) return;
    // No máximo um evento ambiental de cada vez
    if (audioManager.isChannelBusy('ambientEvent')) return;

    const options = E.pool.filter((e) => e.id !== this.lastEvent);
    const total = options.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    let chosen = options[0];
    for (const e of options) { roll -= e.weight; if (roll <= 0) { chosen = e; break; } }
    this.lastEvent = chosen.id;

    audioManager.playSFX(chosen.id, {
      bus: 'ambience',
      gain: randomRange(chosen.gain),
      rate: chosen.pitch ? randomPitch() : 1,
      pan: randomPan(0.7),
      priority: PRIORITY.low,
      channel: 'ambientEvent'
    });

    // 4–6 AM: de vez em quando um segundo evento logo a seguir (mais irregular)
    if (late && Math.random() < 0.25) this.eventTimer = 1.5 + Math.random() * 2.5;
  },

  electricalFailure() {
    const am = audioManager;
    am.duck('ambience', 0.15, 0.05);
    am.playSFX('ambience.electricCrackle', { bus: 'ambience', gain: 0.5, rate: randomPitch(), pan: randomPan(0.4), priority: PRIORITY.low, channel: 'ambientEvent' });
    if (this.onFlicker) this.onFlicker();
    this.schedule(0.3 + Math.random() * 0.5, () => {
      if (this.mode === 'night') am.duck('ambience', 1, 0.6);
    });
  }
};
