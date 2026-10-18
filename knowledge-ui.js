/* A field kit of manipulatives. Every control changes the visible mathematical model. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const json=value=>esc(JSON.stringify(value));
  const names={circle:'圆形',triangle:'三角形',square:'正方形',rectangle:'长方形',cube:'正方体',sphere:'球',cylinder:'圆柱',cone:'圆锥'};
  const symbols={leaf:'🌿',egg:'🥚',paw:'🐾'};
  const money=n=>{const yuan=Math.floor(n/100),jiao=Math.floor(n%100/10),fen=n%10;return [yuan?`${yuan}元`:'',jiao?`${jiao}角`:'',fen?`${fen}分`:''].join('')||'0元';};
  const frac=(n,d)=>`<span class="k-fraction-value" aria-label="${d}分之${n}"><b>${n}</b><b>${d}</b></span>`;
  const button=(action,value,body,label,extra='',pressed)=>`<button type="button" class="${extra}" data-k-action="${action}" ${value===undefined?'':`data-k-value="${json(value)}"`} data-k-key="${esc(action+':'+(value===undefined?'':JSON.stringify(value)))}" aria-label="${esc(label)}" ${pressed===undefined?'':`aria-pressed="${pressed}"`}>${body}</button>`;
  const adjust=(index,number,label,unit='',step=1)=>`<div class="k-adjust">${button('adjust',{index,delta:-1},'−',`${label}减少${step}${unit}`)}<span><strong>${esc(number)}${unit?`<small>${esc(unit)}</small>`:''}</strong><small>${esc(label)}</small></span>${button('adjust',{index,delta:1},'＋',`${label}增加${step}${unit}`)}</div>`;
  const target=text=>`<div class="k-target">${text}</div>`;
  const note=text=>`<p class="k-note">${text}</p>`;
  const readout=text=>`<div class="k-readout">${text}</div>`;
  const svg=(body,viewBox='0 0 560 320',cls='')=>`<svg class="k-tool-svg ${cls}" viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;
  function shape(kind){
    const start='<svg viewBox="0 0 100 90" aria-hidden="true">',end='</svg>';
    const common='fill="#77aaa0" stroke="#285a49" stroke-width="3" stroke-linejoin="round"';
    const shapes={circle:`<circle cx="50" cy="45" r="34" ${common}/>`,triangle:`<path d="M50 9 91 78 9 78Z" ${common}/>`,square:`<rect x="16" y="11" width="68" height="68" rx="3" ${common}/>`,rectangle:`<rect x="5" y="24" width="90" height="45" rx="3" ${common}/>`,cube:'<path d="M50 4 90 25 90 67 50 88 10 67 10 25Z" fill="#74b9b1" stroke="#285a49" stroke-width="3"/><path d="M10 25 50 47 90 25M50 47V88" fill="none" stroke="#285a49" stroke-width="3"/><path d="M50 47 90 25V67L50 88Z" fill="#3e847c"/>',sphere:'<circle cx="50" cy="45" r="36" fill="#79b5b2" stroke="#285a49" stroke-width="3"/><ellipse cx="50" cy="45" rx="36" ry="12" fill="none" stroke="#d6e7bc" stroke-width="2" stroke-dasharray="4 3"/><ellipse cx="50" cy="45" rx="17" ry="36" fill="none" stroke="#d6e7bc" stroke-width="2"/><ellipse cx="37" cy="28" rx="9" ry="13" fill="#e2edcc88" transform="rotate(35 37 28)"/>',cylinder:'<path d="M17 20V70C17 90 83 90 83 70V20" fill="#77aaa0" stroke="#285a49" stroke-width="3"/><ellipse cx="50" cy="20" rx="33" ry="13" fill="#c6dfb3" stroke="#285a49" stroke-width="3"/>',cone:'<path d="M50 6 88 70Q88 88 50 88Q12 88 12 70Z" fill="#77aaa0" stroke="#285a49" stroke-width="3"/><path d="M12 70Q50 90 88 70" fill="none" stroke="#285a49" stroke-width="3"/><path d="M12 70Q50 51 88 70" fill="none" stroke="#285a49" stroke-width="2" stroke-dasharray="4 3"/>'};
    return start+(shapes[kind]||shapes.circle)+end;
  }
  function clockFace(hour,minute){
    const radians=degrees=>(degrees-90)*Math.PI/180;
    const point=(angle,length)=>`${160+Math.cos(radians(angle))*length},${160+Math.sin(radians(angle))*length}`;
    let body='<circle cx="160" cy="160" r="151" fill="#fff2cb" stroke="#bd975c" stroke-width="9"/><circle cx="160" cy="160" r="135" fill="none" stroke="#c5c49c" stroke-width="2"/>';
    for(let i=0;i<60;i++)body+=`<line x1="${point(i*6,i%5?132:124).split(',')[0]}" y1="${point(i*6,i%5?132:124).split(',')[1]}" x2="${point(i*6,137).split(',')[0]}" y2="${point(i*6,137).split(',')[1]}" stroke="#56734c" stroke-width="${i%5?1.5:4}"/>`;
    for(let i=1;i<=12;i++){const p=point(i*30,108).split(',');body+=`<text x="${p[0]}" y="${Number(p[1])+9}" text-anchor="middle" font-size="27">${i}</text>`;}
    const h=point((hour%12)*30+minute/2,76).split(','),m=point(minute*6,115).split(',');
    body+=`<line class="hour-hand" x1="160" y1="160" x2="${h[0]}" y2="${h[1]}"/><line class="minute-hand" x1="160" y1="160" x2="${m[0]}" y2="${m[1]}"/><circle cx="160" cy="160" r="10" fill="#e8b86d" stroke="#315a43" stroke-width="3"/>`;
    return svg(body,'0 0 320 320','k-clock');
  }
  function angleFace(degrees){
    const point=(d,r)=>[240+Math.cos(d*Math.PI/180)*r,220-Math.sin(d*Math.PI/180)*r];
    let body='<path d="M30 220A210 210 0 0 1 450 220Z" fill="#fff2cbe8" stroke="#c7aa69" stroke-width="5"/>';
    for(let d=0;d<=180;d+=15){const p=point(d,198),q=point(d,184),t=point(d,163);body+=`<path d="M${p}L${q}" stroke="#4b7352" stroke-width="3"/><text x="${t[0]}" y="${t[1]+5}" text-anchor="middle" font-size="16">${d}</text>`;}
    const hand=point(degrees,197),arc=point(degrees,60);
    body+=`<path d="M240 220L300 220A60 60 0 ${degrees>180?1:0} 0 ${arc}Z" fill="#efbd5caa"/><path d="M240 220H447" stroke="#4d7456" stroke-width="7" stroke-linecap="round"/><path d="M240 220L${hand}" stroke="#bb663f" stroke-width="7" stroke-linecap="round"/><circle cx="240" cy="220" r="10" fill="#fff1b8" stroke="#3e6a4a" stroke-width="4"/>`;
    return svg(body,'0 0 480 245');
  }
  function volumeDrawing(c,layers){
    const unit=34,dy=15,dz=28,originX=220,originY=95+layers*dz;
    const project=(x,y,z)=>[originX+(x-y)*unit,originY+(x+y)*dy-z*dz];
    const poly=(points,fill)=>`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="#f9edb6" stroke-width="1.7" stroke-linejoin="round"/>`;
    let body='';
    for(let y=0;y<c.rows;y++)for(let x=0;x<c.cols;x++)body+=poly([project(x,y,0),project(x+1,y,0),project(x+1,y+1,0),project(x,y+1,0)],'#345f4699');
    for(let z=0;z<layers;z++)for(let y=0;y<c.rows;y++)for(let x=0;x<c.cols;x++){
      body+=poly([project(x,y+1,z),project(x+1,y+1,z),project(x+1,y+1,z+1),project(x,y+1,z+1)],'#be975e');
      body+=poly([project(x+1,y,z),project(x+1,y+1,z),project(x+1,y+1,z+1),project(x+1,y,z+1)],'#90ad82');
      body+=poly([project(x,y,z+1),project(x+1,y,z+1),project(x+1,y+1,z+1),project(x,y+1,z+1)],'#efd493');
    }
    return svg(body,`0 40 500 ${Math.max(220,originY+130)}`,'k-volume-svg');
  }
  window.createKnowledgeView=({mount,characters,onAction})=>{
    const root=document.createElement('section');root.className='challenge-play knowledge-play';root.hidden=true;root.setAttribute('aria-label','恐龙知识探险');mount.appendChild(root);
    let currentState=null,activeSlot=0,previousId=null;
    const picture=(kind,alt='')=>`<img src="./assets/${esc(characters[kind]?.image||characters.trike?.image)}" alt="${esc(alt)}" draggable="false">`;
    const symbol=value=>symbols[value]||esc(value);
    const handle=event=>{
      const el=event.target.closest('[data-k-action]');if(!el||el.disabled||!currentState||currentState.complete)return;
      if(event.type==='keydown'){if(el.tagName==='BUTTON'||!['Enter',' '].includes(event.key))return;event.preventDefault();}
      const action=el.dataset.kAction,value=el.dataset.kValue===undefined?undefined:JSON.parse(el.dataset.kValue);
      if(action==='slot'){activeSlot=value;render(currentState);return;}
      onAction(action,value);
    };
    root.addEventListener('click',handle);root.addEventListener('keydown',handle);
    function grid(s,c,{dense=false,fixed=[],symmetry=false}={}){
      const selected=new Set(s.selected),sources=new Set(fixed),count=c.rows*c.cols;
      const tiles=Array.from({length:count},(_,i)=>{
        const chosen=selected.has(i),source=sources.has(i),col=i%c.cols,fixedHalf=symmetry&&col<c.axis;
        const cls=`k-tile ${chosen?'selected':''} ${source?'fixed':''} ${symmetry&&col===c.axis-1?'axis-left':''} ${symmetry&&col===c.axis?'axis-right':''}`;
        if(fixedHalf||dense)return `<span class="${cls}" aria-hidden="true">${source?'✦':dense?'':chosen?'✓':''}</span>`;
        return button('toggle',i,chosen?'✓':'',`${symmetry?'右侧':'第'}${Math.floor(i/c.cols)+1}行第${col+1}格`,cls,chosen);
      }).join('');
      return `<div class="k-tile-board ${dense?'dense':''}" style="--k-cols:${c.cols};--k-board-width:${Math.min(650,c.cols*66)}px" ${dense?`role="img" aria-label="${count}格中涂了${s.selected.length}格"`:''}>${tiles}</div>`;
    }
    function fractionTool(s,c){
      const n=s.selected.length,selected=new Set(s.selected),large=c.denominator===100,f=s.level.family;
      const header=f==='percent'?`涂出 <b>${c.numerator}%</b>`:f==='decimal'?`涂出 <b>${c.numerator/c.denominator}</b>`:`选出 ${frac(c.numerator,c.denominator)}`;
      let visual;
      if(c.partition==='circle'&&c.denominator<=8){
        const r=125,cx=150,cy=150;
        const slices=Array.from({length:c.denominator},(_,i)=>{
          const a=(i/c.denominator*2-.5)*Math.PI,b=((i+1)/c.denominator*2-.5)*Math.PI;
          const d=`M${cx} ${cy}L${cx+Math.cos(a)*r} ${cy+Math.sin(a)*r}A${r} ${r} 0 ${b-a>Math.PI?1:0} 1 ${cx+Math.cos(b)*r} ${cy+Math.sin(b)*r}Z`;
          return `<path d="${d}" class="k-sector ${selected.has(i)?'selected':''}" fill="${selected.has(i)?'#f2bd64':'#9ec1a0'}" stroke="#fff1bd" stroke-width="4" role="button" tabindex="0" data-k-action="toggle" data-k-value="${i}" data-k-key="toggle:${i}" aria-label="第${i+1}份点心" aria-pressed="${selected.has(i)}"/>`;
        }).join('');
        visual=`<svg class="k-tool-svg k-fraction-circle" viewBox="0 0 300 300" aria-label="一整块点心平均分成${c.denominator}份">${slices}</svg>`;
      }else{
        const cols=large?10:c.denominator%5===0?5:c.denominator%4===0?4:c.denominator%3===0?3:2;
        visual=grid(s,{rows:c.denominator/cols,cols},{dense:large});
      }
      const fillControls=large?`<div class="k-percent-actions">${button('fill',{count:-1},'− 1 格','擦掉一格')}${button('fill',{count:1},'＋ 1 格','涂一格')}${button('fill',{count:-10},'− 10 格','擦掉十格')}${button('fill',{count:10},'＋ 10 格','涂一行十格')}</div>`:'';
      const current=f==='percent'?`<b>${n}%</b>`:f==='decimal'?`<b>${n/c.denominator}</b>`:frac(n,c.denominator);
      return target(header)+visual+fillControls+readout(`${current}<small>${n} / ${c.denominator} 份</small>`)+note(f==='decimal'?`一整块是 1；一小格是 ${1/c.denominator}。`:large?'一整块是 1；一小格是 1%':c.partition==='circle'?'一整块点心是 1，点一份，涂一份。':'一整块是 1，每个小格同样大。');
    }
    function tool(s){
      const c=s.level.config,v=s.values||[],sel=new Set(s.selected||[]),family=s.level.family;
      switch(family){
        case 'place':{
          const labels={1:'个位',10:'十位',100:'百位',1000:'千位',10000:'万位'};
          const total=c.places.reduce((sum,place,i)=>sum+place*v[i],0);
          return target(`搭出 <b>${c.target}</b>`)+`<div class="k-place-row ${c.places.length>3?'many':''}">${c.places.map((place,i)=>`<div class="k-place-column"><div class="k-place-beads"><div class="k-unit-stack">${Array.from({length:v[i]},()=>`<i class="k-bead ${place===10?'ten':place>=100?'hundred':''}" aria-hidden="true"></i>`).join('')}</div></div>${adjust(i,v[i],labels[place]||`${place}位`)}${note(`1 颗＝${place}`)}</div>`).join('')}</div>`+readout(`<b>${total}</b>`);
        }
        case 'shape':return target(`找到所有 <b>${esc(c.targetLabel)}</b>`)+`<div class="k-shape-field">${c.items.map((item,i)=>button('toggle',i,shape(item),`第${i+1}块，${names[item]||item}`,`k-shape-stone ${sel.has(i)?'selected':''}`,sel.has(i))).join('')}</div>`+note(`已点亮 ${sel.size} 个 · 再点一次可取消`);
        case 'pattern':{
          const blanks=new Map(c.blanks.map((pos,i)=>[pos,i]));activeSlot=Math.min(activeSlot,c.blanks.length-1);
          return target(`把小路接下去 <small>${esc(c.label)}</small>`)+`<div class="k-pattern-trail">${c.sequence.map((item,pos)=>{const slot=blanks.get(pos);return slot===undefined?`<span class="k-pattern-piece">${symbol(item)}</span>`:button('slot',slot,v[slot]===null||v[slot]===undefined?'?':symbol(v[slot]),`第${slot+1}个空位`,`k-pattern-piece gap ${activeSlot===slot?'selected':''}`,activeSlot===slot);}).join('')}</div>`+note(`先点空位，再选图案 · 正在填第 ${activeSlot+1} 个空位`)+`<div class="k-choices">${c.options.map(item=>button('set',{index:activeSlot,value:item},symbol(item),`在第${activeSlot+1}个空位放${symbols[item]?({leaf:'树叶',egg:'蛋',paw:'脚印'}[item]):item}`,`k-choice ${v[activeSlot]===item?'selected':''}`,v[activeSlot]===item)).join('')}</div>`;
        }
        case 'clock':{
          const min=v[1]*c.minuteStep,time=`${v[0]}:${String(min).padStart(2,'0')}`;
          return target(c.elapsed?`<b>${c.elapsed.hour}:${String(c.elapsed.minute).padStart(2,'0')}</b> 出发，经过 <b>${c.elapsed.duration}</b> 分钟`:`拨到 <b>${c.hour}:${String(c.minute).padStart(2,'0')}</b>`)+clockFace(v[0],min)+`<div class="k-controls">${adjust(0,v[0],'短针 · 小时','时')}${adjust(1,String(min).padStart(2,'0'),'长针 · 分钟','分',c.minuteStep)}</div>`+readout(time);
        }
        case 'money':{
          const total=c.denominations.reduce((sum,coin,i)=>sum+coin*v[i],0);
          return target(`食物需要 <b>${money(c.target)}</b>`)+`<div class="k-wallet">${c.denominations.map((coin,i)=>`<div class="k-coin-pile"><div class="k-coins">${Array.from({length:Math.max(1,v[i])},()=>`<span class="k-coin ${!v[i]?'empty':''}" aria-hidden="true">${money(coin)}</span>`).join('')}</div>${adjust(i,v[i],money(coin),'枚')}</div>`).join('')}</div>`+readout(`已经凑了 <b>${money(total)}</b>`)+note('点 ＋ 拿一枚；点 − 放回一枚。');
        }
        case 'measure':{
          const width=600,scale=540/c.max,x=n=>30+n*scale;
          let ticks='';for(let n=0;n<=c.max;n++)ticks+=`<path d="M${x(n)} 115V${n%5===0?165:150}" stroke="#53663e" stroke-width="2"/><text x="${x(n)}" y="187" text-anchor="middle" font-size="18">${n}</text>`;
          const branch=`<path d="M${x(c.start)} 65L${x(c.end)} 65" stroke="#775431" stroke-width="16" stroke-linecap="butt"/><path d="M${x(c.start)+20} 62q20-25 35-12" fill="none" stroke="#6d783f" stroke-width="5"/><path d="M${x(c.start)} 80V115" stroke="#445a36" stroke-width="2" stroke-dasharray="5 4"/>`;
          const marker=`<path d="M${x(v[0])} 20V114" stroke="#eeb956" stroke-width="5"/><path d="M${x(v[0])-11} 96L${x(v[0])} 114L${x(v[0])+11} 96" fill="none" stroke="#bc7039" stroke-width="5"/>`;
          return target('把金色游标移到树枝末端')+`<div class="k-ruler"><svg viewBox="0 0 ${width} 215" aria-label="树枝两端与尺子刻度"><rect x="13" y="113" width="574" height="91" rx="9" fill="#f4df9f" stroke="#b89c61" stroke-width="3"/>${ticks}${branch}${marker}</svg></div>`+`<div class="k-controls">${adjust(0,v[0],'终点刻度',c.unit)}</div>`+readout(`${v[0]} − ${c.start} ＝ <b>${v[0]-c.start}</b><small>${esc(c.unit)}</small>`);
        }
        case 'fraction':case 'decimal':case 'percent':return fractionTool(s,c);
        case 'area':return target(`铺满 <b>${c.rows} × ${c.cols}</b> 的营地`)+grid(s,c)+readout(`已铺 <b>${s.selected.length}</b><small>${esc(c.unit)}</small>`)+note('每一小格是 1 平方厘米，点空格铺一块。');
        case 'perimeter':{
          const lengths=[c.width,c.height,c.width,c.height],edges=['top','right','bottom','left'],sum=[...sel].reduce((n,i)=>n+lengths[i],0);
          return target(`沿边走一圈 <small>长 ${c.width} 厘米 · 宽 ${c.height} 厘米</small>`)+`<div class="k-perimeter-board" style="--k-fence-width:${Math.min(480,330*c.width/c.height)}px;aspect-ratio:${c.width}/${c.height}"><div class="k-perimeter-grass"></div>${picture(s.level.factKind)}${edges.map((edge,i)=>button('toggle',i,`${sel.has(i)?'✓ ':''}${lengths[i]} ${c.unit}`,`沿${['上','右','下','左'][i]}边走${lengths[i]}${c.unit}`,`k-fence ${edge} ${sel.has(i)?'selected':''}`,sel.has(i))).join('')}</div>`+readout(`已走 <b>${sum}</b><small>厘米</small>`)+note('点四条边，边边相接，回到起点。');
        }
        case 'angle':return target(`张开 <b>${c.target}°</b> 的角`)+angleFace(v[0])+`<div class="k-controls">${adjust(0,v[0],'转动指针','度',c.step)}</div>`+note('从右侧 0° 刻度起，观察两条边的张角。');
        case 'symmetry':return target('沿中线，补出另一半翅膀')+grid(s,c,{fixed:c.source,symmetry:true})+note('右侧点一格；两边到中线的距离一样。');
        case 'chart':{
          let chart='<rect x="42" y="12" width="425" height="220" rx="5" fill="#f9edc7d9"/>';
          for(let n=0;n<=c.max;n++){const y=232-n/c.max*200;chart+=`<line x1="42" x2="467" y1="${y}" y2="${y}" stroke="${n?'#b6c298':'#496c48'}" stroke-width="${n?1.2:3}"/><text x="32" y="${y+6}" text-anchor="end" font-size="19" class="k-white">${n*c.unit}</text>`;}
          c.labels.forEach((label,i)=>{const x=78+i*136,h=v[i]/c.max*200;chart+=`<rect x="${x}" y="${232-h}" width="78" height="${Math.max(2,h)}" rx="5" fill="${['#599c85','#dfae54','#6facc0'][i%3]}" stroke="#315b43" stroke-width="2"/><text x="${x+39}" y="${222-h}" text-anchor="middle" font-size="25">${v[i]*c.unit}</text><text x="${x+39}" y="264" text-anchor="middle" font-size="23" class="k-white">${esc(label)}</text>`;});
          return target(`记录恐龙数量 <small>一格表示 ${c.unit} 只</small>`)+`<div class="k-chart-records">${c.labels.map((label,i)=>`<div>${picture(c.kinds[i])}<span>${esc(label)} <b>${c.counts[i]*c.unit}</b> 只</span></div>`).join('')}</div>`+svg(chart,'0 0 480 280','k-bar-chart')+`<div class="k-chart-controls" style="--k-bars:${c.labels.length}">${c.labels.map((label,i)=>adjust(i,v[i]*c.unit,label,'只',c.unit)).join('')}</div>`+note('按观察记录，把每根柱子搭到相应的数量。');
        }
        case 'coordinate':{
          const cells=[];for(let row=c.rows;row>=1;row--)for(let col=1;col<=c.cols;col++){const here=v[0]===col&&v[1]===row,dest=c.target[0]===col&&c.target[1]===row;cells.push(`<span class="k-map-cell ${dest?'target':''}">${here?picture(s.level.factKind):''}<span>(${col},${row})</span></span>`);}
          return target(`走到 <b>(${c.target.join('，')})</b>`)+`<div class="k-coordinate-wrap"><div class="k-map" style="--k-cols:${c.cols}" role="img" aria-label="恐龙现在在第${v[0]}列第${v[1]}行">${cells.join('')}</div><div class="k-nav">${[['up','↑','向上走一行'],['left','←','向左走一列'],['down','↓','向下走一行'],['right','→','向右走一列']].map(([direction,arrow,label])=>button('move',direction,arrow,label,direction)).join('')}</div></div>`+readout(`<b>(${v[0]}，${v[1]})</b>`)+note('先看列，再看行。左下角是 (1，1)。');
        }
        case 'volume':return target(`搭出 <b>${c.layers}</b> 层 <small>每层 ${c.rows} 行 × ${c.cols} 块</small>`)+volumeDrawing(c,v[0])+`<div class="k-controls">${adjust(0,v[0],'积木层数','层')}</div>`+readout(`${c.rows} × ${c.cols} × ${v[0]} ＝ <b>${c.rows*c.cols*v[0]}</b><small>${esc(c.unit)}</small>`)+note('每一小块是 1 立方厘米；加一层，看看体积变化。');
        case 'balance':{
          const left=c.coefficient*v[0]+c.constant,diff=Math.max(-12,Math.min(12,(left-c.total)*2)),leftY=90+diff,rightY=90-diff;
          const balance=`<path d="M280 94 235 235H325Z" fill="#83a78b" stroke="#345a45" stroke-width="4"/><path d="M225 236H335" stroke="#d1af6b" stroke-width="13" stroke-linecap="round"/><line x1="100" y1="${leftY}" x2="460" y2="${rightY}" stroke="#b78e53" stroke-width="12" stroke-linecap="round"/><circle cx="280" cy="90" r="11" fill="#fff1bc" stroke="#315d44" stroke-width="4"/><path d="M100 ${leftY}L45 ${leftY+90}H155Z" fill="none" stroke="#ecdaa0" stroke-width="3"/><path d="M460 ${rightY}L405 ${rightY+90}H515Z" fill="none" stroke="#ecdaa0" stroke-width="3"/><path d="M40 ${leftY+90}Q100 ${leftY+125}160 ${leftY+90}Z" fill="#749c85" stroke="#ffe6a7" stroke-width="3"/><path d="M400 ${rightY+90}Q460 ${rightY+125}520 ${rightY+90}Z" fill="#749c85" stroke="#ffe6a7" stroke-width="3"/><text x="100" y="${leftY+80}" text-anchor="middle" font-size="29">${left}</text><text x="460" y="${rightY+80}" text-anchor="middle" font-size="29">${c.total}</text>`;
          const weights=`<div class="k-balance-contents"><div class="k-weight-pile">${Array.from({length:c.coefficient},()=>`<span class="k-weight unknown" aria-label="问号盒子里有${v[0]}块">${v[0]}</span>`).join('')}${c.constant?`<span class="k-weight" aria-label="另外${c.constant}块">＋${c.constant}</span>`:''}</div><div class="k-weight-pile"><span class="k-weight" aria-label="右边${c.total}块">${c.total}</span></div></div>`;
          return target(`${c.coefficient===1?'':c.coefficient+' × '}<b>?</b>${c.constant?' ＋ '+c.constant:''} ＝ ${c.total}`)+weights+svg(balance,'0 45 560 215','k-balance-svg')+`<div class="k-controls">${adjust(0,v[0],'每个问号盒子','块')}</div>`+readout(`${left===c.total?'两边一样重':'让两边一样重'} <b>${left} ${left===c.total?'＝':left>c.total?'＞':'＜'} ${c.total}</b>`)+note(`相同的 ${c.coefficient} 个盒子，里面都放 ${v[0]} 块${c.constant?'，再加 '+c.constant+' 块':''}。`);
        }
        case 'ratio':return target(`绿叶 : 果子 ＝ <b>${c.a} : ${c.b}</b><small>一共 ${(c.a+c.b)*c.scale} 份</small>`)+`<div class="k-ratio-pools">${v.map((n,i)=>`<div class="k-ratio-pool" aria-label="${c.labels[i]}${n}份">${Array.from({length:n},()=>`<span class="k-feed" aria-hidden="true">${i?'🍒':'🌿'}</span>`).join('')||'<span class="k-feed" aria-hidden="true">＋</span>'}</div>`).join('')}</div><div class="k-controls">${adjust(0,v[0],c.labels[0],'份')}${adjust(1,v[1],c.labels[1],'份')}</div>`+readout(`<b>${v[0]} : ${v[1]}</b><small>共 ${v[0]+v[1]} 份</small>`);
        case 'negative':{
          const range=c.max-c.min,percent=(v[0]-c.min)/range*100,labels=[];for(let n=c.min;n<=c.max;n+=5){const p=(n-c.min)/range*100;labels.push(`<span class="k-thermo-label" style="bottom:calc(${p}% + ${35-p*.4}px)">${n>0?'+':''}${n}</span>`);}
          return target(`调到 <b>${c.target<0?'零下 '+Math.abs(c.target):'零上 '+c.target}℃</b>`)+`<div class="k-thermo-wrap"><div class="k-thermometer" role="img" aria-label="温度计显示${v[0]}摄氏度"><div class="k-thermo-tube"><div class="k-thermo-fill" style="height:${percent}%"></div></div><div class="k-thermo-bulb"></div>${labels.join('')}</div><div class="k-temperature"><b>${v[0]>0?'+':''}${v[0]}</b>℃</div></div><div class="k-controls">${adjust(0,v[0],'营地温度','℃')}</div>`+note('零上用正数，零下用负数。');
        }
        default:return target('继续观察，动手试试看。');
      }
    }
    function render(s){
      root.hidden=!s;currentState=s;if(!s){previousId=null;return;}
      const same=previousId===s.level.id;if(!same)activeSlot=0;
      const stageScroll=same?(root.querySelector?.('.k-stage')?.scrollTop||0):0;
      const focused=root.contains?.(document.activeElement)?document.activeElement?.dataset?.kKey:null;
      root.dataset.family=s.level.family;root.dataset.pieces=String(s.level.config.denominator||0);root.classList.toggle('challenge-error',!!s.error);
      root.innerHTML=`<div class="k-stage"><div class="k-expedition"><figure class="k-companion">${picture(s.level.factKind)}<figcaption>${esc(characters[s.level.factKind]?.name||'恐龙伙伴')}陪你探险</figcaption></figure><div class="k-instrument">${tool(s)}</div></div></div><footer class="challenge-footer k-footer"><p class="challenge-feedback" role="status" aria-live="polite">${s.error?'<b aria-hidden="true">✕</b> ':''}${esc(s.feedback)}</p><div class="challenge-controls">${button('undo',undefined,'↶','撤回一步','k-undo')}${button('check',undefined,'✓ 检查一下','检查我的操作','challenge-check')}${button('restart',undefined,'↻','重玩本关')}</div></footer>`;
      const undo=root.querySelector?.('.k-undo');if(undo)undo.disabled=!s.history?.length;
      const stage=root.querySelector?.('.k-stage');if(stage)stage.scrollTop=stageScroll;
      if(focused){const next=Array.from(root.querySelectorAll?.('[data-k-key]')||[]).find(el=>el.dataset.kKey===focused);next?.focus?.({preventScroll:true});}
      previousId=s.level.id;
    }
    return {render};
  };
})();
