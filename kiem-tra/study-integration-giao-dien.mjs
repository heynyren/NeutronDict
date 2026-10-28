import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),"android/www",decodeURIComponent(req.url.split("?")[0]));
  try{res.setHeader("Content-Type",file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"text/html");res.end(fs.readFileSync(file));}
  catch(_){res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const browser=await chromium.launch({headless:true});
try{
 const p=await browser.newPage({viewport:{width:393,height:851}});
 const errors=[];p.on("pageerror",e=>errors.push(e.message));
 await p.route(/translate|dictionaryapi|script\.google/,r=>r.abort());
 await p.goto("http://127.0.0.1:"+server.address().port+"/index.html");
 await p.waitForFunction(()=>window.NeutronReady);
 await p.evaluate(async()=>{
   await Store.set("ngu","ja");
   await Store.set("notebook",{"javi:勉強":{word:"勉強",dict:"javi",means:["học"],duong:{nhin:{lv:4,ngay:30,due:Date.now()+30*864e5}},
     src:{cau:"私は毎朝日本語を勉強します。",cauDich:"Tôi học tiếng Nhật mỗi sáng."}}});
 });
 await p.reload();await p.waitForFunction(()=>window.NeutronReady);
 await p.locator("#navSettings").click();
 assert.equal(await p.locator("#navSettings .i svg").isVisible(),true,"Settings has a visible gear while selected");
 assert.equal(await p.locator("#viewSettings #syncBox").count(),1);
 assert.equal(await p.locator("#viewNotebook #syncBox").count(),0);
 assert.equal(await p.locator("#navGrammar").count(),0);
 assert.equal(await p.locator("#newsLanguage option[value=ja]").textContent(),"Tiếng Nhật · 日本語");
 await p.locator("#navStudy").click();
 assert.equal(await p.locator("#navSettings .i svg").isVisible(),true,"Settings has a visible gear while inactive");
 await p.locator("#stStartDuong").click();
 await p.locator('[data-ma="grammar"]').click();
 await p.locator("#stGrammar .np-piece").first().waitFor();
 // The real Android Back handler must exit grammar and leave a usable screen.
 await p.evaluate(()=>window.dispatchEvent(new PopStateEvent("popstate")));
 assert.equal(await p.evaluate(()=>session.queue.length),0);
 assert.equal(await p.locator("#stIdle").isVisible(),true);
 assert.equal(await p.locator("#stGrammar").isVisible(),false);
 await p.locator("#stStartDuong").click();
 await p.locator('[data-ma="grammar"]').click();
 await p.locator("#stGrammar .np-piece").first().waitFor();
 const pieces=await p.evaluate(()=>session.queue[0]._grammar.manh.map(x=>x.text.trim()));
 for(const text of pieces)await p.locator("#stGrammar .np-pieces").nth(1).getByRole("button",{name:text,exact:true}).first().click();
 await p.locator("#stGrammar").getByRole("button",{name:"Kiểm tra",exact:true}).click();
 await p.waitForFunction(()=>document.querySelector("#stGrammar .np-feedback").textContent.includes("đã đóng băng"));
 assert.equal(await p.locator("#stGrammar .np-original").textContent(),"私は毎朝日本語を勉強します。");
 assert.equal(await p.locator("#stGrammar .np-translation").textContent(),"Tôi học tiếng Nhật mỗi sáng.");
 // A mixed session catches the hidden-container bug that grammar-only tests missed.
 await p.evaluate(()=>session.queue.push({...session.queue[0],_d:"nhin"}));
 await p.locator("#stGrammar").getByRole("button",{name:"Tiếp",exact:true}).click();
 assert.equal(await p.locator("#stGrammar").isVisible(),false);
 assert.equal(await p.locator("#stBody").isVisible(),true,"Grammar restores the ordinary card container");
 assert.equal(await p.locator("#stWord").isVisible(),true);
 assert.equal(await p.locator("#stWord").textContent(),"勉強");
 await p.locator("#stReveal").click();
 assert.equal(await p.locator("#stMean").isVisible(),true);
 assert.ok((await p.locator("#stMean").textContent()).includes("học"));
 await p.evaluate(()=>window.dispatchEvent(new PopStateEvent("popstate")));
 assert.equal(await p.locator("#stIdle").isVisible(),true);
 const state=await p.evaluate(async()=>({history:await Store.get("nguPhapSrs"),nb:await getNB(),due:await currentDue()}));
 assert.equal(Object.values(state.history)[0].dongBang,true);
 assert.equal(state.nb["javi:勉強"].duong.nhin.lv,4);
 assert.equal(state.due.some(x=>x._d==="grammar"),false);
 // Use the real Study button/coordinator; only the native video boundary is mocked.
 await p.evaluate(()=>{
   window.__ytRequests=[];window.__studyTts=[];
   window.Capacitor={Plugins:{NeutronMedia:{
     playYouTubeSentence:o=>{window.__ytRequests.push(o);return new Promise(r=>window.__ytResolve=r);},
     cancelYouTubeSentence:async()=>{}
   }}};
   speak=async (...args)=>window.__studyTts.push(args);
   const cau="私は毎朝日本語を勉強します。";
   session={queue:[{key:"javi:勉強",word:"勉強",dict:"javi",means:["học"],_d:"nghe",
     duong:{nghe:{lv:3}},cauNghe:{cau},
     src:{cau,yt:{v:"dQw4w9WgXcQ",t:96,dur:1,sentence:{text:cau,t:94.125,end:99.875}}}}],
     done:0,again:0,deleted:0};
   show("Study");showCard();
 });
 await p.waitForFunction(()=>window.__ytRequests.length===1);
 assert.deepEqual(await p.evaluate(()=>[__ytRequests[0].start,__ytRequests[0].end,__ytRequests[0].rate]),[94.125,99.875,1.4]);
 await p.evaluate(()=>window.__ytResolve({status:"completed"}));
 await p.waitForFunction(()=>document.querySelector("#stNgheNguon").textContent.includes("Đã nghe YouTube gốc"));
 assert.equal(await p.evaluate(()=>session.queue.length),1,"Replay completion keeps the same card");
 assert.equal(await p.evaluate(()=>__studyTts.length),0);
 await p.locator("#stNghePhat").click();
 await p.waitForFunction(()=>window.__ytRequests.length===2);
 await p.evaluate(()=>window.dispatchEvent(new PopStateEvent("popstate")));
 await p.evaluate(()=>window.__ytResolve({status:"unavailable"}));
 await p.waitForTimeout(100);
 assert.equal(await p.evaluate(()=>__studyTts.length),0,"Late failure cannot read a card after Back");
 assert.equal(await p.locator("#stIdle").isVisible(),true);
 // Real adapter: weak JLPT card goes through the notebook write queue.
 await p.evaluate(()=>luuTheYeuJlpt({kieu:"tu",muc:{id:"fixture",w:"練習",r:"れんしゅう",m:"luyện tập"},vd:{j:"毎日日本語を練習します。",v:"Tôi luyện tiếng Nhật hằng ngày."}},"n3"));
 const imported=await p.evaluate(async()=>{const n=await getNB(),x=n["javi:練習"];return {x,paths:Srs.duongMo(x)};});
 assert.ok(imported.x.jlptReviewAt);assert.ok(imported.paths.includes("nghe"));
 assert.equal(imported.x.cauNghe.cau,"毎日日本語を練習します。");
 // A deleted card must neither resurrect nor trap the exam on an unanswerable question.
 const skipped=await p.evaluate(async()=>{
   await capNhat(nb=>{nb["javi:練習"]={...nb["javi:練習"],del:true};});
   const added=await luuTheYeuJlpt({kieu:"tu",muc:{id:"fixture",w:"練習",r:"れんしゅう",m:"luyện tập"}},"n3");
   return {added,deleted:(await getNB())["javi:練習"].del};
 });
 assert.equal(skipped.added,false);assert.equal(skipped.deleted,true);
 assert.deepEqual(errors,[]);
 // Fallback uses real voice.js, mocked provider boundary only.
 const v=await browser.newPage();
 await v.setContent("<html></html>");
 await v.evaluate(()=>{window.voiceCalls=[];window.Capacitor={Plugins:{
   NeutronMedia:{azureSpeech:async()=>({available:false,reason:"quota"})},
   TextToSpeech:{stop:async()=>{},getSupportedVoices:async()=>({voices:[{name:"Japanese offline",lang:"ja-JP",localService:true}]}),
    speak:async o=>window.voiceCalls.push(o)}
 }};});
 await v.addScriptTag({content:fs.readFileSync("android/www/voice.js","utf8")});
 await v.evaluate(()=>NeutronVoice.speak("日本語","ja-JP",1,1));
 assert.equal(await v.evaluate(()=>voiceCalls.length),1);
 assert.equal(await v.evaluate(()=>voiceCalls[0].voice),0);
 await v.evaluate(async()=>{Capacitor.Plugins.NeutronMedia.azureSpeech=async()=>{throw Error("offline")};await NeutronVoice.speak("英語","ja-JP",1,1);});
 assert.equal(await v.evaluate(()=>voiceCalls.length),2);
 console.log("Android settings, grammar completion, JLPT import and Azure fallback: OK");
}finally{await browser.close();await new Promise(r=>server.close(r));}
