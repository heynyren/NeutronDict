/**
 * CỬ CHỈ ĐỢT HAI TRÊN ANDROID (WebView mô phỏng, chạm thật qua CDP).
 *
 *   node kiem-tra/cu-chi-hai-android.mjs [thư-mục-android/www]
 *
 *   Thẻ học: vuốt ngang chấm NGAY (chưa lật) · chạm đúp chỗ trống = sửa nghĩa
 *   Sổ tay:  chạm đúp hàng = sửa nghĩa · vuốt phải = xoá nhanh (+Hoàn tác) · vuốt trái = mở link
 *            và vuốt ngang trên hàng KHÔNG bị cướp thành đổi tab
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import path from "node:path";

const www = path.resolve(/android/.test(process.argv[2] || "") ? process.argv[2] : "android/www");
const srv = spawn("python3", ["-m", "http.server", "8772", "-d", www], { stdio: "ignore" });
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
  await p.goto("http://localhost:8772/index.html"); await cho(1000);
  await p.evaluate(async () => {
    const nb = {}, now = Date.now(), ng = 86400000;
    for (const w of ["alpha", "beta", "gamma", "delta", "omega"]) nb["envi:" + w] = { word: w, dict: "envi", means: ["nghĩa " + w], ts: now,
      srs: { lv: 2, due: now - ng, ts: now }, src: w === "omega" ? undefined : { url: "https://x.test/" + w, title: "t", sel: w },
      duong: { nhin: { lv: 3, ngay: 3, net: 2, sai: 0, due: now - ng, ts: now - 5 * ng } } };
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
  const sheet = () => p.evaluate(() => document.getElementById("editSheet").classList.contains("show"));
  const dongSheet = async () => { await p.evaluate(() => { dongSua(); }); await cho(300); };

  /* --- sổ tay --- */
  await p.evaluate(() => document.querySelector("#navNotebook").click());
  await p.waitForSelector("#nbList .entry"); await cho(1000); await detMung();
  await p.evaluate(() => { window.__log = []; openSourceExt = (it) => window.__log.push("nguon:" + it.word); });
  const hang = (w) => p.evaluate((w) => {
    const e = [...document.querySelectorAll("#nbList .entry")].find((x) => (x.querySelector(".w") || {}).textContent.includes(w));
    if (!e) return null; e.scrollIntoView({ block: "center" });
    const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, w);
  const doc = (w) => p.evaluate(async (w) => { const nb = await Store.get("notebook"); return nb["envi:" + w]; }, w);
  {
    const h = await hang("alpha"); await cho(200);
    const h1 = await hang("alpha");
    // vuốt phải xa: xoá
    await vuot(h1.x + 90, h1.y + 30, h1.x + h1.w - 20, h1.y + 30); await cho(900);
    const d = await doc("alpha");
    soat("vuốt PHẢI đủ xa trên hàng: xoá nhanh", d && d.del === true);
    const t = await p.evaluate(() => ({ chu: document.getElementById("toast").textContent, nut: !!document.querySelector("#toast .toast-nut") }));
    soat("có lời nhắc kèm nút Hoàn tác", /Đã xoá/.test(t.chu) && t.nut, t.chu);
    soat("vẫn ở màn Sổ tay (không bị cướp thành đổi tab)", await p.evaluate(() => manHienTai === "Notebook"));
    await p.evaluate(() => document.querySelector("#toast .toast-nut").click()); await cho(900);
    soat("Hoàn tác trả lại từ", !(await doc("alpha")).del);
  }
  {
    await p.evaluate(() => { window.__log.length = 0; });
    const h = await hang("beta"); await cho(200); const h1 = await hang("beta");
    await vuot(h1.x + h1.w - 20, h1.y + 30, h1.x + 90, h1.y + 30); await cho(600);
    const l = await p.evaluate(() => window.__log.slice());
    soat("vuốt TRÁI đủ xa: mở link nguồn", l.length === 1 && l[0] === "nguon:beta", l.join(","));
    soat("từ vẫn còn, màn vẫn là Sổ tay", !(await doc("beta")).del && await p.evaluate(() => manHienTai === "Notebook"));
    const h2 = await hang("omega"); await cho(200); const h3 = await hang("omega");
    await vuot(h3.x + h3.w - 20, h3.y + 30, h3.x + 90, h3.y + 30); await cho(600);
    const t = await p.evaluate(() => document.getElementById("toast").textContent);
    soat("từ không có link: không mở gì và báo rõ", (await p.evaluate(() => window.__log.length)) === 1 && /chưa có link/.test(t), t);
    // vuốt ngắn
    const h4 = await hang("gamma"); await cho(200); const h5 = await hang("gamma");
    await vuot(h5.x + 90, h5.y + 30, h5.x + 170, h5.y + 30); await cho(500);
    soat("vuốt phải ngắn không làm gì", !(await doc("gamma")).del);
  }
  {
    const h = await hang("delta"); await cho(200); const h1 = await hang("delta");
    const x = h1.x + 90, y = h1.y + 8;
    await p.touchscreen.tap(x, y); await cho(120); await p.touchscreen.tap(x, y); await cho(500);
    soat("chạm đúp vào hàng: mở phiếu sửa nghĩa", await sheet());
    await dongSheet();
  }

  /* --- thẻ học --- */
  await p.evaluate(() => document.querySelector("#navStudy").click()); await cho(400);
  await p.evaluate(() => document.querySelector("#stStart").click()); await cho(500);
  const tt = () => p.evaluate(() => ({ d: session.done, a: session.again, ls: (session.lichSu || []).length, grade: document.getElementById("stGrade").style.display }));
  {
    const t0 = await tt();
    soat("thẻ đang ÚP", t0.grade === "none");
    const r = await p.locator("#stCard").boundingBox();
    await vuot(r.x + r.width / 2, r.y + 90, r.x + r.width / 2 + 210, r.y + 96); await cho(700); await detMung(); await cho(300);
    const t1 = await tt();
    soat("vuốt phải khi CHƯA lật: chấm Nhớ ngay", t1.d === t0.d + 1 && t1.ls === 1, JSON.stringify(t1));
    const r2 = await p.locator("#stCard").boundingBox();
    await vuot(r2.x + r2.width / 2, r2.y + 90, r2.x + r2.width / 2 - 210, r2.y + 96); await cho(700); await detMung(); await cho(300);
    const t2 = await tt();
    soat("vuốt trái khi CHƯA lật: chấm Quên ngay", t2.a === t1.a + 1 && t2.ls === 2, JSON.stringify(t2));
  }
  {
    const r = await p.locator("#stCard").boundingBox();
    // chỗ trống: mép trên thẻ (phần đệm), tránh các nút
    const x = r.x + r.width / 2, y = r.y + 8;
    await p.touchscreen.tap(x, y); await cho(120); await p.touchscreen.tap(x, y); await cho(500);
    soat("chạm đúp chỗ trống của thẻ học: mở phiếu sửa nghĩa", await sheet());
    await dongSheet();
  }
  soat("không có lỗi JS", errs.length === 0, errs.join(" | "));
} finally { await b.close(); srv.kill(); }
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
