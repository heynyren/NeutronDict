import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {tmpdir} from "node:os";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const output=path.join(process.env.RUNNER_TEMP||tmpdir(),"nd-ui");fs.mkdirSync(output,{recursive:true});
const words=["学習","電流","時間","言葉","仕事","学校","電気","東京","新聞","映画","世界","天気"];
const now=Date.now(),D=86400000;
const seed=Object.fromEntries(words.map((word,i)=>["javi:"+word,{
 word,dict:"javi",reading:"ことば",means:["Nghĩa của "+word],ts:now,
 duong:{nhin:{lv:4,ngay:30,due:now-D,ts:now-31*D},nghe:{lv:1,ngay:3,due:now-D,ts:now-(i===0?20:4)*D}},
 cauNghe:{cau:"これは"+word+"です。",dich:"Đây là "+word+"."}
}]));
const server=http.createServer((req,res)=>{
 const file=path.join(process.cwd(),"android/www",decodeURIComponent(req.url.split("?")[0]));
 try{res.setHeader("Content-Type",file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"text/html");res.end(fs.readFileSync(file));}
 catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const browser=await chromium.launch({headless:true});let ext;
try{
  const dir=path.resolve("extension");
  ext=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(tmpdir(),"reopen-ext-")),{
    channel:"chromium",headless:true,args:["--disable-extensions-except="+dir,"--load-extension="+dir]
  });
  const sw=ext.serviceWorkers()[0]||await ext.waitForEvent("serviceworker"),id=sw.url().split("/")[2];
  await sw.evaluate(async seed=>chrome.storage.local.set({notebook:seed,settings:{ngu:"ja",chu:"vi",nhip:false,coVu:false,tach:false},decks:{},hoc:{},nhipMs:{}}),seed);
  const ep=await ext.newPage(),ee=[];
  ep.on("pageerror",e=>{ee.push(e.message);console.log("Extension error",e.message);});
  await ep.goto("chrome-extension://"+id+"/notebook.html");
  await ep.waitForFunction(()=>items.length===12&&daNapXong);
  for(const mode of ["normal","normal","extra","extra","path","path","answer","normal","extra","path"]){
    console.log("Extension entry",mode);
    if(mode==="normal"||mode==="answer")await ep.locator("#study").click();
    if(mode==="extra")await ep.locator("#adaptivePlan").getByRole("button",{name:"Học thêm 3 phút",exact:true}).click();
    if(mode==="path"){
      await ep.locator("#studyPath").click();
      await ep.locator("#duongRiengDialog [data-ma=nhin]").click();
    }
    await ep.waitForFunction(()=>document.getElementById("studyOverlay").classList.contains("show"),{},{timeout:10000});
    if(mode==="answer"){
      await ep.locator("#stReveal").click();await ep.locator("#gForgot").click();
      await ep.waitForFunction(()=>session.lichSu?.length>0);
    }
    await ep.locator("#stClose").click();
    await ep.waitForFunction(()=>!document.getElementById("studyOverlay").classList.contains("show"));
  }
  assert.deepEqual(ee,[]);
  // Repeat against a large legacy notebook, with the default study settings.
  const big=Object.fromEntries(Array.from({length:420},(_,i)=>["javi:単語"+i,{word:"単語"+i,dict:"javi",means:["Từ "+i],ts:Date.now(),srs:{lv:1,due:Date.now()-1000}}]));
  await sw.evaluate(async big=>chrome.storage.local.set({notebook:big,hoc:{},settings:{ngu:"ja",chu:"vi",nhip:true,coVu:true,tach:true}}),big);
  await ep.reload();await ep.waitForFunction(()=>items.length===420&&daNapXong);
  for(const mode of ["normal","extra","path","normal"]){
    console.log("Legacy notebook entry",mode);
    if(mode==="normal")await ep.locator("#study").click();
    if(mode==="extra")await ep.locator("#adaptivePlan").getByRole("button",{name:"Học thêm 3 phút",exact:true}).click();
    if(mode==="path"){await ep.locator("#studyPath").click();await ep.locator("#duongRiengDialog [data-ma=nhin]").click();}
    await ep.waitForFunction(()=>document.getElementById("studyOverlay").classList.contains("show"),{},{timeout:10000});
    await ep.locator("#stClose").click();
  }
  assert.deepEqual(ee,[]);
 const p=await browser.newPage({viewport:{width:393,height:851}}),errors=[];
 p.on("pageerror",e=>errors.push(e.message));
 await p.route(/translate|dictionaryapi|script\.google/,r=>r.abort());
 await p.goto("http://127.0.0.1:"+server.address().port+"/index.html");
 await p.waitForFunction(()=>window.NeutronReady);
 await p.evaluate(async seed=>{
  await Store.set("ngu","ja");await Store.set("chu","vi");await Store.set("notebook",seed);
  await Store.set("hoc",{});await Store.set("nhip",false);
 },seed);
 await p.reload();await p.waitForFunction(()=>window.NeutronReady);
 await p.evaluate(()=>{speak=async()=>{};mung=(ids,next)=>{if(next)next();};});
 assert.equal(await p.evaluate(()=>typeof window.NhacTau),"undefined","Removed station music cannot run from old saved preferences");
 assert.equal(await p.locator("#setNhacTau,#nghThu").count(),0);
 await p.locator("#navStudy").click();
 await p.locator("#adaptivePlan").getByText("Kế hoạch hôm nay",{exact:true}).waitFor();
 await p.screenshot({animations:"disabled",path:path.join(output,"adaptive-android-vi.png"),fullPage:true});
 await p.locator("#stStart").click();
 await p.waitForFunction(()=>session.queue.length>0);
 const first=await p.evaluate(()=>({key:session.queue[0].key,route:session.queue[0]._d,count:session.queue.length,distinct:new Set(session.queue.map(x=>x.key)).size,plan:session.adaptive.plan}));
 assert.equal(first.key,"javi:学習",JSON.stringify(first));assert.equal(first.route,"nghe","Weakest due route is first through the real Start button");
 assert.equal(first.distinct,first.count);assert.ok(first.count<=20&&first.plan.goalCards>1);
  for (const extra of [false,true,false,true]) {
    await p.evaluate(()=>window.dispatchEvent(new PopStateEvent("popstate")));
    await p.waitForFunction(()=>session.queue.length===0);
    console.log("Before restart",extra,await p.evaluate(async()=>({disabled:$("stStart").disabled,visible:$("stStart").style.display,hoc:await Store.get("hoc"),errors:[]})));
    if(extra)await p.locator("#adaptivePlan").getByRole("button",{name:"Học thêm 3 phút",exact:true}).click();
    else await p.locator("#stStart").click();
    await p.waitForFunction(()=>session.queue.length>0,{},{timeout:10000}).catch(async e=>{console.log("REOPEN FAILED",errors,await p.evaluate(async()=>({hoc:await Store.get("hoc"),queue:session.queue.length,toast:document.body.innerText.slice(-2000)})));throw e;});
  }

  console.log("Android repeated starts passed");
}finally{if(ext)await ext.close();await browser.close();await new Promise(r=>server.close(r));}
