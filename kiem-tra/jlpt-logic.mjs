/**
 * LOGIC CỦA CHẾ ĐỘ ÔN THI JLPT — chạy thuần Node, không cần trình duyệt.
 *
 *   node kiem-tra/jlpt-logic.mjs
 *
 * Chốt: hoàn thành độc lập điểm, bài cuối cần mọi chặng, sao, ngọc, mở khoá chặng / trùm / màn, chuỗi ngày, và chất lượng
 * đề dựng từ dữ liệu thật của N3 và N2 (mọi câu có đúng 4 lựa chọn khác nhau, đáp án đúng nằm trong đó,
 * chỗ trống nằm trong câu, không dùng câu hỏi sách vì không có đáp án).
 */
import fs from "node:fs";
globalThis.self = globalThis;
await import("../extension/jlpt-tien-do.js");
await import("../extension/jlpt-cau-hoi.js");
const TD = globalThis.JlptTienDo, CH = globalThis.JlptCauHoi;
const ket = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

console.log("Luật 60%");
let td = TD.macDinh();
let r = TD.ghiKetQua(td, "n3", "c1b1h1", { dung: 9, tong: 16, saiIds: [] }, Date.now());
soat("9/16 = 56% → hoàn thành, 0 sao", r.phanTram === 56 && r.qua && r.sao === 0);
r = TD.ghiKetQua(td, "n3", "c1b1h1", { dung: 10, tong: 16, saiIds: [] }, Date.now());
soat("10/16 = 63% → qua, 1 sao", r.phanTram === 63 && r.qua && r.sao === 1);
r = TD.ghiKetQua(TD.macDinh(), "n3", "x", { dung: 6, tong: 10, saiIds: [] }, Date.now());
soat("đúng 60% → qua (ngưỡng tính cả 60)", r.phanTram === 60 && r.qua);
r = TD.ghiKetQua(TD.macDinh(), "n3", "x", { dung: 59, tong: 100, saiIds: [] }, Date.now());
soat("59% vẫn hoàn thành", r.phanTram === 59 && r.qua);
soat("sao: 60/80/95", TD.saoTu(60) === 1 && TD.saoTu(79) === 1 && TD.saoTu(80) === 2 && TD.saoTu(94) === 2 && TD.saoTu(95) === 3 && TD.saoTu(59) === 0);

console.log("\nNgọc, kỷ lục, mục sai");
td = TD.macDinh();
r = TD.ghiKetQua(td, "n3", "a", { dung: 8, tong: 10, saiIds: ["m1", "m2"] }, Date.now());
soat("ngọc = số câu đúng + 5/sao mới", r.ngoc === 8 + 2 * 5 && td.ngoc === 18, td.ngoc);
r = TD.ghiKetQua(td, "n3", "a", { dung: 8, tong: 10, saiIds: [] }, Date.now());
soat("chơi lại cùng điểm: chỉ được ngọc câu đúng, không thưởng sao lần nữa", r.ngoc === 8);
r = TD.ghiKetQua(td, "n3", "a", { dung: 10, tong: 10, saiIds: [] }, Date.now());
soat("lập kỷ lục 100%: thưởng thêm sao (3-2)×5", r.ngoc === 10 + 5 && r.laKyLuc);
soat("điểm cao nhất giữ lại khi chơi tệ hơn", (TD.ghiKetQua(td, "n3", "a", { dung: 3, tong: 10, saiIds: [] }, Date.now()), TD.tot(td, "n3", "a") === 100));
soat("mục sai được đếm", td.sai.m1 === 1 && td.sai.m2 === 1);

console.log("\nMở khoá");
const ids = ["a", "b", "c", "boss"];
td = TD.macDinh();
soat("chặng đầu luôn mở khi màn mở", TD.changMo(td, "n3", ids, 0, true));
soat("chặng 2 mở dù chưa làm chặng 1", TD.changMo(td, "n3", ids, 1, true));
TD.ghiKetQua(td, "n3", "a", { dung: 5, tong: 10, saiIds: [] }, Date.now());
soat("chặng 1 chỉ 50% → vẫn hoàn thành", TD.changMo(td, "n3", ids, 1, true));
TD.ghiKetQua(td, "n3", "a", { dung: 6, tong: 10, saiIds: [] }, Date.now());
soat("mọi chặng thường mở tự do", TD.changMo(td, "n3", ids, 1, true) && TD.changMo(td, "n3", ids, 2, true));
soat("màn chưa mở thì không chặng nào mở", !TD.changMo(td, "n3", ids, 0, false));
td.thu = true;
soat("chế độ thử vẫn không bỏ điều kiện bài cuối", !TD.changMo(td, "n3", ids, 3, true));
TD.ghiKetQua(td,"n3","c",{dung:0,tong:10,saiIds:[]},Date.now());
soat("thiếu chặng b: bài cuối vẫn khoá",!TD.changMo(td,"n3",ids,3,true));
TD.ghiKetQua(td,"n3","b",{dung:0,tong:10,saiIds:[]},Date.now());
soat("đủ chặng, kể cả 0%: bài cuối mở",TD.changMo(td,"n3",ids,3,true));
soat("lượt rỗng không hoàn thành",!TD.ghiKetQua(td,"n3","empty",{dung:0,tong:0},Date.now()).qua && !TD.daXong(td,"n3","empty"));
td = TD.macDinh();
const trum = { n3: "boss", n2: "boss" };
soat("các màn mở SONG SONG: N3 và N2 đều mở ngay từ đầu", TD.monMo(td, "n3", trum) && TD.monMo(td, "n2", trum));
TD.ghiKetQua(td, "n3", "boss", { dung: 17, tong: 30, saiIds: [] }, Date.now());
soat("trùm N3 56% đã hoàn thành, N2 vẫn mở", TD.monMo(td, "n2", trum) && TD.monXong(td, "n3", "boss"));
TD.ghiKetQua(td, "n3", "boss", { dung: 18, tong: 30, saiIds: [] }, Date.now());
soat("trùm N3 đạt 60% → hoàn thành N3", TD.monXong(td, "n3", "boss"));
soat("màn chưa có dữ liệu (N1/N4/N5) chưa mở được", !TD.monMo(td, "n1", trum) && !TD.monMo(td, "n4", trum) && !TD.monMo(td, "n5", trum));
soat("khi thêm dữ liệu N4 thì N4 mở ngay, không cần qua màn nào", TD.monMo(TD.macDinh(), "n4", Object.assign({ n4: "boss" }, trum)));
soat("nhạc nền mặc định bật, đọc lại giữ nguyên lựa chọn tắt", TD.macDinh().nhac === true && TD.chuan({ nhac: false }).nhac === false && TD.chuan({}).nhac === true);

console.log("\nCách đọc On/Kun: nhiều cách đọc phải tách bằng dấu /");
soat('tachDoc("カイ エ") = "カイ / エ"', CH.tachDoc("カイ エ") === "カイ / エ");
soat('tachDoc("まわ・る まわ・す") giữ dấu ・ của okurigana', CH.tachDoc("まわ・る まわ・す") === "まわ・る / まわ・す");
soat("tachDoc chịu được 、 , và khoảng trắng toàn角", CH.tachDoc("カイ、エ,ガ\u3000ゲ") === "カイ / エ / ガ / ゲ");
soat('tachDoc("---") và rỗng → ""', CH.tachDoc("---") === "" && CH.tachDoc("") === "" && CH.tachDoc(null) === "");
soat("tachDoc gọi hai lần cho cùng kết quả (idempotent)", CH.tachDoc(CH.tachDoc("カイ エ")) === "カイ / エ");

console.log("\nChuỗi ngày");
td = TD.macDinh();
const D = 86400000, t0 = new Date(2026, 9, 20, 12).getTime();
TD.chamChuoi(td, t0); soat("lần đầu: chuỗi 1", td.chuoi === 1);
TD.chamChuoi(td, t0 + 3600000); soat("cùng ngày: không tăng", td.chuoi === 1);
TD.chamChuoi(td, t0 + D); soat("hôm sau: chuỗi 2", td.chuoi === 2);
TD.chamChuoi(td, t0 + 3 * D); soat("bỏ một ngày: về 1", td.chuoi === 1);

console.log("\nChuẩn hoá dữ liệu lưu");
soat("dữ liệu hỏng → bản mặc định", TD.chuan("rác").ngoc === 0 && TD.chuan(null).v === 1 && TD.chuan({ ngoc: -5 }).ngoc === 0);

console.log("\nĐề dựng từ dữ liệu thật");
for (const lv of ["n3", "n2"]) {
  const mon = JSON.parse(fs.readFileSync(new URL("../extension/jlpt/" + lv + ".json", import.meta.url)));
  CH.chuanBi(mon);
  const ds = CH.chiaChang(mon);
  soat(lv.toUpperCase() + ": có chặng, mỗi chương có trùm, cuối là trùm cuối", ds.length > 150 && ds[ds.length - 1].id === "boss" && ds.filter((c) => c.loai === "boss-chuong").length === mon.chuong.length, ds.length + " chặng");
  soat(lv.toUpperCase() + ": id chặng không trùng", new Set(ds.map((c) => c.id)).size === ds.length);
  soat(lv.toUpperCase() + ": mỗi chặng ≤ 20 từ / ≤ 10 chữ Hán", ds.every((c) => (c.loai === "tu" ? c.items.length <= 20 : c.loai === "han" ? c.items.length <= 10 : true)));
  const hanTat = mon.chuong.flatMap((ch) => ch.bai.flatMap((b) => b.han));
  soat(lv.toUpperCase() + ": mọi chữ Hán có On/Kun ngăn bằng \" / \" (không viết liền bằng khoảng trắng)",
    hanTat.length > 100 && hanTat.every((h) => [h.on, h.kun].every((v) => !v || v.split(" / ").every((x) => x && !/\s/.test(x)))), hanTat.length);
  soat(lv.toUpperCase() + ": có chữ Hán nhiều cách đọc được hiển thị dạng a / b", hanTat.some((h) => / \/ /.test(h.on)) && hanTat.some((h) => / \/ /.test(h.kun)));
  let hong = 0, thieu = 0, tong = 0, trongLoi = 0;
  const r1 = rng(11);
  for (const c of ds) {
    for (let k = 0; k < 2; k++) {
      const de = CH.dungDe(mon, c, { rng: r1 });
      tong += de.length;
      if (de.length < (c.loai === "pp" ? 4 : Math.min(c.soCau, 8))) { thieu++; if (thieu < 4) console.log("     thiếu:", c.id, c.loai, de.length + "/" + c.soCau, "mục:", c.items.length); }
      const ma = new Set();
      for (const q of de) {
        const u = new Set(q.chon.map((x) => String(x).toLowerCase()));
        if (q.chon.length !== 4 || u.size !== 4 || !(q.dung >= 0 && q.dung < 4)) hong++;
        if (q.de.truoc != null && !/\S/.test(q.de.truoc + q.de.sau)) trongLoi++;
        if (q.kieu === "dien-tu" && (q.de.truoc + q.chon[q.dung] + q.de.sau) !== q.dapAn.cau.replace(/[〜～]/g, "")) trongLoi++;
        if (ma.has(q.id)) hong++; ma.add(q.id);
      }
    }
  }
  soat(lv.toUpperCase() + ": " + tong + " câu dựng thử, 0 câu hỏng (đủ 4 lựa chọn khác nhau, có đáp án)", hong === 0, hong);
  soat(lv.toUpperCase() + ": câu điền chỗ trống ghép lại đúng nguyên câu gốc", trongLoi === 0, trongLoi);
  soat(lv.toUpperCase() + ": chặng nào cũng dựng đủ câu", thieu === 0, thieu);
  const bossDe = CH.dungDe(mon, ds[ds.length - 1], { rng: r1 });
  soat(lv.toUpperCase() + ": trùm cuối ra 30 câu trộn nhiều dạng", bossDe.length === 30 && new Set(bossDe.map((q) => q.kieu)).size >= 5, bossDe.length + " câu, " + new Set(bossDe.map((q) => q.kieu)).size + " dạng");
  // báo lỗi: câu bị báo không xuất hiện lại
  // Câu chuyện: mỗi chặng có đoạn thoại riêng, nối thành một truyện liền mạch
  const tr = JSON.parse(fs.readFileSync(new URL("../extension/jlpt/truyen-" + lv + ".json", import.meta.url)));
  const bong = [].concat(tr.batDau || [], ...Object.values(tr.chang || {}), ...Object.values(tr.xongChuong || {}), tr.thang || []);
  soat(lv.toUpperCase() + ": truyện có đoạn riêng cho TỪNG chặng (không thiếu, không thừa id)", ds.every((c) => Array.isArray(tr.chang[c.id]) && tr.chang[c.id].length >= 1) && Object.keys(tr.chang).every((id) => ds.some((c) => c.id === id)), Object.keys(tr.chang).length + "/" + ds.length);
  soat(lv.toUpperCase() + ": truyện > 200 lời thoại, mỗi chặng ≤ 3 bong bóng, mỗi bong bóng 12–190 ký tự, không trùng", bong.length > 200 && Object.values(tr.chang).every((a) => a.length <= 3) && bong.every((x) => typeof x === "string" && x.length >= 12 && x.length <= 190) && new Set(bong).size === bong.length, bong.length + " bong bóng");
  soat(lv.toUpperCase() + ": có lời mở màn, 9 đoạn sau mỗi chương và đoạn kết", tr.batDau.length >= 3 && [1, 2, 3, 4, 5, 6, 7, 8, 9].every((k) => tr.xongChuong[k] && tr.xongChuong[k].length >= 1) && tr.thang.length >= 4);
  soat(lv.toUpperCase() + ": truyện chỉ nhắc nhân vật của màn mình (không lẫn Taro/Kai)", lv === "n3" ? !bong.some((x) => /\bKai\b/.test(x)) : !bong.some((x) => /\bTaro\b/.test(x)));
  const c0 = ds.find((c) => c.loai === "tu");
  const de0 = CH.dungDe(mon, c0, { rng: rng(5) });
  const bl = {}; de0.forEach((q) => { bl[q.id] = 1; });
  const de1 = CH.dungDe(mon, c0, { rng: rng(5), baoLoi: bl });
  soat(lv.toUpperCase() + ": câu đã báo sai không hiện lại", de1.every((q) => !bl[q.id]));
}
process.exit(ket.every(Boolean) ? 0 : 1);
