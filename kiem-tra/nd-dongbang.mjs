/**
 * ĐÓNG BĂNG TỪ và TẮT BÀI MẠNG NGHĨA — bấm thật trên DOM thật.
 *
 *   node kiem-tra/nd-dongbang.mjs /home/user/NeutronDict/extension
 *
 * `srs-tat.mjs` đã chốt phần lõi (hai cờ đổi gì, và quan trọng hơn là KHÔNG
 * được đổi gì). Bài này chốt phần còn lại — phần mà lõi đúng vẫn hỏng được:
 *
 *   1. Nút phải có mặt ở CẢ sổ tay lẫn mặt sau thẻ học. Ý "từ này mình thuộc
 *      rồi" nảy ra giữa buổi học, không phải lúc ngồi rà sổ tay.
 *   2. Từ đã đóng băng phải THẬT SỰ biến khỏi buổi học — không chỉ khỏi con số
 *      đếm. Đếm đúng mà hàng đợi vẫn có nó là kiểu hỏng không ai soi ra.
 *   3. Ngăn "Đóng băng" đếm đúng và KHÔNG mọc nút Học.
 *   4. Tắt hàng loạt rồi Hoàn tác phải trả lại ĐÚNG trạng thái cũ — kể cả mấy
 *      mục vốn đã bật cờ sẵn từ trước, chúng không được bị gỡ theo.
 *   5. Hai cờ sống sót qua một lượt nạp lại trang.
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
  // Tất cả đều TỚI HẠN sẵn, để "biến khỏi buổi học" là một khác biệt đo được.
  const d = (n) => ({ lv: 2, ngay: n, net: 2, sai: 0, due: now - ngay, ts: now - n * ngay });
  const mk = (w, nghia, lien, them) => Object.assign({
    word: w, dict: "javi", means: [nghia], ts: now, lien: lien,
    cauNghe: { cau: w + "を使う。" },
    duong: { nhin: d(14), nghe: d(10), dong: d(7), trai: d(5) },
    srs: { lv: 2, due: now - ngay, ts: now }
  }, them || {});
  await chrome.storage.local.set({
    notebook: {
      "javi:改善": mk("改善", "cải thiện", { dong: ["改良", "向上"], trai: ["改悪"] }),
      "javi:改良": mk("改良", "cải tiến", { dong: ["改善", "向上"], trai: [] }),
      "javi:向上": mk("向上", "nâng lên", { dong: ["改善"], trai: [] }),
      // Mục này ĐÃ tắt mạng nghĩa sẵn — để soi Hoàn tác có gỡ nhầm nó không.
      "javi:低下": mk("低下", "giảm sút", { dong: ["悪化"], trai: ["向上"] }, { mangTat: 1 })
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

/** Bấm một trong hai nút công tắc trên thẻ sổ tay của từ `tu`. */
const bamNut = (tu, lop) => page.evaluate(async ([a, b]) => {
  for (const e of document.querySelectorAll(".entry")) {
    const w = e.querySelector(".w");
    if (!w || !w.textContent.includes(a)) continue;
    const n = e.querySelector(".iconbtn." + b);
    if (n) n.click();
    break;
  }
  await new Promise((r) => setTimeout(r, 700));
}, [tu, lop]);

await gieo();
const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 4, null, { timeout: 20000 });

/* ------------------------------------------------------------------ */
console.log("Hai nút có mặt trên thẻ sổ tay");
{
  const r = await page.evaluate(() => {
    const e = [...document.querySelectorAll(".entry")]
      .find((x) => (x.querySelector(".w") || {}).textContent.includes("改善"));
    const b = e && e.querySelector(".iconbtn.bang"), m = e && e.querySelector(".iconbtn.mang");
    return { coBang: !!b, coMang: !!m, tBang: b && b.title, tMang: m && m.title,
             svg: !!(b && b.querySelector("svg")) };
  });
  soat("có nút Đóng băng", r.coBang);
  soat("có nút Tắt mạng nghĩa", r.coMang);
  soat("và hai nút vẽ ra icon thật", r.svg);
  soat("lời mách nói rõ điểm giữ nguyên", /điểm giữ nguyên/.test(r.tBang || ""), r.tBang);
  soat("lời mách nói rõ liên kết KHÔNG bị đụng",
       /liên kết vẫn giữ nguyên/.test(r.tMang || ""), r.tMang);
}

/* ------------------------------------------------------------------ */
console.log("\nTắt mạng nghĩa: đóng bài, mà KHÔNG đụng danh sách");
{
  const truoc = await page.evaluate(() =>
    window.Srs.diemTu(currentActiveSet().find((x) => x.word === "改善")).tong);
  await bamNut("改善", "mang");
  const a = await docMuc("改善");
  soat("cờ đã ghi xuống", a.mangTat === 1, JSON.stringify(a.mangTat));
  soat("danh sách liên kết KHÔNG suy suyển",
       (a.lien.dong || []).length === 2 && (a.lien.trai || []).length === 1,
       JSON.stringify(a.lien.dong) + " / " + JSON.stringify(a.lien.trai));
  const b = await docMuc("改良");
  soat("và từ hàng xóm vẫn kể tên nó như cũ", (b.lien.dong || []).indexOf("改善") >= 0,
       (b.lien.dong || []).join(","));
  const r = await page.evaluate(() => {
    const it = currentActiveSet().find((x) => x.word === "改善");
    const d = window.Srs.diemTu(it);
    return { duong: window.Srs.duongCo(it), han: window.Srs.denHan(it, Date.now()),
             diem: d.tong, mangTat: d.mangTat, on: duongOnDuoc(it, Date.now()) };
  });
  soat("hai đường liên kết đã đóng", r.duong.join(",") === "nhin,nghe", r.duong.join(","));
  soat("và thôi ra trong bài kiểm tra",
       r.han.indexOf("dong") < 0 && r.han.indexOf("trai") < 0, JSON.stringify(r.han));
  soat("điểm chấm lại trên những đường còn mở", r.diem !== truoc, truoc + " → " + r.diem);
  soat("diemTu báo rõ là người dùng tự tắt", r.mangTat === true);
}
{
  // Khối mạng nghĩa vẫn VẼ ĐỦ, chỉ mờ đi và kèm một dòng nói rõ.
  const r = await page.evaluate(() => {
    const e = [...document.querySelectorAll(".entry")]
      .find((x) => (x.querySelector(".w") || {}).textContent.includes("改善"));
    const k = e && e.querySelector(".lienmang");
    return { mo: !!(k && k.classList.contains("tat")),
             ghi: !!(k && k.querySelector(".lienmang-tat")),
             soTu: k ? k.querySelectorAll(".lienmang-o").length : -1,
             coNutBo: !!(k && k.querySelector(".lienmang-bo")) };
  });
  soat("khối mạng nghĩa vẫn hiện đủ ba từ", r.soTu === 3, r.soTu + " từ");
  soat("được làm mờ và ghi rõ đang tắt", r.mo && r.ghi);
  soat("nút × vẫn dùng được — mấy từ ấy còn việc với từ khác", r.coNutBo);
}

/* ------------------------------------------------------------------ */
console.log("\nĐóng băng: rút hẳn khỏi buổi học");
{
  const demTruoc = await page.evaluate(() => dueList(currentActiveSet()).length);
  await bamNut("改良", "bang");
  const a = await docMuc("改良");
  soat("cờ đã ghi xuống", a.dongBang === 1, JSON.stringify(a.dongBang));
  const r = await page.evaluate(() => {
    const it = currentActiveSet().find((x) => x.word === "改良");
    return { han: window.Srs.denHan(it, Date.now()), due: isDue(it, Date.now()),
             on: duongOnDuoc(it, Date.now()),
             dem: dueList(currentActiveSet()).length,
             cap: window.Srs.capChung(it), gom: window.Srs.gomSrs(it) };
  });
  soat("không còn đường nào tới hạn", r.han.length === 0 && r.due === false);
  soat("nút “Ôn bài còn lại” cũng thôi mọc trên nó", r.on.length === 0,
       JSON.stringify(r.on));
  soat("số mục đến hạn giảm đúng một", r.dem === demTruoc - 1, demTruoc + " → " + r.dem);
  /*
   * VÀ TIẾN ĐỘ KHÔNG BỊ ĐỤNG. Đây là chỗ mà chặn nhầm ở `duongMo` sẽ lộ ra:
   * mọi khẳng định phía trên vẫn xanh, chỉ hai dòng này đỏ, mà hậu quả thật
   * là mất sạch tiến độ ở lượt đồng bộ Drive đầu tiên.
   */
  soat("capChung vẫn nguyên", r.cap >= 0, String(r.cap));
  soat("gomSrs vẫn ra một mốc thật (đồng bộ Drive đọc cái này)",
       !!(r.gom && typeof r.gom.lv === "number"), JSON.stringify(r.gom));
}
{
  // Chốt THẬT: dựng hàng đợi buổi học và soi xem nó có lọt vào không.
  const r = await page.evaluate(() => {
    const q = hangDoiKhoi(currentActiveSet());
    return { tu: [...new Set(q.map((x) => x.word))], so: q.length };
  });
  soat("từ đã đóng băng KHÔNG nằm trong hàng đợi buổi học",
       r.tu.indexOf("改良") < 0, r.tu.join(" · "));
}

/* ------------------------------------------------------------------ */
console.log("\nNgăn “Đóng băng”");
{
  const r = await page.evaluate(async () => {
    drawDecks();
    const chip = [...document.querySelectorAll("#deckBar .chipgroup")]
      .find((c) => /Đóng băng/.test(c.textContent));
    if (!chip) return null;
    chip.querySelector(".chip").click();
    await new Promise((x) => setTimeout(x, 400));
    return { so: chip.querySelector(".n").textContent,
             coNutHoc: !!chip.querySelector(".chip.hoc"),
             dangHien: [...document.querySelectorAll(".entry .w")].map((w) => w.textContent.trim()) };
  });
  soat("ngăn Đóng băng có mặt", !!r);
  soat("và đếm đúng một từ", r && r.so === "1", r && r.so);
  soat("KHÔNG mọc nút Học — vì denHan đã rỗng", r && !r.coNutHoc);
  soat("mở ra thì chỉ thấy đúng từ ấy",
       r && r.dangHien.length === 1 && r.dangHien[0].includes("改良"), r && r.dangHien.join(" "));
}
{
  // Nhưng nó VẪN nằm trong "Tất cả" — ngăn này là một lối xem, không phải chỗ cất.
  const r = await page.evaluate(async () => {
    current = ALL; drawDecks(); draw();
    await new Promise((x) => setTimeout(x, 300));
    return [...document.querySelectorAll(".entry .w")].map((w) => w.textContent.trim());
  });
  soat("từ đóng băng vẫn nằm trong ngăn Tất cả",
       r.some((x) => x.includes("改良")), r.length + " mục");
}

/* ------------------------------------------------------------------ */
console.log("\nTắt hàng loạt, và Hoàn tác");
{
  const truoc = await page.evaluate(() =>
    currentActiveSet().filter((x) => x.mangTat).map((x) => x.word).sort());
  const nut = await page.evaluate(async () => {
    const b = [...document.querySelectorAll("#hangLoat .btn")]
      .find((x) => /Tắt mạng nghĩa/.test(x.textContent));
    if (!b) return null;
    const chu = b.textContent;
    b.click();
    await new Promise((x) => setTimeout(x, 900));
    return chu;
  });
  soat("nút tắt hàng loạt có mặt và ghi rõ số từ", !!nut && /\(\d+\)/.test(nut), nut);
  const sau = await page.evaluate(() =>
    currentActiveSet().filter((x) => x.mangTat).map((x) => x.word).sort());
  soat("cả danh sách đang hiện đều tắt", sau.length === 4, sau.join(","));

  const co = await page.evaluate(async () => {
    const b = document.querySelector(".toast-nut");
    if (!b) return false;
    b.click();
    await new Promise((x) => setTimeout(x, 900));
    return true;
  });
  soat("lời nhắc có nút Hoàn tác", co);
  const lui = await page.evaluate(() =>
    currentActiveSet().filter((x) => x.mangTat).map((x) => x.word).sort());
  /*
   * ĐÚNG TRẠNG THÁI CŨ, không phải "gỡ sạch". 低下 vốn đã tắt sẵn từ đầu và
   * 改善 thì vừa bị tắt tay ở trên — Hoàn tác chỉ được rút lại đúng những mục
   * mà chính nó vừa đổi, chứ không được làm hơn thế.
   */
  soat("Hoàn tác trả lại ĐÚNG trạng thái trước đó",
       lui.join(",") === truoc.join(","), "trước [" + truoc.join(",") + "] → sau [" + lui.join(",") + "]");
}

/* ------------------------------------------------------------------ */
console.log("\nHai nút trên mặt sau thẻ học");
{
  const r = await page.evaluate(async () => {
    current = ALL; drawDecks(); draw();
    await startStudy();
    await new Promise((x) => setTimeout(x, 700));
    const nut = [...document.querySelectorAll("#stFav .btn")].map((b) => b.textContent.trim());
    return { nut: nut, tu: ($("stProg") || {}).textContent || "" };
  });
  soat("mặt thẻ học có nút Đóng băng", r.nut.some((x) => /Đóng băng/.test(x)), r.nut.join(" | "));
  soat("và nút Tắt mạng nghĩa", r.nut.some((x) => /mạng nghĩa/i.test(x)), r.nut.join(" | "));
  /*
   * Bấm Tắt mạng nghĩa NGAY TRÊN THẺ, rồi so dòng tiến trình với điểm THẬT
   * của thẻ đang hiện.
   *
   * Cố tình KHÔNG chốt "con số phải nhúc nhích": thẻ rơi vào đầu hàng đợi là
   * thứ không đoán trước được, và với một từ chỉ có một từ cùng nghĩa thì
   * đường `dong` vốn đã đóng sẵn (ngưỡng là 2), nên tắt thêm không đổi gì — và
   * đó là đúng. Điều phải luôn đúng là: cái hiện trên màn khớp với cái đang có.
   */
  const d = await page.evaluate(async () => {
    const b = [...document.querySelectorAll("#stFav .btn")].find((x) => /mạng nghĩa/i.test(x.textContent));
    if (!b) return null;
    b.click();
    await new Promise((x) => setTimeout(x, 700));
    const it = theCardHienTai();
    const m = ($("stProg").textContent || "").match(/(\d+)\/100/);
    return { hien: m ? Number(m[1]) : null, that: window.Srs.diemTu(it).tong,
             tat: !!it.mangTat, tu: it.word,
             nhan: [...document.querySelectorAll("#stFav .btn")].map((x) => x.textContent.trim()) };
  });
  soat("bấm được ngay giữa buổi học", !!d && d.tat === true, d && d.tu);
  soat("dòng tiến trình khớp với điểm thật sau khi bấm",
       d && d.hien !== null && d.hien === d.that, d && (d.tu + ": hiện " + d.hien + ", thật " + d.that));
  soat("nhãn nút đổi theo trạng thái", d && d.nhan.some((x) => /đã tắt/i.test(x)), d && d.nhan.join(" | "));
}

/* ------------------------------------------------------------------ */
console.log("\nSống sót qua một lượt nạp lại");
{
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 4, null, { timeout: 20000 });
  const r = await page.evaluate(() => {
    const a = currentActiveSet();
    return { bang: a.filter((x) => x.dongBang).map((x) => x.word),
             tat: a.filter((x) => x.mangTat).map((x) => x.word).sort() };
  });
  soat("cờ đóng băng còn nguyên", r.bang.join(",") === "改良", r.bang.join(","));
  soat("cờ tắt mạng nghĩa còn nguyên", r.tat.length >= 2, r.tat.join(","));
}

soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 200));

const dat = ket.filter(Boolean).length;
console.log(`\n${dat}/${ket.length}  — ` + (dat === ket.length ? "sạch" : "CÓ CHỖ HỎNG"));
await ctx.close();
process.exit(dat === ket.length ? 0 : 1);
