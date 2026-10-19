'use strict';

/* =========================================================
   SECURITY GUARD — VOICE ACTING (voiceManager) + LEGENDAS

   As falas estão em voice-lines.js (VOICE_LINES). Aqui fica:
   - subtitles ....... a legenda no fundo do ecrã ([PHONE] / [UNKNOWN]...)
   - voiceManager .... carrega, processa (Web Audio) e toca as vozes

   Os ficheiros de voz nunca são alterados: todo o "telefone",
   "intercom", "UNKNOWN" e "Subject Zero" é feito em tempo real com
   filtros. Se um ficheiro faltar (ou o browser não tiver Web Audio),
   a fala continua só com legendas, nos tempos dos cues.

   Regras:
   - só uma fala narrativa de cada vez: uma fala nova espera pela
     anterior, a não ser que peça { interrupt: true };
   - SKIP / fim da cutscene / início da noite param tudo (voz, estática,
     legendas, temporizadores);
   - com o separador escondido o relógio da fala para (o áudio também,
     porque o audioManager suspende o AudioContext): nada se sobrepõe;
   - enquanto alguém fala o ambiente baixa ~22% e volta devagar.

   Funções curtas para o resto do jogo:
     playVoice(id, opts), stopVoice(), playPhoneVoice(id), playIntercomVoice(id),
     playUnknownVoice(id, { corruption }), playZeroVoice(id),
     showSubtitle(text, speaker, style), hideSubtitle()
   ========================================================= */

const VOICE_SETTINGS = {
  loadWait: 1.5,                  // segundos que uma fala espera pelo ficheiro antes de seguir só com legendas
  tail: 0.35,                     // segundos depois da última frase
  // Tempo automático de cada frase (sem start/end): base + segundos por letra, entre min e max.
  // 'message' = o ritmo das mensagens das cutscenes; 'call' = o ritmo (mais lento) da chamada da intro.
  paces: {
    message: { base: 0.7, perChar: 0.032, min: 1.5, max: 3.6 },
    call: { base: 0.85, perChar: 0.038, min: 1.7, max: 4.5 }
  },
  subtitlesKey: 'securityGuard.subtitles',

  phone: { highpass: 300, lowpass: 3400, lead: 0.3, hiss: 0.012, crackle: 0.05, crackleEvery: [0.7, 2.2] },
  intercom: { highpass: 170, lowpass: 5200, reverb: 0.45, dry: 0.85, wet: 0.22, gain: 1 },
  distantIntercom: { highpass: 230, lowpass: 2300, reverb: 1.6, dry: 0.4, wet: 0.6, gain: 0.6 }
};

const rand = (a, b) => a + Math.random() * (b - a);

// Tempos das frases (segundos desde o início da voz) a partir dos cues
function voiceCueTimes(cues, paceName = 'message') {
  const P = VOICE_SETTINGS.paces[paceName] || VOICE_SETTINGS.paces.message;
  const out = [];
  let t = 0.1;
  for (const cue of cues || []) {
    if (cue.pause !== undefined) { t += cue.pause; continue; }
    const start = cue.start !== undefined ? cue.start : t;
    const auto = Math.min(P.max, Math.max(P.min, P.base + cue.text.length * P.perChar));
    const end = cue.end !== undefined ? cue.end : start + auto;
    out.push({ start, end, text: cue.text });
    t = end;
  }
  return out;
}


/* ---------------------------------------------------------
   LEGENDAS
   --------------------------------------------------------- */

const subtitles = {
  enabled: true,
  timer: null,
  el: document.getElementById('subtitles'),
  speakerEl: document.querySelector('#subtitles .sub-speaker'),
  textEl: document.querySelector('#subtitles .sub-text'),
  button: document.getElementById('btn-subtitles'),

  load() {
    try {
      this.enabled = localStorage.getItem(VOICE_SETTINGS.subtitlesKey) !== 'false';   // por defeito: ON
    } catch (error) { /* fica ON só nesta sessão */ }
    this.render();
  },

  set(on) {
    this.enabled = on;
    try {
      localStorage.setItem(VOICE_SETTINGS.subtitlesKey, String(on));
    } catch (error) { /* ignorar */ }
    this.render();
  },

  render() {
    ui.game.classList.toggle('subs-off', !this.enabled);
    this.button.textContent = this.enabled ? 'ON' : 'OFF';
    this.button.classList.toggle('is-active', this.enabled);
  },

  // speaker: 'PHONE', 'ASTERION INTERCOM'... (vazio = só a legenda, ex.: *click*)
  show(text, speaker = '', style = '') {
    clearTimeout(this.timer);
    this.speakerEl.textContent = speaker ? `[${speaker}]` : '';
    this.textEl.textContent = text;
    this.el.dataset.voice = style;
    this.el.classList.remove('on');
    void this.el.offsetWidth;          // recomeça a animação de entrada
    this.el.classList.add('on');
  },

  hide() {
    clearTimeout(this.timer);
    this.el.classList.remove('on');
  },

  // Legenda de um som (ex.: *click*) durante uns instantes
  caption(text, ms) {
    this.show(text);
    this.timer = setTimeout(() => this.hide(), ms);
  },

  text() {
    return this.el.classList.contains('on') ? this.textEl.textContent : '';
  }
};


/* ---------------------------------------------------------
   VOICE MANAGER
   --------------------------------------------------------- */

const voiceManager = {
  cache: {},                 // ficheiro -> Promise<AudioBuffer | null>
  reversedCache: new WeakMap(),
  impulses: {},
  noise: null,
  current: null,             // a fala a tocar
  queue: [],                 // falas à espera da atual
  extras: [],                // estática solta (atender / desligar o telefone)
  log: [],                   // últimas falas (útil para testes / debug)

  ac() {
    return audioManager.ctx;
  },

  /* ----- Ficheiros ----- */

  // Carrega (uma vez) e descodifica. Sem AudioContext ainda: tenta outra vez mais tarde.
  loadFile(url) {
    if (this.cache[url]) return this.cache[url];
    const ctx = this.ac();
    if (!ctx) return Promise.resolve(null);
    const candidates = [url];
    if (/\.ogg$/i.test(url)) candidates.push(url.replace(/\.ogg$/i, '.mp3'));
    this.cache[url] = (async () => {
      if (location.protocol !== 'file:') {
        for (const path of candidates) {
          try {
            const response = await fetch(path);
            if (!response.ok) continue;
            return await ctx.decodeAudioData(await response.arrayBuffer());
          } catch (error) { /* tenta o próximo formato */ }
        }
      }
      console.warn(`[voice] Ficheiro de voz em falta: ${url} — a fala continua só com legendas.`);
      return null;
    })();
    return this.cache[url];
  },

  parts(line) {
    if (line.parts) return line.parts.map((p) => ({ file: p.file, at: p.at || 0 }));
    return line.file ? [{ file: line.file, at: 0 }] : [];
  },

  // Só as falas da cena que vem a seguir (nunca o jogo todo de uma vez)
  preload(ids) {
    for (const id of ids || []) {
      const line = VOICE_LINES[id];
      if (line) this.parts(line).forEach((p) => this.loadFile(p.file));
    }
  },

  loadLine(line) {
    return Promise.all(this.parts(line).map((p) => this.loadFile(p.file).then((buffer) => ({ buffer, at: p.at }))))
      .then((list) => list.filter((p) => p.buffer));
  },

  // Quanto dura uma fala (pelos cues): o que as cutscenes usam para o seu ritmo
  durationMs(id) {
    const line = VOICE_LINES[id];
    if (!line) return 0;
    const cues = voiceCueTimes(line.cues, line.pace);
    const last = cues.length ? cues[cues.length - 1].end : 0;
    return Math.round((this.leadOf(line, {}) + last + VOICE_SETTINGS.tail) * 1000);
  },

  leadOf(line, opts) {
    const filter = opts.filter || line.filter;
    return (filter === 'phone' ? VOICE_SETTINGS.phone.lead : 0) + (opts.delay || 0);
  },

  /* ----- Tocar ----- */

  // opts: interrupt, delay (s), filter, corruption, gain, subtitles (false = não mostrar em baixo),
  //       onLine(text, index) (ex.: escrever no monitor), onEnd()
  play(id, opts = {}) {
    const line = VOICE_LINES[id];
    if (!line) {
      console.warn(`[voice] Fala desconhecida: ${id}`);
      if (opts.onEnd) opts.onEnd();
      return null;
    }
    const handle = { id, line, opts, sources: [], nodes: [], cues: voiceCueTimes(line.cues, line.pace), elapsed: 0, shown: -1, audible: false, ended: false };
    if (this.current && !opts.interrupt) {
      this.queue.push(handle);           // nunca duas personagens por acidente: espera a vez
      return handle;
    }
    if (this.current) this.end(this.current, 0.05, false);
    this.start(handle);
    return handle;
  },

  start(handle) {
    this.current = handle;
    handle.lead = this.leadOf(handle.line, handle.opts);
    audioManager.talkDuck(true);
    const ready = this.loadLine(handle.line);
    const timeout = new Promise((resolve) => { handle.waitTimer = setTimeout(() => resolve(null), VOICE_SETTINGS.loadWait * 1000); });
    Promise.race([ready, timeout]).then((parts) => {
      clearTimeout(handle.waitTimer);
      if (this.current !== handle || handle.ended) return;   // parada entretanto (SKIP)
      this.begin(handle, parts || []);
    });
  },

  begin(handle, parts) {
    const ctx = this.ac();
    const { line, opts } = handle;
    const filter = opts.filter || line.filter || 'clean';
    const corruption = opts.corruption !== undefined ? opts.corruption : (line.corruption || 0);
    let audioEnd = 0;

    if (ctx && ctx.state !== 'closed') {
      handle.t0 = ctx.currentTime + 0.02;
      const out = ctx.createGain();
      out.gain.value = (line.gain || 1) * (opts.gain || 1);
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.3, Math.min(0.3, line.pan || 0));   // subtil: nunca só num ouvido
      out.connect(panner).connect(audioManager.nodes.voice);
      handle.nodes.push(out, panner);
      handle.out = out;
      // Telefone: estática curta antes da voz (mesmo sem ficheiro)
      if (filter === 'phone') this.noiseBurst(handle, out, handle.t0, handle.lead * 0.85, 0.05, 'bandpass', 1700, 0.5);
      if (parts.length) {
        handle.audible = true;
        const builders = { phone: 'buildPhone', intercom: 'buildIntercom', distantIntercom: 'buildIntercom', unknown: 'buildUnknown', zero: 'buildZero', clean: 'buildClean' };
        audioEnd = this[builders[filter] || 'buildClean'](handle, parts, out, { distant: filter === 'distantIntercom', corruption });
      }
    }

    const lastCue = handle.cues.length ? handle.cues[handle.cues.length - 1].end : 0;
    handle.duration = handle.lead + Math.max(lastCue, audioEnd) + VOICE_SETTINGS.tail;
    handle.filter = filter;
    handle.lastTick = performance.now();
    handle.timer = setInterval(() => this.tick(handle), 40);
    this.log.push({ id: handle.id, filter, audible: handle.audible, corruption });
    if (this.log.length > 50) this.log.shift();
    emitGameEvent('voiceStart', { id: handle.id, audible: handle.audible });
    this.tick(handle);
  },

  // Relógio da fala: só anda com o separador visível (tal como o áudio)
  tick(handle) {
    if (handle.ended) return;
    const now = performance.now();
    const dt = Math.min(0.25, (now - handle.lastTick) / 1000);
    handle.lastTick = now;
    if (document.visibilityState !== 'hidden') handle.elapsed += dt;
    const t = handle.elapsed - handle.lead;
    const index = handle.cues.findIndex((c) => t >= c.start && t < c.end);
    if (index !== handle.shown) {
      handle.shown = index;
      const cue = handle.cues[index];
      if (handle.opts.subtitles !== false) {
        if (cue) subtitles.show(cue.text, handle.line.speaker, handle.filter);
        else subtitles.hide();
      }
      if (cue && handle.opts.onLine) handle.opts.onLine(cue.text, index);
    }
    if (handle.elapsed >= handle.duration) this.end(handle, 0.08, true);
  },

  // Acaba uma fala. natural = chegou ao fim (chama onEnd e começa a próxima da fila)
  end(handle, fade, natural) {
    if (handle.ended) return;
    handle.ended = true;
    clearTimeout(handle.waitTimer);
    clearInterval(handle.timer);
    const ctx = this.ac();
    if (ctx && handle.out) {
      const now = ctx.currentTime;
      handle.out.gain.cancelScheduledValues(now);
      handle.out.gain.setTargetAtTime(0, now, Math.max(0.005, fade / 3));
      handle.sources.forEach((s) => { try { s.stop(now + fade + 0.05); } catch (error) { /* já parou */ } });
      setTimeout(() => handle.nodes.forEach((n) => { try { n.disconnect(); } catch (error) { /* ignorar */ } }), (fade + 0.2) * 1000);
    }
    if (handle.opts.subtitles !== false) subtitles.hide();
    if (this.current === handle) this.current = null;
    emitGameEvent('voiceEnd', { id: handle.id, natural });
    if (!natural) return;
    if (handle.opts.onEnd) handle.opts.onEnd();
    const next = this.queue.shift();
    if (next) this.start(next);
    else if (!this.current) audioManager.talkDuck(false);
  },

  // Pára tudo (SKIP, fim da cutscene, início da noite): voz, fila, estática, legendas
  stopAll(fade = 0.03) {
    this.queue = [];
    if (this.current) this.end(this.current, fade, false);
    const ctx = this.ac();
    if (ctx) this.extras.forEach((s) => { try { s.stop(ctx.currentTime + fade); } catch (error) { /* já parou */ } });
    this.extras = [];
    subtitles.hide();
    audioManager.talkDuck(false);
  },

  isSpeaking() {
    return Boolean(this.current);
  },

  /* ----- Peças de Web Audio ----- */

  // Nota: no Web Audio o Q dos lowpass / highpass é em dB (-3.01 dB = Butterworth, sem ressonância);
  // nos bandpass / peaking é o Q normal.
  biquad(type, freq, q = null, gain = 0) {
    const f = this.ac().createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q !== null ? q : (type === 'lowpass' || type === 'highpass' ? -3.01 : 0.707);
    f.gain.value = gain;
    return f;
  },

  // Saturação suave (tanh)
  shaper(amount) {
    const s = this.ac().createWaveShaper();
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    s.curve = curve;
    s.oversample = '2x';
    return s;
  },

  compressor(threshold, ratio) {
    const c = this.ac().createDynamicsCompressor();
    c.threshold.value = threshold;
    c.ratio.value = ratio;
    c.knee.value = 6;
    c.attack.value = 0.004;
    c.release.value = 0.18;
    return c;
  },

  // Liga uma lista de nós em série; devolve a entrada e a saída
  chain(handle, nodes) {
    nodes.reduce((a, b) => { a.connect(b); return b; });
    handle.nodes.push(...nodes);
    return { input: nodes[0], output: nodes[nodes.length - 1] };
  },

  gain(handle, value) {
    const g = this.ac().createGain();
    g.gain.value = value;
    handle.nodes.push(g);
    return g;
  },

  noiseBuffer() {
    if (this.noise) return this.noise;
    const ctx = this.ac();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  },

  reversed(buffer) {
    if (this.reversedCache.has(buffer)) return this.reversedCache.get(buffer);
    const copy = this.ac().createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = copy.getChannelData(ch);
      for (let i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i];
    }
    this.reversedCache.set(buffer, copy);
    return copy;
  },

  // Reverberação curta e "metálica" (colunas num complexo industrial), gerada uma vez
  impulse(seconds) {
    const key = String(seconds);
    if (this.impulses[key]) return this.impulses[key];
    const ctx = this.ac();
    const length = Math.round(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / ctx.sampleRate;
        const decay = Math.pow(1 - i / length, 3);
        // ruído a decair + duas ressonâncias de metal + primeiras reflexões
        d[i] = decay * ((Math.random() * 2 - 1) * 0.6 + 0.25 * Math.sin(2 * Math.PI * (870 + ch * 23) * t) + 0.15 * Math.sin(2 * Math.PI * 1460 * t));
      }
      [0.011, 0.023, 0.037 + ch * 0.004].forEach((s, k) => { const i = Math.round(s * ctx.sampleRate); if (i < length) d[i] += 0.6 - k * 0.15; });
    }
    this.impulses[key] = buffer;
    return buffer;
  },

  // Os ficheiros da fala como fontes, ligados a dest. delay em segundos (segunda camada).
  voiceSources(handle, parts, dest, { delay = 0, detune = 0 } = {}) {
    const ctx = this.ac();
    const sources = [];
    let end = 0;
    for (const p of parts) {
      const src = ctx.createBufferSource();
      src.buffer = p.buffer;
      src.detune.value = detune;
      src.connect(dest);
      src.start(this.at(handle, p.at + delay));
      sources.push(src);
      end = Math.max(end, p.at + delay + p.buffer.duration);
    }
    handle.sources.push(...sources);
    return { sources, end };
  },

  // Tempo da fala (segundos) -> tempo do AudioContext
  at(handle, seconds) {
    return handle.t0 + handle.lead + seconds;
  },

  // Rajada de ruído filtrado (estática, crackles). time = tempo do AudioContext.
  noiseBurst(handle, dest, time, dur, gain, type, freq, q = 0.7) {
    const ctx = this.ac();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.biquad(type, freq, q);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + Math.min(0.01, dur / 4));
    g.gain.setValueAtTime(gain, Math.max(time + 0.01, time + dur - 0.02));
    g.gain.linearRampToValueAtTime(0, time + dur);
    src.connect(filter).connect(g).connect(dest);
    if (dur > 0.5) {                 // hiss longo: o ruído repete-se
      src.loop = true;
      src.start(time, Math.random() * 1.5);
      src.stop(time + dur + 0.05);
    } else {
      src.start(time, Math.random() * 1.5, dur + 0.05);
    }
    if (handle) { handle.sources.push(src); handle.nodes.push(filter, g); } else this.extras.push(src);
    return src;
  },

  // Fragmento de um dos ficheiros (stutter / reverso / pitch). s = segundos da fala.
  fragment(handle, parts, dest, s, dur, { reverse = false, detune = 0, gain = 1 } = {}) {
    const part = parts.find((p) => s >= p.at && s < p.at + p.buffer.duration);
    if (!part) return;
    const ctx = this.ac();
    const buffer = reverse ? this.reversed(part.buffer) : part.buffer;
    let offset = Math.max(0, s - part.at);
    if (reverse) offset = Math.max(0, buffer.duration - offset - dur);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.detune.value = detune;
    const g = ctx.createGain();
    const time = this.at(handle, s);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.01);
    g.gain.setValueAtTime(gain, time + dur - 0.015);
    g.gain.linearRampToValueAtTime(0, time + dur);
    src.connect(g).connect(dest);
    src.start(time, offset, dur);
    handle.sources.push(src);
    handle.nodes.push(g);
  },

  // Pequenas oscilações de pitch (cents) num conjunto de fontes
  pitchDrift(handle, sources, end, cents, every = [0.35, 0.8]) {
    for (const src of sources) {
      for (let s = 0; s < end; s += rand(every[0], every[1])) {
        src.detune.setTargetAtTime(rand(-cents, cents), this.at(handle, s), 0.12);
      }
    }
  },

  /* ----- 1. TELEFONE: banda 300–3400 Hz, compressão, um pouco de saturação, hiss e crackles ----- */
  buildPhone(handle, parts, out) {
    const P = VOICE_SETTINGS.phone;
    const ctx = this.ac();
    const c = this.chain(handle, [
      this.biquad('highpass', P.highpass), this.biquad('highpass', P.highpass),
      this.biquad('peaking', 1700, 1, 4),
      this.shaper(2.2),
      this.biquad('lowpass', P.lowpass), this.biquad('lowpass', P.lowpass),
      this.compressor(-26, 5)
    ]);
    // variação muito pequena do sinal (a linha não é estável)
    const wobble = this.gain(handle, 1);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.55;
    const lfoDepth = this.gain(handle, 0.05);
    lfo.connect(lfoDepth).connect(wobble.gain);
    c.output.connect(wobble).connect(out);
    const { end } = this.voiceSources(handle, parts, c.input);
    lfo.start(this.at(handle, 0));
    lfo.stop(this.at(handle, end + 0.1));
    handle.sources.push(lfo);
    // hiss muito baixo durante a fala + crackles ocasionais
    this.noiseBurst(handle, out, this.at(handle, 0), end, P.hiss, 'bandpass', 2400, 0.4);
    for (let s = rand(0.4, 1.2); s < end; s += rand(P.crackleEvery[0], P.crackleEvery[1])) {
      this.noiseBurst(handle, out, this.at(handle, s), rand(0.012, 0.035), P.crackle, 'highpass', 1800);
    }
    return end;
  },

  /* ----- 2. INTERCOM: coluna instalada; limpo, low-pass moderado, reverb curta e metálica ----- */
  buildIntercom(handle, parts, out, { distant }) {
    const S = distant ? VOICE_SETTINGS.distantIntercom : VOICE_SETTINGS.intercom;
    const nodes = [this.biquad('highpass', S.highpass)];
    if (!distant) nodes.push(this.biquad('peaking', 1300, 1, 3.5));
    nodes.push(this.biquad('lowpass', S.lowpass), this.biquad('lowpass', S.lowpass), this.shaper(1.4), this.compressor(-22, 4));
    const c = this.chain(handle, nodes);
    const dry = this.gain(handle, S.dry);
    const wet = this.gain(handle, S.wet);
    const conv = this.ac().createConvolver();
    conv.buffer = this.impulse(S.reverb);
    handle.nodes.push(conv);
    const level = this.gain(handle, S.gain);
    c.output.connect(dry).connect(level);
    c.output.connect(conv).connect(wet).connect(level);
    level.connect(out);
    const { end } = this.voiceSources(handle, parts, c.input);
    return end + (distant ? 0.6 : 0.2);   // a cauda da reverb
  },

  /* ----- 3. UNKNOWN: voz inteligível com uma "cópia" atrasada, pitch drift, glitches,
           estática digital, fragmentos reversos e estéreo instável. corruption 0–1 ----- */
  buildUnknown(handle, parts, out, { corruption }) {
    const k = Math.max(0, Math.min(1, corruption));
    const ctx = this.ac();
    // voz principal (quase limpa)
    const main = this.chain(handle, [this.biquad('highpass', 110), this.biquad('lowpass', 7200), this.compressor(-24, 3)]);
    const dryGain = this.gain(handle, 1);
    main.output.connect(dryGain).connect(out);
    const first = this.voiceSources(handle, parts, main.input);
    const end = first.end;
    // duplicação com alguns ms de diferença, noutra posição estéreo
    const dupFilter = this.biquad('lowpass', 5200);
    const dupGain = this.gain(handle, 0.22 + 0.3 * k);
    const dupPan = ctx.createStereoPanner();
    handle.nodes.push(dupFilter, dupPan);
    dupFilter.connect(dupGain).connect(dupPan).connect(out);
    const second = this.voiceSources(handle, parts, dupFilter, { delay: 0.008 + 0.016 * k });
    // pitch drift mínimo (mais na cópia) e estéreo que nunca fica no sítio
    this.pitchDrift(handle, first.sources, end, 3 + 10 * k);
    this.pitchDrift(handle, second.sources, end, 8 + 30 * k);
    for (let s = 0; s < end; s += rand(0.4, 1)) dupPan.pan.setTargetAtTime(rand(-1, 1) * (0.15 + 0.45 * k), this.at(handle, s), 0.08);
    this.corrupt(handle, parts, out, main.input, dryGain, end, k);
    return end;
  },

  // Glitches comuns a UNKNOWN e Subject Zero
  corrupt(handle, parts, out, input, dryGain, end, k) {
    // falhas curtas: o sinal cai por instantes ou repete um pedacinho (stutter)
    const glitches = Math.round(end * (0.15 + 0.9 * k));
    for (let i = 0; i < glitches; i++) {
      const s = rand(0.3, Math.max(0.35, end - 0.2));
      if (Math.random() < 0.5) {
        const t = this.at(handle, s);
        dryGain.gain.setValueAtTime(0.12, t);
        dryGain.gain.setValueAtTime(1, t + rand(0.04, 0.08));
      } else {
        this.fragment(handle, parts, input, s - 0.07, 0.07, { gain: 0.8 });
      }
    }
    // estática digital
    const bursts = Math.round(end * (0.4 + k));
    for (let i = 0; i < bursts; i++) {
      this.noiseBurst(handle, out, this.at(handle, rand(0, end)), rand(0.015, 0.05), 0.02 + 0.05 * k, 'highpass', 3800);
    }
    // de vez em quando, um fragmento da própria voz ao contrário, muito baixo
    if (k >= 0.25) {
      const reverses = Math.max(1, Math.round(end * k * 0.12));
      const fx = this.biquad('lowpass', 4000);
      handle.nodes.push(fx);
      fx.connect(out);
      for (let i = 0; i < reverses; i++) {
        this.fragment(handle, parts, fx, rand(0.2, Math.max(0.25, end - 0.4)), rand(0.18, 0.35), { reverse: true, gain: 0.07 + 0.1 * k });
      }
    }
  },

  /* ----- 4. SUBJECT ZERO: a voz salta entre telefone, intercom e quase limpa;
           uma segunda camada atrasada; fragmentos com outro pitch; glitches ----- */
  buildZero(handle, parts, out, { corruption }) {
    const k = Math.max(0.5, Math.min(1, corruption || 0.75));
    const ctx = this.ac();
    const split = this.gain(handle, 1);
    const phone = this.chain(handle, [this.biquad('highpass', 320), this.biquad('lowpass', 3300), this.shaper(2.4), this.compressor(-26, 5)]);
    const clean = this.chain(handle, [this.biquad('highpass', 70), this.compressor(-24, 3)]);
    const com = this.chain(handle, [this.biquad('highpass', 180), this.biquad('lowpass', 4800), this.compressor(-22, 4)]);
    const conv = ctx.createConvolver();
    conv.buffer = this.impulse(0.45);
    handle.nodes.push(conv);
    const gPhone = this.gain(handle, 1);
    const gClean = this.gain(handle, 0);
    const gCom = this.gain(handle, 0);
    split.connect(phone.input); phone.output.connect(gPhone).connect(out);
    split.connect(clean.input); clean.output.connect(gClean).connect(out);
    split.connect(com.input); com.output.connect(conv).connect(gCom).connect(out);
    const first = this.voiceSources(handle, parts, split);
    const end = first.end;
    // cada pedaço da frase passa por uma "fonte" diferente: telefone, intercom... ou limpa demais
    const modes = ['phone', 'clean', 'intercom', 'clean', 'phone'];
    for (let s = 0, i = Math.floor(Math.random() * 3); s < end; s += rand(0.35, 1.1), i++) {
      const mode = modes[i % modes.length];
      const t = this.at(handle, s);
      gPhone.gain.setTargetAtTime(mode === 'phone' ? 1 : 0.06, t, 0.015);
      gClean.gain.setTargetAtTime(mode === 'clean' ? 1 : 0.06, t, 0.015);
      gCom.gain.setTargetAtTime(mode === 'intercom' ? 1.1 : 0.06, t, 0.015);
    }
    // segunda camada, ligeiramente atrasada, ao fundo
    const late = this.gain(handle, 0.3);
    const lateConv = ctx.createConvolver();
    lateConv.buffer = this.impulse(1.6);
    handle.nodes.push(lateConv);
    late.connect(lateConv).connect(out);
    const second = this.voiceSources(handle, parts, late, { delay: rand(0.045, 0.09) });
    this.pitchDrift(handle, second.sources, end, 25);
    // fragmentos com outro pitch
    const frags = Math.max(1, Math.round(end * 0.6));
    for (let i = 0; i < frags; i++) {
      const s = rand(0, Math.max(0.05, end - 0.3));
      this.fragment(handle, parts, out, s, rand(0.15, 0.3), { detune: (Math.random() < 0.5 ? -1 : 1) * rand(300, 700), gain: 0.22 });
    }
    this.corrupt(handle, parts, out, split, split, end, k);
    return end + 0.5;
  },

  buildClean(handle, parts, out) {
    const c = this.chain(handle, [this.biquad('highpass', 80), this.compressor(-20, 3)]);
    c.output.connect(out);
    return this.voiceSources(handle, parts, c.input).end;
  },

  // Estática solta (atender / desligar o telefone): 100–300 ms
  staticBurst(seconds = 0.22, gain = 0.05) {
    const ctx = this.ac();
    if (!ctx || !audioManager.nodes.voice) return;
    this.noiseBurst(null, audioManager.nodes.voice, ctx.currentTime + 0.01, seconds, gain, 'bandpass', 1700, 0.5);
  }
};

/* ----- Funções curtas para o resto do jogo ----- */
const playVoice = (id, opts) => voiceManager.play(id, opts);
const stopVoice = () => voiceManager.stopAll();
const playPhoneVoice = (id, opts = {}) => voiceManager.play(id, { ...opts, filter: 'phone' });
const playIntercomVoice = (id, opts = {}) => voiceManager.play(id, { ...opts, filter: opts.distant ? 'distantIntercom' : 'intercom' });
const playUnknownVoice = (id, opts = {}) => voiceManager.play(id, { ...opts, filter: 'unknown' });
const playZeroVoice = (id, opts = {}) => voiceManager.play(id, { ...opts, filter: 'zero' });
const showSubtitle = (text, speaker, style) => subtitles.show(text, speaker, style);
const hideSubtitle = () => subtitles.hide();

subtitles.load();
subtitles.button.addEventListener('click', () => subtitles.set(!subtitles.enabled));

// A voz nunca continua para o gameplay nem para outra cena
for (const name of ['introEnd', 'cutsceneStart', 'cutsceneEnd', 'menu', 'nightIntro', 'nightBegin', 'caught']) {
  onGameEvent(name, () => voiceManager.stopAll());
}
