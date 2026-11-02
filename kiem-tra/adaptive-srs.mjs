import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const g={console,Date,Math,Map,Set,JSON,crypto:globalThis.crypto};g.self=g;g.window=g;
vm.createContext(g);
for(const name of ["vendor/ts-fsrs.js","srs.js","adaptive-study.js","muc.js","tien-do.js"])vm.runInContext(fs.readFileSync("extension/"+name,"utf8"),g,{filename:name});
const A=g.AdaptiveStudy,S=g.Srs,D=86400000,now=+new Date(2026,10,2,10);
const day=A.dateKey(now);
let checks=0;
function ok(value,msg){assert.ok(value,msg);checks++;}
const strong={lv:4,ngay:30,due:now-D,ts:now-32*D};
const weak={lv:1,ngay:3,due:now-D,ts:now-4*D};
ok(A.prediction(weak,"nghe",now)<A.prediction(strong,"nhin",now),"Risk reflects elapsed time relative to memory stability");
const legacy=S.cham(strong,true,5000,null,now,"nhin",.5);
const shadow=A.observe(strong,legacy,true,"nhin",now,"shadow");
assert.equal(shadow.duong.due,legacy.duong.due);checks++;
ok(shadow.duong.fsrs.card.stability>0,"Prospective FSRS state is persisted without rescheduling legacy due dates");
const active=A.observe(strong,legacy,true,"nhin",now,"fsrs");
ok(active.duong.due>now&&Number.isFinite(active.duong.due),"FSRS opt-in schedules valid intervals");
ok(active.duong.reviewId===undefined,"Review identity belongs to the committed event, not the model");
const items=[
 {key:"A",word:"A",_d:"nhin",duong:{nhin:strong}},
 {key:"A",word:"A",_d:"nghe",duong:{nghe:weak}},
 {key:"B",word:"B",_d:"nhin",duong:{nhin:{...strong,ngay:60}}},
];
const selected=A.select(items,{},[],now);
assert.equal(selected.queue[0]._d,"nghe");checks++;
ok(selected.estimateMs<=180000,"Round has a finite time budget");
const rec=A.appendReview({}, {at:now,cardKey:"A|nghe",route:"nghe",correct:false,activeMs:10000});
const rec2=A.appendReview(rec.log,{at:now+1,cardKey:"A|nghe",route:"nghe",correct:false,activeMs:10000});
const filtered=A.select([items[1]],{},Object.values(rec2.log),now+2);
assert.equal(filtered.queue.length,0,"Two attempts are a persistent daily limit");checks++;
ok(A.select([items[1]],{},Object.values(rec2.log),now+D).queue.length===1,"Daily limit resets on the next local day");
const undone=A.undoReview(rec2.log,rec2.event.id,now+3);
const merged=g.Muc.tron({A:{ts:1,reviewLog:undone}},{A:{ts:2,reviewLog:rec2.log}});
assert.equal(merged.A.reviewLog[rec2.event.id].undoAt,now+3);checks++;
const other=A.appendReview({}, {at:now,cardKey:"B|nhin",route:"nhin",correct:true,activeMs:15000});
const union=g.Muc.tron({A:{ts:1,reviewLog:rec.log}},{A:{ts:2,reviewLog:other.log}});
assert.equal(Object.keys(union.A.reviewLog).length,2,"Offline events from both devices survive");checks++;
const done=[{id:"done",at:now,day,cardKey:"X|nhin",route:"nhin",activeMs:180000},{id:"done2",at:now,day,cardKey:"Y|nhin",route:"nhin",activeMs:180000},{id:"done3",at:now,day,cardKey:"Z|nhin",route:"nhin",activeMs:180000},{id:"done4",at:now,day,cardKey:"Q|nhin",route:"nhin",activeMs:60000}];
assert.equal(A.select(items,{},done,now).queue.length,0,"Complete target stops normal rounds");checks++;
ok(A.select(items,{},done,now,true).queue.length>0,"Extra round remains an explicit option");
assert.equal(A.reminderTimes(done,{},now).length,0,"No reminders after completion");checks++;
const times=A.reminderTimes([],{},now);
ok(times.length>=2&&times.length<=3,"Automatic schedule needs no preferred time");
for(let i=0;i<times.length;i++){
 const t=new Date(times[i].at);
 ok(t.getHours()>=9&&(t.getHours()<21||t.getMinutes()<=30),"Quiet hours respected");
 if(i)ok(times[i].at-times[i-1].at>=3*3600000,"Reminders separated by three hours");
}
assert.equal(A.reminderTimes([{id:"old",at:now-8*D,activeMs:10000,route:"nhin"}],{},now).length,0);checks++;
const frozen={word:"word",duong:{nhin:strong},dongBang:true};
assert.deepEqual(Array.from(S.denHan(frozen,now)),[]);checks++;
const future={word:"word",duong:{nhin:strong},lichRieng:{nhin:{hen:now+D,ts:now}}};
assert.deepEqual(Array.from(S.denHan(future,now)),[]);checks++;
const hoc=g.TienDo.tron({study:{plans:{[day]:{goalMs:600000,ts:1}},prefs:{minutes:10,ts:1}}},{study:{plans:{[A.dateKey(now-D)]:{goalMs:500000,ts:2}},prefs:{minutes:5,ts:2}}});
assert.equal(hoc.study.prefs.minutes,5);checks++;
assert.equal(Object.keys(hoc.study.plans).length,2);checks++;
const backlog=Array.from({length:80},(_,i)=>({...items[0],key:"old"+i}));
const fresh={key:"new",word:"new",_d:"nhin"};
ok(A.select([...backlog,fresh],{},[],now).queue.every(x=>x.key!=="new"),"Old backlog limits new activation without deleting saved words");
for(const name of ["adaptive-study.js","study-plan-ui.js","srs.js","muc.js","tien-do.js","vendor/ts-fsrs.js"]){
 assert.equal(fs.readFileSync("extension/"+name,"utf8"),fs.readFileSync("android/www/"+name,"utf8"),"Shared core identical: "+name);checks++;
}

const tiny=A.select([fresh],{},[],now);
assert.equal(tiny.plan.goalCards,1);checks++;
const tinyDone=[{id:"tiny",at:now,day,cardKey:"new|nhin",route:"nhin",activeMs:5000,isNew:true}];
ok(A.summary(tiny.state,tinyDone,now).done,"A short available workload completes without ten minutes of filler");
assert.equal(A.reminderTimes(tinyDone,tiny.state,now).length,0);checks++;
assert.equal(new Set(selected.queue.map(x=>x.key)).size,selected.queue.length,"One word per round");checks++;
const changed=A.merge(tiny.state,{prefs:{minutes:5,ts:now+1}});
assert.equal(A.plan(changed,[],now+2).plan.goalMs,300000,"New preferences invalidate a stale synced plan");checks++;
const reset={...weak,reviewReset:true,reviewedAt:0,lv:-1};
ok(A.newRoute({key:"A",_d:"nghe",duong:{nghe:reset}}),"Undo of first review remains new");
const plain=S.cham({lv:4},true,1000,null,now,"nhin",.5);
assert.equal(A.observe({lv:4},plain,true,"nhin",now,"fsrs").duong.due,plain.duong.due,"Missing historical timestamps preserve mature legacy interval on migration");checks++;
const history={prefs:{minutes:10,ts:1},plans:{}},easy=[];
for(let i=3;i>=1;i--){
 const at=now-i*D,k=A.dateKey(at);
 history.plans[k]={goalMs:600000,ts:at,prefTs:1,lastIncrease:now-9*D,offered:true};
 for(let j=0;j<4;j++)easy.push({id:i+"-"+j,at,day:k,cardKey:i+"-"+j,route:"nhin",activeMs:150000,correct:true,lagDays:2});
}
assert.equal(A.plan(history,easy,now).plan.goalMs,630000,"Comfortable days grow only five percent per week");checks++;
const hard=easy.filter(x=>x.id.endsWith("-0"));
assert.equal(A.plan(history,hard,now).plan.goalMs,510000,"Repeated partial completion reduces the following target");checks++;
const noOffer=JSON.parse(JSON.stringify(history));for(const p of Object.values(noOffer.plans))p.offered=false;
assert.equal(A.plan(noOffer,hard,now).plan.goalMs,600000,"Insufficient content is not mistaken for overload");checks++;
const prefA={prefs:{minutes:3,ts:2}},prefB={prefs:{minutes:5,ts:2}};
assert.equal(JSON.stringify(A.merge(prefA,prefB)),JSON.stringify(A.merge(prefB,prefA)),"Equal-clock preference conflicts converge");checks++;

const tomb=g.Muc.biaMo({word:"A",dict:"javi",reviewLog:rec.log,duong:{nghe:weak}});
assert.equal(A.allEvents([tomb]).length,1,"Deleting a word preserves completed effort");checks++;
assert.equal(tomb.duong,undefined,"Deleting still clears SRS state");checks++;
const mergedPlan=A.merge({plans:{[day]:{goalMs:600000,ts:1}}},selected.state);
assert.equal(mergedPlan.plans[day].goalCards,selected.plan.goalCards,"Plan workload survives a stale counter sync");checks++;

const multi={key:"A",word:"A",dict:"javi",means:["nghĩa"],cauNghe:{cau:"これはAです。",dich:"Đây là A."},duong:{nhin:strong,nghe:weak}};
assert.equal(S.denHan(multi,now)[0],"nghe","Unseen cloze route cannot hide a weak listening review");checks++;
assert.equal(A.order([{key:"fresh",_d:"dien"},{key:"fresh",_d:"nhin"}],now)[0]._d,"nhin","A new word starts with recognition when both routes are unseen");checks++;
console.log("Adaptive SRS:",checks,"checks passed");



