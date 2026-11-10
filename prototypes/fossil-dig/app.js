(() => {
  'use strict';
  const V='?v=20261031-trex-r1',$=s=>document.querySelector(s),store=window.DinoFossils,ID=store.ACTIVE,F=window.FOSSILS.fossils[ID],art=F.art,natural=art.mode==='natural',cut=art.mode==='cut'||natural,audio=window.createFossilAudio(F.voice);
  const fromGame=new URLSearchParams(location.search).get('from')==='game',unlock=window.DinoFossilUnlock,byLevels=unlock?.ORDER.includes(ID);
  const baseQuery=(store.PREVIEW?'parent=1&':store.STANDALONE?'archaeology=1&':'')+(fromGame?'from=game&':'')+(ID!=='brachio'||store.PREVIEW||store.STANDALONE||fromGame?'fossil='+ID+'&':''),route=F.journey;
  // Opened from a finish card: both ways out lead back to the levels.
  if(fromGame&&!store.STANDALONE){$('#back').href='../../index.html';$('#back').textContent='← 回到闯关';const home=$('#museum a[href*="island-journey"]');home.href='../../index.html';home.textContent='继续闯关 →';}
  if(store.STANDALONE){$('#back').href='./archaeology.html';$('#back').textContent='← 考古营地';const home=$('#museum a[href*="island-journey"]');home.href='./archaeology.html';home.textContent='返回考古营地 →';}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),board=$('#rockStage'),canvas=$('#sand'),ctx=canvas.getContext('2d');
  const effects=window.createFossilEffects(board,$('#effects'),reduced,art.interior.map(([x,y])=>[art.geometry.x+x*art.geometry.scale,art.geometry.y+y*art.geometry.scale])),stageImages=F.stages.map(()=>new Image()),flashed=new Set();
  const stageIndex=hits=>hits===0?0:hits<3?1:hits<5?2:3;
  const initial=store.load().dig[ID],initialStage=stageIndex(initial.hits);
  stageImages[initialStage].fetchPriority='high';stageImages[initialStage].src='./'+F.stages[initialStage]+V;
  let shellFrame=0,sandFrame=0,strokeCounted=false;
  const readyParts=new Set(art.parts.map(p=>p.id)),landings=[],dragStarts=[],dismissedDemos=new Set();
  const g=art.geometry,timers=new Set(),transitions=[],partImages=new Map();
  let current,view=new URLSearchParams(location.search).get('view')==='museum'?'museum':'dig',drag=null,selected=null,brushPointer=null,lastPoint=null,pending=new Set(),flushTimer=0,replaying=false,awake=false,busy=false,sandBase=null,brushStrokes=0,knockReady=false,assetsStarted=false,assetsReady=false,waitingAssets=false,transition=null;
  const geometry=part=>{const[x,y,r,b]=part.box,[W,H]=art.skeletonSize;return{x:g.x+x/W*g.scale,y:g.y+y/H*g.scale,w:(r-x)/W*g.scale,h:(b-y)/H*g.scale};};
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
  function status(text){$('#status').textContent=text;}
  function warning(){$('#storageWarning').hidden=store.storageOK();}
  function read(){current=store.load().dig[ID];return current;}
  function header(title,text,kicker){$('#title').textContent=title;$('#instruction').textContent=text;$('#eyebrow').textContent=kicker||F.eyebrow;}
  function steps(active,completed){document.querySelectorAll('[data-step]').forEach((el,i)=>{const done=i<completed;el.classList.toggle('active',el.dataset.step===active);el.classList.toggle('done',done);el.textContent=(done?'✓':i+1)+' '+['敲','刷','拼'][i];});}
  function cancelSequence(){art.parts.forEach(p=>readyParts.add(p.id));timers.forEach(clearTimeout);timers.clear();if(transition){transition.cancelled=!transition.finishing;transition.end=performance.now();transition.duration=transition.end-transition.start;transition=null;}busy=false;[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));$('#floatingSkeleton').hidden=true;$('#demoHand').hidden=true;effects.hideBrush();$('#effects').querySelectorAll('.knock-impact').forEach(e=>e.remove());$('#boneHighlights').replaceChildren();document.querySelectorAll('.flight-bone').forEach(e=>e.remove());}
  function hideAll(){$('#egg').getAnimations().forEach(a=>a.cancel());['locked','workspace','knowledge','museum','wake','egg','sand','grooves','targets','tray','reveal','demoHand','skipRevival','floatingSkeleton','speechBubble'].forEach(id=>$('#'+id).hidden=true);document.body.classList.remove('museum-mode','reveal-mode','hero-mode');board.classList.remove('shake','revival-stage','rock-retreated');$('#eggSurface').classList.remove('top-away');canvas.classList.remove('sand-away');$('#eggContents').classList.remove('fossil-glow');$('#living').classList.remove('walk-out');$('#slab').hidden=true;$('#knowledge').classList.remove('pending','card-in');}
  function render(){
    // Damage images own their rubble. Keep the final slab out of their transparent margins.
    read();hideAll();warning();if(natural&&assetsStarted)$('#cleanFace').src='./'+(current.step==='knock'||current.step==='brush'?art.face.file:art.bowl)+V;$('#eggContents').hidden=current.step==='knock';board.dataset.phase=current.step;$('#campLabel').textContent=F.camp?(store.load().museum.length?F.camp+' · '+F.name:F.camp+' · 化石挖掘'):'化石挖掘 · '+F.name;$('.steps').hidden=false;status('');
    steps(current.step,['knock','brush','puzzle','revive','museum'].indexOf(current.step));
    if(view==='museum'){museum();return;}
    if(!store.eligible()&&byLevels){const left=unlock.ORDER.indexOf(ID)*unlock.PER+unlock.PER-unlock.status().done;header('一块化石在等你','在闯关里再过 '+left+' 关，就能来挖');$('#lockedImg').src='./'+F.stages[0]+V;$('#locked p').textContent='每闯过 5 关，就能挖出一块化石。';const link=$('#locked a');link.textContent='去闯关';link.href='../../index.html';$('#locked').hidden=false;$('.steps').hidden=true;return;}
    if(!store.eligible()){header('一块化石在等你',route?'先完成'+route.name+'的'+(route.routes?'六关':'三关'):'这个地点还未开放');$('#lockedImg').src='./'+F.stages[0]+V;$('#locked p').textContent=route?'完成'+route.name+'的 '+(route.routes?6:3)+' 关就能来挖':'这块化石的探险地点还未开放。';const link=$('#locked a');link.textContent=route?'去'+route.name:'返回地图';link.href=route?'../'+route.sample+'/?journey='+route.route+'&level='+route.firstLevel+'&v=20261031-trex-r1':'../island-journey.html?v=20261031-trex-r1';$('#locked').hidden=false;$('.steps').hidden=true;return;}
    if(current.step==='museum'){view='museum';museum();return;}
    if(!knockReady){status('正在准备挖掘现场…');return;}$('#workspace').hidden=false;
    if(current.step==='knock'){header(cut?'敲松表面的岩土':'敲开化石岩石',cut?'轻轻敲 6 下，找出岩石里埋着的化石':'轻轻敲 6 下，看看缺口里藏着什么');$('#egg').hidden=false;$('#egg').disabled=false;$('#slab').hidden=false;canvas.hidden=false;paintSand();paintShell();status(`已经敲了 ${current.hits} / 6 下`);}
    else if(current.step==='brush'){header('刷掉石板上的沙土','沿着凸起的骨头刷，刷开 70% 就完成');$('#slab').hidden=false;canvas.hidden=false;paintSand();syncFlashes();status(`骨头已刷开 ${Math.floor(store.coverage(current.cleared)*100)}% / 70%`);}
    else if(current.step==='puzzle'){header('在石板上拼骨架','拖动下面的骨头，放回相同的凹槽');$('#grooves').hidden=false;$('#targets').hidden=false;$('#tray').hidden=false;renderPuzzle();status(`已经拼好 ${current.placed.length} / ${art.parts.length} 块`);}
    else if(current.step==='revive'){header('骨架拼好啦',F.reviveLine);$('#slab').hidden=false;$('#wake').hidden=false;$('#wake').textContent=F.restorationOnly?'查看修复成果':'看'+F.name+'复活';}
  }
  function interior(c,size){c.beginPath();art.interior.forEach(([x,y],i)=>i?c.lineTo(x*size,y*size):c.moveTo(x*size,y*size));c.closePath();}
  function makeSand(){
    const size=canvas.width,source=$('#sandSource');if(!source.naturalWidth)return null;
    const base=document.createElement('canvas');base.width=base.height=size;const c=base.getContext('2d');
    // Registered native buried-relief art, like Brachio: opaque bone tips
    // protrude through sand. No translucent skeleton or gray panel overlay.
    c.drawImage(source,0,0,size,size);
    return base;
  }
  // Brushing thins the sand a little on every pass instead of punching out squares: each sample stamps a faint
  // soft disc, and a cell counts as brushed once a pass or two has worn it. Saved cells come back fully cleared.
  const wearMask=document.createElement('canvas');wearMask.width=wearMask.height=1254;
  const BRUSH_R=.085,BRUSH_WEAR=.3,BRUSH_ALPHA=.26,WORN=.6,wear=new Float32Array(1024),shown=new Set();
  function stampWear(p,alpha,r=BRUSH_R){const m=wearMask.getContext('2d'),size=wearMask.width,x=p.x*size,y=p.y*size,rad=r*size,grad=m.createRadialGradient(x,y,0,x,y,rad);grad.addColorStop(0,`rgba(0,0,0,${alpha})`);grad.addColorStop(1,'rgba(0,0,0,0)');m.fillStyle=grad;m.beginPath();m.arc(x,y,rad,0,Math.PI*2);m.fill();}
  function syncWear(){const done=new Set([...current.cleared,...pending]);if([...shown].some(n=>!done.has(n))){wearMask.getContext('2d').clearRect(0,0,wearMask.width,wearMask.height);wear.fill(0);shown.clear();}done.forEach(n=>{if(shown.has(n))return;shown.add(n);wear[n]=1;stampWear({x:(n%32+.5)/32,y:(Math.floor(n/32)+.5)/32},1,1.6/32);});}
  function paintSand(){sandBase||=makeSand();if(!sandBase)return;syncWear();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(sandBase,0,0);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(wearMask,0,0);ctx.restore();}
  function queueSand(){if(!sandFrame)sandFrame=requestAnimationFrame(()=>{sandFrame=0;paintSand();});}
  function partCoverage(part){const set=new Set([...current.cleared,...pending]);return part.coverage.reduce((s,[n,w])=>s+(set.has(n)?w:0),0)/part.coverage.reduce((s,[n,w])=>s+w,0);}
  function syncFlashes(){art.parts.forEach(p=>{if(partCoverage(p)>=.3)flashed.add(p.id);});}
  function flash(part){if(reduced.matches)return;const img=artImage(part,'bone-flash');$('#boneHighlights').append(img);later(()=>img.remove(),400);}
  function paintShell(p){cancelAnimationFrame(shellFrame);const surface=$('#eggSurface'),c=surface.getContext('2d'),size=surface.width,index=current.hits===0?0:current.hits<3?1:current.hits<5?2:3,source=stageImages[index];if(!source.naturalWidth)return;if(!p||reduced.matches){c.clearRect(0,0,size,size);c.drawImage(source,0,0,size,size);return;}const old=document.createElement('canvas');old.width=old.height=size;old.getContext('2d').drawImage(surface,0,0);const begin=performance.now();function frame(now){const t=Math.max(0,Math.min(1,(now-begin)/420));c.clearRect(0,0,size,size);c.drawImage(old,0,0);c.save();c.beginPath();c.arc(p.x*size,p.y*size,t*size*1.42,0,Math.PI*2);c.clip();c.clearRect(0,0,size,size);c.drawImage(source,0,0,size,size);c.restore();if(t<1)shellFrame=requestAnimationFrame(frame);}shellFrame=requestAnimationFrame(frame);}
  const hammer='<svg viewBox="0 0 72 72"><path d="m30 27 25 33" stroke="#754924" stroke-width="9" stroke-linecap="round"/><path d="m14 21 28-14 12 17-29 16z" fill="#9caaab" stroke="#485e60" stroke-width="3"/><path d="m15 21 27-14" stroke="#ecf4ee" stroke-width="4"/></svg>';
  function knockEffect(e,n){
    if(reduced.matches)return;const r=board.getBoundingClientRect(),x=e.detail?Math.max(0,Math.min(1,(e.clientX-r.x)/r.width)):.5,y=e.detail?Math.max(0,Math.min(1,(e.clientY-r.y)/r.height)):.48;
    const hit=document.createElement('div');hit.className='knock-impact';hit.style.cssText=`left:${x*100}%;top:${y*100}%;`;hit.innerHTML=`<span class="hammer">${hammer}</span>${cut?'':'<svg class="impact-cracks" viewBox="0 0 120 120"><path d="M60 60 47 52 43 35 30 27 M60 60 75 48 93 51 107 40 M60 60 65 79 54 90 60 110"/></svg>'}<span class="dust"></span>`;$('#effects').append(hit);later(()=>hit.remove(),1100);
    effects.impact({x,y},n+1);
    try{navigator.vibrate?.(15);}catch(_){}
  }
  function startSequence(from,to,duration){timers.forEach(clearTimeout);timers.clear();$('#demoHand').hidden=true;busy=true;cancelDrag();transition={from,to,start:performance.now(),events:[],duration:0,cancelled:false};transitions.push(transition);return transition;}
  function mark(label){if(transition)transition.events.push({label,ms:performance.now()-transition.start});}
  function completeStep(n){steps('',n);audio.synth('glow');mark('check-and-completion-sound');}
  function nextTitle(title,text,step){header(title,text);steps(step,step==='revive'?3:['knock','brush','puzzle'].indexOf(step));$('.heading').classList.remove('title-in');void $('.heading').offsetWidth;$('.heading').classList.add('title-in');mark('next-title');}
  function demo(kind){if(dismissedDemos.has(kind)||drag||brushPointer!==null)return;const hand=$('#demoHand');hand.className=kind+'-demo';hand.hidden=false;mark('demonstration-start');later(()=>{hand.hidden=true;mark('demonstration-end');},1000);}
  function dismissDemo(kind){dismissedDemos.add(kind);$('#demoHand').hidden=true;}
  function puzzleReady(id){return (!busy||transition?.to==='puzzle')&&readyParts.has(id);}
  function brushReady(){return (!busy||transition?.to==='brush')&&board.dataset.phase==='brush';}
  function finishSequence(seq,fn){if(transition!==seq)return;seq.end=performance.now();seq.duration=seq.end-seq.start;transition=null;busy=false;$('#demoHand').hidden=true;fn();}
  $('#egg').onclick=e=>{
    if(busy||!knockReady||!store.eligible()||read().step!=='knock')return;
    if(current.hits===5&&!assetsReady){waitingAssets=true;status('化石正在准备，请稍等一下…');return;}
    audio.unlock();audio.synth('knock');const n=current.hits;knockEffect(e,n);store.hit();read();warning();status(`已经敲了 ${current.hits} / 6 下`);
    paintShell(e.detail?point(e):{x:.5,y:.48});if(current.hits<6)return;$('#egg').disabled=true;$('#eggContents').hidden=false;board.dataset.phase='brush';
    const seq=startSequence('knock','brush',2300);header(cut?'表面的沙土松开啦':'岩石敲开啦','看一看，沙土里露出了哪些骨头？');
    if(!reduced.matches){board.classList.remove('shake');void board.offsetWidth;board.classList.add('shake');}
    later(()=>{$('#egg').hidden=true;board.dataset.phase='brush';},650);
    later(()=>completeStep(1),650);
    later(()=>{nextTitle('刷掉石板上的沙土','沿着凸起的骨头刷，刷开 70% 就完成','brush');status('骨头已刷开 0% / 70%');},1100);
    later(()=>demo('brush'),1250);
    later(()=>finishSequence(seq,()=>{}),2300);
  };
  function point(e){const r=board.getBoundingClientRect();return{x:(e.clientX-r.x)/r.width,y:(e.clientY-r.y)/r.height};}
  function erase(p){if(!effects.onTop(p))return;stampWear(p,BRUSH_ALPHA);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot((x+.5)/32-p.x,(y+.5)/32-p.y),n=y*32+x;if(d>=BRUSH_R||current.cleared.includes(n)||pending.has(n)||!effects.onTop({x:(x+.5)/32,y:(y+.5)/32}))continue;wear[n]+=BRUSH_WEAR*(1-d/BRUSH_R);if(wear[n]>=WORN){pending.add(n);shown.add(n);}}queueSand();art.parts.forEach(part=>{if(!flashed.has(part.id)&&partCoverage(part)>=.3){flashed.add(part.id);effects.stats.flashes.push({id:part.id,coverage:partCoverage(part),at:performance.now()});flash(part);}});const total=store.coverage([...current.cleared,...pending]);status(`骨头已刷开 ${Math.floor(total*100)}% / 70%`);clearTimeout(flushTimer);if(total>=store.THRESHOLD)flushBrush();else flushTimer=setTimeout(flushBrush,140);}
  function flushBrush(){clearTimeout(flushTimer);if(!pending.size)return;const cells=[...pending];pending.clear();store.brush(cells);read();warning();if(current.step==='puzzle'&&(!busy||transition?.to==='brush')){brushPointer=null;lastPoint=null;if(transition?.to==='brush')finishSequence(transition,()=>{});brushFinished();}}
  function brushAt(p){if(!effects.onTop(p)){effects.hideBrush();lastPoint=null;return;}if(!strokeCounted){brushStrokes++;strokeCounted=true;}dismissDemo('brush');if(transition?.to==='brush')$('#egg').hidden=true;const from=lastPoint||p,count=Math.max(1,Math.ceil(Math.hypot(p.x-from.x,p.y-from.y)/.025));for(let i=1;i<=count&&current.step==='brush';i++)erase({x:from.x+(p.x-from.x)*i/count,y:from.y+(p.y-from.y)*i/count});if(current.step==='brush'){effects.cursor(p,lastPoint);lastPoint=p;audio.rustle();}}
  canvas.addEventListener('pointerdown',e=>{if(!brushReady()||!store.eligible()||read().step!=='brush')return;e.preventDefault();audio.unlock();brushPointer=e.pointerId;strokeCounted=false;lastPoint=null;canvas.setPointerCapture(e.pointerId);brushAt(point(e));});
  canvas.addEventListener('pointermove',e=>{if(!brushReady()||e.pointerId!==brushPointer||current.step!=='brush')return;e.preventDefault();brushAt(point(e));});
  ['pointerup','pointercancel'].forEach(t=>canvas.addEventListener(t,()=>{brushPointer=null;lastPoint=null;effects.hideBrush();flushBrush();}));
  function artImage(part,className){const img=new Image(),r=geometry(part);img.src='./art/'+part.file+V;img.alt='';img.className=className;img.style.cssText=`left:${r.x*100}%;top:${r.y*100}%;width:${r.w*100}%;height:${r.h*100}%;`;return img;}
  function brushFinished(){
    effects.hideBrush();const seq=startSequence('brush','puzzle',2400);status(`骨头已刷开 ${Math.floor(store.coverage(current.cleared)*100)}%`);header('骨架露出来啦','都是刚刚从岩石里挖出来的骨头');
    later(()=>{if(reduced.matches)canvas.hidden=true;else canvas.classList.add('sand-away');audio.rustle();mark('remaining-sand-clears');},450);
    later(()=>completeStep(2),650);
    later(()=>{if(!reduced.matches)art.parts.forEach((part,i)=>{const img=artImage(part,'bone-flash');img.style.animationDelay=i*90+'ms';$('#boneHighlights').append(img);});mark('five-bone-highlights');},850);
    later(()=>{canvas.hidden=true;},1100);
    later(()=>{nextTitle('在石板上拼骨架','拖动下面的骨头，放回相同的凹槽','puzzle');status(`已经拼好 0 / ${art.parts.length} 块`);},1250);
    later(()=>{$('#boneHighlights').replaceChildren();$('#slab').hidden=true;if(natural&&assetsStarted)$('#cleanFace').src='./'+art.bowl+V;$('#grooves').hidden=false;$('#targets').hidden=false;$('#tray').hidden=false;readyParts.clear();renderPuzzle();flyToTray();},1450);
    later(()=>demo('puzzle'),1350);
    later(()=>finishSequence(seq,()=>{}),2400);
  }
  function landed(part){if(readyParts.has(part.id))return;readyParts.add(part.id);const button=$(`[data-piece="${part.id}"]`);if(button){button.classList.remove('receiving');button.disabled=false;}const target=$(`[data-target="${part.id}"]`);if(target)target.disabled=false;landings.push({id:part.id,at:performance.now()});mark('landed-'+part.id);}
  function flyToTray(){mark('pieces-to-tray');if(reduced.matches){art.parts.forEach(landed);return;}const r=board.getBoundingClientRect();art.parts.forEach((part,i)=>{const g=geometry(part),dest=$(`[data-piece="${part.id}"] img`).getBoundingClientRect(),source={x:r.x+g.x*r.width,y:r.y+g.y*r.height,w:g.w*r.width,h:g.h*r.height};const img=new Image();img.src='./art/'+part.file+V;img.className='flight-bone';img.style.cssText=`left:${source.x}px;top:${source.y}px;width:${source.w}px;height:${source.h}px;`;document.body.append(img);const anim=img.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dest.x-source.x}px,${dest.y-source.y}px) scale(${dest.width/source.w},${dest.height/source.h})`}],{duration:430,delay:i*100,fill:'both',easing:'cubic-bezier(.3,.05,.6,1)'});anim.onfinish=()=>{img.remove();landed(part);};});}
  function renderPuzzle(){
    $('#grooves').replaceChildren();$('#targets').replaceChildren();$('#tray').replaceChildren();
    art.parts.forEach(part=>{const r=geometry(part),placed=current.placed.includes(part.id),img=artImage(part,placed?'placed-bone':'groove');if(placed)$('#grooves').append(img);
      const target=document.createElement('button');target.type='button';target.className='target';target.dataset.target=part.id;target.setAttribute('aria-label',part.label+'的骨架凹槽');target.style.cssText=`left:calc(${(r.x+r.w/2)*100}% - 24px);top:calc(${(r.y+r.h/2)*100}% - 24px);width:48px;height:48px`;target.disabled=placed||!readyParts.has(part.id);target.onclick=()=>{if(puzzleReady(part.id)&&selected===part.id)place(part.id);};$('#targets').append(target);
      const button=document.createElement('button');button.type='button';button.className='bone-choice'+(placed?' placed':'')+(!readyParts.has(part.id)?' receiving':'');button.dataset.piece=part.id;button.disabled=placed||!readyParts.has(part.id);button.setAttribute('aria-label',part.label+'，拖回石板上的凹槽');button.innerHTML=`<img src="./art/${part.file}${V}" alt=""><span>${part.label}</span>`;button.addEventListener('pointerdown',e=>startDrag(e,part,button));button.addEventListener('pointermove',moveDrag);button.addEventListener('pointerup',endDrag);button.addEventListener('pointercancel',cancelDrag);button.addEventListener('click',()=>{if(puzzleReady(part.id)&&!placed)select(part.id);});$('#tray').append(button);
    });
  }
  function select(id){selected=id;document.querySelectorAll('.bone-choice').forEach(b=>b.classList.toggle('selected',b.dataset.piece===id));document.querySelectorAll('.target').forEach(b=>b.classList.toggle('active',b.dataset.target===id));}
  function startDrag(e,part,button){if(!puzzleReady(part.id)||!store.eligible()||read().step!=='puzzle'||current.placed.includes(part.id))return;e.preventDefault();dismissDemo('puzzle');dragStarts.push({id:part.id,at:performance.now()});audio.unlock();select(part.id);const r=board.getBoundingClientRect(),g=geometry(part),ghost=new Image();ghost.src='./art/'+part.file+V;ghost.className='drag-ghost';ghost.style.width=g.w*r.width+'px';ghost.style.height=g.h*r.height+'px';document.body.append(ghost);drag={id:part.id,pointer:e.pointerId,ghost,w:g.w*r.width,h:g.h*r.height,button,start:{x:e.clientX,y:e.clientY},moved:false};button.setPointerCapture(e.pointerId);moveDrag(e);}
  function moveDrag(e){if(!drag||e.pointerId!==drag.pointer)return;drag.moved||=Math.hypot(e.clientX-drag.start.x,e.clientY-drag.start.y)>5;drag.ghost.style.left=e.clientX-drag.w/2+'px';drag.ghost.style.top=e.clientY-drag.h/2+'px';}
  function endDrag(e){if(!drag||e.pointerId!==drag.pointer)return;const d=drag;drag=null;const r=$(`[data-target="${d.id}"]`).getBoundingClientRect(),distance=Math.hypot(e.clientX-r.x-r.width/2,e.clientY-r.y-r.height/2);if(d.moved&&distance<=40){d.ghost.remove();place(d.id);}else{const b=d.button.getBoundingClientRect();if(!reduced.matches&&d.moved){d.ghost.classList.add('returning');d.ghost.style.left=b.x+b.width/2-d.w/2+'px';d.ghost.style.top=b.y+b.height/2-d.h/2+'px';later(()=>d.ghost.remove(),240);}else d.ghost.remove();if(d.moved)status('找找相同的凹槽，再轻轻放上去');}}
  function cancelDrag(){drag?.ghost.remove();drag=null;}
  function place(id){if(!puzzleReady(id)||!store.eligible()||read().step!=='puzzle')return;store.place(id);audio.synth('snap');selected=null;read();renderPuzzle();const part=art.parts.find(p=>p.id===id),r=geometry(part),img=[...$('#grooves').children].find(el=>el.src.includes(part.file));effects.snap(img,{x:r.x+r.w/2,y:r.y+r.h/2});status(`已经拼好 ${current.placed.length} / ${art.parts.length} 块`);if(current.step==='revive'){if(transition?.to==='puzzle')finishSequence(transition,()=>{});busy=true;later(()=>{busy=false;revive(false);},270);}}
  function wave(pace=1){F.waveOrder.forEach((id,i)=>later(()=>flash(art.parts.find(p=>p.id===id)),i*160*pace));}
  function retreatRock(animate){board.classList.add('rock-retreated');if(animate&&!reduced.matches)board.animate([{transform:'none'},{transform:'translate(11%,-10%) scale(.6)'}],{duration:600,easing:'ease-in-out'});}
  function showSpeech(){if(!transition||transition.finishing)return;const bubble=$('#speechBubble'),cue=F.voice;bubble.textContent=cue.text;bubble.hidden=false;positionSpeech();mark('speech-bubble');}
    function positionSpeech(){const bubble=$('#speechBubble');if(bubble.hidden)return;
    // The dinosaur is still scaling in when the voice starts; wait for it to land so the bubble is placed against its real size.
    const landing=$('#living').getAnimations().filter(a=>a.playState==='running');if(landing.length){bubble.style.visibility='hidden';Promise.all(landing.map(a=>a.finished)).catch(()=>{}).then(()=>{bubble.style.visibility='';positionSpeech();});return;}
    const area=$('#board').getBoundingClientRect(),dino=$('#living').getBoundingClientRect(),headX=dino.x+dino.width*.84-area.x;const width=Math.min(210,Math.max(145,headX-20));bubble.style.width=width+'px';
    // Above the dinosaur when there is room, so the words never cover its face; otherwise beside the head as before.
    const room=dino.y-area.y+dino.height*.08,above=room>=bubble.offsetHeight+4;bubble.classList.toggle('above',above);bubble.style.left=Math.max(0,above?Math.min(area.width-width,headX-width+28):headX-width-14)+'px';bubble.style.top=Math.max(0,above?room-bubble.offsetHeight-4:dino.y-area.y+8)+'px';}
  function settleHero(){retreatRock(false);$('#floatingSkeleton').hidden=true;$('#slab').hidden=true;$('#grooves').hidden=true;$('#reveal').hidden=false;$('#living').hidden=false;}
  function finishRevival(seq,reason){if(transition!==seq||seq.finishing)return;seq.finishing=true;timers.forEach(clearTimeout);timers.clear();seq.reason=reason;seq.voice=audio.status().lastVoice;if(reason!=='voice-complete'){audio.stop();[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));}settleHero();$('#speechBubble').hidden=true;$('#boneHighlights').replaceChildren();$('#skipRevival').hidden=true;steps('',3);$('#knowledge').classList.remove('pending');if(!reduced.matches)$('#knowledge').classList.add('card-in');awake=true;busy=false;mark('knowledge-card-start');later(()=>finishSequence(seq,()=>{document.body.classList.add('reveal-mode');status('');}),reduced.matches?0:250);}
  function revive(replay){
    if(F.restorationOnly){if(busy||!store.eligible()||!['revive','museum'].includes(read().step))return;cancelSequence();replaying=replay;hideAll();$('#workspace').hidden=false;$('#eggContents').hidden=false;$('#cleanFace').src='./'+art.face.file+V;header('化石修复完成','你把'+F.name+'的骨架拼完整啦');steps('',3);$('#knowledge').hidden=false;$('#knowledge .eyebrow').textContent='我的发现';$('#knowledge h2').textContent=F.card.title;$('#knowledgeText').textContent=F.card.text;$('#enterMuseum').textContent='放进博物馆 →';awake=true;return;}

    if(busy||!store.eligible()||!['revive','museum'].includes(read().step))return;cancelSequence();const sceneBefore=$('#board').getBoundingClientRect();replaying=replay;awake=false;hideAll();document.body.classList.add('hero-mode');$('#workspace').hidden=false;$('#slab').hidden=false;$('.steps').hidden=false;steps('',3);board.dataset.phase='revive';header(F.name+'醒来了','');status('');audio.unlock();$('#knowledge').hidden=false;$('#knowledge .eyebrow').textContent='你好，'+F.name;$('#knowledge h2').textContent=F.card.title;$('#knowledgeText').textContent=ID==='brachio'?'':F.card.text;$('#knowledge').classList.add('pending');$('#enterMuseum').textContent=replay||store.isRepeating()?'回到博物馆 →':'放进博物馆 →';
    const sceneAfter=$('#board').getBoundingClientRect();if(!reduced.matches&&Math.abs(sceneBefore.x-sceneAfter.x)>1)$('#board').animate([{transform:`translate(${sceneBefore.x-sceneAfter.x}px,${sceneBefore.y-sceneAfter.y}px)`},{transform:'none'}],{delay:800,duration:600,fill:'backwards',easing:'ease-in-out'});const cueMs=(F.voice.end-F.voice.start)*1000,pace=cut&&cueMs>7200?.64:1;const seq=startSequence('puzzle','revive',8900);mark('revival-glow');if(!reduced.matches)wave(pace);
    if(reduced.matches){settleHero();showSpeech();}
    else{
      later(()=>{if(transition!==seq)return;if(reduced.matches){settleHero();return;}const floating=$('#floatingSkeleton');floating.replaceChildren(...art.parts.map(part=>artImage(part,'assembled-bone')));floating.hidden=false;$('#slab').hidden=true;$('#grooves').hidden=true;retreatRock(true);floating.animate([{transform:'none',filter:'drop-shadow(0 2px 2px #a77a45)'},{transform:'translate(11%,-18%) scale(1.06)',filter:'brightness(1.5) drop-shadow(0 8px 5px #c7a161)',offset:.65},{transform:'translate(13%,-21%) scale(.84)',filter:'brightness(2.2) drop-shadow(0 0 12px #ffe6a0)'}],{duration:280*pace,fill:'forwards',easing:'ease-out'});mark('skeleton-lifts');},800*pace);
      later(()=>{if(transition!==seq)return;if(reduced.matches){settleHero();return;}$('#floatingSkeleton').hidden=true;$('#reveal').hidden=false;$('#living').hidden=false;$('#living').animate([{transform:'translateY(-14%) scale(.78)'},{transform:'translateY(-18%) scale(.94)',offset:.35},{transform:'none',offset:.55},{transform:'translateY(-3%) scale(1.02,.98)',offset:.8},{transform:'none'}],{duration:300*pace,easing:'ease-in-out'});mark('skeleton-becomes-dinosaur');},1040*pace);
    }
    const land=reduced.matches?0:1205*pace;
    later(()=>{if(transition!==seq)return;audio.revive();mark('dinosaur-lands');},land);
    later(async()=>{if(transition!==seq)return;mark('narration-request');const result=await audio.narrate(showSpeech);if(transition!==seq)return;seq.voice=result;mark('narration-ended');finishRevival(seq,result.completed?'voice-complete':result.reason);},land+250*pace);
    later(()=>{if(transition!==seq||seq.finishing)return;$('#skipRevival').hidden=false;$('#skipRevival').classList.add('skip-in');mark('skip-available');},3000);
    later(()=>{if(transition===seq&&!seq.finishing&&!audio.status().narrating)finishRevival(seq,'deadline');},8750); // Never cut a playing approved cue when a busy device delivers timers late.
  }
  $('#skipRevival').onclick=()=>{if(transition?.to==='revive'&&performance.now()-transition.start>=3000)finishRevival(transition,'skipped');};
  document.addEventListener('click',e=>{if(transition?.to==='revive'&&performance.now()-transition.start>=3000&&!e.target.closest('header,button,a,dialog'))finishRevival(transition,'skipped');});
  addEventListener('resize',positionSpeech);
  $('#wake').onclick=()=>revive(false);
  $('#enterMuseum').onclick=()=>{if(busy||!awake||!store.eligible())return;cancelSequence();const firstTime=!replaying;if(!replaying&&!store.claim()){warning();return;}audio.step();view='museum';awake=false;render();
    // S1: a skeleton found through the levels comes "home", and the line names the next one to look for.
    const story=firstTime&&fromGame?window.DinoStory?.home(ID):null;if(story){freshStar=window.DinoStory.ORDER.indexOf(ID);museum();$('#instruction').textContent=story.text;if(audio.enabled){const voice=f=>'../../assets/voice/'+f+'?v=20261110-st1-r1',line=new Audio(voice(story.file));line.play().catch(()=>{});
      // After the last skeleton, Xiaoyu tells her secret on the same element the tap started.
      if(story.then)line.addEventListener('ended',()=>{$('#instruction').textContent=story.then.text;line.src=voice(story.then.file);line.play().catch(()=>{});},{once:true});}}history.replaceState(null,'','?'+baseQuery+'view=museum&v=20261031-trex-r1');};
  const CAT=window.FOSSILS.catalog,HALLS=[['jurassic','侏罗纪厅'],['cretaceous','白垩纪厅']],STANDS=6,skeletonSrc=id=>'./'+window.FOSSILS.fossils[id].art.skeleton.file+V;
  function exhibitSkeleton(id){
    const f=window.FOSSILS.fossils[id];
    // The just-completed fossil already has every bone in the browser cache.
    // Reassemble those same pixels on its stand instead of downloading a second
    // full-resolution copy of the skeleton (360 KB for Triceratops).
    if(id!==ID||!['cut','natural'].includes(f.art.mode))return `<img src="${skeletonSrc(id)}" alt="${f.name}骨架">`;
    const [l,t,r,b]=f.art.skeleton.box;
    return `<svg class="exhibit-skeleton" role="img" aria-label="${f.name}骨架" viewBox="${l} ${t} ${r-l} ${b-t}">${f.art.parts.map(p=>{const[x,y,r,b]=p.box;return `<image href="./art/${p.file}${V}" x="${x}" y="${y}" width="${r-x}" height="${b-y}"/>`;}).join('')}</svg>`;
  }
  let hall=F.era==='cretaceous'?'cretaceous':'jurassic',page=-1,freshStar=-1;  // -1: open on the page that holds this fossil
  const fossilOf=id=>window.FOSSILS.fossils[id];
  function museum(){
    document.body.classList.add('museum-mode');$('#museum').hidden=false;$('.steps').hidden=true;
    const owned=new Set(store.load().museum.filter(id=>fossilOf(id))),collected=store.eligible()&&owned.has(ID);
    // ST1: the roof's star map, one star per skeleton found through the levels. The archaeology camp keeps its own collection, so it has none.
    const sky=$('#storySky');sky.hidden=store.STANDALONE||!window.DinoStory;if(!sky.hidden)sky.innerHTML=window.DinoStory.skyMap(window.DinoStory.stars(id=>owned.has(id)),freshStar);freshStar=-1;
    header('森林博物馆',collected?(ID==='brachio'?'第一座展台，住进了腕龙骨架':ID==='mamenshi'?'第二座展台，住进了马门溪龙骨架':F.name+'骨架，住进了展台'):'把旅途中的发现，慢慢放进这里','我的发现');
    const discoveries=$('#naturalDiscoveries');discoveries.replaceChildren();Object.values(window.FOSSILS.fossils).map(f=>f.id).forEach(id=>{const f=fossilOf(id);if(!f)return;const a=document.createElement('a');a.className='secondary';a.href='./?'+(store.PREVIEW?'parent=1&':store.STANDALONE?'archaeology=1&':'')+'fossil='+id+'&v=20261031-trex-r1';a.textContent=f.name+(owned.has(id)?' · 已收藏':store.eligible(id)?' · 去挖掘':unlock?.ORDER.includes(id)?' · 闯关解锁':f.journey?.routes?' · 完成森林6关后开启':' · 完成对应营地后开启');discoveries.append(a);});
    const list=CAT.filter(c=>c.hall===hall),pages=Math.max(1,Math.ceil(list.length/STANDS));if(page<0){const at=list.findIndex(c=>c.id===ID);page=at<0?0:Math.floor(at/STANDS);}page=Math.max(0,Math.min(page,pages-1));
    const found=list.filter(c=>owned.has(c.id)).length;
    $('#hallTabs').innerHTML=HALLS.map(([id,label])=>`<button type="button" class="hall-tab" data-hall="${id}" aria-pressed="${id===hall}">${label}</button>`).join('');
    $('#exhibits').dataset.hall=hall;
    $('#exhibits').innerHTML=list.slice(page*STANDS,page*STANDS+STANDS).map(c=>owned.has(c.id)?`<button class="exhibit" data-fossil="${c.id}" type="button">${exhibitSkeleton(c.id)}<strong>${c.name} · ${c.eraLabel}</strong></button>`:`<div class="exhibit" data-empty="${c.id}"><span class="unknown">?</span><small>${store.STANDALONE?'去考古营地挖掘':window.FOSSILS.fossils[c.id]&&store.eligible(c.id)?'可以去挖啦':unlock?.ORDER.includes(c.id)?'闯关解锁':c.location?'去「'+c.location+'」挖':'还没安排地点'}</small></div>`).join('');
    $('#pageInfo').textContent=`第 ${page+1} / ${pages} 页 · 已找到 ${found} 个`;const waiting=Object.keys(window.FOSSILS.fossils).filter(id=>!owned.has(id)&&store.eligible(id));if(!collected&&waiting.length>1)status('有 '+waiting.length+' 块化石等你挖，先挖这一块吧');$('#prevPage').disabled=page===0;$('#nextPage').disabled=page>=pages-1;$('#pager').hidden=pages<2;
    $('#replay').hidden=!collected||F.restorationOnly;$('#redig').hidden=!collected;$('#redig').textContent=store.hasRepeat()?'继续挖掘':'再挖一次';$('#digLink').hidden=collected||!store.eligible();$('#digLink').href='./?'+baseQuery+'v=20261031-trex-r1';if(!collected&&!store.eligible())status(route?'完成'+route.name+'后，就能来挖化石。':'这块化石的探险地点还未开放。');
  }
  $('#hallTabs').addEventListener('click',e=>{const b=e.target.closest('[data-hall]');if(!b)return;hall=b.dataset.hall;page=0;museum();});
  $('#prevPage').onclick=()=>{page--;museum();};$('#nextPage').onclick=()=>{page++;museum();};
  $('#exhibits').addEventListener('click',e=>{const b=e.target.closest('[data-fossil]');if(!b)return;const f=fossilOf(b.dataset.fossil);$('#factImg').src=f.living.file;$('#factImg').alt=f.name;$('#fact h2').textContent=f.card.title;$('#fact p').textContent=f.card.text;$('#fact').showModal();});
  $('#redig').onclick=()=>{
    if(busy||!(store.resumeRepeat()||store.startRepeat())){warning();return;}
    cancelSequence();cancelDrag();audio.stop();effects.reset();flashed.clear();dismissedDemos.clear();readyParts.clear();art.parts.forEach(p=>readyParts.add(p.id));pending.clear();clearTimeout(flushTimer);brushPointer=null;lastPoint=null;selected=null;brushStrokes=0;replaying=false;awake=false;view='dig';
    history.replaceState(null,'','?'+baseQuery+'v=20261031-trex-r1');render();
  };
  $('#replay').onclick=()=>revive(true);$('#closeFact').onclick=()=>$('#fact').close();
  $('#sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('#sound').textContent=audio.enabled?'声音开':'声音关';$('#sound').setAttribute('aria-pressed',String(audio.enabled));};
  $('#back').onclick=e=>{flushBrush();if(!store.storageOK()){e.preventDefault();warning();}};
  window.addEventListener('pagehide',()=>{flushBrush();cancelSequence();cancelDrag();audio.stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){flushBrush();cancelSequence();cancelDrag();audio.stop();if(!awake)render();}});
  store.subscribe(warning);window.addEventListener('storage',()=>{cancelSequence();cancelDrag();render();});
  reduced.addEventListener('change',()=>{cancelDrag();if(reduced.matches){if(transition?.to==='puzzle')art.parts.forEach(landed);if(transition?.to==='revive'){[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));settleHero();}effects.reset();document.querySelectorAll('.flight-bone,.knock-impact,.knock-piece').forEach(e=>e.remove());document.querySelectorAll('.receiving').forEach(e=>e.classList.remove('receiving'));}});
  if(view!=='museum')store.resumeRepeat();
  // Decode the first visible rock before requesting later phases. The child can
  // begin tapping while the rest of this fossil loads in the background.
  function startRemainingAssets(){
    assetsStarted=true;
    stageImages.forEach((image,i)=>{if(i!==initialStage){image.fetchPriority='low';image.src='./'+F.stages[i]+V;}});
    const face=$('#cleanFace');
    for(const id of ['sandSource','bowl','cleanFace','living'])$('#'+id).fetchPriority='low';
    $('#sandSource').src='./'+art.sand.file+V;$('#eggWhole').src='./'+F.stages[0]+V;$('#bowl').src='./'+art.bowl+V;
    if(cut&&!natural){
      face.hidden=true;
      const grooves=document.createElement('div');grooves.id='cutGrooves';grooves.hidden=true;
      grooves.append(...art.parts.map(p=>artImage(p,'')));face.after(grooves);
    }else face.src='./'+art.face.file+V;
    $('#living').src=F.living.file;$('#living').alt='从石板中复活的'+F.name;document.documentElement.style.setProperty('--living-r',(([w,h])=>w/h)(F.living.aspect.split('/')));
    for(const id of ['fossil-groove','fossil-bone-groove'])document.querySelectorAll('#'+id+' feFlood').forEach((el,i)=>el.setAttribute('flood-color',[F.groove.base,F.groove.inset,F.groove.light][i]));
    board.dataset.rock=F.rock;document.body.classList.toggle('wide-fossil',cut);document.body.classList.toggle('natural-fossil',natural);$('#tray').dataset.n=art.parts.length;
    art.parts.forEach(part=>$('#slab').append(artImage(part,'assembled-bone')));if(natural)$('#slab').style.visibility='hidden';
    audio.prepareVoice();
    const imgs=art.parts.map(part=>{const img=new Image();img.fetchPriority='low';img.src='./art/'+part.file+V;partImages.set(part.id,img);return img;});
    const grooveImages=[...document.querySelectorAll('#cutGrooves img')];
    stageImages.forEach((image,i)=>image.decode().then(()=>{if(!busy&&read().step==='knock'&&stageIndex(current.hits)===i)paintShell();}).catch(()=>{}));
    Promise.all([$('#eggWhole'),$('#bowl'),...(cut&&!natural?[]:[$('#cleanFace')]),$('#sandSource'),...stageImages,...imgs,...grooveImages,...$('#slab').querySelectorAll('img')].map(i=>i.decode())).then(()=>{
      grooveImages.forEach(img=>{img.className='groove';img.style.filter='url("#fossil-bone-groove")';});
      if(cut&&!natural)$('#cutGrooves').hidden=false;
      sandBase=makeSand();assetsReady=true;if(read().step==='knock')paintSand();
      if(!knockReady){knockReady=true;render();}else if(waitingAssets&&!busy){waitingAssets=false;status(`已经敲了 ${read().hits} / 6 下`);}
    }).catch(()=>{if(cut&&!natural)$('#cutGrooves').hidden=true;status('图片还没加载好，请刷新后再试');});
  }
  render();
  stageImages[initialStage].decode().then(()=>{
    if(read().step==='knock'){knockReady=true;render();}
    startRemainingAssets();
  }).catch(()=>status('图片还没加载好，请刷新后再试'));
  Object.defineProperty(window,'__fossil',{value:Object.freeze({get interactions(){return{landings:structuredClone(landings),dragStarts:structuredClone(dragStarts),readyParts:[...readyParts],dragging:drag?.id||null};},get effects(){return structuredClone(effects.stats);},get state(){return store.load();},get view(){return view;},get audio(){return audio.status();},get reduced(){return reduced.matches;},get awake(){return awake;},get selected(){return selected;},get ready(){return knockReady;},get brush(){return{coverage:store.coverage([...read().cleared,...pending]),strokes:brushStrokes,widthRatio:.12};},get transition(){return{active:busy,from:transition?.from,to:transition?.to,elapsed:transition?performance.now()-transition.start:0};},get transitions(){return structuredClone(transitions);}})});
})();
