/* Prototype-only narration. Existing recordings and cue files stay unchanged. */
(() => {
  'use strict';
  const voiceBase = new URL('../../assets/voice/', document.currentScript.src);
  // Offline Whisper word alignment plus ffmpeg silencedetect (-38 dB, 120 ms).
  // Each endpoint is inside the measured sentence pause, before the old footprint instruction.
  // Raw evidence: qa-artifacts/t3-waterfall-share/local/voice[-silences.json].
  const introductions = {
    79: { start: 0, end: 3.50 }, // first sentence ends 3.190; next speech starts 3.862
    80: { start: 0, end: 3.35 }, // first sentence ends 3.019; next speech starts 3.694
    81: { start: 0, end: 4.00 }  // first sentence ends 3.695; next speech starts 4.372
  };
  const sharingHint = { file: 'grade2-79.m4a', start: 5.16, end: 8.20, key: 'share:hint' };
  // "一只一只分，让每个营地一样多。" Speech starts 5.295 and ends 7.871;
  // the preceding instruction ends 5.019 and the following sentence starts 8.566.
  function cueFor(state) {
    if (!state || ![79, 80, 81].includes(Number(state.levelId)) || state.complete) return null;
    const key = `${state.levelId}:${state.phase}`;
    if (state.error) return { file: 'grade2-wrong.m4a', key: `${key}:wrong:${state.errorTurn}` };
    if (state.phase === 'answer') return { file: 'grade2-answer-share.m4a', key };
    return { file: `grade2-${state.levelId}.m4a`, ...introductions[state.levelId], key };
  }

  window.G2ShareSpeech = {
    create({ button, onSpeaking = () => {} } = {}) {
      const audio = new Audio();
      audio.preload = 'auto';
      let enabled = true;
      let unlocked = false;
      let speaking = false;
      let currentCue = null;
      let generation = 0;
      let active = null;
      let hidden = document.hidden;
      let disposed = false;

      function drawButton() {
        if (!button) return;
        const audible = enabled && unlocked;
        button.textContent = audible ? '关闭语音' : '听提示';
        button.setAttribute('aria-label', audible ? '关闭语音提示' : '开启语音并听当前提示');
        button.setAttribute('aria-pressed', String(audible));
        button.title = audible ? '关闭语音，后续步骤也保持安静' : '开启语音并听当前提示';
        button.dataset.speaking = String(speaking);
      }

      function setSpeaking(value) {
        if (speaking === value) return;
        speaking = value;
        drawButton();
        onSpeaking(value);
      }

      function stop() {
        generation++;
        if (active) {
          clearTimeout(active.endTimer);
          clearTimeout(active.stallTimer);
          for (const [name, listener] of active.listeners) audio.removeEventListener(name, listener);
        }
        active = null;
        audio.pause();
        // load() aborts outstanding play promises and retires the old source.
        // Their rejection handlers also check generation before touching state.
        audio.removeAttribute('src');
        audio.load();
        setSpeaking(false);
      }

      function playCurrent(overrideCue = null) {
        stop();
        if (disposed || !enabled || !unlocked || hidden || document.hidden || !(overrideCue || currentCue)) return;
        const cue = overrideCue || currentCue;
        const token = generation;
        const run = { listeners: [], endTimer: 0, stallTimer: 0 };
        active = run;
        const valid = () => active === run && token === generation && enabled && !hidden && !document.hidden;
        const finish = () => { if (valid()) stop(); };
        const listen = (event, listener) => {
          run.listeners.push([event, listener]);
          audio.addEventListener(event, listener);
        };
        const clearEnd = () => { clearTimeout(run.endTimer); run.endTimer = 0; };
        const stallGuard = () => {
          clearTimeout(run.stallTimer);
          // A failed/stalled fetch must not keep the host's effects muted forever.
          run.stallTimer = setTimeout(finish, 12000);
        };
        const scheduleEnd = () => {
          clearEnd();
          if (!valid() || cue.end == null || audio.paused || audio.seeking) return;
          const remaining = cue.end - audio.currentTime;
          if (remaining <= .008) { finish(); return; }
          // timeupdate is too sparse for a one-second sentence; use media-time
          // prediction as well, and re-arm after seeks, stalls and rate changes.
          run.endTimer = setTimeout(() => {
            if (!valid()) return;
            if (audio.currentTime >= cue.end - .015) finish();
            else scheduleEnd();
          }, Math.max(4, remaining * 1000 / Math.max(.1, audio.playbackRate)));
        };
        const seekStart = () => {
          if (!valid() || cue.start == null) return;
          try { audio.currentTime = cue.start; } catch (_) { /* Retry at loadedmetadata. */ }
        };
        listen('loadedmetadata', seekStart);
        listen('playing', () => {
          if (!valid()) return;
          clearTimeout(run.stallTimer);
          if (cue.start != null && audio.currentTime < cue.start - .03) seekStart();
          scheduleEnd();
        });
        listen('seeked', scheduleEnd);
        listen('ratechange', scheduleEnd);
        listen('timeupdate', () => {
          if (valid() && cue.end != null && audio.currentTime >= cue.end - .008) finish();
        });
        listen('waiting', () => { clearEnd(); stallGuard(); });
        listen('seeking', clearEnd);
        listen('ended', finish);
        listen('error', finish);
        audio.src = new URL(cue.file, voiceBase).href;
        seekStart();
        setSpeaking(true);
        stallGuard();
        try {
          const pending = audio.play();
          pending?.catch(() => {
            if (!valid()) return;
            stop();
            // No retry loop after autoplay/network rejection. The visible button
            // becomes an explicit recovery gesture and subsequent phases stay quiet.
            unlocked = false;
            drawButton();
          });
        } catch (_) {
          if (valid()) { stop(); unlocked = false; drawButton(); }
        }
      }

      function update(state) {
        if (disposed) return;
        const next = cueFor(state);
        if (next?.key === currentCue?.key) return;
        currentCue = next;
        playCurrent();
      }

      function reset() {
        stop();
        currentCue = null;
        // Replaying a lesson must not silently override the user's mute choice.
      }

      function onGesture(event) {
        if (disposed || unlocked || !enabled || hidden || document.hidden) return;
        if (button?.contains(event.target)) return; // The button handles its own gesture.
        if (event.type === 'keydown' && (event.repeat || !['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))) return;
        unlocked = true;
        drawButton();
        playCurrent();
      }

      function toggle() {
        if (disposed) return;
        if (enabled && unlocked) {
          enabled = false;
          stop();
        } else {
          enabled = true;
          unlocked = true;
          playCurrent();
        }
        drawButton();
      }

      function suspend() { hidden = true; stop(); }
      function onVisibility() {
        if (document.hidden) suspend();
        else hidden = false; // Returning to the tab never resumes an obsolete cue.
      }
      function onPageShow() { hidden = document.hidden; }
      document.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
      document.addEventListener('keydown', onGesture, true);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', suspend);
      window.addEventListener('pageshow', onPageShow);
      button?.addEventListener('click', toggle);
      drawButton();

      return {
        update, reset, stop,
        replay: () => playCurrent(),
        hint: state => playCurrent(state?.phase === 'answer'
          ? { file: 'grade2-answer-share.m4a', key: 'share:answer-hint' }
          : sharingHint),
        status: () => Object.freeze({ enabled, unlocked, speaking, hidden, cue: currentCue ? {...currentCue} : null }),
        isSpeaking: () => speaking,
        dispose() {
          disposed = true;
          stop();
          document.removeEventListener('pointerdown', onGesture, true);
          document.removeEventListener('keydown', onGesture, true);
          document.removeEventListener('visibilitychange', onVisibility);
          window.removeEventListener('pagehide', suspend);
          window.removeEventListener('pageshow', onPageShow);
          button?.removeEventListener('click', toggle);
        }
      };
    }
  };
})();
