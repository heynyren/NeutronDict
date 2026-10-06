/**
 * CỬ CHỈ ĐỢT HAI (extension, chuột thật).
 *
 *   node kiem-tra/cu-chi-hai.mjs /home/user/NeutronDict/extension
 *
 *   Thẻ học:  vuốt ngang chấm NGAY không cần Space · phím F/J cũng vậy · kéo lên = mở nguồn ·
 *             kéo xuống = hỏi Gemini · nhấp đúp chỗ trống = sửa nghĩa · bài điền khuyết thì
 *             KHÔNG cử chỉ nào chấm/mở được (sẽ lộ đáp án)
 *   Sổ tay:   nhấp đúp = sửa nghĩa · kéo phải = xoá nhanh (+Hoàn tác) · kéo trái = mở link
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-")), {
  channel: "chromium", headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker", { timeout: 20000 });
const id = sw.url().split("/")[2];
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await cho(250);
}
await sw.evaluate(() => { self.fetch = () => Promise.reject(new Error("chặn")); });
const NGAY = 86400000, now = Date.now();
const co = (w, extra) => Object.assign({ word: w, dict: "javi", means: [w + "-nghĩa"], ts: now, srs: { lv: 2, due: now - NGAY, ts: now },
  src: { url: "https://x.test/" + encodeURIComponent(w), title: "t", sel: w },
  duong: { nhin: { lv: 3, ngay: 3, net: 2, sai: 0, due: now - NGAY, ts: now - 5 * NGAY } } }, extra || {});
const nbBase = () => ({
  "javi:猫": co("猫"), "javi:犬": co("犬"), "javi:鳥": co("鳥"), "javi:魚": co("魚"), "javi:馬": co("馬"),
  "javi:牛": co("牛", { src: undefined })            // không có link nguồn
});
const gieo = (nb) => sw.evaluate(async (nb) => {
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, nb);
await gieo(nbBase());
const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.setViewportSize({ width: 1000, height: 800 });
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 6, null, { timeout: 20000 });
await page.evaluate(() => {
  window.__log = [];
  openSource = (it) => { window.__log.push("nguon:" + it.word); };
  moGemini = (it) => { window.__log.push("gemini:" + it.word); };
});
const detMung = async () => {
  for (let i = 0; i < 12; i++) {
    const c = await page.evaluate(() => {
      const o = document.getElementById("tdCelebrate");
      if (!o || !o.classList.contains("show")) return false;
      const n = o.querySelector("button"); if (n) n.click(); return true;
    });
    if (!c) return;
    await cho(200);
  }
};
const log = () => page.evaluate(() => window.__log.slice());
const trang = () => page.evaluate(() => ({ q: session.queue.length, d: session.done, a: session.again, ls: (session.lichSu || []).length,
  grade: document.getElementById("stGrade").style.display, sheet: document.getElementById("editSheet").classList.contains("show") }));
const doc = (w) => sw.evaluate(async (t) => {
  const n = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k in n) if (n[k] && n[k].word === t) return n[k];
  return null;
}, w);
/** Kéo chuột từ (x,y) đi (dx,dy). */
const keo = async (x, y, dx, dy) => {
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
};
const hopThe = () => page.locator("#stCard").boundingBox();
const dongSua = async () => { await page.keyboard.press("Escape"); await cho(250); };

/* ------------------------------------------------------------------ */
console.log("Thẻ học: chấm ngay, không cần Space");
await page.click("#study");
await page.waitForFunction(() => document.getElementById("studyOverlay").classList.contains("show"));
await cho(350);
{
  let b = await hopThe();
  const t0 = await trang();
  soat("thẻ đang ÚP (chưa Space)", t0.grade === "none");
  await keo(b.x + b.width / 2, b.y + 60, 220, 8); await cho(700); await detMung(); await cho(300);
  const t1 = await trang();
  soat("vuốt PHẢI khi chưa lật: chấm Nhớ ngay", t1.d === t0.d + 1 && t1.ls === 1, JSON.stringify(t1));
  b = await hopThe();
  await keo(b.x + b.width / 2, b.y + 60, -220, 8); await cho(700); await detMung(); await cho(300);
  const t2 = await trang();
  soat("vuốt TRÁI khi chưa lật: chấm Quên ngay", t2.a === t1.a + 1 && t2.ls === 2, JSON.stringify(t2));
  await page.keyboard.press("j"); await cho(700); await detMung(); await cho(300);
  const t3 = await trang();
  soat("phím J khi chưa lật: chấm Nhớ ngay", t3.d === t2.d + 1 && t3.ls === 3, JSON.stringify(t3));
  await page.keyboard.press("f"); await cho(700); await detMung(); await cho(300);
  const t4 = await trang();
  soat("phím F khi chưa lật: chấm Quên ngay", t4.a === t3.a + 1 && t4.ls === 4, JSON.stringify(t4));
}

console.log("\nThẻ học: kéo dọc + nhấp đúp");
{
  await page.evaluate(() => { window.__log.length = 0; });
  let b = await hopThe();
  const w = await page.evaluate(() => theCardHienTai().word);
  const tr = await trang();
  await keo(b.x + b.width / 2, b.y + b.height / 2 + 40, 0, -150); await cho(400);
  const l1 = await log();
  soat("kéo LÊN: mở nguồn của đúng từ đang hiện", l1.length === 1 && l1[0] === "nguon:" + w, l1.join(","));
  soat("thẻ trượt về chỗ cũ và KHÔNG bị chấm", (await page.evaluate(() => document.getElementById("stCard").style.transform)) === "" && (await trang()).ls === tr.ls);
  await keo(b.x + b.width / 2, b.y + 60, 0, 150); await cho(400);
  const l2 = await log();
  soat("kéo XUỐNG: hỏi Gemini về đúng từ đó", l2.length === 2 && l2[1] === "gemini:" + w, l2.join(","));
  await keo(b.x + b.width / 2, b.y + 60, 0, 30); await cho(300);
  soat("kéo dọc ngắn (30px) không làm gì", (await log()).length === 2);
  // Nhãn nổi lên lúc kéo
  await page.mouse.move(b.x + b.width / 2, b.y + 100); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + 170, { steps: 6 });
  const goi = await page.evaluate(() => { const g = document.querySelector("#stCard > .the-goi"); return g ? { chu: g.textContent, lop: g.className, op: Number(g.style.opacity) } : null; });
  await page.mouse.up(); await cho(300);
  soat("lúc kéo xuống nổi nhãn “Hỏi Gemini”", goi && /Hỏi Gemini/.test(goi.chu) && /xuong/.test(goi.lop) && goi.op > 0.3, JSON.stringify(goi));
  await page.evaluate(() => { window.__log.length = 0; });
  // Nhấp đúp vào chỗ trống của thẻ (sát mép trong của thẻ)
  b = await hopThe();
  await page.mouse.dblclick(b.x + 8, b.y + b.height - 6); await cho(400);
  soat("nhấp đúp chỗ trống: mở phần sửa nghĩa", (await trang()).sheet);
  const ten = await page.evaluate(() => document.getElementById("edTitle").textContent);
  soat("đúng phiếu “Sửa bản dịch”", /Sửa bản dịch/.test(ten), ten);
  await dongSua();
  // Nhấp đúp trên NÚT thì không mở
  const nut = await page.locator("#stFav .btn").first().boundingBox();
  await page.mouse.dblclick(nut.x + nut.width / 2, nut.y + nut.height / 2); await cho(400);
  soat("nhấp đúp trên một NÚT không mở phiếu sửa (nút giữ việc của nút)", !(await trang()).sheet);
}

console.log("\nThẻ học: bài điền khuyết KHÔNG cử chỉ nào lộ đáp án");
{
  await sw.evaluate(async (now) => {
    const NGAY = 86400000;
    const nb = { "javi:猫": { word: "猫", dict: "javi", means: ["mèo"], ts: now, srs: { lv: 2, due: now - NGAY, ts: now },
      src: { url: "https://x.test/neko", title: "t", sel: "猫" },
      cauNghe: { cau: "庭に猫がいます。", dich: "Có một con mèo trong vườn.", ts: now },
      duong: { nhin: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * NGAY, ts: now - 20 * NGAY },
               nghe: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * NGAY, ts: now - 20 * NGAY },
               dien: { lv: 2, ngay: 7, net: 2, sai: 0, due: now - NGAY, ts: now - 8 * NGAY } } },
      "javi:犬": { word: "犬", dict: "javi", means: ["chó"], ts: now } , "javi:鳥": { word: "鳥", dict: "javi", means: ["chim"], ts: now },
      "javi:魚": { word: "魚", dict: "javi", means: ["cá"], ts: now }, "javi:馬": { word: "馬", dict: "javi", means: ["ngựa"], ts: now } };
    await chrome.storage.local.set({ notebook: nb });
  }, now);
  await page.evaluate(() => { document.getElementById("studyOverlay").classList.remove("show"); });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 5);
  await page.evaluate(() => { window.__log = []; openSource = (it) => window.__log.push("nguon:" + it.word); moGemini = (it) => window.__log.push("gemini:" + it.word); });
  await page.click("#studyPath");
  await page.waitForSelector("#duongRiengDialog[open]");
  await page.click('#duongRiengDialog [data-ma="dien"]');
  await page.waitForFunction(() => document.getElementById("studyOverlay").classList.contains("show"));
  await cho(600);
  const dien = await page.evaluate(() => document.getElementById("stDienMat").style.display !== "none");
  soat("đang ở bài điền khuyết", dien);
  const b = await hopThe(), t0 = await trang();
  await keo(b.x + b.width / 2, b.y + 20, 220, 6); await cho(500);
  await keo(b.x + b.width / 2, b.y + 20, -220, 6); await cho(500);
  await page.keyboard.press("j"); await page.keyboard.press("f"); await cho(300);
  const t1 = await trang();
  soat("vuốt ngang và F/J KHÔNG chấm bài điền khuyết", t1.d === t0.d && t1.a === t0.a && t1.ls === t0.ls, JSON.stringify(t1));
  await keo(b.x + b.width / 2, b.y + 20, 0, -160); await cho(300);
  await keo(b.x + b.width / 2, b.y + 20, 0, 160); await cho(300);
  soat("kéo lên/xuống KHÔNG mở nguồn / Gemini (sẽ lộ từ)", (await log()).length === 0, (await log()).join(","));
  await page.mouse.dblclick(b.x + 8, b.y + b.height - 6); await cho(300);
  soat("nhấp đúp KHÔNG mở phiếu sửa (phiếu bày từ và nghĩa)", !(await trang()).sheet);
  await page.keyboard.press("Escape"); await cho(300);
}

/* ------------------------------------------------------------------ */
console.log("\nSổ tay: nhấp đúp, kéo phải xoá, kéo trái mở link");
await gieo(nbBase());
await page.reload();
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 6);
await page.evaluate(() => { window.__log = []; openSource = (it) => window.__log.push("nguon:" + it.word); });
const hang = (w) => page.evaluate((w) => {
  const e = [...document.querySelectorAll("#list .entry")].find((x) => (x.querySelector(".w") || {}).textContent.includes(w));
  if (!e) return null;
  e.scrollIntoView({ block: "center" });          // chuột chỉ trúng được những gì đang nằm trong màn hình
  const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
}, w);
{
  const h = await hang("猫");
  // vị trí an toàn: khoảng trống giữa các nút, gần mép phải của hàng
  await page.mouse.dblclick(h.x + h.w - 14, h.y + h.h - 6); await cho(400);
  soat("nhấp đúp vào hàng: mở phiếu sửa nghĩa", (await trang()).sheet);
  const ten = await page.evaluate(() => document.getElementById("edTitle").textContent);
  soat("đúng phiếu “Sửa bản dịch”", /Sửa bản dịch/.test(ten), ten);
  await dongSua();
  const nut = await page.evaluate(() => { const b = document.querySelector("#list .entry .iconbtn"); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.dblclick(nut.x, nut.y); await cho(300);
  soat("nhấp đúp lên một nút trong hàng không mở phiếu sửa", !(await trang()).sheet);
  await page.keyboard.press("Escape"); await cho(200);
}
{
  const h = await hang("犬");
  await keo(h.x + 40, h.y + h.h - 8, 90, 0); await cho(400);
  soat("kéo phải ngắn (90px) không làm gì", !!(await hang("犬")) && !!(await doc("犬")) && !(await doc("犬")).del);
  await page.mouse.move(h.x + 40, h.y + h.h - 8); await page.mouse.down();
  await page.mouse.move(h.x + 40 + 140, h.y + h.h - 8, { steps: 8 });
  const mid = await page.evaluate(() => { const e = document.querySelector("#list .entry.hang-keo"); return e ? { xoa: e.classList.contains("keo-xoa"), dau: (e.querySelector(".hang-dau.xoa") || {}).textContent, op: Number((e.querySelector(".hang-dau.xoa") || { style: {} }).style.opacity) } : null; });
  soat("đang kéo phải: hàng đỏ dần và nổi nhãn “Xoá”", mid && mid.xoa && /Xoá/.test(mid.dau) && mid.op > 0.4, JSON.stringify(mid));
  await page.mouse.move(h.x + 40 + 320, h.y + h.h - 8, { steps: 8 });
  await page.mouse.up(); await cho(900);
  const d = await doc("犬");
  soat("kéo phải đủ xa: từ bị xoá (bia mộ trong kho)", d && d.del === true, JSON.stringify(d && d.del));
  soat("hàng biến khỏi danh sách", (await hang("犬")) === null);
  const toast = await page.evaluate(() => ({ chu: document.getElementById("toast").textContent, nut: !!document.querySelector("#toast .toast-nut") }));
  soat("có lời nhắc kèm nút Hoàn tác", /Đã xoá/.test(toast.chu) && toast.nut, toast.chu);
  await page.evaluate(() => document.querySelector("#toast .toast-nut").click()); await cho(900);
  const d2 = await doc("犬");
  soat("Hoàn tác trả lại từ", d2 && !d2.del && !!(await hang("犬")));
}
{
  await page.evaluate(() => { window.__log.length = 0; });
  const h = await hang("鳥");
  await keo(h.x + h.w - 40, h.y + h.h - 8, -320, 0); await cho(500);
  const l = await log();
  soat("kéo TRÁI đủ xa: mở link nguồn của từ", l.length === 1 && l[0] === "nguon:鳥", l.join(","));
  soat("hàng trượt về chỗ cũ", (await page.evaluate(() => { const e = [...document.querySelectorAll("#list .entry")].find((x) => x.textContent.includes("鳥")); return e.style.transform; })) === "");
  soat("từ vẫn còn nguyên (kéo trái không xoá)", !(await doc("鳥")).del);
  // Từ không có link
  const h2 = await hang("牛");
  await keo(h2.x + h2.w - 40, h2.y + h2.h - 8, -320, 0); await cho(500);
  const t = await page.evaluate(() => document.getElementById("toast").textContent);
  soat("từ KHÔNG có link: không mở gì, báo rõ", (await log()).length === 1 && /chưa có link/.test(t), t);
}
{
  // Kéo dọc (cuộn) không bị nhầm thành xoá/mở link
  const h = await hang("魚");
  await page.mouse.move(h.x + 60, h.y + 20); await page.mouse.down();
  await page.mouse.move(h.x + 66, h.y + 120, { steps: 8 }); await page.mouse.up(); await cho(300);
  soat("kéo dọc không làm gì", !(await doc("魚")).del && (await log()).length === 1);
}
soat("không có lỗi JS trên trang", loi.length === 0, loi.join(" | "));
await ctx.close();
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
