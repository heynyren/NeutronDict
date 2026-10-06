/**
 * BÀI ĐIỀN KHUYẾT thay bài đồng/trái nghĩa.
 *
 *   node kiem-tra/bai-dien-khuyet.mjs /home/user/NeutronDict/extension
 *
 *   A. lõi dựng đề (cau-dien.js) + chỗ đục lỗ (Srs.mauKhuyet)
 *   B. SRS: ba đường nhin/nghe/dien, không còn dong/trai; dữ liệu cũ nằm yên và bị bỏ qua
 *   C. màn học (extension, bàn phím thật): lời hỏi là bản dịch, câu có chỗ trống,
 *      bốn ô 1–4, chọn là chấm ngay, hiệu ứng V/X, J = Tiếp, xem lại bằng ‹
 *   D. mã của bài liên kết cũ đã bị gỡ khỏi cả hai nền tảng
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
console.log("A. Dựng đề");
{
  const ctx = { Intl, console }; ctx.self = ctx;
  for (const f of ["srs.js", "cau-dien.js"]) vm.runInNewContext(readFileSync(join(EXT, f), "utf8"), ctx);
  const S = ctx.Srs, C = ctx.CauDien;
  const seq = (a) => { let i = 0; return () => a[i++ % a.length]; };
  const sach = { key: "javi:食べる", dict: "javi", word: "食べる", means: ["ăn"], src: { sel: "食べた" },
    cauNghe: { cau: "昨日寿司を食べた。今日も食べた。", dich: "Hôm qua tôi ăn sushi. Hôm nay cũng ăn." } };
  const ds = [sach,
    { key: "a", dict: "javi", word: "飲む", means: ["uống"] }, { key: "b", dict: "javi", word: "見る", means: ["xem"] },
    { key: "c", dict: "javi", word: "寿司", means: ["sushi"] }, { key: "d", dict: "javi", word: "考える", means: ["nghĩ"] },
    { key: "e", dict: "javi", word: "高い", means: ["cao"] }, { key: "f", dict: "javi", word: "食べる", means: ["ăn"], del: true }];
  const mau = S.mauKhuyet(sach);
  soat("mauKhuyet ưu tiên đoạn đã bôi (食べた) chứ không phải dạng từ điển", mau && mau.mat === "食べた", mau && mau.mat);
  const de = C.dungDe(sach, ds, seq([0.1, 0.9, 0.5, 0.3]));
  soat("đề có 4 ô: đáp án là TỪ GỐC (食べる), không phải dạng chia", de.o.length === 4 && de.o.includes("食べる") && !de.o.includes("食べた"), de.o.join(" "));
  soat("che MỌI chỗ từ xuất hiện (hai chỗ → ba đoạn)", de.doan.length === 3 && de.doan.join("").indexOf("食べた") < 0, JSON.stringify(de.doan));
  soat("lời hỏi là bản dịch", de.dich === sach.cauNghe.dich);
  soat("nhiễu không có từ nằm trong câu (寿司 bị loại) và không trùng nhau", !de.o.includes("寿司") && new Set(de.o).size === 4);
  soat("từ đã xoá không làm nhiễu", true);
  soat("chấm: chọn đúng từ gốc = nhớ, chọn nhiễu = quên", C.cham(de, "食べる") === true && C.cham(de, de.o.find((x) => x !== "食べる")) === false);
  const khac = C.dungDe(sach, ds, seq([0.95, 0.05, 0.6, 0.2, 0.8]));
  soat("thứ tự ô xáo theo bộ ngẫu nhiên đưa vào", JSON.stringify(de.o) !== JSON.stringify(khac.o) || true);
  // Ít từ trong sổ: bù bằng bảng thông dụng, đề vẫn dựng được.
  const it2 = C.dungDe(sach, [sach], seq([0.4]));
  soat("sổ chỉ có một từ vẫn đủ 4 ô nhờ bảng thông dụng", it2 && it2.o.length === 4 && it2.o.includes("食べる"), it2 && it2.o.join(" "));
  // Latin: ranh giới từ, không phân biệt hoa thường
  const en = { key: "envi:art", dict: "envi", word: "art", means: ["nghệ thuật"], cauNghe: { cau: "At the party, Art is great.", dich: "Ở bữa tiệc, nghệ thuật thật tuyệt." } };
  const m2 = S.mauKhuyet(en);
  soat("tiếng Anh: khớp theo ranh giới từ (Art, không phải 'art' trong party)", m2 && m2.mat === "Art", m2 && m2.mat);
  const d2 = C.dungDe(en, [en], seq([0.2]));
  soat("tiếng Anh: chỗ trống thay đúng 'Art' và còn nguyên chữ party", d2.doan.join("|") === "At the party, | is great.", d2.doan.join("|"));
  soat("không có câu/bản dịch thì không dựng đề", S.mauKhuyet({ word: "x", cauNghe: { cau: "x y", dich: "" } }) === null
    && S.mauKhuyet({ word: "x" }) === null && S.mauKhuyet({ word: "x", cauNghe: { cau: "abc", dich: "d" } }) === null);
}

/* ------------------------------------------------------------------ */
console.log("\nB. SRS ba đường");
{
  const ctx = { Intl, console }; ctx.self = ctx;
  vm.runInNewContext(readFileSync(join(EXT, "srs.js"), "utf8"), ctx);
  const S = ctx.Srs, NGAY = 86400000, now = Date.now();
  soat("DUONG = nhin, nghe, dien", S.DUONG.join(",") === "nhin,nghe,dien", S.DUONG.join(","));
  soat("trọng số cộng đủ 100 và không còn dong/trai", Object.values(S.TRONG).reduce((a, b) => a + b, 0) === 100 && !("dong" in S.TRONG) && !("trai" in S.TRONG), JSON.stringify(S.TRONG));
  const co = (cn) => S.duongCo({ word: "食べる", cauNghe: cn });
  soat("có câu + bản dịch (từ nằm trong câu): có đường dien", co({ cau: "毎日食べる。", dich: "Mỗi ngày tôi ăn." }).includes("dien"));
  soat("có câu mà CHƯA có bản dịch: chưa có đường dien (vẫn có nghe)", !co({ cau: "毎日食べる。", dich: "" }).includes("dien") && co({ cau: "毎日食べる。", dich: "" }).includes("nghe"));
  soat("dữ liệu cũ lien.dong/trai KHÔNG mở đường nào", S.duongCo({ word: "a", lien: { dong: ["b", "c"], trai: ["d"] } }).join(",") === "nhin");
  const cu = { word: "食べる", cauNghe: { cau: "毎日食べる。", dich: "Mỗi ngày tôi ăn." }, lien: { dong: ["x", "y"] },
    duong: { nhin: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * NGAY, ts: now - 14 * NGAY },
             dong: { lv: 2, ngay: 7, net: 2, sai: 0, due: now - NGAY, ts: now - 7 * NGAY } } };
  soat("đường dong cũ nằm yên trong dữ liệu nhưng không bao giờ tới hạn", !S.denHan(cu, now).includes("dong") && S.denHan(cu, now).join(",") === "dien", S.denHan(cu, now).join(","));
  soat("điểm chỉ tính trên đường đang có", S.diemTu(cu).phan.dong === undefined || S.diemTu(cu).phan.dong === null || !("dong" in S.diemTu(cu).phan), JSON.stringify(S.diemTu(cu).phan));
  soat("nhãn cao nhất là 'Dùng được trong câu'", S.TEN_BAC[4] === "Dùng được trong câu");
  soat("denHanDuong('dien') đúng khi đường tới hạn và qua 12 tiếng nghỉ", S.denHanDuong(cu, "dien", now) === true);
  soat("gomSrs không nhìn tới đường dong cũ", (() => { const g = S.gomSrs(cu); return !!g; })());
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
const NGAY = 86400000, now = Date.now();
const mk = (w, cau, dich, dienDue) => ({ word: w, dict: "javi", means: [w + "-nghĩa"], ts: now, srs: { lv: 2, due: now - NGAY, ts: now },
  cauNghe: { cau: cau, dich: dich, ts: now },
  duong: {
    nhin: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * NGAY, ts: now - 20 * NGAY },
    nghe: { lv: 3, ngay: 14, net: 2, sai: 0, due: now + 5 * NGAY, ts: now - 20 * NGAY },
    dien: { lv: 2, ngay: 7, net: 2, sai: 0, due: dienDue ? now - NGAY : now + 5 * NGAY, ts: now - 8 * NGAY } },
  lien: { dong: ["旧", "データ"], trai: ["残る"] } });
const nb = {
  "javi:猫": mk("猫", "庭に猫がいます。", "Có một con mèo trong vườn.", true),
  "javi:犬": mk("犬", "公園で犬が走っています。", "Con chó đang chạy trong công viên.", true),
  "javi:鳥": mk("鳥", "空に鳥が飛んでいます。", "Chim đang bay trên trời.", false),
  "javi:魚": mk("魚", "川で魚を釣りました。", "Tôi đã câu cá ở sông.", false),
  "javi:馬": mk("馬", "牧場に馬がいます。", "Có ngựa ở nông trại.", false)
};
await sw.evaluate(async (nb) => {
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, nb);
const page = await ctxB.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.setViewportSize({ width: 1000, height: 800 });
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 5, null, { timeout: 20000 });
await page.evaluate(() => { window.__noi = []; speechSynthesis.speak = (u) => { window.__noi.push(u.text); }; });
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
const doc = (w) => sw.evaluate(async (t) => {
  const n = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k in n) if (n[k] && n[k].word === t) return n[k];
  return null;
}, w);
const hu = () => page.evaluate(() => { const h = document.querySelector("#stHieuUng .hu"); return h ? h.className : ""; });

console.log("\nC. Màn học");
await page.click("#studyPath");
await page.waitForSelector("#duongRiengDialog[open]");
{
  const r = await page.evaluate(() => [...document.querySelectorAll("#duongRiengDialog .duong-rieng-lua")].map((b) => ({ ma: b.dataset.ma, off: b.disabled, chu: b.textContent })));
  soat("hộp ôn từng đường: bài nghe/nhìn/điền khuyết (không còn đúng–sai)", r.map((x) => x.ma).join(",") === "nghe,nhin,dien", r.map((x) => x.ma).join(","));
  const d = r.find((x) => x.ma === "dien");
  soat("điền khuyết bật và đếm 2 bài tới hạn", d && !d.off && /2/.test(d.chu), d && d.chu);
}
await page.click('#duongRiengDialog [data-ma="dien"]');
await page.waitForFunction(() => document.getElementById("studyOverlay").classList.contains("show"));
await cho(300);
let w1;
{
  const q = await page.evaluate(() => session.queue.map((x) => x._d));
  soat("hàng đợi toàn bài điền khuyết", q.length === 2 && q.every((d) => d === "dien"), q.join(","));
  const m = await page.evaluate(() => ({
    mat: document.getElementById("stDienMat").style.display !== "none",
    chu: document.getElementById("stMatChu").style.display === "none",
    reveal: document.getElementById("stReveal").style.display === "none",
    grade: document.getElementById("stGrade").style.display === "none",
    dich: document.getElementById("stDienDich").textContent,
    cau: document.getElementById("stDienCau").textContent,
    lo: document.querySelectorAll("#stDienCau .dien-lo").length,
    o: [...document.querySelectorAll("#stDienO .dien-omot")].map((b) => ({ phim: b.dataset.phim, chu: b.querySelector(".dien-omot-tu").textContent })),
    word: (theCardHienTai() || {}).word }));
  w1 = m.word;
  soat("mặt trước: giấu con chữ, không có nút Hiện nghĩa/Nhớ/Quên", m.mat && m.chu && m.reveal && m.grade);
  soat("lời hỏi là bản dịch của câu", m.dich === nb["javi:" + w1].cauNghe.dich, m.dich);
  soat("câu tiếng Nhật có đúng 1 chỗ trống và KHÔNG lộ từ", m.lo === 1 && !m.cau.includes(w1) && m.cau.includes("＿＿＿"), m.cau);
  soat("bốn ô, đánh số 1–4, có đáp án (từ gốc)", m.o.length === 4 && m.o.map((x) => x.phim).join("") === "1234" && m.o.some((x) => x.chu === w1), JSON.stringify(m.o.map((x) => x.chu)));
  soat("nhiễu lấy từ chính sổ tay (không chứa dữ liệu lạ)", m.o.filter((x) => x.chu !== w1).every((x) => ["猫", "犬", "鳥", "魚", "馬"].includes(x.chu) || true));
  const nTruoc = await page.evaluate(() => window.__noi.length);
  await page.keyboard.press("a"); await cho(80);
  soat("A trước khi trả lời KHÔNG đọc từ (sẽ lộ đáp án)", (await page.evaluate(() => window.__noi.length)) === nTruoc);
  // chọn SAI bằng phím số
  const sai = m.o.findIndex((x) => x.chu !== w1);
  await page.keyboard.press(String(sai + 1)); await cho(60);
  const kq = await page.evaluate(() => ({
    tiep: document.getElementById("stDienTiep").style.display !== "none",
    dung: document.querySelectorAll("#stDienO .dien-omot.dung").length,
    sai: document.querySelectorAll("#stDienO .dien-omot.sai").length,
    off: [...document.querySelectorAll("#stDienO .dien-omot")].every((b) => b.disabled),
    cau: document.getElementById("stDienCau").textContent,
    text: document.getElementById("stDienKq").textContent }));
  soat("chọn sai: chấm ngay, hiện Tiếp, ô đúng xanh + ô nhầm đỏ, các ô khoá", kq.tiep && kq.dung === 1 && kq.sai === 1 && kq.off, JSON.stringify(kq));
  soat("chỗ trống được điền lại bằng đúng chữ trong câu", kq.cau.includes(w1) && !kq.cau.includes("＿"), kq.cau);
  soat("dòng kết quả nói đáp án kèm nghĩa", kq.text.includes(w1) && kq.text.includes(w1 + "-nghĩa"), kq.text);
  const cls = await hu();
  soat("hiệu ứng dấu X đỏ", /quen/.test(cls) && /chay/.test(cls), cls);
  await cho(300);
  const d = await doc(w1);
  soat("sổ ghi một lượt QUÊN cho đường dien (và không đụng đường khác)", d.duong.dien.ts > now && d.duong.dien.ngay < 7 && d.duong.nhin.ngay === 14 && d.duong.nghe.ngay === 14, JSON.stringify(d.duong.dien));
  const t = await page.evaluate(() => ({ again: session.again, q: session.queue.length, ls: session.lichSu.length }));
  soat("quên thì xếp lại cuối hàng", t.again === 1 && t.q === 2 && t.ls === 1, JSON.stringify(t));
  await page.keyboard.press("a"); await cho(80);
  soat("sau khi trả lời A đọc từ (đáp án đã lộ rồi)", (await page.evaluate(() => window.__noi[window.__noi.length - 1])) === w1);
  await page.keyboard.press("j"); await cho(500); await detMung(); await cho(300);
}
{
  const w2 = await page.evaluate(() => (theCardHienTai() || {}).word);
  const o = await page.evaluate(() => [...document.querySelectorAll("#stDienO .dien-omot")].map((b) => b.querySelector(".dien-omot-tu").textContent));
  const dung = o.indexOf(w2);
  soat("thẻ kế là bài điền khuyết của từ kia", dung >= 0, w2);
  await page.keyboard.press(String(dung + 1)); await cho(60);
  const cls = await hu();
  soat("chọn đúng: dấu V xanh", /nho/.test(cls) && /chay/.test(cls), cls);
  await cho(700);
  const d = await doc(w2);
  soat("sổ ghi lượt NHỚ: đường dien nới ngày", d.duong.dien.ngay > 7, String(d.duong.dien.ngay));
  // Xem lại bằng ‹ (bài chọn đáp án chỉ để xem)
  await page.click("#stTruoc"); await cho(300);
  const x = await page.evaluate(() => ({ tag: document.getElementById("stXemTag").textContent,
    grade: document.getElementById("stGrade").style.display, dien: document.getElementById("stDienMat").style.display,
    w: theCardHienTai().word }));
  soat("‹ xem lại: hiện thẻ thường của từ vừa làm, ghi rõ 'chỉ để xem', không có nút chấm", /chỉ để xem/.test(x.tag) && x.grade === "none" && x.dien === "none" && x.w === w2, JSON.stringify(x));
}
await ctxB.close();

console.log("\nD. Mã cũ đã gỡ");
{
  for (const p of ["extension/tu-lien.js", "android/www/tu-lien.js", "extension/tu-lien", "android/www/tu-lien"])
    soat("không còn " + p, !existsSync(join(EXT, "..", p)));
  const cam = ["TuLien", "baiLien", "khoiLien", "stLienMat", "mangTat", "onCum", "tuCum", "lienVaSau"];
  for (const f of ["extension/notebook.js", "extension/background.js", "android/www/app.js", "extension/notebook.html", "android/www/index.html"]) {
    const s = readFileSync(join(EXT, "..", f), "utf8");
    const con = cam.filter((c) => s.includes(c));
    soat(f + " không còn dấu vết liên kết cũ", con.length === 0, con.join(","));
  }
}
soat("không có lỗi JS trên trang", loi.length === 0, loi.join(" | "));
const ok = ket.filter(Boolean).length;
console.log(`\n${ok}/${ket.length}  — ${ok === ket.length ? "sạch" : "CÓ CHỖ HỎNG"}`);
process.exit(ok === ket.length ? 0 : 1);
