/**
 * TỪ CÙNG NGỮ CẢNH → CHỈ MỘT BÀI NGHE VÀ MỘT BÀI NGỮ PHÁP.
 *
 *   node kiem-tra/nd-chung-nguc.mjs /home/user/NeutronDict/extension
 *
 * Bôi ba từ sát nhau trong cùng một câu thì sổ có ba mục mang CÙNG câu ngữ cảnh, nên
 * buổi học ra ba thẻ nghe y hệt và (nếu cắt câu lệch nhau) hai ba bài xếp mảnh gần
 * giống nhau. Bài này chốt:
 *   1. nhomChung chọn đúng nhóm (cùng nguồn + câu giống/nằm trong nhau) và đúng đại
 *      diện (đã có tiến độ nghe, rồi khoá nhỏ nhất); khác nguồn thì KHÔNG gộp.
 *   2. Từ phụ mất đường nghe (duongCo), đại diện giữ; điểm của từ phụ vẫn lên được 100.
 *   3. Dữ liệu suy ra, tính lại được: gỡ nhóm thì cờ biến mất; chạy lại không đổi gì.
 *   4. Ngữ pháp: câu lệch nhau cùng nguồn chỉ còn một bài (câu dài hơn); khác nguồn thì giữ cả hai.
 *   5. Trên extension thật: buổi học chỉ có MỘT thẻ nghe cho cả nhóm.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXT = process.argv[2] || "/home/user/NeutronDict/extension";
const ket = [];
const soat = (t, d, c) => { ket.push(d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c ? "  (" + c + ")" : "")); };

/* ---------- phần thuần: nạp thẳng các tệp vào một sandbox ---------- */
const g = { console }; g.self = g; vm.createContext(g);
for (const f of ["cau-nghe.js", "srs.js", "ngu-phap.js"]) vm.runInContext(readFileSync(EXT + "/" + f, "utf8"), g, { filename: f });
const J = (o) => JSON.parse(JSON.stringify(o));
const cauA = "毎日の生活の中で、新しい言葉を覚えることはとても大切です。";
const cauDai = "毎日の生活の中で、新しい言葉を覚えることはとても大切です。だから続けましょう。";
const mk = (key, cau, url, extra) => Object.assign({ key, word: key.split(":")[1], dict: "javi", ts: 1,
  src: { url, sel: key }, cauNghe: { cau, dich: "", ts: 1 } }, extra || {});

console.log("nhomChung");
{
  const ds = [mk("javi:言葉", cauA, "https://a.test/x"), mk("javi:覚える", cauA, "https://a.test/x"),
              mk("javi:大切", cauA, "https://a.test/x#đoạn2"), mk("javi:別", cauA, "https://b.test/y")];
  const p = J([...g.CauNghe.nhomChung(ds)]);
  const m = Object.fromEntries(p);
  soat("3 từ cùng nguồn + cùng câu: 1 đại diện, 2 từ phụ", Object.keys(m).length === 2, JSON.stringify(m));
  soat("đại diện là khoá nhỏ nhất (ổn định)", m["javi:言葉"] === "javi:大切" || m["javi:覚える"] === "javi:大切" || Object.values(m).every((v) => v === "javi:大切" || v === "javi:言葉"));
  soat("khác nguồn thì KHÔNG gộp", !("javi:別" in m));
  soat("phần #đoạn trong URL không làm tách nhóm", Object.keys(m).includes("javi:大切") || Object.values(m).includes("javi:大切"));
}
{
  const ds = [mk("javi:a", cauA, "u"), mk("javi:b", cauDai, "u"), mk("javi:c", cauA, "u", { duong: { nghe: { lv: 3 } } })];
  const m = Object.fromEntries(g.CauNghe.nhomChung(ds));
  soat("câu lệch nhau (một câu nằm trong câu kia) vẫn cùng nhóm", Object.keys(m).length === 2);
  soat("đại diện là từ ĐÃ có tiến độ nghe cao nhất", !("javi:c" in m) && m["javi:a"] === "javi:c" && m["javi:b"] === "javi:c", JSON.stringify(m));
}
{
  const ds = [mk("javi:a", cauA, ""), mk("javi:b", cauA, ""), mk("javi:s", cauA, "u", { kind: "sent" }), mk("javi:d", cauA, "u", { del: true }), mk("javi:e", cauA, "u")];
  ds[0].src = {}; ds[1].src = {};
  soat("không rõ nguồn / là câu / đã xoá: không tham gia", g.CauNghe.nhomChung(ds).size === 0);
}

console.log("\nduongCo / diemTu");
{
  const dd = mk("javi:a", cauA, "u"), phu = mk("javi:b", cauA, "u", { nheChung: "javi:a" });
  soat("đại diện giữ đường nghe", g.Srs.duongCo(dd).includes("nghe"));
  soat("từ phụ không còn đường nghe", !g.Srs.duongCo(phu).includes("nghe"), g.Srs.duongCo(phu).join(","));
  soat("từ phụ không bị thẻ nghe chờ sẵn (denHan)", !g.Srs.denHan(Object.assign({}, phu, { duong: { nhin: { ngay: 30, due: 1, ts: 1, lv: 3 } } }), 1e13).includes("nghe"));
  const hoc = (x) => Object.assign({}, x, { duong: { nhin: { lv: 5, ngay: 120, due: 9e15, ts: 1 }, nghe: { lv: 5, ngay: 120, due: 9e15, ts: 1 } } });
  const khongCauNghe = hoc(Object.assign({}, phu, { cauNghe: undefined }));
  soat("điểm của từ phụ bằng điểm của một mục không có câu nghe (không bị phạt vì mất đường nghe)",
    g.Srs.diemTu(hoc(phu)).tong === g.Srs.diemTu(khongCauNghe).tong, g.Srs.diemTu(hoc(phu)).tong + " = " + g.Srs.diemTu(khongCauNghe).tong);
}

console.log("\ncapNhatNheChung");
{
  const nb = { "javi:a": mk("javi:a", cauA, "u"), "javi:b": mk("javi:b", cauA, "u"), "javi:c": mk("javi:c", cauA, "u") };
  delete nb["javi:a"].key; delete nb["javi:b"].key; delete nb["javi:c"].key;
  const n1 = g.CauNghe.capNhatNheChung(nb);
  soat("lần đầu: 2 mục được đánh dấu", n1 === 2 && !nb["javi:a"].nheChung && nb["javi:b"].nheChung === "javi:a" && nb["javi:c"].nheChung === "javi:a", n1 + "");
  soat("chạy lại: không đổi gì", g.CauNghe.capNhatNheChung(nb) === 0);
  soat("không đụng ts", nb["javi:b"].ts === 1);
  nb["javi:a"].del = true;
  g.CauNghe.capNhatNheChung(nb);
  soat("đại diện bị xoá → nhóm còn 2 từ, đại diện mới, cờ cũ gỡ", !nb["javi:b"].nheChung && nb["javi:c"].nheChung === "javi:b");
  nb["javi:c"].del = true;
  g.CauNghe.capNhatNheChung(nb);
  soat("chỉ còn một từ → hết nhóm, không cờ nào", !nb["javi:b"].nheChung && !nb["javi:c"].nheChung || !nb["javi:b"].nheChung);
}

console.log("\nNgữ pháp");
{
  const it = (key, cau, url, word) => ({ key, word: word || key.split(":")[1], dict: "javi", src: { url, cau }, cauNghe: { cau } });
  const ds = g.NguPhap.danhSach([it("javi:言葉", cauA, "u"), it("javi:覚える", cauDai, "u"), it("javi:大切", cauA, "u"),
    it("javi:言葉@v", cauA, "v", "言葉")]);
  const cau = ds.map((b) => b.cau);
  soat("cùng nguồn, câu lệch nhau: chỉ MỘT bài (câu dài hơn)", cau.filter((c) => c === cauDai).length === 1 && cau.filter((c) => c === cauA).length === 1,
    cau.map((c) => c.length).join(","));
  soat("khác nguồn thì giữ riêng (còn đúng câu ngắn của nguồn v)", cau.includes(cauA));
  soat("tổng cộng 2 bài thay vì 4", ds.length === 2, ds.length + "");
}

/* ---------- trên extension thật ---------- */
console.log("\nBuổi học trên extension thật");
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "pw-")), {
  channel: "chromium", headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
});
const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker", { timeout: 20000 });
const ID = sw.url().split("/")[2];
for (let i = 0; i < 40; i++) { if (await sw.evaluate(() => !!(chrome.storage && chrome.storage.local)).catch(() => false)) break; await new Promise((r) => setTimeout(r, 250)); }
const now = Date.now();
await sw.evaluate(async ([cauA, now]) => {
  const e = (w, extra) => Object.assign({ word: w, dict: "javi", reading: w, means: ["nghĩa"], ts: now,
    src: { url: "https://a.test/x", title: "t", sel: w, cau: cauA },
    cauNghe: { cau: cauA, dich: "dịch", ts: now },
    duong: { nhin: { lv: 3, ngay: 7, due: now + 5 * 86400000, ts: now - 2 * 86400000 }, nghe: { lv: 2, ngay: 3, due: now - 86400000, ts: now - 4 * 86400000 } },
    srs: { lv: 2, due: now - 86400000, ts: now } }, extra || {});
  await chrome.storage.local.set({ settings: { ngu: "ja", nhip: false, coVu: false, nhacTau: false, tach: false },
    notebook: { "javi:言葉": e("言葉"), "javi:覚える": e("覚える"), "javi:大切": e("大切") }, decks: {}, hoc: {} });
}, [cauA, now]);
const n = await sw.evaluate(() => nheChungVaSau());
soat("nheChungVaSau đánh dấu 2 từ phụ", n === 2, n + " mục");
const nb = await sw.evaluate(async () => (await chrome.storage.local.get("notebook")).notebook);
soat("không đụng ts", Object.values(nb).every((x) => x.ts === now));
soat("chạy lại không ghi gì", (await sw.evaluate(() => nheChungVaSau())) === 0);
const pg = await ctx.newPage();
const loi = []; pg.on("pageerror", (e) => loi.push(e.message));
await pg.goto(`chrome-extension://${ID}/notebook.html`);
await pg.waitForFunction(() => typeof hangDoiKhoi === "function" && items.length === 3, null, { timeout: 15000 });
const q = await pg.evaluate(() => {
  const ra = []; for (const k of hangDoiKhoi(items)) for (const x of k) ra.push(x._d + ":" + x.word);
  return ra;
});
const nghe = q.filter((x) => x.startsWith("nghe:"));
soat("hàng đợi có đúng MỘT thẻ nghe cho cả 3 từ", nghe.length === 1, nghe.join(","));
// Hai từ phụ không có đường nghe nhưng VẪN có điền khuyết (mỗi từ đục lỗ một chỗ khác nhau);
// từ đại diện đã có thẻ nghe nên chỉ hiện đường ấy. Mỗi từ đúng một thẻ.
soat("mỗi từ chỉ hiện MỘT đường: 1 thẻ nghe + 2 thẻ điền khuyết của hai từ phụ",
     q.length === 3 && q.filter((x) => x.startsWith("dien:")).length === 2 && new Set(q.map((x) => x.split(":")[1])).size === 3, q.join(" "));
console.log(loi.length ? "LỖI JS:\n" + loi.join("\n") : "  không có lỗi JS");
await ctx.close();
const sai = ket.filter((x) => !x).length;
console.log("\n" + (ket.length - sai) + "/" + ket.length + (sai || loi.length ? "  — CÓ LỖI" : "  — sạch"));
process.exit(sai || loi.length ? 1 : 0);
