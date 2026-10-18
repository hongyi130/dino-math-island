/* CC0 recording-based creature voices + local foley. No looping ambience. */
(() => {
  const version = '?v=20261015-natural3';
  const families = {
    trike: ['herbivore', .96], stego: ['herbivore', 1.08], anky: ['herbivore', .87],
    iguano: ['herbivore', 1.03], pachy: ['herbivore', 1.17],
    brachio: ['sauropod', .97], diplo: ['sauropod', .86], parasaur: ['sauropod', 1.22],
    trex: ['theropod', .83], spino: ['theropod', .93], carno: ['theropod', 1.02],
    allo: ['theropod', .98], raptor: ['theropod', 1.25], dilo: ['theropod', 1.16],
    oviraptor: ['small', 1.08], ptero: ['small', .9],
    styraco: ['herbivore', .9], proto: ['herbivore', 1.2], psittaco: ['small', .96],
    kentro: ['herbivore', 1.05], therizino: ['herbivore', .92], amarga: ['sauropod', 1.1],
    lambeo: ['sauropod', 1.18], nodo: ['herbivore', .85], struthio: ['small', .92],
    compso: ['small', 1.2], cerato: ['theropod', 1.05], bary: ['theropod', .97],
    apato: ['sauropod', 0.94],
    mamenshi: ['sauropod', 0.975],
    argentino: ['sauropod', 1.01],
    alamo: ['sauropod', 1.045],
    shuno: ['sauropod', 1.08],
    camara: ['sauropod', 1.115],
    europa: ['sauropod', 0.94],
    dicraeo: ['sauropod', 0.975],
    niger: ['sauropod', 1.01],
    corytho: ['herbivore', 1.045],
    maia: ['herbivore', 1.08],
    edmonto: ['herbivore', 1.115],
    ourano: ['herbivore', 0.94],
    tsintao: ['herbivore', 0.975],
    saurolo: ['herbivore', 1.01],
    pachyrhino: ['herbivore', 1.045],
    centro: ['herbivore', 1.08],
    chasmo: ['herbivore', 1.115],
    nasuto: ['herbivore', 0.94],
    pentacera: ['herbivore', 0.975],
    euoplo: ['herbivore', 1.01],
    sauropelta: ['herbivore', 1.045],
    tuojiang: ['herbivore', 1.08],
    huayang: ['herbivore', 1.115],
    deinonych: ['theropod', 0.94],
    utah: ['theropod', 0.975],
    sino: ['small', 1.01],
    micro: ['small', 1.045],
    yuty: ['theropod', 1.08],
    galli: ['small', 1.115]
  };
  window.createIslandAudio = ({ enabled = true } = {}) => {
    let unlocked = false;
    let visible = !document.hidden;
    let narrating = false;
    let disposed = false;
    let lastCall = -Infinity;
    const lastTouches = new Map();
    let movement = 0;
    let generation = 0;
    const timers = new Set();
    const effects = new Set();
    const playVersions = new WeakMap();
    const all = [];
    const create = (file) => {
      const audio = new Audio('./assets/sfx/' + file + '.wav' + version);
      audio.preload = 'auto';
      document.querySelector?.('#soundscape')?.appendChild?.(audio);
      all.push(audio);
      return audio;
    };
    const calls = Object.fromEntries(['herbivore', 'sauropod', 'theropod', 'small'].map((family) => [family, create('v3/call-' + family)]));
    const replies = Object.fromEntries(['herbivore', 'sauropod', 'theropod', 'small'].map((family) => [family, create('v3/reply-' + family)]));
    const creatureVoices = [...Object.values(calls), ...Object.values(replies)];
    const steps = Array.from({ length: 3 }, () => create('footstep-grass'));
    const rustle = create('leaf-rustle');
    // Some mobile browsers ignore media volume. Speech always stops short
    // effects, so narration protection does not depend on volume support.
    let canAdjustVolume = false;
    try { rustle.volume = .37; canAdjustVolume = Math.abs(rustle.volume - .37) < .01; } catch (_) {}
    const allowed = () => !disposed && enabled && unlocked && visible;
    const later = (fn, ms) => {
      const token = generation;
      const id = setTimeout(() => {
        timers.delete(id);
        if (token === generation && allowed()) fn();
      }, ms);
      timers.add(id);
      return id;
    };
    const pause = (audio, rewind = false) => {
      // A pending play() belongs to this use of the media element. Retiring it
      // prevents a late rejection from pausing a newer reply or footstep.
      playVersions.set(audio, (playVersions.get(audio) || 0) + 1);
      audio.pause();
      effects.delete(audio);
      if (rewind) { try { audio.currentTime = 0; } catch (_) {} }
    };
    const tryPlay = (audio) => {
      const version = (playVersions.get(audio) || 0) + 1;
      playVersions.set(audio, version);
      const rejected = () => { if (playVersions.get(audio) === version) pause(audio); };
      try { const pending = audio.play(); pending?.catch(rejected); } catch (_) { rejected(); }
    };
    const stopEffects = () => {
      for (const audio of [...effects]) pause(audio, true);
    };
    const cancelPending = () => {
      generation++;
      movement++;
      for (const id of timers) clearTimeout(id);
      timers.clear();
    };
    const reset = () => {
      cancelPending();
      stopEffects();
      lastCall = -Infinity;
      lastTouches.clear();
    };
    const unlock = () => {
      if (disposed) return;
      unlocked = true;
    };
    const setEnabled = (value) => {
      enabled = Boolean(value);
      if (!enabled) {
        cancelPending();
        all.forEach((audio) => pause(audio, true));
      }
    };
    const setNarrating = (value) => {
      narrating = Boolean(value);
      if (narrating) {
        // Prevent late footsteps/calls from interrupting a newly started voice.
        cancelPending();
        stopEffects();
      }
    };
    const playEffect = (audio, volume, rate = 1) => {
      if (!allowed() || narrating) return;
      pause(audio, true);
      if (canAdjustVolume) audio.volume = volume;
      audio.playbackRate = rate;
      if ('preservesPitch' in audio) audio.preservesPitch = false;
      if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = false;
      effects.add(audio);
      tryPlay(audio);
    };
    creatureVoices.concat(steps, rustle).forEach((audio) => {
      ['ended', 'error'].forEach((event) => audio.addEventListener(event, () => effects.delete(audio)));
    });
    const creature = (kind, action = 'touch', options = {}) => {
      if (!allowed() || narrating) return;
      const moving = action === 'arrive' || action === 'depart' || action === 'entrance';
      if (moving && options.durationMs !== 0) {
        const token = ++movement;
        const requested = Number(options.durationMs);
        const duration = Number.isFinite(requested) && requested > 0 ? Math.max(300, Math.min(1800, requested)) : (action === 'depart' ? 680 : 780);
        const stepVolume = options.lightSteps ? .30 : .48;
        if (kind === 'ptero') {
          [0, .5].forEach((beat) => later(() => {
            if (token === movement) playEffect(rustle, .24, 1.18);
          }, duration * beat));
        } else {
          steps.forEach((audio, index) => later(() => {
            if (token === movement) playEffect(audio, stepVolume, 1 + index * .04);
          }, index * duration / 3));
          later(() => { if (token === movement) playEffect(rustle, options.lightSteps ? .22 : .32); }, duration * .36);
        }
      }
      const now = Date.now();
      if (now - lastCall < (action === 'touch' ? 500 : action === 'happy' ? 500 : 1100)) return;
      if (action === 'touch' && now - (lastTouches.get(kind) ?? -Infinity) < 500) return;
      lastCall = now;
      if (action === 'touch') lastTouches.set(kind, now);
      creatureVoices.forEach((audio) => pause(audio));
      const [family, rate] = families[kind] || families.trike;
      const voice = action === 'touch' ? replies[family] : calls[family];
      // Small pitch differences keep the recorded animal breath and texture intact.
      const naturalRate = Math.max(.92, Math.min(1.12, rate)) * (.99 + Math.random() * .02);
      playEffect(voice, action === 'touch' ? .62 : .70, naturalRate);
    };
    const onGesture = (event) => {
      if (event.type === 'keydown' && !['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      unlock();
    };
    const suspend = () => {
      visible = false;
      cancelPending();
      all.forEach((audio) => pause(audio, true));
    };
    const onVisibility = () => {
      if (document.hidden) suspend();
      else visible = true;
    };
    const onPageShow = () => { visible = !document.hidden; };
    document.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
    document.addEventListener('keydown', onGesture, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener?.('pagehide', suspend);
    window.addEventListener?.('pageshow', onPageShow);
    const dispose = () => {
      disposed = true;
      suspend();
      all.forEach((audio) => audio.remove?.());
      document.removeEventListener('pointerdown', onGesture, true);
      document.removeEventListener('keydown', onGesture, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener?.('pagehide', suspend);
      window.removeEventListener?.('pageshow', onPageShow);
    };
    return { unlock, setEnabled, setNarrating, creature, reset, dispose };
  };
})();
