import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const browser=await chromium.launch({headless:true});
const source=readFileSync("android/integration/youtube-ad-resume.js","utf8");
try{
 const page=await browser.newPage();
 await page.route("https://m.youtube.com/**",r=>r.fulfill({contentType:"text/html",body:'<div id="movie_player" class="html5-video-player"><video></video></div>'}));
 async function fresh(){
  await page.goto("https://m.youtube.com/watch?v=aaaaaaaaaaa");
  await page.evaluate(()=>{
   window.now=100000;Date.now=()=>window.now;
   window.__dualSubAdSkip={config:{ads:true}};
   window.state={paused:false,ended:false,readyState:4,seeking:false,plays:0,fail:false};
   window.bindVideo=()=>{
    const v=document.querySelector("video");
    for(const k of ["paused","ended","readyState","seeking"])Object.defineProperty(v,k,{configurable:true,get:()=>window.state[k]});
    v.play=()=>{window.state.plays++;if(window.state.fail)return Promise.reject(Error("temporary"));window.state.paused=false;return Promise.resolve();};
   };window.bindVideo();
  });
  await page.evaluate(source);
 }
 const tick=allow=>page.evaluate(a=>window.__rakuAdResume.tick(a),allow);
 const ad=on=>page.evaluate(on=>document.querySelector("#movie_player").classList.toggle("ad-showing",on),on);
 await fresh();assert.equal(await tick(false),"playing");
 await ad(true);assert.equal(await tick(true),"ad");
 await page.evaluate(()=>window.state.paused=true);await ad(false);
 assert.equal(await tick(true),"recovering");assert.equal(await page.evaluate(()=>window.state.plays),1);
 assert.equal(await tick(true),"playing");
 // Native Pause/notification/earphones cancel recovery before video.pause().
 await fresh();await tick(false);await ad(true);await tick(true);
 await page.evaluate(()=>{window.__rakuAdResume.command(false);window.state.paused=true;});await ad(false);
 assert.equal(await tick(true),"idle");assert.equal(await page.evaluate(()=>window.state.plays),0);
 // An ad may replace the DOM video; recovery follows the same watch URL only.
 await fresh();await tick(false);await ad(true);await tick(true);
 await page.evaluate(()=>{document.querySelector("video").remove();document.querySelector("#movie_player").appendChild(document.createElement("video"));window.state.paused=true;window.bindVideo();});await ad(false);
 await tick(true);assert.equal(await page.evaluate(()=>window.state.plays),1);
 // Navigation to another video must clear the pending intent.
 await fresh();await tick(false);await ad(true);await tick(true);await ad(false);
 await page.evaluate(()=>{history.replaceState(null,"","/watch?v=bbbbbbbbbbb");window.state.paused=true;});
 assert.equal(await tick(true),"idle");assert.equal(await page.evaluate(()=>window.state.plays),0);
 // The Study clip and foreground UI are allowed to own a pause.
 await fresh();await tick(false);await ad(true);await tick(true);await ad(false);await page.evaluate(()=>window.state.paused=true);
 assert.equal(await tick(false),"idle");assert.equal(await tick(true),"idle");
 // Wait for buffering/seeking, retry at most once per second, then expire.
 await fresh();await tick(false);await ad(true);await tick(true);await ad(false);
 await page.evaluate(()=>{window.state.paused=true;window.state.readyState=1;});
 assert.equal(await tick(true),"recovering");assert.equal(await page.evaluate(()=>window.state.plays),0);
 await page.evaluate(()=>{window.state.readyState=4;window.state.seeking=true;});await tick(true);
 assert.equal(await page.evaluate(()=>window.state.plays),0);
 await page.evaluate(()=>{window.state.seeking=false;window.state.fail=true;});await tick(true);await tick(true);
 assert.equal(await page.evaluate(()=>window.state.plays),1);
 await page.evaluate(()=>window.now+=1000);await tick(true);assert.equal(await page.evaluate(()=>window.state.plays),2);
 await page.evaluate(()=>window.now+=15001);assert.equal(await tick(true),"idle");assert.equal(await page.evaluate(()=>window.state.plays),2);
 // Disabled ad skipping and ended content do not restart anything.
 for(const end of [false,true]){
  await fresh();await tick(false);await ad(true);await tick(true);await ad(false);
  await page.evaluate(end=>{window.state.paused=true;if(end)window.state.ended=true;else window.__dualSubAdSkip.config.ads=false;},end);
  assert.equal(await tick(true),"idle");assert.equal(await page.evaluate(()=>window.state.plays),0);
 }
 await page.route("https://example.org",r=>r.fulfill({contentType:"text/html",body:"<p>other origin</p>"}));
 await page.goto("https://example.org");assert.equal(await page.evaluate(source),false);
 console.log("Background ads: post-ad playback, manual pause, DOM replacement, video switch, Study/foreground guard, buffering/seeking, bounded retries, quota-off/ended and origin isolation passed.");
}finally{await browser.close();}
