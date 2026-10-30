import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,existsSync,mkdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve,extname} from "node:path";
import {createServer} from "node:http";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const extension=resolve(process.argv[2]||"extension"),profile=mkdtempSync(join(tmpdir(),"raku-ui-"));
const evidence=join(process.env.RUNNER_TEMP||tmpdir(),"nd-ui");mkdirSync(evidence,{recursive:true});
const server=createServer((req,res)=>{
 const path=resolve("android/www","."+decodeURIComponent(req.url.split("?")[0]));
 if(!path.startsWith(resolve("android/www")+"/")||!existsSync(path)){res.writeHead(404);res.end();return;}
 const types={".js":"text/javascript",".css":"text/css",".html":"text/html",".png":"image/png",".json":"application/json"};
 res.setHeader("Content-Type",types[extname(path)]||"text/plain");res.end(readFileSync(path));
});await new Promise(r=>server.listen(0,"127.0.0.1",r));
const ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:"chromium",args:[ "--disable-extensions-except="+extension,"--load-extension="+extension ]});
let browser;
try{
 const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker"),id=new URL(sw.url()).host;
 await sw.evaluate(()=>chrome.storage.local.set({settings:{chu:"en",ngu:"ja",inline:true},pastelTheme:"blue",notebook:{},hoc:{}}));
 const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("chrome-extension://"+id+"/notebook.html");
 await page.locator("#setBox").evaluate(e=>e.open=true);
 await page.waitForSelector(".pastel-picker input",{state:"attached"});
 assert.equal(await page.locator(".pastel-picker input").count(),6);
 async function settleTheme(p,mode){
  await p.waitForFunction(mode=>getComputedStyle(document.body).color===(mode==="dark"?"rgb(237, 245, 247)":"rgb(23, 49, 59)"),mode);
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await p.evaluate(()=>document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();}));
 }
 async function checkColors(p){
  const colors=await p.evaluate(()=>{
   const target=document.querySelector(".btn.primary"),s=getComputedStyle(target),body=getComputedStyle(document.body);
   const rgb=v=>v.match(/[\d.]+/g).slice(0,3).map(Number);
   const lum=v=>rgb(v).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
   const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   const canvas=document.createElement("canvas");canvas.width=canvas.height=1;const g=canvas.getContext("2d");
   const composite=(fg,bg)=>{g.clearRect(0,0,1,1);g.fillStyle=bg;g.fillRect(0,0,1,1);g.fillStyle=fg;g.fillRect(0,0,1,1);return"rgb("+[...g.getImageData(0,0,1,1).data].slice(0,3).join(",")+")";};
   const nav=document.querySelector("nav"),navBg=nav?composite(getComputedStyle(nav).backgroundColor,body.backgroundColor):null;
   const navigation=nav?[...nav.querySelectorAll("button")].filter(b=>b.getBoundingClientRect().width>0).map(b=>contrast(composite(getComputedStyle(b).color,navBg),navBg)):[];
   const media=[...document.querySelectorAll(".media-bar .btn")].filter(b=>b.getBoundingClientRect().width>0).map(b=>{
    const style=getComputedStyle(b),bg=composite(style.backgroundColor,body.backgroundColor);
    return contrast(composite(style.color,bg),bg);
   });
   return {button:contrast(s.color,s.backgroundColor),body:contrast(body.color,body.backgroundColor),navigation,media,width:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert.ok(colors.button>=4.5,"button contrast "+JSON.stringify(colors));
  assert.ok(colors.body>=4.5,"body contrast "+JSON.stringify(colors));
  assert.ok(colors.navigation.every(c=>c>=4.5),"navigation contrast "+JSON.stringify(colors));
  assert.ok(colors.media.every(c=>c>=4.5),"media controls contrast "+JSON.stringify(colors));
  assert.ok(colors.width<=colors.viewport+1,"horizontal overflow "+JSON.stringify(colors));
 }
 await page.locator("#pastelSettings").scrollIntoViewIfNeeded();
 for(const mode of ["light","dark"]){
  await page.emulateMedia({colorScheme:mode});
  for(const key of ["blue","mint","rose","peach","lavender","butter"]){
   await page.locator('.pastel-choice:has(input[value="'+key+'"])').click();
   await page.waitForFunction(k=>document.documentElement.dataset.pastel===k,key);
   await checkColors(page);
  }
 }
 await page.waitForFunction(async()=>(await chrome.storage.local.get("pastelTheme")).pastelTheme==="butter");
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.pastel==="butter");await page.locator("#setBox").evaluate(e=>e.open=true);
 await page.locator('.pastel-choice:has(input[value="blue"])').click();
 await page.waitForFunction(async()=>(await chrome.storage.local.get("pastelTheme")).pastelTheme==="blue");
 for(const [lang,title]of [["ja","テーマカラー"],["vi","Màu giao diện"],["en","Theme color"]]){
  await page.locator("#setBox").evaluate(e=>e.open=true);
  await page.locator("#chuNgu").selectOption(lang);
  await page.waitForFunction(x=>document.querySelector("#pastelTitle").textContent===x,title);
  assert.equal(await page.locator(".pastel-choice").first().innerText(),lang==="ja"?"ブルー":lang==="en"?"Blue":"Xanh dương");
 }
 await page.locator("#pageProgress").click();
 await page.waitForSelector(".badgegrid");
 assert.match(await page.locator("#progressBody").innerText(),/Daily goal/);
 assert.doesNotMatch(await page.locator("#progressBody").innerText(),/Mục tiêu|Huy hiệu|lượt ôn|Chuỗi ngày/);
 await page.locator("#pageList").click();
 for(const mode of ["light","dark"]){await page.emulateMedia({colorScheme:mode});await settleTheme(page,mode);await page.locator("#pastelSettings").scrollIntoViewIfNeeded();await page.screenshot({animations:"disabled",path:join(evidence,"rakulang-extension-"+mode+".png")});}
 const popup=await ctx.newPage();await popup.goto("chrome-extension://"+id+"/popup.html");
 await popup.waitForFunction(()=>document.documentElement.dataset.pastel==="blue");
 assert.equal(await popup.locator(".brandrow .nm").innerText(),"RaKuLanG");await checkColors(popup);
 const guide=await ctx.newPage();await guide.goto("chrome-extension://"+id+"/ipa-guide.html");
 await guide.waitForSelector("#gVowels .vi");assert.match(await guide.locator("#gVowels .vi").first().innerText(),/vowel/);
 // Exercise the same HTML/JS shipped inside the Android shell.
 browser=await chromium.launch({headless:true});
 const mobile=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 mobile.on("pageerror",e=>errors.push("Android: "+e.message));
 await mobile.addInitScript(()=>{
  localStorage.setItem("chu",JSON.stringify("en"));localStorage.setItem("ngu",JSON.stringify("ja"));
  localStorage.setItem("pastelTheme",JSON.stringify("blue"));
  window.__appearance=JSON.parse(localStorage.getItem("__nativeAppearance")||'{"key":"blue","language":"en","explicit":true}');
  window.Capacitor={Plugins:{NeutronMedia:{
   pastelTheme:async a=>{if(a.key){window.__appearance.key=a.key;localStorage.setItem("__nativeAppearance",JSON.stringify(window.__appearance));}return{key:window.__appearance.key}},
   interfaceLanguage:async a=>{if(a.language){window.__appearance.language=a.language;localStorage.setItem("__nativeAppearance",JSON.stringify(window.__appearance));}return{language:window.__appearance.language,explicit:true}},
   inbox:async()=>({items:[]}),news:async()=>({articles:[],bookmarks:[],feeds:[],minutes:30,updatedAt:1}),
   configureNews:async()=>({}),voiceSettings:async()=>({enabled:false,region:"japaneast",hasKey:false})
  }}};
 });
 await mobile.goto("http://127.0.0.1:"+server.address().port+"/index.html");
 await mobile.waitForFunction(()=>window.NeutronReady);
 await mobile.locator("#navSettings").click();
 await mobile.locator('.pastel-choice:has(input[value="mint"])').click();
 await mobile.waitForFunction(()=>window.__appearance.key==="mint");
 for(const [lang,label]of [["ja","音声とリスニング"],["en","Voices and listening"]]){
  await mobile.locator("#chuBox").evaluate(e=>e.open=true);
  await mobile.locator("#chuNgu").selectOption(lang);
  await mobile.waitForFunction(v=>document.querySelector("#voiceSettings>summary").textContent===v,label);
  await mobile.waitForFunction(v=>window.__appearance.language===v,lang);
  const texts=await mobile.locator("#viewSettings").innerText();
  assert.doesNotMatch(texts,/Giọng đọc|Vùng tài nguyên|Lưu Azure|Đồng bộ, âm thanh/);
 }
 await mobile.locator("#mediaNews").click();
 await mobile.waitForFunction(()=>document.querySelector("#newsDialog").open);
 assert.match(await mobile.locator("#newsDialog").innerText(),/Feeds and updates/);
 assert.doesNotMatch(await mobile.locator("#newsDialog").innerText(),/Nguồn tin|Thêm nguồn|Xem thêm/);
 await mobile.locator("#newsClose").click();
 for(const mode of ["light","dark"]){
  await mobile.emulateMedia({colorScheme:mode});await settleTheme(mobile,mode);
  await mobile.locator("#pastelSettings").scrollIntoViewIfNeeded();
  await checkColors(mobile);
  await mobile.screenshot({animations:"disabled",path:join(evidence,"rakulang-android-"+mode+".png")});
 }
 await mobile.reload();await mobile.waitForFunction(()=>window.NeutronReady);
 assert.equal(await mobile.evaluate(()=>document.documentElement.dataset.pastel),"mint");
 assert.deepEqual(errors,[]);
 console.log("RaKuLanG UI: six pastel presets, light/dark contrast, persistence, EN/JA switching, progress, IPA, news and Android native settings bridge passed.");
}finally{
 await browser?.close();await ctx.close();await new Promise(r=>server.close(r));rmSync(profile,{recursive:true,force:true});
}
