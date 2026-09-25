import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const ext = process.argv[2] || path.resolve("extension");
const root = path.resolve(ext, "..");
const browser = await chromium.launch({ headless: true });
const doc = (p) => readFileSync(path.join(root, p), "utf8");
const ham = (s, name) => {
  const start = s.indexOf("function " + name + "(");
  assert.ok(start >= 0, name);
  const end = s.indexOf("\n}\n", start);
  return (s.slice(start - 6, start) === "async " ? "async " : "") + s.slice(start, end + 3);
};
try {
  for (const p of ["extension/notebook.js", "android/www/app.js"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setContent('<div id="stLienDe"></div><div id="stLienO"></div><div id="stLienKq"></div><button id="stLienXong">Xong</button><button id="stLienTiep">Tiếp</button>');
    await page.addScriptTag({ content: doc("extension/tu-lien.js") });
    await page.addScriptTag({ content: `
      const $ = (id) => document.getElementById(id);
      const T = (s) => s;
      const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
      };
      const NGU = "ja", laNhat = () => true;
      let items = [], mucDaLuu = [], baiLien = null, tiepBaiLien = null, msDaDung = null;
      let session = { queue: [], done: 0, again: 0 };
      window.grades = [];
      const gradeWord = async (...args) => window.grades.push(args);
      const coVu = () => {}, syncSoon = () => {}, veChuoiNgay = () => {};
      const theoDoi = { ghiLuotOn: async () => [] };
      const showCard = () => { window.nextCalls = (window.nextCalls || 0) + 1; };
      const mung = (_, cb) => cb();
      function veKetQuaLien(b) { window.result = TuLien.xepKetQua(b); }
      window.setCase = (d, few) => {
        const it = { key: "javi:そろそろ", word: "そろそろ", means: ["dần dần"],
          lien: { dong: ["徐に"], trai: ["早速"] }, _d: d };
        items = mucDaLuu = [it,
          { key: "javi:徐に", word: "徐に", means: ["Dần dần"] },
          ...(few ? [] : [{ key: "javi:湿度", word: "湿度", means: ["độ ẩm"] }])];
        session = { queue: [it], done: 0, again: 0 };
        window.grades = [];
        veBaiLien(it);
      };
    ` });
    const src = doc(p);
    await page.addScriptTag({ content: ham(src, "veBaiLien") + "\n" + ham(src, "xongBaiLien") });
    for (const d of ["dong", "trai"]) {
      await page.evaluate((d) => window.setCase(d, false), d);
      const choices = await page.locator("#stLienO button").allTextContents();
      assert.ok(choices.includes("そろそろ"), p);
      assert.equal(choices.includes("徐に"), false, p + ": valid alternative must not be a wrong choice");
      await page.locator("#stLienO button").filter({ hasText: "そろそろ" }).click();
      await page.evaluate(() => xongBaiLien());
      const r = await page.evaluate(() => ({ grades, result, done: session.done }));
      assert.equal(r.grades.length, 1, p + ": one grade");
      assert.equal(r.grades[0][0], "javi:そろそろ");
      assert.equal(r.grades[0][1], true);
      assert.equal(r.grades[0][3], d);
      assert.equal(r.done, 1);
      assert.deepEqual(r.result.nhatNham, []);
    }
    await page.evaluate(() => window.setCase("trai", true));
    assert.equal(await page.locator("#stLienO button").count(), 0, p + ": no one-choice quiz");
    assert.equal(await page.locator("#stLienXong").textContent(), "Xem đáp án");
    await page.evaluate(() => xongBaiLien());
    const r = await page.evaluate(() => ({ grades, queued: session.queue.length, done: session.done }));
    assert.equal(r.grades.length, 0, p + ": no SRS grade for ambiguous question");
    assert.equal(r.done, 0);
    assert.equal(r.queued, 0);
    assert.match(await page.locator("#stLienKq").textContent(), /Không tính điểm SRS/);
    await page.evaluate(() => tiepBaiLien());
    assert.equal(await page.evaluate(() => window.nextCalls), 1, p + ": can continue");
    assert.deepEqual(errors, [], p);
    await page.close();
  }
  console.log("Đề đảo trên extension/Android: không bẫy từ đồng nghĩa, chấm đúng, thiếu nhiễu không ghi SRS và vẫn tiếp tục được OK");
} finally {
  await browser.close();
}
