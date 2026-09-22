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
 *   3. Mỗi ô là MỘT Ô LỚN mang cả con chữ lẫn nghĩa, và chạm đâu trong ô cũng
 *      ăn. Đây là chỗ dễ hỏng nhất khi ai đó sửa DOM: nút vẫn bấm được ở giữa
 *      mà mép ô thì không, và trên điện thoại thì đó là phần lớn cú chạm.
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
  return [...document.querySelectorAll("#stLienO button")].map((b) => ({
    tu: (b.querySelector(".lien-omot-tu") || {}).textContent,
    nghia: (b.querySelector(".lien-omot-nghia") || {}).textContent,
    lop: b.className
  }));
});

console.log("Đề CHỈ lấy từ của chính từ đang học");
const o = await moBai();
{
  const tu = o.map((x) => x.tu);
  const dapAn = ["食堂", "料亭", "旗亭"], moi = ["自宅", "野宿"];
  soat("bày đủ 3 đáp án", dapAn.every((t) => tu.indexOf(t) >= 0), tu.join(" "));
  soat("và đủ 2 mồi nhử là TRÁI NGHĨA của chính nó",
       moi.every((t) => tu.indexOf(t) >= 0), tu.join(" "));
  /*
   * CỔNG CHÍNH. Sổ tay có 12 từ chẳng dính gì; không từ nào được lọt vào.
   */
  const vonCo = new Set(dapAn.concat(moi));
  const ngoai = tu.filter((t) => !vonCo.has(t));
  soat("KHÔNG một từ ngoài nào lọt vào đề", ngoai.length === 0,
       ngoai.length ? "lọt: " + ngoai.join(" ") : tu.length + " ô, sạch");
  soat("nên đề gọn đúng 5 ô thay vì mười mấy", o.length === 5, o.length + " ô");
}

console.log("\nMỗi ô là một Ô LỚN, có nghĩa, chạm đâu cũng ăn");
{
  soat("mỗi ô mang lớp ô-lớn", o.every((x) => /lien-omot/.test(x.lop)), o[0] && o[0].lop);
  soat("và mang cả con chữ lẫn nghĩa tiếng Việt",
       o.every((x) => x.tu && x.nghia && x.nghia !== "…" && x.nghia !== "—"),
       o.map((x) => x.tu + "=" + x.nghia).join(" · ").slice(0, 90));
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
  // Chạm vào Ô NGHĨA — phần mép dưới — cũng phải chọn được ô.
  const an = await page.evaluate(async () => {
    const b = document.querySelector("#stLienO button");
    b.querySelector(".lien-omot-nghia").click();
    await new Promise((x) => setTimeout(x, 150));
    return b.classList.contains("chon");
  });
  soat("chạm vào dòng NGHĨA cũng chọn được ô", an);
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
