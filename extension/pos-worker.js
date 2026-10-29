importScripts("vendor/kuromoji/build/kuromoji.js","pos-core.js");
let tokenizer;
const cache=new Map();
function ready(){
  return tokenizer ||= new Promise((resolve,reject)=>{
    kuromoji.builder({dicPath:"/vendor/kuromoji/dict/"}).build((error,value)=>{
      if(error){tokenizer=null;reject(error);}else resolve(value);
    });
  });
}
self.onmessage=async({data})=>{
  try{
    const analyzer=await ready();
    const rows=data.rows.map(row=>{
      let tokens=cache.get(row.text);
      if(!tokens){tokens=NeutronPos.ranges(row.text,analyzer.tokenize(row.text));cache.set(row.text,tokens);}
      else {cache.delete(row.text);cache.set(row.text,tokens);}
      while(cache.size>300)cache.delete(cache.keys().next().value);
      return {id:row.id,text:row.text,tokens};
    });
    postMessage({id:data.id,ok:true,rows});
  }catch(e){postMessage({id:data.id,ok:false,error:String(e.message||e)});}
};
