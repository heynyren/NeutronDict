/**
 * KHÔNG ĐỤNG GÌ VÀO BỐ CỤC CỦA YOUTUBE — dù mở video bằng đường nào.
 *
 * Bảng lời thoại từng kéo theo cả một bộ máy ép khung hình: thu nhỏ trình phát
 * về cỡ đặt trong Cài đặt, gọi setSize(), ép max-width lên bảy lớp khung bọc,
 * nới cột phải chiếm chỗ trống, cộng một chế độ "nổi" ghim bảng tuyệt đối bên
 * mép khung hình cho bố cục một cột.
 *
 * Mỗi mảnh sinh ra để chữa một cảnh hỏng có thật, và mỗi mảnh lại đẻ ra cảnh
 * hỏng mới: bảng rơi xuống dưới video, video biến mất vì khung bọc co về 0,
 * video méo vì thẻ <video> giữ pixel nội tuyến, tiêu đề lệch khỏi khung hình,
 * bảng phình 1300px với mỗi dòng chữ dài 1288px, và bố cục hai cột bị xé nát ở
 * bản 4.9.0. Người dùng bác từng cái một, rồi yêu cầu gỡ sạch và bê nguyên
 * cách của NeuronNote.
 *
 * Bài này khoá đúng điều đó: tìm cột phải, đặt bảng vào đầu cột, HẾT. Khung
 * hình giữ nguyên cỡ, cột phải giữ nguyên bề ngang, <html> không mọc thêm lớp
 * nào, trang không nhận thêm tờ kiểu nào — và hai đường mở video cho ra đúng
 * cùng một bố cục.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(),"pw-")), {
  channel:"chromium", headless:true, args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker",{timeout:20000});
const ket=[], loi=[]; const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
console.log("Bảng lời thoại KHÔNG được đụng vào bố cục YouTube");
for (let i=0;i<40;i++){ const ok=await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false); if(ok)break; await new Promise(r=>setTimeout(r,250)); }

const PR = (v) => ({ videoDetails:{videoId:v,title:"Thử",author:"K"},
  captions:{playerCaptionsTracklistRenderer:{captionTracks:[
    {baseUrl:"https://www.youtube.com/api/timedtext?v="+v,languageCode:"ja",name:{simpleText:"JA"},kind:"asr"}]}} });
await ctx.route("https://www.youtube.com/api/timedtext**", (r) => r.fulfill({ contentType:"application/json",
  body: JSON.stringify({ events:[{tStartMs:1000,dDurationMs:3000,segs:[{utf8:"これは酒です",tOffsetMs:0}]}] }) }));

const PLAYER = (w,h) => `<div id=movie_player class=html5-video-player>
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
  await chrome.storage.local.set({ settings:{ ngu:"ja" }, notebook:{}, phuDeSua:{}, ytKho: kho });
}, KHO);

/** Đo một trang: kích thước, chỗ đặt bảng, và dấu vết mình để lại trên trang. */
const doTrang = (pg) => pg.evaluate(() => {
  const h = document.querySelector("div[data-ndict-yt]");
  const sec = document.querySelector("#secondary");
  const vd = document.querySelector("video.html5-main-video");
  const ln = h && h.shadowRoot ? h.shadowRoot.querySelector(".ln") : null;
  // Tờ kiểu của mình nằm TRONG shadow root; trang chính không được nhận thêm gì.
  const kieuLa = [...document.querySelectorAll("style")]
    .filter((x) => /nd-yt|movie_player|full-bleed/.test(x.textContent || "")).length;
  return {
    bang: h ? Math.round(h.getBoundingClientRect().width) : -1,
    sec: sec ? Math.round(sec.getBoundingClientRect().width) : -1,
    video: vd ? Math.round(vd.getBoundingClientRect().width) : -1,
    dong: ln ? Math.round(ln.getBoundingClientRect().width) : -1,
    ln: h && h.shadowRoot ? h.shadowRoot.querySelectorAll(".ln").length : 0,
    cha: h && h.parentElement ? (h.parentElement.id || h.parentElement.tagName.toLowerCase()) : "KHÔNG CÓ",
    viTri: h ? getComputedStyle(h).position : "",
    lop: document.documentElement.className,
    kieuLa: kieuLa,
    rong: document.documentElement.clientWidth
  };
});
const mo = async (url, nhan) => {
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1920, height: 1000 });
  pg.on("pageerror",(e)=>loi.push(nhan+": "+e.message));
  await pg.goto(url);
  await pg.waitForFunction(() => {
    const h = document.querySelector("div[data-ndict-yt]");
    return h && h.shadowRoot && h.shadowRoot.querySelectorAll(".ln").length > 0;
  }, null, { timeout: 20000 }).catch(()=>{});
  await pg.waitForTimeout(2000);
  return pg;
};

/*
 * Đường "extension" giữ nguyên tham số nd_hoc=1 mà bản cũ gắn vào link. Dấu ấy
 * giờ không còn ai đọc, và bài này soát đúng chuyện đó: có hay không có nó thì
 * bố cục vẫn phải y hệt.
 */
const p1 = await mo("https://www.youtube.com/watch?v=quen&nd_hoc=1", "extension");
const d = await doTrang(p1);
console.log("    [đường extension] cửa sổ " + d.rong + " · video " + d.video
  + " · cột phải " + d.sec + " · bảng " + d.bang + " · một dòng " + d.dong);

soat("bảng có dựng ra và có nội dung", d.ln >= 2, d.ln + " dòng");
soat("bảng nằm trong cột phải của YouTube", d.cha === "secondary-inner", "cha = " + d.cha);
soat("KHUNG HÌNH GIỮ NGUYÊN CỠ — không bó, không setSize, không gì cả",
  d.video === 1280, d.video + "px (trang gốc 1280px)");
soat("CỘT PHẢI GIỮ NGUYÊN 402px của YouTube — không nới, không bó",
  d.sec === 402, d.sec + "px");
soat("nên mỗi dòng lời thoại vừa tầm đọc, không trải ngang màn hình",
  d.dong > 0 && d.dong <= 402, d.dong + "px một dòng");
soat("<html> không mọc thêm lớp nào của mình", d.lop.indexOf("nd-yt") < 0,
  'lớp = "' + d.lop + '"');
soat("trang không nhận thêm tờ kiểu nào đụng tới bố cục",
  d.kieuLa === 0, d.kieuLa + " tờ");
soat("bảng nằm trong dòng chảy bố cục, không ghim tuyệt đối",
  d.viTri !== "absolute" && d.viTri !== "fixed", "position = " + d.viTri);

/*
 * "Cho dù tôi có bật youtube từ đường nào đi chăng nữa." Trước đây hai đường
 * cho ra hai bố cục khác nhau — mở từ app thì hình bị bó, lướt thường thì
 * không — và chính chỗ rẽ nhánh ấy đẻ ra một nửa số lỗi. Giờ không còn nhánh.
 */
await p1.close();
const p2 = await mo("https://www.youtube.com/watch?v=quen", "thường");
const t = await doTrang(p2);
console.log("    [đường thường]   cửa sổ " + t.rong + " · video " + t.video
  + " · cột phải " + t.sec + " · bảng " + t.bang + " · một dòng " + t.dong);
soat("đường thường cho ra ĐÚNG cùng bố cục như đường extension",
  t.video === d.video && t.sec === d.sec && t.cha === d.cha && t.lop === d.lop
    && t.bang === d.bang,
  "video " + t.video + "/" + d.video + " · cột " + t.sec + "/" + d.sec
  + " · bảng " + t.bang + "/" + d.bang);
soat("và cũng không để lại dấu vết nào trên trang",
  t.kieuLa === 0 && t.lop.indexOf("nd-yt") < 0, 'lớp "' + t.lop + '" · ' + t.kieuLa + " tờ kiểu");

soat("không có lỗi trang", loi.length === 0, loi.slice(0,2).join(" | "));
await ctx.close();
const rot = ket.filter((x)=>!x).length;
console.log("\n" + (ket.length-rot) + "/" + ket.length + (rot ? "  — RỚT " + rot : "  — sạch"));
process.exit(rot ? 1 : 0);
