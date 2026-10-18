/* Pure chapter state. UI and tests use exactly the same transitions. */
(() => {
  const copy = (state) => ({ placed:[...state.placed], camps:[...state.camps], paired:[...state.paired], choice:state.choice, position:state.position, jumps:[...state.jumps] });
  function create(level) {
    return { level, placed:Array.from({length:level.a},(_,i)=>i), camps:Array(level.a).fill(null), paired:[], choice:null,
      position:level.a, jumps:[], history:[], error:false, complete:false, feedback:level.guidance };
  }
  function correct(state) {
    const l=state.level;
    if(l.challengeType==='fill') return state.placed.length===l.b;
    if(l.challengeType==='split') return state.camps.every(x=>x!==null)&&state.camps.filter(x=>x==='left').length===l.b;
    if(l.challengeType==='compare') return state.paired.length===Math.min(l.a,l.b)&&state.choice===(l.a===l.b?'equal':l.a>l.b?'left':'right');
    return state.jumps.length===Math.abs(l.b)&&state.position===l.a+l.b;
  }
  function reject(state,text) { state.error=true;state.feedback=text;return {changed:false,wrong:true,complete:false}; }
  function act(state,action,value) {
    if(state.complete) return {changed:false,complete:true};
    const l=state.level;
    if(action==='check') {
      if(!correct(state)) {
        const text=l.challengeType==='fill'?'还有空脚印，接齐伙伴再试试。':l.challengeType==='split'?(state.camps.includes(null)?'还有伙伴没进营地。':`左边要住 ${l.b} 只。点营地里的伙伴，可以请它回来。`):l.challengeType==='compare'?(state.paired.length<Math.min(l.a,l.b)?'先让每一对伙伴牵手。':state.choice===null?'点更多的一边；一样多就点等号。':'再看剩下的伙伴，重新选一选。'):'还没到站。沿着箭头，一步一块石头。';
        return reject(state,text);
      }
      state.error=false;state.complete=true;state.feedback=l.cheer;
      return {changed:true,complete:true};
    }
    if(action==='undo') {
      const previous=state.history.pop();
      if(!previous) return {changed:false};
      Object.assign(state,previous);state.error=false;state.feedback=l.guidance;
      return {changed:true};
    }
    const previous=copy(state);
    if(l.challengeType==='fill'&&action==='fill') {
      const index=Number(value);
      if(!Number.isInteger(index)||index<l.a||index>=l.b) return {changed:false};
      const at=state.placed.indexOf(index);
      at<0?state.placed.push(index):state.placed.splice(at,1);
      state.feedback=state.placed.length===l.b?'脚印站满啦，点 ✓ 看看。':`接来了 ${state.placed.length-l.a} 只。`;
    } else if(l.challengeType==='split'&&action==='camp') {
      if(!['left','right'].includes(value)) return {changed:false};
      const next=state.camps.indexOf(null);
      if(next<0) return reject(state,'都进营地啦。想调整，点营地里的伙伴。');
      state.camps[next]=value;state.feedback=state.camps.includes(null)?'再选一个营地，送下一只过去。':'分好啦，点 ✓ 看看。';
    } else if(l.challengeType==='split'&&action==='return') {
      const index=Number(value);
      if(!Number.isInteger(index)||index<0||index>=l.a||state.camps[index]===null) return {changed:false};
      state.camps[index]=null;state.feedback='这只回来啦，再选一个营地。';
    } else if(l.challengeType==='compare'&&action==='pair') {
      const index=Number(value);
      if(!Number.isInteger(index)||index<0||index>=Math.min(l.a,l.b)||state.paired.includes(index)) return {changed:false};
      state.paired.push(index);state.choice=null;
      state.feedback=state.paired.length===Math.min(l.a,l.b)?'看谁还有伙伴没牵手。一样多，就点 =。':'继续点小手，让伙伴一对一牵手。';
    } else if(l.challengeType==='compare'&&action==='choose') {
      if(!['left','right','equal'].includes(value)) return {changed:false};
      if(state.paired.length<Math.min(l.a,l.b)) return reject(state,'先点小手，让每一对伙伴牵手。');
      state.choice=value;state.feedback='选好啦，点 ✓ 看看。';
    } else if(l.challengeType==='jump'&&action==='jump') {
      const target=Number(value);
      if(state.jumps.length>=Math.abs(l.b)) return reject(state,'步数跳够啦，点 ✓ 看看；也可以撤回。');
      if(target!==state.position+Math.sign(l.b)||target<0||target>10) return reject(state,`跟着箭头向${l.b>0?'右':'左'}，只跳旁边的一块石头。`);
      state.position=target;state.jumps.push(target);
      state.feedback=state.jumps.length===Math.abs(l.b)?'到站啦，点 ✓ 看看。':`已经跳了 ${state.jumps.length} 步。`;
    } else return {changed:false};
    state.history.push(previous);state.error=false;
    return {changed:true,complete:false};
  }
  function equation(state,reveal=false) {
    const l=state.level;
    if(l.challengeType==='fill') return `${l.a} + ${reveal?l.b-l.a:'?'} = ${l.b}`;
    if(l.challengeType==='split') return `${l.a} = ${l.b} + ${reveal?l.a-l.b:'?'}`;
    if(l.challengeType==='compare') return `${l.a} ${reveal?(l.a===l.b?'=':l.a>l.b?'>':'<'):'?'} ${l.b}`;
    return `${l.a} ${l.b>0?'+':'−'} ${Math.abs(l.b)} = ${reveal?l.a+l.b:'?'}`;
  }
  window.DinoChallengeEngine={create,act,correct,equation};
})();
