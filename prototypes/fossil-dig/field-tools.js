(() => {
  'use strict';
  window.createFossilFieldTool=({tool,root,board,activeStage,attempt,status,audio,rockSprite})=>{
    const {variant}=tool;
    let rendered=-1,timers=[],frame=0;
    const control=(label,run)=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=label;
      if(run)button.onclick=()=>{if(activeStage()===rendered)run(button);};
      return button;
    };
    const element=(tag,className)=>{
      const el=document.createElement(tag);el.className=className;return el;
    };
    const pos=(el,x,y)=>{el.style.setProperty('--x',x+'%');el.style.setProperty('--y',y+'%');};
    const stop=()=>{timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(frame);frame=0;};
    const solve=button=>attempt(rendered,tool.answers[rendered],button);
    const bottom=()=>{
      const group=element('div','site-tool-controls');root.append(group);return group;
    };
    function rope(stage){
      const [x,y,dx,dy,direction]=tool.rounds[stage],length=Math.hypot(dx-x,dy-y);
      const line=element('div','rope-line');
      pos(line,x,y);line.style.setProperty('--length',length+'%');
      line.style.setProperty('--angle',Math.atan2(dy-y,dx-x)+'rad');
      const target=element('span','rope-target');target.textContent='➜';
      pos(target,dx,dy);target.style.setProperty('--angle',Math.atan2(dy-y,dx-x)+'rad');
      target.setAttribute('aria-hidden','true');
      const grip=control('绳环');
      grip.className='site-point rope-grip';pos(grip,x,y);
      grip.setAttribute('aria-label',direction+'拉绳环');
      let pull=null,turns=0;
      grip.onpointerdown=e=>{
        if(activeStage()!==stage||pull||e.button!==0)return;
        grip.setPointerCapture(e.pointerId);
        pull={pointer:e.pointerId,x:e.clientX,y:e.clientY,done:false};
      };
      grip.onpointermove=e=>{
        if(pull?.pointer!==e.pointerId||activeStage()!==stage||pull.done)return;
        const width=board.getBoundingClientRect().width,px=(e.clientX-pull.x)*100/width,py=(e.clientY-pull.y)*100/width;
        const travel=(px*(dx-x)+py*(dy-y))/length,cross=Math.abs(px*(dy-y)-py*(dx-x))/length;
        const amount=Math.min(length,Math.max(0,travel))/length;
        pos(grip,x+(dx-x)*amount,y+(dy-y)*amount);
        if(travel>=length*.73&&cross<13){pull.done=true;solve(grip);}
      };
      function release(e){
        if(pull?.pointer!==e.pointerId)return;
        if(!pull.done&&activeStage()===stage)status('沿虚线把绳环拉到箭头附近。');
        pull=null;pos(grip,x,y);
      }
      grip.onpointerup=release;grip.onpointercancel=release;grip.onlostpointercapture=release;
      const crank=control('分步收绳',button=>{
        if(++turns>=3){turns=0;solve(button);return;}
        status(`绳索已收紧 ${turns} / 3`);
        pos(grip,x+(dx-x)*turns/3,y+(dy-y)*turns/3);
      });
      root.append(line,target,grip);bottom().append(crank);
    }
    function rhythm(stage){
      const pattern=tool.rounds[stage],names=['圆石','方石','三角石','菱石'];
      const symbols=['●','■','▲','◆'];
      let played=0,watching=false,heard=false;
      const pins=tool.points.map(([x,y],i)=>{
        const pin=control(symbols[i],button=>{
          if(watching||!heard){status('先看完这一轮敲击。');return;}
          if(pattern[played]!==i){played=0;status('顺序不同。再看一遍，再从第一下开始。');return;}
          audio.synth('knock');
          if(++played===pattern.length){played=0;solve(button);}
          else status(`已经敲对 ${played} / ${pattern.length} 下`);
        });
        pin.className='site-point rhythm-point';
        pin.dataset.tone=i;pin.setAttribute('aria-label','敲'+names[i]);pos(pin,x,y);root.append(pin);
        return pin;
      });
      const replay=control('看敲击顺序',()=>{
        if(watching)return;
        watching=true;played=0;
        pattern.forEach((i,n)=>{
          timers.push(setTimeout(()=>{
            pins.forEach(pin=>pin.classList.remove('lit'));
            pins[i].classList.add('lit');audio.synth('knock');status(`第 ${n+1} 下 · ${names[i]}`);
          },n*425));
        });
        timers.push(setTimeout(()=>{
          watching=false;heard=true;pins.forEach(pin=>pin.classList.remove('lit'));
          status('轮到你了，按刚才的顺序敲。');
        },pattern.length*425));
      });
      bottom().append(replay);
      // Playback starts on request so a child can look at the whole board first.
    }
    function brace(stage){
      const lengths=[48,71,94],labels=['短撑杆','中撑杆','长撑杆'],answer=tool.answers[stage];
      const slot=element('div','brace-slot');
      pos(slot,...tool.points[stage]);slot.style.setProperty('--span',lengths[answer]+'px');
      slot.setAttribute('role','img');slot.setAttribute('aria-label',labels[answer].slice(0,1)+'裂缝');
      root.append(slot);
      const group=bottom();
      labels.forEach((name,i)=>{
        const button=control(name,el=>{
          if(i!==answer){status(i<answer?'撑杆还够不到裂缝两头。':'撑杆太长，放不进裂缝。');return;}
          solve(el);
        });
        button.className='brace-choice';button.style.setProperty('--span',lengths[i]+'px');group.append(button);
      });
    }
    function lever(stage){
      const answer=tool.answers[stage],y=tool.rounds[stage];
      const beam=element('div','lever-beam');pos(beam,50,y);root.append(beam);
      const block=element('span','lever-block');
      block.style.setProperty('--rock',`url("${rockSprite}")`);pos(block,answer===0?21:79,y-9);
      block.setAttribute('role','img');block.setAttribute('aria-label',answer===0?'左边的重石':'右边的重石');root.append(block);
      [29,50,71].forEach((x,i)=>{
        const button=control('▲',el=>{
          if(i!==answer){status('这里离重石太远。把支点往重石那边挪。');return;}
          solve(el);
        });
        button.className='site-point lever-point';pos(button,x,y+10);
        button.setAttribute('aria-label',['左边的支点','中间的支点','右边的支点'][i]);root.append(button);
      });
    }
    function inflate(stage){
      const [x,y,duration]=tool.rounds[stage],meter=element('progress','bag-meter');
      meter.max=1;meter.value=0;meter.setAttribute('aria-label','气囊充气进度');
      const bag=element('div','lift-bag');pos(bag,x,y);
      const button=control('按住充气');button.className='bag-pump';
      let started=0,holding=false;
      function end(showHint){
        if(!holding)return;
        holding=false;cancelAnimationFrame(frame);frame=0;
        meter.value=0;bag.style.setProperty('--fill',0);
        if(showHint&&activeStage()===stage)status('气还没充满，再按住一会儿。');
      }
      function tick(time){
        if(activeStage()!==stage){end(false);return;}
        const progress=Math.max(0,Math.min(1,(time-started)/duration));
        meter.value=progress;bag.style.setProperty('--fill',progress);
        if(progress<1){frame=requestAnimationFrame(tick);return;}
        end(false);solve(button);
      }
      function start(){
        if(holding||activeStage()!==stage)return;
        holding=true;started=performance.now();frame=requestAnimationFrame(tick);
      }
      button.onpointerdown=e=>{if(e.button===0){button.setPointerCapture(e.pointerId);start();}};
      button.onpointerup=()=>end(true);
      button.onpointercancel=button.onlostpointercapture=()=>end(false);
      button.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)start();}};
      button.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();end(true);}};
      button.onblur=()=>end(false);
      root.append(bag);
      bottom().append(meter,button);
    }
    const tools={rope,rhythm,brace,lever,inflate};
    return {
      render(stage){if(stage===rendered)return;stop();rendered=stage;root.replaceChildren();tools[variant](stage);},
      reset(){stop();rendered=-1;root.replaceChildren();}
    };
  };
})();
