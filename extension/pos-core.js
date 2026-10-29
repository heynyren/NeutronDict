/* IPADIC labels from Kuromoji; offsets always refer to the unchanged source UTF-16 text. */
(function(g){
  const labels={noun:"Danh từ",verb:"Động từ",adjective:"Tính từ",adverb:"Trạng từ",
    pronoun:"Đại từ",conjunction:"Liên từ",particle:"Trợ từ / trợ động từ",other:"Khác"};
  function kind(t){
    if(t.pos==="名詞"&&t.pos_detail_1==="代名詞")return "pronoun";
    if(t.pos==="名詞"&&t.pos_detail_1==="形容動詞語幹")return "adjective";
    return ({"名詞":"noun","動詞":"verb","形容詞":"adjective","連体詞":"adjective","副詞":"adverb",
      "接続詞":"conjunction","助詞":"particle","助動詞":"particle"})[t.pos]||"other";
  }
  function ranges(text,tokens){
    const result=[];let cursor=0;
    for(const t of tokens){
      const word=t.surface_form;if(!word)continue;
      const start=text.indexOf(word,cursor);
      if(start<0)continue;
      const end=start+word.length;
      result.push({start,end,pos:kind(t),base:t.basic_form==="*"?"":t.basic_form,reading:t.reading==="*"?"":t.reading});
      cursor=end;
    }
    return result;
  }
  g.NeutronPos={labels,kind,ranges};
})(globalThis);
