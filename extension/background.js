importScripts("kanji-data.js");  // self.KANJI — bảng Hán tự, để tính âm Hán Việt ở nền
importScripts("kana.js");      // self.Kana — suy furigana khi từ điển không cho
importScripts("ngu.js");        // self.Ngu — hai ngôn ngữ trong một extension
importScripts("han-tu.js");     // self.HanTu — Hán tự là một loại mục của sổ tay
importScripts("tien-do.js");   // self.TienDo — để trộn tiến độ học khi đồng bộ
importScripts("muc.js");        // self.Muc — đọc/xoá một mục sổ tay, dùng chung mọi màn

// NeutronDict — service worker (nền).
// Tra từ tiếng Anh: nghĩa tiếng Việt (Google Dịch) + phiên âm IPA, phát âm, định nghĩa &
// ví dụ tiếng Anh (Free Dictionary API). Không dùng dữ liệu Hán tự.

// ==== Cấu hình ====
const CACHE_MAX = 1000;              // số từ giữ trong bộ nhớ đệm
const CACHE_TTL = 30 * 86400000;     // 30 ngày
const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const DEFAULT_SETTINGS = { inline: true, requireCtrl: false, maxLen: 40 };

// ==== Menu chuột phải ====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "tra-neutron-popup",
      title: 'Tra "%s" bằng NeutronDict',
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "luu-neutron",
      title: 'Lưu "%s" vào NeutronDict (kèm nguồn)',
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "tra-neutron-popup" && info.selectionText) {
    await openPopupWindow(info.selectionText, tab);
  } else if (info.menuItemId === "luu-neutron" && info.selectionText) {
    await handleContextSave(info, tab);
  }
});

// ==== Lưu từ menu chuột phải: dịch sang tiếng Việt + lưu kèm nguồn & ngữ cảnh ====
// Hàm này được TIÊM vào trang để lấy đoạn bôi đen + vài từ trước/sau (giúp định vị lại).
function grabSelCtx() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const text = (sel.toString() || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  let prefix = "", suffix = "";
  try {
    const r = sel.getRangeAt(0);
    const sc = r.startContainer, ec = r.endContainer;
    if (sc && sc.nodeType === 3) prefix = (sc.textContent || "").slice(0, r.startOffset).slice(-70);
    if (ec && ec.nodeType === 3) suffix = (ec.textContent || "").slice(r.endOffset).slice(0, 70);
  } catch (e) {}
  return { sel: text, prefix: prefix.replace(/\s+/g, " ").trim(), suffix: suffix.replace(/\s+/g, " ").trim() };
}

async function translateToVi(text) {
  try { const v = await gtxTranslate(text, "auto", "vi"); if (v) return v; } catch (e) {}
  const { syncUrl, syncToken } = await chrome.storage.local.get(["syncUrl", "syncToken"]);
  if (syncUrl) {
    try {
      const r = await fetch(syncUrl, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token: syncToken || "", action: "translate", text, from: "", to: "vi" })
      });
      const d = await r.json();
      if (d && d.text) return d.text;
    } catch (e) {}
  }
  return "";
}

function flashBadge(txt, color) {
  try {
    chrome.action.setBadgeText({ text: txt });
    chrome.action.setBadgeBackgroundColor({ color: color || "#1a9d5a" });
    setTimeout(() => { try { chrome.action.setBadgeText({ text: "" }); } catch (e) {} }, 1600);
  } catch (e) {}
}

async function handleContextSave(info, tab) {
  const rawSel = (info.selectionText || "").replace(/\s+/g, " ").trim();
  if (!rawSel) return;
  const url = (tab && tab.url) || "";
  const title = ((tab && tab.title) || "").slice(0, 200);
  const isPdf = /\.pdf(\?|#|$)/i.test(url);

  // Ngữ cảnh xung quanh (chỉ lấy được trên trang web thường; PDF không đọc được DOM).
  let ctx = { sel: rawSel, prefix: "", suffix: "" };
  if (!isPdf && tab && tab.id && /^https?:/i.test(url)) {
    try {
      const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grabSelCtx });
      const r = res && res[0] && res[0].result;
      if (r && r.sel) ctx = r;
    } catch (e) { /* trang chặn tiêm -> dùng selectionText */ }
  }

  const vi = await translateToVi(ctx.sel).catch(() => "");
  const src = { url, title, sel: ctx.sel.slice(0, 400) };
  if (ctx.prefix) src.prefix = ctx.prefix.slice(-80);
  if (ctx.suffix) src.suffix = ctx.suffix.slice(0, 80);
  if (isPdf) src.pdf = true;

  const entry = { word: ctx.sel.slice(0, 400), reading: "", means: vi ? [vi] : [], kind: "sent", src };
  try {
    const ngu = await nguHienTai();
    await saveWord(entry, self.Ngu.nganChinh(ngu));
    scheduleSync(ngu);
    flashBadge("✓", "#1a9d5a");
  } catch (e) {
    flashBadge("!", "#d33");
  }
}

async function openPopupWindow(rawText, tab) {
  const word = (rawText || "").trim();
  const src = (word && tab && /^https?:/i.test(tab.url || ""))
    ? { url: tab.url, title: (tab.title || "").slice(0, 200), sel: word } : null;
  // Rỗng thì vẫn mở — popup tự đọc clipboard (getInitialWord), đúng cảnh
  // Ctrl+C ở một app khác rồi bấm phím tắt.
  if (word) await chrome.storage.local.set({ pendingLookup: { word, ts: Date.now(), src } });
  else await chrome.storage.local.remove("pendingLookup");
  const W = 430, H = 620;
  const opts = { url: chrome.runtime.getURL("popup.html?ctx=1"), type: "popup", width: W, height: H };
  try {
    if (tab && tab.windowId != null) {
      const win = await chrome.windows.get(tab.windowId);
      if (win && win.width) {
        opts.left = Math.max(0, (win.left || 0) + win.width - W - 24);
        opts.top = Math.max(0, (win.top || 0) + 80);
      }
    }
  } catch (e) { /* để Chrome tự đặt */ }

  // Mở cho BẰNG ĐƯỢC. Toạ độ tính ra có thể rơi ra ngoài vùng nhìn thấy — nhiều
  // màn hình, cửa sổ kéo sát mép phải, hay màn hình nhỏ hơn cửa sổ nguồn — và
  // khi đó Chrome NÉM LỖI "Bounds must be at least 50% within visible screen
  // space" rồi KHÔNG mở gì cả. Đó đúng là cảnh "bấm phím tắt mà cửa sổ không
  // hiện ra". Vấp thì bỏ toạ độ cho Chrome tự đặt; vẫn không được thì mở tab.
  try {
    await chrome.windows.create(opts);
  } catch (e) {
    delete opts.left; delete opts.top;
    try {
      await chrome.windows.create(opts);
    } catch (e2) {
      await chrome.tabs.create({ url: opts.url });
    }
  }
}

// ==== Tin nhắn ====
let syncTimer = null;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === "LOOKUP") {
    // msg.chiHanTu: chỉ cần liệt kê Hán tự trong đoạn, khỏi tra từ điển.
    handleLookup(msg.word, msg.dict || "envi", msg.chiHanTu)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SAVE_WORD") {
    saveWord(msg.entry, msg.dict || "envi")
      .then(() => { scheduleSync(self.Ngu.nguCuaKhoa((msg.dict || "envi") + ":")); sendResponse({ ok: true }); })
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "TRANSLATE_MANY") {
    handleTranslateMany(msg.texts, msg.from, msg.to)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "TRANSLATE") {
    handleTranslate(msg.text, msg.from, msg.to)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SYNC_NOW") {
    // Không nói rõ ngôn ngữ thì đồng bộ cả hai cloud.
    (msg.ngu ? syncNow(msg.ngu) : syncTatCa()).then((n) => sendResponse({ ok: true, count: n }))
             .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "VA_FURIGANA") {
    vaFurigana(msg.toiDa)
      .then((n) => sendResponse({ ok: true, count: n }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "OPEN_LOOKUP") {
    // Content script bắt Ctrl+Shift+Z rồi nhờ nền mở cửa sổ popup — đúng đường
    // mà menu chuột phải "Tra bằng NeutronDict" vẫn dùng.
    //
    // PHẢI return true + sendResponse: mở cửa sổ là việc bất đồng bộ, mà service
    // worker MV3 có thể bị ngắt ngay khi hàm nghe tin trả về. Không giữ nó sống
    // thì đôi khi ghi xong pendingLookup là worker chết, chưa kịp tạo cửa sổ.
    openPopupWindow(msg.text || "", sender && sender.tab)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SYNC_SOON") { scheduleSync(msg.ngu); return; }
});

/**
 * Vá furigana cho những mục ĐÃ nằm sẵn trong sổ.
 *
 * Chạy mỗi lần mở sổ tay. Phần đổi romaji sang kana thì làm hết, vì không tốn
 * gì; phần phải đi hỏi mạng thì mỗi lượt chỉ làm `toiDa` mục, để mở sổ không
 * biến thành mấy trăm lượt gọi mạng — mở vài lần là hết.
 *
 * KHÔNG đụng vào `ts`. Cách đọc suy ra là như nhau trên mọi máy, nên để yên
 * mốc thời gian thì máy nào tự vá của máy đó, mà cloud không phải nhận một
 * lượt tải lên "cả sổ vừa đổi".
 */
async function vaFurigana(toiDa) {
  let conMang = Math.max(0, toiDa == null ? 25 : toiDa);
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const doi = {}, doiRuby = {};
  for (const k of Object.keys(nb)) {
    const it = nb[k];
    if (!it || it.del) continue;
    // Thẻ chữ Hán cũng là mục tiếng Nhật. Bỏ sót nhóm này là cả một loại thẻ
    // nằm trong sổ mà không bao giờ có cách đọc — đúng thứ cần furigana nhất.
    if (it.dict !== "javi" && it.dict !== "vija" && it.dict !== "kanji") continue;
    // CHÚ Ý: không bỏ qua mục đã có kana ở đây. Cách đọc thì đã xong, nhưng
    // furigana của nó vẫn có thể lệch (ruby cũ suy từ romaji Google) — phải để
    // lọt xuống dưới mà soát lại. Việc soát là ghép chuỗi thuần, không tốn mạng.

    // Cả câu (và cụm quá dài để có MỘT dòng kana) đi đường khác: furigana đặt
    // trên từng khúc chữ Hán. Những câu bạn đã lưu từ bảng lời thoại trước đây
    // nằm ở đây — vá dần chúng qua các lượt mở, khỏi phải lưu lại từng câu.
    const coHan = self.Kana.catKhuc(it.word).some((x) => x.han);
    if (it.kind === "sent" || (coHan && !self.Kana.canDoc(it.word, ""))) {
      if (!coHan) continue;                                         // toàn kana: chẳng có gì để đặt furigana lên
      // "Đã ghép rồi" chưa đủ: bảng cũ bám theo từng khúc chữ Hán, sửa lại chữ
      // của mục là nó hết khớp và ruby lặng lẽ biến mất. Hỏi xem còn khớp không
      // thì mục ấy được ghép lại, thay vì mất furigana vĩnh viễn.
      if (self.Kana.rubyKhop(it.word, it.ruby)) continue;
      if (conMang <= 0) continue;                                   // để dành cho lượt mở sau
      const rb = await rubyCua(it.word);
      conMang--;                                                    // trừ cả lượt hỏi hụt
      if (rb.length) doiRuby[k] = { rb: rb, suy: true };            // ruby cả câu suy từ Google
      continue;
    }

    // Cách đọc: mục này có phải đi hỏi mạng không — chỉ khi trắng cách đọc và
    // có chữ Hán. Hết lượt mạng thì để lần mở sau, NHƯNG vẫn soát ruby ở dưới.
    const phaiHoi = !it.reading && self.Kana.canDoc(it.word, "");
    if (!(phaiHoi && conMang <= 0)) {
      const r = await docKana(it.word, it.reading, phaiHoi);
      if (phaiHoi) conMang--;                         // trừ cả lượt hỏi hụt, không thì kẹt mãi
      if (r && r.doc && r.doc !== it.reading) doi[k] = r;
    }

    // Furigana của TỪ ĐƠN suy TỪ CHÍNH cách đọc của mục — không hỏi Google lần
    // nữa. Đây là chỗ chữa lỗi "furigana lệch với phiên âm": trước đây ruby đi
    // qua romaji của Google, một nguồn TÁCH khỏi cách đọc từ điển đã cho, nên
    // có ngày lệch — 発売 phiên âm はつばい mà furigana lại ra わっぱい. Một
    // nguồn thì không tự lệch với mình. Ghép lại rẻ (chuỗi thuần), chỉ ghi khi
    // khác thật để cloud khỏi tưởng cả sổ vừa đổi; ghép hụt thì GIỮ ruby cũ.
    const docChot = (doi[k] && doi[k].doc) || it.reading || "";
    if (docChot && !self.Kana.laRomaji(docChot) && self.Kana.canDoc(it.word, "")) {
      const rb2 = self.Kana.gonRuby(self.Kana.ghepFurigana(it.word, docChot));
      if (rb2.length && rb2.join("\u241f") !== ((it.ruby || []).join("\u241f"))) {
        // Cách đọc từ điển thì furigana theo nó cũng chuẩn — đừng gắn dấu "suy
        // ra". Chỉ đánh dấu khi chính cách đọc là suy (docKana trả suy, hoặc
        // mục vốn đã mang dấu ấy).
        const suy = !!(doi[k] && doi[k].suy) || !!it.docSuy;
        doiRuby[k] = { rb: rb2, suy: suy };
      }
    }
  }
  const keys = Object.keys(doi), keysRb = Object.keys(doiRuby);
  if (!keys.length && !keysRb.length) return 0;

  // Đọc lại ngay trước khi ghi: giữa lúc hỏi mạng có thể đã có lượt lưu khác.
  const moi = (await chrome.storage.local.get("notebook")).notebook || {};
  for (const k of keys) {
    const it = moi[k];
    if (!it || it.del) continue;
    it.reading = doi[k].doc;
    if (doi[k].suy) it.docSuy = 1;
  }
  for (const k of keysRb) {
    const it = moi[k];
    if (!it || it.del) continue;
    it.ruby = doiRuby[k].rb;
    if (doiRuby[k].suy) it.docSuy = 1;   // ruby chuẩn từ từ điển thì không gạch "suy ra"
  }
  await chrome.storage.local.set({ notebook: moi });
  return keys.length + keysRb.length;
}

/** Ngôn ngữ đang bật. Một khoá duy nhất, mọi màn đều đọc từ đây. */
async function nguHienTai() {
  const { settings } = await chrome.storage.local.get("settings");
  return self.Ngu.hopLe((settings || {}).ngu);
}

let nguHen = "";
function scheduleSync(ngu) {
  // Nhớ ngôn ngữ vừa đổi để chỉ đẩy đúng cloud đó; không rõ thì đẩy cả hai.
  nguHen = (nguHen && nguHen !== ngu) ? "" : (ngu || "");
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { (nguHen ? syncNow(nguHen) : syncTatCa()).catch(() => {}); nguHen = ""; }, 2500);
}

// ==== Google Dịch (endpoint công khai gtx) ====
// dt=t (bản dịch) + dt=bd (từ điển nhiều nghĩa theo loại từ).
//
// Làm sạch chuỗi TRƯỚC khi gửi. Bôi đen xuyên qua công thức MathJax/KaTeX kéo
// theo cả phần MathML ẩn và ký tự vô hình (zero-width, ký tự định dạng), làm
// chuỗi phình ra và lẫn thứ Google không cần. Không dọn thì hoặc URL quá dài,
// hoặc bản dịch dính rác.
function donDich(s) {
  return String(s || "")
    .normalize("NFC")
    .replace(/[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")  // vô hình / định dạng
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")                  // điều khiển
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gọi endpoint gtx cho chắc: XOAY VÒNG HOST và chọn cách gửi theo ĐỘ DÀI.
 *
 * Hai chuyện hay làm hỏng dịch, cả hai đều không phân biệt tiếng gì:
 *
 *  1. Đoạn DÀI: URL GET có trần cứng, Google trả 400 rồi 431 (URL/header quá
 *     khổ). Nên chuỗi dài đi POST — bỏ hẳn giới hạn URL; chuỗi ngắn vẫn GET.
 *     Cách này trượt thì thử nốt cách kia (có nơi chặn POST, nơi chặn GET dài).
 *
 *  2. Gọi NHIỀU: endpoint gtx công khai giới hạn tần suất theo IP — tra một hồi
 *     là nó chặn bớt, trả 429/403, và lỗi "Không nhận được bản dịch" hiện ra
 *     dù câu ngắn tũn. Đây là chặn TẠM THỜI, tự hết. Đỡ bằng cách xoay sang một
 *     cổng Google khác (clients5) khi cổng chính bị chặn: hai cổng đếm tần suất
 *     riêng nên thường một cái còn sống. Cùng đường /translate_a/single nên
 *     dạng dữ liệu trả về y hệt, chỗ đọc khỏi phải đổi.
 */
const GTX_HOST = [
  "https://translate.googleapis.com/translate_a/single?client=gtx&",
  "https://clients5.google.com/translate_a/single?client=gtx&"
];
async function gtxLay(params, enc) {
  const dai = enc.length > 4000;
  let cuoi = null;
  for (const h of GTX_HOST) {
    const base = h + params;
    const doGet = () => fetch(base + "&q=" + enc);
    const doPost = () => fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: "q=" + enc
    });
    let r = null;
    try { r = await (dai ? doPost() : doGet()); } catch (e) { r = null; }
    if (!r || !r.ok) { try { r = await (dai ? doGet() : doPost()); } catch (e) { /* cách kia cũng trượt */ } }
    if (r && r.ok) { try { return await r.json(); } catch (e) { cuoi = e; } }
    else cuoi = new Error("gtx HTTP " + (r ? r.status : "mạng"));
    // Host này chặn/hỏng -> thử host sau.
  }
  throw (cuoi || new Error("gtx: mọi cổng đều trượt"));
}

async function gtxData(from, to, text) {
  const params = "dt=t&dt=bd&sl=" + encodeURIComponent(from) + "&tl=" + encodeURIComponent(to);
  return gtxLay(params, encodeURIComponent(text));
}
function gtxMain(data) { return ((data && data[0]) || []).map((s) => (s && s[0]) || "").join("").trim(); }
function gtxSenses(data) {
  const out = [];
  for (const g of ((data && data[1]) || [])) out.push({ pos: g[0] || "", terms: (g[1] || []).slice(0, 8) });
  return out;
}
// Việt hoá nhãn loại từ do Google trả về (verb/noun/…).
const POS_VI = {
  noun: "danh từ", verb: "động từ", adjective: "tính từ", adverb: "trạng từ",
  pronoun: "đại từ", preposition: "giới từ", conjunction: "liên từ", interjection: "thán từ",
  exclamation: "thán từ", determiner: "từ hạn định", article: "mạo từ", numeral: "số từ",
  "proper noun": "danh từ riêng", "auxiliary verb": "trợ động từ", particle: "tiểu từ",
  prefix: "tiền tố", suffix: "hậu tố", abbreviation: "viết tắt", phrase: "cụm từ"
};
function posVi(p) { return POS_VI[(p || "").toLowerCase()] || p; }
function meansFromSenses(main, senses) {
  const out = [];
  if (main) out.push(main);          // nghĩa chính (thông dụng nhất) lên đầu
  for (const s of (senses || [])) {
    if (s.terms && s.terms.length) out.push((s.pos ? "(" + posVi(s.pos) + ") " : "") + s.terms.join(", "));
  }
  return out.slice(0, 6);
}
async function gtxTranslate(text, f, t) {
  const out = gtxMain(await gtxData(f || "en", t || "vi", text));
  if (!out) throw new Error("gtx rỗng");
  return out;
}
async function gtxDict(text, from, to) {
  const data = await gtxData(from, to, text);
  return { main: gtxMain(data), senses: gtxSenses(data) };
}

// ==== Free Dictionary API (IPA, phát âm, định nghĩa, ví dụ) ====
async function fetchDictionary(word) {
  try {
    const r = await fetch(DICT_API + encodeURIComponent(word.toLowerCase()));
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data) ? data : null;
  } catch (e) { return null; }
}
function ipaFrom(dictData) {
  for (const d of dictData) {
    if (d.phonetic && d.phonetic.trim()) return d.phonetic.trim();
    for (const p of (d.phonetics || [])) if (p.text && p.text.trim()) return p.text.trim();
  }
  return "";
}
function audioFrom(dictData) {
  for (const d of dictData) for (const p of (d.phonetics || [])) {
    if (p.audio && p.audio.trim()) return p.audio.trim().replace(/^\/\//, "https://");
  }
  return "";
}
function posFrom(dictData) {
  const out = [];
  for (const d of dictData) for (const m of (d.meanings || [])) {
    const defs = (m.definitions || []).slice(0, 4).map((x) => ({ def: x.definition || "", ex: x.example || "" })).filter((x) => x.def);
    const syn = (m.synonyms || []).slice(0, 6);
    if (defs.length || syn.length) out.push({ p: m.partOfSpeech || "", defs, syn });
  }
  return out.slice(0, 6);
}
function firstDefOf(pos) {
  for (const g of pos) for (const d of g.defs) if (d.def) return d.def;
  return "";
}


// Có phải tiếng Việt (có dấu) không — để nhận diện nhanh trước khi gọi mạng.
function looksVietnamese(s) {
  return /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(s || "");
}

// Google Dịch với nhận diện ngôn ngữ nguồn (sl=auto). Trả về { text, src }.
async function gtxTranslateDetect(text, to) {
  const params = "dt=t&sl=auto&tl=" + encodeURIComponent(to || "vi");
  const data = await gtxLay(params, encodeURIComponent(text));
  const segs = (data && data[0]) || [];
  const out = segs.map((s) => (s && s[0]) || "").join("").trim();
  const src = (data && data[2]) || "";
  return { text: out, src };
}

// ==== Tra một mục ====
/* ================== đường tra TIẾNG NHẬT (từ NJDict) ================== */

function kanjiInfo(word) {
  return self.HanTu.LIET_KE(word);
}

/** Chữ nào trong danh sách đã có trong sổ tay rồi. */
async function savedKanji(list) {
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const out = {};
  (list || []).forEach((k) => {
    const t = tomTat(nb[self.HanTu.KHOA(k.ch)]);
    if (t) out[k.ch] = t;
  });
  return out;
}

async function fetchMazii(word, dict) {
  const payload = { dict, type: "word", query: word, limit: 20, page: 1 };
  for (const url of ["https://mazii.net/api/search", "https://mazii.net/api/search/"]) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) continue;
      const data = await r.json();
      let arr = (data && (data.results || data.data)) || [];
      if (!Array.isArray(arr)) arr = [];
      const entries = arr.map((e) => ({
        word: e.word || e.title || e.text || e.query || "",
        reading: e.phonetic || e.pronounce || e.hiragana || "",
        means: normMeans(e)
      })).filter((x) => x.word || x.means.length);
      if (entries.length) return entries;
    } catch (e) { /* thử endpoint sau */ }
  }
  return [];
}
function normMeans(e) {
  if (Array.isArray(e.means)) return e.means.map((m) => (typeof m === "string" ? m : (m.mean || m.means || m.text || ""))).filter(Boolean);
  if (typeof e.mean === "string") return [e.mean];
  if (typeof e.short_mean === "string") return [e.short_mean];
  return [];
}

/** Có phải văn bản tiếng Nhật không (hiragana/katakana/kanji)? */
function hasJapanese(s) { return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s || ""); }

/* ====================================================================== */
/* Furigana                                                               */
/* ====================================================================== */
/*
 * Mazii cho cách đọc của phần lớn từ, nhưng không phải tất cả — và chỗ nó cho
 * thì cũng không đồng nhất: 「金融」 ra きんゆう, còn 「奪われます」 lại ra
 * "Ubawa remasu". Một mục nằm trong sổ mà không đọc nổi thì đến buổi ôn là bỏ
 * qua, nên ở đây vá cả hai chỗ:
 *
 *   - cách đọc đang là romaji  -> đổi ngược về hiragana, không tốn một lần gọi
 *     mạng nào;
 *   - không có cách đọc gì cả  -> hỏi phiên âm của Google (dt=rm) rồi đổi.
 *
 * Cách đọc suy ra được đánh dấu `docSuy` để giao diện nói thật với người đọc:
 * romaji đã đánh mất một phần thông tin (ō là おう hay おお?) nên chỗ nào phải
 * đoán thì đây chọn lối phổ biến hơn, và có thể trật.
 */

/** Đệm cách đọc theo từ, để tra lại cùng một từ không gọi mạng lần nữa. */
const kanaDem = new Map();

/** Phiên âm La-tinh của một chuỗi tiếng Nhật, lấy từ endpoint gtx (dt=rm). */
async function romajiCua(text) {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=rm"
    + "&sl=ja&tl=vi&q=" + encodeURIComponent(text);
  const r = await fetch(url);
  if (!r.ok) throw new Error("gtx HTTP " + r.status);
  const data = await r.json();
  // Google để phiên âm nguồn ở phần tử [3] của đoạn cuối (chỗ [0] rỗng).
  let rm = "";
  for (const seg of ((data && data[0]) || [])) {
    if (seg && seg[0] == null && typeof seg[3] === "string") rm += seg[3];
  }
  return rm.replace(/\s+/g, " ").trim();
}

/**
 * Cách đọc bằng kana cho một từ.
 * @returns {Promise<{doc: string, suy: boolean}|null>} null = cứ để nguyên.
 * @param {boolean} [choPhepMang] có được gọi mạng không. Lúc tra một lượt hai
 *   chục kết quả thì không, lúc BẤM LƯU một từ thì có — chỗ đó chỉ một từ, mà
 *   lại đúng là chỗ người dùng cần có furigana nhất.
 */
async function docKana(word, reading, choPhepMang) {
  const K = self.Kana;
  const w = (word || "").trim();
  if (!w || !hasJapanese(w)) return null;

  // Cách đọc đang là romaji: đổi tại chỗ, khỏi mạng.
  if (K.laRomaji(reading)) {
    const k = K.tuRomajiCum(reading);
    return k ? { doc: k, suy: true } : null;      // không đổi được thì giữ romaji còn hơn mất
  }
  if (reading && String(reading).trim()) return null;   // đã có kana rồi

  const san = K.docSan(w);
  if (san) return { doc: san, suy: false };             // toàn kana: chính nó là cách đọc
  if (!K.canDoc(w, reading) || !choPhepMang) return null;

  if (kanaDem.has(w)) { const c = kanaDem.get(w); return c ? { doc: c, suy: true } : null; }
  let k = "";
  try { k = self.Kana.tuRomajiCum(await romajiCua(w)); } catch (e) { k = ""; }
  kanaDem.set(w, k);
  return k ? { doc: k, suy: true } : null;
}

/** Vá cách đọc cho cả danh sách kết quả tra. Chỉ vài mục đầu mới được gọi mạng. */
async function themDoc(entries, soDuocGoiMang) {
  const ds = entries || [];
  for (let i = 0; i < ds.length; i++) {
    const e = ds[i];
    const r = await docKana(e.word, e.reading, i < (soDuocGoiMang || 0));
    if (r) { e.reading = r.doc; if (r.suy) e.docSuy = 1; else delete e.docSuy; }
  }
  return ds;
}

/**
 * Furigana cho một CÂU, đặt trên từng khúc chữ Hán.
 *
 * Vì sao không dùng `docKana`: nó trả về MỘT dòng kana cho cả cụm, mà một dòng
 * kana dài bằng cả câu thì đọc còn mệt hơn đọc chữ Hán. Cách đọc của câu phải
 * nằm đúng trên chữ sinh ra nó. Xem kana.js: xin kana của cả câu rồi trừ đi
 * phần kana đã có sẵn trong câu để suy ra phần của từng khúc chữ Hán.
 *
 * @returns {Promise<string[]>} cách đọc của các khúc chữ Hán, đúng thứ tự.
 *   [] = canh không khớp; furigana đặt sai chỗ còn tệ hơn không có.
 */
const rubyDem = new Map();
async function rubyCua(text) {
  const w = (text || "").trim();
  if (!w || !hasJapanese(w)) return [];
  if (rubyDem.has(w)) return rubyDem.get(w);
  let ra = [];
  try {
    const kana = self.Kana.tuRomajiCum(await romajiCua(w));
    ra = kana ? self.Kana.gonRuby(self.Kana.ghepFurigana(w, kana)) : [];
  } catch (e) { ra = []; }
  if (rubyDem.size > 400) rubyDem.clear();
  rubyDem.set(w, ra);
  return ra;
}

/** Ghép furigana cho một mục ĐÃ nằm trong sổ, rồi vá tại chỗ. Không đụng `ts`. */
async function rubyVaSau(key, word) {
  try {
    const rb = await rubyCua(word);
    if (!rb.length) return;
    const { notebook } = await chrome.storage.local.get("notebook");
    const nb = notebook || {};
    const it = nb[key];
    // Đọc lại ngay trước khi ghi: giữa lúc hỏi mạng có thể đã có lượt lưu khác,
    // mà mục cũng có thể đã bị xoá.
    if (!it || it.del || self.Kana.rubyKhop(it.word, it.ruby)) return;
    it.ruby = rb;
    it.docSuy = 1;
    await chrome.storage.local.set({ notebook: nb });
  } catch (e) { /* canh không được thì thôi */ }
}

/* ====================================================================== */

async function lookupEntry(rawWord, dict) {
  const word = (rawWord || "").trim();
  if (!word) return [];

  // Ngăn tiếng Nhật đi đường Mazii; ngăn tiếng Anh đi đường bên dưới.
  if (dict === "javi" || dict === "jvi") {
    // Vá furigana ngay ở đây, để cái hiện trên màn và cái được lưu là một.
    // Chỉ 4 kết quả đầu được gọi mạng: đó là những cái người ta thật sự nhìn.
    return themDoc(await fetchMazii(word, "javi"), 4);
  }

  if (dict === "vien") {
    // Việt -> Anh: lấy từ tiếng Anh (nhiều lựa chọn) rồi làm giàu IPA/định nghĩa
    let gv = null;
    try { gv = await gtxDict(word, "vi", "en"); } catch (e) { gv = null; }
    const en = gv ? gv.main : "";
    if (!en) return [];
    const dictData = await fetchDictionary(en);
    const synonyms = (gv.senses || []).map((s) => ({ p: s.pos, defs: [], syn: s.terms })).filter((s) => s.syn.length);
    const entry = {
      word: en,
      reading: dictData ? ipaFrom(dictData) : "",   // phiên âm IPA chuẩn
      audio: dictData ? audioFrom(dictData) : "",
      means: [word],                 // đầu vào tiếng Việt chính là nghĩa
      pos: (dictData ? posFrom(dictData) : []).concat(synonyms).slice(0, 8),
      dict: "vien"
    };
    return [entry];
  }

  if (dict === "vija") {
    /*
     * Việt -> Nhật. Dịch sang tiếng Nhật rồi TRA LẠI chính từ ấy bằng Mazii.
     *
     * Vì sao phải tra lại thay vì trả thẳng bản dịch: một từ tiếng Nhật trơ
     * gần như luôn là chữ Hán, mà chữ Hán không có cách đọc thì người học
     * không đọc lên được — tức là không dùng được để nói, đúng thứ họ đang cần.
     * Tra lại một lượt thì có furigana và cả mấy nghĩa lân cận để chọn cho đúng
     * sắc thái.
     */
    let gv = null;
    try { gv = await gtxDict(word, "vi", "ja"); } catch (e) { gv = null; }
    const ja = gv ? gv.main : "";
    if (!ja) return [];

    const ds = await fetchMazii(ja, "javi").catch(() => []);
    // Bản Mazii của ĐÚNG từ vừa dịch thì tin được; còn lại chỉ là gần đúng.
    const trung = ds.find((x) => x.word === ja);
    const doc = trung ? trung.reading : "";
    const entry = {
      word: ja,
      reading: doc,
      means: [word],                 // đầu vào tiếng Việt chính là nghĩa
      dict: "vija"
    };
    if (!entry.reading) {
      // Không tra được thì vẫn suy cách đọc, còn hơn để một dãy chữ Hán câm.
      try {
        const r = await docKana(ja, "", true);
        if (r) { entry.reading = r.doc; if (r.suy) entry.docSuy = 1; }
      } catch (e) { /* thôi vậy */ }
    }
    // Mấy cách nói khác cho cùng một ý — chọn được sắc thái thì câu mới tự nhiên.
    const khac = ds.filter((x) => x.word && x.word !== ja).slice(0, 5);
    return [entry].concat(khac.map((x) => Object.assign({}, x, { dict: "vija" })));
  }

  // Anh -> Việt (mặc định): nghĩa tiếng Việt NHIỀU TẦNG (dt=bd)
  const [dictData, gv] = await Promise.all([
    fetchDictionary(word),
    gtxDict(word, "en", "vi").catch(() => null)
  ]);
  const pos = dictData ? posFrom(dictData) : [];
  const means = gv ? meansFromSenses(gv.main, gv.senses) : [];
  if (!means.length) { const fd = firstDefOf(pos); if (fd) means.push("(EN) " + fd); }

  const entry = {
    word: word,
    reading: dictData ? ipaFrom(dictData) : "",   // phiên âm IPA chuẩn
    audio: dictData ? audioFrom(dictData) : "",
    means: means,
    pos: pos,
    dict: "envi"
  };
  if (!entry.means.length && !entry.pos.length && !entry.reading) return [];
  return [entry];
}

// Tự động nhận diện: tiếng Việt -> tra Việt→Anh, còn lại -> tra Anh→Việt.
async function lookupAuto(word) {
  if (looksVietnamese(word)) return lookupEntry(word, "vien");
  const en = await lookupEntry(word, "envi");
  if (en.length) return en;
  // Không ra kết quả tiếng Anh -> có thể là tiếng Việt không dấu / ngôn ngữ khác
  let src = "";
  try { const d = await gtxTranslateDetect(word, "en"); src = d.src; } catch (e) {}
  if (src && !src.startsWith("en")) return lookupEntry(word, "vien");
  return en;
}

// ==== Tra từ + bộ nhớ đệm ====
/**
 * @param {boolean} [chiHanTu] chỉ cần danh sách Hán tự, bỏ qua từ điển.
 *   Dùng khi bôi đen cả đoạn văn: tra nguyên đoạn như một từ thì chắc chắn
 *   rỗng, gọi mạng chỉ tổ chậm — mà Hán tự trong đoạn thì vẫn phải liệt kê đủ.
 */
async function handleLookup(rawWord, dict, chiHanTu) {
  const word = (rawWord || "").trim();
  if (!word) return { ok: false, error: "Chưa có từ" };
  const key = dict + ":" + word;

  // Hán tự chỉ có nghĩa ở phía tiếng Nhật; bên tiếng Anh thì bỏ qua hẳn cho nhẹ.
  const laJa = (dict === "javi" || dict === "kanji");
  const ks = () => (laJa ? kanjiInfo(word) : []);

  if (chiHanTu) {
    const k0 = ks();
    return { ok: true, word, dict, entries: [], kanji: k0, saved: {}, savedKanji: await savedKanji(k0) };
  }

  const { cache } = await chrome.storage.local.get("cache");
  const c = cache || {};
  const hit = c[key];
  const now = Date.now();
  if (hit && (now - (hit.ts || 0) < CACHE_TTL)) {
    const kC = ks();
    return {
      ok: true, word, dict, entries: hit.entries, kanji: kC,
      saved: await savedKeys(hit.entries, dict), savedKanji: await savedKanji(kC), cached: true
    };
  }

  const entries = (dict === "auto") ? await lookupAuto(word) : await lookupEntry(word, dict);
  if (entries.length) {
    c[key] = { entries, ts: now };
    trimCache(c);
    await chrome.storage.local.set({ cache: c });
  }
  const kR = ks();
  return {
    ok: true, word, dict, entries, kanji: kR,
    saved: await savedKeys(entries, dict), savedKanji: await savedKanji(kR)
  };
}

function trimCache(c) {
  const keys = Object.keys(c);
  if (keys.length <= CACHE_MAX) return;
  keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
  const drop = keys.length - CACHE_MAX;
  for (let i = 0; i < drop; i++) delete c[keys[i]];
}

/**
 * Tóm tắt một mục trong sổ tay cho các màn tra cứu.
 *
 * Bao gồm cả mục ĐÃ XOÁ mà bạn từng sửa tay: xem muc.js để biết vì sao bản dịch
 * của bạn phải sống lâu hơn mục đã xoá.
 */
function tomTat(en) { return self.Muc.banCuaBan(en); }

async function savedKeys(entries, dict) {
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const out = {};
  (entries || []).forEach((e) => {
    const t = tomTat(nb[(e.dict || dict) + ":" + e.word]);
    if (t) out[e.word] = t;
  });
  return out;
}

/**
 * Dịch NHIỀU câu trong một lượt.
 *
 * Vì sao cần hàm riêng thay vì gọi handleTranslate nhiều lần: mỗi lượt dịch lẻ
 * phải ĐỌC cả bộ đệm rồi GHI lại cả bộ đệm (tối đa 300 mục) vào chrome.storage.
 * Dịch một câu thì không thấy gì, nhưng bảng lời thoại có gần trăm câu — thành
 * gần trăm vòng đọc-ghi cả bộ đệm, và đó mới là thứ làm giao diện khựng, chứ
 * không phải mạng. Ở đây: đọc MỘT lần, ghi MỘT lần.
 *
 * Tiện thể sửa luôn một lỗi âm thầm của cách cũ: các lượt lẻ chạy song song đều
 * đọc-sửa-ghi cùng một object, nên lượt ghi sau xoá mất bản dịch của lượt trước
 * — bộ đệm gần như không giữ được gì, lần sau mở lại vẫn phải dịch lại từ đầu.
 */
async function handleTranslateMany(rawTexts, from, to) {
  const texts = (rawTexts || []).map((x) => String(x || "").trim());
  if (!texts.length) return { ok: true, texts: [] };
  const f = from || "en", t = to || "vi";

  const { trCache } = await chrome.storage.local.get("trCache");
  const c = trCache || {};
  const now = Date.now();
  const out = new Array(texts.length).fill("");
  const can = [];
  texts.forEach((x, i) => {
    if (!x) return;
    const h = c[f + ">" + t + ":" + x];
    if (h && now - (h.ts || 0) < TR_TTL) out[i] = h.v; else can.push(i);
  });

  // Song song có giới hạn: mở hết cùng lúc thì trình duyệt cũng xếp hàng ở tầng
  // kết nối, mà lỡ hỏng thì hỏng cả loạt.
  //
  // Và phải THỬ LẠI: gửi một loạt 40 câu thì bên kia hay chặn bớt vài câu giữa
  // chừng. Bỏ luôn câu hỏng thì trên bảng nó nằm mãi ở dấu "—" trong khi hàng
  // xóm hai bên đều có nghĩa — trông như mình bỏ sót, mà thật ra chỉ là một
  // lượt gọi trượt.
  // LibreTranslate trước: dịch CẢ LOẠT trong MỘT lượt — đường thoát khỏi Google.
  const libM = await libreCfg();
  const chiLibreM = !!(libM.url && libM.chi);
  if (can.length && libM.url) {
    try {
      const l = await libreDich(can.map((i) => texts[i]), f, t);
      if (l) l.forEach((x, j) => {
        if (x && x.text) { const i = can[j]; out[i] = x.text; c[f + ">" + t + ":" + texts[i]] = { v: x.text, target: t, ts: now }; }
      });
    } catch (e) { /* Libre trượt -> đường sau lo, trừ khi chỉ-Libre */ }
  }

  // Azure: dịch cả loạt trong một lượt. Bỏ qua khi đã chọn chỉ-LibreTranslate.
  if (can.length && !chiLibreM && can.some((i) => !out[i])) {
    try {
      const a = await azureDich(can.filter((i) => !out[i]).map((i) => texts[i]), f, t);
      const conAz = can.filter((i) => !out[i]);
      if (a) a.forEach((x, j) => {
        if (x && x.text) { const i = conAz[j]; out[i] = x.text; c[f + ">" + t + ":" + texts[i]] = { v: x.text, target: t, ts: now }; }
      });
    } catch (e) { /* Azure trượt -> để gtx lo */ }
  }

  const SONG = 6;
  let ke = 0;
  await Promise.all(new Array(Math.min(SONG, can.length)).fill(0).map(async () => {
    while (ke < can.length) {
      const i = can[ke++];
      if (out[i] || chiLibreM) continue;    // đã có, hoặc chỉ-Libre thì không đụng Google
      for (let lan = 0; lan < 3; lan++) {
        try {
          // gtxTranslate ở đây trả về CHUỖI (khác NJDict trả về object) — bộ đệm
          // của handleTranslate cũng ghi theo dạng { v, target }, nên phải giữ
          // đúng dạng ấy, kẻo hai đường ghi hai kiểu rồi đá nhau.
          const g = await gtxTranslate(texts[i], f, t);
          if (g) {
            out[i] = g;
            c[f + ">" + t + ":" + texts[i]] = { v: g, target: t, ts: now };
            break;
          }
        } catch (e) { /* thử lại, đừng kéo cả loạt xuống theo */ }
        if (lan < 2) await new Promise((r) => setTimeout(r, 250 * Math.pow(3, lan)));
      }
    }
  }));

  // gtx chết hẳn (bị chặn tần suất theo IP) thì bảng lời thoại trắng cả loạt —
  // đúng lúc đó máy chủ Apps Script là lối thoát, vì nó dịch TRÊN máy Google
  // chứ không từ IP người dùng. Chỉ gọi cho những dòng gtx bỏ lại, và giới hạn
  // song song để khỏi nện máy chủ nhà.
  const conThieu = chiLibreM ? [] : can.filter((i) => !out[i] && texts[i]);
  if (conThieu.length) {
    let m = 0;
    await Promise.all(new Array(Math.min(4, conThieu.length)).fill(0).map(async () => {
      while (m < conThieu.length) {
        const i = conThieu[m++];
        const v = await dichMayChu(texts[i], f, t);
        if (v) { out[i] = v; c[f + ">" + t + ":" + texts[i]] = { v: v, target: t, ts: now }; }
      }
    }));
  }

  const keys = Object.keys(c);
  if (keys.length > TR_MAX) {
    keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
    for (let i = 0; i < keys.length - TR_MAX; i++) delete c[keys[i]];
  }
  await chrome.storage.local.set({ trCache: c });
  return { ok: true, texts: out };
}

/** Câu này đã lưu vào sổ tay chưa — và bạn đã sửa lại bản dịch của nó chưa. */
async function daLuuCau(text) {
  try {
    const { notebook } = await chrome.storage.local.get("notebook");
    return tomTat((notebook || {})["envi:" + text]);
  } catch (e) { return null; }
}

// ==== Lưu từ vào sổ tay ====
async function saveWord(entry, dict) {
  if (!entry || !entry.word) throw new Error("Thiếu dữ liệu từ");
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const d = (entry.dict && entry.dict !== "auto") ? entry.dict : (dict === "auto" ? "envi" : dict);
  const key = d + ":" + entry.word;
  const old = nb[key];
  const e = {
    word: entry.word, reading: entry.reading || "", means: entry.means || [], dict: d, ts: Date.now()
  };
  // Chốt chặn cuối cho furigana: popup, thẻ tra trong trang và bảng lời thoại
  // YouTube đều đi qua đây, nên vá ở đây là vá cho tất cả. Một từ thì gọi mạng
  // được — mà đây đúng là lúc người dùng cần cách đọc nhất.
  if (d === "javi" || d === "vija") {
    try {
      const r = await docKana(e.word, e.reading, entry.kind !== "sent");
      if (r) { e.reading = r.doc; if (r.suy) e.docSuy = 1; }
    } catch (err) { /* không có furigana thì vẫn lưu, đừng chặn việc lưu */ }
  }
  if (entry.pos && entry.pos.length) e.pos = entry.pos;      // định nghĩa/ví dụ tiếng Anh
  if (entry.audio) e.audio = entry.audio;                     // link phát âm
  if (entry.kanji) e.kanji = entry.kanji;                     // on/kun/số nét/JLPT/bộ thủ
  if (entry.kind) e.kind = entry.kind;                        // "sent" = câu đã dịch
  if (entry.src && entry.src.url) e.src = entry.src;          // nguồn: {url, title, sel}
  // Lần lưu này có mang theo bản sửa tay (sửa ngay trong popup) hay không.
  if (entry.note != null) e.note = String(entry.note);
  if (entry.mEdit) { e.mEdit = 1; if (entry.mOrig) e.mOrig = entry.mOrig; }
  // Lưu lại một mục ĐÃ XOÁ: chỉ nhặt lại phần bạn tự viết, không nhặt lại tiến
  // độ ôn hay sổ con — bạn xoá nó vì đã thuộc, không phải vì viết nhầm.
  if (old && old.del) {
    if (e.note == null && old.note) e.note = old.note;
    // Kể cả đường link: lượt lưu này thường không có nguồn nào (gõ vào ô tra chứ
    // không phải bôi đen trên trang), mà cái link cũ — nhất là mốc phút video —
    // thì không tìm lại được nữa. Xem muc.js.
    if (!(e.src && e.src.url) && old.src && old.src.url) e.src = old.src;
    if (!entry.mEdit && old.mEdit) {
      e.mEdit = 1; e.means = old.means; if (old.mOrig) e.mOrig = old.mOrig;
    }
    if (e.mEdit && !e.mOrig && old.mOrig) e.mOrig = old.mOrig;
  }
  if (old && !old.del) {                                      // lưu lại từ đã có -> GIỮ mọi thứ bạn đã tự làm
    if (old.deck) e.deck = old.deck;
    if (old.srs) e.srs = old.srs;
    if (old.kind && !e.kind) e.kind = old.kind;
    if (old.src && !e.src) e.src = old.src;
    if (old.kanji && !e.kanji) e.kanji = old.kanji;
    if (old.ruby && !e.ruby) { e.ruby = old.ruby; if (old.docSuy) e.docSuy = 1; }
    if (old.fav) e.fav = old.fav;
    if (e.note == null && old.note) e.note = old.note;
    // Bản dịch bạn đã sửa tay thì KHÔNG được để máy dịch đè lên. Tra lại cùng
    // một từ là chuyện thường xuyên; mỗi lần tra lại mà mất công hiệu đính thì
    // chẳng ai buồn sửa nữa. Ngoại lệ duy nhất: chính lần lưu này là một bản
    // sửa mới — lúc đó cái mới mới là ý bạn, bản cũ phải nhường.
    if (!entry.mEdit && old.mEdit) {
      e.mEdit = 1; e.means = old.means; if (old.mOrig) e.mOrig = old.mOrig;
    }
    // Bản gốc của máy chỉ ghi một lần, ở lần sửa đầu tiên; sửa tiếp lần hai
    // thì "gốc" vẫn phải là bản máy dịch chứ không phải bản sửa lần trước.
    if (e.mEdit && !e.mOrig && old.mOrig) e.mOrig = old.mOrig;
  }
  nb[key] = e;
  await chrome.storage.local.set({ notebook: nb });
  // Còn trắng cách đọc mà vẫn có chữ Hán, tức đây là một CÂU (hoặc một cụm dài)
  // — thứ mà `docKana` cố tình không đụng tới, nên câu lời thoại YouTube lưu
  // xong là chẳng có cách đọc nào. Ghép furigana theo từng khúc chữ Hán.
  //
  // Vá SAU khi đã ghi, và KHÔNG chờ: bấm Lưu thì phải lưu xong ngay. Bắt cả
  // lượt lưu đứng chờ một lượt hỏi mạng chỉ để làm đẹp cách đọc là đổi một thứ
  // chắc chắn lấy một thứ hên xui — mạng chậm thì nút treo, mạng hỏng thì mất
  // luôn cảm giác "đã lưu".
  if ((d === "javi" || d === "vija") && !e.reading && !e.ruby) rubyVaSau(key, e.word);
  // Mục MỚI hoàn toàn mới tính vào "hôm nay lưu bao nhiêu"; lưu đè một mục đã có
  // (tra lại cùng một từ) thì không, nếu không con số đó chỉ đếm số lần bấm nút.
  if (!old || old.del) await ghiNhanLuu(self.Ngu.nguCuaKhoa(key));
}

/**
 * Cộng một mục vào nhật ký học của hôm nay, ĐÚNG NGĂN ngôn ngữ của mục đó.
 *
 * Service worker không dùng được bộ theo dõi trong tien-do.js (nó cần DOM để vẽ),
 * nên chỗ này ghi thẳng vào cùng cấu trúc dữ liệu — vẫn qua TienDo.chuanHoa để
 * không bao giờ ghi ra hình dạng lạ.
 *
 * PHẢI đi qua Ngu.tachHoc. Từ ngày gộp hai ngôn ngữ, `hoc` có hình dạng
 * {ja, en}; đưa thẳng nó cho TienDo.chuanHoa thì nó không thấy log/badges nào ở
 * cấp ngoài nên trả về một bản TRẮNG, và lượt ghi kế tiếp đè bản trắng ấy lên
 * cả hai ngôn ngữ — lưu đúng một từ là bay sạch chuỗi ngày, nhật ký và huy hiệu
 * của cả hai bên.
 */
async function ghiNhanLuu(ngu) {
  try {
    const { hoc } = await chrome.storage.local.get("hoc");
    const tach = self.Ngu.tachHoc(hoc);
    const n = self.Ngu.hopLe(ngu || (await nguHienTai()));
    const d = self.TienDo.chuanHoa(tach[n]);
    const iso = self.TienDo.homNay();
    if (!d.log[iso]) d.log[iso] = { r: 0, y: 0, n: 0, s: 0, sm: 0, km: 0 };
    d.log[iso].s += 1;
    await chrome.storage.local.set({ hoc: Object.assign({}, tach, { [n]: d }) });
  } catch (e) { /* không ghi được nhật ký thì cũng không được làm hỏng việc lưu từ */ }
}

// ==== Dịch câu: gọi thẳng Google Dịch (nhanh), Apps Script làm dự phòng ====
const TR_MAX = 1200;
const TR_TTL = 30 * 86400000;

/**
 * Dịch qua LibreTranslate / Argos — ĐƯỜNG THOÁT KHỎI GOOGLE.
 *
 * Argos là bộ máy dịch chạy ngoại tuyến; LibreTranslate là máy chủ web bọc
 * quanh nó. Người dùng tự dựng một máy chủ LibreTranslate (hoặc trỏ vào một máy
 * chủ mở), rồi khai địa chỉ vào đây — từ đó bản dịch KHÔNG còn đi qua Google,
 * nên không dính cái chặn tần suất theo IP mà người dùng đang khổ vì nó.
 *
 * Nhận một MẢNG câu, dịch trong MỘT lượt (LibreTranslate cho `q` là mảng), trả
 * mảng { text, detected } đúng thứ tự. Chưa khai địa chỉ thì trả null để chỗ
 * gọi đi tiếp đường khác.
 *
 * `chi` = "chỉ dùng LibreTranslate": bật thì khi máy chủ này hỏng, KHÔNG lặng
 * lẽ quay về Google — đúng ý người muốn dứt hẳn với Google, thà báo lỗi để họ
 * biết mà sửa máy chủ.
 */
async function libreCfg() {
  const { libreUrl, libreKey, libreChi } = await chrome.storage.local.get(["libreUrl", "libreKey", "libreChi"]);
  return {
    url: (libreUrl || "").trim().replace(/\/+$/, ""),
    key: (libreKey || "").trim(),
    chi: !!libreChi
  };
}
async function libreDich(texts, f, t) {
  const { url, key } = await libreCfg();
  if (!url) return null;
  const body = {
    q: (texts || []).map((x) => String(x || "")),
    source: (f && f !== "auto") ? f : "auto",
    target: t,
    format: "text"
  };
  if (key) body.api_key = key;
  const r = await fetch(url + "/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("libre HTTP " + r.status);
  const d = await r.json();
  let tt = d && d.translatedText;
  if (typeof tt === "string") tt = [tt];             // gửi một câu thì trả chuỗi
  if (!Array.isArray(tt)) throw new Error("libre: dữ liệu lạ");
  const det = d && d.detectedLanguage;
  return tt.map((x, i) => ({
    text: typeof x === "string" ? x : ((x && x.translatedText) || ""),
    detected: Array.isArray(det) ? ((det[i] && det[i].language) || "") : ((det && det.language) || "")
  }));
}

/**
 * Dịch qua Azure Translator — ĐƯỜNG CHÍNH.
 *
 * Vì sao Azure chứ không phải cửa gtx của Google: gtx là cửa nội bộ không chính
 * thức, chặn tần suất theo IP, tra một hồi là tắc. Azure có API chính thức, hạn
 * mức miễn phí rộng (2 triệu ký tự/tháng), key riêng của người dùng nên không
 * ai tranh phần — và nó dịch được CẢ LOẠT trong một lượt, đúng thứ bảng lời
 * thoại YouTube cần.
 *
 * Nhận một MẢNG câu, trả một mảng { text, detected } đúng thứ tự — dùng chung
 * cho cả dịch một câu (mảng một phần tử) lẫn dịch cả loạt. Chưa cấu hình key
 * thì trả null để chỗ gọi rơi xuống đường sau; lỗi thì ném ra, cũng để rơi
 * xuống đường sau.
 *
 * `from` để trống hoặc "auto" thì Azure tự nhận ngôn ngữ nguồn (trường
 * detectedLanguage), nhờ vậy tab Dịch tự-đoán vẫn chạy qua Azure.
 */
async function azureCfg() {
  const { azureKey, azureRegion } = await chrome.storage.local.get(["azureKey", "azureRegion"]);
  return { key: (azureKey || "").trim(), region: (azureRegion || "").trim() };
}
async function azureDich(texts, f, t) {
  const { key, region } = await azureCfg();
  if (!key) return null;                       // chưa cấu hình -> để đường khác lo
  const url = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0"
    + (f && f !== "auto" ? "&from=" + encodeURIComponent(f) : "")
    + "&to=" + encodeURIComponent(t);
  const headers = { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json" };
  // Key theo VÙNG thì bắt buộc gửi kèm; key "Global" thì bỏ trống, gửi vào lại hỏng.
  if (region) headers["Ocp-Apim-Subscription-Region"] = region;
  const r = await fetch(url, {
    method: "POST", headers,
    body: JSON.stringify((texts || []).map((x) => ({ Text: String(x || "") })))
  });
  if (!r.ok) throw new Error("azure HTTP " + r.status);
  const data = await r.json();
  if (!Array.isArray(data)) throw new Error("azure: dữ liệu lạ");
  return data.map((d) => ({
    text: (d && d.translations && d.translations[0] && d.translations[0].text) || "",
    detected: (d && d.detectedLanguage && d.detectedLanguage.language) || ""
  }));
}

/**
 * Dịch qua máy chủ Apps Script của người dùng — đường DỰ PHÒNG không dính IP.
 *
 * Khi gtx bị Google chặn tần suất theo IP, đây là lối thoát: LanguageApp chạy
 * TRÊN máy chủ Google, không phải từ trình duyệt của người dùng, nên không bị
 * cùng cái chặn ấy. Trả về chuỗi rỗng khi không dùng được (chưa cấu hình, hỏng
 * mạng, máy chủ báo lỗi) — chỗ gọi tự quyết nói lỗi thế nào; nới cả vài cách
 * đặt tên trường mà bản Apps Script cũ có thể trả về.
 */
async function dichMayChu(text, f, t) {
  try {
    const { syncUrl, syncToken } = await chrome.storage.local.get(["syncUrl", "syncToken"]);
    if (!syncUrl) return "";
    const r = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: syncToken || "", action: "translate", text, from: f, to: t })
    });
    const data = await r.json().catch(() => null);
    if (!data || data.ok === false) return "";
    return String(data.text || data.translation || data.result || "");
  } catch (e) { return ""; }
}

async function handleTranslate(rawText, from, to) {
  // Dọn ngay đầu vào: vùng chọn dính công thức mang theo ký tự vô hình và
  // MathML ẩn. Dọn ở đây thì khoá bộ nhớ đệm, chuỗi lưu vào sổ, và chuỗi gửi
  // Google đều là một bản sạch như nhau.
  const text = donDich(rawText).slice(0, 5000);
  if (!text) return { ok: false, error: "Chưa có nội dung" };
  let f = from || "en", t = to || "vi";

  const { trCache } = await chrome.storage.local.get("trCache");
  const c = trCache || {};
  const now = Date.now();
  const fresh = (k) => { const h = c[k]; return (h && (now - (h.ts || 0) < TR_TTL)) ? h : null; };
  const store = (k, v, target) => {
    c[k] = { v, target, ts: now };
    const keys = Object.keys(c);
    if (keys.length > TR_MAX) { keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0)); for (let i = 0; i < keys.length - TR_MAX; i++) delete c[keys[i]]; }
  };

  // Tự động nhận diện nguồn rồi dịch sang ngôn ngữ còn lại (Việt <-> Anh).
  if (f === "auto") {
    if (looksVietnamese(text)) { f = "vi"; t = "en"; }
    else {
      const ak = "auto>en:" + text;
      const ah = fresh(ak);
      if (ah) return { ok: true, text: ah.v, target: ah.target || "en", cached: true, saved: await daLuuCau(text) };
      let detected = null;
      try { const l = await libreDich([text], "auto", "en"); if (l && l[0] && l[0].text) detected = { text: l[0].text, src: l[0].detected }; } catch (e) {}
      if (!detected || !detected.text) { try { const a = await azureDich([text], "auto", "en"); if (a && a[0] && a[0].text) detected = { text: a[0].text, src: a[0].detected }; } catch (e) {} }
      if (!detected || !detected.text) { try { detected = await gtxTranslateDetect(text, "en"); } catch (e) {} }
      if (detected && detected.text && detected.src && !detected.src.startsWith("en")) {
        store(ak, detected.text, "en");
        await chrome.storage.local.set({ trCache: c });
        return { ok: true, text: detected.text, target: "en", saved: await daLuuCau(text) };
      }
      f = "en"; t = "vi";   // nguồn là tiếng Anh -> dịch sang tiếng Việt
    }
  }

  const key = f + ">" + t + ":" + text;
  const hit = fresh(key);
  if (hit) return { ok: true, text: hit.v, target: t, cached: true, saved: await daLuuCau(text) };

  // Chuỗi đường dịch, dừng ở cái ĐẦU TIÊN ra kết quả:
  //   1) Azure (đường chính, key của người dùng — ổn định, không chặn kiểu IP)
  //   2) gtx của Google (xoay vòng cổng)   3) máy chủ Apps Script
  let out = "";
  // LibreTranslate trước — đường thoát khỏi Google. Rồi mới tới Azure/gtx/Apps
  // Script. Bật "chỉ LibreTranslate" thì dừng hẳn ở đây, không đụng Google.
  try { const l = await libreDich([text], f, t); if (l && l[0] && l[0].text) out = l[0].text; } catch (e) { /* Libre trượt */ }
  const lib = await libreCfg();
  const chiLibre = !!(lib.url && lib.chi);
  if (!out && !chiLibre) {
    try { const a = await azureDich([text], f, t); if (a && a[0] && a[0].text) out = a[0].text; } catch (e) { /* Azure trượt -> gtx */ }
    if (!out) { try { out = await gtxTranslate(text, f, t); } catch (e) { out = ""; } }
    if (!out) out = await dichMayChu(text, f, t);
  }
  if (!out) {
    if (chiLibre) return { ok: false, error: "Máy chủ LibreTranslate không phản hồi (và bạn đã chọn CHỈ dùng LibreTranslate). Kiểm tra lại địa chỉ máy chủ, hoặc tắt tuỳ chọn 'chỉ LibreTranslate' để mượn tạm Google." };
    const { syncUrl } = await chrome.storage.local.get("syncUrl");
    return { ok: false, error: syncUrl
      ? "Google đang tạm chặn dịch vì quá nhiều lượt, mà máy chủ dự phòng cũng chưa trả về được. Hãy thử lại sau ít phút."
      : "Google đang tạm chặn dịch vì quá nhiều lượt. Thử lại sau ít phút, hoặc cấu hình đồng bộ để dùng máy chủ dự phòng." };
  }

  store(key, out, t);
  await chrome.storage.local.set({ trCache: c });
  return { ok: true, text: out, target: t, saved: await daLuuCau(text) };
}

// ==== Đồng bộ Google Drive qua Apps Script ====
async function driveRequest(body, ngu) {
  const k = self.Ngu.khoaSync(ngu || "en");
  const kho = await chrome.storage.local.get([k.url, k.token]);
  const syncUrl = kho[k.url], syncToken = kho[k.token];
  if (!syncUrl) throw new Error("Chưa cấu hình URL đồng bộ cho tiếng " + self.Ngu.ten(ngu));
  const r = await fetch(syncUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: syncToken || "" }, body))
  });
  const data = await r.json();
  if (!data || data.ok === false) throw new Error((data && data.error) || "Lỗi máy chủ đồng bộ");
  return data;
}

/*
 * Ảnh đính kèm KHÔNG đi lên Drive.
 *
 * Byte ảnh nằm trong IndexedDB của từng máy (xem anh.js), nên bản mô tả `anh`
 * gửi lên chỉ là một con trỏ trỏ vào ổ đĩa của máy này — sang máy khác nó là
 * con trỏ chết, hiện ra một ô ảnh trắng không ai giải thích được. Bỏ nó khỏi
 * gói gửi đi, và trả lại vào bản ghi xuống máy, để một lượt đồng bộ không bao
 * giờ gỡ mất ảnh của chính mình.
 */
function boAnh(nb) {
  const ra = {};
  for (const k in (nb || {})) {
    const e = nb[k];
    if (e && e.anh) { const b = Object.assign({}, e); delete b.anh; ra[k] = b; }
    else ra[k] = e;
  }
  return ra;
}
function traAnh(dich, nguon) {
  for (const k in (nguon || {})) {
    const cu = nguon[k];
    if (cu && cu.anh && cu.anh.length && dich[k] && !dich[k].anh) {
      dich[k] = Object.assign({}, dich[k], { anh: cu.anh });
    }
  }
  return dich;
}

/**
 * Gộp hai kho mục. Mốc nào mới hơn thì đè, RIÊNG tiến độ ôn so bằng mốc của
 * lần chấm bài — xem `Muc.tron` trong muc.js để biết vì sao phải tách ra.
 */
function mergeByTs(a, b) {
  return self.Muc.tron(a, b);
}
function countActive(nb) { let n = 0; for (const k in nb) if (!nb[k].del) n++; return n; }

// Mỗi ngôn ngữ một lượt đồng bộ riêng, và không cho hai lượt CÙNG ngôn ngữ
// chạy chồng lên nhau (chồng nhau thì hai bên đọc-sửa-ghi cùng một kho).
const syncing = {};

function syncNow(rawNgu) {
  const ngu = self.Ngu.hopLe(rawNgu);
  if (syncing[ngu]) return syncing[ngu];
  syncing[ngu] = doSync(ngu).finally(() => { syncing[ngu] = null; });
  return syncing[ngu];
}

/** Đồng bộ CẢ HAI cloud. Bên nào chưa khai URL thì lặng lẽ bỏ qua. */
async function syncTatCa() {
  let n = 0;
  for (const ngu of self.Ngu.DS) {
    const k = self.Ngu.khoaSync(ngu);
    const kho = await chrome.storage.local.get(k.url);
    if (!kho[k.url]) continue;
    try { n += await syncNow(ngu); } catch (e) { /* bên kia hỏng thì bên này vẫn chạy */ }
  }
  return n;
}

/**
 * Đồng bộ MỘT ngôn ngữ với cloud của chính nó.
 *
 * Hai điều phải tuyệt đối giữ đúng, vì sai là mất dữ liệu thật trên Drive:
 *
 *  1. Chỉ GỬI LÊN phần thuộc ngôn ngữ này (Ngu.locSo). Cloud tiếng Nhật không
 *     được nhận từ vựng tiếng Anh, và ngược lại — mỗi kho giữ đúng thứ của nó,
 *     y như hồi còn là hai extension riêng.
 *  2. Khi GHI XUỐNG MÁY thì phải giữ nguyên phần của ngôn ngữ KIA. Ở đây dùng
 *     mergeByTs, mà phép đó là phép HỢP — nên phần kia không thể bị xoá, kể cả
 *     lúc cloud này trả về rỗng.
 *
 * Và như bản cũ: sổ tay rỗng không bao giờ xoá được cloud, vì rỗng ∪ cloud =
 * cloud. Cài mới rồi bấm đồng bộ là kéo hết về, không mất gì.
 */
async function doSync(rawNgu) {
  const ngu = self.Ngu.hopLe(rawNgu);
  const resp = await driveRequest({ action: "load" }, ngu);
  const data = (resp && resp.data) || {};
  let remoteNb, remoteDecks, remoteHoc;
  if (data && typeof data === "object" && data.notebook !== undefined) {
    remoteNb = data.notebook || {};
    remoteDecks = data.decks || {};
    remoteHoc = data.hoc || null;
  } else {
    remoteNb = data || {}; remoteDecks = {}; remoteHoc = null;
  }
  // Cloud cũ có thể lẫn khoá của ngôn ngữ khác (đồng bộ nhầm một lần nào đó).
  // Vẫn nhận về máy — không vứt dữ liệu của người dùng — nhưng khi gửi lên thì
  // lọc lại cho sạch.
  const remoteCuaToi = self.Ngu.locSo(remoteNb, ngu);

  const store = await chrome.storage.local.get(["notebook", "decks", "hoc"]);
  const hocTach = self.Ngu.tachHoc(store.hoc);
  const nbCuaToi = self.Ngu.locSo(store.notebook || {}, ngu);

  const mergedNgu = mergeByTs(nbCuaToi, remoteCuaToi);
  // Sổ con cũng tách theo ngôn ngữ, đúng như hồi còn là hai extension: cloud
  // tiếng Nhật không nhận sổ tiếng Anh và ngược lại.
  const soCuaToi = self.Ngu.locSoCon(store.decks || {}, store.notebook || {}, ngu);
  const mergedDecks = mergeByTs(soCuaToi, self.Ngu.locSoCon(remoteDecks, remoteNb, ngu));
  // Tiến độ học KHÔNG trộn theo kiểu "bản mới hơn thắng" như sổ tay — xem
  // TienDo.tron() để biết vì sao (tóm tắt: 8 lượt trên điện thoại và 5 lượt
  // trên máy tính đều là lượt thật, không bên nào được xoá bên nào).
  const mergedHoc = self.TienDo.tron(hocTach[ngu], remoteHoc);

  const guiDi = boAnh(mergedNgu);
  await driveRequest({
    action: "save",
    data: { notebook: guiDi, decks: mergedDecks, hoc: mergedHoc }
  }, ngu);

  // Đọc lại dữ liệu máy NGAY TRƯỚC KHI GHI: người dùng có thể vừa sửa (phân
  // loại sổ, xoá, chấm điểm...) trong lúc chờ mạng -> phải giữ các thay đổi đó.
  const fresh = await chrome.storage.local.get(["notebook", "decks", "hoc"]);
  const freshHoc = self.Ngu.tachHoc(fresh.hoc);
  // mergeByTs là phép HỢP: phần ngôn ngữ kia trong fresh.notebook đi qua nguyên vẹn.
  // traAnh: bản trên Drive không mang `anh`, nên nếu để nguyên thì mỗi lượt
  // đồng bộ lại gỡ sạch ảnh của chính máy này.
  const finalNb = traAnh(mergeByTs(fresh.notebook || {}, mergeByTs(remoteNb, mergedNgu)), fresh.notebook || {});
  const finalDecks = mergeByTs(fresh.decks || {}, mergedDecks);
  const finalHocNgu = self.TienDo.tron(freshHoc[ngu], mergedHoc);
  const finalHoc = Object.assign({}, freshHoc, { [ngu]: finalHocNgu });
  await chrome.storage.local.set({ notebook: finalNb, decks: finalDecks, hoc: finalHoc });

  // Có thay đổi mới phát sinh -> đẩy nốt lên Drive ở lượt sau
  // So bản ĐÃ BỎ ẢNH với gói vừa gửi: so bản còn ảnh thì lần nào cũng khác
  // nhau, và lượt đồng bộ này tự hẹn lượt sau, mãi mãi.
  if (JSON.stringify(boAnh(self.Ngu.locSo(finalNb, ngu))) !== JSON.stringify(guiDi) ||
      JSON.stringify(self.Ngu.locSoCon(finalDecks, finalNb, ngu)) !== JSON.stringify(mergedDecks) ||
      JSON.stringify(finalHocNgu) !== JSON.stringify(mergedHoc)) {
    scheduleSync(ngu);
  }
  return countActive(self.Ngu.locSo(finalNb, ngu));
}