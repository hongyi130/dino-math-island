/* F1 owns only this key. Journey and all formal-game records remain read-only here.
   F2: every fossil in fossils.json shares the same v1 record shape under dig.<id>. ?parent=1&fossil=<id> is a preview:
   it unlocks that fossil but only ever writes this tab's sessionStorage, never the permanent key. */
(() => {
  'use strict';
  const KEY='dino-math-island-fossils-v1', PKEY=KEY+':preview', CELLS=1024, MASK=window.FOSSIL_BONE_AREA, THRESHOLD=.7, DATA=window.FOSSILS.fossils;
  const query=new URLSearchParams(location.search), PREVIEW=query.get('parent')==='1'&&DATA[query.get('fossil')]?query.get('fossil'):null, ACTIVE=DATA[query.get('fossil')]?query.get('fossil'):'brachio';
  const STANDALONE=query.get('archaeology')==='1', AKEY='dino-math-archaeology-fossils-v1';
  const REPEAT_KEY=PREVIEW?PKEY+':repeat':STANDALONE?AKEY+':repeat':KEY, saved=PREVIEW?sessionStorage:localStorage, savedKey=PREVIEW?PKEY:STANDALONE?AKEY:KEY;
  const listeners=new Set();let memory=null,healthy=true,repeatMemory=null;
  const areas={},areaOf=id=>areas[id]||=id==='brachio'?MASK:(()=>{const weights=new Array(CELLS).fill(0);DATA[id].area.weights.forEach(([n,w])=>{weights[n]=w;});return{weights,total:DATA[id].area.total};})();
  const partsOf=id=>id==='brachio'?['head','neck','body','tail','legs']:DATA[id].art.parts.map(p=>p.id);
  const PARTS=partsOf(ACTIVE);
  const coverage=(cells,id=ACTIVE)=>{const a=areaOf(id),unique=new Set(cells);return [...unique].reduce((n,i)=>n+(a.weights[i]||0),0)/a.total;};
  const metricOf=id=>id==='brachio'?'rock-v2':DATA[id].area.metric;
  const record=(id=ACTIVE)=>({step:'knock',hits:0,cleared:[],placed:[],brushMetric:metricOf(id)});
  const fresh=()=>({version:1,dig:{brachio:record('brachio'),[ACTIVE]:record()},museum:[]});
  // F7: levels 1-50 open fossils too (fossil-unlock.js); either that or the forest route is enough.
  const eligible=(id=ACTIVE)=>PREVIEW||STANDALONE||window.DinoFossilUnlock?.unlocked(id)===true?true:(DATA[id]?.journey?.routes?.length?DATA[id].journey.routes.every(route=>window.DinoJourneyStore?.routeDone(route)===true):Boolean(DATA[id]?.journey?.route)&&window.DinoJourneyStore?.routeDone(DATA[id].journey.route)===true);
  const phase=(d,id=ACTIVE)=>d.hits<6?'knock':coverage(d.cleared,id)<THRESHOLD?'brush':d.placed.length<partsOf(id).length?'puzzle':'revive';
  function normalizeOne(id,s){
    const x=record(id);if(!s)return x;
    x.hits=Number.isInteger(s.hits)&&s.hits>=0&&s.hits<=6?s.hits:0;
    if(x.hits===6)x.cleared=[...new Set(Array.isArray(s.cleared)?s.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<CELLS):[])].sort((a,b)=>a-b);
    const area=areaOf(id);
    if(id!=='brachio'&&DATA[id].legacyArea&&s.brushMetric!==metricOf(id)&&x.hits===6){
      const old=DATA[id].migrationAreas?.[s.brushMetric]||(s.brushMetric==='rock-alpha-r1'?DATA[id].alphaArea:s.brushMetric==='rock-f2r2'?DATA[id].previousArea:DATA[id].legacyArea),weights=Object.fromEntries(old.weights),ratio=x.cleared.reduce((n,i)=>n+(weights[i]||0),0)/old.total;
      x.cleared=[];let sum=0;
      area.weights.forEach((w,i)=>{if(w&&(ratio>=THRESHOLD||(sum+w)/area.total<=ratio)){x.cleared.push(i);sum+=w;}});
    }
    x.brushMetric=metricOf(id);
    // Same v1 record shape. Preserve verified coverage when switching fossil geometry.
    if(id==='brachio'&&['bone-v1','egg-v1','rock-v1'].includes(s.brushMetric)&&x.hits===6){
      const previous=s.brushMetric==='egg-v1'?MASK.legacyEgg:s.brushMetric==='rock-v1'?MASK.legacyRock:MASK.legacy;
      const ratio=x.cleared.reduce((n,i)=>n+(previous.weights[i]||0),0)/previous.total;
      const cells=MASK.weights.map((w,i)=>({w,i})).filter(c=>c.w>0);x.cleared=[];
      if(ratio>=THRESHOLD)x.cleared=cells.map(c=>c.i);
      else{let sum=0;for(const c of cells){if((sum+c.w)/MASK.total<=ratio){x.cleared.push(c.i);sum+=c.w;}}}
    }
    // R1/R2 completed brushing used >=871 whole-board cells. Preserve legitimate old progress.
    if(id==='brachio'&&!s.brushMetric&&x.hits===6&&x.cleared.length>=871&&['puzzle','revive','museum'].includes(s.step))x.cleared=[...new Set([...x.cleared,...MASK.weights.map((w,i)=>w?i:-1).filter(i=>i>=0)])].sort((a,b)=>a-b);
    if(coverage(x.cleared,id)>=THRESHOLD)x.placed=partsOf(id).filter(p=>Array.isArray(s.placed)&&s.placed.includes(p));
    x.step=phase(x,id);
    return x;
  }
  function normalize(raw){
    const d=fresh();if(raw?.version!==1)return d;
    const known=Object.keys(raw.dig||{}).filter(id=>DATA[id]);
    for(const id of ['brachio',ACTIVE])if(!known.includes(id))known.push(id);
    known.forEach(id=>{
      const x=normalizeOne(id,raw.dig?.[id]);
      // A string saying museum is not a reward. All three operation records are required.
      if(x.step==='revive'&&raw.dig?.[id]?.step==='museum'&&Array.isArray(raw.museum)&&raw.museum.includes(id)){x.step='museum';if(!d.museum.includes(id))d.museum.push(id);}
      d.dig[id]=x;
    });
    return d;
  }
  function merge(a,b){
    const dig={},ids=[...new Set([...Object.keys(a.dig),...Object.keys(b.dig)])],museum=[...new Set([...a.museum,...b.museum])];
    ids.forEach(id=>{const x=a.dig[id]||record(id),y=b.dig[id]||record(id);dig[id]={step:museum.includes(id)?'museum':'knock',brushMetric:metricOf(id),hits:Math.max(x.hits,y.hits),cleared:[...x.cleared,...y.cleared],placed:[...x.placed,...y.placed]};});
    return normalize({version:1,dig,museum});
  }
  function loadSaved(){
    try{const disk=normalize(JSON.parse(saved.getItem(savedKey)||'null'));memory=memory?merge(memory,disk):disk;}
    catch(_){healthy=false;memory||=fresh();}
    return structuredClone(memory);
  }
  // Repeated digs use the same record shape in this tab's sessionStorage.
  // Permanent completion/collection is never reset, merged with or written by a repeat.
  function repeatRecord(){
    if(!eligible()||!loadSaved().museum.includes(ACTIVE))return null;
    try{const raw=JSON.parse(sessionStorage.getItem(REPEAT_KEY)||'null');return raw?.version===1&&raw.dig?.[ACTIVE]?normalize({...raw,museum:[]}):null;}
    catch(_){healthy=false;return null;}
  }
  function resumeRepeat(){const d=repeatRecord();if(!d)return false;repeatMemory=d;return true;}
  function saveRepeat(d){
    const raw=JSON.parse(sessionStorage.getItem(REPEAT_KEY)||'null');
    const dig=raw?.version===1?{...raw.dig}:{};
    if(d)dig[ACTIVE]=d.dig[ACTIVE];else delete dig[ACTIVE];
    if(Object.keys(dig).length)sessionStorage.setItem(REPEAT_KEY,JSON.stringify({version:1,dig,museum:[]}));
    else sessionStorage.removeItem(REPEAT_KEY);
  }
  function startRepeat(){
    if(!eligible()||!loadSaved().museum.includes(ACTIVE))return false;
    const d=fresh();try{saveRepeat(d);repeatMemory=d;healthy=true;return true;}
    catch(_){healthy=false;listeners.forEach(fn=>fn());return false;}
  }
  function load(){
    const saved=loadSaved();
    if(repeatMemory&&(!eligible()||!saved.museum.includes(ACTIVE)))repeatMemory=null;
    return structuredClone(repeatMemory||saved);
  }
  function write(d){
    if(repeatMemory){
      repeatMemory=merge(repeatMemory,d);
      try{saveRepeat(repeatMemory);healthy=true;}catch(_){healthy=false;}
      listeners.forEach(fn=>fn());return healthy;
    }
    memory=merge(loadSaved(),d);
    try{saved.setItem(savedKey,JSON.stringify(memory));healthy=true;}catch(_){healthy=false;}
    listeners.forEach(fn=>fn());return healthy;
  }
  const mine=d=>d.dig[ACTIVE]||(d.dig[ACTIVE]=record());
  function hit(){if(!eligible())return false;const d=load(),s=mine(d);if(s.step!=='knock')return false;s.hits++;s.step=phase(s);return write(d);}
  function brush(cells){if(!eligible())return false;const d=load(),s=mine(d);if(s.step!=='brush')return false;s.cleared=[...new Set([...s.cleared,...cells.filter(n=>Number.isInteger(n)&&n>=0&&n<CELLS)])];s.step=phase(s);return write(d);}
  function place(id){if(!eligible()||!PARTS.includes(id))return false;const d=load(),s=mine(d);if(s.step!=='puzzle'||s.placed.includes(id))return false;s.placed.push(id);s.step=phase(s);return write(d);}
  function claim(){
    if(!eligible())return false;const d=load(),s=mine(d);
    if(!['revive','museum'].includes(s.step)||s.hits!==6||coverage(s.cleared)<THRESHOLD||s.placed.length!==PARTS.length)return false;
    if(repeatMemory){
      try{saveRepeat(null);repeatMemory=null;healthy=true;return true;}
      catch(_){healthy=false;listeners.forEach(fn=>fn());return false;}
    }
    s.step='museum';if(!d.museum.includes(ACTIVE))d.museum.push(ACTIVE);return write(d);
  }
  const notify=()=>{load();listeners.forEach(fn=>fn());};
  addEventListener('storage',e=>{if(e.key===savedKey||e.key===null)notify();});
  // owned(id) is read-only: the codex uses it for the gold "化石已挖到" mark.
  const owned=id=>loadSaved().museum.includes(id);
  window.DinoFossils=Object.freeze({KEY,PARTS:Object.freeze(PARTS),CELLS,THRESHOLD,ACTIVE,PREVIEW,STANDALONE,coverage,eligible,load,hit,brush,place,claim,owned,startRepeat,resumeRepeat,hasRepeat:()=>!!repeatRecord(),isRepeating:()=>!!repeatMemory,storageOK:()=>healthy,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
})();
