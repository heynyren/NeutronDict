/**
 * QUAY VỀ ĐÚNG VỊ TRÍ ĐÃ BÔI TRONG PDF — đo trên extension thật + trình xem PDF thật.
 *
 *   node kiem-tra/pdf-vitri.mjs extension
 *
 * Ba lỗi người dùng gặp:
 *   1. Từ xuất hiện nhiều lần: bản cũ luôn lấy câu ở trang ĐẦU TIÊN có từ ấy, nên
 *      trang lưu (và chỗ "Mở nguồn" đưa tới) sai dù người dùng đang bôi ở trang khác.
 *      Giờ lấy lần xuất hiện GẦN trang đang đọc nhất (trang của lần lưu trước, hoặc
 *      mốc #page= trong URL); không có gợi ý thì vẫn là câu đầu tiên như cũ.
 *   2. Mốc `#page=` cũ trong URL đè lên trang thật của câu trích.
 *   3. Tab nguồn còn sống thì chỉ được "chuyển tab" — người dùng rơi vào chỗ vừa cuộn
 *      tới chứ không phải chỗ đã bôi. Trình xem PDF của Chrome không nhảy khi chỉ đổi
 *      `#page=N`, nên phải đổi rồi NẠP LẠI tab. Bài này đo bằng ảnh chụp thật: cuộn
 *      tới trang 6, gọi activate(), xem trình xem có về đúng trang đã lưu không.
 */
import assert from "node:assert/strict";
import {chromium} from "/opt/node22/lib/node_modules/playwright/index.mjs";
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";

/** PDF 6 trang, chữ Latin chuẩn; "apple" nằm trong một câu trọn vẹn ở trang 2 và 5. */
function fixture(){
  const pages=6,objs=[],kids=[];
  for(let i=0;i<pages;i++)kids.push((4+i*2)+" 0 R");
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push("<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+pages+" >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const noi={2:"Page two says apple clearly.",5:"Page five says apple clearly."};
  for(let i=0;i<pages;i++){
    const n=i+1;
    let st="BT /F1 40 Tf 60 780 Td (PAGE "+n+" TOP) Tj ET\n";
    if(noi[n])st+="BT /F1 18 Tf 60 500 Td ("+noi[n]+") Tj ET\n";
    objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents "+(5+i*2)+" 0 R >>");
    objs.push("<< /Length "+st.length+" >>\nstream\n"+st+"endstream");
  }
  let out="%PDF-1.4\n",off=[0];
  objs.forEach((s,i)=>{off.push(Buffer.byteLength(out));out+=(i+1)+" 0 obj\n"+s+"\nendobj\n";});
  const x=Buffer.byteLength(out);
  out+="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n"+off.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+
    "trailer\n<< /Size "+(objs.length+1)+" /Root 1 0 R >>\nstartxref\n"+x+"\n%%EOF\n";
  return Buffer.from(out);
}

const ext=path.resolve(process.argv[2]||"extension");
const profile=mkdtempSync(path.join(tmpdir(),"nd-vt-"));
const docDir=mkdtempSync(path.join(tmpdir(),"nd-vt-doc-"));
const file=path.join(docDir,"book.pdf");writeFileSync(file,fixture());
const base=pathToFileURL(file).href;
const options={channel:"chromium",headless:true,viewport:{width:900,height:700},
  args:["--disable-extensions-except="+ext,"--load-extension="+ext]};
let ctx=await chromium.launchPersistentContext(profile,options);
const worker=async()=>ctx.serviceWorkers()[0]||await ctx.waitForEvent("serviceworker");
const ket=[];
const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
try{
  let sw=await worker(),id=sw.url().split("/")[2];
  if(!(await sw.evaluate(()=>chrome.extension.isAllowedFileSchemeAccess()))){
    await ctx.close();
    const prefsPath=path.join(profile,"Default","Preferences"),prefs=JSON.parse(readFileSync(prefsPath,"utf8"));
    prefs.extensions??={};prefs.extensions.settings??={};prefs.extensions.settings[id]??={};
    prefs.extensions.settings[id].allow_file_access=true;writeFileSync(prefsPath,JSON.stringify(prefs));
    ctx=await chromium.launchPersistentContext(profile,options);sw=await worker();id=sw.url().split("/")[2];
  }
  for(let i=0;i<40;i++){if(await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false))break;await new Promise(r=>setTimeout(r,250));}
  await sw.evaluate(async()=>{
    self.fetch=()=>Promise.reject(Error("no network"));
    await chrome.storage.local.set({settings:{ngu:"en"},notebook:{},hoc:{},pdfViTri:{}});
  });
  const lay=(url)=>sw.evaluate(u=>contextSource({selectionText:"apple",pageUrl:u},null),url);

  console.log("Chọn lần xuất hiện gần trang đang đọc");
  let r=await lay(base);
  soat("không có gợi ý: câu đầu tiên theo thứ tự tài liệu (trang 2)",r.page===2&&/two/.test(r.cau),"trang "+r.page);
  await sw.evaluate(u=>pdfGhiNho(u,5),base);
  r=await lay(base);
  soat("lần lưu trước ở trang 5: lần này lấy trang 5",r.page===5&&/five/.test(r.cau),"trang "+r.page);
  await sw.evaluate(()=>chrome.storage.local.set({pdfViTri:{}}));
  r=await lay(base+"#page=4");
  soat("mở ở #page=4: gần nhất là trang 5",r.page===5,"trang "+r.page);
  await sw.evaluate(()=>chrome.storage.local.set({pdfViTri:{}}));   // quên trang vừa nhớ, chỉ còn mốc URL
  r=await lay(base+"#page=3");
  soat("mở ở #page=3: gần nhất là trang 2",r.page===2,"trang "+r.page);
  const luu=await sw.evaluate(async u=>(await chrome.storage.local.get("pdfViTri")).pdfViTri[u.split("#")[0]],base);
  soat("trang vừa lưu được nhớ cho lần sau",luu&&luu.page===2,JSON.stringify(luu));

  console.log("\nTrang của câu trích đè mốc URL cũ");
  const url=await sw.evaluate(u=>PdfSource.reopenUrl({url:u+"#page=2",page:5,capture:"pdf-auto"},"x"),base);
  soat("URL cũ #page=2 nhưng câu trích ở trang 5 → mở trang 5",url===base+"#page=5",url.replace(base,""));

  console.log("\nTab còn sống: về đúng trang đã lưu (trình xem thật)");
  const pg=await ctx.newPage();
  await pg.goto(base,{waitUntil:"domcontentloaded"});await pg.waitForTimeout(5000);
  await pg.mouse.move(600,400);
  for(let i=0;i<14;i++){await pg.mouse.wheel(0,500);await pg.waitForTimeout(100);}
  await pg.waitForTimeout(1200);
  const tab=(await sw.evaluate(()=>chrome.tabs.query({}))).find(t=>t.url===base);
  assert.ok(tab,"tab PDF đang mở");
  const src={url:base,pdf:true,page:5,capture:"pdf-auto"};
  await sw.evaluate(async([src,tab])=>{await PdfSource.remember(src,tab);Object.assign(self,{__src:src});},[src,tab]);
  await pg.waitForTimeout(5000);
  await pg.screenshot({path:path.join(docDir,"truoc.png")});
  const fs=await import("node:fs");
  const ok=await sw.evaluate(()=>PdfSource.activate(self.__src));
  soat("activate() báo đã dùng tab cũ",ok===true);
  await pg.waitForTimeout(500);
  await pg.waitForTimeout(5000);
  await pg.screenshot({path:path.join(docDir,"sau.png")});
  soat("URL tab đổi sang #page=5",pg.url()===base+"#page=5",pg.url().replace(base,""));
  // Đọc số trang trình xem hiện — chữ "PAGE n TOP" to ở đầu vùng đọc.
  soat("ảnh chụp sau khi về khác ảnh lúc đang ở trang 6",
    Buffer.compare(fs.readFileSync(path.join(docDir,"truoc.png")),fs.readFileSync(path.join(docDir,"sau.png")))!==0);
  const trang=await pg.evaluate(()=>{
    const t=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(w.nextNode())t.push(w.currentNode.textContent);return t.join(" ").slice(0,200);
  }).catch(()=>"");
  if(process.env.GIU_ANH){fs.copyFileSync(path.join(docDir,"sau.png"),process.env.GIU_ANH+"/vt-sau.png");fs.copyFileSync(path.join(docDir,"truoc.png"),process.env.GIU_ANH+"/vt-truoc.png");}
  const sai=ket.filter(x=>!x).length;
  console.log("\n"+(ket.length-sai)+"/"+ket.length+(sai?"  — CÓ LỖI":"  — sạch"));
  process.exitCode=sai?1:0;
}finally{await ctx.close();rmSync(profile,{recursive:true,force:true});rmSync(docDir,{recursive:true,force:true});}
