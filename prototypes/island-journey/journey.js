/* Two playable routes; the remaining places stay labelled as visits. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const dialog = $('#detailDialog'), content = $('#dialogContent');
  const catalog = window.DinoLearningCatalog, store = window.DinoJourneyStore;
  const levels = [...window.DINO_LEVELS, ...window.DINO_CHALLENGES, ...window.DINO_GRADE2, ...window.DINO_KNOWLEDGE];
  const grades = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  const state = {grade:2, module:'multiplication'};
  const routes = {
    cedar:{name:'巨杉营地',topic:'乘法挑战',badge:'腕龙化石',next:'瀑布岩台',stop:2,ids:[76,77,78],description:'先摆好队伍，再逐队计数，最后选答案。'},
    waterfall:{name:'瀑布岩台',topic:'平均分挑战',badge:'瀑布挑战',next:'山顶瞭望台',stop:3,ids:[79,80,81],description:'把伙伴分进营地，检查一样多，再选答案。'}
  };
  let eraEntries = {};
  fetch('./island-journey/character-eras.json?v=20261028-f3-r1').then(r=>r.ok?r.json():null).then(data=>{eraEntries=data?.entries||{};}).catch(()=>{});
  const doneRoute = name => store.routeDone(name);
  const fossils=window.DinoFossils;
  const fossilFor=name=>Object.values(window.FOSSILS.fossils).find(f=>f.journey?.route===name);
  const fossilOwned=id=>fossils.owned(id);
  const pendingFossil=()=>['cedar','waterfall'].map(fossilFor).find(f=>fossils.eligible(f.id)&&!fossilOwned(f.id))||Object.values(window.FOSSILS.fossils).find(f=>f.journey?.routes&&fossils.eligible(f.id)&&!fossilOwned(f.id));
  const digUrl=(id='brachio',museum=false)=>`./fossil-dig/?fossil=${id}&${museum?'view=museum&':''}v=20261101-mamenshi-r1`;
  const museumUrl=digUrl('brachio',true);
  const routeFor = id => Object.keys(routes).find(name=>routes[name].ids.includes(id));
  const recommended = () => doneRoute('cedar') ? 'waterfall' : 'cedar';
  const playUrl = (id,parent=false) => `./${routeFor(id)==='waterfall'?'g2-share':'g2-multiply'}/?level=${id}&journey=${routeFor(id)}${parent?'&parent=1':''}&v=20261101-mamenshi-r1`;
  const parentUrl = id => `../index.html?parentPractice=1&level=${id}`;
  const reviewedFallback = {pachyrhino:'白垩纪',euoplo:'白垩纪',galli:'白垩纪',parasaur:'白垩纪',saurolo:'白垩纪',mamenshi:'侏罗纪'};
  const eraLabel = l => { const e=eraEntries[l.factKind];return e ? e.reviewed===true&&e.status==='reviewed'?e.periodLabel:'年代待核对' : reviewedFallback[l.factKind]||'年代待核对'; };
  const stops = [
    {name:'蕨叶入口',scene:1,description:'沿着宽大的蕨叶，找到森林入口。这里是这段旅程的第一站。'},
    {name:'苏铁渡口',scene:2,description:'走过浅浅的河湾，一起观察岸边的苏铁。小路还在向森林深处延伸。'},
    {name:'巨杉营地',scene:3,description:'腕龙正在高高的树旁等你。完成乘法挑战，向瀑布出发。'},
    {name:'瀑布岩台',scene:20,description:'顺着瀑布声来到岩台，帮伙伴分好营地。'},
    {name:'山顶瞭望台',scene:7,description:'站到山顶回望走过的小路。你已经完成瀑布岩台的平均分挑战！'}
  ];
  const eraData = {
    triassic:{title:'三叠纪 · 恐龙初登场',time:'探险起点：晚三叠世，约距今2.3亿年',scene:4,description:'从早期恐龙生活的河谷出发，认识这个世界最初的恐龙伙伴。',status:'时代介绍 · 尚未开放路线'},
    jurassic:{title:'侏罗纪 · 巨兽的森林',time:'约距今2.01亿—1.45亿年',scene:3,description:'走进针叶树和蕨类组成的森林。在这片晚侏罗世主题的森林里，寻找剑龙与腕龙。',status:'当前开放：巨杉营地与瀑布岩台，共6关'},
    cretaceous:{title:'白垩纪 · 缤纷世界',time:'约距今1.45亿—6600万年',scene:11,description:'探访新的海岸与平原，继续认识白垩纪的恐龙。旅程的尾声，还会认识延续至今的鸟类。',status:'后续时代 · 尚未接入数学路线'}
  };
  const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const sceneUrl = n => `../assets/scenes-v4/scene-${String(n).padStart(2,'0')}.webp`;
  const filtered = (grade=state.grade,module=state.module) => levels.filter(l=>(l.grade||1)===grade&&(module==='all'||catalog.moduleFor(l)===module));
  const lessonName = l => l.mode==='math'?`${l.start} ${l.op==='+'?'+':'−'} ${l.change} = ?`:l.title;
  const lessonTopic = l => l.curriculumUnit||l.tag||'动手练习';
  const lessonInstruction = l => routeFor(l.id)==='waterfall'?`把${l.total}只伙伴分到${l.groups}个营地。点“＋送一只”来分配；点营地里的恐龙可以请回。每个营地一样多后，检查并选答案。`:routeFor(l.id)==='cedar'?`每队${l.perGroup}只，共${l.groups}队。接来伙伴，摆好队伍，再逐队数一数，选出总数。`:l.task||l.guidance||l.instruction||'按指引完成操作。';
  function renderProgress(){
    const done=store.completed(), ids=Object.values(routes).flatMap(r=>r.ids), count=ids.filter(id=>done.has(id)).length;
    $('.chapter-progress').innerHTML=`<span><b>${count}</b> / 6 关</span><div aria-label="森林篇已完成${count}关，共6关">${ids.map(id=>`<i class="${done.has(id)?'':'empty'}"></i>`).join('')}</div>`;
    [0,1].forEach(i=>{const b=$(`[data-stop="${i}"]`);b.className='map-node preview';b.querySelector('.node-disc').innerHTML=icon('compass');b.querySelector('.node-name small').textContent='可参观';b.setAttribute('aria-label',`${stops[i].name}，参观地点，尚未接入任务`);});
    Object.entries(routes).forEach(([name,r])=>{
      const b=$(`[data-stop="${r.stop}"]`), finished=doneRoute(name), unlocked=store.unlocked(name), n=r.ids.filter(id=>done.has(id)).length;
      b.classList.toggle('done',finished);b.classList.toggle('current',unlocked&&!finished);b.classList.toggle('locked',!unlocked&&!finished);b.classList.remove('available');
      b.querySelector('.node-disc').innerHTML=finished?icon('star'):unlocked?String(r.stop+1):icon('lock');
      const tag=b.querySelector('.here-tag');tag.hidden=finished||!unlocked;tag.textContent='你在这里';
      b.querySelector('.node-name small').textContent=finished?'已完成 · 可重玩':unlocked?`已完成 ${n} / 3 关`:'完成营地解锁';
      b.setAttribute('aria-label',`${r.name}，${finished?'已完成，可重玩':unlocked?`已完成${n}关，共3关`:'未解锁，完成巨杉营地3关后开放'}`);
    });
    const summit=$('[data-stop="4"]'), open=store.unlocked('summit');
    summit.classList.toggle('locked',!open);summit.classList.toggle('available',open);
    summit.querySelector('.node-disc').innerHTML=icon(open?'compass':'lock');
    summit.querySelector('.node-name small').textContent=open?'已开放 · 可参观':'完成瀑布解锁';
    summit.setAttribute('aria-label',`山顶瞭望台，${open?'已开放，可参观':'未解锁，完成瀑布岩台3关后开放'}`);
    $('.collection-link span').textContent=`博物馆 · ${Object.keys(window.FOSSILS.fossils).filter(fossilOwned).length} 座展台 →`;
    $('#fossilDigEntry').hidden=!doneRoute('cedar');$('#digLabel').textContent=fossilOwned('brachio')?'腕龙骨架 · 博物馆':'有一枚化石等你挖';
    $('#waterfallDigEntry').hidden=!doneRoute('waterfall')||fossilOwned('mamenshi');
    const route=recommended(), r=routes[route], n=r.ids.filter(id=>done.has(id)).length, finished=doneRoute(route);
    $('.today-badge').textContent=r.topic;$('.today-duration').textContent=`已完成 ${n} / 3 关`;
    $('#todayTitle').textContent=finished?'到山顶，回望这段旅程':route==='waterfall'?'去瀑布岩台，分好营地':'去巨杉营地，看看腕龙';
    $('#todayDescription').textContent=finished?'两段挑战已完成，山顶瞭望台开放啦！':r.description;
    const button=$('.today-card .primary');button.dataset.action='today';delete button.dataset.fossil;button.innerHTML=(finished?'回顾瀑布挑战':n?'继续这段挑战':'开始这段挑战')+' '+icon('arrow');
    $('.route-dots').setAttribute('aria-label',`${r.name}已完成${n}关，共3关`);
    $('.route-dots').innerHTML=r.ids.map((id,i)=>`${i?'<i></i>':''}<span class="${done.has(id)?'route-done':''}">${done.has(id)?'✓':i+1}</span>`).join('')+icon('star');
    const pending=pendingFossil();
    if(pending){const forest=Boolean(pending.journey.routes);$('.today-badge').textContent=pending.journey.name+' · 新发现';$('.today-duration').textContent=forest?'已完成 6 / 6 关':'已完成 3 / 3 关';$('.route-dots').setAttribute('aria-label',forest?'森林挑战已完成6关，共6关':pending.journey.name+'已完成3关，共3关');$('.route-dots').innerHTML=Array.from({length:forest?6:3},(_,i)=>(i?'<i></i>':'')+'<span class="route-done">✓</span>').join('')+icon('star');button.dataset.fossil=pending.id;$('#todayTitle').textContent=forest?pending.name+'化石在等你！':'化石蛋裂开啦，去挖化石！';$('#todayDescription').textContent='敲开岩石、刷去沙土，再把骨架拼起来。';button.dataset.action='dig';button.innerHTML='去挖化石！ '+icon('arrow');}
    let warning=$('#storageWarning');
    if(!store.storageOK()&&!warning){warning=document.createElement('p');warning.id='storageWarning';warning.setAttribute('role','alert');warning.textContent='浏览器暂时无法保存进度。继续前请允许本地存储；关闭页面后可能无法恢复。';$('.today-card').append(warning);}
    if(store.storageOK())warning?.remove();
  }
  function show(html){const opening=!dialog.open;content.innerHTML=html;if(opening)dialog.showModal();dialog.scrollTop=0;$('#closeDialog').focus();}
  const heading=(kicker,title)=>`<p class="dialog-kicker">${kicker}</p><h2 id="dialogTitle">${title}</h2>`;
  function routeRows(rows){return `<ol class="lesson-list">${rows.map((l,i)=>`<li><span class="lesson-number">${i+1}</span><button data-parent-lesson="${l.id}"><strong>${escape(lessonName(l))}</strong><small>第 ${l.id} 关 · ${escape(lessonTopic(l))}</small></button></li>`).join('')}</ol>`;}
  function showRoute(name){
    const r=routes[name];if(!r)return;
    if(!store.unlocked(name)&&!doneRoute(name)){showStop(r.stop,true);return;}
    const done=store.completed(), finished=doneRoute(name), next=store.nextLevel(name)||r.ids[0],reward=fossilFor(name),digReady=finished&&!fossilOwned(reward.id);
    const intro=name==='cedar'?'侏罗纪的腕龙邀请你做时空练习。题目里的厚鼻龙、包头龙和似鸡龙，来自白垩纪。':'副栉龙、栉龙和马门溪龙来自不同年代。这次请把伙伴平均分进营地，每个营地都要一样多。';
    show(heading(`${r.name} · ${r.topic}`,finished?'这一站完成，下一站开放啦！':'完成这3关，点亮这一站')+`<p>${intro}</p><ol class="lesson-list">${r.ids.map((id,i)=>{const l=levels.find(l=>l.id===id);return `<li><span class="lesson-number">${done.has(id)?'✓':i+1}</span><button data-lesson="${id}"><strong>${escape(lessonName(l))}</strong><small>第 ${id} 关 · ${done.has(id)?'已完成':store.snapshot(id)?'可继续':'未完成'} · ${escape(eraLabel(l))}</small></button></li>`;}).join('')}</ol><div class="status-line">${finished?`${digReady?'化石已准备好':'本站挑战已完成'} · ${r.next}已开放`:`正确完成3关后开放「${r.next}」。答错可以再试，退出后可接着做。`}</div><div class="dialog-actions"><button class="secondary" data-action="parent">家长选练</button><a class="primary" href="${digReady?digUrl(reward.id):playUrl(next)}">${finished?(digReady?'去挖化石！':'重新练习'):store.snapshot(next)?'继续这一关':'开始下一关'} ${icon('arrow')}</a></div>${finished?`<button class="text-button" data-stop="${r.stop+1}">去${r.next} →</button>`:''}<p class="small-note">目前开放两个地点，共6关；山顶先参观。进度保存在当前浏览器中。</p>`);
  }
  const showToday=()=>showRoute(recommended());
  function showStop(index,lockedView=false){
    const stop=stops[index];if(!stop)return;
    if(index===2){showRoute('cedar');return;}
    if(index===3&&!lockedView&&(store.unlocked('waterfall')||doneRoute('waterfall'))){showRoute('waterfall');return;}
    let extra='';
    if(index<2)extra='<div class="status-line">参观地点 · 数学任务尚未接入</div><p>来看看森林里的伙伴。这处地点不会因为参观而被标记为通关。</p>';
    if(index===3)extra='<div class="status-line lock">完成「巨杉营地」的3关后解锁。</div><p>答错可以再试一次，提示不会扣掉进度。家长也可以从选练入口直接进入平均分。</p>';
    if(index===4)extra=store.unlocked('summit')?'<div class="status-line">★ 已开放 · 瀑布岩台挑战已完成！</div><p>来山顶看一看。这一站暂时只有参观，新的数学任务还未接入。</p>':'<div class="status-line lock">完成「瀑布岩台」的3关后解锁。</div>';
    const description=index===4&&!store.unlocked('summit')?'顺着小路来到山顶，可以回望森林和瀑布。':stop.description;
    show(heading(`森林篇 · 第 ${index+1} 站`,stop.name)+`<img class="dialog-hero" src="${sceneUrl(stop.scene)}" alt="${stop.name}场景参考"><p>${description}</p>${extra}<div class="dialog-actions"><button class="secondary" data-action="close">回到地图</button><button class="primary" data-action="today">${doneRoute(recommended())?'回顾数学挑战':'继续数学挑战'} →</button></div>`);
  }
  function showEra(key){const era=eraData[key];if(!era)return;show(heading('恐龙时光之旅',era.title)+`<img class="dialog-hero" src="${sceneUrl(era.scene)}" alt="${era.title}场景氛围参考"><p>${era.time}</p><p>${era.description}</p><div class="status-line">${era.status}</div><p class="small-note">这版接通森林里的两个地点，另外两个时代展示入口与介绍。地质年代为约数；参考图仅表达氛围。</p><button class="primary" data-action="close">查看侏罗纪地图 ${icon('arrow')}</button>`);}
  function refreshParentModules(){
    const grade=Number($('#parentGrade').value),old=$('#parentModule').value||state.module;
    const options=catalog.modules.filter(m=>levels.some(l=>(l.grade||1)===grade&&catalog.moduleFor(l)===m.id));
    $('#parentModule').innerHTML='<option value="all">综合探险</option>'+options.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
    $('#parentModule').value=options.some(m=>m.id===old)?old:'all';refreshParentLevels();
  }
  function refreshParentLevels(){const list=filtered(Number($('#parentGrade').value),$('#parentModule').value);$('#parentCount').textContent=`现有 ${list.length} 关 · 可查看原关卡编号和任务`;$('#parentLessons').innerHTML=list.length?routeRows(list):'<p class="empty-state">这个组合还没有关卡，请选择其他板块。</p>';}
  function showParent(){
    show(heading('家长选择','练什么，由你来选')+`<p>年级决定练习范围，年代决定探险旅程。可以直接选择适合孩子的内容。</p><div class="field-pair"><div><label class="detail-label" for="parentGrade">建议年级</label><select id="parentGrade">${grades.slice(1).map((g,i)=>`<option value="${i+1}"${state.grade===i+1?' selected':''}>${g}</option>`).join('')}</select></div><div><label class="detail-label" for="parentModule">知识板块</label><select id="parentModule"></select></div></div><div class="dialog-actions"><button class="primary" data-action="apply-learning">开始专项练习 ${icon('arrow')}</button></div><p id="parentCount" class="small-note"></p><details class="parent-details"><summary>查看关卡与任务</summary><div id="parentLessons"></div></details><p class="small-note">按年级和知识点直接进入练习，不受地图解锁限制。76–78关使用新版乘法画面，79–81关使用新版平均分画面，其余进入完整游戏；完成单关不代表掌握整个单元。</p>`);
    refreshParentModules();$('#parentGrade').addEventListener('change',refreshParentModules);$('#parentModule').addEventListener('change',refreshParentLevels);
  }
  function showLesson(id,parent=false){
    const l=levels.find(item=>item.id===id);if(!l)return;
    const route=routeFor(id),done=store.completed().has(id);
    if(route&&!parent&&!store.unlocked(route)&&!doneRoute(route)){showStop(routes[route].stop,true);return;}
    show(heading(`原有第 ${l.id} 关 · ${escape(eraLabel(l))}`,escape(lessonName(l)))+`<p>${escape(lessonTopic(l))}</p><div class="lesson-instruction">${escape(lessonInstruction(l))}</div><p class="small-note">${route?'这是跨时代的数学练习，保留原题目、角色和已有语音。':'直接进入现有游戏练习，不受地图解锁限制。'}</p><div class="dialog-actions"><button class="secondary" data-action="parent">选其他关卡</button><a class="primary" href="${route?playUrl(id,parent):parentUrl(id)}">${done?'重新练习':route&&store.snapshot(id)?'继续这一关':'开始这一关'} ${icon('arrow')}</a></div>`);
  }
  function showCollection(){location.href=fossilOwned('mamenshi')?digUrl('mamenshi',true):museumUrl;}
  function showAbout(){show(heading('给小探险家和家长','从营地，走到瀑布')+'<ol class="about-steps"><li>巨杉营地：76–78关，摆队伍、计数，发现乘法。</li><li>每完成一关，化石蛋多一道裂纹。3关完成后去挖化石，同时开放瀑布岩台。</li><li>瀑布岩台：79–81关，分营地、检查一样多，学习平均分。</li><li>再完成3关平均分，可以挖马门溪龙化石，同时开放山顶参观。</li></ol><p>化石挖掘依次敲、刷、拼，再放进博物馆；中途退出可以继续。完成森林六关后，博物馆会开放更多化石发现。提示不扣进度，家长可直接选练其他年级和知识点。</p><p class="small-note">目前共6关可玩；其余地点先参观。平均分画面暂用已验收的浅色台地背景。旧游戏已完成记录会在同一浏览器、同一网址来源下计入；换设备、换IP或端口不会自动共享。地图当地伙伴属于侏罗纪，数学任务邀请不同年代的时空伙伴。</p><button class="primary" data-action="close">回到森林地图</button>');}
  const actions={dig:el=>{const id=el.dataset.fossil||pendingFossil()?.id||'brachio';location.href=digUrl(id,fossilOwned(id));},today:showToday,parent:showParent,collection:showCollection,about:showAbout,close:()=>dialog.close(),current:()=>{dialog.close();$('.current')?.focus();},'apply-learning':()=>{state.grade=Number($('#parentGrade').value);state.module=$('#parentModule').value;const first=filtered()[0];if(first)location.href=routeFor(first.id)?playUrl(first.id,true):parentUrl(first.id);}};
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]');if(action){actions[action.dataset.action]?.(action);return;}
    const stop=event.target.closest('[data-stop]');if(stop){showStop(Number(stop.dataset.stop));return;}
    const era=event.target.closest('[data-era]');if(era){showEra(era.dataset.era);return;}
    const parent=event.target.closest('[data-parent-lesson]');if(parent){showLesson(Number(parent.dataset.parentLesson),true);return;}
    const lesson=event.target.closest('[data-lesson]');if(lesson)showLesson(Number(lesson.dataset.lesson));
  });
  renderProgress();store.subscribe(renderProgress);fossils.subscribe(renderProgress);
  $('#closeDialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
})();
