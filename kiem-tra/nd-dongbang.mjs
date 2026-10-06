/**
 * ĐÓNG BĂNG TỪ — bấm thật trên DOM thật.
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
// Nền bồi dữ liệu ngầm có thể đè mất mẫu thử — chặn mạng cho tất định.
await sw.evaluate(() => { self.fetch = () => Promise.reject(new Error("chặn")); });

const gieo = () => sw.evaluate(async (now) => {
  const ngay = 86400000;
  // Tất cả đều TỚI HẠN sẵn, để "biến khỏi buổi học" là một khác biệt đo được.
  const d = (n) => ({ lv: 2, ngay: n, net: 2, sai: 0, due: now - ngay, ts: now - n * ngay });
  const mk = (w, nghia, them) => Object.assign({
    word: w, dict: "javi", means: [nghia], ts: now,
    cauNghe: { cau: w + "を使う。", dich: "dịch " + nghia },
    duong: { nhin: d(14), nghe: d(10), dien: d(7) },
    srs: { lv: 2, due: now - ngay, ts: now }
  }, them || {});
  await chrome.storage.local.set({
    notebook: {
      "javi:改善": mk("改善", "cải thiện"),
      "javi:改良": mk("改良", "cải tiến"),
      "javi:向上": mk("向上", "nâng lên"),
      "javi:低下": mk("低下", "giảm sút")
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
console.log("Nút đóng băng có mặt trên thẻ sổ tay");
{
  const r = await page.evaluate(() => {
    const e = [...document.querySelectorAll(".entry")]
      .find((x) => (x.querySelector(".w") || {}).textContent.includes("改善"));
    const b = e && e.querySelector(".iconbtn.bang");
    return { coBang: !!b, tBang: b && b.title, svg: !!(b && b.querySelector("svg")),
             coMang: !!(e && e.querySelector(".iconbtn.mang")) };
  });
  soat("có nút Đóng băng", r.coBang);
  soat("vẽ ra icon thật", r.svg);
  soat("lời mách nói rõ điểm giữ nguyên", /điểm giữ nguyên/.test(r.tBang || ""), r.tBang);
  soat("không còn nút Tắt mạng nghĩa", !r.coMang);
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
console.log("\nHàng thao tác hàng loạt CHỈ ĐƯỢC MỜI GỠ");
{
  /*
   * CỔNG CHẶN CHÍNH cho lỗi của bản 4.25.0.
   *
   * Hồi ấy ở đây có "Tắt mạng nghĩa (N)" và "Đóng băng (N)" — một nút trơn
   * ngay đầu danh sách, chạm nhầm là ghi lại hàng chục mục, mà nút tắt lại dựng
   * từ danh sách những từ CHƯA tắt nên tắt hết rồi là nó biến mất: không còn
   * đường nào bật lại hàng loạt, phải đi bấm từng từ.
   */
  const co = await page.evaluate(() =>
    [...document.querySelectorAll("#hangLoat .btn")].map((b) => b.textContent.trim()));
  soat("KHÔNG có nút tắt mạng nghĩa hàng loạt",
       !co.some((x) => /^Tắt mạng nghĩa \(/.test(x)), co.join(" | ") || "(hàng rỗng)");
  soat("KHÔNG có nút đóng băng hàng loạt",
       !co.some((x) => /^Đóng băng \(/.test(x)), co.join(" | ") || "(hàng rỗng)");
  /*
   * VÀ HAI NÚT GỠ KHÔNG BÁM THEO NGĂN.
   *
   * Trước đây "Gỡ băng tất cả" chỉ hiện trong ngăn Đóng băng. Đang ở ngăn
   * Tất cả mà có từ đóng băng thì phải thấy nó ngay — đường về không được
   * bắt người ta đoán ra trước là phải mở ngăn nào.
   */
  soat("đang ở ngăn Tất cả vẫn thấy nút Gỡ băng",
       co.some((x) => /^Gỡ băng tất cả \(\d+\)/.test(x)), co.join(" | "));
  soat("không còn nút Bật lại mạng nghĩa",
       !co.some((x) => /mạng nghĩa/.test(x)), co.join(" | "));
}
{
  const truoc = await page.evaluate(() =>
    currentActiveSet().filter((x) => x.dongBang).map((x) => x.word).sort());
  soat("đang có từ đóng băng để mà gỡ", truoc.length >= 1, truoc.join(","));

  const nut = await page.evaluate(async () => {
    const b = [...document.querySelectorAll("#hangLoat .btn")]
      .find((x) => /Gỡ băng tất cả/.test(x.textContent));
    if (!b) return null;
    const chu = b.textContent;
    b.click();
    await new Promise((x) => setTimeout(x, 900));
    return chu;
  });
  soat("nút gỡ ghi rõ số từ", !!nut && /\(\d+\)/.test(nut), nut);
  const sau = await page.evaluate(() =>
    currentActiveSet().filter((x) => x.dongBang).map((x) => x.word).sort());
  soat("bấm một cái là gỡ sạch cả danh sách đang hiện", sau.length === 0,
       "[" + truoc.join(",") + "] → [" + sau.join(",") + "]");
  /*
   * VÀ NÚT BIẾN MẤT — hết cái để gỡ.
   *
   * Đây là mặt sau của cái cửa một chiều cũ: nút bây giờ dựng từ những từ
   * ĐANG tắt chứ không phải những từ CHƯA tắt, nên nó chỉ vắng mặt đúng lúc
   * không còn việc gì cho nó làm.
   */
  const conNut = await page.evaluate(() =>
    [...document.querySelectorAll("#hangLoat .btn")].map((b) => b.textContent.trim()));
  soat("gỡ xong thì nút tự biến mất",
       !conNut.some((x) => /Gỡ băng tất cả/.test(x)), conNut.join(" | ") || "(hàng rỗng)");

  const daBam = await page.evaluate(async () => {
    const b = document.querySelector(".toast-nut");
    if (!b) return false;
    b.click();
    await new Promise((x) => setTimeout(x, 900));
    return true;
  });
  soat("lời nhắc có nút Hoàn tác", daBam);
  const lui = await page.evaluate(() =>
    currentActiveSet().filter((x) => x.dongBang).map((x) => x.word).sort());
  soat("Hoàn tác trả lại ĐÚNG trạng thái trước đó",
       lui.join(",") === truoc.join(","), "trước [" + truoc.join(",") + "] → sau [" + lui.join(",") + "]");
}

/* ------------------------------------------------------------------ */
console.log("Nút đóng băng trên mặt sau thẻ học");
{
  const r = await page.evaluate(async () => {
    current = ALL; drawDecks(); draw();
    await startStudy();
    await new Promise((x) => setTimeout(x, 700));
    const nut = [...document.querySelectorAll("#stFav .btn")].map((b) => b.textContent.trim());
    return { nut: nut };
  });
  soat("mặt thẻ học có nút Đóng băng", r.nut.some((x) => /Đóng băng/.test(x)), r.nut.join(" | "));
  soat("không còn nút Tắt mạng nghĩa", !r.nut.some((x) => /mạng nghĩa/i.test(x)), r.nut.join(" | "));
  const w = await page.evaluate(async () => {
    const tu = theCardHienTai().word;
    const b = [...document.querySelectorAll("#stFav .btn")].find((x) => /Đóng băng/.test(x.textContent));
    b.click();
    await new Promise((x) => setTimeout(x, 800));
    return { tu: tu, hien: theCardHienTai() ? theCardHienTai().word : null };
  });
  const m = await docMuc(w.tu);
  soat("bấm một cái là cờ ghi xuống, ngay giữa buổi học", m && m.dongBang === 1, w.tu + ": " + (m && m.dongBang));
  soat("và từ vừa đóng băng rời khỏi buổi học ngay (thẻ đang hiện đã đổi)", w.hien !== w.tu, w.tu + " → " + w.hien);
}

/* ------------------------------------------------------------------ */
console.log("\nSống sót qua một lượt nạp lại");
{
  /*
   * Chụp trạng thái NGAY TRƯỚC khi nạp lại rồi so lại đúng nó, chứ không đếm
   * đầu: các khối trên vừa bật tắt qua lại mấy lượt, mà điều cần chốt ở đây
   * chỉ là "nạp lại thì không mất gì".
   *
   * Đọc từ KHO LƯU chứ không từ mảng trong bộ nhớ. Bấm công tắc trên MẶT
   * THẺ HỌC chỉ sửa đối tượng của thẻ ấy, không sửa mảng sổ tay — cố ý, vì
   * vẽ lại cả danh sách giữa buổi học là thứ không ai cần, và `closeStudy` /
   * `finishStudy` đều gọi `load()` nên tới lúc nhìn thấy là đã tươi. Lấy mảng
   * ấy làm mốc thì bài kiểm đang so kho lưu với một ảnh chụp cũ, chứ không
   * phải đang kiểm chuyện "nạp lại có mất không".
   */
  const truocNap = await sw.evaluate(async () => {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    const ds = Object.values(nb).filter((x) => x && !x.del);
    return { bang: ds.filter((x) => x.dongBang).map((x) => x.word).sort() };
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 4, null, { timeout: 20000 });
  const r = await page.evaluate(() => {
    const a = currentActiveSet();
    return { bang: a.filter((x) => x.dongBang).map((x) => x.word).sort() };
  });
  soat("cờ đóng băng còn nguyên", r.bang.join(",") === truocNap.bang.join(","),
       "[" + truocNap.bang.join(",") + "] → [" + r.bang.join(",") + "]");
}

soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 200));

const dat = ket.filter(Boolean).length;
console.log(`\n${dat}/${ket.length}  — ` + (dat === ket.length ? "sạch" : "CÓ CHỖ HỎNG"));
await ctx.close();
process.exit(dat === ket.length ? 0 : 1);
