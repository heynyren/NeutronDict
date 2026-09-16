/**
 * HAI MÁY CÙNG MỘT URL PHẢI CHÉP ĐƯỢC CHO NHAU.
 *
 * Báo lại: extension trên Windows và trên Mac dùng chung một URL Apps Script mà
 * không đồng bộ hết với nhau.
 *
 * Bài này dựng hẳn hai hồ sơ trình duyệt riêng — hai "máy" thật, hai kho
 * chrome.storage tách biệt — cùng trỏ vào một máy chủ giả đóng vai Apps Script,
 * rồi bắt chúng chép qua chép lại.
 *
 * Chỗ hỏng thật nằm ở Muc.tron: nó gọi `goc.Srs` trong một tệp bọc bằng
 * (function (root){...}), nên mọi mục CÓ `duong` — tức mọi từ đã từng được ôn —
 * đều ném ReferenceError và kéo đổ cả lượt gộp. Lỗi ấy im lặng vì syncTatCa
 * nuốt rồi trả 0: giao diện báo "đồng bộ xong, 0 mục", nhìn y như một lượt sạch.
 */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { createServer } from "node:http";
const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ket=[]; const soat=(t,d,c)=>{ket.push(d);console.log("  "+(d?"✓":"✗")+" "+t+(c?"  ("+c+")":""));};
console.log("Đồng bộ giữa HAI máy qua cùng một URL");

/* --- máy chủ giả: giữ đúng một gói, y như Apps Script --- */
let cloud = null, soLuotGhi = 0;
const srv = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    let m = {};
    try { m = JSON.parse(body || "{}"); } catch (e) { m = {}; }
    res.setHeader("Content-Type", "application/json");
    if (m.action === "load") return res.end(JSON.stringify({ ok: true, data: cloud || {} }));
    if (m.action === "save") { cloud = m.data || {}; soLuotGhi++; return res.end(JSON.stringify({ ok: true })); }
    res.end(JSON.stringify({ ok: false, error: "unknown action" }));
  });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const URL_CLOUD = "http://127.0.0.1:" + srv.address().port + "/exec";

/** Dựng một "máy": hồ sơ trình duyệt riêng, kho riêng. */
async function may(ten) {
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-" + ten + "-")), {
    channel:"chromium", headless:true, args:[`--disable-extensions-except=${EXT}`,`--load-extension=${EXT}`] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker",{timeout:20000});
  for (let i=0;i<40;i++){ const ok=await sw.evaluate(()=>!!(chrome.storage&&chrome.storage.local)).catch(()=>false); if(ok)break; await new Promise(r=>setTimeout(r,250)); }
  return { ctx, sw, ten };
}
const dat = (m, o) => m.sw.evaluate(async (o) => { await chrome.storage.local.set(o); }, o);
const doc = (m, k) => m.sw.evaluate(async (k) => (await chrome.storage.local.get(k))[k], k);
/** Bấm "Đồng bộ" đúng như giao diện làm. */
const dongBo = (m) => m.sw.evaluate(async () => {
  try { return { ok: true, n: await syncTatCa() }; }
  catch (e) { return { ok: false, loi: String((e && e.message) || e) }; }
});

const W = await may("win"), M = await may("mac");
const now = Date.now();
// Cả hai máy khai CÙNG một URL kho chung.
for (const m of [W, M]) await dat(m, { syncUrlChung: URL_CLOUD, syncTokenChung: "x",
  settings:{ ngu:"ja" }, decks:{}, hoc:{} });

/* Máy Windows: một từ ĐÃ ÔN (có `duong`) — đúng cảnh làm vỡ phép gộp. */
await dat(W, { notebook: {
  "javi:改善": { word:"改善", dict:"javi", reading:"かいぜん", means:["cải thiện"], ts: now,
    duong:{ nhin:{ lv:3, ngay:14, due: now+9e8, ts: now } }, srs:{ lv:3, due: now+9e8, ts: now } }
} });
/* Máy Mac: một từ khác, cũng đã ôn. */
await dat(M, { notebook: {
  "javi:勉強": { word:"勉強", dict:"javi", reading:"べんきょう", means:["học"], ts: now,
    duong:{ nhin:{ lv:1, ngay:3, due: now+9e8, ts: now } }, srs:{ lv:1, due: now+9e8, ts: now } }
} });

const r1 = await dongBo(W);
soat("máy Windows đồng bộ KHÔNG báo lỗi", r1.ok, r1.ok ? r1.n + " mục" : "LỖI — " + r1.loi);
const r2 = await dongBo(M);
soat("máy Mac đồng bộ KHÔNG báo lỗi", r2.ok, r2.ok ? r2.n + " mục" : "LỖI — " + r2.loi);
const r3 = await dongBo(W);   // lượt hai: Windows kéo về phần của Mac
soat("Windows đồng bộ lần hai cũng sạch", r3.ok, r3.ok ? r3.n + " mục" : "LỖI — " + r3.loi);

const nbW = await doc(W, "notebook"), nbM = await doc(M, "notebook");
soat("máy Mac nhận được từ của máy Windows",
  !!(nbM && nbM["javi:改善"]), Object.keys(nbM || {}).join(", ") || "(rỗng)");
soat("máy Windows nhận được từ của máy Mac",
  !!(nbW && nbW["javi:勉強"]), Object.keys(nbW || {}).join(", ") || "(rỗng)");
soat("và kho chung giữ CẢ HAI",
  !!(cloud && cloud.notebook && cloud.notebook["javi:改善"] && cloud.notebook["javi:勉強"]),
  Object.keys((cloud || {}).notebook || {}).join(", ") || "(rỗng)");

/* --- tiến độ ôn của TỪNG ĐƯỜNG phải đi theo, không bị bên kia đè --- */
const coDe = await M.sw.evaluate(async (now) => {
  const { notebook } = await chrome.storage.local.get("notebook");
  // Mac ôn bài NGHE của 改善; Windows chưa từng ôn đường ấy.
  // Mục này chỉ có mặt nếu lượt đồng bộ trên KIA chạy được — bản hỏng thì không,
  // nên phải né ra thay vì ném, để phần rớt phía trên còn đọc được.
  if (!notebook["javi:改善"]) return false;
  notebook["javi:改善"].duong.nghe = { lv: 5, ngay: 60, due: now + 9e8, ts: now + 1000 };
  notebook["javi:改善"].ts = now + 1000;
  await chrome.storage.local.set({ notebook });
  return true;
}, now);
await dongBo(M);
await dongBo(W);
const sau = (await doc(W, "notebook")) || {};
const d = (sau["javi:改善"] || {}).duong || {};
if (!coDe) console.log("    (bỏ qua phần đường-riêng: máy Mac chưa hề nhận được 改善)");
soat("đường NGHE ôn trên Mac chép được sang Windows",
  !!(d.nghe && d.nghe.lv === 5), JSON.stringify(d.nghe || null));
soat("và đường NHÌN vốn có của Windows KHÔNG bị xoá",
  !!(d.nhin && d.nhin.lv === 3), JSON.stringify(d.nhin || null));

/* --- LUYỆN NÓI: chữ người dùng tự gõ, phải đi theo --- */
await dat(W, { luyenNoi: { n_w1: { id:"n_w1", tieuDe:"Bài của Windows", goc:"Xin chào",
  dich:"こんにちは", tuNgu:"vi", sangNgu:"ja", ts: now } } });
await dat(M, { luyenNoi: { n_m1: { id:"n_m1", tieuDe:"Bài của Mac", goc:"Cảm ơn",
  dich:"ありがとう", tuNgu:"vi", sangNgu:"ja", ts: now } } });
await dongBo(W); await dongBo(M); await dongBo(W);
const noiW = (await doc(W, "luyenNoi")) || {}, noiM = (await doc(M, "luyenNoi")) || {};
soat("đoạn Luyện nói viết trên Mac chép được sang Windows",
  !!noiW.n_m1, Object.keys(noiW).join(", ") || "(rỗng)");
soat("và đoạn viết trên Windows chép được sang Mac",
  !!noiM.n_w1, Object.keys(noiM).join(", ") || "(rỗng)");

/* --- SỐ ĐO SRS: cộng dồn, nên gộp bao nhiêu lần cũng phải ra một con số --- */
await dat(W, { soDoSrs: { mayW: { "nhin|3": { n:10, nho:8, ngay:140 } } } });
await dat(M, { soDoSrs: { mayM: { "nhin|3": { n:4,  nho:3, ngay:56  } } } });
await dongBo(W); await dongBo(M); await dongBo(W);
const tong = (o) => {
  let n = 0;
  for (const m of Object.keys(o || {})) for (const k of Object.keys(o[m] || {})) n += (o[m][k] || {}).n || 0;
  return n;
};
const doW1 = tong(await doc(W, "soDoSrs"));
soat("số đo của hai máy cộng lại đúng tổng thật (10 + 4)", doW1 === 14, "n = " + doW1);
// Đồng bộ thêm mấy lượt nữa: con số KHÔNG được nhích.
await dongBo(W); await dongBo(M); await dongBo(W); await dongBo(M);
const doW2 = tong(await doc(W, "soDoSrs"));
soat("đồng bộ thêm bốn lượt nữa thì số đo ĐỨNG YÊN, không tự nhân lên",
  doW2 === 14, "n = " + doW2 + " (trước đó " + doW1 + ")");
soat("và kho chung giữ đủ nhánh của cả hai máy",
  !!(cloud.soDoSrs && cloud.soDoSrs.mayW && cloud.soDoSrs.mayM),
  Object.keys(cloud.soDoSrs || {}).join(", ") || "(rỗng)");

/* --- KHO CŨ trên Drive (chưa từng có hai khoá mới) --- */
/*
 * Đây là câu trả lời cho "có phải deploy lại Apps Script không".
 *
 * Apps Script chỉ làm đúng _save(JSON.stringify(req.data)) rồi trả lại nguyên
 * như thế — nó không hề nhìn vào bên trong gói. Nên thêm khoá mới là việc của
 * riêng phía extension. Bài này dựng lại đúng cảnh ấy: kho trên Drive còn ở
 * dạng CŨ, chỉ có ba khoá, và máy vẫn phải chạy trơn, không mất gì.
 */
cloud = { notebook: { "javi:古": { word:"古", dict:"javi", reading:"ふる",
            means:["cũ"], ts: now, duong:{ nhin:{ lv:2, ngay:7, due: now+9e8, ts: now } },
            srs:{ lv:2, due: now+9e8, ts: now } } },
          decks: {}, hoc: {} };        // KHÔNG có luyenNoi, KHÔNG có soDoSrs
await dat(W, { syncUrlChung: URL_CLOUD });
const rCu = await dongBo(W);
soat("kho Drive dạng CŨ vẫn đồng bộ được, không phải deploy lại máy chủ",
  rCu.ok, rCu.ok ? rCu.n + " mục" : "LỖI — " + rCu.loi);
const nbCu = (await doc(W, "notebook")) || {};
soat("và kéo được từ mới trên kho cũ về máy", !!nbCu["javi:古"],
  Object.keys(nbCu).join(", ") || "(rỗng)");
const noiCu = (await doc(W, "luyenNoi")) || {};
soat("Luyện nói sẵn có trên máy KHÔNG bị kho cũ xoá mất",
  Object.keys(noiCu).length >= 2, Object.keys(noiCu).join(", ") || "(rỗng)");
soat("và số đo SRS cũng còn nguyên", tong(await doc(W, "soDoSrs")) === 14,
  "n = " + tong(await doc(W, "soDoSrs")));
soat("lượt ghi tiếp theo đã nâng kho Drive lên dạng mới",
  !!(cloud.luyenNoi && cloud.soDoSrs), Object.keys(cloud).join(", "));

/* --- máy chủ hỏng thì phải BÁO LỖI, đừng báo "xong, 0 mục" --- */
await dat(W, { syncUrlChung: "http://127.0.0.1:1/exec" });
const r4 = await dongBo(W);
soat("máy chủ hỏng thì báo LỖI, không báo 'xong, 0 mục'",
  !r4.ok, r4.ok ? "báo xong với " + r4.n + " mục (nuốt mất lỗi)" : "báo lỗi: " + (r4.loi||"").slice(0,50));

await W.ctx.close(); await M.ctx.close(); srv.close();
const rot = ket.filter((x)=>!x).length;
console.log("\n" + (ket.length-rot) + "/" + ket.length + (rot ? "  — RỚT " + rot : "  — sạch"));
process.exit(rot ? 1 : 0);
