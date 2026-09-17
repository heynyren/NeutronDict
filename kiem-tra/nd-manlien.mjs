/**
 * MÀN KẾT QUẢ BÀI LIÊN KẾT — bố cục, đo trên DOM thật.
 *
 *   node kiem-tra/nd-manlien.mjs /home/user/NeutronDict/extension
 *
 * Vì sao bài này tồn tại.
 *
 * `#studyOverlay .stwrap` từng đặt `align-items: center` trên một vùng CÓ CUỘN.
 * Nội dung cao hơn khung thì phép căn giữa đẩy tràn ra CẢ HAI đầu, mà phần tràn
 * ở đầu TRÊN không cuộn tới được — nó nằm NGOÀI vùng cuộn chứ không phải ở trên
 * nó. Đo được lúc còn lỗi, màn kết quả 16 hàng trên khung 1280×800:
 *
 *     stwrap.scrollTop = 0      ← đã ở trên cùng
 *     đỉnh .stcol      = −168px
 *     đỉnh .stwrap     =   60px   → mất đứt 227px
 *     hàng đầu         =  −77px   ← người học thấy chữ bị cắt ngang
 *
 * Lỗi này không làm gì vỡ, không ném lỗi, không trượt bài kiểm nào — nó chỉ
 * lặng lẽ ăn mất mấy dòng đầu. Kiểu lỗi ấy quay lại được bất cứ lúc nào một
 * người thấy `align-items: center` trông hợp lý, nên nó cần một cái chốt.
 *
 * Bài này cũng giữ hai điều nữa:
 *   - nút Tiếp LUÔN trong tầm mắt (trước đây rơi xuống y=809 trên màn 800);
 *   - màn kết quả bày ĐỦ mọi ô, không giấu bớt từ nhiễu đi cho ngắn màn.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const CAO = 800, RONG = 1280;
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-")), {
  channel: "chromium", headless: true, viewport: { width: RONG, height: CAO },
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

await sw.evaluate(async (now) => {
  await chrome.storage.local.set({
    notebook: { "javi:試": { word: "試", dict: "javi", means: ["thử"], ts: now,
                             duong: {}, srs: { lv: 0, due: now, ts: now } } },
    decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForTimeout(1200);

/** Dựng đúng màn kết quả, qua chính `veKetQuaLien`. */
const dungManKq = () => page.evaluate(() => {
  const ov = document.getElementById("studyOverlay");
  ov.classList.add("show");
  document.getElementById("stBody").style.display = "";
  document.getElementById("stLienMat").style.display = "";
  document.getElementById("stMatChu").style.display = "none";
  const tu = ["怪しい", "グリル", "認識", "天秤", "完結する", "共振状態", "正しく", "間違って",
              "乱立", "不正確に", "財務官", "改善", "向上", "進歩", "悪化", "退化"];
  veKetQuaLien({ o: tu, dung: new Set(["間違って", "不正確に", "改善"]),
                 chon: new Set(["間違って", "認識"]) }, 1, 15300);
  // Nghĩa thật do lượt hỏi mạng điền vào; ở đây điền sẵn, có một hàng CỐ Ý dài
  // ba dòng vì chính hàng dài mới đẩy màn vượt khung.
  document.querySelectorAll(".lien-nghia").forEach((e, i) => {
    e.textContent = i === 3
      ? "đứng sát nhau một cách không có trật tự; lộn xộn; chen chúc ( các tòa nhà, các biển hiệu, các bảng quảng cáo v.v.)"
      : "nghĩa của từ này";
  });
  document.getElementById("stLienTiep").style.display = "";
  return tu.length;
});

const soO = await dungManKq();

/* ------------------------------------------------------------------ */
console.log("Không mất chữ ở đầu danh sách");
{
  const r = await page.evaluate(() => {
    const w = document.querySelector("#studyOverlay .stwrap");
    w.scrollTop = 0;
    const wr = w.getBoundingClientRect();
    const cr = document.querySelector("#studyOverlay .stcol").getBoundingClientRect();
    const h1 = document.querySelector(".lien-hang").getBoundingClientRect();
    return { scrollTop: w.scrollTop, mat: Math.round(wr.top - cr.top),
             hang1: Math.round(h1.top), colCao: Math.round(cr.height),
             khungCao: Math.round(wr.height) };
  });
  soat("nội dung CAO HƠN khung, đúng cảnh cần thử",
       r.colCao > r.khungCao, r.colCao + "px nội dung / " + r.khungCao + "px khung");
  soat("cuộn lên trên cùng thì KHÔNG có phần nào bị đẩy ra ngoài",
       r.mat <= 0, r.mat > 0 ? "mất " + r.mat + "px" : "không mất");
  soat("hàng đầu nằm trong tầm nhìn", r.hang1 > 0, "y = " + r.hang1);
}

/* ------------------------------------------------------------------ */
console.log("\nCuộn tới được cả hai đầu");
{
  const r = await page.evaluate(() => {
    const w = document.querySelector("#studyOverlay .stwrap");
    w.scrollTop = w.scrollHeight;
    const hs = document.querySelectorAll(".lien-hang");
    const cuoi = hs[hs.length - 1].getBoundingClientRect();
    return { cuoiTop: Math.round(cuoi.top), cuoiBot: Math.round(cuoi.bottom) };
  });
  soat("cuộn xuống đáy thì thấy được hàng cuối",
       r.cuoiTop >= 0 && r.cuoiBot <= 800, "y " + r.cuoiTop + "–" + r.cuoiBot);
}

/* ------------------------------------------------------------------ */
console.log("\nThanh điểm + nút Tiếp luôn trong tầm mắt");
for (const [ten, vt] of [["trên cùng", 0], ["giữa chừng", 0.5], ["dưới đáy", 1]]) {
  const r = await page.evaluate((v) => {
    const w = document.querySelector("#studyOverlay .stwrap");
    w.scrollTop = (w.scrollHeight - w.clientHeight) * v;
    const d = document.getElementById("stLienDay").getBoundingClientRect();
    const t = document.getElementById("stLienTiep").getBoundingClientRect();
    return { dTop: Math.round(d.top), dBot: Math.round(d.bottom),
             tTop: Math.round(t.top), tBot: Math.round(t.bottom) };
  }, vt);
  soat("ở vị trí " + ten + ": nút Tiếp nằm trọn trong màn",
       r.tTop >= 0 && r.tBot <= 800, "y " + r.tTop + "–" + r.tBot);
  /*
   * "Phủ kín tới mép đáy" chỉ đòi lúc thanh ĐANG DÍNH. Cuộn hết cỡ thì thanh
   * tới cuối khối chứa nó và thôi dính — đúng như position:sticky phải làm — và
   * lúc ấy phần đáy thẻ hiện ra dưới nó là chuyện bình thường, không phải hở.
   */
  if (vt < 1)
    soat("ở vị trí " + ten + ": thanh phủ kín tới mép đáy, không hở hàng nào",
         r.dBot >= 800 - 1, "đáy thanh y = " + r.dBot);
}

/* ------------------------------------------------------------------ */
console.log("\nChia nhóm mà KHÔNG giấu bớt ô nào");
{
  const r = await page.evaluate(() => ({
    nhom: [...document.querySelectorAll(".lien-nhom")]
      .map((e) => ({ chu: e.textContent, cls: e.className })),
    soHang: document.querySelectorAll(".lien-hang").length,
    // thứ tự thật trên màn
    thuTu: [...document.querySelectorAll(".lien-tu")].map((e) => e.textContent),
    sot: [...document.querySelectorAll(".lien-tu.sot")].map((e) => e.textContent),
    dung: [...document.querySelectorAll(".lien-tu.dung")].map((e) => e.textContent),
    sai: [...document.querySelectorAll(".lien-tu.sai")].map((e) => e.textContent),
    le: [...document.querySelectorAll(".lien-tu")].map((e) => Math.round(e.getBoundingClientRect().left))
  }));
  soat("bày ĐỦ cả " + soO + " ô, không giấu bớt từ nhiễu",
       r.soHang === soO, r.soHang + "/" + soO + " hàng");
  soat("có ba nhóm", r.nhom.length === 3, r.nhom.map((x) => x.chu).join(" | "));
  soat("tổng số đếm trên tiêu đề khớp số hàng",
       r.nhom.reduce((s, x) => s + parseInt((x.chu.match(/\((\d+)\)/) || [0, 0])[1], 10), 0) === soO);
  soat("nhóm đáp án lên đầu và có màu riêng",
       /dap/.test(r.nhom[0].cls) && /nham/.test(r.nhom[1].cls));
  soat("trong nhóm đáp án, BỎ SÓT xếp trước ô đã nhặt đúng",
       r.thuTu.indexOf(r.sot[0]) < r.thuTu.indexOf(r.dung[0]),
       "bỏ sót: " + r.sot.join(",") + " · nhặt đúng: " + r.dung.join(","));
  soat("ô nhặt nhầm được đánh dấu riêng", r.sai.length === 1, r.sai.join(","));
  soat("cột chữ thẳng một lề", new Set(r.le).size === 1, [...new Set(r.le)].join(","));
}

/* ------------------------------------------------------------------ */
console.log("\nLúc ĐANG LÀM BÀI thì chưa có thanh đáy");
{
  const r = await page.evaluate(() => {
    const o = document.getElementById("stLienO");
    o.classList.remove("kq");                       // đúng trạng thái veBaiLien để lại
    const d = document.getElementById("stLienDay");
    return getComputedStyle(d).display;
  });
  soat("thanh đáy ẩn khi chưa chấm", r === "none", "display: " + r);
}

/* ------------------------------------------------------------------ */
console.log("\nThẻ NGẮN vẫn căn giữa như cũ");
{
  const r = await page.evaluate(() => {
    document.getElementById("stLienMat").style.display = "none";
    document.getElementById("stMatChu").style.display = "";
    document.getElementById("stWord").textContent = "試";
    const w = document.querySelector("#studyOverlay .stwrap");
    w.scrollTop = 0;
    const wr = w.getBoundingClientRect();
    const cr = document.querySelector("#studyOverlay .stcol").getBoundingClientRect();
    return { tren: Math.round(cr.top - wr.top), duoi: Math.round(wr.bottom - cr.bottom),
             cao: Math.round(cr.height), khung: Math.round(wr.height) };
  });
  soat("thẻ thấp hơn khung, đúng cảnh cần thử", r.cao < r.khung, r.cao + " / " + r.khung);
  soat("khoảng trống trên và dưới bằng nhau — vẫn căn giữa",
       Math.abs(r.tren - r.duoi) <= 2, "trên " + r.tren + "px · dưới " + r.duoi + "px");
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
