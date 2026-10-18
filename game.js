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
  const eggImage = { image: 'egg-3d.png', aspect: 1230 / 1278, height: 70, color: '#efe0af' };
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
    image: 'scenes-v2/scene-' + String((level.sceneIndex ?? 0) + 1).padStart(2, '0') + '.png',
    position: 'center center',
    filter: 'brightness(' + (1 + (index % 5) * .008).toFixed(3) + ') saturate(' + (1 + (index % 5) * .012).toFixed(3) + ')'
  }));
  const scenePreloads = new Map();
  function preloadScene(levelIndex) {
    const image = scenes[levelIndex]?.image;
    if (!image || scenePreloads.has(image)) return;
    const preload = new Image();
    preload.src = './assets/' + image;
    scenePreloads.set(image, preload);
  }
  let state;
  let roundToken = 0;
  let toastTimer;
  let dragStart = null;
  let dragGhost = null;
  let dragging = false;
  let soundOn = true;
  try { soundOn = localStorage.getItem('dino-island-sound') !== 'off'; } catch (_) {}
  const islandAudio = window.createIslandAudio?.({ enabled: soundOn });
  let audioContext;
  const narration = new Audio();
  narration.preload = 'auto';
  let narrationTimer;
  let narrationPlayToken = 0;
  const galleryNarration = new Audio();
  galleryNarration.preload = 'none';
  const taskNarration = new Audio();
  taskNarration.preload = 'auto';
  const voiceVersion = '?v=20261018-curriculum-r3';
  const wrongNarration = new Audio('./assets/voice/wrong-answer.m4a' + voiceVersion);
  wrongNarration.preload = 'auto';
  const chapterNarration = new Audio('./assets/voice/' + (window.DINO_KNOWLEDGE?.length ? 'knowledge-complete.m4a' : window.DINO_GRADE2?.length ? 'grade2-complete.m4a' : 'chapter2-complete.m4a') + voiceVersion);
  chapterNarration.preload = 'auto';
  let gallerySelected = 'styraco';
  let galleryAudioKind = '';
  let galleryPlayToken = 0;
  const voicePlayers = [narration, galleryNarration, taskNarration, wrongNarration, chapterNarration];
  voicePlayers.forEach((audio) => $('#soundscape').appendChild(audio));
  const syncVoiceMix = () => islandAudio?.setNarrating(voicePlayers.some((audio) => !audio.paused && !audio.ended));
  voicePlayers.forEach((audio) => {
    ['play', 'playing', 'pause', 'ended', 'error', 'abort', 'emptied'].forEach((event) => audio.addEventListener(event, syncVoiceMix));
  });
  function stopOtherVoices(keep) {
    if (keep !== narration) stopNarration();
    if (keep !== galleryNarration) stopGalleryNarration();
    if (keep !== taskNarration) stopTaskNarration();
    if (keep !== chapterNarration) stopChapterNarration();
    if (keep !== wrongNarration) wrongNarration.pause();
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    onOpen: () => { stopOtherVoices(); islandAudio?.reset(); $('#collectionOverlay').hidden = true; $('.app').inert = true; },
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
      if (soundOn) { wrongNarration.currentTime = 0; wrongNarration.play().catch(() => {}); }
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
  const arrivalMs = reducedMotion ? 0 : 900;
  function mathSeed(level) { return (Math.max(level.start, level.goal) <= 5 ? mathSeedOrder : mathSpreadOrder).slice(0, level.start).map((cellKey) => [cellKey, level.factKind]); }
  function mathGuidance(level) {
    const name = species[level.factKind].name;
    return level.op === '+' ? '岛上有 ' + level.start + ' 只' + name + '。一只一只接来 ' + level.change + ' 只。'
      : '岛上有 ' + level.start + ' 只' + name + '。一只一只送走 ' + level.change + ' 只。';
  }
  function mathEquation(level, reveal = false) { return level.start + ' ' + level.op + ' ' + level.change + ' = ' + (reveal ? level.goal : '?'); }
  function pictureEquation(level) {
    const image = './assets/' + species[level.factKind].image;
    const group = (number, incoming = false) => '<span class="operand ' + (incoming ? 'change-operand' : '') + '"><b>' + number + '</b><span class="operand-pictures" aria-hidden="true">' +
      (number === 0 ? '<span class="zero-picture">○</span>' : Array.from({ length: number }, () => '<img src="' + image + '" alt="">').join('')) + '</span></span>';
    return group(level.start) + '<span class="equation-symbol">' + level.op + '</span>' + group(level.change, true) + '<span class="equation-symbol">=</span><span class="answer-blank">' + (state.complete ? level.goal : '?') + '</span>';
  }
  function readyToAnswer() {
    const level = currentLevel();
    if (level.mode !== 'math' || state.pieceIndex !== level.change || state.tiles.size !== level.goal || state.animating) return;
    state.phase = 'answer';
    state.hover = null;
    state.hint = [];
    state.feedback = level.op === '+' ? '合在一起，现在有几只？' : '送走以后，还剩几只？';
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
    return '<defs><filter id="' + prefix + '-ground-cast" x="-18%" y="-80%" width="136%" height="260%" color-interpolation-filters="sRGB">' +
      '<feColorMatrix type="matrix" values="0 0 0 0 .055  0 0 0 0 .075  0 0 0 0 .035  0 0 0 .24 0"/>' +
      '<feGaussianBlur stdDeviation="1.15"/></filter>' +
      '<radialGradient id="' + prefix + '-foot-contact"><stop offset="0" stop-color="#16200f" stop-opacity=".49"/>' +
      '<stop offset=".42" stop-color="#1b2912" stop-opacity=".31"/><stop offset="1" stop-color="#26371a" stop-opacity="0"/></radialGradient></defs>';
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
      parasaur: [.642,.98,.1537], spino: [.6357,.9745,.418], pachy: [.4634,.988,.2157],
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
    const footX = left + width * ground[0];
    const footY = top + height * ground[1];
    // Sun from upper right: heights above the foot project left and down.
    // Filtering the parent after projection keeps the penumbra soft on phones.
    const shadowA = .86, shadowC = .40, shadowD = -.17;
    const matrix = [shadowA,0,shadowC,shadowD,(1-shadowA)*footX-shadowC*footY,(1-shadowD)*footY].map((n) => n.toFixed(3)).join(' ');
    const imageBox = ' href="./assets/' + data.image + '" x="' + left.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + width.toFixed(1) + '" height="' + height.toFixed(1) + '"';
    const contactRadius = Math.max(3 * scale, Math.min(width * ground[2] * .48, height * .19));
    return '<g class="dino-actor"><g class="ground-shadow" aria-hidden="true" pointer-events="none">' +
      '<g class="figure-shadow" filter="url(#' + prefix + '-ground-cast)"><image class="shadow-silhouette"' + imageBox + ' transform="matrix(' + matrix + ')"/></g>' +
      (kind === 'ptero' ? '' : '<ellipse class="foot-contact" cx="' + footX.toFixed(1) + '" cy="' + (footY + .5 * scale).toFixed(1) + '" rx="' + contactRadius.toFixed(1) + '" ry="' + (2.4 * scale).toFixed(1) + '" fill="url(#' + prefix + '-foot-contact)"/>') + '</g>' +
      '<image class="tile-image"' + imageBox + ' style="--foot-x:' + (ground[0]*100).toFixed(2) + '%;--foot-y:' + (ground[1]*100).toFixed(2) + '%"/></g>';
  }
  function boardTile(kind, cell, className, dataKey = '') {
    const { x, y, scale } = position(cell);
    const vertices = boardVertices(cell);
    const fill = (species[kind] || (kind ? eggImage : null))?.color;
    const counted = state.countOrder?.indexOf(cell.key) ?? -1;
    const label = kind === 'egg' ? '恐龙蛋' : kind === 'hatch' ? '刚孵出的恐龙宝宝' : kind ? (counted >= 0 ? '第 ' + (counted + 1) + ' 只' : '') + species[kind].name + (currentLevel().mode === 'math' ? state.phase === 'answer' ? '，数一数' : currentLevel().op === '-' ? '，送走一只' : '，打个招呼' : '，打个招呼') : className.includes('departed') ? '恐龙离开的脚印' : '空格';
    const mathPopulation = Math.max(currentLevel().start || 0, currentLevel().goal || 0, state.progress || 0);
    const mathSize = (smallBoard() ? .99 : Math.max(1.06, 1.18 - (mathPopulation - 6) * .018)) * (!smallBoard() && cell.r < 0 ? .82 : 1);
    const entryIndex = state.landing.has(cell.key) ? [...state.landing].indexOf(cell.key) : state.entering.has(cell.key) ? [...state.entering].indexOf(cell.key) : 0;
    const idleOffset = Math.abs(cell.q * 7 + cell.r * 11) % 5;
    const greeting = species[kind]?.greeting || 'nod';
    return '<g class="' + className + '" data-greeting="' + greeting + '" style="--entry-delay:' + (entryIndex * 65) + 'ms;--idle-delay:-' + (idleOffset * .52).toFixed(2) + 's"' + (dataKey ? ' data-key="' + dataKey + '" role="button" tabindex="0" aria-label="' + label + '"' : '') + '>' +
      '<polygon class="tile-base" points="' + vertexString(vertices) + '"' + (fill ? ' style="fill:' + fill + ';fill-opacity:' + (className.includes('newcomer') ? '.22' : '.08') + '"' : '') + '/>' +
      '<polygon class="tile-outline" points="' + vertexString(vertices) + '"/>' +
      (className.includes('departed') ? '<text class="departure-mark" x="' + x.toFixed(1) + '" y="' + (y + 17 * scale).toFixed(1) + '">🐾</text>' : '') +
      (kind ? figure(kind, x, y, scale * (currentLevel().mode === 'math' ? mathSize : 1)) : '') +
      (kind ? '<ellipse class="greeting-ripple" cx="' + x.toFixed(1) + '" cy="' + (y + 10 * scale).toFixed(1) + '" rx="' + (28 * scale).toFixed(1) + '" ry="' + (8 * scale).toFixed(1) + '"/>' : '') +
      (className.includes('newcomer') ? '<g class="addition-mark"><circle cx="' + (x - 37 * scale).toFixed(1) + '" cy="' + (y + 25 * scale).toFixed(1) + '" r="' + (13 * scale).toFixed(1) + '"/><text x="' + (x - 37 * scale).toFixed(1) + '" y="' + (y + 31 * scale).toFixed(1) + '">+</text></g>' : '') +
      (counted >= 0 ? '<g class="count-badge"><circle cx="' + (x + 31 * scale).toFixed(1) + '" cy="' + (y - 32 * scale).toFixed(1) + '" r="' + (18 * scale).toFixed(1) + '"/><text x="' + (x + 31 * scale).toFixed(1) + '" y="' + (y - 26 * scale).toFixed(1) + '">' + (counted + 1) + '</text></g>' : '') + '</g>';
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
    levelPicker?.close(false);
    stopNarration();
    stopGalleryNarration();
    stopTaskNarration();
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
    wrongNarration.src = './assets/voice/' + (level.challengeType==='knowledge' ? 'knowledge-wrong.m4a' : level.grade === 2 ? 'grade2-wrong.m4a' : 'wrong-answer.m4a') + voiceVersion;
    const seed = level.mode === 'math' ? mathSeed(level) : level.seed;
    try { localStorage.setItem(currentLevelKey, String(levelIndex)); } catch (_) {}
    setScene(levelIndex);
    preloadScene(levelIndex + 1);
    state = {
      level: levelIndex, tiles: new Map(seed), pieceIndex: 0, orientation: 0,
      progress: level.mode === 'math' ? level.start : level.mode === 'egg' ? ring.filter((cellKey) => level.seed.some(([seedKey]) => seedKey === cellKey)).length : level.mode === 'parallel' ? 1 : 0, rescued: 0, hover: null,
      hint: [], animating: false, complete: false, courseJustCompleted: false, bursting: new Set(), landing: new Set(), departing: new Set(), reacting: new Set(), entering: new Set(seed.map(([cellKey]) => cellKey)),
      undo: null, history: [], phase: level.mode === 'math' && level.change === 0 ? 'answer' : 'play', wrongAnswer: null, countOrder: [], initialKeys: new Set(seed.map(([cellKey]) => cellKey)),
      feedback: level.mode === 'math' ? (level.change === 0 ? '不用移动，选一个数字。' : level.op === '+' ? '点发光的空格，接来恐龙。' : '点恐龙，送它去新营地。') : level.guidance,
      error: false, selectedSpecies: 'trike',
      challenge: level.mode === 'challenge' ? window.DinoChallengeEngine.create(level) : null
    };
    $('#finish').hidden = true;
    $('#chapterGate').hidden = level.mode !== 'free' || !showChapterChoice || !courseCompleted();
    $('#effects').innerHTML = '';
    $('#boardToast').classList.remove('show');
    $('#boardToast').textContent = '';
    render();
    if (seed.length || level.mode === 'challenge') islandAudio?.creature(level.factKind || seed[0][1], 'entrance');
    const introToken = roundToken;
    setTimeout(() => {
      if (introToken !== roundToken) return;
      state.entering.clear();
      board.querySelectorAll('.entering').forEach((element) => element.classList.remove('entering'));
    }, reducedMotion ? 0 : 1350);
    taskNarration.src = './assets/voice/' + (level.taskFile || (level.mode === 'free' ? 'task-free' : 'task-' + String(levelIndex + 1).padStart(2, '0')) + '.m4a') + voiceVersion;
    taskNarration.load();
    $('#taskSpeakButton').classList.add('needs-tap');
    if (announce && soundOn) {
      if (!$('#chapterGate').hidden) playChapterNarration();
      else playTaskNarration();
    }
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
      target = '<g class="placement-target" data-key="' + suggestion + '" role="button" tabindex="0" aria-label="接来一只恐龙">' +
        '<polygon class="target-hit" points="' + vertexString(boardVertices(cell)) + '"/>' +
        '<circle class="target-hit" cx="' + spot.x.toFixed(1) + '" cy="' + spot.y.toFixed(1) + '" r="' + (30*scale).toFixed(1) + '"/>' +
        '<circle cx="' + spot.x.toFixed(1) + '" cy="' + spot.y.toFixed(1) + '" r="' + (12*scale).toFixed(1) + '"/>' +
        '<text x="' + spot.x.toFixed(1) + '" y="' + (spot.y+6*scale).toFixed(1) + '">+</text></g>';
    }
    board.innerHTML = shadowDefs('board') + guides + content + axis + target;
    $('#emptyIsland').hidden = mode !== 'math' || state.tiles.size !== 0 || state.phase !== 'answer';
    $('#emptyIslandLabel').textContent = currentLevel().op === '-' ? '都去新营地啦' : '岛上还没有恐龙';
  }
  function answerChoices(goal, levelIndex) {
    const choices = goal === 10 ? [8, 9, 10] : goal <= 1 ? [0, 1, 2] : [goal - 1, goal, goal + 1];
    const shift = levelIndex % choices.length;
    return choices.slice(shift).concat(choices.slice(0, shift));
  }
  function render() {
    const level = currentLevel();
    const math = level.mode === 'math';
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
      $('#guidance').textContent = level.guidance;
      $('#nextButton').disabled = !state.complete || state.error;
      $('#emptyIsland').hidden = true;
      return;
    }
    $('#goalCount').textContent = math ? (state.complete ? state.progress + ' 只' : '? 只') : level.mode === 'free' ? state.progress + ' 队' : state.progress + ' / ' + level.goal;
    $('#goalLabel').textContent = math ? '数一数岛上有' : level.goalLabel;
    $('#guidance').textContent = math ? state.phase === 'answer' ? (level.op === '+' ? '现在一共有几只？' : '现在还剩几只？') : (level.op === '+' ? '接来 ' : '送走 ') + level.change + ' 只恐龙' : '同种恐龙连成三只，就能救出一队。';
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
    $('#actionTrack').hidden = !math;
    if (math) {
      const moved = state.pieceIndex;
      const slots = level.change;
      $('#actionTrack').innerHTML = '<span class="action-symbol" aria-hidden="true">' + (level.op === '+' ? '＋' : '−') + '</span>' +
        (slots === 0 ? '<span class="zero-step">0</span>' : Array.from({ length: slots }, (_, index) => '<span class="action-step ' + (index < moved ? 'done ' : '') + (level.op === '-' ? 'subtract' : '') + '" aria-hidden="true"><img src="./assets/' + species[level.factKind].image + '" alt=""><b>' + (index < moved ? '✓' : '') + '</b></span>').join(''));
      $('#actionTrack').setAttribute('aria-label', '需要移动 ' + level.change + ' 只，已经移动 ' + moved + ' 只');
    }
    $('#checkButton').hidden = true;
    $('#checkButton').disabled = state.animating;
    $('#answerChallenge').hidden = !math || state.phase === 'play' || state.complete;
    if (math && state.phase !== 'play') {
      $('#countPrompt').textContent = state.error ? '再看一看，选一个数字' : (level.op === '+' ? '一共有几只？' : '还剩几只？');
      $('#answerOptions').hidden = false;
      $('#answerOptions').innerHTML = answerChoices(level.goal, state.level).map((number) => '<button type="button" data-answer="' + number + '" class="' + (state.wrongAnswer === number ? 'is-wrong' : '') + '" aria-label="' + number + ' 只恐龙">' + number + (state.wrongAnswer === number ? '<span aria-hidden="true">×</span>' : '') + '</button>').join('');
    }
    $('#rescuedCount').textContent = math ? Math.abs(state.progress - level.start) : state.rescued;
    const pair = pairAt(state.pieceIndex);
    const [first, second] = pair;
    const [nextFirst, nextSecond] = pairAt(state.pieceIndex + 1);
    $('#pairNames').textContent = math ? species[first].name + ' × 1' : species[first].name + ' + ' + species[second].name;
    $('#nextPair').textContent = math ? '已移动 ' + state.pieceIndex + ' 只' : level.mode === 'free' ? '由你来选' : species[nextFirst].name + ' + ' + species[nextSecond].name;
    $('#dockLabel').textContent = math ? (level.op === '+' ? '来岛上玩' : '去新营地') : '这一对';
    $('#dockInstruction').textContent = math ? level.op === '+' ? '👆 点发光的空格' : '👆 点一只恐龙' : '点格子放下，或拖到棋盘';
    $('#piece').setAttribute('aria-label', math ? (level.op === '+' ? '加入' : '送走') + '一只' + species[first].name : '当前的一对恐龙');
    $('#piece').innerHTML = pieceSvg('dockpiece');
    $('#chooseButton').hidden = level.mode !== 'free';
    $('#replayButton').hidden = level.mode !== 'free';
    $('#replayButton').textContent = '学数学';
    $('#restartButton').textContent = '↻';
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
  function stopNarration() {
    narrationPlayToken++;
    clearTimeout(narrationTimer);
    narration.pause();
    narration.currentTime = 0;
    rewardStory.reset();
    $('#listenButton').classList.remove('is-playing');
    $('#listenButton').textContent = '▶ 听故事';
  }
  function stopTaskNarration() {
    taskNarration.pause();
    taskNarration.currentTime = 0;
    $('#taskSpeakButton').classList.remove('is-playing');
    $('#taskSpeakButton').classList.remove('needs-tap');
    $('#taskSpeakButton').setAttribute('aria-label', '播放本关任务语音');
  }
  function stopChapterNarration() {
    chapterNarration.pause();
    chapterNarration.currentTime = 0;
    $('#chapterSpeak').textContent = '🔊 听听接下来怎么玩';
  }
  function playChapterNarration() {
    if (!soundOn || document.hidden) return;
    stopOtherVoices(chapterNarration);
    chapterNarration.currentTime = 0;
    chapterNarration.play().then(() => { $('#chapterSpeak').textContent = '♪ 正在说'; }).catch(() => {});
  }
  chapterNarration.addEventListener('ended', () => { $('#chapterSpeak').textContent = '↻ 再听一次'; });
  function playTaskNarration() {
    if (!soundOn || document.hidden || !taskNarration.src) return;
    stopOtherVoices(taskNarration);
    taskNarration.currentTime = 0;
    const token = roundToken;
    taskNarration.play().then(() => {
      if (token !== roundToken) return;
      $('#taskSpeakButton').classList.add('is-playing');
      $('#taskSpeakButton').classList.remove('needs-tap');
      $('#taskSpeakButton').setAttribute('aria-label', '正在播放任务语音，点击重播');
    }).catch(() => {
      if (token === roundToken) $('#taskSpeakButton').classList.add('needs-tap');
    });
  }
  taskNarration.addEventListener('ended', () => {
    $('#taskSpeakButton').classList.remove('is-playing');
    $('#taskSpeakButton').setAttribute('aria-label', '重播本关任务语音');
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
    narration.play().then(() => {
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
        return '<button type="button" data-species="' + kind + '" aria-pressed="false"><img src="./assets/' + data.image + '" alt="" loading="lazy"><span>' + data.name + '</span>' + (kind === 'ptero' ? '<small class="bonus">不是恐龙</small>' : data.isNew ? '<small class="new-partner">新伙伴</small>' : '') + '</button>';
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
  function finish() {
    stopTaskNarration();
    state.complete = true;
    const level = currentLevel();
    const free = level.mode === 'free';
    const courseWasCompleted = courseCompleted();
    if (!free) { markCompleted(state.level); saveProgress(state.level + 1); }
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
    $('#finish').hidden = false;
    render();
    tone([523, 659, 784, 1047]);
    islandAudio?.creature(level.factKind || state.selectedSpecies, 'happy');
    if (!free && soundOn) narrationTimer = setTimeout(playNarration, 650);
  }
  function noRoom() {
    return !cells.some((cell) => directions.some((_, index) => canPlace(cell.key, index)));
  }
  function placeMath(anchor) {
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
      state.feedback = '新伙伴跑来了。看脚印，再想想还要接来几只。';
      render();
      spark(keys);
      toast('来了 1 只 🐾');
      islandAudio?.creature(level.factKind, 'arrive', { durationMs: reducedMotion ? 0 : 780, lightSteps: ['raptor', 'oviraptor', 'psittaco', 'struthio', 'compso'].includes(level.factKind) });
      setTimeout(() => {
        if (token !== roundToken) return;
        state.animating = false;
        state.landing.clear();
        readyToAnswer();
        if (state.phase === 'play') state.feedback = '还要接来 ' + (level.change - state.pieceIndex) + ' 只。';
        render();
      }, arrivalMs);
      return;
    }
    state.departing = new Set(keys);
    state.feedback = '一只恐龙跑去新营地了。继续看脚印。';
    render();
    islandAudio?.creature(level.factKind, 'depart', { durationMs: reducedMotion ? 0 : 680, lightSteps: ['raptor', 'oviraptor', 'psittaco', 'struthio', 'compso'].includes(level.factKind) });
    setTimeout(() => {
      if (token !== roundToken) return;
      keys.forEach((cellKey) => state.tiles.delete(cellKey));
      state.departing.clear();
      state.progress -= keys.length;
      state.rescued += keys.length;
      state.pieceIndex++;
      state.feedback = '送走了 1 只。摆好后自己数数还剩几只。';
      state.animating = false;
      readyToAnswer();
      if (state.phase === 'play') state.feedback = '还要送走 ' + (level.change - state.pieceIndex) + ' 只。';
      render();
      spark(keys);
      toast('送走 1 只 🐾');
    }, reducedMotion ? 0 : 720);
  }
  function checkWork() {
    if (currentLevel().mode !== 'math' || state.phase !== 'play' || state.animating || state.complete) return;
    const difference = currentLevel().change - state.pieceIndex;
    if (difference !== 0) {
      state.error = true;
      state.feedback = difference > 0 ? '脚印还差 ' + difference + ' 个。再移动恐龙试试。' : '脚印多了 ' + -difference + ' 个。点“撤回”再试。';
      toast(difference > 0 ? '还差 ' + difference + ' 个脚印' : '多了 ' + -difference + ' 个脚印');
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
  function greetDino(cellKey) {
    const kind = state.tiles.get(cellKey);
    if (!species[kind] || state.animating || state.complete || state.reacting.has(cellKey)) return;
    state.reacting.add(cellKey);
    // Animate only this animal; the board and the child's count stay put.
    board.querySelectorAll('[data-key="' + cellKey + '"]').forEach((element) => element.classList.add('responding'));
    islandAudio?.creature(kind, 'touch');
    const token = roundToken;
    setTimeout(() => {
      if (token !== roundToken) return;
      state.reacting.delete(cellKey);
      board.querySelectorAll('[data-key="' + cellKey + '"]').forEach((element) => element.classList.remove('responding'));
    }, reducedMotion ? 200 : 650);
  }
  function activateCell(cellKey) {
    if (!state || state.animating || state.complete) return;
    const level = currentLevel();
    if (level.mode === 'math' && state.phase === 'answer') {
      if (state.countOrder.includes(cellKey)) greetDino(cellKey);
      else countDino(cellKey);
    } else if (state.tiles.has(cellKey) && (level.mode === 'free' || (level.mode === 'math' && level.op === '+'))) {
      greetDino(cellKey);
    } else place(cellKey);
  }
  function chooseAnswer(number) {
    if (currentLevel().mode !== 'math' || state.phase !== 'answer' || state.complete) return;
    const level = currentLevel();
    if (state.animating || state.pieceIndex !== level.change || state.tiles.size !== level.goal) return;
    if (number === currentLevel().goal) {
      state.error = false;
      state.wrongAnswer = null;
      wrongNarration.pause();
      state.feedback = '你自己算出来啦！';
      finish();
      return;
    }
    state.countOrder = [];
    state.wrongAnswer = number;
    state.error = true;
    state.feedback = '✕ 这个数字还不对。数一数，再试一次！';
    stopOtherVoices(wrongNarration);
    tone([294, 247]);
    render();
    $('.interaction-bar').classList.remove('shake');
    requestAnimationFrame(() => $('.interaction-bar').classList.add('shake'));
    if (soundOn) { wrongNarration.currentTime = 0; wrongNarration.play().catch(() => {}); }
  }
  function place(anchor) {
    if (!state || state.animating || state.complete) return;
    if (currentLevel().mode === 'math' && state.phase !== 'play') return;
    if (!canPlace(anchor)) {
      const mode = currentLevel().mode;
      state.feedback = mode === 'math' ? currentLevel().op === '+' ? '这里已经有恐龙啦，点带“＋”的空格。' : '点一只恐龙，送它去新营地。'
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
      }, arrivalMs);
      return;
    }
    if (level.mode === 'egg') {
      state.landing = new Set(placedKeys);
      const landingToken = roundToken;
      setTimeout(() => { if (landingToken === roundToken) { state.landing.clear(); renderBoard(); } }, arrivalMs);
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
      setTimeout(() => { if (landingToken === roundToken) { state.landing.clear(); renderBoard(); } }, arrivalMs);
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
    if (state.animating || state.complete) return;
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
        state.feedback = level.mode === 'math' ? level.op === '+' ? '把新来的恐龙放到发亮的格子。' : '点发亮的恐龙，送它们去新营地。' : '亮起来的两个格子可以试一试。';
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
    state.feedback = math ? '撤回啦，还要' + (currentLevel().op === '+' ? '接来 ' : '送走 ') + (currentLevel().change - state.pieceIndex) + ' 只。' : '拿回来了，换个方向或位置再试。';
    state.error = false;
    render();
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
  $('#restartButton').addEventListener('click', () => start(state.level, true, currentLevel().mode !== 'free'));
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
    galleryNarration.play().then(() => {
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
    if (document.hidden) { stopOtherVoices(); audioContext?.suspend(); }
  });
  window.addEventListener?.('pagehide', () => { stopOtherVoices(); audioContext?.suspend(); });
  $('#chapterGateTitle').textContent = adventureCount + ' 关全部完成！';
  $('#chapterReplay').textContent = '↺ 重玩 ' + adventureCount + ' 关';
  const dinosaurCount = Object.values(species).filter(data => data.isDinosaur).length;
  $('#collectionCountBadge').textContent = dinosaurCount;
  $('#collectionCount').textContent = dinosaurCount + ' 种恐龙 · 1 位翼龙伙伴';
  $('#collectionButton').setAttribute('aria-label', '打开恐龙图鉴，' + dinosaurCount + '种恐龙和1位翼龙伙伴');
  completedLevels();
  setSound(soundOn);
  start(resumeLevel());
})();
