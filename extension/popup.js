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
/**
 * Gửi một bản lưu (hoặc bản sửa) lên service worker.
 *
 * Trước đây popup tự ghi thẳng vào chrome.storage — và vì thế xoá mất ghi chú
 * lẫn bản dịch đã hiệu đính mỗi lần tra lại cùng một từ. Nay mọi đường lưu đều
 * đi qua saveWord() ở nền, nơi có đủ luật giữ gìn những thứ bạn tự làm.
 */
function guiLuu(entry, dict, moi, coSua, goc, xong) {
  const e = Object.assign({}, entry, { means: moi.means, note: moi.note || "" });
  if (!e.src && initialSrc && initialSrc.url) {
    e.src = { url: initialSrc.url, title: initialSrc.title, sel: initialSrc.sel || entry.word };
  }
  if (coSua) { e.mEdit = 1; if (goc && goc.length) e.mOrig = goc; }
  chrome.runtime.sendMessage({ type: "SAVE_WORD", entry: e, dict: dict }, (kq) => {
    xong(chrome.runtime.lastError ? { ok: false } : (kq || { ok: true }));
  });
}

/* ==================================================================== */
/* Sửa nghĩa & ghi chú NGAY TRONG POPUP                                 */
/* ==================================================================== */
/*
 * Máy dịch sai với ngữ cảnh là chuyện gặp hằng ngày, nhất là với từ chuyên
 * ngành. Trước đây muốn chữa thì phải lưu → mở Sổ tay → tìm lại từ → sửa: bốn
 * bước cho một việc năm giây, nên rốt cuộc chẳng ai sửa. Nay sửa ngay ở đúng
 * chỗ vừa nhìn thấy nó sai — và SỬA LÀ LƯU: mục chưa có trong sổ tay thì được
 * tạo luôn kèm bản sửa, không bắt bấm Lưu trước rồi mới cho sửa.
 */

/** Ô soạn thảo tại chỗ: nghĩa (mỗi dòng một nghĩa) + ghi chú. */
function oSuaNhanh(dl, luu, huy) {
  const f = document.createElement("div");
  f.className = "edbox";
  const oVanBan = (nhan, giaTri, dong, goiY) => {
    const l = document.createElement("label"); l.className = "field-label"; l.textContent = nhan;
    f.appendChild(l);
    const t = document.createElement("textarea");
    t.rows = dong; t.value = giaTri || "";
    if (goiY) t.placeholder = goiY;
    t.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); huy(); }
    });
    f.appendChild(t);
    return t;
  };
  const oNghia = oVanBan("Nghĩa — mỗi dòng một nghĩa",
    (dl.means || []).join("\n"),
    Math.min(6, Math.max(2, (dl.means || []).length + 1)),
    "Nghĩa đúng với ngữ cảnh / chuyên ngành của bạn…");
  const oGhi = oVanBan("Ghi chú", dl.note || "", 2, "Ngữ cảnh, cách dùng, chỗ hay nhầm…");

  const row = document.createElement("div"); row.className = "edrow";
  const bLuu = document.createElement("button");
  bLuu.type = "button"; bLuu.className = "btn xs primary";
  bLuu.innerHTML = window.Icon("check", { size: 15 }) + '<span class="lb">Lưu</span>';
  const bHuy = document.createElement("button");
  bHuy.type = "button"; bHuy.className = "btn xs";
  bHuy.innerHTML = '<span class="lb">Huỷ</span>';
  bLuu.addEventListener("click", () => {
    bLuu.disabled = true;
    luu({
      means: oNghia.value.split("\n").map((s) => s.trim()).filter(Boolean),
      note: oGhi.value.trim()
    }, () => { bLuu.disabled = false; });
  });
  bHuy.addEventListener("click", huy);
  row.appendChild(bLuu); row.appendChild(bHuy);
  f.appendChild(row);
  setTimeout(() => {
    try { oNghia.focus(); oNghia.setSelectionRange(oNghia.value.length, oNghia.value.length); } catch (e) {}
  }, 0);
  return f;
}

/**
 * Một thẻ trong popup, sửa được tại chỗ.
 *
 * @param {Element} hostEl ô chứa thẻ (vẽ lại mỗi lần đổi trạng thái)
 * @param {object} ct  { dl, dau(el), veNghia(el, dl), phu(el, dl), gui(dl, coSua, xong) }
 */
function theSuaDuoc(hostEl, ct) {
  const dl = ct.dl;

  function nutHanhDong() {
    const acts = document.createElement("div"); acts.className = "acts";
    const sv = document.createElement("button");
    sv.type = "button"; sv.className = "btn xs save";
    const danhDau = () => {
      sv.classList.add("saved");
      sv.innerHTML = window.Icon("check", { size: 15 }) + '<span class="lb">Đã lưu</span>';
      sv.disabled = true;
    };
    if (dl.saved) danhDau();
    else {
      sv.innerHTML = window.Icon("plus", { size: 15 }) + '<span class="lb">Lưu</span>';
      sv.addEventListener("click", () => {
        sv.disabled = true;
        ct.gui({ means: dl.means, note: dl.note }, false, (kq) => {
          if (kq && kq.ok !== false) { dl.saved = true; danhDau(); } else sv.disabled = false;
        });
      });
    }
    acts.appendChild(sv);

    const ed = document.createElement("button");
    ed.type = "button"; ed.className = "btn xs";
    ed.title = "Sửa nghĩa & ghi chú";
    ed.innerHTML = window.Icon("pencil-simple", { size: 15 }) + '<span class="lb">Sửa</span>';
    ed.addEventListener("click", moSua);
    acts.appendChild(ed);
    return acts;
  }

  function veDau(hienNut) {
    const head = document.createElement("div");
    head.className = "hdrow";
    const left = document.createElement("div");
    left.className = "lft";
    if (ct.dau) ct.dau(left, dl);
    if (dl.mEdit) {
      const tg = document.createElement("span");
      tg.className = "tag edited";
      tg.innerHTML = window.Icon("pencil-simple", { size: 12 }) + "<span>bản của bạn</span>";
      left.appendChild(tg);
    }
    head.appendChild(left);
    if (hienNut) head.appendChild(nutHanhDong());
    hostEl.appendChild(head);
  }

  function ve() {
    hostEl.innerHTML = "";
    veDau(true);
    ct.veNghia(hostEl, dl);
    if (dl.note) {
      const n = document.createElement("div"); n.className = "notebox";
      const b = document.createElement("b"); b.textContent = "Ghi chú · ";
      n.appendChild(b);
      n.appendChild(document.createTextNode(dl.note));
      hostEl.appendChild(n);
    }
    if (ct.phu) ct.phu(hostEl, dl);
  }

  function moSua() {
    hostEl.innerHTML = "";
    veDau(false);
    hostEl.appendChild(oSuaNhanh(dl, (moi, thatBai) => {
      ct.gui(moi, true, (kq) => {
        if (!kq || kq.ok === false) { thatBai(); return; }
        dl.means = moi.means; dl.note = moi.note; dl.saved = true; dl.mEdit = 1;
        ve();
      });
    }, ve));
    if (ct.phu) ct.phu(hostEl, dl);
  }

  ve();
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
  const huong = (res && res.dict) || dirEl.value;
  for (const en of entries) {
    preloadAudio(en.audio);
    const box = document.createElement("div");
    box.className = "entry";
    resEl.appendChild(box);
    // Nghĩa máy trả về cũng sửa được; đã sửa lần trước thì hiện thẳng bản của
    // bạn chứ không hiện lại bản máy rồi bắt bạn tự nhớ là mình đã hiệu đính.
    const daCo = saved[en.word] || null;
    const goc = (en.means || []).slice(0, 8);
    theSuaDuoc(box, {
      dl: {
        means: (daCo && daCo.mEdit ? (daCo.means || []) : goc).slice(0, 6),
        note: (daCo && daCo.note) || "",
        saved: !!(daCo && daCo.saved),
        mEdit: daCo && daCo.mEdit ? 1 : 0
      },
      dau: (el) => {
        const w = document.createElement("span");
        w.className = "wja";
        w.textContent = en.word;
        el.appendChild(w);
        el.appendChild(nutLoa(en.word, en.audio));
        if (en.reading) {
          const r = document.createElement("div");
          r.className = "rdline";
          r.textContent = en.reading;
          el.appendChild(r);
        }
      },
      veNghia: (el, dl) => {
        if (!dl.means.length) return;
        const ul = document.createElement("ul");
        ul.className = "m";
        dl.means.forEach((m) => { const li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
        el.appendChild(ul);
      },
      gui: (moi, coSua, xong) => guiLuu(en, huong, moi, coSua, goc, xong)
    });
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

    const goc = [res.text];
    const daCo = res.saved || null;
    const muc = { word: text, reading: "", means: goc, kind: "sent" };
    theSuaDuoc(transEl, {
      dl: {
        means: (daCo && daCo.mEdit ? (daCo.means || goc) : goc),
        note: (daCo && daCo.note) || "",
        saved: !!(daCo && daCo.saved),
        mEdit: daCo && daCo.mEdit ? 1 : 0
      },
      // Bản dịch chính LÀ phần sửa được, nên phần đầu thẻ chỉ có nút nghe.
      dau: (el) => {
        const spk = nutLoa(engText, null);
        spk.title = "Nghe câu tiếng Anh";
        el.appendChild(spk);
      },
      veNghia: (el, dl) => {
        const tr = document.createElement("div"); tr.className = "tr grow";
        tr.textContent = dl.means.join(" / ");
        el.appendChild(tr);
      },
      phu: (el) => {
        const src = document.createElement("div"); src.className = "src"; src.textContent = text;
        el.appendChild(src);
      },
      gui: (moi, coSua, xong) => guiLuu(muc, "envi", moi, coSua, goc, xong)
    });
  });
}

/**
 * Bôi đen phát nào cũng chạy CẢ HAI: tra từ điển và dịch cả câu.
 *
 * Bản cũ tự đoán ý bằng độ dài và dấu câu, và đoán sai suốt: cụm danh từ dài
 * vẫn là thứ cần tra, câu ngắn cụt lủn vẫn là câu cần dịch. Nay chỉ còn đoán
 * mỗi việc *mở sẵn tab nào* — đoán sai chỗ đó thì chỉ mất một cú bấm.
 */
async function run(word) {
  const w = (word || "").trim();
  const dict = dirEl.value;
  lastTranslated = "";

  if (!w) {
    trangThai(resEl, "magnifying-glass", "Bôi đen một từ rồi mở lại, hoặc gõ vào ô trên.");
    tabDetailEl.disabled = true;
    switchTab("word");
    return;
  }

  // Mở sẵn tab hợp lý nhất, nhưng cả ba tab đều có dữ liệu.
  switchTab(trongNhuCau(w) ? "trans" : "word");

  // Đoạn dài thì tra nguyên đoạn như một từ chắc chắn rỗng — bỏ qua lượt gọi
  // mạng đó, nhưng nói rõ vì sao tab Từ vựng trống.
  if (w.length > 40) {
    lastEntry = null;
    tabDetailEl.disabled = true;
    trangThai(resEl, "article", "Đoạn này dài quá để tra như một từ — xem tab Dịch, hoặc gõ riêng từ cần tra.");
    return;
  }
  trangThai(resEl, "spinner-gap", "Đang tra “" + w + "”…");
  const res = await lookup(w, dict);
  res.dict = dict;
  await renderWord(res);
}

/** Chỉ dùng để chọn tab mở sẵn, không dùng để quyết định tra cái gì. */
function trongNhuCau(w) {
  return w.length > 40 || /[.!?;\n]/.test(w);
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
