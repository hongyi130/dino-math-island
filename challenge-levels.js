/* Chapter two: concrete operations within ten. Load before game.js. */
(() => {
  const chapters = [
    { type: 'fill', tag: '补齐伙伴', icon: '🐾', rows: [[2,5,'apato'],[3,7,'mamenshi'],[5,8,'argentino'],[6,10,'alamo'],[4,9,'shuno']] },
    { type: 'split', tag: '分成两队', icon: '🏕️', rows: [[5,2,'camara'],[6,4,'europa'],[7,3,'dicraeo'],[8,5,'niger'],[10,6,'corytho']] },
    { type: 'compare', tag: '比比多少', icon: '🤝', rows: [[3,5,'maia'],[6,4,'edmonto'],[4,4,'ourano'],[7,9,'tsintao'],[10,8,'saurolo']] },
    { type: 'jump', tag: '石头小路', icon: '🐾', rows: [[2,3,'pachyrhino'],[7,-2,'centro'],[4,4,'chasmo'],[9,-3,'nasuto'],[5,5,'pentacera']] }
  ];
  window.DINO_CHALLENGES = chapters.flatMap((chapter, chapterIndex) => chapter.rows.map(([a,b,kind], offset) => {
    const id = 51 + chapterIndex * 5 + offset;
    const type = chapter.type;
    const task = type === 'fill' ? `小伙伴想凑成${b}只。点亮空脚印，一只一只接来。摆好后，点对勾。`
      : type === 'split' ? `把${a}只伙伴分到两个营地。左边住${b}只，其他伙伴住右边。点营地送伙伴过去，分好后点对勾。`
      : type === 'compare' ? '先点中间的小手，让两边伙伴一对一牵手。再点伙伴更多的一边；一样多，就点等号。最后点对勾。'
      : `从${a}出发，${b > 0 ? '向右' : '向左'}跳${Math.abs(b)}步。一步跳一块相邻的石头，到站后点对勾。`;
    return { id, mode:'challenge', challengeType:type, a,b, factKind:kind, tag:chapter.tag, icon:chapter.icon,
      title: type === 'fill' ? `${a} + ? = ${b}` : type === 'split' ? `${a} = ${b} + ?` : type === 'compare' ? '谁的伙伴多？' : `${a} ${b>0?'+':'−'} ${Math.abs(b)} = ?`,
      guidance: type === 'fill' ? '点空脚印，接来伙伴' : type === 'split' ? '点营地，分一只伙伴' : type === 'compare' ? '牵牵手，比一比' : `向${b>0?'右':'左'}跳 ${Math.abs(b)} 步`,
      task, goal:type==='fill'?b:type==='split'?a:type==='compare'?Math.max(a,b):a+b,
      cheer: type === 'fill' ? '空脚印都有伙伴啦，你找到了缺少的部分！' : type === 'split' ? '两队合起来还是原来那么多，你会分与合啦！' : type === 'compare' ? '一只对一只，谁多谁少看得清！' : '每一步都数清楚了，你走出了这道算式！',
      taskFile:`chapter2-${id}.m4a`, sceneIndex:chapterIndex, seed:[], pairs:[[kind]], goalLabel:'小探险', discovery:'' };
  }));
})();
