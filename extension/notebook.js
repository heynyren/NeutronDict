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
const LIKE = "__like__", DISLIKE = "__dislike__";   // 2 nhãn cố định: Thích / Không thích
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
  if (current !== ALL && current !== NONE && current !== LIKE && current !== DISLIKE && !deckName(current)) current = ALL;
  drawDecks();
  draw();
}

// ---- Thanh sổ con ----
function countIn(id) {
  const a = active(items);
  if (id === ALL) return a.length;
  if (id === NONE) return a.filter((it) => !it.deck).length;
  if (id === LIKE) return a.filter((it) => it.fav === 1).length;
  if (id === DISLIKE) return a.filter((it) => it.fav === -1).length;
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
  mk(LIKE, "❤️ Thích");
  mk(DISLIKE, "👎 Không thích");
  activeDecks().forEach((d) => mk(d.id, d.name));

  const add = document.createElement("button");
  add.className = "chip add";
  add.textContent = "＋ Sổ mới";
  add.addEventListener("click", createDeck);
  deckBarEl.appendChild(add);
  updateDeckActions();
}
function updateDeckActions() {
  // 2 nhãn cố định (Thích/Không thích) không cho đổi tên hay xoá.
  const real = current !== ALL && current !== NONE && current !== LIKE && current !== DISLIKE;
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
const _audioCache = new Map();
function getAudio(url) {
  let a = _audioCache.get(url);
  if (!a) { a = new Audio(url); a.preload = "auto"; _audioCache.set(url, a); }
  return a;
}
function ttsSpeak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("en"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { /* máy không có giọng Anh */ }
}
function speak(text, audio) {
  if (audio) {
    try {
      const a = getAudio(audio);
      a.onerror = () => ttsSpeak(text);      // link mp3 hỏng (vd 'embark') -> đọc bằng giọng máy
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => ttsSpeak(text));
      return;
    } catch (e) { /* rơi xuống TTS */ }
  }
  ttsSpeak(text);
}
try { speechSynthesis.getVoices(); } catch (e) {}

// ---- Sóng học tập (lặp lại ngắt quãng) ----
const SRS_STEPS = [1, 3, 7, 14, 30, 60, 120];
const DAY = 24 * 60 * 60 * 1000;
// Đến hạn vào ĐẦU NGÀY mục tiêu (00:00), không phải đúng N×24 giờ sau —
// để hôm sau mở app lúc nào cũng thấy từ, không bị "sáng ít, tối mới đủ".
function dueInDays(days) {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

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
    due = dueInDays(SRS_STEPS[lv]);
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
const stFav = document.getElementById("stFav");
const stBody = document.getElementById("stBody");
const stDone = document.getElementById("stDone");
const stSummary = document.getElementById("stSummary");

// Nút Thích/Không thích ngay trên thẻ học — bật/tắt ngay, không rời buổi học.
function renderStudyFav(it) {
  if (!stFav) return;
  stFav.innerHTML = "";
  const mk = (val, onTxt, offTxt) => {
    const on = it.fav === val;
    const b = document.createElement("button");
    b.className = "favbtn " + (val === 1 ? "like" : "dislike") + (on ? " on" : "");
    b.textContent = on ? onTxt : offTxt;
    b.title = val === 1 ? (on ? "Bỏ khỏi Thích" : "Thích") : (on ? "Bỏ khỏi Không thích" : "Không thích");
    b.addEventListener("click", () => setFavStudy(it, val));
    return b;
  };
  stFav.appendChild(mk(1, "❤️", "🤍"));
  stFav.appendChild(mk(-1, "👎", "👎"));
}
async function setFavStudy(it, val) {
  const s = await getStore();
  const e = s.nb[it.key];
  if (!e || e.del) return;
  const next = (e.fav === val) ? 0 : val;
  const ne = Object.assign({}, e, { ts: Date.now() });
  if (next) ne.fav = next; else delete ne.fav;
  s.nb[it.key] = ne;
  await setNotebook(s.nb);
  it.fav = next;
  renderStudyFav(it);
  syncSoon();
}

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
  renderStudyFav(it);
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

// ---- Mở lại trang nguồn và tô sáng ĐÚNG đoạn đã lưu (kiểu Neuron Note: 2 lớp bổ trợ) ----
//  1) Text Fragment (#:~:text=): trình duyệt tự cuộn + tô sáng. Chạy được cả trên trang
//     web thường LẪN trình xem PDF tích hợp của Chrome (nên PDF cũng nhảy đúng chỗ).
//  2) pendingHighlight: content script bọc <mark> bền vững, đa-node trên trang web thường
//     (đoạn dài trải nhiều thẻ, dùng prefix/suffix chọn đúng chỗ khi có đoạn trùng).
function buildTextFragment(src) {
  const s = (src.sel || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Escape dấu '-' trong chữ để không lẫn với dấu phân cách prefix "-," / suffix ",-".
  const enc = (x) => encodeURIComponent(x).replace(/-/g, "%2D");
  let core;
  if (s.length <= 60) core = enc(s);
  else {
    const w = s.split(" ");
    if (w.length >= 4) core = enc(w.slice(0, 6).join(" ")) + "," + enc(w.slice(-6).join(" "));
    else core = enc(s.slice(0, 12)) + "," + enc(s.slice(-12));
  }
  let frag = core;
  const pre = (src.prefix || "").split(" ").filter(Boolean).slice(-4).join(" ");
  const suf = (src.suffix || "").split(" ").filter(Boolean).slice(0, 4).join(" ");
  if (pre) frag = enc(pre) + "-," + frag;
  if (suf) frag = frag + ",-" + enc(suf);
  return frag;
}
function fragUrl(src) {
  const frag = buildTextFragment(src);
  if (!frag) return src.url;
  return src.url + (src.url.indexOf("#") >= 0 ? ":~:text=" : "#:~:text=") + frag;
}
function openSource(it) {
  const src = it.src;
  if (!src || !src.url) return;
  const text = (src.sel || it.word || "").replace(/\s+/g, " ").trim();
  const url = fragUrl(src);
  if (src.pdf) {
    // PDF: chỉ dựa vào Text Fragment (content script không chạy trong trình xem PDF).
    // Chép sẵn đoạn để nếu trình xem PDF không hỗ trợ thì bạn Ctrl+F dán tìm nhanh.
    const q = text.split(" ").slice(0, 10).join(" ");
    try { if (navigator.clipboard) navigator.clipboard.writeText(q); } catch (e) {}
    chrome.tabs.create({ url });
    return;
  }
  // Trang thường: nhờ content script tô <mark> bền vững + Text Fragment cuộn tới.
  chrome.storage.local.set({
    pendingHighlight: { url: src.url, text: text, prefix: src.prefix || "", suffix: src.suffix || "", ts: Date.now() }
  }, () => { chrome.tabs.create({ url }); });
}

// ---- Danh sách ----
function currentActiveSet() {
  const a = active(items);
  if (current === ALL) return a;
  if (current === NONE) return a.filter((it) => !it.deck);
  if (current === LIKE) return a.filter((it) => it.fav === 1);
  if (current === DISLIKE) return a.filter((it) => it.fav === -1);
  return a.filter((it) => it.deck === current);
}
// Gắn/bỏ nhãn Thích(1)/Không thích(-1). Bấm lại nút đang bật -> về bình thường.
// Chỉ đổi trường fav + ts (đồng bộ tự chạy qua mergeByTs), KHÔNG đụng tiến độ học.
async function setFav(key, val) {
  const s = await getStore();
  const e = s.nb[key];
  if (!e || e.del) return;
  const next = (e.fav === val) ? 0 : val;
  const ne = Object.assign({}, e, { ts: Date.now() });
  if (next) ne.fav = next; else delete ne.fav;
  s.nb[key] = ne;
  await setNotebook(s.nb);
  await load();
  syncSoon();
}
function favButtons(it) {
  const wrap = document.createElement("span"); wrap.className = "favctl";
  const like = document.createElement("button");
  like.className = "favbtn like" + (it.fav === 1 ? " on" : "");
  like.textContent = it.fav === 1 ? "❤️" : "🤍";
  like.title = it.fav === 1 ? "Bỏ khỏi Thích" : "Thích";
  like.addEventListener("click", (e) => { e.stopPropagation(); setFav(it.key, 1); });
  const dis = document.createElement("button");
  dis.className = "favbtn dislike" + (it.fav === -1 ? " on" : "");
  dis.textContent = "👎";
  dis.title = it.fav === -1 ? "Bỏ khỏi Không thích" : "Không thích";
  dis.addEventListener("click", (e) => { e.stopPropagation(); setFav(it.key, -1); });
  wrap.appendChild(like); wrap.appendChild(dis);
  return wrap;
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
    head.appendChild(favButtons(it));
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
  if (current === LIKE) return "thich";
  if (current === DISLIKE) return "khongthich";
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

// ================= Ghi công tác giả =================
(function () {
  const ACCENT = "#7c3aed", ACCENT2 = "#c026d3", BRAND = "NeutronDict";
  const st = document.createElement("style");
  st.textContent =
    ".credit-foot{text-align:center;color:#9aa2ad;font-size:12.5px;margin:28px 0 6px}" +
    ".credit-foot button{border:none;background:none;color:#9aa2ad;cursor:pointer;font:inherit}" +
    ".credit-foot button:hover{color:" + ACCENT + "}.credit-foot .hb{color:#e0679a}" +
    ".cabout{position:fixed;inset:0;background:rgba(20,26,36,.55);display:none;align-items:center;justify-content:center;z-index:80;padding:16px}" +
    ".cabout.show{display:flex}" +
    ".ccard{width:min(430px,94vw);background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.3);animation:cpop .25s ease}" +
    "@keyframes cpop{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}" +
    ".ccard .top{background:linear-gradient(135deg," + ACCENT + "," + ACCENT2 + ");color:#fff;padding:20px 22px}" +
    ".ccard .top .h{font-size:19px;font-weight:800}.ccard .top .s{opacity:.9;font-size:13px;margin-top:2px}" +
    ".ccard .bd{padding:18px 22px 6px;color:#2b333d;font-size:14.5px;line-height:1.6}.ccard .bd b{color:" + ACCENT + "}" +
    ".ccard .meta{color:#6b7684;font-size:13.5px;margin:10px 0}" +
    ".ccard .motto{text-align:center;font-style:italic;font-size:15.5px;color:" + ACCENT + ";margin:14px 0 4px}" +
    ".ccard .ft{padding:8px 18px 18px}.ccard .ft button{width:100%;padding:11px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;border:none;background:linear-gradient(135deg," + ACCENT + "," + ACCENT2 + ");color:#fff}";
  document.head.appendChild(st);

  const foot = document.createElement("div");
  foot.className = "credit-foot";
  foot.innerHTML = 'Ra đời bởi <button id="creditBtn" title="Về tác giả">Nyren Phạm <span class="hb">♥</span></button>';
  (document.querySelector(".sidebar") || document.querySelector(".wrap") || document.body).appendChild(foot);

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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();
