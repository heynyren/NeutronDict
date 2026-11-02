/* Shared, localized study-plan controls; no network or model calls. */
(function(g){
"use strict";
const rows=[
["{n} bài","{n} exercises","{n}問"],
["{done}/{goal} bài · tối đa khoảng {minutes} phút","{done}/{goal} exercises · up to about {minutes} minutes","{done}/{goal}問 · 最大約{minutes}分"],
["Hoàn thành kế hoạch hôm nay để giữ chuỗi {days} ngày.","Finish today’s plan to keep your {days}-day streak.","今日のプランを終えて{days}日連続を続けましょう。"],
["Còn khoảng {n} phút","About {n} minutes left","残り約{n}分"],
["Điều chỉnh kế hoạch trong tab Học.","Adjust your plan in the Study tab.","学習タブでプランを調整できます。"],
["Kế hoạch hôm nay","Today's plan","今日の学習プラン"],
["{done}/{goal} phút · còn khoảng {left} phút","{done}/{goal} minutes · about {left} minutes left","{done}/{goal}分 · 残り約{left}分"],
["Đã xong kế hoạch hôm nay","Today's plan is complete","今日のプランは完了です"],
["Giảm hôm nay","Lighter today","今日は軽めに"],
["Học thêm 3 phút","Study 3 more minutes","あと3分学習"],
["Mỗi chặng khoảng 3 phút. Bài còn chờ vẫn nằm trong sổ tay.","Each round takes about 3 minutes. Remaining reviews stay in your notebook.","1回約3分。残りの復習はノートに保存されています。"],
["Điều chỉnh kế hoạch","Adjust plan","プランを調整"],
["Thời gian cơ sở mỗi ngày","Daily starting duration","1日の基本学習時間"],
["{n} phút","{n} minutes","{n}分"],
["Tự điều chỉnh theo sức học","Adapt to my learning pace","学習ペースに合わせて調整"],
["Lịch ôn mới (thử nghiệm)","New review schedule (experimental)","新しい復習スケジュール（試験運用）"],
["Bật để áp dụng lịch mới sau mỗi lần trả lời. Lịch đã hẹn và các đường đóng băng được giữ nguyên.","Apply the new schedule after each answer. Existing appointments and frozen routes are preserved.","回答後から新しい間隔を適用します。既存の予定と停止中の学習経路は維持されます。"],
["Hôm nay đã đủ. Bạn có thể chọn Học thêm 3 phút.","Enough for today. You can choose Study 3 more minutes.","今日はここまで。必要なら「あと3分学習」を選べます。"],
["Các bài này đã luyện đủ hôm nay. Hãy quay lại ngày mai.","These cards have had enough practice today. Come back tomorrow.","これらのカードは今日は十分練習しました。また明日復習しましょう。"],
["Đã xong chặng học","Study round complete","今回の学習は完了です"],
["Nhắc học tự động","Automatic study reminders","自動学習リマインダー"],
["App tự chọn giờ phù hợp, tối đa 3 lời nhắc/ngày khi chưa hoàn thành. Im lặng từ 21:30 đến 09:00.","The app chooses suitable times, up to 3 reminders/day until completion. Quiet hours: 21:30–09:00.","アプリが時刻を選び、未完了の日は最大3回通知します。21:30〜09:00は通知しません。"],
["Đã bật nhắc học tự động.","Automatic reminders enabled.","自動リマインダーを有効にしました。"],
["Hãy cho phép thông báo trong cài đặt điện thoại.","Allow notifications in your phone settings.","端末の設定で通知を許可してください。"],
["Gấu rủ bạn học 🐻","Your bear invites you to study 🐻","くまから学習のお誘い 🐻"],
["Có vài từ đang chờ bạn. Làm một chặng ngắn nhé?","Some words are waiting. Ready for a short round?","復習する単語があります。少しだけ学習しませんか？"],
["Gấu quay lại rồi đây 👀 Hai phút ôn bài nào!","Your bear is back 👀 Time for two minutes of review!","くまが戻ってきたよ 👀 2分だけ復習しよう！"],
["Hôm nay mình chưa học xong cùng nhau. Thử một chặng ngắn nhé?","We haven't finished today. Try a short round together?","今日はまだ終わっていません。一緒に少し学習しませんか？"],
["Chưa lưu được kế hoạch. Hãy thử lại.","Couldn't save the plan. Please try again.","プランを保存できませんでした。もう一度お試しください。"]
];
g.CHU_BANG=g.CHU_BANG||{en:{},ja:{}};
for(const[v,en,ja]of rows){g.CHU_BANG.en[v]=en;g.CHU_BANG.ja[v]=ja;}
const t=s=>g.Chu?.T?g.Chu.T(s):g.T?g.T(s):s;
const t2=(s,args)=>t(s).replace(/\{(\w+)\}/g,(_,k)=>args[k]??"");
function mount(host,api){
 if(!host)return;
 let seq=0;
 async function refresh(){
  const n=++seq;
  const snap=await api.read();if(n!==seq)return;
  const summary=g.AdaptiveStudy.summary(snap.state,snap.events);
  const wasOpen=!!host.querySelector("details")?.open;
  host.replaceChildren();host.className="card";host.style.cssText="padding:14px;margin:12px 0";
  function el(tag,text,cls,parent=host){const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;parent.appendChild(x);return x;}
  el("strong",t("Kế hoạch hôm nay"));
  const status=el("div",summary.done?t("Đã xong kế hoạch hôm nay"):t2("{done}/{goal} phút · còn khoảng {left} phút",{done:Math.floor(summary.doneMs/60000),goal:Math.round(summary.goalMs/60000*10)/10,left:summary.minutes}),"t-small muted");
  if(!summary.done&&summary.goalCards)status.textContent=t2("{done}/{goal} bài · tối đa khoảng {minutes} phút",{done:summary.completedCards,goal:summary.goalCards,minutes:summary.minutes});
  status.style.margin="6px 0";status.setAttribute("aria-live","polite");
  const actions=el("div","","rowx wrap");
  const button=(label,fn)=>{const b=el("button",t(label),"btn sm",actions);b.type="button";b.onclick=async()=>{b.disabled=true;try{await fn();await refresh();}catch{status.textContent=t("Chưa lưu được kế hoạch. Hãy thử lại.");}finally{b.disabled=false;}};return b;};
  button("Giảm hôm nay",()=>api.change(s=>{const p=g.AdaptiveStudy.plan(s,snap.events);p.state.plans[p.plan.day]={...p.plan,goalMs:Math.max(180000,Math.round(p.plan.goalMs*.75)),goalCards:p.plan.goalCards?Math.max(1,Math.floor(p.plan.goalCards*.75)):undefined,ts:Math.max(Date.now(),(p.plan.ts||0)+1)};return p.state;}));
  button("Học thêm 3 phút",()=>api.startExtra());
  el("p",t("Mỗi chặng khoảng 3 phút. Bài còn chờ vẫn nằm trong sổ tay."),"t-tiny muted");
  const details=el("details"),caption=el("summary",t("Điều chỉnh kế hoạch"),"",details);details.open=wasOpen;
  caption.style.cursor="pointer";
  const field=el("label",t("Thời gian cơ sở mỗi ngày"),"t-small",details);
  field.style.cssText="display:block;margin-top:10px";
  const minutes=el("select","","",field);minutes.style.marginLeft="8px";
  const prefs=g.AdaptiveStudy.normal(snap.state).prefs;
  for(const v of [3,5,10,15,30,60]){const option=el("option",t2("{n} phút",{n:v}),"",minutes);option.value=v;}
  minutes.value=String(prefs.minutes);
  async function changePref(key,value){try{await api.change(s=>{const n=g.AdaptiveStudy.normal(s);n.prefs={...n.prefs,[key]:value,ts:Math.max(Date.now(),(n.prefs.ts||0)+1)};const day=g.AdaptiveStudy.dateKey();if(key==="mode"&&n.plans[day])n.plans[day]={...n.plans[day],prefTs:n.prefs.ts,ts:n.prefs.ts};return n;});await refresh();}catch{status.textContent=t("Chưa lưu được kế hoạch. Hãy thử lại.");}}
  minutes.onchange=()=>changePref("minutes",Number(minutes.value));
  function checkbox(label,checked,fn){const l=el("label","","t-small",details);l.style.cssText="display:flex;gap:8px;align-items:center;margin-top:10px";const b=el("input","","",l);b.type="checkbox";b.checked=checked;el("span",t(label),"",l);b.onchange=()=>fn(b.checked);}
  checkbox("Tự điều chỉnh theo sức học",prefs.adaptive!==false,v=>changePref("adaptive",v));
  checkbox("Lịch ôn mới (thử nghiệm)",prefs.mode==="fsrs",v=>changePref("mode",v?"fsrs":"shadow"));
  el("p",t("Bật để áp dụng lịch mới sau mỗi lần trả lời. Lịch đã hẹn và các đường đóng băng được giữ nguyên."),"t-tiny muted",details);
 }
 const handle={refresh};
 refresh().catch(()=>{});
 return handle;
}
g.StudyPlanUI={mount,t,t2};
})(typeof self!=="undefined"?self:globalThis);
