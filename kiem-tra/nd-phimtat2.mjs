/**
 * Ctrl+Shift+Z bắt ngay trong trang, không dựa vào lệnh của Chrome.
 *
 * Bôi đen một đoạn rồi bấm phím tắt: content script phải gửi OPEN_LOOKUP, nền
 * mở cửa sổ popup và ghi từ cần tra vào pendingLookup.
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
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
console.log("Phím tắt Ctrl+Shift+Z bắt trong trang");

await sw.evaluate(async () => {
  await chrome.storage.local.set({ settings: { ngu: "ja", inline: true }, notebook: {} });
});

await ctx.route("https://vidu.test/**", (r) =>
  r.fulfill({ contentType: "text/html; charset=utf-8",
    body: `<!doctype html><meta charset="utf-8"><title>Thử</title><body><p id="p">これは伝統の酒を守るための文です。</p>` }));
const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push("trang: " + e.message));
await page.goto("https://vidu.test/a");
await page.waitForTimeout(1200);

/* bôi đen 4 chữ đầu của đoạn */
await page.evaluate(() => {
  const p = document.getElementById("p");
  const r = document.createRange();
  r.setStart(p.firstChild, 3); r.setEnd(p.firstChild, 7);   // 伝統の酒
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
});
const chon = await page.evaluate(() => getSelection().toString());
soat("bôi đen được một đoạn", !!chon, chon);

const soCuaSoTruoc = ctx.pages().length;

/* bắn Ctrl+Shift+Z */
await page.evaluate(() => {
  document.dispatchEvent(new KeyboardEvent("keydown", {
    key: "z", code: "KeyZ", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
  }));
});
await page.waitForTimeout(1800);
console.log("  URL các trang:", ctx.pages().map((p)=>p.url().slice(0,50)));

/* Cửa sổ popup mở lên tự đọc từ cần tra rồi xoá pendingLookup — nên kiểm ngay
   trong ô tra của popup, đó mới là thứ người dùng thấy. */
await page.waitForTimeout(800);
const trangPopup = ctx.pages().find((p) => p.url().includes("popup.html"));
soat("mở được cửa sổ popup", !!trangPopup, trangPopup ? trangPopup.url().slice(-40) : "không thấy");
let oQ = "";
if (trangPopup) { await trangPopup.waitForTimeout(800); oQ = await trangPopup.inputValue("#q").catch(() => ""); }
soat("popup điền sẵn đúng từ vừa bôi đen", oQ === "伝統の酒", JSON.stringify(oQ));



/* không bôi đen gì thì phím tắt để yên (Ctrl+Shift+Z còn là "làm lại") */
await sw.evaluate(async () => { await chrome.storage.local.remove("pendingLookup"); });
await page.evaluate(() => getSelection().removeAllRanges());
let daChan = false;
await page.evaluate(() => {
  const ev = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
  window.__chan = false;
  document.addEventListener("keydown", (e) => { window.__chan = e.defaultPrevented; }, { once: true });
  document.dispatchEvent(ev);
});
daChan = await page.evaluate(() => window.__chan);
soat("không bôi đen thì KHÔNG chặn phím (để làm lại còn dùng được)", daChan === false, String(daChan));

console.log(loi.length ? "LỖI JS:\n" + loi.join("\n") : "  không có lỗi JS");
await ctx.close();
process.exit(ket.every(Boolean) && !loi.length ? 0 : 1);
