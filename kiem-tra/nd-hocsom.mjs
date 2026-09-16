/**
 * BẤM "HỌC" NGAY KHI VỪA MỞ SỔ THÌ VẪN PHẢI VÀO ĐƯỢC.
 *
 * `items` bắt đầu là mảng rỗng và chỉ có dữ liệu sau khi load() đọc xong kho.
 * Trong khoảng ấy, hangDoi() trả rỗng và app báo "Không có mục nào đến hạn" —
 * trên một quyển sổ đầy từ tới hạn. Người dùng đọc câu ấy rồi đóng app: đúng
 * cái báo lại là "không vào được chế độ học".
 *
 * Khoảng nói dối giãn theo cỡ sổ. Đo trên bản cũ:
 *      40 từ ->   109ms
 *     400 từ ->   569ms
 *   2.000 từ -> 2.864ms
 *
 * Gần ba giây trên một quyển sổ cỡ thật. Đây là loại lỗi "máy này thì được,
 * máy kia thì không" mà chẳng liên quan gì tới mã: máy nào mở sổ chậm hơn một
 * chút — sổ to hơn, đĩa chậm hơn, nhiều extension hơn — thì trúng thường xuyên
 * hơn hẳn.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(),"pw-")), {
  channel:"chromium", headless:true, args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker",{timeout:20000});
const id = sw.url().split("/")[2];
const ket=[], loi=[]; const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
console.log("Bấm Học ngay khi vừa mở sổ");
for (let i=0;i<40;i++){ const ok=await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false); if(ok)break; await new Promise(r=>setTimeout(r,250)); }

const dungSo = (soTu) => sw.evaluate(async ([soTu, now]) => {
  const nb = {};
  for (let i = 0; i < soTu; i++)
    nb["javi:語" + i] = { word:"語"+i, dict:"javi", reading:"ご", means:["nghĩa của từ này"], ts: now - i,
      duong:{ nhin:{ lv:1, ngay:3, due: now - 86400000, ts: now } },
      srs:{ lv:1, due: now - 86400000, ts: now } };
  await chrome.storage.local.set({ notebook: nb, decks:{}, hoc:{}, nhipMs:{},
    settings:{ ngu:"ja", nhip:false, coVu:false, nhacTau:false, tach:false } });
}, [soTu, Date.now()]);

/** Mở sổ rồi bấm Học NGAY, không chờ một nhịp nào. */
const bamNgay = async () => {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => loi.push(e.message));
  await page.goto(`chrome-extension://${id}/notebook.html`);
  const r = await page.evaluate(async () => {
    const t0 = performance.now();
    const b = document.getElementById("study");
    if (!b) return { ok: false, banh: "chưa có nút Học" };
    const chuLucBam = b.textContent;
    b.click();
    /*
     * Đọc NGAY sau click, cùng một nhịp. startStudy chạy đồng bộ tới chỗ await
     * đầu tiên, nên lời báo "đang mở sổ" đã nằm trên nút lúc click() trả về.
     * Dò bằng vòng lặp thì hụt: lượt chờ có khi chỉ 91ms, ngắn hơn một nhịp dò.
     */
    const thayCho = /Đang mở|Opening|開いて/.test(
      (document.getElementById("study").textContent || "")) || !document.getElementById("study").disabled === false;
    for (let i = 0; i < 400; i++) {
      const o = document.getElementById("studyOverlay");
      if (o && o.classList.contains("show")
          && (document.getElementById("stWord").textContent || "").trim())
        return { ok: true, ms: Math.round(performance.now() - t0), thayCho,
                 tu: document.getElementById("stWord").textContent.trim() };
      const t = document.querySelector(".toast");
      if (t && /đến hạn|due/.test(t.textContent || ""))
        return { ok: false, banh: (t.textContent || "").slice(0, 60), chuLucBam };
      await new Promise((x) => setTimeout(x, 50));
    }
    return { ok: false, banh: "không mở được sau 20 giây" };
  });
  await page.close();
  return r;
};

/* ---- sổ nhỏ ---- */
await dungSo(40);
let r = await bamNgay();
soat("sổ 40 từ: bấm ngay vẫn vào được chế độ học", r.ok,
  r.ok ? "mở sau " + r.ms + "ms, thẻ đầu " + r.tu : "HỤT — " + r.banh);

/* ---- sổ CỠ THẬT: đây là chỗ bản cũ hụt chắc chắn ---- */
await dungSo(2000);
for (let lan = 1; lan <= 3; lan++) {
  r = await bamNgay();
  soat("sổ 2000 từ, lần " + lan + ": bấm ngay vẫn vào được", r.ok,
    r.ok ? "mở sau " + r.ms + "ms, thẻ đầu " + r.tu : "HỤT — " + r.banh);
}
soat("và ngay khi bấm thì NÓI RA là đang mở sổ, không đứng câm",
  r.ok && r.thayCho === true,
  r.ok ? (r.thayCho ? "có báo ngay lúc bấm" : "nút đứng câm") : "—");

/* ---- sổ RỖNG thì vẫn phải báo đúng ---- */
await sw.evaluate(async () => {
  await chrome.storage.local.set({ notebook:{}, decks:{}, hoc:{}, nhipMs:{},
    settings:{ ngu:"ja", nhip:false, coVu:false, nhacTau:false, tach:false } });
});
r = await bamNgay();
soat("sổ RỖNG thì vẫn báo 'không có mục nào đến hạn' — đừng chờ mãi",
  !r.ok && /đến hạn/.test(r.banh || ""), r.banh || "(mở được?!)");

soat("không có lỗi trang", loi.length === 0, loi.slice(0,2).join(" | "));
await ctx.close();
const rot = ket.filter((x)=>!x).length;
console.log("\n" + (ket.length-rot) + "/" + ket.length + (rot ? "  — RỚT " + rot : "  — sạch"));
process.exit(rot ? 1 : 0);
