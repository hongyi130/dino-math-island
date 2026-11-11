/* Before level 1: show what adding and taking away mean, meet + and −, then practise. Nothing is saved. */
(() => {
  const MIN = 1, MAX = 5, START = 3, LISTEN_HITS = 3, GUESS_ROUNDS = 2;
  const OUTCOME = { come: 'more', leave: 'less' };

  // The practice part. Every tap gets an answer about what happened; nothing is scored.
  function createFlow() {
    const flow = { stage: 'listen', count: START, hits: 0, rounds: 0, finds: 0, goal: null, guess: null, target: null, pick: null, lastGoal: 'less', lastGuess: 'leave' };
    const pickGoal = () => {
      flow.goal = flow.count >= MAX ? 'less' : flow.count <= MIN ? 'more' : flow.lastGoal === 'more' ? 'less' : 'more';
      flow.lastGoal = flow.goal;
    };
    const pickGuess = () => {
      flow.guess = flow.count >= MAX ? 'leave' : flow.count <= MIN ? 'come' : flow.lastGuess === 'come' ? 'leave' : 'come';
      flow.lastGuess = flow.guess;
    };
    const nextFind = () => {
      if (flow.finds >= 4) { flow.stage = 'done'; return; }
      flow.pick = null;
      if (flow.finds < 2) flow.target = flow.finds === 0 ? 'plus' : 'minus';
      else { pickGuess(); flow.pick = flow.guess; flow.target = flow.pick === 'come' ? 'plus' : 'minus'; }
    };
    const move = kind => {
      flow.count += kind === 'come' ? 1 : -1;
      return OUTCOME[kind];
    };
    flow.can = kind => (kind === 'come' ? flow.count < MAX : flow.count > MIN);
    flow.prompt = () => flow.stage === 'listen' ? 'make-' + flow.goal : flow.stage === 'guess' ? 'guess-' + flow.guess :
      flow.stage === 'find' ? (flow.pick ? 'pick-' + flow.pick : 'find-' + flow.target) : 'ready';
    flow.act = kind => {
      if (flow.stage !== 'listen' || !flow.can(kind)) return null;
      const outcome = move(kind);
      if (outcome === flow.goal) {
        flow.hits++;
        if (flow.hits >= LISTEN_HITS) { flow.stage = 'guess'; pickGuess(); } else pickGoal();
      }
      return { kind, say: [outcome, flow.prompt()] };
    };
    flow.answer = guessed => {
      if (flow.stage !== 'guess') return null;
      const kind = flow.guess, outcome = move(kind);
      flow.rounds++;
      if (flow.rounds >= GUESS_ROUNDS) { flow.stage = 'find'; nextFind(); } else pickGuess();
      return { kind, right: guessed === outcome, say: [outcome, flow.prompt()] };
    };
    flow.sign = chosen => {
      if (flow.stage !== 'find') return null;
      const named = 'is-' + chosen;
      if (chosen !== flow.target) return { right: false, say: [named, flow.prompt()] };
      const kind = flow.pick;
      if (kind) move(kind);
      flow.finds++;
      nextFind();
      return { kind, right: true, say: ['right-' + chosen, flow.prompt()] };
    };
    pickGoal();
    return flow;
  }

  const SCRIPTS = {
    add: [
      { text: '原来有 3 只恐龙', voice: 'demo-add-1', show: 3 },
      { text: '又来了 2 只', voice: 'demo-add-2', come: [3, 4] },
      { text: '比原来多了 2 只，这就是加法', voice: 'demo-add-3' },
    ],
    sub: [
      { text: '原来有 5 只恐龙', voice: 'demo-sub-1', show: 5 },
      { text: '跑掉了 2 只', voice: 'demo-sub-2', leave: [3, 4] },
      { text: '比原来少了 2 只，这就是减法', voice: 'demo-sub-3' },
    ],
    signs: [
      { text: '这是加号：一横一竖，像十字', voice: 'sym-plus', sign: 'plus' },
      { text: '拿走一竖，就是减号', voice: 'sym-minus', sign: 'minus' },
      { text: '加号多一竖，减号少一竖', voice: 'sym-memory', sign: 'both' },
    ],
  };
  const ORDER = ['add', 'sub', 'signs'];
  const PROMPTS = {
    'make-more': '让恐龙变多吧！', 'make-less': '让恐龙变少吧！',
    'guess-come': '又来一只，会变多，还是变少？', 'guess-leave': '跑掉一只，会变多，还是变少？',
    'find-plus': '找一找，哪个是加号？', 'find-minus': '找一找，哪个是减号？',
    'pick-come': '又来一只，用哪个符号？', 'pick-leave': '跑掉一只，用哪个符号？',
    ready: '练习完啦，我们出发吧！',
  };
  const MOVE_MS = 650, PAUSE_MS = 220, SILENT_STEP_MS = 2400, VOICE_LIMIT_MS = 9000;
  const VERSION = '?v=20261104-l0-warmup-r4';
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const audio = typeof Audio === 'function' ? new Audio() : null;
  const voicePath = name => './assets/voice/warmup-' + name + '.m4a' + VERSION;
  // A complete small clip can be handed to the same media element immediately,
  // including on browsers that ignore preload hints on a second element.
  const clips = new Map();
  function warmVoice(name) {
    if (!name || !audio || document.hidden || typeof fetch !== 'function' || clips.has(name)) return;
    clips.set(name, null);
    fetch(voicePath(name)).then(response => {
      if (!response.ok) throw new Error('Voice unavailable');
      return response.blob();
    }).then(blob => {
      clips.set(name, URL.createObjectURL(blob));
    }).catch(() => clips.delete(name));
  }
  let root = null, flow = null, options = null, segment = null, segmentDone = false, playToken = 0;
  let sayToken = 0, moveTimer = 0, sayTimer = 0, stepTimer = 0, moving = false, swapped = false;

  function say(names, done, following) {
    const token = ++sayToken;
    clearTimeout(sayTimer);
    audio?.pause();
    if (!audio || !options?.soundOn() || document.hidden) { if (done) sayTimer = setTimeout(done, SILENT_STEP_MS); return; }
    const next = index => {
      if (token !== sayToken) return;
      if (index >= names.length) { done?.(); return; }
      const name = names[index], path = voicePath(name);
      const playClip = source => {
        let settled = false;
        const finish = failed => {
          if (settled || token !== sayToken) return;
          settled = true;
          clearTimeout(sayTimer);
          audio.onended = audio.onerror = audio.onplaying = null;
          if (failed && source !== path) {
            URL.revokeObjectURL(source);
            clips.delete(name);
            playClip(path);
          } else next(index + 1);
        };
        audio.onended = () => finish(false);
        audio.onerror = () => finish(true);
        audio.onplaying = () => warmVoice(names[index + 1] || following);
        audio.src = source;
        sayTimer = setTimeout(() => finish(true), VOICE_LIMIT_MS);
        audio.play()?.catch?.(() => finish(true));
      };
      playClip(clips.get(name) || path);
    };
    next(0);
  }
  const picture = count => '<span class="warmup-mini">' + Array.from({ length: count }, () => '<img src="' + options.image + '" alt="">').join('') + '</span>';
  const signMark = name => '<span class="warmup-sign ' + name + '" role="img" aria-label="' + (name === 'plus' ? '加号' : '减号') + '"><i class="bar across"></i>' + (name === 'plus' ? '<i class="bar down"></i>' : '') + '</span>';

  function setPrompt(text) { root.querySelector('.warmup-prompt').textContent = text; }
  function setControls(html) { root.querySelector('.warmup-controls').innerHTML = html; }
  function setHerd(count) {
    root.querySelectorAll('.warmup-slot').forEach((slot, index) => {
      slot.className = 'warmup-slot' + (index < count ? '' : ' is-empty');
    });
  }
  function moveSlots(indices, kind) {
    const slots = root.querySelectorAll('.warmup-slot');
    clearTimeout(moveTimer);
    indices.forEach(index => {
      slots[index].className = 'warmup-slot' + (motion?.matches ? '' : kind === 'come' ? ' arrive' : ' leave');
    });
    const settle = () => indices.forEach(index => { slots[index].className = 'warmup-slot ' + (kind === 'come' ? 'is-new' : 'is-gone'); });
    if (motion?.matches) settle(); else moveTimer = setTimeout(settle, MOVE_MS);
  }

  // Part one and two: the game explains, the child watches.
  function play(name) {
    const token = ++playToken;
    segment = name;
    segmentDone = false;
    clearTimeout(stepTimer);
    root.dataset.view = name === 'signs' ? 'signs' : 'herd';
    setControls('');
    const steps = SCRIPTS[name];
    const run = index => {
      if (token !== playToken) return;
      if (index >= steps.length) {
        segmentDone = true;
        setControls('<button type="button" data-replay>再看一遍</button><button type="button" data-next>下一步 →</button>');
        return;
      }
      const step = steps[index];
      setPrompt(step.text);
      if (step.show) setHerd(step.show);
      if (step.come) moveSlots(step.come, 'come');
      if (step.leave) moveSlots(step.leave, 'leave');
      if (step.sign) showSign(step.sign);
      const following = steps[index + 1]?.voice || SCRIPTS[ORDER[ORDER.indexOf(name) + 1]]?.[0]?.voice;
      say([step.voice], () => { stepTimer = setTimeout(() => run(index + 1), PAUSE_MS); }, following);
    };
    run(0);
  }
  function showSign(sign) {
    const board = root.querySelector('.warmup-board');
    if (sign === 'plus') board.innerHTML = '<div class="warmup-plaque">' + signMark('plus') + '</div>';
    if (sign === 'minus') {
      board.querySelector('.down')?.classList.add(motion?.matches ? 'gone' : 'lift');
    }
    if (sign === 'both') board.innerHTML = '<figure class="warmup-plaque">' + signMark('plus') + '<figcaption>加号<br>多一竖</figcaption></figure><figure class="warmup-plaque">' + signMark('minus') + '<figcaption>减号<br>少一竖</figcaption></figure>';
  }

  // Part three: the child practises.
  function practiceControls() {
    if (flow.stage === 'guess') return '<button type="button" data-answer="more">' + picture(3) + '<b>变多</b></button><button type="button" data-answer="less">' + picture(1) + '<b>变少</b></button>';
    if (flow.stage === 'find') {
      const buttons = ['plus', 'minus'].map(name => '<button type="button" class="warmup-pick" data-sign="' + name + '" aria-label="' + (name === 'plus' ? '加号' : '减号') + '">' + signMark(name) + '</button>');
      return (swapped ? buttons.reverse() : buttons).join('');
    }
    if (flow.stage === 'done') return '<button type="button" class="warmup-go" data-go>去第 1 关 →</button>';
    const button = (kind, label, mark) => '<button type="button" data-kind="' + kind + '"' + (flow.can(kind) ? '' : ' disabled') + '>' + picture(1) + '<b>' + label + '</b><i aria-hidden="true">' + mark + '</i></button>';
    return button('come', '又来一只', '←') + button('leave', '跑掉一只', '→');
  }
  function renderPractice() {
    setPrompt(PROMPTS[flow.prompt()]);
    setControls(practiceControls());
    if (moving) root.querySelectorAll('.warmup-controls button').forEach(button => { button.disabled = true; });
  }
  function moveOne(kind) {
    const slots = root.querySelectorAll('.warmup-slot');
    const reduced = motion?.matches;
    const index = kind === 'come' ? flow.count - 1 : flow.count;
    setHerd(flow.count + (kind === 'leave' ? 1 : 0));
    clearTimeout(moveTimer);
    if (reduced) { slots[index].classList.toggle('is-empty', kind === 'leave'); return; }
    moving = true;
    slots[index].classList.add(kind === 'come' ? 'arrive' : 'leave');
    moveTimer = setTimeout(() => {
      moving = false;
      if (!root) return;
      setHerd(flow.count);
      renderPractice();
    }, MOVE_MS);
  }
  function startPractice() {
    playToken++;
    segment = null;
    root.dataset.view = 'herd';
    flow = createFlow();
    setHerd(flow.count);
    renderPractice();
    say([flow.prompt()]);
  }
  function step(result) {
    if (!result) return;
    if (result.right && flow.stage === 'find') swapped = !swapped;
    if (result.kind) moveOne(result.kind);
    renderPractice();
    say(result.say);
  }
  function finish() {
    const done = options?.onDone;
    close();
    done?.();
  }
  function onClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.skip !== undefined || data.go !== undefined) { finish(); return; }
    if (data.replay !== undefined) { play(segment); return; }
    if (data.next !== undefined) {
      const next = ORDER[ORDER.indexOf(segment) + 1];
      if (next) play(next); else startPractice();
      return;
    }
    if (moving) return;
    if (data.kind) step(flow.act(data.kind));
    else if (data.answer) step(flow.answer(data.answer));
    else if (data.sign) step(flow.sign(data.sign));
  }
  function onVisibility() {
    if (document.hidden) {
      sayToken++;
      playToken++;
      clearTimeout(sayTimer);
      clearTimeout(stepTimer);
      audio?.pause();
    } else if (segment && !segmentDone) play(segment);
  }
  function open(settings) {
    close();
    options = settings;
    moving = false;
    swapped = false;
    root = document.createElement('section');
    root.className = 'warmup';
    root.setAttribute('aria-label', '认识加法和减法');
    root.style.setProperty('--warmup-scene', 'url("' + settings.scene + '")');
    root.innerHTML = '<button type="button" class="warmup-skip" data-skip>跳过</button><p class="warmup-prompt" aria-live="polite"></p><div class="warmup-stage"><div class="warmup-herd">' +
      Array.from({ length: MAX }, () => '<span class="warmup-slot is-empty"><img src="' + settings.image + '" alt="恐龙"></span>').join('') +
      '</div><div class="warmup-board"></div></div><div class="warmup-controls"></div>';
    root.addEventListener('click', onClick);
    document.body.append(root);
    document.addEventListener('visibilitychange', onVisibility);
    play('add');
  }
  function close() {
    sayToken++;
    playToken++;
    clearTimeout(sayTimer);
    clearTimeout(moveTimer);
    clearTimeout(stepTimer);
    audio?.pause();
    document.removeEventListener('visibilitychange', onVisibility);
    root?.remove();
    root = null;
    options = null;
    segment = null;
  }
  window.DinoWarmup = {
    open, close, prepare: () => warmVoice(SCRIPTS.add[0].voice),
    isOpen: () => Boolean(root), createFlow, scripts: SCRIPTS
  };
})();
