/**
 * Hai kho thực sự tách biệt: extension Chrome và Android web app (mobile WebView).
 * Cloud fixture dùng đúng giao thức Apps Script load/save toàn gói; không dùng tài khoản thật.
 */
import assert from "node:assert/strict";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { createServer } from "node:http";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { tmpdir } from "node:os";
const ext=resolve(process.argv[2]||"extension"),www=resolve("android/www");
let cloud={},saves=0;
const srv=createServer(async(req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS"){res.end();return;}
  if(req.url==="/exec"){
    let body="";for await(const c of req)body+=c;
    const m=JSON.parse(body||"{}");res.setHeader("Content-Type","application/json");
    if(m.action==="load")res.end(JSON.stringify({ok:true,data:cloud}));
    else if(m.action==="save"){cloud=m.data;saves++;res.end('{"ok":true}');}
    else res.end('{"ok":false}');
    return;
  }
  try{
    const pathname=new URL(req.url,"http://localhost").pathname;
    const p=resolve(www,"."+decodeURIComponent(pathname==="/"?"/index.html":pathname));
    if(!p.startsWith(www+"/"))throw Error("outside fixture");
    const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml"};
    res.setHeader("Content-Type",types[extname(p)]||"application/octet-stream");
    res.end(readFileSync(p));
  }catch(e){res.statusCode=404;res.end();}
});
await new Promise(r=>srv.listen(0,"127.0.0.1",r));
const base="http://127.0.0.1:"+srv.address().port,url=base+"/exec";
const profile=mkdtempSync(join(tmpdir(),"nd-jlpt-sync-"));
let desktop,browser;
const errors=[];let checks=0;
const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log("✓ "+name);};
try{
  desktop=await chromium.launchPersistentContext(profile,{
    channel:"chromium",headless:true,args:["--disable-extensions-except="+ext,"--load-extension="+ext]
  });
  const sw=desktop.serviceWorkers()[0]||await desktop.waitForEvent("serviceworker");
  const id=sw.url().split("/")[2];
  await sw.evaluate(async()=>{
    await chrome.storage.local.clear();
    await chrome.storage.local.set({settings:{ngu:"ja",nhip:false,coVu:false,nhacTau:false},
      notebook:{"javi:猫":{word:"猫",dict:"javi",means:["mèo"],ts:1}},decks:{},hoc:{}});
  });
  const pc=await desktop.newPage();pc.on("pageerror",e=>errors.push("PC: "+e.message));
  await pc.goto("chrome-extension://"+id+"/notebook.html");
  await pc.waitForFunction(()=>document.querySelectorAll(".entry").length===1);

  browser=await chromium.launch({channel:"chromium"});
  const mobile=await browser.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true});
  await mobile.addInitScript(()=>{
    localStorage.setItem("ngu",JSON.stringify("ja"));
    localStorage.setItem("settings",JSON.stringify({nhip:false,coVu:false,nhacTau:false}));
  });
  const phone=await mobile.newPage();phone.on("pageerror",e=>errors.push("Android: "+e.message));
  await phone.route(/translate|dictionaryapi|script\.google/,r=>r.abort());
  await phone.goto(base+"/index.html");
  await phone.waitForFunction(()=>window.NeutronReady===true);

  // Lấy id chặng từ chính bộ dữ liệu thực để kiểm tra nút trên bản đồ.
  const ids=await pc.evaluate(async()=>{
    const mon=await(await fetch(chrome.runtime.getURL("jlpt/n3.json"))).json();
    JlptCauHoi.chuanBi(mon);
    return JlptCauHoi.chiaChang(mon).map(c=>c.id);
  });
  const normals=ids.filter(x=>x!=="boss"),last=normals.at(-1),first=normals[0];
  await pc.evaluate(async({url,normals,last})=>{
    const td=JlptTienDo.macDinh();td.nhac=false;
    for(const id of normals.filter(x=>x!==last))
      JlptTienDo.ghiKetQua(td,"n3",id,{dung:1,tong:2,saiIds:[]},Date.now());
    JlptTienDo.monCua(td,"n3").thoai.batDau=1;
    await chrome.storage.local.set({jlpt:td,syncUrlChung:url,syncTokenChung:"fixture"});
    await syncNow("ja");
  },{url,normals,last});
  await phone.evaluate(async({url,last})=>{
    const td=JlptTienDo.macDinh();td.nhac=false;
    JlptTienDo.ghiKetQua(td,"n3",last,{dung:0,tong:2,saiIds:[]},Date.now());
    JlptTienDo.ghiKetQua(td,"n2","phone-only",{dung:2,tong:2,saiIds:[]},Date.now());
    await Store.set("jlpt",td);await Store.set("syncChung",{url,token:"fixture"});
    await syncNow("ja");
    document.getElementById("navJlpt").click();
  },{url,last});
  await phone.waitForSelector(".jl-the");
  await phone.evaluate(()=>JlptUI.moMon("n3"));
  await phone.waitForSelector('.jl-nut[data-id="boss"]');
  check("Android nhận đủ các chặng máy tính, bài cuối mở dù chặng cuối 0%",
    await phone.evaluate(()=>!document.querySelector('.jl-nut[data-id="boss"]').classList.contains("khoa")));
  await pc.evaluate(async()=>{await syncNow("ja");moMan("jlpt");});
  await pc.waitForSelector(".jl-the");
  await pc.evaluate(()=>JlptUI.moMon("n3"));
  await pc.waitForSelector('.jl-nut[data-id="boss"]');
  check("máy tính nhận chặng của Android và tự mở bài cuối",
    await pc.evaluate(()=>!document.querySelector('.jl-nut[data-id="boss"]').classList.contains("khoa")));
  check("tiến độ cấp N2 độc lập cũng được chuyển hai chiều",
    await pc.evaluate(async()=>JlptTienDo.daXong((await chrome.storage.local.get("jlpt")).jlpt,"n2","phone-only")));
  check("Android giữ lựa chọn tắt nhạc của thiết bị",
    await phone.evaluate(async()=>(await Store.get("jlpt")).nhac===false));

  // Học trên một màn đang giữ snapshot cũ sau khi cloud nhận chặng mới.
  const stale=await phone.evaluate(()=>JlptUI.trangThai().td);
  await pc.evaluate(async()=>{
    const td=(await chrome.storage.local.get("jlpt")).jlpt;
    JlptTienDo.ghiKetQua(td,"n2","desktop-next",{dung:2,tong:2,saiIds:[]},Date.now());
    await ghiTienDoJlpt(td);await syncNow("ja");
  });
  await phone.evaluate(()=>syncNow("ja"));
  await phone.evaluate(v=>ghiTienDoJlpt(v),stale);
  check("snapshot UI cũ không ghi mất chặng vừa nhận",
    await phone.evaluate(async()=>JlptTienDo.daXong(await Store.get("jlpt"),"n2","desktop-next")));

  // Mở một câu hỏi thật, nhận sync trong lúc làm bài: không dựng lại câu đang trả lời.
  await pc.locator('.jl-nut[data-id="'+first+'"]').click();
  for(let i=0;i<15 && !(await pc.$(".jl-to-hop"));i++){
    const t=await pc.$(".jl-thoai .jl-btn");if(t)await t.click();
    await pc.waitForTimeout(100);
  }
  await pc.waitForSelector(".jl-to-hop");
  await pc.locator(".jl-to-nut .jl-btn:not(.chinh)").click();
  for(let i=0;i<15 && !(await pc.$(".jl-lua"));i++){
    const t=await pc.$(".jl-thoai .jl-btn");if(t)await t.click();
    await pc.waitForTimeout(100);
  }
  await pc.waitForSelector(".jl-lua");
  await pc.evaluate(()=>{window.__questionBeforeSync=document.querySelector(".jl-lua");});
  await phone.evaluate(async()=>{
    const td=await Store.get("jlpt");
    JlptTienDo.ghiKetQua(td,"n2","while-quiz",{dung:1,tong:2,saiIds:[]},Date.now());
    await ghiTienDoJlpt(td);await syncNow("ja");
  });
  await pc.evaluate(()=>syncNow("ja"));
  check("sync giữ nguyên DOM/câu hỏi đang làm",
    await pc.evaluate(()=>JlptUI.trangThai().chay &&
      document.querySelector(".jl-lua")===window.__questionBeforeSync));
  check("vẫn nhận tiến độ thiết bị kia trong lúc làm câu hỏi",
    await pc.evaluate(async()=>JlptTienDo.daXong((await chrome.storage.local.get("jlpt")).jlpt,"n2","while-quiz")));

  const before=saves;
  await phone.evaluate(async()=>{
    const td=await Store.get("jlpt");
    JlptTienDo.ghiKetQua(td,"n2","auto-push",{dung:1,tong:2,saiIds:[]},Date.now());
    await ghiTienDoJlpt(td);
  });
  const limit=Date.now()+15000;
  while(Date.now()<limit && !cloud.jlpt?.mon?.n2?.chang?.["auto-push"])
    await new Promise(r=>setTimeout(r,100));
  check("ghi tiến độ Android tự hẹn gửi cloud",saves>before && !!cloud.jlpt?.mon?.n2?.chang?.["auto-push"]);
  check("cloud chỉ chứa tiến độ, không mang tuỳ chọn nhạc/thử",!("nhac" in cloud.jlpt)&&!("thu" in cloud.jlpt));
  // Hồ sơ chỉ khai kho chung, không có syncUrl/syncUrlJa: khởi động vẫn phải kéo.
  await sw.evaluate(() => clearTimeout(syncTimer));
  cloud.jlpt.mon.n2.chang["cold-start"]={xong:true,lan:1,tot:50,sao:0,ts:Date.now()};
  const reopened=await desktop.newPage();
  reopened.on("pageerror",e=>errors.push("PC reopen: "+e.message));
  await reopened.goto("chrome-extension://"+id+"/notebook.html");
  await reopened.waitForFunction(async()=>JlptTienDo.daXong((await chrome.storage.local.get("jlpt")).jlpt,"n2","cold-start"));
  check("mở lại extension chỉ khai kho chung vẫn tự kéo tiến độ",true);
  check("không có lỗi trang",errors.length===0);
  console.log("JLPT hai thiết bị: "+checks+" kiểm tra đạt.");
}finally{
  await browser?.close();await desktop?.close();
  await new Promise(r=>srv.close(r));rmSync(profile,{recursive:true,force:true});
}
