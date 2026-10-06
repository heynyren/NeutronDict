/**
 * BÀI ĐIỀN KHUYẾT TRÊN ANDROID (WebView mô phỏng, chạm thật).
 *
 *   node kiem-tra/bai-dien-khuyet-android.mjs [thư-mục-android/www]
 *
 * Lời hỏi là bản dịch, câu có chỗ trống, bốn ô; chạm một ô là chấm ngay (đúng = Nhớ, sai =
 * Quên); nút Tiếp; "Ôn từng đường" có loại điền khuyết; chốt chặn cú chạm rơi ngay lúc đề hiện.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import path from "node:path";

const www = path.resolve(process.argv[2] || "android/www");
const srv = spawn("python3", ["-m", "http.server", "8770", "-d", www], { stdio: "ignore" });
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
  await p.goto("http://localhost:8770/index.html"); await cho(1000);
  await p.evaluate(async () => {
    const nb = {}, now = Date.now(), ng = 86400000;
    const ws = [["garden", "The garden is full of flowers.", "Khu vườn đầy hoa."], ["bridge", "We crossed the old bridge.", "Chúng tôi băng qua cây cầu cũ."],
                ["market", "She went to the market early.", "Cô ấy ra chợ từ sớm."], ["window", "Please open the window.", "Làm ơn mở cửa sổ."], ["season", "Summer is my favourite season.", "Mùa hè là mùa tôi thích nhất."]];
    for (const [w, cau, dich] of ws) nb["envi:" + w] = { word: w, dict: "envi", means: ["nghĩa " + w], ts: now, srs: { lv: 2, due: now - ng, ts: now },
      cauNghe: { cau: cau, dich: dich, ts: now },
      duong: { nhin: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * ng, ts: now - 20 * ng },
               nghe: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * ng, ts: now - 20 * ng },
               dien: { lv: 2, ngay: 7, net: 2, sai: 0, due: now - ng, ts: now - 8 * ng } } };
    await Store.set("notebook", nb);
  });
  await p.reload(); await cho(1500);
  const detMung = async () => { for (let i = 0; i < 8; i++) { const c2 = await p.evaluate(() => { const x = document.querySelector(".celebrate.show button"); if (x) { x.click(); return true; } return false; }); if (!c2) return; await cho(250); } };
  await p.evaluate(() => document.querySelector("#navStudy").click()); await cho(400);
  soat("nút Ôn từng đường có mặt", await p.evaluate(() => !!document.getElementById("stStartDuong")));
  await p.evaluate(() => document.querySelector("#stStartDuong").click()); await p.waitForSelector("#duongRiengDialog[open]");
  const lua = await p.evaluate(() => [...document.querySelectorAll("#duongRiengDialog .duong-rieng-lua")].map((x) => x.dataset.ma + ":" + (x.disabled ? "off" : "on")));
  soat("hộp có nghe/nhìn/điền khuyết và điền khuyết bật", lua.join(",") === "nghe:off,nhin:off,dien:on", lua.join(","));
  await p.evaluate(() => document.querySelector('#duongRiengDialog [data-ma="dien"]').click()); await cho(600);
  const m = await p.evaluate(() => ({
    mat: document.getElementById("stDienMat").style.display !== "none",
    dich: document.getElementById("stDienDich").textContent, cau: document.getElementById("stDienCau").textContent,
    o: [...document.querySelectorAll("#stDienO .dien-omot-tu")].map((x) => x.textContent), w: (theCardHienTai() || {}).word }));
  soat("mặt trước điền khuyết hiện, có bản dịch và chỗ trống, không lộ từ", m.mat && m.dich.length > 5 && m.cau.includes("＿＿＿") && !m.cau.toLowerCase().includes(m.w), m.dich + " | " + m.cau);
  soat("bốn ô và có đáp án", m.o.length === 4 && m.o.includes(m.w), m.o.join(","));
  // Chốt chặn: chạm ngay lúc đề vừa hiện không thành câu trả lời.
  await p.evaluate(() => { baiDien.moc = performance.now(); document.querySelector("#stDienO .dien-omot").click(); });
  soat("cú chạm ngay lúc đề hiện bị bỏ qua", await p.evaluate(() => !!baiDien));
  await cho(450);
  const sai = m.o.findIndex((x) => x !== m.w);
  const nut = await p.locator("#stDienO .dien-omot").nth(sai).boundingBox();
  await p.touchscreen.tap(nut.x + nut.width / 2, nut.y + nut.height / 2); await cho(500);
  const k = await p.evaluate(() => ({ tiep: document.getElementById("stDienTiep").style.display !== "none",
    dung: document.querySelectorAll("#stDienO .dien-omot.dung").length, sai: document.querySelectorAll("#stDienO .dien-omot.sai").length,
    again: session.again, text: document.getElementById("stDienKq").textContent }));
  soat("chạm ô sai: chấm Quên, ô đúng xanh + ô nhầm đỏ, hiện Tiếp", k.tiep && k.dung === 1 && k.sai === 1 && k.again === 1, JSON.stringify(k));
  await detMung(); await cho(200);
  await p.evaluate(() => document.querySelector("#stDienTiep").click()); await cho(600); await detMung(); await cho(500);
  const w2 = await p.evaluate(() => (theCardHienTai() || {}).word);
  const o2 = await p.evaluate(() => [...document.querySelectorAll("#stDienO .dien-omot-tu")].map((x) => x.textContent));
  const dung = o2.indexOf(w2);
  const nut2 = await p.locator("#stDienO .dien-omot").nth(dung).boundingBox();
  await p.touchscreen.tap(nut2.x + nut2.width / 2, nut2.y + nut2.height / 2); await cho(500);
  const k2 = await p.evaluate(() => ({ done: session.done, tiep: document.getElementById("stDienTiep").style.display !== "none" }));
  soat("chạm ô đúng: chấm Nhớ", k2.done === 1 && k2.tiep, JSON.stringify(k2));
  const d = await p.evaluate(async () => { const nb = await Store.get("notebook"); return nb["envi:" + (theCardHienTai() || {}).word]; });
  soat("sổ ghi lượt nhớ cho đường dien", d && d.duong.dien.ngay > 7, d && String(d.duong.dien.ngay));
  soat("không có lỗi JS", errs.length === 0, errs.join(" | "));
} finally { await b.close(); srv.kill(); }
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
