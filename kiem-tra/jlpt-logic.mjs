/**
 * LOGIC CỦA CHẾ ĐỘ ÔN THI JLPT — chạy thuần Node, không cần trình duyệt.
 *
 *   node kiem-tra/jlpt-logic.mjs
 *
 * Chốt: luật 60% (59% trượt, 60% qua), sao, ngọc, mở khoá chặng / trùm / màn, chuỗi ngày, và chất lượng
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
soat("9/16 = 56% → trượt, 0 sao", r.phanTram === 56 && !r.qua && r.sao === 0);
r = TD.ghiKetQua(td, "n3", "c1b1h1", { dung: 10, tong: 16, saiIds: [] }, Date.now());
soat("10/16 = 63% → qua, 1 sao", r.phanTram === 63 && r.qua && r.sao === 1);
r = TD.ghiKetQua(TD.macDinh(), "n3", "x", { dung: 6, tong: 10, saiIds: [] }, Date.now());
soat("đúng 60% → qua (ngưỡng tính cả 60)", r.phanTram === 60 && r.qua);
r = TD.ghiKetQua(TD.macDinh(), "n3", "x", { dung: 59, tong: 100, saiIds: [] }, Date.now());
soat("59% → trượt", r.phanTram === 59 && !r.qua);
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
soat("chặng 2 khoá khi chặng 1 chưa qua", !TD.changMo(td, "n3", ids, 1, true));
TD.ghiKetQua(td, "n3", "a", { dung: 5, tong: 10, saiIds: [] }, Date.now());
soat("chặng 1 chỉ 50% → chặng 2 vẫn khoá", !TD.changMo(td, "n3", ids, 1, true));
TD.ghiKetQua(td, "n3", "a", { dung: 6, tong: 10, saiIds: [] }, Date.now());
soat("chặng 1 đạt 60% → chặng 2 mở, chặng 3 vẫn khoá", TD.changMo(td, "n3", ids, 1, true) && !TD.changMo(td, "n3", ids, 2, true));
soat("màn chưa mở thì không chặng nào mở", !TD.changMo(td, "n3", ids, 0, false));
td.thu = true;
soat("chế độ thử: mở hết", TD.changMo(td, "n3", ids, 3, true));
td = TD.macDinh();
const trum = { n3: "boss", n2: "boss" };
soat("màn N3 luôn mở (màn đầu có dữ liệu)", TD.monMo(td, "n3", trum));
soat("màn N2 khoá khi chưa thắng trùm N3", !TD.monMo(td, "n2", trum));
TD.ghiKetQua(td, "n3", "boss", { dung: 17, tong: 30, saiIds: [] }, Date.now());
soat("trùm N3 56% → N2 vẫn khoá", !TD.monMo(td, "n2", trum));
TD.ghiKetQua(td, "n3", "boss", { dung: 18, tong: 30, saiIds: [] }, Date.now());
soat("trùm N3 đạt 60% → N2 mở", TD.monMo(td, "n2", trum) && TD.monXong(td, "n3", "boss"));
soat("màn không có dữ liệu (N1) không bao giờ mở", !TD.monMo(td, "n1", trum));

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
  const c0 = ds.find((c) => c.loai === "tu");
  const de0 = CH.dungDe(mon, c0, { rng: rng(5) });
  const bl = {}; de0.forEach((q) => { bl[q.id] = 1; });
  const de1 = CH.dungDe(mon, c0, { rng: rng(5), baoLoi: bl });
  soat(lv.toUpperCase() + ": câu đã báo sai không hiện lại", de1.every((q) => !bl[q.id]));
}
process.exit(ket.every(Boolean) ? 0 : 1);
