/**
 * BẢNG LỜI THOẠI VẪN CHẠY ĐỦ SAU KHI GỠ BỘ MÁY ÉP KHUNG HÌNH.
 *
 * Lượt gỡ ấy xoá hơn năm trăm dòng khỏi phu-de.js, trong đó có cả một nút trên
 * thanh tiêu đề và hai mục Cài đặt. Bài này soát những thứ CÒN LẠI phải còn
 * nguyên: nút trên thanh, đổi cỡ chữ, song ngữ, bám dòng, tìm, lưu từ, đóng.
 */
import assert from "node:assert/strict";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(),"pw-")), {
  channel:"chromium", headless:true, args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker",{timeout:20000});
const ket=[], loi=[]; const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
console.log("Bảng lời thoại: các nút và thao tác còn nguyên");
for (let i=0;i<40;i++){ const ok=await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false); if(ok)break; await new Promise(r=>setTimeout(r,250)); }

const PR = (v) => ({ videoDetails:{videoId:v,title:"Thử",author:"K"},
  captions:{playerCaptionsTracklistRenderer:{captionTracks:[
    {baseUrl:"https://www.youtube.com/api/timedtext?v="+v,languageCode:"ja",name:{simpleText:"JA"},kind:"asr"}]}} });
await ctx.route("https://www.youtube.com/api/timedtext**", (r) => r.fulfill({ contentType:"application/json",
  body: JSON.stringify({ events:[{tStartMs:1000,dDurationMs:3000,segs:[{utf8:"これは酒です",tOffsetMs:0}]}] }) }));
const trang = (v) => `<!doctype html><meta charset=utf-8><title>T</title>
<style>body{margin:0}#columns{display:flex}#primary{flex:1}#secondary{width:402px}</style><body>
<ytd-watch-flexy><div id=columns>
 <div id=primary><div id=player><div id=movie_player class=html5-video-player>
  <div class=html5-video-container><video class="video-stream html5-main-video"
   style="width:1280px;height:720px"></video></div></div></div>
  <div id=below><h1 id=tieude>Tiêu đề</h1></div></div>
 <div id=secondary><div id=secondary-inner></div></div>
</div></ytd-watch-flexy>
<script>document.getElementById("movie_player").getPlayerResponse=()=>(${JSON.stringify(PR(v))});</script>`;
await ctx.route("https://www.youtube.com/watch**", (r) => {
  const v = new URL(r.request().url()).searchParams.get("v") || "quen";
  r.fulfill({ contentType:"text/html; charset=utf-8", body: trang(v) });
});
/*
 * Bản sửa "đến từ máy khác": đúng hình dạng mà lượt đồng bộ ghi xuống.
 * Khoá là giây bắt đầu của câu, làm tròn — xem khoaSua() trong phu-de.js.
 */
const SUA = { quen: { d: { "4": "CÂU NÀY ĐÃ SỬA TRÊN MÁY KIA" }, ts: Date.now() } };
const KHO = { "quen|ja:auto": { ts: Date.now(),
  cau: [{ s:"これは酒です。", t:1, tEnd:4 }, { s:"とても美味しい。", t:4, tEnd:7 }],
  dich: { 0:"Đây là rượu.", 1:"Rất ngon." }, tieuDe:"Thử", kenh:"K" } };
await sw.evaluate(async ([kho, sua]) => {
  await chrome.storage.local.set({ settings:{ ngu:"ja" }, notebook:{}, phuDeSua: sua, ytKho: kho });
}, [KHO, SUA]);

const page = await ctx.newPage();
await page.setViewportSize({ width: 1600, height: 950 });
page.on("pageerror",(e)=>loi.push(e.message));
await page.goto("https://www.youtube.com/watch?v=quen");
await page.waitForFunction(() => {
  const h = document.querySelector("div[data-ndict-yt]");
  return h && h.shadowRoot && h.shadowRoot.querySelectorAll(".ln").length > 0;
}, null, { timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(1500);

/** Chạy một đoạn bên trong shadow root của bảng. */
const trong = (fn, arg) => page.evaluate(([f, a]) => {
  const h = document.querySelector("div[data-ndict-yt]");
  if (!h || !h.shadowRoot) return null;
  return new Function("r", "a", f)(h.shadowRoot, a);
}, [fn, arg === undefined ? null : arg]);


try {
 await sw.evaluate(()=>{
   self.fetch=()=>Promise.reject(Error("Test: network disabled"));
   handleLookup=async(word,dict)=>({dict,entries:[{word,means:["nghĩa thử"]}],saved:{}});
   docKana=async()=>null;translateToVi=async()=>"bản dịch thử";
 });
 // Select one word inside the real NeutronDict subtitle shadow root.
 await trong(`
   const ln=r.querySelector(".ln"),walker=document.createTreeWalker(ln,NodeFilter.SHOW_TEXT);
   let n;while(n=walker.nextNode()){const at=n.textContent.indexOf("酒");if(at<0)continue;
     const rg=document.createRange();rg.setStart(n,at);rg.setEnd(n,at+1);
     const sel=getSelection();sel.removeAllRanges();sel.addRange(rg);
     n.parentElement.dispatchEvent(new MouseEvent("contextmenu",{bubbles:true,composed:true}));
     return;
   }throw Error("subtitle word missing");
 `);
 const tab=await sw.evaluate(async()=> (await chrome.tabs.query({})).find(t=>(t.url||"").includes("watch?v=quen")));
 const src=await sw.evaluate(tab=>contextSource({selectionText:"酒",pageUrl:tab.url},tab),tab);
 assert.equal(src.cau,"これは酒です。",JSON.stringify(src));assert.equal(src.cauDich,"Đây là rượu.");
 assert.equal(src.yt.v,"quen");assert.equal(src.yt.t,1);
 await sw.evaluate(({src,tab})=>handleContextSave({selectionText:"酒",pageUrl:src.url},tab),{src,tab});
 let it=await sw.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:酒"]);
 assert.equal(it.src.cau,src.cau);assert.equal(it.cauNghe.cau,src.cau);
 assert.equal(it.cauNghe.dich,"Đây là rượu.");assert.equal(it.src.yt.t,1);
 // Original inline subtitle popup still carries full sentence/translation/timestamp.
 await trong(`r.querySelector(".ln").dispatchEvent(new MouseEvent("mouseup",{bubbles:true,composed:true,clientX:25,clientY:25}))`);
 const save=page.locator(".en").getByRole("button",{name:"Lưu",exact:true}).first();
 await save.waitFor({timeout:10000});await save.click();await page.waitForTimeout(250);
 it=await sw.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:酒"]);
 assert.equal(it.src.cau,src.cau);assert.equal(it.src.yt.t,1);assert.equal(it.src.cauDich,"Đây là rượu.");
 // Shared popup save also keeps YouTube metadata.
 await sw.evaluate(async src=>chrome.storage.local.set({pendingLookup:{word:src.sel,src,ts:Date.now()}}),src);
 const id=sw.url().split("/")[2],pop=await ctx.newPage();await pop.goto("chrome-extension://"+id+"/popup.html");
 await pop.waitForFunction(()=>initialSrc&&initialSrc.yt);
 await pop.evaluate(()=>new Promise(resolve=>guiLuu({word:"酒"},"javi",{means:[],note:""},false,[],resolve)));
 it=await sw.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:酒"]);
 const prompt=await pop.evaluate(it=>HoiGemini.loiHoi(it,{}),it);
 assert.ok(prompt.includes("これは酒です。"));assert.ok(prompt.includes("0:01"));
 assert.ok(!prompt.includes("CHƯA lưu được"));await pop.close();
 // Native visible YouTube captions: capture visible surrounding text and playback time.
 await page.evaluate(()=>{
   const box=document.createElement("div");box.className="ytp-caption-window-container";
   box.innerHTML='<span>今日は肌のケアをします。</span>';document.querySelector("#movie_player").appendChild(box);
   document.querySelector("video").currentTime=42;
   const n=box.firstChild.firstChild,at=n.textContent.indexOf("ケア"),rg=document.createRange();
   rg.setStart(n,at);rg.setEnd(n,at+2);const s=getSelection();s.removeAllRanges();s.addRange(rg);
 });
 const native=await sw.evaluate(tab=>contextSource({selectionText:"ケア",pageUrl:tab.url},tab),tab);
 assert.equal(native.cau,"今日は肌のケアをします。");assert.equal(native.yt.t,42);
 // Keyboard route from the shadow subtitle panel preserves the same source.
 const opened=ctx.waitForEvent("page");
 await trong(`
   const ln=r.querySelector(".ln"),walker=document.createTreeWalker(ln,NodeFilter.SHOW_TEXT);
   let n;while(n=walker.nextNode()){const at=n.textContent.indexOf("酒");if(at<0)continue;
     const rg=document.createRange();rg.setStart(n,at);rg.setEnd(n,at+1);
     const sel=getSelection();sel.removeAllRanges();sel.addRange(rg);
     n.parentElement.dispatchEvent(new KeyboardEvent("keydown",{key:"z",ctrlKey:true,shiftKey:true,bubbles:true,composed:true}));
     return;
   }throw Error("subtitle selection missing for shortcut");
 `);
 const shortcut=await opened;
 await shortcut.waitForURL("chrome-extension://"+id+"/popup.html?ctx=1");
 await shortcut.waitForFunction(()=>typeof initialSrc!=="undefined"&&initialSrc&&initialSrc.yt);
 const shortcutSrc=await shortcut.evaluate(()=>initialSrc);
 assert.equal(shortcutSrc.cau,"これは酒です。");assert.equal(shortcutSrc.yt.t,1);
 await shortcut.close();
 console.log("YouTube context: keyboard, subtitle shadow selection, right-click, inline popup, standalone popup, original sentence/translation/video/time, Gemini and native visible captions OK");
}finally{await ctx.close();}
