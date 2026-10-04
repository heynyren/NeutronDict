/**
 * SỔ TAY: HIỆU NĂNG + CHỌN NHIỀU / XOÁ HÀNG LOẠT — đo trên extension thật.
 *
 *   node kiem-tra/nd-sotay-chon.mjs /home/user/NeutronDict/extension
 *
 * Lỗi người dùng gặp: bấm xoá một từ (hay đóng băng, thích…) phải đợi cả giây vì
 * mỗi thao tác nạp lại cả sổ rồi vẽ lại TẤT CẢ các hàng. Bài này chốt:
 *
 *   1. Vẽ theo lô: sổ 600 từ chỉ dựng một trang hàng đầu; "Hiện thêm" dựng tiếp.
 *   2. Hàng không còn nút xoá riêng; có ô chọn. Tích → thanh hành động hiện ra.
 *   3. "Chọn tất cả" chọn CẢ những hàng chưa dựng, không chỉ phần đang thấy.
 *   4. Bấm Xoá là XOÁ NGAY, không hộp xác nhận: cả loạt trong một lượt ghi, hàng biến
 *      mất tức thì, nghĩa đã sửa tay vẫn giữ trong bia mộ.
 *   8. Sửa nghĩa một từ KHÔNG ném danh sách về đầu trang, và chỉ dựng lại đúng hàng đó.
 *   9. Hộp "Lịch từng đường" không có nút Đóng; bấm ra ngoài thì đóng.
 *   5. Hoàn tác khôi phục nguyên vẹn (kể cả tiến độ ôn).
 *   6. Thích / đóng băng cập nhật đúng một hàng, không vẽ lại cả danh sách.
 *   7. Thao tác không còn tỉ lệ với kích thước sổ: xoá trong sổ lớn vẫn nhanh.
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

const N = 600;
const now = Date.now();
await sw.evaluate(async ([N, now]) => {
  const nb = {};
  for (let i = 0; i < N; i++) {
    const w = "word" + i;
    nb["envi:" + w] = { word: w, dict: "envi", reading: "/wɜːd/", means: ["nghĩa " + i], ts: now - i * 1000,
      pos: [{ p: "noun", defs: [{ def: "a definition", ex: "an example" }], syn: ["a"], ant: [] }] };
  }
  // Một mục có bản dịch SỬA TAY và ghi chú, và một mục đã ôn có tiến độ
  nb["envi:word3"].mEdit = 1; nb["envi:word3"].note = "ghi chú riêng"; nb["envi:word3"].means = ["bản tôi sửa"];
  nb["envi:word4"].srs = { lv: 3, ts: now, due: now + 86400000 };
  await chrome.storage.local.set({ settings: { ngu: "en" }, notebook: nb, decks: {}, hoc: {} });
}, [N, now]);

const pg = await ctx.newPage();
const loi = [];
pg.on("pageerror", (e) => loi.push(e.message));
await pg.goto(`chrome-extension://${ID}/notebook.html`);
await pg.waitForSelector(".entry", { timeout: 20000 });
// Tắt lời chúc mừng huy hiệu (sổ 600 từ mở khoá huy hiệu) kẻo che nút.
const tat = () => pg.evaluate(() => document.querySelectorAll(".celebrate.show").forEach((e) => e.classList.remove("show")));
await tat();
const dem = () => pg.evaluate(() => document.querySelectorAll("#list .entry").length);
const sw0 = (f, a) => pg.evaluate(f, a);

console.log("Vẽ theo lô");
const d1 = await dem();
soat("chỉ dựng một trang đầu, không phải cả 600 hàng", d1 > 0 && d1 <= 80, d1 + " hàng");
soat("có nút 'Hiện thêm' ở cuối", await sw0(() => !!document.querySelector("#listMore")));
soat("hàng không còn nút xoá riêng", await sw0(() => !document.querySelector('#list .entry button[title^="Xoá khỏi sổ"]')));
soat("mỗi hàng còn đủ cột nút điều khiển (Gemini, sửa, ghi chú, link, chọn sổ)", await sw0(() =>
  [...document.querySelectorAll("#list .entry")].every((r) => r.querySelector(".ctl .iconbtn.gemini") && r.querySelector(".ctl select"))));
soat("mỗi hàng có ô chọn", await sw0(() => document.querySelectorAll("#list .entry .chon-o input").length === document.querySelectorAll("#list .entry").length));
await sw0(() => { const m = document.querySelector("#listMore"); if (m) m.click(); });
await pg.waitForTimeout(150);
soat("bấm 'Hiện thêm' dựng thêm hàng", (await dem()) > d1, d1 + " → " + (await dem()));

console.log("\nChọn nhiều");
soat("chưa chọn thì thanh hành động ẩn", await sw0(() => getComputedStyle(document.querySelector("#thanhChon")).display === "none"));
await sw0(() => { const hs = document.querySelectorAll("#list .entry .chon-o input"); hs[0].click(); hs[1].click(); });
soat("tích hai ô: thanh hiện, ghi 'Đã chọn 2'", await sw0(() => getComputedStyle(document.querySelector("#thanhChon")).display !== "none" && /2/.test(document.querySelector("#chonSo").textContent)),
  await sw0(() => document.querySelector("#chonSo").textContent));
soat("hàng được tích đổi nền (class chon)", await sw0(() => document.querySelectorAll("#list .entry.chon").length === 2));
await sw0(() => document.querySelector("#chonTatCa").click());
soat("'Chọn tất cả' chọn CẢ hàng chưa dựng (600)", await sw0(() => /600/.test(document.querySelector("#chonSo").textContent)),
  await sw0(() => document.querySelector("#chonSo").textContent));
await sw0(() => document.querySelector("#chonBo").click());
soat("'Bỏ chọn' xoá hết lựa chọn, thanh ẩn", await sw0(() => getComputedStyle(document.querySelector("#thanhChon")).display === "none" && !document.querySelector("#list .entry.chon")));

console.log("\nXoá ngay, không hỏi lại");
// chọn word3 (có bản sửa tay), word4 (có tiến độ) và word0
await sw0(() => { for (const k of ["envi:word0", "envi:word3", "envi:word4"]) document.querySelector('#list .entry[data-key="' + k + '"] .chon-o input').click(); });
soat("không còn hộp xác nhận nào trong trang", await sw0(() => !document.querySelector("#xoaSheet")));
const t0 = Date.now();
await sw0(() => document.querySelector("#chonXoa").click());
await pg.waitForFunction(() => !document.querySelector('#list .entry[data-key="envi:word0"]'), null, { timeout: 5000 });
const dt = Date.now() - t0;
soat("bấm Xoá là hàng biến mất NGAY (không hỏi, không chờ ghi đĩa)", dt < 600, dt + " ms");
soat("thanh ẩn, số đếm cập nhật", await sw0(() => getComputedStyle(document.querySelector("#thanhChon")).display === "none" && /597/.test(document.querySelector("#count").textContent)),
  await sw0(() => document.querySelector("#count").textContent));
await pg.waitForTimeout(600);
const nb2 = await sw0(async () => (await chrome.storage.local.get("notebook")).notebook);
soat("kho: đúng 3 mục thành bia mộ (del)", ["envi:word0", "envi:word3", "envi:word4"].every((k) => nb2[k] && nb2[k].del)
  && Object.values(nb2).filter((e) => e.del).length === 3);
soat("bia mộ giữ bản dịch sửa tay + ghi chú", nb2["envi:word3"].mEdit === 1 && nb2["envi:word3"].note === "ghi chú riêng" && nb2["envi:word3"].means[0] === "bản tôi sửa");

console.log("\nHoàn tác");
// chọn lại 1 từ, xoá, bấm Hoàn tác trên toast
await sw0(() => document.querySelector('#list .entry[data-key="envi:word1"] .chon-o input').click());
await sw0(() => document.querySelector("#chonXoa").click());
await pg.waitForFunction(() => !document.querySelector('#list .entry[data-key="envi:word1"]'), null, { timeout: 5000 });
soat("xoá MỘT từ: hàng biến mất ngay", true);
await pg.waitForTimeout(500);
await sw0(() => document.querySelector("#toast .toast-nut").click());
await pg.waitForFunction(() => document.querySelector('#list .entry[data-key="envi:word1"]'), null, { timeout: 5000 });
const nb3 = await sw0(async () => (await chrome.storage.local.get("notebook")).notebook);
soat("Hoàn tác đưa từ trở lại, không còn là bia mộ", nb3["envi:word1"] && !nb3["envi:word1"].del && nb3["envi:word1"].means[0] === "nghĩa 1");

console.log("\nThao tác lên MỘT hàng không vẽ lại cả danh sách");
await sw0(() => { window.__hang2 = document.querySelectorAll("#list .entry")[2]; window.__hang5 = document.querySelectorAll("#list .entry")[5]; });
const t1 = Date.now();
await sw0(() => document.querySelectorAll("#list .entry")[2].querySelector(".iconbtn.like").click());
await pg.waitForFunction(() => document.querySelectorAll("#list .entry")[2].querySelector(".iconbtn.like.on"), null, { timeout: 5000 });
const dtThich = Date.now() - t1;
soat("bấm Thích đổi đúng hàng đó", true, dtThich + " ms");
soat("các hàng KHÁC vẫn là phần tử cũ (không bị dựng lại)", await sw0(() => document.querySelectorAll("#list .entry")[5] === window.__hang5));
const t2 = Date.now();
await sw0(() => document.querySelectorAll("#list .entry")[3].querySelector(".iconbtn.bang").click());
await pg.waitForFunction(() => document.querySelectorAll("#list .entry")[3].querySelector(".iconbtn.bang.on"), null, { timeout: 5000 });
soat("Đóng băng cũng vậy", await sw0(() => document.querySelectorAll("#list .entry")[5] === window.__hang5), (Date.now() - t2) + " ms");

console.log("\nSửa nghĩa không nhảy về đầu trang");
await sw0(() => { document.querySelector("#more, #listMore") && document.querySelector("#listMore").click(); });
await pg.waitForTimeout(200);
const vung = () => sw0(() => { const m = document.querySelector(".main"); return (m && m.scrollHeight > m.clientHeight + 1 ? m : document.scrollingElement).scrollTop; });
await sw0(() => { const m = document.querySelector(".main"); const v = (m && m.scrollHeight > m.clientHeight + 1 ? m : document.scrollingElement); v.scrollTop = 900; });
await pg.waitForTimeout(250);
const top0 = await vung();
await sw0(() => { window.__hangSua = document.querySelectorAll("#list .entry")[12]; window.__hangKhac = document.querySelectorAll("#list .entry")[14]; });
const keySua = await sw0(() => window.__hangSua.dataset.key);
await sw0((k) => { moSua(items.find((x) => x.key === k), "trans"); }, keySua);
await sw0(() => { document.querySelector("#edTrans").value = "nghĩa mới sửa tay"; });
const tS = Date.now();
await sw0(() => document.querySelector("#edSave").click());
await pg.waitForFunction((k) => (document.querySelector('#list .entry[data-key="' + k + '"] .m') || {}).textContent === "nghĩa mới sửa tay", keySua, { timeout: 5000 });
soat("hàng vừa sửa hiện nghĩa mới", true, (Date.now() - tS) + " ms");
const top1 = await vung();
soat("thanh cuộn KHÔNG nhảy về đầu trang", top0 > 300 && Math.abs(top1 - top0) < 60, top0 + " → " + top1);
soat("các hàng khác không bị dựng lại", await sw0(() => document.querySelectorAll("#list .entry")[14] === window.__hangKhac));

console.log("\nHộp 'Lịch từng đường'");
await sw0(() => { window.__hangSua.querySelector(".lich-rieng").click(); });
await pg.waitForSelector("#lichRiengDialog[open]", { timeout: 3000 });
soat("hộp mở", true);
soat("KHÔNG còn nút Đóng", await sw0(() => ![...document.querySelectorAll("#lichRiengDialog button")].some((b) => /^Đóng$|^Close$/.test(b.textContent.trim()))));
await pg.mouse.click(5, 5);
await pg.waitForTimeout(250);
soat("bấm ra ngoài thì đóng", await sw0(() => !document.querySelector("#lichRiengDialog")));
await sw0(() => { window.__hangSua.querySelector(".lich-rieng").click(); });
await pg.waitForSelector("#lichRiengDialog[open]", { timeout: 3000 });
const hop = await sw0(() => { const r = document.querySelector("#lichRiengDialog").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 20 }; });
await pg.mouse.click(hop.x, hop.y);
await pg.waitForTimeout(250);
soat("bấm VÀO TRONG hộp thì vẫn mở", await sw0(() => !!document.querySelector("#lichRiengDialog[open]")));
await pg.keyboard.press("Escape");
await pg.waitForTimeout(250);
soat("Esc cũng đóng", await sw0(() => !document.querySelector("#lichRiengDialog")));

console.log("\nNhanh khi sổ lớn");
const T = await sw0(() => { const t = performance.now(); draw(); return Math.round(performance.now() - t); });
soat("draw() sổ 600 từ", T < 400, T + " ms (bản cũ vẽ cả sổ: hàng trăm ms tới vài giây)");

console.log(loi.length ? "LỖI JS:\n" + loi.join("\n") : "  không có lỗi JS");
const sai = ket.filter((x) => !x).length;
console.log("\n" + (ket.length - sai) + "/" + ket.length + (sai || loi.length ? "  — CÓ LỖI" : "  — sạch"));
await ctx.close();
process.exit(sai || loi.length ? 1 : 0);
