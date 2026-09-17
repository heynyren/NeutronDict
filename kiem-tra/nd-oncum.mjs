/**
 * ÔN KÈM CẢ CỤM — đo trong trang thật, gọi thẳng vào hàm thật.
 *
 *   node kiem-tra/nd-oncum.mjs /home/user/NeutronDict/extension
 *
 * `cum-lien.mjs` đã giữ phần dựng cụm. Bài này giữ phần HÀNH VI, và bất biến
 * quan trọng nhất là cái dễ hỏng âm thầm nhất:
 *
 *   Thẻ ÔN KÈM mà trả lời ĐÚNG thì KHÔNG được xếp lịch lại.
 *
 * Nhớ được một từ TRƯỚC hạn không nói thêm gì về sức nhớ — lịch vốn đã đoán là
 * còn nhớ — mà nhân tiếp giãn cách từ một lượt ôn sớm thì con số phồng lên, và
 * nó phồng đều mỗi lần từ ấy bị kéo theo cụm. Hỏng chỗ này thì chẳng có gì vỡ,
 * chẳng bài kiểm nào khác trượt; chỉ là thang 100 điểm lặng lẽ nói dối.
 *
 * Chiều ngược lại thì PHẢI ghi: quên một từ trước hạn là bằng chứng thật rằng
 * nó rơi sớm hơn lịch dự tính.
 *
 * Gọi thẳng `hangDoiKhoi` / `gradeWord` chứ không lái qua giao diện: `session`
 * khai bằng `let` nên không nằm trên `window`, mà lái bằng cách bấm nút thì bài
 * kiểm đo lẫn cả đường đi của giao diện — hỏng một chỗ là trượt cả chùm, không
 * biết hỏng ở đâu. Hai hàm ấy là hàm khai ở cấp cao nhất của một script thường
 * nên chúng nằm sẵn trên window.
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

/**
 * Một cụm bốn từ, DUY NHẤT 改善 tới hạn, cộng một từ RỜI không nối với ai.
 *
 * 改良 / 向上 / 改悪 / 写真 đều hẹn còn 40 ngày nữa, nên hễ chúng xuất hiện
 * trong hàng đợi thì đúng là bị kéo theo cụm chứ không phải tự tới hạn.
 *
 * `lien: { dong: [], trai: [] }` cho mấy từ kia là cố ý: để trống thì nền
 * `boiThemDuong` sẽ tự bồi tập đồng/trái nghĩa vào và mẫu thử đổi ngay dưới
 * chân bài kiểm.
 */
const gieo = (onCum) => sw.evaluate(async ([now, onCum]) => {
  const ngay = 86400000;
  const xa = () => ({ lv: 5, ngay: 60, due: now + 40 * ngay, ts: now - 20 * ngay });
  const roi = (w, ngh) => ({ word: w, dict: "javi", means: [ngh], ts: now,
    lien: { dong: [], trai: [] }, duong: { nhin: xa() },
    srs: { lv: 5, due: now + 40 * ngay, ts: now } });
  await chrome.storage.local.set({
    notebook: {
      "javi:改善": { word: "改善", dict: "javi", means: ["cải thiện"], ts: now,
        lien: { dong: ["改良", "向上"], trai: ["改悪"] },
        duong: { nhin: { lv: 2, ngay: 7, due: now - ngay, ts: now - 8 * ngay } },
        srs: { lv: 2, due: now - ngay, ts: now } },
      "javi:改良": roi("改良", "cải tiến"),
      "javi:向上": roi("向上", "nâng lên"),
      "javi:改悪": roi("改悪", "làm tệ đi"),
      "javi:写真": roi("写真", "ảnh chụp")
    },
    decks: {}, hoc: {}, nhipMs: {}, cumOn: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false, onCum: onCum }
  });
}, [Date.now(), onCum]);

async function moSo() {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => loi.push(e.message));
  await page.goto(`chrome-extension://${id}/notebook.html`);
  await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 5,
                             null, { timeout: 20000 });
  return page;
}

/* ------------------------------------------------------------------ */
console.log("Một từ tới hạn thì kéo cả cụm");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(() => {
    const khoi = hangDoiKhoi(currentActiveSet(), {});
    return {
      soKhoi: khoi.length,
      khoi: khoi.map((k) => k.map((c) => ({ tu: c.word, d: c._d, som: !!c._som, cum: c._cum || null }))),
      denHan: currentActiveSet().filter((x) => window.Srs.denHan(x, Date.now()).length)
                                .map((x) => x.word)
    };
  });
  soat("chỉ 改善 tự tới hạn", r.denHan.join() === "改善", r.denHan.join(" "));
  soat("cả buổi gom về đúng MỘT khối", r.soKhoi === 1, r.soKhoi + " khối");
  const k = r.khoi[0] || [];
  const ban = k.filter((x) => x.som);
  soat("có từ cùng cụm bị kéo theo", ban.length > 0, ban.map((x) => x.tu).join(" ") || "không có");
  soat("kéo tối đa 2 từ cùng cụm", ban.length <= 2, ban.length + " từ");
  soat("từ bị kéo đều nằm trong cụm của 改善",
       ban.every((x) => ["改良", "向上", "改悪"].indexOf(x.tu) >= 0), ban.map((x) => x.tu).join(" "));
  soat("từ RỜI (写真) không bị lôi vào", k.every((x) => x.tu !== "写真"),
       k.map((x) => x.tu).join(" "));
  soat("mỗi từ cùng cụm chỉ góp ĐÚNG MỘT thẻ",
       ban.length === new Set(ban.map((x) => x.tu)).size);
  soat("thẻ ôn kèm ghi rõ nó thuộc cụm nào", ban.every((x) => x.cum === "改善"),
       ban.map((x) => x.cum).join(" "));
  // Cụm nằm chung MỘT khối nghĩa là chúng đi liền nhau — startStudy xáo theo
  // khối chứ không xáo phẳng, nên thứ tự trong khối không bị đánh tung.
  soat("từ tới hạn và bạn cùng cụm nằm chung một khối",
       k.some((x) => x.tu === "改善") && ban.length > 0);
  soat("từ tới hạn vẫn được hỏi đủ các đường của nó",
       k.filter((x) => x.tu === "改善").length >= 1,
       k.filter((x) => x.tu === "改善").map((x) => x.d).join("/"));
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nÔn kèm mà NHỚ thì KHÔNG xếp lịch lại");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(async () => {
    const truoc = JSON.stringify(((await chrome.storage.local.get("notebook"))
      .notebook["javi:改良"] || {}).duong);
    await gradeWord("javi:改良", true, 2000, "nhin", undefined, true);   // som = true
    const sau = JSON.stringify(((await chrome.storage.local.get("notebook"))
      .notebook["javi:改良"] || {}).duong);
    const nhip = (await chrome.storage.local.get("nhipMs")).nhipMs || {};
    return { truoc, sau, coNhip: !!(nhip.nhin && nhip.nhin.n) };
  });
  soat("`duong` giữ nguyên không đổi một chữ", r.truoc === r.sau,
       r.truoc === r.sau ? "giữ nguyên" : r.truoc + " → " + r.sau);
  soat("nhưng nhịp bấm vẫn được ghi — công sức bỏ ra là có thật", r.coNhip);
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nÔn kèm mà QUÊN thì PHẢI ghi");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(async () => {
    const lay = async () => ((await chrome.storage.local.get("notebook"))
      .notebook["javi:改良"].duong.nhin) || {};
    const truoc = await lay();
    await gradeWord("javi:改良", false, 0, "nhin", undefined, true);      // som = true
    const sau = await lay();
    return { truocNgay: truoc.ngay, sauNgay: sau.ngay, sauDue: sau.due, bayGio: Date.now() };
  });
  soat("giãn cách PHẢI co lại", r.sauNgay < r.truocNgay,
       r.truocNgay + " → " + r.sauNgay + " ngày");
  soat("và nó tới hạn lại ngay", r.sauDue <= r.bayGio + 1000);
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nThẻ tới hạn thật thì chấm như thường (som = false)");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(async () => {
    const lay = async () => ((await chrome.storage.local.get("notebook"))
      .notebook["javi:改善"].duong.nhin) || {};
    const truoc = await lay();
    await gradeWord("javi:改善", true, 2000, "nhin");
    const sau = await lay();
    return { truocNgay: truoc.ngay, sauNgay: sau.ngay };
  });
  soat("nhớ một thẻ tới hạn thì giãn cách PHẢI nới ra", r.sauNgay > r.truocNgay,
       r.truocNgay + " → " + r.sauNgay + " ngày");
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nThời gian nghỉ của cụm");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(() => {
    const lich = {};
    const lan1 = hangDoiKhoi(currentActiveSet(), lich);
    const lan2 = hangDoiKhoi(currentActiveSet(), lich);   // cùng bảng nghỉ
    const dem = (kh) => kh.reduce((s, k) => s + k.filter((c) => c._som).length, 0);
    return { a: dem(lan1), b: dem(lan2), moc: Object.keys(lich).length };
  });
  soat("lần đầu có kéo cụm", r.a > 0, r.a + " bạn");
  soat("lần sau KHÔNG kéo lại cụm vừa kéo", r.b === 0, r.b + " bạn");
  soat("mốc nghỉ được ghi lại", r.moc > 0, r.moc + " cụm");
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nTắt công tắc thì trở lại y như cũ");
await gieo(false);
{
  const page = await moSo();
  const r = await page.evaluate(() => {
    const khoi = hangDoiKhoi(currentActiveSet(), {});
    const phang = [].concat.apply([], khoi);
    return { tu: [...new Set(phang.map((c) => c.word))], som: phang.filter((c) => c._som).length };
  });
  soat("chỉ còn đúng từ tới hạn", r.tu.join() === "改善", r.tu.join(" "));
  soat("không thẻ nào bị đánh dấu ôn kèm", r.som === 0, r.som + " thẻ");
  await page.close();
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
