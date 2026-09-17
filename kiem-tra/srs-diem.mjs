/**
 * Thang 100 điểm và nhãn mức tư duy — chạy bằng node thuần, không cần trình duyệt.
 *
 *   node kiem-tra/srs-diem.mjs
 *
 * Bài này giữ hai bất biến quan trọng nhất của `srs.js`:
 *
 *   1. NHÃN KHÔNG BAO GIỜ NÓI QUÁ. Từ không có câu nguồn thì dù 100/100 cũng
 *      không được mang nhãn "Nghe ra". Đây là chỗ dễ hỏng nhất khi sau này có
 *      ai chỉnh lại cách leo thang, và hỏng thì không ai nhìn ra ngay — con số
 *      vẫn đẹp, chỉ là nó nói dối.
 *
 *   2. `capChung` / `gomSrs` KHÔNG ĐỔI so với bản đang chạy ngoài kia. Đồng bộ
 *      Drive, máy chủ MCP, bản extension cũ và app Android cũ đều đọc hai hàm
 *      này. So thẳng với `git show HEAD:extension/srs.js` nên không phải chép
 *      tay một bảng kết quả mong đợi rồi để nó mốc đi.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nap = (src) => { const g = {}; new Function("self", src)(g); return g.Srs; };

let hong = 0, xong = 0;
function la(dieu, ten, them) {
  xong++;
  if (dieu) return;
  hong++;
  console.error("  ✗ " + ten + (them ? "\n      " + them : ""));
}
function nhom(ten) { console.log("\n" + ten); }

/* ------------------------------------------------------------------ */
/* Hai bản srs.js phải giống nhau từng byte                            */
/* ------------------------------------------------------------------ */
nhom("Hai bản srs.js");
const sExt = fs.readFileSync(path.join(GOC, "extension/srs.js"), "utf8");
const sAnd = fs.readFileSync(path.join(GOC, "android/www/srs.js"), "utf8");
la(sExt === sAnd, "extension/srs.js và android/www/srs.js giống nhau từng byte",
   "lệch " + Math.abs(sExt.length - sAnd.length) + " ký tự — quên chép sang một bên");

const Srs = nap(sExt);

/* ------------------------------------------------------------------ */
/* Bộ mẫu                                                              */
/* ------------------------------------------------------------------ */
const CO_NGHE = { cauNghe: { cau: "これは例文です" } };
const CO_LIEN = { lien: { dong: ["a", "b", "c"], trai: ["z"] } };
const du = (o) => Object.assign({}, CO_NGHE, CO_LIEN, o);

const MAU = {
  "chưa học":            du({ duong: {} }),
  "đủ 4 đường":          du({ duong: { nhin: { ngay: 120 }, nghe: { ngay: 60 },
                                       dong: { ngay: 30 }, trai: { ngay: 30 } } }),
  "chỉ nhìn, chạm trần": { duong: { nhin: { ngay: 365 } } },
  "không có nghe":       Object.assign({}, CO_LIEN,
                           { duong: { nhin: { ngay: 120 }, dong: { ngay: 60 }, trai: { ngay: 60 } } }),
  "chỉ có lv đời cũ":    { duong: { nhin: { lv: 4 } } },
  "ngay hỏng (NaN)":     { duong: { nhin: { ngay: NaN, lv: 3 } } },
  "lv ngoài thang":      { duong: { nhin: { lv: 99 } } },
  "số âm":               { duong: { nhin: { ngay: -5 } } },
  "duong rỗng":          du({}),
  "muc rỗng":            {},
};

/* ------------------------------------------------------------------ */
nhom("diemDuong — bám đúng thang MOC");
la(Srs.diemDuong(0) === 0, "0 ngày = 0 điểm");
la(Srs.diemDuong(365) === 100, "365 ngày = 100 điểm");
la(Srs.diemDuong(1000) === 100, "quá trần vẫn kẹp ở 100");
la(Srs.diemDuong(-3) === 0, "số âm = 0");
la(Srs.diemDuong(NaN) === 0, "NaN = 0");
{
  // Mỗi bậc MOC cách nhau khoảng đều — đây là lý do chọn hàm log.
  const d = Srs.MOC.map(Srs.diemDuong);
  let deu = true;
  for (let i = 1; i < d.length; i++) { const b = d[i] - d[i - 1]; if (b < 8 || b > 16) deu = false; }
  la(deu, "mỗi bậc MOC cách nhau 8–16 điểm", d.join(" "));
  la(d.every((x, i) => i === 0 || x > d[i - 1]), "điểm tăng đều theo thang");
}

/* ------------------------------------------------------------------ */
nhom("diemTu — không bao giờ ném lỗi, không bao giờ trả NaN");
for (const [ten, m] of Object.entries(MAU)) {
  let d = null, loi = null;
  try { d = Srs.diemTu(m); } catch (e) { loi = e; }
  la(!loi, "\"" + ten + "\" không ném lỗi", loi && loi.message);
  if (!d) continue;
  la(Number.isFinite(d.tong) && d.tong >= 0 && d.tong <= 100,
     "\"" + ten + "\" điểm nằm trong 0..100", "được " + d.tong);
  la(typeof d.ten === "string" && d.ten.length > 0, "\"" + ten + "\" có nhãn");
  for (const t of Srs.DUONG)
    la(d.phan[t] === null || Number.isFinite(d.phan[t]),
       "\"" + ten + "\" phần " + t + " là số hoặc null", String(d.phan[t]));
}

/* ------------------------------------------------------------------ */
nhom("Từ thiếu đường vẫn lên được 100");
{
  const d = Srs.diemTu(MAU["chỉ nhìn, chạm trần"]);
  la(d.tong === 100, "từ chỉ có đường nhìn, giãn cách chạm trần → 100/100", "được " + d.tong);
  la(d.phan.nghe === null && d.phan.dong === null,
     "đường không có thì là null, không phải 0");
}

/* ------------------------------------------------------------------ */
nhom("NHÃN KHÔNG NÓI QUÁ — bất biến quan trọng nhất");
{
  const d = Srs.diemTu(MAU["chỉ nhìn, chạm trần"]);
  la(d.ten !== "Nghe ra" && d.ten !== "Gọi ra được lúc cần",
     "từ chỉ có đường nhìn, dù 100/100, không được mang nhãn nghe/gọi-ra",
     "nhãn đang là \"" + d.ten + "\"");
  la(d.ten === "Thuộc mặt chữ", "nó phải dừng ở \"Thuộc mặt chữ\"", d.ten);
}
{
  // Nhãn không được gọi tên một chiều nằm trong chuaDo.
  for (const [ten, m] of Object.entries(MAU)) {
    const d = Srs.diemTu(m);
    if (d.chuaDo.indexOf("tai") >= 0)
      la(d.ten !== "Nghe ra", "\"" + ten + "\": chưa đo tai thì không được là \"Nghe ra\"");
    if (d.chuaDo.indexOf("mạng nghĩa") >= 0)
      la(d.ten !== "Gọi ra được lúc cần",
         "\"" + ten + "\": chưa đo mạng nghĩa thì không được là \"Gọi ra được lúc cần\"");
  }
}
{
  // Chiều ngược lại: không có câu nghe nhưng mạng nghĩa mạnh thì KHÔNG được kẹt.
  const d = Srs.diemTu(MAU["không có nghe"]);
  la(d.bac === 4, "không có câu nghe nhưng đồng/trái mạnh → vẫn lên được bậc cuối",
     "bậc " + d.bac + " (" + d.ten + ")");
  la(d.chuaDo.indexOf("tai") >= 0, "và phải ghi rõ là chưa đo được tai");
}
{
  // Đường có nhưng YẾU thì phải chặn, không được bước qua như đường vắng mặt.
  const m = du({ duong: { nhin: { ngay: 120 }, nghe: { ngay: 1 },
                          dong: { ngay: 120 }, trai: { ngay: 120 } } });
  const d = Srs.diemTu(m);
  la(d.ten === "Thuộc mặt chữ",
     "đường nghe CÓ mà yếu thì chặn ở \"Thuộc mặt chữ\", dù đồng/trái đã mạnh", d.ten);
}

/* ------------------------------------------------------------------ */
nhom("Điểm không đi lùi khi MO_NGAY mở thêm đường");
{
  // Từ mới: chỉ đường nhìn được mở, nhưng ba đường kia ĐÃ TỒN TẠI.
  const truoc = du({ duong: { nhin: { ngay: 1.9 } } });
  const sau   = du({ duong: { nhin: { ngay: 2.1 } } });
  la(Srs.diemTu(sau).tong >= Srs.diemTu(truoc).tong,
     "qua mốc MO_NGAY thì điểm không được tụt",
     Srs.diemTu(truoc).tong + " → " + Srs.diemTu(sau).tong);
}

/* ------------------------------------------------------------------ */
nhom("hoSo đọc cùng một thang với diemTu");
for (const [ten, m] of Object.entries(MAU)) {
  const h = Srs.hoSo(m), d = Srs.diemTu(m);
  la(JSON.stringify(h) === JSON.stringify(d.phan), "\"" + ten + "\" hoSo khớp diemTu.phan");
}

/* ------------------------------------------------------------------ */
nhom("Lượt ĐÚNG không bao giờ làm giãn cách ngắn lại");
{
  // Đây là nguyên tắc srs.js tự đặt ra, và là lỗi mà bản này đi sửa.
  const now = Date.now();
  let te = 0;
  for (const duong of ["dong", "trai"]) {
    for (const chat of [0.5, 0.6, 0.75, 0.9, 1]) {
      const cu = { ngay: 30, net: 2.1, lv: 4, ts: now - 30 * 86400000 };
      // net thấp nhất + xáo thấp nhất = trường hợp xấu nhất có thể
      const kq = Srs.cham({ ngay: 30, net: 1.0, lv: 4, ts: cu.ts }, true, 14000,
                          { n: 30, tb: 14000, m2: Math.pow(4000, 2) * 29 }, now, duong, 0, chat);
      if (kq.ngay < 30 * 0.88) te++;      // 0,9 là đáy của xáo ±10%
    }
  }
  la(te === 0, "mọi lượt ĐÚNG ở hai bài liên kết đều không co giãn cách lại",
     te + " trường hợp bị co");
}

/* ------------------------------------------------------------------ */
nhom("Mức tụt lúc quên theo từng đường");
{
  const now = Date.now();
  const tut = (d) => Srs.cham({ ngay: 100, net: 2.5, lv: 6, ts: now }, false, 0, null, now, d).ngay;
  const g = Srs.cham({ ngay: 100, net: 2.5, lv: 6, ts: now }, false, 0, null, now, "dong").duong.ngay;
  la(g > 100 * 0.4 && g < 100 * 0.5, "bài liên kết quên → còn ~45 ngày", "được " + g);
  const n = Srs.cham({ ngay: 100, net: 2.5, lv: 6, ts: now }, false, 0, null, now, "nhin").duong.ngay;
  la(n > 100 * 0.2 && n < 100 * 0.26, "đường nhìn giữ nguyên mức tụt cũ (~23 ngày)", "được " + n);
  const k = Srs.cham({ ngay: 100, net: 2.5, lv: 6, ts: now }, false, 0, null, now).duong.ngay;
  la(k === n, "không truyền `duong` thì chạy y như bản cũ", "được " + k);
  void tut;
}

/* ------------------------------------------------------------------ */
nhom("Rải tải — né ngày đông, không bao giờ hoãn quá hạn");
{
  const now = Date.now();
  const NGAY = 86400000;
  // Dựng một lịch mà ngày đúng-hạn đang rất đông.
  const goc = Srs.hanSauNgay(30, now);
  const lich = new Map([[Math.floor(goc / NGAY), 500]]);
  const moi = Srs.raiTai(30, lich, now);
  la(moi !== goc, "ngày đã đông thì phải dời đi");
  la(Math.abs(moi - goc) <= 30 * Srs.RAI_RONG * NGAY + NGAY,
     "nhưng chỉ dời trong ±15%", "dời " + Math.round((moi - goc) / NGAY) + " ngày");
  la(Srs.raiTai(30, null, now) === goc, "không có lịch thì giữ nguyên ngày gốc");
  la(Srs.raiTai(1, lich, now) === Srs.hanSauNgay(1, now),
     "thẻ hẹn gần (< " + Srs.RAI_TOI_THIEU + " ngày) thì không rải");
  for (const n of [0.25, 1, 3, 7, 30, 120, 365])
    la(Srs.raiTai(n, lich, now) > now, "hẹn " + n + " ngày không bao giờ rơi vào quá khứ");
}
{
  const m = [{ duong: { nhin: { due: 100 * 86400000 }, nghe: { due: 100 * 86400000 } } },
             { duong: { nhin: { due: 100 * 86400000 } } },
             { del: true, duong: { nhin: { due: 100 * 86400000 } } }];
  const l = Srs.lichHen(m);
  la(l.get(100) === 3, "lichHen đếm theo ĐƯỜNG và bỏ qua mục đã xoá", "được " + l.get(100));
  la(Srs.lichHen(null).size === 0, "lichHen(null) không nổ");
}

/* ------------------------------------------------------------------ */
/* Tương thích ngược: capChung / gomSrs phải y hệt bản đang chạy       */
/* ------------------------------------------------------------------ */
nhom("Tương thích ngược với bản ở HEAD");
{
  let cu = null;
  try {
    cu = nap(execSync("git show HEAD:extension/srs.js", { cwd: GOC, maxBuffer: 1e8 }).toString());
  } catch (e) {
    console.log("  (bỏ qua — không đọc được HEAD: " + e.message.split("\n")[0] + ")");
  }
  if (cu) {
    for (const [ten, m] of Object.entries(MAU)) {
      la(JSON.stringify(cu.capChung(m)) === JSON.stringify(Srs.capChung(m)),
         "\"" + ten + "\" capChung không đổi",
         cu.capChung(m) + " → " + Srs.capChung(m));
      la(JSON.stringify(cu.gomSrs(m)) === JSON.stringify(Srs.gomSrs(m)),
         "\"" + ten + "\" gomSrs không đổi",
         JSON.stringify(cu.gomSrs(m)) + " → " + JSON.stringify(Srs.gomSrs(m)));
    }
    for (const t of ["DUONG", "MOC", "TEN_DUONG"])
      la(JSON.stringify(cu[t]) === JSON.stringify(Srs[t]), t + " không đổi");
  }
}

/* ------------------------------------------------------------------ */
console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " khẳng định TRƯỢT"
                          : "✓ " + xong + " khẳng định, tất cả đạt"));
process.exit(hong ? 1 : 0);
