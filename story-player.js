/* Picture-led, three-part stories. All timing data ships with the game. */
(() => {
  window.createDinoStory = ({ audio, caption, steps, portrait, nickname, onListen, onGreeting, reducedMotion }) => {
    let kind = '', filename = '', part = 0, pendingSeek = null, greetingToken = 0;
    const character = () => window.DINO_CHARACTERS[kind];
    const parts = () => character()?.introParts || [character()?.intro || ''];
    const cues = () => window.DINO_VOICE_CUES?.[filename] || [];
    const matchesSource = () => audio.src.split('/').pop()?.split('?')[0] === filename;
    function showPart(index, text) {
      if (!kind) return;
      part = index;
      caption.textContent = text ?? parts()[Math.max(0, index)];
      caption.dataset.part = String(index);
      steps.querySelectorAll('[data-story-part]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.storyPart) === index)));
    }
    function sync() {
      if (!kind || !matchesSource() || pendingSeek !== null) return;
      const timeline = cues();
      if (!timeline.length) return;
      let cue = timeline[0];
      for (const candidate of timeline) {
        if (candidate.time > audio.currentTime + .04) break;
        cue = candidate;
      }
      showPart(cue.part, cue.text);
    }
    function applySeek() {
      if (pendingSeek === null || !matchesSource() || audio.readyState < 1) return;
      try {
        audio.currentTime = pendingSeek;
        pendingSeek = null;
        sync();
      } catch (_) { /* Older mobile browsers wait for loadedmetadata. */ }
    }
    function setCharacter(nextKind, nextFile) {
      kind = nextKind;
      filename = nextFile;
      pendingSeek = null;
      greetingToken++;
      portrait.classList.remove('is-responding', 'is-speaking');
      portrait.dataset.greeting = character()?.greeting || 'nod';
      portrait.setAttribute('aria-label', '和' + character().name + '打招呼');
      nickname.textContent = character()?.nickname || '';
      steps.innerHTML = parts().map((_, index) => '<button type="button" data-story-part="' + index + '" aria-label="' + ['听它打招呼', '听它的小秘密', '跟它玩一玩'][index] + '" aria-pressed="' + (index === 0) + '"><i aria-hidden="true"></i></button>').join('');
      showPart(0);
    }
    function seek(index) {
      if (!Number.isInteger(index) || index < 0 || index >= parts().length) return;
      showPart(index);
      pendingSeek = cues().find((cue) => cue.part === index)?.time ?? 0;
      applySeek();
    }
    function reset() {
      greetingToken++;
      pendingSeek = null;
      portrait.classList.remove('is-speaking', 'is-responding');
    }
    steps.addEventListener('click', (event) => {
      const button = event.target.closest('[data-story-part]');
      if (button && kind) onListen(Number(button.dataset.storyPart));
    });
    portrait.addEventListener('click', () => {
      if (!kind || portrait.classList.contains('is-responding')) return;
      const token = ++greetingToken;
      portrait.classList.add('is-responding');
      // A hello never talks over a story or changes its playback position.
      if (audio.paused) onGreeting(kind);
      setTimeout(() => { if (token === greetingToken) portrait.classList.remove('is-responding'); }, reducedMotion ? 0 : 680);
    });
    audio.addEventListener('loadedmetadata', applySeek);
    ['timeupdate', 'seeked', 'playing'].forEach((event) => audio.addEventListener(event, sync));
    ['play', 'playing'].forEach((event) => audio.addEventListener(event, () => {
      if (matchesSource()) portrait.classList.add('is-speaking');
    }));
    ['pause', 'ended', 'error', 'emptied'].forEach((event) => audio.addEventListener(event, () => portrait.classList.remove('is-speaking')));
    audio.addEventListener('ended', () => { if (kind && matchesSource()) showPart(parts().length - 1); });
    return { setCharacter, seek, reset, sync, get part() { return part; } };
  };
})();
