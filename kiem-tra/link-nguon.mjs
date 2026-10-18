/**
 * LINK NGUỒN DẠNG file:// — dán vào không bị gắn nhầm "https://", và link đã lưu sai kiểu
 * `https://file///…` được chữa khi mở.
 *
 *   node kiem-tra/link-nguon.mjs /home/user/NeutronDict/extension
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ket = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
const dir = mkdtempSync(join(tmpdir(), "nguon-"));
const ten = "Điện lực – 電力 N2 (OFF+VIP).html".normalize("NFD");
writeFileSync(join(dir, ten), "<html><body><p>Xin chào 電力 là gì</p></body></html>");
const url = pathToFileURL(join(dir, ten)).href;
const hong = url.replace(/^file:\/\/\//, "https://file///");        // đúng kiểu hỏng người dùng gặp
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-")), {
  channel: "chromium", headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker");
const id = sw.url().split("/")[2];
for (let i = 0; i < 40; i++) { if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break; await new Promise((r) => setTimeout(r, 250)); }
await sw.evaluate(() => { self.fetch = () => Promise.reject(new Error("x")); });
const now = Date.now();
await sw.evaluate(async ([u, now]) => {
  await chrome.storage.local.set({ notebook: { "javi:電力": { word: "電力", dict: "javi", means: ["điện lực"], ts: now, src: { url: u, title: "t", sel: "電力", prefix: "Xin chào ", suffix: " là gì" } } },
    decks: {}, hoc: {}, settings: { ngu: "ja" } });
}, [hong, now]);
const page = await ctx.newPage();
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForSelector(".entry");
const u = await page.evaluate(() => ({
  a: chuanHoaUrl("https://file///Users/a/b%20c.pdf#page=15"), b: chuanHoaUrl("https://file:///Users/a.pdf"),
  c: chuanHoaUrl("file:///Users/a.pdf#page=2"), w: chuanHoaUrl("file:///C:/Users/An/Doc%20x.pdf#page=3"), w2: chuanHoaUrl("C:\\Users\\An\\Doc x.pdf"), m: chuanHoaUrl("/Users/an/Doc x.pdf"), d: chuanHoaUrl("example.com/trang"), e: chuanHoaUrl("https://a.com/x") }));
soat("https://file/// được chữa về file:///", u.a === "file:///Users/a/b%20c.pdf#page=15", u.a);
soat("https://file:/// cũng vậy", u.b === "file:///Users/a.pdf", u.b);
soat("file:/// dán vào giữ nguyên (không bị gắn https://)", u.c === "file:///Users/a.pdf#page=2", u.c);
soat("Windows: file:///C:/… giữ nguyên; đường dẫn trần C:\\… và /Users/… thành file:///",
     u.w === "file:///C:/Users/An/Doc%20x.pdf#page=3" && u.w2 === "file:///C:/Users/An/Doc%20x.pdf" && u.m === "file:///Users/an/Doc%20x.pdf", JSON.stringify([u.w, u.w2, u.m]));
soat("link trần vẫn được thêm https://", u.d === "https://example.com/trang" && u.e === "https://a.com/x");
const mo = ctx.waitForEvent("page", { timeout: 8000 }).catch(() => null);
await page.evaluate(() => openSource(items[0]));
const np = await mo;
if (np) await np.waitForLoadState().catch(() => {});
soat("mở được link đã lưu SAI kiểu https://file///…", !!np && np.url().startsWith("file:///"), np && np.url().slice(0, 60));
soat("và đúng tệp, đúng nội dung", !!np && /Xin chào 電力/.test(await np.locator("body").innerText().catch(() => "")));
await ctx.close();
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
