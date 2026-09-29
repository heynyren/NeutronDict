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
  async function activate(src){
    const origin=cleanOrigin(src.pdfOrigin,src.url);
    if(!origin || !origin.token)return false;
    try{
      const key="pdf-source:"+origin.token;
      const saved=(await chrome.storage.session.get(key))[key];
      if(!saved || base(saved.documentUrl)!==base(src.url))return false;
      const tab=await chrome.tabs.get(saved.tabId);
      if(tab.discarded || base(tab.url)!==base(saved.tabUrl))return false;
      // Do not set URL: navigation would reset the PDF's current viewport/selection.
      await chrome.tabs.update(tab.id,{active:true});
      if(tab.windowId!=null)await chrome.windows.update(tab.windowId,{focused:true}).catch(()=>{});
      return true;
    }catch(_){return false;}
  }
  function reopenUrl(src,legacyUrl){
    const origin=cleanOrigin(src.pdfOrigin,src.url);
    const url=origin?origin.url:src.url;
    // Preserve only a real URL landmark. It may predate later scrolling in Chrome.
    const hash=String(url||"").split("#").slice(1).join("#");
    if(/(?:^|&)(?:page|nameddest|zoom|view|viewrect)=|:~:text=/i.test(hash))return url;
    // An extracted context page is a fallback, not a claim about the original highlight.
    if(Number.isInteger(src.page)&&src.page>0)return base(url)+"#page="+src.page;
    return legacyUrl||url;
  }
  root.PdfSource={remember,activate,reopenUrl,cleanOrigin};
})(typeof self!=="undefined"?self:globalThis);
