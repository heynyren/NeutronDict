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
 await p.locator("#navStudy").click();
 await p.locator("#adaptivePlan").getByText("Kế hoạch hôm nay",{exact:true}).waitFor();
 await p.screenshot({path:path.join(output,"adaptive-android-vi.png"),fullPage:true});
 await p.locator("#stStart").click();
 await p.waitForFunction(()=>session.queue.length>0);
 const first=await p.evaluate(()=>({key:session.queue[0].key,route:session.queue[0]._d,count:session.queue.length,distinct:new Set(session.queue.map(x=>x.key)).size,plan:session.adaptive.plan}));
 assert.equal(first.key,"javi:学習",JSON.stringify(first));assert.equal(first.route,"nghe","Weakest due route is first through the real Start button");
 assert.equal(first.distinct,first.count);assert.ok(first.count<=20&&first.plan.goalCards>1);
 await p.locator("#stReveal").click();await p.locator("#gForgot").click();
 await p.waitForFunction(()=>session.lichSu?.length===1);
 const undo=await p.evaluate(async()=>{
  const b=session.lichSu[0],before=(await getNB())[b.key],id=b.sau.reviewId;
  const undone=await huyLuot(b),after=(await getNB())[b.key];
  const merged=Muc.tron({[b.key]:before},{[b.key]:after})[b.key];
  return {undone,active:AdaptiveStudy.allEvents([after]).length,stamp:after.duong[b.duong].ts,prior:before.duong[b.duong].ts,
    tombstone:merged.reviewLog[id].undoAt,interval:merged.duong[b.duong].ngay,expected:b.truoc.ngay};
 });
 assert.equal(undo.undone,true);assert.equal(undo.active,0);assert.ok(undo.stamp>undo.prior&&undo.tombstone);
 assert.equal(undo.interval,undo.expected,"Stale sync does not revive the undone route");
 await p.evaluate(()=>ketThucSom());
 // Preferences must survive a tracker write that was initialized before the plan.
 await p.locator("#adaptivePlan summary").click();
 await p.locator("#adaptivePlan select").selectOption("5");
 await p.waitForFunction(async()=>AdaptiveStudy.normal((await readAdaptiveSnapshot()).state).prefs.minutes===5);
 const persisted=await p.evaluate(async()=>{await theoDoi.ghiLuotOn(true);return (await readAdaptiveSnapshot()).state;});
 assert.equal(persisted.prefs.minutes,5);
 for(const lang of ["en","ja"]){
  await p.evaluate(async lang=>{await Store.set("chu",lang);},lang);
  await p.reload();await p.waitForFunction(()=>window.NeutronReady);
  await p.locator("#navStudy").click();
  await p.locator("#adaptivePlan").getByText(lang==="en"?"Today's plan":"今日の学習プラン",{exact:true}).waitFor();
  await p.locator("#adaptivePlan summary").click();
  await p.screenshot({path:path.join(output,"adaptive-android-"+lang+".png"),fullPage:true});
  assert.equal(await p.locator("#adaptivePlan").getByText("Kế hoạch hôm nay",{exact:true}).count(),0);
 }
 // Only the native notification boundary is mocked; the actual scheduling code runs.
 const notif=await p.evaluate(async()=>{
  const pending=new Map();let requested=0;
  Plugins.LocalNotifications={
   checkPermissions:async()=>({display:"granted"}),
   requestPermissions:async()=>{requested++;return {display:"granted"};},
   cancel:async({notifications})=>notifications.forEach(x=>pending.delete(x.id)),
   schedule:async({notifications})=>notifications.forEach(x=>pending.set(x.id,x))
  };
  await Store.set("notifCfg",{on:true,since:Date.now()});await Store.remove("notifSlots");
  await refreshNotifications();const first=[...pending.values()].map(x=>({id:x.id,at:+x.schedule.at,day:x.extra.day}));
  await refreshNotifications();const second=[...pending.keys()];
  const nb=await getNB(),key=Object.keys(nb)[0],now=Date.now(),day=AdaptiveStudy.dateKey(now);
  nb[key].reviewLog={};
  for(let i=0;i<4;i++){const log=AdaptiveStudy.appendReview(nb[key].reviewLog,{at:now,cardKey:"completed-"+i,route:"nhin",activeMs:180000});nb[key].reviewLog=log.log;}
  await setNB(nb);await refreshNotifications();
  const afterDone=[...pending.values()].filter(x=>x.extra.day===day).length;
  await Store.set("notifCfg",{on:false});await refreshNotifications();
  return {first,second,afterDone,afterDisable:pending.size,requested};
 });
 assert.ok(notif.first.length>0);assert.deepEqual(notif.first.map(x=>x.id),notif.second);
 for(const day of new Set(notif.first.map(x=>x.day))){
  const slots=notif.first.filter(x=>x.day===day).sort((a,b)=>a.at-b.at);
  assert.ok(slots.length<=3);
  for(let i=0;i<slots.length;i++){const t=new Date(slots[i].at);assert.ok(t.getHours()>=9&&(t.getHours()<21||t.getMinutes()<=30));if(i)assert.ok(slots[i].at-slots[i-1].at>=10800000);}
 }
 assert.equal(notif.afterDone,0);assert.equal(notif.afterDisable,0);assert.equal(notif.requested,0);
 await p.evaluate(()=>refreshStudyPlan());
 await p.locator("#adaptivePlan").getByText("今日のプランは完了です",{exact:true}).waitFor();
 await p.screenshot({path:path.join(output,"adaptive-android-complete.png"),fullPage:true});
 assert.deepEqual(errors,[]);
 // Real extension storage, scripts and Start button.
 const dir=path.resolve("extension");
 ext=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(tmpdir(),"adaptive-ext-")),{
  channel:"chromium",headless:true,args:["--disable-extensions-except="+dir,"--load-extension="+dir]
 });
 const sw=ext.serviceWorkers()[0]||await ext.waitForEvent("serviceworker"),id=sw.url().split("/")[2];
 await sw.evaluate(async seed=>chrome.storage.local.set({notebook:seed,settings:{ngu:"ja",chu:"vi",nhip:false,coVu:false,nhacTau:false,tach:false},decks:{},hoc:{},nhipMs:{}}),seed);
 const ep=await ext.newPage();await ep.goto("chrome-extension://"+id+"/notebook.html");
 await ep.waitForFunction(()=>typeof load==="function"&&items.length===12&&daNapXong);
 await ep.locator("#adaptivePlan").getByText("Kế hoạch hôm nay",{exact:true}).waitFor();
 await ep.screenshot({path:path.join(output,"adaptive-extension.png"),fullPage:true});
 await ep.locator("#study").click();
 await ep.waitForFunction(()=>session.queue.length>0);
 const er=await ep.evaluate(()=>({key:session.queue[0].key,route:session.queue[0]._d,goal:session.adaptive.plan.goalCards}));
 assert.equal(er.key,"javi:学習");assert.equal(er.route,"nghe");assert.ok(er.goal>1);
 console.log("Adaptive UI: real Android/extension study entry, risk order, persistent undo, target settings, three languages, notification limits/cancellation and screenshots passed");
}finally{if(ext)await ext.close();await browser.close();await new Promise(r=>server.close(r));}
