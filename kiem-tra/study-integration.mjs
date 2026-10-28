import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
for (const dir of ["extension","android/www"]) {
  const g={console,Date,Math,URL,Map,Set};g.self=g;
  vm.createContext(g);
  for(const name of ["jlpt-tien-do","jlpt-cau-hoi","jlpt-study","srs","ngu-phap","study-grammar"])
    vm.runInContext(fs.readFileSync(dir+"/"+name+".js","utf8"),g);
  const mon=JSON.parse(fs.readFileSync(dir+"/jlpt/n3.json","utf8"));
  g.JlptCauHoi.chuanBi(mon);
  for(const source of [mon._idx.tu[0],mon._idx.han[0],mon._idx.pp[0]]) {
    const card=g.JlptCauHoi.theYeu(mon,source.id);assert.ok(card);
    const incoming=g.JlptStudy.item(card,"n3");assert.ok(incoming.word);
    const old={...incoming,means:["edited"],mEdit:true,note:"keep",dongBang:true,duong:{nhin:{lv:4,ngay:30,due:9999999999999,ts:1}}};
    const next=g.JlptStudy.merge(old,incoming,1000);
    assert.equal(next.note,"keep");assert.equal(next.means[0],"edited");
    assert.equal(next.duong.nhin.lv,4);assert.equal(next.dongBang,false);
    assert.ok(g.Srs.denHanDuong(next,"nhin",1001));
    for(const route of g.Srs.duongCo(next))assert.ok(g.Srs.denHanDuong(next,route,1001),route);
    const cleared={...old,cauNghe:{cau:"",dich:"",sua:1,ts:900}};
    assert.equal(g.JlptStudy.merge(cleared,incoming,1000).cauNghe.cau,"");
    const deleted={...old,del:true};assert.equal(g.JlptStudy.merge(deleted,incoming,1000),deleted);
  }
  const word={key:"javi:勉強",word:"勉強",dict:"javi",src:{cau:"私は毎朝日本語を勉強します。",cauDich:"Tôi học tiếng Nhật mỗi sáng."}};
  g.StudyGrammar.hydrate({},{});assert.equal(g.StudyGrammar.queue([word]).length,1);
  const q=g.StudyGrammar.queue([word])[0]._grammar;
  const frozen=g.NguPhapSrs.dongBang(null,q.cau,true,1000);
  g.StudyGrammar.remember(q,frozen);assert.equal(g.StudyGrammar.queue([word]).length,0);
  g.StudyGrammar.remember(q,g.NguPhapSrs.dongBang(frozen,q.cau,false,1001));
  assert.equal(g.StudyGrammar.queue([word],1002).length,1);
  assert.equal(g.StudyGrammar.queue([{...word,del:true}]).length,0);
  assert.equal(g.StudyGrammar.queue([{...word,dongBang:true}]).length,0);
  assert.equal(g.StudyGrammar.queue([word,{...word,key:"second"}]).length,1);
}
const g={URL,module:{exports:{}}};g.globalThis=g;vm.createContext(g);
vm.runInContext(fs.readFileSync("android/www/media-import.js","utf8"),g);
const source=g.NeutronMediaImport.sourceYouTube,id="dQw4w9WgXcQ";
for(const url of ["https://youtu.be/"+id+"?t=1m34s","https://www.youtube.com/watch?v="+id+"&t=94","https://m.youtube.com/shorts/"+id+"?start=94"])
 assert.equal(source({src:{url}}),"https://m.youtube.com/watch?v="+id+"&t=94");
assert.equal(source({src:{url:"https://www.youtube.com/watch?v="+id,yt:{v:id,t:34.9}}}),"https://m.youtube.com/watch?v="+id+"&t=34");
assert.equal(source({src:{url:"https://youtube.com.evil.invalid/watch?v="+id}}),"");
assert.equal(source({src:{url:"javascript:alert(1)"}}),"");
console.log("JLPT remediation, grammar route and desktop YouTube sources: OK");
