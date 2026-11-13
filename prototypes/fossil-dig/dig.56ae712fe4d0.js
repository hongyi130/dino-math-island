;
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
  window.createIslandAudio = ({ enabled = true, assetBase = './assets/sfx/' } = {}) => {
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
      const audio = new Audio();
      audio.preload = 'none';
      audio.src = assetBase + file + '.wav' + version;
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
      try {
        // A failed network request leaves MediaError set until load() resets it.
        if (audio.error) audio.load();
        const pending = audio.play();
        pending?.catch(rejected);
      } catch (_) { rejected(); }
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
    // Optional prototype foley uses the same speech, visibility and mute gates.
    // Existing callers keep their original creature paths and behavior.
    const foleyTimes = new Map();
    let fossilCall;
    const foley = (name) => {
      if (!allowed() || narrating) return;
      const spec = { 'leaf-rustle': [rustle, .18, 900], 'footstep-grass': [steps[0], .18, 200] };
      if (name === 'call-sauropod') {
        if (!fossilCall) {
          fossilCall = create('call-sauropod');
          ['ended', 'error'].forEach(event => fossilCall.addEventListener(event, () => effects.delete(fossilCall)));
        }
        spec[name] = [fossilCall, .42, 1100];
      }
      const entry = spec[name], now = Date.now();
      if (!entry || now - (foleyTimes.get(name) ?? -Infinity) < entry[2]) return;
      foleyTimes.set(name, now);
      playEffect(entry[0], entry[1]);
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
    return { unlock, setEnabled, setNarrating, creature, foley, reset, dispose };
  };
})();

;
/* The journey trials share one new key. Existing game keys are read, never rewritten. */
(() => {
  'use strict';
  const KEY='dino-math-island-journey-v1', LEGACY='dino-math-island-completed-v4';
  const ROUTE=Object.freeze([76,77,78]);
  const ROUTES=Object.freeze({cedar:ROUTE,waterfall:Object.freeze([79,80,81])});
  const levels=Object.values(ROUTES).flat();
  const config={76:[3,4],77:[6,3],78:[1,4]};
  const shareConfig={79:[4,2,2],80:[6,2,3],81:[6,3,2]};
  const routeFor=id=>Object.keys(ROUTES).find(name=>ROUTES[name].includes(id));
  const listeners=new Set();
  const pendingAttempts=new Set();
  let memory=null, healthy=true;
  const blank=()=>({version:1,completedLevels:[],attempts:{},currentLevelId:76,currentByRoute:{cedar:76,waterfall:79},cedarDiscovery:false,waterfallDiscovery:false});
  function normalize(value){
    const d=blank();if(!value||value.version!==1)return d;
    d.completedLevels=Array.isArray(value.completedLevels)?[...new Set(value.completedLevels.filter(id=>levels.includes(id)))]:[];
    if(value.attempts&&typeof value.attempts==='object'&&!Array.isArray(value.attempts))d.attempts={...value.attempts};
    if(levels.includes(value.currentLevelId))d.currentLevelId=value.currentLevelId;
    Object.entries(ROUTES).forEach(([name,route])=>{
      // Older v1 records had only one currentLevelId; migrate in memory, without
      // writing on page load or allowing the other route to steal its position.
      const current=value.currentByRoute?.[name];
      if(route.includes(current))d.currentByRoute[name]=current;
      else if(route.includes(d.currentLevelId))d.currentByRoute[name]=d.currentLevelId;
      d[`${name}Discovery`]=value[`${name}Discovery`]===true&&route.every(id=>d.completedLevels.includes(id));
    });
    return d;
  }
  function discoveries(d){Object.entries(ROUTES).forEach(([name,route])=>{d[`${name}Discovery`]=route.every(id=>d.completedLevels.includes(id));});}
  function read(){
    try{
      const raw=localStorage.getItem(KEY), disk=raw?normalize(JSON.parse(raw)):null;
      if(healthy||!memory)return disk||normalize(memory);
      // A quota failure does not prevent another tab from making progress.
      // Keep unsaved local attempts, but continue receiving its completions.
      const local=normalize(memory), merged=normalize(disk||local);
      merged.completedLevels=[...new Set([...local.completedLevels,...merged.completedLevels])].sort((a,b)=>a-b);
      merged.attempts={...local.attempts,...merged.attempts};
      pendingAttempts.forEach(id=>{if(local.attempts[id])merged.attempts[id]=local.attempts[id];});
      merged.currentLevelId=local.currentLevelId;
      pendingAttempts.forEach(id=>{const name=routeFor(id);if(name)merged.currentByRoute[name]=local.currentByRoute[name];});
      discoveries(merged);
      memory=merged;
      return normalize(merged);
    }
    catch(_){healthy=false;return normalize(memory);}
  }
  function oldCompleted(){
    try{const values=JSON.parse(localStorage.getItem(LEGACY)||'[]');return new Set(Array.isArray(values)?values.filter(Number.isInteger).map(index=>index+1).filter(id=>levels.includes(id)):[]);}
    catch(_){return new Set();}
  }
  function completed(){return new Set([...read().completedLevels,...oldCompleted()]);}
  function validShare(id,s,allowDone){
    const [total,groups,result]=shareConfig[id];
    if(s?.kind!=='share'||!['build','answer'].includes(s.phase)||!Array.isArray(s.groupCounts)||s.groupCounts.length!==groups)return null;
    if(Array.from(s.groupCounts).some(n=>!Number.isInteger(n)||n<0||n>total)||!Number.isInteger(s.poolRemaining)||s.poolRemaining<0||s.poolRemaining>total)return null;
    if(s.groupCounts.reduce((sum,n)=>sum+n,0)+s.poolRemaining!==total||typeof s.complete!=='boolean')return null;
    if(s.answer!==null&&(!Number.isInteger(s.answer)||s.answer<0))return null;
    if(s.phase==='build'&&(s.answer!==null||s.complete))return null;
    if(s.phase==='answer'&&(s.poolRemaining!==0||!s.groupCounts.every(n=>n===result)))return null;
    if(s.complete&&(!allowDone||s.answer!==result))return null;
    return {kind:'share',phase:s.phase,groupCounts:[...s.groupCounts],poolRemaining:s.poolRemaining,answer:s.answer,complete:s.complete};
  }
  function validSnapshot(id,s,allowDone=false){
    if(shareConfig[id])return validShare(id,s,allowDone);
    if(!config[id]||!s||!Array.isArray(s.filled))return null;
    const [per,groups]=config[id];
    if(s.filled.length!==groups||s.filled.some(n=>!Number.isInteger(n)||n<0||n>per)||!Number.isInteger(s.counted)||s.counted<0||s.counted>groups)return null;
    const filled=[...s.filled];let seenGap=false;
    for(let i=0;i<groups;i++){if(i>0&&filled[i]!==0&&filled[i]!==per)return null;if(seenGap&&filled[i]!==0)return null;if(filled[i]<per)seenGap=true;}
    let phase=s.phase;const full=filled.every(n=>n===per);
    if(!['build','count','answer','done'].includes(phase))return null;
    if(phase==='build'&&s.counted!==0)return null;
    if(phase==='build'&&full)phase='count';
    if(['count','answer','done'].includes(phase)&&!full)return null;
    if(phase==='count'&&s.counted===groups)phase='answer';
    if(['answer','done'].includes(phase)&&s.counted!==groups)return null;
    if(phase==='done'&&!allowDone)return null;
    return {phase,filled,counted:s.counted};
  }
  function notify(){listeners.forEach(fn=>fn());}
  function write(d,touchedId){
    const proposed=normalize(d), local=normalize(memory);
    let disk=blank(),hasDisk=false;
    try{const raw=localStorage.getItem(KEY);hasDisk=!!raw;disk=normalize(JSON.parse(raw||'null'));}
    catch(_){healthy=false;}
    // Re-read just before writing: only this action's attempt may replace the
    // latest disk snapshot; another tab's completed lessons are monotonic.
    const merged=normalize(proposed);
    merged.completedLevels=[...new Set([...local.completedLevels,...proposed.completedLevels,...disk.completedLevels])].sort((a,b)=>a-b);
    merged.attempts={...local.attempts,...disk.attempts};
    merged.attempts[touchedId]=proposed.attempts[touchedId];
    merged.currentByRoute={...(hasDisk?disk:local).currentByRoute};
    const name=routeFor(touchedId);merged.currentByRoute[name]=proposed.currentByRoute[name];
    discoveries(merged);
    memory=merged;
    try{localStorage.setItem(KEY,JSON.stringify(memory));healthy=true;pendingAttempts.clear();notify();return true;}
    catch(_){healthy=false;pendingAttempts.add(touchedId);notify();return false;}
  }
  function saveAttempt(id,s){
    id=Number(id);const valid=validSnapshot(id,s,completed().has(id));if(!valid)return false;
    const d=read();d.attempts[id]=valid;d.currentLevelId=id;d.currentByRoute[routeFor(id)]=id;return write(d,id);
  }
  function complete(id,s){
    id=Number(id);const valid=validSnapshot(id,s,true);if(!valid||(valid.kind==='share'?!valid.complete:valid.phase!=='done'))return false;
    const d=read();d.completedLevels=[...new Set([...d.completedLevels,...oldCompleted(),id])].sort((a,b)=>a-b);
    const name=routeFor(id);d.attempts[id]=valid;d.currentLevelId=ROUTES[name].find(n=>!d.completedLevels.includes(n))||id;d.currentByRoute[name]=d.currentLevelId;
    return write(d,id);
  }
  function snapshot(id){const d=read();return validSnapshot(Number(id),d.attempts[id],completed().has(Number(id)));}
  function routeDone(name){const route=ROUTES[name],done=completed();return Array.isArray(route)&&route.every(id=>done.has(id));}
  function unlocked(name){return name==='cedar'||name==='waterfall'&&routeDone('cedar')||name==='summit'&&routeDone('waterfall');}
  function nextLevel(name='cedar'){const route=ROUTES[name];if(!Array.isArray(route))return null;const done=completed(),current=read().currentByRoute[name];return route.includes(current)&&!done.has(current)?current:route.find(id=>!done.has(id))??null;}
  function refresh(){memory=read();notify();}
  window.addEventListener('storage',e=>{if(e.key===KEY||e.key===LEGACY||e.key===null)refresh();});
  window.addEventListener('pageshow',refresh);
  window.addEventListener('focus',refresh);
  window.DinoJourneyStore=Object.freeze({KEY,ROUTE,ROUTES,snapshot,saveAttempt,complete,completed,nextLevel,routeDone,unlocked,storageOK:()=>healthy,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
})();

;
window.FOSSIL_BONE_AREA=Object.freeze({"grid":32,"weights":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,75,1239,738,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,787,947,655,21,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1113,620,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1197,643,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1027,1081,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,160,410,558,701,709,703,1284,899,0,0,0,0,0,0,0,0,0,0,0,0,0,0,258,147,0,0,0,16,267,571,1036,1462,1512,1521,1521,1560,1521,1486,1347,133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,20,672,1103,1139,1191,1428,1521,1504,1408,1404,1520,1516,1521,1560,1441,1340,104,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,22,87,396,158,622,1021,1375,1510,1521,1560,972,1336,206,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,383,993,20,626,1518,1084,1271,907,1240,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,134,1376,243,0,202,1372,4,0,1009,1367,780,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,296,1211,443,0,792,1041,0,0,1360,637,1355,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,989,1234,15,149,1505,205,1296,817,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,157,920,531,713,948,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"total":92275,"ratio":0.7,"metric":"rock-v2","legacy":{"weights":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,270,414,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,485,1455,1448,458,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,73,1366,755,680,673,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,449,1479,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,684,1357,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,767,1492,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,669,1508,194,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,529,1505,534,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,415,1495,877,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,344,1463,1143,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,402,1474,1384,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2,1,653,1528,1494,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,77,1094,1509,1478,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,7,266,641,1321,1486,1509,1468,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,8,419,994,1400,1486,1548,1509,1509,1153,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,0,196,978,1456,1509,1509,1509,1548,1509,1461,700,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,4,570,1445,1546,1548,1537,1522,1486,1456,1544,1532,157,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,47,944,1479,1548,1509,1507,1494,1300,986,1172,1484,1508,413,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,227,1195,1504,1509,1548,1504,1492,1316,1231,1058,842,1466,1508,394,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,5,606,1394,1476,1281,1430,1548,1040,1241,1249,1236,1090,1103,1504,909,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,46,543,1166,1525,1222,908,536,1168,1439,1366,87,517,710,799,670,1398,753,0,1,0,0,0,0,0,0,0,0,0,0,38,358,880,1352,1385,1203,849,365,92,65,1202,100,1296,339,0,0,0,692,1509,1278,57,3,1,0,0,0,0,230,215,371,639,1002,1277,1191,975,675,264,112,2,0,0,972,1228,1,1218,1094,0,0,0,527,1546,1546,363,1,1,0,0,0,0,22,321,447,367,212,100,1,0,0,0,0,1,0,1,1303,612,0,1053,1082,0,0,0,42,1444,816,937,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,507,1079,1,0,1094,1166,0,0,0,24,1458,174,1154,480,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1178,651,0,0,1002,1376,0,0,0,40,1452,475,640,1093,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,1337,1210,101,0,921,1500,767,0,0,1,1270,1262,662,1360,375,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,114,178,14,0,77,276,180,0,0,0,262,319,48,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"total":208412},"legacyEgg":{"weights":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,433,882,1247,1361,1246,932,407,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,675,1205,1459,1061,813,1040,1404,1548,1509,1157,310,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,734,1509,1182,30,0,0,0,100,674,1394,1509,1505,510,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,55,1472,1059,165,0,0,0,0,0,0,165,1238,1509,1472,341,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,236,2,0,0,0,0,187,710,986,878,589,1250,1548,1286,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,251,0,0,0,0,0,0,613,1419,1509,1548,1509,1509,1508,1509,1504,142,0,0,0,0,0,0,0,0,0,0,0,0,0,0,398,261,0,0,0,0,14,816,1492,1509,1507,1548,1509,1509,1509,1509,1506,200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,668,357,0,0,0,0,767,1508,1509,1509,1335,1356,1355,1249,1444,1509,1376,21,0,0,0,0,0,0,0,0,0,0,0,0,0,0,358,1253,188,0,3,603,1541,1335,1509,1509,1340,1124,1039,1154,1250,1509,1029,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,929,1514,1158,1256,1547,1498,1128,1064,1382,1547,1332,1073,916,1486,1438,366,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,754,1377,1453,1341,957,823,1455,1500,1509,898,740,1381,1435,223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,135,365,166,678,1507,1319,465,310,1074,1499,962,265,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,327,1017,1136,199,0,628,339,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"total":152083},"legacyRock":{"weights":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,326,1190,362,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1254,931,951,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,157,1521,257,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,291,1521,156,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,207,1521,486,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,85,1521,794,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,100,395,619,868,1018,1183,1209,1228,1206,1500,228,0,0,0,0,0,0,0,0,0,0,0,0,455,375,58,0,0,89,433,753,1053,1536,1560,1560,1560,1560,1600,1560,1560,1307,715,0,0,0,0,0,0,0,0,0,0,0,0,0,4,539,1131,1294,1315,1433,1518,1521,1365,1214,1419,1521,1521,1521,1560,1521,1356,888,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,178,294,19,1030,886,1442,1521,1521,1560,1521,697,1072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,807,770,0,782,1521,1238,1491,1006,1300,602,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,392,1282,4,0,164,1494,104,0,312,1521,1068,152,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1181,1498,96,0,617,1139,0,0,828,914,1512,689,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,50,270,4,42,1428,1455,131,0,965,676,761,1294,108,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,221,453,7,0,1370,1322,338,1521,909,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,106,300,5,354,227,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"total":114004},"source":"Existing native relief, registered to approved R7 plane at x5%,y8%,scale90%; old masks retained for migration."});

;
window.FOSSILS={"version":1,"rocks":{"sandstone":{"label":"砂岩","stages":["art/rock-stage-1.webp","art/rock-stage-2.webp","art/rock-stage-3.webp","art/rock-stage-4.webp"],"groove":"#ac8959"},"mud":{"label":"泥岩","stages":["art/mud/rock-stage-1.webp","art/mud/rock-stage-2.webp","art/mud/rock-stage-3.webp","art/mud/rock-stage-4.webp"]},"cobble":{"label":"卵石岩","stages":["art/cobble/rock-stage-1.webp","art/cobble/rock-stage-2.webp","art/cobble/rock-stage-3.webp","art/cobble/rock-stage-4.webp"]},"sandstone-plain":{"label":"砂岩","stages":["art/rock-stage-1.webp","art/rock-stage-2.webp","art/rock-stage-3-plain.webp","art/rock-stage-4-plain.webp"],"groove":"#ac8959"}},"fossils":{"brachio":{"id":"brachio","name":"腕龙","latinName":"Brachiosaurus","isDinosaur":true,"era":"jurassic","eraLabel":"侏罗纪","bodyClass":"长脖子","rock":"sandstone","template":"longneck","art":{"mode":"legacy","geometry":{"x":0.05,"y":0.08,"scale":0.9},"skeletonSize":[1254,1254],"interior":[[0.032,0.442],[0.443,0.053],[0.958,0.319],[0.967,0.4],[0.706,0.703],[0.49,0.684],[0.21,0.59]],"parts":[{"id":"head","label":"头","box":[880,240,978,304],"file":"rock-bone-head.webp","coverage":[[277,63],[278,1239],[279,738],[280,1],[309,1],[310,184],[311,655],[312,21]]},{"id":"neck","label":"脖子","box":[824,277,923,544],"file":"rock-bone-neck.webp","coverage":[[277,12],[309,786],[310,766],[341,1113],[342,620],[373,1197],[374,643],[405,1027],[406,1081],[436,40],[437,1278],[438,899],[468,508],[469,1347],[470,133],[501,7]]},{"id":"tail","label":"尾巴","box":[172,496,593,598],"file":"rock-bone-tail.webp","coverage":[[430,10],[453,258],[454,147],[458,16],[459,267],[460,571],[461,1036],[462,1386],[463,98],[485,20],[486,672],[487,1103],[488,1139],[489,1191],[490,1428],[491,1521],[492,1504],[493,1408],[494,569],[520,3],[521,22],[522,87],[523,396],[524,158]]},{"id":"legs","label":"腿","box":[436,532,928,836],"file":"rock-bone-legs.webp","coverage":[[462,33],[463,226],[494,818],[495,1515],[496,100],[500,19],[525,622],[526,1021],[527,1375],[528,884],[531,5],[532,1265],[533,130],[556,383],[557,993],[558,20],[559,626],[560,1478],[561,56],[563,505],[564,1240],[565,2],[587,134],[588,1376],[589,243],[591,202],[592,1372],[593,4],[595,1009],[596,1367],[597,780],[619,296],[620,1211],[621,443],[623,792],[624,1041],[627,1360],[628,637],[629,1355],[630,13],[655,989],[656,1234],[657,15],[658,149],[659,1505],[660,205],[661,1296],[662,817],[690,157],[691,920],[692,531],[693,713],[694,948]]},{"id":"body","label":"身体","box":[568,476,856,666],"file":"rock-bone-body.webp","coverage":[[431,160],[432,410],[433,558],[434,701],[435,709],[436,668],[437,7],[462,58],[463,1216],[464,1521],[465,1521],[466,1560],[467,1521],[468,993],[494,26],[495,6],[496,1422],[497,1521],[498,1560],[499,1441],[500,1326],[501,97],[528,642],[529,1521],[530,1560],[531,966],[532,81],[533,79],[560,44],[561,1029],[562,1271],[563,402]]}],"face":{"file":"art/rock-grooves.webp","mask":true},"sand":{"file":"art/rock-stage-4.webp","full":true},"bowl":"art/rock-stage-4.webp","skeleton":{"file":"art/brachio-skeleton.webp"}},"area":"legacy","stages":["art/rock-stage-1.webp","art/rock-stage-2.webp","art/rock-stage-3.webp","art/rock-stage-4.webp"],"waveOrder":["head","neck","body","legs","tail"],"groove":{"base":"#ac8959","inset":"#4a2d14","light":"#ffe6b1"},"voice":{"file":"gallery-brachio.m4a","start":0.1021,"end":7.2266,"text":"小伙伴，抬头看看我呀，我是腕龙，今天想和你一起玩高一点、再高一点！"},"living":{"file":"../../assets/brachio-3d.webp","aspect":"666/1000"},"card":{"title":"腕龙 · 侏罗纪","text":"我有长长的脖子，前腿比后腿还长，所以身体前面高高的。这样的身形能帮助我够到高处的树叶，植物就是我的食物。","sources":["characters-data.js:brachio.name/introParts[1]","prototypes/island-journey/character-eras.json:entries.brachio.periodLabel"]},"reviveLine":"长脖子伙伴，已经在石板上站好啦","eyebrow":"你的第一块化石","journey":{"route":"cedar","name":"巨杉营地","sample":"g2-multiply","firstLevel":76,"stand":1},"camp":"巨杉营地","nickname":"长脖子的树梢伙伴","location":{"id":"g1-j2","name":"一年级 · 侏罗纪第2站"}},"mamenshi":{"id":"mamenshi","name":"马门溪龙","latinName":"Mamenchisaurus","isDinosaur":true,"era":"jurassic","eraLabel":"侏罗纪","bodyClass":"长脖子","rock":"cobble","template":"longneck","art":{"mode":"cut","geometry":{"x":-0.02416666666666667,"y":-0.0880430416666666,"scale":1.045},"skeletonSize":[1254,1254],"interior":[[0.14752791068580545,0.3091320972886762],[0.8556618819776715,0.3091320972886762],[0.9226475279106858,0.40961056618819774],[0.9226475279106858,0.706261283891547],[0.8556618819776715,0.7445387958532695],[0.14752791068580545,0.7254000398724083],[0.08054226475279107,0.6584143939393938],[0.08054226475279107,0.40961056618819774]],"parts":[{"id":"head","label":"头","box":[137.0,515.5982,205.9253,576.8147],"file":"fossils/mamenshi/bone-head.webp","coverage":[[323,21],[324,29],[354,38],[355,4711],[356,4096],[386,126],[387,2687],[388,365]]},{"id":"legs","label":"腿","box":[454.8728,639.8452,825.8,814.8793],"file":"fossils/mamenshi/bone-legs.webp","coverage":[[465,696],[466,4404],[467,671],[492,2858],[493,4116],[494,4],[497,3210],[498,2282],[499,2459],[524,2586],[525,2705],[526,3622],[528,9],[529,4765],[531,4560],[532,1367],[555,277],[556,4647],[557,457],[558,4396],[560,15],[561,4626],[563,109],[564,5666],[565,511],[587,2242],[588,2575],[589,234],[590,5379],[591,140],[592,908],[593,3213],[596,1817],[597,78]]},{"id":"tail","label":"尾巴","box":[760.0488,613.9982,1121.0,675.2147],"file":"fossils/mamenshi/bone-tail.webp","coverage":[[435,556],[436,2511],[437,1172],[438,109],[467,1438],[468,6242],[469,6201],[470,6000],[471,5167],[472,4299],[473,3586],[474,2827],[475,2086],[476,1278],[477,49],[500,283],[501,215],[502,103],[503,133],[504,80]]},{"id":"neck","label":"脖子","box":[198.67,512.424,532.4138,674.3078],"file":"fossils/mamenshi/bone-neck.webp","coverage":[[324,205],[325,477],[356,1843],[357,5556],[358,5622],[359,2294],[360,17],[389,2],[390,1951],[391,6419],[392,4450],[393,809],[423,1111],[424,5485],[425,6390],[426,4593],[427,3402],[428,3644],[429,1136],[456,96],[457,1800],[458,4317],[459,5413],[460,4678],[461,4],[491,133],[492,126]]},{"id":"body","label":"身体","box":[359.647,582.2562,807.2083,716.9327],"file":"fossils/mamenshi/bone-body.webp","coverage":[[398,607],[399,1291],[400,1297],[401,910],[402,112],[429,4603],[430,6618],[431,6444],[432,6398],[433,6543],[434,6375],[435,4110],[436,369],[460,1307],[461,6633],[462,5441],[463,4898],[464,4734],[465,4832],[466,2482],[467,3258],[468,259],[492,151],[493,1913],[494,4529],[495,4347],[496,3573],[497,624],[499,144],[500,479],[526,748],[527,1116],[528,76]]}],"bowl":"art/wide-face/cobble.webp","sand":{"file":"art/wide-face/mamenshi-buried.webp","full":true},"skeleton":{"file":"art/fossils/mamenshi/skeleton.webp","box":[137,512.4239631336405,1121,827.5760368663595]}},"area":{"grid":32,"weights":[[323,21],[324,234],[325,477],[354,38],[355,4711],[356,5939],[357,5556],[358,5622],[359,2294],[360,17],[386,126],[387,2687],[388,365],[389,2],[390,1951],[391,6419],[392,4450],[393,809],[398,607],[399,1291],[400,1297],[401,910],[402,112],[423,1111],[424,5485],[425,6390],[426,4593],[427,3402],[428,3644],[429,5739],[430,6618],[431,6444],[432,6398],[433,6543],[434,6375],[435,4666],[436,2880],[437,1172],[438,109],[456,96],[457,1800],[458,4317],[459,5413],[460,5985],[461,6637],[462,5441],[463,4898],[464,4734],[465,5528],[466,6886],[467,5367],[468,6501],[469,6201],[470,6000],[471,5167],[472,4299],[473,3586],[474,2827],[475,2086],[476,1278],[477,49],[491,133],[492,3135],[493,6029],[494,4533],[495,4347],[496,3573],[497,3834],[498,2282],[499,2603],[500,762],[501,215],[502,103],[503,133],[504,80],[524,2586],[525,2705],[526,4370],[527,1116],[528,85],[529,4765],[531,4560],[532,1367],[555,277],[556,4647],[557,457],[558,4396],[560,15],[561,4626],[563,109],[564,5666],[565,511],[587,2242],[588,2575],[589,234],[590,5379],[591,140],[592,908],[593,3213],[596,1817],[597,78]],"total":303206,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[419,94],[420,1024],[421,1170],[422,1037],[423,473],[451,563],[452,961],[453,220],[454,571],[455,1401],[456,1007],[457,129],[463,8],[464,12],[487,218],[488,1277],[489,1423],[490,897],[491,529],[492,498],[493,912],[494,1309],[495,1489],[496,1506],[497,1403],[498,1154],[499,707],[500,305],[501,24],[520,51],[521,680],[522,1301],[523,1521],[524,1521],[525,1560],[526,1521],[527,1521],[528,1521],[529,1521],[530,1560],[531,1521],[532,1521],[533,1445],[534,1180],[535,866],[536,712],[537,644],[538,560],[539,464],[540,156],[554,10],[555,368],[556,1174],[557,1560],[558,1521],[559,1521],[560,1521],[561,1521],[562,1560],[563,1066],[564,692],[565,421],[566,313],[567,378],[568,380],[569,302],[570,211],[571,205],[572,162],[588,353],[589,1600],[590,1530],[591,1101],[592,756],[593,1560],[594,1548],[595,1270],[596,129],[620,1006],[621,1560],[622,1365],[623,9],[624,33],[625,1398],[626,163],[627,157],[628,1198],[651,297],[652,1199],[653,221],[654,1226],[655,141],[656,300],[657,747],[659,45],[660,364]],"total":81830,"unreachable":45,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[358,483],[359,1896],[360,1972],[361,1546],[362,506],[390,485],[391,531],[392,10],[393,727],[394,1968],[395,1168],[396,218],[398,9],[399,438],[400,821],[401,928],[402,774],[403,396],[404,9],[426,477],[427,1670],[428,2103],[429,1800],[430,2086],[431,2116],[432,2070],[433,2116],[434,2070],[435,2165],[436,2136],[437,1389],[438,963],[439,534],[440,279],[441,192],[442,83],[443,7],[459,5],[460,495],[461,1290],[462,2336],[463,2127],[464,2025],[465,2185],[466,2224],[467,2205],[468,1896],[469,1402],[470,1138],[471,1137],[472,1176],[473,1056],[474,975],[475,886],[476,60],[494,1282],[495,2243],[496,2086],[497,1482],[498,2058],[499,2090],[500,1289],[501,3],[525,143],[526,1930],[527,2075],[528,744],[529,45],[530,1864],[531,246],[532,993],[533,847],[557,656],[558,924],[559,697],[560,732],[561,288],[562,751],[564,189],[565,117]],"total":89533,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[392,4664],[393,7733],[394,3714],[424,6566],[425,1502],[426,9537],[427,10276],[428,1579],[430,496],[431,3483],[432,4191],[433,3021],[434,378],[458,48],[459,5438],[460,12604],[461,12632],[462,15653],[463,14959],[464,14147],[465,16252],[466,14930],[467,11389],[468,8028],[469,5299],[470,4121],[471,3258],[472,921],[492,8],[493,1273],[494,12661],[495,10727],[496,7923],[497,8004],[498,7961],[499,2489],[500,1711],[501,2020],[502,1304],[503,222],[504,243],[525,1419],[526,6716],[527,7305],[528,219],[529,6991],[530,4041],[531,5679],[557,4166],[558,929],[559,5881],[560,1249],[561,3095],[562,380],[563,1771]],"total":303206,"metric":"rock-alpha-r1"},"stages":["art/wide-face/cobble.webp","art/wide-face/cobble.webp","art/wide-face/mamenshi-buried.webp","art/wide-face/mamenshi-buried.webp"],"waveOrder":["head","legs","tail","neck","body"],"groove":{"base":"#b2935b","inset":"#362c1b","light":"#e0d4bd"},"voice":{"file":"gallery-mamenshi.m4a","start":0.1021,"end":7.4219,"text":"小探险家，我是马门溪龙！我的脖子特别引人注意，你找到我的小脑袋了吗？"},"living":{"file":"../../assets/new30-mamenshi.webp","aspect":"1536/1024"},"card":{"title":"马门溪龙 · 侏罗纪 · 吃植物","text":"我的脖子特别特别长，能够到高高的树叶。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.mamenshi.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"长脖子探索家，已经在石板上站好啦","eyebrow":"一块新化石","journey":{"route":"waterfall","name":"瀑布岩台","sample":"g2-share","firstLevel":79,"stand":2},"camp":"瀑布岩台","nickname":"长脖子探索家","location":{"id":"g1-j3","name":"一年级 · 侏罗纪第3站"}},"ptero":{"id":"ptero","name":"翼龙","latinName":"Pterosauria","isDinosaur":false,"era":"any","eraLabel":"三叠纪至白垩纪","bodyClass":"会飞的","rock":"cobble","template":"ptero","art":{"mode":"cut","geometry":{"x":-0.34442006269592473,"y":-0.34985893416927877,"scale":1.6117241379310343},"skeletonSize":[1254,1254],"interior":[[0.29435562298206713,0.3628778153810245],[0.7534912669700861,0.3628778153810245],[0.7969230170770608,0.42802544054148667],[0.7969230170770608,0.6203660481580892],[0.7534912669700861,0.6451841910763605],[0.29435562298206713,0.6327751196172248],[0.2509238728750924,0.58934336951025],[0.2509238728750924,0.42802544054148667]],"parts":[{"id":"head","label":"头","box":[608.711,469.1955,780.2833,585.5281],"file":"fossils/ptero/bone-head.webp","coverage":[[270,2586],[271,1735],[272,3],[302,252],[303,3937],[304,2326],[335,3009],[336,4148],[337,2339],[338,134],[367,2039],[368,4248],[369,3903],[370,3866],[371,1553],[372,52],[400,203],[401,939],[402,1833],[403,2706],[404,2612]]},{"id":"wingL","label":"左翅","box":[338.0,498.4616,639.0745,640.4019],"file":"fossils/ptero/bone-wingL.webp","coverage":[[292,231],[293,1342],[294,2116],[295,2410],[296,2334],[297,1321],[298,343],[299,1078],[322,75],[323,1587],[324,1754],[325,747],[326,40],[328,131],[329,1055],[330,2645],[331,4397],[332,132],[363,1723],[364,1151],[395,80],[396,2536],[428,2696],[429,813],[430,1414],[431,755],[460,1884],[461,4040],[462,2492],[463,273],[492,95],[493,73]]},{"id":"wingR","label":"右翅","box":[687.7294,548.2139,976.0,665.6439],"file":"fossils/ptero/bone-wingR.webp","coverage":[[374,1209],[375,1773],[376,91],[405,1743],[406,3791],[407,3236],[408,2187],[409,748],[433,809],[435,93],[436,2331],[437,1945],[438,28],[440,116],[441,1426],[442,2205],[443,407],[465,1587],[466,2678],[467,3430],[468,1129],[474,79],[475,1888],[476,666],[498,1725],[499,1258],[508,1658],[509,57],[540,70],[541,38]]},{"id":"body","label":"身体","box":[561.1537,545.2873,708.9472,798.8045],"file":"fossils/ptero/bone-body.webp","coverage":[[367,1044],[368,82],[399,2324],[400,1247],[431,2940],[432,3263],[433,1044],[462,841],[463,4149],[464,4286],[465,1192],[494,2780],[495,4371],[496,3766],[497,113],[526,1701],[527,4036],[528,1663],[557,2048],[558,3180],[559,4188],[560,2444],[561,159],[589,3180],[590,818],[591,2179],[592,1755],[593,2148],[620,676],[621,2510],[622,449],[623,808],[624,700],[625,1931],[652,2938],[653,1559],[656,915],[657,3258],[658,22],[684,93],[685,83],[688,488],[689,1995],[690,81]]}],"bowl":"art/wide-face/cobble.webp","sand":{"file":"art/wide-face/ptero-buried.webp","full":true},"skeleton":{"file":"art/fossils/ptero/skeleton.webp","box":[338,469.1955275229358,976,798.8044724770642]}},"area":{"grid":32,"weights":[[270,2586],[271,1735],[272,3],[292,231],[293,1342],[294,2116],[295,2410],[296,2334],[297,1321],[298,343],[299,1078],[302,252],[303,3937],[304,2326],[322,75],[323,1587],[324,1754],[325,747],[326,40],[328,131],[329,1055],[330,2645],[331,4397],[332,132],[335,3009],[336,4148],[337,2339],[338,134],[363,1723],[364,1151],[367,3083],[368,4330],[369,3903],[370,3866],[371,1553],[372,52],[374,1209],[375,1773],[376,91],[395,80],[396,2536],[399,2324],[400,1450],[401,939],[402,1833],[403,2706],[404,2612],[405,1743],[406,3791],[407,3236],[408,2187],[409,748],[428,2696],[429,813],[430,1414],[431,3695],[432,3263],[433,1853],[435,93],[436,2331],[437,1945],[438,28],[440,116],[441,1426],[442,2205],[443,407],[460,1884],[461,4040],[462,3333],[463,4422],[464,4286],[465,2779],[466,2678],[467,3430],[468,1129],[474,79],[475,1888],[476,666],[492,95],[493,73],[494,2780],[495,4371],[496,3766],[497,113],[498,1725],[499,1258],[508,1658],[509,57],[526,1701],[527,4036],[528,1663],[540,70],[541,38],[557,2048],[558,3180],[559,4188],[560,2444],[561,159],[589,3180],[590,818],[591,2179],[592,1755],[593,2148],[620,676],[621,2510],[622,449],[623,808],[624,700],[625,1931],[652,2938],[653,1559],[656,915],[657,3258],[658,22],[684,93],[685,83],[688,488],[689,1995],[690,81]],"total":210034,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[367,11],[394,143],[395,323],[396,120],[397,7],[398,2],[399,292],[400,1028],[401,71],[424,110],[425,541],[426,426],[427,276],[428,489],[429,948],[430,516],[432,1126],[433,1209],[434,254],[462,677],[464,1012],[465,1521],[466,1535],[467,903],[468,893],[469,1042],[470,300],[494,711],[495,741],[496,1434],[497,1521],[498,1560],[499,1215],[500,196],[502,268],[503,560],[504,117],[526,187],[527,626],[528,1521],[529,727],[530,926],[531,108],[536,393],[558,2],[559,523],[560,1455],[561,151],[590,78],[591,856],[592,903],[593,909],[622,653],[623,334],[624,104],[625,863],[626,2],[654,14],[657,329],[658,4]],"total":35766,"unreachable":0,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[333,367],[334,256],[358,102],[359,532],[360,672],[361,727],[362,563],[363,475],[364,50],[365,140],[366,1209],[367,349],[390,427],[391,154],[394,171],[395,841],[396,366],[398,1145],[399,1334],[400,702],[401,84],[402,24],[403,252],[404,2],[427,45],[428,763],[429,6],[430,1208],[431,1537],[432,1538],[433,1425],[434,1032],[435,1018],[436,730],[437,273],[460,891],[461,1109],[462,1369],[463,1400],[464,1443],[465,1140],[466,184],[468,9],[469,408],[470,595],[471,6],[492,182],[493,615],[494,1332],[495,605],[496,728],[497,154],[502,162],[503,287],[524,68],[525,806],[526,1328],[527,194],[556,338],[557,890],[558,856],[559,970],[588,866],[589,278],[590,154],[591,905],[592,1],[620,160],[621,2],[623,551],[624,41]],"total":41546,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[330,58],[331,1613],[332,1501],[334,13],[335,603],[336,7004],[337,942],[361,2180],[362,3403],[363,2146],[364,2639],[365,4670],[366,6699],[368,5656],[369,9049],[370,1845],[398,4227],[399,210],[400,4742],[401,6757],[402,7719],[403,4978],[404,5760],[405,7432],[406,2035],[430,1766],[431,7262],[432,10178],[433,9613],[434,3042],[435,5568],[436,1422],[438,1656],[439,3832],[440,427],[462,126],[463,1486],[464,11865],[465,5988],[466,4512],[467,742],[471,25],[472,2416],[495,3381],[496,10083],[497,3293],[527,5119],[528,3904],[529,5414],[558,1643],[559,3920],[561,6454],[562,727],[593,289]],"total":210034,"metric":"rock-alpha-r1"},"stages":["art/wide-face/cobble.webp","art/wide-face/cobble.webp","art/wide-face/ptero-buried.webp","art/wide-face/ptero-buried.webp"],"waveOrder":["head","wingL","wingR","body"],"groove":{"base":"#b2935b","inset":"#362c1b","light":"#e0d4bd"},"voice":{"file":"gallery-ptero.m4a","start":0.1021,"end":6.211,"text":"小探险家，抬头看，我是翼龙，今天也来加入你的小岛伙伴队伍啦！"},"living":{"file":"../../assets/ptero-3d.webp","aspect":"1374/1145"},"card":{"title":"翼龙 · 会飞的伙伴","text":"翼龙是会飞的爬行动物，它们和恐龙是远房亲戚。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.ptero.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"展开膜翼的伙伴，已经在石板上站好啦","eyebrow":"一块新化石","journey":null,"camp":null,"nickname":"展开膜翼的伙伴","location":{"id":"g1-j6","name":"一年级 · 侏罗纪第6站"}},"stego":{"id":"stego","name":"剑龙","latinName":"Stegosaurus","isDinosaur":true,"era":"jurassic","eraLabel":"侏罗纪","bodyClass":"披甲的","rock":"mud","template":"armored","art":{"mode":"cut","geometry":{"x":-0.17435022564786595,"y":-0.1499106191750042,"scale":1.3192436551675881},"skeletonSize":[1254,1254],"interior":[[0.2307005415229405,0.2917661325618486],[0.7916280071213975,0.2917661325618486],[0.844688713326657,0.3713571918697378],[0.844688713326657,0.6063403193501725],[0.7916280071213975,0.6366607228960349],[0.2307005415229405,0.6215005211231038],[0.17763983531768104,0.5684398149178443],[0.17763983531768104,0.3713571918697378]],"parts":[{"id":"head","label":"头","box":[942.7799,607.7992,1020.0,670.8179],"file":"fossils/stego/bone-head.webp","coverage":[[506,684],[507,607],[538,3616],[539,4165],[540,1324],[570,1305],[571,2517],[572,1913]]},{"id":"hindlegs","label":"后腿","box":[455.9379,574.9584,617.0351,786.2043],"file":"fossils/stego/bone-hindlegs.webp","coverage":[[460,1297],[461,722],[491,767],[492,4392],[493,3608],[494,18],[523,1926],[524,2734],[525,2547],[526,1488],[554,119],[555,3882],[556,1378],[557,2531],[558,3484],[586,995],[587,3871],[588,279],[589,2870],[590,2887],[618,3119],[619,1639],[621,3510],[622,1724],[649,290],[650,3878],[651,2230],[652,51],[653,4175],[654,2910],[655,27],[684,42],[685,1764],[686,2462],[687,189]]},{"id":"forelegs","label":"前腿","box":[688.9297,590.935,843.8138,788.8671],"file":"fossils/stego/bone-forelegs.webp","coverage":[[499,1236],[500,3370],[501,1046],[530,1355],[531,4369],[532,4481],[533,528],[561,77],[562,3981],[563,2771],[564,3975],[565,106],[593,1017],[594,4488],[595,887],[596,4361],[597,1018],[625,70],[626,4330],[627,162],[628,2130],[629,2724],[657,478],[658,4489],[659,1732],[660,994],[661,4404],[662,1269],[689,603],[690,2945],[691,2694],[692,410],[693,2341],[694,1481]]},{"id":"tail","label":"尾巴","box":[262.0,523.0345,490.9977,645.9655],"file":"fossils/stego/bone-tail.webp","coverage":[[394,94],[424,264],[425,2266],[426,3591],[452,297],[453,428],[454,956],[455,1481],[456,4192],[457,4209],[458,3814],[483,618],[484,2082],[485,1837],[486,3585],[487,4244],[488,4295],[489,3472],[490,1970],[515,1472],[516,3665],[517,3729],[518,3296],[519,2398],[520,1063],[521,98]]},{"id":"plates","label":"骨板","box":[345.877,380.1329,918.815,606.4678],"file":"fossils/stego/bone-plates.webp","coverage":[[268,655],[269,3943],[270,2056],[271,99],[272,253],[273,1825],[300,1445],[301,4489],[302,4489],[303,3026],[304,2697],[305,4489],[306,1902],[308,1297],[329,946],[330,3769],[331,2845],[332,1399],[333,4371],[334,4489],[335,4185],[336,2844],[337,4489],[338,4147],[339,1941],[340,4486],[341,753],[361,469],[362,4427],[363,4489],[364,2579],[365,1033],[366,2264],[367,1372],[368,428],[369,1921],[370,1536],[371,3707],[372,4489],[373,2021],[374,187],[375,10],[392,3193],[393,3781],[394,1995],[395,1250],[396,27],[403,395],[404,2816],[405,2356],[406,4135],[407,490],[423,1635],[424,1944],[425,1815],[426,48],[437,2274],[438,4158],[439,2488],[440,586],[454,987],[455,879],[456,45],[470,178],[471,1110],[472,1554],[473,11],[504,286],[505,193]]},{"id":"body","label":"身体","box":[460.8197,480.4303,945.4426,659.7231],"file":"fossils/stego/bone-body.webp","coverage":[[364,213],[365,468],[366,2056],[367,2282],[368,1830],[369,1938],[370,850],[371,86],[394,33],[395,2899],[396,4099],[397,4470],[398,4489],[399,4422],[400,4430],[401,4413],[402,4247],[403,3135],[404,1296],[426,435],[427,4489],[428,4489],[429,4489],[430,4035],[431,3676],[432,3732],[433,4123],[434,4393],[435,4464],[436,3921],[437,1135],[438,30],[458,469],[459,3640],[460,3025],[461,3645],[462,2880],[463,2974],[464,2951],[465,2692],[466,3371],[467,4411],[468,4489],[469,4246],[470,2717],[471,3089],[472,450],[490,411],[491,2970],[492,91],[493,29],[494,1317],[495,2751],[496,2555],[497,2979],[498,3381],[499,3072],[500,1119],[501,3259],[502,4489],[503,3314],[504,3605],[505,1444],[506,102],[521,17],[522,1882],[523,471],[526,80],[527,1394],[528,2384],[529,2853],[530,3032],[531,120],[533,1064],[534,3288],[535,4343],[536,4482],[537,4405],[538,848],[560,428],[561,529],[562,118],[567,172],[568,754],[569,499],[570,90]]}],"bowl":"art/wide-face/mud.webp","sand":{"file":"art/wide-face/stego-buried.webp","full":true},"skeleton":{"file":"art/fossils/stego/skeleton.webp","box":[262,380.13290398126463,1020,788.8670960187353]}},"area":{"grid":32,"weights":[[268,655],[269,3943],[270,2056],[271,99],[272,253],[273,1825],[300,1445],[301,4489],[302,4489],[303,3026],[304,2697],[305,4489],[306,1902],[308,1297],[329,946],[330,3769],[331,2845],[332,1399],[333,4371],[334,4489],[335,4185],[336,2844],[337,4489],[338,4147],[339,1941],[340,4486],[341,753],[361,469],[362,4427],[363,4489],[364,2792],[365,1501],[366,4320],[367,3654],[368,2258],[369,3859],[370,2386],[371,3793],[372,4489],[373,2021],[374,187],[375,10],[392,3193],[393,3781],[394,2122],[395,4149],[396,4126],[397,4470],[398,4489],[399,4422],[400,4430],[401,4413],[402,4247],[403,3530],[404,4112],[405,2356],[406,4135],[407,490],[423,1635],[424,2208],[425,4081],[426,4074],[427,4489],[428,4489],[429,4489],[430,4035],[431,3676],[432,3732],[433,4123],[434,4393],[435,4464],[436,3921],[437,3409],[438,4188],[439,2488],[440,586],[452,297],[453,428],[454,1943],[455,2360],[456,4237],[457,4209],[458,4283],[459,3640],[460,4322],[461,4367],[462,2880],[463,2974],[464,2951],[465,2692],[466,3371],[467,4411],[468,4489],[469,4246],[470,2895],[471,4199],[472,2004],[473,11],[483,618],[484,2082],[485,1837],[486,3585],[487,4244],[488,4295],[489,3472],[490,2381],[491,3737],[492,4483],[493,3637],[494,1335],[495,2751],[496,2555],[497,2979],[498,3381],[499,4308],[500,4489],[501,4305],[502,4489],[503,3314],[504,3891],[505,1637],[506,786],[507,607],[515,1472],[516,3665],[517,3729],[518,3296],[519,2398],[520,1063],[521,115],[522,1882],[523,2397],[524,2734],[525,2547],[526,1568],[527,1394],[528,2384],[529,2853],[530,4387],[531,4489],[532,4481],[533,1592],[534,3288],[535,4343],[536,4482],[537,4405],[538,4464],[539,4165],[540,1324],[554,119],[555,3882],[556,1378],[557,2531],[558,3484],[560,428],[561,606],[562,4099],[563,2771],[564,3975],[565,106],[567,172],[568,754],[569,499],[570,1395],[571,2517],[572,1913],[586,995],[587,3871],[588,279],[589,2870],[590,2887],[593,1017],[594,4488],[595,887],[596,4361],[597,1018],[618,3119],[619,1639],[621,3510],[622,1724],[625,70],[626,4330],[627,162],[628,2130],[629,2724],[649,290],[650,3878],[651,2230],[652,51],[653,4175],[654,2910],[655,27],[657,478],[658,4489],[659,1732],[660,994],[661,4404],[662,1269],[684,42],[685,1764],[686,2462],[687,189],[689,603],[690,2945],[691,2694],[692,410],[693,2341],[694,1481]],"total":568821,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[301,27],[302,325],[303,1],[305,6],[333,240],[334,1521],[335,1122],[336,388],[337,1257],[338,114],[339,65],[363,435],[364,1014],[365,678],[366,1521],[367,1521],[368,1489],[369,1521],[370,1010],[371,1279],[372,324],[394,187],[395,758],[396,1521],[397,1560],[398,1521],[399,1521],[400,1521],[401,1521],[402,1560],[403,1521],[404,730],[405,269],[425,31],[426,842],[427,1560],[428,1560],[429,1600],[430,1560],[431,1560],[432,1560],[433,1560],[434,1600],[435,1560],[436,1503],[437,1094],[438,193],[455,27],[456,115],[457,858],[458,1516],[459,1521],[460,1521],[461,1560],[462,1521],[463,1521],[464,1521],[465,1521],[466,1560],[467,1521],[468,1521],[469,1521],[470,933],[471,76],[486,66],[487,948],[488,954],[489,1520],[490,1475],[491,1297],[492,1496],[493,1560],[494,1521],[495,1521],[496,1521],[497,1521],[498,1560],[499,1521],[500,1521],[501,1521],[502,1521],[503,972],[504,685],[505,133],[518,104],[519,657],[520,555],[521,360],[522,63],[523,49],[524,376],[525,1557],[526,1521],[527,619],[528,810],[529,1356],[530,1560],[531,1521],[532,375],[533,624],[534,879],[535,911],[536,1353],[537,1321],[538,4],[556,924],[557,767],[558,1230],[559,485],[561,511],[562,1508],[563,1474],[564,356],[569,92],[587,110],[588,1351],[589,4],[590,1343],[591,232],[593,361],[594,1072],[595,514],[596,966],[619,143],[620,783],[621,10],[622,1335],[623,701],[625,486],[626,1496],[627,391],[628,1444],[629,329],[654,23],[655,54],[657,1],[658,98],[660,7]],"total":130175,"unreachable":96,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[237,211],[238,455],[239,19],[240,1],[241,115],[269,614],[270,1369],[271,1070],[272,554],[273,1270],[274,215],[275,96],[276,68],[299,903],[300,1103],[301,886],[302,1369],[303,1332],[304,1369],[305,1369],[306,1025],[307,1120],[308,654],[329,18],[330,324],[331,1123],[332,1651],[333,1484],[334,1517],[335,1476],[336,1517],[337,1447],[338,1332],[339,1369],[340,1007],[341,308],[361,105],[362,1311],[363,1296],[364,1481],[365,1380],[366,1332],[367,1296],[368,1332],[369,1402],[370,1440],[371,1480],[372,1442],[373,1328],[374,148],[391,8],[392,220],[393,1195],[394,1340],[395,1481],[396,1647],[397,1517],[398,1517],[399,1477],[400,1369],[401,1462],[402,1476],[403,1517],[404,1527],[405,1698],[406,1416],[407,144],[422,543],[423,597],[424,1298],[425,1369],[426,1369],[427,1480],[428,1369],[429,1369],[430,1369],[431,1480],[432,1369],[433,1517],[434,1332],[435,1369],[436,1369],[437,1443],[438,1577],[439,1090],[440,352],[441,241],[453,18],[454,968],[455,989],[456,892],[457,647],[458,281],[459,508],[460,858],[461,1369],[462,1369],[463,813],[464,1265],[465,1517],[466,1332],[467,1369],[468,932],[469,1000],[470,1377],[471,1321],[472,1340],[473,1321],[474,502],[492,1171],[493,971],[494,1332],[495,408],[496,8],[497,767],[498,1296],[499,1332],[500,539],[504,151],[505,511],[506,299],[523,311],[524,1093],[525,87],[526,1362],[527,105],[529,440],[530,1135],[531,784],[532,938],[555,816],[556,954],[557,290],[558,1369],[559,240],[561,439],[562,1269],[563,212],[564,1347],[565,344],[587,47],[588,85],[589,121],[590,794],[591,423],[593,342],[594,890],[595,368],[596,727],[597,477]],"total":142028,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[238,762],[270,8478],[271,6807],[272,2549],[273,6127],[274,62],[275,395],[300,6308],[301,4464],[302,7784],[303,9801],[304,6707],[305,9801],[306,5073],[307,7747],[330,10],[331,3955],[332,6582],[333,9686],[334,5605],[335,9483],[336,7734],[337,8586],[338,6757],[339,9372],[340,3327],[341,675],[362,2637],[363,6889],[364,8400],[365,9657],[366,9801],[367,8703],[368,8236],[369,9049],[370,9549],[371,7516],[372,9035],[373,4646],[391,103],[392,1558],[393,3764],[394,6981],[395,9406],[396,8142],[397,8148],[398,8655],[399,5474],[400,6156],[401,6077],[402,8875],[403,9702],[404,8207],[405,7325],[406,3388],[423,614],[424,6858],[425,6899],[426,6013],[427,2852],[428,2754],[429,7451],[430,5593],[431,3095],[432,4766],[433,7207],[434,9196],[435,8082],[436,6170],[437,9179],[438,8929],[439,8631],[440,4856],[460,1006],[461,7286],[462,4365],[463,4814],[464,218],[465,4007],[466,6146],[467,6949],[469,57],[470,275],[471,1407],[472,2998],[492,4542],[493,2382],[494,5194],[495,2455],[497,3600],[498,3614],[499,6527],[500,994],[524,4226],[525,1747],[526,6019],[527,5042],[529,4283],[530,7291],[531,4042],[532,6447],[558,11],[559,92],[561,158],[562,721],[564,45]],"total":568821,"metric":"rock-alpha-r1"},"stages":["art/wide-face/mud.webp","art/wide-face/mud.webp","art/wide-face/stego-buried.webp","art/wide-face/stego-buried.webp"],"waveOrder":["head","hindlegs","forelegs","tail","plates","body"],"groove":{"base":"#a58f66","inset":"#312b1f","light":"#dbd2c2"},"voice":{"file":"gallery-stego.m4a","start":0.1021,"end":5.9115,"text":"你好呀，我是剑龙，把我的名字收进你的探险口袋，我们就认识啦！"},"living":{"file":"../../assets/stego-3d.webp","aspect":"1536/1024"},"card":{"title":"剑龙 · 侏罗纪 · 吃植物","text":"背上的骨板像一列小山，尾巴末端还有尖刺。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.stego.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"背着骨板的伙伴，已经在石板上站好啦","eyebrow":"一块新化石","journey":null,"camp":null,"nickname":"背着骨板的伙伴","location":{"id":"g1-j1","name":"一年级 · 侏罗纪第1站"}},"parasaur":{"id":"parasaur","name":"副栉龙","latinName":"Parasaurolophus","isDinosaur":true,"era":"cretaceous","eraLabel":"白垩纪","bodyClass":"鸭嘴的","rock":"mud","template":"duckbill","art":{"mode":"cut","geometry":{"x":-0.05148834826472426,"y":-0.047247870431266825,"scale":1.0643303849527583},"skeletonSize":[1254,1254],"interior":[[0.17051880772226555,0.26518821074885945],[0.8657916388487074,0.26518821074885945],[0.9315606904417492,0.3638417881384222],[0.9315606904417492,0.6551047309076072],[0.8657916388487074,0.6926870461036312],[0.17051880772226555,0.6738958885056192],[0.10474975612922374,0.6081268369125774],[0.10474975612922374,0.3638417881384222]],"parts":[{"id":"head","label":"头","box":[211.1332,350.2191,522.5763,574.2022],"file":"fossils/parasaur/bone-head.webp","coverage":[[264,767],[265,2884],[266,4186],[267,4520],[268,1700],[294,34],[295,2388],[296,4678],[297,3167],[298,547],[299,674],[300,319],[325,59],[326,3086],[327,4750],[328,4133],[329,107],[357,2821],[358,4761],[359,4702],[360,1617],[388,1799],[389,4761],[390,4761],[391,4761],[392,1865],[420,3657],[421,2939],[422,1434],[423,945],[424,6],[452,18]]},{"id":"legs","label":"腿","box":[381.7869,545.4044,821.2203,856.8475],"file":"fossils/parasaur/bone-legs.webp","coverage":[[432,63],[433,2675],[434,1604],[457,1],[464,2098],[465,4325],[466,4546],[467,308],[489,812],[490,3689],[491,673],[495,1036],[496,3268],[497,1766],[498,2633],[499,2605],[500,33],[521,112],[522,3254],[523,2235],[524,2782],[525,5],[527,3956],[528,2332],[529,2928],[530,947],[531,1197],[532,1930],[554,3216],[555,1803],[556,3924],[557,102],[559,2636],[560,2508],[561,3177],[562,3319],[563,4],[585,1904],[586,2129],[587,2446],[588,1433],[591,767],[592,3562],[593,101],[594,2727],[595,2571],[596,25],[616,307],[617,4220],[618,216],[619,3920],[620,354],[623,1337],[624,4057],[626,22],[627,4166],[628,645],[648,53],[649,354],[650,508],[651,2030],[652,32],[654,1883],[655,4349],[656,1288],[658,60],[659,3954],[660,131],[686,1052],[687,1486],[690,2051],[691,1809]]},{"id":"tail","label":"尾巴","box":[841.4855,576.3354,1088.4001,677.661],"file":"fossils/parasaur/bone-tail.webp","coverage":[[469,2124],[470,893],[501,2914],[502,4330],[503,2825],[504,1216],[505,241],[506,14],[507,665],[533,527],[534,1646],[535,2837],[536,3672],[537,3593],[538,2752],[539,764]]},{"id":"neck","label":"脖子","box":[370.5878,448.8783,475.1132,589.6677],"file":"fossils/parasaur/bone-neck.webp","coverage":[[328,490],[329,177],[360,2607],[361,2149],[392,1941],[393,3976],[394,758],[395,3],[424,578],[425,4301],[426,4366],[427,902],[457,477],[458,1193],[459,374]]},{"id":"body","label":"身体","box":[399.9189,475.543,856.4177,664.862],"file":"fossils/parasaur/bone-body.webp","coverage":[[364,819],[365,1445],[366,1721],[367,1816],[368,1261],[369,424],[394,535],[395,3038],[396,4132],[397,4301],[398,4420],[399,4359],[400,4424],[401,4519],[402,3342],[403,1190],[404,11],[427,3668],[428,3604],[429,2877],[430,2489],[431,2361],[432,3856],[433,2086],[434,2898],[435,4574],[436,2680],[437,317],[457,669],[458,2587],[459,3510],[460,2662],[461,2157],[462,2485],[463,1058],[464,1691],[466,204],[467,3458],[468,4510],[469,1512],[489,2274],[490,1065],[491,1764],[492,2071],[493,2451],[494,1432],[499,323],[500,2195],[501,1043],[521,135],[523,182],[524,696],[525,770],[533,72]]}],"bowl":"art/wide-face/mud.webp","sand":{"file":"art/wide-face/parasaur-buried.webp","full":true},"skeleton":{"file":"art/fossils/parasaur/skeleton.webp","box":[209,349.1525423728814,1090,856.8474576271186]}},"area":{"grid":32,"weights":[[264,767],[265,2884],[266,4186],[267,4520],[268,1700],[294,34],[295,2388],[296,4678],[297,3167],[298,547],[299,674],[300,319],[325,59],[326,3086],[327,4750],[328,4623],[329,284],[357,2821],[358,4761],[359,4702],[360,4224],[361,2149],[364,819],[365,1445],[366,1721],[367,1816],[368,1261],[369,424],[388,1799],[389,4761],[390,4761],[391,4761],[392,3806],[393,3976],[394,1293],[395,3041],[396,4132],[397,4301],[398,4420],[399,4359],[400,4424],[401,4519],[402,3342],[403,1190],[404,11],[420,3657],[421,2939],[422,1434],[423,945],[424,584],[425,4301],[426,4366],[427,4570],[428,3604],[429,2877],[430,2489],[431,2361],[432,3919],[433,4761],[434,4502],[435,4574],[436,2680],[437,317],[452,18],[457,1147],[458,3780],[459,3884],[460,2662],[461,2157],[462,2485],[463,1058],[464,3789],[465,4325],[466,4750],[467,3766],[468,4510],[469,3636],[470,893],[489,3086],[490,4754],[491,2437],[492,2071],[493,2451],[494,1432],[495,1036],[496,3268],[497,1766],[498,2633],[499,2928],[500,2228],[501,3957],[502,4330],[503,2825],[504,1216],[505,241],[506,14],[507,665],[521,247],[522,3254],[523,2417],[524,3478],[525,775],[527,3956],[528,2332],[529,2928],[530,947],[531,1197],[532,1930],[533,599],[534,1646],[535,2837],[536,3672],[537,3593],[538,2752],[539,764],[554,3216],[555,1803],[556,3924],[557,102],[559,2636],[560,2508],[561,3177],[562,3319],[563,4],[585,1904],[586,2129],[587,2446],[588,1433],[591,767],[592,3562],[593,101],[594,2727],[595,2571],[596,25],[616,307],[617,4220],[618,216],[619,3920],[620,354],[623,1337],[624,4057],[626,22],[627,4166],[628,645],[648,53],[649,354],[650,508],[651,2030],[652,32],[654,1883],[655,4349],[656,1288],[658,60],[659,3954],[660,131],[686,1052],[687,1486],[690,2051],[691,1809]],"total":382745,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[267,39],[268,107],[297,405],[298,1097],[299,1486],[300,1502],[301,346],[327,53],[328,965],[329,1521],[330,885],[331,176],[332,51],[358,44],[359,1144],[360,1521],[361,1518],[362,245],[390,984],[391,1560],[392,1521],[393,1521],[394,952],[396,306],[397,875],[398,1118],[399,1220],[400,1113],[401,858],[402,429],[403,17],[421,637],[422,1560],[423,1600],[424,1443],[425,1019],[426,1530],[427,1184],[428,1557],[429,1600],[430,1560],[431,1560],[432,1560],[433,1560],[434,1600],[435,1336],[436,570],[437,5],[453,502],[454,668],[455,119],[457,55],[458,1127],[459,1521],[460,1521],[461,1560],[462,1521],[463,1521],[464,1515],[465,1521],[466,1560],[467,1521],[468,1521],[469,1043],[470,107],[490,1061],[491,1521],[492,1521],[493,1560],[494,1521],[495,773],[496,735],[497,1521],[498,1555],[499,1494],[500,1521],[501,1521],[502,1337],[503,480],[504,11],[507,2],[522,946],[523,1521],[524,1521],[525,1555],[526,689],[527,306],[528,1460],[529,1521],[530,1018],[531,408],[532,1495],[533,846],[534,1235],[535,1511],[536,1385],[537,989],[538,831],[539,481],[554,6],[555,1255],[556,1509],[557,1161],[559,297],[560,1521],[561,1520],[562,1370],[563,24],[564,247],[565,12],[567,48],[568,231],[569,203],[570,21],[586,398],[587,1065],[588,900],[589,501],[592,1206],[593,424],[594,1033],[595,843],[596,3],[617,86],[618,1316],[619,181],[620,1353],[621,26],[624,1068],[625,623],[626,6],[627,1101],[628,578],[649,9],[650,375],[651,239],[652,770],[654,74],[655,737],[656,1388],[657,116],[659,713],[660,566],[686,73],[687,835],[688,290],[690,227],[691,1077],[692,159]],"total":133999,"unreachable":0,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[236,18],[237,19],[265,17],[266,656],[267,1364],[268,1745],[269,1474],[296,161],[297,1346],[298,1872],[299,829],[300,188],[301,138],[327,163],[328,1506],[329,1764],[330,1800],[331,186],[335,7],[336,5],[358,31],[359,1342],[360,1722],[361,1722],[362,1845],[363,876],[364,220],[365,1070],[366,1432],[367,1655],[368,1645],[369,1411],[370,991],[371,363],[390,855],[391,1764],[392,1578],[393,1290],[394,1157],[395,1725],[396,1726],[397,1932],[398,1722],[399,1764],[400,1764],[401,1722],[402,1764],[403,1759],[404,1403],[405,202],[422,297],[423,433],[424,3],[426,118],[427,1519],[428,1806],[429,1952],[430,1722],[431,1788],[432,1729],[433,1886],[434,1932],[435,1932],[436,2027],[437,1607],[438,572],[458,154],[459,1807],[460,1848],[461,1791],[462,1681],[463,1284],[464,532],[465,1678],[466,1718],[467,1379],[468,1828],[469,1781],[470,1722],[471,1172],[472,447],[473,70],[474,66],[475,269],[490,6],[491,971],[492,1764],[493,1764],[494,1145],[495,5],[496,1561],[497,1722],[498,1696],[499,120],[500,1235],[501,609],[502,818],[503,1186],[504,1358],[505,1325],[506,955],[507,163],[523,389],[524,1537],[525,1631],[526,424],[528,1108],[529,1407],[530,1591],[531,788],[554,63],[555,1475],[556,554],[557,1286],[560,550],[561,1290],[562,142],[563,1399],[564,588],[586,448],[587,887],[588,815],[589,834],[591,27],[592,1075],[593,1082],[595,539],[596,1052],[620,198],[621,22],[623,1136],[624,1438],[625,157],[626,96],[627,1213],[628,781],[658,7],[659,234]],"total":144926,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[267,432],[268,4034],[269,6091],[270,2643],[298,2161],[299,8677],[300,4664],[301,881],[302,759],[329,2180],[330,9366],[331,9259],[332,2555],[334,260],[335,1653],[336,1632],[337,733],[360,855],[361,8819],[362,9716],[363,7614],[364,7052],[365,4755],[366,8259],[367,8511],[368,7916],[369,8914],[370,7372],[371,2927],[372,31],[392,1229],[393,3149],[394,205],[395,23],[396,5479],[397,8876],[398,6168],[399,4953],[400,4161],[401,8772],[402,9541],[403,9117],[404,5742],[405,514],[428,6082],[429,7588],[430,5214],[431,3978],[432,2178],[433,4670],[434,6464],[435,5555],[436,7057],[437,7625],[438,3864],[439,1407],[440,1131],[441,437],[460,554],[461,6043],[462,6719],[463,277],[464,5575],[465,4221],[466,5965],[467,1902],[468,819],[469,1698],[470,3754],[471,4349],[472,2336],[492,3593],[493,3777],[494,4307],[496,1887],[497,4554],[498,5175],[499,3056],[523,124],[524,5026],[525,4383],[526,1792],[528,3319],[529,4610],[531,6480],[557,669],[559,1430],[560,5756],[561,337],[562,1785],[563,4573]],"total":382745,"metric":"rock-alpha-r1"},"stages":["art/wide-face/mud.webp","art/wide-face/mud.webp","art/wide-face/parasaur-buried.webp","art/wide-face/parasaur-buried.webp"],"waveOrder":["head","legs","tail","neck","body"],"groove":{"base":"#a58f66","inset":"#312b1f","light":"#dbd2c2"},"voice":{"file":"gallery-parasaur.m4a","start":0.1021,"end":6.4062,"text":"你好，我是副栉龙，今天想把自己最特别的模样介绍给你，准备好了吗！"},"living":{"file":"../../assets/parasaur-3d.webp","aspect":"976/1000"},"card":{"title":"副栉龙 · 白垩纪 · 吃植物","text":"我头顶有一根长长的头冠。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.parasaur.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"戴长冠的鸭嘴伙伴，已经在石板上站好啦","eyebrow":"一块新化石","journey":null,"camp":null,"nickname":"戴长冠的鸭嘴伙伴","location":{"id":"g2-c1","name":"二年级 · 白垩纪第1站"}},"compso":{"id":"compso","name":"美颌龙","latinName":"Compsognathus","isDinosaur":true,"era":"jurassic","eraLabel":"侏罗纪","bodyClass":"小个子","rock":"mud","template":"small","art":{"mode":"cut","geometry":{"x":-0.1181941875635012,"y":-0.10026663676049058,"scale":1.1442295368334028},"skeletonSize":[1254,1254],"interior":[[0.21690943956084724,0.29300645191202107],[0.863632825191944,0.29300645191202107],[0.9248093616705612,0.384771256629947],[0.9248093616705612,0.6556959181781092],[0.863632825191944,0.6906539390230332],[0.21690943956084724,0.6731749286005713],[0.15573290308222995,0.611998392121954],[0.15573290308222995,0.384771256629947]],"parts":[{"id":"head","label":"头和脖子","box":[256.0,383.8691,447.4302,572.2687],"file":"fossils/compso/bone-head.webp","coverage":[[260,605],[261,2394],[262,3717],[263,2855],[264,192],[291,543],[292,3927],[293,4398],[294,4374],[295,3286],[296,1625],[324,1860],[325,1255],[326,240],[327,2742],[328,1900],[359,3441],[360,1851],[361,93],[391,2242],[392,4192],[393,752],[423,370],[424,791],[425,1]]},{"id":"tail","label":"尾巴","box":[675.7322,539.9428,1099.0,674.2975],"file":"fossils/compso/bone-tail.webp","coverage":[[399,23],[400,1173],[401,59],[431,45],[432,4217],[433,3842],[434,2473],[435,1372],[436,444],[437,8],[464,1081],[465,2577],[466,3190],[467,3501],[468,3350],[469,3105],[470,2732],[471,2328],[472,1932],[473,758],[497,18],[504,259],[505,1201],[506,1751],[507,1070],[539,308],[540,187]]},{"id":"body","label":"身体和腿","box":[384.2936,510.1423,717.1498,855.1207],"file":"fossils/compso/bone-body.webp","coverage":[[361,539],[362,950],[363,981],[364,863],[365,574],[366,53],[393,3727],[394,4568],[395,4470],[396,4457],[397,4408],[398,4354],[399,2875],[423,215],[424,2736],[425,3820],[426,2659],[427,2078],[428,2166],[429,2362],[430,4556],[431,3887],[432,78],[455,72],[456,4265],[457,4243],[458,2205],[459,2096],[460,1942],[461,3293],[462,2112],[463,2344],[464,692],[487,300],[488,1930],[489,3443],[490,3788],[491,3144],[492,3232],[493,4126],[494,80],[495,24],[496,1729],[519,1623],[520,2674],[521,395],[522,854],[523,1219],[524,3913],[525,3645],[526,2770],[527,3],[552,692],[556,1753],[557,988],[558,1587],[559,2707],[560,371],[588,1375],[589,2216],[591,1930],[592,1941],[619,286],[620,2896],[621,806],[623,779],[624,2124],[648,1],[649,833],[650,1575],[651,3528],[652,830],[655,1632],[656,2787],[657,128],[680,65],[681,1235],[682,2096],[683,343],[686,553],[687,2696],[688,351]]}],"bowl":"art/wide-face/mud.webp","sand":{"file":"art/wide-face/compso-buried.webp","full":true},"skeleton":{"file":"art/fossils/compso/skeleton.webp","box":[256,383.3639904134212,1099,856.6360095865789]}},"area":{"grid":32,"weights":[[260,605],[261,2394],[262,3717],[263,2855],[264,192],[291,543],[292,3927],[293,4398],[294,4374],[295,3286],[296,1625],[324,1860],[325,1255],[326,240],[327,2742],[328,1900],[359,3441],[360,1851],[361,632],[362,950],[363,981],[364,863],[365,574],[366,53],[391,2242],[392,4192],[393,4479],[394,4568],[395,4470],[396,4457],[397,4408],[398,4354],[399,2898],[400,1173],[401,59],[423,585],[424,3527],[425,3821],[426,2659],[427,2078],[428,2166],[429,2362],[430,4556],[431,3932],[432,4295],[433,3842],[434,2473],[435,1372],[436,444],[437,8],[455,72],[456,4265],[457,4243],[458,2205],[459,2096],[460,1942],[461,3293],[462,2112],[463,2344],[464,1773],[465,2577],[466,3190],[467,3501],[468,3350],[469,3105],[470,2732],[471,2328],[472,1932],[473,758],[487,300],[488,1930],[489,3443],[490,3788],[491,3144],[492,3232],[493,4126],[494,80],[495,24],[496,1729],[497,18],[504,259],[505,1201],[506,1751],[507,1070],[519,1623],[520,2674],[521,395],[522,854],[523,1219],[524,3913],[525,3645],[526,2770],[527,3],[539,308],[540,187],[552,692],[556,1753],[557,988],[558,1587],[559,2707],[560,371],[588,1375],[589,2216],[591,1930],[592,1941],[619,286],[620,2896],[621,806],[623,779],[624,2124],[648,1],[649,833],[650,1575],[651,3528],[652,830],[655,1632],[656,2787],[657,128],[680,65],[681,1235],[682,2096],[683,343],[686,553],[687,2696],[688,351]],"total":253286,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[296,291],[297,199],[326,114],[327,1054],[328,1521],[329,1492],[330,542],[358,412],[359,1555],[360,1335],[361,1331],[362,1108],[391,27],[393,646],[394,896],[425,543],[426,1437],[427,1177],[428,1304],[429,1393],[430,1345],[431,1201],[432,834],[433,344],[434,1],[457,105],[458,1412],[459,1521],[460,1521],[461,1560],[462,1521],[463,1521],[464,1521],[465,1521],[466,1318],[467,821],[468,434],[469,102],[490,1057],[491,1521],[492,1521],[493,1560],[494,1521],[495,1521],[496,1418],[497,1453],[498,1437],[499,1359],[500,1275],[501,1216],[502,1084],[503,914],[504,822],[505,540],[506,100],[521,36],[522,986],[523,1366],[524,1409],[525,1553],[526,1521],[527,1484],[528,240],[529,400],[530,69],[536,3],[537,192],[538,558],[539,552],[540,3],[553,166],[554,1160],[555,155],[556,17],[557,163],[558,1311],[559,1233],[560,335],[571,15],[572,4],[590,1016],[591,85],[592,898],[593,689],[621,93],[622,1223],[623,133],[624,75],[625,1028],[651,55],[652,290],[653,1223],[654,212],[656,62],[657,1242],[658,95],[683,595],[684,855],[685,265],[688,953],[689,480]],"total":83797,"unreachable":0,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[296,93],[297,987],[298,965],[299,82],[327,82],[328,1771],[329,2025],[330,2025],[331,1086],[360,743],[361,749],[362,1201],[363,1153],[394,929],[395,1778],[396,1228],[397,1353],[398,1355],[399,1224],[400,792],[401,182],[426,305],[427,1986],[428,2025],[429,2070],[430,2025],[431,2025],[432,2025],[433,2144],[434,1428],[435,831],[436,354],[437,34],[459,1624],[460,2025],[461,2070],[462,2025],[463,2025],[464,1886],[465,2103],[466,1741],[467,1694],[468,1557],[469,1489],[470,1269],[471,1143],[472,874],[473,219],[490,215],[491,1738],[492,1404],[493,1693],[494,1953],[495,2025],[496,509],[497,437],[498,8],[504,140],[505,711],[506,506],[522,151],[523,915],[526,1024],[527,1207],[528,1255],[529,176],[558,771],[559,857],[560,473],[561,1297],[589,444],[590,1404],[591,160],[592,61],[593,1652],[594,62],[619,111],[620,1138],[621,1293],[622,279],[624,1127],[625,891],[656,11]],"total":90897,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[267,1496],[268,2667],[269,43],[298,2808],[299,10966],[300,9590],[301,3660],[330,412],[331,770],[332,3886],[333,4038],[334,639],[335,786],[336,253],[364,2025],[365,10723],[366,11535],[367,10028],[368,10674],[369,9511],[370,4698],[371,806],[397,10437],[398,7427],[399,5605],[400,8413],[401,6558],[402,6852],[403,8634],[404,6574],[405,4867],[406,3952],[407,2992],[408,250],[428,1067],[429,5897],[430,6138],[431,8026],[432,10077],[433,450],[434,1204],[439,332],[440,2437],[441,464],[460,44],[461,1027],[463,1129],[464,4394],[465,6024],[466,927],[495,3713],[496,3028],[497,2588],[498,2758],[525,818],[526,5569],[527,3379],[529,5429],[530,1792]],"total":253286,"metric":"rock-alpha-r1"},"stages":["art/wide-face/mud.webp","art/wide-face/mud.webp","art/wide-face/compso-buried.webp","art/wide-face/compso-buried.webp"],"waveOrder":["head","tail","body"],"groove":{"base":"#a58f66","inset":"#312b1f","light":"#dbd2c2"},"voice":{"file":"gallery-compso.m4a","start":0.1021,"end":7.5781,"text":"喂，小伙伴，我在这里，我是美颌龙，个头小也能成为你很特别的探险朋友！"},"living":{"file":"../../assets/compso-3d.webp","aspect":"1374/1145"},"card":{"title":"美颌龙 · 侏罗纪 · 吃小动物","text":"我个子小小的，尾巴长长的，跑得很快。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.compso.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"长尾巴的小个伙伴，已经在石板上站好啦","eyebrow":"一块新化石","journey":null,"camp":null,"nickname":"长尾巴的小个伙伴","location":{"id":"g1-j4","name":"一年级 · 侏罗纪第4站"}},"allo":{"id":"allo","name":"异特龙","latinName":"Allosaurus","isDinosaur":true,"era":"jurassic","eraLabel":"侏罗纪","bodyClass":"吃肉的","rock":"sandstone","template":"biped","art":{"mode":"cut","geometry":{"x":-0.10775856521313354,"y":-0.09756627635315679,"scale":1.1508288915935703},"skeletonSize":[1254,1254],"interior":[[0.20659766795036372,0.2889797769090131],[0.8496124596413428,0.2889797769090131],[0.9104381831796787,0.38021836221651695],[0.9104381831796787,0.6495894236005757],[0.8496124596413428,0.6843469799081963],[0.20659766795036372,0.666968201754386],[0.14577194441202784,0.60614247821605],[0.14577194441202784,0.38021836221651695]],"parts":[{"id":"head","label":"头","box":[215.4875,397.0596,403.9086,562.6717],"file":"fossils/allo/bone-head.webp","coverage":[[261,29],[262,1198],[263,1814],[264,279],[291,1010],[292,3080],[293,3429],[294,4690],[295,4761],[296,1725],[322,164],[323,4501],[324,4761],[325,4055],[326,4646],[327,4761],[328,1704],[354,9],[355,2142],[356,2134],[357,1716],[358,4215],[359,4483],[360,1338],[387,1361],[388,4106],[389,3483],[390,1886],[391,1008],[392,11],[419,302],[420,1182],[421,15]]},{"id":"legs","label":"腿","box":[539.7701,544.3255,823.8892,828.9404],"file":"fossils/allo/bone-legs.webp","coverage":[[400,61],[401,163],[432,2061],[433,4443],[434,441],[463,256],[464,3013],[465,3343],[466,2272],[495,2696],[496,1744],[497,2773],[498,1159],[499,617],[527,3670],[528,420],[529,3715],[530,1918],[531,207],[559,3120],[561,322],[562,2927],[563,1709],[564,1],[590,372],[591,4294],[592,24],[594,90],[595,4281],[596,487],[621,45],[622,2947],[623,2292],[627,3972],[628,1363],[652,975],[653,3569],[654,3688],[655,521],[657,221],[658,2620],[659,3829],[660,549],[685,119],[686,14],[689,20],[690,173],[691,69]]},{"id":"tail","label":"尾巴","box":[767.3629,523.0042,1109.0,639.0319],"file":"fossils/allo/bone-tail.webp","coverage":[[403,2177],[404,977],[405,26],[435,4041],[436,4488],[437,3843],[438,2157],[439,891],[440,30],[467,2433],[468,4038],[469,4467],[470,4590],[471,4547],[472,3993],[473,2791],[474,1756],[475,900],[476,125],[499,1],[500,720],[501,1375],[502,1866],[503,2013],[504,2048],[505,2029],[506,1957],[507,1899],[508,1713],[509,78]]},{"id":"neck","label":"脖子","box":[400.9335,403.0097,493.1607,571.597],"file":"fossils/allo/bone-neck.webp","coverage":[[264,445],[265,75],[296,2907],[297,3531],[298,244],[328,2977],[329,4685],[330,2240],[360,2759],[361,4616],[362,4057],[392,1653],[393,4556],[394,4518],[424,3],[425,731],[426,1526]]},{"id":"body","label":"身体","box":[399.9418,478.3781,770.338,724.813],"file":"fossils/allo/bone-body.webp","coverage":[[332,13],[333,38],[362,52],[363,3877],[364,4422],[365,4498],[366,4154],[367,3270],[368,2813],[369,1738],[370,60],[393,3],[394,69],[395,4436],[396,3620],[397,3398],[398,3249],[399,3960],[400,4700],[401,4598],[402,3958],[403,294],[425,1559],[426,2682],[427,2553],[428,2433],[429,2202],[430,2116],[431,2231],[432,2700],[433,318],[434,3302],[435,552],[457,2980],[458,4234],[459,2419],[460,2181],[461,2161],[462,1151],[463,3330],[464,400],[466,27],[467,144],[489,1056],[490,1835],[491,3033],[492,1426],[493,790],[494,2608],[495,1996],[520,1086],[521,2570],[522,773],[523,2704],[525,87],[526,1049],[527,135],[552,1515],[553,99],[554,1737],[555,1534],[586,66]]}],"bowl":"art/wide-face/sandstone.webp","sand":{"file":"art/wide-face/allo-buried.webp","full":true},"skeleton":{"file":"art/fossils/allo/skeleton.webp","box":[214,397.05955678670364,1109,828.9404432132965]}},"area":{"grid":32,"weights":[[261,29],[262,1198],[263,1814],[264,724],[265,75],[291,1010],[292,3080],[293,3429],[294,4690],[295,4761],[296,4632],[297,3531],[298,244],[322,164],[323,4501],[324,4761],[325,4055],[326,4646],[327,4761],[328,4681],[329,4685],[330,2240],[332,13],[333,38],[354,9],[355,2142],[356,2134],[357,1716],[358,4215],[359,4483],[360,4097],[361,4616],[362,4109],[363,3877],[364,4422],[365,4498],[366,4154],[367,3270],[368,2813],[369,1738],[370,60],[387,1361],[388,4106],[389,3483],[390,1886],[391,1008],[392,1664],[393,4559],[394,4587],[395,4436],[396,3620],[397,3398],[398,3249],[399,3960],[400,4761],[401,4761],[402,3958],[403,2471],[404,977],[405,26],[419,302],[420,1182],[421,15],[424,3],[425,2290],[426,4208],[427,2553],[428,2433],[429,2202],[430,2116],[431,2231],[432,4761],[433,4761],[434,3743],[435,4593],[436,4488],[437,3843],[438,2157],[439,891],[440,30],[457,2980],[458,4234],[459,2419],[460,2181],[461,2161],[462,1151],[463,3586],[464,3413],[465,3343],[466,2299],[467,2577],[468,4038],[469,4467],[470,4590],[471,4547],[472,3993],[473,2791],[474,1756],[475,900],[476,125],[489,1056],[490,1835],[491,3033],[492,1426],[493,790],[494,2608],[495,4692],[496,1744],[497,2773],[498,1159],[499,618],[500,720],[501,1375],[502,1866],[503,2013],[504,2048],[505,2029],[506,1957],[507,1899],[508,1713],[509,78],[520,1086],[521,2570],[522,773],[523,2704],[525,87],[526,1049],[527,3805],[528,420],[529,3715],[530,1918],[531,207],[552,1515],[553,99],[554,1737],[555,1534],[559,3120],[561,322],[562,2927],[563,1709],[564,1],[586,66],[590,372],[591,4294],[592,24],[594,90],[595,4281],[596,487],[621,45],[622,2947],[623,2292],[627,3972],[628,1363],[652,975],[653,3569],[654,3688],[655,521],[657,221],[658,2620],[659,3829],[660,549],[685,119],[686,14],[689,20],[690,173],[691,69]],"total":386069,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[326,188],[327,629],[328,1122],[329,1228],[330,1002],[331,261],[357,459],[358,1491],[359,1560],[360,1521],[361,1521],[362,1521],[363,1317],[364,17],[389,515],[390,1518],[391,1560],[392,1508],[393,1521],[394,1521],[395,1521],[396,1003],[397,1096],[398,1114],[399,1029],[400,800],[401,624],[402,161],[422,1269],[423,1328],[424,1066],[425,1017],[426,967],[427,1560],[428,1560],[429,1600],[430,1560],[431,1560],[432,1560],[433,1560],[434,1540],[435,998],[436,584],[437,121],[454,441],[455,478],[456,12],[458,61],[459,1429],[460,1521],[461,1560],[462,1521],[463,1521],[464,1521],[465,1521],[466,1560],[467,1521],[468,1521],[469,1471],[470,1088],[471,593],[472,169],[490,32],[491,1341],[492,1521],[493,1560],[494,1521],[495,1521],[496,1521],[497,1521],[498,1560],[499,1463],[500,1267],[501,1499],[502,1521],[503,1521],[504,1556],[505,1281],[506,1011],[507,688],[508,99],[522,74],[523,1105],[524,1239],[525,1116],[526,234],[527,1245],[528,1521],[529,1521],[530,1535],[531,665],[533,30],[534,98],[535,140],[536,154],[537,96],[538,117],[539,123],[540,46],[554,1004],[555,458],[556,1045],[557,333],[560,1316],[561,783],[562,1214],[563,497],[588,392],[589,10],[591,139],[592,1542],[593,61],[594,25],[595,1116],[596,553],[623,832],[624,1308],[625,29],[627,799],[628,988],[653,199],[654,1161],[655,1479],[656,438],[658,514],[659,1408],[660,838],[686,53],[687,118],[690,2],[691,192],[692,6]],"total":124602,"unreachable":0,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[327,226],[328,833],[329,1445],[330,1614],[331,1379],[332,188],[358,160],[359,1881],[360,1936],[361,1936],[362,1980],[363,2112],[364,1252],[366,14],[367,4],[390,84],[391,1643],[392,1980],[393,1817],[394,2025],[395,2148],[396,1942],[397,1977],[398,1954],[399,1919],[400,1676],[401,1397],[402,711],[403,53],[423,1022],[424,1741],[425,1060],[426,572],[427,1035],[428,2112],[429,2189],[430,1936],[431,1938],[432,2159],[433,2112],[434,2112],[435,2263],[436,1474],[437,642],[438,95],[455,11],[456,35],[459,570],[460,1936],[461,1980],[462,1936],[463,1980],[464,2112],[465,1936],[466,1936],[467,1980],[468,2112],[469,1936],[470,1910],[471,1378],[472,872],[473,514],[474,111],[491,131],[492,1888],[493,1985],[494,1306],[495,1640],[496,2155],[497,1980],[498,1971],[499,1194],[500,714],[501,871],[502,975],[503,963],[504,913],[505,945],[506,887],[507,43],[523,1499],[524,790],[525,1550],[526,4],[527,304],[528,1607],[529,1428],[530,1714],[531,261],[555,172],[556,227],[557,480],[559,10],[560,1798],[561,249],[562,246],[563,1629],[564,209],[590,8],[591,808],[592,1828],[593,113],[595,1631],[596,692],[622,1090],[623,1751],[624,661],[626,894],[627,1769],[628,344]],"total":134320,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[299,135],[329,3779],[330,7519],[331,12519],[332,11044],[333,3156],[361,8099],[362,8320],[363,12907],[364,12444],[365,10538],[366,6546],[367,7175],[368,5488],[369,3726],[370,225],[393,3916],[394,6851],[395,3037],[396,4016],[397,11692],[398,9675],[399,8262],[400,9187],[401,12996],[402,11103],[403,6802],[404,2461],[405,69],[428,409],[429,10353],[430,6543],[431,5862],[432,7272],[433,9852],[434,6379],[435,10027],[436,12401],[437,10817],[438,7294],[439,4559],[440,1626],[460,2111],[461,4359],[462,5114],[463,1520],[464,9922],[465,5334],[466,4765],[467,40],[468,789],[469,1250],[470,1227],[471,1065],[472,964],[492,1824],[493,2116],[494,1428],[496,6110],[497,161],[498,5703],[499,2543],[527,2033],[528,7734],[530,2208],[531,6693],[558,472],[559,4645],[560,1165],[562,4297],[563,1396]],"total":386069,"metric":"rock-alpha-r1"},"stages":["art/wide-face/sandstone.webp","art/wide-face/sandstone.webp","art/wide-face/allo-buried.webp","art/wide-face/allo-buried.webp"],"waveOrder":["head","legs","tail","neck","body"],"groove":{"base":"#c1994c","inset":"#3a2e17","light":"#e6d6b7"},"voice":{"file":"gallery-allo.m4a","start":0.1021,"end":6.4062,"text":"嗨，我是异特龙，今天想和你玩一个找不同，看你能发现我的小细节吗！"},"living":{"file":"../../assets/allo-3d.webp","aspect":"1000/666"},"card":{"title":"异特龙 · 侏罗纪 · 吃肉","text":"我用两条后腿走路，眼睛上方有两个小角。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.allo.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"眉上有角的伙伴，已经在石板上站好啦","eyebrow":"一块新化石","journey":null,"camp":null,"nickname":"眉上有角的伙伴","location":{"id":"g1-j5","name":"一年级 · 侏罗纪第5站"}},"trike":{"id":"trike","name":"三角龙","latinName":"Triceratops","isDinosaur":true,"era":"cretaceous","eraLabel":"白垩纪","bodyClass":"长角的","rock":"sandstone","template":"horned","art":{"mode":"cut","geometry":{"x":-0.1318779572200094,"y":-0.13572514330532598,"scale":1.1870785892942197},"skeletonSize":[1254,1254],"interior":[[0.2206070933986852,0.3123004210915315],[0.8439862080367216,0.3123004210915315],[0.9029545026646438,0.40075286303341506],[0.9029545026646438,0.6618981678142142],[0.8439862080367216,0.6955943361730268],[0.2206070933986852,0.6787462519936206],[0.16163879877076281,0.6197779573656982],[0.16163879877076281,0.40075286303341506]],"parts":[{"id":"head","label":"头","box":[234.3863,442.4937,540.7874,720.7364],"file":"fossils/trike/bone-head.webp","coverage":[[296,490],[297,3401],[298,3489],[299,1229],[323,273],[324,1061],[328,2063],[329,4830],[330,4830],[331,4327],[332,46],[354,75],[355,1621],[356,2103],[357,1862],[360,3132],[361,4761],[362,4761],[363,4591],[364,254],[387,602],[388,3174],[389,4675],[390,3067],[391,3794],[392,4752],[393,4761],[394,4761],[395,4122],[396,78],[421,3162],[422,4761],[423,4637],[424,4757],[425,4695],[426,4518],[427,1429],[451,679],[452,4114],[453,4756],[454,4761],[455,4645],[456,4023],[457,2320],[458,1887],[483,2040],[484,4372],[485,4701],[486,3805],[487,4799],[488,3311],[515,3364],[516,2695],[517,2404],[518,3619],[519,1434],[520,17],[547,455],[548,1053],[549,1521],[550,48]]},{"id":"forelegs","label":"前腿","box":[402.3819,631.0115,609.0356,826.6882],"file":"fossils/trike/bone-forelegs.webp","coverage":[[458,375],[459,897],[460,84],[490,3046],[491,4761],[492,2350],[522,1862],[523,2912],[524,3610],[525,2555],[553,6],[554,3287],[555,2900],[556,1537],[557,4635],[558,363],[585,2883],[586,3389],[587,225],[588,2437],[589,3068],[616,2608],[617,4496],[618,1315],[619,532],[620,4341],[621,2918],[648,760],[649,515],[650,69],[651,1389],[652,2260],[653,1150]]},{"id":"hindlegs","label":"后腿","box":[665.8296,565.1496,888.7101,818.0975],"file":"fossils/trike/bone-hindlegs.webp","coverage":[[403,609],[404,84],[434,1878],[435,4761],[436,1984],[465,325],[466,3270],[467,3614],[468,2386],[496,244],[497,3650],[498,1055],[499,3901],[500,238],[501,86],[528,341],[529,4761],[530,1112],[531,4507],[532,2276],[561,3784],[562,1121],[563,929],[564,3880],[565,2540],[566,140],[592,93],[593,4448],[594,2991],[596,1536],[597,4761],[598,1679],[623,7],[624,2983],[625,4753],[626,2156],[627,11],[628,3085],[629,4600],[630,1950],[655,1],[656,527],[657,825],[658,13],[659,96],[660,1241],[661,711],[662,58]]},{"id":"tail","label":"尾巴","box":[870.5742,561.3315,1100.6137,739.3496],"file":"fossils/trike/bone-tail.webp","coverage":[[406,559],[438,3443],[439,773],[470,3602],[471,3794],[472,269],[502,1342],[503,4506],[504,3116],[505,146],[535,1048],[536,4097],[537,3508],[538,607],[568,235],[569,1968],[570,3591],[571,2890],[572,1691],[573,35]]},{"id":"body","label":"身体","box":[476.3573,481.629,877.7332,705.9414],"file":"fossils/trike/bone-body.webp","coverage":[[333,389],[334,1211],[335,2377],[336,2387],[337,2156],[338,1497],[339,579],[364,1859],[365,4105],[366,4402],[367,4744],[368,4729],[369,4741],[370,4642],[371,4515],[372,2862],[373,635],[395,492],[396,4548],[397,4743],[398,3402],[399,3160],[400,3631],[401,2770],[402,2997],[403,4152],[404,4669],[405,4354],[406,672],[426,124],[427,2776],[428,4567],[429,3652],[430,3060],[431,2832],[432,2918],[433,1909],[434,2185],[436,2405],[437,4135],[438,897],[458,173],[459,3130],[460,3915],[461,2863],[462,2772],[463,2753],[464,2439],[465,153],[468,1045],[469,1605],[470,818],[492,1632],[493,2914],[494,2721],[495,2009],[496,351],[500,84],[501,2995],[524,1],[525,1645],[526,1914],[527,29],[533,409]]}],"bowl":"art/wide-face/sandstone.webp","sand":{"file":"art/wide-face/trike-buried.webp","full":true},"skeleton":{"file":"art/fossils/trike/skeleton.webp","box":[232,442.493698630137,1103,830.506301369863]}},"area":{"grid":32,"weights":[[296,490],[297,3401],[298,3489],[299,1229],[323,273],[324,1061],[328,2063],[329,4830],[330,4830],[331,4327],[332,46],[333,389],[334,1211],[335,2377],[336,2387],[337,2156],[338,1497],[339,579],[354,75],[355,1621],[356,2103],[357,1862],[360,3132],[361,4761],[362,4761],[363,4591],[364,2113],[365,4105],[366,4402],[367,4744],[368,4729],[369,4741],[370,4642],[371,4515],[372,2862],[373,635],[387,602],[388,3174],[389,4675],[390,3067],[391,3794],[392,4752],[393,4761],[394,4761],[395,4614],[396,4626],[397,4743],[398,3402],[399,3160],[400,3631],[401,2770],[402,2997],[403,4761],[404,4753],[405,4354],[406,1231],[421,3162],[422,4761],[423,4637],[424,4757],[425,4695],[426,4642],[427,4205],[428,4567],[429,3652],[430,3060],[431,2832],[432,2918],[433,1909],[434,4063],[435,4761],[436,4389],[437,4135],[438,4340],[439,773],[451,679],[452,4114],[453,4756],[454,4761],[455,4645],[456,4023],[457,2320],[458,2435],[459,4027],[460,3999],[461,2863],[462,2772],[463,2753],[464,2439],[465,478],[466,3270],[467,3614],[468,3431],[469,1605],[470,4420],[471,3794],[472,269],[483,2040],[484,4372],[485,4701],[486,3805],[487,4799],[488,3311],[490,3046],[491,4761],[492,3982],[493,2914],[494,2721],[495,2009],[496,595],[497,3650],[498,1055],[499,3901],[500,322],[501,3081],[502,1342],[503,4506],[504,3116],[505,146],[515,3364],[516,2695],[517,2404],[518,3619],[519,1434],[520,17],[522,1862],[523,2912],[524,3611],[525,4200],[526,1914],[527,29],[528,341],[529,4761],[530,1112],[531,4507],[532,2276],[533,409],[535,1048],[536,4097],[537,3508],[538,607],[547,455],[548,1053],[549,1521],[550,48],[553,6],[554,3287],[555,2900],[556,1537],[557,4635],[558,363],[561,3784],[562,1121],[563,929],[564,3880],[565,2540],[566,140],[568,235],[569,1968],[570,3591],[571,2890],[572,1691],[573,35],[585,2883],[586,3389],[587,225],[588,2437],[589,3068],[592,93],[593,4448],[594,2991],[596,1536],[597,4761],[598,1679],[616,2608],[617,4496],[618,1315],[619,532],[620,4341],[621,2918],[623,7],[624,2983],[625,4753],[626,2156],[627,11],[628,3085],[629,4600],[630,1950],[648,760],[649,515],[650,69],[651,1389],[652,2260],[653,1150],[655,1],[656,527],[657,825],[658,13],[659,96],[660,1241],[661,711],[662,58]],"total":537773,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[362,8],[363,607],[364,1145],[365,75],[390,68],[391,39],[394,529],[395,1521],[396,1521],[397,820],[399,189],[400,462],[401,528],[402,438],[403,191],[421,29],[422,584],[423,1070],[424,111],[425,127],[426,1138],[427,1560],[428,1560],[429,1590],[430,1181],[431,1552],[432,1560],[433,1560],[434,1600],[435,1552],[436,1180],[437,397],[454,289],[455,1124],[456,1312],[457,1055],[458,1521],[459,1521],[460,1521],[461,1560],[462,1521],[463,1521],[464,1521],[465,1521],[466,1560],[467,1521],[468,1521],[469,1451],[470,670],[486,185],[487,553],[488,1502],[489,1521],[490,1521],[491,1521],[492,1521],[493,1560],[494,1521],[495,1521],[496,1521],[497,1521],[498,1560],[499,1521],[500,1521],[501,1521],[502,1521],[503,539],[518,538],[519,1560],[520,1521],[521,1521],[522,1521],[523,1521],[524,1521],[525,1560],[526,1521],[527,1521],[528,1521],[529,1521],[530,1560],[531,1521],[532,1521],[533,1521],[534,1521],[535,1457],[536,264],[550,1151],[551,1560],[552,1506],[553,1444],[554,1155],[555,530],[556,1047],[557,1560],[558,1521],[559,1521],[560,1217],[561,943],[562,1560],[563,1521],[564,1494],[565,878],[566,316],[567,1097],[568,1343],[569,330],[582,535],[583,1114],[584,1007],[585,706],[586,61],[587,1],[588,1117],[589,1477],[590,1526],[591,1118],[592,42],[593,108],[594,1600],[595,1292],[596,1338],[597,697],[598,6],[599,1],[600,502],[601,1185],[602,1029],[603,593],[604,62],[619,846],[620,1407],[621,459],[622,1503],[623,773],[625,290],[626,1560],[627,572],[628,224],[629,1521],[630,486],[634,41],[635,94],[650,579],[651,1495],[652,747],[653,841],[654,1521],[655,427],[657,1199],[658,1484],[659,357],[660,773],[661,1508],[662,666],[682,63],[683,185],[684,6],[685,528],[686,509],[687,83],[689,27],[690,18],[692,104],[693,164]],"total":163936,"unreachable":68,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[299,110],[300,79],[330,898],[331,1833],[332,561],[358,229],[359,474],[361,139],[362,1996],[363,2025],[364,1812],[365,602],[366,1231],[367,1532],[368,1513],[369,1320],[370,672],[371,38],[389,8],[390,1103],[391,1889],[392,723],[393,1534],[394,2025],[395,2025],[396,2160],[397,2070],[398,2025],[399,2025],[400,2025],[401,2025],[402,2025],[403,1795],[404,251],[422,66],[423,869],[424,2025],[425,2070],[426,2025],[427,2025],[428,2160],[429,2070],[430,2025],[431,2025],[432,2142],[433,2205],[434,2205],[435,2315],[436,2079],[437,239],[454,856],[455,2070],[456,2070],[457,2116],[458,2152],[459,2430],[460,2448],[461,2258],[462,2259],[463,2070],[464,2254],[465,2070],[466,2070],[467,2070],[468,2208],[469,1667],[470,61],[486,1495],[487,2025],[488,2009],[489,1874],[490,1370],[491,1073],[492,2025],[493,2025],[494,2205],[495,1343],[496,1970],[497,2025],[498,2025],[499,1320],[500,697],[501,1698],[502,1419],[503,208],[518,601],[519,1426],[520,1357],[521,389],[522,3],[523,1252],[524,1822],[525,1989],[526,1208],[528,1205],[529,1876],[530,1343],[531,1413],[532,97],[533,43],[534,811],[535,1488],[536,1123],[537,265],[554,949],[555,1934],[556,665],[557,2022],[558,605],[559,87],[560,1674],[561,1610],[562,151],[563,2020],[564,827],[585,131],[586,1415],[587,798],[588,1249],[589,1776],[590,274],[591,357],[592,1183],[593,566],[594,634],[595,1350],[596,450]],"total":175690,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[300,1040],[301,1885],[329,1779],[330,377],[332,9532],[333,13923],[334,2842],[335,3186],[336,5836],[337,5781],[338,3322],[339,146],[360,29],[361,4731],[362,9842],[363,5461],[364,13148],[365,13924],[366,11741],[367,12539],[368,11559],[369,11116],[370,12405],[371,11117],[372,2207],[393,2377],[394,10558],[395,13642],[396,12323],[397,11423],[398,12216],[399,9013],[400,8502],[401,5190],[402,12919],[403,10819],[404,11619],[405,1165],[425,8393],[426,11735],[427,12466],[428,4328],[429,8533],[430,12351],[431,7654],[432,4211],[433,8018],[434,7614],[435,4475],[436,5877],[437,9793],[438,573],[457,3590],[458,5361],[459,1115],[461,8245],[462,5764],[463,7912],[464,43],[465,8601],[466,3991],[467,8332],[468,767],[469,3083],[470,7844],[471,4618],[472,643],[491,2],[492,6467],[493,5919],[494,7488],[495,3408],[496,691],[497,11618],[498,2533],[499,9284],[500,5673],[523,57],[524,2587],[525,913],[526,5280],[527,1178],[528,750],[529,2649],[530,107],[531,3346],[532,659]],"total":537773,"metric":"rock-alpha-r1"},"stages":["art/wide-face/sandstone.webp","art/wide-face/sandstone.webp","art/wide-face/trike-buried.webp","art/wide-face/trike-buried.webp"],"waveOrder":["head","forelegs","hindlegs","tail","body"],"groove":{"base":"#c1994c","inset":"#3a2e17","light":"#e6d6b7"},"voice":{"file":"gallery-trike.m4a","start":0.1021,"end":6.9271,"text":"嘿，小探险家，我是三角龙，见到你真高兴，今天让我陪你走一小段吧！"},"living":{"file":"../../assets/trike-3d.webp","aspect":"1374/1145"},"card":{"title":"三角龙 · 白垩纪 · 吃植物","text":"我头上有三根角，脖子后面有一圈大骨盾。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.trike.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"戴骨盾的草食伙伴，已经在石板上站好啦","eyebrow":"一块新化石","journey":null,"camp":null,"nickname":"戴骨盾的草食伙伴","location":{"id":"g2-c2","name":"二年级 · 白垩纪第2站"}},"anky":{"id":"anky","name":"甲龙","latinName":"Ankylosaurus","isDinosaur":true,"era":"cretaceous","eraLabel":"白垩纪","bodyClass":"披甲的","rock":"sandstone","template":"armored","art":{"mode":"cut","geometry":{"x":-0.04073662966700298,"y":-0.061526881937436995,"scale":1.0376185671039355},"skeletonSize":[1254,1254],"interior":[[0.1645466215427704,0.28577638386431714],[0.877718131248298,0.28577638386431714],[0.9451803010853073,0.38696963861983125],[0.9451803010853073,0.6857306764694441],[0.877718131248298,0.7242804878048781],[0.1645466215427704,0.705005582137161],[0.09708445170576102,0.6375434123001517],[0.09708445170576102,0.38696963861983125]],"parts":[{"id":"head","label":"头","box":[158.0,541.7924,318.7832,657.9136],"file":"fossils/anky/bone-head.webp","coverage":[[388,566],[389,2934],[390,2931],[419,2663],[420,5569],[421,5776],[422,4803],[450,250],[451,5329],[452,5365],[453,5656],[454,3798],[455,104],[482,27],[483,1933],[484,2143],[485,1678],[486,78]]},{"id":"club","label":"尾锤","box":[1058.1873,649.9737,1149.0,729.3728],"file":"fossils/anky/bone-club.webp","coverage":[[506,29],[507,3572],[508,2718],[538,1036],[539,5632],[540,5386],[541,211],[571,1286],[572,595]]},{"id":"forelegs","label":"前腿","box":[330.693,613.2516,534.6495,819.6893],"file":"fossils/anky/bone-forelegs.webp","coverage":[[457,1084],[458,3951],[459,609],[489,2278],[490,4596],[491,3756],[492,296],[521,3125],[522,2825],[523,2818],[524,3986],[552,1047],[553,4730],[554,724],[555,2713],[556,2644],[583,1272],[584,5210],[585,1967],[586,88],[587,4465],[588,1921],[615,168],[616,1029],[617,86],[618,1201],[619,3538],[620,610]]},{"id":"hindlegs","label":"后腿","box":[619.5073,574.5446,831.8998,819.193],"file":"fossils/anky/bone-hindlegs.webp","coverage":[[432,692],[433,3948],[434,1012],[464,2526],[465,4452],[466,2854],[495,785],[496,5227],[497,307],[498,4194],[499,142],[527,1106],[528,5752],[529,349],[530,4931],[531,2487],[559,30],[560,5207],[561,263],[562,429],[563,4566],[564,1687],[591,1088],[592,5712],[593,1218],[595,3903],[596,3727],[623,2599],[624,3238],[625,149],[627,1433],[628,728]]},{"id":"tail","label":"尾巴","box":[810.5613,558.6647,1061.1647,710.0193],"file":"fossils/anky/bone-tail.webp","coverage":[[404,679],[405,21],[436,4592],[437,3614],[438,303],[468,3498],[469,5650],[470,4844],[471,1413],[500,197],[501,2334],[502,4454],[503,5563],[504,3786],[505,1633],[506,313],[534,333],[535,1535],[536,3120],[537,3937],[538,3151]]},{"id":"body","label":"身体","box":[310.347,452.9647,846.7872,672.801],"file":"fossils/anky/bone-body.webp","coverage":[[330,29],[331,1510],[332,2820],[333,3874],[334,3540],[335,3122],[336,2932],[337,1626],[360,26],[361,1750],[362,4719],[363,5835],[364,5776],[365,5776],[366,5776],[367,5776],[368,5769],[369,5295],[370,4010],[371,1539],[390,45],[391,2862],[392,4536],[393,5774],[394,5776],[395,5852],[396,5242],[397,4457],[398,4000],[399,3769],[400,5441],[401,5776],[402,5776],[403,5231],[404,2247],[405,42],[422,205],[423,5231],[424,5290],[425,5425],[426,5776],[427,4786],[428,3369],[429,3244],[430,2809],[431,2860],[432,2527],[433,1828],[434,4764],[435,5774],[436,1140],[455,345],[456,1810],[457,4076],[458,1825],[459,4695],[460,2952],[461,2524],[462,2848],[463,3312],[464,1333],[466,2557],[467,2302],[468,577],[488,1],[489,256],[491,685],[492,1733],[493,2332],[494,873],[495,1529],[498,22],[499,1848],[500,56]]}],"bowl":"art/wide-face/sandstone.webp","sand":{"file":"art/wide-face/anky-buried.webp","full":true},"skeleton":{"file":"art/fossils/anky/skeleton.webp","box":[158,450.9797195793691,1149,842.020280420631]}},"area":{"grid":32,"weights":[[330,29],[331,1510],[332,2820],[333,3874],[334,3540],[335,3122],[336,2932],[337,1626],[360,26],[361,1750],[362,4719],[363,5835],[364,5776],[365,5776],[366,5776],[367,5776],[368,5769],[369,5295],[370,4010],[371,1539],[388,566],[389,2934],[390,2976],[391,2862],[392,4536],[393,5774],[394,5776],[395,5852],[396,5242],[397,4457],[398,4000],[399,3769],[400,5441],[401,5776],[402,5776],[403,5231],[404,2926],[405,63],[419,2663],[420,5569],[421,5776],[422,5008],[423,5231],[424,5290],[425,5425],[426,5776],[427,4786],[428,3369],[429,3244],[430,2809],[431,2860],[432,3219],[433,5776],[434,5776],[435,5774],[436,5732],[437,3614],[438,303],[450,250],[451,5329],[452,5365],[453,5656],[454,3798],[455,449],[456,1810],[457,5160],[458,5776],[459,5304],[460,2952],[461,2524],[462,2848],[463,3312],[464,3859],[465,4452],[466,5411],[467,2302],[468,4075],[469,5650],[470,4844],[471,1413],[482,27],[483,1933],[484,2143],[485,1678],[486,78],[488,1],[489,2534],[490,4596],[491,4441],[492,2029],[493,2332],[494,873],[495,2314],[496,5227],[497,307],[498,4216],[499,1990],[500,253],[501,2334],[502,4454],[503,5563],[504,3786],[505,1633],[506,342],[507,3572],[508,2718],[521,3125],[522,2825],[523,2818],[524,3986],[527,1106],[528,5752],[529,349],[530,4931],[531,2487],[534,333],[535,1535],[536,3120],[537,3937],[538,4187],[539,5632],[540,5386],[541,211],[552,1047],[553,4730],[554,724],[555,2713],[556,2644],[559,30],[560,5207],[561,263],[562,429],[563,4566],[564,1687],[571,1286],[572,595],[583,1272],[584,5210],[585,1967],[586,88],[587,4465],[588,1921],[591,1088],[592,5712],[593,1218],[595,3903],[596,3727],[615,168],[616,1029],[617,86],[618,1201],[619,3538],[620,610],[623,2599],[624,3238],[625,149],[627,1433],[628,728]],"total":500361,"metric":"wide-relief-r1"},"legacyArea":{"grid":32,"weights":[[395,30],[396,410],[397,696],[398,1077],[399,1051],[400,856],[401,677],[402,230],[425,94],[426,680],[427,1295],[428,1550],[429,1600],[430,1560],[431,1560],[432,1560],[433,1560],[434,1555],[435,984],[436,204],[452,27],[453,549],[454,1225],[455,1335],[456,1141],[457,1418],[458,1521],[459,1521],[460,1521],[461,1560],[462,1521],[463,1521],[464,1521],[465,1521],[466,1560],[467,1521],[468,1469],[469,480],[470,1],[484,1071],[485,1521],[486,1521],[487,1560],[488,1521],[489,1521],[490,1521],[491,1521],[492,1521],[493,1560],[494,1521],[495,1521],[496,1521],[497,1521],[498,1560],[499,1521],[500,1521],[501,1521],[502,876],[503,65],[516,1346],[517,1176],[518,1436],[519,1499],[520,347],[521,419],[522,1364],[523,1521],[524,1521],[525,1560],[526,1521],[527,1509],[528,1521],[529,1521],[530,1560],[531,1521],[532,1475],[533,1386],[534,1521],[535,1348],[536,445],[537,1],[539,576],[540,336],[548,160],[549,512],[550,552],[551,185],[554,429],[555,1521],[556,1521],[557,1225],[558,352],[559,73],[560,947],[561,1521],[562,1560],[563,1447],[564,345],[565,38],[566,502],[567,1016],[568,1456],[569,1370],[570,1141],[571,1521],[572,1421],[573,246],[585,15],[586,1235],[587,1278],[588,1180],[589,1365],[592,454],[593,1560],[594,760],[595,1272],[596,556],[600,12],[601,168],[602,179],[603,744],[604,1079],[605,241],[616,4],[617,889],[618,1366],[619,103],[620,1187],[621,884],[624,537],[625,1521],[626,160],[627,392],[628,1487],[629,53],[648,4],[649,514],[650,331],[651,255],[652,1175],[653,364],[655,8],[656,1003],[657,1220],[658,56],[659,228],[660,738],[661,33]],"total":146249,"unreachable":0,"metric":"rock-v2"},"previousArea":{"grid":32,"weights":[[271,5],[300,402],[301,1133],[302,1444],[303,1811],[304,1665],[305,1517],[306,800],[307,92],[327,64],[328,588],[329,408],[330,770],[331,1463],[332,2097],[333,2070],[334,2070],[335,2116],[336,2070],[337,2116],[338,2070],[339,1981],[340,609],[358,753],[359,1826],[360,2070],[361,2205],[362,2070],[363,2025],[364,2070],[365,2025],[366,2025],[367,2070],[368,2025],[369,2074],[370,2041],[371,2250],[372,2019],[373,1116],[374,34],[390,1970],[391,1844],[392,2116],[393,1945],[394,1163],[395,2153],[396,2300],[397,2250],[398,2199],[399,2116],[400,2162],[401,2326],[402,2234],[403,2400],[404,2197],[405,2116],[406,1693],[407,432],[409,8],[410,356],[411,24],[422,650],[423,1144],[424,1119],[425,231],[427,605],[428,2070],[429,2025],[430,1572],[431,805],[432,1119],[433,2070],[434,2025],[435,1936],[436,654],[437,753],[438,1509],[439,1985],[440,1575],[441,1455],[442,2070],[443,1294],[458,1],[459,1339],[460,1744],[461,1792],[462,1142],[464,169],[465,2036],[466,1245],[467,1742],[468,431],[471,104],[472,453],[473,534],[474,1435],[475,1305],[490,903],[491,1950],[492,362],[493,1946],[494,625],[496,454],[497,2100],[498,472],[499,981],[500,1569],[522,193],[523,273],[524,317],[525,1075],[526,70],[528,539],[529,1212],[530,103],[531,252],[532,410]],"total":156007,"metric":"rock-f2r2"},"alphaArea":{"grid":32,"weights":[[332,287],[333,1428],[334,3266],[335,2814],[336,417],[362,356],[363,5336],[364,10826],[365,13068],[366,13264],[367,13093],[368,11743],[369,6855],[370,406],[391,2440],[392,9217],[393,10464],[394,12010],[395,13241],[396,13165],[397,9959],[398,7928],[399,7738],[400,12707],[401,13415],[402,10912],[403,1826],[423,10744],[424,13190],[425,6685],[426,3741],[427,11664],[428,12226],[429,6795],[430,6295],[431,7110],[432,10558],[433,10603],[434,8222],[435,12062],[436,4964],[437,12],[455,884],[456,894],[459,7053],[460,6828],[461,5524],[462,1240],[463,6718],[464,4839],[465,9380],[466,1022],[467,2911],[468,8486],[469,9638],[470,7345],[471,12337],[472,1832],[490,1620],[491,8435],[492,3788],[493,4938],[495,4011],[496,4943],[497,4473],[498,5952],[502,137],[503,3945],[504,149],[522,6023],[523,1805],[524,7654],[525,2584],[527,7518],[528,4576],[529,1645],[530,6182]],"total":500361,"metric":"rock-alpha-r1"},"stages":["art/wide-face/sandstone.webp","art/wide-face/sandstone.webp","art/wide-face/anky-buried.webp","art/wide-face/anky-buried.webp"],"waveOrder":["head","club","forelegs","hindlegs","tail","body"],"groove":{"base":"#c1994c","inset":"#3a2e17","light":"#e6d6b7"},"voice":{"file":"gallery-anky.m4a","start":0.1021,"end":6.7578,"text":"嘿，我是甲龙，我把特别的外衣穿来见你啦，今天你就是我的观察搭档！"},"living":{"file":"../../assets/anky-3d.webp","aspect":"1000/666"},"card":{"title":"甲龙 · 白垩纪 · 吃植物","text":"我背上有一层厚厚的骨甲，尾巴末端有一个大骨锤。","sources":["prototypes/fossil-dig/fossil-meta.json:fossils.anky.card (家长 2026-10-28 确认（ad3b48d 原句）)"]},"reviveLine":"穿骨甲的草食伙伴，已经在石板上站好啦","eyebrow":"一块新化石","journey":null,"camp":null,"nickname":"穿骨甲的草食伙伴","location":{"id":"g2-c3","name":"二年级 · 白垩纪第3站"}}},"catalog":[{"id":"brachio","name":"腕龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"cedar","location":"巨杉营地","dig":true},{"id":"mamenshi","name":"马门溪龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"waterfall","location":"瀑布岩台","dig":true},{"id":"stego","name":"剑龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g1-j1","location":"一年级 · 侏罗纪第1站","dig":true},{"id":"compso","name":"美颌龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g1-j4","location":"一年级 · 侏罗纪第4站","dig":true},{"id":"allo","name":"异特龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g1-j5","location":"一年级 · 侏罗纪第5站","dig":true},{"id":"ptero","name":"翼龙","era":"any","eraLabel":"三叠纪至白垩纪","hall":"jurassic","locationId":"g1-j6","location":"一年级 · 侏罗纪第6站","dig":true},{"id":"dilo","name":"双脊龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g1-j7","location":"一年级 · 侏罗纪第7站","dig":false},{"id":"diplo","name":"梁龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g1-j8","location":"一年级 · 侏罗纪第8站","dig":false},{"id":"raptor","name":"迅猛龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c1","location":"一年级 · 白垩纪第1站","dig":false},{"id":"trex","name":"霸王龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c1","location":"一年级 · 白垩纪第1站","dig":false},{"id":"spino","name":"棘龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c2","location":"一年级 · 白垩纪第2站","dig":false},{"id":"pachy","name":"肿头龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c2","location":"一年级 · 白垩纪第2站","dig":false},{"id":"iguano","name":"禽龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c3","location":"一年级 · 白垩纪第3站","dig":false},{"id":"carno","name":"食肉牛龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c3","location":"一年级 · 白垩纪第3站","dig":false},{"id":"oviraptor","name":"窃蛋龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c4","location":"一年级 · 白垩纪第4站","dig":false},{"id":"styraco","name":"戟龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c4","location":"一年级 · 白垩纪第4站","dig":false},{"id":"proto","name":"原角龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c5","location":"一年级 · 白垩纪第5站","dig":false},{"id":"psittaco","name":"鹦鹉嘴龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c5","location":"一年级 · 白垩纪第5站","dig":false},{"id":"therizino","name":"镰刀龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c6","location":"一年级 · 白垩纪第6站","dig":false},{"id":"amarga","name":"阿马加龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c6","location":"一年级 · 白垩纪第6站","dig":false},{"id":"lambeo","name":"赖氏龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c7","location":"一年级 · 白垩纪第7站","dig":false},{"id":"nodo","name":"结节龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c7","location":"一年级 · 白垩纪第7站","dig":false},{"id":"struthio","name":"似鸵龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c8","location":"一年级 · 白垩纪第8站","dig":false},{"id":"bary","name":"重爪龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g1-c8","location":"一年级 · 白垩纪第8站","dig":false},{"id":"kentro","name":"肯氏龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g2-j1","location":"二年级 · 侏罗纪第1站","dig":false},{"id":"cerato","name":"角鼻龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g2-j2","location":"二年级 · 侏罗纪第2站","dig":false},{"id":"apato","name":"迷惑龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g2-j3","location":"二年级 · 侏罗纪第3站","dig":false},{"id":"shuno","name":"蜀龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g2-j4","location":"二年级 · 侏罗纪第4站","dig":false},{"id":"camara","name":"圆顶龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g2-j5","location":"二年级 · 侏罗纪第5站","dig":false},{"id":"parasaur","name":"副栉龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c1","location":"二年级 · 白垩纪第1站","dig":true},{"id":"argentino","name":"阿根廷龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c1","location":"二年级 · 白垩纪第1站","dig":false},{"id":"trike","name":"三角龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c2","location":"二年级 · 白垩纪第2站","dig":true},{"id":"alamo","name":"阿拉莫龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c2","location":"二年级 · 白垩纪第2站","dig":false},{"id":"anky","name":"甲龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c3","location":"二年级 · 白垩纪第3站","dig":true},{"id":"niger","name":"尼日尔龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c3","location":"二年级 · 白垩纪第3站","dig":false},{"id":"corytho","name":"盔龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c4","location":"二年级 · 白垩纪第4站","dig":false},{"id":"maia","name":"慈母龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c4","location":"二年级 · 白垩纪第4站","dig":false},{"id":"edmonto","name":"埃德蒙顿龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c5","location":"二年级 · 白垩纪第5站","dig":false},{"id":"ourano","name":"豪勇龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g2-c5","location":"二年级 · 白垩纪第5站","dig":false},{"id":"europa","name":"欧罗巴龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g3-j1","location":"三年级 · 侏罗纪第1站","dig":false},{"id":"tsintao","name":"青岛龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g3-c1","location":"三年级 · 白垩纪第1站","dig":false},{"id":"saurolo","name":"栉龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g3-c1","location":"三年级 · 白垩纪第1站","dig":false},{"id":"pachyrhino","name":"厚鼻龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g3-c2","location":"三年级 · 白垩纪第2站","dig":false},{"id":"centro","name":"尖角龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g3-c2","location":"三年级 · 白垩纪第2站","dig":false},{"id":"dicraeo","name":"叉龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g4-j1","location":"四年级 · 侏罗纪第1站","dig":false},{"id":"chasmo","name":"开角龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g4-c1","location":"四年级 · 白垩纪第1站","dig":false},{"id":"nasuto","name":"大鼻角龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g4-c1","location":"四年级 · 白垩纪第1站","dig":false},{"id":"pentacera","name":"五角龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g4-c2","location":"四年级 · 白垩纪第2站","dig":false},{"id":"euoplo","name":"包头龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g4-c2","location":"四年级 · 白垩纪第2站","dig":false},{"id":"tuojiang","name":"沱江龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g5-j1","location":"五年级 · 侏罗纪第1站","dig":false},{"id":"sauropelta","name":"蜥结龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g5-c1","location":"五年级 · 白垩纪第1站","dig":false},{"id":"deinonych","name":"恐爪龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g5-c1","location":"五年级 · 白垩纪第1站","dig":false},{"id":"utah","name":"犹他盗龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g5-c2","location":"五年级 · 白垩纪第2站","dig":false},{"id":"sino","name":"中华龙鸟","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g5-c2","location":"五年级 · 白垩纪第2站","dig":false},{"id":"huayang","name":"华阳龙","era":"jurassic","eraLabel":"侏罗纪","hall":"jurassic","locationId":"g6-j1","location":"六年级 · 侏罗纪第1站","dig":false},{"id":"micro","name":"小盗龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g6-c1","location":"六年级 · 白垩纪第1站","dig":false},{"id":"yuty","name":"羽王龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g6-c1","location":"六年级 · 白垩纪第1站","dig":false},{"id":"galli","name":"似鸡龙","era":"cretaceous","eraLabel":"白垩纪","hall":"cretaceous","locationId":"g6-c2","location":"六年级 · 白垩纪第2站","dig":false}]};

;
/* Approved natural fossils; additive to the existing roster. */
(()=>{const additions={"raptor":{"id":"raptor","name":"迅猛龙","era":"cretaceous","eraLabel":"白垩纪","isDinosaur":true,"rock":"raptor","restorationOnly":false,"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.018,0.37],[0.93,0.18],[0.99,0.3],[0.98,0.67],[0.8,0.88],[0.3,0.72]],"parts":[{"id":"body","label":"胸颈","box":[615,264,1012,625],"file":"natural-r1/raptor/bone-body.webp","coverage":[[212,1],[241,3],[244,2],[245,28],[246,9],[247,7],[248,12276],[249,95108],[278,75],[279,4],[280,141522],[281,202624],[309,4],[310,32],[311,14],[312,187497],[313,206544],[338,2],[340,13],[341,1151],[342,307],[344,200522],[345,214930],[367,11],[368,35],[369,44590],[370,124792],[371,203452],[372,281358],[373,346966],[374,323819],[375,262408],[376,316706],[377,122032],[399,83924],[400,291427],[401,378208],[402,375074],[403,334841],[404,285771],[405,325977],[406,345559],[407,370966],[408,286280],[431,117934],[432,368455],[433,384817],[434,324886],[435,230935],[436,199707],[437,239282],[438,186721],[439,314685],[440,294199],[463,52148],[464,305910],[465,297988],[466,255883],[467,260059],[468,192116],[469,200343],[470,175368],[471,274875],[472,147459],[495,6021],[496,14990],[497,75499],[498,250956],[499,222687],[500,235786],[501,141148],[502,102765]]},{"id":"tail","label":"尾巴","box":[33,432,615,610],"file":"natural-r1/raptor/bone-tail.webp","coverage":[[353,16082],[354,131060],[355,161102],[356,200592],[357,235290],[358,259687],[359,254475],[360,202686],[361,126508],[362,49720],[363,3972],[364,71],[384,2205],[385,103210],[386,10948],[390,635],[391,43076],[392,134758],[393,255522],[394,347191],[395,337436],[396,264580],[397,222475],[398,215257],[399,151737],[425,115],[426,34347],[427,136537],[428,246909],[429,304672],[430,333821],[431,242757],[456,3],[457,1],[460,9],[461,31259],[462,67670],[463,76284],[491,18],[492,16],[493,2],[495,19]]},{"id":"legs","label":"后腿","box":[460,625,967,950],"file":"natural-r1/raptor/bone-legs.webp","coverage":[[491,4],[492,2],[494,1],[497,4490],[498,18047],[499,8936],[500,17929],[501,24],[502,8],[523,9],[524,2],[526,12],[527,22396],[528,156697],[529,331313],[530,336035],[531,214450],[532,316254],[533,2],[556,1],[557,181703],[558,295819],[559,254676],[560,188341],[561,186831],[562,39032],[563,285009],[564,46063],[588,25],[589,333297],[590,132642],[591,10],[592,21],[594,142767],[595,147629],[596,2],[597,3],[598,9],[620,83105],[621,359197],[622,236195],[623,173768],[624,4],[625,145],[626,323907],[627,190979],[628,38],[629,14914],[630,14327],[631,5],[652,36773],[653,335005],[654,361960],[655,35920],[656,12],[657,29],[658,22884],[659,191113],[660,241984],[661,310891],[662,170754],[663,1796],[684,6],[685,169156],[686,189607],[687,230785],[688,26],[690,14],[691,12],[692,234849],[693,391002],[694,167114],[695,61178],[696,54],[717,1764],[719,26007],[720,474],[722,48],[723,23],[724,10300],[725,311916],[726,193670],[727,243099],[728,107003],[754,72],[755,133],[756,4],[757,46824],[758,28256],[760,11301],[787,2]]},{"id":"arms","label":"前肢","box":[901,451,1238,758],"file":"natural-r1/raptor/bone-arms.webp","coverage":[[376,41451],[377,86977],[379,1],[381,54],[382,23],[383,13],[408,37860],[409,36997],[410,4421],[411,198764],[412,191235],[413,91232],[414,2472],[415,8],[440,57742],[441,26508],[442,277154],[443,105064],[444,129061],[445,311832],[446,221831],[447,93],[470,1735],[471,43938],[472,91182],[473,318379],[474,65739],[475,2],[476,21032],[477,292956],[478,54066],[479,204],[502,4045],[503,332094],[504,200030],[505,214470],[506,145076],[507,3978],[508,88],[509,135060],[510,2],[511,56],[534,2],[535,79134],[536,61535],[537,66354],[538,219732],[539,299973],[540,127738],[541,27],[542,4],[543,58],[569,1],[570,1697],[571,288942],[572,229915],[573,72129],[574,2],[600,54],[601,10],[602,12739],[603,259961],[604,35921],[605,48566],[631,10],[634,21828],[635,21068]]},{"id":"head","label":"头部","box":[1001,254,1226,430],"file":"natural-r1/raptor/bone-head.webp","coverage":[[217,32],[218,90220],[219,157460],[220,97987],[221,58488],[222,7234],[249,143929],[250,392454],[251,166455],[252,211348],[253,370434],[254,242366],[281,150436],[282,352130],[283,344362],[284,152529],[285,96687],[286,16046],[313,73801],[314,58622],[315,259607],[316,268276],[317,306764],[318,159347],[345,68131],[347,3],[349,1199],[350,9821],[351,5]]}],"face":{"file":"art/natural-r1/raptor/clean-fossil.webp"},"bowl":"art/natural-r1/raptor/grooves.webp","sand":{"file":"art/natural-r1/raptor/stage-4.webp","full":true},"skeleton":{"file":"art/natural-r1/raptor/skeleton.webp","box":[18,235,1238,950]}},"area":{"grid":32,"weights":[[212,1],[217,32],[218,90220],[219,157460],[220,97987],[221,58488],[222,7234],[241,3],[244,2],[245,28],[246,9],[247,7],[248,12276],[249,239037],[250,392454],[251,166455],[252,211348],[253,370434],[254,242366],[278,75],[279,4],[280,141522],[281,353060],[282,352130],[283,344362],[284,152529],[285,96687],[286,16046],[309,4],[310,32],[311,14],[312,187497],[313,280345],[314,58622],[315,259607],[316,268276],[317,306764],[318,159347],[338,2],[340,13],[341,1151],[342,307],[344,200522],[345,283061],[347,3],[349,1199],[350,9821],[351,5],[353,16082],[354,131060],[355,161102],[356,200592],[357,235290],[358,259687],[359,254475],[360,202686],[361,126508],[362,49720],[363,3972],[364,71],[367,11],[368,35],[369,44590],[370,124792],[371,203452],[372,281358],[373,346966],[374,323819],[375,262408],[376,358157],[377,209009],[379,1],[381,54],[382,23],[383,13],[384,2205],[385,103210],[386,10948],[390,635],[391,43076],[392,134758],[393,255522],[394,347191],[395,337436],[396,264580],[397,222475],[398,215257],[399,235661],[400,291427],[401,378208],[402,375074],[403,334841],[404,285771],[405,325977],[406,345559],[407,370966],[408,324140],[409,36997],[410,4421],[411,198764],[412,191235],[413,91232],[414,2472],[415,8],[425,115],[426,34347],[427,136537],[428,246909],[429,304672],[430,333821],[431,360691],[432,368455],[433,384817],[434,324886],[435,230935],[436,199707],[437,239282],[438,186721],[439,314685],[440,351941],[441,26508],[442,277154],[443,105064],[444,129061],[445,311832],[446,221831],[447,93],[456,3],[457,1],[460,9],[461,31259],[462,67670],[463,128432],[464,305910],[465,297988],[466,255883],[467,260059],[468,192116],[469,200343],[470,177103],[471,318813],[472,238641],[473,318379],[474,65739],[475,2],[476,21032],[477,292956],[478,54066],[479,204],[491,22],[492,18],[493,2],[494,1],[495,6040],[496,14990],[497,79989],[498,269003],[499,231623],[500,253715],[501,141172],[502,106818],[503,332094],[504,200030],[505,214470],[506,145076],[507,3978],[508,88],[509,135060],[510,2],[511,56],[523,9],[524,2],[526,12],[527,22396],[528,156697],[529,331313],[530,336035],[531,214450],[532,316254],[533,2],[534,2],[535,79134],[536,61535],[537,66354],[538,219732],[539,299973],[540,127738],[541,27],[542,4],[543,58],[556,1],[557,181703],[558,295819],[559,254676],[560,188341],[561,186831],[562,39032],[563,285009],[564,46063],[569,1],[570,1697],[571,288942],[572,229915],[573,72129],[574,2],[588,25],[589,333297],[590,132642],[591,10],[592,21],[594,142767],[595,147629],[596,2],[597,3],[598,9],[600,54],[601,10],[602,12739],[603,259961],[604,35921],[605,48566],[620,83105],[621,359197],[622,236195],[623,173768],[624,4],[625,145],[626,323907],[627,190979],[628,38],[629,14914],[630,14327],[631,15],[634,21828],[635,21068],[652,36773],[653,335005],[654,361960],[655,35920],[656,12],[657,29],[658,22884],[659,191113],[660,241984],[661,310891],[662,170754],[663,1796],[684,6],[685,169156],[686,189607],[687,230785],[688,26],[690,14],[691,12],[692,234849],[693,391002],[694,167114],[695,61178],[696,54],[717,1764],[719,26007],[720,474],[722,48],[723,23],[724,10300],[725,311916],[726,193670],[727,243099],[728,107003],[754,72],[755,133],[756,4],[757,46824],[758,28256],[760,11301],[787,2]],"total":36484600,"metric":"natural-r1"},"stages":["art/natural-r1/raptor/stage-1.webp","art/natural-r1/raptor/stage-2.webp","art/natural-r1/raptor/stage-3.webp","art/natural-r1/raptor/stage-4.webp"],"waveOrder":["body","tail","legs","arms","head"],"groove":{"base":"#9a8e83","inset":"#51483f","light":"#ded7c9"},"voice":{"file":"gallery-raptor.m4a","start":0.1021,"end":6.5885,"text":"嗨，我是迅猛龙，我给你留了一个探险搭档的位置，一起观察我的身影吧！"},"living":{"file":"../../assets/raptor-3d.webp","aspect":"1230/1278"},"card":{"title":"迅猛龙 · 白垩纪","text":"我用两条后腿走路，身后拖着一条长尾巴。真实的迅猛龙个头比电影里的小得多，认识我可要看仔细，别被电影骗啦。"},"reviveLine":"你把迅猛龙的骨架拼完整啦","eyebrow":"一块新的发现","journey":{"routes":["cedar","waterfall"],"route":"cedar","name":"森林挑战","sample":"g2-multiply","firstLevel":76},"camp":"森林挑战"},"mosasaur":{"id":"mosasaur","name":"沧龙","era":"cretaceous","eraLabel":"白垩纪","isDinosaur":false,"rock":"mosasaur","restorationOnly":true,"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.04,0.19],[0.35,0.17],[0.74,0.29],[0.98,0.53],[0.97,0.82],[0.65,0.9],[0.2,0.71],[0.02,0.4]],"parts":[{"id":"body","label":"胸部","box":[311,262,940,601],"file":"natural-r1/mosasaur/bone-body.webp","coverage":[[201,11],[210,2],[211,2],[212,1],[233,60236],[234,68101],[235,15],[243,7],[246,1],[247,1],[265,129727],[266,364718],[267,241985],[268,157288],[269,148188],[270,129179],[271,87029],[272,20154],[296,83268],[297,359348],[298,394586],[299,384699],[300,384589],[301,384734],[302,383838],[303,373407],[304,302629],[305,152707],[306,3541],[307,1],[308,12],[309,34451],[310,50755],[311,797],[327,7385],[328,293740],[329,311353],[330,348200],[331,394522],[332,394638],[333,357551],[334,377035],[335,394297],[336,404800],[337,383152],[338,277982],[339,54940],[340,15],[341,1542],[360,114781],[361,372167],[362,383542],[363,259763],[364,299857],[365,242925],[366,248836],[367,364057],[368,373930],[369,374030],[370,384626],[371,376359],[372,14033],[392,2646],[393,64583],[394,242625],[395,186837],[396,200649],[397,198120],[398,268164],[399,329368],[400,307425],[401,344081],[402,384784],[403,384578],[404,70223],[405,1688],[406,2],[426,147188],[427,147904],[428,151415],[429,191079],[430,227626],[431,249593],[432,247318],[433,112132],[434,36179],[435,142472],[436,98996],[456,1],[458,7],[459,122978],[460,164499],[461,164730],[462,134370],[463,36554],[467,26270],[468,22061],[488,9],[491,2],[492,319],[493,451],[494,97],[499,58474],[500,26418]]},{"id":"front","label":"左侧鳍肢","box":[174,473,409,694],"file":"natural-r1/mosasaur/bone-front.webp","coverage":[[391,19342],[392,168822],[393,316845],[394,56493],[421,7],[422,118770],[423,355740],[424,383329],[425,106901],[426,19167],[453,124929],[454,377870],[455,384008],[456,274802],[457,60],[484,20998],[485,362691],[486,384282],[487,356171],[488,63857],[516,133722],[517,389839],[518,257669],[519,63414],[548,68210],[549,93986],[550,935]]},{"id":"rear","label":"其余鳍肢","box":[395,381,999,860],"file":"natural-r1/mosasaur/bone-rear.webp","coverage":[[309,7312],[310,53895],[311,46734],[312,21],[339,1087],[340,214284],[341,395783],[342,394675],[343,393103],[344,149757],[372,250510],[373,311601],[374,314891],[375,170706],[376,7536],[404,42378],[405,87],[409,26],[431,11493],[432,131323],[433,264563],[434,348632],[435,217964],[436,1765],[462,6722],[463,112210],[464,376518],[465,337006],[466,205327],[467,254927],[490,2],[491,10],[492,4],[493,3436],[494,185441],[495,352328],[496,202914],[497,83571],[498,13060],[499,305742],[500,227109],[501,40461],[522,36],[523,185],[524,6340],[525,217714],[526,394486],[527,389051],[528,40386],[529,102],[530,1166],[531,208898],[532,394676],[533,357457],[534,157603],[535,417],[554,64],[555,11017],[556,277365],[557,383848],[558,384738],[559,296167],[560,22],[561,24],[562,6],[563,16666],[564,244896],[565,394307],[566,384440],[567,185321],[568,62],[569,40],[587,193271],[588,367909],[589,381564],[590,384487],[591,132381],[592,3],[593,12],[594,6],[595,9],[596,2628],[597,141300],[598,250679],[599,247622],[600,488],[601,246],[618,4],[619,321860],[620,377658],[621,361756],[622,199230],[623,304],[624,12],[625,88],[627,13],[631,1],[632,11],[633,4],[650,57],[651,332626],[652,259766],[653,82440],[654,2],[656,16],[658,19],[659,5],[660,6],[661,90],[662,48],[663,39],[683,28481],[684,1717],[685,8],[686,3],[687,31],[688,11],[689,21],[690,34],[691,11],[692,6],[693,111],[694,141],[695,20]]},{"id":"tail","label":"尾巴","box":[790,480,1232,933],"file":"natural-r1/mosasaur/bone-tail.webp","coverage":[[404,196971],[405,69105],[406,3],[407,15],[436,274208],[437,351256],[438,138538],[439,9884],[440,12],[441,17],[442,1],[468,81885],[469,303395],[470,366717],[471,325956],[472,214805],[473,116793],[474,34341],[475,10],[500,37],[501,15236],[502,108656],[503,162679],[504,277769],[505,334284],[506,352325],[507,227691],[508,40888],[510,8],[511,22],[536,34],[537,22694],[538,105603],[539,262866],[540,342413],[541,97043],[542,11],[543,29],[569,161],[570,64],[571,718],[572,137405],[573,348183],[574,59154],[575,1],[601,64],[602,221],[603,17],[604,9],[605,197790],[606,246806],[634,38],[635,13],[636,58],[637,49395],[638,324728],[639,105],[667,1],[668,20],[669,104927],[670,281933],[671,13],[697,1],[698,19],[699,18504],[700,139083],[701,321683],[702,82923],[728,3055],[729,144892],[730,232684],[731,237650],[732,145210],[733,21551],[760,77237],[761,38460],[762,17]]},{"id":"head","label":"头部","box":[35,210,381,426],"file":"natural-r1/mosasaur/bone-head.webp","coverage":[[162,3],[163,2],[166,1682],[167,4389],[168,5],[193,101479],[194,310303],[195,297601],[196,259403],[197,292552],[198,356072],[199,370934],[200,212102],[201,41986],[225,107942],[226,248936],[227,339926],[228,368311],[229,393209],[230,384773],[231,384813],[232,384826],[233,236546],[258,161],[259,15191],[260,40682],[261,118408],[262,366565],[263,384813],[264,384843],[265,255024],[288,9],[289,6280],[290,203630],[291,230338],[292,331968],[293,388103],[294,384258],[295,351769],[296,296218],[297,24794],[321,26218],[322,257798],[323,206609],[324,120374],[325,90855],[326,63835],[327,126979],[328,15678]]}],"face":{"file":"art/natural-r1/mosasaur/clean-fossil.webp"},"bowl":"art/natural-r1/mosasaur/grooves.webp","sand":{"file":"art/natural-r1/mosasaur/stage-4.webp","full":true},"skeleton":{"file":"art/natural-r1/mosasaur/skeleton.webp","box":[30,210,1235,970]}},"area":{"grid":32,"weights":[[162,3],[163,2],[166,1682],[167,4389],[168,5],[193,101479],[194,310303],[195,297601],[196,259403],[197,292552],[198,356072],[199,370934],[200,212102],[201,41997],[210,2],[211,2],[212,1],[225,107942],[226,248936],[227,339926],[228,368311],[229,393209],[230,384773],[231,384813],[232,384826],[233,296782],[234,68101],[235,15],[243,7],[246,1],[247,1],[258,161],[259,15191],[260,40682],[261,118408],[262,366565],[263,384813],[264,384843],[265,384751],[266,364718],[267,241985],[268,157288],[269,148188],[270,129179],[271,87029],[272,20154],[288,9],[289,6280],[290,203630],[291,230338],[292,331968],[293,388103],[294,384258],[295,351769],[296,379486],[297,384142],[298,394586],[299,384699],[300,384589],[301,384734],[302,383838],[303,373407],[304,302629],[305,152707],[306,3541],[307,1],[308,12],[309,41763],[310,104650],[311,47531],[312,21],[321,26218],[322,257798],[323,206609],[324,120374],[325,90855],[326,63835],[327,134364],[328,309418],[329,311353],[330,348200],[331,394522],[332,394638],[333,357551],[334,377035],[335,394297],[336,404800],[337,383152],[338,277982],[339,56027],[340,214299],[341,397325],[342,394675],[343,393103],[344,149757],[360,114781],[361,372167],[362,383542],[363,259763],[364,299857],[365,242925],[366,248836],[367,364057],[368,373930],[369,374030],[370,384626],[371,376359],[372,264543],[373,311601],[374,314891],[375,170706],[376,7536],[391,19342],[392,171468],[393,381428],[394,299118],[395,186837],[396,200649],[397,198120],[398,268164],[399,329368],[400,307425],[401,344081],[402,384784],[403,384578],[404,309572],[405,70880],[406,5],[407,15],[409,26],[421,7],[422,118770],[423,355740],[424,383329],[425,106901],[426,166355],[427,147904],[428,151415],[429,191079],[430,227626],[431,261086],[432,378641],[433,376695],[434,384811],[435,360436],[436,374969],[437,351256],[438,138538],[439,9884],[440,12],[441,17],[442,1],[453,124929],[454,377870],[455,384008],[456,274803],[457,60],[458,7],[459,122978],[460,164499],[461,164730],[462,141092],[463,148764],[464,376518],[465,337006],[466,205327],[467,281197],[468,103946],[469,303395],[470,366717],[471,325956],[472,214805],[473,116793],[474,34341],[475,10],[484,20998],[485,362691],[486,384282],[487,356171],[488,63866],[490,2],[491,12],[492,323],[493,3887],[494,185538],[495,352328],[496,202914],[497,83571],[498,13060],[499,364216],[500,253564],[501,55697],[502,108656],[503,162679],[504,277769],[505,334284],[506,352325],[507,227691],[508,40888],[510,8],[511,22],[516,133722],[517,389839],[518,257669],[519,63414],[522,36],[523,185],[524,6340],[525,217714],[526,394486],[527,389051],[528,40386],[529,102],[530,1166],[531,208898],[532,394676],[533,357457],[534,157603],[535,417],[536,34],[537,22694],[538,105603],[539,262866],[540,342413],[541,97043],[542,11],[543,29],[548,68210],[549,93986],[550,935],[554,64],[555,11017],[556,277365],[557,383848],[558,384738],[559,296167],[560,22],[561,24],[562,6],[563,16666],[564,244896],[565,394307],[566,384440],[567,185321],[568,62],[569,201],[570,64],[571,718],[572,137405],[573,348183],[574,59154],[575,1],[587,193271],[588,367909],[589,381564],[590,384487],[591,132381],[592,3],[593,12],[594,6],[595,9],[596,2628],[597,141300],[598,250679],[599,247622],[600,488],[601,310],[602,221],[603,17],[604,9],[605,197790],[606,246806],[618,4],[619,321860],[620,377658],[621,361756],[622,199230],[623,304],[624,12],[625,88],[627,13],[631,1],[632,11],[633,4],[634,38],[635,13],[636,58],[637,49395],[638,324728],[639,105],[650,57],[651,332626],[652,259766],[653,82440],[654,2],[656,16],[658,19],[659,5],[660,6],[661,90],[662,48],[663,39],[667,1],[668,20],[669,104927],[670,281933],[671,13],[683,28481],[684,1717],[685,8],[686,3],[687,31],[688,11],[689,21],[690,34],[691,11],[692,6],[693,111],[694,141],[695,20],[697,1],[698,19],[699,18504],[700,139083],[701,321683],[702,82923],[728,3055],[729,144892],[730,232684],[731,237650],[732,145210],[733,21551],[760,77237],[761,38460],[762,17]],"total":55999696,"metric":"natural-r1"},"stages":["art/natural-r1/mosasaur/stage-1.webp","art/natural-r1/mosasaur/stage-2.webp","art/natural-r1/mosasaur/stage-3.webp","art/natural-r1/mosasaur/stage-4.webp"],"waveOrder":["body","front","rear","tail","head"],"groove":{"base":"#9a8e83","inset":"#51483f","light":"#ded7c9"},"voice":{"silent":true,"text":"","start":0,"end":0},"living":{"file":"./art/natural-r1/mosasaur/skeleton.webp","aspect":"1254/1254"},"card":{"title":"沧龙 · 白垩纪","text":"沧龙是生活在海里的爬行动物，不是恐龙。看看它的鳍肢和长尾巴。"},"reviveLine":"你把沧龙的骨架拼完整啦","eyebrow":"一块新的发现","journey":{"routes":["cedar","waterfall"],"route":"cedar","name":"森林挑战","sample":"g2-multiply","firstLevel":76},"camp":"森林挑战"},"trex":{"id":"trex","name":"霸王龙","era":"cretaceous","eraLabel":"白垩纪","isDinosaur":true,"rock":"trex","restorationOnly":false,"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.05,0.18],[0.35,0.13],[0.95,0.39],[0.99,0.55],[0.68,0.75],[0.23,0.63],[0.035,0.39]],"parts":[{"id":"body","label":"胸颈","box":[338.387,239.954,779.156,609.694],"file":"natural-r1/trex/bone-body.webp","coverage":[[200,82857],[201,146746],[202,93],[205,20],[232,151189],[233,384671],[234,203104],[235,21],[264,73857],[265,359148],[266,379322],[267,72485],[275,4],[296,35704],[297,291480],[298,425244],[299,326090],[300,223521],[301,238474],[302,184761],[303,99917],[304,12290],[329,172492],[330,414043],[331,404673],[332,403363],[333,414888],[334,404848],[335,389420],[336,334840],[337,207644],[338,93680],[339,1218],[361,20147],[362,212214],[363,354715],[364,293484],[365,341851],[366,400494],[367,404800],[368,404654],[369,412896],[370,404759],[371,188036],[395,154042],[396,232444],[397,292100],[398,322212],[399,404019],[400,403570],[401,415134],[402,404891],[403,151801],[427,20838],[428,196493],[429,252408],[430,271061],[431,269452],[432,397664],[433,423692],[434,414827],[435,99226],[459,1],[460,180026],[461,197116],[462,244985],[463,343651],[464,71339],[465,348156],[466,219092],[467,109038],[492,30],[493,64343],[494,222611],[495,143679],[496,70386],[497,216636],[498,12542],[499,81129]]},{"id":"arms","label":"前肢","box":[274.169,447.203,484.337,654.452],"file":"natural-r1/trex/bone-arms.webp","coverage":[[361,125841],[362,202070],[363,756],[391,11291],[392,758],[393,279925],[394,411705],[395,124444],[422,5],[423,278792],[424,190686],[425,166506],[426,207598],[427,331332],[428,32449],[455,45557],[457,56034],[458,218107],[459,156273],[460,40309],[489,258245],[490,127084],[521,75674],[522,36611]]},{"id":"legs","label":"后腿","box":[456.12,609.694,845.32,888.945],"file":"natural-r1/trex/bone-legs.webp","coverage":[[493,28588],[494,181986],[495,134940],[496,80992],[497,186676],[498,65808],[499,1],[525,5914],[526,235318],[527,343451],[528,22442],[529,373542],[530,377423],[531,13547],[533,4],[558,15980],[559,402336],[560,128598],[561,6170],[562,199140],[563,282163],[564,21321],[587,194],[588,130398],[589,174699],[590,298086],[591,378130],[592,66769],[594,4741],[595,367396],[596,207752],[619,34094],[620,149462],[621,383120],[622,391411],[623,204095],[626,2],[627,265782],[628,253009],[652,9564],[653,33107],[654,87174],[655,42],[656,2],[657,129483],[658,202893],[659,410256],[660,405132],[661,4460],[683,1],[688,28192],[689,202193],[690,274386],[691,326913],[692,333188],[693,24677],[722,60853],[723,306],[724,87321],[725,2]]},{"id":"tail","label":"尾巴","box":[759.696,448.176,1205.33,651.533],"file":"natural-r1/trex/bone-tail.webp","coverage":[[371,121238],[372,1863],[375,12],[403,252918],[404,272139],[405,58666],[435,197425],[436,405029],[437,406314],[438,225156],[439,50259],[440,48],[467,1608],[468,98650],[469,280088],[470,371106],[471,391602],[472,321986],[473,227241],[474,185936],[475,163813],[476,124234],[477,19189],[499,65],[501,1585],[502,29796],[503,102908],[504,167607],[505,184307],[506,168617],[507,141527],[508,131663],[509,192566],[510,84646],[533,3],[542,41737]]},{"id":"head","label":"头部","box":[90.272,230.224,338.387,445.257],"file":"natural-r1/trex/bone-head.webp","coverage":[[166,2334],[167,6956],[168,22],[195,19310],[196,89359],[197,177107],[198,367908],[199,378521],[200,194423],[226,96301],[227,382456],[228,348766],[229,117441],[230,414110],[231,404800],[232,252799],[258,215340],[259,398304],[260,378364],[261,241060],[262,342095],[263,404882],[264,239752],[290,6160],[291,63161],[292,126003],[293,273213],[294,425220],[295,346721],[296,90757],[323,298459],[324,384807],[325,255820],[326,209977],[327,61700],[355,50292],[356,27191],[357,3]]}],"face":{"file":"art/natural-r1/trex/clean-fossil.webp"},"bowl":"art/natural-r1/trex/grooves.webp","sand":{"file":"art/natural-r1/trex/stage-4.webp","full":true},"skeleton":{"file":"art/natural-r1/trex/skeleton.webp","box":[86.38,222.44,1215.06,898.675]},"registration":{"scale":0.973,"x":28,"y":-50,"scope":"Native skeleton to approved clean canvas; CSS placement only, source pixels unchanged"}},"area":{"grid":32,"weights":[[166,2334],[167,6956],[168,22],[195,19310],[196,89359],[197,177107],[198,367908],[199,378521],[200,277280],[201,146746],[202,93],[205,20],[226,96301],[227,382456],[228,348766],[229,117441],[230,414110],[231,404800],[232,403988],[233,384671],[234,203104],[235,21],[258,215340],[259,398304],[260,378364],[261,241060],[262,342095],[263,404882],[264,313609],[265,359148],[266,379322],[267,72485],[275,4],[290,6160],[291,63161],[292,126003],[293,273213],[294,425220],[295,346721],[296,126461],[297,291480],[298,425244],[299,326090],[300,223521],[301,238474],[302,184761],[303,99917],[304,12290],[323,298459],[324,384807],[325,255820],[326,209977],[327,61700],[329,172492],[330,414043],[331,404673],[332,403363],[333,414888],[334,404848],[335,389420],[336,334840],[337,207644],[338,93680],[339,1218],[355,50292],[356,27191],[357,3],[361,145988],[362,414284],[363,355471],[364,293484],[365,341851],[366,400494],[367,404800],[368,404654],[369,412896],[370,404759],[371,309274],[372,1863],[375,12],[391,11291],[392,758],[393,279925],[394,411705],[395,278486],[396,232444],[397,292100],[398,322212],[399,404019],[400,403570],[401,415134],[402,404891],[403,404719],[404,272139],[405,58666],[422,5],[423,278792],[424,190686],[425,166506],[426,207598],[427,352170],[428,228942],[429,252408],[430,271061],[431,269452],[432,397664],[433,423692],[434,414827],[435,296651],[436,405029],[437,406314],[438,225156],[439,50259],[440,48],[455,45557],[457,56034],[458,218107],[459,156274],[460,220335],[461,197116],[462,244985],[463,343651],[464,71339],[465,348156],[466,219092],[467,110646],[468,98650],[469,280088],[470,371106],[471,391602],[472,321986],[473,227241],[474,185936],[475,163813],[476,124234],[477,19189],[489,258245],[490,127084],[492,30],[493,92931],[494,404597],[495,278619],[496,151378],[497,403312],[498,78350],[499,81195],[501,1585],[502,29796],[503,102908],[504,167607],[505,184307],[506,168617],[507,141527],[508,131663],[509,192566],[510,84646],[521,75674],[522,36611],[525,5914],[526,235318],[527,343451],[528,22442],[529,373542],[530,377423],[531,13547],[533,7],[542,41737],[558,15980],[559,402336],[560,128598],[561,6170],[562,199140],[563,282163],[564,21321],[587,194],[588,130398],[589,174699],[590,298086],[591,378130],[592,66769],[594,4741],[595,367396],[596,207752],[619,34094],[620,149462],[621,383120],[622,391411],[623,204095],[626,2],[627,265782],[628,253009],[652,9564],[653,33107],[654,87174],[655,42],[656,2],[657,129483],[658,202893],[659,410256],[660,405132],[661,4460],[683,1],[688,28192],[689,202193],[690,274386],[691,326913],[692,333188],[693,24677],[722,60853],[723,306],[724,87321],[725,2]],"total":43949909,"metric":"natural-r1"},"stages":["art/natural-r1/trex/stage-1.webp","art/natural-r1/trex/stage-2.webp","art/natural-r1/trex/stage-3.webp","art/natural-r1/trex/stage-4.webp"],"waveOrder":["body","arms","legs","tail","head"],"groove":{"base":"#9a8e83","inset":"#51483f","light":"#ded7c9"},"voice":{"file":"gallery-trex.m4a","start":0.1021,"end":6.7969,"text":"小探险家，轮到我来认识你啦，我是霸王龙，你可以先送我一个大大的笑脸！"},"living":{"file":"../../assets/trex-3d.webp","aspect":"1000/666"},"card":{"title":"霸王龙 · 白垩纪","text":"我的脑袋很大，两条后腿很强壮，前面的两只手臂却短短的。看这大和小放在一起，是不是一下子就容易认出我了。"},"reviveLine":"你把霸王龙的骨架拼完整啦","eyebrow":"一块新的发现","journey":{"routes":["cedar","waterfall"],"route":"cedar","name":"森林挑战","sample":"g2-multiply","firstLevel":76},"camp":"森林挑战"}};Object.assign(window.FOSSILS.fossils,additions);for(const f of Object.values(additions)){let c=window.FOSSILS.catalog.find(c=>c.id===f.id);if(!c){c={id:f.id};window.FOSSILS.catalog.push(c);}Object.assign(c,{name:f.name,era:f.era,eraLabel:f.eraLabel,hall:"cretaceous",location:"森林挑战",dig:true});}})();

;
/* Losslessly decoded R3 artwork; preserve prior brush-area weights. */
(()=>{const updates={"ptero":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.02,0.17],[0.3,0.12],[0.73,0.23],[0.99,0.38],[0.99,0.71],[0.82,0.77],[0.43,0.74],[0.08,0.59]],"parts":[{"id":"head","label":"头","box":[601.852,240.79,1074.736,471.58],"coverage":"zwG7+gUBvKYEAwMBBRuLjAEB8dMWAf7eDQGoXwIBAQEbq6wHAczhGQHH3RUBhZoFARIEAgEjGNWHEwGenBsBxfYaAb+0EgGG5gcBgkwbiYwEAdjfEgHXgBoB0OUZAeSsFQGKwxcBkfwPAZH9BwHaiAEY3eMCAbfGCQG5lgMBtaoMAebIDQHsnAwBnYYNAc2QDwHxuBAB99sJAci8AR0DAVkBygM="},{"id":"wingL","label":"左翅","box":[62.086,213.472,587.722,628.894],"coverage":"oQGuTQG1/QYBoJAIAZymBwGToAQB818EBBeKnwEBxj8BpBEB8PgBAdHgBgHd3A8Bj8sNAd7bBAEIAgkc0EIBi/0KAeDWEAE5AwQBAhvQmAcBjLYJAfTuBwHc6QIBBBgBAgEBBgEDAbi7CgGPhRQB94AVAeWnAR3d/ggBpI4YAZCPBQHn9QMc3awBAd3TCQG+9QoB6eEJFgEHmokKAcI1Ac3AAQGaxBgBz90KAY3PBBr96QMB4/4EAscZAbv7DAHP9wsB/K4NGQQBqsQHAgMXBAEBBAEB/cEBAYehAx8E"},{"id":"wingR","label":"右翅","box":[691.342,471.58,1199.08,824.83],"coverage":"lAPwRAHhxgUB38IFAbl6AQEBygEB3AEXLQELAo2yAgHVkBIB6/USAfeLBwG4jAEBiDAEAhTfuQgBmr0NAbrtCAGVlRABuZEVAZaACwH8oggB+dMLAePFEQGsrgMX83QBg/8KAdS7FwHS5gQBgYcIAY0XARkCuRgBloILAY2OBBcCAdUBAsqlBwEOARQCAwEvAYqwDAHl0gQBAhcBAfXiBgEEASQEHgHt6QoB18wBAQEWVAHm+gUCAQECAgICmywB0YEKAQEWpbECAd/wAgIEBoyIBQGOwAMW0UcDBgEBBQIBvKcEGgU="},{"id":"body","label":"身体","box":[470.914,444.262,729.964,854.032],"coverage":"8QKwnAgBrvkEHOMtAeyHAgGZSAGCmhUB6NMCHJvSBgGdwBcBwO0VAerHDQEHHMfBDgGazRoB2qAbAcexERwLAYmXFAHN+hkBi8waAY6wChudQgGI5BQBxLwZAZ/MGgG3vRUBqssBG/wEAdepEAGtjgoBuMURAZ/XFAH0jAIBKRpTAdS5DAHKqQYBpIAIAZysDwGeVAEIGqfPDQHDiBUB1RoBrPoRAZINAQcBBhrApgUB7o4GAtCsEgHwlAoCAh3U2QUBt6gEAgI="}],"face":{},"sand":{"full":true},"skeleton":{"box":[59.26,212.53,1203.79,862.51]}},"area":{"grid":32,"total":28425536,"metric":"r3-natural-v1"},"waveOrder":["head","wingL","wingR","body"]},"parasaur":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.02,0.22],[0.23,0.12],[0.71,0.24],[0.99,0.4],[0.99,0.68],[0.73,0.75],[0.43,0.71],[0.08,0.68]],"parts":[{"id":"head","label":"头","box":[76.0,272.064,524.32,480.912],"coverage":"yQEgARQBCBuDNwH/0ggBg8QRAZ7tFAGnuREBwqUQAevzDQGXNhfv5AIBnsYMAfP3FwGyhhUBh4AHAfcaAh4Bpp0GAbTcARb7iQkBq8cVAcb0EgHJvRQB3DIGBBW/vQoBi78XAb3YFQHG5BgBo40IG1kBhssTAfv9DwH4mgsBj7IFAdXuARx0AQIDvys="},{"id":"legs","label":"腿","box":[204.64,557.52,874.72,904.992],"coverage":"xwOqqgEBr8YRCogiAfsBFM+pAwHJ0xgB/98JAaeAAQWl3QYBh4MGAe3HDAHL5A0Bm4gBFIXpBgH9gBMBjK0CAbWJFgGUPQP1vAUBzsIZAcbCBAGf8QoBr8QXAbmwAhICAQcBhLQRAaH3DgEVAcG2EwGe0gYD77wDAY7rFwG0gwUBjowHAbaaGwGogxYB8AwS9dsEAcD6FQH7QgLAkg0Bpv8KBL7ZDAG1kQ4BZwHW8wQBnPkRAc3ODwHakQEQiqcDAa6LFQGV1gwDq94RAdC2DgSdlg4BrOUUAggBoh4BkegXAaz4CxDrhQUBjI8LAemiAgK4wAoB2esZAdXvFQEfAeqzAgHotA8BruMZAdGrCgIjApi2DgGb5xEBBBOd1QEBtbAFAardAQEUAfbKAgHZqAsBtPALAZVPAQcBFAHxmgEBiuYUAYrKGQG9YxsEAt6lCAGRuhMB2KcRAczqAR4xAccK"},{"id":"tail","label":"尾巴","box":[768.16,493.68,1214.56,702.528],"coverage":"kwO1YwF3H7zSCAHj8BIB8NsEBAQa3c4DAfSxGgHe8RkB4r8NAbxXAgIBBhrrrwYB7MUTAd7AGgHQiRYBopsHAdkFHKUsAY7FBwGY4hMBjvcaAbK/FAGV8AgB23MCBAG6xwEZIwH8kQQBwdYLAdzWEQHh9hMBmd8PAfLtCwHbsQU="},{"id":"neck","label":"脖子","box":[244.96,373.296,403.36,578.496],"coverage":"pgKuugQBnskBH9HiEQHQ+REBJh68tQwBk7EaAaroAwH7AQH1BxzCtQcB+dcZAfKuGAGTwhUBjvAEHMhZAdiBDgGAghYBwo8aAdtsHYwRAa2cBQHMvgs="},{"id":"body","label":"身体","box":[351.52,411.6,786.4,708.0],"coverage":"ygImAdYBAf2MAgHsgQUBg6kDAe9IG87/BwGw4BQBvIgaAbLPGgHEoBoBsJ0YAamREwGHgQgBymIYqtIVAdvzGgGZ2RcBiu8YAbqGGwGmxxoB15wbAYCcGwHS5RYBseUGFsx2AeyEGAGvnBQBhPASAfrgFAG4wRkBtZUaAdruFwHbnBsB15wbAf7DEhXWGwHa3Q8BudsTAYOWEwGr0xMBm/oUAZ/JFwGUiAkBgu0YAZ2bGwGV/hQB/vIPFomxDAGRug8Bp9IRAbubEwGythEB8IgGAcb9DwHa2QUBjpwCAesNAfBbARAWs0EBw40JAfD8DAHl3gMBirgFAbeEARzQrgUBBwFpHgE="}],"face":{},"sand":{"full":true},"skeleton":{"box":[71.2,265.68,1223.2,913.2]}},"area":{"grid":32,"total":47801628,"metric":"r3-natural-v1"},"waveOrder":["head","legs","tail","neck","body"]},"compso":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.04,0.21],[0.3,0.13],[0.7,0.25],[0.98,0.39],[0.99,0.66],[0.73,0.76],[0.32,0.75],[0.04,0.62]],"parts":[{"id":"head","label":"头","box":[86.11,289.752,271.39,406.14],"coverage":"4wEYAeSDBQHwxAsB39MFHOz0AwGznhEB4aoWAZb5GQGVyAgco4wKAd2mFAHu7hABsLgKAZ4OHJriAQH95gE="},{"id":"tail","label":"尾巴","box":[661.25,485.322,1231.565,569.274],"coverage":"kAP9RAHI/AYBwcgDActnAYgDAbEBAWsBxwEBDgGDAQGVARbZ0gIBnuwTAZrSFQHXshUBsJUUAYH4EgHVoxEBpYEQAb6uDgHUhQ4Bs+AMAcXYCgGoiwoBlocIAYWqAxKKDwG4hQIB8boDAbDeAwHz8QIBhNABAf8dAZsBAToCAgEBAQoBhwEB590BAaB5"},{"id":"body","label":"身体","box":[234.72,301.2,809.86,958.506],"coverage":"5gGWKQH/CAQCG5OpEAHjgwoDigEHBAMCEuqxBQG1kBYB5woBAQEBBgUCBgEGE+rQAwGWqhUB/gMCAQFVAVsalc4GAZSbFAGOSgHa6gQB/8cMAZvAEQGmsQ8BwMIMAZW4BwGOxgEBAhbCkAIBjsETAeKUGAGp9hgBzLcWAb/aEgH5sBMBzK0YAeqWGQGXphcBs5MOF8aEBQHhvxkB7NMPAauNDgHh6AwByucLAdSPDAGxqBkB0ocZAcXTEBe/hwMBxMUUAdeQDQGS1QwB4s4IAZvxAgG91hEB9P4PAZ2QFQGZzwYBPhW3+AcB/5cJAeupCwGesw0B1LEEAdXFAwG6ghUBvrQCAaeoAQGd0Q8BDwEHAXEBNQElEQkB/PwKAaigCQGhtAoBBwEBAfzACgHRkxQBBAEMAbfLDwHw+gYBHgFoATYBEhJQAfjWCAGnqwMBJQEJAZCXAwGpihICBQHKnAkBhfEYAam1BQE8AVYBIxMDAmkBbgKAnQ8B1nAB4QMBnC0Bp+AKAezwEwGvuwMTBAEDAjgB6QEBwQMBBgGvuQsB3oMLAa8BATYBKQHrnAIBj/gTAaiYCRMCAlYBtQIBnwMB4g4B8oQRAdCWBgEHARcBhwIBDAGt6QUByMcSFRABmVIBrjgBwIsQAcGoBwEKASMBnAEBFAEcAToBo7ATAa+gARIFAqjmBgHL5hQB3dgYAaLjEAG/CQEJAR0BDAKN4wEBvIcFAb/QFwGclQgSBALhAQG91QQBhIcEAQwCDQEEAt21AgHEgQ4BqfgXAbv0DgGAShIEDMGQAgFw"}],"face":{},"sand":{"full":true},"skeleton":{"box":[82.25,282.12,1238.32,964.23]}},"area":{"grid":32,"total":27911309,"metric":"r3-natural-v1"},"waveOrder":["head","tail","body"]},"allo":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.025,0.2],[0.25,0.12],[0.68,0.24],[0.98,0.4],[0.99,0.67],[0.74,0.76],[0.35,0.72],[0.03,0.62]],"parts":[{"id":"head","label":"头","box":[39.3,262.68,299.98,487.32],"coverage":"wwEGApPjAgGsTRzaqAEBmKQEAeOHDwHJqBgBxP0WAaSLCBrH+gYB0NsYAfvMFgHb5A8BzKkZAYOpGQHzoAga/uwSAaWmGQG90BgByK0NAdDQGAHVqBkB2fcEGvnPAwHGlQgBpN4JAdbREwGmqRkBv8YPAeBdGu3NAgH2xBYBtYAXAaG4DQGVzQkBmkkbsxIBzuQGAbuTAQ=="},{"id":"legs","label":"腿","box":[446.98,533.4,851.72,945.24],"coverage":"rgOTLwHMmAkBgPEJAYDxCQGP7QUc6oYDAeGKEwH4qBkBr9EYAaOYCBuF9QUBteATAYOzEQHNpxkBpeMWAcbwAhoDAaXJEQGE8hgB8IgBAd+TDAH0nRQB1pgLG5jrBwHW8hcBirMIAdjXCAGSixgB87QRAawVGAYD9/oJAf7QFQHl7gIBl7cJAZyHFAG0gwwBvAwYz0YBsaoCAbTCDwHI1RcBlIcCAshXAeyqFQHA2hEBFBb93AQBx+wRAZKkGQHYoxkBqeIIASIDkdwIAbbbFwHMDRadhgEBq/YFAe7TBwGsyg8BhzUD0SsBw/MIAcyoGQHGqAgYAQHfTQEHAQcB87oKAYX7EwHYxhcBt8sYAa+uDRocAqT0AgE3AZTOCgGu6QkBxrcDGgEFEQ=="},{"id":"tail","label":"尾巴","box":[721.38,504.6,1224.12,712.92],"coverage":"kgOeOQGSNx/ZywYBwY0TAaW+BQFCHa3dCgHnwhgB8tUYAdXGEQGM8gYBnD4bk8oBAav1CAHlkxEBy40YAfCfGQGughcBpbARAcqaDQGbyQkBjZoGAeahARgdAcKbAgGIhAcBr4sLAb2xDgHSqg8Br+QOAcKyDgGzlw8B9uQNAd+YAx/oGQGO1AgBjE8fzQYBpB4="},{"id":"neck","label":"脖子","box":[285.28,279.0,419.54,495.96],"coverage":"5wGHtQcB3f0FH4DbEAGMsRcBh9IGHrebCwHTnRkBlL0UAZt9HYqTBAHT8BYBq4EZAZKEDR0EAcbBCwGomhcBhPkOHtEDAZq/CgHgZg=="},{"id":"body","label":"身体","box":[255.88,399.0,759.6,694.68],"coverage":"xwIYA+y8BAGX2A4BqPIOAdiqCwHfpQQBBxgGA9OqCgHjqRkB/KwZAeGpGQH93RgB2IMRAfCMCAGudRYKAfDiAQGphg4Bw8EYAZepGQGGqRkBzKkZAZWqGQG6qRkB96gZAZHrFgHZ5AsBhzQUAgGtpAYBsf4WAfKLFgGrjxYB/YYWAfKYGAHLmxgB4ZIPAcDpDgG46Q4BsqEMFKtqAcytDQH85Q4BytEGAafqEwGylA0B0egPAcfCEgH57wkYy/cFAZ6LEAHFHwHQqQ0B4PwGAYKGBwG03QYBz/MBGQ0B12EB66kFAe+HEwGcgwIexlkBqfAEARYBCQ=="}],"face":{},"sand":{"full":true},"skeleton":{"box":[34.4,255.0,1228.04,951.0]}},"area":{"grid":32,"total":46056587,"metric":"r3-natural-v1"},"waveOrder":["head","legs","tail","neck","body"]},"trike":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.02,0.2],[0.23,0.13],[0.69,0.22],[0.99,0.39],[0.99,0.67],[0.75,0.76],[0.32,0.72],[0.02,0.62]],"parts":[{"id":"head","label":"头","box":[45.505,295.07,481.86,639.59],"coverage":"4gEOAQsFjcQBAe+LBAHOngIBARfiVAHJxwsBqYcHAdgEAvTTBQGcrxYBsdkYAcyIFgHBkgYWudcFAfG6BgGvmQEBq5YOAdmDEQH5qwEB2LEOAa2+FwG4ixgBuIsYAbenFAEMFZQTAc2tCQG97xQB7esOAcz+EQH6jxMBx+0WAaGMGAHA2hgBx9oYAcmfFwHVYBUGASgB8uEBAb6+EgHY3xcB44wYAaWMGAGyvxcBu4sYAbiLGAGAhBUBvKUFFYcSAYeKEAHWkwgBiowQAcTaGAH42hgBt9oYAYqMGAHA2hgBvNoYAaO1FQHoxwMWmZgMAbiLGAHA2hgBn9wYAdLbGAHH1RgB+voUAZ3XGAG1rBgBvqsPFvtFAejUFgGh5BYBxvQOAaeHEQG4ixgB0c0RAYDACgG8zRMBjsQNAYFNFogVAemuDAHsgg4B99gSAb65EgHTpw8Bo6QCAf8EAdqpAgHxBRmQ3QIBvK4B"},{"id":"forelegs","label":"前腿","box":[228.715,579.2,533.08,868.28],"coverage":"ygOkswQByccFAa+XAh333AUB2dIYAb/bGAH4oAsdrdQHAen+EAGe7w0BuucTAa2GAhvlrgMB9NwWAZb6DAGihgEBguQXAcfgCxnnIQG13QoB/NoWAf+qBwEEAb6ZAQGuhBgB7NEEGLMzAZfSEAGAjRgB2MkOA4u3BwGwvRcBgoMDGeL6AgHulQgBs/UCAYkNAc+TCwGKrRYBipMWActfHL4oAbbZCAHT5A4BtIEOH7QTAc4R"},{"id":"hindlegs","label":"后腿","box":[602.03,549.5,985.195,917.78],"coverage":"0QPLxwkBwqIWAbiLGAG4ixgBmcALG5ubAwHPqRAB9IIPAaf2CgGF2BgBh6wOAe0LGuvBBAHdvRcB94IIAa6zBQHXihgBpq4PAd04GpvFAQHy2xQB7NEMAaeZAQHT9xIB1tEYAfjVBwEKAQEZs+oIAeb/EQGZBwGgAgG74QQB+/wUAeCHDgEwAQoXvZ0BAfKuDgHEshcB/aMBAgUBg74JAaeGGAGYmQIX6YYGAcuaFQGHiRgByPsLAQECAwHSxAYBttoYAfDNBxj67AMBzq4IAai6AQOP5QMB16kTAZeGGAGRlxAaAgIFAdm9CwHDnw0BjsgPAZC/EgEbGgQBBgKGyAEBnDMByWkBAQ=="},{"id":"tail","label":"尾巴","box":[850.25,500.0,1218.64,725.72],"coverage":"lgO1fh+URwHirBQBjMEFAQIdx88EAcW6FgG++hYBuu0LAb0xHIg0Aaj+CQGa7BMBk6sYAY72EQH8jQQBBRzBjQEB7/oHAemUEQHD+xUBjcIQAeKjCAHnnAEaAQEDAScB/LUBAYTyBQGduwkB2JMLAe2bCBsBBaORAgGPAw=="},{"id":"body","label":"身体","box":[406.015,388.13,891.62,698.0],"coverage":"rwIMAVIBDBvn1AEBgcQHAdHFDQGBihIBzaASAbeBEQHazAsB8sEDAb0BGK/IDgH0hBcBjYQYAZzSFwHp6hcBiZ4XAZLzFwHGvRYBpoYOAer+ARbQHwHvwhQBgrYYAdvOEwGEzxMBwOESAZWTFQGhnBgB4dQYAefaGAG3qxMBgIwCFZKMCQH7/xcBoP8WAbP3EwGuoxIBwPERAc7sFAHj2RUB280YAencGAHFkxgB0moU1roEAc72EQHhlxQB8awVAafkEQGCoBAB0qYQAf35BwTSlAIXjpYGAcOFEwGFnA4B8YcQAfHGDAGbKRugKwG2twgBrO8NAf3YCgHRgAId6y4B6ZAGAaaiAg=="}],"face":{},"sand":{"full":true},"skeleton":{"box":[42.55,292.1,1224.55,920.75]}},"area":{"grid":32,"total":62266236,"metric":"r3-natural-v1"},"waveOrder":["head","forelegs","hindlegs","tail","body"]},"anky":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.02,0.25],[0.25,0.18],[0.7,0.28],[0.99,0.44],[0.99,0.63],[0.78,0.72],[0.32,0.66],[0.02,0.58]],"parts":[{"id":"head","label":"头","box":[49.55,482.17,248.54,616.81],"coverage":"gwPlngIB0PQJAamTCgHN1wIb+1sB+eQNAa7yFwG3jxgB39kYAZi9BxuMkwsBqb4XAdeMGAHGvhcB3dQWAa+qAxumiAEB29QHAYWRDQGkrg4Bs5EBARY="},{"id":"club","label":"尾锤","box":[1084.1,604.93,1219.73,724.72],"coverage":"+wO/CQHTlQkB8YkJAY8hHci+BgH5wBcB/4sYAa2BFAHREhyjkQMBtsYXAdfaGAHW8BIBuRId7ucEAcibCAH0UA=="},{"id":"forelegs","label":"前腿","box":[203.0,598.0,451.49,752.44],"coverage":"5gMHAcX5BwHCjw0B0P8LAbf+BBv4GAHyjw4B2/8RAbH5BAH3OgHhkRMB3ZQEGqmPCgGw9RcBhegBAvjsBAHauhYBlKEBG5InAsKqAQGOmhMBsMwSAQsesAoBjik="},{"id":"hindlegs","label":"后腿","box":[506.93,543.55,808.88,815.8],"coverage":"rwPJeAHZpgIB7mQdiHQBl8ESAd++FwGj1RcBwvsDG8chAbWUDgGR4hUBrNcOAZi/EAHglA0Bl5YBGr5VAZeXDQHZuQ8B8NELAbrJFQHrpwcB7XEby9wJAYipEwGipwEB3JsPAcfoFQHShAUBARgbAcGoDAHvkBcBlp0LAQUBCQGysQgB5aoXAazhARgGAcyjAwH+wQkBxvEBAQYCreALAYi9FwHAhwgdCgGN5gUB5PQJAdr6Bg=="},{"id":"tail","label":"尾巴","box":[747.5,503.95,1084.1,683.14],"coverage":"kwOLjwIBtxMf9OwWAa+QDQGOfx7XoxYB040YAdrnEgGa4wQd0fAIAc/jEgHX+RcBhtMXAb7UDgGWpwQBRRvaHQHOigUB8vsNAcfKEwGB5xYBlbQTAcLzDgGtqQkc5QIB0ZYBAbD7AwGurgUBuYME"},{"id":"body","label":"身体","box":[163.4,384.16,797.0,661.36],"coverage":"qwKPAgGcqgEBrQIBDRvovQYBn74NAfKiEwGjzhcBuMMPAc/EDQGU7QkBgxIBFBUEAcSzAQHr+w4BtpcXAbqKGAHZwBcBrY0YAeOQGAHUsxcB3IwYAZboEwGmkA4B3aoFFIiBDQH2mBcBwd4YAaqOGAGu3RgBy4UYAb3RGAGQ2RgB+YwYAZDdGAHsjhgBkNwYAazNFQHa8gYB/RsSvKARAcSQGAGT2xgB2YYYAbe2GAGmxxUBtb8UAfaXFgH/vxcBkNYXAf3kFQGV+BcBsNwYAaeeARPVmgoBorYVAeCKGAG/vhcB1YUSAcOCEgH7tBABovsRAaOyFQHfvgUCrDcBnMYRAdCYARGmBQICAfZpAYqUBgHeggYBl4UMAfr/DgGBpxEB0fUQAZmyBQTlGgGHCBe76QIB0vgIAaa7BwGquQU="}],"face":{},"sand":{"full":true},"skeleton":{"box":[44.6,375.25,1227.65,820.75]}},"area":{"grid":32,"total":43614215,"metric":"r3-natural-v1"},"waveOrder":["head","club","forelegs","hindlegs","tail","body"]},"stego":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.02,0.2],[0.2,0.14],[0.62,0.2],[0.99,0.36],[0.99,0.68],[0.72,0.77],[0.31,0.7],[0.02,0.61]],"parts":[{"id":"head","label":"头","box":[1122.6,605.55,1238.24,717.1],"coverage":"/APapAIBys4BH8WfCQH1gBcByp0LAaEkHe3nAgG9xxIByeAWAeXWCR4DAalRAdx1"},{"id":"hindlegs","label":"后腿","box":[478.74,557.05,779.6,915.95],"coverage":"zgORzQ0BgOITAcfcEQGt4wIcvIYFAd/9FAHAoBgBtaQVAfa6Ahz1jQsBxdYHAbKMDwGr8QsBudIOHNtvAbzrFQGBmw0B18kKAZm5FRsCAfCZBwGAsxgBk64FAZbeBAHKgBkBp84BGqnlAQGRqRQBhtEHAhAB5rwVAdrIAhqZ3QcB5IgZAbpnAQMBk7cBAeLaGAG/sggar8EOAYjZGAGE3wwCvQoBqsoXAciPDwHqBxmEGwHn/gUB0a0FAoXnAQGC/hcB8JkYAYS+DB0MAeb4AQHK9gIB7JoB"},{"id":"forelegs","label":"前腿","box":[827.62,688.0,1118.68,939.23],"coverage":"tQSpuQEBzogGAa3ICgGQjwsBn9MBHOz0AgGF9A4BleQTAbfoFgGIjAgci+8NAeXKFQHtZQHuyA8B3tUHHLjLCgHNkxACu+IOAdycFAHHIRuSogQB2egWAfePAQHcGQHMwg0BjIkRAdIQGvigBQGK2xgBsrMKArWZAQGD0hgB7t0OAdWyARnIggQB8PsOAc+eEAHmXQHHQgGXvw4BraMRAaqaBA=="},{"id":"tail","label":"尾巴","box":[56.36,426.1,584.58,630.77],"coverage":"wwIJAcgXHZEEAbAUAa/gBgGYjwcBMBzcAgHJ5QgB94oOAf6FDwFaAQ4FuG8BiuQGAfGRCgG4rAITydkCAdqrCgHRkxcB46UWAazKDQHhswwCyrwDAcjmCgHhshEBg6UYAayjGQHZrBkBm4UPFCEBguwBAZOHCAHS1BEB69EWAfDjFAGo2BgBkdgYAdnWGAH7nBgB97IXAaKMFgHa9QcYvH8B778EAabmBgGP3AcBg9YIAbOsCgGlxQsByecHIIoC"},{"id":"plates","label":"背板","box":[261.18,300.0,1122.6,653.08],"coverage":"7wHQCAGl8AIBAhux3gkBx4EJAbegBQHbgAkBxboYAZ3ECwGUIAHYgA8BnYkBF5rqAgG0wQwBs9oYAZewFwH01BgBwdoYAZPaGAHB/hIB4tkYAaudDAHE4AMBqKMBFITgCwG5lBIByekYAairGQHIqRkB3qkZAcKpGQHyqRkBwKkZAcipGQGnmRYBiPkVAdG2DRLC1QMBs6IFAeycEwG+2hgBuNoYAam0FwHA2hgB9qkUAa/TEQHLxBgBpawUAcyIFQGx3RQBwtoYAfrqFwG65QYB3eQDDqNPAZH8BQH/owwBq7kYAZvpEQGSuRcB2fcNAdvdBQH/xQYB/YwGAaqVBgH20QYBv+4HAcjBCgGKpw4B9sMYAbHtFAGypBgBqrANAZ+gBA36lAUB9N0VAYCNEgGM4AwBxrcCAY4tCrHlAgGd4QYBwrgTAbLEFgGZ7Q8BuOEFDMmbAQHe8AMR78IEAbmREAHEiBQBwP8GAeACHagxAbHfCAHIjBIB2+wJH7uWAgH8vgc="},{"id":"body","label":"身体","box":[512.06,480.42,1122.6,746.2],"coverage":"jQO78wIB/OcPAb/DEgHwwxIB0IsSAbrqEAGnlg4B0YIGAdcVGbKkCgHJqRkB56gZAe+CGQHUnxYB0eoXAamnGQHNwxYB5PoNAa2cBQFFFv9UAcD4BAGP8wQB7KgRAbfGDwG67A8B/+ATAeufFgH/2RgBg8cYAd3hEgHnqAMY79YJAcnxEAGK6w8BnowPAaW6EQHSsxUB/P0YAfGqGQHWuRgBw64MAa2mARKVAQTkigQBj/YNAZSiEAHGyg4Bh8APAZCjDwH+mhABtNkYAdb8FgGk1xgBmMIWAYf3BxW6kQMB8aMIAbivDQGo5Q0B0acNAbjSBQGPhwwB2MsNAfitCAGu7QcBwsMIAZvDAxX6AwGN2QIBkLICAbSWBwHf2QYEmzgcBQ=="}],"face":{},"sand":{"full":true},"skeleton":{"box":[49.5,295.15,1245.1,945.05]}},"area":{"grid":32,"total":66854281,"metric":"r3-natural-v1"},"waveOrder":["head","hindlegs","forelegs","tail","plates","body"]},"mamenshi":{"art":{"mode":"natural","geometry":{"x":0,"y":0,"scale":1},"skeletonSize":[1254,1254],"interior":[[0.055,0.3],[0.16,0.19],[0.8,0.2],[0.975,0.28],[0.975,0.53],[0.88,0.6],[0.38,0.6],[0.055,0.49]],"parts":[{"id":"head","label":"头","box":[87.81,368.62,165.3,444.88],"coverage":"ogK4BgHHlwkB7KoCHpO2DgHe/RYBq9oDHqPMAgGNPw=="},{"id":"legs","label":"腿","box":[381.705,509.05,838.14,727.6],"coverage":"kAPPEgHPTgHlERnG7AIBhMYHAerEEAGQjAMCrpUGAfqQFQGn6hIBhq8KGMKzCAG2qg8BtKgPAf6jAwLyrwIB9JEVAavnCQGkvgkX0DcBj8wPAY/FBQGplxAB28wFAqzmBgHWtxEBkAMB8p0UAYqXBRXtYwHzkhEB64oNAuL6DAHjmAYCtysB9tQTAbUdAeI4Afz+EgHUkgMU1gEB59gDAaaqAQGEzwQB9rIWAYfsAwKemAQBq8kZAYfrAwHFgAIBk7wVAd6PBxcYAZcBAQICoogDAbmQBwGchAICrgEBNg=="},{"id":"tail","label":"尾巴","box":[765.375,493.24,1193.46,581.59],"coverage":"kwPYlwEB3ZoCAS4e2J8KAZygFgGUhxQBhLYPAcDlCgG2jgYB8b8CAYBSAcgwAdkEASIW2gEB9mEBycoCAd7HBQGgpgkBlaALAYXRDAGZywwBxtwKAfrVBwHw4gQBl2o="},{"id":"neck","label":"脖子","box":[165.3,367.69,498.885,536.02],"coverage":"pAKb/AgBzPMLAaGLCAH1Rh2P9wUBwfEIAbCtEwHI3hUBtcAIASMcAgEUAb2XBwHWphgBoroNAd/3Ah7s5wIB+OwRAaDDFgGM/xIB4qMMHTwBsoAEAffECQG+6Qs="},{"id":"body","label":"身体","box":[490.38,454.18,765.375,602.05],"coverage":"7QLslQEBseoEAef6BQHQuQUBmZUCAQEanNkGAcGDFgGkhhoBjPEZAeLQGgG4ghgBnKMPAc+SBBmM7AcB7/gFAaXLEgGY0xMB18UOApzgBwHB/gIZmdQDAtT5CgGA0Q8BpYEGAuJiHM2CAQG+ggIBDg=="}],"face":{},"sand":{"full":true},"skeleton":{"box":[84.975,364.9,1197.24,727.6]}},"area":{"grid":32,"total":20095307,"metric":"r3-natural-v1"},"waveOrder":["head","legs","tail","neck","body"]}};function decode(encoded){const bytes=atob(encoded),out=[];let pos=0,cell=0;function read(){let value=0,shift=0,byte;do{if(pos>=bytes.length)throw new Error('Invalid fossil coverage');byte=bytes.charCodeAt(pos++);value+=(byte&127)*2**shift;shift+=7;}while(byte&128);return value;}while(pos<bytes.length){cell+=read();out.push([cell,read()]);}return out;}for(const [id,patch] of Object.entries(updates)){const f=window.FOSSILS.fossils[id];if(!f)continue;const prefix=`art/natural-r3/${id}/`;patch.stages=[1,2,3,4].map(n=>prefix+`stage-${n}.webp`);patch.art.face.file=prefix+'clean-fossil.webp';patch.art.bowl=prefix+'grooves.webp';patch.art.sand.file=prefix+'stage-4.webp';patch.art.skeleton.file=prefix+'skeleton.webp';const weights=new Map();for(const part of patch.art.parts){part.file=`natural-r3/${id}/bone-${part.id}.webp`;part.coverage=decode(part.coverage);for(const [cell,weight] of part.coverage)weights.set(cell,(weights.get(cell)||0)+weight);}patch.area.weights=[...weights].sort((a,b)=>a[0]-b[0]);const migrationAreas={...(f.migrationAreas||{}),[f.area.metric]:f.area};Object.assign(f,patch);f.migrationAreas=migrationAreas;}})();

;
/* Existing fossil art joins the forest challenge without changing saved records. */
(() => {
  'use strict';
  const fallback = {routes:['cedar','waterfall'],route:'cedar',name:'森林挑战',sample:'g2-multiply',firstLevel:76};
  for (const fossil of Object.values(window.FOSSILS.fossils)) {
    if (fossil.journey) continue;
    fossil.journey = {...fallback, routes:[...fallback.routes]};
    fossil.camp = fallback.name;
    const item = window.FOSSILS.catalog.find(entry => entry.id === fossil.id);
    if (item) Object.assign(item, {dig:true, location:fallback.name});
  }
})();

;
(() => {
  'use strict';
  const {fossils,catalog}=window.FOSSILS;
  fossils.spino={
    id: "spino",
    name: "棘龙",
    era: "cretaceous",
    eraLabel: "白垩纪",
    isDinosaur: true,
    rock: "tide-slate",
    excavation: "tide",
    camp: "潮汐岩滩",
    eyebrow: "潮汐岩滩的新发现",
    reviveLine: "你把棘龙的骨架拼完整啦",
    card: {"title": "棘龙 · 白垩纪","text": "我的嘴巴细细长长，背上的长骨刺撑起了高高的帆。伸开手指竖起来，试试能不能比出我的大帆！"},
    groove: {"base": "#364a43","inset": "#23372f","light": "#9cb3a3"},
    voice: {"file": "gallery-spino.m4a","start": 0.1021,"end": 6.4714,"text": "小伙伴，我是棘龙，愿意陪我在这座小岛上看一看自己的特别装扮吗！"},
    living: {"file": "../../assets/spino-reference-v1.webp","aspect": "1774/887"},
    stages: ["art/tide/spino/stage-1.webp","art/tide/spino/stage-2.webp","art/tide/spino/stage-3.webp","art/tide/spino/stage-4.webp"],
    art: {"mode": "natural","geometry": {"x": 0,"y": 0,"scale": 1},"skeletonSize": [1254,1254],"interior": [[0.035,0.39],[0.18,0.23],[0.39,0.16],[0.73,0.23],[0.91,0.25],[0.98,0.43],[0.93,0.63],[0.75,0.69],[0.21,0.69],[0.05,0.58]],"face": {"file": "art/tide/spino/stage-4.webp"},"bowl": "art/tide/spino/grooves.webp","sand": {"file": "art/tide/spino/stage-1.webp","full": true},"skeleton": {"file": "art/tide/spino/skeleton.webp","box": [53,317,1201,848]},"parts": [{"id": "head","label": "头骨","box": [53,452,371,628],"file": "tide/spino/bone-head.webp","coverage": [[357,30505],[358,93140],[359,92585],[360,11279],[387,28488],[388,146732],[389,333562],[390,353853],[391,376590],[392,280174],[393,12248],[417,141273],[418,289705],[419,302054],[420,199919],[421,329619],[422,382435],[423,180091],[424,334051],[425,110390],[449,40645],[450,20888],[451,84940],[452,261995],[453,284117],[454,125142],[456,82903],[457,8093],[481,668],[482,255556],[483,165523],[484,18998],[514,18]]},{"id": "body","label": "背帆和胸骨","box": [235,317,772,848],"file": "tide/spino/bone-body.webp","coverage": [[269,94383],[270,182531],[271,163716],[272,115087],[300,172132],[301,231250],[302,201203],[303,199066],[304,250694],[305,91703],[330,4],[331,162725],[332,215404],[333,171505],[334,170985],[335,177920],[336,187005],[337,246891],[338,63945],[362,43242],[363,225868],[364,202835],[365,142972],[366,148155],[367,164268],[368,187609],[369,207147],[370,167418],[371,9],[394,153398],[395,174592],[396,286690],[397,250950],[398,270839],[399,279644],[400,187524],[401,164423],[402,211600],[403,56886],[425,151474],[426,296053],[427,362335],[428,383993],[429,384609],[430,384719],[431,384262],[432,378671],[433,342866],[434,258196],[435,114756],[456,23035],[457,309467],[458,394605],[459,384441],[460,351364],[461,338242],[462,342573],[463,338528],[464,353900],[465,384974],[466,365553],[467,174901],[488,830],[489,304840],[490,394645],[491,258054],[492,193572],[493,247832],[494,211753],[495,195713],[496,142696],[497,139139],[498,16192],[520,16764],[521,279338],[522,316672],[523,191215],[524,164727],[525,195072],[526,86923],[527,19468],[551,81154],[552,289802],[553,126847],[554,65833],[555,337998],[556,131851],[557,66004],[582,136887],[583,285223],[584,19725],[585,14420],[586,244704],[587,181819],[613,31],[614,209801],[615,105895],[616,29443],[617,282476],[618,205401],[646,23986],[647,1769],[648,160414],[649,244827],[650,34611],[653,6027],[680,26081],[681,36453],[682,17843],[685,3653]]},{"id": "legs","label": "后腿","box": [538,575,778,848],"file": "tide/spino/bone-legs.webp","coverage": [[466,19219],[467,80434],[495,12],[496,100017],[497,245677],[498,257189],[499,202411],[525,12675],[526,89551],[527,96052],[528,285817],[529,257985],[530,68269],[531,8661],[557,8562],[558,11667],[559,298235],[560,84097],[561,224353],[562,193955],[591,173235],[592,99252],[593,49923],[594,279137],[595,17998],[623,116705],[624,188697],[626,134799],[627,196937],[653,29376],[654,183762],[655,326932],[656,53456],[657,21216],[658,194085],[659,221907],[685,91],[686,35472],[687,12325],[689,49361],[690,115279],[691,94771]]},{"id": "tail","label": "尾巴","box": [765,510,1201,645],"file": "tide/spino/bone-tail.webp","coverage": [[435,68878],[436,70149],[437,71559],[438,61549],[439,57361],[440,82481],[441,45601],[442,9712],[467,125723],[468,327777],[469,294808],[470,289901],[471,286245],[472,286387],[473,274295],[474,246566],[475,161810],[476,69822],[477,5299],[499,59741],[500,258474],[501,260228],[502,248451],[503,249629],[504,233747],[505,208560],[506,203858],[507,170446],[508,175589],[509,151815],[510,43559],[531,10500],[532,44202],[533,53247],[534,55259],[535,42368],[536,17605],[537,497]]}]},
    area: {"grid": 32,"total": 36415589,"weights": [[269,94383],[270,182531],[271,163716],[272,115087],[300,172132],[301,231250],[302,201203],[303,199066],[304,250694],[305,91703],[330,4],[331,162725],[332,215404],[333,171505],[334,170985],[335,177920],[336,187005],[337,246891],[338,63945],[357,30505],[358,93140],[359,92585],[360,11279],[362,43242],[363,225868],[364,202835],[365,142972],[366,148155],[367,164268],[368,187609],[369,207147],[370,167418],[371,9],[387,28488],[388,146732],[389,333562],[390,353853],[391,376590],[392,280174],[393,12248],[394,153398],[395,174592],[396,286690],[397,250950],[398,270839],[399,279644],[400,187524],[401,164423],[402,211600],[403,56886],[417,141273],[418,289705],[419,302054],[420,199919],[421,329619],[422,382435],[423,180091],[424,334051],[425,261864],[426,296053],[427,362335],[428,383993],[429,384609],[430,384719],[431,384262],[432,378671],[433,342866],[434,258196],[435,183634],[436,70149],[437,71559],[438,61549],[439,57361],[440,82481],[441,45601],[442,9712],[449,40645],[450,20888],[451,84940],[452,261995],[453,284117],[454,125142],[456,105938],[457,317560],[458,394605],[459,384441],[460,351364],[461,338242],[462,342573],[463,338528],[464,353900],[465,384974],[466,384772],[467,381058],[468,327777],[469,294808],[470,289901],[471,286245],[472,286387],[473,274295],[474,246566],[475,161810],[476,69822],[477,5299],[481,668],[482,255556],[483,165523],[484,18998],[488,830],[489,304840],[490,394645],[491,258054],[492,193572],[493,247832],[494,211753],[495,195725],[496,242713],[497,384816],[498,273381],[499,262152],[500,258474],[501,260228],[502,248451],[503,249629],[504,233747],[505,208560],[506,203858],[507,170446],[508,175589],[509,151815],[510,43559],[514,18],[520,16764],[521,279338],[522,316672],[523,191215],[524,164727],[525,207747],[526,176474],[527,115520],[528,285817],[529,257985],[530,68269],[531,19161],[532,44202],[533,53247],[534,55259],[535,42368],[536,17605],[537,497],[551,81154],[552,289802],[553,126847],[554,65833],[555,337998],[556,131851],[557,74566],[558,11667],[559,298235],[560,84097],[561,224353],[562,193955],[582,136887],[583,285223],[584,19725],[585,14420],[586,244704],[587,181819],[591,173235],[592,99252],[593,49923],[594,279137],[595,17998],[613,31],[614,209801],[615,105895],[616,29443],[617,282476],[618,205401],[623,116705],[624,188697],[626,134799],[627,196937],[646,23986],[647,1769],[648,160414],[649,244827],[650,34611],[653,35403],[654,183762],[655,326932],[656,53456],[657,21216],[658,194085],[659,221907],[680,26081],[681,36453],[682,17843],[685,3744],[686,35472],[687,12325],[689,49361],[690,115279],[691,94771]],"metric": "tide-v1"},
    waveOrder: ['tail','legs','body','head'],
    journey: fossils.trex.journey
  };
  const entry=catalog.find(f=>f.id==='spino');
  entry.dig=true;
  entry.location='潮汐岩滩 · 森林挑战';
})();

;
(() => {
  'use strict';
  const {fossils,catalog}=window.FOSSILS;
  const discoveries={
    "pachy": {
      "id": "pachy",
      "name": "肿头龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "echo-sandstone",
      "excavation": "echo",
      "fieldTool": {
        "title": "敲一敲，找回声",
        "instruction": "轻点探测点，看哪里回声更清楚",
        "action": "探测",
        "label": "回声探测",
        "found": "找到能松开的薄岩层啦",
        "points": [[24,37],[50,34],[77,38],[23,59],[50,62],[78,57]],
        "answers": [4,5,0]
      },
      "camp": "红砂回声谷",
      "eyebrow": "红砂回声谷的新发现",
      "reviveLine": "你把肿头龙的骨架拼完整啦",
      "card": {
        "title": "肿头龙 · 白垩纪",
        "text": "我的头顶隆起一个厚厚的骨头圆顶，周围还有小突起，像戴着特别的小帽子。走路的时候，我用的是两条后腿。"
      },
      "groove": {
        "base": "#783d23",
        "inset": "#4b2523",
        "light": "#ffc483"
      },
      "voice": {
        "file": "gallery-pachy.m4a",
        "start": 0.1021,
        "end": 6.5104,
        "text": "哈，你找到我啦，我是肿头龙，今天请你当一回发现小细节的探险家！"
      },
      "living": {
        "file": "../../assets/pachy-3d.webp",
        "aspect": "978/1000"
      },
      "stages": ["art/field/pachy/stage-1.webp","art/field/pachy/stage-2.webp","art/field/pachy/stage-3.webp","art/field/pachy/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.02,0.46],[0.12,0.26],[0.39,0.15],[0.7,0.19],[0.9,0.3],[0.99,0.47],[0.87,0.64],[0.6,0.73],[0.22,0.69],[0.06,0.6]],
        "face": {
          "file": "art/field/pachy/stage-4.webp"
        },
        "bowl": "art/field/pachy/grooves.webp",
        "sand": {
          "file": "art/field/pachy/stage-1.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/field/pachy/skeleton.webp",
          "box": [53,320,1201,904]
        },
        "parts": [
          {
            "id": "head",
            "label": "圆顶头骨",
            "box": [53,320,307,547],
            "file": "field/pachy/bone-head.webp",
            "coverage": [[258,133],[259,167283],[260,304260],[261,203461],[262,7617],[263,4872],[290,123494],[291,384146],[292,383791],[293,393852],[294,351305],[295,15063],[321,15133],[322,309070],[323,394119],[324,394381],[325,404459],[326,274023],[327,2],[353,151652],[354,384434],[355,383444],[356,384156],[357,312497],[358,368952],[359,92820],[385,222682],[386,368663],[387,260872],[388,179795],[389,14234],[390,323238],[391,297101],[417,5895],[418,27521],[422,63165],[423,216867]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [696,487,1201,629],
            "file": "field/pachy/bone-tail.webp",
            "coverage": [[401,30887],[402,25689],[433,68579],[434,299853],[435,109086],[436,11988],[465,86190],[466,354038],[467,371915],[468,299308],[469,189318],[470,100789],[471,87096],[472,90899],[473,88739],[474,86241],[475,80331],[476,53567],[477,4821],[497,3963],[498,80619],[499,182047],[500,245287],[501,294394],[502,305468],[503,279988],[504,255949],[505,218730],[506,174690],[507,129171],[508,122165],[509,127858],[510,47676],[533,29],[534,20]]
          },
          {
            "id": "legs",
            "label": "后腿",
            "box": [339,583,736,904],
            "file": "field/pachy/bone-legs.webp",
            "coverage": [[463,18441],[464,8342],[493,81394],[494,322596],[495,363651],[496,158285],[497,140091],[525,86412],[526,222757],[527,219928],[529,18126],[556,112065],[557,85147],[558,346686],[559,330928],[560,56172],[587,61196],[588,339623],[589,9584],[590,155408],[591,365611],[592,288834],[593,6328],[619,79117],[620,284484],[623,23181],[624,252329],[625,298892],[626,51375],[651,240410],[652,311563],[653,9],[656,23864],[657,351247],[658,191411],[681,57752],[682,176744],[683,367324],[684,50848],[688,20073],[689,346438],[690,224046],[712,31296],[713,216209],[714,276060],[715,145601],[719,121059],[720,291824],[721,337116],[722,115436],[752,290],[753,753]]
          },
          {
            "id": "body",
            "label": "胸骨和前臂",
            "box": [254,423,710,722],
            "file": "field/pachy/bone-body.webp",
            "coverage": [[331,3862],[332,29145],[333,19245],[334,22],[360,1],[361,34706],[362,168107],[363,281064],[364,330529],[365,284562],[366,275189],[367,124681],[368,48650],[391,62654],[392,261748],[393,336021],[394,392882],[395,384178],[396,384458],[397,384635],[398,384063],[399,369660],[400,330306],[401,179273],[423,91548],[424,383774],[425,383966],[426,350747],[427,296500],[428,213453],[429,280906],[430,343679],[431,384283],[432,393822],[433,306059],[455,205443],[456,384188],[457,293480],[458,256095],[459,178478],[460,201278],[461,216309],[462,363864],[463,366033],[464,386058],[465,242023],[487,156033],[488,262739],[489,249000],[490,151645],[491,187092],[492,175872],[493,197975],[494,34824],[495,758],[496,32123],[497,58344],[498,2735],[518,107342],[519,148133],[520,188220],[521,206669],[522,24336],[523,100563],[524,330513],[525,114221],[550,43142],[551,67201],[552,182370],[555,126821],[556,272145],[557,504],[583,1288],[584,3498],[587,36819],[588,4549]]
          }
        ]
      },
      "area": {
        "grid": 32,
        "total": 36839297,
        "weights": [[258,133],[259,167283],[260,304260],[261,203461],[262,7617],[263,4872],[290,123494],[291,384146],[292,383791],[293,393852],[294,351305],[295,15063],[321,15133],[322,309070],[323,394119],[324,394381],[325,404459],[326,274023],[327,2],[331,3862],[332,29145],[333,19245],[334,22],[353,151652],[354,384434],[355,383444],[356,384156],[357,312497],[358,368952],[359,92820],[360,1],[361,34706],[362,168107],[363,281064],[364,330529],[365,284562],[366,275189],[367,124681],[368,48650],[385,222682],[386,368663],[387,260872],[388,179795],[389,14234],[390,323238],[391,359755],[392,261748],[393,336021],[394,392882],[395,384178],[396,384458],[397,384635],[398,384063],[399,369660],[400,330306],[401,210160],[402,25689],[417,5895],[418,27521],[422,63165],[423,308415],[424,383774],[425,383966],[426,350747],[427,296500],[428,213453],[429,280906],[430,343679],[431,384283],[432,393822],[433,374638],[434,299853],[435,109086],[436,11988],[455,205443],[456,384188],[457,293480],[458,256095],[459,178478],[460,201278],[461,216309],[462,363864],[463,384474],[464,394400],[465,328213],[466,354038],[467,371915],[468,299308],[469,189318],[470,100789],[471,87096],[472,90899],[473,88739],[474,86241],[475,80331],[476,53567],[477,4821],[487,156033],[488,262739],[489,249000],[490,151645],[491,187092],[492,175872],[493,279369],[494,357420],[495,364409],[496,190408],[497,202398],[498,83354],[499,182047],[500,245287],[501,294394],[502,305468],[503,279988],[504,255949],[505,218730],[506,174690],[507,129171],[508,122165],[509,127858],[510,47676],[518,107342],[519,148133],[520,188220],[521,206669],[522,24336],[523,100563],[524,330513],[525,200633],[526,222757],[527,219928],[529,18126],[533,29],[534,20],[550,43142],[551,67201],[552,182370],[555,126821],[556,384210],[557,85651],[558,346686],[559,330928],[560,56172],[583,1288],[584,3498],[587,98015],[588,344172],[589,9584],[590,155408],[591,365611],[592,288834],[593,6328],[619,79117],[620,284484],[623,23181],[624,252329],[625,298892],[626,51375],[651,240410],[652,311563],[653,9],[656,23864],[657,351247],[658,191411],[681,57752],[682,176744],[683,367324],[684,50848],[688,20073],[689,346438],[690,224046],[712,31296],[713,216209],[714,276060],[715,145601],[719,121059],[720,291824],[721,337116],[722,115436],[752,290],[753,753]],
        "metric": "echo-v1"
      }
    },
    "therizino": {
      "id": "therizino",
      "name": "镰刀龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "fault-slate",
      "excavation": "wedge",
      "fieldTool": {
        "title": "沿着裂缝摆好楔子",
        "instruction": "旋转青色楔子，和浅色裂缝摆成同一个方向",
        "action": "对齐",
        "label": "楔子撬岩",
        "found": "这片断层撬开啦",
        "points": [[23,57],[64,57],[44,34]],
        "answers": [1,3,2]
      },
      "camp": "紫岩断层",
      "eyebrow": "紫岩断层的新发现",
      "reviveLine": "你把镰刀龙的骨架拼完整啦",
      "card": {
        "title": "镰刀龙 · 白垩纪",
        "text": "我的每只手有三根手指，上面的爪子长得很惊人，像弯弯的长钩子。虽然爪子醒目，我却主要吃植物，用两条腿走路。"
      },
      "groove": {
        "base": "#544454",
        "inset": "#302331",
        "light": "#c5abc8"
      },
      "voice": {
        "file": "gallery-therizino.m4a",
        "start": 0.1021,
        "end": 7.0183,
        "text": "小伙伴你好，我是镰刀龙，今天我想把特别的小手伸出来，让你仔细认识我！"
      },
      "living": {
        "file": "../../assets/therizino-3d-v2.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/field/therizino/stage-1.webp","art/field/therizino/stage-2.webp","art/field/therizino/stage-3.webp","art/field/therizino/stage-4.webp"],
      "waveOrder": ["head","claws","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.04,0.4],[0.13,0.22],[0.41,0.14],[0.74,0.2],[0.92,0.31],[0.98,0.49],[0.91,0.66],[0.71,0.76],[0.21,0.74],[0.06,0.6]],
        "face": {
          "file": "art/field/therizino/stage-4.webp"
        },
        "bowl": "art/field/therizino/grooves.webp",
        "sand": {
          "file": "art/field/therizino/stage-1.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/field/therizino/skeleton.webp",
          "box": [57,109,1197,862]
        },
        "parts": [
          {
            "id": "head",
            "label": "头骨和长颈",
            "box": [107,109,414,352],
            "file": "field/therizino/bone-head.webp",
            "coverage": [[68,10562],[69,40688],[70,17099],[99,89547],[100,342448],[101,336759],[102,316154],[103,150730],[130,42901],[131,252177],[132,229602],[133,57835],[134,39444],[135,345567],[136,74701],[162,16],[163,42195],[167,256629],[168,234317],[199,157889],[200,326061],[201,24233],[231,51111],[232,349933],[233,306938],[234,38982],[264,138537],[265,143380]]
          },
          {
            "id": "claws",
            "label": "长臂和镰刀爪",
            "box": [57,346,537,848],
            "file": "field/therizino/bone-claws.webp",
            "coverage": [[266,8028],[267,22011],[297,180608],[298,325581],[299,288663],[300,4281],[329,281507],[330,383824],[331,369423],[332,117213],[357,66037],[358,148554],[359,89709],[360,158920],[361,207944],[362,114201],[363,310355],[364,257599],[365,29055],[386,22645],[387,178224],[388,233063],[389,375499],[390,294472],[391,162231],[392,231373],[393,57720],[395,120728],[396,370990],[397,149349],[417,21523],[418,256557],[419,220828],[420,272255],[421,199007],[422,2862],[425,59410],[426,161342],[427,325387],[428,313743],[429,25496],[449,126490],[450,100982],[451,283808],[452,299506],[453,48580],[455,997],[456,193953],[457,378908],[458,276587],[459,60540],[460,75],[481,51173],[482,204489],[483,151969],[484,94686],[485,3793],[486,151695],[487,288060],[488,282653],[489,241535],[490,6052],[513,3],[514,125228],[515,148592],[516,8844],[517,270037],[518,267218],[519,291187],[520,249747],[521,61895],[546,38331],[547,71739],[548,168288],[549,106991],[550,316367],[551,208634],[552,265918],[553,556],[579,3359],[580,141778],[581,217769],[582,94986],[583,236742],[584,18647],[611,39],[612,62882],[613,200113],[614,27391],[615,132284],[644,340],[645,114595],[646,25031],[647,51295],[677,27770],[679,1853]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [787,359,1197,526],
            "file": "field/therizino/bone-tail.webp",
            "coverage": [[308,169014],[309,48322],[340,339863],[341,342966],[342,145044],[343,9588],[372,190029],[373,290912],[374,360737],[375,313582],[376,160592],[377,63584],[378,16112],[379,4],[404,15987],[405,56251],[406,97926],[407,157419],[408,226889],[409,230111],[410,235389],[411,173493],[412,133257],[413,95121],[414,4045],[445,2240],[446,22107]]
          },
          {
            "id": "legs",
            "label": "后腿",
            "box": [475,413,860,862],
            "file": "field/therizino/bone-legs.webp",
            "coverage": [[337,10000],[338,88502],[339,148197],[340,16266],[368,15525],[369,272593],[370,384337],[371,384542],[372,86437],[399,249],[400,239756],[401,293592],[402,277273],[403,384674],[404,131518],[431,96680],[432,328803],[433,129776],[434,122683],[435,266752],[436,120712],[462,5392],[463,332945],[464,231568],[465,16512],[466,227466],[467,338935],[468,18164],[494,7260],[495,343266],[496,111176],[498,132727],[499,383958],[500,171043],[527,272241],[528,45509],[530,4],[531,195336],[532,273625],[559,279120],[560,87374],[563,3453],[564,330924],[565,98432],[590,11059],[591,370286],[592,97588],[596,271279],[597,241368],[622,164828],[623,274149],[624,3202],[628,209760],[629,220855],[652,85361],[653,222665],[654,377610],[655,282453],[656,4913],[658,87],[659,56482],[660,316394],[661,283535],[684,45753],[685,107187],[686,124524],[687,10606],[688,6623],[690,62368],[691,220203],[692,213758],[693,185208]]
          },
          {
            "id": "body",
            "label": "胸骨和髋骨",
            "box": [346,269,854,736],
            "file": "field/therizino/bone-body.webp",
            "coverage": [[204,3725],[205,8406],[206,10656],[207,2173],[233,1512],[234,182530],[235,259152],[236,331850],[237,313817],[238,330978],[239,298183],[240,251047],[241,109200],[242,20],[264,2066],[265,155547],[266,383407],[267,362533],[268,384534],[269,362883],[270,368410],[271,358274],[272,393319],[273,362100],[274,255524],[275,86096],[296,508],[297,30490],[298,13642],[299,82905],[300,326946],[301,278977],[302,318920],[303,288001],[304,302101],[305,347285],[306,384100],[307,383047],[308,73632],[332,140999],[333,279199],[334,243605],[335,284637],[336,243001],[337,287429],[338,302060],[339,244754],[340,32550],[364,11612],[365,179355],[366,254847],[367,230942],[368,202404],[369,22861],[397,67093],[398,152495],[399,213157],[400,51789],[404,6],[429,46637],[430,192279],[431,97864],[436,2532],[565,8825],[597,16389]]
          }
        ]
      },
      "area": {
        "grid": 32,
        "total": 47331434,
        "weights": [[68,10562],[69,40688],[70,17099],[99,89547],[100,342448],[101,336759],[102,316154],[103,150730],[130,42901],[131,252177],[132,229602],[133,57835],[134,39444],[135,345567],[136,74701],[162,16],[163,42195],[167,256629],[168,234317],[199,157889],[200,326061],[201,24233],[204,3725],[205,8406],[206,10656],[207,2173],[231,51111],[232,349933],[233,308450],[234,221512],[235,259152],[236,331850],[237,313817],[238,330978],[239,298183],[240,251047],[241,109200],[242,20],[264,140603],[265,298927],[266,391435],[267,384544],[268,384534],[269,362883],[270,368410],[271,358274],[272,393319],[273,362100],[274,255524],[275,86096],[296,508],[297,211098],[298,339223],[299,371568],[300,331227],[301,278977],[302,318920],[303,288001],[304,302101],[305,347285],[306,384100],[307,383047],[308,242646],[309,48322],[329,281507],[330,383824],[331,369423],[332,258212],[333,279199],[334,243605],[335,284637],[336,243001],[337,297429],[338,390562],[339,392951],[340,388679],[341,342966],[342,145044],[343,9588],[357,66037],[358,148554],[359,89709],[360,158920],[361,207944],[362,114201],[363,310355],[364,269211],[365,208410],[366,254847],[367,230942],[368,217929],[369,295454],[370,384337],[371,384542],[372,276466],[373,290912],[374,360737],[375,313582],[376,160592],[377,63584],[378,16112],[379,4],[386,22645],[387,178224],[388,233063],[389,375499],[390,294472],[391,162231],[392,231373],[393,57720],[395,120728],[396,370990],[397,216442],[398,152495],[399,213406],[400,291545],[401,293592],[402,277273],[403,384674],[404,147511],[405,56251],[406,97926],[407,157419],[408,226889],[409,230111],[410,235389],[411,173493],[412,133257],[413,95121],[414,4045],[417,21523],[418,256557],[419,220828],[420,272255],[421,199007],[422,2862],[425,59410],[426,161342],[427,325387],[428,313743],[429,72133],[430,192279],[431,194544],[432,328803],[433,129776],[434,122683],[435,266752],[436,123244],[445,2240],[446,22107],[449,126490],[450,100982],[451,283808],[452,299506],[453,48580],[455,997],[456,193953],[457,378908],[458,276587],[459,60540],[460,75],[462,5392],[463,332945],[464,231568],[465,16512],[466,227466],[467,338935],[468,18164],[481,51173],[482,204489],[483,151969],[484,94686],[485,3793],[486,151695],[487,288060],[488,282653],[489,241535],[490,6052],[494,7260],[495,343266],[496,111176],[498,132727],[499,383958],[500,171043],[513,3],[514,125228],[515,148592],[516,8844],[517,270037],[518,267218],[519,291187],[520,249747],[521,61895],[527,272241],[528,45509],[530,4],[531,195336],[532,273625],[546,38331],[547,71739],[548,168288],[549,106991],[550,316367],[551,208634],[552,265918],[553,556],[559,279120],[560,87374],[563,3453],[564,330924],[565,107257],[579,3359],[580,141778],[581,217769],[582,94986],[583,236742],[584,18647],[590,11059],[591,370286],[592,97588],[596,271279],[597,257757],[611,39],[612,62882],[613,200113],[614,27391],[615,132284],[622,164828],[623,274149],[624,3202],[628,209760],[629,220855],[644,340],[645,114595],[646,25031],[647,51295],[652,85361],[653,222665],[654,377610],[655,282453],[656,4913],[658,87],[659,56482],[660,316394],[661,283535],[677,27770],[679,1853],[684,45753],[685,107187],[686,124524],[687,10606],[688,6623],[690,62368],[691,220203],[692,213758],[693,185208]],
        "metric": "wedge-v1"
      }
    }
  };
  Object.values(discoveries).forEach(fossil=>{
    fossil.journey=fossils.trex.journey;
    fossils[fossil.id]=fossil;
    const entry=catalog.find(item=>item.id===fossil.id);
    entry.dig=true;
    entry.location=fossil.camp+' · 森林挑战';
  });
})();

;
(() => {
  'use strict';
  const {fossils,catalog}=window.FOSSILS;
  const expedition={
    "diplo": {
      "id": "diplo",
      "name": "梁龙",
      "era": "jurassic",
      "eraLabel": "侏罗纪",
      "isDinosaur": true,
      "rock": "silver-gneiss",
      "excavation": "rope",
      "fieldTool": {
        "variant": "rope",
        "title": "把绳环拉向箭头",
        "instruction": "抓住绳环，沿着虚线拉开松动的岩层",
        "action": "拉绳",
        "label": "绳索拉岩",
        "found": "岩层拉开一道口子",
        "answers": [0,1,2],
        "rounds": [[69,41,87,47,"向右下"],[49,55,27,66,"向左下"],[45,39,62,24,"向右上"]]
      },
      "camp": "银纹绳索坡",
      "eyebrow": "银纹绳索坡的新发现",
      "reviveLine": "你把梁龙的骨架拼完整啦",
      "card": {
        "title": "梁龙 · 侏罗纪",
        "text": "我的脖子很长，尾巴也很长，越到尾巴末端就越细，像一根长鞭子。四条腿支撑着身体，我吃的是植物和树叶。"
      },
      "groove": {
        "base": "#2e3036",
        "inset": "#2e3036",
        "light": "#d9d7c7"
      },
      "voice": {
        "file": "gallery-diplo.m4a",
        "start": 0.1021,
        "end": 6.6146,
        "text": "小伙伴，慢慢看，我是梁龙，今天认识我，要让眼睛走一段长长的路啦！"
      },
      "living": {
        "file": "../../assets/diplo-3d.webp",
        "aspect": "1000/500"
      },
      "stages": ["art/expedition/diplo/stage-1.webp","art/expedition/diplo/stage-2.webp","art/expedition/diplo/stage-3.webp","art/expedition/diplo/stage-4.webp"],
      "waveOrder": ["neck","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3353],[0.0555,0.3353],[0.991,0.5196],[0.991,0.5565],[0.5718,0.6671],[0.203,0.6671],[0.009,0.3721]],
        "face": {
          "file": "art/expedition/diplo/stage-4.webp"
        },
        "bowl": "art/expedition/diplo/grooves.webp",
        "sand": {
          "file": "art/expedition/diplo/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/expedition/diplo/skeleton.webp",
          "box": [57,459,1197,823]
        },
        "parts": [
          {
            "id": "neck",
            "label": "头骨和长颈",
            "box": [57,459,491,649],
            "file": "expedition/diplo/bone-neck.webp",
            "coverage": [[353,1050],[354,80040],[355,20101],[385,112863],[386,216153],[387,231268],[388,179475],[389,16337],[419,83],[420,123811],[421,273795],[422,52762],[453,76442],[454,306619],[455,204007],[456,55502],[457,69047],[458,95587],[459,211264],[460,84491],[486,27769],[487,163021],[488,324535],[489,354157],[490,376525],[491,155330],[492,506],[520,11531],[521,200496],[522,64141]]
          },
          {
            "id": "tail",
            "label": "长尾",
            "box": [638,576,1197,678],
            "file": "expedition/diplo/bone-tail.webp",
            "coverage": [[464,20605],[465,25],[496,218773],[497,261639],[498,135714],[499,42391],[500,16],[528,53304],[529,159469],[530,220442],[531,264574],[532,252111],[533,215814],[534,171137],[535,141576],[536,96296],[537,56444],[538,33507],[539,23417],[540,28720],[541,32689],[542,9382],[563,10],[564,4448],[565,6967],[566,12609],[567,17158],[568,37516],[569,51522],[570,62327],[571,51816],[572,24979],[573,469]]
          },
          {
            "id": "legs",
            "label": "四条腿",
            "box": [299,634,684,823],
            "file": "expedition/diplo/bone-legs.webp",
            "coverage": [[524,21800],[525,155464],[526,177082],[527,286667],[528,183011],[529,2652],[552,9165],[553,54578],[554,84202],[555,53384],[556,178010],[557,125496],[558,264147],[559,103343],[560,147310],[584,109410],[585,160029],[586,189092],[587,102784],[588,11686],[589,46379],[590,217945],[591,67186],[592,241265],[616,186660],[617,41846],[618,130683],[619,92616],[621,51083],[622,177203],[624,225048],[625,22245],[647,25009],[648,279273],[649,2527],[650,206183],[651,126793],[653,167184],[654,153829],[655,10],[656,250733],[657,104383]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [344,549,649,693],
            "file": "expedition/diplo/bone-body.webp",
            "coverage": [[460,145262],[461,283043],[462,277731],[463,196813],[464,44962],[490,14932],[491,207731],[492,352514],[493,329431],[494,305543],[495,375457],[496,138283],[520,22254],[521,178721],[522,277773],[523,230363],[524,264053],[525,93890],[526,28014],[527,67500],[528,30566],[552,18573],[553,206182],[554,193066],[555,92412],[556,12597]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/expedition/diplo/fragments.webp",
        "pieces": [[76,49,87,75,19],[53,58,61,80,20],[43,34,37,83,19],[23,52,16,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 16419635,
        "weights": [[353,1050],[354,80040],[355,20101],[385,112863],[386,216153],[387,231268],[388,179475],[389,16337],[419,83],[420,123811],[421,273795],[422,52762],[453,76442],[454,306619],[455,204007],[456,55502],[457,69047],[458,95587],[459,211264],[460,229753],[461,283043],[462,277731],[463,196813],[464,65567],[465,25],[486,27769],[487,163021],[488,324535],[489,354157],[490,391457],[491,363061],[492,353020],[493,329431],[494,305543],[495,375457],[496,357056],[497,261639],[498,135714],[499,42391],[500,16],[520,33785],[521,379217],[522,341914],[523,230363],[524,285853],[525,249354],[526,205096],[527,354167],[528,266881],[529,162121],[530,220442],[531,264574],[532,252111],[533,215814],[534,171137],[535,141576],[536,96296],[537,56444],[538,33507],[539,23417],[540,28720],[541,32689],[542,9382],[552,27738],[553,260760],[554,277268],[555,145796],[556,190607],[557,125496],[558,264147],[559,103343],[560,147310],[563,10],[564,4448],[565,6967],[566,12609],[567,17158],[568,37516],[569,51522],[570,62327],[571,51816],[572,24979],[573,469],[584,109410],[585,160029],[586,189092],[587,102784],[588,11686],[589,46379],[590,217945],[591,67186],[592,241265],[616,186660],[617,41846],[618,130683],[619,92616],[621,51083],[622,177203],[624,225048],[625,22245],[647,25009],[648,279273],[649,2527],[650,206183],[651,126793],[653,167184],[654,153829],[655,10],[656,250733],[657,104383]],
        "metric": "rope-v1"
      }
    },
    "dilo": {
      "id": "dilo",
      "name": "双脊龙",
      "era": "jurassic",
      "eraLabel": "侏罗纪",
      "isDinosaur": true,
      "rock": "pale-speckle",
      "excavation": "rhythm",
      "fieldTool": {
        "variant": "rhythm",
        "title": "记住敲击的顺序",
        "instruction": "先看哪些石头亮起来，再按同样的顺序敲",
        "action": "记敲击",
        "label": "记忆敲岩",
        "found": "这一段岩层敲松了",
        "answers": [0,1,2],
        "points": [[25,42],[48,34],[73,42],[53,56]],
        "rounds": [[1,3,0],[2,0,3],[3,1,2,0]]
      },
      "camp": "斑岩敲击台",
      "eyebrow": "斑岩敲击台的新发现",
      "reviveLine": "你把双脊龙的骨架拼完整啦",
      "card": {
        "title": "双脊龙 · 侏罗纪",
        "text": "我的头上有两道并排的冠，像两片竖起来的小扇子。我的嘴里有弯曲的尖牙，身体靠两条后腿走路，名字里的双就藏在头顶。"
      },
      "groove": {
        "base": "#36312b",
        "inset": "#36312b",
        "light": "#e7dacc"
      },
      "voice": {
        "file": "gallery-dilo.m4a",
        "start": 0.1021,
        "end": 6.4062,
        "text": "你好呀，我是双脊龙，我给自己准备了一次小小的亮相，快看看我的头顶！"
      },
      "living": {
        "file": "../../assets/dilo-3d.webp",
        "aspect": "1000/666"
      },
      "stages": ["art/expedition/dilo/stage-1.webp","art/expedition/dilo/stage-2.webp","art/expedition/dilo/stage-3.webp","art/expedition/dilo/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.271],[0.0168,0.1972],[0.1274,0.1972],[0.9387,0.3816],[0.991,0.4185],[0.991,0.4554],[0.6068,0.7504],[0.3118,0.7504],[0.1274,0.6029],[0.009,0.3816]],
        "face": {
          "file": "art/expedition/dilo/stage-4.webp"
        },
        "bowl": "art/expedition/dilo/grooves.webp",
        "sand": {
          "file": "art/expedition/dilo/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/expedition/dilo/skeleton.webp",
          "box": [57,291,1197,884]
        },
        "parts": [
          {
            "id": "head",
            "label": "头冠和颈骨",
            "box": [57,291,400,612],
            "file": "expedition/dilo/bone-head.webp",
            "coverage": [[226,11383],[227,172361],[228,174565],[229,264],[258,236440],[259,383466],[260,383355],[261,229404],[262,1485],[289,26845],[290,361760],[291,373991],[292,383512],[293,383357],[294,296108],[295,49983],[321,152454],[322,280705],[323,224429],[324,372324],[325,315787],[326,253278],[327,290620],[328,10449],[354,106152],[355,280459],[356,162652],[357,25764],[358,49895],[359,344121],[360,118478],[361,311],[362,85],[385,7],[386,123257],[387,5583],[391,190349],[392,359674],[393,271650],[394,14620],[423,15519],[424,227007],[425,193873],[455,5111],[456,305212],[457,25198],[487,3],[488,89998]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [718,473,1197,578],
            "file": "expedition/dilo/bone-tail.webp",
            "coverage": [[402,136577],[403,175722],[404,100041],[405,57307],[406,37447],[407,21888],[408,10919],[409,12099],[410,3878],[411,21],[434,205326],[435,341827],[436,336446],[437,330278],[438,298057],[439,266633],[440,217836],[441,205049],[442,177868],[443,153985],[444,117685],[445,80554],[446,17319],[466,50112],[467,77376],[468,53342],[469,47805],[470,10844],[471,6],[478,6104]]
          },
          {
            "id": "legs",
            "label": "后腿",
            "box": [363,564,765,884],
            "file": "expedition/dilo/bone-legs.webp",
            "coverage": [[461,53],[462,152928],[463,218391],[464,210334],[465,5382],[466,3920],[492,210],[493,167964],[494,207786],[495,276970],[496,192819],[497,24803],[524,124032],[525,369433],[526,147756],[527,345714],[528,34551],[556,190136],[557,246775],[558,70478],[559,370031],[560,338333],[561,39742],[588,116486],[589,134441],[591,5093],[592,145694],[593,315233],[594,115205],[620,189953],[621,191793],[625,134749],[626,345515],[627,13408],[651,71116],[652,288876],[653,43982],[657,12038],[658,382147],[659,43701],[681,75143],[682,278343],[683,351172],[684,128097],[688,82197],[689,258331],[690,388689],[691,96480],[714,19925],[715,2081],[720,20284],[721,46906],[722,62162]]
          },
          {
            "id": "body",
            "label": "肋骨和前臂",
            "box": [217,431,727,755],
            "file": "expedition/dilo/bone-body.webp",
            "coverage": [[333,4],[362,55746],[363,143593],[364,249073],[365,242970],[366,249692],[367,166579],[368,113108],[369,35513],[370,2038],[393,22607],[394,335508],[395,380351],[396,383583],[397,383476],[398,383840],[399,383441],[400,385374],[401,344119],[402,132092],[425,189138],[426,370944],[427,316200],[428,246430],[429,211324],[430,324146],[431,383422],[432,392946],[433,308182],[434,117992],[456,22657],[457,339652],[458,206420],[459,179053],[460,165471],[461,193548],[462,91750],[463,163718],[464,178139],[465,55797],[466,45146],[487,7542],[488,148626],[489,204173],[490,168342],[491,145991],[492,163977],[493,46042],[517,15849],[518,212457],[519,203782],[520,124742],[521,113433],[522,259843],[523,13356],[524,5215],[549,88213],[550,142906],[551,67793],[552,232948],[553,201142],[554,3174],[581,6],[582,4724],[583,29692],[584,199520],[585,41756],[615,5],[616,7236],[617,1157]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/expedition/dilo/fragments.webp",
        "pieces": [[19,36,13,69,19],[45,54,39,82,20],[68,42,64,87,19],[80,64,86,75,19]]
      },
      "area": {
        "grid": 32,
        "total": 31679859,
        "weights": [[226,11383],[227,172361],[228,174565],[229,264],[258,236440],[259,383466],[260,383355],[261,229404],[262,1485],[289,26845],[290,361760],[291,373991],[292,383512],[293,383357],[294,296108],[295,49983],[321,152454],[322,280705],[323,224429],[324,372324],[325,315787],[326,253278],[327,290620],[328,10449],[333,4],[354,106152],[355,280459],[356,162652],[357,25764],[358,49895],[359,344121],[360,118478],[361,311],[362,55831],[363,143593],[364,249073],[365,242970],[366,249692],[367,166579],[368,113108],[369,35513],[370,2038],[385,7],[386,123257],[387,5583],[391,190349],[392,359674],[393,294257],[394,350128],[395,380351],[396,383583],[397,383476],[398,383840],[399,383441],[400,385374],[401,344119],[402,268669],[403,175722],[404,100041],[405,57307],[406,37447],[407,21888],[408,10919],[409,12099],[410,3878],[411,21],[423,15519],[424,227007],[425,383011],[426,370944],[427,316200],[428,246430],[429,211324],[430,324146],[431,383422],[432,392946],[433,308182],[434,323318],[435,341827],[436,336446],[437,330278],[438,298057],[439,266633],[440,217836],[441,205049],[442,177868],[443,153985],[444,117685],[445,80554],[446,17319],[455,5111],[456,327869],[457,364850],[458,206420],[459,179053],[460,165471],[461,193601],[462,244678],[463,382109],[464,388473],[465,61179],[466,99178],[467,77376],[468,53342],[469,47805],[470,10844],[471,6],[478,6104],[487,7545],[488,238624],[489,204173],[490,168342],[491,145991],[492,164187],[493,214006],[494,207786],[495,276970],[496,192819],[497,24803],[517,15849],[518,212457],[519,203782],[520,124742],[521,113433],[522,259843],[523,13356],[524,129247],[525,369433],[526,147756],[527,345714],[528,34551],[549,88213],[550,142906],[551,67793],[552,232948],[553,201142],[554,3174],[556,190136],[557,246775],[558,70478],[559,370031],[560,338333],[561,39742],[581,6],[582,4724],[583,29692],[584,199520],[585,41756],[588,116486],[589,134441],[591,5093],[592,145694],[593,315233],[594,115205],[615,5],[616,7236],[617,1157],[620,189953],[621,191793],[625,134749],[626,345515],[627,13408],[651,71116],[652,288876],[653,43982],[657,12038],[658,382147],[659,43701],[681,75143],[682,278343],[683,351172],[684,128097],[688,82197],[689,258331],[690,388689],[691,96480],[714,19925],[715,2081],[720,20284],[721,46906],[722,62162]],
        "metric": "rhythm-v1"
      }
    },
    "styraco": {
      "id": "styraco",
      "name": "戟龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "amber-honeycomb",
      "excavation": "brace",
      "fieldTool": {
        "variant": "brace",
        "title": "找一根合适的撑杆",
        "instruction": "看看裂缝有多宽，选一根刚好能撑住两头的杆",
        "action": "选撑杆",
        "label": "撑杆开岩",
        "found": "撑杆托住了岩层",
        "answers": [1,0,2],
        "points": [[47,44],[29,39],[69,51]]
      },
      "camp": "蜂窝石支撑台",
      "eyebrow": "蜂窝石支撑台的新发现",
      "reviveLine": "你把戟龙的骨架拼完整啦",
      "card": {
        "title": "戟龙 · 白垩纪",
        "text": "我的鼻子上有一根长角，颈盾周围还伸出长长的尖刺。四条腿稳稳托着身体，我吃植物，头饰的轮廓很容易认出来。"
      },
      "groove": {
        "base": "#4f361d",
        "inset": "#4f361d",
        "light": "#f8d188"
      },
      "voice": {
        "file": "gallery-styraco.m4a",
        "start": 0.1021,
        "end": 6.7708,
        "text": "小伙伴，猜猜谁来啦，我是戟龙，先送你一个笑脸，再亮出我的特别头饰！"
      },
      "living": {
        "file": "../../assets/styraco-3d.webp",
        "aspect": "1254/1254"
      },
      "stages": ["art/expedition/styraco/stage-1.webp","art/expedition/styraco/stage-2.webp","art/expedition/styraco/stage-3.webp","art/expedition/styraco/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.2662],[0.2882,0.1187],[0.3251,0.1187],[0.3988,0.1556],[0.991,0.5243],[0.7676,0.7456],[0.4357,0.7824],[0.3619,0.7824],[0.1407,0.7456],[0.0301,0.5612],[0.009,0.3399]],
        "face": {
          "file": "art/expedition/styraco/stage-4.webp"
        },
        "bowl": "art/expedition/styraco/grooves.webp",
        "sand": {
          "file": "art/expedition/styraco/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/expedition/styraco/skeleton.webp",
          "box": [57,224,1197,907]
        },
        "parts": [
          {
            "id": "head",
            "label": "鼻角和颈盾",
            "box": [57,224,567,710],
            "file": "expedition/styraco/bone-head.webp",
            "coverage": [[169,12876],[170,11968],[200,12468],[201,172792],[202,500],[203,109119],[204,81618],[232,182431],[233,74017],[234,240666],[235,105381],[237,8],[263,13597],[264,310896],[265,228082],[266,178782],[267,158118],[268,201635],[269,105832],[270,5003],[289,83678],[295,255926],[296,383571],[297,384128],[298,341217],[299,149979],[300,32917],[301,14201],[321,155753],[322,47628],[326,14613],[327,365383],[328,393812],[329,393523],[330,379881],[331,274337],[332,141214],[333,64718],[334,3],[353,47407],[354,256315],[355,118],[358,65272],[359,384168],[360,384315],[361,384197],[362,391854],[363,212523],[364,117261],[365,132252],[366,56486],[386,262037],[387,164312],[388,18539],[389,203262],[390,294569],[391,384277],[392,383627],[393,383577],[394,344641],[395,117919],[396,275182],[397,98275],[418,68101],[419,378948],[420,276041],[421,393594],[422,383836],[423,384362],[424,384019],[425,383882],[426,290619],[427,279451],[428,47121],[450,3],[451,313915],[452,384422],[453,394207],[454,384052],[455,384309],[456,338920],[457,376389],[458,378583],[459,36408],[482,92493],[483,384076],[484,384395],[485,393721],[486,326464],[487,377712],[488,119297],[489,168295],[490,209724],[514,170404],[515,277207],[516,163775],[517,374183],[518,354352],[519,203848],[520,20600],[521,303107],[522,25751],[546,34640],[547,67979],[548,288436],[549,201562],[550,7112],[552,16531],[553,132231],[584,33],[585,1359]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [891,521,1197,666],
            "file": "expedition/styraco/bone-tail.webp",
            "coverage": [[438,39851],[439,30921],[470,28126],[471,329351],[472,128104],[473,5476],[503,234935],[504,334067],[505,320409],[506,194716],[507,98211],[508,21128],[535,12073],[536,47288],[537,80969],[538,128378],[539,129328],[540,140851],[541,114473],[542,28567]]
          },
          {
            "id": "legs",
            "label": "四条腿",
            "box": [228,606,892,907],
            "file": "expedition/styraco/bone-legs.webp",
            "coverage": [[498,663],[499,52422],[500,47154],[501,86673],[502,7119],[522,9327],[523,55084],[524,93960],[525,56145],[526,100431],[527,119610],[528,269822],[529,314596],[530,105233],[531,344105],[532,10642],[533,294715],[534,28518],[553,226164],[554,313783],[555,308254],[556,365049],[557,195126],[558,157463],[559,133337],[560,392039],[561,92755],[562,114582],[563,383799],[564,187914],[584,113051],[585,368038],[586,14744],[587,18994],[588,115374],[589,382541],[590,164032],[591,28672],[592,373450],[593,129086],[594,2069],[595,289861],[596,371893],[597,53152],[615,7773],[616,321390],[617,305905],[618,6989],[620,89926],[621,384265],[622,140390],[624,281811],[625,140991],[627,1141],[628,239278],[629,337834],[630,75024],[647,222865],[648,291877],[649,5073],[652,224215],[653,329496],[654,826],[655,13],[656,311311],[657,211956],[660,47972],[661,392976],[662,176084],[678,71629],[679,372632],[680,141665],[683,1445],[684,335017],[685,272912],[686,29551],[687,254069],[688,400415],[689,114363],[692,67700],[693,400180],[694,198255],[709,10300],[710,179049],[711,189881],[712,44964],[715,190168],[716,350802],[717,236505],[719,7427],[720,14553],[721,3],[723,12171],[724,178141],[725,204133],[726,122541],[747,12],[748,5241],[749,1745]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [377,422,909,671],
            "file": "expedition/styraco/bone-body.webp",
            "coverage": [[334,4980],[335,23613],[336,36883],[337,15094],[338,4],[365,8243],[366,232379],[367,277924],[368,335186],[369,312516],[370,218317],[371,101099],[372,20040],[396,25236],[397,266045],[398,384205],[399,384456],[400,394110],[401,384669],[402,384188],[403,368164],[404,303852],[405,137960],[406,8382],[427,82389],[428,337240],[429,384319],[430,377402],[431,331808],[432,341224],[433,359359],[434,383671],[435,384364],[436,384435],[437,382881],[438,198857],[458,15359],[459,346382],[460,366482],[461,319981],[462,248937],[463,286833],[464,278096],[465,323985],[466,340196],[467,383985],[468,384282],[469,291715],[470,332881],[490,160976],[491,382624],[492,317297],[493,275045],[494,180223],[495,187557],[496,244422],[497,341302],[498,255035],[499,283149],[500,263927],[501,133901],[502,116344],[503,17436],[521,34849],[522,368741],[523,338780],[524,217095],[525,125110],[526,83834],[527,52636],[528,65291],[529,35455],[530,2515],[535,5],[553,10624],[554,4032]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/expedition/styraco/fragments.webp",
        "pieces": [[19,36,15,75,18],[43,48,38,83,19],[62,65,62,84,20],[80,48,86,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 58491451,
        "weights": [[169,12876],[170,11968],[200,12468],[201,172792],[202,500],[203,109119],[204,81618],[232,182431],[233,74017],[234,240666],[235,105381],[237,8],[263,13597],[264,310896],[265,228082],[266,178782],[267,158118],[268,201635],[269,105832],[270,5003],[289,83678],[295,255926],[296,383571],[297,384128],[298,341217],[299,149979],[300,32917],[301,14201],[321,155753],[322,47628],[326,14613],[327,365383],[328,393812],[329,393523],[330,379881],[331,274337],[332,141214],[333,64718],[334,4983],[335,23613],[336,36883],[337,15094],[338,4],[353,47407],[354,256315],[355,118],[358,65272],[359,384168],[360,384315],[361,384197],[362,391854],[363,212523],[364,117261],[365,140495],[366,288865],[367,277924],[368,335186],[369,312516],[370,218317],[371,101099],[372,20040],[386,262037],[387,164312],[388,18539],[389,203262],[390,294569],[391,384277],[392,383627],[393,383577],[394,344641],[395,117919],[396,300418],[397,364320],[398,384205],[399,384456],[400,394110],[401,384669],[402,384188],[403,368164],[404,303852],[405,137960],[406,8382],[418,68101],[419,378948],[420,276041],[421,393594],[422,383836],[423,384362],[424,384019],[425,383882],[426,290619],[427,361840],[428,384361],[429,384319],[430,377402],[431,331808],[432,341224],[433,359359],[434,383671],[435,384364],[436,384435],[437,382881],[438,238708],[439,30921],[450,3],[451,313915],[452,384422],[453,394207],[454,384052],[455,384309],[456,338920],[457,376389],[458,393942],[459,382790],[460,366482],[461,319981],[462,248937],[463,286833],[464,278096],[465,323985],[466,340196],[467,383985],[468,384282],[469,291715],[470,361007],[471,329351],[472,128104],[473,5476],[482,92493],[483,384076],[484,384395],[485,393721],[486,326464],[487,377712],[488,119297],[489,168295],[490,370700],[491,382624],[492,317297],[493,275045],[494,180223],[495,187557],[496,244422],[497,341302],[498,255698],[499,335571],[500,311081],[501,220574],[502,123463],[503,252371],[504,334067],[505,320409],[506,194716],[507,98211],[508,21128],[514,170404],[515,277207],[516,163775],[517,374183],[518,354352],[519,203848],[520,20600],[521,337956],[522,403819],[523,393864],[524,311055],[525,181255],[526,184265],[527,172246],[528,335113],[529,350051],[530,107748],[531,344105],[532,10642],[533,294715],[534,28518],[535,12078],[536,47288],[537,80969],[538,128378],[539,129328],[540,140851],[541,114473],[542,28567],[546,34640],[547,67979],[548,288436],[549,201562],[550,7112],[552,16531],[553,369019],[554,317815],[555,308254],[556,365049],[557,195126],[558,157463],[559,133337],[560,392039],[561,92755],[562,114582],[563,383799],[564,187914],[584,113084],[585,369397],[586,14744],[587,18994],[588,115374],[589,382541],[590,164032],[591,28672],[592,373450],[593,129086],[594,2069],[595,289861],[596,371893],[597,53152],[615,7773],[616,321390],[617,305905],[618,6989],[620,89926],[621,384265],[622,140390],[624,281811],[625,140991],[627,1141],[628,239278],[629,337834],[630,75024],[647,222865],[648,291877],[649,5073],[652,224215],[653,329496],[654,826],[655,13],[656,311311],[657,211956],[660,47972],[661,392976],[662,176084],[678,71629],[679,372632],[680,141665],[683,1445],[684,335017],[685,272912],[686,29551],[687,254069],[688,400415],[689,114363],[692,67700],[693,400180],[694,198255],[709,10300],[710,179049],[711,189881],[712,44964],[715,190168],[716,350802],[717,236505],[719,7427],[720,14553],[721,3],[723,12171],[724,178141],[725,204133],[726,122541],[747,12],[748,5241],[749,1745]],
        "metric": "brace-v1"
      }
    },
    "tuojiang": {
      "id": "tuojiang",
      "name": "沱江龙",
      "era": "jurassic",
      "eraLabel": "侏罗纪",
      "isDinosaur": true,
      "rock": "copper-breccia",
      "excavation": "lever",
      "fieldTool": {
        "variant": "lever",
        "title": "把支点放到重石附近",
        "instruction": "看看重石在哪边，把支点放得离它近一些",
        "action": "放支点",
        "label": "杠杆撬岩",
        "found": "杠杆把重石撬松了",
        "answers": [0,2,0],
        "rounds": [48,54,43]
      },
      "camp": "铜纹杠杆台",
      "eyebrow": "铜纹杠杆台的新发现",
      "reviveLine": "你把沱江龙的骨架拼完整啦",
      "card": {
        "title": "沱江龙 · 侏罗纪",
        "text": "我的化石在中国被发现。我有背部骨板，尾巴末端还有尖刺，属于剑龙的亲戚。小小的牙齿用来取食植物。"
      },
      "groove": {
        "base": "#20352f",
        "inset": "#20352f",
        "light": "#afd2b1"
      },
      "voice": {
        "file": "gallery-tuojiang.m4a",
        "start": 0.1021,
        "end": 6.6667,
        "text": "我是沱江龙！我的名字和一条河有关，背上也有一排醒目的小山！"
      },
      "living": {
        "file": "../../assets/new30-tuojiang.webp",
        "aspect": "1536/1024"
      },
      "stages": ["art/expedition/tuojiang/stage-1.webp","art/expedition/tuojiang/stage-2.webp","art/expedition/tuojiang/stage-3.webp","art/expedition/tuojiang/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.4956],[0.2601,0.2375],[0.3707,0.2006],[0.5182,0.2006],[0.6288,0.2375],[0.991,0.385],[0.991,0.4219],[0.991,0.4588],[0.5919,0.7169],[0.1494,0.7169],[0.009,0.5694]],
        "face": {
          "file": "art/expedition/tuojiang/stage-4.webp"
        },
        "bowl": "art/expedition/tuojiang/grooves.webp",
        "sand": {
          "file": "art/expedition/tuojiang/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/expedition/tuojiang/skeleton.webp",
          "box": [57,291,1197,836]
        },
        "parts": [
          {
            "id": "head",
            "label": "头骨和颈骨",
            "box": [57,385,343,679],
            "file": "expedition/tuojiang/bone-head.webp",
            "coverage": [[296,24],[327,7488],[328,62693],[359,265056],[360,199887],[390,183536],[391,364422],[392,284387],[421,94585],[422,340736],[423,380033],[424,275318],[452,32905],[453,328116],[454,371718],[455,383420],[456,239370],[481,1],[482,104348],[483,240553],[484,306669],[485,388133],[486,366563],[487,354544],[488,40912],[513,130030],[514,363689],[515,297699],[516,160297],[517,154019],[518,133909],[519,171495],[545,10668],[546,10620],[550,13784],[551,4535]]
          },
          {
            "id": "tail",
            "label": "尾巴和尾刺",
            "box": [787,401,1197,603],
            "file": "expedition/tuojiang/bone-tail.webp",
            "coverage": [[340,172968],[341,8396],[372,272283],[373,132471],[374,23],[404,324540],[405,310729],[406,168639],[407,517],[412,47881],[413,63028],[414,6891],[436,322581],[437,345815],[438,308748],[439,228481],[440,80044],[441,13026],[443,86572],[444,255332],[445,168866],[446,37054],[468,239364],[469,300677],[470,342245],[471,348747],[472,351909],[473,336044],[474,260867],[475,331980],[476,214990],[477,9715],[500,20005],[501,28443],[502,34706],[503,27908],[504,48819],[505,38227],[506,9737],[507,89]]
          },
          {
            "id": "legs",
            "label": "四条腿",
            "box": [222,620,747,836],
            "file": "expedition/tuojiang/bone-legs.webp",
            "coverage": [[494,10850],[495,11944],[496,46646],[497,6476],[519,179168],[520,285608],[521,180356],[522,108241],[523,192192],[524,130901],[525,76981],[526,385016],[527,129668],[528,399756],[529,71462],[550,1020],[551,291431],[552,184008],[553,272757],[554,56986],[555,62329],[556,4722],[557,78434],[558,361403],[559,19993],[560,326484],[561,275041],[582,2747],[583,304726],[584,79419],[585,344702],[586,46260],[589,39037],[590,286028],[592,41014],[593,322930],[594,87353],[614,147647],[615,195550],[616,71586],[617,261100],[621,116175],[622,322366],[625,146660],[626,310362],[645,23746],[646,298214],[647,111044],[648,225540],[649,187672],[652,61806],[653,318580],[654,311190],[656,6413],[657,228800],[658,349309],[659,25],[678,21],[679,12386],[680,98616],[681,39847],[685,4648],[686,4009],[688,17472],[689,96577],[690,75654]]
          },
          {
            "id": "body",
            "label": "骨板和躯干",
            "box": [297,291,800,640],
            "file": "expedition/tuojiang/bone-body.webp",
            "coverage": [[236,96410],[237,3155],[239,2982],[240,126967],[265,5214],[266,4],[267,18026],[268,349768],[269,67829],[270,116769],[271,229053],[272,297770],[273,2091],[274,2],[275,28431],[296,33202],[297,260734],[298,158353],[299,251229],[300,384713],[301,313239],[302,373766],[303,384029],[304,317958],[305,273048],[306,205624],[307,214723],[328,100880],[329,392005],[330,370651],[331,393769],[332,394051],[333,393709],[334,393152],[335,393815],[336,403766],[337,393543],[338,394336],[339,189738],[340,23013],[360,98514],[361,384481],[362,392162],[363,367020],[364,383925],[365,360775],[366,359736],[367,377207],[368,366296],[369,382926],[370,383481],[371,365217],[372,73106],[392,97180],[393,383825],[394,379289],[395,384417],[396,384610],[397,384421],[398,384515],[399,384600],[400,394180],[401,383838],[402,342404],[403,355596],[404,54321],[424,96891],[425,384122],[426,369733],[427,310702],[428,307246],[429,238157],[430,287650],[431,294011],[432,394507],[433,384413],[434,384645],[435,383941],[436,41674],[456,137706],[457,384593],[458,310940],[459,205505],[460,193608],[461,218244],[462,214107],[463,276545],[464,365907],[465,362319],[466,276885],[467,173167],[468,24329],[487,19729],[488,339832],[489,301823],[490,188444],[491,222203],[492,129828],[493,198672],[494,199844],[495,305752],[496,248291],[497,108094],[498,48784],[499,25809],[500,15036],[519,42717],[520,108503],[521,65367],[522,23745],[523,29213],[524,10073],[525,5663]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/expedition/tuojiang/fragments.webp",
        "pieces": [[32,33,14,76,18],[59,37,41,82,19],[74,60,86,74,19],[43,61,65,86,20]]
      },
      "area": {
        "grid": 32,
        "total": 50131151,
        "weights": [[236,96410],[237,3155],[239,2982],[240,126967],[265,5214],[266,4],[267,18026],[268,349768],[269,67829],[270,116769],[271,229053],[272,297770],[273,2091],[274,2],[275,28431],[296,33226],[297,260734],[298,158353],[299,251229],[300,384713],[301,313239],[302,373766],[303,384029],[304,317958],[305,273048],[306,205624],[307,214723],[327,7488],[328,163573],[329,392005],[330,370651],[331,393769],[332,394051],[333,393709],[334,393152],[335,393815],[336,403766],[337,393543],[338,394336],[339,189738],[340,195981],[341,8396],[359,265056],[360,298401],[361,384481],[362,392162],[363,367020],[364,383925],[365,360775],[366,359736],[367,377207],[368,366296],[369,382926],[370,383481],[371,365217],[372,345389],[373,132471],[374,23],[390,183536],[391,364422],[392,381567],[393,383825],[394,379289],[395,384417],[396,384610],[397,384421],[398,384515],[399,384600],[400,394180],[401,383838],[402,342404],[403,355596],[404,378861],[405,310729],[406,168639],[407,517],[412,47881],[413,63028],[414,6891],[421,94585],[422,340736],[423,380033],[424,372209],[425,384122],[426,369733],[427,310702],[428,307246],[429,238157],[430,287650],[431,294011],[432,394507],[433,384413],[434,384645],[435,383941],[436,364255],[437,345815],[438,308748],[439,228481],[440,80044],[441,13026],[443,86572],[444,255332],[445,168866],[446,37054],[452,32905],[453,328116],[454,371718],[455,383420],[456,377076],[457,384593],[458,310940],[459,205505],[460,193608],[461,218244],[462,214107],[463,276545],[464,365907],[465,362319],[466,276885],[467,173167],[468,263693],[469,300677],[470,342245],[471,348747],[472,351909],[473,336044],[474,260867],[475,331980],[476,214990],[477,9715],[481,1],[482,104348],[483,240553],[484,306669],[485,388133],[486,366563],[487,374273],[488,380744],[489,301823],[490,188444],[491,222203],[492,129828],[493,198672],[494,210694],[495,317696],[496,294937],[497,114570],[498,48784],[499,25809],[500,35041],[501,28443],[502,34706],[503,27908],[504,48819],[505,38227],[506,9737],[507,89],[513,130030],[514,363689],[515,297699],[516,160297],[517,154019],[518,133909],[519,393380],[520,394111],[521,245723],[522,131986],[523,221405],[524,140974],[525,82644],[526,385016],[527,129668],[528,399756],[529,71462],[545,10668],[546,10620],[550,14804],[551,295966],[552,184008],[553,272757],[554,56986],[555,62329],[556,4722],[557,78434],[558,361403],[559,19993],[560,326484],[561,275041],[582,2747],[583,304726],[584,79419],[585,344702],[586,46260],[589,39037],[590,286028],[592,41014],[593,322930],[594,87353],[614,147647],[615,195550],[616,71586],[617,261100],[621,116175],[622,322366],[625,146660],[626,310362],[645,23746],[646,298214],[647,111044],[648,225540],[649,187672],[652,61806],[653,318580],[654,311190],[656,6413],[657,228800],[658,349309],[659,25],[678,21],[679,12386],[680,98616],[681,39847],[685,4648],[686,4009],[688,17472],[689,96577],[690,75654]],
        "metric": "lever-v1"
      }
    },
    "oviraptor": {
      "id": "oviraptor",
      "name": "窃蛋龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "moss-basalt",
      "excavation": "inflate",
      "fieldTool": {
        "variant": "inflate",
        "title": "给气囊充气顶开岩层",
        "instruction": "按住充气按钮，等进度满了，气囊才顶得开岩层",
        "action": "气囊顶岩",
        "label": "气囊顶岩",
        "found": "气囊把岩缝顶开了",
        "answers": [0,1,2],
        "rounds": [[28,54,860],[62,58,1100],[47,40,1350]]
      },
      "camp": "火山气囊坡",
      "eyebrow": "火山气囊坡的新发现",
      "reviveLine": "你把窃蛋龙的骨架拼完整啦",
      "card": {
        "title": "窃蛋龙 · 白垩纪",
        "text": "我的嘴巴像鸟喙，里面没有牙齿，上下喙弯弯的。我的身体靠两条后腿走路，你看嘴巴和小脚，就能找到认识我的线索。"
      },
      "groove": {
        "base": "#262a22",
        "inset": "#262a22",
        "light": "#c6d0a6"
      },
      "voice": {
        "file": "gallery-oviraptor.m4a",
        "start": 0.1021,
        "end": 6.7708,
        "text": "嘿，我是窃蛋龙，名字有点特别吧，认识一个新朋友，可以先从模样开始！"
      },
      "living": {
        "file": "../../assets/oviraptor-3d.webp",
        "aspect": "949/1000"
      },
      "stages": ["art/expedition/oviraptor/stage-1.webp","art/expedition/oviraptor/stage-2.webp","art/expedition/oviraptor/stage-3.webp","art/expedition/oviraptor/stage-4.webp"],
      "waveOrder": ["head","arms","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.2533],[0.0177,0.1795],[0.0914,0.1795],[0.9395,0.4377],[0.991,0.4745],[0.991,0.5114],[0.6077,0.8433],[0.5339,0.8802],[0.4602,0.8802],[0.2389,0.8433],[0.0177,0.6589],[0.009,0.327]],
        "face": {
          "file": "art/expedition/oviraptor/stage-4.webp"
        },
        "bowl": "art/expedition/oviraptor/grooves.webp",
        "sand": {
          "file": "art/expedition/oviraptor/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/expedition/oviraptor/skeleton.webp",
          "box": [57,289,1197,1032]
        },
        "parts": [
          {
            "id": "head",
            "label": "鸟喙头骨和颈骨",
            "box": [57,289,304,576],
            "file": "expedition/oviraptor/bone-head.webp",
            "coverage": [[226,80421],[227,206817],[228,12468],[258,284224],[259,384597],[260,338218],[261,205016],[262,1352],[289,104901],[290,371606],[291,377390],[292,384279],[293,295898],[294,167716],[321,72961],[322,214249],[323,217893],[324,115696],[325,119230],[326,224859],[353,389],[354,16145],[357,260365],[358,99123],[388,1847],[389,352022],[390,47903],[421,239860],[422,290100],[423,101637],[453,16302],[454,149170],[455,15887]]
          },
          {
            "id": "arms",
            "label": "前臂和手爪",
            "box": [89,558,372,845],
            "file": "expedition/oviraptor/bone-arms.webp",
            "coverage": [[454,47638],[455,225018],[456,180816],[457,26504],[486,136863],[487,332733],[488,376977],[489,71104],[516,31745],[517,78897],[518,27257],[519,267685],[520,324464],[521,155821],[547,106309],[548,267063],[549,132815],[550,195240],[551,245849],[552,162538],[553,157380],[578,100113],[579,174637],[580,99102],[581,93943],[582,282492],[583,198043],[584,220945],[585,69071],[610,39195],[611,79073],[612,71469],[613,244343],[614,90617],[642,4],[644,85244],[645,173605],[646,23777],[676,6005],[677,23733]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [768,555,1197,639],
            "file": "expedition/oviraptor/bone-tail.webp",
            "coverage": [[467,78169],[468,214504],[469,200270],[470,180022],[471,147167],[472,124198],[473,79508],[474,36403],[475,1831],[499,49788],[500,118285],[501,103444],[502,99249],[503,80506],[504,94919],[505,97011],[506,115265],[507,129698],[508,110532],[509,84772],[510,7412],[541,525],[542,19297]]
          },
          {
            "id": "legs",
            "label": "后腿",
            "box": [344,610,722,1032],
            "file": "expedition/oviraptor/bone-legs.webp",
            "coverage": [[494,4043],[495,53732],[496,21985],[497,11827],[525,17965],[526,240003],[527,85787],[528,136334],[556,155034],[557,37291],[558,308756],[559,46450],[587,54385],[588,378281],[589,39370],[590,310515],[591,308294],[592,2214],[619,1],[620,245830],[621,90967],[622,53924],[623,272192],[624,146767],[652,86572],[653,191666],[655,11677],[656,270119],[657,79235],[684,5773],[685,339712],[686,769],[688,73417],[689,335695],[716,82337],[717,225712],[720,8775],[721,242015],[747,670],[748,244010],[749,16720],[752,45915],[753,171750],[777,44485],[778,136581],[779,239236],[780,292826],[781,32331],[782,5],[783,5005],[784,213962],[785,221130],[808,7035],[809,109286],[810,182496],[811,158432],[812,4620],[813,15169],[814,125520],[815,242773],[816,296386],[817,67015],[818,26329],[846,952],[847,15617],[848,8157]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [277,483,772,727],
            "file": "expedition/oviraptor/bone-body.webp",
            "coverage": [[392,7988],[393,59734],[394,146747],[395,147528],[396,183624],[397,149769],[398,131774],[399,56141],[400,231],[423,122298],[424,311429],[425,367238],[426,394413],[427,383301],[428,383880],[429,383893],[430,384612],[431,383628],[432,283587],[433,131710],[434,30426],[435,15],[455,100911],[456,194325],[457,309678],[458,283028],[459,230799],[460,234422],[461,294507],[462,382057],[463,384576],[464,368016],[465,352901],[466,336954],[467,194296],[489,98505],[490,168700],[491,190795],[492,232981],[493,293756],[494,373702],[495,328584],[496,114638],[497,74206],[498,82083],[499,80871],[521,160194],[522,192404],[523,208954],[524,161503],[525,219299],[526,5390],[553,149080],[554,376217],[555,179685],[556,184813],[557,1512],[585,139],[586,11659],[587,47633],[588,2510]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/expedition/oviraptor/fragments.webp",
        "pieces": [[22,48,15,72,19],[43,34,38,83,18],[65,45,66,84,19],[65,68,88,77,19]]
      },
      "area": {
        "grid": 32,
        "total": 33519526,
        "weights": [[226,80421],[227,206817],[228,12468],[258,284224],[259,384597],[260,338218],[261,205016],[262,1352],[289,104901],[290,371606],[291,377390],[292,384279],[293,295898],[294,167716],[321,72961],[322,214249],[323,217893],[324,115696],[325,119230],[326,224859],[353,389],[354,16145],[357,260365],[358,99123],[388,1847],[389,352022],[390,47903],[392,7988],[393,59734],[394,146747],[395,147528],[396,183624],[397,149769],[398,131774],[399,56141],[400,231],[421,239860],[422,290100],[423,223935],[424,311429],[425,367238],[426,394413],[427,383301],[428,383880],[429,383893],[430,384612],[431,383628],[432,283587],[433,131710],[434,30426],[435,15],[453,16302],[454,196808],[455,341816],[456,375141],[457,336182],[458,283028],[459,230799],[460,234422],[461,294507],[462,382057],[463,384576],[464,368016],[465,352901],[466,336954],[467,272465],[468,214504],[469,200270],[470,180022],[471,147167],[472,124198],[473,79508],[474,36403],[475,1831],[486,136863],[487,332733],[488,376977],[489,169609],[490,168700],[491,190795],[492,232981],[493,293756],[494,377745],[495,382316],[496,136623],[497,86033],[498,82083],[499,130659],[500,118285],[501,103444],[502,99249],[503,80506],[504,94919],[505,97011],[506,115265],[507,129698],[508,110532],[509,84772],[510,7412],[516,31745],[517,78897],[518,27257],[519,267685],[520,324464],[521,316015],[522,192404],[523,208954],[524,161503],[525,237264],[526,245393],[527,85787],[528,136334],[541,525],[542,19297],[547,106309],[548,267063],[549,132815],[550,195240],[551,245849],[552,162538],[553,306460],[554,376217],[555,179685],[556,339847],[557,38803],[558,308756],[559,46450],[578,100113],[579,174637],[580,99102],[581,93943],[582,282492],[583,198043],[584,220945],[585,69210],[586,11659],[587,102018],[588,380791],[589,39370],[590,310515],[591,308294],[592,2214],[610,39195],[611,79073],[612,71469],[613,244343],[614,90617],[619,1],[620,245830],[621,90967],[622,53924],[623,272192],[624,146767],[642,4],[644,85244],[645,173605],[646,23777],[652,86572],[653,191666],[655,11677],[656,270119],[657,79235],[676,6005],[677,23733],[684,5773],[685,339712],[686,769],[688,73417],[689,335695],[716,82337],[717,225712],[720,8775],[721,242015],[747,670],[748,244010],[749,16720],[752,45915],[753,171750],[777,44485],[778,136581],[779,239236],[780,292826],[781,32331],[782,5],[783,5005],[784,213962],[785,221130],[808,7035],[809,109286],[810,182496],[811,158432],[812,4620],[813,15169],[814,125520],[815,242773],[816,296386],[817,67015],[818,26329],[846,952],[847,15617],[848,8157]],
        "metric": "inflate-v1"
      }
    }
  };
  Object.values(expedition).forEach(fossil=>{
    fossil.journey=fossils.trex.journey;
    fossils[fossil.id]=fossil;
    const entry=catalog.find(item=>item.id===fossil.id);
    entry.dig=true;
    entry.location=fossil.camp+' · 森林挑战';
  });
})();

;
(() => {
  'use strict';
  const {fossils,catalog}=window.FOSSILS;
  const discoveries={
    "iguano": {
      "id": "iguano",
      "name": "禽龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "ochre-fine-sandstone",
      "excavation": "brace",
      "fieldTool": {
        "variant": "brace",
        "title": "找一根合适的撑杆",
        "instruction": "看看裂缝有多宽，选一根刚好能撑住两头的杆",
        "action": "选撑杆",
        "label": "撑杆开岩",
        "found": "撑杆托住了岩层",
        "answers": [2,0,1],
        "points": [[36,42],[67,52],[44,59]]
      },
      "camp": "赭砂撑杆台",
      "eyebrow": "赭砂撑杆台的新发现",
      "reviveLine": "你把禽龙的骨架拼完整啦",
      "card": {
        "title": "禽龙 · 白垩纪",
        "text": "我的大拇指上有尖尖的骨刺，这可是认识我的一个线索。嘴巴前面有喙，后面的牙齿能帮助我咀嚼植物。"
      },
      "groove": {
        "base": "#5c3927",
        "inset": "#5c3927",
        "light": "#f0c293"
      },
      "voice": {
        "file": "gallery-iguano.m4a",
        "start": 0.1021,
        "end": 6.5755,
        "text": "小伙伴你好，我是禽龙，见面先给你一个赞，你刚才观察得可认真啦！"
      },
      "living": {
        "file": "../../assets/iguano-3d.webp",
        "aspect": "1000/666"
      },
      "stages": ["art/discovery/iguano/stage-1.webp","art/discovery/iguano/stage-2.webp","art/discovery/iguano/stage-3.webp","art/discovery/iguano/stage-4.webp"],
      "waveOrder": ["head","arms","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.2744],[0.0213,0.2375],[0.5006,0.2375],[0.991,0.3481],[0.991,0.385],[0.6481,0.68],[0.2794,0.68],[0.0581,0.6062],[0.009,0.3481]],
        "face": {
          "file": "art/discovery/iguano/stage-4.webp"
        },
        "bowl": "art/discovery/iguano/grooves.webp",
        "sand": {
          "file": "art/discovery/iguano/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/iguano/skeleton.webp",
          "box": [57,315,1197,819]
        },
        "parts": [
          {
            "id": "head",
            "label": "头骨和颈骨",
            "box": [57,315,349,502],
            "file": "discovery/iguano/bone-head.webp",
            "coverage": [[258,24289],[259,206917],[260,342928],[261,277310],[262,79956],[289,82896],[290,332860],[291,372862],[292,383673],[293,251010],[294,348615],[295,81293],[321,119731],[322,245496],[323,228588],[324,111298],[325,246],[326,215457],[327,314212],[328,58561],[353,576],[354,28085],[358,34635],[359,289296],[360,244412],[391,141716],[392,198198]]
          },
          {
            "id": "arms",
            "label": "前肢和拇指刺",
            "box": [126,431,431,779],
            "file": "discovery/iguano/bone-arms.webp",
            "coverage": [[329,252],[360,68608],[361,334131],[362,348058],[390,24],[391,70813],[392,185103],[393,372930],[394,136419],[422,28081],[423,377962],[424,362069],[425,241095],[453,8958],[454,258535],[455,95736],[456,98611],[457,285084],[458,24226],[483,6262],[484,163355],[485,266711],[486,186134],[487,4384],[489,223818],[490,164389],[515,58629],[516,292196],[517,180518],[519,24564],[520,27271],[521,293160],[522,38903],[547,103901],[548,180462],[549,4823],[551,101065],[552,357279],[553,155858],[579,171],[580,2460],[582,43376],[583,245488],[584,252987],[585,1999],[614,1733],[615,54244],[616,77918]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [735,396,1197,508],
            "file": "discovery/iguano/bone-tail.webp",
            "coverage": [[338,68400],[339,179307],[340,51311],[341,5507],[370,90840],[371,382810],[372,346534],[373,315388],[374,279744],[375,272551],[376,255350],[377,220458],[378,204371],[379,158677],[380,90357],[381,5379],[402,10771],[403,151168],[404,188091],[405,186802],[406,152586],[407,102837],[408,57111],[409,22462],[410,3905],[411,5019],[412,36614],[413,80709],[414,21127]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [381,347,789,819],
            "file": "discovery/iguano/bone-legs.webp",
            "coverage": [[270,4678],[271,7568],[302,90886],[303,286885],[304,251638],[305,89644],[306,13711],[334,79855],[335,393804],[336,404414],[337,379019],[338,249057],[366,94994],[367,383910],[368,393643],[369,380434],[370,287163],[397,499],[398,268626],[399,370480],[400,392549],[401,306427],[402,64907],[429,170809],[430,318471],[431,196268],[432,331293],[433,166288],[434,113981],[460,88441],[461,380823],[462,59156],[463,149954],[464,334232],[465,7372],[492,189519],[493,360060],[494,17143],[495,154668],[496,392480],[497,224100],[524,133173],[525,228093],[527,7995],[528,151933],[529,352504],[530,138933],[531,11],[556,225717],[557,225530],[561,70571],[562,383779],[563,144613],[587,42619],[588,340803],[589,88145],[593,19],[594,265031],[595,241903],[617,3100],[618,229588],[619,352265],[620,235560],[625,37749],[626,256487],[627,352273],[628,5348],[649,17284],[650,81381],[651,108052],[652,5232],[656,3448],[657,166869],[658,236089],[659,144951]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [337,348,581,601],
            "file": "discovery/iguano/bone-body.webp",
            "coverage": [[269,17],[270,8671],[298,2846],[299,82205],[300,198778],[301,257931],[302,229387],[328,17072],[329,137916],[330,278347],[331,367863],[332,393762],[333,393803],[334,313497],[360,59949],[361,44301],[362,45988],[363,360881],[364,293416],[365,228869],[366,114764],[393,633],[394,104338],[395,193780],[396,181961],[397,164254],[398,48827],[425,41788],[426,156716],[427,166558],[428,151515],[429,93260],[457,411],[458,88933],[459,138618],[460,89831],[461,2468],[491,82],[492,8804]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/iguano/fragments.webp",
        "pieces": [[74,47,87,75,19],[51,56,61,80,20],[41,32,37,83,19],[21,50,16,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 35361992,
        "weights": [[258,24289],[259,206917],[260,342928],[261,277310],[262,79956],[269,17],[270,13349],[271,7568],[289,82896],[290,332860],[291,372862],[292,383673],[293,251010],[294,348615],[295,81293],[298,2846],[299,82205],[300,198778],[301,257931],[302,320273],[303,286885],[304,251638],[305,89644],[306,13711],[321,119731],[322,245496],[323,228588],[324,111298],[325,246],[326,215457],[327,314212],[328,75633],[329,138168],[330,278347],[331,367863],[332,393762],[333,393803],[334,393352],[335,393804],[336,404414],[337,379019],[338,317457],[339,179307],[340,51311],[341,5507],[353,576],[354,28085],[358,34635],[359,289296],[360,372969],[361,378432],[362,394046],[363,360881],[364,293416],[365,228869],[366,209758],[367,383910],[368,393643],[369,380434],[370,378003],[371,382810],[372,346534],[373,315388],[374,279744],[375,272551],[376,255350],[377,220458],[378,204371],[379,158677],[380,90357],[381,5379],[390,24],[391,212529],[392,383301],[393,373563],[394,240757],[395,193780],[396,181961],[397,164753],[398,317453],[399,370480],[400,392549],[401,306427],[402,75678],[403,151168],[404,188091],[405,186802],[406,152586],[407,102837],[408,57111],[409,22462],[410,3905],[411,5019],[412,36614],[413,80709],[414,21127],[422,28081],[423,377962],[424,362069],[425,282883],[426,156716],[427,166558],[428,151515],[429,264069],[430,318471],[431,196268],[432,331293],[433,166288],[434,113981],[453,8958],[454,258535],[455,95736],[456,98611],[457,285495],[458,113159],[459,138618],[460,178272],[461,383291],[462,59156],[463,149954],[464,334232],[465,7372],[483,6262],[484,163355],[485,266711],[486,186134],[487,4384],[489,223818],[490,164389],[491,82],[492,198323],[493,360060],[494,17143],[495,154668],[496,392480],[497,224100],[515,58629],[516,292196],[517,180518],[519,24564],[520,27271],[521,293160],[522,38903],[524,133173],[525,228093],[527,7995],[528,151933],[529,352504],[530,138933],[531,11],[547,103901],[548,180462],[549,4823],[551,101065],[552,357279],[553,155858],[556,225717],[557,225530],[561,70571],[562,383779],[563,144613],[579,171],[580,2460],[582,43376],[583,245488],[584,252987],[585,1999],[587,42619],[588,340803],[589,88145],[593,19],[594,265031],[595,241903],[614,1733],[615,54244],[616,77918],[617,3100],[618,229588],[619,352265],[620,235560],[625,37749],[626,256487],[627,352273],[628,5348],[649,17284],[650,81381],[651,108052],[652,5232],[656,3448],[657,166869],[658,236089],[659,144951]],
        "metric": "discovery-brace-v1"
      }
    },
    "carno": {
      "id": "carno",
      "name": "食肉牛龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "wine-tuff",
      "excavation": "rhythm",
      "fieldTool": {
        "variant": "rhythm",
        "title": "记住敲击的顺序",
        "instruction": "先看哪些石头亮起来，再按同样的顺序敲",
        "action": "记敲击",
        "label": "记忆敲岩",
        "found": "这一段岩层敲松了",
        "answers": [0,1,2],
        "points": [[24,41],[47,32],[75,43],[52,58]],
        "rounds": [[2,0,1],[1,3,2],[0,2,3,1]]
      },
      "camp": "酒红回响台",
      "eyebrow": "酒红回响台的新发现",
      "reviveLine": "你把食肉牛龙的骨架拼完整啦",
      "card": {
        "title": "食肉牛龙 · 白垩纪",
        "text": "我的眼睛上方各有一只角，正好一左一右，前肢却短得很特别。我的嘴巴也比较短，皮肤上有一片片鳞片。"
      },
      "groove": {
        "base": "#432b2e",
        "inset": "#432b2e",
        "light": "#dcb7ac"
      },
      "voice": {
        "file": "gallery-carno.m4a",
        "start": 0.1021,
        "end": 6.4583,
        "text": "我来啦，我是食肉牛龙，名字有点长，你可以先记住我头上的小标志！"
      },
      "living": {
        "file": "../../assets/carno-3d.webp",
        "aspect": "937/1000"
      },
      "stages": ["art/discovery/carno/stage-1.webp","art/discovery/carno/stage-2.webp","art/discovery/carno/stage-3.webp","art/discovery/carno/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.2727],[0.0548,0.2358],[0.0917,0.2358],[0.9767,0.3464],[0.991,0.3833],[0.991,0.4202],[0.6817,0.7889],[0.2392,0.7889],[0.0179,0.4571],[0.009,0.3833]],
        "face": {
          "file": "art/discovery/carno/stage-4.webp"
        },
        "bowl": "art/discovery/carno/grooves.webp",
        "sand": {
          "file": "art/discovery/carno/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/carno/skeleton.webp",
          "box": [57,339,1197,919]
        },
        "parts": [
          {
            "id": "head",
            "label": "双角头骨和颈骨",
            "box": [57,339,354,569],
            "file": "discovery/carno/bone-head.webp",
            "coverage": [[259,60687],[260,1],[289,14457],[290,220230],[291,289576],[292,281266],[293,245405],[294,68974],[321,7239],[322,278426],[323,394680],[324,394699],[325,404951],[326,355817],[327,73009],[353,161945],[354,384804],[355,385117],[356,384757],[357,375764],[358,363883],[359,295977],[360,132205],[361,3502],[385,93648],[386,169691],[387,215572],[388,384763],[389,211015],[390,166551],[391,361945],[392,199710],[418,119430],[419,330939],[420,125444],[421,2095],[422,731],[423,141075],[424,152566],[450,101887],[451,29627],[455,15707],[456,756]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [701,462,1197,583],
            "file": "discovery/carno/bone-tail.webp",
            "coverage": [[369,1419],[370,6781],[378,8],[379,236],[380,16],[401,22798],[402,293832],[403,232531],[404,184480],[405,180897],[406,170062],[407,186984],[408,213254],[409,255804],[410,282646],[411,217231],[412,164286],[413,121181],[414,29362],[433,41907],[434,367505],[435,369551],[436,351741],[437,344961],[438,333206],[439,270104],[440,192703],[441,78390],[442,5271],[446,2083],[465,2395],[466,148208],[467,108147],[468,76251],[469,62601],[470,29081],[471,6070]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [315,424,839,919],
            "file": "discovery/carno/bone-legs.webp",
            "coverage": [[334,6472],[335,3],[366,202571],[367,232180],[368,147127],[369,79706],[397,1012],[398,311093],[399,384831],[400,394662],[401,343002],[429,103186],[430,343200],[431,384851],[432,394829],[433,332314],[459,4597],[460,103034],[461,302119],[462,384330],[463,335166],[464,387280],[465,111226],[490,7],[491,103058],[492,320093],[493,372605],[494,163825],[495,290802],[496,324155],[497,2],[522,86958],[523,357278],[524,97754],[525,161197],[526,24090],[527,73282],[528,327006],[529,145036],[530,1],[554,185142],[555,384686],[556,105554],[560,254915],[561,378455],[562,186847],[586,2907],[587,250289],[588,223929],[589,2],[592,44119],[593,259746],[594,357943],[595,166676],[596,3892],[619,67246],[620,382475],[621,111728],[626,34650],[627,314907],[628,259873],[629,94],[651,133030],[652,360077],[653,36954],[659,110741],[660,384299],[661,13136],[682,100201],[683,369835],[684,101744],[691,135217],[692,394533],[693,88380],[712,133676],[713,320483],[714,317665],[715,145746],[716,8],[721,21728],[722,203342],[723,333521],[724,301490],[725,3795],[744,13266],[745,25920],[746,9],[753,120],[754,34942],[755,17364],[756,41702]]
          },
          {
            "id": "body",
            "label": "肋骨和退化前肢",
            "box": [297,416,565,636],
            "file": "discovery/carno/bone-body.webp",
            "coverage": [[330,30052],[331,53270],[332,79140],[333,70800],[334,16716],[360,9015],[361,205694],[362,324338],[363,292059],[364,338415],[365,317147],[366,128046],[392,184705],[393,384798],[394,394795],[395,384883],[396,384798],[397,383979],[398,73876],[424,230681],[425,370139],[426,344633],[427,279258],[428,196422],[429,126013],[455,62748],[456,313520],[457,279635],[458,218695],[459,146021],[460,59928],[488,11783],[489,123003],[490,165783],[491,52611],[521,5],[522,9359]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/carno/fragments.webp",
        "pieces": [[19,35,13,69,19],[45,53,39,82,20],[68,41,64,87,19],[80,63,86,75,19]]
      },
      "area": {
        "grid": 32,
        "total": 37056208,
        "weights": [[259,60687],[260,1],[289,14457],[290,220230],[291,289576],[292,281266],[293,245405],[294,68974],[321,7239],[322,278426],[323,394680],[324,394699],[325,404951],[326,355817],[327,73009],[330,30052],[331,53270],[332,79140],[333,70800],[334,23188],[335,3],[353,161945],[354,384804],[355,385117],[356,384757],[357,375764],[358,363883],[359,295977],[360,141220],[361,209196],[362,324338],[363,292059],[364,338415],[365,317147],[366,330617],[367,232180],[368,147127],[369,81125],[370,6781],[378,8],[379,236],[380,16],[385,93648],[386,169691],[387,215572],[388,384763],[389,211015],[390,166551],[391,361945],[392,384415],[393,384798],[394,394795],[395,384883],[396,384798],[397,384991],[398,384969],[399,384831],[400,394662],[401,365800],[402,293832],[403,232531],[404,184480],[405,180897],[406,170062],[407,186984],[408,213254],[409,255804],[410,282646],[411,217231],[412,164286],[413,121181],[414,29362],[418,119430],[419,330939],[420,125444],[421,2095],[422,731],[423,141075],[424,383247],[425,370139],[426,344633],[427,279258],[428,196422],[429,229199],[430,343200],[431,384851],[432,394829],[433,374221],[434,367505],[435,369551],[436,351741],[437,344961],[438,333206],[439,270104],[440,192703],[441,78390],[442,5271],[446,2083],[450,101887],[451,29627],[455,78455],[456,314276],[457,279635],[458,218695],[459,150618],[460,162962],[461,302119],[462,384330],[463,335166],[464,387280],[465,113621],[466,148208],[467,108147],[468,76251],[469,62601],[470,29081],[471,6070],[488,11783],[489,123003],[490,165790],[491,155669],[492,320093],[493,372605],[494,163825],[495,290802],[496,324155],[497,2],[521,5],[522,96317],[523,357278],[524,97754],[525,161197],[526,24090],[527,73282],[528,327006],[529,145036],[530,1],[554,185142],[555,384686],[556,105554],[560,254915],[561,378455],[562,186847],[586,2907],[587,250289],[588,223929],[589,2],[592,44119],[593,259746],[594,357943],[595,166676],[596,3892],[619,67246],[620,382475],[621,111728],[626,34650],[627,314907],[628,259873],[629,94],[651,133030],[652,360077],[653,36954],[659,110741],[660,384299],[661,13136],[682,100201],[683,369835],[684,101744],[691,135217],[692,394533],[693,88380],[712,133676],[713,320483],[714,317665],[715,145746],[716,8],[721,21728],[722,203342],[723,333521],[724,301490],[725,3795],[744,13266],[745,25920],[746,9],[753,120],[754,34942],[755,17364],[756,41702]],
        "metric": "discovery-rhythm-v1"
      }
    },
    "proto": {
      "id": "proto",
      "name": "原角龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "cream-limestone",
      "excavation": "echo",
      "fieldTool": {
        "title": "敲一敲，找回声",
        "instruction": "轻点探测点，看哪里回声更清楚",
        "action": "探测",
        "label": "回声探测",
        "found": "找到能松开的薄岩层啦",
        "points": [[23,36],[49,32],[76,39],[24,59],[50,63],[77,57]],
        "answers": [2,3,1]
      },
      "camp": "奶岩探测坡",
      "eyebrow": "奶岩探测坡的新发现",
      "reviveLine": "你把原角龙的骨架拼完整啦",
      "card": {
        "title": "原角龙 · 白垩纪",
        "text": "我的脖子后面有一圈骨质颈盾，嘴巴前面的喙像鹦鹉嘴。四条腿支撑着身体，我爱吃植物，个头比三角龙小得多。"
      },
      "groove": {
        "base": "#645b42",
        "inset": "#645b42",
        "light": "#f3e5c3"
      },
      "voice": {
        "file": "gallery-proto.m4a",
        "start": 0.1021,
        "end": 7.1094,
        "text": "你好，我是原角龙，今天让我凑近一点，把圆圆的脸和你认认真真地见个面！"
      },
      "living": {
        "file": "../../assets/proto-3d.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/proto/stage-1.webp","art/discovery/proto/stage-2.webp","art/discovery/proto/stage-3.webp","art/discovery/proto/stage-4.webp"],
      "waveOrder": ["head","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3723],[0.1325,0.188],[0.28,0.188],[0.575,0.2617],[0.991,0.4092],[0.991,0.4461],[0.7225,0.7042],[0.3538,0.7411],[0.3169,0.7411],[0.1325,0.7042],[0.0956,0.6673],[0.009,0.483]],
        "face": {
          "file": "art/discovery/proto/stage-4.webp"
        },
        "bowl": "art/discovery/proto/grooves.webp",
        "sand": {
          "file": "art/discovery/proto/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/proto/skeleton.webp",
          "box": [57,275,1197,865]
        },
        "parts": [
          {
            "id": "head",
            "label": "头骨和颈盾",
            "box": [57,275,411,632],
            "file": "discovery/proto/bone-head.webp",
            "coverage": [[229,24176],[230,272609],[231,369604],[232,255733],[233,27114],[261,257931],[262,177561],[263,367056],[264,383795],[265,283067],[266,892],[292,42789],[293,346864],[294,179360],[295,383934],[296,287741],[297,330636],[298,89512],[323,128975],[324,314361],[325,403429],[326,393882],[327,344514],[328,19032],[329,301051],[330,108374],[354,71613],[355,377739],[356,384005],[357,393597],[358,384100],[359,383489],[360,374198],[361,377807],[362,107829],[385,41608],[386,365397],[387,384010],[388,383889],[389,394297],[390,384483],[391,384284],[392,383655],[393,310457],[394,5040],[417,186393],[418,383734],[419,383971],[420,383871],[421,393694],[422,383615],[423,189556],[424,124652],[425,6295],[449,178459],[450,181674],[451,362082],[452,383676],[453,381134],[454,244012],[455,3165],[481,15040],[482,196795],[483,361935],[484,181487],[485,37649],[487,9],[514,526],[515,6539]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [188,443,537,865],
            "file": "discovery/proto/bone-front.webp",
            "coverage": [[362,127334],[363,220147],[364,248903],[365,116969],[393,72182],[394,388288],[395,384058],[396,383024],[397,184223],[424,177060],[425,357052],[426,372383],[427,379722],[428,150692],[429,3493],[455,40263],[456,378729],[457,349487],[458,393215],[459,219325],[487,41285],[488,332745],[489,301039],[490,392854],[491,280679],[492,92787],[519,36962],[520,361183],[521,44434],[522,129588],[523,263544],[524,321606],[525,46864],[551,210028],[552,343077],[553,24453],[555,115967],[556,383192],[557,156487],[582,87952],[583,363708],[584,60739],[587,152595],[588,331442],[589,13187],[613,4148],[614,269400],[615,296775],[618,3727],[619,327171],[620,182770],[644,10804],[645,267134],[646,329878],[647,148654],[649,5865],[650,157667],[651,383075],[652,106460],[677,1139],[678,10680],[681,75531],[682,280459],[683,256665],[684,99186],[714,24],[715,1732]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [792,432,1197,579],
            "file": "discovery/proto/bone-tail.webp",
            "coverage": [[372,153272],[373,102744],[374,8546],[404,274670],[405,369295],[406,238352],[407,82923],[408,8556],[436,132562],[437,336490],[438,349660],[439,369430],[440,296860],[441,187486],[442,82596],[443,25181],[444,3870],[445,28110],[446,32711],[469,47813],[470,69564],[471,123920],[472,171425],[473,193001],[474,216930],[475,211827],[476,173032],[477,96398],[478,3177]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [564,383,859,843],
            "file": "discovery/proto/bone-legs.webp",
            "coverage": [[305,14608],[337,318717],[338,258579],[339,109650],[340,14330],[368,12858],[369,366692],[370,384121],[371,383215],[372,101798],[400,94722],[401,321437],[402,384215],[403,383995],[404,108859],[431,14708],[432,109357],[433,374470],[434,382753],[435,365124],[436,90103],[463,61252],[464,287070],[465,144583],[466,329270],[467,73356],[468,156653],[495,208808],[496,298900],[497,186997],[498,374974],[499,84905],[500,34336],[527,126846],[528,373606],[529,55282],[530,376061],[531,338811],[532,20138],[560,260891],[561,185507],[562,28867],[563,277999],[564,273465],[565,18422],[591,399],[592,289765],[593,210417],[595,43414],[596,376861],[597,213231],[622,72392],[623,278611],[624,374217],[625,93862],[627,1176],[628,334982],[629,219632],[654,2118],[655,53750],[656,51233],[658,19870],[659,241364],[660,373542],[661,251909],[690,4830],[691,54767],[692,66241],[693,30995]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [403,367,673,645],
            "file": "discovery/proto/bone-body.webp",
            "coverage": [[300,16675],[301,99318],[302,122262],[303,114715],[304,106355],[305,3497],[330,74582],[331,195245],[332,299756],[333,361632],[334,364410],[335,379963],[336,401964],[337,60325],[362,101234],[363,153360],[364,134863],[365,267214],[366,384270],[367,383795],[368,381023],[369,17417],[397,191943],[398,344535],[399,350930],[400,222365],[427,747],[428,143582],[429,232317],[430,265092],[431,220733],[432,27089],[459,80708],[460,284083],[461,149574],[462,252802],[463,72597],[491,4345],[492,150555],[493,174118],[494,148456],[495,647],[524,3],[525,69241],[526,25]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/proto/fragments.webp",
        "pieces": [[21,36,15,75,18],[45,48,38,83,19],[64,65,62,84,20],[82,48,86,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 55040993,
        "weights": [[229,24176],[230,272609],[231,369604],[232,255733],[233,27114],[261,257931],[262,177561],[263,367056],[264,383795],[265,283067],[266,892],[292,42789],[293,346864],[294,179360],[295,383934],[296,287741],[297,330636],[298,89512],[300,16675],[301,99318],[302,122262],[303,114715],[304,106355],[305,18105],[323,128975],[324,314361],[325,403429],[326,393882],[327,344514],[328,19032],[329,301051],[330,182956],[331,195245],[332,299756],[333,361632],[334,364410],[335,379963],[336,401964],[337,379042],[338,258579],[339,109650],[340,14330],[354,71613],[355,377739],[356,384005],[357,393597],[358,384100],[359,383489],[360,374198],[361,377807],[362,336397],[363,373507],[364,383766],[365,384183],[366,384270],[367,383795],[368,393881],[369,384109],[370,384121],[371,383215],[372,255070],[373,102744],[374,8546],[385,41608],[386,365397],[387,384010],[388,383889],[389,394297],[390,384483],[391,384284],[392,383655],[393,382639],[394,393328],[395,384058],[396,383024],[397,376166],[398,344535],[399,350930],[400,317087],[401,321437],[402,384215],[403,383995],[404,383529],[405,369295],[406,238352],[407,82923],[408,8556],[417,186393],[418,383734],[419,383971],[420,383871],[421,393694],[422,383615],[423,189556],[424,301712],[425,363347],[426,372383],[427,380469],[428,294274],[429,235810],[430,265092],[431,235441],[432,136446],[433,374470],[434,382753],[435,365124],[436,222665],[437,336490],[438,349660],[439,369430],[440,296860],[441,187486],[442,82596],[443,25181],[444,3870],[445,28110],[446,32711],[449,178459],[450,181674],[451,362082],[452,383676],[453,381134],[454,244012],[455,43428],[456,378729],[457,349487],[458,393215],[459,300033],[460,284083],[461,149574],[462,252802],[463,133849],[464,287070],[465,144583],[466,329270],[467,73356],[468,156653],[469,47813],[470,69564],[471,123920],[472,171425],[473,193001],[474,216930],[475,211827],[476,173032],[477,96398],[478,3177],[481,15040],[482,196795],[483,361935],[484,181487],[485,37649],[487,41294],[488,332745],[489,301039],[490,392854],[491,285024],[492,243342],[493,174118],[494,148456],[495,209455],[496,298900],[497,186997],[498,374974],[499,84905],[500,34336],[514,526],[515,6539],[519,36962],[520,361183],[521,44434],[522,129588],[523,263544],[524,321609],[525,116105],[526,25],[527,126846],[528,373606],[529,55282],[530,376061],[531,338811],[532,20138],[551,210028],[552,343077],[553,24453],[555,115967],[556,383192],[557,156487],[560,260891],[561,185507],[562,28867],[563,277999],[564,273465],[565,18422],[582,87952],[583,363708],[584,60739],[587,152595],[588,331442],[589,13187],[591,399],[592,289765],[593,210417],[595,43414],[596,376861],[597,213231],[613,4148],[614,269400],[615,296775],[618,3727],[619,327171],[620,182770],[622,72392],[623,278611],[624,374217],[625,93862],[627,1176],[628,334982],[629,219632],[644,10804],[645,267134],[646,329878],[647,148654],[649,5865],[650,157667],[651,383075],[652,106460],[654,2118],[655,53750],[656,51233],[658,19870],[659,241364],[660,373542],[661,251909],[677,1139],[678,10680],[681,75531],[682,280459],[683,256665],[684,99186],[690,4830],[691,54767],[692,66241],[693,30995],[714,24],[715,1732]],
        "metric": "discovery-echo-v1"
      }
    },
    "psittaco": {
      "id": "psittaco",
      "name": "鹦鹉嘴龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "terracotta-mudstone",
      "excavation": "rope",
      "fieldTool": {
        "variant": "rope",
        "title": "把绳环拉向箭头",
        "instruction": "抓住绳环，沿着虚线拉开松动的岩层",
        "action": "拉绳",
        "label": "绳索拉岩",
        "found": "岩层拉开一道口子",
        "answers": [0,1,2],
        "rounds": [[25,42,42,27,"向右上"],[72,48,53,61,"向左下"],[46,56,68,48,"向右上"]]
      },
      "camp": "陶纹绳索谷",
      "eyebrow": "陶纹绳索谷的新发现",
      "reviveLine": "你把鹦鹉嘴龙的骨架拼完整啦",
      "card": {
        "title": "鹦鹉嘴龙 · 白垩纪",
        "text": "我的嘴巴前面弯弯的喙，模样像鹦鹉，名字就是这么来的。我的食物是植物，长长的尾巴连在身体后面，很容易找到。"
      },
      "groove": {
        "base": "#5b3125",
        "inset": "#5b3125",
        "light": "#f0bd9a"
      },
      "voice": {
        "file": "gallery-psittaco.m4a",
        "start": 0.1021,
        "end": 6.862,
        "text": "嗨，叫我鹦鹉嘴龙吧，我的名字藏着一个小秘密，今天想请你亲自发现它！"
      },
      "living": {
        "file": "../../assets/psittaco-3d.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/psittaco/stage-1.webp","art/discovery/psittaco/stage-2.webp","art/discovery/psittaco/stage-3.webp","art/discovery/psittaco/stage-4.webp"],
      "waveOrder": ["head","arms","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3658],[0.0592,0.292],[0.2067,0.292],[0.5755,0.3289],[0.991,0.4027],[0.991,0.4395],[0.6123,0.8083],[0.5386,0.8083],[0.3173,0.7714],[0.1698,0.6977],[0.133,0.6608],[0.009,0.4764]],
        "face": {
          "file": "art/discovery/psittaco/stage-4.webp"
        },
        "bowl": "art/discovery/psittaco/grooves.webp",
        "sand": {
          "file": "art/discovery/psittaco/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/psittaco/skeleton.webp",
          "box": [57,416,1197,947]
        },
        "parts": [
          {
            "id": "head",
            "label": "喙状头骨和颈骨",
            "box": [57,416,377,615],
            "file": "discovery/psittaco/bone-head.webp",
            "coverage": [[323,2],[324,48623],[325,127450],[326,114737],[327,3452],[354,38056],[355,259472],[356,382798],[357,394437],[358,383864],[359,196508],[360,12284],[385,29046],[386,338657],[387,384330],[388,384700],[389,394418],[390,384157],[391,369913],[392,136860],[393,4],[417,180024],[418,381213],[419,383858],[420,384623],[421,394406],[422,372534],[423,377542],[424,345302],[425,74225],[449,114638],[450,172257],[451,384233],[452,377532],[453,240690],[454,60830],[455,205861],[456,342748],[457,8344],[481,17],[482,182043],[483,172497],[484,24806],[487,1]]
          },
          {
            "id": "arms",
            "label": "两条前肢",
            "box": [232,554,428,876],
            "file": "discovery/psittaco/bone-arms.webp",
            "coverage": [[455,1914],[456,41434],[457,296310],[458,200128],[487,87390],[488,382323],[489,379050],[490,165230],[519,235896],[520,394090],[521,206172],[551,135690],[552,253778],[553,276966],[554,21245],[582,6],[583,245951],[584,168606],[585,165140],[586,239263],[614,191305],[615,205080],[616,426],[617,250668],[618,88299],[645,3167],[646,241308],[647,51820],[648,153166],[649,274379],[678,6],[679,3943],[680,258444],[681,129005],[712,18714],[713,1005]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [741,496,1197,621],
            "file": "discovery/psittaco/bone-tail.webp",
            "coverage": [[403,48248],[404,3352],[434,8064],[435,352075],[436,264025],[437,204653],[438,117064],[439,60489],[440,50326],[441,47960],[442,72047],[443,91094],[444,85603],[445,31676],[466,22253],[467,345625],[468,365461],[469,370998],[470,362321],[471,345936],[472,329151],[473,297857],[474,221198],[475,146051],[476,100911],[477,97813],[478,32216],[499,78747],[500,126912],[501,64863],[502,84161],[503,63941],[504,34128],[505,4021]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [395,442,770,947],
            "file": "discovery/psittaco/bone-legs.webp",
            "coverage": [[366,89116],[367,130934],[368,108060],[369,20801],[398,171789],[399,360559],[400,369195],[401,311245],[402,181856],[403,1831],[430,177557],[431,384564],[432,394240],[433,384437],[434,370236],[435,1944],[462,257433],[463,384539],[464,394152],[465,384667],[466,316561],[493,94622],[494,381478],[495,371020],[496,386027],[497,280716],[498,132518],[524,61292],[525,303757],[526,219043],[527,84085],[528,361572],[529,236499],[530,70545],[555,54348],[556,360887],[557,125034],[559,188305],[560,379723],[561,52988],[562,8],[587,38711],[588,363488],[589,62559],[591,62465],[592,372697],[593,334883],[594,2746],[620,222127],[621,166696],[624,48650],[625,331144],[626,163199],[652,179491],[653,318451],[657,83692],[658,377144],[659,99963],[683,8519],[684,297219],[685,258717],[689,3337],[690,345386],[691,187272],[714,149286],[715,308347],[716,368488],[717,43523],[720,1667],[721,86765],[722,372029],[723,142563],[746,17574],[747,19728],[748,24517],[751,7254],[752,226263],[753,323234],[754,282486],[755,41104],[784,1860],[786,6641]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [354,442,570,714],
            "file": "discovery/psittaco/bone-body.webp",
            "coverage": [[363,25631],[364,102751],[365,137014],[366,89807],[393,23479],[394,134256],[395,307452],[396,312260],[397,368484],[398,194873],[425,250762],[426,376802],[427,384517],[428,384462],[429,379223],[430,204624],[457,79859],[458,186506],[459,325904],[460,292330],[461,252091],[462,63339],[490,118234],[491,246247],[492,231323],[493,111442],[494,1507],[521,93044],[522,231385],[523,156416],[524,230477],[525,37571],[553,23488],[554,116120],[555,101477],[556,22712],[586,506],[587,2]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/psittaco/fragments.webp",
        "pieces": [[30,34,14,76,18],[57,38,41,82,19],[72,61,86,74,19],[41,62,65,86,20]]
      },
      "area": {
        "grid": 32,
        "total": 42952994,
        "weights": [[323,2],[324,48623],[325,127450],[326,114737],[327,3452],[354,38056],[355,259472],[356,382798],[357,394437],[358,383864],[359,196508],[360,12284],[363,25631],[364,102751],[365,137014],[366,178923],[367,130934],[368,108060],[369,20801],[385,29046],[386,338657],[387,384330],[388,384700],[389,394418],[390,384157],[391,369913],[392,136860],[393,23483],[394,134256],[395,307452],[396,312260],[397,368484],[398,366662],[399,360559],[400,369195],[401,311245],[402,181856],[403,50079],[404,3352],[417,180024],[418,381213],[419,383858],[420,384623],[421,394406],[422,372534],[423,377542],[424,345302],[425,324987],[426,376802],[427,384517],[428,384462],[429,379223],[430,382181],[431,384564],[432,394240],[433,384437],[434,378300],[435,354019],[436,264025],[437,204653],[438,117064],[439,60489],[440,50326],[441,47960],[442,72047],[443,91094],[444,85603],[445,31676],[449,114638],[450,172257],[451,384233],[452,377532],[453,240690],[454,60830],[455,207775],[456,384182],[457,384513],[458,386634],[459,325904],[460,292330],[461,252091],[462,320772],[463,384539],[464,394152],[465,384667],[466,338814],[467,345625],[468,365461],[469,370998],[470,362321],[471,345936],[472,329151],[473,297857],[474,221198],[475,146051],[476,100911],[477,97813],[478,32216],[481,17],[482,182043],[483,172497],[484,24806],[487,87391],[488,382323],[489,379050],[490,283464],[491,246247],[492,231323],[493,206064],[494,382985],[495,371020],[496,386027],[497,280716],[498,132518],[499,78747],[500,126912],[501,64863],[502,84161],[503,63941],[504,34128],[505,4021],[519,235896],[520,394090],[521,299216],[522,231385],[523,156416],[524,291769],[525,341328],[526,219043],[527,84085],[528,361572],[529,236499],[530,70545],[551,135690],[552,253778],[553,300454],[554,137365],[555,155825],[556,383599],[557,125034],[559,188305],[560,379723],[561,52988],[562,8],[582,6],[583,245951],[584,168606],[585,165140],[586,239769],[587,38713],[588,363488],[589,62559],[591,62465],[592,372697],[593,334883],[594,2746],[614,191305],[615,205080],[616,426],[617,250668],[618,88299],[620,222127],[621,166696],[624,48650],[625,331144],[626,163199],[645,3167],[646,241308],[647,51820],[648,153166],[649,274379],[652,179491],[653,318451],[657,83692],[658,377144],[659,99963],[678,6],[679,3943],[680,258444],[681,129005],[683,8519],[684,297219],[685,258717],[689,3337],[690,345386],[691,187272],[712,18714],[713,1005],[714,149286],[715,308347],[716,368488],[717,43523],[720,1667],[721,86765],[722,372029],[723,142563],[746,17574],[747,19728],[748,24517],[751,7254],[752,226263],[753,323234],[754,282486],[755,41104],[784,1860],[786,6641]],
        "metric": "discovery-rope-v1"
      }
    },
    "kentro": {
      "id": "kentro",
      "name": "肯氏龙",
      "era": "jurassic",
      "eraLabel": "侏罗纪",
      "isDinosaur": true,
      "rock": "blue-banded-slate",
      "excavation": "wedge",
      "fieldTool": {
        "title": "沿着裂缝摆好楔子",
        "instruction": "旋转青色楔子，和浅色裂缝摆成同一个方向",
        "action": "对齐",
        "label": "楔子撬岩",
        "found": "这片断层撬开啦",
        "points": [[27,53],[70,46],[45,35]],
        "answers": [2,0,3]
      },
      "camp": "蓝纹楔岩坡",
      "eyebrow": "蓝纹楔岩坡的新发现",
      "reviveLine": "你把肯氏龙的骨架拼完整啦",
      "card": {
        "title": "肯氏龙 · 侏罗纪",
        "text": "从身体前面往后看，背上的骨板会变成长长的尖刺，尾巴上也有刺。我的食物是植物，和背着大骨板的剑龙是亲戚。"
      },
      "groove": {
        "base": "#283c4c",
        "inset": "#283c4c",
        "light": "#c7dbe4"
      },
      "voice": {
        "file": "gallery-kentro.m4a",
        "start": 0.1021,
        "end": 7.1485,
        "text": "嘿，我是肯氏龙，我的背后藏着一串特别的形状，今天想请你当小小发现家！"
      },
      "living": {
        "file": "../../assets/kentro-3d.webp",
        "aspect": "1254/1254"
      },
      "stages": ["art/discovery/kentro/stage-1.webp","art/discovery/kentro/stage-2.webp","art/discovery/kentro/stage-3.webp","art/discovery/kentro/stage-4.webp"],
      "waveOrder": ["head","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.4919],[0.0195,0.455],[0.2408,0.3075],[0.3145,0.2706],[0.5727,0.1969],[0.6833,0.1969],[0.991,0.3444],[0.991,0.4181],[0.6464,0.7131],[0.2039,0.7131],[0.0933,0.6762],[0.009,0.5288]],
        "face": {
          "file": "art/discovery/kentro/stage-4.webp"
        },
        "bowl": "art/discovery/kentro/grooves.webp",
        "sand": {
          "file": "art/discovery/kentro/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/kentro/skeleton.webp",
          "box": [57,299,1197,827]
        },
        "parts": [
          {
            "id": "head",
            "label": "头颈和前段小骨板",
            "box": [57,435,335,638],
            "file": "discovery/kentro/bone-head.webp",
            "coverage": [[359,213439],[360,63517],[390,201369],[391,317385],[392,164081],[420,599],[421,178555],[422,342775],[423,341884],[424,17963],[450,85473],[451,215531],[452,221254],[453,361570],[454,371840],[455,192240],[481,129182],[482,377176],[483,335000],[484,177138],[485,159585],[486,111041],[487,16851],[513,25555],[514,27355],[515,10]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [193,505,411,827],
            "file": "discovery/kentro/bone-front.webp",
            "coverage": [[393,15161],[423,3542],[424,171028],[425,370460],[426,108262],[455,181811],[456,384735],[457,291634],[458,34102],[486,59314],[487,367567],[488,376464],[489,70823],[518,90756],[519,379059],[520,339967],[521,91833],[550,181616],[551,157921],[552,259962],[553,133049],[581,12779],[582,278747],[583,26431],[584,183847],[585,220318],[613,133731],[614,184271],[616,290861],[617,62040],[644,134],[645,214581],[646,122340],[647,98421],[648,369739],[649,24774],[679,1910],[680,7395]]
          },
          {
            "id": "tail",
            "label": "尾骨和尾刺",
            "box": [759,401,1197,594],
            "file": "discovery/kentro/bone-tail.webp",
            "coverage": [[341,4393],[342,104020],[343,10550],[372,47577],[373,234138],[374,33862],[375,34050],[380,908],[381,96444],[382,1345],[403,33297],[404,345186],[405,96777],[406,204079],[407,33313],[411,13562],[412,206862],[413,70873],[414,42479],[435,158775],[436,383552],[437,392308],[438,277823],[439,205868],[440,81584],[441,25082],[442,36583],[443,289166],[444,263307],[445,124704],[446,435],[467,102151],[468,158760],[469,212199],[470,251336],[471,277862],[472,273205],[473,266196],[474,238025],[475,188108],[476,30454],[499,1549],[500,5]]
          },
          {
            "id": "legs",
            "label": "后腿",
            "box": [467,508,760,827],
            "file": "discovery/kentro/bone-legs.webp",
            "coverage": [[400,4807],[430,6939],[431,12482],[432,273511],[433,316331],[461,2891],[462,126053],[463,276116],[464,342326],[465,252815],[466,18054],[493,55013],[494,344637],[495,92503],[496,355277],[497,78103],[498,13827],[525,196883],[526,374793],[527,58571],[528,385767],[529,251806],[557,201112],[558,205918],[559,3],[560,248627],[561,340928],[562,36139],[589,273130],[590,141449],[592,6],[593,214140],[594,292459],[595,4487],[620,5498],[621,342878],[622,149005],[625,61771],[626,384004],[627,60279],[651,1015],[652,216239],[653,333349],[654,125796],[656,15895],[657,267296],[658,382766],[659,78528],[688,10],[689,11295],[690,16602],[691,1]]
          },
          {
            "id": "body",
            "label": "背部骨板、长刺和躯干",
            "box": [302,299,867,687],
            "file": "discovery/kentro/bone-body.webp",
            "coverage": [[241,11572],[242,21479],[244,38782],[271,6182],[272,22331],[273,166811],[274,1606],[275,157073],[276,51140],[277,23996],[278,1211],[298,23836],[299,144833],[300,141321],[301,110367],[302,133095],[303,177561],[304,165949],[305,93741],[306,185167],[307,108425],[308,81502],[309,117110],[328,33756],[329,245515],[330,250624],[331,299137],[332,379068],[333,302151],[334,327615],[335,294557],[336,361868],[337,160510],[338,263177],[339,91153],[340,210008],[341,2],[360,157151],[361,375445],[362,362477],[363,382107],[364,384631],[365,384695],[366,384639],[367,384729],[368,394464],[369,380716],[370,248195],[371,328384],[372,21147],[392,200024],[393,369275],[394,394565],[395,380519],[396,376267],[397,376261],[398,342949],[399,378332],[400,389695],[401,384766],[402,384643],[403,329500],[404,916],[423,34154],[424,195794],[425,14168],[426,223361],[427,308903],[428,321153],[429,260807],[430,219440],[431,302886],[432,120749],[433,68285],[434,374133],[435,213844],[455,1771],[457,14756],[458,278235],[459,292201],[460,180663],[461,215288],[462,69805],[463,73880],[464,1518],[466,125256],[467,85176],[489,182652],[490,258834],[491,278217],[492,189230],[493,97690],[498,4],[499,8593],[521,84923],[522,176778],[523,210480],[524,106600],[553,7012],[554,56270],[555,28690]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/kentro/fragments.webp",
        "pieces": [[22,46,15,72,19],[43,32,38,83,18],[65,43,66,84,19],[65,66,88,77,19]]
      },
      "area": {
        "grid": 32,
        "total": 44435557,
        "weights": [[241,11572],[242,21479],[244,38782],[271,6182],[272,22331],[273,166811],[274,1606],[275,157073],[276,51140],[277,23996],[278,1211],[298,23836],[299,144833],[300,141321],[301,110367],[302,133095],[303,177561],[304,165949],[305,93741],[306,185167],[307,108425],[308,81502],[309,117110],[328,33756],[329,245515],[330,250624],[331,299137],[332,379068],[333,302151],[334,327615],[335,294557],[336,361868],[337,160510],[338,263177],[339,91153],[340,210008],[341,4395],[342,104020],[343,10550],[359,213439],[360,220668],[361,375445],[362,362477],[363,382107],[364,384631],[365,384695],[366,384639],[367,384729],[368,394464],[369,380716],[370,248195],[371,328384],[372,68724],[373,234138],[374,33862],[375,34050],[380,908],[381,96444],[382,1345],[390,201369],[391,317385],[392,364105],[393,384436],[394,394565],[395,380519],[396,376267],[397,376261],[398,342949],[399,378332],[400,394502],[401,384766],[402,384643],[403,362797],[404,346102],[405,96777],[406,204079],[407,33313],[411,13562],[412,206862],[413,70873],[414,42479],[420,599],[421,178555],[422,342775],[423,379580],[424,384785],[425,384628],[426,331623],[427,308903],[428,321153],[429,260807],[430,226379],[431,315368],[432,394260],[433,384616],[434,374133],[435,372619],[436,383552],[437,392308],[438,277823],[439,205868],[440,81584],[441,25082],[442,36583],[443,289166],[444,263307],[445,124704],[446,435],[450,85473],[451,215531],[452,221254],[453,361570],[454,371840],[455,375822],[456,384735],[457,306390],[458,312337],[459,292201],[460,180663],[461,218179],[462,195858],[463,349996],[464,343844],[465,252815],[466,143310],[467,187327],[468,158760],[469,212199],[470,251336],[471,277862],[472,273205],[473,266196],[474,238025],[475,188108],[476,30454],[481,129182],[482,377176],[483,335000],[484,177138],[485,159585],[486,170355],[487,384418],[488,376464],[489,253475],[490,258834],[491,278217],[492,189230],[493,152703],[494,344637],[495,92503],[496,355277],[497,78103],[498,13831],[499,10142],[500,5],[513,25555],[514,27355],[515,10],[518,90756],[519,379059],[520,339967],[521,176756],[522,176778],[523,210480],[524,106600],[525,196883],[526,374793],[527,58571],[528,385767],[529,251806],[550,181616],[551,157921],[552,259962],[553,140061],[554,56270],[555,28690],[557,201112],[558,205918],[559,3],[560,248627],[561,340928],[562,36139],[581,12779],[582,278747],[583,26431],[584,183847],[585,220318],[589,273130],[590,141449],[592,6],[593,214140],[594,292459],[595,4487],[613,133731],[614,184271],[616,290861],[617,62040],[620,5498],[621,342878],[622,149005],[625,61771],[626,384004],[627,60279],[644,134],[645,214581],[646,122340],[647,98421],[648,369739],[649,24774],[651,1015],[652,216239],[653,333349],[654,125796],[656,15895],[657,267296],[658,382766],[659,78528],[679,1910],[680,7395],[688,10],[689,11295],[690,16602],[691,1]],
        "metric": "discovery-wedge-v1"
      }
    },
    "amarga": {
      "id": "amarga",
      "name": "阿马加龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "purple-feldspar-sandstone",
      "excavation": "lever",
      "fieldTool": {
        "variant": "lever",
        "title": "把支点放到重石附近",
        "instruction": "看看重石在哪边，把支点放得离它近一些",
        "action": "放支点",
        "label": "杠杆撬岩",
        "found": "杠杆把重石撬松了",
        "answers": [2,0,2],
        "rounds": [45,57,49]
      },
      "camp": "紫砂杠杆台",
      "eyebrow": "紫砂杠杆台的新发现",
      "reviveLine": "你把阿马加龙的骨架拼完整啦",
      "card": {
        "title": "阿马加龙 · 白垩纪",
        "text": "我的颈椎上长着很长的骨刺，沿着脖子和背排列成两排。长脖子连着小脑袋，我吃植物，这两排骨刺是很特别的线索。"
      },
      "groove": {
        "base": "#4b3345",
        "inset": "#4b3345",
        "light": "#e7c2d1"
      },
      "voice": {
        "file": "gallery-amarga.m4a",
        "start": 0.1021,
        "end": 7.0312,
        "text": "你好呀，我是阿马加龙，名字可以慢慢记，先让我陪你看一看长脖子上的秘密！"
      },
      "living": {
        "file": "../../assets/amarga-3d.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/amarga/stage-1.webp","art/discovery/amarga/stage-2.webp","art/discovery/amarga/stage-3.webp","art/discovery/amarga/stage-4.webp"],
      "waveOrder": ["neck","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.271],[0.0616,0.1972],[0.1353,0.1604],[0.2459,0.1604],[0.991,0.4554],[0.991,0.4922],[0.6884,0.7872],[0.3197,0.7872],[0.2091,0.7504],[0.009,0.3448]],
        "face": {
          "file": "art/discovery/amarga/stage-4.webp"
        },
        "bowl": "art/discovery/amarga/grooves.webp",
        "sand": {
          "file": "art/discovery/amarga/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/amarga/skeleton.webp",
          "box": [57,243,1197,921]
        },
        "parts": [
          {
            "id": "neck",
            "label": "头骨、长颈和双列颈棘",
            "box": [57,243,520,593],
            "file": "discovery/amarga/bone-neck.webp",
            "coverage": [[197,39619],[198,73494],[199,72099],[200,16531],[227,4],[228,117617],[229,217166],[230,196540],[231,138210],[232,113594],[233,49377],[234,2046],[259,31851],[260,221477],[261,180880],[262,235634],[263,265857],[264,187490],[265,114829],[266,59708],[267,1],[289,4407],[290,230200],[291,340419],[292,360628],[293,327729],[294,303121],[295,188091],[296,220764],[297,206747],[298,112070],[299,22120],[321,172672],[322,336492],[323,169229],[324,112179],[325,267248],[326,385742],[327,317980],[328,269673],[329,229490],[330,219316],[331,77121],[332,4901],[353,6984],[354,4345],[357,313],[358,167086],[359,359440],[360,363057],[361,240837],[362,245046],[363,212244],[364,99917],[365,103],[390,3493],[391,201204],[392,361705],[393,362512],[394,294827],[395,252448],[396,212047],[397,33502],[423,13363],[424,227641],[425,367233],[426,394651],[427,373171],[428,87510],[456,20072],[457,239163],[458,339887],[459,99176],[489,6302],[490,4788]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [285,504,560,921],
            "file": "discovery/amarga/bone-front.webp",
            "coverage": [[396,17201],[397,26311],[427,11389],[428,297323],[429,369380],[430,47809],[457,10022],[458,54647],[459,285630],[460,383811],[461,326016],[462,12872],[489,258941],[490,389669],[491,384813],[492,303052],[493,49967],[521,290889],[522,357464],[523,388603],[524,91398],[553,240491],[554,79091],[555,104615],[556,320724],[557,4893],[584,16621],[585,361247],[586,85518],[587,3219],[588,368581],[589,145069],[616,92251],[617,333450],[618,28861],[619,2029],[620,363016],[621,156735],[648,245146],[649,146737],[651,7233],[652,370436],[653,27476],[679,9027],[680,375249],[681,87748],[683,99371],[684,393379],[685,25018],[711,128305],[712,276331],[713,48434],[714,4],[715,206813],[716,382079],[717,24972],[746,2369],[747,129403],[748,143530],[749,6006]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [793,529,1197,632],
            "file": "discovery/amarga/bone-tail.webp",
            "coverage": [[436,48449],[437,12582],[468,254557],[469,329573],[470,207269],[471,126890],[472,99461],[473,118102],[474,173190],[475,175978],[476,126833],[477,85217],[478,12333],[500,188337],[501,298783],[502,296983],[503,293143],[504,252196],[505,177637],[506,72383],[507,1767],[509,7],[510,10383],[532,2147],[533,5123],[534,5295],[535,14]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [572,492,814,908],
            "file": "discovery/amarga/bone-legs.webp",
            "coverage": [[401,52333],[402,32527],[433,214372],[434,350685],[435,245372],[436,43145],[464,253],[465,276256],[466,384755],[467,384794],[468,126163],[496,149680],[497,384593],[498,376480],[499,348825],[500,65446],[527,31792],[528,331297],[529,309298],[530,180951],[531,226920],[532,3718],[559,63241],[560,376356],[561,55469],[562,197469],[563,257991],[591,138882],[592,366214],[593,3923],[594,232405],[595,362276],[596,9513],[623,91364],[624,242599],[626,94180],[627,369788],[628,11070],[655,151377],[656,248308],[658,2815],[659,362778],[660,111290],[686,13017],[687,288558],[688,249180],[690,11686],[691,390124],[692,223935],[718,27704],[719,124542],[720,61176],[722,137231],[723,377249],[724,226899],[754,1032],[755,10280],[756,25]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [468,473,684,699],
            "file": "discovery/amarga/bone-body.webp",
            "coverage": [[396,13893],[397,213734],[398,289049],[399,243311],[400,194211],[401,55992],[429,15433],[430,336964],[431,384802],[432,394688],[433,167701],[461,44666],[462,329711],[463,308112],[464,388023],[465,108501],[492,32161],[493,264117],[494,181982],[495,203070],[496,223503],[523,1771],[524,219440],[525,235856],[526,163812],[527,171132],[528,27812],[556,10875],[557,121906],[558,104874],[559,32739]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/amarga/fragments.webp",
        "pieces": [[78,48,87,75,19],[55,57,61,80,20],[45,33,37,83,19],[25,51,16,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 42275188,
        "weights": [[197,39619],[198,73494],[199,72099],[200,16531],[227,4],[228,117617],[229,217166],[230,196540],[231,138210],[232,113594],[233,49377],[234,2046],[259,31851],[260,221477],[261,180880],[262,235634],[263,265857],[264,187490],[265,114829],[266,59708],[267,1],[289,4407],[290,230200],[291,340419],[292,360628],[293,327729],[294,303121],[295,188091],[296,220764],[297,206747],[298,112070],[299,22120],[321,172672],[322,336492],[323,169229],[324,112179],[325,267248],[326,385742],[327,317980],[328,269673],[329,229490],[330,219316],[331,77121],[332,4901],[353,6984],[354,4345],[357,313],[358,167086],[359,359440],[360,363057],[361,240837],[362,245046],[363,212244],[364,99917],[365,103],[390,3493],[391,201204],[392,361705],[393,362512],[394,294827],[395,252448],[396,243141],[397,273547],[398,289049],[399,243311],[400,194211],[401,108325],[402,32527],[423,13363],[424,227641],[425,367233],[426,394651],[427,384560],[428,384833],[429,384813],[430,384773],[431,384802],[432,394688],[433,382073],[434,350685],[435,245372],[436,91594],[437,12582],[456,20072],[457,249185],[458,394534],[459,384806],[460,383811],[461,370682],[462,342583],[463,308112],[464,388276],[465,384757],[466,384755],[467,384794],[468,380720],[469,329573],[470,207269],[471,126890],[472,99461],[473,118102],[474,173190],[475,175978],[476,126833],[477,85217],[478,12333],[489,265243],[490,394457],[491,384813],[492,335213],[493,314084],[494,181982],[495,203070],[496,373183],[497,384593],[498,376480],[499,348825],[500,253783],[501,298783],[502,296983],[503,293143],[504,252196],[505,177637],[506,72383],[507,1767],[509,7],[510,10383],[521,290889],[522,357464],[523,390374],[524,310838],[525,235856],[526,163812],[527,202924],[528,359109],[529,309298],[530,180951],[531,226920],[532,5865],[533,5123],[534,5295],[535,14],[553,240491],[554,79091],[555,104615],[556,331599],[557,126799],[558,104874],[559,95980],[560,376356],[561,55469],[562,197469],[563,257991],[584,16621],[585,361247],[586,85518],[587,3219],[588,368581],[589,145069],[591,138882],[592,366214],[593,3923],[594,232405],[595,362276],[596,9513],[616,92251],[617,333450],[618,28861],[619,2029],[620,363016],[621,156735],[623,91364],[624,242599],[626,94180],[627,369788],[628,11070],[648,245146],[649,146737],[651,7233],[652,370436],[653,27476],[655,151377],[656,248308],[658,2815],[659,362778],[660,111290],[679,9027],[680,375249],[681,87748],[683,99371],[684,393379],[685,25018],[686,13017],[687,288558],[688,249180],[690,11686],[691,390124],[692,223935],[711,128305],[712,276331],[713,48434],[714,4],[715,206813],[716,382079],[717,24972],[718,27704],[719,124542],[720,61176],[722,137231],[723,377249],[724,226899],[746,2369],[747,129403],[748,143530],[749,6006],[754,1032],[755,10280],[756,25]],
        "metric": "discovery-lever-v1"
      }
    },
    "lambeo": {
      "id": "lambeo",
      "name": "赖氏龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "pale-green-siltstone",
      "excavation": "inflate",
      "fieldTool": {
        "variant": "inflate",
        "title": "给气囊充气顶开岩层",
        "instruction": "按住充气按钮，等进度满了，气囊才顶得开岩层",
        "action": "气囊顶岩",
        "label": "气囊顶岩",
        "found": "气囊把岩缝顶开了",
        "answers": [0,1,2],
        "rounds": [[33,51,950],[66,55,1200],[48,37,1050]]
      },
      "camp": "绿粉气囊坡",
      "eyebrow": "绿粉气囊坡的新发现",
      "reviveLine": "你把赖氏龙的骨架拼完整啦",
      "card": {
        "title": "赖氏龙 · 白垩纪",
        "text": "我的嘴巴宽宽扁扁，像鸭嘴，头上还有一块突出的骨质头冠。我的食物是植物，头冠配上嘴巴，就成了认识我的好线索。"
      },
      "groove": {
        "base": "#3e4d36",
        "inset": "#3e4d36",
        "light": "#d3e3bc"
      },
      "voice": {
        "file": "gallery-lambeo.m4a",
        "start": 0.1,
        "end": 6.8229,
        "text": "小伙伴，我是赖氏龙，今天特地转过头来，让你看看我脑袋上的特别形状！"
      },
      "living": {
        "file": "../../assets/lambeo-3d-v2.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/lambeo/stage-1.webp","art/discovery/lambeo/stage-2.webp","art/discovery/lambeo/stage-3.webp","art/discovery/lambeo/stage-4.webp"],
      "waveOrder": ["head","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3094],[0.0481,0.1619],[0.1588,0.1619],[0.97,0.42],[0.991,0.4569],[0.991,0.4938],[0.675,0.7519],[0.1588,0.7519],[0.009,0.3831]],
        "face": {
          "file": "art/discovery/lambeo/stage-4.webp"
        },
        "bowl": "art/discovery/lambeo/grooves.webp",
        "sand": {
          "file": "art/discovery/lambeo/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/lambeo/skeleton.webp",
          "box": [57,251,1197,902]
        },
        "parts": [
          {
            "id": "head",
            "label": "斧状头冠、头骨和颈骨",
            "box": [57,251,389,568],
            "file": "discovery/lambeo/bone-head.webp",
            "coverage": [[195,25012],[196,207401],[197,184485],[198,12935],[227,34522],[228,320760],[229,383538],[230,98976],[260,237694],[261,373317],[262,99842],[263,119287],[291,33299],[292,346253],[293,393871],[294,274144],[295,37980],[321,11712],[322,180816],[323,357687],[324,393765],[325,404255],[326,393230],[327,198757],[353,126808],[354,379342],[355,266726],[356,186519],[357,146512],[358,250048],[359,374745],[360,104689],[361,14657],[385,232],[386,30255],[390,89513],[391,381708],[392,364982],[393,211513],[422,7740],[423,207768],[424,379539],[425,74661],[455,2615],[456,90250]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [239,482,508,902],
            "file": "discovery/lambeo/bone-front.webp",
            "coverage": [[394,103838],[395,248341],[396,177373],[424,1260],[425,257597],[426,393914],[427,383881],[428,255587],[456,139873],[457,382491],[458,393989],[459,263255],[460,32115],[488,281072],[489,383967],[490,238031],[491,2760],[520,300181],[521,317959],[522,308240],[523,19650],[552,189741],[553,112632],[554,287405],[555,149591],[583,3699],[584,316145],[585,111581],[586,277412],[587,181042],[615,168074],[616,180494],[617,26725],[618,332006],[619,16626],[646,5213],[647,333506],[648,6842],[649,203150],[650,197330],[678,154500],[679,265902],[680,7],[681,308103],[682,91117],[710,77461],[711,45083],[712,97039],[713,330727],[714,33305]]
          },
          {
            "id": "tail",
            "label": "尾巴",
            "box": [782,459,1197,592],
            "file": "discovery/lambeo/bone-tail.webp",
            "coverage": [[372,16120],[404,294461],[405,211991],[406,108732],[407,57976],[408,4840],[436,366683],[437,393646],[438,380379],[439,373499],[440,347978],[441,288455],[442,211225],[443,107765],[444,14019],[467,6703],[468,248101],[469,258328],[470,219239],[471,168740],[472,114552],[473,87754],[474,109937],[475,144761],[476,179990],[477,119745],[478,29919],[500,2271],[501,44],[510,231]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [505,410,794,902],
            "file": "discovery/lambeo/bone-legs.webp",
            "coverage": [[335,51982],[336,107005],[337,70526],[338,5931],[367,106598],[368,364151],[369,353716],[370,283359],[371,173987],[372,14902],[399,121388],[400,393665],[401,384099],[402,384069],[403,382632],[404,29890],[431,177223],[432,393698],[433,384366],[434,384163],[435,381442],[436,16649],[462,17159],[463,294598],[464,393421],[465,384090],[466,383988],[467,255808],[468,1351],[494,142862],[495,359379],[496,223874],[497,370453],[498,166136],[499,252407],[500,1710],[525,37299],[526,367432],[527,190113],[528,220698],[529,359324],[530,29143],[531,50346],[532,7257],[557,35532],[558,377962],[559,152517],[560,127236],[561,383611],[562,196299],[589,6],[590,264654],[591,175255],[592,7],[593,173491],[594,354930],[595,37041],[622,158889],[623,272692],[625,3],[626,256572],[627,306958],[628,5986],[654,208922],[655,260216],[658,143753],[659,383151],[660,44820],[684,2895],[685,184499],[686,371154],[687,93934],[690,158471],[691,392970],[692,35215],[716,7],[717,23761],[718,32709],[719,1],[721,117023],[722,341901],[723,289992],[724,37394]]
          },
          {
            "id": "body",
            "label": "肋骨和躯干",
            "box": [362,405,616,695],
            "file": "discovery/lambeo/bone-body.webp",
            "coverage": [[331,30991],[332,97784],[333,138591],[334,153504],[335,113329],[361,15868],[362,171112],[363,321059],[364,320540],[365,354905],[366,372331],[367,265558],[393,137340],[394,282332],[395,135632],[396,206350],[397,384108],[398,384535],[399,262890],[425,51531],[428,127358],[429,351549],[430,327843],[431,187813],[459,66908],[460,274420],[461,230568],[462,252807],[463,13271],[490,140258],[491,359739],[492,286513],[493,259626],[494,122505],[522,63151],[523,215126],[524,173705],[525,184504],[526,9066],[555,71136],[556,111321],[557,49796]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/lambeo/fragments.webp",
        "pieces": [[17,36,13,69,19],[43,54,39,82,20],[66,42,64,87,19],[78,64,86,75,19]]
      },
      "area": {
        "grid": 32,
        "total": 47026267,
        "weights": [[195,25012],[196,207401],[197,184485],[198,12935],[227,34522],[228,320760],[229,383538],[230,98976],[260,237694],[261,373317],[262,99842],[263,119287],[291,33299],[292,346253],[293,393871],[294,274144],[295,37980],[321,11712],[322,180816],[323,357687],[324,393765],[325,404255],[326,393230],[327,198757],[331,30991],[332,97784],[333,138591],[334,153504],[335,165311],[336,107005],[337,70526],[338,5931],[353,126808],[354,379342],[355,266726],[356,186519],[357,146512],[358,250048],[359,374745],[360,104689],[361,30525],[362,171112],[363,321059],[364,320540],[365,354905],[366,372331],[367,372156],[368,364151],[369,353716],[370,283359],[371,173987],[372,31022],[385,232],[386,30255],[390,89513],[391,381708],[392,364982],[393,348853],[394,386170],[395,383973],[396,383723],[397,384108],[398,384535],[399,384278],[400,393665],[401,384099],[402,384069],[403,382632],[404,324351],[405,211991],[406,108732],[407,57976],[408,4840],[422,7740],[423,207768],[424,380799],[425,383789],[426,393914],[427,383881],[428,382945],[429,351549],[430,327843],[431,365036],[432,393698],[433,384366],[434,384163],[435,381442],[436,383332],[437,393646],[438,380379],[439,373499],[440,347978],[441,288455],[442,211225],[443,107765],[444,14019],[455,2615],[456,230123],[457,382491],[458,393989],[459,330163],[460,306535],[461,230568],[462,269966],[463,307869],[464,393421],[465,384090],[466,383988],[467,262511],[468,249452],[469,258328],[470,219239],[471,168740],[472,114552],[473,87754],[474,109937],[475,144761],[476,179990],[477,119745],[478,29919],[488,281072],[489,383967],[490,378289],[491,362499],[492,286513],[493,259626],[494,265367],[495,359379],[496,223874],[497,370453],[498,166136],[499,252407],[500,3981],[501,44],[510,231],[520,300181],[521,317959],[522,371391],[523,234776],[524,173705],[525,221803],[526,376498],[527,190113],[528,220698],[529,359324],[530,29143],[531,50346],[532,7257],[552,189741],[553,112632],[554,287405],[555,220727],[556,111321],[557,85328],[558,377962],[559,152517],[560,127236],[561,383611],[562,196299],[583,3699],[584,316145],[585,111581],[586,277412],[587,181042],[589,6],[590,264654],[591,175255],[592,7],[593,173491],[594,354930],[595,37041],[615,168074],[616,180494],[617,26725],[618,332006],[619,16626],[622,158889],[623,272692],[625,3],[626,256572],[627,306958],[628,5986],[646,5213],[647,333506],[648,6842],[649,203150],[650,197330],[654,208922],[655,260216],[658,143753],[659,383151],[660,44820],[678,154500],[679,265902],[680,7],[681,308103],[682,91117],[684,2895],[685,184499],[686,371154],[687,93934],[690,158471],[691,392970],[692,35215],[710,77461],[711,45083],[712,97039],[713,330727],[714,33305],[716,7],[717,23761],[718,32709],[719,1],[721,117023],[722,341901],[723,289992],[724,37394]],
        "metric": "discovery-inflate-v1"
      }
    },
    "nodo": {
      "id": "nodo",
      "name": "结节龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "brown-flint",
      "excavation": "brace",
      "fieldTool": {
        "variant": "brace",
        "title": "找一根合适的撑杆",
        "instruction": "看看裂缝有多宽，选一根刚好能撑住两头的杆",
        "action": "选撑杆",
        "label": "撑杆开岩",
        "found": "撑杆托住了岩层",
        "answers": [0,2,1],
        "points": [[39,42],[64,52],[47,59]]
      },
      "camp": "燧石支撑坡",
      "eyebrow": "燧石支撑坡的新发现",
      "reviveLine": "你把结节龙的骨架拼完整啦",
      "card": {
        "title": "结节龙 · 白垩纪",
        "text": "我的背上覆盖着骨甲，像一块块小石头排在一起，尾巴末端没有甲龙那样的大尾锤。我的食物是植物，身体由四条腿支撑。"
      },
      "groove": {
        "base": "#3b3630",
        "inset": "#3b3630",
        "light": "#ddd0b9"
      },
      "voice": {
        "file": "gallery-nodo.m4a",
        "start": 0.1021,
        "end": 6.4453,
        "text": "嘿，我是结节龙，我这件凹凹凸凸的外衣，有没有让你想多看两眼呀！"
      },
      "living": {
        "file": "../../assets/nodo-3d.webp",
        "aspect": "1522/1033"
      },
      "stages": ["art/discovery/nodo/stage-1.webp","art/discovery/nodo/stage-2.webp","art/discovery/nodo/stage-3.webp","art/discovery/nodo/stage-4.webp"],
      "waveOrder": ["head","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.4168],[0.0241,0.3799],[0.2454,0.2693],[0.6141,0.2693],[0.991,0.3799],[0.991,0.4168],[0.6879,0.6381],[0.0979,0.6381],[0.061,0.6012],[0.009,0.4906]],
        "face": {
          "file": "art/discovery/nodo/stage-4.webp"
        },
        "bowl": "art/discovery/nodo/grooves.webp",
        "sand": {
          "file": "art/discovery/nodo/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/nodo/skeleton.webp",
          "box": [57,355,1197,773]
        },
        "parts": [
          {
            "id": "head",
            "label": "头颈和颈部骨甲",
            "box": [57,379,375,607],
            "file": "discovery/nodo/bone-head.webp",
            "coverage": [[296,30228],[327,56496],[328,336717],[329,15631],[357,2223],[358,179577],[359,372342],[360,384333],[361,135040],[386,34319],[387,204153],[388,276076],[389,347810],[390,383516],[391,384317],[392,381573],[393,165159],[417,25889],[418,329958],[419,384215],[420,383990],[421,393656],[422,377938],[423,333893],[424,81455],[449,176697],[450,384146],[451,381777],[452,322017],[453,77802],[454,196198],[455,22714],[481,44176],[482,125429],[483,19055],[484,17]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [145,505,474,773],
            "file": "discovery/nodo/bone-front.webp",
            "coverage": [[393,10114],[394,29809],[423,50264],[424,243347],[425,375073],[426,349775],[427,37896],[454,87926],[455,323582],[456,382259],[457,288462],[458,30231],[485,36517],[486,305743],[487,203654],[488,233239],[489,342371],[490,243067],[491,55621],[517,264075],[518,294959],[519,5079],[520,9],[521,31103],[522,361980],[523,327895],[524,10929],[548,35381],[549,369787],[550,38003],[554,241023],[555,223335],[579,21693],[580,282691],[581,335043],[582,64],[585,36024],[586,370819],[587,173031],[612,9455],[613,13206],[616,10],[617,175277],[618,224916],[619,86335]]
          },
          {
            "id": "tail",
            "label": "没有尾槌的细尾",
            "box": [792,440,1197,556],
            "file": "discovery/nodo/bone-tail.webp",
            "coverage": [[372,184710],[373,171825],[374,50415],[404,241757],[405,393612],[406,363438],[407,270787],[408,174629],[409,121063],[410,95774],[411,108069],[412,137172],[413,113061],[414,22688],[436,130391],[437,259922],[438,267987],[439,262489],[440,264375],[441,249614],[442,203141],[443,135191],[444,50194],[445,155],[468,160],[469,5439],[470,123]]
          },
          {
            "id": "legs",
            "label": "后腿",
            "box": [511,478,802,766],
            "file": "discovery/nodo/bone-legs.webp",
            "coverage": [[401,238802],[402,143878],[430,3833],[431,129779],[432,77836],[433,366558],[434,240419],[462,163701],[463,279409],[464,127692],[465,230701],[466,205076],[493,91458],[494,377908],[495,61868],[497,237757],[498,356856],[499,119250],[525,8808],[526,321876],[527,154179],[529,41549],[530,305851],[531,276630],[532,4],[557,30489],[558,328220],[559,246979],[562,99645],[563,383521],[564,97520],[589,185767],[590,255811],[591,75611],[593,7154],[594,212857],[595,383596],[596,98331],[625,24195],[626,120881],[627,131223],[628,35004]]
          },
          {
            "id": "body",
            "label": "背部骨甲和躯干",
            "box": [312,355,808,649],
            "file": "discovery/nodo/bone-body.webp",
            "coverage": [[297,45671],[298,179788],[299,275540],[300,272115],[301,317683],[302,311441],[303,237834],[304,215160],[305,74467],[306,5817],[328,2744],[329,365327],[330,404257],[331,394066],[332,394067],[333,393962],[334,394250],[335,394115],[336,403953],[337,393950],[338,320986],[339,150983],[340,30647],[361,249452],[362,394403],[363,384455],[364,384284],[365,384552],[366,384498],[367,384350],[368,394400],[369,384357],[370,384466],[371,384399],[372,142865],[392,3034],[393,209401],[394,364463],[395,384302],[396,384006],[397,384500],[398,384313],[399,371748],[400,359229],[401,145557],[402,240721],[403,384509],[404,141747],[423,505],[424,59684],[425,9597],[426,44379],[427,345943],[428,375600],[429,358245],[430,302723],[431,183314],[432,262550],[434,51998],[435,250810],[436,75326],[457,80330],[458,267190],[459,232209],[460,210084],[461,246096],[462,138894],[463,7206],[464,23626],[467,43363],[468,7],[489,8572],[490,116247],[491,131758],[492,193095],[493,152807],[494,5795],[523,340],[524,70759],[525,8392]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/nodo/fragments.webp",
        "pieces": [[19,37,15,75,18],[43,49,38,83,19],[62,66,62,84,20],[80,49,86,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 45118545,
        "weights": [[296,30228],[297,45671],[298,179788],[299,275540],[300,272115],[301,317683],[302,311441],[303,237834],[304,215160],[305,74467],[306,5817],[327,56496],[328,339461],[329,380958],[330,404257],[331,394066],[332,394067],[333,393962],[334,394250],[335,394115],[336,403953],[337,393950],[338,320986],[339,150983],[340,30647],[357,2223],[358,179577],[359,372342],[360,384333],[361,384492],[362,394403],[363,384455],[364,384284],[365,384552],[366,384498],[367,384350],[368,394400],[369,384357],[370,384466],[371,384399],[372,327575],[373,171825],[374,50415],[386,34319],[387,204153],[388,276076],[389,347810],[390,383516],[391,384317],[392,384607],[393,384674],[394,394272],[395,384302],[396,384006],[397,384500],[398,384313],[399,371748],[400,359229],[401,384359],[402,384599],[403,384509],[404,383504],[405,393612],[406,363438],[407,270787],[408,174629],[409,121063],[410,95774],[411,108069],[412,137172],[413,113061],[414,22688],[417,25889],[418,329958],[419,384215],[420,383990],[421,393656],[422,377938],[423,384662],[424,384486],[425,384670],[426,394154],[427,383839],[428,375600],[429,358245],[430,306556],[431,313093],[432,340386],[433,366558],[434,292417],[435,250810],[436,205717],[437,259922],[438,267987],[439,262489],[440,264375],[441,249614],[442,203141],[443,135191],[444,50194],[445,155],[449,176697],[450,384146],[451,381777],[452,322017],[453,77802],[454,284124],[455,346296],[456,382259],[457,368792],[458,297421],[459,232209],[460,210084],[461,246096],[462,302595],[463,286615],[464,151318],[465,230701],[466,205076],[467,43363],[468,167],[469,5439],[470,123],[481,44176],[482,125429],[483,19055],[484,17],[485,36517],[486,305743],[487,203654],[488,233239],[489,350943],[490,359314],[491,187379],[492,193095],[493,244265],[494,383703],[495,61868],[497,237757],[498,356856],[499,119250],[517,264075],[518,294959],[519,5079],[520,9],[521,31103],[522,361980],[523,328235],[524,81688],[525,17200],[526,321876],[527,154179],[529,41549],[530,305851],[531,276630],[532,4],[548,35381],[549,369787],[550,38003],[554,241023],[555,223335],[557,30489],[558,328220],[559,246979],[562,99645],[563,383521],[564,97520],[579,21693],[580,282691],[581,335043],[582,64],[585,36024],[586,370819],[587,173031],[589,185767],[590,255811],[591,75611],[593,7154],[594,212857],[595,383596],[596,98331],[612,9455],[613,13206],[616,10],[617,175277],[618,224916],[619,86335],[625,24195],[626,120881],[627,131223],[628,35004]],
        "metric": "discovery-brace-v1"
      }
    },
    "struthio": {
      "id": "struthio",
      "name": "似鸵龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "gold-ripple-sandstone",
      "excavation": "rhythm",
      "fieldTool": {
        "variant": "rhythm",
        "title": "记住敲击的顺序",
        "instruction": "先看哪些石头亮起来，再按同样的顺序敲",
        "action": "记敲击",
        "label": "记忆敲岩",
        "found": "这一段岩层敲松了",
        "answers": [0,1,2],
        "points": [[26,41],[47,33],[74,43],[52,57]],
        "rounds": [[3,2,0],[2,1,3],[1,0,2,3]]
      },
      "camp": "金波节奏谷",
      "eyebrow": "金波节奏谷的新发现",
      "reviveLine": "你把似鸵龙的骨架拼完整啦",
      "card": {
        "title": "似鸵龙 · 白垩纪",
        "text": "我的模样有点像鸵鸟，脖子和后腿长长的，身后还有一条长尾巴。嘴巴前面是喙，里面没有牙齿，看看就很特别吧。"
      },
      "groove": {
        "base": "#5f4728",
        "inset": "#5f4728",
        "light": "#f4d69d"
      },
      "voice": {
        "file": "gallery-struthio.m4a",
        "start": 0.1021,
        "end": 7.5912,
        "text": "小探险家，见到你真开心，我是似鸵龙，想邀请你和我摆一个轻巧的出场姿势！"
      },
      "living": {
        "file": "../../assets/struthio-3d-v3.webp",
        "aspect": "1373/1145"
      },
      "stages": ["art/discovery/struthio/stage-1.webp","art/discovery/struthio/stage-2.webp","art/discovery/struthio/stage-3.webp","art/discovery/struthio/stage-4.webp"],
      "waveOrder": ["head","arms","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.195],[0.0588,0.1581],[0.1325,0.1581],[0.991,0.3794],[0.991,0.4162],[0.7962,0.8219],[0.28,0.8587],[0.1694,0.8587],[0.009,0.2319]],
        "face": {
          "file": "art/discovery/struthio/stage-4.webp"
        },
        "bowl": "art/discovery/struthio/grooves.webp",
        "sand": {
          "file": "art/discovery/struthio/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/struthio/skeleton.webp",
          "box": [57,265,1197,995]
        },
        "parts": [
          {
            "id": "head",
            "label": "无齿头骨和长颈",
            "box": [57,265,340,538],
            "file": "discovery/struthio/bone-head.webp",
            "coverage": [[195,31324],[196,59642],[197,670],[225,24708],[226,185249],[227,360979],[228,377083],[229,258386],[230,2844],[257,56894],[258,129292],[259,138770],[260,62489],[261,208445],[262,91487],[293,119468],[294,154884],[325,123991],[326,185158],[357,54801],[358,305389],[359,11710],[389,4],[390,211450],[391,286476],[392,71186],[422,6227],[423,146226],[424,70740]]
          },
          {
            "id": "arms",
            "label": "肩骨和细长前臂",
            "box": [180,489,481,771],
            "file": "discovery/struthio/bone-arms.webp",
            "coverage": [[394,17678],[395,145726],[396,20074],[423,2],[424,106852],[425,165385],[426,356696],[427,249447],[428,19630],[455,37810],[456,380750],[457,371160],[458,108744],[485,1570],[486,88562],[487,39398],[488,214491],[489,297535],[490,72206],[516,2],[517,176162],[518,80949],[519,99422],[520,136234],[521,73112],[522,222935],[548,57021],[549,108365],[550,48960],[551,211265],[552,128119],[553,104587],[554,71490],[580,2344],[581,18013],[582,231401],[583,15974],[613,3303],[614,49511]]
          },
          {
            "id": "tail",
            "label": "细长尾巴",
            "box": [691,469,1197,564],
            "file": "discovery/struthio/bone-tail.webp",
            "coverage": [[370,17],[401,252],[402,281097],[403,234982],[404,168146],[405,125275],[406,96914],[407,86961],[408,109485],[409,134676],[410,133566],[411,113481],[412,85011],[413,56308],[414,14143],[433,7679],[434,212817],[435,200302],[436,211145],[437,193891],[438,162942],[439,119569],[440,71224],[441,14996],[442,7],[446,7],[465,7569],[466,406],[467,501]]
          },
          {
            "id": "legs",
            "label": "髋骨和奔跑后腿",
            "box": [268,437,924,995],
            "file": "discovery/struthio/bone-legs.webp",
            "coverage": [[366,194263],[367,232260],[368,154007],[369,29768],[370,541],[398,322010],[399,383442],[400,393549],[401,368887],[402,32074],[429,596],[430,260848],[431,376952],[432,382625],[433,225971],[461,139622],[462,375284],[463,232421],[464,197884],[465,33084],[491,2460],[492,230091],[493,191690],[494,105034],[495,127894],[496,142661],[523,85325],[524,381801],[525,26899],[527,172907],[528,282600],[529,18296],[555,24426],[556,372052],[557,15070],[559,24370],[560,300514],[561,262752],[562,9290],[587,10920],[588,241320],[593,60931],[594,202603],[595,146143],[596,704],[619,54416],[620,197864],[626,1428],[627,229620],[628,133409],[651,206072],[652,212755],[659,1446],[660,199431],[661,4884],[682,42414],[683,224072],[684,7816],[692,55331],[693,247852],[694,913],[713,1968],[714,210412],[715,8592],[725,181849],[726,180072],[727,78],[745,189816],[746,142910],[757,1502],[758,218702],[759,42669],[774,142],[775,101972],[776,232902],[777,236116],[778,323],[790,7371],[791,3745],[806,5472],[807,55073],[808,75909],[809,18907]]
          },
          {
            "id": "body",
            "label": "脊椎和胸肋",
            "box": [324,438,560,642],
            "file": "discovery/struthio/bone-body.webp",
            "coverage": [[362,4173],[363,79004],[364,176440],[365,218331],[366,59509],[392,64837],[393,192297],[394,328249],[395,236109],[396,361466],[397,372022],[398,56186],[424,180856],[425,218612],[426,36780],[427,79085],[428,195855],[429,152920],[430,17893],[458,222928],[459,173570],[460,118771],[461,158185],[490,70839],[491,133464],[492,50221],[493,244],[522,5914],[523,14924]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/struthio/fragments.webp",
        "pieces": [[34,31,14,76,18],[61,35,41,82,19],[76,58,86,74,19],[45,59,65,86,20]]
      },
      "area": {
        "grid": 32,
        "total": 26602976,
        "weights": [[195,31324],[196,59642],[197,670],[225,24708],[226,185249],[227,360979],[228,377083],[229,258386],[230,2844],[257,56894],[258,129292],[259,138770],[260,62489],[261,208445],[262,91487],[293,119468],[294,154884],[325,123991],[326,185158],[357,54801],[358,305389],[359,11710],[362,4173],[363,79004],[364,176440],[365,218331],[366,253772],[367,232260],[368,154007],[369,29768],[370,558],[389,4],[390,211450],[391,286476],[392,136023],[393,192297],[394,345927],[395,381835],[396,381540],[397,372022],[398,378196],[399,383442],[400,393549],[401,369139],[402,313171],[403,234982],[404,168146],[405,125275],[406,96914],[407,86961],[408,109485],[409,134676],[410,133566],[411,113481],[412,85011],[413,56308],[414,14143],[422,6227],[423,146228],[424,358448],[425,383997],[426,393476],[427,328532],[428,215485],[429,153516],[430,278741],[431,376952],[432,382625],[433,233650],[434,212817],[435,200302],[436,211145],[437,193891],[438,162942],[439,119569],[440,71224],[441,14996],[442,7],[446,7],[455,37810],[456,380750],[457,371160],[458,331672],[459,173570],[460,118771],[461,297807],[462,375284],[463,232421],[464,197884],[465,40653],[466,406],[467,501],[485,1570],[486,88562],[487,39398],[488,214491],[489,297535],[490,143045],[491,135924],[492,280312],[493,191934],[494,105034],[495,127894],[496,142661],[516,2],[517,176162],[518,80949],[519,99422],[520,136234],[521,73112],[522,228849],[523,100249],[524,381801],[525,26899],[527,172907],[528,282600],[529,18296],[548,57021],[549,108365],[550,48960],[551,211265],[552,128119],[553,104587],[554,71490],[555,24426],[556,372052],[557,15070],[559,24370],[560,300514],[561,262752],[562,9290],[580,2344],[581,18013],[582,231401],[583,15974],[587,10920],[588,241320],[593,60931],[594,202603],[595,146143],[596,704],[613,3303],[614,49511],[619,54416],[620,197864],[626,1428],[627,229620],[628,133409],[651,206072],[652,212755],[659,1446],[660,199431],[661,4884],[682,42414],[683,224072],[684,7816],[692,55331],[693,247852],[694,913],[713,1968],[714,210412],[715,8592],[725,181849],[726,180072],[727,78],[745,189816],[746,142910],[757,1502],[758,218702],[759,42669],[774,142],[775,101972],[776,232902],[777,236116],[778,323],[790,7371],[791,3745],[806,5472],[807,55073],[808,75909],[809,18907]],
        "metric": "discovery-rhythm-v1"
      }
    },
    "cerato": {
      "id": "cerato",
      "name": "角鼻龙",
      "era": "jurassic",
      "eraLabel": "侏罗纪",
      "isDinosaur": true,
      "rock": "rust-ironstone",
      "excavation": "echo",
      "fieldTool": {
        "title": "敲一敲，找回声",
        "instruction": "轻点探测点，看哪里回声更清楚",
        "action": "探测",
        "label": "回声探测",
        "found": "找到能松开的薄岩层啦",
        "points": [[24,36],[49,33],[75,39],[24,58],[51,63],[77,58]],
        "answers": [5,0,4]
      },
      "camp": "锈橙回声坡",
      "eyebrow": "锈橙回声坡的新发现",
      "reviveLine": "你把角鼻龙的骨架拼完整啦",
      "card": {
        "title": "角鼻龙 · 侏罗纪",
        "text": "我的角长在鼻子上，身后的背部还有一排小小的骨片。身体靠两条后腿走路，鼻角和背上的骨片都是认识我的线索。"
      },
      "groove": {
        "base": "#582d21",
        "inset": "#582d21",
        "light": "#e7b17f"
      },
      "voice": {
        "file": "gallery-cerato.m4a",
        "start": 0.1021,
        "end": 6.901,
        "text": "你好，我是角鼻龙，想请你做我的找角搭档，看看我的角藏在什么位置呀！"
      },
      "living": {
        "file": "../../assets/cerato-3d-v2.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/cerato/stage-1.webp","art/discovery/cerato/stage-2.webp","art/discovery/cerato/stage-3.webp","art/discovery/cerato/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3056],[0.0212,0.2688],[0.2055,0.2688],[0.991,0.4162],[0.991,0.4531],[0.6112,0.785],[0.2793,0.7481],[0.009,0.3794]],
        "face": {
          "file": "art/discovery/cerato/stage-4.webp"
        },
        "bowl": "art/discovery/cerato/grooves.webp",
        "sand": {
          "file": "art/discovery/cerato/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/cerato/skeleton.webp",
          "box": [57,363,1197,904]
        },
        "parts": [
          {
            "id": "head",
            "label": "鼻角头骨和颈骨",
            "box": [57,363,375,566],
            "file": "discovery/cerato/bone-head.webp",
            "coverage": [[290,155406],[291,85996],[292,222216],[293,242055],[294,122984],[295,15195],[321,51953],[322,374221],[323,393527],[324,394716],[325,404737],[326,386338],[327,206111],[328,535],[353,166873],[354,323040],[355,264317],[356,367088],[357,383114],[358,192797],[359,378196],[360,76484],[385,7],[386,75523],[387,321574],[388,292102],[389,133405],[390,15781],[391,298858],[392,345378],[393,95697],[418,163041],[419,75683],[423,58521],[424,305075],[425,43239],[456,21214]]
          },
          {
            "id": "tail",
            "label": "长尾巴",
            "box": [701,495,1197,601],
            "file": "discovery/cerato/bone-tail.webp",
            "coverage": [[402,30273],[403,2136],[433,506],[434,332896],[435,271746],[436,211608],[437,176012],[438,173953],[439,189276],[440,211664],[441,220941],[442,198196],[443,149000],[444,71255],[445,2240],[465,14681],[466,275441],[467,251070],[468,298161],[469,260604],[470,216840],[471,154936],[472,91418],[473,43083],[474,27596],[475,30070],[476,76431],[477,104695],[478,27082],[498,30742],[499,25725],[500,15891],[501,6125]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [363,458,772,904],
            "file": "discovery/cerato/bone-legs.webp",
            "coverage": [[366,14555],[367,14933],[398,190683],[399,344577],[400,290826],[401,172817],[402,18838],[430,221777],[431,384782],[432,394721],[433,383999],[434,34568],[461,31805],[462,250476],[463,384556],[464,394552],[465,259510],[492,54186],[493,223604],[494,309249],[495,383257],[496,324900],[497,103501],[523,20730],[524,277734],[525,252614],[526,6758],[527,357161],[528,46373],[529,26030],[555,7976],[556,356075],[557,144646],[558,26279],[559,358114],[560,296330],[561,25247],[588,176958],[589,134608],[591,110509],[592,269297],[593,277589],[594,17646],[620,166879],[621,231427],[624,2],[625,186301],[626,337487],[627,9867],[651,45248],[652,319598],[653,103660],[657,24685],[658,375570],[659,83752],[681,78512],[682,276830],[683,375644],[684,205111],[688,11464],[689,101763],[690,389486],[691,186688],[713,1],[714,47851],[715,34480],[716,4],[720,140653],[721,260362],[722,242900],[723,80813],[754,781]]
          },
          {
            "id": "body",
            "label": "胸肋和前臂",
            "box": [250,454,572,738],
            "file": "discovery/cerato/bone-body.webp",
            "coverage": [[362,922],[363,41464],[364,57724],[365,66377],[366,36912],[393,123192],[394,332841],[395,377663],[396,382479],[397,383661],[398,182119],[424,20696],[425,341252],[426,394498],[427,354658],[428,299137],[429,270284],[430,129874],[455,14438],[456,274145],[457,379296],[458,327331],[459,227001],[460,193475],[461,124745],[462,29942],[487,17539],[488,289493],[489,296152],[490,210523],[491,187798],[492,127816],[493,2866],[518,42134],[519,173791],[520,147433],[521,138058],[522,172964],[523,52785],[524,1964],[550,92905],[551,49079],[552,180199],[553,183058],[554,5393],[583,7420],[584,102520],[585,20242]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/cerato/fragments.webp",
        "pieces": [[20,47,15,72,19],[41,33,38,83,18],[63,44,66,84,19],[63,67,88,77,19]]
      },
      "area": {
        "grid": 32,
        "total": 32206713,
        "weights": [[290,155406],[291,85996],[292,222216],[293,242055],[294,122984],[295,15195],[321,51953],[322,374221],[323,393527],[324,394716],[325,404737],[326,386338],[327,206111],[328,535],[353,166873],[354,323040],[355,264317],[356,367088],[357,383114],[358,192797],[359,378196],[360,76484],[362,922],[363,41464],[364,57724],[365,66377],[366,51467],[367,14933],[385,7],[386,75523],[387,321574],[388,292102],[389,133405],[390,15781],[391,298858],[392,345378],[393,218889],[394,332841],[395,377663],[396,382479],[397,383661],[398,372802],[399,344577],[400,290826],[401,172817],[402,49111],[403,2136],[418,163041],[419,75683],[423,58521],[424,325771],[425,384491],[426,394498],[427,354658],[428,299137],[429,270284],[430,351651],[431,384782],[432,394721],[433,384505],[434,367464],[435,271746],[436,211608],[437,176012],[438,173953],[439,189276],[440,211664],[441,220941],[442,198196],[443,149000],[444,71255],[445,2240],[455,14438],[456,295359],[457,379296],[458,327331],[459,227001],[460,193475],[461,156550],[462,280418],[463,384556],[464,394552],[465,274191],[466,275441],[467,251070],[468,298161],[469,260604],[470,216840],[471,154936],[472,91418],[473,43083],[474,27596],[475,30070],[476,76431],[477,104695],[478,27082],[487,17539],[488,289493],[489,296152],[490,210523],[491,187798],[492,182002],[493,226470],[494,309249],[495,383257],[496,324900],[497,103501],[498,30742],[499,25725],[500,15891],[501,6125],[518,42134],[519,173791],[520,147433],[521,138058],[522,172964],[523,73515],[524,279698],[525,252614],[526,6758],[527,357161],[528,46373],[529,26030],[550,92905],[551,49079],[552,180199],[553,183058],[554,5393],[555,7976],[556,356075],[557,144646],[558,26279],[559,358114],[560,296330],[561,25247],[583,7420],[584,102520],[585,20242],[588,176958],[589,134608],[591,110509],[592,269297],[593,277589],[594,17646],[620,166879],[621,231427],[624,2],[625,186301],[626,337487],[627,9867],[651,45248],[652,319598],[653,103660],[657,24685],[658,375570],[659,83752],[681,78512],[682,276830],[683,375644],[684,205111],[688,11464],[689,101763],[690,389486],[691,186688],[713,1],[714,47851],[715,34480],[716,4],[720,140653],[721,260362],[722,242900],[723,80813],[754,781]],
        "metric": "discovery-echo-v1"
      }
    },
    "bary": {
      "id": "bary",
      "name": "重爪龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "teal-water-shale",
      "excavation": "rope",
      "fieldTool": {
        "variant": "rope",
        "title": "把绳环拉向箭头",
        "instruction": "抓住绳环，沿着虚线拉开松动的岩层",
        "action": "拉绳",
        "label": "绳索拉岩",
        "found": "岩层拉开一道口子",
        "answers": [0,1,2],
        "rounds": [[72,40,51,32,"向左上"],[30,57,48,68,"向右下"],[60,56,41,42,"向左上"]]
      },
      "camp": "水纹拉岩台",
      "eyebrow": "水纹拉岩台的新发现",
      "reviveLine": "你把重爪龙的骨架拼完整啦",
      "card": {
        "title": "重爪龙 · 白垩纪",
        "text": "我的嘴巴细细长长，形状有点像鳄鱼，手上还有一只特别大的爪子。鱼是我的食物之一，长嘴和大爪让我的模样很特别。"
      },
      "groove": {
        "base": "#2d4445",
        "inset": "#2d4445",
        "light": "#bdd6d3"
      },
      "voice": {
        "file": "gallery-bary.m4a",
        "start": 0.1021,
        "end": 7.0833,
        "text": "小伙伴，我是重爪龙，今天想和你玩一个比长短，看看你最先发现我的哪里！"
      },
      "living": {
        "file": "../../assets/bary-3d-v3.webp",
        "aspect": "1373/1145"
      },
      "stages": ["art/discovery/bary/stage-1.webp","art/discovery/bary/stage-2.webp","art/discovery/bary/stage-3.webp","art/discovery/bary/stage-4.webp"],
      "waveOrder": ["head","arms","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3464],[0.0208,0.3096],[0.0945,0.2727],[0.5739,0.2727],[0.991,0.3464],[0.991,0.3833],[0.7582,0.7152],[0.3526,0.7152],[0.0945,0.5677],[0.009,0.3833]],
        "face": {
          "file": "art/discovery/bary/stage-4.webp"
        },
        "bowl": "art/discovery/bary/grooves.webp",
        "sand": {
          "file": "art/discovery/bary/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/bary/skeleton.webp",
          "box": [57,355,1197,852]
        },
        "parts": [
          {
            "id": "head",
            "label": "长吻头骨和颈骨",
            "box": [57,355,411,539],
            "file": "discovery/bary/bone-head.webp",
            "coverage": [[292,22587],[293,190744],[294,254516],[295,286935],[296,272312],[297,54203],[322,954],[323,96478],[324,315018],[325,386118],[326,393866],[327,293647],[328,264235],[329,282524],[330,7],[353,114488],[354,296611],[355,256254],[356,155093],[357,342786],[358,319428],[359,64222],[360,57532],[361,364072],[362,107693],[385,32239],[386,30142],[387,153016],[388,233386],[389,77622],[390,1564],[392,399],[393,185247],[394,82628],[418,187146],[419,81043],[425,103]]
          },
          {
            "id": "arms",
            "label": "肩骨前臂和大手爪",
            "box": [192,437,549,738],
            "file": "discovery/bary/bone-arms.webp",
            "coverage": [[364,133315],[365,277919],[393,11046],[394,22321],[395,141835],[396,350490],[397,124594],[425,182220],[426,263770],[427,372030],[428,63816],[454,3722],[455,79375],[456,108696],[457,200246],[458,89768],[459,296367],[460,55090],[485,111994],[486,278788],[487,175102],[488,130876],[489,38000],[490,27],[491,54092],[492,302058],[493,2],[516,2213],[517,236456],[518,144913],[520,17650],[521,157288],[522,326210],[523,226250],[524,126750],[525,1],[548,1],[549,28344],[550,88296],[551,15],[552,108118],[553,218343],[554,110091],[584,25771],[585,99459],[586,6222]]
          },
          {
            "id": "tail",
            "label": "长尾巴",
            "box": [781,430,1197,572],
            "file": "discovery/bary/bone-tail.webp",
            "coverage": [[340,15],[372,230836],[373,160332],[374,108105],[375,102438],[376,134072],[377,188529],[378,203184],[379,165931],[380,124688],[381,84097],[382,14934],[403,9487],[404,330000],[405,355514],[406,331299],[407,280279],[408,181209],[409,75311],[410,9453],[414,5193],[435,1722],[436,79605],[437,63355],[438,36809],[439,5222],[468,5010]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [428,391,867,852],
            "file": "discovery/bary/bone-legs.webp",
            "coverage": [[304,15],[305,1],[336,142813],[337,237696],[338,161205],[339,64788],[340,7234],[368,222460],[369,384100],[370,382945],[371,353724],[372,34644],[400,163170],[401,384589],[402,384527],[403,350660],[404,7069],[431,19972],[432,291795],[433,379676],[434,383999],[435,280449],[436,2670],[462,47356],[463,292528],[464,110467],[465,252174],[466,289370],[467,35136],[468,46096],[494,247190],[495,286646],[496,69897],[497,156627],[498,369209],[499,47810],[526,242513],[527,150945],[528,7],[529,32217],[530,360889],[531,242974],[558,241115],[559,36060],[562,42400],[563,253500],[564,157658],[565,3899],[589,32402],[590,358248],[591,65194],[595,515],[596,282518],[597,180160],[620,22255],[621,265126],[622,229576],[628,139634],[629,247270],[650,690],[651,180441],[652,326714],[653,287073],[654,62690],[658,3650],[659,136464],[660,305349],[661,352428],[662,42],[683,9920],[684,44368],[685,22569],[690,3913],[691,101838],[692,150149],[693,133331],[694,1417]]
          },
          {
            "id": "body",
            "label": "脊椎和胸肋",
            "box": [391,388,651,600],
            "file": "discovery/bary/bone-body.webp",
            "coverage": [[302,270],[303,1582],[304,13],[331,23381],[332,141326],[333,242109],[334,280332],[335,280609],[336,160859],[362,120607],[363,314397],[364,247059],[365,106644],[366,384131],[367,383437],[368,171135],[393,251],[394,273633],[395,208992],[396,11898],[397,166696],[398,220757],[399,213363],[400,95460],[426,18106],[428,158442],[429,230343],[430,157451],[431,147684],[432,12427],[460,84800],[461,147713],[462,100881],[463,9270],[492,8635],[493,16333],[494,1]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/bary/fragments.webp",
        "pieces": [[76,49,87,75,19],[53,58,61,80,20],[43,34,37,83,19],[23,52,16,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 33075292,
        "weights": [[292,22587],[293,190744],[294,254516],[295,286935],[296,272312],[297,54203],[302,270],[303,1582],[304,28],[305,1],[322,954],[323,96478],[324,315018],[325,386118],[326,393866],[327,293647],[328,264235],[329,282524],[330,7],[331,23381],[332,141326],[333,242109],[334,280332],[335,280609],[336,303672],[337,237696],[338,161205],[339,64788],[340,7249],[353,114488],[354,296611],[355,256254],[356,155093],[357,342786],[358,319428],[359,64222],[360,57532],[361,364072],[362,228300],[363,314397],[364,380374],[365,384563],[366,384131],[367,383437],[368,393595],[369,384100],[370,382945],[371,353724],[372,265480],[373,160332],[374,108105],[375,102438],[376,134072],[377,188529],[378,203184],[379,165931],[380,124688],[381,84097],[382,14934],[385,32239],[386,30142],[387,153016],[388,233386],[389,77622],[390,1564],[392,399],[393,196544],[394,378582],[395,350827],[396,362388],[397,291290],[398,220757],[399,213363],[400,258630],[401,384589],[402,384527],[403,360147],[404,337069],[405,355514],[406,331299],[407,280279],[408,181209],[409,75311],[410,9453],[414,5193],[418,187146],[419,81043],[425,182323],[426,281876],[427,372030],[428,222258],[429,230343],[430,157451],[431,167656],[432,304222],[433,379676],[434,383999],[435,282171],[436,82275],[437,63355],[438,36809],[439,5222],[454,3722],[455,79375],[456,108696],[457,200246],[458,89768],[459,296367],[460,139890],[461,147713],[462,148237],[463,301798],[464,110467],[465,252174],[466,289370],[467,35136],[468,51106],[485,111994],[486,278788],[487,175102],[488,130876],[489,38000],[490,27],[491,54092],[492,310693],[493,16335],[494,247191],[495,286646],[496,69897],[497,156627],[498,369209],[499,47810],[516,2213],[517,236456],[518,144913],[520,17650],[521,157288],[522,326210],[523,226250],[524,126750],[525,1],[526,242513],[527,150945],[528,7],[529,32217],[530,360889],[531,242974],[548,1],[549,28344],[550,88296],[551,15],[552,108118],[553,218343],[554,110091],[558,241115],[559,36060],[562,42400],[563,253500],[564,157658],[565,3899],[584,25771],[585,99459],[586,6222],[589,32402],[590,358248],[591,65194],[595,515],[596,282518],[597,180160],[620,22255],[621,265126],[622,229576],[628,139634],[629,247270],[650,690],[651,180441],[652,326714],[653,287073],[654,62690],[658,3650],[659,136464],[660,305349],[661,352428],[662,42],[683,9920],[684,44368],[685,22569],[690,3913],[691,101838],[692,150149],[693,133331],[694,1417]],
        "metric": "discovery-rope-v1"
      }
    },
    "apato": {
      "id": "apato",
      "name": "迷惑龙",
      "era": "jurassic",
      "eraLabel": "侏罗纪",
      "isDinosaur": true,
      "rock": "woodgrain-sedimentary",
      "excavation": "wedge",
      "fieldTool": {
        "title": "沿着裂缝摆好楔子",
        "instruction": "旋转青色楔子，和浅色裂缝摆成同一个方向",
        "action": "对齐",
        "label": "楔子撬岩",
        "found": "这片断层撬开啦",
        "points": [[29,53],[68,46],[45,37]],
        "answers": [3,2,0]
      },
      "camp": "木纹楔岩谷",
      "eyebrow": "木纹楔岩谷的新发现",
      "reviveLine": "你把迷惑龙的骨架拼完整啦",
      "card": {
        "title": "迷惑龙 · 侏罗纪",
        "text": "我的脖子长长的，身体很结实，四条腿托着大肚子。尾巴越往后越细。虽然长得很大，我吃的是植物。"
      },
      "groove": {
        "base": "#41362c",
        "inset": "#41362c",
        "light": "#d5c7ad"
      },
      "voice": {
        "file": "gallery-apato.m4a",
        "start": 0.1021,
        "end": 7.5651,
        "text": "嗨，我是迷惑龙！名字听起来像个谜语吧？跟着我的尾巴尖，一起认识我！"
      },
      "living": {
        "file": "../../assets/new30-apato.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/apato/stage-1.webp","art/discovery/apato/stage-2.webp","art/discovery/apato/stage-3.webp","art/discovery/apato/stage-4.webp"],
      "waveOrder": ["neck","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.2695],[0.1227,0.2695],[0.602,0.3432],[0.991,0.417],[0.991,0.4538],[0.7127,0.7488],[0.1227,0.7488],[0.009,0.3432]],
        "face": {
          "file": "art/discovery/apato/stage-4.webp"
        },
        "bowl": "art/discovery/apato/grooves.webp",
        "sand": {
          "file": "art/discovery/apato/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/apato/skeleton.webp",
          "box": [57,371,1197,901]
        },
        "parts": [
          {
            "id": "neck",
            "label": "头骨和粗壮颈骨",
            "box": [57,371,398,602],
            "file": "discovery/apato/bone-neck.webp",
            "coverage": [[289,58],[290,146081],[291,183729],[292,129078],[293,21932],[321,140825],[322,382671],[323,291562],[324,352658],[325,352998],[326,72806],[353,24258],[354,22875],[356,30946],[357,342922],[358,346770],[359,73841],[389,116718],[390,383309],[391,347588],[392,141343],[393,35043],[421,154],[422,236441],[423,383091],[424,380304],[425,330463],[426,5815],[454,20],[455,172442],[456,371331],[457,376498],[458,20710],[488,59385],[489,65352]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [219,514,528,901],
            "file": "discovery/apato/bone-front.webp",
            "coverage": [[427,168824],[428,294790],[429,67936],[457,7056],[458,238737],[459,383518],[460,367697],[461,93467],[488,163022],[489,317983],[490,393538],[491,380450],[492,71233],[520,302771],[521,392981],[522,403718],[523,363204],[524,44122],[551,474],[552,298372],[553,97406],[554,343717],[555,348211],[556,136957],[583,111595],[584,380031],[585,35990],[586,3457],[587,273411],[588,313448],[589,1034],[615,202915],[616,225288],[617,497],[619,233059],[620,335349],[621,2730],[646,33456],[647,347411],[648,72163],[651,271709],[652,213681],[677,21654],[678,247668],[679,383324],[680,15801],[682,24531],[683,382502],[684,171286],[709,33872],[710,129916],[711,107890],[713,9],[714,244415],[715,341355],[716,70178]]
          },
          {
            "id": "tail",
            "label": "渐细长尾",
            "box": [776,500,1197,631],
            "file": "discovery/apato/bone-tail.webp",
            "coverage": [[404,6362],[436,212848],[437,105610],[438,1850],[440,41],[441,23468],[442,83495],[443,122986],[444,111531],[445,32008],[467,11257],[468,353368],[469,387972],[470,324299],[471,306793],[472,308431],[473,257124],[474,134981],[475,33149],[476,4688],[477,48910],[478,22310],[499,17801],[500,140891],[501,186428],[502,162012],[503,101981],[504,26806],[532,41]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [532,446,848,876],
            "file": "discovery/apato/bone-legs.webp",
            "coverage": [[368,17798],[369,100897],[370,25050],[400,64855],[401,364361],[402,334651],[403,225054],[404,20950],[432,85833],[433,383457],[434,383400],[435,382855],[436,88916],[464,117500],[465,379938],[466,383552],[467,348313],[468,29991],[495,27214],[496,290521],[497,380008],[498,377509],[499,284209],[500,1911],[526,12704],[527,286395],[528,225549],[529,199064],[530,284299],[531,205249],[532,3126],[558,157021],[559,382359],[560,73646],[561,108766],[562,263059],[563,350505],[564,39571],[590,135075],[591,364367],[592,14114],[594,119962],[595,366668],[596,106249],[622,68508],[623,313228],[626,7],[627,285551],[628,235556],[629,767],[654,137022],[655,375240],[656,11898],[659,195931],[660,382529],[661,66254],[685,46605],[686,297684],[687,277352],[691,171816],[692,392914],[693,162483],[723,44936],[724,74609],[725,21899]]
          },
          {
            "id": "body",
            "label": "胸肋和脊椎",
            "box": [387,442,665,724],
            "file": "discovery/apato/bone-body.webp",
            "coverage": [[364,15842],[365,111538],[366,149328],[367,196756],[368,156084],[393,836],[394,101735],[395,210752],[396,299391],[397,363832],[398,371471],[399,381934],[400,326279],[425,24949],[426,374794],[427,214647],[428,88987],[429,315837],[430,382036],[431,371877],[432,307587],[458,120500],[460,15861],[461,248493],[462,297779],[463,293938],[464,275084],[491,3009],[492,237586],[493,305473],[494,178501],[495,255906],[496,61591],[524,157908],[525,234793],[526,188617],[527,44200],[556,47871],[557,196227],[558,93587],[589,46067],[590,4762]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/apato/fragments.webp",
        "pieces": [[21,37,13,69,19],[47,55,39,82,20],[70,43,64,87,19],[82,65,86,75,19]]
      },
      "area": {
        "grid": 32,
        "total": 41216792,
        "weights": [[289,58],[290,146081],[291,183729],[292,129078],[293,21932],[321,140825],[322,382671],[323,291562],[324,352658],[325,352998],[326,72806],[353,24258],[354,22875],[356,30946],[357,342922],[358,346770],[359,73841],[364,15842],[365,111538],[366,149328],[367,196756],[368,173882],[369,100897],[370,25050],[389,116718],[390,383309],[391,347588],[392,141343],[393,35879],[394,101735],[395,210752],[396,299391],[397,363832],[398,371471],[399,381934],[400,391134],[401,364361],[402,334651],[403,225054],[404,27312],[421,154],[422,236441],[423,383091],[424,380304],[425,355412],[426,380609],[427,383471],[428,383777],[429,383773],[430,382036],[431,371877],[432,393420],[433,383457],[434,383400],[435,382855],[436,301764],[437,105610],[438,1850],[440,41],[441,23468],[442,83495],[443,122986],[444,111531],[445,32008],[454,20],[455,172442],[456,371331],[457,383554],[458,379947],[459,383518],[460,383558],[461,341960],[462,297779],[463,293938],[464,392584],[465,379938],[466,383552],[467,359570],[468,383359],[469,387972],[470,324299],[471,306793],[472,308431],[473,257124],[474,134981],[475,33149],[476,4688],[477,48910],[478,22310],[488,222407],[489,383335],[490,393538],[491,383459],[492,308819],[493,305473],[494,178501],[495,283120],[496,352112],[497,380008],[498,377509],[499,302010],[500,142802],[501,186428],[502,162012],[503,101981],[504,26806],[520,302771],[521,392981],[522,403718],[523,363204],[524,202030],[525,234793],[526,201321],[527,330595],[528,225549],[529,199064],[530,284299],[531,205249],[532,3167],[551,474],[552,298372],[553,97406],[554,343717],[555,348211],[556,184828],[557,196227],[558,250608],[559,382359],[560,73646],[561,108766],[562,263059],[563,350505],[564,39571],[583,111595],[584,380031],[585,35990],[586,3457],[587,273411],[588,313448],[589,47101],[590,139837],[591,364367],[592,14114],[594,119962],[595,366668],[596,106249],[615,202915],[616,225288],[617,497],[619,233059],[620,335349],[621,2730],[622,68508],[623,313228],[626,7],[627,285551],[628,235556],[629,767],[646,33456],[647,347411],[648,72163],[651,271709],[652,213681],[654,137022],[655,375240],[656,11898],[659,195931],[660,382529],[661,66254],[677,21654],[678,247668],[679,383324],[680,15801],[682,24531],[683,382502],[684,171286],[685,46605],[686,297684],[687,277352],[691,171816],[692,392914],[693,162483],[709,33872],[710,129916],[711,107890],[713,9],[714,244415],[715,341355],[716,70178],[723,44936],[724,74609],[725,21899]],
        "metric": "discovery-wedge-v1"
      }
    },
    "argentino": {
      "id": "argentino",
      "name": "阿根廷龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "silver-blue-quartzite",
      "excavation": "lever",
      "fieldTool": {
        "variant": "lever",
        "title": "把支点放到重石附近",
        "instruction": "看看重石在哪边，把支点放得离它近一些",
        "action": "放支点",
        "label": "杠杆撬岩",
        "found": "杠杆把重石撬松了",
        "answers": [0,2,2],
        "rounds": [53,44,58]
      },
      "camp": "银蓝杠杆坡",
      "eyebrow": "银蓝杠杆坡的新发现",
      "reviveLine": "你把阿根廷龙的骨架拼完整啦",
      "card": {
        "title": "阿根廷龙 · 白垩纪",
        "text": "我的化石发现于阿根廷。我属于体形非常庞大的恐龙，长脖子、长尾巴，还有四条粗壮的腿。植物是我的食物。"
      },
      "groove": {
        "base": "#384351",
        "inset": "#384351",
        "light": "#dce3ed"
      },
      "voice": {
        "file": "gallery-argentino.m4a",
        "start": 0.1021,
        "end": 6.3281,
        "text": "咚咚，大家伙来啦！我是阿根廷龙，先把一个大大的微笑送给你！"
      },
      "living": {
        "file": "../../assets/new30-argentino.webp",
        "aspect": "1536/1024"
      },
      "stages": ["art/discovery/argentino/stage-1.webp","art/discovery/argentino/stage-2.webp","art/discovery/argentino/stage-3.webp","art/discovery/argentino/stage-4.webp"],
      "waveOrder": ["neck","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.1936],[0.1297,0.1936],[0.991,0.4148],[0.991,0.4517],[0.6459,0.7467],[0.2772,0.7467],[0.1666,0.7098],[0.009,0.2305]],
        "face": {
          "file": "art/discovery/argentino/stage-4.webp"
        },
        "bowl": "art/discovery/argentino/grooves.webp",
        "sand": {
          "file": "art/discovery/argentino/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/argentino/skeleton.webp",
          "box": [57,283,1197,881]
        },
        "parts": [
          {
            "id": "neck",
            "label": "头骨和长颈",
            "box": [57,283,403,580],
            "file": "discovery/argentino/bone-neck.webp",
            "coverage": [[225,52054],[226,264418],[227,192677],[228,63831],[229,12],[257,117570],[258,235337],[259,225420],[260,371837],[261,250975],[262,10765],[292,119748],[293,392637],[294,272921],[295,5584],[325,247640],[326,393815],[327,233585],[328,7835],[357,28689],[358,354655],[359,382075],[360,259129],[361,92679],[362,13],[390,117340],[391,379796],[392,384780],[393,377673],[394,759],[423,150848],[424,377203],[425,384796],[426,70587],[456,165675],[457,234967],[458,15180]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [246,511,526,881],
            "file": "discovery/argentino/bone-front.webp",
            "coverage": [[426,43236],[427,209765],[428,336693],[429,83489],[456,90716],[457,149684],[458,377169],[459,360199],[460,228116],[461,34403],[487,18362],[488,365626],[489,384601],[490,394661],[491,242964],[519,49],[520,362775],[521,315555],[522,404486],[523,327943],[524,8214],[551,43345],[552,376679],[553,71912],[554,158195],[555,366527],[556,67893],[583,119964],[584,369173],[585,34729],[586,126968],[587,384581],[588,127944],[615,190184],[616,235786],[618,103399],[619,384246],[620,40166],[646,1332],[647,318825],[648,173243],[650,177563],[651,380258],[652,12427],[678,131497],[679,297863],[680,144152],[681,21171],[682,308527],[683,392796],[684,33358],[713,40753],[714,160262],[715,146976],[716,25265]]
          },
          {
            "id": "tail",
            "label": "渐细尾巴",
            "box": [748,505,1197,610],
            "file": "discovery/argentino/bone-tail.webp",
            "coverage": [[403,3957],[435,174409],[436,237676],[437,94437],[438,33458],[439,16109],[440,24699],[441,61791],[442,119587],[443,145942],[444,113875],[445,42118],[467,292866],[468,379278],[469,387174],[470,358044],[471,336563],[472,283306],[473,198042],[474,90985],[475,9172],[476,16],[477,36068],[478,24073],[499,52632],[500,97679],[501,87112],[502,50123],[503,10820]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [512,449,813,865],
            "file": "discovery/argentino/bone-legs.webp",
            "coverage": [[368,59236],[369,26387],[400,249570],[401,347060],[402,200627],[403,44557],[432,249928],[433,384299],[434,384186],[435,190221],[463,10879],[464,321402],[465,384716],[466,384789],[467,76101],[494,1444],[495,224949],[496,361325],[497,369834],[498,383849],[499,33582],[526,133223],[527,373163],[528,220425],[529,77461],[530,392485],[531,19846],[558,286125],[559,353412],[560,1098],[561,65461],[562,382201],[563,169546],[590,283697],[591,235943],[593,7924],[594,303760],[595,242415],[621,5685],[622,334638],[623,117944],[626,158066],[627,349148],[628,23043],[653,53905],[654,381000],[655,131296],[658,118073],[659,384020],[660,106056],[685,148996],[686,195323],[687,69451],[690,224651],[691,374195],[692,187781],[722,2],[723,41]]
          },
          {
            "id": "body",
            "label": "宽阔胸肋和脊椎",
            "box": [391,433,651,695],
            "file": "discovery/argentino/bone-body.webp",
            "coverage": [[362,48261],[363,120645],[364,181761],[365,269945],[366,291147],[367,251873],[368,97404],[393,3285],[394,376802],[395,380446],[396,384614],[397,384657],[398,384787],[399,384749],[400,143978],[426,280618],[427,174666],[428,48031],[429,301133],[430,384694],[431,384715],[432,144706],[458,2277],[459,24026],[460,154065],[461,332457],[462,352069],[463,347744],[464,73117],[491,98193],[492,322798],[493,295947],[494,254765],[495,121823],[523,20708],[524,220518],[525,171026],[526,144276],[556,66948],[557,114742],[558,8492]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/argentino/fragments.webp",
        "pieces": [[17,34,15,75,18],[41,46,38,83,19],[60,63,62,84,20],[78,46,86,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 41853529,
        "weights": [[225,52054],[226,264418],[227,192677],[228,63831],[229,12],[257,117570],[258,235337],[259,225420],[260,371837],[261,250975],[262,10765],[292,119748],[293,392637],[294,272921],[295,5584],[325,247640],[326,393815],[327,233585],[328,7835],[357,28689],[358,354655],[359,382075],[360,259129],[361,92679],[362,48274],[363,120645],[364,181761],[365,269945],[366,291147],[367,251873],[368,156640],[369,26387],[390,117340],[391,379796],[392,384780],[393,380958],[394,377561],[395,380446],[396,384614],[397,384657],[398,384787],[399,384749],[400,393548],[401,347060],[402,200627],[403,48514],[423,150848],[424,377203],[425,384796],[426,394441],[427,384431],[428,384724],[429,384622],[430,384694],[431,384715],[432,394634],[433,384299],[434,384186],[435,364630],[436,237676],[437,94437],[438,33458],[439,16109],[440,24699],[441,61791],[442,119587],[443,145942],[444,113875],[445,42118],[456,256391],[457,384651],[458,394626],[459,384225],[460,382181],[461,366860],[462,352069],[463,358623],[464,394519],[465,384716],[466,384789],[467,368967],[468,379278],[469,387174],[470,358044],[471,336563],[472,283306],[473,198042],[474,90985],[475,9172],[476,16],[477,36068],[478,24073],[487,18362],[488,365626],[489,384601],[490,394661],[491,341157],[492,322798],[493,295947],[494,256209],[495,346772],[496,361325],[497,369834],[498,383849],[499,86214],[500,97679],[501,87112],[502,50123],[503,10820],[519,49],[520,362775],[521,315555],[522,404486],[523,348651],[524,228732],[525,171026],[526,277499],[527,373163],[528,220425],[529,77461],[530,392485],[531,19846],[551,43345],[552,376679],[553,71912],[554,158195],[555,366527],[556,134841],[557,114742],[558,294617],[559,353412],[560,1098],[561,65461],[562,382201],[563,169546],[583,119964],[584,369173],[585,34729],[586,126968],[587,384581],[588,127944],[590,283697],[591,235943],[593,7924],[594,303760],[595,242415],[615,190184],[616,235786],[618,103399],[619,384246],[620,40166],[621,5685],[622,334638],[623,117944],[626,158066],[627,349148],[628,23043],[646,1332],[647,318825],[648,173243],[650,177563],[651,380258],[652,12427],[653,53905],[654,381000],[655,131296],[658,118073],[659,384020],[660,106056],[678,131497],[679,297863],[680,144152],[681,21171],[682,308527],[683,392796],[684,33358],[685,148996],[686,195323],[687,69451],[690,224651],[691,374195],[692,187781],[713,40753],[714,160262],[715,146976],[716,25265],[722,2],[723,41]],
        "metric": "discovery-lever-v1"
      }
    },
    "niger": {
      "id": "niger",
      "name": "尼日尔龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "ivory-layered-chalk",
      "excavation": "inflate",
      "fieldTool": {
        "variant": "inflate",
        "title": "给气囊充气顶开岩层",
        "instruction": "按住充气按钮，等进度满了，气囊才顶得开岩层",
        "action": "气囊顶岩",
        "label": "气囊顶岩",
        "found": "气囊把岩缝顶开了",
        "answers": [0,1,2],
        "rounds": [[67,52,1000],[29,48,1150],[49,61,900]]
      },
      "camp": "白垩气囊台",
      "eyebrow": "白垩气囊台的新发现",
      "reviveLine": "你把尼日尔龙的骨架拼完整啦",
      "card": {
        "title": "尼日尔龙 · 白垩纪",
        "text": "我的脑袋前端宽宽的，嘴里排列着许多细小牙齿。我用它们取食植物，身后还连着长长的尾巴。"
      },
      "groove": {
        "base": "#746750",
        "inset": "#746750",
        "light": "#f7edd9"
      },
      "voice": {
        "file": "gallery-niger.m4a",
        "start": 0.1021,
        "end": 6.3542,
        "text": "你好，我是尼日尔龙！认识我，先看看我这张特别宽的嘴巴吧！"
      },
      "living": {
        "file": "../../assets/new30-niger.webp",
        "aspect": "1536/1024"
      },
      "stages": ["art/discovery/niger/stage-1.webp","art/discovery/niger/stage-2.webp","art/discovery/niger/stage-3.webp","art/discovery/niger/stage-4.webp"],
      "waveOrder": ["neck","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.4113],[0.051,0.3376],[0.6041,0.3376],[0.991,0.4113],[0.991,0.4482],[0.641,0.7063],[0.1616,0.7063],[0.009,0.4851]],
        "face": {
          "file": "art/discovery/niger/stage-4.webp"
        },
        "bowl": "art/discovery/niger/grooves.webp",
        "sand": {
          "file": "art/discovery/niger/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/niger/skeleton.webp",
          "box": [57,435,1197,861]
        },
        "parts": [
          {
            "id": "neck",
            "label": "宽铲吻头骨和颈骨",
            "box": [57,457,368,601],
            "file": "discovery/niger/bone-neck.webp",
            "coverage": [[355,3879],[356,64173],[357,30747],[386,619],[387,247048],[388,384614],[389,367629],[390,225322],[391,20560],[392,1762],[393,13],[417,42817],[418,273856],[419,384635],[420,373777],[421,115189],[422,349777],[423,325022],[424,278804],[425,101224],[449,168805],[450,384167],[451,353181],[452,83152],[454,59622],[455,266850],[456,316966],[457,59329],[481,12335],[482,88100],[483,49219]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [272,491,498,861],
            "file": "discovery/niger/bone-front.webp",
            "coverage": [[395,124673],[396,57139],[426,143628],[427,379579],[428,185408],[456,9914],[457,155622],[458,375769],[459,207536],[460,168],[488,173302],[489,379166],[490,382720],[491,7635],[520,177901],[521,198891],[522,374574],[523,68572],[552,165787],[553,152198],[554,102781],[555,257802],[556,1742],[584,244962],[585,95351],[586,25256],[587,361541],[588,38312],[615,36548],[616,305949],[618,14733],[619,283633],[620,55],[647,168873],[648,314496],[650,136280],[651,250969],[678,30],[679,120232],[680,88117],[681,2688],[682,257929],[683,248909],[684,4]]
          },
          {
            "id": "tail",
            "label": "细长尾巴",
            "box": [741,482,1197,579],
            "file": "discovery/niger/bone-tail.webp",
            "coverage": [[403,108042],[404,47633],[405,862],[434,252],[435,348817],[436,362409],[437,303499],[438,200008],[439,125341],[440,68377],[441,40727],[442,15295],[443,1413],[444,106],[445,791],[466,6157],[467,94613],[468,129653],[469,163456],[470,170590],[471,191168],[472,212417],[473,199818],[474,180602],[475,143117],[476,93621],[477,51334],[478,15304]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [525,437,765,845],
            "file": "discovery/niger/bone-legs.webp",
            "coverage": [[367,4388],[368,196474],[369,102937],[370,12901],[399,49304],[400,392857],[401,364752],[402,302374],[403,65420],[431,28602],[432,387700],[433,384853],[434,384353],[435,35418],[463,86430],[464,394358],[465,379295],[466,221356],[494,41437],[495,298056],[496,128142],[497,346890],[498,228662],[499,11804],[526,248162],[527,204540],[529,322017],[530,25647],[531,1940],[558,268466],[559,93098],[560,49],[561,313110],[562,156759],[590,253564],[591,67335],[593,118938],[594,272592],[621,3043],[622,322430],[623,80939],[625,20608],[626,366138],[627,26192],[653,81106],[654,211336],[655,54427],[657,64689],[658,381172],[659,84603],[689,79197],[690,133225],[691,52962]]
          },
          {
            "id": "body",
            "label": "胸肋和脊椎",
            "box": [357,435,629,684],
            "file": "discovery/niger/bone-body.webp",
            "coverage": [[362,19971],[363,131250],[364,177005],[365,227173],[366,272350],[367,254226],[368,2207],[393,83131],[394,284080],[395,239297],[396,322970],[397,384589],[398,384398],[399,335266],[425,248836],[426,250865],[427,5060],[428,126909],[429,280214],[430,276363],[431,245728],[457,149183],[458,3533],[459,88078],[460,243312],[461,178802],[462,242500],[463,190756],[490,8518],[491,186412],[492,150396],[493,144311],[494,187820],[495,36230],[523,142917],[524,165144],[525,127013],[526,31562],[555,24608],[556,24218]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/niger/fragments.webp",
        "pieces": [[32,32,14,76,18],[59,36,41,82,19],[74,59,86,74,19],[43,60,65,86,20]]
      },
      "area": {
        "grid": 32,
        "total": 31820237,
        "weights": [[355,3879],[356,64173],[357,30747],[362,19971],[363,131250],[364,177005],[365,227173],[366,272350],[367,258614],[368,198681],[369,102937],[370,12901],[386,619],[387,247048],[388,384614],[389,367629],[390,225322],[391,20560],[392,1762],[393,83144],[394,284080],[395,363970],[396,380109],[397,384589],[398,384398],[399,384570],[400,392857],[401,364752],[402,302374],[403,173462],[404,47633],[405,862],[417,42817],[418,273856],[419,384635],[420,373777],[421,115189],[422,349777],[423,325022],[424,278804],[425,350060],[426,394493],[427,384639],[428,312317],[429,280214],[430,276363],[431,274330],[432,387700],[433,384853],[434,384605],[435,384235],[436,362409],[437,303499],[438,200008],[439,125341],[440,68377],[441,40727],[442,15295],[443,1413],[444,106],[445,791],[449,168805],[450,384167],[451,353181],[452,83152],[454,59622],[455,266850],[456,326880],[457,364134],[458,379302],[459,295614],[460,243480],[461,178802],[462,242500],[463,277186],[464,394358],[465,379295],[466,227513],[467,94613],[468,129653],[469,163456],[470,170590],[471,191168],[472,212417],[473,199818],[474,180602],[475,143117],[476,93621],[477,51334],[478,15304],[481,12335],[482,88100],[483,49219],[488,173302],[489,379166],[490,391238],[491,194047],[492,150396],[493,144311],[494,229257],[495,334286],[496,128142],[497,346890],[498,228662],[499,11804],[520,177901],[521,198891],[522,374574],[523,211489],[524,165144],[525,127013],[526,279724],[527,204540],[529,322017],[530,25647],[531,1940],[552,165787],[553,152198],[554,102781],[555,282410],[556,25960],[558,268466],[559,93098],[560,49],[561,313110],[562,156759],[584,244962],[585,95351],[586,25256],[587,361541],[588,38312],[590,253564],[591,67335],[593,118938],[594,272592],[615,36548],[616,305949],[618,14733],[619,283633],[620,55],[621,3043],[622,322430],[623,80939],[625,20608],[626,366138],[627,26192],[647,168873],[648,314496],[650,136280],[651,250969],[653,81106],[654,211336],[655,54427],[657,64689],[658,381172],[659,84603],[678,30],[679,120232],[680,88117],[681,2688],[682,257929],[683,248909],[684,4],[689,79197],[690,133225],[691,52962]],
        "metric": "discovery-inflate-v1"
      }
    },
    "corytho": {
      "id": "corytho",
      "name": "盔龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "dark-green-striped-metamorphic",
      "excavation": "brace",
      "fieldTool": {
        "variant": "brace",
        "title": "找一根合适的撑杆",
        "instruction": "看看裂缝有多宽，选一根刚好能撑住两头的杆",
        "action": "选撑杆",
        "label": "撑杆开岩",
        "found": "撑杆托住了岩层",
        "answers": [1,2,0],
        "points": [[42,42],[61,52],[50,59]]
      },
      "camp": "墨绿支撑谷",
      "eyebrow": "墨绿支撑谷的新发现",
      "reviveLine": "你把盔龙的骨架拼完整啦",
      "card": {
        "title": "盔龙 · 白垩纪",
        "text": "我的头上有高高的骨质头冠，轮廓像一顶圆头盔。嘴巴宽扁，像鸭嘴，我平时吃的是植物。"
      },
      "groove": {
        "base": "#293e30",
        "inset": "#293e30",
        "light": "#bdd6b7"
      },
      "voice": {
        "file": "gallery-corytho.m4a",
        "start": 0.1021,
        "end": 5.9766,
        "text": "小伙伴，我是盔龙！这次见面，请你看看我的特别头盔！"
      },
      "living": {
        "file": "../../assets/new30-corytho.webp",
        "aspect": "1230/1278"
      },
      "stages": ["art/discovery/corytho/stage-1.webp","art/discovery/corytho/stage-2.webp","art/discovery/corytho/stage-3.webp","art/discovery/corytho/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3102],[0.0521,0.1996],[0.1259,0.1996],[0.5315,0.2365],[0.974,0.384],[0.991,0.4209],[0.991,0.4577],[0.6421,0.7159],[0.1996,0.7159],[0.1259,0.679],[0.009,0.384]],
        "face": {
          "file": "art/discovery/corytho/stage-4.webp"
        },
        "bowl": "art/discovery/corytho/grooves.webp",
        "sand": {
          "file": "art/discovery/corytho/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/corytho/skeleton.webp",
          "box": [57,283,1197,853]
        },
        "parts": [
          {
            "id": "head",
            "label": "头盔状头冠和颈骨",
            "box": [57,283,347,538],
            "file": "discovery/corytho/bone-head.webp",
            "coverage": [[227,87711],[228,280442],[229,164128],[259,308540],[260,383640],[261,379896],[262,1133],[290,1532],[291,348039],[292,383738],[293,228353],[294,32909],[321,7874],[322,222602],[323,393491],[324,394270],[325,401417],[326,305898],[327,26370],[353,144464],[354,369594],[355,237545],[356,161291],[357,179738],[358,383842],[359,229148],[360,167177],[385,403],[386,13666],[389,21262],[390,345443],[391,383791],[392,241706],[422,50313],[423,235382],[424,75536]]
          },
          {
            "id": "tail",
            "label": "长尾巴",
            "box": [742,395,1197,577],
            "file": "discovery/corytho/bone-tail.webp",
            "coverage": [[339,181853],[340,119098],[341,12930],[370,10613],[371,377397],[372,352190],[373,309531],[374,184362],[375,91399],[376,27650],[377,6],[402,2777],[403,322200],[404,362865],[405,379323],[406,378496],[407,373274],[408,342271],[409,286961],[410,201187],[411,117538],[412,19241],[435,84757],[436,135741],[437,103557],[438,89127],[439,81054],[440,95841],[441,86221],[442,96949],[443,111688],[444,144694],[445,106000],[446,3950],[477,1065],[478,28879]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [465,346,784,853],
            "file": "discovery/corytho/bone-legs.webp",
            "coverage": [[271,2817],[272,10576],[303,126804],[304,281917],[305,169270],[306,74293],[307,2564],[335,206026],[336,403953],[337,384199],[338,314830],[339,22385],[367,212802],[368,394002],[369,384023],[370,373514],[371,6048],[399,200434],[400,394307],[401,384300],[402,379618],[403,13993],[430,12554],[431,170474],[432,394208],[433,384347],[434,338763],[435,38372],[461,6875],[462,159241],[463,305500],[464,320754],[465,255170],[466,129524],[467,68943],[493,59416],[494,335170],[495,185284],[496,366115],[497,292751],[498,4214],[525,36953],[526,392628],[527,134959],[528,253389],[529,391823],[530,92314],[557,675],[558,355784],[559,2521],[560,7232],[561,211870],[562,285398],[563,8232],[589,75796],[590,361580],[591,3931],[593,2306],[594,327461],[595,241827],[620,130],[621,224489],[622,232569],[626,201224],[627,305579],[651,5213],[652,223446],[653,304964],[654,48984],[657,16719],[658,285729],[659,313312],[688,1],[689,177898],[690,227179],[691,171410]]
          },
          {
            "id": "body",
            "label": "胸肋和前腿",
            "box": [210,341,609,842],
            "file": "discovery/corytho/bone-body.webp",
            "coverage": [[268,5871],[269,31669],[270,48771],[271,34050],[298,72352],[299,163805],[300,255360],[301,313627],[302,313242],[303,172364],[328,15],[329,147635],[330,345911],[331,365804],[332,393987],[333,393685],[334,393870],[335,187486],[360,87568],[361,371024],[362,394369],[363,367782],[364,354515],[365,353086],[366,363068],[367,171256],[392,142226],[393,384569],[394,386101],[395,338701],[396,315363],[397,330091],[398,295937],[399,167774],[423,74616],[424,308690],[425,383805],[426,369458],[427,276131],[428,242958],[429,182672],[430,238636],[431,70606],[454,2420],[455,358178],[456,383969],[457,372501],[458,292345],[459,280199],[460,172162],[461,189868],[462,78223],[487,204501],[488,258750],[489,359073],[490,251558],[491,221172],[492,181976],[493,103861],[519,247851],[520,164299],[521,148262],[522,234471],[523,28670],[524,59090],[525,9],[550,92045],[551,266164],[552,31641],[553,69682],[554,338358],[555,15],[581,4091],[582,315979],[583,25260],[585,155625],[586,160766],[613,156451],[614,191867],[616,3921],[617,323847],[618,47209],[645,19020],[647,453],[648,170300],[649,269207],[679,8091],[680,113815],[681,65068]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/corytho/fragments.webp",
        "pieces": [[24,48,15,72,19],[45,34,38,83,18],[67,45,66,84,19],[67,68,88,77,19]]
      },
      "area": {
        "grid": 32,
        "total": 45743633,
        "weights": [[227,87711],[228,280442],[229,164128],[259,308540],[260,383640],[261,379896],[262,1133],[268,5871],[269,31669],[270,48771],[271,36867],[272,10576],[290,1532],[291,348039],[292,383738],[293,228353],[294,32909],[298,72352],[299,163805],[300,255360],[301,313627],[302,313242],[303,299168],[304,281917],[305,169270],[306,74293],[307,2564],[321,7874],[322,222602],[323,393491],[324,394270],[325,401417],[326,305898],[327,26370],[328,15],[329,147635],[330,345911],[331,365804],[332,393987],[333,393685],[334,393870],[335,393512],[336,403953],[337,384199],[338,314830],[339,204238],[340,119098],[341,12930],[353,144464],[354,369594],[355,237545],[356,161291],[357,179738],[358,383842],[359,229148],[360,254745],[361,371024],[362,394369],[363,367782],[364,354515],[365,353086],[366,363068],[367,384058],[368,394002],[369,384023],[370,384127],[371,383445],[372,352190],[373,309531],[374,184362],[375,91399],[376,27650],[377,6],[385,403],[386,13666],[389,21262],[390,345443],[391,383791],[392,383932],[393,384569],[394,386101],[395,338701],[396,315363],[397,330091],[398,295937],[399,368208],[400,394307],[401,384300],[402,382395],[403,336193],[404,362865],[405,379323],[406,378496],[407,373274],[408,342271],[409,286961],[410,201187],[411,117538],[412,19241],[422,50313],[423,309998],[424,384226],[425,383805],[426,369458],[427,276131],[428,242958],[429,182672],[430,251190],[431,241080],[432,394208],[433,384347],[434,338763],[435,123129],[436,135741],[437,103557],[438,89127],[439,81054],[440,95841],[441,86221],[442,96949],[443,111688],[444,144694],[445,106000],[446,3950],[454,2420],[455,358178],[456,383969],[457,372501],[458,292345],[459,280199],[460,172162],[461,196743],[462,237464],[463,305500],[464,320754],[465,255170],[466,129524],[467,68943],[477,1065],[478,28879],[487,204501],[488,258750],[489,359073],[490,251558],[491,221172],[492,181976],[493,163277],[494,335170],[495,185284],[496,366115],[497,292751],[498,4214],[519,247851],[520,164299],[521,148262],[522,234471],[523,28670],[524,59090],[525,36962],[526,392628],[527,134959],[528,253389],[529,391823],[530,92314],[550,92045],[551,266164],[552,31641],[553,69682],[554,338358],[555,15],[557,675],[558,355784],[559,2521],[560,7232],[561,211870],[562,285398],[563,8232],[581,4091],[582,315979],[583,25260],[585,155625],[586,160766],[589,75796],[590,361580],[591,3931],[593,2306],[594,327461],[595,241827],[613,156451],[614,191867],[616,3921],[617,323847],[618,47209],[620,130],[621,224489],[622,232569],[626,201224],[627,305579],[645,19020],[647,453],[648,170300],[649,269207],[651,5213],[652,223446],[653,304964],[654,48984],[657,16719],[658,285729],[659,313312],[679,8091],[680,113815],[681,65068],[688,1],[689,177898],[690,227179],[691,171410]],
        "metric": "discovery-brace-v1"
      }
    },
    "maia": {
      "id": "maia",
      "name": "慈母龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "rose-gray-porphyry",
      "excavation": "rhythm",
      "fieldTool": {
        "variant": "rhythm",
        "title": "记住敲击的顺序",
        "instruction": "先看哪些石头亮起来，再按同样的顺序敲",
        "action": "记敲击",
        "label": "记忆敲岩",
        "found": "这一段岩层敲松了",
        "answers": [0,1,2],
        "points": [[28,41],[47,34],[73,43],[52,56]],
        "rounds": [[0,3,1],[3,0,2],[2,1,3,0]]
      },
      "camp": "玫灰节奏台",
      "eyebrow": "玫灰节奏台的新发现",
      "reviveLine": "你把慈母龙的骨架拼完整啦",
      "card": {
        "title": "慈母龙 · 白垩纪",
        "text": "我的嘴巴前面有宽宽的喙，后面有帮助咀嚼的牙齿。我吃植物，走路时可以用两条腿，也可以用四条腿。"
      },
      "groove": {
        "base": "#514143",
        "inset": "#514143",
        "light": "#ddc3c5"
      },
      "voice": {
        "file": "gallery-maia.m4a",
        "start": 0.1021,
        "end": 5.4688,
        "text": "你好呀，我是慈母龙！欢迎你来到我的小小探险营地！"
      },
      "living": {
        "file": "../../assets/new30-maia.webp",
        "aspect": "1254/1254"
      },
      "stages": ["art/discovery/maia/stage-1.webp","art/discovery/maia/stage-2.webp","art/discovery/maia/stage-3.webp","art/discovery/maia/stage-4.webp"],
      "waveOrder": ["head","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3788],[0.0526,0.3051],[0.3476,0.2682],[0.7163,0.2682],[0.991,0.3419],[0.991,0.3788],[0.6794,0.7476],[0.2738,0.7476],[0.1632,0.7107],[0.009,0.4157]],
        "face": {
          "file": "art/discovery/maia/stage-4.webp"
        },
        "bowl": "art/discovery/maia/grooves.webp",
        "sand": {
          "file": "art/discovery/maia/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/maia/skeleton.webp",
          "box": [57,355,1197,876]
        },
        "parts": [
          {
            "id": "head",
            "label": "鸭嘴头骨和颈骨",
            "box": [57,395,368,595],
            "file": "discovery/maia/bone-head.webp",
            "coverage": [[323,72952],[324,276014],[325,307590],[326,76196],[354,81697],[355,347544],[356,384442],[357,394419],[358,349001],[359,36607],[385,120032],[386,375246],[387,383900],[388,384254],[389,319402],[390,349042],[391,238666],[392,161154],[393,42443],[417,55448],[418,362937],[419,220929],[420,81224],[421,5156],[422,180361],[423,382151],[424,383997],[425,126057],[450,4600],[454,10999],[455,182378],[456,334439],[457,56701],[487,489],[488,24088]]
          },
          {
            "id": "tail",
            "label": "长尾巴",
            "box": [806,394,1197,519],
            "file": "discovery/maia/bone-tail.webp",
            "coverage": [[340,16484],[341,256560],[342,144874],[343,66543],[344,17052],[345,131],[372,104547],[373,393641],[374,380493],[375,371875],[376,352912],[377,325260],[378,306956],[379,242947],[380,165602],[381,46305],[404,110087],[405,270800],[406,257751],[407,228352],[408,151592],[409,90494],[410,48184],[411,21274],[412,41793],[413,104022],[414,42048],[436,13],[437,20086],[438,2464]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [542,355,826,873],
            "file": "discovery/maia/bone-legs.webp",
            "coverage": [[304,221318],[305,230730],[306,194396],[307,98361],[308,36670],[309,1],[336,330777],[337,394430],[338,387259],[339,368092],[340,322472],[341,3106],[368,339301],[369,384474],[370,383975],[371,383910],[372,279568],[400,316109],[401,384076],[402,384536],[403,355440],[404,188447],[431,8947],[432,307135],[433,331794],[434,384350],[435,288107],[436,71835],[463,91478],[464,341938],[465,325028],[466,132094],[467,228585],[468,7],[494,8376],[495,337241],[496,393696],[497,383659],[498,46704],[499,72364],[500,6],[526,726],[527,362757],[528,377363],[529,390728],[530,200619],[559,195989],[560,211261],[561,187316],[562,314122],[563,33244],[591,124338],[592,289157],[594,196849],[595,302277],[596,46850],[623,160524],[624,291867],[626,47950],[627,377241],[628,164499],[653,3],[654,102152],[655,325653],[656,160456],[658,3560],[659,333526],[660,161825],[685,5264],[686,128346],[687,130184],[688,4334],[689,59795],[690,298496],[691,384878],[692,169639],[721,3317],[722,37894],[723,32852],[724,5339]]
          },
          {
            "id": "body",
            "label": "胸肋和前腿",
            "box": [237,355,637,876],
            "file": "discovery/maia/bone-body.webp",
            "coverage": [[299,1018],[300,70976],[301,145714],[302,250035],[303,241957],[304,84630],[330,60256],[331,213993],[332,356401],[333,373304],[334,393180],[335,394305],[336,73225],[361,129666],[362,331798],[363,378714],[364,384572],[365,384166],[366,384760],[367,384630],[368,55101],[392,19485],[393,320726],[394,393855],[395,384507],[396,384704],[397,384355],[398,383693],[399,384023],[400,78016],[425,257989],[426,394061],[427,384152],[428,378767],[429,333588],[430,274685],[431,306386],[432,39380],[456,19650],[457,281991],[458,390199],[459,372771],[460,333425],[461,189673],[462,289964],[463,154988],[487,73323],[488,323776],[489,344203],[490,393709],[491,314891],[492,287570],[493,212154],[494,235847],[495,20],[519,28494],[520,316458],[521,243180],[522,391860],[523,238934],[524,237514],[525,201548],[526,73025],[551,16065],[552,356454],[553,24706],[554,61090],[555,342196],[556,81912],[557,6744],[583,117356],[584,277291],[585,914],[587,324266],[588,133359],[614,15891],[615,309015],[616,27466],[618,29969],[619,328846],[620,9888],[646,137536],[647,223990],[650,182297],[651,214072],[678,224553],[679,82183],[681,28564],[682,324463],[683,134781],[713,20677],[714,88252],[715,22385]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/maia/fragments.webp",
        "pieces": [[74,50,87,75,19],[51,59,61,80,20],[41,35,37,83,19],[21,53,16,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 48348800,
        "weights": [[299,1018],[300,70976],[301,145714],[302,250035],[303,241957],[304,305948],[305,230730],[306,194396],[307,98361],[308,36670],[309,1],[323,72952],[324,276014],[325,307590],[326,76196],[330,60256],[331,213993],[332,356401],[333,373304],[334,393180],[335,394305],[336,404002],[337,394430],[338,387259],[339,368092],[340,338956],[341,259666],[342,144874],[343,66543],[344,17052],[345,131],[354,81697],[355,347544],[356,384442],[357,394419],[358,349001],[359,36607],[361,129666],[362,331798],[363,378714],[364,384572],[365,384166],[366,384760],[367,384630],[368,394402],[369,384474],[370,383975],[371,383910],[372,384115],[373,393641],[374,380493],[375,371875],[376,352912],[377,325260],[378,306956],[379,242947],[380,165602],[381,46305],[385,120032],[386,375246],[387,383900],[388,384254],[389,319402],[390,349042],[391,238666],[392,180639],[393,363169],[394,393855],[395,384507],[396,384704],[397,384355],[398,383693],[399,384023],[400,394125],[401,384076],[402,384536],[403,355440],[404,298534],[405,270800],[406,257751],[407,228352],[408,151592],[409,90494],[410,48184],[411,21274],[412,41793],[413,104022],[414,42048],[417,55448],[418,362937],[419,220929],[420,81224],[421,5156],[422,180361],[423,382151],[424,383997],[425,384046],[426,394061],[427,384152],[428,378767],[429,333588],[430,274685],[431,315333],[432,346515],[433,331794],[434,384350],[435,288107],[436,71848],[437,20086],[438,2464],[450,4600],[454,10999],[455,182378],[456,354089],[457,338692],[458,390199],[459,372771],[460,333425],[461,189673],[462,289964],[463,246466],[464,341938],[465,325028],[466,132094],[467,228585],[468,7],[487,73812],[488,347864],[489,344203],[490,393709],[491,314891],[492,287570],[493,212154],[494,244223],[495,337261],[496,393696],[497,383659],[498,46704],[499,72364],[500,6],[519,28494],[520,316458],[521,243180],[522,391860],[523,238934],[524,237514],[525,201548],[526,73751],[527,362757],[528,377363],[529,390728],[530,200619],[551,16065],[552,356454],[553,24706],[554,61090],[555,342196],[556,81912],[557,6744],[559,195989],[560,211261],[561,187316],[562,314122],[563,33244],[583,117356],[584,277291],[585,914],[587,324266],[588,133359],[591,124338],[592,289157],[594,196849],[595,302277],[596,46850],[614,15891],[615,309015],[616,27466],[618,29969],[619,328846],[620,9888],[623,160524],[624,291867],[626,47950],[627,377241],[628,164499],[646,137536],[647,223990],[650,182297],[651,214072],[653,3],[654,102152],[655,325653],[656,160456],[658,3560],[659,333526],[660,161825],[678,224553],[679,82183],[681,28564],[682,324463],[683,134781],[685,5264],[686,128346],[687,130184],[688,4334],[689,59795],[690,298496],[691,384878],[692,169639],[713,20677],[714,88252],[715,22385],[721,3317],[722,37894],[723,32852],[724,5339]],
        "metric": "discovery-rhythm-v1"
      }
    },
    "pachyrhino": {
      "id": "pachyrhino",
      "name": "厚鼻龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "honey-conglomerate",
      "excavation": "echo",
      "fieldTool": {
        "title": "敲一敲，找回声",
        "instruction": "轻点探测点，看哪里回声更清楚",
        "action": "探测",
        "label": "回声探测",
        "found": "找到能松开的薄岩层啦",
        "points": [[25,36],[49,34],[74,39],[24,57],[52,63],[77,59]],
        "answers": [1,4,3]
      },
      "camp": "蜜砾探测台",
      "eyebrow": "蜜砾探测台的新发现",
      "reviveLine": "你把厚鼻龙的骨架拼完整啦",
      "card": {
        "title": "厚鼻龙 · 白垩纪",
        "text": "我鼻子上方有一块厚厚的骨质隆起，脖子后面是一面大颈盾。我属于角龙家族，吃植物，用四条腿走路。"
      },
      "groove": {
        "base": "#5b4825",
        "inset": "#5b4825",
        "light": "#e9d49c"
      },
      "voice": {
        "file": "gallery-pachyrhino.m4a",
        "start": 0.1021,
        "end": 6.1198,
        "text": "嘿，我是厚鼻龙！我的鼻子可藏着一个特别显眼的小秘密！"
      },
      "living": {
        "file": "../../assets/new30-pachyrhino.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/pachyrhino/stage-1.webp","art/discovery/pachyrhino/stage-2.webp","art/discovery/pachyrhino/stage-3.webp","art/discovery/pachyrhino/stage-4.webp"],
      "waveOrder": ["head","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3507],[0.0106,0.3138],[0.1581,0.2032],[0.3056,0.2032],[0.6006,0.2401],[0.991,0.3876],[0.991,0.4244],[0.991,0.4613],[0.785,0.7194],[0.0844,0.7194],[0.009,0.4613]],
        "face": {
          "file": "art/discovery/pachyrhino/stage-4.webp"
        },
        "bowl": "art/discovery/pachyrhino/grooves.webp",
        "sand": {
          "file": "art/discovery/pachyrhino/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/pachyrhino/skeleton.webp",
          "box": [57,275,1197,857]
        },
        "parts": [
          {
            "id": "head",
            "label": "厚鼻头骨和完整颈盾",
            "box": [57,275,440,609],
            "file": "discovery/pachyrhino/bone-head.webp",
            "coverage": [[230,133378],[231,187073],[232,133407],[233,201381],[234,1427],[261,112116],[262,342632],[263,362455],[264,383654],[265,334044],[266,176647],[292,1046],[293,280117],[294,383846],[295,383980],[296,383712],[297,383979],[298,322353],[299,14795],[322,47451],[323,177267],[324,184471],[325,403848],[326,393706],[327,394083],[328,393494],[329,393510],[330,298807],[331,745],[353,148],[354,330250],[355,383569],[356,383615],[357,393766],[358,384111],[359,383754],[360,384252],[361,383718],[362,158577],[385,31980],[386,380342],[387,383807],[388,384185],[389,393973],[390,384064],[391,383690],[392,384226],[393,384060],[394,77802],[417,183330],[418,379809],[419,383573],[420,384071],[421,393603],[422,336631],[423,243904],[424,384030],[425,374892],[426,57053],[449,85487],[450,177742],[451,382799],[452,335652],[453,266686],[454,92584],[455,75416],[456,148558],[457,102334],[482,84554],[483,105023],[484,36]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [169,431,548,857],
            "file": "discovery/pachyrhino/bone-front.webp",
            "coverage": [[332,252],[363,9867],[364,277179],[365,266750],[394,10093],[395,253490],[396,383713],[397,184658],[425,8854],[426,290724],[427,384036],[428,149327],[455,185077],[456,235403],[457,281384],[458,394145],[459,326570],[487,183676],[488,342659],[489,376291],[490,393657],[491,311770],[492,40680],[518,21023],[519,354376],[520,281617],[521,46474],[522,190695],[523,375177],[524,278056],[525,21581],[550,153187],[551,374758],[552,131881],[555,261949],[556,375827],[557,73284],[581,31889],[582,333960],[583,115899],[587,271638],[588,331714],[589,26788],[613,200455],[614,332088],[615,2042],[618,45717],[619,367319],[620,205649],[644,110258],[645,380103],[646,280707],[649,2957],[650,245611],[651,383831],[652,82057],[676,14461],[677,41493],[678,6507],[681,119696],[682,293487],[683,288062],[684,13493]]
          },
          {
            "id": "tail",
            "label": "渐细尾巴",
            "box": [830,404,1197,558],
            "file": "discovery/pachyrhino/bone-tail.webp",
            "coverage": [[341,73049],[342,66063],[373,246336],[374,346186],[375,238879],[376,100805],[377,22559],[378,2],[405,304633],[406,380424],[407,384013],[408,381801],[409,355225],[410,282081],[411,193403],[412,94848],[413,3523],[437,140302],[438,144051],[439,170025],[440,145294],[441,110796],[442,81597],[443,70441],[444,97945],[445,136514],[446,35679],[478,6844]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [565,334,927,837],
            "file": "discovery/pachyrhino/bone-legs.webp",
            "coverage": [[273,96168],[274,8104],[304,5544],[305,352732],[306,288404],[307,166797],[308,38146],[336,30312],[337,393909],[338,394018],[339,388705],[340,343354],[341,118853],[368,25256],[369,384068],[370,384120],[371,384200],[372,383917],[373,147032],[400,16184],[401,384397],[402,384111],[403,384074],[404,368179],[405,69990],[432,135176],[433,371410],[434,347100],[435,383522],[436,207033],[437,15474],[463,22958],[464,348431],[465,181521],[466,40992],[467,380399],[468,101214],[495,148146],[496,393877],[497,174346],[498,39929],[499,383135],[500,286150],[501,26],[527,99157],[528,397532],[529,113920],[530,4350],[531,286988],[532,377864],[533,117389],[560,289542],[561,153854],[563,6129],[564,240027],[565,332396],[566,139106],[591,1],[592,303109],[593,233571],[596,27754],[597,371365],[598,340902],[599,1080],[622,32168],[623,219398],[624,392877],[625,196147],[629,286387],[630,380159],[631,46133],[654,50382],[655,168414],[656,171640],[657,64123],[660,136090],[661,381781],[662,347586],[663,185679],[692,17013],[693,71567],[694,19152],[695,19680]]
          },
          {
            "id": "body",
            "label": "胸肋和脊椎",
            "box": [398,329,669,667],
            "file": "discovery/pachyrhino/bone-body.webp",
            "coverage": [[268,5],[269,43919],[270,114863],[271,161312],[272,126014],[273,4635],[299,93029],[300,204520],[301,343035],[302,357794],[303,369896],[304,367489],[305,1004],[330,17321],[331,333549],[332,386503],[333,394100],[334,393958],[335,394614],[336,374065],[362,223895],[363,373747],[364,107203],[365,117302],[366,384552],[367,384484],[368,368722],[394,305815],[395,130643],[396,250],[397,167054],[398,323175],[399,364358],[400,378159],[426,45901],[428,169443],[429,372450],[430,280430],[431,304936],[432,258227],[459,38124],[460,337499],[461,266991],[462,251248],[463,257449],[464,45319],[491,16],[492,218834],[493,233149],[494,231699],[495,144797],[524,12745],[525,168346],[526,155538],[527,44569]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/pachyrhino/fragments.webp",
        "pieces": [[19,34,13,69,19],[45,52,39,82,20],[68,40,64,87,19],[80,62,86,75,19]]
      },
      "area": {
        "grid": 32,
        "total": 64804938,
        "weights": [[230,133378],[231,187073],[232,133407],[233,201381],[234,1427],[261,112116],[262,342632],[263,362455],[264,383654],[265,334044],[266,176647],[268,5],[269,43919],[270,114863],[271,161312],[272,126014],[273,100803],[274,8104],[292,1046],[293,280117],[294,383846],[295,383980],[296,383712],[297,383979],[298,322353],[299,107824],[300,204520],[301,343035],[302,357794],[303,369896],[304,373033],[305,353736],[306,288404],[307,166797],[308,38146],[322,47451],[323,177267],[324,184471],[325,403848],[326,393706],[327,394083],[328,393494],[329,393510],[330,316128],[331,334294],[332,386755],[333,394100],[334,393958],[335,394614],[336,404377],[337,393909],[338,394018],[339,388705],[340,343354],[341,191902],[342,66063],[353,148],[354,330250],[355,383569],[356,383615],[357,393766],[358,384111],[359,383754],[360,384252],[361,383718],[362,382472],[363,383614],[364,384382],[365,384052],[366,384552],[367,384484],[368,393978],[369,384068],[370,384120],[371,384200],[372,383917],[373,393368],[374,346186],[375,238879],[376,100805],[377,22559],[378,2],[385,31980],[386,380342],[387,383807],[388,384185],[389,393973],[390,384064],[391,383690],[392,384226],[393,384060],[394,393710],[395,384133],[396,383963],[397,351712],[398,323175],[399,364358],[400,394343],[401,384397],[402,384111],[403,384074],[404,368179],[405,374623],[406,380424],[407,384013],[408,381801],[409,355225],[410,282081],[411,193403],[412,94848],[413,3523],[417,183330],[418,379809],[419,383573],[420,384071],[421,393603],[422,336631],[423,243904],[424,384030],[425,383746],[426,393678],[427,384036],[428,318770],[429,372450],[430,280430],[431,304936],[432,393403],[433,371410],[434,347100],[435,383522],[436,207033],[437,155776],[438,144051],[439,170025],[440,145294],[441,110796],[442,81597],[443,70441],[444,97945],[445,136514],[446,35679],[449,85487],[450,177742],[451,382799],[452,335652],[453,266686],[454,92584],[455,260493],[456,383961],[457,383718],[458,394145],[459,364694],[460,337499],[461,266991],[462,251248],[463,280407],[464,393750],[465,181521],[466,40992],[467,380399],[468,101214],[478,6844],[482,84554],[483,105023],[484,36],[487,183676],[488,342659],[489,376291],[490,393657],[491,311786],[492,259514],[493,233149],[494,231699],[495,292943],[496,393877],[497,174346],[498,39929],[499,383135],[500,286150],[501,26],[518,21023],[519,354376],[520,281617],[521,46474],[522,190695],[523,375177],[524,290801],[525,189927],[526,155538],[527,143726],[528,397532],[529,113920],[530,4350],[531,286988],[532,377864],[533,117389],[550,153187],[551,374758],[552,131881],[555,261949],[556,375827],[557,73284],[560,289542],[561,153854],[563,6129],[564,240027],[565,332396],[566,139106],[581,31889],[582,333960],[583,115899],[587,271638],[588,331714],[589,26788],[591,1],[592,303109],[593,233571],[596,27754],[597,371365],[598,340902],[599,1080],[613,200455],[614,332088],[615,2042],[618,45717],[619,367319],[620,205649],[622,32168],[623,219398],[624,392877],[625,196147],[629,286387],[630,380159],[631,46133],[644,110258],[645,380103],[646,280707],[649,2957],[650,245611],[651,383831],[652,82057],[654,50382],[655,168414],[656,171640],[657,64123],[660,136090],[661,381781],[662,347586],[663,185679],[676,14461],[677,41493],[678,6507],[681,119696],[682,293487],[683,288062],[684,13493],[692,17013],[693,71567],[694,19152],[695,19680]],
        "metric": "discovery-echo-v1"
      }
    },
    "euoplo": {
      "id": "euoplo",
      "name": "包头龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "smoky-purple-volcanic",
      "excavation": "rope",
      "fieldTool": {
        "variant": "rope",
        "title": "把绳环拉向箭头",
        "instruction": "抓住绳环，沿着虚线拉开松动的岩层",
        "action": "拉绳",
        "label": "绳索拉岩",
        "found": "岩层拉开一道口子",
        "answers": [0,1,2],
        "rounds": [[32,43,53,49,"向右下"],[69,56,51,69,"向左下"],[48,38,68,26,"向右上"]]
      },
      "camp": "烟紫拉岩谷",
      "eyebrow": "烟紫拉岩谷的新发现",
      "reviveLine": "你把包头龙的骨架拼完整啦",
      "card": {
        "title": "包头龙 · 白垩纪",
        "text": "我的背上有骨甲和骨刺，尾巴末端长着骨质尾锤。身体低低的，用四条腿走路，吃的是植物。"
      },
      "groove": {
        "base": "#41354d",
        "inset": "#41354d",
        "light": "#d2c2df"
      },
      "voice": {
        "file": "gallery-euoplo.m4a",
        "start": 0.1021,
        "end": 6.3802,
        "text": "我是包头龙！我的特别装扮从脑袋一直延伸到尾巴，快来认识我！"
      },
      "living": {
        "file": "../../assets/new30-euoplo.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/euoplo/stage-1.webp","art/discovery/euoplo/stage-2.webp","art/discovery/euoplo/stage-3.webp","art/discovery/euoplo/stage-4.webp"],
      "waveOrder": ["head","front","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3816],[0.1235,0.271],[0.1972,0.2341],[0.3079,0.1972],[0.5291,0.1972],[0.991,0.3079],[0.991,0.3448],[0.991,0.3816],[0.991,0.4185],[0.7135,0.6398],[0.3448,0.7135],[0.271,0.7135],[0.0498,0.6766],[0.0129,0.6398],[0.009,0.4922]],
        "face": {
          "file": "art/discovery/euoplo/stage-4.webp"
        },
        "bowl": "art/discovery/euoplo/grooves.webp",
        "sand": {
          "file": "art/discovery/euoplo/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/euoplo/skeleton.webp",
          "box": [57,307,1197,825]
        },
        "parts": [
          {
            "id": "head",
            "label": "骨甲覆盖的头骨",
            "box": [57,447,241,626],
            "file": "discovery/euoplo/bone-head.webp",
            "coverage": [[355,68295],[356,122231],[385,1080],[386,195727],[387,361269],[388,376614],[389,50218],[417,87109],[418,383576],[419,383514],[420,383830],[421,279353],[422,4284],[449,193556],[450,383589],[451,383749],[452,383568],[453,186867],[454,12569],[481,48179],[482,281672],[483,217991],[484,72947],[485,5]]
          },
          {
            "id": "front",
            "label": "肩骨和前腿",
            "box": [114,459,503,825],
            "file": "discovery/euoplo/bone-front.webp",
            "coverage": [[361,77358],[362,119960],[363,34113],[392,56871],[393,377604],[394,394095],[395,369291],[396,36612],[422,74837],[424,176333],[425,384053],[426,314759],[427,63177],[428,506],[453,3720],[454,368261],[455,257013],[456,269585],[457,384147],[458,218823],[485,16941],[486,361984],[487,243554],[488,225288],[489,328345],[490,390385],[491,198624],[492,25142],[517,195929],[518,393307],[519,115714],[521,13],[522,217593],[523,393741],[524,234139],[548,46939],[549,361662],[550,184937],[551,4740],[554,146691],[555,383679],[556,210697],[579,8991],[580,311331],[581,285409],[585,15540],[586,312936],[587,314619],[588,6499],[610,1215],[611,285538],[612,371629],[613,190271],[617,162032],[618,393881],[619,228817],[643,2202],[644,23000],[645,8298],[648,73357],[649,332660],[650,363483],[651,171895],[681,59],[682,3762],[683,5]]
          },
          {
            "id": "tail",
            "label": "尾骨和连体尾槌",
            "box": [831,421,1197,539],
            "file": "discovery/euoplo/bone-tail.webp",
            "coverage": [[341,7],[348,9750],[349,15813],[373,87822],[374,216854],[375,88463],[376,26455],[377,6312],[379,53207],[380,345182],[381,360739],[382,107384],[405,259872],[406,383919],[407,383295],[408,357108],[409,336773],[410,303732],[411,310252],[412,383719],[413,381809],[414,131076],[437,104505],[438,168205],[439,183684],[440,157053],[441,127143],[442,72461],[443,9181],[444,139651],[445,111754]]
          },
          {
            "id": "legs",
            "label": "髋骨和后腿",
            "box": [515,402,857,777],
            "file": "discovery/euoplo/bone-legs.webp",
            "coverage": [[336,235600],[337,231782],[338,121492],[339,5292],[368,367145],[369,384382],[370,384278],[371,270157],[399,11361],[400,386984],[401,384348],[402,384391],[403,269153],[430,9085],[431,274061],[432,390889],[433,382527],[434,380623],[435,82295],[461,18901],[462,259689],[463,301499],[464,143494],[465,272132],[466,363225],[467,24670],[493,156440],[494,384236],[495,108796],[497,202888],[498,384478],[499,287564],[500,371],[525,2478],[526,292149],[527,254061],[528,327],[529,58181],[530,304607],[531,393504],[532,155808],[533,5],[557,882],[558,243742],[559,381117],[560,17469],[562,410],[563,257189],[564,383701],[565,132549],[589,162424],[590,314629],[591,238029],[592,15],[594,752],[595,211243],[596,383926],[597,269002],[626,61321],[627,235351],[628,237505],[629,139225]]
          },
          {
            "id": "body",
            "label": "背部骨甲和胸肋",
            "box": [182,307,863,631],
            "file": "discovery/euoplo/bone-body.webp",
            "coverage": [[234,6437],[235,12440],[236,12961],[237,9089],[238,19235],[239,5039],[240,8853],[263,921],[264,9711],[265,264014],[266,269552],[267,339860],[268,353728],[269,352871],[270,354393],[271,338446],[272,274502],[273,173995],[274,54228],[275,15498],[293,71],[294,11374],[295,185475],[296,348811],[297,383643],[298,394082],[299,384520],[300,384437],[301,384436],[302,384506],[303,384187],[304,393631],[305,383649],[306,375201],[307,179511],[308,5300],[309,4],[324,5405],[325,144270],[326,300309],[327,393998],[328,394218],[329,393996],[330,404225],[331,393643],[332,394326],[333,394205],[334,394130],[335,394051],[336,168773],[337,162254],[338,272509],[339,382457],[340,335241],[341,107418],[356,102225],[357,368048],[358,383961],[359,384557],[360,383691],[361,306642],[362,273856],[363,350052],[364,384385],[365,384284],[366,384208],[367,384114],[368,27322],[371,114246],[372,384330],[373,271008],[388,7082],[389,343817],[390,384330],[391,384364],[392,327340],[393,7059],[395,14871],[396,347528],[397,383848],[398,384119],[399,372869],[400,7325],[403,101780],[404,359052],[405,131019],[421,114629],[422,304774],[423,384366],[424,208162],[426,79011],[427,314495],[428,365455],[429,307177],[430,375020],[431,109946],[435,20994],[436,101064],[437,3298],[455,111101],[456,48637],[458,142233],[459,227390],[460,282218],[461,270674],[462,124229],[490,1000],[491,79814],[492,214481],[493,84357],[524,228]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/euoplo/fragments.webp",
        "pieces": [[21,35,15,75,18],[45,47,38,83,19],[64,64,62,84,20],[82,47,86,77,18]]
      },
      "area": {
        "grid": 32,
        "total": 61621516,
        "weights": [[234,6437],[235,12440],[236,12961],[237,9089],[238,19235],[239,5039],[240,8853],[263,921],[264,9711],[265,264014],[266,269552],[267,339860],[268,353728],[269,352871],[270,354393],[271,338446],[272,274502],[273,173995],[274,54228],[275,15498],[293,71],[294,11374],[295,185475],[296,348811],[297,383643],[298,394082],[299,384520],[300,384437],[301,384436],[302,384506],[303,384187],[304,393631],[305,383649],[306,375201],[307,179511],[308,5300],[309,4],[324,5405],[325,144270],[326,300309],[327,393998],[328,394218],[329,393996],[330,404225],[331,393643],[332,394326],[333,394205],[334,394130],[335,394051],[336,404373],[337,394036],[338,394001],[339,387749],[340,335241],[341,107425],[348,9750],[349,15813],[355,68295],[356,224456],[357,368048],[358,383961],[359,384557],[360,383691],[361,384000],[362,393816],[363,384165],[364,384385],[365,384284],[366,384208],[367,384114],[368,394467],[369,384382],[370,384278],[371,384403],[372,384330],[373,358830],[374,216854],[375,88463],[376,26455],[377,6312],[379,53207],[380,345182],[381,360739],[382,107384],[385,1080],[386,195727],[387,361269],[388,383696],[389,394035],[390,384330],[391,384364],[392,384211],[393,384663],[394,394095],[395,384162],[396,384140],[397,383848],[398,384119],[399,384230],[400,394309],[401,384348],[402,384391],[403,370933],[404,359052],[405,390891],[406,383919],[407,383295],[408,357108],[409,336773],[410,303732],[411,310252],[412,383719],[413,381809],[414,131076],[417,87109],[418,383576],[419,383514],[420,383830],[421,393982],[422,383895],[423,384366],[424,384495],[425,384053],[426,393770],[427,377672],[428,365961],[429,307177],[430,384105],[431,384007],[432,390889],[433,382527],[434,380623],[435,103289],[436,101064],[437,107803],[438,168205],[439,183684],[440,157053],[441,127143],[442,72461],[443,9181],[444,139651],[445,111754],[449,193556],[450,383589],[451,383749],[452,383568],[453,190587],[454,380830],[455,368114],[456,318222],[457,384147],[458,361056],[459,227390],[460,282218],[461,289575],[462,383918],[463,301499],[464,143494],[465,272132],[466,363225],[467,24670],[481,48179],[482,281672],[483,217991],[484,72947],[485,16946],[486,361984],[487,243554],[488,225288],[489,328345],[490,391385],[491,278438],[492,239623],[493,240797],[494,384236],[495,108796],[497,202888],[498,384478],[499,287564],[500,371],[517,195929],[518,393307],[519,115714],[521,13],[522,217593],[523,393741],[524,234367],[525,2478],[526,292149],[527,254061],[528,327],[529,58181],[530,304607],[531,393504],[532,155808],[533,5],[548,46939],[549,361662],[550,184937],[551,4740],[554,146691],[555,383679],[556,210697],[557,882],[558,243742],[559,381117],[560,17469],[562,410],[563,257189],[564,383701],[565,132549],[579,8991],[580,311331],[581,285409],[585,15540],[586,312936],[587,314619],[588,6499],[589,162424],[590,314629],[591,238029],[592,15],[594,752],[595,211243],[596,383926],[597,269002],[610,1215],[611,285538],[612,371629],[613,190271],[617,162032],[618,393881],[619,228817],[626,61321],[627,235351],[628,237505],[629,139225],[643,2202],[644,23000],[645,8298],[648,73357],[649,332660],[650,363483],[651,171895],[681,59],[682,3762],[683,5]],
        "metric": "discovery-rope-v1"
      }
    },
    "deinonych": {
      "id": "deinonych",
      "name": "恐爪龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "deep-blue-mica-schist",
      "excavation": "wedge",
      "fieldTool": {
        "title": "沿着裂缝摆好楔子",
        "instruction": "旋转青色楔子，和浅色裂缝摆成同一个方向",
        "action": "对齐",
        "label": "楔子撬岩",
        "found": "这片断层撬开啦",
        "points": [[31,53],[66,46],[45,39]],
        "answers": [1,0,2]
      },
      "camp": "蓝云母楔岩台",
      "eyebrow": "蓝云母楔岩台的新发现",
      "reviveLine": "你把恐爪龙的骨架拼完整啦",
      "card": {
        "title": "恐爪龙 · 白垩纪",
        "text": "我的后脚上有一根特别大、弯弯的爪子。长尾巴帮助身体保持平衡，我用两条后腿走路，模样很像鸟类的亲戚。"
      },
      "groove": {
        "base": "#25344a",
        "inset": "#25344a",
        "light": "#b8d0e7"
      },
      "voice": {
        "file": "gallery-deinonych.m4a",
        "start": 0.1021,
        "end": 5.4818,
        "text": "我是恐爪龙！别急着记名字，先当我的小脚观察员吧！"
      },
      "living": {
        "file": "../../assets/new30-deinonych.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/deinonych/stage-1.webp","art/discovery/deinonych/stage-2.webp","art/discovery/deinonych/stage-3.webp","art/discovery/deinonych/stage-4.webp"],
      "waveOrder": ["head","arms","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3022],[0.1018,0.2285],[0.2124,0.2285],[0.991,0.3391],[0.991,0.376],[0.6181,0.7816],[0.2862,0.7816],[0.2124,0.7448],[0.0281,0.5604],[0.009,0.376]],
        "face": {
          "file": "art/discovery/deinonych/stage-4.webp"
        },
        "bowl": "art/discovery/deinonych/grooves.webp",
        "sand": {
          "file": "art/discovery/deinonych/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/deinonych/skeleton.webp",
          "box": [57,339,1197,936]
        },
        "parts": [
          {
            "id": "head",
            "label": "头骨和弯曲颈骨",
            "box": [57,339,357,560],
            "file": "discovery/deinonych/bone-head.webp",
            "coverage": [[260,642],[261,97645],[262,83383],[263,17639],[291,97144],[292,334705],[293,394339],[294,375948],[295,288059],[296,47593],[321,15666],[322,228355],[323,303795],[324,353037],[325,404191],[326,305449],[327,342647],[328,255472],[353,171425],[354,338020],[355,240748],[356,335282],[357,394238],[358,175210],[359,203998],[360,274865],[385,4144],[386,6857],[387,199767],[388,318818],[389,144303],[390,99],[391,216867],[392,314192],[418,145582],[419,201609],[420,7906],[423,73427],[424,326784],[425,8349],[455,22460],[456,37996]]
          },
          {
            "id": "arms",
            "label": "肩骨前臂和手爪",
            "box": [90,484,472,787],
            "file": "discovery/deinonych/bone-arms.webp",
            "coverage": [[394,47791],[395,199401],[396,3035],[425,68528],[426,336488],[427,255896],[428,2774],[452,13533],[453,5499],[455,138507],[456,276769],[457,358648],[458,145918],[459,252],[482,79241],[483,205621],[484,286970],[485,199774],[486,207232],[487,155402],[488,163211],[489,272300],[514,59048],[515,215290],[516,75026],[518,81431],[519,123544],[520,85094],[521,228080],[522,74926],[546,5476],[547,89486],[548,27848],[549,116274],[550,237992],[551,224230],[552,106547],[553,202180],[554,70207],[580,13569],[581,119654],[582,243601],[583,12193],[613,29427],[614,124606],[615,40306],[646,744]]
          },
          {
            "id": "tail",
            "label": "长尾巴",
            "box": [638,445,1197,595],
            "file": "discovery/deinonych/bone-tail.webp",
            "coverage": [[374,54],[375,29153],[376,104134],[377,159711],[378,182740],[379,146838],[380,107825],[381,75801],[382,21584],[400,38552],[401,85928],[402,67966],[403,108200],[404,167658],[405,248209],[406,310951],[407,285877],[408,162271],[409,59844],[410,5881],[414,72],[432,183462],[433,379492],[434,364210],[435,350755],[436,272618],[437,174254],[438,56618],[439,682],[464,77781],[465,103983],[466,78889],[467,21664],[468,1429],[496,10]]
          },
          {
            "id": "legs",
            "label": "髋骨后腿和镰刀爪",
            "box": [310,447,735,936],
            "file": "discovery/deinonych/bone-legs.webp",
            "coverage": [[365,21050],[366,88843],[367,19533],[397,98439],[398,382495],[399,328682],[400,148588],[429,106165],[430,384594],[431,384354],[432,208412],[461,68630],[462,305360],[463,379600],[464,126546],[494,303276],[495,122166],[496,83856],[522,9973],[523,90147],[524,10],[525,27648],[526,345496],[527,6772],[554,9507],[555,283824],[556,58235],[557,42038],[558,368593],[559,249212],[560,9971],[587,32890],[588,267240],[589,26263],[590,44363],[591,183042],[592,271068],[593,130716],[594,8481],[619,3],[620,292774],[621,144251],[624,27463],[625,355648],[626,117347],[648,24679],[649,198397],[650,152789],[651,177089],[652,225385],[653,11568],[657,184014],[658,115486],[680,26160],[681,16007],[682,380975],[683,293245],[684,71222],[687,121815],[688,271811],[689,221326],[690,190948],[711,2516],[712,145138],[713,258082],[714,189140],[715,16468],[719,21912],[720,197168],[721,366285],[722,215059],[745,156],[751,65131],[752,163073],[753,121781],[754,80002]]
          },
          {
            "id": "body",
            "label": "脊椎和胸肋",
            "box": [331,444,540,665],
            "file": "discovery/deinonych/bone-body.webp",
            "coverage": [[361,2127],[362,62036],[363,160462],[364,180010],[365,128266],[392,11353],[393,262257],[394,327007],[395,185141],[396,381457],[397,285965],[424,40863],[425,306338],[426,57857],[427,127349],[428,322712],[429,248748],[456,37212],[457,14475],[458,184687],[459,276138],[460,357285],[461,222324],[489,51970],[490,177969],[491,347996],[492,250004],[493,38184],[522,173671],[523,236974],[524,15404]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/deinonych/fragments.webp",
        "pieces": [[30,33,14,76,18],[57,37,41,82,19],[72,60,86,74,19],[41,61,65,86,20]]
      },
      "area": {
        "grid": 32,
        "total": 35535952,
        "weights": [[260,642],[261,97645],[262,83383],[263,17639],[291,97144],[292,334705],[293,394339],[294,375948],[295,288059],[296,47593],[321,15666],[322,228355],[323,303795],[324,353037],[325,404191],[326,305449],[327,342647],[328,255472],[353,171425],[354,338020],[355,240748],[356,335282],[357,394238],[358,175210],[359,203998],[360,274865],[361,2127],[362,62036],[363,160462],[364,180010],[365,149316],[366,88843],[367,19533],[374,54],[375,29153],[376,104134],[377,159711],[378,182740],[379,146838],[380,107825],[381,75801],[382,21584],[385,4144],[386,6857],[387,199767],[388,318818],[389,144303],[390,99],[391,216867],[392,325545],[393,262257],[394,374798],[395,384542],[396,384492],[397,384404],[398,382495],[399,328682],[400,187140],[401,85928],[402,67966],[403,108200],[404,167658],[405,248209],[406,310951],[407,285877],[408,162271],[409,59844],[410,5881],[414,72],[418,145582],[419,201609],[420,7906],[423,73427],[424,367647],[425,383215],[426,394345],[427,383245],[428,325486],[429,354913],[430,384594],[431,384354],[432,391874],[433,379492],[434,364210],[435,350755],[436,272618],[437,174254],[438,56618],[439,682],[452,13533],[453,5499],[455,160967],[456,351977],[457,373123],[458,330605],[459,276390],[460,357285],[461,290954],[462,305360],[463,379600],[464,204327],[465,103983],[466,78889],[467,21664],[468,1429],[482,79241],[483,205621],[484,286970],[485,199774],[486,207232],[487,155402],[488,163211],[489,324270],[490,177969],[491,347996],[492,250004],[493,38184],[494,303276],[495,122166],[496,83866],[514,59048],[515,215290],[516,75026],[518,81431],[519,123544],[520,85094],[521,228080],[522,258570],[523,327121],[524,15414],[525,27648],[526,345496],[527,6772],[546,5476],[547,89486],[548,27848],[549,116274],[550,237992],[551,224230],[552,106547],[553,202180],[554,79714],[555,283824],[556,58235],[557,42038],[558,368593],[559,249212],[560,9971],[580,13569],[581,119654],[582,243601],[583,12193],[587,32890],[588,267240],[589,26263],[590,44363],[591,183042],[592,271068],[593,130716],[594,8481],[613,29427],[614,124606],[615,40306],[619,3],[620,292774],[621,144251],[624,27463],[625,355648],[626,117347],[646,744],[648,24679],[649,198397],[650,152789],[651,177089],[652,225385],[653,11568],[657,184014],[658,115486],[680,26160],[681,16007],[682,380975],[683,293245],[684,71222],[687,121815],[688,271811],[689,221326],[690,190948],[711,2516],[712,145138],[713,258082],[714,189140],[715,16468],[719,21912],[720,197168],[721,366285],[722,215059],[745,156],[751,65131],[752,163073],[753,121781],[754,80002]],
        "metric": "discovery-wedge-v1"
      }
    },
    "micro": {
      "id": "micro",
      "name": "小盗龙",
      "era": "cretaceous",
      "eraLabel": "白垩纪",
      "isDinosaur": true,
      "rock": "ochre-fine-shale",
      "excavation": "inflate",
      "fieldTool": {
        "variant": "inflate",
        "title": "给气囊充气顶开岩层",
        "instruction": "按住充气按钮，等进度满了，气囊才顶得开岩层",
        "action": "气囊顶岩",
        "label": "气囊顶岩",
        "found": "气囊把岩缝顶开了",
        "answers": [0,1,2],
        "rounds": [[42,39,1100],[72,49,900],[29,58,1250]]
      },
      "camp": "细页气囊谷",
      "eyebrow": "细页气囊谷的新发现",
      "reviveLine": "你把小盗龙的骨架拼完整啦",
      "card": {
        "title": "小盗龙 · 白垩纪",
        "text": "我的前肢和后腿都长着长长的翼羽，尾巴上也有羽毛。化石在中国被发现，身体小巧，模样像一位有羽毛的小精灵。"
      },
      "groove": {
        "base": "#5b4b35",
        "inset": "#5b4b35",
        "light": "#e7d4b5"
      },
      "voice": {
        "file": "gallery-micro.m4a",
        "start": 0.1021,
        "end": 5.7552,
        "text": "我是小盗龙！把眼睛睁大一点，我的羽毛藏着特别的线索！"
      },
      "living": {
        "file": "../../assets/new30-micro.webp",
        "aspect": "1374/1145"
      },
      "stages": ["art/discovery/micro/stage-1.webp","art/discovery/micro/stage-2.webp","art/discovery/micro/stage-3.webp","art/discovery/micro/stage-4.webp"],
      "waveOrder": ["head","arms","tail","legs","body"],
      "art": {
        "mode": "natural",
        "geometry": {
          "x": 0,
          "y": 0,
          "scale": 1
        },
        "skeletonSize": [1254,1254],
        "interior": [[0.009,0.3391],[0.0661,0.2654],[0.1767,0.2654],[0.9879,0.3022],[0.991,0.3391],[0.6561,0.7079],[0.3242,0.7816],[0.2136,0.7816],[0.0292,0.5604],[0.009,0.376]],
        "face": {
          "file": "art/discovery/micro/stage-4.webp"
        },
        "bowl": "art/discovery/micro/grooves.webp",
        "sand": {
          "file": "art/discovery/micro/buried.webp",
          "full": true
        },
        "skeleton": {
          "file": "art/discovery/micro/skeleton.webp",
          "box": [57,376,1197,916]
        },
        "parts": [
          {
            "id": "head",
            "label": "小头骨和弯曲颈骨",
            "box": [57,376,334,543],
            "file": "discovery/micro/bone-head.webp",
            "coverage": [[291,17140],[292,127466],[293,126330],[294,39474],[322,93638],[323,296624],[324,393459],[325,311745],[326,316135],[327,65371],[353,121389],[354,276138],[355,203333],[356,335104],[357,78725],[358,131278],[359,187578],[385,76],[386,109395],[387,142527],[388,14079],[390,65517],[391,286996],[392,41698],[418,3497],[422,375],[423,138503],[424,105143]]
          },
          {
            "id": "arms",
            "label": "肩骨和两条前肢",
            "box": [101,491,429,792],
            "file": "discovery/micro/bone-arms.webp",
            "coverage": [[393,3783],[394,120695],[423,37244],[424,60024],[425,225633],[426,155405],[454,246],[455,167904],[456,294736],[457,72806],[483,13029],[484,216366],[485,164881],[486,188150],[487,95184],[488,5955],[489,222179],[490,16438],[514,20626],[515,230522],[516,96065],[519,66480],[520,159340],[521,211540],[522,21181],[546,63557],[547,112087],[548,37674],[549,14261],[550,178976],[551,230993],[552,26220],[579,19882],[580,1289],[581,170858],[582,184059],[583,1322],[612,1779],[613,112050],[614,41175],[645,5037]]
          },
          {
            "id": "tail",
            "label": "细长尾骨",
            "box": [593,431,1197,552],
            "file": "discovery/micro/bone-tail.webp",
            "coverage": [[347,3],[348,15],[373,16],[374,27361],[375,104394],[376,144267],[377,138958],[378,129520],[379,111922],[380,93922],[381,62000],[382,17723],[399,11092],[400,32365],[401,54604],[402,122689],[403,177294],[404,185980],[405,184168],[406,134624],[407,51390],[408,3047],[431,197335],[432,258259],[433,197990],[434,114277],[435,26873],[436,2133],[463,4]]
          },
          {
            "id": "legs",
            "label": "髋骨和两条后肢",
            "box": [312,483,775,916],
            "file": "discovery/micro/bone-legs.webp",
            "coverage": [[396,43340],[397,148441],[398,94157],[399,28655],[428,53343],[429,367250],[430,383351],[431,119956],[459,989],[460,135279],[461,316046],[462,358977],[463,18629],[491,227329],[492,106980],[493,15173],[494,145237],[495,35818],[523,211406],[524,184627],[526,18372],[527,320373],[528,163677],[529,21222],[530,120],[555,1167],[556,206428],[557,23526],[559,20554],[560,88294],[561,219236],[562,202406],[588,73438],[589,209870],[593,4],[594,179627],[595,24218],[620,172948],[621,158075],[626,26135],[627,229740],[650,7107],[651,177418],[652,71980],[657,44592],[658,214186],[659,191381],[681,69999],[682,224724],[683,124447],[689,47080],[690,94202],[691,10215],[711,12],[712,109419],[713,158993],[714,219269],[715,319],[743,8],[744,1074],[745,16994],[746,1329]]
          },
          {
            "id": "body",
            "label": "轻巧胸肋和脊椎",
            "box": [323,471,508,612],
            "file": "discovery/micro/bone-body.webp",
            "coverage": [[392,65017],[393,232406],[394,192788],[395,293970],[396,177225],[424,158044],[425,114545],[426,145090],[427,306887],[428,289750],[457,122053],[458,194149],[459,173307],[460,29801],[489,23424],[490,66355],[491,15507]]
          }
        ]
      },
      "excavationLayers": {
        "file": "art/discovery/micro/fragments.webp",
        "pieces": [[22,49,15,72,19],[43,35,38,83,18],[65,46,66,84,19],[65,68,88,77,19]]
      },
      "area": {
        "grid": 32,
        "total": 20420068,
        "weights": [[291,17140],[292,127466],[293,126330],[294,39474],[322,93638],[323,296624],[324,393459],[325,311745],[326,316135],[327,65371],[347,3],[348,15],[353,121389],[354,276138],[355,203333],[356,335104],[357,78725],[358,131278],[359,187578],[373,16],[374,27361],[375,104394],[376,144267],[377,138958],[378,129520],[379,111922],[380,93922],[381,62000],[382,17723],[385,76],[386,109395],[387,142527],[388,14079],[390,65517],[391,286996],[392,106715],[393,236189],[394,313483],[395,293970],[396,220565],[397,148441],[398,94157],[399,39747],[400,32365],[401,54604],[402,122689],[403,177294],[404,185980],[405,184168],[406,134624],[407,51390],[408,3047],[418,3497],[422,375],[423,175747],[424,323211],[425,340178],[426,300495],[427,306887],[428,343093],[429,367250],[430,383351],[431,317291],[432,258259],[433,197990],[434,114277],[435,26873],[436,2133],[454,246],[455,167904],[456,294736],[457,194859],[458,194149],[459,174296],[460,165080],[461,316046],[462,358977],[463,18633],[483,13029],[484,216366],[485,164881],[486,188150],[487,95184],[488,5955],[489,245603],[490,82793],[491,242836],[492,106980],[493,15173],[494,145237],[495,35818],[514,20626],[515,230522],[516,96065],[519,66480],[520,159340],[521,211540],[522,21181],[523,211406],[524,184627],[526,18372],[527,320373],[528,163677],[529,21222],[530,120],[546,63557],[547,112087],[548,37674],[549,14261],[550,178976],[551,230993],[552,26220],[555,1167],[556,206428],[557,23526],[559,20554],[560,88294],[561,219236],[562,202406],[579,19882],[580,1289],[581,170858],[582,184059],[583,1322],[588,73438],[589,209870],[593,4],[594,179627],[595,24218],[612,1779],[613,112050],[614,41175],[620,172948],[621,158075],[626,26135],[627,229740],[645,5037],[650,7107],[651,177418],[652,71980],[657,44592],[658,214186],[659,191381],[681,69999],[682,224724],[683,124447],[689,47080],[690,94202],[691,10215],[711,12],[712,109419],[713,158993],[714,219269],[715,319],[743,8],[744,1074],[745,16994],[746,1329]],
        "metric": "discovery-inflate-v1"
      }
    }
  };
  Object.values(discoveries).forEach(fossil=>{
    fossil.journey=fossils.trex.journey;
    fossils[fossil.id]=fossil;
    const entry=catalog.find(item=>item.id===fossil.id);
    if(!entry)throw new Error('Missing fossil catalog entry: '+fossil.id);
    entry.dig=true;
    entry.location=fossil.camp+' · 森林挑战';
  });
})();

;
(() => {
  'use strict';
  const {fossils}=window.FOSSILS;
  // Stone centers and their resting spots, as percentages of the registered rock.
  const positions={
    spino: [[78,47,87,77,20],[57,55,64,82,21],[39,36,39,78,19],[20,48,14,69,19]],
    pachy: [[47,63,40,83,21],[78,45,84,76,19],[48,42,63,81,20],[22,37,15,73,20]],
    therizino: [[20,54,17,79,21],[59,59,58,83,19],[48,35,38,86,20],[81,44,83,71,19]]
  };
  const surfaces={
    spino: [[.025,.48],[.12,.25],[.35,.13],[.73,.16],[.96,.31],[.99,.52],[.90,.66],[.74,.71],[.21,.71],[.045,.63]],
    pachy: [[.018,.45],[.09,.28],[.32,.14],[.65,.16],[.88,.27],[.98,.42],[.995,.51],[.91,.65],[.74,.73],[.19,.75],[.06,.62]],
    therizino: [[.018,.53],[.073,.22],[.105,.07],[.18,.052],[.37,.13],[.68,.22],[.87,.31],[.98,.42],[.99,.57],[.89,.68],[.70,.78],[.38,.81],[.11,.74]]
  };
  Object.entries(positions).forEach(([id,pieces])=>{
    const fossil=fossils[id];
    const dir=fossil.stages[0].slice(0,fossil.stages[0].lastIndexOf('/'));
    fossil.excavationLayers={file:dir+'/fragments.webp',pieces};
    fossil.art.interior=surfaces[id];
    fossil.art.sand={file:dir+'/buried.webp',full:true};
  });
})();

;
/* F7: every five first completions among levels 1–50 open the next fossil, in the order the child meets
   these dinosaurs. Reads the main game's completed list only and never writes it, so replaying a level
   cannot earn a fossil twice. The forest-route unlocks in fossil-store.js still apply alongside this. */
(() => {
  'use strict';
  const KEY = 'dino-math-island-completed-v4', LEVELS = 50, PER = 5;
  const ORDER = Object.freeze(['trike', 'stego', 'brachio', 'raptor', 'trex', 'anky', 'parasaur', 'allo', 'ptero', 'compso']);
  function done() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? new Set(raw.filter(n => Number.isInteger(n) && n >= 0 && n < LEVELS)).size : 0;
    } catch (_) { return 0; }
  }
  function status() {
    const count = done(), opened = Math.min(ORDER.length, Math.floor(count / PER));
    return { done: count, unlocked: ORDER.slice(0, opened), next: ORDER[opened] || null, left: opened < ORDER.length ? PER - count % PER : 0 };
  }
  window.DinoFossilUnlock = Object.freeze({ ORDER, PER, LEVELS, status, unlocked: id => status().unlocked.includes(id) });
})();

;
/* ST1: Xiaoyu the little bird tells one story across levels 1-50. A comet blew the museum's bones away; every five
   levels bring a skeleton home and light one star on the museum roof, while the comet comes closer. Ten stars make a
   dinosaur constellation, the comet passes by, and Xiaoyu tells her secret. Progress is read from the existing
   completed-level and fossil records; nothing new is saved. story-voice.py records the same text, and qa-story.mjs
   checks that the two match. Every picture here is static: no flying decorations. */
(() => {
  'use strict';
  const NAMES = { trike: '三角龙', stego: '剑龙', brachio: '腕龙', raptor: '迅猛龙', trex: '霸王龙', anky: '甲龙', parasaur: '副栉龙', allo: '异特龙', ptero: '翼龙', compso: '美颌龙' };
  const ORDER = Object.keys(NAMES), COUNT = ['', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'];
  const LINES = {
    'story-prologue.m4a': '你好，我是小羽！昨晚一颗拖着长尾巴的彗星飞过，刮起大风，博物馆的恐龙骨头全被吹跑啦。每闯过五关，我们就找回一副骨架，点亮一颗星星。出发吧！',
    'story-home-1.m4a': '三角龙的骨架回家啦！屋顶亮起了第一颗星星。下一副，我们去找剑龙。',
    'story-home-2.m4a': '剑龙回家啦，第二颗星星也亮了！咦，星星好像能连成什么呢。下一副，去找腕龙。',
    'story-home-3.m4a': '腕龙回家啦，三颗星星！小羽看见，彗星好像比昨天近了一点。下一副，去找迅猛龙。',
    'story-home-4.m4a': '迅猛龙回家啦，四颗星星！彗星又近了，恐龙伙伴有点紧张。别怕，我们继续找霸王龙。',
    'story-home-5.m4a': '霸王龙回家啦！五颗星星，星图亮了一半。下一副，去找甲龙。',
    'story-home-6.m4a': '甲龙回家啦，六颗星星！星星都亮了，就知道彗星要去哪儿啦。下一副，去找副栉龙。',
    'story-home-7.m4a': '副栉龙回家啦，七颗星星！彗星的尾巴越来越亮了。下一副，去找异特龙。',
    'story-home-8.m4a': '异特龙回家啦，八颗星星！快了快了，下一副，去找翼龙。',
    'story-home-9.m4a': '翼龙回家啦，九颗星星，只差最后一颗！最后一副，去找美颌龙。',
    'story-home-10.m4a': '美颌龙也回家啦！十颗星星全亮了，连成了一只恐龙！看，彗星从小岛上空轻轻飞过，撒下了好多星光。你真棒！',
    'story-secret.m4a': '告诉你一个秘密：我小羽，其实也是恐龙的后代哦。很久很久以前，有些恐龙长出了羽毛，慢慢变成了鸟。',
    'story-back-0.m4a': '欢迎回来，我是小羽！我们继续找三角龙的骨头吧。',
    'story-back-10.m4a': '欢迎回来！十颗星星都亮着呢，今天想去博物馆看看星图吗？',
    'story-waiting.m4a': '小羽找到的骨头还埋着呢！过完这一关，就能去挖啦。'
  };
  for (let n = 1; n < ORDER.length; n++) LINES['story-back-' + n + '.m4a'] = '欢迎回来！屋顶已经亮了' + COUNT[n] + '颗星星。今天，我们去找' + NAMES[ORDER[n]] + '吧！';
  const line = file => ({ file, text: LINES[file] });
  const owned = id => window.DinoFossilMark?.has(id) === true;
  // Stars follow the story order, so a skeleton from the forest route never lights a star out of turn.
  function stars(has = owned) { const found = ORDER.findIndex(id => !has(id)); return found < 0 ? ORDER.length : found; }
  // The line for the first tap of a visit.
  function opening() {
    const status = window.DinoFossilUnlock?.status();
    if (!status) return null;
    const lit = stars();
    if (status.done === 0 && lit === 0) return line('story-prologue.m4a');
    if (status.unlocked.some(id => !owned(id))) return line('story-waiting.m4a');
    return line('story-back-' + lit + '.m4a');
  }
  // The line after a skeleton found through the levels goes into the museum; the last one is followed by the secret.
  function home(id) {
    if (!ORDER.includes(id)) return null;
    const n = ORDER.indexOf(id) + 1;
    return { ...line('story-home-' + n + '.m4a'), then: n === ORDER.length ? line('story-secret.m4a') : null };
  }
  // Ten stars drawn as a long-necked dinosaur, joined once all are lit. The comet comes in from the top right, closer
  // with each star, and is drawn at the top left once it has passed over the island.
  const POINTS = [[6, 31], [18, 27], [31, 21], [44, 19], [57, 21], [66, 13], [74, 7], [82, 5], [55, 36], [35, 36]];
  const LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [4, 8], [2, 9]];
  function comet(x, y, size) {
    return '<g class="story-comet" transform="translate(' + x + ' ' + y + ') scale(' + size + ')"><path d="M0 -2.4 L17 -5.5 L17 5.5 L0 2.4 Z" fill="#ffe7a3" opacity=".8"/><circle r="3" fill="#fff6d8"/></g>';
  }
  function skyMap(lit, fresh = -1) {
    const done = lit >= ORDER.length, at = Math.min(lit, ORDER.length - 1) / (ORDER.length - 1);
    const where = done ? comet(5, 7, .7) : comet(104 - at * 12, 5 + at * 8, .5 + at * .5);
    const lines = done ? LINKS.map(([a, b]) => '<line x1="' + POINTS[a][0] + '" y1="' + POINTS[a][1] + '" x2="' + POINTS[b][0] + '" y2="' + POINTS[b][1] + '"/>').join('') : '';
    const dots = POINTS.map(([x, y], i) => '<circle class="story-star' + (i < lit ? ' lit' : '') + (i === fresh ? ' fresh' : '') + '" cx="' + x + '" cy="' + y + '" r="' + (i < lit ? 2.4 : 1.6) + '"/>').join('');
    return '<svg class="story-sky" viewBox="0 0 120 42" role="img" aria-label="屋顶的星图，亮了' + lit + '颗星星"><g class="story-links">' + lines + '</g>' + dots + where + '</svg>';
  }
  const cometMark = () => '<svg class="story-mark" viewBox="-4 -8 26 16" width="72" height="44" aria-hidden="true">' + comet(0, 0, 1) + '</svg>';
  window.DinoStory = Object.freeze({ NAMES, ORDER, LINES, opening, home, stars, skyMap, cometMark });
})();

;
/* F1 owns only this key. Journey and all formal-game records remain read-only here.
   F2: every fossil in fossils.json shares the same v1 record shape under dig.<id>. ?parent=1&fossil=<id> is a preview:
   it unlocks that fossil but only ever writes this tab's sessionStorage, never the permanent key. */
(() => {
  'use strict';
  const KEY='dino-math-island-fossils-v1', PKEY=KEY+':preview', CELLS=1024, MASK=window.FOSSIL_BONE_AREA, THRESHOLD=.7, DATA=window.FOSSILS.fossils;
  const query=new URLSearchParams(location.search), PREVIEW=query.get('parent')==='1'&&DATA[query.get('fossil')]?query.get('fossil'):null, ACTIVE=DATA[query.get('fossil')]?query.get('fossil'):'brachio';
  const STANDALONE=query.get('archaeology')==='1', AKEY='dino-math-archaeology-fossils-v1';
  const REPEAT_KEY=PREVIEW?PKEY+':repeat':STANDALONE?AKEY+':repeat':KEY, saved=PREVIEW?sessionStorage:localStorage, savedKey=PREVIEW?PKEY:STANDALONE?AKEY:KEY;
  const listeners=new Set();let memory=null,healthy=true,repeatMemory=null;
  const areas={},areaOf=id=>areas[id]||=id==='brachio'?MASK:(()=>{const weights=new Array(CELLS).fill(0);DATA[id].area.weights.forEach(([n,w])=>{weights[n]=w;});return{weights,total:DATA[id].area.total};})();
  const partsOf=id=>id==='brachio'?['head','neck','body','tail','legs']:DATA[id].art.parts.map(p=>p.id);
  const PARTS=partsOf(ACTIVE);
  const mode=DATA[ACTIVE].excavation;
  const answers=mode==='tide'?[0,1,2]:DATA[ACTIVE].fieldTool?.answers;
  // These four cells sit outside all layered fossil masks. They preserve which
  // stones moved in the same v1 record, without counting toward brush coverage.
  const STONES=Object.freeze([1020,1021,1022,1023]);
  const layered=Boolean(DATA[ACTIVE].excavationLayers);
  const coverage=(cells,id=ACTIVE)=>{const a=areaOf(id),unique=new Set(cells);return [...unique].reduce((n,i)=>n+(a.weights[i]||0),0)/a.total;};
  const metricOf=id=>id==='brachio'?'rock-v2':DATA[id].area.metric;
  const record=(id=ACTIVE)=>({step:'knock',hits:0,cleared:[],placed:[],brushMetric:metricOf(id)});
  const fresh=()=>({version:1,dig:{brachio:record('brachio'),[ACTIVE]:record()},museum:[]});
  // F7: levels 1-50 open fossils too (fossil-unlock.js); either that or the forest route is enough.
  const eligible=(id=ACTIVE)=>PREVIEW||STANDALONE||window.DinoFossilUnlock?.unlocked(id)===true?true:(DATA[id]?.journey?.routes?.length?DATA[id].journey.routes.every(route=>window.DinoJourneyStore?.routeDone(route)===true):Boolean(DATA[id]?.journey?.route)&&window.DinoJourneyStore?.routeDone(DATA[id].journey.route)===true);
  function phase(d,id=ACTIVE){
    if(d.hits<6)return 'knock';
    if(coverage(d.cleared,id)>=THRESHOLD)return d.placed.length<partsOf(id).length?'puzzle':'revive';
    return DATA[id].excavationLayers&&!STONES.every(cell=>d.cleared.includes(cell))?'rubble':'brush';
  }
  function normalizeOne(id,s){
    const x=record(id);if(!s)return x;
    x.hits=Number.isInteger(s.hits)&&s.hits>=0&&s.hits<=6?s.hits:0;
    if(x.hits===6)x.cleared=[...new Set(Array.isArray(s.cleared)?s.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<CELLS):[])].sort((a,b)=>a-b);
    const area=areaOf(id);
    if(id!=='brachio'&&DATA[id].legacyArea&&s.brushMetric!==metricOf(id)&&x.hits===6){
      const old=DATA[id].migrationAreas?.[s.brushMetric]||(s.brushMetric==='rock-alpha-r1'?DATA[id].alphaArea:s.brushMetric==='rock-f2r2'?DATA[id].previousArea:DATA[id].legacyArea),weights=Object.fromEntries(old.weights),ratio=x.cleared.reduce((n,i)=>n+(weights[i]||0),0)/old.total;
      x.cleared=[];let sum=0;
      area.weights.forEach((w,i)=>{if(w&&(ratio>=THRESHOLD||(sum+w)/area.total<=ratio)){x.cleared.push(i);sum+=w;}});
    }
    x.brushMetric=metricOf(id);
    // Same v1 record shape. Preserve verified coverage when switching fossil geometry.
    if(id==='brachio'&&['bone-v1','egg-v1','rock-v1'].includes(s.brushMetric)&&x.hits===6){
      const previous=s.brushMetric==='egg-v1'?MASK.legacyEgg:s.brushMetric==='rock-v1'?MASK.legacyRock:MASK.legacy;
      const ratio=x.cleared.reduce((n,i)=>n+(previous.weights[i]||0),0)/previous.total;
      const cells=MASK.weights.map((w,i)=>({w,i})).filter(c=>c.w>0);x.cleared=[];
      if(ratio>=THRESHOLD)x.cleared=cells.map(c=>c.i);
      else{let sum=0;for(const c of cells){if((sum+c.w)/MASK.total<=ratio){x.cleared.push(c.i);sum+=c.w;}}}
    }
    // R1/R2 completed brushing used >=871 whole-board cells. Preserve legitimate old progress.
    if(id==='brachio'&&!s.brushMetric&&x.hits===6&&x.cleared.length>=871&&['puzzle','revive','museum'].includes(s.step))x.cleared=[...new Set([...x.cleared,...MASK.weights.map((w,i)=>w?i:-1).filter(i=>i>=0)])].sort((a,b)=>a-b);
    if(coverage(x.cleared,id)>=THRESHOLD)x.placed=partsOf(id).filter(p=>Array.isArray(s.placed)&&s.placed.includes(p));
    x.step=phase(x,id);
    return x;
  }
  function normalize(raw){
    const d=fresh();if(raw?.version!==1)return d;
    const known=Object.keys(raw.dig||{}).filter(id=>DATA[id]);
    for(const id of ['brachio',ACTIVE])if(!known.includes(id))known.push(id);
    known.forEach(id=>{
      const x=normalizeOne(id,raw.dig?.[id]);
      // A string saying museum is not a reward. All three operation records are required.
      if(x.step==='revive'&&raw.dig?.[id]?.step==='museum'&&Array.isArray(raw.museum)&&raw.museum.includes(id)){x.step='museum';if(!d.museum.includes(id))d.museum.push(id);}
      d.dig[id]=x;
    });
    return d;
  }
  function merge(a,b){
    const dig={},ids=[...new Set([...Object.keys(a.dig),...Object.keys(b.dig)])],museum=[...new Set([...a.museum,...b.museum])];
    ids.forEach(id=>{const x=a.dig[id]||record(id),y=b.dig[id]||record(id);dig[id]={step:museum.includes(id)?'museum':'knock',brushMetric:metricOf(id),hits:Math.max(x.hits,y.hits),cleared:[...x.cleared,...y.cleared],placed:[...x.placed,...y.placed]};});
    return normalize({version:1,dig,museum});
  }
  function loadSaved(){
    try{const disk=normalize(JSON.parse(saved.getItem(savedKey)||'null'));memory=memory?merge(memory,disk):disk;}
    catch(_){healthy=false;memory||=fresh();}
    return structuredClone(memory);
  }
  // Repeated digs use the same record shape in this tab's sessionStorage.
  // Permanent completion/collection is never reset, merged with or written by a repeat.
  function repeatRecord(){
    if(!eligible()||!loadSaved().museum.includes(ACTIVE))return null;
    try{const raw=JSON.parse(sessionStorage.getItem(REPEAT_KEY)||'null');return raw?.version===1&&raw.dig?.[ACTIVE]?normalize({...raw,museum:[]}):null;}
    catch(_){healthy=false;return null;}
  }
  function resumeRepeat(){const d=repeatRecord();if(!d)return false;repeatMemory=d;return true;}
  function saveRepeat(d){
    const raw=JSON.parse(sessionStorage.getItem(REPEAT_KEY)||'null');
    const dig=raw?.version===1?{...raw.dig}:{};
    if(d)dig[ACTIVE]=d.dig[ACTIVE];else delete dig[ACTIVE];
    if(Object.keys(dig).length)sessionStorage.setItem(REPEAT_KEY,JSON.stringify({version:1,dig,museum:[]}));
    else sessionStorage.removeItem(REPEAT_KEY);
  }
  function startRepeat(){
    if(!eligible()||!loadSaved().museum.includes(ACTIVE))return false;
    const d=fresh();try{saveRepeat(d);repeatMemory=d;healthy=true;return true;}
    catch(_){healthy=false;listeners.forEach(fn=>fn());return false;}
  }
  function load(){
    const saved=loadSaved();
    if(repeatMemory&&(!eligible()||!saved.museum.includes(ACTIVE)))repeatMemory=null;
    return structuredClone(repeatMemory||saved);
  }
  function write(d){
    if(repeatMemory){
      repeatMemory=merge(repeatMemory,d);
      try{saveRepeat(repeatMemory);healthy=true;}catch(_){healthy=false;}
      listeners.forEach(fn=>fn());return healthy;
    }
    memory=merge(loadSaved(),d);
    try{saved.setItem(savedKey,JSON.stringify(memory));healthy=true;}catch(_){healthy=false;}
    listeners.forEach(fn=>fn());return healthy;
  }
  const mine=d=>d.dig[ACTIVE]||(d.dig[ACTIVE]=record());
  function hit(){if(answers||!eligible())return false;const d=load(),s=mine(d);if(s.step!=='knock')return false;s.hits++;s.step=phase(s);return write(d);}
  function brush(cells){
    if(!eligible())return false;
    const d=load(),s=mine(d);if(s.step!=='brush')return false;
    s.cleared=[...new Set([...s.cleared,...cells.filter(n=>Number.isInteger(n)&&n>=0&&n<CELLS&&(!layered||areaOf(ACTIVE).weights[n]>0))])];
    s.step=phase(s);return write(d);
  }
  function clearSection(stage,answer){
    if(!Number.isInteger(stage)||stage<0||stage>=3||!answers||answers[stage]!==answer||!eligible())return false;
    const d=load(),s=mine(d);
    if(s.step!=='knock'||s.hits!==stage*2)return false;
    s.hits+=2;
    if(s.hits===6&&!layered)s.cleared=DATA[ACTIVE].area.weights.map(([cell])=>cell);
    s.step=phase(s);
    return write(d);
  }
  const openGate=index=>mode==='tide'&&clearSection(index,index);
  function removeStone(index){
    if(!layered||!eligible()||!Number.isInteger(index)||index<0||index>=STONES.length)return false;
    const d=load(),s=mine(d),cell=STONES[index];
    if(s.step!=='rubble'||s.cleared.includes(cell))return false;
    s.cleared.push(cell);s.step=phase(s);return write(d);
  }
  function place(id){if(!eligible()||!PARTS.includes(id))return false;const d=load(),s=mine(d);if(s.step!=='puzzle'||s.placed.includes(id))return false;s.placed.push(id);s.step=phase(s);return write(d);}
  function claim(){
    if(!eligible())return false;const d=load(),s=mine(d);
    if(!['revive','museum'].includes(s.step)||s.hits!==6||coverage(s.cleared)<THRESHOLD||s.placed.length!==PARTS.length)return false;
    if(repeatMemory){
      try{saveRepeat(null);repeatMemory=null;healthy=true;return true;}
      catch(_){healthy=false;listeners.forEach(fn=>fn());return false;}
    }
    s.step='museum';if(!d.museum.includes(ACTIVE))d.museum.push(ACTIVE);return write(d);
  }
  const notify=()=>{load();listeners.forEach(fn=>fn());};
  addEventListener('storage',e=>{if(e.key===savedKey||e.key===null)notify();});
  // owned(id) is read-only: the codex uses it for the gold "化石已挖到" mark.
  const owned=id=>loadSaved().museum.includes(id);
  window.DinoFossils=Object.freeze({KEY,PARTS:Object.freeze(PARTS),CELLS,THRESHOLD,STONES,ACTIVE,PREVIEW,STANDALONE,coverage,eligible,load,hit,brush,openGate,clearSection,removeStone,place,claim,owned,startRepeat,resumeRepeat,hasRepeat:()=>!!repeatRecord(),isRepeating:()=>!!repeatMemory,storageOK:()=>healthy,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
})();

;
/* One-shot local particles: every chip settles; nothing loops behind the game. */
(()=>{window.createFossilEffects=(board,layer,reduced,topPolygon)=>{
 const stats={chips:0,brushBursts:0,snaps:0,flashes:[]},animations=new Set();let lastDust=0,brush,dustLayer,lastDustPoint=null;
 const onTop=p=>{let inside=false;for(let i=0,j=topPolygon.length-1;i<topPolygon.length;j=i++){const [xi,yi]=topPolygon[i],[xj,yj]=topPolygon[j];if((yi>p.y)!==(yj>p.y)&&p.x<(xj-xi)*(p.y-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
 function perimeter(p,dir){let best=Infinity,result=p;for(let i=0;i<topPolygon.length;i++){const a=topPolygon[i],b=topPolygon[(i+1)%topPolygon.length],sx=b[0]-a[0],sy=b[1]-a[1],cross=dir.x*sy-dir.y*sx;if(Math.abs(cross)<.00001)continue;const px=a[0]-p.x,py=a[1]-p.y,t=(px*sy-py*sx)/cross,u=(px*dir.y-py*dir.x)/cross;if(t>=0&&u>=0&&u<=1&&t<best){best=t;result={x:p.x+t*dir.x,y:p.y+t*dir.y};}}return result;}
 function atmosphere(){if(!dustLayer){dustLayer=document.createElement("div");dustLayer.className="sand-atmosphere";const cx=topPolygon.reduce((s,p)=>s+p[0],0)/topPolygon.length,cy=topPolygon.reduce((s,p)=>s+p[1],0)/topPolygon.length;dustLayer.style.clipPath="polygon("+topPolygon.map(([x,y])=>`${(cx+(x-cx)*1.15)*100}% ${(cy+(y-cy)*1.15-.025)*100}%`).join(",")+")";layer.append(dustLayer);}return dustLayer;}
 const animate=(el,frames,options,done)=>{const a=el.animate(frames,options);animations.add(a);a.onfinish=()=>{animations.delete(a);done?.();};return a;};
 function impact(p,hits){if(reduced.matches)return;dust(p,{x:.2,y:0},false);}
 function dust(p,dir={x:0,y:0},isBrush=true){
  if(reduced.matches||!onTop(p))return;const now=performance.now(),r=board.getBoundingClientRect();if(isBrush&&(now-lastDust<105||(lastDustPoint&&Math.hypot(p.x-lastDustPoint.x,p.y-lastDustPoint.y)*r.width<9)))return;lastDust=now;lastDustPoint=p;if(isBrush)stats.brushBursts++;
  const norm=Math.hypot(dir.x,dir.y)||1,dx=dir.x/norm,dy=dir.y/norm,holder=atmosphere(),colors=['#b99a6c','#cdb184','#9e784d','#ddc49a','#af885b'];
  for(let i=0;i<3;i++){const el=document.createElement('i'),size=2.5+Math.random()*4.5,angle=Math.random()*360,spin=(Math.random()-.5)*150;el.className='sand-grain';el.style.cssText=`left:${p.x*100}%;top:${p.y*100}%;width:${size}px;height:${size*(.45+Math.random()*.5)}px;background:${colors[Math.floor(Math.random()*colors.length)]};clip-path:polygon(8% 22%,${48+Math.random()*20}% 0,100% 37%,80% 89%,35% 100%,0 60%)`;holder.append(el);const end=perimeter(p,{x:dx+(Math.random()-.5)*.9,y:dy+.3+Math.random()*.4}),ex=(end.x-p.x)*r.width,ey=(end.y-p.y)*r.height,apexX=dx*(12+Math.random()*18)+(Math.random()-.5)*16,apexY=-10-Math.random()*18;animate(el,[{transform:`rotate(${angle}deg)`,opacity:.75},{transform:`translate(${apexX}px,${apexY}px) rotate(${angle+spin}deg)`,opacity:.8,offset:.35},{transform:`translate(${ex}px,${ey}px) rotate(${angle+spin*2}deg)`,opacity:.7}],{duration:740+Math.random()*230,easing:'ease-out'},()=>{el.style.transform=`translate(${ex}px,${ey}px) rotate(${angle+spin*2}deg)`;el.classList.add('settled');});}
  const cloud=document.createElement('i');cloud.className='brush-dust';cloud.style.cssText=`left:${p.x*100}%;top:${p.y*100}%;width:${31+Math.random()*13}px;height:${18+Math.random()*12}px;border-radius:41% 57% 35% 62%;`;holder.append(cloud);animate(cloud,[{transform:'translate(-50%,-45%) scale(.6)',opacity:0},{transform:`translate(calc(-50% + ${dx*9}px),calc(-45% - 8px)) scale(1)`,opacity:.5,offset:.3},{transform:`translate(calc(-50% + ${dx*18}px),calc(-45% - 15px)) scale(1.5)`,opacity:0}],{duration:790,easing:'ease-out'},()=>cloud.remove());
  const grains=holder.querySelectorAll('.sand-grain.settled');[...grains].slice(0,Math.max(0,grains.length-36)).forEach(e=>e.remove());
 }
 function cursor(p,from){if(!onTop(p)){hideBrush();return;}if(!brush){brush=document.createElement('span');brush.id='brushCursor';brush.innerHTML='<svg viewBox="0 0 70 80"><path d="M31 10 Q35 3 40 10 L42 47 H29Z" fill="#976136" stroke="#51381e" stroke-width="2"/><path d="M24 42 H47 L50 55 H21Z" fill="#879498" stroke="#4a5959" stroke-width="2"/><path d="M21 54 H50 L57 73 Q37 78 15 72Z" fill="#e7c58b" stroke="#8b663a" stroke-width="2"/><path d="m25 56-4 16m10-16-2 18m9-18v19m7-19 4 17" stroke="#ae8553" stroke-width="2"/></svg>';layer.append(brush);}brush.hidden=false;brush.style.left=p.x*100+'%';brush.style.top=p.y*100+'%';const dx=p.x-(from?.x??p.x);brush.style.transform=`translate(-45%,-82%) rotate(${Math.max(-38,Math.min(38,dx*900))}deg)`;if(from)dust(p,{x:p.x-from.x,y:p.y-from.y});}
 function hideBrush(){if(brush)brush.hidden=true;lastDustPoint=null;}
 function snap(el,p){stats.snaps++;if(reduced.matches)return;el?.animate([{transform:'scale(1)'},{transform:'scale(1.08)',offset:.45},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});dust(p,{x:0,y:1},false);}
 function reset(){animations.forEach(a=>a.cancel());animations.clear();layer.querySelectorAll('.sand-grain,.brush-dust').forEach(e=>e.remove());hideBrush();}
 return{onTop,impact,dust,cursor,hideBrush,snap,reset,stats};};})();

;
/* Existing local foley, existing gallery cue, and synthesized UI feedback. */
(() => {
  const base=new URL('../../assets/sfx/',document.currentScript.src);
  window.createFossilAudio=(voiceInfo)=>{
    // voiceInfo = fossils.json voice {file,start,end}; the first cue of the fossil's own gallery recording. Default keeps the brachiosaur.
    const cueOf=()=>voiceInfo?{time:voiceInfo.start,end:voiceInfo.end,text:voiceInfo.text}:window.DINO_VOICE_CUES['gallery-brachio.m4a'][0],voiceFile=voiceInfo?.file||'gallery-brachio.m4a';
    let context,enabled=true,lastBrush=0,narrating=false,voiceNode=null,voiceResolve=null,voiceStarted=0,voicePromise=null,lastVoice=null,voiceEpoch=0;
    const voices=new Set(),nodes=new Set(),island=window.createIslandAudio({assetBase:base.href});
    const speechActive=()=>narrating||window.speechSynthesis?.speaking||[...document.querySelectorAll('audio')].some(a=>!a.paused&&/\/voice\//.test(a.currentSrc||a.src));
    function stopFX(){island.reset();nodes.forEach(n=>{try{n.stop();}catch(_){}});nodes.clear();}
    function stopVoice(reason='cancelled'){if(!voiceNode)return;const n=voiceNode;voiceNode=null;n.onended=null;try{n.stop();}catch(_){}lastVoice={...lastVoice,completed:false,reason,playedMs:(context.currentTime-voiceStarted)*1000,end:performance.now()};narrating=false;island.setNarrating(false);voiceResolve?.(lastVoice);voiceResolve=null;}
    function stop(){voiceEpoch++;stopFX();stopVoice();}
    function ensureContext(){if(!context){const C=window.AudioContext||window.webkitAudioContext;if(C)context=new C();}return context;}
    function prepareVoice() {
      if (voiceInfo?.silent) return Promise.resolve(null);
      if (!voicePromise) {
        voicePromise = (async () => {
          const c = ensureContext();
          if (!c) return null;
          const response = await fetch(new URL('../voice/' + voiceFile, base));
          if (!response.ok) throw Error('voice unavailable');
          return c.decodeAudioData(await response.arrayBuffer());
        })().catch(() => {
          // A failed preload must be retried when the child reaches the reveal.
          voicePromise = null;
          return null;
        });
      }
      return voicePromise;
    }
    async function narrate(onStart){const epoch=++voiceEpoch,buffer=await prepareVoice();if(epoch!==voiceEpoch)return {completed:false,reason:"cancelled",playedMs:0};if(!buffer||!enabled||document.hidden){lastVoice={completed:false,reason:!enabled?'muted':'unavailable',playedMs:0};return lastVoice;}stopFX();stopVoice();await context.resume();if(epoch!==voiceEpoch)return {completed:false,reason:'cancelled',playedMs:0};const cue=cueOf(),duration=cue.end-cue.time;voiceNode=context.createBufferSource();voiceNode.buffer=buffer;voiceNode.connect(context.destination);voiceStarted=context.currentTime;narrating=true;island.setNarrating(true);lastVoice={start:performance.now(),offset:cue.time,endOffset:cue.end,durationMs:duration*1000,completed:false};return new Promise(resolve=>{voiceResolve=resolve;voiceNode.onended=()=>{voiceNode=null;narrating=false;island.setNarrating(false);lastVoice={...lastVoice,end:performance.now(),playedMs:duration*1000,completed:true,reason:'cue-ended'};voiceResolve=null;resolve(lastVoice);};voiceNode.start(voiceStarted,cue.time,duration);onStart?.(cue);});}
    function allowed(){return enabled&&!document.hidden&&!speechActive();}
    function unlock(){island.unlock();ensureContext();if(enabled&&!document.hidden)context?.resume().catch(()=>{});}
    function file(name){if(!allowed())return;island.setNarrating(false);island.foley(name);}
    function synth(kind){if(!allowed())return;unlock();if(!context)return;const now=context.currentTime,g=context.createGain();g.connect(context.destination);
      const duration=kind==='knock'?.09:kind==='snap'?.07:.55;
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(kind==='glow'?.075:.12,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
      let n;if(kind==='knock'){const b=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),v=b.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=(Math.random()*2-1)*(1-i/v.length);n=context.createBufferSource();n.buffer=b;const f=context.createBiquadFilter();f.type='lowpass';f.frequency.value=700;n.connect(f);f.connect(g);}else{n=context.createOscillator();n.type='sine';n.frequency.setValueAtTime(kind==='snap'?460:880,now);n.frequency.exponentialRampToValueAtTime(kind==='snap'?180:1320,now+duration);n.connect(g);}nodes.add(n);n.onended=()=>{nodes.delete(n);g.disconnect();};n.start(now);n.stop(now+duration);
    }
    // Same-page speech always wins, including a voice that begins during a sound.
    document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement&&/\/voice\//.test(e.target.currentSrc||e.target.src)){voices.add(e.target);stop();}},true);
    ['pause','ended','error'].forEach(t=>document.addEventListener(t,e=>voices.delete(e.target),true));
    const guard=setInterval(()=>{if(document.hidden||voices.size||window.speechSynthesis?.speaking)stop();else if(narrating)stopFX();},60);
    addEventListener('pagehide',()=>{stop();context?.suspend();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    return {unlock,stop,synth,prepareVoice,narrate,setNarrating(v){narrating=!!v;island.setNarrating(v);if(v)stop();},setEnabled(v){enabled=!!v;island.setEnabled(v);if(!enabled)stop();},get enabled(){return enabled;},rustle(){if(performance.now()-lastBrush>900){lastBrush=performance.now();file('leaf-rustle',.18);}},revive(){file(voiceInfo?.file==='gallery-raptor.m4a'?'call-small':voiceInfo?.file==='gallery-trex.m4a'?'call-theropod':'call-sauropod',.42);},step(){file('footstep-grass',.18);},status(){return {enabled,narrating,lastVoice,speaking:!!speechActive(),active:[...document.querySelectorAll('#soundscape audio')].filter(a=>!a.paused).length,synthActive:nodes.size};}};
  };
})();

;
(() => {
  'use strict';
  window.createFossilFieldTool=({tool,root,board,activeStage,attempt,status,audio,rockSprite})=>{
    const {variant}=tool;
    let rendered=-1,timers=[],frame=0;
    const control=(label,run)=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=label;
      if(run)button.onclick=()=>{if(activeStage()===rendered)run(button);};
      return button;
    };
    const element=(tag,className)=>{
      const el=document.createElement(tag);el.className=className;return el;
    };
    const pos=(el,x,y)=>{el.style.setProperty('--x',x+'%');el.style.setProperty('--y',y+'%');};
    const stop=()=>{timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(frame);frame=0;};
    const solve=button=>attempt(rendered,tool.answers[rendered],button);
    const bottom=()=>{
      const group=element('div','site-tool-controls');root.append(group);return group;
    };
    function rope(stage){
      const [x,y,dx,dy,direction]=tool.rounds[stage],length=Math.hypot(dx-x,dy-y);
      const line=element('div','rope-line');
      pos(line,x,y);line.style.setProperty('--length',length+'%');
      line.style.setProperty('--angle',Math.atan2(dy-y,dx-x)+'rad');
      const target=element('span','rope-target');target.textContent='➜';
      pos(target,dx,dy);target.style.setProperty('--angle',Math.atan2(dy-y,dx-x)+'rad');
      target.setAttribute('aria-hidden','true');
      const grip=control('绳环');
      grip.className='site-point rope-grip';pos(grip,x,y);
      grip.setAttribute('aria-label',direction+'拉绳环');
      let pull=null,turns=0;
      grip.onpointerdown=e=>{
        if(activeStage()!==stage||pull||e.button!==0)return;
        grip.setPointerCapture(e.pointerId);
        pull={pointer:e.pointerId,x:e.clientX,y:e.clientY,done:false};
      };
      grip.onpointermove=e=>{
        if(pull?.pointer!==e.pointerId||activeStage()!==stage||pull.done)return;
        const width=board.getBoundingClientRect().width,px=(e.clientX-pull.x)*100/width,py=(e.clientY-pull.y)*100/width;
        const travel=(px*(dx-x)+py*(dy-y))/length,cross=Math.abs(px*(dy-y)-py*(dx-x))/length;
        const amount=Math.min(length,Math.max(0,travel))/length;
        pos(grip,x+(dx-x)*amount,y+(dy-y)*amount);
        if(travel>=length*.73&&cross<13){pull.done=true;solve(grip);}
      };
      function release(e){
        if(pull?.pointer!==e.pointerId)return;
        if(!pull.done&&activeStage()===stage)status('沿虚线把绳环拉到箭头附近。');
        pull=null;pos(grip,x,y);
      }
      grip.onpointerup=release;grip.onpointercancel=release;grip.onlostpointercapture=release;
      const crank=control('分步收绳',button=>{
        if(++turns>=3){turns=0;solve(button);return;}
        status(`绳索已收紧 ${turns} / 3`);
        pos(grip,x+(dx-x)*turns/3,y+(dy-y)*turns/3);
      });
      root.append(line,target,grip);bottom().append(crank);
    }
    function rhythm(stage){
      const pattern=tool.rounds[stage],names=['圆石','方石','三角石','菱石'];
      const symbols=['●','■','▲','◆'];
      let played=0,watching=false,heard=false;
      const pins=tool.points.map(([x,y],i)=>{
        const pin=control(symbols[i],button=>{
          if(watching||!heard){status('先看完这一轮敲击。');return;}
          if(pattern[played]!==i){played=0;status('顺序不同。再看一遍，再从第一下开始。');return;}
          audio.synth('knock');
          if(++played===pattern.length){played=0;solve(button);}
          else status(`已经敲对 ${played} / ${pattern.length} 下`);
        });
        pin.className='site-point rhythm-point';
        pin.dataset.tone=i;pin.setAttribute('aria-label','敲'+names[i]);pos(pin,x,y);root.append(pin);
        return pin;
      });
      const replay=control('看敲击顺序',()=>{
        if(watching)return;
        watching=true;played=0;
        pattern.forEach((i,n)=>{
          timers.push(setTimeout(()=>{
            pins.forEach(pin=>pin.classList.remove('lit'));
            pins[i].classList.add('lit');audio.synth('knock');status(`第 ${n+1} 下 · ${names[i]}`);
          },n*425));
        });
        timers.push(setTimeout(()=>{
          watching=false;heard=true;pins.forEach(pin=>pin.classList.remove('lit'));
          status('轮到你了，按刚才的顺序敲。');
        },pattern.length*425));
      });
      bottom().append(replay);
      // Playback starts on request so a child can look at the whole board first.
    }
    function brace(stage){
      const lengths=[48,71,94],labels=['短撑杆','中撑杆','长撑杆'],answer=tool.answers[stage];
      const slot=element('div','brace-slot');
      pos(slot,...tool.points[stage]);slot.style.setProperty('--span',lengths[answer]+'px');
      slot.setAttribute('role','img');slot.setAttribute('aria-label',labels[answer].slice(0,1)+'裂缝');
      root.append(slot);
      const group=bottom();
      labels.forEach((name,i)=>{
        const button=control(name,el=>{
          if(i!==answer){status(i<answer?'撑杆还够不到裂缝两头。':'撑杆太长，放不进裂缝。');return;}
          solve(el);
        });
        button.className='brace-choice';button.style.setProperty('--span',lengths[i]+'px');group.append(button);
      });
    }
    function lever(stage){
      const answer=tool.answers[stage],y=tool.rounds[stage];
      const beam=element('div','lever-beam');pos(beam,50,y);root.append(beam);
      const block=element('span','lever-block');
      block.style.setProperty('--rock',`url("${rockSprite}")`);pos(block,answer===0?21:79,y-9);
      block.setAttribute('role','img');block.setAttribute('aria-label',answer===0?'左边的重石':'右边的重石');root.append(block);
      [29,50,71].forEach((x,i)=>{
        const button=control('▲',el=>{
          if(i!==answer){status('这里离重石太远。把支点往重石那边挪。');return;}
          solve(el);
        });
        button.className='site-point lever-point';pos(button,x,y+10);
        button.setAttribute('aria-label',['左边的支点','中间的支点','右边的支点'][i]);root.append(button);
      });
    }
    function inflate(stage){
      const [x,y,duration]=tool.rounds[stage],meter=element('progress','bag-meter');
      meter.max=1;meter.value=0;meter.setAttribute('aria-label','气囊充气进度');
      const bag=element('div','lift-bag');pos(bag,x,y);
      const button=control('按住充气');button.className='bag-pump';
      let started=0,holding=false;
      function end(showHint){
        if(!holding)return;
        holding=false;cancelAnimationFrame(frame);frame=0;
        meter.value=0;bag.style.setProperty('--fill',0);
        if(showHint&&activeStage()===stage)status('气还没充满，再按住一会儿。');
      }
      function tick(time){
        if(activeStage()!==stage){end(false);return;}
        const progress=Math.max(0,Math.min(1,(time-started)/duration));
        meter.value=progress;bag.style.setProperty('--fill',progress);
        if(progress<1){frame=requestAnimationFrame(tick);return;}
        end(false);solve(button);
      }
      function start(){
        if(holding||activeStage()!==stage)return;
        holding=true;started=performance.now();frame=requestAnimationFrame(tick);
      }
      button.onpointerdown=e=>{if(e.button===0){button.setPointerCapture(e.pointerId);start();}};
      button.onpointerup=()=>end(true);
      button.onpointercancel=button.onlostpointercapture=()=>end(false);
      button.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)start();}};
      button.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();end(true);}};
      button.onblur=()=>end(false);
      root.append(bag);
      bottom().append(meter,button);
    }
    const tools={rope,rhythm,brace,lever,inflate};
    return {
      render(stage){if(stage===rendered)return;stop();rendered=stage;root.replaceChildren();tools[variant](stage);},
      reset(){stop();rendered=-1;root.replaceChildren();}
    };
  };
})();

;
(() => {
  'use strict';
  const $=s=>document.querySelector(s),store=window.DinoFossils,ID=store.ACTIVE,F=window.FOSSILS.fossils[ID],layered=F.excavationLayers,V=layered?'?v=20261110-f11-r3':'?v=20261031-trex-r1',art=F.art,natural=art.mode==='natural',cut=art.mode==='cut'||natural,audio=window.createFossilAudio(F.voice);
  const query=new URLSearchParams(location.search),fromGame=query.get('from')==='game',unlock=window.DinoFossilUnlock,byLevels=unlock?.ORDER.includes(ID),tide=F.excavation==='tide',tool=F.fieldTool,echo=F.excavation==='echo';
  let view=query.get('view')==='museum'?'museum':'dig';
  if(tide||tool)document.title=F.camp+' · '+F.name+'挖掘';
  const baseQuery=(store.PREVIEW?'parent=1&':store.STANDALONE?'archaeology=1&':'')+(fromGame?'from=game&':'')+(ID!=='brachio'||store.PREVIEW||store.STANDALONE||fromGame?'fossil='+ID+'&':''),route=F.journey;
  // Opened from a finish card: both ways out lead back to the levels.
  if(fromGame&&!store.STANDALONE){$('#back').href='../../index.html';$('#back').textContent='← 回到闯关';const home=$('#museum a[href*="island-journey"]');home.href='../../index.html';home.textContent='继续闯关 →';}
  if(store.STANDALONE){$('#back').href='./archaeology.html';$('#back').textContent='← 考古营地';const home=$('#museum a[href*="island-journey"]');home.href='./archaeology.html';home.textContent='返回考古营地 →';}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),board=$('#rockStage'),canvas=$('#sand'),ctx=canvas.getContext('2d');
  const effects=window.createFossilEffects(board,$('#effects'),reduced,art.interior.map(([x,y])=>[art.geometry.x+x*art.geometry.scale,art.geometry.y+y*art.geometry.scale])),stageImages=F.stages.map(()=>new Image()),flashed=new Set();
  const stageIndex=hits=>hits===0?0:hits<3?1:hits<5?2:3;
  const readyStages=new Set();
  if(view!=='museum')store.resumeRepeat();
  let initialStage=0,assetsLoading=false,replayAfterLoad=false;
  let shellFrame=0,sandFrame=0,strokeCounted=false;
  const readyParts=new Set(art.parts.map(p=>p.id)),landings=[],dragStarts=[],dismissedDemos=new Set();
  const g=art.geometry,timers=new Set(),transitions=[],partImages=new Map();
  let current,drag=null,selected=null,brushPointer=null,lastPoint=null,pending=new Set(),flushTimer=0,replaying=false,awake=false,busy=false,sandBase=null,brushStrokes=0,knockReady=false,assetsStarted=false,assetsReady=false,waitingAssets=false,transition=null;
  let revivalImageReady=false, revivalAssetsFailed=false;
  const revivalReady=()=>assetsReady&&revivalImageReady;
  function updateRevivalButtons(){
    const ready=revivalReady();
    const waiting=revivalAssetsFailed?'复活图片未加载，请刷新':'正在准备复活图片…';
    $('#replay').disabled=assetsLoading&&!ready;
    $('#replay').textContent=ready||!assetsLoading?'再看一遍复活':waiting;
    $('#wake').disabled=!F.restorationOnly&&!ready;
    $('#wake').textContent=F.restorationOnly?'查看修复成果':ready?'看'+F.name+'复活':waiting;
  }
  function playRequestedReplay(){
    if(revivalReady()&&replayAfterLoad){
      replayAfterLoad=false;
      if(view==='museum'&&!document.hidden)revive(true);
    }
  }
  const geometry=part=>{const[x,y,r,b]=part.box,[W,H]=art.skeletonSize;return{x:g.x+x/W*g.scale,y:g.y+y/H*g.scale,w:(r-x)/W*g.scale,h:(b-y)/H*g.scale};};
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
  function status(text){$('#status').textContent=text;}
  function warning(){$('#storageWarning').hidden=store.storageOK();}
  function read(){current=store.load().dig[ID];return current;}
  function header(title,text,kicker){$('#title').textContent=title;$('#instruction').textContent=text;$('#eyebrow').textContent=kicker||F.eyebrow;}
  const phaseLabels=layered?{knock:tide?'引水破岩':tool.action,rubble:'移碎石',brush:'刷沙土',puzzle:'拼骨架'}:
    {knock:tide?'引水':tool?tool.action:'敲',brush:tide?'冲沙':tool?'露骨':'刷',puzzle:tide||tool?'拼骨':'拼'};
  const stepOrder=Object.keys(phaseLabels);
  function steps(active,completed=stepOrder.indexOf(active)){
    document.querySelectorAll('[data-step]').forEach(el=>{
      const key=el.dataset.step,i=stepOrder.indexOf(key);
      el.hidden=i<0;if(i<0)return;
      const done=i<completed;
      el.classList.toggle('active',key===active);
      el.classList.toggle('done',done);
      el.textContent=(done?'✓':i+1)+' '+phaseLabels[key];
    });
  }
  function cancelSequence(){art.parts.forEach(p=>readyParts.add(p.id));timers.forEach(clearTimeout);timers.clear();if(transition){transition.cancelled=!transition.finishing;transition.end=performance.now();transition.duration=transition.end-transition.start;transition=null;}busy=false;[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));$('#floatingSkeleton').hidden=true;$('#demoHand').hidden=true;effects.hideBrush();$('#effects').querySelectorAll('.knock-impact').forEach(e=>e.remove());$('#boneHighlights').replaceChildren();document.querySelectorAll('.flight-bone').forEach(e=>e.remove());}
  function hideAll(){$('#egg').getAnimations().forEach(a=>a.cancel());['locked','workspace','knowledge','museum','wake','egg','sand','grooves','targets','tray','reveal','demoHand','skipRevival','floatingSkeleton','speechBubble'].forEach(id=>$('#'+id).hidden=true);if(tide)$('#tideDig').hidden=true;if(tool)$('#fieldDig').hidden=true;if(layered)$('#rubble').hidden=true;document.body.classList.remove('museum-mode','reveal-mode','hero-mode');board.classList.remove('shake','revival-stage','rock-retreated');$('#eggSurface').classList.remove('top-away');canvas.classList.remove('sand-away');$('#eggContents').classList.remove('fossil-glow');$('#living').classList.remove('walk-out');$('#slab').hidden=true;$('#knowledge').classList.remove('pending','card-in');}
  function render(){
    // Damage images own their rubble. Keep the final slab out of their transparent margins.
    read();hideAll();warning();if(natural&&assetsStarted)$('#cleanFace').src='./'+(['knock','rubble','brush'].includes(current.step)?art.face.file:art.bowl)+V;$('#eggContents').hidden=current.step==='knock';board.dataset.phase=current.step;$('#campLabel').textContent=F.camp?(store.load().museum.length?F.camp+' · '+F.name:F.camp+' · 化石挖掘'):'化石挖掘 · '+F.name;$('.steps').hidden=false;status('');
    steps(current.step,['revive','museum'].includes(current.step)?stepOrder.length:undefined);
    if(view==='museum'){museum();return;}
    if(!store.eligible()&&byLevels){const left=unlock.ORDER.indexOf(ID)*unlock.PER+unlock.PER-unlock.status().done;header('一块化石在等你','在闯关里再过 '+left+' 关，就能来挖');$('#lockedImg').src='./'+F.stages[0]+V;$('#locked p').textContent='每闯过 5 关，就能挖出一块化石。';const link=$('#locked a');link.textContent='去闯关';link.href='../../index.html';$('#locked').hidden=false;$('.steps').hidden=true;return;}
    if(!store.eligible()){header('一块化石在等你',route?'先完成'+route.name+'的'+(route.routes?'六关':'三关'):'这个地点还未开放');$('#lockedImg').src='./'+F.stages[0]+V;$('#locked p').textContent=route?'完成'+route.name+'的 '+(route.routes?6:3)+' 关就能来挖':'这块化石的探险地点还未开放。';const link=$('#locked a');link.textContent=route?'去'+route.name:'返回地图';link.href=route?'../'+route.sample+'/?journey='+route.route+'&level='+route.firstLevel+'&v=20261113-f12-r1':'../island-journey.html?v=20261113-f12-r1';$('#locked').hidden=false;$('.steps').hidden=true;return;}
    if(current.step==='museum'){view='museum';museum();return;}
    prepareExcavation();
    if(!knockReady){status('正在准备挖掘现场…');return;}$('#workspace').hidden=false;
    if(layered&&['rubble','brush','puzzle'].includes(current.step))paintRubble();
    if(current.step==='rubble'){header('把碎石搬到岩边','点一下碎石，移开压在沙土上的石块');canvas.hidden=false;paintSand();rubbleStatus();return;}
    if(current.step==='knock'&&(tide||tool)){if(tide)renderTide();else renderField();return;}
    if(current.step==='knock'){header(cut?'敲松表面的岩土':'敲开化石岩石',cut?'轻轻敲 6 下，找出岩石里埋着的化石':'轻轻敲 6 下，看看缺口里藏着什么');$('#egg').hidden=false;$('#egg').disabled=false;$('#slab').hidden=false;canvas.hidden=false;paintSand();paintShell();status(`已经敲了 ${current.hits} / 6 下`);}
    else if(current.step==='brush'){header('刷掉石板上的沙土',layered?'沿着露出来的骨头来回刷，刷掉各处的沙土':'沿着凸起的骨头刷，刷开 70% 就完成');$('#slab').hidden=false;canvas.hidden=false;paintSand();syncFlashes();status(`骨头已刷开 ${Math.floor(store.coverage(current.cleared)*100)}% / 70%`);}
    else if(current.step==='puzzle'){header('在石板上拼骨架','拖动下面的骨头，放回相同的凹槽');$('#grooves').hidden=false;$('#targets').hidden=false;$('#tray').hidden=false;renderPuzzle();status(`已经拼好 ${current.placed.length} / ${art.parts.length} 块`);}
    else if(current.step==='revive'){header('骨架拼好啦',F.reviveLine);if(natural)$('#cleanFace').src='./'+art.face.file+V;$('#slab').hidden=false;$('#wake').hidden=false;updateRevivalButtons();}
  }
  function interior(c,size){c.beginPath();art.interior.forEach(([x,y],i)=>i?c.lineTo(x*size,y*size):c.moveTo(x*size,y*size));c.closePath();}
  const gates=[...document.querySelectorAll('[data-gate]')];
  function paintTide(n,flow=false){
    const field=$('#tideDig');field.hidden=false;
    $('#tideRock').src=stageImages[n].src;
    field.classList.toggle('flowing',flow&&!reduced.matches);
    field.querySelectorAll('.tide-water').forEach((path,i)=>{
      path.classList.toggle('wet',i<=n);
      path.classList.toggle('fresh',flow&&i===n);
    });
    gates.forEach((gate,i)=>{
      gate.setAttribute('aria-disabled',String(i<n||busy));
      gate.classList.toggle('open',i<n);
    });
    status(`已经冲开 ${n} / 3 段`);
  }
  function renderTide(){
    const n=current.hits/2;
    header(layered?'引水松动岩层':'引水冲开泥沙','从泉眼出发，顺着水流打开挡水板');
    steps(layered?'knock':n?'brush':'knock',!layered&&n?1:0);
    paintTide(n);
  }
  gates.forEach((gate,index)=>{gate.onclick=()=>{
    if(!tide||busy||!knockReady||!store.eligible()||read().step!=='knock')return;
    const n=current.hits/2;
    if(index<n)return;
    if(index!==n){
      status(n?'看看水流停在哪块挡水板前。':'先找一找冒水的泉眼。');
      return;
    }
    if(!readyStages.has(n+1)||(n===2&&!assetsReady)){
      waitingAssets=true;
      status('正在准备下一段，等一下再点。');
      return;
    }
    audio.unlock();
    store.openGate(index);
    if(read().hits!==2*(n+1)){render();return;}
    audio.rustle();
    if(layered&&n===2){beginRubble(gate);return;}
    const seq=startSequence('tide',n===2?'puzzle':'tide',720);
    paintTide(n+1,true);
    if(n===2){
      header('棘龙骨架露出来啦','接下来，把四块骨头放回石板');
      steps('puzzle',2);
    }else if(!layered)steps('brush',1);
    later(()=>finishSequence(seq,()=>{
      if(n===2){render();$('#tray button').focus({preventScroll:true});}
      else{
        const focused=document.activeElement===gate;
        renderTide();
        if(focused)gates[n+1].focus({preventScroll:true});
      }
    }),reduced.matches?180:720);
  };});
  let toolDirection=0;
  const echoPoints=$('#echoPoints'),wedgeTool=$('#wedgeTool'),turnWedge=$('#turnWedge'),pressWedge=$('#pressWedge');
  const extraRoot=$('#extraFieldTool');
  const extraTool=tool?.variant?window.createFossilFieldTool({
    tool,root:extraRoot,board,attempt:finishFieldAction,status,audio,
    activeStage:()=>!busy&&knockReady&&view==='dig'&&current?.step==='knock'?current.hits/2:null,
    rockSprite:'./'+layered.file+V
  }):null;
  const directionLabels=['横向','右下斜向','竖向','右上斜向'];
  function fieldStatus(n){status(`已经发掘 ${n} / 3 处`);}
  function paintWedge(stage){
    const mark=$('#wedgeMark'),[x,y]=tool.points[stage],answer=tool.answers[stage];
    mark.style.cssText=`--x:${x}%;--y:${y}%;--crack:${answer*45}deg;--wedge:${toolDirection*45}deg`;
    turnWedge.setAttribute('aria-label','旋转楔子，当前'+directionLabels[toolDirection]);
    pressWedge.setAttribute('aria-label','沿缝撬开，裂缝是'+directionLabels[answer]);
  }
  function renderField(){
    const stage=current.hits/2;
    const field=$('#fieldDig');field.hidden=false;
    field.classList.remove('field-found');
    $('#fieldRock').src=stageImages[stage].src;
    header(tool.title,tool.instruction);
    steps(layered?'knock':stage?'brush':'knock',!layered&&stage?1:0);
    echoPoints.hidden=!echo;wedgeTool.hidden=echo||Boolean(extraTool);
    if(extraRoot)extraRoot.hidden=!extraTool;
    if(extraTool)extraTool.render(stage);
    else if(echo)echoPoints.querySelectorAll('button').forEach(button=>delete button.dataset.signal);
    else paintWedge(stage);
    fieldStatus(stage);
  }
  function fieldStage(){
    return tool&&!busy&&knockReady&&store.eligible()&&read().step==='knock'?current.hits/2:null;
  }
  function finishFieldAction(stage,answer,control){
    if(!readyStages.has(stage+1)||(stage===2&&!assetsReady)){
      waitingAssets=true;
      status('正在准备下一段，等一下再试。');
      return;
    }
    store.clearSection(stage,answer);
    if(read().hits!==(stage+1)*2){render();return;}
    const focused=document.activeElement===control;
    audio.synth('snap');
    if(layered&&stage===2){beginRubble(control);return;}
    const seq=startSequence(F.excavation,stage===2?'puzzle':F.excavation,650);
    const field=$('#fieldDig');
    $('#fieldRock').src=stageImages[stage+1].src;
    field.classList.add('field-found');
    fieldStatus(stage+1);
    header(stage===2?F.name+'骨架露出来啦':tool.found,stage===2?'把骨头放回相同的凹槽':'看看这次露出来的是哪一块骨头');
    if(!layered)steps(stage===2?'puzzle':'brush',stage===2?2:1);
    later(()=>finishSequence(seq,()=>{
      toolDirection=0;render();
      if(focused)(stage===2?$('#tray button'):control)?.focus({preventScroll:true});
    }),reduced.matches?150:650);
  }
  if(echo){
    tool.points.forEach(([x,y],i)=>{
      const point=document.createElement('button');
      point.type='button';point.className='echo-point';point.style.cssText=`--x:${x}%;--y:${y}%`;
      point.setAttribute('aria-label',`探测点 ${i+1}`);
      point.textContent=i+1;
      point.onclick=()=>{
        const stage=fieldStage();if(stage===null)return;
        const target=tool.answers[stage];
        if(i===target){finishFieldAction(stage,i,point);return;}
        const [tx,ty]=tool.points[target],near=Math.hypot(x-tx,y-ty)<35;
        point.dataset.signal=near?'near':'far';
        audio.synth(near?'snap':'knock');
        status(near?'回声变清楚了，在附近找找。':'回声很闷，换个地方听听。');
      };
      echoPoints.append(point);
    });
  }
  if(tool&&!echo&&!extraTool){
    turnWedge.onclick=()=>{
      const stage=fieldStage();if(stage===null)return;
      toolDirection=(toolDirection+1)%directionLabels.length;
      paintWedge(stage);fieldStatus(stage);
    };
    pressWedge.onclick=()=>{
      const stage=fieldStage();if(stage===null)return;
      if(toolDirection!==tool.answers[stage]){status('让楔子的尖头沿着裂缝摆齐，再试试。');return;}
      finishFieldAction(stage,toolDirection,pressWedge);
    };
  }
  const stones=[];
  function rubbleStatus(){
    status(`已经移开 ${store.STONES.filter(cell=>current.cleared.includes(cell)).length} / ${stones.length} 块碎石`);
  }
  function paintRubble(){
    const removing=current.step==='rubble';
    $('#rubble').hidden=false;
    stones.forEach((stone,i)=>{
      const moved=!removing||current.cleared.includes(store.STONES[i]);
      stone.classList.toggle('moved',moved);
      stone.disabled=moved;
      stone.setAttribute('aria-hidden',String(moved));
    });
  }
  function beginRubble(control){
    const focused=document.activeElement===control;
    toolDirection=0;extraTool?.reset();render();
    if(focused)stones.find(stone=>!stone.disabled)?.focus({preventScroll:true});
  }
  if(layered)layered.pieces.forEach(([x,y,edgeX,edgeY,width],i)=>{
    const stone=document.createElement('button');
    stone.type='button';stone.className='rubble-piece';
    stone.setAttribute('aria-label',`移开第 ${i+1} 块碎石`);
    stone.style.cssText=`--x:${x}%;--y:${y}%;--edge-x:${edgeX}%;--edge-y:${edgeY}%;--width:${width}%;--tile-x:${i%2*100}%;--tile-y:${Math.floor(i/2)*100}%;--atlas:url("./${layered.file}${V}")`;
    stone.onclick=()=>{
      const focused=document.activeElement===stone;
      if(busy||read().step!=='rubble'||current.cleared.includes(store.STONES[i]))return;
      store.removeStone(i);read();warning();
      if(!current.cleared.includes(store.STONES[i]))return;
      audio.synth('knock');effects.impact({x:x/100,y:y/100},i);
      if(current.step==='brush'){render();if(focused)$('#title').focus({preventScroll:true});}
      else{paintRubble();rubbleStatus();if(focused)stones.find(button=>!button.disabled)?.focus({preventScroll:true});}
    };
    stones.push(stone);
    $('#rubble').append(stone);
  });
  function makeSand(){
    const size=canvas.width,source=$('#sandSource');if(!source.naturalWidth)return null;
    const base=document.createElement('canvas');base.width=base.height=size;const c=base.getContext('2d');
    // Registered native buried-relief art, like Brachio: opaque bone tips
    // protrude through sand. No translucent skeleton or gray panel overlay.
    c.drawImage(source,0,0,size,size);
    return base;
  }
  // Brushing thins the sand a little on every pass instead of punching out squares: each sample stamps a faint
  // soft disc, and a cell counts as brushed once a pass or two has worn it. Saved cells come back fully cleared.
  const wearMask=document.createElement('canvas');wearMask.width=wearMask.height=1254;
  const brushCells=layered?new Set(F.area.weights.map(([cell])=>cell)):null;
  const BRUSH_R=.085,BRUSH_WEAR=.3,BRUSH_ALPHA=.26,WORN=.6,wear=new Float32Array(1024),shown=new Set();
  function stampWear(p,alpha,r=BRUSH_R){const m=wearMask.getContext('2d'),size=wearMask.width,x=p.x*size,y=p.y*size,rad=r*size,grad=m.createRadialGradient(x,y,0,x,y,rad);grad.addColorStop(0,`rgba(0,0,0,${alpha})`);grad.addColorStop(1,'rgba(0,0,0,0)');m.fillStyle=grad;m.beginPath();m.arc(x,y,rad,0,Math.PI*2);m.fill();}
  function syncWear(){const done=new Set([...current.cleared,...pending]);if([...shown].some(n=>!done.has(n))){wearMask.getContext('2d').clearRect(0,0,wearMask.width,wearMask.height);wear.fill(0);shown.clear();}done.forEach(n=>{if(shown.has(n)||(layered&&store.STONES.includes(n)))return;shown.add(n);wear[n]=1;stampWear({x:(n%32+.5)/32,y:(Math.floor(n/32)+.5)/32},1,1.6/32);});}
  function paintSand(){sandBase||=makeSand();if(!sandBase)return;syncWear();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(sandBase,0,0);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(wearMask,0,0);ctx.restore();}
  function queueSand(){if(!sandFrame)sandFrame=requestAnimationFrame(()=>{sandFrame=0;paintSand();});}
  function partCoverage(part){const set=new Set([...current.cleared,...pending]);return part.coverage.reduce((s,[n,w])=>s+(set.has(n)?w:0),0)/part.coverage.reduce((s,[n,w])=>s+w,0);}
  function syncFlashes(){art.parts.forEach(p=>{if(partCoverage(p)>=.3)flashed.add(p.id);});}
  function flash(part){if(reduced.matches)return;const img=artImage(part,'bone-flash');$('#boneHighlights').append(img);later(()=>img.remove(),400);}
  function paintShell(p){cancelAnimationFrame(shellFrame);const surface=$('#eggSurface'),c=surface.getContext('2d'),size=surface.width,index=current.hits===0?0:current.hits<3?1:current.hits<5?2:3,source=stageImages[index];if(!source.naturalWidth)return;if(!p||reduced.matches){c.clearRect(0,0,size,size);c.drawImage(source,0,0,size,size);return;}const old=document.createElement('canvas');old.width=old.height=size;old.getContext('2d').drawImage(surface,0,0);const begin=performance.now();function frame(now){const t=Math.max(0,Math.min(1,(now-begin)/420));c.clearRect(0,0,size,size);c.drawImage(old,0,0);c.save();c.beginPath();c.arc(p.x*size,p.y*size,t*size*1.42,0,Math.PI*2);c.clip();c.clearRect(0,0,size,size);c.drawImage(source,0,0,size,size);c.restore();if(t<1)shellFrame=requestAnimationFrame(frame);}shellFrame=requestAnimationFrame(frame);}
  const hammer='<svg viewBox="0 0 72 72"><path d="m30 27 25 33" stroke="#754924" stroke-width="9" stroke-linecap="round"/><path d="m14 21 28-14 12 17-29 16z" fill="#9caaab" stroke="#485e60" stroke-width="3"/><path d="m15 21 27-14" stroke="#ecf4ee" stroke-width="4"/></svg>';
  function knockEffect(e,n){
    if(reduced.matches)return;const r=board.getBoundingClientRect(),x=e.detail?Math.max(0,Math.min(1,(e.clientX-r.x)/r.width)):.5,y=e.detail?Math.max(0,Math.min(1,(e.clientY-r.y)/r.height)):.48;
    const hit=document.createElement('div');hit.className='knock-impact';hit.style.cssText=`left:${x*100}%;top:${y*100}%;`;hit.innerHTML=`<span class="hammer">${hammer}</span>${cut?'':'<svg class="impact-cracks" viewBox="0 0 120 120"><path d="M60 60 47 52 43 35 30 27 M60 60 75 48 93 51 107 40 M60 60 65 79 54 90 60 110"/></svg>'}<span class="dust"></span>`;$('#effects').append(hit);later(()=>hit.remove(),1100);
    effects.impact({x,y},n+1);
    try{navigator.vibrate?.(15);}catch(_){}
  }
  function startSequence(from,to,duration){timers.forEach(clearTimeout);timers.clear();$('#demoHand').hidden=true;busy=true;cancelDrag();transition={from,to,start:performance.now(),events:[],duration:0,cancelled:false};transitions.push(transition);return transition;}
  function mark(label){if(transition)transition.events.push({label,ms:performance.now()-transition.start});}
  function completeStep(n){steps('',n);audio.synth('glow');mark('check-and-completion-sound');}
  function nextTitle(title,text,step){header(title,text);steps(step,step==='revive'?stepOrder.length:undefined);$('.heading').classList.remove('title-in');void $('.heading').offsetWidth;$('.heading').classList.add('title-in');mark('next-title');}
  function demo(kind){if(dismissedDemos.has(kind)||drag||brushPointer!==null)return;const hand=$('#demoHand');hand.className=kind+'-demo';hand.hidden=false;mark('demonstration-start');later(()=>{hand.hidden=true;mark('demonstration-end');},1000);}
  function dismissDemo(kind){dismissedDemos.add(kind);$('#demoHand').hidden=true;}
  function puzzleReady(id){return (!busy||transition?.to==='puzzle')&&readyParts.has(id);}
  function brushReady(){return (!busy||transition?.to==='brush')&&board.dataset.phase==='brush';}
  function finishSequence(seq,fn){if(transition!==seq)return;seq.end=performance.now();seq.duration=seq.end-seq.start;transition=null;busy=false;$('#demoHand').hidden=true;fn();}
  $('#egg').onclick=e=>{
    if(busy||!knockReady||!store.eligible()||read().step!=='knock')return;
    if(current.hits===5&&!assetsReady){waitingAssets=true;status('化石正在准备，请稍等一下…');return;}
    audio.unlock();audio.synth('knock');const n=current.hits;knockEffect(e,n);store.hit();read();warning();status(`已经敲了 ${current.hits} / 6 下`);
    paintShell(e.detail?point(e):{x:.5,y:.48});if(current.hits<6)return;$('#egg').disabled=true;$('#eggContents').hidden=false;board.dataset.phase='brush';
    const seq=startSequence('knock','brush',2300);header(cut?'表面的沙土松开啦':'岩石敲开啦','看一看，沙土里露出了哪些骨头？');
    if(!reduced.matches){board.classList.remove('shake');void board.offsetWidth;board.classList.add('shake');}
    later(()=>{$('#egg').hidden=true;board.dataset.phase='brush';},650);
    later(()=>completeStep(1),650);
    later(()=>{nextTitle('刷掉石板上的沙土','沿着凸起的骨头刷，刷开 70% 就完成','brush');status('骨头已刷开 0% / 70%');},1100);
    later(()=>demo('brush'),1250);
    later(()=>finishSequence(seq,()=>{}),2300);
  };
  function point(e){const r=board.getBoundingClientRect();return{x:(e.clientX-r.x)/r.width,y:(e.clientY-r.y)/r.height};}
  function erase(p){if(!effects.onTop(p))return;stampWear(p,BRUSH_ALPHA);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot((x+.5)/32-p.x,(y+.5)/32-p.y),n=y*32+x;if(d>=BRUSH_R||(brushCells&&!brushCells.has(n))||current.cleared.includes(n)||pending.has(n)||!effects.onTop({x:(x+.5)/32,y:(y+.5)/32}))continue;wear[n]+=BRUSH_WEAR*(1-d/BRUSH_R);if(wear[n]>=WORN){pending.add(n);shown.add(n);}}queueSand();art.parts.forEach(part=>{if(!flashed.has(part.id)&&partCoverage(part)>=.3){flashed.add(part.id);effects.stats.flashes.push({id:part.id,coverage:partCoverage(part),at:performance.now()});flash(part);}});const total=store.coverage([...current.cleared,...pending]);status(`骨头已刷开 ${Math.floor(total*100)}% / 70%`);clearTimeout(flushTimer);if(total>=store.THRESHOLD)flushBrush();else flushTimer=setTimeout(flushBrush,140);}
  function flushBrush(){clearTimeout(flushTimer);if(!pending.size)return;const cells=[...pending];pending.clear();store.brush(cells);read();warning();if(current.step==='puzzle'&&(!busy||transition?.to==='brush')){brushPointer=null;lastPoint=null;if(transition?.to==='brush')finishSequence(transition,()=>{});brushFinished();}}
  function brushAt(p){if(!effects.onTop(p)){effects.hideBrush();lastPoint=null;return;}if(!strokeCounted){brushStrokes++;strokeCounted=true;}dismissDemo('brush');if(transition?.to==='brush')$('#egg').hidden=true;const from=lastPoint||p,count=Math.max(1,Math.ceil(Math.hypot(p.x-from.x,p.y-from.y)/.025));for(let i=1;i<=count&&current.step==='brush';i++)erase({x:from.x+(p.x-from.x)*i/count,y:from.y+(p.y-from.y)*i/count});if(current.step==='brush'){effects.cursor(p,lastPoint);lastPoint=p;audio.rustle();}}
  canvas.addEventListener('pointerdown',e=>{if(!brushReady()||!store.eligible()||read().step!=='brush')return;e.preventDefault();audio.unlock();brushPointer=e.pointerId;strokeCounted=false;lastPoint=null;canvas.setPointerCapture(e.pointerId);brushAt(point(e));});
  canvas.addEventListener('pointermove',e=>{if(!brushReady()||e.pointerId!==brushPointer||current.step!=='brush')return;e.preventDefault();brushAt(point(e));});
  ['pointerup','pointercancel'].forEach(t=>canvas.addEventListener(t,()=>{brushPointer=null;lastPoint=null;effects.hideBrush();flushBrush();}));
  function artImage(part,className){const img=new Image(),r=geometry(part);img.src='./art/'+part.file+V;img.alt='';img.className=className;img.style.cssText=`left:${r.x*100}%;top:${r.y*100}%;width:${r.w*100}%;height:${r.h*100}%;`;return img;}
  function brushFinished(){
    effects.hideBrush();const seq=startSequence('brush','puzzle',2400);status(`骨头已刷开 ${Math.floor(store.coverage(current.cleared)*100)}%`);header('骨架露出来啦','都是刚刚从岩石里挖出来的骨头');
    later(()=>{if(reduced.matches)canvas.hidden=true;else canvas.classList.add('sand-away');audio.rustle();mark('remaining-sand-clears');},450);
    later(()=>completeStep(stepOrder.indexOf('puzzle')),650);
    later(()=>{if(!reduced.matches)art.parts.forEach((part,i)=>{const img=artImage(part,'bone-flash');img.style.animationDelay=i*90+'ms';$('#boneHighlights').append(img);});mark('five-bone-highlights');},850);
    later(()=>{canvas.hidden=true;},1100);
    later(()=>{nextTitle('在石板上拼骨架','拖动下面的骨头，放回相同的凹槽','puzzle');status(`已经拼好 0 / ${art.parts.length} 块`);},1250);
    later(()=>{$('#boneHighlights').replaceChildren();$('#slab').hidden=true;if(natural&&assetsStarted)$('#cleanFace').src='./'+art.bowl+V;$('#grooves').hidden=false;$('#targets').hidden=false;$('#tray').hidden=false;readyParts.clear();renderPuzzle();flyToTray();},1450);
    later(()=>demo('puzzle'),1350);
    later(()=>finishSequence(seq,()=>{}),2400);
  }
  function landed(part){if(readyParts.has(part.id))return;readyParts.add(part.id);const button=$(`[data-piece="${part.id}"]`);if(button){button.classList.remove('receiving');button.disabled=false;}const target=$(`[data-target="${part.id}"]`);if(target)target.disabled=false;landings.push({id:part.id,at:performance.now()});mark('landed-'+part.id);}
  function flyToTray(){mark('pieces-to-tray');if(reduced.matches){art.parts.forEach(landed);return;}const r=board.getBoundingClientRect();art.parts.forEach((part,i)=>{const g=geometry(part),dest=$(`[data-piece="${part.id}"] img`).getBoundingClientRect(),source={x:r.x+g.x*r.width,y:r.y+g.y*r.height,w:g.w*r.width,h:g.h*r.height};const img=new Image();img.src='./art/'+part.file+V;img.className='flight-bone';img.style.cssText=`left:${source.x}px;top:${source.y}px;width:${source.w}px;height:${source.h}px;`;document.body.append(img);const anim=img.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dest.x-source.x}px,${dest.y-source.y}px) scale(${dest.width/source.w},${dest.height/source.h})`}],{duration:430,delay:i*100,fill:'both',easing:'cubic-bezier(.3,.05,.6,1)'});anim.onfinish=()=>{img.remove();landed(part);};});}
  function renderPuzzle(){
    $('#grooves').replaceChildren();$('#targets').replaceChildren();$('#tray').replaceChildren();
    art.parts.forEach(part=>{const r=geometry(part),placed=current.placed.includes(part.id),img=artImage(part,placed?'placed-bone':'groove');if(placed)$('#grooves').append(img);
      const target=document.createElement('button');target.type='button';target.className='target';target.dataset.target=part.id;target.setAttribute('aria-label',part.label+'的骨架凹槽');target.style.cssText=`left:calc(${(r.x+r.w/2)*100}% - 24px);top:calc(${(r.y+r.h/2)*100}% - 24px);width:48px;height:48px`;target.disabled=placed||!readyParts.has(part.id);target.onclick=()=>{if(puzzleReady(part.id)&&selected===part.id)place(part.id);};$('#targets').append(target);
      const button=document.createElement('button');button.type='button';button.className='bone-choice'+(placed?' placed':'')+(!readyParts.has(part.id)?' receiving':'');button.dataset.piece=part.id;button.disabled=placed||!readyParts.has(part.id);button.setAttribute('aria-label',part.label+'，拖回石板上的凹槽');button.innerHTML=`<img src="./art/${part.file}${V}" alt=""><span>${part.label}</span>`;button.addEventListener('pointerdown',e=>startDrag(e,part,button));button.addEventListener('pointermove',moveDrag);button.addEventListener('pointerup',endDrag);button.addEventListener('pointercancel',cancelDrag);button.addEventListener('click',()=>{if(puzzleReady(part.id)&&!placed)select(part.id);});$('#tray').append(button);
    });
  }
  function select(id){selected=id;document.querySelectorAll('.bone-choice').forEach(b=>b.classList.toggle('selected',b.dataset.piece===id));document.querySelectorAll('.target').forEach(b=>b.classList.toggle('active',b.dataset.target===id));}
  function startDrag(e,part,button){if(!puzzleReady(part.id)||!store.eligible()||read().step!=='puzzle'||current.placed.includes(part.id))return;e.preventDefault();dismissDemo('puzzle');dragStarts.push({id:part.id,at:performance.now()});audio.unlock();select(part.id);const r=board.getBoundingClientRect(),g=geometry(part),ghost=new Image();ghost.src='./art/'+part.file+V;ghost.className='drag-ghost';ghost.style.width=g.w*r.width+'px';ghost.style.height=g.h*r.height+'px';document.body.append(ghost);drag={id:part.id,pointer:e.pointerId,ghost,w:g.w*r.width,h:g.h*r.height,button,start:{x:e.clientX,y:e.clientY},moved:false};button.setPointerCapture(e.pointerId);moveDrag(e);}
  function moveDrag(e){if(!drag||e.pointerId!==drag.pointer)return;drag.moved||=Math.hypot(e.clientX-drag.start.x,e.clientY-drag.start.y)>5;drag.ghost.style.left=e.clientX-drag.w/2+'px';drag.ghost.style.top=e.clientY-drag.h/2+'px';}
  function endDrag(e){if(!drag||e.pointerId!==drag.pointer)return;const d=drag;drag=null;const r=$(`[data-target="${d.id}"]`).getBoundingClientRect(),distance=Math.hypot(e.clientX-r.x-r.width/2,e.clientY-r.y-r.height/2);if(d.moved&&distance<=40){d.ghost.remove();place(d.id);}else{const b=d.button.getBoundingClientRect();if(!reduced.matches&&d.moved){d.ghost.classList.add('returning');d.ghost.style.left=b.x+b.width/2-d.w/2+'px';d.ghost.style.top=b.y+b.height/2-d.h/2+'px';later(()=>d.ghost.remove(),240);}else d.ghost.remove();if(d.moved)status('找找相同的凹槽，再轻轻放上去');}}
  function cancelDrag(){drag?.ghost.remove();drag=null;}
  function place(id){if(!puzzleReady(id)||!store.eligible()||read().step!=='puzzle')return;store.place(id);audio.synth('snap');selected=null;read();renderPuzzle();const part=art.parts.find(p=>p.id===id),r=geometry(part),img=[...$('#grooves').children].find(el=>el.src.includes(part.file));effects.snap(img,{x:r.x+r.w/2,y:r.y+r.h/2});status(`已经拼好 ${current.placed.length} / ${art.parts.length} 块`);if(current.step==='revive'){if(transition?.to==='puzzle')finishSequence(transition,()=>{});busy=true;later(()=>{busy=false;revive(false);},270);}}
  function wave(pace=1){F.waveOrder.forEach((id,i)=>later(()=>flash(art.parts.find(p=>p.id===id)),i*160*pace));}
  function retreatRock(animate){board.classList.add('rock-retreated');if(animate&&!reduced.matches)board.animate([{transform:'none'},{transform:'translate(11%,-10%) scale(.6)'}],{duration:600,easing:'ease-in-out'});}
  function showSpeech(){if(!transition||transition.finishing)return;const bubble=$('#speechBubble'),cue=F.voice;bubble.textContent=cue.text;bubble.hidden=false;positionSpeech();mark('speech-bubble');}
    function positionSpeech(){const bubble=$('#speechBubble');if(bubble.hidden)return;
    // The dinosaur is still scaling in when the voice starts; wait for it to land so the bubble is placed against its real size.
    const landing=$('#living').getAnimations().filter(a=>a.playState==='running');if(landing.length){bubble.style.visibility='hidden';Promise.all(landing.map(a=>a.finished)).catch(()=>{}).then(()=>{bubble.style.visibility='';positionSpeech();});return;}
    const area=$('#board').getBoundingClientRect(),dino=$('#living').getBoundingClientRect(),headX=dino.x+dino.width*.84-area.x;const width=Math.min(210,Math.max(145,headX-20));bubble.style.width=width+'px';
    // Above the dinosaur when there is room, so the words never cover its face; otherwise beside the head as before.
    const room=dino.y-area.y+dino.height*.08,above=room>=bubble.offsetHeight+4;bubble.classList.toggle('above',above);bubble.style.left=Math.max(0,above?Math.min(area.width-width,headX-width+28):headX-width-14)+'px';bubble.style.top=Math.max(0,above?room-bubble.offsetHeight-4:dino.y-area.y+8)+'px';}
  function settleHero(){retreatRock(false);$('#floatingSkeleton').hidden=true;$('#slab').hidden=true;$('#grooves').hidden=true;$('#reveal').hidden=false;$('#living').hidden=false;}
  function finishRevival(seq,reason){if(transition!==seq||seq.finishing)return;seq.finishing=true;timers.forEach(clearTimeout);timers.clear();seq.reason=reason;seq.voice=audio.status().lastVoice;if(reason!=='voice-complete'){audio.stop();[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));}settleHero();$('#speechBubble').hidden=true;$('#boneHighlights').replaceChildren();$('#skipRevival').hidden=true;steps('',stepOrder.length);$('#knowledge').classList.remove('pending');if(!reduced.matches)$('#knowledge').classList.add('card-in');awake=true;busy=false;mark('knowledge-card-start');later(()=>finishSequence(seq,()=>{document.body.classList.add('reveal-mode');status('');}),reduced.matches?0:250);}
  function revive(replay){
    if(F.restorationOnly){if(busy||!store.eligible()||!['revive','museum'].includes(read().step))return;cancelSequence();replaying=replay;hideAll();$('#workspace').hidden=false;$('#eggContents').hidden=false;$('#cleanFace').src='./'+art.face.file+V;header('化石修复完成','你把'+F.name+'的骨架拼完整啦');steps('',stepOrder.length);$('#knowledge').hidden=false;$('#knowledge .eyebrow').textContent='我的发现';$('#knowledge h2').textContent=F.card.title;$('#knowledgeText').textContent=F.card.text;$('#enterMuseum').textContent='放进博物馆 →';awake=true;return;}

    if(busy||!store.eligible()||!['revive','museum'].includes(read().step))return;
    if(!revivalReady()){render();return;}
    cancelSequence();const sceneBefore=$('#board').getBoundingClientRect();replaying=replay;awake=false;hideAll();document.body.classList.add('hero-mode');$('#workspace').hidden=false;$('#slab').hidden=false;$('.steps').hidden=false;steps('',stepOrder.length);board.dataset.phase='revive';header(F.name+'醒来了','');status('');audio.unlock();$('#knowledge').hidden=false;$('#knowledge .eyebrow').textContent='你好，'+F.name;$('#knowledge h2').textContent=F.card.title;$('#knowledgeText').textContent=ID==='brachio'?'':F.card.text;$('#knowledge').classList.add('pending');$('#enterMuseum').textContent=replay||store.isRepeating()?'回到博物馆 →':'放进博物馆 →';
    const sceneAfter=$('#board').getBoundingClientRect();if(!reduced.matches&&Math.abs(sceneBefore.x-sceneAfter.x)>1)$('#board').animate([{transform:`translate(${sceneBefore.x-sceneAfter.x}px,${sceneBefore.y-sceneAfter.y}px)`},{transform:'none'}],{delay:800,duration:600,fill:'backwards',easing:'ease-in-out'});const cueMs=(F.voice.end-F.voice.start)*1000,pace=cut&&cueMs>7200?.64:1;const seq=startSequence('puzzle','revive',8900);mark('revival-glow');if(!reduced.matches)wave(pace);
    if(reduced.matches){settleHero();showSpeech();}
    else{
      later(()=>{if(transition!==seq)return;if(reduced.matches){settleHero();return;}const floating=$('#floatingSkeleton');floating.replaceChildren(...art.parts.map(part=>artImage(part,'assembled-bone')));floating.hidden=false;$('#slab').hidden=true;$('#grooves').hidden=true;retreatRock(true);floating.animate([{transform:'none',filter:'drop-shadow(0 2px 2px #a77a45)'},{transform:'translate(11%,-18%) scale(1.06)',filter:'brightness(1.5) drop-shadow(0 8px 5px #c7a161)',offset:.65},{transform:'translate(13%,-21%) scale(.84)',filter:'brightness(2.2) drop-shadow(0 0 12px #ffe6a0)'}],{duration:280*pace,fill:'forwards',easing:'ease-out'});mark('skeleton-lifts');},800*pace);
      later(()=>{if(transition!==seq)return;if(reduced.matches){settleHero();return;}$('#floatingSkeleton').hidden=true;$('#reveal').hidden=false;$('#living').hidden=false;$('#living').animate([{transform:'translateY(-14%) scale(.78)'},{transform:'translateY(-18%) scale(.94)',offset:.35},{transform:'none',offset:.55},{transform:'translateY(-3%) scale(1.02,.98)',offset:.8},{transform:'none'}],{duration:300*pace,easing:'ease-in-out'});mark('skeleton-becomes-dinosaur');},1040*pace);
    }
    const land=reduced.matches?0:1205*pace;
    later(()=>{if(transition!==seq)return;audio.revive();mark('dinosaur-lands');},land);
    later(async()=>{if(transition!==seq)return;mark('narration-request');const result=await audio.narrate(showSpeech);if(transition!==seq)return;seq.voice=result;mark('narration-ended');finishRevival(seq,result.completed?'voice-complete':result.reason);},land+250*pace);
    later(()=>{if(transition!==seq||seq.finishing)return;$('#skipRevival').hidden=false;$('#skipRevival').classList.add('skip-in');mark('skip-available');},3000);
    later(()=>{if(transition===seq&&!seq.finishing&&!audio.status().narrating)finishRevival(seq,'deadline');},8750); // Never cut a playing approved cue when a busy device delivers timers late.
  }
  $('#skipRevival').onclick=()=>{if(transition?.to==='revive'&&performance.now()-transition.start>=3000)finishRevival(transition,'skipped');};
  document.addEventListener('click',e=>{if(transition?.to==='revive'&&performance.now()-transition.start>=3000&&!e.target.closest('header,button,a,dialog'))finishRevival(transition,'skipped');});
  addEventListener('resize',positionSpeech);
  $('#wake').onclick=()=>revive(false);
  $('#enterMuseum').onclick=()=>{if(busy||!awake||!store.eligible())return;cancelSequence();const firstTime=!replaying;if(!replaying&&!store.claim()){warning();return;}audio.step();view='museum';awake=false;render();
    // S1: a skeleton found through the levels comes "home", and the line names the next one to look for.
    const story=firstTime&&fromGame?window.DinoStory?.home(ID):null;if(story){freshStar=window.DinoStory.ORDER.indexOf(ID);museum();$('#instruction').textContent=story.text;if(audio.enabled){const voice=f=>'../../assets/voice/'+f+'?v=20261110-st1-r1',line=new Audio(voice(story.file));line.play().catch(()=>{});
      // After the last skeleton, Xiaoyu tells her secret on the same element the tap started.
      if(story.then)line.addEventListener('ended',()=>{$('#instruction').textContent=story.then.text;line.src=voice(story.then.file);line.play().catch(()=>{});},{once:true});}}history.replaceState(null,'','?'+baseQuery+'view=museum&v=20261113-f12-r1');};
  const CAT=window.FOSSILS.catalog,HALLS=[['jurassic','侏罗纪厅'],['cretaceous','白垩纪厅']],STANDS=6,skeletonSrc=id=>'./'+window.FOSSILS.fossils[id].art.skeleton.file+V;
  function exhibitSkeleton(id){
    const f=window.FOSSILS.fossils[id];
    // The just-completed fossil already has every bone in the browser cache.
    // Reassemble those same pixels on its stand instead of downloading a second
    // full-resolution copy of the skeleton (360 KB for Triceratops).
    if(id!==ID||!['cut','natural'].includes(f.art.mode))return `<img src="${skeletonSrc(id)}" alt="${f.name}骨架">`;
    const [l,t,r,b]=f.art.skeleton.box;
    return `<svg class="exhibit-skeleton" role="img" aria-label="${f.name}骨架" viewBox="${l} ${t} ${r-l} ${b-t}">${f.art.parts.map(p=>{const[x,y,r,b]=p.box;return `<image href="./art/${p.file}${V}" x="${x}" y="${y}" width="${r-x}" height="${b-y}"/>`;}).join('')}</svg>`;
  }
  let hall=F.era==='cretaceous'?'cretaceous':'jurassic',page=-1,freshStar=-1;  // -1: open on the page that holds this fossil
  const fossilOf=id=>window.FOSSILS.fossils[id];
  function museum(){
    document.body.classList.add('museum-mode');$('#museum').hidden=false;$('.steps').hidden=true;
    const owned=new Set(store.load().museum.filter(id=>fossilOf(id))),collected=store.eligible()&&owned.has(ID);
    // ST1: the roof's star map, one star per skeleton found through the levels. The archaeology camp keeps its own collection, so it has none.
    const sky=$('#storySky');sky.hidden=store.STANDALONE||!window.DinoStory;if(!sky.hidden)sky.innerHTML=window.DinoStory.skyMap(window.DinoStory.stars(id=>owned.has(id)),freshStar);freshStar=-1;
    header('森林博物馆',collected?(ID==='brachio'?'第一座展台，住进了腕龙骨架':ID==='mamenshi'?'第二座展台，住进了马门溪龙骨架':F.name+'骨架，住进了展台'):'把旅途中的发现，慢慢放进这里','我的发现');
    const discoveries=$('#naturalDiscoveries');discoveries.replaceChildren();Object.values(window.FOSSILS.fossils).map(f=>f.id).forEach(id=>{const f=fossilOf(id);if(!f)return;const a=document.createElement('a');a.className='secondary';a.href='./?'+(store.PREVIEW?'parent=1&':store.STANDALONE?'archaeology=1&':'')+'fossil='+id+'&v=20261113-f12-r1';a.textContent=f.name+(owned.has(id)?' · 已收藏':store.eligible(id)?' · 去挖掘':unlock?.ORDER.includes(id)?' · 闯关解锁':f.journey?.routes?' · 完成森林6关后开启':' · 完成对应营地后开启');discoveries.append(a);});
    const list=CAT.filter(c=>c.hall===hall&&(!store.STANDALONE||fossilOf(c.id))),pages=Math.max(1,Math.ceil(list.length/STANDS));if(page<0){const at=list.findIndex(c=>c.id===ID);page=at<0?0:Math.floor(at/STANDS);}page=Math.max(0,Math.min(page,pages-1));
    const found=list.filter(c=>owned.has(c.id)).length;
    $('#hallTabs').innerHTML=HALLS.map(([id,label])=>`<button type="button" class="hall-tab" data-hall="${id}" aria-pressed="${id===hall}">${label}</button>`).join('');
    $('#exhibits').dataset.hall=hall;
    $('#exhibits').innerHTML=list.slice(page*STANDS,page*STANDS+STANDS).map(c=>owned.has(c.id)?`<button class="exhibit" data-fossil="${c.id}" type="button">${exhibitSkeleton(c.id)}<strong>${c.name} · ${c.eraLabel}</strong></button>`:`<div class="exhibit" data-empty="${c.id}"><span class="unknown">?</span><small>${!fossilOf(c.id)?'尚未开放':store.STANDALONE?'去考古营地挖掘':store.eligible(c.id)?'可以去挖啦':unlock?.ORDER.includes(c.id)?'闯关解锁':c.location?'去「'+c.location+'」挖':'还没安排地点'}</small></div>`).join('');
    $('#pageInfo').textContent=`第 ${page+1} / ${pages} 页 · 已找到 ${found} 个`;const waiting=Object.keys(window.FOSSILS.fossils).filter(id=>!owned.has(id)&&store.eligible(id));if(!collected&&waiting.length>1)status('有 '+waiting.length+' 块化石等你挖，先挖这一块吧');$('#prevPage').disabled=page===0;$('#nextPage').disabled=page>=pages-1;$('#pager').hidden=pages<2;
    $('#replay').hidden=!collected||F.restorationOnly;updateRevivalButtons();$('#redig').hidden=!collected;$('#redig').textContent=store.hasRepeat()?'继续挖掘':'再挖一次';$('#digLink').hidden=collected||!store.eligible();$('#digLink').href='./?'+baseQuery+'v=20261113-f12-r1';if(!collected&&!store.eligible())status(route?'完成'+route.name+'后，就能来挖化石。':'这块化石的探险地点还未开放。');
  }
  $('#hallTabs').addEventListener('click',e=>{const b=e.target.closest('[data-hall]');if(!b)return;hall=b.dataset.hall;page=0;museum();});
  $('#prevPage').onclick=()=>{page--;museum();};$('#nextPage').onclick=()=>{page++;museum();};
  $('#exhibits').addEventListener('click',e=>{const b=e.target.closest('[data-fossil]');if(!b)return;const f=fossilOf(b.dataset.fossil);$('#factImg').src=f.living.file;$('#factImg').alt=f.name;$('#fact h2').textContent=f.card.title;$('#fact p').textContent=f.card.text;$('#fact').showModal();});
  $('#redig').onclick=()=>{
    if(busy||!(store.resumeRepeat()||store.startRepeat())){warning();return;}
    replayAfterLoad=false;
    cancelSequence();cancelDrag();audio.stop();effects.reset();flashed.clear();dismissedDemos.clear();readyParts.clear();art.parts.forEach(p=>readyParts.add(p.id));pending.clear();clearTimeout(flushTimer);brushPointer=null;lastPoint=null;selected=null;brushStrokes=0;replaying=false;awake=false;toolDirection=0;view='dig';
    history.replaceState(null,'','?'+baseQuery+'v=20261113-f12-r1');render();
  };
  $('#replay').onclick=()=>{
    if(busy||!store.eligible()||read().step!=='museum')return;
    audio.unlock();
    if(revivalReady()){revive(true);return;}
    replayAfterLoad=true;
    prepareExcavation();
    updateRevivalButtons();
  };$('#closeFact').onclick=()=>$('#fact').close();
  $('#sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('#sound').textContent=audio.enabled?'声音开':'声音关';$('#sound').setAttribute('aria-pressed',String(audio.enabled));};
  $('#back').onclick=e=>{flushBrush();if(!store.storageOK()){e.preventDefault();warning();}};
  window.addEventListener('pagehide',()=>{replayAfterLoad=false;flushBrush();cancelSequence();cancelDrag();extraTool?.reset();audio.stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){replayAfterLoad=false;flushBrush();cancelSequence();cancelDrag();extraTool?.reset();audio.stop();if(!awake)render();}else if(extraTool&&!awake&&!busy)render();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&extraTool&&!awake)render();});
  store.subscribe(warning);window.addEventListener('storage',()=>{cancelSequence();cancelDrag();render();});
  reduced.addEventListener('change',()=>{cancelDrag();if(reduced.matches){if(transition?.to==='puzzle')art.parts.forEach(landed);if(transition?.to==='revive'){[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));settleHero();}effects.reset();document.querySelectorAll('.flight-bone,.knock-impact,.knock-piece').forEach(e=>e.remove());document.querySelectorAll('.receiving').forEach(e=>e.classList.remove('receiving'));}});
  // Decode the first visible rock before requesting later phases. The child can
  // begin tapping while the rest of this fossil loads in the background.
  function startRemainingAssets(){
    assetsStarted=true;
    stageImages.forEach((image,i)=>{if(i!==initialStage){image.fetchPriority='low';image.src='./'+F.stages[i]+V;}});
    const face=$('#cleanFace');
    for(const id of ['sandSource','bowl','cleanFace','living'])$('#'+id).fetchPriority='low';
    $('#sandSource').src='./'+art.sand.file+V;$('#eggWhole').src='./'+F.stages[0]+V;$('#bowl').src='./'+art.bowl+V;
    if(cut&&!natural){
      face.hidden=true;
      const grooves=document.createElement('div');grooves.id='cutGrooves';grooves.hidden=true;
      grooves.append(...art.parts.map(p=>artImage(p,'')));face.after(grooves);
    }else face.src='./'+art.face.file+V;
    $('#living').src=F.living.file;$('#living').alt='从石板中复活的'+F.name;document.documentElement.style.setProperty('--living-r',(([w,h])=>w/h)(F.living.aspect.split('/')));
    $('#living').decode().then(()=>{revivalImageReady=true;updateRevivalButtons();playRequestedReplay();})
      .catch(()=>{revivalAssetsFailed=true;updateRevivalButtons();});
    for(const id of ['fossil-groove','fossil-bone-groove'])document.querySelectorAll('#'+id+' feFlood').forEach((el,i)=>el.setAttribute('flood-color',[F.groove.base,F.groove.inset,F.groove.light][i]));
    board.dataset.rock=F.rock;document.body.classList.toggle('wide-fossil',cut);document.body.classList.toggle('natural-fossil',natural);$('#tray').dataset.n=art.parts.length;$('#tray').setAttribute('aria-label','从石板中取出的 '+art.parts.length+' 块骨头');
    art.parts.forEach(part=>$('#slab').append(artImage(part,'assembled-bone')));if(natural)$('#slab').style.visibility='hidden';
    audio.prepareVoice();
    const imgs=art.parts.map(part=>{const img=new Image();img.fetchPriority='low';img.src='./art/'+part.file+V;partImages.set(part.id,img);return img;});
    const grooveImages=[...document.querySelectorAll('#cutGrooves img')];
    const rubbleImage=layered?new Image():null;
    if(rubbleImage)rubbleImage.src='./'+layered.file+V;
    stageImages.forEach((image,i)=>image.decode().then(()=>{
      readyStages.add(i);
      if(!busy&&view==='dig'&&read().step==='knock'&&stageIndex(current.hits)===i){
        if(!knockReady){knockReady=true;render();}
        else if(tide)renderTide();else if(tool)renderField();else paintShell();
      }
    }).catch(()=>{}));
    Promise.all([$('#eggWhole'),$('#bowl'),...(cut&&!natural?[]:[$('#cleanFace')]),$('#sandSource'),...stageImages,...imgs,...grooveImages,...(rubbleImage?[rubbleImage]:[]),...$('#slab').querySelectorAll('img')].map(i=>i.decode())).then(()=>{
      grooveImages.forEach(img=>{img.className='groove';img.style.filter='url("#fossil-bone-groove")';});
      if(cut&&!natural)$('#cutGrooves').hidden=false;
      sandBase=makeSand();assetsReady=true;updateRevivalButtons();if(!tide&&!tool&&read().step==='knock')paintSand();
      if(!knockReady){knockReady=true;render();}else if(waitingAssets&&!busy){waitingAssets=false;if((tide||tool)&&view==='dig')render();else status(`已经敲了 ${read().hits} / 6 下`);}
      playRequestedReplay();
    }).catch(()=>{if(cut&&!natural)$('#cutGrooves').hidden=true;revivalAssetsFailed=true;updateRevivalButtons();status('图片还没加载好，请刷新后再试');});
  }
  function prepareExcavation(){
    if(assetsLoading)return;
    assetsLoading=true;
    initialStage=stageIndex(read().hits);
    stageImages[initialStage].fetchPriority='high';
    stageImages[initialStage].src='./'+F.stages[initialStage]+V;
    stageImages[initialStage].decode().then(()=>{
      readyStages.add(initialStage);
      if(view==='dig'&&read().step==='knock'&&stageIndex(current.hits)===initialStage){
        knockReady=true;render();
      }
      startRemainingAssets();
    }).catch(()=>{revivalAssetsFailed=true;updateRevivalButtons();status('图片还没加载好，请刷新后再试');});
  }
  render();
  Object.defineProperty(window,'__fossil',{value:Object.freeze({get interactions(){return{landings:structuredClone(landings),dragStarts:structuredClone(dragStarts),readyParts:[...readyParts],dragging:drag?.id||null};},get effects(){return structuredClone(effects.stats);},get state(){return store.load();},get view(){return view;},get audio(){return audio.status();},get reduced(){return reduced.matches;},get awake(){return awake;},get selected(){return selected;},get ready(){return knockReady;},get brush(){return{coverage:store.coverage([...read().cleared,...pending]),strokes:brushStrokes,widthRatio:.12};},get transition(){return{active:busy,from:transition?.from,to:transition?.to,elapsed:transition?performance.now()-transition.start:0};},get transitions(){return structuredClone(transitions);}})});
})();
