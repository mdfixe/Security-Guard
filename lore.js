'use strict';

/* =========================================================
   SECURITY GUARD — LORE OFICIAL

   Tudo o que é "história" fica aqui, num só sítio, para os
   outros ficheiros usarem (cutscene, Journal, ecrãs).

   O jogador NÃO vê este ficheiro: muita coisa aqui é base
   narrativa interna e só deve chegar ao jogador aos poucos
   (Journal, Archive Notes, ambiente, cutscenes, documentos).

   MISTÉRIOS QUE AINDA NÃO SE RESOLVEM (guardar para Nights futuras):
   - porque os sistemas da instalação estão a voltar a ligar-se sozinhos;
   - porque os espécimes continuam vivos em 2026;
   - quem contratou realmente o segurança;
   - se o incidente de 08/11/2008 foi mesmo um acidente;
   - o que existe nos níveis mais profundos;
   - porque algumas câmaras se ativam sozinhas;
   - o verdadeiro objetivo final do PROJECT VEIL.
   ========================================================= */

const LORE = {
  facility: 'ASTERION RESEARCH FACILITY',
  company: 'ASTERION BIOTECHNOLOGIES',
  complex: 'RESEARCH COMPLEX 04',
  project: 'PROJECT VEIL',

  // A data oficial do incidente. 08/11 também serve de pequeno easter egg
  // recorrente (0811, VEIL-0811, 08:11...). Usar com moderação.
  incident: {
    name: 'ASTERION CONTAINMENT FAILURE',
    date: '08/11/2008',            // dia/mês/ano
    label: '8 NOVEMBER 2008',
    code: '0811',
    publicVersion: 'industrial electrical accident'
  },

  // O presente do jogo: a instalação está a ser preparada para demolição
  present: {
    year: 2026,
    introDate: 'NOVEMBER 3, 2026',
    introTime: '01:47 AM',
    role: 'TEMPORARY NIGHT SECURITY'   // Night Security Contractor (sem nome)
  },

  // Cada Night dá acesso a uma parte mais funda da rede de câmaras.
  // (Não se explica porque estes sistemas voltam a ligar-se.)
  sectors: {
    1: 'CCTV ACCESS: SURFACE LEVEL — SECURITY SECTOR',
    2: 'NEW CCTV SECTOR ONLINE: LEVEL B2 — MAINTENANCE',
    3: 'NEW CCTV SECTOR ONLINE: ABANDONED RESEARCH WING',
    4: 'NEW CCTV SECTOR ONLINE: VENTILATION & POWER COMPLEX',
    5: 'NEW CCTV SECTOR ONLINE: CENTRAL PROCESSING COMPLEX',
    6: 'SUBLEVEL 06 — VEIL CORE — OBSERVATION REQUIRED'
  }
};

/* ---------------------------------------------------------
   BASE NARRATIVA INTERNA (não mostrar diretamente)

   ASTERION RESEARCH FACILITY — complexo privado e subterrâneo da
   Asterion Biotechnologies. Programa principal: PROJECT VEIL.

   Objetivo oficial do VEIL: organismos adaptativos para ambientes onde
   humanos têm dificuldade em sobreviver (busca e salvamento, escuridão
   total, edifícios colapsados, zonas industriais, localizar sobreviventes).
   Com o tempo a investigação ficou mais agressiva: reação à observação,
   perceção, condicionamento, privação sensorial, audição extrema,
   isolamento, medo, sedação prolongada, adaptação biológica.

   08/11/2008 — ASTERION CONTAINMENT FAILURE: falha elétrica em cascata
   durante um teste. Setores sem energia, contenção falhou, portas de
   segurança desbloqueadas, espécimes escaparam, funcionários mortos ou
   desaparecidos. Instalação encerrada. Versão pública: "industrial
   electrical accident". O VEIL e os espécimes nunca foram revelados.

   2026 — preparação para desmantelamento e demolição. De dia: técnicos,
   engenheiros, recuperação, demolição. De noite devia estar vazio.
   O jogador é um Night Security Contractor temporário: não é cientista,
   não conhece o VEIL, não sabe que há criaturas.

   ESPÉCIMES (são tratados pela Asterion como organismos, não como
   "demónios" — mesmo o Morrow; pode ficar no ar se tudo tem explicação):
   - BLACK: um dos primeiros organismos do VEIL, talvez um protótipo.
     Quase toda a documentação perdeu-se no incidente.
     Aparência (redesign canónico): humanoide magríssimo e escuro, braços
     compridos, postura agachada; cabeça comprida e lisa, sem olhos nem rosto.
     A frente da cabeça abre-se numa boca vertical enorme. (Pode estar ligado a
     adaptação a ambientes sem luz — nunca confirmar.)
   - WATCHER: testes de "Visual Observation Response"; observado durante
     períodos enormes, ganhou uma resposta agressiva à atenção visual.
     Aparência (concept art oficial): alto, fibroso, a cabeça é um relógio
     analógico que abre como uma mandíbula. Os relógios usados para cronometrar
     a exposição e a anatomia do espécime deixaram de se distinguir.
   - MORROW: grande porte; sedação, contenção e ciclos artificiais de
     sono. Certos estímulos visuais acalmavam-no. Sem eles, acorda agressivo.
     Aparência (redesign canónico): quadrúpede alto e magro, pele pálida e
     enrugada, cabeça comprida e lisa com UM só olho, quase humano. Nos estados
     agressivos ergue-se nas patas de trás e a boca abre-se toda (as laterais
     da cabeça afastam-se). A postura bípede não fazia parte do comportamento
     inicial: espécime antigo, mantido controlado artificialmente tempo demais.
   - ECHO: feito para localizar organismos vivos no escuro total / ruínas.
     Audição amplificada artificialmente: ficou sensível demais ao som.
     Aparência (redesign canónico): quadrúpede magríssimo e esquelético, quase
     reptiliano, cauda fina com tufo, cabeça baixa e angular com placas sensoriais
     (os olhos atrofiaram). O esqueleto dobra-se: passa por condutas mais pequenas
     que o próprio corpo. Pensado para túneis, escombros e escuridão total.
   - VESPER: experiências de "Perception of Observation". Fica imóvel
     quando sente atenção; move-se agressivamente quando não a sente.
     Aparência (redesign canónico): gigante humanoide (~3.02 m), magríssimo,
     braços compridíssimos, a parte de baixo do corpo funde-se com o chão.
     Mostra uma FALSE FACE (olhos estreitos, sorriso calmo demais) que é uma
     camada da própria pele; por baixo, uma boca enorme. A Asterion fala só em
     "morphological adaptation", "structural deformation", "visual mimicry":
     nunca confirmar que é um shapeshifter completo.
   - SUBJECT ZERO (VEIL-0): o primeiro sujeito do VEIL, mantido no núcleo
     (SUBLEVEL 06). Todos os outros testes de observação vieram dele.
     Aprendeu a observar de volta: não ataca o corpo, ataca a confiança
     na informação (feeds falsos, sons imitados, luzes falsas). Deixa
     sempre uma assinatura: 08:11, uma linha vertical, "V0", som invertido.
     Aparência (redesign canónico): algo que tenta parecer humano sem perceber
     bem um corpo humano — alto, estreito, quase imóvel, cabeça comprida e lisa
     sem rosto, fibras como cabelo, uma túnica longa (talvez parte do corpo) que
     esconde pernas finas demais e a mais. A face abre-se na vertical. Os registos
     nunca concordam no aspeto dele. A Asterion continua a descrevê-lo em termos
     científicos — nunca confirmar nada sobrenatural.
     No incidente de 08/11/2008 a equipa de observação agiu com base em
     informação falsa — a contenção caiu em minutos.

   NIGHT 6 — o que fica revelado (sequência final):
   - o segurança é o sujeito do BEHAVIOURAL RESPONSE TRIAL 07: o teste
     é se alguém continua a observar até ao fim, mesmo sem confiar no
     que vê. "Retained": o teste não acabou.
   - continua por responder: quem manda as mensagens; se a Asterion
     ainda existe por trás da demolição; o que o VEIL-0 quer.
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   ARCHIVES — documentos do Journal (secção ARCHIVES)
   unlock: { campaign: true } depois de acabar a Night 6;
           { asterion: true } depois de ganhar a Custom Night ASTERION.
   Linhas que começam por '█' aparecem tapadas (rasuradas).
   --------------------------------------------------------- */

const ARCHIVE_DOCUMENTS = [
  {
    id: 'doc-0811',
    title: 'INCIDENT 0811 — FULL REPORT',
    date: '08/11/2008',
    author: 'ASTERION INTERNAL REVIEW BOARD',
    unlock: { campaign: true },
    body: [
      'At 08:11, six members of the observation staff were on duty in SUBLEVEL 06.',
      'For four minutes, every camera feed reported normal conditions. Every door was reported locked. Every specimen was reported in its cell.',
      'None of it was true.',
      'Recovered recordings show the staff acting calmly on information that did not match the rooms around them. All recorded clocks show the same time: 08:11.',
      'Public statement: industrial electrical accident.',
      '█ classified'
    ]
  },
  {
    id: 'doc-veil0',
    title: 'VEIL-0 — STATUS FILE',
    date: 'UPDATED AUTOMATICALLY',
    author: 'ASTERION CENTRAL NETWORK',
    unlock: { campaign: true },
    body: [
      'DESIGNATION: SUBJECT ZERO (VEIL-0). CLASSIFICATION: VEIL PRIMARY SUBJECT.',
      'The first subject of PROJECT VEIL. Every observation-response study in this facility began here.',
      'VEIL-0 does not react to being watched. It reacts to what the watcher believes.',
      'Confirmed behaviour: false camera feeds, false sounds, false light. Each falsification carries the same artefacts — 08:11, a vertical scan line, the mark V0, a reversed tone.',
      'Recommended response: verify, then observe. Never act on an unverified feed.',
      'CONTAINMENT: 0%.'
    ]
  },
  {
    id: 'doc-trial07',
    title: 'BEHAVIOURAL RESPONSE TRIAL 07',
    date: 'NOVEMBER 2026',
    author: 'PROJECT VEIL — OBSERVATION WING',
    unlock: { campaign: true },
    body: [
      'SUBJECT: NIGHT SECURITY CONTRACTOR (TEMPORARY).',
      'Six shifts. Six sectors. Each one deeper than the last.',
      'Question: will an untrained observer keep watching after learning that the information cannot be trusted?',
      'Result: the subject kept watching.',
      'STATUS: RETAINED. The trial continues.'
    ]
  },
  {
    id: 'doc-asterion',
    title: 'ASTERION — EYES ONLY',
    date: '██/██/2026',
    author: '█████████',
    unlock: { asterion: true },
    body: [
      'Decommissioning will proceed on schedule. The surface buildings will be demolished.',
      'SUBLEVEL 06 is not part of the demolition contract.',
      'The night shift will continue to be staffed by temporary contractors. They are not to be told what they are guarding.',
      'They are not guarding anything.',
      'They are being watched.',
      'THE VEIL REMAINS.'
    ]
  },
  {
    // Recompensa secreta da Custom Night ASTERION (20/20/20/20/20/20). Curto, sem explicar demais.
    id: 'doc-veil0811',
    title: 'VEIL-0811 — FINAL OBSERVATION REPORT',
    date: 'REOPENED — 2026',
    author: 'PROJECT VEIL — ARCHIVE ID: VEIL-0811',
    unlock: { asterion: true },
    body: [
      'PROJECT VEIL. ARCHIVE ID: VEIL-0811.',
      'FINAL OBSERVATION REPORT.',
      'Observer response exceeded expected thresholds.',
      'Subject adaptation remained continuous.',
      'Final recommendation: DO NOT RESUME OBSERVATION.',
      'Document status: REOPENED — 2026.'
    ]
  }
];
