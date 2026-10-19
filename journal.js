'use strict';

/* =========================================================
   SECURITY GUARD — JOURNAL (arquivo de incidentes)

   Cada monstro fica desbloqueado depois de matar o jogador
   pelo menos uma vez. Até lá a entrada não revela nada.

   - MONSTER_JOURNAL ... o texto de cada monstro e a pose do
                         "render" de corpo inteiro. Para um monstro
                         novo: acrescenta-o a MONSTER_TYPES (game.js)
                         e uma entrada aqui. O resto é automático.
   - journal ........... guardar/ler o progresso e mostrar o ecrã.

   Guardado em localStorage como 'securityGuard.journal'
   (separado da progressão das Nights).
   O nome e a noite em que aparece vêm de MONSTER_TYPES.

   Night 6: a lista tem duas colunas (SPECIMENS | RECOVERED FOOTAGE +
   ARCHIVES). Os documentos dos ARCHIVES (ARCHIVE_DOCUMENTS, lore.js)
   abrem depois de acabar a campanha.

   ANOMALY FILES: uma parte separada (e secreta) do fichário, com as
   Anomalies da Custom Night (anomalies.js). Antes de as desbloquear
   (= a Custom Night disponível) a aba nem existe: nada de "LOCKED".
   Não são espécimes do Project VEIL: sem Archive Notes nem lore.
   As mortes contam à parte ('securityGuard.anomalyDeaths').
   ========================================================= */

const MONSTER_JOURNAL = {
  black: {
    classification: 'CLASS C — MOBILE / HOSTILE',
    description: 'One of the earliest organisms associated with PROJECT VEIL. The smooth surface covering the ' +
      'facial region shows no identifiable external sensory structures. During aggressive behaviour, the front ' +
      'of the head undergoes an extreme change, exposing a disproportionate oral cavity.',
    behaviour: 'Advances camera by camera toward the Office door (on Night 5, toward the LEFT or RIGHT HALL). ' +
      'Grows bolder as the night goes on.',
    survival: 'Black cannot be seen in a dark hall. Turn the LIGHT on to confirm it is there. ' +
      'If it is, close that DOOR. After a while it gives up and retreats.',
    // render: que figura do jogo copiar e com que pose / tamanho (% da altura da fotografia)
    // Archive Notes: pequenas pistas da lore (só com a entrada desbloqueada)
    archiveNotes: 'Early PROJECT VEIL records mention an experimental organism with no definitive classification. ' +
      'Most of its documentation disappeared after the 08/11/2008 incident. ' +
      'Early reports describe the specimen as showing "a complete absence of external facial ' +
      'structures". A later annotation contains a single sentence: "The mouth was not absent."',
    render: { source: 'cam-black', height: 92, data: { pose: 'crouch' } }
  },

  watcher: {
    classification: 'CLASS B — OBSERVATION-REACTIVE',
    description: 'A tall specimen covered in organic fibres. The circular structure that replaces its head ' +
      'contains a mechanism resembling an analogue clock. Asterion records suggest the irregular movement ' +
      'of the hands increases during periods of visual exposure.',
    behaviour: 'Moves through the cameras like the others, but reacts badly to being observed. ' +
      'The longer it is watched on the same camera, the more agitated it becomes, until it rushes forward. ' +
      'The clock gives it away: slow ticks when calm, hands running wrong when agitated.',
    survival: 'Don\'t keep watching Watcher on the same camera. Confirm where it is, then switch cameras. ' +
      'If the hands start jumping, the image tears and the interference builds up, look away. ' +
      'If the clock stops, it is already too late. At the door it is stopped like the others: LIGHT, then DOOR.',
    archiveNotes: 'Researchers originally used analogue clocks during exposure tests, to measure intervals ' +
      'without interrupting observation. Later reports no longer clearly distinguish between the measuring ' +
      'equipment and the specimen\'s anatomy.',
    render: { source: 'cam-watcher', height: 94 }
  },

  morrow: {
    classification: 'CLASS A — DORMANT / APEX',
    description: 'A large quadruped specimen associated with artificial sedation and containment cycles. ' +
      'Its elongated cranial structure presents a single, well-defined external eye and abnormal visual behaviour. ' +
      'During aggressive states, the organism is able to rise onto its hind legs and reveal a disproportionate oral cavity.',
    behaviour: 'Sleeps in its room. While nobody watches it, an invisible agitation builds up: ' +
      'it stirs, wakes, stands... and finally leaves to hunt.',
    survival: 'Check the camera where Morrow sleeps regularly. Watching it slowly calms it down. ' +
      'If you see it awake, you have ignored it for too long. Once it leaves the room and starts hunting, ' +
      'the doors cannot stop it.',
    archiveNotes: 'Medical records indicate continuous sedation and the use of artificial sleep cycles over extended periods. ' +
      'Containment logs state that the specimen remained more stable under continuous visual stimulus. ' +
      'A later clinical note describes the ocular region as "disturbingly responsive". ' +
      'Another entry mentions that the bipedal posture was not part of its initially observed behaviour.',
    // quatro patas, de lado, calmo mas a olhar (passar o rato pela foto: erguido nas patas de trás)
    render: { source: 'cam-morrow', height: 92, data: { pose: 'stand', mood: 'awake' } }
  },

  echo: {
    classification: 'CLASS B — ACOUSTIC SEARCH ORGANISM',
    description: 'A quadruped specimen with an extremely light and flexible structure. Its cranial anatomy ' +
      'shows specialised sensory structures, while the visual organs appear underdeveloped. The skeletal ' +
      'configuration allows the organism to pass through ducts significantly smaller than its apparent body length.',
    behaviour: 'Listens to the noise you make. Doors, lights, cameras and machinery all make noise. ' +
      'Enough of it and Echo comes through the vents toward the Office.',
    survival: 'Echo reacts to noise. Doors, lights, the CCTV system and the Office machinery can give your ' +
      'position away; the more noise you make, the more aggressively it approaches. When it is close, silence ' +
      'can make it hesitate or back away. Use the Vent Cameras to follow it. If it reaches your vent, block it ' +
      '(hold the grate on Night 4, close the VENT SEAL from Night 5) until it gives up.',
    archiveNotes: 'Originally developed to locate biological signals in environments with near-zero visibility. ' +
      'Early acoustic tests exceeded the maximum sensitivity of the measuring equipment. Containment staff reported ' +
      'movement inside ducts considered too small for the specimen. A handwritten note: ' +
      '"If you can hear it, it already heard you."',
    // agachado, peito erguido, cauda no chão (passar o rato pela fotografia: a mandíbula abre)
    render: { source: 'cam-echo', height: 80, data: { pose: 'crouch', mood: 'calm', part: 'full' } }
  },

  vesper: {
    classification: 'CLASS A — ATTENTION-BOUND',
    description: 'A humanoid specimen of extreme size, capable of significantly altering its own morphology. ' +
      'The facial structure observed in its passive state appears to function as an outer layer; aggressive ' +
      'changes reveal a substantially different anatomy. Estimated height when fully upright: 3.02 m.',
    behaviour: 'Approaches through one of the halls. While you are not facing its hall, it comes closer, fast. ' +
      'The moment you turn toward it, it freezes. It can feel being watched, even in the dark.',
    survival: 'Vesper approaches while it is not being observed. Looking in its direction stops it. ' +
      'Use the LIGHT to confirm it is there, and keep it lit (door open) until it retreats. ' +
      'A closed door stops it from entering, but does not force it to leave the hall.',
    archiveNotes: 'Recovered documentation repeatedly uses the expression \'Perception Response\'. ' +
      'Early reports describe recurring discrepancies in the specimen\'s physical measurements, and different ' +
      'staff recorded facial features incompatible with one another. One observation note reads: ' +
      '"It is not wearing the face." Below it, in different handwriting: "The face is wearing itself."',
    // de pé, ~3 m, com a false face (passar o rato pela fotografia: a cara real, por um instante)
    render: { source: 'cam-vesper', height: 96, data: { stage: '0', near: 'far', form: 'tall' } }
  },

  subjectZero: {
    listName: 'SUBJECT ZERO / VEIL-0',
    lockedName: '??????',
    classification: 'ASTERION DESIGNATION: VEIL-0',
    description: 'Primary subject associated with the final phase of PROJECT VEIL. External morphology appears ' +
      'broadly humanoid; repeated observation has produced inconsistent anatomical records. Personnel reports ' +
      'disagree on the number, length and configuration of the subject\'s lower limbs. Facial anatomy remains unconfirmed.',
    behaviour: 'Leaves the Core Chamber (CAM 15) slowly, through CAM 14 and CAM 13, into the system itself. ' +
      'It corrupts what you see and hear: false feeds, a Black that is not there, other specimens\' sounds, ' +
      'a hall that looks empty, camera names that lie. Every lie leaves the same marks: the camera clock shows 08:11, ' +
      'a vertical line, "V0", a reversed sound.',
    survival: 'Subject Zero interferes with observation systems. Do not automatically trust a corrupted feed: ' +
      'look for inconsistencies, and use SIGNAL VERIFY when needed (a little power, then it recharges). ' +
      'Confirmed observation on a real feed at CAM 14 or CAM 13 can temporarily reduce its influence ' +
      '(OBSERVATION LOCK pushes it back). If the monitors fail, hold PURGE SIGNAL on the central terminal until it completes.',
    // Só depois de acabar a Night 6
    archiveNotes: 'The first subject of PROJECT VEIL. Every observation-response study began with it. ' +
      `During the ${LORE.incident.date} incident, the staff on duty trusted their cameras until 08:11. ` +
      'Early documentation repeatedly refers to VEIL-0 as the first successful adaptive subject. ' +
      'Later documentation stops using the term "organism". Annotations: "It changes when recorded." — ' +
      '"We stopped agreeing on what it looked like." — "The camera is not observing it. It is obs█rving thr█ugh the c█mera."',
    notesRequireCampaign: true,
    // de pé, a túnica completa, a cabeça um pouco inclinada, a face fechada (às vezes, a fotografia corrompe-se)
    render: { source: 'cam-subjectZero', height: 92, data: { pose: 'stand' } }
  }
};


const journal = {
  storageKey: 'securityGuard.journal',
  anomalyKey: 'securityGuard.anomalyDeaths',
  data: { unlocked: {}, deaths: {} },
  anomalyDeaths: {},     // { hush: 2, ... } (só as Anomalies da Custom Night)
  anomalyTab: 'hush',    // a ficha aberta nas ANOMALY FILES
  view: 'list',          // 'list', 'page', 'doc' ou 'anom'
  index: 0,              // entrada aberta (posição na lista)
  pendingNew: null,      // monstro desbloqueado nesta morte (para o aviso no Game Over)

  el: {
    screen: document.getElementById('journal-screen'),
    sheet: document.getElementById('jr-sheet'),
    list: document.getElementById('jr-list'),
    entries: document.getElementById('jr-entries'),
    page: document.getElementById('jr-page'),
    render: document.getElementById('jr-render'),
    photoLabel: document.getElementById('jr-photo-label'),
    info: document.getElementById('jr-info'),
    prev: document.getElementById('jr-prev'),
    next: document.getElementById('jr-next'),
    back: document.getElementById('jr-back'),
    close: document.getElementById('jr-close'),
    open: document.getElementById('btn-journal'),
    notice: document.getElementById('journal-notice'),
    noticeName: document.getElementById('journal-notice-name'),
    cutsceneList: document.getElementById('jr-cutscenes'),
    archive: document.getElementById('jr-archive'),
    archiveText: document.getElementById('jr-archive-text'),
    archiveList: document.getElementById('jr-archives'),
    doc: document.getElementById('jr-doc'),
    docHead: document.querySelector('#jr-doc .jr-doc-head'),
    docMeta: document.querySelector('#jr-doc .jr-doc-meta'),
    docBody: document.querySelector('#jr-doc .jr-doc-body'),
    anomTab: document.getElementById('jr-anom-tab'),
    anom: document.getElementById('jr-anom'),
    anomTabs: document.getElementById('jra-tabs'),
    anomPhoto: document.querySelector('#jr-anom .jra-photo'),
    anomConcept: document.querySelector('#jr-anom .jra-concept'),
    anomText: document.querySelector('#jr-anom .jra-text')
  },

  /* ----- Dados ----- */

  // Entradas por ordem de aparição (Night 1 primeiro)
  ids() {
    return Object.keys(MONSTER_JOURNAL)
      .filter((id) => MONSTER_TYPES[id])
      .sort((a, b) => MONSTER_TYPES[a].introductionNight - MONSTER_TYPES[b].introductionNight);
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (saved && typeof saved === 'object') {
        this.data.unlocked = saved.unlocked && typeof saved.unlocked === 'object' ? saved.unlocked : {};
        this.data.deaths = saved.deaths && typeof saved.deaths === 'object' ? saved.deaths : {};
      }
    } catch (error) {
      // sem localStorage (ou dados estragados): começa vazio, só nesta sessão
    }
    try {
      const anomalies = JSON.parse(localStorage.getItem(this.anomalyKey) || 'null');
      this.anomalyDeaths = anomalies && typeof anomalies === 'object' ? anomalies : {};
    } catch (error) {
      this.anomalyDeaths = {};
    }
  },

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) { /* ignorar: fica só nesta sessão */ }
  },

  isUnlocked(id) {
    return Boolean(CONFIG.debugJournalUnlockAll || this.data.unlocked[id]);
  },

  // Uma morte: conta e desbloqueia. Devolve true se foi a primeira vez para este monstro.
  recordDeath(id) {
    if (!MONSTER_JOURNAL[id]) return false;
    // Custom Night: as mortes contam sempre, mas só desbloqueiam entradas com a campanha completa
    if (currentNight === 'custom' && !isCampaignComplete()) {
      this.data.deaths[id] = (this.data.deaths[id] || 0) + 1;
      this.save();
      return false;
    }
    const first = !this.data.unlocked[id];
    this.data.unlocked[id] = true;
    this.data.deaths[id] = (this.data.deaths[id] || 0) + 1;
    this.save();
    return first;
  },

  /* ----- ANOMALY FILES (parte secreta do fichário) ----- */

  // A aba só existe depois de as Anomalies estarem disponíveis (Custom Night desbloqueada)
  anomaliesUnlocked() {
    return typeof ANOMALY_INFO !== 'undefined' && isCustomNightUnlocked();
  },

  recordAnomalyDeath(id) {
    if (typeof ANOMALY_INFO === 'undefined' || !ANOMALY_INFO[id]) return;
    this.anomalyDeaths[id] = (this.anomalyDeaths[id] || 0) + 1;
    try {
      localStorage.setItem(this.anomalyKey, JSON.stringify(this.anomalyDeaths));
    } catch (error) { /* só nesta sessão */ }
  },

  buildAnomalyTabs() {
    if (typeof ANOMALY_IDS === 'undefined') return;
    for (const id of ANOMALY_IDS) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'jra-tab';
      tab.dataset.anomaly = id;
      tab.textContent = ANOMALY_INFO[id].name;
      tab.addEventListener('click', () => this.showAnomaly(id));
      this.el.anomTabs.appendChild(tab);
    }
  },

  showAnomaly(id = this.anomalyTab) {
    if (!this.anomaliesUnlocked()) return;
    const flip = this.view !== 'anom' || id !== this.anomalyTab;
    this.anomalyTab = id;
    this.view = 'anom';
    this.renderAnomaly();
    this.renderNav();
    if (flip) this.flip();
  },

  renderAnomaly() {
    const id = this.anomalyTab;
    const info = ANOMALY_INFO[id];
    const cleared = typeof customNight !== 'undefined' && customNight.challengesDone().includes(id);
    for (const tab of this.el.anomTabs.children) tab.classList.toggle('is-active', tab.dataset.anomaly === id);
    this.el.anomPhoto.replaceChildren(anomalyFigure(id));
    // Recompensa do ASTERION // ...: o "concept file" (a criatura no estado de ataque)
    let concept;
    if (id === 'knocker') {
      concept = document.createElement('div');
      concept.className = 'an-fig an-fig-knockarm';
      concept.innerHTML = knockerArmSVG();
    } else {
      concept = anomalyFigure(id);
    }
    if (id === 'hush') concept.dataset.phase = 'open';
    if (id === 'lumen') concept.dataset.wings = 'open';
    this.el.anomConcept.replaceChildren(concept);
    this.el.anomConcept.classList.toggle('hidden', !cleared);
    const block = (cls, label, text) => {
      const p = document.createElement('p');
      p.className = cls;
      if (label) {
        const b = document.createElement('b');
        b.textContent = label;
        p.append(b, ' ');
      }
      p.append(text);
      return p;
    };
    this.el.anomText.replaceChildren(
      block('jra-code', '', `ANOMALY FILE ${info.code}`),
      block('jra-name', '', info.name),
      block('jra-tag', '', 'NON-CANON · SIMULATION ENTITY · CUSTOM NIGHT ONLY'),
      block('jra-desc', '', info.desc),
      block('jra-mech', 'MECHANIC', info.mechanic),
      block('jra-surv', 'SURVIVAL', info.survival),
      block('jra-deaths', '', `RECORDED DEATHS: ${this.anomalyDeaths[id] || 0}`),
      block('jra-foot', '', cleared ? `ASTERION // ${info.name} CLEARED — CONCEPT VARIANT ON FILE` : `CLEAR ASTERION // ${info.name} TO RECOVER THE CONCEPT VARIANT`)
    );
  },

  /* ----- Ecrã ----- */

  isOpen() {
    return !this.el.screen.classList.contains('hidden');
  },

  open() {
    this.view = 'list';
    this.renderList();
    hide(ui.startScreen);
    show(this.el.screen);
    emitGameEvent('journalOpen');
  },

  close() {
    hide(this.el.screen);
    show(ui.startScreen);
    emitGameEvent('uiClick');
  },

  showList() {
    this.view = 'list';
    this.renderList();
    this.flip();
  },

  showPage(index) {
    const ids = this.ids();
    this.index = (index + ids.length) % ids.length;
    this.view = 'page';
    this.renderPage();
    this.flip();
  },

  // Página a virar (curto: ~0.2 s) + som de papel
  flip() {
    restartAnimation(this.el.sheet, 'flip');
    emitGameEvent('journalPage');
  },

  renderNav() {
    const page = this.view === 'page';
    const doc = this.view === 'doc';
    const anomOpen = this.view === 'anom';
    this.el.list.classList.toggle('hidden', page || doc || anomOpen);
    this.el.page.classList.toggle('hidden', !page);
    this.el.doc.classList.toggle('hidden', !doc);
    this.el.anom.classList.toggle('hidden', !anomOpen);
    this.el.prev.classList.toggle('hidden', !page);
    this.el.next.classList.toggle('hidden', !page);
    this.el.back.classList.toggle('hidden', !page && !doc && !anomOpen);
    // A aba das ANOMALY FILES: só existe depois de as desbloquear (antes, nem um "LOCKED")
    this.el.anomTab.classList.toggle('hidden', !this.anomaliesUnlocked());
    this.el.anomTab.classList.toggle('is-open', anomOpen);
    this.el.screen.classList.toggle('jr-anom-open', anomOpen);
  },

  renderList() {
    const rows = this.ids().map((id, i) => {
      const unlocked = this.isUnlocked(id);
      const li = document.createElement('li');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'jr-row' + (unlocked ? '' : ' locked');
      row.disabled = !unlocked;
      row.dataset.monster = unlocked ? id : '';
      row.innerHTML = '<span class="jr-num"></span><span class="jr-name"></span><span class="jr-status"></span>';
      row.querySelector('.jr-num').textContent = String(i + 1).padStart(2, '0');
      // Bloqueada: não revela o nome
      const entry = MONSTER_JOURNAL[id];
      row.querySelector('.jr-name').textContent = unlocked ? (entry.listName || MONSTER_TYPES[id].name) : (entry.lockedName || '???????');
      row.querySelector('.jr-status').textContent = unlocked ? 'DISCOVERED' : 'UNKNOWN';
      if (unlocked) row.addEventListener('click', () => this.showPage(i));
      li.appendChild(row);
      return li;
    });
    this.el.entries.replaceChildren(...rows);
    this.renderCutscenes();
    this.renderArchives();
    this.renderNav();
  },

  /* ----- ARCHIVES: documentos (depois de acabar a campanha) ----- */

  isDocUnlocked(doc) {
    if (CONFIG.debugJournalUnlockAll) return true;
    if (doc.unlock.asterion) return typeof customNight !== 'undefined' && customNight.asterionDone();
    if (doc.unlock.campaign) return isCampaignComplete();
    return false;
  },

  renderArchives() {
    const rows = ARCHIVE_DOCUMENTS.map((doc, i) => {
      const open = this.isDocUnlocked(doc);
      const li = document.createElement('li');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'jr-row jr-doc-row' + (open ? '' : ' locked');
      row.disabled = !open;
      row.dataset.doc = open ? doc.id : '';
      row.innerHTML = '<span class="jr-num"></span><span class="jr-name"></span><span class="jr-status"></span>';
      row.querySelector('.jr-num').textContent = `D${i + 1}`;
      row.querySelector('.jr-name').textContent = open ? doc.title : '???';
      row.querySelector('.jr-status').textContent = open ? 'READ' : 'SEALED';
      if (open) row.addEventListener('click', () => this.showDoc(i));
      li.appendChild(row);
      return li;
    });
    this.el.archiveList.replaceChildren(...rows);
  },

  showDoc(index) {
    const doc = ARCHIVE_DOCUMENTS[index];
    if (!doc || !this.isDocUnlocked(doc)) return;
    this.view = 'doc';
    this.el.docHead.textContent = doc.title;
    this.el.docMeta.textContent = `${doc.date} — ${doc.author}`;
    this.el.docBody.replaceChildren(...doc.body.map((text) => {
      const p = document.createElement('p');
      const redacted = text.startsWith('█');
      p.className = redacted ? 'redacted' : '';
      p.textContent = redacted ? text.replace(/^█\s*/, '') : text;
      return p;
    }));
    this.el.doc.scrollTop = 0;
    this.renderNav();
    this.flip();
  },

  // RECOVERED FOOTAGE: as cutscenes já vistas (revêem-se aqui). As outras não revelam nada.
  renderCutscenes() {
    const items = typeof cutscenes !== 'undefined' ? cutscenes.list() : [];
    const rows = items.map((item, i) => {
      const li = document.createElement('li');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'jr-row jr-scene-row' + (item.seen ? '' : ' locked');
      row.disabled = !item.seen;
      row.dataset.cutscene = item.seen ? item.id : '';
      row.innerHTML = '<span class="jr-num"></span><span class="jr-name"></span><span class="jr-status"></span>';
      row.querySelector('.jr-num').textContent = String(i).padStart(2, '0');
      const name = row.querySelector('.jr-name');
      name.textContent = item.seen ? item.label : '???';
      if (item.seen) {
        // um pequeno pedaço de lore que a cutscene revelou
        const note = document.createElement('small');
        note.className = 'jr-scene-note';
        note.textContent = item.note;
        name.appendChild(note);
        row.addEventListener('click', () => cutscenes.replay(item.id));
      }
      row.querySelector('.jr-status').textContent = item.seen ? '▶ REPLAY' : 'NO RECORD';
      li.appendChild(row);
      return li;
    });
    this.el.cutsceneList.replaceChildren(...rows);
  },

  renderPage() {
    const ids = this.ids();
    const id = ids[this.index];
    const number = String(this.index + 1).padStart(2, '0');
    const info = this.el.info;
    info.replaceChildren();
    this.el.render.replaceChildren();
    // Archive Notes: só aparecem com a entrada desbloqueada (as do Subject Zero só depois da Night 6)
    const source = MONSTER_JOURNAL[id];
    const notesOpen = this.isUnlocked(id) && (!source.notesRequireCampaign || isCampaignComplete());
    const notes = notesOpen ? source.archiveNotes : '';
    this.el.archiveText.textContent = notes || '';
    this.el.archive.classList.toggle('hidden', !notes);

    if (!this.isUnlocked(id)) {
      // Bloqueada: nem nome, nem aparência, nem habilidade, nem dica
      this.el.render.className = 'jr-render jr-render-unknown';
      this.el.photoLabel.textContent = `SPECIMEN ${number} — ???`;
      info.append(
        this.line('div', 'jr-title', '???'),
        this.line('div', 'jr-class', 'UNKNOWN SPECIMEN'),
        this.line('p', 'jr-text', 'No data available.'),
        this.line('div', 'jr-sealed', 'RECORD SEALED UNTIL A FATAL ENCOUNTER')
      );
      this.renderNav();
      return;
    }

    const entry = MONSTER_JOURNAL[id];
    const type = MONSTER_TYPES[id];
    this.el.render.className = 'jr-render';
    this.el.render.appendChild(this.buildRender(entry.render));
    this.el.photoLabel.textContent = `SPECIMEN ${number} — ${type.name}`;
    const deaths = this.data.deaths[id] || 0;
    info.append(
      this.line('div', entry.listName ? 'jr-title jr-title-long' : 'jr-title', entry.listName || type.name),
      this.line('div', 'jr-class', entry.classification),
      this.field('FIRST APPEARANCE', `Night ${type.introductionNight}`),
      this.line('p', 'jr-text jr-desc', entry.description),
      this.field('BEHAVIOUR', entry.behaviour),
      this.field('SURVIVAL', entry.survival, 'jr-survival'),
      this.line('div', 'jr-deaths', `RECORDED DEATHS: ${deaths}`)
    );
    info.scrollTop = 0;
    this.renderNav();
  },

  line(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  },

  field(label, text, extra = '') {
    const box = document.createElement('div');
    box.className = `jr-field ${extra}`.trim();
    box.append(this.line('div', 'jr-label', label), this.line('p', 'jr-text', text));
    return box;
  },

  // Corpo inteiro: copia o desenho do próprio jogo (o mesmo das câmaras) e aplica a pose do Journal
  buildRender(render) {
    const figure = document.getElementById(render.source).cloneNode(true);
    figure.removeAttribute('id');
    figure.removeAttribute('style');
    delete figure.dataset.spot;
    figure.classList.remove('cam-monster', 'hidden', 'frozen');
    figure.classList.add('journal-figure');
    Object.assign(figure.dataset, render.data || {});
    figure.style.height = `${render.height}%`;
    return figure;
  },

  /* ----- Game Over: aviso de entrada nova (só na primeira morte para cada monstro) ----- */

  onCaught(id) {
    this.recordAnomalyDeath(id);
    this.pendingNew = this.recordDeath(id) ? id : null;
    hide(this.el.notice);
  },

  onLoseScreen({ monsterId }) {
    if (this.pendingNew !== monsterId) return;
    this.pendingNew = null;
    this.el.noticeName.textContent = MONSTER_TYPES[monsterId].name;
    show(this.el.notice);
    restartAnimation(this.el.notice, 'appear');
    emitGameEvent('journalNewEntry', { monsterId });
  },

  hideNotice() {
    hide(this.el.notice);
  }
};

journal.load();
journal.buildAnomalyTabs();

/* ----- Ligações (tudo com o rato; ESC também fecha) ----- */

journal.el.open.addEventListener('click', () => journal.open());
// a aba separada: abre as ANOMALY FILES (clicar outra vez volta ao arquivo)
journal.el.anomTab.addEventListener('click', () => (journal.view === 'anom' ? journal.showList() : journal.showAnomaly()));
journal.el.close.addEventListener('click', () => journal.close());
journal.el.back.addEventListener('click', () => journal.showList());
journal.el.prev.addEventListener('click', () => journal.showPage(journal.index - 1));
journal.el.next.addEventListener('click', () => journal.showPage(journal.index + 1));

// ESC: da página (ou de um documento) volta à lista; da lista fecha o Journal
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !journal.isOpen()) return;
  if (journal.view !== 'list') journal.showList();
  else journal.close();
});

onGameEvent('caught', (monsterId) => journal.onCaught(monsterId));
onGameEvent('loseScreen', (data) => journal.onLoseScreen(data));
onGameEvent('nightIntro', () => journal.hideNotice());
onGameEvent('menu', () => journal.hideNotice());
// Progresso apagado (atalho de admin): o Journal volta a estar todo bloqueado
onGameEvent('saveReset', () => { journal.data = { unlocked: {}, deaths: {} }; journal.anomalyDeaths = {}; });
