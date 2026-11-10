/* Crack count is derived from the current route completion set, never stored. */
(() => {
  const route=new URLSearchParams(location.search).get('journey'),names={cedar:'营地',waterfall:'瀑布岩台'};
  const store=window.DinoJourneyStore;if(!names[route]||!store?.ROUTES[route])return;
  document.body.classList.add('fossil-route');
  const script=new URL(document.currentScript.src),art=new URL('./art/fossil-egg.webp?v=20261027-f1-r4',script).href;
  const button=document.createElement('button');button.id='fossilEgg';button.type='button';button.setAttribute('aria-label','查看营地化石蛋进度');
  button.innerHTML=`<img src="${art}" alt="未揭晓的实心化石蛋"><svg viewBox="0 0 100 100" aria-hidden="true"><path data-crack="1" d="M32 16 39 27 34 35 45 43 41 50"/><path data-crack="2" d="M77 35 66 43 70 52 57 59 62 68"/><path data-crack="3" d="M27 63 38 69 34 79 47 84 44 94"/></svg><span class="egg-count"></span>`;
  const header=document.querySelector('header');header.append(button);
  const note=document.createElement('p');note.id='eggNote';note.setAttribute('role','status');note.hidden=true;document.body.append(note);
  let previous=null,timer;
  function update(){const done=store.completed(),n=store.ROUTES[route].filter(id=>done.has(id)).length;button.dataset.cracks=n;button.querySelectorAll('[data-crack]').forEach(p=>p.style.display=Number(p.dataset.crack)<=n?'':'none');button.querySelector('.egg-count').textContent=n+'/3';button.setAttribute('aria-label',`${names[route]}化石蛋，已经完成${n}关，共3关`);if(previous!==null&&n>previous){button.classList.remove('crack-pop');void button.offsetWidth;button.classList.add('crack-pop');}previous=n;}
  button.onclick=()=>{update();note.textContent=previous<3?`再完成 ${3-previous} 关就能挖开啦`:'3 关都完成啦，可以去挖化石了！';note.hidden=false;clearTimeout(timer);timer=setTimeout(()=>note.hidden=true,3000);};
  update();store.subscribe(update);
})();
