(() => {
  const $ = (selector) => document.querySelector(selector);
  if (location.protocol === 'file:') {
    $('#fileNotice').hidden = false;
    $('#fileNoticeClose').addEventListener('click', () => { $('#fileNotice').hidden = true; });
  }
  const board = $('#board');
  const directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const axes = directions.slice(0, 3);
  const size = 62;
  const cells = [];
  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) <= 2) cells.push({ q, r, key: key(q, r) });
    }
  }
  const byKey = new Map(cells.map((cell) => [cell.key, cell]));
  const species = window.DINO_CHARACTERS;
  const newKinds = Object.keys(species).filter(kind => species[kind].expansion === '2026-10-17');
  const collectionKinds = Object.keys(species).sort((a, b) => Number(newKinds.includes(b)) - Number(newKinds.includes(a)) || Number(Boolean(species[b].isNew)) - Number(Boolean(species[a].isNew)));
  const introductions = Object.fromEntries(Object.entries(species).map(([kind, data]) => [kind, data.intro]));
  const eggImage = { image: 'egg-3d.webp', aspect: 1230 / 1278, height: 70, color: '#efe0af' };
  const ring = directions.map(([q, r]) => key(q, r));
  const levels = window.DINO_LEVELS.concat(window.DINO_CHALLENGES || [], window.DINO_GRADE2 || [], window.DINO_KNOWLEDGE || [], [
    { tag: '自由探险', title: '继续救出恐龙队伍', guidance: '放一对，连三只。看看能救出多少队。',
      mode: 'free', goal: Infinity, goalLabel: '救出队伍', discovery: '',
      cheer: '你救出了好多伙伴，再挑战一次吧！',
      seed: [['0,0', 'trike'], ['-1,1', 'stego'], ['1,-1', 'raptor']], pairs: [['trike', 'trike']] }
  ]);
  const adventureCount = levels.length - 1;
  const progressKey = 'dino-math-island-unlocked-v3';
  const currentLevelKey = window.DINO_KNOWLEDGE?.length ? 'dino-math-island-current-v6' : window.DINO_GRADE2?.length ? 'dino-math-island-current-v5' : 'dino-math-island-current-v3';
  const completedKey = 'dino-math-island-completed-v4';
  let completedCache;
  function unlockedLevel() {
    try { return Math.min(adventureCount, Math.max(0, Number(localStorage.getItem(progressKey)) || 0)); }
    catch (_) { return 0; }
  }
  function saveProgress(nextLevel) {
    try { localStorage.setItem(progressKey, String(Math.max(unlockedLevel(), nextLevel))); }
    catch (_) {}
  }
  function completedLevels() {
    if (!completedCache) {
      let saved;
      try { saved = JSON.parse(localStorage.getItem(completedKey)); } catch (_) {}
      completedCache = new Set(Array.isArray(saved) ? saved.filter(index => Number.isInteger(index) && index >= 0 && index < adventureCount) : Array.from({ length: Math.floor(unlockedLevel()) }, (_, index) => index));
      try { localStorage.setItem(completedKey, JSON.stringify([...completedCache])); } catch (_) {}
    }
    return new Set(completedCache);
  }
  function markCompleted(index) {
    completedLevels();
    if (Number.isInteger(index) && index >= 0 && index < adventureCount) completedCache.add(index);
    try { localStorage.setItem(completedKey, JSON.stringify([...completedCache].sort((a,b) => a-b))); } catch (_) {}
  }
  const courseCompleted = () => completedLevels().size === adventureCount;
  function resumeLevel() {
    try {
      const saved = localStorage.getItem(currentLevelKey);
      if (saved !== null && Number.isInteger(Number(saved))) return Math.min(adventureCount, Math.max(0, Number(saved)));
      if (window.DINO_KNOWLEDGE?.length) {
        const previous=localStorage.getItem('dino-math-island-current-v5');
        if(previous!==null && Number.isInteger(Number(previous))) return Number(previous)===110?adventureCount:Math.max(0,Math.min(109,Number(previous)));
      }
      const legacy = localStorage.getItem('dino-math-island-current-v3');
      if (window.DINO_GRADE2?.length && legacy !== null && Number.isInteger(Number(legacy))) return Number(legacy) === 70 ? adventureCount : Math.min(69,Math.max(0,Number(legacy))); 
    } catch (_) {}
    return unlockedLevel();
  }
  const practiceKey='dino-math-practice-v1';
  let practiceRoute=null;
  try {
    const saved=JSON.parse(localStorage.getItem(practiceKey));
    if(saved && Array.isArray(saved.indices) && saved.indices.length && saved.indices.every(i=>Number.isInteger(i)&&i>=0&&i<adventureCount)) practiceRoute={...saved,indices:[...new Set(saved.indices)]};
  } catch(_) {}
  function setPractice(route) {
    practiceRoute=route?.indices?.length?route:null;
    try { if(practiceRoute)localStorage.setItem(practiceKey,JSON.stringify(practiceRoute));else localStorage.removeItem(practiceKey); } catch(_) {}
  }
  const practicePosition=()=>practiceRoute?.indices.indexOf(state.level)??-1;
  const regions = ['火山双瀑谷', '蕨叶森林', '碧蓝湖湾', '红岩峡谷', '彩虹花谷', '巨杉秘境', '晨雾溪谷', '高山湖畔', '琥珀海湾', '阳光花海'];
  const scenes = levels.map((level, index) => window.dinoSceneForLevel?.(index) || ({
    name: level.mode === 'free' ? '自由恐龙岛' : regions[level.sceneIndex],
    image: 'scenes-v2/scene-' + String((level.sceneIndex ?? 0) + 1).padStart(2, '0') + '.webp',
    position: 'center center',
    filter: 'brightness(' + (1 + (index % 5) * .008).toFixed(3) + ') saturate(' + (1 + (index % 5) * .012).toFixed(3) + ')'
  }));
  let scenePreload;
  function preloadScene(levelIndex) {
    const image = scenes[levelIndex]?.image;
    if (!image || image === scenes[state.level].image || typeof Image !== 'function') return;
    scenePreload = new Image();
    scenePreload.fetchPriority = 'low';
    scenePreload.src = './assets/' + image;
  }
  let state;
  let roundToken = 0;
  let idleTimer, reactionTimer, finishTimer, entryTimer, countTimer, skipWarmupOnce = false, storyTold = false;
  const answerRecords = new Map();
  const greetingTokens = new Map();
  let greetingSequence = 0;
  let toastTimer;
  let dragStart = null;
  let dragGhost = null;
  let dragging = false;
  let soundOn = true;
  try { soundOn = localStorage.getItem('dino-island-sound') !== 'off'; } catch (_) {}
  const islandAudio = window.createIslandAudio?.({ enabled: soundOn });
  let audioContext;
  const narration = new Audio();
  narration.preload = 'none';
  let narrationTimer;
  let narrationPlayToken = 0;
  const galleryNarration = new Audio();
  galleryNarration.preload = 'none';
  const taskNarration = new Audio();
  taskNarration.preload = 'metadata';
  const guidanceNarration = new Audio();
  guidanceNarration.preload = 'metadata';
  let guidancePending = null, guidancePlayback = null, guidanceEndTimer;
  let guidancePlayToken = 0, guidanceRound = -1, guidancePhase = '';
  let taskPlayToken = 0;
  let chapterPlayToken = 0;
  let wrongPlayToken = 0;
  const voiceVersion = '?v=20261110-st1-r1';
  const wrongNarration = new Audio();
  wrongNarration.preload = 'none';
  wrongNarration.src = './assets/voice/wrong-answer.m4a' + voiceVersion;
  const chapterNarration = new Audio();
  chapterNarration.preload = 'none';
  chapterNarration.src = './assets/voice/' + (window.DINO_KNOWLEDGE?.length ? 'knowledge-complete.m4a' : window.DINO_GRADE2?.length ? 'grade2-complete.m4a' : 'chapter2-complete.m4a') + voiceVersion;
  let gallerySelected = 'styraco';
  let galleryAudioKind = '';
  let galleryPlayToken = 0;
  const fossilNarration = new Audio();
  fossilNarration.preload = 'none';
  let fossilCuePending = false;
  const voicePlayers = [narration, galleryNarration, taskNarration, wrongNarration, chapterNarration, guidanceNarration, fossilNarration];
  voicePlayers.forEach((audio) => $('#soundscape').appendChild(audio));
  const syncVoiceMix = () => islandAudio?.setNarrating(voicePlayers.some((audio) => !audio.paused && !audio.ended));
  voicePlayers.forEach((audio) => {
    ['play', 'playing', 'pause', 'ended', 'error', 'abort', 'emptied'].forEach((event) => audio.addEventListener(event, syncVoiceMix));
  });
  function stopOtherVoices(keep) {
    if (keep !== narration) stopNarration();
    if (keep !== galleryNarration) stopGalleryNarration();
    if (keep !== taskNarration) stopTaskNarration();
    if (keep !== guidanceNarration) stopGuidanceNarration();
    if (keep !== chapterNarration) stopChapterNarration();
    if (keep !== wrongNarration) { wrongPlayToken++; wrongNarration.pause(); }
    syncVoiceMix();
  }
  function setSound(enabled) {
    soundOn = Boolean(enabled);
    try { localStorage.setItem('dino-island-sound', soundOn ? 'on' : 'off'); } catch (_) {}
    $('#soundButton').textContent = soundOn ? '🔊' : '🔇';
    $('#soundButton').setAttribute('aria-label', soundOn ? '关闭所有声音' : '开启声音');
    $('#soundButton').setAttribute('aria-pressed', String(soundOn));
    $('#soundButton').title = soundOn ? '关闭恐龙音效和语音' : '开启恐龙音效和语音';
    islandAudio?.setEnabled(soundOn);
    if (!soundOn) { stopOtherVoices(); audioContext?.suspend(); }
    $('#guidance').dataset.muted = String(!soundOn);
    $('#guidance').setAttribute('aria-label', $('#guidance').textContent + (soundOn ? '，点按重听当前提示' : '，声音已关闭'));
    $('#guidance').title = soundOn ? '点按重听当前提示' : '声音已关闭';
  }

  function key(q, r) { return q + ',' + r; }
  function neighbor(cellKey, direction) {
    const cell = byKey.get(cellKey);
    return cell && key(cell.q + direction[0], cell.r + direction[1]);
  }
  function worldPosition(cell) {
    return { x: 300 + Math.sqrt(3) * size * (cell.q + cell.r / 2), y: 265 + 1.5 * size * cell.r };
  }
  function project(x, y) {
    const depth = (y - 265) / 265;
    const scale = 1 / (1 - .23 * depth);
    return { x: 300 + (x - 300) * scale, y: 265 + (y - 265) * .42 * scale, scale };
  }
  function position(cell) {
    const { x, y } = worldPosition(cell);
    return project(x, y);
  }
  function points(x, y, radius) {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (-90 + i * 60) * Math.PI / 180;
      return (x + radius * Math.cos(angle)).toFixed(1) + ',' + (y + radius * Math.sin(angle)).toFixed(1);
    }).join(' ');
  }
  function boardVertices(cell, radius = size - 1) {
    const { x, y } = worldPosition(cell);
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (-90 + i * 60) * Math.PI / 180;
      return project(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    });
  }
  function vertexString(vertices, yOffset = 0) {
    return vertices.map((vertex) => vertex.x.toFixed(1) + ',' + (vertex.y + yOffset).toFixed(1)).join(' ');
  }
  const mathSeedOrder = ['0,0', '1,0', '0,1', '-1,1', '-1,0', '0,-1', '1,-1', '2,-1', '1,1', '-2,1'];
  const mathSpreadOrder = ['0,0', '-2,0', '2,0', '-1,0', '1,0', '-2,2', '0,2', '-1,2', '0,-2', '2,-2'];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  const idleActions = ['nod', 'hop', 'look', 'graze'];
  function stopIdleReaction() {
    if (!state?.idleKey) return;
    state.reacting.delete(state.idleKey);
    greetingTokens.delete(state.idleKey);
    board.querySelectorAll('[data-key="' + state.idleKey + '"]').forEach(node => {
      node.classList.remove('responding', 'idle-acting');
      delete node.dataset.idleAction;
    });
    state.idleKey = null;
    state.idleAction = null;
  }
  function clearBoardReactions() {
    clearTimeout(idleTimer);
    clearTimeout(reactionTimer);
    clearTimeout(finishTimer);
    clearTimeout(entryTimer);
    clearTimeout(countTimer);
    if (!state) return;
    state.countingTogether = false;
    stopIdleReaction();
    state.thinking = false;
    state.celebrating = false;
    state.reacting.clear();
    greetingTokens.clear();
  }
  function scheduleIdleReaction() {
    clearTimeout(idleTimer);
    if (reducedMotion || !state || state.complete || currentLevel().mode !== 'math' || document.hidden) return;
    const token = roundToken;
    idleTimer = setTimeout(() => {
      if (token !== roundToken) return;
      const busy = reducedMotion || state.phase !== 'play' || state.error ||
        state.animating || state.thinking || state.celebrating || state.entering.size ||
        state.landing.size || state.departing.size || state.reacting.size || dragging || dragStart ||
        voicePlayers.some(audio => !audio.paused && !audio.ended) ||
        levelPicker?.visible || !$('#collectionOverlay').hidden ||
        (window.DinoBoot && !$('#bootCover').hidden);
      if (!busy && !document.hidden && !state.complete && state.tiles.size) {
        const keys = [...state.tiles.keys()];
        const cellKey = keys[Math.floor(Math.random() * keys.length)];
        greetDino(cellKey, true, idleActions[Math.floor(Math.random() * idleActions.length)]);
      }
      scheduleIdleReaction();
    }, 5000 + Math.floor(Math.random() * 4001));
  }
  // An autonomous greeting never competes with a spoken task or story.
  voicePlayers.forEach(audio => audio.addEventListener('play', stopIdleReaction));
  const rewardStory = window.createDinoStory({
    audio: narration, caption: $('#dinoFact'), steps: $('#factStorySteps'), portrait: $('#factHello'), nickname: $('#factNickname'),
    onListen: (part) => { setSound(true); playNarration(false, part); },
    onGreeting: (kind) => islandAudio?.creature(kind, 'touch'), reducedMotion
  });
  const galleryStory = window.createDinoStory({
    audio: galleryNarration, caption: $('#collectionIntro'), steps: $('#collectionStorySteps'), portrait: $('#collectionHello'), nickname: $('#collectionNickname'),
    onListen: (part) => playGalleryNarration(part),
    onGreeting: (kind) => islandAudio?.creature(kind, 'touch'), reducedMotion
  });
  const challengeView = window.createDinoChallengeView?.({
    mount: $('.playfield'), characters: species, onAction: challengeAction
  });
  const gradeTwoView = window.createGradeTwoView?.({ mount: $('.playfield'), characters: species, onAction: challengeAction });
  const knowledgeView=window.createKnowledgeView?.({mount:$('.playfield'),characters:species,onAction:challengeAction});
  const levelPicker = window.createLevelPicker?.({
    levels: levels.slice(0,adventureCount), characters: species, completed: completedLevels, current: () => state.level,
    onOpen: () => { stopIdleReaction(); stopOtherVoices(); islandAudio?.reset(); $('#collectionOverlay').hidden = true; $('.app').inert = true; },
    onClose: () => { $('.app').inert = false; },
    onChoose: (index,route) => { setPractice(route); start(index, true, false); $('#taskSpeakButton').focus(); }
  });
  function challengeAction(action, value) {
    if (currentLevel().mode !== 'challenge' || state.complete) return;
    if (action === 'restart') { start(state.level, true); return; }
    const result = window.DinoChallengeEngine.act(state.challenge, action, value);
    state.error = state.challenge.error;
    state.feedback = state.challenge.feedback;
    if (result.complete) { wrongNarration.pause(); finish(); return; }
    if (result.wrong) {
      stopOtherVoices(wrongNarration);
      tone([294, 247]);
      playWrongNarration();
    } else if (result.changed) {
      wrongNarration.pause();
      if (action !== 'undo') islandAudio?.creature(currentLevel().factKind, 'touch');
    }
    if (currentLevel().grade === 2 && currentLevel().challengeType !== 'knowledge' && result.changed) {
      const clip = state.challenge.phase === 'answer' ? 'grade2-answer-' + currentLevel().challengeType + '.m4a' : currentLevel().taskFile;
      if (!taskNarration.src.includes(clip)) {
        stopTaskNarration(); taskNarration.src = './assets/voice/' + clip + voiceVersion; taskNarration.load();
        if (state.challenge.phase === 'answer' && soundOn) playTaskNarration();
      }
    }
    render();
  }
  function rewardVoiceFile(level = currentLevel()) {
    return level.mode === 'challenge' ? 'gallery-' + level.factKind + '.m4a' : 'level-' + String(state.level + 1).padStart(2, '0') + '.m4a';
  }
  const arrivalMs = () => reducedMotion ? 0 : 900;
  function mathSeed(level) { return (Math.max(level.start, level.goal) <= 5 ? mathSeedOrder : mathSpreadOrder).slice(0, level.start).map((cellKey) => [cellKey, level.factKind]); }
  // Before the child acts the words ask for the action; only after it are they told what happened.
  function actionPrompt(level, remaining) {
    if (level.op === '+') return state.pieceIndex ? '再点 ' + remaining + ' 下，还有 ' + remaining + ' 只要来' : '点一下，让 ' + remaining + ' 只恐龙来';
    return state.pieceIndex ? '再点 ' + remaining + ' 只，让' + (remaining > 1 ? '它们' : '它') + '跑掉' : '点一只恐龙，让它跑掉';
  }
  function answerPrompt(level) {
    if (!level.change) return level.op === '+' ? '现在一共有几只？' : '现在还剩几只？';
    return level.op === '+' ? '来了 ' + level.change + ' 只！现在一共有几只？' : '跑掉了 ' + level.change + ' 只！还剩几只？';
  }
  function mathGuidance(level) {
    const name = species[level.factKind].name;
    return level.op === '+' ? '岛上有 ' + level.start + ' 只' + name + '。一只一只来 ' + level.change + ' 只。'
      : '岛上有 ' + level.start + ' 只' + name + '。一只一只让它们跑掉 ' + level.change + ' 只。';
  }
  function mathEquation(level, reveal = false) { return level.start + ' ' + level.op + ' ' + level.change + ' = ' + (reveal ? level.goal : '?'); }
  function pictureEquation(level) {
    const image = './assets/' + species[level.factKind].image;
    // Digits and pictures are separate rows, so a wide group of pictures cannot
    // open a gap between a number and its sign or move the answer box.
    const group = number => '<span class="operand-pictures" style="--picture-columns:' + Math.max(1, Math.min(5, number)) + '" aria-hidden="true">' +
      (number === 0 ? '<span class="zero-picture">○</span>' : Array.from({ length: number }, () => '<img src="' + image + '" alt="">').join('')) + '</span>';
    // Drawn bars, so plus, minus and equals share one width and weight in every font.
    const sign = (name, label) => '<span class="equation-symbol equation-sign ' + name + '" role="img" aria-label="' + label + '"><i></i>' + (name === 'minus' ? '' : '<i></i>') + '</span>';
    return '<span class="picture-equation"><span class="equation-row"><b>' + level.start + '</b>' + (level.op === '+' ? sign('plus', '加') : sign('minus', '减')) + '<b>' + level.change + '</b>' + sign('equals', '等于') + '<span class="answer-blank">' + (state.complete ? level.goal : '?') + '</span></span><span class="equation-pictures">' + group(level.start) + '<span class="change-operand">' + group(level.change) + '</span></span></span>';
  }
  function readyToAnswer() {
    const level = currentLevel();
    if (level.mode !== 'math' || state.pieceIndex !== level.change || state.tiles.size !== level.goal || state.animating) return;
    state.phase = 'answer';
    state.hover = null;
    state.hint = [];
    state.feedback = '数一数棋盘，再点数字。';
    state.error = false;
  }
  function currentLevel() { return levels[state.level]; }
  function smallBoard() { const level = currentLevel(); return level.mode === 'math' && Math.max(level.start, level.goal) <= 5; }
  function activeCells() { return smallBoard() ? cells.filter((cell) => Math.max(Math.abs(cell.q), Math.abs(cell.r), Math.abs(cell.q + cell.r)) <= 1) : cells; }
  function pairAt(index) {
    const level = currentLevel();
    if (level.mode === 'math') return [level.factKind];
    if (level.mode === 'free') return [state.selectedSpecies, state.selectedSpecies];
    const pairs = currentLevel().pairs;
    return pairs[index % pairs.length];
  }
  function shadowDefs(prefix) {
    return '<defs><radialGradient id="' + prefix + '-foot-contact">' +
      '<stop offset="0" stop-color="#172018" stop-opacity=".68"/>' +
      '<stop offset=".32" stop-color="#172018" stop-opacity=".43"/>' +
      '<stop offset=".72" stop-color="#172018" stop-opacity=".12"/>' +
      '<stop offset="1" stop-color="#172018" stop-opacity="0"/></radialGradient></defs>';
  }
  function figure(kind, x, y, scale = 1, prefix = 'board') {
    const data = kind === 'egg' ? eggImage : kind === 'hatch' ? species.brachio : species[kind];
    if (!data) return '';
    const height = data.height * scale * (kind === 'hatch' ? .72 : 1);
    const width = height * data.aspect;
    const bottom = y + (kind === 'ptero' ? 8 : 12 * scale);
    // Read from each PNG's alpha>=64 bottom 1.8% band: nearest foot center,
    // opaque bottom and foot width. These are measurements, not edited images.
    const ground = {
      trike: [.5328,.9755,.1718], stego: [.6545,.9688,.1348], brachio: [.7521,.98,.1547],
      raptor: [.3828,.9664,.0911], trex: [.4423,.982,.168], anky: [.6839,.9459,.134],
      parasaur: [.642,.98,.1537], spino: [.5001,.9312,.0485], pachy: [.4634,.988,.2157],
      iguano: [.4661,.9865,.126], carno: [.3326,.992,.2508], allo: [.4029,.982,.09],
      dilo: [.4791,.9805,.088], diplo: [.5663,.878,.163], oviraptor: [.6175,.97,.4373],
      ptero: [.4889,.8777,.0247], styraco: [.5951,.9872,.1938], proto: [.5869,.9668,.1659],
      psittaco: [.4342,.9773,.1681], kentro: [.6763,.9474,.1491], therizino: [.4667,.9886,.3137],
      amarga: [.6784,.9773,.1288], lambeo: [.4622,.9869,.1616], nodo: [.6445,.9535,.1505],
      struthio: [.4402,.9895,.3496], compso: [.5495,.9668,.0815], cerato: [.5967,.9485,.4658],
      bary: [.3518,.9808,.1136], egg: [.4615,.903,.1244]
    }[kind === 'hatch' ? 'brachio' : kind] || data.ground || [.5,.98,.16];
    const left = x - width / 2;
    const top = bottom - height * (data.ground ? ground[1] : 1);
    const imageBox = ' href="./assets/' + data.image + '" x="' + left.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + width.toFixed(1) + '" height="' + height.toFixed(1) + '"';
    // Each visible supporting sole has its own measured contact. A single
    // central ellipse left the other feet floating, while the compressed
    // whole-body projection extended far beyond where the feet touch.
    const contacts = window.DINO_GROUND_DATA?.[kind === 'hatch' ? 'brachio' : kind]?.contacts || (kind === 'ptero' ? [] : [ground]);
    const contactShadows = contacts.map(([cx, cy, soleWidth], index) => {
      const footWidth = width * soleWidth;
      const radiusX = footWidth * .63 + .45 * scale;
      const radiusY = Math.max(1.2 * scale, Math.min(footWidth * .16, 2.5 * scale));
      return '<ellipse class="foot-contact" data-foot-index="' + index + '" pointer-events="none" cx="' + (left + width * cx).toFixed(2) + '" cy="' + (top + height * cy - .15 * scale).toFixed(2) + '" rx="' + radiusX.toFixed(2) + '" ry="' + radiusY.toFixed(2) + '" fill="url(#' + prefix + '-foot-contact)"/>';
    }).join('');
    return '<g class="dino-actor"><g class="ground-shadow" aria-hidden="true" pointer-events="none">' +
      contactShadows + '</g>' +
      '<image class="tile-image"' + imageBox + ' style="--foot-x:' + (ground[0]*100).toFixed(2) + '%;--foot-y:' + (ground[1]*100).toFixed(2) + '%"/></g>';
  }
  function boardTile(kind, cell, className, dataKey = '') {
    const { x, y, scale } = position(cell);
    const vertices = boardVertices(cell);
    const fill = (species[kind] || (kind ? eggImage : null))?.color;
    const counted = state.countOrder?.indexOf(cell.key) ?? -1;
    const label = kind === 'egg' ? '恐龙蛋' : kind === 'hatch' ? '刚孵出的恐龙宝宝' : kind ? (counted >= 0 ? '第 ' + (counted + 1) + ' 只' : '') + species[kind].name + (currentLevel().mode === 'math' ? state.phase === 'answer' ? '，数一数' : currentLevel().op === '-' ? '，让它跑掉' : '，打个招呼' : '，打个招呼') : '空格';
    const mathPopulation = Math.max(currentLevel().start || 0, currentLevel().goal || 0, state.progress || 0);
    const mathSize = .8 * (smallBoard() ? .99 : Math.max(1.06, 1.18 - (mathPopulation - 6) * .018)) * (!smallBoard() && cell.r < 0 ? .82 : 1);
    const figureScale = scale * (currentLevel().mode === 'math' ? mathSize : 1);
    const entryIndex = state.landing.has(cell.key) ? [...state.landing].indexOf(cell.key) : state.entering.has(cell.key) ? [...state.entering].indexOf(cell.key) : 0;
    const idleOffset = Math.max(0, cells.findIndex(other => other.key === cell.key));
    const greeting = species[kind]?.greeting || 'nod';
    const idleAction = state.idleKey === cell.key ? state.idleAction : null;
    // Start the incoming animal beyond the nearest SVG board edge.
    const entryX = (x <= 300 ? (smallBoard() ? 10 : -100) : (smallBoard() ? 590 : 700)) - x;
    const celebrationIndex = Math.max(0, [...state.tiles.keys()].indexOf(cell.key));
    const celebrationDelay = Math.min(180, celebrationIndex * 20);
    const dust = '<g class="landing-dust" aria-hidden="true" pointer-events="none" transform="translate(' + x.toFixed(1) + ' ' + (y + 10 * scale).toFixed(1) + ')">' +
      '<g><ellipse cx="-13" cy="0" rx="12" ry="4"/><ellipse cx="5" cy="-2" rx="15" ry="5"/><ellipse cx="24" cy="1" rx="9" ry="3"/></g></g>';
    const stars = state.celebrating && kind ? '<g class="celebration-stars" aria-hidden="true" pointer-events="none" transform="translate(' + x.toFixed(1) + ' ' + (y - species[kind].height * scale * mathSize - 2).toFixed(1) + ')">' +
      [-1, 0, 1].map((direction) => '<text x="' + (direction * 18) + '" y="0" style="--star-x:' + (direction * 14) + 'px">✦</text>').join('') + '</g>' : '';
    return '<g class="' + className + '" data-greeting="' + greeting + '"' + (idleAction ? ' data-idle-action="' + idleAction + '"' : '') + ' style="--entry-x:' + entryX.toFixed(1) + 'px;--celebration-delay:' + celebrationDelay + 'ms;--entry-delay:' + (entryIndex * 65) + 'ms;--idle-delay:-' + (idleOffset * .163).toFixed(3) + 's"' + (dataKey ? ' data-key="' + dataKey + '" role="button" tabindex="0" aria-label="' + label + '"' : '') + '>' +
      '<polygon class="tile-base" points="' + vertexString(vertices) + '"' + (fill ? ' style="fill:' + fill + ';fill-opacity:' + (className.includes('newcomer') ? '.22' : '.08') + '"' : '') + '/>' +
      '<polygon class="tile-outline" points="' + vertexString(vertices) + '"/>' +
      (kind && className.includes('math-dino') && className.includes('landing') ? dust : '') +
      (kind ? figure(kind, x, y, figureScale) : '') +
      stars +
      (kind ? '<ellipse class="greeting-ripple" cx="' + x.toFixed(1) + '" cy="' + (y + 10 * scale).toFixed(1) + '" rx="' + (28 * scale).toFixed(1) + '" ry="' + (8 * scale).toFixed(1) + '"/>' : '') +
      // The foot anchor follows mathSize; the symbol can grow independently
      // when its screen radius would be too small to read on a phone.
      (className.includes('newcomer') ? '<g class="addition-mark" data-x="' + x + '" data-y="' + y + '" data-figure-scale="' + figureScale + '" transform="translate(' + (x - 20 * figureScale).toFixed(3) + ' ' + (y + 7 * figureScale).toFixed(3) + ') scale(' + figureScale.toFixed(6) + ')"><circle cx="0" cy="0" r="11"/><text x="0" y="6">+</text></g>' : '') +
      (counted >= 0 ? '<g class="count-badge"><circle cx="' + (x + 31 * scale).toFixed(1) + '" cy="' + (y - 32 * scale).toFixed(1) + '" r="' + (18 * scale).toFixed(1) + '"/><text x="' + (x + 31 * scale).toFixed(1) + '" y="' + (y - 26 * scale).toFixed(1) + '">' + (counted + 1) + '</text></g>' : '') + '</g>';
  }
  function fitAdditionMarks() {
    const matrix = board.getScreenCTM?.();
    if (!matrix) return;
    const pixelsPerUnit = Math.min(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d));
    if (!(pixelsPerUnit > 0)) return;
    board.querySelectorAll('.addition-mark').forEach((mark) => {
      const x = Number(mark.dataset.x), y = Number(mark.dataset.y);
      const figureScale = Number(mark.dataset.figureScale);
      // A small rounding margin keeps getBoundingClientRect's radius >= 9px.
      const symbolScale = Math.max(figureScale, 9.05 / (11 * pixelsPerUnit));
      const dx = -20 * figureScale, dy = 7 * figureScale;
      const polygon = mark.parentNode.querySelector('.tile-base').points;
      const stroke = parseFloat(getComputedStyle(mark.querySelector('circle')).strokeWidth) || 0;
      const outerRadius = (11 + stroke / 2) * symbolScale + .25 / pixelsPerUnit;
      // Keep as much of the existing foot offset as fits. Only an enlarged
      // symbol moves inward, toward its own cell center, never toward a neighbor.
      let offset = 1;
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
        const distance = (x - a.x) * nx + (y - a.y) * ny;
        const outward = dx * nx + dy * ny;
        if (outward < 0) offset = Math.min(offset, (distance - outerRadius) / -outward);
      }
      offset = Math.max(0, offset);
      mark.setAttribute('transform', 'translate(' + (x + dx * offset).toFixed(6) + ' ' + (y + dy * offset).toFixed(6) + ') scale(' + symbolScale.toFixed(6) + ')');
    });
  }
  function pieceTile(kind, x, y, radius, prefix) {
    const fill = species[kind].color;
    return '<g class="piece-tile"><polygon class="tile-side" points="' + points(x, y + 6, radius - 1) + '"/>' +
      '<polygon class="tile-base" points="' + points(x, y, radius - 1) + '" style="fill:' + fill + ';fill-opacity:.7"/>' +
      '<polygon class="tile-outline" points="' + points(x, y, radius - 1) + '"/>' +
      figure(kind, x, y, .95, prefix) + '</g>';
  }
  function pieceSvg(prefix) {
    const pair = pairAt(state.pieceIndex);
    const [first, second] = pair;
    const radius = 37;
    const x1 = pair.length === 1 ? 110 : 77, x2 = x1 + Math.sqrt(3) * radius, y = 65;
    return '<svg viewBox="0 0 220 110" aria-hidden="true">' +
      shadowDefs(prefix) + pieceTile(first, x1, y, radius, prefix) + (second ? pieceTile(second, x2, y, radius, prefix) : '') + '</svg>';
  }
  function ruleArt(level) {
    if (level.mode === 'math') {
      const occupied = state.progress;
      const slots = Array.from({ length: 10 }, (_, index) => {
        const x = 29 + index % 5 * 40, y = 24 + Math.floor(index / 5) * 42;
        const present = index < occupied;
        const image = present ? '<image href="./assets/' + species[level.factKind].image + '" x="' + (x - 16) + '" y="' + (y - 20) + '" width="32" height="35"/>' : '';
        return '<g class="math-slot"><rect x="' + (x - 17) + '" y="' + (y - 17) + '" width="34" height="34" rx="8"/>' + image + '</g>';
      }).join('');
      return '<svg viewBox="0 0 220 90" aria-hidden="true">' + slots + '</svg>';
    }
    const kind = level.factKind || 'trike';
    const hex = (x, y, imageKind = kind, target = false) => {
      const source = imageKind === 'egg' ? eggImage : species[imageKind];
      const height = imageKind === 'egg' ? 43 : 49;
      const width = Math.min(57, height * source.aspect);
      return '<g class="demo-hex' + (target ? ' target' : '') + '"><polygon points="' + points(x, y, 22) + '"/>' +
        '<image href="./assets/' + source.image + '" x="' + (x - width / 2).toFixed(1) + '" y="' + (y - height / 2 - 5).toFixed(1) + '" width="' + width.toFixed(1) + '" height="' + height + '"/></g>';
    };
    let content = '';
    if (level.mode === 'egg') {
      const positions = [[151, 45], [130, 19], [90, 19], [69, 45], [90, 71], [130, 71]];
      const filled = level.seed.filter(([cellKey]) => ring.includes(cellKey)).length;
      content = positions.map(([x, y], index) => hex(x, y, kind, index >= filled)).join('') + hex(110, 45, 'egg');
    } else if (level.mode === 'mirror') {
      content = '<line class="demo-axis" x1="110" y1="4" x2="110" y2="86"/>' +
        [27, 65].map((y) => hex(68, y, kind, true) + hex(152, y, kind, true)).join('');
    } else if (level.mode === 'parallel') {
      content = '<path class="demo-guide" d="M 38 26 H 182 M 38 66 H 182"/>' +
        [26, 66].map((y) => [50, 110, 170].map((x, index) => hex(x, y, kind, index > 0)).join('')).join('');
    } else if (level.mode === 'line') {
      const count = level.matchSize || 3;
      const filled = Math.min(level.seed.filter(([, seedKind]) => seedKind === kind).length, count - 2);
      const startX = 110 - (count - 1) * 21;
      content = '<path class="demo-guide" d="M ' + (startX - 20) + ' 47 H ' + (startX + (count - 1) * 42 + 20) + '"/>' +
        Array.from({ length: count }, (_, i) => hex(startX + i * 42, 45, kind, i >= filled)).join('');
    } else {
      const count = level.matchSize || 3;
      const positions = [[58, 62], [102, 62], [80, 24], [124, 24], [146, 62]];
      const filled = Math.min(level.seed.filter(([, seedKind]) => seedKind === kind).length, count - 2);
      content = positions.slice(0, count).map(([x, y], index) => hex(x, y, kind, index >= filled)).join('');
    }
    return '<svg viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + content + '</svg>';
  }
  function footprint(anchor, orientation = state.orientation) {
    if (currentLevel().mode === 'math') return [anchor];
    return [anchor, neighbor(anchor, directions[orientation])];
  }
  function mirrorKey(cellKey) {
    const cell = byKey.get(cellKey);
    return cell ? key(-cell.q - cell.r, cell.r) : null;
  }
  function parallelTargets(progress = state.progress) {
    const column = progress - 1;
    return (currentLevel().parallelRows || [0, 1]).map((row) => key(column, row));
  }
  function canPlace(anchor, orientation = state.orientation) {
    if (!byKey.has(anchor)) return false;
    if (smallBoard() && !activeCells().some((cell) => cell.key === anchor)) return false;
    const keys = footprint(anchor, orientation);
    const [first, second] = keys;
    if (keys.some((cellKey) => !cellKey || !byKey.has(cellKey))) return false;
    const level = currentLevel();
    const mode = level.mode;
    if (mode === 'challenge') return false;
    if (mode === 'math') {
      if (state.phase !== 'play' || state.pieceIndex >= level.change) return false;
      if (level.op === '-') return state.progress > 0 && state.tiles.get(first) === level.factKind;
      if (state.progress >= 10 || state.tiles.has(first)) return false;
      return true;
    }
    if (!second || state.tiles.has(first) || state.tiles.has(second)) return false;
    if (mode === 'egg' && (!ring.includes(first) || !ring.includes(second))) return false;
    if (mode === 'mirror' && (first === second || second !== mirrorKey(first))) return false;
    if (mode === 'parallel') {
      const [targetFirst, targetSecond] = parallelTargets();
      if (first !== targetFirst || second !== targetSecond) return false;
    }
    return true;
  }
  function findClusters(tiles) {
    const visited = new Set();
    const groups = [];
    for (const [start, kind] of tiles) {
      if (kind === 'egg' || kind === 'hatch' || visited.has(start)) continue;
      const stack = [start], members = [];
      visited.add(start);
      while (stack.length) {
        const here = stack.pop();
        members.push(here);
        for (const direction of directions) {
          const other = neighbor(here, direction);
          if (other && !visited.has(other) && tiles.get(other) === kind) {
            visited.add(other);
            stack.push(other);
          }
        }
      }
      if (members.length >= (currentLevel().matchSize || 3)) groups.push(members);
    }
    return groups;
  }
  function findLines(tiles) {
    const groups = [];
    for (const [start, kind] of tiles) {
      if (kind === 'egg' || kind === 'hatch') continue;
      for (const [dq, dr] of axes) {
        const before = neighbor(start, [-dq, -dr]);
        if (before && tiles.get(before) === kind) continue;
        const line = [start];
        let cursor = start;
        while (true) {
          const next = neighbor(cursor, [dq, dr]);
          if (!next || tiles.get(next) !== kind) break;
          line.push(next);
          cursor = next;
        }
        if (line.length >= (currentLevel().matchSize || 3)) groups.push(line);
      }
    }
    return groups;
  }
  function findMatches(tiles) {
    return currentLevel().mode === 'line' ? findLines(tiles) : findClusters(tiles);
  }
  function setScene(levelIndex) {
    const scene = scenes[Math.min(levelIndex, scenes.length - 1)];
    $('#sceneLabel').textContent = scene.name;
    window.dinoAmbient?.setScene(scene, levelIndex < 50);
    const visible = document.querySelector('.scene-backdrop.is-visible');
    if (visible?.dataset.scene === scene.image) return;
    const incoming = visible?.id === 'sceneA' ? $('#sceneB') : $('#sceneA');
    incoming.style.backgroundImage = 'url("./assets/' + scene.image + '")';
    incoming.style.backgroundPosition = scene.position || 'center 46%';
    incoming.style.backgroundSize = scene.size || 'cover';
    incoming.style.filter = scene.filter || 'none';
    incoming.dataset.scene = scene.image;
    incoming.classList.add('is-visible');
    visible?.classList.remove('is-visible');
  }
  function start(levelIndex, announce = false, showChapterChoice = true) {
    if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= levels.length) return;
    clearBoardReactions();
    levelPicker?.close(false);
    window.DinoWarmup?.close();
    const showWarmup = window.DinoWarmup && levelIndex === 0 && !practiceRoute && !skipWarmupOnce;
    skipWarmupOnce = false;
    stopNarration();
    stopGalleryNarration();
    stopTaskNarration();
    stopGuidanceNarration();
    stopChapterNarration();
    wrongNarration.pause();
    islandAudio?.reset();
    $('#collectionOverlay').hidden = true;
    roundToken++;
    dragGhost?.remove();
    dragGhost = null;
    dragStart = null;
    dragging = false;
    const level = levels[levelIndex];
    const warmupScene = './assets/' + (window.DINO_SCENES?.[11] || scenes[0]).image;
    wrongNarration.src = './assets/voice/' + (level.challengeType==='knowledge' ? 'knowledge-wrong.m4a' : level.grade === 2 ? 'grade2-wrong.m4a' : 'wrong-answer.m4a') + voiceVersion;
    const seed = level.mode === 'math' ? mathSeed(level) : level.seed;
    try { localStorage.setItem(currentLevelKey, String(levelIndex)); } catch (_) {}
    if (!showWarmup) setScene(levelIndex);
    // On public/mobile connections, give the current island and dinosaur priority.
    state = {
      level: levelIndex, tiles: new Map(seed), pieceIndex: 0, orientation: 0,
      progress: level.mode === 'math' ? level.start : level.mode === 'egg' ? ring.filter((cellKey) => level.seed.some(([seedKey]) => seedKey === cellKey)).length : level.mode === 'parallel' ? 1 : 0, rescued: 0, hover: null,
      hint: [], animating: false, complete: false, courseJustCompleted: false, bursting: new Set(), landing: new Set(), departing: new Set(), reacting: new Set(), entering: new Set(),
      undo: null, history: [], phase: level.mode === 'math' && level.change === 0 ? 'answer' : 'play', wrongAnswer: null, wrongTries: 0, wrongTypes: [], countingTogether: false, countOrder: [], initialKeys: new Set(seed.map(([cellKey]) => cellKey)),
      feedback: level.mode === 'math' ? (level.change === 0 ? '不用移动，选一个数字。' : level.op === '+' ? '恐龙就来了。' : '它就跑掉了。') : level.guidance,
      error: false, selectedSpecies: 'trike',
      thinking: false, celebrating: false, idleKey: null, idleAction: null,
      challenge: level.mode === 'challenge' ? window.DinoChallengeEngine.create(level) : null
    };
    $('#finish').hidden = true;
    $('#chapterGate').hidden = level.mode !== 'free' || !showChapterChoice || !courseCompleted();
    $('#effects').innerHTML = '';
    $('#boardToast').classList.remove('show');
    $('#boardToast').textContent = '';
    render();
    const introToken = roundToken;
    // The boot cover can wait for a slow image or for the child's first tap.
    // Start the visual entrance only after that cover has actually gone away.
    // Keep this callback synchronous so task audio retains the tap gesture.
    const enterLevel = (fromGesture = false) => {
      if (introToken !== roundToken) return;
      if (fromGesture) setSound(true);
      if (showWarmup) {
        window.DinoWarmup.open({
          scene: window.DinoBoot?.imageUrl?.(warmupScene) || warmupScene,
          image: window.DinoBoot?.imageUrl?.('./assets/' + species[level.factKind].image) || './assets/' + species[level.factKind].image,
          soundOn: () => soundOn,
          onDone: () => { if (introToken === roundToken) beginLevel(true); }
        });
        // The level-one board can load behind the warm-up once the player enters.
        setScene(levelIndex);
        return;
      }
      beginLevel(fromGesture);
    };
    const beginLevel = (fromGesture) => {
      if (!reducedMotion && seed.length) {
        state.entering = new Set(seed.map(([cellKey]) => cellKey));
        renderBoard();
        entryTimer = setTimeout(() => {
          if (introToken !== roundToken) return;
          state.entering.clear();
          board.querySelectorAll('.entering').forEach(element => element.classList.remove('entering'));
        }, 1350);
      }
      scheduleIdleReaction();
      if (seed.length || level.mode === 'challenge') islandAudio?.creature(level.factKind || seed[0][1], 'entrance');
      if (soundOn && (announce || fromGesture)) {
        const story = fromGesture && !storyTold && $('#chapterGate').hidden ? window.DinoStory?.opening() : null;
        if (fromGesture) storyTold = true;
        if (!$('#chapterGate').hidden) playChapterNarration();
        else if (story) playStoryThenTask(story);
        else playTaskNarration();
      }
    };
    taskNarration.preload = 'none';
    taskNarration.src = './assets/voice/' + (level.mode === 'math' && level.op === '-' && level.change > 0 ? 'task-run-' + String(level.id).padStart(2, '0') + '.m4a' : level.taskFile || (level.mode === 'free' ? 'task-free' : 'task-' + String(levelIndex + 1).padStart(2, '0')) + '.m4a') + voiceVersion;
    $('#taskSpeakButton').classList.add('needs-tap');
    if (window.DinoBoot) {
      const assets = [showWarmup ? warmupScene : './assets/' + scenes[levelIndex].image];
      if (level.factKind && species[level.factKind]) assets.push('./assets/' + species[level.factKind].image);
      $('.app').querySelectorAll('img, svg image').forEach(node => {
        if (!node.getClientRects().length || node.closest('[hidden]')) return;
        const path = node.getAttribute(node.tagName.toLowerCase() === 'image' ? 'href' : 'src');
        if (path) assets.push(path);
      });
      window.DinoBoot.prepareLevel(assets, enterLevel).then(() => {
        if (introToken !== roundToken || !soundOn || document.hidden) return;
        if (showWarmup) window.DinoWarmup.prepare();
        else if (taskNarration.paused && taskNarration.preload === 'none') {
          taskNarration.preload = 'auto';
        }
      });
    } else enterLevel();
  }
  function renderBoard() {
    const mode = currentLevel().mode;
    const visibleCells = activeCells();
    const suggestedOrder = smallBoard() ? [...visibleCells].sort((a,b) => position(b).y - position(a).y) : mathSpreadOrder.map((cellKey) => byKey.get(cellKey)).concat(visibleCells);
    const suggestion = mode === 'math' && state.phase === 'play' && !state.animating ? suggestedOrder.find((cell) => canPlace(cell.key))?.key : null;
    const paintOrder = [...visibleCells].sort((a, b) => position(a).y - position(b).y);
    let content = paintOrder.map((cell) => {
      const kind = state.tiles.get(cell.key);
      const classes = ['cell', kind ? 'filled' : 'empty'];
      if (mode === 'math' && kind) classes.push('math-dino');
      if (mode === 'math' && kind && state.thinking) classes.push('thinking');
      if (mode === 'math' && kind && state.celebrating) classes.push('celebrating');
      if (kind === 'egg' || kind === 'hatch') classes.push('egg');
      if (mode === 'math' && currentLevel().op === '+' && kind && !state.initialKeys.has(cell.key)) classes.push('newcomer');
      if (mode === 'math' && currentLevel().op === '-' && !kind && state.initialKeys.has(cell.key)) classes.push('departed');
      if (mode === 'parallel' && parallelTargets().includes(cell.key) && !kind) classes.push('path-target');
      if (state.hint.includes(cell.key)) classes.push('hint');
      if (suggestion === cell.key && currentLevel().op === '+') classes.push('suggested');
      if (state.countOrder.includes(cell.key)) classes.push('counted');
      if (state.bursting.has(cell.key)) classes.push('rescuing');
      if (state.landing.has(cell.key)) classes.push('landing');
      if (state.departing.has(cell.key)) classes.push('departing');
      if (state.entering.has(cell.key)) classes.push('entering');
      if (state.reacting.has(cell.key)) classes.push('responding');
      if (state.idleKey === cell.key) classes.push('idle-acting');
      if (state.hover && mode === 'math' && currentLevel().op === '-' && canPlace(state.hover) && footprint(state.hover).includes(cell.key)) classes.push('take-hover');
      else if (state.hover === cell.key && !kind) classes.push('hover');
      return boardTile(kind, cell, classes.join(' '), cell.key);
    }).join('');
    if (state.hover && !state.animating && !state.complete && !(mode === 'math' && currentLevel().op === '-')) {
      const pair = pairAt(state.pieceIndex);
      const keys = footprint(state.hover);
      const valid = canPlace(state.hover);
      keys.forEach((cellKey, index) => {
        const cell = byKey.get(cellKey);
        if (!cell || state.tiles.has(cellKey)) return;
        content += boardTile(pair[index], cell, 'preview-tile ' + (valid ? '' : 'invalid'));
      });
    }
    let guides = '';
    if (mode === 'parallel') {
      for (const row of (currentLevel().parallelRows || [0, 1])) {
        const a = position(byKey.get(key(-1, row)));
        const b = position(byKey.get(key(1, row)));
        guides += '<path class="parallel-guide" d="M ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' L ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + '"/>';
      }
    }
    const axis = mode === 'mirror' ? '<line class="mirror-axis" x1="300" y1="140" x2="300" y2="438"/><text class="mirror-label" x="300" y="136">对称轴</text>' : '';
    let target = '';
    if (suggestion && currentLevel().op === '+') {
      const cell = byKey.get(suggestion);
      const {x,y,scale} = position(cell);
      const spots = [{x,y},{x:x-28*scale,y},{x:x+28*scale,y},{x,y:y+10*scale}];
      const overlap = (spot) => [...state.tiles].some(([cellKey, kind]) => {
        const foot = position(byKey.get(cellKey));
        const height = species[kind].height * foot.scale;
        const width = height * species[kind].aspect;
        return spot.x > foot.x-width/2-5 && spot.x < foot.x+width/2+5 && spot.y > foot.y+12*foot.scale-height-5 && spot.y < foot.y+12*foot.scale+5;
      });
      const spot = spots.find((point) => !overlap(point)) || spots[0];
      // Put the landing control above sprites so a big tail cannot block it.
      target = '<g class="placement-target" data-key="' + suggestion + '" role="button" tabindex="0" aria-label="来了一只恐龙">' +
        '<polygon class="target-hit" points="' + vertexString(boardVertices(cell)) + '"/>' +
        '<circle class="target-hit" cx="' + spot.x.toFixed(1) + '" cy="' + spot.y.toFixed(1) + '" r="' + (30*scale).toFixed(1) + '"/>' +
        '<circle cx="' + spot.x.toFixed(1) + '" cy="' + spot.y.toFixed(1) + '" r="' + (12*scale).toFixed(1) + '"/>' +
        '<text x="' + spot.x.toFixed(1) + '" y="' + (spot.y+6*scale).toFixed(1) + '">+</text></g>';
    }
    board.innerHTML = shadowDefs('board') + guides + content + axis + target;
    fitAdditionMarks();
    $('#emptyIsland').hidden = mode !== 'math' || state.tiles.size !== 0 || state.phase !== 'answer';
    $('#emptyIslandLabel').textContent = currentLevel().op === '-' ? '都跑掉啦' : '岛上还没有恐龙';
  }
  function reversedResult(level) { return level.op === '+' ? level.start - level.change : level.start + level.change; }
  function wrongAnswerType(level, number) { return number === level.start ? 'no-operation' : number === reversedResult(level) ? 'reversed-operation' : 'other'; }
  // Wrong choices come from real slips (not operating, using the opposite sign).
  // A fixed per-level hash keeps each level stable without a guessable size or screen pattern.
  function answerChoices(goal, levelIndex) {
    const level = levels[levelIndex];
    const usable = number => number >= 0 && number <= 12 && number !== goal;
    const slips = [level.start, reversedResult(level)].filter(usable);
    const pool = [...new Set([...slips, ...[1, -1, 2, -2, 3, -3].map(step => goal + step).filter(usable)])];
    const hash = Math.imul(levelIndex + 1, 2654435761) >>> 0;
    const wantedRank = (hash >>> 8) % 3;
    let best = null;
    pool.forEach((first, index) => pool.slice(index + 1).forEach((second) => {
      const rank = [first, second].filter(number => number < goal).length;
      const score = (rank === wantedRank ? 10 : 0) + [first, second].filter(number => slips.includes(number)).length * 3 - (Math.abs(first - goal) + Math.abs(second - goal)) * .1;
      if (!best || score > best.score) best = { score, numbers: [first, second, goal].sort((a, b) => a - b) };
    }));
    const shift = (hash >>> 16) % 3;
    return best.numbers.slice(shift).concat(best.numbers.slice(0, shift));
  }
  function render() {
    if (state.idleKey && (state.phase !== 'play' || state.error || state.animating || state.thinking || state.celebrating)) stopIdleReaction();
    const level = currentLevel();
    const math = level.mode === 'math';
    window.DinoSceneGround?.schedule(scenes[state.level], math);
    const challenge = level.mode === 'challenge';
    $('.app').classList.toggle('challenge-mode', challenge);
    const knowledge=level.challengeType==='knowledge';
    const gradeTwo=level.grade===2&&!knowledge;
    $('.app').classList.toggle('grade2-mode', gradeTwo);
    $('.app').classList.toggle('knowledge-mode', knowledge);
    challengeView?.render(challenge && !gradeTwo && !knowledge ? state.challenge : null);
    gradeTwoView?.render(gradeTwo ? state.challenge : null);
    knowledgeView?.render(knowledge ? state.challenge : null);
    $('.app').classList.toggle('small-board', smallBoard());
    board.setAttribute('viewBox', smallBoard() ? '110 135 380 220' : '0 125 600 285');
    board.setAttribute('aria-busy', state.animating ? 'true' : 'false');
    $('#levelLabel').textContent = level.mode === 'free' ? '自由探险' : '第 ' + (state.level + 1) + ' / ' + adventureCount + ' 关';
    $('#missionTag').textContent = level.mode === 'free' ? '自由玩法 · 没有下一关' : practicePosition()>=0 ? practiceRoute.label+' · '+(practicePosition()+1)+'/'+practiceRoute.indices.length : level.tag;
    if (math) $('#missionTitle').innerHTML = pictureEquation(level);
    else $('#missionTitle').textContent = level.mode === 'free' ? '自由恐龙岛' : level.title;
    $('#missionTitle').setAttribute('aria-label', math ? mathEquation(level, state.complete) : challenge ? level.title : '自由恐龙岛');
    if (challenge) {
      $('#missionTitle').textContent = window.DinoChallengeEngine.equation(state.challenge, state.complete);
      $('#missionTitle').setAttribute('aria-label', $('#missionTitle').textContent);
      renderGuidance(level.guidance);
      $('#nextButton').disabled = !state.complete || state.error;
      $('#emptyIsland').hidden = true;
      return;
    }
    $('#goalCount').textContent = math ? (state.complete ? state.progress + ' 只' : '? 只') : level.mode === 'free' ? state.progress + ' 队' : state.progress + ' / ' + level.goal;
    $('#goalLabel').textContent = math ? '数一数岛上有' : level.goalLabel;
    const remaining = math ? Math.max(0, level.change - state.pieceIndex) : 0;
    renderGuidance(math ? state.phase === 'answer' ? answerPrompt(level) : actionPrompt(level, remaining) : '同种恐龙连成三只，就能救出一队。');
    $('#chapterDots').innerHTML = regions.map((_, i) => '<i class="' + (i < Math.floor(state.level / 5) ? 'done' : i === Math.floor(state.level / 5) ? 'current' : '') + '"></i>').join('');
    $('#chapterDots').setAttribute('aria-label', '关卡进度，第 ' + Math.min(state.level + 1, adventureCount) + ' / ' + adventureCount + ' 关');
    if (math || $('#ruleArt').dataset.level !== String(state.level)) {
      $('#ruleArt').innerHTML = ruleArt(level);
      $('#ruleArt').dataset.level = String(state.level);
    }
    $('#feedback').textContent = state.feedback;
    $('#feedback').classList.toggle('error', state.error);
    $('.interaction-bar').classList.toggle('has-error', state.error);
    $('.interaction-bar').dataset.phase = math ? state.phase : 'free';
    $('#nextButton').disabled = !state.complete || state.error;
    $('#actionTrack').hidden = !math || state.phase !== 'play';
    $('.interaction-bar').dataset.footerPhase = state.error ? 'wrong' : math ? state.phase : 'free';
    $('#v3TaskTitle').textContent = !math ? '' : state.error ? '再数一数，还差一点' : state.phase === 'answer' ? (level.op === '+' ? '现在一共有几只？' : '现在还剩几只？') : (level.op === '+' ? '点发光的空格' : '点棋盘上的恐龙');
    $('#v3FooterCue').textContent = !math ? '点棋盘放下伙伴' : state.phase === 'answer' ? '点一个数字' : level.op === '+' ? '点棋盘上的发光空格' : '点棋盘上的恐龙';
    if (math) {
      const moved = state.pieceIndex;
      const slots = level.change;
      $('#actionTrack').innerHTML = window.DinoBottomBar?.progress(level.factKind, {done:moved,total:slots,unit:'只',reverse:level.op==='-',left:'还要点',leftUnit:level.op==='+'?'下':'只'}) || '';
      $('#actionTrack').setAttribute('aria-label', '需要移动 ' + level.change + ' 只，已经移动 ' + moved + ' 只');
    }
    $('#checkButton').hidden = true;
    $('#checkButton').disabled = state.animating;
    $('#answerChallenge').hidden = !math || state.phase === 'play' || state.complete;
    if (math && state.phase !== 'play') {
      $('#countPrompt').textContent = state.countingTogether ? '一起数一数' : state.error ? '再看一看，选一个数字' : (level.op === '+' ? '一共有几只？' : '还剩几只？');
      $('#answerOptions').hidden = false;
      $('#answerOptions').innerHTML = answerChoices(level.goal, state.level).map((number) => '<button type="button" data-answer="' + number + '" class="' + (state.wrongAnswer === number ? 'is-wrong' : '') + '"' + (state.countingTogether ? ' disabled' : '') + ' aria-label="' + number + ' 只恐龙">' + number + (state.wrongAnswer === number ? '<span aria-hidden="true">×</span>' : '') + '</button>').join('');
    }
    $('#rescuedCount').textContent = math ? Math.abs(state.progress - level.start) : state.rescued;
    const pair = pairAt(state.pieceIndex);
    const [first, second] = pair;
    const [nextFirst, nextSecond] = pairAt(state.pieceIndex + 1);
    $('#pairNames').textContent = math ? species[first].name + ' × 1' : species[first].name + ' + ' + species[second].name;
    $('#nextPair').textContent = math ? '已移动 ' + state.pieceIndex + ' 只' : level.mode === 'free' ? '由你来选' : species[nextFirst].name + ' + ' + species[nextSecond].name;
    $('#dockLabel').textContent = math ? (level.op === '+' ? '来岛上玩' : '跑掉啦') : '这一对';
    $('#dockInstruction').textContent = math ? level.op === '+' ? '👆 点发光的空格' : '👆 点一只恐龙' : '点格子放下，或拖到棋盘';
    $('#piece').setAttribute('aria-label', math ? (level.op === '+' ? '加入一只' + species[first].name : '让一只' + species[first].name + '跑掉') : '当前的一对恐龙');
    $('#piece').innerHTML = pieceSvg('dockpiece');
    $('#chooseButton').hidden = level.mode !== 'free';
    $('#replayButton').hidden = level.mode !== 'free';
    $('#replayButton').textContent = '学数学';
    $('#restartButton').innerHTML = '<span aria-hidden="true">↻</span><small>重玩</small>';
    $('#hintButton').innerHTML = '<span aria-hidden="true">☀</span><small>提示</small>';
    $('#undoButton').innerHTML = '<span aria-hidden="true">↶</span><small>撤回</small>';
    $('#undoButton').disabled = (math ? !state.history.length : !state.undo) || state.animating || state.complete;
    $('#hintButton').disabled = state.animating || state.complete;
    $('#rotateButton').hidden = math && pair.length === 1;
    $('#rotateButton').disabled = state.animating || state.complete || (math && pair.length === 1);
    $('#rotateButton').setAttribute('aria-label', math ? '旋转相连的两只恐龙' : '旋转这一对恐龙');
    renderBoard();
  }
  function toast(message) {
    const element = $('#boardToast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 1300);
  }
  function tone(notes) {
    if (!soundOn || document.hidden) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audioContext ||= new Audio();
      if (audioContext.state === 'suspended') audioContext.resume();
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const when = audioContext.currentTime + index * .09;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, when);
        gain.gain.setValueAtTime(.0001, when);
        gain.gain.exponentialRampToValueAtTime(.075, when + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, when + .22);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(when);
        oscillator.stop(when + .23);
      });
    } catch (_) {}
  }
  function currentGuidanceCue() {
    if (!state || currentLevel().mode !== 'math' || state.complete) return null;
    const level = currentLevel();
    const remaining = Math.max(0, level.change - state.pieceIndex);
    const answer = state.phase === 'answer';
    // Short recordings ask for the next tap, matching actionPrompt().
    if (!answer) {
      const cue = window.DINO_ACTION_PROMPT_CUES?.[level.op + (state.pieceIndex ? 'more-' + remaining : level.op === '+' ? 'first-' + remaining : 'first')];
      return cue ? { ...cue, key: roundToken + ':' + state.phase + ':' + remaining } : null;
    }
    const filename = 'task-' + String(level.id).padStart(2, '0') + '.m4a';
    const cue = window.DINO_TASK_GUIDANCE_CUES?.[filename]?.answer;
    if (!cue) return null;
    return { ...cue, filename, key: roundToken + ':' + state.phase + ':' + remaining };
  }
  function stopGuidanceNarration(cancelPending = true) {
    guidancePlayToken++;
    clearTimeout(guidanceEndTimer);
    guidancePlayback = null;
    if (cancelPending) guidancePending = null;
    guidanceNarration.pause();
    guidanceNarration.currentTime = 0;
    $('#guidance').classList.remove('is-speaking');
  }
  function guidanceCanPlay(allowError = false) {
    return state && !state.complete && (allowError || !state.error) && !state.animating && soundOn && !document.hidden &&
      !levelPicker?.visible && $('#collectionOverlay').hidden && $('#finish').hidden && $('#chapterGate').hidden &&
      (!window.DinoBoot || $('#bootCover').hidden) && !window.DinoWarmup?.isOpen();
  }
  function tryPendingGuidance() {
    if (!guidancePending || !guidanceCanPlay(guidancePending.manual)) return;
    const current = currentGuidanceCue();
    if (!current || current.key !== guidancePending.key) { guidancePending = null; return; }
    // Task, story and encouragement speech finish first. A late cue is dropped
    // whenever its round, quantity or phase no longer matches the visible sign.
    if (voicePlayers.some(audio => audio !== guidanceNarration && !audio.paused && !audio.ended)) return;
    const cue = guidancePending;
    guidancePending = null;
    stopGuidanceNarration(false);
    const token = ++guidancePlayToken;
    const source = './assets/voice/' + cue.filename + voiceVersion;
    guidancePlayback = { ...cue, token };
    if (!guidanceNarration.src.endsWith(source.slice(1))) {
      guidanceNarration.src = source;
      guidanceNarration.load();
    }
    try { guidanceNarration.currentTime = cue.start; } catch (_) {}
    playVoiceAudio(guidanceNarration).then(() => {
      if (token !== guidancePlayToken || !guidancePlayback || guidanceNarration.paused) return;
      $('#guidance').classList.add('is-speaking');
    }).catch(error => {
      if (token !== guidancePlayToken || error?.name === 'AbortError') return;
      stopGuidanceNarration();
      $('#guidance').title = '点一下，重听当前提示';
    });
  }
  function finishGuidanceSegment() {
    if (!guidancePlayback || guidanceNarration.currentTime < guidancePlayback.end - .015) return;
    stopGuidanceNarration(false);
  }
  function scheduleGuidanceEnd() {
    clearTimeout(guidanceEndTimer);
    if (!guidancePlayback || guidanceNarration.paused) return;
    guidanceEndTimer = setTimeout(finishGuidanceSegment, Math.max(0, guidancePlayback.end - guidanceNarration.currentTime) * 1000);
  }
  guidanceNarration.addEventListener('loadedmetadata', () => {
    if (guidancePlayback) guidanceNarration.currentTime = guidancePlayback.start;
  });
  guidanceNarration.addEventListener('playing', scheduleGuidanceEnd);
  guidanceNarration.addEventListener('waiting', () => clearTimeout(guidanceEndTimer));
  guidanceNarration.addEventListener('timeupdate', finishGuidanceSegment);
  guidanceNarration.addEventListener('ended', () => stopGuidanceNarration(false));
  guidanceNarration.addEventListener('error', () => stopGuidanceNarration());
  voicePlayers.forEach(audio => audio.addEventListener('ended', tryPendingGuidance));
  function renderGuidance(text) {
    const button = $('#guidance');
    button.textContent = text;
    button.setAttribute('aria-label', text + (soundOn ? '，点按重听当前提示' : '，声音已关闭'));
    button.title = soundOn ? '点按重听当前提示' : '声音已关闭';
    const cue = currentGuidanceCue();
    const changedToAnswer = guidanceRound === roundToken && guidancePhase === 'play' && state.phase === 'answer';
    guidanceRound = roundToken;
    guidancePhase = state.phase;
    if (guidancePlayback && (!cue || cue.key !== guidancePlayback.key || (state.error && !guidancePlayback.manual) || state.complete)) stopGuidanceNarration();
    if (guidancePending && (!cue || cue.key !== guidancePending.key || (state.error && !guidancePending.manual) || state.complete)) guidancePending = null;
    // The initial full task already includes the zero-change question. Only a
    // transition after actual manipulation gets one automatic short question.
    // If the full task is still speaking, its own final sentence will ask this
    // question. Do not queue a second copy behind it; explicit replay still works.
    const taskWillAsk = !taskNarration.paused && !taskNarration.ended;
    if (changedToAnswer && cue && soundOn && !state.error && !taskWillAsk) guidancePending = cue;
    tryPendingGuidance();
  }
  function repeatGuidance() {
    if (!guidanceCanPlay(true)) return;
    const cue = currentGuidanceCue();
    if (cue) { guidancePending = { ...cue, manual: true }; tryPendingGuidance(); }
    else if (!voicePlayers.some(audio => !audio.paused && !audio.ended)) playTaskNarration();
  }
  function playVoiceAudio(audio, restart = false) {
    // Keep play() inside the user's gesture, including a retry after MediaError.
    try {
      if (audio.error) audio.load();
      if (restart) audio.currentTime = 0;
      const pending = audio.play();
      // Preserve the media promise's scheduling; older browsers returned void.
      return pending && typeof pending.then === 'function' ? pending : Promise.resolve();
    } catch (error) { return Promise.reject(error); }
  }
  function setTaskAudioStatus(status) {
    const button = $('#taskSpeakButton');
    const labels = {
      idle: ['听一听', '播放本关任务语音'],
      loading: ['加载中…', '任务语音加载中'],
      playing: ['正在说', '正在播放任务语音，点击重播'],
      retry: ['点此重试', '语音加载失败，点击重新加载'],
      blocked: ['点此开声音', '点击开启声音并播放任务语音'],
      ended: ['再听一次', '重播本关任务语音']
    };
    const [label, aria] = labels[status] || labels.idle;
    const caption = button.querySelector('small');
    if (caption) caption.textContent = label;
    button.setAttribute('aria-label', aria);
    button.classList.toggle('is-playing', status === 'playing');
    button.classList.toggle('needs-tap', status === 'retry' || status === 'blocked');
  }
  function playWrongNarration() {
    if (!soundOn || document.hidden) return;
    const token = ++wrongPlayToken;
    const round = roundToken;
    playVoiceAudio(wrongNarration, true).catch((error) => {
      if (token !== wrongPlayToken || round !== roundToken || !soundOn || error?.name === 'AbortError') return;
      wrongNarration.pause();
      setTaskAudioStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'retry');
    });
  }
  function stopNarration() {
    narrationPlayToken++;
    clearTimeout(narrationTimer);
    narration.pause();
    narration.currentTime = 0;
    rewardStory.reset();
    $('#listenButton').classList.remove('is-playing');
    $('#listenButton').textContent = '▶ 听故事';
  }
  let cancelStoryHandoff;
  function stopTaskNarration() {
    taskPlayToken++;
    taskNarration.pause();
    cancelStoryHandoff?.();
    taskNarration.currentTime = 0;
    setTaskAudioStatus('idle');
  }
  function stopChapterNarration() {
    chapterPlayToken++;
    chapterNarration.pause();
    chapterNarration.currentTime = 0;
    $('#chapterSpeak').textContent = '🔊 听听接下来怎么玩';
  }
  function playChapterNarration() {
    if (!soundOn || document.hidden) return;
    stopOtherVoices(chapterNarration);
    const token = ++chapterPlayToken;
    const round = roundToken;
    $('#chapterSpeak').textContent = '声音加载中…';
    playVoiceAudio(chapterNarration, true).then(() => {
      if (token === chapterPlayToken && round === roundToken && soundOn && !chapterNarration.paused) $('#chapterSpeak').textContent = '♪ 正在说';
    }).catch((error) => {
      if (token !== chapterPlayToken || round !== roundToken || !soundOn || error?.name === 'AbortError') return;
      $('#chapterSpeak').textContent = error?.name === 'NotAllowedError' ? '🔊 点此开启声音' : '↻ 声音没加载好，点此重试';
    });
  }
  chapterNarration.addEventListener('ended', () => { $('#chapterSpeak').textContent = '↻ 再听一次'; });
  chapterNarration.addEventListener('error', () => {
    if (chapterNarration.error && soundOn && !$('#chapterGate').hidden) $('#chapterSpeak').textContent = '↻ 声音没加载好，点此重试';
  });
  // S1: the first tap of a visit tells where the fossil story stands, then the task follows. Both use the task
  // element, because iOS lets only the element started by the tap keep playing.
  function playStoryThenTask(story) {
    const task = taskNarration.src, token = roundToken;
    let timer, bufferedTask;
    const preloadTask = () => {
      bufferedTask = new Audio();
      bufferedTask.preload = 'auto';
      bufferedTask.src = task;
    };
    const restoreTask = () => {
      clearTimeout(timer);
      taskNarration.removeEventListener('ended', next);
      taskNarration.removeEventListener('error', next);
      taskNarration.removeEventListener('playing', preloadTask);
      bufferedTask = null;
      cancelStoryHandoff = null;
      taskNarration.src = task;
    };
    const next = () => {
      if (token !== roundToken || taskNarration.src === task) return;
      restoreTask();
      playTaskNarration();
    };
    cancelStoryHandoff = restoreTask;
    taskNarration.addEventListener('ended', next);
    taskNarration.addEventListener('error', next);
    taskNarration.addEventListener('playing', preloadTask, { once: true });
    // Longer than the longest line (the 15 s prologue), in case 'ended' never arrives.
    timer = setTimeout(next, 20000);
    taskNarration.src = './assets/voice/' + story.file + voiceVersion;
    playTaskNarration();
  }
  function playTaskNarration() {
    if (!soundOn || document.hidden || !taskNarration.src) return;
    stopOtherVoices(taskNarration);
    const token = roundToken;
    const playToken = ++taskPlayToken;
    const source = taskNarration.src;
    setTaskAudioStatus('loading');
    playVoiceAudio(taskNarration, true).then(() => {
      if (token !== roundToken || playToken !== taskPlayToken || source !== taskNarration.src || !soundOn || taskNarration.paused) return;
      setTaskAudioStatus('playing');
    }).catch((error) => {
      if (token !== roundToken || playToken !== taskPlayToken || source !== taskNarration.src || !soundOn || error?.name === 'AbortError') return;
      setTaskAudioStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'retry');
    });
  }
  taskNarration.addEventListener('ended', () => {
    if (taskNarration.ended) setTaskAudioStatus('ended');
  });
  taskNarration.addEventListener('error', () => {
    // Ignore a queued error from a retired source after start() assigned a new one.
    if (!taskNarration.error || (taskNarration.currentSrc && taskNarration.currentSrc !== taskNarration.src)) return;
    if (soundOn && !document.hidden) setTaskAudioStatus('retry');
  });
  function playNarration(reset = true, startPart = null) {
    clearTimeout(narrationTimer);
    if (!soundOn || document.hidden || !narration.src) return;
    stopOtherVoices(narration);
    if (narration.error) narration.load();
    if (reset || narration.ended) narration.currentTime = 0;
    const token = roundToken;
    const playToken = ++narrationPlayToken;
    if (startPart !== null) rewardStory.seek(startPart);
    playVoiceAudio(narration).then(() => {
      if (token !== roundToken || playToken !== narrationPlayToken || narration.paused || !soundOn || $('#finish').hidden) return;
      $('#listenButton').classList.add('is-playing');
      $('#listenButton').textContent = 'Ⅱ 暂停';
    }).catch(() => {
      if (token !== roundToken || playToken !== narrationPlayToken) return;
      $('#listenButton').textContent = '▶ 再试一次';
    });
  }
  narration.addEventListener('ended', () => {
    $('#listenButton').classList.remove('is-playing');
    $('#listenButton').textContent = '↻ 再听一次';
    // A newly opened fossil is announced once, after the dinosaur has finished its story.
    if (!fossilCuePending || !soundOn || document.hidden || $('#finish').hidden) return;
    fossilCuePending = false;
    fossilNarration.src = './assets/voice/fossil-unlock.m4a' + voiceVersion;
    playVoiceAudio(fossilNarration).catch(() => {});
  });
  narration.addEventListener('pause', () => { narrationPlayToken++; });
  function isCurrentVoiceError(audio, filename) {
    const resource = (source) => source?.split('/').pop()?.split('?')[0];
    // Source changes clear MediaError. A queued event from the previous file
    // must not replace the new character's playback controls.
    return Boolean(audio.error) && resource(audio.src) === filename
      && (!audio.currentSrc || resource(audio.currentSrc) === filename);
  }
  narration.addEventListener('error', () => {
    const filename = rewardVoiceFile();
    if (!soundOn || document.hidden || $('#finish').hidden || !isCurrentVoiceError(narration, filename)) return;
    narrationPlayToken++;
    narration.pause();
    rewardStory.reset();
    $('#listenButton').classList.remove('is-playing');
    $('#listenButton').textContent = '▶ 再试一次';
  });
  function stopGalleryNarration() {
    galleryPlayToken++;
    galleryNarration.pause();
    galleryNarration.currentTime = 0;
    galleryAudioKind = '';
    galleryStory.reset();
    $('#collectionListen').textContent = '▶ 听它说';
  }
  galleryNarration.addEventListener('ended', () => { $('#collectionListen').textContent = '↻ 再听一次'; });
  galleryNarration.addEventListener('error', () => {
    if (!soundOn || document.hidden || $('#collectionOverlay').hidden || galleryAudioKind !== gallerySelected
      || !isCurrentVoiceError(galleryNarration, 'gallery-' + gallerySelected + '.m4a')) return;
    galleryPlayToken++;
    galleryNarration.pause();
    galleryAudioKind = ''; // The retry selects the source again to clear MediaError.
    galleryStory.reset();
    $('#collectionListen').textContent = '▶ 再试一次';
  });
  function showCollectionSpecies(kind) {
    stopGalleryNarration();
    gallerySelected = kind;
    if (!$('#collectionOverlay').hidden) islandAudio?.creature(kind, 'touch');
    const data = species[kind];
    $('#collectionPortrait').src = './assets/' + data.image;
    $('#collectionPortrait').alt = data.name + '的立体画像';
    $('#collectionName').textContent = data.name;
    galleryStory.setCharacter(kind, 'gallery-' + kind + '.m4a');
    $('#collectionType').textContent = kind === 'ptero' ? '会飞的史前伙伴 · 不是恐龙' : data.isNew ? '新发现的恐龙伙伴' : '恐龙伙伴';
    $('#chooseSpecies').hidden = currentLevel().mode !== 'free' || state.complete;
    $('#collectionGrid').querySelectorAll('[data-species]').forEach((button) => {
      const selected = button.dataset.species === kind;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }
  let galleryFilter = newKinds.length ? 'new' : 'all';
  function renderCollectionGrid() {
      const visibleKinds = galleryFilter === 'new' ? newKinds : collectionKinds;
      $('#collectionGrid').innerHTML = visibleKinds.map((kind) => {
        const data = species[kind];
        return '<button type="button" data-species="' + kind + '" aria-pressed="false"><img src="./assets/' + data.image + '" alt="" loading="lazy"><span>' + data.name + '</span>' + (kind === 'ptero' ? '<small class="bonus">不是恐龙</small>' : data.isNew ? '<small class="new-partner">新伙伴</small>' : '') + (window.DinoFossilMark?.has(kind) ? '<small class="fossil-found">化石已挖到</small>' : '') + '</button>';
      }).join('');
      $('#collectionNew').textContent = '✨ 新伙伴 ' + newKinds.length;
      $('#collectionNew').hidden = !newKinds.length;
      $('#collectionAll').textContent = '全部 ' + collectionKinds.length;
      $('#collectionNew').setAttribute('aria-pressed', String(galleryFilter === 'new'));
      $('#collectionAll').setAttribute('aria-pressed', String(galleryFilter === 'all'));
      return visibleKinds;
  }
  function filterCollection(filter) {
    galleryFilter = filter;
    const visibleKinds = renderCollectionGrid();
    showCollectionSpecies(visibleKinds.includes(gallerySelected) ? gallerySelected : visibleKinds[0]);
    $('#collectionGrid').scrollTop = 0;
  }
  function openCollection() {
    stopIdleReaction();
    stopOtherVoices();
    const visibleKinds = renderCollectionGrid();
    $('#collectionHelp').textContent = currentLevel().mode === 'free' ? '点图片认识伙伴，再选一只放到棋盘。' : '点图片听故事。选关里的自由探险，可以让它上场。';
    const desired = currentLevel().mode === 'free' ? state.selectedSpecies : gallerySelected;
    showCollectionSpecies(visibleKinds.includes(desired) ? desired : visibleKinds[0]);
    $('#collectionOverlay').hidden = false;
    islandAudio?.creature(gallerySelected, 'touch');
    $('#collectionClose').focus();
  }
  function closeCollection() {
    stopGalleryNarration();
    $('#collectionOverlay').hidden = true;
    $('#collectionButton').focus();
  }
  function spark(keys) {
    const layer = $('#effects');
    const bounds = board.getBoundingClientRect();
    const stage = $('.playfield').getBoundingClientRect();
    keys.slice(0, 8).forEach((cellKey, index) => {
      const cell = byKey.get(cellKey);
      if (!cell) return;
      const { x, y } = position(cell);
      const camera = board.viewBox.baseVal;
      const element = document.createElement('span');
      element.className = 'spark';
      element.textContent = index % 2 ? '✦' : '★';
      element.style.left = (bounds.left - stage.left + (x - camera.x) / camera.width * bounds.width) + 'px';
      element.style.top = (bounds.top - stage.top + (y - camera.y) / camera.height * bounds.height) + 'px';
      element.style.animationDelay = (index % 3) * .07 + 's';
      layer.appendChild(element);
      setTimeout(() => element.remove(), 1100);
    });
  }
  // F7: the finish card shows how close the next fossil is, or links to one that is waiting to be dug.
  // Returns how many fossils levels 1-50 have opened, so finish() can tell when one has just opened.
  function renderFossilProgress() {
    const unlock = window.DinoFossilUnlock, status = unlock && state.level < unlock.LEVELS ? unlock.status() : null;
    const waiting = status?.unlocked.find(id => !window.DinoFossilMark?.has(id));
    $('#fossilProgress').hidden = !status || (!waiting && !status.next);
    $('#fossilButton').hidden = !waiting;
    if (!status) return 0;
    if (waiting) {
      $('#fossilProgress').innerHTML = '<span class="fossil-pebbles" aria-hidden="true">🦴</span>化石挖掘开放啦！';
      $('#fossilButton').textContent = '🦴 去挖' + species[waiting].name + '化石 →';
      $('#fossilButton').href = './prototypes/fossil-dig/index.html?fossil=' + waiting + '&from=game&v=20261109-f7-r1';
    } else if (status.next) {
      const lit = unlock.PER - status.left;
      $('#fossilProgress').innerHTML = '<span class="fossil-pebbles" aria-hidden="true">' + Array.from({ length: unlock.PER }, (_, i) => '<i class="' + (i < lit ? 'lit' : '') + '"></i>').join('') + '</span><span class="fossil-chapter">第 ' + (status.unlocked.length + 1) + ' 章 · </span>再过 ' + status.left + ' 关，找回' + species[status.next].name + '骨架';
    }
    return status.unlocked.length;
  }
  function finish() {
    if (state.complete) return;
    clearBoardReactions();
    stopTaskNarration();
    state.complete = true;
    const level = currentLevel();
    // Progress is committed once; only presentation waits for the short wave.
    state.entering.clear();
    state.landing.clear();
    state.celebrating = level.mode === 'math' && !reducedMotion && state.tiles.size > 0;
    const free = level.mode === 'free';
    const courseWasCompleted = courseCompleted();
    const fossilsBefore = window.DinoFossilUnlock?.status().unlocked.length ?? 0;
    if (!free) { markCompleted(state.level); saveProgress(state.level + 1); }
    fossilCuePending = !free && renderFossilProgress() > fossilsBefore;
    state.courseJustCompleted = !free && !courseWasCompleted && courseCompleted();
    const lastCompleted = state.courseJustCompleted || (state.level === adventureCount - 1 && courseCompleted());
    $('#finishLabel').textContent = free ? '本次自由救援' : lastCompleted ? adventureCount + ' / ' + adventureCount + ' 关全部完成！' : level.mode === 'math' ? '你算出来啦' : '发现新规律';
    $('#discovery').textContent = free ? '救出了 ' + state.rescued + ' 只恐龙！' : level.mode === 'math' ? mathEquation(level, true) : level.mode === 'challenge' ? window.DinoChallengeEngine.equation(state.challenge, true) : level.discovery;
    $('#encouragement').textContent = level.cheer;
    $('#factCard').hidden = free;
    if (!free) {
      const factSpecies = level.factKind && species[level.factKind];
      rewardStory.setCharacter(level.factKind, rewardVoiceFile(level));
      $('#factName').textContent = level.factName || factSpecies.name;
      $('#factPortrait').src = './assets/' + (level.factImage || factSpecies.image);
      $('#factPortrait').alt = (level.factName || factSpecies.name) + '的立体画像';
      narration.src = './assets/voice/' + rewardVoiceFile(level) + voiceVersion;
      narration.load();
    }
    $('#nextButton').textContent = practicePosition()>=0 ? (practicePosition()===practiceRoute.indices.length-1?'换个板块 →':'继续本板块 →') : free ? '再玩自由探险 ↻' : lastCompleted ? '看看下一站 →' : state.level === adventureCount - 1 ? '选择下一关 →' : '下一关 →';
    $('#repeatCourseButton').hidden = free || !lastCompleted;
    $('#repeatCourseButton').textContent = '↺ 重玩 ' + adventureCount + ' 关';
    $('#finish').hidden = state.celebrating;
    render();
    if (state.celebrating) {
      const token = roundToken;
      finishTimer = setTimeout(() => {
        if (token !== roundToken) return;
        state.celebrating = false;
        renderBoard();
        $('#finish').hidden = false;
      }, 650);
    }
    tone([523, 659, 784, 1047]);
    islandAudio?.creature(level.factKind || state.selectedSpecies, 'happy');
    if (!free && soundOn) narrationTimer = setTimeout(playNarration, 650);
    const upcoming = practicePosition() >= 0 ? practiceRoute.indices[practicePosition() + 1] : state.level + 1;
    if (!free && !document.hidden && !lastCompleted && upcoming < adventureCount) preloadScene(upcoming);
  }
  function noRoom() {
    return !cells.some((cell) => directions.some((_, index) => canPlace(cell.key, index)));
  }
  function placeMath(anchor) {
    stopIdleReaction();
    const level = currentLevel();
    const keys = footprint(anchor);
    state.history.push({ tiles: new Map(state.tiles), pieceIndex: state.pieceIndex, progress: state.progress,
      rescued: state.rescued, orientation: state.orientation });
    state.entering.clear();
    state.hover = null;
    state.hint = [];
    state.error = false;
    state.animating = true;
    const token = roundToken;
    if (level.op === '+') {
      keys.forEach((cellKey) => state.tiles.set(cellKey, level.factKind));
      state.progress += keys.length;
      state.rescued += keys.length;
      state.pieceIndex++;
      state.landing = new Set(keys);
      state.feedback = '来了 1 只！';
      render();
      spark(keys);
      toast('来了 1 只');
      islandAudio?.creature(level.factKind, 'arrive', { durationMs: reducedMotion ? 0 : 780, lightSteps: ['raptor', 'oviraptor', 'psittaco', 'struthio', 'compso'].includes(level.factKind) });
      setTimeout(() => {
        if (token !== roundToken) return;
        state.animating = false;
        state.landing.clear();
        readyToAnswer();
        if (state.phase === 'play') state.feedback = '来了 1 只！';
        render();
      }, arrivalMs());
      return;
    }
    state.departing = new Set(keys);
    state.feedback = '跑掉了 1 只！';
    render();
    islandAudio?.creature(level.factKind, 'depart', { durationMs: reducedMotion ? 0 : 680, lightSteps: ['raptor', 'oviraptor', 'psittaco', 'struthio', 'compso'].includes(level.factKind) });
    setTimeout(() => {
      if (token !== roundToken) return;
      keys.forEach((cellKey) => state.tiles.delete(cellKey));
      state.departing.clear();
      state.progress -= keys.length;
      state.rescued += keys.length;
      state.pieceIndex++;
      state.feedback = '跑掉了 1 只。摆好后自己数数还剩几只。';
      state.animating = false;
      readyToAnswer();
      if (state.phase === 'play') state.feedback = '跑掉了 1 只！';
      render();
      spark(keys);
      toast('跑掉了 1 只');
    }, reducedMotion ? 0 : 720);
  }
  function checkWork() {
    if (currentLevel().mode !== 'math' || state.phase !== 'play' || state.animating || state.complete) return;
    const difference = currentLevel().change - state.pieceIndex;
    if (difference !== 0) {
      state.error = true;
      state.feedback = difference > 0 ? '还差 ' + difference + ' 个。再移动恐龙试试。' : '多了 ' + -difference + ' 个。点“撤回”再试。';
      toast(difference > 0 ? '还差 ' + difference + ' 只' : '多了 ' + -difference + ' 只');
      tone([235]);
      render();
      return;
    }
    state.phase = 'answer';
    state.countOrder = [];
    state.hint = [];
    state.hover = null;
    state.error = false;
    state.feedback = '现在有几只？选一个数字。';
    render();
    toast('点恐龙数一数 👆');
  }
  function countDino(cellKey) {
    if (currentLevel().mode !== 'math' || state.phase !== 'answer' || !state.tiles.has(cellKey) || state.countOrder.includes(cellKey)) return;
    state.countOrder.push(cellKey);
    const count = state.countOrder.length;
    if (count === state.progress) {
      if (!state.error) state.feedback = '都数过啦！现在选一个数字。';
      render();
      toast('选出总数 ✓');
    } else {
      if (!state.error) state.feedback = '已经数到 ' + count + ' 只。';
      render();
    }
    greetDino(cellKey);
  }
  function greetDino(cellKey, silent = false, idleAction = null) {
    if (!silent) stopIdleReaction();
    const kind = state.tiles.get(cellKey);
    if (!species[kind] || state.animating || state.complete || state.reacting.has(cellKey)) return;
    if (silent && (reducedMotion || state.idleKey)) return;
    if (silent) { state.idleKey = cellKey; state.idleAction = idleAction || 'nod'; }
    state.reacting.add(cellKey);
    const greeting = ++greetingSequence;
    greetingTokens.set(cellKey, greeting);
    // Animate only this animal; the board and the child's count stay put.
    board.querySelectorAll('[data-key="' + cellKey + '"]').forEach(element => {
      element.classList.add('responding');
      if (silent) { element.classList.add('idle-acting'); element.dataset.idleAction = state.idleAction; }
    });
    if (!silent) islandAudio?.creature(kind, 'touch');
    const token = roundToken;
    setTimeout(() => {
      if (token !== roundToken || greetingTokens.get(cellKey) !== greeting) return;
      greetingTokens.delete(cellKey);
      state.reacting.delete(cellKey);
      if (state.idleKey === cellKey) { state.idleKey = null; state.idleAction = null; }
      board.querySelectorAll('[data-key="' + cellKey + '"]').forEach(element => {
        element.classList.remove('responding', 'idle-acting');
        delete element.dataset.idleAction;
      });
    }, reducedMotion ? 200 : silent ? 900 : 650);
  }
  function activateCell(cellKey) {
    if (!state || state.animating || state.complete) return;
    const level = currentLevel();
    if (level.mode === 'math' && state.phase === 'answer') {
      if (state.countingTogether) return;
      if (state.countOrder.includes(cellKey)) greetDino(cellKey);
      else countDino(cellKey);
    } else if (state.tiles.has(cellKey) && (level.mode === 'free' || (level.mode === 'math' && level.op === '+'))) {
      greetDino(cellKey);
    } else place(cellKey);
  }
  function chooseAnswer(number) {
    if (currentLevel().mode !== 'math' || state.phase !== 'answer' || state.complete || state.countingTogether) return;
    const level = currentLevel();
    if (state.animating || state.pieceIndex !== level.change || state.tiles.size !== level.goal) return;
    if (number === currentLevel().goal) {
      answerRecords.set(level.id, { tries: state.wrongTries + 1, wrongTypes: [...state.wrongTypes] });
      state.error = false;
      state.wrongAnswer = null;
      wrongNarration.pause();
      state.feedback = '你自己算出来啦！';
      finish();
      return;
    }
    if (number !== state.wrongAnswer) {
      state.wrongTries++;
      state.wrongTypes.push(wrongAnswerType(level, number));
    }
    state.countOrder = [];
    state.wrongAnswer = number;
    state.error = true;
    state.feedback = '✕ 这个数字还不对。数一数，再试一次！';
    stopIdleReaction();
    clearTimeout(reactionTimer);
    state.reacting.clear();
    state.thinking = !reducedMotion;
    stopOtherVoices(wrongNarration);
    tone([294, 247]);
    render();
    if (state.thinking) {
      const token = roundToken;
      reactionTimer = setTimeout(() => {
        if (token !== roundToken) return;
        state.thinking = false;
        board.querySelectorAll('.thinking').forEach(node => node.classList.remove('thinking'));
      }, 620);
    }
    $('.interaction-bar').classList.remove('shake');
    requestAnimationFrame(() => $('.interaction-bar').classList.add('shake'));
    playWrongNarration();
    if (state.wrongTries >= 2) startCountingTogether();
  }
  // After a second miss the board counts for the child before another choice.
  function startCountingTogether() {
    // Left to right, so a child can follow; dinosaurs that came later are counted last.
    const spot = key => position(cells.find(cell => cell.key === key));
    const order = [...state.tiles.keys()].sort((a, b) => state.initialKeys.has(b) - state.initialKeys.has(a) || spot(a).x - spot(b).x || spot(a).y - spot(b).y);
    state.countingTogether = true;
    const finishCounting = () => {
      state.countingTogether = false;
      state.feedback = order.length ? '数完啦，现在选一个数字。' : '棋盘上一只也没有，现在选一个数字。';
      render();
    };
    if (reducedMotion) {
      state.countOrder = order;
      state.error = false;
      finishCounting();
      return;
    }
    const countNext = () => {
      if (reducedMotion) state.countOrder = order;
      if (state.countOrder.length >= order.length) { finishCounting(); return; }
      state.countOrder.push(order[state.countOrder.length]);
      state.feedback = '一起数：' + state.countOrder.length;
      if (wrongNarration.paused) tone([440 + state.countOrder.length * 30]);
      render();
      countTimer = setTimeout(countNext, 700);
    };
    render();
    countTimer = setTimeout(() => {
      state.error = false;
      countNext();
    }, 620);
  }
  function place(anchor) {
    if (!state || state.animating || state.complete) return;
    if (currentLevel().mode === 'math' && state.phase !== 'play') return;
    if (!canPlace(anchor)) {
      const mode = currentLevel().mode;
      state.feedback = mode === 'math' ? currentLevel().op === '+' ? '这里已经有恐龙啦，点带“＋”的空格。' : '点一只恐龙，让它跑掉。'
        : mode === 'egg' ? '这一对要放在蛋旁边的两个空格里。试试旋转。'
        : mode === 'mirror' ? '让两只恐龙分站亮线两边，而且离亮线一样远。'
        : mode === 'parallel' ? '沿着上下两条小路继续向右放，试试旋转。'
        : '这一对需要两个相邻的空格。转一转，换个位置试试。';
      state.error = true;
      state.hover = null;
      toast('换个位置 ↻');
      tone([235]);
      render();
      return;
    }
    if (currentLevel().mode === 'math') { placeMath(anchor); return; }
    state.undo = {
      tiles: new Map(state.tiles), pieceIndex: state.pieceIndex, progress: state.progress,
      rescued: state.rescued, orientation: state.orientation
    };
    const placedKeys = footprint(anchor);
    const pair = pairAt(state.pieceIndex);
    placedKeys.forEach((cellKey, index) => state.tiles.set(cellKey, pair[index]));
    state.pieceIndex++;
    state.hover = null;
    state.hint = [];
    state.error = false;
    islandAudio?.creature(pair[0], 'arrive');
    const level = currentLevel();
    if (level.mode === 'mirror' || level.mode === 'parallel') {
      state.progress++;
      state.rescued += 2;
      state.landing = new Set(placedKeys);
      const token = roundToken;
      const done = state.progress >= level.goal;
      state.animating = done;
      state.feedback = done ? '完成啦！看看你发现的图形规律。'
        : level.mode === 'mirror' ? '这一对左右对称！再摆一对。' : '两条小路都变长了，再向右放一对。';
      render();
      spark(placedKeys);
      toast(level.mode === 'mirror' ? '左右一样！ ★' : '两条路一起延长！ ★');
      tone([523, 659, 784]);
      setTimeout(() => {
        if (token !== roundToken) return;
        state.landing.clear();
        if (done) { state.animating = false; finish(); }
        else renderBoard();
      }, arrivalMs());
      return;
    }
    if (level.mode === 'egg') {
      state.landing = new Set(placedKeys);
      const landingToken = roundToken;
      setTimeout(() => { if (landingToken === roundToken) { state.landing.clear(); renderBoard(); } }, arrivalMs());
      state.progress = ring.filter((cellKey) => state.tiles.has(cellKey)).length;
      state.feedback = state.progress === 6 ? '围好了！恐龙蛋要孵化了！' : '又围住两个位置，再找剩下的空格。';
      render();
      if (state.progress === 6) {
        state.animating = true;
        const token = roundToken;
        spark(ring);
        tone([523, 659, 784]);
        setTimeout(() => {
          if (token !== roundToken) return;
          state.tiles.set('0,0', 'hatch');
          state.rescued = 6;
          state.animating = false;
          render();
          toast('宝宝孵出来啦！');
          setTimeout(() => { if (token === roundToken) finish(); }, 750);
        }, 450);
      } else toast('六格中的 ' + state.progress + ' 格');
      return;
    }
    const groups = findMatches(state.tiles);
    if (!groups.length) {
      state.landing = new Set(placedKeys);
      const landingToken = roundToken;
      setTimeout(() => { if (landingToken === roundToken) { state.landing.clear(); renderBoard(); } }, arrivalMs());
      state.feedback = level.mode === 'line' ? '恐龙放下了！找找能连成直线的位置。' : '恐龙放下了！继续把同种恐龙连成三只。';
      if (noRoom()) {
        state.feedback = '棋盘放满了，再来一局试试。';
        if (level.mode === 'free') { finish(); return; }
      }
      render();
      return;
    }
    const clearing = [...new Set(groups.flat())];
    state.animating = true;
    state.bursting = new Set(clearing);
    state.feedback = level.mode === 'line' ? '排成一条直线啦！' : '同伴集合！';
    render();
    spark(clearing);
    toast('救出 ' + clearing.length + ' 只！ ★');
    tone([523, 659, 784]);
    const token = roundToken;
    setTimeout(() => {
      if (token !== roundToken) return;
      clearing.forEach((cellKey) => state.tiles.delete(cellKey));
      state.bursting.clear();
      state.animating = false;
      state.progress = Math.min(level.goal, state.progress + groups.length);
      state.rescued += clearing.length;
      state.feedback = state.progress >= level.goal ? '任务完成！看看发现了什么规律。' : '成功救出一队！继续放下一对。';
      render();
      if (state.progress >= level.goal) setTimeout(() => { if (token === roundToken) finish(); }, 500);
    }, 520);
  }
  function hint() {
    if (state.animating || state.complete || state.countingTogether) return;
    const level = currentLevel();
    if (level.mode === 'math' && state.phase === 'answer') {
      state.countOrder = [];
      state.hint = [...state.tiles.keys()];
      state.feedback = state.tiles.size ? '👆 点恐龙，可以一只一只数。' : '棋盘上没有恐龙了，想想该选哪个数字。';
      state.error = false;
      state.wrongAnswer = null;
      render();
      return;
    }
    const candidates = level.mode === 'math' ? [...activeCells()].sort((a,b) => position(b).y - position(a).y) : cells;
    for (const cell of candidates) {
      for (let orientation = 0; orientation < 6; orientation++) {
        if (!canPlace(cell.key, orientation)) continue;
        const keys = footprint(cell.key, orientation);
        if (level.mode === 'cluster' || level.mode === 'line' || level.mode === 'free') {
          const trial = new Map(state.tiles);
          const pair = pairAt(state.pieceIndex);
          keys.forEach((cellKey, index) => trial.set(cellKey, pair[index]));
          if (!findMatches(trial).length) continue;
        }
        state.orientation = orientation;
        state.hint = keys;
        state.feedback = level.mode === 'math' ? level.op === '+' ? '把新来的恐龙放到发亮的格子。' : '点发亮的恐龙，让它们跑掉。' : '亮起来的两个格子可以试一试。';
        state.error = false;
        render();
        return;
      }
    }
    state.feedback = level.mode === 'math' ? '先数一数恐龙，再点棋盘试试。' : '这一对暂时没有直接完成任务的位置，先找两个空格放下。';
    state.error = false;
    render();
  }
  function undo() {
    const math = currentLevel().mode === 'math';
    if ((math ? !state.history.length : !state.undo) || state.animating || state.complete) return;
    clearBoardReactions();
    const previous = math ? state.history.pop() : state.undo;
    state.tiles = new Map(previous.tiles);
    state.landing.clear();
    state.departing.clear();
    state.entering.clear();
    state.pieceIndex = previous.pieceIndex;
    state.progress = previous.progress;
    state.rescued = previous.rescued;
    state.orientation = previous.orientation;
    if (!math) state.undo = null;
    state.phase = 'play';
    state.wrongAnswer = null;
    state.countOrder = [];
    state.hover = null;
    state.hint = [];
    state.feedback = math ? (currentLevel().op === '+' ? '恐龙回去了，再点一下。' : '恐龙回来了，再点一只。') : '拿回来了，换个方向或位置再试。';
    state.error = false;
    render();
    scheduleIdleReaction();
  }
  function rotate() {
    if (currentLevel().mode === 'challenge') return;
    if (state.animating || state.complete) return;
    if (currentLevel().mode === 'math' && pairAt(state.pieceIndex).length === 1) return;
    state.orientation = (state.orientation + 1) % 6;
    state.hint = [];
    state.feedback = '已经旋转，点棋盘试试。';
    state.error = false;
    render();
    tone([392]);
  }
  function nearestCell(clientX, clientY) {
    const rect = board.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const point = board.createSVGPoint();
    point.x = clientX; point.y = clientY;
    const local = point.matrixTransform(board.getScreenCTM().inverse());
    // Test the projected ground polygons; flattened cells are not circles.
    for (const cell of activeCells()) {
      const vertices = boardVertices(cell, size);
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const a = vertices[i], b = vertices[j];
        if ((a.y > local.y) !== (b.y > local.y) && local.x < (b.x - a.x) * (local.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      if (inside) return cell.key;
    }
    return null;
  }
  function setHover(next) {
    if (state.hover === next || state.animating || state.complete || state.entering.size || state.landing.size || (currentLevel().mode === 'math' && state.phase !== 'play')) return;
    state.hover = next;
    renderBoard();
  }

  board.addEventListener('pointerleave', () => { if (!dragging) setHover(null); });
  board.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-key]');
    const nearby = nearestCell(event.clientX, event.clientY);
    const math = currentLevel().mode === 'math';
    const anchor = cell?.dataset.key || (math ? nearby : null);
    if (anchor) activateCell(anchor);
  });
  board.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const cell = event.target.closest('[data-key]');
    if (!cell) return;
    event.preventDefault();
    activateCell(cell.dataset.key);
  });
  $('#piece').addEventListener('pointerdown', (event) => {
    if (state.animating || state.complete || (currentLevel().mode === 'math' && state.phase !== 'play')) return;
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    stopIdleReaction();
    event.preventDefault();
    try { $('#piece').setPointerCapture(event.pointerId); } catch (_) {}
    dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  });
  document.addEventListener('pointermove', (event) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    if (!dragging && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 8) {
      dragging = true;
      dragGhost = document.createElement('div');
      dragGhost.className = 'drag-ghost';
      dragGhost.innerHTML = pieceSvg('dragpiece');
      document.body.appendChild(dragGhost);
    }
    if (!dragging) return;
    event.preventDefault();
    dragGhost.style.left = event.clientX + 'px';
    dragGhost.style.top = event.clientY + 'px';
    setHover(nearestCell(event.clientX, event.clientY));
  });
  document.addEventListener('pointerup', (event) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    try { $('#piece').releasePointerCapture(event.pointerId); } catch (_) {}
    dragStart = null;
    if (!dragging) return;
    const target = nearestCell(event.clientX, event.clientY);
    dragging = false;
    dragGhost?.remove(); dragGhost = null;
    setHover(null);
    if (target) place(target);
  });
  document.addEventListener('pointercancel', (event) => {
    if (dragStart && event.pointerId !== dragStart.pointerId) return;
    try { $('#piece').releasePointerCapture(event.pointerId); } catch (_) {}
    dragStart = null; dragging = false;
    dragGhost?.remove(); dragGhost = null;
    setHover(null);
  });
  $('#rotateButton').addEventListener('click', rotate);
  $('#taskSpeakButton').addEventListener('click', () => { setSound(true); playTaskNarration(); });
  $('#guidance').addEventListener('click', repeatGuidance);
  $('#checkButton').addEventListener('click', checkWork);
  $('#answerOptions').addEventListener('click', (event) => {
    const option = event.target.closest('[data-answer]');
    if (option) chooseAnswer(Number(option.dataset.answer));
  });
  $('#backToBoard').addEventListener('click', () => {
    if (currentLevel().mode !== 'math' || state.complete) return;
    state.phase = 'play';
    state.countOrder = [];
    state.feedback = '调整好恐龙后，再选一个数字。';
    state.error = false;
    render();
  });
  $('#hintButton').addEventListener('click', hint);
  $('#undoButton').addEventListener('click', undo);
  $('#restartButton').addEventListener('click', () => { skipWarmupOnce = true; start(state.level, true, currentLevel().mode !== 'free'); });
  $('#replayButton').addEventListener('click', () => {setPractice(null);start(0,true);});
  $('#nextButton').addEventListener('click', () => {
    if (!state.complete || state.error) return;
    if (practicePosition()>=0) {
      const next=practiceRoute.indices[practicePosition()+1];
      if(next===undefined){levelPicker?.open();return;}
      start(next,true,false);return;
    }
    if (state.courseJustCompleted || (state.level === adventureCount - 1 && courseCompleted())) { start(adventureCount, true); return; }
    if (state.level === adventureCount - 1) { levelPicker?.open(); return; }
    start(state.level === levels.length - 1 ? state.level : state.level + 1, true, currentLevel().mode !== 'free');
  });
  $('#repeatCourseButton').addEventListener('click', () => {setPractice(null);start(0,true);});
  $('#chapterReplay').addEventListener('click', () => {setPractice(null);start(0,true);});
  $('#chapterExplore').addEventListener('click', () => {
    stopChapterNarration();
    $('#chapterGate').hidden = true;
    state.feedback = '这里是自由玩法，没有下一关。挑喜欢的恐龙继续探险！';
    render();
    if (soundOn) playTaskNarration();
  });
  $('#chapterSpeak').addEventListener('click', () => { setSound(true); playChapterNarration(); });
  $('#collectionButton').addEventListener('click', openCollection);
  $('#collectionNew').addEventListener('click', () => filterCollection('new'));
  $('#collectionAll').addEventListener('click', () => filterCollection('all'));
  $('#chooseButton').addEventListener('click', openCollection);
  $('#collectionClose').addEventListener('click', closeCollection);
  $('#collectionOverlay').addEventListener('click', (event) => { if (event.target.id === 'collectionOverlay') closeCollection(); });
  $('#collectionGrid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-species]');
    if (card) showCollectionSpecies(card.dataset.species);
  });
  function playGalleryNarration(startPart = null) {
    if (!galleryNarration.paused && startPart === null) {
      galleryPlayToken++;
      galleryNarration.pause();
      $('#collectionListen').textContent = '▶ 继续听';
      return;
    }
    setSound(true);
    stopOtherVoices(galleryNarration);
    const path = './assets/voice/gallery-' + gallerySelected + '.m4a' + voiceVersion;
    if (galleryAudioKind !== gallerySelected || galleryNarration.ended) {
      galleryNarration.src = path;
      galleryNarration.currentTime = 0;
      galleryAudioKind = gallerySelected;
    }
    if (startPart !== null) galleryStory.seek(startPart);
    const token = ++galleryPlayToken;
    playVoiceAudio(galleryNarration).then(() => {
      if (token === galleryPlayToken && !galleryNarration.paused && !$('#collectionOverlay').hidden) $('#collectionListen').textContent = 'Ⅱ 暂停';
    }).catch(() => {
      if (token === galleryPlayToken) $('#collectionListen').textContent = '▶ 点这里听';
    });
  }
  $('#collectionListen').addEventListener('click', () => playGalleryNarration());
  $('#chooseSpecies').addEventListener('click', () => {
    if (currentLevel().mode !== 'free' || state.complete) return;
    state.selectedSpecies = gallerySelected;
    state.hint = [];
    state.hover = null;
    state.feedback = '选好' + species[gallerySelected].name + '啦！把它们放到相邻的空格。';
    state.error = false;
    closeCollection();
    render();
  });
  $('#listenButton').addEventListener('click', () => {
    if (narration.paused) { setSound(true); playNarration(false); }
    else {
      narration.pause();
      $('#listenButton').classList.remove('is-playing');
      $('#listenButton').textContent = '▶ 继续';
    }
  });
  $('#soundButton').addEventListener('click', () => {
    setSound(!soundOn);
    if (!soundOn) return;
    if (!$('#collectionOverlay').hidden) playGalleryNarration();
    else if (!$('#finish').hidden && !$('#factCard').hidden) playNarration(false);
    else if (!$('#chapterGate').hidden) playChapterNarration();
    else playTaskNarration();
  });
  document.addEventListener('keydown', (event) => {
    if (levelPicker?.visible) return;
    if (!$('#chapterGate').hidden) return;
    if (!$('#collectionOverlay').hidden) {
      if (event.key === 'Escape') closeCollection();
      return;
    }
    if (event.key.toLowerCase() === 'r' && !event.repeat) rotate();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(idleTimer); stopIdleReaction(); stopOtherVoices(); audioContext?.suspend(); }
    else scheduleIdleReaction();
  });
  window.addEventListener?.('pagehide', () => { clearTimeout(idleTimer); stopIdleReaction(); stopOtherVoices(); audioContext?.suspend(); });
  window.addEventListener?.('pageshow', scheduleIdleReaction);
  function updateMotionPreference(event) {
    reducedMotion = event.matches;
    if (!reducedMotion) { scheduleIdleReaction(); return; }
    clearTimeout(idleTimer);
    clearTimeout(entryTimer);
    stopIdleReaction();
    if (!state) return;
    state.entering.clear();
    state.reacting.clear();
    greetingTokens.clear();
    state.thinking = false;
    if (state.celebrating) {
      state.celebrating = false;
      clearTimeout(finishTimer);
      if (state.complete) $('#finish').hidden = false;
    }
    board.querySelectorAll('.entering, .responding, .thinking, .celebrating').forEach(element => {
      element.classList.remove('entering', 'responding', 'thinking', 'celebrating', 'idle-acting');
      delete element.dataset.idleAction;
    });
  }
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', updateMotionPreference);
  else motionPreference.addListener?.(updateMotionPreference);
  if (window.ResizeObserver) new window.ResizeObserver(fitAdditionMarks).observe(board);
  else window.addEventListener?.('resize', fitAdditionMarks);
  $('#chapterGateTitle').textContent = adventureCount + ' 关全部完成！';
  $('#chapterReplay').textContent = '↺ 重玩 ' + adventureCount + ' 关';
  const dinosaurCount = Object.values(species).filter(data => data.isDinosaur).length;
  $('#collectionCountBadge').textContent = dinosaurCount;
  $('#collectionCount').textContent = dinosaurCount + ' 种恐龙 · 1 位翼龙伙伴';
  $('#collectionButton').setAttribute('aria-label', '打开恐龙图鉴，' + dinosaurCount + '种恐龙和1位翼龙伙伴');
  completedLevels();
  setSound(soundOn);
  // The map's parent entry selects an existing lesson, without changing its data
  // or inferring that earlier lessons have been completed.
  const entryParams = typeof URLSearchParams === 'function' ? new URLSearchParams(location.search) : null;
  const entryId = entryParams?.get('parentPractice') === '1' && /^\d+$/.test(entryParams.get('level') || '') ? Number(entryParams.get('level')) : null;
  const entryIndex = entryId === null ? -1 : levels.slice(0, adventureCount).findIndex(level => level.id === entryId);
  if (entryIndex >= 0) {
    const grade = levels[entryIndex].grade || 1;
    const moduleId = window.DinoLearningCatalog?.moduleFor(levels[entryIndex]);
    const indices = levels.slice(0, adventureCount).flatMap((level,index) =>
      (level.grade || 1) === grade && window.DinoLearningCatalog?.moduleFor(level) === moduleId ? [index] : []);
    setPractice({indices,grade,moduleId,topic:'all',label:grade+'年级 · 专项练习'});
  }
  start(entryIndex >= 0 ? entryIndex : resumeLevel());
})();
