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
/*
 * THU TẬP LIÊN KẾT CỦA TỪ DẪN XUẤT.
 *
 * Trước đây mọi mục vừa lưu đều được dựng tập đồng/trái nghĩa riêng từ từ
 * điển — kể cả mục lưu ra từ màn kết quả bài liên kết. Nên từ dẫn xuất lại đẻ
 * tập mới, tập mới lại đẻ từ dẫn xuất, và kho từ phình ra theo cấp số nhân mà
 * chẳng nắm chắc trường nghĩa nào.
 *
 * Bất biến CỨNG của bài này: KHÔNG một từ nào ngoài tập ban đầu được lọt vào,
 * dù từ điển trả về thứ gì. Đó là thứ duy nhất chặn được vòng phình ấy, và nó
 * hỏng âm thầm — sổ vẫn chạy, chỉ là mỗi tuần lại dày thêm.
 */
console.log("\nThu tập liên kết của từ DẪN XUẤT");
la(typeof TL.locTheoCum === "function", "tu-lien.js có xuất locTheoCum");
for (const [ten, p] of [["extension", "extension/background.js"], ["android", "android/www/app.js"]]) {
  la(/locTheoCum\(/.test(doc(p)), ten + " gọi hàm dùng chung chứ không tự lọc lấy");
}

const MUC_GOC = { word: "改善", lien: { dong: ["改良", "向上"], trai: ["改悪"] } };

{
  // Từ điển trả về cả đống thứ ngoài tập ban đầu.
  const r = TL.locTheoCum(
    { dong: ["向上", "進歩", "発展", "改善"], trai: ["改悪", "悪化", "低下"] },
    "改良", MUC_GOC, "dong");
  la(r.dong.indexOf("進歩") < 0 && r.dong.indexOf("発展") < 0,
     "từ MỚI mà từ điển thêm vào thì bị bỏ", r.dong.join(","));
  la(r.trai.indexOf("悪化") < 0 && r.trai.indexOf("低下") < 0,
     "kể cả ở phía trái nghĩa", r.trai.join(","));
  la(r.dong.indexOf("向上") >= 0, "anh em trong tập ban đầu ĐƯỢC từ điển xác nhận thì giữ");
  la(r.trai.indexOf("改悪") >= 0, "trái nghĩa của gốc cũng vậy");
  const gop = r.dong.concat(r.trai);
  const von = new Set(["改善", "改良", "向上", "改悪"]);
  la(gop.every((x) => von.has(x)), "MỌI từ giữ lại đều nằm trong vốn ban đầu", gop.join(","));
}
{
  // Anh em KHÔNG được từ điển xác nhận thì không vào, dù nằm trong tập ban đầu.
  const r = TL.locTheoCum({ dong: [], trai: [] }, "改良", MUC_GOC, "dong");
  la(r.dong.indexOf("向上") < 0, "anh em không được xác nhận thì KHÔNG tự vào", r.dong.join(","));
  la(r.dong.indexOf("改善") >= 0, "nhưng nối ngược về GỐC thì luôn còn", r.dong.join(","));
}
{
  // Cực do THAO TÁC LƯU quyết định, không phải do từ điển.
  const r = TL.locTheoCum({ dong: [], trai: ["改善"] }, "改良", MUC_GOC, "dong");
  la(r.dong.indexOf("改善") >= 0 && r.trai.indexOf("改善") < 0,
     "từ điển xếp gốc nhầm cực thì cực của thao tác lưu thắng",
     "dong=" + r.dong.join(",") + " trai=" + r.trai.join(","));
}
{
  const r = TL.locTheoCum({ dong: ["悪化"], trai: ["改善", "改良"] }, "改悪", MUC_GOC, "trai");
  la(r.trai.indexOf("改善") >= 0, "lưu từ tập TRÁI nghĩa thì gốc nằm bên trái nghĩa");
  la(r.dong.indexOf("改善") < 0, "và KHÔNG nằm cả hai bên — một đáp án không được đúng ở cả hai đề");
  la(r.trai.indexOf("改良") >= 0, "anh em được xác nhận vẫn vào đúng bên từ điển nói");
  la(r.dong.indexOf("悪化") < 0, "còn từ mới thì vẫn bị bỏ", r.dong.join(","));
}
{
  // Gốc đã bị xoá khỏi sổ: vốn chỉ còn chính nó.
  const r = TL.locTheoCum({ dong: ["向上", "進歩"], trai: [] }, "改良", { word: "改善" }, "dong");
  la(r.dong.join() === "改善", "gốc bị xoá thì vốn còn mỗi gốc, không rước thêm ai",
     r.dong.join(","));
}
{
  // Chính nó không bao giờ tự nối vào mình.
  const r = TL.locTheoCum({ dong: ["改良", "改善"], trai: [] }, "改良", MUC_GOC, "dong");
  la(r.dong.indexOf("改良") < 0, "không tự nối vào chính mình", r.dong.join(","));
}
console.log("  — dữ liệu thiếu hoặc hỏng —");
for (const [ten, arg] of Object.entries({
  "ra null": [null, "改良", MUC_GOC, "dong"],
  "gốc null": [{ dong: ["x"] }, "改良", null, "dong"],
  "gốc không có lien": [{ dong: ["改善"] }, "改良", { word: "改善" }, "dong"],
  "lien không phải mảng": [{ dong: ["改善"] }, "改良", { word: "改善", lien: { dong: "改良" } }, "dong"],
  "ben lạ": [{ dong: ["向上"] }, "改良", MUC_GOC, "xyz"],
  "tất cả rỗng": [{}, "", {}, ""]
})) {
  let loi = null, r = null;
  try { r = TL.locTheoCum(arg[0], arg[1], arg[2], arg[3]); } catch (e) { loi = e; }
  la(!loi, "\"" + ten + "\" không ném lỗi", loi && loi.message);
  la(!loi && r && Array.isArray(r.dong) && Array.isArray(r.trai),
     "\"" + ten + "\" vẫn trả về hai mảng");
}

/* ------------------------------------------------------------------ */
/*
 * BỎ MỘT TỪ KHỎI LIÊN KẾT — theo ý người học.
 *
 * Từ điển máy đưa ra không ít cặp vô lý (WordNet gộp mọi nghĩa, vòng dịch
 * ngược thì trả cả danh sách ứng viên). Người học phải có đường gạt đi, và gạt
 * rồi thì nó phải biến mất HẲN — kể cả khỏi phép đánh giá.
 *
 * Bất biến cứng: đánh giá ấy được cất RIÊNG (`lienBo`), không chỉ xoá khỏi
 * `lien`. Xoá trơ thì từ ấy quay lại được qua nạp CSV, đồng bộ Drive từ máy
 * chưa cập nhật, hoặc chính mục ấy bị xoá rồi lưu lại. Người học đã xét một
 * lần thì đừng bắt xét lại.
 */
console.log("\nBỏ một từ khỏi liên kết");
la(typeof TL.boLien === "function" && typeof TL.locBo === "function",
   "tu-lien.js có xuất boLien và locBo");
{
  const m = { word: "改善", lien: { dong: ["改良", "向上"], trai: ["改悪"] } };
  const r = TL.boLien(m, "向上");
  la(r.lien.dong.join() === "改良", "từ bị bỏ biến khỏi tập đồng nghĩa", r.lien.dong.join(","));
  la(r.lien.trai.join() === "改悪", "tập bên kia không bị đụng", r.lien.trai.join(","));
  la(r.lienBo.join() === "向上", "và được ghi vào sổ đen", r.lienBo.join(","));
  la(!m.lien.dong.includes("改良") === false && m.lien.dong.length === 2,
     "KHÔNG sửa tại chỗ mục gốc — chỗ gọi tự quyết ghi hay không", m.lien.dong.join(","));
}
{
  // Bỏ ở tập TRÁI nghĩa cũng vậy, và sổ đen cộng dồn chứ không ghi đè.
  const m = { word: "改善", lien: { dong: ["改良"], trai: ["改悪"] }, lienBo: ["向上"] };
  const r = TL.boLien(m, "改悪");
  la(r.lien.trai.length === 0, "bỏ được cả từ trái nghĩa", r.lien.trai.join(","));
  la(r.lienBo.join() === "向上,改悪", "sổ đen cộng dồn", r.lienBo.join(","));
}
{
  const m = { word: "改善", lien: { dong: ["改良"] }, lienBo: ["改良"] };
  la(TL.boLien(m, "改良").lienBo.join() === "改良", "bỏ lại từ đã bỏ thì không ghi trùng");
}
{
  /*
   * Đây mới là chốt thật: dựng lại tập thì từ đã bỏ KHÔNG được quay về.
   *
   * `lien` bị dựng lại ở nhiều đường — lưu đè một mục, nạp CSV, mục bị xoá rồi
   * lưu lại. Chỉ xoá khỏi `lien` mà không có sổ đen thì mấy đường ấy lặng lẽ
   * trả từ ấy về, và người học thấy nó hiện ra lại mà chẳng hiểu vì sao.
   */
  const r = TL.locBo({ dong: ["改良", "向上", "進歩"], trai: ["改悪", "悪化"] }, ["向上", "改悪"]);
  la(r.dong.join() === "改良,進歩", "lọc đúng ở tập đồng nghĩa", r.dong.join(","));
  la(r.trai.join() === "悪化", "và ở tập trái nghĩa", r.trai.join(","));
}
la(TL.locBo({ dong: ["a"], trai: ["b"] }, []).dong.join() === "a", "sổ đen rỗng thì giữ nguyên");
console.log("  — dữ liệu thiếu hoặc hỏng —");
for (const [ten, arg] of Object.entries({
  "boLien(null, null)": () => TL.boLien(null, null),
  "boLien mục rỗng": () => TL.boLien({}, "x"),
  "boLien lien không phải mảng": () => TL.boLien({ lien: { dong: "x" } }, "x"),
  "boLien lienBo không phải mảng": () => TL.boLien({ lienBo: "x" }, "y"),
  "locBo(null, null)": () => TL.locBo(null, null),
  "locBo sổ đen có phần tử rỗng": () => TL.locBo({ dong: ["a"] }, ["", null, "a"])
})) {
  let loi = null, r = null;
  try { r = arg(); } catch (e) { loi = e; }
  la(!loi, "\"" + ten + "\" không ném lỗi", loi && loi.message);
  la(!loi && r && typeof r === "object", "\"" + ten + "\" vẫn trả về đối tượng");
}
{
  // Chỗ DỰNG phải gọi locBo — không phải chỗ đọc. Quên một màn là từ đã bỏ
  // lại hiện ra, mà lỗi ấy không làm vỡ gì để ai đó nhận ra.
  la(/locBo\(ra, e\.lienBo\)/.test(doc("extension/background.js")),
     "background.js lọc sổ đen ngay ở chỗ dựng tập");
  la(/locBo\(ra, e\.lienBo\)/.test(doc("android/www/app.js")),
     "app.js cũng vậy");
  for (const [ten, p] of [["extension", "extension/notebook.js"], ["android", "android/www/app.js"]]) {
    la(/function boTuLien\(/.test(doc(p)), ten + " có hàm boTuLien");
    la(/lienmang-bo/.test(doc(p)), ten + " có dựng nút bỏ trong khối mạng nghĩa");
  }
  for (const [ten, p] of [["extension", "extension/ui.css"], ["android", "android/www/ui.css"]]) {
    la(/\.lienmang-bo/.test(doc(p)) && /\.toast-nut/.test(doc(p)), ten + " ui.css có kiểu cho nút bỏ và nút hoàn tác");
  }
  // Đánh giá của người học phải sống qua bia mộ — cùng hạng với ghi chú.
  la(/t\.lienBo = it\.lienBo/.test(doc("extension/muc.js")), "biaMo giữ lại sổ đen khi xoá mục");
  la(doc("extension/muc.js") === doc("android/www/muc.js"), "hai bản muc.js giống nhau từng byte");
}

/* ------------------------------------------------------------------ */
/*
 * Từ dẫn xuất KHÔNG được gọi mạng để đi tìm từ mới.
 *
 * Tầng dịch-ngược chính là cỗ máy đẻ từ mới: nó trả về cả danh sách ứng viên
 * cho cùng một ý. Ở đây chỉ cần biết mấy từ SẴN CÓ có được xác nhận hay không,
 * mà bảng hạt giống với WordNet nằm ngay trong máy đã trả lời được.
 */
console.log("\nTừ dẫn xuất không đi hỏi mạng");
{
  const bg = doc("extension/background.js");
  la(/const laDanXuat = !!\(e\.tuCum && e\.tuCum\.goc\);/.test(bg), "background.js nhận ra mục dẫn xuất");
  la(/mang && !laDanXuat[\s\S]{0,80}dongNghiaJa/.test(bg),
     "tầng dịch ngược tiếng Nhật bị chặn cho mục dẫn xuất");
  la(/mang && !laDanXuat[\s\S]{0,120}fetchDictionary/.test(bg),
     "lượt tra từ điển tiếng Anh qua mạng cũng bị chặn");
  const aj = doc("android/www/app.js");
  la(/const laDanXuat = !!\(e\.tuCum && e\.tuCum\.goc\);/.test(aj), "app.js nhận ra mục dẫn xuất");
  la(/!ra\.dong\.length && !laDanXuat/.test(aj), "vòng dịch ngược bên Android cũng bị chặn");
}
{
  // Hai chỗ bấm Lưu đều phải gửi kèm xuất xứ, không thì mục vào sổ như từ gốc.
  const nb = doc("extension/notebook.js");
  la((nb.match(/type: "LUU_NHANH"/g) || []).length === 2, "extension có đúng hai chỗ lưu nhanh");
  la(/cum: \{ goc: b\.it\.word, ben: b\.duong \}/.test(nb), "màn kết quả gửi kèm gốc và cực");
  la(/\{ goc: it\.word, ben: lop \}/.test(nb), "khối mạng nghĩa cũng gửi kèm");
  la((nb.match(/cum: cum|cum: \{/g) || []).length >= 2, "và lượt hỏi mang trường `cum`");
  const aj = doc("android/www/app.js");
  la(/luuNhanhTu\(chu, NGU === "ja" \? "javi" : "envi", \{ goc: b\.it\.word, ben: b\.duong \}\)/.test(aj),
     "Android gửi kèm gốc và cực");
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
