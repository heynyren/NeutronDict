import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,existsSync,mkdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve,extname} from "node:path";
import {createServer} from "node:http";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const extension=resolve(process.argv[2]||"extension"),profile=mkdtempSync(join(tmpdir(),"kaiwa-ui-"));
const evidence=join(process.env.RUNNER_TEMP||tmpdir(),"nd-ui");mkdirSync(evidence,{recursive:true});
const course=JSON.parse(readFileSync(join(extension,"jlpt/kaiwa.json"),"utf8"));
const server=createServer((req,res)=>{
 const path=resolve("android/www","."+decodeURIComponent(req.url.split("?")[0]));
 if(!path.startsWith(resolve("android/www")+"/")||!existsSync(path)){res.writeHead(404);res.end();return;}
 const types={".js":"text/javascript",".css":"text/css",".html":"text/html",".png":"image/png",".json":"application/json"};
 res.setHeader("Content-Type",types[extname(path)]||"text/plain");res.end(readFileSync(path));
});await new Promise(r=>server.listen(0,"127.0.0.1",r));
const ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:"chromium",viewport:{width:1280,height:900},args:["--disable-extensions-except="+extension,"--load-extension="+extension]});
let browser;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function dialogues(p){
 for(let i=0;i<12;i++){
  const b=p.locator(".jl-thoai:not(.di) .jl-btn");if(!await b.count())break;
  await b.click();await delay(150);
 }
}
async function enterStage(p,selector){
 await p.locator(selector).click();
 for(let i=0;i<12;i++){
  if(await p.locator(".jl-to-hop").count())return;
  await dialogues(p);await delay(150);
 }
 await p.waitForSelector(".jl-to-hop");
}
async function snapshot(p,name){
 await p.evaluate(()=>document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();}));
 await p.screenshot({path:join(evidence,name+".png")});
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"horizontal overflow: "+name);
 const layout=await p.evaluate(()=>{
   const game=document.querySelector(".jl-kaiwa");if(!game)return null;
   return {width:game.scrollWidth,client:game.clientWidth,buttons:[...game.querySelectorAll(".jl-chay-nut .jl-btn,.jl-fb-nut .jl-btn.chinh")].map(b=>{
     const r=b.getBoundingClientRect();return {text:b.textContent,left:r.left,right:r.right};
   }),viewport:innerWidth,musicVisible:!!document.querySelector(".jl-nhac:not([hidden])")};
 });
 if(layout){assert.ok(layout.width<=layout.client+1,JSON.stringify(layout));assert.ok(layout.buttons.every(b=>b.left>=0&&b.right<=layout.viewport+1),JSON.stringify(layout));assert.equal(layout.musicVisible,false);}

}
async function exercise(p,name,open,read){
 const errors=[];p.on("pageerror",e=>errors.push(e.message));
 await open();await p.waitForSelector('.jl-the[data-mon="kaiwa"]');
 assert.equal(await p.locator(".jl-the").count(),6);
 assert.equal(await p.locator(".jl-the.sap").count(),3);
 await snapshot(p,"kaiwa-"+name+"-courses");
 await p.locator('.jl-the[data-mon="kaiwa"]').click();await p.waitForSelector(".jl-thoai");await dialogues(p);await p.waitForSelector(".jl-bd");
 assert.equal(await p.evaluate(()=>JlptUI.trangThai().monId),"kaiwa");
 assert.ok(await p.locator(".jl-nut.khoa").count()===1,"only final exam is locked");
 assert.equal(await p.locator(".jl-gioi-lop").count(),9);
 await snapshot(p,"kaiwa-"+name+"-map");
 // Pick the first Osaka vocabulary stage, directly, without completing Nameraka.
 const wanted=await p.evaluate(data=>{
   const ds=JlptCauHoi.chiaChang(data);
   return ds.find(s=>s.chuong===5 && s.loai==="tu").id;
 },course);
 await enterStage(p,'.jl-nut[data-id="'+wanted+'"]');
 await p.locator(".jl-to-nut .jl-btn.chinh").click();await dialogues(p);await p.waitForSelector(".jl-the-hoc");
 await p.locator(".jl-the-hoc").click();await p.waitForSelector(".jl-the-hoc.lat");
 assert.match(await p.locator(".jl-the-hoc").innerText(),/OSK-/);
 await snapshot(p,"kaiwa-"+name+"-source");
 if(await p.locator(".jl-bo-qua").count())await p.locator(".jl-bo-qua").click();
 else await p.locator(".jl-chay-nut .jl-btn.chinh").click();
 await p.waitForSelector(".jl-lua");
 const correct=await p.evaluate(()=>JlptUI.dapAnDung());
 const word=await p.locator(".jl-de .jl-nho-dong").innerText();
 await snapshot(p,"kaiwa-"+name+"-question");
 await p.locator('.jl-lua[data-k="'+((correct+1)%4)+'"]').click();await p.waitForSelector(".jl-fb.sai");
 assert.match(await p.locator(".jl-fb").innerText(),/OSK-/);
 const book=await read("notebook");
 const entry=Object.values(book||{}).find(x=>x.jlptSource?.level==="kaiwa");
 assert.ok(entry,"wrong answer enters the existing notebook");assert.ok(entry.cauNghe?.cau && entry.cauNghe?.dich);
 assert.equal(entry.dongBang,false);
 for(const route of ["nhin","nghe","dien"])assert.equal(entry.lichRieng[route].dongBang,false);
 await snapshot(p,"kaiwa-"+name+"-answer");
 await p.locator(".jl-fb .jl-btn.chinh").click();
 for(let i=0;i<20;i++){
  await p.waitForSelector(".jl-kq, .jl-lua:not(:disabled)");
  if(await p.locator(".jl-kq").count())break;
  const right=await p.evaluate(()=>JlptUI.dapAnDung());
  await p.locator('.jl-lua[data-k="'+right+'"]').click();
  await p.waitForSelector(".jl-fb.dung");await p.locator(".jl-fb .jl-btn.chinh").click();
 }
 await p.waitForSelector(".jl-kq");
 let progress;for(let i=0;i<40;i++){progress=await read("jlpt");if(Object.keys(progress?.mon?.kaiwa?.chang||{}).length)break;await delay(50);}
 assert.ok(Object.values(progress.mon.kaiwa.chang).some(c=>c.xong));
 await p.reload();await open();await p.locator('.jl-the[data-mon="kaiwa"]').click();await dialogues(p);await p.waitForSelector(".jl-bd");
 assert.ok(await p.evaluate(()=>Object.keys(JlptUI.trangThai().td.mon.kaiwa.chang).length>0));
 assert.deepEqual(errors,[]);console.log("PASS "+name+": arbitrary stage, original source, quiz, wrong-answer transfer, progress reload ("+word+")");
}
try{
 const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker"),id=new URL(sw.url()).host;
 await sw.evaluate(()=>chrome.storage.local.set({settings:{chu:"en",ngu:"ja"},pastelTheme:"blue",notebook:{},hoc:{},jlpt:null}));
 const p=await ctx.newPage();await p.goto("chrome-extension://"+id+"/notebook.html");
 await exercise(p,"extension",async()=>{await p.locator("#jlpt").click();},key=>sw.evaluate(async k=>(await chrome.storage.local.get(k))[k],key));
 browser=await chromium.launch({channel:"chromium"});
 const ac=await browser.newContext({viewport:{width:393,height:851},hasTouch:true,isMobile:true,colorScheme:"light"});
 const a=await ac.newPage();await a.goto("http://127.0.0.1:"+server.address().port+"/index.html");
 await a.evaluate(async()=>{await Store.set("ngu","ja");await Store.set("chu","vi");});await a.reload();
 await exercise(a,"android",async()=>{await a.locator("#navJlpt").click();},key=>a.evaluate(k=>Store.get(k),key));
 await a.emulateMedia({colorScheme:"dark"});await snapshot(a,"kaiwa-android-dark-map");
}finally{
 await ctx.close();if(browser)await browser.close();server.close();rmSync(profile,{recursive:true,force:true});
}
