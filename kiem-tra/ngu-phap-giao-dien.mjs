import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const ext = process.argv[2] || path.resolve("extension");
const root = path.resolve(ext, "..");
const cau = "私は毎朝日本語を勉強します。";
const dich = "Tôi học tiếng Nhật mỗi sáng.";
const browser = await chromium.launch({ headless: true });

try {
  for (const [surface, htmlPath, jsDir] of [
    ["extension", path.join(ext, "notebook.html"), ext],
    ["Android", path.join(root, "android/www/index.html"), path.join(root, "android/www")]
  ]) {
    const html = readFileSync(htmlPath, "utf8");
    const start = html.indexOf('<section id="viewGrammar"');
    const end = html.indexOf('<section id="viewSpeak"', start);
    assert.ok(start >= 0 && end > start, surface + ": missing grammar view");
    const page = await browser.newPage();
    await page.setContent("<!DOCTYPE html><html><body>" + html.slice(start, end) + "</body></html>");
    await page.addScriptTag({ content: "window.T = (s) => s; window.T2 = (s, o) => s.replace(/\\{([^}]+)\\}/g, (_, k) => o[k]);" });
    await page.addScriptTag({ content: readFileSync(path.join(jsDir, "ngu-phap.js"), "utf8") });
    await page.addScriptTag({ content: readFileSync(path.join(jsDir, "ngu-phap-ui.js"), "utf8") });
    await page.evaluate(async ({ cau, dich }) => {
      window.NguPhapUI.khoiTao({
        layMuc: async () => [{ key: "javi:勉強", word: "勉強", src: { cau } }],
        ngonNgu: () => "ja",
        dichCau: async () => dich
      });
      await window.NguPhapUI.lamMoi();
    }, { cau, dich });
    assert.equal(await page.locator("#npStart").isVisible(), true, surface);
    await page.locator("#npStart").click();
    const soManh = await page.locator("#npOptions button").count();
    assert.ok(soManh >= 2 && soManh <= 4, surface + ": fragment count");
    assert.equal(await page.locator("#npResult").isVisible(), false, surface);
    const thuTu = await page.evaluate((s) => window.NguPhap.catCau(s).map((x) => x.text.trim()), cau);
    for (const manh of thuTu) {
      await page.evaluate((text) => {
        const b = [...document.querySelectorAll("#npOptions button")].find((x) => x.textContent === text);
        if (!b) throw new Error("Missing fragment " + text);
        b.click();
      }, manh);
    }
    await page.locator("#npCheck").click();
    await page.waitForFunction((expected) => document.getElementById("npTranslation").textContent === expected, dich);
    assert.equal(await page.locator("#npOriginal").textContent(), cau, surface);
    assert.equal(await page.locator("#npResult").isVisible(), true, surface);
    await page.locator("#npNext").click();
    await page.locator("#npStart").click();
    await page.locator("#npSkip").click();
    await page.waitForFunction((expected) => document.getElementById("npTranslation").textContent === expected, dich);
    assert.equal(await page.locator("#npOriginal").textContent(), cau, surface + ": skip answer");
    await page.locator("#npNext").click();

    // Hơn 10 câu: phải đi qua câu 11 đến câu cuối, mỗi câu đúng một lượt.
    const nhieuCau = Array.from({ length: 13 }, (_, i) => ({
      key: "javi:勉強:" + i, word: "勉強",
      src: { cau: "私は毎朝" + (i + 1) + "分間日本語を勉強します。", cauDich: "Câu " + (i + 1) }
    }));
    await page.evaluate(async (ds) => {
      window.NguPhapUI.khoiTao({ layMuc: async () => ds, ngonNgu: () => "ja" });
      await window.NguPhapUI.lamMoi();
    }, nhieuCau);
    for (let luot = 0; luot < 2; luot++) {
      await page.locator("#npStart").click();
      const daGap = new Set();
      for (let i = 0; i < nhieuCau.length; i++) {
        assert.match(await page.locator("#npProgress").textContent(),
          new RegExp("Câu " + (i + 1) + "/13"), surface + ": progress past ten");
        assert.equal(await page.locator("#npResult").isVisible(), false);
        await page.locator("#npSkip").click();
        const goc = await page.locator("#npOriginal").textContent();
        const q = nhieuCau.find((x) => x.src.cau === goc);
        assert.ok(q, surface + ": saved source sentence");
        assert.equal(await page.locator("#npTranslation").textContent(), q.src.cauDich);
        assert.equal(daGap.has(goc), false, surface + ": no repeats before finishing");
        daGap.add(goc);
        await page.locator("#npNext").click();
      }
      assert.equal(daGap.size, 13, surface + ": reaches every eligible sentence");
      assert.equal(await page.locator("#npExercise").isVisible(), false);
      assert.match(await page.locator("#npCount").textContent(), /0\/13/);
      assert.equal(await page.locator("#npStart").textContent(), "Luyện lại");
    }
    await page.close();
  }
  console.log("Luyện ngữ pháp: đáp án, bản dịch, đi hết 13 câu và luyện lại trên hai nền tảng OK");
} finally {
  await browser.close();
}
