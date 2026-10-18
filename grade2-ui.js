/* Countable herds stand on the island; footprints are the controls. */
(() => {
  window.createGradeTwoView = ({mount,characters,onAction}) => {
    const root=document.createElement('section');
    root.className='challenge-play grade2-play';root.hidden=true;
    root.setAttribute('aria-label','二年级乘除法探险');mount.appendChild(root);
    let previous=null,travelOrigin=null;
    const updateScrollCue=()=>{const pool=root.querySelector?.('.g2-pool-herd');root.querySelector?.('.g2-waiting')?.classList.toggle('is-scrollable',!!pool&&pool.scrollHeight>pool.clientHeight+5);};
    const keepActiveVisible=()=>{
      const focusedCamp=root.contains?.(document.activeElement)?document.activeElement?.closest?.('.g2-clearing'):null;
      const next=focusedCamp?.querySelector?.('.g2-footstep.is-next')||root.querySelector?.('.g2-footstep.is-next'),land=root.querySelector?.('.g2-teamland');
      if(!next||!land?.getBoundingClientRect)return;
      const clearing=next.closest?.('.g2-clearing'),bounds=land.getBoundingClientRect();
      const whole=clearing&&clearing.getBoundingClientRect().height<=land.clientHeight+1;
      const r=(whole?clearing:next).getBoundingClientRect();
      if(whole||r.top<bounds.top)land.scrollTop+=r.top-bounds.top;
      else if(r.bottom>bounds.bottom)land.scrollTop+=r.bottom-bounds.bottom;
    };
    if(window.ResizeObserver)new window.ResizeObserver(()=>{updateScrollCue();keepActiveVisible();}).observe(root);
    root.addEventListener('click',event=>{
      const button=event.target.closest('[data-g2-action]');
      if(!button||button.disabled)return;
      const action=button.dataset.g2Action;
      const pool=root.querySelector?.('.g2-pool-herd');
      const poolBounds=pool?.getBoundingClientRect?.();
      const visiblePartner=Array.from(pool?.querySelectorAll?.('.g2-dino')||[]).find(el=>{const r=el.getBoundingClientRect();return r.top>=poolBounds.top&&r.bottom<=poolBounds.bottom;});
      const origin=action==='take-back'?button:visiblePartner;
      travelOrigin=origin?.getBoundingClientRect?.()||null;
      onAction(action,button.dataset.value===undefined?undefined:Number(button.dataset.value));
    });
    const picture=kind=>`<img src="./assets/${characters[kind].image}" alt="" draggable="false">`;
    const paw=`<svg class="g2-paw" viewBox="0 0 48 58" aria-hidden="true"><ellipse cx="10" cy="21" rx="5" ry="10" transform="rotate(-25 10 21)"/><ellipse cx="23" cy="13" rx="5" ry="12"/><ellipse cx="37" cy="20" rx="5" ry="10" transform="rotate(25 37 20)"/><path d="M14 32Q24 24 32 33L39 43Q42 54 30 53L23 50 16 53Q4 55 8 44Z"/></svg>`;
    const marker=`<svg viewBox="0 0 36 46" aria-hidden="true"><path d="M8 43 10 5" fill="none" stroke="#886543" stroke-width="4" stroke-linecap="round"/><path d="M11 6Q22 1 33 7L27 15 33 22Q19 16 10 22Z" fill="currentColor"/><ellipse cx="11" cy="43" rx="10" ry="3" fill="#2d402a33"/></svg>`;
    const colors=['#f3c977','#91c7a6','#9acbd7','#d6add9','#e9a48a','#cfdb85'];
    function options(l){const values=[Math.max(0,l.goal-1),l.goal,l.goal+1];if(l.goal===0)values[0]=2;const shift=l.id%3;return values.slice(shift).concat(values.slice(0,shift));}
    function dinosaur(kind,index,arriving=false,action='',group=0){
      const tag=action?'button':'span';
      return `<${tag} class="g2-dino ${arriving?'is-arriving':''}" ${action?`type="button" data-g2-action="${action}" data-value="${group}" aria-label="请${group+1}号营地第${index+1}只恐龙回来"`:''}>${picture(kind)}</${tag}>`;
    }
    function render(s){
      root.hidden=!s;if(!s){previous=null;return;}
      const l=s.level,type=l.challengeType,multiply=type==='multiply',share=type==='share',answer=s.phase==='answer',ready=window.DinoChallengeEngine.correct(s);
      const same=previous?.id===l.id,oldGroups=same?previous.groups:[];
      const completeGroups=s.groupCounts.filter(n=>n===l.perGroup).length;
      const partial=s.groupCounts.length&&s.groupCounts.at(-1)<l.perGroup;
      const canStart=!ready&&s.poolRemaining>=l.perGroup;
      const current=partial?s.groupCounts.length-1:s.groupCounts.length;
      const zoneCount=multiply||share?l.groups:Math.max(1,s.groupCounts.length+(canStart&&!partial?1:0));
      const question=multiply?'一共有几只？':share?'每个营地有几只？':type==='group'?'分成了几队？':'还剩几只？';
      const instruction=multiply?`每队 <b>${l.perGroup}</b> 只，接来 <b>${l.groups}</b> 队`:share?`住进 <b>${l.groups}</b> 个营地，每边一样多`:`<b>${l.perGroup}</b> 只一队`;
      const prompt=answer?question:ready?(type==='remainder'?'这几只不够一队，留下来。':'排好啦，数一数。'):share?'点营地的脚印，送一只过去。':multiply?'点发光脚印，接来一队。':'点发光脚印，一只一只排好队。';
      const focused=root.contains?.(document.activeElement)?document.activeElement?.dataset:null;
      const scrollPositions=['.g2-pool-herd','.g2-teamland','.g2-savanna'].map(selector=>[selector,same?(root.querySelector?.(selector)?.scrollTop||0):0]);
      root.dataset.type=type;root.dataset.phase=s.phase;root.classList.toggle('challenge-error',s.error);
      const pool=!multiply?`<aside class="g2-waiting ${s.poolRemaining<=5?'few-left':'herd'} ${ready&&s.poolRemaining?'is-remainder':''}" aria-label="${ready?'留下':'等着出发'}的${s.poolRemaining}只恐龙"><div class="g2-waiting-label">${s.poolRemaining?ready?'留下的伙伴':'等着出发':'伙伴都出发啦'}${!ready?`<small>还在等 <b>${s.poolRemaining}</b> 只 · 原来 ${l.total} 只</small>`:''}<span class="g2-scroll-cue">↕ 滑动看伙伴</span></div><div class="g2-pool-herd" style="--herd-columns:${Math.min(s.poolRemaining<=5?3:5,Math.max(1,s.poolRemaining))}">${s.poolRemaining?Array.from({length:s.poolRemaining},(_,i)=>dinosaur(l.factKind,i,same&&s.poolRemaining>previous.remaining&&i>=previous.remaining)).join(''):'<span class="g2-all-away" aria-hidden="true">🐾　🐾　↗</span>'}</div>${s.poolRemaining&&ready?'<div class="g2-remainder-note">数数留下几只</div>':''}</aside>`:'';
      const zones=Array.from({length:zoneCount},(_,i)=>{
        const n=s.groupCounts[i]||0,active=!answer&&(share?s.poolRemaining>0:i===current&&!ready);
        const slots=share?n+(!answer&&s.poolRemaining?1:0):l.perGroup;
        const newGroup=same&&n>(oldGroups[i]||0);
        const residents=Array.from({length:Math.max(1,slots)},(_,j)=>{
          if(j<n)return `<span class="g2-place">${dinosaur(l.factKind,j,newGroup&&j>=(oldGroups[i]||0),share&&!answer?'take-back':'',i)}</span>`;
          const clickable=active&&(multiply?j===0:share||j===n);
          if(clickable)return `<button type="button" class="g2-place g2-footstep is-next" data-g2-action="${share?'share':multiply?'add-group':'place-one'}" ${share?`data-value="${i}"`:''} aria-label="${share?`送一只到${i+1}号营地`:multiply?`接来一队${l.perGroup}只恐龙`:'送一只到发光脚印'}">${paw}<span class="g2-tap-cue" aria-hidden="true">☝</span><span class="g2-tap-label" aria-hidden="true">点这里</span></button>`;
          return `<span class="g2-place g2-footstep ${answer?'quiet':''}" aria-hidden="true">${paw}</span>`;
        }).join('');
        const caption=share?(n?'点恐龙可请回来':'点脚印，来一只'):n===l.perGroup?'✓ 凑齐一队':n?`还差 ${l.perGroup-n} 只`:active?multiply?'点脚印，来一队':'点脚印，来一只':'等伙伴过来';
        return `<div class="g2-clearing ${n===l.perGroup&&!share?'is-full':''} ${active?'is-active':''} ${!n?'is-empty':''}" style="--camp-color:${colors[i%colors.length]}" aria-label="${share?'营地':'恐龙小队'}${i+1}${n?'，已有'+n+'只':''}"><span class="g2-landmark">${marker}<b>${i+1}</b></span><div class="g2-ground" aria-hidden="true"></div><div class="g2-residents" style="--places:${Math.min(slots>6?4:3,Math.max(1,slots))}">${residents}</div><span class="g2-group-caption">${answer?'':caption}</span></div>`;
      }).join('');
      const sum=multiply&&s.groupCounts.length?`<div class="g2-sum" aria-label="相同加数">${s.groupCounts.map(n=>`<b>${n}</b>`).join('<span>＋</span>')}<span>＝ ?</span></div>`:'';
      root.innerHTML=`<div class="g2-instruction"><strong>${instruction}</strong><span>${prompt}</span></div><div class="g2-savanna ${multiply?'without-pool':''} ${!multiply&&!s.poolRemaining?'is-empty-pool':''} ${ready&&type==='remainder'?'remainder-ready':''}">${pool}<div class="g2-teamland"><div class="g2-clearings" style="--teams:${multiply||share?Math.min(3,zoneCount):3}">${zones}</div>${sum}</div></div><footer class="challenge-footer g2-footer"><p class="challenge-feedback" role="status" aria-live="polite">${s.error?'<b aria-hidden="true">✕</b> ':''}${s.feedback}</p>${answer?`<div class="g2-answer"><strong>${question}</strong><div class="g2-options" aria-label="选择运算结果">${options(l).map(n=>`<button type="button" data-g2-action="answer" data-value="${n}" class="${s.error&&s.answer===n?'wrong':''}" aria-label="答案${n}">${n}</button>`).join('')}</div></div>`:''}<div class="challenge-controls"><button type="button" data-g2-action="undo" ${!s.history.length?'disabled':''} aria-label="${answer?'回去调整':'撤回一步'}">↶</button>${!answer?'<button type="button" class="challenge-check" data-g2-action="check" aria-label="检查分组，数一数">✓ 数一数</button>':'<span class="g2-answer-hint">点一个数字</span>'}<button type="button" data-g2-action="restart" aria-label="重玩本关">↻</button></div></footer>`;
      scrollPositions.forEach(([selector,top])=>{const el=root.querySelector?.(selector);if(el)el.scrollTop=top;});
      if(ready&&!previous?.ready){const land=root.querySelector?.('.g2-teamland');if(land)land.scrollTop=0;}
      if(focused?.g2Action&&!s.complete){
        const next=root.querySelector?.(`[data-g2-action="${focused.g2Action}"]${focused.value!==undefined?`[data-value="${focused.value}"]`:''}`);
        if(next&&!next.disabled){
          next.focus?.({preventScroll:true});

        }
      }
      keepActiveVisible();
      // Measure arrival after scrolling so the landing feet stay in the right place.
      if(travelOrigin&&same&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
        root.querySelectorAll?.('.is-arriving').forEach(el=>{
          if(typeof el.animate!=='function')return;
          const to=el.getBoundingClientRect();
          el.animate([{transform:`translate(${travelOrigin.left-to.left}px,${travelOrigin.top-to.top}px) scale(.9)`,opacity:.75},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:420,easing:'cubic-bezier(.2,.65,.3,1)'});
        });
      }
      updateScrollCue();
      travelOrigin=null;previous={id:l.id,groups:[...s.groupCounts],remaining:s.poolRemaining,completeGroups,ready};
    }
    return {render};
  };
})();
