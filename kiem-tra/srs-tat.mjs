/**
 * TẮT MẠNG NGHĨA và ĐÓNG BĂNG — hai công tắc rút bớt việc, chốt ở lớp lõi.
 *
 *   node kiem-tra/srs-tat.mjs
 *
 * Hai cờ này nhỏ xíu mà đụng vào đúng chỗ dễ làm hỏng âm thầm nhất:
 *
 *   `mangTat` chặn ở `duongCo`, nên nó ĐỔI điểm và đổi bậc — đúng như muốn.
 *   `dongBang` chặn ở `denHan`, nên nó KHÔNG được đổi gì hết ngoài hàng đợi.
 *
 * Lẫn hai chỗ ấy là hỏng theo kiểu không bài nào khác bắt được: chặn nhầm
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
/** Từ đủ bốn đường, đã ôn một thời gian. */
const GOC_MUC = {
  key: "t", word: "改善", cauNghe: { cau: "毎日少しずつ改善する。" },
  lien: { dong: ["向上", "進歩"], trai: ["悪化"] },
  duong: { nhin: D(30), nghe: D(20), dong: D(4), trai: D(3) }
};
/** Mốc "đã chín": giữ được lâu hơn TRAN_NGAY nên mọi đường đều 100 điểm. */
const CHIN = (m) => { for (const t of Srs.DUONG) if (m.duong[t]) m.duong[t] = D(400); return m; };

/* ------------------------------------------------------------------ */
console.log("mangTat — tắt bài mạng nghĩa cho một từ\n");

{
  const a = ban(GOC_MUC); a.mangTat = true;
  la(Srs.duongCo(a).join(",") === "nhin,nghe", "đóng cả đường dong lẫn trai",
     Srs.duongCo(a).join(","));
  /*
   * VÀ KHÔNG ĐỤNG TỚI `lien`. Đây là cả lý do tồn tại của cờ này: nút × bỏ từ
   * thì bỏ CẢ HAI CHIỀU, nên dùng nút × để tắt bài cho một từ là đi phá tập
   * liên kết của mọi từ hàng xóm. Cờ này chỉ nói về đúng mục mang nó.
   */
  la(a.lien.dong.length === 2 && a.lien.trai.length === 1,
     "mà danh sách liên kết vẫn nguyên vẹn",
     JSON.stringify(a.lien.dong) + " / " + JSON.stringify(a.lien.trai));
  la(Srs.denHan(a, MOC + 400 * NGAY).indexOf("dong") < 0 &&
     Srs.denHan(a, MOC + 400 * NGAY).indexOf("trai") < 0,
     "hai bài ấy không bao giờ được hỏi nữa",
     JSON.stringify(Srs.denHan(a, MOC + 400 * NGAY)));
}
{
  const truoc = Srs.diemTu(GOC_MUC), sau = Srs.diemTu(Object.assign(ban(GOC_MUC), { mangTat: true }));
  /*
   * Điểm TĂNG, không phải giảm — hai đường yếu thôi bị tính vào, trọng số chia
   * lại trên đúng những đường còn mở. Đây chính là câu trả lời cho "tắt đi thì
   * còn chấm được trên thang 100 không".
   */
  la(sau.tong > truoc.tong, "bỏ hai đường yếu ra thì điểm TĂNG",
     truoc.tong + " → " + sau.tong);
  la(sau.phan.dong === null && sau.phan.trai === null,
     "hai đường ấy báo null (không có dữ liệu), chứ không phải 0 điểm",
     JSON.stringify(sau.phan));
  const chin = Srs.diemTu(Object.assign(CHIN(ban(GOC_MUC)), { mangTat: true }));
  la(chin.tong === 100, "và vẫn lên được tròn 100/100", chin.tong + "/100");
}
{
  /*
   * TRẦN BẬC: tự tắt thì được bước qua, thiếu vì từ điển thì KHÔNG.
   *
   * Đây là cổng giữ phần trung thực. Gộp hai trường hợp làm một — dù gộp theo
   * chiều nào — là một trong hai cái hỏng: hoặc từ không tra được đồng nghĩa
   * kẹt vĩnh viễn ở "Thuộc mặt chữ" dù người học chẳng làm gì sai, hoặc mọi
   * từ chưa có liên kết tự nhận mình "Gọi ra được lúc cần".
   */
  const tat = Srs.diemTu(Object.assign(CHIN(ban(GOC_MUC)), { mangTat: true }));
  la(tat.ten === "Gọi ra được lúc cần", "từ TỰ TẮT lên được bậc cao nhất", tat.ten);
  la(tat.chuaDo.indexOf("mạng nghĩa") < 0,
     "và thôi bị ghi là “chưa đo được”", JSON.stringify(tat.chuaDo));
  la(tat.mangTat === true, "diemTu nói rõ ra là từ này đã tắt, để giao diện còn ghi chú");

  const thieu = CHIN(ban(GOC_MUC)); thieu.lien = { dong: [], trai: [] };
  const dt = Srs.diemTu(thieu);
  la(dt.ten === "Nghe ra", "từ THIẾU liên kết vì từ điển vẫn dừng ở “Nghe ra”", dt.ten);
  la(dt.chuaDo.indexOf("mạng nghĩa") >= 0,
     "và vẫn được ghi là chưa đo được", JSON.stringify(dt.chuaDo));
  la(dt.tong === 100, "nhưng điểm vẫn tròn 100 — trần nằm ở BẬC, không ở điểm",
     dt.tong + "/100");
}
{
  const a = ban(GOC_MUC); a.mangTat = true;
  delete a.mangTat;
  la(JSON.stringify(Srs.diemTu(a)) === JSON.stringify(Srs.diemTu(GOC_MUC)),
     "bỏ cờ ra là mọi thứ về y như cũ");
}

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
  la(Srs.denHan(b, xa).length === 4, "gỡ băng ra là tới hạn lại ngay, cả bốn đường",
     JSON.stringify(Srs.denHan(b, xa)));
}
{
  // Hai cờ chồng nhau không được nổ, và đóng băng phải thắng ở hàng đợi.
  const c = ban(GOC_MUC); c.mangTat = true; c.dongBang = true;
  la(Srs.denHan(c, MOC + 400 * NGAY).length === 0, "bật cả hai cờ: hàng đợi vẫn rỗng");
  la(Srs.duongCo(c).join(",") === "nhin,nghe", "và mạng nghĩa vẫn đóng",
     Srs.duongCo(c).join(","));
}
{
  // Dữ liệu hỏng không được làm nổ hàm nào.
  for (const xau of [null, undefined, {}, { duong: null }, { lien: null, mangTat: true }]) {
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
