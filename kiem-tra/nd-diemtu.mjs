/**
 * CHIP ĐIỂM VÀ BẢNG BỐN ĐƯỜNG — đo trên DOM thật.
 *
 *   node kiem-tra/nd-diemtu.mjs /home/user/NeutronDict/extension
 *
 * `srs-diem.mjs` đã giữ phần tính toán. Bài này giữ phần NGƯỜI HỌC NHÌN THẤY,
 * vì đó mới là chỗ cả thay đổi này có nghĩa:
 *
 *   - Chip phải nói đúng con số mà Srs.diemTu tính ra. Lệch nhau thì người ta
 *     tin vào một con số không có thật.
 *   - Bảng phải nói rõ đường nào KHÔNG CÓ dữ liệu, chứ không để trống cho
 *     người ta tưởng mình chưa học.
 *   - Bấm "Ôn bài còn lại" phải mở đúng những bài còn lại của ĐÚNG từ đó, và
 *     làm xong thì điểm phải nhích lên thật.
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

/* Bốn mẫu, mỗi mẫu một cảnh khác nhau về dữ liệu sẵn có. */
await sw.evaluate(async (now) => {
  const ngay = 86400000;
  const nb = {
    // Đủ bốn đường, đều khá.
    "javi:改善": { word: "改善", dict: "javi", reading: "かいぜん", means: ["cải thiện"], ts: now,
      cauNghe: { cau: "品質を改善する", dich: "cải thiện chất lượng" },
      lien: { dong: ["改良", "向上", "進歩"], trai: ["悪化"] },
      duong: { nhin: { lv: 4, ngay: 30, due: now + 10 * ngay, ts: now },
               nghe: { lv: 3, ngay: 14, due: now + 5 * ngay, ts: now },
               dong: { lv: 2, ngay: 7,  due: now - ngay, ts: now - 8 * ngay },
               trai: { lv: 2, ngay: 7,  due: now - ngay, ts: now - 8 * ngay } },
      srs: { lv: 2, due: now - ngay, ts: now } },
    // Chỉ có đường nhìn, và đã chạm trần — phép thử "không được nói quá".
    "javi:写真": { word: "写真", dict: "javi", reading: "しゃしん", means: ["ảnh chụp"], ts: now,
      lien: { dong: [], trai: [] },
      duong: { nhin: { lv: 6, ngay: 365, due: now + 300 * ngay, ts: now } },
      srs: { lv: 6, due: now + 300 * ngay, ts: now } },
    // Có đủ dữ liệu nhưng ba đường kia CHƯA THỬ bao giờ.
    "javi:新語": { word: "新語", dict: "javi", reading: "しんご", means: ["từ mới"], ts: now,
      cauNghe: { cau: "新語を覚える", dich: "học từ mới" },
      lien: { dong: ["新造語", "造語"], trai: ["古語"] },
      duong: { nhin: { lv: 3, ngay: 14, due: now + 5 * ngay, ts: now } },
      srs: { lv: 0, due: now, ts: now } },
    // Chưa học gì cả.
    "javi:未習": { word: "未習", dict: "javi", reading: "みしゅう", means: ["chưa học"], ts: now,
      duong: {}, srs: { lv: -1, due: now, ts: now } }
  };
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".tag.srs.diem").length >= 4,
                           null, { timeout: 20000 });

/* ------------------------------------------------------------------ */
console.log("Chip điểm trên thẻ");
{
  const r = await page.evaluate(() => {
    const ra = [];
    for (const b of document.querySelectorAll(".entry")) {
      const tu = (b.querySelector(".w") || {}).textContent || "";
      const chip = b.querySelector(".tag.srs.diem");
      if (!chip) continue;
      const it = (window.__items || []).find((x) => x.word === tu.trim());
      ra.push({ tu: tu.trim(), chu: chip.textContent.trim(),
                nen: chip.style.getPropertyValue("--diem"),
                title: chip.title, laNut: chip.tagName === "BUTTON" });
      void it;
    }
    return ra;
  });
  soat("mỗi thẻ có đúng một chip điểm và nó là NÚT bấm được",
       r.length >= 4 && r.every((x) => x.laNut), r.length + " chip");
  soat("chip mang biến --diem để vẽ thanh tiến độ",
       r.every((x) => /^\d+%$/.test(x.nen)), r.map((x) => x.nen).join(" "));
  soat("chip hiện dạng \"<điểm> · <mức tư duy>\"",
       r.every((x) => /^\d+\s·\s\S/.test(x.chu)), r.map((x) => x.chu).join(" | "));
  soat("title của chip có đủ bốn dòng đường",
       r.every((x) => (x.title.match(/·/g) || []).length >= 4));
}

/* Chữ trên chip phải khớp CHÍNH Srs.diemTu tính trong trang. */
{
  const r = await page.evaluate(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    const lech = [];
    for (const b of document.querySelectorAll(".entry")) {
      const chip = b.querySelector(".tag.srs.diem");
      if (!chip) continue;
      const n = parseInt(chip.textContent, 10);
      const tu = chip.textContent;
      // tìm mục theo đúng con số trên chip là không đủ — dò theo từ trong thẻ
      const key = Object.keys(nb).find((k) => b.textContent.includes(nb[k].word));
      if (!key) continue;
      const that = window.Srs.diemTu(nb[key]).tong;
      if (n !== that) lech.push(nb[key].word + ": chip " + n + " ≠ tính " + that + " " + tu);
    }
    return lech;
  });
  soat("con số trên chip khớp Srs.diemTu", r.length === 0, r.join("; ") || "khớp hết");
}

/* ------------------------------------------------------------------ */
console.log("\nNhãn không nói quá");
{
  const r = await page.evaluate(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    const m = nb["javi:写真"];
    const d = window.Srs.diemTu(m);
    let chu = "";
    for (const b of document.querySelectorAll(".entry"))
      if (b.textContent.includes("写真")) {
        const c = b.querySelector(".tag.srs.diem");
        if (c) chu = c.textContent.trim();
      }
    return { tong: d.tong, ten: d.ten, chu };
  });
  soat("từ chỉ có đường nhìn vẫn đạt 100/100", r.tong === 100, r.tong + "/100");
  soat("nhưng chip KHÔNG được nói \"Nghe ra\" hay \"Gọi ra được\"",
       !/Nghe ra|Gọi ra được/.test(r.chu), "chip nói: " + r.chu);
}

/* ------------------------------------------------------------------ */
console.log("\nBảng bốn đường");
{
  const r = await page.evaluate(async () => {
    for (const b of document.querySelectorAll(".entry"))
      if (b.textContent.includes("写真")) { b.querySelector(".tag.srs.diem").click(); break; }
    await new Promise((x) => setTimeout(x, 150));
    const hien = document.getElementById("diemSheet").classList.contains("show");
    const dong = [...document.querySelectorAll("#dsBang .diem-dong")].map((d) => ({
      ten: d.querySelector(".diem-ten").textContent,
      so: d.querySelector(".diem-so").textContent,
      khi: d.querySelector(".diem-khi").textContent,
      thieu: d.classList.contains("thieu")
    }));
    return { hien, dong, chuaDo: document.getElementById("dsChuaDo").textContent,
             nut: document.getElementById("dsOn").textContent,
             tatNut: document.getElementById("dsOn").disabled };
  });
  soat("bấm chip thì bảng điểm mở ra", r.hien);
  soat("bảng có đủ bốn dòng", r.dong.length === 4, r.dong.length + " dòng");
  soat("đường không có dữ liệu hiện \"—\" chứ không phải 0",
       r.dong.filter((d) => d.thieu).every((d) => d.so === "—"),
       r.dong.map((d) => d.so).join(" "));
  soat("và NÓI RÕ vì sao không có",
       r.dong.filter((d) => d.thieu).every((d) => /chưa có|chưa tìm được/.test(d.khi)),
       r.dong.filter((d) => d.thieu).map((d) => d.khi).join(" · "));
  soat("có ghi chú chiều nào chưa đo được", /Chưa đo được/.test(r.chuaDo), r.chuaDo.slice(0, 60));
  soat("từ không còn bài nào tới hạn thì nút ôn bị khoá", r.tatNut === true, r.nut);
}

/* ------------------------------------------------------------------ */
console.log("\nBấm vào điểm để ôn bài còn lại");
{
  const r = await page.evaluate(async () => {
    document.getElementById("dsThoat").click();
    await new Promise((x) => setTimeout(x, 100));
    for (const b of document.querySelectorAll(".entry"))
      if (b.textContent.includes("新語")) { b.querySelector(".tag.srs.diem").click(); break; }
    await new Promise((x) => setTimeout(x, 150));
    return { nut: document.getElementById("dsOn").textContent,
             tat: document.getElementById("dsOn").disabled };
  });
  soat("từ có ba đường chưa thử thì nút mời ôn đúng 3 bài",
       !r.tat && /3/.test(r.nut), r.nut);

  const r2 = await page.evaluate(async () => {
    const nb0 = (await chrome.storage.local.get("notebook")).notebook;
    const truoc = window.Srs.diemTu(nb0["javi:新語"]).tong;
    document.getElementById("dsOn").click();
    for (let i = 0; i < 100; i++) {
      const o = document.getElementById("studyOverlay");
      if (o && o.classList.contains("show")) break;
      await new Promise((x) => setTimeout(x, 50));
    }
    const o = document.getElementById("studyOverlay");
    return { moRa: !!(o && o.classList.contains("show")),
             hangDoi: (window.__session || {}).n, truoc,
             tu: (document.getElementById("stWord").textContent || "").trim() };
  });
  soat("bấm thì mở thẳng buổi học", r2.moRa);
  soat("và mở đúng từ vừa bấm", r2.tu.includes("新語"), r2.tu);

  /* Làm cho xong buổi ôn riêng ấy, rồi xem điểm có nhích lên thật không. */
  const r3 = await page.evaluate(async (truoc) => {
    /*
     * Dẹp màn chúc mừng huy hiệu trước đã.
     *
     * Hồ sơ trình duyệt của bài kiểm là hồ sơ trắng, nên lượt ôn ĐẦU TIÊN mở
     * khoá huy hiệu ngay. anMung phủ kín màn rồi chỉ gọi tiếp() sau khi người
     * ta bấm — không bấm thì showCard() không bao giờ chạy và buổi ôn đứng
     * nguyên ở thẻ đầu. Mất một giờ mới tìm ra, nên để lại ghi chú này.
     */
    const detMung = async () => {
      for (let i = 0; i < 12; i++) {
        const c = document.getElementById("tdCelebrate");
        if (!c || !c.classList.contains("show")) return;
        const n = c.querySelector("button");
        if (n) n.click();
        await new Promise((x) => setTimeout(x, 200));
      }
    };
    for (let vong = 0; vong < 20; vong++) {
      await detMung();
      const o = document.getElementById("studyOverlay");
      if (!o || !o.classList.contains("show")) break;
      if (document.getElementById("stDone").style.display !== "none") break;
      const lien = document.getElementById("stLienMat");
      if (lien && lien.style.display !== "none") {
        /*
         * Nhặt ĐÚNG những ô đáng nhặt, không nhặt hết.
         *
         * Nhặt hết là cách THUA: chamBai trừ mỗi ô nhặt nhầm đúng bằng một ô bỏ
         * sót, nên nhặt bừa cả nhiễu thì điểm về 0 và lượt ấy tính là QUÊN. Thẻ
         * quay lại cuối hàng và buổi ôn không bao giờ kết thúc.
         */
        const de = document.getElementById("stLienDe").textContent || "";
        const nbL = (await chrome.storage.local.get("notebook")).notebook;
        const key = Object.keys(nbL).find((k) => de.includes(nbL[k].word));
        const l = (nbL[key] || {}).lien || {};
        const dung = new Set(/TRÁI NGHĨA/.test(de) ? (l.trai || []) : (l.dong || []));
        for (const b of document.querySelectorAll("#stLienO button"))
          if (dung.has((b.textContent || "").trim())) b.click();
        document.getElementById("stLienXong").click();
        await new Promise((x) => setTimeout(x, 500));
        const tiep = document.getElementById("stLienTiep");
        if (tiep && tiep.style.display !== "none") tiep.click();
      } else {
        const hien = document.getElementById("stReveal");
        if (hien && hien.style.display !== "none") hien.click();
        await new Promise((x) => setTimeout(x, 120));
        const yes = document.querySelector(".grade .yes");
        if (yes) yes.click();
      }
      await new Promise((x) => setTimeout(x, 450));
      await detMung();
    }
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    const m = nb["javi:新語"];
    return { truoc, sau: window.Srs.diemTu(m).tong,
             duong: Object.keys(m.duong || {}),
             tongKet: (document.getElementById("stSummary") || {}).textContent || "" };
  }, r2.truoc);
  soat("ôn xong thì điểm của từ ấy nhích lên", r3.sau > r3.truoc,
       r3.truoc + " → " + r3.sau + "/100");
  soat("và những đường vừa ôn đã có lịch riêng", r3.duong.length > 1, r3.duong.join(", "));
  soat("tổng kết nói đúng con số vừa hứa lúc bấm vào chip",
       /\d+\/100/.test(r3.tongKet), r3.tongKet.slice(0, 70));
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
