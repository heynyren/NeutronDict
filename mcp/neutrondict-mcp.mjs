#!/usr/bin/env node
/**
 * NeutronDict MCP server — cho trợ lý AI đọc VÀ SỬA sổ tay của bạn.
 *
 * Chạy: node neutrondict-mcp.mjs
 * Không cần cài gì. Nói JSON-RPC 2.0 qua stdio, đúng như MCP quy định — viết
 * tay chừng này còn hơn kéo về một cây phụ thuộc chỉ để gói mấy dòng JSON.
 *
 * === Lấy dữ liệu ở đâu ===
 *
 * MCP server chạy trên máy, KHÔNG với tay vào chrome.storage của extension
 * được — hai thế giới tách biệt. Nên có hai lối, chọn bằng biến môi trường:
 *
 *   ND_SYNC_URL + ND_SYNC_TOKEN : đi qua chính máy chủ Apps Script mà extension
 *       vẫn dùng để đồng bộ. Đây là lối NÊN DÙNG: sửa xong, mở app bấm "Đồng
 *       bộ ngay" là về máy, không phải chép tay tệp nào.
 *   ND_FILE : đường dẫn tới tệp sổ tay đã Xuất ra. Dành cho ai không dùng cloud.
 *
 * === Về việc cho AI SỬA sổ ===
 *
 * Có, và đó là chủ ý — nhưng phải kèm dây an toàn, vì đây là dữ liệu học tập
 * gom góp lâu ngày của bạn:
 *
 *   1. MỌI lượt ghi đều sao lưu trước, ra tệp .bak-<mốc giờ>.json cạnh sổ.
 *   2. TUYỆT ĐỐI không đụng vào `srs` — tiến độ ôn là thứ bạn đổi bằng công
 *      sức thật, sửa lại nghĩa một từ không được phép làm nó tụt cấp.
 *   3. Công cụ ghi đều HẸP: sửa từng mục một, có tên rõ ràng. Không có lối nào
 *      "ghi đè cả sổ" — thứ mà một lượt gọi nhầm có thể xoá sạch mọi thứ.
 *   4. Xoá là dựng BIA MỘ (del:1) đúng như app làm, để lượt đồng bộ sau không
 *      hồi sinh mục đã xoá.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.join(HERE, "..", "extension");

/* Dùng lại nguyên xi phần logic thuần của extension — không chép lại dòng nào. */
globalThis.self = globalThis;
for (const f of ["kana.js", "han-tu.js", "cat-cau.js", "muc.js", "ngu.js"]) {
  const p = path.join(EXT, f);
  if (fs.existsSync(p)) { try { new Function(fs.readFileSync(p, "utf8"))(); } catch (e) {} }
}
const Kana = globalThis.Kana, HanTu = globalThis.HanTu, CatCau = globalThis.CatCau, Muc = globalThis.Muc;

/* ==================== kho sổ tay ==================== */
const SYNC_URL = process.env.ND_SYNC_URL || "";
const SYNC_TOKEN = process.env.ND_SYNC_TOKEN || "";
const FILE = process.env.ND_FILE || "";

if (!SYNC_URL && !FILE) {
  process.stderr.write("NeutronDict MCP: chưa có nguồn dữ liệu.\n" +
    "  Đặt ND_SYNC_URL (+ND_SYNC_TOKEN) để dùng cloud Apps Script,\n" +
    "  hoặc ND_FILE=<đường dẫn tệp sổ tay đã Xuất>.\n");
}

async function docSo() {
  if (SYNC_URL) {
    const r = await fetch(SYNC_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: SYNC_TOKEN, action: "load" })
    });
    const d = await r.json();
    if (!d || d.ok === false) throw new Error((d && d.error) || "máy chủ từ chối");
    const data = d.data || {};
    return data.notebook || data;      // nới cả hai kiểu bọc
  }
  if (!fs.existsSync(FILE)) return {};
  const j = JSON.parse(fs.readFileSync(FILE, "utf8"));
  return j.notebook || j;
}

/** Sao lưu rồi mới ghi. Không bao giờ ghi đè mà không để lại đường lui. */
async function ghiSo(nb) {
  if (FILE) {
    if (fs.existsSync(FILE)) {
      const bak = FILE.replace(/\.json$/i, "") + ".bak-" + Date.now() + ".json";
      fs.copyFileSync(FILE, bak);
    }
    fs.writeFileSync(FILE, JSON.stringify({ notebook: nb }, null, 1));
    return;
  }
  const cu = await docSo();
  const bak = path.join(HERE, "sotay.bak-" + Date.now() + ".json");
  try { fs.writeFileSync(bak, JSON.stringify({ notebook: cu }, null, 1)); } catch (e) {}
  const r = await fetch(SYNC_URL, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: SYNC_TOKEN, action: "save", data: { notebook: nb } })
  });
  const d = await r.json();
  if (!d || d.ok === false) throw new Error((d && d.error) || "máy chủ từ chối lượt ghi");
}

const gonMuc = (k, e) => ({
  khoa: k, tu: e.word || "", cachDoc: e.reading || "",
  nghia: e.means || [], ghiChu: e.note || "",
  tuDien: e.dict || "", so: e.deck || "",
  cap: e.srs && typeof e.srs.lv === "number" ? e.srs.lv : null,
  denHan: e.srs && e.srs.due ? new Date(e.srs.due).toISOString().slice(0, 10) : null,
});

/* ==================== các công cụ ==================== */
const CONG_CU = [
  { name: "tim_tu", description:
      "Tìm trong sổ tay NeutronDict theo chữ, cách đọc, nghĩa hoặc ghi chú. Trả về danh sách mục kèm khoá để sửa.",
    inputSchema: { type: "object", properties: {
      tu_khoa: { type: "string", description: "chữ cần tìm" },
      gioi_han: { type: "number", description: "số mục tối đa, mặc định 30" } }, required: ["tu_khoa"] } },

  { name: "xem_muc", description: "Xem đầy đủ một mục trong sổ tay theo khoá.",
    inputSchema: { type: "object", properties: { khoa: { type: "string" } }, required: ["khoa"] } },

  { name: "den_han", description:
      "Những từ đến hạn ôn (theo lịch SRS). Dùng để soạn bài ôn hoặc câu ví dụ.",
    inputSchema: { type: "object", properties: {
      gioi_han: { type: "number", description: "mặc định 50" } } } },

  { name: "thong_ke", description: "Tổng quan sổ tay: số mục, phân bố cấp SRS, số mục theo từ điển.",
    inputSchema: { type: "object", properties: {} } },

  { name: "sua_nghia", description:
      "SỬA nghĩa của một mục. Ghi đè danh sách nghĩa. KHÔNG đụng tiến độ ôn (srs). Có sao lưu tự động.",
    inputSchema: { type: "object", properties: {
      khoa: { type: "string" },
      nghia: { type: "array", items: { type: "string" }, description: "danh sách nghĩa mới" } },
      required: ["khoa", "nghia"] } },

  { name: "sua_ghi_chu", description: "SỬA ghi chú của một mục. Không đụng tiến độ ôn. Có sao lưu tự động.",
    inputSchema: { type: "object", properties: {
      khoa: { type: "string" }, ghi_chu: { type: "string" } }, required: ["khoa", "ghi_chu"] } },

  { name: "them_muc", description:
      "Thêm một từ mới vào sổ tay. Nếu khoá đã có thì báo lỗi chứ không đè.",
    inputSchema: { type: "object", properties: {
      tu: { type: "string" }, tu_dien: { type: "string", description: "javi | envi | vija | kanji" },
      nghia: { type: "array", items: { type: "string" } },
      cach_doc: { type: "string" }, ghi_chu: { type: "string" } },
      required: ["tu", "tu_dien", "nghia"] } },

  { name: "xoa_muc", description:
      "Xoá một mục (dựng bia mộ đúng như app, để lượt đồng bộ sau không hồi sinh nó). Có sao lưu tự động.",
    inputSchema: { type: "object", properties: { khoa: { type: "string" } }, required: ["khoa"] } },

  { name: "furigana", description:
      "Sinh furigana cho một chữ/câu tiếng Nhật, từ cách đọc kana. Dùng chính bộ luật của NeutronDict.",
    inputSchema: { type: "object", properties: {
      chu: { type: "string" }, cach_doc: { type: "string", description: "cách đọc bằng kana" } },
      required: ["chu", "cach_doc"] } },

  { name: "han_viet", description: "Âm Hán Việt của một chữ/cụm chữ Hán.",
    inputSchema: { type: "object", properties: { chu: { type: "string" } }, required: ["chu"] } },

  { name: "cat_cau", description:
      "Cắt một đoạn tiếng Nhật (hoặc Anh/Việt) thành từng câu, theo bộ luật của NeutronDict.",
    inputSchema: { type: "object", properties: {
      doan: { type: "string" }, ngu: { type: "string", description: "ja | en | vi, mặc định ja" } },
      required: ["doan"] } },
];

async function chay(ten, dl) {
  dl = dl || {};
  if (ten === "tim_tu") {
    const nb = await docSo();
    const q = String(dl.tu_khoa || "").toLowerCase();
    const ra = [];
    for (const k in nb) {
      const e = nb[k];
      if (!e || e.del) continue;
      const kho = [e.word, e.reading, (e.means || []).join(" "), e.note].join(" ").toLowerCase();
      if (kho.includes(q)) ra.push(gonMuc(k, e));
      if (ra.length >= (dl.gioi_han || 30)) break;
    }
    return { tim_thay: ra.length, muc: ra };
  }
  if (ten === "xem_muc") {
    const nb = await docSo();
    const e = nb[dl.khoa];
    if (!e || e.del) throw new Error("Không có mục nào mang khoá " + dl.khoa);
    return Object.assign(gonMuc(dl.khoa, e), { nguon: e.src || null, srs_day_du: e.srs || null });
  }
  if (ten === "den_han") {
    const nb = await docSo();
    const now = Date.now();
    const ra = [];
    for (const k in nb) {
      const e = nb[k];
      if (!e || e.del || !e.srs) continue;
      if ((e.srs.due || 0) <= now) ra.push(gonMuc(k, e));
    }
    ra.sort((a, b) => (a.cap || 0) - (b.cap || 0));
    return { den_han: ra.length, muc: ra.slice(0, dl.gioi_han || 50) };
  }
  if (ten === "thong_ke") {
    const nb = await docSo();
    const cap = {}, tuDien = {};
    let song = 0, coSrs = 0;
    for (const k in nb) {
      const e = nb[k];
      if (!e || e.del) continue;
      song++;
      tuDien[e.dict || "?"] = (tuDien[e.dict || "?"] || 0) + 1;
      if (e.srs && typeof e.srs.lv === "number") { coSrs++; cap["cấp " + e.srs.lv] = (cap["cấp " + e.srs.lv] || 0) + 1; }
    }
    return { tong_muc: song, da_hoc: coSrs, theo_cap: cap, theo_tu_dien: tuDien };
  }
  if (ten === "sua_nghia" || ten === "sua_ghi_chu") {
    const nb = await docSo();
    const e = nb[dl.khoa];
    if (!e || e.del) throw new Error("Không có mục nào mang khoá " + dl.khoa);
    const truoc = ten === "sua_nghia" ? (e.means || []) : (e.note || "");
    // Giữ NGUYÊN srs: sửa lại nghĩa không được phép làm tụt tiến độ ôn.
    const moi = Object.assign({}, e, { ts: Date.now() });
    if (ten === "sua_nghia") {
      const ds = (dl.nghia || []).map((x) => String(x).trim()).filter(Boolean);
      if (!ds.length) throw new Error("Danh sách nghĩa rỗng — muốn xoá mục thì dùng xoa_muc");
      if (!moi.mOrig) moi.mOrig = e.means || [];    // cất bản gốc đúng một lần
      moi.means = ds; moi.mEdit = 1;
    } else {
      moi.note = String(dl.ghi_chu || "");
    }
    nb[dl.khoa] = moi;
    await ghiSo(nb);
    return { da_sua: dl.khoa, truoc, sau: ten === "sua_nghia" ? moi.means : moi.note,
      luu_y: "Tiến độ ôn (srs) giữ nguyên. Mở NeutronDict bấm 'Đồng bộ ngay' để kéo về máy." };
  }
  if (ten === "them_muc") {
    const nb = await docSo();
    const k = (dl.tu_dien || "envi") + ":" + String(dl.tu || "").trim();
    if (nb[k] && !nb[k].del) throw new Error("Sổ đã có mục này rồi: " + k);
    const ds = (dl.nghia || []).map((x) => String(x).trim()).filter(Boolean);
    if (!ds.length) throw new Error("Phải có ít nhất một nghĩa");
    nb[k] = { word: String(dl.tu).trim(), dict: dl.tu_dien || "envi", reading: dl.cach_doc || "",
      means: ds, note: dl.ghi_chu || "", ts: Date.now() };
    await ghiSo(nb);
    return { da_them: k, luu_y: "Mở NeutronDict bấm 'Đồng bộ ngay' để kéo về máy." };
  }
  if (ten === "xoa_muc") {
    const nb = await docSo();
    const e = nb[dl.khoa];
    if (!e || e.del) throw new Error("Không có mục nào mang khoá " + dl.khoa);
    nb[dl.khoa] = Muc && Muc.biaMo ? Muc.biaMo(e) : { del: 1, ts: Date.now() };
    await ghiSo(nb);
    return { da_xoa: dl.khoa, luu_y: "Đã dựng bia mộ nên lượt đồng bộ sau không hồi sinh mục này." };
  }
  if (ten === "furigana") {
    if (!Kana) throw new Error("Không nạp được kana.js");
    const rb = Kana.gonRuby(Kana.ghepFurigana(dl.chu, dl.cach_doc));
    return { chu: dl.chu, cach_doc: dl.cach_doc, furigana: rb,
      html: rb.length ? Kana.htmlRuby(dl.chu, rb) : "",
      ghi_chu: rb.length ? "" : "Không canh khớp được — thà không có furigana còn hơn đặt sai chỗ." };
  }
  if (ten === "han_viet") {
    if (!HanTu) throw new Error("Không nạp được han-tu.js");
    const chu = String(dl.chu || "");
    const ra = [...chu].map((c) => ({ chu: c, han_viet: (HanTu.HV && HanTu.HV(c)) || null }));
    return { chu, tung_chu: ra };
  }
  if (ten === "cat_cau") {
    if (!CatCau) throw new Error("Không nạp được cat-cau.js");
    const cue = [{ s: String(dl.doan || ""), t: 0, d: 5 }];
    return { cau: CatCau.ghepCau(cue, dl.ngu || "ja").map((x) => x.s) };
  }
  throw new Error("Không có công cụ tên " + ten);
}

/* ==================== JSON-RPC qua stdio ==================== */
function guiDi(o) { process.stdout.write(JSON.stringify(o) + "\n"); }

async function xuLy(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return { protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "neutrondict", version: "1.0.0" } };
  }
  if (method === "tools/list") return { tools: CONG_CU };
  if (method === "tools/call") {
    const kq = await chay(params.name, params.arguments);
    return { content: [{ type: "text", text: JSON.stringify(kq, null, 1) }] };
  }
  if (method === "ping") return {};
  throw new Error("method lạ: " + method);
}

let dem = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (mieng) => {
  dem += mieng;
  let i;
  while ((i = dem.indexOf("\n")) >= 0) {
    const dong = dem.slice(0, i).trim();
    dem = dem.slice(i + 1);
    if (!dong) continue;
    let msg;
    try { msg = JSON.parse(dong); } catch (e) { continue; }
    // Thông báo (không có id) thì không được trả lời — đúng luật JSON-RPC.
    if (msg.id === undefined) continue;
    try {
      guiDi({ jsonrpc: "2.0", id: msg.id, result: await xuLy(msg) });
    } catch (e) {
      guiDi({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: (e && e.message) || String(e) } });
    }
  }
});
