import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = (p) => readFileSync(path.join(root, p), "utf8");
const src = doc("extension/tu-lien.js");
assert.equal(src, doc("android/www/tu-lien.js"));
const ctx = { TuLienBo: {
  "ゆっくり": { dong: ["そろそろ"] },
  "早速": { trai: ["徐に"] },
  "根語": { dong: Array.from({ length: 12 }, (_, i) => "類語" + i) }
} };
new Function("self", src)(ctx);
const TL = ctx.TuLien;
const muc = (word, means = [], lien = {}) => ({ key: "javi:" + word, word, means, lien });
const goc = muc("そろそろ", ["dần dần"], {
  dong: ["徐に", "ゆっくり"], trai: ["早早", "迅速", "忽ち", "ぱっぱと", "早速"]
});
const so = [
  goc, muc("徐に", ["Dần dần"]), muc("ゆっくり"),
  muc("徐々に", ["từng bước; DẦN DẦN."]),
  muc("少しずつ", [], { dong: ["そろそろ"] }),
  muc("じわじわ", [], { trai: ["早速"] }),
  muc("じりじり", [], { dong: ["徐に"] }),
  { ...muc("漸次"), tuCum: { goc: "そろそろ", ben: "dong" } },
  muc("傾向", ["xu hướng"]), muc("湿度", ["độ ẩm"]), muc("机", ["bàn"]),
  muc("本", ["sách"]), muc("猫", ["mèo"]),
  { ...muc("削除"), del: 1 },
  { ...muc("短文"), kind: "sent" },
  muc("すみません、ありがとうございます。")
];
const before = JSON.stringify(so);
for (const d of ["dong", "trai"]) {
  for (let seed = 0; seed < 30; seed++) {
    let state = seed + 1;
    const rand = () => ((state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 4294967296);
    const q = TL.dungDeDao({ ...goc, _d: d }, so, rand);
    assert.ok(q.o.includes(goc.word));
    assert.equal(q.khongCham, false);
    assert.equal(q.o.length, 5);
    assert.equal(new Set(q.o).size, q.o.length);
    for (const w of ["徐に", "ゆっくり", "徐々に", "少しずつ", "じわじわ", "じりじり",
                     "漸次", "削除", "短文", "すみません、ありがとうございます。"])
      assert.equal(q.o.includes(w), false, d + ": ambiguous/ineligible distractor " + w);
    for (const w of q.cum) assert.equal(q.o.includes(w), false, "clue is not an option");
  }
}
assert.equal(JSON.stringify(so), before, "question building must not alter notebook or SRS");

// Không dựa vào trùng nghĩa tiếng Việt để tự công nhận một đáp án.
const chiNghia = muc("甲語", ["cùng một nghĩa"]);
assert.deepEqual(TL.dungDeDao({ ...chiNghia, _d: "dong", lien: { dong: ["乙語"] } },
  [muc("丙語", [{ text: "CÙNG MỘT NGHĨA." }])], () => 0).o, ["甲語"]);

// Quan hệ với đề chỉ được lưu ở chiều ngược vẫn phải loại khỏi nhiễu.
for (const d of ["dong", "trai"]) {
  const it = { ...muc("甲語"), _d: d, lien: { [d]: ["乙語"] } };
  const ds = [muc("乙語", [], { [d]: ["丙語"] }), muc("丙語"), muc("丁語")];
  assert.equal(TL.dungDeDao(it, ds).o.includes("丙語"), false);
}
// Từ thứ 12 của từ điển, không được bỏ sót do giới hạn hiển thị 8 từ.
assert.equal(TL.dungDeDao({ ...muc("根語", [], { trai: ["反語"] }), _d: "trai" },
  [muc("類語11"), muc("机")]).o.includes("類語11"), false);

// Không đủ nhiễu: không quay lại nhét từ mơ hồ và cho điểm miễn phí.
const it = { ...goc, _d: "trai" };
const thieu = TL.dungDeDao(it, so.slice(0, 8));
assert.deepEqual(thieu.o, ["そろそろ"]);
assert.equal(thieu.khongCham, true);
assert.equal(TL.dungDeDao({ ...muc("空語"), _d: "dong" }, [muc("机")]).khongCham, true);
// Đề đồng nghĩa vẫn dùng được trái nghĩa rõ ràng.
const ro = TL.dungDeDao({ ...muc("改善", [], { dong: ["改良"], trai: ["改悪"] }), _d: "dong" }, []);
assert.ok(ro.o.includes("改悪"));
assert.equal(ro.khongCham, false);
console.log("Bộ lọc nhiễu: hai chiều, cùng nghĩa, dữ liệu ngược, từ điển dài, thiếu nhiễu và bảo toàn dữ liệu OK");
