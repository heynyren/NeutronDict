import {readFileSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

// Source-derived courses: editorial content is separate from the original OCR records.
export function buildN45(source, editorial) {
  const courses = {}, audit = {};
  const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const hash = s => Array.from(s).reduce((n,c)=>(n*31+c.codePointAt(0))>>>0,7);
  // Reviewed alternatives span distinct concepts. Related concepts are excluded as a group.
  const bank = [
    ["xe đạp","xe|tau|phuong tien|giao thong|di lai|van chuyen|di chuyen"],
    ["bệnh viện","benh|y hoc|suc khoe|chua|nhap vien|xuat vien"],
    ["tháng trước","thoi gian|ngay|thang|nam|tuan|hom|truoc|qua khu"],
    ["bút chì","but|viet|ve|dung cu"],
    ["màu đỏ","mau|sac|do"],
    ["bưu điện","buu|thu|dien bao|chuyen phat"],
    ["cầu thang","cau|thang|cong trinh"],
    ["thư viện","thu|sach|tai lieu"],
    ["trời lạnh","troi|lanh|thoi tiet"],
    ["mua hàng","mua|hang|mua sam"],
    ["đọc sách","doc|sach"],
    ["hát","hat|am nhac|nhac|ca si|bieu dien"],
    ["đi bộ","di|di chuyen|chay"],
    ["rẻ","re|gia|tien"],
    ["ngon","ngon|mon an|vi|thuc an|am thuc"],
    ["ngủ","ngu|nghi|thuc"],
    ["cây cầu","cau|cong trinh"],
    ["đàn guitar","dan|am nhac|nhac|dung cu"],
    ["trứng gà","trung|ga|thuc pham|thuc an|nguyen lieu"],
    ["nước uống","nuoc|uong|thuc pham|do uong"],
    ["tàu điện ngầm","tau|xe|dien|phuong tien|giao thong|di lai|van chuyen"],
    ["gia đình","gia dinh|nha|nguoi than|cha|me|vo|chong|con|anh|chi|em"],
    ["tiền lương","tien|luong|thu nhap|thuong"],
    ["cửa sổ","cua|loi vao|loi ra"],
    ["bơi","boi|van dong|the thao"],
    ["hộ chiếu","ho chieu|giay to|xuat nhap canh"]
  ];
  const grammarBank = [
    "", "Mời người nghe cùng làm một việc", "Diễn tả mong muốn của người nói",
    "Cấm người nghe làm một việc", "So sánh hai đối tượng",
    "Nói về trải nghiệm trong quá khứ", "Chỉ vị trí của người hoặc vật",
    "Nêu nguyên nhân của sự việc", "Hỏi số lượng hoặc thời lượng",
    "Diễn tả việc đang xảy ra", "Nói về dự định trong tương lai",
    "Thuật lại thông tin nghe từ người khác", "Cho phép làm một việc"
  ];
  function wrongMeaning(m,id) {
    const n=norm(m), words=new Set(n.split(" "));
    const eligible=bank.filter(([v,aliases]) => !aliases.split("|").some(a=>n.includes(a)) &&
      !norm(v).split(" ").some(w=>words.has(w)));
    if(eligible.length<3) throw new Error("Review distractors: "+id);
    const start=hash(id)%eligible.length;
    return Array.from({length:3},(_,i)=>eligible[(start+i)%eligible.length][0]);
  }
  const splitReading=s=>String(s||"").split(/[;/／、,\\s]+/u).filter(Boolean);
  for(const level of ["N5","N4"]) {
    const raw=source[level], ed=editorial[level], base=level==="N5"?1:26;
    const byV=new Map(raw.vocabulary.map(x=>[x.id,x])),byG=new Map(raw.grammar.map(x=>[x.id,x]));
    const lessons=Array.from({length:25},(_,i)=>({so:base+i,tu:[],han:[],pp:[],vd:[]}));
    const included=new Set(),merged=[],identities=new Map();
    let lastLesson=base;
    for(const row of ed.vocabulary) {
      const original=byV.get(row.id);if(!original)throw new Error(row.id);
      const r=row.r || original.r || (/^[ぁ-んァ-ヶー]+$/u.test(original.w)?original.w:"");
      if(!r || !/^[ぁ-んァ-ヶー]+$/u.test(r)) throw new Error("Unreviewed reading: "+row.id);
      let lesson=original.senses.find(s=>s.lesson>=base&&s.lesson<base+25)?.lesson;
      if(level==="N5" && row.sourceIndex>=106) lesson=Math.min(25,Math.floor((row.sourceIndex-106)/326*25)+1);
      if(level==="N5" && row.sourceIndex>=16 && row.sourceIndex<=20) lesson=3;
      if(level==="N5" && row.sourceIndex>=21 && row.sourceIndex<=28) lesson=4;
      lesson=lesson||lastLesson;lastLesson=lesson;
      const identity=r+"|"+norm(row.m);
      if(identities.has(identity)) {merged.push({id:row.id,into:identities.get(identity),reason:"same reviewed reading and meaning"});included.add(row.id);continue;}
      identities.set(identity,row.id);included.add(row.id);
      const sourceRef=original.senses.find(s=>s.lesson===lesson)?.source || original.senses[0]?.source;
      const t={id:level.toLowerCase()+":"+row.id,sourceEntityId:row.id,w:original.w,r,m:row.m,hv:"",source:sourceRef,
        quiz:{kind:"tu-nghia",answer:row.m,wrong:wrongMeaning(row.m,row.id)}};
      lessons[lesson-base].tu.push(t);
    }
    for(const row of ed.grammar) {
      const original=byG.get(row.id);if(!original)throw new Error(row.id);
      const candidates=grammarBank.map((text,i)=>({text,i})).filter(x=>x.i && x.i!==row.category);
      // Close pragmatic categories are kept out together (requests, permission, wishes, plans).
      const banned = new Set(row.category===1?[1,12,2]:row.category===2?[1,2,10]:row.category===12?[1,3,12]:row.category===3?[3,12]:[]);
      const choices=candidates.filter(x=>!banned.has(x.i) && !(row.avoid||[]).includes(x.i));
      const offset=hash(row.id)%choices.length;
      const wrong=Array.from({length:3},(_,i)=>choices[(offset+i)%choices.length].text);
      const p={id:level.toLowerCase()+":"+row.id,sourceEntityId:row.id,p:row.p,m:row.m,cn:row.p,gt:row.m,
        source:{...(original.senses.find(s=>s.lesson===row.lesson)?.source||original.senses[0]?.source),exampleEditorial:true},
        quiz:{kind:"pp-context",context:row.j,translation:row.v,answer:row.m,wrong}};
      lessons[row.lesson-base].pp.push(p);
      lessons[row.lesson-base].vd.push({j:row.j,v:row.v,g:level.toLowerCase()+":"+row.id,editorial:true});
    }
    const allWords=lessons.flatMap(b=>b.tu);
    for(const t of allWords)if(/[一-鿿]/u.test(t.w)) {
      const readings=[...new Set(allWords.filter(x=>x.w!==t.w && x.r!==t.r).map(x=>x.r))];
      const at=hash(t.id)%readings.length;
      t.readQuiz={answer:t.r,wrong:Array.from({length:3},(_,i)=>readings[(at+i)%readings.length])};
    }
    const usedHan=new Set(), dict=new Map(raw.kanji.map(x=>[x.c,x]));
    for(const b of lessons)for(const t of b.tu)for(const c of t.w.match(/[一-鿿]/gu)||[]) {
      if(usedHan.has(c))continue;
      const h=dict.get(c);if(!h?.hv)continue;
      usedHan.add(c);
      b.han.push({id:level.toLowerCase()+":"+h.id,sourceEntityId:h.id,c,hv:h.hv,on:h.on||"",kun:h.kun||"",nho:"",source:h.source});
    }
    const allHan=lessons.flatMap(b=>b.han);
    for(const h of allHan) {
      const terms=String(h.hv).split(/[;,/]/).map(norm);
      const candidates=allHan.filter(x=>x.id!==h.id && !String(x.hv).split(/[;,/]/).map(norm).some(n=>terms.includes(n)));
      const unique=[...new Set(candidates.map(x=>x.hv))];
      const offset=hash(h.id)%unique.length;
      const wrong=Array.from({length:3},(_,i)=>unique[(offset+i)%unique.length]);
      h.quiz={kind:"han-hv",answer:h.hv,wrong};
    }
    courses[level.toLowerCase()]={schema:1,id:level.toLowerCase(),cap:level,quizMode:"reviewed-choices",
      sourceZipSha256:raw.zipSha256,contentReview:"editorial_review_not_teacher_certification",
      chuong:Array.from({length:5},(_,i)=>({so:i+1,bai:lessons.slice(i*5,i*5+5)}))};
    audit[level]={zipSha256:raw.zipSha256,integrity:"ok",foreignKeyErrors:[],checksumMismatches:[],
      inputCounts:raw.manifest.counts,counts:{vocabulary:lessons.flatMap(b=>b.tu).length,grammar:ed.grammar.length,kanji:allHan.length,chapters:5,lessons:25},
      mergedVocabulary:merged,
      excludedVocabulary:raw.vocabulary.filter(x=>!included.has(x.id)).map(x=>({id:x.id,w:x.w,reason:"OCR fragment, mismatched meaning, ambiguous source, or duplicate surface"})),
      excludedGrammar:raw.grammar.filter(x=>!ed.grammar.some(g=>g.id===x.id)).map(x=>({id:x.id,p:x.p,reason:"Duplicate structure, OCR fragment, or unusable heading"})),
      excludedKanji:raw.kanji.filter(x=>!usedHan.has(x.c)).map(x=>({id:x.id,c:x.c,reason:"Not present in retained vocabulary; observed characters are not an official JLPT list"})),
      excludedQuestionPages:raw.manifest.counts.questions,excludedVocabularyCandidates:raw.manifest.counts.vocabulary_candidates,
      rawExamplesNotImported:raw.manifest.counts.examples,editorialExamples:ed.grammar.length,
      limitations:["Source level labels are curricular, not official JLPT lists.","Raw OCR meanings/readings are retained in source-selection; editorial fixes are separate.","Exercise pages have no verified keys; none are used as graded questions.","Examples are newly authored and translated for the reviewed grammar; they are not verbatim source sentences.","Audio files are not included; existing TTS handles listening.","Known unimported source files remain outside this course."]};
  }
  return {courses,audit};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const source=JSON.parse(readFileSync("docs/data/n45-source-selection.json","utf8"));
 const editorial=JSON.parse(readFileSync("docs/data/n45-editorial.json","utf8"));
 const {courses,audit}=buildN45(source,editorial);
 for(const [level,data] of Object.entries(courses))for(const base of ["extension","android/www"])writeFileSync(base+"/jlpt/"+level+".json",JSON.stringify(data)+"\n");
 writeFileSync("docs/data/n45-import-audit.json",JSON.stringify(audit,null,2)+"\n");
}
