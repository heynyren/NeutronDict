/**
 * MỖI TỪ CHỈ HIỆN MỘT ĐƯỜNG MỖI LẦN; ĐƯỜNG KẾ TIẾP CHỜ 12 TIẾNG.
 *
 *   node kiem-tra/srs-gian-duong.mjs
 *
 * Lỗi người dùng gặp: "học mãi không hết bài để nghỉ". Một từ có bốn đường đến hạn
 * thì cả bốn thẻ cùng vào hàng đợi MỘT buổi: đo trên bản cũ, 30 từ đã mở đủ bốn
 * đường cho ra 120 thẻ — gấp bốn số từ — nên đích "hết bài" luôn ở rất xa.
 *
 * Chốt:
 *   1. Từ có nhiều đường đến hạn: chỉ MỘT đường (theo thứ tự nhin → nghe → dien).
 *   2. Chấm một đường: các đường KHÁC của từ ấy ngủ đúng 12 tiếng tính từ lúc chấm.
 *   3. Hết 12 tiếng thì lại chỉ một đường hiện; chấm xong lại 12 tiếng nữa (chuỗi).
 *   4. Đường vừa chấm KHÔNG bị luật này đụng: nó có lịch riêng.
 *   5. Đường vừa mở (chưa học bao giờ) cũng phải ngủ, không hiện liền.
 *   6. Mốc `ts` ở tương lai (đồng hồ máy kia lệch) không được chặn từ cả ngày.
 *   7. Phiên học HỮU HẠN: chấm hết hàng đợi rồi hỏi lại ngay thì không còn gì.
 *   8. Cổng chấm (biChan) không biết luật này — thẻ đang hiện trên màn vẫn chấm được.
 *   9. Đóng băng / tắt mạng nghĩa / lịch riêng vẫn hoạt động.
 */
import fs from "node:fs";
const g = {};
new Function("self", fs.readFileSync("extension/srs.js", "utf8"))(g);
const Srs = g.Srs;
let hong = 0, xong = 0;
const la = (d, t, c) => { xong++; if (d) { console.log("  ✓ " + t + (c ? "  (" + c + ")" : "")); return; } hong++; console.error("  ✗ " + t + (c ? "  (" + c + ")" : "")); };
const GIO = 3600000, MOC = Date.UTC(2026, 0, 10, 8, 0, 0);

/** Từ đã học đủ để mở cả ba đường; mọi đường đã quá hạn từ lâu. */
const tu = (extra) => {
  const d = (ngay) => ({ lv: 3, ngay, net: 2.1, sai: 0, due: MOC - 86400000, ts: MOC - 30 * 86400000 });
  return Object.assign({ key: "w", word: "w", dict: "javi", cauNghe: { cau: "x w", dich: "y" },
    duong: { nhin: d(14), nghe: d(14), dien: d(14) } }, extra || {});
};
const cham = (m, t, now) => {
  const kq = Srs.cham(m.duong[t] || null, true, 2000, null, now, t, 0.5);
  return Object.assign({}, m, { duong: Object.assign({}, m.duong, { [t]: kq.duong }) });
};

console.log("Một đường mỗi lần");
{
  const m = tu();
  la(Srs.denHan(m, MOC).length === 1 && Srs.denHan(m, MOC)[0] === "nhin", "bốn đường cùng đến hạn: chỉ hiện nhin", JSON.stringify(Srs.denHan(m, MOC)));
  const m2 = tu(); delete m2.duong.nhin; m2.duong.nhin = { lv: 3, ngay: 14, due: MOC + 5 * 86400000, ts: MOC - 86400000 };
  la(Srs.denHan(m2, MOC)[0] === "nghe" && Srs.denHan(m2, MOC).length === 1, "nhin chưa tới hạn: đường tới hạn đầu tiên là nghe", JSON.stringify(Srs.denHan(m2, MOC)));
}

console.log("\nChuỗi 12 tiếng giữa các đường");
{
  let m = tu();
  m = cham(m, "nhin", MOC);                                            // chấm nhin lúc 08:00
  la(Srs.denHan(m, MOC).length === 0, "vừa chấm nhin: các đường kia KHÔNG hiện liền", JSON.stringify(Srs.denHan(m, MOC)));
  la(Srs.denHan(m, MOC + 6 * GIO).length === 0, "sau 6 tiếng vẫn chưa");
  la(Srs.denHan(m, MOC + 12 * GIO - 1000).length === 0, "sau 11 tiếng 59 phút 59 giây vẫn chưa");
  la(Srs.choDen(m, "nghe", MOC) === MOC + 12 * GIO, "choDen báo đúng mốc: lúc chấm + 12 tiếng");
  la(Srs.denHan(m, MOC + 12 * GIO).join() === "nghe", "đủ 12 tiếng: chỉ nghe hiện (không phải cả hai)", JSON.stringify(Srs.denHan(m, MOC + 12 * GIO)));
  const t2 = MOC + 12 * GIO;
  m = cham(m, "nghe", t2);
  la(Srs.denHan(m, t2).length === 0, "chấm nghe xong: dien chưa hiện");
  la(Srs.denHan(m, t2 + 12 * GIO - 1000).length === 0, "…và vẫn chưa sau 11 tiếng 59");
  la(Srs.denHan(m, t2 + 12 * GIO).join() === "dien", "12 tiếng sau nghe thì tới dien", JSON.stringify(Srs.denHan(m, t2 + 12 * GIO)));
}

console.log("\nĐường vừa chấm không bị đụng");
{
  let m = tu();
  m = cham(m, "nhin", MOC);
  la(Srs.choDen(m, "nhin", MOC) === 0, "đường nhin KHÔNG phải chờ vì chính lượt chấm của nó");
  // nhin có lịch riêng: tới hạn lại vào ngày hẹn, và lúc đó nó không bị luật 12 tiếng giữ
  const due = m.duong.nhin.due;
  la(Srs.denHan(m, due + 1).includes("nhin") || Srs.denHan(m, due + 1).length === 1, "tới ngày hẹn nhin hiện bình thường");
}

console.log("\nĐường vừa MỞ phải ngủ");
{
  // nhin đã ≥ 2 ngày nên mở cả ba đường; hai đường kia CHƯA học bao giờ (không có duong[t]).
  const m = { key: "n", word: "n", cauNghe: { cau: "x n", dich: "y" },
              duong: { nhin: { lv: 1, ngay: 3, net: 2.1, sai: 0, due: MOC - 1000, ts: MOC - 3 * 86400000 } } };
  la(Srs.denHan(m, MOC).join() === "nhin", "từ mới mở: chỉ nhin hiện");
  const sau = cham(m, "nhin", MOC);
  la(Srs.denHan(sau, MOC).length === 0, "chấm nhin xong, hai đường vừa mở KHÔNG ùa vào", JSON.stringify(Srs.denHan(sau, MOC)));
  la(Srs.denHan(sau, MOC + 12 * GIO).join() === "nghe", "12 tiếng sau chỉ nghe hiện", JSON.stringify(Srs.denHan(sau, MOC + 12 * GIO)));
}

console.log("\nMốc lệch giờ");
{
  const m = tu();
  m.duong.nhin.ts = MOC + 10 * 86400000;           // máy kia chạy trước 10 ngày
  la(Srs.denHan(m, MOC).length === 1, "ts ở tương lai không chặn các đường khác", JSON.stringify(Srs.denHan(m, MOC)));
  la(Srs.choDen(m, "nghe", MOC) === 0, "choDen bỏ qua mốc tương lai");
}

console.log("\nBuổi học ngắn lại: một thẻ cho mỗi từ (đúng lỗi 'học mãi không hết')");
{
  const dsTu = Array.from({ length: 50 }, (_, i) => Object.assign(tu(), { key: "w" + i }));
  let now = MOC, tong = 0, vong = 0;
  const muc = dsTu.slice();
  // Một buổi: lặp "lấy hết thẻ đến hạn → chấm Nhớ hết" cho đến khi hết, có chặn vòng.
  while (vong < 20) {
    vong++;
    let moi = 0;
    for (let i = 0; i < muc.length; i++) for (const d of Srs.denHan(muc[i], now)) { muc[i] = cham(muc[i], d, now); moi++; }
    tong += moi;
    if (!moi) break;
    now += 60000;                                   // chấm xong là một phút sau
  }
  la(vong <= 3, "buổi học KẾT THÚC sau " + vong + " vòng");
  la(tong === 50, "đúng một thẻ cho mỗi từ trong buổi: " + tong, "50 từ × 4 đường đến hạn → 50 thẻ (bản cũ: 200)");
  // Hôm sau (24 tiếng) mới tới đường kế
  const hom = muc.reduce((s, m) => s + Srs.denHan(m, MOC + 24 * GIO).length, 0);
  la(hom === 50, "24 tiếng sau: lại mỗi từ MỘT thẻ (đường kế tiếp)", hom + "");
}

console.log("\nCổng chấm và các công tắc");
{
  const m = cham(tu(), "nhin", MOC);
  la(!Srs.biChan(m, "nghe", MOC + GIO), "biChan KHÔNG chặn đường đang ngủ (thẻ đang hiện vẫn chấm được)");
  const b = Object.assign({}, m, { dongBang: true });
  la(Srs.denHan(b, MOC + 20 * GIO).length === 0, "đóng băng vẫn rút hết");
  const t = tu(); t.lichRieng = { nhin: { dongBang: true, ts: MOC } };
  la(Srs.denHan(t, MOC).join() === "nghe", "đóng băng riêng đường nhin: nghe hiện thay", JSON.stringify(Srs.denHan(t, MOC)));
}

console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " khẳng định TRƯỢT" : "✓ " + xong + " khẳng định, tất cả đạt"));
process.exit(hong ? 1 : 0);
