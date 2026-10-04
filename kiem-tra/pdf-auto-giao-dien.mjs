import assert from "node:assert/strict";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {createServer} from "node:http";
// Real two-page PDF with Japanese text, ruby, and a separate Vietnamese line.
const sentence="クリームを塗って肌のケアをする。";
const second="毎日ケアをしています。";
const hex=s=>[...s].map(c=>c.charCodeAt(0).toString(16).padStart(4,"0")).join("");
function fixture(){
  const translation="Bôi kem để chăm sóc da.";
  const chars=[...new Set(sentence+second+translation+"ぬ□・ (N/Nする)")];
  const cmap="/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Unicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n"+
    chars.length+" beginbfchar\n"+chars.map(c=>"<"+hex(c)+"> <"+hex(c)+">").join("\n")+
    "\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
  const line=(text,x,y,size=16)=>"BT /F1 "+size+" Tf 1 0 0 1 "+x+" "+y+" Tm <"+hex(text)+"> Tj ET\n";
  const stream=line("□ケア",40,768,14)+line("(N/Nする)",130,768,9)+line("・クリームを",220,760)+line("塗って肌の",316,760)+line("ケアをする。",396,760)+
    line("ぬ",316,773,7)+line(translation,220,715,12)+line(second,220,675);
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 8 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 7 0 R >>",
    "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 0 >> /DW 1000 >>",
    "<< /Length "+stream.length+" >>\nstream\n"+stream+"endstream",
    "<< /Length "+cmap.length+" >>\nstream\n"+cmap+"\nendstream",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>"
  ];
  let pdf="%PDF-1.7\n",offsets=[0];
  objects.forEach((s,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+" 0 obj\n"+s+"\nendobj\n";});
  const xref=Buffer.byteLength(pdf);
  pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n"+
    offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+
    "trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n";
  return Buffer.from(pdf);
}

const ext=path.resolve(process.argv[2]||"extension");
const profile=mkdtempSync(path.join(tmpdir(),"nd-auto-pdf-"));
const docDir=mkdtempSync(path.join(tmpdir(),"nd-auto-doc-"));
const file=path.join(docDir,"lesson.pdf");writeFileSync(file,fixture());
const url=pathToFileURL(file).href+"#page=2";
const options={channel:"chromium",headless:true,args:["--disable-extensions-except="+ext,"--load-extension="+ext]};
let ctx=await chromium.launchPersistentContext(profile,options),server;
const worker=async()=>ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker");
try{
  let sw=await worker(),id=sw.url().split("/")[2];
  // Grant the same one-time file URL permission required in Chrome settings.
  if(!(await sw.evaluate(()=>chrome.extension.isAllowedFileSchemeAccess()))){
    await ctx.close();
    const prefsPath=path.join(profile,"Default","Preferences"),prefs=JSON.parse(readFileSync(prefsPath,"utf8"));
    prefs.extensions??={};prefs.extensions.settings??={};prefs.extensions.settings[id]??={};
    prefs.extensions.settings[id].allow_file_access=true;writeFileSync(prefsPath,JSON.stringify(prefs));
    ctx=await chromium.launchPersistentContext(profile,options);sw=await worker();id=sw.url().split("/")[2];
  }
  assert.ok(await sw.evaluate(()=>chrome.extension.isAllowedFileSchemeAccess()),"file permission enabled for test profile");
  await sw.evaluate(async()=>{
    self.fetch=()=>Promise.reject(Error("Test: dictionary/translation network unavailable"));
    await chrome.storage.local.set({settings:{ngu:"ja"},notebook:{},hoc:{}});
  });
  const page=await ctx.newPage();await page.goto(url,{waitUntil:"domcontentloaded"});
  const tabs=await sw.evaluate(()=>chrome.tabs.query({}));
  const tab=tabs.find(t=>t.url===url);assert.ok(tab,"native PDF remains open in its original tab");
  const count=tabs.length;
  // Exercise the exact handler wired to chrome.contextMenus.onClicked.
  await sw.evaluate(async({url,tab})=>{
    await handleContextSave({menuItemId:"luu-neutron",selectionText:"ケア",pageUrl:url},tab);
  },{url,tab});
  const read=()=>sw.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:ケア"]);
  let it=await read();
  assert.equal(it.src.cau,sentence);assert.equal(it.cauNghe.cau,sentence);
  assert.equal(it.src.capture,"pdf-auto");
  // The sentence occurs on pages 1 AND 2 and the tab was opened at #page=2: the occurrence
  // NEAREST the page being read is chosen (it used to be page 1, the first in document order).
  assert.equal(it.src.page,2,"repeated word: pick the occurrence nearest the reading page");
  assert.equal(it.src.pdfOrigin.url,url);
  assert.ok(it.src.pdfOrigin.token);
  assert.ok(it.src.documentId);assert.equal(it.cauNghe.dich,"");
  assert.equal((await sw.evaluate(()=>chrome.tabs.query({}))).length,count,"saving must not open any tab");
  assert.equal(page.url(),url,"saving must not navigate to another reader");
  assert.equal((await sw.evaluate(()=>chrome.runtime.getContexts({contextTypes:["OFFSCREEN_DOCUMENT"]}))).length,0,"parser closed after saving");
  assert.ok(await sw.evaluate(it=>Srs.duongCo(it).includes("nghe"),it));
  const verify=await ctx.newPage();await verify.goto("chrome-extension://"+id+"/notebook.html");
  await verify.waitForFunction(()=>typeof HoiGemini!=="undefined"&&typeof NguPhap!=="undefined");
  const use=await verify.evaluate(it=>({gemini:HoiGemini.loiHoi(it,{}),grammar:NguPhap.layCau(it)}),it);
  assert.ok(use.gemini.includes(sentence));assert.ok(!use.gemini.includes("CHƯA lưu được"));
  assert.equal(use.grammar,sentence);
  await verify.evaluate(it=>{
    theCardHienTai=()=>it;
    ttsSpeak=(text)=>{self.testSpoken=text;};
    phatCauNghe();
  },it);
  assert.equal(await verify.evaluate(()=>self.testSpoken),sentence,"study listening speaks the whole saved sentence");
  const tabsBeforeReturn=(await sw.evaluate(()=>chrome.tabs.query({}))).length;
  await verify.evaluate(it=>openSource(it,true),it);
  assert.equal((await sw.evaluate(()=>chrome.tabs.query({}))).length,tabsBeforeReturn,"returning to a live PDF must not open a duplicate or split window");
  const returned=await sw.evaluate(id=>chrome.tabs.get(id),tab.id);
  assert.equal(returned.active,true);assert.equal(returned.url,url,"return goes to the saved page-2 URL without a text search");
  await verify.close();

  await sw.evaluate(async()=>{
    await vaSau(async()=>{
      const nb=(await chrome.storage.local.get("notebook")).notebook,it=nb["javi:ケア"];
      it.duong={nhin:{ngay:30,lv:4,due:123456,ts:999}};
      it.lichRieng={nhin:{dongBang:true,ts:1000}};it.mangTat=1;it.dongBang=1;
      it.means=["nghĩa tự sửa"];it.mEdit=1;it.note="ghi chú";it.cauNghe.dich="bản dịch tự sửa";
      await chrome.storage.local.set({notebook:nb});
    });
  });
  const before=await read();
  // Two simultaneous saves serialize parser lifecycle and preserve all learning fields.
  await sw.evaluate(async({url,tab})=>Promise.all([
    handleContextSave({selectionText:"ケア",pageUrl:url},tab),
    handleContextSave({selectionText:"ケア",pageUrl:url},tab)
  ]),{url,tab});
  it=await read();assert.deepEqual(it.duong,before.duong);assert.deepEqual(it.lichRieng,before.lichRieng);
  assert.deepEqual(it.means,before.means);assert.equal(it.note,before.note);assert.equal(it.mangTat,1);
  assert.equal(it.cauNghe.dich,"bản dịch tự sửa");
  const status=await sw.evaluate(async()=>(await chrome.storage.local.get("lastContextSave")).lastContextSave);
  assert.equal(status.ok,true,"multiple source sentences use the first sentence without warning");

  // PDF endpoint with no .pdf suffix works via MIME/signature detection.
  server=createServer((req,res)=>{res.writeHead(200,{"Content-Type":"application/pdf","Access-Control-Allow-Origin":"*"});res.end(fixture());});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const webUrl="http://127.0.0.1:"+server.address().port+"/download";
  const result=await sw.evaluate(url=>contextSource({selectionText:"ケア",pageUrl:url},null),webUrl);
  assert.equal(result.cau,sentence);assert.equal(result.capture,"pdf-auto");
  // Permission failure has useful feedback, no empty-context success and no new tab.
  await sw.evaluate(async({url,tab})=>{
    chrome.extension.isAllowedFileSchemeAccess=async()=>false;
    await handleContextSave({selectionText:"ケア",pageUrl:url},tab);
  },{url,tab});
  const failure=await sw.evaluate(async()=>(await chrome.storage.local.get("lastContextSave")).lastContextSave);
  assert.equal(failure.ok,false);assert.match(failure.message,/URL của tệp/);
  assert.equal((await read()).cauNghe.cau,sentence,"failed capture keeps earlier valid context");
  assert.equal((await sw.evaluate(()=>chrome.tabs.query({}))).length,count);
  const back=await ctx.newPage();await back.goto("chrome-extension://"+id+"/notebook.html");
  await back.waitForFunction(()=>typeof PdfSource!=="undefined"&&typeof openSource==="function");
  await page.close();
  const opened=ctx.waitForEvent("page");
  await back.evaluate(it=>openSource(it,false),it);
  const reopened=await opened;await reopened.waitForURL(url);
  assert.equal(reopened.url(),url,"after source tab is closed, restore saved page-2 URL, never context page 1");
  await reopened.close();await back.close();
  console.log("PDF automatic: live-tab and saved-page source navigation, native local PDF, same context-menu handler, first valid sentence, furigana/headword excluded, no new tab, actual study TTS, grammar/Gemini, SRS preserved, concurrent offscreen lifecycle, extensionless HTTP PDF and file permission failure OK");
}finally{if(server)await new Promise(resolve=>server.close(resolve));await ctx.close();rmSync(profile,{recursive:true,force:true});rmSync(docDir,{recursive:true,force:true});}
