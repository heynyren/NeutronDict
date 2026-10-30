/* One listening request at a time. Native playback reuses DualSub's one player. */
(function(g){
"use strict";
const t=s=>g.T?g.T(s):s, t2=(s,v)=>g.T2?g.T2(s,v):s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??"");
let generation=0,active=false,stopping=Promise.resolve();
const native=()=>g.Capacitor?.Plugins?.NeutronMedia;
function cancel(){
  ++generation;
  if(!active)return stopping;
  active=false;
  const n=native();
  stopping=Promise.allSettled([
    Promise.resolve().then(()=>n?.cancelYouTubeSentence?.({})),
    Promise.resolve().then(()=>g.NeutronVoice?.stop?.())
  ]).then(()=>{});
  return stopping;
}
async function play(item,options){
  const pending=cancel(),token=generation;
  await pending;
  if(token!==generation)return {kind:"cancelled"};
  active=true;
  const current=()=>token===generation;
  const status=text=>{if(current())options.status?.(text);};
  const tts=async message=>{
    if(!current())return {kind:"cancelled"};
    status(message || "TTS · "+options.rate+"×");
    await options.tts();
    return {kind:current()?"tts":"cancelled"};
  };
  let clip=g.NeutronMediaImport?.sentenceYouTube(item);
  if(!clip && options.cache){
    let cache;
    try{cache=await options.cache();}catch(_){}
    if(!current())return {kind:"cancelled"};
    clip=g.NeutronMediaImport?.sentenceYouTube(item,cache);
  }
  if(!clip || !native()?.playYouTubeSentence)
    return tts(clip?"TTS · "+options.rate+"×":t("TTS · chưa có mốc âm thanh gốc khớp toàn câu"));
  status(t2("YouTube gốc · {rate}× · đang mở đoạn câu…",{rate:options.rate}));
  let result;
  const began=g.performance?.now() ?? Date.now();
  try{result=await native().playYouTubeSentence({...clip,rate:options.rate});}
  catch(_){result={status:"unavailable"};}
  finally{if(current())options.excludeWait?.(Math.max(0,(g.performance?.now() ?? Date.now())-began));}
  if(!current())return {kind:"cancelled"};
  if(result?.status==="completed"){
    status(t2("Đã nghe YouTube gốc · {rate}×",{rate:options.rate}));
    return {kind:"youtube"};
  }
  if(result?.status==="cancelled" || result?.status==="interrupted"){
    status(t("Đã dừng đoạn YouTube · bấm Nghe để phát lại"));
    return {kind:"cancelled"};
  }
  return tts(result?.reason==="setup"
    ? t("TTS · mở YouTube một lần để hoàn tất thiết lập nghe giọng gốc")
    : t2("Chưa phát được YouTube gốc · đang dùng TTS {rate}×",{rate:options.rate}));
}
g.StudyListening={play,cancel};
})(window);
