/**
 * BẢNG LỜI THOẠI VẪN CHẠY ĐỦ SAU KHI GỠ BỘ MÁY ÉP KHUNG HÌNH.
 *
 * Lượt gỡ ấy xoá hơn năm trăm dòng khỏi phu-de.js, trong đó có cả một nút trên
 * thanh tiêu đề và hai mục Cài đặt. Bài này soát những thứ CÒN LẠI phải còn
 * nguyên: nút trên thanh, đổi cỡ chữ, song ngữ, bám dòng, tìm, lưu từ, đóng.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(),"pw-")), {
  channel:"chromium", headless:true, args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker",{timeout:20000});
const ket=[], loi=[]; const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
console.log("Bảng lời thoại: các nút và thao tác còn nguyên");
for (let i=0;i<40;i++){ const ok=await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false); if(ok)break; await new Promise(r=>setTimeout(r,250)); }

const PR = (v) => ({ videoDetails:{videoId:v,title:"Thử",author:"K"},
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
await ctx.route("https://www.youtube.com/watch**", (r) => {
  const v = new URL(r.request().url()).searchParams.get("v") || "quen";
  r.fulfill({ contentType:"text/html; charset=utf-8", body: trang(v) });
});
const KHO = { "quen|ja:auto": { ts: Date.now(),
  cau: [{ s:"これは酒です。", t:1, tEnd:4 }, { s:"とても美味しい。", t:4, tEnd:7 }],
  dich: { 0:"Đây là rượu.", 1:"Rất ngon." }, tieuDe:"Thử", kenh:"K" } };
await sw.evaluate(async (kho) => {
  await chrome.storage.local.set({ settings:{ ngu:"ja" }, notebook:{}, phuDeSua:{}, ytKho: kho });
}, KHO);

const page = await ctx.newPage();
await page.setViewportSize({ width: 1600, height: 950 });
page.on("pageerror",(e)=>loi.push(e.message));
await page.goto("https://www.youtube.com/watch?v=quen");
await page.waitForFunction(() => {
  const h = document.querySelector("div[data-ndict-yt]");
  return h && h.shadowRoot && h.shadowRoot.querySelectorAll(".ln").length > 0;
}, null, { timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(1500);

/** Chạy một đoạn bên trong shadow root của bảng. */
const trong = (fn, arg) => page.evaluate(([f, a]) => {
  const h = document.querySelector("div[data-ndict-yt]");
  if (!h || !h.shadowRoot) return null;
  return new Function("r", "a", f)(h.shadowRoot, a);
}, [fn, arg === undefined ? null : arg]);

const nut = await trong(`return [...r.querySelectorAll(".top .chip")].map(b => b.title || b.textContent)`);
soat("thanh tiêu đề còn đủ nút", !!nut && nut.length >= 4, JSON.stringify(nut));
soat("và KHÔNG còn nút cỡ khung hình",
  !!nut && !nut.some((x) => /khung hình|Thu nhỏ hình/i.test(x || "")), JSON.stringify(nut));

const co1 = await trong(`return r.querySelector(".box").style.getPropertyValue("--cx")`);
await trong(`[...r.querySelectorAll(".top .chip")].find(b=>/Cỡ chữ/.test(b.title||"")).click()`);
await page.waitForTimeout(400);
const co2 = await trong(`return r.querySelector(".box").style.getPropertyValue("--cx")`);
soat("đổi cỡ chữ vẫn chạy", co1 !== co2, co1 + " → " + co2);

await trong(`[...r.querySelectorAll(".chip")].find(b=>/Song ngữ/.test(b.textContent||"")).click()`);
await page.waitForTimeout(500);
const song = await trong(`return r.querySelectorAll(".ln .vi, .ln .dich").length`);
soat("nút Song ngữ vẫn hiện bản dịch", song >= 1, song + " dòng có bản dịch");

await trong(`const o=r.querySelector(".find"); o.value="美味"; o.dispatchEvent(new Event("input",{bubbles:true}))`);
await page.waitForTimeout(500);
const tim = await trong(`return [...r.querySelectorAll(".ln")].filter(x=>x.style.display!=="none").length`);
soat("ô Tìm vẫn lọc được dòng", tim === 1, "còn " + tim + " dòng");
await trong(`const o=r.querySelector(".find"); o.value=""; o.dispatchEvent(new Event("input",{bubbles:true}))`);
await page.waitForTimeout(300);

/*
 * `chrome.storage` không có trong thế giới của TRANG (content script chạy ở
 * thế giới riêng), nên đừng hỏi kho từ đây. Soát đúng thứ nhìn thấy được:
 * bấm vào một dòng thì hàng thao tác hiện ra.
 */
await trong(`r.querySelector(".ln").click()`);
await page.waitForTimeout(500);
const thaoTac = await trong(
  `return [...r.querySelectorAll("button")].map(b=>(b.textContent||"").trim()).filter(Boolean)`);
soat("bấm vào một dòng thì hiện được hàng thao tác (Lưu / Sửa)",
  !!thaoTac && thaoTac.some((x) => /Lưu/.test(x)) && thaoTac.some((x) => /Sửa/.test(x)),
  JSON.stringify((thaoTac || []).slice(0, 8)));

await trong(`[...r.querySelectorAll(".top .chip")].find(b=>/Đóng bảng/.test(b.title||"")).click()`);
await page.waitForTimeout(600);
const conBang = await page.evaluate(() => !!document.querySelector("div[data-ndict-yt]"));
soat("nút Đóng vẫn gỡ được bảng", !conBang);
const sach = await page.evaluate(() => ({
  lop: document.documentElement.className,
  video: Math.round(document.querySelector("video.html5-main-video").getBoundingClientRect().width)
}));
soat("đóng xong trang trở lại y nguyên, không sót dấu vết",
  sach.lop.indexOf("nd-yt") < 0 && sach.video === 1280,
  'lớp "' + sach.lop + '" · video ' + sach.video + "px");

soat("không có lỗi trang", loi.length === 0, loi.slice(0,2).join(" | "));
await ctx.close();
const rot = ket.filter((x)=>!x).length;
console.log("\n" + (ket.length-rot) + "/" + ket.length + (rot ? "  — RỚT " + rot : "  — sạch"));
process.exit(rot ? 1 : 0);
