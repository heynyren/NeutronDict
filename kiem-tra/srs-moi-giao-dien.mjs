import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const ext=process.argv[2]||path.resolve("extension"),root=path.dirname(ext);
const cau="私は毎朝日本語を勉強します。";
const ctx=await chromium.launchPersistentContext(mkdtempSync(path.join(tmpdir(),"nd-grammar-")),{
  channel:"chromium",headless:true,args:["--disable-extensions-except="+ext,"--load-extension="+ext]});
const errors=[];
try {
  const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker");
  const id=sw.url().split("/")[2];
  await sw.evaluate(async(cau)=>{
    const now=Date.now(), d={lv:3,ngay:14,net:2.1,ts:now-15*86400000,due:now-86400000,sai:0};
    await chrome.storage.local.set({notebook:{"javi:勉強":{word:"勉強",dict:"javi",reading:"べんきょう",means:["học tập"],
      src:{cau,cauDich:"Tôi học tiếng Nhật mỗi sáng."},cauNghe:{cau,dich:"Tôi học tiếng Nhật mỗi sáng."},
      duong:{nhin:{...d},nghe:{...d}},srs:{...d},ts:now}},
      settings:{ngu:"ja",chu:"vi",nhip:false,coVu:false,nhacTau:false,tach:false},decks:{},hoc:{},nhipMs:{},nguPhapSrs:{}});
  },cau);
  const page=await ctx.newPage();page.on("pageerror",e=>errors.push(e.message));
  await page.goto("chrome-extension://"+id+"/notebook.html");
  await page.waitForFunction(()=>typeof load==="function"&&window.NguPhapUI&&items.length===1);
  const initial=await page.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:勉強"].duong);
  await page.evaluate(async()=>{
    await load();
    const it=items.find(x=>x.word==="勉強");
    session={queue:[{...it,_d:"nhin"},{...it,_d:"nghe"}],done:0,again:0,deleted:0};
    document.getElementById("studyOverlay").classList.add("show");showCard();
  });
  await page.locator("#stFav .lich-rieng").click();
  await page.locator('[data-duong="nhin"] button').filter({hasText:"Đóng băng đường này"}).click();
  await page.waitForFunction(()=>session.queue.length===1&&session.queue[0]._d==="nghe");
  let stored=await page.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:勉強"]);
  assert.equal(stored.lichRieng.nhin.dongBang,true);
  assert.deepEqual(stored.duong,initial);
  const rejected=await page.evaluate(()=>gradeWord("javi:勉強",true,1500,"nhin"));
  assert.equal(rejected,null,"Stale frozen card cannot grade");
  await page.locator('[data-duong="nghe"] input').fill("17");
  await page.locator('[data-duong="nghe"] button').filter({hasText:"Hẹn lại"}).click();
  await page.waitForFunction(()=>session.queue.length===0);
  stored=await page.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:勉強"]);
  assert(stored.lichRieng.nghe.hen>Date.now()+16.99*86400000);
  assert.deepEqual(stored.duong,initial);
  await page.locator("#lichRiengDialog > button").click();
  await page.evaluate(()=>{document.getElementById("studyOverlay").classList.remove("show");moMan("grammar");});
  await page.locator("#npDue").waitFor({state:"visible"});
  await page.locator("#npDue").click();
  const order=await page.evaluate(c=>NguPhap.catCau(c).map(p=>p.text.trim()),cau);
  for(const text of order) await page.locator("#npOptions button").filter({hasText:text}).click();
  await page.locator("#npCheck").click();
  await page.waitForFunction(()=>/Cấp ngữ pháp 1/.test(document.getElementById("npSchedule").textContent));
  let grammar=await page.evaluate(async()=> (await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs);
  const g=Object.values(grammar)[0];assert.equal(g.lv,1);assert.equal(g.due-g.ts,3*86400000);
  assert.deepEqual(await page.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:勉強"].duong),initial);
  await page.locator("#npNext").click();
  assert.equal(await page.locator("#npDue").isDisabled(),true);
  await page.locator("#npStart").click();await page.locator("#npSkip").click();await page.locator("#npNext").click();
  assert.deepEqual(await page.evaluate(async()=>(await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs),grammar,"Free practice does not grade");
  await page.reload();
  await page.waitForFunction(()=>window.NguPhapUI&&typeof moMan==="function");
  await page.evaluate(()=>moMan("grammar"));
  await page.waitForFunction(()=>document.getElementById("npStats").textContent.includes("1 câu tổng cộng"));
  assert.equal(await page.locator("#npDue").isDisabled(),true,"Schedule survives reload");
  // Simultaneous first grades for the same sentence must produce exactly one saved result.
  await sw.evaluate(()=>chrome.storage.local.set({nguPhapSrs:{}}));
  const p2=await ctx.newPage();p2.on("pageerror",e=>errors.push(e.message));
  await p2.goto("chrome-extension://"+id+"/notebook.html");await p2.waitForFunction(()=>typeof ghiNguPhap==="function");
  await p2.evaluate(async()=>{
    const it={key:"javi:勉強",...(await getStore()).nb["javi:勉強"]};
    await datLichRieng(it.key,"nhin","mo",0); await datLichRieng(it.key,"nghe","tuDong",0);
    session={queue:[{...it,_d:"nhin"},{...it,_d:"nghe"}],done:0,again:0,deleted:0};
    document.getElementById("studyOverlay").classList.add("show");showCard();
  });
  await page.evaluate(()=>datLichRieng("javi:勉強","nhin","bang",0));
  await p2.waitForFunction(()=>session.queue.length===1&&session.queue[0]._d==="nghe");
  await p2.evaluate(()=>{session.queue=[];document.getElementById("studyOverlay").classList.remove("show");});
  const results=await Promise.all([page,p2].map((p,i)=>p.evaluate(([cau,i])=>ghiNguPhap({cau,tsDau:0,onId:"race"+i},"dung"),[cau,i])));
  assert.equal(results.filter(Boolean).length,1);
  grammar=await page.evaluate(async()=>(await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs);
  assert.equal(Object.values(grammar)[0].lv,1);
  // Background sync returns an old copy after a grammar grade; fresh grade must survive final merge.
  await sw.evaluate(()=>{
    self.__cloudStarted=false;self.__cloudContinue=false;
    self.cauHinhSync=async()=>({chung:true,syncUrl:"https://example.test",syncToken:"x"});
    self.driveRequest=async(body)=>{
      if(body.action==="load") return {data:{notebook:{},nguPhapSrs:{}}};
      self.__cloudStarted=true;
      while(!self.__cloudContinue) await new Promise(r=>setTimeout(r,20));
      return {ok:true};
    };
    self.__syncPromise=doSync("ja");
  });
  for(let i=0;i<100;i++){if(await sw.evaluate(()=>self.__cloudStarted))break;await new Promise(r=>setTimeout(r,20));}
  const saved=await page.evaluate(async(cau)=>{
    await suaSoTay(async()=>chrome.storage.local.set({nguPhapSrs:{}}));
    return ghiNguPhap({cau,tsDau:0,onId:"during-sync"},"sua");
  },cau);
  await sw.evaluate(async()=>{self.__cloudContinue=true;await self.__syncPromise;});
  assert.deepEqual(await page.evaluate(async()=>Object.values((await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs)[0]),saved);
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("Extension: controls during study, stale grades, grammar persistence/free practice/concurrency/slow sync OK");
} finally {await ctx.close();}

// Exercise the shared persistent grammar UI in both layouts, including >10 questions.
const browser=await chromium.launch({headless:true});
try{
 for(const dir of [ext,path.join(root,"android/www")]){
  const page=await browser.newPage();
  const html=readFileSync(path.join(dir,dir===ext?"notebook.html":"index.html"),"utf8");
  const start=html.indexOf('<section id="viewGrammar"'),end=html.indexOf('<section id="viewSpeak"',start);
  await page.setContent(html.slice(start,end));
  await page.addScriptTag({content:'window.T=s=>s;window.T2=(s,o)=>s.replace(/\\{([^}]+)\\}/g,(_,k)=>o[k]);'});
  for(const f of ["ngu-phap.js","ngu-phap-ui.js"])await page.addScriptTag({content:readFileSync(path.join(dir,f),"utf8")});
  await page.evaluate(async()=>{
   window.testKho={};window.calls=0;
   const ds=Array.from({length:13},(_,i)=>({key:"javi:"+i,word:"勉強",src:{cau:"私は毎朝"+i+"分間日本語を勉強します。",cauDich:"nghĩa"}}));
   NguPhapUI.khoiTao({layMuc:async()=>ds,ngonNgu:()=>"ja",docLich:async()=>testKho,ghiKetQua:async(q,k)=>{
    calls++;const id=NguPhapSrs.khoa(q.cau),g=NguPhapSrs.cham(testKho[id],q.cau,k,Date.now(),q.onId,q.tsDau);
    if(g)testKho[id]=g;return g;}});
   await NguPhapUI.lamMoi();
  });
  await page.locator("#npDue").click();
  for(let i=0;i<13;i++){
   await page.locator("#npSkip").click();await page.locator("#npNext").click();
  }
  assert.equal(await page.evaluate(()=>Object.keys(testKho).length),13);
  // One reinforcement per failed sentence; reinforcement does not update SRS.
  for(let i=0;i<13;i++){await page.locator("#npSkip").click();await page.locator("#npNext").click();}
  assert.equal(await page.evaluate(()=>calls),13);
  assert.equal(await page.locator("#npExercise").isVisible(),false);
  assert.equal(await page.locator("#npDue").isDisabled(),true);
  console.log(dir+": all 13 scheduled sentences plus bounded reinforcement OK");
  await page.close();
 }
}finally{await browser.close();}

const androidBrowser=await chromium.launch({headless:true});
try {
 const p=await androidBrowser.newPage(),errs=[];
 p.on("pageerror",e=>errs.push(e.message));
 const dir=path.join(root,"android/www");
 await p.route("https://android.test/**",async route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||"index.html";
   try { await route.fulfill({body:readFileSync(path.join(dir,name)),
     contentType:name.endsWith(".js")?"application/javascript":name.endsWith(".css")?"text/css":"text/html"}); }
   catch { await route.fulfill({status:404,body:""}); }
 });
 await p.addInitScript(cau=>{
  if(localStorage.getItem("__seed"))return;
  const t=Date.now(),d={lv:3,ngay:14,net:2.1,due:t-1,ts:t-15*86400000};
  localStorage.setItem("settings",JSON.stringify({ngu:"ja",chu:"vi",coVu:false,nhip:false,nhacTau:false}));
  localStorage.setItem("notebook",JSON.stringify({"javi:勉強":{word:"勉強",dict:"javi",reading:"べんきょう",
    means:["học"],src:{cau,cauDich:"nghĩa"},cauNghe:{cau,dich:"nghĩa"},duong:{nhin:{...d},nghe:{...d}},ts:t}}));
  localStorage.setItem("__seed","1");
 },cau);
 await p.goto("https://android.test/index.html");
 await p.waitForFunction(()=>typeof datLichRieng==="function"&&typeof ghiNguPhap==="function");
 const r=await p.evaluate(async(cau)=>{
   const before=(await getNB())["javi:勉強"].duong;
   await datLichRieng("javi:勉強","nhin","bang",0);
   const rejected=await gradeWord("javi:勉強",true,1000,"nhin");
   const heard=await gradeWord("javi:勉強",true,8000,"nghe");
   const grades=await Promise.all([1,2].map(i=>ghiNguPhap({cau,tsDau:0,onId:"android-"+i},"dung")));
   return {before,after:(await getNB())["javi:勉強"],rejected,heard,grades};
 },cau);
 assert.equal(r.rejected,null);assert.ok(r.heard);
 assert.deepEqual(r.after.duong.nhin,r.before.nhin);
 assert.equal(r.after.lichRieng.nhin.dongBang,true);
 assert.equal(r.grades.filter(Boolean).length,1);
 await p.reload();
 await p.waitForFunction(()=>typeof getNB==="function");
 assert.equal(await p.evaluate(async()=>(await getNB())["javi:勉強"].lichRieng.nhin.dongBang),true);
 assert.equal(await p.evaluate(async()=>Object.values(await Store.get("nguPhapSrs"))[0].lv),1);
 assert.equal(errs.length,0,errs.join("\n"));
 console.log("Android app: real storage, frozen visual route, listening grade, concurrent grammar grade, reload OK");
} finally {await androidBrowser.close();}
