/* Extract source text, never generated examples. Geometry only removes overlapping ruby. */
(function(g) {
"use strict";
const JA=/[\u3040-\u30ff\u3400-\u9fff]/, KANA=/^[\u3040-\u30ffー\s]+$/;
const tidy=s=>String(s||"").normalize("NFC").replace(/[ \t　]+/g," ").trim();
function paragraphs(items) {
  const chars=items.filter(x=>x.str&&x.str.trim()&&x.transform).map(x=>({
    text:x.str,x:x.transform[4],y:x.transform[5],h:Math.abs(x.height||x.transform[3])||1,w:Math.abs(x.width||0)
  }));
  const main=chars.filter(c=>!(KANA.test(c.text)&&chars.some(b=>b!==c&&JA.test(b.text)&&b.h>=c.h*1.35&&
    c.y>b.y+b.h*.3&&c.y<b.y+b.h*1.7&&c.x<b.x+b.w&&c.x+c.w>b.x)));
  const lines=[];
  for(const c of main.sort((a,b)=>b.y-a.y||a.x-b.x)){
    let line=lines.find(l=>Math.abs(l.y-c.y)<Math.min(l.h,c.h)*.3);
    if(!line){line={y:c.y,h:c.h,parts:[]};lines.push(line);}line.parts.push(c);
  }
  const rows=[];
  for(const line of lines.sort((a,b)=>b.y-a.y)){
    let text="",last=null;
    for(const p of line.parts.sort((a,b)=>a.x-b.x)){
      if(last&&p.x-(last.x+last.w)>Math.max(p.h,last.h)*2){
        rows.push({text:tidy(text),y:line.y,h:line.h});text="";last=null;
      }
      if(last&&!JA.test(last.text.slice(-1)+p.text[0])&&p.x-(last.x+last.w)>p.h*.12&&!/\s$/.test(text))text+=" ";
      text+=p.text;last=p;
    }
    rows.push({text:tidy(text),y:line.y,h:line.h});
  }
  const out=[];let last=null;
  for(const row of rows){
    const t=row.text.replace(/^[•●・]\s*/,"");if(!t)continue;
    const prev=out[out.length-1];
    if(prev&&last&&JA.test(t)&&JA.test(prev)&&!/[。！？.!?][」』）)"']*$/.test(prev)&&
      last.y-row.y>row.h*.4&&last.y-row.y<row.h*2.3)out[out.length-1]+=t;
    else out.push(t);
    last=row;
  }
  return out;
}
function around(text,start,end){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>text.length)return null;
  const word=text.slice(start,end).trim();if(!word)return null;
  let a=start,b=end;
  const boundary=i=>/[。！？.!?]/.test(text[i])&&g.CauNghe.thatSuKet(text,i);
  while(a>0&&!boundary(a-1)&&text[a-1]!=="\n")a--;
  if(!boundary(end-1)){
    while(b<text.length&&!boundary(b)&&text[b]!=="\n")b++;
    if(b===text.length||text[b]==="\n")return null;b++;
  }
  while(b<text.length&&/[」』）)"']/.test(text[b]))b++;
  const cau=tidy(text.slice(a,b));
  return g.CauNghe.cauHopLe(cau,word)?{word,cau,start,end}:null;
}
g.PdfContext={paragraphs,around};
})(typeof self!=="undefined"?self:this);
