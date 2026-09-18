/**
 * NÚT HỎI GEMINI — bấm thật trên DOM thật.
 *
 *   node kiem-tra/nd-gemini.mjs /home/user/NeutronDict/extension
 *
 * `gemini-hoi.mjs` đã giữ phần dựng chuỗi. Bài này giữ phần NỐI DÂY, tức đúng
 * ba chỗ mà bài kia không với tới được và hỏng thì cũng chẳng có gì đỏ:
 *
 *   1. Nút có mặt ở CẢ HAI chỗ người học đứng — sổ tay và buổi học.
 *   2. Bấm vào thì mở đúng Gemini, với câu hỏi của ĐÚNG mục đang đứng. Lấy
 *      nhầm mục là loại lỗi tệ nhất ở đây: trang Gemini vẫn mở ra, câu hỏi vẫn
 *      đọc được, chỉ là nó hỏi về một từ khác.
 *   3. Bản ĐẦY ĐỦ được chép vào bộ nhớ tạm. Đây là đường lui khi Gemini không
 *      tự điền hoặc câu hỏi bị rút bớt — mất nó thì người học mất trắng phần
 *      ngữ cảnh mà chẳng ai báo.
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

await sw.evaluate(async (now) => {
  const ngay = 86400000;
  const nb = {
    // Mục ĐỦ dữ kiện — cái đáng đem đi hỏi.
    "javi:改善": { word: "改善", dict: "javi", reading: "かいぜん",
      means: ["cải thiện", "cải tiến"], note: "hay gặp trong báo cáo",
      lien: { dong: ["改良"], trai: ["改悪"] },
      cauNghe: { cau: "品質の改善に取り組む。", dich: "Nỗ lực cải thiện chất lượng." },
      src: { url: "https://vidu.test/kaizen", title: "Kaizen",
             sel: "工場では毎日、品質の改善が話し合われている。" },
      duong: { nhin: { lv: 4, ngay: 30, due: now + 10 * ngay, ts: now } },
      srs: { lv: 4, due: now + 10 * ngay, ts: now }, ts: now },
    // Mục TRƠ — chưa có ngữ cảnh nào. Phải không bịa ra ngữ cảnh cho nó.
    "javi:写真": { word: "写真", dict: "javi", reading: "しゃしん", means: ["ảnh chụp"],
      lien: { dong: [], trai: [] },
      duong: { nhin: { lv: 2, ngay: 7, due: now - ngay, ts: now - 8 * ngay } },
      srs: { lv: 2, due: now - ngay, ts: now }, ts: now }
  };
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 2,
                           null, { timeout: 20000 });

/*
 * Chặn hai đường ĐI RA: mở tab thật thì trang Gemini đòi đăng nhập, còn ghi bộ
 * nhớ tạm thật thì đọc lại được hay không tuỳ quyền của từng máy chạy. Thay
 * bằng cái bẫy ghi lại, rồi soi chính cái bị ghi.
 */
await page.evaluate(() => {
  window.__bay = { tab: [], chep: [] };
  chrome.tabs.create = (o) => { window.__bay.tab.push(o.url); return Promise.resolve({ id: 1 }); };
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: (t) => { window.__bay.chep.push(t); return Promise.resolve(); } }
  });
});

/*
 * Bấm nút Gemini của thẻ mang từ `tu`, rồi trả về cái bẫy đã ghi được.
 *
 * Khớp CHỨA chứ không so bằng: nền tự bồi furigana cho mục tiếng Nhật, và lúc
 * đó `.w` mang ruby — textContent của nó thành "改善かいぜん" chứ không còn là
 * "改善". So bằng thì bài này trượt đúng vào lúc nền chạy xong, tức là lúc nào
 * cũng có thể, mà thông báo lỗi lại đọc ra như thể cái nút hỏng.
 */
const bamTu = (tu) => page.evaluate(async (t) => {
  window.__bay.tab.length = 0; window.__bay.chep.length = 0;
  for (const e of document.querySelectorAll(".entry")) {
    const w = e.querySelector(".w");
    if (w && w.textContent.includes(t)) { e.querySelector(".iconbtn.gemini").click(); break; }
  }
  await new Promise((x) => setTimeout(x, 400));
  return { tab: window.__bay.tab.slice(), chep: window.__bay.chep.slice() };
}, tu);

const q = (u) => {
  const i = u.indexOf("?q=");
  return i < 0 ? "" : decodeURIComponent(u.slice(i + 3));
};

/* ------------------------------------------------------------------ */
console.log("Nút trong sổ tay");
{
  const co = await page.evaluate(() => {
    const ra = [];
    for (const e of document.querySelectorAll(".entry")) {
      ra.push({ tu: (e.querySelector(".w") || {}).textContent.trim(),
                nut: !!e.querySelector(".iconbtn.gemini"),
                mach: (e.querySelector(".iconbtn.gemini") || {}).title || "" });
    }
    return ra;
  });
  soat("mọi thẻ trong sổ đều có nút", co.length >= 2 && co.every((x) => x.nut),
       co.map((x) => x.tu + (x.nut ? "✓" : "✗")).join(" "));
  soat("nút có lời mách nói rõ là kèm ngữ cảnh",
       co[0].mach.includes("Gemini") && co[0].mach.includes("ngữ cảnh"), co[0].mach);
}
{
  const r = await bamTu("改善");
  soat("bấm vào là mở đúng một tab", r.tab.length === 1, r.tab.length + " tab");
  const u = r.tab[0] || "", c = q(u);
  soat("tab trỏ tới Gemini", u.indexOf("https://gemini.google.com/app?q=") === 0, u.slice(0, 44));
  soat("câu hỏi nói về ĐÚNG từ vừa bấm", c.indexOf("改善") >= 0 && c.indexOf("写真") < 0);
  soat("kèm câu bôi đen lúc lưu", c.indexOf("工場では毎日") >= 0);
  soat("kèm câu ví dụ của bài nghe", c.indexOf("品質の改善に取り組む。") >= 0);
  soat("kèm nghĩa đang lưu", c.indexOf("cải thiện; cải tiến") >= 0);
  soat("kèm ghi chú tự viết", c.indexOf("hay gặp trong báo cáo") >= 0);
  soat("kèm đồng nghĩa và trái nghĩa", c.indexOf("改良") >= 0 && c.indexOf("改悪") >= 0);
  soat("kèm nguồn", c.indexOf("https://vidu.test/kaizen") >= 0);
  soat("kèm điểm thật do Srs tính", /\d+\/100/.test(c), (c.match(/\d+\/100[^\n]*/) || [""])[0]);
  soat("có phần hỏi ở cuối", c.indexOf("HÃY TRẢ LỜI") >= 0);
  soat("bản ĐẦY ĐỦ được chép vào bộ nhớ tạm", r.chep.length === 1 && r.chep[0].indexOf("改善") >= 0,
       (r.chep[0] || "").length + " ký tự");
  soat("chép TRƯỚC khi mở tab — mở trước thì tab mới cướp tiêu điểm và trình duyệt từ chối ghi",
       r.chep.length === 1 && r.tab.length === 1);
}
{
  // Mục trơ: không được bịa ra ngữ cảnh, và cũng không được lấy nhầm của mục kia.
  const c = q((await bamTu("写真")).tab[0] || "");
  soat("mục trơ: hỏi đúng từ của nó", c.indexOf("写真") >= 0 && c.indexOf("改善") < 0);
  soat("mục trơ: nói thẳng là chưa có ngữ cảnh", c.indexOf("CHƯA lưu được câu ngữ cảnh") >= 0);
  soat("mục trơ: KHÔNG mượn ngữ cảnh của mục khác", c.indexOf("工場では毎日") < 0);
}

/* ------------------------------------------------------------------ */
console.log("\nNút trong buổi học");
{
  const r = await page.evaluate(async () => {
    document.getElementById("study").click();
    for (let i = 0; i < 60; i++) {
      const o = document.getElementById("studyOverlay");
      if (o && o.classList.contains("on") && theCardHienTai()) break;
      await new Promise((x) => setTimeout(x, 100));
    }
    const b = document.getElementById("stGemini");
    return { co: !!b, hien: !!b && getComputedStyle(b).display !== "none",
             tu: (theCardHienTai() || {}).word || "",
             chu: b ? b.textContent.trim() : "" };
  });
  soat("thẻ học có nút", r.co && r.hien, r.chu);
  soat("và đang đứng ở một thẻ thật", !!r.tu, r.tu);

  const r2 = await page.evaluate(async () => {
    window.__bay.tab.length = 0; window.__bay.chep.length = 0;
    // Chữ trên thẻ cũng mang ruby được, nên lấy từ GỐC trong mục chứ không đọc
    // chữ trên màn rồi đem đi so.
    const tu = (theCardHienTai() || {}).word || "";
    document.getElementById("stGemini").click();
    await new Promise((x) => setTimeout(x, 400));
    return { tu: tu, tab: window.__bay.tab.slice(), chep: window.__bay.chep.slice() };
  });
  soat("bấm trong buổi học cũng mở Gemini",
       r2.tab.length === 1 && r2.tab[0].indexOf("gemini.google.com") > 0);
  const c2 = q(r2.tab[0] || "");
  soat("và hỏi về ĐÚNG thẻ đang mở", c2.indexOf(r2.tu) >= 0, r2.tu);
  soat("buổi học cũng chép bản đầy đủ", r2.chep.length === 1);
  soat("câu hỏi trong buổi học cũng đủ phần hỏi", c2.indexOf("HÃY TRẢ LỜI") >= 0);
}

/* ------------------------------------------------------------------ */
console.log("\nĐộ dài đường dẫn");
{
  const n = await page.evaluate(() => Math.max(...window.__bay.tab.map((u) => u.length), 0));
  soat("mọi đường dẫn vừa mở đều dưới 8 KiB", n > 0 && n < 8000, n + " ký tự");
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
