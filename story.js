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
