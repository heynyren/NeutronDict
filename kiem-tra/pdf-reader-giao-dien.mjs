import assert from "node:assert/strict";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Real two-page PDF with Japanese text, ruby, and a separate Vietnamese line.
const sentence="クリームを塗って肌のケアをする。";
const second="毎日ケアをしています。";
const hex=s=>[...s].map(c=>c.charCodeAt(0).toString(16).padStart(4,"0")).join("");
function fixture(){
  const translation="Bôi kem để chăm sóc da.";
  const chars=[...new Set(sentence+second+translation+"ぬ")];
  const cmap="/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Unicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n"+
    chars.length+" beginbfchar\n"+chars.map(c=>"<"+hex(c)+"> <"+hex(c)+">").join("\n")+
    "\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
  const line=(text,x,y,size=16)=>"BT /F1 "+size+" Tf 1 0 0 1 "+x+" "+y+" Tm <"+hex(text)+"> Tj ET\n";
  const stream=line("クリームを",40,760)+line("塗って肌の",120,760)+line("ケアをする。",200,760)+
    line("ぬ",120,773,7)+line(translation,40,715,12)+line(second,40,675);
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
const profile=mkdtempSync(path.join(tmpdir(),"nd-pdf-"));
const ctx=await chromium.launchPersistentContext(profile,{channel:"chromium",headless:true,
  args:["--disable-extensions-except="+ext,"--load-extension="+ext]});
try{
  const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker");
  const id=sw.url().split("/")[2];
  await sw.evaluate(async()=>{
    self.fetch=()=>Promise.reject(Error("Test: translation/network unavailable"));
    await chrome.storage.local.set({settings:{ngu:"ja"},notebook:{},hoc:{}});
  });
  const page=await ctx.newPage();
  await page.goto("chrome-extension://"+id+"/pdf-reader.html");
  await page.locator("#file").setInputFiles({name:"lesson.pdf",mimeType:"application/pdf",buffer:fixture()});
  await page.waitForFunction(()=>document.getElementById("pageInfo").textContent.includes("1 / 2"),{},{timeout:30000});
  assert.equal(await page.locator("#text p").first().textContent(),sentence);
  assert.ok(!(await page.locator("#text p").first().textContent()).includes("ぬ"));
  assert.ok(await page.locator("#canvas").evaluate(c=>c.width>500));
  const choose=async(text)=>{
    await page.evaluate(text=>{
      const p=[...document.querySelectorAll("#text p")].find(p=>p.textContent===text);
      if(!p)throw Error("Missing PDF paragraph: "+text);
      const i=p.textContent.indexOf("ケア"),r=document.createRange();
      r.setStart(p.firstChild,i);r.setEnd(p.firstChild,i+2);
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);
    },text);
    await page.waitForFunction(text=>document.getElementById("sentence").value===text,text);
  };
  const save=async()=>{
    await page.locator("#save").click();
    await page.waitForFunction(()=>document.getElementById("saved").textContent.startsWith("Đã lưu từ và câu."));
  };
  await choose(sentence);await save();
  const read=()=>sw.evaluate(async()=>(await chrome.storage.local.get("notebook")).notebook["javi:ケア"]);
  let it=await read();
  assert.equal(it.src.cau,sentence);assert.equal(it.cauNghe.cau,sentence);
  assert.equal(it.src.page,1);assert.ok(it.src.documentId);
  assert.equal(it.cauNghe.dich,"","network error must not lose source");
  await page.addScriptTag({url:"chrome-extension://"+id+"/hoi-gemini.js"});
  await page.addScriptTag({url:"chrome-extension://"+id+"/ngu-phap.js"});
  const checks=await page.evaluate(it=>({gemini:HoiGemini.loiHoi(it,{}),grammar:NguPhap.layCau(it)}),it);
  assert.ok(checks.gemini.includes(sentence));assert.ok(!checks.gemini.includes("CHƯA lưu được"));
  assert.equal(checks.grammar,sentence);
  assert.ok(await sw.evaluate(it=>Srs.duongCo(it).includes("nghe"),it));
  await sw.evaluate(async()=>{
    await vaSau(async()=>{
      const nb=(await chrome.storage.local.get("notebook")).notebook,it=nb["javi:ケア"];
      it.duong={nhin:{ngay:30,lv:4,due:123456,ts:999},nghe:{ngay:7,lv:2,due:222,ts:999}};
      it.lichRieng={nhin:{dongBang:true,ts:1000}};it.dongBang=1;it.mangTat=1;
      it.means=["nghĩa tự sửa"];it.mEdit=1;it.note="ghi chú";it.cauNghe.dich="bản dịch đã sửa";
      await chrome.storage.local.set({notebook:nb});
    });
  });
  const previous=await read();await save();it=await read();
  assert.deepEqual(it.duong,previous.duong);assert.deepEqual(it.lichRieng,previous.lichRieng);
  assert.equal(it.note,"ghi chú");assert.equal(it.cauNghe.dich,"bản dịch đã sửa");assert.equal(it.mangTat,1);
  assert.deepEqual(it.means,["nghĩa tự sửa"]);
  // Repeated word: select the second occurrence, not the first match in a PDF.
  await choose(second);await save();it=await read();
  assert.equal(it.src.cau,second);assert.equal(it.cauNghe.cau,second);
  assert.deepEqual(it.duong,previous.duong);assert.equal(it.cauNghe.dich,"");
  // Translator returning the source must not throw or erase the sentence.
  await sw.evaluate(async()=>{
    dichChuoi=async text=>text;await dichCauNghe("javi:ケア");
  });
  assert.equal((await read()).cauNghe.cau,second);
  // Late translation cannot overwrite a new context or concurrent learning update.
  await sw.evaluate(()=>{
    dichChuoi=()=>new Promise(resolve=>{self.releaseTranslation=resolve;});
    self.pendingTranslation=dichCauNghe("javi:ケア");
  });
  await sw.evaluate(async(sentence)=>{
    while(!self.releaseTranslation)await new Promise(r=>setTimeout(r,10));
    await vaSau(async()=>{
      const nb=(await chrome.storage.local.get("notebook")).notebook,it=nb["javi:ケア"];
      it.src.cau=sentence;it.cauNghe={cau:sentence,dich:"",ts:it.cauNghe.ts+1};
      it.duong.nhin.ngay=60;
      await chrome.storage.local.set({notebook:nb});
    });
    self.releaseTranslation("Dịch của câu cũ");await self.pendingTranslation;
  },sentence);
  it=await read();assert.equal(it.cauNghe.cau,sentence);assert.equal(it.cauNghe.dich,"");
  assert.equal(it.duong.nhin.ngay,60);
  // A later ordinary save without context must preserve the existing sentence.
  await sw.evaluate(async()=>{
    dichChuoi=async()=>"";docKana=async()=>null;
    await saveWord({word:"ケア",means:["nghĩa mới"]},"javi");
  });
  it=await read();assert.equal(it.cauNghe.cau,sentence);assert.equal(it.src.cau,sentence);
  assert.equal(it.duong.nhin.ngay,60);assert.equal(it.mangTat,1);
  await page.locator("#next").click();
  await page.waitForFunction(()=>document.getElementById("pageInfo").textContent.includes("2 / 2"));
  assert.equal(await page.locator("#sentence").inputValue(),"");
  assert.equal(await page.locator("#save").isDisabled(),true);
  console.log("PDF reader: real PDF, ruby, capture, Gemini/listening/grammar, repeated word, offline save, SRS/manual data, stale translation and navigation OK");
}finally{await ctx.close();rmSync(profile,{recursive:true,force:true});}
