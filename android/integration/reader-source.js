(function(source){
  "use strict";
  const clean=s=>String(s || "").replace(/[\s\u200b\u2060\ufeff]+/g,"");
  const word=clean(source.word),sentence=clean(source.sentence);
  const prefix=clean(String(source.prefix || "").slice(-200)),suffix=clean(String(source.suffix || "").slice(0,200));
  if(!word || !document.body)return JSON.stringify({status:"not-found"});
  const signature=JSON.stringify([word,sentence,prefix,suffix]);
  const previous=[...document.querySelectorAll("mark[data-neutrondict-source]")];
  const scroll=element=>{
    const box=element.getBoundingClientRect();
    if(box.top<24 || box.bottom>innerHeight-24)element.scrollIntoView({block:"center",inline:"nearest",behavior:"auto"});
  };
  if(document.documentElement.dataset.neutrondictSource===signature && previous.length){
    scroll(previous[0]);return JSON.stringify({status:"found",wordFound:true});
  }
  for(const mark of previous)mark.replaceWith(...mark.childNodes);
  const records=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const parent=node.parentElement;
      if(!parent || parent.closest("script,style,rt,rp,noscript,button,input,textarea,select,[contenteditable]:not([contenteditable=false]),[hidden],[aria-hidden=true]"))
        return NodeFilter.FILTER_REJECT;
      if(!parent.getClientRects().length || getComputedStyle(parent).visibility==="hidden")return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let text="",node,lastBlock=null;
  while((node=walker.nextNode()) && records.length<12000 && text.length<500000){
    const value=node.nodeValue,offsets=[],letters=[];
    for(let i=0;i<value.length;i++)if(!/[\s\u200b\u2060\ufeff]/.test(value[i])){letters.push(value[i]);offsets.push(i);}
    if(!letters.length)continue;
    const block=node.parentElement.closest("p,li,blockquote,h1,h2,h3,h4,h5,h6,td,figcaption,pre,article,main,section,div") || document.body;
    if(lastBlock && block!==lastBlock)text+="\n";
    lastBlock=block;
    const part=letters.join(""),start=text.length;
    text+=part;records.push({node,offsets,start,end:text.length});
  }
  const occurrences=(needle,start=0,end=text.length)=>{
    const found=[];let at=start;
    while(needle && found.length<2000 && (at=text.indexOf(needle,at))>=0 && at+needle.length<=end){found.push(at);at+=Math.max(1,needle.length);}
    return found;
  };
  const score=at=>{
    let before=0,after=0;
    while(before<prefix.length && at-before>0 && text[at-before-1]===prefix[prefix.length-before-1])before++;
    while(after<suffix.length && text[at+word.length+after]===suffix[after])after++;
    return before+after;
  };
  let matches=[];
  if(sentence)for(const at of occurrences(sentence))
    for(const position of occurrences(word,at,at+sentence.length))matches.push({at:position,score:10000+score(position)});
  const exact=matches.length>0;
  if(!exact)matches=occurrences(word).map(at=>({at,score:score(at)}));
  if(!matches.length)return JSON.stringify({status:"not-found"});
  matches.sort((a,b)=>b.score-a.score || a.at-b.at);
  const start=matches[0].at,end=start+word.length,marks=[];
  for(const part of records){
    const a=Math.max(start,part.start),b=Math.min(end,part.end);
    if(a>=b)continue;
    const rawStart=part.offsets[a-part.start],rawEnd=part.offsets[b-part.start-1]+1;
    const value=part.node.nodeValue,fragment=document.createDocumentFragment();
    if(rawStart)fragment.appendChild(document.createTextNode(value.slice(0,rawStart)));
    const mark=document.createElement("mark");
    mark.dataset.neutrondictSource="word";
    mark.textContent=value.slice(rawStart,rawEnd);
    mark.style.setProperty("background-color","#ffd45c","important");
    mark.style.setProperty("color","#17202a","important");
    mark.style.setProperty("outline","2px solid #d69313","important");
    mark.style.setProperty("border-radius","3px","important");
    fragment.appendChild(mark);
    if(rawEnd<value.length)fragment.appendChild(document.createTextNode(value.slice(rawEnd)));
    part.node.replaceWith(fragment);marks.push(mark);
  }
  if(!marks.length)return JSON.stringify({status:"not-found"});
  document.documentElement.dataset.neutrondictSource=signature;
  marks[0].scrollIntoView({block:"center",inline:"nearest",behavior:"auto"});
  return JSON.stringify({status:"found",wordFound:true,match:exact?"sentence":"word"});
})(__NEUTRON_SOURCE__)
