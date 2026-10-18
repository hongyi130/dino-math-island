/* Four different hands-on activities; no answer-choice shortcut. */
(() => {
  window.createDinoChallengeView = ({mount,characters,onAction}) => {
    const root=document.createElement('section');
    root.className='challenge-play';root.hidden=true;
    root.setAttribute('aria-label','恐龙数学新探险');
    mount.appendChild(root);
    root.addEventListener('click',event=>{
      const button=event.target.closest('[data-ch-action]');
      if(button&&!button.disabled) onAction(button.dataset.chAction,button.dataset.value);
    });
    function image(kind,extra='') {return `<img src="./assets/${characters[kind].image}" alt="" draggable="false" ${extra}>`;}
    function dots(n) {return `<span class="camp-dots" aria-hidden="true">${'●'.repeat(n)}</span>`;}
    let lastJumpFrame=null;
    function jumpContent(s) {
      const l=s.level,step=Math.sign(l.b),total=Math.abs(l.b),taken=s.jumps.length;
      const next=s.position+step,done=taken===total;
      // Stone centers share a single ruler with the character and hop arcs.
      const center=i=>`calc(${((i+.5)/11*100).toFixed(5)}% + ${(1-2*(i+.5)/11).toFixed(5)} * var(--jump-gutter))`;
      const hops=s.jumps.map((to,index)=>({from:index?s.jumps[index-1]:l.a,to,done:true}));
      if(!done) hops.push({from:s.position,to:next,done:false});
      return `<div class="jump-journey">
        <div class="jump-instruction" id="jumpInstruction">
          <div class="jump-route-order"><span class="jump-origin-label">从 <strong>${l.a}</strong> 出发</span><b class="jump-direction" aria-hidden="true">${step>0?'→':'←'}</b><span class="jump-distance">跳 <strong>${total}</strong> 步</span></div>
          <div class="jump-progress" aria-label="已跳${taken}步，共${total}步">${Array.from({length:total},(_,i)=>`<span class="jump-paw ${i<taken?'done':''}" aria-hidden="true">${i<taken?'✓':'🐾'}</span>`).join('')}<span class="jump-progress-count">${taken}<small> / ${total}</small></span></div>
        </div>
        <div class="jump-viewport" tabindex="0" role="region" aria-label="零到十的石头数轴，可左右滑动" aria-describedby="jumpInstruction">
          <div class="jump-track" style="--jump-position:${s.position}">
            <div class="jump-ground-line" aria-hidden="true"></div>
            <svg class="jump-arcs" viewBox="0 0 1100 76" preserveAspectRatio="none" aria-hidden="true">${hops.map(h=>{const x1=(h.from+.5)*100,x2=(h.to+.5)*100;return `<path class="${h.done?'taken':'next'}" d="M ${x1} 68 Q ${(x1+x2)/2} 3 ${x2} 68"/><circle class="${h.done?'taken':'next'}" cx="${x2}" cy="68" r="4"/>`;}).join('')}</svg>
            <div class="jump-hero ${step<0?'faces-left':''}" style="left:${center(s.position)}" aria-hidden="true"><span class="jump-contact-shadow"></span><span class="jump-creature">${image(l.factKind)}</span></div>
            <div class="stone-path jump-stones">${Array.from({length:11},(_,i)=>{
              const current=s.position===i,visited=s.jumps.includes(i),upNext=!done&&i===next;
              return `<button type="button" class="number-stone ${current?'current':''} ${visited?'visited':''} ${i===l.a?'origin':''} ${upNext?'up-next':''}" data-ch-action="jump" data-value="${i}" aria-label="${i}号石头${current?'，恐龙在这里':i===l.a?'，出发的起点':''}${upNext?'，向'+(step>0?'右':'左')+'跳一步':''}" ${current?'aria-current="step"':''}><b>${i}</b>${i===l.a?'<small class="stone-origin">起点</small>':current?'<small class="stone-here">在这里</small>':''}${upNext?'<span class="stone-next-cue" aria-hidden="true">'+(step>0?'→':'←')+'</span>':''}</button>`;
            }).join('')}</div>
          </div>
        </div>
        <div class="jump-scroll-guide" aria-hidden="true"><span>0</span><i>↔ 左右滑动，看看整条小路</i><span>10</span></div>
      </div>`;
    }
    function content(s) {
      const l=s.level,kind=l.factKind;
      if(l.challengeType==='fill') return `<div class="fill-nest" aria-label="凑成${l.b}只伙伴">${Array.from({length:l.b},(_,i)=>{
        const has=s.placed.includes(i),fixed=i<l.a;
        return `<button type="button" class="nest-place ${has?'occupied':'waiting'} ${fixed?'original':''}" data-ch-action="fill" data-value="${i}" ${fixed?'disabled':''} aria-label="${fixed?'原来的伙伴':has?'请这只伙伴回来':'空脚印，接来一只伙伴'}">${has?image(kind):'<span class="footprint">🐾</span><b>＋</b>'}${has&&!fixed?'<small>＋1</small>':''}</button>`;
      }).join('')}</div><div class="challenge-equation" aria-label="运算过程"><span>${l.a}</span><b>＋</b><span class="moving-number">${s.placed.length-l.a}</span><b>＝</b><span>${s.placed.length}</span><small>目标 ${l.b} 只</small></div>`;
      if(l.challengeType==='split') return `<div class="waiting-partners" aria-label="等待分队的伙伴">${s.camps.map((camp,i)=>camp===null?`<span class="waiting-dino">${image(kind)}</span>`:'').join('')||'<span class="all-sorted">✓ 都进营地啦</span>'}</div><div class="camp-layout">${['left','right'].map(side=>{
        const n=s.camps.filter(x=>x===side).length;
        return `<div class="dino-camp ${side}"><button type="button" class="camp-send" data-ch-action="camp" data-value="${side}" aria-label="送一只伙伴到${side==='left'?'左':'右'}边营地"><span aria-hidden="true">${side==='left'?'🌞':'🌙'} 🏕️</span><strong>${side==='left'?`住 ${l.b} 只`:'其他伙伴'}</strong>${side==='left'?dots(l.b):'<span class="camp-dots">?</span>'}<span class="camp-arrive" aria-hidden="true">↓ ＋1</span></button><div class="camp-residents">${s.camps.map((camp,i)=>camp===side?`<button type="button" class="resident" data-ch-action="return" data-value="${i}" aria-label="请营地里的第${i+1}只伙伴回来">${image(kind)}</button>`:'').join('')}</div><b class="camp-count">${n} 只</b></div>`;
      }).join('')}</div>`;
      if(l.challengeType==='compare') return `<div class="pairing-legend" aria-hidden="true"><span>🌞 太阳队</span><span>🌙 月亮队</span></div><div class="pairing-cards" aria-label="一对一牵手">${Array.from({length:Math.max(l.a,l.b)},(_,i)=>{
        const paired=s.paired.includes(i),both=i<Math.min(l.a,l.b);
        return `<button type="button" class="matching-pair ${paired?'paired':''} ${both?'':'unpaired'}" data-ch-action="pair" data-value="${i}" ${!both||paired?'disabled':''} aria-label="${both?`让第${i+1}对伙伴牵手`:'剩下的一只伙伴'}"><span class="team-sun">${i<l.a?'<i class="team-icon">🌞</i>'+image(kind):''}</span><span class="pair-link" aria-hidden="true">${both?(paired?'━':'🤝'):''}</span><span class="team-moon">${i<l.b?'<i class="team-icon">🌙</i>'+image(kind):''}</span></button>`;
      }).join('')}</div><div class="compare-pick" aria-label="选择哪边更多"><button type="button" class="sun ${s.choice==='left'?'selected':''}" data-ch-action="choose" data-value="left" aria-pressed="${s.choice==='left'}" aria-label="太阳队更多">🌞<strong>更多</strong></button><button type="button" class="equal ${s.choice==='equal'?'selected':''}" data-ch-action="choose" data-value="equal" aria-pressed="${s.choice==='equal'}" aria-label="两队一样多"><b>＝</b><strong>一样多</strong></button><button type="button" class="moon ${s.choice==='right'?'selected':''}" data-ch-action="choose" data-value="right" aria-pressed="${s.choice==='right'}" aria-label="月亮队更多">🌙<strong>更多</strong></button></div>`;
      return jumpContent(s);
    }
    function render(s) {
      root.hidden=!s;
      if(!s) return;
      root.dataset.type=s.level.challengeType;
      root.classList.toggle('challenge-error',s.error);
      root.innerHTML=`<div class="challenge-hands">${content(s)}</div><div class="challenge-footer"><p class="challenge-feedback" role="status" aria-live="polite">${s.error?'<b aria-hidden="true">✕</b> ':''}${s.feedback}</p><div class="challenge-controls"><button type="button" class="challenge-undo" data-ch-action="undo" ${!s.history.length||s.complete?'disabled':''} aria-label="撤回一步">↶</button><button type="button" class="challenge-check" data-ch-action="check" ${s.complete?'disabled':''} aria-label="检查摆放结果"><span aria-hidden="true">✓</span> 摆好啦</button><button type="button" class="challenge-restart" data-ch-action="restart" aria-label="重玩本关">↻</button></div></div>`;
      if(s.level.challengeType==='jump') {
        const viewport=root.querySelector?.('.jump-viewport'),track=root.querySelector?.('.jump-track');
        const current=root.querySelector?.('.number-stone.current'),hero=root.querySelector?.('.jump-hero');
        if(viewport&&track&&current) {
          // Scroll only the path: scrollIntoView also moved the entire phone page.
          viewport.scrollLeft=Math.max(0,Math.min(track.scrollWidth-viewport.clientWidth,current.offsetLeft+current.offsetWidth/2-viewport.clientWidth/2));
          if(lastJumpFrame&&lastJumpFrame.id===s.level.id&&Math.abs(lastJumpFrame.position-s.position)===1&&hero) {
            hero.style.setProperty('--jump-travel',`${(lastJumpFrame.position-s.position)*current.offsetWidth}px`);
            hero.classList.add('is-hopping');
          }
        }
        lastJumpFrame={id:s.level.id,position:s.position};
      } else lastJumpFrame=null;
    }
    return {root,render};
  };
})();
