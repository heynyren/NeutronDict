/* Service-worker side of automatic PDF context extraction. */
let pdfContextQueue=Promise.resolve();
/*
 * Gợi ý "người dùng đang đọc tới trang nào" cho một tài liệu.
 *
 * Từ xuất hiện nhiều lần thì "câu hợp lệ đầu tiên theo thứ tự trang" thường KHÔNG
 * phải câu người dùng vừa bôi đen — và trang trả về, rồi cả chỗ "Mở nguồn" sau này,
 * đều sai theo. Trình xem PDF của Chrome không cho extension biết trang đang xem
 * (cuộn không đổi URL, và nội dung trình xem là của Chrome), nên dùng hai dấu vết
 * mình có: trang của lần lưu GẦN NHẤT từ cùng tài liệu (người ta đọc tuần tự, nên
 * từ kế tiếp thường ở gần), và mốc `#page=` trong URL lúc mở. 0 = không có gợi ý.
 */
const PDF_VI_TRI_TTL=6*3600*1000, PDF_VI_TRI_MAX=40;
const pdfBase=u=>String(u||"").split("#")[0];
async function pdfGoiY(url){
  try{
    const {pdfViTri}=await chrome.storage.local.get("pdfViTri");
    const e=(pdfViTri||{})[pdfBase(url)];
    if(e&&Date.now()-e.ts<PDF_VI_TRI_TTL&&e.page>0)return e.page;
  }catch(_){}
  return self.PdfSource?self.PdfSource.hashPage(url):0;
}
async function pdfGhiNho(url,page){
  if(!(page>0))return;
  try{
    const {pdfViTri}=await chrome.storage.local.get("pdfViTri");
    const m=Object.assign({},pdfViTri||{});
    m[pdfBase(url)]={page,ts:Date.now()};
    const ks=Object.keys(m);
    if(ks.length>PDF_VI_TRI_MAX){ks.sort((a,b)=>m[a].ts-m[b].ts);for(let i=0;i<ks.length-PDF_VI_TRI_MAX;i++)delete m[ks[i]];}
    await chrome.storage.local.set({pdfViTri:m});
  }catch(_){}
}
function extractPdfContext(url,word,hint){
  const task=pdfContextQueue.then(async()=>{
    if(/^file:/i.test(url)&&!(await chrome.extension.isAllowedFileSchemeAccess()))
      return {ok:false,pdf:true,reason:"file-access"};
    const offscreenUrl=chrome.runtime.getURL("pdf-offscreen.html");
    try{
      const contexts=await chrome.runtime.getContexts({contextTypes:["OFFSCREEN_DOCUMENT"],documentUrls:[offscreenUrl]});
      if(!contexts.length)await chrome.offscreen.createDocument({
        url:"pdf-offscreen.html",reasons:["WORKERS"],justification:"Read the PDF text around the word saved from the context menu."
      });
      return await chrome.runtime.sendMessage({target:"pdf-offscreen",type:"PDF_EXTRACT",url,word,hint:hint>0?hint:0});
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
  if(reason==="pdf-library")return "Đã lưu từ, chưa đọc được câu: bộ đọc PDF của extension bị thiếu hoặc hỏng. Hãy cập nhật đầy đủ thư mục extension rồi bấm Tải lại.";
  if(reason==="no-sentence")return "Đã lưu từ, chưa tìm được câu chứa từ trong lớp chữ của PDF.";
  return "Đã lưu từ, chưa đọc được ngữ cảnh từ nguồn này.";
}
async function reportContextSave(src){
  const message=pdfCaptureMessage(src);
  await chrome.storage.local.set({lastContextSave:{message,ok:!!src.cau,ts:Date.now()}});
  await chrome.action.setTitle({title:message});
  flashBadge(src.cau?"✓句":"?",src.cau?"#1a9d5a":"#b7791f");
}
