/**
 * ĐỒNG HỒ SRS DỪNG KHI RỜI THẺ — và cửa sổ đếm ngược đã bị gỡ.
 *
 *   node kiem-tra/nd-dongho.mjs /home/user/NeutronDict/extension
 *
 * Hai chuyện, cùng một gốc: đi đọc lại nguồn thì không nên bị phạt.
 *
 *   1. CỬA SỔ ĐẾM NGƯỢC. Chấm xong một từ có nguồn là hiện câu hỏi "mở lại
 *      nguồn nghe?" kèm đếm ngược ba giây. Mỗi thẻ có nguồn đều phải bấm thêm
 *      một lần, hoặc ngồi đợi. Một buổi trăm thẻ là trăm lần như thế.
 *
 *   2. ĐỒNG HỒ VẪN CHẠY KHI ĐI ĐỌC. `ms` sinh ra để đo THỜI GIAN TRUY XUẤT.
 *      Mở nguồn ra đọc năm phút rồi bấm Nhớ thì lượt ấy bị ghi "rất chậm"
 *      (`MS_TOI_DA` kẹp ở 60 giây), mà `T_NET.rat_cham = 0,85` thì giãn cách
 *      CO LẠI — bị phạt đúng vì đã chịu khó đi đọc lại.
 *
 * Cái thứ hai là kiểu hỏng không ai nhìn ra: không có gì đỏ, không có gì chậm,
 * chỉ là lịch ôn của những từ mình chăm nhất lại ngắn đi.
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
await sw.evaluate(() => { self.fetch = () => Promise.reject(new Error("chặn")); });

await sw.evaluate(async (now) => {
  const ngay = 86400000;
  const d = { nhin: { lv: 2, ngay: 7, net: 2, sai: 0, due: now - ngay, ts: now - 8 * ngay } };
  await chrome.storage.local.set({
    notebook: {
      // CÓ nguồn — đây là loại thẻ từng bị cửa sổ đếm ngược chặn lại.
      "javi:改善": { word: "改善", dict: "javi", means: ["cải thiện"], ts: now, duong: d,
        src: { url: "https://vi.wikipedia.org/wiki/Nhật_Bản", title: "Nguồn thử",
               sel: "改善する" },
        srs: { lv: 2, due: now - ngay, ts: now } },
      "javi:向上": { word: "向上", dict: "javi", means: ["nâng lên"], ts: now, duong: d,
        srs: { lv: 2, due: now - ngay, ts: now } }
    },
    decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false }
  });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 2, null, { timeout: 20000 });

console.log("Cửa sổ đếm ngược đã bị gỡ");
{
  const r = await page.evaluate(() => ({
    hoi: !!document.getElementById("stHoiNguon"),
    daNghe: !!document.getElementById("stDaNghe"),
    dem: !!document.getElementById("stDem"),
    ham: typeof window.hoiNguon,
    go: typeof window.goHoiNguon
  }));
  soat("không còn ô #stHoiNguon trong trang", !r.hoi);
  soat("không còn #stDaNghe và #stDem", !r.daNghe && !r.dem);
  soat("và không còn hàm hoiNguon / goHoiNguon",
       r.ham === "undefined" && r.go === "undefined", r.ham + " / " + r.go);
}

console.log("\nChấm một thẻ CÓ NGUỒN thì đi thẳng sang thẻ kế");
{
  const r = await page.evaluate(async () => {
    /*
     * DỰNG BUỔI HỌC TẤT ĐẮNH trên đúng thẻ CÓ NGUỒN, rồi mới chấm.
     *
     * Bấm nút Học thì thứ tự hàng đợi do `hangDoiKhoi` quyết, và thẻ rơi vào
     * đầu có thể là từ không có nguồn — lúc đó khẳng định dưới chẳng chứng
     * minh được gì, vì cửa sổ cũ vốn cũng chỉ hiện với mục có nguồn.
     */
    const goc = currentActiveSet().find((x) => x.word === "改善");
    session = { queue: [Object.assign({}, goc, { _d: "nhin" }),
                        Object.assign({}, currentActiveSet().find((x) => x.word === "向上"),
                                      { _d: "nhin" })],
                done: 0, again: 0, deleted: 0 };
    document.getElementById("studyOverlay").classList.add("show");
    showCard();
    await new Promise((x) => setTimeout(x, 150));
    const tu = (theCardHienTai() || {}).word;
    const coNguon = !!((theCardHienTai() || {}).src || {}).url;
    document.getElementById("stReveal").click();
    await new Promise((x) => setTimeout(x, 150));
    document.querySelector(".grade .yes").click();
    await new Promise((x) => setTimeout(x, 800));
    return { tuVuaCham: tu, coNguon: coNguon,
             conThe: !!theCardHienTai(),
             xong: document.getElementById("stDone").style.display !== "none" };
  });
  soat("vừa chấm đúng thẻ CÓ NGUỒN", r.tuVuaCham === "改善" && r.coNguon,
       r.tuVuaCham + (r.coNguon ? " (có nguồn)" : " (KHÔNG nguồn)"));
  /*
   * Không có cửa sổ nào chen vào: hoặc đã sang thẻ kế, hoặc buổi học kết thúc.
   * Trước đây ở đây sẽ là màn hỏi, và cả hai điều dưới đều sai.
   */
  soat("không bị chặn lại — sang thẳng thẻ kế hoặc kết thúc", r.conThe || r.xong,
       r.conThe ? "đã sang thẻ kế" : "buổi học xong");
}

console.log("\nMở nguồn thì ĐỒNG HỒ DỪNG");
{
  const r = await page.evaluate(async () => {
    // Bắt openSource lại: không để nó mở tab thật giữa bài kiểm.
    const that = window.openSource;
    let goi = 0;
    window.openSource = function (it, chiaDoi) { goi++; dungDongHo(); void chiaDoi; void it; };
    void that;

    // Dựng lại một buổi học trên đúng thẻ có nguồn.
    const it = currentActiveSet().find((x) => x.word === "改善");
    session = { queue: [Object.assign({}, it, { _d: "nhin" })], done: 0, again: 0, deleted: 0 };
    document.getElementById("studyOverlay").classList.add("show");
    showCard();
    await new Promise((x) => setTimeout(x, 120));

    const tre = () => new Promise((x) => setTimeout(x, 700));
    await tre();                       // 0,7 giây "suy nghĩ" TRƯỚC khi mở nguồn
    window.openSource(theCardHienTai(), true);
    const dungTai = msDaDung;
    await tre(); await tre(); await tre();   // rồi 2,1 giây "đang đọc nguồn"
    const sauKhiDoc = msDaDung;
    return { goi: goi, dungTai: dungTai, sauKhiDoc: sauKhiDoc };
  });
  soat("openSource có chạy", r.goi === 1, r.goi + " lượt");
  soat("đồng hồ dừng ngay lúc mở nguồn", r.dungTai !== null && r.dungTai >= 600 && r.dungTai < 1500,
       r.dungTai + "ms");
  /*
   * VÀ KHÔNG NHÚC NHÍCH THÊM. Đây mới là cổng thật: đọc nguồn 2,1 giây nữa mà
   * con số vẫn y nguyên, tức là thời gian đọc KHÔNG bị tính vào lượt chấm.
   */
  soat("đọc thêm 2,1 giây nữa thì con số VẪN Y NGUYÊN", r.dungTai === r.sauKhiDoc,
       r.dungTai + " → " + r.sauKhiDoc + "ms");
}
{
  // Và `ms` ghi xuống kho đúng bằng mốc đã dừng, chứ không phải cả quãng đọc.
  const r = await page.evaluate(async () => {
    const truoc = msDaDung;
    document.getElementById("stReveal").click();
    await new Promise((x) => setTimeout(x, 150));
    document.querySelector(".grade .yes").click();
    await new Promise((x) => setTimeout(x, 900));
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    return { truoc: truoc, ms: ((nb["javi:改善"].duong || {}).nhin || {}).ms };
  });
  soat("lượt chấm ghi xuống ĐÚNG mốc đã dừng, không tính giờ đọc",
       r.ms > 0 && Math.abs(r.ms - r.truoc) < 400, "dừng ở " + r.truoc + "ms, ghi " + r.ms + "ms");
  /*
   * Và quan trọng hơn con số: nó nằm DƯỚI ngưỡng "rất chậm". Không dừng đồng
   * hồ thì quãng đọc đẩy nó lên sát MS_TOI_DA = 60.000, và `T_NET.rat_cham`
   * làm giãn cách co lại.
   */
  soat("nên không bị chấm là “rất chậm”", r.ms < 12000, r.ms + "ms < 12.000ms");
}

soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

const dat = ket.filter(Boolean).length;
console.log(`\n${dat}/${ket.length}  — ` + (dat === ket.length ? "sạch" : "CÓ CHỖ HỎNG"));
await ctx.close();
process.exit(dat === ket.length ? 0 : 1);
