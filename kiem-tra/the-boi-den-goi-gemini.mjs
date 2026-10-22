/**
 * THẺ BÔI ĐEN TRONG TRANG: một ô cho từ lẫn câu, có nút Gemini, nhãn gói thuật ngữ.
 *
 *   node kiem-tra/the-boi-den-goi-gemini.mjs /home/user/NeutronDict/extension
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
const ket = [], loi = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
}
await sw.evaluate(async () => {
  self.dichTu = async (t) => ({ main: "MAY:" + t, senses: [], data: null });
  self.fetchDictionary = async () => null;
  self.gtxTranslate = async () => "Bản dịch máy.";
  self.gtxTranslateDetect = async () => ({ text: "Bản dịch máy.", src: "en" });
  await chrome.storage.local.set({ settings: { ngu: "en", inline: true, goiDien: true, translate: true }, notebook: {}, cache: {}, trCache: {} });
});

const pg = await ctx.newPage();
pg.on("pageerror", (e) => loi.push(e.message));
pg.on("console", (m) => { if (process.env.DBG) console.log("CONSOLE", m.text().slice(0,200)); });
await pg.route("https://thu.test/", (r) => r.fulfill({ contentType: "text/html",
  body: "<body style='font:20px sans-serif;padding:60px'><p id=a>The voltage sag</p><p id=b>The inrush current is large. It trips the relay.</p></body>" }));
await pg.goto("https://thu.test/");
await pg.waitForTimeout(600);

const the = () => pg.evaluate(() => {
  const h = [...document.querySelectorAll("div")].find((d) => d.shadowRoot && d.shadowRoot.querySelector(".tabs"));
  if (!h) return null;
  const r = h.shadowRoot;
  const tabs = [...r.querySelectorAll(".tabs button")].map((b) => b.textContent.trim());
  const pane = r.querySelector(".pane.on");
  return {
    tabs, tag: !!r.querySelector(".gt, .gy"),
    gm: [...r.querySelectorAll("button.gm")].map((b) => b.title),
    tx: pane ? pane.textContent.slice(0, 120) : ""
  };
});
const chonTu = async () => {
  await pg.evaluate(() => { const s = getSelection(); s.removeAllRanges(); });
  await pg.dblclick("#a", { position: { x: 120, y: 10 } });   // đúng chữ "sag"
  await pg.waitForTimeout(2500);
  if (process.env.DBG) console.log(await pg.evaluate(() => { const h = [...document.querySelectorAll("div")].find((d) => d.shadowRoot && d.shadowRoot.querySelector(".tabs")); return h ? h.shadowRoot.querySelector(".tabs").parentElement.innerHTML.replace(/<svg.*?<\/svg>/g,"").slice(0,900) : "no"; }), "sel=", await pg.evaluate(() => getSelection().toString()), JSON.stringify(await the()));
};
await chonTu();
let t = await the();
soat("bôi đen một từ ra thẻ", !!t, JSON.stringify(t).slice(0, 160));
soat("không còn tab Dịch riêng", !!t && !t.tabs.some((x) => /^Dịch/.test(x) && t.tabs.length > 2), JSON.stringify(t && t.tabs));
soat("nghĩa của gói đứng đầu, không dán nhãn nguồn", !!t && !t.tag && /độ võng/.test(t.tx));
soat("có nút Hỏi Gemini về TỪ cạnh nghĩa", !!t && t.gm.length === 1 && /từ này/.test(t.gm[0]), JSON.stringify(t && t.gm));

// bôi đen cả đoạn (có dấu câu) => dịch cả đoạn, nhãn tab đổi thành Dịch, nút Gemini về CÂU
await pg.mouse.click(5, 5);
await pg.mouse.move(100, 160); await pg.mouse.down();
await pg.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("b")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
await pg.mouse.up();
await pg.waitForTimeout(1800);
t = await the();
soat("đoạn dài: ô đầu đổi nhãn thành Dịch", !!t && /^Dịch/.test(t.tabs[0]), JSON.stringify(t && t.tabs));
soat("hiện bản dịch trong ô đó", !!t && /Bản dịch máy/.test(t.tx), t && t.tx.slice(0, 60));
soat("có nút Hỏi Gemini về CÂU", !!t && t.gm.length === 1 && /câu này/.test(t.gm[0]), JSON.stringify(t && t.gm));
soat("không chèn khung gợi ý nào ngoài bản dịch", !!t && !/Thuật ngữ/.test(t.tx));
soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 160));
await ctx.close();
process.exit(ket.every(Boolean) ? 0 : 1);
