(() => {
 const cover=document.querySelector('.brand-cover'), image=cover.querySelector('img'), video=document.querySelector('#cover-video');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let timer, visible=true, failed=false, showingVideo=true;
 video.muted=true;
 function stop(){clearTimeout(timer);timer=null;video.pause();}
 function showImage(){stop();showingVideo=false;video.hidden=true;image.hidden=false;if(!preference.matches&&!failed&&!document.hidden&&visible)timer=setTimeout(showVideo,4000);}
 function run(){
  if(preference.matches){showImage();return;}
  if(document.hidden||!visible){stop();return;}
  if(!showingVideo){showImage();return;}
  video.play().catch(()=>{failed=true;showImage();});
 }
 function showVideo(){stop();if(preference.matches||failed){showImage();return;}showingVideo=true;image.hidden=true;video.hidden=false;video.currentTime=0;run();}
 video.addEventListener('ended',showImage);
 video.addEventListener('error',()=>{failed=true;showImage();});
 document.addEventListener('visibilitychange',run);
 preference.addEventListener('change',()=>preference.matches?showImage():showVideo());
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;run();},{threshold:0.1}).observe(cover);
 showVideo();
})();
