// NeutronDict — service worker (nền).
// Tra từ tiếng Anh: nghĩa tiếng Việt (Google Dịch) + phiên âm IPA, phát âm, định nghĩa &
// ví dụ tiếng Anh (Free Dictionary API). Không dùng dữ liệu Hán tự.

// ==== Cấu hình ====
const CACHE_MAX = 1000;              // số từ giữ trong bộ nhớ đệm
const CACHE_TTL = 30 * 86400000;     // 30 ngày
const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const DEFAULT_SETTINGS = { inline: true, requireCtrl: false, maxLen: 40 };

// ==== Menu chuột phải -> cửa sổ popup nhỏ ====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "tra-neutron-popup",
      title: 'Tra "%s" bằng NeutronDict',
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "tra-neutron-popup" && info.selectionText) {
    await openPopupWindow(info.selectionText, tab);
  }
});

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
function meansFromSenses(main, senses) {
  const out = [];
  if (main) out.push(main);          // nghĩa chính (thông dụng nhất) lên đầu
  for (const s of (senses || [])) {
    if (s.terms && s.terms.length) out.push((s.pos ? "(" + s.pos + ") " : "") + s.terms.join(", "));
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

async function savedKeys(entries, dict) {
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const out = {};
  (entries || []).forEach((e) => {
    const k = (e.dict || dict) + ":" + e.word;
    if (nb[k] && !nb[k].del) out[e.word] = true;
  });
  return out;
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
  if (old && !old.del) {                                      // lưu lại từ đã có -> GIỮ phân loại & tiến độ học
    if (old.deck) e.deck = old.deck;
    if (old.srs) e.srs = old.srs;
    if (old.kind && !e.kind) e.kind = old.kind;
    if (old.src && !e.src) e.src = old.src;
  }
  nb[key] = e;
  await chrome.storage.local.set({ notebook: nb });
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
      if (ah) return { ok: true, text: ah.v, target: ah.target || "en", cached: true };
      let detected = null;
      try { detected = await gtxTranslateDetect(text, "en"); } catch (e) {}
      if (detected && detected.text && detected.src && !detected.src.startsWith("en")) {
        store(ak, detected.text, "en");
        await chrome.storage.local.set({ trCache: c });
        return { ok: true, text: detected.text, target: "en" };
      }
      f = "en"; t = "vi";   // nguồn là tiếng Anh -> dịch sang tiếng Việt
    }
  }

  const key = f + ">" + t + ":" + text;
  const hit = fresh(key);
  if (hit) return { ok: true, text: hit.v, target: t, cached: true };

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
  return { ok: true, text: out, target: t };
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
  let remoteNb, remoteDecks;
  if (data && typeof data === "object" && data.notebook !== undefined) { remoteNb = data.notebook || {}; remoteDecks = data.decks || {}; }
  else { remoteNb = data || {}; remoteDecks = {}; }

  const store = await chrome.storage.local.get(["notebook", "decks"]);
  const mergedNb = mergeByTs(store.notebook || {}, remoteNb);
  const mergedDecks = mergeByTs(store.decks || {}, remoteDecks);

  await driveRequest({ action: "save", data: { notebook: mergedNb, decks: mergedDecks } });

  const fresh = await chrome.storage.local.get(["notebook", "decks"]);
  const finalNb = mergeByTs(fresh.notebook || {}, mergedNb);
  const finalDecks = mergeByTs(fresh.decks || {}, mergedDecks);
  await chrome.storage.local.set({ notebook: finalNb, decks: finalDecks });

  if (JSON.stringify(finalNb) !== JSON.stringify(mergedNb) ||
      JSON.stringify(finalDecks) !== JSON.stringify(mergedDecks)) {
    scheduleSync();
  }
  return countActive(finalNb);
}
