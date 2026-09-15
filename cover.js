(() => {
 const cover=document.querySelector('.brand-cover'), image=cover.querySelector('img'), video=document.querySelector('#cover-video');
 const pause=document.querySelector('#cover-pause'), label=document.querySelector('#cover-label'), status=document.querySelector('#cover-status');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let index=0, paused=preference.matches, timer, visible=true;
 video.muted=true;
 function clear(){clearTimeout(timer);timer=null;}
 function update(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Play cover slideshow':'Pause cover slideshow');}
 function run(){
  clear(); if(paused||document.hidden||!visible){video.pause();return;}
  if(index===0)timer=setTimeout(()=>show(1),4000);
  else video.play().catch(()=>{paused=true;update();status.hidden=false;status.textContent='Press play to start the video.';});
 }
 function show(next){clear();video.pause();index=(next+2)%2;image.hidden=index!==0;video.hidden=index!==1;status.hidden=true;label.textContent=index===0?'1 / 2 · Cover':'2 / 2 · Video';if(index===1)video.currentTime=0;run();}
 document.querySelector('#cover-previous').addEventListener('click',()=>show(index-1));
 document.querySelector('#cover-next').addEventListener('click',()=>show(index+1));
 pause.addEventListener('click',()=>{paused=!paused;status.hidden=true;update();run();});
 video.addEventListener('ended',()=>{if(!paused)show(0);});
 video.addEventListener('error',()=>{show(0);paused=true;clear();update();status.hidden=false;status.textContent='Video could not load. Please try again later.';});
 document.addEventListener('visibilitychange',run);
 preference.addEventListener('change',()=>{paused=preference.matches;update();run();});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;run();},{threshold:0.1}).observe(cover);
 update();run();
})();
