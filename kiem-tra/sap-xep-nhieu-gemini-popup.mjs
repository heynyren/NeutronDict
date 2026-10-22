/**
 * SẮP XẾP CẢ NHÓM ĐÃ TÍCH + NÚT HỎI GEMINI CẠNH NGHĨA TRONG POPUP
 *
 *   node kiem-tra/sap-xep-nhieu-gemini-popup.mjs /home/user/NeutronDict/extension
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
const ket = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
}
const now = Date.now();
await sw.evaluate(async (now) => {
  const nb = {};
  for (let i = 0; i < 6; i++) nb["envi:w" + i] = { word: "w" + i, dict: "envi", means: ["n" + i], ts: now - i * 1000 };
  await chrome.storage.local.set({ settings: { ngu: "en" }, notebook: nb,
    decks: { d1: { id: "d1", name: "Sổ A", ts: now }, d2: { id: "d2", name: "Sổ B", ts: now + 1 } }, hoc: {} });
}, now);

const loi = [];
const pg = await ctx.newPage();
pg.on("pageerror", (e) => loi.push(e.message));
await pg.goto(`chrome-extension://${ID}/notebook.html`);
await pg.waitForSelector(".entry", { timeout: 20000 });
await pg.evaluate(() => document.querySelectorAll(".celebrate.show").forEach((e) => e.classList.remove("show")));

console.log("Sắp xếp cả nhóm đã tích");
await pg.evaluate(() => { for (const k of ["envi:w0", "envi:w1", "envi:w2"]) document.querySelector('#list .entry[data-key="' + k + '"] .chon-o input').click(); });
await pg.evaluate(() => {
  const s = document.querySelector('#list .entry[data-key="envi:w1"] .ctl select');
  s.value = "d1"; s.dispatchEvent(new Event("change", { bubbles: true }));
});
await pg.waitForTimeout(500);
const deck = async () => pg.evaluate(async () => {
  const nb = (await chrome.storage.local.get("notebook")).notebook; const o = {};
  for (const k in nb) o[k] = nb[k].deck || "";
  return o;
});
let d = await deck();
soat("cả 3 từ đã tích cùng vào sổ d1", d["envi:w0"] === "d1" && d["envi:w1"] === "d1" && d["envi:w2"] === "d1", JSON.stringify(d));
soat("từ không tích đứng yên", !d["envi:w3"] && !d["envi:w4"]);
// từ KHÔNG nằm trong nhóm tích: chỉ mình nó đi
await pg.evaluate(() => {
  const s = document.querySelector('#list .entry[data-key="envi:w4"] .ctl select');
  s.value = "d2"; s.dispatchEvent(new Event("change", { bubbles: true }));
});
await pg.waitForTimeout(400);
d = await deck();
soat("kéo từ ngoài nhóm: chỉ mình nó đổi", d["envi:w4"] === "d2" && d["envi:w0"] === "d1" && !d["envi:w3"]);

console.log("\nPopup: Hỏi Gemini cạnh nghĩa của từ");
const pop = await ctx.newPage();
pop.on("pageerror", (e) => loi.push(e.message));
await pop.goto(`chrome-extension://${ID}/popup.html`);
await pop.waitForTimeout(700);
const kq = await pop.evaluate(async () => {
  await renderWord({ dict: "envi", entries: [{ word: "apple", reading: "/ˈæp.əl/", means: ["quả táo"] }], saved: {} });
  const e = document.querySelector("#result .entry");
  const b = e && [...e.querySelectorAll(".lft .iconbtn")].find((x) => /Gemini/.test(x.title));
  return { co: !!b, tip: b ? b.title : "", nghia: !!(e && e.querySelector("ul.m li")) };
});
soat("kết quả tra từ có nút Hỏi Gemini cạnh từ/nghĩa", kq.co && kq.nghia, JSON.stringify(kq));
soat("nút nói rõ là hỏi về TỪ", /từ này/.test(kq.tip), kq.tip.slice(0, 60));
soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 160));
await ctx.close();
process.exit(ket.every(Boolean) ? 0 : 1);
