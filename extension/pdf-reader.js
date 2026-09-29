const $=id=>document.getElementById(id);
let pdf=null,pageNo=1,source="",title="",generation=0,selection=null;
let loadingTask=null,renderTask=null,pdfjs=null,openRequest=0;
const params=new URLSearchParams(location.search);
$("url").value=/^https?:/.test(params.get("url")||"")?params.get("url"):"";
$("word").value=(params.get("word")||"").slice(0,80);
function status(message,error=false){$("status").textContent=message;$("status").dataset.error=String(error);}
function valid(){$("save").disabled=!pdf||!CauNghe.cauHopLe($("sentence").value,$("word").value);}
function clearSelection(){selection=null;$("sentence").value="";$("saved").textContent="";valid();}
async function library(){
  if(pdfjs)return pdfjs;
  try{pdfjs=await import("./vendor/pdfjs/pdf.mjs");}
  catch(_){throw Error("Thiếu bộ đọc PDF. Hãy cài gói extension từ GitHub Actions (xem PDF-NGU-CANH.md).");}
  pdfjs.GlobalWorkerOptions.workerSrc=chrome.runtime.getURL("vendor/pdfjs/pdf.worker.mjs");
  return pdfjs;
}
async function openDocument(data,url,name){
  const token=++generation;
  if(renderTask)renderTask.cancel();
  if(loadingTask)await loadingTask.destroy();
  pdf=null;clearSelection();$("text").replaceChildren();$("pageInfo").textContent="";
  $("prev").disabled=true;$("next").disabled=true;$("canvas").width=1;$("canvas").height=1;
  status("Đang đọc PDF…");
  try{
    const lib=await library();if(token!==generation)return;
    loadingTask=lib.getDocument({data,isEvalSupported:false,
      cMapUrl:chrome.runtime.getURL("vendor/pdfjs/cmaps/"),cMapPacked:true,
      standardFontDataUrl:chrome.runtime.getURL("vendor/pdfjs/standard_fonts/"),
      wasmUrl:chrome.runtime.getURL("vendor/pdfjs/wasm/")});
    const doc=await loadingTask.promise;
    if(token!==generation){await doc.destroy();return;}
    pdf=doc;source=url;title=name;pageNo=1;await showPage();
  }catch(e){if(token===generation)status("Không mở được PDF: "+e.message,true);}
}
async function showPage(){
  const token=++generation;if(renderTask)renderTask.cancel();
  clearSelection();$("text").replaceChildren();$("prev").disabled=true;$("next").disabled=true;
  status("Đang đọc trang "+pageNo+"…");
  try{
    const page=await pdf.getPage(pageNo),content=await page.getTextContent();
    if(token!==generation)return;
    const paragraphs=PdfContext.paragraphs(content.items);
    for(const text of paragraphs){const p=document.createElement("p");p.textContent=text;$("text").append(p);}
    const viewport=page.getViewport({scale:1.4}),canvas=$("canvas");
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    renderTask=page.render({canvasContext:canvas.getContext("2d"),viewport});await renderTask.promise;
    if(token!==generation)return;
    $("pageInfo").textContent=pageNo+" / "+pdf.numPages+" · "+title;
    $("prev").disabled=pageNo<=1;$("next").disabled=pageNo>=pdf.numPages;
    status(paragraphs.length?"Đã mở PDF. Bôi đen từ trong phần chữ để lấy đúng câu.":"PDF chưa có chữ đọc được. Bạn có thể gõ từ và câu từ trang gốc vào ô bên dưới.");valid();
  }catch(e){if(token===generation)status("Không đọc được trang: "+e.message,true);}
}
async function openUrl(requestPermission){
  const request=++openRequest;let u;
  try{u=new URL($("url").value.trim());if(!/^https?:$/.test(u.protocol))throw Error();}
  catch(_){status("Nhập link http/https tới PDF hoặc chọn tệp trên máy.",true);return;}
  try{
    const origin=u.origin+"/*";
    if(!(await chrome.permissions.contains({origins:[origin]}))){
      if(!requestPermission){status("Bấm Mở PDF để cho phép đọc tài liệu từ website này.");return;}
      if(!(await chrome.permissions.request({origins:[origin]}))){status("Chưa được phép đọc website. Bạn vẫn có thể chọn bản PDF đã tải về.",true);return;}
    }
    status("Đang tải PDF…");
    const response=await fetch(u.href,{credentials:"include"});
    if(!response.ok)throw Error("HTTP "+response.status);
    const data=new Uint8Array(await response.arrayBuffer());if(request!==openRequest)return;
    await openDocument(data,u.href,decodeURIComponent(u.pathname.split("/").pop()||"PDF"));
  }catch(e){if(request===openRequest)status("Không tải được PDF: "+e.message+". Bạn có thể chọn tệp đã tải về.",true);}
}
$("urlForm").addEventListener("submit",e=>{e.preventDefault();openUrl(true);});
$("file").addEventListener("change",async()=>{
  const request=++openRequest,f=$("file").files[0];if(!f)return;
  const original=params.get("url")||"";
  const url=/^file:/.test(original)?original:"file:///"+encodeURIComponent(f.name);
  const bytes=new Uint8Array(await f.arrayBuffer());if(request!==openRequest)return;
  await openDocument(bytes,url,f.name);
});
$("prev").addEventListener("click",()=>{if(pdf&&pageNo>1){pageNo--;showPage();}});
$("next").addEventListener("click",()=>{if(pdf&&pageNo<pdf.numPages){pageNo++;showPage();}});
function capture(){
  const sel=window.getSelection();if(!sel||!sel.rangeCount||sel.isCollapsed)return;
  const range=sel.getRangeAt(0),parent=range.startContainer.parentElement,p=parent&&parent.closest("#text p");
  if(!p||!p.contains(range.endContainer))return;
  const before=range.cloneRange();before.selectNodeContents(p);before.setEnd(range.startContainer,range.startOffset);
  const start=before.toString().length,end=start+range.toString().length;
  selection=PdfContext.around(p.textContent,start,end);
  $("word").value=range.toString().trim().slice(0,80);$("sentence").value=selection?selection.cau:"";
  $("saved").textContent="";
  $("hint").textContent=selection?"Kiểm tra câu với trang gốc rồi bấm lưu.":"Chưa lấy được câu trọn vẹn. Hãy điền câu từ trang gốc trước khi lưu.";valid();
}
document.addEventListener("selectionchange",capture);
$("word").addEventListener("input",()=>{selection=null;valid();});
$("sentence").addEventListener("input",()=>{selection=null;valid();});
function captureSource(){
  const word=$("word").value.trim(),cau=CauNghe.cauHopLe($("sentence").value,word);
  if(!pdf||!cau)return null;
  const src={url:source,title,page:pageNo,sel:word,cau,pdf:true,capture:"pdf-reader",documentId:pdf.fingerprints[0]};
  if(selection){src.start=selection.start;src.end=selection.end;}
  return src;
}
$("save").addEventListener("click",async()=>{
  const src=captureSource();if(!src)return;
  $("save").disabled=true;$("saved").textContent="Đang lưu từ và câu…";
  try{
    const result=await chrome.runtime.sendMessage({type:"PDF_SAVE",word:src.sel,src});
    if(!result||!result.ok)throw Error(result&&result.error||"Không nhận được xác nhận lưu");
    $("saved").textContent="Đã lưu từ và câu. Ngữ cảnh đã sẵn sàng cho Gemini, bài nghe và luyện ngữ pháp; bản dịch sẽ được bổ sung sau.";
  }catch(e){$("saved").textContent="Chưa lưu được: "+e.message;}finally{valid();}
});
chrome.runtime.onMessage.addListener((msg,_sender,respond)=>{if(msg.type==="PDF_CONTEXT")respond({src:captureSource()});});
if($("url").value)openUrl(false);
else if(params.get("url"))status("Chọn lại tệp PDF đang đọc, rồi bôi đen từ trong phần chữ để lấy đúng câu.");
