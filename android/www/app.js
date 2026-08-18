/**
 * NeutronDict — bản Android (Capacitor).
 *
 * Dùng chung dữ liệu và cơ chế đồng bộ với extension máy tính; giao diện dựng
 * bằng hệ thiết kế trong ui.css, icon Phosphor trong icons.js, phần theo dõi
 * tiến độ & huy hiệu trong tien-do.js, thao tác vuốt/chạm trong cham-vuot.js.
 */
"use strict";

/* ==================================================================== */
/* Cầu nối Capacitor (có đường lui để chạy thử trên trình duyệt)         */
/* ==================================================================== */

const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const Cap = window.Capacitor || null;
const Plugins = (Cap && Cap.Plugins) || {};

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
  // Capacitor có thể để CapacitorHttp ở nhiều chỗ tuỳ cách nạp.
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
  const native = getNativeHttp();
  if (native && native.get) {
    const r = await native.get({ url, headers: headers || {} });
    if (r && typeof r.status === "number" && (r.status < 200 || r.status >= 300)) throw new Error("HTTP " + r.status);
    const d = r && r.data;
    if (typeof d === "string") { try { return JSON.parse(d); } catch (e) { throw new Error("Dữ liệu không đọc được"); } }
    return d;
  }
  const r = await fetch(url, headers ? { headers } : undefined);
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


/* ==================================================================== */
/* Tiện ích giao diện                                                   */
/* ==================================================================== */

const $ = (id) => document.getElementById(id);

function el(tag, cls, chu) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (chu != null) e.textContent = chu;
  return e;
}

/** Icon dạng phần tử DOM. */
function ic(ten, opt) {
  const s = document.createElement("span");
  s.className = "icwrap";
  s.innerHTML = window.Icon(ten, opt);
  return s.firstChild || s;
}

/** Nút chỉ có icon. */
function nutIcon(iconTen, title, cls, size) {
  const b = el("button", "iconbtn" + (cls ? " " + cls : ""));
  b.type = "button";
  b.title = title || "";
  b.appendChild(ic(iconTen, { size: size || 18 }));
  return b;
}

/** Ô trạng thái giữa một thẻ: đang tra, không có kết quả, danh sách rỗng… */
function trangThai(box, iconTen, chu, phu) {
  box.className = "empty";
  box.innerHTML = "";
  box.appendChild(ic(iconTen, { size: 38, cls: iconTen === "spinner-gap" ? "spin" : "" }));
  box.appendChild(el("div", null, chu));
  if (phu) {
    const p = el("div", "t-tiny faint", phu);
    p.style.marginTop = "6px";
    box.appendChild(p);
  }
}

let toastTimer = null;
function toast(chu, kieu) {
  const t = $("toast");
  t.className = "toast" + (kieu ? " " + kieu : "");
  t.innerHTML = window.Icon(kieu === "bad" ? "warning-circle" : "check-circle", { size: 18, weight: "solid" });
  t.appendChild(el("span", null, chu));
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
}

/* ==================================================================== */
/* Dữ liệu sổ tay (cùng cấu trúc với extension)                          */
/* ==================================================================== */

/**
 * Ngôn ngữ đang bật. Một app, hai từ điển — đổi ở đây là đổi luôn hướng tra,
 * ngăn lưu vào sổ tay, tiến độ học và cloud đang dùng. Hai bên nằm chung một
 * kho, phân biệt bằng tiền tố khoá, nên chuyển qua chuyển lại không mất gì.
 */
let NGU = "en";
const laNhat = () => NGU === "ja";

async function napNgu() {
  NGU = window.Ngu.hopLe(await Store.get("ngu"));
  return NGU;
}
async function doiNgu(ngu) {
  NGU = window.Ngu.hopLe(ngu);
  await Store.set("ngu", NGU);
}

async function getNB() { return (await Store.get("notebook")) || {}; }
/** Chỉ phần sổ tay của ngôn ngữ đang bật — dùng cho danh sách và học. */
async function getNBNgu() { return window.Ngu.locSo(await getNB(), NGU); }
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

// Nghĩa có thể bị lưu nhầm thành object (lỗi cũ) -> lấy lại phần chữ.
function meanToStr(m) {
  if (typeof m === "string") return m;
  if (m && typeof m === "object") return m.text || m.mean || m.means || m.v || "";
  return m == null ? "" : String(m);
}

/* ==================================================================== */
/* Một lượt ghi tại một thời điểm                                       */
/* ==================================================================== */

/**
 * Mọi thao tác sửa sổ tay đều là "đọc cả sổ → sửa một mục → ghi cả sổ". Chạy
 * hai lượt như thế chồng nhau — đúng cái xảy ra khi bấm "Nhớ" dồn dập — thì
 * lượt sau đọc trước khi lượt trước kịp ghi, nên nó ghi đè lại bản CŨ của mục
 * kia. Lượt chấm biến mất ngay lúc đó, và chỉ lộ ra vài giây sau khi màn hình
 * đọc lại từ đĩa: số mục đến hạn tụt xuống rồi vọt lên như cũ.
 *
 * Nên tất cả các lượt sửa xếp hàng đi qua đây, lượt sau chờ lượt trước xong.
 * Các lượt CHỈ ĐỌC không đi qua hàng đợi: chậm vài mili giây không sao, mà cho
 * chúng chen vào thì có ngày chúng làm nghẽn cả hàng.
 */
let hangDoiGhi = Promise.resolve();
function xepHang(fn) {
  // .then(fn, fn) để một lượt ghi hỏng không làm kẹt mọi lượt ghi sau nó.
  const chay = hangDoiGhi.then(fn, fn);
  hangDoiGhi = chay.then(() => {}, () => {});
  return chay;
}

/** Đọc sổ tay, đưa cho fn sửa, rồi ghi lại — trọn vẹn trong một lượt. */
function capNhat(fn) {
  return xepHang(async () => {
    const nb = await getNB();
    const kq = await fn(nb);
    await setNB(nb);
    return kq;
  });
}

/* ==================================================================== */
/* Sóng học tập (giống hệt extension)                                    */
/* ==================================================================== */

const SRS_STEPS = [1, 3, 7, 14, 30, 60, 120];
const DAY = 86400000;
/** Cấp này trở lên (chu kỳ ≥ 14 ngày) coi như đã vào trí nhớ dài hạn. */
const CAP_NHO_LAU = 3;

// Đến hạn vào ĐẦU NGÀY mục tiêu (00:00), không phải đúng N×24 giờ sau — để hôm
// sau mở app lúc nào cũng thấy mục, không bị "sáng ít, tối mới đủ".
function dueInDays(days) {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function isDue(it, now) {
  if (it.del) return false;
  if (!it.srs || !it.srs.due) return true;
  return it.srs.due <= now;
}
async function gradeWord(key, remembered) {
  await capNhat((nb) => {
    const e = nb[key]; if (!e) return;
    const now = Date.now();
    const cur = (e.srs && typeof e.srs.lv === "number") ? e.srs.lv : -1;
    let lv, due;
    if (remembered) { lv = Math.min(cur + 1, SRS_STEPS.length - 1); due = dueInDays(SRS_STEPS[lv]); }
    else { lv = -1; due = now; }
    nb[key] = Object.assign({}, e, { srs: { lv, due }, ts: now });
  });
}
function dueCountOn(list, dayOffset) {
  // Số mục đến hạn tính đến cuối ngày thứ dayOffset (0 = hôm nay).
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const t = end.getTime() + dayOffset * DAY;
  return list.filter((it) => !it.del && (!it.srs || !it.srs.due || it.srs.due <= t)).length;
}

/* ==================================================================== */
/* Theo dõi tiến độ & huy hiệu                                          */
/* ==================================================================== */

/** Số liệu lấy từ sổ tay để xét huy hiệu. */
async function soLieuSoTay() {
  const nb = await getNBNgu();
  const a = Object.values(nb).filter((it) => !it.del);
  const decks = await getDecks();
  const now = Date.now();
  let nhoLau = 0, daSua = 0, coGhiChu = 0, thich = 0, denHan = 0, trongChuKy = 0;
  for (const it of a) {
    if (it.srs && typeof it.srs.lv === "number" && it.srs.lv >= CAP_NHO_LAU) nhoLau += 1;
    if (it.mEdit) daSua += 1;
    if (it.note && it.note.trim()) coGhiChu += 1;
    if (it.fav === 1) thich += 1;
    if (isDue(it, now)) denHan += 1;
    if (it.srs && it.srs.due) trongChuKy += 1;
  }
  const dung = new Set(a.map((it) => it.deck).filter((d) => d && decks[d] && !decks[d].del));
  return { tong: a.length, nhoLau, daSua, coGhiChu, thich, denHan, trongChuKy, soCon: dung.size };
}

const theoDoi = window.TienDo.tao({
  // Tiến độ tách theo ngôn ngữ: học tiếng Anh không làm xê dịch chuỗi ngày của
  // tiếng Nhật. Bản cũ phẳng là của tiếng Anh, Ngu.tachHoc chuyển nguyên vào.
  doc: async () => window.Ngu.tachHoc(await Store.get("hoc"))[NGU],
  ghi: async (d) => {
    const cu = window.Ngu.tachHoc(await Store.get("hoc"));
    await Store.set("hoc", Object.assign({}, cu, { [NGU]: d }));
  },
  soLieu: soLieuSoTay,
  sauKhiGhi: () => syncSoon()
});

/** Hiện chúc mừng nếu vừa mở khoá huy hiệu. */
function mung(ids, xong) {
  if (!ids || !ids.length) { if (xong) xong(); return; }
  window.TienDo.anMung(ids, () => {
    veChuoiNgay();
    if ($("viewProgress").classList.contains("show")) veTienDo();
    if (xong) xong();
  });
}

async function veTienDo() {
  await window.TienDo.veBang($("progressBody"), theoDoi);
}

/** Chip chuỗi ngày trên thanh đầu — thứ nhìn thấy mỗi lần mở app. */
async function veChuoiNgay() {
  const view = await theoDoi.xem();
  const chip = $("streakChip");
  chip.innerHTML = window.Icon("fire", { size: 15, weight: view.homNay.dat ? "solid" : "line" });
  chip.appendChild(el("span", null,
    (view.chuoi.hienTai ? view.chuoi.hienTai + " ngày · " : "") + view.homNay.on + "/" + view.goal));
  chip.style.display = "";
  chip.onclick = () => show("Progress");
}

/* ==================================================================== */
/* Tra từ tiếng Anh (Free Dictionary + Google Dịch)                      */
/* ==================================================================== */

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

function normMeans(e) {
  if (Array.isArray(e.means)) return e.means.map((m) => (typeof m === "string" ? m : (m.mean || m.means || m.text || ""))).filter(Boolean);
  if (typeof e.mean === "string") return [e.mean];
  if (typeof e.short_mean === "string") return [e.short_mean];
  return [];
}

/** Tra từ tiếng Nhật qua Mazii (cùng đường với extension). */
async function fetchMazii(word) {
  for (const url of ["https://mazii.net/api/search", "https://mazii.net/api/search/"]) {
    try {
      const data = await httpPostJson(url, { dict: "javi", type: "word", query: word, limit: 20, page: 1 });
      let arr = (data && (data.results || data.data)) || [];
      if (!Array.isArray(arr)) arr = [];
      const entries = arr.map((e) => ({
        word: e.word || e.title || e.text || e.query || "",
        reading: e.phonetic || e.pronounce || e.hiragana || "",
        means: normMeans(e),
        dict: "javi"
      })).filter((x) => x.word || x.means.length);
      if (entries.length) return entries;
    } catch (e) { /* thử endpoint sau */ }
  }
  lastLookupError = "Chưa tra được (kiểm tra mạng).";
  return [];
}

async function lookup(word, dict) {
  const w = (word || "").trim();
  lastLookupError = "";
  if (!w) return [];
  // Ngăn tiếng Nhật đi đường Mazii; phần dưới là đường tiếng Anh.
  if (dict === "javi") return fetchMazii(w);
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

/* ==================================================================== */
/* Đồng bộ Drive (Apps Script — cùng payload với extension)              */
/* ==================================================================== */

// Mỗi ngôn ngữ một lượt riêng, và không cho hai lượt CÙNG ngôn ngữ chạy chồng.
const syncing = {};
function syncNow(ngu) {
  const n = window.Ngu.hopLe(ngu || NGU);
  if (syncing[n]) return syncing[n];
  syncing[n] = doSync(n).finally(() => { syncing[n] = null; });
  return syncing[n];
}

/**
 * Cấu hình cloud của một ngôn ngữ.
 *
 * Bản cũ chỉ có một cặp {url, token} phẳng — đó là cloud TIẾNG ANH, nên giữ
 * nguyên chỗ ấy cho tiếng Anh, người đang dùng không phải khai lại. Tiếng Nhật
 * dùng ngăn mới, khai một lần.
 */
async function layCfg(ngu) {
  const cfg = (await Store.get("syncCfg")) || {};
  if (cfg.ja !== undefined || cfg.en !== undefined) return cfg[window.Ngu.hopLe(ngu)] || {};
  return window.Ngu.hopLe(ngu) === "en" ? cfg : {};
}
async function datCfg(ngu, moi) {
  const cfg = (await Store.get("syncCfg")) || {};
  const cu = (cfg.ja !== undefined || cfg.en !== undefined) ? cfg : { en: cfg, ja: {} };
  await Store.set("syncCfg", Object.assign({}, cu, { [window.Ngu.hopLe(ngu)]: moi }));
}

/**
 * Đồng bộ MỘT ngôn ngữ với cloud của chính nó.
 *
 * Hai điều sống còn: chỉ GỬI LÊN phần thuộc ngôn ngữ này (mọi khoá lọt lưới sẽ
 * biến mất khỏi bản ghi trên Drive), và khi GHI XUỐNG MÁY thì giữ nguyên phần
 * của ngôn ngữ kia — mergeByTs là phép HỢP nên phần kia đi qua nguyên vẹn.
 */
async function doSync(rawNgu) {
  const ngu = window.Ngu.hopLe(rawNgu || NGU);
  const cfg = await layCfg(ngu);
  if (!cfg.url) throw new Error("Chưa cấu hình URL đồng bộ cho tiếng " + window.Ngu.ten(ngu));
  const load = await httpPostJson(cfg.url, { token: cfg.token || "", action: "load" }, "text/plain;charset=utf-8");
  if (!load || load.ok === false) throw new Error((load && load.error) || "Lỗi máy chủ");
  const data = load.data || {};
  let remoteNb, remoteDecks, remoteHoc;
  if (data && typeof data === "object" && data.notebook !== undefined) {
    remoteNb = data.notebook || {}; remoteDecks = data.decks || {}; remoteHoc = data.hoc || null;
  } else {
    remoteNb = data || {}; remoteDecks = {}; remoteHoc = null;
  }
  // Cloud cũ có thể lẫn khoá của ngôn ngữ khác; vẫn nhận về máy, nhưng khi gửi
  // lên thì lọc lại cho sạch.
  const remoteCuaToi = window.Ngu.locSo(remoteNb, ngu);
  const mergedNb = mergeByTs(window.Ngu.locSo(await getNB(), ngu), remoteCuaToi);
  const mergedDecks = mergeByTs(await getDecks(), remoteDecks);
  // Tiến độ học trộn theo luật riêng — xem TienDo.tron().
  const hocTach = window.Ngu.tachHoc(await Store.get("hoc"));
  const mergedHoc = window.TienDo.tron(hocTach[ngu], remoteHoc);

  const save = await httpPostJson(cfg.url, {
    token: cfg.token || "", action: "save",
    data: { notebook: mergedNb, decks: mergedDecks, hoc: mergedHoc }
  }, "text/plain;charset=utf-8");
  if (!save || save.ok === false) throw new Error((save && save.error) || "Lỗi khi lưu");

  // Đọc lại NGAY TRƯỚC KHI GHI để không xoá mất thay đổi vừa làm trong lúc chờ
  // mạng — và làm trọn vẹn trong MỘT lượt của hàng đợi, nếu không thì một lượt
  // chấm bài rơi đúng khe giữa lúc đọc và lúc ghi sẽ bị bản cũ đè mất.
  let finalNb;
  await capNhat((nb) => {
    // mergeByTs là phép HỢP: phần của ngôn ngữ kia trong nb đi qua nguyên vẹn.
    finalNb = mergeByTs(nb, mergeByTs(remoteNb, mergedNb));
    for (const k in nb) delete nb[k];
    Object.assign(nb, finalNb);
  });
  const finalDecks = mergeByTs(await getDecks(), mergedDecks);
  const freshHoc = window.Ngu.tachHoc(await Store.get("hoc"));
  const finalHocNgu = window.TienDo.tron(freshHoc[ngu], mergedHoc);
  const finalHoc = Object.assign({}, freshHoc, { [ngu]: finalHocNgu });
  await setDecks(finalDecks); await Store.set("hoc", finalHoc);
  theoDoi.dat(finalHocNgu);
  if (JSON.stringify(window.Ngu.locSo(finalNb, ngu)) !== JSON.stringify(mergedNb) ||
      JSON.stringify(finalHocNgu) !== JSON.stringify(mergedHoc)) syncSoon();

  let n = 0; for (const k in window.Ngu.locSo(finalNb, ngu)) if (!finalNb[k].del) n++;
  return n;
}

let syncTimer = null;
function syncSoon() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncNow().then(refreshNotifications).catch(() => {}); }, 2500);
}

/* ==================================================================== */
/* Thông báo nhắc học                                                   */
/* ==================================================================== */

async function refreshNotifications() {
  const LN = Plugins.LocalNotifications;
  if (!LN) return;
  const cfg = (await Store.get("notifCfg")) || {};
  if (!cfg.on) return;
  try {
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") { const r = await LN.requestPermissions(); if (r.display !== "granted") return; }
    await LN.cancel({ notifications: [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id })) });
    const nb = await getNB();
    const list = Object.values(nb);
    const view = await theoDoi.xem();
    const [hh, mm] = (cfg.time || "20:00").split(":").map(Number);
    const notis = [];
    for (let d = 0; d < 7; d++) {
      const at = new Date(); at.setDate(at.getDate() + d); at.setHours(hh, mm, 0, 0);
      if (at.getTime() <= Date.now()) continue;
      const n = dueCountOn(list, d);
      if (n <= 0) continue;
      // Nhắc kèm chuỗi ngày: "mất chuỗi 12 ngày" là lý do đứng dậy học mạnh hơn
      // nhiều so với "có 8 từ đến hạn".
      const chuoi = d === 0 && view.chuoi.hienTai > 0 && !view.homNay.dat
        ? " Chuỗi " + view.chuoi.hienTai + " ngày đang chờ bạn."
        : "";
      notis.push({
        id: d + 1,
        title: "Đến giờ ôn từ vựng",
        body: "Hôm nay có " + n + " mục đến hạn." + chuoi,
        schedule: { at }
      });
    }
    if (notis.length) await LN.schedule({ notifications: notis });
  } catch (e) { /* bỏ qua */ }
}

/* ==================================================================== */
/* Chuyển màn + thao tác vuốt chạm                                      */
/* ==================================================================== */

const MAN = ["Lookup", "Notebook", "Study", "Progress"];
let manHienTai = "Lookup";
/** Chồng màn đã đi qua, để nút Quay lại của Android lùi từng bước. */
const lichSu = ["Lookup"];

function show(view, huong) {
  const tu = MAN.indexOf(manHienTai);
  const den = MAN.indexOf(view);
  const chieu = huong != null ? huong : (den > tu ? 1 : -1);

  MAN.forEach((v) => {
    const sec = $("view" + v);
    sec.classList.toggle("show", v === view);
    sec.classList.remove("slide-l", "slide-r");
    $("nav" + v).classList.toggle("active", v === view);
  });
  if (view !== manHienTai) {
    // Nội dung trôi vào từ đúng phía mình vừa vuốt — không có cái này thì đổi
    // tab bị "nháy" một cái, không ra cảm giác đang lật trang.
    $("view" + view).classList.add(chieu > 0 ? "slide-l" : "slide-r");
    // Quay lại một màn đã ở trong chồng thì cắt bớt thay vì chất thêm, để đi
    // tới đi lui vài lần không sinh ra một chồng dài vô tận.
    const cu = lichSu.indexOf(view);
    if (cu >= 0) lichSu.length = cu + 1; else lichSu.push(view);
  }
  manHienTai = view;
  $("scroller").scrollTop = 0;
  veNav();

  if (view === "Notebook") { drawNotebook(); pullAndRefresh(); }
  if (view === "Study") { updateDueButton(); pullAndRefresh(); }
  if (view === "Progress") { veTienDo(); pullAndRefresh(); }
}

MAN.forEach((v) => { $("nav" + v).addEventListener("click", () => show(v)); });

/** Vẽ lại icon thanh tab: tab đang mở dùng icon đặc. */
function veNav() {
  const bo = { Lookup: "magnifying-glass", Notebook: "notebook", Study: "graduation-cap", Progress: "chart-line-up" };
  MAN.forEach((v) => {
    const b = $("nav" + v);
    const on = b.classList.contains("active");
    b.querySelector(".i").innerHTML = window.Icon(bo[v], { size: 22, weight: on ? "solid" : "line" });
  });
}

/* --- vuốt ngang đổi tab --- */
window.ChamVuot.vuotDoiTab(
  () => MAN.indexOf(manHienTai),
  () => MAN.length,
  (toi) => show(MAN[toi], toi > MAN.indexOf(manHienTai) ? 1 : -1)
);

/* --- nút Quay lại của Android --- */
window.ChamVuot.nutQuayLai(() => {
  // Có gì đang mở đè lên thì đóng cái đó trước, đúng như người ta mong đợi.
  const phu = document.querySelector(".celebrate.show, .sheet.show");
  if (phu) { phu.classList.remove("show"); return true; }
  if (session.queue.length && $("stBody").style.display !== "none") { ketThucSom(); return true; }
  if (lichSu.length > 1) {
    lichSu.pop();
    show(lichSu[lichSu.length - 1], -1);
    return true;
  }
  return false;   // đang ở màn gốc rồi thì mới thật sự thoát
});

/* ==================================================================== */
/* Màn Tra từ                                                           */
/* ==================================================================== */

let lastEntries = [];
let currentSrc = null;   // nguồn của lượt tra hiện tại, để lưu kèm khi bấm Lưu

function switchSub(name) {
  if (name === "detail" && $("tabDetail").disabled) name = "word";
  ["word", "detail", "trans"].forEach((n) => {
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
  currentSrc = (src && src.url) ? src : null;   // tra tay/dán -> không nguồn; chia sẻ -> có nguồn
  const w = (word || "").trim();
  if (!w) return;
  $("q").value = w;
  // Mở sẵn tab hợp lý nhất, nhưng cả ba tab đều có dữ liệu — xem ghi chú ở
  // trongNhuCau() về việc thôi đoán ý người dùng.
  switchSub(trongNhuCau(w) ? "trans" : "word");

  // Đoạn dài thì tra nguyên đoạn như một từ chắc chắn rỗng — bỏ lượt gọi mạng
  // đó đi, nhưng nói rõ vì sao tab Từ vựng trống.
  if (w.length > 40) {
    lastEntries = [];
    $("tabDetail").disabled = true;
    trangThai($("result"), "article",
      "Đoạn này dài quá để tra như một từ.", "Xem tab Dịch, hoặc gõ riêng từ cần tra.");
    return;
  }
  trangThai($("result"), "spinner-gap", "Đang tra “" + w + "”…");
  const entries = await lookup(w, $("dir").value);
  lastEntries = entries;
  $("tabDetail").disabled = !(entries[0] && ((entries[0].pos && entries[0].pos.length) || entries[0].reading));
  await renderWord(entries);
}
/**
 * Chỉ dùng để chọn tab mở sẵn, không dùng để quyết định tra cái gì.
 *
 * Bản cũ dùng chính phép thử này để chọn CHỈ tra từ hay CHỈ dịch, và đoán sai
 * suốt. Nay cả ba tab đều có dữ liệu, đoán sai thì chỉ mất một cú chạm.
 */
function trongNhuCau(w) {
  return w.length > 40 || /[.!?;\n]/.test(w);
}

$("go").addEventListener("click", () => runLookup($("q").value));
$("q").addEventListener("keydown", (e) => { if (e.key === "Enter") runLookup($("q").value); });
$("dir").addEventListener("change", () => runLookup($("q").value));
$("paste").addEventListener("click", async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (t && t.trim()) runLookup(t.trim());
  } catch (e) { toast("Không đọc được bộ nhớ tạm. Hãy dán tay vào ô tra.", "bad"); }
});

/** Nút Lưu dùng chung cho tab Từ vựng và tab Dịch. */
function nutLuu(daLuu, khiLuu) {
  const b = el("button", "btn xs");
  b.type = "button";
  const danhDau = () => {
    b.className = "btn xs";
    b.style.color = "var(--good)";
    b.style.borderColor = "var(--good-soft)";
    b.style.background = "var(--good-soft)";
    b.innerHTML = window.Icon("check", { size: 15 }) + '<span class="lb">Đã lưu</span>';
    b.onclick = null;
  };
  if (daLuu) danhDau();
  else {
    b.className = "btn xs tinted";
    b.innerHTML = window.Icon("plus", { size: 15 }) + '<span class="lb">Lưu</span>';
    b.addEventListener("click", async () => { await khiLuu(); danhDau(); });
  }
  return b;
}

/**
 * Nút "Sửa" đứng cạnh nút Lưu ở mọi thẻ kết quả tra.
 *
 * Máy dịch sai với ngữ cảnh là chuyện gặp hằng ngày, nhất là với từ chuyên
 * ngành. Trước đây muốn chữa thì phải lưu → sang Sổ tay → tìm lại mục → sửa;
 * bốn bước cho một việc năm giây, nên rốt cuộc chẳng ai sửa. Nay bấm một cái
 * là mở thẳng bảng sửa quen thuộc, ngay tại chỗ vừa thấy nó sai.
 *
 * SỬA LÀ LƯU: mục chưa có trong sổ tay thì được tạo trước rồi mới mở bảng sửa
 * — bảng sửa chỉ làm việc với mục đã tồn tại.
 *
 * @param {string} key      khoá của mục trong sổ tay
 * @param {Function} taoMuc hàm lưu mục (dùng chung với nút Lưu)
 * @param {Function} veLai  vẽ lại thẻ sau khi sửa xong
 */
function nutSuaNhanh(key, taoMuc, veLai) {
  const b = el("button", "btn xs");
  b.type = "button";
  b.innerHTML = window.Icon("pencil-simple", { size: 15 }) + '<span class="lb">Sửa</span>';
  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      let nb = await getNB();
      if (!nb[key] || nb[key].del) { await taoMuc(); nb = await getNB(); }
      const it = nb[key];
      if (!it) return;
      moSua(Object.assign({ key: key }, it), "trans", veLai);
    } finally { b.disabled = false; }
  });
  return b;
}

/** Hàng nút Lưu + Sửa ở góc phải mỗi thẻ. */
function hangHanhDong(daLuu, luu, key, veLai) {
  const acts = el("div");
  acts.style.cssText = "display:flex;gap:6px;flex:none;align-items:flex-start";
  acts.appendChild(nutLuu(daLuu, luu));
  acts.appendChild(nutSuaNhanh(key, luu, veLai));
  return acts;
}

/** Nhãn nhỏ "bản của bạn" cho mục đã hiệu đính. */
function nhanDaSua() {
  const t = el("span", "tag edited");
  t.style.marginLeft = "6px";
  t.innerHTML = window.Icon("pencil-simple", { size: 12 }) + "<span>bản của bạn</span>";
  return t;
}

async function renderWord(entries) {
  const box = $("result");
  const nb = await getNB();
  const srcSnap = (currentSrc && currentSrc.url) ? currentSrc : null;   // giữ nguồn của lượt tra này

  if (!entries.length) {
    trangThai(box, "warning-circle", "Không lấy được nghĩa.",
      (lastLookupError ? "Chi tiết: " + lastLookupError + ". " : "")
      + (getNativeHttp() ? "" : "(Đang chạy chế độ trình duyệt — bản APK gọi mạng kiểu native.)"));
    return;
  }

  box.className = "entrylist";
  box.innerHTML = "";
  for (const en of entries) {
    const div = el("div", "item");
    const head = el("div", "rowx between");
    head.style.alignItems = "flex-start";

    // Lưu theo hướng THẬT của mục (lookup có thể tự đổi khi chọn "Tự động"),
    // chứ không theo giá trị đang chọn trong ô — nếu không, cùng một từ lưu hai
    // lần ở hai hướng sẽ thành hai mục riêng.
    const huong = en.dict || ($("dir").value === "auto" ? "envi" : $("dir").value);
    const key = huong + ":" + en.word;
    const daCo = window.Muc.banCuaBan(nb[key]);
    // Đã sửa lần trước thì hiện thẳng bản của bạn, không hiện lại bản máy rồi
    // bắt bạn tự nhớ là mình đã hiệu đính.
    const nghia = ((daCo && daCo.mEdit) ? (daCo.means || []) : (en.means || []))
      .slice(0, 6).map(meanToStr);

    const left = el("div");
    const w = el("span", "w", en.word);
    left.appendChild(w);
    preloadAudio(en.audio);
    const spk = nutIcon("speaker-high", "Phát âm", "", 19);
    spk.addEventListener("click", () => speak(en.word, en.audio));
    left.appendChild(spk);
    if (en.reading) {
      const r = el("span", "r", en.reading);
      r.style.marginLeft = "4px";
      left.appendChild(r);
    }
    if (daCo && daCo.mEdit) left.appendChild(nhanDaSua());
    head.appendChild(left);

    const luuTu = async () => {
      const laMoi = await capNhat((nb) => {
        const old2 = nb[key];
        const ne2 = { word: en.word, reading: en.reading || "", means: en.means || [], dict: huong, ts: Date.now() };
        if (en.audio) ne2.audio = en.audio;
        if (en.pos && en.pos.length) ne2.pos = en.pos;
        if (srcSnap) ne2.src = srcSnap;
        // Lưu lại một mục đã có -> GIỮ phân loại, tiến độ học, ghi chú và bản dịch
        // bạn đã sửa. Nếu không thì mỗi lần tra lại là mất sạch công hiệu đính.
        if (old2 && !old2.del) {
          if (old2.deck) ne2.deck = old2.deck;
          if (old2.srs) ne2.srs = old2.srs;
          if (old2.kind) ne2.kind = old2.kind;
          if (old2.fav) ne2.fav = old2.fav;
          if (old2.note) ne2.note = old2.note;
          if (old2.src && !ne2.src) ne2.src = old2.src;
          if (old2.audio && !ne2.audio) ne2.audio = old2.audio;
          if (old2.mEdit) { ne2.mEdit = 1; ne2.means = old2.means; ne2.mOrig = old2.mOrig; }
        }
        // Lưu lại một mục đã xoá: nhặt lại đúng phần bạn tự viết. Xem muc.js.
        window.Muc.nhatLaiBanSua(ne2, old2);
        nb[key] = ne2;
        return !old2 || old2.del;
      });
      if (laMoi) mung(await theoDoi.ghiLuu(1));
      syncSoon(); refreshNotifications();
    };
    head.appendChild(hangHanhDong(!!(daCo && daCo.saved), luuTu, key, () => renderWord(entries)));

    div.appendChild(head);
    if (nghia.length) {
      const ul = document.createElement("ul");
      nghia.forEach((m) => ul.appendChild(el("li", null, m)));
      div.appendChild(ul);
    }
    if (daCo && daCo.note) div.appendChild(khoiGhiChu(daCo.note));
    box.appendChild(div);
  }
}

/**
 * Tab Chi tiết: định nghĩa, ví dụ, từ đồng nghĩa tiếng Anh, kèm chú giải cách
 * đọc từng ký hiệu IPA có trong từ đang tra.
 */
function renderDetail() {
  const box = $("detail");
  const en = lastEntries[0];
  if (!en || (!(en.pos && en.pos.length) && !en.reading)) {
    trangThai(box, "article", "Không có chi tiết cho từ này.");
    return;
  }
  box.className = "detail";
  box.innerHTML = "";

  if (en.reading) {
    const ipa = el("div", "ipa");
    ipa.appendChild(el("span", null, "IPA:"));
    const b = el("b", null, en.reading);
    ipa.appendChild(b);
    const spk = nutIcon("speaker-high", "Phát âm", "", 19);
    spk.addEventListener("click", () => speak(en.word, en.audio));
    ipa.appendChild(spk);
    box.appendChild(ipa);

    // Chú giải cách đọc từng ký hiệu IPA có trong từ này — thứ khiến bảng IPA
    // hữu ích ngay tại chỗ, thay vì bắt người ta mở bảng đầy đủ rồi tự dò.
    const legend = (window.IPA_GUIDE && window.IPA_GUIDE.legendFor(en.reading)) || [];
    if (legend.length) {
      const lg = el("div", "legend");
      const lh = el("div", "lh");
      lh.appendChild(el("span", null, "Cách đọc các ký hiệu"));
      box.appendChild(lg);
      lg.appendChild(lh);
      legend.forEach((it) => {
        const row = el("div", "legrow");
        row.appendChild(el("span", "ls", it.s));
        row.appendChild(el("span", "lv", it.vi));
        row.appendChild(el("span", "le", "(" + it.ex + ")"));
        lg.appendChild(row);
      });
    }
  }

  (en.pos || []).forEach((g) => {
    const grp = el("div", "pgroup");
    if (g.p) grp.appendChild(el("span", "pos", g.p));
    if (g.defs && g.defs.length) {
      const ol = document.createElement("ol");
      g.defs.forEach((d) => {
        const li = el("li", null, d.def);
        if (d.ex) li.appendChild(el("div", "ex", "“" + d.ex + "”"));
        ol.appendChild(li);
      });
      grp.appendChild(ol);
    }
    if (g.syn && g.syn.length) grp.appendChild(el("div", "syn", "≈ " + g.syn.join(", ")));
    box.appendChild(grp);
  });
}

/* ==================================================================== */
/* Dịch câu                                                             */
/* ==================================================================== */

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
    const cfg = await layCfg(NGU);
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
  if (!text) { trangThai(box, "translate", "Nhập hoặc dán đoạn cần dịch."); return; }
  const srcSnap = (currentSrc && currentSrc.url) ? { url: currentSrc.url, title: currentSrc.title, sel: text } : null;
  trangThai(box, "spinner-gap", "Đang dịch…");
  try {
    const res = await translateText(text, $("dir").value);
    const out = res.text;
    const engText = res.target === "en" ? out : text;   // phần tiếng Anh để đọc
    box.className = "trbox";
    box.innerHTML = "";

    const key = "envi:" + text;
    const nb0 = await getNB();
    const daCo = window.Muc.banCuaBan(nb0[key]);
    const banDich = ((daCo && daCo.mEdit) ? (daCo.means || []) : [out]).map(meanToStr);

    const hd = el("div", "rowx between");
    hd.style.alignItems = "flex-start";
    const traiTr = el("div", "grow");
    traiTr.appendChild(el("div", "tr", banDich.join(" / ")));
    if (daCo && daCo.mEdit) traiTr.appendChild(nhanDaSua());
    hd.appendChild(traiTr);

    const phai = el("div", "rowx");
    phai.style.gap = "2px";
    const spk = nutIcon("speaker-high", "Nghe câu tiếng Anh", "", 19);
    spk.addEventListener("click", () => speak(engText));
    phai.appendChild(spk);

    const luuCau = async () => {
      const laMoi = await capNhat((nb) => {
        const oldS = nb[key];
        const neS = { word: text, reading: "", means: [out], dict: "envi", kind: "sent", ts: Date.now() };
        if (srcSnap) neS.src = srcSnap;
        if (oldS && !oldS.del) {
          if (oldS.deck) neS.deck = oldS.deck;
          if (oldS.srs) neS.srs = oldS.srs;
          if (oldS.fav) neS.fav = oldS.fav;
          if (oldS.note) neS.note = oldS.note;
          if (oldS.src && !neS.src) neS.src = oldS.src;
          if (oldS.mEdit) { neS.mEdit = 1; neS.means = oldS.means; neS.mOrig = oldS.mOrig; }
        }
        // Lưu lại một mục đã xoá: nhặt lại đúng phần bạn tự viết. Xem muc.js.
        window.Muc.nhatLaiBanSua(neS, oldS);
        nb[key] = neS;
        return !oldS || oldS.del;
      });
      if (laMoi) mung(await theoDoi.ghiLuu(1));
      syncSoon(); refreshNotifications();
      toast("Đã lưu — bấm Sửa nếu bản dịch chưa đúng chuyên ngành");
    };
    phai.appendChild(hangHanhDong(!!(daCo && daCo.saved), luuCau, key, () => showTranslate(text)));
    hd.appendChild(phai);
    box.appendChild(hd);
    if (daCo && daCo.note) box.appendChild(khoiGhiChu(daCo.note));
    box.appendChild(el("div", "src", text));
  } catch (e) {
    trangThai(box, "warning-circle", (e && e.message) || "Không dịch được.");
  }
}

/* ==================================================================== */
/* Sửa bản dịch / ghi chú                                               */
/* ==================================================================== */

/**
 * Vì sao cần sửa bản dịch
 * -----------------------
 * Nghĩa trong sổ đến từ máy dịch, mà máy dịch không biết bạn đang đọc tài liệu
 * ngành nào. 開閉器 ra "công tắc" thì không sai với người thường, nhưng người
 * làm điện phải gọi là "thiết bị đóng cắt". Bản dịch sai chuyên ngành mà cứ ôn
 * đi ôn lại thì càng ôn càng nhớ sai.
 *
 * Bản gốc của máy được cất vào `mOrig` chứ không xoá, để lúc nào muốn so lại
 * hoặc thấy mình sửa hỏng thì còn đường quay về.
 */
let dangSua = null;

/**
 * @param {object} it   mục sổ tay (kèm .key)
 * @param {string} tab  "trans" (sửa nghĩa) hay "note" (ghi chú)
 * @param {Function} [veLai] gọi lại sau khi lưu — dùng khi mở từ thẻ kết quả
 *        tra, để thẻ đó hiện ngay bản vừa sửa thay vì phải tra lại.
 */
function moSua(it, tab, veLai) {
  dangSua = { key: it.key, veLai: veLai || null };
  const laGhiChu = tab === "note";
  $("edTitle").textContent = laGhiChu ? "Ghi chú cho mục này" : "Sửa bản dịch";
  $("edIcon").innerHTML = window.Icon(laGhiChu ? "note-pencil" : "translate", { size: 20 });
  $("edSub").textContent = laGhiChu
    ? "Ghi lại ngữ cảnh, thuật ngữ tương đương, cách dùng — thứ mà từ điển không nói."
    : "Chỉnh lại cho đúng cách nói của chuyên ngành bạn. Mỗi dòng là một nghĩa.";
  $("edOrig").textContent = it.word || "";
  $("edTrans").value = (it.means || []).join("\n");
  $("edNote").value = it.note || "";
  const goc = it.mOrig && it.mOrig.length ? it.mOrig.join("; ") : "";
  $("edOrigHint").textContent = goc ? "Bản máy dịch ban đầu: " + goc : "";
  $("edRestore").style.display = goc ? "" : "none";
  $("editSheet").classList.add("show");
  setTimeout(() => $(laGhiChu ? "edNote" : "edTrans").focus(), 60);
}

function dongSua() { $("editSheet").classList.remove("show"); dangSua = null; }

async function luuSua() {
  if (!dangSua) return;
  const key = dangSua.key;
  const dong = $("edTrans").value.split("\n").map((x) => x.trim()).filter(Boolean);
  const ghiChu = $("edNote").value.trim();

  const kq = await capNhat((nb) => {
    const e = nb[key];
    if (!e || e.del) return null;
    const cu = (e.means || []).map(meanToStr);
    const doi = dong.join("\n") !== cu.join("\n");
    const ne = Object.assign({}, e, { ts: Date.now() });
    if (doi) {
      // Cất bản gốc lại đúng MỘT lần: lần sửa thứ hai không được đè bản gốc bằng
      // chính bản sửa lần trước, nếu không nút khôi phục thành vô nghĩa.
      if (!ne.mOrig) ne.mOrig = cu;
      ne.means = dong;
      ne.mEdit = 1;
    }
    if (ghiChu) ne.note = ghiChu; else delete ne.note;
    nb[key] = ne;
    return { doi, ne };
  });
  const veLai = dangSua.veLai;
  if (!kq) { dongSua(); return; }
  const doiNghia = kq.doi;
  dongSua();
  drawNotebook();
  if (veLai) { try { veLai(); } catch (e) { /* thẻ đã biến mất thì thôi */ } }
  if (session.queue.length && session.queue[0] && session.queue[0].key === key) {
    Object.assign(session.queue[0], kq.ne);
    showCard(true);
  }
  syncSoon();
  mung(await theoDoi.xetHuyHieu());
  toast(doiNghia ? "Đã lưu bản dịch của bạn" : "Đã lưu ghi chú");
}

$("edSave").addEventListener("click", luuSua);
$("edCancel").addEventListener("click", dongSua);
$("edRestore").addEventListener("click", async () => {
  if (!dangSua) return;
  const nb = await getNB();
  const e = nb[dangSua.key];
  if (e && e.mOrig) $("edTrans").value = e.mOrig.join("\n");
});
$("editSheet").addEventListener("click", (e) => { if (e.target.id === "editSheet") dongSua(); });

/* ==================================================================== */
/* Màn Sổ tay                                                           */
/* ==================================================================== */

const ALL = "__all__", NONE = "__none__";
const LIKE = "__like__", DISLIKE = "__dislike__";
let curDeck = ALL;

function dirLabel(d) { return d === "vien" ? "Việt→Anh" : "Anh→Việt"; }
function deckName(decks, id) { const d = decks[id]; return d && !d.del ? d.name : null; }

async function setFav(key, val) {
  const next = await capNhat((nb) => {
    const e = nb[key];
    if (!e || e.del) return 0;
    const moi = (e.fav === val) ? 0 : val;
    const ne = Object.assign({}, e, { ts: Date.now() });
    if (moi) ne.fav = moi; else delete ne.fav;
    nb[key] = ne;
    return moi;
  });
  syncSoon();
  return next;
}

function favButtons(it, sauDo) {
  const wrap = el("span", "rowx");
  wrap.style.gap = "0";
  const mk = (val, iconTen, cls, ten) => {
    const on = it.fav === val;
    const b = el("button", "iconbtn " + cls + (on ? " on" : ""));
    b.type = "button";
    b.title = on ? "Bỏ khỏi " + ten : ten;
    // Đang bật thì dùng icon đặc, tắt thì icon nét — nhìn là biết ngay trạng
    // thái mà không cần đọc màu.
    b.innerHTML = window.Icon(iconTen, { size: 18, weight: on ? "solid" : "line" });
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      it.fav = await setFav(it.key, val);
      if (sauDo) sauDo(); else drawNotebook();
    });
    return b;
  };
  wrap.appendChild(mk(1, "heart", "like", "Thích"));
  wrap.appendChild(mk(-1, "thumbs-down", "dislike", "Không thích"));
  return wrap;
}

/** Khối ghi chú riêng, hiện dưới phần nghĩa. */
function khoiGhiChu(chu) {
  const box = el("div", "mynote");
  const h = el("div", "nh");
  h.appendChild(ic("note-pencil", { size: 13 }));
  h.appendChild(el("span", null, "Ghi chú của bạn"));
  box.appendChild(h);
  box.appendChild(el("div", null, chu));
  return box;
}

// Mở lại trang nguồn trong trình duyệt hệ thống; đính kèm Text Fragment
// (#:~:text=…) để Chrome tự cuộn tới và tô sáng đúng vị trí đã lưu.
function buildTextFragment(src) {
  const s = (src.sel || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const enc = encodeURIComponent;
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
function openSourceExt(it) {
  if (!it.src || !it.src.url) return;
  const base = it.src.url;
  const frag = buildTextFragment(it.src) || encodeURIComponent((it.word || "").slice(0, 60));
  const url = base.indexOf("#") >= 0 ? base + ":~:text=" + frag : base + "#:~:text=" + frag;
  try { window.open(url, "_system"); }
  catch (e) { try { window.open(url, "_blank"); } catch (e2) { location.href = url; } }
}

// Thêm/sửa/xoá link nguồn bằng tay (dán URL từ thanh địa chỉ trình duyệt).
// Dùng khi trình duyệt lúc chia sẻ không kèm link.
async function addLink(it) {
  const cur = (it.src && it.src.url) || "";
  let url = (prompt('Dán đường link trang nguồn cho “' + it.word + '”\n(để trống rồi OK = xoá link):', cur) || "").trim();
  if (url === cur) return;
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;   // tự thêm https:// nếu thiếu
  await capNhat((nb) => {
    const e = nb[it.key]; if (!e || e.del) return;
    const ne = Object.assign({}, e, { ts: Date.now() });
    if (!url) {
      delete ne.src;
    } else {
      let title = "";
      try { title = new URL(url).hostname.replace(/^www\./, ""); } catch (e2) {}
      ne.src = { url: url, title: title, sel: (e.src && e.src.sel) || it.word };
    }
    nb[it.key] = ne;
  });
  drawNotebook();
  syncSoon();
}

async function drawNotebook() {
  // Khôi phục các mục cũ bị lưu nghĩa dạng object ("[object Object]") -> chuỗi.
  // Đi qua hàng đợi vì đây cũng là một lượt ghi, và drawNotebook() hay chạy
  // ngay sau một lượt chấm bài.
  let daSuaCu = false;
  await capNhat((soTay) => {
    for (const k in soTay) {
      const e = soTay[k];
      if (e && Array.isArray(e.means)) {
        const nm = e.means.map(meanToStr);
        if (nm.some((v, i) => v !== e.means[i])) { e.means = nm; daSuaCu = true; }
      }
    }
  });
  if (daSuaCu) syncSoon();
  // Chỉ phần của ngôn ngữ đang bật; dữ liệu bên kia vẫn nằm nguyên trong kho.
  const nb = await getNBNgu(), decks = await getDecks();

  const items = Object.entries(nb).map(([key, v]) => ({ key, ...v })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const activeItems = items.filter((it) => !it.del);
  if (curDeck !== ALL && curDeck !== NONE && curDeck !== LIKE && curDeck !== DISLIKE && !deckName(decks, curDeck)) curDeck = ALL;

  /* --- hàng chip sổ con --- */
  const bar = $("deckBar");
  bar.innerHTML = "";
  const activeDecks = Object.values(decks).filter((d) => !d.del).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const countIn = (id) => id === ALL ? activeItems.length
    : id === NONE ? activeItems.filter((i) => !i.deck).length
    : id === LIKE ? activeItems.filter((i) => i.fav === 1).length
    : id === DISLIKE ? activeItems.filter((i) => i.fav === -1).length
    : activeItems.filter((i) => i.deck === id).length;
  const mk = (id, label, iconTen) => {
    const b = el("button", "chip" + (curDeck === id ? " active" : ""));
    b.type = "button";
    b.appendChild(ic(iconTen, { size: 15, weight: curDeck === id ? "solid" : "line" }));
    b.appendChild(el("span", null, label));
    b.appendChild(el("span", "n", String(countIn(id))));
    b.addEventListener("click", () => { curDeck = id; drawNotebook(); });
    bar.appendChild(b);
  };
  mk(ALL, "Tất cả", "list-bullets");
  mk(NONE, "Chưa phân loại", "funnel");
  mk(LIKE, "Thích", "heart");
  mk(DISLIKE, "Không thích", "thumbs-down");
  activeDecks.forEach((d) => mk(d.id, d.name, "folder-simple"));

  const add = el("button", "chip add");
  add.type = "button";
  add.appendChild(ic("folder-plus", { size: 15 }));
  add.appendChild(el("span", null, "Sổ mới"));
  add.addEventListener("click", async () => {
    const name = (prompt("Tên sổ con mới:") || "").trim();
    if (!name) return;
    const d = await getDecks();
    const id = "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    d[id] = { id, name, ts: Date.now() };
    await setDecks(d); curDeck = id; drawNotebook(); syncSoon();
  });
  bar.appendChild(add);
  $("deckActions").style.display =
    (curDeck !== ALL && curDeck !== NONE && curDeck !== LIKE && curDeck !== DISLIKE) ? "" : "none";

  /* --- danh sách --- */
  const kw = $("filter").value.trim().toLowerCase();
  let rows = activeItems;
  if (curDeck === NONE) rows = rows.filter((i) => !i.deck);
  else if (curDeck === LIKE) rows = rows.filter((i) => i.fav === 1);
  else if (curDeck === DISLIKE) rows = rows.filter((i) => i.fav === -1);
  else if (curDeck !== ALL) rows = rows.filter((i) => i.deck === curDeck);
  if (kw) {
    rows = rows.filter((it) =>
      (it.word + " " + (it.reading || "") + " " + (it.means || []).join(" ") + " " + (it.note || ""))
        .toLowerCase().includes(kw));
  }
  $("nbCount").textContent = "Đang hiện " + rows.length + " mục"
    + (rows.length !== activeItems.length ? " trong " + activeItems.length : "");

  const list = $("nbList");
  list.innerHTML = "";
  if (!rows.length) {
    const d = el("div", "empty");
    d.appendChild(ic("notebook", { size: 38 }));
    d.appendChild(el("div", null, activeItems.length
      ? "Không có mục nào ở đây."
      : "Chưa có mục nào. Sang tab Tra từ và bấm Lưu."));
    list.appendChild(d);
    return;
  }

  const now = Date.now();
  for (const it of rows) {
    const row = el("div", "entry" + (it.kind === "sent" ? " sent" : ""));
    const body = el("div", "body");

    const head = el("div", "head");
    head.appendChild(el("span", "w", it.word));
    if (it.reading) head.appendChild(el("span", "r", it.reading));
    const spk = nutIcon("speaker-high", "Phát âm", "", 18);
    spk.addEventListener("click", () => speak(it.word, it.audio));
    head.appendChild(spk);
    head.appendChild(favButtons(it));
    head.appendChild(el("span", "tag", dirLabel(it.dict)));
    if (it.mEdit) {
      const t = el("span", "tag edited");
      t.appendChild(ic("pencil-simple", { size: 12 }));
      t.appendChild(el("span", null, "đã sửa"));
      head.appendChild(t);
    }
    if (isDue(it, now)) {
      const t = el("span", "tag due");
      t.appendChild(ic("alarm", { size: 12 }));
      t.appendChild(el("span", null, "đến hạn"));
      head.appendChild(t);
    }
    body.appendChild(head);

    if (it.means && it.means.length) body.appendChild(el("div", "m", it.means.slice(0, 4).join("; ")));
    if (it.note && it.note.trim()) body.appendChild(khoiGhiChu(it.note.trim()));

    if (it.src && it.src.url) {
      const meta = el("div", "meta");
      const s = el("span", "srcline");
      let hostn = it.src.url;
      try { hostn = new URL(it.src.url).hostname.replace(/^www\./, ""); } catch (e) {}
      s.appendChild(ic("link-simple", { size: 13 }));
      s.appendChild(el("span", null, hostn));
      meta.appendChild(s);
      body.appendChild(meta);
    }

    /* --- hàng nút điều khiển --- */
    const ctl = el("div", "ctl");

    const sel = document.createElement("select");
    sel.style.cssText = "font-size:12.5px;padding:8px 9px;border-radius:var(--r-xs)";
    const o0 = document.createElement("option");
    o0.value = NONE; o0.textContent = "Chưa phân loại";
    sel.appendChild(o0);
    activeDecks.forEach((d) => {
      const o = document.createElement("option");
      o.value = d.id; o.textContent = d.name;
      sel.appendChild(o);
    });
    sel.value = it.deck && deckName(decks, it.deck) ? it.deck : NONE;
    sel.addEventListener("change", async () => {
      await capNhat((nb) => {
        const e = nb[it.key]; if (!e) return;
        const ne = Object.assign({}, e, { ts: Date.now() });
        if (sel.value === NONE) delete ne.deck; else ne.deck = sel.value;
        nb[it.key] = ne;
      });
      drawNotebook(); syncSoon();
    });
    ctl.appendChild(sel);

    const sua = nutIcon("translate", "Sửa bản dịch cho đúng chuyên ngành", "", 18);
    sua.addEventListener("click", () => moSua(it, "trans"));
    ctl.appendChild(sua);

    const gc = nutIcon("note-pencil", it.note ? "Sửa ghi chú" : "Thêm ghi chú", it.note ? "on" : "", 18);
    gc.addEventListener("click", () => moSua(it, "note"));
    ctl.appendChild(gc);

    const lk = nutIcon("link-simple", it.src && it.src.url ? "Mở lại trang nguồn" : "Thêm link nguồn",
      it.src && it.src.url ? "on" : "", 18);
    lk.addEventListener("click", () => { if (it.src && it.src.url) openSourceExt(it); else addLink(it); });
    // Giữ lâu trên nút link để sửa/xoá link — đỡ phải thêm một nút nữa vào hàng
    // vốn đã chật trên màn hình điện thoại.
    let giu = null;
    lk.addEventListener("touchstart", () => { giu = setTimeout(() => addLink(it), 550); }, { passive: true });
    ["touchend", "touchcancel", "touchmove"].forEach((ev) =>
      lk.addEventListener(ev, () => clearTimeout(giu), { passive: true }));
    ctl.appendChild(lk);

    const del = nutIcon("trash", "Xoá khỏi sổ tay", "danger", 18);
    del.addEventListener("click", async () => {
      if (!confirm("Xoá “" + it.word.slice(0, 40) + "”?")) return;
      await capNhat((nb) => {
        nb[it.key] = window.Muc.biaMo(it);
      });
      drawNotebook(); syncSoon(); refreshNotifications();
      toast("Đã xoá khỏi sổ tay");
    });
    ctl.appendChild(del);

    body.appendChild(ctl);
    row.appendChild(body);
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
  if (!confirm('Xoá sổ "' + nm + '"? Mục trong sổ sẽ về "Chưa phân loại".')) return;
  const cu = curDeck;
  await capNhat((nb) => {
    const now = Date.now();
    for (const k in nb) if (nb[k].deck === cu) { const e = Object.assign({}, nb[k], { ts: now }); delete e.deck; nb[k] = e; }
    decks[cu] = { id: cu, name: nm, del: true, ts: now };
  });
  await setDecks(decks); curDeck = ALL; drawNotebook(); syncSoon();
});

/* --- cấu hình đồng bộ --- */
$("saveCfg").addEventListener("click", async () => {
  await datCfg(NGU, { url: $("syncUrl").value.trim(), token: $("syncToken").value.trim() });
  $("syncStatus").textContent = "Đã lưu cấu hình.";
});
$("syncNow").addEventListener("click", async () => {
  $("syncStatus").textContent = "Đang đồng bộ…";
  try {
    const n = await syncNow();
    $("syncStatus").textContent = "Đã đồng bộ · " + n + " mục · " + new Date().toLocaleTimeString("vi-VN");
    drawNotebook(); veChuoiNgay(); refreshNotifications();
  } catch (e) {
    $("syncStatus").textContent = "Lỗi: " + ((e && e.message) || e);
  }
});

/* --- nhắc học --- */
$("notifOn").addEventListener("click", async () => {
  await Store.set("notifCfg", { on: true, time: $("notifTime").value || "20:00" });
  await refreshNotifications();
  $("notifStatus").textContent = "Đã bật nhắc lúc " + ($("notifTime").value || "20:00") + " hằng ngày.";
});
$("notifOff").addEventListener("click", async () => {
  await Store.set("notifCfg", { on: false });
  if (Plugins.LocalNotifications) {
    try { await Plugins.LocalNotifications.cancel({ notifications: [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id })) }); } catch (e) {}
  }
  $("notifStatus").textContent = "Đã tắt nhắc nhở.";
});

/* --- bảng hướng dẫn đọc IPA --- */

/**
 * Dựng bảng IPA một lần rồi thôi (dataset.filled): bảng có gần trăm dòng, mở
 * đóng liên tục mà dựng lại mỗi lần thì thấy khựng ngay trên máy yếu.
 */
function fillIpaGuide() {
  const box = $("ipaGuideBody");
  if (!box || box.dataset.filled) return;
  const G = window.IPA_GUIDE;
  if (!G) return;
  const sec = (title, list) => {
    const h = el("div", "eyebrow", title);
    h.style.marginTop = "10px";
    box.appendChild(h);
    list.forEach((it) => {
      const row = el("div", "legrow");
      row.style.cssText = "padding:7px 0;border-bottom:1px solid var(--line-soft)";
      row.appendChild(el("span", "ls", it.s));
      const info = el("div", "grow");
      info.appendChild(el("div", null, it.vi));
      info.appendChild(el("div", "le t-tiny", it.ex + " " + it.ipa));
      row.appendChild(info);
      const spk = nutIcon("speaker-high", "Nghe ví dụ", "", 18);
      spk.addEventListener("click", () => speak(it.ex));
      row.appendChild(spk);
      box.appendChild(row);
    });
  };
  sec("Nguyên âm", G.VOWELS);
  sec("Nguyên âm đôi", G.DIPH);
  sec("Phụ âm", G.CONS);
  sec("Dấu nhấn & độ dài", G.MARKS);
  box.dataset.filled = "1";
}
$("ipaBox").addEventListener("toggle", () => { if ($("ipaBox").open) fillIpaGuide(); });

$("creditBtn").addEventListener("click", () => $("aboutSheet").classList.add("show"));
$("abClose").addEventListener("click", () => $("aboutSheet").classList.remove("show"));
$("aboutSheet").addEventListener("click", (e) => {
  if (e.target.id === "aboutSheet") e.target.classList.remove("show");
});

/* ==================================================================== */
/* Màn Học                                                              */
/* ==================================================================== */

let session = { queue: [], done: 0, again: 0, deleted: 0 };
let lastDeleted = null;

async function currentDue() {
  const nb = await getNBNgu();
  const now = Date.now();
  return Object.entries(nb).map(([key, v]) => ({ key, ...v })).filter((it) => isDue(it, now));
}

async function updateDueButton() {
  const due = await currentDue();
  $("dueCount").textContent = String(due.length);
  if (session.queue.length) return;   // đang học dở thì đừng đụng vào phần thân
  const view = await theoDoi.xem();
  $("stIdleIcon").innerHTML = window.Icon(due.length ? "graduation-cap" : "seal-check",
    { size: 52, weight: "duo" });
  $("stIdleTitle").textContent = due.length ? "Có " + due.length + " mục đến hạn" : "Không còn mục nào đến hạn";
  $("stIdleSub").textContent = view.homNay.dat
    ? "Hôm nay đã đạt mục tiêu " + view.goal + " lượt. Chuỗi " + Math.max(1, view.chuoi.hienTai) + " ngày."
    : "Ôn thêm " + view.homNay.conLai + " lượt nữa là đạt mục tiêu hôm nay.";
  $("stStart").disabled = due.length === 0;
}

$("stStart").addEventListener("click", async () => {
  const due = await currentDue();
  if (!due.length) { toast("Không có mục nào đến hạn. Quay lại sau nhé!", "bad"); return; }
  session = { queue: due.sort(() => Math.random() - 0.5), done: 0, again: 0, deleted: 0 };
  lastDeleted = null;
  $("stUndo").style.display = "none";
  $("stIdle").style.display = "none";
  $("stBody").style.display = "";
  $("stStart").style.display = "none";
  showCard();
});

function renderStudyFav(it) {
  const box = $("stFav");
  box.innerHTML = "";
  const mk = (val, iconTen, chu) => {
    const on = it.fav === val;
    const b = el("button", "btn sm" + (on ? " tinted" : ""));
    b.type = "button";
    b.innerHTML = window.Icon(iconTen, { size: 17, weight: on ? "solid" : "line" });
    b.appendChild(el("span", "lb", chu));
    b.addEventListener("click", async () => {
      it.fav = await setFav(it.key, val);
      renderStudyFav(it);
    });
    return b;
  };
  box.appendChild(mk(1, "heart", "Thích"));
  box.appendChild(mk(-1, "thumbs-down", "Không thích"));
}

/** @param {boolean} giuLat  true = vẽ lại thẻ nhưng giữ nguyên trạng thái đã lật */
function showCard(giuLat) {
  const it = session.queue[0];
  if (!it) { finishStudy(); return; }
  const daLat = giuLat && $("stGrade").style.display !== "none";

  $("stProg").textContent = "Còn " + session.queue.length + " mục · đã xong " + session.done;
  $("stCard").className = "studycard" + (it.kind === "sent" ? " sent" : "");
  $("stWord").textContent = it.word;
  renderStudyFav(it);

  const src = $("stSrc");
  if (it.src && it.src.url) { src.style.display = ""; src.onclick = () => openSourceExt(it); }
  else { src.style.display = "none"; src.onclick = null; }

  $("stRead").textContent = "";
  $("stMean").innerHTML = "";
  $("stMyNote").innerHTML = "";
  $("stReveal").style.display = "";
  $("stGrade").style.display = "none";
  if (daLat) revealCard();
}

function revealCard() {
  const it = session.queue[0];
  if (!it) return;
  $("stRead").textContent = it.reading || "";
  if (it.means && it.means.length) {
    const ul = document.createElement("ul");
    it.means.slice(0, 5).forEach((m) => ul.appendChild(el("li", null, m)));
    $("stMean").innerHTML = "";
    $("stMean").appendChild(ul);
  }
  // Ghi chú riêng chỉ hiện SAU khi lật thẻ — nó thường chứa luôn đáp án.
  $("stMyNote").innerHTML = "";
  if (it.note && it.note.trim()) $("stMyNote").appendChild(khoiGhiChu(it.note.trim()));
  $("stReveal").style.display = "none";
  $("stGrade").style.display = "";
}

$("stReveal").addEventListener("click", revealCard);
$("stSpk").addEventListener("click", () => { const it = session.queue[0]; if (it) speak(it.word, it.audio); });
$("stEdit").addEventListener("click", () => { const it = session.queue[0]; if (it) moSua(it, "trans"); });
$("stNote").addEventListener("click", () => { const it = session.queue[0]; if (it) moSua(it, "note"); });

async function grade(remembered) {
  const it = session.queue.shift();
  if (!it) return;
  await gradeWord(it.key, remembered);
  if (remembered) session.done++;
  else { session.again++; session.queue.push(Object.assign({}, it)); }   // quên -> học lại cuối hàng

  // Mọi lượt chấm đều được ghi vào tiến độ, kể cả lượt "quên": công sức bỏ ra là
  // như nhau, mà đếm cả lượt quên mới khuyến khích người ta dám chấm thật.
  const moi = await theoDoi.ghiLuotOn(remembered);
  veChuoiNgay();
  syncSoon();
  // Chờ xem hết chúc mừng rồi mới sang thẻ tiếp — nếu không thì popup che mất
  // thẻ mới và người dùng bấm nhầm.
  mung(moi, showCard);
}
$("gKnow").addEventListener("click", () => grade(true));
$("gForgot").addEventListener("click", () => grade(false));

async function deleteCurrentCard() {
  const it = session.queue[0];
  if (!it) return;
  await capNhat((nb) => {
    const original = nb[it.key];
    lastDeleted = original ? { key: it.key, entry: Object.assign({}, original) } : null;
    nb[it.key] = window.Muc.biaMo(it);
  });
  // Bỏ hết bản sao của mục này khỏi hàng đợi (khi "Quên" nó bị xếp lại cuối hàng).
  session.queue = session.queue.filter((x) => x.key !== it.key);
  session.deleted += 1;
  $("stUndoWord").textContent = it.word;
  $("stUndo").style.display = "";
  syncSoon(); refreshNotifications();
  showCard();
}
$("stDel").addEventListener("click", deleteCurrentCard);
$("stUndoBtn").addEventListener("click", async () => {
  if (!lastDeleted) return;
  const cu = lastDeleted;
  await capNhat((nb) => {
    nb[cu.key] = Object.assign({}, cu.entry, { ts: Date.now() });
  });
  lastDeleted = null;
  $("stUndo").style.display = "none";
  updateDueButton(); syncSoon(); refreshNotifications();
});

/** Dừng buổi học giữa chừng (nút Quay lại của máy). */
function ketThucSom() {
  session = { queue: [], done: 0, again: 0, deleted: 0 };
  $("stBody").style.display = "none";
  $("stIdle").style.display = "";
  $("stStart").style.display = "";
  $("stProg").textContent = "";
  updateDueButton();
}

async function finishStudy() {
  $("stBody").style.display = "none";
  $("stIdle").style.display = "";
  $("stStart").style.display = "";
  $("stProg").textContent = "";

  const view = await theoDoi.xem();
  $("stIdleIcon").innerHTML = window.Icon("confetti", { size: 52, weight: "duo" });
  $("stIdleTitle").textContent = "Xong buổi học!";
  const phan = ["Đã thuộc " + session.done + " mục"];
  if (session.again) phan.push("học lại " + session.again + " lượt");
  if (session.deleted) phan.push("đã xoá " + session.deleted + " mục");
  phan.push(view.homNay.dat
    ? "Hôm nay đạt mục tiêu — chuỗi " + Math.max(1, view.chuoi.hienTai) + " ngày."
    : "Còn " + view.homNay.conLai + " lượt nữa là đạt mục tiêu hôm nay.");
  $("stIdleSub").textContent = phan.join(" · ");

  session = { queue: [], done: 0, again: 0, deleted: 0 };
  const due = await currentDue();
  $("dueCount").textContent = String(due.length);
  $("stStart").disabled = due.length === 0;
  veChuoiNgay(); syncSoon(); refreshNotifications();
}

/* ==================================================================== */
/* Kéo dữ liệu mới từ Drive rồi làm tươi màn đang xem                    */
/* ==================================================================== */

let pulling = false;
async function pullAndRefresh() {
  if (pulling) return;
  const cfg = await layCfg(NGU);
  if (!cfg.url) return;
  pulling = true;
  try {
    await syncNow();
    if (manHienTai === "Notebook") drawNotebook();
    if (manHienTai === "Study") updateDueButton();
    if (manHienTai === "Progress") veTienDo();
    veChuoiNgay();
    refreshNotifications();
  } catch (e) { /* mất mạng -> bỏ qua */ } finally { pulling = false; }
}

// Kéo xuống ở đầu màn để làm mới — cử chỉ ai dùng Android cũng thử trước tiên.
window.ChamVuot.keoDeLamMoi($("scroller"), async () => {
  const cfg = await layCfg(NGU);
  if (!cfg.url) { toast("Chưa cấu hình đồng bộ Google Drive", "bad"); return; }
  await pullAndRefresh();
  toast("Đã làm mới");
});

/* ==================================================================== */
/* Nhận chữ từ menu bôi đen của Android                                 */
/* ==================================================================== */

async function checkProcessText() {
  try {
    const data = await Store.get("processText");
    if (!data || !data.word) return;
    await Store.remove("processText");
    if (Date.now() - (data.ts || 0) > 30000) return;   // quá cũ -> bỏ
    show("Lookup");
    runLookup(data.word);
  } catch (e) { /* bỏ qua */ }
}
window.addEventListener("neutrondict-process-text", checkProcessText);

/* ==================================================================== */
/* Nhận nội dung Chia sẻ (ACTION_SEND) — kèm link nếu app nguồn gửi      */
/* ==================================================================== */

// Lấy đoạn tô sáng từ Text Fragment (#:~:text=…) khi app nguồn chỉ chia sẻ link.
function textFragmentOf(url) {
  const i = (url || "").indexOf("#:~:text=");
  if (i < 0) return "";
  let frag = url.slice(i + 9).split("&")[0];
  const parts = frag.split(",");
  const core = parts.filter((p) => p && !p.endsWith("-") && !p.startsWith("-"));
  const pick = core[0] || parts[0] || "";
  try { return decodeURIComponent(pick).trim(); } catch (e) { return pick; }
}

// Tách chuỗi chia sẻ thành { url, sel, title }. Chrome có thể gửi "đoạn chọn +
// link", chỉ link (kèm #:~:text=), hoặc chỉ chữ (không link).
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
    if (Date.now() - (data.ts || 0) > 60000) return;   // quá cũ -> bỏ
    const p = parseShare(data.text, data.subject);
    if (!p.sel) return;                                 // không rút được từ/câu -> bỏ qua
    const src = p.url ? { url: p.url, title: p.title || "", sel: p.sel } : null;
    show("Lookup");
    runLookup(p.sel, src);
    if (!src) setTimeout(() => toast("Trình duyệt không gửi kèm link. Giữ lâu nút link trong Sổ tay để dán tay.", "bad"), 400);
  } catch (e) { /* bỏ qua */ }
}
window.addEventListener("neutrondict-share", checkShare);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) { checkProcessText(); checkShare(); pullAndRefresh(); }
});

/* ==================================================================== */
/* Gắn icon vào khung tĩnh của HTML                                     */
/* ==================================================================== */

function gaiIcon() {
  $("brandMark").innerHTML = window.Icon("translate", { size: 18, weight: "solid" });
  $("icSync").innerHTML = window.Icon("cloud-arrow-up", { size: 18 });
  $("icBell").innerHTML = window.Icon("bell-ringing", { size: 18 });
  $("icIpa").innerHTML = window.Icon("text-aa", { size: 18 });
  ["cr1", "cr2", "cr3"].forEach((id) => { $(id).innerHTML = window.Icon("caret-right", { size: 16 }); });
  $("q").parentElement.insertBefore(ic("magnifying-glass", { size: 18 }), $("q"));
  $("filter").parentElement.insertBefore(ic("magnifying-glass", { size: 18 }), $("filter"));
  $("stSpk").innerHTML = window.Icon("speaker-high", { size: 22 });

  const gan = (id, ten, chu, size) => {
    $(id).innerHTML = window.Icon(ten, { size: size || 16 }) + '<span class="lb">' + chu + "</span>";
  };
  gan("go", "magnifying-glass", "Tra");
  gan("paste", "clipboard-text", "Dán &amp; tra");
  gan("tabWord", "book-open-text", "Từ vựng");
  gan("tabDetail", "article", "Chi tiết");
  gan("tabTrans", "translate", "Dịch");
  gan("stSrc", "link-simple", "Mở nguồn", 15);
  gan("stEdit", "translate", "Sửa bản dịch", 15);
  gan("stNote", "note-pencil", "Ghi chú", 15);
  gan("stReveal", "eye", "Hiện nghĩa", 19);
  gan("gForgot", "arrow-counter-clockwise", "Quên", 18);
  gan("gKnow", "check", "Nhớ", 18);
  gan("stDel", "trash", "Đã thuộc hẳn — xoá mục này", 17);
  gan("renameDeck", "pencil-simple", "Đổi tên sổ", 15);
  gan("deleteDeck", "trash", "Xoá sổ", 15);
  gan("saveCfg", "floppy-disk", "Lưu cấu hình", 15);
  gan("syncNow", "arrows-clockwise", "Đồng bộ ngay", 15);
  gan("notifOn", "bell-ringing", "Bật nhắc nhở", 15);
  gan("notifOff", "bell-slash", "Tắt", 15);

  const st = $("stStart");
  const den = st.querySelector(".tag");
  st.innerHTML = window.Icon("graduation-cap", { size: 20 }) + '<span class="lb">Bắt đầu học</span>';
  st.appendChild(den);

  // Lá cờ trong hộp "Về tác giả" — vẽ tay, không phải emoji.
  $("abFlag").innerHTML =
    '<svg width="30" height="20" viewBox="0 0 30 20" style="border-radius:3px;box-shadow:var(--sh-1)">' +
    '<rect width="30" height="20" fill="#da251d"/>' +
    '<polygon points="15,3.5 16.5,7.94 21.18,8 17.43,10.79 18.82,15.26 15,12.55 11.18,15.26 12.57,10.79 8.82,8 13.5,7.94" fill="#ffff00"/></svg>';

  veNav();
}

/* ==================================================================== */
/* Khởi động                                                            */
/* ==================================================================== */

/** Các hướng tra có nghĩa với từng ngôn ngữ. */
const HUONG_NGU = {
  en: [["auto", "Tự động"], ["envi", "Anh→Việt"], ["vien", "Việt→Anh"]],
  ja: [["javi", "Nhật→Việt"]]
};

function veNgu() {
  const b = $("nguBtn");
  b.textContent = laNhat() ? "日→V" : "EN→V";
  b.title = "Đang tra " + (laNhat() ? "Nhật–Việt" : "Anh–Việt") + " — chạm để đổi";
  const sel = $("dir"), cu = sel.value;
  sel.innerHTML = "";
  HUONG_NGU[NGU].forEach(([v, t]) => {
    const o = document.createElement("option");
    o.value = v; o.textContent = t;
    sel.appendChild(o);
  });
  if ([...sel.options].some((o) => o.value === cu)) sel.value = cu;
  sel.style.display = HUONG_NGU[NGU].length > 1 ? "" : "none";
}

$("nguBtn").addEventListener("click", async () => {
  await doiNgu(laNhat() ? "en" : "ja");
  veNgu();
  // Đổi ngôn ngữ là đổi cả sổ tay, tiến độ lẫn cloud — nạp lại hết.
  await theoDoi.nap(true);
  const cfg = await layCfg(NGU);
  $("syncUrl").value = cfg.url || "";
  $("syncToken").value = cfg.token || "";
  await drawNotebook();
  await veChuoiNgay();
  updateDueButton();
  toast("Đã chuyển sang " + (laNhat() ? "Nhật–Việt" : "Anh–Việt"));
});

(async () => {
  gaiIcon();
  await napNgu();
  veNgu();
  await theoDoi.nap();
  await veChuoiNgay();

  const cfg = await layCfg(NGU);
  if (cfg.url) {
    $("syncUrl").value = cfg.url;
    $("syncToken").value = cfg.token || "";
    syncNow(NGU).then((n) => {
      $("syncStatus").textContent = "Đã đồng bộ · " + n + " mục";
      drawNotebook(); veChuoiNgay(); refreshNotifications();
    }).catch(() => {});
  }
  const ncfg = (await Store.get("notifCfg")) || {};
  if (ncfg.time) $("notifTime").value = ncfg.time;

  updateDueButton();
  refreshNotifications();
  checkProcessText();
  checkShare();

  // Xét lại huy hiệu lúc mở app: có mốc chỉ phụ thuộc số mục trong sổ (lưu từ
  // máy tính, hoặc lưu qua menu Chia sẻ) nên không đi qua đường chấm bài.
  mung(await theoDoi.xetHuyHieu());
})();
