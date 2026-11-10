/* Shared, display-only footer progress. It never decides whether work is correct. */
(() => {
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function progress(kind,{done=0,total=0,unit='只',reverse=false,summary=null,capacity=false,left='还差',leftUnit=unit}={}) {
    total=Math.max(0,Math.floor(total));done=Math.max(0,Math.min(total,Math.floor(done)));
    if(!total)return '';
    const image=window.DINO_CHARACTERS?.[kind]?.image;
    if(!image)return '';
    // Large counts show the current ten-item segment, with an explicit total.
    const first=Math.floor(Math.max(0,done-(done===total?1:0))/10)*10;
    const count=Math.min(10,total-first),remaining=total-done;
    return `<div class="v3-progress" role="img" aria-label="${summary===null?`已完成 ${done} ${esc(unit)}，共 ${total} ${esc(unit)}，${esc(left)} ${remaining} ${esc(leftUnit)}`:esc(summary)}">
      <div class="v3-herd" style="--v3-columns:${Math.min(5,count)}" aria-hidden="true">${Array.from({length:count},(_,i)=>`<img class="v3-progress-dino ${(reverse?i+first<done:i+first>=done)?'is-silhouette':''}" src="./assets/${esc(image)}" alt="" draggable="false">`).join('')}</div>
      <span class="v3-remaining ${summary===null?'':'has-summary'}">${summary===null?`${esc(left)} <b>${remaining}</b> ${esc(leftUnit)}`:esc(summary)}${total>10?`<small>${capacity?`图示当前第 ${first+1}–${first+count} ${esc(unit)}`:`已完成 ${done} / ${total} ${esc(unit)}<br>图示第 ${first+1}–${first+count} ${esc(unit)}`}</small>`:''}</span></div>`;
  }
  // Move existing input controls out of scrollable teaching models. Event
  // delegation remains on the same activity root; engines and values are unchanged.
  function dockControls(root) {
    const footer=root.querySelector?.('.challenge-footer');
    if(!footer)return;
    const stage=root.querySelector('.k-stage');
    if(stage){
      const dock=document.createElement('div');dock.className='v3-inputs';
      const controls=[...stage.querySelectorAll('.k-adjust,.k-percent-actions,.k-nav')];
      controls.forEach(el=>dock.appendChild(el));
      // Full-size fences remain on the terrain. Their four identical toggle
      // actions move beside the check control, labelled by the corresponding edge.
      const fences=[...stage.querySelectorAll('button.k-fence')];
      if(fences.length){
        const edges=document.createElement('div');edges.className='v3-edge-inputs';
        fences.forEach((el,i)=>{
          const display=document.createElement('span');display.className=el.className;
          display.textContent=el.textContent;display.setAttribute('aria-hidden','true');
          el.replaceWith(display);el.className='v3-edge-input';
          el.textContent=['↑ 上边','→ 右边','↓ 下边','← 左边'][i]+' '+display.textContent;
          edges.appendChild(el);
        });dock.appendChild(edges);
      }
      if(['area','fraction','decimal'].includes(root.dataset.family)){
        const target=stage.querySelector('.k-target');
        if(target)footer.querySelector('.v3-heading').prepend(target);
      }
      if(dock.childElementCount){footer.prepend(dock);root.classList.add('has-input-dock');}
    }
  }
  window.DinoBottomBar={progress,dockControls};
})();
