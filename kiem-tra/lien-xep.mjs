/**
 * MÀN KẾT QUẢ BÀI LIÊN KẾT — chạy bằng node thuần.
 *
 *   node kiem-tra/lien-xep.mjs
 *
 * Bài này sinh ra từ một lỗi có thật: màn kết quả được dựng lại ở bản
 * extension, còn bản Android thì không ai đụng tới — và nó tụt lại suốt mấy
 * tháng mà chẳng có gì đỏ, vì chẳng có gì canh hai bản phải làm cùng một việc.
 *
 * Nên bài chốt hai thứ:
 *
 *   1. QUY TẮC XẾP NHÓM nằm ở `tu-lien.js` và chỉ có MỘT bản. Chừng nào nó còn
 *      là hàm dùng chung thì hai màn hình không lệch nhau được nữa.
 *
 *   2. CỔNG CẤU TRÚC cho bản Android: đủ hàm, đủ thẻ, đủ lớp CSS, đủ bản dịch.
 *      Thô, nhưng đây là thứ duy nhất với tới được — app Android không nạp
 *      được vào trình duyệt ở đây để bấm thật như bản extension.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = (p) => fs.readFileSync(path.join(GOC, p), "utf8");
const nap = (src) => { const g = {}; new Function("self", src)(g); return g.TuLien; };

let hong = 0, xong = 0;
function la(dieu, ten, them) {
  xong++;
  if (dieu) { console.log("  ✓ " + ten + (them ? "  (" + them + ")" : "")); return; }
  hong++;
  console.error("  ✗ " + ten + (them ? "  (" + them + ")" : ""));
}

/* ------------------------------------------------------------------ */
console.log("Một bản quy tắc duy nhất");
const sExt = doc("extension/tu-lien.js");
const sAnd = doc("android/www/tu-lien.js");
la(sExt === sAnd, "hai bản tu-lien.js giống nhau từng byte",
   "lệch " + Math.abs(sExt.length - sAnd.length) + " ký tự");
const TL = nap(sExt);
la(typeof TL.xepKetQua === "function", "tu-lien.js có xuất xepKetQua");
for (const [ten, p] of [["extension", "extension/notebook.js"], ["android", "android/www/app.js"]]) {
  la(/window\.TuLien\.xepKetQua\(/.test(doc(p)), ten + " gọi hàm dùng chung chứ không tự xếp lấy");
}

/** Dựng một bài đã chấm. */
const bai = (o, dung, chon) => ({ o: o, dung: new Set(dung), chon: new Set(chon) });

/* ------------------------------------------------------------------ */
console.log("\nBa nhóm, chia đúng");
{
  //  A,B,C là đáp án; đã nhặt B và D.  → bỏ sót A,C · nhặt nhầm D · nhiễu E
  const r = TL.xepKetQua(bai(["A", "B", "C", "D", "E"], ["A", "B", "C"], ["B", "D"]));
  la(r.dapAn.join() === "A,C,B", "đáp án: BỎ SÓT lên trước, ô đã nhặt đúng xuống sau",
     r.dapAn.join());
  la(r.nhatNham.join() === "D", "nhặt nhầm: nhặt mà không phải đáp án", r.nhatNham.join());
  la(r.nhieu.join() === "E", "nhiễu: không phải đáp án, cũng không nhặt", r.nhieu.join());
}
{
  // Làm ĐÚNG HẾT thì không có nhóm nhặt nhầm, và không có ô nào mang dấu bỏ sót.
  const r = TL.xepKetQua(bai(["A", "B", "C"], ["A", "B"], ["A", "B"]));
  la(r.nhatNham.length === 0, "làm đúng hết: không có nhóm nhặt nhầm");
  la(r.dapAn.join() === "A,B", "đáp án giữ nguyên thứ tự khi không sót ô nào", r.dapAn.join());
}
{
  // Không nhặt gì cả: mọi đáp án đều là bỏ sót.
  const r = TL.xepKetQua(bai(["A", "B", "C"], ["A", "B"], []));
  la(r.dapAn.join() === "A,B" && r.nhatNham.length === 0, "bỏ trắng: tất cả đáp án là bỏ sót");
}

/* ------------------------------------------------------------------ */
console.log("\nKhông rơi ô nào, cũng không nhân đôi");
{
  /*
   * Đây là bất biến quan trọng nhất của việc chia nhóm, và cũng là thứ dễ hỏng
   * nhất khi sau này có ai chỉnh lại điều kiện lọc: màn kết quả CỐ Ý bày hết
   * mọi ô, kể cả từ nhiễu — vì nhiễu lấy từ chính sổ tay người học, gặp từ hay
   * thì lưu ngay tại đó. Lọt một ô là mất một cơ hội học mà không ai biết.
   */
  const o = [];
  for (let i = 0; i < 16; i++) o.push("w" + i);
  const dung = o.filter((_, i) => i % 3 === 0);
  const chon = o.filter((_, i) => i % 4 === 0);
  const r = TL.xepKetQua(bai(o, dung, chon));
  const gop = r.dapAn.concat(r.nhatNham, r.nhieu);
  la(gop.length === o.length, "tổng ba nhóm đúng bằng số ô ban đầu",
     gop.length + " / " + o.length);
  la(new Set(gop).size === gop.length, "không ô nào lọt vào hai nhóm");
  la(o.every((c) => gop.indexOf(c) >= 0), "không ô nào bị rơi");
}

/* ------------------------------------------------------------------ */
console.log("\nDữ liệu thiếu hoặc hỏng thì không nổ");
for (const [ten, b] of Object.entries({
  "bài null": null,
  "bài rỗng": {},
  "o không phải mảng": { o: "ABC", dung: new Set(), chon: new Set() },
  "dung không phải Set": { o: ["A"], dung: ["A"], chon: new Set() },
  "chon null": { o: ["A"], dung: new Set(["A"]), chon: null },
  "o có phần tử rỗng": { o: ["A", "", null], dung: new Set(["A"]), chon: new Set() }
})) {
  let loi = null, r = null;
  try { r = TL.xepKetQua(b); } catch (e) { loi = e; }
  la(!loi, "\"" + ten + "\" không ném lỗi", loi && loi.message);
  la(!loi && r && Array.isArray(r.dapAn) && Array.isArray(r.nhatNham) && Array.isArray(r.nhieu),
     "\"" + ten + "\" vẫn trả về ba mảng");
}

/* ------------------------------------------------------------------ */
console.log("\nBản Android đã dựng màn kết quả");
{
  const j = doc("android/www/app.js");
  for (const [ten, re] of [
    ["veKetQuaLien", /function veKetQuaLien\(/],
    ["hangLien", /function hangLien\(/],
    ["nghiaDs — lấy nghĩa mà không cần nền", /async function nghiaDs\(/],
    ["luuNhanhTu — lưu một từ chỉ với con chữ", /async function luuNhanhTu\(/]
  ]) la(re.test(j), "app.js có " + ten);

  la(/veKetQuaLien\(b, dung, ms\)/.test(j), "xongBaiLien gọi màn kết quả");
  /*
   * Bản cũ tự nhảy thẻ sau 2 giây — hợp lý khi màn kết quả chỉ là một dòng
   * chữ, nhưng giờ nó là danh sách có nghĩa từng từ và nút Lưu. Tự nhảy giữa
   * lúc đang bấm Lưu là mất luôn thao tác ấy.
   */
  la(!/setTimeout\(\(\) => mung\(moi, showCard\), 2000\)/.test(j),
     "KHÔNG còn tự nhảy thẻ sau 2 giây");
  la(/tiepBaiLien/.test(j) && /\$\("stLienTiep"\)/.test(j), "đổi sang nút Tiếp");
  // Lớp `kq` đổi cả bố cục khung; sót lại là bài sau mở ra đã mang sẵn bố cục
  // danh sách trước khi có gì để bày.
  la(/classList\.remove\("kq"\)/.test(j), "dọn lớp kq khi rời bài liên kết");
  // Bên extension đọc `items` toàn cục; bên Android biến ấy nằm trong thân hàm
  // vẽ danh sách, nên chép thẳng sang là ném "items is not defined".
  la(/for \(const x of mucDaLuu\)/.test(j), "đọc sổ qua mucDaLuu, không phải items");
}
{
  const h = doc("android/www/index.html");
  la(/id="stLienTiep"/.test(h), "index.html có nút Tiếp");
  la(/class="lien-day"/.test(h), "nút Tiếp nằm trong thanh dính đáy");
  const iDay = h.indexOf('class="lien-day"');
  const iKq = h.indexOf('id="stLienKq"');
  la(iDay >= 0 && iKq > iDay, "điểm số cũng nằm trong thanh ấy, không rơi lại phía trên");
}
{
  const c = doc("android/www/ui.css");
  for (const k of [".lien-o.kq", ".lien-hang", ".lien-tu.dung", ".lien-tu.sai", ".lien-tu.sot",
                   ".lien-nghia", ".lien-nhom", ".lien-nhom.dap", ".lien-nhom.nham", ".lien-day"]) {
    la(c.indexOf(k) >= 0, "ui.css có " + k);
  }
  /*
   * Mốc dính của thanh đáy phải KHÁC bản extension, và khác có lý do.
   *
   * Bên kia buổi học cuộn trong `.stwrap` đệm đều 20px, không có gì che đáy.
   * Bên này khung cuộn là `main`, mà đáy màn có thanh `nav` CỐ ĐỊNH. Mốc dính
   * tính theo khung nhìn chứ không trừ đệm — nên chép `bottom: -20px` sang là
   * nút Tiếp nằm ngay dưới thanh nav, bấm không tới.
   */
  la(/#stLienO\.kq ~ \.lien-day\s*\{[^}]*bottom:\s*calc\(env\(safe-area-inset-bottom\) \+ 84px\)/.test(c),
     "thanh đáy dính TRÊN thanh nav, không chép mốc của bản extension");
  la(!/#stLienO\.kq ~ \.lien-day\s*\{[^}]*bottom:\s*-20px/.test(c),
     "và đúng là không còn mốc -20px của bản kia");
}
{
  /*
   * Ngoặc CSS phải cân. Không phải chuyện hình thức: một khối `@media` quên
   * đóng thì MỌI THỨ phía sau nó rơi vào trong, tức là chỉ áp dụng ở một cỡ
   * màn hình. Đúng lỗi đã có thật trong tệp này — 635 dòng cuối bị nuốt vào
   * một `@media (max-width: 480px)`, nên trên máy màn rộng thì nửa bảng kiểu
   * biến mất mà chẳng có gì báo.
   */
  const dem = (t) => {
    let d = 0, i = 0;
    while (i < t.length) {
      const c = t[i];
      if (c === "/" && t[i + 1] === "*") { const j = t.indexOf("*/", i + 2); i = j < 0 ? t.length : j + 2; continue; }
      if (c === '"' || c === "'") { const q = c; i++; while (i < t.length && t[i] !== q) { if (t[i] === "\\") i++; i++; } i++; continue; }
      if (c === "{") d++; if (c === "}") d--;
      i++;
    }
    return d;
  };
  for (const p of ["android/www/ui.css", "extension/ui.css"]) {
    la(dem(doc(p)) === 0, p + ": ngoặc cân, không khối nào quên đóng", "còn mở " + dem(doc(p)));
  }
}
{
  const need = ["+ Lưu", "Đã có", "Đang lưu…", "Đã lưu", "Không lưu được từ này",
                "Tiếp", "Đáp án", "Nhặt nhầm", "Từ nhiễu — gặp thì học luôn",
                "Nhặt được {a}/{b} · {t} giây"];
  for (const p of ["extension/chu-bang.js", "android/www/chu-bang.js"]) {
    const g = {}; new Function("self", doc(p))(g);
    const B = g.CHU_BANG;
    const thieu = need.filter((k) => !B.en[k] || !B.ja[k]);
    la(thieu.length === 0, p + ": dịch đủ en + ja", thieu.join(" | "));
  }
}

/* ------------------------------------------------------------------ */
console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " khẳng định TRƯỢT"
                          : "✓ " + xong + " khẳng định, tất cả đạt"));
process.exit(hong ? 1 : 0);
