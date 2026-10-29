import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const template=fs.readFileSync("android/integration/reader-source.js","utf8");
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:393,height:851}});
 const restore=async quote=>JSON.parse(await page.evaluate(template.replace("__NEUTRON_SOURCE__",JSON.stringify(quote))));
 const cases=[
  {html:'<article><p id="first">ケアの方法を学ぶ。</p><div style="height:1800px"></div><p id="target">クリームを塗って肌のケアをする。</p></article>',
   quote:{word:"ケア",sentence:"クリームを塗って肌のケアをする。",prefix:"クリームを塗って肌の",suffix:"をする。"}},
  {html:'<p>以前の<span id="first">ケア</span>ではなく、今は肌の<span id="target">ケア</span>をする。</p>',
   quote:{word:"ケア",sentence:"以前のケアではなく、今は肌のケアをする。",prefix:"今は肌の",suffix:"をする。"}},
  {html:'<p id="target">毎日、<ruby>日<rt>に</rt>本<rt>ほん</rt>語<rt>ご</rt></ruby>の記事を読む。</p>',
   quote:{word:"日本語",sentence:"毎日、日本語の記事を読む。",prefix:"毎日、",suffix:"の記事を読む。"}},
  {html:'<p id="target">設備の<span>可</span><strong>否</strong>を確認する。</p>',
   quote:{word:"可否",sentence:"設備の可否を確認する。",prefix:"設備の",suffix:"を確認する。"}},
  {html:'<p id="target">We can&nbsp;<span>take</span> <em>care</em> of the skin.</p>',
   quote:{word:"take care",sentence:"We can take care of the skin.",prefix:"We can ",suffix:" of the skin."}},
  {html:'<p hidden>肌のケアをする。</p><p aria-hidden="true">肌のケアをする。</p><p id="target">肌のケアをする。</p>',
   quote:{word:"ケア",sentence:"肌のケアをする。",prefix:"肌の",suffix:"をする。"}}
 ];
 for(const fixture of cases){
  await page.setContent('<html lang="ja">'+fixture.html+"</html>");
  const original=await page.locator("body").textContent();
  const result=await restore(fixture.quote);assert.equal(result.status,"found");
  assert.equal(await page.locator("body").textContent(),original,"Restore preserves article text");
  const marked=await page.locator("mark[data-neutrondict-source]").allTextContents();
  assert.equal(marked.join("").replace(/\s/g,""),fixture.quote.word.replace(/\s/g,""),"Only the saved word is highlighted");
  assert.equal(await page.locator("#target mark[data-neutrondict-source]").count(),marked.length);
  assert.equal(await page.locator("#first mark[data-neutrondict-source]").count(),0);
  assert.equal(await page.locator("rt mark,rp mark").count(),0);
  assert.equal(await page.evaluate(()=>getSelection().toString()),"","Restore does not trigger selection lookup");
  const box=await page.locator("mark[data-neutrondict-source]").first().boundingBox();
  assert.ok(box.y>=0 && box.y<851,"The saved word is scrolled into view");
  await restore(fixture.quote);
  assert.equal(await page.locator("mark[data-neutrondict-source]").count(),marked.length,"Retries are idempotent");
 }
 // Hydration may replace only one of a word's inline fragments.
 await page.setContent('<p id="target">設備の<span>可</span><strong>否</strong>を確認する。</p>');
 const split={word:"可否",sentence:"設備の可否を確認する。",prefix:"設備の",suffix:"を確認する。"};
 await restore(split);
 await page.evaluate(()=>document.querySelector("strong").textContent="否");
 await restore(split);
 assert.equal((await page.locator("#target mark").allTextContents()).join(""),"可否");
 // DOM nodes and publisher listeners survive; no body.innerHTML replacement.
 await page.setContent('<p>最初のケア。</p><p>肌の<span id="target">ケア</span>をする。</p>');
 await page.evaluate(()=>{window.clicks=0;document.querySelector("#target").onclick=()=>window.clicks++;});
 const quote={word:"ケア",sentence:"肌のケアをする。",prefix:"肌の",suffix:"をする。"};
 await restore(quote);await page.locator("#target").click();assert.equal(await page.evaluate(()=>clicks),1);
 // A retry can find delayed content and reapply after hydration removed old marks.
 await page.setContent("<article id='article'></article>");
 assert.equal((await restore(quote)).status,"not-found");
 await page.evaluate(()=>new Promise(resolve=>setTimeout(()=>{document.querySelector("article").innerHTML="<p id='target'>肌のケアをする。</p>";resolve();},50)));
 assert.equal((await restore(quote)).status,"found");
 await page.evaluate(()=>{document.querySelector("#target").outerHTML="<p id='target'>肌のケアをする。</p>";});
 assert.equal((await restore(quote)).status,"found");
 assert.equal(await page.locator("#target mark").textContent(),"ケア");
 // Prefix tail and suffix head disambiguate repeated words even if the sentence changed.
 await page.setContent("<p id='first'>以前のケアです。</p><p id='target'>今は肌のケアをする。</p>");
 assert.equal((await restore({word:"ケア",sentence:"",prefix:"x".repeat(300)+"今は肌の",suffix:"をする。"})).status,"found");
 assert.equal(await page.locator("#target mark").textContent(),"ケア");
 await page.setContent('<textarea>secret</textarea><div contenteditable="true">secret</div>');
 assert.equal((await restore({word:"secret"})).status,"not-found");
 console.log("Reader source: word-only highlight, exact occurrence, ruby, split inline nodes, scrolling, delayed DOM and hydration: OK");
}finally{await browser.close();}
