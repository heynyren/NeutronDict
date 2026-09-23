/**
 * ĐỀ ĐẢO — hai chuyện chỉ chiều mới mới có.
 *
 *   node kiem-tra/nd-daomang.mjs /home/user/NeutronDict/extension
 *
 * `nd-baimang.mjs` đã chốt hình dạng đề đảo. Bài này chốt riêng hai chỗ mà
 * việc đảo chiều mở ra, và cả hai đều hỏng ÂM THẦM:
 *
 *   1. TỪ KHÔNG CÓ CỰC KIA. Chiều cũ thì đáp án là cả một cực nên luôn đủ mồi
 *      nhử. Chiều đảo thì đáp án chỉ MỘT từ — từ nào không có trái nghĩa mà
 *      không lấy thêm ở sổ tay thì đề còn đúng một ô, bấm là trúng. Bài vẫn
 *      chấm, điểm vẫn lên, chỉ là nó không còn đo cái gì.
 *
 *   2. CỤM CHUYỂN TỪ Ô SANG ĐỀ. Nút × (bỏ một từ vô lý khỏi liên kết) và
 *      + Lưu vốn đi kèm các ô. Nay cụm nằm ở đề bài, nên màn kết quả phải chủ
 *      động bày nó ra — quên thì màn vẫn đẹp, vẫn đủ nhóm đáp án, chỉ là hai
 *      chức năng ấy biến mất mà không có gì báo.
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
  const nb = {};
  const them = (w, nghia, lien) => {
    nb["javi:" + w] = { word: w, dict: "javi", means: [nghia], ts: now,
      lien: lien || { dong: [], trai: [] }, duong: {},
      srs: { lv: 1, due: now, ts: now } };
  };
  // 改善 CÓ cả hai cực.
  them("改善", "cải thiện", { dong: ["改良", "向上"], trai: ["改悪"] });
  // 飲食店 KHÔNG có trái nghĩa — đây là ca phải lấy mồi nhử ở sổ tay.
  them("飲食店", "quán ăn", { dong: ["食堂", "料亭", "旗亭"], trai: [] });
  for (const [w, n] of [["改良", "cải tiến"], ["向上", "nâng lên"], ["改悪", "sửa thành tệ hơn"],
                        ["食堂", "buồng ăn"], ["料亭", "nhà hàng kiểu Nhật"], ["旗亭", "quán trọ"]])
    them(w, n);
  for (const [w, n] of [["やおら", "đột nhiên"], ["確立", "sự xác lập"], ["曖昧", "mơ hồ"],
                        ["傾向", "xu hướng"], ["把握", "nắm bắt"], ["湿度", "độ ẩm"]])
    them(w, n);
  // Một mục lưu nguyên CÂU. Đây chính là thứ đã lọt vào đề thật, và nó vô dụng
  // làm mồi nhử: loại được ngay từ cái nhìn đầu.
  them("すみません、わざわざありがとうございます。", "xin lỗi, cảm ơn anh đã mất công");
  nb["javi:すみません、わざわざありがとうございます。"].kind = "sent";
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 12, null, { timeout: 20000 });

/** Mở đề đảo `dong` của một từ, trả về đề + các ô. */
const moBai = (tu) => page.evaluate(async (t) => {
  const it = currentActiveSet().find((x) => x.word === t);
  document.getElementById("studyOverlay").classList.add("show");
  document.getElementById("stLienMat").style.display = "";
  veBaiLien(Object.assign({}, it, { _d: "dong" }));
  await new Promise((x) => setTimeout(x, 500));
  const de = document.getElementById("stLienDe");
  return {
    cum: ((de.querySelector(".lien-cum") || {}).textContent || "").trim(),
    o: [...document.querySelectorAll("#stLienO button")]
      .map((b) => (b.querySelector(".lien-omot-tu") || {}).textContent)
  };
}, tu);

console.log("MẶT TRƯỚC không để lộ đáp án ở bất cứ đâu");
{
  const r = await page.evaluate(async () => {
    const it = currentActiveSet().find((x) => x.word === "改善");
    session = { queue: [Object.assign({}, it, { _d: "dong" })], done: 0, again: 0, deleted: 0 };
    document.getElementById("studyOverlay").classList.add("show");
    showCard();
    await new Promise((x) => setTimeout(x, 500));
    const hien = (id) => {
      const o = document.getElementById(id);
      return !!(o && o.offsetParent !== null);
    };
    return { chu: hien("stMatChu"), thaoTac: hien("stThaoTac"), ghiAm: hien("stGhiAm"),
             deBai: hien("stLienMat"),
             chuTren: (document.getElementById("stWord").textContent || "").trim() };
  });
  /*
   * CỔNG CHÍNH CỦA BẢN NÀY.
   *
   * Chiều cũ thì tiêu đề thẻ là CÂU HỎI nên hiện ra là đúng. Chiều đảo thì nó
   * là ĐÁP ÁN — và rò ở ba chỗ cùng lúc: con chữ to đùng, nút loa ĐỌC TO từ
   * gốc, "Nghe lại" mở đúng câu chứa nó, bản thu của chính mình.
   *
   * Không có gì đỏ lên nếu hỏng: bài vẫn chạy, vẫn chấm, điểm vẫn cộng — chỉ
   * là nhìn lên đầu thẻ là thấy đáp án.
   */
  soat("đề bài có hiện", r.deBai);
  soat("KHÔNG hiện con chữ + nút loa ở đầu thẻ", !r.chu, r.chu ? "đang hiện: " + r.chuTren : "đã giấu");
  soat("KHÔNG hiện hàng Mở nguồn / Hỏi Gemini / Ghi chú", !r.thaoTac);
  soat("KHÔNG hiện cụm ghi âm", !r.ghiAm);
}
{
  // Nhưng chấm xong thì trả lại đủ — chỉ giấu tới lúc đã trả lời.
  const r = await page.evaluate(async () => {
    document.querySelector("#stLienO button").click();
    await new Promise((x) => setTimeout(x, 120));
    document.getElementById("stLienXong").click();
    await new Promise((x) => setTimeout(x, 900));
    const hien = (id) => {
      const o = document.getElementById(id);
      return !!(o && o.offsetParent !== null);
    };
    return { chu: hien("stMatChu"), thaoTac: hien("stThaoTac"), ghiAm: hien("stGhiAm") };
  });
  soat("chấm xong thì trả lại con chữ", r.chu);
  soat("trả lại hàng thao tác", r.thaoTac);
  soat("và trả lại cụm ghi âm", r.ghiAm);
}

console.log("\nMồi nhử phải là TỪ, không phải câu");
{
  const r = await moBai("飲食店");
  const cauDai = r.o.filter((t) => /[。、]/.test(t || "") || (t || "").length > 14);
  soat("không ô nào là nguyên một câu", cauDai.length === 0,
       cauDai.length ? "lọt: " + cauDai.join(" | ") : r.o.join(" "));
}

console.log("\nTừ KHÔNG có cực kia thì mồi nhử lấy ở sổ tay");
{
  const r = await moBai("飲食店");
  soat("cụm vẫn ra đủ ở đề", ["食堂", "料亭", "旗亭"].every((t) => r.cum.indexOf(t) >= 0), r.cum);
  /*
   * KHÔNG CÓ LỐI LUI NÀY THÌ ĐỀ CÒN ĐÚNG MỘT Ô — bấm là trúng, và đường `dong`
   * của mọi từ không có trái nghĩa thành điểm cho không.
   */
  soat("đề vẫn đủ 5 ô dù từ không có trái nghĩa nào", r.o.length === 5, r.o.length + " ô: " + r.o.join(" "));
  soat("và từ gốc nằm trong đó", r.o.indexOf("飲食店") >= 0, r.o.join(" "));
  soat("mấy ô còn lại là từ trong sổ, không phải từ trong cụm",
       r.o.every((t) => ["食堂", "料亭", "旗亭"].indexOf(t) < 0), r.o.join(" "));
}
console.log("\nTừ CÓ cực kia thì vét trái nghĩa trước");
{
  const r = await moBai("改善");
  soat("trái nghĩa của chính nó được lấy làm mồi nhử",
       r.o.indexOf("改悪") >= 0, r.o.join(" "));
  soat("cụm không bị bày lại làm ô",
       ["改良", "向上"].every((t) => r.o.indexOf(t) < 0), r.o.join(" "));
}

console.log("\nMàn kết quả vẫn giữ nút × và + Lưu cho CỤM Ở ĐỀ");
{
  const r = await page.evaluate(async () => {
    // Trả lời SAI có chủ ý, để soi cả nhóm "Nhặt nhầm" lẫn phần cụm.
    const sai = [...document.querySelectorAll("#stLienO button")]
      .find((b) => (b.querySelector(".lien-omot-tu") || {}).textContent !== "改善");
    sai.click();
    await new Promise((x) => setTimeout(x, 150));
    document.getElementById("stLienXong").click();
    await new Promise((x) => setTimeout(x, 900));
    const nhom = [...document.querySelectorAll(".lien-nhom")].map((h) => h.textContent.trim());
    const hang = [...document.querySelectorAll(".lien-hang")].map((h) => ({
      tu: (h.querySelector(".lien-tu") || {}).textContent,
      co: !!h.querySelector(".lien-bo"),
      luu: !!h.querySelector(".chip.nho")
    }));
    return { nhom: nhom, hang: hang, kq: (document.getElementById("stLienKq") || {}).textContent };
  });
  const tim = (t) => r.hang.find((x) => x.tu === t);
  soat("có nhóm bày cụm ở đề", r.nhom.some((x) => /Cùng nghĩa với nó/.test(x)), r.nhom.join(" | "));
  /*
   * ĐÂY LÀ CỔNG THẬT của bài này: 改良 và 向上 nằm ở ĐỀ chứ không phải ở ô, nên
   * nếu màn kết quả chỉ liệt kê các ô thì chúng biến mất — cùng với nút × và
   * + Lưu của chúng.
   */
  soat("改良 (ở đề) có mặt trên màn kết quả", !!tim("改良"), r.hang.map((x) => x.tu).join(" "));
  soat("và mang nút × để bỏ khỏi liên kết", !!(tim("改良") || {}).co);
  soat("và mang nút + Lưu / Đã có", !!(tim("改良") || {}).luu);
  soat("向上 cũng vậy", !!(tim("向上") || {}).co && !!(tim("向上") || {}).luu);
  // Mồi nhử lấy từ sổ tay thì KHÔNG có nút × — chúng không nằm trong `lien`.
  const ngoai = r.hang.filter((x) => ["改善", "改良", "向上", "改悪"].indexOf(x.tu) < 0);
  soat("mồi nhử từ sổ tay thì không mọc nút ×",
       ngoai.length > 0 && ngoai.every((x) => !x.co),
       ngoai.map((x) => x.tu + (x.co ? "(có ×)" : "")).join(" "));
  soat("lời báo nói rõ tìm ra hay chưa", /Chưa ra|Tìm ra rồi/.test(r.kq || ""), r.kq);
}
{
  // Và nút × chạy THẬT: bấm là gỡ cả hai chiều, như nút × bên sổ tay.
  const truoc = await sw.evaluate(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    return (nb["javi:改善"].lien.dong || []).slice();
  });
  await page.evaluate(async () => {
    const h = [...document.querySelectorAll(".lien-hang")]
      .find((x) => (x.querySelector(".lien-tu") || {}).textContent === "改良");
    h.querySelector(".lien-bo").click();
    await new Promise((x) => setTimeout(x, 900));
  });
  const sau = await sw.evaluate(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    return { goc: (nb["javi:改善"].lien.dong || []).slice(),
             kia: ((nb["javi:改良"].lien || {}).dong || []).slice() };
  });
  soat("bấm × trên màn kết quả gỡ thật khỏi kho",
       truoc.indexOf("改良") >= 0 && sau.goc.indexOf("改良") < 0,
       JSON.stringify(truoc) + " → " + JSON.stringify(sau.goc));
  soat("và gỡ CẢ HAI CHIỀU", sau.kia.indexOf("改善") < 0, JSON.stringify(sau.kia));
}

soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

const dat = ket.filter(Boolean).length;
console.log(`\n${dat}/${ket.length}  — ` + (dat === ket.length ? "sạch" : "CÓ CHỖ HỎNG"));
await ctx.close();
process.exit(dat === ket.length ? 0 : 1);
