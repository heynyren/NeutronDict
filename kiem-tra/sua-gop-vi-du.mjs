/**
 * MỘT NÚT SỬA CHO TẤT CẢ + SỬA ĐƯỢC CÂU VÍ DỤ + LỌC TIẾNG VIỆT LẪN TRONG VÍ DỤ
 *
 *   node kiem-tra/sua-gop-vi-du.mjs /home/user/NeutronDict/extension
 *
 *   1. Hàng sổ tay chỉ còn MỘT nút sửa (gộp "sửa bản dịch" + "ghi chú"); thẻ học cũng vậy.
 *   2. Hộp sửa có đủ: nghĩa, câu ví dụ, bản dịch ví dụ, ghi chú — lưu một lần.
 *   3. Ví dụ lẫn tiếng Việt: lọc được thì hiện phần sạch; không lọc được thì báo để sửa tay.
 *   4. Ví dụ người dùng đã sửa (`sua`) không bị nền ghi đè khi lưu lại từ đó; xoá ví dụ được.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-")), {
  channel: "chromium", headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker", { timeout: 20000 });
const ID = sw.url().split("/")[2];
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
}
const now = Date.now();
await sw.evaluate(async (now) => {
  self.dichTu = async (t) => ({ main: "MAY:" + t, senses: [], data: null });
  self.gtxTranslate = async () => "";
  const src = (w) => ({ url: "https://x.test/" + w, title: "t", sel: w });
  await chrome.storage.local.set({
    settings: { ngu: "en", goiDien: false }, decks: {}, hoc: {},
    notebook: {
      "envi:breaker": { word: "breaker", dict: "envi", means: ["máy cắt"], ts: now, src: src("breaker"),
        cauNghe: { cau: "The breaker trips when current exceeds the limit. Máy cắt nhảy khi dòng điện vượt quá giới hạn.", dich: "Máy cắt nhảy.", ts: now } },
      "envi:relay": { word: "relay", dict: "envi", means: ["rơle"], ts: now - 1, src: src("relay"),
        cauNghe: { cau: "Rơle(relay) bảo vệ", dich: "", ts: now } },
      "envi:fuse": { word: "fuse", dict: "envi", means: ["cầu chì"], ts: now - 2, src: src("fuse"),
        cauNghe: { cau: "The fuse blows.", dich: "Cầu chì cháy.", ts: now } }
    }
  });
}, now);

const pg = await ctx.newPage();
pg.on("pageerror", (e) => loi.push(e.message));
await pg.goto(`chrome-extension://${ID}/notebook.html`);
await pg.waitForSelector(".entry", { timeout: 20000 });
await pg.evaluate(() => document.querySelectorAll(".celebrate.show").forEach((e) => e.classList.remove("show")));
const hang = (k) => '#list .entry[data-key="envi:' + k + '"]';
const doc = (k) => sw.evaluate(async (k) => (await chrome.storage.local.get("notebook")).notebook["envi:" + k], k);

console.log("Một nút sửa");
const nut = await pg.evaluate((s) => [...document.querySelectorAll(s + " .ctl .iconbtn")].map((b) => b.title), hang("breaker"));
soat("hàng chỉ còn một nút sửa chung", nut.filter((t) => /^Sửa nghĩa, câu ví dụ, ghi chú/.test(t)).length === 1
  && !nut.some((t) => /Sửa bản dịch cho đúng|Thêm ghi chú|Sửa ghi chú/.test(t)), JSON.stringify(nut));
soat("thẻ học không còn nút Ghi chú riêng", await pg.evaluate(() => !document.getElementById("stNote")));

console.log("\nLọc tiếng Việt lẫn trong ví dụ");
const vd = await pg.evaluate((k) => { const e = document.querySelector(k + " .nguc-cau"); return e ? e.textContent : null; }, hang("breaker"));
soat("lọc được: chỉ còn câu tiếng Anh", vd === "The breaker trips when current exceeds the limit.", vd);
const lan = await pg.evaluate((k) => { const e = document.querySelector(k + " .nguc"); return e ? { cls: e.className, hint: (e.querySelector(".nguc-lan") || {}).textContent || "" } : null; }, hang("relay"));
soat("không lọc được: báo 'lẫn tiếng Việt — bấm để sửa'", !!lan && /lan/.test(lan.cls) && /tiếng Việt/.test(lan.hint), JSON.stringify(lan));
const sachLai = await doc("fuse");
soat("ví dụ sạch thì không bị đụng", sachLai.cauNghe.cau === "The fuse blows." && sachLai.cauNghe.dich === "Cầu chì cháy.");

console.log("\nHộp sửa gộp");
await pg.click(hang("relay") + " .ctl .iconbtn[title^='Sửa nghĩa']");
await pg.waitForSelector("#editSheet.show");
const o = await pg.evaluate(() => ({
  tit: document.getElementById("edTitle").textContent, trans: document.getElementById("edTrans").value,
  cau: document.getElementById("edViDu").value, hint: document.getElementById("edViDuHint").textContent,
  coNote: !!document.getElementById("edNote"), thay: getComputedStyle(document.getElementById("edViDuWrap")).display !== "none"
}));
soat("mở một hộp có đủ nghĩa + ví dụ + ghi chú", o.tit === "Sửa mục này" && o.trans === "rơle" && o.coNote && o.thay, JSON.stringify(o));
soat("ví dụ chưa lọc được hiện nguyên để sửa, kèm lời nhắc", o.cau === "Rơle(relay) bảo vệ" && /lẫn tiếng Việt/.test(o.hint), o.hint.slice(0, 50));
await pg.fill("#edTrans", "rơle bảo vệ\nrơ-le");
await pg.fill("#edViDu", "Check the relay setting.");
await pg.fill("#edViDuDich", "Kiểm tra cài đặt rơle.");
await pg.fill("#edNote", "dùng trong trạm biến áp");
await pg.click("#edSave");
await pg.waitForTimeout(700);
let r = await doc("relay");
soat("một lần lưu: nghĩa + ví dụ + bản dịch ví dụ + ghi chú", r.means.join("|") === "rơle bảo vệ|rơ-le" && r.note === "dùng trong trạm biến áp"
  && r.cauNghe.cau === "Check the relay setting." && r.cauNghe.dich === "Kiểm tra cài đặt rơle." && r.cauNghe.sua === 1, JSON.stringify(r.cauNghe));
const sau = await pg.evaluate((k) => { const e = document.querySelector(k + " .nguc"); return e ? { t: e.querySelector(".nguc-cau").textContent, lan: e.classList.contains("lan") } : null; }, hang("relay"));
soat("hàng hiện ví dụ mới, hết báo lẫn", !!sau && sau.t === "Check the relay setting." && !sau.lan, JSON.stringify(sau));

console.log("\nBản sửa tay không bị nền ghi đè");
await pg.evaluate(() => new Promise((ok) => chrome.runtime.sendMessage({ type: "SAVE_WORD",
  entry: { word: "relay", reading: "", means: ["rơle"], src: { url: "https://x.test/relay", title: "t", sel: "relay", cau: "Some other sentence with relay inside." } }, dict: "envi" }, ok)));
await pg.waitForTimeout(800);
r = await doc("relay");
soat("lưu lại từ đó: ví dụ tự sửa vẫn nguyên", r.cauNghe.cau === "Check the relay setting." && r.cauNghe.sua === 1, JSON.stringify(r.cauNghe));
// chỉ sửa câu, không sửa bản dịch => bản dịch cũ không còn khớp câu => bỏ
await pg.click(hang("relay") + " .nguc");
await pg.waitForSelector("#editSheet.show");
await pg.waitForTimeout(200);
const fo = await pg.evaluate(() => document.activeElement && document.activeElement.id);
soat("bấm vào ví dụ: mở hộp sửa, con trỏ ở ô ví dụ", fo === "edViDu", fo);
await pg.fill("#edViDu", "Check the relay carefully.");
await pg.click("#edSave");
await pg.waitForTimeout(500);
r = await doc("relay");
soat("sửa câu mà không sửa bản dịch: bản dịch cũ bị bỏ", r.cauNghe.cau === "Check the relay carefully." && r.cauNghe.dich === "", JSON.stringify(r.cauNghe));

console.log("\nXoá ví dụ");
await pg.click(hang("relay") + " .ctl .iconbtn[title^='Sửa nghĩa']");
await pg.waitForSelector("#editSheet.show");
await pg.fill("#edViDu", ""); await pg.fill("#edViDuDich", "");
await pg.click("#edSave");
await pg.waitForTimeout(500);
r = await doc("relay");
soat("xoá trắng ví dụ: lưu là 'không ví dụ', nền không moi lại", r.cauNghe && r.cauNghe.cau === "" && r.cauNghe.sua === 1);
soat("hàng không còn khối ví dụ", await pg.evaluate((k) => !document.querySelector(k + " .nguc"), hang("relay")));
soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 200));
await ctx.close();
process.exit(ket.every(Boolean) ? 0 : 1);
