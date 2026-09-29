// Hidden PDF text extraction only. No viewer, form, upload, or document navigation.
let pdfjsPromise;
async function extract(url,word){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  let task;
  try{
    const response=await fetch(url,{credentials:"include",signal:controller.signal});
    if(!response.ok&&response.status!==0)throw Error("Không đọc được PDF (HTTP "+response.status+").");
    const type=response.headers.get("content-type")||"";
    if(/text\/html/i.test(type))return {ok:false,reason:"not-pdf"};
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(!new TextDecoder().decode(bytes.slice(0,1024)).includes("%PDF-"))return {ok:false,reason:"not-pdf"};
    let pdfjs;
    try{
      pdfjs=await (pdfjsPromise ||= import("./vendor/pdfjs/pdf.mjs"));
      pdfjs.GlobalWorkerOptions.workerSrc=chrome.runtime.getURL("vendor/pdfjs/pdf.worker.mjs");
    }catch(e){
      pdfjsPromise=null;
      return {ok:false,pdf:true,reason:"pdf-library",error:String(e.message||e)};
    }
    task=pdfjs.getDocument({data:bytes,isEvalSupported:false,
      cMapUrl:chrome.runtime.getURL("vendor/pdfjs/cmaps/"),cMapPacked:true,
      standardFontDataUrl:chrome.runtime.getURL("vendor/pdfjs/standard_fonts/"),
      wasmUrl:chrome.runtime.getURL("vendor/pdfjs/wasm/")});
    const pdf=await task.promise;let scanned=0;
    // User preference: use the first valid source sentence in document order.
    for(let page=1;page<=pdf.numPages;page++){
      const p=await pdf.getPage(page),text=await p.getTextContent();
      const candidates=PdfContext.candidates(PdfContext.paragraphs(text.items),word,page);
      scanned++;
      if(candidates.length)return {ok:true,pdf:true,...candidates[0],documentId:pdf.fingerprints[0],scanned};
      p.cleanup();
      if(controller.signal.aborted)throw Error("Quét PDF quá thời gian.");
    }
    return {ok:false,pdf:true,reason:"no-sentence"};
  }catch(e){return {ok:false,reason:"unreadable",error:String(e.message||e)};}
  finally{clearTimeout(timeout);if(task)await task.destroy().catch(()=>{});}
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(msg.target!=="pdf-offscreen"||msg.type!=="PDF_EXTRACT")return;
  if(sender.id!==chrome.runtime.id||! /^(https?:|file:|blob:)/i.test(msg.url||""))return;
  extract(msg.url,String(msg.word||"").trim()).then(respond,e=>respond({ok:false,reason:"unreadable",error:String(e)}));
  return true;
});
