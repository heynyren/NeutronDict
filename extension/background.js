importScripts("tien-do.js");   // self.TienDo — để trộn tiến độ học khi đồng bộ

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
    await saveWord(entry, "envi");
    scheduleSync();
    flashBadge("✓", "#1a9d5a");
  } catch (e) {
    flashBadge("!", "#d33");
  }
}

async function openPopupWindow(rawText, tab) {
  const word = rawText.trim();
  if (!word) return;
  const src = (tab && /^https?:/i.test(tab.url || ""))
    ? { url: tab.url, title: (tab.title || "").slice(0, 200), sel: word } : null;
  await chrome.storage.local.set({ pendingLookup: { word, ts: Date.now(), src } });
  const W = 430, H = 620;
  const opts = { url: chrome.runtime.getURL("popup.html?ctx=1"), type: "popup", width: W, height: H };
  try {
    if (tab && tab.windowId != null) {
      const win = await chrome.windows.get(tab.windowId);
      if (win && win.width) {
        opts.left = Math.max(0, (win.left || 0) + win.width - W - 24);
        opts.top = (win.top || 0) + 80;
      }
    }
  } catch (e) { /* để Chrome tự đặt */ }
  await chrome.windows.create(opts);
}

// ==== Tin nhắn ====
let syncTimer = null;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === "LOOKUP") {
    handleLookup(msg.word, msg.dict || "envi")
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SAVE_WORD") {
    saveWord(msg.entry, msg.dict || "envi")
      .then(() => { scheduleSync(); sendResponse({ ok: true }); })
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
    syncNow().then((n) => sendResponse({ ok: true, count: n }))
             .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  if (msg.type === "SYNC_SOON") { scheduleSync(); return; }
});

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncNow().catch(() => {}); }, 2500);
}

// ==== Google Dịch (endpoint công khai gtx) ====
// dt=t (bản dịch) + dt=bd (từ điển nhiều nghĩa theo loại từ).
async function gtxData(from, to, text) {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd"
    + "&sl=" + encodeURIComponent(from) + "&tl=" + encodeURIComponent(to)
    + "&q=" + encodeURIComponent(text);
  const r = await fetch(url);
  if (!r.ok) throw new Error("gtx HTTP " + r.status);
  return r.json();
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
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t"
    + "&sl=auto&tl=" + encodeURIComponent(to || "vi")
    + "&q=" + encodeURIComponent(text);
  const r = await fetch(url);
  if (!r.ok) throw new Error("gtx HTTP " + r.status);
  const data = await r.json();
  const segs = (data && data[0]) || [];
  const out = segs.map((s) => (s && s[0]) || "").join("").trim();
  const src = (data && data[2]) || "";
  return { text: out, src };
}

// ==== Tra một mục ====
async function lookupEntry(rawWord, dict) {
  const word = (rawWord || "").trim();
  if (!word) return [];

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
async function handleLookup(rawWord, dict) {
  const word = (rawWord || "").trim();
  if (!word) return { ok: false, error: "Chưa có từ" };
  const key = dict + ":" + word;

  const { cache } = await chrome.storage.local.get("cache");
  const c = cache || {};
  const hit = c[key];
  const now = Date.now();
  if (hit && (now - (hit.ts || 0) < CACHE_TTL)) {
    return { ok: true, word, dict, entries: hit.entries, saved: await savedKeys(hit.entries, dict), cached: true };
  }

  const entries = (dict === "auto") ? await lookupAuto(word) : await lookupEntry(word, dict);
  if (entries.length) {
    c[key] = { entries, ts: now };
    trimCache(c);
    await chrome.storage.local.set({ cache: c });
  }
  return { ok: true, word, dict, entries, saved: await savedKeys(entries, dict) };
}

function trimCache(c) {
  const keys = Object.keys(c);
  if (keys.length <= CACHE_MAX) return;
  keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
  const drop = keys.length - CACHE_MAX;
  for (let i = 0; i < drop; i++) delete c[keys[i]];
}

/**
 * Tóm tắt một mục đã có trong sổ tay, để popup biết mà hiện sẵn BẢN CỦA BẠN.
 *
 * Trả về object (vẫn "thật" khi kiểm tra truthy như bản cũ trả `true`), nhưng
 * kèm theo ghi chú và bản nghĩa bạn đã sửa tay. Nhờ vậy tra lại một từ đã hiệu
 * đính thì popup hiện đúng nghĩa bạn chốt, chứ không hiện lại nghĩa của từ điển
 * rồi bắt bạn nhớ là mình đã sửa rồi.
 */
function tomTat(en) {
  if (!en || en.del) return null;
  const o = { saved: true };
  if (en.note) o.note = en.note;
  if (en.mEdit) { o.mEdit = 1; o.means = en.means || []; }
  return o;
}

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
  if (entry.pos && entry.pos.length) e.pos = entry.pos;      // định nghĩa/ví dụ tiếng Anh
  if (entry.audio) e.audio = entry.audio;                     // link phát âm
  if (entry.kind) e.kind = entry.kind;                        // "sent" = câu đã dịch
  if (entry.src && entry.src.url) e.src = entry.src;          // nguồn: {url, title, sel}
  // Lần lưu này có mang theo bản sửa tay (sửa ngay trong popup) hay không.
  if (entry.note != null) e.note = String(entry.note);
  if (entry.mEdit) { e.mEdit = 1; if (entry.mOrig) e.mOrig = entry.mOrig; }
  if (old && !old.del) {                                      // lưu lại từ đã có -> GIỮ mọi thứ bạn đã tự làm
    if (old.deck) e.deck = old.deck;
    if (old.srs) e.srs = old.srs;
    if (old.kind && !e.kind) e.kind = old.kind;
    if (old.src && !e.src) e.src = old.src;
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
  // Mục MỚI hoàn toàn mới tính vào "hôm nay lưu bao nhiêu"; lưu đè một mục đã có
  // (tra lại cùng một từ) thì không, nếu không con số đó chỉ đếm số lần bấm nút.
  if (!old || old.del) await ghiNhanLuu();
}

/**
 * Cộng một mục vào nhật ký học của hôm nay.
 *
 * Service worker không dùng được bộ theo dõi trong tien-do.js (nó cần DOM để vẽ),
 * nên chỗ này ghi thẳng vào cùng cấu trúc dữ liệu — vẫn qua TienDo.chuanHoa để
 * không bao giờ ghi ra hình dạng lạ.
 */
async function ghiNhanLuu() {
  try {
    const { hoc } = await chrome.storage.local.get("hoc");
    const d = self.TienDo.chuanHoa(hoc);
    const iso = self.TienDo.homNay();
    if (!d.log[iso]) d.log[iso] = { r: 0, y: 0, n: 0, s: 0, sm: 0, km: 0 };
    d.log[iso].s += 1;
    await chrome.storage.local.set({ hoc: d });
  } catch (e) { /* không ghi được nhật ký thì cũng không được làm hỏng việc lưu từ */ }
}

// ==== Dịch câu: gọi thẳng Google Dịch (nhanh), Apps Script làm dự phòng ====
const TR_MAX = 300;
const TR_TTL = 30 * 86400000;

async function handleTranslate(rawText, from, to) {
  const text = (rawText || "").trim();
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
      try { detected = await gtxTranslateDetect(text, "en"); } catch (e) {}
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

  // 1) Nhanh: gọi thẳng Google Dịch.  2) Dự phòng: Apps Script.
  let out = "";
  try { out = await gtxTranslate(text, f, t); } catch (e) { out = ""; }
  if (!out) {
    const { syncUrl, syncToken } = await chrome.storage.local.get(["syncUrl", "syncToken"]);
    if (!syncUrl) return { ok: false, error: "Không dịch được lúc này (và chưa cấu hình đồng bộ để dùng máy chủ dự phòng)." };
    const r = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: syncToken || "", action: "translate", text, from: f, to: t })
    });
    const data = await r.json();
    if (!data || data.ok === false) throw new Error((data && data.error) || "Máy chủ dịch báo lỗi");
    if (!data.text) throw new Error("Không nhận được bản dịch");
    out = data.text;
  }

  store(key, out, t);
  await chrome.storage.local.set({ trCache: c });
  return { ok: true, text: out, target: t, saved: await daLuuCau(text) };
}

// ==== Đồng bộ Google Drive qua Apps Script ====
async function driveRequest(body) {
  const { syncUrl, syncToken } = await chrome.storage.local.get(["syncUrl", "syncToken"]);
  if (!syncUrl) throw new Error("Chưa cấu hình URL đồng bộ");
  const r = await fetch(syncUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: syncToken || "" }, body))
  });
  const data = await r.json();
  if (!data || data.ok === false) throw new Error((data && data.error) || "Lỗi máy chủ đồng bộ");
  return data;
}

function mergeByTs(a, b) {
  const out = {};
  [a || {}, b || {}].forEach((src) => {
    for (const k in src) { const e = src[k]; if (!out[k] || (e.ts || 0) > (out[k].ts || 0)) out[k] = e; }
  });
  return out;
}
function countActive(nb) { let n = 0; for (const k in nb) if (!nb[k].del) n++; return n; }

let syncing = null;

function syncNow() {
  if (syncing) return syncing;
  syncing = doSync().finally(() => { syncing = null; });
  return syncing;
}

async function doSync() {
  const resp = await driveRequest({ action: "load" });
  const data = (resp && resp.data) || {};
  let remoteNb, remoteDecks, remoteHoc;
  if (data && typeof data === "object" && data.notebook !== undefined) {
    remoteNb = data.notebook || {};
    remoteDecks = data.decks || {};
    remoteHoc = data.hoc || null;
  } else {
    remoteNb = data || {}; remoteDecks = {}; remoteHoc = null;
  }

  const store = await chrome.storage.local.get(["notebook", "decks", "hoc"]);
  const mergedNb = mergeByTs(store.notebook || {}, remoteNb);
  const mergedDecks = mergeByTs(store.decks || {}, remoteDecks);
  // Tiến độ học KHÔNG trộn theo kiểu "bản mới hơn thắng" như sổ tay — xem
  // TienDo.tron() để biết vì sao (tóm tắt: 8 lượt trên điện thoại và 5 lượt
  // trên máy tính đều là lượt thật, không bên nào được xoá bên nào).
  const mergedHoc = self.TienDo.tron(store.hoc, remoteHoc);

  await driveRequest({
    action: "save",
    data: { notebook: mergedNb, decks: mergedDecks, hoc: mergedHoc }
  });

  // Đọc lại dữ liệu máy NGAY TRƯỚC KHI GHI: người dùng có thể vừa sửa
  // (phân loại sổ, xoá, chấm điểm...) trong lúc chờ mạng -> phải giữ các thay đổi đó.
  const fresh = await chrome.storage.local.get(["notebook", "decks", "hoc"]);
  const finalNb = mergeByTs(fresh.notebook || {}, mergedNb);
  const finalDecks = mergeByTs(fresh.decks || {}, mergedDecks);
  const finalHoc = self.TienDo.tron(fresh.hoc, mergedHoc);
  await chrome.storage.local.set({ notebook: finalNb, decks: finalDecks, hoc: finalHoc });

  if (JSON.stringify(finalNb) !== JSON.stringify(mergedNb) ||
      JSON.stringify(finalDecks) !== JSON.stringify(mergedDecks) ||
      JSON.stringify(finalHoc) !== JSON.stringify(mergedHoc)) {
    scheduleSync();
  }
  return countActive(finalNb);
}
