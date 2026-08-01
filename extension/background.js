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
async function gtxTranslate(text, f, t) {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t"
    + "&sl=" + encodeURIComponent(f || "en") + "&tl=" + encodeURIComponent(t || "vi")
    + "&q=" + encodeURIComponent(text);
  const r = await fetch(url);
  if (!r.ok) throw new Error("gtx HTTP " + r.status);
  const data = await r.json();
  const segs = (data && data[0]) || [];
  const out = segs.map((s) => (s && s[0]) || "").join("").trim();
  if (!out) throw new Error("gtx rỗng");
  return out;
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


// ==== Tra một mục ====
async function lookupEntry(rawWord, dict) {
  const word = (rawWord || "").trim();
  if (!word) return [];

  if (dict === "vien") {
    // Việt -> Anh: dịch sang tiếng Anh rồi làm giàu bằng IPA/định nghĩa
    let en = "";
    try { en = await gtxTranslate(word, "vi", "en"); } catch (e) { en = ""; }
    const dictData = en ? await fetchDictionary(en) : null;
    const entry = {
      word: en || word,
      reading: dictData ? ipaFrom(dictData) : "",   // phiên âm IPA chuẩn
      audio: dictData ? audioFrom(dictData) : "",
      means: [word],                 // đầu vào tiếng Việt chính là nghĩa
      pos: dictData ? posFrom(dictData) : []
    };
    return (entry.word ? [entry] : []);
  }

  // Anh -> Việt (mặc định)
  const [dictData, vi] = await Promise.all([
    fetchDictionary(word),
    gtxTranslate(word, "en", "vi").catch(() => "")
  ]);
  const pos = dictData ? posFrom(dictData) : [];
  const means = [];
  if (vi && vi.trim().toLowerCase() !== word.toLowerCase()) means.push(vi.trim());
  if (!means.length) { const fd = firstDefOf(pos); if (fd) means.push(fd); }

  const entry = {
    word: word,
    reading: dictData ? ipaFrom(dictData) : "",   // phiên âm IPA chuẩn
    audio: dictData ? audioFrom(dictData) : "",
    means: means,
    pos: pos
  };
  if (!entry.means.length && !entry.pos.length && !entry.reading) return [];
  return [entry];
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

  const entries = await lookupEntry(word, dict);
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
    const k = dict + ":" + e.word;
    if (nb[k] && !nb[k].del) out[e.word] = true;
  });
  return out;
}

// ==== Lưu từ vào sổ tay ====
async function saveWord(entry, dict) {
  if (!entry || !entry.word) throw new Error("Thiếu dữ liệu từ");
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const key = dict + ":" + entry.word;
  const old = nb[key];
  const e = {
    word: entry.word, reading: entry.reading || "", means: entry.means || [], dict, ts: Date.now()
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
  const f = from || "en", t = to || "vi";
  const key = f + ">" + t + ":" + text;

  const { trCache } = await chrome.storage.local.get("trCache");
  const c = trCache || {};
  const hit = c[key];
  const now = Date.now();
  if (hit && (now - (hit.ts || 0) < TR_TTL)) return { ok: true, text: hit.v, cached: true };

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

  c[key] = { v: out, ts: now };
  const keys = Object.keys(c);
  if (keys.length > TR_MAX) {
    keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
    for (let i = 0; i < keys.length - TR_MAX; i++) delete c[keys[i]];
  }
  await chrome.storage.local.set({ trCache: c });
  return { ok: true, text: out };
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
