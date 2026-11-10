/* Waterfall-route sample. Mathematics and transitions belong to the shared engine. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const params = new URLSearchParams(location.search);
  const route = [79,80,81];
  const requested = Number(params.get('level') || 79);
  const level = window.DINO_GRADE2.find(item => item.id === (route.includes(requested) ? requested : 79));
  const engine = window.DinoChallengeEngine;
  const journey = params.get('journey') === 'waterfall' ? window.DinoJourneyStore : null;
  const parentAccess = params.get('parent') === '1';
  const mode = journey ? (parentAccess ? 'parent' : 'journey') : 'standalone';
  const mapURL = new URL('../island-journey.html?v=20261028-f3-r1', location.href).href;
  const character = window.DINO_CHARACTERS[level.factKind];
  const groundData = window.DINO_GROUND_DATA[level.factKind];
  const imageURL = new URL(`../../assets/${character.image}`, location.href).href;
  const names = ['一号营地','二号营地','三号营地'];
  let state = engine.create(level), speech, errorTurn = 0, lastArrive = null, layoutData = null;
  let aspect = character.aspect || 1.5;
  let blocked = Boolean(journey && !parentAccess && !journey.unlocked?.('waterfall') && !journey.routeDone?.('waterfall'));
  const measure = element => { const r = element.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
  const clone = value => JSON.parse(JSON.stringify(value));

  function snapshot() {
    return {kind:'share',phase:state.phase,groupCounts:[...state.groupCounts],poolRemaining:state.poolRemaining,answer:state.answer,complete:state.complete};
  }
  function saveWarning() { $('#saveWarning').hidden = !journey || journey.storageOK(); }
  function save() {
    if (journey && !blocked) journey.saveAttempt(level.id, snapshot());
    saveWarning();
  }
  function restore(saved) {
    if (!saved || saved.kind !== 'share' || !['build','answer'].includes(saved.phase) || !Array.isArray(saved.groupCounts) || saved.groupCounts.length !== level.groups) return;
    if (!saved.groupCounts.every(n => Number.isInteger(n) && n >= 0 && n <= level.total) || !Number.isInteger(saved.poolRemaining) || saved.poolRemaining < 0 || saved.groupCounts.reduce((a,b)=>a+b,0) + saved.poolRemaining !== level.total) return;
    const restored = engine.create(level);
    saved.groupCounts.forEach((n,index) => { for(let i=0;i<n;i++) engine.act(restored,'share',index); });
    if (saved.phase === 'answer') {
      if (!engine.correct(restored)) return;
      engine.act(restored,'check');
      if (saved.answer != null) {
        if (!Number.isInteger(saved.answer) || saved.answer < 0) return;
        // Restore a completed attempt only when the shared store also owns its completion.
        if (saved.complete && !journey.completed().has(level.id)) return;
        if (!saved.complete && saved.answer === level.goal) return;
        engine.act(restored,'answer',saved.answer);
      }
    } else if (saved.complete || saved.answer != null) return;
    if (Boolean(restored.complete) !== Boolean(saved.complete)) return;
    state = restored;
  }

  function plainFeedback() {
    if (state.complete) return '每个营地一样多，你会平均分啦！';
    if (state.error) return state.phase === 'answer' ? '再数数一个营地里的伙伴，重新选一选。' : state.poolRemaining ? `还有 ${state.poolRemaining} 只在等候区，继续送伙伴吧。` : '还不一样多。点多的营地里的恐龙，请它回来再分。';
    if (state.phase === 'answer') return '数一数一个营地，选出每份的数量。';
    if (!state.poolRemaining) return '分完啦，看看每个营地是不是一样多。';
    return `点营地的“＋送一只”；点营地里的恐龙可以请回。`;
  }
  function act(action,value) {
    if (blocked) return;
    const wasComplete = state.complete;
    const result = engine.act(state,action,value);
    if (result.wrong) errorTurn++;
    lastArrive = result.changed && action === 'share' ? {group:value,index:state.groupCounts[value]-1} : null;
    if (action === 'answer' && result.complete && !wasComplete && journey) journey.complete(level.id,snapshot());
    render();
  }
  function reset() {
    if (blocked) return;
    speech.reset(); state = engine.create(level); errorTurn = 0; lastArrive = null; render();
  }
  function goNext() {
    save();
    if (journey && !journey.storageOK()) return;
    if (journey?.routeDone('waterfall')) { location.href='../fossil-dig/?fossil=mamenshi&v=20261028-f3-r1'; return; }
    const next = journey ? journey.nextLevel('waterfall') : route[route.indexOf(level.id)+1];
    if (!next || !route.includes(next)) { location.href=mapURL; return; }
    const url = new URL('./',location.href);
    url.searchParams.set('level',String(next));
    if (journey) url.searchParams.set('journey','waterfall');
    if (parentAccess) url.searchParams.set('parent','1');
    url.searchParams.set('v','20261028-f3-r1');
    location.href=url.href;
  }
  function renderBar() {
    $('#bar').classList.toggle('error',state.error);
    $('#headline').textContent = state.complete ? '你算出来啦！' : state.phase === 'answer' ? '每个营地分到几只？' : '让每个营地一样多';
    $('#feedback').textContent = plainFeedback();
    $('#actions').replaceChildren();
    if (state.complete) {
      const button = document.createElement('button'); button.id='next';button.type='button';
      button.textContent = journey ? (journey.nextLevel('waterfall') ? '下一关 →' : '去挖化石！') : (level.id === 81 ? '返回地图 →' : '下一关 →');
      button.onclick=goNext; $('#actions').append(button);
    } else if (state.phase === 'answer') {
      // Choice placement varies by lesson, while correctness stays in the engine.
      const choices = [level.goal,level.goal+1,Math.max(0,level.goal-1)];
      for (let i=0;i<level.id%3;i++) choices.push(choices.shift());
      choices.forEach(value=>{
        const button=document.createElement('button');button.type='button';button.className='answer-choice';
        button.textContent=String(value);button.dataset.answer=String(value);button.setAttribute('aria-label',`${value} 只`);
        button.classList.toggle('wrong',state.error && state.answer===value);button.onclick=()=>act('answer',value);$('#actions').append(button);
      });
    } else {
      const button=document.createElement('button');button.type='button';button.id='check';button.textContent='✓ 分好了，检查一下';button.onclick=()=>act('check');$('#actions').append(button);
    }
    $('#undo').disabled = !state.history.length || state.complete;
    $('#equation').innerHTML=`<span>${level.a}</span><span class="sym">÷</span><span>${level.b}</span><span class="sym">=</span><span class="answer">${state.complete?state.answer:'?'}</span>`;
    $('#equation').setAttribute('aria-label',engine.equation(state,state.complete));
  }
  function createDino(group,index,arrive=false) {
    const button=document.createElement(group==null?'div':'button');button.className='dino'+(arrive?' arrive':'');
    button.dataset.group=group==null?'pool':String(group);button.dataset.index=String(index);
    if(group!=null){button.type='button';button.disabled=state.phase!=='build'||state.complete;button.setAttribute('aria-label',`请${names[group]}的一只${character.name}回到等候区`);button.onclick=()=>act('take-back',group);}
    else button.setAttribute('aria-label',`等候中的${character.name}`);
    for(const [x,y,w] of groundData?.contacts||[]){const shadow=document.createElement('i');shadow.className='foot-shadow';shadow.style.cssText=`left:${(x-w*.65)*100}%;top:${(y-.025)*100}%;width:${w*130}%;height:5%;`;button.append(shadow);}
    const img=document.createElement('img');img.src=imageURL;img.alt='';img.draggable=false;button.append(img);return button;
  }
  function renderField() {
    $('#poolCount').textContent=String(state.poolRemaining);
    $('#poolRack').replaceChildren(...Array.from({length:state.poolRemaining},(_,i)=>createDino(null,i)));
    if (!state.poolRemaining) $('#poolRack').innerHTML='<span class="pool-empty">伙伴都进营地啦</span>';
    $('#camps').replaceChildren();
    state.groupCounts.forEach((count,group)=>{
      const camp=document.createElement('section');camp.className='camp';camp.dataset.camp=String(group);camp.setAttribute('aria-label',`${names[group]}，${count} 只`);
      const top=document.createElement('div');top.className='camp-top';top.innerHTML=`<span class="camp-name">${names[group]}</span><strong class="count" aria-label="${count} 只">${count}</strong>`;
      const rack=document.createElement('div');rack.className='rack';rack.dataset.rack=String(group);
      for(let i=0;i<count;i++) rack.append(createDino(group,i,lastArrive?.group===group && lastArrive.index===i));
      if(!count) rack.innerHTML='<span class="camp-empty">在这里等伙伴</span>';
      const send=document.createElement('button');send.type='button';send.className='send';send.dataset.send=String(group);send.innerHTML='<span aria-hidden="true">＋</span> 送一只';send.setAttribute('aria-label',`送一只到${names[group]}`);send.disabled=state.phase!=='build'||!state.poolRemaining||state.complete;send.onclick=()=>act('share',group);
      camp.append(top,rack,send);$('#camps').append(camp);
    });
    lastArrive=null;
  }
  function groundAt(x,placement) {
    const points=placement.scene.ground.upper;
    const nx=Math.max(0,Math.min(1,(x-placement.x)/placement.width));
    for(let i=1;i<points.length;i++){
      if(nx<=points[i][0]){const [ax,ay]=points[i-1], [bx,by]=points[i];return placement.y+(ay+(by-ay)*(nx-ax)/(bx-ax))*placement.height;}
    }
    return placement.y+points.at(-1)[1]*placement.height;
  }
  function placeRack(rack,pool=false) {
    const items=[...rack.querySelectorAll('.dino')];if(!items.length)return;
    const width=rack.clientWidth,height=rack.clientHeight;
    let cols=pool?items.length:Math.min(items.length,3),rows=Math.ceil(items.length/cols);
    // More horizontal room can keep all six waiting partners on one row.
    const gap=pool?3:5, cw=(width-gap*(cols-1))/cols,ch=(height-gap*(rows-1))/rows;
    const h=Math.max(8,Math.min(ch-2,cw/aspect,pool?85:160)),w=h*aspect;
    items.forEach((item,index)=>{
      const row=Math.floor(index/cols),col=index%cols, rowCount=Math.min(cols,items.length-row*cols);
      const rowWidth=rowCount*w+(rowCount-1)*gap;
      const left=(width-rowWidth)/2+col*(w+gap),top=(height-rows*h-(rows-1)*gap)/2+row*(h+gap);
      item.style.cssText=`left:${left}px;top:${top}px;width:${w}px;height:${h}px;`;
    });
  }
  function layout() {
    const W=innerWidth,H=innerHeight,portrait=W<H,short=!portrait&&H<600;
    document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('short',short);
    const scene=window.G2_SHARE_BACKGROUNDS[portrait?'portrait':'landscape'];
    $('#scene').style.backgroundImage=`url("${scene.image}")`;
    const [iw,ih]=scene.ground.size,scale=Math.max(W/iw,H/ih),width=iw*scale,height=ih*scale;
    const placement={x:(W-width)/2,y:(H-height)/2,width,height,scene};
    const bar=measure($('#bar'));const controls=$('#controls');controls.style.top=`${bar.y-57}px`;
    const field=$('#field'),margin=portrait?Math.max(12,W*.06):Math.max(18,W*.06);
    const right=short?W*.32:margin,fw=W-margin-right;
    let top=Math.max(measure($('#card')).bottom+14,groundAt(margin+fw/2,placement)+12);
    const bottom=short?H-12:bar.y-67;
    field.style.cssText=`left:${margin}px;top:${top}px;width:${fw}px;height:${Math.max(80,bottom-top)}px;`;
    const fh=field.clientHeight;
    $('#pool').style.height=`${Math.max(55,Math.min(short?65:86,fh*.23))}px`;
    document.querySelectorAll('.rack').forEach(rack=>placeRack(rack,rack.id==='poolRack'));
    layoutData={viewport:{width:W,height:H},portrait,short,scene:{image:scene.image,ground:clone(scene.ground),x:placement.x,y:placement.y,width,height,extraZoom:1},field:measure(field),pool:measure($('#pool')),bar:measure($('#bar')),controls:measure(controls),card:measure($('#card')),camps:[...document.querySelectorAll('.camp')].map(measure),groundCenterY:groundAt(W/2,placement)};
  }
  function render() {
    renderBar();renderField();layout();save();
    speech.update({levelId:level.id,phase:state.phase,complete:state.complete,error:state.error,errorTurn});
  }
  $('#back').href=mapURL;
  $('#back').addEventListener('click',()=>save());
  $('#lessonTag').textContent=`瀑布岩台 · ${route.indexOf(level.id)+1}/3`;
  $('#lessonTag').setAttribute('aria-label',`瀑布岩台路线，第 ${level.id} 关，当前复用浅色台地背景`);
  $('#task').textContent=`${level.total} 只伙伴，分到 ${level.groups} 个营地`;
  speech=window.G2ShareSpeech.create({button:$('#voiceToggle')});
  $('#restart').onclick=reset;$('#undo').onclick=()=>act('undo');
  $('#hint').onclick=()=>{
    $('#feedback').textContent=state.phase==='answer'?'数数一个营地里的恐龙，再选答案。':!state.poolRemaining&&!engine.correct(state)?'点多的营地里的恐龙，请它回来，再送到少的营地。':'轮流给每个营地送一只，就能分得一样多。';
    speech.hint(state);
  };
  if (journey && !blocked) restore(journey.snapshot(level.id));
  if (blocked) {
    ['card','field','controls','bar','voiceToggle'].forEach(id=>$('#'+id).hidden=true);
    $('#locked').hidden=false;$('#locked a').href=mapURL;
    $('#scene').style.backgroundImage=`url("${window.G2_SHARE_BACKGROUNDS.portrait.image}")`;
  } else render();
  journey?.subscribe(()=>{
    saveWarning();
    if(!parentAccess&&!journey.unlocked?.('waterfall') && !journey.routeDone?.('waterfall')){blocked=true;speech.stop();['card','field','controls','bar','voiceToggle'].forEach(id=>$('#'+id).hidden=true);$('#locked').hidden=false;}
  });
  const img=new Image();img.onload=()=>{aspect=img.naturalWidth/img.naturalHeight;if(!blocked)layout();};img.src=imageURL;
  window.addEventListener('resize',()=>{if(!blocked)layout();});
  window.addEventListener('pagehide',save);
  // Test observations are detached copies; the UI remains the only mutation surface.
  Object.defineProperty(window,'__shareSample',{value:Object.freeze({
    get state(){return clone({...snapshot(),error:state.error,feedback:state.feedback,historyLength:state.history.length});},
    get level(){return clone(level);}, get mode(){return mode;},get blocked(){return blocked;},
    get speech(){return speech.status();},get layout(){return clone(layoutData);},
    measure(){return {...clone(layoutData),dinos:[...document.querySelectorAll('.dino')].map(el=>({group:el.dataset.group,index:Number(el.dataset.index),rect:measure(el),contacts:(groundData?.contacts||[]).map(([x,y,w])=>{const r=measure(el);return{x:r.x+x*r.width,y:r.y+y*r.height,width:w*r.width};})})),badges:[...document.querySelectorAll('.count')].map(measure),answers:[...document.querySelectorAll('.answer-choice')].map(el=>({text:el.textContent,rect:measure(el),fontSize:getComputedStyle(el).fontSize,fontWeight:getComputedStyle(el).fontWeight}))};}
  }),writable:false,configurable:false});
})();
