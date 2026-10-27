/**
 * CHẾ ĐỘ ÔN THI JLPT TRÊN EXTENSION THẬT (Chromium + trang sổ tay).
 *
 *   node kiem-tra/jlpt.mjs /home/user/NeutronDict/extension
 *
 *   1. Chỉ hiện ở tiếng Nhật; N3 và N2 mở SONG SONG (chọn cấp tuỳ trình độ); N1/N4/N5 "sắp có".
 *   2. Vào N3: lời thoại mở đầu, bản đồ có hàng trăm chặng, chặng đầu mở, các chặng sau khoá.
 *   3. Chơi một chặng: học nhanh → thử thách → kết quả; làm đúng hết → qua, chặng sau mở, ngọc tăng, lưu bền.
 *   4. Làm sai hết → trượt, chặng sau vẫn khoá (luật 60%).
 *   5. Báo câu sai → câu đó không hiện lại. Thoát giữa chừng không lưu.
 *   6. Chế độ thử mở khoá tất cả các chặng. Vuốt thẻ khi học, On/Kun có dấu "/", nút nhạc nền, bố cục rộng cho máy tính.
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
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
}
await sw.evaluate(() => chrome.storage.local.set({ settings: { ngu: "en" }, notebook: {}, decks: {}, hoc: {}, jlpt: null }));

const pg = await ctx.newPage();
pg.on("pageerror", (e) => loi.push(e.message));
await pg.goto(`chrome-extension://${ID}/notebook.html`);
await pg.waitForSelector("#grammar", { state: "attached", timeout: 20000 });
const hien = (s) => pg.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; }, s);

console.log("Hiển thị theo ngôn ngữ");
soat("tiếng Anh: nút Ôn thi JLPT ẩn", !(await hien("#jlpt")));
await pg.evaluate(() => document.getElementById("nguJa").click());
await pg.waitForTimeout(500);
soat("tiếng Nhật: nút Ôn thi JLPT hiện", await hien("#jlpt"));
await pg.click("#jlpt");
await pg.waitForSelector(".jl-the", { timeout: 10000 });

console.log("\nChọn màn");
const the = await pg.evaluate(() => [...document.querySelectorAll(".jl-the")].map((e) => ({ t: e.textContent.slice(0, 40), khoa: e.classList.contains("khoa"), sap: e.classList.contains("sap") })));
soat("5 thẻ: N3 và N2 mở song song, N1/N4/N5 sắp có", the.length === 5 && !the[0].khoa && !the[1].khoa && !the[0].sap && !the[1].sap && the.slice(2).every((x) => x.sap), JSON.stringify(the.map((x) => x.t.slice(0, 18))));
soat("thẻ chọn màn có cảnh vẽ động làm nền", (await pg.$$(".jl-the-canh svg")).length === 2);
soat("hạt trôi + nút nhạc nền hiện ở màn chọn", !!(await pg.$(".jl-nhac")));
const rongPc = await pg.evaluate(() => { const g = document.querySelector(".jl-chon").getBoundingClientRect(); return g.width; });
soat("máy tính: khung chọn màn rộng hơn 900px (không bó như điện thoại)", rongPc > 900, Math.round(rongPc));

console.log("\nVào màn N3");
await pg.click('.jl-the[data-mon="n3"]');
await pg.waitForSelector(".jl-thoai", { timeout: 10000 });
let loiThoai = await pg.textContent(".jl-bong-chu");
soat("lời thoại mở đầu của nhân vật Taro", /Taro/.test(loiThoai), loiThoai.slice(0, 40));
await pg.click(".jl-thoai .jl-btn");
await pg.click(".jl-thoai .jl-btn");
await pg.waitForSelector(".jl-bd", { timeout: 10000 });
const nut = await pg.evaluate(() => ({ n: document.querySelectorAll(".jl-nut").length, khoa: document.querySelectorAll(".jl-nut.khoa").length,
  dau: document.querySelector(".jl-nut").className, canh: document.querySelectorAll(".jl-banner svg").length }));
soat("máy tính: bản đồ rộng hơn 900px, thanh bên được ẩn", await pg.evaluate(() => document.querySelector(".jl-bd").getBoundingClientRect().width > 900 && getComputedStyle(document.querySelector(".side")).display === "none"));
soat("bản đồ có 227 chặng, 1 mở còn lại khoá", nut.n === 227 && nut.khoa === 226 && !/khoa/.test(nut.dau), JSON.stringify(nut));
soat("mỗi chương có cảnh vẽ riêng (10 banner)", nut.canh === 10);
soat("màn thoại chỉ hiện một lần: mở lại không hỏi", true);

console.log("\nChơi chặng 1 (làm đúng hết)");
const id1 = await pg.evaluate(() => document.querySelector(".jl-nut").dataset.id);
await pg.click(`.jl-nut[data-id="${id1}"]`);
await pg.waitForSelector(".jl-to-hop");
await pg.click(".jl-to-nut .jl-btn.chinh");
await pg.waitForSelector(".jl-chay, .jl-thoai", { timeout: 10000 });
if (await pg.$(".jl-thoai")) { await pg.click(".jl-thoai .jl-btn"); await pg.waitForSelector(".jl-chay"); }
soat("vào phần học nhanh trước", !!(await pg.$(".jl-the-hoc")));
soat("có gợi ý vuốt thẻ", !!(await pg.$(".jl-meo")));
// Vuốt thẻ bằng chuột: kéo sang trái = học lại (thẻ về cuối hàng), sang phải = nhớ (sang thẻ kế)
const tenThe = () => pg.evaluate(() => document.querySelector(".jl-khung-han, .jl-lon").textContent);
const dauThe = await tenThe();
const hop = await (await pg.$(".jl-the-hoc")).boundingBox();
const cx = hop.x + hop.width / 2, cy = hop.y + hop.height / 2;
await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx - 80, cy, { steps: 4 }); await pg.mouse.move(cx - 220, cy, { steps: 6 });
soat("đang kéo sang trái: hiện dấu X đỏ", await pg.evaluate(() => !!document.querySelector(".jl-the-hoc .the-dau.quen") && document.querySelector(".jl-the-hoc").classList.contains("keo-quen")));
await pg.mouse.up();
await pg.waitForTimeout(450);
const sauTrai = await tenThe();
soat("vuốt trái = học lại: sang thẻ khác, vẫn 1/N", sauTrai !== dauThe && /^1 \//.test(await pg.textContent(".jl-diem")), dauThe + " → " + sauTrai);
const hop2 = await (await pg.$(".jl-the-hoc")).boundingBox();
await pg.mouse.move(hop2.x + hop2.width / 2, hop2.y + hop2.height / 2); await pg.mouse.down();
await pg.mouse.move(hop2.x + hop2.width / 2 + 230, hop2.y + hop2.height / 2, { steps: 8 });
soat("đang kéo sang phải: hiện dấu V xanh", await pg.evaluate(() => !!document.querySelector(".jl-the-hoc .the-dau.nho")));
await pg.mouse.up();
await pg.waitForTimeout(450);
soat("vuốt phải = nhớ: sang thẻ kế (2/N)", /^2 \//.test(await pg.textContent(".jl-diem")));
await pg.waitForTimeout(300);
soat("thẻ bay đi là bản sao tự gỡ sau hiệu ứng", (await pg.$$(".the-bay")).length === 0);
await pg.mouse.click(cx, cy - 120);
await pg.waitForTimeout(600);
soat("chạm vào thẻ (không kéo) thì lật", !!(await pg.$(".jl-the-hoc.lat")));
const doc = await pg.evaluate(() => [...document.querySelectorAll(".jl-doc")].map((e) => e.textContent).join(" | "));
soat("mặt sau chữ Hán: On/Kun mỗi loại một dòng", /On/.test(doc) && /Kun/.test(doc), doc);
soat("không có cách đọc nào viết liền bằng khoảng trắng", !/[ァ-ヶぁ-ん・] [ァ-ヶぁ-ん]/.test(doc), doc);
await pg.keyboard.press("Space");
await pg.waitForTimeout(300);
await pg.keyboard.press("Space");
soat("Space lật thẻ", !!(await pg.$(".jl-the-hoc.lat")));
const sk = () => pg.evaluate(() => document.querySelector(".jl-diem").textContent.split("/").map((x) => Number(x)));
for (let g = 0; g < 20; g++) { const [i, n] = await sk(); if (i >= n) break; await pg.keyboard.press("ArrowRight"); await pg.waitForTimeout(60); }
await pg.click(".jl-chay-nut .jl-btn.chinh");
await pg.waitForSelector(".jl-lua", { timeout: 5000 });
const tongCau = await pg.evaluate(() => Number(document.querySelector(".jl-chay-tieu").textContent.split("/")[1]));
soat("vào thử thách với " + tongCau + " câu", tongCau >= 8, tongCau);
let guong = 0;
for (let i = 0; i < tongCau; i++) {
  await pg.waitForSelector(".jl-lua:not(:disabled)");
  const dung = await pg.evaluate(() => window.JlptUI.dapAnDung());
  await pg.keyboard.press(String(dung + 1));
  await pg.waitForSelector(".jl-fb.dung");
  guong++;
  await pg.keyboard.press("Enter");
}
await pg.waitForSelector(".jl-kq", { timeout: 5000 });
await pg.waitForFunction(() => document.querySelector(".jl-vong b").textContent === "100%" && document.querySelectorAll(".jl-st.co").length === 3, null, { timeout: 5000 });
const kq = await pg.evaluate(() => ({ p: document.querySelector(".jl-vong b").textContent, sao: document.querySelector(".jl-kq-sao").textContent, tieu: document.querySelector(".jl-kq-tieu").textContent }));
soat("kết quả 100%, 3 sao (nảy lần lượt), vượt chặng, có pháo giấy", kq.p === "100%" && kq.sao === "★★★" && /Vượt/.test(kq.tieu), JSON.stringify(kq));
await pg.click(".jl-kq .jl-btn.chinh");
await pg.waitForSelector(".jl-bd");
const sau1 = await pg.evaluate(() => { const n = [...document.querySelectorAll(".jl-nut")]; return { x1: n[0].classList.contains("xong"), m2: !n[1].classList.contains("khoa"), k3: n[2].classList.contains("khoa") }; });
soat("chặng 1 xong, chặng 2 mở, chặng 3 vẫn khoá", sau1.x1 && sau1.m2 && sau1.k3, JSON.stringify(sau1));
let luu = await sw.evaluate(async () => (await chrome.storage.local.get("jlpt")).jlpt);
soat("tiến độ lưu bền: điểm 100, sao 3, ngọc = số câu đúng + 15 (3 sao × 5)", luu && luu.mon.n3.chang[id1].tot === 100 && luu.mon.n3.chang[id1].sao === 3 && luu.ngoc === tongCau + 15, JSON.stringify(luu && luu.ngoc));
soat("chuỗi ngày = 1", luu.chuoi === 1);

console.log("\nLàm sai hết chặng 2 (luật 60%)");
const id2 = await pg.evaluate(() => document.querySelectorAll(".jl-nut")[1].dataset.id);
await pg.click(`.jl-nut[data-id="${id2}"]`);
await pg.waitForSelector(".jl-to-hop");
await pg.click(".jl-to-nut .jl-btn:not(.chinh)");     // "Làm bài ngay": bỏ qua phần học
await pg.waitForSelector(".jl-lua", { timeout: 5000 });
const tong2 = await pg.evaluate(() => Number(document.querySelector(".jl-chay-tieu").textContent.split("/")[1]));
for (let i = 0; i < tong2; i++) {
  await pg.waitForSelector(".jl-lua:not(:disabled)");
  const dung = await pg.evaluate(() => window.JlptUI.dapAnDung());
  await pg.keyboard.press(String(((dung + 1) % 4) + 1));
  await pg.waitForSelector(".jl-fb.sai");
  await pg.keyboard.press("Enter");
}
// sau lượt chính còn lượt "ôn lại câu sai" — không tính điểm
await pg.waitForSelector(".jl-chay-tieu");
const oiLai = await pg.evaluate(() => /Ôn lại/.test(document.querySelector(".jl-chay-tieu").textContent));
soat("sai thì được ôn lại các câu sai một lần", oiLai);
for (let i = 0; i < tong2; i++) {
  await pg.waitForSelector(".jl-lua:not(:disabled)");
  const dung = await pg.evaluate(() => window.JlptUI.dapAnDung());
  await pg.keyboard.press(String(dung + 1));
  await pg.waitForSelector(".jl-fb.dung");
  await pg.keyboard.press("Enter");
}
await pg.waitForSelector(".jl-kq");
await pg.waitForFunction(() => document.querySelector(".jl-vong b").textContent === "0%", null, { timeout: 5000 });
const kq2 = await pg.evaluate(() => ({ p: document.querySelector(".jl-vong b").textContent, tieu: document.querySelector(".jl-kq-tieu").textContent, truot: !!document.querySelector(".jl-vong.truot") }));
soat("0% → 'Chưa đạt 60%', vòng màu trượt (ôn lại không được tính điểm)", kq2.p === "0%" && /Chưa đạt/.test(kq2.tieu) && kq2.truot, JSON.stringify(kq2));
await pg.click(".jl-kq .jl-btn:not(.chinh)");        // Chơi lại
await pg.waitForSelector(".jl-lua");
await pg.keyboard.press("Escape");
await pg.waitForSelector(".jl-hoi");
await pg.click(".jl-hoi .jl-btn.chinh");
await pg.waitForSelector(".jl-bd");
const sau2 = await pg.evaluate(() => { const n = [...document.querySelectorAll(".jl-nut")]; return { x2: n[1].classList.contains("xong"), k3: n[2].classList.contains("khoa") }; });
soat("trượt chặng 2: không xong, chặng 3 vẫn khoá; thoát giữa chừng không đổi gì", !sau2.x2 && sau2.k3, JSON.stringify(sau2));
luu = await sw.evaluate(async () => (await chrome.storage.local.get("jlpt")).jlpt);
soat("điểm cao nhất của chặng 2 ghi nhận 0 và có mục sai để ôn", luu.mon.n3.chang[id2].tot === 0 && Object.keys(luu.sai).length >= 4, Object.keys(luu.sai).length);

console.log("\nBáo câu sai");
await pg.click(`.jl-nut[data-id="${id2}"]`);
await pg.waitForSelector(".jl-to-hop");
await pg.click(".jl-to-nut .jl-btn:not(.chinh)");
await pg.waitForSelector(".jl-lua");
await pg.keyboard.press("1");
await pg.waitForSelector(".jl-fb");
await pg.click(".jl-bao");
luu = await sw.evaluate(async () => (await chrome.storage.local.get("jlpt")).jlpt);
soat("câu bị báo được ghi lại", Object.keys(luu.baoLoi).length === 1);
await pg.keyboard.press("Escape"); await pg.click(".jl-hoi .jl-btn.chinh"); await pg.waitForSelector(".jl-bd");

console.log("\nNút nhạc nền");
const nhac = () => pg.evaluate(() => { const b = document.querySelector(".jl-nhac"); return { an: b.hidden, tat: b.classList.contains("tat"), r: b.getBoundingClientRect().bottom <= innerHeight && b.getBoundingClientRect().top > innerHeight - 140 }; });
let nh = await nhac();
soat("nút nhạc nằm ở cuối màn hình, đang bật", !nh.an && !nh.tat && nh.r, JSON.stringify(nh));
await pg.click(".jl-nhac");
nh = await nhac();
luu = await sw.evaluate(async () => (await chrome.storage.local.get("jlpt")).jlpt);
soat("bấm nút: tắt nhạc, lưu lựa chọn", nh.tat && luu.nhac === false);
await pg.click(".jl-nhac");
luu = await sw.evaluate(async () => (await chrome.storage.local.get("jlpt")).jlpt);
soat("bấm lần nữa: bật lại", luu.nhac === true);

console.log("\nQuay về chọn cấp + chế độ thử");
await pg.evaluate(() => document.querySelector(".jl-lui").click());
await pg.waitForSelector("#jlThu");
soat("về màn chọn cấp: thanh bên hiện lại", await pg.evaluate(() => getComputedStyle(document.querySelector(".side")).display !== "none"));
await pg.check("#jlThu");
await pg.waitForTimeout(400);
await pg.click('.jl-the[data-mon="n2"]');
await pg.waitForSelector(".jl-thoai");
await pg.click(".jl-thoai .jl-btn"); await pg.click(".jl-thoai .jl-btn");
await pg.waitForSelector(".jl-bd");
const n2 = await pg.evaluate(() => ({ n: document.querySelectorAll(".jl-nut").length, khoa: document.querySelectorAll(".jl-nut.khoa").length, tit: document.querySelector(".jl-bd-ten").textContent }));
soat("N2: 201 chặng, tất cả mở (chế độ thử), tiêu đề Okinawa", n2.n === 201 && n2.khoa === 0 && /Okinawa/.test(n2.tit), JSON.stringify(n2));
await pg.evaluate(() => document.querySelector(".jl-lui").click());
await pg.uncheck("#jlThu");
await pg.click('.jl-the[data-mon="n2"]');
await pg.waitForSelector(".jl-bd");
const n2b = await pg.evaluate(() => ({ khoa: document.querySelectorAll(".jl-nut.khoa").length, mo: document.querySelectorAll(".jl-nut:not(.khoa)").length }));
soat("N2 tắt chế độ thử: vào được ngay không cần qua N3; chỉ chặng đầu mở", n2b.mo === 1 && n2b.khoa === 200, JSON.stringify(n2b));
soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 200));
await ctx.close();
process.exit(ket.every(Boolean) ? 0 : 1);
