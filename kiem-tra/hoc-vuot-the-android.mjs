/**
 * VUỐT THẺ TRÊN ANDROID (WebView mô phỏng, cảm ứng thật qua CDP).
 *
 *   node kiem-tra/hoc-vuot-the-android.mjs [thư-mục-android/www]
 *
 *   - vuốt phải = Nhớ, trái = Quên, và KHÔNG bị cướp thành vuốt đổi tab
 *   - bắt đầu vuốt từ một nút/chip trên thẻ vẫn vuốt được, cú nhả không bấm trúng nút
 *   - chưa lật thì vuốt không chấm
 *   - nút ‹ xem lại; Quên→Nhớ trên thẻ xem lại là chấm lại (không tính kép)
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import path from "node:path";

const www = path.resolve(process.argv[2] || "android/www");
const srv = spawn("python3", ["-m", "http.server", "8769", "-d", www], { stdio: "ignore" });
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
  await p.goto("http://localhost:8769/index.html"); await cho(1000);
  await p.evaluate(async () => {
    const nb = {}, now = Date.now(), ng = 86400000;
    for (const w of ["alpha", "beta", "gamma", "delta"]) nb["envi:" + w] = { word: w, dict: "envi", means: ["nghĩa " + w], ts: now,
      srs: { lv: 2, due: now - ng, ts: now }, duong: { nhin: { lv: 3, ngay: 3, net: 2, sai: 0, due: now - ng, ts: now - 5 * ng } } };
    await Store.set("notebook", nb);
  });
  await p.reload(); await cho(1500);
  const cdp = await c.newCDPSession(p);
  const vuot = async (x0, y0, x1, y1, buoc = 8) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= buoc; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + (x1 - x0) * i / buoc, y: y0 + (y1 - y0) * i / buoc }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const detMung = async () => { for (let i = 0; i < 8; i++) { const c2 = await p.evaluate(() => { const x = document.querySelector(".celebrate.show button"); if (x) { x.click(); return true; } return false; }); if (!c2) return; await cho(250); } };
  const tt = () => p.evaluate(() => ({ q: session.queue.length, done: session.done, again: session.again, ls: (session.lichSu || []).length, man: manHienTai, xem: !!session.xem }));
  await p.evaluate(() => document.querySelector("#navStudy").click()); await cho(400);
  await p.evaluate(() => document.querySelector("#stStart").click()); await cho(400);

  const r0 = await p.locator("#stCard").boundingBox();
  await vuot(r0.x + r0.width / 2, r0.y + 80, r0.x + r0.width / 2 + 200, r0.y + 90); await cho(500);
  const a = await tt();
  soat("chưa lật mà vuốt: không chấm, không đổi tab", a.done === 0 && a.ls === 0 && a.man === "Study", JSON.stringify(a));

  await p.evaluate(() => document.querySelector("#stReveal").click()); await cho(300);
  const r1 = await p.locator("#stCard").boundingBox();
  await vuot(r1.x + r1.width / 2, r1.y + 80, r1.x + r1.width / 2 + 200, r1.y + 90); await cho(700); await detMung(); await cho(300);
  const n = await tt();
  soat("vuốt phải đã chấm Nhớ, vẫn ở màn Học (không bị cướp thành đổi tab)", n.done === 1 && n.ls === 1 && n.man === "Study", JSON.stringify(n));
  soat("thẻ kế hiện lên, không bị ẩn", await p.evaluate(() => document.getElementById("stCard").style.visibility === ""));

  await p.evaluate(() => document.querySelector("#stReveal").click()); await cho(300);
  const r2 = await p.locator("#stCard").boundingBox();
  // Bắt đầu vuốt ngay trên một nút (Sửa bản dịch) — vẫn phải vuốt được và không mở phiếu sửa.
  const nut = await p.locator("#stEdit").boundingBox();
  await vuot(nut.x + nut.width / 2, nut.y + nut.height / 2, nut.x + nut.width / 2 - 220, nut.y + 10); await cho(700); await detMung(); await cho(300);
  const m = await tt();
  soat("vuốt trái bắt đầu từ trên nút: chấm Quên", m.again === 1 && m.ls === 2, JSON.stringify(m));
  soat("cú nhả không bấm trúng nút (phiếu sửa không mở)", !(await p.evaluate(() => document.getElementById("editSheet") && document.getElementById("editSheet").classList.contains("show"))));

  await p.locator("#stTruoc").click(); await cho(400);
  const x = await p.evaluate(() => ({ tag: document.getElementById("stXemTag").textContent, w: theCardHienTai().word }));
  soat("‹ xem lại thẻ vừa Quên, có nhãn", /Quên/.test(x.tag), JSON.stringify(x));
  const tA = await tt();
  await p.evaluate(() => document.querySelector("#gKnow").click()); await cho(900); await detMung(); await cho(300);
  const tB = await tt();
  soat("Quên→Nhớ trên thẻ xem lại = chấm lại (again−1, done+1, thoát chế độ xem)", tB.again === tA.again - 1 && tB.done === tA.done + 1 && !tB.xem, JSON.stringify(tA) + " → " + JSON.stringify(tB));
  soat("không có lỗi JS", errs.length === 0, errs.join(" | "));
} finally { await b.close(); srv.kill(); }
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
