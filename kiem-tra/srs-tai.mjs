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
new Function("self", fs.readFileSync(path.join(GOC, "extension/tu-lien.js"), "utf8"))(g);
const Srs = g.Srs, TuLien = g.TuLien;

/*
 * Đọc hai hằng số ôn-kèm THẲNG TỪ notebook.js.
 *
 * Bài này phải mô phỏng lại luật của `hangDoiKhoi`, mà chép tay hằng số sang
 * đây thì hôm nào ai đó nới `CUM_TOI_DA` lên, cổng đo tải vẫn xanh trong khi
 * app thật đã nặng gấp đôi — đúng kiểu hỏng mà bài kiểm không thấy.
 */
const NB = fs.readFileSync(path.join(GOC, "extension/notebook.js"), "utf8");
const hangSo = (ten) => {
  const m = NB.match(new RegExp("const\\s+" + ten + "\\s*=\\s*(\\d+)"));
  if (!m) throw new Error("không đọc được hằng số " + ten + " trong notebook.js");
  return parseInt(m[1], 10);
};
const CUM_TOI_DA = hangSo("CUM_TOI_DA"), CUM_NGHI_NGAY = hangSo("CUM_NGHI_NGAY");

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

/* ------------------------------------------------------------------ */
/*
 * ÔN KÈM CỤM làm tăng bao nhiêu thẻ mỗi ngày.
 *
 * Đây là cổng quan trọng nhất của việc ôn kèm: nó cho người học thứ họ muốn
 * (mấy từ gần nghĩa đi liền nhau) bằng cách ĐÁNH ĐỔI số thẻ mỗi buổi — mà số
 * thẻ mỗi buổi đúng là thứ vừa mới phải đi chữa. Đo trước khi tin.
 *
 * Luật ở đây mô phỏng `hangDoiKhoi` trong notebook.js; hai hằng số thì đọc
 * thẳng từ tệp ấy nên không lệch được.
 */
function chayCum(batCum, soTu) {
  let rnd = 12345;
  const r = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  const muc = [], tk = {}, nghi = {};
  let now = Date.now(), tong = 0;
  const moiNgay = [];
  // Mỗi từ nối với 2–4 từ lân cận — giống cảnh người học bấm "+ Lưu" ngay ở
  // màn kết quả bài liên kết, tức là cụm được dựng dần từ chính chỗ ấy.
  const mk = (i) => {
    const ban = [], n = 2 + Math.floor(r() * 3);
    for (let j = 1; j <= n; j++) if (i - j >= 0) ban.push("w" + (i - j));
    return { key: "k" + i, word: "w" + i, duong: {}, cauNghe: { cau: "x" },
             lien: { dong: ban.slice(0, 2), trai: ban.slice(2) } };
  };
  for (let ngay = 0; ngay < 180; ngay++) {
    while (muc.length < soTu && muc.length < (ngay + 1) * 10) muc.push(mk(muc.length));
    const ci = batCum ? TuLien.chiMucLien(muc) : null;
    const theoKhoa = new Map(muc.map((m) => [m.key, m]));
    const daKeo = new Set(), the = [];
    for (const m of muc) {
      const han = Srs.denHan(m, now);
      if (!han.length) continue;
      for (const d of han) the.push([m, d, false]);
      if (batCum && !daKeo.has(m.key) && now - (nghi[m.key] || 0) >= CUM_NGHI_NGAY * NGAY) {
        const ban = TuLien.cumCua(m, ci).map((k) => theoKhoa.get(k))
          .filter((x) => x && !daKeo.has(x.key))
          .sort((a, b) => Srs.diemTu(a).tong - Srs.diemTu(b).tong)
          .slice(0, CUM_TOI_DA);
        for (const b of ban) {
          const hb = Srs.denHan(b, now);
          the.push([b, hb[0] || "nhin", !hb.length]);
          daKeo.add(b.key);
        }
        if (ban.length) nghi[m.key] = now;
      }
      daKeo.add(m.key);
    }
    moiNgay.push(the.length);
    tong += the.length;
    for (const [m, d, laSom] of the) {
      const nho = r() < TILE[d];
      if (laSom && nho) continue;                  // ôn kèm mà nhớ: không xếp lịch lại
      const chat = (d === "dong" || d === "trai") ? (nho ? 0.5 + r() * 0.5 : 0.3) : undefined;
      const kq = Srs.cham(m.duong[d] || null, nho, NHIP[d] * (0.6 + r() * 0.9), tk[d],
                          now, d, r(), chat);
      m.duong[d] = kq.duong; tk[d] = kq.tk;
    }
    now += NGAY;
  }
  return { tb: tong / 180, dinh: Math.max(...moiNgay) };
}
{
  console.log("\n  — ôn kèm cụm (" + CUM_TOI_DA + " bạn · nghỉ " + CUM_NGHI_NGAY + " ngày) —");
  for (const soTu of [600, 1500]) {
    const tat = chayCum(false, soTu), bat = chayCum(true, soTu);
    const tang = (bat.tb / tat.tb - 1) * 100;
    la(tang <= 35, "sổ " + soTu + " từ: ôn kèm không làm tăng quá 35% số thẻ",
       tat.tb.toFixed(0) + " → " + bat.tb.toFixed(0) + " thẻ/ngày (+" + tang.toFixed(0) + "%)");
    la(bat.dinh <= tat.dinh * 1.45, "sổ " + soTu + " từ: ngày nặng nhất không phình quá 45%",
       tat.dinh + " → " + bat.dinh);
  }
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
