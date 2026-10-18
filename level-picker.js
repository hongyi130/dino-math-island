/* A picture-led field guide. Choosing a level never awards a completion star. */
(() => {
  const groups = [
    {key:'all',icon:'🗺️',name:'全部'}, {key:'plus',icon:'＋',name:'接来伙伴'},
    {key:'minus',icon:'−',name:'送去营地'}, {key:'fill',icon:'🐾',name:'补齐伙伴'},
    {key:'split',icon:'🏕️',name:'分成两队'}, {key:'compare',icon:'🤝',name:'比比多少'},
    {key:'jump',icon:'↔',name:'跳石头'},
    {key:'multiply',icon:'×',name:'乘法分组'}, {key:'share',icon:'÷',name:'平均分'},
    {key:'group',icon:'🐾',name:'每几个一组'}, {key:'remainder',icon:'…',name:'找余数'},
    ...Object.entries({place:'位值搭数',shape:'寻找图形',pattern:'补全规律',clock:'拨动时钟',money:'配出零钱',measure:'测量长度',fraction:'分食物',area:'铺出面积',perimeter:'围出周长',decimal:'表示小数',angle:'转动角度',symmetry:'补全对称',chart:'制作统计图',coordinate:'寻找坐标',volume:'积木体积',balance:'天平等式',ratio:'按比调配',percent:'表示百分数',negative:'认识负数'}).map(([key,name])=>({key,icon:'✦',name}))
  ];
  window.createLevelPicker = ({levels,characters,onChoose,onOpen,onClose,completed,current}) => {
    const $=selector=>document.querySelector(selector);
    const overlay=$('#levelPicker');
    let filter='all',grade=0,moduleId='all';
    const catalog=window.DinoLearningCatalog;
    const expanded=levels.some(level=>level.challengeType==='knowledge');
    const hasGradeTwo=levels.some(level=>level.grade===2);
    const category=level=>level.challengeType==='knowledge'?level.family:level.mode==='math'?(level.op==='+'?'plus':'minus'):level.challengeType;
    const moduleFor=level=>catalog?.moduleFor(level)||'arithmetic';
    const filtered=()=>levels.map((level,index)=>({level,index})).filter(({level})=>(!grade||(level.grade||1)===grade)&&(moduleId==='all'||moduleFor(level)===moduleId)&&(filter==='all'||category(level)===filter));
    const route=()=>({indices:filtered().map(item=>item.index),grade,moduleId,topic:filter,label:(grade?['','一年级','二年级','三年级','四年级','五年级','六年级'][grade]:'全年级')+' · '+(filter!=='all'?groups.find(g=>g.key===filter)?.name:catalog?.modules.find(m=>m.id===moduleId)?.name||'综合探险')});
    function choose(index){close(false);onChoose(index,expanded?route():undefined);}
    function render(){
      const done=completed();
      $('#levelPickerProgress').textContent='已完成 '+done.size+' / '+levels.length+' 关';
      $('#gradeFilters').hidden=!hasGradeTwo;
      $('#gradeFilters').innerHTML=expanded?[{value:0,label:'全部年级',icon:'🗺'},...[1,2,3,4,5,6].map(value=>({value,label:['','一年级','二年级','三年级','四年级','五年级','六年级'][value],icon:''}))].map(item=>'<button type="button" data-grade="'+item.value+'" aria-pressed="'+(grade===item.value)+'">'+item.label+'</button>').join(''):hasGradeTwo?[{value:1,label:'加减法 · 70关',icon:'＋ −'},{value:2,label:'二年级乘除法 · 40关',icon:'× ÷'},{value:0,label:'全部',icon:'🗺'}].map(item=>'<button type="button" data-grade="'+item.value+'" aria-pressed="'+(grade===item.value)+'"><b>'+item.icon+'</b>'+item.label+'</button>').join(''):'';
      if(expanded){
        $('#moduleToolbar').hidden=false;
        const inGrade=levels.filter(level=>!grade||(level.grade||1)===grade);
        const options=[{id:'all',name:'全部板块',icon:'🗺'},...catalog.modules.filter(m=>inGrade.some(l=>moduleFor(l)===m.id))];
        if(!options.some(m=>m.id===moduleId)){moduleId='all';filter='all';}
        $('#moduleSelect').innerHTML=options.map(m=>'<option value="'+m.id+'"'+(moduleId===m.id?' selected':'')+'>'+m.icon+' '+m.name+' · '+inGrade.filter(l=>m.id==='all'||moduleFor(l)===m.id).length+'关</option>').join('');
      }
      const available = new Set(levels.filter(level=>(!grade||(level.grade||1)===grade)&&(moduleId==='all'||moduleFor(level)===moduleId)).map(category));
      if(filter!=='all'&&!available.has(filter))filter='all';
      $('#levelFilters').innerHTML=groups.filter(group=>group.key==='all'||available.has(group.key)).map(group=>'<button type="button" data-level-filter="'+group.key+'" aria-pressed="'+(group.key===filter)+'"><b aria-hidden="true">'+group.icon+'</b><span>'+group.name+'</span></button>').join('');
      $('#levelChoices').innerHTML=filtered().map(({level,index})=>{
        const group=groups.find(group=>group.key===category(level))||{name:level.tag,icon:'✦'};
        const character=characters[level.factKind];
        const equation=level.challengeType==='knowledge'?window.DinoKnowledgeEngine.equation({level},false):level.mode==='math'?`${level.start} ${level.op==='+'?'+':'−'} ${level.change}`:level.title;
        return '<button type="button" class="level-choice '+(done.has(index)?'is-done ':'')+(current()===index?'is-current':'')+'" data-level-choice="'+index+'" aria-label="第'+(index+1)+'关，'+group.name+'，'+equation+'，'+(done.has(index)?'已完成':'未完成')+'"'+(current()===index?' aria-current="step"':'')+'><span class="level-number">'+(index+1)+'</span><span class="level-star" aria-hidden="true">'+(done.has(index)?'★':'')+'</span><img src="./assets/'+character.image+'" alt="" loading="lazy"><strong>'+equation+'</strong><small>'+group.icon+' '+group.name+(level.curriculumUnit?.includes('拓展')?' · 拓展':level.curriculumUnit?.includes('复习')?' · 复习':'')+'</small></button>';
      }).join('');
      if(expanded){
        const entries=filtered();const count=entries.filter(item=>done.has(item.index)).length;
        $('#practiceSummary').textContent=entries.length+' 关 · 已完成 '+count+' 关';
        $('#practiceDescription').textContent=catalog.modules.find(m=>m.id===moduleId)?.description||'可先选择一个板块，连续练习同类知识';
        $('#practiceStart').disabled=!entries.length;
        if(!entries.length)$('#levelChoices').innerHTML='<p class="level-empty">这个组合暂时没有关卡，请选择其他年级或板块。</p>';
      }
    }
    function open(){
      if(!expanded){filter='all';grade=hasGradeTwo?(levels[current()]?.grade||1):0;}else if(!overlay.dataset.opened){grade=levels[current()]?.grade||1;overlay.dataset.opened='true';}
      onOpen();render();overlay.hidden=false;
      $('#levelPickerClose').focus();
    }
    function close(restoreFocus=true){
      overlay.hidden=true;
      if(restoreFocus) $('#levelPickerButton').focus();
      onClose?.();
    }
    $('#levelPickerButton').addEventListener('click',open);
    $('#levelPickerClose').addEventListener('click',()=>close());
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    $('#gradeFilters').addEventListener('click',event=>{
      const button=event.target.closest('[data-grade]');if(!button)return;
      grade=Number(button.dataset.grade);filter='all';render();$('#levelChoices').scrollTop=0;
      $('#gradeFilters').querySelector('[data-grade="'+grade+'"]').focus();
    });
    $('#levelFilters').addEventListener('click',event=>{
      const button=event.target.closest('[data-level-filter]');
      if(!button)return;
      filter=button.dataset.levelFilter;render();$('#levelChoices').scrollTop=0;
      $('#levelFilters').querySelector('[data-level-filter="'+filter+'"]').focus();
    });
    $('#levelChoices').addEventListener('click',event=>{
      const button=event.target.closest('[data-level-choice]');
      if(!button)return;
      const index=Number(button.dataset.levelChoice);
      if(!Number.isInteger(index)||index<0||index>=levels.length)return;
      choose(index);
    });
    $('#levelFreePlay').addEventListener('click',()=>{close(false);onChoose(levels.length,null);});
    $('#moduleSelect')?.addEventListener('change',event=>{moduleId=event.target.value;filter='all';render();$('#levelChoices').scrollTop=0;});
    $('#practiceStart')?.addEventListener('click',()=>{const entries=filtered();if(entries.length)choose(entries[0].index);});
    overlay.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();close();return;}
      if(event.key!=='Tab')return;
      const controls=Array.from(overlay.querySelectorAll('button:not([disabled]),select:not([disabled])')).filter(button=>!button.hidden);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    return {open,close,render,get visible(){return !overlay.hidden;}};
  };
})();
