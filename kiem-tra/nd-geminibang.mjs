/**
 * NÚT HỎI GEMINI TRONG BẢNG LỜI THOẠI — và trong tab Dịch của popup.
 *
 *   node kiem-tra/nd-geminibang.mjs /home/user/NeutronDict/extension
 *
 * Hai chỗ này trước giờ KHÔNG có nút hỏi, dù đó đúng là lúc người học vấp: đang
 * nghe dở một câu, hoặc vừa dịch xong một đoạn. Bài này soát đúng những chỗ mà
 * hỏng thì chẳng có gì đỏ lên:
 *
 *   1. Nút có mặt trên từng dòng thoại, và bấm được mà không tua video (nút nằm
 *      trong dòng, mà bấm vào dòng LÀ tua — quên chặn nổi bọt là mỗi lần hỏi
 *      lại nhảy mất chỗ đang xem).
 *   2. Câu hỏi chép ra mang chữ của ĐÚNG dòng ấy. Đây là đường duy nhất câu hỏi
 *      tới được Gemini kể từ khi biết `?q=` không chạy.
 *   3. Dòng ĐÃ SỬA thì hỏi theo BẢN SỬA, không phải bản YouTube nghe nhầm —
 *      hỏng chỗ này thì câu hỏi vẫn đọc trôi, chỉ là hỏi về một câu không ai nói.
 *   4. Lưu TRƯỚC rồi mới hỏi, để nền còn có mục mà gắn link đoạn chat vào.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
// Tên thư mục có CHỮ HOA. Viết thường thì Chromium nạp một đường dẫn không tồn
// tại, không có extension nào, và bài kiểm chết ở lượt chờ service worker với
// thông báo chẳng liên quan gì tới nguyên nhân.
const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(),"pw-")), {
  channel:"chromium", headless:true, args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker",{timeout:20000});
const id = sw.url().split("/")[2];
const ket=[], loi=[]; const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
for (let i=0;i<40;i++){ const ok=await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false); if(ok)break; await new Promise(r=>setTimeout(r,250)); }

const PR = (v) => ({ videoDetails:{videoId:v,title:"Thử",author:"Kênh K"},
  captions:{playerCaptionsTracklistRenderer:{captionTracks:[
    {baseUrl:"https://www.youtube.com/api/timedtext?v="+v,languageCode:"ja",name:{simpleText:"JA"},kind:"asr"}]}} });
await ctx.route("https://www.youtube.com/api/timedtext**", (r) => r.fulfill({ contentType:"application/json",
  body: JSON.stringify({ events:[{tStartMs:1000,dDurationMs:3000,segs:[{utf8:"これは酒です",tOffsetMs:0}]}] }) }));
const trang = (v) => `<!doctype html><meta charset=utf-8><title>T</title>
<style>body{margin:0}#columns{display:flex}#primary{flex:1}#secondary{width:402px}</style><body>
<ytd-watch-flexy><div id=columns>
 <div id=primary><div id=player><div id=movie_player class=html5-video-player>
  <div class=html5-video-container><video class="video-stream html5-main-video"
   style="width:1280px;height:720px"></video></div></div></div>
  <div id=below><h1 id=tieude>Tiêu đề</h1></div></div>
 <div id=secondary><div id=secondary-inner></div></div>
</div></ytd-watch-flexy>
<script>document.getElementById("movie_player").getPlayerResponse=()=>(${JSON.stringify(PR(v))});</script>`;
// Nền sẽ mở tab Gemini thật — chặn lại, không thì bài test đi ra mạng.
await ctx.route("https://gemini.google.com/**", (r) =>
  r.fulfill({ contentType:"text/html; charset=utf-8", body:"<!doctype html><title>G</title>ok" }));
await ctx.grantPermissions(["clipboard-read","clipboard-write"], { origin:"https://www.youtube.com" });
await ctx.route("https://www.youtube.com/watch**", (r) => {
  const v = new URL(r.request().url()).searchParams.get("v") || "quen";
  r.fulfill({ contentType:"text/html; charset=utf-8", body: trang(v) });
});

// Dòng thứ hai mang sẵn một bản SỬA — đúng hình dạng lượt đồng bộ ghi xuống.
const SUA = { quen: { d: { "4": "CÂU NÀY ĐÃ SỬA TAY" }, ts: Date.now() } };
const KHO = { "quen|ja:auto": { ts: Date.now(),
  cau: [{ s:"これは酒です。", t:1, tEnd:4 }, { s:"とても美味しい。", t:4, tEnd:7 }],
  dich: { 0:"Đây là rượu.", 1:"Rất ngon." }, tieuDe:"Thử", kenh:"Kênh K" } };
await sw.evaluate(async ([kho, sua]) => {
  await chrome.storage.local.set({ settings:{ ngu:"ja" }, notebook:{}, phuDeSua: sua, ytKho: kho });
}, [KHO, SUA]);

const page = await ctx.newPage();
await page.setViewportSize({ width: 1600, height: 950 });
page.on("pageerror",(e)=>loi.push(e.message));
await page.goto("https://www.youtube.com/watch?v=quen");
await page.waitForFunction(() => {
  const h = document.querySelector("div[data-ndict-yt]");
  return h && h.shadowRoot && h.shadowRoot.querySelectorAll(".ln").length > 0;
}, null, { timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(1500);

const trong = (fn, arg) => page.evaluate(([f, a]) => {
  const h = document.querySelector("div[data-ndict-yt]");
  if (!h || !h.shadowRoot) return null;
  return new Function("r", "a", f)(h.shadowRoot, a);
}, [fn, arg === undefined ? null : arg]);

/*
 * Bảng lời thoại là CONTENT SCRIPT: nó chạy ở thế giới cô lập, có `navigator`
 * riêng. Vá navigator.clipboard ở main world như các bài khác vẫn làm thì bẫy
 * không bao giờ nổ — nút vẫn chép, chỉ là chép vào chỗ ta không nhìn thấy. Nên
 * ở đây dùng BỘ NHỚ TẠM THẬT và đọc lại nó.
 */
await page.evaluate(() => { try { navigator.clipboard.writeText(""); } catch (e) {} });
const docChep = () => page.evaluate(() => navigator.clipboard.readText().catch(() => ""));

console.log("\nNút Gemini trên từng dòng thoại");
const soNut = await trong(`return r.querySelectorAll(".ln .sv.gm").length`);
const soDong = await trong(`return r.querySelectorAll(".ln").length`);
soat("mỗi dòng có một nút Gemini", soNut > 0 && soNut === soDong, soNut + "/" + soDong);

const tuaTruoc = await page.evaluate(() => document.querySelector("video").currentTime);
await trong(`r.querySelectorAll(".ln")[0].querySelector(".sv.gm").click()`);
await page.waitForTimeout(1200);
const tuaSau = await page.evaluate(() => document.querySelector("video").currentTime);
soat("bấm nút KHÔNG tua video", tuaTruoc === tuaSau, tuaTruoc + " → " + tuaSau);

const hoi1 = await docChep();
soat("câu hỏi đã vào bộ nhớ tạm", hoi1.length > 100, hoi1.length + " ký tự");
soat("và mang chữ của ĐÚNG dòng vừa bấm", hoi1.includes("これは酒です"), hoi1.slice(0,60));
soat("kèm bản dịch đã có", hoi1.includes("Đây là rượu"));
soat("kèm nguồn video", /youtube\.com\/watch/.test(hoi1));

console.log("\nDòng ĐÃ SỬA thì hỏi theo bản sửa");
const chuDong2 = await trong(`return r.querySelectorAll(".ln")[1].querySelector(".tx").textContent`);
soat("dòng 2 đang hiện bản sửa", /ĐÃ SỬA TAY/.test(chuDong2 || ""), (chuDong2||"").slice(0,50));
await trong(`r.querySelectorAll(".ln")[1].querySelector(".sv.gm").click()`);
await page.waitForTimeout(1200);
const hoi2 = await docChep();
soat("câu hỏi lấy BẢN SỬA", hoi2.includes("CÂU NÀY ĐÃ SỬA TAY"), hoi2.slice(0,80));
soat("và KHÔNG lấy bản YouTube nghe nhầm", !hoi2.includes("とても美味しい"),
  hoi2.includes("とても美味しい") ? "vẫn còn bản gốc" : "sạch");

console.log("\nLưu trước rồi mới hỏi (để có chỗ gắn link đoạn chat)");
const nb = await sw.evaluate(async () => (await chrome.storage.local.get("notebook")).notebook || {});
const khoa = Object.keys(nb);
soat("câu đã được lưu vào sổ tay", khoa.length >= 1, khoa.length + " mục: " + JSON.stringify(khoa).slice(0,90));
soat("mục lưu đúng bản SỬA", khoa.some(k => /ĐÃ SỬA TAY/.test(k)), JSON.stringify(khoa).slice(0,90));
const cho = await sw.evaluate(async () => (await chrome.storage.local.get("geminiCho")).geminiCho || {});
soat("nền đang canh tab để gắn link chat", Object.keys(cho).length >= 1, JSON.stringify(cho).slice(0,90));

console.log("\nTab Dịch trong popup");
const pop = await ctx.newPage();
pop.on("pageerror",(e)=>loi.push(e.message));
await pop.goto(`chrome-extension://${id}/popup.html`);
await pop.waitForTimeout(800);
const coHam = await pop.evaluate(() => typeof window.nutGemini === "function");
soat("popup có dựng nút Gemini cho tab Dịch", coHam);
const coMod = await pop.evaluate(() => !!(window.HoiGemini && window.HoiGemini.loiHoi));
soat("popup nạp được hoi-gemini.js", coMod);
const nutOK = await pop.evaluate(() => {
  if (typeof window.nutGemini !== "function") return null;
  const b = window.nutGemini({ word: "テスト", reading: "", means: ["thử"], kind: "sent" }, null);
  return { tag: b.tagName, cls: b.className, co: !!b.querySelector("svg, span"), tip: b.title };
});
soat("nút dựng ra là <button> đúng kiểu", !!nutOK && nutOK.tag === "BUTTON" && /iconbtn/.test(nutOK.cls),
  JSON.stringify(nutOK));
soat("và nói rõ phải lưu thì link chat mới giữ được",
  !!nutOK && /lưu vào sổ/.test(nutOK.tip || ""), (nutOK && nutOK.tip || "").slice(0, 70));

soat("không có lỗi trang", loi.length === 0, loi.join(" | ").slice(0, 160));

const dat = ket.filter(Boolean).length;
console.log(`\n${dat}/${ket.length}  — ` + (dat === ket.length ? "sạch" : "CÓ CHỖ HỎNG"));
await ctx.close();
process.exit(dat === ket.length ? 0 : 1);
