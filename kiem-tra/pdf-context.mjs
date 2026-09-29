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

const bg=readFileSync("extension/background.js","utf8");
const atSource=bg.indexOf("function pdfSourceUrl(");
vm.runInContext(bg.slice(atSource,bg.indexOf("\n}",atSource)+2),g);
assert.equal(g.pdfSourceUrl({frameUrl:"chrome-extension://internal/viewer.html",pageUrl:"file:///lesson.pdf"},{}),"file:///lesson.pdf");
assert.equal(g.pdfSourceUrl({frameUrl:"https://example.test/download",pageUrl:"https://example.test/article"},{}),"https://example.test/download");

const example="クリームを塗って肌のケアをする。";
assert.equal(g.PdfContext.candidates(["□ケア","□ケア (N/Nする)",example],"ケア",14).length,1);
const bs="- 肌のケアをする\n- 次の項目";
assert.equal(g.PdfContext.around(bs,bs.indexOf("ケア"),bs.indexOf("ケア")+2).cau,"肌のケアをする");
const en="Dr. Tanaka recommends skin care. Next sentence.";
assert.equal(g.PdfContext.around(en,en.indexOf("care"),en.indexOf("care")+4).cau,"Dr. Tanaka recommends skin care.");
const decimal="Use 3.5 ml for skin care. Done.";
assert.equal(g.PdfContext.around(decimal,decimal.indexOf("care"),decimal.indexOf("care")+4).cau,"Use 3.5 ml for skin care.");
const cases=g.PdfContext.candidates(["ケアを続ける。","肌のケアをする。"],"ケア",1);
assert.equal(new Set(cases.map(c=>c.cau)).size,2,"ambiguous sentences must remain distinguishable");
assert.equal(g.PdfContext.candidates(["Be careful."],"care",1).length,0);
assert.ok(!readFileSync("extension/popup.html","utf8").includes("pdfReader"));
assert.ok(!readFileSync("extension/background.js","utf8").includes("openPdfReader"));
