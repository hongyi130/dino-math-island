/* Pure, bounded manipulative states for knowledge-topic activities. */
(() => {
  'use strict';
  const base=window.DinoChallengeEngine;
  if(!base) throw new Error('Load challenge-engine.js before knowledge-engine.js.');
  const families=new Set(['place','shape','pattern','clock','money','measure','fraction','area','perimeter','decimal','angle','symmetry','chart','coordinate','volume','balance','ratio','percent','negative']);
  const handles=level=>level?.challengeType==='knowledge';
  const int=n=>typeof n==='number'&&Number.isSafeInteger(n);
  const positive=n=>int(n)&&n>0;
  const unchanged=()=>({changed:false,complete:false});
  const clone=x=>JSON.parse(JSON.stringify(x));
  const snapshot=s=>clone(Object.fromEntries(Object.entries(s).filter(([key])=>key!=='level'&&key!=='history')));
  const indices=n=>Array.from({length:n},(_,i)=>i);
  const sameSet=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===a.length&&a.every(n=>int(n)&&b.includes(n));
  const gridFamilies=new Set(['fraction','decimal','percent','area']);
  const cells=l=>l.family==='area'?l.config.rows*l.config.cols:l.config.denominator;
  const symmetryTarget=c=>c.source.map(index=>Math.floor(index/c.cols)*c.cols+c.cols-1-index%c.cols);
  const asTime=(h,m)=>`${h}:${String(m).padStart(2,'0')}`;
  const money=n=>`${Math.floor(n/100)} 元${n%100 ? ' '+Math.floor(n%100/10)+' 角' : ''}`;
  function validate(level){
    const f=level.family,c=level.config;
    if(!families.has(f)||!c||typeof c!=='object') throw new RangeError('Unknown knowledge activity.');
    let valid=true;
    if(f==='place') valid=Array.isArray(c.places)&&c.places.length>0&&c.places.every(positive)&&c.places.every((p,i)=>p===10**(c.places.length-i-1))&&int(c.target)&&c.target>0&&c.target<10**c.places.length;
    else if(f==='shape') valid=Array.isArray(c.items)&&c.items.length>0&&c.items.includes(c.target);
    else if(f==='pattern') valid=Array.isArray(c.sequence)&&Array.isArray(c.blanks)&&c.blanks.length>0&&new Set(c.blanks).size===c.blanks.length&&Array.isArray(c.options)&&c.options.length>1&&c.options.every(x=>int(x)||typeof x==='string')&&c.blanks.every(i=>int(i)&&i>=0&&i<c.sequence.length&&c.options.includes(c.sequence[i]));
    else if(f==='clock') valid=int(c.hour)&&c.hour>=1&&c.hour<=12&&int(c.minute)&&c.minute>=0&&c.minute<60&&positive(c.minuteStep)&&60%c.minuteStep===0&&c.minute%c.minuteStep===0;
    else if(f==='money') valid=positive(c.target)&&Array.isArray(c.denominations)&&c.denominations.length>0&&c.denominations.every(positive)&&c.target%c.denominations.at(-1)===0;
    else if(f==='measure') valid=int(c.start)&&int(c.end)&&positive(c.max)&&c.start>=0&&c.end>c.start&&c.end<=c.max;
    else if(['fraction','decimal','percent'].includes(f)) valid=positive(c.denominator)&&c.denominator<=100&&positive(c.numerator)&&c.numerator<c.denominator;
    else if(f==='area') valid=positive(c.rows)&&positive(c.cols)&&c.rows*c.cols<=100;
    else if(f==='perimeter') valid=positive(c.width)&&positive(c.height);
    else if(f==='angle') valid=positive(c.step)&&180%c.step===0&&positive(c.target)&&c.target<=180&&c.target%c.step===0;
    else if(f==='symmetry') valid=positive(c.rows)&&positive(c.cols)&&c.cols%2===0&&c.axis===c.cols/2&&Array.isArray(c.source)&&c.source.length>0&&new Set(c.source).size===c.source.length&&c.source.every(i=>int(i)&&i>=0&&i<c.rows*c.cols&&i%c.cols<c.axis);
    else if(f==='chart') valid=Array.isArray(c.counts)&&c.counts.length>0&&Array.isArray(c.labels)&&c.counts.length===c.labels.length&&positive(c.max)&&positive(c.unit)&&c.counts.every(n=>int(n)&&n>=0&&n<=c.max);
    else if(f==='coordinate') valid=positive(c.rows)&&positive(c.cols)&&Array.isArray(c.target)&&c.target.length===2&&c.target.every((n,i)=>int(n)&&n>=1&&n<=(i===0?c.cols:c.rows))&&c.target.some(n=>n>1);
    else if(f==='volume') valid=positive(c.rows)&&positive(c.cols)&&positive(c.layers)&&c.layers<=6;
    else if(f==='balance') valid=positive(c.coefficient)&&int(c.constant)&&c.constant>=0&&positive(c.total)&&(c.total-c.constant)%c.coefficient===0&&(c.total-c.constant)/c.coefficient>0&&(c.total-c.constant)/c.coefficient<=20;
    else if(f==='ratio') valid=positive(c.a)&&positive(c.b)&&positive(c.scale)&&c.a*c.scale<=30&&c.b*c.scale<=30;
    else if(f==='negative') valid=int(c.target)&&int(c.min)&&int(c.max)&&c.min<0&&c.max>0&&c.target!==0&&c.target>=c.min&&c.target<=c.max;
    if(!valid) throw new RangeError(`Invalid ${f} activity configuration.`);
  }
  function create(level){
    if(!handles(level)) return base.create(level);
    validate(level);
    const f=level.family,c=level.config;
    let values=[];
    if(f==='place') values=c.places.map(()=>0);
    else if(f==='pattern') values=c.blanks.map(()=>null);
    else if(f==='clock') values=[12,0];
    else if(f==='money') values=c.denominations.map(()=>0);
    else if(f==='measure') values=[c.start];
    else if(f==='chart') values=c.counts.map(()=>0);
    else if(f==='coordinate') values=[1,1];
    else if(f==='ratio') values=[0,0];
    else if(['angle','volume','balance','negative'].includes(f)) values=[0];
    return {level,values,selected:[],history:[],touched:0,error:false,complete:false,phase:'build',feedback:level.guidance};
  }
  function validValues(s,length,min,max){return Array.isArray(s.values)&&s.values.length===length&&s.values.every((n,i)=>int(n)&&n>=(typeof min==='function'?min(i):min)&&n<=(typeof max==='function'?max(i):max));}
  function correct(s){
    if(!handles(s.level)) return base.correct(s);
    const f=s.level.family,c=s.level.config,v=s.values;
    if(!(s.touched>0)) return false;
    switch(f){
      case 'place': return validValues(s,c.places.length,0,9)&&v.reduce((sum,n,i)=>sum+n*c.places[i],0)===c.target;
      case 'shape': return sameSet(s.selected,c.items.flatMap((item,i)=>item===c.target?[i]:[]));
      case 'pattern': return Array.isArray(v)&&v.length===c.blanks.length&&v.every((n,i)=>n===c.sequence[c.blanks[i]]);
      case 'clock': return validValues(s,2,i=>i===0?1:0,i=>i===0?12:60/c.minuteStep-1)&&v[0]===c.hour&&v[1]*c.minuteStep===c.minute;
      case 'money': return validValues(s,c.denominations.length,0,20)&&v.reduce((sum,n,i)=>sum+n*c.denominations[i],0)===c.target;
      case 'measure': return validValues(s,1,c.start,c.max)&&v[0]===c.end;
      case 'fraction':case 'decimal':case 'percent': return Array.isArray(s.selected)&&s.selected.length===c.numerator&&new Set(s.selected).size===s.selected.length&&s.selected.every(n=>int(n)&&n>=0&&n<c.denominator);
      case 'area':return sameSet(s.selected,indices(c.rows*c.cols));
      case 'perimeter':return sameSet(s.selected,[0,1,2,3]);
      case 'angle':return validValues(s,1,0,180)&&v[0]===c.target;
      case 'symmetry':return sameSet(s.selected,symmetryTarget(c));
      case 'chart':return validValues(s,c.counts.length,0,c.max)&&v.every((n,i)=>n===c.counts[i]);
      case 'coordinate':return validValues(s,2,1,i=>i===0?c.cols:c.rows)&&v.every((n,i)=>n===c.target[i]);
      case 'volume':return validValues(s,1,0,6)&&v[0]===c.layers;
      case 'balance':return validValues(s,1,0,20)&&v[0]*c.coefficient+c.constant===c.total;
      case 'ratio':return validValues(s,2,0,30)&&v[0]===c.a*c.scale&&v[1]===c.b*c.scale;
      case 'negative':return validValues(s,1,c.min,c.max)&&v[0]===c.target;
      default:return false;
    }
  }
  const hints={
    place:'还没搭出目标数。看看每一位上的珠子，十位的一颗表示十哦。',shape:'还有形状没找对。只点亮题目要找的那一种，再检查一遍。',
    pattern:'小路还没有接上规律。看看前面怎样重复或变化，再改改空位。',clock:'时钟还没拨对。先看时针，再看分针；跨过整点时，小时也会变。',
    money:'钱还没凑对。数一数元和角，多了拿回来，少了再放一点。',measure:'尺子的终点还没对齐。移到树枝的另一端，再看看起点和终点的刻度。',
    fraction:'涂的份数还不对。分母是总份数，分子是要涂的份数。',decimal:'小数还没有表示对。每小格表示整个图形的一份，数数涂了几份。',percent:'百分数还没涂对。一百格里，涂几格就是百分之几。',
    area:'营地还没铺满。把空格铺上，一块地砖占一平方厘米。',perimeter:'还没走完一圈。点亮营地的每一条边，别漏掉。',
    angle:'这个角还没摆对。看从零开始的刻度，继续转动指针。',symmetry:'两边还不对称。找到同一行，再数一数离中线几格。',
    chart:'统计图还有柱子没对上。对照观察记录，再看一格代表几只。',coordinate:'还没到营地。第一个数看列，第二个数看行，再走几步。',
    volume:'层数还没搭对。看看每层的小积木，再加一层或拿走一层。',balance:'天平还没平。两边要一样重，调整每个问号盒子里的积木。',
    ratio:'食物还没按比例配好。既要份数比正确，也要符合一共要准备的份数。',negative:'温度还没调对。零上在零的上面，零下在零的下面。'
  };
  function reject(s,text){s.error=true;s.feedback=text;return {changed:false,wrong:true,complete:false,phase:s.phase};}
  function act(s,action,value){
    if(!handles(s.level)) return base.act(s,action,value);
    if(s.complete) return {changed:false,complete:true,phase:s.phase};
    const f=s.level.family,c=s.level.config;
    if(action==='check'){
      if(!correct(s)) return reject(s,hints[f]);
      s.error=false;s.complete=true;s.phase='complete';s.feedback=s.level.cheer;
      return {changed:true,complete:true,phase:s.phase};
    }
    if(action==='undo'){
      const previous=s.history.pop();if(!previous) return unchanged();
      Object.assign(s,previous);s.error=false;s.feedback=s.level.guidance;
      return {changed:true,complete:false,phase:s.phase};
    }
    const before=snapshot(s),v=[...s.values];let selected=[...s.selected];
    if(action==='adjust'){
      if(!value||!int(value.index)||![-1,1].includes(value.delta)) return unchanged();
      const i=value.index,d=value.delta;if(i<0||i>=v.length) return unchanged();
      let min=0,max=0,step=1,wrap=false;
      if(f==='place') max=9;
      else if(f==='clock'){min=i===0?1:0;max=i===0?12:60/c.minuteStep-1;wrap=true;}
      else if(f==='money') max=20;
      else if(f==='measure'){min=c.start;max=c.max;}
      else if(f==='angle'){max=180;step=c.step;}
      else if(f==='chart') max=c.max;
      else if(f==='volume') max=6;
      else if(f==='balance') max=20;
      else if(f==='ratio') max=30;
      else if(f==='negative'){min=c.min;max=c.max;}
      else return unchanged();
      let next=v[i]+d*step;
      if(wrap){
        if(f==='clock'&&i===1&&(next<min||next>max)){
          const hour=v[0]+(next<min?-1:1);v[0]=hour<1?12:hour>12?1:hour;
        }
        next=next<min?max:next>max?min:next;
      }
      if(next<min||next>max||next===v[i]) return unchanged();
      v[i]=next;
    }else if(action==='toggle'){
      if(!int(value)||value<0) return unchanged();
      const count=gridFamilies.has(f)?cells(s.level):f==='shape'?c.items.length:f==='perimeter'?4:f==='symmetry'?c.rows*c.cols:0;
      if(value>=count||(f==='symmetry'&&value%c.cols<c.axis)) return unchanged();
      selected=selected.includes(value)?selected.filter(n=>n!==value):[...selected,value];
    }else if(action==='fill'){
      if(!['decimal','percent','area'].includes(f)||!value||![-10,-1,1,10].includes(value.count)) return unchanged();
      const count=cells(s.level);
      if(value.count>0){
        const available=indices(count).filter(i=>!selected.includes(i)).slice(0,value.count);
        if(!available.length) return unchanged();selected.push(...available);
      }else{
        if(!selected.length) return unchanged();
        selected.sort((a,b)=>a-b);selected.splice(Math.max(0,selected.length+value.count));
      }
    }else if(action==='set'){
      if(f!=='pattern'||!value||!int(value.index)||value.index<0||value.index>=v.length||!c.options.includes(value.value)||v[value.index]===value.value) return unchanged();
      v[value.index]=value.value;
    }else if(action==='move'){
      if(f!=='coordinate'||!['left','right','up','down'].includes(value)) return unchanged();
      const i=value==='left'||value==='right'?0:1,d=value==='left'||value==='down'?-1:1;
      const next=v[i]+d;if(next<1||next>(i===0?c.cols:c.rows)) return unchanged();v[i]=next;
    }else return unchanged();
    s.history.push(before);s.values=v;s.selected=selected.sort((a,b)=>a-b);s.touched+=1;s.error=false;
    s.feedback='看看教具是否符合任务，想好了再点 ✓ 检查。';
    return {changed:true,complete:false,phase:s.phase};
  }
  function equation(s,reveal=false){
    if(!handles(s.level)) return base.equation(s,reveal);
    const f=s.level.family,c=s.level.config;
    switch(f){
      case 'place': return reveal?`${c.target} = ${c.places.map((p,i)=>`${Math.floor(c.target/p)%10}×${p}`).join(' + ')}`:`搭出 ${c.target}`;
      case 'shape': return reveal?`找到 ${c.items.filter(x=>x===c.target).length} 个${c.targetLabel}`:`找出所有${c.targetLabel}`;
      case 'pattern': return reveal?'规律接好啦！':c.label;
      case 'clock': return reveal?asTime(c.hour,c.minute):c.elapsed?`${asTime(c.elapsed.hour,c.elapsed.minute)} 过 ${c.elapsed.duration} 分钟`:`拨到 ${asTime(c.hour,c.minute)}`;
      case 'money': return `配出 ${money(c.target)}`;
      case 'measure': return `长 ${reveal?c.end-c.start:'?'} ${c.unit}`;
      case 'fraction': return `${c.numerator} / ${c.denominator}`;
      case 'decimal': return reveal?`${c.numerator}/${c.denominator} = ${c.numerator/c.denominator}`:`表示 ${c.numerator/c.denominator}`;
      case 'percent': return reveal?`${c.numerator}/100 = ${c.numerator}%`:`表示 ${c.numerator}%`;
      case 'area': return reveal?`${c.rows} × ${c.cols} = ${c.rows*c.cols} ${c.unit}`:`${c.rows} 行 · 每行 ${c.cols} 格`;
      case 'perimeter': return reveal?`${c.width} + ${c.height} + ${c.width} + ${c.height} = ${2*(c.width+c.height)} ${c.unit}`:'围着营地走一圈';
      case 'angle': return `${c.target}°${reveal?' · '+(c.target<90?'锐角':c.target===90?'直角':c.target<180?'钝角':'平角'):''}`;
      case 'symmetry': return reveal?'两边到对称轴的距离相等':'补全对称的翅膀';
      case 'chart': return reveal?c.counts.map((n,i)=>`${c.labels[i]} ${n*c.unit} 只`).join(' · '):`每格表示 ${c.unit} 只`;
      case 'coordinate':return `营地（${c.target[0]}，${c.target[1]}）`;
      case 'volume': return reveal?`${c.rows} × ${c.cols} × ${c.layers} = ${c.rows*c.cols*c.layers} ${c.unit}`:`每层 ${c.rows*c.cols} 块 · 搭 ${c.layers} 层`;
      case 'balance': return `${c.coefficient===1?'':c.coefficient+' × '}${reveal?(c.total-c.constant)/c.coefficient:'□'}${c.constant?' + '+c.constant:''} = ${c.total}`;
      case 'ratio': return reveal?`${c.a*c.scale} : ${c.b*c.scale} = ${c.a} : ${c.b}`:`${c.a} : ${c.b} · 一共 ${(c.a+c.b)*c.scale} 份`;
      case 'negative': return `${c.target>0?'+':''}${c.target} ${c.unit}`;
      default:return s.level.title;
    }
  }
  function progress(s){if(!handles(s.level)) return base.progress?.(s)||null;return {ready:correct(s),actions:s.touched};}
  window.DinoKnowledgeEngine={handles,create,act,correct,equation,progress};
  window.DinoChallengeEngine={...base,create,act,correct,equation,progress};
})();
