/* NeutronDict — bản Android (Capacitor). Tra từ tiếng Anh: nghĩa tiếng Việt (Google Dịch) +
   IPA, phát âm, định nghĩa & ví dụ (Free Dictionary API). Dùng chung đồng bộ Drive với extension. */
"use strict";

// ================= Capacitor bridges (có fallback để chạy thử trên trình duyệt) =================
const Cap = window.Capacitor || null;
const Plugins = (Cap && Cap.Plugins) || {};
const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const Store = {
  async get(key) {
    if (Plugins.Preferences) {
      const r = await Plugins.Preferences.get({ key });
      return r.value ? JSON.parse(r.value) : null;
    }
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  },
  async set(key, obj) {
    const value = JSON.stringify(obj);
    if (Plugins.Preferences) return Plugins.Preferences.set({ key, value });
    localStorage.setItem(key, value);
  },
  async remove(key) {
    if (Plugins.Preferences) return Plugins.Preferences.remove({ key });
    localStorage.removeItem(key);
  }
};

function getNativeHttp() {
  return (window.CapacitorHttp) || (Plugins && Plugins.CapacitorHttp) || (Cap && Cap.CapacitorHttp) || null;
}

async function httpPostJson(url, bodyObj, contentType) {
  const ct = contentType || "application/json";
  const native = getNativeHttp();
  if (native && native.post) {
    const r = await native.post({ url, headers: { "Content-Type": ct }, data: JSON.stringify(bodyObj) });
    if (r && typeof r.status === "number" && (r.status < 200 || r.status >= 300)) throw new Error("HTTP " + r.status);
    const d = r && r.data;
    if (typeof d === "string") { try { return JSON.parse(d); } catch (e) { throw new Error("Máy chủ trả về dữ liệu không đọc được"); } }
    return d;
  }
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": ct }, body: JSON.stringify(bodyObj) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

async function httpGetJson(url, headers) {
  const h = headers || {};
  const native = getNativeHttp();
  // 1) Thử HTTP native (bỏ qua CORS). Nếu lỗi/không có -> rơi xuống fetch.
  if (native && native.get) {
    try {
      const r = await native.get({ url, headers: h });
      if (r && typeof r.status === "number" && (r.status < 200 || r.status >= 300)) throw new Error("HTTP " + r.status);
      const d = r && r.data;
      if (typeof d === "string") return JSON.parse(d);
      if (d != null) return d;
    } catch (e) { /* thử fetch bên dưới */ }
  }
  const r = await fetch(url, { headers: h });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

// Gọi thẳng Google Dịch (nhanh, không cần Apps Script).
// Google Dịch (gtx): dt=t (bản dịch) + dt=bd (từ điển nhiều nghĩa theo loại từ).
// Kèm User-Agent trình duyệt để máy chủ Google không chặn request từ app native.
const GTX_UA = "Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
async function gtxData(from, to, text) {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd"
    + "&sl=" + encodeURIComponent(from) + "&tl=" + encodeURIComponent(to)
    + "&q=" + encodeURIComponent(text);
  return await httpGetJson(url, { "User-Agent": GTX_UA });
}
function gtxMain(data) { return ((data && data[0]) || []).map((s) => (s && s[0]) || "").join("").trim(); }
function gtxSenses(data) {
  const out = [];
  for (const g of ((data && data[1]) || [])) out.push({ pos: g[0] || "", terms: (g[1] || []).slice(0, 8) });
  return out;
}
// Gộp các tầng nghĩa thành danh sách hiển thị: "(loại từ) nghĩa 1, nghĩa 2, …"
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
async function gtxTranslateDetect(text, to) {
  const data = await gtxData("auto", to || "vi", text);
  return { text: gtxMain(data), src: (data && data[2]) || "" };
}
async function gtxDict(text, from, to) {
  const data = await gtxData(from, to, text);
  return { main: gtxMain(data), senses: gtxSenses(data) };
}

// Có phải tiếng Việt (có dấu) không — nhận diện nhanh trước khi gọi mạng.
function looksVietnamese(s) {
  return /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(s || "");
}

// Giữ sẵn audio để bấm loa phát ngay.
const _audioCache = new Map();
function getAudioEl(url) {
  let a = _audioCache.get(url);
  if (!a) { a = new Audio(url); a.preload = "auto"; _audioCache.set(url, a); }
  return a;
}
function preloadAudio(url) { if (url) { try { getAudioEl(url); } catch (e) {} } }
async function speak(text, audio) {
  if (audio) {
    try { const a = getAudioEl(audio); a.currentTime = 0; await a.play(); return; } catch (e) { /* rơi xuống TTS */ }
  }
  try {
    if (Plugins.TextToSpeech) { await Plugins.TextToSpeech.speak({ text, lang: "en-US", rate: 0.9 }); return; }
  } catch (e) { /* thử fallback */ }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch (e) { /* máy không có giọng Anh */ }
}

// ================= Dữ liệu sổ tay (cùng cấu trúc extension) =================
async function getNB() { return (await Store.get("notebook")) || {}; }
async function setNB(nb) { await Store.set("notebook", nb); }
async function getDecks() { return (await Store.get("decks")) || {}; }
async function setDecks(d) { await Store.set("decks", d); }

function mergeByTs(a, b) {
  const out = {};
  [a || {}, b || {}].forEach((src) => {
    for (const k in src) { const e = src[k]; if (!out[k] || (e.ts || 0) > (out[k].ts || 0)) out[k] = e; }
  });
  return out;
}

// ================= SRS (giống hệt extension) =================
const SRS_STEPS = [1, 3, 7, 14, 30, 60, 120];
const DAY = 86400000;
function isDue(it, now) {
  if (it.del) return false;
  if (!it.srs || !it.srs.due) return true;
  return it.srs.due <= now;
}
async function gradeWord(key, remembered) {
  const nb = await getNB();
  const e = nb[key]; if (!e) return;
  const now = Date.now();
  const cur = (e.srs && typeof e.srs.lv === "number") ? e.srs.lv : -1;
  let lv, due;
  if (remembered) { lv = Math.min(cur + 1, SRS_STEPS.length - 1); due = now + SRS_STEPS[lv] * DAY; }
  else { lv = -1; due = now; }
  nb[key] = Object.assign({}, e, { srs: { lv, due }, ts: now });
  await setNB(nb);
}
function dueCountOn(list, dayOffset) {
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const t = end.getTime() + dayOffset * DAY;
  return list.filter((it) => !it.del && (!it.srs || !it.srs.due || it.srs.due <= t)).length;
}

// ================= Tra từ tiếng Anh (Free Dictionary + Google Dịch) =================
let lastLookupError = "";
async function fetchDictionary(word) {
  try {
    const data = await httpGetJson(DICT_API + encodeURIComponent(word.toLowerCase()));
    return Array.isArray(data) ? data : null;
  } catch (e) { return null; }
}
function ipaFrom(dd) {
  for (const d of dd) {
    if (d.phonetic && d.phonetic.trim()) return d.phonetic.trim();
    for (const p of (d.phonetics || [])) if (p.text && p.text.trim()) return p.text.trim();
  }
  return "";
}
function audioFrom(dd) {
  for (const d of dd) for (const p of (d.phonetics || [])) if (p.audio && p.audio.trim()) return p.audio.trim().replace(/^\/\//, "https://");
  return "";
}
function posFrom(dd) {
  const out = [];
  for (const d of dd) for (const m of (d.meanings || [])) {
    const defs = (m.definitions || []).slice(0, 4).map((x) => ({ def: x.definition || "", ex: x.example || "" })).filter((x) => x.def);
    const syn = (m.synonyms || []).slice(0, 6);
    if (defs.length || syn.length) out.push({ p: m.partOfSpeech || "", defs, syn });
  }
  return out.slice(0, 6);
}
function firstDefOf(pos) { for (const g of pos) for (const d of g.defs) if (d.def) return d.def; return ""; }

async function lookup(word, dict) {
  const w = (word || "").trim();
  lastLookupError = "";
  if (!w) return [];
  // Tự động nhận diện
  if (dict === "auto") {
    if (looksVietnamese(w)) dict = "vien";
    else {
      const en = await lookup(w, "envi");
      if (en.length) return en;
      let src = "";
      try { const d = await gtxTranslateDetect(w, "en"); src = d.src; } catch (e) {}
      dict = (src && !src.startsWith("en")) ? "vien" : "envi";
      if (dict === "envi") return en;   // vẫn không ra -> trả rỗng
    }
  }
  try {
    if (dict === "vien") {
      // Việt -> Anh: lấy từ tiếng Anh (nhiều lựa chọn) rồi làm giàu IPA/định nghĩa.
      let gv = null;
      try { gv = await gtxDict(w, "vi", "en"); } catch (e) { gv = null; }
      const en = gv ? gv.main : "";
      if (!en) { lastLookupError = "Chưa dịch được sang tiếng Anh (kiểm tra mạng)."; return []; }
      const dd = await fetchDictionary(en);
      const synonyms = (gv.senses || []).map((s) => ({ p: s.pos, defs: [], syn: s.terms }));   // các từ Anh khác
      const entry = {
        word: en, reading: dd ? ipaFrom(dd) : "", audio: dd ? audioFrom(dd) : "",
        means: [w], pos: (dd ? posFrom(dd) : []).concat(synonyms.filter((s) => s.syn.length)).slice(0, 8), dict: "vien"
      };
      return [entry];
    }
    // Anh -> Việt: nghĩa tiếng Việt NHIỀU TẦNG (dt=bd) + IPA/định nghĩa Anh ở tab Chi tiết.
    const [dd, gv] = await Promise.all([
      fetchDictionary(w),
      gtxDict(w, "en", "vi").catch(() => null)
    ]);
    const pos = dd ? posFrom(dd) : [];
    const means = gv ? meansFromSenses(gv.main, gv.senses) : [];
    if (!means.length && !dd) { lastLookupError = "Không tìm thấy từ này"; return []; }
    if (!means.length) {
      const fd = firstDefOf(pos);
      if (fd) means.push("(EN) " + fd);   // dự phòng có nhãn khi chưa lấy được nghĩa Việt
      lastLookupError = "Chưa lấy được nghĩa tiếng Việt (kiểm tra mạng).";
    }
    const entry = { word: w, reading: dd ? ipaFrom(dd) : "", audio: dd ? audioFrom(dd) : "", means, pos, dict: "envi" };
    return [entry];
  } catch (e) { lastLookupError = (e && e.message) || String(e); return []; }
}

// ================= Đồng bộ Drive (Apps Script — cùng payload với extension) =================
let syncing = null;
function syncNow() {
  if (syncing) return syncing;
  syncing = doSync().finally(() => { syncing = null; });
  return syncing;
}
async function doSync() {
  const cfg = (await Store.get("syncCfg")) || {};
  if (!cfg.url) throw new Error("Chưa cấu hình URL đồng bộ");
  const load = await httpPostJson(cfg.url, { token: cfg.token || "", action: "load" }, "text/plain;charset=utf-8");
  if (!load || load.ok === false) throw new Error((load && load.error) || "Lỗi máy chủ");
  const data = load.data || {};
  let remoteNb, remoteDecks;
  if (data && typeof data === "object" && data.notebook !== undefined) { remoteNb = data.notebook || {}; remoteDecks = data.decks || {}; }
  else { remoteNb = data || {}; remoteDecks = {}; }
  const mergedNb = mergeByTs(await getNB(), remoteNb);
  const mergedDecks = mergeByTs(await getDecks(), remoteDecks);
  const save = await httpPostJson(cfg.url, { token: cfg.token || "", action: "save", data: { notebook: mergedNb, decks: mergedDecks } }, "text/plain;charset=utf-8");
  if (!save || save.ok === false) throw new Error((save && save.error) || "Lỗi khi lưu");
  const finalNb = mergeByTs(await getNB(), mergedNb);
  const finalDecks = mergeByTs(await getDecks(), mergedDecks);
  await setNB(finalNb); await setDecks(finalDecks);
  if (JSON.stringify(finalNb) !== JSON.stringify(mergedNb)) syncSoon();
  let n = 0; for (const k in finalNb) if (!finalNb[k].del) n++;
  return n;
}
let syncTimer = null;
function syncSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(() => { syncNow().then(refreshNotifications).catch(() => {}); }, 2500); }

// ================= Thông báo nhắc học =================
async function refreshNotifications() {
  const LN = Plugins.LocalNotifications;
  if (!LN) return;
  const cfg = (await Store.get("notifCfg")) || {};
  if (!cfg.on) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") { const r = await LN.requestPermissions(); if (r.display !== "granted") return; }
    await LN.cancel({ notifications: [1,2,3,4,5,6,7].map((id) => ({ id })) });
    const nb = await getNB();
    const list = Object.values(nb);
    const [hh, mm] = (cfg.time || "20:00").split(":").map(Number);
    const notis = [];
    for (let d = 0; d < 7; d++) {
      const at = new Date(); at.setDate(at.getDate() + d); at.setHours(hh, mm, 0, 0);
      if (at.getTime() <= Date.now()) continue;
      const n = dueCountOn(list, d);
      if (n <= 0) continue;
      notis.push({
        id: d + 1,
        title: "Đến giờ ôn từ vựng 🎓",
        body: "Hôm nay có " + n + " từ đến hạn trong sóng học tập. Vào ôn " + (n <= 5 ? "vài phút là xong!" : "nhé!"),
        schedule: { at }
      });
    }
    if (notis.length) await LN.schedule({ notifications: notis });
  } catch (e) { /* bỏ qua */ }
}

// ================= UI chung =================
const $ = (id) => document.getElementById(id);
function show(view) {
  ["Lookup", "Notebook", "Study"].forEach((v) => {
    $("view" + v).classList.toggle("show", v === view);
    $("nav" + v).classList.toggle("active", v === view);
  });
  if (view === "Notebook") { drawNotebook(); pullAndRefresh(); }
  if (view === "Study") { updateDueButton(); pullAndRefresh(); }
}
$("navLookup").addEventListener("click", () => show("Lookup"));
$("navNotebook").addEventListener("click", () => show("Notebook"));
$("navStudy").addEventListener("click", () => show("Study"));

// ================= View: Tra từ =================
let lastEntry = null;
let currentSrc = null;
function switchSub(name) {
  ["word","detail","trans"].forEach((n) => {
    const btn = { word: "tabWord", detail: "tabDetail", trans: "tabTrans" }[n];
    const pane = { word: "result", detail: "detail", trans: "trans" }[n];
    $(btn).classList.toggle("active", n === name);
    $(pane).style.display = n === name ? "" : "none";
  });
  if (name === "detail") renderDetail();
  if (name === "trans") showTranslate(($("q").value || "").trim());
}
$("tabWord").addEventListener("click", () => switchSub("word"));
$("tabDetail").addEventListener("click", () => switchSub("detail"));
$("tabTrans").addEventListener("click", () => switchSub("trans"));

async function runLookup(word, src) {
  currentSrc = (src && src.url) ? src : null;
  const w = (word || "").trim();
  if (!w) return;
  $("q").value = w;
  if (w.length > 40 || /[.!?;\n]/.test(w)) { switchSub("trans"); return; }
  switchSub("word");
  $("result").className = "state";
  $("result").textContent = "Đang tra “" + w + "”…";
  const entries = await lookup(w, $("dir").value);
  lastEntry = entries[0] || null;
  await renderWord(entries);
}
$("go").addEventListener("click", () => runLookup($("q").value));
$("q").addEventListener("keydown", (e) => { if (e.key === "Enter") runLookup($("q").value); });
$("dir").addEventListener("change", () => runLookup($("q").value));
$("paste").addEventListener("click", async () => {
  try { const t = await navigator.clipboard.readText(); if (t && t.trim()) runLookup(t.trim()); } catch (e) { alert("Không đọc được bộ nhớ tạm. Hãy dán tay vào ô tra."); }
});

async function renderWord(entries) {
  const box = $("result");
  const nb = await getNB();
  const srcSnap = (currentSrc && currentSrc.url) ? currentSrc : null;
  box.className = ""; box.innerHTML = "";
  if (!entries.length) {
    box.className = "state"; box.innerHTML = "";
    const p1 = document.createElement("div"); p1.textContent = "Không tìm thấy nghĩa."; box.appendChild(p1);
    if (lastLookupError) { const p2 = document.createElement("div"); p2.className = "hint"; p2.style.marginTop = "6px"; p2.textContent = "Chi tiết: " + lastLookupError; box.appendChild(p2); }
    return;
  }
  for (const en of entries) {
    preloadAudio(en.audio);
    const div = document.createElement("div"); div.className = "entry";
    const head = document.createElement("div"); head.className = "ehead";
    const left = document.createElement("div");
    const w = document.createElement("span"); w.className = "word"; w.textContent = en.word; left.appendChild(w);
    const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊";
    spk.addEventListener("click", () => speak(en.word, en.audio)); left.appendChild(spk);
    if (en.reading) { const r = document.createElement("span"); r.className = "read"; r.textContent = en.reading; left.appendChild(r); }
    head.appendChild(left);
    const btn = document.createElement("button"); btn.className = "save";
    const dd = en.dict || (($("dir").value === "auto") ? "envi" : $("dir").value);
    const key = dd + ":" + en.word;
    if (nb[key] && !nb[key].del) { btn.textContent = "✓ Đã lưu"; btn.classList.add("saved"); }
    else {
      btn.textContent = "＋ Lưu";
      btn.addEventListener("click", async () => {
        const nb2 = await getNB();
        const old2 = nb2[key];
        const ne2 = { word: en.word, reading: en.reading || "", means: en.means || [], dict: dd, ts: Date.now() };
        if (en.pos && en.pos.length) ne2.pos = en.pos;
        if (en.audio) ne2.audio = en.audio;
        if (srcSnap) ne2.src = srcSnap;
        if (old2 && !old2.del) { if (old2.deck) ne2.deck = old2.deck; if (old2.srs) ne2.srs = old2.srs; if (old2.kind) ne2.kind = old2.kind; if (old2.src && !ne2.src) ne2.src = old2.src; }
        nb2[key] = ne2;
        await setNB(nb2);
        btn.textContent = "✓ Đã lưu"; btn.classList.add("saved");
        syncSoon(); refreshNotifications();
      });
    }
    head.appendChild(btn);
    div.appendChild(head);
    if (en.means.length) {
      const ul = document.createElement("ul"); ul.className = "mean";
      en.means.slice(0, 6).forEach((m) => { const li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
      div.appendChild(ul);
    }
    box.appendChild(div);
  }
}

// ---- Tab Chi tiết (định nghĩa, ví dụ, đồng nghĩa + chú giải IPA) ----
function renderDetail() {
  const box = $("detail");
  box.innerHTML = "";
  const en = lastEntry;
  if (!en || (!(en.pos && en.pos.length) && !en.reading)) { box.className = "state"; box.textContent = "Không có chi tiết cho từ này."; return; }
  box.className = "detail";
  if (en.reading) {
    const ipa = document.createElement("div"); ipa.className = "ipa";
    ipa.innerHTML = "IPA: <b></b>";
    ipa.querySelector("b").textContent = en.reading;
    const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊";
    spk.addEventListener("click", () => speak(en.word, en.audio)); ipa.appendChild(spk);
    box.appendChild(ipa);
    const legend = (window.IPA_GUIDE && window.IPA_GUIDE.legendFor(en.reading)) || [];
    if (legend.length) {
      const lg = document.createElement("div"); lg.className = "legend";
      const lh = document.createElement("div"); lh.className = "lh"; lh.textContent = "Cách đọc các ký hiệu:"; lg.appendChild(lh);
      legend.forEach((it) => {
        const row = document.createElement("div"); row.className = "legrow";
        const s = document.createElement("span"); s.className = "ls"; s.textContent = it.s; row.appendChild(s);
        const v = document.createElement("span"); v.textContent = it.vi; row.appendChild(v);
        const e = document.createElement("span"); e.className = "le"; e.textContent = "(" + it.ex + ")"; row.appendChild(e);
        lg.appendChild(row);
      });
      box.appendChild(lg);
    }
  }
  (en.pos || []).forEach((g) => {
    const grp = document.createElement("div"); grp.className = "pgroup";
    if (g.p) { const p = document.createElement("span"); p.className = "pos"; p.textContent = g.p; grp.appendChild(p); }
    if (g.defs && g.defs.length) {
      const ol = document.createElement("ol");
      g.defs.forEach((d) => {
        const li = document.createElement("li");
        li.appendChild(document.createTextNode(d.def));
        if (d.ex) { const ex = document.createElement("div"); ex.className = "ex"; ex.textContent = "“" + d.ex + "”"; li.appendChild(ex); }
        ol.appendChild(li);
      });
      grp.appendChild(ol);
    }
    if (g.syn && g.syn.length) { const s = document.createElement("div"); s.className = "syn"; s.textContent = "≈ " + g.syn.join(", "); grp.appendChild(s); }
    box.appendChild(grp);
  });
}

// ================= Dịch câu =================
// Trả về { text, target }. dir: "auto" | "envi" | "vien".
async function translateText(text, dir) {
  const t = (text || "").trim();
  if (!t) throw new Error("Chưa có nội dung");
  const cache = (await Store.get("trCache")) || {};
  const now = Date.now();
  const fresh = (k) => { const h = cache[k]; return (h && now - (h.ts || 0) < 30 * DAY) ? h : null; };
  const put = (k, v, target) => {
    cache[k] = { v, target, ts: now };
    const ks = Object.keys(cache);
    if (ks.length > 300) { ks.sort((a, b) => cache[a].ts - cache[b].ts); for (let i = 0; i < ks.length - 300; i++) delete cache[ks[i]]; }
  };
  let from, to;
  if (dir === "auto") {
    if (looksVietnamese(t)) { from = "vi"; to = "en"; }
    else {
      const ak = "auto>en:" + t;
      const ah = fresh(ak);
      if (ah) return { text: ah.v, target: ah.target || "en" };
      let det = null;
      try { det = await gtxTranslateDetect(t, "en"); } catch (e) {}
      if (det && det.text && det.src && !det.src.startsWith("en")) { put(ak, det.text, "en"); await Store.set("trCache", cache); return { text: det.text, target: "en" }; }
      from = "en"; to = "vi";
    }
  } else if (dir === "vien") { from = "vi"; to = "en"; }
  else { from = "en"; to = "vi"; }

  const key = from + ">" + to + ":" + t;
  const hit = fresh(key);
  if (hit) return { text: hit.v, target: to };
  let out = "";
  try { out = await gtxTranslate(t, from, to); } catch (e) { out = ""; }
  if (!out) {
    const cfg = (await Store.get("syncCfg")) || {};
    if (!cfg.url) throw new Error("Không dịch được lúc này (và chưa cấu hình đồng bộ để dùng máy chủ dự phòng).");
    const r = await httpPostJson(cfg.url, { token: cfg.token || "", action: "translate", text: t, from, to }, "text/plain;charset=utf-8");
    if (!r || r.ok === false || !r.text) throw new Error((r && r.error) || "Không dịch được");
    out = r.text;
  }
  put(key, out, to); await Store.set("trCache", cache);
  return { text: out, target: to };
}

async function showTranslate(text) {
  const box = $("trans");
  const srcSnap = (currentSrc && currentSrc.url) ? { url: currentSrc.url, title: currentSrc.title, sel: text } : null;
  box.className = "state"; box.textContent = "Đang dịch…";
  try {
    const res = await translateText(text, $("dir").value);
    const out = res.text;
    const engText = res.target === "en" ? out : text;   // phần tiếng Anh để đọc
    box.className = "trbox"; box.innerHTML = "";
    const hd = document.createElement("div"); hd.className = "hd";
    const tr = document.createElement("div"); tr.className = "tr"; tr.textContent = out;
    hd.appendChild(tr);
    const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊"; spk.title = "Nghe câu tiếng Anh";
    spk.addEventListener("click", () => speak(engText));
    hd.appendChild(spk);
    const sv = document.createElement("button"); sv.className = "save"; sv.textContent = "＋ Lưu";
    const key = "envi:" + text;
    const nb0 = await getNB();
    if (nb0[key] && !nb0[key].del) { sv.textContent = "✓ Đã lưu"; sv.classList.add("saved"); }
    else sv.addEventListener("click", async () => {
      const nb = await getNB();
      const oldS = nb[key];
      const neS = { word: text, reading: "", means: [out], dict: "envi", kind: "sent", ts: Date.now() };
      if (srcSnap) neS.src = srcSnap;
      if (oldS && !oldS.del) { if (oldS.deck) neS.deck = oldS.deck; if (oldS.srs) neS.srs = oldS.srs; if (oldS.src && !neS.src) neS.src = oldS.src; }
      nb[key] = neS;
      await setNB(nb);
      sv.textContent = "✓ Đã lưu"; sv.classList.add("saved");
      syncSoon(); refreshNotifications();
    });
    hd.appendChild(sv);
    box.appendChild(hd);
    const src = document.createElement("div"); src.className = "src"; src.textContent = text;
    box.appendChild(src);
  } catch (e) {
    box.className = "state"; box.textContent = (e && e.message) || "Không dịch được.";
  }
}

// ================= View: Sổ tay =================
const ALL = "__all__", NONE = "__none__";
let curDeck = ALL;
function deckName(decks, id) { const d = decks[id]; return d && !d.del ? d.name : null; }

function openSourceExt(it) {
  if (!it.src || !it.src.url) return;
  const base = it.src.url;
  const enc = encodeURIComponent((it.src.sel || it.word || "").slice(0, 60));
  const url = base.indexOf("#") >= 0 ? base + ":~:text=" + enc : base + "#:~:text=" + enc;
  try { window.open(url, "_system"); }
  catch (e) { try { window.open(url, "_blank"); } catch (e2) { location.href = url; } }
}

async function addLink(it) {
  const cur = (it.src && it.src.url) || "";
  let url = (prompt('Dán đường link trang nguồn cho “' + it.word + '”\n(để trống rồi OK = xoá link):', cur) || "").trim();
  if (url === cur) return;
  const nb = await getNB(); const e = nb[it.key]; if (!e || e.del) return;
  const ne = Object.assign({}, e, { ts: Date.now() });
  if (!url) { delete ne.src; }
  else {
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    let title = "";
    try { title = new URL(url).hostname.replace(/^www\./, ""); } catch (e2) {}
    ne.src = { url: url, title: title, sel: (e.src && e.src.sel) || it.word };
  }
  nb[it.key] = ne;
  await setNB(nb);
  drawNotebook();
  syncSoon();
}

function toast(msg) {
  let t = document.getElementById("njToast");
  if (!t) { t = document.createElement("div"); t.id = "njToast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = "show";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.className = ""; }, 4000);
}
function dirLabel(d) { return d === "vien" ? "Việt→Anh" : "Anh→Việt"; }

async function drawNotebook() {
  const nb = await getNB(), decks = await getDecks();
  const items = Object.entries(nb).map(([key, v]) => ({ key, ...v })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const activeItems = items.filter((it) => !it.del);
  if (curDeck !== ALL && curDeck !== NONE && !deckName(decks, curDeck)) curDeck = ALL;

  const bar = $("deckBar"); bar.innerHTML = "";
  const activeDecks = Object.values(decks).filter((d) => !d.del).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const countIn = (id) => id === ALL ? activeItems.length : id === NONE ? activeItems.filter((i) => !i.deck).length : activeItems.filter((i) => i.deck === id).length;
  const mk = (id, label) => {
    const b = document.createElement("button"); b.className = "chip" + (curDeck === id ? " active" : "");
    b.textContent = label + " (" + countIn(id) + ")";
    b.addEventListener("click", () => { curDeck = id; drawNotebook(); });
    bar.appendChild(b);
  };
  mk(ALL, "Tất cả"); mk(NONE, "Chưa phân loại");
  activeDecks.forEach((d) => mk(d.id, d.name));
  const add = document.createElement("button"); add.className = "chip add"; add.textContent = "＋ Sổ mới";
  add.addEventListener("click", async () => {
    const name = (prompt("Tên sổ con mới:") || "").trim(); if (!name) return;
    const d = await getDecks();
    const id = "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    d[id] = { id, name, ts: Date.now() };
    await setDecks(d); curDeck = id; drawNotebook(); syncSoon();
  });
  bar.appendChild(add);
  $("deckActions").style.display = (curDeck !== ALL && curDeck !== NONE) ? "" : "none";

  const kw = $("filter").value.trim().toLowerCase();
  let rows = activeItems;
  if (curDeck === NONE) rows = rows.filter((i) => !i.deck);
  else if (curDeck !== ALL) rows = rows.filter((i) => i.deck === curDeck);
  if (kw) rows = rows.filter((it) => (it.word + " " + (it.reading || "") + " " + (it.means || []).join(" ")).toLowerCase().includes(kw));
  $("nbCount").textContent = "Hiện: " + rows.length + " từ";

  const list = $("nbList"); list.innerHTML = "";
  if (!rows.length) {
    const d = document.createElement("div"); d.className = "state";
    d.textContent = activeItems.length ? "Không có từ trong mục này." : "Chưa có từ nào. Sang tab Tra từ và bấm ＋ Lưu.";
    list.appendChild(d); return;
  }
  const now = Date.now();
  for (const it of rows) {
    const row = document.createElement("div"); row.className = "nrow" + (it.kind === "sent" ? " sent" : "");
    const main = document.createElement("div"); main.className = "main";
    const head = document.createElement("div");
    const w = document.createElement("span"); w.className = "w"; w.textContent = it.word; head.appendChild(w);
    const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊";
    spk.addEventListener("click", () => speak(it.word, it.audio)); head.appendChild(spk);
    if (it.reading) { const r = document.createElement("span"); r.className = "r"; r.textContent = it.reading; head.appendChild(r); }
    if (isDue(it, now)) { const du = document.createElement("span"); du.className = "due"; du.textContent = "đến hạn"; head.appendChild(du); }
    main.appendChild(head);
    if (it.means && it.means.length) { const m = document.createElement("div"); m.className = "m"; m.textContent = it.means.slice(0, 4).join("; "); main.appendChild(m); }
    if (it.src && it.src.url) {
      const sEl = document.createElement("div"); sEl.className = "srcline";
      let hostn = it.src.url; try { hostn = new URL(it.src.url).hostname.replace(/^www\./, ""); } catch (e) {}
      sEl.textContent = "🔗 " + hostn; sEl.title = it.src.title || it.src.url;
      main.appendChild(sEl);
    }
    row.appendChild(main);

    const ctl = document.createElement("div"); ctl.className = "rowctl";
    const decksNow = await getDecks();
    const activeDks = Object.values(decksNow).filter((d) => !d.del).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const sel = document.createElement("select"); sel.className = "movesel";
    const o0 = document.createElement("option"); o0.value = NONE; o0.textContent = "Chưa phân loại"; sel.appendChild(o0);
    activeDks.forEach((d) => { const o = document.createElement("option"); o.value = d.id; o.textContent = d.name; sel.appendChild(o); });
    sel.value = it.deck && deckName(decksNow, it.deck) ? it.deck : NONE;
    sel.addEventListener("change", async () => {
      const nb2 = await getNB(); const e = nb2[it.key]; if (!e) return;
      const ne = Object.assign({}, e, { ts: Date.now() });
      if (sel.value === NONE) delete ne.deck; else ne.deck = sel.value;
      nb2[it.key] = ne; await setNB(nb2); drawNotebook(); syncSoon();
    });
    ctl.appendChild(sel);
    if (it.src && it.src.url) {
      const open = document.createElement("button"); open.className = "mini"; open.style.color = "var(--brand)"; open.textContent = "🔗 Nguồn";
      open.addEventListener("click", () => openSourceExt(it));
      ctl.appendChild(open);
      const edit = document.createElement("button"); edit.className = "mini"; edit.textContent = "✎"; edit.title = "Sửa hoặc xoá link nguồn";
      edit.addEventListener("click", () => addLink(it));
      ctl.appendChild(edit);
    } else {
      const add2 = document.createElement("button"); add2.className = "mini"; add2.style.color = "var(--brand)"; add2.textContent = "🔗 Thêm link";
      add2.addEventListener("click", () => addLink(it));
      ctl.appendChild(add2);
    }
    const del = document.createElement("button"); del.className = "mini"; del.style.color = "var(--red)"; del.textContent = "Xoá";
    del.addEventListener("click", async () => {
      if (!confirm("Xoá “" + it.word + "”?")) return;
      const nb2 = await getNB();
      nb2[it.key] = { word: it.word, dict: it.dict, del: true, ts: Date.now() };
      await setNB(nb2); drawNotebook(); syncSoon(); refreshNotifications();
    });
    ctl.appendChild(del);
    row.appendChild(ctl);
    list.appendChild(row);
  }
}
$("filter").addEventListener("input", drawNotebook);
$("renameDeck").addEventListener("click", async () => {
  const decks = await getDecks(); const cur = deckName(decks, curDeck) || "";
  const name = (prompt("Đổi tên sổ:", cur) || "").trim(); if (!name || name === cur) return;
  decks[curDeck] = Object.assign({}, decks[curDeck], { name, ts: Date.now() });
  await setDecks(decks); drawNotebook(); syncSoon();
});
$("deleteDeck").addEventListener("click", async () => {
  const decks = await getDecks(); const nm = deckName(decks, curDeck);
  if (!confirm('Xoá sổ "' + nm + '"? Từ trong sổ sẽ về "Chưa phân loại".')) return;
  const nb = await getNB(); const now = Date.now();
  for (const k in nb) if (nb[k].deck === curDeck) { const e = Object.assign({}, nb[k], { ts: now }); delete e.deck; nb[k] = e; }
  decks[curDeck] = { id: curDeck, name: nm, del: true, ts: now };
  await setNB(nb); await setDecks(decks); curDeck = ALL; drawNotebook(); syncSoon();
});

// sync UI
$("saveCfg").addEventListener("click", async () => {
  await Store.set("syncCfg", { url: $("syncUrl").value.trim(), token: $("syncToken").value.trim() });
  $("syncStatus").textContent = "Đã lưu cấu hình.";
});
$("syncNow").addEventListener("click", async () => {
  $("syncStatus").textContent = "Đang đồng bộ…";
  try { const n = await syncNow(); $("syncStatus").textContent = "Đã đồng bộ • " + n + " từ • " + new Date().toLocaleTimeString("vi-VN"); drawNotebook(); refreshNotifications(); }
  catch (e) { $("syncStatus").textContent = "Lỗi: " + (e && e.message || e); }
});

// notif UI
$("notifOn").addEventListener("click", async () => {
  await Store.set("notifCfg", { on: true, time: $("notifTime").value || "20:00" });
  await refreshNotifications();
  $("notifStatus").textContent = "Đã bật nhắc lúc " + ($("notifTime").value || "20:00") + " hằng ngày (7 ngày tới đã lên lịch).";
});
$("notifOff").addEventListener("click", async () => {
  await Store.set("notifCfg", { on: false });
  if (Plugins.LocalNotifications) try { await Plugins.LocalNotifications.cancel({ notifications: [1,2,3,4,5,6,7].map((id) => ({ id })) }); } catch (e) {}
  $("notifStatus").textContent = "Đã tắt nhắc nhở.";
});

// Hướng dẫn đọc IPA (điền một lần)
function fillIpaGuide() {
  const box = $("ipaGuideBody"); if (!box || box.dataset.filled) return;
  const G = window.IPA_GUIDE; if (!G) return;
  const sec = (title, list) => {
    const h = document.createElement("div"); h.className = "ipasec"; h.textContent = title; box.appendChild(h);
    list.forEach((it) => {
      const row = document.createElement("div"); row.className = "ipacell";
      const s = document.createElement("span"); s.className = "s"; s.textContent = it.s; row.appendChild(s);
      const info = document.createElement("div");
      const top = document.createElement("div"); top.textContent = it.vi; info.appendChild(top);
      const ex = document.createElement("div"); ex.className = "ex"; ex.textContent = it.ex + " " + it.ipa; info.appendChild(ex);
      row.appendChild(info);
      const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊";
      spk.addEventListener("click", () => speak(it.ex)); row.appendChild(spk);
      box.appendChild(row);
    });
  };
  sec("Nguyên âm", G.VOWELS);
  sec("Nguyên âm đôi", G.DIPH);
  sec("Phụ âm", G.CONS);
  sec("Dấu nhấn & độ dài", G.MARKS);
  box.dataset.filled = "1";
}
const ipaBoxEl = $("ipaBox");
if (ipaBoxEl) ipaBoxEl.addEventListener("toggle", () => { if (ipaBoxEl.open) fillIpaGuide(); });

// ================= View: Học =================
let session = { queue: [], done: 0, again: 0 };
async function currentDue() {
  const nb = await getNB();
  const now = Date.now();
  return Object.entries(nb).map(([key, v]) => ({ key, ...v })).filter((it) => isDue(it, now));
}
async function updateDueButton() {
  const due = await currentDue();
  $("dueCount").textContent = due.length;
}
$("stStart").addEventListener("click", async () => {
  const due = await currentDue();
  if (!due.length) { alert("Không có từ nào đến hạn. Quay lại sau nhé!"); return; }
  session = { queue: due.sort(() => Math.random() - 0.5), done: 0, again: 0, deleted: 0 };
  lastDeleted = null; $("stUndo").style.display = "none"; $("stDelRow").style.display = "";
  $("stEmpty").style.display = "none"; $("stBody").style.display = "";
  showCard();
});
function showCard() {
  const it = session.queue[0];
  if (!it) { finishStudy(); return; }
  $("stProg").textContent = "Còn " + session.queue.length + " từ • đã xong " + session.done;
  $("stWord").textContent = it.word;
  const src = $("stSrc");
  if (src) {
    if (it.src && it.src.url) { src.style.display = ""; src.onclick = () => openSourceExt(it); }
    else { src.style.display = "none"; src.onclick = null; }
  }
  $("stRead").textContent = "";
  $("stMean").innerHTML = "";
  $("stReveal").style.display = "";
  $("stGrade").style.display = "none";
}

let lastDeleted = null;
async function deleteCurrentCard() {
  const it = session.queue[0];
  if (!it) return;
  const nb = await getNB();
  const original = nb[it.key];
  lastDeleted = original ? { key: it.key, entry: Object.assign({}, original) } : null;
  nb[it.key] = { word: it.word, dict: it.dict, del: true, ts: Date.now() };
  await setNB(nb);
  session.queue = session.queue.filter((x) => x.key !== it.key);
  session.deleted = (session.deleted || 0) + 1;
  $("stUndoWord").textContent = it.word;
  $("stUndo").style.display = "";
  syncSoon(); refreshNotifications();
  showCard();
}
async function undoDelete() {
  if (!lastDeleted) return;
  const nb = await getNB();
  nb[lastDeleted.key] = Object.assign({}, lastDeleted.entry, { ts: Date.now() });
  await setNB(nb);
  lastDeleted = null;
  $("stUndo").style.display = "none";
  updateDueButton(); syncSoon(); refreshNotifications();
}
$("stDel").addEventListener("click", deleteCurrentCard);
$("stUndoBtn").addEventListener("click", undoDelete);

$("stReveal").addEventListener("click", () => {
  const it = session.queue[0]; if (!it) return;
  $("stRead").textContent = it.reading || "";
  if (it.means && it.means.length) {
    const ul = document.createElement("ul");
    it.means.slice(0, 5).forEach((m) => { const li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
    $("stMean").innerHTML = ""; $("stMean").appendChild(ul);
  }
  $("stReveal").style.display = "none"; $("stGrade").style.display = "";
});
$("stSpk").addEventListener("click", () => { const it = session.queue[0]; if (it) speak(it.word, it.audio); });
async function grade(remembered) {
  const it = session.queue.shift(); if (!it) return;
  await gradeWord(it.key, remembered);
  if (remembered) session.done++; else { session.again++; session.queue.push(Object.assign({}, it)); }
  syncSoon();
  showCard();
}
$("gKnow").addEventListener("click", () => grade(true));
$("gForgot").addEventListener("click", () => grade(false));
async function finishStudy() {
  $("stBody").style.display = "none";
  $("stEmpty").style.display = "";
  $("stEmpty").textContent = "🎉 Xong! Đã thuộc " + session.done + " từ"
    + (session.again ? " • học lại " + session.again + " lượt" : "")
    + (session.deleted ? " • đã xoá " + session.deleted + " từ" : "") + ".";
  $("stDelRow").style.display = "none";
  $("stProg").textContent = "";
  updateDueButton(); syncSoon(); refreshNotifications();
}

// Kéo dữ liệu mới từ Drive rồi làm tươi màn hình đang xem
let pulling = false;
async function pullAndRefresh() {
  if (pulling) return;
  const cfg = (await Store.get("syncCfg")) || {};
  if (!cfg.url) return;
  pulling = true;
  try {
    await syncNow();
    const cur = document.querySelector(".view.show");
    if (cur && cur.id === "viewNotebook") drawNotebook();
    if (cur && cur.id === "viewStudy") updateDueButton();
    refreshNotifications();
  } catch (e) { /* offline -> bỏ qua */ } finally { pulling = false; }
}

// ================= Nhận chữ từ menu bôi đen của Android =================
async function checkProcessText() {
  try {
    const data = await Store.get("processText");
    if (!data || !data.word) return;
    await Store.remove("processText");
    if (Date.now() - (data.ts || 0) > 30000) return;
    show("Lookup");
    runLookup(data.word);
  } catch (e) { /* bỏ qua */ }
}
window.addEventListener("neutrondict-process-text", checkProcessText);

// ================= Nhận nội dung Chia sẻ (ACTION_SEND) — kèm link nếu app nguồn gửi =================
function textFragmentOf(url) {
  const i = (url || "").indexOf("#:~:text=");
  if (i < 0) return "";
  let frag = url.slice(i + 9).split("&")[0];
  const parts = frag.split(",");
  const core = parts.filter((p) => p && !p.endsWith("-") && !p.startsWith("-"));
  const pick = core[0] || parts[0] || "";
  try { return decodeURIComponent(pick).trim(); } catch (e) { return pick; }
}
function parseShare(rawText, subject) {
  const text = (rawText || "").trim();
  const title = (subject || "").trim();
  const strip = (s) => (s || "")
    .replace(/[「」『』（）()【】〈〉《》“”‘’"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.,;:・\-–—]+|[.,;:・\-–—]+$/g, "")
    .trim();
  let url = "", sel = "";
  const m = text.match(/https?:\/\/[^\s]+/);
  if (m) {
    url = m[0].replace(/[)\].,;>」』”’"']+$/, "");
    const rest = strip(text.replace(m[0], ""));
    sel = rest || textFragmentOf(url);
  } else {
    sel = strip(text);
  }
  return { url, sel: sel.slice(0, 400), title };
}
async function checkShare() {
  try {
    const data = await Store.get("shareData");
    if (!data || !data.text) return;
    await Store.remove("shareData");
    if (Date.now() - (data.ts || 0) > 60000) return;
    const p = parseShare(data.text, data.subject);
    if (!p.sel) return;
    const src = p.url ? { url: p.url, title: p.title || "", sel: p.sel } : null;
    show("Lookup");
    runLookup(p.sel, src);
    if (!src) setTimeout(() => toast("Trình duyệt không gửi kèm link. Có thể bấm 🔗 Thêm link trong Sổ tay để dán tay."), 400);
  } catch (e) { /* bỏ qua */ }
}
window.addEventListener("neutrondict-share", checkShare);

document.addEventListener("visibilitychange", () => { if (!document.hidden) { checkProcessText(); checkShare(); pullAndRefresh(); } });

// ================= Khởi động =================
(async () => {
  const cfg = (await Store.get("syncCfg")) || {};
  if (cfg.url) { $("syncUrl").value = cfg.url; $("syncToken").value = cfg.token || ""; syncNow().then((n) => { $("syncStatus").textContent = "Đã đồng bộ • " + n + " từ"; drawNotebook(); refreshNotifications(); }).catch(() => {}); }
  const ncfg = (await Store.get("notifCfg")) || {};
  if (ncfg.time) $("notifTime").value = ncfg.time;
  updateDueButton();
  refreshNotifications();
  checkProcessText();
  checkShare();
})();

// ================= Ghi công tác giả =================
(function () {
  const ACCENT = "#7c3aed", ACCENT2 = "#c026d3", BRAND = "NeutronDict";
  const st = document.createElement("style");
  st.textContent =
    ".credit-foot{text-align:center;color:#9aa2ad;font-size:13px;margin:22px 0 8px}" +
    ".credit-foot button{border:none;background:none;color:#9aa2ad;font:inherit;padding:6px}" +
    ".credit-foot .hb{color:#e0679a}" +
    ".cabout{position:fixed;inset:0;background:rgba(20,26,36,.55);display:none;align-items:center;justify-content:center;z-index:200;padding:16px}" +
    ".cabout.show{display:flex}" +
    ".ccard{width:min(430px,94vw);background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.3)}" +
    ".ccard .top{background:linear-gradient(135deg," + ACCENT + "," + ACCENT2 + ");color:#fff;padding:20px 22px}" +
    ".ccard .top .h{font-size:19px;font-weight:800}.ccard .top .s{opacity:.9;font-size:13px;margin-top:2px}" +
    ".ccard .bd{padding:18px 22px 6px;color:#2b333d;font-size:15px;line-height:1.6}.ccard .bd b{color:" + ACCENT + "}" +
    ".ccard .meta{color:#6b7684;font-size:14px;margin:10px 0}" +
    ".ccard .motto{text-align:center;font-style:italic;font-size:16px;color:" + ACCENT + ";margin:14px 0 4px}" +
    ".ccard .ft{padding:8px 18px 18px}.ccard .ft button{width:100%;padding:13px;border-radius:12px;font-weight:800;font-size:15px;border:none;background:linear-gradient(135deg," + ACCENT + "," + ACCENT2 + ");color:#fff}";
  document.head.appendChild(st);

  const foot = document.createElement("div");
  foot.className = "credit-foot";
  foot.innerHTML = 'Ra đời bởi <button id="creditBtn">Nyren Phạm <span class="hb">♥</span></button>';
  (document.getElementById("viewNotebook") || document.body).appendChild(foot);

  const FLAG = '<svg width="36" height="24" viewBox="0 0 30 20" style="flex:none;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.3)"><rect width="30" height="20" fill="#da251d"/><polygon points="15,3.5 16.5,7.94 21.18,8 17.43,10.79 18.82,15.26 15,12.55 11.18,15.26 12.57,10.79 8.82,8 13.5,7.94" fill="#ffff00"/></svg>';
  const ov = document.createElement("div");
  ov.className = "cabout";
  ov.innerHTML =
    '<div class="ccard">' +
      '<div class="top"><div style="display:flex;align-items:center;gap:11px">' + FLAG +
      '<div><div class="h">' + BRAND + ' · Về tác giả</div>' +
      '<div class="s">Một món quà nhỏ gửi tặng cộng đồng học tập</div></div></div></div>' +
      '<div class="bd">Xin chào, mình là <b>Nyren Phạm</b> (P.C.N) — cựu sinh viên ngành ' +
      '<b>Tự động hóa, Đại học Bách Khoa Hà Nội</b>, quê <b>Ninh Bình</b>, một người mê <b>nghiên cứu công nghệ</b>.' +
      '<div class="meta">Mình làm dự án này như một món quà hiến tặng cộng đồng học tập — ' +
      'một công cụ nhỏ mà mạnh mẽ, đồng hành cùng bạn trên hành trình chinh phục tiếng Anh &amp; tiếng Nhật. ' +
      'Nếu nó giúp ích cho việc học của bạn, thì mình đã hạnh phúc rồi.</div>' +
      '<div class="motto">“Cho đi là còn mãi.”</div></div>' +
      '<div class="ft"><button id="creditClose">Cảm ơn ♥</button></div>' +
    '</div>';
  document.body.appendChild(ov);

  const open = () => ov.classList.add("show");
  const close = () => ov.classList.remove("show");
  document.getElementById("creditBtn").addEventListener("click", open);
  document.getElementById("creditClose").addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
})();
