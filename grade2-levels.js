/* Original manipulative exercises aligned to PEP grade-two topics.
   Curriculum evidence and scope: CURRICULUM-GRADE2.md. */
(() => {
  const blocks = [
    ['multiply','乘法的初步认识与1～6的口诀',[[2,2],[2,3],[3,2],[5,2],[4,3],[3,4],[6,3],[1,4]]],
    ['share','平均分：每份有几个',[[4,2],[6,2],[6,3],[8,4],[10,2],[12,3]]],
    ['group','平均分：能分成几份',[[6,2],[8,2],[12,3],[15,5],[18,6],[24,4]]],
    ['multiply','7、8、9的乘法口诀',[[7,2],[7,3],[8,2],[8,4],[9,2],[9,4]]],
    ['share','用7、8、9的口诀求商',[[14,2],[24,3],[27,3],[18,2]]],
    ['group','用7、8、9的口诀求商',[[21,7],[32,8],[27,9],[28,7]]],
    ['remainder','有余数的除法',[[7,2],[10,3],[14,4],[17,5],[23,6],[29,8]]]
  ];
  const kinds=['trike','stego','maia','sino','apato','pachyrhino','euoplo','galli','parasaur','saurolo','mamenshi','proto','huayang','niger','anky','corytho','centro','lambeo','shuno','camara','micro','yuty','edmonto','nasuto','ourano','pentacera','argentino','sauropelta','tuojiang','deinonych','utah','tsintao','europa','dicraeo','therizino','brachio','pachy','psittaco','oviraptor','alamo'];
  let index=0;
  window.DINO_GRADE2=blocks.flatMap(([type,unit,rows])=>rows.map(([a,b])=>{
    const id=71+index,kind=kinds[index++];
    const total=type==='multiply'?a*b:a;
    const groups=type==='multiply'?b:type==='share'?b:Math.floor(a/b);
    const perGroup=type==='multiply'?a:type==='share'?a/b:b;
    const remainder=type==='remainder'?a%b:0;
    const goal=type==='multiply'?total:type==='share'?perGroup:type==='remainder'?remainder:groups;
    const name=window.DINO_CHARACTERS?.[kind]?.name||'恐龙';
    const task=type==='multiply'?`每队有${a}只${name}，要接来${b}队。点发光脚印，每次来一队。排好后，数数一共有几只。`
      :type==='share'?`这里有${a}只${name}，要住进${b}个营地。点营地的脚印，一只一只分，让每个营地一样多。分好后，数数每个营地有几只。`
      :type==='group'?`这里有${a}只${name}，每${b}只一队。点发光脚印，一只一只送过去，凑齐一队再排下一队。分完后，数数分成了几队。`
      :`这里有${a}只${name}，每${b}只一队。点发光脚印，一只一只排队，凑齐一队再排下一队。不够一队的留在草地。分好后，数数还剩几只。`;
    const guidance=type==='multiply'?`点脚印 · 每队 ${a} 只 · 接来 ${b} 队`:type==='share'?`${a} 只 · 分到 ${b} 个营地 · 每边一样多`:`点脚印来一只 · 每 ${b} 只一队`;
    const title=type==='multiply'?`${a} × ${b} = ?`:type==='remainder'?`${a} ÷ ${b} = ? 余 ?`:`${a} ÷ ${b} = ?`;
    const cheer=type==='multiply'?'每组一样多，你用乘法找到了总数！':type==='share'?'每个营地一样多，你会平均分啦！':type==='group'?'一组一组分，你找到了能分成几组！':'剩下的比每组只数少，你找到余数啦！';
    return {id,grade:2,mode:'challenge',challengeType:type,a,b,total,groups,perGroup,remainder,goal,
      tag:'二年级 · '+unit,curriculumUnit:unit,title,guidance,task,taskFile:`grade2-${id}.m4a`,
      cheer,factKind:kind,sceneIndex:0,seed:[],pairs:[[kind]],goalLabel:'乘除法探险',discovery:''};
  }));
})();
