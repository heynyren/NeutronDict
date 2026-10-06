/**
 * VUỐT THẺ KIỂU QUIZLET + HAI MŨI TÊN XEM LẠI / CHẤM LẠI (extension, chuột thật).
 *
 *   node kiem-tra/hoc-vuot-the.mjs /home/user/NeutronDict/extension
 *
 *   1. Chưa lật mà vuốt: thẻ nhích rồi trượt về, KHÔNG chấm, có lời nhắc
 *   2. Vuốt ngắn: không chấm
 *   3. Vuốt phải: bản sao thẻ bay đi mang dấu V, chấm Nhớ, thẻ kế hiện lên (không bị ẩn)
 *   4. Vuốt trái: dấu X, chấm Quên, thẻ xếp lại cuối hàng
 *   5. Cú nhả chuột sau vuốt không bấm trúng nút dưới tay
 *   6. ‹ › : xem lại thẻ đã chấm (giữ nguyên lượt), chấm lại = huỷ lượt cũ + chấm mới
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
const nb = {};
for (const w of ["猫", "犬", "鳥", "魚", "馬"])
  nb["javi:" + w] = { word: w, dict: "javi", means: [w + "-nghĩa"], ts: now, srs: { lv: 2, due: now - NGAY, ts: now },
    duong: { nhin: { lv: 3, ngay: 3, net: 2, sai: 0, due: now - NGAY, ts: now - 5 * NGAY } } };
await sw.evaluate(async (nb) => {
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, nb);
const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.setViewportSize({ width: 1000, height: 780 });
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 5, null, { timeout: 20000 });

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
const tu = () => page.evaluate(() => (theCardHienTai() || {}).word);
const trang = () => page.evaluate(() => ({ q: session.queue.length, done: session.done, again: session.again,
  ls: (session.lichSu || []).length, xem: !!session.xem }));
const doc = (w) => sw.evaluate(async (t) => {
  const n = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k in n) if (n[k] && n[k].word === t) return n[k];
  return null;
}, w);
const keo = async (dx, giua = true) => {
  const b = await page.locator("#stCard").boundingBox();
  const x = b.x + b.width / 2, y = b.y + 50;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + 6, { steps: 5 });
  await page.mouse.move(x + dx, y + 10, { steps: 5 });
  if (giua) return;
};
const nha = async () => { await page.mouse.up(); };

await page.click("#study");
await page.waitForFunction(() => document.getElementById("studyOverlay").classList.contains("show"));
await cho(200);

console.log("Chưa lật mà vuốt");
{
  const a = await tu(), t0 = await trang();
  await keo(220); await nha(); await cho(350);
  const t1 = await trang();
  soat("không chấm (hàng đợi và số đã xong y nguyên)", t1.q === t0.q && t1.done === t0.done && t1.ls === 0, JSON.stringify(t1));
  soat("vẫn là thẻ cũ, nằm đúng chỗ", (await tu()) === a && await page.evaluate(() => document.getElementById("stCard").style.transform === ""));
  soat("có lời nhắc hiện nghĩa trước", /hiện nghĩa/i.test(await page.evaluate(() => document.getElementById("toast").textContent)));
}

console.log("\nVuốt ngắn sau khi lật");
{
  await page.keyboard.press("Space"); await cho(150);
  const t0 = await trang();
  await keo(30); await nha(); await cho(350);
  const t1 = await trang();
  soat("kéo 30px: không chấm", t1.q === t0.q && t1.ls === 0);
}

console.log("\nVuốt phải = Nhớ");
let w1;
{
  w1 = await tu();
  await keo(90);
  const giua = await page.evaluate(() => ({ nho: document.getElementById("stCard").classList.contains("keo-nho"),
    dau: !!document.querySelector("#stCard > .the-dau.nho"), tf: document.getElementById("stCard").style.transform }));
  soat("đang kéo: thẻ đi theo chuột và có dấu V", giua.nho && giua.dau && /translate/.test(giua.tf), giua.tf);
  await keo(130, true); await nha();
  await cho(80);
  const bay = await page.evaluate(() => { const g = document.querySelector(".the-bay"); return g ? { dau: !!g.querySelector(".the-dau.nho"), id: !!g.querySelector("[id]") } : null; });
  soat("bản sao thẻ đang bay, mang dấu V, không nhân đôi id", bay && bay.dau && !bay.id, JSON.stringify(bay));
  await cho(600); await detMung(); await cho(300);
  const t = await trang();
  soat("đã chấm Nhớ: xong 1, lịch sử 1", t.done === 1 && t.ls === 1, JSON.stringify(t));
  const w2 = await tu();
  soat("thẻ kế hiện lên và KHÔNG bị ẩn", w2 !== w1 && await page.evaluate(() => document.getElementById("stCard").style.visibility === ""), w2);
  soat("bản sao đã dọn đi", (await page.locator(".the-bay").count()) === 0);
  const d = await doc(w1);
  soat("sổ ghi lượt nhớ (đường nhìn tiến lên)", d.duong.nhin.ts > now && d.duong.nhin.ngay > 3, JSON.stringify(d.duong.nhin));
}

console.log("\nVuốt trái = Quên");
let w2;
{
  w2 = await tu();
  await page.keyboard.press("Space"); await cho(150);
  await keo(-60);
  const g = await page.evaluate(() => ({ q: document.getElementById("stCard").classList.contains("keo-quen"), d: !!document.querySelector("#stCard > .the-dau.quen") }));
  soat("đang kéo trái: dấu X", g.q && g.d);
  await keo(-160); await nha(); await cho(700); await detMung(); await cho(300);
  const t = await trang();
  soat("đã chấm Quên: again 1, thẻ xếp lại cuối hàng", t.again === 1 && t.ls === 2 && t.q === 4, JSON.stringify(t));
  const d = await doc(w2);
  soat("sổ ghi lượt quên", d.duong.nhin.ts > now && d.duong.nhin.ngay <= 3, JSON.stringify(d.duong.nhin));
  soat("cú nhả chuột không kích hoạt nút nào (không có lượt chấm thừa)", t.done === 1);
}

console.log("\nHai mũi tên xem lại / chấm lại");
{
  const live = await tu();
  soat("nút ‹ bật (có thẻ đã chấm), nút › bật (có thể để dành)", await page.evaluate(() =>
    !document.getElementById("stTruoc").disabled && !document.getElementById("stSau").disabled));
  await page.click("#stTruoc"); await cho(250);
  const x1 = await page.evaluate(() => ({ w: theCardHienTai().word, tag: document.getElementById("stXemTag").textContent,
    hien: !document.getElementById("stXemTag").hidden, grade: document.getElementById("stGrade").style.display !== "none" }));
  soat("‹ lùi về thẻ vừa chấm (" + w2 + "), đã lật sẵn, có nhãn Quên", x1.w === w2 && x1.hien && /Quên/.test(x1.tag) && x1.grade, JSON.stringify(x1));
  const tTruoc = await trang();
  await page.click("#stTruoc"); await cho(250);
  const x2 = await page.evaluate(() => ({ w: theCardHienTai().word, tag: document.getElementById("stXemTag").textContent,
    truoc: document.getElementById("stTruoc").disabled }));
  soat("‹ lần nữa: thẻ trước đó (" + w1 + "), nhãn Nhớ; hết lịch sử thì ‹ tắt", x2.w === w1 && /Nhớ/.test(x2.tag) && x2.truoc, JSON.stringify(x2));
  const tXem = await trang();
  soat("chỉ xem: lượt chấm cũ giữ nguyên", tXem.ls === tTruoc.ls && tXem.done === tTruoc.done && tXem.again === tTruoc.again);
  await page.click("#stSau"); await cho(250);
  soat("› đi tới thẻ đã chấm kế", (await page.evaluate(() => theCardHienTai().word)) === w2);
  await page.click("#stSau"); await cho(250);
  const x3 = await page.evaluate(() => ({ w: theCardHienTai().word, tag: document.getElementById("stXemTag").hidden, xem: !!session.xem }));
  soat("› quá thẻ cuối: về thẻ đang học dở, nhãn tắt", x3.w === live && x3.tag && !x3.xem, JSON.stringify(x3));

  // Chấm lại: xem thẻ Nhớ đầu tiên rồi bấm Quên.
  await page.click("#stTruoc"); await page.click("#stTruoc"); await cho(300);
  const dTruoc = await doc(w1);
  const tA = await trang();
  await page.keyboard.press("f"); await cho(700); await detMung(); await cho(300);
  const tB = await trang(), dSau = await doc(w1);
  soat("chấm lại Nhớ→Quên: done giảm 1, again tăng 1, không có lượt chấm kép", tB.done === tA.done - 1 && tB.again === tA.again + 1, JSON.stringify(tA) + " → " + JSON.stringify(tB));
  soat("sổ của thẻ ấy ra như một lượt QUÊN duy nhất (không phải nhớ rồi quên)",
       dSau.duong.nhin.ngay <= 3 && dSau.duong.nhin.ngay < dTruoc.duong.nhin.ngay, dTruoc.duong.nhin.ngay + " → " + dSau.duong.nhin.ngay);
  soat("thoát chế độ xem, về thẻ đang học", !tB.xem);

  // Giữ nguyên: xem thẻ rồi bấm đúng kết quả cũ.
  await page.click("#stTruoc"); await cho(300);
  const lai = await page.evaluate(() => session.lichSu[session.xem.i].nho);
  const tC = await trang();
  await page.keyboard.press(lai ? "j" : "f"); await cho(400);
  const tD = await trang();
  soat("bấm đúng kết quả cũ: giữ nguyên, không chấm thêm", tD.ls === tC.ls && tD.done === tC.done && tD.again === tC.again, JSON.stringify(tD));
}

soat("không có lỗi JS trên trang", loi.length === 0, loi.join(" | "));
await ctx.close();
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
