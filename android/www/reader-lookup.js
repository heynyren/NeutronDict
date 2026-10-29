/* Fast, read-only lookup. Context translation and dictionary enrichment happen on save. */
(function(g){
  "use strict";
  function create({getNotebook,translate,now=Date.now,max=200,ttl=600000}) {
    const cache=new Map(), pending=new Map();
    async function lookup(raw){
      const word=String(raw.word||"").trim(), language=String(raw.language||"ja").split(/[-_]/)[0].toLowerCase();
      if(!word||word.length>200)throw Error("Hãy chọn một từ hoặc cụm ngắn.");
      const key=language+":"+word, dict=language==="ja"?"javi":language==="en"?"envi":null;
      // Read on every call: edits/deletions must beat even a warm lookup cache.
      const nb=await getNotebook(), old=dict&&nb[dict+":"+word];
      if(old&&!old.del&&old.means?.length)
        return {meaning:old.means.map(g.meanToStr||String).join("\n"),reading:old.reading||"",source:"notebook"};
      const hit=cache.get(key);
      if(hit&&now()-hit.at<ttl){cache.delete(key);cache.set(key,hit);return {...hit.value};}
      if(pending.has(key))return pending.get(key);
      const task=(async()=>{
        const value=await translate(word,language);
        if(!value?.meaning?.trim())throw Error("Chưa lấy được nghĩa. Kiểm tra mạng và thử lại.");
        cache.set(key,{value,at:now()});
        while(cache.size>max)cache.delete(cache.keys().next().value);
        return {...value};
      })();
      pending.set(key,task);
      try{return await task;}finally{pending.delete(key);}
    }
    return {lookup};
  }
  g.NeutronReaderLookup={create};
})(globalThis);
