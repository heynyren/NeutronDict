/**
 * ĐÓNG BĂNG — công tắc rút một từ khỏi vòng ôn, chốt ở lớp lõi.
 *
 *   node kiem-tra/srs-tat.mjs
 *
 * Cờ này nhỏ xíu mà đụng vào đúng chỗ dễ làm hỏng âm thầm nhất: `dongBang` chặn
 * ở `denHan`, nên nó KHÔNG được đổi gì hết ngoài hàng đợi.
 *
 * Chặn nhầm ở chỗ khác là hỏng theo kiểu không bài nào khác bắt được: chặn nhầm
 * `dongBang` ở `duongMo` thì `gomSrs` trả `null` và `capChung` trả -1, tức là
 * từ đóng băng đi ra đồng bộ Drive / máy chủ MCP dưới dạng "chưa học bao giờ".
 * Giao diện vẫn đẹp, bài kiểm giao diện vẫn xanh, và tiến độ mất sạch ở lượt
 * gộp hai máy đầu tiên.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const g = {};
new Function("self", fs.readFileSync(path.join(GOC, "extension/srs.js"), "utf8"))(g);
const Srs = g.Srs;

let hong = 0, xong = 0;
function la(dieu, ten, them) {
  xong++;
  if (dieu) { console.log("  ✓ " + ten + (them ? "  (" + them + ")" : "")); return; }
  hong++;
  console.error("  ✗ " + ten + (them ? "  (" + them + ")" : ""));
}

const NGAY = 86400000;
const MOC = Date.UTC(2026, 0, 1);
/** Một đường đã ôn tới giãn cách `ngay`, hạn kế còn `ngay` nữa. */
const D = (ngay) => ({ lv: 3, ngay: ngay, net: 5, sai: 1,
                       due: MOC + ngay * NGAY, ts: MOC, ms: 2000 });
const ban = (o) => JSON.parse(JSON.stringify(o));
/** Từ đủ ba đường, đã ôn một thời gian. */
const GOC_MUC = {
  key: "t", word: "改善", cauNghe: { cau: "毎日少しずつ改善する。", dich: "Mỗi ngày cải thiện một chút." },
  duong: { nhin: D(30), nghe: D(20), dien: D(4) }
};
/** Mốc "đã chín": giữ được lâu hơn TRAN_NGAY nên mọi đường đều 100 điểm. */
const CHIN = (m) => { for (const t of Srs.DUONG) if (m.duong[t]) m.duong[t] = D(400); return m; };

/* ------------------------------------------------------------------ */
console.log("\ndongBang — rút một từ ra khỏi vòng ôn\n");

{
  const b = ban(GOC_MUC); b.dongBang = true;
  const xa = MOC + 5000 * NGAY;
  la(Srs.denHan(b, MOC).length === 0 && Srs.denHan(b, xa).length === 0,
     "không tới hạn ở bất kỳ mốc nào", "mốc gốc và mốc +5000 ngày đều rỗng");
  la(Srs.denHan(GOC_MUC, xa).length > 0,
     "trong khi chính từ ấy chưa đóng băng thì có tới hạn",
     JSON.stringify(Srs.denHan(GOC_MUC, xa)));
}
{
  /*
   * CỔNG QUAN TRỌNG NHẤT CỦA CẢ TỆP NÀY.
   *
   * Nếu ai đó "dọn cho gọn" bằng cách chuyển chỗ chặn từ `denHan` lên
   * `duongMo`, mọi cổng phía trên VẪN XANH — hàng đợi vẫn rỗng, điểm vẫn
   * nguyên. Chỉ hai dòng dưới đây đỏ lên. Mà hậu quả thật thì là mất tiến độ
   * ở lượt đồng bộ đầu tiên, và người ta sẽ không nối được chuyện ấy với cái
   * nút đóng băng đã bấm mấy tuần trước.
   */
  const b = ban(GOC_MUC); b.dongBang = true;
  la(Srs.capChung(b) === Srs.capChung(GOC_MUC), "capChung KHÔNG đổi vì đóng băng",
     Srs.capChung(GOC_MUC) + " → " + Srs.capChung(b));
  la(JSON.stringify(Srs.gomSrs(b)) === JSON.stringify(Srs.gomSrs(GOC_MUC)),
     "gomSrs KHÔNG đổi — thứ đồng bộ Drive và máy chủ MCP đọc",
     JSON.stringify(Srs.gomSrs(b)));
  la(JSON.stringify(Srs.diemTu(b)) === JSON.stringify(Srs.diemTu(GOC_MUC)),
     "và điểm đứng yên đúng chỗ bấm đóng băng", Srs.diemTu(b).tong + "/100");
  la(Srs.duongMo(b).length === Srs.duongMo(GOC_MUC).length,
     "duongMo cũng không bị đụng tới", JSON.stringify(Srs.duongMo(b)));
}
{
  /* Gỡ băng = kiểm tra ngay. Không dòng mã nào lo việc này, vì `due` không bị
   * đụng tới — nên nó phải được chốt lại, kẻo mai mốt ai đó đi "dời hạn cho
   * đỡ dồn" mà không biết mình vừa đổi luật. */
  const b = ban(GOC_MUC); b.dongBang = true;
  const xa = MOC + 400 * NGAY;
  la(Srs.denHan(b, xa).length === 0, "đang đóng băng thì rỗng");
  delete b.dongBang;
  // Cả ba đường tới hạn theo lịch riêng, nhưng mỗi từ chỉ hiện MỘT đường mỗi lần
  // (Srs.GIAN_DUONG) — đường kia chờ tới lượt chứ không mất.
  la(["nhin", "nghe", "dien"].every((t) => Srs.hanDuong(b, t) <= xa),
     "gỡ băng ra là cả ba đường tới hạn lại ngay", JSON.stringify(Srs.denHan(b, xa)));
  la(Srs.denHan(b, xa).length === 1 && Srs.denHan(b, xa)[0] === "nhin",
     "và đường đầu tiên (nhin) hiện ngay", JSON.stringify(Srs.denHan(b, xa)));
}
{
  // Dữ liệu hỏng không được làm nổ hàm nào.
  for (const xau of [null, undefined, {}, { duong: null }, { lien: null, cauNghe: { cau: 1 } }]) {
    try {
      Srs.duongCo(xau); Srs.duongMo(xau); Srs.denHan(xau, MOC);
      Srs.diemTu(xau); Srs.capChung(xau); Srs.gomSrs(xau);
    } catch (e) {
      la(false, "dữ liệu hỏng không làm nổ hàm nào", JSON.stringify(xau) + " → " + e.message);
      break;
    }
  }
  la(true, "dữ liệu hỏng không làm nổ hàm nào");
}

/* ------------------------------------------------------------------ */
{
  const sExt = fs.readFileSync(path.join(GOC, "extension/srs.js"), "utf8");
  const sAnd = fs.readFileSync(path.join(GOC, "android/www/srs.js"), "utf8");
  la(sExt === sAnd, "extension/srs.js và android/www/srs.js giống nhau từng byte",
     sExt.length + " / " + sAnd.length + " ký tự");
}

console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " khẳng định TRƯỢT"
                          : "✓ " + xong + " khẳng định, tất cả đạt"));
process.exit(hong ? 1 : 0);
