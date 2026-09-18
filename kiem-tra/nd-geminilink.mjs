/**
 * NHẶT LẠI LINK ĐOẠN CHAT GEMINI — đo trên extension thật.
 *
 *   node kiem-tra/nd-geminilink.mjs /home/user/NeutronDict/extension
 *
 * Gemini đòi đăng nhập nên không thử được với trang thật. Nhưng cơ chế thì thử
 * được trọn vẹn: dựng một trang GIẢ ở đúng `https://gemini.google.com/app`, cho
 * nó `history.pushState` sang `/app/<mã>` y như Gemini làm, rồi xem nền có bắt
 * được không. Đó là toàn bộ phần mã của kho này; phần còn lại là chuyện Gemini
 * có đổi cách đổi địa chỉ hay không, và đó là lý do có đường dán tay.
 *
 * Bốn thứ bài này canh, và cả bốn đều hỏng ÂM THẦM:
 *
 *   1. BẮT ĐƯỢC và ghi vào ĐÚNG mục. Ghi nhầm mục thì nút Mở vẫn hiện, vẫn bấm
 *      được, chỉ là nó dẫn tới đoạn chat của một từ khác.
 *   2. KHÔNG ghi bừa. Trang `/app` trơn là trang vừa mở, chưa hỏi gì — ghi nó
 *      vào là bấm Mở ra một ô chat trống.
 *   3. Bảng chờ nằm trong `chrome.storage.local`, KHÔNG phải biến của tệp nền.
 *      Service worker MV3 chết sau ~30 giây nhàn rỗi, mà người ta ngồi đọc
 *      Gemini vài phút — để trong biến thì mọi thứ vẫn chạy, chỉ là link không
 *      bao giờ được ghi.
 *   4. Khối ghi chú hiện link KỂ CẢ khi mục chưa có ghi chú nào.
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

/* Trang GIẢ, tĩnh. Việc đổi địa chỉ do chính bài kiểm làm — xem `hoi()`. */
await ctx.route("https://gemini.google.com/**", (r) =>
  r.fulfill({ contentType: "text/html; charset=utf-8",
              body: `<!doctype html><meta charset="utf-8"><title>Gemini (giả)</title><body><p>trang giả</p>` }));

await sw.evaluate(async (now) => {
  await chrome.storage.local.set({
    notebook: {
      "javi:改善": { word: "改善", dict: "javi", reading: "かいぜん", means: ["cải thiện"],
        note: "hay gặp trong báo cáo", lien: { dong: [], trai: [] },
        duong: { nhin: { lv: 2, ngay: 7, due: now + 9e8, ts: now } }, ts: now },
      // Mục KHÔNG có ghi chú — chốt cho việc khối ghi chú vẫn phải hiện ra.
      "javi:写真": { word: "写真", dict: "javi", reading: "しゃしん", means: ["ảnh chụp"],
        lien: { dong: [], trai: [] },
        duong: { nhin: { lv: 2, ngay: 7, due: now + 9e8, ts: now } }, ts: now }
    },
    decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false }
  });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 2, null, { timeout: 20000 });
/*
 * Bẫy bộ nhớ tạm — máy chạy bài kiểm không cho đọc/ghi thật.
 *
 * Phải cắm LẠI sau mỗi lần nạp lại trang: `Object.defineProperty` sống trên
 * đối tượng `navigator` của lần nạp ấy, nạp lại là mất. Quên cắm lại thì phần
 * dán tay báo "không đọc được bộ nhớ tạm" và trông y như một lỗi thật.
 */
async function camBay() {
  await page.evaluate(() => {
    window.__chep = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (t) => { window.__chep.push(t); return Promise.resolve(); },
               readText: () => Promise.resolve(window.__dan || "") }
    });
  });
}
await camBay();

const bamGemini = (t) => page.evaluate((tu) => {
  for (const e of document.querySelectorAll(".entry")) {
    const w = e.querySelector(".w");
    if (w && w.textContent.includes(tu)) { e.querySelector(".iconbtn.gemini").click(); break; }
  }
}, t);

/**
 * Bấm Hỏi Gemini, rồi ĐÓNG VAI Gemini trong đúng cái tab nền vừa mở.
 *
 * Phải tự lái tab ấy chứ không để nó tự nạp trang giả: `ctx.route` chỉ bắt
 * được những trang Playwright đã gắn vào, mà tab do `chrome.tabs.create` sinh
 * ra thì lượt nạp đầu đã chạy xong trước lúc gắn — nó thành trang lỗi mạng,
 * và bài kiểm trượt vì lý do chẳng liên quan gì tới thứ đang đo.
 *
 * Thứ đang đo là NỀN có bắt được lượt đổi địa chỉ hay không. Lượt đổi ấy y hệt
 * nhau dù ai gọi `pushState` — đã dò riêng: `tabs.onUpdated` nổ với `info.url`
 * là địa chỉ mới.
 *
 * @param {string} [ma] mã đoạn chat. Bỏ trống = đứng yên ở `/app` trơn.
 * @returns {Promise<import("playwright").Page>} tab ấy, để chỗ gọi tự đóng.
 */
async function hoi(tu, ma) {
  const [pg] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 20000 }),
    bamGemini(tu)
  ]);
  await pg.goto("https://gemini.google.com/app").catch(() => {});
  if (ma) await pg.evaluate((m) => history.pushState({}, "", "/app/" + m), ma);
  await new Promise((r) => setTimeout(r, 900));
  return pg;
}
const docMuc = (k) => sw.evaluate(async (key) =>
  ((await chrome.storage.local.get("notebook")).notebook || {})[key], k);

/* ------------------------------------------------------------------ */
console.log("Bắt được link đoạn chat");
{
  (await hoi("改善", "abc123")).close();
  const m = await docMuc("javi:改善");
  soat("mục được ghi link", !!(m && m.hoiAi && m.hoiAi.url), (m && m.hoiAi && m.hoiAi.url) || "(trống)");
  soat("link đúng đoạn chat vừa mở", !!(m.hoiAi && /\/app\/abc123$/.test(m.hoiAi.url)), m.hoiAi && m.hoiAi.url);
  soat("có mốc thời gian", !!(m.hoiAi && m.hoiAi.ts > 0));
  soat("KHÔNG đụng tới ghi chú tự viết", m.note === "hay gặp trong báo cáo", m.note);
  const kia = await docMuc("javi:写真");
  soat("mục khác KHÔNG bị ghi lây", !(kia && kia.hoiAi));
}
{
  // Bảng chờ phải được dọn sau khi ghi xong, không để nằm lại chiếm chỗ.
  const cho = await sw.evaluate(async () => (await chrome.storage.local.get("geminiCho")).geminiCho || {});
  soat("bảng chờ đã dọn mục vừa xong", Object.keys(cho).length === 0,
       JSON.stringify(cho).slice(0, 60));
}

/* ------------------------------------------------------------------ */
console.log("\nBảng chờ sống ngoài service worker");
{
  /*
   * Nếu bảng chờ nằm trong biến của tệp nền thì nó bay mất cùng service
   * worker, và triệu chứng rất dễ đọc nhầm: mọi thứ vẫn chạy, chỉ là link
   * không bao giờ được ghi. Chốt bằng cách nhìn thẳng vào kho.
   */
  // Lần này KHÔNG pushState: tab đứng yên ở `/app` trơn, và để MỞ để mục chờ
  // còn nằm đó cho phần dưới soi.
  const tabCho = await hoi("写真");
  const cho = await sw.evaluate(async () => (await chrome.storage.local.get("geminiCho")).geminiCho || {});
  const ds = Object.values(cho);
  soat("mục chờ nằm trong chrome.storage.local", ds.length === 1, JSON.stringify(cho).slice(0, 80));
  soat("và nhớ đúng khoá của mục đang hỏi", ds.length === 1 && ds[0].key === "javi:写真",
       ds.length ? ds[0].key : "(trống)");

  const m = await docMuc("javi:写真");
  soat("trang /app TRƠN thì KHÔNG ghi gì — chưa hỏi thì chưa có đoạn chat",
       !(m && m.hoiAi), JSON.stringify(m && m.hoiAi));

  // Đóng tab mà chưa hỏi gì thì mục chờ phải được dọn, đừng để nằm lại.
  await tabCho.close();
  await new Promise((r) => setTimeout(r, 500));
  const sau = await sw.evaluate(async () => (await chrome.storage.local.get("geminiCho")).geminiCho || {});
  soat("đóng tab thì mục chờ được dọn theo", Object.keys(sau).length === 0,
       JSON.stringify(sau).slice(0, 60));
}

/* ------------------------------------------------------------------ */
console.log("\nKhông ghi bừa");
{
  // Địa chỉ khác hẳn: nền phải bỏ qua, và mục chờ vẫn còn nguyên để đợi tiếp.
  const p2 = await ctx.newPage();
  await ctx.route("https://vidu.test/**", (r) =>
    r.fulfill({ contentType: "text/html; charset=utf-8", body: "<!doctype html><body>khác" }));
  await p2.goto("https://vidu.test/a");
  await new Promise((r) => setTimeout(r, 600));
  const m = await docMuc("javi:写真");
  soat("trang lạ không làm nền ghi gì", !(m && m.hoiAi));
  await p2.close();
}

/* ------------------------------------------------------------------ */
console.log("\nHỏi lại thì ĐÈ lên link cũ");
{
  (await hoi("改善", "xyz789")).close();
  const m = await docMuc("javi:改善");
  soat("link mới thay chỗ link cũ", !!(m.hoiAi && /xyz789$/.test(m.hoiAi.url)), m.hoiAi && m.hoiAi.url);
  soat("chỉ giữ MỘT link, không thành danh sách", typeof m.hoiAi === "object" && !Array.isArray(m.hoiAi));
}

/* ------------------------------------------------------------------ */
console.log("\nHiện ra trong khối ghi chú");
{
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 2, null, { timeout: 20000 });
  await camBay();
  const r = await page.evaluate(() => {
    const ra = {};
    for (const e of document.querySelectorAll(".entry")) {
      const w = (e.querySelector(".w") || {}).textContent || "";
      const h = e.querySelector(".mynote .hoiai");
      ra[w.includes("改善") ? "coLink" : "khongLink"] = {
        coKhoi: !!e.querySelector(".mynote"),
        coHang: !!h,
        nhan: h ? (h.querySelector(".nhan") || {}).textContent : "",
        nut: h ? (h.querySelector("button") || {}).textContent : "",
        title: h ? (h.querySelector("button") || {}).title : ""
      };
    }
    return ra;
  });
  soat("mục có link thì hiện hàng link", r.coLink && r.coLink.coHang, JSON.stringify(r.coLink));
  soat("nhãn nói rõ là Gemini và có ngày", /Gemini/.test(r.coLink.nhan) && /\d/.test(r.coLink.nhan),
       r.coLink.nhan);
  soat("nút Mở trỏ đúng đường link", /xyz789/.test(r.coLink.title || ""), r.coLink.title);
  soat("mục chưa có link thì không bày hàng thừa", !r.khongLink.coHang);
}
{
  // Mục KHÔNG có ghi chú mà CÓ link: khối vẫn phải dựng, nếu không thì link
  // coi như mất mà chẳng có gì báo. Đây là điều kiện `coGhiChu` sinh ra để chữa.
  await sw.evaluate(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook;
    nb["javi:写真"] = Object.assign({}, nb["javi:写真"],
      { hoiAi: { url: "https://gemini.google.com/app/zzz", ts: Date.now() } });
    delete nb["javi:写真"].note;
    await chrome.storage.local.set({ notebook: nb });
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 2, null, { timeout: 20000 });
  await camBay();
  const r = await page.evaluate(() => {
    for (const e of document.querySelectorAll(".entry")) {
      const w = (e.querySelector(".w") || {}).textContent || "";
      if (!w.includes("写真")) continue;
      const box = e.querySelector(".mynote");
      return { coKhoi: !!box, coHang: !!(box && box.querySelector(".hoiai")),
               chuThua: box ? box.textContent.replace(/\s+/g, " ").trim() : "" };
    }
    return null;
  });
  soat("mục chưa có ghi chú mà có link: khối VẪN dựng", !!(r && r.coKhoi), JSON.stringify(r));
  soat("và hàng link nằm trong đó", !!(r && r.coHang));
}

/* ------------------------------------------------------------------ */
console.log("\nDán tay — đường lui khi nền không bắt được");
{
  const thu = async (chu) => page.evaluate(async (t) => {
    window.__dan = t;
    for (const e of document.querySelectorAll(".entry")) {
      const w = e.querySelector(".w");
      if (w && w.textContent.includes("改善")) {
        e.querySelector(".iconbtn.gemini").dispatchEvent(
          new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
        break;
      }
    }
    await new Promise((x) => setTimeout(x, 700));
    return (document.getElementById("toast") || {}).textContent || "";
  }, chu);

  const t1 = await thu("https://gemini.google.com/app/danTay1");
  const m1 = await docMuc("javi:改善");
  soat("dán link hợp lệ thì ghi vào mục", !!(m1.hoiAi && /danTay1$/.test(m1.hoiAi.url)),
       m1.hoiAi && m1.hoiAi.url);
  soat("và báo là đã lưu", /lưu/i.test(t1), t1);

  const t2 = await thu("https://example.com/khong-phai-gemini");
  const m2 = await docMuc("javi:改善");
  soat("dán thứ KHÔNG phải link Gemini thì từ chối", !!(m2.hoiAi && /danTay1$/.test(m2.hoiAi.url)),
       m2.hoiAi && m2.hoiAi.url);
  soat("và nói rõ vì sao", /không phải/i.test(t2), t2);
}

/* ------------------------------------------------------------------ */
console.log("\nXuất CSV mang theo link");
{
  const r = await page.evaluate(() => {
    const it = { word: "改善", dict: "javi", means: [], ts: Date.now(),
                 hoiAi: { url: "https://gemini.google.com/app/csvTest", ts: Date.now() } };
    return { cot: COT_CHIA_SE.indexOf("Link Gemini"), hang: hangChiaSe(it) };
  });
  soat("có cột Link Gemini", r.cot >= 0, "vị trí " + r.cot);
  soat("và hàng xuất ra mang đúng link", r.hang[r.cot] === "https://gemini.google.com/app/csvTest",
       r.hang[r.cot]);
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
