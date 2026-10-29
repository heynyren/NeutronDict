/* Grammar is a Study route. Its sentence-keyed history remains sync-compatible. */
(function(g){
"use strict";
let history={},videoStore={};
function hydrate(h,v){history=h || {};videoStore=v || {};}
function queue(items,now){
  const active=items.filter(it=>!it.del&&!it.dongBang);
  const byKey=new Map(active.map(it=>[it.key,it]));
  return g.NguPhap.danhSach(g.NguPhap.boSungTuKho(active,videoStore))
    .filter(q=>g.NguPhapSrs.denHan(history[g.NguPhapSrs.khoa(q.cau)],now))
    .map(q=>({...byKey.get(q.key),key:q.key,_d:"grammar",_grammar:{...q,
      tsDau:history[g.NguPhapSrs.khoa(q.cau)]?.ts || 0,onId:Date.now()+":"+Math.random().toString(36).slice(2)}}));
}
function remember(q,result){if(result)history[g.NguPhapSrs.khoa(q.cau)]=result;}
function render(host,it,api){
  host.replaceChildren();
  const q=it._grammar; let selected=[],done=false,saving=false,failed=false,shown=false;
  const add=(tag,cls,text,parent=host)=>{const x=document.createElement(tag);x.className=cls;x.textContent=text;parent.appendChild(x);return x;};
  add("div","eyebrow","NGỮ PHÁP · GHÉP CÂU");
  add("p","t-small muted","Ghép tối đa 4 mảnh thành câu gốc. Đúng một lần là đóng băng riêng câu này.");
  add("p","t-small","Từ đã lưu: "+q.tu);
  const answer=add("div","np-pieces np-answer",""),options=add("div","np-pieces","");
  const feedback=add("p","np-feedback","");feedback.setAttribute("role","status");
  const result=add("div","np-result","");result.hidden=true;
  const actions=add("div","rowx wrap","");
  const button=(label,fn,parent=actions,cls="btn")=>{const b=add("button",cls,label,parent);b.type="button";b.onclick=fn;return b;};
  const check=button("Kiểm tra",()=>submit(false),actions,"btn primary");
  const reveal=button("Xem câu gốc",()=>submit(true));
  const next=button("Tiếp",()=>api.next({correct:!shown,retry:shown&&!it._grammarRetry}));next.hidden=true;
  function paint(){
    answer.replaceChildren();options.replaceChildren();
    if(!selected.length)add("span","np-placeholder","Chạm các mảnh theo thứ tự",answer);
    for(const id of selected)button(q.manh[id].text.trim(),()=>{selected=selected.filter(x=>x!==id);paint();},answer,"np-piece").disabled=done||saving;
    for(const p of q.xao)if(!selected.includes(p.id))button(p.text.trim(),()=>{selected.push(p.id);paint();},options,"np-piece").disabled=done||saving;
    check.disabled=saving||(!failed&&selected.length!==q.manh.length);
    reveal.disabled=saving;next.disabled=saving;
  }
  async function submit(show){
    if(saving||done)return;
    if(!show&&selected.map(id=>q.manh[id].text).join("")!==q.cau){
      feedback.textContent="Chưa đúng. Hãy đổi thứ tự các mảnh rồi thử lại.";return;
    }
    saving=true;paint();shown=show;
    try{
      const saved=await api.record(q,show?"xem":"dung",!show||!!it._grammarRetry);
      if(!saved&&!show)throw new Error("Câu đã thay đổi. Hãy mở lại buổi học.");
      remember(q,saved);done=true;failed=false;
      feedback.textContent=show?"Xem đáp án chưa tính là thuộc.":"Đúng rồi — câu này đã đóng băng.";
      result.hidden=false;add("div","np-original",q.cau,result);
      const translation=add("div","np-translation",q.nghia||"Đang dịch…",result);
      if(!q.nghia)Promise.resolve(api.translate(q.cau)).then(t=>{if(translation.isConnected)translation.textContent=t||"Chưa lấy được bản dịch.";}).catch(()=>{translation.textContent="Chưa lấy được bản dịch.";});
      check.hidden=reveal.hidden=true;next.hidden=false;
    }catch(err){failed=true;feedback.textContent="Chưa lưu được: "+err.message+" Bấm Kiểm tra để thử lại.";}
    finally{saving=false;paint();}
  }
  paint();
}
g.StudyGrammar={hydrate,queue,remember,render};
})(typeof self!=="undefined"?self:this);
