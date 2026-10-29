/* One offscreen document shared by PDF extraction and Japanese POS workers. */
let neutronOffscreenClosing=null, neutronOffscreenOpening=null, neutronOffscreenUsers=0;
let neutronOffscreenIdle=null, neutronPosWarmUntil=0;
function closeNeutronOffscreen(){
  return neutronOffscreenClosing ||= Promise.resolve().then(()=>{
    if(neutronOffscreenUsers===0)return chrome.offscreen.closeDocument().catch(()=>{});
  }).finally(()=>{neutronOffscreenClosing=null;});
}
async function runNeutronOffscreen(message, timeout=35000) {
  clearTimeout(neutronOffscreenIdle);
  neutronOffscreenUsers++;
  if(message.target==="pos-offscreen")neutronPosWarmUntil=Date.now()+60000;
  let timer;
  try {
    await neutronOffscreenClosing;
    if(!neutronOffscreenOpening) neutronOffscreenOpening=(async()=>{
      const url=chrome.runtime.getURL("pdf-offscreen.html");
      const contexts=await chrome.runtime.getContexts({contextTypes:["OFFSCREEN_DOCUMENT"],documentUrls:[url]});
      if(!contexts.length)await chrome.offscreen.createDocument({url:"pdf-offscreen.html",reasons:["WORKERS"],
        justification:"Read PDF context and analyze visible Japanese subtitle words locally."});
    })().finally(()=>{neutronOffscreenOpening=null;});
    await neutronOffscreenOpening;
    return await Promise.race([chrome.runtime.sendMessage(message), new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error("Background worker timed out")),timeout);
    })]);
  } finally {
    clearTimeout(timer);
    if(--neutronOffscreenUsers===0) {
      const warm=neutronPosWarmUntil-Date.now();
      if(warm>0)neutronOffscreenIdle=setTimeout(closeNeutronOffscreen,warm);
      else await closeNeutronOffscreen(); // PDF-only saves retain their immediate cleanup contract.
    }
  }
}
async function analyzeSubtitleRows(rows) {
  if(!Array.isArray(rows)||rows.length>8||rows.some(r=>typeof r?.text!=="string"||r.text.length>2000)||
    rows.reduce((n,r)=>n+r.text.length,0)>6000)throw Error("Invalid subtitle batch");
  return runNeutronOffscreen({target:"pos-offscreen",type:"POS_ANALYZE",rows});
}
