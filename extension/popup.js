/**
 * Popup tra nhanh của NeutronDict.
 *
 * Dùng chung hệ thiết kế trong ui.css và bộ icon Phosphor trong icons.js với
 * trang Sổ tay, nên hai chỗ nhìn là cùng một app.
 */
const qEl = document.getElementById("q");
const dirEl = document.getElementById("dir");
const goEl = document.getElementById("go");
const resEl = document.getElementById("result");
const detailEl = document.getElementById("detail");
const bookEl = document.getElementById("book");
const tabWordEl = document.getElementById("tabWord");
const tabDetailEl = document.getElementById("tabDetail");
const tabTransEl = document.getElementById("tabTrans");
const transEl = document.getElementById("trans");
const IS_CTX_WINDOW = new URLSearchParams(location.search).get("ctx") === "1";
let initialSrc = null;   // nguồn của từ ban đầu (URL + tiêu đề + đoạn chọn)
let lastEntry = null;    // mục hiện tại để dựng tab Chi tiết

/** Icon dạng phần tử DOM. */
function ic(ten, opt) {
  const s = document.createElement("span");
  s.innerHTML = window.Icon(ten, opt);
  return s.firstChild;
}

/** Ô trạng thái giữa thân popup (đang tra, không có kết quả…). */
function trangThai(box, iconTen, chu) {
  box.className = "state";
  box.innerHTML = "";
  box.appendChild(ic(iconTen, { size: 34, cls: iconTen === "spinner-gap" ? "spin" : "" }));
  box.appendChild(document.createElement("div")).textContent = chu;
}

/** Nút loa nhỏ, chìm vào nền. */
function nutLoa(text, audio, size) {
  const b = document.createElement("button");
  b.className = "iconbtn"; b.type = "button"; b.title = "Phát âm";
  b.appendChild(ic("speaker-high", { size: size || 17 }));
  b.addEventListener("click", () => speak(text, audio));
  return b;
}

/**
 * Chuỗi ngày hiện lên ngay trong popup.
 *
 * Popup là chỗ mở nhiều nhất trong ngày — mỗi lần bôi đen một từ là nó bật ra.
 * Nhét con số chuỗi ngày vào đây nghĩa là bạn thấy nó vài chục lần một ngày mà
 * không phải mở app, đó chính là lúc nó có tác dụng nhắc.
 */
async function veChuoiNgay() {
  try {
    const { hoc } = await chrome.storage.local.get("hoc");
    const view = window.TienDo.tongQuan(window.TienDo.chuanHoa(hoc), {});
    const chip = document.getElementById("streakChip");
    if (!view.chuoi.hienTai && !view.homNay.on) return;   // chưa học buổi nào -> không khoe gì cả
    chip.innerHTML = window.Icon("fire", { size: 14, weight: "solid" });
    const s = document.createElement("span");
    s.textContent = view.chuoi.hienTai
      ? view.chuoi.hienTai + " ngày · " + view.homNay.on + "/" + view.goal
      : view.homNay.on + "/" + view.goal + " hôm nay";
    chip.appendChild(s);
    chip.title = view.homNay.dat
      ? "Hôm nay đã đạt mục tiêu"
      : "Còn " + view.homNay.conLai + " lượt nữa là đạt mục tiêu hôm nay";
    chip.style.display = "";
  } catch (e) { /* không có dữ liệu tiến độ thì thôi */ }
}

// ---- Lấy từ đang bôi đen (web) hoặc vừa Ctrl+C (PDF) ----
async function getInitialWord() {
  try {
    const { pendingLookup } = await chrome.storage.local.get("pendingLookup");
    if (pendingLookup && pendingLookup.word && (Date.now() - (pendingLookup.ts || 0) < 15000)) {
      await chrome.storage.local.remove("pendingLookup");
      if (pendingLookup.src && pendingLookup.src.url) initialSrc = pendingLookup.src;
      return pendingLookup.word.trim();
    }
  } catch (e) { /* bỏ qua */ }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = (tab && tab.url) || "";
    const isPdf = /\.pdf(\?|#|$)/i.test(url);
    if (!isPdf && tab && tab.id && /^https?:/i.test(url)) {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => (window.getSelection ? window.getSelection().toString() : "")
      });
      const t = ((res && res[0] && res[0].result) || "").trim();
      if (t) {
        initialSrc = { url: url, title: (tab.title || "").slice(0, 200), sel: t };
        return t;
      }
    }
  } catch (e) { /* PDF hoặc trang bị chặn -> đọc clipboard */ }
  return (await readClipboard()).trim();
}

async function readClipboard() {
  try {
    const t = await navigator.clipboard.readText();
    if (t && t.trim()) return t;
  } catch (e) { /* thử cách B */ }
  try {
    const ta = document.createElement("textarea");
    ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    document.execCommand("paste");
    const v = ta.value;
    ta.remove();
    if (v) return v;
  } catch (e) { /* bỏ qua */ }
  return "";
}

// ---- Tra qua service worker (Free Dictionary + Google Dịch + cách đọc dễ) ----
function lookup(word, dict) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "LOOKUP", word, dict }, (res) => {
      if (chrome.runtime.lastError || !res || !res.ok) { resolve({ entries: [], saved: {} }); return; }
      resolve(res);
    });
  });
}

// ---- Phát âm: ưu tiên file audio thật, không có thì giọng máy (en-US) ----
// Giữ sẵn (preload) các file audio đã hiện để bấm loa là phát ngay, không bị trễ.
const _audioCache = new Map();
function getAudio(url) {
  let a = _audioCache.get(url);
  if (!a) { a = new Audio(url); a.preload = "auto"; _audioCache.set(url, a); }
  return a;
}
function preloadAudio(url) { if (url) { try { getAudio(url); } catch (e) {} } }
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
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => ttsSpeak(text));
      return;
    } catch (e) { /* rơi xuống TTS */ }
  }
  ttsSpeak(text);
}
try { speechSynthesis.getVoices(); } catch (e) {}   // hâm nóng danh sách giọng

// ---- Lưu sổ tay qua service worker ----
function saveEntry(dict, en) {
  const entry = Object.assign({}, en);
  if (initialSrc && initialSrc.url) entry.src = initialSrc;
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "SAVE_WORD", entry, dict }, () => { try { chrome.runtime.sendMessage({ type: "SYNC_SOON" }); } catch (e) {} resolve(); });
  });
}
async function isSaved(dict, word) {
  const { notebook } = await chrome.storage.local.get("notebook");
  const nb = notebook || {};
  const k = dict + ":" + word;
  return !!(nb[k] && !nb[k].del);
}

// ---- Tab Từ vựng ----
async function renderWord(res) {
  const entries = (res && res.entries) || [];
  const saved = (res && res.saved) || {};
  resEl.className = "";
  resEl.innerHTML = "";
  lastEntry = entries[0] || null;
  if (!entries.length) {
    trangThai(resEl, "warning-circle", "Không tìm thấy nghĩa. Kiểm tra chính tả hoặc mạng rồi thử lại.");
    tabDetailEl.disabled = true;
    return;
  }
  tabDetailEl.disabled = !(lastEntry && ((lastEntry.pos && lastEntry.pos.length) || lastEntry.reading));
  for (const en of entries) {
    preloadAudio(en.audio);
    const box = document.createElement("div");
    box.className = "entry";
    const head = document.createElement("div");
    head.className = "rowx between";
    head.style.alignItems = "flex-start";
    const left = document.createElement("div");
    const w = document.createElement("span");
    w.style.cssText = "font-size:21px;font-weight:750;letter-spacing:-.01em";
    w.textContent = en.word;
    left.appendChild(w);
    left.appendChild(nutLoa(en.word, en.audio));
    if (en.reading) {
      const r = document.createElement("span");
      r.style.cssText = "color:var(--accent);font-size:13.5px;font-weight:600;margin-left:4px";
      r.textContent = en.reading;
      left.appendChild(r);
    }
    head.appendChild(left);

    const btn = document.createElement("button");
    btn.className = "btn xs save"; btn.type = "button";
    const danhDauDaLuu = () => {
      btn.classList.add("saved");
      btn.innerHTML = window.Icon("check", { size: 15 }) + '<span class="lb">Đã lưu</span>';
    };
    if (saved[en.word]) danhDauDaLuu();
    else {
      btn.innerHTML = window.Icon("plus", { size: 15 }) + '<span class="lb">Lưu</span>';
      btn.addEventListener("click", async () => {
        await saveEntry(dirEl.value, en);
        danhDauDaLuu();
      });
    }
    head.appendChild(btn);
    box.appendChild(head);

    if (en.means && en.means.length) {
      const ul = document.createElement("ul");
      ul.className = "m";
      en.means.slice(0, 6).forEach((m) => { const li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
      box.appendChild(ul);
    }
    resEl.appendChild(box);
  }
}

// ---- Tab Chi tiết (định nghĩa, ví dụ, đồng nghĩa tiếng Anh + IPA chuẩn) ----
function renderDetail() {
  detailEl.innerHTML = "";
  const en = lastEntry;
  if (!en || (!(en.pos && en.pos.length) && !en.reading)) {
    trangThai(detailEl, "article", "Không có chi tiết cho từ này."); return;
  }
  detailEl.className = "detail";
  if (en.reading) {
    const ipa = document.createElement("div"); ipa.className = "ipa";
    ipa.innerHTML = "IPA: <b></b>";
    ipa.querySelector("b").textContent = en.reading;
    ipa.appendChild(nutLoa(en.word, en.audio));
    detailEl.appendChild(ipa);

    // Chú giải cách đọc từng ký hiệu IPA có trong từ này
    const legend = (window.IPA_GUIDE && window.IPA_GUIDE.legendFor(en.reading)) || [];
    if (legend.length) {
      const box = document.createElement("div"); box.className = "legend";
      const lh = document.createElement("div"); lh.className = "lh";
      const t = document.createElement("span"); t.textContent = "Cách đọc các ký hiệu:"; lh.appendChild(t);
      const a = document.createElement("a"); a.href = "#"; a.textContent = "Xem đầy đủ";
      a.addEventListener("click", (e) => { e.preventDefault(); openGuide(); });
      lh.appendChild(a);
      box.appendChild(lh);
      legend.forEach((it) => {
        const row = document.createElement("div"); row.className = "legrow";
        const s = document.createElement("span"); s.className = "ls"; s.textContent = it.s; row.appendChild(s);
        const v = document.createElement("span"); v.className = "lv"; v.textContent = it.vi; row.appendChild(v);
        const e = document.createElement("span"); e.className = "le"; e.textContent = "(" + it.ex + ")"; row.appendChild(e);
        box.appendChild(row);
      });
      detailEl.appendChild(box);
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
    if (g.syn && g.syn.length) {
      const s = document.createElement("div"); s.className = "syn"; s.textContent = "≈ " + g.syn.join(", ");
      grp.appendChild(s);
    }
    detailEl.appendChild(grp);
  });
}

// ---- Chuyển tab ----
function switchTab(name) {
  if (name === "detail" && tabDetailEl.disabled) name = "word";
  tabWordEl.classList.toggle("active", name === "word");
  tabDetailEl.classList.toggle("active", name === "detail");
  tabTransEl.classList.toggle("active", name === "trans");
  resEl.style.display    = name === "word"   ? "" : "none";
  detailEl.style.display = name === "detail" ? "" : "none";
  transEl.style.display  = name === "trans"  ? "" : "none";
  if (name === "detail") renderDetail();
  if (name === "trans") doTranslate(qEl.value);
}

// ---- Dịch câu ----
let lastTranslated = "";
function doTranslate(raw) {
  const text = (raw || "").trim();
  if (!text) { trangThai(transEl, "translate", "Nhập hoặc dán đoạn cần dịch."); return; }
  const dir = dirEl.value;
  const from = dir === "auto" ? "auto" : (dir === "vien" ? "vi" : "en");
  const to = dir === "auto" ? "" : (dir === "vien" ? "en" : "vi");
  const tkey = dir + ":" + text;
  if (lastTranslated === tkey && transEl.querySelector(".tr")) return;
  trangThai(transEl, "spinner-gap", "Đang dịch…");
  chrome.runtime.sendMessage({ type: "TRANSLATE", text, from, to }, (res) => {
    if (chrome.runtime.lastError) { trangThai(transEl, "warning-circle", "Lỗi: " + chrome.runtime.lastError.message); return; }
    if (!res || !res.ok) { trangThai(transEl, "warning-circle", (res && res.error) || "Không dịch được."); return; }
    lastTranslated = tkey;
    transEl.className = "trbox";
    transEl.innerHTML = "";
    // Phần tiếng Anh để phát âm: nếu bản dịch là tiếng Anh thì đọc bản dịch, ngược lại đọc câu gốc.
    const engText = res.target === "en" ? res.text : text;
    const hd = document.createElement("div"); hd.className = "rowx between";
    hd.style.alignItems = "flex-start"; hd.style.gap = "10px";
    const tr = document.createElement("div"); tr.className = "tr grow"; tr.textContent = res.text;
    hd.appendChild(tr);
    const right = document.createElement("div"); right.style.cssText = "display:flex;gap:4px;align-items:flex-start;flex:none";
    const spk = nutLoa(engText, null);
    spk.title = "Nghe câu tiếng Anh";
    right.appendChild(spk);
    const sv = document.createElement("button"); sv.className = "btn xs save"; sv.type = "button";
    sv.innerHTML = window.Icon("plus", { size: 15 }) + '<span class="lb">Lưu</span>';
    sv.title = "Lưu bản dịch vào sổ tay — sau đó có thể sửa lại cho đúng chuyên ngành";
    sv.addEventListener("click", () => {
      const entry = { word: text, reading: "", means: [res.text], kind: "sent" };
      if (initialSrc && initialSrc.url) entry.src = { url: initialSrc.url, title: initialSrc.title, sel: text };
      chrome.runtime.sendMessage({ type: "SAVE_WORD", entry, dict: "envi" }, () => {
        sv.classList.add("saved");
        sv.innerHTML = window.Icon("check", { size: 15 }) + '<span class="lb">Đã lưu</span>';
        try { chrome.runtime.sendMessage({ type: "SYNC_SOON" }); } catch (e) {}
      });
    });
    right.appendChild(sv);
    hd.appendChild(right);
    transEl.appendChild(hd);
    const src = document.createElement("div"); src.className = "src"; src.textContent = text;
    transEl.appendChild(src);
  });
}

async function run(word) {
  const w = (word || "").trim();
  const dict = dirEl.value;
  lastTranslated = "";
  // Câu dài / có dấu câu -> dịch thẳng
  if (w.length > 40 || /[.!?;\n]/.test(w)) { switchTab("trans"); return; }
  if (!w) {
    trangThai(resEl, "magnifying-glass", "Bôi đen một từ rồi mở lại, hoặc gõ vào ô trên.");
    tabDetailEl.disabled = true;
    return;
  }
  switchTab("word");
  trangThai(resEl, "spinner-gap", "Đang tra “" + w + "”…");
  const res = await lookup(w, dict);
  res.dict = dict;
  await renderWord(res);
}

// ---- Sự kiện ----
goEl.addEventListener("click", () => run(qEl.value));
qEl.addEventListener("keydown", (e) => { if (e.key === "Enter") run(qEl.value); });
dirEl.addEventListener("change", () => run(qEl.value));
tabWordEl.addEventListener("click", () => switchTab("word"));
tabDetailEl.addEventListener("click", () => { if (!tabDetailEl.disabled) switchTab("detail"); });
tabTransEl.addEventListener("click", () => switchTab("trans"));
bookEl.addEventListener("click", () => { chrome.tabs.create({ url: chrome.runtime.getURL("notebook.html") }); });
function openGuide() { chrome.tabs.create({ url: chrome.runtime.getURL("ipa-guide.html") }); }
document.getElementById("ipaGuide").addEventListener("click", openGuide);

/** Gắn icon vào khung tĩnh của HTML. */
function gaiIcon() {
  document.getElementById("brandMark").innerHTML = window.Icon("translate", { size: 17, weight: "solid" });
  goEl.innerHTML = window.Icon("magnifying-glass", { size: 15 }) + '<span class="lb">Tra</span>';
  bookEl.innerHTML = window.Icon("notebook", { size: 16 }) + '<span class="lb">Sổ tay &amp; tiến độ</span>';
  document.getElementById("ipaGuide").innerHTML =
    window.Icon("text-aa", { size: 16 }) + '<span class="lb">Hướng dẫn IPA</span>';
  const gan = (el, ten, chu) => {
    el.innerHTML = window.Icon(ten, { size: 15 }) + '<span class="lb">' + chu + "</span>";
  };
  gan(tabWordEl, "book-open-text", "Từ vựng");
  gan(tabDetailEl, "article", "Chi tiết");
  gan(tabTransEl, "translate", "Dịch");
  qEl.parentElement.insertBefore(ic("magnifying-glass", { size: 18 }), qEl);
}

// ---- Khởi động ----
(async () => {
  gaiIcon();
  veChuoiNgay();
  const word = await getInitialWord();
  if (word) qEl.value = word;
  run(word);
  qEl.focus();
  qEl.select();
  if (IS_CTX_WINDOW) {
    window.focus();
    setTimeout(() => { window.addEventListener("blur", () => window.close()); }, 500);
  }
})();
