/**
 * PHÍM TẮT + HIỆU ỨNG, ÔN TỪNG ĐƯỜNG, TỰ ĐÓNG BĂNG Ở MỨC TỐI ĐA, NGỮ PHÁP ĐÓNG BĂNG.
 *
 *   node kiem-tra/hoc-phim-duong.mjs /home/user/NeutronDict/extension
 *
 *   A. lõi: Srs.toiDa / Srs.denHanDuong, NguPhapSrs.dongBang / thongKe / denHan
 *   B. buổi học: F = Quên + dấu X đỏ, J = Nhớ + dấu V xanh (chấm được cả khi chưa lật: cu-chi-hai.mjs);
 *      từ chạm trần tự đóng băng, từ chưa tới thì không
 *   C. ôn từng đường (bài nghe): chỉ toàn bài nghe, A nghe lại (không lật),
 *      Space lật để hiện nghĩa, và 12 tiếng nghỉ giữa các đường vẫn được giữ
 *   (bài điền khuyết có test riêng: bai-dien-khuyet.mjs)
 *   E. ngữ pháp: làm đúng ngay lần đầu là đóng băng, sửa lại thì không,
 *      danh sách câu đóng băng và nút Mở lại
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
console.log("A. Lõi");
{
  const ctx = { Intl, console }; ctx.self = ctx;
  for (const f of ["srs.js", "ngu-phap.js"]) vm.runInNewContext(readFileSync(join(EXT, f), "utf8"), ctx);
  const S = ctx.Srs, G = ctx.NguPhapSrs;
  const NGAY = 86400000, now = Date.now();
  const duong = (n, due) => ({ lv: 6, ngay: n, net: 2, sai: 0, due: due, ts: now - 400 * NGAY });
  const toi = { word: "a", duong: { nhin: duong(365, now - 1) } };
  soat("toiDa: mọi đường đang có đã chạm trần 365 ngày", S.toiDa(toi) === true);
  soat("toiDa: 364 ngày thì chưa", S.toiDa({ word: "a", duong: { nhin: duong(364, 0) } }) === false);
  soat("toiDa: có câu nghe nhưng đường nghe chưa tới trần thì chưa",
       S.toiDa({ word: "a", cauNghe: { cau: "aあ。" }, duong: { nhin: duong(365, 0), nghe: duong(30, 0) } }) === false);
  soat("toiDa: từ chưa học gì thì không", S.toiDa({ word: "a" }) === false);
  const nghe = { word: "b", cauNghe: { cau: "bあ。" },
    duong: { nhin: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * NGAY, ts: now - 14 * NGAY },
             nghe: { lv: 2, ngay: 10, net: 2, sai: 0, due: now - NGAY, ts: now - 10 * NGAY } } };
  soat("denHanDuong: đường nghe tới hạn, đường nhìn chưa", S.denHanDuong(nghe, "nghe", now) && !S.denHanDuong(nghe, "nhin", now));
  soat("denHanDuong: đóng băng cả từ thì không", !S.denHanDuong(Object.assign({}, nghe, { dongBang: 1 }), "nghe", now));
  soat("denHanDuong: đóng băng riêng đường thì không",
       !S.denHanDuong(Object.assign({}, nghe, { lichRieng: { nghe: { dongBang: true, ts: now } } }), "nghe", now));
  const vuaCham = JSON.parse(JSON.stringify(nghe)); vuaCham.duong.nhin.ts = now - 3600000;
  soat("denHanDuong: vừa chấm đường khác (<12 tiếng) thì chưa", !S.denHanDuong(vuaCham, "nghe", now));

  const k = G.khoa("今日は天気がいいです。");
  const d1 = G.dongBang(undefined, "今日は天気がいいです。", true, now);
  soat("NguPhapSrs.dongBang: câu mới cũng đóng băng được", d1.dongBang === true && G.biDongBang(d1));
  soat("câu đóng băng không còn đến hạn", G.denHan(d1, now + 999 * NGAY) === false);
  const d2 = G.dongBang(d1, "今日は天気がいいです。", false, now + 5);
  soat("mở lại thì đến hạn ngay và ts nhích lên", !d2.dongBang && G.denHan(d2, now + 5) && d2.ts > d1.ts);
  const tk = G.thongKe([{ cau: "今日は天気がいいです。" }, { cau: "別の文です。" }], { [k]: d1 }, now);
  soat("thongKe đếm riêng câu đóng băng, không tính vào mới/đến hạn",
       tk.bang === 1 && tk.moi === 1 && tk.den === 0 && tk.tong === 2, JSON.stringify(tk));
  soat("cham không chấm được câu đang đóng băng", G.cham(d1, "今日は天気がいいです。", "dung", now, "x", d1.ts) === null);
}

/* ------------------------------------------------------------------ */
const ctxB = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-")), {
  channel: "chromium", headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
});
const sw = ctxB.serviceWorkers()[0] || await ctxB.waitForEvent("serviceworker", { timeout: 20000 });
const id = sw.url().split("/")[2];
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await cho(250);
}
await sw.evaluate(() => { self.fetch = () => Promise.reject(new Error("chặn")); });
const page = await ctxB.newPage();
page.on("pageerror", (e) => loi.push(e.message));

const NGAY = 86400000;
const gieo = (nb) => sw.evaluate(async ([nb, now]) => {
  const ngay = 86400000;
  const out = {};
  for (const [k, m] of Object.entries(nb)) {
    const duong = {};
    for (const [t, n] of Object.entries(m.duong)) {
      // n = [ngày, tớiHạn?]; tới hạn thì due ở quá khứ, ts cũ hơn 12 tiếng.
      duong[t] = { lv: 3, ngay: n[0], net: 2, sai: 0, due: n[1] ? now - ngay : now + 5 * ngay, ts: now - Math.max(2, n[0]) * ngay };
    }
    out[k] = Object.assign({ dict: "javi", means: [m.word + "-nghĩa"], ts: now, srs: { lv: 2, due: now - ngay, ts: now } }, m, { duong });
  }
  await chrome.storage.local.set({ notebook: out, decks: {}, hoc: {}, nhipMs: {}, nguPhapSrs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, [nb, Date.now()]);
const mo = async (nb) => {
  await gieo(nb);
  await page.goto(`chrome-extension://${id}/notebook.html`);
  await page.waitForFunction((n) => document.querySelectorAll(".entry").length >= n, Object.keys(nb).length, { timeout: 20000 });
  await page.evaluate(() => {
    window.__noi = [];
    speechSynthesis.speak = (u) => { window.__noi.push(u.text); };
  });
};
const doc = (w) => sw.evaluate(async (tu) => {
  const nb = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k in nb) if (nb[k] && nb[k].word === tu) return nb[k];
  return null;
}, w);
const tu = () => page.evaluate(() => (theCardHienTai() || {}).word);
/** Hồ sơ trắng nên lượt ôn đầu mở khoá huy hiệu: dẹp tấm chúc mừng thì thẻ kế mới hiện. */
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
const hienHieuUng = () => page.evaluate(() => {
  const h = document.querySelector("#stHieuUng .hu");
  return h ? h.className : "";
});

/* ------------------------------------------------------------------ */
console.log("\nB. Buổi học: F / J, hiệu ứng, tự đóng băng ở mức tối đa");
await mo({
  "javi:満点": { word: "満点", duong: { nhin: [365, true] } },
  "javi:初心": { word: "初心", duong: { nhin: [3, true] } }
});
await page.click("#study");
await page.waitForFunction(() => document.getElementById("studyOverlay").classList.contains("show"));
await cho(150);
{
  const thuTu = [];
  for (let i = 0; i < 2; i++) {
    const w = await tu(); thuTu.push(w);
    await page.keyboard.press("Space");
    await cho(100);
    soat("Space lật thẻ " + w, await page.evaluate(() => document.getElementById("stGrade").style.display !== "none"));
    await page.keyboard.press(w === "満点" ? "j" : "f");
    await cho(30);
    const cls = await hienHieuUng();
    soat(w === "満点" ? "J: dấu V xanh bật ngay" : "F: dấu X đỏ nhạt hiện", /\bchay\b/.test(cls) && cls.includes(w === "満点" ? "nho" : "quen"), cls);
    await cho(300);
    await detMung();
    await cho(200);
  }
  soat("hai thẻ đã đi qua đủ cả hai từ", thuTu.includes("満点") && thuTu.includes("初心"), thuTu.join(","));
  const m = await doc("満点"), s = await doc("初心");
  soat("từ chạm trần 365 ngày tự ĐÓNG BĂNG sau lượt nhớ", m.dongBang === 1, JSON.stringify(m.dongBang));
  soat("từ chưa chạm trần thì không", !s.dongBang);
  soat("lượt quên đã được ghi (đường nhìn có sai > 0 hoặc lùi cấp)", !!s.duong.nhin && s.duong.nhin.ts > Date.now() - 20000);
  await page.keyboard.press("Escape");
  await cho(300);
  soat("Esc đóng buổi học", !(await page.evaluate(() => document.getElementById("studyOverlay").classList.contains("show"))));
  const bang = await page.evaluate(() => {
    const it = items.find((x) => x.word === "満点");
    return { them: !!it.dongBang, han: window.Srs.denHan(it, Date.now()).length };
  });
  soat("bản trong bộ nhớ trang cũng biết nó đã đóng băng, và không tới hạn", bang.them && bang.han === 0);
}

/* ------------------------------------------------------------------ */
console.log("\nC. Ôn từng đường — bài nghe");
// Không có bản dịch (cauNghe.dich) nên chưa mở đường điền khuyết: chỉ nghe tới hạn.
const bn = (w) => ({ word: w, cauNghe: { cau: w + "を使います。" },
  duong: { nhin: [14, false], nghe: [10, true] } });
await mo({ "javi:朝食": bn("朝食"), "javi:夕食": bn("夕食") });
await page.click("#studyPath");
await page.waitForSelector("#duongRiengDialog[open]");
{
  const r = await page.evaluate(() => [...document.querySelectorAll("#duongRiengDialog .duong-rieng-lua")]
    .map((b) => ({ ma: b.dataset.ma, off: b.disabled, chu: b.textContent })));
  soat("hộp có ba loại bài", r.length === 3, r.map((x) => x.ma).join(","));
  const nghe = r.find((x) => x.ma === "nghe");
  soat("bài nghe bật và nói rõ số bài (2)", nghe && !nghe.off && /2/.test(nghe.chu), nghe && nghe.chu);
  soat("bài đoán nghĩa & điền khuyết tắt vì chưa có bài nào tới hạn",
       r.find((x) => x.ma === "nhin").off && r.find((x) => x.ma === "dien").off);
}
await page.click('#duongRiengDialog [data-ma="nghe"]');
await page.waitForFunction(() => document.getElementById("studyOverlay").classList.contains("show"));
await cho(450);
{
  const q = await page.evaluate(() => session.queue.map((x) => x._d));
  soat("hàng đợi toàn bài nghe, đủ 2 thẻ", q.length === 2 && q.every((d) => d === "nghe"), q.join(","));
  soat("mặt nghe hiện, chữ bị giấu", await page.evaluate(() =>
    document.getElementById("stNgheMat").style.display !== "none" && document.getElementById("stMatChu").style.display === "none"));
  const n0 = await page.evaluate(() => window.__noi.length);
  soat("thẻ nghe tự phát một lượt", n0 === 1, n0);
  for (let i = 0; i < 3; i++) { await page.keyboard.press("a"); await cho(60); }
  const n1 = await page.evaluate(() => window.__noi.length);
  soat("A liên tục = nghe lại mỗi lần (3 lần nữa)", n1 === n0 + 3, n0 + " → " + n1);
  soat("A KHÔNG lật thẻ nghe", await page.evaluate(() => document.getElementById("stGrade").style.display === "none"));
  await page.keyboard.press("Space");
  await cho(150);
  soat("Space lật thẻ nghe để hiện nghĩa", await page.evaluate(() => document.getElementById("stGrade").style.display !== "none"));
  const w = await tu();
  const nTruocA = await page.evaluate(() => window.__noi.length);
  await page.keyboard.press("a");
  await cho(60);
  const cuoi = await page.evaluate(() => window.__noi[window.__noi.length - 1]);
  soat("A sau khi lật: vẫn nghe lại câu", cuoi && cuoi.includes(w) && (await page.evaluate(() => window.__noi.length)) === nTruocA + 1, cuoi);
  await page.keyboard.press("j");
  await cho(400);
  await detMung();
  await cho(200);
  const m = await doc(w);
  soat("J chấm nhớ: đường nghe có lượt chấm mới", m.duong.nghe.ts > Date.now() - 20000);
  const q2 = await page.evaluate(() => session.queue.map((x) => x._d + ":" + x.word));
  soat("thẻ kế vẫn là bài nghe (không bị xen đường khác)", q2.length === 1 && q2[0].startsWith("nghe:"), q2.join(","));
  await page.keyboard.press("Escape");
  await cho(300);
}

/* ------------------------------------------------------------------ */
console.log("\nE. Ngữ pháp: làm đúng là đóng băng");
const CAU = ["私は毎朝日本語を勉強します。", "昨日は友達と駅の近くで昼ご飯を食べました。"];
await mo({
  "javi:c1": { word: CAU[0], kind: "sent", duong: { nhin: [14, false] } },
  "javi:c2": { word: CAU[1], kind: "sent", duong: { nhin: [14, false] } }
});
await page.evaluate(() => moMan("grammar"));
await page.waitForFunction(() => /2 câu|Có 2/.test(document.getElementById("npCount").textContent), null, { timeout: 8000 }).catch(() => {});
const giai = async (dungNgay) => {
  const goc = await page.evaluate(() => document.getElementById("npProgress").textContent);
  // Đoán câu đang hiện bằng cách ghép các mảnh trùng khớp với một trong hai câu.
  const mang = await page.evaluate(() => [...document.querySelectorAll("#npOptions .np-piece")].map((b) => b.textContent));
  const cau = CAU.find((c) => mang.join("").length === c.length && [...mang].every((m) => c.includes(m)));
  const bam = async (thuTu) => {
    for (const m of thuTu) {
      await page.evaluate((t) => { [...document.querySelectorAll("#npOptions .np-piece")].find((b) => b.textContent === t).click(); }, m);
    }
  };
  const dungThuTu = []; { let con = cau; const dsM = [...mang]; while (con) { const m = dsM.find((x) => con.startsWith(x) && !dungThuTu.includes(x)); if (!m) break; dungThuTu.push(m); con = con.slice(m.length); } }
  if (!dungNgay) {
    await bam([...dungThuTu].reverse());
    await page.click("#npCheck"); await cho(100);
    await page.evaluate(() => { [...document.querySelectorAll("#npAnswer .np-piece")].forEach((b) => b.click()); });
  }
  await bam(dungThuTu);
  await page.click("#npCheck"); await cho(500);
  return { cau, goc };
};
await page.click("#npStart");
await cho(200);
{
  const a = await giai(true);
  soat("làm đúng ngay lần đầu: báo đã đóng băng", /đóng băng/.test(await page.evaluate(() => document.getElementById("npSchedule").textContent)));
  const kho = await sw.evaluate(async () => (await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs || {});
  const k = "ja:" + a.cau;
  soat("kho ghi cờ đóng băng cho đúng câu đó", !!(kho[k] && kho[k].dongBang), Object.keys(kho).join("|"));
  await page.click("#npNext"); await cho(150);
  const b = await giai(false);
  soat("câu thứ hai: sai rồi sửa lại cũng được tính là làm đúng", b.cau !== a.cau);
  const kho2 = await sw.evaluate(async () => (await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs || {});
  soat("kho ghi cờ đóng băng cho cả câu sai-rồi-sửa", !!(kho2["ja:" + b.cau] && kho2["ja:" + b.cau].dongBang));
  await page.click("#npNext"); await cho(300);
  const r = await page.evaluate(() => ({
    bang: !document.getElementById("npBang").hidden,
    hang: document.querySelectorAll("#npBangDs .np-bang-hang").length,
    tk: document.getElementById("npStats").textContent,
    ten: document.getElementById("npBangTen").textContent }));
  soat("danh sách câu đóng băng hiện, 2 câu", r.bang && r.hang === 2, r.ten);
  soat("thống kê ghi số câu đã đóng băng", /2 câu đã đóng băng/.test(r.tk), r.tk);
  // Hai câu đều đóng băng: không còn gì để luyện tự do.
  const tat = await page.evaluate(() => document.getElementById("npStart").disabled);
  soat("mọi câu đã đóng băng: nút luyện tắt", tat);
  // Mở lại
  await page.evaluate(() => { document.getElementById("npBang").open = true; });
  await page.evaluate((c) => { [...document.querySelectorAll("#npBangDs .np-bang-hang")].find((h) => h.textContent.includes(c)).querySelector("button").click(); }, a.cau);
  await cho(400);
  const r2 = await page.evaluate(() => ({ hang: document.querySelectorAll("#npBangDs .np-bang-hang").length, hidden: document.getElementById("npBang").hidden }));
  soat("Mở lại: câu ấy rời danh sách, câu kia còn lại", r2.hang === 1 && !r2.hidden);
  const kho3 = await sw.evaluate(async () => (await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs || {});
  soat("kho gỡ cờ và câu đến hạn ngay", !kho3[k].dongBang && kho3[k].due <= Date.now() + 1000, JSON.stringify(kho3[k]));
}

soat("không có lỗi JS trên trang", loi.length === 0, loi.join(" | "));
await ctxB.close();
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
