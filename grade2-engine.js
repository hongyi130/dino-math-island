/* Concrete multiplication/division. Existing chapter rules stay with the base engine. */
(() => {
  'use strict';
  const base = window.DinoChallengeEngine;
  if (!base) throw new Error('Load challenge-engine.js before grade2-engine.js.');
  const types = new Set(['multiply', 'share', 'group', 'remainder']);
  const handles = level => types.has(level?.challengeType);
  const integer = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const unchanged = () => ({ changed: false, complete: false });
  const totalInGroups = state => state.groupCounts.reduce((sum, count) => sum + count, 0);
  const isGrouping = state => state.level.challengeType === 'group' || state.level.challengeType === 'remainder';
  const partialCount = (state, q) => isGrouping(state) && state.groupCounts.at(-1) < q.perGroup ? state.groupCounts.at(-1) : 0;

  function quantities(level) {
    const { a, b, challengeType: type } = level;
    if (!integer(a) || !integer(b) || (type !== 'multiply' && b === 0)) {
      throw new RangeError('Grade-two quantities must be nonnegative integers; division needs a positive divisor.');
    }
    const total = type === 'multiply' ? a * b : a;
    const groups = type === 'multiply' || type === 'share' ? b : Math.floor(a / b);
    const perGroup = type === 'multiply' ? a : type === 'share' ? a / b : b;
    const remainder = type === 'remainder' ? a % b : 0;
    if (![total, groups, perGroup, remainder].every(integer) ||
        ((type === 'share' || type === 'group') && a % b !== 0)) {
      throw new RangeError('Equal division needs a whole-number quotient; use remainder for a remainder task.');
    }
    const result = { total, groups, perGroup, remainder };
    for (const key of Object.keys(result)) {
      if (level[key] !== undefined && level[key] !== result[key]) {
        throw new RangeError(`Inconsistent grade-two quantity: ${key}.`);
      }
    }
    return result;
  }

  // History contains complete plain-state snapshots, without recursive history or level data.
  function snapshot(state) {
    return JSON.parse(JSON.stringify(Object.fromEntries(
      Object.entries(state).filter(([key]) => key !== 'level' && key !== 'history')
    )));
  }

  function buildGuidance(level) {
    return level.challengeType === 'multiply' ? '点发光脚印，请来一组恐龙。' :
      level.challengeType === 'share' ? '点营地的发光脚印，送一只过去。' :
      `点发光脚印，一只一只放，每 ${quantities(level).perGroup} 只一队。`;
  }

  function create(level) {
    if (!handles(level)) return base.create(level);
    const q = quantities(level);
    return {
      level,
      groupCounts: level.challengeType === 'share' ? Array(q.groups).fill(0) : [],
      poolRemaining: q.total,
      phase: 'build', answer: null, history: [], error: false, complete: false,
      feedback: buildGuidance(level)
    };
  }

  function correct(state) {
    if (!handles(state.level)) return base.correct(state);
    const q = quantities(state.level);
    return Array.isArray(state.groupCounts) && state.groupCounts.length === q.groups &&
      state.groupCounts.every(count => count === q.perGroup) &&
      state.poolRemaining === q.remainder && totalInGroups(state) + state.poolRemaining === q.total;
  }

  function expectedAnswer(state) {
    const q = quantities(state.level);
    switch (state.level.challengeType) {
      case 'multiply': return q.total;
      case 'share': return q.perGroup;
      case 'group': return q.groups;
      default: return q.remainder;
    }
  }

  function question(state) {
    const type = state.level.challengeType;
    return type === 'multiply' ? '一共有几只恐龙？' : type === 'share' ? '每个营地分到几只？' :
      type === 'group' ? '一共分成了几组？' : '还剩几只，不能再组成一组？';
  }

  function reject(state, feedback) {
    state.error = true;
    state.feedback = feedback;
    return { changed: false, wrong: true, complete: false, phase: state.phase };
  }

  function buildError(state) {
    const q = quantities(state.level);
    if (state.level.challengeType === 'multiply') {
      return `还差 ${q.groups - state.groupCounts.length} 组。点发光脚印接伙伴。`;
    }
    if (state.level.challengeType === 'share') {
      return state.poolRemaining > 0 ? `还有 ${state.poolRemaining} 只。点营地脚印继续分。` :
        '还不一样多。点多的营地里的恐龙，请它回来。';
    }
    const partial = partialCount(state, q);
    return partial ? `这一队还差 ${q.perGroup - partial} 只。点脚印继续。` :
      '还有伙伴等着呢。点发光脚印，一只一只站好。';
  }

  function act(state, action, value) {
    if (!handles(state.level)) return base.act(state, action, value);
    if (state.complete) return { changed: false, complete: true, phase: state.phase };
    const q = quantities(state.level);

    if (action === 'undo') {
      const previous = state.history.pop();
      if (!previous) return unchanged();
      Object.assign(state, previous);
      state.error = false;
      state.answer = null;
      state.feedback = state.phase === 'answer' ? question(state) : buildGuidance(state.level);
      return { changed: true, complete: false, phase: state.phase };
    }

    if (action === 'answer') {
      if (!integer(value) || state.phase !== 'answer') return unchanged();
      // The answer can only be submitted after the child has built a correct model.
      if (!correct(state)) return reject(state, '先把伙伴摆好，再回答。');
      state.answer = value;
      if (value !== expectedAnswer(state)) {
        return reject(state, `再看看你摆的伙伴。${question(state)}`);
      }
      state.error = false;
      state.complete = true;
      state.feedback = state.level.cheer || '你通过动手分组，算出来啦！';
      return { changed: true, complete: true, phase: 'answer' };
    }

    if (action === 'check') {
      if (state.phase !== 'build') return unchanged();
      if (!correct(state)) return reject(state, buildError(state));
      state.history.push(snapshot(state));
      state.phase = 'answer';
      state.answer = null;
      state.error = false;
      state.feedback = question(state);
      return { changed: true, complete: false, phase: 'answer' };
    }

    if (state.phase !== 'build') return unchanged();
    const type = state.level.challengeType;
    // Check every boundary before saving history or clearing an existing error.
    if (type === 'multiply' && action === 'add-group') {
      if (state.groupCounts.length >= q.groups || state.poolRemaining < q.perGroup) return unchanged();
    } else if (type === 'share' && (action === 'share' || action === 'take-back')) {
      if (!integer(value) || value >= q.groups) return unchanged();
      if ((action === 'share' && state.poolRemaining < 1) ||
          (action === 'take-back' && state.groupCounts[value] < 1)) return unchanged();
    } else if (isGrouping(state) && action === 'place-one') {
      if (partialCount(state, q)) {
        if (state.poolRemaining < 1) return unchanged();
      } else if (state.poolRemaining < q.perGroup || state.groupCounts.length >= q.groups) return unchanged();
    } else if (isGrouping(state) && action === 'make-group') {
      // A legacy batch action cannot skip an unfinished team.
      if (partialCount(state, q) || state.poolRemaining < q.perGroup || state.groupCounts.length >= q.groups) return unchanged();
    } else return unchanged();

    state.history.push(snapshot(state));
    if (action === 'add-group' || action === 'make-group') {
      state.groupCounts.push(q.perGroup);
      state.poolRemaining -= q.perGroup;
    } else if (action === 'place-one') {
      if (partialCount(state, q)) state.groupCounts[state.groupCounts.length - 1] += 1;
      else state.groupCounts.push(1);
      state.poolRemaining -= 1;
    } else if (action === 'share') {
      state.groupCounts[value] += 1;
      state.poolRemaining -= 1;
    } else {
      state.groupCounts[value] -= 1;
      state.poolRemaining += 1;
    }
    state.error = false;
    state.answer = null;
    state.feedback = correct(state) ? '摆好啦！点 ✓，数一数。' :
      action === 'take-back' ? '这只回来啦！再点一个营地的脚印。' :
      type === 'share' ? (state.poolRemaining ? `还有 ${state.poolRemaining} 只。点脚印继续分。` : '分完啦，看看每个营地是不是一样多。') :
      isGrouping(state) ? (partialCount(state, q) ? `这一队还差 ${q.perGroup - partialCount(state, q)} 只。再点脚印。` : '这一队站好啦！点脚印，开始下一队。') :
      `摆了 ${state.groupCounts.length} 组。再点发光脚印。`;
    return { changed: true, complete: false, phase: 'build' };
  }

  function equation(state, reveal = false) {
    if (!handles(state.level)) return base.equation(state, reveal);
    const l = state.level;
    const q = quantities(l);
    if (l.challengeType === 'multiply') return `${l.a} × ${l.b} = ${reveal ? q.total : '?'}`;
    if (l.challengeType === 'remainder') {
      const quotient = reveal || state.phase === 'answer' ? q.groups : '?';
      return `${l.a} ÷ ${l.b} = ${quotient} 余 ${reveal ? q.remainder : '?'}`;
    }
    return `${l.a} ÷ ${l.b} = ${reveal ? expectedAnswer(state) : '?'}`;
  }

  function progress(state) {
    if (!handles(state.level)) return typeof base.progress === 'function' ? base.progress(state) : null;
    const q = quantities(state.level);
    const completedGroups = state.groupCounts.filter(n => n === q.perGroup).length;
    return { total: q.total, assigned: totalInGroups(state), remaining: state.poolRemaining,
      createdGroups: state.level.challengeType === 'share' ? state.groupCounts.filter(n => n > 0).length : completedGroups,
      completedGroups, partialCount: partialCount(state, q),
      targetGroups: q.groups, perGroup: q.perGroup, ready: correct(state) };
  }

  window.DinoChallengeEngine = { ...base, create, act, correct, equation, progress };
})();
