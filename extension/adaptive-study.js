/* RaKuLanG adaptive workload and prospective FSRS estimates.
 * FSRS state is per route. Existing due dates remain unchanged until a review.
 * Default rollout is shadow: record predictions before outcomes, use them for
 * queue ordering, and keep the existing scheduler until the learner enables FSRS.
 */
(function(g){
"use strict";
const DAY=86400000, DEFAULT_COST={nhin:12000,nghe:30000,dien:25000,grammar:45000};
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=v=>JSON.parse(JSON.stringify(v));
function dateKey(now=Date.now()){const d=new Date(now);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function uid(){return g.crypto?.randomUUID?.()||Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)+"-"+Math.random().toString(36).slice(2);}
function recordMerge(a,b){
  const r={...a};
  for(const [id,e] of Object.entries(b||{})){
    const old=r[id];
    if(!old || finite(e.undoAt)>finite(old.undoAt) || (finite(e.undoAt)===finite(old.undoAt)&&JSON.stringify(e)>JSON.stringify(old))) r[id]=e;
  }
  return r;
}
function normal(s){s=s||{};return {v:1,prefs:{minutes:10,adaptive:true,mode:"shadow",...(s.prefs||{})},plans:{...(s.plans||{})}};}
function merge(a,b){
  const x=normal(a),y=normal(b);
  const prefs=finite(y.prefs.ts)>finite(x.prefs.ts)?y.prefs:x.prefs;
  const plans={...x.plans};
  for(const[k,p]of Object.entries(y.plans))if(!plans[k]||finite(p.ts)>finite(plans[k].ts)||(p.ts===plans[k].ts&&p.goalMs<plans[k].goalMs))plans[k]=p;
  return {v:1,prefs:{...prefs},plans};
}
function allEvents(items){
  const out=new Map();
  for(const it of items||[])for(const e of Object.values(it.reviewLog||{}))if(e&&e.id&&!e.undoAt&&Number.isFinite(e.at))out.set(e.id,e);
  return [...out.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
function stats(events,now=Date.now()){
  const days={},costs={};
  for(const e of events){
    if(e.undoAt||e.at>now+300000)continue;
    const key=e.day||dateKey(e.at),d=days[key]||(days[key]={ms:0,n:0,correct:0,delayed:0,recalled:0,newRoutes:new Set(),routes:{},first:e.at});
    d.ms+=clamp(finite(e.activeMs),0,180000);d.n++;d.correct+=e.correct?1:0;d.first=Math.min(d.first,e.at);
    d.routes[e.cardKey]=(d.routes[e.cardKey]||0)+1;
    if(e.isNew)d.newRoutes.add(e.cardKey);
    if(e.lagDays>=1&&!e.hinted){d.delayed++;d.recalled+=e.correct?1:0;}
    if(e.activeMs>=1000&&e.activeMs<=180000)(costs[e.route]||(costs[e.route]=[])).push(e.activeMs);
  }
  const cost={...DEFAULT_COST};
  for(const[k,v]of Object.entries(costs)){const a=v.slice(-80).sort((a,b)=>a-b);if(a.length>=5)cost[k]=clamp(a[Math.floor(a.length/2)],5000,90000);}
  return {days,cost,today:days[dateKey(now)]||{ms:0,n:0,newRoutes:new Set(),routes:{}}};
}
function plan(state,events,now=Date.now()){
  const s=normal(state),key=dateKey(now),st=stats(events,now);
  if(s.plans[key])return {state:s,plan:s.plans[key],stats:st};
  const old=Object.entries(s.plans).filter(([k])=>k<key).sort(([a],[b])=>a.localeCompare(b)).slice(-14);
  const baseline=clamp(finite(s.prefs.minutes,10),3,60)*60000;
  const prev=old.at(-1)?.[1];
  let goal=prev&&prev.prefTs===finite(s.prefs.ts)?prev.goalMs:baseline;
  let lastIncrease=finite(prev?.lastIncrease,now);
  if(s.prefs.adaptive!==false&&old.length>=3){
    const recent=old.slice(-3).map(([k,p])=>({p,d:st.days[k]}));
    const comfortable=recent.every(({p,d})=>d&&d.ms>=p.goalMs&&(!d.delayed||d.recalled/d.delayed>=0.85)&&d.ms<=p.goalMs*1.6);
    const overloaded=recent.filter(({p,d})=>p.offered&&d&&d.ms>=p.goalMs*.25&&d.ms<p.goalMs*.7).length>=2;
    if(comfortable&&now-lastIncrease>=7*DAY){goal*=1.05;lastIncrease=now;}
    else if(overloaded)goal*=.85;
  }
  goal=Math.round(clamp(goal,3*60000,Math.min(60*60000,baseline*1.5))/1000)*1000;
  const p={day:key,goalMs:goal,ts:now,lastIncrease,prefTs:finite(s.prefs.ts),offered:false};
  s.plans[key]=p;
  return {state:s,plan:p,stats:st};
}
function cardKey(it){return it._d==="grammar"?"grammar|"+(it._grammar?.cau||it.key):it.key+"|"+(it._d||"nhin");}
function newRoute(it){const d=it.duong?.[it._d||"nhin"];return it._d==="grammar"?!it._grammar?.tsDau:!(d?.ts||d?.lv>=0||(it._d==="nhin"&&it.srs?.lv>=0));}
let engines={};
function engine(route){
  if(!g.FSRS)return null;
  // Begin at 90% for every route; measure outcomes before tuning retention.
  const retention=.90;
  return engines[route]||(engines[route]=g.FSRS.fsrs({request_retention:retention,maximum_interval:365,enable_fuzz:false,enable_short_term:true,learning_steps:[],relearning_steps:[]}));
}
function modelCard(d,now=Date.now()){
  if(d?.fsrs?.card){const c=copy(d.fsrs.card);c.due=new Date(c.due);if(c.last_review)c.last_review=new Date(c.last_review);return c;}
  if(!g.FSRS)return null;
  const c=g.FSRS.createEmptyCard(new Date(now));
  // An explicit bootstrap estimate, not invented historical review events.
  const interval=g.Srs?.ngayCua(d)||0;
  if(interval>0&&d?.ts>0&&d.ts<=now){Object.assign(c,{stability:interval,difficulty:5,state:g.FSRS.State.Review,last_review:new Date(d.ts),due:new Date(d.due||now),scheduled_days:interval,reps:1});}
  return c;
}
function prediction(d,route,now=Date.now()){
  const e=engine(route),c=modelCard(d,now);
  if(e&&c?.stability>0)return clamp(e.get_retrievability(c,new Date(now),false),0,1);
  const interval=g.Srs?.ngayCua(d)||0;
  if(!interval||!d?.ts)return 0;
  return Math.pow(.9,Math.max(0,now-d.ts)/(DAY*interval));
}
function priority(it,route=it._d,now=Date.now()){
  if(route==="grammar")return .25+Math.min(.5,Math.max(0,now-(it._grammar?.tsDau||now))/DAY/100);
  const d=it.duong?.[route]||(route==="nhin"?it.srs:null);
  return 1-prediction(d,route,now);
}
function order(queue,now=Date.now()){
  return queue.slice().sort((a,b)=>Number(newRoute(a))-Number(newRoute(b))||priority(b,b._d,now)-priority(a,a._d,now)||cardKey(a).localeCompare(cardKey(b)));
}
function select(queue,state,events,now=Date.now(),extra=false){
  const p=plan(state,events,now),{today,cost}=p.stats;
  const left=extra?180000:Math.max(0,p.plan.goalMs-today.ms);
  const budget=Math.min(180000,left),reserve=budget*.2;
  const sorted=order(queue,now),reviews=sorted.filter(it=>!newRoute(it));
  const backlogCost=reviews.reduce((s,it)=>s+(cost[it._d]||20000),0);
  const newLimit=extra?3:backlogCost>left?0:Math.max(0,Math.min(5,Math.floor(p.plan.goalMs/120000))-today.newRoutes.size);
  const seen=new Set(),seenWords=new Set(),selected=[];let used=0,introduced=0;
  for(const it of sorted){
    const k=cardKey(it);if(seen.has(k)||seenWords.has(it.key)||(today.routes[k]||0)>=2)continue;
    if(newRoute(it)&&introduced>=newLimit)continue;
    const c=cost[it._d]||20000;
    if(used+c>budget-reserve&&selected.length)continue;
    if(!budget)break;
    selected.push(it);seen.add(k);seenWords.add(it.key);used+=c;if(newRoute(it))introduced++;
    if(selected.length>=20||used>=budget-reserve)break;
  }
  p.plan={...p.plan,offered:p.plan.offered||sorted.reduce((n,it)=>n+(cost[it._d]||20000),0)>=left};
  p.state.plans[p.plan.day]=p.plan;
  return {...p,queue:selected,remaining:sorted.length-selected.length,estimateMs:used,budgetMs:budget};
}
let clock=null;
function tick(){
  if(!clock)return;
  const now=Date.now(),delta=now-clock.last;
  if(clock.visible&&!clock.paused&&delta>=0&&delta<180000)clock.ms+=delta;
  clock.last=now;
}
function startClock(it){
  if(!it)return;
  const key=cardKey(it);if(clock?.key===key)return;
  clock={key,last:Date.now(),ms:0,visible:!g.document?.hidden,paused:false};
}
function pauseClock(paused){tick();if(clock){clock.paused=paused;if(paused)clock.hinted=true;}}
if(g.document)g.document.addEventListener("visibilitychange",()=>{tick();if(clock)clock.visible=!g.document.hidden;});
function takeMetrics(key){tick();const match=clock?.key===key;const result={activeMs:Math.round(clamp(match?clock.ms:0,0,180000)),hinted:!!(match&&clock.hinted)};clock=null;return result;}
function takeClock(key){return takeMetrics(key).activeMs;}
function appendReview(old,event){
  const at=event.at||Date.now(),id=uid();
  const e={...event,id,at,day:dateKey(at)};
  return {log:{...(old||{}),[id]:e},event:e};
}
function undoReview(log,id,now=Date.now()){if(!id||!log?.[id])return log;return {...log,[id]:{...log[id],undoAt:now}};}
function observe(old,result,correct,route,now=Date.now(),mode="shadow"){
  const e=engine(route);if(!e)return result;
  const c=modelCard(old,now),r=prediction(old,route,now);
  const next=e.next(c,new Date(now),correct?g.FSRS.Rating.Good:g.FSRS.Rating.Again);
  const card=copy(next.card),d={...result.duong,fsrs:{version:"6",library:"ts-fsrs@5.2.3",card,bootstrap:!old?.fsrs&&!!old?.ts,mode}};
  if(mode==="fsrs"){
    const days=Math.max(1/1440,(+new Date(card.due)-now)/DAY);
    d.ngay=Math.min(365,days);d.lv=g.Srs.capTu(d.ngay);d.due=+new Date(card.due);
    result={...result,ngay:d.ngay};
  }
  return {...result,duong:d,modelLog:{prediction:r,log:copy(next.log),mode}};
}
function summary(state,events,now=Date.now()){const p=plan(state,events,now);return {goalMs:p.plan.goalMs,doneMs:p.stats.today.ms,done:p.stats.today.ms>=p.plan.goalMs,minutes:Math.ceil(Math.max(0,p.plan.goalMs-p.stats.today.ms)/60000)};}
function reminderTimes(events,state,now=Date.now()){
  const p=summary(state,events,now);if(p.done)return [];
  const days=stats(events,now).days,all=Object.values(days).sort((a,b)=>a.first-b.first);
  const last=all.at(-1)?.first;
  if(last&&now-last>7*DAY)return [];
  let hour=12;
  if(last){const d=new Date(last+23.5*3600000);hour=d.getHours()+d.getMinutes()/60;}
  hour=clamp(hour,9,18.5);
  const jitter=(Array.from(dateKey(now)).reduce((s,c)=>s+c.charCodeAt(0),0)%31-15)/60;
  const slots=[hour+jitter,Math.max(hour+3,16),21.5];
  const times=[];
  for(let i=0;i<slots.length;i++){
    const d=new Date(now);d.setHours(Math.floor(slots[i]),Math.round(slots[i]%1*60),0,0);
    if(d.getHours()<9||d.getHours()>21||+d<=now||times.some(t=>Math.abs(+d-t.at)<3*3600000))continue;
    times.push({at:+d,kind:i});
  }
  return times;
}
g.AdaptiveStudy={DAY,DEFAULT_COST,dateKey,uid,recordMerge,normal,merge,allEvents,stats,plan,cardKey,newRoute,prediction,priority,order,select,startClock,pauseClock,takeClock,takeMetrics,appendReview,undoReview,observe,summary,reminderTimes};
})(typeof self!=="undefined"?self:globalThis);
