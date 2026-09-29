import assert from "node:assert/strict";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
const ext=path.resolve(process.argv[2]||"extension"),profile=mkdtempSync(path.join(tmpdir(),"nd-web-context-"));
const ctx=await chromium.launchPersistentContext(profile,{channel:"chromium",headless:true,args:["--disable-extensions-except="+ext,"--load-extension="+ext]});
const sentence="(b) 上記(a)の原理の電力量計の使用の可否を検討するために，電力量計の計量の誤差率を求める実験を行った。";
const ruby="クリームを塗って肌のケアをする。";
const longPrefix="これは文章の先頭から始まる説明であり".repeat(4);
const longSource="私は"+"毎日".repeat(120)+"ケアを続けています。";
let sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker");
const id=sw.url().split("/")[2];
try{
 await sw.evaluate(async()=>{
   self.fetch=()=>Promise.reject(Error("Test: external network disabled"));
   handleLookup=async(word,dict)=>({dict:dict==="auto"?"javi":dict,entries:[{word,means:["nghĩa thử"],reading:""}],saved:{}});
   docKana=async()=>null;translateToVi=async()=>"bản dịch thử";
   await chrome.storage.local.set({settings:{ngu:"ja",translate:false},notebook:{},hoc:{}});
 });
 await ctx.route("https://example.test/**",r=>r.fulfill({contentType:"text/html; charset=utf-8",body:`<!doctype html><title>Web context</title>
 <p id=real>${sentence}</p>
 <p id=ruby>クリームを<ruby>塗<rt>ぬ</rt></ruby>って肌の<span>ケア</span>をする。</p>
 <p id=prefix>${longPrefix}<b>ケア</b>は大切です。</p>
 <p id=long>${longSource}</p><ul><li id=bullet>肌の<span>ケア</span>を続ける</li></ul>
 <p id=english>Take <b>care</b> of your skin.</p>`}));
 const page=await ctx.newPage();await page.goto("https://example.test/lesson");
 const tab=await sw.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url==="https://example.test/lesson"));
 const capture=async(selector,word)=>{
   await page.evaluate(({selector,word})=>{
     const el=document.querySelector(selector),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
     let n;while(n=walker.nextNode()){const at=n.textContent.indexOf(word);if(at<0)continue;
       const range=document.createRange();range.setStart(n,at);range.setEnd(n,at+word.length);
       const sel=getSelection();sel.removeAllRanges();sel.addRange(range);return;
     }throw Error("word not found");
   },{selector,word});
   return sw.evaluate(async({tab,word})=>contextSource({selectionText:word,pageUrl:tab.url},tab),{tab,word});
 };
 let src=await capture("#real","可否");assert.equal(src.cau,sentence);
 assert.equal((await capture("#ruby","ケア")).cau,ruby,"furigana removed");
 assert.equal((await capture("#prefix","ケア")).cau,longPrefix+"ケアは大切です。");
 assert.equal((await capture("#bullet","ケア")).cau,"肌のケアを続ける");
 assert.equal((await capture("#english","care")).cau,"Take care of your skin.");
 src=await capture("#real","可否");
 // Exact context-menu handler through real DOM and storage.
 await sw.evaluate(({src,tab})=>handleContextSave({selectionText:src.sel,pageUrl:src.url},tab),{src,tab});
 const read=word=>sw.evaluate(async word=>(await chrome.storage.local.get("notebook")).notebook["javi:"+word],word);
 let item=await read("可否");assert.equal(item.src.cau,sentence);assert.equal(item.cauNghe.cau,sentence);
 // Popup receives captured source, then uses its actual save function (previous loss point).
 await sw.evaluate(async src=>chrome.storage.local.set({pendingLookup:{word:src.sel,src,ts:Date.now()}}),src);
 const popup=await ctx.newPage();await popup.goto("chrome-extension://"+id+"/popup.html");
 await popup.waitForFunction(()=>initialSrc&&initialSrc.sel==="可否");
 await popup.evaluate(()=>new Promise(resolve=>guiLuu({word:"可否"},"javi",{means:["thử"],note:""},false,[],resolve)));
 assert.equal((await read("可否")).src.cau,sentence);
 const prompt=await popup.evaluate(it=>HoiGemini.loiHoi(it,{}),await read("可否"));
 assert.ok(prompt.includes(sentence));assert.ok(!prompt.includes("CHƯA lưu được"));
 await popup.close();
 // Toolbar popup captures the active web selection without pendingLookup.
 await page.bringToFront();src=await capture("#real","可否");
 const toolbar=await ctx.newPage();await toolbar.goto("chrome-extension://"+id+"/popup.html");
 await toolbar.waitForFunction(()=>typeof getInitialWord==="function");
 await page.bringToFront();
 const initial=await toolbar.evaluate(async()=>{await getInitialWord();return initialSrc;});
 assert.ok(initial&&initial.prefix&&initial.suffix,"toolbar path captures context, not only selected text");
 await toolbar.close();
 // Freeze source before asynchronous inline lookup returns and selection disappears.
 await page.bringToFront();await capture("#ruby","ケア");
 await sw.evaluate(tabId=>chrome.scripting.executeScript({target:{tabId},func:()=>{
   self.Song.gui=((original)=>function(msg,cb){if(msg.type==="LOOKUP")setTimeout(()=>original.call(this,msg,cb),120);else original.call(this,msg,cb);})(self.Song.gui);
   self.__ND_popup(30,30,"ケア");
   getSelection().removeAllRanges();
 }}),tab.id);
 const inline=page.getByRole("button",{name:"Lưu",exact:true}).first();
 await inline.waitFor({timeout:10000});await inline.click();
 await page.waitForTimeout(250);
 assert.equal((await read("ケア")).src.cau,ruby,"inline lookup keeps snapshot after selection is cleared");
 // A long source is kept for Gemini without manufacturing a listening sentence.
 const long=await capture("#long","ケア");
 await sw.evaluate(async src=>{await chrome.storage.local.set({notebook:{}});await saveWord({word:"ケア",means:[],src},"javi");},long);
 item=await read("ケア");assert.equal(item.src.cau,longSource);assert.equal(item.cauNghe,undefined);
 // Restore old stored context atomically, preserving latest study/manual fields.
 await sw.evaluate(async({src,sentence})=>{
   const legacy={word:"可否",dict:"javi",src:{url:src.url,sel:"可否",prefix:src.prefix,suffix:src.suffix},
     duong:{nhin:{lv:5,due:123}},lichRieng:{nghe:{dongBang:true}},mangTat:1,mEdit:1,means:["tự sửa"],note:"ghi chú",ts:99};
   await chrome.storage.local.set({notebook:{"javi:可否":legacy}});
   await phucHoiNguCanhWeb();await phucHoiNguCanhWeb();
 },{src,sentence});
 item=await read("可否");assert.equal(item.src.cau,sentence);assert.equal(item.cauNghe.cau,sentence);
 assert.equal(item.ts,99);assert.equal(item.duong.nhin.lv,5);assert.equal(item.lichRieng.nghe.dongBang,true);
 assert.equal(item.means[0],"tự sửa");assert.equal(item.mangTat,1);assert.equal(item.note,"ghi chú");
 console.log("Web browser: real DOM context capture, context-menu save, popup, toolbar, inline selection race, ruby, bullets, long source and old-context/SRS preservation OK");
}finally{await ctx.close();rmSync(profile,{recursive:true,force:true});}
