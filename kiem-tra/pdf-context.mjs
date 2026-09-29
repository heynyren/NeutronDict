import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const g={};g.self=g;vm.createContext(g);
for(const f of ["cau-nghe.js","pdf-context.js","hoi-gemini.js","srs.js","ngu-phap.js"])
  vm.runInContext(readFileSync("extension/"+f,"utf8"),g);
const cau="クリームを塗って肌のケアをする。",word="ケア";
const p=(str,x,y,h=16)=>({str,transform:[h,0,0,h,x,y],height:h,width:str.length*h});
const paragraphs=g.PdfContext.paragraphs([
  p("クリームを",0,100),p("塗って肌の",80,100),p("ケアをする。",160,100),
  p("ぬ",80,113,7),p("(Bôi kem để chăm sóc da.)",0,65,12)
]);
assert.equal(paragraphs[0],cau);
assert.equal(paragraphs.length,2);
const wrap=g.PdfContext.paragraphs([p("クリームを塗って",0,100),p("肌のケアをする。",0,78)]);
assert.equal(wrap[0],cau);
const repeated="ケアは大切です。"+cau;
const at=repeated.lastIndexOf(word);
assert.equal(g.PdfContext.around(repeated,at,at+word.length).cau,cau);
assert.equal(g.PdfContext.around("肌のケアを",2,4),null);
const src={url:"file:///lesson.pdf",sel:word,cau,pdf:true};
assert.equal(g.CauNghe.tuNguon(src,word).cau,cau);
assert.equal(g.CauNghe.tuNguon({sel:word,pdf:true},word),null);
const it={word,dict:"javi",src,cauNghe:{cau,dich:""}};
assert.ok(g.Srs.duongCo(it).includes("nghe"));
assert.ok(g.HoiGemini.loiHoi(it,{}).includes(cau));
assert.ok(!g.HoiGemini.loiHoi(it,{}).includes("CHƯA lưu được"));
assert.equal(g.NguPhap.layCau(it),cau);
for(const f of ["cau-nghe.js","hoi-gemini.js"])
  assert.equal(readFileSync("extension/"+f,"utf8"),readFileSync("android/www/"+f,"utf8"));
console.log("PDF context: ruby, bilingual, wrapping, repeated word, listening, Gemini, grammar OK");
