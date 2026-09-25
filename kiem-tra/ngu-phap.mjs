import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = { Intl };
context.self = context;
vm.runInNewContext(readFileSync(new URL("extension/cau-nghe.js", root), "utf8"), context);
vm.runInNewContext(readFileSync(new URL("extension/ngu-phap.js", root), "utf8"), context);
const np = context.NguPhap;

const tuWeb = {
  key: "javi:天気", word: "天気",
  src: { sel: "天気", prefix: "前の文。今日は", suffix: "がいいです。次の文。" }
};
assert.equal(np.layCau(tuWeb), "今日は天気がいいです。");

const tuVideo = {
  key: "javi:勉強", word: "勉強",
  src: { sel: "勉強", cau: "私は毎朝日本語を勉強します。", yt: { v: "abc", t: 42 } }
};
assert.equal(np.layCau(tuVideo), "私は毎朝日本語を勉強します。");

const coBaiNghe = {
  key: "javi:勉強2", word: "勉強",
  cauNghe: { cau: "私は毎日日本語を勉強しています。", dich: "Tôi học tiếng Nhật mỗi ngày." },
  src: tuVideo.src
};
assert.equal(np.layCau(coBaiNghe), coBaiNghe.cauNghe.cau);

const caCau = { key: "javi:cau", kind: "sent", word: "明日は図書館で本を読みます。" };
assert.equal(np.layCau(caCau), caCau.word);
assert.equal(np.layCau({ ...tuVideo, del: true }), "");
assert.equal(np.layCau({ word: "勉強", src: { sel: "勉強" } }), "");
assert.equal(np.layCau({ word: "book", kind: "sent" }), "");

for (const sentence of [
  "私は毎朝日本語を勉強します。",
  "昨日は友達と駅の近くで昼ご飯を食べました。",
  "今日は天気がいいです。"
]) {
  const parts = np.catCau(sentence);
  assert.ok(parts && parts.length >= 2 && parts.length <= 4, sentence);
  assert.equal(parts.map((x) => x.text).join(""), sentence);
  assert.ok(parts.every((x) => x.text.trim().length >= 2));
  const shuffled = np.xaoTron(parts, () => 0.9999);
  assert.ok(shuffled);
  assert.notEqual(shuffled.map((x) => x.text).join(""), sentence);
  assert.equal(shuffled.slice().sort((a, b) => a.id - b.id).map((x) => x.text).join(""), sentence);
}
assert.equal(np.catCau("短い。"), null);

const videoCu = { key: "javi:勉強-cũ", word: "勉強",
  src: { sel: "勉強", yt: { v: "abc", t: 42 } } };
const daBoSung = np.boSungTuKho([videoCu], {
  "abc|ja:auto": { cau: [{ t: 39, tEnd: 45, s: "私は毎朝日本語を勉強します。" }] },
  "khac|ja": { cau: [{ t: 39, tEnd: 45, s: "勉強は楽しいです。" }] }
});
assert.equal(daBoSung[0].src.cau, "私は毎朝日本語を勉強します。");
assert.equal(videoCu.src.cau, undefined);
assert.equal(np.boSungTuKho([{ ...videoCu, src: { ...videoCu.src, yt: { v: "abc", t: 100 } } }], {
  "abc|ja": { cau: [{ t: 39, tEnd: 45, s: "私は毎朝日本語を勉強します。" }] }
})[0].src.cau, undefined);

const videoQuiz = np.taoBai(tuVideo, () => 0.9999);
assert.ok(videoQuiz);
assert.equal(videoQuiz.cau, tuVideo.src.cau);
assert.equal(videoQuiz.tu, tuVideo.word);
const list = np.danhSach([tuVideo, { ...tuVideo, key: "dup" }, caCau, { word: "なし" }], () => 0.9999);
assert.equal(list.length, 2);
console.log("Luyện ngữ pháp: lấy câu, cắt 2–4 mảnh, xáo trộn và lọc trùng OK");
