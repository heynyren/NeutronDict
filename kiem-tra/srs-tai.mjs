/**
 * Tải của hàng đợi — chốt chặn cho đúng cái lỗi đang đi sửa.
 *
 *   node kiem-tra/srs-tai.mjs [--bang]
 *
 * Vì sao cần bài này. Lỗi "từ vựng dồn lên rất nhiều" không lộ ra ở bất kỳ một
 * lượt chấm nào — mỗi lượt riêng lẻ đều trông hợp lý. Nó chỉ lộ ra sau vài
 * tháng, khi hai bài liên kết không lớn lên được và chiếm hết hàng đợi. Không
 * có bài đo dài hạn thì lần sau ai chỉnh một hằng số cũng không biết mình vừa
 * làm sống lại nó.
 *
 * Bài này chạy 600 từ trong 180 ngày với PRNG có hạt giống, rồi CỔNG THEO
 * KHOẢNG chứ không theo số chính xác — số chính xác sẽ đổi mỗi lần tinh chỉnh
 * và biến bài kiểm thành thứ phải sửa theo, thay vì thứ bắt lỗi.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const g = {};
new Function("self", fs.readFileSync(path.join(GOC, "extension/srs.js"), "utf8"))(g);
const Srs = g.Srs;

const NGAY = 86400000;
/** Tỉ lệ nhớ theo từng đường — bài khó thì quên nhiều hơn. */
const TILE = { nhin: 0.88, nghe: 0.75, dong: 0.70, trai: 0.70 };
/** Nhịp bấm thật của từng loại bài (ms). */
const NHIP = { nhin: 2200, nghe: 4500, dong: 14000, trai: 14000 };

function chay({ soTu = 600, soNgay = 180, moiNgayThem = 10, raiTai = true } = {}) {
  let rnd = 12345;
  const r = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  const muc = [], tk = {};
  let now = Date.now();
  const tai = { nhin: 0, nghe: 0, dong: 0, trai: 0 };
  const lap = {};
  const moiNgay = [];
  let tongThe = 0, tongMuc = 0;

  for (let ngay = 0; ngay < soNgay; ngay++) {
    for (let k = 0; k < moiNgayThem && muc.length < soTu; k++)
      muc.push({ key: "w" + muc.length, duong: {},
                 cauNghe: { cau: "x" }, lien: { dong: ["a", "b", "c"], trai: ["z"] } });
    const the = [], dem = new Map();
    for (const m of muc) {
      const ds = Srs.denHan(m, now);
      if (ds.length) dem.set(m.key, ds.length);
      for (const d of ds) { the.push([m, d]); tai[d]++; }
    }
    for (const v of dem.values()) lap[v] = (lap[v] || 0) + 1;
    moiNgay.push(the.length);
    tongThe += the.length; tongMuc += dem.size;

    const lich = raiTai ? Srs.lichHen(muc) : null;
    for (const [m, d] of the) {
      const nho = r() < TILE[d];
      const ms = NHIP[d] * (0.6 + r() * 0.9);
      const chat = (d === "dong" || d === "trai") ? (nho ? 0.5 + r() * 0.5 : 0.3) : undefined;
      const kq = Srs.cham(m.duong[d] || null, nho, ms, tk[d], now, d, r(), chat, lich);
      m.duong[d] = kq.duong; tk[d] = kq.tk;
    }
    now += NGAY;
  }

  const tong = Object.values(tai).reduce((s, x) => s + x, 0);
  const tongLap = Object.values(lap).reduce((s, x) => s + x, 0);
  const trungVi = (a) => { const b = a.slice().sort((x, y) => x - y);
                           return b.length ? b[Math.floor(b.length / 2)] : 0; };
  const gc = {};
  for (const d of Srs.DUONG)
    gc[d] = trungVi(muc.filter((m) => m.duong[d]).map((m) => m.duong[d].ngay));
  let capThap = 0;
  for (const m of muc) if (Srs.capChung(m) <= 0) capThap++;

  return {
    tb: tong / soNgay,
    dinh: Math.max(...moiNgay),
    chia: Object.fromEntries(Srs.DUONG.map((d) => [d, tai[d] / tong * 100])),
    lapLai: (tongLap - (lap[1] || 0)) / tongLap * 100,
    gc, capThap: capThap / muc.length * 100,
    diem: muc.map((m) => Srs.diemTu(m).tong), muc
  };
}

let hong = 0, xong = 0;
function la(dieu, ten, them) {
  xong++;
  if (dieu) { console.log("  ✓ " + ten + (them ? "  (" + them + ")" : "")); return; }
  hong++;
  console.error("  ✗ " + ten + (them ? "  (" + them + ")" : ""));
}

const k = chay();
console.log("600 từ · 180 ngày · thêm 10 từ/ngày\n");

la(k.tb < 400, "trung bình dưới 400 thẻ/ngày", k.tb.toFixed(0));
la(k.dinh < 800, "ngày nặng nhất dưới 800 thẻ", String(k.dinh));
for (const d of Srs.DUONG)
  la(k.chia[d] < 40, "đường " + d + " chiếm dưới 40% hàng đợi", k.chia[d].toFixed(0) + "%");
la(k.lapLai < 35, "dưới 35% số từ bị hỏi từ 2 kiểu bài trở lên trong một buổi",
   k.lapLai.toFixed(0) + "%");
for (const d of ["dong", "trai"])
  la(k.gc[d] > 30, "giãn cách trung vị của " + d + " vượt 30 ngày", k.gc[d].toFixed(0) + " ngày");
la(k.capThap < 10, "dưới 10% số từ kẹt ở capChung ≤ 0", k.capThap.toFixed(0) + "%");
{
  const tb = k.diem.reduce((s, x) => s + x, 0) / k.diem.length;
  la(tb > 40 && tb < 95, "điểm trung bình nằm trong khoảng hợp lý", tb.toFixed(0) + "/100");
  la(k.diem.every((x) => x >= 0 && x <= 100), "mọi điểm nằm trong 0..100");
}
{
  // Rải tải phải hạ được đỉnh, và không được làm tăng tổng việc.
  const khong = chay({ raiTai: false });
  la(k.dinh <= khong.dinh, "rải tải hạ được ngày nặng nhất",
     khong.dinh + " → " + k.dinh);
  la(k.tb <= khong.tb * 1.05, "rải tải không làm tăng tổng số thẻ",
     khong.tb.toFixed(0) + " → " + k.tb.toFixed(0));
}
{
  // Sổ lớn cũng không được phình theo cấp số nhân.
  const lon = chay({ soTu: 1500, soNgay: 240 });
  la(lon.tb < 900, "sổ 1.500 từ vẫn dưới 900 thẻ/ngày", lon.tb.toFixed(0));
}

if (process.argv.includes("--bang")) {
  console.log("\nChia theo đường:",
    Srs.DUONG.map((d) => d + " " + k.chia[d].toFixed(0) + "%").join(" · "));
  console.log("Giãn cách trung vị:",
    Srs.DUONG.map((d) => d + " " + k.gc[d].toFixed(0) + "ng").join(" · "));
  const bac = {};
  for (const m of k.muc) { const t = Srs.diemTu(m).ten; bac[t] = (bac[t] || 0) + 1; }
  console.log("Mức tư duy:", JSON.stringify(bac));
}

console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " cổng TRƯỢT"
                          : "✓ " + xong + " cổng, tất cả đạt"));
process.exit(hong ? 1 : 0);
