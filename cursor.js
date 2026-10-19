'use strict';

/* =========================================================
   SECURITY GUARD — CURSOR DA ASTERION

   Um ponteiro pequeno e industrial (SVG no HTML, #game-cursor) que
   segue o rato. O cursor do browser só é escondido depois de tudo
   estar a funcionar; se algo falhar, fica o cursor normal.

   Estados (classes no #game-cursor):
   - is-interactive  por cima de algo clicável (o retículo abre)
   - is-disabled     por cima de algo indisponível (mais apagado)
   - is-hold         a segurar a grelha da vent / o PURGE SIGNAL (círculo a completar)
   - is-cams         câmaras abertas (cantos de CCTV)
   - is-idle         cutscene sem mexer o rato há uns segundos (esconde)

   Nunca muda de cor com perigo (daria informação sobre os monstros).
   Só desenha: a posição do rato (clientX) continua a ser lida pelo
   jogo como antes (vista panorâmica da Night 5).
   ========================================================= */

const gameCursor = {
  el: document.getElementById('game-cursor'),
  x: -100,
  y: -100,
  idleTimer: null,
  inCutscene: false,
  enabled: false,

  // O que conta como clicável / indisponível
  interactive: 'button, input, select, a[href], label[for], .cam-btn, .jr-row, #office-vent, .is-clickable',
  disabled: 'button:disabled, .jr-row.locked',

  start() {
    // Só com rato (ou trackpad) e se o elemento existir
    if (!this.el || !window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    document.addEventListener('pointermove', (event) => this.onMove(event), { passive: true });
    document.addEventListener('pointerdown', (event) => this.onMove(event), { passive: true });
    document.documentElement.addEventListener('pointerleave', () => this.el.classList.add('is-out'));
    window.addEventListener('blur', () => this.el.classList.add('is-out'));
    this.enabled = true;
    document.documentElement.classList.add('custom-cursor');   // a partir daqui esconde o cursor do browser
  },

  onMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    this.x = event.clientX;
    this.y = event.clientY;
    this.el.classList.remove('is-out', 'is-idle');
    // O browser já junta os pointermove a um por frame: basta uma escrita de estilo
    // (sem esperar por outro frame, para o cursor nunca ficar atrás do rato)
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    this.updateState(event.target);
    if (this.inCutscene) this.armIdle();
  },

  updateState(target) {
    const el = target instanceof Element ? target : null;
    const disabled = Boolean(el && el.closest(this.disabled));
    this.el.classList.toggle('is-disabled', disabled);
    this.el.classList.toggle('is-interactive', !disabled && Boolean(el && el.closest(this.interactive)));
  },

  // Nas cutscenes esconde-se sozinho se o rato ficar parado (volta ao mexer, para o SKIP)
  armIdle() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.inCutscene) this.el.classList.add('is-idle');
    }, 2500);
  },

  setCutscene(on) {
    this.inCutscene = on;
    clearTimeout(this.idleTimer);
    this.el.classList.remove('is-idle');
    if (on) this.armIdle();
  },

  set(state, on) {
    this.el.classList.toggle(state, on);
  }
};

try {
  gameCursor.start();
  // Feedback visual apenas (não muda nenhuma mecânica)
  onGameEvent('ventHold', () => gameCursor.set('is-hold', true));
  onGameEvent('ventRelease', () => gameCursor.set('is-hold', false));
  // Night 6: segurar o PURGE SIGNAL usa o mesmo círculo
  onGameEvent('purgeHold', () => gameCursor.set('is-hold', true));
  onGameEvent('purgeRelease', () => gameCursor.set('is-hold', false));
  onGameEvent('zeroPurged', () => gameCursor.set('is-hold', false));
  onGameEvent('camerasOpened', () => gameCursor.set('is-cams', true));
  onGameEvent('camerasClosed', () => gameCursor.set('is-cams', false));
  onGameEvent('powerOut', () => gameCursor.set('is-cams', false));
  for (const name of ['nightIntro', 'menu', 'caught', 'nightWon']) {
    onGameEvent(name, () => { gameCursor.set('is-cams', false); gameCursor.set('is-hold', false); });
  }
  onGameEvent('introStart', () => gameCursor.setCutscene(true));
  onGameEvent('introEnd', () => gameCursor.setCutscene(false));
  onGameEvent('cutsceneStart', () => gameCursor.setCutscene(true));
  onGameEvent('cutsceneEnd', () => gameCursor.setCutscene(false));
} catch (error) {
  // Algo falhou: volta ao cursor normal do browser
  document.documentElement.classList.remove('custom-cursor');
  if (gameCursor.el) gameCursor.el.remove();
}
