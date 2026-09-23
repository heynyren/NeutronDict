/**
 * LỜI CHÚC MỪNG HUY HIỆU KHÔNG ĐƯỢC LÀM VĂNG BUỔI HỌC.
 *
 *   node kiem-tra/nd-munghoc.mjs /home/user/NeutronDict/extension
 *
 * Đạt mốc giữa buổi ôn thì `anMung` phủ một tấm chúc mừng ĐÈ LÊN màn học (lớp
 * 300 trên lớp 260). Tấm ấy giữ trong nó việc-phải-làm-sau-khi-đóng: với buổi
 * học, `xong` chính là `showCard` — sang thẻ tiếp. Nên mọi đường đóng nó đều
 * phải đi qua đúng một cửa. Có ba chỗ trước đây không đi qua cửa ấy:
 *
 *   1. PHÍM ESC. Màn học nghe keydown trên `document` và coi Esc là "đóng buổi
 *      học". Lời chúc mừng cũng nghe Esc trên `document`, gắn SAU nên chạy
 *      SAU. Người ta bấm Esc để tắt lời chúc mừng — phản xạ bình thường nhất,
 *      mà chính tấm ấy cũng mời "Enter/Esc" — thế là một phím vừa tắt lời chúc
 *      mừng vừa gọi `closeStudy`. Đó đúng là "đang học tự dưng thoát ra".
 *
 *   2. NÚT QUAY LẠI CỦA ANDROID. Nó xé lớp `show` ra cho nhanh:
 *      `phu.classList.remove("show")`. Tấm phủ biến mất, nhưng `xong` không
 *      bao giờ chạy — thẻ bên dưới đứng im mãi, bấm gì cũng không sang từ
 *      khác. Vuốt về lần nữa thì rơi xuống nhánh `ketThucSom` và thoát thật.
 *
 *   3. NGƯỜI NGHE CHỒNG ĐỐNG. `#tdCelebrate` dùng lại cho mọi lần mở khoá, mà
 *      mỗi lần gọi lại gắn thêm một `click` lên nền. Tới lần thứ N, một cái
 *      chạm ra nền gọi N cái `xong` cũ — tức `showCard` chạy N lần liền.
 *
 * Cả ba đều im lặng: không có gì đỏ, không có lỗi trang. Chỉ là buổi học biến
 * mất giữa chừng.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const GOC = join(EXT, "..");
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
  const d = (n) => ({ lv: 2, ngay: n, net: 2, sai: 0, due: now - ngay, ts: now - n * ngay });
  const nb = {};
  for (const [w, n] of [["改善", "cải thiện"], ["改良", "cải tiến"], ["向上", "nâng lên"],
                        ["改悪", "tệ hơn"], ["食堂", "buồng ăn"], ["料亭", "nhà hàng"]]) {
    nb["javi:" + w] = { word: w, dict: "javi", means: [n], ts: now, lien: { dong: [], trai: [] },
      duong: { nhin: d(14), nghe: d(10) }, srs: { lv: 2, due: now - ngay, ts: now } };
  }
  await chrome.storage.local.set({ notebook: nb, decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false } });
}, Date.now());

const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
page.on("console", (m) => { if (m.type() === "error") loi.push("console: " + m.text()); });
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 6, null, { timeout: 20000 });

/* ==================================================================== */
console.log("\n— Esc và Enter tắt lời chúc mừng, KHÔNG tắt buổi học —");
/* ==================================================================== */

for (const phim of ["Escape", "Enter"]) {
  const r = await page.evaluate(async (k) => {
    const nap = () => new Promise((x) => setTimeout(x, 250));
    if (!document.getElementById("studyOverlay").classList.contains("show")) {
      document.getElementById("study").click();
      for (let i = 0; i < 40; i++) {
        const o = document.getElementById("studyOverlay");
        if (o && o.classList.contains("show") && theCardHienTai()) break;
        await nap();
      }
    }
    let goi = 0;
    window.TienDo.anMung(["bat-dau"], () => { goi += 1; });
    await nap();
    const hienTruoc = document.getElementById("tdCelebrate").classList.contains("show");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
    await nap();
    return {
      hienTruoc,
      conMung: document.getElementById("tdCelebrate").classList.contains("show"),
      conHoc: document.getElementById("studyOverlay").classList.contains("show"),
      goi
    };
  }, phim);
  soat(phim + ": lời chúc mừng có hiện ra", r.hienTruoc);
  soat(phim + ": tắt được lời chúc mừng", !r.conMung);
  soat(phim + ": BUỔI HỌC VẪN CÒN", r.conHoc);
  soat(phim + ": việc-sau-khi-đóng chạy đúng một lần", r.goi === 1, "gọi " + r.goi + " lần");
}

/* ==================================================================== */
console.log("\n— dongMung(): một cửa duy nhất để đóng cho tử tế —");
/* ==================================================================== */

const r2 = await page.evaluate(async () => {
  const nap = () => new Promise((x) => setTimeout(x, 200));
  const khiRong = window.TienDo.dongMung();      // không có gì mở
  let goi = 0;
  window.TienDo.anMung(["bat-dau"], () => { goi += 1; });
  await nap();
  const lanDau = window.TienDo.dongMung();
  await nap();
  const lanHai = window.TienDo.dongMung();       // gọi lại: không được chạy `xong` lần nữa
  await nap();
  return { khiRong, lanDau, lanHai, goi,
    conMung: document.getElementById("tdCelebrate").classList.contains("show"),
    conHoc: document.getElementById("studyOverlay").classList.contains("show") };
});
soat("chưa mở gì thì trả về false", r2.khiRong === false);
soat("đang mở thì đóng được, trả về true", r2.lanDau === true && r2.conMung === false);
soat("gọi lần nữa trả về false", r2.lanHai === false);
soat("`xong` vẫn chỉ chạy một lần", r2.goi === 1, "gọi " + r2.goi + " lần");
soat("buổi học không hề hấn gì", r2.conHoc);

/* ==================================================================== */
console.log("\n— Chạm ra nền: không được kéo theo mấy lần trước —");
/* ==================================================================== */

const r3 = await page.evaluate(async () => {
  const nap = () => new Promise((x) => setTimeout(x, 200));
  const dem = [0, 0, 0];
  // Mở rồi đóng ba lần. Mỗi lần `anMung` mà gắn thêm một người nghe lên nền thì
  // tới lần thứ ba, một cái chạm gọi luôn cả ba cái `xong`.
  for (let i = 0; i < 3; i += 1) {
    window.TienDo.anMung(["bat-dau"], () => { dem[i] += 1; });
    await nap();
    const ov = document.getElementById("tdCelebrate");
    ov.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nap();
  }
  return { dem, conHoc: document.getElementById("studyOverlay").classList.contains("show") };
});
soat("mỗi lần mở chỉ gọi lại việc của chính nó", r3.dem.join(",") === "1,1,1", "đếm = " + r3.dem.join(","));
soat("buổi học vẫn còn sau ba lần", r3.conHoc);

soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

/* ==================================================================== */
console.log("\n— Cổng cấu trúc: đóng phải đi qua đúng một cửa —");
/* ==================================================================== */

const notebook = readFileSync(join(EXT, "notebook.js"), "utf8");
const app = readFileSync(join(GOC, "android/www/app.js"), "utf8");
const tdExt = readFileSync(join(EXT, "tien-do.js"), "utf8");
const tdAnd = readFileSync(join(GOC, "android/www/tien-do.js"), "utf8");

soat("tien-do.js hai bản giống nhau từng byte", tdExt === tdAnd);
soat("tien-do.js có bày ra dongMung", /dongMung\b/.test(tdExt) && /\bdongMung\s*$/m.test(tdExt.split("root.TienDo")[1] || ""),
  "");
soat("lời chúc mừng bắt phím ở giai đoạn capture rồi chặn lại",
  /addEventListener\("keydown",\s*phim,\s*true\)/.test(tdExt) && /stopPropagation\(\)/.test(tdExt));

soat("nút Quay lại của Android gọi dongMung, không xé lớp show",
  /window\.TienDo\.dongMung\(\)/.test(app) && !/querySelector\("\.celebrate\.show/.test(app));
soat("nút Quay lại đóng phiếu sửa bằng dongSua", /if \(\$\("editSheet"\)\.classList\.contains\("show"\)\) \{ dongSua\(\); return true; \}/.test(app));

soat("phím tắt buổi học đứng im khi có lớp đè lên",
  /querySelector\("#tdCelebrate\.show, \.anhxem\.show"\)\) return;/.test(notebook));

const dat = ket.filter(Boolean).length;
console.log(`\n${dat}/${ket.length}  — ` + (dat === ket.length ? "sạch" : "CÓ CHỖ HỎNG"));
await ctx.close();
process.exit(dat === ket.length ? 0 : 1);
