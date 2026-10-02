/**
 * NGỮ CẢNH + BẢN DỊCH NẰM NGAY SAU NGHĨA — đo trên extension thật.
 *
 *   node kiem-tra/nd-ngucanh.mjs /home/user/NeutronDict/extension
 *
 *   1. CauNghe.hienThi chọn đúng câu, đúng bản dịch, đúng chỗ tô đậm; bỏ qua mục
 *      là CÂU và câu quá dài.
 *   2. Sổ tay: khối .nguc đứng LIỀN SAU dòng nghĩa (.m), từ được tô trong <mark>.
 *   3. Mục chỉ có ngữ cảnh gốc (src.cau, không có cauNghe): DICH_NGU_CANH dịch và
 *      lưu vào src.cauDich, không đụng `ts`.
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
const ket = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };
for (let i = 0; i < 40; i++) {
  if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
}

console.log("CauNghe.hienThi");
const h = await sw.evaluate(() => {
  const C = self.CauNghe;
  return {
    a: C.hienThi({ word: "interest", dict: "envi", cauNghe: { cau: "The bank raised interest rates.", dich: "Ngân hàng tăng lãi suất." } }),
    b: C.hienThi({ word: "interest", dict: "envi", src: { cau: "The bank raised interest rates.", cauDich: "Dịch B" } }),
    c: C.hienThi({ word: "Hello there", dict: "envi", kind: "sent", src: { cau: "Hello there" } }),
    d: C.hienThi({ word: "x", dict: "envi", src: { cau: "y ".repeat(400) } }),
    e: C.hienThi({ word: "interest", dict: "envi", del: 1, src: { cau: "interest" } })
  };
});
soat("lấy câu + bản dịch của cauNghe", h.a && h.a.dich === "Ngân hàng tăng lãi suất.");
soat("tô đúng vị trí của từ", h.a && h.a.cau.slice(h.a.tu[0], h.a.tu[1]) === "interest", JSON.stringify(h.a && h.a.tu));
soat("không có cauNghe thì lấy src.cau và src.cauDich", h.b && h.b.cau.includes("interest") && h.b.dich === "Dịch B");
soat("mục là CÂU thì bỏ qua", h.c === null);
soat("câu quá dài thì bỏ qua", h.d === null);
soat("mục đã xoá thì bỏ qua", h.e === null);

console.log("\nSổ tay: ngữ cảnh liền sau nghĩa");
const now = Date.now();
await sw.evaluate(async (now) => {
  await chrome.storage.local.set({ settings: { ngu: "en" }, notebook: {
    "envi:interest": { word: "interest", dict: "envi", reading: "", means: ["lãi suất"], ts: now,
      src: { url: "https://x.test", title: "t", sel: "interest", cau: "The bank raised interest rates." },
      cauNghe: { cau: "The bank raised interest rates.", dich: "Ngân hàng tăng lãi suất.", ts: now } },
    "envi:leverage": { word: "leverage", dict: "envi", reading: "", means: ["đòn bẩy"], ts: now,
      src: { url: "https://x.test", title: "t", sel: "leverage", cau: "Firms use leverage to boost returns." } }
  } });
}, now);
const nb = await ctx.newPage();
const loi = [];
nb.on("pageerror", (e) => loi.push(e.message));
await nb.goto(`chrome-extension://${ID}/notebook.html`);
await nb.waitForSelector(".entry", { timeout: 8000 });
const d = await nb.evaluate(() => [...document.querySelectorAll(".entry")].map((e) => {
  const m = e.querySelector(".m");
  const n = m && m.nextElementSibling;
  return {
    word: (e.querySelector(".w, .word, h3, b") || {}).textContent,
    ngucLienSau: !!(n && n.classList.contains("nguc")),
    tu: n && n.querySelector("mark.nguc-tu") && n.querySelector("mark.nguc-tu").textContent,
    dich: n && n.querySelector(".nguc-dich") && n.querySelector(".nguc-dich").textContent,
    html: e.textContent.slice(0, 200)
  };
}));
const a = d.find((x) => /interest/.test(x.html)), b = d.find((x) => /leverage/.test(x.html));
soat("khối ngữ cảnh đứng LIỀN SAU dòng nghĩa", a && a.ngucLienSau);
soat("từ được tô trong <mark>", a && a.tu === "interest", a && a.tu);
soat("bản dịch hiện ngay trong khối", a && a.dich === "Ngân hàng tăng lãi suất.", a && a.dich);
soat("mục chưa có bản dịch vẫn hiện câu và có nút 'Dịch câu'", b && b.ngucLienSau && /Dịch câu/.test(b.dich || ""), b && b.dich);

console.log("\nDịch câu ngữ cảnh theo yêu cầu");
await sw.evaluate(() => {
  self.dichChuoi = async (t) => "DỊCH:" + t;
});
const r = await sw.evaluate(() => dichNguCanh("envi:leverage"));
const sau = await sw.evaluate(async () => (await chrome.storage.local.get("notebook")).notebook["envi:leverage"]);
soat("trả về bản dịch", r === "DỊCH:Firms use leverage to boost returns.", r);
// Mở sổ tay đã kích lượt bồi nền: câu đủ điều kiện làm bài nghe thì được dựng
// `cauNghe` và bản dịch nằm ở đó; chỉ câu không đủ điều kiện mới vào src.cauDich.
soat("bản dịch được lưu (cauNghe.dich hoặc src.cauDich)", (sau.cauNghe && sau.cauNghe.dich === r) || (sau.src && sau.src.cauDich === r),
  JSON.stringify({ cauNghe: sau.cauNghe && sau.cauNghe.dich, cauDich: sau.src && sau.src.cauDich }));
soat("KHÔNG đụng ts (máy tự bồi, không phải người sửa)", sau.ts === now);
const dai = "Because the committee wanted to understand every possible consequence of the policy, " +
  "it commissioned three independent studies, each of which examined a different aspect of how a sudden " +
  "change in interest costs could ripple through households, small firms and large lenders alike over many years";
await sw.evaluate(async ([dai, now]) => {
  const o = await chrome.storage.local.get("notebook"); const n = o.notebook;
  n["envi:ripple"] = { word: "ripple", dict: "envi", means: ["gợn sóng"], ts: now, src: { url: "https://x.test", sel: "ripple", cau: dai } };
  await chrome.storage.local.set({ notebook: n });
}, [dai, now]);
const r3 = await sw.evaluate(() => dichNguCanh("envi:ripple"));
const s3 = await sw.evaluate(async () => (await chrome.storage.local.get("notebook")).notebook["envi:ripple"]);
soat("câu dài (không làm bài nghe): dịch và lưu vào src.cauDich", r3 && s3.src.cauDich === r3 && !s3.cauNghe && s3.ts === now, r3 && r3.slice(0, 30));
const r2 = await sw.evaluate(() => dichNguCanh("envi:leverage"));
soat("lượt sau lấy luôn bản đã lưu, không dịch lại", r2 === r);

console.log(loi.length ? "LỖI JS:\n" + loi.join("\n") : "  không có lỗi JS");
const sai = ket.filter((x) => !x).length;
console.log("\n" + (ket.length - sai) + "/" + ket.length + (sai || loi.length ? "  — CÓ LỖI" : "  — sạch"));
await ctx.close();
process.exit(sai || loi.length ? 1 : 0);
