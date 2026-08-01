const listEl = document.getElementById("list");
const filterEl = document.getElementById("filter");
const countEl = document.getElementById("count");
const deckBarEl = document.getElementById("deckBar");
const deckActionsEl = document.getElementById("deckActions");
const syncUrlEl = document.getElementById("syncUrl");
const syncTokenEl = document.getElementById("syncToken");
const syncStatusEl = document.getElementById("syncStatus");
const restoreFileEl = document.getElementById("restoreFile");

const ALL = "__all__", NONE = "__none__";
let items = [];   // từ (gồm cả tombstone)
let decks = {};   // { id: {id,name,ts,del?} }
let current = ALL;

// ---- Lưu trữ ----
async function getStore() {
  const s = await chrome.storage.local.get(["notebook", "decks"]);
  return { nb: s.notebook || {}, decks: s.decks || {} };
}
async function setNotebook(nb) { await chrome.storage.local.set({ notebook: nb }); }
async function setDecks(d) { await chrome.storage.local.set({ decks: d }); }

function fmtDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch (e) { return ""; }
}
function dirLabel(d) { return d === "vien" ? "Việt→Anh" : "Anh→Việt"; }
function active(list) { return list.filter((it) => !it.del); }
function activeDecks() {
  return Object.values(decks).filter((d) => !d.del).sort((a, b) => (a.ts || 0) - (b.ts || 0));
}
function deckName(id) { const d = decks[id]; return d && !d.del ? d.name : null; }

// ---- Tải dữ liệu ----
async function load() {
  const s = await getStore();
  decks = s.decks;
  items = Object.entries(s.nb).map(([key, v]) => ({ key, ...v }));
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (current !== ALL && current !== NONE && !deckName(current)) current = ALL;
  drawDecks();
  draw();
}

// ---- Thanh sổ con ----
function countIn(id) {
  const a = active(items);
  if (id === ALL) return a.length;
  if (id === NONE) return a.filter((it) => !it.deck).length;
  return a.filter((it) => it.deck === id).length;
}
function drawDecks() {
  deckBarEl.innerHTML = "";
  const mk = (id, label) => {
    const b = document.createElement("button");
    b.className = "chip" + (current === id ? " active" : "");
    b.textContent = label + " (" + countIn(id) + ")";
    b.addEventListener("click", () => { current = id; drawDecks(); draw(); updateDeckActions(); });
    deckBarEl.appendChild(b);
  };
  mk(ALL, "Tất cả");
  mk(NONE, "Chưa phân loại");
  activeDecks().forEach((d) => mk(d.id, d.name));

  const add = document.createElement("button");
  add.className = "chip add";
  add.textContent = "＋ Sổ mới";
  add.addEventListener("click", createDeck);
  deckBarEl.appendChild(add);
  updateDeckActions();
}
function updateDeckActions() {
  const real = current !== ALL && current !== NONE;
  deckActionsEl.style.display = real ? "" : "none";
}

// ---- Tạo / đổi tên / xoá sổ ----
async function createDeck() {
  const name = (prompt("Tên sổ con mới (ví dụ: Unit 5 - Verbs):") || "").trim();
  if (!name) return;
  const id = "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const d = await (await getStore()).decks;
  d[id] = { id, name, ts: Date.now() };
  await setDecks(d);
  current = id;
  await load();
  syncSoon();
}
async function renameDeck() {
  if (current === ALL || current === NONE) return;
  const cur = deckName(current) || "";
  const name = (prompt("Đổi tên sổ:", cur) || "").trim();
  if (!name || name === cur) return;
  const d = (await getStore()).decks;
  if (d[current]) { d[current] = Object.assign({}, d[current], { name, ts: Date.now() }); }
  await setDecks(d);
  await load();
  syncSoon();
}
async function deleteDeck() {
  if (current === ALL || current === NONE) return;
  const nm = deckName(current);
  if (!confirm('Xoá sổ "' + nm + '"? Các từ trong sổ sẽ chuyển về "Chưa phân loại", không bị mất.')) return;
  const s = await getStore();
  const now = Date.now();
  for (const key in s.nb) {
    if (s.nb[key].deck === current) {
      const e = Object.assign({}, s.nb[key], { ts: now });
      delete e.deck;
      s.nb[key] = e;
    }
  }
  s.decks[current] = { id: current, name: nm, del: true, ts: now };
  await setNotebook(s.nb);
  await setDecks(s.decks);
  current = ALL;
  await load();
  syncSoon();
}

// ---- Chuyển từ vào sổ ----
async function moveWord(key, deckId) {
  const s = await getStore();
  const e = s.nb[key];
  if (!e) return;
  const ne = Object.assign({}, e, { ts: Date.now() });
  if (deckId === NONE) delete ne.deck;
  else ne.deck = deckId;
  s.nb[key] = ne;
  await setNotebook(s.nb);
  await load();
  syncSoon();
}

// ---- Phát âm tiếng Anh (ưu tiên file audio thật, không có thì giọng máy) ----
function speak(text, audio) {
  if (audio) { try { const a = new Audio(audio); a.play(); return; } catch (e) { /* rơi xuống TTS */ } }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("en"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { /* máy không có giọng Anh */ }
}

// ---- Sóng học tập (lặp lại ngắt quãng) ----
const SRS_STEPS = [1, 3, 7, 14, 30, 60, 120];
const DAY = 24 * 60 * 60 * 1000;

function isDue(it, now) {
  if (it.del) return false;
  const srs = it.srs;
  if (!srs || !srs.due) return true;
  return srs.due <= now;
}
function dueList(scopeList) {
  const now = Date.now();
  return scopeList.filter((it) => isDue(it, now));
}
async function gradeWord(key, remembered) {
  const s = await getStore();
  const e = s.nb[key];
  if (!e) return;
  const now = Date.now();
  const cur = (e.srs && typeof e.srs.lv === "number") ? e.srs.lv : -1;
  let lv, due;
  if (remembered) {
    lv = Math.min(cur + 1, SRS_STEPS.length - 1);
    due = now + SRS_STEPS[lv] * DAY;
  } else {
    lv = -1;
    due = now;
  }
  s.nb[key] = Object.assign({}, e, { srs: { lv: lv, due: due }, ts: now });
  await setNotebook(s.nb);
}

// ---- Buổi học ----
let session = { queue: [], done: 0, again: 0 };
const ovl = document.getElementById("studyOverlay");
const stWord = document.getElementById("stWord");
const stRead = document.getElementById("stRead");
const stMean = document.getElementById("stMean");
const stProg = document.getElementById("stProg");
const stGrade = document.getElementById("stGrade");
const stReveal = document.getElementById("stReveal");
const stSrc = document.getElementById("stSrc");
const stBody = document.getElementById("stBody");
const stDone = document.getElementById("stDone");
const stSummary = document.getElementById("stSummary");

function startStudy() {
  const due = dueList(currentActiveSet());
  if (!due.length) { alert("Không có từ nào đến hạn trong mục này. Quay lại sau nhé!"); return; }
  session = { queue: due.slice().sort(() => Math.random() - 0.5), done: 0, again: 0, deleted: 0 };
  lastDeleted = null;
  document.getElementById("stUndo").style.display = "none";
  ovl.classList.add("show");
  showCard();
}
function showCard() {
  const it = session.queue[0];
  if (!it) { finishStudy(); return; }
  const dr = document.querySelector(".delrow");
  if (dr) dr.style.display = "";
  stBody.style.display = ""; stDone.style.display = "none";
  stProg.textContent = "Còn " + session.queue.length + " từ • đã xong " + session.done;
  stWord.textContent = it.word;
  if (stSrc) {
    if (it.src && it.src.url) { stSrc.style.display = ""; stSrc.onclick = () => openSource(it); }
    else { stSrc.style.display = "none"; stSrc.onclick = null; }
  }
  stRead.textContent = "";
  stMean.innerHTML = "";
  stReveal.style.display = "";
  stGrade.style.display = "none";
}
function revealCard() {
  const it = session.queue[0];
  if (!it) return;
  stRead.textContent = it.reading || "";
  if (it.means && it.means.length) {
    const ul = document.createElement("ul");
    it.means.slice(0, 5).forEach((m) => { const li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
    stMean.innerHTML = ""; stMean.appendChild(ul);
  }
  stReveal.style.display = "none";
  stGrade.style.display = "";
}
async function grade(remembered) {
  const it = session.queue.shift();
  if (!it) return;
  await gradeWord(it.key, remembered);
  if (remembered) session.done++;
  else { session.again++; session.queue.push(Object.assign({}, it)); }
  syncSoon();
  showCard();
}
async function finishStudy() {
  stBody.style.display = "none"; stDone.style.display = "";
  stProg.textContent = "";
  stSummary.textContent = "Đã thuộc " + session.done + " từ"
    + (session.again ? " • phải học lại " + session.again + " lượt" : "")
    + (session.deleted ? " • đã xoá " + session.deleted + " từ" : "");
  const dr2 = document.querySelector(".delrow");
  if (dr2) dr2.style.display = "none";
  await load();
  syncSoon();
}
function closeStudy() { ovl.classList.remove("show"); load(); }

// ---- Xoá nhanh ngay trong buổi học ----
let lastDeleted = null;

async function deleteCurrentCard() {
  const it = session.queue[0];
  if (!it) return;
  const store = await getStore();
  const original = store.nb[it.key];
  lastDeleted = original ? { key: it.key, entry: Object.assign({}, original) } : null;

  store.nb[it.key] = { word: it.word, dict: it.dict, del: true, ts: Date.now() };
  await setNotebook(store.nb);

  session.queue = session.queue.filter((x) => x.key !== it.key);
  session.deleted = (session.deleted || 0) + 1;

  const u = document.getElementById("stUndo");
  document.getElementById("stUndoWord").textContent = it.word;
  u.style.display = "";
  syncSoon();
  showCard();
}

async function undoDelete() {
  if (!lastDeleted) return;
  const store = await getStore();
  store.nb[lastDeleted.key] = Object.assign({}, lastDeleted.entry, { ts: Date.now() });
  await setNotebook(store.nb);
  lastDeleted = null;
  document.getElementById("stUndo").style.display = "none";
  await load();
  syncSoon();
}

document.getElementById("stDel").addEventListener("click", deleteCurrentCard);
document.getElementById("stUndoBtn").addEventListener("click", undoDelete);

document.getElementById("study").addEventListener("click", startStudy);
stReveal.addEventListener("click", revealCard);
document.getElementById("gKnow").addEventListener("click", () => grade(true));
document.getElementById("gForgot").addEventListener("click", () => grade(false));
document.getElementById("stSpk").addEventListener("click", () => { const it = session.queue[0]; if (it) speak(it.word, it.audio); });
document.getElementById("stClose").addEventListener("click", closeStudy);
document.addEventListener("keydown", (e) => {
  if (!ovl.classList.contains("show")) return;
  if (e.key === "Escape") closeStudy();
  else if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (stReveal.style.display !== "none") revealCard(); }
  else if (e.key === "1" && stGrade.style.display !== "none") grade(false);
  else if (e.key === "2" && stGrade.style.display !== "none") grade(true);
  else if (e.key === "0" || e.key === "Delete") { e.preventDefault(); deleteCurrentCard(); }
});

// ---- Mở lại trang nguồn và tô sáng từ/câu đã lưu ----
function openSource(it) {
  if (!it.src || !it.src.url) return;
  const text = (it.src.sel || it.word || "").slice(0, 400);
  chrome.storage.local.set({ pendingHighlight: { url: it.src.url, text: text, ts: Date.now() } }, () => {
    chrome.tabs.create({ url: it.src.url });
  });
}

// ---- Danh sách ----
function currentActiveSet() {
  const a = active(items);
  if (current === ALL) return a;
  if (current === NONE) return a.filter((it) => !it.deck);
  return a.filter((it) => it.deck === current);
}
function draw() {
  const kw = filterEl.value.trim().toLowerCase();
  const base = currentActiveSet();
  const rows = base.filter((it) => {
    if (!kw) return true;
    const hay = (it.word + " " + (it.reading || "") + " " + (it.means || []).join(" ")).toLowerCase();
    return hay.includes(kw);
  });
  countEl.textContent = "Hiện: " + rows.length + " từ";
  const dc = document.getElementById("dueCount"); if (dc) dc.textContent = dueList(base).length;

  if (!rows.length) {
    listEl.innerHTML = "";
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = active(items).length ? "Không có từ trong mục này." : "Chưa có từ nào. Tra một từ rồi bấm “＋ Lưu”.";
    listEl.appendChild(d);
    return;
  }
  const dks = activeDecks();
  listEl.innerHTML = "";
  for (const it of rows) {
    const row = document.createElement("div");
    row.className = "row" + (it.kind === "sent" ? " sent" : "");
    const main = document.createElement("div");
    main.className = "main";
    const head = document.createElement("div");
    const w = document.createElement("span"); w.className = "w"; w.textContent = it.word;
    head.appendChild(w);
    if (it.reading) { const r = document.createElement("span"); r.className = "r"; r.textContent = it.reading; head.appendChild(r); }
    const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊"; spk.title = "Phát âm";
    spk.addEventListener("click", () => speak(it.word, it.audio)); head.appendChild(spk);
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = dirLabel(it.dict); head.appendChild(tag);
    if (isDue(it, Date.now())) { const du = document.createElement("span"); du.className = "due"; du.textContent = "đến hạn"; head.appendChild(du); }
    if (it.deck && deckName(it.deck) && current === ALL) {
      const dt = document.createElement("span"); dt.className = "tag"; dt.textContent = "📁 " + deckName(it.deck); head.appendChild(dt);
    }
    main.appendChild(head);
    if (it.means && it.means.length) {
      const m = document.createElement("div"); m.className = "m"; m.textContent = it.means.slice(0, 4).join("; ");
      main.appendChild(m);
    }
    if (it.src && it.src.url) {
      const sEl = document.createElement("div"); sEl.className = "srcline";
      let hostn = it.src.url; try { hostn = new URL(it.src.url).hostname.replace(/^www\./, ""); } catch (e) {}
      sEl.textContent = "🔗 " + hostn;
      sEl.title = "Lưu từ: " + (it.src.title || it.src.url);
      main.appendChild(sEl);
    }
    const meta = document.createElement("div"); meta.className = "meta"; meta.textContent = fmtDate(it.ts);
    main.appendChild(meta);
    row.appendChild(main);

    const ctl = document.createElement("div");
    ctl.className = "rowctl";
    const sel = document.createElement("select");
    sel.className = "movesel";
    sel.title = "Chuyển vào sổ";
    const optNone = document.createElement("option");
    optNone.value = NONE; optNone.textContent = "Chưa phân loại";
    sel.appendChild(optNone);
    dks.forEach((d) => { const o = document.createElement("option"); o.value = d.id; o.textContent = d.name; sel.appendChild(o); });
    sel.value = it.deck && deckName(it.deck) ? it.deck : NONE;
    sel.addEventListener("change", () => moveWord(it.key, sel.value));
    ctl.appendChild(sel);

    if (it.src && it.src.url) {
      const open = document.createElement("button");
      open.className = "srcbtn"; open.textContent = "🔗 Nguồn";
      open.title = "Mở lại trang nguồn và tô sáng vị trí đã lưu";
      open.addEventListener("click", () => openSource(it));
      ctl.appendChild(open);
    }

    const del = document.createElement("button");
    del.className = "danger del"; del.textContent = "Xoá";
    del.addEventListener("click", async () => {
      const s = await getStore();
      s.nb[it.key] = { word: it.word, dict: it.dict, del: true, ts: Date.now() };
      await setNotebook(s.nb);
      await load();
      syncSoon();
    });
    ctl.appendChild(del);
    row.appendChild(ctl);
    listEl.appendChild(row);
  }
}

// ---- Xuất file (theo sổ đang chọn) ----
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function safe(s) { return String(s == null ? "" : s).replace(/[\t\r\n]+/g, " ").trim(); }
function fileTag() {
  if (current === ALL) return "tatca";
  if (current === NONE) return "chuaphanloai";
  return (deckName(current) || "so").replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
}
function exportAnki() {
  const list = currentActiveSet();
  if (!list.length) return;
  const lines = list.map((it) => {
    const front = safe(it.word);
    const read = it.reading ? "【" + safe(it.reading) + "】 " : "";
    const back = read + safe((it.means || []).join("; "));
    const deck = safe(deckName(it.deck) || "");
    return front + "\t" + back + "\t" + deck;
  });
  download("neutrondict-anki-" + fileTag() + ".tsv", lines.join("\n"), "text/tab-separated-values;charset=utf-8");
}
function csvCell(s) { s = String(s == null ? "" : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function exportCsv() {
  const list = currentActiveSet();
  if (!list.length) return;
  const header = ["Từ", "Phiên âm (IPA)", "Nghĩa", "Sổ", "Hướng", "Ngày lưu"];
  const rows = list.map((it) => [it.word, it.reading || "", (it.means || []).join("; "), deckName(it.deck) || "", dirLabel(it.dict), fmtDate(it.ts)].map(csvCell).join(","));
  const csv = "\uFEFF" + header.map(csvCell).join(",") + "\n" + rows.join("\n");
  download("neutrondict-sotay-" + fileTag() + ".csv", csv, "text/csv;charset=utf-8");
}

// ---- Sao lưu / Nạp (.json) ----
async function backupJson() {
  const s = await getStore();
  download("neutrondict-sotay-backup.json", JSON.stringify({ notebook: s.nb, decks: s.decks }), "application/json;charset=utf-8");
}
function mergeLocal(a, b) {
  const out = {};
  [a || {}, b || {}].forEach((src) => { for (const k in src) { const e = src[k]; if (!out[k] || (e.ts || 0) > (out[k].ts || 0)) out[k] = e; } });
  return out;
}
async function restoreJson(file) {
  try {
    const text = await file.text();
    const imp = JSON.parse(text);
    const s = await getStore();
    const impNb = (imp && imp.notebook !== undefined) ? (imp.notebook || {}) : (imp || {});
    const impDecks = (imp && imp.decks) || {};
    await setNotebook(mergeLocal(s.nb, impNb));
    await setDecks(mergeLocal(s.decks, impDecks));
    await load();
    syncSoon();
    setStatus("Đã nạp file và trộn vào sổ tay.");
  } catch (e) { setStatus("File không hợp lệ."); }
}

async function clearAll() {
  const list = currentActiveSet();
  if (!list.length) return;
  const where = current === ALL ? "toàn bộ sổ tay" : ('mục "' + (current === NONE ? "Chưa phân loại" : deckName(current)) + '"');
  if (!confirm("Xoá " + list.length + " từ trong " + where + "? Việc xoá cũng đồng bộ sang máy khác.")) return;
  const s = await getStore();
  const now = Date.now();
  for (const it of list) s.nb[it.key] = { word: it.word, dict: it.dict, del: true, ts: now };
  await setNotebook(s.nb);
  await load();
  syncSoon();
}

// ---- Đồng bộ ----
function setStatus(t) { syncStatusEl.textContent = t; }
async function loadConfig() {
  const { syncUrl, syncToken } = await chrome.storage.local.get(["syncUrl", "syncToken"]);
  if (syncUrl) syncUrlEl.value = syncUrl;
  if (syncToken) syncTokenEl.value = syncToken;
  return { syncUrl, syncToken };
}
async function saveConfig() {
  const syncUrl = syncUrlEl.value.trim();
  const syncToken = syncTokenEl.value.trim();
  await chrome.storage.local.set({ syncUrl, syncToken });
  setStatus(syncUrl ? "Đã lưu cấu hình đồng bộ." : "Đã xoá cấu hình.");
}
function syncNow() {
  setStatus("Đang đồng bộ…");
  chrome.runtime.sendMessage({ type: "SYNC_NOW" }, async (res) => {
    if (chrome.runtime.lastError) { setStatus("Lỗi: " + chrome.runtime.lastError.message); return; }
    if (res && res.ok) {
      await load();
      setStatus("Đã đồng bộ • " + res.count + " từ • " + new Date().toLocaleTimeString("vi-VN"));
    } else {
      setStatus("Không đồng bộ được: " + ((res && res.error) || "lỗi không rõ"));
    }
  });
}
function syncSoon() { try { chrome.runtime.sendMessage({ type: "SYNC_SOON" }); } catch (e) {} }

document.addEventListener("visibilitychange", async () => {
  if (document.hidden) return;
  const { syncUrl } = await chrome.storage.local.get("syncUrl");
  if (syncUrl) syncNow();
});

// ---- Cài đặt tra nhanh ----
const SET_DEFAULTS = { inline: true, requireCtrl: false, maxLen: 40, translate: true, maxSent: 400 };
async function loadSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  const S = Object.assign({}, SET_DEFAULTS, settings || {});
  const a = document.getElementById("setInline"), b = document.getElementById("setCtrl"), c = document.getElementById("setLen");
  const t = document.getElementById("setTrans");
  if (a) a.checked = !!S.inline;
  if (b) b.checked = !!S.requireCtrl;
  if (c) c.value = S.maxLen || 40;
  if (t) t.checked = S.translate !== false;
}
async function saveSettings() {
  const S = {
    inline: document.getElementById("setInline").checked,
    requireCtrl: document.getElementById("setCtrl").checked,
    maxLen: Math.max(5, Math.min(200, parseInt(document.getElementById("setLen").value, 10) || 40)),
    translate: document.getElementById("setTrans").checked,
    maxSent: 400
  };
  await chrome.storage.local.set({ settings: S });
  document.getElementById("setStatus").textContent = "Đã lưu. Tải lại trang web đang mở để áp dụng ngay.";
}
async function clearCache() {
  await chrome.storage.local.set({ cache: {}, trCache: {} });
  document.getElementById("setStatus").textContent = "Đã xoá bộ nhớ đệm tra từ.";
}
if (document.getElementById("saveSet")) {
  document.getElementById("saveSet").addEventListener("click", saveSettings);
  document.getElementById("clearCache").addEventListener("click", clearCache);
}

// ---- Sự kiện ----
filterEl.addEventListener("input", draw);
document.getElementById("ipaGuide").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("ipa-guide.html") }));
document.getElementById("exAnki").addEventListener("click", exportAnki);
document.getElementById("exCsv").addEventListener("click", exportCsv);
document.getElementById("backup").addEventListener("click", backupJson);
document.getElementById("restore").addEventListener("click", () => restoreFileEl.click());
restoreFileEl.addEventListener("change", (e) => { if (e.target.files[0]) restoreJson(e.target.files[0]); e.target.value = ""; });
document.getElementById("clear").addEventListener("click", clearAll);
document.getElementById("renameDeck").addEventListener("click", renameDeck);
document.getElementById("deleteDeck").addEventListener("click", deleteDeck);
document.getElementById("saveCfg").addEventListener("click", saveConfig);
document.getElementById("syncNow").addEventListener("click", syncNow);

// ---- Khởi động ----
(async () => {
  await load();
  await loadSettings();
  const cfg = await loadConfig();
  if (cfg.syncUrl) { document.getElementById("syncBox").open = false; syncNow(); }
  else { document.getElementById("syncBox").open = true; }
})();
