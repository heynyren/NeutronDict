/* Service-worker side of automatic PDF context extraction. */
let pdfContextQueue=Promise.resolve();
function extractPdfContext(url,word){
  const task=pdfContextQueue.then(async()=>{
    if(/^file:/i.test(url)&&!(await chrome.extension.isAllowedFileSchemeAccess()))
      return {ok:false,pdf:true,reason:"file-access"};
    const offscreenUrl=chrome.runtime.getURL("pdf-offscreen.html");
    try{
      const contexts=await chrome.runtime.getContexts({contextTypes:["OFFSCREEN_DOCUMENT"],documentUrls:[offscreenUrl]});
      if(!contexts.length)await chrome.offscreen.createDocument({
        url:"pdf-offscreen.html",reasons:["WORKERS"],justification:"Read the PDF text around the word saved from the context menu."
      });
      return await chrome.runtime.sendMessage({target:"pdf-offscreen",type:"PDF_EXTRACT",url,word});
    }catch(e){return {ok:false,reason:"unreadable",error:String(e.message||e)};}
    finally{
      // Serialized requests own this document; closing cannot interrupt another save.
      await chrome.offscreen.closeDocument().catch(()=>{});
    }
  });
  pdfContextQueue=task.catch(()=>{});return task;
}
function pdfCaptureMessage(src){
  if(src.cau)return "Đã lưu từ và câu ngữ cảnh cho Gemini, bài nghe và luyện ngữ pháp.";
  const reason=src.contextStatus;
  if(reason==="file-access")return "Đã lưu từ, chưa đọc được câu: cần bật Cho phép truy cập URL của tệp cho NeutronDict trong chrome://extensions.";
  if(reason==="no-sentence")return "Đã lưu từ, chưa tìm được câu chứa từ trong lớp chữ của PDF.";
  return "Đã lưu từ, chưa đọc được ngữ cảnh từ nguồn này.";
}
async function reportContextSave(src){
  const message=pdfCaptureMessage(src);
  await chrome.storage.local.set({lastContextSave:{message,ok:!!src.cau,ts:Date.now()}});
  await chrome.action.setTitle({title:message});
  flashBadge(src.cau?"✓句":"?",src.cau?"#1a9d5a":"#b7791f");
}
