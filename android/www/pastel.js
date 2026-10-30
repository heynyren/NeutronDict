/* RaKuLanG pastel presets. Only a dedicated appearance key is written. */
(function(g){
"use strict";
const presets=[
 {key:"blue",name:"Xanh dương",fill:"#8bd4e6",ink:"#285c6c"},
 {key:"mint",name:"Bạc hà",fill:"#b4e2ce",ink:"#275c48"},
 {key:"rose",name:"Hồng",fill:"#f1c5d6",ink:"#794256"},
 {key:"peach",name:"Đào",fill:"#f6cfb4",ink:"#794a2d"},
 {key:"lavender",name:"Lavender",fill:"#d6cbef",ink:"#584979"},
 {key:"butter",name:"Vàng kem",fill:"#f3e4aa",ink:"#65551d"}
];
const normalize=k=>presets.some(p=>p.key===k)?k:"blue";
const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const mix=(a,b,t)=>"#"+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,"0")).join("");
const media=g.matchMedia?.("(prefers-color-scheme: dark)");
let selected="blue",save=Promise.resolve();
function paint(key,target){
 const p=presets.find(p=>p.key===normalize(key)),el=target||document.documentElement,dark=!!media?.matches;
 const shade=(amount)=>mix(dark?"#0c171e":"#ffffff",p.fill,amount);
 const vars={
  "--bg":shade(dark ? .035:.07),"--surface":shade(dark ? .055:0),
  "--surface-2":shade(dark ? .10:.16),"--surface-3":shade(dark ? .18:.30),
  "--line":shade(dark ? .28:.48),"--line-soft":shade(dark ? .16:.25),
  "--ink":dark?"#edf5f7":"#17313b","--ink-2":dark?"rgba(237,245,247,.78)":"rgba(23,49,59,.76)",
  "--ink-3":dark?"rgba(237,245,247,.64)":"rgba(23,49,59,.65)",
  "--accent":dark?p.fill:p.ink,"--accent-2":dark?mix(p.fill,"#ffffff",.2):p.ink,
  "--accent-ink":"#17313b","--accent-fill":p.fill,"--accent-fill-2":mix(p.fill,"#ffffff",.30),
  "--accent-soft":shade(dark ? .16:.20),"--accent-line":shade(dark ? .35:.60),
  "--sh-accent":"0 4px 14px rgba("+rgb(p.ink).join(",")+",.20)",
  "--grad":p.fill
 };
 for(const [k,v]of Object.entries(vars))el.style.setProperty(k,v);
 el.dataset.pastel=p.key;
 if(el===document.documentElement){
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>{meta.content=vars["--bg"];});
 }
 return p.key;
}
function apply(k){selected=paint(k);document.querySelectorAll('.pastel-picker input').forEach(i=>{i.checked=i.value===selected;});}
async function start(adapter){
 try{selected=normalize(await adapter.read());}catch(_){selected="blue";}
 apply(selected);
 const status=document.getElementById("pastelStatus"),host=document.querySelector(".pastel-picker");
 if(host){
  host.replaceChildren();
  for(const p of presets){
   const label=document.createElement("label");label.className="pastel-choice";
   const input=document.createElement("input");input.type="radio";input.name="pastelTheme";input.value=p.key;input.checked=p.key===selected;
   const swatch=document.createElement("span");swatch.className="pastel-swatch";swatch.style.background=p.fill;swatch.setAttribute("aria-hidden","true");
   const name=document.createElement("span");name.dataset.chu="";name.textContent=p.name;
   label.append(input,swatch,name);host.append(label);
   input.addEventListener("change",()=>{
    const wanted=p.key;apply(wanted);
    if(status)status.textContent=g.T?g.T("Đang lưu màu…"):"Đang lưu màu…";
    save=save.catch(()=>{}).then(()=>adapter.write(wanted)).then(()=>{
      if(selected===wanted&&status)status.textContent=g.T?g.T("Đã lưu màu giao diện."): "Đã lưu màu giao diện.";
    }).catch(()=>{
      if(selected===wanted&&status)status.textContent=g.T?g.T("Chưa lưu được màu. Hãy chọn lại."): "Chưa lưu được màu. Hãy chọn lại.";
    });
   });
  }
  g.Chu?.ve(host);
 }
 g.addEventListener?.("rakulang-language",()=>g.Chu?.ve(host||document));
 if(g.chrome?.storage?.onChanged && location.protocol==="chrome-extension:")g.chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes.pastelTheme)apply(changes.pastelTheme.newValue);});
 media?.addEventListener?.("change",()=>apply(selected));
 return selected;
}
g.RaKuPastel={presets,normalize,paint,apply,start,current:()=>selected};
})(typeof self!=="undefined"?self:this);
