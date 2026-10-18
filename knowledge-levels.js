/* Original concrete activities. Grade suggestions and edition notes: CURRICULUM-1-6.md.
   New textbook editions progress by cohort; these are practice topics, not a complete textbook. */
(() => {
  'use strict';
  const rows = [];
  const add = (grade, moduleId, family, unit, configs) => configs.forEach(config => rows.push({grade,moduleId,family,unit,config}));
  add(1,'numbers','place','认识数与位值',[12,24,35,46].map(target=>({places:[10,1],target})));
  add(1,'shapes','shape','认识平面图形',[
    {target:'triangle',targetLabel:'三角形',items:['circle','triangle','square','triangle','rectangle','circle']},
    {target:'circle',targetLabel:'圆形',items:['circle','square','circle','triangle','rectangle','circle']},
    {target:'square',targetLabel:'正方形',items:['rectangle','square','triangle','square','circle','rectangle']},
    {target:'rectangle',targetLabel:'长方形',items:['rectangle','circle','triangle','rectangle','triangle','rectangle']}
  ]);
  add(1,'patterns','pattern','规律拓展：数学游戏',[
    {sequence:['leaf','egg','leaf','egg','leaf','egg'],blanks:[3,5],options:['leaf','egg','paw'],label:'重复规律'},
    {sequence:['paw','paw','egg','paw','paw','egg'],blanks:[4,5],options:['leaf','egg','paw'],label:'重复规律'},
    {sequence:['leaf','egg','paw','leaf','egg','paw'],blanks:[4,5],options:['leaf','egg','paw'],label:'重复规律'},
    {sequence:[2,4,6,8,10,12],blanks:[4,5],options:[8,10,12,14],label:'每次增加 2'}
  ]);
  add(2,'time','clock','认识整时',[3,6,8,10].map(hour=>({hour,minute:0,minuteStep:30})));
  add(1,'money','money','认识人民币',[120,170,230,360].map(target=>({denominations:[100,50,10],target})));
  add(2,'numbers','place','百以内与千以内的数',[127,205,340,506].map(target=>({places:[100,10,1],target})));
  add(2,'measurement','measure','认识长度单位',[
    {start:0,end:4,max:10,unit:'厘米'},{start:0,end:7,max:10,unit:'厘米'},
    {start:2,end:8,max:10,unit:'厘米'},{start:3,end:12,max:15,unit:'厘米'}
  ]);
  add(2,'time','clock','认识时和分',[
    {hour:2,minute:30,minuteStep:5},{hour:4,minute:15,minuteStep:5},
    {hour:7,minute:45,minuteStep:5},{hour:9,minute:20,minuteStep:5}
  ]);
  add(1,'shapes','shape','认识立体图形与图形复习',[
    {target:'cube',targetLabel:'正方体',items:['cube','sphere','cylinder','cube','cone','sphere']},
    {target:'cylinder',targetLabel:'圆柱',items:['sphere','cylinder','cube','cylinder','cone','cube']},
    {target:'sphere',targetLabel:'球',items:['sphere','cube','sphere','cylinder','sphere','cone']},
    {target:'triangle',targetLabel:'三角形',items:['triangle','rectangle','circle','triangle','square','triangle']}
  ]);
  add(2,'statistics','chart','数据收集与整理',[
    [3,5,2],[4,2,6],[5,3,4],[2,6,5]
  ].map(counts=>({labels:['三角龙','剑龙','腕龙'],kinds:['trike','stego','brachio'],counts,max:8,unit:1})));
  add(3,'fractions','fraction','分数的初步认识',[
    {denominator:2,numerator:1,partition:'circle'},{denominator:4,numerator:3,partition:'circle'},
    {denominator:6,numerator:2,partition:'grid'},{denominator:8,numerator:5,partition:'grid'}
  ]);
  add(3,'measurement','measure','毫米与测量',[
    {start:0,end:6,max:15,unit:'毫米'},{start:0,end:12,max:15,unit:'毫米'},
    {start:3,end:11,max:15,unit:'毫米'},{start:4,end:14,max:15,unit:'毫米'}
  ]);
  add(3,'measurement','perimeter','长方形和正方形的周长',[[4,3],[5,2],[4,4],[6,3]].map(([width,height])=>({width,height,unit:'厘米'})));
  add(3,'measurement','area','长方形面积与平方单位',[[2,3],[3,4],[4,4],[3,5]].map(([rows,cols])=>({rows,cols,unit:'平方厘米'})));
  add(3,'time','clock','时间复习：经过时间',[
    {hour:7,minute:55,minuteStep:5,elapsed:{hour:7,minute:35,duration:20}},
    {hour:9,minute:15,minuteStep:5,elapsed:{hour:8,minute:50,duration:25}},
    {hour:11,minute:10,minuteStep:5,elapsed:{hour:10,minute:40,duration:30}},
    {hour:2,minute:5,minuteStep:5,elapsed:{hour:1,minute:30,duration:35}}
  ]);
  add(4,'fractions','decimal','小数的意义',[
    {denominator:10,numerator:3,partition:'grid'},{denominator:10,numerator:7,partition:'grid'},
    {denominator:100,numerator:25,partition:'grid'},{denominator:100,numerator:42,partition:'grid'}
  ]);
  add(4,'shapes','angle','角的度量',[30,60,90,120].map(target=>({target,step:15})));
  add(4,'position','symmetry','轴对称',[
    [0,6,12,13],[1,7,13,19],[0,1,7,13,14],[2,8,13,14,20]
  ].map(source=>({rows:5,cols:6,axis:3,source})));
  add(4,'statistics','chart','条形统计图',[[4,6,3],[7,4,5],[5,8,6],[8,3,7]].map(counts=>({labels:['三角龙','剑龙','腕龙'],kinds:['trike','stego','brachio'],counts,max:10,unit:1})));
  add(4,'numbers','place','大数的认识',[12034,30506,47020,60809].map(target=>({places:[10000,1000,100,10,1],target})));
  add(5,'fractions','fraction','分数的意义与等分',[
    {denominator:8,numerator:3,partition:'circle'},{denominator:10,numerator:7,partition:'grid'},
    {denominator:12,numerator:5,partition:'grid'},{denominator:16,numerator:12,partition:'grid'}
  ]);
  add(5,'position','symmetry','图形的运动：轴对称',[
    [0,1,6,12,18],[1,2,7,13,19,25],[0,6,7,13,14,20],[2,8,12,13,14,18,24]
  ].map(source=>({rows:5,cols:6,axis:3,source})));
  add(5,'measurement','volume','长方体体积',[[2,2,2],[2,3,2],[2,3,3],[3,3,2],[2,2,4],[2,3,4],[3,3,3],[3,4,2]].map(([rows,cols,layers])=>({rows,cols,layers,unit:'立方厘米'})));
  add(5,'relations','balance','等式与未知数（拓展）',[
    {coefficient:1,constant:3,total:8},{coefficient:2,constant:0,total:12},
    {coefficient:2,constant:3,total:11},{coefficient:3,constant:2,total:17}
  ]);
  add(6,'position','coordinate','用数对确定位置',[[2,3],[4,2],[3,5],[5,4]].map(target=>({rows:6,cols:6,target})));
  add(6,'relations','ratio','比与按比分配',[
    {a:1,b:2,scale:3},{a:2,b:3,scale:2},{a:3,b:2,scale:3},{a:2,b:5,scale:2}
  ].map(config=>({...config,labels:['绿叶','果子']})));
  add(6,'fractions','percent','百分数的意义',[20,35,50,75].map(numerator=>({denominator:100,numerator,partition:'grid'})));
  add(6,'numbers','negative','生活中的负数',[-3,4,-6,7].map(target=>({target,min:-10,max:10,unit:'℃'})));
  add(6,'statistics','chart','统计复习：不同刻度',[[3,5,2],[4,2,6],[5,3,4],[2,6,5]].map(counts=>({labels:['三角龙','剑龙','腕龙'],kinds:['trike','stego','brachio'],counts,max:8,unit:2})));

  const kinds=['trike','stego','brachio','raptor','maia','sino','apato','pachyrhino','euoplo','galli','parasaur','saurolo','mamenshi','proto','huayang','niger','anky','corytho','centro','lambeo','shuno','camara','micro','yuty','edmonto','nasuto','ourano','pentacera','argentino','sauropelta','tuojiang','deinonych','utah','tsintao','europa','dicraeo','therizino','pachy','psittaco','oviraptor','alamo'];
  const money = n => `${Math.floor(n/100)}元${n%100 ? Math.floor(n%100/10)+'角' : ''}`;
  const time = (h,m) => `${h}:${String(m).padStart(2,'0')}`;
  const titles={place:'帮恐龙搭出这个数',shape:'找到同一种形状',pattern:'补好探险小路',clock:'拨好探险时钟',money:'给伙伴配好零钱',measure:'用尺子量一量',fraction:'给伙伴分点心',area:'给营地铺地砖',perimeter:'沿营地边界走一圈',decimal:'涂出这个小数',angle:'转动探索指针',symmetry:'补全对称的翅膀',chart:'帮伙伴做好统计',coordinate:'带恐龙走到营地',volume:'一层一层搭营地',balance:'让天平两边一样重',ratio:'配好两种食物',percent:'涂出这个百分数',negative:'调好营地温度'};
  function taskFor(f,c) {
    switch(f) {
      case 'place': return `用不同数位上的珠子，搭出 ${c.target}。点加号放一颗，点减号拿回一颗。`;
      case 'shape': return `找到所有的${c.targetLabel}，一个一个点亮。别把其他形状选进来。`;
      case 'pattern': return '先看看小路上是怎样排列的。点空位，再选一个合适的图案或数字，把规律接下去。';
      case 'clock': return c.elapsed?`出发时是${c.elapsed.hour}点${c.elapsed.minute}分。经过${c.elapsed.duration}分钟，几点到呢？动动时针和分针。`:`请把时钟拨到${c.hour}点${c.minute?c.minute+'分':'整'}。小时和分钟都要看仔细哦。`;
      case 'money': return `这份食物需要${money(c.target)}。点不同的钱币凑出这么多，给多了可以拿回来。`;
      case 'measure': return `把尺子的终点移到树枝的另一端。看看两端的刻度，量一量它长多少${c.unit}。`;
      case 'fraction': return `这块点心平均分成${c.denominator}份。请选出其中的${c.numerator}份，表示${c.denominator}分之${c.numerator}。`;
      case 'decimal': return `这一整块地平均分成${c.denominator}份。请涂出${String(c.numerator/c.denominator)}。每一小格都一样大。`;
      case 'percent': return `这一整块地有一百小格。请涂出百分之${c.numerator}。点加一格或加十格按钮，给小格涂色。多涂了可以擦掉。`;
      case 'area': return `给这个${c.rows}行、每行${c.cols}格的营地铺地砖。每块是一平方厘米，铺满后看看一共多少。`;
      case 'perimeter': return `沿着营地边缘走一圈。长${c.width}厘米，宽${c.height}厘米。每条边都要走到哦。`;
      case 'angle': return `把指针从零度开始转一转，张开一个${c.target}度的角。看刻度，慢慢调整。`;
      case 'symmetry': return '中间这条线是对称轴。观察左边的翅膀，在右边点出它的镜像，离中线一样远。';
      case 'chart': return `看看三种恐龙的观察记录，按记录给每种恐龙搭一根柱子。每一小格表示${c.unit}只，柱子表示的数量要和记录一样多哦。`;
      case 'coordinate': return `带恐龙走到数对${c.target[0]}、${c.target[1]}的位置。先看第几列，再看第几行，点箭头一步一步走。`;
      case 'volume': return `每层铺${c.rows}行，每行${c.cols}块。搭出${c.layers}层的小营地。每一块是一立方厘米。`;
      case 'balance': return '往问号盒子里放小积木，让天平两边一样重。相同的盒子里，积木要一样多。';
      case 'ratio': return `绿叶和果子的份数比是${c.a}比${c.b}。一共准备${(c.a+c.b)*c.scale}份。点加减号，给两种食物配好数量。`;
      case 'negative': return `请把营地温度调到${c.target<0?'零下'+Math.abs(c.target):'零上'+c.target}摄氏度。看清零刻度，再向上或向下调整。`;
      default: throw new Error(`Unknown family ${f}`);
    }
  }
  window.DINO_KNOWLEDGE = rows.map((row,index)=>{
    const {grade,moduleId,family,unit,config}=row,id=111+index,kind=kinds[index%kinds.length];
    return {id,grade,moduleId,mode:'challenge',challengeType:'knowledge',family,config,
      tag:`${grade} 年级 · ${unit}`,curriculumUnit:unit,curriculumNote:'按知识主题推荐练习年级；学校新旧版教材进度可能不同。',
      title:titles[family],guidance:taskFor(family,config),task:taskFor(family,config),taskFile:`knowledge-${id}.m4a`,
      cheer:'你动手找到规律啦！把这个发现带去下一次探险吧。',factKind:kind,
      sceneIndex:index%16,seed:[],pairs:[[kind]],goalLabel:unit,discovery:'',goal:1};
  });
})();
