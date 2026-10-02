/**
 * TRA TỪ ĐI QUA GOOGLE DỊCH (không còn Mazii) — đo trên extension thật.
 *
 *   node kiem-tra/nd-google-tra.mjs /home/user/NeutronDict/extension
 *
 * Chốt bốn chuyện, mỗi chuyện là một lỗi từng làm người dùng chờ hoặc mất nghĩa:
 *
 *   1. Tra tiếng Nhật chỉ đi Google Dịch: có nghĩa + cách đọc (từ phiên âm dt=rm)
 *      trong MỘT lượt gọi, và KHÔNG chạm mazii.net.
 *   2. Tra từ + dịch cùng một từ (popup bắn cả hai một lúc) dùng chung MỘT lượt
 *      gọi Google, không phải hai.
 *   3. Cổng chính treo thì cổng kia được bắn song song sau ~1 giây (đua), chứ
 *      không chờ cổng treo hết hạn rồi mới thử.
 *   4. Google chặn hết (429) thì máy chủ Apps Script cho nghĩa — và lượt sau
 *      không mất thêm một vòng timeout vào cổng đang chặn.
 *   5. Chuột phải → Lưu một từ khi Google chết mà Apps Script còn sống: mục vào
 *      sổ có nghĩa, không trống.
 *
 * `fetch` của nền bị thay bằng một "Google giả" để bài tất định và đếm được.
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
const ket = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  const ok = await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false);
  if (ok) break;
  await new Promise((r) => setTimeout(r, 250));
}

/* ---- Google giả ---- */
await sw.evaluate(() => {
  self.__log = [];                 // mọi URL ra mạng
  self.__cfg = { chinh: "ok", phu: "ok", dict: "404" };   // ok | treo | 429
  const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { "content-type": "application/json" } });
  const treo = (opt) => new Promise((_, rej) => {
    const sg = opt && opt.signal;
    if (sg) sg.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
  });
  const BAN = {
    "金融": { vi: "tài chính", rm: "kin'yū" },
    "hello": { vi: "xin chào", rm: "" },
    "tài chính": { ja: "金融", rm: "kin'yū", alt: ["ファイナンス", "財政"] }
  };
  self.fetch = async (u, opt) => {
    u = String(u); self.__log.push(u);
    if (/mazii\.net/.test(u)) return json({ results: [] });
    if (/dictionaryapi\.dev/.test(u)) return self.__cfg.dict === "404" ? json({}, 404) : json([{ phonetic: "/həˈləʊ/", meanings: [] }]);
    if (/script\.google\.com/.test(u)) {
      const b = JSON.parse(opt.body);
      return json({ ok: true, text: "AS:" + b.text });
    }
    if (/translate_a\/single/.test(u)) {
      const chinh = /translate\.googleapis\.com/.test(u);
      const mode = chinh ? self.__cfg.chinh : self.__cfg.phu;
      if (mode === "treo") return treo(opt);
      if (mode === "429") return new Response("<html>Sorry</html>", { status: 429 });
      const q = decodeURIComponent((u.match(/[?&]q=([^&]*)/) || [, ""])[1] || (opt && opt.body || "").replace(/^q=/, ""));
      const sl = (u.match(/sl=([^&]+)/) || [])[1], tl = (u.match(/tl=([^&]+)/) || [])[1];
      const b = BAN[q];
      if (!b) return json([[[q, q]], null, sl]);
      if (sl === "vi" && tl === "ja") {
        return json([[[b.ja, q], [null, null, b.rm, q]], [["noun", b.alt, []]], "vi"]);
      }
      return json([[[b.vi, q], [null, null, "", b.rm]], [["noun", [b.vi, b.vi + " 2"], []]], sl]);
    }
    return json({}, 404);
  };
});
/** Quên sạch: đệm gtx, cổng bị đánh dấu xấu, đệm tra từ trong RAM. */
const quen = () => sw.evaluate(async () => {
  gtxDem.clear();
  for (const k in gtxXau) delete gtxXau[k];
  const c = await demTra.lay();
  for (const k in c) delete c[k];
});
const mang = () => sw.evaluate(() => self.__log.slice());
const reset = () => sw.evaluate(() => { self.__log.length = 0; });
const dat = (c) => sw.evaluate((c) => { Object.assign(self.__cfg, c); }, c);
const lookup = (word, dict) => sw.evaluate(([w, d]) => handleLookup(w, d), [word, dict]);

await sw.evaluate(async () => {
  await chrome.storage.local.set({ settings: { ngu: "ja" }, notebook: {}, cache: {}, trCache: {} });
});

/* ------------------------------------------------------------------ */
console.log("Tra tiếng Nhật chỉ đi Google Dịch");
{
  await reset();
  const r = await lookup("金融", "javi");
  const e = (r.entries || [])[0] || {};
  soat("có kết quả mang đúng chữ đã hỏi", e.word === "金融", e.word);
  soat("nghĩa lấy từ Google", (e.means || [])[0] === "tài chính", JSON.stringify(e.means));
  soat("cách đọc dựng từ phiên âm dt=rm", e.reading === "きんゆう", e.reading);
  soat("đánh dấu cách đọc là suy ra (docSuy)", e.docSuy === 1);
  const log = await mang();
  soat("KHÔNG chạm mazii.net", !log.some((u) => /mazii/.test(u)), log.length + " lượt");
  soat("đúng MỘT lượt gọi Google cho cả nghĩa lẫn cách đọc",
    log.filter((u) => /translate_a/.test(u)).length === 1, log.filter((u) => /translate_a/.test(u)).length + " lượt");
}
{
  await reset();
  const r = await lookup("tài chính", "vija");
  const ds = r.entries || [];
  soat("Việt→Nhật: mục đầu là bản dịch", ds[0] && ds[0].word === "金融", ds[0] && ds[0].word);
  soat("cách đọc lấy từ phiên âm của BẢN DỊCH", ds[0] && ds[0].reading === "きんゆう", ds[0] && ds[0].reading);
  soat("có thêm cách nói khác", ds.length >= 3 && ds.some((x) => x.word === "ファイナンス"), ds.map((x) => x.word).join(","));
}
{
  // Mục tra tiếng Nhật còn sót trong bộ đệm từ thời Mazii phải bị bỏ khi nạp.
  const con = await sw.evaluate(async () => {
    await chrome.storage.local.set({ cache: {
      "javi:猫": { ts: Date.now(), entries: [{ word: "猫", means: ["MAZII-CU"] }] },
      "envi:cat": { ts: Date.now(), entries: [{ word: "cat", means: ["mèo"] }] }
    } });
    const moi = demBen("cache", (o) => { for (const k in o) if (/^(javi|vija|jvi):/.test(k)) delete o[k]; });
    return Object.keys(await moi.lay()).join(",");
  });
  soat("bộ đệm tiếng Nhật cũ bị gỡ, tiếng Anh giữ nguyên", con === "envi:cat", con);
}

/* ------------------------------------------------------------------ */
console.log("\nTra từ + dịch cùng một từ dùng chung một lượt gọi");
{
  await sw.evaluate(async () => { await chrome.storage.local.set({ settings: { ngu: "en" } }); });
  await reset();
  await sw.evaluate(() => Promise.all([handleLookup("hello", "auto"), handleTranslate("hello", "auto", "")]));
  const n = (await mang()).filter((u) => /translate_a/.test(u)).length;
  soat("hai việc, một lượt gọi Google", n === 1, n + " lượt");
}

/* ------------------------------------------------------------------ */
console.log("\nCổng chính treo thì đua sang cổng phụ");
{
  await quen();
  await dat({ chinh: "treo", phu: "ok" });
  await reset();
  const t0 = Date.now();
  const r = await lookup("金融", "javi");
  const dt = Date.now() - t0;
  soat("vẫn ra kết quả", r.entries && r.entries[0] && r.entries[0].means[0] === "tài chính");
  soat("nhanh hơn nhiều so với chờ cổng treo hết hạn (6 giây)", dt < 2500, dt + " ms");
  const log = await mang();
  soat("cổng phụ được gọi", log.some((u) => /clients5/.test(u)));
}

/* ------------------------------------------------------------------ */
console.log("\nGoogle chặn hết thì Apps Script cho nghĩa");
{
  await quen();
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ syncUrl: "https://script.google.com/macros/s/FAKE/exec", syncToken: "t" });
  });
  await dat({ chinh: "429", phu: "429" });
  await reset();
  const t0 = Date.now();
  const r = await lookup("金融", "javi");
  const dt = Date.now() - t0;
  const e = (r.entries || [])[0] || {};
  soat("nghĩa đến từ Apps Script", (e.means || [])[0] === "AS:金融", JSON.stringify(e.means));
  soat("không phải chờ hết giờ", dt < 2500, dt + " ms");

  // Lượt sau: các cổng vừa trượt -> đi Apps Script NGAY, không gọi lại cổng chặn.
  await sw.evaluate(() => gtxDem.clear());   // giữ nguyên cổng bị đánh dấu xấu
  await reset();
  const t1 = Date.now();
  const r2 = await lookup("hello", "envi");
  const dt2 = Date.now() - t1;
  const log = await mang();
  soat("lượt sau vẫn có nghĩa", ((r2.entries || [])[0] || {}).means[0] === "AS:hello");
  soat("lượt sau chỉ mất một nhịp", dt2 < 1500, dt2 + " ms");
}

/* ------------------------------------------------------------------ */
console.log("\nChuột phải → Lưu khi Google chết, Apps Script còn sống");
{
  await quen();
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ settings: { ngu: "ja" }, notebook: {}, cache: {} });
  });
  await dat({ chinh: "429", phu: "429" });
  await sw.evaluate(() => handleContextSave({ selectionText: "金融" }, null));
  await sw.evaluate(() => vaSau(async () => {}));       // chờ hàng đợi ghi rỗng
  const nb = await sw.evaluate(async () => (await chrome.storage.local.get("notebook")).notebook || {});
  const it = nb["javi:金融"];
  soat("mục vào sổ", !!it);
  soat("và CÓ NGHĨA", !!(it && it.means && it.means.length && it.means[0] === "AS:金融"), JSON.stringify(it && it.means));
}
{
  // Cả hai đường cùng chết lúc lưu -> mục vẫn lưu, rồi được điền nghĩa sau.
  await quen();
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ notebook: {} });
    await chrome.storage.local.remove("syncUrl");
  });
  await sw.evaluate(() => handleContextSave({ selectionText: "金融" }, null));
  await sw.evaluate(() => vaSau(async () => {}));
  let nb = await sw.evaluate(async () => (await chrome.storage.local.get("notebook")).notebook || {});
  soat("chết cả hai đường: mục vẫn được lưu (chưa nghĩa)", !!nb["javi:金融"] && !(nb["javi:金融"].means || []).length);
  await dat({ chinh: "ok", phu: "ok" });
  await quen();
  await new Promise((r) => setTimeout(r, 4500));          // nghiaVaSau thử lại sau 3 giây
  nb = await sw.evaluate(async () => (await chrome.storage.local.get("notebook")).notebook || {});
  soat("Google sống lại: nghĩa được điền vào mục", ((nb["javi:金融"] || {}).means || [])[0] === "tài chính",
    JSON.stringify((nb["javi:金融"] || {}).means));
}

const loi = ket.filter((x) => !x).length;
console.log("\n" + (ket.length - loi) + "/" + ket.length + (loi ? "  — CÓ LỖI" : "  — sạch"));
await ctx.close();
process.exit(loi ? 1 : 0);
