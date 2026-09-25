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
    await page.close();
  }
  console.log("Luyện ngữ pháp: đáp án và bản dịch sau khi ghép đúng hoặc xem đáp án OK");
} finally {
  await browser.close();
}
