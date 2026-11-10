/* The journey trials share one new key. Existing game keys are read, never rewritten. */
(() => {
  'use strict';
  const KEY='dino-math-island-journey-v1', LEGACY='dino-math-island-completed-v4';
  const ROUTE=Object.freeze([76,77,78]);
  const ROUTES=Object.freeze({cedar:ROUTE,waterfall:Object.freeze([79,80,81])});
  const levels=Object.values(ROUTES).flat();
  const config={76:[3,4],77:[6,3],78:[1,4]};
  const shareConfig={79:[4,2,2],80:[6,2,3],81:[6,3,2]};
  const routeFor=id=>Object.keys(ROUTES).find(name=>ROUTES[name].includes(id));
  const listeners=new Set();
  const pendingAttempts=new Set();
  let memory=null, healthy=true;
  const blank=()=>({version:1,completedLevels:[],attempts:{},currentLevelId:76,currentByRoute:{cedar:76,waterfall:79},cedarDiscovery:false,waterfallDiscovery:false});
  function normalize(value){
    const d=blank();if(!value||value.version!==1)return d;
    d.completedLevels=Array.isArray(value.completedLevels)?[...new Set(value.completedLevels.filter(id=>levels.includes(id)))]:[];
    if(value.attempts&&typeof value.attempts==='object'&&!Array.isArray(value.attempts))d.attempts={...value.attempts};
    if(levels.includes(value.currentLevelId))d.currentLevelId=value.currentLevelId;
    Object.entries(ROUTES).forEach(([name,route])=>{
      // Older v1 records had only one currentLevelId; migrate in memory, without
      // writing on page load or allowing the other route to steal its position.
      const current=value.currentByRoute?.[name];
      if(route.includes(current))d.currentByRoute[name]=current;
      else if(route.includes(d.currentLevelId))d.currentByRoute[name]=d.currentLevelId;
      d[`${name}Discovery`]=value[`${name}Discovery`]===true&&route.every(id=>d.completedLevels.includes(id));
    });
    return d;
  }
  function discoveries(d){Object.entries(ROUTES).forEach(([name,route])=>{d[`${name}Discovery`]=route.every(id=>d.completedLevels.includes(id));});}
  function read(){
    try{
      const raw=localStorage.getItem(KEY), disk=raw?normalize(JSON.parse(raw)):null;
      if(healthy||!memory)return disk||normalize(memory);
      // A quota failure does not prevent another tab from making progress.
      // Keep unsaved local attempts, but continue receiving its completions.
      const local=normalize(memory), merged=normalize(disk||local);
      merged.completedLevels=[...new Set([...local.completedLevels,...merged.completedLevels])].sort((a,b)=>a-b);
      merged.attempts={...local.attempts,...merged.attempts};
      pendingAttempts.forEach(id=>{if(local.attempts[id])merged.attempts[id]=local.attempts[id];});
      merged.currentLevelId=local.currentLevelId;
      pendingAttempts.forEach(id=>{const name=routeFor(id);if(name)merged.currentByRoute[name]=local.currentByRoute[name];});
      discoveries(merged);
      memory=merged;
      return normalize(merged);
    }
    catch(_){healthy=false;return normalize(memory);}
  }
  function oldCompleted(){
    try{const values=JSON.parse(localStorage.getItem(LEGACY)||'[]');return new Set(Array.isArray(values)?values.filter(Number.isInteger).map(index=>index+1).filter(id=>levels.includes(id)):[]);}
    catch(_){return new Set();}
  }
  function completed(){return new Set([...read().completedLevels,...oldCompleted()]);}
  function validShare(id,s,allowDone){
    const [total,groups,result]=shareConfig[id];
    if(s?.kind!=='share'||!['build','answer'].includes(s.phase)||!Array.isArray(s.groupCounts)||s.groupCounts.length!==groups)return null;
    if(Array.from(s.groupCounts).some(n=>!Number.isInteger(n)||n<0||n>total)||!Number.isInteger(s.poolRemaining)||s.poolRemaining<0||s.poolRemaining>total)return null;
    if(s.groupCounts.reduce((sum,n)=>sum+n,0)+s.poolRemaining!==total||typeof s.complete!=='boolean')return null;
    if(s.answer!==null&&(!Number.isInteger(s.answer)||s.answer<0))return null;
    if(s.phase==='build'&&(s.answer!==null||s.complete))return null;
    if(s.phase==='answer'&&(s.poolRemaining!==0||!s.groupCounts.every(n=>n===result)))return null;
    if(s.complete&&(!allowDone||s.answer!==result))return null;
    return {kind:'share',phase:s.phase,groupCounts:[...s.groupCounts],poolRemaining:s.poolRemaining,answer:s.answer,complete:s.complete};
  }
  function validSnapshot(id,s,allowDone=false){
    if(shareConfig[id])return validShare(id,s,allowDone);
    if(!config[id]||!s||!Array.isArray(s.filled))return null;
    const [per,groups]=config[id];
    if(s.filled.length!==groups||s.filled.some(n=>!Number.isInteger(n)||n<0||n>per)||!Number.isInteger(s.counted)||s.counted<0||s.counted>groups)return null;
    const filled=[...s.filled];let seenGap=false;
    for(let i=0;i<groups;i++){if(i>0&&filled[i]!==0&&filled[i]!==per)return null;if(seenGap&&filled[i]!==0)return null;if(filled[i]<per)seenGap=true;}
    let phase=s.phase;const full=filled.every(n=>n===per);
    if(!['build','count','answer','done'].includes(phase))return null;
    if(phase==='build'&&s.counted!==0)return null;
    if(phase==='build'&&full)phase='count';
    if(['count','answer','done'].includes(phase)&&!full)return null;
    if(phase==='count'&&s.counted===groups)phase='answer';
    if(['answer','done'].includes(phase)&&s.counted!==groups)return null;
    if(phase==='done'&&!allowDone)return null;
    return {phase,filled,counted:s.counted};
  }
  function notify(){listeners.forEach(fn=>fn());}
  function write(d,touchedId){
    const proposed=normalize(d), local=normalize(memory);
    let disk=blank(),hasDisk=false;
    try{const raw=localStorage.getItem(KEY);hasDisk=!!raw;disk=normalize(JSON.parse(raw||'null'));}
    catch(_){healthy=false;}
    // Re-read just before writing: only this action's attempt may replace the
    // latest disk snapshot; another tab's completed lessons are monotonic.
    const merged=normalize(proposed);
    merged.completedLevels=[...new Set([...local.completedLevels,...proposed.completedLevels,...disk.completedLevels])].sort((a,b)=>a-b);
    merged.attempts={...local.attempts,...disk.attempts};
    merged.attempts[touchedId]=proposed.attempts[touchedId];
    merged.currentByRoute={...(hasDisk?disk:local).currentByRoute};
    const name=routeFor(touchedId);merged.currentByRoute[name]=proposed.currentByRoute[name];
    discoveries(merged);
    memory=merged;
    try{localStorage.setItem(KEY,JSON.stringify(memory));healthy=true;pendingAttempts.clear();notify();return true;}
    catch(_){healthy=false;pendingAttempts.add(touchedId);notify();return false;}
  }
  function saveAttempt(id,s){
    id=Number(id);const valid=validSnapshot(id,s,completed().has(id));if(!valid)return false;
    const d=read();d.attempts[id]=valid;d.currentLevelId=id;d.currentByRoute[routeFor(id)]=id;return write(d,id);
  }
  function complete(id,s){
    id=Number(id);const valid=validSnapshot(id,s,true);if(!valid||(valid.kind==='share'?!valid.complete:valid.phase!=='done'))return false;
    const d=read();d.completedLevels=[...new Set([...d.completedLevels,...oldCompleted(),id])].sort((a,b)=>a-b);
    const name=routeFor(id);d.attempts[id]=valid;d.currentLevelId=ROUTES[name].find(n=>!d.completedLevels.includes(n))||id;d.currentByRoute[name]=d.currentLevelId;
    return write(d,id);
  }
  function snapshot(id){const d=read();return validSnapshot(Number(id),d.attempts[id],completed().has(Number(id)));}
  function routeDone(name){const route=ROUTES[name],done=completed();return Array.isArray(route)&&route.every(id=>done.has(id));}
  function unlocked(name){return name==='cedar'||name==='waterfall'&&routeDone('cedar')||name==='summit'&&routeDone('waterfall');}
  function nextLevel(name='cedar'){const route=ROUTES[name];if(!Array.isArray(route))return null;const done=completed(),current=read().currentByRoute[name];return route.includes(current)&&!done.has(current)?current:route.find(id=>!done.has(id))??null;}
  function refresh(){memory=read();notify();}
  window.addEventListener('storage',e=>{if(e.key===KEY||e.key===LEGACY||e.key===null)refresh();});
  window.addEventListener('pageshow',refresh);
  window.addEventListener('focus',refresh);
  window.DinoJourneyStore=Object.freeze({KEY,ROUTE,ROUTES,snapshot,saveAttempt,complete,completed,nextLevel,routeDone,unlocked,storageOK:()=>healthy,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
})();
