/**
 * MÀN LÀM BÀI MẠNG NGHĨA — đề chỉ lấy từ của chính nó, ô to một cột.
 *
 *   node kiem-tra/nd-baimang.mjs /home/user/NeutronDict/extension
 *
 * Trước đây đề trộn thêm từ lấy từ cả sổ tay cho "quen mắt". Nghe xuôi, nhưng
 * nó biến một bài đáng lẽ là "phân biệt đồng với trái nghĩa của chính từ này"
 * thành "đãi mười sáu từ chẳng dính gì nhau" — dài, mệt, và phần khó nằm ở chỗ
 * ĐỌC CHO HẾT chứ không ở chỗ nhớ.
 *
 * Bốn điều chốt ở đây, và cả bốn đều hỏng ÂM THẦM nếu sai:
 *
 *   1. KHÔNG một từ nào ngoài `lien` của từ đang học lọt vào đề — kể cả khi sổ
 *      tay đầy từ khác. Lọt một từ thì bài vẫn chạy, vẫn chấm, chỉ là dài ra và
 *      người học không biết vì sao.
 *   2. Đáp án là một cực, mồi nhử là cực kia — không thiếu, không thừa.
 *   3. Mỗi ô là MỘT Ô LỚN, chạm đâu trong ô cũng ăn — nhưng TUYỆT ĐỐI KHÔNG
 *      MANG NGHĨA. Bản 4.27.0 có in nghĩa tiếng Việt dưới mỗi ô cho "dễ học", và
 *      đó là để đáp án in sẵn lên thẻ: đề hỏi "cùng nghĩa với 汁" mà 液体,
 *      リキッド, 流動体 đều ghi sẵn "chất lỏng" — chỉ cần so chuỗi tiếng Việt là
 *      xong, không cần biết một chữ tiếng Nhật nào. Bài vẫn chạy, vẫn chấm, chỉ là
 *      nó thôi đo cái gì. Nghĩa chỉ được hiện ở MÀN KẾT QUẢ, sau khi trả lời.
 *   4. Nhãn nhóm ba trên màn kết quả nói ĐÚNG chúng là gì (trái nghĩa của từ
 *      này), chứ không còn gọi là "từ nhiễu".
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

/*
 * Sổ tay CỐ Ý có nhiều từ lạ. Nếu đề còn rước từ ngoài vào thì đây là chỗ
 * chúng sẽ lọt ra — mẫu thử mà chỉ có mấy từ liên quan thì cổng số 1 xanh
 * cả khi mã vẫn sai.
 */
await sw.evaluate(async (now) => {
  const ngay = 86400000;
  const nb = {};
  const them = (w, nghia, lien, duong) => {
    nb["javi:" + w] = { word: w, dict: "javi", means: [nghia], ts: now,
      lien: lien || { dong: [], trai: [] }, duong: duong || {},
      srs: { lv: 1, due: now + 9 * ngay, ts: now } };
  };
  // Từ đang học: 3 đồng nghĩa (đáp án) + 2 trái nghĩa (mồi nhử).
  them("飲食店", "quán ăn", { dong: ["食堂", "料亭", "旗亭"], trai: ["自宅", "野宿"] },
    { nhin: { lv: 2, ngay: 7, net: 2, sai: 0, due: now - ngay, ts: now - 8 * ngay },
      dong: { lv: 1, ngay: 3, net: 2, sai: 0, due: now - ngay, ts: now - 4 * ngay } });
  for (const [w, n] of [["食堂", "buồng ăn"], ["料亭", "nhà hàng kiểu Nhật"],
                        ["旗亭", "quán trọ"], ["自宅", "nhà riêng"], ["野宿", "ngủ ngoài trời"]])
    them(w, n);
  // Mười hai từ CHẲNG DÍNH GÌ — chúng là thứ trước đây bị rước vào làm nhiễu.
  for (const [w, n] of [["やおら", "đột nhiên"], ["持ち帰る", "mang về"], ["確立", "sự xác lập"],
                        ["曖昧", "mơ hồ"], ["締切", "hạn chót"], ["含む", "bao gồm"],
                        ["逆転", "đảo ngược"], ["果물", "trái cây"], ["湿度", "độ ẩm"],
                        ["繰り返す", "lặp lại"], ["把握", "nắm bắt"], ["傾向", "xu hướng"]])
    them(w, n);
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 10, null, { timeout: 20000 });

/** Mở thẳng bài `dong` của 飲食店 qua chính `veBaiLien`. */
const moBai = () => page.evaluate(async () => {
  const it = currentActiveSet().find((x) => x.word === "飲食店");
  document.getElementById("studyOverlay").classList.add("show");
  document.getElementById("stLienMat").style.display = "";
  veBaiLien(Object.assign({}, it, { _d: "dong" }));
  await new Promise((x) => setTimeout(x, 600));
  const de = document.getElementById("stLienDe");
  return {
    de: (de.textContent || "").trim(),
    cum: ((de.querySelector(".lien-cum") || {}).textContent || "").trim(),
    o: [...document.querySelectorAll("#stLienO button")].map((b) => ({
    tu: (b.querySelector(".lien-omot-tu") || {}).textContent,
    nghia: (b.querySelector(".lien-omot-nghia") || {}).textContent || "",
    // `ca` = chữ của CẢ Ô. So nó với `tu` thì bắt được mọi kiểu nhét nghĩa vào,
    // kể cả nhét bằng một lớp khác tên.
    ca: (b.textContent || "").trim(),
    lop: b.className
  }))
  };
});

console.log("Đề ĐẢO: bày cụm, đi tìm từ gốc");
const r0 = await moBai();
const o = r0.o;
{
  const tu = o.map((x) => x.tu);
  const cum = ["食堂", "料亭", "旗亭"], moi = ["自宅", "野宿"];
  soat("cụm nằm ở ĐỀ BÀI, không phải ở ô chọn",
       cum.every((t) => r0.cum.indexOf(t) >= 0), r0.cum);
  soat("và KHÔNG từ nào trong cụm bị bày lại làm ô chọn",
       cum.every((t) => tu.indexOf(t) < 0), tu.join(" "));
  /*
   * ĐÁP ÁN CHỈ CÒN MỘT, và nó là TỪ GỐC. Đây là cả điểm của chiều đảo: hỏi
   * theo lối GỌI RA thay vì NHẬN RA.
   */
  soat("từ gốc có mặt trong các ô", tu.indexOf("飲食店") >= 0, tu.join(" "));
  soat("mồi nhử là TRÁI NGHĨA của chính nó, lấy trước từ sổ tay",
       moi.every((t) => tu.indexOf(t) >= 0), tu.join(" "));
  soat("đề gọn đúng 5 ô", o.length === 5, o.length + " ô");
}

console.log("\nMỗi ô là một Ô LỚN, chạm đâu cũng ăn — và KHÔNG có nghĩa");
{
  soat("mỗi ô mang lớp ô-lớn", o.every((x) => /lien-omot/.test(x.lop)), o[0] && o[0].lop);
  soat("mọi ô đều có con chữ", o.every((x) => !!x.tu), o.map((x) => x.tu).join(" "));
  /*
   * CỔNG CHẶN CHÍNH CỦA BÀI NÀY.
   *
   * In nghĩa ra đây là in sẵn đáp án: ba ô cùng ghi "chất lỏng" thì chỉ cần so
   * chuỗi tiếng Việt. Không có gì đỏ lên, bài vẫn chấm bình thường — chỉ là nó
   * thôi đo trí nhớ, mà điểm thì vẫn cộng đều.
   */
  soat("KHÔNG ô nào in nghĩa ra — đó là in sẵn đáp án",
       o.every((x) => !x.nghia), o.map((x) => x.tu + (x.nghia ? "=" + x.nghia : "")).join(" · "));
  soat("và cả ô không chứa chữ tiếng Việt nào", o.every((x) => x.ca === x.tu),
       o.map((x) => JSON.stringify(x.ca)).join(" "));
  /*
   * MẶT TRƯỚC KHÔNG MỘT CHỮ TIẾNG VIỆT NÀO — soi bằng NỘI DUNG THẬT.
   *
   * Cổng cũ chỉ soi tên lớp `lien-omot-nghia`. Chiều đảo có thêm hẳn một chỗ
   * rò nữa là ĐỀ BÀI, mà nghĩa nhét vào đó thì tên lớp nào cũng được. Bắt bằng
   * một biểu thức quét chữ Việt có dấu thì kiểu nhét nào cũng đỏ.
   */
  const CO_DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  soat("mặt trước: ĐỀ BÀI không một chữ Việt có dấu nào",
       !CO_DAU.test(r0.cum), JSON.stringify(r0.cum));
  soat("mặt trước: các ô cũng không",
       !o.some((x) => CO_DAU.test(x.ca)), o.map((x) => x.ca).join(" "));
  const d = await page.evaluate(() => {
    const khung = document.getElementById("stLienO");
    const b = khung.querySelector("button");
    const r = b.getBoundingClientRect();
    const rk = khung.getBoundingClientRect();
    return { cao: Math.round(r.height), rong: Math.round(r.width),
             rongKhung: Math.round(rk.width), cot: khung.className };
  });
  soat("ô cao ít nhất 56px — vừa ngón tay cái", d.cao >= 56, d.cao + "px");
  soat("và chiếm trọn chiều ngang (một cột)", d.rong >= d.rongKhung - 2,
       d.rong + "/" + d.rongKhung + "px");
  soat("khung xếp một cột", /\bto\b/.test(d.cot), d.cot);
  /*
   * Chạm vào MÉP Ô — chỗ cách con chữ xa nhất — cũng phải chọn được.
   *
   * Đây là phần lớn cú chạm trên điện thoại. Nếu ai đó sau này gắn trình xử lý
   * vào span con chữ thay vì cả nút thì nút vẫn bấm được ở giữa, chỉ mép là chết.
   */
  const an = await page.evaluate(async () => {
    const b = document.querySelector("#stLienO button");
    const r = b.getBoundingClientRect();
    const el2 = document.elementFromPoint(Math.round(r.right - 6), Math.round(r.bottom - 6));
    if (el2) el2.click();
    await new Promise((x) => setTimeout(x, 150));
    return b.classList.contains("chon");
  });
  soat("chạm vào MÉP ô cũng chọn được", an);
}

console.log("\nMàn kết quả gọi đúng tên nhóm ba");
{
  const nhan = await page.evaluate(async () => {
    for (const b of document.querySelectorAll("#stLienO button")) {
      const t = (b.querySelector(".lien-omot-tu") || {}).textContent;
      if (["食堂", "料亭", "旗亭"].indexOf(t) >= 0 && !b.classList.contains("chon")) b.click();
    }
    document.getElementById("stLienXong").click();
    await new Promise((x) => setTimeout(x, 900));
    return [...document.querySelectorAll(".lien-nhom")].map((h) => h.textContent.trim());
  });
  soat("không còn gọi là “từ nhiễu”",
       !nhan.some((x) => /nhiễu/i.test(x)), nhan.join(" | "));
  soat("mà nói rõ chúng là TRÁI NGHĨA của từ này",
       nhan.some((x) => /Trái nghĩa của từ này/.test(x)), nhan.join(" | "));
}

soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

const dat = ket.filter(Boolean).length;
console.log(`\n${dat}/${ket.length}  — ` + (dat === ket.length ? "sạch" : "CÓ CHỖ HỎNG"));
await ctx.close();
process.exit(dat === ket.length ? 0 : 1);
