/**
 * Tab Dịch trong popup phải gọi Google Dịch ĐÚNG HƯỚNG.
 *
 * Lỗi thật: ở chế độ Nhật (hướng "javi"), popup bảo dịch từ tiếng ANH một câu
 * tiếng Nhật, Google trả lại nguyên câu — "tra ở tab Dịch mà ra nguyên mẫu".
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-")), {
  channel: "chromium", headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
let sw = ctx.serviceWorkers()[0];
if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 20000 });
const ID = sw.url().split("/")[2];
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
console.log("Tab Dịch gọi đúng hướng");

/* Giả gtxTranslate: trả về "VI(<from>→<to>):<text>" để biết popup gửi hướng nào. */
await sw.evaluate(() => {
  self.gtxTranslate = async (text, f, t) => "VI(" + f + "→" + t + "):" + text;
  self.gtxTranslateDetect = async (text) => ({ text: "VI(auto):" + text, src: "ja" });
});
await sw.evaluate(async () => {
  await chrome.storage.local.set({ settings: { ngu: "ja" }, notebook: {}, trCache: {} });
});

const pop = await ctx.newPage();
pop.on("pageerror", (e) => loi.push("popup: " + e.message));
await pop.goto(`chrome-extension://${ID}/popup.html`);
await pop.waitForTimeout(700);

/* Gõ một câu tiếng Nhật rồi mở tab Dịch */
await pop.fill("#q", "伝統の酒を守る");
await pop.click("#tabTrans").catch(async () => {
  // id có thể khác — bấm nút có chữ "Dịch"
  await pop.evaluate(() => {
    const b = [...document.querySelectorAll("button, .tab")].find((x) => /Dịch|Translate|翻訳/.test(x.textContent));
    if (b) b.click();
  });
});
await pop.waitForTimeout(1200);

const than = await pop.textContent("#trans").catch(() => pop.textContent("body"));
soat("tab Dịch gọi hướng ja→vi (không phải en→vi)", /VI\(ja→vi\)/.test(than || ""),
  (than || "").slice(0, 60));
soat("KHÔNG trả về nguyên câu tiếng Nhật", !/^\s*伝統の酒を守る\s*$/.test((than || "").trim()),
  (than || "").slice(0, 40));

/* Ở chế độ Anh, hướng envi vẫn phải là en→vi */
await sw.evaluate(async () => { await chrome.storage.local.set({ settings: { ngu: "en" } }); });
const pop2 = await ctx.newPage();
pop2.on("pageerror", (e) => loi.push("popup2: " + e.message));
await pop2.goto(`chrome-extension://${ID}/popup.html`);
await pop2.waitForTimeout(700);
await pop2.fill("#q", "hello world");
await pop2.evaluate(() => {
  const b = [...document.querySelectorAll("button, .tab")].find((x) => /Dịch|Translate/.test(x.textContent));
  if (b) b.click();
});
await pop2.waitForTimeout(1000);
const than2 = await pop2.textContent("#trans").catch(() => "");
soat("chế độ Anh vẫn dịch được (auto/en→vi), không trả nguyên câu",
  /VI\((auto|en→vi)\)/.test(than2 || ""), (than2 || "").slice(0, 40));

console.log(loi.length ? "LỖI JS:\n" + loi.join("\n") : "  không có lỗi JS");
await ctx.close();
process.exit(ket.every(Boolean) && !loi.length ? 0 : 1);
