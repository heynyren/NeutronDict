import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const store={},calls=[];
let tab={id:23,url:"file:///lesson.pdf#page=14",windowId:7};
const g={crypto:{randomUUID:()=>"01234567-0123-4567-8901-0123456789ab"},chrome:{
  storage:{session:{set:async x=>Object.assign(store,x),get:async k=>({[k]:store[k]})}},
  tabs:{get:async()=>tab,update:async(id,opts)=>calls.push({id,opts}),reload:async(id)=>calls.push({id,reload:true})},
  windows:{update:async()=>{}}
}};
g.self=g;vm.createContext(g);vm.runInContext(readFileSync("extension/pdf-source.js","utf8"),g);
const src={url:tab.url,page:1,cau:"First context sentence."};
await g.PdfSource.remember(src,tab);
assert.ok(src.pdfOrigin.token);
assert.equal(src.pdfOrigin.url,tab.url);
assert.equal(await g.PdfSource.activate(src),true);
// No extracted sentence (src.capture unset): the URL landmark stays the only trustworthy page (14, not context page 1).
assert.deepEqual(JSON.parse(JSON.stringify(calls[0].opts)),{active:true},"URL already on the saved page: just focus");
assert.deepEqual(JSON.parse(JSON.stringify(calls[1])),{id:23,reload:true},"…then reload so the viewer lands on that page (Chrome's viewer ignores a hash-only change)");
assert.equal(g.PdfSource.reopenUrl(src,"ignored"),"file:///lesson.pdf#page=14","without an extracted sentence the original URL page wins");
// With an extracted sentence the page it came from beats a stale URL landmark.
const auto={url:tab.url,page:40,capture:"pdf-auto",pdfOrigin:src.pdfOrigin};
assert.equal(g.PdfSource.reopenUrl(auto,"ignored"),"file:///lesson.pdf#page=40","extracted sentence page overrides the stale opening landmark");
calls.length=0;
assert.equal(await g.PdfSource.activate(auto),true);
assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{id:23,opts:{active:true,url:"file:///lesson.pdf#page=40"}},"live tab is sent to the saved page");
assert.deepEqual(JSON.parse(JSON.stringify(calls[1])),{id:23,reload:true},"and reloaded, because a hash-only change does not move the viewer");
assert.equal(g.PdfSource.withPage("file:///a.pdf#page=3&zoom=150",9),"file:///a.pdf#page=9&zoom=150","zoom is kept");
assert.equal(g.PdfSource.hashPage("file:///a.pdf#zoom=100&page=7"),7);
assert.equal(g.PdfSource.hashPage("file:///a.pdf"),0);
tab={...tab,url:"file:///other.pdf"};
assert.equal(await g.PdfSource.activate(src),false,"a reused tab ID must never open another document");
tab={...tab,url:src.url,discarded:true};
assert.equal(await g.PdfSource.activate(src),false,"discarded tab has no viewport to preserve");
delete store["pdf-source:"+src.pdfOrigin.token];
assert.equal(await g.PdfSource.activate(src),false,"synced or previous browser-session token cannot resolve");
assert.equal(g.PdfSource.reopenUrl({url:"file:///lesson.pdf",page:14},"word search"),"file:///lesson.pdf#page=14");
assert.equal(g.PdfSource.reopenUrl({url:"file:///lesson.pdf",page:0},"legacy text fragment"),"legacy text fragment");
assert.equal(g.PdfSource.cleanOrigin({url:"https://other.test/"},"file:///lesson.pdf"),null);
const bg=readFileSync("extension/background.js","utf8");
const start=bg.indexOf("function pdfSourceUrl(");
vm.runInContext(bg.slice(start,bg.indexOf("\n}",start)+2),g);
assert.equal(g.pdfSourceUrl({frameUrl:"file:///lesson.pdf",pageUrl:"file:///lesson.pdf"},{url:"file:///lesson.pdf#page=14&zoom=150"}),"file:///lesson.pdf#page=14&zoom=150");
assert.equal(g.pdfSourceUrl({frameUrl:"https://example.test/embed.pdf",pageUrl:"https://example.test/article#page=9"},{url:"https://example.test/article#page=9"}),"https://example.test/embed.pdf","parent fragment does not belong to embedded PDF");
console.log("PDF source: original URL landmarks, live-tab reuse without navigation, context-page separation, stale/discarded/synced tab protection OK");
