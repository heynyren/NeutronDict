/* One DOM snapshot, taken before lookup/focus changes. capture is self-contained for executeScript. */
(function(root){
  function capture(expected){
    const cached=self.__ND_contextMenuSource;
    if(expected && cached && Date.now()-cached.ts<30000 && cached.src.sel===expected)
      return Object.assign({},cached.src);
    if(document.contentType==="application/pdf")return {pdf:true};
    const selection=window.getSelection();
    if(!selection||!selection.rangeCount||selection.isCollapsed)return null;
    const range=selection.getRangeAt(0);
    let node=range.commonAncestorContainer;
    if(node.nodeType!==1)node=node.parentElement;
    if(!node||node.closest("input,textarea,[contenteditable=true]"))return null;
    const caption=node.closest(".ytp-caption-window-container,.caption-window,ytd-transcript-segment-renderer");
    const block=caption || node.closest("p,li,td,th,blockquote,h1,h2,h3,h4,h5,h6,figcaption,article,section,main,div")||document.body;
    const clean=r=>{
      const fragment=r.cloneContents();
      fragment.querySelectorAll("rt,rp,script,style,noscript,[hidden],[aria-hidden=true],mjx-assistive-mml,.MathJax_Preview").forEach(n=>n.remove());
      const read=n=>{
        if(n.nodeType===3)return n.nodeValue.replace(/[\t\r\n ]+/g," ");
        if(n.nodeName==="BR")return "\n";
        const text=Array.from(n.childNodes).map(read).join("");
        return /^(P|DIV|LI|TR|BLOCKQUOTE|H[1-6])$/.test(n.nodeName)?"\n"+text+"\n":text;
      };
      return read(fragment);
    };
    const before=range.cloneRange();before.selectNodeContents(block);before.setEnd(range.startContainer,range.startOffset);
    const after=range.cloneRange();after.selectNodeContents(block);after.setStart(range.endContainer,range.endOffset);
    const prefix=clean(before),suffix=clean(after),sel=clean(range).trim();
    if(!sel)return null;
    const limit=8000;
    const out={url:location.href,title:(document.title||"").slice(0,200),sel,
      prefix:prefix.slice(-limit),suffix:suffix.slice(0,limit),
      contextStart:prefix.length<=limit,contextEnd:suffix.length<=limit,capture:"web-dom"};
    if(caption && /(^|\.)youtube\.com$/i.test(location.hostname)){
      const v=new URL(location.href).searchParams.get("v"),video=document.querySelector("video");
      // Transcript row timestamps differ from the current playback position.
      if(v && video && !caption.matches("ytd-transcript-segment-renderer")){
        out.yt={v,t:Math.max(0,Math.floor(video.currentTime||0))};
        out.capture="youtube-caption";
      }
    }
    return out;
  }
  root.WebContext={capture};
  if(typeof document!=="undefined" && /^https?:|^file:/i.test(location.protocol)){
    chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
      if(msg.type!=="CAPTURE_WEB_CONTEXT")return;
      try{respond(capture(msg.word));}catch(_){respond(null);}
    });
  }
})(typeof self!=="undefined"?self:globalThis);
