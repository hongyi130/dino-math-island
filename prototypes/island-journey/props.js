/* Static scenery for the two grade-2 samples. No game state or storage writes. */
(() => {
  'use strict';
  const source = new URL(document.currentScript.src);
  const params = new URLSearchParams(location.search);
  const disabled = params.get('props') === '0';
  let footprints={};
  const layer=document.createElement('div');layer.id='sceneProps';layer.setAttribute('aria-hidden','true');layer.inert=true;
  layer.style.cssText='position:absolute;inset:0;pointer-events:none;';
  const backLayer=document.createElement('div'),frontLayer=document.createElement('div');
  backLayer.style.cssText='position:absolute;inset:0;z-index:1;pointer-events:none;';
  frontLayer.style.cssText='position:absolute;inset:0;z-index:4;pointer-events:none;';
  backLayer.dataset.layer='distant';frontLayer.dataset.layer='foreground';layer.append(backLayer,frontLayer);
  document.querySelector('#stage').append(layer);
  // Keep all row-local dinosaur z-indices together below foreground, above board tiles.
  if(!disabled&&document.querySelector('#dinos'))Object.assign(document.querySelector('#dinos').style,{position:'absolute',inset:'0',zIndex:'3',pointerEvents:'none'});
  let artAspect=1.2, geometry=null;
  let lastKey = '', placements = [], exclusions = [], frame, generation = 0;
  const rect = (x,y,width,height,label) => ({x,y,width,height,right:x+width,bottom:y+height,label});
  const box = (el,label) => { const b=el.getBoundingClientRect();return rect(b.x,b.y,b.width,b.height,label); };
  const pad = (r,n=8) => ({...r,...rect(r.x-n,r.y-n,r.width+2*n,r.height+2*n,r.label)});
  const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const selectors = '.tile,.dino,.camp,#pool,.bubble,.count,.flag,.plus,#card,#bar,#controls,header > *,#fossilEgg,#journeyBack,#back,button';
  function actual() {
    return [...document.querySelectorAll(selectors)].filter(visible).map((el,i)=>box(el,el.id || `${el.classList[0]}-${i}`));
  }
  function distance(a,b) {
    const dx=Math.max(b.x-a.right,a.x-b.right),dy=Math.max(b.y-a.bottom,a.y-b.bottom);
    return dx>0||dy>0 ? Math.hypot(Math.max(0,dx),Math.max(0,dy)) : Math.max(dx,dy);
  }
  function seeded(seed) { return () => { seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296; }; }
  function context() {
    const m=window.__sample,s=window.__shareSample;
    if(m?.layout) return {type:'cedar',id:m.config.id,layout:m.layout,total:m.config.total};
    if(s?.layout && !s.blocked) return {type:'waterfall',id:s.level.id,layout:s.layout,total:s.level.total};
    return null;
  }
  function ground(x,c) {
    const l=c.layout, b=c.type==='cedar' ? window.G2_VOLCANO_BACKGROUNDS[innerWidth>innerHeight?'landscape':'portrait'] : l.scene;
    const g=b.ground;
    let left,top,width,height;
    if(c.type==='cedar') {const r=document.querySelector('#scene').getBoundingClientRect();left=r.x;top=r.y;width=r.width;height=r.height;}
    else ({x:left,y:top,width,height}=l.scene);
    const u=Math.max(0,Math.min(1,(x-left)/width)),p=g.upper;
    for(let i=1;i<p.length;i++)if(u<=p[i][0])return top+(p[i-1][1]+(p[i][1]-p[i-1][1])*(u-p[i-1][0])/(p[i][0]-p[i-1][0]))*height;
    return top+p.at(-1)[1]*height;
  }
  // Measure invisible footer copies in every UI phase; never mutate the live lesson.
  // This makes the layout identical on a fresh visit and when resuming an answer.
  function footerBounds(c) {
    const bar=document.querySelector('#bar'),copy=bar.cloneNode(false),heights=[],buttons=[];
    copy.style.visibility='hidden';copy.style.pointerEvents='none';copy.setAttribute('aria-hidden','true');
    const level=window.DINO_GRADE2.find(v=>v.id===c.id),per=level.perGroup,groups=level.groups;
    const variants=c.type==='cedar'?[
      [`先凑齐第 1 队：每队 ${per} 只`,'点发光的格子，一只一只接过来',`<div class="icons">${'<img style="height:26px">'.repeat(per)}</div><span>还差 <b style="font-size:20px">${per}</b> 只</span>`],
      [`每队都是 ${per} 只，再来一队`,`已经有 1 队，还要 ${groups-1} 队`,`<button class="primary">＋ 再来一队（${per} 只）</button>`],
      ['一队一队数一数',`数到 ${per*groups} 了，接着点第 ${groups+1} 队`,''],
      [`${groups} 个 ${per} 是多少？`,'不对哦，看看刚才数到了几','<div class="answers"><button>12</button><button>16</button><button>20</button></div>'],
      [`${per} × ${groups} = ${per*groups}`,`每队一样多，${groups} 个 ${per} 就用乘法：${per} × ${groups}。`,'<button class="primary" id="journeyContinue">去挖化石！</button><button class="journey-again">再练一次</button>']
    ]:[
      ['让每个营地一样多','点营地的“＋送一只”；点营地里的恐龙可以请回。','<button id="check">✓ 分好了，检查一下</button>'],
      ['让每个营地一样多','还不一样多。点多的营地里的恐龙，请它回来再分。','<button id="check">✓ 分好了，检查一下</button>'],
      ['每个营地分到几只？','再数数一个营地里的伙伴，重新选一选。','<button class="answer-choice">2</button><button class="answer-choice">3</button><button class="answer-choice">4</button>'],
      ['你算出来啦！','每个营地一样多，你会平均分啦！','<button id="next">岩台完成 · 返回地图 →</button>']
    ];
    try {
      document.querySelector('#stage').append(copy);
      for(const [title,sub,row] of variants) {
        copy.innerHTML=c.type==='cedar'?`<h2>${title}</h2><p>${sub}</p><div class="row">${row}</div>`:`<h1 id="headline">${title}</h1><p id="feedback">${sub}</p><div id="actions">${row}</div>`;
        for(const el of bar.querySelectorAll('#voiceToggle,#restart'))copy.append(el.cloneNode(true));
        heights.push(copy.getBoundingClientRect().height);
        buttons.push(...[...copy.querySelectorAll('button')].map(el=>({...box(el,'future-footer-button'),cover:box(copy,'phase-footer-cover')})));
      }
    } finally {copy.remove();}
    const r=box(bar,'footer'),bottom=innerHeight-Math.max(10,innerHeight-r.bottom);
    return {min:Math.min(...heights),max:Math.max(...heights),x:r.x,width:r.width,bottom,buttons};
  }
  function canonicalRows(c,footerHeight) {
    const W=innerWidth,H=innerHeight,short=H<600,cardBottom=document.querySelector('#card').getBoundingClientRect().bottom;
    const level=window.DINO_GRADE2.find(v=>v.id===c.id),PER=level.perGroup,GROUPS=level.groups,dense=PER>=5;
    const a=window.DINO_GROUND_DATA[level.factKind],bounds=a?.bounds||[0,0,1,1];
    const sole=a?Math.max(...a.contacts.map(p=>p[1])):.96,aspect=artAspect;
    const headLift=.95/aspect*(sole-bounds[1]),tc=W>H*1.15||W>=700?2:1,tr=Math.ceil(GROUPS/tc);
    let rows=[],rowGap,top,extra=0;
    for(let pass=0;pass<40;pass++) {
      top=cardBottom+(short?10:22)+extra;
      rowGap=(c.footer.bottom-footerHeight-(short?6:14)-top)/tr;
      const innerRows=dense?2:1,innerCols=Math.ceil(PER/innerRows),rowSpace=short?5:7;
      const limit=(rowGap-14-(innerRows-1)*rowSpace)/(innerRows*(headLift+.17));
      const base=Math.min((W/tc-126)/(innerCols*1.04),rowGap*1.45,190,dense||c.id!==76?limit:Infinity);
      rows=Array.from({length:GROUPS},(_,g)=>{
        const ri=Math.floor(g/tc),ci=g%tc,t=tr===1?1:ri/(tr-1),tw=base*((dense?.94:.8)+(dense?.06:.2)*t),th=tw*.34;
        const y=top+rowGap*(ri+.7),cx=W/2+(ci-(tc-1)/2)*(W/tc)-9;
        const cols=Array.from({length:PER},(_,j)=>{const rr=Math.floor(j/innerCols),cc=j%innerCols,n=Math.min(innerCols,PER-rr*innerCols);return {x:cx+(cc-(n-1)/2)*tw*1.04,y:dense?top+rowGap*ri+7+headLift*tw+rr*(headLift*tw+th/2+rowSpace):y};});
        const headTop=Math.min(...cols.map(p=>p.y))-headLift*tw,tileTop=Math.min(...cols.map(p=>p.y))-th/2,tileBottom=Math.max(...cols.map(p=>p.y))+th/2;
        return {y:dense?(headTop+tileBottom)/2:y,tw,th,cols,headTop,tileTop,tileBottom,left:Math.min(...cols.map(p=>p.x))-tw/2-12,right:Math.max(...cols.map(p=>p.x))+tw/2+12};
      });
      let need=0;
      for(const r of rows)for(let x=r.left;x<=r.right;x+=8)need=Math.max(need,ground(x,c)+c.sceneHeight*.02+1-r.tileTop);
      need=Math.max(need,cardBottom+6-rows[0].headTop);
      if(need<=.5)break;extra+=need;
    }
    return {rows,teamColumns:tc,W,H,rowGap,top};
  }
  // Empty slots, future badges and all distributions are reserved before placement.
  function reserve(c) {
    const out=[...document.querySelectorAll('header > *,#card,#fossilEgg,#journeyBack,#back')].filter(visible).map(el=>box(el,el.id||'header'));
    const f=c.footer;
    out.push(...f.buttons);
    const egg=document.querySelector('#fossilEgg');if(egg)out.push(pad(box(egg,'egg-crack-motion'),7));
    out.push(rect(f.x,f.bottom-f.max,f.width,f.max,'all-footer-states'));
    if(c.type==='cedar') {
      const info=window.DINO_GRADE2.find(v=>v.id===c.id),a=window.DINO_GROUND_DATA[info.factKind],bounds=a?.bounds||[0,0,1,1];
      const sole=a?Math.max(...a.contacts.map(p=>p[1])):.96,cx=(bounds[0]+bounds[2])/2;
      // Sample all footer heights, including intermediate wrapped-line heights.
      for(let height=f.min;height<=f.max+1;height+=2) {
        const l=canonicalRows(c,Math.min(height,f.max));
        const size=Math.max(18,Math.min(26,...l.rows.map((r,i)=>(((i%l.teamColumns)+1)*l.W/l.teamColumns-8-r.right-8)/2)));
        l.rows.forEach((r,i)=>{
          r.cols.forEach((p,j)=>{
            out.push(rect(p.x-r.tw/2,p.y-r.th/2,r.tw,r.th,`tile-${i}-${j}`));
            const w=r.tw*.95,h=w/artAspect;
            out.push(rect(p.x-w*cx-70,p.y-h*sole-18,w+72,h+20,`future-dino-${i}-${j}`));
            if(i===0){const rad=Math.max(14,r.tw*.11)+2;out.push(rect(p.x-rad,p.y-rad,rad*2,rad*2,'future-plus'));}
          });
          const flagWidth=Math.max(48,r.tw*.15*3.5);
          out.push(rect(r.left-8-flagWidth/2,r.y-34,flagWidth,70,`flag-${i}`));
          const edge=((i%l.teamColumns)+1)*l.W/l.teamColumns-8;
          // Existing SVG badge pop scales around the SVG origin: reserve its swept path.
          for(let step=0;step<=40;step++) {const k=.6+step*.01;out.push(rect((edge-size*2-2)*k,(r.y-size*.9-2)*k,(size*2+4)*k,(size*1.6+4)*k,`future-bubble-${i}`));}
        });
      }
    } else {
      const l=c.layout,short=innerHeight<600&&innerWidth>innerHeight,r=l.field;
      const bottom=short?innerHeight-12:f.bottom-f.min-67;
      out.push(rect(r.x,r.y,r.width,bottom-r.y,'all-camps-and-pool'));
      const controls=box(document.querySelector('#controls'),'all-control-states');
      out.push(rect(controls.x,f.bottom-f.max-57,controls.width,f.max-f.min+49,controls.label));
    }
    return out.map(r=>pad(r));
  }
  function clipped(r,b) {
    const x=Math.max(r.x,b.x),y=Math.max(r.y,b.y),right=Math.min(r.right,b.right),bottom=Math.min(r.bottom,b.bottom);
    return right>x&&bottom>y?rect(x,y,right-x,bottom-y,r.label):null;
  }
  function subtract(r,b) {
    const hit=clipped(r,b);if(!hit)return [r];
    return [rect(r.x,r.y,r.width,hit.y-r.y),rect(r.x,hit.bottom,r.width,r.bottom-hit.bottom),rect(r.x,hit.y,hit.x-r.x,hit.height),rect(hit.right,hit.y,r.right-hit.right,hit.height)].filter(q=>q.width>0&&q.height>0);
  }
  function rotatePoint(x,y,p) {
    const a=(p.rotation||0)*Math.PI/180,cx=p.x+p.width/2,cy=p.y+p.height;
    return {x:cx+(x-cx)*Math.cos(a)-(y-cy)*Math.sin(a),y:cy+(x-cx)*Math.sin(a)+(y-cy)*Math.cos(a)};
  }
  function rotatedBox(r,p) {
    if(!p.rotation)return r;
    const v=[[r.x,r.y],[r.right,r.y],[r.right,r.bottom],[r.x,r.bottom]].map(([x,y])=>rotatePoint(x,y,p));
    const x=Math.min(...v.map(q=>q.x)),y=Math.min(...v.map(q=>q.y));
    return rect(x,y,Math.max(...v.map(q=>q.x))-x,Math.max(...v.map(q=>q.y))-y);
  }
  function screenCrop(p) {
    const b=footprints[p.asset].bounds,r=rect(p.x+b[0]/512*p.width,p.y+b[1]/512*p.height,(b[2]-b[0])/512*p.width,(b[3]-b[1])/512*p.height);
    let poly=[[r.x,r.y],[r.right,r.y],[r.right,r.bottom],[r.x,r.bottom]].map(([x,y])=>rotatePoint(x,y,p));
    for(const [axis,bound,less] of [['x',0,false],['x',innerWidth,true],['y',0,false],['y',innerHeight,true]]) {
      const next=[],inside=q=>less?q[axis]<=bound:q[axis]>=bound;
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],aa=inside(a),bb=inside(b);
        if(aa)next.push(a);
        if(aa!==bb){const t=(bound-a[axis])/(b[axis]-a[axis]);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
      }
      poly=next;
    }
    let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];area+=a.x*b.y-b.x*a.y;}
    return 1-Math.abs(area)/2/(r.width*r.height);
  }
  // Conservative coverage of every nontransparent pixel, including soft contact shadows.
  function footprint(p,cover=null) {
    const a=footprints[p.asset],bounds=rect(0,0,innerWidth,innerHeight),out=[];
    a.bands.forEach((b,i)=>{
      if(!b)return;
      const r=clipped(rotatedBox(rect(p.x+b[0]/512*p.width,p.y+i*4/512*p.height,(b[1]-b[0])/512*p.width,4/512*p.height),p),bounds);
      if(r)out.push(...(cover?subtract(r,cover):[r]));
    });
    return out;
  }
  function coverRect(c) {const f=c.footer;return rect(f.x,f.bottom-f.min,f.width,f.min,'footer-cover');}
  function clear(p,c) {
    const cover=p.zone==='foreground'?coverRect(c):null;
    const pieces=footprint(p,cover),area=pieces.reduce((s,r)=>s+r.width*r.height,0);
    if(area<p.width*p.height*(p.zone==='foreground'?.008:.12))return false;
    const near=exclusions.filter(b=>!(p.zone==='foreground'&&b.label==='all-footer-states')&&distance(rotatedBox(p,p),b)<0);
    return !near.some(b=>(p.zone==='foreground'&&b.cover?footprint(p,b.cover):pieces).some(r=>distance(r,b)<0));
  }
  function addGroup(parts,c,id) {
    const zone=parts[0].zone,target=zone==='foreground'?frontLayer:backLayer;
    for(const [i,p] of parts.entries()) {
      const element=document.createElement('div'),url=new URL(`./props/${p.asset}.webp?v=20261028-g2p-r2`,source).href;
      element.className='scene-prop';element.dataset.prop=p.asset; element.dataset.zone=zone;
      element.style.cssText=`position:absolute;left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px;transform:rotate(${p.rotation||0}deg);transform-origin:50% 100%;pointer-events:none;`;
      const img=document.createElement('img');img.src=url;img.alt='';img.draggable=false;
      img.style.cssText=`display:block;width:100%;height:100%;pointer-events:none;animation:none;transition:none;filter:${zone==='distant'?'saturate(.8) brightness(1.06)':'brightness(.9)'};`;
      element.append(img);
      if(zone==='distant') {
        const mist=document.createElement('span');mist.style.cssText=`position:absolute;inset:0;background:#d7e1db;opacity:.1;mask:url("${url}") center/100% 100% no-repeat;pointer-events:none;`;
        element.append(mist);
      }
      target.append(element);placements.push({...p,name:`${id}-${i}-${p.asset.split('/')[1]}`,group:id});
    }
  }
  function dinoHeight(c) {
    if(c.type==='cedar')return Math.max(...canonicalRows(c,c.footer.min).rows.map(r=>r.tw*.95/artAspect));
    const level=window.DINO_GRADE2.find(v=>v.id===c.id),n=level.goal,cols=Math.min(n,3),rows=Math.ceil(n/cols),gap=5;
    return Math.max(...[...document.querySelectorAll('.camp .rack')].map(r=>Math.max(8,Math.min((r.clientHeight-gap*(rows-1))/rows-2,(r.clientWidth-gap*(cols-1))/cols/artAspect,160))));
  }
  function make(asset,x,y,size,zone) {return {...rect(x,y,size,size,asset),asset,zone};}
  function place() {
    const c=context();if(!c)return;
    const key=`${c.id}:${innerWidth}:${innerHeight}`;if(key===lastKey)return;
    lastKey=key;generation++;backLayer.replaceChildren();frontLayer.replaceChildren();placements=[];
    c.footer=footerBounds(c);c.sceneHeight=document.querySelector('#scene').getBoundingClientRect().height;
    exclusions=reserve(c);geometry={footer:c.footer,rows:c.type==='cedar'?canonicalRows(c,c.footer.min):null};
    if(disabled)return;
    const W=innerWidth,H=innerHeight,rng=seeded(c.id*7919+W*31+H),dh=dinoHeight(c);
    geometry.referenceDinoHeight=dh;
    // Foreground groups are deliberately large and edge-cropped, never gap-filling specks.
    for(const side of ['left','right']) {
      let accepted=null;
      const primary=c.type==='cedar'?(side==='left'?'fern-wide':'cycad'):(side==='left'?'moss-rock':'wet-rock-tall');
      const secondary=c.type==='cedar'?(side==='left'?'cycad':'log'):(side==='left'?'fern':'horsetail');
      for(const scale of [1.8,1.6,1.4,1.2,2]) {
        if(accepted)break;
        const size=dh*scale;
        for(const rotation of [0,side==='left'?-12:12,side==='left'?-20:20,side==='left'?-30:30])for(const crop of [.3,.4,.2,.25,.35,.45,.5,.55,.6])for(const bottomCrop of [0,.04,.08,-.04,-.08,-.12,-.16,-.2]) {
          if(accepted)continue;
          const x=side==='left'?-size*crop:W-size*(1-crop),y=H-size+size*bottomCrop;
          let p=null;
          for(const asset of [`${c.type}/${primary}`,'waterfall/fern-tall']) {
            const candidate={...make(asset,x,y,size,'foreground'),rotation};
            const cut=screenCrop(candidate);
            if(cut<.199||cut>.401||!clear(candidate,c))continue;
            p={...candidate,screenCrop:cut};break;
          }
          if(!p)continue;
          const smaller=size*.72,sx=side==='left'?x+size*.25:x+size*.03;
          const q=make(`${c.type}/${secondary}`,sx,y+size*.26,smaller,'foreground');
          accepted=clear(q,c)?[p,q]:[p];
        }
      }
      if(accepted)addGroup(accepted,c,`front-${side}`);
    }
    // The distant bank sits just behind the playable ground edge, with tops allowed in sky.
    const groups=[],anchors=W<600?[.06,.94,.28,.72]:[.1,.9,.3,.7];
    const palette=c.type==='cedar'?[['conifer','cycad'],['conifer','fern-upright'],['cycad','moss-rock-tall'],['conifer','cycad']]:[['wet-rock-tall','fern'],['moss-rock','horsetail'],['wet-rock-flat','fern'],['wet-rock-tall','horsetail']];
    for(let k=0;k<anchors.length;k++) {
      let accepted=null;
      for(const scale of [1.35,1.1,.9,.75,.6,.5]) {
        if(accepted)break;
        const size=Math.min(dh*scale,H*.30),cx=W*anchors[k];
        for(const offset of [0,-.06,.06,-.12,.12])for(const back of [0,8,16]) {
          if(accepted)continue;
          const x=Math.max(-size*.4,Math.min(W-size*.6,cx+W*offset-size/2));
          const asset=`${c.type}/${palette[k][0]}`,base=ground(x+size/2,c)-c.sceneHeight*(W>H?.045:.035)+back,y=base-size*footprints[asset].bounds[3]/512;
          const p=make(`${c.type}/${palette[k][0]}`,x,y,size,'distant');
          const small=size*.72,q=make(`${c.type}/${palette[k][1]}`,x+size*.42,base-small*footprints[`${c.type}/${palette[k][1]}`].bounds[3]/512,small,'distant');
          if(!clear(p,c)||groups.some(g=>Math.abs(g.x-x)<Math.min(g.width,size)*.8))continue;
          accepted=clear(q,c)?[p,q]:[p];
        }
      }
      if(accepted){addGroup(accepted,c,`bank-${k}`);groups.push(accepted[0]);}
    }
    // At most two substantial middle props; no pebbles, cones or puddle flecks.
    if(c.total<30&&W>=700&&H>=600) {
      const card=box(document.querySelector('#card'),'card'),barY=c.footer.bottom-c.footer.max;
      for(let n=0;n<2;n++) {
        const size=dh*.65;
        for(let i=0;i<80;i++) {
          const x=W*(.25+rng()*.5)-size/2,y=card.bottom+40+rng()*Math.max(0,barY-card.bottom-80-size);
          const p=make(`${c.type}/${c.type==='cedar'?'moss-rock-wide':'wet-rock-flat'}`,x,y,size,'middle');
          if(y<ground(x,c)||!clear(p,c)||placements.some(q=>distance(p,pad(q,20))<0))continue;
          addGroup([p],c,`middle-${n}`);break;
        }
      }
    }
    geometry.groups={foreground:new Set(placements.filter(p=>p.zone==='foreground').map(p=>p.group)).size,distant:new Set(placements.filter(p=>p.zone==='distant').map(p=>p.group)).size,middle:placements.filter(p=>p.zone==='middle').length};
  }
  function schedule() { cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(place);}); }
  addEventListener('resize',()=>{lastKey='';schedule();});
  async function init() {
    await document.fonts.ready;
    try{footprints=(await (await fetch(new URL('./props/footprints.json?v=20261028-g2p-r2',source))).json()).assets;}catch(_){return;}
    // Natural image sizes and the sample's first layout must both be settled.
    const wait=async()=>{const c=context();if(!c){setTimeout(wait,60);return;}
      {const level=window.DINO_GRADE2.find(v=>v.id===c.id),img=new Image();img.src=new URL('../../assets/'+window.DINO_CHARACTERS[level.factKind].image,location.href).href;try{await img.decode();artAspect=img.naturalWidth/img.naturalHeight;}catch(_){return;}}
      schedule();};wait();
  }
  if(document.readyState==='complete')init();else addEventListener('load',init,{once:true});
  Object.defineProperty(window,'DinoSceneProps',{value:Object.freeze({
    measure(){return {disabled,generation,geometry,level:context()?.id,place:context()?.type,padding:8,
      props:placements.map(p=>{const cover=p.zone==='foreground'?box(document.querySelector('#bar'),'footer-cover'):null;
        const parts=footprint(p,cover),forbidden=actual().filter(b=>!(p.zone==='foreground'&&b.label==='bar')).map(b=>pad(b));
        return {...p,visibleArea:parts.reduce((s,r)=>s+r.width*r.height,0),minDistance:Math.min(...parts.map(r=>Math.min(...forbidden.map(b=>distance(r,b)))))};}),
      forbidden:actual().map(r=>pad(r)),reserved:exclusions.map(r=>({...r}))};}
  })});
})();
