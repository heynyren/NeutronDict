/**
 * JLPT: phép gộp và các hàm sync THẬT của extension + Android, cloud giả lưu nguyên gói.
 * Chạy trên GitHub Actions; không dùng tài khoản hay dữ liệu học thật.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read = p => fs.readFileSync(p, "utf8");
const copy = x => structuredClone(x);
assert.equal(read("extension/jlpt-tien-do.js"), read("android/www/jlpt-tien-do.js"));
assert.equal(read("extension/jlpt-giao-dien.js"), read("android/www/jlpt-giao-dien.js"));
const pure = vm.createContext({ console }); pure.self = pure;
vm.runInContext(read("extension/jlpt-tien-do.js"), pure);
const TD = pure.JlptTienDo;
const fixture = (level, id, score = 0, ts = 1000) => {
  const td = TD.macDinh();
  TD.ghiKetQua(td, level, id, { dung: score, tong: 100, saiIds: ["weak"] }, ts);
  return copy(td);
};
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log("✓ " + name); };
const a = fixture("n3", "a", 95), b = fixture("n3", "b", 0), c = fixture("n2", "c", 80);
check("gộp từng cấp/chặng, kể cả hoàn thành 0%", () => {
  const r = TD.tron(TD.tron(a, b), c);
  assert.ok(TD.daXong(r,"n3","a") && TD.daXong(r,"n3","b") && TD.daXong(r,"n2","c"));
  assert.ok(TD.changMo(r,"n3",["a","b","boss"],2,true));
  assert.ok(!TD.changMo(a,"n3",["a","b","boss"],2,true));
});
check("điểm/sao cao nhất thắng cả khi bản mới hơn thấp hơn", () => {
  const r = TD.tron(a, fixture("n3","a",10,2000));
  assert.equal(r.mon.n3.chang.a.tot,95); assert.equal(r.mon.n3.chang.a.sao,3);
  assert.equal(r.mon.n3.chang.a.ts,2000);
});
check("legacy lan > 0 dưới 60% vẫn hoàn thành; kho rỗng không xoá", () => {
  const old = { mon:{n3:{chang:{old:{tot:30,lan:1}}}}, ngoc:5 };
  assert.ok(TD.daXong(TD.tron(null,old),"n3","old"));
  assert.deepEqual(copy(TD.gui(TD.tron(old,null))),copy(TD.gui(old)));
});
check("giao hoán/kết hợp/lặp lại không tăng số lượt, ngọc, mục sai", () => {
  const aa = copy(TD.gui(TD.tron(a,b))), bb = copy(TD.gui(TD.tron(b,a)));
  assert.deepEqual(aa,bb);
  assert.deepEqual(copy(TD.gui(TD.tron(TD.tron(a,b),c))),copy(TD.gui(TD.tron(a,TD.tron(b,c)))));
  assert.deepEqual(copy(TD.gui(TD.tron(aa,aa))),aa);
  let r = aa; for(let i=0;i<10;i++) r=TD.tron(r,a);
  assert.deepEqual(copy(TD.gui(r)),aa);
});
check("không sửa/giữ tham chiếu đầu vào, giữ thoại và trường mở rộng", () => {
  const x = {...copy(a), future:{foo:{value:3}}}, before=copy(x);
  x.mon.n3.thoai={batDau:1};
  const r=TD.tron(x,{future:{bar:7},mon:{n3:{thoai:{sa:1}}}});
  r.mon.n3.chang.a.tot=1;
  assert.equal(x.mon.n3.chang.a.tot,95);
  assert.equal(r.future.foo.value,3); assert.equal(r.future.bar,7);
  assert.equal(r.mon.n3.thoai.batDau,1); assert.equal(r.mon.n3.thoai.sa,1);
  assert.deepEqual(x.future,before.future);
});
check("tuỳ chọn thiết bị không đi lên cloud; chuỗi đi với ngày gần nhất", () => {
  const x={...copy(a),nhac:false,thu:true,ngayCuoi:"2026-10-28",chuoi:10};
  const y={...copy(b),nhac:true,thu:false,ngayCuoi:"2026-10-29",chuoi:1};
  const r=TD.tron(x,y);
  assert.equal(r.nhac,false); assert.equal(r.thu,true);
  assert.equal(r.ngayCuoi,"2026-10-29"); assert.equal(r.chuoi,1);
  assert.ok(!("nhac" in TD.gui(r)) && !("thu" in TD.gui(r)));
  assert.equal(TD.chuan({ngoc:-2,chuoi:Infinity,ngayCuoi:"bad"}).ngoc,0);
});

function make(kind, cloud, common=true) {
  const state={notebook:{},decks:{},hoc:{},jlpt:TD.macDinh()};
  const pending=[]; let queue=Promise.resolve(), onSave=null, fail=false;
  const lock = fn => { const job=queue.then(fn,fn); queue=job.catch(()=>{}); return job; };
  const get = async key => {
    if(typeof key==="string") return {[key]:copy(state[key])};
    return Object.fromEntries(key.map(k=>[k,copy(state[k])]));
  };
  const request = async body => {
    if(body.action==="load") return {ok:true,data:copy(cloud.value)};
    if(body.action==="save") {
      if(fail) throw Error("test network failure");
      cloud.value=copy(body.data);
      if(onSave) { const fn=onSave; onSave=null; await fn(); }
      return {ok:true};
    }
    throw Error("unexpected action");
  };
  const ctx=vm.createContext({
    console, structuredClone, NGU:"ja", jlptSan:null, manHienTai:"Notebook",
    chrome:{storage:{local:{get,set:async o=>Object.assign(state,copy(o))}},
      runtime:{sendMessage:m=>pending.push(m.ngu)}},
    Store:{get:async k=>copy(state[k]),set:async(k,v)=>{state[k]=copy(v);}},
    cauHinhSync:async()=>({chung:common}), layCfg:async()=>({url:"https://test.invalid",chung:common}),
    driveRequest:request, httpPostJson:async(_url,b)=>request(b),
    getNB:async()=>copy(state.notebook),getDecks:async()=>copy(state.decks),
    setDecks:async v=>{state.decks=copy(v);},setNB:async v=>{state.notebook=copy(v);},
    boAnh:copy,traAnh:copy,vaSau:lock,xepHang:lock,suaSoTay:lock,
    scheduleSync:n=>pending.push(n),syncSoon:n=>pending.push(n),
    locHangDoiLich:async()=>{},theoDoi:{dat(){}},
    T:x=>x,T2:x=>x,countActive:nb=>Object.values(nb).filter(x=>!x.del).length
  });
  ctx.self=ctx; ctx.window=ctx;
  for(const p of ["ngu.js","srs.js","tien-do.js","muc.js","jlpt-tien-do.js"])
    vm.runInContext(read("extension/"+p),ctx);
  ctx.mergeByTs=(x,y)=>ctx.Muc.tron(x,y);
  ctx.capNhat=fn=>lock(async()=>{const nb=copy(state.notebook);const r=await fn(nb);state.notebook=nb;return r;});
  const path=kind==="extension"?"extension/background.js":"android/www/app.js";
  const src=read(path),start=src.indexOf("async function doSync(");
  const end=src.indexOf(kind==="extension"?"// Save PDF context":"\nlet syncTimer",start);
  assert.ok(start>=0 && end>start);vm.runInContext(src.slice(start,end),ctx);
  const adapter=read(kind==="extension"?"extension/notebook.js":"android/www/app.js");
  const a0=adapter.indexOf("async function ghiTienDoJlpt("),a1=adapter.indexOf("\nlet jlptSan",a0);
  assert.ok(a0>=0 && a1>a0);vm.runInContext(adapter.slice(a0,a1),ctx);
  return {state,pending,sync:n=>ctx.doSync(n),write:v=>ctx.ghiTienDoJlpt(v),
    onSave:fn=>{onSave=fn;},fail:v=>{fail=v;},ctx};
}
for(const common of [true,false]) {
  const cloud={value:{notebook:{},decks:{},hoc:{}}};
  const ext=make("extension",cloud,common),app=make("android",cloud,common);
  ext.state.jlpt=copy(a); app.state.jlpt=TD.tron(b,c);
  ext.state.notebook={"javi:猫":{word:"猫",dict:"javi",means:["mèo"],ts:1}};
  const lang=common?"en":"ja";
  await ext.sync(lang); await app.sync(lang); await ext.sync(lang);
  check((common?"kho chung kể cả lượt Anh":"cloud Nhật riêng")+": extension ↔ Android đủ hai cấp",()=>{
    for(const v of [ext.state.jlpt,app.state.jlpt,cloud.value.jlpt]) {
      assert.ok(TD.daXong(v,"n3","a") && TD.daXong(v,"n3","b") && TD.daXong(v,"n2","c"));
    }
    assert.ok(app.state.notebook["javi:猫"]);
  });
  const stable=copy(cloud.value.jlpt);
  await ext.sync(lang); await app.sync(lang);
  check("sync lặp ổn định, không chứa tuỳ chọn thiết bị",()=>{
    assert.deepEqual(copy(cloud.value.jlpt),stable);
    assert.ok(!("thu" in stable) && !("nhac" in stable));
  });
}
for(const kind of ["extension","android"]) {
  const cloud={value:{notebook:{},jlpt:copy(b)}},m=make(kind,cloud);
  m.state.jlpt=copy(a);
  // Lưu một chặng mới sau khi snapshot đã gửi, ngay trong khi HTTP còn chờ.
  m.onSave(async()=>{await m.write(TD.tron(m.state.jlpt,c));});
  await m.sync("ja");
  check(kind+": hoàn thành trong lúc sync giữ cả ba chặng và hẹn đẩy tiếp",()=>{
    for(const [lv,id] of [["n3","a"],["n3","b"],["n2","c"]])assert.ok(TD.daXong(m.state.jlpt,lv,id));
    assert.ok(m.pending.includes("ja"));
  });
  await m.sync("ja");
  check(kind+": lượt tiếp chuyển thay đổi mới lên cloud",()=>assert.ok(TD.daXong(cloud.value.jlpt,"n2","c")));
  await m.write(a); // một màn UI còn giữ snapshot cũ
  check(kind+": UI cũ lưu lại không xoá phần nhận từ máy kia",()=>assert.ok(TD.daXong(m.state.jlpt,"n2","c")));
  m.fail(true);
  await assert.rejects(m.sync("ja"),/test network failure/);
  check(kind+": lỗi mạng không xoá tiến độ cục bộ",()=>assert.ok(TD.daXong(m.state.jlpt,"n2","c")));
  m.fail(false);await m.sync("ja");
  // Tiếng Anh riêng phải không nhận hoặc gửi tiến độ Nhật của máy.
  const other={value:{notebook:{},jlpt:copy(b)}},en=make(kind,other,false);
  en.state.jlpt=copy(a);
  await en.sync("en");
  check(kind+": cloud Anh riêng chỉ chuyển tiếp dữ liệu cũ, không trộn JLPT cục bộ",()=>{
    assert.deepEqual(copy(other.value.jlpt),copy(b));
    assert.ok(!TD.daXong(en.state.jlpt,"n3","b"));
  });
  const empty={value:{notebook:{}}},old=make(kind,empty);
  old.state.jlpt=copy(a);await old.sync("ja");
  check(kind+": Apps Script cũ không có jlpt vẫn nâng gói và giữ dữ liệu",()=>assert.ok(TD.daXong(empty.value.jlpt,"n3","a")));
}
console.log("JLPT sync: "+checks+" kiểm tra đạt.");
