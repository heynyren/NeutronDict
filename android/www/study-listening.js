/* One listening request at a time. Native playback reuses DualSub's one player. */
(function(g){
"use strict";
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
  await cancel();
  const token=++generation;active=true;
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
    return tts(clip?"TTS · "+options.rate+"×":"TTS · chưa có mốc âm thanh gốc khớp toàn câu");
  status("YouTube gốc · "+options.rate+"× · đang mở đoạn câu…");
  let result;
  try{result=await native().playYouTubeSentence({...clip,rate:options.rate});}
  catch(_){result={status:"unavailable"};}
  if(!current())return {kind:"cancelled"};
  if(result?.status==="completed"){
    status("Đã nghe YouTube gốc · "+options.rate+"×");
    return {kind:"youtube"};
  }
  if(result?.status==="cancelled" || result?.status==="interrupted"){
    status("Đã dừng đoạn YouTube · bấm Nghe để phát lại");
    return {kind:"cancelled"};
  }
  return tts("Chưa phát được YouTube gốc · đang dùng TTS "+options.rate+"×");
}
g.StudyListening={play,cancel};
})(window);
