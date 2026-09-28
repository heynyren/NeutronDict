import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const D = 86400000, now = Date.UTC(2026, 8, 28, 12);
const plain = v => JSON.parse(JSON.stringify(v));
function engine(dir) {
  const c = vm.createContext({ console, Intl, Date, Map }); c.self = c; c.window = c;
  for (const f of ["srs.js", "muc.js", "ngu-phap.js"]) vm.runInContext(readFileSync(dir + "/" + f, "utf8"), c);
  return c;
}
for (const dir of ["extension", "android/www"]) {
  const { Srs:S, Muc:M, NguPhapSrs:G } = engine(dir);
  const state = (days, due = now - D) => ({ ngay:days, net:2.1, lv:S.capTu(days), ts:now-10*D, due, sai:0 });
  const item = () => ({ word:"勉強", dict:"javi", ts:now-10*D,
    cauNghe:{cau:"私は毎朝日本語を勉強します。"},
    lien:{dong:[{word:"学習"},{word:"学ぶ"}],trai:[{word:"遊ぶ"}]},
    duong:{ nhin:state(14), nghe:{...state(14, now+10*D), dungHanLien:2, dungHanDau:now-20*D}, dong:state(7), trai:state(7) } });
  const it = item();
  const before = plain(it.duong), point = plain(S.diemTu(it));
  const frozen = S.datLich(it,"nhin","bang",0,now);
  assert(!S.denHan(frozen,now).includes("nhin"));
  assert(S.denHan(frozen,now).includes("dong"));
  assert.deepEqual(plain(frozen.duong),before);
  assert.deepEqual(plain(S.diemTu(frozen)),point);
  assert(S.denHan(S.datLich(frozen,"nhin","mo",0,now+1),now+2).includes("nhin"));
  const postponed = S.datLich(it,"nhin","hen",21,now);
  assert.equal(S.hanDuong(postponed,"nhin"),now+21*D);
  assert(!S.denHan(postponed,now).includes("nhin"));
  assert(S.denHan(postponed,now+21*D).includes("nhin"));
  assert.deepEqual(plain(postponed.duong),before);
  assert.throws(()=>S.datLich(it,"nghe","hen",0,now));
  assert.throws(()=>S.datLich(it,"nghe","hen",NaN,now));
  assert(S.denHan(S.datLich(postponed,"nhin","tuDong",0,now+1),now+2).includes("nhin"));
  const listened = {...it,ts:now+100,duong:{...it.duong,nghe:state(30)}};
  const merged = M.tron({a:frozen},{a:listened}).a;
  assert.equal(merged.lichRieng.nhin.dongBang,true);
  assert.equal(merged.duong.nghe.ngay,30);
  const thawed = S.datLich(frozen,"nhin","mo",0,now+200);
  assert.equal(M.tron({a:frozen},{a:thawed}).a.lichRieng.nhin.dongBang,false);
  for (const nho of [true,false]) for (const ms of [0,1500,8000,23000,65000]) {
    const raw = S.cham(it.duong.nghe,nho,ms,null,now,"nghe",0.5,undefined);
    const r = S.phoiHop(it,"nghe",raw,nho,now);
    for (const k of Object.keys(raw.duong)) assert.deepEqual(r.duong[k],raw.duong[k],"Listening unchanged: "+k);
    assert.deepEqual(plain(r.tk),plain(raw.tk));
  }
  const raw = S.cham(it.duong.nhin,true,0,null,now,"nhin",0.5);
  const r = S.phoiHop(it,"nhin",raw,true,now);
  assert.equal(r.duong.phoiHop,1.5);
  assert.equal(r.duong.ngay,raw.duong.ngay);
  assert.equal(r.duong.lv,raw.duong.lv);
  assert(r.duong.due > raw.duong.due);
  const next = {...it,duong:{...it.duong,nhin:r.duong,nghe:{...it.duong.nghe,due:now+100*D}}};
  const raw2 = S.cham(next.duong.nhin,true,0,null,now+40*D,"nhin",0.5);
  assert.equal(raw2.duong.ngay,Math.round(raw.duong.ngay*2.1*100)/100,"No compounding the 1.5 factor");
  for (const x of [
    {...it,cauNghe:null},
    {...it,duong:{...it.duong,nghe:state(14,now+10*D)}},
    {...it,duong:{...it.duong,nghe:{...it.duong.nghe,sai:1}}},
    {...it,duong:{...it.duong,nhin:{...it.duong.nhin,saiTs:now-D}}},
    S.datLich(it,"nghe","bang",0,now)
  ]) assert.equal(S.phoiHop(x,"nhin",raw,true,now).duong.phoiHop,undefined);
  const off = {...it,mangTat:1};
  assert(!S.denHan(off,now).some(d=>d==="dong"||d==="trai"));
  assert(S.biChan(off,"dong",now));
  const sentence="私は毎朝日本語を勉強します。";
  let g=G.cham(null,sentence,"dung",now,"a",0);
  assert.equal(g.lv,1); assert.equal(g.due,now+3*D);
  assert.equal(G.cham(g,sentence,"dung",now,"a",0),null,"Duplicate");
  assert.equal(G.cham(g,sentence,"dung",now+D,"b",g.ts),null,"Early practice");
  assert.equal(G.cham(g,sentence,"dung",g.due,"b",0),null,"Stale window");
  g=G.cham(g,sentence,"dung",g.due,"b",g.ts); assert.equal(g.lv,2); assert.equal(g.ngay,7);
  g=G.cham(g,sentence,"sua",g.due,"c",g.ts); assert.equal(g.lv,2); assert.equal(g.ngay,3);
  g=G.cham(g,sentence,"dung",g.due,"d",g.ts); assert.equal(g.lv,2); assert.equal(g.ngay,7);
  g=G.cham(g,sentence,"xem",g.due,"e",g.ts); assert.equal(g.lv,1); assert.equal(g.ngay,3);
  assert.deepEqual(plain(it.duong),before,"Grammar never edits vocabulary");
  console.log(dir+": route scheduling, freeze, merge, listening invariance, grammar grading OK");
}
for(const file of ["srs.js","muc.js","ngu-phap.js","ngu-phap-ui.js","lich-rieng-ui.js"])
  assert.equal(readFileSync("extension/"+file,"utf8"),readFileSync("android/www/"+file,"utf8"));
const { Srs:S } = engine("extension");
function simulate(policy) {
  const words = Array.from({length:120},(_,i)=>({word:"語"+i,cauNghe:{cau:"日本語の例文"},duong:{}}));
  const counts=[], byRoute={nhin:0,nghe:0};
  for(let day=0;day<180;day++) {
    const t=now+day*D; let n=0;
    for(let i=0;i<words.length;i++) {
      if(day < i%12) continue;
      const w=words[i];
      for(const route of S.denHan(w,t)) {
        let r=S.cham(w.duong[route],true,0,null,t,route,0.5);
        if(policy) r=S.phoiHop(w,route,r,true,t);
        w.duong[route]=r.duong; byRoute[route]++; n++;
      }
    }
    counts.push(n);
  }
  return {total:counts.reduce((a,b)=>a+b,0),peak:Math.max(...counts),...byRoute};
}
const before=simulate(false),after=simulate(true);
assert(after.nhin < before.nhin); assert.equal(after.nghe,before.nghe);
console.log("SIMULATION (120 words / 180 days, all answers remembered; not observed learner data):",JSON.stringify({before,after}));
