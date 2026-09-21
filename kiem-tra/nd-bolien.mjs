/**
 * BỎ MỘT TỪ KHỎI LIÊN KẾT — bấm thật trên DOM thật.
 *
 *   node kiem-tra/nd-bolien.mjs /home/user/NeutronDict/extension
 *
 * `lien-xep.mjs` đã chốt phần tính toán. Bài này chốt đúng ba lời hứa với
 * người học, và cả ba đều hỏng ÂM THẦM nếu sai:
 *
 *   1. "bất cứ khi nào" — nút phải có mặt ở CẢ sổ tay lẫn mặt sau thẻ học, và
 *      bấm một cái là xong, không hỏi lại.
 *   2. "không còn xuất hiện trong những bài kiểm tra sau" — từ ấy phải biến
 *      khỏi đề, và biến CẢ HAI CHIỀU: cụm ôn kèm nối hai chiều theo thiết kế,
 *      nên gỡ một phía thì hai từ vẫn bị xếp cạnh nhau hôm sau.
 *   3. "không dùng để đánh giá khả năng thuộc từ nữa" — bỏ tới dưới ngưỡng thì
 *      cả ĐƯỜNG kiểm tra ấy phải đóng, và điểm phải chia lại trên những đường
 *      còn mở. Đây là phần dễ tưởng đã xong nhất: từ biến khỏi màn hình rồi
 *      nhưng điểm vẫn tính nó thì chẳng ai nhìn ra.
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
const id = sw.url().split("/")[2];
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  const ok = await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false);
  if (ok) break;
  await new Promise((r) => setTimeout(r, 250));
}
// Nền bồi tập liên kết ngầm và sẽ đè mất mẫu thử — chặn mạng cho tất định.
await sw.evaluate(() => { self.fetch = () => Promise.reject(new Error("chặn")); });

const gieo = () => sw.evaluate(async (now) => {
  const ngay = 86400000;
  const duong = { nhin: { lv: 3, ngay: 14, net: 2.2, sai: 0, due: now + 9 * ngay, ts: now },
                  dong: { lv: 2, ngay: 7, net: 2, sai: 0, due: now - ngay, ts: now - 8 * ngay },
                  trai: { lv: 1, ngay: 3, net: 1.8, sai: 0, due: now - ngay, ts: now - 4 * ngay } };
  await chrome.storage.local.set({
    notebook: {
      "javi:改善": { word: "改善", dict: "javi", reading: "かいぜん", means: ["cải thiện"], ts: now,
        lien: { dong: ["改良", "向上"], trai: ["改悪"] }, duong: duong,
        srs: { lv: 2, due: now - ngay, ts: now } },
      // 改良 kể tên ngược lại 改善 — để soi việc gỡ có HAI CHIỀU không.
      "javi:改良": { word: "改良", dict: "javi", reading: "かいりょう", means: ["cải tiến"], ts: now,
        lien: { dong: ["改善", "向上"], trai: [] },
        duong: { nhin: { lv: 2, ngay: 7, net: 2, sai: 0, due: now + 5 * ngay, ts: now } },
        srs: { lv: 2, due: now + 5 * ngay, ts: now } },
      "javi:向上": { word: "向上", dict: "javi", means: ["nâng lên"], ts: now,
        lien: { dong: [], trai: [] },
        duong: { nhin: { lv: 2, ngay: 7, net: 2, sai: 0, due: now + 5 * ngay, ts: now } },
        srs: { lv: 2, due: now + 5 * ngay, ts: now } }
    },
    decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false }
  });
}, Date.now());

const docMuc = (w) => sw.evaluate(async (tu) => {
  const nb = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k in nb) if (nb[k] && nb[k].word === tu) return Object.assign({ _key: k }, nb[k]);
  return null;
}, w);

await gieo();
const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 3, null, { timeout: 20000 });

/** Bấm nút × của từ `chu` trên thẻ mang từ `tren`. */
const bamBo = (tren, chu) => page.evaluate(async ([a, b]) => {
  for (const e of document.querySelectorAll(".entry")) {
    const w = e.querySelector(".w");
    if (!w || !w.textContent.includes(a)) continue;
    for (const o of e.querySelectorAll(".lienmang-o")) {
      const tu = o.querySelector(".lienmang-tu");
      if (tu && tu.textContent.trim() === b) { o.querySelector(".lienmang-bo").click(); break; }
    }
    break;
  }
  await new Promise((r) => setTimeout(r, 700));
}, [tren, chu]);

/* ------------------------------------------------------------------ */
console.log("Nút có mặt và bấm là xong");
{
  const r = await page.evaluate(() => {
    for (const e of document.querySelectorAll(".entry")) {
      const w = e.querySelector(".w");
      if (!w || !w.textContent.includes("改善")) continue;
      const o = [...e.querySelectorAll(".lienmang-o")];
      return { soO: o.length,
               tu: o.map((x) => (x.querySelector(".lienmang-tu") || {}).textContent),
               coNut: o.every((x) => !!x.querySelector(".lienmang-bo")),
               mach: (o[0].querySelector(".lienmang-bo") || {}).title || "" };
    }
    return null;
  });
  soat("mỗi từ liên kết có một nút bỏ", !!r && r.coNut, r && r.tu.join(" "));
  soat("đủ cả ba từ (2 đồng + 1 trái)", r && r.soO === 3, r && r.soO + " ô");
  soat("lời mách nói rõ hậu quả", /bài kiểm tra/.test(r.mach), r.mach);
}

/* ------------------------------------------------------------------ */
console.log("\nBỏ một từ — và bỏ CẢ HAI CHIỀU");
await bamBo("改善", "向上");
{
  const a = await docMuc("改善");
  soat("từ biến khỏi tập của 改善", (a.lien.dong || []).indexOf("向上") < 0, (a.lien.dong || []).join(","));
  soat("và vào sổ đen của nó", (a.lienBo || []).indexOf("向上") >= 0, (a.lienBo || []).join(","));
  const b = await docMuc("向上");
  soat("phía bên kia cũng gỡ 改善", ((b.lien || {}).dong || []).indexOf("改善") < 0,
       JSON.stringify((b.lien || {}).dong));
  soat("và 向上 cũng ghi sổ đen 改善", (b.lienBo || []).indexOf("改善") >= 0, (b.lienBo || []).join(","));
  /*
   * 改良 KHÔNG được đụng tới. Nó vẫn kể tên 向上 trong tập của mình, và đó là
   * đánh giá riêng của cặp ấy — người học vừa bảo "改善 với 向上 vô lý", chứ
   * không nói gì về 改良.
   */
  const c = await docMuc("改良");
  soat("mục thứ ba không bị vạ lây", (c.lien.dong || []).indexOf("向上") >= 0,
       (c.lien.dong || []).join(","));
}

/* ------------------------------------------------------------------ */
console.log("\nKhông còn ra trong bài kiểm tra");
{
  const r = await page.evaluate(() => {
    const it = (window.__items || []).find(() => false);
    void it;
    const m = currentActiveSet().find((x) => x.word === "改善");
    // `dungDe` dựng đề từ chính hai tập này.
    return { dong: (m.lien.dong || []), trai: (m.lien.trai || []),
             duongCo: window.Srs.duongCo(m), denHan: window.Srs.denHan(m, Date.now()) };
  });
  soat("đề đồng nghĩa không còn ứng viên ấy", r.dong.indexOf("向上") < 0, r.dong.join(","));
  soat("đường `dong` ĐÓNG vì tập tụt dưới 2 từ", r.duongCo.indexOf("dong") < 0,
       r.duongCo.join(","));
  soat("và nó không còn được hỏi nữa", r.denHan.indexOf("dong") < 0, r.denHan.join(","));
  soat("đường trái nghĩa vẫn mở — chỉ bỏ đúng cái đã bỏ", r.duongCo.indexOf("trai") >= 0,
       r.duongCo.join(","));
}

/* ------------------------------------------------------------------ */
console.log("\nKhông còn dùng để đánh giá");
{
  const r = await page.evaluate(() => {
    const m = currentActiveSet().find((x) => x.word === "改善");
    const d = window.Srs.diemTu(m);
    // Điểm của CHÍNH mục ấy nếu từ kia còn nằm trong tập — để so hai bên.
    const cu = Object.assign({}, m, { lien: { dong: (m.lien.dong || []).concat("向上"),
                                              trai: m.lien.trai } });
    return { tong: d.tong, phan: d.phan, ten: d.ten,
             truocKhiBo: window.Srs.diemTu(cu).tong };
  });
  /*
   * `diemTu` báo đường đã đóng là `null` chứ không bỏ khoá đi — cố ý, để phiếu
   * điểm nói được "đường này KHÔNG CÓ dữ liệu" thay vì để trống cho người ta
   * tưởng mình chưa học. Cái phải chốt là nó không được TÍNH vào tổng.
   */
  soat("phần `dong` thành `null` — không còn dữ liệu", r.phan.dong === null,
       JSON.stringify(r.phan));
  soat("phần `trai` vẫn còn số thật", typeof r.phan.trai === "number", JSON.stringify(r.phan));
  /*
   * Và đây mới là chốt thật: tính tay lại tổng trên ĐÚNG những đường còn mở.
   * Nếu `dong` vẫn lén nằm trong mẫu số thì con số dưới đây lệch ngay — mà
   * nhìn vào phiếu điểm thì chẳng ai nhận ra, vì nó vẫn ra một số trông hợp lý.
   */
  const TRONG = { nhin: 30, nghe: 30, dong: 20, trai: 20 };
  let tu = 0, mau = 0;
  for (const d in r.phan) if (typeof r.phan[d] === "number") { tu += r.phan[d] * TRONG[d]; mau += TRONG[d]; }
  const tayTinh = Math.round(tu / mau);
  soat("tổng điểm chỉ chia trên những đường CÒN MỞ", r.tong === tayTinh,
       "app " + r.tong + " · tính tay " + tayTinh + " (" + r.ten + ")");
  soat("và bỏ một đường yếu thì điểm KHÔNG tụt", r.tong >= r.truocKhiBo,
       r.truocKhiBo + " → " + r.tong);
}

/* ------------------------------------------------------------------ */
console.log("\nDựng lại tập thì từ đã bỏ KHÔNG quay về");
{
  // Ép nền dựng lại: xoá `lien` rồi gọi đúng lượt bồi mà app vẫn dùng.
  const r = await page.evaluate(async () => {
    await new Promise((r2) => chrome.storage.local.get("notebook", async (o) => {
      const nb = o.notebook; delete nb["javi:改善"].lien;
      chrome.storage.local.set({ notebook: nb }, r2);
    }));
    await new Promise((r2) => chrome.runtime.sendMessage({ type: "BOI_DUONG" }, () => r2()));
    await new Promise((r2) => setTimeout(r2, 1500));
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    return nb["javi:改善"].lien || null;
  });
  soat("tập được dựng lại (hoặc vẫn trống)", true, JSON.stringify(r));
  soat("nhưng 向上 KHÔNG quay về", !r || (r.dong || []).indexOf("向上") < 0,
       JSON.stringify(r && r.dong));
}

/* ------------------------------------------------------------------ */
console.log("\nHoàn tác trả lại đúng như cũ");
await gieo();
await page.reload();
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 3, null, { timeout: 20000 });
{
  await bamBo("改善", "改悪");
  const giua = await docMuc("改善");
  soat("đã bỏ", (giua.lien.trai || []).length === 0, JSON.stringify(giua.lien.trai));
  const co = await page.evaluate(async () => {
    const b = document.querySelector("#toast .toast-nut");
    if (!b) return false;
    b.click();
    await new Promise((r) => setTimeout(r, 900));
    return true;
  });
  soat("lời nhắc có nút Hoàn tác", co);
  const sau = await docMuc("改善");
  soat("từ trở lại đúng chỗ cũ", (sau.lien.trai || []).indexOf("改悪") >= 0,
       JSON.stringify(sau.lien.trai));
  soat("và sổ đen sạch trở lại", !(sau.lienBo || []).length, JSON.stringify(sau.lienBo));
}

/* ------------------------------------------------------------------ */
console.log("\nCòn nút ở MẶT SAU THẺ HỌC nữa");
{
  /*
   * Gieo lại sao cho chỉ đường "nhin" tới hạn.
   *
   * Thẻ bài liên kết (dong/trai) KHÔNG có mặt sau để lật — nó có màn kết quả
   * riêng. Để mặc thì buổi học rơi vào thẻ ấy và bài kiểm trượt vì lý do chẳng
   * liên quan gì tới nút đang đo.
   */
  await sw.evaluate(async (now) => {
    const ngay = 86400000;
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    nb["javi:改善"].duong = {
      nhin: { lv: 2, ngay: 7, net: 2, sai: 0, due: now - ngay, ts: now - 8 * ngay },
      dong: { lv: 2, ngay: 7, net: 2, sai: 0, due: now + 9 * ngay, ts: now },
      trai: { lv: 1, ngay: 3, net: 1.8, sai: 0, due: now + 9 * ngay, ts: now }
    };
    for (const k of ["javi:改良", "javi:向上"]) {
      nb[k].duong = { nhin: { lv: 2, ngay: 7, net: 2, sai: 0, due: now + 9 * ngay, ts: now } };
    }
    await chrome.storage.local.set({ notebook: nb });
  }, Date.now());
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 3, null, { timeout: 20000 });

  const r = await page.evaluate(async () => {
    document.getElementById("study").click();
    for (let i = 0; i < 60; i++) {
      const o = document.getElementById("studyOverlay");
      if (o && o.classList.contains("show") && theCardHienTai()) break;
      await new Promise((x) => setTimeout(x, 100));
    }
    const the = theCardHienTai() || {};
    const nut = document.getElementById("stReveal");
    if (nut && nut.style.display !== "none") nut.click();
    await new Promise((x) => setTimeout(x, 400));
    const o = [...document.querySelectorAll("#stMean .lienmang-o")];
    return { tu: the.word, d: the._d, co: o.length,
             nut: o.every((x) => !!x.querySelector(".lienmang-bo")) };
  });
  soat("buổi học rơi đúng thẻ nhìn của 改善", r.tu === "改善" && r.d === "nhin",
       r.tu + "/" + r.d);
  soat("mặt sau thẻ cũng bày nút bỏ", r.co > 0 && r.nut, r.co + " ô");
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
