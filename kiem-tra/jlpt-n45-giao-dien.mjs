import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,existsSync,mkdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve,extname} from "node:path";
import {createServer} from "node:http";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const extension=resolve(process.argv[2]||"extension"),profile=mkdtempSync(join(tmpdir(),"n45-ui-"));
const evidence=join(process.env.RUNNER_TEMP||tmpdir(),"nd-ui");mkdirSync(evidence,{recursive:true});
const courses=Object.fromEntries(["n4","n5"].map(k=>[k,JSON.parse(readFileSync(join(extension,"jlpt/"+k+".json"),"utf8"))]));
const server=createServer((req,res)=>{
 const p=resolve("android/www","."+decodeURIComponent(req.url.split("?")[0]));
 if(!p.startsWith(resolve("android/www")+"/")||!existsSync(p)){res.writeHead(404);res.end();return;}
 res.setHeader("Content-Type",({".js":"text/javascript",".css":"text/css",".html":"text/html",".json":"application/json",".png":"image/png"})[extname(p)]||"text/plain");res.end(readFileSync(p));
});await new Promise(r=>server.listen(0,"127.0.0.1",r));
const ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:"chromium",viewport:{width:1280,height:900},args:["--disable-extensions-except="+extension,"--load-extension="+extension]});
let browser;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function dialogues(p){for(let i=0;i<12;i++){const b=p.locator(".jl-thoai:not(.di) .jl-btn");if(!await b.count())break;await b.click();await delay(150);}}
async function stage(p,id){
 await p.locator('.jl-nut[data-id="'+id+'"]').click();
 for(let i=0;i<12;i++){if(await p.locator(".jl-to-hop").count())return;await dialogues(p);await delay(150);}
 await p.waitForSelector(".jl-to-hop");
}
async function snapshot(p,name){
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await p.evaluate(()=>document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();}));
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const ratios=await p.evaluate(()=>{
  const rgb=s=>s.match(/[0-9.]+/g)?.map(Number)||[];
  const lum=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  return [...document.querySelectorAll(".jl-lua:not(:disabled), .jl-the-hoc .jl-nghia, .jl-chay-nut .chinh, .jl-fb-nut .chinh")].map(el=>{
   const fg=rgb(getComputedStyle(el).color);let b=el,bg=[];
   while(b){bg=rgb(getComputedStyle(b).backgroundColor);if(bg.length===3||bg[3]>=.99)break;b=b.parentElement;}
   const l1=lum(fg),l2=lum(bg);
   return {text:el.textContent,ratio:(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)};
  });
 });
 assert.ok(ratios.every(x=>x.ratio>=4.5),name+" contrast "+JSON.stringify(ratios));
 await p.screenshot({path:join(evidence,name+".png")});
 const layout=await p.evaluate(()=>{
  const game=document.querySelector(".jl-chay");
  return {overflow:document.documentElement.scrollWidth>innerWidth+1,
   gameOverflow:game?game.scrollWidth>game.clientWidth+1:false,
   bad:[...document.querySelectorAll(".jl-chay-nut .jl-btn,.jl-fb-nut .jl-btn.chinh")].filter(b=>{const r=b.getBoundingClientRect();return r.left<0||r.right>innerWidth+1;}).map(b=>b.textContent)};
 });
 assert.deepEqual(layout,{overflow:false,gameOverflow:false,bad:[]},name);
}
async function exercise(p,name,open,read,write){
 const errors=[];p.on("pageerror",x=>errors.push(x.message));
 for(const level of ["n5","n4"]){
  await p.reload();await open();await p.waitForSelector('.jl-the[data-mon="'+level+'"]');
  const playable=await p.locator(".jl-the:not(.sap)").evaluateAll(es=>es.map(e=>e.dataset.mon));
  assert.deepEqual(playable,["n5","n4","n3","n2","kaiwa"]);
  assert.equal(await p.locator(".jl-the.sap").count(),1);
  assert.match(await p.locator(".jl-the.sap").innerText(),/N1/);
  await snapshot(p,name+"-"+level+"-courses");
  await p.locator('.jl-the[data-mon="'+level+'"]').click();await p.waitForSelector(".jl-thoai");await dialogues(p);await p.waitForSelector(".jl-bd");
  assert.equal(await p.locator(".jl-gioi-lop").count(),6);
  assert.equal(await p.locator(".jl-nut.khoa").count(),1);
  const title=await p.locator(".jl-bd-ten").innerText();
  assert.doesNotMatch(title,/Con đường|Làng suối/,"course title translated");
  await snapshot(p,name+"-"+level+"-map");
  await p.locator(".jl-nguon").click();await p.waitForSelector(".jl-to-hop");
  assert.match(await p.locator(".jl-to-hop").innerText(),/EDRDG/);await p.locator(".jl-to-hop .chinh").click();
  const ids=await p.evaluate(data=>JlptCauHoi.chiaChang(data).map(s=>({id:s.id,type:s.loai})),courses[level]);
  // Jump to chapter two: no sequential unlock and no 60% score barrier.
  const wanted=ids.find(s=>s.id.startsWith("c2")&&s.type==="pp").id;
  await stage(p,wanted);await p.locator(".jl-to-nut .jl-btn.chinh").click();await dialogues(p);await p.waitForSelector(".jl-the-hoc");
  await p.locator(".jl-the-hoc").click();await p.waitForSelector(".jl-the-hoc.lat");
  assert.match(await p.locator(".jl-the-hoc").innerText(),/PDF|pdf|docx/i);
  await snapshot(p,name+"-"+level+"-card");
  if(name==="android"){await p.emulateMedia({colorScheme:"dark"});await snapshot(p,name+"-"+level+"-card-dark");await p.emulateMedia({colorScheme:"light"});}
  if(await p.locator(".jl-bo-qua").count())await p.locator(".jl-bo-qua").click();else await p.locator(".jl-chay-nut .jl-btn.chinh").click();
  await p.waitForSelector(".jl-lua");assert.equal(await p.locator(".jl-lua").count(),4);
  const answer=await p.evaluate(()=>JlptUI.dapAnDung());
  await p.locator('.jl-lua[data-k="'+((answer+1)%4)+'"]').click();await p.waitForSelector(".jl-fb.sai");
  const book=await read("notebook"),entry=Object.values(book||{}).find(x=>x.jlptSource?.level===level);
  assert.ok(entry?.cauNghe?.cau && entry?.cauNghe?.dich);
  assert.ok(entry.jlptSource.id.startsWith(level+":"));
  for(const route of ["nhin","nghe","dien"])assert.equal(entry.lichRieng[route].dongBang,false);
  await snapshot(p,name+"-"+level+"-answer");
  await p.locator(".jl-fb .jl-btn.chinh").click();
  for(let i=0;i<40;i++){
   await p.waitForSelector(".jl-kq, .jl-lua:not(:disabled)");
   if(await p.locator(".jl-kq").count())break;
   const right=await p.evaluate(()=>JlptUI.dapAnDung());await p.locator('.jl-lua[data-k="'+right+'"]').click();
   await p.waitForSelector(".jl-fb.dung");await p.locator(".jl-fb .jl-btn.chinh").click();
  }
  await p.waitForSelector(".jl-kq");
  let progress;for(let i=0;i<40;i++){progress=await read("jlpt");if(progress?.mon?.[level]?.chang?.[wanted]?.xong)break;await delay(50);}
  assert.ok(progress.mon[level].chang[wanted].xong);
  // Simulate the other device completing every remaining stage at zero score.
  for(const s of ids.filter(x=>x.id!=="boss"))progress.mon[level].chang[s.id]={tot:0,sao:0,lan:1,xong:true,ts:Date.now()};
  await write("jlpt",progress);await p.reload();await open();await p.locator('.jl-the[data-mon="'+level+'"]').click();await dialogues(p);await p.waitForSelector(".jl-bd");
  assert.equal(await p.locator(".jl-nut.khoa").count(),0);
  await stage(p,"boss");await p.locator(".jl-to-nut .jl-btn").last().click();await dialogues(p);
  await p.waitForSelector(".jl-lua");assert.equal(await p.locator(".jl-lua").count(),4);
  if(name==="android")await p.emulateMedia({colorScheme:"dark"});
  await snapshot(p,name+"-"+level+"-final");
  if(name==="android")await p.emulateMedia({colorScheme:"light"});
  console.log("PASS "+name+" "+level+": translated map, direct chapter access, grammar, wrong-card transfer, persistence, final unlock below 60%, playable final");
 }
 assert.deepEqual(errors,[]);
}
try{
 const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker"),id=new URL(sw.url()).host;
 await sw.evaluate(()=>chrome.storage.local.set({settings:{chu:"en",ngu:"ja"},pastelTheme:"blue",notebook:{},hoc:{},jlpt:null}));
 const p=await ctx.newPage();await p.goto("chrome-extension://"+id+"/notebook.html");
 await exercise(p,"extension",async()=>p.locator("#jlpt").click(),key=>sw.evaluate(async k=>(await chrome.storage.local.get(k))[k],key),(key,value)=>sw.evaluate(([k,v])=>chrome.storage.local.set({[k]:v}),[key,value]));
 browser=await chromium.launch({channel:"chromium"});
 const c=await browser.newContext({viewport:{width:393,height:851},hasTouch:true,isMobile:true,colorScheme:"light"});
 const p2=await c.newPage();await p2.goto("http://127.0.0.1:"+server.address().port+"/index.html");
 await p2.evaluate(async()=>{await Store.set("ngu","ja");await Store.set("chu","ja");});
 await exercise(p2,"android",async()=>p2.locator("#navJlpt").click(),key=>p2.evaluate(k=>Store.get(k),key),(key,value)=>p2.evaluate(([k,v])=>Store.set(k,v),[key,value]));
}finally{await ctx.close();if(browser)await browser.close();server.close();rmSync(profile,{recursive:true,force:true});}
