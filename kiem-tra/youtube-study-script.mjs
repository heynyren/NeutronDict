import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../android/integration/native/NeutronPlayback.kt',import.meta.url),'utf8');
const template=code.split('internal fun neutronStudyScript')[1].match(/"""([\s\S]*?)"""/)[1];
function script(token=1,rate=1.5){return template.replaceAll('__VIDEO__','dQw4w9WgXcQ').replaceAll('__TOKEN__',String(token)).replaceAll('__START__','42.25').replaceAll('__END__','47.75').replaceAll('__RATE__',String(rate));}
function fixture(options={}){
  let now=0,position=0,serial=0;const timers=new Map(),rejections=[];
  const state={ad:!!options.ad,videoId:options.videoId||'dQw4w9WgXcQ',playCalls:0,pauseCalls:0,seekBlocked:!!options.seekBlocked};
  const video={readyState:options.readyState??4,seeking:false,error:null,duration:100,paused:true,ended:false,muted:true,volume:0,playbackRate:0.75,preservesPitch:false,
    play(){state.playCalls++;this.paused=false;return{catch:fn=>rejections.push(fn)};},
    pause(){state.pauseCalls++;this.paused=true;}};
  Object.defineProperty(video,'currentTime',{get:()=>position,set:value=>{if(!state.seekBlocked)position=value;}});
  const player={getVideoData:()=>({video_id:state.videoId}),unMute:()=>{video.muted=false;}};
  const window={location:new URL(options.url||'https://m.youtube.com/watch?v=dQw4w9WgXcQ')};
  const context=vm.createContext({window,URL,Number,Math,Date:{now:()=>now},
    document:{getElementById:()=>player,querySelector:selector=>selector==='video'?video:selector==='.ad-showing,.ad-interrupting'?(state.ad?{}:null):player},
    setInterval:fn=>{timers.set(++serial,fn);return serial;},clearInterval:id=>timers.delete(id),clearTimeout:()=>{}});
  return{state,video,window,rejections,run:(token=1,rate=1.5)=>vm.runInContext(script(token,rate),context),
    tick:()=>{for(const fn of [...timers.values()])fn();},setNow:value=>{now=value;},setPosition:value=>{position=value;},timerCount:()=>timers.size};
}
{
 const f=fixture();assert.equal(f.run(),'seeking');
 assert.equal(f.video.currentTime,42.25);assert.equal(f.state.playCalls,1);
 assert.equal(f.video.playbackRate,1.5);assert.equal(f.video.preservesPitch,true);assert.equal(f.video.muted,false);
 f.tick();assert.equal(f.window.__neutronStudyClip.status,'playing');
 f.setPosition(47.8);f.tick();
 assert.equal(f.window.__neutronStudyClip.status,'completed');assert.equal(f.video.paused,true);assert.equal(f.timerCount(),0);
 assert.equal(f.video.playbackRate,0.75);assert.equal(f.video.preservesPitch,false);assert.equal(f.video.muted,true);
}
{
 for(const options of [{ad:true},{readyState:0},{videoId:'aaaaaaaaaaa'}]){
  const f=fixture(options);assert.equal(f.run(),'waiting');assert.equal(f.state.playCalls,0);assert.equal(f.video.currentTime,0);
 }
 const f=fixture({url:'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'});assert.equal(f.run(),'cancelled');assert.equal(f.state.playCalls,0);
}
{
 const f=fixture({seekBlocked:true});assert.equal(f.run(),'seeking');assert.equal(f.state.playCalls,0);
 f.setNow(6000);f.tick();assert.equal(f.window.__neutronStudyClip.status,'unavailable');assert.equal(f.state.playCalls,0);assert.equal(f.video.playbackRate,0.75);
}
{
 const f=fixture();f.run();f.tick();f.state.ad=true;f.setPosition(90);f.tick();
 assert.equal(f.window.__neutronStudyClip.status,'playing');
 f.state.ad=false;f.tick();assert.equal(f.video.currentTime,42.25);assert.equal(f.state.playCalls,2);
 f.tick();f.window.location=new URL('https://m.youtube.com/watch?v=aaaaaaaaaaa');f.tick();
 assert.equal(f.window.__neutronStudyClip.status,'cancelled');assert.equal(f.video.paused,true);
}
{
 const f=fixture();f.run(1,1.1);f.tick();f.run(2,1.5);f.tick();
 assert.equal(f.video.paused,false);assert.equal(f.video.playbackRate,1.5);
 f.rejections[0]();
 assert.equal(f.video.paused,false);assert.equal(f.video.playbackRate,1.5);assert.equal(f.window.__neutronStudyClip.token,2);
 f.window.__neutronStudyClip.close();assert.equal(f.video.paused,true);assert.equal(f.video.playbackRate,0.75);
}
console.log('YouTube Study script: bounds, rate/pitch, ads, readiness, origin, seek failure, stale promises passed');
