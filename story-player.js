/* Picture-led, three-part stories. All timing data ships with the game. */
(() => {
  window.createDinoStory = ({ audio, caption, steps, portrait, nickname, onListen, onGreeting, reducedMotion }) => {
    let kind = '', filename = '', part = 0, pendingSeek = null, greetingToken = 0;
    const character = () => window.DINO_CHARACTERS[kind];
    const parts = () => character()?.introParts || [character()?.intro || ''];
    const cues = () => window.DINO_VOICE_CUES?.[filename] || [];
    const matchesSource = () => audio.src.split('/').pop()?.split('?')[0] === filename;
    const portraitImage = portrait.querySelector('img');
    const shadowLayer = document.createElement('span');
    shadowLayer.className = 'portrait-ground-shadows';
    shadowLayer.setAttribute('aria-hidden', 'true');
    portrait.appendChild(shadowLayer);
    function fitPortrait() {
      const width = portrait.clientWidth, height = portrait.clientHeight;
      if (!width || !height || !portraitImage.complete || !portraitImage.naturalWidth) return;
      const imageFile = portraitImage.currentSrc.split('/').pop()?.split('?')[0];
      const data = imageFile === character()?.image ? window.DINO_GROUND_DATA?.[kind] : null;
      const bounds = data?.bounds || [0, 0, 1, 1], contacts = data?.contacts || [];
      const style = getComputedStyle(portraitImage);
      const boxWidth = parseFloat(style.width), boxHeight = parseFloat(style.height);
      const scale = Math.min(boxWidth / portraitImage.naturalWidth, boxHeight / portraitImage.naturalHeight);
      const drawnWidth = portraitImage.naturalWidth * scale, drawnHeight = portraitImage.naturalHeight * scale;
      // Contain size stays unchanged. Only the transparent padding is offset so
      // the visible alpha silhouette, rather than its file rectangle, is centred.
      const shiftX = drawnWidth * (.5 - (bounds[0] + bounds[2]) / 2);
      const shiftY = drawnHeight * (.5 - (bounds[1] + bounds[3]) / 2);
      portraitImage.style.setProperty('--portrait-shift-x', shiftX.toFixed(3) + 'px');
      portraitImage.style.setProperty('--portrait-shift-y', shiftY.toFixed(3) + 'px');
      const footX = contacts.length ? contacts.reduce((sum, foot) => sum + foot[0], 0) / contacts.length : .5;
      const footY = contacts.length ? Math.max(...contacts.map(foot => foot[1])) : bounds[3];
      portraitImage.style.setProperty('--portrait-origin-x', ((boxWidth - drawnWidth) / 2 + footX * drawnWidth).toFixed(3) + 'px');
      portraitImage.style.setProperty('--portrait-origin-y', ((boxHeight - drawnHeight) / 2 + footY * drawnHeight).toFixed(3) + 'px');
      const left = (width - drawnWidth) / 2 + shiftX, top = (height - drawnHeight) / 2 + shiftY;
      shadowLayer.replaceChildren(...contacts.map(([x, y, footWidth]) => {
        const shadow = document.createElement('i');
        shadow.style.left = (left + x * drawnWidth).toFixed(3) + 'px';
        shadow.style.top = (top + y * drawnHeight + .25).toFixed(3) + 'px';
        shadow.style.width = Math.max(3, footWidth * drawnWidth * 1.1).toFixed(3) + 'px';
        shadow.style.height = Math.max(2, Math.min(6, drawnHeight * .018)).toFixed(3) + 'px';
        return shadow;
      }));
      portrait.dataset.portraitFitted = data ? kind : 'fallback';
    }
    portraitImage.addEventListener('load', fitPortrait);
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(fitPortrait);
      observer.observe(portrait);
      observer.observe(portraitImage);
    } else window.addEventListener('resize', fitPortrait);
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
      shadowLayer.replaceChildren();
      delete portrait.dataset.portraitFitted;
      requestAnimationFrame(fitPortrait);
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
