/* Prototype-only narration. Existing recordings and cue files stay unchanged. */
(() => {
  'use strict';
  const voiceBase = new URL('../../assets/voice/', document.currentScript.src);
  const multiplicationIds = new Set([71, 72, 73, 74, 75, 76, 77, 78, 91, 92, 93, 94, 95, 96]);
  // These two boundaries already exist in task-guidance-cues.js.
  const firstTeam = { file: 'task-01.m4a', start: 2.126, end: 3.220 };
  const countTeams = { file: 'task-01.m4a', start: 3.642, end: 5.271 };

  function cueFor(state) {
    if (!state || !multiplicationIds.has(Number(state.levelId))) return null;
    const id = Number(state.levelId), per = Number(state.per);
    if (!Number.isFinite(per) || per < 1 || !Array.isArray(state.filled)) return null;
    const key = `${id}:${per}:${Number(state.groups)}`;
    if (state.phase === 'build') {
      return Number(state.filled[0] || 0) < per
        ? { ...firstTeam, key: `${key}:first` }
        : { file: `grade2-${id}.m4a`, key: `${key}:teams` };
    }
    if (state.phase === 'count') {
      return state.wrong != null
        ? { file: 'grade2-wrong.m4a', key: `${key}:wrong:${state.wrong}` }
        : { ...countTeams, key: `${key}:count` };
    }
    if (state.phase === 'answer') return { file: 'grade2-answer-multiply.m4a', key: `${key}:answer` };
    return null;
  }

  window.G2SampleSpeech = {
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

      function playCurrent() {
        stop();
        if (disposed || !enabled || !unlocked || hidden || document.hidden || !currentCue) return;
        const cue = currentCue;
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
