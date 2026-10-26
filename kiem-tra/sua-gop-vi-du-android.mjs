/**
 * MỘT NÚT SỬA + SỬA CÂU VÍ DỤ + LỌC TIẾNG VIỆT — trên Android (WebView mô phỏng).
 *
 *   node kiem-tra/sua-gop-vi-du-android.mjs [thư-mục-android/www]
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import path from "node:path";

const www = path.resolve(/android/.test(process.argv[2] || "") ? process.argv[2] : "android/www");
const srv = spawn("python3", ["-m", "http.server", "8774", "-d", www], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const ket = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: "chromium" });
try {
  const c = await b.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await c.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.route(/translate|dictionaryapi|script\.google/, (r) => r.abort());
  await p.goto("http://localhost:8774/index.html"); await cho(1000);
  await p.evaluate(async () => {
    const now = Date.now();
    const src = (w) => ({ url: "https://x.test/" + w, title: "t", sel: w });
    await Store.set("notebook", {
      "envi:breaker": { word: "breaker", dict: "envi", means: ["máy cắt"], ts: now, src: src("breaker"),
        cauNghe: { cau: "The breaker trips when current exceeds the limit. Máy cắt nhảy khi dòng điện vượt quá giới hạn.", dich: "Máy cắt nhảy.", ts: now } },
      "envi:relay": { word: "relay", dict: "envi", means: ["rơle"], ts: now - 1, src: src("relay"),
        cauNghe: { cau: "Rơle(relay) bảo vệ", dich: "", ts: now } }
    });
  });
  await p.reload(); await cho(1500);
  await p.evaluate(() => document.querySelector("#navNotebook").click());
  await p.waitForSelector("#nbList .entry"); await cho(900);
  await p.evaluate(() => document.querySelectorAll(".celebrate.show button").forEach((x) => x.click()));
  const hang = (k) => '#nbList .entry[data-key="envi:' + k + '"]';
  const doc = (k) => p.evaluate(async (k) => (await Store.get("notebook"))["envi:" + k], k);

  const nut = await p.evaluate((s) => [...document.querySelectorAll(s + " .ctl .iconbtn")].map((x) => x.title), hang("breaker"));
  soat("hàng chỉ còn một nút sửa chung", nut.filter((t) => /^Sửa nghĩa, câu ví dụ, ghi chú/.test(t)).length === 1
    && !nut.some((t) => /Sửa bản dịch cho đúng|Thêm ghi chú|Sửa ghi chú/.test(t)), JSON.stringify(nut));
  soat("thẻ học không còn nút Ghi chú riêng", await p.evaluate(() => !document.getElementById("stNote")));
  const vd = await p.evaluate((k) => { const e = document.querySelector(k + " .nguc-cau"); return e ? e.textContent : null; }, hang("breaker"));
  soat("lọc được: chỉ còn câu tiếng Anh", vd === "The breaker trips when current exceeds the limit.", vd);
  const lan = await p.evaluate((k) => { const e = document.querySelector(k + " .nguc"); return e ? e.className + "|" + ((e.querySelector(".nguc-lan") || {}).textContent || "") : null; }, hang("relay"));
  soat("không lọc được: báo để sửa tay", /lan/.test(lan || "") && /tiếng Việt/.test(lan || ""), lan);

  await p.evaluate((k) => document.querySelector(k + " .ctl .iconbtn[title^='Sửa nghĩa']").click(), hang("relay"));
  await p.waitForSelector("#editSheet.show"); await cho(200);
  await p.fill("#edViDu", "Check the relay setting.");
  await p.fill("#edViDuDich", "Kiểm tra cài đặt rơle.");
  await p.fill("#edNote", "ghi chú mới");
  await p.evaluate(() => document.getElementById("edSave").click()); await cho(800);
  const r = await doc("relay");
  soat("một lần lưu: ví dụ + bản dịch ví dụ + ghi chú", r.cauNghe.cau === "Check the relay setting." && r.cauNghe.dich === "Kiểm tra cài đặt rơle." && r.cauNghe.sua === 1 && r.note === "ghi chú mới", JSON.stringify(r.cauNghe));
  soat("không có lỗi trang", errs.length === 0, errs.join(" | ").slice(0, 200));
} finally { await b.close(); srv.kill(); }
process.exit(ket.every(Boolean) ? 0 : 1);
