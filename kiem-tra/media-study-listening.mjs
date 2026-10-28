import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
function environment(native) {
  const g={URL,console,Promise,Date};g.window=g;
  g.Capacitor={Plugins:{NeutronMedia:native}};
  vm.createContext(g);
  for(const p of ["media-import","study-listening"])
    vm.runInContext(fs.readFileSync("android/www/"+p+".js","utf8"),g);
  return g;
}
const id="dQw4w9WgXcQ",sentence="クリームを塗って肌のケアをする。";
const item={word:"ケア",cauNghe:{cau:sentence},duong:{nghe:{lv:3}},
  src:{url:"https://www.youtube.com/watch?v="+id,cau:sentence,
    yt:{v:id,t:96,dur:1,sentence:{text:sentence,t:94.125,end:99.875}}}};
const plain=o=>JSON.parse(JSON.stringify(o));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setTimeout(r,0));
let requests=[],stops=0,spoken=0,statuses=[];
const native={playYouTubeSentence:async o=>{requests.push(o);return {status:"completed"};},
  cancelYouTubeSentence:async()=>{stops++;}};
const g=environment(native),source=g.NeutronMediaImport.sentenceYouTube;
assert.deepEqual(plain(source(item)),{videoId:id,url:"https://m.youtube.com/watch?v="+id+"&t=94",start:94.125,end:99.875});
const snapshot=JSON.stringify(item);
const options={rate:1.4,tts:async()=>{spoken++;},status:s=>statuses.push(s)};
assert.equal((await g.StudyListening.play(item,options)).kind,"youtube");
assert.equal(requests[0].rate,1.4);
assert.equal(requests[0].start,94.125);
assert.equal(requests[0].end,99.875);
assert.equal(spoken,0);
assert.equal(JSON.stringify(item),snapshot,"playing never edits SRS or source");

// Native Android imports predating sentence metadata retain precise whole-sentence bounds.
const old=plain(item);delete old.src.yt.sentence;old.src.media="youtube";old.src.yt.t=94.125;old.src.yt.dur=5.75;
assert.equal(source(old).end,99.875);
// A legacy desktop fragment is not silently presented as a whole sentence.
const desktop=plain(item);delete desktop.src.yt.sentence;
assert.equal(source(desktop),null);
assert.equal(source(desktop,{[id+"|ja"]:{cau:[{s:sentence,t:94.125,tEnd:99.875}]}}).start,94.125);
const changed=plain(item);changed.cauNghe={cau:"肌のケアは大切です。",sua:1};
assert.equal(source(changed),null);
const invalid=plain(item);invalid.src.yt.sentence.end=1000;
assert.equal(source(invalid),null);
const translated=g.NeutronMediaImport.normalize({videoId:id,word:"care",language:"en",translated:true,
  translatedSentence:"Take care of your skin.",sentence,startMs:94000,endMs:99000});
assert.equal(source({src:translated.src,cauNghe:{cau:translated.src.cau}}),null);
const imported=g.NeutronMediaImport.normalize({videoId:id,word:"ケア",language:"ja",sentence,startMs:94125,endMs:99875});
assert.equal(source({src:imported.src,cauNghe:{cau:sentence}}).end,99.875);
const withMatchingOtherSource=plain(changed);withMatchingOtherSource.mediaSources=[{
  cau:changed.cauNghe.cau,yt:{v:id,sentence:{text:changed.cauNghe.cau,t:5,end:9}}}];
assert.equal(source(withMatchingOtherSource).start,5);

native.playYouTubeSentence=async()=>({status:"unavailable"});
assert.equal((await g.StudyListening.play(item,options)).kind,"tts");assert.equal(spoken,1);
await g.StudyListening.play(desktop,options);assert.equal(spoken,2);
native.playYouTubeSentence=async()=>{throw Error("offline");};
await g.StudyListening.play(item,options);assert.equal(spoken,3);
for(const reason of ["cancelled","interrupted"]){
 native.playYouTubeSentence=async()=>({status:reason});
 assert.equal((await g.StudyListening.play(item,options)).kind,"cancelled");
 assert.equal(spoken,3,"Back/Home does not start TTS");
}
const late=deferred();native.playYouTubeSentence=()=>late.promise;
const pending=g.StudyListening.play(item,options);await tick();
await g.StudyListening.cancel();
late.resolve({status:"unavailable"});
assert.equal((await pending).kind,"cancelled");assert.equal(spoken,3,"late failure cannot read an old card");
assert.ok(stops>0);
const a=deferred();let calls=0;
native.playYouTubeSentence=()=>++calls===1?a.promise:Promise.resolve({status:"completed"});
const first=g.StudyListening.play(item,options);await tick();
assert.equal((await g.StudyListening.play(item,options)).kind,"youtube");
a.resolve({status:"unavailable"});
assert.equal((await first).kind,"cancelled");assert.equal(spoken,3);
console.log("Original YouTube sentence bounds, exact source matching, fallback and cancellation: OK");
