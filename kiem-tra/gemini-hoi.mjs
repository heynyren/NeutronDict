/**
 * CÂU HỎI GỬI GEMINI — chạy bằng node thuần.
 *
 *   node kiem-tra/gemini-hoi.mjs
 *
 * Hai bất biến đáng canh nhất ở đây, và cả hai đều hỏng ÂM THẦM:
 *
 *   1. TRẦN ĐỘ DÀI. Câu hỏi đi qua thanh địa chỉ, mà tiếng Việt lẫn tiếng Nhật
 *      mã hoá ra URL thì mỗi chữ nở thành 9 ký tự. Vượt trần thì Gemini không
 *      cắt bớt cho đẹp — nó trả về lỗi, và người học chỉ thấy một trang trắng
 *      chứ chẳng thấy "câu hỏi của bạn dài quá" ở đâu cả.
 *
 *   2. MẤY CÂU HỎI PHẢI SỐNG SÓT. Cách rút gọn sai lầm nhất là cắt đuôi chuỗi,
 *      vì đuôi chính là chỗ đặt câu hỏi. Cắt xong thì gửi đi một đống dữ kiện
 *      mà không hỏi gì — Gemini vẫn trả lời, vẫn trông như chạy được, chỉ là
 *      trả lời một câu hỏi nó tự đoán ra.
 *
 * Và một bất biến về sự thật: KHÔNG có ngữ cảnh thì phải nói thẳng là không
 * có. Hỏi "trong đúng câu trên thì từ này nghĩa gì" khi ở trên trống không là
 * mời mô hình bịa ra một câu rồi trình bày nó như câu người học đã gặp.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = (p) => fs.readFileSync(path.join(GOC, p), "utf8");
const nap = (src) => { const g = {}; new Function("self", src)(g); return g.HoiGemini; };

let hong = 0, xong = 0;
function la(dieu, ten, them) {
  xong++;
  if (dieu) { console.log("  ✓ " + ten + (them ? "  (" + them + ")" : "")); return; }
  hong++;
  console.error("  ✗ " + ten + (them ? "  (" + them + ")" : ""));
}

/* ------------------------------------------------------------------ */
console.log("Hai bản hoi-gemini.js");
const sExt = doc("extension/hoi-gemini.js");
const sAnd = doc("android/www/hoi-gemini.js");
la(sExt === sAnd, "extension/hoi-gemini.js và android/www/hoi-gemini.js giống nhau từng byte",
   "lệch " + Math.abs(sExt.length - sAnd.length) + " ký tự");
const HG = nap(sExt);

/* ------------------------------------------------------------------ */
console.log("\nĐược nạp ở CẢ HAI vỏ");
for (const [ten, p] of [["extension", "extension/notebook.html"], ["android", "android/www/index.html"]]) {
  const h = doc(p);
  la(/<script src="hoi-gemini\.js"><\/script>/.test(h), ten + ": có thẻ script hoi-gemini.js");
  // Phải nạp TRƯỚC tệp dùng nó, nếu không thì window.HoiGemini còn trống lúc gọi.
  const iG = h.indexOf('src="hoi-gemini.js"');
  const iD = h.indexOf(ten === "extension" ? 'src="notebook.js"' : 'src="app.js"');
  la(iG >= 0 && iD >= 0 && iG < iD, ten + ": nạp trước tệp màn hình", iG + " < " + iD);
  la(/id="stGemini"/.test(h), ten + ": thẻ học có nút stGemini");
}
for (const [ten, p] of [["extension", "extension/notebook.js"], ["android", "android/www/app.js"]]) {
  const j = doc(p);
  la(/function moGemini\(/.test(j), ten + ": có moGemini()");
  la(/function nutGemini\(/.test(j), ten + ": có nutGemini()");
  la(/nutGemini\(it/.test(j), ten + ": sổ tay có gắn nút");
  la(/\$\("stGemini"\)\.addEventListener/.test(j), ten + ": thẻ học có gắn nút");
}

/* ------------------------------------------------------------------ */
/** Một mục đầy đủ mọi trường mà sổ tay có thể lưu. */
const DU = {
  key: "javi:改善", word: "改善", reading: "かいぜん", dict: "javi",
  means: ["cải thiện", "cải tiến"], mEdit: 1, mOrig: ["sự cải thiện"],
  note: "hay gặp trong báo cáo chất lượng",
  lien: { dong: ["改良", "向上"], trai: ["改悪"] },
  cauNghe: { cau: "品質の改善に取り組んでいます。", dich: "Chúng tôi đang nỗ lực cải thiện chất lượng." },
  src: { url: "https://example.com/bai-viet", title: "Kaizen tại Toyota",
         sel: "工場では毎日、品質の改善が話し合われている。" },
  pos: [{ p: "noun", defs: ["improvement; betterment"], syn: [] }],
  duong: { nhin: { lv: 3, ngay: 14, net: 1, sai: 0, due: 0, ts: 0, ms: 0 } },
  ts: 1757000000000
};
const phu = { hanViet: "Cải Thiện", chuHan: "改 (カイ · あらた-める) · 7 nét · N3", diem: { tong: 42, ten: "Nghe ra" }, so: "Công việc" };

console.log("\nTrích xuất ĐỦ những gì đã lưu");
{
  const r = HG.loiHoi(DU, phu);
  const co = (x, ten) => la(r.day.indexOf(x) >= 0, ten, x.slice(0, 34));
  co("改善", "chính con chữ");
  co("かいぜん", "cách đọc");
  co("Cải Thiện", "âm Hán Việt");
  co("cải thiện; cải tiến", "nghĩa đang lưu");
  co("sự cải thiện", "bản máy dịch gốc, khi nghĩa đã bị sửa tay");
  co("工場では毎日", "câu bôi đen lúc lưu");
  co("品質の改善に取り組んでいます。", "câu ví dụ của bài nghe");
  co("Chúng tôi đang nỗ lực", "bản dịch của câu ví dụ");
  co("改良, 向上", "tập đồng nghĩa");
  co("改悪", "tập trái nghĩa");
  co("hay gặp trong báo cáo", "ghi chú tự viết");
  co("https://example.com/bai-viet", "đường link nguồn");
  co("Kaizen tại Toyota", "tên trang nguồn");
  co("改 (カイ", "dòng chữ Hán");
  co("42/100", "điểm hiện tại");
  co("Nghe ra", "nhãn mức tư duy");
  co("Công việc", "tên sổ con");
  co("Nhật→Việt", "hướng tra");
  la(r.day.indexOf("improvement; betterment") >= 0, "định nghĩa tiếng Anh đã lưu");
}
{
  // Nguồn YouTube: cái đáng hiện là PHÚT THỨ MẤY, không phải "youtube.com".
  const m = Object.assign({}, DU, {
    src: { url: "https://youtu.be/abc", title: "Bài giảng kaizen", yt: { v: "abc", t: 227, kenh: "NHK" } } });
  const r = HG.loiHoi(m, {});
  la(r.day.indexOf("3:47") >= 0, "mốc phút video, đọc được chứ không phải số giây", "227 → 3:47");
  la(r.day.indexOf("NHK") >= 0, "tên kênh");
  // Gemini không mở được link, nhưng NGƯỜI HỌC thì mở — và câu trả lời thường
  // làm họ muốn nghe lại đúng chỗ ấy.
  la(r.day.indexOf("https://youtu.be/abc") >= 0, "đường link video vẫn đi kèm");
}
{
  // Nhóm "đã lưu sẵn" là một DANH SÁCH: các dòng sát nhau, không giãn mỗi dòng
  // thành một đoạn. Giãn ra thì đọc như mười ý rời nhau, mà còn ăn chỗ trong
  // thanh địa chỉ cho một thứ chẳng mang tin gì.
  const r = HG.loiHoi(DU, phu);
  const i = r.day.indexOf("TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY");
  const j = r.day.indexOf("--- HÃY TRẢ LỜI");
  // `trim()` ở đây không phải cho đẹp: lát cắt ôm luôn dòng trống NGĂN nhóm
  // này với phần hỏi, mà dòng trống ấy là thứ đang muốn có chứ không phải lỗi.
  const nhom = r.day.slice(i, j).trim();
  la(nhom.indexOf("\n\n") < 0, "trong nhóm không có dòng trống nào", 
     JSON.stringify(nhom.slice(0, 60)));
  la(nhom.split("\n").length >= 6, "và vẫn đủ các dòng", nhom.split("\n").length + " dòng");
  // Giữa hai NHÓM thì ngược lại: phải có dòng trống, nếu không thì tiêu đề
  // dính vào dòng cuối của nhóm trên.
  la(r.day.indexOf("\n\n--- TÔI ĐÃ LƯU SẴN") >= 0, "giữa hai nhóm vẫn có dòng trống");
  la(r.day.indexOf("\n\n--- HÃY TRẢ LỜI") >= 0, "phần hỏi cũng tách khỏi nhóm trên");
}

/* ------------------------------------------------------------------ */
console.log("\nKhông bịa ngữ cảnh khi không có");
{
  const tron = { key: "javi:改善", word: "改善", dict: "javi", means: ["cải thiện"] };
  const r = HG.loiHoi(tron, {});
  la(r.day.indexOf("CHƯA lưu được câu ngữ cảnh nào") >= 0, "nói thẳng ra là chưa có ngữ cảnh");
  la(r.day.indexOf("Trong ĐÚNG câu ngữ cảnh ở trên") < 0,
     "KHÔNG hỏi \"trong đúng câu trên\" khi ở trên trống không");
  la(r.day.indexOf("NGỮ CẢNH TÔI ĐÃ GẶP") < 0, "không dựng tiêu đề ngữ cảnh rỗng");
}
{
  const r = HG.loiHoi(DU, phu);
  la(r.day.indexOf("Trong ĐÚNG câu ngữ cảnh ở trên") >= 0, "có ngữ cảnh thì hỏi thẳng vào ngữ cảnh");
  la(r.day.indexOf("CHƯA lưu được câu ngữ cảnh") < 0, "và không nói nhầm là chưa có");
}
{
  // Mục là một CÂU: chính nó đã là ngữ cảnh, không nhắc lại y nguyên một lần nữa.
  const cau = "品質の改善に取り組んでいます。";
  const m = { key: "javi:" + cau, word: cau, kind: "sent", dict: "javi",
              src: { url: "https://x.vn", sel: cau }, means: ["…"] };
  const r = HG.loiHoi(m, {});
  const dem = r.day.split(cau).length - 1;
  la(dem === 1, "câu giống hệt phần thân thì không in hai lần", dem + " lần");
  la(r.day.indexOf("CHƯA lưu được câu ngữ cảnh") < 0, "mục câu vẫn coi là CÓ ngữ cảnh");
}

/* ------------------------------------------------------------------ */
console.log("\nTrần độ dài — chỗ hỏng âm thầm nhất");
{
  const r = HG.loiHoi(DU, phu);
  la(r.day === r.gon, "mục bình thường thì không phải rút gọn gì",
     encodeURIComponent(r.day).length + " ký tự URL");
  la(!r.cat, "và cờ `cat` không bật");
}
{
  // Lưu nguyên một đoạn văn làm ngữ cảnh — trường hợp thật, không phải bịa:
  // bôi đen cả đoạn rồi bấm Lưu là ra thế này.
  const doan = "工場では毎日、品質の改善が話し合われている。".repeat(60);
  const m = Object.assign({}, DU, {
    note: "ghi chú rất dài ".repeat(200),
    src: Object.assign({}, DU.src, { sel: doan })
  });
  const r = HG.loiHoi(m, phu);
  const n = encodeURIComponent(r.gon).length;
  la(n <= HG.TRAN_URL, "bản gửi qua link nằm trong trần", n + " ≤ " + HG.TRAN_URL);
  la(r.cat, "cờ `cat` bật để màn hình còn biết mà báo");
  la(r.day.length > r.gon.length, "bản đầy đủ vẫn giữ nguyên mọi thứ để chép tay",
     r.day.length + " vs " + r.gon.length);
  la(r.day.indexOf("ghi chú rất dài") >= 0, "bản đầy đủ không mất ghi chú");
  // Đây là cái gate thật: cắt kiểu gì thì cắt, mấy câu hỏi phải còn.
  la(r.gon.indexOf("HÃY TRẢ LỜI BẰNG TIẾNG VIỆT") >= 0, "TIÊU ĐỀ phần hỏi sống sót");
  for (const n of ["3.", "4.", "5.", "6."]) {
    la(r.gon.indexOf("\n" + n + " ") >= 0, "câu hỏi \"" + n + "\" sống sót");
  }
  la(r.gon.indexOf("改善") >= 0, "và chính con chữ cũng còn");
}
{
  // Ép tới mức chỉ riêng câu bôi đen đã vượt trần: lúc đó mới được cắt chuỗi,
  // và vẫn phải chừa mấy câu hỏi lại.
  const m = Object.assign({}, DU, { src: { url: "https://x.vn", sel: "あ".repeat(6000) } });
  const r = HG.loiHoi(m, phu);
  const n = encodeURIComponent(r.gon).length;
  la(n <= HG.TRAN_URL, "cắt tới cùng vẫn nằm trong trần", n + " ≤ " + HG.TRAN_URL);
  la(r.gon.indexOf("6. ") >= 0, "câu hỏi cuối vẫn còn sau khi phải cắt chuỗi");
}
{
  // RÚT NGẮN đi TRƯỚC khi bỏ khối. Một câu bôi đen dài thì phải cắt bớt câu
  // ấy, chứ không được vứt cả khối ngữ cảnh đi rồi giữ nguyên mấy dòng phụ —
  // đó đúng là thứ cả tính năng này xoay quanh.
  const doan = "工場では毎日、品質の改善が話し合われている。".repeat(40);
  const m = Object.assign({}, DU, { src: Object.assign({}, DU.src, { sel: doan }) });
  const r = HG.loiHoi(m, phu);
  la(r.gon.indexOf("工場では毎日") >= 0, "ngữ cảnh vẫn còn, chỉ ngắn lại");
  la(r.gon.indexOf(doan) < 0, "và đúng là đã bị cắt chứ không lọt nguyên đoạn");
  la(r.gon.indexOf("42/100") >= 0, "rút ngắn đủ rồi thì KHÔNG bỏ khối nào cả");
  la(r.gon.indexOf("cải thiện; cải tiến") >= 0, "nghĩa vẫn còn");
  la(r.gon.indexOf("改良, 向上") >= 0, "tập đồng nghĩa vẫn còn");
}
{
  // Ép tới mức rút ngắn KHÔNG đủ: mọi trường dài đều là một khối chữ Hán to.
  // Lúc này mới tới lượt bỏ khối, và phải bỏ từ ÍT quan trọng nhất trước.
  const to = "改善".repeat(400);
  const m = Object.assign({}, DU, {
    note: to,
    means: [to], mOrig: [to],
    lien: { dong: [to], trai: [to] },
    pos: [{ p: "noun", defs: [to], syn: [] }],
    cauNghe: { cau: to, dich: to },
    src: { url: "https://example.com/" + "x".repeat(300), title: to, sel: to }
  });
  const r = HG.loiHoi(m, Object.assign({}, phu, { chuHan: to }));
  la(encodeURIComponent(r.gon).length <= HG.TRAN_URL, "vẫn nằm trong trần",
     encodeURIComponent(r.gon).length + " ≤ " + HG.TRAN_URL);
  la(r.gon.indexOf("42/100") < 0, "điểm số — thứ vui là chính — bị bỏ trước");
  la(r.gon.indexOf("Công việc") < 0, "tên sổ con cũng bị bỏ cùng tầng đó");
  la(r.gon.indexOf("NGỮ CẢNH TÔI ĐÃ GẶP") >= 0, "còn ngữ cảnh thì giữ tới cùng");
  la(r.gon.indexOf("HÃY TRẢ LỜI") >= 0, "và phần hỏi thì không bao giờ bỏ");
}
{
  // Không bao giờ để trơ lại một tiêu đề không có gì bên dưới.
  const doan = "あ".repeat(2400);
  const m = Object.assign({}, DU, { src: Object.assign({}, DU.src, { sel: doan }) });
  const r = HG.loiHoi(m, phu);
  const iTieuDe = r.gon.indexOf("TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY");
  if (iTieuDe < 0) la(true, "tiêu đề \"đã lưu sẵn\" bị bỏ cùng cả nhóm");
  else la(r.gon.slice(iTieuDe).split("\n\n").length > 2,
          "tiêu đề \"đã lưu sẵn\" luôn có ít nhất một dòng bên dưới");
}

/* ------------------------------------------------------------------ */
console.log("\nĐường dẫn");
{
  const r = HG.loiHoi(DU, phu);
  const u = HG.diaChi(r.gon);
  la(u.indexOf("https://gemini.google.com/app?q=") === 0, "trỏ đúng Gemini");
  la(decodeURIComponent(u.slice("https://gemini.google.com/app?q=".length)) === r.gon,
     "giải mã ra đúng chuỗi ban đầu, không rơi rụng ký tự");
  la(u.length < 8000, "cả đường dẫn dưới 8 KiB", u.length + " ký tự");
  la(u.indexOf("#") < 0 && u.indexOf(" ") < 0, "không lọt ký tự thô ra ngoài");
}
la(HG.diaChi("").indexOf("?q=") > 0, "chuỗi rỗng vẫn ra đường dẫn hợp lệ");
la(HG.diaChi(null).indexOf("?q=") > 0, "null cũng không nổ");

/* ------------------------------------------------------------------ */
console.log("\nDữ liệu thiếu hoặc hỏng thì không nổ");
for (const [ten, m] of Object.entries({
  "mục rỗng": {},
  "mục null": null,
  "mục undefined": undefined,
  "không có word": { dict: "javi", means: ["x"] },
  "means không phải mảng": { word: "改善", means: "cải thiện" },
  "lien null": { word: "改善", lien: null },
  "lien.dong không phải mảng": { word: "改善", lien: { dong: "改良" } },
  "lien có phần tử rỗng": { word: "改善", lien: { dong: ["", null, "改良"] } },
  "src null": { word: "改善", src: null },
  "src không có url": { word: "改善", src: { sel: "abc" } },
  "yt thiếu t": { word: "改善", src: { url: "https://y.tv", yt: { v: "a" } } },
  "cauNghe rỗng": { word: "改善", cauNghe: {} },
  "pos hỏng": { word: "改善", pos: [null, {}, { p: "noun" }] },
  "dict lạ": { word: "改善", dict: "xxyy" }
})) {
  let loi = null, r = null;
  try { r = HG.loiHoi(m, {}); } catch (e) { loi = e; }
  la(!loi, "\"" + ten + "\" không ném lỗi", loi && loi.message);
  la(!loi && r && typeof r.day === "string" && typeof r.gon === "string",
     "\"" + ten + "\" vẫn trả về hai chuỗi");
  if (!loi && r) la(r.day.indexOf("HÃY TRẢ LỜI") >= 0, "\"" + ten + "\" vẫn có phần hỏi");
}
{
  let loi = null;
  try { HG.loiHoi(DU, null); HG.loiHoi(DU, undefined); } catch (e) { loi = e; }
  la(!loi, "thiếu hẳn tham số `phu` cũng không nổ", loi && loi.message);
}

/* ------------------------------------------------------------------ */
/*
 * Bản dịch en/ja phải mang ĐÚNG những chỗ trống mà bản tiếng Việt có.
 *
 * Lệch một chỗ trống thì không có gì đỏ cả: câu vẫn in ra, chỉ là người học
 * gửi đi một câu hỏi có chữ "{loai}" nằm trơ giữa dòng, hoặc mất hẳn chính cái
 * từ đang hỏi. Mà lỗi ấy chỉ lộ ra khi ai đó đổi giao diện sang tiếng Anh —
 * tức là gần như không bao giờ, ở máy của người viết.
 */
console.log("\nChỗ trống trong bản dịch");
{
  const oTrong = (x) => (String(x).match(/\{[A-Za-z]+\}/g) || []).slice().sort().join(",");
  const khoaCua = (src) => {
    const re = /\bT2?\(\s*"((?:[^"\\]|\\.)*)"/g, ra = new Set();
    let m; while ((m = re.exec(src))) ra.add(m[1].replace(/\\"/g, '"'));
    return ra;
  };
  const keys = khoaCua(sExt);
  for (const p of ["extension/chu-bang.js", "android/www/chu-bang.js"]) {
    const g = {}; new Function("self", doc(p))(g);
    const B = g.CHU_BANG;
    let thieu = 0, lech = 0;
    for (const k of keys) {
      for (const ngu of ["en", "ja"]) {
        const v = B[ngu][k];
        if (v == null) { thieu++; continue; }
        if (oTrong(v) !== oTrong(k)) { lech++; console.error("      " + ngu + " ≠ " + JSON.stringify(k)); }
      }
    }
    la(thieu === 0, p + ": dịch đủ cả en lẫn ja", keys.size + " khoá, thiếu " + thieu);
    la(lech === 0, p + ": chỗ trống khớp nhau từng cái", "lệch " + lech);
  }
}

/* ------------------------------------------------------------------ */
console.log("\nPhân loại mục");
la(HG.loaiCua({ dict: "kanji" }) === "han", "chữ Hán");
la(HG.loaiCua({ kind: "sent" }) === "cau", "câu");
la(HG.loaiCua({ dict: "javi" }) === "tu", "từ");
la(HG.loaiCua(null) === "tu", "mục null thì coi như từ");
{
  const r = HG.loiHoi({ word: "改", dict: "kanji", kanji: {} }, { chuHan: "7 nét" });
  la(r.day.indexOf("chữ Hán") >= 0, "mục chữ Hán được gọi đúng tên trong câu hỏi");
}

/* ------------------------------------------------------------------ */
console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " khẳng định TRƯỢT"
                          : "✓ " + xong + " khẳng định, tất cả đạt"));
process.exit(hong ? 1 : 0);
