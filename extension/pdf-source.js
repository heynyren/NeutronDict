/* Native PDF source navigation. Context-page offsets are NOT selection offsets. */
(function(root){
  const base=u=>String(u||"").split("#")[0];
  function cleanOrigin(origin,url){
    if(!origin || base(origin.url)!==base(url))return null;
    const out={url:String(origin.url).slice(0,4000)};
    if(/^[a-f0-9-]{36}$/i.test(origin.token||""))out.token=origin.token;
    return out;
  }
  async function remember(src,tab){
    src.pdfOrigin={url:src.url};
    if(!tab || !Number.isInteger(tab.id))return;
    // IDs belong to this browser session, never resolve a synced/stale ID directly.
    try{
      const token=crypto.randomUUID();
      await chrome.storage.session.set({["pdf-source:"+token]:{
        tabId:tab.id,tabUrl:tab.url||src.url,documentUrl:src.url
      }});
      src.pdfOrigin.token=token;
    }catch(_){ /* Saving the word must still work if the session store is unavailable. */ }
  }
  /** Số trang trong mốc `#page=N` của một URL (0 nếu không có). */
  function hashPage(url){
    const h=String(url||"").split("#").slice(1).join("#");
    const m=/(?:^|&)page=(\d+)/i.exec(h);
    return m?Math.max(1,parseInt(m[1],10)):0;
  }
  /** URL của tài liệu nhưng nhảy tới trang `page`; giữ lại `zoom` nếu có. */
  function withPage(url,page){
    const h=String(url||"").split("#").slice(1).join("#");
    const z=/(?:^|&)(zoom=[^&]*)/i.exec(h);
    return base(url)+"#page="+page+(z?"&"+z[1]:"");
  }
  /** Trang đã lưu cho nguồn này: trang của câu trích thật sự (nếu có). */
  function savedPage(src){
    return Number.isInteger(src.page)&&src.page>0?src.page:0;
  }
  /*
   * Quay lại tab nguồn.
   *
   * Đo trên trình xem PDF thật của Chrome: cuộn KHÔNG đổi URL, và đổi mỗi cái
   * `#page=N` của một tab đang mở thì trình xem KHÔNG nhảy (URL đổi mà trang vẫn
   * đứng yên). Nên bản cũ — chỉ chuyển tab, không động gì — để người dùng rơi vào
   * ĐÚNG chỗ mình vừa cuộn tới sau đó, không phải chỗ đã bôi đen. Muốn về đúng
   * trang đã lưu thì phải đổi `#page=N` RỒI nạp lại tab (đã kiểm: cách này đáp
   * đúng trang). Cái giá: mất vị trí cuộn hiện tại của tab — nhưng người bấm
   * "Mở nguồn" chính là muốn rời nó để về chỗ đã lưu.
   */
  async function activate(src){
    const origin=cleanOrigin(src.pdfOrigin,src.url);
    if(!origin || !origin.token)return false;
    try{
      const key="pdf-source:"+origin.token;
      const saved=(await chrome.storage.session.get(key))[key];
      if(!saved || base(saved.documentUrl)!==base(src.url))return false;
      const tab=await chrome.tabs.get(saved.tabId);
      if(tab.discarded || base(tab.url)!==base(saved.tabUrl))return false;
      // CÙNG luật chọn trang với `reopenUrl`, để mở lại tab đã đóng và quay về tab
      // còn sống luôn đưa tới một chỗ.
      const page=hashPage(reopenUrl(src,""));
      const target=page?withPage(tab.url,page):"";
      await chrome.tabs.update(tab.id,target&&target!==tab.url?{active:true,url:target}:{active:true});
      if(tab.windowId!=null)await chrome.windows.update(tab.windowId,{focused:true}).catch(()=>{});
      if(page)await chrome.tabs.reload(tab.id).catch(()=>{});
      return true;
    }catch(_){return false;}
  }
  function reopenUrl(src,legacyUrl){
    const origin=cleanOrigin(src.pdfOrigin,src.url);
    const url=origin?origin.url:src.url;
    const hash=String(url||"").split("#").slice(1).join("#");
    const landmark=/(?:^|&)(?:page|nameddest|zoom|view|viewrect)=|:~:text=/i.test(hash);
    const page=savedPage(src);
    // Câu đã được TRÍCH TỪ chính trang này (capture "pdf-auto") thì trang ấy là mốc
    // đáng tin nhất. Mốc `#page=` trong URL chỉ là nơi tài liệu được mở ra lúc đầu,
    // có thể đã cũ sau khi cuộn — bản cũ để nó đè lên trang của câu.
    if(page&&src.capture==="pdf-auto")return withPage(url,page);
    // Mục không có câu trích: chỉ tin một mốc URL thật.
    if(landmark)return url;
    if(page)return withPage(url,page);
    return legacyUrl||url;
  }
  root.PdfSource={remember,activate,reopenUrl,cleanOrigin,hashPage,withPage};
})(typeof self!=="undefined"?self:globalThis);
