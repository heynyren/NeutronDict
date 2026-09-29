/* PDF text -> sentences. Preserve source text; never generate an example. */
(function(g){
"use strict";
const JA=/[\u3040-\u30ff\u3400-\u9fff]/,KANA=/^[\u3040-\u30ffー\s]+$/;
const BULLET=/^\s*(?:[-–—•●▪◦・□☐■◆◇❖]\s*|[0-9０-９]+[.)、．]\s*)/;
const tidy=s=>String(s||"").normalize("NFC").replace(/[ \t　]+/g," ").trim();
function paragraphs(items){
  const chars=items.filter(x=>x.str&&x.str.trim()&&x.transform).map(x=>({
    text:x.str,x:x.transform[4],y:x.transform[5],h:Math.abs(x.height||x.transform[3])||1,w:Math.abs(x.width||0)
  }));
  // Remove only small kana overlapping a larger Japanese base glyph above its baseline.
  const main=chars.filter(c=>!(KANA.test(c.text)&&chars.some(b=>b!==c&&JA.test(b.text)&&b.h>=c.h*1.35&&
    c.y>b.y+b.h*.3&&c.y<b.y+b.h*1.7&&c.x<b.x+b.w&&c.x+c.w>b.x)));
  const lines=[];
  for(const c of main.sort((a,b)=>b.y-a.y||a.x-b.x)){
    let line=lines.find(l=>Math.abs(l.y-c.y)<Math.min(l.h,c.h)*.3);
    if(!line){line={y:c.y,h:c.h,parts:[]};lines.push(line);}line.parts.push(c);
  }
  const rows=[];
  for(const line of lines.sort((a,b)=>b.y-a.y)){
    let text="",last=null,left=0;
    for(const p of line.parts.sort((a,b)=>a.x-b.x)){
      if(last&&p.x-(last.x+last.w)>Math.max(p.h,last.h)*2){
        rows.push({text:tidy(text),y:line.y,h:line.h,x:left});text="";last=null;
      }
      if(!last)left=p.x;
      if(last&&!JA.test(last.text.slice(-1)+p.text[0])&&p.x-(last.x+last.w)>p.h*.12&&!/\s$/.test(text))text+=" ";
      text+=p.text;last=p;
    }
    rows.push({text:tidy(text),y:line.y,h:line.h,x:left});
  }
  const out=[];let last=null;
  for(const row of rows){
    const bullet=BULLET.test(row.text),t=row.text;if(!t)continue;
    const prev=out[out.length-1],sameScript=prev&&JA.test(t)===JA.test(prev);
    // A newline caused by wrapping is not a sentence boundary; a new bullet/column is.
    if(prev&&last&&!bullet&&sameScript&&!/[。．！？.!?…][」』）)"']*$/.test(prev)&&
       last.y-row.y>row.h*.4&&last.y-row.y<row.h*2.3&&Math.abs(last.x-row.x)<row.h*2)
      out[out.length-1]+=(JA.test(t)?"":" ")+t;
    else out.push(t);
    last=row;
  }
  return out;
}
function boundary(text,i){
  const c=text[i];
  if(!/[。．.!?！？…]/.test(c))return false;
  if(c!==".")return true;
  if(/\d/.test(text[i-1]||"")&&/\d/.test(text[i+1]||""))return false;
  if(/(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|[A-Za-z])|(?:\b[A-Za-z]\.)+[A-Za-z])$/i.test(text.slice(0,i)))return false;
  return true;
}
function around(text,start,end){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>text.length)return null;
  const word=text.slice(start,end).trim();if(!word)return null;
  let a=start,b=end;
  while(a>0&&!boundary(text,a-1)&&text[a-1]!=="\n")a--;
  if(!boundary(text,end-1)){
    while(b<text.length&&!boundary(text,b)&&text[b]!=="\n")b++;
    if(b===text.length&&!BULLET.test(text.slice(a,b)))return null;
    if(b<text.length&&text[b]!=="\n")b++;
  }
  while(b<text.length&&/[。．.!?！？…」』）)"']/.test(text[b]))b++;
  const cau=tidy(text.slice(a,b).replace(BULLET,""));
  return g.CauNghe.cauHopLe(cau,word)?{word,cau,start,end}:null;
}
function candidates(paragraphs,word,page){
  word=tidy(word);if(!word)return [];
  const out=[];
  for(let paragraph=0;paragraph<paragraphs.length;paragraph++){
    const text=paragraphs[paragraph];let pos=0;
    while((pos=text.indexOf(word,pos))>=0){
      const start=pos;pos+=word.length;
      if(/^[A-Za-z]+$/.test(word)&&(/[A-Za-z]/.test(text[start-1]||"")||/[A-Za-z]/.test(text[pos]||"")))continue;
      const c=around(text,start,pos);
      // Vocabulary labels such as ケア (N/Nする) are not context sentences.
      const label=c&&c.cau.replace(/\s*[(（](?:N|V|Adj|Adv|する|な|い|\/|\s)+[)）]\s*$/gi,"").trim();
      if(c&&label!==word)out.push({...c,page,paragraph});
    }
  }
  return out;
}
g.PdfContext={paragraphs,around,candidates,boundary};
})(typeof self!=="undefined"?self:this);
