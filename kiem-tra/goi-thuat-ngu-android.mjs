/**
 * GÓI THUẬT NGỮ TRÊN ANDROID (WebView mô phỏng).
 *
 *   node kiem-tra/goi-thuat-ngu-android.mjs [thư-mục-android/www]
 *
 * Tra từ chuyên ngành: nghĩa của gói đứng trước nghĩa Google, hiện như nghĩa bình
 * thường; từ chung thì Google trước; màn Tra chỉ còn 3 tab (Dịch gộp vào ô kết quả).
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import path from "node:path";

const www = path.resolve(/android/.test(process.argv[2] || "") ? process.argv[2] : "android/www");
const srv = spawn("python3", ["-m", "http.server", "8773", "-d", www], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const ket = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: "chromium" });
try {
  const c = await b.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await c.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.route(/translate|dictionaryapi|script\.google/, (r) => r.abort());
  await p.goto("http://localhost:8773/index.html"); await cho(1200);
  await p.evaluate(() => {
    window.dichTu = async (t) => ({ main: "MAY:" + t, senses: [], data: null });
    window.fetchDictionary = async () => null;
  });
  const LK = (w, d) => p.evaluate(([w, d]) => lookup(w, d), [w, d]);

  console.log("Tra từ");
  let r = await LK("励磁電流が", "javi");
  soat("Nhật: nghĩa của gói đứng đầu (trợ từ dính vẫn khớp)", r[0].means[0] === "dòng điện kích từ", JSON.stringify(r[0].means));
  soat("không dán nhãn nguồn", r[0].goi === undefined);
  r = await LK("sag", "envi");
  soat("Anh: sag → độ võng đứng đầu", r[0].means[0] === "độ võng", JSON.stringify(r[0].means));
  r = await LK("あう", "javi");
  soat("từ chung: Google trước", /^MAY:/.test(r[0].means[0]), JSON.stringify(r[0].means));
  r = await LK("work", "envi");
  soat("work (từ chung): Google trước", /^MAY:/.test(r[0].means[0]));

  console.log("\nMàn Tra");
  soat("không còn tab Dịch riêng", await p.evaluate(() => !document.getElementById("tabTrans")));
  await p.evaluate(() => { document.querySelector("#navLookup, [data-nav=Lookup]") && document.querySelector("#navLookup, [data-nav=Lookup]").click(); });
  await p.evaluate(async () => { $("dir").value = "envi"; await runLookup("sag"); });
  await cho(600);
  const kq = await p.evaluate(() => ({ li: [...document.querySelectorAll("#result li")].map((x) => x.textContent), tab: document.getElementById("tabWord").textContent.trim() }));
  soat("kết quả hiện nghĩa của gói, không nhãn", kq.li[0] === "độ võng", JSON.stringify(kq));
  soat("không có lỗi trang", errs.length === 0, errs.join(" | ").slice(0, 160));
} finally { await b.close(); srv.kill(); }
process.exit(ket.every(Boolean) ? 0 : 1);
