/**
 * CÂU HỎI GỬI GEMINI — chạy bằng node thuần.
 *
 *   node kiem-tra/gemini-hoi.mjs
 *
 * Câu hỏi đi qua BỘ NHỚ TẠM, không qua thanh địa chỉ. Bản đầu gửi bằng `?q=`
 * và đo thật thì không chạy: gemini.google.com nạp đúng đường dẫn ấy nhưng ô
 * chat vẫn trống trơn. Nên không còn trần độ dài nào phải canh — câu hỏi đi
 * ĐỦ, không cắt dòng nào.
 *
 * Ba bất biến còn lại, cả ba đều hỏng ÂM THẦM:
 *
 *   1. TRÍCH ĐỦ. Cả tính năng này chỉ có một lý do tồn tại: đưa cho Gemini
 *      những gì sổ tay đang giữ. Rơi mất một trường thì câu hỏi vẫn gửi đi
 *      được và vẫn được trả lời — chỉ là trả lời thiếu căn cứ.
 *
 *   2. KHÔNG có ngữ cảnh thì phải NÓI THẲNG là không có. Hỏi "trong đúng câu
 *      trên thì từ này nghĩa gì" khi ở trên trống không là mời mô hình bịa ra
 *      một câu rồi trình bày nó như câu người học đã gặp.
 *
 *   3. KHÔNG NHÉT GÌ VÀO ĐƯỜNG DẪN nữa. Nhét vào thì nó chẳng tới được Gemini,
 *      mà lại nằm lại nguyên vẹn trong lịch sử trình duyệt.
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

/* Dòng cuối cùng của mọi câu hỏi — dùng để chốt "không có gì rơi sau phần hỏi". */
const T_CUOI = "Trả lời gọn. Đừng chép lại những gì tôi vừa đưa.";

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
  const co = (x, ten) => la(r.indexOf(x) >= 0, ten, x.slice(0, 34));
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
  la(r.indexOf("improvement; betterment") >= 0, "định nghĩa tiếng Anh đã lưu");
}
{
  // Nguồn YouTube: cái đáng hiện là PHÚT THỨ MẤY, không phải "youtube.com".
  const m = Object.assign({}, DU, {
    src: { url: "https://youtu.be/abc", title: "Bài giảng kaizen", yt: { v: "abc", t: 227, kenh: "NHK" } } });
  const r = HG.loiHoi(m, {});
  la(r.indexOf("3:47") >= 0, "mốc phút video, đọc được chứ không phải số giây", "227 → 3:47");
  la(r.indexOf("NHK") >= 0, "tên kênh");
  // Gemini không mở được link, nhưng NGƯỜI HỌC thì mở — và câu trả lời thường
  // làm họ muốn nghe lại đúng chỗ ấy.
  la(r.indexOf("https://youtu.be/abc") >= 0, "đường link video vẫn đi kèm");
}
{
  // Nhóm "đã lưu sẵn" là một DANH SÁCH: các dòng sát nhau, không giãn mỗi dòng
  // thành một đoạn. Giãn ra thì đọc như mười ý rời nhau, mà còn ăn chỗ trong
  // thanh địa chỉ cho một thứ chẳng mang tin gì.
  const r = HG.loiHoi(DU, phu);
  const i = r.indexOf("TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY");
  const j = r.indexOf("--- HÃY TRẢ LỜI");
  // `trim()` ở đây không phải cho đẹp: lát cắt ôm luôn dòng trống NGĂN nhóm
  // này với phần hỏi, mà dòng trống ấy là thứ đang muốn có chứ không phải lỗi.
  const nhom = r.slice(i, j).trim();
  la(nhom.indexOf("\n\n") < 0, "trong nhóm không có dòng trống nào", 
     JSON.stringify(nhom.slice(0, 60)));
  la(nhom.split("\n").length >= 6, "và vẫn đủ các dòng", nhom.split("\n").length + " dòng");
  // Giữa hai NHÓM thì ngược lại: phải có dòng trống, nếu không thì tiêu đề
  // dính vào dòng cuối của nhóm trên.
  la(r.indexOf("\n\n--- TÔI ĐÃ LƯU SẴN") >= 0, "giữa hai nhóm vẫn có dòng trống");
  la(r.indexOf("\n\n--- HÃY TRẢ LỜI") >= 0, "phần hỏi cũng tách khỏi nhóm trên");
}

/* ------------------------------------------------------------------ */
console.log("\nKhông bịa ngữ cảnh khi không có");
{
  const tron = { key: "javi:改善", word: "改善", dict: "javi", means: ["cải thiện"] };
  const r = HG.loiHoi(tron, {});
  la(r.indexOf("CHƯA lưu được câu ngữ cảnh nào") >= 0, "nói thẳng ra là chưa có ngữ cảnh");
  la(r.indexOf("Trong ĐÚNG câu ngữ cảnh ở trên") < 0,
     "KHÔNG hỏi \"trong đúng câu trên\" khi ở trên trống không");
  la(r.indexOf("NGỮ CẢNH TÔI ĐÃ GẶP") < 0, "không dựng tiêu đề ngữ cảnh rỗng");
}
{
  const r = HG.loiHoi(DU, phu);
  la(r.indexOf("Trong ĐÚNG câu ngữ cảnh ở trên") >= 0, "có ngữ cảnh thì hỏi thẳng vào ngữ cảnh");
  la(r.indexOf("CHƯA lưu được câu ngữ cảnh") < 0, "và không nói nhầm là chưa có");
}
{
  // Mục là một CÂU: chính nó đã là ngữ cảnh, không nhắc lại y nguyên một lần nữa.
  const cau = "品質の改善に取り組んでいます。";
  const m = { key: "javi:" + cau, word: cau, kind: "sent", dict: "javi",
              src: { url: "https://x.vn", sel: cau }, means: ["…"] };
  const r = HG.loiHoi(m, {});
  const dem = r.split(cau).length - 1;
  la(dem === 1, "câu giống hệt phần thân thì không in hai lần", dem + " lần");
  la(r.indexOf("CHƯA lưu được câu ngữ cảnh") < 0, "mục câu vẫn coi là CÓ ngữ cảnh");
}

/* ------------------------------------------------------------------ */
console.log("\nKhông cắt gọt gì — bộ nhớ tạm không có trần");
{
  /*
   * Đây là chỗ đổi nhiều nhất so với bản `?q=`: hồi đó câu hỏi phải rút ba
   * nước cho vừa 7.000 ký tự URL. Giờ nó đi qua bộ nhớ tạm, nên bất biến lật
   * ngược lại — KHÔNG được rơi rụng dòng nào, dù mục có dài tới đâu.
   */
  const doan = "工場では毎日、品質の改善が話し合われている。".repeat(60);
  const gc = "ghi chú rất dài ".repeat(200);
  const m = Object.assign({}, DU, { note: gc, src: Object.assign({}, DU.src, { sel: doan }) });
  const r = HG.loiHoi(m, phu);
  la(r.indexOf(doan) >= 0, "đoạn ngữ cảnh 60 lần vẫn đi NGUYÊN, không bị cắt",
     r.length + " ký tự");
  la(r.indexOf(gc.trim()) >= 0, "ghi chú dài cũng nguyên");
  la(r.indexOf("42/100") >= 0, "và không khối nào bị bỏ — kể cả điểm số");
  la(r.indexOf("…") < 0, "không còn dấu … của việc cắt chuỗi ở đâu cả");
  for (const n of ["1.", "2.", "3.", "4.", "5.", "6."]) {
    la(r.indexOf("\n" + n + " ") >= 0, "câu hỏi \"" + n + "\" vẫn có mặt");
  }
}
{
  // Mục bình thường: đủ mọi phần, theo đúng thứ tự đọc được.
  const r = HG.loiHoi(DU, phu);
  const thuTu = ["Từ cần hỏi", "--- NGỮ CẢNH TÔI ĐÃ GẶP ---",
                 "--- TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY ---", "--- HÃY TRẢ LỜI"];
  let truoc = -1, dung = true;
  for (const t of thuTu) { const k = r.indexOf(t); if (k <= truoc) dung = false; truoc = k; }
  la(dung, "bốn phần nằm đúng thứ tự: từ → ngữ cảnh → dữ kiện → câu hỏi");
  la(r.trim().endsWith(T_CUOI), "câu hỏi nằm ở CUỐI, không có gì rơi sau nó",
     JSON.stringify(r.slice(-40)));
}

/* ------------------------------------------------------------------ */
console.log("\nĐường dẫn trơn");
{
  /*
   * Bất biến cốt lõi sau lần sửa này: đường dẫn KHÔNG mang theo câu hỏi.
   *
   * Nhét vào `?q=` thì Gemini không đọc — đã đo — nên nó không giúp gì, mà
   * lại để nguyên cả câu hỏi trong lịch sử trình duyệt. Tức là trả giá riêng
   * phần hại.
   */
  la(HG.GOC_URL === "https://gemini.google.com/app", "trỏ thẳng trang chat", HG.GOC_URL);
  la(HG.GOC_URL.indexOf("?") < 0, "không có tham số nào");
  la(HG.GOC_URL.length < 60, "ngắn gọn, lịch sử duyệt web không dính câu hỏi",
     HG.GOC_URL.length + " ký tự");
  la(HG.diaChi === undefined, "hàm dựng `?q=` đã bỏ hẳn, không để lại mã chết");
  la(HG.TRAN_URL === undefined && HG.UU === undefined,
     "bộ máy rút gọn theo trần URL cũng bỏ theo");
}

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
  la(!loi && typeof r === "string" && r.length > 0,
     "\"" + ten + "\" vẫn trả về một chuỗi", r ? r.length + " ký tự" : String(r));
  if (!loi && r) la(r.indexOf("HÃY TRẢ LỜI") >= 0, "\"" + ten + "\" vẫn có phần hỏi");
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
  /*
   * Quét CẢ chữ trên màn hình của hai vỏ, không chỉ chuỗi trong mô-đun.
   *
   * Lời mách sau khi chép mang chỗ trống `{phim}` (⌘V hay Ctrl+V tuỳ máy), và
   * nó nằm ở notebook.js / app.js chứ không nằm ở đây. Bỏ sót thì đúng cái
   * dòng quan trọng nhất — dòng bảo người ta bấm gì để dán — lại là dòng
   * không ai canh.
   */
  const keys = khoaCua(sExt);
  for (const f of ["extension/notebook.js", "android/www/app.js"]) {
    for (const m of doc(f).matchAll(/T2?\(\s*"((?:[^"\\]|\\.)*(?:Gemini|chép câu hỏi|bộ nhớ tạm)(?:[^"\\]|\\.)*)"/g)) {
      keys.add(m[1].replace(/\\"/g, '"'));
    }
  }
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
  la(r.indexOf("chữ Hán") >= 0, "mục chữ Hán được gọi đúng tên trong câu hỏi");
}

/* ------------------------------------------------------------------ */
console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " khẳng định TRƯỢT"
                          : "✓ " + xong + " khẳng định, tất cả đạt"));
process.exit(hong ? 1 : 0);
