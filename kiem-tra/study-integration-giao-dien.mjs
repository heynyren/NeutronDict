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
 assert.equal(await p.locator("#viewSettings #syncBox").count(),1);
 assert.equal(await p.locator("#viewNotebook #syncBox").count(),0);
 assert.equal(await p.locator("#navGrammar").count(),0);
 assert.equal(await p.locator("#newsLanguage option[value=ja]").textContent(),"Tiếng Nhật · 日本語");
 await p.locator("#navStudy").click();
 await p.locator("#stStartDuong").click();
 await p.locator('[data-ma="grammar"]').click();
 await p.locator("#stGrammar .np-piece").first().waitFor();
 const pieces=await p.evaluate(()=>session.queue[0]._grammar.manh.map(x=>x.text.trim()));
 for(const text of pieces)await p.locator("#stGrammar .np-pieces").nth(1).getByRole("button",{name:text,exact:true}).first().click();
 await p.locator("#stGrammar").getByRole("button",{name:"Kiểm tra",exact:true}).click();
 await p.waitForFunction(()=>document.querySelector("#stGrammar .np-feedback").textContent.includes("đã đóng băng"));
 assert.equal(await p.locator("#stGrammar .np-original").textContent(),"私は毎朝日本語を勉強します。");
 assert.equal(await p.locator("#stGrammar .np-translation").textContent(),"Tôi học tiếng Nhật mỗi sáng.");
 await p.locator("#stGrammar").getByRole("button",{name:"Tiếp",exact:true}).click();
 const state=await p.evaluate(async()=>({history:await Store.get("nguPhapSrs"),nb:await getNB(),due:await currentDue()}));
 assert.equal(Object.values(state.history)[0].dongBang,true);
 assert.equal(state.nb["javi:勉強"].duong.nhin.lv,4);
 assert.equal(state.due.some(x=>x._d==="grammar"),false);
 // Real adapter: weak JLPT card goes through the notebook write queue.
 await p.evaluate(()=>luuTheYeuJlpt({kieu:"tu",muc:{id:"fixture",w:"練習",r:"れんしゅう",m:"luyện tập"},vd:{j:"毎日日本語を練習します。",v:"Tôi luyện tiếng Nhật hằng ngày."}},"n3"));
 const imported=await p.evaluate(async()=>{const n=await getNB(),x=n["javi:練習"];return {x,paths:Srs.duongMo(x)};});
 assert.ok(imported.x.jlptReviewAt);assert.ok(imported.paths.includes("nghe"));
 assert.equal(imported.x.cauNghe.cau,"毎日日本語を練習します。");
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
