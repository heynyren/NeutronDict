import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildN45} from "../cong-cu/dung-jlpt-n45.mjs";
globalThis.self=globalThis;
await import("../extension/jlpt-cau-hoi.js");
await import("../extension/jlpt-tien-do.js");
await import("../extension/jlpt-study.js");
await import("../extension/jlpt-theme.js");
await import("../extension/jlpt-canh-gioi.js");
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=JSON.parse(read("docs/data/n45-source-selection.json")),editorial=JSON.parse(read("docs/data/n45-editorial.json"));
const generated=buildN45(source,editorial),audit=JSON.parse(read("docs/data/n45-import-audit.json"));
assert.deepEqual(generated.audit,audit,"reproducible source audit");
for(const name of ["jlpt-cau-hoi.js","jlpt-giao-dien.js","jlpt-theme.js","jlpt-canh-gioi.js","jlpt/dictionary-license.txt"])assert.equal(read("extension/"+name),read("android/www/"+name));
assert.deepEqual(JlptTheme.SAP_CO.map(x=>x.id),["n1"]);
const allIds=new Set(),counts={n5:[355,115,86],n4:[510,397,104]};
for(const level of ["n5","n4"]){
 const text=read("extension/jlpt/"+level+".json");
 assert.equal(text,read("android/www/jlpt/"+level+".json"));
 assert.equal(text,JSON.stringify(generated.courses[level])+"\n","reproducible course");
 const mon=JSON.parse(text),lessons=mon.chuong.flatMap(c=>c.bai);
 assert.equal(mon.chuong.length,5);assert.equal(lessons.length,25);
 const groups=["tu","han","pp"].map(k=>lessons.flatMap(b=>b[k]));
 assert.deepEqual(groups.map(x=>x.length),counts[level]);
 const items=groups.flat(),byId=new Map(items.map(x=>[x.id,x]));
 for(const item of items){
   assert.ok(item.id.startsWith(level+":"));assert.ok(!allIds.has(item.id));allIds.add(item.id);
   assert.ok(item.source.title && item.source.unitId && item.sourceEntityId);
   assert.equal(item.quiz.answer,item.c?item.hv:item.m);
   assert.equal(new Set([item.quiz.answer,...item.quiz.wrong]).size,4);
   if(item.w)assert.match(item.r,/^[ぁ-んァ-ヶー]+$/u);
   if(item.p){assert.ok(item.source.exampleEditorial);assert.ok(item.quiz.context.endsWith("。"));assert.ok(item.quiz.translation);}
   if(item.c){
     const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
     const valid=item.hv.split(/[;,/]/).map(norm);
     assert.ok(!item.quiz.wrong.some(x=>x.split(/[;,/]/).map(norm).some(v=>valid.includes(v))),item.id);
   }
 }
 const stages=JlptCauHoi.chiaChang(mon),ids=stages.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);assert.equal(stages.at(-1).id,"boss");
 const covered=new Set(),types=new Set();
 for(let seed=1;seed<=12;seed++){
  let state=seed;const rng=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
  for(const stage of stages){
   const qs=JlptCauHoi.dungDe(mon,stage,{rng});
   assert.ok(qs.length>0,level+":"+stage.id);assert.equal(qs.length,stage.soCau);
   assert.equal(new Set(qs.map(q=>q.mucId)).size,qs.length);
   for(const q of qs){
     const item=byId.get(q.mucId);assert.ok(item);
     const answerSet=q.kieu==="tu-doc"?item.readQuiz:item.quiz;
     assert.equal(q.chon[q.dung],answerSet.answer);
     assert.equal(q.chon.filter(x=>x===answerSet.answer).length,1);
     assert.deepEqual(new Set(q.chon),new Set([answerSet.answer,...answerSet.wrong]));
     if(q.kieu==="tu-doc")assert.equal(answerSet.answer,item.r);
     if(q.kieu==="nghe")assert.ok(q.de.nghe && !q.de.chinh);
     if(stage.ci>=0)assert.equal(item._ch,stage.ci);
     if(!stage.loai.startsWith("boss"))covered.add(q.mucId);
     types.add(q.kieu);
   }
   const reported=Object.fromEntries(qs.map(q=>[q.id,1]));
   assert.ok(JlptCauHoi.dungDe(mon,stage,{rng,baoLoi:reported}).every(q=>!reported[q.id]));
  }
 }
 assert.equal(covered.size,items.length,"every card is tested in an ordinary stage");
 for(const type of ["tu-nghia","tu-doc","nghe","han-hv","pp-context"])assert.ok(types.has(type));
 const a=JlptTienDo.macDinh(),b=JlptTienDo.macDinh();
 assert.ok(!JlptTienDo.changMo(a,level,ids,ids.length-1,true));
 stages.slice(0,-1).forEach((s,i)=>{
  assert.ok(JlptTienDo.changMo(a,level,ids,i,true));
  JlptTienDo.ghiKetQua(i%2?a:b,level,s.id,{dung:0,tong:s.soCau,saiIds:[]},100000+i);
 });
 const merged=JlptTienDo.tron(a,b);
 assert.ok(JlptTienDo.changMo(merged,level,ids,ids.length-1,true));
 assert.deepEqual(JlptTienDo.tron(merged,b),merged);
 for(const item of items){
  const incoming=JlptStudy.item(JlptCauHoi.theYeu(mon,item.id),level);
  assert.equal(incoming.jlptSource.level,level);
  if(item.p){assert.equal(incoming.cauNghe.cau,item.quiz.context);assert.equal(incoming.cauNghe.dich,item.quiz.translation);}
  const old={note:"retain",srs:{level:6,next:9000},dongBang:true,lichRieng:{nghe:{cap:4,dongBang:true}}};
  const result=JlptStudy.merge(old,incoming,10000);
  assert.deepEqual(result.srs,old.srs);assert.equal(result.note,"retain");
  for(const route of ["nhin","nghe","dien"])assert.equal(result.lichRieng[route].dongBang,false);
  assert.equal(result.lichRieng.nghe.cap,4);
 }
 for(let i=0;i<=5;i++)assert.match(JlptCanhGioi.ve(level,i,0.46),/<svg/);
 assert.notEqual(JlptCanhGioi.ve(level,0,1),JlptCanhGioi.ve(level,5,1));
 const raw=source[level.toUpperCase()],report=audit[level.toUpperCase()];
 assert.equal(raw.vocabulary.length,report.counts.vocabulary+report.mergedVocabulary.length+report.excludedVocabulary.length);
 assert.equal(raw.grammar.length,report.counts.grammar+report.excludedGrammar.length);
 console.log("PASS "+level+": "+items.length+" reviewed cards, "+stages.length+" playable stages, all question kinds, source audit, sync, final gate, remediation");
}
const before={mon:{n3:{chang:{old:{tot:100,lan:1,xong:true}}},kaiwa:{chang:{old:{tot:80,lan:1,xong:true}}}}};
const after=JlptTienDo.tron(before,{mon:{n4:{chang:{c1b26t1:{tot:0,lan:1,xong:true}}},n5:{chang:{c1b1t1:{tot:30,lan:1,xong:true}}}}});
for(const key of ["n3","kaiwa","n4","n5"])assert.ok(after.mon[key].chang);
