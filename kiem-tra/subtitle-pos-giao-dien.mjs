import assert from "node:assert/strict";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
import {mkdtempSync,mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const ext=process.argv[2],out=join(process.env.RUNNER_TEMP||tmpdir(),"nd-ui");
mkdirSync(out,{recursive:true});
const ctx=await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(),"nd-pos-")),{
 channel:"chromium",headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
let page;
try{
 const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker");
 const text="私は本を読みます。しかし、彼は速く走る。";
 const actual=await sw.evaluate(async text=>analyzeSubtitleRows([{id:0,text},{id:1,text:"😀猫は猫です。"}]),text);
 assert.equal(actual.ok,true,JSON.stringify(actual));
 for(const pos of ["noun","verb","conjunction","pronoun","particle"])assert(actual.rows[0].tokens.some(t=>t.pos===pos),pos);
 for(const row of actual.rows)for(const t of row.tokens)assert(row.text.slice(t.start,t.end).length>0);
 const original=actual.rows[1];assert.equal(original.text.slice(original.tokens.find(t=>t.pos==="noun").start,original.tokens.find(t=>t.pos==="noun").end),"猫");
 await assert.rejects(sw.evaluate(()=>analyzeSubtitleRows(new Array(9).fill({text:"x"}))));
 await sw.evaluate(async text=>{
   self.fetch=()=>Promise.reject(Error("Offline test"));
   translateToVi=async()=>"Bản dịch";
   await chrome.storage.local.set({settings:{ngu:"ja"},ytKho:{"posvideo|ja:auto":{ts:Date.now(),cau:[
    {s:text,t:1,tEnd:8,manh:[{a:0,b:2,t:1},{a:2,b:9,t:3},{a:9,b:text.length,t:5}]}
   ],dich:{0:"Tôi đọc sách. Nhưng anh ấy chạy nhanh."},tieuDe:"POS",kenh:"Test"}}});
 },text);
 const html=`<!doctype html><style>body{margin:0}#columns{display:flex}#primary{flex:1}#secondary{width:440px}</style>
 <ytd-watch-flexy><div id=columns><div id=primary><div id=player><div id=movie_player class=html5-video-player>
 <video style="width:700px;height:450px"></video></div></div><div id=below><h1>POS</h1></div></div>
 <div id=secondary><div id=secondary-inner></div></div></div></ytd-watch-flexy>
 <script>document.getElementById('movie_player').getPlayerResponse=()=>({videoDetails:{videoId:"posvideo",title:"POS"},
 captions:{playerCaptionsTracklistRenderer:{captionTracks:[{baseUrl:"https://www.youtube.com/api/timedtext?v=posvideo",languageCode:"ja",name:{simpleText:"JA"},kind:"asr"}]}}});
 const v=document.querySelector('video');v.currentTime=3.5;v.play=()=>Promise.resolve();</script>`;
 await ctx.route("https://www.youtube.com/**",r=>r.fulfill({contentType:"text/html",body:html}));
 page=await ctx.newPage();await page.setViewportSize({width:1450,height:900});
 await page.goto("https://www.youtube.com/watch?v=posvideo");
 const host=page.locator("[data-ndict-yt]");
 await host.locator(".ln .nd-pos[data-pos=verb]").first().waitFor({timeout:30000});
 const originalText=await host.locator(".tx").first().evaluate(e=>Array.from(e.childNodes).filter(n=>!n.classList?.contains("vi")).map(n=>n.textContent).join(""));
 assert.equal(originalText,text);
 await host.locator(".pc.now .nd-pos").first().waitFor({timeout:5000});
 const token=host.locator(".ln .nd-pos[data-pos=noun]").first();
 await token.evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);getSelection().removeAllRanges();getSelection().addRange(r);e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,composed:true}));});
 const saved=await sw.evaluate(async()=>{const tab=(await chrome.tabs.query({})).find(t=>t.url?.includes("posvideo"));return contextSource({selectionText:"本",pageUrl:tab.url},tab);});
 assert.equal(saved.sel,"本");assert.equal(saved.cau,text);assert.equal(saved.yt.v,"posvideo");
 await page.evaluate(()=>getSelection().removeAllRanges());
 await page.screenshot({path:join(out,"subtitle-pos-light.png")});
 await page.emulateMedia({colorScheme:"dark"});await page.screenshot({path:join(out,"subtitle-pos-dark.png")});
 await host.locator('[data-action="pos"]').click();
 assert.equal(await host.locator(".box").evaluate(e=>e.classList.contains("pos-on")),false);
 assert.equal(await host.locator(".pos-legend").isVisible(),false);
 assert.equal(await sw.evaluate(async()=>(await chrome.storage.local.get("ytLoaiTu")).ytLoaiTu),false);
 // Shared offscreen ownership: PDF error handling cannot close an active POS worker.
 await ctx.route("https://example.org/not-a-pdf",r=>r.fulfill({contentType:"text/html",body:"offline fixture"}));
 const both=await sw.evaluate(async()=>Promise.all([
  analyzeSubtitleRows([{id:7,text:"しかし、猫が走る。"}]),
  extractPdfContext("https://example.org/not-a-pdf","猫",0)
 ]));
 assert.equal(both[0].ok,true);assert.equal(both[1].ok,false);
 console.log("Real bundled Kuromoji worker, Japanese POS, emoji, visible-row colors, timing, source selection, toggle and PDF lifecycle OK");
}catch(e){await page?.screenshot({path:join(out,"subtitle-pos-failed.png")}).catch(()=>{});throw e;}finally{await ctx.close();}
