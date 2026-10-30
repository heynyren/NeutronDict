/* Native-polled recovery after an ad; never a general autoplay loop. */
(function(){
"use strict";
const host=location.hostname.toLowerCase().replace(/\.$/,"");
if(location.protocol!=="https:"||!(host==="youtube.com"||host.endsWith(".youtube.com")))return false;
if(window.__rakuAdResume)return true;
let id="",wasPlaying=false,hadAd=false,wanted=false,deadline=0,lastTry=0,blocked=false,allow=false;
const video=()=>document.querySelector("#movie_player video,.html5-video-player video,video");
const isAd=()=>!!document.querySelector(".html5-video-player.ad-showing,.html5-video-player.ad-interrupting,#movie_player.ad-showing,#movie_player.ad-interrupting");
const videoId=()=>{try{const u=new URL(location.href);return u.searchParams.get("v")||u.pathname;}catch(_){return"";}};
function cancel(){wanted=false;deadline=0;hadAd=false;wasPlaying=false;blocked=true;}
function command(playing){if(!playing)cancel();else{blocked=false;wanted=true;wasPlaying=true;}}
function reset(next){id=next;wasPlaying=false;hadAd=false;wanted=false;deadline=0;lastTry=0;blocked=false;}
function tick(backgroundAllowed){
 allow=backgroundAllowed===true;
 const next=videoId();if(next!==id)reset(next);
 const v=video(),enabled=window.__dualSubAdSkip?.config?.ads===true;
 if(!v||!enabled){deadline=0;hadAd=false;wasPlaying=false;return"idle";}
 const ad=isAd(),now=Date.now();
 if(ad){
  if(!hadAd){wanted=!blocked&&(wasPlaying||!v.paused);hadAd=true;}
  if(!v.paused&&!blocked)wanted=true;
  deadline=0;
  return"ad";
 }
 if(hadAd){hadAd=false;deadline=wanted&&!blocked?now+15000:0;lastTry=0;}
 if(!v.paused&&!v.ended){wasPlaying=true;blocked=false;deadline=0;return"playing";}
 if(!deadline){wasPlaying=false;return"idle";}
 if(!allow||blocked||now>deadline){deadline=0;wanted=false;wasPlaying=false;return"idle";}
 // Buffering and seeks may finish later; the deadline remains bounded.
 if(!v.ended&&v.readyState>=2&&!v.seeking&&now-lastTry>=1000){
  lastTry=now;
  try{const request=v.play();if(request?.catch)request.catch(()=>{});}catch(_){}
 }
 return"recovering";
}
// Capture an intentional pause on YouTube's own controls before the following media events.
window.addEventListener("pointerdown",event=>{
 if(!event.isTrusted)return;
 const target=event.target?.closest?.('.ytp-play-button,button[aria-label]');
 if(!target)return;
 const label=target.getAttribute("aria-label")||"";
 if(!target.classList.contains("ytp-play-button")&&!/pause|tạm dừng|一時停止|暂停/i.test(label))return;
 const v=video();if(v)command(v.paused);
},true);
window.addEventListener("keydown",event=>{
 if(!event.isTrusted||event.repeat||![" ","k","K","MediaPlayPause","MediaPause"].includes(event.key))return;
 const tag=event.target?.tagName;
 if(["INPUT","TEXTAREA","SELECT"].includes(tag)||event.target?.isContentEditable)return;
 const v=video();if(v)command(event.key==="MediaPause"?false:v.paused);
},true);
window.addEventListener("play",event=>{
 if(event.target===video()&&!isAd()){wasPlaying=true;blocked=false;}
},true);
window.__rakuAdResume={tick,command,cancel};
return true;
})();