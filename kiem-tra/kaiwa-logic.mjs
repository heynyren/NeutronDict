import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
globalThis.self=globalThis;
await import("../extension/jlpt-cau-hoi.js");
await import("../extension/jlpt-tien-do.js");
await import("../extension/jlpt-study.js");
const CH=JlptCauHoi,TD=JlptTienDo,ST=JlptStudy;
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
for(const name of ["jlpt/kaiwa.json","jlpt-cau-hoi.js","jlpt-giao-dien.js","jlpt-theme.js","jlpt-canh-gioi.js","jlpt-study.js","jlpt-tien-do.js"])
 assert.equal(read("extension/"+name),read("android/www/"+name),name+" differs between devices");
const mon=JSON.parse(read("extension/jlpt/kaiwa.json")),audit=JSON.parse(read("docs/data/kaiwa-source-audit.json"));
assert.equal(mon.chuong.length,8);
assert.equal(mon.chuong.flatMap(c=>c.bai).length,39);
const items=mon.chuong.flatMap(c=>c.bai.flatMap(b=>b.tu.concat(b.pp))),byId=new Map(items.map(i=>[i.id,i]));
assert.equal(items.length,109);assert.equal(byId.size,109);
assert.equal(items.filter(i=>i.source.id==="nameraka").length,61);
assert.equal(items.filter(i=>i.source.id==="osaka").length,48);
assert.equal(new Set(items.filter(i=>i.source.id==="nameraka").map(i=>i.source.lesson)).size,23);
assert.equal(new Set(items.filter(i=>i.source.id==="osaka").map(i=>i.source.section)).size,16);
for(const item of items){
 const proof=audit.items.find(x=>x.id===item.id);
 assert.ok(proof?.sourceExcerpt.includes(item.source.quote),item.id+" source quote");
 assert.equal(item.quiz.context,item.source.quote);
 assert.equal(item.quiz.answer,item.m);
 assert.equal(item.quiz.wrong.length,3);assert.equal(new Set([item.m,...item.quiz.wrong]).size,4);
 assert.doesNotMatch(item.quiz.context,/要確認|聞き取り不明/);
 if(item.source.id==="osaka")assert.equal(item.source.status,"inferred");
 assert.ok(item.quiz.translation && item.quiz.explanation);
}
CH.chuanBi(mon);const stages=CH.chiaChang(mon),ids=stages.map(s=>s.id);
assert.equal(new Set(ids).size,ids.length);
assert.equal(stages.filter(s=>s.loai==="boss-chuong").length,8);
assert.equal(stages.at(-1).id,"boss");
const covered=new Set();
for(let seed=1;seed<=5;seed++){
 let state=seed;const rng=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
 for(const stage of stages){
  const questions=CH.dungDe(mon,stage,{rng});
  assert.ok(questions.length>0,stage.id);assert.equal(questions.length,stage.soCau);
  assert.equal(new Set(questions.map(q=>q.mucId)).size,questions.length);
  for(const q of questions){
   const item=byId.get(q.mucId);
   assert.equal(q.chon.length,4);assert.equal(new Set(q.chon).size,4);
   assert.equal(q.chon[q.dung],item.m);assert.equal(q.dapAn.cau,item.source.quote);
   assert.deepEqual(new Set(q.chon),new Set([item.m,...item.quiz.wrong]));
   if(stage.loai!=="boss")assert.equal(item._ch,stage.ci);
   if(!stage.loai.startsWith("boss"))covered.add(q.mucId);
   assert.ok(!CH.dungDe(mon,stage,{rng,baoLoi:{[q.id]:true}}).some(x=>x.id===q.id));
  }
 }
}
assert.equal(covered.size,109,"every entry has a playable ordinary stage");
const a=TD.macDinh(),b=TD.macDinh();
assert.ok(!TD.changMo(a,"kaiwa",ids,ids.length-1,true));
stages.slice(0,-1).forEach((s,i)=>{
 assert.ok(TD.changMo(a,"kaiwa",ids,i,true));
 TD.ghiKetQua(i%2?a:b,"kaiwa",s.id,{dung:0,tong:s.soCau,saiIds:[]},100000+i);
});
assert.ok(!TD.changMo(a,"kaiwa",ids,ids.length-1,true));
const merged=TD.tron(a,b);
assert.ok(TD.changMo(merged,"kaiwa",ids,ids.length-1,true));
assert.deepEqual(TD.tron(merged,b),merged,"sync is idempotent");
assert.ok(TD.chuan(JSON.parse(JSON.stringify(merged))).mon.kaiwa);
for(const item of items){
 const incoming=ST.item(CH.theYeu(mon,item.id),"kaiwa");
 assert.equal(incoming.src.title,"Kaiwa Nihongo");assert.equal(incoming.cauNghe.cau,item.source.quote);
 assert.equal(incoming.cauNghe.dich,item.quiz.translation);
 const existing={note:"keep",srs:{level:7,next:123456},dongBang:true,lichRieng:{nghe:{dongBang:true,cap:4}}};
 const result=ST.merge(existing,incoming,2000);
 assert.deepEqual(result.srs,existing.srs);assert.equal(result.note,"keep");assert.equal(result.dongBang,false);
 for(const route of ["nhin","nghe","dien"]){assert.equal(result.lichRieng[route].dongBang,false);assert.equal(result.lichRieng[route].hen,0);}
 assert.equal(result.lichRieng.nghe.cap,4);
}
const overlay=read("extension/phu-de.js"),icon=readFileSync(new URL("../extension/icons/icon48.png",import.meta.url)).toString("base64");
assert.ok(overlay.includes(icon),"YouTube overlay uses the current bear icon");
console.log("PASS Kaiwa: 109 sourced entries, "+stages.length+" stages, contextual choices, sync, study transfer, shared data and YouTube branding");
