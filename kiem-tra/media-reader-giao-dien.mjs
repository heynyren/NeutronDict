import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage();
const script=fs.readFileSync("android/integration/reader-context.js","utf8");
async function capture(html,selector,word,occurrence=0){
 await page.setContent(html);
 await page.evaluate(({selector,word,occurrence})=>{
  const el=document.querySelector(selector),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  let node,count=0;
  while(node=walker.nextNode()){
   let start=-1;
   while((start=node.nodeValue.indexOf(word,start+1))>=0){
    if(count++!==occurrence)continue;
    const r=document.createRange();r.setStart(node,start);r.setEnd(node,start+word.length);
    const s=getSelection();s.removeAllRanges();s.addRange(r);return;
   }
  }
  throw Error("word not found");
 },{selector,word,occurrence});
 const raw=await page.evaluate(script);
 return raw?JSON.parse(raw):null;
}
let result=await capture('<html lang="ja"><p>古いケアです。クリームを塗って肌の<span>ケア</span>をする。次の文です。</p></html>',"p span","ケア");
assert.equal(result.sentence,"クリームを塗って肌のケアをする。");
result=await capture('<html lang="en"><p>Care matters. Take <b>care</b> of your skin. Next sentence.</p></html>',"b","care");
assert.equal(result.sentence,"Take care of your skin.");
result=await capture('<html lang="ja"><p>猫がいる。<ruby>猫<rt>ねこ</rt></ruby>が走る。</p></html>',"ruby","猫");
assert.equal(result.sentence,"猫が走る。");
result=await capture('<html lang="en"><p>First care. Second care.</p></html>',"p","care",1);
assert.equal(result.sentence,"Second care.");
result=await capture('<html lang="ja"><ul><li>ケアをする。</li><li>次の例。</li></ul></html>',"li","ケア");
assert.equal(result.sentence,"ケアをする。");
assert.equal(await capture('<div contenteditable="true">secret</div>',"div","secret"),null);
console.log("Reader context: exact occurrence, inline spans, ruby, Japanese/English sentences, bullets and private editors passed.");
}finally{await browser.close();}
