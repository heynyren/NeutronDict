/**
 * CHẾ ĐỘ ÔN THI JLPT TRÊN ANDROID (WebView mô phỏng, chạm thật).
 *
 *   node kiem-tra/jlpt-android.mjs [thư-mục-android/www]
 *
 * Tab JLPT chỉ có ở tiếng Nhật; vào màn N3; chơi một chặng bằng chạm; luật 60%; nút Quay lại của Android
 * đóng từng lớp (hỏi thoát khi đang chơi, về chọn màn khi đang ở bản đồ); không thanh tab nào chen vào lúc chơi.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import path from "node:path";

const www = path.resolve(/android/.test(process.argv[2] || "") ? process.argv[2] : "android/www");
const srv = spawn("python3", ["-m", "http.server", "8775", "-d", www], { stdio: "ignore" });
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
  await p.goto("http://localhost:8775/index.html"); await cho(1000);
  await p.evaluate(async () => { await Store.set("ngu", "en"); });
  await p.reload(); await cho(1200);
  soat("tiếng Anh: tab JLPT ẩn", await p.evaluate(() => getComputedStyle(document.getElementById("navJlpt")).display === "none"));
  await p.evaluate(async () => { await Store.set("ngu", "ja"); });
  await p.reload(); await cho(1500);
  soat("tiếng Nhật: tab JLPT hiện", await p.evaluate(() => getComputedStyle(document.getElementById("navJlpt")).display !== "none"));
  await p.evaluate(() => document.getElementById("navJlpt").click());
  await p.waitForSelector(".jl-the");
  soat("hiện 5 thẻ màn (N3 mở, N2 khoá)", await p.evaluate(() => { const t = [...document.querySelectorAll(".jl-the")]; return t.length === 5 && !t[0].classList.contains("khoa") && t[1].classList.contains("khoa"); }));
  await p.tap('.jl-the[data-mon="n3"]');
  await p.waitForSelector(".jl-thoai");
  await p.tap(".jl-thoai .jl-btn"); await p.tap(".jl-thoai .jl-btn");
  await p.waitForSelector(".jl-bd");
  soat("bản đồ N3: 227 chặng", await p.evaluate(() => document.querySelectorAll(".jl-nut").length === 227));
  soat("không bị thanh tab dưới che chặng đầu (nút bấm được)", await p.evaluate(() => { const n = document.querySelector(".jl-nut"); n.scrollIntoView({ block: "center" }); const r = n.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return n.contains(e) || e === n; }));
  await p.tap(".jl-nut.hien");
  await p.waitForSelector(".jl-to-hop");
  await p.tap(".jl-to-nut .jl-btn:not(.chinh)");     // làm bài ngay
  await p.waitForSelector(".jl-lua, .jl-thoai");
  if (await p.$(".jl-thoai")) { await p.tap(".jl-thoai .jl-btn"); await p.waitForSelector(".jl-lua"); }   // lời thoại đầu chương
  soat("đang chơi: màn chơi phủ kín, thanh tab dưới không đè lên", await p.evaluate(() => { const r = document.querySelector(".jl-chay").getBoundingClientRect(); const nav = getComputedStyle(document.querySelector(".jl-chay")).zIndex; return r.height >= innerHeight - 2 && Number(nav) > 60; }));
  const tong = await p.evaluate(() => Number(document.querySelector(".jl-chay-tieu").textContent.split("/")[1]));
  for (let i = 0; i < tong; i++) {
    await p.waitForSelector(".jl-lua:not(:disabled)");
    const k = await p.evaluate(() => window.JlptUI.dapAnDung());
    await p.tap(`.jl-lua[data-k="${k}"]`);
    await p.waitForSelector(".jl-fb.dung");
    await p.tap(".jl-fb .jl-btn.chinh");
  }
  await p.waitForSelector(".jl-kq");
  soat("làm đúng hết: 100%, vượt chặng", await p.evaluate(() => document.querySelector(".jl-vong b").textContent === "100%" && /Vượt/.test(document.querySelector(".jl-kq-tieu").textContent)));
  await p.tap(".jl-kq .jl-btn.chinh");
  await p.waitForSelector(".jl-bd");
  soat("chặng 2 đã mở", await p.evaluate(() => !document.querySelectorAll(".jl-nut")[1].classList.contains("khoa")));
  const td = await p.evaluate(async () => await Store.get("jlpt"));
  soat("tiến độ lưu vào kho của app", td && td.ngoc > 0 && Object.keys(td.mon.n3.chang).length === 1, td && td.ngoc);

  // nút Quay lại của Android
  await p.tap(".jl-nut.hien"); await p.waitForSelector(".jl-to-hop");
  await p.tap(".jl-to-nut .jl-btn:not(.chinh)"); await p.waitForSelector(".jl-lua");
  const quay = () => p.evaluate(() => window.JlptUI.quayLai());
  soat("Quay lại khi đang chơi: hỏi thoát", (await quay()) === true && !!(await p.$(".jl-hoi")));
  soat("Quay lại lần nữa: đóng hộp hỏi, vẫn ở trong lượt chơi", (await quay()) === true && !(await p.$(".jl-hoi")) && !!(await p.$(".jl-lua")));
  await quay(); await p.tap(".jl-hoi .jl-btn.chinh"); await p.waitForSelector(".jl-bd");
  soat("thoát lượt chơi về bản đồ", true);
  soat("Quay lại ở bản đồ: về chọn màn", (await quay()) === true && !!(await p.$(".jl-the")));
  soat("Quay lại ở chọn màn: nhường cho app", (await quay()) === false);
  soat("không có lỗi trang", errs.length === 0, errs.join(" | ").slice(0, 200));
} finally { await b.close(); srv.kill(); }
process.exit(ket.every(Boolean) ? 0 : 1);
