/**
 * BỀ NGANG BẢNG LỜI THOẠI — bảng phải ĐỌC ĐƯỢC, không trải hết màn hình.
 *
 * Cảnh trong ảnh người dùng gửi: mở YouTube TỪ EXTENSION (nd_hoc=1) trên màn
 * hình rộng. Khung hình bị thu về 620px theo Cài đặt, và toàn bộ chỗ trống dôi
 * ra bị cột phải nuốt sạch — bảng rộng hơn 1200px, mỗi dòng tiếng Nhật kéo dài
 * gần hết chiều ngang. Đọc xong một dòng phải quét mắt ngược một quãng rất xa
 * mới tới đầu dòng sau. Đó chính là "ui ra rất xấu".
 *
 * NeuronNote KHÔNG hề đụng vào #secondary — bảng bên ấy nằm trong cột 402px
 * mặc định của YouTube nên bao giờ cũng vừa tầm đọc.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(),"pw-")), {
  channel:"chromium", headless:true, args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker",{timeout:20000});
const ket=[], loi=[]; const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
console.log("Bảng lời thoại: cột chữ vừa tầm mắt, không trải cả trang");
for (let i=0;i<40;i++){ const ok=await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false); if(ok)break; await new Promise(r=>setTimeout(r,250)); }

const PR = (v) => ({ videoDetails:{videoId:v,title:"Thử",author:"K"},
  captions:{playerCaptionsTracklistRenderer:{captionTracks:[
    {baseUrl:"https://www.youtube.com/api/timedtext?v="+v,languageCode:"ja",name:{simpleText:"JA"},kind:"asr"}]}} });
await ctx.route("https://www.youtube.com/api/timedtext**", (r) => r.fulfill({ contentType:"application/json",
  body: JSON.stringify({ events:[{tStartMs:1000,dDurationMs:3000,segs:[{utf8:"これは酒です",tOffsetMs:0}]}] }) }));

/* Bố cục HAI CỘT bình thường của YouTube trên màn rộng. */
const PLAYER = (w,h) => `<div id=movie_player class=html5-video-player style="--x:1">
  <div class=html5-video-container><video class="video-stream html5-main-video"
       style="width:${w}px;height:${h}px;left:0;top:0"></video></div></div>`;
const trang = (v) => `<!doctype html><meta charset=utf-8><title>T</title>
<style>body{margin:0}#columns{display:flex}#primary{flex:1}#secondary{width:402px}</style><body>
<ytd-watch-flexy>
 <div id=columns>
  <div id=primary class=ytd-watch-flexy>
   <div id=player-container-outer><div id=player>${PLAYER(1280,720)}</div></div>
   <div id=below><h1 id=tieude>Tiêu đề</h1><div style="height:400px">Mô tả</div></div>
  </div>
  <div id=secondary class=ytd-watch-flexy><div id=secondary-inner></div></div>
 </div>
</ytd-watch-flexy>
<script>document.getElementById("movie_player").getPlayerResponse=()=>(${JSON.stringify(PR(v))});</script>`;
await ctx.route("https://www.youtube.com/watch**", (r) => {
  const v = new URL(r.request().url()).searchParams.get("v") || "quen";
  r.fulfill({ contentType:"text/html; charset=utf-8", body: trang(v) });
});

const KHO = { "quen|ja:auto": { ts: Date.now(),
  cau: [{ s:"これは酒です。", t:1, tEnd:4 }, { s:"とても美味しいお酒ですね、本当に。", t:4, tEnd:7 }],
  dich: { 0:"Đây là rượu.", 1:"Rượu rất ngon." }, tieuDe:"Thử", kenh:"K" } };
await sw.evaluate(async (kho) => {
  await chrome.storage.local.set({ settings:{ ngu:"ja", ytNho:true, ytNhoW:620 },
    notebook:{}, phuDeSua:{}, ytKho: kho });
}, KHO);

const page = await ctx.newPage();
await page.setViewportSize({ width: 1920, height: 1000 });
page.on("pageerror",(e)=>loi.push("trang: "+e.message));
await page.goto("https://www.youtube.com/watch?v=quen&nd_hoc=1");
await page.waitForFunction(() => {
  const h = document.querySelector("div[data-ndict-yt]");
  return h && h.shadowRoot && h.shadowRoot.querySelectorAll(".ln").length > 0;
}, null, { timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(2500);

const d = await page.evaluate(() => {
  const h = document.querySelector("div[data-ndict-yt]");
  const sec = document.querySelector("#secondary");
  const vd = document.querySelector("video.html5-main-video");
  const ln = h && h.shadowRoot ? h.shadowRoot.querySelector(".ln") : null;
  return {
    bang: h ? Math.round(h.getBoundingClientRect().width) : -1,
    sec: sec ? Math.round(sec.getBoundingClientRect().width) : -1,
    video: vd ? Math.round(vd.getBoundingClientRect().width) : -1,
    dong: ln ? Math.round(ln.getBoundingClientRect().width) : -1,
    ln: h && h.shadowRoot ? h.shadowRoot.querySelectorAll(".ln").length : 0,
    vTrai: vd ? Math.round(vd.getBoundingClientRect().left) : -1,
    vPhai: vd ? Math.round(vd.getBoundingClientRect().right) : -1,
    bTrai: h ? Math.round(h.getBoundingClientRect().left) : -1,
    rong: document.documentElement.clientWidth
  };
});
console.log("    cửa sổ " + d.rong + " · video " + d.video + " · cột phải " + d.sec
  + " · bảng " + d.bang + " · một dòng " + d.dong);

soat("bảng có dựng ra và có nội dung", d.ln >= 2, d.ln + " dòng");
soat("khung hình vẫn được thu nhỏ theo Cài đặt", d.video > 0 && d.video <= 621,
  d.video + "px (đặt 620)");
/*
 * 700px là trần rộng rãi: cột 402px mặc định của YouTube nhân rưỡi vẫn còn
 * trong tầm một cột chữ đọc được. Quá đó thì mắt phải quét ngang quá xa, và
 * bảng trông như một tờ giấy trải ngang màn hình — đúng cái ảnh đã gửi.
 */
soat("bảng KHÔNG trải hết chiều ngang màn hình", d.bang > 0 && d.bang <= 700,
  d.bang + "px trên cửa sổ " + d.rong + "px");
soat("và mỗi dòng lời thoại vẫn trong tầm đọc", d.dong > 0 && d.dong <= 700,
  d.dong + "px một dòng");
soat("vẫn rộng hơn cột 402px mặc định — có dùng chỗ trống dôi ra", d.sec > 402, d.sec + "px");
/*
 * Bó cột phải lại thì chỗ trống dồn sang #primary. Nếu để khung hình canh giữa
 * cột ấy thì giữa hình và bảng hở ra một khoảng rộng, nhìn rời rạc — hai thứ
 * phải đi với nhau mới xem-và-đọc cùng lúc được.
 */
soat("khung hình và bảng đứng cạnh nhau, không hở một khoảng lớn ở giữa",
  d.bTrai - d.vPhai <= 40,
  "hình hết ở " + d.vPhai + " · bảng bắt đầu ở " + d.bTrai
  + " (hở " + (d.bTrai - d.vPhai) + "px)");

/* ---- đường THƯỜNG (không nd_hoc): không thu nhỏ, không đụng cột phải ---- */
/*
 * Trần bề ngang chỉ được áp khi ĐANG thu nhỏ khung hình — tức là thẻ do app mở
 * ra để học. Lướt YouTube bình thường mà cột phải bị mình bóp lại thì đó là phá
 * trang của người ta, y như chuyện thu nhỏ khung hình đã bị bác một lần.
 */
await page.close();
const p2 = await ctx.newPage();
await p2.setViewportSize({ width: 1920, height: 1000 });
p2.on("pageerror",(e)=>loi.push("thường: "+e.message));
await p2.goto("https://www.youtube.com/watch?v=quen");
await p2.waitForFunction(() => {
  const h = document.querySelector("div[data-ndict-yt]");
  return h && h.shadowRoot && h.shadowRoot.querySelectorAll(".ln").length > 0;
}, null, { timeout: 20000 }).catch(()=>{});
await p2.waitForTimeout(1800);
const t = await p2.evaluate(() => {
  const vd = document.querySelector("video.html5-main-video");
  const sec = document.querySelector("#secondary");
  return { video: vd ? Math.round(vd.getBoundingClientRect().width) : -1,
           sec: sec ? Math.round(sec.getBoundingClientRect().width) : -1,
           lop: document.documentElement.className };
});
soat("đường thường: khung hình GIỮ NGUYÊN, không bị bó",
  t.video === 1280, t.video + "px (trang gốc 1280px)");
soat("và cột phải giữ đúng 402px của YouTube — mình không đụng vào",
  t.sec === 402, t.sec + "px · lớp \"" + t.lop + "\"");

soat("không có lỗi trang", loi.length === 0, loi.slice(0,2).join(" | "));
await ctx.close();
const rot = ket.filter((x)=>!x).length;
console.log("\n" + (ket.length-rot) + "/" + ket.length + (rot ? "  — RỚT " + rot : "  — sạch"));
process.exit(rot ? 1 : 0);
