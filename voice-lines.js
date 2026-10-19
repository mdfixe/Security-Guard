'use strict';

/* =========================================================
   SECURITY GUARD — FALAS (voice acting)

   Todas as falas gravadas do jogo, num só sítio. O voiceManager
   (voice.js) toca-as e mostra as legendas.

   Cada fala:
     file     ficheiro de voz (assets/voice/...). Se faltar, o jogo usa
              só as legendas (com os tempos abaixo) e avisa na consola.
              Para .ogg também experimenta o mesmo nome em .mp3.
     filter   'phone' | 'intercom' | 'distantIntercom' | 'unknown' | 'zero' | 'clean'
     speaker  etiqueta da legenda ([PHONE], [ASTERION INTERCOM]...)
     corruption  (unknown / zero) 0 = quase limpa ... 1 = muito corrompida
     pan      -1 esquerda ... 1 direita (subtil: o telefone fica um pouco à direita)
     gain     volume desta fala (1 = normal)
     pace     ritmo automático das frases sem start/end: 'message' (por defeito) ou 'call' (mais lento)
     cues     as frases, por ordem:
                { text: '...' }                  tempo automático (ritmo de leitura)
                { text: '...', start: 0.2, end: 2.5 }   segundos desde o início da voz
                { pause: 1.2 }                   silêncio (segundos)
              Quando gravares a voz, põe aqui start/end de cada frase para as
              legendas aparecerem exatamente quando são ditas. O tempo total da
              fala (e da cutscene) vem destes valores.
     parts    (futuro) frase feita de vários ficheiros, cada um no seu tempo:
                parts: [{ file: '.../you.ogg', at: 0 }, { file: '.../were.ogg', at: 0.6 }]
              Usa-se em vez de 'file'.
   ========================================================= */

const VOICE_PATH = 'assets/voice/';

const VOICE_LINES = {
  /* ----- Cutscene inicial: a chamada do telefone ----- */
  introPhone: {
    file: VOICE_PATH + 'phone/intro_call.ogg',
    filter: 'phone',
    speaker: 'PHONE',
    pan: 0.12,
    pace: 'call',
    cues: [
      { text: 'Hello. You must be the new guard.' },
      { text: 'The job is simple. You stay there until six.' },
      { text: 'The demolition crews start at eight, so nobody should be inside the complex during your shift.' },
      { text: 'Some old areas might still show up on the camera system. Ignore that. The network was never shut down properly.' },
      { text: 'If any automatic door starts failing, you have manual controls in the room.' },
      { pause: 1.2 },
      { text: 'And... if you hear anything in the corridors, it\'s probably the ventilation systems.' },
      { pause: 0.9 },
      { text: 'Good night.' }
    ]
  },

  /* ----- Night 1 -> 2: aviso automático da Asterion (aparece também no monitor) ----- */
  n1to2Intercom: {
    file: VOICE_PATH + 'intercom/n1to2_reassignment.ogg',
    filter: 'intercom',
    speaker: 'ASTERION INTERCOM',
    cues: [
      { text: 'Electrical instability has been detected at your current post.' },
      { text: 'For your next shift, use the security post on the Underground Maintenance Level.' },
      { text: 'The reassignment is temporary.' },
      { text: 'Do not access sectors that are not included in your network.' }
    ]
  },

  /* ----- Night 2 -> 3: telefonema ----- */
  n2to3Phone: {
    file: VOICE_PATH + 'phone/n2to3_call.ogg',
    filter: 'phone',
    speaker: 'PHONE',
    cues: [
      { text: 'Good work tonight.' },
      { text: 'We found a problem with some of the cameras in the Research Wing.' },
      { text: 'We need you to cover that sector temporarily tomorrow.' },
      { text: 'It\'s an old area.' },
      { text: 'There\'s nothing there that needs your attention besides the equipment.' },
      { pause: 0.9 },
      { text: 'If you see anything strange on the cameras...' },
      { text: '...it\'s probably just interference.' }
    ]
  },

  /* ----- Night 3 -> 4: intercom ao longe (no corredor) e o aviso das vents ----- */
  n3to4Distant: {
    file: VOICE_PATH + 'intercom/power_routing_failure.ogg',
    filter: 'distantIntercom',
    speaker: 'ASTERION INTERCOM',
    cues: [{ text: 'Warning. Power routing failure.' }]
  },
  n3to4Warning: {
    file: VOICE_PATH + 'intercom/warning_01.ogg',
    filter: 'intercom',
    speaker: 'ASTERION INTERCOM',
    cues: [{ text: 'Warning. Unidentified movement. Vent network.' }]
  },

  /* ----- Night 4 -> 5: a primeira mensagem UNKNOWN (só um pouco estranha) ----- */
  n4to5Unknown: {
    file: VOICE_PATH + 'unknown/night5_message.ogg',
    filter: 'unknown',
    corruption: 0.3,
    speaker: 'UNKNOWN',
    cues: [
      { text: 'Your current post is no longer suitable.' },
      { text: 'Central Security is operational.' },
      { text: 'Use it.' },
      { pause: 0.9 },
      { text: 'Do not leave before 06:00.' }
    ]
  },

  /* ----- Night 5 -> 6: UNKNOWN mais corrompida ----- */
  n5to6Unknown: {
    file: VOICE_PATH + 'unknown/night6_message.ogg',
    filter: 'unknown',
    corruption: 0.55,
    speaker: 'UNKNOWN',
    cues: [
      { text: 'There is one more post.' },
      { text: 'It is below everything else.' },
      { text: 'Someone has to watch it until morning.' },
      { pause: 0.8 },
      { text: 'The cameras down there do not always tell the truth.' },
      { text: 'Check the clock.' }
    ]
  },

  /* ----- Sequência final ----- */
  finaleUnknown: {
    file: VOICE_PATH + 'unknown/final_message.ogg',
    filter: 'unknown',
    corruption: 0.8,
    speaker: 'UNKNOWN',
    cues: [
      { text: 'Every guard before you left at 06:00.' },
      { text: 'You stayed.' },
      { pause: 0.7 },
      { text: 'You were never hired to protect this place.' },
      { text: 'You were hired to watch.' },
      { text: 'And to be watched.' }
    ]
  },
  // O Subject Zero aprendeu a falar com as vozes da instalação: repete a despedida da primeira chamada
  finaleZero: {
    file: VOICE_PATH + 'zero/final_01.ogg',
    filter: 'zero',
    corruption: 0.75,
    speaker: '??????',
    cues: [{ text: 'Good night.', start: 0, end: 1.8 }]
  }
};
