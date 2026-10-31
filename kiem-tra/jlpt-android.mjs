/**
 * CHẾ ĐỘ ÔN THI JLPT TRÊN ANDROID (WebView mô phỏng, chạm thật).
 *
 *   node kiem-tra/jlpt-android.mjs [thư-mục-android/www]
 *
 * Tab JLPT chỉ có ở tiếng Nhật; vào màn N3; chơi một chặng bằng chạm; hoàn thành chặng; nút Quay lại của Android
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
const bamChang = async (p, sel) => {
    await p.tap(sel);
    for (let i = 0; i < 12; i++) {
      if (await p.$(".jl-to-hop")) return;
      const t = await p.$(".jl-thoai .jl-btn");
      if (t) await t.tap().catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
    }
    await p.waitForSelector(".jl-to-hop", { timeout: 5000 });
  };
  const xongThoai = async (p) => { for (let i = 0; i < 12; i++) { const t = await p.$(".jl-thoai:not(.di) .jl-btn"); if (!t) return; await t.tap().catch(() => {}); await new Promise((r) => setTimeout(r, 150)); } };
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
  soat("hiện 5 màn mở và N1 sắp có", await p.evaluate(() => { const t = [...document.querySelectorAll(".jl-the")]; return t.length === 6 && t[4].dataset.mon === "kaiwa" && t.slice(0,5).every(x=>!x.classList.contains("sap")) && t[5].classList.contains("sap") && !t[0].classList.contains("khoa") && !t[1].classList.contains("khoa") && !t[1].classList.contains("sap"); }));
  await cho(600);                                   // chờ hết hoạt ảnh trượt của tab (lúc đang trượt, fixed tính theo khung đang dịch)
  soat("màn chọn cấp không có nhạc nền của một khóa cụ thể", await p.evaluate(() => document.querySelector(".jl-nhac")?.hidden === true));
  await p.tap('.jl-the[data-mon="n3"]');
  await p.waitForSelector(".jl-thoai");
  await xongThoai(p);
  await p.waitForSelector(".jl-bd");
  const nhac = await p.evaluate(() => {
    const b = document.querySelector(".jl-nhac");
    if (!b || b.hidden) return { ok: false, reason: "music control hidden in N3" };
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const nav = document.getElementById("navJlpt").getBoundingClientRect();
    return { ok: b.contains(hit) && r.top >= 0 && r.bottom <= innerHeight && (!nav.height || r.bottom <= nav.top + 2),
      button: r.toJSON(), nav: nav.toJSON(), hit: hit?.className };
  });
  soat("N3: nút nhạc nền nằm trong màn hình, trên thanh tab nếu hiện, bấm được", nhac.ok, JSON.stringify(nhac));
  const nhacTruoc = await p.getAttribute(".jl-nhac", "aria-pressed");
  await p.tap(".jl-nhac");
  soat("chạm nút nhạc N3 thay đổi trạng thái bật/tắt", (await p.getAttribute(".jl-nhac", "aria-pressed")) !== nhacTruoc);
  await p.tap(".jl-nhac");
  soat("cảnh nền liền mạch: 10 khung chồng, sân khấu dính đầu vùng cuộn, tràn sát hai mép", await p.evaluate(() => { const k = document.querySelector(".jl-gioi-khung").getBoundingClientRect(); return document.querySelectorAll(".jl-gioi-lop").length === 10 && Math.abs(k.left) < 1 && Math.abs(k.right - innerWidth) < 1 && !document.querySelector(".jl-banner"); }));
  soat("N3 leo núi LÊN: lúc vào là chân núi (khung 1 hiện), nút chặng 1 ở dưới cùng", await p.evaluate(() => { const l = [...document.querySelectorAll(".jl-gioi-lop")]; const n = [...document.querySelectorAll(".jl-nut")]; return !l[0].classList.contains("an") && l.slice(1).every((x) => x.classList.contains("an") || +x.style.opacity === 0) && n[0].getBoundingClientRect().top > n[n.length - 1].getBoundingClientRect().top; }));
  soat("bản đồ N3: 227 chặng", await p.evaluate(() => document.querySelectorAll(".jl-nut").length === 227));
  soat("Android: SVG nền và đường bản đồ không chạy hoạt ảnh liên tục", await p.evaluate(() => {
    const scene = document.querySelector(".jl-gioi-lop:not(.an) svg .jl-tw, .jl-gioi-lop:not(.an) svg .jl-boi2");
    const path = document.querySelector(".jl-bd .jl-duong path");
    return getComputedStyle(path).animationName === "none" && (!scene || getComputedStyle(scene).animationName === "none");
  }));
  soat("Android: tối đa hai lớp cảnh được giữ để tăng tốc cuộn", await p.evaluate(() => [...document.querySelectorAll(".jl-gioi-lop")].filter((x) => getComputedStyle(x).willChange !== "auto").length <= 2));
  soat("không bị thanh tab dưới che chặng đầu (nút bấm được)", await p.evaluate(() => { const n = document.querySelector(".jl-nut"); n.scrollIntoView({ block: "center" }); const r = n.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return n.contains(e) || e === n; }));
  await bamChang(p, ".jl-nut.hien");
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
  await p.waitForFunction(() => document.querySelector(".jl-vong b").textContent === "100%", null, { timeout: 5000 });
  soat("làm đúng hết: 100%, vượt chặng", await p.evaluate(() => document.querySelector(".jl-vong b").textContent === "100%" && /Vượt/.test(document.querySelector(".jl-kq-tieu").textContent)));
  await p.tap(".jl-kq .jl-btn.chinh");
  await p.waitForSelector(".jl-bd");
  soat("chặng 2 đã mở", await p.evaluate(() => !document.querySelectorAll(".jl-nut")[1].classList.contains("khoa")));
  const td = await p.evaluate(async () => await Store.get("jlpt"));
  soat("tiến độ lưu vào kho của app", td && td.ngoc > 0 && Object.keys(td.mon.n3.chang).length === 1, td && td.ngoc);

  // vuốt thẻ bằng cảm ứng (sự kiện pointer kiểu touch, như Android thật)
  await bamChang(p, ".jl-nut.hien");
  await p.tap(".jl-to-nut .jl-btn.chinh");
  await p.waitForSelector(".jl-the-hoc, .jl-thoai");
  if (await p.$(".jl-thoai")) { await p.tap(".jl-thoai .jl-btn"); await p.waitForSelector(".jl-the-hoc"); }
  const vuot = (dx) => p.evaluate(async (dx) => {
    const c = document.querySelector(".jl-the-hoc"), r = c.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (t, px) => c.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: px, clientY: y, bubbles: true, cancelable: true, button: 0 }));
    ev("pointerdown", x);
    for (let i = 1; i <= 8; i++) { ev("pointermove", x + dx * i / 8); await new Promise((r) => setTimeout(r, 12)); }
    ev("pointerup", x + dx);
  }, dx);
  const dd = () => p.evaluate(() => document.querySelector(".jl-diem").textContent);
  const d0 = await dd();
  await vuot(-180); await cho(500);
  soat("cảm ứng: vuốt trái = học lại (vẫn thẻ 1)", /^1 \//.test(await dd()) && !(await p.$(".the-bay")));
  await vuot(200); await cho(500);
  soat("cảm ứng: vuốt phải = nhớ, sang thẻ 2", /^2 \//.test(await dd()), d0 + " → " + (await dd()));
  await p.tap(".jl-x"); await p.waitForSelector(".jl-hoi"); await p.tap(".jl-hoi .jl-btn.chinh"); await p.waitForSelector(".jl-bd");

  // nút Quay lại của Android
  await bamChang(p, ".jl-nut.hien");
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
