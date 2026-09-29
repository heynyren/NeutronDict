import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const store={},calls=[];
let tab={id:23,url:"file:///lesson.pdf#page=14",windowId:7};
const g={crypto:{randomUUID:()=>"01234567-0123-4567-8901-0123456789ab"},chrome:{
  storage:{session:{set:async x=>Object.assign(store,x),get:async k=>({[k]:store[k]})}},
  tabs:{get:async()=>tab,update:async(id,opts)=>calls.push({id,opts})},
  windows:{update:async()=>{}}
}};
g.self=g;vm.createContext(g);vm.runInContext(readFileSync("extension/pdf-source.js","utf8"),g);
const src={url:tab.url,page:1,cau:"First context sentence."};
await g.PdfSource.remember(src,tab);
assert.ok(src.pdfOrigin.token);
assert.equal(src.pdfOrigin.url,tab.url);
assert.equal(await g.PdfSource.activate(src),true);
assert.deepEqual(JSON.parse(JSON.stringify(calls[0].opts)),{active:true},"focusing must not navigate or re-run a text search");
assert.equal(g.PdfSource.reopenUrl(src,"ignored"),"file:///lesson.pdf#page=14","original URL page takes precedence over context page 1");
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
