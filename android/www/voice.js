/* Azure is optional. A failed provider must never interrupt a study card. */
(function(g){
"use strict";
let player=null,request=0,voices=[],preferences={},noticeAt=0;
const native=()=>g.Capacitor?.Plugins?.NeutronMedia,tts=()=>g.Capacitor?.Plugins?.TextToSpeech;
async function loadVoices(){
  try {voices=(await tts()?.getSupportedVoices())?.voices || [];}catch(_){voices=[];}
  return voices;
}
function choice(lang){
  const wanted=preferences[lang.slice(0,2)];
  const match=voices.findIndex(v=>(v.voiceURI || v.name)===wanted && v.lang?.startsWith(lang.slice(0,2)));
  if(match>=0)return match;
  const candidate=voices.map((v,i)=>({v,i})).filter(x=>x.v.lang?.startsWith(lang.slice(0,2)) && x.v.localService!==false)
    .sort((a,b)=>Number(/enhanced|premium|neural|natural/i.test(b.v.name))-Number(/enhanced|premium|neural|natural/i.test(a.v.name)));
  return candidate[0]?.i;
}
async function stop(){
  ++request;if(player){player.pause();player=null;}
  try{await tts()?.stop();}catch(_){}
  try{g.speechSynthesis?.cancel();}catch(_){}
}
async function speak(text,lang,rate,pitch){
  const token=++request;
  if(player){player.pause();player=null;}
  try{await tts()?.stop();}catch(_){}
  if(token!==request)return;
  let result;
  try {result=await native()?.azureSpeech({text,lang,rate});}catch(_){}
  if(token!==request)return;
  if(result?.available){
    try{player=new Audio(result.audio);await player.play();return;}
    catch(_){/* Device speech below. */}
  }
  if(result?.reason && Date.now()-noticeAt>60000){noticeAt=Date.now();g.dispatchEvent(new CustomEvent("neutron-voice-fallback",{detail:result.reason}));}
  if(!voices.length)await loadVoices();
  if(token!==request)return;
  if(!tts())throw new Error("TTS không khả dụng");
  const voice=choice(lang);
  await tts().speak({text,lang,rate,pitch:pitch??1,...(voice===undefined?{}:{voice})});
}
async function boot(){
  const $=id=>document.getElementById(id);
  preferences=JSON.parse((await g.Capacitor?.Plugins?.Preferences?.get({key:"neutronVoiceChoices"}))?.value || "{}");
  await loadVoices();
  for(const [id,lang] of [["voiceJa","ja"],["voiceEn","en"]]){
    const select=$(id);if(!select)continue;
    select.replaceChildren(new Option("Tự động · giọng trên máy",""));
    voices.filter(v=>v.lang?.startsWith(lang)).forEach(v=>select.add(new Option(v.name+(v.localService===false?" · cần mạng":""),v.voiceURI || v.name)));
    select.value=preferences[lang] || "";
    select.onchange=async()=>{preferences[lang]=select.value;await g.Capacitor?.Plugins?.Preferences?.set({key:"neutronVoiceChoices",value:JSON.stringify(preferences)});};
  }
  if($("voiceInstall"))$("voiceInstall").onclick=()=>tts()?.openInstall();
  for(const [id,lang,sample] of [["voiceTestJa","ja-JP","今日はいい天気ですね。一緒に日本語を勉強しましょう。"],["voiceTestEn","en-US","Let's learn something new together today."]])
    if($(id))$(id).onclick=()=>speak(sample,lang,1,1).catch(()=>{$("voiceStatus").textContent="Hãy cài giọng đọc cho ngôn ngữ này.";});
  if(!native())return;
  $("azureSettings").hidden=false;
  const state=await native().voiceSettings({});
  $("azureEnabled").checked=state.enabled;$("azureRegion").value=state.region;
  $("azureKey").placeholder=state.hasKey?"Đã lưu khóa · bỏ trống để giữ nguyên":"Khóa Azure Speech F0";
  $("azureSave").onclick=async()=>{
    try{
      await native().voiceSettings({save:true,enabled:$("azureEnabled").checked,region:$("azureRegion").value,key:$("azureKey").value});
      $("azureKey").value="";$("voiceStatus").textContent="Đã lưu. Azure lỗi hoặc hết lượt sẽ dùng TTS trên máy.";
    }catch(e){$("voiceStatus").textContent=e.message;}
  };
  $("azureRemove").onclick=async()=>{
    await native().voiceSettings({save:true,enabled:false,region:$("azureRegion").value,clearKey:true});
    $("azureEnabled").checked=false;$("azureKey").value="";$("azureKey").placeholder="Khóa Azure Speech F0";
    $("voiceStatus").textContent="Đã xóa khóa Azure.";
  };
}
g.NeutronVoice={speak,stop,choice,loadVoices};
if(g.NeutronReady)boot().catch(()=>{});else g.addEventListener("neutrondict-ready",()=>boot().catch(()=>{}),{once:true});
})(window);
