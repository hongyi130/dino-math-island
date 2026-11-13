/* Existing local foley, existing gallery cue, and synthesized UI feedback. */
(() => {
  const base=new URL('../../assets/sfx/',document.currentScript.src);
  window.createFossilAudio=(voiceInfo)=>{
    // voiceInfo = fossils.json voice {file,start,end}; the first cue of the fossil's own gallery recording. Default keeps the brachiosaur.
    const cueOf=()=>voiceInfo?{time:voiceInfo.start,end:voiceInfo.end,text:voiceInfo.text}:window.DINO_VOICE_CUES['gallery-brachio.m4a'][0],voiceFile=voiceInfo?.file||'gallery-brachio.m4a';
    let context,enabled=true,lastBrush=0,narrating=false,voiceNode=null,voiceResolve=null,voiceStarted=0,voicePromise=null,lastVoice=null,voiceEpoch=0;
    const voices=new Set(),nodes=new Set(),island=window.createIslandAudio({assetBase:base.href});
    const speechActive=()=>narrating||window.speechSynthesis?.speaking||[...document.querySelectorAll('audio')].some(a=>!a.paused&&/\/voice\//.test(a.currentSrc||a.src));
    function stopFX(){island.reset();nodes.forEach(n=>{try{n.stop();}catch(_){}});nodes.clear();}
    function stopVoice(reason='cancelled'){if(!voiceNode)return;const n=voiceNode;voiceNode=null;n.onended=null;try{n.stop();}catch(_){}lastVoice={...lastVoice,completed:false,reason,playedMs:(context.currentTime-voiceStarted)*1000,end:performance.now()};narrating=false;island.setNarrating(false);voiceResolve?.(lastVoice);voiceResolve=null;}
    function stop(){voiceEpoch++;stopFX();stopVoice();}
    function ensureContext(){if(!context){const C=window.AudioContext||window.webkitAudioContext;if(C)context=new C();}return context;}
    function prepareVoice() {
      if (voiceInfo?.silent) return Promise.resolve(null);
      if (!voicePromise) {
        voicePromise = (async () => {
          const c = ensureContext();
          if (!c) return null;
          const response = await fetch(new URL('../voice/' + voiceFile, base));
          if (!response.ok) throw Error('voice unavailable');
          return c.decodeAudioData(await response.arrayBuffer());
        })().catch(() => {
          // A failed preload must be retried when the child reaches the reveal.
          voicePromise = null;
          return null;
        });
      }
      return voicePromise;
    }
    async function narrate(onStart){const epoch=++voiceEpoch,buffer=await prepareVoice();if(epoch!==voiceEpoch)return {completed:false,reason:"cancelled",playedMs:0};if(!buffer||!enabled||document.hidden){lastVoice={completed:false,reason:!enabled?'muted':'unavailable',playedMs:0};return lastVoice;}stopFX();stopVoice();await context.resume();if(epoch!==voiceEpoch)return {completed:false,reason:'cancelled',playedMs:0};const cue=cueOf(),duration=cue.end-cue.time;voiceNode=context.createBufferSource();voiceNode.buffer=buffer;voiceNode.connect(context.destination);voiceStarted=context.currentTime;narrating=true;island.setNarrating(true);lastVoice={start:performance.now(),offset:cue.time,endOffset:cue.end,durationMs:duration*1000,completed:false};return new Promise(resolve=>{voiceResolve=resolve;voiceNode.onended=()=>{voiceNode=null;narrating=false;island.setNarrating(false);lastVoice={...lastVoice,end:performance.now(),playedMs:duration*1000,completed:true,reason:'cue-ended'};voiceResolve=null;resolve(lastVoice);};voiceNode.start(voiceStarted,cue.time,duration);onStart?.(cue);});}
    function allowed(){return enabled&&!document.hidden&&!speechActive();}
    function unlock(){island.unlock();ensureContext();if(enabled&&!document.hidden)context?.resume().catch(()=>{});}
    function file(name){if(!allowed())return;island.setNarrating(false);island.foley(name);}
    function synth(kind){if(!allowed())return;unlock();if(!context)return;const now=context.currentTime,g=context.createGain();g.connect(context.destination);
      const duration=kind==='knock'?.09:kind==='snap'?.07:.55;
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(kind==='glow'?.075:.12,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
      let n;if(kind==='knock'){const b=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),v=b.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=(Math.random()*2-1)*(1-i/v.length);n=context.createBufferSource();n.buffer=b;const f=context.createBiquadFilter();f.type='lowpass';f.frequency.value=700;n.connect(f);f.connect(g);}else{n=context.createOscillator();n.type='sine';n.frequency.setValueAtTime(kind==='snap'?460:880,now);n.frequency.exponentialRampToValueAtTime(kind==='snap'?180:1320,now+duration);n.connect(g);}nodes.add(n);n.onended=()=>{nodes.delete(n);g.disconnect();};n.start(now);n.stop(now+duration);
    }
    // Same-page speech always wins, including a voice that begins during a sound.
    document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement&&/\/voice\//.test(e.target.currentSrc||e.target.src)){voices.add(e.target);stop();}},true);
    ['pause','ended','error'].forEach(t=>document.addEventListener(t,e=>voices.delete(e.target),true));
    const guard=setInterval(()=>{if(document.hidden||voices.size||window.speechSynthesis?.speaking)stop();else if(narrating)stopFX();},60);
    addEventListener('pagehide',()=>{stop();context?.suspend();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    return {unlock,stop,synth,prepareVoice,narrate,setNarrating(v){narrating=!!v;island.setNarrating(v);if(v)stop();},setEnabled(v){enabled=!!v;island.setEnabled(v);if(!enabled)stop();},get enabled(){return enabled;},rustle(){if(performance.now()-lastBrush>900){lastBrush=performance.now();file('leaf-rustle',.18);}},revive(){file(voiceInfo?.file==='gallery-raptor.m4a'?'call-small':voiceInfo?.file==='gallery-trex.m4a'?'call-theropod':'call-sauropod',.42);},step(){file('footstep-grass',.18);},status(){return {enabled,narrating,lastVoice,speaking:!!speechActive(),active:[...document.querySelectorAll('#soundscape audio')].filter(a=>!a.paused).length,synthActive:nodes.size};}};
  };
})();
