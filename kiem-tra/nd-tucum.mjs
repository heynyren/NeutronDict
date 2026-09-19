/**
 * TỪ DẪN XUẤT KHÔNG ĐƯỢC RƯỚC THÊM TỪ MỚI — đo trên extension thật.
 *
 *   node kiem-tra/nd-tucum.mjs /home/user/NeutronDict/extension
 *
 * `lien-xep.mjs` đã chốt phần tính toán (`locTheoCum`). Bài này chốt phần NỐI
 * DÂY, tức đúng những chỗ mà bài kia không với tới được:
 *
 *   1. Bấm "+ Lưu" ở màn kết quả thì mục vào sổ có mang dấu `tuCum` không, và
 *      dấu ấy có ghi ĐÚNG từ gốc với ĐÚNG cực không. Ghi nhầm cực là từ gốc
 *      nhảy sang làm trái nghĩa của chính nó.
 *   2. Nền có thật sự lọc theo dấu ấy không. Đây là chỗ cả yêu cầu nằm ở đó:
 *      không một từ nào ngoài tập ban đầu được vào sổ liên kết.
 *   3. Nền KHÔNG gọi mạng để đi tìm từ mới cho mục dẫn xuất. Tầng dịch-ngược
 *      chính là cỗ máy đẻ từ, nên gọi nó ở đây là vừa chậm vừa đi ngược điều
 *      đang muốn.
 *   4. Tra rồi tự tay bấm Lưu thì mục THĂNG lên từ gốc — không thì nó kẹt
 *      vĩnh viễn ở tập rút gọn mà chẳng có đường nào gỡ.
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

/*
 * Chặn MỌI lượt ra mạng của nền, và đếm.
 *
 * Hai việc một lúc: chốt rằng mục dẫn xuất không đi hỏi mạng, và giữ cho bài
 * kiểm tất định — để `fetch` chạy thật thì kết quả đổi theo việc hôm nay
 * mazii.net trả về gì.
 */
await sw.evaluate(() => {
  self.__mang = [];
  self.fetch = (u, o) => {
    self.__mang.push(String(u));
    return Promise.resolve(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
  };
});

/** Gieo sổ: một từ GỐC có tập liên kết rộng, chưa có từ dẫn xuất nào. */
const gieo = () => sw.evaluate(async (now) => {
  const ngay = 86400000;
  await chrome.storage.local.set({
    notebook: {
      "javi:改善": { word: "改善", dict: "javi", reading: "かいぜん", means: ["cải thiện"], ts: now,
        lien: { dong: ["改良", "向上"], trai: ["改悪"] },
        duong: { nhin: { lv: 2, ngay: 7, due: now - ngay, ts: now - 8 * ngay } },
        srs: { lv: 2, due: now - ngay, ts: now } }
    },
    decks: {}, hoc: {}, nhipMs: {},
    settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false }
  });
  self.__mang.length = 0;
}, Date.now());

const docMuc = (w) => sw.evaluate(async (tu) => {
  const nb = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k in nb) if (nb[k] && nb[k].word === tu) return Object.assign({ _key: k }, nb[k]);
  return null;
}, w);

/*
 * Gửi lượt hỏi TỪ TRANG, không từ service worker.
 *
 * `chrome.runtime.sendMessage` gọi trong chính service worker thì nó KHÔNG tự
 * nhận — lượt hỏi rơi vào hư không và mục chẳng bao giờ vào sổ. Trang thì gửi
 * được, và đó cũng đúng đường mà nút "+ Lưu" thật đi.
 */
const page = await ctx.newPage();
page.on("pageerror", (e) => loi.push(e.message));
await page.goto(`chrome-extension://${id}/notebook.html`);

const luuNhanh = (word, cum) => page.evaluate(async ([w, c]) => {
  await new Promise((r) => chrome.runtime.sendMessage(
    { type: "LUU_NHANH", word: w, dict: "javi", cum: c }, () => r()));
  // `lienVaSau` chạy NGẦM sau khi lưu — chờ nó ghi xong, nhưng đừng chờ mãi:
  // mục không có từ liên nào thì `lien` không bao giờ được ghi.
  for (let i = 0; i < 30; i++) {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    for (const k in nb) if (nb[k] && nb[k].word === w && nb[k].lien) return;
    await new Promise((x) => setTimeout(x, 150));
  }
}, [word, cum]);

/* ------------------------------------------------------------------ */
console.log("Lưu từ màn kết quả: mục mang dấu xuất xứ");
await gieo();
await luuNhanh("改良", { goc: "改善", ben: "dong" });
{
  const m = await docMuc("改良");
  soat("mục vào được sổ", !!m, m ? m._key : "(không có)");
  soat("có dấu tuCum", !!(m && m.tuCum), JSON.stringify(m && m.tuCum));
  soat("ghi đúng từ gốc", m.tuCum && m.tuCum.goc === "改善", m.tuCum && m.tuCum.goc);
  soat("ghi đúng cực", m.tuCum && m.tuCum.ben === "dong", m.tuCum && m.tuCum.ben);
}

/* ------------------------------------------------------------------ */
console.log("\nTập liên kết bị thu về đúng tập ban đầu");
{
  const m = await docMuc("改良");
  const l = (m && m.lien) || {};
  const gop = (l.dong || []).concat(l.trai || []);
  const von = new Set(["改善", "向上", "改悪"]);   // gốc + tập của gốc, trừ chính nó
  soat("nối ngược về GỐC", (l.dong || []).indexOf("改善") >= 0, (l.dong || []).join(","));
  soat("gốc nằm đúng bên đồng nghĩa, không phải trái nghĩa",
       (l.trai || []).indexOf("改善") < 0, (l.trai || []).join(","));
  soat("KHÔNG một từ nào ngoài tập ban đầu lọt vào",
       gop.every((x) => von.has(x)), gop.join(",") || "(rỗng)");
  soat("và chính nó không tự nối vào mình", gop.indexOf("改良") < 0);
}

/* ------------------------------------------------------------------ */
console.log("\nKhông đi hỏi mạng để tìm từ mới");
{
  const ds = await sw.evaluate(() => self.__mang.slice());
  /*
   * Phân biệt cho đúng, không cấm nhầm.
   *
   * `dt=rm` là lượt hỏi PHIÊN ÂM để dựng furigana — mục nào cũng cần, kể cả
   * mục dẫn xuất, và nó không đẻ ra từ nào. Thứ phải cấm là `dt=bd` (endpoint
   * TỪ ĐIỂN của gtx, trả về cả danh sách ứng viên cho một ý — chính là vòng
   * dịch ngược) và dictionaryapi.dev cho tiếng Anh.
   */
  const deTu = ds.filter((u) => /dt=bd/.test(u) || /dictionaryapi\.dev/.test(u));
  const doc = ds.filter((u) => /dt=rm/.test(u));
  soat("không gọi tầng dịch-ngược hay từ điển để đẻ từ mới", deTu.length === 0,
       deTu.slice(0, 2).join(" | ") || "0 lượt");
  soat("nhưng lượt hỏi phiên âm để dựng furigana thì vẫn được — nó không đẻ từ nào",
       true, doc.length + " lượt dt=rm");
}

/* ------------------------------------------------------------------ */
console.log("\nLưu từ tập TRÁI nghĩa thì cực lật theo");
await gieo();
await luuNhanh("改悪", { goc: "改善", ben: "trai" });
{
  const m = await docMuc("改悪");
  const l = (m && m.lien) || {};
  soat("dấu ghi cực trai", m && m.tuCum && m.tuCum.ben === "trai", m && m.tuCum && m.tuCum.ben);
  soat("gốc nằm bên TRÁI nghĩa", (l.trai || []).indexOf("改善") >= 0, (l.trai || []).join(","));
  soat("và không nằm bên đồng nghĩa", (l.dong || []).indexOf("改善") < 0, (l.dong || []).join(","));
}

/* ------------------------------------------------------------------ */
console.log("\nKHÔNG có dấu thì dựng tập đầy đủ như cũ");
await gieo();
await luuNhanh("向上", null);
{
  const m = await docMuc("向上");
  soat("mục không mang dấu tuCum", !(m && m.tuCum), JSON.stringify(m && m.tuCum));
  const ds = await sw.evaluate(() => self.__mang.slice());
  soat("và nền ĐƯỢC phép đi hỏi mạng cho mục thường",
       ds.length > 0 || !!(m && m.lien), ds.length + " lượt mạng");
}

/* ------------------------------------------------------------------ */
console.log("\nTra rồi tự tay bấm Lưu thì THĂNG lên từ gốc");
await gieo();
await luuNhanh("改良", { goc: "改善", ben: "dong" });
{
  const truoc = await docMuc("改良");
  soat("đang là từ dẫn xuất", !!(truoc && truoc.tuCum));
  // Lưu qua đường thường: đúng lượt mà popup / thẻ tra trong trang vẫn gọi.
  await page.evaluate(async () => {
    await new Promise((r) => chrome.runtime.sendMessage(
      { type: "SAVE_WORD", entry: { word: "改良", reading: "かいりょう", means: ["cải tiến"], dict: "javi" },
        dict: "javi" }, () => r()));
    await new Promise((r) => setTimeout(r, 1500));
  });
  const sau = await docMuc("改良");
  soat("dấu tuCum đã được gỡ", !(sau && sau.tuCum), JSON.stringify(sau && sau.tuCum));
  soat("mục vẫn còn trong sổ", !!sau && !sau.del, sau && sau.word);
}

/* ------------------------------------------------------------------ */
soat("không có lỗi trang", loi.length === 0, loi.slice(0, 2).join(" | "));

await ctx.close();
const dat = ket.filter(Boolean).length;
console.log("\n" + dat + "/" + ket.length + (dat === ket.length ? "  — sạch" : "  — CÓ LỖI"));
process.exit(dat === ket.length ? 0 : 1);
