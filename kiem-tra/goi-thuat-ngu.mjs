/**
 * GÓI THUẬT NGỮ CHUYÊN NGÀNH (Điện) — ưu tiên trước Google nhưng KHÔNG lấn át.
 *
 *   node kiem-tra/goi-thuat-ngu.mjs /home/user/NeutronDict/extension
 *
 * Chốt:
 *   1. Từ chuyên ngành: nghĩa của gói đứng TRƯỚC nghĩa Google (hiện như nghĩa bình thường, không nhãn).
 *   2. Từ chung (あう, work): Google đứng trước, gói chỉ bổ sung phía sau.
 *   3. Trợ từ dính vùng chọn (励磁電流が) vẫn khớp; cách đọc suy từ romaji bị cách đọc của gói thay.
 *   4. Mục trong bộ đệm KHÔNG bị sửa tại chỗ (tắt gói đi là sạch ngay).
 *   5. Đoạn dài: bản dịch của Google giữ nguyên, không chèn gì thêm.
 *   6. Tắt trong cài đặt thì tra như cũ. Popup: không còn tab Dịch, không nhãn trên nghĩa.
 *   7. Tra một từ chỉ tốn micro-giây.
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
const ID = sw.url().split("/")[2];
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
}
// Giả Google: mỗi từ trả đúng một nghĩa "máy" để thấy thứ tự.
await sw.evaluate(() => {
  self.dichTu = async (text, f, t) => ({ main: "MAY:" + text, senses: [], data: null });
  self.fetchDictionary = async () => null;
  self.gtxTranslate = async () => "Dòng điện lớn.";
  self.gtxTranslateDetect = async () => ({ text: "Dòng điện lớn.", src: "en" });
});
const LK = (word, dict) => sw.evaluate(([w, d]) => handleLookup(w, d), [word, dict]);
const bat = (b) => sw.evaluate(async (b) => { const { settings } = await chrome.storage.local.get("settings"); await chrome.storage.local.set({ settings: Object.assign({}, settings || {}, { goiDien: b }) }); }, b);
await sw.evaluate(() => chrome.storage.local.set({ settings: { ngu: "ja", goiDien: true, goiIt: false, goiY: false }, notebook: {}, cache: {}, trCache: {} }));
// This section tests the electrical pack alone; multi-pack composition is tested below.
await bat(true);

console.log("Từ chuyên ngành (Nhật)");
let r = await LK("励磁電流", "javi");
let e = r.entries[0];
soat("nghĩa của gói đứng trước", e.means[0] === "dòng điện kích từ", JSON.stringify(e.means));
soat("nghĩa Google nối sau", e.means.some((m) => /MAY:/.test(m)));
soat("không dán nhãn nguồn lên kết quả", e.goi === undefined);
r = await LK("励磁電流が", "javi");
soat("trợ từ dính vùng chọn vẫn khớp", r.entries[0].means[0] === "dòng điện kích từ", JSON.stringify(r.entries[0].means));
r = await LK("れいじでんりゅう", "javi");
soat("tra bằng cách đọc ra đúng thuật ngữ", r.entries[0].means[0] === "dòng điện kích từ");

console.log("\nTừ chung");
r = await LK("あう", "javi");
e = r.entries[0];
soat("Google đứng trước, gói bổ sung sau", /MAY:/.test(e.means[0]) && e.means.length > 1, JSON.stringify(e.means));

console.log("\nTiếng Anh");
r = await LK("sag", "envi");
soat("sag → 'độ võng' của gói đứng đầu", r.entries[0].means[0] === "độ võng", JSON.stringify(r.entries[0].means));
r = await LK("Circuit breakers", "auto");
soat("cụm + số nhiều + hoa thường vẫn khớp", r.entries[0].means[0] === "máy cắt", JSON.stringify(r.entries[0].means));
r = await LK("work", "envi");
soat("work là từ chung: Google trước", /MAY:/.test(r.entries[0].means[0]), JSON.stringify(r.entries[0].means));

console.log("\nBộ đệm không bị sửa tại chỗ");
await bat(false);
r = await LK("sag", "envi");
soat("tắt gói: không còn nghĩa của gói, dù lượt trước đã đệm", !r.entries[0].means.includes("độ võng"), JSON.stringify(r.entries[0].means));
await bat(true);

console.log("\nNhiều ngành cùng lúc (Điện + IT + Y)");
await sw.evaluate(() => chrome.storage.local.set({ settings: { ngu: "en", goiDien: true, goiIt: true, goiY: true } }));
r = await LK("compiler", "envi");
soat("IT: compiler → trình biên dịch đứng đầu", r.entries[0].means[0] === "trình biên dịch", JSON.stringify(r.entries[0].means));
r = await LK("framework", "envi");
soat("IT: thuật ngữ dân ngành để nguyên tiếng Anh → 'framework' đứng đầu", r.entries[0].means[0] === "framework", JSON.stringify(r.entries[0].means));
r = await LK("positive", "envi");
soat("Y: positive → dương tính (nghĩa ngành đứng trước Google)", r.entries[0].means[0] === "dương tính", JSON.stringify(r.entries[0].means));
r = await LK("bus", "envi");
soat("bus: nghĩa điện (thanh cái) và IT (bus) gộp, không gói nào nuốt gói nào",
  r.entries[0].means.some((m) => /thanh cái/.test(m)) && r.entries[0].means.some((m) => /đường truyền dữ liệu/.test(m)), JSON.stringify(r.entries[0].means));
r = await LK("コンパイラ", "javi");
soat("IT tiếng Nhật: コンパイラ → trình biên dịch", r.entries[0].means[0] === "trình biên dịch", JSON.stringify(r.entries[0].means));
r = await LK("心電図", "javi");
soat("Y tiếng Nhật: 心電図 → điện tâm đồ", r.entries[0].means[0] === "điện tâm đồ", JSON.stringify(r.entries[0].means));
r = await LK("浮腫", "javi");
soat("Y: 浮腫 sửa tay thành 'phù' (không để bắc cầu gán 'sưng')", r.entries[0].means[0] === "phù", JSON.stringify(r.entries[0].means));
r = await LK("端末", "javi");
soat("IT: 端末 = thiết bị đầu cuối (không phải 'cửa sổ dòng lệnh')", r.entries[0].means.includes("thiết bị đầu cuối") && !r.entries[0].means.some((m) => /cửa sổ dòng lệnh/.test(m)), JSON.stringify(r.entries[0].means));
await sw.evaluate(() => chrome.storage.local.set({ settings: { ngu: "en", goiDien: true, goiIt: false, goiY: true } }));
r = await LK("compiler", "envi");
soat("tắt riêng gói IT: compiler không còn nghĩa của gói IT", !r.entries[0].means.includes("trình biên dịch"), JSON.stringify(r.entries[0].means));
r = await LK("positive", "envi");
soat("…mà gói Y vẫn chạy", r.entries[0].means[0] === "dương tính");
await sw.evaluate(() => chrome.storage.local.set({ settings: { ngu: "ja", goiDien: true, goiIt: true, goiY: true } }));

console.log("\nTắt trong cài đặt");
await bat(false);
r = await LK("励磁電流", "javi");
soat("tắt gói: tra như cũ (chỉ Google)", /^MAY:/.test(r.entries[0].means[0]), JSON.stringify(r.entries[0].means));
await bat(true);

console.log("\nTốc độ");
const ms = await sw.evaluate(() => { const t = performance.now(); for (let i = 0; i < 5000; i++) self.ThuatNgu.tra("励磁電流が", "ja"); return (performance.now() - t) / 5000; });
soat("một lượt tra < 0,05 ms", ms < 0.05, ms.toFixed(4) + " ms");

console.log("\nPopup");
await sw.evaluate(() => chrome.storage.local.set({ settings: { ngu: "ja" } }));
const pop = await ctx.newPage();
pop.on("pageerror", (x) => loi.push(x.message));
await pop.goto(`chrome-extension://${ID}/popup.html`);
await pop.waitForTimeout(800);
soat("không còn nút tab Dịch", (await pop.$("#tabTrans")) === null);
const nhan = await pop.evaluate(async () => {
  await renderWord({ dict: "javi", entries: [{ word: "励磁電流", reading: "れいじでんりゅう", means: ["dòng điện kích từ", "máy"], dict: "javi" }], saved: {} });
  const li = [...document.querySelectorAll("#result ul.m li")];
  return { n: li.length, tag: li.map((x) => !!x.querySelector("span")), gm: !!document.querySelector("#result .lft .iconbtn[title*='Gemini']") };
});
soat("nghĩa hiện như bình thường, không nhãn", nhan.n === 2 && nhan.tag.every((x) => x === false), JSON.stringify(nhan));
soat("có nút Hỏi Gemini cạnh nghĩa", nhan.gm);
soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 160));
await ctx.close();
process.exit(ket.every(Boolean) ? 0 : 1);
