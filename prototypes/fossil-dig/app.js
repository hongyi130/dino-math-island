(() => {
  'use strict';
  const $=s=>document.querySelector(s),store=window.DinoFossils,ID=store.ACTIVE,F=window.FOSSILS.fossils[ID],layered=F.excavationLayers,V=layered?'?v=20261110-f11-r3':'?v=20261031-trex-r1',art=F.art,natural=art.mode==='natural',cut=art.mode==='cut'||natural,audio=window.createFossilAudio(F.voice);
  const query=new URLSearchParams(location.search),fromGame=query.get('from')==='game',unlock=window.DinoFossilUnlock,byLevels=unlock?.ORDER.includes(ID),tide=F.excavation==='tide',tool=F.fieldTool,echo=F.excavation==='echo';
  let view=query.get('view')==='museum'?'museum':'dig';
  if(tide||tool)document.title=F.camp+' · '+F.name+'挖掘';
  const baseQuery=(store.PREVIEW?'parent=1&':store.STANDALONE?'archaeology=1&':'')+(fromGame?'from=game&':'')+(ID!=='brachio'||store.PREVIEW||store.STANDALONE||fromGame?'fossil='+ID+'&':''),route=F.journey;
  // Opened from a finish card: both ways out lead back to the levels.
  if(fromGame&&!store.STANDALONE){$('#back').href='../../index.html';$('#back').textContent='← 回到闯关';const home=$('#museum a[href*="island-journey"]');home.href='../../index.html';home.textContent='继续闯关 →';}
  if(store.STANDALONE){$('#back').href='./archaeology.html';$('#back').textContent='← 考古营地';const home=$('#museum a[href*="island-journey"]');home.href='./archaeology.html';home.textContent='返回考古营地 →';}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),board=$('#rockStage'),canvas=$('#sand'),ctx=canvas.getContext('2d');
  const effects=window.createFossilEffects(board,$('#effects'),reduced,art.interior.map(([x,y])=>[art.geometry.x+x*art.geometry.scale,art.geometry.y+y*art.geometry.scale])),stageImages=F.stages.map(()=>new Image()),flashed=new Set();
  const stageIndex=hits=>hits===0?0:hits<3?1:hits<5?2:3;
  const readyStages=new Set();
  if(view!=='museum')store.resumeRepeat();
  let initialStage=0,assetsLoading=false,replayAfterLoad=false;
  let shellFrame=0,sandFrame=0,strokeCounted=false;
  const readyParts=new Set(art.parts.map(p=>p.id)),landings=[],dragStarts=[],dismissedDemos=new Set();
  const g=art.geometry,timers=new Set(),transitions=[],partImages=new Map();
  let current,drag=null,selected=null,brushPointer=null,lastPoint=null,pending=new Set(),flushTimer=0,replaying=false,awake=false,busy=false,sandBase=null,brushStrokes=0,knockReady=false,assetsStarted=false,assetsReady=false,waitingAssets=false,transition=null;
  let revivalImageReady=false, revivalAssetsFailed=false;
  const revivalReady=()=>assetsReady&&revivalImageReady;
  function updateRevivalButtons(){
    const ready=revivalReady();
    const waiting=revivalAssetsFailed?'复活图片未加载，请刷新':'正在准备复活图片…';
    $('#replay').disabled=assetsLoading&&!ready;
    $('#replay').textContent=ready||!assetsLoading?'再看一遍复活':waiting;
    $('#wake').disabled=!F.restorationOnly&&!ready;
    $('#wake').textContent=F.restorationOnly?'查看修复成果':ready?'看'+F.name+'复活':waiting;
  }
  function playRequestedReplay(){
    if(revivalReady()&&replayAfterLoad){
      replayAfterLoad=false;
      if(view==='museum'&&!document.hidden)revive(true);
    }
  }
  const geometry=part=>{const[x,y,r,b]=part.box,[W,H]=art.skeletonSize;return{x:g.x+x/W*g.scale,y:g.y+y/H*g.scale,w:(r-x)/W*g.scale,h:(b-y)/H*g.scale};};
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
  function status(text){$('#status').textContent=text;}
  function warning(){$('#storageWarning').hidden=store.storageOK();}
  function read(){current=store.load().dig[ID];return current;}
  function header(title,text,kicker){$('#title').textContent=title;$('#instruction').textContent=text;$('#eyebrow').textContent=kicker||F.eyebrow;}
  const phaseLabels=layered?{knock:tide?'引水破岩':tool.action,rubble:'移碎石',brush:'刷沙土',puzzle:'拼骨架'}:
    {knock:tide?'引水':tool?tool.action:'敲',brush:tide?'冲沙':tool?'露骨':'刷',puzzle:tide||tool?'拼骨':'拼'};
  const stepOrder=Object.keys(phaseLabels);
  function steps(active,completed=stepOrder.indexOf(active)){
    document.querySelectorAll('[data-step]').forEach(el=>{
      const key=el.dataset.step,i=stepOrder.indexOf(key);
      el.hidden=i<0;if(i<0)return;
      const done=i<completed;
      el.classList.toggle('active',key===active);
      el.classList.toggle('done',done);
      el.textContent=(done?'✓':i+1)+' '+phaseLabels[key];
    });
  }
  function cancelSequence(){art.parts.forEach(p=>readyParts.add(p.id));timers.forEach(clearTimeout);timers.clear();if(transition){transition.cancelled=!transition.finishing;transition.end=performance.now();transition.duration=transition.end-transition.start;transition=null;}busy=false;[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));$('#floatingSkeleton').hidden=true;$('#demoHand').hidden=true;effects.hideBrush();$('#effects').querySelectorAll('.knock-impact').forEach(e=>e.remove());$('#boneHighlights').replaceChildren();document.querySelectorAll('.flight-bone').forEach(e=>e.remove());}
  function hideAll(){$('#egg').getAnimations().forEach(a=>a.cancel());['locked','workspace','knowledge','museum','wake','egg','sand','grooves','targets','tray','reveal','demoHand','skipRevival','floatingSkeleton','speechBubble'].forEach(id=>$('#'+id).hidden=true);if(tide)$('#tideDig').hidden=true;if(tool)$('#fieldDig').hidden=true;if(layered)$('#rubble').hidden=true;document.body.classList.remove('museum-mode','reveal-mode','hero-mode');board.classList.remove('shake','revival-stage','rock-retreated');$('#eggSurface').classList.remove('top-away');canvas.classList.remove('sand-away');$('#eggContents').classList.remove('fossil-glow');$('#living').classList.remove('walk-out');$('#slab').hidden=true;$('#knowledge').classList.remove('pending','card-in');}
  function render(){
    // Damage images own their rubble. Keep the final slab out of their transparent margins.
    read();hideAll();warning();if(natural&&assetsStarted)$('#cleanFace').src='./'+(['knock','rubble','brush'].includes(current.step)?art.face.file:art.bowl)+V;$('#eggContents').hidden=current.step==='knock';board.dataset.phase=current.step;$('#campLabel').textContent=F.camp?(store.load().museum.length?F.camp+' · '+F.name:F.camp+' · 化石挖掘'):'化石挖掘 · '+F.name;$('.steps').hidden=false;status('');
    steps(current.step,['revive','museum'].includes(current.step)?stepOrder.length:undefined);
    if(view==='museum'){museum();return;}
    if(!store.eligible()&&byLevels){const left=unlock.ORDER.indexOf(ID)*unlock.PER+unlock.PER-unlock.status().done;header('一块化石在等你','在闯关里再过 '+left+' 关，就能来挖');$('#lockedImg').src='./'+F.stages[0]+V;$('#locked p').textContent='每闯过 5 关，就能挖出一块化石。';const link=$('#locked a');link.textContent='去闯关';link.href='../../index.html';$('#locked').hidden=false;$('.steps').hidden=true;return;}
    if(!store.eligible()){header('一块化石在等你',route?'先完成'+route.name+'的'+(route.routes?'六关':'三关'):'这个地点还未开放');$('#lockedImg').src='./'+F.stages[0]+V;$('#locked p').textContent=route?'完成'+route.name+'的 '+(route.routes?6:3)+' 关就能来挖':'这块化石的探险地点还未开放。';const link=$('#locked a');link.textContent=route?'去'+route.name:'返回地图';link.href=route?'../'+route.sample+'/?journey='+route.route+'&level='+route.firstLevel+'&v=20261031-trex-r1':'../island-journey.html?v=20261031-trex-r1';$('#locked').hidden=false;$('.steps').hidden=true;return;}
    if(current.step==='museum'){view='museum';museum();return;}
    prepareExcavation();
    if(!knockReady){status('正在准备挖掘现场…');return;}$('#workspace').hidden=false;
    if(layered&&['rubble','brush','puzzle'].includes(current.step))paintRubble();
    if(current.step==='rubble'){header('把碎石搬到岩边','点一下碎石，移开压在沙土上的石块');canvas.hidden=false;paintSand();rubbleStatus();return;}
    if(current.step==='knock'&&(tide||tool)){if(tide)renderTide();else renderField();return;}
    if(current.step==='knock'){header(cut?'敲松表面的岩土':'敲开化石岩石',cut?'轻轻敲 6 下，找出岩石里埋着的化石':'轻轻敲 6 下，看看缺口里藏着什么');$('#egg').hidden=false;$('#egg').disabled=false;$('#slab').hidden=false;canvas.hidden=false;paintSand();paintShell();status(`已经敲了 ${current.hits} / 6 下`);}
    else if(current.step==='brush'){header('刷掉石板上的沙土',layered?'沿着露出来的骨头来回刷，刷掉各处的沙土':'沿着凸起的骨头刷，刷开 70% 就完成');$('#slab').hidden=false;canvas.hidden=false;paintSand();syncFlashes();status(`骨头已刷开 ${Math.floor(store.coverage(current.cleared)*100)}% / 70%`);}
    else if(current.step==='puzzle'){header('在石板上拼骨架','拖动下面的骨头，放回相同的凹槽');$('#grooves').hidden=false;$('#targets').hidden=false;$('#tray').hidden=false;renderPuzzle();status(`已经拼好 ${current.placed.length} / ${art.parts.length} 块`);}
    else if(current.step==='revive'){header('骨架拼好啦',F.reviveLine);if(natural)$('#cleanFace').src='./'+art.face.file+V;$('#slab').hidden=false;$('#wake').hidden=false;updateRevivalButtons();}
  }
  function interior(c,size){c.beginPath();art.interior.forEach(([x,y],i)=>i?c.lineTo(x*size,y*size):c.moveTo(x*size,y*size));c.closePath();}
  const gates=[...document.querySelectorAll('[data-gate]')];
  function paintTide(n,flow=false){
    const field=$('#tideDig');field.hidden=false;
    $('#tideRock').src=stageImages[n].src;
    field.classList.toggle('flowing',flow&&!reduced.matches);
    field.querySelectorAll('.tide-water').forEach((path,i)=>{
      path.classList.toggle('wet',i<=n);
      path.classList.toggle('fresh',flow&&i===n);
    });
    gates.forEach((gate,i)=>{
      gate.setAttribute('aria-disabled',String(i<n||busy));
      gate.classList.toggle('open',i<n);
    });
    status(`已经冲开 ${n} / 3 段`);
  }
  function renderTide(){
    const n=current.hits/2;
    header(layered?'引水松动岩层':'引水冲开泥沙','从泉眼出发，顺着水流打开挡水板');
    steps(layered?'knock':n?'brush':'knock',!layered&&n?1:0);
    paintTide(n);
  }
  gates.forEach((gate,index)=>{gate.onclick=()=>{
    if(!tide||busy||!knockReady||!store.eligible()||read().step!=='knock')return;
    const n=current.hits/2;
    if(index<n)return;
    if(index!==n){
      status(n?'看看水流停在哪块挡水板前。':'先找一找冒水的泉眼。');
      return;
    }
    if(!readyStages.has(n+1)||(n===2&&!assetsReady)){
      waitingAssets=true;
      status('正在准备下一段，等一下再点。');
      return;
    }
    audio.unlock();
    store.openGate(index);
    if(read().hits!==2*(n+1)){render();return;}
    audio.rustle();
    if(layered&&n===2){beginRubble(gate);return;}
    const seq=startSequence('tide',n===2?'puzzle':'tide',720);
    paintTide(n+1,true);
    if(n===2){
      header('棘龙骨架露出来啦','接下来，把四块骨头放回石板');
      steps('puzzle',2);
    }else if(!layered)steps('brush',1);
    later(()=>finishSequence(seq,()=>{
      if(n===2){render();$('#tray button').focus({preventScroll:true});}
      else{
        const focused=document.activeElement===gate;
        renderTide();
        if(focused)gates[n+1].focus({preventScroll:true});
      }
    }),reduced.matches?180:720);
  };});
  let toolDirection=0;
  const echoPoints=$('#echoPoints'),wedgeTool=$('#wedgeTool'),turnWedge=$('#turnWedge'),pressWedge=$('#pressWedge');
  const extraRoot=$('#extraFieldTool');
  const extraTool=tool?.variant?window.createFossilFieldTool({
    tool,root:extraRoot,board,attempt:finishFieldAction,status,audio,
    activeStage:()=>!busy&&knockReady&&view==='dig'&&current?.step==='knock'?current.hits/2:null,
    rockSprite:'./'+layered.file+V
  }):null;
  const directionLabels=['横向','右下斜向','竖向','右上斜向'];
  function fieldStatus(n){status(`已经发掘 ${n} / 3 处`);}
  function paintWedge(stage){
    const mark=$('#wedgeMark'),[x,y]=tool.points[stage],answer=tool.answers[stage];
    mark.style.cssText=`--x:${x}%;--y:${y}%;--crack:${answer*45}deg;--wedge:${toolDirection*45}deg`;
    turnWedge.setAttribute('aria-label','旋转楔子，当前'+directionLabels[toolDirection]);
    pressWedge.setAttribute('aria-label','沿缝撬开，裂缝是'+directionLabels[answer]);
  }
  function renderField(){
    const stage=current.hits/2;
    const field=$('#fieldDig');field.hidden=false;
    field.classList.remove('field-found');
    $('#fieldRock').src=stageImages[stage].src;
    header(tool.title,tool.instruction);
    steps(layered?'knock':stage?'brush':'knock',!layered&&stage?1:0);
    echoPoints.hidden=!echo;wedgeTool.hidden=echo||Boolean(extraTool);
    if(extraRoot)extraRoot.hidden=!extraTool;
    if(extraTool)extraTool.render(stage);
    else if(echo)echoPoints.querySelectorAll('button').forEach(button=>delete button.dataset.signal);
    else paintWedge(stage);
    fieldStatus(stage);
  }
  function fieldStage(){
    return tool&&!busy&&knockReady&&store.eligible()&&read().step==='knock'?current.hits/2:null;
  }
  function finishFieldAction(stage,answer,control){
    if(!readyStages.has(stage+1)||(stage===2&&!assetsReady)){
      waitingAssets=true;
      status('正在准备下一段，等一下再试。');
      return;
    }
    store.clearSection(stage,answer);
    if(read().hits!==(stage+1)*2){render();return;}
    const focused=document.activeElement===control;
    audio.synth('snap');
    if(layered&&stage===2){beginRubble(control);return;}
    const seq=startSequence(F.excavation,stage===2?'puzzle':F.excavation,650);
    const field=$('#fieldDig');
    $('#fieldRock').src=stageImages[stage+1].src;
    field.classList.add('field-found');
    fieldStatus(stage+1);
    header(stage===2?F.name+'骨架露出来啦':tool.found,stage===2?'把骨头放回相同的凹槽':'看看这次露出来的是哪一块骨头');
    if(!layered)steps(stage===2?'puzzle':'brush',stage===2?2:1);
    later(()=>finishSequence(seq,()=>{
      toolDirection=0;render();
      if(focused)(stage===2?$('#tray button'):control)?.focus({preventScroll:true});
    }),reduced.matches?150:650);
  }
  if(echo){
    tool.points.forEach(([x,y],i)=>{
      const point=document.createElement('button');
      point.type='button';point.className='echo-point';point.style.cssText=`--x:${x}%;--y:${y}%`;
      point.setAttribute('aria-label',`探测点 ${i+1}`);
      point.textContent=i+1;
      point.onclick=()=>{
        const stage=fieldStage();if(stage===null)return;
        const target=tool.answers[stage];
        if(i===target){finishFieldAction(stage,i,point);return;}
        const [tx,ty]=tool.points[target],near=Math.hypot(x-tx,y-ty)<35;
        point.dataset.signal=near?'near':'far';
        audio.synth(near?'snap':'knock');
        status(near?'回声变清楚了，在附近找找。':'回声很闷，换个地方听听。');
      };
      echoPoints.append(point);
    });
  }
  if(tool&&!echo&&!extraTool){
    turnWedge.onclick=()=>{
      const stage=fieldStage();if(stage===null)return;
      toolDirection=(toolDirection+1)%directionLabels.length;
      paintWedge(stage);fieldStatus(stage);
    };
    pressWedge.onclick=()=>{
      const stage=fieldStage();if(stage===null)return;
      if(toolDirection!==tool.answers[stage]){status('让楔子的尖头沿着裂缝摆齐，再试试。');return;}
      finishFieldAction(stage,toolDirection,pressWedge);
    };
  }
  const stones=[];
  function rubbleStatus(){
    status(`已经移开 ${store.STONES.filter(cell=>current.cleared.includes(cell)).length} / ${stones.length} 块碎石`);
  }
  function paintRubble(){
    const removing=current.step==='rubble';
    $('#rubble').hidden=false;
    stones.forEach((stone,i)=>{
      const moved=!removing||current.cleared.includes(store.STONES[i]);
      stone.classList.toggle('moved',moved);
      stone.disabled=moved;
      stone.setAttribute('aria-hidden',String(moved));
    });
  }
  function beginRubble(control){
    const focused=document.activeElement===control;
    toolDirection=0;extraTool?.reset();render();
    if(focused)stones.find(stone=>!stone.disabled)?.focus({preventScroll:true});
  }
  if(layered)layered.pieces.forEach(([x,y,edgeX,edgeY,width],i)=>{
    const stone=document.createElement('button');
    stone.type='button';stone.className='rubble-piece';
    stone.setAttribute('aria-label',`移开第 ${i+1} 块碎石`);
    stone.style.cssText=`--x:${x}%;--y:${y}%;--edge-x:${edgeX}%;--edge-y:${edgeY}%;--width:${width}%;--tile-x:${i%2*100}%;--tile-y:${Math.floor(i/2)*100}%;--atlas:url("./${layered.file}${V}")`;
    stone.onclick=()=>{
      const focused=document.activeElement===stone;
      if(busy||read().step!=='rubble'||current.cleared.includes(store.STONES[i]))return;
      store.removeStone(i);read();warning();
      if(!current.cleared.includes(store.STONES[i]))return;
      audio.synth('knock');effects.impact({x:x/100,y:y/100},i);
      if(current.step==='brush'){render();if(focused)$('#title').focus({preventScroll:true});}
      else{paintRubble();rubbleStatus();if(focused)stones.find(button=>!button.disabled)?.focus({preventScroll:true});}
    };
    stones.push(stone);
    $('#rubble').append(stone);
  });
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
  const brushCells=layered?new Set(F.area.weights.map(([cell])=>cell)):null;
  const BRUSH_R=.085,BRUSH_WEAR=.3,BRUSH_ALPHA=.26,WORN=.6,wear=new Float32Array(1024),shown=new Set();
  function stampWear(p,alpha,r=BRUSH_R){const m=wearMask.getContext('2d'),size=wearMask.width,x=p.x*size,y=p.y*size,rad=r*size,grad=m.createRadialGradient(x,y,0,x,y,rad);grad.addColorStop(0,`rgba(0,0,0,${alpha})`);grad.addColorStop(1,'rgba(0,0,0,0)');m.fillStyle=grad;m.beginPath();m.arc(x,y,rad,0,Math.PI*2);m.fill();}
  function syncWear(){const done=new Set([...current.cleared,...pending]);if([...shown].some(n=>!done.has(n))){wearMask.getContext('2d').clearRect(0,0,wearMask.width,wearMask.height);wear.fill(0);shown.clear();}done.forEach(n=>{if(shown.has(n)||(layered&&store.STONES.includes(n)))return;shown.add(n);wear[n]=1;stampWear({x:(n%32+.5)/32,y:(Math.floor(n/32)+.5)/32},1,1.6/32);});}
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
  function nextTitle(title,text,step){header(title,text);steps(step,step==='revive'?stepOrder.length:undefined);$('.heading').classList.remove('title-in');void $('.heading').offsetWidth;$('.heading').classList.add('title-in');mark('next-title');}
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
  function erase(p){if(!effects.onTop(p))return;stampWear(p,BRUSH_ALPHA);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot((x+.5)/32-p.x,(y+.5)/32-p.y),n=y*32+x;if(d>=BRUSH_R||(brushCells&&!brushCells.has(n))||current.cleared.includes(n)||pending.has(n)||!effects.onTop({x:(x+.5)/32,y:(y+.5)/32}))continue;wear[n]+=BRUSH_WEAR*(1-d/BRUSH_R);if(wear[n]>=WORN){pending.add(n);shown.add(n);}}queueSand();art.parts.forEach(part=>{if(!flashed.has(part.id)&&partCoverage(part)>=.3){flashed.add(part.id);effects.stats.flashes.push({id:part.id,coverage:partCoverage(part),at:performance.now()});flash(part);}});const total=store.coverage([...current.cleared,...pending]);status(`骨头已刷开 ${Math.floor(total*100)}% / 70%`);clearTimeout(flushTimer);if(total>=store.THRESHOLD)flushBrush();else flushTimer=setTimeout(flushBrush,140);}
  function flushBrush(){clearTimeout(flushTimer);if(!pending.size)return;const cells=[...pending];pending.clear();store.brush(cells);read();warning();if(current.step==='puzzle'&&(!busy||transition?.to==='brush')){brushPointer=null;lastPoint=null;if(transition?.to==='brush')finishSequence(transition,()=>{});brushFinished();}}
  function brushAt(p){if(!effects.onTop(p)){effects.hideBrush();lastPoint=null;return;}if(!strokeCounted){brushStrokes++;strokeCounted=true;}dismissDemo('brush');if(transition?.to==='brush')$('#egg').hidden=true;const from=lastPoint||p,count=Math.max(1,Math.ceil(Math.hypot(p.x-from.x,p.y-from.y)/.025));for(let i=1;i<=count&&current.step==='brush';i++)erase({x:from.x+(p.x-from.x)*i/count,y:from.y+(p.y-from.y)*i/count});if(current.step==='brush'){effects.cursor(p,lastPoint);lastPoint=p;audio.rustle();}}
  canvas.addEventListener('pointerdown',e=>{if(!brushReady()||!store.eligible()||read().step!=='brush')return;e.preventDefault();audio.unlock();brushPointer=e.pointerId;strokeCounted=false;lastPoint=null;canvas.setPointerCapture(e.pointerId);brushAt(point(e));});
  canvas.addEventListener('pointermove',e=>{if(!brushReady()||e.pointerId!==brushPointer||current.step!=='brush')return;e.preventDefault();brushAt(point(e));});
  ['pointerup','pointercancel'].forEach(t=>canvas.addEventListener(t,()=>{brushPointer=null;lastPoint=null;effects.hideBrush();flushBrush();}));
  function artImage(part,className){const img=new Image(),r=geometry(part);img.src='./art/'+part.file+V;img.alt='';img.className=className;img.style.cssText=`left:${r.x*100}%;top:${r.y*100}%;width:${r.w*100}%;height:${r.h*100}%;`;return img;}
  function brushFinished(){
    effects.hideBrush();const seq=startSequence('brush','puzzle',2400);status(`骨头已刷开 ${Math.floor(store.coverage(current.cleared)*100)}%`);header('骨架露出来啦','都是刚刚从岩石里挖出来的骨头');
    later(()=>{if(reduced.matches)canvas.hidden=true;else canvas.classList.add('sand-away');audio.rustle();mark('remaining-sand-clears');},450);
    later(()=>completeStep(stepOrder.indexOf('puzzle')),650);
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
  function finishRevival(seq,reason){if(transition!==seq||seq.finishing)return;seq.finishing=true;timers.forEach(clearTimeout);timers.clear();seq.reason=reason;seq.voice=audio.status().lastVoice;if(reason!=='voice-complete'){audio.stop();[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));}settleHero();$('#speechBubble').hidden=true;$('#boneHighlights').replaceChildren();$('#skipRevival').hidden=true;steps('',stepOrder.length);$('#knowledge').classList.remove('pending');if(!reduced.matches)$('#knowledge').classList.add('card-in');awake=true;busy=false;mark('knowledge-card-start');later(()=>finishSequence(seq,()=>{document.body.classList.add('reveal-mode');status('');}),reduced.matches?0:250);}
  function revive(replay){
    if(F.restorationOnly){if(busy||!store.eligible()||!['revive','museum'].includes(read().step))return;cancelSequence();replaying=replay;hideAll();$('#workspace').hidden=false;$('#eggContents').hidden=false;$('#cleanFace').src='./'+art.face.file+V;header('化石修复完成','你把'+F.name+'的骨架拼完整啦');steps('',stepOrder.length);$('#knowledge').hidden=false;$('#knowledge .eyebrow').textContent='我的发现';$('#knowledge h2').textContent=F.card.title;$('#knowledgeText').textContent=F.card.text;$('#enterMuseum').textContent='放进博物馆 →';awake=true;return;}

    if(busy||!store.eligible()||!['revive','museum'].includes(read().step))return;
    if(!revivalReady()){render();return;}
    cancelSequence();const sceneBefore=$('#board').getBoundingClientRect();replaying=replay;awake=false;hideAll();document.body.classList.add('hero-mode');$('#workspace').hidden=false;$('#slab').hidden=false;$('.steps').hidden=false;steps('',stepOrder.length);board.dataset.phase='revive';header(F.name+'醒来了','');status('');audio.unlock();$('#knowledge').hidden=false;$('#knowledge .eyebrow').textContent='你好，'+F.name;$('#knowledge h2').textContent=F.card.title;$('#knowledgeText').textContent=ID==='brachio'?'':F.card.text;$('#knowledge').classList.add('pending');$('#enterMuseum').textContent=replay||store.isRepeating()?'回到博物馆 →':'放进博物馆 →';
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
    $('#replay').hidden=!collected||F.restorationOnly;updateRevivalButtons();$('#redig').hidden=!collected;$('#redig').textContent=store.hasRepeat()?'继续挖掘':'再挖一次';$('#digLink').hidden=collected||!store.eligible();$('#digLink').href='./?'+baseQuery+'v=20261031-trex-r1';if(!collected&&!store.eligible())status(route?'完成'+route.name+'后，就能来挖化石。':'这块化石的探险地点还未开放。');
  }
  $('#hallTabs').addEventListener('click',e=>{const b=e.target.closest('[data-hall]');if(!b)return;hall=b.dataset.hall;page=0;museum();});
  $('#prevPage').onclick=()=>{page--;museum();};$('#nextPage').onclick=()=>{page++;museum();};
  $('#exhibits').addEventListener('click',e=>{const b=e.target.closest('[data-fossil]');if(!b)return;const f=fossilOf(b.dataset.fossil);$('#factImg').src=f.living.file;$('#factImg').alt=f.name;$('#fact h2').textContent=f.card.title;$('#fact p').textContent=f.card.text;$('#fact').showModal();});
  $('#redig').onclick=()=>{
    if(busy||!(store.resumeRepeat()||store.startRepeat())){warning();return;}
    replayAfterLoad=false;
    cancelSequence();cancelDrag();audio.stop();effects.reset();flashed.clear();dismissedDemos.clear();readyParts.clear();art.parts.forEach(p=>readyParts.add(p.id));pending.clear();clearTimeout(flushTimer);brushPointer=null;lastPoint=null;selected=null;brushStrokes=0;replaying=false;awake=false;toolDirection=0;view='dig';
    history.replaceState(null,'','?'+baseQuery+'v=20261031-trex-r1');render();
  };
  $('#replay').onclick=()=>{
    if(busy||!store.eligible()||read().step!=='museum')return;
    audio.unlock();
    if(revivalReady()){revive(true);return;}
    replayAfterLoad=true;
    prepareExcavation();
    updateRevivalButtons();
  };$('#closeFact').onclick=()=>$('#fact').close();
  $('#sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('#sound').textContent=audio.enabled?'声音开':'声音关';$('#sound').setAttribute('aria-pressed',String(audio.enabled));};
  $('#back').onclick=e=>{flushBrush();if(!store.storageOK()){e.preventDefault();warning();}};
  window.addEventListener('pagehide',()=>{replayAfterLoad=false;flushBrush();cancelSequence();cancelDrag();extraTool?.reset();audio.stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){replayAfterLoad=false;flushBrush();cancelSequence();cancelDrag();extraTool?.reset();audio.stop();if(!awake)render();}else if(extraTool&&!awake&&!busy)render();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&extraTool&&!awake)render();});
  store.subscribe(warning);window.addEventListener('storage',()=>{cancelSequence();cancelDrag();render();});
  reduced.addEventListener('change',()=>{cancelDrag();if(reduced.matches){if(transition?.to==='puzzle')art.parts.forEach(landed);if(transition?.to==='revive'){[$('#living'),$('#floatingSkeleton'),board,$('#board')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));settleHero();}effects.reset();document.querySelectorAll('.flight-bone,.knock-impact,.knock-piece').forEach(e=>e.remove());document.querySelectorAll('.receiving').forEach(e=>e.classList.remove('receiving'));}});
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
    $('#living').decode().then(()=>{revivalImageReady=true;updateRevivalButtons();playRequestedReplay();})
      .catch(()=>{revivalAssetsFailed=true;updateRevivalButtons();});
    for(const id of ['fossil-groove','fossil-bone-groove'])document.querySelectorAll('#'+id+' feFlood').forEach((el,i)=>el.setAttribute('flood-color',[F.groove.base,F.groove.inset,F.groove.light][i]));
    board.dataset.rock=F.rock;document.body.classList.toggle('wide-fossil',cut);document.body.classList.toggle('natural-fossil',natural);$('#tray').dataset.n=art.parts.length;$('#tray').setAttribute('aria-label','从石板中取出的 '+art.parts.length+' 块骨头');
    art.parts.forEach(part=>$('#slab').append(artImage(part,'assembled-bone')));if(natural)$('#slab').style.visibility='hidden';
    audio.prepareVoice();
    const imgs=art.parts.map(part=>{const img=new Image();img.fetchPriority='low';img.src='./art/'+part.file+V;partImages.set(part.id,img);return img;});
    const grooveImages=[...document.querySelectorAll('#cutGrooves img')];
    const rubbleImage=layered?new Image():null;
    if(rubbleImage)rubbleImage.src='./'+layered.file+V;
    stageImages.forEach((image,i)=>image.decode().then(()=>{
      readyStages.add(i);
      if(!busy&&view==='dig'&&read().step==='knock'&&stageIndex(current.hits)===i){
        if(!knockReady){knockReady=true;render();}
        else if(tide)renderTide();else if(tool)renderField();else paintShell();
      }
    }).catch(()=>{}));
    Promise.all([$('#eggWhole'),$('#bowl'),...(cut&&!natural?[]:[$('#cleanFace')]),$('#sandSource'),...stageImages,...imgs,...grooveImages,...(rubbleImage?[rubbleImage]:[]),...$('#slab').querySelectorAll('img')].map(i=>i.decode())).then(()=>{
      grooveImages.forEach(img=>{img.className='groove';img.style.filter='url("#fossil-bone-groove")';});
      if(cut&&!natural)$('#cutGrooves').hidden=false;
      sandBase=makeSand();assetsReady=true;updateRevivalButtons();if(!tide&&!tool&&read().step==='knock')paintSand();
      if(!knockReady){knockReady=true;render();}else if(waitingAssets&&!busy){waitingAssets=false;if((tide||tool)&&view==='dig')render();else status(`已经敲了 ${read().hits} / 6 下`);}
      playRequestedReplay();
    }).catch(()=>{if(cut&&!natural)$('#cutGrooves').hidden=true;revivalAssetsFailed=true;updateRevivalButtons();status('图片还没加载好，请刷新后再试');});
  }
  function prepareExcavation(){
    if(assetsLoading)return;
    assetsLoading=true;
    initialStage=stageIndex(read().hits);
    stageImages[initialStage].fetchPriority='high';
    stageImages[initialStage].src='./'+F.stages[initialStage]+V;
    stageImages[initialStage].decode().then(()=>{
      readyStages.add(initialStage);
      if(view==='dig'&&read().step==='knock'&&stageIndex(current.hits)===initialStage){
        knockReady=true;render();
      }
      startRemainingAssets();
    }).catch(()=>{revivalAssetsFailed=true;updateRevivalButtons();status('图片还没加载好，请刷新后再试');});
  }
  render();
  Object.defineProperty(window,'__fossil',{value:Object.freeze({get interactions(){return{landings:structuredClone(landings),dragStarts:structuredClone(dragStarts),readyParts:[...readyParts],dragging:drag?.id||null};},get effects(){return structuredClone(effects.stats);},get state(){return store.load();},get view(){return view;},get audio(){return audio.status();},get reduced(){return reduced.matches;},get awake(){return awake;},get selected(){return selected;},get ready(){return knockReady;},get brush(){return{coverage:store.coverage([...read().cleared,...pending]),strokes:brushStrokes,widthRatio:.12};},get transition(){return{active:busy,from:transition?.from,to:transition?.to,elapsed:transition?performance.now()-transition.start:0};},get transitions(){return structuredClone(transitions);}})});
})();
