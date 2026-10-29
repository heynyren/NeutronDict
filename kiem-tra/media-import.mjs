import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const scope={};vm.createContext(scope);scope.URL=URL;
vm.runInContext(fs.readFileSync("android/www/media-import.js","utf8"),scope);
const {normalize,merge}=scope.NeutronMediaImport;
const source={id:"event-1",word:"ケア",language:"ja",sentence:"クリームを塗って肌のケアをする。",meaning:"chăm sóc",
meaningLanguage:"vi",translatedSentence:"Bôi kem để chăm sóc da.",url:"https://example.org/article"};
const item=normalize(source);
assert.equal(item.dict,"javi");assert.equal(item.src.cau,source.sentence);
const saved=merge(null,item,100).item;
assert.equal(saved.cauNghe.dich,source.translatedSentence);
assert.equal(merge(saved,item,200).status,"duplicate");
const old={...saved,mediaImports:[],means:["bản tôi sửa"],mEdit:1,note:"ghi chú",deck:"A",
duong:{nhin:{due:999}},srs:{due:777},lichRieng:{nhin:{dongBang:1}},dongBang:1,
cauNghe:{cau:"câu tôi sửa",sua:1},customFutureField:{keep:true}};
const before=JSON.parse(JSON.stringify(old));
const next=merge(old,normalize({...source,id:"event-2",sentence:"別のケア。"}),300).item;
for(const key of ["means","mEdit","note","deck","duong","srs","lichRieng","dongBang","cauNghe","customFutureField"])
assert.equal(JSON.stringify(next[key]),JSON.stringify(before[key]),key);
assert.equal(JSON.stringify(old),JSON.stringify(before),"input untouched");
assert.equal(next.mediaSources.length,2);
const deleted={...saved,del:1,ts:1000};assert.equal(merge(deleted,item,2000).status,"deleted");
assert.equal(merge(deleted,item,2000).item,deleted);
assert.throws(()=>normalize({...source,language:"fr"}));
assert.equal(normalize({...source,url:"javascript:alert(1)"}).src.url,"");
const video=normalize({id:"yt",word:"care",wordLanguage:"en",meaningLanguage:"vi",sentence:"Take care.",videoId:"abcdefghijk",startMs:94200,endMs:96700});
assert.equal(video.src.yt.t,94.2);assert.equal(video.src.yt.dur,2.5);assert.match(video.src.url,/t=94/);
const translated=normalize({...source,translated:true,word:"care",language:"en",sentence:"ケアをする。",translatedSentence:"Take care.",videoId:"abcdefghijk"});
assert.equal(translated.src.cau,"Take care.");assert.equal(translated.src.yt,undefined);
console.log("media-import: context, languages, replay timing, idempotency, tombstones and SRS preservation passed");
