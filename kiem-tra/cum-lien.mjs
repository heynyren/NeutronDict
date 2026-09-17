/**
 * CỤM TỪ LIÊN QUAN — chạy bằng node thuần.
 *
 *   node kiem-tra/cum-lien.mjs
 *
 * `lien` lưu CHUỖI TỪ chứ không phải khoá, và `lienVaSau` (background.js) tính
 * nó cho từng mục ĐỘC LẬP — nên không có gì đảm bảo hai bên cùng kể tên nhau.
 * Hai bất biến quan trọng nhất của việc dựng cụm nằm ở đó:
 *
 *   1. NỐI HAI CHIỀU. Chỉ nhận một chiều thì mất quá nửa số cặp mà người học tự
 *      tay lưu về từ màn kết quả — mà đó đúng là những cặp họ quan tâm nhất.
 *
 *   2. KHÔNG BẮC CẦU. 改善–改良, 改良–向上, 向上–上昇… mà lấy bao đóng thì cả sổ
 *      dính thành một khối, và một từ tới hạn kéo theo ba chục từ. Hỏng đúng cái
 *      vừa mới đi chữa.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nap = (src) => { const g = {}; new Function("self", src)(g); return g.TuLien; };

let hong = 0, xong = 0;
function la(dieu, ten, them) {
  xong++;
  if (dieu) { console.log("  ✓ " + ten + (them ? "  (" + them + ")" : "")); return; }
  hong++;
  console.error("  ✗ " + ten + (them ? "  (" + them + ")" : ""));
}

/* ------------------------------------------------------------------ */
console.log("Hai bản tu-lien.js");
const sExt = fs.readFileSync(path.join(GOC, "extension/tu-lien.js"), "utf8");
const sAnd = fs.readFileSync(path.join(GOC, "android/www/tu-lien.js"), "utf8");
la(sExt === sAnd, "extension/tu-lien.js và android/www/tu-lien.js giống nhau từng byte",
   "lệch " + Math.abs(sExt.length - sAnd.length) + " ký tự");
const TL = nap(sExt);

/** Dựng một mục gọn. */
const muc = (word, dong, trai, them) =>
  Object.assign({ key: "javi:" + word, word: word,
                  lien: { dong: dong || [], trai: trai || [] } }, them || {});

/** Hai danh sách có cùng tập phần tử không — thứ tự không tính. */
const nhuNhau = (a, b) => a.length === b.length && a.every((x) => b.indexOf(x) >= 0);

/** Cụm của một từ, trả về danh sách TỪ cho dễ đọc. */
function cum(ds, word) {
  const ci = TL.chiMucLien(ds);
  const m = ds.find((x) => x.word === word);
  const theoKhoa = new Map(ds.map((x) => [x.key, x.word]));
  return TL.cumCua(m, ci).map((k) => theoKhoa.get(k)).sort();
}

/* ------------------------------------------------------------------ */
console.log("\nNối hai chiều");
{
  // 改善 kể tên 改良; 改良 KHÔNG kể tên ai. Vẫn phải thành một cụm.
  const ds = [muc("改善", ["改良"]), muc("改良", [])];
  la(cum(ds, "改善").join() === "改良", "bên kể tên thấy bên kia", cum(ds, "改善").join());
  la(cum(ds, "改良").join() === "改善", "bên KHÔNG kể tên cũng thấy ngược lại",
     cum(ds, "改良").join());
}
{
  // Nối qua tập TRÁI nghĩa cũng tính — cụm gồm cả đồng lẫn trái.
  const ds = [muc("改善", [], ["改悪"]), muc("改悪", [])];
  la(cum(ds, "改善").join() === "改悪", "trái nghĩa cũng nằm chung cụm");
  la(cum(ds, "改悪").join() === "改善", "và cũng thấy được theo chiều ngược");
}

/* ------------------------------------------------------------------ */
console.log("\nKHÔNG bắc cầu");
{
  //   改善 → 改良 → 向上 : cụm của 改善 chỉ có 改良, KHÔNG có 向上.
  const ds = [muc("改善", ["改良"]), muc("改良", ["向上"]), muc("向上", [])];
  const c = cum(ds, "改善");
  la(c.join() === "改良", "cụm của 改善 chỉ tới một bậc", c.join() || "(rỗng)");
  la(c.indexOf("向上") < 0, "từ cách hai bậc KHÔNG bị kéo vào");
  la(nhuNhau(cum(ds, "改良"), ["改善", "向上"]), "từ ở giữa thì thấy cả hai bên",
     cum(ds, "改良").join());
}
{
  // Một chuỗi dài: cụm của mắt xích đầu vẫn chỉ có đúng một từ.
  const ds = [];
  for (let i = 0; i < 30; i++) ds.push(muc("w" + i, ["w" + (i + 1)]));
  la(cum(ds, "w0").length === 1, "chuỗi 30 từ: cụm của từ đầu vẫn chỉ 1",
     cum(ds, "w0").length + " từ");
}

/* ------------------------------------------------------------------ */
console.log("\nChỉ tính từ THẬT SỰ có trong sổ");
{
  // 改善 kể tên bốn từ, sổ mới có hai.
  const ds = [muc("改善", ["改良", "向上", "進歩"], ["改悪"]), muc("改良", []), muc("改悪", [])];
  la(nhuNhau(cum(ds, "改善"), ["改良", "改悪"]), "từ chưa lưu thì không vào cụm",
     cum(ds, "改善").join());
}
{
  const ds = [muc("改善", ["改良"]), Object.assign(muc("改良", []), { del: true })];
  la(cum(ds, "改善").length === 0, "mục đã xoá không vào cụm");
}

/* ------------------------------------------------------------------ */
console.log("\nKhông tự nối vào chính mình");
{
  // `lien` hỏng, tự kể tên mình — vẫn không được nằm trong cụm của chính nó.
  const ds = [muc("改善", ["改善", "改良"]), muc("改良", ["改良"])];
  la(cum(ds, "改善").indexOf("改善") < 0, "tự kể tên mình cũng không tính",
     cum(ds, "改善").join());
  la(cum(ds, "改良").indexOf("改良") < 0, "và không lặp ở chiều ngược");
}
{
  // Hai mục TRÙNG từ (khác khoá) — không được thành cụm của nhau qua chính nó.
  const a = muc("改善", ["改良"]);
  const b = Object.assign(muc("改善", []), { key: "envi:改善" });
  const ds = [a, b, muc("改良", [])];
  const ci = TL.chiMucLien(ds);
  la(TL.cumCua(a, ci).indexOf(a.key) < 0, "khoá của chính mình không lọt vào");
}

/* ------------------------------------------------------------------ */
console.log("\nDữ liệu thiếu hoặc hỏng thì không nổ");
for (const [ten, m] of Object.entries({
  "lien rỗng": { key: "k", word: "w", lien: {} },
  "không có lien": { key: "k", word: "w" },
  "lien null": { key: "k", word: "w", lien: null },
  "dong không phải mảng": { key: "k", word: "w", lien: { dong: "改良" } },
  "có phần tử rỗng": { key: "k", word: "w", lien: { dong: ["", null, "改良"] } },
  "không có word": { key: "k", lien: { dong: ["改良"] } },
  "mục rỗng": {},
  "mục null": null
})) {
  let loi = null, ra = null;
  try {
    const ds = [m, muc("改良", [])].filter(Boolean);
    ra = TL.cumCua(m, TL.chiMucLien(ds));
  } catch (e) { loi = e; }
  la(!loi, "\"" + ten + "\" không ném lỗi", loi && loi.message);
  la(!loi && Array.isArray(ra), "\"" + ten + "\" vẫn trả về mảng");
}
{
  let loi = null;
  try { TL.chiMucLien(null); TL.chiMucLien(undefined); } catch (e) { loi = e; }
  la(!loi, "chiMucLien(null) không nổ", loi && loi.message);
}

/* ------------------------------------------------------------------ */
console.log("\nKhông trùng lặp");
{
  // 改善 kể tên 改良 VÀ 改良 kể tên 改善 — chỉ được ra một lần.
  const ds = [muc("改善", ["改良"], ["改良"]), muc("改良", ["改善"])];
  la(cum(ds, "改善").length === 1, "nối cả hai chiều vẫn chỉ đếm một lần",
     cum(ds, "改善").join());
}

/* ------------------------------------------------------------------ */
console.log("\n" + (hong ? "✗ " + hong + "/" + xong + " khẳng định TRƯỢT"
                          : "✓ " + xong + " khẳng định, tất cả đạt"));
process.exit(hong ? 1 : 0);
