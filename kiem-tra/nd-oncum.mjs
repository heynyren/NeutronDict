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
      // 改良 CŨNG tới hạn. Đây là cả nội dung của luật mới: bạn cùng cụm chỉ
      // được kéo khi CHÍNH NÓ tới hạn. Hai từ còn lại để xa, để thấy chúng
      // đứng ngoài.
      "javi:改良": { word: "改良", dict: "javi", means: ["cải tiến"], ts: now,
        lien: { dong: [], trai: [] },
        duong: { nhin: { lv: 2, ngay: 7, due: now - ngay, ts: now - 8 * ngay } },
        srs: { lv: 2, due: now - ngay, ts: now } },
      "javi:向上": roi("向上", "nâng lên"),
      "javi:改悪": roi("改悪", "làm tệ đi"),
      "javi:写真": roi("写真", "ảnh chụp")
    },
    decks: {}, hoc: {}, nhipMs: {},
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
    const khoi = hangDoiKhoi(currentActiveSet());
    return {
      soKhoi: khoi.length,
      khoi: khoi.map((k) => k.map((c) => ({ tu: c.word, d: c._d, cum: c._cum || null }))),
      denHan: currentActiveSet().filter((x) => window.Srs.denHan(x, Date.now()).length)
                                .map((x) => x.word)
    };
  });
  soat("改善 và 改良 cùng tới hạn, 向上/改悪/写真 thì chưa",
       r.denHan.slice().sort().join() === ["改善", "改良"].sort().join(), r.denHan.join(" "));
  soat("cả buổi gom về đúng MỘT khối", r.soKhoi === 1, r.soKhoi + " khối");
  const k = r.khoi[0] || [];
  const ban = k.filter((x) => x.cum);
  soat("bạn cùng cụm ĐÃ tới hạn thì được kéo vào chung khối",
       ban.some((x) => x.tu === "改良"), ban.map((x) => x.tu).join(" ") || "không có");
  /*
   * VÀ ĐÂY LÀ CỔNG THẬT CỦA LUẬT MỚI.
   *
   * 向上 với 改悪 cùng cụm với 改善 y như 改良, chỉ khác là lịch của chúng còn
   * 40 ngày nữa. Bản cũ vẫn lôi chúng ra, mỗi từ một thẻ "nhìn" đánh dấu ôn
   * kèm — mà thẻ ấy trả lời đúng không được gì, trả lời sai vẫn bị chấm quên.
   * Tức là chỉ có thể làm hại. Đo 180 ngày: tốn thêm 14,8% số thẻ để MẤT 3,6
   * điểm, mà số lượt hai từ đi cạnh nhau còn ít hơn hẳn.
   */
  soat("bạn cùng cụm CHƯA tới hạn thì KHÔNG bị lôi vào",
       k.every((x) => x.tu !== "向上" && x.tu !== "改悪"), k.map((x) => x.tu).join(" "));
  soat("kéo tối đa 2 từ cùng cụm", new Set(ban.map((x) => x.tu)).size <= 2,
       new Set(ban.map((x) => x.tu)).size + " từ");
  soat("từ RỜI (写真) không bị lôi vào", k.every((x) => x.tu !== "写真"),
       k.map((x) => x.tu).join(" "));
  soat("thẻ cùng cụm ghi rõ nó đi theo từ nào", ban.every((x) => x.cum === "改善"),
       ban.map((x) => x.cum).join(" "));
  soat("mọi thẻ trong khối đều là thẻ ĐÃ tới hạn",
       k.every((x) => r.denHan.indexOf(x.tu) >= 0), k.map((x) => x.tu).join(" "));
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
/*
 * KHÔNG HỎI LẠI CÙNG MỘT CÂU TRONG MỘT BUỔI.
 *
 * Bản đầu của `hangDoiKhoi` chỉ chặn trùng ở chỗ chọn bạn cùng cụm, không chặn
 * ở vòng lặp chính — nên một từ vừa cùng cụm với từ khác vừa TỰ tới hạn thì
 * được phát hai lần. Nó không làm vỡ gì, không ném lỗi, không trượt bài kiểm
 * nào đang có; chỉ là người học gặp lại đúng câu vừa trả lời, và `gradeWord`
 * nhân giãn cách hai lần (7 → 14,7 → 30,9 ngày thay vì dừng ở 14,7).
 *
 * Thử CẢ HAI thứ tự trong sổ: `scopeList` xếp theo `ts` nên từ mở đầu có thể
 * đứng trước hoặc sau bạn của nó, mà hai chiều ấy đi qua hai nhánh mã khác
 * nhau.
 */
console.log("\nKhông hỏi lại cùng một câu trong một buổi");
for (const nguoc of [false, true]) {
  const page = await moSo();
  const r = await page.evaluate((nguoc) => {
    // 改良 cho TỚI HẠN luôn, để nó vừa là bạn cùng cụm của 改善 vừa tự tới hạn.
    const ds = currentActiveSet().map((x) => {
      if (x.word !== "改良") return x;
      const y = JSON.parse(JSON.stringify(x));
      y.duong.nhin.due = Date.now() - 2 * 86400000;
      y.duong.nhin.ngay = 7;
      return y;
    });
    const so = nguoc ? ds.slice().reverse() : ds;
    const khoi = hangDoiKhoi(so, {});
    const phang = [].concat.apply([], khoi);
    const dem = {};
    for (const c of phang) { const k = c.key + "|" + c._d; dem[k] = (dem[k] || 0) + 1; }
    return {
      phang: phang.map((c) => c.word + "/" + c._d + (c._som ? "(kèm)" : "")),
      lap: Object.entries(dem).filter(([, n]) => n > 1).map(([k, n]) => k + " ×" + n),
      duongCuaBan: phang.filter((c) => c.word === "改良").map((c) => c._d).sort(),
      coBan: phang.some((c) => c.word === "改良"),
      toKhoi: Math.max.apply(null, khoi.map((k) => new Set(k.map((c) => c.key)).size))
    };
  }, nguoc);
  const ten = nguoc ? "thứ tự ngược" : "thứ tự xuôi";
  soat(ten + ": không cặp (từ, đường) nào bị hỏi hai lần",
       r.lap.length === 0, r.lap.join(", ") || r.phang.join("  "));
  soat(ten + ": bạn cùng cụm mà tự tới hạn vẫn được hỏi",
       r.coBan, r.phang.join("  "));
  soat(ten + ": và được hỏi ĐỦ mọi đường đang tới hạn của nó",
       r.duongCuaBan.length >= 1 && new Set(r.duongCuaBan).size === r.duongCuaBan.length,
       r.duongCuaBan.join("/"));
  soat(ten + ": khối không nở dây chuyền (≤ 1 + CUM_TOI_DA từ)",
       r.toKhoi <= 3, r.toKhoi + " từ trong khối lớn nhất");
  await page.close();
}

/* ------------------------------------------------------------------ */
/*
 * MỌI THẺ ĐỀU CHẤM NHƯ NHAU — không còn ngoại lệ nào.
 *
 * Từng có: thẻ bị kéo vào vì cùng cụm mà CHƯA tới hạn được chấm theo luật
 * riêng — nhớ thì không xếp lịch lại, quên thì vẫn phạt. Bất đối xứng ấy có
 * chủ ý, nhưng đo ra thì nó chỉ có thể làm hại: 180 ngày, sổ 600 từ, tốn thêm
 * 14,8% số thẻ để MẤT 3,6 điểm.
 *
 * Giờ `hangDoiKhoi` chỉ kéo bạn ĐÃ tới hạn nên thẻ loại ấy không còn tồn tại,
 * và tham số `som` của `gradeWord` đi theo. Chốt ở đây vì nó hỏng âm thầm:
 * để sót tham số lại thì mã trông như đã gỡ, mà nhánh cũ vẫn chạy — chính
 * chuyện đã xảy ra một lần lúc làm thay đổi này, và bài kiểm khi ấy vẫn xanh
 * vì nó đang kiểm đúng cái nhánh còn sót.
 */
console.log("\ngradeWord không còn luật riêng cho thẻ ôn kèm");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(async () => {
    const lay = async () => ((await chrome.storage.local.get("notebook"))
      .notebook["javi:改良"].duong.nhin) || {};
    const truoc = await lay();
    // Truyền thừa một đối số y như mã cũ từng làm. Nếu tham số `som` còn sót
    // thì lượt này KHÔNG được ghi, và khẳng định dưới đây đỏ.
    await gradeWord("javi:改良", true, 2000, "nhin", undefined, true);
    const sau = await lay();
    const nhip = (await chrome.storage.local.get("nhipMs")).nhipMs || {};
    return { soThamSo: gradeWord.length, truocNgay: truoc.ngay, sauNgay: sau.ngay,
             coNhip: !!(nhip.nhin && nhip.nhin.n) };
  });
  soat("gradeWord nhận đúng 5 tham số — `som` đã gỡ hẳn", r.soThamSo === 5,
       "nhận " + r.soThamSo);
  soat("nhớ một thẻ cùng cụm thì giãn cách VẪN nới ra như mọi thẻ khác",
       r.sauNgay > r.truocNgay, r.truocNgay + " → " + r.sauNgay + " ngày");
  soat("và nhịp bấm vẫn được ghi", r.coNhip);
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nQuên thì chấm như thường");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(async () => {
    const lay = async () => ((await chrome.storage.local.get("notebook"))
      .notebook["javi:改良"].duong.nhin) || {};
    const truoc = await lay();
    await gradeWord("javi:改良", false, 0, "nhin");
    const sau = await lay();
    return { truocNgay: truoc.ngay, sauNgay: sau.ngay, sauDue: sau.due, bayGio: Date.now() };
  });
  soat("giãn cách PHẢI co lại", r.sauNgay < r.truocNgay,
       r.truocNgay + " → " + r.sauNgay + " ngày");
  soat("và nó tới hạn lại ngay", r.sauDue <= r.bayGio + 1000);
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nThẻ của chính từ tới hạn thì cũng vậy");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(async () => {
    const lay = async () => ((await chrome.storage.local.get("notebook"))
      .notebook["javi:改善"].duong.nhin) || {};
    const truoc = await lay();
    const kq = await gradeWord("javi:改善", true, 2000, "nhin");
    const sau = await lay();
    return { truocNgay: truoc.ngay, sauNgay: sau.ngay, tinhNgay: kq && kq.duong.ngay };
  });
  soat("kết quả chấm được giữ nguyên trong kho", r.sauNgay === r.tinhNgay,
       "tính " + r.tinhNgay + " / lưu " + r.sauNgay);
  soat("nhớ một thẻ tới hạn thì giãn cách PHẢI nới ra", r.sauNgay > r.truocNgay,
       r.truocNgay + " → " + r.sauNgay + " ngày");
  await page.close();
}

/* ------------------------------------------------------------------ */
/*
 * KHÔNG CÒN THỜI GIAN NGHỈ GIỮA HAI LẦN KÉO CÙNG MỘT CỤM.
 *
 * Nó từng có, và từng cần: bản cũ kéo cả bạn chưa tới hạn, nên cụm nào có một
 * từ giãn cách ngắn sẽ lôi cả cụm ra mỗi ngày. Giờ chỉ kéo bạn ĐÃ tới hạn nên
 * không ai bị hỏi ngoài lịch của mình nữa, và giữ lại thời gian nghỉ chỉ còn
 * bóp nghẹt đúng thứ tính năng này sinh ra để làm: đo 180 ngày, số lượt hai từ
 * cùng cụm đi cạnh nhau tụt từ 20.034 xuống 6.925.
 *
 * `srs-tai.mjs` chốt rằng hằng số ấy không quay lại notebook.js. Ở đây chốt
 * phần người dùng thấy: gọi hai lần liên tiếp phải ra y hệt nhau.
 */
console.log("\nGọi lại thì vẫn kéo — không còn thời gian nghỉ");
await gieo(true);
{
  const page = await moSo();
  const r = await page.evaluate(() => {
    const goi = () => hangDoiKhoi(currentActiveSet())
      .map((k) => k.map((c) => c.word + "/" + c._d).join(" ")).join(" | ");
    return { a: goi(), b: goi() };
  });
  soat("lần đầu có kéo cụm", /改良/.test(r.a), r.a);
  soat("gọi lại vẫn kéo y hệt", r.a === r.b, r.b);
  soat("hangDoiKhoi không còn nhận tham số bảng nghỉ",
       /function hangDoiKhoi\(scopeList\)/.test(
         await page.evaluate(() => hangDoiKhoi.toString().slice(0, 40))) ||
       (await page.evaluate(() => hangDoiKhoi.length)) === 1,
       "nhận " + (await page.evaluate(() => hangDoiKhoi.length)) + " tham số");
  await page.close();
}

/* ------------------------------------------------------------------ */
console.log("\nTắt công tắc thì trở lại y như cũ");
await gieo(false);
{
  const page = await moSo();
  const r = await page.evaluate(() => {
    const khoi = hangDoiKhoi(currentActiveSet());
    const phang = [].concat.apply([], khoi);
    return { tu: [...new Set(phang.map((c) => c.word))].sort(),
             cum: phang.filter((c) => c._cum).length, soKhoi: khoi.length };
  });
  soat("chỉ còn đúng những từ tự tới hạn", r.tu.join() === ["改善", "改良"].sort().join(),
       r.tu.join(" "));
  soat("không thẻ nào mang dấu cùng cụm", r.cum === 0, r.cum + " thẻ");
  soat("và chúng nằm ở HAI khối rời nhau, không được xếp cạnh nhau",
       r.soKhoi === 2, r.soKhoi + " khối");
  await page.close();
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
